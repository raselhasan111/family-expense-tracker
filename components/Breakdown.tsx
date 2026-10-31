'use client';

import { taka } from '@/lib/format';

const TOP = 8;

// Ranked horizontal bars: a single series, so every bar shares one fill (colour
// never encodes identity here — length does) and no legend is needed, since the
// title names the measure. Anything past the top N folds into "Other" rather
// than growing the chart without bound.
export default function Breakdown({ title, items }: {
    title: string;
    items: { label: string; amount: number }[];
}) {
    const ranked = [...items].filter((i) => i.amount > 0).sort((a, b) => b.amount - a.amount);
    // One bar at 100% tells the reader nothing they can't see in the total.
    if (ranked.length < 2) return null;

    const shown = ranked.slice(0, TOP);
    const rest = ranked.slice(TOP);
    if (rest.length) {
        shown.push({ label: `Other (${rest.length})`, amount: rest.reduce((s, i) => s + i.amount, 0) });
    }

    const total = ranked.reduce((s, i) => s + i.amount, 0) || 1;
    const max = shown[0].amount || 1;

    return (
        <div className="mb-6 space-y-2.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
            {shown.map((i) => {
                const pct = Math.round((i.amount / total) * 100);
                return (
                    <div key={i.label} className="space-y-1" title={`${i.label}: ${taka(i.amount)} (${pct}%)`}>
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                            <span className="text-slate-300 truncate min-w-0">{i.label}</span>
                            <span className="text-slate-400 tabular-nums shrink-0">{taka(i.amount)} · {pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-linear-to-r from-blue-500 to-emerald-500"
                                // Floor keeps a very small category visible rather than invisible.
                                style={{ width: `${Math.max(2, (i.amount / max) * 100)}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
