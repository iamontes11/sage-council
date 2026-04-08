'use client';
import { useEffect, useRef } from 'react';
import { CREATORS } from '@/lib/creators';
import { CHARS, DEFAULT_CHAR } from '@/components/VoxelAvatar';
import type { CharDef } from '@/components/VoxelAvatar';

// ── Palette ──────────────────────────────────────────────────────────────────
// Pokémon-style: clear, flat, saturated
const P = {
  // walls
  wall:    '#2d2416', wallBrick: '#3d3020', wallMid: '#4a3c28', wallLight: '#5a4c34',
  // floors
  stoneA:  '#7a6e5a', stoneB: '#6e6250',
  woodA:   '#a07840', woodB:  '#8a6830',
  grassA:  '#4a7a30', grassB: '#3a6a20',
  rug:     '#7a1a1a', rugBorder: '#c9a020',
  // furniture
  wood:    '#8b5e2a', woodDark: '#5c3d14', woodLight: '#c8a060',
  shelf:   '#5c3d14', book1: '#c02020', book2: '#2040c0', book3: '#208040',
  book4: '#c0a000', book5: '#802080',
  desk:    '#7a5520', parchment: '#e8d9a0',
  bed:     '#8b5e2a', bedSheet: '#c8d8f0', pillow: '#e8e0d0',
  table:   '#6b4820', tableFelt: '#1a4020', tableGold: '#c9a020',
  chair:   '#5c3d14',
  cauldron:'#282828', cauldronRim: '#404040', brew: '#2a7a20',
  potion1: '#c02020', potion2: '#2040c0', potion3: '#806000',
  fireYel: '#ffcc00', fireOra: '#ff8800', fireRed: '#ff4400',
  torchWood: '#5c3d14',
  // accents
  gold:    '#c9a020', door: '#3a8a30', doorFrame: '#5c3d14',
  window:  '#6080c0', windowFr: '#4a3214',
  plant:   '#308030', plantPot: '#8b4c20',
  tapRed:  '#7a1a1a', tapBlue: '#1a2a7a',
  runeBlue:'#4060e0', runeGlow: '#8090ff',
  smoke:   '#b0a090',
};

const WALL = 16;   // wall thickness in pixels
const TILE = 16;   // floor tile size

interface Particle { x:number;y:number;vx:number;vy:number;life:number;maxLife:number;col:string;r:number }
interface Agent {
  x:number;y:number;vx:number;vy:number;tx:number;ty:number;
  sx:number;sy:number;seated:boolean;
  blinkT:number;workPhase:number;actPhase:number;
  activity:string;char:CharDef;
}

const ACTIVITIES = ['eat','eat','read','read','magic','magic','write','cook','meditate','music','sleep','talk'];

