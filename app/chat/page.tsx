'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';

export default function NewChatPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  // Track visual viewport to lift input above keyboard on mobile
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      // offset = amount the keyboard has pushed the viewport up
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOffset(Math.max(0, offset));
    };
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nueva consulta' }),
      });
      const { chat } = await res.json();
      router.push(`/chat/${chat.id}?starter=${encodeURIComponent(input.trim())}`);
    } catch {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-4 pt-12 w-full relative overflow-hidden"
      style={{ paddingBottom: `${Math.max(24, keyboardOffset + 16)}px` }}
    >

      {/* Top: crystal ball + title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center gap-5 z-10"
      >
        {/* Crystal ball */}
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.08, 0.18] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute rounded-full bg-violet-500 w-28 h-28 blur-2xl pointer-events-none"
          />
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#2a1a4e] via-[#1e1040] to-[#0d0820] border border-violet-400/30 shadow-[0_0_50px_rgba(139,92,246,0.30),inset_0_0_30px_rgba(109,40,217,0.18)]" />
            <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-violet-900/20 via-transparent to-indigo-950/40" />
            <div className="absolute top-[14%] left-[22%] w-[38%] h-[28%] rounded-full bg-white/[0.08] blur-[6px]" />
            <div className="absolute top-[20%] left-[28%] w-[16%] h-[14%] rounded-full bg-white/[0.55] blur-[1.5px]" />
            <div className="absolute top-[28%] left-[35%] w-[7%] h-[7%] rounded-full bg-white/90" />
            <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 w-[55%] h-[20%] rounded-full bg-violet-600/20 blur-md" />
            <div className="absolute inset-0 rounded-full shadow-[inset_0_-4px_12px_rgba(139,92,246,0.20)]" />
          </div>
        </div>

        {/* Text with solid dark backing for contrast against animated bg */}
        <div className="text-center space-y-1.5 px-5 py-3 rounded-2xl bg-black/45">
          <h1 className="text-xl font-semibold text-white tracking-wide">
            El Consejo te escucha
          </h1>
          <p className="text-neutral-300 text-sm max-w-xs mx-auto leading-relaxed">
            Plantea tu pregunta, decisión o problema.
          </p>
        </div>
      </motion.div>

      {/* Bottom: input box — lifts above keyboard via paddingBottom on parent */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.55, ease: 'easeOut' }}
        className="w-full max-w-2xl z-10"
      >
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-3 bg-[#18181b] border border-white/[0.12] focus-within:border-violet-500/45 rounded-2xl px-4 py-3 transition-all duration-200 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu consulta al Consejo..."
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent text-neutral-100 placeholder-neutral-500 text-sm resize-none outline-none leading-relaxed"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-9 h-9 flex items-center justify-center bg-violet-600 hover:bg-violet-500 disabled:opacity-25 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : (
              <Send size={15} />
            )}
          </button>
        </form>
        <p className="text-center text-[11px] text-neutral-600 mt-2.5">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </motion.div>

    </div>
  );
}
