'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

type Step = 'email' | 'code';

export default function SignIn() {
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const requestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setNotice('');
        try {
            const res = await fetch('/api/auth/otp/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase() }),
            });
            const data = await res.json().catch(() => ({}));
            // The endpoint always responds generically (no user enumeration).
            setStep('code');
            setNotice(data?.message || 'If your email is registered, a login code has been sent.');
        } catch {
            setError('Could not send a code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const verifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await signIn('email-code', {
                email: email.trim().toLowerCase(),
                code: code.trim(),
                redirect: false,
            });
            if (res?.ok) {
                // Session cookie is set; reload so the app picks up the session.
                window.location.reload();
                return;
            }
            setError('Invalid or expired code. Please try again.');
        } catch {
            setError('Something went wrong verifying the code.');
        } finally {
            setLoading(false);
        }
    };

    const resetToEmail = () => {
        setStep('email');
        setCode('');
        setError('');
        setNotice('');
    };

    return (
        <div className="w-full max-w-md mx-auto relative z-10">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-8">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>

                    <div className="text-center">
                        <h2 className="text-xl font-bold text-white mb-2">Sign in to continue</h2>
                        <p className="text-sm text-slate-400">
                            Only approved family members can access this tracker.
                        </p>
                    </div>

                    {/* Google */}
                    <button
                        onClick={() => signIn('google')}
                        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-xl px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-white/10 active:translate-y-0 cursor-pointer"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Sign in with Google
                    </button>

                    {/* Divider */}
                    <div className="w-full flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-xs text-slate-500 uppercase tracking-wide">or</span>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    {/* Email code */}
                    {step === 'email' ? (
                        <form onSubmit={requestCode} className="w-full space-y-3">
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                autoComplete="email"
                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full rounded-xl font-semibold text-white px-4 py-3.5 transition-all ${loading ? 'bg-slate-700 cursor-not-allowed opacity-70' : 'bg-linear-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 hover:-translate-y-0.5 cursor-pointer'}`}
                            >
                                {loading ? 'Sending…' : 'Email me a login code'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={verifyCode} className="w-full space-y-3">
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="\d{6}"
                                maxLength={6}
                                required
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="6-digit code"
                                autoComplete="one-time-code"
                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 text-center tracking-[0.4em] text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={loading || code.length !== 6}
                                className={`w-full rounded-xl font-semibold text-white px-4 py-3.5 transition-all ${loading || code.length !== 6 ? 'bg-slate-700 cursor-not-allowed opacity-70' : 'bg-linear-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 hover:-translate-y-0.5 cursor-pointer'}`}
                            >
                                {loading ? 'Verifying…' : 'Verify & sign in'}
                            </button>
                            <button
                                type="button"
                                onClick={resetToEmail}
                                className="w-full text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                                Use a different email
                            </button>
                        </form>
                    )}

                    {notice && !error && (
                        <p className="text-xs text-emerald-400 text-center">{notice}</p>
                    )}
                    {error && (
                        <p className="text-xs text-rose-400 text-center">{error}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
