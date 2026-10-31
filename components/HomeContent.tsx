"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";
import EmergencyForm from "@/components/EmergencyForm";
import EmergencyList from "@/components/EmergencyList";
import SignIn from "@/components/SignIn";
import { BOOKS, useFilters, type Book } from "@/lib/useFilters";
import { Loading } from "@/components/ui";

export default function HomeContent() {
  const { status } = useSession();
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const { book, setBook } = useFilters();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // Tag vocabulary reported by ExpenseList, handed to ExpenseForm so the two
  // share a single fetch of the sheet.
  const [tags, setTags] = useState<string[]>([]);

  // Stable identity: ExpenseList reports tags from an effect keyed on this.
  const handleTagsChange = useCallback((next: string[]) => {
    setTags(next);
  }, []);

  const handleExpenseAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // `key={book}` below remounts the pair, which covers the list's own state —
  // but `tags` lives up here, so it still has to be cleared by hand or the new
  // book shows the previous book's tag select for one round trip.
  const selectBook = (next: Book) => {
    setTags([]);
    setBook(next);
  };

  return (
    <div className="w-full">
      {/* Cashbook Switcher */}
      {isAuthenticated && (
        <div className="flex items-center gap-1 mb-6 w-full max-w-3xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-1 animate-in fade-in duration-700 delay-75">
          {BOOKS.map((b) => (
            <button
              key={b}
              onClick={() => selectBook(b)}
              className={`flex-1 py-2 px-3 sm:px-5 rounded-xl text-sm font-semibold transition-all capitalize cursor-pointer
                                    ${
                                      book === b
                                        ? "bg-linear-to-r from-blue-600 to-emerald-600 text-white shadow-md"
                                        : "text-slate-400 hover:text-white"
                                    }`}
            >
              {b}
            </button>
          ))}
        </div>
      )}

      {/* Content: Loading / Login / Form */}
      <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
        {isLoading ? (
          <Loading label="Loading..." />
        ) : isAuthenticated ? (
          <div key={book}>
            {book === "emergency" ? (
              <>
                <EmergencyForm onEntryAdded={handleExpenseAdded} />
                <EmergencyList refreshTrigger={refreshTrigger} />
              </>
            ) : (
              <>
                <ExpenseForm
                  onExpenseAdded={handleExpenseAdded}
                  cashbook={book}
                  existingTags={tags}
                />
                <ExpenseList
                  refreshTrigger={refreshTrigger}
                  cashbook={book}
                  onTagsChange={handleTagsChange}
                />
              </>
            )}
          </div>
        ) : (
          <SignIn />
        )}
      </div>
    </div>
  );
}
