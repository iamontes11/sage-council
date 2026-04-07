'use client';
import { useEffect, useRef } from 'react';
import { CREATORS } from '@/lib/creators';
import { CHARS, DEFAULT_CHAR } from '@/components/VoxelAvatar';
import type { CharDef } from '@/components/VoxelAvatar';

const STONE_DARK  = '#141210';
const STONE_MID   = '#1E1A17';
const STONE_LIGHT = '#2A2420';
const WALL_COLOR  = '#0E0C0A';
const FLOOR_A     = '#1A1714';
const FLOOR_B     = '#201D1A';
const TABLE_WOOD  = '#5C3D1E';
const TABLE_FELT  = '#1A4A2E';
const TABLE_GOLD  = '#C9A84C';

interface Agent {
  sx: number; sy: number;
  x: number; y: number;
  vx: number; vy: number;
  tx: number; ty: number;
  seated: boolean;
  blinkT: number; dotPhase: number; workPhase: number;
  char: CharDef;
}

export default function CouncilBackground({ active = false }: { active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

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

    // ── Agents ──────────────────────────────────────────────────────────────
    const agents: Agent[] = CREATORS.slice(0, 12).map((c, i) => {
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
        char: CHARS[c.id] || DEFAULT_CHAR,
      };
    });

    // ── Particles (torch fire) ──────────────────────────────────────────────
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

    const torches = [
      { x: PAD + 18, y: PAD + 18 },
      { x: W - PAD - 18, y: PAD + 18 },
      { x: PAD + 18, y: H - PAD - 18 },
      { x: W - PAD - 18, y: H - PAD - 18 },
    ];

    // ── Draw: room ──────────────────────────────────────────────────────────
    function drawRoom(t: number) {
      ctx.fillStyle = STONE_DARK;
      ctx.fillRect(0, 0, W, H);

      const ts = 52;
      for (let r = PAD; r < H - PAD; r += ts) {
        for (let c = PAD; c < W - PAD; c += ts) {
          ctx.fillStyle = ((Math.floor(r / ts) + Math.floor(c / ts)) % 2) ? FLOOR_A : FLOOR_B;
          ctx.fillRect(c, r, ts - 1, ts - 1);
        }
      }

      ctx.fillStyle = WALL_COLOR;
      ctx.fillRect(0, 0, W, PAD);
      ctx.fillRect(0, H - PAD, W, PAD);
      ctx.fillRect(0, 0, PAD, H);
      ctx.fillRect(W - PAD, 0, PAD, H);

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

      const winH = 80, winW = 28;
      const winYs = [H * 0.3, H * 0.65];
      for (const wy of winYs) {
        ctx.fillStyle = '#0A1828';
        ctx.fillRect(2, wy - winH / 2, winW - 2, winH);
        ctx.strokeStyle = '#4A6080';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, wy - winH / 2, winW - 2, winH);
        ctx.fillStyle = '#0A1828';
        ctx.fillRect(W - winW, wy - winH / 2, winW - 2, winH);
        ctx.strokeStyle = '#4A6080';
        ctx.strokeRect(W - winW, wy - winH / 2, winW - 2, winH);
        const gL = ctx.createRadialGradient(PAD + 10, wy, 0, PAD + 10, wy, 90);
        gL.addColorStop(0, 'rgba(100,130,200,0.07)');
        gL.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gL;
        ctx.fillRect(PAD, wy - 90, 180, 180);
      }

      torches[0] = { x: PAD + 18, y: PAD + 18 };
      torches[1] = { x: W - PAD - 18, y: PAD + 18 };
      torches[2] = { x: PAD + 18, y: H - PAD - 18 };
      torches[3] = { x: W - PAD - 18, y: H - PAD - 18 };

      for (const tr of torches) {
        const glow = ctx.createRadialGradient(tr.x, tr.y, 0, tr.x, tr.y, 110);
        glow.addColorStop(0, 'rgba(255,140,0,0.14)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(tr.x - 110, tr.y - 110, 220, 220);
        ctx.fillStyle = '#3A2010';
        ctx.fillRect(tr.x - 3, tr.y + 2, 6, 16);
        ctx.fillStyle = '#6A4020';
        ctx.fillRect(tr.x - 5, tr.y, 10, 5);
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

    // ── Draw: particles ─────────────────────────────────────────────────────
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

    // ── Draw: round table ───────────────────────────────────────────────────
    function drawTable(t: number) {
      const ccx = cx(), ccy = cy(), tr = tblR();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(ccx + 8, ccy + 12, tr, tr * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TABLE_WOOD;
      ctx.beginPath();
      ctx.arc(ccx, ccy, tr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TABLE_FELT;
      ctx.beginPath();
      ctx.arc(ccx, ccy, tr - 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        ctx.beginPath();
        ctx.moveTo(ccx, ccy);
        ctx.lineTo(ccx + Math.cos(a) * (tr - 9), ccy + Math.sin(a) * (tr - 9));
        ctx.stroke();
      }
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
      const pulse = 0.82 + 0.18 * Math.sin(t * 1.4);
      ctx.globalAlpha = pulse * 0.55;
      ctx.fillStyle = TABLE_GOLD;
      ctx.font = String(Math.round(tr * 0.42)) + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u269C', ccx, ccy);
      ctx.globalAlpha = 1;
    }

    // ── Draw: voxel agent ───────────────────────────────────────────────────
    function drawAgent(a: Agent, t: number) {
      const { x, y, seated, dotPhase, workPhase, char } = a;
      const sz = 28;
      const s  = sz / 32;

      // anchor: y = waist (body center ≈ y-coord 20 in VoxelAvatar 0-40 grid)
      const ox = Math.round(x - 16 * s);
      const oy = Math.round(y - 20 * s);

      // pixel helper
      const px = (rx: number, ry: number, rw: number, rh: number) =>
        ctx.fillRect(
          ox + Math.round(rx * s),
          oy + Math.round(ry * s),
          Math.max(1, Math.round(rw * s)),
          Math.max(1, Math.round(rh * s))
        );

      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(x, oy + Math.round(39 * s), Math.round(10 * s), Math.max(1, Math.round(2 * s)), 0, 0, Math.PI * 2);
      ctx.fill();

      // legs
      ctx.fillStyle = char.pants;
      px(7, 27, 8, 9);
      px(17, 27, 8, 9);
      // shoes
      ctx.fillStyle = '#1a1008';
      px(7, 36, 8, 2);
      px(17, 36, 8, 2);

      // arms
      ctx.fillStyle = char.body;
      px(2, 15, 5, 10);
      px(25, 15, 5, 10);

      // working arms when seated + active
      if (seated && activeRef.current) {
        const armAng = Math.sin(t * 3.2 + workPhase) * 0.45;
        ctx.strokeStyle = char.skin;
        ctx.lineWidth = Math.max(1, s * 2);
        ctx.beginPath();
        ctx.moveTo(x - Math.round(5 * s), y + Math.round(2 * s));
        ctx.lineTo(x - Math.round(5 * s) + Math.cos(armAng) * 9, y + Math.round(2 * s) + Math.sin(armAng) * 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + Math.round(5 * s), y + Math.round(2 * s));
        ctx.lineTo(x + Math.round(5 * s) + Math.cos(-armAng) * 9, y + Math.round(2 * s) + Math.sin(-armAng) * 5);
        ctx.stroke();
      }

      // body
      ctx.fillStyle = char.body;
      px(7, 15, 18, 11);
      // body highlight
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      px(7, 15, 2, 11);
      // accent stripe
      if (char.accent) {
        ctx.fillStyle = char.accent;
        ctx.globalAlpha = 0.5;
        px(9, 16, 14, 2);
        ctx.globalAlpha = 1;
      }

      // neck
      ctx.fillStyle = char.skin;
      px(13, 14, 6, 2);

      // head
      ctx.fillStyle = char.skin;
      px(6, 0, 20, 14);
      // head highlight
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      px(6, 0, 2, 14);

      // hair top
      ctx.fillStyle = char.hair;
      px(6, 0, 20, 4);
      px(6, 4, 2, 8);
      px(24, 4, 2, 8);

      // blink
      const blink = ((t * 1000 + a.blinkT) % 3800) < 130;
      const eyeH  = blink ? 0.5 : 2;
      ctx.fillStyle = char.eyes;
      px(10, 6, 3, eyeH);
      px(19, 6, 3, eyeH);
      // eye shine
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      px(12, 6, 1, 1);
      px(21, 6, 1, 1);

      // mouth
      ctx.fillStyle = '#1a1a1a';
      ctx.globalAlpha = 0.7;
      px(10, 11, 6, 1);
      ctx.globalAlpha = 1;

      // accessories
      if (char.accessory === 'glasses') {
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = Math.max(1, s * 0.9);
        ctx.strokeRect(ox + Math.round(9*s), oy + Math.round(5*s), Math.round(5*s), Math.round(4*s));
        ctx.strokeRect(ox + Math.round(18*s), oy + Math.round(5*s), Math.round(5*s), Math.round(4*s));
        ctx.fillStyle = '#1a1a1a';
        px(14, 6, 4, 1);
      }
      if (char.accessory === 'beard') {
        ctx.fillStyle = char.beardColor || '#D5D5D5';
        px(8, 12, 16, 3);
        px(7, 10, 3, 4);
        px(22, 10, 3, 4);
      }
      if (char.accessory === 'headband') {
        ctx.fillStyle = '#E74C3C';
        px(6, 4, 20, 2);
      }

      // thinking dots when active
      if (activeRef.current) {
        for (let d = 0; d < 3; d++) {
          const dph  = (t * 4 + dotPhase + d * 0.65) % (Math.PI * 2);
          const dy2  = oy - Math.abs(Math.sin(dph)) * 6;
          ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(dph));
          ctx.fillStyle   = char.body;
          ctx.beginPath();
          ctx.arc(x - 4 + d * 4, dy2, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }

    // ── Update: agent movement ──────────────────────────────────────────────
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

    // ── Main loop ───────────────────────────────────────────────────────────
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
        imageRendering: 'pixelated',
        display: 'block',
      }}
    />
  );
}
