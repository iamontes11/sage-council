import { createClient } from '@supabase/supabase-js';
import { Chat, Message, OraculoDay, OraculoResult } from '@/types';

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

/** Returns true if this video_id already has chunks for this creator (duplicate check) */
export async function sourceExistsForCreator(creatorId: string, videoId: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from("transcript_chunks")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", creatorId)
    .eq("video_id", videoId);
  return !error && (count || 0) > 0;
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
  // Read from the pre-computed cache table — always instant, never times out
  const { data, error } = await supabaseAdmin
    .from('transcript_stats_cache')
    .select('creator_id, chunk_count, video_count');

  if (error) {
    console.error('[getTranscriptStats] Supabase error:', JSON.stringify(error));
    throw error;
  }

  return (data || []).map((row: { creator_id: string; chunk_count: number; video_count: number }) => ({
    creatorId: row.creator_id,
    chunks: Number(row.chunk_count),
    videos: Number(row.video_count),
  }));
}

// ── El Oráculo — morning briefing ────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Today's oráculo row for this user, or null if nothing has been started yet. */
export async function getTodayOraculo(userEmail: string): Promise<OraculoDay | null> {
  const { data, error } = await supabaseAdmin
    .from('oraculo_days')
    .select()
    .eq('user_email', userEmail)
    .eq('brief_date', todayISO())
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Loads/replaces today's personal brief and puts the day in "waiting_professional". */
export async function savePersonalBrief(userEmail: string, personalBrief: string): Promise<OraculoDay> {
  const { data, error } = await supabaseAdmin
    .from('oraculo_days')
    .upsert(
      {
        user_email: userEmail,
        brief_date: todayISO(),
        personal_brief: personalBrief,
        personal_received_at: new Date().toISOString(),
        status: 'waiting_professional',
      },
      { onConflict: 'user_email,brief_date' },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Uploads the generated newspaper PNG to the private archive bucket. Returns its storage path. */
export async function uploadOraculoPng(userEmail: string, dateISO: string, png: Buffer): Promise<string> {
  const path = `${userEmail}/${dateISO}.png`;
  const { error } = await supabaseAdmin.storage
    .from('oraculo-archive')
    .upload(path, png, { contentType: 'image/png', upsert: true });
  if (error) throw error;
  return path;
}

/** Short-lived signed URL for an archived PNG (bucket is private). */
export async function getOraculoPngUrl(path: string, expiresInSeconds: number = 3600): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from('oraculo-archive')
    .createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

/** Saves the professional brief + generated result, archives the PNG, and marks the day "ready". */
export async function saveOraculoResult(
  userEmail: string,
  professionalBrief: string,
  professionalInputType: 'text' | 'image',
  itinerary: OraculoResult,
  html: string,
  png: Buffer,
): Promise<OraculoDay> {
  const pngPath = await uploadOraculoPng(userEmail, todayISO(), png);
  const { data, error } = await supabaseAdmin
    .from('oraculo_days')
    .update({
      professional_brief: professionalBrief,
      professional_input_type: professionalInputType,
      professional_received_at: new Date().toISOString(),
      itinerary,
      html,
      png_path: pngPath,
      status: 'ready',
    })
    .eq('user_email', userEmail)
    .eq('brief_date', todayISO())
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Persists (or refreshes) the user's Google OAuth refresh token, used for unattended Drive uploads. */
export async function saveGoogleRefreshToken(userEmail: string, refreshToken: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('google_oauth_tokens')
    .upsert(
      { user_email: userEmail, refresh_token: refreshToken, updated_at: new Date().toISOString() },
      { onConflict: 'user_email' },
    );
  if (error) throw error;
}

/** The user's stored Google refresh token, or null if they haven't granted Drive access yet. */
export async function getGoogleRefreshToken(userEmail: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('google_oauth_tokens')
    .select('refresh_token')
    .eq('user_email', userEmail)
    .maybeSingle();
  if (error || !data) return null;
  return data.refresh_token;
}

/** Records the Drive link for today's archived PNG, once the (best-effort) upload succeeds. */
export async function saveOraculoDriveLink(userEmail: string, driveLink: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('oraculo_days')
    .update({ png_drive_link: driveLink })
    .eq('user_email', userEmail)
    .eq('brief_date', todayISO());
  if (error) throw error;
}

/** Recent past days (most recent first, today excluded) used to detect patterns/trends. */
export async function getRecentOraculoDays(userEmail: string, limit: number = 7): Promise<OraculoDay[]> {
  const { data, error } = await supabaseAdmin
    .from('oraculo_days')
    .select()
    .eq('user_email', userEmail)
    .eq('status', 'ready')
    .lt('brief_date', todayISO())
    .order('brief_date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
