'use client';
import { useEffect, useRef } from 'react';
import { CREATORS } from '@/lib/creators';
import { CHARS, DEFAULT_CHAR } from '@/components/VoxelAvatar';
import type { CharDef } from '@/components/VoxelAvatar';

// ── Medieval Palette ────────────────────────────────────────────────────────
const C = {
  floor1:     '#4a3e2e', floor2:     '#3d3224',
  wall:       '#1e1a14', wallBrick:  '#2a2318',
  wallLight:  '#362d20', wallMortar: '#141008',
  wood:       '#6b4c2a', woodDark:   '#4a3218', woodLight:  '#8b6535',
  stone:      '#5a4d3a', stoneDark:  '#3d3326',
  felt:       '#1a3520', gold:       '#c9a84c', goldDim:    '#8b6c2a',
  tapRed:     '#6b1515', tapBlue:    '#1a3a6b', tapGold:    '#c9a84c',
  shelf:      '#4a3218', book1: '#8b1a1a', book2: '#1a4a8b',
  book3: '#2a6b2a', book4: '#7a6b00', book5: '#6b006b',
  cauldron:   '#1a1a1a', cauldronRim:'#333333',
  fire1:      '#ff8c00', fire2: '#ff5500', fire3: '#ffcc00',
  rug1:       '#6b1515', rugBorder:  '#c9a84c',
  tableWood:  '#5c3d1e', tableFelt:  '#1a3a20',
  window:     '#0a1828', windowGlow: 'rgba(80,110,180,0.08)',
  bedFrame:   '#5c3d1e', bedSheet:   '#d4c8a8',
  deskWood:   '#5c3d1e',
  smoke:      'rgba(180,160,120,',
};

type Activity = 'eat' | 'read' | 'magic' | 'write' | 'cook' | 'meditate' | 'music' | 'sleep' | 'talk' | 'wander';

interface Zone { x: number; y: number; activity: Activity }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }
interface Agent {
  x: number; y: number; vx: number; vy: number;
  tx: number; ty: number;
  sx: number; sy: number;       // seat at table
  seated: boolean;
  blinkT: number; dotPhase: number; workPhase: number; actPhase: number;
  activity: Activity; zoneIndex: number;
  char: CharDef;
}

const ACTIVITIES: Activity[] = [
  'eat','eat','read','read','magic','magic',
  'write','cook','meditate','music','sleep','talk',
];

