import Anthropic from '@anthropic-ai/sdk';
import { CREATORS, FRAMEWORKS } from './creators';
import { searchTranscriptChunks } from './supabase';
import type { CouncilResponse } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// claude-sonnet-4-6 = más rápido y confiable. Usar opus si se quiere más profundidad (más lento).
const MODEL = 'claude-sonnet-4-6';
const TITLE_MODEL = 'claude-haiku-4-5-20251001';

// ─── Context builders ──────────────────────────────────────────────────────

async function buildCreatorContext(userMessage: string) {
  const contexts = await Promise.all(
    CREATORS.map(async (creator) => {
      try {
        const chunks = await searchTranscriptChunks(creator.id, userMessage, 4);
        return { creator, chunks };
      } catch {
        return { creator, chunks: [] };
      }
    })
  );
  return contexts;
}

async function buildIgnacioMindset(userMessage: string): Promise<string> {
  try {
    const bookChunks = await searchTranscriptChunks('book-ideas', userMessage, 6);
    if (bookChunks.length === 0) return '';
    return bookChunks.map((c) => c.chunk_text).join('\n').substring(0, 1800);
  } catch {
    return '';
  }
}

async function buildFrameworkContext(userMessage: string): Promise<string> {
  const sections: string[] = [];
  const nonBookFrameworks = FRAMEWORKS.filter((fw) => fw.id !== 'book-ideas');
  for (const fw of nonBookFrameworks) {
    try {
      const chunks = await searchTranscriptChunks(fw.id, userMessage, 3);
      if (chunks.length > 0) {
        sections.push(chunks.map((c) => c.chunk_text).join(' ').substring(0, 700));
      }
    } catch {
      // optional
    }
  }
  return sections.join('\n\n');
}

function buildTranscriptBlock(
  contexts: Array<{
    creator: (typeof CREATORS)[number];
    chunks: Array<{ chunk_text: string; video_title: string }>;
  }>
): string {
  return contexts
    .filter(({ chunks }) => chunks.length > 0)
    .map(({ creator, chunks }) => {
      const text = chunks.map((c) => c.chunk_text).join(' ').substring(0, 800);
      return `[${creator.name}]\n${text}`;
    })
    .join('\n\n');
}

function buildCouncilRoster(): string {
  return CREATORS.map((c) => `• ${c.name} — ${c.philosophy}`).join('\n');
}

// ─── System prompt ─────────────────────────────────────────────────────────

function buildSystemPrompt(councilRoster: string): string {
  return `Eres el SAGE COUNCIL. Los 12 miembros del consejo son:

${councilRoster}

Cada uno aporta su perspectiva basada en sus propios transcripts. Deliberan internamente y hablan con UNA sola voz — la más honesta y útil para Ignacio específicamente.

QUIÉN ES IGNACIO:
Tienes sus ideas de libro — la forma en que estructura el pensamiento, los principios que ha construido. Úsalos. Ignacio piensa en sistemas, detecta el bullshit al instante, y necesita que le hablen con precisión, no con coaching genérico.

DOS REGLAS ABSOLUTAS QUE NUNCA SE ROMPEN:

REGLA 1 — ELIMINAR DECISIONES:
Nunca presentes múltiples caminos. El consejo ya deliberó. Solo hay UNA dirección, UNA posición. No "puedes hacer X o Y". No listas. No opciones. El consejo dice: esto.

REGLA 2 — TRADUCIR A ACCIÓN CONCRETA:
Toda respuesta termina en un solo acto ejecutable en las próximas 24 horas. No un plan. No una reflexión. Un movimiento específico con suficiente detalle para que no haya ambigüedad.

CÓMO CONSTRUIR LA RESPUESTA:
1. Diagnostica qué está pasando realmente debajo de la pregunta — el problema real, no el enunciado.
2. Explica el mecanismo — por qué funciona así psicológica o sistémicamente.
3. Da la posición del consejo: clara, fundamentada, sin hedging.

TONO: Amigo muy inteligente que dice la verdad aunque incomode. Sin clichés motivacionales. Sin validación vacía. Cada oración debe ganar su lugar.

IDIOMA: Siempre español. Siempre de tú. 4-6 párrafos densos para consultas nuevas.

FORMATO: Prosa continua sin encabezados. Al terminar, en línea nueva:
PRIMER_PASO: [acto único, específico, ejecutable hoy o mañana — con suficiente detalle para no tener que pensar más]`;
}

