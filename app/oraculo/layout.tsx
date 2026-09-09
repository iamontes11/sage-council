import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { ToastContainer } from '@/components/Toast';

export default async function OraculoLayout({
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
      <Sidebar user={session.user} />
      <main className="h-full flex flex-col overflow-hidden">
        {children}
      </main>
      <ToastContainer />
    </div>
  );
}
