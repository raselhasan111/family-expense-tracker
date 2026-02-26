'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

interface ExpenseFormProps {
    onExpenseAdded?: () => void;
}

export default function ExpenseForm({ onExpenseAdded }: ExpenseFormProps) {
    const { data: session } = useSession();
    const [reason, setReason] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMSG, setErrorMSG] = useState('');
    const [imgError, setImgError] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        setErrorMSG('');

        try {
            const date = new Date().toLocaleDateString('en-US');

            const payload = {
                userName: session?.user?.name || 'Unknown',
                userEmail: session?.user?.email || 'Unknown',
                reason,
                amount: Number(amount),
                date
            };

            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit expense');
            }

            setSuccess(true);
            setReason('');
            onExpenseAdded?.();
            setAmount('');

            setTimeout(() => setSuccess(false), 5000);
        } catch (error: any) {
            setErrorMSG(error.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto relative z-10">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8 transition-all hover:shadow-primary/20 hover:border-white/30">

                {/* Signed-in user info bar */}
                <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3 min-w-0">
                        {session?.user?.image && !imgError ? (
                            <img
                                src={session.user.image}
                                alt={session.user.name || 'User'}
                                className="w-9 h-9 rounded-full ring-2 ring-emerald-400/40 shrink-0"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-emerald-500/20 ring-2 ring-emerald-400/40 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                                </svg>
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white leading-tight truncate">{session?.user?.name}</p>
                            <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="shrink-0 text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 rounded-lg px-3 py-1.5"
                    >
                        Sign out
                    </button>
                </div>

                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-emerald-400 mb-6 text-center tracking-tight">
                    Record New Expense
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1">
                        <label htmlFor="reason" className="text-sm font-medium text-slate-300 ml-1">
                            Expense Reason <span className="text-rose-400">*</span>
                        </label>
                        <input
                            id="reason"
                            type="text"
                            required
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Groceries, Utility Bill"
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="amount" className="text-sm font-medium text-slate-300 ml-1">
                            Amount (৳) <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium pl-1">৳</span>
                            <input
                                id="amount"
                                type="number"
                                required
                                min="1"
                                step="1"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all appearance-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full relative group overflow-hidden rounded-xl font-semibold text-white shadow-lg transition-all
              ${loading
                                ? 'bg-slate-700 cursor-not-allowed opacity-70'
                                : 'bg-linear-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/20 active:translate-y-0'
                            } px-4 py-3.5`}
                    >
                        <div className="relative z-10 flex items-center justify-center gap-2">
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                'Submit Expense'
                            )}
                        </div>
                    </button>
                </form>

                {/* Notifications Area */}
                {success && (
                    <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Expense saved successfully!
                    </div>
                )}

                {errorMSG && (
                    <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <div>
                            <p className="font-semibold mb-1">Error saving expense</p>
                            <p className="opacity-90">{errorMSG}</p>
                            <p className="opacity-80 text-xs mt-1">Check console and .env.local file if this persists.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
