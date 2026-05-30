import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ email: email.toLowerCase() });

    // We don't want to reveal if an email exists or not to prevent user enumeration
    // but we will only generate token and send email if user exists.
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = Date.now() + 3600000; // 1 hour

      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetTokenExpiry;
      await user.save();

      // Configure nodemailer
      let transporter;
      
      // If no SMTP credentials provided, create ethereal test account for development
      if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      } else {
        // Fallback to test account for local dev
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        console.log('No SMTP config found. Using Ethereal test account.');
      }

      const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: process.env.SMTP_FROM || '"HandyNote" <noreply@handynote.com>',
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <h1>You requested a password reset</h1>
          <p>Please click on the following link, or paste this into your browser to complete the process:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
          <p>This link is valid for 1 hour.</p>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      
      // In development, if using Ethereal, log the URL to preview the email
      if (info.messageId && !process.env.SMTP_HOST) {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }

      return NextResponse.json({ message: 'Reset link has been sent successfully.' });
    } else {
      console.log(`Debug: User with email ${email} not found in DB.`);
      return NextResponse.json({ error: 'No account found with that email address.' }, { status: 404 });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: `SMTP Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}` },
      { status: 500 }
    );
  }
}
