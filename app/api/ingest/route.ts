import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ingestMultipleVideos } from '@/lib/transcripts';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Simple admin check - only allow specific email
  const adminEmail = process.env.ADMIN_EMAIL || 'iamontes11@gmail.com';
  if (session.user.email !== adminEmail) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { videos } = await req.json();
  if (!videos || !Array.isArray(videos)) {
    return NextResponse.json({ error: 'Missing videos array' }, { status: 400 });
  }

  const results = await ingestMultipleVideos(videos);
  return NextResponse.json({ results });
}
