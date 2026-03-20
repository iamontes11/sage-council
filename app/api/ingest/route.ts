import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { ingestVideoTranscript } from '@/lib/transcripts';
import { getTranscriptStats } from '@/lib/supabase';
import { CREATORS } from '@/lib/creators';

function isAdmin(email: string | null | undefined): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || [];
  if (adminEmails.length > 0 && email) return adminEmails.includes(email);
  return !!email;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const stats = await getTranscriptStats();
    return NextResponse.json({ stats, creators: CREATORS });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  const { creatorId, videoUrl, videoTitle } = body;
  if (!creatorId || !videoUrl) return NextResponse.json({ error: 'creatorId and videoUrl required' }, { status: 400 });
  const creator = CREATORS.find((c) => c.id === creatorId);
  if (!creator) return NextResponse.json({ error: 'Unknown creator ID' }, { status: 400 });
  try {
    const result = await ingestVideoTranscript(creatorId, videoUrl, videoTitle);
    return NextResponse.json({ success: true, videoId: result.videoId, chunks: result.chunks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Ingestion failed: ${msg}` }, { status: 500 });
  }
}