// ─── History extraction ────────────────────────────────────────────────────

function extractAnswerText(content: string): string {
  if (content.includes('PRIMER_PASO:')) {
    return content.split(/\nPRIMER_PASO:/)[0].trim();
  }
  try {
    const parsed = JSON.parse(content);
    if (parsed.answer) {
      const parts = [parsed.answer];
      if (parsed.first_step) parts.push(`[Próximo paso: ${parsed.first_step}]`);
      return parts.join('\n\n');
    }
    if (parsed.choices && Array.isArray(parsed.choices)) {
      return parsed.choices
        .map((c: { title?: string; perspective?: string; advice?: string }) =>
          [c.title, c.perspective, c.advice].filter(Boolean).join('\n\n')
        )
        .join('\n\n---\n\n')
        .substring(0, 1200);
    }
  } catch {
    // plain text
  }
  return content;
}

function parseResponse(rawText: string): CouncilResponse {
  const parts = rawText.split(/\nPRIMER_PASO:\s*/);
  if (parts.length >= 2) {
    return {
      answer: parts[0].trim(),
      first_step: parts[1].trim(),
    };
  }
  return {
    answer: rawText.trim(),
    first_step: 'Ejecuta el movimiento más obvio que surgió de esta conversación. Hoy.',
  };
}

// ─── Main export ───────────────────────────────────────────────────────────

export async function generateCouncilResponse(
  userMessage: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<CouncilResponse> {

  const [creatorContexts, ignacioMindset, frameworkContext] = await Promise.all([
    buildCreatorContext(userMessage),
    buildIgnacioMindset(userMessage),
    buildFrameworkContext(userMessage),
  ]);

  const transcriptBlock = buildTranscriptBlock(creatorContexts);
  const systemPrompt = buildSystemPrompt(buildCouncilRoster());

  // Build layered user prompt
  const parts: string[] = [];

  if (ignacioMindset) {
    parts.push(
      `CÓMO PIENSA IGNACIO — sus propios principios y forma de ver el mundo (habla en su lenguaje):\n${ignacioMindset}`
    );
  }

  if (transcriptBlock) {
    parts.push(
      `SABIDURÍA DE LOS MIEMBROS DEL CONSEJO — de sus propios transcripts (no cites fuente, integra como perspectiva):\n${transcriptBlock}`
    );
  }

  if (frameworkContext) {
    parts.push(`CONTEXTO ADICIONAL:\n${frameworkContext}`);
  }

  parts.push(`CONSULTA DE IGNACIO:\n"${userMessage}"`);

  const userPrompt = parts.join('\n\n---\n\n');

  const recentHistory = chatHistory.slice(-10).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.role === 'assistant' ? extractAnswerText(m.content) : m.content,
  }));

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        ...recentHistory,
        { role: 'user', content: userPrompt },
      ],
    });

    const block = response.content.find((b) => b.type === 'text');
    const rawText = block && block.type === 'text' ? block.text : '';

    if (!rawText) {
      console.error('Empty response from Anthropic API');
      return buildFallbackResponse();
    }

    return parseResponse(rawText);
  } catch (error) {
    // Log the real error so we can debug
    console.error('Anthropic API error details:', JSON.stringify(error, null, 2));
    return buildFallbackResponse();
  }
}

function buildFallbackResponse(): CouncilResponse {
  return {
    answer:
      'Hubo un error conectando con el Consejo. Intenta de nuevo en un momento.',
    first_step: 'Recarga la página e intenta tu consulta nuevamente.',
    choices: [],
  };
}

export async function generateChatTitle(userMessage: string): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: TITLE_MODEL,
      max_tokens: 20,
      messages: [
        {
          role: 'user',
          content: `Genera un título muy corto (3-5 palabras) en español para una conversación que empieza con: "${userMessage.slice(0, 200)}". Responde solo el título, sin comillas ni puntuación.`,
        },
      ],
    });
    const block = response.content[0];
    return block.type === 'text' ? block.text.trim() : 'Nueva Consulta';
  } catch {
    return 'Nueva Consulta';
  }
}
