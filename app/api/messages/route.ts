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

  // Get conversation history BEFORE saving the new user message
  // This avoids sending the current message twice to the LLM
  const previousHistory = await getChatMessages(chatId);

  // Map history to clean text for the AI
  // (DB stores assistant content as JSON strings — extract readable text)
  const historyMessages = previousHistory.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
  }));

  // Save user message
  const userMessage = await saveMessage({
    chat_id: chatId,
    role: 'user',
    content,
  });

  // Generate council response with clean history (current message NOT in history)
  const councilResponse = await generateCouncilResponse(content, historyMessages);

  // Save assistant message
  const assistantMessage = await saveMessage({
    chat_id: chatId,
    role: 'assistant',
    content: JSON.stringify(councilResponse),
  });

  // Generate title on first exchange
  if (previousHistory.length === 0) {
    const title = await generateChatTitle(content);
    await updateChatTitle(chatId, title);
  }

  return NextResponse.json({
    userMessage,
    assistantMessage,
    councilResponse,
  });
}
