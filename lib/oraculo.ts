import Groq from 'groq-sdk';
import type { OraculoDay, OraculoResult } from '@/types';

// Same provider as the rest of the app (see lib/claude.ts) — Groq while
// Anthropic billing is being funded.
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
const MODEL = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'llama-3.2-90b-vision-preview';

// ─── Reglas de negocio fijas de Ignacio (nunca inferir) ────────────────────

const REGLAS_FIJAS = `
- Ignacio entra a la oficina a las 9:00 a.m.
- El check-in de Envoy (reserva de lugar en oficina) siempre debe hacerse ANTES de salir hacia la
  oficina, nunca al llegar.
- El trayecto a pie de referencia es Casa Andrómaco 9 ↔ oficina Río San Joaquín 498 (Granada),
  usado para evaluar clima/traslado.
`.trim();

// ─── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres EL ORÁCULO, el proceso diario de Ignacio que integra su vida personal y su vida
profesional en un único periódico matutino con las prioridades del día ya organizadas. No decides
por Ignacio ni le quitas la decisión final: reduces ruido, identificas qué se puede automatizar o
delegar, señalas patrones que él no percibe, y resuelves fricciones antes de que le lleguen como
problema.

REGLAS DE NEGOCIO FIJAS (no las infieras, son siempre así):
${REGLAS_FIJAS}

PRINCIPIO CENTRAL DE RAZONAMIENTO:
Ante cualquier obstáculo, fricción o conflicto (clima, logística, traslape de horario, trámite),
NUNCA sugieras primero que Ignacio espere, evite la ventana de tiempo, o reorganice su agenda
alrededor del obstáculo. Pregúntate primero: ¿existe una forma más simple de resolver el obstáculo
SIN que Ignacio cambie su horario?
Ejemplos del patrón a replicar (no limitativos):
- Si va a llover en la ventana en que Ignacio necesita salir → sugiere llevar paraguas, no
  reorganizar el horario de salida/regreso.
- Si un pendiente es un trámite presencial (ej. depósito bancario) → verifica si existe una
  alternativa digital (transferencia) que elimine el traslado.
- Aplica esta misma lógica a cualquier pendiente nuevo: busca el atajo legítimo antes de proponer
  evasión o espera.
Cuando el conflicto es un choque REAL de agenda (dos compromisos profesionales a la misma hora) y
no tiene solución logística, señálalo explícitamente en el item correspondiente del itinerario
(needsDecision: true) y pide ahí mismo que Ignacio defina la prioridad. Este es el único tipo de
pregunta permitida — nunca preguntes nada más, nunca pidas información adicional.

FUNCIONES DEL ANÁLISIS:
1. Cruza el brief personal y el brief profesional en una sola línea de tiempo del día, detectando
   conflictos que ninguno de los dos briefs por separado revela (ej. una reunión que termina justo
   en medio de la ventana de lluvia, o un pendiente personal que solo cabe en un hueco específico
   entre reuniones).
2. Señala qué pendientes de la lista combinada son candidatos a convertirse en plantilla, regla
   fija o proceso automatizado en vez de decidirse/ejecutarse manualmente cada vez (backgroundTasks).
3. Si se te da contexto de días anteriores, detecta tendencias e insights imperceptibles en el día
   a día (un tipo de tarea que siempre genera fricción, una hora donde sistemáticamente se
   acumulan choques, etc.). Solo repórtalo si es genuinamente nuevo — no relleno. Si no hay nada
   que señalar, "pattern" debe ser null.
