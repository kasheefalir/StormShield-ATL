import { useEffect, useRef } from "react";
import { drawSmartTankFeeder } from "./feederPipe";

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
  source?: "storm-drain" | "smart-tank";
}

type Drop = { x: number; y: number; spd: number; len: number; op: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; type: "flow" | "root" | "bubble" };

export function TreeTrenchVisualization({ isPlaying, speed, timelineValue, source = "storm-drain" }: Props) {
  const fromTank = source === "smart-tank";
  const cvRef = useRef<HTMLCanvasElement>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const rainRef = useRef<Drop[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const el = elRef.current, cv = cvRef.current;
    if (!el || !cv) return;
    const ro = new ResizeObserver(() => {
      cv.width = el.clientWidth;
      cv.height = el.clientHeight;
      rainRef.current = [];
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

  // ─────────────────────────────────────────────────────────────────────────
  function render(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, prog: number) {
    ctx.clearRect(0, 0, W, H);

    // Layout
    // sky:       0       → skyBot
    // scene:     skyBot  → sceneBot  (street-level: buildings, trees, road)
    // sidewalk:  sceneBot → sidBot
    // trench:    sidBot  → trenchBot (the underground tree-trench cross-section)
    // deep soil: trenchBot → H
    const skyBot     = Math.floor(H * 0.36);
    const sceneBot   = Math.floor(H * 0.56);   // ground / road surface
    const sidBot     = Math.floor(H * 0.62);   // bottom of sidewalk / curb
    const trenchBot  = Math.floor(H * 0.84);   // bottom of trench zone

    drawSky(ctx, W, skyBot, t);
    drawRain(ctx, W, sceneBot, t, 0.5);
    drawBuildings(ctx, W, skyBot, sceneBot, t);
    drawStreetScene(ctx, W, skyBot, sceneBot, sidBot, t, prog);  // road, sidewalk, curb, trees
    drawTrenchZone(ctx, W, sceneBot, sidBot, trenchBot, H, t, prog);
    // Underground feeder: excess from the smart tank runs into the Silva-cell trench.
    if (fromTank) {
      const ty = sidBot + (trenchBot - sidBot) * 0.42;
      drawSmartTankFeeder(
        ctx,
        [{ x: 2, y: ty }, { x: W * 0.5, y: ty }],
        t, Math.min(prog / 0.8, 1),
        { label: "⟶ EXCESS FROM SMART TANK", color: "0,200,140" },
      );
    }
    drawOverlay(ctx, W, t, prog);
  }

  // ── SKY ────────────────────────────────────────────────────────────────
  function drawSky(ctx: CanvasRenderingContext2D, W: number, skyBot: number, t: number) {
    // Slightly greener/lighter sky than current system
    const g = ctx.createLinearGradient(0, 0, 0, skyBot);
    g.addColorStop(0, "#071218");
    g.addColorStop(0.5, "#0b1e20");
    g.addColorStop(1, "#0e2420");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, skyBot);

    // Soft green-tinted storm clouds
    [
      { bx: W * 0.06, y: 22, r: 60, s: 0.06 },
      { bx: W * 0.30, y: 14, r: 75, s: 0.05 },
      { bx: W * 0.58, y: 26, r: 64, s: 0.055 },
      { bx: W * 0.83, y: 18, r: 54, s: 0.065 },
    ].forEach(c => {
      const cx = (c.bx + t * c.s * 0.3) % (W + 120) - 60;
      const gr = ctx.createRadialGradient(cx, c.y, 0, cx, c.y, c.r);
      gr.addColorStop(0, "rgba(12,30,28,0.92)");
      gr.addColorStop(0.6, "rgba(8,22,20,0.72)");
      gr.addColorStop(1, "rgba(4,14,12,0)");
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.ellipse(cx, c.y, c.r * 1.8, c.r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ── RAIN ───────────────────────────────────────────────────────────────
  function drawRain(ctx: CanvasRenderingContext2D, W: number, maxY: number, _t: number, intensity: number) {
    if (rainRef.current.length === 0) {
      for (let i = 0; i < 100; i++)
        rainRef.current.push({ x: Math.random() * W, y: Math.random() * maxY, spd: 6 + Math.random() * 5, len: 9 + Math.random() * 11, op: 0.28 + Math.random() * 0.45 });
    }
    rainRef.current.forEach(d => {
      d.y += d.spd * intensity;
      if (d.y > maxY + 20) { d.y = -20; d.x = Math.random() * W; }
      ctx.strokeStyle = `rgba(130,200,180,${d.op * intensity})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 1.5, d.y + d.len); ctx.stroke();
    });
  }

  // ── BACKGROUND BUILDINGS ───────────────────────────────────────────────
  function drawBuildings(ctx: CanvasRenderingContext2D, W: number, skyBot: number, sceneBot: number, t: number) {
    const bldgs = [
      { x: W * 0.02, w: 52, h: 100 },
      { x: W * 0.11, w: 42, h: 80 },
      { x: W * 0.63, w: 58, h: 115 },
      { x: W * 0.74, w: 38, h: 72 },
      { x: W * 0.86, w: 48, h: 90 },
    ];
    bldgs.forEach(b => {
      const by = sceneBot - b.h;
      const bg = ctx.createLinearGradient(b.x, by, b.x + b.w, by);
      bg.addColorStop(0, "#091820"); bg.addColorStop(0.5, "#0c2025"); bg.addColorStop(1, "#071618");
      ctx.fillStyle = bg; ctx.fillRect(b.x, by, b.w, b.h);
      // windows
      [0.2, 0.45, 0.68].forEach(yf => {
        const wy = by + b.h * yf;
        const flicker = Math.sin(t * 0.018 + b.x * 0.01) > 0.86;
        ctx.fillStyle = flicker ? "rgba(0,220,160,0.5)" : "rgba(255,215,85,0.22)";
        ctx.fillRect(b.x + 6, wy, 8, 6);
        ctx.fillStyle = "rgba(255,215,85,0.18)";
        ctx.fillRect(b.x + b.w - 14, wy, 8, 6);
      });
      ctx.strokeStyle = "rgba(0,200,140,0.06)"; ctx.lineWidth = 1;
      ctx.strokeRect(b.x, by, b.w, b.h);
    });
    void skyBot;
  }

  // ── STREET SCENE (trees, road, sidewalk) ──────────────────────────────
  function drawStreetScene(
    ctx: CanvasRenderingContext2D, W: number,
    skyBot: number, sceneBot: number, sidBot: number,
    t: number, prog: number
  ) {
    // Road surface
    const rg = ctx.createLinearGradient(0, sceneBot - 22, 0, sceneBot);
    rg.addColorStop(0, "#0f1820"); rg.addColorStop(1, "#0c1520");
    ctx.fillStyle = rg; ctx.fillRect(0, sceneBot - 22, W, 22);

    // Lane marking
    ctx.strokeStyle = "rgba(255,200,0,0.2)"; ctx.lineWidth = 1.2;
    ctx.setLineDash([18, 14]);
    ctx.beginPath(); ctx.moveTo(0, sceneBot - 11); ctx.lineTo(W, sceneBot - 11); ctx.stroke();
    ctx.setLineDash([]);

    // Sidewalk strip
    const swH = sidBot - sceneBot;
    ctx.fillStyle = "#1a2830"; ctx.fillRect(0, sceneBot, W, swH);
    ctx.strokeStyle = "rgba(0,200,140,0.08)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, sceneBot); ctx.lineTo(W, sceneBot); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, sidBot); ctx.lineTo(W, sidBot); ctx.stroke();
    // sidewalk joints
    for (let jx = W * 0.1; jx < W; jx += W * 0.14) {
      ctx.strokeStyle = "rgba(0,200,140,0.06)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(jx, sceneBot); ctx.lineTo(jx, sidBot); ctx.stroke();
    }

    // Curb inlets (water entry points into trench)
    const inlets = [W * 0.17, W * 0.38, W * 0.60, W * 0.81];
    inlets.forEach(ix => {
      ctx.fillStyle = "#0e1c24";
      ctx.fillRect(ix - 7, sidBot - 4, 14, 8);
      ctx.strokeStyle = `rgba(0,200,140,${0.4 + Math.sin(t * 0.1 + ix) * 0.15})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(ix - 7, sidBot - 4, 14, 8);
      // grate lines
      for (let gi = 0; gi < 3; gi++) {
        ctx.beginPath(); ctx.moveTo(ix - 7, sidBot - 3 + gi * 2.2); ctx.lineTo(ix + 7, sidBot - 3 + gi * 2.2); ctx.stroke();
      }
      // animated runoff flowing toward inlet
      if (prog > 0.05) {
        const fa = (0.5 + Math.sin(t * 0.08) * 0.25) * Math.min(prog * 2, 1);
        ctx.strokeStyle = `rgba(30,200,140,${fa})`;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 5]); ctx.lineDashOffset = -(t * 0.7);
        ctx.beginPath(); ctx.moveTo(ix - 50, sidBot - 2); ctx.lineTo(ix - 6, sidBot - 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ix + 50, sidBot - 2); ctx.lineTo(ix + 6, sidBot - 2); ctx.stroke();
        ctx.setLineDash([]);
        // ▼ arrow
        ctx.fillStyle = `rgba(0,220,140,${fa * 0.9})`;
        ctx.font = "bold 8px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("▼", ix, sidBot - 6);
        ctx.textAlign = "left";
      }
    });

    // Street trees (a full canopy row)
    const treeXs = [W * 0.13, W * 0.27, W * 0.42, W * 0.57, W * 0.71, W * 0.86];
    treeXs.forEach((tx, ti) => drawStreetTree(ctx, tx, sceneBot, skyBot, t, ti, prog));

    // Storm drain + reduced trickle — only when fed from the storm drain.
    if (!fromTank) {
    // Storm drain (reduced inflow in tree-trench mode)
    const drainX = W * 0.50;
    ctx.fillStyle = "#1a2535";
    ctx.fillRect(drainX - 10, sidBot - 5, 20, 9);
    ctx.strokeStyle = "rgba(0,200,140,0.35)"; ctx.lineWidth = 1;
    ctx.strokeRect(drainX - 10, sidBot - 5, 20, 9);
    for (let gi = 0; gi < 4; gi++) {
      ctx.beginPath(); ctx.moveTo(drainX - 10, sidBot - 4 + gi * 1.8); ctx.lineTo(drainX + 10, sidBot - 4 + gi * 1.8); ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,200,140,0.4)"; ctx.font = "7px JetBrains Mono, monospace"; ctx.textAlign = "center";
    ctx.fillText("STORM DRAIN", drainX, sidBot - 8); ctx.textAlign = "left";

    // Thin trickle to drain (reduced — most going to trenches)
    const flowA = prog * 0.18;
    ctx.strokeStyle = `rgba(30,160,180,${flowA})`;
    ctx.lineWidth = 1.1; ctx.setLineDash([4, 7]); ctx.lineDashOffset = -(t * 0.38);
    ctx.beginPath(); ctx.moveTo(W * 0.3, sidBot - 2); ctx.lineTo(drainX - 9, sidBot - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W * 0.7, sidBot - 2); ctx.lineTo(drainX + 9, sidBot - 2); ctx.stroke();
    ctx.setLineDash([]);
    } // end storm-drain block

    // Annotation
    ctx.fillStyle = "rgba(0,220,140,0.82)";
    ctx.font = "bold 9px JetBrains Mono, monospace"; ctx.textAlign = "center";
    ctx.fillText(`↓  ${Math.round(prog * 35)}% PEAK FLOW REDUCTION — TREE TRENCH NETWORK  ↓`, W / 2, sceneBot - 26);
    ctx.textAlign = "left";

    void skyBot;
  }

  // ── STREET TREE ────────────────────────────────────────────────────────
  function drawStreetTree(
    ctx: CanvasRenderingContext2D,
    tx: number, groundY: number, skyBot: number,
    t: number, idx: number, prog: number
  ) {
    const lushness = 0.7 + prog * 0.3;
    const sway = 0;
    const trunkH = groundY - skyBot - 20;
    const trunkW = 6 + (idx % 2);
    const canopyR = 28 + (idx % 3) * 8;
    const canopyY = groundY - trunkH * 0.72;

    // Trunk
    const tg = ctx.createLinearGradient(tx - trunkW / 2, 0, tx + trunkW / 2, 0);
    tg.addColorStop(0, "#1a0e06"); tg.addColorStop(0.5, "#221208"); tg.addColorStop(1, "#160c05");
    ctx.fillStyle = tg;
    ctx.beginPath();
    rrPath(ctx, tx - trunkW / 2 + sway * 0.1, groundY - trunkH, trunkW, trunkH, 2);
    ctx.fill();

    // Canopy glow (health indicator — greener with more prog)
    const glowR = canopyR * 1.3;
    const glowG = ctx.createRadialGradient(tx + sway, canopyY, 0, tx + sway, canopyY, glowR);
    const glowAlpha = 0.08 + prog * 0.12;
    glowG.addColorStop(0, `rgba(0,220,100,${glowAlpha})`);
    glowG.addColorStop(1, "rgba(0,220,100,0)");
    ctx.fillStyle = glowG;
    ctx.beginPath(); ctx.arc(tx + sway, canopyY, glowR, 0, Math.PI * 2); ctx.fill();

    // Canopy layers (multi-layer for depth)
    const layers = [
      { r: canopyR * 0.95, dy: 4, lightness: 28 },
      { r: canopyR * 0.80, dy: -2, lightness: 36 },
      { r: canopyR * 0.60, dy: -8, lightness: 44 },
    ];
    layers.forEach(lay => {
      const hue = 120 + (idx % 3) * 8;
      const sat = Math.round(60 + lushness * 20);
      const g2 = ctx.createRadialGradient(tx + sway, canopyY + lay.dy, 0, tx + sway, canopyY + lay.dy, lay.r);
      g2.addColorStop(0, `hsla(${hue},${sat}%,${lay.lightness + 4}%,0.95)`);
      g2.addColorStop(0.7, `hsla(${hue},${sat}%,${lay.lightness}%,0.88)`);
      g2.addColorStop(1, `hsla(${hue},${sat - 10}%,${lay.lightness - 6}%,0)`);
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.ellipse(tx + sway, canopyY + lay.dy, lay.r * 1.1, lay.r, 0, 0, Math.PI * 2); ctx.fill();
    });

    // Leaf detail (static positions)
    for (let li = 0; li < 5; li++) {
      const lx = tx + (li - 2) * canopyR * 0.35;
      const ly = canopyY + (li % 3 - 1) * canopyR * 0.28;
      const la = 0.15;
      ctx.fillStyle = `rgba(40,200,80,${la})`;
      ctx.beginPath(); ctx.ellipse(lx, ly, 5, 3, li * 0.6, 0, Math.PI * 2); ctx.fill();
    }

    // Shade cast on sidewalk
    const shadeW = canopyR * 1.6;
    const shadeG = ctx.createRadialGradient(tx, groundY, 0, tx, groundY, shadeW);
    shadeG.addColorStop(0, "rgba(0,40,20,0.28)");
    shadeG.addColorStop(1, "rgba(0,40,20,0)");
    ctx.fillStyle = shadeG;
    ctx.beginPath(); ctx.ellipse(tx, groundY, shadeW, shadeW * 0.25, 0, 0, Math.PI * 2); ctx.fill();
  }

  // ── UNDERGROUND TRENCH ZONE ───────────────────────────────────────────
  function drawTrenchZone(
    ctx: CanvasRenderingContext2D,
    W: number,
    sceneBot: number, sidBot: number, trenchBot: number, H: number,
    t: number, prog: number
  ) {
    // Underground background
    const ug = ctx.createLinearGradient(0, sidBot, 0, H);
    ug.addColorStop(0, "#0a1410"); ug.addColorStop(0.3, "#081008"); ug.addColorStop(1, "#060c05");
    ctx.fillStyle = ug; ctx.fillRect(0, sidBot, W, H - sidBot);

    // Soil strata lines
    ["rgba(28,16,6,0.55)", "rgba(20,12,4,0.38)", "rgba(15,9,3,0.28)"].forEach((c, i) => {
      ctx.strokeStyle = c; ctx.lineWidth = 0.5; ctx.setLineDash([4, 8]);
      ctx.beginPath(); ctx.moveTo(0, sidBot + 18 + i * 18); ctx.lineTo(W, sidBot + 18 + i * 18); ctx.stroke();
      ctx.setLineDash([]);
    });

    // ── TRENCH CELLS ────────────────────────────────────────────────────
    // Draw one wide trench cross-section spanning most of the width
    const trenchTop = sidBot + 2;
    const trenchH = trenchBot - trenchTop;
    const trenchPad = W * 0.04;

    // Trench outline / structural soil box
    const tg = ctx.createLinearGradient(0, trenchTop, 0, trenchBot);
    tg.addColorStop(0, "#0f2018"); tg.addColorStop(0.5, "#0c1a12"); tg.addColorStop(1, "#091410");
    ctx.fillStyle = tg;
    ctx.beginPath(); rrPath(ctx, trenchPad, trenchTop, W - trenchPad * 2, trenchH, 4); ctx.fill();

    ctx.strokeStyle = "rgba(0,200,100,0.18)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); rrPath(ctx, trenchPad, trenchTop, W - trenchPad * 2, trenchH, 4); ctx.stroke();

    // Structural soil / gravel texture (aggregate cells)
    const cellSize = 14;
    ctx.save();
    ctx.beginPath(); rrPath(ctx, trenchPad, trenchTop, W - trenchPad * 2, trenchH, 4); ctx.clip();
    for (let cx2 = trenchPad + 6; cx2 < W - trenchPad; cx2 += cellSize) {
      for (let cy2 = trenchTop + 4; cy2 < trenchBot - 4; cy2 += cellSize) {
        const shade = 0.04 + (((cx2 + cy2) / cellSize) % 3) * 0.025;
        ctx.fillStyle = `rgba(20,60,30,${shade})`;
        ctx.beginPath(); rrPath(ctx, cx2, cy2, cellSize - 2, cellSize - 2, 2); ctx.fill();
      }
    }
    ctx.restore();

    // Water fill in trench (rises with prog)
    const maxFill = trenchH * 0.55;
    const fill = Math.min(prog * maxFill * 1.4, maxFill);
    if (fill > 3) {
      const wTop = trenchBot - fill;
      ctx.save();
      ctx.beginPath(); rrPath(ctx, trenchPad, trenchTop, W - trenchPad * 2, trenchH, 4); ctx.clip();
      const wg = ctx.createLinearGradient(0, wTop, 0, trenchBot);
      wg.addColorStop(0, "rgba(0,160,100,0.0)");
      wg.addColorStop(0.25, "rgba(0,180,110,0.35)");
      wg.addColorStop(1, "rgba(0,140,80,0.55)");
      ctx.fillStyle = wg; ctx.fillRect(trenchPad, wTop, W - trenchPad * 2, fill);
      // Water surface ripple
      ctx.strokeStyle = "rgba(80,220,150,0.32)"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let rx = trenchPad; rx <= W - trenchPad; rx += 3) {
        const ry = wTop + Math.sin((rx / 28) + t * 0.06) * 1;
        rx === Math.floor(trenchPad) ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
      }
      ctx.stroke();
      ctx.restore();
    }

    // ── TREE ROOTS ──────────────────────────────────────────────────────
    const treeXs = [W * 0.13, W * 0.27, W * 0.42, W * 0.57, W * 0.71, W * 0.86];
    treeXs.forEach((tx, ti) => drawRootSystem(ctx, tx, trenchTop, trenchBot, t, ti, prog));

    // ── WATER ENTRY SHAFTS (from curb inlets) ────────────────────────────
    const inlets = [W * 0.17, W * 0.38, W * 0.60, W * 0.81];
    inlets.forEach(ix => {
      ctx.fillStyle = "#0a1810";
      ctx.fillRect(ix - 5, sidBot, 10, trenchTop - sidBot + 6);
      ctx.strokeStyle = "rgba(0,200,120,0.15)"; ctx.lineWidth = 1;
      ctx.strokeRect(ix - 5, sidBot, 10, trenchTop - sidBot + 6);

      // Animated water drops falling in
      if (prog > 0.05) {
        for (let di = 0; di < 3; di++) {
          const dp = ((t * 0.018 + di * 0.33 + ix * 0.001) % 1);
          const dy = sidBot + dp * (trenchTop + 8 - sidBot);
          const da = (1 - Math.abs(dp - 0.5) * 1.5) * 0.7 * Math.min(prog * 2, 1);
          ctx.fillStyle = `rgba(0,200,120,${da})`;
          ctx.beginPath(); ctx.arc(ix, dy, 2.5, 0, Math.PI * 2); ctx.fill();
        }
      }
    });

    // ── TRENCH LABELS ───────────────────────────────────────────────────
    ctx.fillStyle = "rgba(0,220,120,0.88)";
    ctx.font = "bold 9px JetBrains Mono, monospace"; ctx.textAlign = "center";
    ctx.fillText("▶  UNDERGROUND TREE TRENCH — STRUCTURAL SOIL STORAGE  ◀", W / 2, trenchTop + 12);

    // Stored volume label
    const stored = Math.round(prog * 3000);
    ctx.fillStyle = "rgba(0,200,160,0.75)"; ctx.font = "7px JetBrains Mono, monospace";
    ctx.fillText(`${stored.toLocaleString()} GAL STORED IN ROOT ZONE`, W / 2, trenchTop + 22);
    ctx.textAlign = "left";

    // INFILTRATION label
    ctx.fillStyle = "rgba(0,160,100,0.45)"; ctx.font = "8px JetBrains Mono, monospace"; ctx.textAlign = "center";
    ctx.fillText("← ROOT ZONE ABSORPTION + GROUNDWATER RECHARGE →", W / 2, trenchBot + 12);
    ctx.textAlign = "left";

    // Deep perforated pipe below trench (sewer) — only when fed from the storm drain
    if (!fromTank) drawPipe(ctx, W, trenchBot, H, prog, t);

    void sceneBot;
  }

  // ── ROOT SYSTEM ────────────────────────────────────────────────────────
  function drawRootSystem(
    ctx: CanvasRenderingContext2D,
    tx: number, trenchTop: number, trenchBot: number,
    t: number, idx: number, prog: number
  ) {
    const baseY = trenchTop + 4;
    const depth = trenchBot - trenchTop - 8;
    const sway = Math.sin(t * 0.025 + idx * 0.7) * 1.5;
    const lushness = 0.5 + prog * 0.5;

    // Main tap root
    ctx.strokeStyle = `rgba(30,120,60,${0.55 * lushness})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(tx + sway, baseY); ctx.lineTo(tx + sway * 0.3, baseY + depth * 0.8); ctx.stroke();

    // Lateral roots (spreading outward)
    const laterals = [
      { dy: 0.25, dx: -55, curve: -18 },
      { dy: 0.35, dx: 50, curve: 15 },
      { dy: 0.55, dx: -70, curve: -22 },
      { dy: 0.60, dx: 65, curve: 20 },
      { dy: 0.78, dx: -40, curve: -12 },
      { dy: 0.80, dx: 45, curve: 14 },
    ];
    laterals.forEach(l => {
      const ry = baseY + depth * l.dy;
      const endX = tx + l.dx + sway;
      const alpha = (0.4 + prog * 0.35) * lushness;
      ctx.strokeStyle = `rgba(25,110,55,${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx + sway, ry);
      ctx.quadraticCurveTo(tx + l.dx * 0.5 + sway, ry + l.curve, endX, ry + l.curve * 0.5);
      ctx.stroke();

      // Fine roots
      for (let fi = 0; fi < 3; fi++) {
        const fx = endX + (fi - 1) * 8;
        const fy = ry + l.curve * 0.5;
        ctx.strokeStyle = `rgba(20,100,50,${alpha * 0.6})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + (fi - 1) * 6, fy + 8); ctx.stroke();
      }

      // Root moisture absorption glow (active when water present)
      if (prog > 0.2) {
        const absorb = ((t * 0.012 + idx * 0.15 + l.dy) % 1);
        const abX = tx + l.dx * absorb + sway;
        const abY = ry + l.curve * absorb * 0.5;
        const abA = (1 - absorb) * 0.55 * Math.min(prog * 2, 1);
        ctx.fillStyle = `rgba(0,200,100,${abA})`;
        ctx.beginPath(); ctx.arc(abX, abY, 2, 0, Math.PI * 2); ctx.fill();
      }
    });
  }

  // ── SEWER PIPE (blue, calm) ────────────────────────────────────────────
  function drawPipe(ctx: CanvasRenderingContext2D, W: number, trenchBot: number, H: number, prog: number, t: number) {
    const pipeY = trenchBot + Math.min(H - trenchBot - 36, 18);
    const pipeH = 24;
    const pipeR = 12;

    if (pipeY + pipeH > H - 4) return; // not enough space

    // Perforated connector shaft
    const shaftX = W * 0.50;
    ctx.fillStyle = "#0a1810"; ctx.fillRect(shaftX - 8, trenchBot, 16, pipeY - trenchBot);
    ctx.strokeStyle = "rgba(0,180,100,0.1)"; ctx.lineWidth = 1;
    ctx.strokeRect(shaftX - 8, trenchBot, 16, pipeY - trenchBot);

    // Pipe body (blue-tinted, calm)
    const pg = ctx.createLinearGradient(0, pipeY, 0, pipeY + pipeH);
    pg.addColorStop(0, "#0d2035"); pg.addColorStop(0.4, "#102840"); pg.addColorStop(1, "#081828");
    ctx.fillStyle = pg;
    ctx.beginPath(); rrPath(ctx, W * 0.05, pipeY, W * 0.9, pipeH, pipeR); ctx.fill();

    // Blue border (calm)
    const bA = 0.28 + Math.sin(t * 0.05) * 0.07;
    ctx.strokeStyle = `rgba(0,180,120,${bA})`; ctx.lineWidth = 2;
    ctx.beginPath(); rrPath(ctx, W * 0.05, pipeY, W * 0.9, pipeH, pipeR); ctx.stroke();

    // Green-blue glow
    const gG = ctx.createLinearGradient(0, pipeY - 4, 0, pipeY + pipeH + 4);
    gG.addColorStop(0, "rgba(0,180,100,0)"); gG.addColorStop(0.5, "rgba(0,180,100,0.11)"); gG.addColorStop(1, "rgba(0,180,100,0)");
    ctx.strokeStyle = gG; ctx.lineWidth = 6;
    ctx.beginPath(); rrPath(ctx, W * 0.05, pipeY, W * 0.9, pipeH, pipeR); ctx.stroke();

    // Water fill — reduced to ~68% (down from 105% without tree trenches)
    const wPct = Math.min(prog * 0.68, 0.68);
    const wH = pipeH * wPct, wY = pipeY + pipeH - wH;
    if (wPct > 0.02) {
      ctx.save();
      ctx.beginPath(); rrPath(ctx, W * 0.05, pipeY, W * 0.9, pipeH, pipeR); ctx.clip();
      ctx.fillStyle = `rgba(0,160,100,${0.45 + Math.sin(t * 0.05) * 0.04})`;
      ctx.fillRect(W * 0.05, wY, W * 0.9, wH);
      ctx.strokeStyle = "rgba(80,240,160,0.28)"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = W * 0.05; x <= W * 0.95; x += 2) {
        const ry = wY + Math.sin((x / 30) + t * 0.1) * 1.1;
        x === W * 0.05 ? ctx.moveTo(x, ry) : ctx.lineTo(x, ry);
      }
      ctx.stroke(); ctx.restore();
    }

    // Slow pipe particles
    const needed = 6 - particlesRef.current.filter(p => p.type === "flow").length;
    for (let i = 0; i < needed; i++)
      particlesRef.current.push({ x: W * 0.05, y: pipeY + pipeH - 5, vx: 0.7 + Math.random(), vy: 0, life: 0, maxLife: 220, type: "flow" });
    particlesRef.current = particlesRef.current.filter(p => {
      if (p.type !== "flow") return true;
      p.x += p.vx; p.life++;
      if (p.x > W * 0.95 || p.life > p.maxLife) return false;
      const pa = Math.min(p.life / 10, 1) * 0.3;
      ctx.fillStyle = `rgba(0,200,120,${pa})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
      return true;
    });

    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.025)";
    ctx.beginPath(); rrPath(ctx, W * 0.05 + 4, pipeY + 2, W * 0.9 - 8, 4, 2); ctx.fill();

    // Status
    const capPct = Math.round(wPct * 100);
    ctx.fillStyle = "rgba(0,220,140,0.8)"; ctx.font = "bold 9px JetBrains Mono, monospace";
    ctx.fillText(`SEWER PIPE — ${capPct}% CAPACITY   ✓ NORMAL  (vs 105% without tree trenches)`, W * 0.06, pipeY + pipeH + 13);
    ctx.fillStyle = "rgba(91,160,130,0.55)"; ctx.font = "8px JetBrains Mono, monospace";
    ctx.fillText("COMBINED SEWER (48\" DIA.)", W * 0.06, pipeY + pipeH + 23);
  }

  // ── HUD OVERLAY ────────────────────────────────────────────────────────
  function drawOverlay(ctx: CanvasRenderingContext2D, W: number, t: number, prog: number) {
    const pulse = 0.82 + Math.sin(t * 0.1) * 0.18;
    const runoffCap  = Math.round(prog * 3000);
    const cooling    = (prog * 4.0).toFixed(1);
    const treeHealth = Math.round(prog * 78);
    const sewerRed   = Math.round(prog * 35);

    // Top-right mode label
    ctx.fillStyle = "rgba(0,220,130,0.92)";
    ctx.font = "bold 9px JetBrains Mono, monospace"; ctx.textAlign = "right";
    ctx.fillText("TREE TRENCH GSI — RUNOFF → ROOT ZONE STORAGE", W - 12, 18);
    ctx.textAlign = "left";

    // Metrics panel
    const px = W - 216, py = 28;
    ctx.fillStyle = "rgba(4,16,12,0.90)";
    ctx.beginPath(); rrPath(ctx, px, py, 208, 112, 6); ctx.fill();
    ctx.strokeStyle = "rgba(0,220,130,0.22)"; ctx.lineWidth = 1;
    ctx.beginPath(); rrPath(ctx, px, py, 208, 112, 6); ctx.stroke();

    ctx.fillStyle = "rgba(140,230,180,0.78)"; ctx.font = "bold 8px JetBrains Mono, monospace";
    ctx.fillText("TREE TRENCH PERFORMANCE", px + 10, py + 14);

    const metrics = [
      { label: "RUNOFF CAPTURED",    val: `${runoffCap.toLocaleString()} gal`, color: "rgba(0,220,140,0.92)", bar: prog },
      { label: "URBAN COOLING",      val: `${cooling}°F cooler`,               color: "rgba(120,230,180,0.9)", bar: prog },
      { label: "TREE HEALTH BOOST",  val: `+${treeHealth}%`,                   color: "rgba(60,220,120,0.9)",  bar: prog * 0.78 },
      { label: "SEWER FLOW REDUCTION",val: `${sewerRed}%`,                     color: "rgba(0,200,160,0.9)",   bar: prog * 0.35 },
    ];
    metrics.forEach((m, i) => {
      const my = py + 26 + i * 22;
      ctx.fillStyle = "rgba(80,150,110,0.72)"; ctx.font = "7px JetBrains Mono, monospace";
      ctx.fillText(m.label, px + 10, my);
      const bW = 80, bX = px + 118;
      ctx.fillStyle = "rgba(0,180,100,0.1)"; ctx.beginPath(); rrPath(ctx, bX, my - 8, bW, 6, 2); ctx.fill();
      ctx.fillStyle = m.color; ctx.globalAlpha = pulse;
      ctx.beginPath(); rrPath(ctx, bX, my - 8, bW * Math.min(m.bar, 1), 6, 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = m.color; ctx.font = "bold 8px JetBrains Mono, monospace";
      ctx.textAlign = "right"; ctx.fillText(m.val, px + 202, my); ctx.textAlign = "left";
    });

    // Runoff → storage cycle (top-left)
    const steps = [
      { l: "RUNOFF",          c: "rgba(60,200,160,0.82)" },
      { l: "TREE TRENCH",     c: "rgba(0,220,130,0.92)" },
      { l: "ROOT ZONE STORAGE",c: "rgba(0,200,140,0.85)" },
      { l: "REDUCED SEWER",   c: "rgba(0,180,160,0.8)" },
    ];
    ctx.fillStyle = "rgba(4,16,12,0.84)";
    ctx.beginPath(); rrPath(ctx, 10, 22, 132, 72, 5); ctx.fill();
    steps.forEach((s, i) => {
      ctx.fillStyle = s.c; ctx.font = "bold 8px JetBrains Mono, monospace";
      ctx.fillText(s.l, 18, 36 + i * 16);
      if (i < steps.length - 1) {
        ctx.fillStyle = "rgba(0,200,140,0.48)"; ctx.font = "9px sans-serif";
        ctx.fillText("↓", 62, 44 + i * 16);
      }
    });
  }

  return (
    <div ref={elRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas ref={cvRef} style={{ position: "absolute", inset: 0, display: "block" }} />
    </div>
  );
}
