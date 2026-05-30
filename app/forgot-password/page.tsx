'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { FileText, Loader2, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <FileText className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white">HandyNote</h1>
          <p className="text-slate-400 mt-1 text-sm">Reset your password</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Forgot password?</h2>
          
          <p className="text-slate-300 text-sm mb-6">
            Enter the email address associated with your account and we'll send you a link to reset your password.
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}
          
          {success ? (
            <div className="text-center">
              <div className="mb-4 px-4 py-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 text-sm flex items-start text-left">
                <CheckCircle2 className="mt-0.5 mr-2 shrink-0" size={16} />
                <p>If an account exists for {email}, you will receive a password reset link shortly. Please check your inbox and spam folder.</p>
              </div>
              <Link href="/login" className="inline-block mt-4 w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition border border-white/10">
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 mt-4"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'Sending link…' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {!success && (
            <p className="mt-6 text-center text-sm text-slate-400">
              Remember your password?{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
