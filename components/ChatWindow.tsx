'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, AlertCircle, X } from 'lucide-react';
import { ChoiceCard } from './ChoiceCard';
import { CREATORS } from '@/lib/creators';
import type { Message, CouncilResponse } from '@/types';

interface ChatWindowProps {
  messages: Message[];
  loading: boolean;
  thinking: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onClearError: () => void;
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] bg-sage-600/20 border border-sage-600/30 text-neutral-100 rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
        {content}
      </div>
    </div>
  );
}

function CouncilBubble({ response }: { response: CouncilResponse }) {
  return (
    <div className="space-y-4 animate-slide-up">
      {/* Council header */}
      <div className="flex items-center gap-3">
        <div className="text-2xl">🔮</div>
        <div>
          <p className="text-white font-semibold text-sm">The Sage Council</p>
          <p className="text-neutral-500 text-xs">3 distinct perspectives</p>
        </div>
      </div>

      {/* Council note */}
      {response.council_note && (
        <p className="text-xs text-neutral-500 italic border-l-2 border-white/10 pl-3">
          {response.council_note}
        </p>
      )}

      {/* Choice cards */}
      <div className="grid grid-cols-1 gap-3">
        {response.choices?.map((choice, i) => (
          <ChoiceCard key={choice.id || i} choice={choice} index={i} />
        ))}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="text-2xl">🔮</div>
      <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-sage-400 rounded-full typing-dot"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          <span className="text-xs text-neutral-500 ml-1">Council is deliberating...</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CREATORS.map((c) => (
            <span key={c.id} className="text-xs text-neutral-600">
              {c.emoji}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatWindow({
  messages,
  loading,
  thinking,
  error,
  onSend,
  onClearError,
}: ChatWindowProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || thinking) return;
    onSend(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sage-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 && !thinking ? (
            <div className="text-center py-12 text-neutral-600">
              <p>Ask the Council anything...</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.role === 'user' ? (
                    <UserBubble content={msg.content as string} />
                  ) : (
                    <CouncilBubble response={msg.content as CouncilResponse} />
                  )}
                </div>
              ))}
              {thinking && <ThinkingIndicator />}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={onClearError}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-white/10 bg-[#0f0f0f] p-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-end gap-3 bg-white/5 border border-white/10 focus-within:border-sage-600/50 rounded-2xl px-4 py-3 transition-colors"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the Council anything — a decision, a problem, a creative challenge..."
            rows={1}
            className="flex-1 bg-transparent text-neutral-100 placeholder-neutral-600 text-sm resize-none outline-none leading-relaxed"
            disabled={thinking}
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className="shrink-0 w-9 h-9 flex items-center justify-center bg-sage-600 hover:bg-sage-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          >
            <Send size={15} />
          </button>
        </form>
        <p className="text-center text-xs text-neutral-700 mt-2">
          The Council draws from your favorite thinkers' real videos and ideas.
        </p>
      </div>
    </div>
  );
}
