'use client';

import { useMemo, useState } from 'react';
import { taka, ts } from '@/lib/format';
import { LINK } from '@/components/ui';

// Where a column lands on the mobile card, which is a 2x2 layout rather than a
// column stack: lead = top-left, trail = top-right, body = the wide line,
// meta = the bottom row.
export type Slot = 'lead' | 'body' | 'meta' | 'trail';

export type Col<T> = {
    header: string;
    slot: Slot;
    right?: boolean;
    cell: (row: T) => React.ReactNode;
};

interface TxListProps<T extends { date: string; amount: number }> {
    rows: T[];            // already filtered by the parent; this sorts and totals
    cols: Col<T>[];
    totalLabel: string;
    accent?: 'emerald' | 'rose';
    empty: string;
    pageSize?: number;
}

const ACCENT = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
};

function slotOf<T>(cols: Col<T>[], row: T, slot: Slot) {
    // The body line wraps; the others sit in flex rows and truncate instead.
    // `truncate` implies white-space: nowrap, so using it on the body would let
    // a long reason push the card wider than the viewport.
    const cls = slot === 'body' ? 'break-words' : 'min-w-0 truncate';
    return cols
        .filter((c) => c.slot === slot)
        .map((c) => <span key={c.header} className={cls}>{c.cell(row)}</span>);
}

export default function TxList<T extends { date: string; amount: number }>({
    rows, cols, totalLabel, accent = 'emerald', empty, pageSize = 20,
}: TxListProps<T>) {
    const [all, setAll] = useState(false);

    // Collapse again when the filtered set changes, or expanding one month to 60
    // rows would leave the next month fully expanded too. Adjusted during render
    // rather than in an effect, which avoids a second render pass.
    const [seenRows, setSeenRows] = useState(rows);
    if (seenRows !== rows) {
        setSeenRows(rows);
        setAll(false);
    }

    // Sheet order is append order (oldest first). The index tie-break is
    // load-bearing: Array.sort is stable, so without it same-day rows would keep
    // sheet order and read oldest-first within the day.
    const sorted = useMemo(
        () => rows
            .map((r, i) => [r, i] as const)
            .sort((a, b) => ts(b[0].date) - ts(a[0].date) || b[1] - a[1]),
        [rows]
    );

    // Covers every filtered row, never just the visible page.
    const total = useMemo(() => rows.reduce((s, r) => s + r.amount, 0), [rows]);

    const shown = all ? sorted : sorted.slice(0, pageSize);

    return (
        <>
            {/* Total sits above the rows, and one element serves both breakpoints —
                which is what removes the tfoot colSpan and the mobile total card. */}
            <div className={`mb-4 p-4 rounded-xl border flex items-center justify-between gap-3 ${ACCENT[accent]}`}>
                <span className="font-bold truncate min-w-0">{totalLabel}</span>
                <span className="font-bold text-lg tabular-nums shrink-0">{taka(total)}</span>
            </div>

            {sorted.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">{empty}</p>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10">
                                    {cols.map((c) => (
                                        <th
                                            key={c.header}
                                            className={`text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 px-3 ${c.right ? 'text-right' : 'text-left'}`}
                                        >
                                            {c.header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {shown.map(([row, i]) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        {cols.map((c) => (
                                            <td
                                                key={c.header}
                                                // Only the body column wraps; dates, names and amounts stay on one line.
                                                className={`py-3 px-3 ${c.slot === 'body' ? 'text-slate-300' : 'whitespace-nowrap'} ${c.right ? 'text-right text-slate-100 font-semibold tabular-nums' : 'text-slate-300'}`}
                                            >
                                                {c.cell(row)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden space-y-3">
                        {shown.map(([row, i]) => (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-400 font-medium">{slotOf(cols, row, 'lead')}</span>
                                    <span className="text-base font-bold text-slate-100 tabular-nums shrink-0">
                                        {slotOf(cols, row, 'trail')}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-200 font-medium break-words">{slotOf(cols, row, 'body')}</p>
                                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                                    {slotOf(cols, row, 'meta')}
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="mt-4 text-center text-xs text-slate-500">
                        {shown.length < sorted.length ? (
                            <button onClick={() => setAll(true)} className={LINK}>
                                Showing {shown.length} of {sorted.length} — show all
                            </button>
                        ) : (
                            <>
                                {sorted.length} {sorted.length === 1 ? 'entry' : 'entries'}
                                {all && sorted.length > pageSize && (
                                    <button onClick={() => setAll(false)} className={`${LINK} ml-2`}>show less</button>
                                )}
                            </>
                        )}
                    </p>
                </>
            )}
        </>
    );
}
