'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { VoxelAvatar } from '@/components/VoxelAvatar';
import { CREATORS } from '@/lib/creators';

export default function NewChatPage() {
  const { data: session } = useSession();
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
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-3xl mx-auto w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-3 mb-10"
      >
        <h1 className="text-3xl font-bold text-white tracking-tight">
          El Consejo te escucha
        </h1>
        <p className="text-neutral-400 text-sm max-w-lg mx-auto leading-relaxed">
          Plantea tu pregunta, decisión o problema. Recibirás una respuesta
          destilada de las mejores mentes.
        </p>
      </motion.div>

      {/* Creator avatars — no names */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="flex flex-wrap justify-center gap-1.5 mb-12"
      >
        {CREATORS.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.03, duration: 0.2 }}
            className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.08] transition-all"
            title={c.name}
          >
            <VoxelAvatar creatorId={c.id} size={24} />
          </motion.div>
        ))}
      </motion.div>

      {/* Crystal ball CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="flex flex-col items-center"
      >
        <motion.button
          onClick={handleStart}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
          className="group relative flex flex-col items-center gap-5 focus:outline-none"
        >
          {/* Ambient glow */}
          <div className="absolute rounded-full blur-3xl bg-violet-600/15 group-hover:bg-violet-600/30 transition-all duration-700 w-48 h-48 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

          {/* Ball */}
          <div className="relative w-40 h-40">
            {/* Outer shell */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-950 via-indigo-950 to-purple-950 border border-violet-500/20 shadow-[0_0_60px_rgba(139,92,246,0.12)] group-hover:shadow-[0_0_90px_rgba(139,92,246,0.28)] transition-all duration-500" />
            {/* Inner gradient shimmer */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-700/15 via-transparent to-transparent" />
            {/* Highlight 1 */}
            <div className="absolute top-6 left-9 w-7 h-7 rounded-full bg-white/[0.07] blur-md" />
            {/* Highlight 2 */}
            <div className="absolute top-9 left-11 w-3.5 h-3.5 rounded-full bg-white/[0.18]" />
            {/* Micro sparkle */}
            <div className="absolute bottom-10 right-9 w-2 h-2 rounded-full bg-violet-300/25" />
            {/* Bottom depth */}
            <div className="absolute bottom-4 inset-x-8 h-6 rounded-full bg-violet-900/30 blur-lg" />
          </div>

          <span className="text-neutral-300 text-base font-medium group-hover:text-white transition-colors duration-200 tracking-wide">
            Haz tu consulta
          </span>
        </motion.button>
      </motion.div>
    </div>
  );
}
