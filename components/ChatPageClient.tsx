'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatWindow } from '@/components/ChatWindow';
import type { Message, CouncilResponse } from '@/types';

interface ChatPageClientProps {
  chatId: string;
  initialMessages: Message[];
  starter?: string;
}

function parseMessages(msgs: Message[]): Message[] {
  return msgs.map((msg) => {
    if (msg.role === 'assistant' && typeof msg.content === 'string') {
      try {
        return { ...msg, content: JSON.parse(msg.content) as CouncilResponse };
      } catch {
        return msg;
      }
    }
    return msg;
  });
}

export function ChatPageClient({ chatId, initialMessages, starter }: ChatPageClientProps) {
  const [messages, setMessages] = useState<Message[]>(parseMessages(initialMessages));
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const starterSent = useRef(false);

  async function handleSend(input: string) {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      chat_id: chatId,
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setThinking(true);
    setError(null);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, content: input.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to get response');
      }

      const data = await res.json();
      // API returns { userMessage, assistantMessage, councilResponse }
      const councilResponse = data.councilResponse as CouncilResponse;

      const assistantMsg: Message = {
        id: data.assistantMessage?.id || (Date.now() + 1).toString(),
        chat_id: chatId,
        role: 'assistant',
        content: councilResponse,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
      setThinking(false);
    }
  }

  // Auto-send starter message from prompt shortcut
  useEffect(() => {
    if (starter && !starterSent.current) {
      starterSent.current = true;
      handleSend(starter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ChatWindow
      messages={messages}
      loading={loading}
      thinking={thinking}
      error={error}
      onSend={handleSend}
      onClearError={() => setError(null)}
    />
  );
         }
