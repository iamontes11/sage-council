'use client';
import { useEffect, useRef } from 'react';

// \u2500\u2500 12 knights of the round table \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const KNIGHTS = [
  { name: 'Mark Manson',     emoji: '🪨', color: '#A07850', robe: '#6B4C2A' },
  { name: 'Derek Sivers',    emoji: '🚢', color: '#C86060', robe: '#8B2525' },
  { name: 'Steven Bartlett', emoji: '🚀', color: '#5080D8', robe: '#1E3A8A' },
  { name: 'theMITmonk',      emoji: '\u26A1', color: '#E8C030', robe: '#7A6010' },
  { name: 'Prof. Jiang',     emoji: '🔬', color: '#38C880', robe: '#1A5E3A' },
  { name: 'Jett Franzen',    emoji: '🎭', color: '#C045C8', robe: '#6A0E70' },
  { name: 'Jason Pargin',    emoji: '🔍', color: '#909090', robe: '#404040' },
  { name: 'Jay Shetty',      emoji: '🧘', color: '#38A8D8', robe: '#184A6A' },
  { name: 'Luke Belmar',     emoji: '🔥', color: '#FF5E1A', robe: '#8B1A00' },
  { name: 'Chase Hughes',    emoji: '🧠', color: '#D878D8', robe: '#6A286A' },
  { name: 'Orion Taraban',   emoji: '💡', color: '#E8D820', robe: '#8A7A00' },
  { name: 'Rick Rubin',      emoji: '🎨', color: '#8870D8', robe: '#3A2478' },
] as const;

