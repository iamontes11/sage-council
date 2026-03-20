'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CREATORS } from '@/lib/creators';

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
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sage-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
        {/* Logo */}
        <div className="space-y-3">
          <div className="text-6xl">🔮</div>
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Sage Council
          </h1>
          <p className="text-xl text-neutral-400 leading-relaxed">
            Bring your questions, decisions, and problems to a council of 9 minds —
            each nurtured on their creator's real videos and ideas.
          </p>
          <p className="text-sm text-neutral-500">
            Every response: 3 distinct perspectives, each from a different philosophical tradition.
          </p>
        </div>

        {/* Creator grid */}
        <div className="grid grid-cols-3 gap-2 py-4">
          {CREATORS.map((creator) => (
            <div
              key={creator.id}
              className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-white/5 border border-white/10"
            >
              <span className="text-2xl">{creator.emoji}</span>
              <span className="text-xs text-neutral-300 font-medium text-center leading-tight">
                {creator.name}
              </span>
            </div>
          ))}
        </div>

        {/* Sign in */}
        <div className="space-y-4">
          <button
            onClick={() => signIn('google', { callbackUrl: '/chat' })}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-4 px-6 rounded-xl hover:bg-gray-100 transition-colors text-base"
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
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.66z"
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
        </div>
      </div>
    </div>
  );
}
