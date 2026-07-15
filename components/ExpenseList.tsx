'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Expense {
    date: string;
    userName: string;
    userEmail: string;
    reason: string;
    amount: number;
}

interface ExpenseListProps {
    refreshTrigger?: number;
    cashbook?: 'family' | 'personal';
}

const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat' as const,
    backgroundPosition: 'right 10px center',
};

const selectClass = 'flex-1 min-w-0 overflow-hidden text-ellipsis bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all cursor-pointer appearance-none pr-8';

function toYearMonth(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(ym: string): string {
    const [year, month] = ym.split('-').map(Number);
    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function ExpenseList({ refreshTrigger, cashbook }: ExpenseListProps) {
    const { data: session } = useSession();
    const isPersonal = cashbook === 'personal';
    const currentYM = toYearMonth(new Date());

    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedUser, setSelectedUser] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState<string>(currentYM);

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const book = cashbook ?? 'family';
            const res = await fetch(`/api/expenses?book=${book}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch expenses');
            setExpenses(data.expenses || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load expenses');
        } finally {
            setLoading(false);
        }
    }, [cashbook]);

    useEffect(() => {
        setSelectedUser('all');
        setSelectedMonth(currentYM);
        fetchExpenses();
    }, [fetchExpenses, refreshTrigger]);

    // Months that have data, newest first, capped at 12
    const availableMonths = useMemo(() => {
        const monthSet = new Set<string>();
        expenses.forEach((e) => {
            try {
                const d = new Date(e.date);
                if (!isNaN(d.getTime())) monthSet.add(toYearMonth(d));
            } catch { /* skip */ }
        });
        return Array.from(monthSet).sort((a, b) => b.localeCompare(a)).slice(0, 12);
    }, [expenses]);

    // If the selected month drops out of the available list (e.g. current month has no data),
    // fall back to the most recent available month
    useEffect(() => {
        if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
            setSelectedMonth(availableMonths[0]);
        }
    }, [availableMonths]);

    // Filter entries for the selected month
    const selectedMonthExpenses = useMemo(() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        return expenses.filter((e) => {
            try {
                const d = new Date(e.date);
                return d.getMonth() + 1 === month && d.getFullYear() === year;
            } catch {
                return false;
            }
        });
    }, [expenses, selectedMonth]);

    // Unique users from selected month data (family mode only)
    const uniqueUsers = useMemo(() => {
        const userMap = new Map<string, string>();
        selectedMonthExpenses.forEach((e) => {
            if (!userMap.has(e.userEmail)) userMap.set(e.userEmail, e.userName);
        });
        const users = Array.from(userMap.entries()).map(([email, name]) => ({ email, name }));

        const nameCount = new Map<string, number>();
        users.forEach((u) => nameCount.set(u.name, (nameCount.get(u.name) || 0) + 1));

        return users
            .map((u) => ({
                ...u,
                displayName: (nameCount.get(u.name) || 0) > 1 ? `${u.name} (${u.email})` : u.name,
            }))
            .sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [selectedMonthExpenses]);

    // Apply personal/user filter
    const filteredExpenses = useMemo(() => {
        if (isPersonal) return selectedMonthExpenses.filter((e) => e.userEmail === session?.user?.email);
        if (selectedUser === 'all') return selectedMonthExpenses;
        return selectedMonthExpenses.filter((e) => e.userEmail === selectedUser);
    }, [selectedMonthExpenses, selectedUser, isPersonal, session?.user?.email]);

    const total = useMemo(() => filteredExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExpenses]);

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const totalLabel = isPersonal
        ? (session?.user?.name ?? 'You')
        : selectedUser === 'all'
            ? 'All Users'
            : uniqueUsers.find((u) => u.email === selectedUser)?.name || selectedUser;

    return (
        <div className="w-full max-w-3xl mx-auto mt-10 relative z-10">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8 transition-all hover:shadow-emerald-500/10">

                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-emerald-400 tracking-tight">
                        Monthly {isPersonal ? 'Personal' : 'Family'} Expenses
                    </h2>

                    {/* Filters row */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <label className="text-sm text-slate-400 whitespace-nowrap">Filter by:</label>

                        {/* Month selector */}
                        <select
                            value={selectedMonth}
                            onChange={(e) => {
                                setSelectedMonth(e.target.value);
                                setSelectedUser('all');
                            }}
                            className={selectClass}
                            style={selectStyle}
                        >
                            {availableMonths.map((ym) => (
                                <option key={ym} value={ym}>
                                    {formatMonthLabel(ym)}
                                </option>
                            ))}
                        </select>

                        {/* User selector — family mode only */}
                        {!isPersonal && (
                            <select
                                id="user-filter"
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                                className={selectClass}
                                style={selectStyle}
                            >
                                <option value="all">All Users</option>
                                {uniqueUsers.map((user) => (
                                    <option key={user.email} value={user.email}>
                                        {user.displayName}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center gap-3 py-12">
                        <svg className="animate-spin h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <p className="text-slate-400 text-sm">Loading expenses...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && filteredExpenses.length === 0 && (
                    <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
                        <svg className="w-12 h-12 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-sm">No expenses found for {formatMonthLabel(selectedMonth)}</p>
                    </div>
                )}

                {/* Expense Table */}
                {!loading && !error && filteredExpenses.length > 0 && (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 pl-3">Date</th>
                                        <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 px-3">Name</th>
                                        <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 px-3">Reason</th>
                                        <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 pr-3">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredExpenses.map((expense, index) => (
                                        <tr key={index} className="hover:bg-white/5 transition-colors group">
                                            <td className="py-3 pl-3 text-slate-300 whitespace-nowrap">{formatDate(expense.date)}</td>
                                            <td className="py-3 px-3 text-slate-200 font-medium whitespace-nowrap">{expense.userName}</td>
                                            <td className="py-3 px-3 text-slate-300">{expense.reason}</td>
                                            <td className="py-3 pr-3 text-right text-slate-100 font-semibold tabular-nums">
                                                ৳{expense.amount.toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-emerald-500/30">
                                        <td colSpan={3} className="py-4 pl-3 text-emerald-400 font-bold text-base max-w-0 truncate">
                                            Total ({totalLabel})
                                        </td>
                                        <td className="py-4 pr-3 text-right text-emerald-400 font-bold text-lg tabular-nums">
                                            ৳{total.toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="sm:hidden space-y-3">
                            {filteredExpenses.map((expense, index) => (
                                <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400 font-medium">{formatDate(expense.date)}</span>
                                        <span className="text-base font-bold text-slate-100 tabular-nums">
                                            ৳{expense.amount.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-200 font-medium break-words">{expense.reason}</p>
                                    <p className="text-xs text-slate-400">{expense.userName}</p>
                                </div>
                            ))}

                            {/* Mobile Total */}
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between gap-3 min-w-0">
                                <span className="text-emerald-400 font-bold truncate min-w-0">
                                    Total ({totalLabel})
                                </span>
                                <span className="text-emerald-400 font-bold text-lg tabular-nums">
                                    ৳{total.toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>

                        {/* Entry Count */}
                        <div className="mt-4 text-center">
                            <p className="text-xs text-slate-500">
                                {filteredExpenses.length} {filteredExpenses.length === 1 ? 'entry' : 'entries'} found
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
