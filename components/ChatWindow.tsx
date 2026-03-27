'use client';
import { useEffect, useRef, useState } from 'react';
import { Send, AlertCircle, X, Home, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ChoiceCard } from './ChoiceCard';
import CouncilThinking from './CouncilThinking';
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
    <div className="space-y-5 animate-slide-up">
      {/* Council header */}
      <div className="flex items-center gap-3">
        <div className="text-2xl">🔮</div>
        <div>
          <p className="text-white font-semibold text-sm">The Sage Council</p>
          <p className="text-neutral-500 text-xs">3 distinct perspectives</p>
        </div>
      </div>

      {/* Council note -- collective meta-insight */}
      {response.council_note && (
        <div className="relative rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={12} className="text-neutral-500" />
            <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">
              Council Insight
            </span>
          </div>
          <p className="text-neutral-300 text-sm leading-relaxed italic">
            {response.council_note}
          </p>
        </div>
      )}

      {/* Choice cards */}
      <div className="grid grid-cols-1 gap-4">
        {response.choices?.map((choice, i) => (
          <ChoiceCard key={choice.id || i} choice={choice} index={i} />
        ))}
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
  const router = useRouter();

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

  return (
    <div className="flex flex-col h-full">
      {/* Top bar with home button */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#0f0f0f]">
        <button
          onClick={() => router.push('/')}
          title="Back to Home"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-all text-sm group"
        >
          <Home size={15} className="group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline font-medium">Home</span>
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-neutral-600 text-xs">
          <span className="text-base">🔮</span>
          <span className="hidden sm:inline">Sage Council</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 && !thinking ? (
            <div className="text-center py-16 space-y-3">
              <div className="text-4xl">🔮</div>
              <p className="text-neutral-500 text-sm">
                Bring the Council a decision, a challenge, or a question.
              </p>
              <p className="text-neutral-600 text-xs max-w-xs mx-auto leading-relaxed">
                You will receive 3 deeply reasoned perspectives drawn from 12 distinct thinkers.
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.role === 'user' ? (
                    <UserBubble content={msg.content as string} />
                  ) : (
                    <CouncilBubble response={(msg.content as unknown) as CouncilResponse} />
                  )}
                </div>
              ))}
              {thinking && <CouncilThinking />}
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
            placeholder="Ask the Council anything -- a decision, a problem, a creative challenge..."
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
