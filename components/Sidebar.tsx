'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import {
  Plus,
  MessageSquare,
  Archive,
  Trash2,
  LogOut,
  ChevronDown,
  ChevronRight,
  Settings,
} from 'lucide-react';
import type { Chat } from '@/types';

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

export function Sidebar({ user }: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [archivedChats, setArchivedChats] = useState<Chat[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    loadChats();
  }, [pathname]);

  const loadChats = async () => {
    try {
      const [activeRes, archiveRes] = await Promise.all([
        fetch('/api/chats'),
        fetch('/api/chats?archived=true'),
      ]);
      const activeData = await activeRes.json();
      const archiveData = await archiveRes.json();
      setChats(activeData.chats || []);
      setArchivedChats(archiveData.chats || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation' }),
      });
      const { chat } = await res.json();
      router.push(`/chat/${chat.id}`);
    } catch {
      router.push('/chat');
    }
  };

  const handleArchive = async (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await fetch(`/api/chats/${chatId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    });
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (pathname === `/chat/${chatId}`) router.push('/chat');
  };

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Permanently delete this conversation?')) return;
    await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    setArchivedChats((prev) => prev.filter((c) => c.id !== chatId));
    if (pathname === `/chat/${chatId}`) router.push('/chat');
  };

  const currentChatId = pathname.match(/\/chat\/([^/]+)/)?.[1];

  const ChatItem = ({ chat, archived = false }: { chat: Chat; archived?: boolean }) => {
    const isActive = chat.id === currentChatId;
    return (
      <div
        className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
          isActive
            ? 'bg-white/10 text-white'
            : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
        }`}
        onClick={() => router.push(`/chat/${chat.id}`)}
      >
        <MessageSquare size={14} className="shrink-0 opacity-60" />
        <span className="flex-1 truncate">{chat.title}</span>
        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
          {!archived && (
            <button
              onClick={(e) => handleArchive(e, chat.id)}
              className="p-1 hover:text-white rounded opacity-60 hover:opacity-100"
              title="Archive"
            >
              <Archive size={12} />
            </button>
          )}
          <button
            onClick={(e) => handleDelete(e, chat.id)}
            className="p-1 hover:text-red-400 rounded opacity-60 hover:opacity-100"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-[280px] shrink-0 flex flex-col bg-[#111] border-r border-white/10 h-full">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔮</span>
          <div>
            <h1 className="text-white font-semibold text-base leading-tight">Sage Council</h1>
            <p className="text-neutral-500 text-xs">9 minds, 3 perspectives</p>
          </div>
        </div>
      </div>

      {/* New Chat */}
      <div className="p-3">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 bg-sage-600 hover:bg-sage-500 text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Plus size={16} />
          New Conversation
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="px-3 py-6 text-center text-neutral-600 text-sm">
            No conversations yet
          </div>
        ) : (
          <div className="space-y-0.5">
            <p className="px-3 py-2 text-xs text-neutral-600 uppercase tracking-wider font-medium">
              Conversations
            </p>
            {chats.map((chat) => (
              <ChatItem key={chat.id} chat={chat} />
            ))}
          </div>
        )}

        {/* Archived section */}
        {archivedChats.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-600 hover:text-neutral-400 transition-colors uppercase tracking-wider font-medium"
            >
              {showArchived ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Archive size={12} />
              Archived ({archivedChats.length})
            </button>
            {showArchived && (
              <div className="space-y-0.5 mt-1">
                {archivedChats.map((chat) => (
                  <ChatItem key={chat.id} chat={chat} archived />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User footer */}
      <div className="p-3 border-t border-white/10 space-y-1">
        <button
          onClick={() => router.push('/admin')}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-500 hover:text-neutral-300 hover:bg-white/5 rounded-lg transition-colors"
        >
          <Settings size={13} />
          Manage Transcripts
        </button>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 group cursor-pointer"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          {user?.image ? (
            <Image
              src={user.image}
              alt={user.name || 'User'}
              width={28}
              height={28}
              className="rounded-full"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-sage-600 flex items-center justify-center text-xs text-white font-bold">
              {user?.name?.[0] || user?.email?.[0] || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-300 font-medium truncate">{user?.name}</p>
            <p className="text-xs text-neutral-600 truncate">{user?.email}</p>
          </div>
          <LogOut size={13} className="text-neutral-600 group-hover:text-neutral-400 shrink-0" />
        </div>
      </div>
    </div>
  );
}
