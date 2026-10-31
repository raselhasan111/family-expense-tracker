'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { taka, formatDate, toYearMonth, monthLabel, inMonth, monthsOf } from '@/lib/format';
import { useFilters } from '@/lib/useFilters';
import { CARD, PANEL, H2, SELECT, PILL, LINK, Loading, Notice, chevron } from '@/components/ui';
import TxList, { type Col } from '@/components/TxList';
import Breakdown from '@/components/Breakdown';

interface Expense {
    date: string;
    userName: string;
    userEmail: string;
    reason: string;
    amount: number;
    tag: string;
}

interface ExpenseListProps {
    refreshTrigger?: number;
    cashbook?: 'family' | 'personal';
    // Reports the tag vocabulary found in the fetched rows, so ExpenseForm can
    // offer it without issuing a second fetch of the same data.
    onTagsChange?: (tags: string[]) => void;
}

// Sentinel for the "no tag" filter option. Prefixed so it cannot collide with
// a real tag that happens to be called "untagged".
const UNTAGGED = '~untagged';

// Dedupe case-insensitively, keeping the casing first seen, then sort.
function collectTags(expenses: Expense[]): string[] {
    const byLower = new Map<string, string>();
    expenses.forEach((e) => {
        const tag = e.tag?.trim();
        if (tag && !byLower.has(tag.toLowerCase())) byLower.set(tag.toLowerCase(), tag);
    });
    return Array.from(byLower.values()).sort((a, b) => a.localeCompare(b));
}

function sumBy(rows: Expense[], key: (e: Expense) => string) {
    const by = new Map<string, number>();
    rows.forEach((e) => {
        const k = key(e);
        by.set(k, (by.get(k) || 0) + e.amount);
    });
    return Array.from(by, ([label, amount]) => ({ label, amount }));
}

