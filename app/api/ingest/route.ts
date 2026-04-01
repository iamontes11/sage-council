import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ingestVideoTranscript, ingestRawTranscript, ingestTextFile } from '@/lib/transcripts';
import { getTranscriptStats } from '@/lib/supabase';
import { CREATORS } from '@/lib/creators';

function isAdmin(email: string | null | undefined): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || [];
  if (adminEmails.length > 0 && email) {
    return adminEmails.includes(email);
  }
  return !!email;
}

// GET /api/ingest â get transcript stats
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await getTranscriptStats();
    return NextResponse.json({ stats, creators: CREATORS });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 },
    );
  }
}

// POST /api/ingest â ingest transcript
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { creatorId, videoUrl, videoTitle, transcript, fileName } = body;

  if (!creatorId) {
    return NextResponse.json({ error: 'Creator ID is required' }, { status: 400 });
  }

  const creator = CREATORS.find((c) => c.id === creatorId);
  if (!creator) {
    return NextResponse.json({ error: 'Unknown creator ID' }, { status: 400 });
  }

  try {
    let result;

    if (fileName && transcript) {
      // Text file upload â no video URL needed
      result = await ingestTextFile(creatorId, fileName, transcript);
      return NextResponse.json({
        success: true,
        fileId: result.fileId,
        chunks: result.chunks,
        message: `Successfully ingested ${result.chunks} chunks from "${fileName}" for ${creator.name}`,
      });
    } else if (transcript) {
      // Use provided transcript text directly
      result = await ingestRawTranscript(creatorId, videoUrl, transcript, videoTitle);
    } else {
      // Try to fetch from YouTube
      result = await ingestVideoTranscript(creatorId, videoUrl, videoTitle);
    }

    return NextResponse.json({
      success: true,
      videoId: result.videoId,
      chunks: result.chunks,
      message: `Successfully ingested ${result.chunks} chunks for ${creator.name}`,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err ? String((err as any).message) : 'Unknown error');
    console.error('Ingest error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
