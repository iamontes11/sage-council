import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getChatById, getChatMessages, saveMessage, updateChatTitle } from '@/lib/supabase';
import { generateCouncilResponse, generateChatTitle } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { chatId, content } = await req.json();
  if (!chatId || !content) {
    return NextResponse.json({ error: 'Missing chatId or content' }, { status: 400 });
  }

  const chat = await getChatById(chatId);
  if (!chat || chat.user_email !== session.user.email) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  // Save user message
  const userMessage = await saveMessage({
    chat_id: chatId,
    role: 'user',
    content,
  });

  // Get conversation history
  const history = await getChatMessages(chatId);

  // Generate council response
  const councilResponse = await generateCouncilResponse(content, history);

  // Save assistant message
  const assistantMessage = await saveMessage({
    chat_id: chatId,
    role: 'assistant',
    content: JSON.stringify(councilResponse),
  });

  // Generate title if this is the first exchange
  if (history.length <= 2) {
    const title = await generateChatTitle(content);
    await updateChatTitle(chatId, title);
  }

  return NextResponse.json({
    userMessage,
    assistantMessage,
    councilResponse,
  });
}
