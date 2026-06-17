import { useEffect, useRef, type MutableRefObject } from "react";

interface Props {
  isPlaying: boolean;
  speed: number;
  timelineValue: number;
}

type Drop     = { x: number; y: number; spd: number; len: number; op: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; col: string; route: number };

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

export function SmartStorageNetworkVisualization({ isPlaying, speed, timelineValue }: Props) {
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
  }, [isPlaying, speed, timelineValue]);

  // ─────────────────────────────────────────────────────────────────────────
  function render(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, prog: number) {
    ctx.clearRect(0, 0, W, H);

    // ── Layout ──────────────────────────────────────────────────────────────
    const sceneBot  = Math.floor(H * 0.46);
    const roadH     = Math.floor(H * 0.09);
    const roadTop   = sceneBot - roadH;
    const swkH      = 8;
    const ugTop     = sceneBot + swkH;
    const ugH       = H - ugTop;

    // Central storm drain
    const drainX    = Math.floor(W * 0.50);

    // Horizontal collection pipe level (the valve junction lives here)
    const collY     = ugTop + Math.floor(ugH * 0.14);
    const collPipeH = 10; // visual height of collection pipe

    // Sewer pipe at the very bottom
    const sewPipeH  = Math.max(Math.floor(ugH * 0.15), 22);
    const sewPipeY  = H - sewPipeH - 10;

    // Sensor node on sewer pipe (left of centre)
    const sensorX   = Math.floor(W * 0.34);

    // Tanks — symmetric left/right
    const tankW     = Math.floor(W * 0.175);
    const tankY     = collY + collPipeH + Math.floor(ugH * 0.04);
    const tankH     = sewPipeY - tankY - 14;
    const tank1X    = Math.floor(W * 0.055);
    const tank2X    = W - Math.floor(W * 0.055) - tankW;
    const tank1CX   = tank1X + tankW / 2;
    const tank2CX   = tank2X + tankW / 2;

    // ── Progression ─────────────────────────────────────────────────────────
    // 0–0.25 : rain → sewer pipe fills, sensor alert
    // 0.25–0.45: valve opens (0→1)
    // 0.45–0.85: tanks fill (0→45%), sewer drops
    // 0.85–1.0 : full normal

    // Sewer pipe load: rises 0→105% over first 25%, then drops to an HONEST 90% as a distributed
    // tank network diverts the peak overshoot (~14% of runoff) at the source to reuse/recharge.
    // 105% → 90% matches card: capture ~400–510k gal of the 2.8M-gal storm, just past capacity → safe headroom.
    const rawLoad   = Math.min(prog / 0.25, 1) * 1.05;
    const valveAmt  = prog < 0.25 ? 0 : Math.min((prog - 0.25) / 0.20, 1);
    const sewUtil   = Math.max(rawLoad - valveAmt * 0.15, 0.90 * Math.min(prog / 0.25, 1));
    const stressed  = sewUtil > 1.0;

    // Tank fill: 0→90% between prog 0.42→0.85 (tanks capture the diverted peak overshoot)
    const tankFill  = prog < 0.42 ? 0 : Math.min((prog - 0.42) / 0.43 * 0.90, 0.90);
    // normalised 0→1 for visuals
    const fillFrac  = tankFill / 0.90;

    // Metrics — honest distributed-network numbers for the South Downtown 1-hr storm:
    // ~6,500 gal/min peak diversion (= ~400k gal/hr shaved off the peak), de-rated as valve ramps.
    // overflow ~2,200 gal/min pre-valve (the ~5% overshoot above 100% before the tanks engage).
    const pipeDispPct  = Math.round(sewUtil * 100);
    const overflowGPM  = valveAmt > 0.88 ? 0 : Math.round(Math.min(prog / 0.25, 1) * 2200 * Math.max(1 - valveAmt * 1.25, 0));
    const divertedGPM  = Math.round(valveAmt * 6500);
    const storagePct   = Math.round(tankFill * 100);   // out of 90 max → shows actual %

    // Active step 1–8
    let step = 1;
    if (prog > 0.10) step = 2;
    if (prog > 0.22) step = 3;
    if (prog > 0.38) step = 4;
    if (prog > 0.50) step = 5;
    if (prog > 0.63) step = 6;
    if (prog > 0.76) step = 7;
    if (prog > 0.88) step = 8;

    // Draw layers
    drawSky(ctx, W, roadTop, t);
    drawBuildings(ctx, W, roadTop, t);
    drawRain(ctx, W, roadTop, t);
    drawStreet(ctx, W, roadTop, roadH, sceneBot, swkH, drainX, t);
    drawUnderground(ctx, W, ugTop, H);
    drawInletShaft(ctx, drainX, sceneBot, swkH, collY, t, prog);
    drawBypassPipe(ctx, drainX, collY, collPipeH, sewPipeY, sewUtil, valveAmt, t, prog);
    drawCollectionPipes(ctx, drainX, collY, collPipeH, tank1CX, tank2CX, valveAmt, t);
    drawTankInletShafts(ctx, tank1CX, tank2CX, collY, collPipeH, tankY, valveAmt, t);
    drawValveJunction(ctx, drainX, collY, collPipeH, valveAmt, stressed, t);
    drawSewerPipe(ctx, W, sewPipeY, sewPipeH, sewUtil, stressed, valveAmt, t, prog);
    drawSensorNode(ctx, sensorX, sewPipeY, sewPipeH, stressed, prog, t);
    drawTank(ctx, tank1X, tankW, tankY, tankH, fillFrac, valveAmt, t, 1);
    drawTank(ctx, tank2X, tankW, tankY, tankH, fillFrac, valveAmt, t, 2);
    drawTankReleasePipes(ctx, tank1CX, tank2CX, tankY, tankH, sewPipeY, fillFrac, t);
    drawParticles(ctx, partRef, W, drainX, collY, collPipeH, sewPipeY, sewPipeH, tank1CX, tank2CX, tankY, tankH, sewUtil, stressed, valveAmt, prog, t);
    drawLabels(ctx, W, H, roadTop, ugTop, drainX, collY, sewPipeY, sewPipeH, sensorX, tank1X, tank2X, tankW, tankY, tankH, tank1CX, tank2CX, pipeDispPct, overflowGPM, divertedGPM, storagePct, valveAmt, stressed, step, prog, t);
  }

  // ── SKY ───────────────────────────────────────────────────────────────────
  function drawSky(ctx: CanvasRenderingContext2D, W: number, skyBot: number, t: number) {
    const g = ctx.createLinearGradient(0, 0, 0, skyBot);
    g.addColorStop(0, "#060e1e"); g.addColorStop(1, "#0d1e2c");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, skyBot);
    [{ bx:W*0.08,y:16,r:54 },{ bx:W*0.33,y:10,r:70 },{ bx:W*0.62,y:20,r:57 },{ bx:W*0.86,y:13,r:45 }].forEach(c => {
      const cx = (c.bx + t*0.018) % (W+120) - 60;
      const gr = ctx.createRadialGradient(cx,c.y,0,cx,c.y,c.r);
      gr.addColorStop(0,"rgba(8,20,40,0.96)"); gr.addColorStop(0.7,"rgba(5,14,28,0.72)"); gr.addColorStop(1,"rgba(2,8,16,0)");
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(cx,c.y,c.r*1.8,c.r*0.65,0,0,Math.PI*2); ctx.fill();
    });
  }

  // ── BUILDINGS ─────────────────────────────────────────────────────────────
  function drawBuildings(ctx: CanvasRenderingContext2D, W: number, roadTop: number, t: number) {
    [{ x:W*0.02,w:50,h:90 },{ x:W*0.12,w:38,h:68 },{ x:W*0.66,w:54,h:100 },{ x:W*0.76,w:34,h:62 },{ x:W*0.87,w:44,h:82 }].forEach(b => {
      const by = roadTop - b.h;
      const bg = ctx.createLinearGradient(b.x,by,b.x+b.w,by);
      bg.addColorStop(0,"#0a1828"); bg.addColorStop(0.5,"#0d2035"); bg.addColorStop(1,"#071520");
      ctx.fillStyle = bg; ctx.fillRect(b.x,by,b.w,b.h);
      [0.22,0.50,0.72].forEach(yf => {
        ctx.fillStyle = Math.sin(t*0.018+b.x*0.01) > 0.86 ? "rgba(0,212,216,0.5)" : "rgba(255,215,85,0.22)";
        ctx.fillRect(b.x+6,by+b.h*yf,8,6);
        ctx.fillStyle = "rgba(255,215,85,0.18)"; ctx.fillRect(b.x+b.w-14,by+b.h*yf,8,6);
      });
      ctx.strokeStyle = "rgba(0,212,216,0.06)"; ctx.lineWidth = 1; ctx.strokeRect(b.x,by,b.w,b.h);
    });
  }

  // ── RAIN ──────────────────────────────────────────────────────────────────
  function drawRain(ctx: CanvasRenderingContext2D, W: number, maxY: number, _t: number) {
    if (rainRef.current.length === 0)
      for (let i = 0; i < 150; i++)
        rainRef.current.push({ x:Math.random()*W, y:Math.random()*maxY, spd:7+Math.random()*6, len:10+Math.random()*13, op:0.28+Math.random()*0.5 });
    rainRef.current.forEach(d => {
      d.y += d.spd; if (d.y > maxY+20) { d.y = -20; d.x = Math.random()*W; }
      ctx.strokeStyle = `rgba(100,180,255,${d.op})`; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-1.5,d.y+d.len); ctx.stroke();
    });
  }

  // ── STREET ────────────────────────────────────────────────────────────────
  function drawStreet(ctx: CanvasRenderingContext2D, W: number, roadTop: number, roadH: number, sceneBot: number, swkH: number, drainX: number, t: number) {
    const rg = ctx.createLinearGradient(0,roadTop,0,sceneBot);
    rg.addColorStop(0,"#111820"); rg.addColorStop(1,"#0d1520");
    ctx.fillStyle = rg; ctx.fillRect(0,roadTop,W,roadH);
    // Centre line
    ctx.strokeStyle = "rgba(255,200,0,0.20)"; ctx.lineWidth = 1.2; ctx.setLineDash([18,14]);
    ctx.beginPath(); ctx.moveTo(0,roadTop+roadH/2); ctx.lineTo(W,roadTop+roadH/2); ctx.stroke();
    ctx.setLineDash([]);
    // Car left
    const carX = W*0.24, carY = roadTop+4;
    ctx.fillStyle = "#0d2035"; ctx.beginPath(); rrPath(ctx,carX,carY,44,15,2); ctx.fill();
    ctx.fillStyle = "#0a1828"; ctx.beginPath(); rrPath(ctx,carX+7,carY-10,28,11,2); ctx.fill();
    ctx.fillStyle = "rgba(255,220,100,0.5)";
    ctx.beginPath(); ctx.arc(carX+4,carY+8,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(carX+40,carY+8,2,0,Math.PI*2); ctx.fill();
    // Car right
    const car2X = W*0.64, car2Y = roadTop+5;
    ctx.fillStyle = "#0c1c30"; ctx.beginPath(); rrPath(ctx,car2X,car2Y,42,14,2); ctx.fill();
    ctx.fillStyle = "#091525"; ctx.beginPath(); rrPath(ctx,car2X+6,car2Y-9,28,10,2); ctx.fill();
    ctx.fillStyle = "rgba(255,220,100,0.4)";
    ctx.beginPath(); ctx.arc(car2X+3,car2Y+7,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(car2X+38,car2Y+7,2,0,Math.PI*2); ctx.fill();

    // Sidewalk
    ctx.fillStyle = "#1a2535"; ctx.fillRect(0,sceneBot,W,swkH);

    // Storm drain grate (single, centre)
    ctx.fillStyle = "#0e1824"; ctx.fillRect(drainX-13,sceneBot-2,26,swkH+5);
    ctx.strokeStyle = "rgba(0,200,220,0.45)"; ctx.lineWidth = 1;
    ctx.strokeRect(drainX-13,sceneBot-2,26,swkH+5);
    for (let gi=0;gi<5;gi++) {
      ctx.beginPath(); ctx.moveTo(drainX-13,sceneBot+1+gi*2.0); ctx.lineTo(drainX+13,sceneBot+1+gi*2.0); ctx.stroke();
    }
    const gA = 0.35 + Math.sin(t*0.14)*0.18;
    ctx.fillStyle = `rgba(30,160,240,${gA})`;
    ctx.beginPath(); ctx.arc(drainX,sceneBot+2,3.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(0,200,220,0.55)"; ctx.font = "7px JetBrains Mono, monospace"; ctx.textAlign = "center";
    ctx.fillText("STORM DRAIN", drainX, sceneBot-5);

    // Surface runoff converging on drain
    [[W*0.04,drainX],[W*0.20,drainX],[W*0.78,drainX],[W*0.96,drainX]].forEach(([sx,ex]) => {
      ctx.save();
      ctx.strokeStyle = "rgba(30,150,230,0.44)"; ctx.lineWidth = 2; ctx.setLineDash([7,6]);
      ctx.lineDashOffset = -(t*0.9);
      ctx.beginPath(); ctx.moveTo(sx,sceneBot-3); ctx.lineTo(ex+(sx<ex?-12:12),sceneBot-3); ctx.stroke();
      ctx.restore();
    });
    ctx.textAlign = "left";
  }

  // ── UNDERGROUND ───────────────────────────────────────────────────────────
  function drawUnderground(ctx: CanvasRenderingContext2D, W: number, ugTop: number, H: number) {
    const g = ctx.createLinearGradient(0,ugTop,0,H);
    g.addColorStop(0,"#09130e"); g.addColorStop(0.4,"#070e0a"); g.addColorStop(1,"#050b07");
    ctx.fillStyle = g; ctx.fillRect(0,ugTop,W,H-ugTop);
    [0.12,0.32,0.56,0.78].forEach(f => {
      ctx.strokeStyle = "rgba(28,14,5,0.35)"; ctx.lineWidth = 0.5; ctx.setLineDash([5,9]);
      ctx.beginPath(); ctx.moveTo(0,ugTop+(H-ugTop)*f); ctx.lineTo(W,ugTop+(H-ugTop)*f); ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  // ── INLET SHAFT (drain → collection level) ────────────────────────────────
  function drawInletShaft(ctx: CanvasRenderingContext2D, drainX: number, sceneBot: number, swkH: number, collY: number, t: number, prog: number) {
    const shaftTop = sceneBot + swkH;
    ctx.fillStyle = "#0d1c28"; ctx.fillRect(drainX-7,shaftTop,14,collY-shaftTop);
    ctx.strokeStyle = "rgba(0,180,220,0.20)"; ctx.lineWidth = 1;
    ctx.strokeRect(drainX-7,shaftTop,14,collY-shaftTop);
    // Animated drops
    for (let i=0;i<4;i++) {
      const dp = ((t*0.028+i*0.25)%1);
      const dy = shaftTop + dp*(collY-shaftTop);
      ctx.fillStyle = `rgba(30,160,240,${Math.min(prog*2.5,0.85)*(1-dp*0.3)})`;
      ctx.beginPath(); ctx.arc(drainX,dy,2.8,0,Math.PI*2); ctx.fill();
    }
  }

  // ── BYPASS PIPE (collection level → sewer, fades as valve opens) ──────────
  function drawBypassPipe(ctx: CanvasRenderingContext2D, drainX: number, collY: number, collPipeH: number, sewPipeY: number, sewUtil: number, valveAmt: number, t: number, prog: number) {
    const bypassAlpha = Math.max(1 - valveAmt * 1.4, 0);
    if (bypassAlpha < 0.02) return;
    const top = collY + collPipeH;
    const bot = sewPipeY + 2;
    ctx.fillStyle = `rgba(12,24,38,${bypassAlpha*0.92})`; ctx.fillRect(drainX-7,top,14,bot-top);
    ctx.strokeStyle = `rgba(0,160,210,${bypassAlpha*0.22})`; ctx.lineWidth = 1;
    ctx.strokeRect(drainX-7,top,14,bot-top);
    // Drops falling to sewer
    if (prog > 0.04) {
      for (let i=0;i<3;i++) {
        const dp = ((t*0.026+i*0.33)%1);
        const dy = top + dp*(bot-top);
        ctx.fillStyle = `rgba(${stressed(sewUtil) ? "200,60,60" : "30,155,240"},${bypassAlpha*0.75*(1-dp*0.3)})`;
        ctx.beginPath(); ctx.arc(drainX,dy,2.5,0,Math.PI*2); ctx.fill();
      }
    }
  }
  function stressed(util: number) { return util > 1.0; }

  // ── COLLECTION PIPES (junction → left tank & right tank) ──────────────────
  function drawCollectionPipes(ctx: CanvasRenderingContext2D, drainX: number, collY: number, collPipeH: number, tank1CX: number, tank2CX: number, valveAmt: number, t: number) {
    if (valveAmt < 0.02) return;
    const alpha = valveAmt;
    const midY = collY + collPipeH/2;

    // Left pipe: drainX → tank1CX
    ctx.fillStyle = `rgba(10,26,42,${alpha*0.92})`; ctx.fillRect(tank1CX-4,collY,drainX-tank1CX+4,collPipeH);
    ctx.strokeStyle = `rgba(0,210,150,${alpha*0.50})`; ctx.lineWidth = 1.5;
    ctx.strokeRect(tank1CX-4,collY,drainX-tank1CX+4,collPipeH);
    // Right pipe: drainX → tank2CX
    ctx.fillStyle = `rgba(10,26,42,${alpha*0.92})`; ctx.fillRect(drainX,collY,tank2CX+4-drainX,collPipeH);
    ctx.strokeStyle = `rgba(0,210,150,${alpha*0.50})`; ctx.lineWidth = 1.5;
    ctx.strokeRect(drainX,collY,tank2CX+4-drainX,collPipeH);

    // Green glow on collection pipes
    const gG1 = ctx.createLinearGradient(0,collY-3,0,collY+collPipeH+3);
    gG1.addColorStop(0,"rgba(0,210,150,0)"); gG1.addColorStop(0.5,`rgba(0,210,150,${alpha*0.14})`); gG1.addColorStop(1,"rgba(0,210,150,0)");
    ctx.strokeStyle = gG1; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(tank1CX,midY); ctx.lineTo(tank2CX,midY); ctx.stroke();

    // Animated water in left pipe
    const leftLen = drainX - tank1CX;
    for (let i=0;i<4;i++) {
      const hp = 1 - ((t*0.022+i*0.25)%1); // flows LEFT
      ctx.fillStyle = `rgba(0,210,155,${alpha*0.80})`;
      ctx.beginPath(); ctx.arc(tank1CX+hp*leftLen, midY, 2.2, 0, Math.PI*2); ctx.fill();
    }
    // Animated water in right pipe
    const rightLen = tank2CX - drainX;
    for (let i=0;i<4;i++) {
      const hp = ((t*0.022+i*0.25)%1); // flows RIGHT
      ctx.fillStyle = `rgba(0,210,155,${alpha*0.80})`;
      ctx.beginPath(); ctx.arc(drainX+hp*rightLen, midY, 2.2, 0, Math.PI*2); ctx.fill();
    }

    // Labels
    ctx.fillStyle = `rgba(0,200,220,${alpha*0.55})`; ctx.font = "7px JetBrains Mono, monospace"; ctx.textAlign = "center";
    ctx.fillText("COLLECTION PIPE", (tank1CX+drainX)/2, collY-4);
    ctx.fillText("COLLECTION PIPE", (drainX+tank2CX)/2, collY-4);
    ctx.textAlign = "left";
  }

  // ── TANK INLET SHAFTS (from collection pipe into each tank top) ───────────
  function drawTankInletShafts(ctx: CanvasRenderingContext2D, tank1CX: number, tank2CX: number, collY: number, collPipeH: number, tankY: number, valveAmt: number, t: number) {
    if (valveAmt < 0.02) return;
    const alpha = valveAmt;
    const shaftTop = collY + collPipeH;
    const shaftBot = tankY;

    [tank1CX, tank2CX].forEach((cx, idx) => {
      ctx.fillStyle = `rgba(10,26,42,${alpha*0.90})`; ctx.fillRect(cx-6,shaftTop,12,shaftBot-shaftTop);
      ctx.strokeStyle = `rgba(0,200,220,${alpha*0.22})`; ctx.lineWidth = 1;
      ctx.strokeRect(cx-6,shaftTop,12,shaftBot-shaftTop);
      // Drops
      for (let i=0;i<3;i++) {
        const dp = ((t*0.030+i*0.33+idx*0.15)%1);
        const dy = shaftTop + dp*(shaftBot-shaftTop);
        ctx.fillStyle = `rgba(30,165,245,${alpha*(1-dp*0.4)})`;
        ctx.beginPath(); ctx.arc(cx,dy,2.4,0,Math.PI*2); ctx.fill();
      }
    });
  }

  // ── VALVE JUNCTION (the "smart lever" at collection pipe centre) ───────────
  function drawValveJunction(ctx: CanvasRenderingContext2D, drainX: number, collY: number, collPipeH: number, valveAmt: number, isStressed: boolean, t: number) {
    const vx = drainX;
    const vy = collY + collPipeH / 2;
    const vr = collPipeH * 1.0 + 4; // slightly bigger than pipe
    const isOpen = valveAmt > 0.05;
    const col = isOpen ? "rgba(0,225,140,1)" : (isStressed ? "rgba(239,68,68,1)" : "rgba(0,155,255,1)");
    const pulse = 0.82 + Math.sin(t*(isOpen ? 0.07 : (isStressed ? 0.22 : 0.08)))*0.18;

    // Outer ring
    ctx.strokeStyle = col.replace("1)", `${pulse*0.75})`); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(vx,vy,vr,0,Math.PI*2); ctx.stroke();

    // Body
    const vg = ctx.createRadialGradient(vx,vy,0,vx,vy,vr);
    vg.addColorStop(0, isOpen ? "rgba(0,90,65,0.80)" : isStressed ? "rgba(90,15,10,0.80)" : "rgba(10,40,70,0.80)");
    vg.addColorStop(1, isOpen ? "rgba(0,50,40,0.45)" : isStressed ? "rgba(55,10,8,0.45)" : "rgba(6,22,50,0.45)");
    ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(vx,vy,vr-1,0,Math.PI*2); ctx.fill();

    // Gate disc — rotates from closed (vertical) to open (horizontal = L/R divert)
    const angle = valveAmt * Math.PI/2; // 0=vertical(bypass to sewer), 90°=horizontal(divert to tanks)
    ctx.save(); ctx.translate(vx,vy); ctx.rotate(angle);
    ctx.strokeStyle = col.replace("1)", `${pulse*0.90})`); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0,-(vr-4)); ctx.lineTo(0,vr-4); ctx.stroke();
    ctx.restore();

    // Pulse ring
    ctx.strokeStyle = col.replace("1)", `${(1-pulse)*0.55})`); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(vx,vy,vr+4+pulse*7,0,Math.PI*2); ctx.stroke();

    // VALVE label
    const labelCol = isOpen ? `rgba(0,225,140,${pulse*0.85})` : isStressed ? `rgba(239,100,68,${pulse*0.85})` : `rgba(0,190,240,0.65)`;
    ctx.fillStyle = labelCol; ctx.font = "bold 7px JetBrains Mono, monospace"; ctx.textAlign = "center";
    ctx.fillText(isOpen ? "VALVE" : "VALVE", vx, vy + vr + 11);
    ctx.fillText(isOpen ? "OPEN" : "CLOSED", vx, vy + vr + 20);
    ctx.textAlign = "left";
  }

  // ── SEWER PIPE ────────────────────────────────────────────────────────────
  function drawSewerPipe(ctx: CanvasRenderingContext2D, W: number, sewPipeY: number, sewPipeH: number, sewUtil: number, isStressed: boolean, valveAmt: number, t: number, prog: number) {
    const pL = W*0.05, pR = W*0.95, pW = pR - pL, pR2 = sewPipeH/2;

    // Body
    const pg = ctx.createLinearGradient(0,sewPipeY,0,sewPipeY+sewPipeH);
    pg.addColorStop(0,"#0d2035"); pg.addColorStop(0.4,"#102840"); pg.addColorStop(1,"#081828");
    ctx.fillStyle = pg; ctx.beginPath(); rrPath(ctx,pL,sewPipeY,pW,sewPipeH,pR2); ctx.fill();

    // Border — red when stressed, calm blue otherwise
    const borderA = isStressed && valveAmt < 0.5 ? 0.38+Math.sin(t*0.20)*0.22 : 0.28+Math.sin(t*0.06)*0.07;
    ctx.strokeStyle = isStressed && valveAmt < 0.5
      ? `rgba(239,68,68,${borderA})`
      : `rgba(0,155,255,${borderA})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); rrPath(ctx,pL,sewPipeY,pW,sewPipeH,pR2); ctx.stroke();

    // Red glow when overloaded
    if (isStressed && valveAmt < 0.5) {
      const gi = (sewUtil-1.0)*1.5*(0.7+Math.sin(t*0.22)*0.3);
      const gG = ctx.createLinearGradient(0,sewPipeY-6,0,sewPipeY+sewPipeH+6);
      gG.addColorStop(0,"rgba(239,68,68,0)"); gG.addColorStop(0.5,`rgba(239,68,68,${gi*0.5})`); gG.addColorStop(1,"rgba(239,68,68,0)");
      ctx.strokeStyle = gG; ctx.lineWidth = 10;
      ctx.beginPath(); rrPath(ctx,pL,sewPipeY,pW,sewPipeH,pR2); ctx.stroke();
    } else {
      const bG = ctx.createLinearGradient(0,sewPipeY-4,0,sewPipeY+sewPipeH+4);
      bG.addColorStop(0,"rgba(0,155,255,0)"); bG.addColorStop(0.5,"rgba(0,155,255,0.10)"); bG.addColorStop(1,"rgba(0,155,255,0)");
      ctx.strokeStyle = bG; ctx.lineWidth = 7;
      ctx.beginPath(); rrPath(ctx,pL,sewPipeY,pW,sewPipeH,pR2); ctx.stroke();
    }

    // Water fill in sewer pipe
    const wFrac = Math.max(Math.min(sewUtil, 1), 0.04);
    const wH = sewPipeH * wFrac;
    const wY = sewPipeY + sewPipeH - wH;
    ctx.save();
    ctx.beginPath(); rrPath(ctx,pL,sewPipeY,pW,sewPipeH,pR2); ctx.clip();
    const wg = ctx.createLinearGradient(0,wY,0,sewPipeY+sewPipeH);
    const hot = isStressed && valveAmt < 0.5;
    if (hot) {
      wg.addColorStop(0,"rgba(220,50,50,0.18)"); wg.addColorStop(0.3,`rgba(200,40,40,${0.50+Math.sin(t*0.10)*0.08})`); wg.addColorStop(1,"rgba(180,30,30,0.70)");
    } else {
      wg.addColorStop(0,"rgba(0,170,255,0.16)"); wg.addColorStop(0.3,"rgba(0,150,240,0.50)"); wg.addColorStop(1,"rgba(0,120,210,0.68)");
    }
    ctx.fillStyle = wg; ctx.fillRect(pL,wY,pW,wH);
    // Ripple
    ctx.strokeStyle = hot ? "rgba(255,120,120,0.28)" : "rgba(100,215,255,0.26)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x=pL;x<=pR;x+=2) {
      const ry = wY+Math.sin((x/28)+t*0.12)*1.1;
      x===pL ? ctx.moveTo(x,ry) : ctx.lineTo(x,ry);
    }
    ctx.stroke();
    ctx.restore();

    // Ghost "without system" line
    if (prog > 0.15) {
      const ga = Math.min((prog-0.15)*3, 0.50);
      const ghostY = sewPipeY + sewPipeH * 0.02; // ~105% fill
      ctx.save();
      ctx.strokeStyle = `rgba(239,68,68,${ga})`; ctx.lineWidth = 1.5; ctx.setLineDash([7,4]);
      ctx.beginPath(); ctx.moveTo(pL+6,ghostY); ctx.lineTo(pR-6,ghostY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(239,68,68,${ga*0.82})`; ctx.font = "bold 7px JetBrains Mono, monospace"; ctx.textAlign = "right";
      ctx.fillText("WITHOUT SMART STORAGE (~105% — OVERFLOW)", pR-8, ghostY-3);
      ctx.textAlign = "left";
      ctx.restore();
    }

    // Pipe highlight
    ctx.fillStyle = "rgba(255,255,255,0.020)";
    ctx.beginPath(); rrPath(ctx,pL+4,sewPipeY+2,pW-8,4,2); ctx.fill();

    // Slow flow particles in sewer
    for (let i=0;i<4;i++) {
      const px = pL + ((t*0.55+i*(pW/4))%pW);
      ctx.fillStyle = `rgba(${hot?"200,60,60":"0,170,255"},${0.32*Math.min(prog*2,1)})`;
      ctx.beginPath(); ctx.arc(px,sewPipeY+sewPipeH-5,2,0,Math.PI*2); ctx.fill();
    }
  }

  // ── SENSOR NODE (on sewer pipe) ───────────────────────────────────────────
  function drawSensorNode(ctx: CanvasRenderingContext2D, sx: number, sewPipeY: number, _sewPipeH: number, isStressed: boolean, prog: number, t: number) {
    if (prog < 0.06) return;
    const cy = sewPipeY - 12;
    const pulse = 0.7 + Math.sin(t*(isStressed ? 0.22 : 0.07))*0.3;
    const col = isStressed ? `rgba(239,68,68,${pulse*0.9})` : `rgba(0,200,240,${0.6+pulse*0.3})`;
    const ringCol = isStressed ? "rgba(255,120,80,0.85)" : "rgba(0,230,255,0.72)";

    // Wire
    ctx.strokeStyle = `rgba(0,210,240,${0.28+pulse*0.18})`; ctx.lineWidth = 1.5;
    ctx.setLineDash([3,3]); ctx.lineDashOffset = -(t*0.5);
    ctx.beginPath(); ctx.moveTo(sx,sewPipeY); ctx.lineTo(sx,cy+7); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(sx,cy,7,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = ringCol; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(sx,cy,7,0,Math.PI*2); ctx.stroke();
    if (prog > 0.08) {
      const ringR = 7 + pulse*8;
      ctx.strokeStyle = isStressed ? `rgba(239,68,68,${(1-pulse*0.7)*0.55})` : `rgba(0,220,255,${(1-pulse*0.6)*0.4})`;
      ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx,cy,ringR,0,Math.PI*2); ctx.stroke();
    }
    ctx.fillStyle = "#0a1828"; ctx.beginPath(); ctx.arc(sx,cy,3,0,Math.PI*2); ctx.fill();

    // Sensor data card
    if (prog > 0.10) {
      const a = Math.min((prog-0.10)*4,1);
      const cardY = cy - 46;
      ctx.fillStyle = `rgba(4,14,28,${a*0.92})`;
      ctx.beginPath(); rrPath(ctx,sx-50,cardY,100,36,4); ctx.fill();
      ctx.strokeStyle = isStressed ? `rgba(239,100,68,${a*0.55})` : `rgba(0,200,240,${a*0.40})`; ctx.lineWidth = 1;
      ctx.beginPath(); rrPath(ctx,sx-50,cardY,100,36,4); ctx.stroke();
      ctx.fillStyle = isStressed ? `rgba(239,100,68,${a*0.80})` : `rgba(0,210,240,${a*0.78})`;
      ctx.beginPath(); rrPath(ctx,sx-50,cardY+4,3,28,1); ctx.fill();
      ctx.fillStyle = `rgba(100,175,200,${a*0.65})`; ctx.font = "6px JetBrains Mono, monospace";
      ctx.fillText("PIPE SENSOR", sx-42, cardY+12);
      ctx.fillStyle = isStressed ? `rgba(239,100,68,${a*0.90})` : `rgba(0,200,240,${a*0.90})`;
      ctx.font = "bold 9px JetBrains Mono, monospace";
      ctx.fillText(isStressed ? "⚠ OVERLOAD" : (prog > 0.25 ? "NORMAL" : "MONITORING"), sx-42, cardY+25);
    }
  }

  // ── STORAGE TANKS (left and right) ────────────────────────────────────────
  function drawTank(ctx: CanvasRenderingContext2D, tankX: number, tankW: number, tankY: number, tankH: number, fillFrac: number, valveAmt: number, t: number, idx: number) {
    // Shell
    const shellG = ctx.createLinearGradient(tankX,tankY,tankX+tankW,tankY);
    shellG.addColorStop(0,"#0e2030"); shellG.addColorStop(0.15,"#162a40"); shellG.addColorStop(0.85,"#112236"); shellG.addColorStop(1,"#0c1c2c");
    ctx.fillStyle = shellG; ctx.beginPath(); rrPath(ctx,tankX,tankY,tankW,tankH,6); ctx.fill();

    // Border
    const borderCol = valveAmt > 0.05
      ? `rgba(0,200,220,${0.30+Math.sin(t*0.07)*0.10})`
      : "rgba(0,180,220,0.20)";
    ctx.strokeStyle = borderCol; ctx.lineWidth = 2;
    ctx.beginPath(); rrPath(ctx,tankX,tankY,tankW,tankH,6); ctx.stroke();

    // Glow when filling
    if (valveAmt > 0.05) {
      const gG = ctx.createLinearGradient(0,tankY-4,0,tankY+tankH+4);
      gG.addColorStop(0,"rgba(0,200,220,0)"); gG.addColorStop(0.5,`rgba(0,200,220,${valveAmt*0.10})`); gG.addColorStop(1,"rgba(0,200,220,0)");
      ctx.strokeStyle = gG; ctx.lineWidth = 9;
      ctx.beginPath(); rrPath(ctx,tankX,tankY,tankW,tankH,6); ctx.stroke();
    }

    // Water fill rising from bottom
    const waterH = (tankH - 6) * fillFrac;
    const waterY = tankY + tankH - waterH - 4;
    if (waterH > 3) {
      ctx.save();
      ctx.beginPath(); rrPath(ctx,tankX+2,tankY+2,tankW-4,tankH-4,5); ctx.clip();

      const wg = ctx.createLinearGradient(0,waterY,0,tankY+tankH);
      wg.addColorStop(0,"rgba(0,175,255,0.12)");
      wg.addColorStop(0.2,"rgba(0,155,245,0.40)");
      wg.addColorStop(0.65,"rgba(0,125,215,0.60)");
      wg.addColorStop(1,"rgba(0,100,190,0.78)");
      ctx.fillStyle = wg; ctx.fillRect(tankX+2,waterY,tankW-4,waterH+4);

      // Animated ripple at surface
      ctx.strokeStyle = `rgba(80,220,255,${0.32+Math.sin(t*0.09+idx)*0.14})`; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x=tankX+2;x<=tankX+tankW-2;x+=2) {
        const ry = waterY + Math.sin((x/22)+t*0.10+idx*1.5)*1.3;
        x===tankX+2 ? ctx.moveTo(x,ry) : ctx.lineTo(x,ry);
      }
      ctx.stroke();

      // Bubbles rising
      if (fillFrac > 0.05) {
        for (let i=0;i<5;i++) {
          const bphase = ((t*0.015+idx*0.3+i*0.2)%1);
          const bx = tankX+10 + ((i*38.5)%(tankW-20));
          const by2 = waterY + waterH*(1-bphase);
          const ba = bphase*(1-bphase)*2*0.60;
          ctx.fillStyle = `rgba(120,220,255,${ba})`;
          ctx.beginPath(); ctx.arc(bx,by2,1.5,0,Math.PI*2); ctx.fill();
        }
      }
      ctx.restore();
    }

    // Rivets
    [0.18,0.50,0.82].forEach(f => {
      ctx.fillStyle = "rgba(0,140,180,0.28)";
      ctx.beginPath(); ctx.arc(tankX+3,tankY+tankH*f,2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(tankX+tankW-3,tankY+tankH*f,2,0,Math.PI*2); ctx.fill();
    });

    // Fill % + label inside tank
    const fillPct = Math.round(fillFrac * 45); // actual % (target 45%)
    const cx = tankX + tankW/2;
    ctx.fillStyle = "rgba(0,200,240,0.88)"; ctx.font = "bold 12px JetBrains Mono, monospace"; ctx.textAlign = "center";
    ctx.fillText(`${fillPct}%`, cx, tankY+tankH/2-3);
    ctx.fillStyle = "rgba(0,170,210,0.55)"; ctx.font = "7px JetBrains Mono, monospace";
    ctx.fillText("CAPACITY", cx, tankY+tankH/2+11);
    ctx.textAlign = "left";

    // Gauge bar (right side of tank)
    const gbX = tankX+tankW+4, gbY = tankY, gbW = 7, gbH = tankH;
    ctx.fillStyle = "rgba(0,100,140,0.18)"; ctx.beginPath(); rrPath(ctx,gbX,gbY,gbW,gbH,3); ctx.fill();
    ctx.strokeStyle = "rgba(0,180,220,0.24)"; ctx.lineWidth = 1;
    ctx.beginPath(); rrPath(ctx,gbX,gbY,gbW,gbH,3); ctx.stroke();
    const gfH = gbH * fillFrac;
    if (gfH > 3) {
      ctx.save(); ctx.beginPath(); rrPath(ctx,gbX,gbY,gbW,gbH,3); ctx.clip();
      const fg = ctx.createLinearGradient(0,gbY+gbH-gfH,0,gbY+gbH);
      fg.addColorStop(0,"rgba(0,200,255,0.28)"); fg.addColorStop(0.4,"rgba(0,165,240,0.58)"); fg.addColorStop(1,"rgba(0,125,210,0.80)");
      ctx.fillStyle = fg; ctx.fillRect(gbX,gbY+gbH-gfH,gbW,gfH);
      ctx.restore();
    }
    [0,0.25,0.50,0.75,1].forEach(f => {
      ctx.strokeStyle = "rgba(0,180,220,0.25)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(gbX+gbW,gbY+gbH*(1-f)); ctx.lineTo(gbX+gbW+4,gbY+gbH*(1-f)); ctx.stroke();
    });

    // Tank name above
    ctx.fillStyle = "rgba(0,200,225,0.78)"; ctx.font = "bold 8px JetBrains Mono, monospace"; ctx.textAlign = "center";
    ctx.fillText(`TANK CLUSTER ${idx} / 2`, cx, tankY-13);
    ctx.fillStyle = "rgba(0,170,210,0.52)"; ctx.font = "7px JetBrains Mono, monospace";
    ctx.fillText("~255k gal · 3 tanks", cx, tankY-4);
    ctx.textAlign = "left";
  }

  // ── TANK OUTFLOW (tank → OUT of the combined sewer, to reuse / recharge) ───
  // Captured stormwater is diverted sideways out of the system — NOT released back
  // into the sewer pipe below. Slow controlled release happens post-storm.
  function drawTankReleasePipes(ctx: CanvasRenderingContext2D, tank1CX: number, tank2CX: number, tankY: number, tankH: number, sewPipeY: number, fillFrac: number, t: number) {
    const a    = Math.max(fillFrac, 0.12);
    const top  = tankY + tankH;
    const drop = Math.min(24, (sewPipeY - top) * 0.4);
    const elbowY = top + drop;
    [{ cx: tank1CX, dir: -1 }, { cx: tank2CX, dir: 1 }].forEach(({ cx, dir }) => {
      const endX = cx + dir * 70;
      // vertical stub down from tank bottom (stops well short of the sewer)
      ctx.fillStyle = "#0c1c28"; ctx.fillRect(cx-4, top, 8, drop);
      ctx.strokeStyle = "rgba(0,185,150,0.18)"; ctx.lineWidth = 1; ctx.strokeRect(cx-4, top, 8, drop);
      // horizontal arm OUTWARD toward the frame edge (leaving the system)
      const x0 = dir < 0 ? endX : cx - 4;
      const w  = Math.abs(endX - cx) + 4;
      ctx.fillStyle = "#0c1c28"; ctx.fillRect(x0, elbowY-4, w, 8);
      ctx.strokeStyle = "rgba(0,185,150,0.18)"; ctx.strokeRect(x0, elbowY-4, w, 8);
      // arrowhead at the outer end
      ctx.fillStyle = `rgba(0,205,160,${0.5 + a*0.4})`;
      ctx.beginPath();
      ctx.moveTo(endX + dir*8, elbowY);
      ctx.lineTo(endX, elbowY-5);
      ctx.lineTo(endX, elbowY+5);
      ctx.closePath(); ctx.fill();
      // green droplets: down the stub, then outward
      if (a > 0.05) {
        for (let i=0;i<3;i++) {
          const dp = ((t*0.014 + i*0.34) % 1);
          let px: number, py: number;
          if (dp < 0.4) { px = cx; py = top + (dp/0.4)*drop; }
          else { const hp = (dp-0.4)/0.6; px = cx + dir*hp*Math.abs(endX-cx); py = elbowY; }
          ctx.fillStyle = `rgba(0,210,160,${a*(1-dp*0.3)})`;
          ctx.beginPath(); ctx.arc(px,py,2,0,Math.PI*2); ctx.fill();
        }
      }
    });
    // Label
    if (fillFrac > 0.06) {
      const midX = (tank1CX+tank2CX)/2;
      ctx.fillStyle = `rgba(0,210,165,${Math.min(fillFrac+0.2,0.85)})`;
      ctx.font = "bold 7px JetBrains Mono, monospace"; ctx.textAlign = "center";
      ctx.fillText("DIVERTED → REUSE / RECHARGE  (slow release, post-storm)", midX, elbowY + 15);
      ctx.textAlign = "left";
    }
  }

  // ── FLOW PARTICLES ────────────────────────────────────────────────────────
  function drawParticles(
    ctx: CanvasRenderingContext2D,
    ref: MutableRefObject<Particle[]>,
    W: number,
    drainX: number, collY: number, collPipeH: number,
    sewPipeY: number, sewPipeH: number,
    tank1CX: number, tank2CX: number,
    tankY: number, tankH: number,
    sewUtil: number, isStressed: boolean,
    valveAmt: number, prog: number, t: number
  ) {
    const pL = W*0.05;

    // Sewer pipe flow particles (left of centre)
    if (prog > 0.06 && Math.random() < Math.min(sewUtil*0.6,0.6)) {
      ref.current.push({
        x: pL + Math.random()*(drainX - pL),
        y: sewPipeY + sewPipeH * (1 - Math.min(sewUtil,1)) + Math.random()*sewPipeH*Math.min(sewUtil,1)*0.8,
        vx: 1.5*(isStressed && valveAmt < 0.4 ? 2.2 : 0.7),
        vy: 0, life: 0, maxLife: 60, r: 2,
        col: isStressed && valveAmt < 0.4 ? "rgba(210,55,55,{a})" : "rgba(0,160,250,{a})",
        route: 0,
      });
    }

    // Tank fill particles (drop into tank from inlet shaft)
    if (valveAmt > 0.10) {
      [tank1CX, tank2CX].forEach((cx, ri) => {
        if (Math.random() < valveAmt * 0.15) {
          ref.current.push({
            x: cx + (Math.random()-0.5)*5,
            y: collY + collPipeH + 4,
            vx: (Math.random()-0.5)*0.4,
            vy: 1.8 + Math.random(),
            life: 0, maxLife: 55, r: 2.2,
            col: "rgba(0,205,155,{a})",
            route: ri+1,
          });
        }
      });
    }

    ref.current = ref.current.filter(p => {
      p.x += p.vx; p.y += p.vy; p.life++;
      if (p.route === 0 && p.x > drainX) return false;
      if (p.route > 0 && p.y > tankY + tankH*0.85) return false;
      if (p.life > p.maxLife) return false;
      const a = (1 - p.life/p.maxLife) * 0.68 * Math.min(prog*3,1);
      ctx.fillStyle = p.col.replace("{a}", String(a));
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      return true;
    });
    void t;
  }

  // ── LABELS & HUD ──────────────────────────────────────────────────────────
  function drawLabels(
    ctx: CanvasRenderingContext2D,
    W: number, H: number, roadTop: number, _ugTop: number,
    drainX: number, collY: number,
    sewPipeY: number, sewPipeH: number, sensorX: number,
    tank1X: number, tank2X: number, tankW: number,
    tankY: number, tankH: number, tank1CX: number, tank2CX: number,
    pipeDispPct: number, overflowGPM: number, divertedGPM: number, storagePct: number,
    valveAmt: number, isStressed: boolean,
    step: number, prog: number, t: number
  ) {
    const mono = "JetBrains Mono, monospace";
    const pulse = 0.88 + Math.sin(t*0.10)*0.12;

    // ── Title ──
    ctx.fillStyle = "rgba(0,215,240,0.92)"; ctx.font = `bold 9px ${mono}`; ctx.textAlign = "right";
    ctx.fillText("DISTRIBUTED SMART STORAGE — 6-TANK NETWORK → DIVERT TO REUSE / RECHARGE", W-12, 18);
    ctx.textAlign = "left";

    // ── Section label on street ──
    ctx.fillStyle = "rgba(160,160,185,0.65)"; ctx.font = `bold 9px ${mono}`; ctx.textAlign = "center";
    ctx.fillText("STORMWATER RUNOFF FLOWS TO CENTRAL STORM DRAIN", W/2, roadTop+12);
    ctx.textAlign = "left";

    // ── Sewer pipe status ──
    const pipeLabel = isStressed && valveAmt < 0.5
      ? `SEWER PIPE — ${pipeDispPct}% CAPACITY  ⚠ OVERLOADED`
      : valveAmt > 0.5
        ? `SEWER PIPE — ${pipeDispPct}% CAPACITY  ✓ NORMAL`
        : `SEWER PIPE — ${pipeDispPct}% CAPACITY`;
    const pipeA = isStressed && valveAmt < 0.5 ? (0.80+Math.sin(t*0.18)*0.18) : 0.82;
    ctx.fillStyle = isStressed && valveAmt < 0.5
      ? `rgba(239,100,68,${pipeA})`
      : "rgba(0,210,130,0.82)";
    ctx.font = `bold 9px ${mono}`;
    ctx.fillText(pipeLabel, W*0.06, sewPipeY + sewPipeH + 14);

    // Reduction arrow on sewer pipe
    if (valveAmt > 0.25) {
      const arrA = Math.min((valveAmt-0.25)*2.5,1);
      const ghostY = sewPipeY + sewPipeH * 0.02;
      const actualY = sewPipeY + sewPipeH * (1 - Math.min(pipeDispPct/100,1));
      const arrX = W*0.10;
      ctx.strokeStyle = `rgba(0,225,140,${arrA*0.85})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(arrX,ghostY); ctx.lineTo(arrX,actualY+2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(arrX-4,ghostY+4); ctx.lineTo(arrX,ghostY); ctx.lineTo(arrX+4,ghostY+4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(arrX-4,actualY-4); ctx.lineTo(arrX,actualY+2); ctx.lineTo(arrX+4,actualY-4); ctx.stroke();
      ctx.fillStyle = `rgba(0,230,150,${arrA*0.92})`; ctx.font = `bold 8px ${mono}`;
      ctx.fillText(`${Math.round(valveAmt*14)}%`, arrX+5, (ghostY+actualY)/2+4);
      ctx.fillText("less", arrX+5, (ghostY+actualY)/2+14);
    }

    // ── Sensor label ──
    ctx.fillStyle = isStressed ? `rgba(239,100,68,${0.70+Math.sin(t*0.18)*0.18})` : "rgba(0,200,240,0.55)";
    ctx.font = `7px ${mono}`; ctx.textAlign = "center";
    ctx.fillText("FLOW SENSOR", sensorX, sewPipeY - 55);
    ctx.textAlign = "left";

    // ── Tank fill status ──
    const tankMidX = (tank1CX + tank2CX) / 2;
    const statusText = valveAmt > 0.9
      ? "PEAK CAPTURED — SLOW RELEASE TO REUSE / RECHARGE"
      : valveAmt > 0.05
        ? "FILLING — PEAK OVERSHOOT DIVERTED OUT OF SEWER"
        : "STANDBY — AWAITING ACTIVATION";
    ctx.fillStyle = valveAmt > 0.05 ? "rgba(0,200,240,0.82)" : "rgba(80,130,155,0.55)";
    ctx.font = `bold 8px ${mono}`; ctx.textAlign = "center";
    ctx.fillText(statusText, tankMidX, tankY + tankH + 34);
    ctx.textAlign = "left";

    // ── "Pipe under capacity" tag ──
    if (valveAmt > 0.65) {
      const pcA = Math.min((valveAmt-0.65)*3,1);
      ctx.fillStyle = `rgba(0,230,150,${pcA*0.80})`; ctx.font = `bold 7px ${mono}`; ctx.textAlign = "right";
      ctx.fillText("PIPE UNDER CAPACITY  ✓", W*0.94, sewPipeY + sewPipeH*0.55);
      ctx.textAlign = "left";
    }

    // ── Key message ──
    if (valveAmt > 0.5) {
      const kmA = Math.min((valveAmt-0.5)*2.5,1);
      const kmW = Math.min(W*0.44, 320);
      const kmX = W/2 - kmW/2, kmY = H - 50;
      ctx.fillStyle = `rgba(4,14,28,${kmA*0.88})`;
      ctx.beginPath(); rrPath(ctx,kmX,kmY,kmW,38,5); ctx.fill();
      ctx.strokeStyle = `rgba(0,210,150,${kmA*0.28})`; ctx.lineWidth = 1;
      ctx.beginPath(); rrPath(ctx,kmX,kmY,kmW,38,5); ctx.stroke();
      ctx.fillStyle = `rgba(0,215,155,${kmA*0.88})`; ctx.font = `bold 8px ${mono}`; ctx.textAlign = "center";
      ctx.fillText("KEY INSIGHT", W/2, kmY+13);
      ctx.fillStyle = `rgba(160,210,230,${kmA*0.82})`; ctx.font = `7px ${mono}`;
      ctx.fillText("Peak stormwater is captured at the source and diverted OUT of the sewer to reuse & recharge.", W/2, kmY+26);
      ctx.fillText("It permanently removes ~14% of runoff — pipe drops 105% → 90% (an honest, safe start).", W/2, kmY+36);
      ctx.textAlign = "left";
    }

    // ── Metrics panel (top-right) ──
    const mx = W-228, my = 26;
    ctx.fillStyle = "rgba(4,14,28,0.92)";
    ctx.beginPath(); rrPath(ctx,mx,my,220,116,5); ctx.fill();
    ctx.strokeStyle = "rgba(0,200,220,0.22)"; ctx.lineWidth = 1;
    ctx.beginPath(); rrPath(ctx,mx,my,220,116,5); ctx.stroke();
    ctx.fillStyle = "rgba(140,215,235,0.82)"; ctx.font = `bold 8px ${mono}`;
    ctx.fillText("SMART STORAGE NETWORK", mx+10, my+13);

    const isNormal = valveAmt > 0.70;
    [
      { label:"PIPE UTILIZATION",  val:`${pipeDispPct}%`,                           bar:Math.min(pipeDispPct/105,1),  col: isStressed && valveAmt<0.5 ? "rgba(239,130,68,0.95)" : "rgba(0,215,245,0.95)" },
      { label:"OVERFLOW",          val: overflowGPM>0 ? `${overflowGPM.toLocaleString()} gal/min` : "0  ✓", bar:overflowGPM/2200, col: overflowGPM>0 ? "rgba(239,130,68,0.95)" : "rgba(0,225,140,0.92)" },
      { label:"DIVERTED (~14%)",   val: divertedGPM>0 ? `${divertedGPM.toLocaleString()} gal/min` : "—",    bar:divertedGPM/6500, col:"rgba(0,210,155,0.90)" },
      { label:"STORAGE UTILIZED",  val:`${storagePct}%`,                            bar:storagePct/90,                col:"rgba(0,200,220,0.90)" },
      { label:"FLOOD RISK",        val: isNormal ? "Low  ✓" : isStressed ? "Very High  ⚠" : "High", bar: isNormal ? 0.12 : isStressed ? 0.96 : 0.60, col: isNormal ? "rgba(0,225,140,0.92)" : isStressed ? "rgba(239,130,68,0.95)" : "rgba(245,158,11,0.92)" },
    ].forEach((m,i) => {
      const ry = my+28+i*18;
      ctx.fillStyle = "rgba(80,145,170,0.70)"; ctx.font = `7px ${mono}`; ctx.fillText(m.label, mx+10, ry);
      const bW=56, bX=mx+154;
      ctx.fillStyle = "rgba(0,175,210,0.10)"; ctx.beginPath(); rrPath(ctx,bX,ry-7,bW,5,2); ctx.fill();
      const barFill = Math.max(Math.min(m.bar,1)*bW, m.bar>0?2:0);
      ctx.fillStyle = m.col; ctx.globalAlpha = pulse;
      ctx.beginPath(); rrPath(ctx,bX,ry-7,barFill,5,2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = m.col; ctx.font = `bold 8px ${mono}`; ctx.textAlign = "right";
      ctx.fillText(m.val, mx+214, ry); ctx.textAlign = "left";
    });

    // ── 8-step flow panel (top-left) ──
    const steps = [
      { l:"RAIN → STORM DRAIN",      c:"rgba(120,195,255,0.85)" },
      { l:"PIPE FILLS — SENSOR ALERT", c: isStressed ? "rgba(239,130,68,0.95)" : "rgba(0,220,240,0.82)" },
      { l:"SMART VALVE OPENS",        c: valveAmt>0.1 ? "rgba(0,225,140,0.92)" : "rgba(80,130,155,0.70)" },
      { l:"DIVERTED OUT (REUSE)",     c: valveAmt>0.3 ? "rgba(0,210,155,0.90)" : "rgba(80,130,155,0.70)" },
      { l:"6-TANK NETWORK FILLS",     c: storagePct>3  ? "rgba(0,195,240,0.90)" : "rgba(80,130,155,0.70)" },
      { l:"SEWER DROPS 105→90%",      c: valveAmt>0.6  ? "rgba(0,200,130,0.90)" : "rgba(80,130,155,0.70)" },
      { l:"OVERFLOW STOPPED",         c: overflowGPM===0 && prog>0.5 ? "rgba(0,220,150,0.92)" : "rgba(80,130,155,0.70)" },
      { l:"PIPE AT SAFE 90%",         c: step>=8 ? "rgba(0,225,140,0.95)" : "rgba(80,130,155,0.70)" },
    ];

    ctx.fillStyle = "rgba(4,14,28,0.88)";
    ctx.beginPath(); rrPath(ctx,10,22,178,150,5); ctx.fill();
    ctx.strokeStyle = "rgba(0,200,220,0.18)"; ctx.lineWidth = 1;
    ctx.beginPath(); rrPath(ctx,10,22,178,150,5); ctx.stroke();

    steps.forEach((s,i) => {
      const isActive = step===i+1;
      const stepY = 38+i*17;
      ctx.fillStyle = isActive ? s.c : "rgba(55,95,115,0.65)";
      ctx.font = `${isActive ? "bold " : ""}8px ${mono}`;
      ctx.fillText(`${i+1}.`, 18, stepY);
      ctx.fillText(s.l, 30, stepY);
      if (i < steps.length-1) {
        ctx.fillStyle = "rgba(0,200,220,0.28)"; ctx.font = "8px sans-serif";
        ctx.fillText("↓", 50, stepY+6);
      }
    });

    void roadTop; void drainX; void collY; void tank1X; void tank2X; void tankW; void H;
  }

  return (
    <div ref={elRef} style={{ width:"100%", height:"100%", position:"relative" }}>
      <canvas ref={cvRef} style={{ position:"absolute", inset:0, display:"block" }} />
    </div>
  );
}
