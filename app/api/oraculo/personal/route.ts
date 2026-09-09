import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { savePersonalBrief } from '@/lib/supabase';

// POST /api/oraculo/personal — load today's personal brief (from Drive/Notion,
// pasted manually). Puts El Oráculo in "waiting_professional": it now waits
// for the professional brief to trigger the cross analysis automatically.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { content } = await req.json();
  if (!content || typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: 'Falta el contenido del brief personal' }, { status: 400 });
  }

  const day = await savePersonalBrief(session.user.email, content.trim());
  return NextResponse.json({ day });
}