export default function CouncilBackground({ active=false }:{ active?:boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  useEffect(()=>{ activeRef.current=active; },[active]);

  useEffect(()=>{
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    let W=window.innerWidth, H=window.innerHeight;
    canvas.width=W; canvas.height=H;
    const onResize=()=>{ W=window.innerWidth;H=window.innerHeight;canvas.width=W;canvas.height=H; };
    window.addEventListener('resize',onResize);

    const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
    const dist=(x1:number,y1:number,x2:number,y2:number)=>Math.sqrt((x2-x1)**2+(y2-y1)**2);
    const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
    const rnd=(lo:number,hi:number)=>lo+Math.random()*(hi-lo);

    // Layout helpers — everything in %, recalculated each frame
    const L=()=>({
      // room borders
      left: WALL, right: W-WALL, top: WALL, bot: H-WALL,
      // vertical dividers
      vd1: Math.round(W*0.30), vd2: Math.round(W*0.70),
      // horizontal dividers
      hd1: Math.round(H*0.38), hd2: Math.round(H*0.65),
      // center
      cx: W/2, cy: H/2,
      // table
      tR: Math.min(W,H)*0.09,
      sR: Math.min(W,H)*0.145,
    });

    // ── Particles ──────────────────────────────────────────────────────────────
    const particles:Particle[]=[];
    const addP=(x:number,y:number,vx:number,vy:number,life:number,col:string,r=2)=>{
      if(particles.length<150) particles.push({x,y,vx,vy,life,maxLife:life,col,r});
    };
    const spawnFire=(x:number,y:number)=>{
      if(Math.random()<0.35) addP(x+rnd(-2,2),y,rnd(-.3,.3),rnd(-1.2,-.4),rnd(18,40),[P.fireYel,P.fireOra,P.fireRed][Math.floor(Math.random()*3)],1.5);
    };
    const spawnSmoke=(x:number,y:number)=>{
      if(Math.random()<0.08) addP(x+rnd(-2,2),y,rnd(-.15,.15),rnd(-.5,-.2),rnd(40,70),P.smoke,2);
    };
    const spawnMagic=(x:number,y:number)=>{
      if(Math.random()<0.3) addP(x+rnd(-10,10),y+rnd(-10,10),rnd(-.8,.8),rnd(-1.5,-.3),rnd(12,30),'#a070ff',2);
    };
    const spawnNote=(x:number,y:number)=>{
      if(Math.random()<0.05) addP(x,y,rnd(-.2,.2),rnd(-.5,-.2),rnd(50,90),P.gold,1.5);
    };
    const spawnZzz=(x:number,y:number)=>{
      if(Math.random()<0.03) addP(x,y,rnd(-.1,.1),rnd(-.3,-.1),rnd(60,110),'rgba(180,200,255,0.9)',1.5);
    };

    // ── Floor tile (Pokémon-style) ────────────────────────────────────────────
    function fillFloor(x:number,y:number,w:number,h:number,colA:string,colB:string,tileSize=TILE){
      for(let r=y;r<y+h;r+=tileSize){
        for(let c=x;c<x+w;c+=tileSize){
          ctx.fillStyle=((Math.floor(r/tileSize)+Math.floor(c/tileSize))%2)?colA:colB;
          ctx.fillRect(c,r,Math.min(tileSize,x+w-c),Math.min(tileSize,y+h-r));
        }
      }
      // subtle grid lines
      ctx.strokeStyle='rgba(0,0,0,0.12)';
      ctx.lineWidth=1;
      for(let r=y;r<=y+h;r+=tileSize){ ctx.beginPath();ctx.moveTo(x,r);ctx.lineTo(x+w,r);ctx.stroke(); }
      for(let c=x;c<=x+w;c+=tileSize){ ctx.beginPath();ctx.moveTo(c,y);ctx.lineTo(c,y+h);ctx.stroke(); }
    }

    // ── Wall segment ──────────────────────────────────────────────────────────
    function fillWall(x:number,y:number,w:number,h:number){
      ctx.fillStyle=P.wall;
      ctx.fillRect(x,y,w,h);
      // brick rows
      const bw=20,bh=10;
      for(let r=Math.floor(y/bh);r<=(y+h)/bh;r++){
        const off=(r%2)?bw/2:0;
        for(let c=-1;c<=(w/bw)+1;c++){
          const bx=x+c*bw+off,by=r*bh;
          if(bx+bw<=x||bx>=x+w||by+bh<=y||by>=y+h) continue;
          const cx2=clamp(bx,x,x+w), cy2=clamp(by,y,y+h);
          const cw=clamp(bx+bw,x,x+w)-cx2, ch=clamp(by+bh,y,y+h)-cy2;
          ctx.fillStyle=P.wallBrick; ctx.fillRect(cx2+1,cy2+1,cw-2,ch-2);
          ctx.fillStyle=P.wallLight; ctx.fillRect(cx2+1,cy2+1,cw-2,1);ctx.fillRect(cx2+1,cy2+1,1,ch-2);
        }
      }
    }

    // ── Door ─────────────────────────────────────────────────────────────────
    function drawDoor(x:number,y:number,w:number,h:number){
      ctx.fillStyle=P.doorFrame; ctx.fillRect(x,y,w,h);
      ctx.fillStyle=P.door;      ctx.fillRect(x+2,y+2,w-4,h-4);
      ctx.fillStyle=P.woodLight; ctx.fillRect(x+w-6,y+h/2-2,3,4); // handle
    }

    // ── Window ────────────────────────────────────────────────────────────────
    function drawWindow(x:number,y:number,w:number,h:number,t:number){
      ctx.fillStyle=P.windowFr; ctx.fillRect(x,y,w,h);
      const shimmer=0.55+0.15*Math.sin(t*0.8);
      ctx.fillStyle=`rgba(80,110,200,${shimmer})`; ctx.fillRect(x+2,y+2,w-4,h-4);
      ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x+w/2,y+2);ctx.lineTo(x+w/2,y+h-2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(x+2,y+h/2);ctx.lineTo(x+w-2,y+h/2);ctx.stroke();
    }

    // ── Torch on wall ─────────────────────────────────────────────────────────
    function drawTorch(x:number,y:number,t:number){
      spawnFire(x,y-4);
      ctx.fillStyle=P.torchWood; ctx.fillRect(x-2,y,4,10);
      ctx.fillStyle='#604828'; ctx.fillRect(x-4,y-2,8,4);
      const f=Math.sin(t*9+x*.1)*2;
      ctx.fillStyle=P.fireOra;
      ctx.beginPath();ctx.ellipse(x+f*.2,y-6,4+Math.abs(f)*.2,6,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=P.fireYel;
      ctx.beginPath();ctx.ellipse(x+f*.1,y-6,2,4,0,0,Math.PI*2);ctx.fill();
      // tiny glow — radius 30 MAX
      const g=ctx.createRadialGradient(x,y-4,0,x,y-4,30);
      g.addColorStop(0,'rgba(255,140,0,0.18)');
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.fillRect(x-30,y-34,60,60);
    }

    // ── Bookshelf (top-down) ──────────────────────────────────────────────────
    function drawBookshelf(x:number,y:number,w:number,h:number){
      ctx.fillStyle=P.shelf; ctx.fillRect(x,y,w,h);
      ctx.strokeStyle=P.woodLight; ctx.lineWidth=1; ctx.strokeRect(x,y,w,h);
      const cols=[P.book1,P.book2,P.book3,P.book4,P.book5];
      let bx=x+2;
      while(bx<x+w-4){
        const bw=Math.floor(rnd(5,10));
        ctx.fillStyle=cols[Math.floor(Math.random()*cols.length)];
        ctx.fillRect(bx,y+2,bw-1,h-4);
        bx+=bw;
      }
    }

    // ── Desk (top-down) ───────────────────────────────────────────────────────
    function drawDesk(x:number,y:number,w:number,h:number){
      ctx.fillStyle=P.desk; ctx.fillRect(x,y,w,h);
      ctx.strokeStyle=P.woodLight; ctx.lineWidth=1; ctx.strokeRect(x,y,w,h);
      ctx.fillStyle=P.parchment; ctx.fillRect(x+4,y+4,w-8,h-8);
      ctx.strokeStyle='rgba(80,60,20,0.4)'; ctx.lineWidth=0.8;
      for(let ly=y+8;ly<y+h-4;ly+=4){ ctx.beginPath();ctx.moveTo(x+6,ly);ctx.lineTo(x+w-6,ly);ctx.stroke(); }
    }

    // ── Round table (top-down) ────────────────────────────────────────────────
    function drawRoundTable(cx2:number,cy2:number,r:number,t:number){
      // shadow
      ctx.fillStyle='rgba(0,0,0,0.25)';
      ctx.beginPath();ctx.ellipse(cx2+5,cy2+5,r,r,0,0,Math.PI*2);ctx.fill();
      // table
      ctx.fillStyle=P.table;
      ctx.beginPath();ctx.arc(cx2,cy2,r,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=P.tableFelt;
      ctx.beginPath();ctx.arc(cx2,cy2,r-5,0,Math.PI*2);ctx.fill();
      // carved lines
      ctx.strokeStyle='rgba(0,0,0,0.2)';ctx.lineWidth=1;
      for(let a=0;a<Math.PI*2;a+=Math.PI/6){
        ctx.beginPath();ctx.moveTo(cx2,cy2);
        ctx.lineTo(cx2+Math.cos(a)*(r-5),cy2+Math.sin(a)*(r-5));ctx.stroke();
      }
      ctx.strokeStyle=P.tableGold;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(cx2,cy2,r,0,Math.PI*2);ctx.stroke();
      // center symbol
      const pulse=0.6+0.25*Math.sin(t*1.4);
      ctx.globalAlpha=pulse;
      ctx.fillStyle=P.tableGold;
      ctx.font=Math.round(r*0.45)+'px serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('⚜',cx2,cy2);
      ctx.globalAlpha=1;
    }

    // ── Chair (top-down circle) ────────────────────────────────────────────────
    function drawChair(x:number,y:number,r:number){
      ctx.fillStyle=P.chair;
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=P.woodLight;ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
    }

    // ── Bed (top-down) ────────────────────────────────────────────────────────
    function drawBed(x:number,y:number,w:number,h:number){
      ctx.fillStyle=P.bed;  ctx.fillRect(x,y,w,h);
      ctx.fillStyle=P.bedSheet; ctx.fillRect(x+2,y+h*0.3,w-4,h*0.65);
      ctx.fillStyle=P.pillow;   ctx.fillRect(x+4,y+4,w-8,h*0.25);
      ctx.strokeStyle=P.woodLight;ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);
    }

    // ── Cauldron (top-down) ───────────────────────────────────────────────────
    function drawCauldron(cx2:number,cy2:number,r:number,t:number){
      spawnSmoke(cx2,cy2-r-2);
      ctx.fillStyle=P.cauldron;
      ctx.beginPath();ctx.arc(cx2,cy2,r,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=P.cauldronRim;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(cx2,cy2,r,0,Math.PI*2);ctx.stroke();
      // brew bubbling
      const h=`hsl(${(t*40)%360},50%,25%)`;
      ctx.fillStyle=h;
      ctx.beginPath();ctx.arc(cx2,cy2,r-3,0,Math.PI*2);ctx.fill();
      // bubbles
      for(let b=0;b<3;b++){
        const bp=t*3+b*2.1;
        const bs=1.5+Math.sin(bp);
        ctx.globalAlpha=0.4;ctx.fillStyle='#fff';
        ctx.beginPath();ctx.arc(cx2-4+b*4,cy2+Math.sin(bp)*3,Math.max(0.5,bs),0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;
      }
    }

    // ── Plant (top-down pot + leaves) ─────────────────────────────────────────
    function drawPlant(x:number,y:number){
      ctx.fillStyle=P.plantPot;ctx.fillRect(x-6,y+2,12,8);
      ctx.fillStyle=P.plant;
      ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#50a050';
      ctx.beginPath();ctx.arc(x-4,y-3,5,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(x+4,y-3,5,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(x,y-6,4,0,Math.PI*2);ctx.fill();
    }

    // ── Tapestry on wall (side-hanging) ──────────────────────────────────────
    function drawTapestry(x:number,y:number,w:number,h:number,col:string){
      ctx.fillStyle=col;ctx.fillRect(x,y,w,h);
      ctx.strokeStyle=P.gold;ctx.lineWidth=1;ctx.strokeRect(x+1,y+1,w-2,h-2);
      ctx.strokeStyle='rgba(201,160,32,0.3)';
      for(let ly=y+4;ly<y+h-2;ly+=6){ctx.beginPath();ctx.moveTo(x+3,ly);ctx.lineTo(x+w-3,ly);ctx.stroke();}
    }

    // ── Alchemy table ─────────────────────────────────────────────────────────
    function drawAlchemyTable(x:number,y:number,w:number,h:number,t:number){
      ctx.fillStyle=P.desk;ctx.fillRect(x,y,w,h);
      ctx.strokeStyle=P.woodLight;ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);
      // potions (small colored circles)
      const pcols=[P.potion1,P.potion2,P.potion3,'#608000'];
      for(let i=0;i<4;i++){
        const px2=x+8+i*14,py=y+h/2;
        ctx.fillStyle=pcols[i];
        ctx.beginPath();ctx.arc(px2,py,4,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,0.4)';ctx.lineWidth=0.8;
        ctx.beginPath();ctx.arc(px2,py,4,0,Math.PI*2);ctx.stroke();
      }
      // orb — SMALL, contained
      const orbR=7;
      const opulse=0.7+0.3*Math.sin(t*2.2);
      ctx.fillStyle=`rgba(100,60,220,${opulse})`;
      ctx.beginPath();ctx.arc(x+w-12,y+8,orbR,0,Math.PI*2);ctx.fill();
      // tiny glow only — radius 18 max
      const og=ctx.createRadialGradient(x+w-12,y+8,0,x+w-12,y+8,18);
      og.addColorStop(0,`rgba(140,80,255,${opulse*0.5})`);
      og.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=og;ctx.beginPath();ctx.arc(x+w-12,y+8,18,0,Math.PI*2);ctx.fill();
    }

    // ── Fireplace (top-down, against bottom wall) ──────────────────────────────
    function drawFireplace(x:number,y:number,w:number,t:number){
      const h=WALL-2;
      ctx.fillStyle=P.wallMid;ctx.fillRect(x,y,w,h);
      ctx.fillStyle='#0a0805';ctx.fillRect(x+6,y+2,w-12,h-2);
      const flk=Math.sin(t*8)*2;
      ctx.fillStyle=P.fireOra;
      ctx.beginPath();ctx.ellipse(x+w/2+flk*.2,y+h/2,10+Math.abs(flk)*.3,8,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=P.fireYel;
      ctx.beginPath();ctx.ellipse(x+w/2+flk*.1,y+h/2,6,5,0,0,Math.PI*2);ctx.fill();
      spawnFire(x+w/2,y+2);
      // glow — radius 40 max
      const fg=ctx.createRadialGradient(x+w/2,y,0,x+w/2,y,40);
      fg.addColorStop(0,'rgba(255,140,0,0.15)');
      fg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=fg;ctx.fillRect(x-10,y-40,w+20,60);
    }

    // ── Draw full scene ───────────────────────────────────────────────────────
    function drawScene(t:number){
      const lo=L();
      const {left,right,top,bot,vd1,vd2,hd1,hd2,cx:cx2,cy:cy2,tR,sR}=lo;

      // outer background
      ctx.fillStyle=P.wall;ctx.fillRect(0,0,W,H);

      // ── 6 rooms (Pokémon floor-plan style) ─────────────────────────────────

      // TOP-LEFT: Library
      fillFloor(left,top,vd1-left,hd1-top,P.woodA,P.woodB);
      // TOP-CENTER: Alchemy Lab
      fillFloor(vd1,top,vd2-vd1,hd1-top,P.stoneA,P.stoneB);
      // TOP-RIGHT: Music Room
      fillFloor(vd2,top,right-vd2,hd1-top,P.woodA,P.woodB);

      // MID (full width): Great Hall
      fillFloor(left,hd1,right-left,hd2-hd1,P.stoneA,P.stoneB);
      // rug under table
      ctx.fillStyle=P.rug;
      ctx.beginPath();ctx.ellipse(cx2,cy2,tR*2.2,tR*1.6,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=P.rugBorder;ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(cx2,cy2,tR*2.2-4,tR*1.6-4,0,0,Math.PI*2);ctx.stroke();

      // BOT-LEFT: Writing Room
      fillFloor(left,hd2,vd1-left,bot-hd2,P.woodA,P.woodB);
      // BOT-RIGHT: Sleeping Quarters
      fillFloor(vd2,hd2,right-vd2,bot-hd2,P.woodA,P.woodB);
      // BOT-CENTER: connects to main hall (stone)
      fillFloor(vd1,hd2,vd2-vd1,bot-hd2,P.stoneA,P.stoneB);

      // ── Walls ───────────────────────────────────────────────────────────────
      fillWall(0,0,W,top);              // top wall
      fillWall(0,bot,W,H-bot);          // bottom wall
      fillWall(0,top,left,bot-top);     // left wall
      fillWall(right,top,W-right,bot-top); // right wall
      // inner dividers — short segments with door gaps
      // vertical dividers
      fillWall(vd1-WALL/2,top,WALL,hd1-top-20);                     // TL|TC divider top
      fillWall(vd1-WALL/2,hd1+20,WALL,hd2-hd1-40);                  // divider mid (short — open to hall)
      fillWall(vd2-WALL/2,top,WALL,hd1-top-20);                     // TC|TR divider
      fillWall(vd2-WALL/2,hd1+20,WALL,hd2-hd1-40);
      fillWall(vd1-WALL/2,hd2+20,WALL,bot-hd2-20);                  // BL divider
      fillWall(vd2-WALL/2,hd2+20,WALL,bot-hd2-20);
      // horizontal dividers
      fillWall(left,hd1-WALL/2,vd1-left-20,WALL);                   // TL bottom wall with door gap
      drawDoor(vd1-40,hd1-WALL/2,20,WALL);
      fillWall(vd1+20,hd1-WALL/2,vd2-vd1-40,WALL);                  // TC bottom wall
      drawDoor(vd2-20,hd1-WALL/2,20,WALL);
      fillWall(vd2+20,hd1-WALL/2,right-vd2-20,WALL);
      fillWall(left,hd2-WALL/2,vd1-left-20,WALL);                   // BL top wall
      drawDoor(vd1-40,hd2-WALL/2,20,WALL);
      fillWall(vd1+20,hd2-WALL/2,vd2-vd1-40,WALL);
      drawDoor(vd2-20,hd2-WALL/2,20,WALL);
      fillWall(vd2+20,hd2-WALL/2,right-vd2-20,WALL);

      // ── Windows on outer walls ───────────────────────────────────────────────
      drawWindow(left-2,top+40,WALL+2,28,t);
      drawWindow(left-2,hd1+30,WALL+2,28,t);
      drawWindow(right-2,top+40,WALL+2,28,t);
      drawWindow(right-2,hd2+30,WALL+2,28,t);
      // top wall windows
      drawWindow(vd1-30,0,28,top+2,t);
      drawWindow(vd2+2,0,28,top+2,t);

      // ── Tapestries on top wall ───────────────────────────────────────────────
      drawTapestry(left+10,0,30,top,P.tapRed);
      drawTapestry(cx2-20,0,40,top,P.tapBlue);
      drawTapestry(right-40,0,30,top,P.tapRed);

      // ── LIBRARY furniture (top-left room) ───────────────────────────────────
      const libX=left+6, libY=top+6;
      drawBookshelf(libX,    libY,    50, 16);  // top shelf
      drawBookshelf(libX,    libY+22, 50, 16);  // mid shelf
      drawBookshelf(libX+58, libY,    50, 16);  // right shelf
      drawPlant(vd1-28, hd1-28);

      // ── ALCHEMY furniture (top-center) ──────────────────────────────────────
      const alcX=vd1+10, alcY=top+8;
      drawAlchemyTable(alcX,alcY,70,20,t);
      drawCauldron(alcX+90,alcY+14,12,t);
      drawPlant(vd2-30,top+20);

      // ── MUSIC furniture (top-right) ──────────────────────────────────────────
      const musX=vd2+14, musY=top+10;
      // instrument table
      ctx.fillStyle=P.desk;ctx.fillRect(musX,musY,60,14);
      ctx.strokeStyle=P.woodLight;ctx.lineWidth=1;ctx.strokeRect(musX,musY,60,14);
      // lute icon (top-down oval)
      ctx.fillStyle='#8b5e2a';ctx.beginPath();ctx.ellipse(musX+30,musY+26,12,18,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#2a1a08';ctx.lineWidth=0.8;ctx.strokeRect(musX+28,musY+8,4,20);

      // ── GREAT HALL furniture ─────────────────────────────────────────────────
      drawRoundTable(cx2,cy2,tR,t);
      // seats around table
      for(let i=0;i<12;i++){
        const a=-Math.PI/2+(i/12)*Math.PI*2;
        drawChair(cx2+Math.cos(a)*sR,cy2+Math.sin(a)*sR,8);
      }
      // corner torches in great hall
      drawTorch(left+8,hd1+16,t);
      drawTorch(right-8,hd1+16,t);
      drawTorch(left+8,hd2-16,t);
      drawTorch(right-8,hd2-16,t);

      // ── WRITING ROOM furniture (bot-left) ────────────────────────────────────
      const wrX=left+10, wrY=hd2+10;
      drawDesk(wrX,wrY,55,20);
      drawDesk(wrX,wrY+28,55,20);
      drawPlant(vd1-22,bot-22);

      // ── SLEEPING QUARTERS (bot-right) ────────────────────────────────────────
      const slX=vd2+10, slY=hd2+8;
      drawBed(slX,slY,50,28);
      drawBed(slX,slY+36,50,28);
      drawPlant(right-22,bot-22);

      // ── FIREPLACE bottom wall ─────────────────────────────────────────────────
      drawFireplace(cx2-30,bot-WALL+2,60,t);

      // ── Corner torches (outer walls) ─────────────────────────────────────────
      drawTorch(left+14,top+14,t);
      drawTorch(right-14,top+14,t);
      drawTorch(left+14,bot-14,t);
      drawTorch(right-14,bot-14,t);
    }

    // ── Activity zones ────────────────────────────────────────────────────────
    function getZones(){
      const lo=L();
      const {left,right,top,bot,vd1,vd2,hd1,hd2}=lo;
      return [
        // 0,1: eat — great hall left/right
        {x:(left+vd1)/2-20,y:(hd1+hd2)/2,act:'eat'},
        {x:(left+vd1)/2+20,y:(hd1+hd2)/2+10,act:'eat'},
        // 2,3: read — library
        {x:left+35,y:top+45,act:'read'},
        {x:left+60,y:top+55,act:'read'},
        // 4,5: magic — alchemy
        {x:vd1+60,y:top+40,act:'magic'},
        {x:vd1+80,y:top+55,act:'magic'},
        // 6: write — writing room
        {x:left+40,y:hd2+30,act:'write'},
        // 7: cook — alchemy/cauldron
        {x:vd1+100,y:top+40,act:'cook'},
        // 8: meditate — bot-center
        {x:(vd1+vd2)/2,y:hd2+40,act:'meditate'},
        // 9: music — top-right
        {x:vd2+40,y:top+45,act:'music'},
        // 10: sleep — sleeping quarters
        {x:vd2+35,y:hd2+25,act:'sleep'},
        // 11: talk — great hall right
        {x:(vd2+right)/2,y:(hd1+hd2)/2,act:'talk'},
      ];
    }

    // ── Draw activity prop ────────────────────────────────────────────────────
    function drawProp(a:Agent,t:number){
      const {x,y,activity:act,actPhase:ap}=a;

      if(act==='eat'){
        // bowl
        ctx.fillStyle='#8b6535';ctx.beginPath();ctx.ellipse(x+10,y+6,7,4,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#c89050';ctx.beginPath();ctx.ellipse(x+10,y+4,5,3,0,0,Math.PI*2);ctx.fill();
        // arm motion
        const ay=Math.sin(t*4+ap)*6;
        ctx.fillStyle='#c07830';ctx.beginPath();ctx.arc(x-6+Math.cos(t*4+ap)*3,y-6+ay,3,0,Math.PI*2);ctx.fill();
      }
      else if(act==='read'){
        ctx.fillStyle='#6b4020';ctx.fillRect(x-14,y-2,28,16);
        ctx.fillStyle=P.parchment;ctx.fillRect(x-13,y-1,12,14);ctx.fillRect(x+2,y-1,12,14);
        ctx.strokeStyle='rgba(100,70,20,0.4)';ctx.lineWidth=0.8;
        for(let ly=y+3;ly<y+12;ly+=3){ctx.beginPath();ctx.moveTo(x-11,ly);ctx.lineTo(x-3,ly);ctx.stroke();ctx.beginPath();ctx.moveTo(x+3,ly);ctx.lineTo(x+11,ly);ctx.stroke();}
      }
      else if(act==='magic'){
        // staff
        ctx.strokeStyle='#6b4020';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(x-8,y+8);ctx.lineTo(x-14,y-14);ctx.stroke();
        // orb — SMALL
        const mp=0.7+0.3*Math.sin(t*3+ap);
        ctx.fillStyle=`rgba(120,60,220,${mp})`;ctx.beginPath();ctx.arc(x-14,y-14,5,0,Math.PI*2);ctx.fill();
        // tiny glow
        const mg=ctx.createRadialGradient(x-14,y-14,0,x-14,y-14,14);
        mg.addColorStop(0,`rgba(160,80,255,${mp*0.6})`);mg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=mg;ctx.beginPath();ctx.arc(x-14,y-14,14,0,Math.PI*2);ctx.fill();
        // rune circle — small
        ctx.strokeStyle=`rgba(120,80,220,${0.3+0.2*Math.sin(t*2)})`;ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(x,y+10,16,0,Math.PI*2);ctx.stroke();
        spawnMagic(x-14,y-14);
      }
      else if(act==='write'){
        const qx=x+4+Math.sin(t*5+ap)*8;
        ctx.strokeStyle='#8b7355';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(qx,y+4);ctx.lineTo(qx-3,y+12);ctx.stroke();
        ctx.fillStyle='#f0e8c0';ctx.beginPath();ctx.moveTo(qx,y+4);ctx.lineTo(qx+4,y);ctx.lineTo(qx+2,y+7);ctx.fill();
      }
      else if(act==='cook'){
        const sa=t*2.5+ap;
        const lx=x+Math.cos(sa)*8,ly=y-4+Math.sin(sa)*4;
        ctx.strokeStyle='#6b4020';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(x,y+2);ctx.lineTo(lx,ly);ctx.stroke();
        ctx.fillStyle='#3a2808';ctx.beginPath();ctx.arc(lx,ly,3,0,Math.PI*2);ctx.fill();
      }
      else if(act==='meditate'){
        // small aura — radius 18 max
        const ma=0.07+0.05*Math.sin(t*2+ap);
        const mg=ctx.createRadialGradient(x,y,0,x,y,18);
        mg.addColorStop(0,`rgba(80,160,255,${ma*4})`);mg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=mg;ctx.beginPath();ctx.arc(x,y,18,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=`rgba(80,160,255,${0.2+0.1*Math.sin(t*2)})`;ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(x,y-20,7,0,Math.PI*2);ctx.stroke();
      }
      else if(act==='music'){
        // lute
        ctx.fillStyle='#8b5e2a';ctx.beginPath();ctx.ellipse(x+10,y+4,9,12,0.3,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#2a1a08';ctx.lineWidth=0.8;
        ctx.beginPath();ctx.moveTo(x+10,y-8);ctx.lineTo(x+10,y+16);ctx.stroke();
        const strumY=Math.sin(t*6+ap)*5;
        ctx.strokeStyle='#c8a060';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(x-4,y-4);ctx.lineTo(x+6,y+strumY);ctx.stroke();
        spawnNote(x,y-18);
      }
      else if(act==='sleep'){
        spawnZzz(x,y-24);
      }
      else if(act==='talk'){
        const ba=0.75+0.25*Math.sin(t*2.5+ap);
        ctx.fillStyle=`rgba(40,32,20,${ba})`;
        ctx.beginPath();ctx.roundRect(x-16,y-34,32,18,4);ctx.fill();
        ctx.strokeStyle=`rgba(201,160,32,${ba*0.5})`;ctx.lineWidth=1;
        ctx.beginPath();ctx.roundRect(x-16,y-34,32,18,4);ctx.stroke();
        for(let d=0;d<3;d++){
          const dp=Math.sin(t*4+d*1.2+ap);
          ctx.fillStyle=`rgba(201,160,32,${0.5+0.5*dp})`;
          ctx.beginPath();ctx.arc(x-5+d*5,y-25+dp*2,1.8,0,Math.PI*2);ctx.fill();
        }
        ctx.fillStyle=`rgba(40,32,20,${ba})`;
        ctx.beginPath();ctx.moveTo(x-3,y-16);ctx.lineTo(x,y-12);ctx.lineTo(x+3,y-16);ctx.closePath();ctx.fill();
      }
    }

    // ── Draw Minecraft character ──────────────────────────────────────────────
    function drawAgent(a:Agent,t:number){
      const {x,y,activity:act,workPhase:wp,actPhase:ap,char,seated,blinkT}=a;
      const sz=22, s=sz/32;
      const floatY=(act==='meditate')?Math.sin(t*1.5+ap)*3:0;
      const ox=Math.round(x-16*s), oy=Math.round(y-20*s-floatY);
      const px=(rx:number,ry:number,rw:number,rh:number)=>
        ctx.fillRect(ox+Math.round(rx*s),oy+Math.round(ry*s),Math.max(1,Math.round(rw*s)),Math.max(1,Math.round(rh*s)));

      drawProp(a,t);

      // shadow
      ctx.fillStyle='rgba(0,0,0,0.22)';
      ctx.beginPath();ctx.ellipse(x,oy+Math.round(39*s),Math.round(9*s),Math.max(1,Math.round(2*s)),0,0,Math.PI*2);ctx.fill();

      // legs / robe
      ctx.fillStyle=char.pants;px(7,27,18,9);
      ctx.fillStyle='#1a1008';px(8,36,7,2);px(17,36,7,2);

      // arm swing
      let sw=0;
      if(['eat','write','cook','music'].includes(act)) sw=Math.sin(t*4+wp)*0.5;
      else if(!seated) sw=Math.sin(t*2+wp)*0.2;
      ctx.fillStyle=char.body;
      px(2,15+Math.round(sw*4),5,10);
      px(25,15+Math.round(-sw*4),5,10);

      // body
      ctx.fillStyle=char.body;px(7,15,18,11);
      ctx.fillStyle='rgba(255,255,255,0.12)';px(7,15,2,11);
      // belt
      ctx.fillStyle=P.woodDark;px(7,24,18,2);
      ctx.fillStyle=P.gold;px(14,24,4,2);
      if(char.accent){ctx.fillStyle=char.accent;ctx.globalAlpha=0.45;px(9,16,14,2);ctx.globalAlpha=1;}

      // neck
      ctx.fillStyle=char.skin;px(13,14,6,2);

      // head
      ctx.fillStyle=char.skin;px(6,0,20,14);
      ctx.fillStyle='rgba(255,255,255,0.15)';px(6,0,2,14);

      // hair
      ctx.fillStyle=char.hair;px(6,0,20,4);px(6,4,2,8);px(24,4,2,8);

      // magic/meditate hood
      if(act==='magic'||act==='meditate'){
        ctx.fillStyle=char.hair;ctx.globalAlpha=0.65;px(6,0,20,5);
        ctx.beginPath();ctx.moveTo(ox+Math.round(8*s),oy);ctx.lineTo(ox+Math.round(16*s),oy-Math.round(7*s));ctx.lineTo(ox+Math.round(24*s),oy);ctx.fill();
        ctx.globalAlpha=1;
      }

      // blink
      const blink=((t*1000+blinkT)%3800)<120;
      ctx.fillStyle=char.eyes;px(10,6,3,blink?0.5:2);px(19,6,3,blink?0.5:2);
      ctx.fillStyle='rgba(255,255,255,0.65)';px(12,6,1,1);px(21,6,1,1);

      // mouth
      ctx.fillStyle='#1a1a1a';ctx.globalAlpha=0.65;
      if(act==='eat'||act==='music'){ctx.beginPath();ctx.arc(ox+Math.round(16*s),oy+Math.round(12*s),Math.round(2.5*s),0,Math.PI);ctx.fill();}
      else{px(10,11,6,1);}
      ctx.globalAlpha=1;

      // accessories
      if(char.accessory==='glasses'){
        ctx.strokeStyle='#1a1a1a';ctx.lineWidth=Math.max(1,s*.9);
        ctx.strokeRect(ox+Math.round(9*s),oy+Math.round(5*s),Math.round(5*s),Math.round(4*s));
        ctx.strokeRect(ox+Math.round(18*s),oy+Math.round(5*s),Math.round(5*s),Math.round(4*s));
        ctx.fillStyle='#1a1a1a';px(14,6,4,1);
      }
      if(char.accessory==='beard'){ctx.fillStyle=char.beardColor||'#D0D0D0';px(8,12,16,3);px(7,10,3,4);px(22,10,3,4);}
      if(char.accessory==='headband'){ctx.fillStyle='#8B1A1A';px(6,4,20,2);}

      // thinking dots when seated
      if(activeRef.current&&seated){
        for(let d=0;d<3;d++){
          const dp=(t*3.5+a.actPhase+d*.7)%(Math.PI*2);
          ctx.globalAlpha=0.3+0.7*Math.abs(Math.sin(dp));
          ctx.fillStyle=char.body;
          ctx.beginPath();ctx.arc(x-4+d*4,oy-Math.abs(Math.sin(dp))*6,2,0,Math.PI*2);ctx.fill();
          ctx.globalAlpha=1;
        }
      }
    }

    // ── Draw particles ────────────────────────────────────────────────────────
    function drawParticles(){
      for(let i=particles.length-1;i>=0;i--){
        const p=particles[i];
        p.x+=p.vx;p.y+=p.vy;p.vx*=0.97;p.vy*=0.97;
        p.life-=1/p.maxLife;
        if(p.life<=0){particles.splice(i,1);continue;}
        ctx.globalAlpha=p.life*0.85;
        ctx.fillStyle=p.col;
        ctx.beginPath();ctx.arc(p.x,p.y,Math.max(0.5,p.r*p.life),0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;
      }
    }

    // ── Agents setup ──────────────────────────────────────────────────────────
    const lo0=L();
    const zones0=getZones();
    const sR0=lo0.sR;
    const agents:Agent[]=CREATORS.slice(0,12).map((c,i)=>{
      const ang=-Math.PI/2+(i/12)*Math.PI*2;
      const z=zones0[i]||zones0[0];
      return {
        x:z.x,y:z.y,vx:0,vy:0,tx:z.x,ty:z.y,
        sx:lo0.cx+Math.cos(ang)*sR0,sy:lo0.cy+Math.sin(ang)*sR0,
        seated:false,blinkT:Math.random()*4000,
        workPhase:Math.random()*Math.PI*2,actPhase:i%3,
        activity:ACTIVITIES[i],char:CHARS[c.id]||DEFAULT_CHAR,
      };
    });

    // ── Update agents ─────────────────────────────────────────────────────────
    function updateAgents(){
      const lo=L();
      const {cx:cx2,cy:cy2,tR,sR}=lo;
      const zs=getZones();
      const isActive=activeRef.current;

      for(let i=0;i<agents.length;i++){
        const a=agents[i];
        a.sx=cx2+Math.cos(-Math.PI/2+(i/12)*Math.PI*2)*sR;
        a.sy=cy2+Math.sin(-Math.PI/2+(i/12)*Math.PI*2)*sR;

        if(isActive){
          a.x=lerp(a.x,a.sx,0.055);a.y=lerp(a.y,a.sy,0.055);
          a.seated=dist(a.x,a.y,a.sx,a.sy)<10;
        } else {
          a.seated=false;
          const z=zs[i]||zs[0];
          if(dist(a.x,a.y,a.tx,a.ty)<8){a.tx=z.x+rnd(-18,18);a.ty=z.y+rnd(-15,15);}
          const dx=a.tx-a.x,dy=a.ty-a.y,dl=Math.sqrt(dx*dx+dy*dy);
          if(dl>1){a.vx=lerp(a.vx,(dx/dl)*0.6,0.07);a.vy=lerp(a.vy,(dy/dl)*0.6,0.07);}
          // avoid round table
          const td=dist(a.x+a.vx,a.y+a.vy,cx2,cy2);
          if(td<tR+24){const aa=Math.atan2(a.y-cy2,a.x-cx2);a.vx+=Math.cos(aa)*.7;a.vy+=Math.sin(aa)*.7;}
          a.x=clamp(a.x+a.vx,WALL+10,W-WALL-10);
          a.y=clamp(a.y+a.vy,WALL+10,H-WALL-10);
        }
      }
    }

    // ── Main loop ─────────────────────────────────────────────────────────────
    const t0=performance.now();let rafId=0;
    function frame(now:number){
      const t=(now-t0)/1000;
      ctx.clearRect(0,0,W,H);
      drawScene(t);
      drawParticles();
      const sorted=agents.map((a,i)=>({a,i})).sort((p,q)=>p.a.y-q.a.y);
      for(const {a} of sorted) drawAgent(a,t);
      updateAgents();
      rafId=requestAnimationFrame(frame);
    }
    rafId=requestAnimationFrame(frame);
    return ()=>{cancelAnimationFrame(rafId);window.removeEventListener('resize',onResize);};
  },[]);

  return (
    <canvas ref={canvasRef} style={{
      position:'fixed',inset:0,width:'100%',height:'100%',
      zIndex:0,pointerEvents:'none',imageRendering:'pixelated',display:'block',
    }}/>
  );
}
