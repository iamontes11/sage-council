'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Zap, BookOpen } from 'lucide-react';
import { CREATORS } from '@/lib/creators';
import type { CouncilChoice } from '@/types';

interface ChoiceCardProps {
  choice: CouncilChoice;
  index: number;
}

const CARD_GRADIENTS = [
  'from-red-500/10 via-orange-500/5 to-transparent',
  'from-blue-500/10 via-indigo-500/5 to-transparent',
  'from-green-500/10 via-teal-500/5 to-transparent',
];

const CARD_BORDERS = [
  'border-red-500/20 hover:border-red-500/40',
  'border-blue-500/20 hover:border-blue-500/40',
  'border-green-500/20 hover:border-green-500/40',
];

const CHOICE_LABELS = ['Path One', 'Path Two', 'Path Three'];
const CHOICE_COLORS = ['text-red-400', 'text-blue-400', 'text-green-400'];
const STEP_COLORS = [
  'bg-red-500/10 border-red-500/20 text-red-300',
  'bg-blue-500/10 border-blue-500/20 text-blue-300',
  'bg-green-500/10 border-green-500/20 text-green-300',
];
const DIVIDER_COLORS = ['border-red-500/10', 'border-blue-500/10', 'border-green-500/10'];
const ADVICE_LABEL_COLORS = ['text-red-400/70', 'text-blue-400/70', 'text-green-400/70'];

export function ChoiceCard({ choice, index }: ChoiceCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Map inspired_by names to creator objects
  const inspiredCreators = (choice.inspired_by || [])
    .map((name) => CREATORS.find((c) => c.name === name))
    .filter(Boolean);

  // Split perspective into preview (first paragraph) and the rest
  const perspectiveParagraphs = (choice.perspective || '')
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);
  const perspectivePreview = perspectiveParagraphs[0] || '';
  const perspectiveRest = perspectiveParagraphs.slice(1);

  const hasMoreContent =
    perspectiveRest.length > 0 || !!choice.advice || !!choice.first_step || !!choice.actionStep;

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br ${CARD_GRADIENTS[index]} ${CARD_BORDERS[index]} border transition-all duration-200 overflow-hidden`}
    >
      {/* Card header */}
      <div className="p-5 space-y-3">
        {/* Label + title */}
        <div className="space-y-1.5">
          <span className={`text-xs font-semibold uppercase tracking-wider ${CHOICE_COLORS[index]}`}>
            {CHOICE_LABELS[index]}
          </span>
          <h3 className="text-white font-bold text-base leading-snug">{choice.title}</h3>
          {choice.tagline && (
            <p className="text-neutral-400 text-sm italic leading-snug">{choice.tagline}</p>
          )}
        </div>

        {/* Inspired by */}
        {inspiredCreators.length > 0 && (
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-xs text-neutral-600 mr-0.5">Channeling</span>
            {inspiredCreators.map((creator) => (
              <span
                key={creator!.id}
                className="inline-flex items-center gap-1 text-xs bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5 text-neutral-300"
              >
                <span>{creator!.emoji}</span>
                {creator!.name}
              </span>
            ))}
          </div>
        )}

        {/* Perspective preview -- always visible */}
        {perspectivePreview && (
          <p className="text-neutral-300 text-sm leading-relaxed">{perspectivePreview}</p>
        )}
      </div>

      {/* Expand / collapse */}
      {hasMoreContent && (
        <div className={`px-5 pb-3 border-t ${DIVIDER_COLORS[index]}`}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors font-medium mt-3"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Collapse' : 'Read full analysis'}
          </button>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-6 space-y-5">
          {/* Remaining perspective paragraphs */}
          {perspectiveRest.length > 0 && (
            <div className="space-y-3 pt-1">
              {perspectiveRest.map((para, i) => (
                <p key={i} className="text-sm text-neutral-300 leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          )}

          {/* Advice section */}
          {choice.advice && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <BookOpen size={13} className={ADVICE_LABEL_COLORS[index]} />
                <p className={`text-xs font-semibold uppercase tracking-wider ${ADVICE_LABEL_COLORS[index]}`}>
                  Practical Guidance
                </p>
              </div>
              <div className="space-y-3">
                {choice.advice.split('\n\n').map((para, i) => (
                  <p key={i} className="text-sm text-neutral-300 leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* First step / action step */}
          {(choice.first_step || choice.actionStep) && (
            <div className={`flex gap-3 p-4 rounded-xl border ${STEP_COLORS[index]}`}>
              <Zap size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 opacity-70">
                  First step (next 24-48 hours)
                </p>
                <p className="text-sm font-medium leading-relaxed">
                  {choice.first_step || choice.actionStep}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
