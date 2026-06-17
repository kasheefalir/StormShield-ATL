import { useEffect, useRef } from "react";
import { drawSmartTankFeeder } from "./feederPipe";

interface Props {
  isPlaying: boolean;
  speed: number;
  timelineValue: number;
  // "smart-tank" hides the storm drain / sewer apparatus — the basin is fed by the
  // smart tank's excess water instead (used inside the treatment-train slideshow).
  source?: "storm-drain" | "smart-tank";
}

type Drop     = { x: number; y: number; spd: number; len: number; op: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; col: string };

function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.arcTo(x + w, y, x + w, y + rad, rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
  ctx.lineTo(x + rad, y + h);
  ctx.arcTo(x, y + h, x, y + h - rad, rad);
  ctx.lineTo(x, y + rad);
  ctx.arcTo(x, y, x + rad, y, rad);
  ctx.closePath();
}

export function RetentionBasinVisualization({ isPlaying, speed, timelineValue, source = "storm-drain" }: Props) {
  const fromTank = source === "smart-tank";
  const cvRef   = useRef<HTMLCanvasElement>(null);
  const elRef   = useRef<HTMLDivElement>(null);
  const rafRef  = useRef(0);
  const tRef    = useRef(0);
  const rainRef = useRef<Drop[]>([]);
  const partRef = useRef<Particle[]>([]);

  useEffect(() => {
    const el = elRef.current, cv = cvRef.current;
    if (!el || !cv) return;
    const ro = new ResizeObserver(() => {
      cv.width = el.clientWidth; cv.height = el.clientHeight;
      rainRef.current = []; partRef.current = [];
    });
    ro.observe(el);
    cv.width = el.clientWidth; cv.height = el.clientHeight;
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const frame = () => {
      if (!cv || !ctx) return;
      if (isPlaying) tRef.current += speed;
      render(ctx, cv.width, cv.height, tRef.current, timelineValue / 100);
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, speed, timelineValue, source]);

  // ─────────────────────────────────────────────────────────────────────────
  function render(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, prog: number) {
    ctx.clearRect(0, 0, W, H);

    // ── Compact layout — everything fits without overlap ────────────────────
    const sceneBot  = Math.floor(H * 0.42);       // ground / street level
    const roadH     = Math.floor(H * 0.09);
    const roadTop   = sceneBot - roadH;
    const swkH      = 6;
    const ugTop     = sceneBot + swkH;            // underground starts

    // Neighbourhood left 52%
    const neighW    = Math.floor(W * 0.52);

    // Storm drain in neighbourhood (prominent, centred in neighW)
    const drainX    = Math.floor(W * 0.33);

    // Sensor sits on the drain shaft, valve junction at drain bottom
    const sensorY   = ugTop + Math.floor((H * 0.62 - ugTop) * 0.35);  // mid-shaft
    const valveY    = ugTop + Math.floor((H * 0.62 - ugTop) * 0.65);  // lower in shaft

    // Diversion pipe: valve → basin inlet (horizontal run then drop into basin)
    const divPipeY  = valveY;                     // same height as valve exit
    const divPipeX1 = drainX;
    const divPipeX2 = Math.floor(W * 0.575);      // left edge of basin opening above-ground

    // Sewer pipe runs full-width, well above the very bottom
    const sewPipeH  = Math.max(Math.floor(H * 0.11), 22);
    const sewPipeY  = Math.floor(H * 0.77);
    const sewPipeL  = W * 0.04;
    const sewPipeR  = W * 0.96;

    // Basin — right 40% of canvas, surface bowl visible above + below ground
    const basinX    = Math.floor(W * 0.575);
    const basinRX   = Math.floor(W * 0.96);
    const basinBW   = basinRX - basinX;
    const berm      = Math.floor(basinBW * 0.10);
    const basinTopY = sceneBot - 2;               // basin rim is at ground level
    const basinFloorY = sewPipeY - 12;            // floor sits just above sewer pipe
    const basinDepth  = basinFloorY - basinTopY;

    // Inlet point: where diversion pipe empties into basin (upper-left of bowl)
    const inletX    = basinX + berm + 4;
    const inletY    = basinTopY + Math.floor(basinDepth * 0.22);

    // Outlet control structure
    const outletX   = basinRX - berm - 6;
    const outletY   = basinFloorY - 18;

    // ── Progression (mirrors SmartStorageNetwork logic) ──────────────────────
    // 0.00–0.18 : rain → pipe fills, sensor alert
    // 0.18–0.38 : valve opens (0→1) — diversion begins
    // 0.38–0.80 : basin fills (0→88%) — sewer drops to safe level
    // 0.80–0.90 : storm tapers
    // 0.90–1.00 : controlled release — basin drains slowly
    const valveAmt   = prog < 0.18 ? 0 : Math.min((prog - 0.18) / 0.20, 1);
    const rawSew     = Math.min(prog / 0.20, 1) * 1.15;
    const sewUtil    = Math.max(rawSew - valveAmt * 0.83, 0.32 * Math.min(prog / 0.20, 1));
    const stressed   = sewUtil > 1.0;
    const fillFrac   = prog < 0.38 ? 0 : prog < 0.90
      ? Math.min((prog - 0.38) / 0.42, 1) * 0.88
      : 0.88 - Math.min((prog - 0.90) / 0.10, 1) * 0.22;
    const releasing  = prog > 0.90;
    const releaseAmt = releasing ? Math.min((prog - 0.90) / 0.10, 1) : 0;

    // Metrics aligned to card: 65% peak runoff captured in basin, 76% peak flow reduction
    // 6,400 gal/min peak diversion (EPA wet detention guidance; Georgia Stormwater Manual)
    // overflow avoided = volume that would have entered combined sewer without basin
    const storagePct      = Math.round(fillFrac * 100);
    const divertedGPM     = Math.round(valveAmt * 6400);
    const floodRedPct     = Math.round(valveAmt * 76);
    const overflowAvoided = Math.round(Math.min(valveAmt * 1.25, 1) * 5100);

    let step = 1;
    if (prog > 0.10) step = 2;
    if (prog > 0.18) step = 3;
    if (prog > 0.38) step = 4;
    if (prog > 0.54) step = 5;
    if (prog > 0.70) step = 6;
    if (prog > 0.82) step = 7;
    if (prog > 0.90) step = 8;

    const waterH       = basinDepth * fillFrac;
    const waterSurfaceY = basinFloorY - waterH;

    // Draw back-to-front
    drawSky(ctx, W, roadTop, t);
    drawBuildings(ctx, neighW, roadTop, t);
    drawRain(ctx, W, roadTop, t, prog);
    drawStreet(ctx, neighW, roadTop, roadH, sceneBot, swkH, drainX, t, valveAmt, prog);
    drawUnderground(ctx, neighW, ugTop, sewPipeY, t);
    drawBasinLandscape(ctx, basinX, basinRX, basinBW, berm, basinTopY, basinFloorY, basinDepth, t);
    drawBasinWater(ctx, basinX, basinRX, berm, basinTopY, basinFloorY, waterSurfaceY, waterH, fillFrac, inletX, inletY, valveAmt, t);
    drawBasinVegetation(ctx, basinX, basinRX, berm, basinTopY, t, fillFrac);
    // Storm-drain / valve / diversion / sewer apparatus — only when fed from the
    // storm drain. In smart-tank mode the basin is fed by the inflow pipe overlay.
    if (!fromTank) {
      drawDrainShaft(ctx, drainX, ugTop, sceneBot, swkH, sensorY, valveY, sewPipeY, sewUtil, stressed, valveAmt, t, prog);
      drawSensorNode(ctx, drainX, sensorY, stressed, valveAmt, prog, t);
      drawValveJunction(ctx, drainX, valveY, stressed, valveAmt, t);
      drawDiversionPipe(ctx, divPipeX1, divPipeX2, divPipeY, inletX, inletY, valveAmt, t);
    }
    drawOutletStructure(ctx, outletX, outletY, basinFloorY, sewPipeY, releaseAmt, fillFrac, t);
    // Underground feeder: excess from the smart tank runs in from the left and up
    // into the basin's inlet, filling it until the basin reaches capacity.
    if (fromTank) {
      drawSmartTankFeeder(
        ctx,
        [{ x: 2, y: valveY }, { x: basinX - 16, y: valveY }, { x: inletX, y: inletY }],
        t, fillFrac / 0.88,
        { label: "⟶ EXCESS FROM SMART TANK" },
      );
    }
    if (!fromTank) {
      drawSewerPipe(ctx, sewPipeL, sewPipeR, sewPipeY, sewPipeH, sewUtil, stressed, valveAmt, t, prog);
      drawParticles(ctx, partRef, drainX, ugTop, sensorY, valveY, divPipeX1, divPipeX2, divPipeY, inletX, inletY, basinFloorY, outletX, sewPipeY, sewPipeH, valveAmt, releaseAmt, fillFrac, stressed, t);
      drawLabels(ctx, W, H, roadTop, basinX, basinRX, berm, basinTopY, basinFloorY, waterSurfaceY, fillFrac, inletX, inletY, drainX, sensorY, valveY, divPipeY, sewPipeY, sewPipeH, valveAmt, releasing, releaseAmt, stressed, storagePct, divertedGPM, floodRedPct, overflowAvoided, step, prog, t);
    }
  }

  // ── SKY ───────────────────────────────────────────────────────────────────
  function drawSky(ctx: CanvasRenderingContext2D, W: number, skyBot: number, t: number) {
    const g = ctx.createLinearGradient(0, 0, 0, skyBot);
    g.addColorStop(0, "#060e1e"); g.addColorStop(1, "#0c1e2c");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, skyBot);
    [{ bx:W*0.07,y:14,r:55 },{ bx:W*0.30,y:10,r:72 },{ bx:W*0.56,y:22,r:58 },{ bx:W*0.82,y:16,r:48 }].forEach(c => {
      const cx = (c.bx + t * 0.016) % (W + 120) - 60;
      const gr = ctx.createRadialGradient(cx, c.y, 0, cx, c.y, c.r);
      gr.addColorStop(0, "rgba(8,20,42,0.95)"); gr.addColorStop(0.7, "rgba(5,14,30,0.70)"); gr.addColorStop(1, "rgba(2,8,18,0)");
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(cx, c.y, c.r*1.8, c.r*0.65, 0, 0, Math.PI*2); ctx.fill();
    });
  }

  // ── BUILDINGS ─────────────────────────────────────────────────────────────
  function drawBuildings(ctx: CanvasRenderingContext2D, neighW: number, roadTop: number, t: number) {
    [{ x:neighW*0.03,w:46,h:84 },{ x:neighW*0.14,w:36,h:62 },{ x:neighW*0.27,w:50,h:70 },{ x:neighW*0.55,w:42,h:90 },{ x:neighW*0.71,w:34,h:58 },{ x:neighW*0.85,w:44,h:78 }].forEach(b => {
      const by = roadTop - b.h;
      const bg = ctx.createLinearGradient(b.x, by, b.x+b.w, by);
      bg.addColorStop(0, "#0a1828"); bg.addColorStop(0.5, "#0d2035"); bg.addColorStop(1, "#071520");
      ctx.fillStyle = bg; ctx.fillRect(b.x, by, b.w, b.h);
      [0.22,0.50,0.72].forEach(yf => {
        ctx.fillStyle = Math.sin(t*0.018+b.x*0.01)>0.86 ? "rgba(0,212,216,0.5)" : "rgba(255,215,85,0.20)";
        ctx.fillRect(b.x+6, by+b.h*yf, 8, 6);
        ctx.fillStyle = "rgba(255,215,85,0.16)"; ctx.fillRect(b.x+b.w-14, by+b.h*yf, 8, 6);
      });
      ctx.strokeStyle = "rgba(0,212,216,0.06)"; ctx.lineWidth=1; ctx.strokeRect(b.x, by, b.w, b.h);
    });
    [{ x:neighW*0.40,w:50,h:40 },{ x:neighW*0.58,w:46,h:36 }].forEach(h => {
      const hy = roadTop - h.h;
      ctx.fillStyle = "#0e1c2c"; ctx.fillRect(h.x, hy, h.w, h.h);
      ctx.fillStyle = "#091522";
      ctx.beginPath(); ctx.moveTo(h.x-4,hy); ctx.lineTo(h.x+h.w/2,hy-16); ctx.lineTo(h.x+h.w+4,hy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,215,85,0.25)"; ctx.fillRect(h.x+10,hy+10,12,9); ctx.fillRect(h.x+h.w-22,hy+10,12,9);
    });
  }

  // ── RAIN ──────────────────────────────────────────────────────────────────
  function drawRain(ctx: CanvasRenderingContext2D, W: number, maxY: number, _t: number, prog: number) {
    const intensity = prog < 0.82 ? Math.min(prog/0.10, 1) : Math.max(1-(prog-0.82)/0.08, 0);
    if (rainRef.current.length === 0)
      for (let i=0;i<155;i++)
        rainRef.current.push({ x:Math.random()*W, y:Math.random()*maxY, spd:7+Math.random()*6, len:10+Math.random()*12, op:0.28+Math.random()*0.5 });
    rainRef.current.forEach(d => {
      d.y += d.spd*intensity;
      if (d.y > maxY+20) { d.y=-20; d.x=Math.random()*W; }
      if (intensity<0.04) return;
      ctx.strokeStyle=`rgba(100,180,255,${d.op*intensity})`; ctx.lineWidth=0.9;
      ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-1.5,d.y+d.len); ctx.stroke();
    });
  }

  // ── STREET ────────────────────────────────────────────────────────────────
  function drawStreet(ctx: CanvasRenderingContext2D, neighW: number, roadTop: number, roadH: number, sceneBot: number, swkH: number, drainX: number, t: number, valveAmt: number, prog: number) {
    const rg = ctx.createLinearGradient(0, roadTop, 0, sceneBot);
    rg.addColorStop(0,"#111820"); rg.addColorStop(1,"#0d1520");
    ctx.fillStyle=rg; ctx.fillRect(0, roadTop, neighW, roadH);
    ctx.strokeStyle="rgba(255,200,0,0.18)"; ctx.lineWidth=1.2; ctx.setLineDash([18,14]);
    ctx.beginPath(); ctx.moveTo(0,roadTop+roadH/2); ctx.lineTo(neighW,roadTop+roadH/2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle="#1a2535"; ctx.fillRect(0, sceneBot, neighW, swkH);

    // Surface runoff + storm drain — only when fed from the storm drain.
    if (!fromTank) {
    // Surface runoff dashes converging on drain
    if (prog>0.06) {
      const rA=Math.min((prog-0.06)/0.12,1)*0.55;
      ctx.save();
      ctx.strokeStyle=`rgba(30,155,240,${rA})`; ctx.lineWidth=1.8; ctx.setLineDash([6,5]);
      ctx.lineDashOffset=-(t*1.0);
      ctx.beginPath(); ctx.moveTo(neighW*0.04,sceneBot-3); ctx.lineTo(drainX-10,sceneBot-3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(neighW*0.55,sceneBot-3); ctx.lineTo(drainX+10,sceneBot-3); ctx.stroke();
      ctx.restore();
    }

    // ── STORM DRAIN — large, prominent ──
    const dgW=30, dgH=swkH+7;
    const dgX=drainX-dgW/2, dgY=sceneBot-2;
    const isDiv = valveAmt>0.35;
    const dc = isDiv ? "rgba(0,215,145," : "rgba(239,100,68,";
    // Halo glow
    const dg2 = ctx.createRadialGradient(drainX,sceneBot+2,0,drainX,sceneBot+2,32);
    dg2.addColorStop(0, dc+`${0.22+Math.sin(t*0.14)*0.10})`);
    dg2.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=dg2; ctx.beginPath(); ctx.arc(drainX,sceneBot+2,32,0,Math.PI*2); ctx.fill();
    // Grate body
    ctx.fillStyle="#12202e"; ctx.beginPath(); rrPath(ctx,dgX,dgY,dgW,dgH,2); ctx.fill();
    ctx.strokeStyle=dc+`${0.72+Math.sin(t*0.14)*0.18})`; ctx.lineWidth=1.5;
    ctx.beginPath(); rrPath(ctx,dgX,dgY,dgW,dgH,2); ctx.stroke();
    for (let gi=0;gi<6;gi++) {
      ctx.beginPath(); ctx.moveTo(dgX+2,dgY+2+gi*2.2); ctx.lineTo(dgX+dgW-2,dgY+2+gi*2.2); ctx.stroke();
    }
    // Water flash dot
    ctx.fillStyle=dc+`${0.32+Math.sin(t*0.18)*0.16})`;
    ctx.beginPath(); ctx.arc(drainX,sceneBot+3,5,0,Math.PI*2); ctx.fill();
    // Label chip
    ctx.save();
    ctx.fillStyle="#040d1a"; ctx.beginPath(); rrPath(ctx,drainX-32,sceneBot-24,64,16,3); ctx.fill();
    ctx.strokeStyle=dc+"0.45)"; ctx.lineWidth=1;
    ctx.beginPath(); rrPath(ctx,drainX-32,sceneBot-24,64,16,3); ctx.stroke();
    ctx.fillStyle=dc+"0.95)"; ctx.font="bold 7px JetBrains Mono, monospace"; ctx.textAlign="center";
    ctx.fillText(isDiv ? "↗ DIVERTED" : "⚠ STORM DRAIN", drainX, sceneBot-13);
    ctx.restore();
    } // end storm-drain block

    // Cars
    const carY=roadTop+5;
    ctx.fillStyle="#0d2035"; ctx.beginPath(); rrPath(ctx,neighW*0.17,carY,40,13,2); ctx.fill();
    ctx.fillStyle="#0a1828"; ctx.beginPath(); rrPath(ctx,neighW*0.19,carY-9,26,9,2); ctx.fill();
    ctx.fillStyle="rgba(255,220,100,0.45)";
    ctx.beginPath(); ctx.arc(neighW*0.18,carY+7,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(neighW*0.17+38,carY+7,2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#0c1c30"; ctx.beginPath(); rrPath(ctx,neighW*0.57,carY+1,36,12,2); ctx.fill();
    ctx.fillStyle="#091525"; ctx.beginPath(); rrPath(ctx,neighW*0.59,carY-8,24,9,2); ctx.fill();
    void prog;
  }

  // ── UNDERGROUND SECTION (neighbourhood left) ──────────────────────────────
  function drawUnderground(ctx: CanvasRenderingContext2D, neighW: number, ugTop: number, sewPipeY: number, _t: number) {
    const g = ctx.createLinearGradient(0,ugTop,0,sewPipeY);
    g.addColorStop(0,"#09130e"); g.addColorStop(0.4,"#070e0a"); g.addColorStop(1,"#050b07");
    ctx.fillStyle=g; ctx.fillRect(0,ugTop,neighW,sewPipeY-ugTop);
    [0.18,0.45,0.72].forEach(f => {
      ctx.strokeStyle="rgba(28,14,5,0.35)"; ctx.lineWidth=0.5; ctx.setLineDash([5,9]);
      ctx.beginPath(); ctx.moveTo(0,ugTop+(sewPipeY-ugTop)*f); ctx.lineTo(neighW,ugTop+(sewPipeY-ugTop)*f); ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  // ── BASIN LANDSCAPE (earth berms) ─────────────────────────────────────────
  function drawBasinLandscape(ctx: CanvasRenderingContext2D, basinX: number, basinRX: number, basinBW: number, berm: number, basinTopY: number, basinFloorY: number, basinDepth: number, _t: number) {
    // Fill basin interior dark earth
    const g = ctx.createLinearGradient(0,basinTopY,0,basinFloorY);
    g.addColorStop(0,"#0e2018"); g.addColorStop(0.5,"#0a1810"); g.addColorStop(1,"#060e09");
    ctx.fillStyle=g; ctx.fillRect(basinX,basinTopY,basinBW,basinDepth+16);

    // Left berm (sloped)
    const eg1=ctx.createLinearGradient(basinX,basinTopY,basinX+berm,basinFloorY);
    eg1.addColorStop(0,"#1e3818"); eg1.addColorStop(0.5,"#162c12"); eg1.addColorStop(1,"#0e1e0a");
    ctx.fillStyle=eg1; ctx.beginPath();
    ctx.moveTo(basinX,basinTopY); ctx.lineTo(basinX+berm,basinFloorY); ctx.lineTo(basinX,basinFloorY); ctx.closePath(); ctx.fill();

    // Right berm (sloped)
    const eg2=ctx.createLinearGradient(basinRX-berm,basinFloorY,basinRX,basinTopY);
    eg2.addColorStop(0,"#0e1e0a"); eg2.addColorStop(0.5,"#162c12"); eg2.addColorStop(1,"#1a3014");
    ctx.fillStyle=eg2; ctx.beginPath();
    ctx.moveTo(basinRX,basinTopY); ctx.lineTo(basinRX-berm,basinFloorY); ctx.lineTo(basinRX,basinFloorY); ctx.closePath(); ctx.fill();

    // Basin floor
    ctx.fillStyle="#0c1a0a"; ctx.fillRect(basinX+berm,basinFloorY-4,basinBW-berm*2,8);

    // Green rim
    ctx.strokeStyle="rgba(0,180,80,0.60)"; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(basinX,basinTopY); ctx.lineTo(basinRX,basinTopY); ctx.stroke();

    // Interior contour lines
    ctx.strokeStyle="rgba(0,160,80,0.12)"; ctx.lineWidth=1;
    for (let d=0;d<3;d++) {
      const frac=(d+1)*0.28;
      ctx.beginPath();
      ctx.moveTo(basinX+berm*frac,basinTopY+basinDepth*frac*0.75);
      ctx.lineTo(basinRX-berm*frac,basinTopY+basinDepth*frac*0.75);
      ctx.stroke();
    }
    void _t;
  }

  // ── BASIN WATER FILL ──────────────────────────────────────────────────────
  function drawBasinWater(ctx: CanvasRenderingContext2D, basinX: number, basinRX: number, berm: number, basinTopY: number, basinFloorY: number, waterSurfaceY: number, waterH: number, fillFrac: number, inletX: number, inletY: number, valveAmt: number, t: number) {
    if (fillFrac < 0.012) return;

    const depth = basinFloorY - basinTopY;
    const wdf   = waterH / depth;
    const surfW = (basinRX-basinX-berm*2) + berm*2*wdf;
    const surfL = basinX + berm*(1-wdf);
    const surfR = surfL + surfW;

    ctx.save();
    // Clip to trapezoid
    ctx.beginPath();
    ctx.moveTo(basinX,basinTopY); ctx.lineTo(basinRX,basinTopY);
    ctx.lineTo(basinRX-berm,basinFloorY); ctx.lineTo(basinX+berm,basinFloorY);
    ctx.closePath(); ctx.clip();

    // Wet-earth darkening on submerged slopes
    if (wdf>0.04) {
      const wl=ctx.createLinearGradient(surfL,waterSurfaceY,surfL+berm*wdf+8,waterSurfaceY);
      wl.addColorStop(0,`rgba(4,30,14,${wdf*0.50})`); wl.addColorStop(1,"rgba(4,30,14,0)");
      ctx.fillStyle=wl; ctx.beginPath();
      ctx.moveTo(basinX,waterSurfaceY); ctx.lineTo(surfL,waterSurfaceY);
      ctx.lineTo(basinX+berm,basinFloorY); ctx.lineTo(basinX,basinFloorY); ctx.closePath(); ctx.fill();
      const wr=ctx.createLinearGradient(surfR,waterSurfaceY,surfR-berm*wdf-8,waterSurfaceY);
      wr.addColorStop(0,`rgba(4,30,14,${wdf*0.50})`); wr.addColorStop(1,"rgba(4,30,14,0)");
      ctx.fillStyle=wr; ctx.beginPath();
      ctx.moveTo(basinRX,waterSurfaceY); ctx.lineTo(surfR,waterSurfaceY);
      ctx.lineTo(basinRX-berm,basinFloorY); ctx.lineTo(basinRX,basinFloorY); ctx.closePath(); ctx.fill();
    }

    // Build wavy surface path
    const pts: [number,number][] = [];
    for (let x=Math.floor(surfL);x<=Math.ceil(surfR);x+=3) {
      const frac=(x-surfL)/surfW;
      const wave = Math.sin(frac*Math.PI*4+t*0.08)*2.2
                 + Math.sin(frac*Math.PI*9+t*0.19+1.2)*0.9
                 + Math.sin(frac*Math.PI*2+t*0.04)*1.4;
      pts.push([x, waterSurfaceY+wave]);
    }

    // Main water body
    ctx.beginPath();
    pts.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y));
    ctx.lineTo(basinRX-berm,basinFloorY); ctx.lineTo(basinX+berm,basinFloorY); ctx.closePath();
    const wg=ctx.createLinearGradient(0,waterSurfaceY,0,basinFloorY);
    wg.addColorStop(0,"rgba(0,170,255,0.06)"); wg.addColorStop(0.10,"rgba(0,148,235,0.38)");
    wg.addColorStop(0.38,"rgba(0,118,210,0.58)"); wg.addColorStop(0.72,"rgba(0,88,180,0.72)");
    wg.addColorStop(1,"rgba(0,58,145,0.88)");
    ctx.fillStyle=wg; ctx.fill();

    // Surface glow + crisp line
    ctx.beginPath(); pts.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y));
    ctx.strokeStyle=`rgba(60,210,255,${0.10+Math.sin(t*0.07)*0.05})`; ctx.lineWidth=6; ctx.stroke();
    ctx.beginPath(); pts.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y));
    ctx.strokeStyle=`rgba(120,230,255,${0.42+Math.sin(t*0.09)*0.12})`; ctx.lineWidth=1.4; ctx.stroke();

    // Caustic shimmer patches
    if (waterH>12) {
      for (let i=0;i<5;i++) {
        const cx2=surfL+surfW*(0.10+i*0.18);
        const cy2=waterSurfaceY+5+Math.sin(t*0.11+i*1.3)*3;
        const cr=10+Math.sin(t*0.07+i)*4;
        const cg=ctx.createRadialGradient(cx2,cy2,0,cx2,cy2,cr);
        cg.addColorStop(0,`rgba(100,220,255,${(0.05+Math.sin(t*0.13+i)*0.02)*fillFrac})`);
        cg.addColorStop(1,"rgba(100,220,255,0)");
        ctx.fillStyle=cg; ctx.beginPath(); ctx.ellipse(cx2,cy2,cr,cr*0.4,0,0,Math.PI*2); ctx.fill();
      }
    }

    // Bubbles near inlet
    if (fillFrac>0.06) {
      for (let i=0;i<7;i++) {
        const bp=((t*0.013+i*0.145)%1);
        const bx2=surfL+surfW*(0.04+(i*0.12)%0.30);
        const by2=basinFloorY-6-bp*(waterH-10);
        const ba=bp<0.75 ? bp*(1-bp/0.75)*1.8*0.40 : 0;
        if (ba<0.01) continue;
        ctx.fillStyle=`rgba(160,235,255,${ba})`;
        ctx.beginPath(); ctx.arc(bx2,by2,1.4+(i%3)*0.5,0,Math.PI*2); ctx.fill();
      }
    }

    // Inlet splash ripples (where diversion pipe drops in)
    if (fillFrac>0.04 && valveAmt>0.05) {
      const sX=inletX+4, sY=waterSurfaceY+2;
      for (let r=1;r<=3;r++) {
        const rp=((t*0.055+r*0.33)%1);
        const rr=rp*20;
        const ra=(1-rp)*0.30*valveAmt;
        ctx.strokeStyle=`rgba(100,220,255,${ra})`; ctx.lineWidth=1;
        ctx.beginPath(); ctx.ellipse(sX,sY,rr,rr*0.30,0,0,Math.PI*2); ctx.stroke();
      }
      for (let i=0;i<4;i++) {
        const dp=((t*0.08+i*0.25)%1);
        const sx2=sX+Math.sin(i*1.7)*6;
        const sy2=sY-dp*6+dp*dp*11;
        ctx.fillStyle=`rgba(140,220,255,${(1-dp)*0.55*valveAmt})`;
        ctx.beginPath(); ctx.arc(sx2,sy2,1.5,0,Math.PI*2); ctx.fill();
      }
    }

    ctx.restore();

    // Volume label above surface
    if (fillFrac>0.05) {
      const midX=(basinX+basinRX)/2;
      const lY=Math.max(waterSurfaceY-8,basinTopY+22);
      const la=Math.min(fillFrac*2.5,0.92);
      ctx.fillStyle=`rgba(185,235,255,${la})`; ctx.font="bold 12px JetBrains Mono, monospace"; ctx.textAlign="center";
      ctx.fillText(`${Math.round(fillFrac*88)}%`,midX,lY);
      ctx.fillStyle=`rgba(140,200,240,${la*0.80})`; ctx.font="7px JetBrains Mono, monospace";
      ctx.fillText("CAPACITY",midX,lY+13);
      ctx.textAlign="left";
    }
    void inletY;
  }

  // ── BASIN VEGETATION (banks) ──────────────────────────────────────────────
  function drawBasinVegetation(ctx: CanvasRenderingContext2D, basinX: number, basinRX: number, berm: number, basinTopY: number, t: number, fillFrac: number) {
    // Rim grass full width
    const cnt=Math.floor((basinRX-basinX)/11);
    for (let i=0;i<cnt;i++) {
      const gx=basinX+(i+0.5)*((basinRX-basinX)/cnt);
      const gh=5+(i%3)*2.5;
      const sw=Math.sin(t*0.04+i*0.8)*1.8;
      const hue=105+(i%5)*8;
      ctx.strokeStyle=`hsla(${hue},72%,30%,0.78)`; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(gx,basinTopY); ctx.quadraticCurveTo(gx+sw,basinTopY-gh*0.5,gx+sw*1.5,basinTopY-gh); ctx.stroke();
      ctx.fillStyle=`hsla(${hue},75%,35%,0.78)`;
      ctx.beginPath(); ctx.ellipse(gx+sw*1.5,basinTopY-gh,2.2,1.0,sw*0.2,0,Math.PI*2); ctx.fill();
    }
    // Left bank plants (above water)
    for (let i=0;i<6;i++) {
      const f=(i+0.5)/6;
      const gx=basinX+berm*f*0.8;
      const gy=basinTopY+(basinTopY)*f*0.5; // rough position on slope
      if (gy < basinTopY - fillFrac*50) continue;
      const sw=Math.sin(t*0.04+i*1.1)*1.4;
      ctx.strokeStyle=`rgba(0,155,60,${0.68-f*0.20})`; ctx.lineWidth=1.0;
      ctx.beginPath(); ctx.moveTo(gx,gy); ctx.lineTo(gx+sw,gy-5); ctx.stroke();
    }
    void fillFrac;
  }

  // ── DRAIN SHAFT (vertical from street to sewer) ───────────────────────────
  function drawDrainShaft(ctx: CanvasRenderingContext2D, drainX: number, ugTop: number, sceneBot: number, swkH: number, sensorY: number, valveY: number, sewPipeY: number, sewUtil: number, stressed: boolean, valveAmt: number, t: number, prog: number) {
    const shaftTop = sceneBot + swkH;
    const shaftBot = sewPipeY + 2;

    // Shaft body — only draw the BYPASS section below valve (flow going to sewer)
    // Full shaft from ugTop to valve
    ctx.fillStyle="#0d1c28"; ctx.fillRect(drainX-7, shaftTop, 14, valveY-shaftTop);
    ctx.strokeStyle="rgba(0,180,220,0.18)"; ctx.lineWidth=1;
    ctx.strokeRect(drainX-7, shaftTop, 14, valveY-shaftTop);

    // Below valve: bypass to sewer — fades as valve diverts more
    const bypassA=Math.max(1-valveAmt*1.3, 0);
    if (bypassA>0.02) {
      ctx.fillStyle=`rgba(10,22,36,${bypassA*0.92})`; ctx.fillRect(drainX-7,valveY,14,shaftBot-valveY);
      ctx.strokeStyle=`rgba(0,160,210,${bypassA*0.20})`; ctx.lineWidth=1;
      ctx.strokeRect(drainX-7,valveY,14,shaftBot-valveY);
      // Drops falling to sewer
      if (prog>0.05) {
        for (let i=0;i<3;i++) {
          const dp=((t*0.026+i*0.33)%1);
          const dy=valveY+dp*(shaftBot-valveY);
          ctx.fillStyle=`rgba(${stressed?"200,60,60":"30,155,240"},${bypassA*0.72*(1-dp*0.3)})`;
          ctx.beginPath(); ctx.arc(drainX,dy,2.4,0,Math.PI*2); ctx.fill();
        }
      }
    }

    // Animated drops in upper shaft (rain entering drain)
    if (prog>0.04) {
      for (let i=0;i<4;i++) {
        const dp=((t*0.028+i*0.25)%1);
        const dy=shaftTop+dp*(sensorY-shaftTop+10);
        ctx.fillStyle=`rgba(30,160,240,${Math.min(prog*2.5,0.82)*(1-dp*0.3)})`;
        ctx.beginPath(); ctx.arc(drainX,dy,2.8,0,Math.PI*2); ctx.fill();
      }
    }
    void sewUtil;
  }

  // ── SENSOR NODE ───────────────────────────────────────────────────────────
  function drawSensorNode(ctx: CanvasRenderingContext2D, drainX: number, sensorY: number, stressed: boolean, valveAmt: number, prog: number, t: number) {
    if (prog<0.06) return;
    const pulse=0.70+Math.sin(t*(stressed?0.22:0.07))*0.30;
    const col=stressed ? `rgba(239,68,68,${pulse*0.9})` : valveAmt>0.4 ? `rgba(0,220,140,${0.6+pulse*0.3})` : `rgba(0,200,240,${0.6+pulse*0.3})`;
    const ringCol=stressed?"rgba(255,120,80,0.85)":valveAmt>0.4?"rgba(0,230,150,0.72)":"rgba(0,230,255,0.72)";

    // Wire
    ctx.strokeStyle=`rgba(0,210,240,${0.28+pulse*0.18})`; ctx.lineWidth=1.5;
    ctx.setLineDash([3,3]); ctx.lineDashOffset=-(t*0.5);
    ctx.beginPath(); ctx.moveTo(drainX,sensorY-8); ctx.lineTo(drainX+22,sensorY-8); ctx.stroke();
    ctx.setLineDash([]);

    // Node body
    ctx.fillStyle=col; ctx.beginPath(); ctx.arc(drainX,sensorY,7,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=ringCol; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(drainX,sensorY,7,0,Math.PI*2); ctx.stroke();
    const ringR=7+pulse*8;
    ctx.strokeStyle=stressed?`rgba(239,68,68,${(1-pulse*0.7)*0.55})`:`rgba(0,220,255,${(1-pulse*0.6)*0.40})`;
    ctx.lineWidth=1; ctx.beginPath(); ctx.arc(drainX,sensorY,ringR,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle="#0a1828"; ctx.beginPath(); ctx.arc(drainX,sensorY,3,0,Math.PI*2); ctx.fill();

    // Sensor data card (to the right)
    if (prog>0.10) {
      const a=Math.min((prog-0.10)*4,1);
      const cardX=drainX+28, cardY=sensorY-24;
      ctx.fillStyle=`rgba(4,14,28,${a*0.92})`;
      ctx.beginPath(); rrPath(ctx,cardX,cardY,102,38,4); ctx.fill();
      ctx.strokeStyle=stressed?`rgba(239,100,68,${a*0.55})`:`rgba(0,200,240,${a*0.40})`; ctx.lineWidth=1;
      ctx.beginPath(); rrPath(ctx,cardX,cardY,102,38,4); ctx.stroke();
      ctx.fillStyle=stressed?`rgba(239,100,68,${a*0.80})`:`rgba(0,210,240,${a*0.78})`;
      ctx.beginPath(); rrPath(ctx,cardX,cardY+4,3,30,1); ctx.fill();
      ctx.fillStyle=`rgba(100,175,200,${a*0.65})`; ctx.font="6px JetBrains Mono, monospace";
      ctx.fillText("FLOW SENSOR",cardX+8,cardY+13);
      ctx.fillStyle=stressed?`rgba(239,100,68,${a*0.90})`:`rgba(0,200,240,${a*0.90})`;
      ctx.font="bold 9px JetBrains Mono, monospace";
      ctx.fillText(stressed?"⚠ OVERLOAD RISK":valveAmt>0.4?"VALVE OPEN":"MONITORING",cardX+8,cardY+27);
    }
  }

  // ── VALVE JUNCTION (the smart diverter) ───────────────────────────────────
  function drawValveJunction(ctx: CanvasRenderingContext2D, drainX: number, valveY: number, stressed: boolean, valveAmt: number, t: number) {
    const isOpen=valveAmt>0.05;
    const vr=10;
    const pulse=0.82+Math.sin(t*(isOpen?0.07:stressed?0.22:0.08))*0.18;
    const col=isOpen?"rgba(0,225,140,1)":stressed?"rgba(239,68,68,1)":"rgba(0,155,255,1)";

    // Outer ring
    ctx.strokeStyle=col.replace("1)",`${pulse*0.75})`); ctx.lineWidth=2.2;
    ctx.beginPath(); ctx.arc(drainX,valveY,vr,0,Math.PI*2); ctx.stroke();
    // Body
    const vg=ctx.createRadialGradient(drainX,valveY,0,drainX,valveY,vr);
    vg.addColorStop(0,isOpen?"rgba(0,90,65,0.80)":stressed?"rgba(90,15,10,0.80)":"rgba(10,40,70,0.80)");
    vg.addColorStop(1,isOpen?"rgba(0,50,40,0.45)":stressed?"rgba(55,10,8,0.45)":"rgba(6,22,50,0.45)");
    ctx.fillStyle=vg; ctx.beginPath(); ctx.arc(drainX,valveY,vr-1,0,Math.PI*2); ctx.fill();
    // Gate disc: 0=vertical(down to sewer), 90°=horizontal(right to basin)
    const angle=valveAmt*Math.PI/2;
    ctx.save(); ctx.translate(drainX,valveY); ctx.rotate(angle);
    ctx.strokeStyle=col.replace("1)",`${pulse*0.90})`); ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(0,-(vr-3)); ctx.lineTo(0,vr-3); ctx.stroke();
    ctx.restore();
    // Pulse ring
    ctx.strokeStyle=col.replace("1)",`${(1-pulse)*0.55})`); ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(drainX,valveY,vr+4+pulse*7,0,Math.PI*2); ctx.stroke();

    ctx.fillStyle=isOpen?`rgba(0,225,140,${pulse*0.85})`:stressed?`rgba(239,100,68,${pulse*0.85})`:`rgba(0,190,240,0.65)`;
    ctx.font="bold 7px JetBrains Mono, monospace"; ctx.textAlign="center";
    ctx.fillText("VALVE",drainX+vr+18,valveY+1);
    ctx.fillText(isOpen?"OPEN":"CLOSED",drainX+vr+18,valveY+11);
    ctx.textAlign="left";
  }

  // ── DIVERSION PIPE (valve → basin inlet) ─────────────────────────────────
  function drawDiversionPipe(ctx: CanvasRenderingContext2D, x1: number, x2: number, pipeY: number, inletX: number, inletY: number, valveAmt: number, t: number) {
    if (valveAmt<0.02) return;
    const a=valveAmt;
    const pH=10;

    // Horizontal run
    ctx.fillStyle=`rgba(10,26,42,${a*0.92})`; ctx.fillRect(x1+10,pipeY-pH/2,x2-x1-10,pH);
    ctx.strokeStyle=`rgba(0,210,150,${a*0.52})`; ctx.lineWidth=1.5;
    ctx.strokeRect(x1+10,pipeY-pH/2,x2-x1-10,pH);

    // Vertical drop from pipe end into basin
    ctx.fillStyle=`rgba(10,26,42,${a*0.90})`; ctx.fillRect(inletX-5,pipeY+pH/2,10,inletY-pipeY-pH/2);
    ctx.strokeStyle=`rgba(0,200,220,${a*0.28})`; ctx.lineWidth=1;
    ctx.strokeRect(inletX-5,pipeY+pH/2,10,inletY-pipeY-pH/2);

    // Glow
    const gg=ctx.createLinearGradient(0,pipeY-5,0,pipeY+pH+5);
    gg.addColorStop(0,"rgba(0,210,150,0)"); gg.addColorStop(0.5,`rgba(0,210,150,${a*0.10})`); gg.addColorStop(1,"rgba(0,210,150,0)");
    ctx.strokeStyle=gg; ctx.lineWidth=7;
    ctx.beginPath(); ctx.moveTo(x1+10,pipeY); ctx.lineTo(x2,pipeY); ctx.stroke();

    // Animated particles flowing right
    const pLen=x2-x1-10;
    for (let i=0;i<5;i++) {
      const ph=((t*0.025+i*0.20)%1);
      ctx.fillStyle=`rgba(0,220,150,${a*0.85})`;
      ctx.beginPath(); ctx.arc(x1+10+ph*pLen,pipeY,2.4,0,Math.PI*2); ctx.fill();
    }
    // Drops down into basin
    const dropLen=inletY-pipeY-pH/2;
    for (let i=0;i<3;i++) {
      const ph=((t*0.030+i*0.33)%1);
      const dy=pipeY+pH/2+ph*dropLen;
      ctx.fillStyle=`rgba(0,215,160,${a*(1-ph*0.35)})`;
      ctx.beginPath(); ctx.arc(inletX,dy,2.2,0,Math.PI*2); ctx.fill();
    }

    // Label
    ctx.fillStyle=`rgba(0,200,140,${a*0.78})`; ctx.font="7px JetBrains Mono, monospace"; ctx.textAlign="center";
    ctx.fillText("DIVERSION PIPE →",(x1+x2)/2,pipeY-pH/2-4);
    ctx.textAlign="left";
  }

  // ── OUTLET CONTROL STRUCTURE ──────────────────────────────────────────────
  function drawOutletStructure(ctx: CanvasRenderingContext2D, outletX: number, outletY: number, basinFloorY: number, sewPipeY: number, releaseAmt: number, fillFrac: number, t: number) {
    const boxW=16,boxH=basinFloorY-outletY+4;
    ctx.fillStyle="#0e2030"; ctx.beginPath(); rrPath(ctx,outletX-boxW/2,outletY,boxW,boxH,3); ctx.fill();
    ctx.strokeStyle=releaseAmt>0.05?"rgba(0,225,140,0.50)":"rgba(0,160,210,0.28)"; ctx.lineWidth=1.5;
    ctx.beginPath(); rrPath(ctx,outletX-boxW/2,outletY,boxW,boxH,3); ctx.stroke();
    const dc=releaseAmt>0.05?"rgba(0,225,140,0.9)":"rgba(0,160,210,0.55)";
    ctx.fillStyle=dc; ctx.beginPath(); ctx.arc(outletX,outletY+6,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=dc; ctx.font="bold 7px JetBrains Mono, monospace"; ctx.textAlign="center";
    ctx.fillText(releaseAmt>0.05?"OUTLET":"OUTLET",outletX,outletY-3);
    ctx.fillText(releaseAmt>0.05?"OPEN":"CLOSED",outletX,outletY-13);
    ctx.textAlign="left";

    if (fillFrac>0.04) {
      const pBot=sewPipeY+3;
      ctx.fillStyle="#0c1c28"; ctx.fillRect(outletX-5,basinFloorY+3,10,pBot-basinFloorY-3);
      ctx.strokeStyle="rgba(0,155,200,0.16)"; ctx.lineWidth=1;
      ctx.strokeRect(outletX-5,basinFloorY+3,10,pBot-basinFloorY-3);
      if (releaseAmt>0.05) {
        for (let i=0;i<3;i++) {
          const dp=((t*0.018+i*0.33)%1);
          const dy=basinFloorY+3+dp*(pBot-basinFloorY-3);
          ctx.fillStyle=`rgba(0,210,150,${releaseAmt*0.80*(1-dp*0.3)})`;
          ctx.beginPath(); ctx.arc(outletX,dy,2.0,0,Math.PI*2); ctx.fill();
        }
        ctx.fillStyle=`rgba(0,200,140,${releaseAmt*0.78})`; ctx.font="7px JetBrains Mono, monospace"; ctx.textAlign="center";
        ctx.fillText("CONTROLLED",(outletX),(basinFloorY+(pBot-basinFloorY)*0.40));
        ctx.fillText("RELEASE",(outletX),(basinFloorY+(pBot-basinFloorY)*0.40+10));
        ctx.textAlign="left";
      }
    }
  }

  // ── SEWER PIPE ────────────────────────────────────────────────────────────
  function drawSewerPipe(ctx: CanvasRenderingContext2D, pL: number, pR: number, sewPipeY: number, sewPipeH: number, sewUtil: number, stressed: boolean, valveAmt: number, t: number, prog: number) {
    const pW=pR-pL, pR2=sewPipeH/2;
    const pg=ctx.createLinearGradient(0,sewPipeY,0,sewPipeY+sewPipeH);
    pg.addColorStop(0,stressed?"#251020":"#0d2035"); pg.addColorStop(0.4,stressed?"#2e1428":"#102840"); pg.addColorStop(1,stressed?"#180a14":"#081828");
    ctx.fillStyle=pg; ctx.beginPath(); rrPath(ctx,pL,sewPipeY,pW,sewPipeH,pR2); ctx.fill();
    const bA=stressed?0.38+Math.sin(t*0.20)*0.22:0.28+Math.sin(t*0.06)*0.07;
    ctx.strokeStyle=stressed?`rgba(239,68,68,${bA})`:`rgba(0,155,255,${bA})`; ctx.lineWidth=2;
    ctx.beginPath(); rrPath(ctx,pL,sewPipeY,pW,sewPipeH,pR2); ctx.stroke();
    if (stressed&&valveAmt<0.4) {
      const gi=(sewUtil-1.0)*1.5*(0.7+Math.sin(t*0.22)*0.3);
      const gG=ctx.createLinearGradient(0,sewPipeY-6,0,sewPipeY+sewPipeH+6);
      gG.addColorStop(0,"rgba(239,68,68,0)"); gG.addColorStop(0.5,`rgba(239,68,68,${gi*0.5})`); gG.addColorStop(1,"rgba(239,68,68,0)");
      ctx.strokeStyle=gG; ctx.lineWidth=10; ctx.beginPath(); rrPath(ctx,pL,sewPipeY,pW,sewPipeH,pR2); ctx.stroke();
    }
    // Water fill
    const wFrac=Math.max(Math.min(sewUtil,1),0.04);
    const wH=sewPipeH*wFrac, wY=sewPipeY+sewPipeH-wH;
    ctx.save(); ctx.beginPath(); rrPath(ctx,pL,sewPipeY,pW,sewPipeH,pR2); ctx.clip();
    const wg=ctx.createLinearGradient(0,wY,0,sewPipeY+sewPipeH);
    if (stressed&&valveAmt<0.4) { wg.addColorStop(0,"rgba(220,50,50,0.18)"); wg.addColorStop(0.3,"rgba(200,40,40,0.50)"); wg.addColorStop(1,"rgba(180,30,30,0.70)"); }
    else { wg.addColorStop(0,"rgba(0,170,255,0.16)"); wg.addColorStop(0.3,"rgba(0,150,240,0.50)"); wg.addColorStop(1,"rgba(0,120,210,0.68)"); }
    ctx.fillStyle=wg; ctx.fillRect(pL,wY,pW,wH);
    ctx.strokeStyle=stressed&&valveAmt<0.4?"rgba(255,120,120,0.28)":"rgba(100,215,255,0.26)"; ctx.lineWidth=1;
    ctx.beginPath();
    for (let x=pL;x<=pR;x+=2) { const ry=wY+Math.sin((x/28)+t*0.12)*1.1; x===pL?ctx.moveTo(x,ry):ctx.lineTo(x,ry); }
    ctx.stroke(); ctx.restore();
    // Without-basin ghost line
    if (prog>0.14) {
      const ga=Math.min((prog-0.14)*3,0.48);
      const gY=sewPipeY+sewPipeH*0.04;
      ctx.save(); ctx.strokeStyle=`rgba(239,68,68,${ga})`; ctx.lineWidth=1.5; ctx.setLineDash([7,4]);
      ctx.beginPath(); ctx.moveTo(pL+6,gY); ctx.lineTo(pR-6,gY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle=`rgba(239,68,68,${ga*0.80})`; ctx.font="bold 7px JetBrains Mono, monospace"; ctx.textAlign="right";
      ctx.fillText("WITHOUT BASIN (~115% — OVERFLOW)",pR-8,gY-3); ctx.textAlign="left"; ctx.restore();
    }
    ctx.fillStyle=stressed&&valveAmt<0.4?`rgba(239,100,68,${0.80+Math.sin(t*0.18)*0.18})`:"rgba(0,215,130,0.82)";
    ctx.font="bold 9px JetBrains Mono, monospace";
    ctx.fillText(`SEWER PIPE — ${Math.round(sewUtil*100)}% CAPACITY  ${stressed&&valveAmt<0.4?"⚠ OVERLOADED":"✓ NORMAL"}`,pL+pW*0.06,sewPipeY+sewPipeH+13);
  }

  // ── PARTICLES ─────────────────────────────────────────────────────────────
  function drawParticles(ctx: CanvasRenderingContext2D, ref: React.MutableRefObject<Particle[]>, drainX: number, ugTop: number, sensorY: number, valveY: number, x1: number, x2: number, pipeY: number, inletX: number, inletY: number, basinFloorY: number, outletX: number, sewPipeY: number, sewPipeH: number, valveAmt: number, releaseAmt: number, fillFrac: number, _stressed: boolean, t: number) {
    // Diversion flow particles
    if (valveAmt>0.08 && Math.random()<valveAmt*0.20) {
      ref.current.push({ x:x1+12,y:pipeY+(Math.random()-0.5)*4,vx:2.2+valveAmt*1.5,vy:0,life:0,maxLife:Math.floor((x2-x1)/3.5),r:2.0,col:"rgba(0,215,150,{A})" });
    }
    // Release drain
    if (releaseAmt>0.08&&fillFrac>0.04&&Math.random()<releaseAmt*0.16) {
      ref.current.push({ x:outletX+(Math.random()-0.5)*3,y:basinFloorY+4,vx:0,vy:1.6+Math.random(),life:0,maxLife:Math.floor((sewPipeY-basinFloorY)/1.8),r:1.8,col:"rgba(0,200,160,{A})" });
    }
    ref.current=ref.current.filter(p=>{
      p.x+=p.vx; p.y+=p.vy; p.life++;
      if (p.x>x2+12) return false;
      if (p.y>sewPipeY+sewPipeH) return false;
      if (p.life>p.maxLife) return false;
      const a=(1-p.life/p.maxLife)*0.72;
      ctx.fillStyle=p.col.replace("{A}",String(a));
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      return true;
    });
    void drainX; void ugTop; void sensorY; void valveY; void inletX; void inletY; void t;
  }

  // ── LABELS & HUD ──────────────────────────────────────────────────────────
  function drawLabels(ctx: CanvasRenderingContext2D, W: number, H: number, roadTop: number, basinX: number, basinRX: number, berm: number, basinTopY: number, basinFloorY: number, waterSurfaceY: number, fillFrac: number, inletX: number, inletY: number, drainX: number, sensorY: number, valveY: number, divPipeY: number, sewPipeY: number, sewPipeH: number, valveAmt: number, releasing: boolean, releaseAmt: number, stressed: boolean, storagePct: number, divertedGPM: number, floodRedPct: number, overflowAvoided: number, step: number, prog: number, t: number) {
    const mono="JetBrains Mono, monospace";
    const pulse=0.88+Math.sin(t*0.10)*0.12;

    // Title
    ctx.fillStyle="rgba(0,215,180,0.92)"; ctx.font=`bold 9px ${mono}`; ctx.textAlign="right";
    ctx.fillText("RETENTION BASIN — SENSOR-TRIGGERED VALVE DIVERTS PEAK FLOW TO OPEN POND",W-12,18);
    ctx.textAlign="left";

    // Neighbourhood label
    ctx.fillStyle="rgba(130,160,185,0.58)"; ctx.font=`bold 8px ${mono}`; ctx.textAlign="center";
    ctx.fillText("NEIGHBOURHOOD",Math.floor(W*0.26),roadTop+10);
    ctx.textAlign="left";

    // Basin header
    const baseMidX=(basinX+basinRX)/2;
    ctx.fillStyle=`rgba(0,200,160,${valveAmt>0.05?0.88:0.45})`; ctx.font=`bold 10px ${mono}`; ctx.textAlign="center";
    ctx.fillText("RETENTION BASIN",baseMidX,basinTopY-7);
    ctx.fillStyle=`rgba(0,175,140,${valveAmt>0.05?0.68:0.32})`; ctx.font=`8px ${mono}`;
    ctx.fillText("45,000 gal capacity",baseMidX,basinTopY-18);
    ctx.textAlign="left";

    // Basin status
    const basinStatus=releasing?"CONTROLLED RELEASE — MANAGED OUTFLOW TO SEWER":fillFrac>0.04?"FILLING — PEAK FLOW DIVERTED FROM SEWER":"STANDBY — SENSOR WATCHING PIPE LOAD";
    ctx.fillStyle=releasing?"rgba(0,225,140,0.82)":fillFrac>0.04?"rgba(0,200,220,0.82)":"rgba(70,120,140,0.55)";
    ctx.font=`bold 8px ${mono}`; ctx.textAlign="center";
    ctx.fillText(basinStatus,baseMidX,basinFloorY+16);
    ctx.textAlign="left";

    // Water level arrow
    if (fillFrac>0.08) {
      const arrA=Math.min(fillFrac*3,0.90);
      ctx.strokeStyle=`rgba(0,200,240,${arrA})`; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(basinX-8,waterSurfaceY); ctx.lineTo(basinX+berm+4,waterSurfaceY); ctx.stroke();
      ctx.fillStyle=`rgba(0,200,240,${arrA})`; ctx.font=`bold 7px ${mono}`; ctx.textAlign="right";
      ctx.fillText("WATER LEVEL",basinX-10,waterSurfaceY+4);
      ctx.textAlign="left";
    }

    // Gauge (right of basin)
    if (fillFrac>0.04) {
      const gX=basinRX+14,gY=basinTopY,gW=7,gH=basinFloorY-basinTopY;
      ctx.fillStyle="rgba(0,120,180,0.18)"; ctx.beginPath(); rrPath(ctx,gX,gY,gW,gH,3); ctx.fill();
      ctx.strokeStyle="rgba(0,175,220,0.28)"; ctx.lineWidth=1; ctx.beginPath(); rrPath(ctx,gX,gY,gW,gH,3); ctx.stroke();
      const gfH=gH*fillFrac;
      if (gfH>3) {
        ctx.save(); ctx.beginPath(); rrPath(ctx,gX,gY,gW,gH,3); ctx.clip();
        const fg=ctx.createLinearGradient(0,gY+gH-gfH,0,gY+gH);
        fg.addColorStop(0,"rgba(0,200,255,0.28)"); fg.addColorStop(0.4,"rgba(0,160,240,0.55)"); fg.addColorStop(1,"rgba(0,120,210,0.80)");
        ctx.fillStyle=fg; ctx.fillRect(gX,gY+gH-gfH,gW,gfH); ctx.restore();
      }
      [0,0.25,0.50,0.75,1].forEach(f=>{
        ctx.strokeStyle="rgba(0,175,220,0.25)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(gX+gW,gY+gH*(1-f)); ctx.lineTo(gX+gW+4,gY+gH*(1-f)); ctx.stroke();
      });
      ctx.fillStyle="rgba(0,195,240,0.72)"; ctx.font=`7px ${mono}`; ctx.fillText("LEVEL",gX,gY-3);
    }

    // Key insight
    if (prog>0.45) {
      const kmA=Math.min((prog-0.45)*2.5,1);
      const kmW=Math.min(W*0.44,330);
      const kmX=W/2-kmW/2, kmY=H-52;
      ctx.fillStyle=`rgba(4,14,28,${kmA*0.88})`;
      ctx.beginPath(); rrPath(ctx,kmX,kmY,kmW,40,5); ctx.fill();
      ctx.strokeStyle=`rgba(0,210,160,${kmA*0.28})`; ctx.lineWidth=1;
      ctx.beginPath(); rrPath(ctx,kmX,kmY,kmW,40,5); ctx.stroke();
      ctx.fillStyle=`rgba(0,215,155,${kmA*0.88})`; ctx.font=`bold 8px ${mono}`; ctx.textAlign="center";
      ctx.fillText("KEY INSIGHT",W/2,kmY+13);
      ctx.fillStyle=`rgba(160,210,230,${kmA*0.82})`; ctx.font=`7px ${mono}`;
      ctx.fillText("The sensor detects imminent pipe overload and opens the valve before overflow occurs.",W/2,kmY+26);
      ctx.fillText("Peak runoff fills the open basin, which drains slowly over 12–24 hours.",W/2,kmY+37);
      ctx.textAlign="left";
    }

    // ── Metrics panel ──
    const mx=W-228, my=26;
    ctx.fillStyle="rgba(4,14,28,0.92)"; ctx.beginPath(); rrPath(ctx,mx,my,220,116,5); ctx.fill();
    ctx.strokeStyle="rgba(0,200,160,0.22)"; ctx.lineWidth=1; ctx.beginPath(); rrPath(ctx,mx,my,220,116,5); ctx.stroke();
    ctx.fillStyle="rgba(140,220,210,0.82)"; ctx.font=`bold 8px ${mono}`; ctx.fillText("RETENTION BASIN",mx+10,my+13);
    const isNormal=valveAmt>0.70;
    const capPct=Math.round(Math.min(storagePct,100));
    [
      { label:"BASIN FILL LEVEL",   val:`${capPct}%`,                                           bar:capPct/100,        col:"rgba(0,195,240,0.92)" },
      { label:"DIVERTED (65%)",    val:divertedGPM>0?`${divertedGPM.toLocaleString()} gal/min`:"—", bar:divertedGPM/6400,  col:"rgba(0,215,155,0.90)" },
      { label:"FLOOD REDUCTION",   val:`${floodRedPct}%`,                                      bar:floodRedPct/76,    col:isNormal?"rgba(0,225,140,0.92)":"rgba(0,190,220,0.88)" },
      { label:"OVERFLOW AVOIDED",  val:overflowAvoided>0?`${overflowAvoided.toLocaleString()} gal/min`:"—", bar:overflowAvoided/5100, col:"rgba(0,215,155,0.90)" },
      { label:"SEWER CAPACITY",    val:isNormal?"61% — SAFE":stressed?"115% ⚠":"RISING",      bar:isNormal?0.61:stressed?1.0:0.60, col:isNormal?"rgba(0,225,140,0.92)":stressed?"rgba(239,130,68,0.95)":"rgba(245,158,11,0.92)" },
    ].forEach((m,i)=>{
      const ry=my+28+i*18;
      ctx.fillStyle="rgba(80,155,175,0.72)"; ctx.font=`7px ${mono}`; ctx.fillText(m.label,mx+10,ry);
      const bW=56,bX=mx+154;
      ctx.fillStyle="rgba(0,175,210,0.10)"; ctx.beginPath(); rrPath(ctx,bX,ry-7,bW,5,2); ctx.fill();
      const bf=Math.max(Math.min(m.bar,1)*bW,m.bar>0?2:0);
      ctx.fillStyle=m.col; ctx.globalAlpha=pulse; ctx.beginPath(); rrPath(ctx,bX,ry-7,bf,5,2); ctx.fill();
      ctx.globalAlpha=1;
      ctx.fillStyle=m.col; ctx.font=`bold 8px ${mono}`; ctx.textAlign="right";
      ctx.fillText(m.val,mx+214,ry); ctx.textAlign="left";
    });

    // ── 8-step panel ──
    const steps=[
      { l:"RAINFALL BEGINS",             c:"rgba(120,195,255,0.85)" },
      { l:"PIPE FILLS — SENSOR ALERT",   c:stressed?`rgba(239,130,68,${0.80+Math.sin(t*0.18)*0.18})`:"rgba(0,220,240,0.82)" },
      { l:"SMART VALVE OPENS",           c:valveAmt>0.10?"rgba(0,225,140,0.92)":"rgba(70,120,140,0.65)" },
      { l:"FLOW DIVERTED TO BASIN",      c:valveAmt>0.30?"rgba(0,210,155,0.90)":"rgba(70,120,140,0.65)" },
      { l:"BASIN FILLS — SEWER SAFE",    c:fillFrac>0.20?"rgba(0,200,130,0.90)":"rgba(70,120,140,0.65)" },
      { l:"FLOOD RISK ELIMINATED",       c:valveAmt>0.65?"rgba(0,225,140,0.92)":"rgba(70,120,140,0.65)" },
      { l:"STORM TAPERS OFF",            c:prog>0.82?"rgba(140,220,200,0.85)":"rgba(70,120,140,0.65)" },
      { l:"CONTROLLED RELEASE BEGINS",   c:releasing?"rgba(0,230,155,0.95)":"rgba(70,120,140,0.65)" },
    ];
    ctx.fillStyle="rgba(4,14,28,0.88)"; ctx.beginPath(); rrPath(ctx,10,22,186,150,5); ctx.fill();
    ctx.strokeStyle="rgba(0,200,160,0.18)"; ctx.lineWidth=1; ctx.beginPath(); rrPath(ctx,10,22,186,150,5); ctx.stroke();
    steps.forEach((s,i)=>{
      const isActive=step===i+1;
      const sy2=38+i*17;
      ctx.fillStyle=isActive?s.c:"rgba(55,95,115,0.65)";
      ctx.font=`${isActive?"bold ":""}8px ${mono}`;
      ctx.fillText(`${i+1}.`,18,sy2);
      ctx.fillText(s.l,30,sy2);
      if (i<steps.length-1) { ctx.fillStyle="rgba(0,200,160,0.28)"; ctx.font="8px sans-serif"; ctx.fillText("↓",50,sy2+6); }
    });

    void H; void roadTop; void berm; void drainX; void sensorY; void valveY; void divPipeY; void sewPipeY; void sewPipeH; void inletX; void inletY; void releaseAmt;
  }

  return (
    <div ref={elRef} style={{ width:"100%", height:"100%", position:"relative" }}>
      <canvas ref={cvRef} style={{ position:"absolute", inset:0, display:"block" }} />
    </div>
  );
}
