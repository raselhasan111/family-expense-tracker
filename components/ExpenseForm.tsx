'use client';

import { useState } from 'react';
import { FIELD, DATE_FIELD, Field, FormCard, LINK, chevron } from '@/components/ui';

interface ExpenseFormProps {
    onExpenseAdded?: () => void;
    cashbook?: 'family' | 'personal';
    // Tags already in use, supplied by HomeContent from the list's fetch.
    existingTags?: string[];
}

const NEW_TAG = '__new__';
const MAX_TAG_LENGTH = 40;
const FORMULA_PREFIX = /^[=+\-@]/;

export default function ExpenseForm({ onExpenseAdded, cashbook, existingTags = [] }: ExpenseFormProps) {
    const isPersonal = cashbook === 'personal';
    const todayISO = new Date().toISOString().split('T')[0];
    const [reason, setReason] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState<string>(todayISO);
    const [tag, setTag] = useState('');
    const [tagMode, setTagMode] = useState<'select' | 'new'>('select');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMSG, setErrorMSG] = useState('');

    // With no vocabulary to pick from there is nothing to select, so fall back
    // to free text. Derived rather than stored, so the select appears on its own
    // once the list reports the first tags.
    const showTagSelect = tagMode === 'select' && existingTags.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccess(false);
        setErrorMSG('');

        // A tag is mandatory on personal entries; reuse the existing casing when
        // the typed tag already exists so "Food" and "food" don't fork.
        let cleanTag = tag.trim();
        if (isPersonal) {
            if (!cleanTag) {
                setErrorMSG('Please choose or enter a tag.');
                return;
            }
            if (cleanTag.length > MAX_TAG_LENGTH) {
                setErrorMSG(`Tag must be ${MAX_TAG_LENGTH} characters or fewer.`);
                return;
            }
            if (FORMULA_PREFIX.test(cleanTag)) {
                setErrorMSG('Tag cannot start with =, +, - or @.');
                return;
            }
            cleanTag = existingTags.find((t) => t.toLowerCase() === cleanTag.toLowerCase()) ?? cleanTag;
        }

        setLoading(true);

        try {
            const [year, month, day] = date.split('-').map(Number);
            const formattedDate = `${month}/${day}/${year}`;

            // Identity is derived server-side from the session; not sent here.
            const payload = {
                reason,
                amount: Number(amount),
                date: formattedDate,
                book: cashbook ?? 'family',
                ...(isPersonal && { tag: cleanTag }),
            };

            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit expense');
            }

            setSuccess(true);
            setReason('');
            setAmount('');
            setTag('');
            setTagMode('select');
            setDate(new Date().toISOString().split('T')[0]);
            onExpenseAdded?.();

            setTimeout(() => setSuccess(false), 5000);
        } catch (error: any) {
            setErrorMSG(error.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormCard
            title={`Record New ${cashbook ?? 'family'} Expense`}
            loading={loading}
            success={success ? 'Expense saved successfully!' : ''}
            error={errorMSG}
            errorTitle="Error saving expense"
            submitLabel={`Submit ${cashbook ?? 'family'} Expense`}
            onSubmit={handleSubmit}
        >
            <Field label="Expense Reason" htmlFor="reason">
                <input
                    id="reason"
                    type="text"
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Groceries, Utility Bill"
                    className={FIELD}
                />
            </Field>

            {/* Tag — personal expenses only, and mandatory there */}
            {isPersonal && (
                <Field label="Tag" htmlFor="tag">
                    {showTagSelect ? (
                        <select
                            id="tag"
                            required
                            value={tag}
                            onChange={(e) => {
                                if (e.target.value === NEW_TAG) {
                                    setTag('');
                                    setTagMode('new');
                                } else {
                                    setTag(e.target.value);
                                }
                            }}
                            className={`${FIELD} appearance-none cursor-pointer pr-10 ${tag ? '' : 'text-slate-500'}`}
                            style={chevron(14, 16)}
                        >
                            <option value="" disabled>Select a tag</option>
                            {existingTags.map((t) => (
                                <option key={t} value={t} className="text-slate-100">{t}</option>
                            ))}
                            <option value={NEW_TAG} className="text-slate-100">+ Add new tag…</option>
                        </select>
                    ) : (
                        <>
                            <input
                                id="tag"
                                type="text"
                                required
                                maxLength={MAX_TAG_LENGTH}
                                value={tag}
                                onChange={(e) => {
                                    setTag(e.target.value);
                                    // Commit to free text, so the select does not
                                    // swap in mid-typing when the list reports its
                                    // first tags.
                                    setTagMode('new');
                                }}
                                placeholder="e.g., Food, Transport, Bills"
                                className={FIELD}
                            />
                            {existingTags.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTag('');
                                        setTagMode('select');
                                    }}
                                    className={`${LINK} ml-1 mt-1`}
                                >
                                    Choose an existing tag instead
                                </button>
                            )}
                        </>
                    )}
                </Field>
            )}

            {/* min-w-0 is load-bearing: flex items default to min-width:auto, and
                date/number inputs have an intrinsic width that would otherwise
                overflow 50% and make the two columns unequal. */}
            <div className="flex gap-3 sm:gap-4">
                <Field label="Date" htmlFor="date" className="flex-1 min-w-0">
                    <input
                        id="date"
                        type="date"
                        required
                        value={date}
                        onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                        onChange={(e) => setDate(e.target.value)}
                        className={DATE_FIELD}
                    />
                </Field>

                <Field label="Amount (৳)" htmlFor="amount" className="flex-1 min-w-0">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">৳</span>
                        <input
                            id="amount"
                            type="number"
                            required
                            min="1"
                            step="1"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            className={`${FIELD} pl-8 appearance-none`}
                        />
                    </div>
                </Field>
            </div>
        </FormCard>
    );
}
