'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { CREATORS } from '@/lib/creators';

export default function NewChatPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleStart = async (starterMessage?: string) => {
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Conversation' }),
    });
    const { chat } = await res.json();
    if (starterMessage) {
      router.push(
        `/chat/${chat.id}?starter=${encodeURIComponent(starterMessage)}`
      );
    } else {
      router.push(`/chat/${chat.id}`);
    }
  };

  const starters = [
    "I'm at a crossroads in my career. Should I stay in my stable job or take a risk on something I'm passionate about?",
    'I feel stuck and uninspired. How do I reignite my motivation without forcing it?',
    "I have a big decision to make and I'm paralyzed by the options. Help me think through it.",
    'I want to build better habits but keep failing. What am I missing?',
    "I feel like I'm living for others' expectations and not my own. How do I find my own path?",
    'I want to start a creative project but fear of failure keeps stopping me. What do I do?',
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-3xl mx-auto w-full overflow-y-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-4 mb-10"
      >
        <div className="text-5xl mb-1">ð®</div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          The Sage Council awaits
        </h1>
        <p className="text-neutral-400 text-sm max-w-lg mx-auto leading-relaxed">
          Ask anything &mdash; a decision, a problem, a creative challenge. The
          council will give you 1 best answer, rooted in your
          favorite thinkers&apos; real ideas.
        </p>
      </motion.div>

      {/* Council members */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="flex flex-wrap justify-center gap-2 mb-10"
      >
        {CREATORS.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.03, duration: 0.25 }}
            className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1.5 hover:bg-white/[0.08] hover:border-white/[0.15] transition-all cursor-default"
          >
            <span>{c.emoji}</span>
            <span className="text-xs text-neutral-300 font-medium">
              {c.name}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* Starter prompts */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
        className="w-full max-w-2xl space-y-3"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={12} className="text-neutral-600" />
          <p className="text-[11px] text-neutral-600 uppercase tracking-wider font-semibold">
            Try asking
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {starters.map((starter, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.05, duration: 0.25 }}
              onClick={() => handleStart(starter)}
              className="group text-left text-sm text-neutral-300 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] hover:border-white/[0.15] rounded-xl px-4 py-3.5 transition-all duration-200 flex items-center gap-3"
            >
              <span className="flex-1">{starter}</span>
              <ArrowRight
                size={14}
                className="shrink-0 text-neutral-600 group-hover:text-sage-400 group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100"
              />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Start fresh */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        onClick={() => handleStart()}
        className="mt-8 text-sage-400 hover:text-sage-300 text-sm font-medium transition-colors group flex items-center gap-1.5"
      >
        Or start with your own question
        <ArrowRight
          size={14}
          className="group-hover:translate-x-0.5 transition-transform"
        />
      </motion.button>
    </div>
  );
}
