'use client';

import { useEffect, useRef, useState } from 'react';
import { CREATORS } from '@/lib/creators';

type Mode = 'idle' | 'thinking' | 'responding';

interface Props {
  mode?: Mode;
  thinking?: boolean; // backwards compat — true maps to 'thinking'
}

// ─── Pixel palette ───────────────────────────────────────────────────────────
const WOOD   = '#8B5E3C';
const STONE  = '#6B7280';
const FLOOR  = '#2D2A24';
const FLOOR2 = '#252220';
const TABLE  = '#5C3D1E';
const TABLE_EDGE = '#3D2710';
const FELT   = '#1A3A2A';
const GOLD   = '#C9A84C';
const TORCH  = '#FF8C00';
const TORCH2 = '#FFD700';
const WALL   = '#1C1917';
const WALL2  = '#1A1714';
const CANDLE = '#FFFDE7';

// Agent colours (one per creator, cycling)
const AGENT_COLORS = [
  '#7C3AED','#0891B2','#059669','#D97706','#DC2626',
  '#7C3AED','#2563EB','#10B981','#F59E0B','#EF4444',
  '#8B5CF6','#06B6D4',
];

const W = 340, H = 340;
const CX = 170, CY = 185;
const TABLE_R = 72;
const ROOM_PAD = 28;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function rnd(lo: number, hi: number) { return lo + Math.random() * (hi - lo); }
function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

// ─── Build seat positions around the table ────────────────────────────────────
function buildSeats(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: CX + Math.cos(a) * (TABLE_R + 14), y: CY + Math.sin(a) * (TABLE_R + 14) };
  });
}

// ─── Agent state ──────────────────────────────────────────────────────────────
interface Agent {
  x: number; y: number;       // current position
  tx: number; ty: number;     // target position (wander)
  sx: number; sy: number;     // seat position
  vx: number; vy: number;     // velocity
  color: string;
  emoji: string;
  name: string;
  phase: number;              // animation phase offset
  workPhase: number;          // working anim offset
  blinkT: number;             // blink timer
  seated: boolean;
  bobY: number;               // bob offset
  dotPhase: number;           // thinking dots phase
}

