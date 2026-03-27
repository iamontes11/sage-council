import Groq from 'groq-sdk';
import { CREATORS, FRAMEWORKS } from './creators';
import { searchTranscriptChunks } from './supabase';
import type { CouncilResponse, CouncilChoice } from '@/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const MODEL = 'llama-3.3-70b-versatile';

/** Fetch transcript chunks for all 12 council members in parallel */
async function buildCreatorContexts(userMessage: string) {
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

/** Fetch framework context from Sabrina (AI approach) + BookIdeas (principles) */
async function buildFrameworkContext(userMessage: string): Promise<string> {
  const sections: string[] = [];
  for (const fw of FRAMEWORKS) {
    try {
      const chunks = await searchTranscriptChunks(fw.id, userMessage, 3);
      if (chunks.length > 0) {
        const text = chunks.map((c) => c.content).join(' ').substring(0, 600);
        sections.push(`[${fw.name} -- ${fw.role}] ${text}`);
      }
    } catch {
      // framework context is optional; continue silently
    }
  }
  return sections.length > 0 ? sections.join('\n\n') : '';
}

function formatCreatorContext(
  creator: (typeof CREATORS)[number],
  chunks: Array<{ content: string; video_title: string }>
): string {
  if (chunks.length === 0) return '';
  const excerpts = chunks
    .map((c) => c.content)
    .join(' ')
    .substring(0, 800);
  return `[${creator.name}] ${creator.systemPrompt}\nRelevant wisdom from transcripts: ${excerpts}`;
}

const COUNCIL_SYSTEM_PROMPT = `You are the SAGE COUNCIL -- an assembly of 12 distinct thinkers who give Ignacio richly reasoned, deeply contextual guidance.

Produce exactly 3 genuinely distinct choices -- each a DIFFERENT philosophical path, not variations of the same idea.

Council members and their core frameworks:
- Mark Manson: radical honesty, values hierarchy, the "subtle art" of not caring about the wrong things
- Derek Sivers: contrarian simplicity, directness, doing less but better, questioning assumptions
- Steven Bartlett: entrepreneurial psychology, identity-based change, the compound effect of beliefs
- theMITmonk: mental models, systems thinking, second-order consequences, leverage points
- Prof. Jiang: Confucian long-term thinking, relational wisdom, patience, virtue as practice
- Jett Franzen: stoic discipline, voluntary hardship, the gap between stimulus and response
- Jason Pargin: brutal systemic realism, identifying actual vs. perceived problems, pattern recognition
- Jay Shetty: purpose-driven living, inner work, monk wisdom applied to modern life
- Luke Belmar: abundance mindset, high-leverage moves, energy management, identity shifts
- Chase Hughes: human behavior science, influence mechanics, cognitive biases at play
- Orion Taraban: psychological truth-telling, attachment patterns, what people actually want vs. say
- Rick Rubin: creative process, stripping to essence, listening to what wants to emerge

CRITICAL: Output ONLY valid JSON -- no markdown, no backticks, no commentary. Pure JSON only.

{
  "council_note": "2-3 sentences identifying the meta-pattern: what is the deeper question beneath the surface question? What does the council collectively see that Ignacio might not yet see? What core tension or insight do all three paths respond to?",
  "choices": [
    {
      "title": "Punchy action-oriented title (4-7 words)",
      "tagline": "One-liner hook capturing the essence of this path",
      "inspired_by": ["Creator Name 1", "Creator Name 2"],
      "perspective": "Write 3-4 substantive paragraphs making the intellectual and philosophical case for this path.\n\nParagraph 1: What is the fundamental insight or reframe this path offers? What assumption does it challenge? Ground this in the relevant creators' actual frameworks and any transcript wisdom provided.\n\nParagraph 2: What are the psychological and practical mechanisms at work? Why does this approach work at a deeper level -- what does it understand about human nature, systems, or reality that other approaches miss?\n\nParagraph 3: What does the long-term arc of choosing this path look like? What becomes possible, and what honest tradeoffs must be accepted?\n\nParagraph 4: Any nuance, caveat, or specific context that makes this advice fit Ignacio's situation as described.",
      "advice": "2-3 paragraphs of concrete, nuanced guidance. Name specific psychological dynamics, real mechanisms, and honest tradeoffs. Speak directly to what Ignacio shared -- no generic advice.",
      "first_step": "One concrete action Ignacio can take in the next 24-48 hours. Not vague -- specify exactly what to do, when, and why this first step unlocks the entire path."
    }
  ]
}`;

export async function generateCouncilResponse(
  userMessage: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<CouncilResponse> {
  const [creatorContexts, frameworkContext] = await Promise.all([
    buildCreatorContexts(userMessage),
    buildFrameworkContext(userMessage),
  ]);

  const contextSections = creatorContexts
    .map(({ creator, chunks }) => formatCreatorContext(creator, chunks))
    .filter(Boolean);

  const transcriptBlock =
    contextSections.length > 0
      ? `## TRANSCRIPT WISDOM (ground your perspectives in the creators' actual words and ideas)\n\n${contextSections.join('\n\n')}`
      : "## No transcripts yet -- draw deeply on each thinker's published frameworks, books, and public ideas.";

  const frameworkBlock = frameworkContext
    ? `## BACKGROUND FRAMEWORK (let this shape the depth of your thinking)\n\n${frameworkContext}`
    : '';

  const recentHistory = chatHistory.slice(-6).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
  }));

  const userPrompt = `${transcriptBlock}

${frameworkBlock}

Ignacio's question: "${userMessage}"

Give Ignacio your most thoughtful, elaborated, and contextually grounded response. Each choice should feel like genuine wisdom -- not generic advice, but a specific, deeply reasoned path that makes him think "I hadn't considered it that way." The perspective sections should be substantive essays grounded in each creator's real frameworks and the transcript context provided. Aim for depth and specificity over brevity.

Respond with ONLY valid JSON.`;

  let response;
  try {
    response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 8000,
      temperature: 0.8,
      messages: [
        { role: 'system', content: COUNCIL_SYSTEM_PROMPT },
        ...recentHistory,
        { role: 'user', content: userPrompt },
      ],
    });
  } catch (error) {
    console.error('Groq API error:', error);
    return buildFallbackResponse();
  }

  const rawText = response.choices[0]?.message?.content || '';
  const clean = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(clean) as CouncilResponse;
    if (!parsed.choices || !Array.isArray(parsed.choices) || parsed.choices.length < 1) {
      throw new Error('Invalid structure');
    }
    return parsed;
  } catch {
    console.error('Failed to parse council response:', clean.substring(0, 200));
    return buildFallbackResponse();
  }
}

