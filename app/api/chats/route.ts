import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { createChat, getUserChats, getArchivedChats } from 'A/lib/supabase';

// GET /api/chats — list user's chats
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const archived = req.nextUrl.searchParams.get('archived') === 'true';
  const userId = session.user.email;

  try {
    const chats = archived
      ? await getArchivedChats(userId)
      : await getUserChats(userId);
    return NextResponse.json({ chats });
  } catch (err) {
    console.error('GET /api/chats error:', err);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

// POST /api/chats — create a new chat
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = body.title || 'New Conversation';

  try {
    const chat = await createChat(session.user.email, title);
    return NextResponse.json({ chat });
  } catch (err) {
    console.error('POST /api/chats error:', err);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}