function buildAgents(creators: typeof CREATORS): Agent[] {
  const seats = buildSeats(creators.length);
  return creators.map((c, i) => {
    const angle = rnd(0, Math.PI * 2);
    const r = rnd(TABLE_R + 30, 120);
    const x = clamp(CX + Math.cos(angle) * r, ROOM_PAD + 8, W - ROOM_PAD - 8);
    const y = clamp(CY + Math.sin(angle) * r, ROOM_PAD + 8, H - ROOM_PAD - 8);
    return {
      x, y, tx: x, ty: y,
      sx: seats[i].x, sy: seats[i].y,
      vx: 0, vy: 0,
      color: AGENT_COLORS[i % AGENT_COLORS.length],
      emoji: c.emoji || '🤖',
      name: c.name,
      phase: rnd(0, Math.PI * 2),
      workPhase: rnd(0, Math.PI * 2),
      blinkT: rnd(0, 4000),
      seated: false,
      bobY: 0,
      dotPhase: rnd(0, Math.PI * 2),
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CouncilThinking({ mode, thinking }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const agentsRef = useRef<Agent[]>([]);
  const rafRef    = useRef<number>(0);
  const t0Ref     = useRef<number>(0);
  const modeRef   = useRef<Mode>('idle');

  // Resolve effective mode
  const effectiveMode: Mode = mode ?? (thinking ? 'thinking' : 'idle');

  // Sync mode ref so animation loop sees it without re-creating
  useEffect(() => { modeRef.current = effectiveMode; }, [effectiveMode]);

  // Current phrase for bottom label
  const [label, setLabel] = useState('');
  const labelRef = useRef('');

  const IDLE_PHRASES   = ['Gathering knowledge…','Surveying the realm…','Awaiting consultation…','Studying the archives…','In council…'];
  const THINK_PHRASES  = ['Deliberating…','Cross-referencing sources…','Synthesising perspectives…','Running deep analysis…','Consulting the scrolls…'];
  const RESP_PHRASES   = ['Formulating response…',"Drafting the council's answer…",'Presenting findings…','Sharing expert views…','Delivering insight…'];

  useEffect(() => {
    const pool = effectiveMode === 'thinking' ? THINK_PHRASES
               : effectiveMode === 'responding' ? RESP_PHRASES
               : IDLE_PHRASES;
    const pick = () => {
      const p = pool[Math.floor(Math.random() * pool.length)];
      labelRef.current = p;
      setLabel(p);
    };
    pick();
    const id = setInterval(pick, 3200);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // Init agents once
    if (agentsRef.current.length === 0) {
      agentsRef.current = buildAgents(CREATORS);
    }
    const agents = agentsRef.current;
    t0Ref.current = performance.now();

    // ── Torch positions (corners) ──
    const torches = [
      { x: ROOM_PAD + 6, y: ROOM_PAD + 6 },
      { x: W - ROOM_PAD - 6, y: ROOM_PAD + 6 },
      { x: ROOM_PAD + 6, y: H - ROOM_PAD - 6 },
      { x: W - ROOM_PAD - 6, y: H - ROOM_PAD - 6 },
    ];

    // ── Particle pool ──
    const particles: { x:number; y:number; vx:number; vy:number; life:number; maxLife:number; color:string }[] = [];

    function spawnParticle(x: number, y: number, color: string) {
      if (particles.length > 60) return;
      particles.push({
        x, y,
        vx: rnd(-0.6, 0.6),
        vy: rnd(-1.2, -0.3),
        life: 1,
        maxLife: rnd(30, 70),
        color,
      });
    }

    // ── Drawing helpers ──
    function drawRoom() {
      // Floor checkerboard (subtle)
      const tileW = 20;
      for (let gy = 0; gy * tileW < H; gy++) {
        for (let gx = 0; gx * tileW < W; gx++) {
          ctx.fillStyle = (gx + gy) % 2 === 0 ? FLOOR : FLOOR2;
          ctx.fillRect(gx * tileW, gy * tileW, tileW, tileW);
        }
      }
      // Walls (border)
      ctx.fillStyle = WALL;
      ctx.fillRect(0, 0, W, ROOM_PAD);
      ctx.fillRect(0, H - ROOM_PAD, W, ROOM_PAD);
      ctx.fillRect(0, 0, ROOM_PAD, H);
      ctx.fillRect(W - ROOM_PAD, 0, ROOM_PAD, H);
      // Wall highlights
      ctx.fillStyle = WALL2;
      ctx.fillRect(ROOM_PAD, ROOM_PAD, W - ROOM_PAD * 2, 2);
      ctx.fillRect(ROOM_PAD, H - ROOM_PAD - 2, W - ROOM_PAD * 2, 2);
      ctx.fillRect(ROOM_PAD, ROOM_PAD, 2, H - ROOM_PAD * 2);
      ctx.fillRect(W - ROOM_PAD - 2, ROOM_PAD, 2, H - ROOM_PAD * 2);
    }

    function drawTorch(tx: number, ty: number, t: number) {
      // bracket
      ctx.fillStyle = STONE;
      ctx.fillRect(tx - 3, ty + 2, 6, 5);
      ctx.fillStyle = WOOD;
      ctx.fillRect(tx - 1, ty - 4, 3, 8);

      // flicker
      const flk = 0.7 + 0.3 * Math.sin(t * 8 + tx);
      const size = 6 * flk;

      // glow
      const g = ctx.createRadialGradient(tx, ty - 6, 0, tx, ty - 6, 18 * flk);
      g.addColorStop(0, `rgba(255,180,0,${0.25 * flk})`);
      g.addColorStop(1, 'rgba(255,120,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(tx, ty - 6, 18 * flk, 0, Math.PI * 2);
      ctx.fill();

      // flame body
      ctx.fillStyle = TORCH;
      ctx.beginPath();
      ctx.ellipse(tx, ty - 4, size * 0.5, size, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TORCH2;
      ctx.beginPath();
      ctx.ellipse(tx, ty - 2, size * 0.25, size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = CANDLE;
      ctx.beginPath();
      ctx.arc(tx, ty - 1, size * 0.12, 0, Math.PI * 2);
      ctx.fill();

      // emit particles occasionally
      if (Math.random() < 0.15) spawnParticle(tx + rnd(-2, 2), ty - 8, TORCH);
    }

    function drawTable(t: number) {
      // Shadow
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(CX + 6, CY + 10, TABLE_R + 4, (TABLE_R + 4) * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Glow under table (consulting mode)
      if (modeRef.current !== 'idle') {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.5);
        const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, TABLE_R + 20);
        g.addColorStop(0, `rgba(100,200,120,${0.12 * pulse})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(CX, CY, TABLE_R + 20, (TABLE_R + 20) * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Table edge
      ctx.fillStyle = TABLE_EDGE;
      ctx.beginPath();
      ctx.ellipse(CX, CY + 6, TABLE_R + 2, (TABLE_R + 2) * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      // Table top
      ctx.fillStyle = TABLE;
      ctx.beginPath();
      ctx.ellipse(CX, CY, TABLE_R, TABLE_R * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      // Felt surface
      ctx.fillStyle = FELT;
      ctx.beginPath();
      ctx.ellipse(CX, CY, TABLE_R - 8, (TABLE_R - 8) * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();

      // Gold trim
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(CX, CY, TABLE_R - 8, (TABLE_R - 8) * 0.52, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Candle in centre
      const candleFlk = 0.8 + 0.2 * Math.sin(t * 6);
      ctx.fillStyle = '#D4B896';
      ctx.fillRect(CX - 2, CY - 12, 4, 12);
      ctx.fillStyle = TORCH;
      ctx.beginPath();
      ctx.ellipse(CX, CY - 14, 3 * candleFlk, 5 * candleFlk, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = CANDLE;
      ctx.beginPath();
      ctx.arc(CX, CY - 12, 1.5 * candleFlk, 0, Math.PI * 2);
      ctx.fill();

      // Glow around candle
      const cg = ctx.createRadialGradient(CX, CY - 12, 0, CX, CY - 12, 24 * candleFlk);
      cg.addColorStop(0, `rgba(255,220,100,${0.15 * candleFlk})`);
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(CX, CY - 12, 24 * candleFlk, 0, Math.PI * 2);
      ctx.fill();

      // Papers/scrolls on table
      const scrolls = [[-20, 8],[18, -5],[2, 16],[-12, -12]];
      for (const [sx, sy] of scrolls) {
        ctx.fillStyle = 'rgba(235,220,180,0.6)';
        ctx.save();
        ctx.translate(CX + sx, CY + sy * 0.55);
        ctx.rotate(sx * 0.04);
        ctx.fillRect(-5, -3, 10, 6);
        ctx.strokeStyle = 'rgba(160,120,60,0.4)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-5, -3, 10, 6);
        ctx.restore();
      }
    }

    function drawAgent(a: Agent, t: number) {
      const { x, y, color, emoji, phase, seated, workPhase, blinkT, dotPhase } = a;
      const bob = seated ? Math.sin(t * 1.5 + workPhase) * 1.5 : Math.sin(t * 2 + phase) * 2.5;
      const ry = y + bob;

      // Shadow
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(x, ry + 10, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Body
      const bodyH = 14;
      const bodyW = 12;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x - bodyW / 2, ry - bodyH / 2, bodyW, bodyH, 4);
      ctx.fill();

      // Darker overlay bottom half (robe)
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.roundRect(x - bodyW / 2, ry, bodyW, bodyH / 2, [0, 0, 4, 4]);
      ctx.fill();

      // Head
      ctx.fillStyle = '#F5CBA7';
      ctx.beginPath();
      ctx.arc(x, ry - bodyH / 2 - 5, 6, 0, Math.PI * 2);
      ctx.fill();

      // Eyes (blink)
      const blink = ((t * 1000 + blinkT) % 4000) < 150;
      const eyeH = blink ? 0.5 : 2;
      ctx.fillStyle = '#2D1B00';
      ctx.fillRect(x - 3, ry - bodyH / 2 - 7, 1.5, eyeH);
      ctx.fillRect(x + 1.5, ry - bodyH / 2 - 7, 1.5, eyeH);

      // Emoji badge
      ctx.font = '8px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, x, ry - bodyH / 2 - 5);

      // Working anim (seated + active mode)
      if (seated && modeRef.current !== 'idle') {
        // Arms writing
        const armAngle = Math.sin(t * 3 + workPhase) * 0.4;
        ctx.strokeStyle = '#F5CBA7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 4, ry - 2);
        ctx.lineTo(x - 4 + Math.cos(armAngle) * 8, ry + Math.sin(armAngle) * 4);
        ctx.stroke();
      }

      // Thinking dots (thinking mode only)
      if (modeRef.current === 'thinking') {
        const dotCount = 3;
        for (let d = 0; d < dotCount; d++) {
          const dPhase = (t * 4 + dotPhase + d * 0.6) % (Math.PI * 2);
          const dotY   = ry - bodyH / 2 - 16 - Math.abs(Math.sin(dPhase)) * 5;
          const alpha  = 0.4 + 0.6 * Math.abs(Math.sin(dPhase));
          ctx.globalAlpha = alpha;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x - 4 + d * 4, dotY, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // Name label (when idle or consulting — show briefly)
      // Not rendered to keep scene clean; emoji is the identity marker
    }

    function updateParticles() {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy *= 0.98;
        p.life -= 1 / p.maxLife;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life * 0.7;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5 * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // ── Agent movement ──
    function updateAgents(t: number, dt: number) {
      const m = modeRef.current;
      const speed = m === 'idle' ? 0.6 : 0;
      const seatLerp = m !== 'idle' ? 0.04 : 0.008;

      for (const a of agents) {
        if (m !== 'idle') {
          // Move toward seat
          a.x = lerp(a.x, a.sx, seatLerp);
          a.y = lerp(a.y, a.sy, seatLerp);
          a.seated = dist(a.x, a.y, a.sx, a.sy) < 8;
          // Reset wander target to current pos so it starts from seat when going idle
          a.tx = a.x; a.ty = a.y;
        } else {
          a.seated = false;
          // Wander
          if (dist(a.x, a.y, a.tx, a.ty) < 5) {
            // Pick new target
            const angle = rnd(0, Math.PI * 2);
            const r     = rnd(30, 120);
            a.tx = clamp(CX + Math.cos(angle) * r, ROOM_PAD + 12, W - ROOM_PAD - 12);
            a.ty = clamp(CY + Math.sin(angle) * r, ROOM_PAD + 12, H - ROOM_PAD - 12);
          }
          const dx = a.tx - a.x;
          const dy = a.ty - a.y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d > 1) {
            a.vx = lerp(a.vx, (dx / d) * speed, 0.08);
            a.vy = lerp(a.vy, (dy / d) * speed, 0.08);
          }
          // Collision avoidance with table
          const td = dist(a.x + a.vx, a.y + a.vy, CX, CY);
          if (td < TABLE_R + 16) {
            const ang = Math.atan2(a.y - CY, a.x - CX);
            a.vx += Math.cos(ang) * 0.5;
            a.vy += Math.sin(ang) * 0.5;
          }
          a.x += a.vx;
          a.y += a.vy;
          a.x  = clamp(a.x, ROOM_PAD + 10, W - ROOM_PAD - 10);
          a.y  = clamp(a.y, ROOM_PAD + 10, H - ROOM_PAD - 10);
        }
      }
    }

    // ── Main loop ──
    let prev = performance.now();
    function frame(now: number) {
      const dt = (now - prev) / 1000;
      prev = now;
      const t  = (now - t0Ref.current) / 1000;

      ctx.clearRect(0, 0, W, H);

      drawRoom();

      // Torch fire
      for (const tr of torches) drawTorch(tr.x, tr.y, t);

      // Particles over torches (under table so they don't overlay agents)
      updateParticles();

      drawTable(t);

      // Sort agents by Y so front ones draw over back ones
      const sorted = [...agents].sort((a, b) => a.y - b.y);
      for (const a of sorted) drawAgent(a, t);

      updateAgents(t, dt);

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  // Only run once — mode changes are handled via modeRef
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative rounded-xl overflow-hidden border border-stone-700/60 shadow-2xl"
        style={{ background: '#1C1917' }}
      >
        <canvas ref={canvasRef} width={W} height={H} style={{ display: 'block' }} />
        {/* Mode badge */}
        <div
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-mono font-semibold tracking-wide"
          style={{
            background: effectiveMode === 'idle' ? 'rgba(40,40,40,0.75)'
                      : effectiveMode === 'thinking' ? 'rgba(124,58,237,0.75)'
                      : 'rgba(5,150,105,0.75)',
            color: '#F5F5DC',
            backdropFilter: 'blur(4px)',
          }}
        >
          {effectiveMode === 'idle' ? '● IDLE' : effectiveMode === 'thinking' ? '◆ THINKING' : '▶ RESPONDING'}
        </div>
      </div>
      {/* Scrolling label */}
      <p
        className="text-xs text-stone-400 font-mono tracking-wide text-center"
        style={{ minHeight: '1.25em' }}
      >
        {label}
      </p>
    </div>
  );
}
