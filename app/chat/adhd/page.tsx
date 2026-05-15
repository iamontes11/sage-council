import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ADHDSequenceHelper } from '@/components/ADHDSequenceHelper';

export default async function ADHDPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/');
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <ADHDSequenceHelper />
    </div>
  );
}
