'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

// Class strings shared across the app. These repeat as *strings*, not as
// structure, so they stay constants — a <Card> wrapper would add an import and
// a React element per use to save nothing.
export const CARD = 'bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8';
export const PANEL = 'w-full max-w-3xl mx-auto relative z-10';
export const H2 = 'text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-emerald-400 tracking-tight';
export const FIELD = 'w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all';
export const DATE_FIELD = `${FIELD} [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-clear-button]:hidden`;
// Base is the EmergencyList variant; ExpenseList appends its own flex sizing.
export const SELECT = 'bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all cursor-pointer appearance-none pr-8';
export const PILL = 'inline-block bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-xs text-slate-300';
export const LINK = 'text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer';

// Filter selects use a 12px icon inset 10px; form selects 14px inset 16px.
export const chevron = (size = 12, inset = 10) => ({
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat' as const,
    backgroundPosition: `right ${inset}px center`,
});

export const Spinner = ({ className = 'h-7 w-7 text-emerald-400' }: { className?: string }) => (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
);

export const Loading = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center gap-3 py-12">
        <Spinner />
        <p className="text-slate-400 text-sm">{label}</p>
    </div>
);

const ICON = {
    ok: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    bad: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

export function Notice({ kind, children }: { kind: 'ok' | 'bad'; children: React.ReactNode }) {
    const tone = kind === 'ok'
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        : 'bg-rose-500/10 border-rose-500/20 text-rose-400';
    return (
        <div className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${tone} animate-in fade-in slide-in-from-bottom-2`}>
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={ICON[kind]} />
            </svg>
            <div>{children}</div>
        </div>
    );
}

export const Field = ({ label, htmlFor, className = '', children }: {
    label: string; htmlFor: string; className?: string; children: React.ReactNode;
}) => (
    <div className={`space-y-1 ${className}`}>
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-300 ml-1">
            {label} <span className="text-rose-400">*</span>
        </label>
        {children}
    </div>
);

export function UserBar() {
    const { data: session } = useSession();
    const [imgError, setImgError] = useState(false);
    return (
        <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3 min-w-0">
                {session?.user?.image && !imgError ? (
                    // eslint-disable-next-line @next/next/no-img-element
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
    );
}

export function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
    return (
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
                        <Spinner className="-ml-1 mr-2 h-4 w-4 text-white" />
                        Saving...
                    </>
                ) : (
                    <span className="capitalize">{label}</span>
                )}
            </div>
        </button>
    );
}

// The shell both entry forms share: card, user bar, title, form, notices.
// Only the fields differ between them.
export function FormCard({ title, loading, success, error, errorTitle, submitLabel, onSubmit, children }: {
    title: string; loading: boolean; success: string; error: string; errorTitle: string;
    submitLabel: string; onSubmit: (e: React.FormEvent) => void; children: React.ReactNode;
}) {
    return (
        <div className={PANEL}>
            <div className={`${CARD} transition-all hover:shadow-primary/20 hover:border-white/30`}>
                <UserBar />
                <h2 className={`${H2} mb-6 text-center capitalize`}>{title}</h2>
                <form onSubmit={onSubmit} className="space-y-6">
                    {children}
                    <SubmitButton loading={loading} label={submitLabel} />
                </form>
                {success && <div className="mt-6"><Notice kind="ok">{success}</Notice></div>}
                {error && (
                    <div className="mt-6">
                        <Notice kind="bad">
                            <p className="font-semibold mb-1">{errorTitle}</p>
                            <p className="opacity-90">{error}</p>
                            <p className="opacity-80 text-xs mt-1">Check console and .env.local file if this persists.</p>
                        </Notice>
                    </div>
                )}
            </div>
        </div>
    );
}
