// Shared formatting and date helpers. These were duplicated verbatim across
// ExpenseList and EmergencyList; parsing lives here so sorting, month filtering
// and display can never disagree about what a sheet date means.

export const taka = (n: number) => `৳${n.toLocaleString('en-IN')}`;

// Sheet dates are written as M/D/YYYY (see ExpenseForm). Unusable cells — a
// stray header row, a hand-edited blank — get -Infinity so they sort to the
// bottom instead of scattering through the list.
export const ts = (s: string): number => {
    const t = Date.parse(s);
    return Number.isNaN(t) ? -Infinity : t;
};

export const formatDate = (s: string): string => {
    const t = ts(s);
    // Note: new Date('garbage') does not throw and renders as "Invalid Date",
    // so this needs a check rather than the try/catch it replaces.
    return t === -Infinity
        ? s
        : new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const toYearMonth = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const monthLabel = (ym: string): string => {
    const [year, month] = ym.split('-').map(Number);
    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export const inMonth = (s: string, ym: string): boolean => {
    const t = ts(s);
    return t !== -Infinity && toYearMonth(new Date(t)) === ym;
};

// Months that have data, newest first, capped at 12.
export const monthsOf = (rows: { date: string }[]): string[] =>
    Array.from(
        new Set(
            rows.map((r) => ts(r.date)).filter((t) => t !== -Infinity).map((t) => toYearMonth(new Date(t)))
        )
    )
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 12);
