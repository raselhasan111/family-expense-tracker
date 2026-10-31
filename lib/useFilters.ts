'use client';

import { useSearchParams, useRouter } from 'next/navigation';

export const BOOKS = ['family', 'personal', 'emergency'] as const;
export type Book = (typeof BOOKS)[number];

export const asBook = (v: string | null): Book =>
    (BOOKS as readonly string[]).includes(v ?? '') ? (v as Book) : 'family';

// All tab and filter state lives in the URL so a view can be linked, reloaded
// and restored. Defaults are never written to the query, which keeps links
// short and makes "is anything filtered?" a simple check.
const FILTER_KEYS = ['month', 'user', 'tag'];

export function useFilters() {
    const params = useSearchParams();
    const router = useRouter();

    const go = (next: URLSearchParams, push = false) => {
        const qs = next.toString();
        const url = qs ? `/?${qs}` : '/';
        if (push) router.push(url, { scroll: false });
        else router.replace(url, { scroll: false });
    };

    // Filters replace rather than push, so Back isn't clogged by select fiddling.
    const set = (patch: Record<string, string | null>) => {
        const next = new URLSearchParams(params.toString());
        for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === 'all') next.delete(k);
            else next.set(k, v);
        }
        go(next);
    };

    // A new book invalidates every filter — a Personal tag means nothing on Family.
    const setBook = (b: Book) => go(new URLSearchParams(b === 'family' ? '' : `book=${b}`), true);

    const book = asBook(params.get('book'));
    const filtered = FILTER_KEYS.some((k) => params.get(k));

    return { params, book, set, setBook, filtered, clear: () => setBook(book) };
}
