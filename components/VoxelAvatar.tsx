'use client';

/**
 * VoxelAvatar — pixel/voxel-style character sprite for each council member.
 * Each character is a unique SVG with blocky Minecraft-inspired aesthetics.
 */

interface VoxelProps {
  creatorId: string;
  size?: number;
  className?: string;
}

interface CharDef {
  skin: string;
  hair: string;
  body: string;
  pants: string;
  eyes: string;
  accent?: string;         // shirt detail / scarf / trim
  accessory?: 'glasses' | 'beard' | 'headband' | 'hat' | 'hood' | 'none';
  beardColor?: string;
  mouthType?: 'smile' | 'flat' | 'smirk' | 'open';
}

const CHARS: Record<string, CharDef> = {
  'mark-manson': {
    skin: '#C68642', hair: '#2C1B0E', body: '#C0392B',
    pants: '#2C2C2C', eyes: '#1a1a1a', accent: '#8B0000',
    accessory: 'none', mouthType: 'smirk',
  },
  'derek-sivers': {
    skin: '#F5CBA7', hair: '#2C1B0E', body: '#2980B9',
    pants: '#1A252F', eyes: '#1a1a1a', accent: '#FFFFFF',
    accessory: 'none', mouthType: 'smile',
  },
  'steven-bartlett': {
    skin: '#8D5524', hair: '#1a1008', body: '#7D3C98',
    pants: '#1C1C2E', eyes: '#1a1a1a', accent: '#BDC3C7',
    accessory: 'none', mouthType: 'flat',
  },
  'the-mit-monk': {
    skin: '#F0D9B5', hair: '#1a1a1a', body: '#17A589',
    pants: '#0E6655', eyes: '#1a1a1a', accent: '#FFFFFF',
    accessory: 'glasses', mouthType: 'flat',
  },
  'professor-jiang': {
    skin: '#F5CBA7', hair: '#1a1a1a', body: '#CA6F1E',
    pants: '#784212', eyes: '#1a1a1a', accent: '#F9E79F',
    accessory: 'glasses', mouthType: 'smile',
  },
  'jett-franzen': {
    skin: '#D4A76A', hair: '#2C1B0E', body: '#D4AC0D',
    pants: '#1a1a1a', eyes: '#1a1a1a', accent: '#7D6608',
    accessory: 'none', mouthType: 'open',
  },
  'jason-pargin': {
    skin: '#F5CBA7', hair: '#6B3D2E', body: '#27AE60',
    pants: '#1E8449', eyes: '#1a1a1a', accent: '#FFFFFF',
    accessory: 'none', mouthType: 'smirk',
  },
  'jay-shetty': {
    skin: '#8D5524', hair: '#1a1008', body: '#784212',
    pants: '#4A235A', eyes: '#1a1a1a', accent: '#F0B27A',
    accessory: 'headband', mouthType: 'smile',
  },
  'luke-belmar': {
    skin: '#F0D9B5', hair: '#1a1a1a', body: '#922B21',
    pants: '#0B0B0B', eyes: '#1a1a1a', accent: '#F8F9FA',
    accessory: 'none', mouthType: 'flat',
  },
  'chase-hughes': {
    skin: '#D4A76A', hair: '#2C1B0E', body: '#148F77',
    pants: '#0E6655', eyes: '#1a1a1a', accent: '#85C1E9',
    accessory: 'none', mouthType: 'flat',
  },
  'orion-taraban': {
    skin: '#F5CBA7', hair: '#6B3D2E', body: '#6C3483',
    pants: '#2C1654', eyes: '#1a1a1a', accent: '#D2B4DE',
    accessory: 'none', mouthType: 'smirk',
  },
  'rick-rubin': {
    skin: '#F5CBA7', hair: '#E8E8E8', body: '#717D7E',
    pants: '#2C3E50', eyes: '#1a1a1a', accent: '#FFFFFF',
    accessory: 'beard', beardColor: '#D5D5D5', mouthType: 'smile',
  },
};

const DEFAULT_CHAR: CharDef = {
  skin: '#F5CBA7', hair: '#2C1B0E', body: '#7F8C8D',
  pants: '#2C2C2C', eyes: '#1a1a1a', accent: '#BDC3C7',
  accessory: 'none', mouthType: 'flat',
};

