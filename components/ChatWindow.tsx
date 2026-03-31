'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, AlertCircle, X, Home, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChoiceCard } from './ChoiceCard';
import CouncilThinking from './CouncilThinking';
import { toast } from './Toast';
import type { Message, CouncilResponse } from '@/types';

interface ChatWindowProps {
  messages: Message[];
  loading: boolean;
  thinking: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onClearError: () => void;
}

/* ââ Burbuja del usuario âââââââââââââââââââââââââââ */
function UserBubble({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="flex justify-end"
    >
      <div className="max-w-[75%] bg-sage-600/20 border border-sage-600/30 text-neutral-100 rounded-2xl rounded-tr-sm px-5 py-3.5 text-sm leading-relaxed shadow-sm">
        {content}
      </div>
    </motion.div>
  );
}

/* ââ Respuesta del Consejo âââââââââââââââââââââââââ */
function CouncilBubble({ response }: { response: CouncilResponse }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-5"
    >
      {/* Encabezado del Consejo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sage-600/20 to-sage-600/5 border border-sage-600/20 flex items-center justify-center text-xl">
          ð®
        </div>
        <div>
          <p className="text-white font-semibold text-sm">El Consejo Sabio</p>
          <p className="text-neutral-500 text-xs">3 perspectivas distintas</p>
        </div>
      </div>

      {/* Nota del Consejo */}
      {response.council_note && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="relative rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent px-5 py-4 glass"
        >
          <div className="flex items-center gap-2 mb-2.5">
            <Sparkles size={12} className="text-sage-400/60" />
            <span className="text-xs text-sage-400/60 uppercase tracking-wider font-semibold">
              VisiÃ³n del Consejo
            </span>
          </div>
          <p className="text-neutral-300 text-sm leading-relaxed italic">
            {response.council_note}
          </p>
        </motion.div>
      )}

      {/* Tarjetas de opciones con escalonado */}
      <div className="grid grid-cols-1 gap-4">
        {response.choices?.map((choice, i) => (
          <motion.div
            key={choice.id || i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1, duration: 0.3 }}
          >
            <ChoiceCard choice={choice} index={i} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ââ Esqueleto de carga ââââââââââââââââââââââââââââ */
function ThinkingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 mt-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse flex items-center justify-center text-xl">
          ð®
        </div>
        <div className="space-y-1.5">
          <div className="skeleton h-3.5 w-28 rounded" />
          <div className="skeleton h-2.5 w-20 rounded" />
        </div>
      </div>
      <div className="skeleton h-24 w-full rounded-xl" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="skeleton h-32 w-full rounded-xl"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ââ ChatWindow principal ââââââââââââââââââââââââââ */
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

  const charCount = input.length;

  return (
    <div className="flex flex-col h-full">
      {/* ââ Barra superior ââââââââââââââââââââââââ */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] bg-[#0f0f0f]/80 backdrop-blur-md">
        <button
          onClick={() => router.push('/')}
          data-tooltip="Ir al inicio"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-all text-sm group"
        >
          <Home size={15} className="group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline font-medium">Inicio</span>
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2.5 text-neutral-500 text-xs">
          <div className="w-6 h-6 rounded-lg bg-sage-600/10 flex items-center justify-center">
            <span className="text-sm">ð®</span>
          </div>
          <span className="hidden sm:inline font-medium">Sage Council</span>
        </div>
      </div>

      {/* ââ Mensajes âââââââââââââââââââââââââââââââ */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-8 space-y-8">
          {messages.length === 0 && !thinking ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center py-20 space-y-4"
            >
              <div className="text-5xl mb-2">ð®</div>
              <p className="text-neutral-400 text-sm font-medium">
                Trae al Consejo una decisiÃ³n, un reto o una pregunta.
              </p>
              <p className="text-neutral-600 text-xs max-w-sm mx-auto leading-relaxed">
                RecibirÃ¡s 3 perspectivas profundamente razonadas de 12 pensadores distintos.
              </p>
            </motion.div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.role === 'user' ? (
                    <UserBubble content={msg.content as string} />
                  ) : (
                    <CouncilBubble
                      response={(msg.content as unknown) as CouncilResponse}
                    />
                  )}
                </div>
              ))}
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

      {/* ââ Banner de error ââââââââââââââââââââââââ */}
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

      {/* ââ Barra de entrada ââââââââââââââââââââââ */}
      <div className="border-t border-white/[0.06] bg-[#0f0f0f]/80 backdrop-blur-md p-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-end gap-3 bg-white/[0.04] border border-white/[0.08] focus-within:border-sage-600/40 focus-within:bg-white/[0.06] rounded-2xl px-4 py-3 transition-all duration-200"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="PregÃºntale al Consejo lo que quieras..."
            rows={1}
            className="flex-1 bg-transparent text-neutral-100 placeholder-neutral-600 text-sm resize-none outline-none leading-relaxed"
            disabled={thinking}
          />
          <div className="flex items-center gap-2 shrink-0">
            {charCount > 0 && (
              <span className="text-[10px] text-neutral-600 tabular-nums">
                {charCount}
              </span>
            )}
            <motion.button
              type="submit"
              disabled={!input.trim() || thinking}
              whileTap={{ scale: 0.9 }}
              className="w-9 h-9 flex items-center justify-center bg-sage-600 hover:bg-sage-500 disabled:opacity-25 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              <Send size={15} />
            </motion.button>
          </div>
        </form>
        <p className="text-center text-[11px] text-neutral-700 mt-2.5">
          El Consejo se nutre de videos e ideas reales de tus pensadores favoritos.
        </p>
      </div>
    </div>
  );
}
