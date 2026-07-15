'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

interface Entry {
    date: string;
    userName: string;
    userEmail: string;
    reason: string;
    amount: number;
    type: 'cashin' | 'cashout';
}

interface EmergencyListProps {
    refreshTrigger?: number;
}

const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat' as const,
    backgroundPosition: 'right 10px center',
};

const selectClass = 'bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all cursor-pointer appearance-none pr-8';

function toYearMonth(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(ym: string): string {
    const [year, month] = ym.split('-').map(Number);
    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatDate(dateStr: string) {
    try {
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

interface EntryTableProps {
    entries: Entry[];
    totalLabel: string;
    totalColorClass: string;
    emptyLabel: string;
    selectedPeriod: string;
}

function EntryTable({ entries, totalLabel, totalColorClass, emptyLabel, selectedPeriod }: EntryTableProps) {
    const total = entries.reduce((sum, e) => sum + e.amount, 0);

    if (entries.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
                <p className="text-sm">{emptyLabel} {selectedPeriod === 'all' ? 'yet' : `for ${formatMonthLabel(selectedPeriod)}`}</p>
            </div>
        );
    }

    return (
        <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 pl-3">Date</th>
                            <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">Name</th>
                            <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">Reason</th>
                            <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 pr-3">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {entries.map((entry, index) => (
                            <tr key={index} className="hover:bg-white/5 transition-colors">
                                <td className="py-3 pl-3 text-slate-300 whitespace-nowrap">{formatDate(entry.date)}</td>
                                <td className="py-3 text-slate-200 font-medium whitespace-nowrap">{entry.userName}</td>
                                <td className="py-3 text-slate-300">{entry.reason}</td>
                                <td className="py-3 pr-3 text-right text-slate-100 font-semibold tabular-nums">
                                    ৳{entry.amount.toLocaleString('en-IN')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className={`border-t-2 ${totalColorClass}`}>
                            <td colSpan={3} className="py-3 pl-3 font-bold text-base">{totalLabel}</td>
                            <td className="py-3 pr-3 text-right font-bold text-lg tabular-nums">
                                ৳{total.toLocaleString('en-IN')}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
                {entries.map((entry, index) => (
                    <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-medium">{formatDate(entry.date)}</span>
                            <span className="text-base font-bold text-slate-100 tabular-nums">
                                ৳{entry.amount.toLocaleString('en-IN')}
                            </span>
                        </div>
                        <p className="text-sm text-slate-200 font-medium">{entry.reason}</p>
                        <p className="text-xs text-slate-400">{entry.userName}</p>
                    </div>
                ))}
                <div className={`border rounded-xl p-4 flex items-center justify-between gap-3`} style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className="font-bold truncate min-w-0">{totalLabel}</span>
                    <span className="font-bold text-lg tabular-nums">৳{total.toLocaleString('en-IN')}</span>
                </div>
            </div>

            <div className="mt-3 text-center">
                <p className="text-xs text-slate-500">
                    {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </p>
            </div>
        </>
    );
}

export default function EmergencyList({ refreshTrigger }: EmergencyListProps) {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

    const fetchEntries = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/emergency');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch entries');
            setEntries(data.entries || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load entries');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries, refreshTrigger]);

    // All-time totals (never filtered)
    const allTimeSavings = useMemo(() => entries.filter((e) => e.type === 'cashin').reduce((s, e) => s + e.amount, 0), [entries]);
    const allTimeExpense = useMemo(() => entries.filter((e) => e.type === 'cashout').reduce((s, e) => s + e.amount, 0), [entries]);
    const balance = allTimeSavings - allTimeExpense;

    // Available months for the selector
    const availableMonths = useMemo(() => {
        const monthSet = new Set<string>();
        entries.forEach((e) => {
            try {
                const d = new Date(e.date);
                if (!isNaN(d.getTime())) monthSet.add(toYearMonth(d));
            } catch { /* skip */ }
        });
        return Array.from(monthSet).sort((a, b) => b.localeCompare(a)).slice(0, 12);
    }, [entries]);

    // Period-filtered entries for the two lists
    const periodEntries = useMemo(() => {
        if (selectedPeriod === 'all') return entries;
        const [year, month] = selectedPeriod.split('-').map(Number);
        return entries.filter((e) => {
            try {
                const d = new Date(e.date);
                return d.getMonth() + 1 === month && d.getFullYear() === year;
            } catch {
                return false;
            }
        });
    }, [entries, selectedPeriod]);

    const cashIns = useMemo(() => periodEntries.filter((e) => e.type === 'cashin'), [periodEntries]);
    const cashOuts = useMemo(() => periodEntries.filter((e) => e.type === 'cashout'), [periodEntries]);

    return (
        <div className="w-full max-w-3xl mx-auto mt-10 relative z-10 space-y-6">

            {/* All-time Balance Summary Card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8">
                <h2 className="text-xl font-bold text-white mb-5 tracking-tight">Emergency Fund Balance</h2>
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                        <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">Total Savings</p>
                        <p className="text-lg font-bold text-emerald-300 tabular-nums">৳{allTimeSavings.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-center">
                        <p className="text-xs text-rose-400 font-semibold uppercase tracking-wider mb-1">Total Expense</p>
                        <p className="text-lg font-bold text-rose-300 tabular-nums">৳{allTimeExpense.toLocaleString('en-IN')}</p>
                    </div>
                    <div className={`border rounded-2xl p-4 text-center ${balance >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                        <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${balance >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>Balance</p>
                        <p className={`text-lg font-bold tabular-nums ${balance >= 0 ? 'text-blue-300' : 'text-amber-300'}`}>
                            ৳{balance.toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Entries Lists */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-emerald-400 tracking-tight">
                        Fund Entries
                    </h2>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-400 whitespace-nowrap">Period:</label>
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className={selectClass}
                            style={selectStyle}
                        >
                            <option value="all">All Time</option>
                            {availableMonths.map((ym) => (
                                <option key={ym} value={ym}>{formatMonthLabel(ym)}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading && (
                    <div className="flex flex-col items-center gap-3 py-12">
                        <svg className="animate-spin h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <p className="text-slate-400 text-sm">Loading entries...</p>
                    </div>
                )}

                {error && !loading && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                {!loading && !error && (
                    <div className="space-y-8">
                        {/* Cash-ins */}
                        <div>
                            <h3 className="text-base font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                                Cash In — Savings
                            </h3>
                            <EntryTable
                                entries={cashIns}
                                totalLabel="Total Savings"
                                totalColorClass="border-emerald-500/30 text-emerald-400"
                                emptyLabel="No savings entries"
                                selectedPeriod={selectedPeriod}
                            />
                        </div>

                        <div className="border-t border-white/10" />

                        {/* Cash-outs */}
                        <div>
                            <h3 className="text-base font-semibold text-rose-400 mb-3 flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-rose-400"></span>
                                Cash Out — Expenses
                            </h3>
                            <EntryTable
                                entries={cashOuts}
                                totalLabel="Total Expense"
                                totalColorClass="border-rose-500/30 text-rose-400"
                                emptyLabel="No expense entries"
                                selectedPeriod={selectedPeriod}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
