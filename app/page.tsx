import { Suspense } from 'react';
import SessionProvider from '@/components/SessionProvider';
import HomeContent from '@/components/HomeContent';
import TodayDate from '@/components/TodayDate';

export const metadata = {
  title: 'Family Expense Tracker',
  description: 'Simple, secure family expense tracking with Google Sheets',
};

// The hero lives here rather than inside HomeContent so it stays in the static
// HTML: HomeContent reads search params, and everything under a Suspense
// boundary bails to the fallback during prerender. It also keeps ~55 lines of
// static markup out of the client bundle.
export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-600/15 blur-[120px]" />
      </div>

      <div className="w-full max-w-4xl mx-auto flex flex-col items-center relative z-10">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-4 sm:mb-6 shadow-xl">
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-3 sm:mb-4">
            Monthly{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-blue-400">
              Expense Tracker
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            Track your monthly expenses in a secure and simple way.
          </p>
          <TodayDate />
        </div>

        <SessionProvider>
          <Suspense fallback={null}>
            <HomeContent />
          </Suspense>
        </SessionProvider>

        {/* Footer info */}
        <p className="mt-12 text-slate-500 text-sm font-medium animate-in fade-in duration-1000 delay-300">
          Copyright @ Rasel Hasan
        </p>
      </div>
    </main>
  );
}
