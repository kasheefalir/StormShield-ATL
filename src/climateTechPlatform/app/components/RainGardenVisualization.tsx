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

type Raindrop = { x: number; y: number; spd: number; len: number; op: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number };

export function RainGardenVisualization({ isPlaying, speed, timelineValue, source = "storm-drain" }: Props) {
  const fromTank = source === "smart-tank";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const rainRef = useRef<Raindrop[]>([]);
  const flowParticles = useRef<Particle[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    const cv = canvasRef.current;
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
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    function frame() {
      if (!cv || !ctx) return;
      if (isPlaying) tRef.current += speed;
      draw(ctx, cv.width, cv.height, tRef.current, timelineValue / 100);
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, speed, timelineValue, source]);

  function draw(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, prog: number) {
    ctx.clearRect(0, 0, W, H);

    // ── Layout ──────────────────────────────────────────────────────────
    // sky: 0 → skyH
    // yard: skyH → yardBot (houses + rain gardens live here)
    // sidewalk: yardBot → sidBot
    // street: sidBot → strBot
    // underground: strBot → H
    const skyH   = Math.floor(H * 0.42);
    const yardBot = Math.floor(H * 0.70);
    const sidBot  = yardBot + 9;
    const strBot  = sidBot + Math.floor(H * 0.09);

    // ── Sky ─────────────────────────────────────────────────────────────
    const skyG = ctx.createLinearGradient(0, 0, 0, skyH);
    skyG.addColorStop(0, "#060e1e");
    skyG.addColorStop(0.5, "#09162a");
    skyG.addColorStop(1, "#0d2030");
    ctx.fillStyle = skyG;
    ctx.fillRect(0, 0, W, skyH);

    drawClouds(ctx, W, skyH, t);
    drawRain(ctx, W, strBot, t, 0.55);

    // ── Yard base ───────────────────────────────────────────────────────
    const yardG = ctx.createLinearGradient(0, skyH, 0, yardBot);
    yardG.addColorStop(0, "#0d1e0b");
    yardG.addColorStop(1, "#142a10");
    ctx.fillStyle = yardG;
    ctx.fillRect(0, skyH, W, yardBot - skyH);

    // grass blades
    for (let gx = 3; gx < W; gx += 8) {
      const gh = 2 + Math.sin(gx * 0.22 + t * 0.02) * 1.1;
      ctx.strokeStyle = `rgba(35,130,50,${0.18 + (gx % 3) * 0.05})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(gx, yardBot);
      ctx.lineTo(gx + 1, yardBot - gh);
      ctx.stroke();
    }

    // ── Homes (4 across) ────────────────────────────────────────────────
    const homes = [
      { x: W * 0.01, w: W * 0.16, style: 0 },
      { x: W * 0.24, w: W * 0.15, style: 1 },
      { x: W * 0.48, w: W * 0.16, style: 2 },
      { x: W * 0.72, w: W * 0.15, style: 3 },
    ];
    homes.forEach((h, i) => drawHome(ctx, h.x, h.w, skyH, yardBot, t, i, h.style));

    // ── Rain gardens (between homes) ─────────────────────────────────────
    const gardens = [
      { cx: W * 0.205, w: W * 0.082 },
      { cx: W * 0.415, w: W * 0.085 },
      { cx: W * 0.635, w: W * 0.082 },
      { cx: W * 0.875, w: W * 0.080 },
    ];
    gardens.forEach((g, i) => drawGarden(ctx, g.cx, g.w, yardBot, t, prog, i));

    // ── Flow paths: downspout → garden ──────────────────────────────────
    drawFlows(ctx, homes, gardens, yardBot, t, prog);

    // ── Sidewalk ────────────────────────────────────────────────────────
    ctx.fillStyle = "#1c2a3a";
    ctx.fillRect(0, yardBot, W, sidBot - yardBot);
    ctx.strokeStyle = "rgba(0,212,216,0.1)";
    ctx.lineWidth = 0.5;
    [yardBot, sidBot].forEach(y => {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    });
    // expansion joints
    for (let jx = W * 0.12; jx < W; jx += W * 0.16) {
      ctx.strokeStyle = "rgba(0,212,216,0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(jx, yardBot); ctx.lineTo(jx, sidBot); ctx.stroke();
    }

    // ── Street ──────────────────────────────────────────────────────────
    const strG = ctx.createLinearGradient(0, sidBot, 0, strBot);
    strG.addColorStop(0, "#0f1620"); strG.addColorStop(1, "#0c1220");
    ctx.fillStyle = strG;
    ctx.fillRect(0, sidBot, W, strBot - sidBot);

    // lane marking
    ctx.strokeStyle = "rgba(255,200,0,0.18)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(0, sidBot + (strBot - sidBot) * 0.5);
    ctx.lineTo(W, sidBot + (strBot - sidBot) * 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    // Storm drain + reduced-flow trickle — only when fed from the storm drain.
    if (!fromTank) {
    // Storm drain (mostly quiet)
    const drainX = W * 0.50;
    ctx.fillStyle = "#1a2535";
    ctx.fillRect(drainX - 10, strBot - 8, 20, 11);
    ctx.strokeStyle = "rgba(0,212,216,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(drainX - 10, strBot - 8, 20, 11);
    for (let gi = 0; gi < 4; gi++) {
      ctx.beginPath();
      ctx.moveTo(drainX - 10, strBot - 7 + gi * 2.2);
      ctx.lineTo(drainX + 10, strBot - 7 + gi * 2.2);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,212,216,0.4)";
    ctx.font = "7px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText("STORM DRAIN", drainX, strBot - 11);
    ctx.textAlign = "left";

    // Thin trickle to drain (reduced flow)
    const flowA = prog * 0.20;
    ctx.strokeStyle = `rgba(30,120,200,${flowA})`;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 7]);
    ctx.lineDashOffset = -(t * 0.4);
    ctx.beginPath(); ctx.moveTo(W * 0.28, strBot - 3); ctx.lineTo(drainX - 9, strBot - 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W * 0.72, strBot - 3); ctx.lineTo(drainX + 9, strBot - 3); ctx.stroke();
    ctx.setLineDash([]);

    // Reduced-flow annotation
    ctx.fillStyle = "rgba(0,220,120,0.78)";
    ctx.font = "bold 9px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText("↓  65% PEAK FLOW REDUCTION TO STORM DRAIN  ↓", W / 2, sidBot + 13);
    ctx.textAlign = "left";
    } // end storm-drain block

    // ── Underground ──────────────────────────────────────────────────────
    drawUnderground(ctx, W, strBot, H, prog, t);

    // Underground feeder: excess from the smart tank rises into the garden cell.
    if (fromTank) {
      drawSmartTankFeeder(
        ctx,
        [{ x: 2, y: strBot + 16 }, { x: W * 0.5, y: strBot + 16 }, { x: W * 0.5, y: yardBot - 2 }],
        t, Math.min(prog / 0.85, 1),
        { label: "⟶ EXCESS FROM SMART TANK", color: "0,200,140" },
      );
    }

    // ── Top-right overlay ────────────────────────────────────────────────
    drawOverlay(ctx, W, t, prog);
  }

  // ─── CLOUDS ────────────────────────────────────────────────────────────
  function drawClouds(ctx: CanvasRenderingContext2D, W: number, skyH: number, t: number) {
    [
      { bx: W * 0.08, y: 28, r: 58, s: 0.07 },
      { bx: W * 0.32, y: 18, r: 72, s: 0.05 },
      { bx: W * 0.58, y: 32, r: 62, s: 0.06 },
      { bx: W * 0.84, y: 22, r: 52, s: 0.07 },
    ].forEach(c => {
      const cx = (c.bx + t * c.s * 0.3) % (W + 120) - 60;
      const g = ctx.createRadialGradient(cx, c.y, 0, cx, c.y, c.r);
      g.addColorStop(0, "rgba(15,30,55,0.92)");
      g.addColorStop(0.6, "rgba(10,22,40,0.72)");
      g.addColorStop(1, "rgba(5,12,25,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, c.y, c.r * 1.8, c.r * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    void skyH;
  }

  // ─── RAIN ──────────────────────────────────────────────────────────────
  function drawRain(ctx: CanvasRenderingContext2D, W: number, maxY: number, t: number, intensity: number) {
    if (rainRef.current.length === 0) {
      for (let i = 0; i < 110; i++) {
        rainRef.current.push({ x: Math.random() * W, y: Math.random() * maxY, spd: 6 + Math.random() * 6, len: 8 + Math.random() * 12, op: 0.3 + Math.random() * 0.5 });
      }
    }
    rainRef.current.forEach(d => {
      d.y += d.spd * intensity;
      if (d.y > maxY + 20) { d.y = -20; d.x = Math.random() * W; }
      ctx.strokeStyle = `rgba(120,180,255,${d.op * intensity})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2, d.y + d.len); ctx.stroke();
    });
    void t;
  }

  // ─── HOME ──────────────────────────────────────────────────────────────
  function drawHome(ctx: CanvasRenderingContext2D, x: number, w: number, yardTop: number, yardBot: number, t: number, idx: number, style: number) {
    const yardH = yardBot - yardTop;
    const hH = yardH * (0.70 + (style % 2) * 0.08);
    const hBot = yardBot - 4;
    const hTop = hBot - hH;
    const roofH = hH * (0.28 + (style % 3) * 0.04);

    // Body
    const sidings = ["#0e1e2e", "#111e2c", "#0f1c2a", "#121f2d"];
    const trims   = ["#162535", "#192a3a", "#172535", "#1a2c38"];
    const bG = ctx.createLinearGradient(x, hTop, x + w, hTop);
    bG.addColorStop(0, sidings[idx % 4]); bG.addColorStop(0.5, trims[idx % 4]); bG.addColorStop(1, sidings[idx % 4]);
    ctx.fillStyle = bG;
    ctx.fillRect(x, hTop, w, hH);

    // Siding lines
    ctx.strokeStyle = "rgba(0,212,216,0.04)";
    ctx.lineWidth = 0.5;
    for (let sy = hTop + 8; sy < hBot; sy += 8) {
      ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x + w, sy); ctx.stroke();
    }

    // Roof
    ctx.fillStyle = "#090f1a";
    ctx.beginPath();
    ctx.moveTo(x - 5, hTop);
    ctx.lineTo(x + w / 2, hTop - roofH);
    ctx.lineTo(x + w + 5, hTop);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,180,100,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 5, hTop); ctx.lineTo(x + w / 2, hTop - roofH); ctx.lineTo(x + w + 5, hTop);
    ctx.stroke();

    // Chimney on even styles
    if (style % 2 === 0) {
      const chX = x + w * 0.68;
      ctx.fillStyle = "#0a1520";
      ctx.fillRect(chX, hTop - roofH + roofH * 0.25, 9, roofH * 0.5);
    }

    // Windows
    const winH = hH * 0.14, winW = w * 0.18;
    [[x + w * 0.12, hTop + hH * 0.22], [x + w * 0.66, hTop + hH * 0.22], [x + w * 0.36, hTop + hH * 0.54]].forEach(([wx, wy], wi) => {
      ctx.fillStyle = "#08141e";
      ctx.fillRect(wx, wy, winW, winH);
      const flicker = Math.sin(t * 0.018 + x * 0.01 + wi * 1.2) > 0.88;
      ctx.fillStyle = flicker ? "rgba(0,200,210,0.42)" : "rgba(255,215,85,0.22)";
      ctx.fillRect(wx + 1, wy + 1, winW - 2, winH - 2);
      ctx.strokeStyle = "rgba(8,20,30,0.9)"; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(wx + winW / 2, wy); ctx.lineTo(wx + winW / 2, wy + winH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(wx, wy + winH / 2); ctx.lineTo(wx + winW, wy + winH / 2); ctx.stroke();
      // warm glow
      const gl = ctx.createRadialGradient(wx + winW / 2, wy + winH / 2, 0, wx + winW / 2, wy + winH / 2, winW * 1.8);
      gl.addColorStop(0, "rgba(255,200,80,0.07)"); gl.addColorStop(1, "rgba(255,200,80,0)");
      ctx.fillStyle = gl;
      ctx.fillRect(wx - winW, wy - winH, winW * 3, winH * 3);
    });

    // Door
    const dW = w * 0.20, dH = hH * 0.28;
    const dX = x + w / 2 - dW / 2, dY = hBot - dH;
    ctx.fillStyle = "#07101a"; ctx.fillRect(dX, dY, dW, dH);
    ctx.strokeStyle = "rgba(0,180,120,0.25)"; ctx.lineWidth = 1;
    ctx.strokeRect(dX + 2, dY + 2, dW - 4, dH * 0.55);
    ctx.fillStyle = "rgba(200,165,50,0.75)";
    ctx.beginPath(); ctx.arc(dX + dW * 0.76, dY + dH * 0.52, 1.8, 0, Math.PI * 2); ctx.fill();

    // Step
    ctx.fillStyle = "#1c2c3c"; ctx.fillRect(dX - 3, hBot, dW + 6, 4);

    // Downspout
    ctx.strokeStyle = "rgba(80,130,175,0.65)"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x + 5, hTop + hH * 0.12); ctx.lineTo(x + 5, hBot + 2); ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 5, hBot + 2);
    ctx.quadraticCurveTo(x + 5, hBot + 9, x - 5, hBot + 9);
    ctx.stroke();
    ctx.lineCap = "butt";

    // House edge
    ctx.strokeStyle = "rgba(0,212,216,0.07)"; ctx.lineWidth = 1;
    ctx.strokeRect(x, hTop, w, hH);
  }

  // ─── RAIN GARDEN BOWL ──────────────────────────────────────────────────
  function drawGarden(ctx: CanvasRenderingContext2D, cx: number, w: number, yardBot: number, t: number, prog: number, id: number) {
    const halfW = w / 2;
    const depth = 42; // px deep
    const rimY = yardBot - depth;
    const slope = 9;

    // Bowl path
    const bowl = () => {
      ctx.beginPath();
      ctx.moveTo(cx - halfW - slope, rimY);
      ctx.lineTo(cx + halfW + slope, rimY);
      ctx.lineTo(cx + halfW, yardBot);
      ctx.lineTo(cx - halfW, yardBot);
      ctx.closePath();
    };

    // Soil fill
    ctx.save(); bowl();
    const soilG = ctx.createLinearGradient(cx, rimY, cx, yardBot);
    soilG.addColorStop(0, "#1e3018"); soilG.addColorStop(0.5, "#162410"); soilG.addColorStop(1, "#0f1808");
    ctx.fillStyle = soilG; ctx.fill(); ctx.restore();

    // Mulch & clipped internals
    ctx.save(); bowl(); ctx.clip();

    // mulch dots
    for (let i = 0; i < 14; i++) {
      const mx = cx - halfW + (w / 13) * i + 3;
      const my = rimY + depth * (0.32 + (i % 4) * 0.12);
      ctx.fillStyle = `rgba(${36 + i * 2},${16 + i},4,0.38)`;
      ctx.beginPath(); ctx.ellipse(mx, my, 3.5 + i % 3, 1.6, i * 0.3, 0, Math.PI * 2); ctx.fill();
    }

    // Water pool (rises with prog)
    const maxWH = depth * 0.42;
    const waterH = Math.min(prog * maxWH * 1.6, maxWH);
    if (waterH > 2) {
      const wY = yardBot - waterH;
      const wG = ctx.createLinearGradient(cx, wY, cx, yardBot);
      wG.addColorStop(0, "rgba(0,120,200,0)"); wG.addColorStop(0.3, "rgba(0,145,225,0.4)"); wG.addColorStop(1, "rgba(0,100,180,0.62)");
      ctx.fillStyle = wG; ctx.fillRect(cx - halfW - slope, wY, w + slope * 2, waterH);
      // ripple
      ctx.strokeStyle = "rgba(120,210,255,0.32)"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let px = cx - halfW - slope; px <= cx + halfW + slope; px += 3) {
        const wy = wY + Math.sin((px / 20) + t * 0.07 + id * 0.9) * 0.9;
        px === Math.floor(cx - halfW - slope) ? ctx.moveTo(px, wy) : ctx.lineTo(px, wy);
      }
      ctx.stroke();
    }

    ctx.restore();

    // Plants (on top, not clipped so they can protrude above rim)
    drawPlants(ctx, cx, halfW, slope, rimY, yardBot, t, id);

    // Stone edging
    for (let ri = 0; ri < 8; ri++) {
      const sx = cx - halfW - slope + ((w + slope * 2) / 7) * ri;
      ctx.fillStyle = `rgba(${70 + ri * 4},${95 + ri * 3},${120 + ri * 4},0.65)`;
      ctx.beginPath(); ctx.ellipse(sx, rimY, 3.5 + ri % 2, 2.2, ri * 0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = "rgba(70,100,130,0.4)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - halfW - slope, rimY); ctx.lineTo(cx + halfW + slope, rimY); ctx.stroke();

    // Entry notch at top
    const nW = 10;
    ctx.fillStyle = "#0e1c12";
    ctx.fillRect(cx - nW / 2, rimY - 3, nW, 5);
    ctx.strokeStyle = "rgba(0,180,255,0.5)"; ctx.lineWidth = 1;
    ctx.strokeRect(cx - nW / 2, rimY - 3, nW, 5);

    // Infiltration droplets below bowl
    for (let ii = 0; ii < 6; ii++) {
      const fx = cx - halfW * 0.7 + (w * 1.4 / 5) * ii;
      const p2 = ((t * 0.011 + ii * 0.167 + id * 0.2) % 1);
      const fy = yardBot + p2 * 22;
      const fa = (1 - p2) * 0.5 * Math.min(prog * 2, 1);
      ctx.fillStyle = `rgba(0,160,255,${fa})`;
      ctx.beginPath(); ctx.arc(fx, fy, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    // Labels
    ctx.fillStyle = "rgba(0,225,110,0.92)";
    ctx.font = "bold 8px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText("RAIN GARDEN", cx, rimY - 9);

    const gal = Math.round(prog * 5500 * (1 + id * 0.05));
    ctx.fillStyle = "rgba(0,180,255,0.75)";
    ctx.font = "7px JetBrains Mono, monospace";
    ctx.fillText(`${gal.toLocaleString()} gal`, cx, rimY - 19);
    ctx.textAlign = "left";
  }

  // ─── NATIVE PLANTS ─────────────────────────────────────────────────────
  function drawPlants(ctx: CanvasRenderingContext2D, cx: number, halfW: number, slope: number, rimY: number, yardBot: number, t: number, id: number) {
    const baseY = yardBot - 4;
    const totalW = halfW * 2;
    const count = Math.floor(totalW / 7);
    const maxH = yardBot - rimY;

    for (let i = 0; i < count; i++) {
      const px = cx - halfW + 4 + (totalW - 8) / Math.max(count - 1, 1) * i;
      const sway = Math.sin(t * 0.038 + i * 0.65 + id) * 2.5;
      const type = (i * 3 + id * 7) % 5;
      const h = Math.min(maxH * (0.5 + (i % 4) * 0.15), maxH * 0.92);

      if (type === 0) {
        // Purple coneflower
        ctx.strokeStyle = "rgba(50,160,60,0.82)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, baseY); ctx.quadraticCurveTo(px + sway * 0.6, baseY - h * 0.55, px + sway, baseY - h); ctx.stroke();
        ctx.strokeStyle = "rgba(165,65,195,0.85)"; ctx.lineWidth = 0.8;
        for (let p = 0; p < 7; p++) {
          const a = (p / 7) * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(px + sway, baseY - h); ctx.lineTo(px + sway + Math.cos(a) * 4.5, baseY - h + Math.sin(a) * 4.5); ctx.stroke();
        }
        ctx.fillStyle = "rgba(190,80,210,0.92)"; ctx.beginPath(); ctx.arc(px + sway, baseY - h, 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(100,30,120,0.8)"; ctx.beginPath(); ctx.arc(px + sway, baseY - h, 1.3, 0, Math.PI * 2); ctx.fill();
      } else if (type === 1) {
        // Black-eyed Susan
        ctx.strokeStyle = "rgba(45,150,55,0.8)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, baseY); ctx.lineTo(px + sway * 0.8, baseY - h); ctx.stroke();
        ctx.strokeStyle = "rgba(235,175,15,0.9)"; ctx.lineWidth = 0.9;
        for (let p = 0; p < 8; p++) {
          const a = (p / 8) * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(px + sway * 0.8, baseY - h); ctx.lineTo(px + sway * 0.8 + Math.cos(a) * 5, baseY - h + Math.sin(a) * 5); ctx.stroke();
        }
        ctx.fillStyle = "rgba(225,165,10,0.9)"; ctx.beginPath(); ctx.arc(px + sway * 0.8, baseY - h, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(40,15,0,0.9)"; ctx.beginPath(); ctx.arc(px + sway * 0.8, baseY - h, 1.4, 0, Math.PI * 2); ctx.fill();
      } else if (type === 2) {
        // Switchgrass
        ctx.strokeStyle = `rgba(55,165,65,0.78)`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, baseY); ctx.quadraticCurveTo(px + sway * 1.2, baseY - h * 0.6, px + sway * 2, baseY - h); ctx.stroke();
        ctx.strokeStyle = "rgba(180,200,100,0.6)"; ctx.lineWidth = 0.7;
        for (let s = 0; s < 4; s++) {
          ctx.beginPath(); ctx.moveTo(px + sway * 2, baseY - h); ctx.lineTo(px + sway * 2 + (s - 1.5) * 3, baseY - h - 3 - s); ctx.stroke();
        }
      } else if (type === 3) {
        // Blue iris blades
        ctx.strokeStyle = `rgba(40,155,55,0.88)`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(px, baseY); ctx.quadraticCurveTo(px - sway * 1.5, baseY - h * 0.5, px - sway, baseY - h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px + 2, baseY); ctx.quadraticCurveTo(px + sway * 1.5 + 2, baseY - h * 0.5, px + sway + 2, baseY - h); ctx.stroke();
        if (i % 5 === 3) {
          ctx.fillStyle = "rgba(80,100,220,0.85)"; ctx.beginPath(); ctx.ellipse(px + sway * 0.5, baseY - h - 4, 4, 5, sway * 0.1, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(140,160,255,0.5)"; ctx.beginPath(); ctx.ellipse(px + sway * 0.5, baseY - h - 4, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        // Sedge cluster
        for (let s = 0; s < 3; s++) {
          ctx.strokeStyle = `rgba(30,145,55,${0.7 + s * 0.1})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(px + (s - 1) * 2.5, baseY);
          ctx.quadraticCurveTo(px + (s - 1) * 2.5 + sway + s, baseY - h * 0.5, px + (s - 1) * 2.5 + sway * 2, baseY - h); ctx.stroke();
        }
      }
    }

    // Cattail feature plants
    [0.15, 0.50, 0.85].forEach((frac, fi) => {
      const fpx = cx - halfW + totalW * frac;
      const fh = Math.min(maxH * 0.88, 24);
      const fsway = Math.sin(t * 0.032 + fi * 1.3 + id * 0.5) * 3.5;
      ctx.strokeStyle = "rgba(0,175,70,0.85)"; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(fpx, yardBot - 5); ctx.quadraticCurveTo(fpx + fsway, yardBot - 5 - fh * 0.45, fpx + fsway, yardBot - 5 - fh); ctx.stroke();
      ctx.fillStyle = "rgba(80,45,8,0.85)";
      ctx.beginPath(); ctx.ellipse(fpx + fsway, yardBot - 5 - fh, 2.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    });

    void slope;
  }

  // ─── FLOW PATHS ─────────────────────────────────────────────────────────
  function drawFlows(
    ctx: CanvasRenderingContext2D,
    homes: Array<{ x: number; w: number; style: number }>,
    gardens: Array<{ cx: number; w: number }>,
    yardBot: number,
    t: number,
    prog: number
  ) {
    if (prog < 0.05) return;
    const alpha = (0.5 + Math.sin(t * 0.07) * 0.25) * Math.min(prog * 2.5, 1);

    // Downspout → nearest garden arc
    homes.forEach((home, i) => {
      if (i >= gardens.length) return;
      const fromX = home.x + 5;
      const fromY = yardBot - 6;
      const toX = gardens[i].cx;
      const toY = yardBot - 20;
      ctx.strokeStyle = `rgba(30,150,255,${alpha})`;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([6, 5]); ctx.lineDashOffset = -(t * 0.85);
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.quadraticCurveTo((fromX + toX) / 2, fromY + 8, toX, toY);
      ctx.stroke(); ctx.setLineDash([]);

      // animated drop along curve
      const dp = (t * 0.016 + i * 0.25) % 1;
      const ddx = fromX + (toX - fromX) * dp;
      const ddy = fromY + 8 * Math.sin(dp * Math.PI) + (toY - fromY) * dp;
      ctx.fillStyle = `rgba(0,180,255,${alpha * 0.85})`;
      ctx.beginPath(); ctx.arc(ddx, ddy, 2.5, 0, Math.PI * 2); ctx.fill();

      // drop along downspout
      const dpipe = (t * 0.018 + i * 0.25) % 1;
      const pipeTop = yardBot - (yardBot - 10) * 0.75;
      const py2 = pipeTop + dpipe * (yardBot - 6 - pipeTop);
      ctx.fillStyle = `rgba(0,180,255,${alpha * 0.7})`;
      ctx.beginPath(); ctx.arc(home.x + 5, py2, 2, 0, Math.PI * 2); ctx.fill();
    });

    // Yard surface arrows → garden entry
    gardens.forEach((g, i) => {
      const aY = yardBot - 14;
      ctx.strokeStyle = `rgba(30,150,255,${alpha * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 5]); ctx.lineDashOffset = -(t * 0.65);
      ctx.beginPath(); ctx.moveTo(g.cx - g.w * 0.9, aY); ctx.lineTo(g.cx - 6, aY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(g.cx + g.w * 0.9, aY); ctx.lineTo(g.cx + 6, aY); ctx.stroke();
      ctx.setLineDash([]);
      void i;
    });
  }

  // ─── UNDERGROUND ────────────────────────────────────────────────────────
  function drawUnderground(ctx: CanvasRenderingContext2D, W: number, ugTop: number, H: number, prog: number, t: number) {
    const ugG = ctx.createLinearGradient(0, ugTop, 0, H);
    ugG.addColorStop(0, "#0a1218"); ugG.addColorStop(0.35, "#080f14"); ugG.addColorStop(1, "#060c10");
    ctx.fillStyle = ugG; ctx.fillRect(0, ugTop, W, H - ugTop);

    // strata
    ["rgba(30,18,8,0.5)", "rgba(20,12,5,0.35)"].forEach((col, i) => {
      ctx.strokeStyle = col; ctx.lineWidth = 0.5; ctx.setLineDash([4, 8]);
      ctx.beginPath(); ctx.moveTo(0, ugTop + 14 + i * 16); ctx.lineTo(W, ugTop + 14 + i * 16); ctx.stroke();
      ctx.setLineDash([]);
    });

    // Infiltration moisture plume
    const pA = 0.10 + Math.sin(t * 0.05) * 0.025;
    const pG = ctx.createLinearGradient(0, ugTop, 0, ugTop + 55);
    pG.addColorStop(0, `rgba(0,100,200,${pA})`); pG.addColorStop(0.6, "rgba(0,80,160,0.04)"); pG.addColorStop(1, "rgba(0,60,120,0)");
    ctx.fillStyle = pG; ctx.fillRect(0, ugTop, W, Math.min(H - ugTop, 60));

    ctx.fillStyle = "rgba(0,155,255,0.4)";
    ctx.font = "8px JetBrains Mono, monospace"; ctx.textAlign = "center";
    ctx.fillText("← SOIL RECHARGE: WATER INFILTRATING INTO GROUNDWATER →", W / 2, ugTop + 10);
    ctx.textAlign = "left";

    // Storm-drain inlet shaft + sewer pipe — only when fed from the storm drain.
    if (!fromTank) {
    // Inlet shaft
    const shaftX = W * 0.50;
    const pipeY = ugTop + Math.min(H - ugTop - 45, 38);
    ctx.fillStyle = "#0d1a24"; ctx.fillRect(shaftX - 10, ugTop, 20, pipeY - ugTop);
    ctx.strokeStyle = "rgba(0,212,216,0.1)"; ctx.lineWidth = 1;
    ctx.strokeRect(shaftX - 10, ugTop, 20, pipeY - ugTop);
    ctx.fillStyle = "rgba(91,138,176,0.55)"; ctx.font = "8px JetBrains Mono, monospace";
    ctx.fillText("STORM DRAIN INLET", shaftX - 40, ugTop + 11);

    // slow drop in shaft
    const dP = (t * 0.012) % 1;
    const dA = 0.32 * Math.min(prog * 1.8, 1);
    ctx.fillStyle = `rgba(0,160,255,${dA})`;
    ctx.beginPath(); ctx.arc(shaftX, ugTop + dP * (pipeY - ugTop), 2, 0, Math.PI * 2); ctx.fill();

    // ── PIPE (blue, calm, low fill) ──
    const pH = 28, pR = 14;
    const pBG = ctx.createLinearGradient(0, pipeY, 0, pipeY + pH);
    pBG.addColorStop(0, "#0d2035"); pBG.addColorStop(0.4, "#102840"); pBG.addColorStop(1, "#081828");
    ctx.fillStyle = pBG;
    ctx.beginPath(); rrPath(ctx, W * 0.05, pipeY, W * 0.9, pH, pR); ctx.fill();

    // Blue border (calm, no pulse)
    const bA = 0.28 + Math.sin(t * 0.05) * 0.07;
    ctx.strokeStyle = `rgba(0,140,255,${bA})`; ctx.lineWidth = 2;
    ctx.beginPath(); rrPath(ctx, W * 0.05, pipeY, W * 0.9, pH, pR); ctx.stroke();

    // Calm blue outer glow
    const cG = ctx.createLinearGradient(0, pipeY - 5, 0, pipeY + pH + 5);
    cG.addColorStop(0, "rgba(0,140,255,0)"); cG.addColorStop(0.5, "rgba(0,140,255,0.13)"); cG.addColorStop(1, "rgba(0,140,255,0)");
    ctx.strokeStyle = cG; ctx.lineWidth = 7;
    ctx.beginPath(); rrPath(ctx, W * 0.05, pipeY, W * 0.9, pH, pR); ctx.stroke();

    // Water fill ~28%
    const wPct = Math.min(prog * 0.37, 0.37);
    const wH = pH * wPct;
    const wY = pipeY + pH - wH;
    if (wPct > 0.02) {
      ctx.save();
      ctx.beginPath(); rrPath(ctx, W * 0.05, pipeY, W * 0.9, pH, pR); ctx.clip();
      ctx.fillStyle = `rgba(0,120,220,${0.48 + Math.sin(t * 0.05) * 0.04})`;
      ctx.fillRect(W * 0.05, wY, W * 0.9, wH);
      ctx.strokeStyle = "rgba(100,200,255,0.3)"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = W * 0.05; x <= W * 0.95; x += 2) {
        const ry = wY + Math.sin((x / 30) + t * 0.12) * 1.2;
        x === W * 0.05 ? ctx.moveTo(x, ry) : ctx.lineTo(x, ry);
      }
      ctx.stroke(); ctx.restore();
    }
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.beginPath(); rrPath(ctx, W * 0.05 + 4, pipeY + 2, W * 0.9 - 8, 5, 3); ctx.fill();

    // Flow particles (slow, blue)
    while (flowParticles.current.length < 7) {
      flowParticles.current.push({ x: W * 0.05, y: pipeY + pH - 5, vx: 0.8 + Math.random() * 1.2, vy: 0, life: 0, maxLife: 180 });
    }
    flowParticles.current = flowParticles.current.filter(p => {
      p.x += p.vx; p.life++;
      if (p.x > W * 0.95 || p.life > p.maxLife) return false;
      const pa = Math.min(p.life / 10, 1) * 0.35;
      ctx.fillStyle = `rgba(0,160,255,${pa})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
      return true;
    });

    // Status label — green checkmark
    const capPct = Math.round(wPct * 100);
    ctx.fillStyle = "rgba(0,210,120,0.78)"; ctx.font = "bold 9px JetBrains Mono, monospace";
    ctx.fillText(`SEWER PIPE — ${capPct}% CAPACITY   ✓ NORMAL  (vs 105% without rain gardens)`, W * 0.06, pipeY + pH + 14);
    } // end sewer/inlet block
  }

  // ─── OVERLAY PANEL ─────────────────────────────────────────────────────
  function drawOverlay(ctx: CanvasRenderingContext2D, W: number, t: number, prog: number) {
    const pulse = 0.82 + Math.sin(t * 0.10) * 0.18;
    const gallons = Math.round(prog * 22000);
    const infiltRate = (prog * 1.82).toFixed(1);
    const sewerRed = Math.round(prog * 65);
    const floodRed = Math.round(prog * 65);

    // Top-right mode label
    ctx.fillStyle = "rgba(0,220,110,0.92)";
    ctx.font = "bold 9px JetBrains Mono, monospace"; ctx.textAlign = "right";
    ctx.fillText("RAIN GARDEN GSI — RAINFALL → SOIL RECHARGE", W - 12, 18);
    ctx.textAlign = "left";

    // Metrics panel top-right
    const px = W - 214, py = 28;
    ctx.fillStyle = "rgba(4,14,30,0.88)";
    ctx.beginPath(); rrPath(ctx, px, py, 206, 112, 6); ctx.fill();
    ctx.strokeStyle = "rgba(0,220,110,0.22)"; ctx.lineWidth = 1;
    ctx.beginPath(); rrPath(ctx, px, py, 206, 112, 6); ctx.stroke();

    ctx.fillStyle = "rgba(160,220,180,0.75)"; ctx.font = "bold 8px JetBrains Mono, monospace";
    ctx.fillText("RAIN GARDEN PERFORMANCE", px + 10, py + 14);

    const metrics = [
      { label: "GALLONS CAPTURED",     val: `${gallons.toLocaleString()} gal`, color: "rgba(0,210,255,0.92)", bar: prog },
      { label: "INFILTRATION RATE",    val: `${infiltRate} in/hr`,             color: "rgba(0,220,140,0.92)", bar: prog },
      { label: "SEWER LOAD REDUCTION", val: `${sewerRed}%`,                    color: "rgba(0,200,120,0.92)", bar: prog * 0.72 },
      { label: "FLOOD RISK REDUCTION", val: `${floodRed}%`,                    color: "rgba(120,210,255,0.92)", bar: prog * 0.65 },
    ];
    metrics.forEach((m, i) => {
      const my = py + 26 + i * 22;
      ctx.fillStyle = "rgba(80,130,170,0.7)"; ctx.font = "7px JetBrains Mono, monospace";
      ctx.fillText(m.label, px + 10, my);
      const bW = 82, bX = px + 114;
      ctx.fillStyle = "rgba(0,212,216,0.08)"; ctx.beginPath(); rrPath(ctx, bX, my - 8, bW, 6, 2); ctx.fill();
      ctx.fillStyle = m.color; ctx.globalAlpha = pulse;
      ctx.beginPath(); rrPath(ctx, bX, my - 8, bW * Math.min(m.bar, 1), 6, 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = m.color; ctx.font = "bold 8px JetBrains Mono, monospace";
      ctx.textAlign = "right"; ctx.fillText(m.val, px + 200, my); ctx.textAlign = "left";
    });

    // Rainfall→Recharge cycle (top-left)
    const steps = [
      { l: "RAINFALL",     c: "rgba(120,200,255,0.8)" },
      { l: "RUNOFF",       c: "rgba(60,155,240,0.78)" },
      { l: "RAIN GARDEN",  c: "rgba(0,220,110,0.92)" },
      { l: "SOIL RECHARGE",c: "rgba(0,180,130,0.8)" },
    ];
    ctx.fillStyle = "rgba(4,14,30,0.82)";
    ctx.beginPath(); rrPath(ctx, 10, 22, 118, 72, 5); ctx.fill();
    steps.forEach((s, i) => {
      ctx.fillStyle = s.c; ctx.font = "bold 8px JetBrains Mono, monospace";
      ctx.fillText(s.l, 18, 36 + i * 16);
      if (i < steps.length - 1) {
        ctx.fillStyle = "rgba(0,212,216,0.45)"; ctx.font = "9px sans-serif";
        ctx.fillText("↓", 56, 44 + i * 16);
      }
    });
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, display: "block" }} />
    </div>
  );
}
