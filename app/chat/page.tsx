'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function NewChatPage() {
  const router = useRouter();

  const handleStart = async () => {
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nueva consulta' }),
    });
    const { chat } = await res.json();
    router.push(`/chat/${chat.id}`);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-6 py-16 w-full relative overflow-hidden">

      {/* Top: title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center space-y-2 z-10"
      >
        <h1 className="text-2xl font-semibold text-white/90 tracking-wide">
          El Consejo te escucha
        </h1>
        <p className="text-neutral-500 text-sm max-w-sm mx-auto leading-relaxed">
          Plantea tu pregunta, decisión o problema.
        </p>
      </motion.div>

      {/* Bottom: crystal ball */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.7, ease: 'easeOut' }}
        className="flex flex-col items-center gap-4 z-10 mb-4"
      >
        <motion.button
          onClick={handleStart}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="group relative flex flex-col items-center gap-3 focus:outline-none"
        >
          {/* Glow pulse ring */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.08, 0.15] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute rounded-full bg-violet-500 w-28 h-28 blur-2xl pointer-events-none"
          />

          {/* Ball */}
          <div className="relative w-20 h-20">
            {/* Base sphere */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#2a1a4e] via-[#1e1040] to-[#0d0820] border border-violet-400/15 shadow-[0_0_40px_rgba(139,92,246,0.18),inset_0_0_30px_rgba(109,40,217,0.12)] group-hover:shadow-[0_0_60px_rgba(139,92,246,0.32),inset_0_0_30px_rgba(109,40,217,0.18)] transition-all duration-700" />

            {/* Inner depth layer */}
            <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-violet-900/20 via-transparent to-indigo-950/40" />

            {/* Primary highlight — soft */}
            <div className="absolute top-[14%] left-[22%] w-[38%] h-[28%] rounded-full bg-white/[0.08] blur-[6px]" />

            {/* Sharp specular dot */}
            <div className="absolute top-[20%] left-[28%] w-[16%] h-[14%] rounded-full bg-white/[0.55] blur-[1.5px]" />

            {/* Secondary micro sparkle */}
            <div className="absolute top-[28%] left-[35%] w-[7%] h-[7%] rounded-full bg-white/90" />

            {/* Bottom inner glow */}
            <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 w-[55%] h-[20%] rounded-full bg-violet-600/15 blur-md" />

            {/* Rim light */}
            <div className="absolute inset-0 rounded-full shadow-[inset_0_-4px_12px_rgba(139,92,246,0.15)]" />
          </div>

          {/* Label */}
          <span className="text-[13px] text-neutral-400 font-medium tracking-widest uppercase group-hover:text-white/80 transition-colors duration-300">
            Haz tu consulta
          </span>
        </motion.button>
      </motion.div>

    </div>
  );
}