function getMouthPath(type: CharDef['mouthType'], cx: number, cy: number, scale: number): JSX.Element {
  const s = scale;
  switch (type) {
    case 'smile':
      return <><rect x={cx - 4*s} y={cy} width={2*s} height={s} fill="#1a1a1a"/><rect x={cx - 2*s} y={cy + s} width={4*s} height={s} fill="#1a1a1a"/><rect x={cx + 2*s} y={cy} width={2*s} height={s} fill="#1a1a1a"/></>;
    case 'smirk':
      return <><rect x={cx - 4*s} y={cy + s} width={2*s} height={s} fill="#1a1a1a"/><rect x={cx - 2*s} y={cy} width={4*s} height={s} fill="#1a1a1a"/></>;
    case 'open':
      return <><rect x={cx - 3*s} y={cy} width={6*s} height={2*s} fill="#1a1a1a"/><rect x={cx - 2*s} y={cy} width={4*s} height={2*s} fill="#8B0000"/></>;
    default: // flat
      return <rect x={cx - 3*s} y={cy} width={6*s} height={s} fill="#1a1a1a"/>;
  }
}

export function VoxelAvatar({ creatorId, size = 64, className }: VoxelProps) {
  const c = CHARS[creatorId] || DEFAULT_CHAR;

  // All coordinates are in a 32×40 grid, then scaled
  const s = size / 32; // scale factor
  const W = 32 * s;
  const H = 40 * s;

  // Head: x=6..26, y=0..14  (20 wide, 14 tall)
  const hx = 6 * s, hy = 0, hw = 20 * s, hh = 14 * s;
  // Body: x=7..25, y=15..26  (18 wide, 11 tall)
  const bx = 7 * s, by = 15 * s, bw = 18 * s, bh = 11 * s;
  // Left leg: x=7..14, y=27..38
  const llx = 7 * s, lly = 27 * s, llw = 8 * s, llh = 11 * s;
  // Right leg: x=17..24, y=27..38
  const rlx = 17 * s, rly = 27 * s, rlw = 8 * s, rlh = 11 * s;

  // Arms: x=2..6 left, x=26..30 right, y=15..25
  const lax = 2 * s, lay = 15 * s, law = 5 * s, lah = 10 * s;
  const rax = 25 * s, ray = 15 * s, raw_ = 5 * s, rah = 10 * s;

  // Hair: top of head (6..26, 0..3)
  const hrx = 6 * s, hry = 0, hrw = 20 * s, hrh = 4 * s;
  // Side hair: thin strips
  const hairL = { x: 6 * s, y: 4 * s, w: 2 * s, h: 8 * s };
  const hairR = { x: 24 * s, y: 4 * s, w: 2 * s, h: 8 * s };

  // Eyes: left (10..13, 6..8), right (19..22, 6..8)
  const lex = 10 * s, ley = 6 * s, lew = 3 * s, leh = 2 * s;
  const rex = 19 * s, rey = 6 * s, rew = 3 * s, reh = 2 * s;

  // Mouth center at (16, 11)
  const mouthCX = 16 * s, mouthCY = 11 * s;

  // Shirt accent stripe
  const accentX = 9 * s, accentY = 16 * s, accentW = 14 * s, accentH = 2 * s;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Shadow */}
      <ellipse cx={W/2} cy={H - 1*s} rx={10*s} ry={2*s} fill="rgba(0,0,0,0.25)" />

      {/* Legs */}
      <rect x={llx} y={lly} width={llw} height={llh} fill={c.pants} />
      <rect x={rlx} y={rly} width={rlw} height={rlh} fill={c.pants} />
      {/* Leg highlight */}
      <rect x={llx} y={lly} width={2*s} height={llh} fill="rgba(255,255,255,0.12)" />
      <rect x={rlx} y={rly} width={2*s} height={rlh} fill="rgba(255,255,255,0.12)" />
      {/* Shoes */}
      <rect x={llx} y={lly + 9*s} width={llw} height={2*s} fill="#1a1008" />
      <rect x={rlx} y={rly + 9*s} width={rlw} height={2*s} fill="#1a1008" />

      {/* Arms */}
      <rect x={lax} y={lay} width={law} height={lah} fill={c.body} />
      <rect x={rax} y={ray} width={raw_} height={rah} fill={c.body} />
      {/* Arm highlight */}
      <rect x={lax} y={lay} width={s} height={lah} fill="rgba(255,255,255,0.15)" />

      {/* Body */}
      <rect x={bx} y={by} width={bw} height={bh} fill={c.body} />
      {/* Body highlight (left edge) */}
      <rect x={bx} y={by} width={2*s} height={bh} fill="rgba(255,255,255,0.15)" />
      {/* Body shadow (right edge) */}
      <rect x={bx + bw - 2*s} y={by} width={2*s} height={bh} fill="rgba(0,0,0,0.2)" />
      {/* Shirt accent stripe */}
      {c.accent && (
        <rect x={accentX} y={accentY} width={accentW} height={accentH} fill={c.accent} opacity={0.5} />
      )}

      {/* Head base */}
      <rect x={hx} y={hy} width={hw} height={hh} fill={c.skin} />
      {/* Head highlight */}
      <rect x={hx} y={hy} width={2*s} height={hh} fill="rgba(255,255,255,0.18)" />
      {/* Head shadow */}
      <rect x={hx + hw - 2*s} y={hy} width={2*s} height={hh} fill="rgba(0,0,0,0.18)" />

      {/* Hair top */}
      <rect x={hrx} y={hry} width={hrw} height={hrh} fill={c.hair} />
      {/* Side hair */}
      <rect x={hairL.x} y={hairL.y} width={hairL.w} height={hairL.h} fill={c.hair} />
      <rect x={hairR.x} y={hairR.y} width={hairR.w} height={hairR.h} fill={c.hair} />

      {/* Eyes */}
      <rect x={lex} y={ley} width={lew} height={leh} fill={c.eyes} />
      <rect x={rex} y={rey} width={rew} height={reh} fill={c.eyes} />
      {/* Eye shine */}
      <rect x={lex + lew - s} y={ley} width={s} height={s} fill="rgba(255,255,255,0.7)" />
      <rect x={rex + rew - s} y={rey} width={s} height={s} fill="rgba(255,255,255,0.7)" />

      {/* Mouth */}
      {getMouthPath(c.mouthType, mouthCX, mouthCY, s)}

      {/* Accessory overlays */}
      {c.accessory === 'glasses' && (
        <>
          {/* Left lens frame */}
          <rect x={lex - s} y={ley - s} width={lew + 2*s} height={leh + 2*s} fill="none" stroke="#1a1a1a" strokeWidth={s} />
          {/* Right lens frame */}
          <rect x={rex - s} y={rey - s} width={rew + 2*s} height={reh + 2*s} fill="none" stroke="#1a1a1a" strokeWidth={s} />
          {/* Bridge */}
          <rect x={lex + lew} y={ley} width={rex - lex - lew} height={s} fill="#1a1a1a" />
        </>
      )}
      {c.accessory === 'beard' && (
        <>
          <rect x={hx + 2*s} y={mouthCY + s} width={hw - 4*s} height={3*s} fill={c.beardColor || '#D5D5D5'} />
          <rect x={hx + s} y={mouthCY - s} width={3*s} height={4*s} fill={c.beardColor || '#D5D5D5'} />
          <rect x={hx + hw - 4*s} y={mouthCY - s} width={3*s} height={4*s} fill={c.beardColor || '#D5D5D5'} />
        </>
      )}
      {c.accessory === 'headband' && (
        <rect x={hx} y={4*s} width={hw} height={2*s} fill="#E74C3C" />
      )}
      {c.accessory === 'hat' && (
        <>
          <rect x={hx - 2*s} y={3*s} width={hw + 4*s} height={2*s} fill="#1a1a1a" />
          <rect x={hx + 2*s} y={0} width={hw - 4*s} height={4*s} fill="#2C2C2C" />
        </>
      )}
      {c.accessory === 'hood' && (
        <rect x={hx} y={0} width={hw} height={6*s} fill={c.body} opacity={0.7} />
      )}

      {/* Neck connector */}
      <rect x={13*s} y={14*s} width={6*s} height={2*s} fill={c.skin} />
    </svg>
  );
}
