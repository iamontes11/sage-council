import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTodayOraculo, getRecentOraculoDays, saveOraculoResult, getOraculoPngUrl, saveOraculoDriveLink } from '@/lib/supabase';
import { generateMorningBrief, renderNewspaperHtml, extractProfessionalBriefFromImage } from '@/lib/oraculo';
import { renderOraculoPng } from '@/lib/oraculoImage';
import { uploadOraculoPngToDrive } from '@/lib/googleDrive';

// POST /api/oraculo/professional — the professional brief (calendar/CRM cut)
// arrives as text or a screenshot. This is the trigger: as soon as it lands,
// El Oráculo crosses it with today's personal brief and delivers the
// morning newspaper — no extra input required.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = session.user.email;

  const day = await getTodayOraculo(userEmail);
  if (!day || !day.personal_brief) {
    return NextResponse.json(
      { error: 'Todavía no hay brief personal cargado hoy — El Oráculo no puede generar el periódico.' },
      { status: 409 },
    );
  }

  const body = await req.json();
  const { content, imageBase64, mimeType } = body as {
    content?: string;
    imageBase64?: string;
    mimeType?: string;
  };

  let professionalBrief: string;
  let inputType: 'text' | 'image';

  try {
    if (imageBase64) {
      inputType = 'image';
      professionalBrief = await extractProfessionalBriefFromImage(imageBase64, mimeType || 'image/png');
      if (!professionalBrief) {
        return NextResponse.json(
          { error: 'No se pudo leer la captura. Intenta pegar el texto directamente.' },
          { status: 422 },
        );
      }
    } else if (content && content.trim()) {
      inputType = 'text';
      professionalBrief = content.trim();
    } else {
      return NextResponse.json({ error: 'Falta el brief profesional (texto o captura)' }, { status: 400 });
    }

    const recentDays = await getRecentOraculoDays(userEmail, 7);
    const itinerary = await generateMorningBrief(day.personal_brief, professionalBrief, recentDays);
    const html = renderNewspaperHtml(day.brief_date, itinerary);
    const png = await renderOraculoPng(day.brief_date, itinerary);

    const updated = await saveOraculoResult(userEmail, professionalBrief, inputType, itinerary, html, png);
    const pngUrl = updated.png_path ? await getOraculoPngUrl(updated.png_path) : null;

    // Best-effort — a missing/expired Drive grant should never break the periódico itself.
    let driveLink: string | null = null;
    try {
      const drive = await uploadOraculoPngToDrive(userEmail, day.brief_date, png);
      driveLink = drive?.webViewLink || null;
      if (driveLink) await saveOraculoDriveLink(userEmail, driveLink);
    } catch (err) {
      console.error('[POST /api/oraculo/professional] Drive upload failed:', err);
    }

    return NextResponse.json({ day: { ...updated, png_drive_link: driveLink }, pngUrl, driveLink });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[POST /api/oraculo/professional] error:', msg);
    return NextResponse.json({ error: 'El Oráculo no pudo generar el periódico', detail: msg }, { status: 500 });
  }
}
