// Shared "excess water from smart tank" feeder pipe.
// Draws an underground pipe along an arbitrary polyline (each GSI connects
// differently, so the caller supplies the path into its own inlet/fill zone),
// with water flowing through it. The flow runs full while the GSI is below its
// capacity and tapers to a trickle as `fillFrac` → 1 (peak reached).

type Pt = { x: number; y: number };

function pointAt(pts: Pt[], s: number): Pt {
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    segs.push(l);
    total += l;
  }
  let d = s * total;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const f = segs[i] ? Math.min(d / segs[i], 1) : 0;
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * f,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * f,
      };
    }
    d -= segs[i];
  }
  return pts[pts.length - 1];
}

export function drawSmartTankFeeder(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  t: number,
  fillFrac: number,
  opts?: { label?: string; color?: string },
) {
  if (pts.length < 2) return;
  const rgb = opts?.color ?? "40,150,255";
  const fill = Math.max(0, Math.min(fillFrac, 1));
  const flow = 0.25 + (1 - fill) * 0.75; // full when empty, trickle at peak

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const stroke = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  };

  // Pipe casing
  ctx.strokeStyle = "rgba(8,24,38,0.95)";
  ctx.lineWidth = 9;
  stroke();
  ctx.strokeStyle = `rgba(${rgb},0.30)`;
  ctx.lineWidth = 9;
  stroke();

  // Animated water inside the pipe
  ctx.strokeStyle = `rgba(${rgb},${0.35 + flow * 0.45})`;
  ctx.lineWidth = 3.6;
  ctx.setLineDash([9, 7]);
  ctx.lineDashOffset = -(t * (0.8 + flow * 1.6));
  stroke();
  ctx.setLineDash([]);

  // Flowing droplets riding the path
  const n = 5;
  for (let i = 0; i < n; i++) {
    const s = ((t * 0.006 * (0.6 + flow) + i / n) % 1);
    const p = pointAt(pts, s);
    ctx.fillStyle = `rgba(${rgb},${(0.5 + flow * 0.4) * (1 - s * 0.25)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Outflow splash where the pipe meets the GSI
  const end = pts[pts.length - 1];
  ctx.fillStyle = `rgba(${rgb},${0.3 + flow * 0.3})`;
  ctx.beginPath();
  ctx.ellipse(end.x, end.y, 5, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Label near the pipe's origin
  if (opts?.label) {
    ctx.fillStyle = `rgba(${rgb},0.92)`;
    ctx.font = "bold 7px JetBrains Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillText(opts.label, pts[0].x + 4, pts[0].y - 6);
  }

  // "AT CAPACITY" tag once the GSI is essentially full
  if (fill >= 0.96) {
    ctx.fillStyle = "rgba(0,225,140,0.9)";
    ctx.font = "bold 7px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText("● GSI AT CAPACITY", end.x, end.y - 8);
  }
  ctx.textAlign = "left";
  ctx.restore();
}
