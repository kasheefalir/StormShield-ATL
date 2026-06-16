import { useEffect, useRef } from "react";

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

interface Props {
  isPlaying: boolean;
  speed: number;
  timelineValue: number;
}

type Drop = { x: number; y: number; spd: number; len: number; op: number };
type RunoffParticle = { x: number; y: number; tx: number; life: number; onPerm: boolean };
type PipeParticle = { x: number; life: number };

export function PermeablePavementVisualization({ isPlaying, speed, timelineValue }: Props) {
  const cvRef       = useRef<HTMLCanvasElement>(null);
  const elRef       = useRef<HTMLDivElement>(null);
  const rafRef      = useRef(0);
  const tRef        = useRef(0);
  const rainRef     = useRef<Drop[]>([]);
  const runoffRef   = useRef<RunoffParticle[]>([]);
  const pipeRef     = useRef<PipeParticle[]>([]);

  useEffect(() => {
    const el = elRef.current, cv = cvRef.current;
    if (!el || !cv) return;
    const ro = new ResizeObserver(() => {
      cv.width  = el.clientWidth;
      cv.height = el.clientHeight;
      rainRef.current = [];
      runoffRef.current = [];
      pipeRef.current = [];
    });
    ro.observe(el);
    cv.width  = el.clientWidth;
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
  }, [isPlaying, speed, timelineValue]);

  function render(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, prog: number) {
    ctx.clearRect(0, 0, W, H);

    // ── Layout ─────────────────────────────────────────────────────────────
    // Sky / buildings: top 30%
    // Street scene:    30%–52%  (road, sidewalk, storm drain)
    // Underground:     52%–100% (soil, pipe)
    const skyBot     = Math.floor(H * 0.30);
    const roadTop    = skyBot;
    const roadBot    = Math.floor(H * 0.48);  // bottom of road surface
    const sidewalkBot = roadBot + 8;
    const ugTop      = sidewalkBot;
    const pipeY      = ugTop + Math.floor((H - ugTop) * 0.30);
    const pipeH      = Math.max(Math.floor((H - ugTop) * 0.28), 28);

    // Permeable section bounds (left half of road)
    const permLeft  = 0;
    const permRight = Math.floor(W * 0.50);
    // Regular asphalt (right half)
    const regLeft   = permRight;
    const regRight  = W;
    // Drain x position (center-right, on the regular/border side)
    const drainX    = Math.floor(W * 0.62);

    drawSky(ctx, W, skyBot, t);
    drawBuildings(ctx, W, skyBot, roadTop, t);
    drawRoad(ctx, W, roadTop, roadBot, permLeft, permRight, regLeft, regRight, t, prog);
    drawSidewalkAndDrain(ctx, W, roadBot, sidewalkBot, drainX, t, prog);
    drawRain(ctx, W, roadTop, t);
    drawRunoffParticles(ctx, W, roadTop, roadBot, sidewalkBot, permLeft, permRight, regLeft, regRight, drainX, t, prog);
    drawAbsorptionParticles(ctx, W, roadTop, roadBot, permLeft, permRight, t, prog);
    drawUnderground(ctx, W, ugTop, pipeY, pipeH, H, drainX, t, prog);
    drawLabels(ctx, W, roadTop, roadBot, sidewalkBot, permLeft, permRight, pipeY, pipeH, H, prog, t);
  }

  // ── SKY + CLOUDS ────────────────────────────────────────────────────────
  function drawSky(ctx: CanvasRenderingContext2D, W: number, skyBot: number, t: number) {
    const g = ctx.createLinearGradient(0, 0, 0, skyBot);
    g.addColorStop(0, "#060e1e"); g.addColorStop(1, "#0d1e2c");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, skyBot);
    [
      { bx: W * 0.08, y: 18, r: 55 }, { bx: W * 0.35, y: 10, r: 72 },
      { bx: W * 0.62, y: 22, r: 60 }, { bx: W * 0.85, y: 14, r: 48 },
    ].forEach(c => {
      const cx = (c.bx + t * 0.018) % (W + 120) - 60;
      const gr = ctx.createRadialGradient(cx, c.y, 0, cx, c.y, c.r);
      gr.addColorStop(0, "rgba(8,20,40,0.96)"); gr.addColorStop(0.7, "rgba(5,14,28,0.75)"); gr.addColorStop(1, "rgba(2,8,16,0)");
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.ellipse(cx, c.y, c.r * 1.8, c.r * 0.65, 0, 0, Math.PI * 2); ctx.fill();
    });
  }

  // ── BUILDINGS ───────────────────────────────────────────────────────────
  function drawBuildings(ctx: CanvasRenderingContext2D, W: number, skyBot: number, _roadTop: number, t: number) {
    [
      { x: W * 0.03, w: 48, h: 88 }, { x: W * 0.13, w: 38, h: 68 },
      { x: W * 0.66, w: 52, h: 100 }, { x: W * 0.76, w: 34, h: 62 }, { x: W * 0.87, w: 42, h: 80 },
    ].forEach(b => {
      const by = skyBot - b.h;
      const bg = ctx.createLinearGradient(b.x, by, b.x + b.w, by);
      bg.addColorStop(0, "#0a1828"); bg.addColorStop(0.5, "#0d2035"); bg.addColorStop(1, "#071520");
      ctx.fillStyle = bg; ctx.fillRect(b.x, by, b.w, b.h);
      [0.22, 0.50, 0.72].forEach(yf => {
        const wy = by + b.h * yf;
        ctx.fillStyle = Math.sin(t * 0.018 + b.x * 0.01) > 0.86
          ? "rgba(0,212,216,0.5)" : "rgba(255,215,85,0.22)";
        ctx.fillRect(b.x + 6, wy, 8, 6);
        ctx.fillStyle = "rgba(255,215,85,0.18)"; ctx.fillRect(b.x + b.w - 14, wy, 8, 6);
      });
      ctx.strokeStyle = "rgba(0,212,216,0.06)"; ctx.lineWidth = 1;
      ctx.strokeRect(b.x, by, b.w, b.h);
    });
  }

  // ── ROAD ────────────────────────────────────────────────────────────────
  function drawRoad(
    ctx: CanvasRenderingContext2D, W: number,
    roadTop: number, roadBot: number,
    permLeft: number, permRight: number,
    regLeft: number, regRight: number,
    t: number, _prog: number
  ) {
    const roadH = roadBot - roadTop;

    // Regular asphalt (right side) — dark, impervious
    const rg = ctx.createLinearGradient(0, roadTop, 0, roadBot);
    rg.addColorStop(0, "#111820"); rg.addColorStop(1, "#0d1520");
    ctx.fillStyle = rg; ctx.fillRect(regLeft, roadTop, regRight - regLeft, roadH);

    // Permeable pavement (left side) — visually distinct, lighter, gridded
    const pg = ctx.createLinearGradient(permLeft, roadTop, permLeft, roadBot);
    pg.addColorStop(0, "#1e3448"); pg.addColorStop(1, "#182c3c");
    ctx.fillStyle = pg; ctx.fillRect(permLeft, roadTop, permRight - permLeft, roadH);

    // Paver brick grid on permeable section
    const pW = 18, pH = 11;
    for (let row = 0; row * pH < roadH - 2; row++) {
      for (let col = permLeft + 2; col < permRight - 2; col += pW) {
        const offset = row % 2 === 0 ? 0 : pW / 2;
        ctx.fillStyle = "rgba(48,118,155,0.18)";
        ctx.fillRect(col + offset, roadTop + 2 + row * pH, pW - 2, pH - 1);
        ctx.strokeStyle = "rgba(0,200,235,0.22)"; ctx.lineWidth = 0.7;
        ctx.strokeRect(col + offset, roadTop + 2 + row * pH, pW - 2, pH - 1);
      }
    }

    // Pore dots on permeable surface (visible voids)
    for (let i = 0; i < 24; i++) {
      const px2 = permLeft + 8 + ((i * 61.3) % (permRight - permLeft - 16));
      const py2 = roadTop + 4 + ((i * 29.7) % (roadH - 8));
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath(); ctx.arc(px2, py2, 1.1, 0, Math.PI * 2); ctx.fill();
    }

    // Bright top edge on permeable section
    ctx.strokeStyle = "rgba(0,215,240,0.45)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(permLeft, roadTop + 0.75); ctx.lineTo(permRight, roadTop + 0.75); ctx.stroke();

    // Divider line between permeable and regular
    ctx.strokeStyle = "rgba(255,200,80,0.35)"; ctx.lineWidth = 1.5;
    ctx.setLineDash([12, 8]);
    ctx.beginPath(); ctx.moveTo(permRight, roadTop); ctx.lineTo(permRight, roadBot); ctx.stroke();
    ctx.setLineDash([]);

    // Center lane marking on regular side
    ctx.strokeStyle = "rgba(255,200,0,0.18)"; ctx.lineWidth = 1.1;
    ctx.setLineDash([18, 14]);
    ctx.beginPath(); ctx.moveTo(regLeft, roadTop + roadH / 2); ctx.lineTo(regRight, roadTop + roadH / 2); ctx.stroke();
    ctx.setLineDash([]);

    // Vehicle on regular side
    const carX = regLeft + (regRight - regLeft) * 0.35;
    const carY = roadTop + roadH * 0.3;
    ctx.fillStyle = "#0d2035";
    ctx.beginPath(); rrPath(ctx, carX, carY, 44, 15, 2); ctx.fill();
    ctx.fillStyle = "#0a1828";
    ctx.beginPath(); rrPath(ctx, carX + 7, carY - 10, 28, 11, 2); ctx.fill();
    ctx.fillStyle = "rgba(255,220,100,0.5)";
    ctx.beginPath(); ctx.arc(carX + 4, carY + 8, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(carX + 40, carY + 8, 2, 0, Math.PI * 2); ctx.fill();

    void t;
  }

  // ── SIDEWALK + STORM DRAIN ──────────────────────────────────────────────
  function drawSidewalkAndDrain(
    ctx: CanvasRenderingContext2D, W: number,
    roadBot: number, sidewalkBot: number, drainX: number,
    _t: number, _prog: number
  ) {
    ctx.fillStyle = "#1a2535";
    ctx.fillRect(0, roadBot, W, sidewalkBot - roadBot);

    // Storm drain grate
    ctx.fillStyle = "#0e1824";
    ctx.fillRect(drainX - 12, roadBot, 24, sidewalkBot - roadBot + 2);
    ctx.strokeStyle = "rgba(0,200,220,0.35)"; ctx.lineWidth = 1;
    ctx.strokeRect(drainX - 12, roadBot, 24, sidewalkBot - roadBot + 2);
    for (let gi = 0; gi < 4; gi++) {
      ctx.beginPath();
      ctx.moveTo(drainX - 12, roadBot + 1.5 + gi * 2);
      ctx.lineTo(drainX + 12, roadBot + 1.5 + gi * 2);
      ctx.stroke();
    }
  }

  // ── RAIN ────────────────────────────────────────────────────────────────
  function drawRain(ctx: CanvasRenderingContext2D, W: number, maxY: number, _t: number) {
    if (rainRef.current.length === 0) {
      for (let i = 0; i < 150; i++)
        rainRef.current.push({
          x: Math.random() * W, y: Math.random() * maxY,
          spd: 7 + Math.random() * 6,
          len: 10 + Math.random() * 13,
          op: 0.28 + Math.random() * 0.48,
        });
    }
    rainRef.current.forEach(d => {
      d.y += d.spd;
      if (d.y > maxY + 20) { d.y = -20; d.x = Math.random() * W; }
      ctx.strokeStyle = `rgba(100,180,255,${d.op})`; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 1.5, d.y + d.len); ctx.stroke();
    });
  }

  // ── ABSORPTION PARTICLES (rain going INTO permeable surface) ────────────
  function drawAbsorptionParticles(
    ctx: CanvasRenderingContext2D, W: number,
    roadTop: number, roadBot: number,
    permLeft: number, permRight: number,
    t: number, prog: number
  ) {
    if (prog < 0.03) return;
    const roadH = roadBot - roadTop;
    const count = Math.floor(32 * Math.min(prog * 3, 1));
    for (let i = 0; i < count; i++) {
      // Each particle enters from above and sinks INTO the pavement — no sideways drift
      const px2 = permLeft + 6 + ((i * 67.3 + t * 0.7) % (permRight - permLeft - 12));
      const phase = ((t * 0.028 + i * 0.031) % 1);
      // Particle enters from top and disappears at bottom — fading out mid-way
      const py2 = roadTop + phase * (roadH + 8) - 8;
      const alpha = Math.sin(phase * Math.PI) * 0.85 * Math.min(prog * 3, 1);
      if (py2 >= roadTop && py2 <= roadBot + 4) {
        ctx.fillStyle = `rgba(0,215,255,${alpha})`;
        ctx.beginPath(); ctx.arc(px2, py2, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // ── SURFACE RUNOFF PARTICLES (water moving toward drain on regular side) ─
  function drawRunoffParticles(
    ctx: CanvasRenderingContext2D, W: number,
    roadTop: number, roadBot: number, sidewalkBot: number,
    permLeft: number, permRight: number,
    _regLeft: number, _regRight: number,
    drainX: number,
    t: number, prog: number
  ) {
    if (prog < 0.05) return;

    // Spawn runoff from REGULAR side only — they flow toward drain
    if (Math.random() < 0.25 * Math.min(prog * 2, 1)) {
      const startX = permRight + 10 + Math.random() * (W - permRight - 20);
      runoffRef.current.push({
        x: startX,
        y: roadBot - 2,
        tx: drainX + (Math.random() - 0.5) * 6,
        life: 0,
        onPerm: false,
      });
    }

    runoffRef.current = runoffRef.current.filter(p => {
      p.life++;
      // Move toward drain x, then down the shaft
      const dx = p.tx - p.x;
      p.x += Math.sign(dx) * Math.min(Math.abs(dx), 2.2);
      const a = Math.max(0, 0.75 - p.life * 0.012) * Math.min(prog * 2, 1);
      if (a <= 0) return false;
      ctx.fillStyle = `rgba(30,150,230,${a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
      return p.life < 70;
    });

    // Animated surface flow lines on regular side → drain
    const flowAlpha = Math.min(prog * 1.2, 0.55);
    ctx.save();
    ctx.strokeStyle = `rgba(30,140,220,${flowAlpha})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -(t * 0.9);
    // Flow from the far right toward drain
    ctx.beginPath();
    ctx.moveTo(W - 20, roadBot - 3);
    ctx.lineTo(drainX + 8, roadBot - 3);
    ctx.stroke();
    // Flow from just right of center divider toward drain
    ctx.beginPath();
    ctx.moveTo(permRight + 14, roadBot - 3);
    ctx.lineTo(drainX - 8, roadBot - 3);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Shaft flow — water going down into underground
    const shaftAlpha = Math.min(prog * 1.4, 0.7);
    ctx.save();
    ctx.strokeStyle = `rgba(30,150,230,${shaftAlpha})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -(t * 1.1);
    ctx.beginPath();
    ctx.moveTo(drainX, sidewalkBot + 2);
    ctx.lineTo(drainX, sidewalkBot + Math.floor((W * 0) + 40)); // short shaft line
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    void permLeft; void roadTop;
  }

  // ── UNDERGROUND (soil, inlet shaft, pipe) ──────────────────────────────
  function drawUnderground(
    ctx: CanvasRenderingContext2D, W: number,
    ugTop: number, pipeY: number, pipeH: number, H: number,
    drainX: number, t: number, prog: number
  ) {
    // Soil background
    const ug = ctx.createLinearGradient(0, ugTop, 0, H);
    ug.addColorStop(0, "#09120e"); ug.addColorStop(0.4, "#070e0a"); ug.addColorStop(1, "#050c08");
    ctx.fillStyle = ug; ctx.fillRect(0, ugTop, W, H - ugTop);

    // Soil strata lines
    [0.18, 0.38, 0.60].forEach(frac => {
      const sy = ugTop + (pipeY - ugTop) * frac;
      ctx.strokeStyle = "rgba(30,16,6,0.4)"; ctx.lineWidth = 0.5;
      ctx.setLineDash([5, 9]);
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
      ctx.setLineDash([]);
    });

    // Inlet shaft from drain down to pipe
    const shaftW = 20;
    const shaftTop = ugTop;
    const shaftBot = pipeY;
    ctx.fillStyle = "#0d1a24";
    ctx.fillRect(drainX - shaftW / 2, shaftTop, shaftW, shaftBot - shaftTop);
    ctx.strokeStyle = "rgba(0,190,220,0.15)"; ctx.lineWidth = 1;
    ctx.strokeRect(drainX - shaftW / 2, shaftTop, shaftW, shaftBot - shaftTop);

    // Animated water drops in the shaft (scaled by prog — reduced flow)
    const shaftDropA = Math.min(prog * 1.5, 0.8);
    for (let i = 0; i < 3; i++) {
      const dprog = ((t * 0.022 + i * 0.33) % 1);
      const dy = shaftTop + dprog * (shaftBot - shaftTop);
      ctx.fillStyle = `rgba(30,160,240,${shaftDropA * (1 - dprog * 0.5)})`;
      ctx.beginPath(); ctx.arc(drainX, dy, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // ── PIPE ──────────────────────────────────────────────────────────────
    const pipeR = pipeH / 2;
    const pipeLeft  = W * 0.05;
    const pipeRight = W * 0.95;
    const pipeWidth = pipeRight - pipeLeft;

    // Pipe body
    const pg = ctx.createLinearGradient(0, pipeY, 0, pipeY + pipeH);
    pg.addColorStop(0, "#0d2035"); pg.addColorStop(0.4, "#102840"); pg.addColorStop(1, "#081828");
    ctx.fillStyle = pg;
    ctx.beginPath(); rrPath(ctx, pipeLeft, pipeY, pipeWidth, pipeH, pipeR); ctx.fill();

    // Calm blue border
    const bA = 0.32 + Math.sin(t * 0.06) * 0.08;
    ctx.strokeStyle = `rgba(0,155,255,${bA})`; ctx.lineWidth = 2;
    ctx.beginPath(); rrPath(ctx, pipeLeft, pipeY, pipeWidth, pipeH, pipeR); ctx.stroke();

    // Blue outer glow
    const gG = ctx.createLinearGradient(0, pipeY - 5, 0, pipeY + pipeH + 5);
    gG.addColorStop(0, "rgba(0,155,255,0)"); gG.addColorStop(0.5, "rgba(0,155,255,0.13)"); gG.addColorStop(1, "rgba(0,155,255,0)");
    ctx.strokeStyle = gG; ctx.lineWidth = 8;
    ctx.beginPath(); rrPath(ctx, pipeLeft, pipeY, pipeWidth, pipeH, pipeR); ctx.stroke();

    // Ghost "current system" high-water line
    const currentPct = 0.90; // ~90-105% without permeable pavement
    const currentWaterH = pipeH * currentPct;
    const currentWaterY = pipeY + pipeH - currentWaterH;
    ctx.save();
    ctx.strokeStyle = "rgba(239,68,68,0.45)"; ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 4]);
    ctx.beginPath();
    ctx.moveTo(pipeLeft + 6, currentWaterY);
    ctx.lineTo(pipeRight - 6, currentWaterY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Actual water fill (~30% with permeable pavement — down from 105%)
    const wPct = Math.min(prog * 0.30, 0.30);
    const wH = pipeH * wPct;
    const wY = pipeY + pipeH - wH;
    if (wPct > 0.02) {
      ctx.save();
      ctx.beginPath(); rrPath(ctx, pipeLeft, pipeY, pipeWidth, pipeH, pipeR); ctx.clip();
      const wg = ctx.createLinearGradient(0, wY, 0, pipeY + pipeH);
      wg.addColorStop(0, "rgba(0,170,255,0.20)");
      wg.addColorStop(0.3, "rgba(0,150,240,0.55)");
      wg.addColorStop(1, "rgba(0,120,210,0.72)");
      ctx.fillStyle = wg; ctx.fillRect(pipeLeft, wY, pipeWidth, wH);
      // Ripple
      ctx.strokeStyle = "rgba(100,215,255,0.30)"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = pipeLeft; x <= pipeRight; x += 2) {
        const ry = wY + Math.sin((x / 28) + t * 0.12) * 1.1;
        x === pipeLeft ? ctx.moveTo(x, ry) : ctx.lineTo(x, ry);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Slow flow particles in pipe
    if (pipeRef.current.length < 5) {
      pipeRef.current.push({ x: pipeLeft, life: 0 });
    }
    pipeRef.current = pipeRef.current.filter(p => {
      p.x += 0.7 + Math.random() * 0.4;
      p.life++;
      if (p.x > pipeRight) return false;
      const a = Math.min(p.life / 12, 1) * 0.40 * Math.min(prog * 2, 1);
      ctx.fillStyle = `rgba(0,175,255,${a})`;
      ctx.beginPath(); ctx.arc(p.x, pipeY + pipeH - 5, 2, 0, Math.PI * 2); ctx.fill();
      return p.life < 300;
    });

    // Pipe highlight
    ctx.fillStyle = "rgba(255,255,255,0.025)";
    ctx.beginPath(); rrPath(ctx, pipeLeft + 4, pipeY + 2, pipeWidth - 8, 4, 2); ctx.fill();
  }

  // ── LABELS & CALLOUTS ──────────────────────────────────────────────────
  function drawLabels(
    ctx: CanvasRenderingContext2D, W: number,
    roadTop: number, roadBot: number, sidewalkBot: number,
    permLeft: number, permRight: number,
    pipeY: number, pipeH: number, H: number,
    prog: number, t: number
  ) {
    const mono = "JetBrains Mono, monospace";
    const pulse = 0.88 + Math.sin(t * 0.10) * 0.12;

    // ── Section labels on road surface ──
    // Permeable label
    ctx.fillStyle = "rgba(0,225,245,0.90)";
    ctx.font = `bold 9px ${mono}`; ctx.textAlign = "center";
    ctx.fillText("◈ PERMEABLE PAVEMENT", permLeft + (permRight - permLeft) / 2, roadTop + 12);
    ctx.fillStyle = "rgba(0,200,230,0.65)"; ctx.font = `7px ${mono}`;
    ctx.fillText("rain absorbed through surface", permLeft + (permRight - permLeft) / 2, roadTop + 22);

    // Regular label
    ctx.fillStyle = "rgba(160,160,180,0.65)";
    ctx.font = `bold 9px ${mono}`;
    ctx.fillText("REGULAR ASPHALT", permRight + (W - permRight) / 2, roadTop + 12);
    ctx.fillStyle = "rgba(120,130,150,0.55)"; ctx.font = `7px ${mono}`;
    ctx.fillText("runoff flows to drain", permRight + (W - permRight) / 2, roadTop + 22);
    ctx.textAlign = "left";

    // Storm drain label
    const drainX = Math.floor(W * 0.62);
    ctx.fillStyle = "rgba(0,200,220,0.45)"; ctx.font = `7px ${mono}`; ctx.textAlign = "center";
    ctx.fillText("STORM DRAIN", drainX, sidewalkBot + 10);
    ctx.textAlign = "left";

    // ── "65% less runoff" callout near drain ──
    if (prog > 0.12) {
      const a = Math.min((prog - 0.12) * 4, 1) * pulse;
      const bx = drainX - 80, by = roadBot - 28;
      ctx.fillStyle = `rgba(4,14,28,${a * 0.92})`;
      ctx.beginPath(); rrPath(ctx, bx, by, 160, 22, 4); ctx.fill();
      ctx.strokeStyle = `rgba(0,225,140,${a * 0.55})`; ctx.lineWidth = 1;
      ctx.beginPath(); rrPath(ctx, bx, by, 160, 22, 4); ctx.stroke();
      ctx.fillStyle = `rgba(0,230,150,${a * 0.95})`;
      ctx.font = `bold 8px ${mono}`; ctx.textAlign = "center";
      ctx.fillText("83% LESS RUNOFF REACHES SEWER", drainX, by + 14);
      ctx.textAlign = "left";
    }

    // ── Pipe section labels ──
    const pipeLeft = W * 0.05;
    const pipeRight = W * 0.95;
    const pipeBot = pipeY + pipeH;

    // Ghost line label
    const currentWaterY = pipeY + pipeH * (1 - 0.90);
    ctx.fillStyle = "rgba(239,68,68,0.65)";
    ctx.font = `bold 7px ${mono}`; ctx.textAlign = "right";
    ctx.fillText("WITHOUT PERMEABLE PAVEMENT (~105% — OVERFLOW)", pipeRight - 4, currentWaterY - 3);
    ctx.textAlign = "left";

    // Actual water level label
    const wPct = Math.min(prog * 0.30, 0.30);
    const wY = pipeY + pipeH * (1 - wPct);
    if (wPct > 0.04) {
      ctx.fillStyle = `rgba(0,210,255,${pulse * 0.88})`;
      ctx.font = `bold 7px ${mono}`;
      ctx.fillText(`WITH PERMEABLE PAVEMENT (~${Math.round(wPct * 100)}% CAPACITY)`, pipeLeft + 8, wY - 3);
    }

    // Arrow showing reduction between the two water lines
    if (prog > 0.15 && wPct > 0.05) {
      const arrX = pipeLeft + 20;
      const arrA = Math.min((prog - 0.15) * 3, 1);
      ctx.strokeStyle = `rgba(0,225,140,${arrA * 0.85})`; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(arrX, currentWaterY);
      ctx.lineTo(arrX, wY + 2);
      ctx.stroke();
      // Arrow heads
      ctx.beginPath(); ctx.moveTo(arrX - 4, currentWaterY + 4); ctx.lineTo(arrX, currentWaterY); ctx.lineTo(arrX + 4, currentWaterY + 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(arrX - 4, wY - 4); ctx.lineTo(arrX, wY + 2); ctx.lineTo(arrX + 4, wY - 4); ctx.stroke();
      ctx.fillStyle = `rgba(0,230,150,${arrA * 0.92})`;
      ctx.font = `bold 8px ${mono}`;
      ctx.fillText("72%", arrX + 5, (currentWaterY + wY) / 2 + 4);
      ctx.fillText("less", arrX + 5, (currentWaterY + wY) / 2 + 14);
    }

    // Status text below pipe
    const capPct = Math.round(wPct * 100);
    ctx.fillStyle = "rgba(0,215,130,0.82)"; ctx.font = `bold 9px ${mono}`;
    ctx.fillText(`SEWER PIPE — ${capPct}% CAPACITY   ✓ NORMAL`, pipeLeft, pipeBot + 14);

    // Top-right mode label
    ctx.fillStyle = "rgba(0,215,240,0.92)"; ctx.font = `bold 9px ${mono}`; ctx.textAlign = "right";
    ctx.fillText("PERMEABLE PAVEMENT — RAIN → PAVEMENT → AGGREGATE → REDUCED SEWER FLOW", W - 12, 18);
    ctx.textAlign = "left";

    // Small metrics card
    const stored = Math.round(Math.min(prog * 1.4, 1) * 28000);
    const peakRed = Math.round(prog * 72);
    const mx = W - 206, my = 26;
    ctx.fillStyle = "rgba(4,14,28,0.90)";
    ctx.beginPath(); rrPath(ctx, mx, my, 198, 92, 5); ctx.fill();
    ctx.strokeStyle = "rgba(0,200,220,0.22)"; ctx.lineWidth = 1;
    ctx.beginPath(); rrPath(ctx, mx, my, 198, 92, 5); ctx.stroke();

    ctx.fillStyle = "rgba(140,210,230,0.80)"; ctx.font = `bold 8px ${mono}`;
    ctx.fillText("PERMEABLE PAVEMENT PERFORMANCE", mx + 10, my + 13);

    [
      { label: "RUNOFF ABSORBED",    val: "83%",                         bar: 0.83, col: "rgba(0,215,245,0.95)" },
      { label: "AGGREGATE STORAGE",  val: `${stored.toLocaleString()} gal`, bar: Math.min(prog * 1.4, 1), col: "rgba(0,195,230,0.90)" },
      { label: "PEAK FLOW REDUCTION",val: `${peakRed}%`,                 bar: prog * 0.72, col: "rgba(0,225,155,0.90)" },
      { label: "SEWER LOAD REDUCTION",val: "72%",                        bar: 0.72, col: "rgba(0,230,140,0.92)" },
    ].forEach((m, i) => {
      const ry = my + 24 + i * 18;
      ctx.fillStyle = "rgba(80,145,170,0.68)"; ctx.font = `7px ${mono}`;
      ctx.fillText(m.label, mx + 10, ry);
      const bW = 60, bX = mx + 128;
      ctx.fillStyle = "rgba(0,175,210,0.10)";
      ctx.beginPath(); rrPath(ctx, bX, ry - 7, bW, 5, 2); ctx.fill();
      ctx.fillStyle = m.col; ctx.globalAlpha = pulse;
      ctx.beginPath(); rrPath(ctx, bX, ry - 7, bW * Math.min(m.bar * Math.min(prog * 3, 1), 1), 5, 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = m.col; ctx.font = `bold 8px ${mono}`; ctx.textAlign = "right";
      ctx.fillText(m.val, mx + 192, ry); ctx.textAlign = "left";
    });

    void H; void permLeft; void sidewalkBot;
  }

  return (
    <div ref={elRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas ref={cvRef} style={{ position: "absolute", inset: 0, display: "block" }} />
    </div>
  );
}
