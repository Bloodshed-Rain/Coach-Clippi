/**
 * MAGI "Etched Panels" paint worklet.
 *
 * Draws procedural instrument texture behind panel surfaces: a 45-degree hatch,
 * a dot grid, a slow vertical scan band, and corner brackets. Resolution
 * independent, zero image assets. Registered as a real module (not a Blob URL)
 * so it is served with a text/javascript MIME type by the static asset host.
 *
 * Inputs (registered with @property in index.html):
 *   --magi-tint     <color>   accent used by the scan band and brackets
 *   --magi-density  <number>  hatch/dot spacing in px
 *   --magi-scan     <number>  0..1 scan position, animated by the magi-scan keyframe
 */
registerPaint(
  "magi-etch",
  class {
    static get inputProperties() {
      return ["--magi-tint", "--magi-density", "--magi-scan"];
    }

    paint(ctx, size, props) {
      const w = size.width;
      const h = size.height;
      const d = Math.max(10, parseFloat(props.get("--magi-density")) || 22);
      const scan = parseFloat(props.get("--magi-scan")) || 0;
      const tint = String(props.get("--magi-tint") || "").trim() || "rgb(126, 232, 197)";

      // 45-degree hatch
      ctx.strokeStyle = "rgba(232,237,246,0.055)";
      ctx.lineWidth = 1;
      for (let x = -h; x < w + h; x += d) {
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x + h, 0);
        ctx.stroke();
      }

      // 1px dot grid at the same spacing
      ctx.fillStyle = "rgba(232,237,246,0.08)";
      for (let y = d / 2; y < h; y += d) {
        for (let x = d / 2; x < w; x += d) {
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // Vertical scan band. Its strength is tuned for a panel taller than the
      // 160px band; on a short row the band covers the whole surface at once and
      // reads as a highlight rather than a sweep, so it is scaled down by height.
      const by = (scan - Math.floor(scan)) * (h + 180) - 90;
      const g = ctx.createLinearGradient(0, by - 80, 0, by + 80);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.5, tint);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.13 * Math.max(0.35, Math.min(1, h / 160));
      ctx.fillStyle = g;
      ctx.fillRect(0, by - 80, w, 160);

      // Corner brackets
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = tint;
      ctx.lineWidth = 1.5;
      const c = 11;
      const corners = [
        [0, 0, 1, 1],
        [w, 0, -1, 1],
        [0, h, 1, -1],
        [w, h, -1, -1],
      ];
      for (const p of corners) {
        ctx.beginPath();
        ctx.moveTo(p[0] + p[2] * c, p[1] + p[3] * 0.5);
        ctx.lineTo(p[0] + p[2] * 0.5, p[1] + p[3] * 0.5);
        ctx.lineTo(p[0] + p[2] * 0.5, p[1] + p[3] * c);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }
  },
);
