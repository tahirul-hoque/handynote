import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // ── 1. Database ─────────────────────────────────────────────────────────
    await dbConnect();
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`[ForgotPassword] No user found for: ${email}`);
      // Return 200 to avoid user enumeration — don't tell the caller if the email exists
      return NextResponse.json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    // ── 2. Generate reset token ──────────────────────────────────────────────
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();
    console.log(`[ForgotPassword] Token saved for user: ${email}`);

    // ── 3. Build reset URL ───────────────────────────────────────────────────
    const baseUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    // ── 4. SMTP config ───────────────────────────────────────────────────────
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    // Strip surrounding quotes that can appear in .env.local values
    const smtpFrom = (process.env.SMTP_FROM || 'HandyNote <noreply@handynote.com>').replace(/^["']|["']$/g, '');

    console.log('[ForgotPassword] SMTP_HOST:', smtpHost);
    console.log('[ForgotPassword] SMTP_PORT:', smtpPort);
    console.log('[ForgotPassword] SMTP_USER:', smtpUser);
    console.log('[ForgotPassword] SMTP_PASS set:', !!smtpPass);
    console.log('[ForgotPassword] SMTP_FROM:', smtpFrom);

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error('[ForgotPassword] Missing SMTP environment variables!');
      return NextResponse.json(
        { error: 'Email service is not configured. Please contact the administrator.' },
        { status: 500 }
      );
    }

    // ── 5. Create transporter ────────────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true only for port 465
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        // Do not fail on self-signed certs (helps with some SMTP relays)
        rejectUnauthorized: false,
      },
    });

    // ── 6. Verify SMTP connection ────────────────────────────────────────────
    try {
      await transporter.verify();
      console.log('[ForgotPassword] SMTP connection verified ✓');
    } catch (verifyErr) {
      console.error('[ForgotPassword] SMTP verify FAILED:', verifyErr);
      return NextResponse.json(
        { error: `Cannot connect to email server: ${verifyErr instanceof Error ? verifyErr.message : String(verifyErr)}` },
        { status: 500 }
      );
    }

    // ── 7. Send email ────────────────────────────────────────────────────────
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: user.email,
      subject: 'HandyNote — Password Reset Request',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
          <h2 style="color:#1e3a5f">Password Reset Request</h2>
          <p>Hi <strong>${user.name || 'there'}</strong>,</p>
          <p>We received a request to reset your HandyNote password. Click the button below to set a new password:</p>
          <p style="text-align:center;margin:32px 0">
            <a href="${resetUrl}"
               style="background:#2563eb;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
              Reset My Password
            </a>
          </p>
          <p style="color:#555;font-size:13px">Or copy and paste this link into your browser:</p>
          <p style="word-break:break-all;font-size:13px;color:#2563eb">${resetUrl}</p>
          <hr style="margin:32px 0;border:none;border-top:1px solid #eee"/>
          <p style="color:#888;font-size:12px">This link will expire in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your password will not be changed.</p>
        </div>
      `,
    });

    console.log('[ForgotPassword] Email sent! Message ID:', info.messageId);
    return NextResponse.json({ message: 'If that email is registered, a reset link has been sent.' });

  } catch (error) {
    console.error('[ForgotPassword] Unhandled error:', error);
    return NextResponse.json(
      { error: `Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