4. Aplica el principio central de razonamiento a cada fricción detectada ANTES de entregar el
   itinerario final — el obstáculo ya debe venir resuelto dentro del texto del item (ej. "sal con
   paraguas" en vez de una nota aparte sobre el clima).

FORMATO DE SALIDA — responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, con
esta forma exacta:
{
  "headline": "línea editorial breve: ubicación y clima del día, estilo periódico",
  "items": [
    {
      "time": "hora en formato 'h:mm a.m./p.m.'",
      "title": "título corto de la acción o evento",
      "detail": "una oración con contexto suficiente — no telegráfico, con el obstáculo ya resuelto adentro si aplica",
      "isMain": true,
      "needsDecision": false
    }
  ],
  "pendingDecision": null,
  "backgroundTasks": ["pendiente delegable/automatizable, si hay alguno genuino"],
  "pattern": null
}
- "items" en orden cronológico, desde la primera acción de la mañana hasta el cierre del día.
- Exactamente UN item con "isMain": true — el de mayor peso o la primera acción del día. El resto
  con "isMain": false.
- "needsDecision": true SOLO en el item de un choque real de agenda sin solución logística; en ese
  caso "pendingDecision" lleva la pregunta exacta que se le hace a Ignacio. Si no hay choque real,
  "pendingDecision" es null y ningún item lleva needsDecision true.
- "backgroundTasks" y "pattern" son opcionales — omite relleno, solo lo genuinamente accionable o
  nuevo. Si no hay nada, usa un array vacío / null respectivamente.
- No incluyas preámbulo, no expongas tu análisis o razonamiento — el JSON es el resultado final ya
  resuelto.`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractJson(raw: string): OraculoResult {
  const match = raw.match(/\{[\s\S]*\}/);
  const jsonText = match ? match[0] : raw;
  const parsed = JSON.parse(jsonText);
  return {
    headline: parsed.headline || 'El Oráculo',
    items: Array.isArray(parsed.items) ? parsed.items : [],
    pendingDecision: parsed.pendingDecision ?? null,
    backgroundTasks: Array.isArray(parsed.backgroundTasks) ? parsed.backgroundTasks : [],
    pattern: parsed.pattern ?? null,
  };
}

function buildHistoryBlock(recentDays: OraculoDay[]): string {
  if (recentDays.length === 0) return '';
  const lines = recentDays.map((d) => {
    const itemTitles = (d.itinerary?.items || []).map((i) => i.title).join(', ');
    const pattern = d.itinerary?.pattern ? ` | patrón ya detectado ese día: ${d.itinerary.pattern}` : '';
    return `${d.brief_date}: ${itemTitles}${pattern}`;
  });
  return `HISTORIAL DE DÍAS ANTERIORES (para detectar tendencias — no repitas un patrón ya señalado salvo que haya evolucionado):\n${lines.join('\n')}`;
}

/** Extracts the professional brief's text content from a screenshot via a vision-capable model. */
export async function extractProfessionalBriefFromImage(imageBase64: string, mimeType: string): Promise<string> {
  const response = await groq.chat.completions.create({
    model: VISION_MODEL,
    max_tokens: 1500,
    temperature: 0.2,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Transcribe TODO el texto relevante de esta captura de pantalla (calendario, pendientes, correos, CRM). Responde solo con el texto extraído, organizado y legible, sin comentario adicional.',
          },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ],
      },
    ],
  });
  return response.choices[0]?.message?.content?.trim() || '';
}

// ─── Main export ────────────────────────────────────────────────────────────

export async function generateMorningBrief(
  personalBrief: string,
  professionalBrief: string,
  recentDays: OraculoDay[],
): Promise<OraculoResult> {
  const historyBlock = buildHistoryBlock(recentDays);

  const parts = [
    `BRIEF PERSONAL DE HOY:\n${personalBrief}`,
    `BRIEF PROFESIONAL DE HOY:\n${professionalBrief}`,
  ];
  if (historyBlock) parts.push(historyBlock);

  const userPrompt = parts.join('\n\n---\n\n');

  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 3000,
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  const rawText = response.choices[0]?.message?.content || '';
  if (!rawText) throw new Error('El Oráculo no generó respuesta.');
  return extractJson(rawText);
}

// ─── "Periódico Matutino" — self-contained HTML render ────────────────────

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function formatSpanishDate(dateISO: string): string {
  const d = new Date(`${dateISO}T12:00:00`);
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderNewspaperHtml(dateISO: string, result: OraculoResult): string {
  const dateLabel = formatSpanishDate(dateISO);
  const itemBlock = (item: (typeof result.items)[number], main: boolean) => `
    <article class="note ${main ? 'note--main' : ''} ${item.needsDecision ? 'note--decision' : ''}">
      <div class="note__time">${esc(item.time)}</div>
      <h3 class="note__title">${esc(item.title)}</h3>
      <p class="note__detail">${esc(item.detail)}</p>
      ${item.needsDecision ? `<p class="note__flag">⚠ Requiere tu decisión</p>` : ''}
    </article>`;

  const backgroundSection = (result.backgroundTasks && result.backgroundTasks.length > 0)
    ? `
    <section class="sidebar-section">
      <h2 class="sidebar-section__title">Tareas de fondo</h2>
      <ul class="sidebar-list">
        ${result.backgroundTasks.map((t) => `<li>${esc(t)}</li>`).join('')}
      </ul>
    </section>` : '';

  const patternSection = result.pattern
    ? `
    <section class="sidebar-section">
      <h2 class="sidebar-section__title">Patrón detectado</h2>
      <p class="sidebar-text">${esc(result.pattern)}</p>
    </section>` : '';

  const decisionBanner = result.pendingDecision
    ? `<div class="decision-banner">⚠ DECISIÓN PENDIENTE — ${esc(result.pendingDecision)}</div>`
    : '';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>El Oráculo — ${esc(dateLabel)}</title>
<style>
  :root {
    color-scheme: light;
    --paper: #f7f3ea;
    --ink: #1c1a17;
    --ink-soft: #4a463f;
    --rule: #1c1a17;
    --accent: #8a1f11;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: 'Georgia', 'Times New Roman', serif;
    padding: 32px 20px 64px;
  }
  .page { max-width: 880px; margin: 0 auto; }
  .masthead {
    text-align: center;
    border-bottom: 4px double var(--rule);
    padding-bottom: 14px;
    margin-bottom: 10px;
  }
  .masthead__title {
    font-family: 'Times New Roman', serif;
    font-weight: 900;
    letter-spacing: 4px;
    font-size: clamp(40px, 7vw, 64px);
    margin: 0;
    text-transform: uppercase;
  }
  .masthead__meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--ink-soft);
    border-top: 1px solid var(--rule);
    margin-top: 8px;
    padding-top: 6px;
  }
  .masthead__headline {
    font-style: italic;
    font-size: 15px;
    color: var(--ink-soft);
    margin: 10px 0 0;
    font-family: Georgia, serif;
  }
  .decision-banner {
    background: var(--accent);
    color: var(--paper);
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.5px;
    text-align: center;
    padding: 10px 16px;
    margin: 18px 0;
  }
  .masthead-rule {
    height: 1px;
    background: var(--rule);
    margin: 18px 0;
  }
  .layout {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 32px;
  }
  .section-label {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--ink-soft);
    border-bottom: 2px solid var(--rule);
    padding-bottom: 4px;
    margin-bottom: 14px;
  }
  .note { padding: 14px 0; border-bottom: 1px solid rgba(28,26,23,0.18); }
  .note:last-child { border-bottom: none; }
  .note--main {
    border-bottom: 2px solid var(--rule);
    padding-bottom: 20px;
    margin-bottom: 6px;
  }
  .note--main .note__title { font-size: 30px; line-height: 1.1; }
  .note--main .note__detail { font-size: 17px; column-count: 1; }
  .note--decision { background: rgba(138,31,17,0.06); padding-left: 12px; border-left: 3px solid var(--accent); }
  .note__time {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--accent);
    font-weight: 700;
    margin-bottom: 4px;
  }
  .note__title { font-size: 20px; margin: 0 0 6px; line-height: 1.25; }
  .note__detail { margin: 0; font-size: 15px; line-height: 1.55; color: var(--ink); }
  .note__flag {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: var(--accent);
    margin: 8px 0 0;
  }
  .sidebar-section { margin-bottom: 26px; }
  .sidebar-section__title {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--ink-soft);
    border-bottom: 2px solid var(--rule);
    padding-bottom: 4px;
    margin: 0 0 10px;
  }
  .sidebar-list { margin: 0; padding-left: 18px; font-size: 13.5px; line-height: 1.6; color: var(--ink-soft); }
  .sidebar-list li { margin-bottom: 8px; }
  .sidebar-text { font-size: 13.5px; line-height: 1.6; color: var(--ink-soft); margin: 0; font-style: italic; }
  @media (max-width: 640px) {
    .layout { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
  <div class="page">
    <header class="masthead">
      <h1 class="masthead__title">El Oráculo</h1>
      <div class="masthead__meta">
        <span>${esc(dateLabel)}</span>
        <span>Edición matutina de Ignacio</span>
      </div>
      <p class="masthead__headline">${esc(result.headline)}</p>
    </header>

    ${decisionBanner}

    <div class="layout">
      <main>
        <div class="section-label">Itinerario del día</div>
        ${result.items.map((item, i) => itemBlock(item, !!item.isMain || (i === 0 && !result.items.some((it) => it.isMain)))).join('')}
      </main>
      <aside>
        ${backgroundSection}
        ${patternSection}
      </aside>
    </div>
  </div>
</body>
</html>`;
}
