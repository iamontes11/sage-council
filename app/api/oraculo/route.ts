import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTodayOraculo, getOraculoPdfUrl } from '@/lib/supabase';

// GET /api/oraculo — today's status for the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const day = await getTodayOraculo(session.user.email);
  if (!day) {
    return NextResponse.json({ status: 'waiting_personal', day: null });
  }
  const pdfUrl = day.pdf_path ? await getOraculoPdfUrl(day.pdf_path) : null;
  return NextResponse.json({ status: day.status, day, pdfUrl });
}
