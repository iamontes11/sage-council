'use client';

import { useState } from 'react';
import { ChatWindow } from '@/components/ChatWindow';
import type { Message } from '@/types';

interface ChatPageClientProps {
  chatId: string;
  initialMessages: Message[];
}

export function ChatPageClient({ chatId, initialMessages }: ChatPageClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(input: string) {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      chat_id: chatId,
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
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
      const assistantMsg: Message = {
        id: data.id || (Date.now() + 1).toString(),
        chat_id: chatId,
        role: 'assistant',
        content: data.content,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
      setThinking(false);
    }
  }

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
