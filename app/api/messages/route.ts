import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getChatById, getChatMessages, saveMessage, updateChatTitle } from 'A/lib/supabase';
import { generateCouncilResponse, generateChatTitle } from '@/lib/claude';

// POST /api/messages — send a message and get council response
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { chatId: string; message: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { chatId, message } = body;
  if (!chatId || !message?.trim()) {
    return NextResponse.json({ error: 'chatId and message are required' }, { status: 400 });
  }

  // Verify ownership
  try {
    const chat = await getChatById(chatId);
    if (chat.user_id !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  try {
    // 1. Save user message
    const userMsg = await saveMessage(chatId, 'user', message.trim());

    // 2. Get chat history for context
    const allMessages = await getChatMessages(chatId);
    const history = allMessages
      .filter((m) => m.id !== userMsg.id)
      .slice(-10)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      }));

    // 3. Generate council response
    const councilResponse = await generateCouncilResponse(message.trim(), history);

    // 4. Save assistant message
    const assistantMsg = await saveMessage(chatId, 'assistant', councilResponse);

    // 5. Auto-generate title if this is the first message
    const messageCount = allMessages.length;
    if (messageCount <= 1) {
      const title = await generateChatTitle(message.trim());
      await updateChatTitle(chatId, title);
    }

    return NextResponse.json({
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      councilResponse,
    });
  } catch (err) {
    console.error('POST /api/messages error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Council failed to respond: ${errorMessage}` },
      { status: 500 },
    );
  }
}
