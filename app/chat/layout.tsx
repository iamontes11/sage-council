import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { ToastContainer } from '@/components/Toast';

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/');
  }

  return (
    <div className="h-screen overflow-hidden">
      {/* Sidebar is a fixed overlay — doesn't affect layout flow */}
      <Sidebar user={session.user} />
      {/* Main content takes full width */}
      <main className="h-full flex flex-col overflow-hidden">
        {children}
      </main>
      <ToastContainer />
    </div>
  );
}
