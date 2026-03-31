'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Zap, BookOpen, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CREATORS } from '@/lib/creators';
import { toast } from './Toast';
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
  'border-red-500/20 hover:border-red-500/35',
  'border-blue-500/20 hover:border-blue-500/35',
  'border-green-500/20 hover:border-green-500/35',
];

const GLOW_SHADOWS = [
  'hover:shadow-[0_0_20px_rgba(239,68,68,0.06)]',
  'hover:shadow-[0_0_20px_rgba(59,130,246,0.06)]',
  'hover:shadow-[0_0_20px_rgba(34,197,94,0.06)]',
];

const CHOICE_LABELS = ['Path One', 'Path Two', 'Path Three'];
const CHOICE_COLORS = ['text-red-400', 'text-blue-400', 'text-green-400'];

const STEP_COLORS = [
  'bg-red-500/10 border-red-500/20 text-red-300',
  'bg-blue-500/10 border-blue-500/20 text-blue-300',
  'bg-green-500/10 border-green-500/20 text-green-300',
];

const DIVIDER_COLORS = [
  'border-red-500/10',
  'border-blue-500/10',
  'border-green-500/10',
];

const ADVICE_LABEL_COLORS = [
  'text-red-400/70',
  'text-blue-400/70',
  'text-green-400/70',
];

export function ChoiceCard({ choice, index }: ChoiceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const inspiredCreators = (choice.inspired_by || [])
    .map((name) => CREATORS.find((c) => c.name === name))
    .filter(Boolean);

  const perspectiveParagraphs = (choice.perspective || '')
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);
  const perspectivePreview = perspectiveParagraphs[0] || '';
  const perspectiveRest = perspectiveParagraphs.slice(1);
  const hasMoreContent =
    perspectiveRest.length > 0 ||
    !!choice.advice ||
    !!choice.first_step ||
    !!choice.actionStep;

  const handleCopy = async () => {
    const text = [
      choice.title,
      choice.tagline,
      choice.perspective,
      choice.advice ? `\nAdvice:\n${choice.advice}` : '',
      choice.first_step ? `\nFirst step: ${choice.first_step}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast('Copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Failed to copy', 'error');
    }
  };

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br ${CARD_GRADIENTS[index]} ${CARD_BORDERS[index]} transition-all duration-200 overflow-hidden ${GLOW_SHADOWS[index]} group`}
    >
      {/* Card header */}
      <div className="p-5 space-y-3">
        {/* Label + title + copy */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${CHOICE_COLORS[index]}`}
            >
              {CHOICE_LABELS[index]}
            </span>
            <h3 className="text-white font-bold text-base leading-snug">
              {choice.title}
            </h3>
            {choice.tagline && (
              <p className="text-neutral-400 text-sm italic leading-snug">
                {choice.tagline}
              </p>
            )}
          </div>
          <button
            onClick={handleCopy}
            data-tooltip={copied ? 'Copied!' : 'Copy'}
            className="shrink-0 p-2 rounded-lg text-neutral-600 hover:text-neutral-300 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>

        {/* Inspired by */}
        {inspiredCreators.length > 0 && (
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-xs text-neutral-600 mr-0.5">Channeling</span>
            {inspiredCreators.map((creator) => (
              <span
                key={creator!.id}
                className="inline-flex items-center gap-1 text-xs bg-white/[0.04] border border-white/[0.08] rounded-full px-2.5 py-0.5 text-neutral-300 transition-colors hover:bg-white/[0.08] hover:border-white/[0.12]"
              >
                <span>{creator!.emoji}</span>
                {creator!.name}
              </span>
            ))}
          </div>
        )}

        {/* Perspective preview */}
        {perspectivePreview && (
          <p className="text-neutral-300 text-sm leading-relaxed">
            {perspectivePreview}
          </p>
        )}
      </div>

      {/* Expand / collapse toggle */}
      {hasMoreContent && (
        <div className={`px-5 pb-3 border-t ${DIVIDER_COLORS[index]}`}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors font-medium mt-3 group/btn"
          >
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={14} />
            </motion.div>
            {expanded ? 'Collapse' : 'Read full analysis'}
          </button>
        </div>
      )}

      {/* Expanded content with animation */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 space-y-5">
              {/* Remaining perspective paragraphs */}
              {perspectiveRest.length > 0 && (
                <div className="space-y-3 pt-1">
                  {perspectiveRest.map((para, i) => (
                    <p
                      key={i}
                      className="text-sm text-neutral-300 leading-relaxed"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              )}

              {/* Advice section */}
              {choice.advice && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <BookOpen
                      size={13}
                      className={ADVICE_LABEL_COLORS[index]}
                    />
                    <p
                      className={`text-xs font-semibold uppercase tracking-wider ${ADVICE_LABEL_COLORS[index]}`}
                    >
                      Practical Guidance
                    </p>
                  </div>
                  <div className="space-y-3">
                    {choice.advice.split('\n\n').map((para, i) => (
                      <p
                        key={i}
                        className="text-sm text-neutral-300 leading-relaxed"
                      >
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* First step / action step */}
              {(choice.first_step || choice.actionStep) && (
                <div
                  className={`flex gap-3 p-4 rounded-xl border ${STEP_COLORS[index]}`}
                >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
