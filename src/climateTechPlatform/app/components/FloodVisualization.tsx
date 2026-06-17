import { useEffect, useRef } from "react";
import { RainGardenVisualization } from "./RainGardenVisualization";
import { TreeTrenchVisualization } from "./TreeTrenchVisualization";
import { PermeablePavementVisualization } from "./PermeablePavementVisualization";
import { SmartStorageNetworkVisualization } from "./SmartStorageNetworkVisualization";
import { RetentionBasinVisualization } from "./RetentionBasinVisualization";
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

interface FloodVisualizationProps {
  mode: "current" | "gsi";
  isPlaying: boolean;
  speed: number;
  timelineValue: number;
  activeStep: number;
  selectedSolution?: string | null;
  // "smart-tank" hides the storm-drain inlet + sewer pipe (used in the treatment train,
  // where the bioswale is fed by the smart tank's excess water).
  source?: "storm-drain" | "smart-tank";
}

export function FloodVisualization({ mode, isPlaying, speed, timelineValue, selectedSolution, source = "storm-drain" }: FloodVisualizationProps) {
  const fromTank = source === "smart-tank";
  // All hooks must be declared before any conditional return (Rules of Hooks)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const raindropsRef = useRef<Array<{ x: number; y: number; speed: number; len: number; opacity: number }>>([]);
  const pipeParticlesRef = useRef<Array<{ x: number; speed: number; life: number }>>([]);
  const splashParticlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; alpha: number }>>([]);

  const isRainGarden          = mode === "gsi" && selectedSolution === "rain-garden";
  const isTreeTrench          = mode === "gsi" && selectedSolution === "tree-trench";
  const isPermeablePavement   = mode === "gsi" && selectedSolution === "permeable-pavement";
  const isSmartStorageNetwork = mode === "gsi" && selectedSolution === "smart-storage-network";
  const isRetentionBasin      = mode === "gsi" && selectedSolution === "retention-basin";

  useEffect(() => {
    if (isRainGarden || isTreeTrench || isPermeablePavement || isSmartStorageNetwork || isRetentionBasin) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      raindropsRef.current = [];
      splashParticlesRef.current = [];
    });
    ro.observe(container);
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    return () => ro.disconnect();
  }, [isRainGarden, isTreeTrench, isPermeablePavement, isSmartStorageNetwork, isRetentionBasin]);

  useEffect(() => {
    if (isRainGarden || isTreeTrench || isPermeablePavement || isSmartStorageNetwork || isRetentionBasin) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width || 800;
    const H = canvas.height || 340;
    const groundY = H * 0.50;

    if (raindropsRef.current.length === 0) {
      for (let i = 0; i < 130; i++) {
        raindropsRef.current.push({
          x: Math.random() * W,
          y: Math.random() * groundY,
          speed: 6 + Math.random() * 6,
          len: 8 + Math.random() * 12,
          opacity: 0.3 + Math.random() * 0.5,
        });
      }
    }

    function drawScene(t: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      const isGSI = mode === "gsi";
      const overload = !isGSI;
      // In GSI mode let floodLevel reach 1.0 so the pipe reads a real % (30% max for bioswale).
      // Cap was 0.22 before, which caused the pipe to misleadingly show only ~7%.
      const floodLevel = Math.min(timelineValue / 100, 1);

      // Layout geometry
      const roadY = groundY;
      const roadH = 32;
      const curbY = roadY + roadH;
      const curbH = 6;
      const swaleH = isGSI ? 24 : 0;
      const swaleY = curbY + curbH;
      const undergroundTop = swaleY + swaleH + 2;

      // SKY
      const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
      skyGrad.addColorStop(0, "#060e1e");
      skyGrad.addColorStop(0.4, "#0a1828");
      skyGrad.addColorStop(1, "#0c1e30");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, groundY);

      drawClouds(ctx, t, W, groundY);
      drawBuildings(ctx, W, groundY, t);
      drawTrees(ctx, W, groundY, t, isGSI);
      drawStreet(ctx, W, roadY, roadH, curbY, curbH, floodLevel, overload, t, isGSI);

      if (isGSI) {
        drawBioswale(ctx, W, swaleY, swaleH, t, floodLevel);
        drawCurbCuts(ctx, W, curbY, curbH, swaleY);
        drawBioFlowPaths(ctx, W, curbY, swaleY, swaleH, t);
        drawRunoffSplit(ctx, W, curbY, swaleY, t);
      }

      drawHouses(ctx, W, groundY);
      drawVehicles(ctx, W, roadY, roadH, floodLevel);
      drawRain(ctx, W, groundY, t, isGSI ? 0.5 : 1.0);
      // In smart-tank mode the storm-drain shaft + sewer pipe are hidden — the
      // bioswale is fed by the smart tank's excess water (treatment-train stage).
      if (!fromTank) drawUnderground(ctx, W, undergroundTop, H, floodLevel, overload, t, isGSI);
      if (fromTank && isGSI) {
        drawSmartTankFeeder(
          ctx,
          [{ x: 2, y: undergroundTop + 16 }, { x: W * 0.5, y: undergroundTop + 16 }, { x: W * 0.5, y: swaleY + swaleH - 2 }],
          t, Math.min(floodLevel, 1),
          { label: "⟶ EXCESS FROM SMART TANK", color: "0,200,140" },
        );
      }

      if (overload && floodLevel > 0.3) drawFloodingWater(ctx, W, roadY, roadH, curbY, floodLevel, t);
      if (overload && floodLevel > 0.6) drawOverflowWarning(ctx, W, groundY, floodLevel, t);
      if (overload && floodLevel > 0.4) drawSplashEffects(ctx, W, roadY, roadH, floodLevel);

      drawLabels(ctx, W, overload);
    }

    // ── BIOSWALE ──────────────────────────────────────────────────────────────
    function drawBioswale(ctx: CanvasRenderingContext2D, W: number, swaleY: number, swaleH: number, t: number, floodLevel: number) {
      // Soil trench
      const soilGrad = ctx.createLinearGradient(0, swaleY, 0, swaleY + swaleH);
      soilGrad.addColorStop(0, "#1a3020");
      soilGrad.addColorStop(0.5, "#142810");
      soilGrad.addColorStop(1, "#0d1c0a");
      ctx.fillStyle = soilGrad;
      ctx.fillRect(0, swaleY, W, swaleH);

      // Standing water in swale
      const waterH = Math.min(floodLevel * 11 + 4, swaleH * 0.52);
      const waterY = swaleY + swaleH - waterH;
      const wGrad = ctx.createLinearGradient(0, waterY, 0, waterY + waterH);
      wGrad.addColorStop(0, "rgba(0,140,220,0.0)");
      wGrad.addColorStop(0.35, "rgba(0,140,220,0.35)");
      wGrad.addColorStop(1, "rgba(0,100,180,0.55)");
      ctx.fillStyle = wGrad;
      ctx.fillRect(0, waterY, W, waterH);

      // Water surface ripple
      ctx.strokeStyle = "rgba(100,200,255,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 3) {
        const wy = waterY + Math.sin((x / 45) + t * 0.06) * 1.2;
        x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
      }
      ctx.stroke();

      // Infiltration droplets descending through soil
      for (let i = 0; i < 7; i++) {
        const bx = (W * 0.13 * i + W * 0.06 + Math.sin(t * 0.03 + i * 1.3) * 18) % W;
        const progress = ((t * 0.011 + i * 0.142) % 1);
        const by = waterY + waterH * 0.3 + progress * (swaleH - waterH * 0.3 - 2);
        const alpha = (1 - progress) * 0.5;
        ctx.fillStyle = `rgba(0,160,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(bx, by, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dense vegetation layer
      drawSwaleVegetation(ctx, W, swaleY, swaleH, t);

      // Green top lip
      const lipGrad = ctx.createLinearGradient(0, swaleY, 0, swaleY + 3);
      lipGrad.addColorStop(0, "rgba(30,200,80,0.65)");
      lipGrad.addColorStop(1, "rgba(20,150,60,0)");
      ctx.fillStyle = lipGrad;
      ctx.fillRect(0, swaleY, W, 3);

      // Bold label
      ctx.save();
      ctx.fillStyle = "rgba(0,230,110,0.95)";
      ctx.font = "bold 10px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText("▼  VEGETATED BIOSWALE — RUNOFF INTERCEPTED HERE  ▼", W / 2, swaleY + swaleH / 2 + 4);
      ctx.restore();
    }

    function drawSwaleVegetation(ctx: CanvasRenderingContext2D, W: number, swaleY: number, swaleH: number, t: number) {
      const count = Math.floor(W / 17);
      for (let i = 0; i < count; i++) {
        const px = (i + 0.5) * (W / count);
        const pBaseY = swaleY + swaleH * 0.28;
        const stemH = 5 + (i % 3) * 3;
        const sway = Math.sin(t * 0.04 + i * 0.7) * 2;
        const hue = 100 + (i % 5) * 10;
        const a = 0.7 + (i % 3) * 0.1;

        ctx.strokeStyle = `hsla(${hue},70%,35%,${a})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px, pBaseY);
        ctx.quadraticCurveTo(px + sway, pBaseY - stemH * 0.5, px + sway * 1.5, pBaseY - stemH);
        ctx.stroke();

        ctx.fillStyle = `hsla(${hue},75%,38%,${a})`;
        ctx.beginPath();
        ctx.ellipse(px + sway * 1.5, pBaseY - stemH, 2.5, 1.2, sway * 0.2, 0, Math.PI * 2);
        ctx.fill();

        if (i % 3 === 1) {
          ctx.strokeStyle = "hsla(130,65%,32%,0.8)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px - 3, pBaseY);
          ctx.lineTo(px - 2 + sway, pBaseY - stemH * 0.7);
          ctx.stroke();
        }
      }

      // Feature plants (rushes)
      [0.1, 0.27, 0.44, 0.61, 0.78, 0.92].forEach((frac, idx) => {
        const fpx = W * frac;
        const fby = swaleY + swaleH * 0.12;
        const fh = 10 + (idx % 2) * 5;
        const fsway = Math.sin(t * 0.035 + idx * 1.1) * 3;
        ctx.strokeStyle = "rgba(0,180,80,0.85)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(fpx, fby + fh);
        ctx.quadraticCurveTo(fpx + fsway, fby + fh * 0.4, fpx + fsway, fby);
        ctx.stroke();
        ctx.fillStyle = "rgba(80,50,10,0.8)";
        ctx.beginPath();
        ctx.ellipse(fpx + fsway, fby, 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ── CURB CUTS ─────────────────────────────────────────────────────────────
    function drawCurbCuts(ctx: CanvasRenderingContext2D, W: number, curbY: number, curbH: number, swaleY: number) {
      const cuts = [W * 0.18, W * 0.38, W * 0.60, W * 0.80];
      cuts.forEach((cx) => {
        const cw = 14;
        ctx.fillStyle = "#0d1520";
        ctx.fillRect(cx - cw / 2, curbY, cw, curbH + 2);

        ctx.fillStyle = "#1e2e40";
        ctx.beginPath();
        ctx.moveTo(cx - cw / 2, curbY);
        ctx.lineTo(cx + cw / 2, curbY);
        ctx.lineTo(cx + cw / 2 + 4, swaleY);
        ctx.lineTo(cx - cw / 2 - 4, swaleY);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "rgba(0,220,120,0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - cw / 2 - 4, swaleY, cw + 8, 2);

        ctx.fillStyle = "rgba(0,220,120,0.85)";
        ctx.font = "bold 8px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("▼", cx, curbY - 1);
      });
      ctx.textAlign = "left";
    }

    // ── ANIMATED FLOW PATHS ────────────────────────────────────────────────────
    function drawBioFlowPaths(ctx: CanvasRenderingContext2D, W: number, curbY: number, swaleY: number, swaleH: number, t: number) {
      const cuts = [W * 0.18, W * 0.38, W * 0.60, W * 0.80];
      const alpha = 0.55 + Math.sin(t * 0.07) * 0.25;

      cuts.forEach((cx) => {
        // Surface runoff → curb cut (blue animated dashes)
        ctx.save();
        ctx.strokeStyle = `rgba(30,150,255,${alpha})`;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([7, 6]);
        ctx.lineDashOffset = -(t * 0.9);
        ctx.beginPath();
        ctx.moveTo(cx - 65, curbY - 3);
        ctx.quadraticCurveTo(cx - 20, curbY - 1, cx, curbY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 65, curbY - 3);
        ctx.quadraticCurveTo(cx + 20, curbY - 1, cx, curbY);
        ctx.stroke();
        ctx.restore();

        // Drop through curb cut into swale
        ctx.save();
        ctx.strokeStyle = `rgba(0,180,255,${alpha * 0.85})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -(t * 0.7);
        ctx.beginPath();
        ctx.moveTo(cx, curbY + 2);
        ctx.lineTo(cx, swaleY + swaleH * 0.55);
        ctx.stroke();
        ctx.restore();
      });

      // Infiltration lines (water sinking into soil)
      ctx.save();
      for (let i = 0; i < 14; i++) {
        const ix = W * 0.04 + (W * 0.92 / 14) * (i + 0.5);
        const progress = ((t * 0.009 + i * 0.071) % 1);
        const iy = swaleY + swaleH * 0.55 + progress * (swaleH * 0.4 + 8);
        const ia = (1 - progress) * 0.45;
        ctx.strokeStyle = `rgba(0,160,255,${ia})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(ix, iy);
        ctx.lineTo(ix, iy + 6);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      // Reduced flow still reaching storm drain (30% — bioswale captures 70%)
      const drainX = W * 0.47;
      ctx.save();
      ctx.strokeStyle = `rgba(0,160,220,${alpha * 0.55})`;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -(t * 0.55);
      ctx.beginPath();
      ctx.moveTo(W * 0.28, curbY - 2);
      ctx.lineTo(drainX - 8, curbY - 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W * 0.68, curbY - 2);
      ctx.lineTo(drainX + 8, curbY - 2);
      ctx.stroke();
      ctx.restore();
    }

    // ── SPLIT RUNOFF PANEL ─────────────────────────────────────────────────────
    function drawRunoffSplit(ctx: CanvasRenderingContext2D, W: number, curbY: number, swaleY: number, t: number) {
      const pulse = 0.8 + Math.sin(t * 0.1) * 0.2;
      const px = W - 188;
      const py = curbY - 72;

      ctx.fillStyle = "rgba(4,14,30,0.88)";
      ctx.beginPath();
      rrPath(ctx, px, py, 182, 66, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,212,216,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      rrPath(ctx, px, py, 182, 66, 6);
      ctx.stroke();

      ctx.fillStyle = "rgba(160,210,255,0.75)";
      ctx.font = "bold 9px JetBrains Mono, monospace";
      ctx.fillText("RUNOFF SPLIT", px + 8, py + 14);

      // 70% captured by bioswale (matches card: runoffReduction=70%, EPA/Portland bioswale data)
      ctx.fillStyle = "rgba(0,180,80,0.15)";
      ctx.beginPath();
      rrPath(ctx, px + 8, py + 20, 166, 14, 3);
      ctx.fill();
      ctx.fillStyle = `rgba(0,220,100,${pulse})`;
      ctx.beginPath();
      rrPath(ctx, px + 8, py + 20, 166 * 0.70, 14, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(0,230,110,0.95)";
      ctx.font = "bold 9px JetBrains Mono, monospace";
      ctx.fillText("70% → BIOSWALE", px + 12, py + 31);

      // 30% reaches storm drain (100% − 70% captured)
      ctx.fillStyle = "rgba(0,100,180,0.15)";
      ctx.beginPath();
      rrPath(ctx, px + 8, py + 38, 166, 14, 3);
      ctx.fill();
      ctx.fillStyle = `rgba(30,140,255,${pulse * 0.75})`;
      ctx.beginPath();
      rrPath(ctx, px + 8, py + 38, 166 * 0.30, 14, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(80,180,255,0.9)";
      ctx.font = "bold 9px JetBrains Mono, monospace";
      ctx.fillText("30% → STORM DRAIN", px + 12, py + 49);

      // Connector arrow to bioswale
      const arrA = 0.4 + Math.sin(t * 0.08) * 0.3;
      ctx.strokeStyle = `rgba(0,220,100,${arrA})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -(t * 0.4);
      ctx.beginPath();
      ctx.moveTo(px + 91, py + 66);
      ctx.lineTo(px + 91, swaleY + 6);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── STREET ────────────────────────────────────────────────────────────────
    function drawStreet(
      ctx: CanvasRenderingContext2D, W: number,
      roadY: number, roadH: number, curbY: number, curbH: number,
      floodLevel: number, overload: boolean, t: number, isGSI: boolean
    ) {
      ctx.fillStyle = "#1a2535";
      ctx.fillRect(0, roadY - 12, W, 12);

      const roadGrad = ctx.createLinearGradient(0, roadY, 0, roadY + roadH);
      roadGrad.addColorStop(0, "#111820");
      roadGrad.addColorStop(1, "#0d1520");
      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, roadY, W, roadH);

      ctx.strokeStyle = "rgba(255,200,0,0.3)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([20, 15]);
      ctx.beginPath();
      ctx.moveTo(0, roadY + roadH / 2);
      ctx.lineTo(W, roadY + roadH / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Curb
      ctx.fillStyle = "#243040";
      ctx.fillRect(0, curbY, W, curbH);

      // Erase curb at cut positions in GSI
      if (isGSI) {
        const cuts = [W * 0.18, W * 0.38, W * 0.60, W * 0.80];
        cuts.forEach((cx) => {
          ctx.fillStyle = "#0d1520";
          ctx.fillRect(cx - 7, curbY, 14, curbH);
        });
      }

      // Storm drain inlet + surface flow to it — only when fed from the storm drain.
      if (!fromTank) {
      // Storm drain inlet
      const inletX = W * 0.47;
      ctx.fillStyle = "#1a2535";
      ctx.fillRect(inletX - 8, curbY, 16, curbH + 4);
      ctx.strokeStyle = overload && floodLevel > 0.5
        ? `rgba(239,68,68,${0.7 + Math.sin(t * 0.15) * 0.2})`
        : "rgba(0,212,216,0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(inletX - 8, curbY, 16, curbH + 4);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(inletX - 8, curbY + 1 + i * 1.3);
        ctx.lineTo(inletX + 8, curbY + 1 + i * 1.3);
        ctx.stroke();
      }

      // STORM DRAIN label
      ctx.fillStyle = overload && floodLevel > 0.5 ? "rgba(239,68,68,0.7)" : "rgba(0,212,216,0.45)";
      ctx.font = "7px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText("STORM DRAIN", inletX, curbY - 4);
      ctx.textAlign = "left";

      // Surface flow to inlet
      const flowA = Math.min(floodLevel * 1.5, 0.7);
      ctx.strokeStyle = `rgba(30,120,200,${flowA})`;
      ctx.lineWidth = isGSI ? 1.4 : 2.5;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -(t * 0.8);
      ctx.beginPath();
      ctx.moveTo(isGSI ? W * 0.33 : W * 0.2, curbY - 2);
      ctx.lineTo(inletX - 6, curbY - 1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(isGSI ? W * 0.62 : W * 0.75, curbY - 2);
      ctx.lineTo(inletX + 6, curbY - 1);
      ctx.stroke();
      ctx.setLineDash([]);
      } // end storm-drain inlet block
    }

    function drawClouds(ctx: CanvasRenderingContext2D, t: number, W: number, groundY: number) {
      [
        { x: W * 0.1, y: 30, r: 55, s: 0.08 },
        { x: W * 0.35, y: 20, r: 70, s: 0.05 },
        { x: W * 0.6, y: 35, r: 60, s: 0.07 },
        { x: W * 0.85, y: 25, r: 50, s: 0.06 },
      ].forEach((c) => {
        const cx = (c.x + t * c.s * 0.3) % (W + 120) - 60;
        const grad = ctx.createRadialGradient(cx, c.y, 0, cx, c.y, c.r);
        grad.addColorStop(0, "rgba(15,30,55,0.9)");
        grad.addColorStop(0.6, "rgba(10,22,40,0.7)");
        grad.addColorStop(1, "rgba(5,12,25,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, c.y, c.r * 1.8, c.r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      void groundY;
    }

    function drawBuildings(ctx: CanvasRenderingContext2D, W: number, groundY: number, t: number) {
      [
        { x: W * 0.03, w: 55, h: 110, lit: [0.2, 0.5, 0.7] },
        { x: W * 0.12, w: 45, h: 85, lit: [0.3, 0.6] },
        { x: W * 0.65, w: 60, h: 120, lit: [0.15, 0.45, 0.65, 0.8] },
        { x: W * 0.75, w: 40, h: 70, lit: [0.3, 0.7] },
        { x: W * 0.87, w: 50, h: 95, lit: [0.2, 0.55, 0.75] },
      ].forEach((b) => {
        const by = groundY - b.h;
        const bGrad = ctx.createLinearGradient(b.x, by, b.x + b.w, by);
        bGrad.addColorStop(0, "#0a1828");
        bGrad.addColorStop(0.5, "#0d2035");
        bGrad.addColorStop(1, "#071520");
        ctx.fillStyle = bGrad;
        ctx.fillRect(b.x, by, b.w, b.h);
        b.lit.forEach((yFrac) => {
          const wy = by + b.h * yFrac;
          ctx.fillStyle = Math.sin(t * 0.02 + b.x) > 0.8 ? "rgba(0,212,216,0.6)" : "rgba(255,220,100,0.25)";
          ctx.fillRect(b.x + 6, wy, 8, 6);
          ctx.fillStyle = "rgba(255,220,100,0.2)";
          ctx.fillRect(b.x + b.w - 14, wy, 8, 6);
        });
        ctx.strokeStyle = "rgba(0,212,216,0.06)";
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x, by, b.w, b.h);
      });
    }

    function drawTrees(ctx: CanvasRenderingContext2D, W: number, groundY: number, t: number, lush: boolean) {
      [
        { x: W * 0.22, size: 28 },
        { x: W * 0.29, size: 24 },
        { x: W * 0.52, size: 26 },
        { x: W * 0.59, size: 22 },
      ].forEach((tr) => {
        const sway = Math.sin(t * 0.04 + tr.x) * 2;
        const tx = tr.x + sway;
        ctx.fillStyle = "#1a0e06";
        ctx.fillRect(tx - 3, groundY - tr.size * 0.9, 6, tr.size * 0.9);
        ctx.fillStyle = lush ? `rgba(0,${120 + Math.floor(tr.size)},80,0.85)` : "rgba(20,60,30,0.7)";
        ctx.beginPath();
        ctx.ellipse(tx, groundY - tr.size * 0.9 - tr.size * 0.6, tr.size * 0.7, tr.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        if (lush) {
          const g = ctx.createRadialGradient(tx, groundY - tr.size * 1.2, 0, tx, groundY - tr.size * 1.2, tr.size * 0.8);
          g.addColorStop(0, "rgba(0,212,100,0.15)");
          g.addColorStop(1, "rgba(0,212,100,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(tx, groundY - tr.size * 1.2, tr.size, tr.size * 0.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    function drawHouses(ctx: CanvasRenderingContext2D, W: number, groundY: number) {
      [
        { x: W * 0.18, w: 60, h: 45, color: "#12202e" },
        { x: W * 0.38, w: 55, h: 42, color: "#101c2a" },
        { x: W * 0.54, w: 65, h: 48, color: "#131f2e" },
      ].forEach((h) => {
        ctx.fillStyle = h.color;
        ctx.fillRect(h.x, groundY - h.h, h.w, h.h);
        ctx.fillStyle = "#0d1820";
        ctx.beginPath();
        ctx.moveTo(h.x - 5, groundY - h.h);
        ctx.lineTo(h.x + h.w / 2, groundY - h.h - 20);
        ctx.lineTo(h.x + h.w + 5, groundY - h.h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255,220,100,0.3)";
        ctx.fillRect(h.x + 12, groundY - h.h + 12, 14, 10);
        ctx.fillRect(h.x + h.w - 26, groundY - h.h + 12, 14, 10);
        ctx.fillStyle = "rgba(100,60,20,0.4)";
        ctx.fillRect(h.x + h.w / 2 - 6, groundY - 20, 12, 20);
        ctx.strokeStyle = "rgba(0,212,216,0.06)";
        ctx.lineWidth = 1;
        ctx.strokeRect(h.x, groundY - h.h, h.w, h.h);
      });
    }

    function drawVehicles(ctx: CanvasRenderingContext2D, W: number, roadY: number, roadH: number, floodLevel: number) {
      const carY = roadY + roadH * 0.6;
      ctx.fillStyle = "#0d2035";
      ctx.beginPath();
      rrPath(ctx, W * 0.28, carY - 12, 38, 12, 2);
      ctx.fill();
      ctx.fillStyle = "#0a1828";
      ctx.beginPath();
      rrPath(ctx, W * 0.30, carY - 20, 28, 10, 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,220,100,0.6)";
      ctx.beginPath();
      ctx.arc(W * 0.29, carY - 5, 2, 0, Math.PI * 2);
      ctx.fill();

      const car2Y = carY - floodLevel * 15 * 0.3;
      ctx.fillStyle = "#0d1a28";
      ctx.beginPath();
      rrPath(ctx, W * 0.58, car2Y - 12, 42, 12, 2);
      ctx.fill();
      ctx.fillStyle = "#0a1520";
      ctx.beginPath();
      rrPath(ctx, W * 0.61, car2Y - 20, 30, 10, 2);
      ctx.fill();
    }

    function drawRain(ctx: CanvasRenderingContext2D, W: number, groundY: number, t: number, intensity: number) {
      raindropsRef.current.forEach((d) => {
        d.y += d.speed * intensity;
        if (d.y > groundY + 20) { d.y = -20; d.x = Math.random() * W; }
        ctx.strokeStyle = `rgba(120,180,255,${d.opacity * intensity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 2, d.y + d.len);
        ctx.stroke();
      });
      void t;
    }

    function drawSplashEffects(ctx: CanvasRenderingContext2D, W: number, roadY: number, roadH: number, floodLevel: number) {
      if (Math.random() < 0.15 * floodLevel) {
        splashParticlesRef.current.push({
          x: W * 0.1 + Math.random() * W * 0.8,
          y: roadY + roadH * 0.7,
          vx: (Math.random() - 0.5) * 3,
          vy: -(1.5 + Math.random() * 2.5),
          life: 0,
          alpha: 0.8,
        });
      }
      splashParticlesRef.current = splashParticlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life++;
        p.alpha = Math.max(0, 0.8 - p.life * 0.05);
        if (p.alpha <= 0) return false;
        ctx.fillStyle = `rgba(100,180,255,${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });
    }

    // ── UNDERGROUND ───────────────────────────────────────────────────────────
    function drawUnderground(
      ctx: CanvasRenderingContext2D, W: number,
      undergroundTop: number, H: number,
      floodLevel: number, overload: boolean, t: number, isGSI: boolean
    ) {
      const ugGrad = ctx.createLinearGradient(0, undergroundTop, 0, H);
      ugGrad.addColorStop(0, "#0a1218");
      ugGrad.addColorStop(0.3, "#080f14");
      ugGrad.addColorStop(1, "#060c10");
      ctx.fillStyle = ugGrad;
      ctx.fillRect(0, undergroundTop, W, H - undergroundTop);

      // Strata
      ["rgba(30,18,8,0.5)", "rgba(20,12,5,0.35)"].forEach((color, i) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(0, undergroundTop + 16 + i * 18);
        ctx.lineTo(W, undergroundTop + 16 + i * 18);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // GSI infiltration moisture plume
      if (isGSI) {
        const plumeA = 0.12 + Math.sin(t * 0.05) * 0.03;
        const plumeGrad = ctx.createRadialGradient(W / 2, undergroundTop, 0, W / 2, undergroundTop + 35, W * 0.55);
        plumeGrad.addColorStop(0, `rgba(0,100,200,${plumeA})`);
        plumeGrad.addColorStop(0.5, "rgba(0,80,160,0.06)");
        plumeGrad.addColorStop(1, "rgba(0,60,120,0)");
        ctx.fillStyle = plumeGrad;
        ctx.fillRect(0, undergroundTop, W, Math.min(H - undergroundTop, 60));

        ctx.fillStyle = "rgba(0,160,255,0.4)";
        ctx.font = "8px JetBrains Mono, monospace";
        ctx.textAlign = "center";
        // Offset right of drain shaft to avoid overlapping the "STORM DRAIN INLET" label
        ctx.fillText("← INFILTRATING INTO SOIL →", W * 0.65, undergroundTop + 11);
        ctx.textAlign = "left";
      }

      const pipeY = undergroundTop + Math.min(H - undergroundTop - 50, 42);
      const shaftX = W * 0.47;

      // Inlet shaft
      ctx.fillStyle = "#0d1a24";
      ctx.fillRect(shaftX - 10, undergroundTop, 20, pipeY - undergroundTop);
      ctx.strokeStyle = "rgba(0,212,216,0.12)";
      ctx.lineWidth = 1;
      ctx.strokeRect(shaftX - 10, undergroundTop, 20, pipeY - undergroundTop);

      // Shaft label — offset left of center so it doesn't overlap the infiltration text
      ctx.fillStyle = "rgba(91,138,176,0.6)";
      ctx.font = "8px JetBrains Mono, monospace";
      ctx.textAlign = "right";
      ctx.fillText("STORM DRAIN INLET ↓", shaftX - 14, undergroundTop + 11);
      ctx.textAlign = "left";

      // Water drop in shaft
      if (floodLevel > 0.05) {
        const dA = Math.min(floodLevel * (isGSI ? 0.4 : 1.1), 0.7);
        const dProgress = ((t * (isGSI ? 0.014 : 0.024)) % 1);
        const dY = undergroundTop + dProgress * (pipeY - undergroundTop);
        ctx.fillStyle = `rgba(0,160,255,${dA})`;
        ctx.beginPath();
        ctx.arc(shaftX, dY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── PIPE ──────────────────────────────────────────────────────────────
      const pipeH = 28;
      const pipeR = pipeH / 2;

      // Pipe body color: red tint = overloaded, blue tint = GSI normal
      const pipeGrad = ctx.createLinearGradient(0, pipeY, 0, pipeY + pipeH);
      if (overload) {
        pipeGrad.addColorStop(0, "#251020");
        pipeGrad.addColorStop(0.4, "#2e1428");
        pipeGrad.addColorStop(1, "#180a14");
      } else {
        pipeGrad.addColorStop(0, "#0d2035");
        pipeGrad.addColorStop(0.4, "#102840");
        pipeGrad.addColorStop(1, "#081828");
      }
      ctx.fillStyle = pipeGrad;
      ctx.beginPath();
      rrPath(ctx, W * 0.05, pipeY, W * 0.9, pipeH, pipeR);
      ctx.fill();

      // Pipe border
      const borderA = overload
        ? 0.4 + Math.sin(t * 0.18) * 0.25
        : 0.28 + Math.sin(t * 0.06) * 0.08;
      ctx.strokeStyle = overload
        ? `rgba(239,68,68,${borderA})`
        : `rgba(0,140,255,${borderA})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      rrPath(ctx, W * 0.05, pipeY, W * 0.9, pipeH, pipeR);
      ctx.stroke();

      // Pipe outer glow
      if (overload && floodLevel > 0.55) {
        const gi = (floodLevel - 0.55) * 2.2 * (0.7 + Math.sin(t * 0.22) * 0.3);
        const gGrad = ctx.createLinearGradient(0, pipeY - 6, 0, pipeY + pipeH + 6);
        gGrad.addColorStop(0, "rgba(239,68,68,0)");
        gGrad.addColorStop(0.5, `rgba(239,68,68,${gi * 0.5})`);
        gGrad.addColorStop(1, "rgba(239,68,68,0)");
        ctx.strokeStyle = gGrad;
        ctx.lineWidth = 10;
        ctx.beginPath();
        rrPath(ctx, W * 0.05, pipeY, W * 0.9, pipeH, pipeR);
        ctx.stroke();
      } else if (!overload) {
        const bGrad = ctx.createLinearGradient(0, pipeY - 4, 0, pipeY + pipeH + 4);
        bGrad.addColorStop(0, "rgba(0,140,255,0)");
        bGrad.addColorStop(0.5, "rgba(0,140,255,0.14)");
        bGrad.addColorStop(1, "rgba(0,140,255,0)");
        ctx.strokeStyle = bGrad;
        ctx.lineWidth = 8;
        ctx.beginPath();
        rrPath(ctx, W * 0.05, pipeY, W * 0.9, pipeH, pipeR);
        ctx.stroke();
      }

      // Water fill: overload fills to 105% (overflow), GSI caps at 30% (bioswale captures 70% of runoff)
      const waterPct = Math.min(floodLevel * (overload ? 1.1 : 0.30), overload ? 1.05 : 1);
      const waterH2 = pipeH * waterPct;
      const waterY2 = pipeY + pipeH - waterH2;
      if (waterPct > 0.02) {
        const wCol = overload && floodLevel > 0.65
          ? `rgba(220,50,50,${0.55 + Math.sin(t * 0.1) * 0.1})`
          : `rgba(0,120,220,${0.48 + Math.sin(t * 0.06) * 0.05})`;
        ctx.save();
        ctx.beginPath();
        rrPath(ctx, W * 0.05, pipeY, W * 0.9, pipeH, pipeR);
        ctx.clip();
        ctx.fillStyle = wCol;
        ctx.fillRect(W * 0.05, waterY2, W * 0.9, waterH2);
        const rCol = overload ? "rgba(255,120,120,0.3)" : "rgba(100,200,255,0.3)";
        ctx.strokeStyle = rCol;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = W * 0.05; x <= W * 0.95; x += 2) {
          const ry = waterY2 + Math.sin((x / 30) + t * 0.15) * 1.5;
          x === W * 0.05 ? ctx.moveTo(x, ry) : ctx.lineTo(x, ry);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Pipe highlight
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.beginPath();
      rrPath(ctx, W * 0.05 + 4, pipeY + 2, W * 0.9 - 8, 5, 3);
      ctx.fill();

      // Flow particles
      if (pipeParticlesRef.current.length < (overload ? 18 : 7)) {
        pipeParticlesRef.current.push({ x: W * 0.05, speed: 2 + Math.random() * 3, life: 0 });
      }
      pipeParticlesRef.current = pipeParticlesRef.current.filter((p) => {
        p.x += p.speed * (overload ? 1.8 : 0.45);
        p.life++;
        if (p.x > W * 0.95) return false;
        const pA = Math.min(p.life / 10, 1) * (overload ? 0.6 : 0.35);
        ctx.fillStyle = overload ? `rgba(220,80,80,${pA})` : `rgba(0,160,255,${pA})`;
        ctx.beginPath();
        ctx.arc(p.x, pipeY + pipeH - 5, 2, 0, Math.PI * 2);
        ctx.fill();
        return p.life < 200;
      });

      // Manhole overflow
      if (overload && floodLevel > 0.75) {
        const oA = (floodLevel - 0.75) * 4;
        const mhX = W * 0.47;
        ctx.fillStyle = `rgba(239,68,68,${oA * 0.8})`;
        ctx.beginPath();
        ctx.ellipse(mhX, undergroundTop + 2, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        const oGrad = ctx.createRadialGradient(mhX, undergroundTop + 2, 0, mhX, undergroundTop + 2, 65);
        oGrad.addColorStop(0, `rgba(239,68,68,${oA * 0.35})`);
        oGrad.addColorStop(1, "rgba(239,68,68,0)");
        ctx.fillStyle = oGrad;
        ctx.beginPath();
        ctx.arc(mhX, undergroundTop + 2, 65, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pipe status label
      const capPct = Math.round(Math.min(waterPct * 100, overload ? 105 : 100));
      const pipeLabel = overload
        ? `SEWER PIPE — ${capPct}% CAPACITY   ⚠ OVERLOADED`
        : `SEWER PIPE — ${capPct}% CAPACITY   ✓ NORMAL`;
      ctx.fillStyle = overload
        ? `rgba(239,68,68,${0.7 + Math.sin(t * 0.12) * 0.2})`
        : "rgba(0,200,120,0.75)";
      ctx.font = "bold 9px JetBrains Mono, monospace";
      ctx.fillText(pipeLabel, W * 0.06, pipeY + pipeH + 14);
    }

    function drawFloodingWater(ctx: CanvasRenderingContext2D, W: number, roadY: number, roadH: number, curbY: number, floodLevel: number, t: number) {
      const depth = (floodLevel - 0.3) * 28;
      const waterTop = curbY - depth;
      const wGrad = ctx.createLinearGradient(0, waterTop, 0, curbY);
      wGrad.addColorStop(0, "rgba(20,60,140,0.0)");
      wGrad.addColorStop(0.3, "rgba(20,80,180,0.25)");
      wGrad.addColorStop(1, "rgba(15,55,140,0.5)");
      ctx.fillStyle = wGrad;
      ctx.fillRect(0, waterTop, W, curbY - waterTop);
      ctx.strokeStyle = "rgba(100,180,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < W; x += 2) {
        const wy = waterTop + Math.sin((x / 40) + t * 0.08) * 2;
        x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
      }
      ctx.stroke();
      void roadY; void roadH;
    }

    function drawOverflowWarning(ctx: CanvasRenderingContext2D, W: number, groundY: number, floodLevel: number, t: number) {
      const pulse = Math.sin(t * 0.2) * 0.5 + 0.5;
      const alpha = (floodLevel - 0.6) * 2.5 * pulse;
      ctx.strokeStyle = `rgba(239,68,68,${alpha})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -(t * 0.5);
      ctx.strokeRect(10, 10, W - 20, groundY + 40);
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(239,68,68,${alpha * 0.85})`;
      ctx.font = "bold 11px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText("⚠  SEWER OVERFLOW — FLOOD EVENT IN PROGRESS", W / 2, 25);
      ctx.textAlign = "left";
    }

    function drawLabels(ctx: CanvasRenderingContext2D, W: number, overload: boolean) {
      ctx.fillStyle = overload ? "#ef4444" : "#00d4d8";
      ctx.font = "bold 9px JetBrains Mono, monospace";
      ctx.textAlign = "right";
      ctx.fillText(overload ? "CURRENT SYSTEM — OVERLOADED" : "WITH GSI — FLOW INTERCEPTED", W - 12, 18);
      ctx.textAlign = "left";
    }

    function loop() {
      if (!canvasRef.current) return;
      if (isPlaying) timeRef.current += speed;
      drawScene(timeRef.current);
      animFrameRef.current = requestAnimationFrame(loop);
    }

    animFrameRef.current = requestAnimationFrame(loop);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [mode, isPlaying, speed, timelineValue, source]);

  if (isRainGarden) {
    return <RainGardenVisualization isPlaying={isPlaying} speed={speed} timelineValue={timelineValue} />;
  }

  if (isTreeTrench) {
    return <TreeTrenchVisualization isPlaying={isPlaying} speed={speed} timelineValue={timelineValue} />;
  }

  if (isPermeablePavement) {
    return <PermeablePavementVisualization isPlaying={isPlaying} speed={speed} timelineValue={timelineValue} />;
  }

  if (isSmartStorageNetwork) {
    return <SmartStorageNetworkVisualization isPlaying={isPlaying} speed={speed} timelineValue={timelineValue} />;
  }

  if (isRetentionBasin) {
    return <RetentionBasinVisualization isPlaying={isPlaying} speed={speed} timelineValue={timelineValue} />;
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, display: "block" }} />
    </div>
  );
}
