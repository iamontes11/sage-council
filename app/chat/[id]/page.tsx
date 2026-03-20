import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getChatById, getChatMessages } from '@/lib/supabase';
import { ChatPageClient } from '@/components/ChatPageClient';

export default async function ChatPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/');
  }

  const chat = await getChatById(params.id);
  if (!chat || chat.user_email !== session.user.email) {
    redirect('/chat');
  }

  const messages = await getChatMessages(params.id);

  return <ChatPageClient chatId={params.id} initialMessages={messages} />;
}