export default function CouncilBackground({ active = false }: { active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;

    let W = window.innerWidth, H = window.innerHeight;
    canvas.width  = W; canvas.height = H;

    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
    };
    window.addEventListener('resize', onResize);

    // ── helpers ─────────────────────────────────────────────────────────────
    const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;
    const dist  = (x1: number, y1: number, x2: number, y2: number) => Math.sqrt((x2-x1)**2+(y2-y1)**2);
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const rnd   = (lo: number, hi: number) => lo + Math.random()*(hi-lo);
    const cx    = () => W/2, cy = () => H/2;
    const tblR  = () => Math.min(W,H)*0.14;
    const seatR = () => tblR()*1.55;
    const seatA = (i: number) => -Math.PI/2 + (i/12)*Math.PI*2;
    const PAD   = 54;

    // ── activity zones (recalculated each frame for responsiveness) ──────────
    function zones(): Zone[] {
      const margin = PAD + 30;
      return [
        { x: cx()-tblR()*0.4, y: cy()+seatR()*0.5,  activity: 'eat'      }, // 0
        { x: cx()+tblR()*0.4, y: cy()+seatR()*0.5,  activity: 'eat'      }, // 1
        { x: PAD+60,          y: H*0.28,             activity: 'read'     }, // 2
        { x: PAD+80,          y: H*0.45,             activity: 'read'     }, // 3
        { x: W-PAD-60,        y: H*0.72,             activity: 'magic'    }, // 4
        { x: W-PAD-90,        y: H*0.55,             activity: 'magic'    }, // 5
        { x: PAD+70,          y: H*0.72,             activity: 'write'    }, // 6
        { x: W-PAD-60,        y: H*0.28,             activity: 'cook'     }, // 7
        { x: cx(),            y: H-margin-10,        activity: 'meditate' }, // 8
        { x: cx()-80,         y: H*0.25,             activity: 'music'    }, // 9
        { x: W-PAD-55,        y: H*0.38,             activity: 'sleep'    }, // 10
        { x: cx()+80,         y: H*0.25,             activity: 'talk'     }, // 11
      ];
    }

    // ── particles ────────────────────────────────────────────────────────────
    const particles: Particle[] = [];
    const addP = (x: number, y: number, vx: number, vy: number, life: number, color: string, size = 2) => {
      if (particles.length < 200) particles.push({ x, y, vx, vy, life, maxLife: life, color, size });
    };

    function spawnTorchFire(tx: number, ty: number) {
      if (Math.random() < 0.45) {
        const colors = [C.fire1, C.fire2, C.fire3, '#ff3300'];
        addP(tx+rnd(-2,2), ty, rnd(-0.3,0.3), rnd(-1.6,-.5), rnd(20,45), colors[Math.floor(Math.random()*4)], 1.5);
      }
    }

    function spawnMagicSpark(x: number, y: number, color: string) {
      if (Math.random() < 0.4)
        addP(x+rnd(-8,8), y+rnd(-8,8), rnd(-1,1), rnd(-2,-.5), rnd(15,35), color, 2);
    }

    function spawnSmoke(x: number, y: number) {
      if (Math.random() < 0.12)
        addP(x+rnd(-3,3), y, rnd(-.2,.2), rnd(-.8,-.3), rnd(30,60), C.smoke+'0.5)', 3);
    }

    function spawnNote(x: number, y: number) {
      if (Math.random() < 0.06)
        addP(x+rnd(-4,4), y-5, rnd(-.3,.3), rnd(-.6,-.2), rnd(40,80), C.gold, 2);
    }

    function spawnZzz(x: number, y: number) {
      if (Math.random() < 0.04)
        addP(x+rnd(-2,2), y-8, rnd(-.1,.1), rnd(-.35,-.15), rnd(50,100), 'rgba(180,200,255,0.8)', 2);
    }

    // ── torches ──────────────────────────────────────────────────────────────
    const torchPositions = () => [
      { x: PAD+22, y: PAD+22 },
      { x: W-PAD-22, y: PAD+22 },
      { x: PAD+22, y: H-PAD-22 },
      { x: W-PAD-22, y: H-PAD-22 },
    ];

    // ── Draw: stone brick wall ────────────────────────────────────────────────
    function drawWall(x: number, y: number, w: number, h: number, t: number) {
      ctx.fillStyle = C.wall;
      ctx.fillRect(x, y, w, h);
      const bw = 28, bh = 14;
      ctx.fillStyle = C.wallMortar;
      for (let row = Math.floor(y/bh); row <= Math.ceil((y+h)/bh); row++) {
        for (let col = -1; col <= Math.ceil(w/bw)+1; col++) {
          const offset = (row % 2) ? bw/2 : 0;
          const bx = x + col*bw + offset, by = row*bh;
          if (bx+bw < x || bx > x+w || by+bh < y || by > y+h) continue;
          ctx.fillStyle = C.wallBrick;
          ctx.fillRect(bx+1, by+1, bw-2, bh-2);
          ctx.fillStyle = C.wallLight;
          ctx.fillRect(bx+1, by+1, bw-2, 2);
          ctx.fillRect(bx+1, by+1, 2, bh-2);
        }
      }
    }

    // ── Draw: room ────────────────────────────────────────────────────────────
    function drawRoom(t: number) {
      // base
      ctx.fillStyle = C.wall;
      ctx.fillRect(0, 0, W, H);

      // stone floor tiles
      const ts = 48;
      for (let r = PAD; r < H-PAD; r += ts) {
        for (let col2 = PAD; col2 < W-PAD; col2 += ts) {
          const alt = ((Math.floor(r/ts)+Math.floor(col2/ts))%2);
          ctx.fillStyle = alt ? C.floor1 : C.floor2;
          ctx.fillRect(col2, r, ts-1, ts-1);
          // grout highlights
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          ctx.fillRect(col2, r, ts-1, 2);
          ctx.fillRect(col2, r, 2, ts-1);
        }
      }

      // walls (4 sides)
      drawWall(0,     0,     W,   PAD,  t);
      drawWall(0,     H-PAD, W,   PAD,  t);
      drawWall(0,     PAD,   PAD, H-2*PAD, t);
      drawWall(W-PAD, PAD,   PAD, H-2*PAD, t);

      // ── Tapestries ──────────────────────────────────────────────────────────
      drawTapestry(cx()-90, 2,  60, PAD-2, C.tapRed,  t);
      drawTapestry(cx()+30, 2,  60, PAD-2, C.tapBlue, t);

      // ── Windows (left wall) ─────────────────────────────────────────────────
      drawWindow(PAD-2, H*0.3, t);
      drawWindow(PAD-2, H*0.65, t);

      // ── Bookshelf (left wall) ───────────────────────────────────────────────
      drawBookshelf(PAD+2, H*0.25, 80, 120);

      // ── Desk / writing table (left-bottom) ─────────────────────────────────
      drawDesk(PAD+12, H*0.68);

      // ── Alchemy corner (right-top) ──────────────────────────────────────────
      drawAlchemyCorner(W-PAD-85, H*0.15, t);

      // ── Cauldron (right-top area) ───────────────────────────────────────────
      drawCauldron(W-PAD-55, H*0.25, t);

      // ── Bed / rest area (right wall) ────────────────────────────────────────
      drawBed(W-PAD-10, H*0.38);

      // ── Fireplace (bottom-center) ───────────────────────────────────────────
      drawFireplace(cx(), H-PAD-2, t);

      // ── Red rug under table ─────────────────────────────────────────────────
      const rugW = tblR()*2.6, rugH = tblR()*2.0;
      ctx.fillStyle = C.rug1;
      ctx.beginPath();
      ctx.ellipse(cx(), cy(), rugW, rugH, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = C.rugBorder;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx(), cy(), rugW-6, rugH-6, 0, 0, Math.PI*2);
      ctx.stroke();
      ctx.strokeStyle = C.goldDim;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx(), cy(), rugW*0.5, rugH*0.5, 0, 0, Math.PI*2);
      ctx.stroke();

      // ── Torches ─────────────────────────────────────────────────────────────
      for (const tr of torchPositions()) {
        spawnTorchFire(tr.x, tr.y);
        drawTorch(tr.x, tr.y, t);
      }
    }

    function drawTapestry(x: number, y: number, w: number, h: number, col: string, t: number) {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, h);
      // border
      ctx.strokeStyle = C.tapGold;
      ctx.lineWidth = 2;
      ctx.strokeRect(x+2, y+2, w-4, h-4);
      // pattern lines
      ctx.strokeStyle = 'rgba(201,168,76,0.3)';
      ctx.lineWidth = 1;
      for (let yy = y+8; yy < y+h-4; yy += 8) {
        ctx.beginPath(); ctx.moveTo(x+4, yy); ctx.lineTo(x+w-4, yy); ctx.stroke();
      }
      // wave bottom
      ctx.fillStyle = col;
      const segments = 5;
      const sw = w/segments;
      ctx.beginPath();
      ctx.moveTo(x, y+h);
      for (let s2 = 0; s2 < segments; s2++) {
        ctx.lineTo(x+s2*sw+sw*0.5, y+h+6);
        ctx.lineTo(x+(s2+1)*sw, y+h);
      }
      ctx.closePath();
      ctx.fill();
    }

    function drawWindow(x: number, y: number, t: number) {
      const ww = PAD-4, wh = 70;
      ctx.fillStyle = C.window;
      ctx.fillRect(x, y-wh/2, ww, wh);
      // moonlight glow
      const glow = ctx.createRadialGradient(x+ww, y, 0, x+ww, y, 120);
      glow.addColorStop(0, 'rgba(80,110,200,0.09)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x, y-120, 240, 240);
      // frame
      ctx.strokeStyle = '#4a6080';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y-wh/2, ww, wh);
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x+ww, y);
      ctx.moveTo(x+ww/2, y-wh/2); ctx.lineTo(x+ww/2, y+wh/2);
      ctx.stroke();
      // shimmer
      ctx.globalAlpha = 0.04 + 0.02*Math.sin(t*0.7);
      ctx.fillStyle = '#8ab4ff';
      ctx.fillRect(x, y-wh/2, ww, wh);
      ctx.globalAlpha = 1;
    }

    function drawBookshelf(x: number, y: number, w: number, h: number) {
      ctx.fillStyle = C.shelf;
      ctx.fillRect(x, y, w, h);
      // shelves
      const shelves = 4;
      const sh = h/shelves;
      const bookColors = [C.book1,C.book2,C.book3,C.book4,C.book5];
      for (let s2 = 0; s2 < shelves; s2++) {
        ctx.fillStyle = C.woodDark;
        ctx.fillRect(x, y+s2*sh+sh-3, w, 4);
        // books on shelf
        let bx = x+3;
        while (bx < x+w-6) {
          const bw2 = rnd(6, 11)|0;
          const bh2 = rnd(sh*0.4, sh*0.75)|0;
          ctx.fillStyle = bookColors[Math.floor(Math.random()*bookColors.length)];
          ctx.fillRect(bx, y+s2*sh+sh-3-bh2, bw2-1, bh2);
          bx += bw2;
        }
      }
      ctx.strokeStyle = C.woodLight;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    }

    function drawDesk(x: number, y: number) {
      const dw = 72, dh = 40;
      ctx.fillStyle = C.deskWood;
      ctx.fillRect(x, y, dw, dh);
      ctx.strokeStyle = C.woodLight;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, dw, dh);
      // parchment
      ctx.fillStyle = '#d4c89a';
      ctx.fillRect(x+8, y+6, 44, 28);
      // ink lines
      ctx.strokeStyle = '#2a1a08';
      ctx.lineWidth = 0.8;
      for (let ly = y+11; ly < y+30; ly += 5) {
        ctx.beginPath(); ctx.moveTo(x+12, ly); ctx.lineTo(x+48, ly); ctx.stroke();
      }
      // quill
      ctx.strokeStyle = '#8b7355';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x+50, y+8); ctx.lineTo(x+42, y+28); ctx.stroke();
      ctx.fillStyle = '#f0e8c0';
      ctx.beginPath(); ctx.moveTo(x+50, y+8); ctx.lineTo(x+55, y+4); ctx.lineTo(x+52, y+12); ctx.fill();
    }

    function drawAlchemyCorner(x: number, y: number, t: number) {
      // small table
      const tw = 80, th = 40;
      ctx.fillStyle = C.woodDark;
      ctx.fillRect(x, y, tw, th);
      ctx.strokeStyle = C.woodLight;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, tw, th);
      // bottles
      const bottleColors = ['#1a6b3a','#6b1a1a','#1a3a6b','#6b6b00'];
      for (let b = 0; b < 4; b++) {
        const bx = x+8+b*18;
        ctx.fillStyle = bottleColors[b];
        ctx.fillRect(bx, y+8, 10, 22);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(bx+3, y+4, 4, 6);
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#fff';
        ctx.fillRect(bx+2, y+10, 2, 8);
        ctx.globalAlpha = 1;
      }
      // glowing orb
      const orbGlow = 0.6+0.4*Math.sin(t*2.1);
      const orb = ctx.createRadialGradient(x+tw/2, y-10, 0, x+tw/2, y-10, 20);
      orb.addColorStop(0, `rgba(150,50,220,${orbGlow*0.9})`);
      orb.addColorStop(0.5, `rgba(80,20,160,${orbGlow*0.5})`);
      orb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = orb;
      ctx.beginPath(); ctx.arc(x+tw/2, y-10, 20, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(180,100,255,${orbGlow})`;
      ctx.beginPath(); ctx.arc(x+tw/2, y-10, 8, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(220,180,255,${orbGlow*0.8})`;
      ctx.beginPath(); ctx.arc(x+tw/2-2, y-13, 3, 0, Math.PI*2); ctx.fill();
    }

    function drawCauldron(x: number, y: number, t: number) {
      // stand
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(x-3, y+18, 6, 12);
      ctx.fillRect(x+14, y+18, 6, 12);
      // fire under cauldron
      const flk = Math.sin(t*7)*2;
      ctx.fillStyle = C.fire2;
      ctx.beginPath(); ctx.ellipse(x+9, y+22, 10+Math.abs(flk), 6, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = C.fire3;
      ctx.beginPath(); ctx.ellipse(x+9, y+20, 6, 4, 0, 0, Math.PI*2); ctx.fill();
      // cauldron body
      ctx.fillStyle = C.cauldron;
      ctx.beginPath(); ctx.arc(x+9, y+12, 18, 0, Math.PI); ctx.fill();
      ctx.fillRect(x-9, y+12, 36, 8);
      ctx.beginPath(); ctx.arc(x+9, y+20, 18, 0, Math.PI); ctx.fill();
      // rim
      ctx.fillStyle = C.cauldronRim;
      ctx.fillRect(x-10, y+10, 38, 4);
      // bubbling content
      const bubbleColor = `hsl(${(t*60)%360},60%,35%)`;
      ctx.fillStyle = bubbleColor;
      ctx.beginPath(); ctx.arc(x+9, y+12, 14, 0, Math.PI*2); ctx.fill();
      // bubbles
      for (let b = 0; b < 3; b++) {
        const bphase = t*3 + b*2.1;
        const bsize = 2+Math.sin(bphase)*1.5;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(x+4+b*5, y+12-Math.abs(Math.sin(bphase))*8, Math.abs(bsize), 0, Math.PI*2);
        ctx.fill();
      }
      // steam
      spawnSmoke(x+9, y);
      spawnSmoke(x+4, y+2);
    }

    function drawBed(x: number, y: number) {
      const bw = 55, bh = 80;
      const bx = x-bw;
      // frame
      ctx.fillStyle = C.bedFrame;
      ctx.fillRect(bx, y, bw, bh);
      // headboard
      ctx.fillStyle = C.woodDark;
      ctx.fillRect(bx, y, bw, 12);
      // sheets
      ctx.fillStyle = C.bedSheet;
      ctx.fillRect(bx+4, y+12, bw-8, bh-20);
      // pillow
      ctx.fillStyle = '#e8e0c8';
      ctx.fillRect(bx+6, y+14, bw-12, 18);
      ctx.strokeStyle = C.woodLight;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, y, bw, bh);
    }

    function drawFireplace(x: number, y: number, t: number) {
      const fw = 100, fh = PAD-2;
      const fx = x-fw/2;
      // mantle
      ctx.fillStyle = C.stone;
      ctx.fillRect(fx-8, y-fh, fw+16, 12);
      // opening
      ctx.fillStyle = '#0a0805';
      ctx.fillRect(fx, y-fh+12, fw, fh-12);
      // arch
      ctx.fillStyle = C.stoneDark;
      ctx.beginPath();
      ctx.arc(x, y-fh+14, fw/2, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#0a0805';
      ctx.beginPath();
      ctx.arc(x, y-fh+14, fw/2-6, Math.PI, 0);
      ctx.fill();
      // fire in fireplace
      const flk = Math.sin(t*8)*3;
      ctx.fillStyle = C.fire1;
      ctx.beginPath();
      ctx.ellipse(x+flk*.3, y-14, 28+Math.abs(flk), 22, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = C.fire3;
      ctx.beginPath();
      ctx.ellipse(x+flk*.15, y-18, 16, 14, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.ellipse(x, y-20, 6, 8, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // glow
      const fglow = ctx.createRadialGradient(x, y-fh/2, 0, x, y-fh/2, 160);
      fglow.addColorStop(0, 'rgba(255,140,0,0.12)');
      fglow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fglow;
      ctx.fillRect(x-160, y-fh-80, 320, 240);
      // logs
      ctx.fillStyle = C.woodDark;
      ctx.fillRect(x-22, y-8, 44, 7);
      ctx.fillStyle = C.wood;
      ctx.fillRect(x-20, y-10, 40, 5);
    }

    function drawTorch(tx: number, ty: number, t: number) {
      const glow = ctx.createRadialGradient(tx, ty, 0, tx, ty, 100);
      glow.addColorStop(0, 'rgba(255,140,0,0.13)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(tx-100, ty-100, 200, 200);
      ctx.fillStyle = C.woodDark;
      ctx.fillRect(tx-3, ty+2, 6, 16);
      ctx.fillStyle = C.wood;
      ctx.fillRect(tx-5, ty, 10, 5);
      const flk = Math.sin(t*9+tx*0.1)*2.5;
      ctx.fillStyle = C.fire1;
      ctx.beginPath();
      ctx.ellipse(tx+flk*.3, ty-5, 5+Math.abs(flk)*.3, 8, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = C.fire3;
      ctx.beginPath();
      ctx.ellipse(tx+flk*.15, ty-5, 3, 5, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.ellipse(tx, ty-5, 1.5, 2.5, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ── Draw: round table ─────────────────────────────────────────────────────
    function drawTable(t: number) {
      const ccx = cx(), ccy = cy(), tr = tblR(), sr = seatR();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(ccx+8, ccy+12, tr, tr*0.28, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = C.tableWood;
      ctx.beginPath(); ctx.arc(ccx, ccy, tr, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = C.tableFelt;
      ctx.beginPath(); ctx.arc(ccx, ccy, tr-8, 0, Math.PI*2); ctx.fill();
      // carved lines
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      for (let a = 0; a < Math.PI*2; a += Math.PI/6) {
        ctx.beginPath();
        ctx.moveTo(ccx, ccy);
        ctx.lineTo(ccx+Math.cos(a)*(tr-8), ccy+Math.sin(a)*(tr-8));
        ctx.stroke();
      }
      ctx.strokeStyle = C.gold; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ccx, ccy, tr, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ccx, ccy, tr-10, 0, Math.PI*2); ctx.stroke();
      // seats
      for (let i = 0; i < 12; i++) {
        const ang = seatA(i);
        const sx2 = ccx+Math.cos(ang)*sr, sy2 = ccy+Math.sin(ang)*sr;
        ctx.fillStyle = 'rgba(92,61,30,0.55)';
        ctx.beginPath(); ctx.arc(sx2, sy2, 12, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = C.gold; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sx2, sy2, 12, 0, Math.PI*2); ctx.stroke();
      }
      // center symbol
      const pulse = 0.8+0.2*Math.sin(t*1.4);
      ctx.globalAlpha = pulse*0.5;
      ctx.fillStyle = C.gold;
      ctx.font = Math.round(tr*0.42)+'px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⚜', ccx, ccy);
      ctx.globalAlpha = 1;
    }

    // ── Draw: activity props ──────────────────────────────────────────────────
    function drawActivityProp(a: Agent, t: number) {
      const { x, y, activity, actPhase } = a;
      const s = 28/32;

      switch (activity) {
        case 'eat': {
          // bowl/chalice on table in front
          ctx.fillStyle = '#8b6535';
          ctx.beginPath(); ctx.ellipse(x+8, y+4, 7, 4, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#c8a060';
          ctx.beginPath(); ctx.ellipse(x+8, y+2, 5, 3, 0, 0, Math.PI*2); ctx.fill();
          // food item going to mouth
          const armY = Math.sin(t*4+actPhase)*6;
          ctx.fillStyle = '#c8732a';
          ctx.beginPath(); ctx.arc(x-8+Math.cos(t*4+actPhase)*4, y-8+armY, 3, 0, Math.PI*2); ctx.fill();
          break;
        }
        case 'read': {
          // open book
          ctx.fillStyle = '#6b4c2a';
          ctx.fillRect(x-14, y-2, 28, 18);
          ctx.fillStyle = '#e8d9b8';
          ctx.fillRect(x-13, y-1, 12, 16);
          ctx.fillRect(x+2, y-1, 12, 16);
          // text lines
          ctx.strokeStyle = '#8b7040'; ctx.lineWidth = 0.8;
          for (let ly = y+3; ly < y+14; ly += 3) {
            ctx.beginPath(); ctx.moveTo(x-11, ly); ctx.lineTo(x-3, ly); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x+3, ly); ctx.lineTo(x+11, ly); ctx.stroke();
          }
          // page turn
          const pageFlip = Math.sin(t*0.8+actPhase)*4;
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = '#e8d9b8';
          ctx.beginPath();
          ctx.moveTo(x+2, y-1);
          ctx.lineTo(x+2+pageFlip, y+8);
          ctx.lineTo(x+2, y+15);
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
        case 'magic': {
          // staff/wand raised
          ctx.strokeStyle = '#6b4c2a'; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x-8, y+8);
          ctx.lineTo(x-14, y-16);
          ctx.stroke();
          // magic orb at tip
          const magicPulse = 0.7+0.3*Math.sin(t*3.5+actPhase);
          const magicColors = ['rgba(150,50,220,', 'rgba(50,150,220,', 'rgba(220,50,150,'];
          const mc = magicColors[Math.floor(actPhase)%magicColors.length];
          const orbGlow = ctx.createRadialGradient(x-14, y-16, 0, x-14, y-16, 20);
          orbGlow.addColorStop(0, mc+magicPulse+')');
          orbGlow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = orbGlow;
          ctx.beginPath(); ctx.arc(x-14, y-16, 20, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = `rgba(200,150,255,${magicPulse})`;
          ctx.beginPath(); ctx.arc(x-14, y-16, 5, 0, Math.PI*2); ctx.fill();
          // rune circle on ground
          ctx.strokeStyle = `rgba(150,50,220,${0.3+0.2*Math.sin(t*2)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y+10, 20, 0, Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.arc(x, y+10, 14, 0, Math.PI*2); ctx.stroke();
          spawnMagicSpark(x-14, y-16, `rgba(${180+Math.sin(t*4)*40},100,255,0.8)`);
          break;
        }
        case 'write': {
          // quill motion
          const qx = x+6+Math.sin(t*5+actPhase)*8;
          ctx.strokeStyle = '#8b7355'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(qx, y+4); ctx.lineTo(qx-4, y+14); ctx.stroke();
          ctx.fillStyle = '#f0e8c0';
          ctx.beginPath();
          ctx.moveTo(qx, y+4); ctx.lineTo(qx+4, y); ctx.lineTo(qx+2, y+8); ctx.fill();
          // ink trail
          ctx.fillStyle = 'rgba(20,10,0,0.6)';
          ctx.fillRect(x-8, y+14, 16, 1);
          break;
        }
        case 'cook': {
          // ladle/spoon stirring
          const stirAngle = t*2.5+actPhase;
          const ladleX = x+Math.cos(stirAngle)*10, ladleY = y-4+Math.sin(stirAngle)*5;
          ctx.strokeStyle = '#6b4c2a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x, y+2); ctx.lineTo(ladleX, ladleY); ctx.stroke();
          ctx.fillStyle = '#4a3218';
          ctx.beginPath(); ctx.arc(ladleX, ladleY, 4, 0, Math.PI*2); ctx.fill();
          break;
        }
        case 'meditate': {
          // floating aura
          const auraAlpha = 0.1+0.08*Math.sin(t*1.8+actPhase);
          const aura = ctx.createRadialGradient(x, y, 0, x, y, 35);
          aura.addColorStop(0, `rgba(100,200,255,${auraAlpha*3})`);
          aura.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = aura;
          ctx.beginPath(); ctx.arc(x, y, 35, 0, Math.PI*2); ctx.fill();
          // halo ring
          ctx.strokeStyle = `rgba(100,200,255,${0.25+0.15*Math.sin(t*2)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x, y-22, 10, 0, Math.PI*2); ctx.stroke();
          break;
        }
        case 'music': {
          // lute shape
          ctx.fillStyle = '#6b4c2a';
          ctx.beginPath(); ctx.ellipse(x+10, y+4, 10, 12, 0.3, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = '#2a1a08'; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(x+10, y-8); ctx.lineTo(x+10, y+16); ctx.stroke();
          for (let s2 = 0; s2 < 4; s2++) {
            ctx.beginPath(); ctx.moveTo(x+5+s2*2, y-6); ctx.lineTo(x+6+s2*1.5, y+14); ctx.stroke();
          }
          // arm strumming
          const strumY = Math.sin(t*6+actPhase)*5;
          ctx.strokeStyle = '#c8a060'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x-4, y-4); ctx.lineTo(x+6, y+strumY); ctx.stroke();
          spawnNote(x, y-16);
          break;
        }
        case 'sleep': {
          spawnZzz(x, y-28);
          // pillow
          ctx.fillStyle = '#d4c8a8';
          ctx.beginPath(); ctx.ellipse(x, y+10, 12, 6, 0, 0, Math.PI*2); ctx.fill();
          break;
        }
        case 'talk': {
          // speech bubble
          const bubbleAlpha = 0.7+0.3*Math.sin(t*2.5+actPhase);
          ctx.fillStyle = `rgba(40,35,28,${bubbleAlpha})`;
          ctx.beginPath();
          ctx.roundRect(x-18, y-36, 36, 22, 6);
          ctx.fill();
          ctx.strokeStyle = `rgba(201,168,76,${bubbleAlpha*0.6})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(x-18, y-36, 36, 22, 6);
          ctx.stroke();
          // tail
          ctx.fillStyle = `rgba(40,35,28,${bubbleAlpha})`;
          ctx.beginPath(); ctx.moveTo(x-4, y-14); ctx.lineTo(x-2, y-10); ctx.lineTo(x+4, y-14); ctx.closePath(); ctx.fill();
          // dots inside
          for (let d = 0; d < 3; d++) {
            const dPulse = Math.sin(t*4+d*1.2+actPhase);
            ctx.fillStyle = `rgba(201,168,76,${0.5+0.5*dPulse})`;
            ctx.beginPath(); ctx.arc(x-6+d*6, y-25+dPulse*2, 2, 0, Math.PI*2); ctx.fill();
          }
          break;
        }
      }
    }

    // ── Draw: voxel character ─────────────────────────────────────────────────
    function drawAgent(a: Agent, t: number) {
      const { x, y, seated, dotPhase, workPhase, char, activity, actPhase } = a;
      const sz = 28, s  = sz/32;
      const floatY = activity==='meditate' ? Math.sin(t*1.5+actPhase)*4 : 0;
      const ox = Math.round(x-16*s);
      const oy = Math.round(y-20*s-floatY);
      const px = (rx: number, ry: number, rw: number, rh: number) =>
        ctx.fillRect(ox+Math.round(rx*s), oy+Math.round(ry*s), Math.max(1,Math.round(rw*s)), Math.max(1,Math.round(rh*s)));

      // draw activity prop (behind character)
      drawActivityProp(a, t);

      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(x, oy+Math.round(39*s), Math.round(10*s), Math.max(1,Math.round(2*s)), 0, 0, Math.PI*2);
      ctx.fill();

      // medieval robe/tunic (body lower extension)
      ctx.fillStyle = char.pants;
      px(7,27,18,9);   // robe skirt
      // shoes
      ctx.fillStyle = '#1a1008';
      px(8,36,7,2);
      px(17,36,7,2);

      // arms with activity motion
      const isActive = activeRef.current;
      let armSwing = 0;
      if (activity==='eat' || activity==='write' || activity==='cook') {
        armSwing = Math.sin(t*4+workPhase)*0.5;
      } else if (activity==='music') {
        armSwing = Math.sin(t*6+workPhase)*0.7;
      } else if (!seated) {
        armSwing = Math.sin(t*2+workPhase)*0.25;
      }

      // left arm
      ctx.fillStyle = char.body;
      const laY = Math.round(armSwing*4);
      px(2, 15+laY, 5, 10-Math.abs(laY));
      // right arm
      const raY = Math.round(-armSwing*4);
      px(25, 15+raY, 5, 10-Math.abs(raY));

      // body / tunic
      ctx.fillStyle = char.body;
      px(7,15,18,11);
      // tunic highlight
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      px(7,15,2,11);
      // belt
      ctx.fillStyle = C.woodDark;
      px(7,24,18,2);
      ctx.fillStyle = C.gold;
      px(14,24,4,2);
      // accent stripe
      if (char.accent) {
        ctx.fillStyle = char.accent;
        ctx.globalAlpha = 0.5;
        px(9,16,14,2);
        ctx.globalAlpha = 1;
      }

      // neck
      ctx.fillStyle = char.skin;
      px(13,14,6,2);

      // head
      ctx.fillStyle = char.skin;
      px(6,0,20,14);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      px(6,0,2,14);

      // hair
      ctx.fillStyle = char.hair;
      px(6,0,20,4);
      px(6,4,2,8);
      px(24,4,2,8);

      // medieval hood/hat overlay for some characters
      if (activity==='magic' || activity==='meditate') {
        ctx.fillStyle = char.hair;
        ctx.globalAlpha = 0.6;
        px(6,0,20,6);
        // pointed tip
        ctx.beginPath();
        ctx.moveTo(ox+Math.round(8*s), oy);
        ctx.lineTo(ox+Math.round(16*s), oy-Math.round(8*s));
        ctx.lineTo(ox+Math.round(24*s), oy);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // blink
      const blink = ((t*1000+a.blinkT)%3600)<120;
      const eyeH  = blink?0.5:2;
      ctx.fillStyle = char.eyes;
      px(10,6,3,eyeH);
      px(19,6,3,eyeH);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      px(12,6,1,1); px(21,6,1,1);

      // mouth (smile for eat/music, neutral otherwise)
      ctx.fillStyle = '#1a1a1a';
      ctx.globalAlpha = 0.7;
      if (activity==='eat'||activity==='music') {
        ctx.beginPath();
        ctx.arc(ox+Math.round(16*s), oy+Math.round(12*s), Math.round(3*s), 0, Math.PI);
        ctx.fill();
      } else {
        px(10,11,6,1);
      }
      ctx.globalAlpha = 1;

      // accessories
      if (char.accessory==='glasses') {
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = Math.max(1,s*0.9);
        ctx.strokeRect(ox+Math.round(9*s),oy+Math.round(5*s),Math.round(5*s),Math.round(4*s));
        ctx.strokeRect(ox+Math.round(18*s),oy+Math.round(5*s),Math.round(5*s),Math.round(4*s));
        ctx.fillStyle = '#1a1a1a';
        px(14,6,4,1);
      }
      if (char.accessory==='beard') {
        ctx.fillStyle = char.beardColor||'#D5D5D5';
        px(8,12,16,3); px(7,10,3,4); px(22,10,3,4);
      }
      if (char.accessory==='headband') {
        ctx.fillStyle = '#8B1A1A';
        px(6,4,20,2);
      }

      // thinking dots when active at table
      if (isActive && seated) {
        for (let d = 0; d < 3; d++) {
          const dph  = (t*3.5+dotPhase+d*0.7)%(Math.PI*2);
          const dy2  = oy-Math.abs(Math.sin(dph))*7;
          ctx.globalAlpha = 0.3+0.7*Math.abs(Math.sin(dph));
          ctx.fillStyle = char.body;
          ctx.beginPath(); ctx.arc(x-4+d*4, dy2, 2.2, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }

    // ── Draw: particles ───────────────────────────────────────────────────────
    function drawParticles() {
      for (let i = particles.length-1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vy *= 0.96; p.vx *= 0.98;
        p.life -= 1/p.maxLife;
        if (p.life <= 0) { particles.splice(i,1); continue; }
        ctx.globalAlpha = p.life*0.85;
        ctx.fillStyle = p.color;
        if (p.color.startsWith('rgba') || p.color.startsWith('rgb')) {
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }

    // ── Agents setup ──────────────────────────────────────────────────────────
    const agents: Agent[] = CREATORS.slice(0,12).map((c,i) => {
      const ang = seatA(i);
      const sr  = seatR();
      const sx  = cx()+Math.cos(ang)*sr;
      const sy  = cy()+Math.sin(ang)*sr;
      const zs  = zones();
      const zone = zs[i%zs.length];
      return {
        x: zone.x+rnd(-15,15), y: zone.y+rnd(-15,15),
        vx:0, vy:0, tx:zone.x, ty:zone.y,
        sx, sy, seated:false,
        blinkT:   Math.random()*4000,
        dotPhase: Math.random()*Math.PI*2,
        workPhase:Math.random()*Math.PI*2,
        actPhase: i%3,
        activity: ACTIVITIES[i],
        zoneIndex:i,
        char: CHARS[c.id]||DEFAULT_CHAR,
      };
    });

    // ── Update agents ─────────────────────────────────────────────────────────
    function updateAgents() {
      const isActive = activeRef.current;
      const ccx = cx(), ccy = cy(), tr = tblR(), sr = seatR();
      const zs = zones();
      const SPEED = 0.7;

      for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        a.sx = ccx+Math.cos(seatA(i))*sr;
        a.sy = ccy+Math.sin(seatA(i))*sr;

        if (isActive) {
          // move to seat
          a.x = lerp(a.x, a.sx, 0.05);
          a.y = lerp(a.y, a.sy, 0.05);
          a.seated = dist(a.x,a.y,a.sx,a.sy)<12;
          a.tx = a.sx; a.ty = a.sy;
        } else {
          a.seated = false;
          const zone = zs[a.zoneIndex%zs.length];
          // wander near zone
          if (dist(a.x,a.y,a.tx,a.ty)<8) {
            a.tx = zone.x+rnd(-25,25);
            a.ty = zone.y+rnd(-20,20);
          }
          const dx = a.tx-a.x, dy = a.ty-a.y;
          const dl = Math.sqrt(dx*dx+dy*dy);
          if (dl > 1) {
            a.vx = lerp(a.vx, (dx/dl)*SPEED, 0.07);
            a.vy = lerp(a.vy, (dy/dl)*SPEED, 0.07);
          }
          // avoid table
          const td = dist(a.x+a.vx, a.y+a.vy, ccx, ccy);
          if (td < tr+28) {
            const aa = Math.atan2(a.y-ccy, a.x-ccx);
            a.vx += Math.cos(aa)*0.8;
            a.vy += Math.sin(aa)*0.8;
          }
          a.x = clamp(a.x+a.vx, PAD+16, W-PAD-16);
          a.y = clamp(a.y+a.vy, PAD+16, H-PAD-16);
        }
      }
    }

    // ── Main loop ─────────────────────────────────────────────────────────────
    const t0 = performance.now();
    let rafId = 0;

    function frame(now: number) {
      const t = (now-t0)/1000;
      ctx.clearRect(0,0,W,H);
      drawRoom(t);
      drawParticles();
      drawTable(t);
      // sort by y for depth
      const sorted = agents.map((a,i)=>({a,i})).sort((p,q)=>p.a.y-q.a.y);
      for (const {a} of sorted) drawAgent(a,t);
      updateAgents();
      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener('resize',onResize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:'fixed', inset:0, width:'100%', height:'100%',
        zIndex:0, pointerEvents:'none', imageRendering:'pixelated', display:'block',
      }}
    />
  );
}
