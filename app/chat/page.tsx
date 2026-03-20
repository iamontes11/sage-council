'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
      router.push(`/chat/${chat.id}?starter=${encodeURIComponent(starterMessage)}`);
    } else {
      router.push(`/chat/${chat.id}`);
    }
  };

  const starters = [
    "I'm at a crossroads in my career. Should I stay in my stable job or take a risk on something I'm passionate about?",
    'I feel stuck and uninspired. How do I reignite my motivation without forcing it?',
    "I have a big decision to make and I'm paralyzed by the options. Help me think through it.",
    'I want to build better habits but keep failing. What am I missing?',
    'I feel like I\'m living for others\' expectations and not my own. How do I find my own path?',
    'I want to start a creative project but fear of failure keeps stopping me. What do I do?',
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="text-center space-y-3 mb-10">
        <div className="text-5xl">🔮</div>
        <h1 className="text-3xl font-bold text-white">
          The Sage Council awaits
        </h1>
        <p className="text-neutral-400 text-base max-w-lg mx-auto">
          Ask anything — a decision, a problem, a creative challenge. The council will
          give you 3 distinct perspectives, each rooted in your favorite thinkers' real ideas.
        </p>
      </div>

      {/* Council preview */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {CREATORS.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5"
          >
            <span>{c.emoji}</span>
            <span className="text-xs text-neutral-300 font-medium">{c.name}</span>
          </div>
        ))}
      </div>

      {/* Starter prompts */}
      <div className="w-full max-w-2xl space-y-3">
        <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-4">
          Try asking
        </p>
        <div className="grid grid-cols-1 gap-2">
          {starters.map((starter, i) => (
            <button
              key={i}
              onClick={() => handleStart(starter)}
              className="text-left text-sm text-neutral-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 transition-all"
            >
              {starter}
            </button>
          ))}
        </div>
      </div>

      {/* Or start fresh */}
      <button
        onClick={() => handleStart()}
        className="mt-8 text-sage-400 hover:text-sage-300 text-sm font-medium transition-colors"
      >
        Or start with your own question →
      </button>
    </div>
  );
}
