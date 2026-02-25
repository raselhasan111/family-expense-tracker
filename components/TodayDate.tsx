'use client';

import { useEffect, useState } from 'react';

export default function TodayDate() {
    const [date, setDate] = useState<string>('');

    useEffect(() => {
        // Format: February 02, 2026
        const options: Intl.DateTimeFormatOptions = {
            month: 'long',
            day: '2-digit',
            year: 'numeric'
        };
        setDate(new Date().toLocaleDateString('en-US', options));
    }, []);

    if (!date) return <div className="h-8 mt-4"></div>; // Placeholder to avoid layout shift

    return (
        <div className="mt-4 animate-in fade-in zoom-in duration-500 delay-200">
            <p className="text-sm md:text-base font-medium text-emerald-400/90 bg-emerald-400/10 inline-block px-4 py-1.5 rounded-full border border-emerald-400/20 shadow-sm shadow-emerald-900/20">
                Today is {date}
            </p>
        </div>
    );
}
