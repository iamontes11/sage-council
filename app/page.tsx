'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CREATORS } from '@/lib/creators';
import { VoxelAvatar } from '@/components/VoxelAvatar';

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/chat');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sage-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-6 overflow-hidden relative">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sage-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-2xl w-full text-center space-y-8"
      >
        {/* Logo & headline */}
        <div className="space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
            className="text-6xl"
          >
            ð®
          </motion.div>
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Sage Council
          </h1>
          <p className="text-lg text-neutral-400 leading-relaxed max-w-lg mx-auto">
            Bring your questions, decisions, and problems to a council of 12
            minds &mdash; each nurtured on their creator&apos;s real videos and ideas.
          </p>
          <p className="text-sm text-neutral-500">
            Every response: 1 best answer, distilled from multiple
            philosophical traditions.
          </p>
        </div>

        {/* Creator grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="grid grid-cols-3 sm:grid-cols-4 gap-2 py44"
        >
          {CREATORS.map((creator, i) => (
            <motion.div
              key={creator.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.03, duration: 0.25 }}
              className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.15] transition-all duration-200 cursor-default group"
            >
              <div className="group-hover:scale-110 transition-transform">
                <VoxelAvatar creatorId={creator.id} size={48} />
              </div>
              <span className="text-xs text-neutral-300 font-medium text-center leading-tight">
                {creator.name}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Sign in */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.35 }}
          className="space-y-4"
        >
          <button
            onClick={() => signIn('google', { callbackUrl: '/chat' })}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-4 px-6 rounded-xl hover:bg-gray-100 active:scale-[0.98] transition-all text-base shadow-lg shadow-white/5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
          <p className="text-xs text-neutral-600">
            Your chats are private and stored securely. No ads, no data selling.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
