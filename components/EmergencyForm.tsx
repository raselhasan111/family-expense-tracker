'use client';

import { useState } from 'react';
import { FIELD, DATE_FIELD, Field, FormCard, chevron } from '@/components/ui';

interface EmergencyFormProps {
    onEntryAdded?: () => void;
}

export default function EmergencyForm({ onEntryAdded }: EmergencyFormProps) {
    const todayISO = new Date().toISOString().split('T')[0];
    const [type, setType] = useState<'cashin' | 'cashout'>('cashout');
    const [reason, setReason] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState<string>(todayISO);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMSG, setErrorMSG] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        setErrorMSG('');

        try {
            const [year, month, day] = date.split('-').map(Number);
            const formattedDate = `${month}/${day}/${year}`;

            // Identity is derived server-side from the session; not sent here.
            const payload = {
                reason,
                amount: Number(amount),
                date: formattedDate,
                type,
            };

            const res = await fetch('/api/emergency', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to submit entry');

            setSuccess(true);
            setReason('');
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            onEntryAdded?.();

            setTimeout(() => setSuccess(false), 5000);
        } catch (error: any) {
            setErrorMSG(error.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormCard
            title="Record Emergency Fund Entry"
            loading={loading}
            success={success ? 'Entry saved successfully!' : ''}
            error={errorMSG}
            errorTitle="Error saving entry"
            submitLabel="Submit Entry"
            onSubmit={handleSubmit}
        >
            <Field label="Type" htmlFor="type">
                <select
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value as 'cashin' | 'cashout')}
                    className={`${FIELD} appearance-none cursor-pointer pr-10`}
                    style={chevron(14, 16)}
                >
                    <option value="cashout">Expense</option>
                    <option value="cashin">Savings</option>
                </select>
            </Field>

            <Field label="Reason" htmlFor="reason">
                <input
                    id="reason"
                    type="text"
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={type === 'cashin' ? 'e.g., Monthly savings, Bonus deposit' : 'e.g., Medical emergency, Home repair'}
                    className={FIELD}
                />
            </Field>

            {/* Same two-up row as the expense form, so all three books match. */}
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