// \u2500\u2500 Colours Jiang',     emoji: '🔬', color: '#38C880', robe: '#1A5E3A' },
  { name: 'Jett Franzen',    emoji: '🎭', color: '#C045C8', robe: '#6A0E70' },
  { name: 'Jason Pargin',    emoji: '🔍', color: '#909090', robe: '#404040' },
  { name: 'Jay Shetty',      emoji: '🧘', color: '#38A8D8', robe: '#184A6A' },
  { name: 'Luke B2500\u2500\u2500\u2500\u2500
const STONE_DARK   = '#141210';
const STONE_MID    = '#1E1A17';
const STONE_LIGHT  = '#2A2420';
const WALL_COLOR   = '#0E0C0A';
const FLOOR_A      = '#1A1714';
const FLOOR_B      = '#201D1A';
const TABLE_WOOD   = '#5C3D1E';
const TABLE_FELT   = '#1A4A2E';
const TABLE_GOLD   = '#C9A84C';
const SKIN         = '#F5CBA7';

interface Agent {
  sx: number; sy: number;
  x: number; y: number;
  vx: number; vy: number;
  tx: number; ty: number;
  seated: boolean;
  blinkT: number; dotPhase: number; workPhase: number;
  color: string; robe: string; emoji: string;
}

export default function CouncilBackground({ active = false }: { active?: boolean }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const activeRef  = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    // \u2500\u2500 Canvas dimensions (updated on resize) \u2500\u2500
    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W;
      canvas.height = H;
    };
    window.addEventListener('resize', onResize);

    // \u2500\u2500 Derived helpers \u2500\u2500
    const cx   = () => W / 2;
    const cy   = () => H / 2;
    const tblR = () => Math.min(W, H) * 0.16;
    const seatR = () => tblR() * 1.52;
    const PAD  = 56;

    const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;
    const dist  = (x1: number, y1: number, x2: number, y2: number) =>
      Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const rnd   = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
    const seatAngle = (i: number) => -Math.PI / 2 + (i / 12) * Math.PI * 2;

    // \u2500\u2500 Agents \u2500\u2500
    const agents: Agent[] = KNIGHTS.map((k, i) => {
      const ang = seatAngle(i);
      const sr  = seatR();
      const sx  = cx() + Math.cos(ang) * sr;
      const sy  = cy() + Math.sin(ang) * sr;
      return {
        sx, sy,
        x: cx() + Math.cos(ang) * rnd(60, 130),
        y: cy() + Math.sin(ang) * rnd(60, 130),
        vx: 0, vy: 0,
        tx: sx, ty: sy,
        seated: false,
        blinkT:    Math.random() * 4000,
        dotPhase:  Math.random() * Math.PI * 2,
        workPhase: Math.random() * Math.PI * 2,
        color: k.color,
        robe:  k.robe,
        emoji: k.emoji,
      };
    });

    // \u2500\u2500 Particles (torch fire) \u2500\u2500
    interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string }
    const particles: Particle[] = [];

    const spawnFire = (tx: number, ty: number) => {
      if (particles.length > 80) return;
      particles.push({
        x: tx + rnd(-3, 3), y: ty,
        vx: rnd(-0.4, 0.4), vy: rnd(-1.8, -0.6),
        life: 1, maxLife: rnd(25, 55),
        color: ['#FF8C00','#FF5500','#FFAA00','#FF3300'][Math.floor(Math.random() * 4)],
      });
    };

    // Torch positions (updated each frame to follow canvas size)
    const torches = [
      { x: PAD + 18, y: PAD + 18 },
      { x: W - PAD - 18, y: PAD + 18 },
      { x: PAD + 18, y: H - PAD - 18 },
      { x: W - PAD - 18, y: H - PAD - 18 },
    ];

    // \u2500\u2500 Draw: room \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function drawRoom(t: number) {
      // Solid backdrop
      ctx.fillStyle = STONE_DARK;
      ctx.fillRect(0, 0, W, H);

      // Floor tiles
      const ts = 52;
      for (let r = PAD; r < H - PAD; r += ts) {
        for (let c = PAD; c < W - PAD; c += ts) {
          ctx.fillStyle = ((Math.floor(r / ts) + Math.floor(c / ts)) % 2) ? FLOOR_A : FLOOR_B;
          ctx.fillRect(c, r, ts - 1, ts - 1);
        }
      }

      // Stone border wall
      ctx.fillStyle = WALL_COLOR;
      ctx.fillRect(0, 0, W, PAD);
      ctx.fillRect(0, H - PAD, W, PAD);
      ctx.fillRect(0, 0, PAD, H);
      ctx.fillRect(W - PAD, 0, PAD, H);

      // Wall brickwork lines (horizontal)
      ctx.strokeStyle = STONE_LIGHT;
      ctx.lineWidth = 1;
      for (let y2 = 0; y2 < H; y2 += 20) {
        ctx.beginPath(); ctx.moveTo(0, y2); ctx.lineTo(PAD, y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W - PAD, y2); ctx.lineTo(W, y2); ctx.stroke();
      }
      for (let x2 = 0; x2 < W; x2 += 20) {
        ctx.beginPath(); ctx.moveTo(x2, 0); ctx.lineTo(x2, PAD); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, H - PAD); ctx.lineTo(x2, H); ctx.stroke();
      }

      // Arched windows (left & right walls) \u2014 decorative rectangles
      const winH = 80, winW = 28;
      const winYs = [H * 0.3, H * 0.65];
      for (const wy of winYs) {
        // Left wall
        ctx.fillStyle = '#0A1828';
        ctx.fillRect(2, wy - winH / 2, winW - 2, winH);
        ctx.strokeStyle = '#4A6080';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, wy - winH / 2, winW - 2, winH);
        // Right wall
        ctx.fillStyle = '#0A1828';
        ctx.fillRect(W - winW, wy - winH / 2, winW - 2, winH);
        ctx.strokeStyle = '#4A6080';
        ctx.strokeRect(W - winW, wy - winH / 2, winW - 2, winH);
        // Soft moonlight glow from window
        const gL = ctx.createRadialGradient(PAD + 10, wy, 0, PAD + 10, wy, 90);
        gL.addColorStop(0, 'rgba(100,130,200,0.07)');
        gL.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gL;
        ctx.fillRect(PAD, wy - 90, 180, 180);
      }

      // Update torch positions
      torches[0] = { x: PAD + 18, y: PAD + 18 };
      torches[1] = { x: W - PAD - 18, y: PAD + 18 };
      torches[2] = { x: PAD + 18, y: H - PAD - 18 };
      torches[3] = { x: W - PAD - 18, y: H - PAD - 18 };

      // Torches
      for (const tr of torches) {
        // Warm ambient glow
        const glow = ctx.createRadialGradient(tr.x, tr.y, 0, tr.x, tr.y, 110);
        glow.addColorStop(0, 'rgba(255,140,0,0.14)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(tr.x - 110, tr.y - 110, 220, 220);

        // Torch bracket
        ctx.fillStyle = '#3A2010';
        ctx.fillRect(tr.x - 3, tr.y + 2, 6, 16);
        ctx.fillStyle = '#6A4020';
        ctx.fillRect(tr.x - 5, tr.y, 10, 5);

        // Flame layers
        const flk = Math.sin(t * 9 + tr.x * 0.1) * 2.5;
        ctx.fillStyle = '#FF8C00';
        ctx.beginPath();
        ctx.ellipse(tr.x + flk * 0.3, tr.y - 5, 5 + Math.abs(flk) * 0.3, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFCC00';
        ctx.beginPath();
        ctx.ellipse(tr.x + flk * 0.15, tr.y - 5, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.ellipse(tr.x, tr.y - 5, 1.5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (Math.random() < 0.35) spawnFire(tr.x, tr.y - 6);
      }
    }

    // \u2500\u2500 Draw: particles \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function drawParticles() {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy *= 0.97;
        p.life -= 1 / p.maxLife;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life * 0.75;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5 * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // \u2500\u2500 Draw: round table \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function drawTable(t: number) {
      const ccx = cx(), ccy = cy(), tr = tblR();

      // Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(ccx + 8, ccy + 12, tr, tr * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Table rim
      ctx.fillStyle = TABLE_WOOD;
      ctx.beginPath();
      ctx.arc(ccx, ccy, tr, 0, Math.PI * 2);
      ctx.fill();

      // Felt surface
      ctx.fillStyle = TABLE_FELT;
      ctx.beginPath();
      ctx.arc(ccx, ccy, tr - 9, 0, Math.PI * 2);
      ctx.fill();

      // Wood grain lines
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        ctx.beginPath();
        ctx.moveTo(ccx, ccy);
        ctx.lineTo(ccx + Math.cos(a) * (tr - 9), ccy + Math.sin(a) * (tr - 9));
        ctx.stroke();
      }

      // Gold rim ring
      ctx.strokeStyle = TABLE_GOLD;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ccx, ccy, tr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ccx, ccy, tr - 11, 0, Math.PI * 2);
      ctx.stroke();

      // Chair markers (12 seat indicators around table)
      const sr = seatR();
      for (let i = 0; i < 12; i++) {
        const ang = seatAngle(i);
        const sx = ccx + Math.cos(ang) * sr;
        const sy = ccy + Math.sin(ang) * sr;
        ctx.fillStyle = 'rgba(92,61,30,0.55)';
        ctx.beginPath();
        ctx.arc(sx, sy, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = TABLE_GOLD;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx, sy, 11, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Pulsing centre emblem \u269C
      const pulse = 0.82 + 0.18 * Math.sin(t * 1.4);
      ctx.globalAlpha = pulse * 0.55;
      ctx.fillStyle = TABLE_GOLD;
      ctx.font = String(Math.round(tr * 0.42)) + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u269C', ccx, ccy);
      ctx.globalAlpha = 1;
    }

    // \u2500\u2500 Draw: single agent \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function drawAgent(a: Agent, t: number) {
      const { x, y, seated, blinkT, dotPhase, workPhase, color, robe, emoji } = a;
      const bW = 13, bH = 19;

      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(x, y + bH / 2 + 3, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lower robe
      ctx.fillStyle = robe;
      ctx.beginPath();
      ctx.roundRect(x - bW / 2, y, bW, bH / 2, [0, 0, 5, 5]);
      ctx.fill();

      // Upper body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x - bW / 2, y - bH / 2, bW, bH / 2 + 1, [5, 5, 0, 0]);
      ctx.fill();

      // Robe highlight
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.roundRect(x - bW / 2 + 2, y - bH / 2 + 2, 4, bH / 2 - 4, [3, 0, 0, 0]);
      ctx.fill();

      // Head
      ctx.fillStyle = SKIN;
      ctx.beginPath();
      ctx.arc(x, y - bH / 2 - 7, 8, 0, Math.PI * 2);
      ctx.fill();

      // Eyes (with blink)
      const blink = ((t * 1000 + blinkT) % 3800) < 130;
      const eyeH  = blink ? 0.4 : 2;
      ctx.fillStyle = '#1A0800';
      ctx.fillRect(x - 3.5, y - bH / 2 - 9, 2, eyeH);
      ctx.fillRect(x + 1.5, y - bH / 2 - 9, 2, eyeH);

      // Emoji badge (11px, drawn over head area)
      ctx.font = '11px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, x, y - bH / 2 - 7);

      // Arms working (seated + active)
      if (seated && activeRef.current) {
        const armAng = Math.sin(t * 3.2 + workPhase) * 0.45;
        ctx.strokeStyle = SKIN;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 3);
        ctx.lineTo(x - 5 + Math.cos(armAng) * 9, y + Math.sin(armAng) * 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 5, y - 3);
        ctx.lineTo(x + 5 + Math.cos(-armAng) * 9, y + Math.sin(-armAng) * 5);
        ctx.stroke();
      }

      // Thinking dots (active mode)
      if (activeRef.current) {
        for (let d = 0; d < 3; d++) {
          const dph = (t * 4 + dotPhase + d * 0.65) % (Math.PI * 2);
          const dy2 = y - bH / 2 - 20 - Math.abs(Math.sin(dph)) * 6;
          ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(dph));
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x - 4 + d * 4, dy2, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }

    // \u2500\u2500 Update: agent movement \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function updateAgents(dt: number) {
      const active = activeRef.current;
      const ccx = cx(), ccy = cy(), tr = tblR(), sr = seatR();
      const speed    = active ? 0 : 0.65;
      const seatLerp = active ? 0.042 : 0.006;

      for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        const ang = seatAngle(i);
        a.sx = ccx + Math.cos(ang) * sr;
        a.sy = ccy + Math.sin(ang) * sr;

        if (active) {
          a.x = lerp(a.x, a.sx, seatLerp);
          a.y = lerp(a.y, a.sy, seatLerp);
          a.seated = dist(a.x, a.y, a.sx, a.sy) < 10;
          a.tx = a.x; a.ty = a.y;
        } else {
          a.seated = false;
          // Pick new wander target when close
          if (dist(a.x, a.y, a.tx, a.ty) < 7) {
            const ra  = rnd(0, Math.PI * 2);
            const r2  = rnd(50, Math.min(W, H) * 0.38);
            a.tx = clamp(ccx + Math.cos(ra) * r2, PAD + 16, W - PAD - 16);
            a.ty = clamp(ccy + Math.sin(ra) * r2, PAD + 16, H - PAD - 16);
          }
          const dx = a.tx - a.x, dy = a.ty - a.y;
          const dl = Math.sqrt(dx * dx + dy * dy);
          if (dl > 1) {
            a.vx = lerp(a.vx, (dx / dl) * speed, 0.08);
            a.vy = lerp(a.vy, (dy / dl) * speed, 0.08);
          }
          // Avoid table
          const td = dist(a.x + a.vx, a.y + a.vy, ccx, ccy);
          if (td < tr + 22) {
            const aa = Math.atan2(a.y - ccy, a.x - ccx);
            a.vx += Math.cos(aa) * 0.65;
            a.vy += Math.sin(aa) * 0.65;
          }
          a.x = clamp(a.x + a.vx, PAD + 13, W - PAD - 13);
          a.y = clamp(a.y + a.vy, PAD + 13, H - PAD - 13);
        }
      }
    }

    // \u2500\u2500 Main loop \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    const t0 = performance.now();
    let prev = t0;
    let rafId = 0;

    function frame(now: number) {
      const dt = (now - prev) / 1000;
      prev = now;
      const t = (now - t0) / 1000;

      ctx.clearRect(0, 0, W, H);

      drawRoom(t);
      drawParticles();
      drawTable(t);

      // Sort agents by Y so front ones overdraw back ones
      const sorted = agents
        .map((a, i) => ({ a, i }))
        .sort((p, q) => p.a.y - q.a.y);
      for (const { a } of sorted) drawAgent(a, t);

      updateAgents(dt);

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}
