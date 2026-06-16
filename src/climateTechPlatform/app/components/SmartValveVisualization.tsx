import { useEffect, useRef } from "react";

interface Props {
  isPlaying: boolean;
  speed: number;
  timelineValue: number;
}

type Drop = { x: number; y: number; spd: number; len: number; op: number };
type FlowParticle = { x: number; y: number; targetX: number; targetY: number; progress: number; speed: number; route: number };

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

export function SmartValveVisualization({ isPlaying, speed, timelineValue }: Props) {
  const cvRef   = useRef<HTMLCanvasElement>(null);
  const elRef   = useRef<HTMLDivElement>(null);
  const rafRef  = useRef(0);
  const tRef    = useRef(0);
  const rainRef = useRef<Drop[]>([]);
  const flowRef = useRef<FlowParticle[]>([]);

  useEffect(() => {
    const el = elRef.current, cv = cvRef.current;
    if (!el || !cv) return;
    const ro = new ResizeObserver(() => {
      cv.width = el.clientWidth; cv.height = el.clientHeight;
      rainRef.current = []; flowRef.current = [];
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
    function frame() {
      if (!cv || !ctx) return;
      if (isPlaying) tRef.current += speed;
      render(ctx, cv.width, cv.height, tRef.current, timelineValue / 100);
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, speed, timelineValue]);

  function render(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, prog: number) {
    ctx.clearRect(0, 0, W, H);

    // ── Layout ────────────────────────────────────────────────────────────
    // 0 → skyBot:    sky + buildings
    // skyBot → roadBot: street + sidewalk
    // roadBot → H:   underground infrastructure
    const skyBot   = Math.floor(H * 0.30);
    const roadH    = Math.floor(H * 0.12);
    const roadTop  = skyBot;
    const roadBot  = roadTop + roadH;
    const swkH     = 8;
    const ugTop    = roadBot + swkH;

    // Smart valve activates after prog > 0.25
    const valveOpen = prog > 0.25;
    // Valve openness 0→1 over prog 0.25→0.45
    const valveAmt  = valveOpen ? Math.min((prog - 0.25) / 0.20, 1) : 0;

    // Underground geometry
    // Main pipe runs horizontally through centre
    const mainPipeY  = ugTop + Math.floor((H - ugTop) * 0.28);
    const mainPipeH  = Math.max(Math.floor((H - ugTop) * 0.16), 22);
    // Bypass pipe runs below main, connected via valve junction
    const bypassPipeY = mainPipeY + mainPipeH + Math.floor((H - ugTop) * 0.14);
    const bypassPipeH = Math.max(Math.floor((H - ugTop) * 0.12), 18);
    // Junction x where valve sits (centre-left)
    const juncX = Math.floor(W * 0.45);
    // Sensor x (left of junction)
    const sensorX = Math.floor(W * 0.24);
    // Bypass re-entry x (right of junction)
    const reentryX = Math.floor(W * 0.72);

    drawSky(ctx, W, skyBot, t);
    drawBuildings(ctx, W, skyBot, roadTop, t);
    drawRain(ctx, W, roadTop, t);
    drawStreet(ctx, W, roadTop, roadH, roadBot, swkH, t, prog);
    drawUnderground(ctx, W, ugTop, H);
    drawInletShaft(ctx, W, roadBot, swkH, ugTop, mainPipeY, mainPipeH, t, prog);
    drawMainPipe(ctx, W, ugTop, mainPipeY, mainPipeH, juncX, sensorX, valveAmt, prog, t);
    drawBypassPipe(ctx, W, juncX, reentryX, mainPipeY, mainPipeH, bypassPipeY, bypassPipeH, valveAmt, t);
    drawSensor(ctx, sensorX, mainPipeY, mainPipeH, prog, valveOpen, t);
    drawValve(ctx, juncX, mainPipeY, mainPipeH, bypassPipeY, bypassPipeH, valveAmt, t);
    drawFlowParticles(ctx, W, ugTop, mainPipeY, mainPipeH, bypassPipeY, bypassPipeH, juncX, reentryX, valveAmt, prog, t);
    drawLabels(ctx, W, H, ugTop, mainPipeY, mainPipeH, bypassPipeY, bypassPipeH, juncX, sensorX, reentryX, valveAmt, prog, t);
  }

  // ── SKY ──────────────────────────────────────────────────────────────────
  function drawSky(ctx: CanvasRenderingContext2D, W: number, skyBot: number, t: number) {
    const g = ctx.createLinearGradient(0, 0, 0, skyBot);
    g.addColorStop(0, "#060e1e"); g.addColorStop(1, "#0d1e2c");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, skyBot);
    [{ bx:W*0.08,y:16,r:54 },{ bx:W*0.33,y:10,r:70 },{ bx:W*0.62,y:20,r:56 },{ bx:W*0.86,y:13,r:46 }].forEach(c => {
      const cx = (c.bx + t*0.018) % (W+120) - 60;
      const gr = ctx.createRadialGradient(cx, c.y, 0, cx, c.y, c.r);
      gr.addColorStop(0, "rgba(8,20,40,0.96)"); gr.addColorStop(0.7, "rgba(5,14,28,0.72)"); gr.addColorStop(1, "rgba(2,8,16,0)");
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(cx, c.y, c.r*1.8, c.r*0.65, 0, 0, Math.PI*2); ctx.fill();
    });
  }

  // ── BUILDINGS ────────────────────────────────────────────────────────────
  function drawBuildings(ctx: CanvasRenderingContext2D, W: number, skyBot: number, roadTop: number, t: number) {
    [{ x:W*0.02,w:50,h:88 },{ x:W*0.12,w:38,h:66 },{ x:W*0.66,w:54,h:100 },{ x:W*0.76,w:34,h:62 },{ x:W*0.88,w:44,h:80 }].forEach(b => {
      const by = roadTop - b.h;
      const bg = ctx.createLinearGradient(b.x, by, b.x+b.w, by);
      bg.addColorStop(0,"#0a1828"); bg.addColorStop(0.5,"#0d2035"); bg.addColorStop(1,"#071520");
      ctx.fillStyle = bg; ctx.fillRect(b.x, by, b.w, b.h);
      [0.22,0.50,0.72].forEach(yf => {
        ctx.fillStyle = Math.sin(t*0.018+b.x*0.01) > 0.86 ? "rgba(0,212,216,0.5)" : "rgba(255,215,85,0.22)";
        ctx.fillRect(b.x+6, by+b.h*yf, 8, 6);
        ctx.fillStyle = "rgba(255,215,85,0.18)"; ctx.fillRect(b.x+b.w-14, by+b.h*yf, 8, 6);
      });
      ctx.strokeStyle = "rgba(0,212,216,0.06)"; ctx.lineWidth = 1; ctx.strokeRect(b.x, by, b.w, b.h);
    });
    void skyBot;
  }

  // ── RAIN ─────────────────────────────────────────────────────────────────
  function drawRain(ctx: CanvasRenderingContext2D, W: number, maxY: number, _t: number) {
    if (rainRef.current.length === 0)
      for (let i=0; i<150; i++)
        rainRef.current.push({ x:Math.random()*W, y:Math.random()*maxY, spd:7+Math.random()*6, len:10+Math.random()*13, op:0.28+Math.random()*0.5 });
    rainRef.current.forEach(d => {
      d.y += d.spd; if (d.y > maxY+20) { d.y = -20; d.x = Math.random()*W; }
      ctx.strokeStyle = `rgba(100,180,255,${d.op})`; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x-1.5, d.y+d.len); ctx.stroke();
    });
  }

  // ── STREET ────────────────────────────────────────────────────────────────
  function drawStreet(ctx: CanvasRenderingContext2D, W: number, roadTop: number, roadH: number, roadBot: number, swkH: number, t: number, _prog: number) {
    const rg = ctx.createLinearGradient(0, roadTop, 0, roadBot);
    rg.addColorStop(0,"#111820"); rg.addColorStop(1,"#0d1520");
    ctx.fillStyle = rg; ctx.fillRect(0, roadTop, W, roadH);
    ctx.strokeStyle = "rgba(255,200,0,0.18)"; ctx.lineWidth = 1.2; ctx.setLineDash([18,14]);
    ctx.beginPath(); ctx.moveTo(0, roadTop+roadH/2); ctx.lineTo(W, roadTop+roadH/2); ctx.stroke();
    ctx.setLineDash([]);
    // Vehicles
    const carX = W*0.30, carY = roadTop+4;
    ctx.fillStyle = "#0d2035"; ctx.beginPath(); rrPath(ctx,carX,carY,42,14,2); ctx.fill();
    ctx.fillStyle = "#0a1828"; ctx.beginPath(); rrPath(ctx,carX+6,carY-9,28,10,2); ctx.fill();
    ctx.fillStyle = "rgba(255,220,100,0.5)";
    ctx.beginPath(); ctx.arc(carX+3,carY+7,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(carX+39,carY+7,2,0,Math.PI*2); ctx.fill();
    // Sidewalk
    ctx.fillStyle = "#1a2535"; ctx.fillRect(0, roadBot, W, swkH);
    // Storm drain grate
    const drainX = Math.floor(W*0.46);
    ctx.fillStyle = "#0e1824"; ctx.fillRect(drainX-11, roadBot-1, 22, swkH+3);
    ctx.strokeStyle = "rgba(0,200,220,0.32)"; ctx.lineWidth = 1;
    ctx.strokeRect(drainX-11, roadBot-1, 22, swkH+3);
    for (let gi=0;gi<4;gi++) { ctx.beginPath(); ctx.moveTo(drainX-11,roadBot+1+gi*2.2); ctx.lineTo(drainX+11,roadBot+1+gi*2.2); ctx.stroke(); }
    // Animated runoff to drain
    ctx.strokeStyle = `rgba(30,140,220,${0.3+Math.sin(t*0.1)*0.1})`; ctx.lineWidth = 1.5;
    ctx.setLineDash([6,6]); ctx.lineDashOffset = -(t*0.9);
    ctx.beginPath(); ctx.moveTo(W*0.12,roadBot-3); ctx.lineTo(drainX-8,roadBot-3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W*0.78,roadBot-3); ctx.lineTo(drainX+8,roadBot-3); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(0,200,220,0.40)"; ctx.font="7px JetBrains Mono, monospace"; ctx.textAlign="center";
    ctx.fillText("STORM DRAIN", drainX, roadBot-4);
    ctx.textAlign = "left";
    void t;
  }

  // ── UNDERGROUND SOIL ─────────────────────────────────────────────────────
  function drawUnderground(ctx: CanvasRenderingContext2D, W: number, ugTop: number, H: number) {
    const g = ctx.createLinearGradient(0, ugTop, 0, H);
    g.addColorStop(0,"#09130e"); g.addColorStop(0.4,"#070e0a"); g.addColorStop(1,"#050b07");
    ctx.fillStyle = g; ctx.fillRect(0, ugTop, W, H-ugTop);
    [0.20,0.45,0.68].forEach(f => {
      ctx.strokeStyle = "rgba(28,14,5,0.38)"; ctx.lineWidth = 0.5; ctx.setLineDash([5,9]);
      ctx.beginPath(); ctx.moveTo(0,ugTop+(H-ugTop)*f); ctx.lineTo(W,ugTop+(H-ugTop)*f); ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  // ── INLET SHAFT ───────────────────────────────────────────────────────────
  function drawInletShaft(ctx: CanvasRenderingContext2D, W: number, roadBot: number, swkH: number, ugTop: number, mainPipeY: number, mainPipeH: number, t: number, prog: number) {
    const drainX = Math.floor(W*0.46);
    const shaftTop = roadBot + swkH;
    const shaftBot = mainPipeY + mainPipeH*0.5;
    ctx.fillStyle = "#0d1c28"; ctx.fillRect(drainX-6, shaftTop, 12, shaftBot-shaftTop);
    ctx.strokeStyle = "rgba(0,180,220,0.18)"; ctx.lineWidth = 1;
    ctx.strokeRect(drainX-6, shaftTop, 12, shaftBot-shaftTop);
    // Drops
    for (let i=0;i<3;i++) {
      const dp = ((t*0.025+i*0.33)%1);
      const dy = shaftTop + dp*(shaftBot-shaftTop);
      ctx.fillStyle = `rgba(30,160,240,${Math.min(prog*2,0.8)*(1-dp*0.4)})`;
      ctx.beginPath(); ctx.arc(drainX, dy, 2.5, 0, Math.PI*2); ctx.fill();
    }
    void ugTop;
  }

  // ── MAIN PIPE ─────────────────────────────────────────────────────────────
  function drawMainPipe(ctx: CanvasRenderingContext2D, W: number, _ugTop: number, pipeY: number, pipeH: number, juncX: number, sensorX: number, valveAmt: number, prog: number, t: number) {
    const pipeR = pipeH/2;
    const left  = W*0.05;
    const right = W*0.95;

    // Pipe body (split: left of junction & right of junction)
    [
      { x: left,  w: juncX - left  },
      { x: juncX, w: right - juncX },
    ].forEach(seg => {
      const pg = ctx.createLinearGradient(0, pipeY, 0, pipeY+pipeH);
      pg.addColorStop(0,"#0d2035"); pg.addColorStop(0.4,"#102840"); pg.addColorStop(1,"#081828");
      ctx.fillStyle = pg; ctx.beginPath(); rrPath(ctx, seg.x, pipeY, seg.w, pipeH, pipeR); ctx.fill();
    });

    // Pipe border — red/stressed left of junction when high load, blue calm right
    const stress = prog * (1 - valveAmt);
    const lBorderCol = stress > 0.5
      ? `rgba(239,68,68,${0.35+Math.sin(t*0.18)*0.20})`
      : `rgba(0,155,255,${0.28+Math.sin(t*0.06)*0.07})`;
    ctx.strokeStyle = lBorderCol; ctx.lineWidth = 2;
    ctx.beginPath(); rrPath(ctx, left, pipeY, juncX-left, pipeH, pipeR); ctx.stroke();

    // Right of junction always calm blue
    ctx.strokeStyle = `rgba(0,155,255,${0.28+Math.sin(t*0.06)*0.07})`; ctx.lineWidth = 2;
    ctx.beginPath(); rrPath(ctx, juncX, pipeY, right-juncX, pipeH, pipeR); ctx.stroke();

    // Red glow on left pipe when overloaded
    if (stress > 0.4) {
      const gi = (stress-0.4)*1.6 * (0.7+Math.sin(t*0.22)*0.3);
      const gG = ctx.createLinearGradient(0, pipeY-6, 0, pipeY+pipeH+6);
      gG.addColorStop(0,"rgba(239,68,68,0)"); gG.addColorStop(0.5,`rgba(239,68,68,${gi*0.45})`); gG.addColorStop(1,"rgba(239,68,68,0)");
      ctx.strokeStyle = gG; ctx.lineWidth = 10;
      ctx.beginPath(); rrPath(ctx, left, pipeY, juncX-left, pipeH, pipeR); ctx.stroke();
    }
    // Blue glow right pipe
    const bG = ctx.createLinearGradient(0, pipeY-4, 0, pipeY+pipeH+4);
    bG.addColorStop(0,"rgba(0,155,255,0)"); bG.addColorStop(0.5,"rgba(0,155,255,0.11)"); bG.addColorStop(1,"rgba(0,155,255,0)");
    ctx.strokeStyle = bG; ctx.lineWidth = 7;
    ctx.beginPath(); rrPath(ctx, juncX, pipeY, right-juncX, pipeH, pipeR); ctx.stroke();

    // Water fill — left pipe: high when stressed, low after valve opens
    const leftFill = Math.min(prog * (1-valveAmt*0.65), 1);
    const rightFill = Math.min(prog * 0.28 + valveAmt*0.08, 0.38);
    drawPipeWater(ctx, left, pipeY, juncX-left, pipeH, pipeR, leftFill, stress > 0.5, t);
    drawPipeWater(ctx, juncX, pipeY, right-juncX, pipeH, pipeR, rightFill, false, t);

    // Sensor node on main pipe
    drawSensorNode(ctx, sensorX, pipeY, pipeH, prog, stress, t);

    // Pipe highlight
    ctx.fillStyle = "rgba(255,255,255,0.022)";
    ctx.beginPath(); rrPath(ctx, left+4, pipeY+2, right-left-8, 4, 2); ctx.fill();
  }

  function drawPipeWater(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, pr: number, fill: number, hot: boolean, t: number) {
    const wH = ph * Math.max(Math.min(fill,1), 0.03);
    const wY = py + ph - wH;
    ctx.save();
    ctx.beginPath(); rrPath(ctx, px, py, pw, ph, pr); ctx.clip();
    const wg = ctx.createLinearGradient(0, wY, 0, py+ph);
    if (hot) {
      wg.addColorStop(0,"rgba(220,50,50,0.20)"); wg.addColorStop(0.3,`rgba(200,40,40,${0.50+Math.sin(t*0.10)*0.08})`); wg.addColorStop(1,"rgba(180,30,30,0.70)");
    } else {
      wg.addColorStop(0,"rgba(0,170,255,0.18)"); wg.addColorStop(0.3,"rgba(0,150,240,0.52)"); wg.addColorStop(1,"rgba(0,120,210,0.70)");
    }
    ctx.fillStyle = wg; ctx.fillRect(px, wY, pw, wH);
    ctx.strokeStyle = hot ? "rgba(255,120,120,0.28)" : "rgba(100,215,255,0.28)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x=px; x<=px+pw; x+=2) {
      const ry = wY + Math.sin((x/28)+t*0.12)*1.1;
      x===px ? ctx.moveTo(x,ry) : ctx.lineTo(x,ry);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ── SENSOR NODE ──────────────────────────────────────────────────────────
  function drawSensorNode(ctx: CanvasRenderingContext2D, sx: number, pipeY: number, pipeH: number, prog: number, stress: number, t: number) {
    const cy = pipeY - 12;
    const alert = stress > 0.5;
    const pulse = 0.7 + Math.sin(t * (alert ? 0.22 : 0.07)) * 0.3;

    // Connector wire
    ctx.strokeStyle = `rgba(0,210,240,${0.3+pulse*0.2})`; ctx.lineWidth = 1.5;
    ctx.setLineDash([3,3]); ctx.lineDashOffset = -(t*0.5);
    ctx.beginPath(); ctx.moveTo(sx, pipeY); ctx.lineTo(sx, cy+7); ctx.stroke();
    ctx.setLineDash([]);

    // Body
    ctx.fillStyle = alert ? `rgba(239,68,68,${pulse*0.9})` : `rgba(0,200,240,${0.6+pulse*0.3})`;
    ctx.beginPath(); ctx.arc(sx, cy, 7, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = alert ? "rgba(255,120,80,0.80)" : "rgba(0,230,255,0.70)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(sx, cy, 7, 0, Math.PI*2); ctx.stroke();

    // Pulse ring
    if (prog > 0.08) {
      const ringR = 7 + pulse*8;
      ctx.strokeStyle = alert ? `rgba(239,68,68,${(1-pulse*0.7)*0.5})` : `rgba(0,220,255,${(1-pulse*0.6)*0.4})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(sx, cy, ringR, 0, Math.PI*2); ctx.stroke();
    }

    // Inner dot
    ctx.fillStyle = "#0a1828"; ctx.beginPath(); ctx.arc(sx, cy, 3, 0, Math.PI*2); ctx.fill();
  }

  // ── SENSOR ───────────────────────────────────────────────────────────────
  function drawSensor(ctx: CanvasRenderingContext2D, sx: number, pipeY: number, pipeH: number, prog: number, valveOpen: boolean, t: number) {
    if (prog < 0.08) return;
    const a = Math.min((prog-0.08)*4, 1);
    const sY = pipeY - 42;

    // Telemetry card
    ctx.fillStyle = `rgba(4,14,28,${a*0.92})`;
    ctx.beginPath(); rrPath(ctx, sx-52, sY, 104, 36, 4); ctx.fill();
    ctx.strokeStyle = valveOpen ? `rgba(0,225,140,${a*0.55})` : `rgba(239,100,68,${a*0.55})`; ctx.lineWidth = 1;
    ctx.beginPath(); rrPath(ctx, sx-52, sY, 104, 36, 4); ctx.stroke();

    // Left accent bar
    ctx.fillStyle = valveOpen ? `rgba(0,225,140,${a*0.8})` : `rgba(239,68,68,${a*0.8})`;
    ctx.beginPath(); rrPath(ctx, sx-52, sY+4, 3, 28, 1); ctx.fill();

    const mono = "JetBrains Mono, monospace";
    ctx.fillStyle = `rgba(100,175,200,${a*0.70})`; ctx.font = `6px ${mono}`;
    ctx.fillText("FLOW SENSOR", sx-44, sY+12);
    ctx.fillStyle = valveOpen ? `rgba(0,225,140,${a*0.92})` : `rgba(239,100,68,${a*0.92})`;
    ctx.font = `bold 9px ${mono}`;
    ctx.fillText(valveOpen ? "NORMAL FLOW" : "⚠ HIGH LOAD", sx-44, sY+24);

    // Signal line
    ctx.strokeStyle = `rgba(0,210,240,${a*0.35})`; ctx.lineWidth = 1;
    ctx.setLineDash([3,4]); ctx.lineDashOffset = -(t*0.4);
    ctx.beginPath(); ctx.moveTo(sx, sY+36); ctx.lineTo(sx, pipeY-18); ctx.stroke();
    ctx.setLineDash([]);
    void pipeH;
  }

  // ── BYPASS PIPE + VALVE JUNCTION ─────────────────────────────────────────
  function drawBypassPipe(
    ctx: CanvasRenderingContext2D, W: number,
    juncX: number, reentryX: number,
    mainPipeY: number, mainPipeH: number,
    bypassY: number, bypassH: number,
    valveAmt: number, t: number
  ) {
    if (valveAmt < 0.01) return;
    const bypassR = bypassH / 2;
    const alpha = valveAmt;

    // Vertical drop from junction to bypass
    const dropX = juncX - mainPipeH*0.4;
    const dropTop = mainPipeY + mainPipeH;
    const dropBot = bypassY;
    ctx.fillStyle = `rgba(12,28,44,${alpha*0.95})`;
    ctx.fillRect(dropX-6, dropTop, 13, dropBot-dropTop);
    ctx.strokeStyle = `rgba(0,220,160,${alpha*0.35})`; ctx.lineWidth = 1;
    ctx.strokeRect(dropX-6, dropTop, 13, dropBot-dropTop);

    // Bypass pipe body
    const pg = ctx.createLinearGradient(0, bypassY, 0, bypassY+bypassH);
    pg.addColorStop(0,"#0c2030"); pg.addColorStop(0.4,"#0e2840"); pg.addColorStop(1,"#081828");
    ctx.fillStyle = pg; ctx.globalAlpha = alpha;
    ctx.beginPath(); rrPath(ctx, juncX-mainPipeH*0.4-6, bypassY, reentryX-(juncX-mainPipeH*0.4-6)+mainPipeH*0.4, bypassH, bypassR); ctx.fill();
    ctx.globalAlpha = 1;

    // Bypass border — teal/green (reroute colour)
    ctx.strokeStyle = `rgba(0,220,160,${alpha*0.55+Math.sin(t*0.08)*0.1})`; ctx.lineWidth = 1.8;
    ctx.beginPath(); rrPath(ctx, juncX-mainPipeH*0.4-6, bypassY, reentryX-(juncX-mainPipeH*0.4-6)+mainPipeH*0.4, bypassH, bypassR); ctx.stroke();

    // Green glow
    const gG = ctx.createLinearGradient(0, bypassY-4, 0, bypassY+bypassH+4);
    gG.addColorStop(0,"rgba(0,220,160,0)"); gG.addColorStop(0.5,`rgba(0,220,160,${alpha*0.14})`); gG.addColorStop(1,"rgba(0,220,160,0)");
    ctx.strokeStyle = gG; ctx.lineWidth = 8;
    ctx.beginPath(); rrPath(ctx, juncX-mainPipeH*0.4-6, bypassY, reentryX-(juncX-mainPipeH*0.4-6)+mainPipeH*0.4, bypassH, bypassR); ctx.stroke();

    // Bypass water fill
    const wH = bypassH * Math.min(valveAmt * 0.60, 0.60);
    const wY = bypassY + bypassH - wH;
    if (wH > 2) {
      ctx.save();
      ctx.beginPath(); rrPath(ctx, juncX-mainPipeH*0.4-6, bypassY, reentryX-(juncX-mainPipeH*0.4-6)+mainPipeH*0.4, bypassH, bypassR); ctx.clip();
      const wg = ctx.createLinearGradient(0,wY,0,bypassY+bypassH);
      wg.addColorStop(0,"rgba(0,200,160,0.18)"); wg.addColorStop(0.3,`rgba(0,185,150,${alpha*0.50})`); wg.addColorStop(1,"rgba(0,160,130,0.65)");
      ctx.fillStyle = wg; ctx.fillRect(juncX-mainPipeH*0.4-14, wY, reentryX+mainPipeH*0.4+14, wH);
      ctx.strokeStyle = "rgba(80,230,190,0.28)"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x=juncX-20; x<=reentryX+20; x+=2) {
        const ry = wY+Math.sin((x/26)+t*0.14)*1;
        x===juncX-20 ? ctx.moveTo(x,ry) : ctx.lineTo(x,ry);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Vertical re-entry from bypass up to main pipe
    const reTop = mainPipeY + mainPipeH;
    const reBot = bypassY;
    ctx.fillStyle = `rgba(12,28,44,${alpha*0.95})`;
    ctx.fillRect(reentryX-6, reTop, 13, reBot-reTop);
    ctx.strokeStyle = `rgba(0,220,160,${alpha*0.35})`; ctx.lineWidth = 1;
    ctx.strokeRect(reentryX-6, reTop, 13, reBot-reTop);

    // Flow arrows on bypass label
    ctx.fillStyle = `rgba(0,220,160,${alpha*0.75})`; ctx.font = `bold 7px JetBrains Mono, monospace`; ctx.textAlign = "center";
    ctx.fillText("BYPASS ROUTE — EXCESS FLOW REROUTED ›", (juncX + reentryX)/2, bypassY + bypassH/2 + 4);
    ctx.textAlign = "left";
    void W;
  }

  // ── VALVE ────────────────────────────────────────────────────────────────
  function drawValve(
    ctx: CanvasRenderingContext2D,
    juncX: number, mainPipeY: number, mainPipeH: number,
    bypassY: number, bypassH: number,
    valveAmt: number, t: number
  ) {
    const vx = juncX;
    const vy = mainPipeY + mainPipeH/2;
    const vr = mainPipeH * 0.62;
    const isOpen = valveAmt > 0.05;
    const col = isOpen ? "rgba(0,225,140,1)" : "rgba(239,68,68,1)";
    const pulse = 0.82 + Math.sin(t * (isOpen ? 0.06 : 0.18)) * 0.18;

    // Outer ring
    ctx.strokeStyle = col.replace("1)", `${pulse*0.7})`); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(vx, vy, vr, 0, Math.PI*2); ctx.stroke();

    // Body fill
    const vg = ctx.createRadialGradient(vx, vy, 0, vx, vy, vr);
    vg.addColorStop(0, isOpen ? "rgba(0,80,60,0.7)" : "rgba(80,15,10,0.7)");
    vg.addColorStop(1, isOpen ? "rgba(0,40,35,0.4)" : "rgba(50,10,8,0.4)");
    ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(vx, vy, vr-1, 0, Math.PI*2); ctx.fill();

    // Valve gate (rotating disc)
    const angle = (1-valveAmt) * Math.PI/2; // 90° = closed, 0° = open
    ctx.save();
    ctx.translate(vx, vy);
    ctx.rotate(angle);
    ctx.strokeStyle = col.replace("1)", `${pulse*0.85})`); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, -(vr-3)); ctx.lineTo(0, vr-3); ctx.stroke();
    ctx.restore();

    // Pulse ring
    ctx.strokeStyle = col.replace("1)", `${(1-pulse)*0.5})`); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(vx, vy, vr + 4 + pulse*6, 0, Math.PI*2); ctx.stroke();

    // "VALVE" label below
    ctx.fillStyle = col.replace("1)", `${pulse*0.80})`);
    ctx.font = "bold 7px JetBrains Mono, monospace"; ctx.textAlign = "center";
    ctx.fillText(isOpen ? "VALVE OPEN" : "VALVE CLOSED", vx, vy + vr + 12);
    ctx.textAlign = "left";

    // Connecting line to bypass
    if (valveAmt > 0.01) {
      const lineA = valveAmt * 0.6;
      ctx.strokeStyle = `rgba(0,225,140,${lineA})`; ctx.lineWidth = 1.5;
      ctx.setLineDash([3,4]); ctx.lineDashOffset = -(t*0.6);
      ctx.beginPath(); ctx.moveTo(vx, vy+vr); ctx.lineTo(vx, bypassY+bypassH/2); ctx.stroke();
      ctx.setLineDash([]);
    }
    void bypassY; void bypassH;
  }

  // ── FLOW PARTICLES ───────────────────────────────────────────────────────
  function drawFlowParticles(
    ctx: CanvasRenderingContext2D, W: number,
    _ugTop: number,
    mainPipeY: number, mainPipeH: number,
    bypassY: number, bypassH: number,
    juncX: number, reentryX: number,
    valveAmt: number, prog: number, t: number
  ) {
    const left = W*0.05;
    const right = W*0.95;

    // Spawn main-pipe particles (left of junction — high density when stressed)
    const stressDensity = Math.min(prog*1.4, 1) * (1 - valveAmt*0.65);
    if (flowRef.current.filter(p=>p.route===0).length < Math.floor(stressDensity*20)) {
      flowRef.current.push({ x: left, y: mainPipeY+mainPipeH*0.75, targetX: juncX, targetY: mainPipeY+mainPipeH*0.75, progress: Math.random(), speed: 0.006+Math.random()*0.006, route: 0 });
    }
    // Spawn post-junction particles (right of junction, always calm)
    if (flowRef.current.filter(p=>p.route===2).length < 6) {
      flowRef.current.push({ x: juncX, y: mainPipeY+mainPipeH*0.75, targetX: right, targetY: mainPipeY+mainPipeH*0.75, progress: Math.random(), speed: 0.004+Math.random()*0.003, route: 2 });
    }
    // Spawn bypass particles when valve open
    if (valveAmt > 0.1 && flowRef.current.filter(p=>p.route===1).length < Math.floor(valveAmt*14)) {
      flowRef.current.push({ x: juncX, y: bypassY+bypassH*0.75, targetX: reentryX, targetY: bypassY+bypassH*0.75, progress: Math.random(), speed: 0.007+Math.random()*0.005, route: 1 });
    }

    flowRef.current = flowRef.current.filter(p => {
      p.progress += p.speed;
      if (p.progress > 1) { p.progress = 0; return true; }
      const x = p.x + p.progress * (p.targetX - p.x);
      const y = p.y;
      const hot = p.route === 0 && (prog*(1-valveAmt*0.65)) > 0.55;
      const col = p.route === 1 ? `rgba(0,215,155,${0.55*(1-p.progress*0.2)})` :
                  hot ? `rgba(220,60,60,${0.55*(1-p.progress*0.2)})` :
                        `rgba(0,170,255,${0.45*(1-p.progress*0.2)})`;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI*2); ctx.fill();
      return true;
    });
    void t;
  }

  // ── LABELS & HUD ─────────────────────────────────────────────────────────
  function drawLabels(
    ctx: CanvasRenderingContext2D, W: number, H: number,
    _ugTop: number,
    mainPipeY: number, mainPipeH: number,
    bypassY: number, bypassH: number,
    juncX: number, sensorX: number, reentryX: number,
    valveAmt: number, prog: number, t: number
  ) {
    const mono = "JetBrains Mono, monospace";
    const pulse = 0.88 + Math.sin(t*0.10)*0.12;

    // ── Pipe util labels ──
    const leftFill  = Math.min(prog*(1-valveAmt*0.65), 1);
    const rightFill = Math.min(prog*0.28 + valveAmt*0.08, 0.38);
    const leftPct   = Math.round(leftFill * 100);
    const rightPct  = Math.round(rightFill * 100);
    const hot       = leftPct > 55;

    // Main pipe left label
    ctx.fillStyle = hot ? `rgba(239,100,68,${0.7+Math.sin(t*0.18)*0.2})` : "rgba(0,210,130,0.80)";
    ctx.font = `bold 9px ${mono}`;
    const leftLabel = hot ? `MAIN PIPE — ${leftPct}% CAPACITY  ⚠ HIGH LOAD` : `MAIN PIPE — ${leftPct}% CAPACITY  ✓ NORMAL`;
    ctx.fillText(leftLabel, W*0.06, mainPipeY + mainPipeH + 13);

    // Ghost "without smart valve" line
    const ghostFill = Math.min(prog, 1);
    const ghostY = mainPipeY + mainPipeH*(1 - ghostFill);
    if (prog > 0.18) {
      const ga = Math.min((prog-0.18)*3, 0.55);
      ctx.save();
      ctx.strokeStyle = `rgba(239,68,68,${ga})`; ctx.lineWidth = 1.5; ctx.setLineDash([7,4]);
      ctx.beginPath(); ctx.moveTo(W*0.06, ghostY); ctx.lineTo(juncX-4, ghostY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(239,68,68,${ga*0.80})`; ctx.font = `bold 7px ${mono}`; ctx.textAlign = "right";
      ctx.fillText("WITHOUT SMART VALVE", juncX-6, ghostY-3);
      ctx.textAlign = "left";
      ctx.restore();
    }

    // Reduction arrow
    if (valveAmt > 0.3) {
      const arrA = Math.min((valveAmt-0.3)*2.5, 1);
      const actualY = mainPipeY + mainPipeH*(1-leftFill);
      const arrX = W*0.10;
      ctx.strokeStyle = `rgba(0,225,140,${arrA*0.85})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(arrX, ghostY); ctx.lineTo(arrX, actualY+2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(arrX-4,ghostY+4); ctx.lineTo(arrX,ghostY); ctx.lineTo(arrX+4,ghostY+4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(arrX-4,actualY-4); ctx.lineTo(arrX,actualY+2); ctx.lineTo(arrX+4,actualY-4); ctx.stroke();
      ctx.fillStyle = `rgba(0,230,150,${arrA*0.92})`; ctx.font = `bold 8px ${mono}`;
      ctx.fillText(`${Math.round(valveAmt*65)}%`, arrX+5, (ghostY+actualY)/2+4);
      ctx.fillText("less", arrX+5, (ghostY+actualY)/2+14);
    }

    // Right pipe label
    ctx.fillStyle = "rgba(0,200,130,0.72)"; ctx.font = `bold 8px ${mono}`; ctx.textAlign = "right";
    ctx.fillText(`DOWNSTREAM PIPE — ${rightPct}% CAPACITY  ✓`, W*0.94, mainPipeY+mainPipeH+13);
    ctx.textAlign = "left";

    // Sensor label
    ctx.fillStyle = "rgba(0,200,240,0.55)"; ctx.font = `7px ${mono}`;
    ctx.fillText("FLOW SENSOR", sensorX-16, mainPipeY - 55);

    // Valve junction label
    ctx.fillStyle = "rgba(0,225,140,0.60)"; ctx.font = `7px ${mono}`; ctx.textAlign = "center";
    ctx.fillText("SMART", juncX, mainPipeY - 2);
    ctx.fillText("VALVE", juncX, mainPipeY + 7);
    ctx.textAlign = "left";

    // Reentry label
    ctx.fillStyle = "rgba(0,200,220,0.50)"; ctx.font = `7px ${mono}`; ctx.textAlign = "center";
    ctx.fillText("RE-ENTRY", reentryX, mainPipeY - 4);
    ctx.textAlign = "left";

    // Response time badge (appears once valve opens)
    if (valveAmt > 0.05) {
      const ba = Math.min(valveAmt*3, 1);
      const bx = juncX - 56, by2 = mainPipeY - 72;
      ctx.fillStyle = `rgba(4,14,28,${ba*0.92})`;
      ctx.beginPath(); rrPath(ctx, bx, by2, 112, 22, 4); ctx.fill();
      ctx.strokeStyle = `rgba(0,225,140,${ba*0.55})`; ctx.lineWidth = 1;
      ctx.beginPath(); rrPath(ctx, bx, by2, 112, 22, 4); ctx.stroke();
      ctx.fillStyle = `rgba(0,225,140,${ba*0.90})`; ctx.font = `bold 8px ${mono}`; ctx.textAlign = "center";
      ctx.fillText(`⚡ RESPONSE TIME: <200ms`, juncX, by2+14);
      ctx.textAlign = "left";
    }

    // Top-right mode label
    ctx.fillStyle = "rgba(0,215,240,0.92)"; ctx.font = `bold 9px ${mono}`; ctx.textAlign = "right";
    ctx.fillText("SMART VALVE — SENSOR DETECTION → VALVE ADJUSTMENT → CONTROLLED FLOW", W-12, 18);
    ctx.textAlign = "left";

    // ── Metrics card ──
    const rerouted = Math.round(valveAmt * 840);
    const overflowPrev = Math.round(valveAmt * 12400);
    const mx = W-220, my = 26;
    ctx.fillStyle = "rgba(4,14,28,0.92)";
    ctx.beginPath(); rrPath(ctx, mx, my, 212, 98, 5); ctx.fill();
    ctx.strokeStyle = "rgba(0,200,220,0.22)"; ctx.lineWidth = 1;
    ctx.beginPath(); rrPath(ctx, mx, my, 212, 98, 5); ctx.stroke();
    ctx.fillStyle = "rgba(140,215,235,0.82)"; ctx.font = `bold 8px ${mono}`;
    ctx.fillText("SMART VALVE PERFORMANCE", mx+10, my+13);

    [
      { label: "PIPE UTILIZATION",    val: `${leftPct}%`,                  bar: leftFill,          col: hot ? "rgba(239,130,68,0.95)" : "rgba(0,215,245,0.95)" },
      { label: "OVERFLOW PREVENTED",  val: `${overflowPrev.toLocaleString()} gal`, bar: valveAmt,  col: "rgba(0,225,140,0.92)" },
      { label: "WATER REROUTED",      val: `${rerouted} gal/min`,           bar: valveAmt*0.8,      col: "rgba(0,205,165,0.90)" },
      { label: "RESPONSE TIME",       val: valveAmt > 0.1 ? "<200ms" : "—", bar: valveAmt > 0.1 ? 1 : 0, col: "rgba(0,200,220,0.90)" },
    ].forEach((m, i) => {
      const ry = my+26+i*18;
      ctx.fillStyle = "rgba(80,145,170,0.70)"; ctx.font = `7px ${mono}`;
      ctx.fillText(m.label, mx+10, ry);
      const bW=60, bX=mx+142;
      ctx.fillStyle = "rgba(0,175,210,0.10)"; ctx.beginPath(); rrPath(ctx, bX, ry-7, bW, 5, 2); ctx.fill();
      ctx.fillStyle = m.col; ctx.globalAlpha = pulse;
      ctx.beginPath(); rrPath(ctx, bX, ry-7, Math.max(bW*Math.min(m.bar,1), m.bar>0?2:0), 5, 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = m.col; ctx.font = `bold 8px ${mono}`; ctx.textAlign = "right";
      ctx.fillText(m.val, mx+206, ry); ctx.textAlign = "left";
    });

    // ── Flow cycle panel (top-left) ──
    const steps = [
      { l:"RAINFALL",          c:"rgba(120,195,255,0.85)" },
      { l:"STORM DRAIN",       c:"rgba(0,200,240,0.92)"   },
      { l:"SENSOR DETECTION",  c: hot?"rgba(239,130,68,0.95)":"rgba(0,220,240,0.90)" },
      { l:"VALVE ADJUSTMENT",  c:"rgba(0,225,140,0.92)"   },
      { l:"CONTROLLED FLOW",   c:"rgba(0,200,165,0.90)"   },
    ];
    ctx.fillStyle = "rgba(4,14,28,0.88)";
    ctx.beginPath(); rrPath(ctx, 10, 22, 154, 92, 5); ctx.fill();
    ctx.strokeStyle = "rgba(0,200,220,0.18)"; ctx.lineWidth = 1;
    ctx.beginPath(); rrPath(ctx, 10, 22, 154, 92, 5); ctx.stroke();
    steps.forEach((s, i) => {
      ctx.fillStyle = s.c; ctx.font = `bold 8px ${mono}`;
      ctx.fillText(s.l, 18, 35+i*16);
      if (i < steps.length-1) {
        ctx.fillStyle = "rgba(0,200,220,0.45)"; ctx.font = "9px sans-serif";
        ctx.fillText("↓", 84, 43+i*16);
      }
    });

    void H; void bypassY; void bypassH;
  }

  return (
    <div ref={elRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas ref={cvRef} style={{ position: "absolute", inset: 0, display: "block" }} />
    </div>
  );
}
