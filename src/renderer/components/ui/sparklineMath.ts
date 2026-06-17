export function buildSparklinePoints(values: number[], w: number, h: number, domain?: [number, number]): string {
  if (values.length === 0) return "";
  // When a fixed domain is given, map values onto it so a 1pp wiggle
  // reads as small, not as a full-height swing.
  const lo = domain ? domain[0] : Math.min(...values);
  const hi = domain ? domain[1] : Math.max(...values);
  const range = hi - lo || 1;
  const yOf = (v: number) => {
    const t = (v - lo) / range;
    const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
    return h - clamped * h;
  };
  if (values.length === 1) {
    const y = yOf(values[0]!);
    return `0,${y} ${w},${y}`;
  }
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      return `${x},${yOf(v)}`;
    })
    .join(" ");
}