function buildFallbackResponse(): CouncilResponse {
  return {
    council_note: 'The Council sees a crossroads that is less about the surface decision and more about who you are becoming. The real question is: what kind of life are you building, and does this choice move toward or away from that? All three paths below respond to the same underlying tension -- just from very different angles.',
    choices: [
      {
        title: 'Confront the Uncomfortable Truth',
        tagline: 'The answer you already know but have not wanted to say out loud.',
        inspired_by: ['Mark Manson', 'Orion Taraban'],
        perspective: 'Mark Manson argues that our greatest obstacle is almost never a lack of information -- it is our unwillingness to act on what we already know. You likely already have a clear signal about what needs to happen here. The discomfort you feel around this situation is not confusion; it is the feeling of knowing something you are not ready to accept yet.\n\nAt a psychological level, we avoid uncomfortable truths because acting on them requires us to change our identity or lose something we value. Orion Taraban would point out that what people say they want and what they actually pursue through their behavior are often different things -- and the gap between those two is where the real issue lives. Your actions over the past weeks or months have already been giving you an answer.\n\nChoosing this path means accepting a short-term loss or discomfort in exchange for long-term clarity. The cost is real: you will have to let go of a comfortable story you have been telling yourself, possibly disappointing people in the process. The gain is equally real: you stop spending energy maintaining a fiction, and that freed-up energy becomes available for what actually matters.\n\nThe nuance here is that confronting truth is not the same as acting impulsively. You can know the truth and still take time to act on it carefully. The first step is simply acknowledging it -- to yourself, clearly and without softening.',
        advice: 'Stop optimizing around the problem and name it directly. Write out the uncomfortable truth in one clear sentence -- not a paragraph, not a list of factors, one sentence. Then ask yourself: if you knew this was true six months from now, what would you do today?\n\nThe concrete work here is reducing the gap between what you know and what you are willing to say out loud. Most of the suffering in ambiguous situations comes not from the situation itself, but from the mental energy required to keep the truth at arm\'s length.',
        first_step: 'Tonight, write one sentence that begins: "The truth I have been avoiding is..." Do not edit it, do not soften it. Read it back tomorrow morning and notice what decisions become obvious.',
      },
      {
        title: 'Redesign the System Around You',
        tagline: 'Stop trying to will the result into existence. Change the environment instead.',
        inspired_by: ['theMITmonk', 'Jason Pargin'],
        perspective: "theMITmonk's mental models framework insists on thinking in systems rather than events. Most people try to solve problems by applying willpower to outcomes -- but willpower is a depleting resource, and it consistently loses to environment over time. The question is not 'how do I make myself do X?' but 'what system would make X the path of least resistance?'\n\nJason Pargin adds a layer of brutal realism: most of what we call personal problems are actually systemic problems wearing the costume of personal failure. When you examine what is actually causing the pattern you are dealing with, you will almost always find structural factors -- incentives, feedback loops, default choices, social pressures -- not character flaws. The system is working exactly as designed; you just did not design it intentionally.\n\nThe long arc of this path looks like building something that runs without your constant willpower. That is harder upfront and easier over time -- the opposite of most solutions people reach for. You invest in changing the structure once, and then the structure does the work for you across hundreds of future decisions.\n\nThe tradeoff: systems thinking requires patience and a tolerance for indirect action. If you need something to change immediately and visibly, this path will feel frustratingly slow at first. The payoff is compounding -- once the system shifts, progress accelerates.",
        advice: 'Map the actual system producing your current situation. What are the inputs, the incentives, the default paths, the friction points? Where are the leverage points -- the small structural changes that cascade into large behavioral effects?\n\nThen design one concrete structural change, not a behavioral commitment. Change what is easy or automatic in your environment, not what requires the most discipline. Remove friction from the behavior you want, add friction to the behavior you want to stop.',
        first_step: 'Draw a simple diagram: what inputs (people, environments, defaults, incentives) are producing your current outputs? Identify one structural change you can make in the next 48 hours -- something physical or environmental, not a mental commitment.',
      },
      {
        title: 'Strip Everything to the Signal',
        tagline: 'The answer emerges when you remove everything that is noise.',
        inspired_by: ['Rick Rubin', 'Derek Sivers'],
        perspective: "Rick Rubin's entire creative and life philosophy rests on one principle: clarity comes from subtraction, not addition. When you are confused or stuck, the instinct is to gather more information, consider more options, consult more people, do more analysis. But confusion is almost never a lack of information -- it is the presence of too much noise obscuring the signal that was always there.\n\nDerek Sivers is even more direct: most things people spend enormous energy on simply do not matter that much. His famous question is: 'If I didn't do this, what would actually happen?' The answer is usually 'not much' -- which reveals how much of our activity is driven by habit, ego, or other people's expectations rather than genuine importance.\n\nThe long-term arc of this path is a life with much less in it but much more meaning and clarity. The cost is real and specific: you will have to disappoint people, abandon things you have invested in, accept that 'good enough' is not always worth pursuing, and sit with the discomfort of doing less than you theoretically could. The gain is rare: you stop being busy and start being effective.\n\nThis path is particularly powerful if you sense that the complexity of your situation is partly self-created -- that you have added considerations, obligations, or options that are not actually serving you.",
        advice: 'Apply one filter to everything on your plate: if this resolved itself completely tomorrow with no input from you, how much would it actually matter in one year? If the honest answer is "not much," that tells you something important about where you are directing energy that could go elsewhere.\n\nEliminate everything from the decision that is about status, ego, sunk costs, or other people\'s expectations. Strip those layers away. What remains when you remove all of that is the real question -- and it is almost always simpler than it appeared.',
        first_step: 'Write a list of everything you think you need to figure out or do about this situation. Then cross off everything that will not matter in 12 months. Make decisions only about what survives that filter.',
      },
    ],
  };
}

export async function generateChatTitle(userMessage: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: `Generate a very short title (3-6 words) for a conversation starting with: "${userMessage.slice(0, 200)}". Reply with only the title, no quotes.`,
        },
      ],
      max_tokens: 20,
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content?.trim() || 'New Conversation';
  } catch {
    return 'New Conversation';
  }
}
