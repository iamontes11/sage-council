'use client';
import { useEffect, useRef } from 'react';
import { CREATORS } from '@/lib/creators';
import { CHARS, DEFAULT_CHAR } from '@/components/VoxelAvatar';
import type { CharDef } from '@/components/VoxelAvatar';

// ─── Pokémon-style flat pixel palette ────────────────────────────────────────
const FL = '#8c7e60';   // main stone floor A
const FL2 = '#7e7054';  // main stone floor B
const WDA = '#a09070';  // wood floor A
const WDB = '#907860';  // wood floor B
const WL  = '#2a2018';  // thick wall (dark)
const WM  = '#3a3020';  // brick mid
const WLT = '#4a4030';  // brick highlight
const TBL = '#4a3010';  // table top (dark wood)
const TFT = '#1a3820';  // table felt
const TGD = '#c8a020';  // table gold ring
const CHR = '#5a3810';  // chair
const SHF = '#4a3010';  // shelf
const DSK = '#6a4a18';  // desk
const PCH = '#e0d090';  // parchment
const BED = '#6a4818';  // bed frame
const BSD = '#c0d0e8';  // bed sheets
const PIL = '#e0d8c0';  // pillow
const CTN = '#282828';  // cauldron outer
const CTB = '#1a6a20';  // cauldron brew
const POT = ['#c02020','#2040c0','#208040','#c0a000'];
const RUG = '#7a1818';  // rug red
const RGB = '#c8a020';  // rug border
const BKS = ['#c02020','#2040c0','#208040','#a08000','#802080','#206080']; // book colors
const PLT = '#309030';  // plant green
const PPT = '#8a4020';  // plant pot

// ─── Seeded random for stable book colors ────────────────────────────────────
function seededInt(seed: number, max: number) { return ((seed * 2654435761) >>> 0) % max; }

interface Prt { x:number;y:number;vx:number;vy:number;life:number;col:string;r:number }
interface Agent {
  x:number;y:number;vx:number;vy:number;tx:number;ty:number;
  sx:number;sy:number;seated:boolean;
  blinkT:number;wp:number;ap:number;act:string;char:CharDef;
}
const ACTS = ['eat','eat','read','read','magic','magic','write','cook','meditate','music','sleep','talk'];

