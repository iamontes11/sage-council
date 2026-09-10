import { ImageResponse } from 'next/og';
import type { OraculoResult } from '@/types';
import { formatSpanishDate } from './oraculo';

const PAPER = '#f7f3ea';
const INK = '#1c1a17';
const INK_SOFT = '#4a463f';
const ACCENT = '#8a1f11';

const WIDTH = 1000;
const HEIGHT = 1400;

/** Renders the "periódico matutino" as a PNG buffer — no headless browser, no manual steps. */
export async function renderOraculoPng(dateISO: string, result: OraculoResult): Promise<Buffer> {
  const dateLabel = formatSpanishDate(dateISO);

  const image = new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: WIDTH,
          height: HEIGHT,
          backgroundColor: PAPER,
          color: INK,
          padding: '40px 48px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Masthead */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderBottom: `4px solid ${INK}`,
            paddingBottom: 12,
          }}
        >
          <div style={{ fontSize: 58, fontWeight: 900, letterSpacing: 6, textTransform: 'uppercase' }}>
            El Oráculo
          </div>
          <div
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'space-between',
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: 2,
              color: INK_SOFT,
              borderTop: `1px solid ${INK}`,
              marginTop: 8,
              paddingTop: 6,
            }}
          >
            <span>{dateLabel}</span>
            <span>Edición matutina de Ignacio</span>
          </div>
          <div style={{ fontSize: 16, fontStyle: 'italic', color: INK_SOFT, marginTop: 10 }}>
            {result.headline}
          </div>
        </div>

        {/* Decision banner */}
        {result.pendingDecision ? (
          <div
            style={{
              display: 'flex',
              backgroundColor: ACCENT,
              color: PAPER,
              fontWeight: 700,
              fontSize: 14,
              textAlign: 'center',
              padding: '12px 18px',
              marginTop: 18,
            }}
          >
            {`⚠ DECISIÓN PENDIENTE — ${result.pendingDecision}`}
          </div>
        ) : null}

        {/* Body */}
        <div style={{ display: 'flex', flexDirection: 'row', marginTop: 22, flex: 1 }}>
          {/* Itinerary column */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 2, paddingRight: 32 }}>
            <div
              style={{
                fontSize: 12,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: INK_SOFT,
                borderBottom: `2px solid ${INK}`,
                paddingBottom: 6,
                marginBottom: 14,
              }}
            >
              Itinerario del día
            </div>
            {result.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: item.isMain ? '4px 0 20px' : '12px 0',
                  borderBottom: i === result.items.length - 1 ? 'none' : `1px solid rgba(28,26,23,0.18)`,
                  backgroundColor: item.needsDecision ? 'rgba(138,31,17,0.06)' : 'transparent',
                  paddingLeft: item.needsDecision ? 12 : 0,
                  borderLeft: item.needsDecision ? `3px solid ${ACCENT}` : 'none',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: ACCENT,
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  {item.time}
                </div>
                <div style={{ fontSize: item.isMain ? 30 : 20, fontWeight: 700, marginBottom: 6, lineHeight: 1.2 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: item.isMain ? 17 : 15, color: INK, lineHeight: 1.5 }}>
                  {item.detail}
                </div>
                {item.needsDecision ? (
                  <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, marginTop: 8 }}>
                    ⚠ Requiere tu decisión
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              borderLeft: `1px solid rgba(28,26,23,0.18)`,
              paddingLeft: 28,
            }}
          >
            {result.backgroundTasks && result.backgroundTasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 26 }}>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: INK_SOFT,
                    borderBottom: `2px solid ${INK}`,
                    paddingBottom: 4,
                    marginBottom: 10,
                  }}
                >
                  Tareas de fondo
                </div>
                {result.backgroundTasks.map((t, i) => (
                  <div key={i} style={{ display: 'flex', fontSize: 13.5, color: INK_SOFT, marginBottom: 8, lineHeight: 1.5 }}>
                    {`• ${t}`}
                  </div>
                ))}
              </div>
            ) : null}

            {result.pattern ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: INK_SOFT,
                    borderBottom: `2px solid ${INK}`,
                    paddingBottom: 4,
                    marginBottom: 10,
                  }}
                >
                  Patrón detectado
                </div>
                <div style={{ display: 'flex', fontSize: 13.5, color: INK_SOFT, fontStyle: 'italic', lineHeight: 1.5 }}>
                  {result.pattern}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );

  const arrayBuffer = await image.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
