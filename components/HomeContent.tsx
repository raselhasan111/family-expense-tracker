"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";
import EmergencyForm from "@/components/EmergencyForm";
import EmergencyList from "@/components/EmergencyList";
import TodayDate from "@/components/TodayDate";
import GoogleSignIn from "@/components/GoogleSignIn";

type Cashbook = "family" | "personal" | "emergency";

export default function HomeContent() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [cashbook, setCashbook] = useState<Cashbook>("family");

  const handleExpenseAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleCashbookChange = (book: Cashbook) => {
    setCashbook(book);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-600/15 blur-[120px]" />
      </div>

      <div className="w-full max-w-4xl mx-auto flex flex-col items-center relative z-10">
        {/* Header Section */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-6 shadow-xl">
            <svg
              className="w-8 h-8 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0-2.08-.402-2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4">
            Monthly{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-blue-400">
              Expense Tracker
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            Track your monthly expenses in a secure and simple way.
          </p>
          <TodayDate />
        </div>

        {/* Cashbook Switcher */}
        {isAuthenticated && (
          <div className="flex items-center gap-1 mb-6 w-full max-w-3xl bg-white/5 border border-white/10 rounded-2xl p-1 animate-in fade-in duration-700 delay-75">
            {(["family", "personal", "emergency"] as Cashbook[]).map((book) => (
              <button
                key={book}
                onClick={() => handleCashbookChange(book)}
                className={`flex-1 py-2 px-5 rounded-xl text-sm font-semibold transition-all capitalize cursor-pointer
                                    ${
                                      cashbook === book
                                        ? "bg-linear-to-r from-blue-600 to-emerald-600 text-white shadow-md"
                                        : "text-slate-400 hover:text-white"
                                    }`}
              >
                {book === "family"
                  ? "Family"
                  : book === "personal"
                    ? "Personal"
                    : "Emergency"}
              </button>
            ))}
          </div>
        )}

        {/* Content: Loading / Login / Form */}
        <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
          {isLoading ? (
            <div className="w-full max-w-md mx-auto flex flex-col items-center gap-3 py-12">
              <svg
                className="animate-spin h-8 w-8 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="text-slate-400 text-sm">Loading...</p>
            </div>
          ) : isAuthenticated ? (
            <>
              {cashbook === "emergency" ? (
                <>
                  <EmergencyForm onEntryAdded={handleExpenseAdded} />
                  <EmergencyList refreshTrigger={refreshTrigger} />
                </>
              ) : (
                <>
                  <ExpenseForm
                    onExpenseAdded={handleExpenseAdded}
                    cashbook={cashbook}
                  />
                  <ExpenseList
                    refreshTrigger={refreshTrigger}
                    cashbook={cashbook}
                  />
                </>
              )}
            </>
          ) : (
            <GoogleSignIn />
          )}
        </div>

        {/* Footer info */}
        <p className="mt-12 text-slate-500 text-sm font-medium animate-in fade-in duration-1000 delay-300">
          Copyright @ Rasel Hasan
        </p>
      </div>
    </main>
  );
}