export default function ExpenseList({ refreshTrigger, cashbook, onTagsChange }: ExpenseListProps) {
    const { data: session } = useSession();
    const { params, set, filtered, clear } = useFilters();
    const isPersonal = cashbook === 'personal';
    const currentYM = toYearMonth(new Date());

    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
        fetchExpenses();
    }, [fetchExpenses, refreshTrigger]);

    // Every tag ever used in this cashbook — the vocabulary offered by the form.
    const allTags = useMemo(() => collectTags(expenses), [expenses]);

    useEffect(() => {
        onTagsChange?.(allTags);
    }, [allTags, onTagsChange]);

    const availableMonths = useMemo(() => monthsOf(expenses), [expenses]);

    // Filters are derived from the URL rather than held in state. Validation and
    // fallback are the same expression, so a hand-typed param and a filter whose
    // data has disappeared are handled identically — and the three reset effects
    // this file used to need are gone.
    const monthParam = params.get('month');
    const selectedMonth = monthParam && availableMonths.includes(monthParam)
        ? monthParam
        : availableMonths.includes(currentYM)
            ? currentYM
            : availableMonths[0] ?? currentYM;

    const selectedMonthExpenses = useMemo(
        () => expenses.filter((e) => inMonth(e.date, selectedMonth)),
        [expenses, selectedMonth]
    );

    // Unique users from the selected month, disambiguating duplicate display names.
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

    const userParam = params.get('user');
    const selectedUser = userParam && uniqueUsers.some((u) => u.email === userParam) ? userParam : 'all';

    const ownedExpenses = useMemo(() => {
        if (isPersonal) return selectedMonthExpenses.filter((e) => e.userEmail === session?.user?.email);
        if (selectedUser === 'all') return selectedMonthExpenses;
        return selectedMonthExpenses.filter((e) => e.userEmail === selectedUser);
    }, [selectedMonthExpenses, selectedUser, isPersonal, session?.user?.email]);

    const monthTags = useMemo(() => (isPersonal ? collectTags(ownedExpenses) : []), [isPersonal, ownedExpenses]);
    const hasUntagged = useMemo(
        () => isPersonal && ownedExpenses.some((e) => !e.tag?.trim()),
        [isPersonal, ownedExpenses]
    );

    // Resolve to the tag's *canonical* casing, so a link carrying ?tag=fish both
    // filters and selects the "Fish" option — matching on value alone would
    // filter the rows while leaving the dropdown showing "All Tags".
    const tagParam = params.get('tag');
    const selectedTag = !tagParam
        ? 'all'
        : tagParam === UNTAGGED
            ? (hasUntagged ? UNTAGGED : 'all')
            : monthTags.find((t) => t.toLowerCase() === tagParam.toLowerCase()) ?? 'all';

    const filteredExpenses = useMemo(() => {
        if (!isPersonal || selectedTag === 'all') return ownedExpenses;
        if (selectedTag === UNTAGGED) return ownedExpenses.filter((e) => !e.tag?.trim());
        return ownedExpenses.filter((e) => e.tag?.trim().toLowerCase() === selectedTag.toLowerCase());
    }, [ownedExpenses, isPersonal, selectedTag]);

    // The overview is deliberately fed from the set *before* this tab's own
    // filter: a breakdown of one selected tag is a one-bar chart, and the point
    // of the panel is the month's whole picture.
    const breakdown = useMemo(
        () => isPersonal
            ? sumBy(ownedExpenses, (e) => e.tag?.trim() || 'Untagged')
            : sumBy(selectedMonthExpenses, (e) => e.userName || '—'),
        [isPersonal, ownedExpenses, selectedMonthExpenses]
    );

    const baseTotalLabel = isPersonal
        ? (session?.user?.name ?? 'You')
        : selectedUser === 'all'
            ? 'All Users'
            : uniqueUsers.find((u) => u.email === selectedUser)?.name || selectedUser;

    const tagLabel = selectedTag === UNTAGGED ? 'Untagged' : selectedTag;
    const totalLabel = isPersonal && selectedTag !== 'all'
        ? `${baseTotalLabel} · ${tagLabel}`
        : baseTotalLabel;

    const cols = useMemo<Col<Expense>[]>(() => ([
        { header: 'Date', slot: 'lead', cell: (e) => formatDate(e.date) },
        // Personal is already scoped to the signed-in user, so a Name column
        // would repeat one value on every row.
        ...(!isPersonal ? [{ header: 'Name', slot: 'meta', cell: (e: Expense) => e.userName } as Col<Expense>] : []),
        { header: 'Reason', slot: 'body', cell: (e) => e.reason },
        ...(isPersonal ? [{
            header: 'Tag',
            slot: 'meta',
            cell: (e: Expense) => e.tag?.trim()
                ? <span className={PILL}>{e.tag}</span>
                : <span className="text-slate-600">—</span>,
        } as Col<Expense>] : []),
        { header: 'Amount', slot: 'trail', right: true, cell: (e) => taka(e.amount) },
    ]), [isPersonal]);

    const selectClass = `${SELECT} flex-1 min-w-0 truncate sm:flex-none`;

    return (
        <div className={`${PANEL} mt-10`}>
            <div className={`${CARD} transition-all hover:shadow-emerald-500/10`}>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <h2 className={H2}>
                        Monthly {isPersonal ? 'Personal' : 'Family'} Expenses
                    </h2>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <select
                            aria-label="Filter by month"
                            value={selectedMonth}
                            onChange={(e) => set({ month: e.target.value, user: null, tag: null })}
                            className={selectClass}
                            style={chevron()}
                        >
                            {availableMonths.length === 0 && <option value={selectedMonth}>{monthLabel(selectedMonth)}</option>}
                            {availableMonths.map((ym) => (
                                <option key={ym} value={ym}>{monthLabel(ym)}</option>
                            ))}
                        </select>

                        {!isPersonal && (
                            <select
                                aria-label="Filter by user"
                                value={selectedUser}
                                onChange={(e) => set({ user: e.target.value })}
                                className={selectClass}
                                style={chevron()}
                            >
                                <option value="all">All Users</option>
                                {uniqueUsers.map((user) => (
                                    <option key={user.email} value={user.email}>{user.displayName}</option>
                                ))}
                            </select>
                        )}

                        {isPersonal && (monthTags.length > 0 || hasUntagged) && (
                            <select
                                aria-label="Filter by tag"
                                value={selectedTag}
                                onChange={(e) => set({ tag: e.target.value })}
                                className={selectClass}
                                style={chevron()}
                            >
                                <option value="all">All Tags</option>
                                {monthTags.map((tag) => (
                                    <option key={tag} value={tag}>{tag}</option>
                                ))}
                                {hasUntagged && <option value={UNTAGGED}>Untagged</option>}
                            </select>
                        )}

                        {filtered && (
                            <button type="button" onClick={clear} className={LINK}>Clear</button>
                        )}
                    </div>
                </div>

                {loading && <Loading label="Loading expenses..." />}

                {error && !loading && <Notice kind="bad">{error}</Notice>}

                {!loading && !error && (
                    <>
                        <Breakdown
                            title={isPersonal ? 'Spending by tag' : 'Spending by person'}
                            items={breakdown}
                        />
                        <TxList
                            rows={filteredExpenses}
                            cols={cols}
                            totalLabel={`Total (${totalLabel})`}
                            empty={`No expenses found for ${monthLabel(selectedMonth)}`}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
