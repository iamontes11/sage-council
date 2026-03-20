import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createChat, getUserChats, getArchivedChats } from '@/lib/supabase';

// GET /api/chats - list user's chats
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const archived = searchParams.get('archived') === 'true';

  const chats = archived
    ? await getArchivedChats(session.user.email)
    : await getUserChats(session.user.email);

  return NextResponse.json({ chats });
}

// POST /api/chats - create new chat
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title } = await req.json();

  const chat = await createChat({
    user_email: session.user.email,
    title: title || 'New Conversation',
  });

  return NextResponse.json({ chat });
}
