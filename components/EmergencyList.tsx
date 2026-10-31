'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { taka, formatDate, monthLabel, inMonth, monthsOf } from '@/lib/format';
import { useFilters } from '@/lib/useFilters';
import { CARD, PANEL, H2, SELECT, LINK, Loading, Notice, chevron } from '@/components/ui';
import TxList, { type Col } from '@/components/TxList';

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

// The fund is shared across all users, so both sub-lists show the same columns.
const COLS: Col<Entry>[] = [
    { header: 'Date', slot: 'lead', cell: (e) => formatDate(e.date) },
    { header: 'Name', slot: 'meta', cell: (e) => e.userName },
    { header: 'Reason', slot: 'body', cell: (e) => e.reason },
    { header: 'Amount', slot: 'trail', right: true, cell: (e) => taka(e.amount) },
];

export default function EmergencyList({ refreshTrigger }: EmergencyListProps) {
    const { params, set, filtered, clear } = useFilters();

    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    // All-time totals — deliberately never period-filtered.
    const allTimeSavings = useMemo(() => entries.filter((e) => e.type === 'cashin').reduce((s, e) => s + e.amount, 0), [entries]);
    const allTimeExpense = useMemo(() => entries.filter((e) => e.type === 'cashout').reduce((s, e) => s + e.amount, 0), [entries]);
    const balance = allTimeSavings - allTimeExpense;

    const availableMonths = useMemo(() => monthsOf(entries), [entries]);

    // Period lives in the URL like every other filter; 'all' is the default here,
    // so it is simply the absence of the param.
    const monthParam = params.get('month');
    const selectedPeriod = monthParam && availableMonths.includes(monthParam) ? monthParam : 'all';

    const periodEntries = useMemo(
        () => selectedPeriod === 'all' ? entries : entries.filter((e) => inMonth(e.date, selectedPeriod)),
        [entries, selectedPeriod]
    );

    const cashIns = useMemo(() => periodEntries.filter((e) => e.type === 'cashin'), [periodEntries]);
    const cashOuts = useMemo(() => periodEntries.filter((e) => e.type === 'cashout'), [periodEntries]);

    const periodSuffix = selectedPeriod === 'all' ? 'yet' : `for ${monthLabel(selectedPeriod)}`;

    return (
        <div className={`${PANEL} mt-10 space-y-6`}>

            <div className={CARD}>
                <h2 className="text-xl font-bold text-white mb-5 tracking-tight">
                    Emergency Fund Balance (All Time)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                        <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">Total Savings</p>
                        <p className="text-lg font-bold text-emerald-300 tabular-nums">{taka(allTimeSavings)}</p>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-center">
                        <p className="text-xs text-rose-400 font-semibold uppercase tracking-wider mb-1">Total Expense</p>
                        <p className="text-lg font-bold text-rose-300 tabular-nums">{taka(allTimeExpense)}</p>
                    </div>
                    <div className={`border rounded-2xl p-4 text-center ${balance >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                        <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${balance >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>Balance</p>
                        <p className={`text-lg font-bold tabular-nums ${balance >= 0 ? 'text-blue-300' : 'text-amber-300'}`}>
                            {taka(balance)}
                        </p>
                    </div>
                </div>
            </div>

            <div className={CARD}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <h2 className={H2}>Fund Entries</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="text-sm text-slate-400 whitespace-nowrap">Period:</label>
                        <select
                            aria-label="Filter by period"
                            value={selectedPeriod}
                            onChange={(e) => set({ month: e.target.value })}
                            className={SELECT}
                            style={chevron()}
                        >
                            <option value="all">All Time</option>
                            {availableMonths.map((ym) => (
                                <option key={ym} value={ym}>{monthLabel(ym)}</option>
                            ))}
                        </select>
                        {filtered && <button type="button" onClick={clear} className={LINK}>Clear</button>}
                    </div>
                </div>

                {loading && <Loading label="Loading entries..." />}

                {error && !loading && <Notice kind="bad">{error}</Notice>}

                {!loading && !error && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-base font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                                Cash In — Savings
                            </h3>
                            <TxList
                                rows={cashIns}
                                cols={COLS}
                                accent="emerald"
                                totalLabel="Total Savings"
                                empty={`No savings entries ${periodSuffix}`}
                            />
                        </div>

                        <div className="border-t border-white/10" />

                        <div>
                            <h3 className="text-base font-semibold text-rose-400 mb-3 flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-rose-400"></span>
                                Cash Out — Expenses
                            </h3>
                            <TxList
                                rows={cashOuts}
                                cols={COLS}
                                accent="rose"
                                totalLabel="Total Expense"
                                empty={`No expense entries ${periodSuffix}`}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