export default function CouncilBackground({ active=false }:{ active?:boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  useEffect(()=>{ activeRef.current=active; },[active]);

  useEffect(()=>{
    const cv = canvasRef.current!;
    const cx = cv.getContext('2d')!;
    cx.imageSmoothingEnabled = false;

    let W=window.innerWidth, H=window.innerHeight;
    cv.width=W; cv.height=H;
    let SC = Math.max(0.5, Math.min(1.4, Math.min(W, H) / 900));
    const onResize=()=>{ W=window.innerWidth;H=window.innerHeight;cv.width=W;cv.height=H;SC=Math.max(0.5,Math.min(1.4,Math.min(W,H)/900)); };
    const p = (n: number) => Math.max(1, Math.round(n * SC));
    window.addEventListener('resize',onResize);

    const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
    const dist=(x1:number,y1:number,x2:number,y2:number)=>Math.sqrt((x2-x1)**2+(y2-y1)**2);
    const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
    const rnd=(lo:number,hi:number)=>lo+Math.random()*(hi-lo);

    // ─── Layout (mirrors reference image proportions) ──────────────────────────
    const G=()=>{
      const W16=Math.round(W*0.016);  // wall thickness ≈ 1.6% of W
      const TW=12;                    // thin inner wall
      // column dividers
      const C1=Math.round(W*0.28);
      const C2=Math.round(W*0.62);
      // row dividers
      const R1=Math.round(H*0.36);
      const R2=Math.round(H*0.70);
      // center
      const CCX=Math.round((C1+C2)/2);
      const CCY=Math.round((R1+R2)/2);
      // TR: table radius — capped so rug (TR*2) never bleeds into column walls
      // available half-span from CCX to C1/C2 wall = (C2-C1)/2, rug needs TR*2 of that
      const TR=Math.min((C2-C1-24)/4, (R2-R1)*0.26);
      const SR=TR*1.6;
      return {W16,TW,C1,C2,R1,R2,CCX,CCY,TR,SR,
        // room inner bounds
        lib:  {x:W16,  y:W16,  w:C1-W16,   h:R1-W16},
        alc:  {x:C1,   y:W16,  w:C2-C1,    h:R1-W16},
        slp:  {x:C2,   y:W16,  w:W-W16-C2, h:R1-W16},
        hal:  {x:W16,  y:R1,   w:W-2*W16,  h:R2-R1},
        kit:  {x:W16,  y:R2,   w:C1-W16,   h:H-W16-R2},
        ban:  {x:C1,   y:R2,   w:W-W16-C1, h:H-W16-R2},
      };
    };

    // ─── Pixel helpers ─────────────────────────────────────────────────────────
    const r1=(x:number,y:number,w:number,h:number,col:string)=>{ cx.fillStyle=col;cx.fillRect(x,y,w,h); };
    const r1o=(x:number,y:number,w:number,h:number,fill:string,stroke:string,lw=1)=>{
      cx.fillStyle=fill;cx.fillRect(x,y,w,h);
      cx.strokeStyle=stroke;cx.lineWidth=lw;cx.strokeRect(x+.5,y+.5,w-1,h-1);
    };

    // ─── Tile floor (Pokémon-style 2-color checker) ────────────────────────────
    function tileFloor(x:number,y:number,w:number,h:number,a:string,b:string,sz=16) {
      for(let ry=y;ry<y+h;ry+=sz) for(let rx=x;rx<x+w;rx+=sz) {
        cx.fillStyle=((Math.floor(ry/sz)+Math.floor(rx/sz))%2)?a:b;
        cx.fillRect(rx,ry,Math.min(sz,x+w-rx),Math.min(sz,y+h-ry));
      }
      cx.strokeStyle='rgba(0,0,0,0.10)';cx.lineWidth=.5;
      for(let ry=y;ry<=y+h;ry+=sz){cx.beginPath();cx.moveTo(x,ry);cx.lineTo(x+w,ry);cx.stroke();}
      for(let rx=x;rx<=x+w;rx+=sz){cx.beginPath();cx.moveTo(rx,y);cx.lineTo(rx,y+h);cx.stroke();}
    }

    // ─── Wall (brick) ──────────────────────────────────────────────────────────
    function wall(x:number,y:number,w:number,h:number) {
      cx.fillStyle=WL;cx.fillRect(x,y,w,h);
      const bw=Math.max(12,Math.round(w*.12)||12), bh=Math.min(10,Math.round(h*.4)||8);
      if(bh<2||bw<4) return;
      for(let ry=y;ry<y+h;ry+=bh) {
        const off=((Math.floor(ry/bh))%2)?bw/2:0;
        for(let rx=x-bw;rx<x+w+bw;rx+=bw) {
          const bx=rx+off;
          const ix=Math.max(x,bx)+1, iy=Math.max(y,ry)+1;
          const iw=Math.min(x+w,bx+bw)-ix-1, ih=Math.min(y+h,ry+bh)-iy-1;
          if(iw<1||ih<1) continue;
          cx.fillStyle=WM;cx.fillRect(ix,iy,iw,ih);
          cx.fillStyle=WLT;cx.fillRect(ix,iy,iw,1);cx.fillRect(ix,iy,1,ih);
        }
      }
    }

    // ─── Door gap (just floor color) ──────────────────────────────────────────
    function door(x:number,y:number,w:number,h:number,floorA:string,floorB:string) {
      tileFloor(x,y,w,h,floorA,floorB);
      // door frame
      cx.strokeStyle='#4a8030';cx.lineWidth=2;cx.strokeRect(x+1,y+1,w-2,h-2);
    }

    // ─── Window (solid colored rectangle, no glow) ─────────────────────────────
    function win(x:number,y:number,w:number,h:number,t:number) {
      const f=0.45+0.12*Math.sin(t*0.7);
      r1(x,y,w,h,'#3a3020');
      r1(x+2,y+2,w-4,h-4,`rgba(60,90,180,${f})`);
      cx.strokeStyle='rgba(255,255,255,0.25)';cx.lineWidth=1;
      cx.beginPath();cx.moveTo(x+w/2,y+2);cx.lineTo(x+w/2,y+h-2);cx.stroke();
      cx.beginPath();cx.moveTo(x+2,y+h/2);cx.lineTo(x+w-2,y+h/2);cx.stroke();
    }

    // ─── Tapestry (flat colored strip on wall) ─────────────────────────────────
    function tapestry(x:number,y:number,w:number,h:number,col:string) {
      r1(x,y,w,h,col);
      cx.strokeStyle='#c8a020';cx.lineWidth=1;cx.strokeRect(x+1,y+1,w-2,h-2);
      cx.strokeStyle='rgba(200,160,32,0.25)';
      for(let ly=y+5;ly<y+h-2;ly+=5){cx.beginPath();cx.moveTo(x+2,ly);cx.lineTo(x+w-2,ly);cx.stroke();}
    }

    // ─── Bookshelf (stable colors via seed) ────────────────────────────────────
    function bookshelf(x:number,y:number,w:number,h:number, seed=0) {
      r1o(x,y,w,h,SHF,'#6a5828');
      let bx=x+2, bi=seed;
      while(bx<x+w-3) {
        const bw=5+seededInt(bi,5); bi++;
        cx.fillStyle=BKS[seededInt(bi++,BKS.length)];
        cx.fillRect(bx,y+2,bw-1,h-4);
        cx.fillStyle='rgba(255,255,255,0.08)';cx.fillRect(bx,y+2,1,h-4);
        bx+=bw;
      }
    }

    // ─── Desk/table (flat) ─────────────────────────────────────────────────────
    function desk(x:number,y:number,w:number,h:number) {
      r1o(x,y,w,h,DSK,'#8a6030');
      r1(x+3,y+3,w-6,h-6,PCH);
      cx.strokeStyle='rgba(80,60,20,0.35)';cx.lineWidth=.8;
      for(let ly=y+6;ly<y+h-3;ly+=4){cx.beginPath();cx.moveTo(x+5,ly);cx.lineTo(x+w-5,ly);cx.stroke();}
    }

    // ─── Bookshelf + desk combo in library ─────────────────────────────────────
    function drawLibrary(r:{x:number,y:number,w:number,h:number}) {
      const {x,y,w,h}=r;
      const bh=p(14), dh=p(20);
      bookshelf(x+p(4),y+p(4),w-p(8),bh,0);
      bookshelf(x+p(4),y+p(4)+bh+p(4),w-p(8),bh,10);
      bookshelf(x+p(4),y+p(4)+bh*2+p(8),Math.round(w*0.45),bh,20);
      desk(x+p(4),y+h-dh-p(12),w-p(8),dh);
      r1o(x+Math.round(w/2)-p(8),y+h-dh-p(14)-p(16),p(16),p(14),CHR,'#6a4820');
      r1(x+w-p(16),y+h-dh-p(14),p(3),p(6),'#d4c090');
      r1(x+w-p(15),y+h-dh-p(18),p(1),p(4),'#ffcc44');
    }

    // ─── Alchemy room ──────────────────────────────────────────────────────────
    function drawAlchemy(r:{x:number,y:number,w:number,h:number},t:number) {
      const {x,y,w,h}=r;
      // shelf with potions
      r1o(x+p(4),y+p(4),w-p(8),p(14),SHF,'#6a5828');
      for(let i=0;i<4;i++) {
        const px2=x+p(10)+i*Math.floor((w-p(24))/4);
        r1(px2,y+p(6),p(5),p(10),POT[i]);
        r1(px2+p(1),y+p(6),p(1),p(4),'rgba(255,255,255,0.3)');
        r1(px2+p(1),y+p(5),p(3),p(2),'#1a1a1a');
      }
      // altar/table
      desk(x+p(4),y+p(22),w-p(8),p(16));
      // magic circle on floor — just concentric rings, NO gradient
      const mx=x+Math.round(w/2), my=y+Math.round(h*0.65);
      const ph=t*0.6;
      cx.strokeStyle=`rgba(80,80,220,0.55)`;cx.lineWidth=1;
      cx.beginPath();cx.arc(mx,my,Math.round(Math.min(w,h)*0.18),0,Math.PI*2);cx.stroke();
      cx.strokeStyle=`rgba(80,80,220,0.35)`;
      cx.beginPath();cx.arc(mx,my,Math.round(Math.min(w,h)*0.12),0,Math.PI*2);cx.stroke();
      // rotating rune dot
      const rx2=mx+Math.cos(ph)*Math.round(Math.min(w,h)*0.15);
      const ry2=my+Math.sin(ph)*Math.round(Math.min(w,h)*0.15);
      r1(Math.round(rx2)-2,Math.round(ry2)-2,4,4,'#8080ff');
      // cauldron (flat circle, no gradient)
      const cr=Math.min(w,h)*0.1;
      r1o(mx-cr,my-cr,cr*2,cr*2,CTN,'#404040',1.5);
      // brew — animated color cycle without gradient
      const br=cr-2;
      const bc=`hsl(${(t*40)%360},45%,25%)`;
      cx.fillStyle=bc;cx.beginPath();cx.arc(mx,my,br,0,Math.PI*2);cx.fill();
      // smoke pixels (no particle system — just 2 gray pixels that alternate)
      const sm=Math.floor(t*4)%2;
      r1(mx-1,my-cr-4-sm*2,2,2,'rgba(160,140,110,0.6)');
      r1(mx+2,my-cr-7-sm,2,2,'rgba(160,140,110,0.4)');
    }

    // ─── Sleeping quarters ─────────────────────────────────────────────────────
    function drawSleeping(r:{x:number,y:number,w:number,h:number}) {
      const {x,y,w,h}=r;
      const bw=Math.round(w*0.65), bh=Math.round(h*0.45);
      // bed 1
      r1o(x+p(8),y+p(6),bw,bh,BED,'#8a6030');
      r1(x+p(10),y+p(6)+Math.round(bh*0.25),bw-p(4),Math.round(bh*0.7),BSD);
      r1(x+p(12),y+p(9),bw-p(8),Math.round(bh*0.2),PIL);
      // headboard dark stripe
      r1(x+p(8),y+p(6),bw,p(6),'#3a2010');
      // bed 2
      r1o(x+p(8),y+p(6)+bh+p(10),bw,bh,BED,'#8a6030');
      r1(x+p(10),y+p(6)+bh+p(10)+Math.round(bh*0.25),bw-p(4),Math.round(bh*0.7),BSD);
      r1(x+p(12),y+p(9)+bh+p(10),bw-p(8),Math.round(bh*0.2),PIL);
      r1(x+p(8),y+p(6)+bh+p(10),bw,p(6),'#3a2010');
      // side table
      r1o(x+w-p(22),y+p(8),p(14),p(12),DSK,'#8a6030');
    }

    // ─── Round council table ───────────────────────────────────────────────────
    function drawTable(ccx:number,ccy:number,tr:number,sr:number,t:number) {
      // shadow (flat, no blur)
      cx.fillStyle='rgba(0,0,0,0.2)';
      cx.beginPath();cx.ellipse(ccx+p(4),ccy+p(5),tr,tr*.32,0,0,Math.PI*2);cx.fill();
      // rug
      cx.fillStyle=RUG;cx.beginPath();cx.ellipse(ccx,ccy,tr*2,tr*1.55,0,0,Math.PI*2);cx.fill();
      cx.strokeStyle=RGB;cx.lineWidth=2;
      cx.beginPath();cx.ellipse(ccx,ccy,tr*2-3,tr*1.55-3,0,0,Math.PI*2);cx.stroke();
      // table
      cx.fillStyle=TBL;cx.beginPath();cx.arc(ccx,ccy,tr,0,Math.PI*2);cx.fill();
      cx.fillStyle=TFT;cx.beginPath();cx.arc(ccx,ccy,tr-5,0,Math.PI*2);cx.fill();
      // carved spokes
      cx.strokeStyle='rgba(0,0,0,0.18)';cx.lineWidth=1;
      for(let a=0;a<Math.PI*2;a+=Math.PI/6){cx.beginPath();cx.moveTo(ccx,ccy);cx.lineTo(ccx+Math.cos(a)*(tr-5),ccy+Math.sin(a)*(tr-5));cx.stroke();}
      cx.strokeStyle=TGD;cx.lineWidth=2;cx.beginPath();cx.arc(ccx,ccy,tr,0,Math.PI*2);cx.stroke();
      // symbol
      const sym=0.5+0.25*Math.sin(t*1.4);
      cx.globalAlpha=sym;cx.fillStyle=TGD;cx.font=Math.round(tr*.45)+'px serif';cx.textAlign='center';cx.textBaseline='middle';
      cx.fillText('⚜',ccx,ccy);cx.globalAlpha=1;
      // chairs
      for(let i=0;i<12;i++){
        const a=-Math.PI/2+(i/12)*Math.PI*2;
        const cx2=ccx+Math.cos(a)*sr, cy2=ccy+Math.sin(a)*sr;
        cx.fillStyle=CHR;cx.beginPath();cx.arc(cx2,cy2,p(7),0,Math.PI*2);cx.fill();
        cx.strokeStyle=TGD;cx.lineWidth=1;cx.beginPath();cx.arc(cx2,cy2,p(7),0,Math.PI*2);cx.stroke();
      }
    }

    // ─── Torch (pixel fire, NO gradient) ──────────────────────────────────────
    function torch(x:number,y:number,t:number) {
      // pole
      r1(x-p(2),y,p(4),p(10),'#4a3010');r1(x-p(3),y-p(2),p(6),p(4),'#5a4018');
      // animated fire pixels — frame alternates between 2 patterns
      const f=Math.floor(t*8)%4;
      const fireColors=['#ff8800','#ffcc00','#ff4400','#ffaa00'];
      r1(x-p(2),y-p(8),p(5),p(5),fireColors[f]);
      r1(x-p(1),y-p(11),p(3),p(3),fireColors[(f+1)%4]);
      r1(x,y-p(13),p(2),p(2),'#ffee88');
    }

    // ─── Plant (flat top-down) ─────────────────────────────────────────────────
    function plant(x:number,y:number) {
      r1(x-p(5),y+p(4),p(10),p(7),PPT);cx.strokeStyle='#5a2808';cx.lineWidth=1;cx.strokeRect(x-p(5),y+p(4),p(10),p(7));
      cx.fillStyle=PLT;cx.beginPath();cx.arc(x,y,p(8),0,Math.PI*2);cx.fill();
      cx.fillStyle='#40a040';cx.beginPath();cx.arc(x-p(3),y-p(3),p(5),0,Math.PI*2);cx.fill();
      cx.beginPath();cx.arc(x+p(3),y-p(3),p(5),0,Math.PI*2);cx.fill();cx.beginPath();cx.arc(x,y-p(5),p(4),0,Math.PI*2);cx.fill();
    }

    // ─── Kitchen area ──────────────────────────────────────────────────────────
    function drawKitchen(r:{x:number,y:number,w:number,h:number},t:number) {
      const {x,y,w,h}=r;
      // prep table
      desk(x+p(4),y+p(6),w-p(8),p(16));
      // cauldron (no gradient — flat colored circle)
      const cx2=x+Math.round(w/2), cy2=y+Math.round(h*0.6);
      const cr=Math.min(w,h)*0.14;
      r1o(cx2-cr,cy2-cr,cr*2,cr*2,CTN,'#404040',1.5);
      cx.fillStyle=`hsl(${(t*30)%360},40%,22%)`;cx.beginPath();cx.arc(cx2,cy2,cr-2,0,Math.PI*2);cx.fill();
      // fire under cauldron — 3 orange pixels, no gradient
      const ff=Math.floor(t*6)%3;
      r1(cx2-3+ff,cy2+cr+1,6-ff,4,'#ff8800');
      r1(cx2-1,cy2+cr+2,2,2,'#ffcc00');
      // smoke pixels
      const sm=Math.floor(t*5)%3;
      r1(cx2-1,cy2-cr-3-sm,2,2,'rgba(150,130,100,0.55)');
      // food items
      r1(x+p(8),y+p(12),p(6),p(6),'#c07030');r1(x+p(18),y+p(12),p(4),p(5),'#308030');r1(x+p(26),y+p(12),p(5),p(5),'#c03030');
      plant(x+w-p(16),y+h-p(20));
    }

    // ─── Banquet hall ──────────────────────────────────────────────────────────
    function drawBanquet(r:{x:number,y:number,w:number,h:number}) {
      const {x,y,w,h}=r;
      // long table
      const tw=Math.round(w*0.75), th=Math.round(h*0.45);
      const tx=x+Math.round((w-tw)/2), ty=y+Math.round((h-th)/2);
      r1o(tx,ty,tw,th,TBL,'#8a6030');
      r1(tx+p(3),ty+p(3),tw-p(6),th-p(6),'#6a4818');
      // place settings
      for(let i=0;i<3;i++){
        const px2=tx+p(16)+i*Math.floor((tw-p(32))/2);
        r1(px2,ty+p(5),p(8),p(4),PCH);r1(px2,ty+th-p(9),p(8),p(4),PCH);
      }
      // chairs on both sides
      for(let i=0;i<4;i++){
        const px2=tx+p(10)+i*Math.floor((tw-p(20))/3);
        r1o(px2-p(5),ty-p(11),p(10),p(9),CHR,'#6a4020');
        r1o(px2-p(5),ty+th+p(2),p(10),p(9),CHR,'#6a4020');
      }
      // candelabra center
      r1(tx+Math.round(tw/2)-p(2),ty+Math.round(th/2)-p(5),p(4),p(8),'#8a8040');
      r1(tx+Math.round(tw/2)-p(4),ty+Math.round(th/2)-p(8),p(8),p(2),'#8a8040');
      r1(tx+Math.round(tw/2)-p(4),ty+Math.round(th/2)-p(10),p(2),p(3),'#ffee44');
      r1(tx+Math.round(tw/2)+p(2),ty+Math.round(th/2)-p(10),p(2),p(3),'#ffee44');
    }

    // ─── Activity props (drawn with character, no gradients) ───────────────────
    function drawProp(a:Agent,t:number) {
      const {x,y,act,ap,wp}=a;
      if(act==='eat') {
        r1o(x+p(8),y+p(4),p(12),p(6),'#5a3810','#8a6030'); // bowl
        r1(x+p(10),y+p(3),p(8),p(3),'#b08040'); // food top
        // arm motion — a moving pixel
        const ay=Math.round(Math.sin(t*4+ap)*5);
        r1(x-p(8)+Math.round(Math.cos(t*4+ap)*3)-1,y-p(6)+ay-1,p(3),p(3),'#c07830');
      }
      else if(act==='read') {
        r1o(x-p(14),y-p(2),p(28),p(16),'#6a4020','#4a2808');
        r1(x-p(13),y-p(1),p(12),p(14),PCH);r1(x+p(2),y-p(1),p(12),p(14),PCH);
        cx.strokeStyle='rgba(100,70,20,0.4)';cx.lineWidth=.8;
        for(let ly=y+p(3);ly<y+p(12);ly+=p(3)){cx.beginPath();cx.moveTo(x-p(11),ly);cx.lineTo(x-p(3),ly);cx.stroke();cx.beginPath();cx.moveTo(x+p(3),ly);cx.lineTo(x+p(11),ly);cx.stroke();}
      }
      else if(act==='magic') {
        // staff
        cx.strokeStyle='#6a4020';cx.lineWidth=2;
        cx.beginPath();cx.moveTo(x-p(8),y+p(8));cx.lineTo(x-p(13),y-p(13));cx.stroke();
        // orb — just a solid colored circle, NO gradient
        const f=Math.floor(t*6)%3;
        const orbCols=['#6040c0','#4060c0','#8040a0'];
        r1(x-p(16),y-p(17),p(6),p(6),orbCols[f]);
        r1(x-p(15),y-p(18),p(2),p(2),'#c0a0ff'); // highlight
        // rune circle — just stroked arcs, no fill
        cx.strokeStyle='rgba(80,60,180,0.5)';cx.lineWidth=1;
        cx.beginPath();cx.arc(x,y+p(10),p(14),0,Math.PI*2);cx.stroke();
        // 4 orbiting dots (no gradient)
        for(let i=0;i<4;i++){
          const a2=-Math.PI/2+(i/4)*Math.PI*2+t*2;
          r1(Math.round(x+Math.cos(a2)*p(14))-p(2),Math.round(y+p(10)+Math.sin(a2)*p(14))-p(2),p(4),p(4),'#6060d0');
        }
      }
      else if(act==='write') {
        const qx=x+p(4)+Math.round(Math.sin(t*5+ap)*8);
        cx.strokeStyle='#8a7050';cx.lineWidth=1.5;
        cx.beginPath();cx.moveTo(qx,y+p(4));cx.lineTo(qx-p(3),y+p(12));cx.stroke();
        cx.fillStyle='#f0e8c0';cx.beginPath();cx.moveTo(qx,y+p(4));cx.lineTo(qx+p(4),y);cx.lineTo(qx+p(2),y+p(7));cx.fill();
      }
      else if(act==='cook') {
        const sa=t*2.5+ap;
        const lx=x+Math.round(Math.cos(sa)*8),ly=y-p(4)+Math.round(Math.sin(sa)*4);
        cx.strokeStyle='#6a4020';cx.lineWidth=2;cx.beginPath();cx.moveTo(x,y+p(2));cx.lineTo(lx,ly);cx.stroke();
        r1(lx-p(2),ly-p(2),p(5),p(5),'#3a2808');
      }
      else if(act==='meditate') {
        // just concentric stroked circles — NO fill, no gradient
        cx.strokeStyle='rgba(60,120,220,0.35)';cx.lineWidth=1;
        cx.beginPath();cx.arc(x,y,p(16),0,Math.PI*2);cx.stroke();
        cx.beginPath();cx.arc(x,y,p(10),0,Math.PI*2);cx.stroke();
        // halo ring above head (thin)
        cx.strokeStyle='rgba(80,140,255,0.4)';
        cx.beginPath();cx.arc(x,y-p(22),p(8),0,Math.PI*2);cx.stroke();
      }
      else if(act==='music') {
        r1o(x+p(6),y+p(2),p(14),p(16),'#8a5820','#4a2808');
        cx.strokeStyle='#1a0e04';cx.lineWidth=.8;cx.beginPath();cx.moveTo(x+p(13),y-p(6));cx.lineTo(x+p(13),y+p(18));cx.stroke();
        const sw=Math.round(Math.sin(t*6+ap)*4);
        cx.strokeStyle='#c8a020';cx.lineWidth=1.5;cx.beginPath();cx.moveTo(x-p(3),y-p(3));cx.lineTo(x+p(7),y+sw);cx.stroke();
        // music note pixels (no particle system)
        const nf=Math.floor(t*3)%8;
        if(nf<4) r1(x-p(1)+nf,y-p(18)-nf,p(3),p(3),'#c8a020');
      }
      else if(act==='sleep') {
        // zzz — just text pixels cycling
        const zf=Math.floor(t*1.5)%4;
        cx.fillStyle=`rgba(180,200,255,${0.4+zf*.1})`;
        cx.font='bold '+(p(8)+zf)+'px monospace';
        cx.textAlign='center';cx.textBaseline='middle';
        cx.fillText('z',x,y-p(20)-zf*3);
        cx.font='bold '+(p(10)+zf)+'px monospace';
        cx.fillText('Z',x+p(6),y-p(28)-zf*2);
        cx.font='bold '+(p(12))+'px monospace';
        cx.fillText('Z',x+p(2),y-p(38));
      }
      else if(act==='talk') {
        // speech bubble — solid, flat
        const ba=0.85;
        r1(x-p(15),y-p(33),p(30),p(18),'rgba(44,36,22,'+ba+')');
        cx.strokeStyle='rgba(200,160,30,0.6)';cx.lineWidth=1;cx.strokeRect(x-p(15),y-p(33),p(30),p(18));
        r1(x-p(2),y-p(15),p(5),p(3),'rgba(44,36,22,'+ba+')');
        // animated dots — pixel based
        for(let d=0;d<3;d++){
          const on=Math.floor(t*3+d)%3===0;
          r1(x-p(6)+d*p(6)-1,y-p(24)-1,on?p(4):p(3),on?p(4):p(3),'#c8a020');
        }
      }
    }

    // ─── Draw Minecraft character ──────────────────────────────────────────────
    function drawAgent(a:Agent,t:number) {
      const {x,y,act,wp,ap,char,seated,blinkT}=a;
      const s=(20/32)*SC;
      const floatY=(act==='meditate')?Math.round(Math.sin(t*1.5+ap)*2.5):0;
      const ox=Math.round(x-16*s), oy=Math.round(y-20*s-floatY);
      const px=(rx:number,ry:number,rw:number,rh:number)=>
        cx.fillRect(ox+Math.round(rx*s),oy+Math.round(ry*s),Math.max(1,Math.round(rw*s)),Math.max(1,Math.round(rh*s)));

      drawProp(a,t);

      cx.fillStyle='rgba(0,0,0,0.2)';cx.beginPath();cx.ellipse(x,oy+Math.round(39*s),Math.round(8*s),Math.max(1,Math.round(2*s)),0,0,Math.PI*2);cx.fill();

      cx.fillStyle=char.pants;px(7,27,18,9);
      cx.fillStyle='#1a1008';px(8,36,7,2);px(17,36,7,2);

      let sw=0;
      if(['eat','write','cook','music'].includes(act)) sw=Math.sin(t*4+wp)*.45;
      else if(!seated) sw=Math.sin(t*2+wp)*.18;
      cx.fillStyle=char.body;
      px(2,15+Math.round(sw*4),5,10);px(25,15+Math.round(-sw*4),5,10);

      cx.fillStyle=char.body;px(7,15,18,11);
      cx.fillStyle='rgba(255,255,255,0.10)';px(7,15,2,11);
      cx.fillStyle='#3a2808';px(7,24,18,2);cx.fillStyle='#c8a020';px(14,24,4,2);
      if(char.accent){cx.fillStyle=char.accent;cx.globalAlpha=.4;px(9,16,14,2);cx.globalAlpha=1;}

      cx.fillStyle=char.skin;px(13,14,6,2);
      cx.fillStyle=char.skin;px(6,0,20,14);
      cx.fillStyle='rgba(255,255,255,0.12)';px(6,0,2,14);
      cx.fillStyle=char.hair;px(6,0,20,4);px(6,4,2,8);px(24,4,2,8);

      if(act==='magic'||act==='meditate'){
        cx.fillStyle=char.hair;cx.globalAlpha=.55;px(6,0,20,5);
        cx.beginPath();cx.moveTo(ox+Math.round(9*s),oy);cx.lineTo(ox+Math.round(16*s),oy-Math.round(7*s));cx.lineTo(ox+Math.round(23*s),oy);cx.fill();
        cx.globalAlpha=1;
      }

      const blink=((t*1000+blinkT)%3800)<110;
      cx.fillStyle=char.eyes;px(10,6,3,blink?.5:2);px(19,6,3,blink?.5:2);
      cx.fillStyle='rgba(255,255,255,0.6)';px(12,6,1,1);px(21,6,1,1);
      cx.fillStyle='#1a1a1a';cx.globalAlpha=.65;
      if(act==='eat'||act==='music'){cx.beginPath();cx.arc(ox+Math.round(16*s),oy+Math.round(12*s),Math.round(2.5*s),0,Math.PI);cx.fill();}
      else{px(10,11,6,1);}
      cx.globalAlpha=1;

      if(char.accessory==='glasses'){cx.strokeStyle='#1a1a1a';cx.lineWidth=Math.max(1,s*.9);cx.strokeRect(ox+Math.round(9*s),oy+Math.round(5*s),Math.round(5*s),Math.round(4*s));cx.strokeRect(ox+Math.round(18*s),oy+Math.round(5*s),Math.round(5*s),Math.round(4*s));cx.fillStyle='#1a1a1a';px(14,6,4,1);}
      if(char.accessory==='beard'){cx.fillStyle=char.beardColor||'#D0D0D0';px(8,12,16,3);px(7,10,3,4);px(22,10,3,4);}
      if(char.accessory==='headband'){cx.fillStyle='#8B1A1A';px(6,4,20,2);}

      if(activeRef.current&&seated){
        for(let d=0;d<3;d++){
          const dp=(t*3.5+ap+d*.7)%(Math.PI*2);
          cx.globalAlpha=.3+.7*Math.abs(Math.sin(dp));cx.fillStyle=char.body;
          cx.beginPath();cx.arc(x-4+d*4,oy-Math.abs(Math.sin(dp))*6,2,0,Math.PI*2);cx.fill();cx.globalAlpha=1;
        }
      }
    }

    // ─── Full scene ────────────────────────────────────────────────────────────
    function drawScene(t:number) {
      const g=G();
      const {W16,TW,C1,C2,R1,R2,CCX,CCY,TR,SR,lib,alc,slp,hal,kit,ban}=g;

      // fill all black first
      r1(0,0,W,H,WL);

      // ── Floors ──────────────────────────────────────────────────────────────
      tileFloor(lib.x,lib.y,lib.w,lib.h,WDA,WDB);          // library — wood
      tileFloor(alc.x,alc.y,alc.w,alc.h,FL,FL2);           // alchemy — stone
      tileFloor(slp.x,slp.y,slp.w,slp.h,WDA,WDB);          // sleeping — wood
      tileFloor(hal.x,hal.y,hal.w,hal.h,FL,FL2);            // great hall — stone
      tileFloor(kit.x,kit.y,kit.w,kit.h,WDA,WDB);           // kitchen — wood
      tileFloor(ban.x,ban.y,ban.w,ban.h,WDA,WDB);           // banquet — wood

      // ── Outer walls ──────────────────────────────────────────────────────────
      wall(0,0,W,W16);wall(0,H-W16,W,W16);wall(0,W16,W16,H-2*W16);wall(W-W16,W16,W16,H-2*W16);

      // ── Inner vertical walls with door gaps ──────────────────────────────────
      const dw=Math.round(W*0.06);
      wall(C1-TW/2,W16,TW,R1-W16-dw);            // top-left | top-center
      door(C1-TW/2,R1-W16-dw,TW,dw,FL,FL2);
      wall(C1-TW/2,R1,TW,R2-R1);                  // (fully open to hall)
      wall(C1-TW/2,R2,TW,H-W16-R2-dw);
      door(C1-TW/2,H-W16-dw,TW,dw,WDA,WDB);

      wall(C2-TW/2,W16,TW,R1-W16-dw);
      door(C2-TW/2,R1-W16-dw,TW,dw,FL,FL2);
      wall(C2-TW/2,R1,TW,R2-R1);
      wall(C2-TW/2,R2,TW,H-W16-R2-dw);
      door(C2-TW/2,H-W16-dw,TW,dw,WDA,WDB);

      // ── Inner horizontal walls ────────────────────────────────────────────────
      const dh=Math.round(H*0.06);
      wall(W16,R1-TW/2,C1-W16,TW);                // lib | hall (open)
      wall(C2,R1-TW/2,W-W16-C2,TW);               // hall | slp
      wall(W16,R2-TW/2,C1-W16-dw,TW);             // kit top
      door(C1-dw,R2-TW/2,dw,TW,FL,FL2);
      wall(C2,R2-TW/2,W-W16-C2-dw,TW);
      door(W-W16-dw,R2-TW/2,dw,TW,WDA,WDB);

      // ── Windows on outer walls ────────────────────────────────────────────────
      const wsz=Math.round(W16*1.6);
      win(0,Math.round(H*0.22),W16+2,wsz,t);
      win(0,Math.round(H*0.55),W16+2,wsz,t);
      win(W-W16-2,Math.round(H*0.22),W16+2,wsz,t);
      win(W-W16-2,Math.round(H*0.55),W16+2,wsz,t);
      win(Math.round(W*0.38),0,wsz*1.5,W16+2,t);
      win(Math.round(W*0.55),0,wsz*1.5,W16+2,t);

      // ── Tapestries on top wall ────────────────────────────────────────────────
      tapestry(W16+8,0,Math.round(W*.08),W16,'#7a1818');
      tapestry(Math.round(W*.20),0,Math.round(W*.06),W16,'#18387a');
      tapestry(Math.round(W*.70),0,Math.round(W*.06),W16,'#7a1818');
      tapestry(Math.round(W*.80),0,Math.round(W*.08),W16,'#18387a');

      // ── Room furniture ────────────────────────────────────────────────────────
      drawLibrary(lib);
      drawAlchemy(alc,t);
      drawSleeping(slp);
      drawBanquet(ban);
      drawKitchen(kit,t);

      // ── Council table (center of great hall) ──────────────────────────────────
      drawTable(CCX,CCY,TR,SR,t);

      // ── Torches (pixel fire, no gradient glow) ────────────────────────────────
      torch(W16+10,W16+10,t);
      torch(W-W16-10,W16+10,t);
      torch(W16+10,H-W16-10,t);
      torch(W-W16-10,H-W16-10,t);
      // inner hall torches
      torch(W16+10,Math.round((R1+R2)/2),t);
      torch(W-W16-10,Math.round((R1+R2)/2),t);

      // ── Corner plants ─────────────────────────────────────────────────────────
      plant(lib.x+lib.w-16,lib.y+lib.h-16);
      plant(slp.x+16,slp.y+slp.h-16);
      plant(kit.x+kit.w-16,kit.y+kit.h-16);
      plant(ban.x+ban.w-16,ban.y+ban.h-16);
    }

    // ─── Zone targets per activity ────────────────────────────────────────────
    function zones() {
      const g=G();
      const {lib,alc,slp,hal,kit,ban,CCX,CCY}=g;
      return [
        {x:CCX-20, y:CCY+30, act:'eat'},
        {x:CCX+20, y:CCY+40, act:'eat'},
        {x:lib.x+lib.w*0.4, y:lib.y+lib.h*0.6, act:'read'},
        {x:lib.x+lib.w*0.6, y:lib.y+lib.h*0.75, act:'read'},
        {x:alc.x+alc.w*0.5, y:alc.y+alc.h*0.65, act:'magic'},
        {x:alc.x+alc.w*0.65, y:alc.y+alc.h*0.5, act:'magic'},
        {x:kit.x+kit.w*0.4, y:kit.y+kit.h*0.5, act:'write'},
        {x:kit.x+kit.w*0.5, y:kit.y+kit.h*0.65, act:'cook'},
        {x:hal.x+hal.w*0.15, y:hal.y+hal.h*0.5, act:'meditate'},
        {x:alc.x+alc.w*0.3, y:alc.y+alc.h*0.35, act:'music'},
        {x:slp.x+slp.w*0.4, y:slp.y+slp.h*0.4, act:'sleep'},
        {x:hal.x+hal.w*0.85, y:hal.y+hal.h*0.5, act:'talk'},
      ];
    }

    // ─── Agents ───────────────────────────────────────────────────────────────
    const g0=G(), zs0=zones();
    const agents:Agent[]=CREATORS.slice(0,12).map((c,i)=>{
      const ang=-Math.PI/2+(i/12)*Math.PI*2;
      const z=zs0[i]||zs0[0];
      return {
        x:z.x,y:z.y,vx:0,vy:0,tx:z.x,ty:z.y,
        sx:g0.CCX+Math.cos(ang)*g0.SR,sy:g0.CCY+Math.sin(ang)*g0.SR,
        seated:false,blinkT:Math.random()*4000,wp:Math.random()*Math.PI*2,ap:i%3,
        act:ACTS[i],char:CHARS[c.id]||DEFAULT_CHAR,
      };
    });

    function updateAgents(){
      const g=G(); const zs=zones();
      const {CCX,CCY,TR,SR,W16}=g;
      const isActive=activeRef.current;
      for(let i=0;i<agents.length;i++){
        const a=agents[i];
        a.sx=CCX+Math.cos(-Math.PI/2+(i/12)*Math.PI*2)*SR;
        a.sy=CCY+Math.sin(-Math.PI/2+(i/12)*Math.PI*2)*SR;
        if(isActive){
          a.x=lerp(a.x,a.sx,.055);a.y=lerp(a.y,a.sy,.055);
          a.seated=dist(a.x,a.y,a.sx,a.sy)<10;
        } else {
          a.seated=false;
          const z=zs[i]||zs[0];
          if(dist(a.x,a.y,a.tx,a.ty)<8){a.tx=z.x+rnd(-16,16);a.ty=z.y+rnd(-12,12);}
          const dx=a.tx-a.x,dy=a.ty-a.y,dl=Math.sqrt(dx*dx+dy*dy);
          if(dl>1){a.vx=lerp(a.vx,(dx/dl)*.6,.07);a.vy=lerp(a.vy,(dy/dl)*.6,.07);}
          const td=dist(a.x+a.vx,a.y+a.vy,CCX,CCY);
          if(td<TR+22){const aa=Math.atan2(a.y-CCY,a.x-CCX);a.vx+=Math.cos(aa)*.7;a.vy+=Math.sin(aa)*.7;}
          a.x=clamp(a.x+a.vx,W16+8,W-W16-8);a.y=clamp(a.y+a.vy,W16+8,H-W16-8);
        }
      }
    }

    // ─── Loop — capped at 24fps, pauses when tab hidden ──────────────────────
    const t0=performance.now(); let rafId=0; let lastFrame=0;
    const FPS=24, INTERVAL=1000/FPS;

    // Cache G() result — only recalculate on resize
    let cachedG = G();
    const origResize = onResize;
    window.removeEventListener('resize', onResize);
    const onResizeCached = () => { W=window.innerWidth;H=window.innerHeight;cv.width=W;cv.height=H;SC=Math.max(0.5,Math.min(1.4,Math.min(W,H)/900));cachedG = G(); };
    window.addEventListener('resize', onResizeCached);

    function frame(now:number){
      rafId=requestAnimationFrame(frame);
      if(document.hidden) return; // pause when tab not visible
      const elapsed=now-lastFrame;
      if(elapsed<INTERVAL) return; // skip frames to hit ~24fps
      lastFrame=now-(elapsed%INTERVAL);
      const t=(now-t0)/1000;
      cx.clearRect(0,0,W,H);
      drawScene(t);
      agents.slice().sort((a,b)=>a.y-b.y).forEach(a=>drawAgent(a,t));
      updateAgents();
    }
    rafId=requestAnimationFrame(frame);
    return ()=>{ cancelAnimationFrame(rafId);window.removeEventListener('resize',onResizeCached); };
  },[]);

  return (
    <canvas ref={canvasRef} style={{
      position:'fixed',inset:0,width:'100%',height:'100%',
      zIndex:0,pointerEvents:'none',imageRendering:'pixelated',display:'block',
    }}/>
  );
}
