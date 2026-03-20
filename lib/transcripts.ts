import { saveTranscriptChunks } from '@/lib/supabase';

export function extractVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 100): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

export async function ingestVideoTranscript(
  videoUrl: string,
  creatorId: string,
  transcript: string,
  videoTitle?: string
): Promise<{ success: boolean; videoId: string; chunksCount: number }> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) throw new Error('Invalid YouTube URL: ' + videoUrl);

  const chunks = chunkText(transcript);
  const title = videoTitle || videoId;

  await saveTranscriptChunks(
    chunks.map((content, chunk_index) => ({
      creator_id: creatorId,
      video_id: videoId,
      video_title: title,
      chunk_index,
      content,
    }))
  );

  return { success: true, videoId, chunksCount: chunks.length };
}

export async function ingestMultipleVideos(
  videos: { url: string; creatorId: string; transcript: string; title?: string }[]
): Promise<{ videoId: string; success: boolean; error?: string }[]> {
  const results = await Promise.allSettled(
    videos.map(v => ingestVideoTranscript(v.url, v.creatorId, v.transcript, v.title))
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') {
      return { videoId: r.value.videoId, success: true };
    } else {
      return {
        videoId: extractVideoId(videos[i].url) || videos[i].url,
        success: false,
        error: (r.reason as Error).message,
      };
    }
  });
}
