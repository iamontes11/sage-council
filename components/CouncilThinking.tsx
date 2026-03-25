'use client';

import { useEffect, useState } from 'react';
import { CREATORS } from '@/lib/creators';

const PHRASES = [
  'The Council deliberates…',
  'Consulting ancient wisdom…',
  'Seeking the truth…',
  'Weighing your words…',
  'The round table speaks…',
  'Wisdom converges…',
];

export default function CouncilThinking() {
  const [speakingIdx, setSpeakingIdx] = useState(0);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSpeakingIdx((prev) => (prev + 1) % CREATORS.length);
      setTick((t) => t + 1);
    }, 900);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const pi = setInterval(() => {
      setPhraseIdx((p) => (p + 1) % PHRASES.length);
    }, 2700);
    return () => clearInterval(pi);
  }, []);

  const cx = 170;
  const cy = 170;
  const tableR = 80;
  const charR = 120;
  const n = CREATORS.length;

  return (
    <div className="flex flex-col items-center gap-3 py-4 animate-fade-in">
      <svg
        width="340"
        height="340"
        viewBox="0 0 340 340"
        style={{ imageRendering: 'pixelated' }}
        className="drop-shadow-xl"
      >
        <defs>
          <radialGradient id="floorGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2a1a0e" />
            <stop offset="100%" stopColor="#0d0906" />
          </radialGradient>
          <radialGradient id="tableGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4a3020" />
            <stop offset="100%" stopColor="#2a1a0e" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Stone floor */}
        <rect width="340" height="340" fill="url(#floorGrad)" rx="8" />
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 8 }).map((_, col) => (
            <rect
              key={`tile-${row}-${col}`}
              x={col * 43}
              y={row * 43}
              width="41"
              height="41"
              fill="none"
              stroke="#1a0f08"
              strokeWidth="1"
              opacity="0.4"
            />
          ))
        )}

        {/* 4 stone pillars */}
        {[
          { x: 30, y: 30 }, { x: 298, y: 30 },
          { x: 30, y: 298 }, { x: 298, y: 298 },
        ].map((p, i) => (
          <g key={`pillar-${i}`}>
            <rect x={p.x - 10} y={p.y - 10} width="20" height="20" fill="#3a2a1a" stroke="#6a4a2a" strokeWidth="1" />
            <rect x={p.x - 8} y={p.y - 8} width="16" height="16" fill="#2a1a0e" stroke="#8a6a3a" strokeWidth="0.5" />
          </g>
        ))}

        {/* 4 torches between pillars */}
        {[
          { x: 170, y: 18 }, { x: 170, y: 322 },
          { x: 18, y: 170 }, { x: 322, y: 170 },
        ].map((t, i) => {
          const flicker = (tick + i) % 3;
          return (
            <g key={`torch-${i}`} filter="url(#glow)">
              <rect x={t.x - 3} y={t.y} width="6" height="10" fill="#6a4a2a" />
              <ellipse
                cx={t.x}
                cy={t.y - 4}
                rx={flicker === 0 ? 5 : flicker === 1 ? 4 : 6}
                ry={flicker === 0 ? 7 : flicker === 1 ? 6 : 8}
                fill={flicker === 0 ? '#ff9900' : flicker === 1 ? '#ffcc00' : '#ff6600'}
                opacity="0.9"
              />
              <ellipse cx={t.x} cy={t.y - 6} rx="2" ry="3" fill="#ffffff" opacity="0.4" />
            </g>
          );
        })}

        {/* Round table */}
        <circle cx={cx} cy={cy} r={tableR + 6} fill="#1a0f08" opacity="0.8" />
        <circle cx={cx} cy={cy} r={tableR + 4} fill="#3a2010" stroke="#6a3a10" strokeWidth="2" />
        <circle cx={cx} cy={cy} r={tableR} fill="url(#tableGrad)" stroke="#8a5a20" strokeWidth="1.5" />

        {/* Table grain lines */}
        {[-20, 0, 20].map((offset, i) => (
          <line
            key={`grain-${i}`}
            x1={cx - tableR + 10}
            y1={cy + offset}
            x2={cx + tableR - 10}
            y2={cy + offset}
            stroke="#5a3a18"
            strokeWidth="0.5"
            opacity="0.4"
          />
        ))}

        {/* Crystal ball at center */}
        <circle cx={cx} cy={cy} r="14" fill="#1a0a3a" stroke="#6a4aaa" strokeWidth="1.5" filter="url(#glow)" />
        <circle cx={cx} cy={cy} r="12" fill="#2a1a5a" opacity="0.9" />
        <ellipse cx={cx - 4} cy={cy - 4} rx="4" ry="3" fill="#8a6acc" opacity="0.6" />
        <circle cx={cx - 3} cy={cy - 5} r="2" fill="white" opacity="0.3" />
        {/* Pulse ring */}
        <circle
          cx={cx}
          cy={cy}
          r={14 + (tick % 3) * 4}
          fill="none"
          stroke="#8a6acc"
          strokeWidth="0.8"
          opacity={0.6 - (tick % 3) * 0.2}
        />

        {/* Council members */}
        {CREATORS.map((creator, i) => {
          const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
          const px = cx + charR * Math.cos(angle);
          const py = cy + charR * Math.sin(angle);
          const isSpeaking = i === speakingIdx;
          const headColor = creator.color;

          return (
            <g key={creator.id} style={{ transition: 'transform 0.3s' }}>
              {/* Glow ring when speaking */}
              {isSpeaking && (
                <circle
                  cx={px}
                  cy={py}
                  r="14"
                  fill="none"
                  stroke={headColor}
                  strokeWidth="2"
                  opacity="0.8"
                  filter="url(#glow)"
                />
              )}

              {/* Body / robe */}
              <rect
                x={px - 5}
                y={py + 7}
                width="10"
                height="12"
                fill="#1a1a2a"
                stroke="#2a2a3a"
                strokeWidth="0.5"
              />
              {/* Robe bottom flare */}
              <polygon
                points={`${px - 7},${py + 19} ${px + 7},${py + 19} ${px + 5},${py + 7} ${px - 5},${py + 7}`}
                fill="#1a1a2a"
                stroke="#2a2a3a"
                strokeWidth="0.5"
              />

              {/* Head */}
              <rect
                x={px - 5}
                y={py - 8}
                width="10"
                height="10"
                fill={headColor}
                stroke="#000"
                strokeWidth="0.5"
                rx="1"
              />

              {/* Eyes */}
              <rect x={px - 3} y={py - 5} width="2" height="2" fill="#000" />
              <rect x={px + 1} y={py - 5} width="2" height="2" fill="#000" />
              <rect x={px - 2} y={py - 5} width="1" height="1" fill="#fff" opacity="0.8" />
              <rect x={px + 2} y={py - 5} width="1" height="1" fill="#fff" opacity="0.8" />

              {/* Mouth — speaking or not */}
              {isSpeaking ? (
                <rect x={px - 2} y={py - 1} width="4" height="2" fill="#000" rx="0.5" />
              ) : (
                <rect x={px - 2} y={py - 1} width="4" height="1" fill="#000" opacity="0.6" />
              )}

              {/* Speech bubble when speaking */}
              {isSpeaking && (
                <g>
                  <rect
                    x={px - 10}
                    y={py - 28}
                    width="20"
                    height="12"
                    fill="#fffde8"
                    stroke="#bba"
                    strokeWidth="0.8"
                    rx="3"
                  />
                  {/* Tail */}
                  <polygon
                    points={`${px - 2},${py - 16} ${px + 2},${py - 16} ${px},${py - 10}`}
                    fill="#fffde8"
                  />
                  {/* Dots inside bubble */}
                  {[0, 1, 2].map((d) => (
                    <circle
                      key={d}
                      cx={px - 4 + d * 4}
                      cy={py - 22}
                      r="1.5"
                      fill={headColor}
                      opacity={tick % 3 === d ? 1 : 0.3}
                    />
                  ))}
                </g>
              )}

              {/* Name / emoji label */}
              <text
                x={px}
                y={py + 26}
                textAnchor="middle"
                fontSize="7"
                fill="#aaa"
                opacity={isSpeaking ? 1 : 0.5}
              >
                {creator.emoji}
              </text>
            </g>
          );
        })}

        {/* Ambient particles */}
        {[0, 1, 2, 3].map((p) => {
          const pAngle = ((tick * 0.05 + p * 1.57) % (2 * Math.PI));
          const pr = 100 + p * 10;
          return (
            <circle
              key={`particle-${p}`}
              cx={cx + pr * Math.cos(pAngle)}
              cy={cy + pr * Math.sin(pAngle)}
              r="1.5"
              fill="#aa88ff"
              opacity="0.4"
            />
          );
        })}
      </svg>

      {/* Phrase */}
      <p
        key={phraseIdx}
        className="text-sm text-neutral-400 font-mono tracking-wide animate-pulse"
        style={{ minHeight: '1.25rem' }}
      >
        {PHRASES[phraseIdx]}
      </p>

      {/* Emoji row */}
      <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
        {CREATORS.map((c, i) => (
          <span
            key={c.id}
            className="transition-all duration-300"
            style={{
              fontSize: i === speakingIdx ? '1.4rem' : '0.85rem',
              filter: i === speakingIdx ? `drop-shadow(0 0 6px ${c.color})` : 'none',
              opacity: i === speakingIdx ? 1 : 0.4,
            }}
          >
            {c.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
