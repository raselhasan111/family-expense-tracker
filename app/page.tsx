import SessionProvider from '@/components/SessionProvider';
import HomeContent from '@/components/HomeContent';

export const metadata = {
  title: 'Family Expense Tracker',
  description: 'Simple, secure family expense tracking with Google Sheets',
};

export default function Home() {
  return (
    <SessionProvider>
      <HomeContent />
    </SessionProvider>
  );
}
