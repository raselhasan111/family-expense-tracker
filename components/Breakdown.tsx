'use client';

import { useState } from 'react';
import { taka } from '@/lib/format';

const TOP = 8;

// `value` is what the row filters by when clicked — a tag name, the untagged
// sentinel, or a user's email. Omitted for the "Other" roll-up, which stands
// for several entities and so cannot filter to one.
export interface BreakdownItem {
    label: string;
    amount: number;
    value?: string;
}

interface BreakdownProps {
    title: string;
    items: BreakdownItem[];
    selected?: string;
    onSelect?: (value: string) => void;
}

// Ranked horizontal bars: a single series, so every bar shares one fill (colour
// never encodes identity here — length does) and no legend is needed, since the
// title names the measure. Anything past the top N folds into "Other" rather
// than growing the chart without bound.
export default function Breakdown({ title, items, selected, onSelect }: BreakdownProps) {
    // Open by default, but collapsible: while entering an expense the form is
    // the task, and the chart is just pushing the list further down the page.
    const [open, setOpen] = useState(true);

    const ranked = [...items].filter((i) => i.amount > 0).sort((a, b) => b.amount - a.amount);
    // One bar at 100% tells the reader nothing they can't see in the total.
    if (ranked.length < 2) return null;

    const shown: BreakdownItem[] = ranked.slice(0, TOP);
    const rest = ranked.slice(TOP);
    if (rest.length) {
        shown.push({ label: `Other (${rest.length})`, amount: rest.reduce((s, i) => s + i.amount, 0) });
    }

    const total = ranked.reduce((s, i) => s + i.amount, 0) || 1;
    const max = shown[0].amount || 1;

    return (
        <div className="mb-6">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="flex items-center gap-1.5 mb-2.5 group cursor-pointer"
            >
                <svg
                    className={`w-3 h-3 text-slate-500 transition-transform ${open ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-slate-300 transition-colors">
                    {title}
                </span>
            </button>

            {open && (
                <div className="space-y-2.5">
                    {shown.map((i) => {
                        const pct = Math.round((i.amount / total) * 100);
                        const active = i.value !== undefined && i.value === selected;
                        const clickable = i.value !== undefined && !!onSelect;

                        const body = (
                            <>
                                <div className="flex items-baseline justify-between gap-2 text-xs">
                                    <span className={`truncate min-w-0 ${active ? 'text-emerald-300 font-semibold' : 'text-slate-300'}`}>
                                        {i.label}
                                    </span>
                                    <span className="text-slate-400 tabular-nums shrink-0">{taka(i.amount)} · {pct}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full bg-linear-to-r ${active ? 'from-emerald-400 to-emerald-300' : 'from-blue-500 to-emerald-500'}`}
                                        // Floor keeps a very small category visible rather than invisible.
                                        style={{ width: `${Math.max(2, (i.amount / max) * 100)}%` }}
                                    />
                                </div>
                            </>
                        );

                        return clickable ? (
                            <button
                                key={i.value}
                                type="button"
                                onClick={() => onSelect!(i.value!)}
                                aria-pressed={active}
                                title={active ? `Show all — clear the ${i.label} filter` : `Show only ${i.label}`}
                                className="w-full text-left space-y-1 -mx-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                {body}
                            </button>
                        ) : (
                            <div key={i.label} className="space-y-1 px-0 py-1">{body}</div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
