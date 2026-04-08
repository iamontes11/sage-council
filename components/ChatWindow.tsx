'use client';

import { useEffect, useRef, useState } from 'react';
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
function UserBubble({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="flex justify-end"
    >
      <div className="max-w-[78%] bg-[#1e1b2e]/90 backdrop-blur-sm border border-violet-500/20 text-neutral-100 rounded-2xl rounded-tr-sm px-5 py-3.5 text-sm leading-relaxed shadow-lg">
        {content}
      </div>
    </motion.div>
  );
}

/* ── Respuesta del Consejo ───────────────────────────────────── */
function CouncilBubble({ response }: { response: CouncilResponse }) {
  // Support both new format (answer) and legacy format (council_note + choices)
  const answerText = response.answer ||
    (response.council_note ? response.council_note + (response.choices?.[0]?.perspective ? '\n\n' + response.choices[0].perspective : '') : '');
  const firstStep = response.first_step || response.choices?.[0]?.first_step || response.choices?.[0]?.actionStep;

  const paragraphs = answerText
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="flex gap-3"
    >
      {/* Avatar */}
      <div className="shrink-0 mt-0.5 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-900/50 to-indigo-950/70 border border-violet-500/20 flex items-center justify-center text-base">
        🔮
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Answer bubble */}
        <div className="bg-[#13121a]/85 backdrop-blur-sm border border-white/[0.08] rounded-2xl rounded-tl-sm px-5 py-4 space-y-3 shadow-lg">
          {paragraphs.map((para, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.06, duration: 0.3 }}
              className="text-neutral-200 text-sm leading-[1.75]"
            >
              {para}
            </motion.p>
          ))}
        </div>

        {/* First step */}
        {firstStep && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + paragraphs.length * 0.06, duration: 0.3 }}
            className="mt-3 flex gap-3 p-3.5 rounded-xl bg-[#1a1128]/80 backdrop-blur-sm border border-violet-500/20 shadow-md"
          >
            <Zap size={14} className="shrink-0 mt-0.5 text-violet-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400/70 mb-1">
                Próximo paso
              </p>
              <p className="text-sm text-neutral-300 leading-relaxed">{firstStep}</p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Esqueleto de carga ──────────────────────────────────────── */
function ThinkingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 mt-4"
    >
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
    </motion.div>
  );
}

/* ── Helper: extract readable content from a message ─────────── */
function getMessageContent(msg: Message): string | CouncilResponse {
  if (msg.role === 'user') return msg.content as string;
  if (typeof msg.content === 'string') {
    try {
      return JSON.parse(msg.content) as CouncilResponse;
    } catch {
      return { answer: msg.content };
    }
  }
  return msg.content as CouncilResponse;
}

/* ── ChatWindow principal ────────────────────────────────────── */
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
      {/* ── Barra superior ───────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] bg-[#0d0d0f]/90 backdrop-blur-xl">
        <button
          onClick={() => router.push('/chat')}
          title="Nueva consulta"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-all text-sm group"
        >
          <Home size={15} className="group-hover:scale-110 transition-transform" />
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
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center py-20 space-y-3"
            >
              <div className="text-4xl mb-2">🔮</div>
              <p className="text-neutral-400 text-sm">
                Haz tu consulta al Consejo.
              </p>
            </motion.div>
          ) : (
            <>
              {messages.map((msg) => {
                const content = getMessageContent(msg);
                return (
                  <div key={msg.id}>
                    {msg.role === 'user' ? (
                      <UserBubble content={content as string} />
                    ) : (
                      <CouncilBubble response={content as CouncilResponse} />
                    )}
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

      {/* ── Banner de error ───────────────────────────────────── */}
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
              <button
                onClick={onClearError}
                className="shrink-0 p-1 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input ────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.06] bg-[#0d0d0f]/90 backdrop-blur-xl p-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto flex items-end gap-3 bg-[#18181b]/80 backdrop-blur-sm border border-white/[0.10] focus-within:border-violet-500/35 rounded-2xl px-4 py-3 transition-all duration-200"
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
          <motion.button
            type="submit"
            disabled={!input.trim() || thinking}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 flex items-center justify-center bg-violet-600 hover:bg-violet-500 disabled:opacity-25 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
          >
            <Send size={15} />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
