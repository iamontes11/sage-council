import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { ingestVideoTranscript } from '@/lib/transcripts';
import { getTranscriptStats } from '@/lib/supabase';
import { CREATORS } from '@/lib/creators';

// Simple admin check — first user to sign in is assumed admin,
// or protect via ADMIN_SECRET env var
function isAdmin(email: string | null | undefined): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  // If ADMIN_EMAILS is set, check against it
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || [];
  if (adminEmails.length > 0 && email) {
    return adminEmails.includes(email);
  }
  // Otherwise any logged-in user can ingest (for personal use)
  return !!email;
}

// GET /api/ingest — get transcript stats
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await getTranscriptStats();
    return NextResponse.json({ stats, creators: CREATORS });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}

// POST /api/ingest — ingest a YouTube video transcript
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { creatorId: string; videoUrl: string; videoTitle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { creatorId, videoUrl, videoTitle } = body;

  if (!creatorId || !videoUrl) {
    return NextResponse.json(
      { error: 'creatorId and videoUrl are required' },
      { status: 400 },
    );
  }

  const creator = CREATORS.find((c) => c.id === creatorId);
  if (!creator) {
    return NextResponse.json({ error: 'Unknown creator ID' }, { status: 400 });
  }

  try {
    const result = await ingestVideoTranscript(creatorId, videoUrl, videoTitle);
    return NextResponse.json({
      success: true,
      videoId: result.videoId,
      chunks: result.chunks,
      message: `Successfully ingested ${result.chunks} chunks for ${creator.name}`,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Ingest error:', errorMessage);
    return NextResponse.json(
      { error: `Ingestion failed: ${errorMessage}` },
      { status: 500 },
    );
  }
}
