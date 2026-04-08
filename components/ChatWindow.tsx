'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { Send, AlertCircle, X, Home, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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

/* ── Burbuja del usuario ─────────────────────────────────────── */
const UserBubble = memo(function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] bg-[#1e1b2e] border border-violet-500/20 text-neutral-100 rounded-2xl rounded-tr-sm px-5 py-3.5 text-sm leading-relaxed shadow-lg">
        {content}
      </div>
    </div>
  );
});

/* ── Respuesta del Consejo ───────────────────────────────────── */
const CouncilBubble = memo(function CouncilBubble({ response }: { response: CouncilResponse }) {
  const answerText = response.answer ||
    (response.council_note ? response.council_note + (response.choices?.[0]?.perspective ? '\n\n' + response.choices[0].perspective : '') : '');
  const firstStep = response.first_step || response.choices?.[0]?.first_step || response.choices?.[0]?.actionStep;

  const paragraphs = answerText
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex gap-3"
    >
      {/* Avatar */}
      <div className="shrink-0 mt-0.5 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-900/50 to-indigo-950/70 border border-violet-500/20 flex items-center justify-center text-base">
        🔮
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Answer bubble — no backdrop-blur (GPU expensive) */}
        <div className="bg-[#13121a] border border-white/[0.08] rounded-2xl rounded-tl-sm px-5 py-4 space-y-3 shadow-lg">
          {paragraphs.map((para, i) => (
            <p key={i} className="text-neutral-200 text-sm leading-[1.75]">{para}</p>
          ))}
        </div>

        {/* First step */}
        {firstStep && (
          <div className="mt-3 flex gap-3 p-3.5 rounded-xl bg-[#1a1128] border border-violet-500/20 shadow-md">
            <Zap size={14} className="shrink-0 mt-0.5 text-violet-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400/70 mb-1">
                Próximo paso
              </p>
              <p className="text-sm text-neutral-300 leading-relaxed">{firstStep}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

/* ── Esqueleto de carga ──────────────────────────────────────── */
const ThinkingSkeleton = memo(function ThinkingSkeleton() {
  return (
    <div className="flex gap-3 mt-4">
      <div className="shrink-0 w-8 h-8 rounded-xl bg-white/5 animate-pulse flex items-center justify-center text-base">
        🔮
      </div>
      <div className="flex-1 space-y-2.5 pt-1">
        <div className="skeleton h-3.5 w-3/4 rounded" />
        <div className="skeleton h-3.5 w-full rounded" />
        <div className="skeleton h-3.5 w-5/6 rounded" />
        <div className="skeleton h-3.5 w-2/3 rounded mt-4" />
        <div className="skeleton h-3.5 w-full rounded" />
      </div>
    </div>
  );
});

/* ── Helper ──────────────────────────────────────────────────── */
function getMessageContent(msg: Message): string | CouncilResponse {
  if (msg.role === 'user') return msg.content as string;
  if (typeof msg.content === 'string') {
    try { return JSON.parse(msg.content) as CouncilResponse; }
    catch { return { answer: msg.content }; }
  }
  return msg.content as CouncilResponse;
}

/* ── ChatWindow principal ────────────────────────────────────── */
export function ChatWindow({
  messages, loading, thinking, error, onSend, onClearError,
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
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || thinking) return;
    onSend(input);
    setInput('');
  }, [input, thinking, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Barra superior — sin backdrop-blur pesado ────────── */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] bg-[#0d0d0f]/95">
        <button
          onClick={() => router.push('/chat')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
        >
          <Home size={15} />
          <span className="hidden sm:inline font-medium">Inicio</span>
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-neutral-500 text-xs">
          <div className="w-6 h-6 rounded-lg bg-violet-900/30 border border-violet-500/15 flex items-center justify-center">
            <span className="text-sm">🔮</span>
          </div>
          <span className="hidden sm:inline font-medium">El Consejo</span>
        </div>
      </div>

      {/* ── Mensajes ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
          {messages.length === 0 && !thinking ? (
            <div className="text-center py-20 space-y-3">
              <div className="text-4xl mb-2">🔮</div>
              <p className="text-neutral-400 text-sm">Haz tu consulta al Consejo.</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const content = getMessageContent(msg);
                return (
                  <div key={msg.id}>
                    {msg.role === 'user'
                      ? <UserBubble content={content as string} />
                      : <CouncilBubble response={content as CouncilResponse} />
                    }
                  </div>
                );
              })}
              <AnimatePresence>
                {thinking && (
                  <motion.div
                    key="thinking"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CouncilThinking />
                    <ThinkingSkeleton />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-2"
          >
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={onClearError} className="shrink-0 p-1 hover:bg-red-500/10 rounded-lg transition-colors">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input — sin backdrop-blur ─────────────────────────── */}
      <div className="border-t border-white/[0.06] bg-[#0d0d0f]/95 p-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto flex items-end gap-3 bg-[#18181b] border border-white/[0.10] focus-within:border-violet-500/35 rounded-2xl px-4 py-3 transition-colors duration-150"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu consulta..."
            rows={1}
            className="flex-1 bg-transparent text-neutral-100 placeholder-neutral-600 text-sm resize-none outline-none leading-relaxed"
            disabled={thinking}
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className="w-9 h-9 flex items-center justify-center bg-violet-600 hover:bg-violet-500 disabled:opacity-25 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
