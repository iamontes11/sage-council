'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  Archive,
  Trash2,
  LogOut,
  ChevronDown,
  ChevronRight,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { toast } from './Toast';
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
  const [collapsed, setCollapsed] = useState(false);
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
    toast('Conversation archived', 'info');
    if (pathname === `/chat/${chatId}`) router.push('/chat');
  };

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Permanently delete this conversation?')) return;
    await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    setArchivedChats((prev) => prev.filter((c) => c.id !== chatId));
    toast('Conversation deleted', 'info');
    if (pathname === `/chat/${chatId}`) router.push('/chat');
  };

  const currentChatId = pathname.match(/\/chat\/([^/]+)/)?.[1];

  const ChatItem = ({
    chat,
    archived = false,
  }: {
    chat: Chat;
    archived?: boolean;
  }) => {
    const isActive = chat.id === currentChatId;
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 text-sm ${
          isActive
            ? 'bg-white/10 text-white shadow-sm'
            : 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200'
        }`}
        onClick={() => router.push(`/chat/${chat.id}`)}
      >
        <MessageSquare size={14} className="shrink-0 opacity-50" />
        <span className="flex-1 truncate">{chat.title}</span>
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          {!archived && (
            <button
              onClick={(e) => handleArchive(e, chat.id)}
              className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg opacity-60 hover:opacity-100 transition-all"
              data-tooltip="Archive"
            >
              <Archive size={12} />
            </button>
          )}
          <button
            onClick={(e) => handleDelete(e, chat.id)}
            className="p-1.5 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-60 hover:opacity-100 transition-all"
            data-tooltip="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </motion.div>
    );
  };

  /* ââ Collapsed mini-sidebar ââââââââââââââââââââââââ */
  if (collapsed) {
    return (
      <div className="w-14 shrink-0 flex flex-col items-center py-4 gap-3 bg-[#111] border-r border-white/[0.06] h-full">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-white/5 transition-all"
          data-tooltip="Expand sidebar"
        >
          <PanelLeftOpen size={18} />
        </button>
        <div className="divider w-6 mx-auto" />
        <button
          onClick={handleNewChat}
          className="p-2 rounded-lg bg-sage-600 hover:bg-sage-500 text-white transition-colors"
          data-tooltip="New chat"
        >
          <Plus size={16} />
        </button>
      </div>
    );
  }

  /* ââ Full sidebar ââââââââââââââââââââââââââââââââââ */
  return (
    <div className="w-[280px] shrink-0 flex flex-col bg-[#111] border-r border-white/[0.06] h-full">
      {/* Logo + collapse */}
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sage-600/20 to-sage-600/5 border border-sage-600/20 flex items-center justify-center">
            <span className="text-lg">ð®</span>
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm leading-tight">
              Sage Council
            </h1>
            <p className="text-neutral-600 text-[11px]">
              12 minds, 3 perspectives
            </p>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-300 hover:bg-white/5 transition-all"
          data-tooltip="Collapse"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* New Chat button */}
      <div className="p-3">
        <button
          onClick={handleNewChat}
          className="btn btn-primary w-full gap-2 py-2.5 rounded-xl text-sm"
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
              <div
                key={i}
                className="skeleton h-9 w-full rounded-xl"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="px-3 py-8 text-center text-neutral-600 text-sm">
            <MessageSquare
              size={24}
              className="mx-auto mb-2 opacity-30"
            />
            No conversations yet
          </div>
        ) : (
          <div className="space-y-0.5">
            <p className="px-3 py-2 text-[11px] text-neutral-600 uppercase tracking-wider font-semibold">
              Conversations
            </p>
            <AnimatePresence>
              {chats.map((chat) => (
                <ChatItem key={chat.id} chat={chat} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Archived section */}
        {archivedChats.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors uppercase tracking-wider font-semibold"
            >
              <motion.div
                animate={{ rotate: showArchived ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight size={12} />
              </motion.div>
              <Archive size={12} />
              Archived ({archivedChats.length})
            </button>
            <AnimatePresence>
              {showArchived && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-0.5 mt-1 overflow-hidden"
                >
                  {archivedChats.map((chat) => (
                    <ChatItem key={chat.id} chat={chat} archived />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* User footer */}
      <div className="p-3 border-t border-white/[0.06] space-y-1">
        <button
          onClick={() => router.push('/admin')}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04] rounded-xl transition-all"
        >
          <Settings size={13} />
          Manage Transcripts
        </button>
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] group cursor-pointer transition-all"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          {user?.image ? (
            <Image
              src={user.image}
              alt={user.name || 'User'}
              width={28}
              height={28}
              className="rounded-full ring-2 ring-white/10"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-sage-600 flex items-center justify-center text-xs text-white font-bold">
              {user?.name?.[0] || user?.email?.[0] || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-300 font-medium truncate">
              {user?.name}
            </p>
            <p className="text-[11px] text-neutral-600 truncate">
              {user?.email}
            </p>
          </div>
          <LogOut
            size={13}
            className="text-neutral-600 group-hover:text-neutral-400 shrink-0 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
