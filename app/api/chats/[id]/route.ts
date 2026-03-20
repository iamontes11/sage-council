import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import {
  getChatById,
  getChatMessages,
  archiveChat,
  deleteChat,
  updateChatTitle,
} from '@/lib/supabase';

// GET /api/chats/[id] â–€â–€àŠ‚ get a chat and its messages
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const chat = await getChatById(params.id);
    if (chat.user_id !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const messages = await getChatMessages(params.id);
    return NextResponse.json({ chat, messages });
  } catch (err) {
    console.error('GET /api/chats/[id] error:', err);
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }
}

// PATCH /api/chats/[id] â€” update title or archive
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  try {
    const chat = await getChatById(params.id);
    if (chat.user_id !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (body.archived === true) {
      await archiveChat(params.id);
    }
    if (body.title) {
      await updateChatTitle(params.id, body.title);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/chats/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 });
  }
}

// DELETE /api/chats/[id] â€” permanently delete a chat
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const chat = await getChatById(params.id);
    if (chat.user_id !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteChat(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/chats/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}
