import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getChatById,
  getChatMessages,
  archiveChat,
  deleteChat,
  updateChatTitle,
} from '@/lib/supabase';

// GET /api/chats/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const chat = await getChatById(params.id);
  if (!chat || chat.user_email !== session.user.email) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  const messages = await getChatMessages(params.id);
  return NextResponse.json({ chat, messages });
}

// PATCH /api/chats/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const chat = await getChatById(params.id);
  if (!chat || chat.user_email !== session.user.email) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  const { title, archived } = await req.json();

  if (archived !== undefined) {
    await archiveChat(params.id, archived);
  }
  if (title) {
    await updateChatTitle(params.id, title);
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/chats/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const chat = await getChatById(params.id);
  if (!chat || chat.user_email !== session.user.email) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  await deleteChat(params.id);
  return NextResponse.json({ success: true });
}
