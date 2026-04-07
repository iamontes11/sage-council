import { YoutubeTranscript } from 'youtube-transcript';
import { saveTranscriptChunks, sourceExistsForCreator } from './supabase';

/** Extract a YouTube video ID from a URL or raw ID */
export function extractVideoId(input: string): string | null {
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const url = new URL(input);
    if (url.searchParams.get('v')) return url.searchParams.get('v');
    if (url.hostname === 'youtu.be') return url.pathname.slice(1);
    const match = url.pathname.match(/\/(embed|shorts|v)\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[2];
  } catch {
    const match = input.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
  }
  return null;
}

/** Split text into overlapping chunks of ~maxWords words */
export function chunkText(text: string, maxWords = 350, overlap = 50): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end === words.length) break;
    start = end - overlap;
  }

  return chunks;
}

/** Fetch transcript for a YouTube video and ingest it into Supabase */
export async function ingestVideoTranscript(
  creatorId: string,
  videoInput: string,
  videoTitle?: string,
): Promise<{ videoId: string; chunks: number; skipped?: boolean }> {
  const videoId = extractVideoId(videoInput);
  if (!videoId) throw new Error(`Could not extract video ID from: ${videoInput}`);

  const alreadyExists = await sourceExistsForCreator(creatorId, videoId);
  if (alreadyExists) return { videoId, chunks: 0, skipped: true };

  const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
    lang: 'en',
  });

  if (!transcriptItems || transcriptItems.length === 0) {
    throw new Error(`No transcript available for video: ${videoId}`);
  }

  const fullText = transcriptItems.map((item) => item.text).join(' ');
  const textChunks = chunkText(fullText, 350, 50);

  await saveTranscriptChunks(
    creatorId,
    videoId,
    videoTitle || `Video ${videoId}`,
    textChunks,
  );

  return { videoId, chunks: textChunks.length };
}

/** Ingest a raw transcript string (fetched browser-side) into Supabase */
export async function ingestRawTranscript(
  creatorId: string,
  videoInput: string,
  transcriptText: string,
  videoTitle?: string,
): Promise<{ videoId: string; chunks: number; skipped?: boolean }> {
  const videoId = extractVideoId(videoInput);
  if (!videoId) throw new Error(`Could not extract video ID from: ${videoInput}`);

  if (!transcriptText || transcriptText.trim().length === 0) {
    throw new Error('Transcript text is empty');
  }

  const textChunks = chunkText(transcriptText, 350, 50);

  await saveTranscriptChunks(
    creatorId,
    videoId,
    videoTitle || `Video ${videoId}`,
    textChunks,
  );

  return { videoId, chunks: textChunks.length };
}

/** Ingest multiple videos for a creator */
export async function ingestMultipleVideos(
  creatorId: string,
  videos: { url: string; title?: string }[],
): Promise<{ success: number; failed: string[] }> {
  let success = 0;
  const failed: string[] = [];

  for (const video of videos) {
    try {
      await ingestVideoTranscript(creatorId, video.url, video.title);
      success++;
    } catch (err) {
      failed.push(`${video.url}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return { success, failed };
}


/** Ingest a plain text file (no video ID needed) */
export async function ingestTextFile(
  creatorId: string,
  fileName: string,
  textContent: string,
): Promise<{ fileId: string; chunks: number; skipped?: boolean }> {
  if (!textContent || textContent.trim().length === 0) {
    throw new Error('File content is empty');
  }

  // Stable fileId based on creatorId + normalized filename — enables duplicate detection
  const normalizedName = fileName.toLowerCase().replace(/[^a-z0-9.]/g, '-');
  const fileId = `txt-${creatorId}-${normalizedName}`;

  const alreadyExists = await sourceExistsForCreator(creatorId, fileId);
  if (alreadyExists) return { fileId, chunks: 0, skipped: true };

  const textChunks = chunkText(textContent, 350, 50);

  await saveTranscriptChunks(
    creatorId,
    fileId,
    fileName || 'Uploaded text file',
    textChunks,
  );

  return { fileId, chunks: textChunks.length };
}
