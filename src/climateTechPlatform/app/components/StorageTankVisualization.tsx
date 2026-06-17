import { useEffect, useRef, type MutableRefObject } from "react";
import { drawSmartTankFeeder } from "./feederPipe";

interface Props {
  isPlaying: boolean;
  speed: number;
  timelineValue: number;
  source?: "storm-drain" | "smart-tank";
}

type Drop = { x: number; y: number; spd: number; len: number; op: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; col: string };

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

export function StorageTankVisualization({ isPlaying, speed, timelineValue, source = "storm-drain" }: Props) {
  const fromTank = source === "smart-tank";
  const cvRef      = useRef<HTMLCanvasElement>(null);
  const elRef      = useRef<HTMLDivElement>(null);
  const rafRef     = useRef(0);
  const tRef       = useRef(0);
  const rainRef    = useRef<Drop[]>([]);
  const partRef    = useRef<Particle[]>([]);

  useEffect(() => {
    const el = elRef.current, cv = cvRef.current;
    if (!el || !cv) return;
    const ro = new ResizeObserver(() => {
      cv.width = el.clientWidth;
      cv.height = el.clientHeight;
      rainRef.current = [];
      partRef.current = [];
    });
    ro.observe(el);
    cv.width = el.clientWidth;
    cv.height = el.clientHeight;
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    function frame() {
      if (!cv || !ctx) return;
      if (isPlaying) tRef.current += speed;
      render(ctx, cv.width, cv.height, tRef.current, timelineValue / 100);
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, speed, timelineValue, source]);

  function render(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, prog: number) {
    ctx.clearRect(0, 0, W, H);

    // ── Layout ────────────────────────────────────────────────────────────
    // sky/scene:    0 → sceneBot   (~48% of H)
    // underground:  sceneBot → H
    const sceneBot   = Math.floor(H * 0.48);
    const roadH      = Math.floor(H * 0.10);
    const roadTop    = sceneBot - roadH;
    const sidewalkH  = 8;
    const ugTop      = sceneBot + sidewalkH;

    // Tank geometry (two tanks, symmetric)
    const tankW      = Math.floor(W * 0.18);
    const tankH      = Math.floor((H - ugTop) * 0.52);
    const tankY      = ugTop + Math.floor((H - ugTop) * 0.14);
    const tank1X     = Math.floor(W * 0.18);
    const tank2X     = Math.floor(W * 0.62);

    // Drain inlets above tanks
    const inlet1X    = tank1X + tankW / 2;
    const inlet2X    = tank2X + tankW / 2;

    // Sewer pipe below tanks
    const pipeH      = Math.max(Math.floor((H - ugTop) * 0.18), 22);
    const pipeY      = H - pipeH - 10;
    const pipeLeft   = W * 0.05;
    const pipeRight  = W * 0.95;

    // Filling: rises 0→1 over first 70% of prog, drains 1→0.2 over last 30%
    const fillFrac = prog < 0.7
      ? Math.min(prog / 0.7, 1)
      : 1 - (prog - 0.7) / 0.3 * 0.8;
    const maxCapGal = 45000;
    const storedGal = Math.round(fillFrac * maxCapGal);
    const sewerLoadRed = Math.round(fillFrac * 72);
    const overflowPrev = Math.round(fillFrac * 18500);

    drawSky(ctx, W, roadTop, t);
    drawBuildings(ctx, W, roadTop, t);
    drawRain(ctx, W, roadTop, t);
    drawStreet(ctx, W, roadTop, roadH, sceneBot, sidewalkH, inlet1X, inlet2X, t, prog);
    if (!fromTank) drawSurfaceRunoff(ctx, W, roadTop, roadH, sceneBot, inlet1X, inlet2X, t, prog);
    drawUnderground(ctx, W, ugTop, H);
    drawCollectionPipes(ctx, W, ugTop, sceneBot, sidewalkH, inlet1X, inlet2X, tank1X, tank2X, tankW, tankY, t, prog);
    drawTanks(ctx, W, tank1X, tank2X, tankW, tankH, tankY, fillFrac, t, prog);
    drawReleasePipes(ctx, W, tank1X, tank2X, tankW, tankH, tankY, pipeY, pipeH, fillFrac, t);
    if (fromTank) {
      const c1 = tank1X + tankW / 2, c2 = tank2X + tankW / 2;
      drawSmartTankFeeder(ctx, [{ x: 2, y: tankY - 22 }, { x: c1, y: tankY - 22 }, { x: c1, y: tankY }], t, fillFrac, { label: "⟶ EXCESS FROM SMART TANK" });
      drawSmartTankFeeder(ctx, [{ x: c1, y: tankY - 22 }, { x: c2, y: tankY - 22 }, { x: c2, y: tankY }], t, fillFrac);
    }
    if (!fromTank) drawSewerPipe(ctx, W, pipeLeft, pipeRight, pipeY, pipeH, fillFrac, t, prog);
    spawnAndDrawParticles(ctx, partRef, t, prog, W, sceneBot, ugTop, inlet1X, inlet2X, tank1X, tank2X, tankW, tankY, tankH);
    drawLabels(ctx, W, H, roadTop, sceneBot, ugTop, tank1X, tank2X, tankW, tankY, tankH, pipeY, pipeH, fillFrac, storedGal, sewerLoadRed, overflowPrev, prog, t);
  }

  // ── SKY ─────────────────────────────────────────────────────────────────
  function drawSky(ctx: CanvasRenderingContext2D, W: number, skyBot: number, t: number) {
    const g = ctx.createLinearGradient(0, 0, 0, skyBot);
    g.addColorStop(0, "#060e1e"); g.addColorStop(1, "#0d1e2c");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, skyBot);
    [{ bx: W*0.08,y:16,r:55 },{ bx:W*0.33,y:10,r:70 },{ bx:W*0.62,y:20,r:58 },{ bx:W*0.86,y:13,r:46 }].forEach(c => {
      const cx = (c.bx + t * 0.018) % (W + 120) - 60;
      const gr = ctx.createRadialGradient(cx, c.y, 0, cx, c.y, c.r);
      gr.addColorStop(0, "rgba(8,20,40,0.96)"); gr.addColorStop(0.7, "rgba(5,14,28,0.72)"); gr.addColorStop(1, "rgba(2,8,16,0)");
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.ellipse(cx, c.y, c.r*1.8, c.r*0.65, 0, 0, Math.PI*2); ctx.fill();
    });
  }

  // ── BUILDINGS ────────────────────────────────────────────────────────────
  function drawBuildings(ctx: CanvasRenderingContext2D, W: number, roadTop: number, t: number) {
    [
      {x:W*0.02,w:50,h:90},{x:W*0.12,w:38,h:68},
      {x:W*0.66,w:54,h:102},{x:W*0.76,w:34,h:64},{x:W*0.87,w:44,h:82},
    ].forEach(b => {
      const by = roadTop - b.h;
      const bg = ctx.createLinearGradient(b.x, by, b.x+b.w, by);
      bg.addColorStop(0, "#0a1828"); bg.addColorStop(0.5, "#0d2035"); bg.addColorStop(1, "#071520");
      ctx.fillStyle = bg; ctx.fillRect(b.x, by, b.w, b.h);
      [0.22,0.50,0.72].forEach(yf => {
        ctx.fillStyle = Math.sin(t*0.018+b.x*0.01)>0.86 ? "rgba(0,212,216,0.5)" : "rgba(255,215,85,0.22)";
        ctx.fillRect(b.x+6, by+b.h*yf, 8, 6);
        ctx.fillStyle = "rgba(255,215,85,0.18)"; ctx.fillRect(b.x+b.w-14, by+b.h*yf, 8, 6);
      });
      ctx.strokeStyle = "rgba(0,212,216,0.06)"; ctx.lineWidth = 1;
      ctx.strokeRect(b.x, by, b.w, b.h);
    });
  }

  // ── RAIN ─────────────────────────────────────────────────────────────────
  function drawRain(ctx: CanvasRenderingContext2D, W: number, maxY: number, _t: number) {
    if (rainRef.current.length === 0) {
      for (let i = 0; i < 150; i++)
        rainRef.current.push({ x: Math.random()*W, y: Math.random()*maxY, spd: 7+Math.random()*6, len: 10+Math.random()*13, op: 0.28+Math.random()*0.5 });
    }
    rainRef.current.forEach(d => {
      d.y += d.spd;
      if (d.y > maxY+20) { d.y = -20; d.x = Math.random()*W; }
      ctx.strokeStyle = `rgba(100,180,255,${d.op})`; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x-1.5, d.y+d.len); ctx.stroke();
    });
  }

  // ── STREET ───────────────────────────────────────────────────────────────
  function drawStreet(
    ctx: CanvasRenderingContext2D, W: number,
    roadTop: number, roadH: number, sceneBot: number, sidewalkH: number,
    inlet1X: number, inlet2X: number, t: number, _prog: number
  ) {
    // Road surface
    const rg = ctx.createLinearGradient(0, roadTop, 0, sceneBot);
    rg.addColorStop(0, "#111820"); rg.addColorStop(1, "#0d1520");
    ctx.fillStyle = rg; ctx.fillRect(0, roadTop, W, roadH);

    // Centre line
    ctx.strokeStyle = "rgba(255,200,0,0.20)"; ctx.lineWidth = 1.2;
    ctx.setLineDash([18,14]);
    ctx.beginPath(); ctx.moveTo(0, roadTop+roadH/2); ctx.lineTo(W, roadTop+roadH/2); ctx.stroke();
    ctx.setLineDash([]);

    // Parked car
    const carX = W*0.40, carY = roadTop+4;
    ctx.fillStyle = "#0d2035";
    ctx.beginPath(); rrPath(ctx, carX, carY, 44, 15, 2); ctx.fill();
    ctx.fillStyle = "#0a1828";
    ctx.beginPath(); rrPath(ctx, carX+7, carY-10, 28, 11, 2); ctx.fill();
    ctx.fillStyle = "rgba(255,220,100,0.5)";
    ctx.beginPath(); ctx.arc(carX+4, carY+8, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(carX+40, carY+8, 2, 0, Math.PI*2); ctx.fill();

    // Sidewalk
    ctx.fillStyle = "#1a2535"; ctx.fillRect(0, sceneBot, W, sidewalkH);

    // Inlet grates at drain positions
    [inlet1X, inlet2X].forEach(ix => {
      ctx.fillStyle = "#0e1824";
      ctx.fillRect(ix-11, sceneBot-2, 22, sidewalkH+4);
      ctx.strokeStyle = "rgba(0,200,220,0.40)"; ctx.lineWidth = 1;
      ctx.strokeRect(ix-11, sceneBot-2, 22, sidewalkH+4);
      for (let gi=0;gi<4;gi++) {
        ctx.beginPath(); ctx.moveTo(ix-11, sceneBot+1+gi*2.2); ctx.lineTo(ix+11, sceneBot+1+gi*2.2); ctx.stroke();
      }
      // Animated water glint entering grate
      const gA = 0.3+Math.sin(t*0.14+ix)*0.2;
      ctx.fillStyle = `rgba(30,160,240,${gA})`;
      ctx.beginPath(); ctx.arc(ix, sceneBot+2, 3, 0, Math.PI*2); ctx.fill();
    });

    // "INLET" labels
    [inlet1X, inlet2X].forEach(ix => {
      ctx.fillStyle = "rgba(0,200,220,0.45)"; ctx.font = "7px JetBrains Mono, monospace"; ctx.textAlign = "center";
      ctx.fillText("INLET", ix, sceneBot-5);
    });
    ctx.textAlign = "left";
    void t;
  }

  // ── SURFACE RUNOFF (water flowing toward inlets) ─────────────────────────
  function drawSurfaceRunoff(
    ctx: CanvasRenderingContext2D, W: number,
    roadTop: number, roadH: number, sceneBot: number,
    inlet1X: number, inlet2X: number, t: number, prog: number
  ) {
    if (prog < 0.04) return;
    const alpha = Math.min(prog * 1.5, 0.65);

    // Animated dashed flow lines converging on both inlets
    [[W*0.04, inlet1X],[W*0.30, inlet1X],[W*0.52, inlet2X],[W*0.92, inlet2X]].forEach(([startX, endX]) => {
      ctx.save();
      ctx.strokeStyle = `rgba(30,150,230,${alpha})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([7,6]);
      ctx.lineDashOffset = -(t * 0.9);
      ctx.beginPath();
      ctx.moveTo(startX, sceneBot - 3);
      ctx.lineTo(endX + (startX < endX ? -10 : 10), sceneBot - 3);
      ctx.stroke();
      ctx.restore();
    });
    void roadTop; void roadH;
  }

  // ── UNDERGROUND SOIL ─────────────────────────────────────────────────────
  function drawUnderground(ctx: CanvasRenderingContext2D, W: number, ugTop: number, H: number) {
    const g = ctx.createLinearGradient(0, ugTop, 0, H);
    g.addColorStop(0, "#09130e"); g.addColorStop(0.4, "#070e0a"); g.addColorStop(1, "#050b07");
    ctx.fillStyle = g; ctx.fillRect(0, ugTop, W, H-ugTop);
    [0.18,0.38,0.60].forEach(f => {
      ctx.strokeStyle = "rgba(28,14,5,0.40)"; ctx.lineWidth = 0.5; ctx.setLineDash([5,9]);
      ctx.beginPath(); ctx.moveTo(0, ugTop+(H-ugTop)*f); ctx.lineTo(W, ugTop+(H-ugTop)*f); ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  // ── COLLECTION PIPES (inlet → tank) ─────────────────────────────────────
  function drawCollectionPipes(
    ctx: CanvasRenderingContext2D, W: number,
    ugTop: number, sceneBot: number, sidewalkH: number,
    inlet1X: number, inlet2X: number,
    tank1X: number, tank2X: number, tankW: number,
    tankY: number, t: number, prog: number
  ) {
    const shaftTop = sceneBot + sidewalkH;
    const pipeAlpha = Math.min(prog * 2, 0.85);

    // Vertical shaft down from each inlet to horizontal collector pipe
    const collectorY = tankY - 14;
    [
      { ix: inlet1X, tx: tank1X + tankW/2 },
      { ix: inlet2X, tx: tank2X + tankW/2 },
    ].forEach(({ ix, tx }) => {
      // Vertical shaft
      ctx.fillStyle = "#0e1e28";
      ctx.fillRect(ix-5, shaftTop, 10, collectorY - shaftTop);
      ctx.strokeStyle = "rgba(0,180,220,0.18)"; ctx.lineWidth = 1;
      ctx.strokeRect(ix-5, shaftTop, 10, collectorY - shaftTop);

      // Horizontal collector to tank
      const x0 = Math.min(ix, tx), x1 = Math.max(ix, tx);
      ctx.fillStyle = "#0e1e28";
      ctx.fillRect(x0-4, collectorY-4, x1-x0+8, 9);
      ctx.strokeStyle = "rgba(0,180,220,0.18)"; ctx.lineWidth = 1;
      ctx.strokeRect(x0-4, collectorY-4, x1-x0+8, 9);

      // Short vertical drop from collector into tank top
      ctx.fillStyle = "#0e1e28";
      ctx.fillRect(tx-5, collectorY+5, 10, tankY - collectorY - 5);
      ctx.strokeStyle = "rgba(0,180,220,0.18)"; ctx.lineWidth = 1;
      ctx.strokeRect(tx-5, collectorY+5, 10, tankY - collectorY - 5);

      // Animated water in vertical shaft
      const dropA = pipeAlpha;
      for (let i=0;i<3;i++) {
        const dp = ((t*0.025 + i*0.33) % 1);
        const dy = shaftTop + dp*(collectorY - shaftTop);
        ctx.fillStyle = `rgba(30,160,240,${dropA*(1-dp*0.4)})`;
        ctx.beginPath(); ctx.arc(ix, dy, 2.5, 0, Math.PI*2); ctx.fill();
      }

      // Animated water in horizontal pipe
      const hLen = x1 - x0;
      for (let i=0;i<4;i++) {
        const hp = ((t*0.020 + i*0.25) % 1);
        const hx = x0 + hp * hLen;
        const hy = collectorY;
        ctx.fillStyle = `rgba(30,165,245,${pipeAlpha*0.7})`;
        ctx.beginPath(); ctx.arc(hx, hy, 2, 0, Math.PI*2); ctx.fill();
      }

      // Animated drop from collector into tank
      for (let i=0;i<2;i++) {
        const vp = ((t*0.030 + i*0.5) % 1);
        const vy = collectorY + 5 + vp*(tankY - collectorY - 5);
        ctx.fillStyle = `rgba(30,160,240,${dropA*(1-vp*0.3)})`;
        ctx.beginPath(); ctx.arc(tx, vy, 2, 0, Math.PI*2); ctx.fill();
      }
    });

    // Pipe labels
    ctx.fillStyle = "rgba(0,180,220,0.45)"; ctx.font = "7px JetBrains Mono, monospace";
    ctx.fillText("COLLECTION PIPE", Math.min(inlet1X, tank1X+tankW/2)+4, collectorY - 6);
    void W; void ugTop;
  }

  // ── STORAGE TANKS ────────────────────────────────────────────────────────
  function drawTanks(
    ctx: CanvasRenderingContext2D, _W: number,
    tank1X: number, tank2X: number,
    tankW: number, tankH: number, tankY: number,
    fillFrac: number, t: number, prog: number
  ) {
    [tank1X, tank2X].forEach((tx, tidx) => {
      // Tank outer shell — steel look
      const shellG = ctx.createLinearGradient(tx, tankY, tx+tankW, tankY);
      shellG.addColorStop(0, "#0e2030");
      shellG.addColorStop(0.15, "#162a40");
      shellG.addColorStop(0.85, "#112236");
      shellG.addColorStop(1, "#0c1c2c");
      ctx.fillStyle = shellG;
      ctx.beginPath(); rrPath(ctx, tx, tankY, tankW, tankH, 6); ctx.fill();

      // Inner tank wall
      ctx.strokeStyle = "rgba(0,180,220,0.28)"; ctx.lineWidth = 2;
      ctx.beginPath(); rrPath(ctx, tx, tankY, tankW, tankH, 6); ctx.stroke();

      // Water fill — animated rising level
      const waterH = tankH * 0.92 * fillFrac;
      const waterY = tankY + tankH - waterH - 4;
      if (waterH > 3) {
        ctx.save();
        ctx.beginPath(); rrPath(ctx, tx+2, tankY+2, tankW-4, tankH-4, 5); ctx.clip();

        // Water gradient
        const wg = ctx.createLinearGradient(0, waterY, 0, tankY+tankH);
        wg.addColorStop(0, "rgba(0,170,255,0.15)");
        wg.addColorStop(0.2, "rgba(0,150,240,0.45)");
        wg.addColorStop(0.7, "rgba(0,120,210,0.65)");
        wg.addColorStop(1, "rgba(0,100,190,0.80)");
        ctx.fillStyle = wg; ctx.fillRect(tx+2, waterY, tankW-4, waterH);

        // Animated ripple at water surface
        ctx.strokeStyle = `rgba(80,220,255,${0.35+Math.sin(t*0.09+tidx)*0.15})`; ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let x=tx+2; x<=tx+tankW-2; x+=2) {
          const ry = waterY + Math.sin((x/22)+t*0.10+tidx*1.5)*1.3;
          x===tx+2 ? ctx.moveTo(x,ry) : ctx.lineTo(x,ry);
        }
        ctx.stroke();

        // Bubbles rising in tank
        if (prog > 0.06) {
          for (let i=0;i<5;i++) {
            const bphase = ((t*0.015+tidx*0.3+i*0.2) % 1);
            const bx = tx + 10 + ((i*37.3) % (tankW-20));
            const by2 = waterY + waterH*(1-bphase);
            const ba = bphase*(1-bphase)*2*0.6;
            ctx.fillStyle = `rgba(120,220,255,${ba})`;
            ctx.beginPath(); ctx.arc(bx, by2, 1.5, 0, Math.PI*2); ctx.fill();
          }
        }
        ctx.restore();
      }

      // Tank bolts / rivets (structural detail)
      [0.15,0.50,0.85].forEach(f => {
        ctx.fillStyle = "rgba(0,140,180,0.30)";
        ctx.beginPath(); ctx.arc(tx+3, tankY+tankH*f, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(tx+tankW-3, tankY+tankH*f, 2, 0, Math.PI*2); ctx.fill();
      });

      // Capacity % label inside tank
      const capPct = Math.round(fillFrac * 100);
      ctx.fillStyle = "rgba(0,200,240,0.80)";
      ctx.font = `bold 10px JetBrains Mono, monospace`; ctx.textAlign = "center";
      ctx.fillText(`${capPct}%`, tx+tankW/2, tankY+tankH/2-4);
      ctx.fillStyle = "rgba(0,170,210,0.55)"; ctx.font = "7px JetBrains Mono, monospace";
      ctx.fillText("FULL", tx+tankW/2, tankY+tankH/2+7);
      ctx.textAlign = "left";

      // Tank name + capacity label above tank
      ctx.fillStyle = "rgba(0,200,225,0.75)"; ctx.font = "bold 8px JetBrains Mono, monospace"; ctx.textAlign = "center";
      ctx.fillText(`TANK ${tidx+1}`, tx+tankW/2, tankY-13);
      ctx.fillStyle = "rgba(0,170,210,0.55)"; ctx.font = "7px JetBrains Mono, monospace";
      ctx.fillText("22,500 gal capacity", tx+tankW/2, tankY-4);
      ctx.textAlign = "left";
    });
  }

  // ── RELEASE PIPES (tanks → sewer) ────────────────────────────────────────
  function drawReleasePipes(
    ctx: CanvasRenderingContext2D, _W: number,
    tank1X: number, tank2X: number,
    tankW: number, tankH: number, tankY: number,
    pipeY: number, pipeH: number,
    fillFrac: number, t: number
  ) {
    const releaseAlpha = fillFrac * 0.7;
    const collectY = tankY + tankH + 8;
    const pipeTop = pipeY + pipeH * 0.5;

    [tank1X, tank2X].forEach(tx => {
      const bx = tx + tankW/2;
      // Vertical from tank bottom to horizontal collector
      ctx.fillStyle = "#0c1c28";
      ctx.fillRect(bx-4, tankY+tankH, 9, collectY-(tankY+tankH));
      ctx.strokeStyle = "rgba(0,160,210,0.18)"; ctx.lineWidth = 1;
      ctx.strokeRect(bx-4, tankY+tankH, 9, collectY-(tankY+tankH));
    });

    // Horizontal collector connecting both tank outlets
    const hx0 = tank1X+tankW/2, hx1 = tank2X+tankW/2;
    ctx.fillStyle = "#0c1c28"; ctx.fillRect(hx0-4, collectY-4, hx1-hx0+8, 9);
    ctx.strokeStyle = "rgba(0,160,210,0.18)"; ctx.lineWidth = 1;
    ctx.strokeRect(hx0-4, collectY-4, hx1-hx0+8, 9);

    // Single vertical outlet to sewer
    const outX = (hx0+hx1)/2;
    ctx.fillStyle = "#0c1c28"; ctx.fillRect(outX-4, collectY+5, 9, pipeTop-(collectY+5));
    ctx.strokeStyle = "rgba(0,160,210,0.18)"; ctx.lineWidth = 1;
    ctx.strokeRect(outX-4, collectY+5, 9, pipeTop-(collectY+5));

    // "DELAYED RELEASE" label on outlet pipe
    ctx.fillStyle = "rgba(0,200,180,0.55)"; ctx.font = "7px JetBrains Mono, monospace";
    ctx.fillText("DELAYED RELEASE", outX+7, (collectY+pipeTop)/2+2);

    // Animated release drips when filling
    if (fillFrac > 0.05) {
      for (let i=0;i<2;i++) {
        const dp = ((t*0.014+i*0.5) % 1);
        const dy = collectY+5 + dp*(pipeTop-(collectY+5));
        ctx.fillStyle = `rgba(0,200,180,${releaseAlpha*(1-dp*0.3)})`;
        ctx.beginPath(); ctx.arc(outX, dy, 2, 0, Math.PI*2); ctx.fill();
      }
    }
  }

  // ── SEWER PIPE ────────────────────────────────────────────────────────────
  function drawSewerPipe(
    ctx: CanvasRenderingContext2D, _W: number,
    pipeLeft: number, pipeRight: number,
    pipeY: number, pipeH: number,
    fillFrac: number, t: number, prog: number
  ) {
    const pipeWidth = pipeRight - pipeLeft;
    const pipeR = pipeH / 2;

    // Body
    const pg = ctx.createLinearGradient(0, pipeY, 0, pipeY+pipeH);
    pg.addColorStop(0, "#0d2035"); pg.addColorStop(0.4, "#102840"); pg.addColorStop(1, "#081828");
    ctx.fillStyle = pg;
    ctx.beginPath(); rrPath(ctx, pipeLeft, pipeY, pipeWidth, pipeH, pipeR); ctx.fill();

    // Calm blue border
    const bA = 0.30+Math.sin(t*0.06)*0.08;
    ctx.strokeStyle = `rgba(0,155,255,${bA})`; ctx.lineWidth = 2;
    ctx.beginPath(); rrPath(ctx, pipeLeft, pipeY, pipeWidth, pipeH, pipeR); ctx.stroke();

    // Blue outer glow
    const gG = ctx.createLinearGradient(0, pipeY-5, 0, pipeY+pipeH+5);
    gG.addColorStop(0, "rgba(0,155,255,0)"); gG.addColorStop(0.5, "rgba(0,155,255,0.12)"); gG.addColorStop(1, "rgba(0,155,255,0)");
    ctx.strokeStyle = gG; ctx.lineWidth = 8;
    ctx.beginPath(); rrPath(ctx, pipeLeft, pipeY, pipeWidth, pipeH, pipeR); ctx.stroke();

    // Ghost "without tanks" high water line
    const ghostY = pipeY + pipeH * 0.10; // ~90% full without tanks
    ctx.save();
    ctx.strokeStyle = "rgba(239,68,68,0.45)"; ctx.lineWidth = 1.5;
    ctx.setLineDash([7,4]);
    ctx.beginPath(); ctx.moveTo(pipeLeft+6, ghostY); ctx.lineTo(pipeRight-6, ghostY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Actual low water fill (~22% max when tanks absorb peak)
    const wPct = Math.min(prog * 0.25, 0.25) * (1 - fillFrac * 0.6);
    const wH = pipeH * (Math.max(wPct, 0.03));
    const wY = pipeY + pipeH - wH;
    ctx.save();
    ctx.beginPath(); rrPath(ctx, pipeLeft, pipeY, pipeWidth, pipeH, pipeR); ctx.clip();
    const wg = ctx.createLinearGradient(0, wY, 0, pipeY+pipeH);
    wg.addColorStop(0, "rgba(0,170,255,0.20)");
    wg.addColorStop(0.3, "rgba(0,150,240,0.55)");
    wg.addColorStop(1, "rgba(0,120,210,0.72)");
    ctx.fillStyle = wg; ctx.fillRect(pipeLeft, wY, pipeWidth, wH);
    ctx.strokeStyle = "rgba(100,215,255,0.28)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x=pipeLeft; x<=pipeRight; x+=2) {
      const ry = wY+Math.sin((x/28)+t*0.12)*1.1;
      x===pipeLeft ? ctx.moveTo(x,ry) : ctx.lineTo(x,ry);
    }
    ctx.stroke();
    ctx.restore();

    // Flow particles (slow, few)
    for (let i=0;i<4;i++) {
      const px2 = pipeLeft + ((t*0.55+i*(pipeWidth/4)) % pipeWidth);
      ctx.fillStyle = `rgba(0,175,255,${0.35*Math.min(prog*2,1)})`;
      ctx.beginPath(); ctx.arc(px2, pipeY+pipeH-5, 2, 0, Math.PI*2); ctx.fill();
    }

    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.022)";
    ctx.beginPath(); rrPath(ctx, pipeLeft+4, pipeY+2, pipeWidth-8, 4, 2); ctx.fill();
  }

  // ── PARTICLES (runoff entering inlet → travel through pipe → fill tank) ──
  function spawnAndDrawParticles(
    ctx: CanvasRenderingContext2D,
    ref: MutableRefObject<Particle[]>,
    t: number, prog: number, W: number,
    sceneBot: number, ugTop: number,
    inlet1X: number, inlet2X: number,
    tank1X: number, tank2X: number, tankW: number,
    tankY: number, tankH: number
  ) {
    if (prog > 0.04 && Math.random() < prog * 0.3) {
      const useInlet = Math.random() < 0.5;
      const ix = useInlet ? inlet1X : inlet2X;
      ref.current.push({
        x: ix + (Math.random()-0.5)*8,
        y: ugTop + 4,
        vx: 0, vy: 1.8+Math.random()*1.2,
        life: 0, maxLife: 60,
        col: "rgba(30,165,245,{a})",
      });
    }
    ref.current = ref.current.filter(p => {
      p.x += p.vx; p.y += p.vy; p.life++;
      if (p.life > p.maxLife) return false;
      // Stop particle once it hits tank water level
      const inT1 = p.x > tank1X && p.x < tank1X+tankW;
      const inT2 = p.x > tank2X && p.x < tank2X+tankW;
      if ((inT1 || inT2) && p.y > tankY + 10) return false;
      const a = (1 - p.life/p.maxLife) * 0.7 * Math.min(prog*3, 1);
      ctx.fillStyle = p.col.replace("{a}", String(a));
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI*2); ctx.fill();
      return true;
    });
    void t; void W; void sceneBot; void tankH;
  }

  // ── LABELS & CALLOUTS ─────────────────────────────────────────────────────
  function drawLabels(
    ctx: CanvasRenderingContext2D, W: number, H: number,
    roadTop: number, sceneBot: number, ugTop: number,
    tank1X: number, tank2X: number, tankW: number,
    tankY: number, tankH: number,
    pipeY: number, pipeH: number,
    fillFrac: number,
    storedGal: number, sewerLoadRed: number, overflowPrev: number,
    prog: number, t: number
  ) {
    const mono = "JetBrains Mono, monospace";
    const pulse = 0.88 + Math.sin(t*0.10)*0.12;

    // ── Section label on street ──
    ctx.fillStyle = "rgba(160,160,185,0.70)"; ctx.font = `bold 9px ${mono}`; ctx.textAlign = "center";
    ctx.fillText("STORMWATER RUNOFF FLOWS TO COLLECTION INLETS", W/2, roadTop+14);
    ctx.textAlign = "left";

    // ── Filling status below tanks ──
    const tankMidX = (tank1X + tank2X + tankW) / 2;
    const isdraining = fillFrac < 0.95 && prog > 0.75;
    const statusText = fillFrac > 0.02
      ? isdraining ? "SLOWLY DRAINING — DELAYED RELEASE ACTIVE" : "FILLING — PEAK RUNOFF DIVERTED"
      : "AWAITING STORM EVENT";
    ctx.fillStyle = isdraining ? "rgba(0,220,180,0.80)" : "rgba(0,200,240,0.80)";
    ctx.font = `bold 8px ${mono}`; ctx.textAlign = "center";
    ctx.fillText(statusText, tankMidX, tankY + tankH + 22);
    ctx.textAlign = "left";

    // Sewer-pipe comparison labels — only when fed from the storm drain.
    if (!fromTank) {
    // ── Ghost line label ──
    const ghostY = pipeY + pipeH * 0.10;
    ctx.fillStyle = "rgba(239,68,68,0.65)"; ctx.font = `bold 7px ${mono}`; ctx.textAlign = "right";
    ctx.fillText("WITHOUT STORAGE TANKS (~90% CAPACITY)", W*0.93, ghostY - 3);
    ctx.textAlign = "left";

    // ── Pipe status ──
    const wPct = Math.min(prog * 0.25, 0.25) * (1 - fillFrac * 0.6);
    const capPct = Math.round(Math.max(wPct, 0.03) * 100);
    ctx.fillStyle = "rgba(0,215,130,0.82)"; ctx.font = `bold 9px ${mono}`;
    ctx.fillText(`SEWER PIPE — ${capPct}% CAPACITY   ✓ NORMAL`, W*0.06, pipeY+pipeH+13);

    // ── Reduction arrow between ghost and actual ──
    if (prog > 0.18 && fillFrac > 0.08) {
      const arrA = Math.min((prog-0.18)*3, 1);
      const arrX = W*0.09;
      const wY2 = pipeY + pipeH * (1 - Math.max(wPct, 0.03));
      ctx.strokeStyle = `rgba(0,225,140,${arrA*0.85})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(arrX, ghostY); ctx.lineTo(arrX, wY2+2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(arrX-4, ghostY+4); ctx.lineTo(arrX, ghostY); ctx.lineTo(arrX+4, ghostY+4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(arrX-4, wY2-4); ctx.lineTo(arrX, wY2+2); ctx.lineTo(arrX+4, wY2-4); ctx.stroke();
      ctx.fillStyle = `rgba(0,230,150,${arrA*0.92})`;
      ctx.font = `bold 8px ${mono}`;
      ctx.fillText(`${sewerLoadRed}%`, arrX+5, (ghostY+wY2)/2+4);
      ctx.fillText("less", arrX+5, (ghostY+wY2)/2+14);
    }
    } // end sewer labels

    // ── Flow story label (top right) ──
    ctx.fillStyle = "rgba(0,215,240,0.92)"; ctx.font = `bold 9px ${mono}`; ctx.textAlign = "right";
    ctx.fillText("UNDERGROUND STORAGE TANKS — RUNOFF → CAPTURE → DELAYED RELEASE", W-12, 18);
    ctx.textAlign = "left";

    // ── Metrics card ──
    const mx = W-220, my = 26;
    ctx.fillStyle = "rgba(4,14,28,0.92)";
    ctx.beginPath(); rrPath(ctx, mx, my, 212, 98, 5); ctx.fill();
    ctx.strokeStyle = "rgba(0,200,220,0.22)"; ctx.lineWidth = 1;
    ctx.beginPath(); rrPath(ctx, mx, my, 212, 98, 5); ctx.stroke();
    ctx.fillStyle = "rgba(140,215,235,0.82)"; ctx.font = `bold 8px ${mono}`;
    ctx.fillText("STORAGE TANK PERFORMANCE", mx+10, my+13);

    [
      { label: "GALLONS STORED",       val: storedGal.toLocaleString()+" gal", bar: fillFrac,              col: "rgba(0,215,245,0.95)" },
      { label: "SEWER DEMAND REDUCED", val: sewerLoadRed+"%",                  bar: fillFrac*0.72,         col: "rgba(0,200,220,0.90)" },
      { label: "OVERFLOW PREVENTED",   val: overflowPrev.toLocaleString()+" gal", bar: fillFrac*0.85,      col: "rgba(0,225,165,0.92)" },
      { label: "PEAK FLOW REDUCTION",  val: Math.round(fillFrac*72)+"%",       bar: fillFrac*0.72,         col: "rgba(0,200,180,0.90)" },
    ].forEach((m, i) => {
      const ry = my+26+i*18;
      ctx.fillStyle = "rgba(80,145,170,0.70)"; ctx.font = `7px ${mono}`;
      ctx.fillText(m.label, mx+10, ry);
      const bW=60, bX=mx+142;
      ctx.fillStyle = "rgba(0,175,210,0.10)";
      ctx.beginPath(); rrPath(ctx, bX, ry-7, bW, 5, 2); ctx.fill();
      ctx.fillStyle = m.col; ctx.globalAlpha = pulse;
      ctx.beginPath(); rrPath(ctx, bX, ry-7, bW*Math.min(m.bar*Math.min(prog*3,1),1), 5, 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = m.col; ctx.font = `bold 8px ${mono}`; ctx.textAlign = "right";
      ctx.fillText(m.val, mx+206, ry); ctx.textAlign = "left";
    });

    // ── Capacity gauge bars next to tanks ──
    [tank1X, tank2X].forEach((tx, tidx) => {
      const gx = tx - 18, gy = tankY, gw = 8, gh = tankH;
      // Track
      ctx.fillStyle = "rgba(0,100,140,0.18)";
      ctx.beginPath(); rrPath(ctx, gx, gy, gw, gh, 3); ctx.fill();
      ctx.strokeStyle = "rgba(0,180,220,0.25)"; ctx.lineWidth = 1;
      ctx.beginPath(); rrPath(ctx, gx, gy, gw, gh, 3); ctx.stroke();
      // Fill
      const fillH = gh * 0.92 * fillFrac;
      const fillTop = gy + gh - fillH;
      if (fillH > 3) {
        ctx.save();
        ctx.beginPath(); rrPath(ctx, gx, gy, gw, gh, 3); ctx.clip();
        const fg = ctx.createLinearGradient(0, fillTop, 0, gy+gh);
        fg.addColorStop(0, "rgba(0,200,255,0.30)");
        fg.addColorStop(0.4, "rgba(0,170,240,0.60)");
        fg.addColorStop(1, "rgba(0,130,210,0.80)");
        ctx.fillStyle = fg; ctx.fillRect(gx, fillTop, gw, fillH);
        ctx.restore();
      }
      // Tick marks
      [0,0.25,0.5,0.75,1].forEach(f => {
        const ty2 = gy + gh*(1-f);
        ctx.strokeStyle = "rgba(0,180,220,0.28)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(gx+gw, ty2); ctx.lineTo(gx+gw+4, ty2); ctx.stroke();
      });
      // gal label at top
      const halfGal = Math.round(fillFrac * 22500);
      ctx.fillStyle = "rgba(0,200,220,0.60)"; ctx.font = `6px ${mono}`; ctx.textAlign = "left";
      ctx.fillText(`${halfGal >= 1000 ? (halfGal/1000).toFixed(0)+"k" : halfGal}g`, gx+gw+6, gy+gh*(1-fillFrac)+3);
      void tidx;
    });

    // ── Flow cycle annotation (top-left) ──
    const steps = [
      { l: "STORMWATER",     c: "rgba(120,195,255,0.85)" },
      { l: "COLLECTION PIPE",c: "rgba(0,200,240,0.92)"  },
      { l: "STORAGE TANK",   c: "rgba(0,185,225,0.90)"  },
      { l: "STORED WATER",   c: "rgba(0,175,215,0.88)"  },
      { l: "DELAYED RELEASE",c: "rgba(0,220,175,0.90)"  },
    ];
    ctx.fillStyle = "rgba(4,14,28,0.88)";
    ctx.beginPath(); rrPath(ctx, 10, 22, 148, 92, 5); ctx.fill();
    ctx.strokeStyle = "rgba(0,200,220,0.18)"; ctx.lineWidth = 1;
    ctx.beginPath(); rrPath(ctx, 10, 22, 148, 92, 5); ctx.stroke();
    steps.forEach((s, i) => {
      ctx.fillStyle = s.c; ctx.font = `bold 8px ${mono}`;
      ctx.fillText(s.l, 18, 35+i*16);
      if (i < steps.length-1) {
        ctx.fillStyle = "rgba(0,200,220,0.45)"; ctx.font = "9px sans-serif";
        ctx.fillText("↓", 78, 43+i*16);
      }
    });

    void H; void roadTop; void ugTop; void sceneBot;
  }

  return (
    <div ref={elRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas ref={cvRef} style={{ position: "absolute", inset: 0, display: "block" }} />
    </div>
  );
}
