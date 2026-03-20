'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatWindow } from '@/components/ChatWindow';
import type { Message, CouncilResponse } from '@/types';

interface RawMessage {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: unknown;
  created_at: string;
}

function parseMessages(rawMessages: RawMessage[]): Message[] {
  return rawMessages.map((m) => ({
    ...m,
    content:
      m.role === 'assistant' && typeof m.content === 'object' && m.content !== null
        ? (m.content as CouncilResponse)
        : typeof m.content === 'string'
        ? m.content
        : String(m.content),
  }));
}

export default function ChatPage({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const starterSent = useRef(false);

  // Load existing messages
  useEffect(() => {
    const loadChat = async () => {
      try {
        const res = await fetch(`/api/chats/${params.id}`);
        if (!res.ok) throw new Error('Failed to load chat');
        const { messages: rawMessages } = await res.json();
        setMessages(parseMessages(rawMessages));
      } catch (err) {
        setError('Could not load this conversation.');
      } finally {
        setLoading(false);
      }
    };
    loadChat();
  }, [params.id]);

  // Handle starter message from URL
  useEffect(() => {
    const starter = searchParams.get('starter');
    if (starter && !loading && !starterSent.current && messages.length === 0) {
      starterSent.current = true;
      handleSend(starter);
    }
  }, [loading, messages.length]);

  const handleSend = async (text: string) => {
    if (!text.trim() || thinking) return;

    const optimisticUserMsg: Message = {
      id: `temp-${Date.now()}`,
      chat_id: params.id,
      role: 'user',
      content: text.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setThinking(true);
    setError(null);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: params.id, message: text.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get council response');
      }

      const { userMessage, assistantMessage } = await res.json();

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUserMsg.id),
        {
          ...userMessage,
          content: userMessage.content,
        },
        {
          ...assistantMessage,
          content: assistantMessage.content as CouncilResponse,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMsg.id));
    } finally {
      setThinking(false);
    }
  };

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
