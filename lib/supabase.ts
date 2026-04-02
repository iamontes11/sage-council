import { createClient } from '@supabase/supabase-js';
import { Chat, Message } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function createChat(data: { user_email: string; title: string }): Promise<Chat> {
  const { data: chat, error } = await supabaseAdmin
    .from("chats")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return chat;
}

export async function getChatById(id: string): Promise<Chat | null> {
  const { data: chat, error } = await supabaseAdmin
    .from("chats")
    .select()
    .eq("id", id)
    .single();
  if (error) return null;
  return chat;
}

export async function getUserChats(userEmail: string): Promise<Chat[]> {
  const { data: chats, error } = await supabaseAdmin
    .from("chats")
    .select()
    .eq("user_email", userEmail)
    .eq("archived", false)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return chats || [];
}

export async function getArchivedChats(userEmail: string): Promise<Chat[]> {
  const { data: chats, error } = await supabaseAdmin
    .from("chats")
    .select()
    .eq("user_email", userEmail)
    .eq("archived", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return chats || [];
}

export async function updateChatTitle(id: string, title: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("chats")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function archiveChat(id: string, archived: boolean = true): Promise<void> {
  const { error } = await supabaseAdmin
    .from("chats")
    .update({ archived })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteChat(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("chats")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function saveMessage(data: {
  chat_id: string;
  role: string;
  content: string;
}): Promise<Message> {
  const { data: message, error } = await supabaseAdmin
    .from("messages")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return message;
}

export async function getChatMessages(chatId: string): Promise<Message[]> {
  const { data: messages, error } = await supabaseAdmin
    .from("messages")
    .select()
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return messages || [];
}


export async function saveTranscriptChunks(
  creatorId: string,
  videoId: string,
  videoTitle: string,
  textChunks: string[],
): Promise<void> {
  const rows = textChunks.map((chunk, i) => ({
    creator_id: creatorId,
    video_id: videoId,
    video_title: videoTitle,
    chunk_index: i,
    chunk_text: chunk,
  }));
  const { error } = await supabaseAdmin
    .from("transcript_chunks")
          .insert(rows);
  if (error) throw error;
}

export async function searchTranscriptChunks(
  creatorId: string,
  query: string,
  limit: number = 5
): Promise<{ chunk_text: string; video_title: string }[]> {
  const { data, error } = await supabaseAdmin
    .from("transcript_chunks")
    .select("chunk_text, video_title")
    .eq("creator_id", creatorId)
    .textSearch("search_vector", query, { type: "websearch", config: "english" })
    .limit(limit);
  if (error || !data) return [];
  return data;
}

export async function getTranscriptStats() {
  // 1) One row per source (chunk_index=0) — avoids the 1000-row default limit
  const { data: sourceRows, error: sourceError } = await supabaseAdmin
    .from("transcript_chunks")
    .select("creator_id, video_id")
    .eq("chunk_index", 0)
    .limit(50000);

  if (sourceError) throw sourceError;

  const creatorSources: Record<string, Set<string>> = {};
  for (const row of sourceRows || []) {
    if (!creatorSources[row.creator_id]) {
      creatorSources[row.creator_id] = new Set();
    }
    creatorSources[row.creator_id].add(row.video_id);
  }

  // 2) Chunk counts per creator via efficient head-only COUNT(*)
  const creatorIds = Object.keys(creatorSources);
  const chunkCounts = await Promise.all(
    creatorIds.map(async (creatorId) => {
      const { count, error } = await supabaseAdmin
        .from("transcript_chunks")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", creatorId);
      return { creatorId, count: error ? 0 : (count || 0) };
    })
  );

  return creatorIds.map((creatorId) => ({
    creatorId,
    chunks: chunkCounts.find((c) => c.creatorId === creatorId)?.count || 0,
    videos: creatorSources[creatorId].size,
  }));
}
