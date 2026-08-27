/**
 * MAGI advanced web effects.
 *
 * Implements the effects study for themagi.gg. Which effects run is decided by
 * the `fx` query parameter, resolved into `<html data-fx="...">` by the inline
 * bootstrap in index.html (early, so CSS-driven effects apply before paint):
 *
 *   ?fx=all                     every effect, including both hero options
 *   ?fx=none                    plain page
 *   ?fx=cloud,etch,beam         the design handoff's recommended production set
 *   ?fx=flow                    swap the hero particle cloud for the flow field
 *
 * Canvas effects: 01 flow (`flow`), 02 frame cloud (`cloud`), 03 wordmark
 * plasma (`plasma`), 04 replay warp (`warp`). CSS/SVG effects: 05 etched panels
 * (`etch`, needs the paint worklet registered here), 06 scroll ledger
 * (`ledger`, pure CSS), 07 signal beam (`beam`, pure CSS), 08 interference
 * (`interfere`, SVG filter injected here).
 *
 * Every canvas effect owns its lifecycle: sized to the element at capped DPR,
 * and only ticking while the element is on screen.
 */
(() => {
  "use strict";

  const active = new Set((document.documentElement.dataset.fx || "").split(/\s+/).filter(Boolean));
  const on = (name) => active.has(name);
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const MINT = [126, 232, 197];
  const PERIWINKLE = [160, 168, 255];
  const LILAC = [197, 182, 255];
  const ROSE = [255, 138, 158];

  /* ------------------------------------------------------------------ *
   * Shared helpers
   * ------------------------------------------------------------------ */

  const dpr = () => Math.min(2, window.devicePixelRatio || 1);

  /** Size a canvas backing store to its layout box; true when it changed. */
  const sizeCanvas = (canvas, density = dpr()) => {
    const w = Math.max(1, Math.round(canvas.clientWidth * density));
    const h = Math.max(1, Math.round(canvas.clientHeight * density));
    if (canvas.width === w && canvas.height === h) return false;
    canvas.width = w;
    canvas.height = h;
    return true;
  };

  /**
   * Run fn(elapsed, dt) on rAF, but only while `el` is on screen. The clock is
   * held while paused, so an effect resumes mid-motion instead of jumping, and
   * dt is capped so a backgrounded tab does not explode the integration.
   */
  const raf = (el, fn) => {
    let handle = 0;
    let running = false;
    let last = 0;
    let elapsed = 0;

    const tick = (now) => {
      if (!running) return;
      handle = requestAnimationFrame(tick);
      const dt = Math.min(0.034, Math.max(0, (now - last) / 1000));
      last = now;
      elapsed += dt;
      fn(elapsed, dt);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      handle = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(handle);
    };

    new IntersectionObserver((entries) => (entries[0]?.isIntersecting ? start() : stop()), {
      threshold: 0.01,
      rootMargin: "120px",
    }).observe(el);
  };

  /**
   * Pointer position relative to an element, read once per frame rather than
   * per event. Coordinates come from getBoundingClientRect so they stay correct
   * under transforms and scroll; window-level listeners mean the hero layers can
   * stay pointer-events: none and still react.
   */
  const trackPointer = (el) => {
    const fine = window.matchMedia?.("(pointer: fine)")?.matches ?? true;
    if (!fine) return { read: () => ({ x: 0.5, y: 0.5, on: false, inside: false }) };

    let cx = 0;
    let cy = 0;
    let seen = false;
    window.addEventListener(
      "pointermove",
      (event) => {
        cx = event.clientX;
        cy = event.clientY;
        seen = true;
      },
      { passive: true },
    );
    window.addEventListener(
      "pointerleave",
      () => {
        seen = false;
      },
      { passive: true },
    );

    return {
      read() {
        if (!seen) return { x: 0.5, y: 0.5, on: false, inside: false };
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return { x: 0.5, y: 0.5, on: false, inside: false };
        const x = (cx - r.left) / r.width;
        const y = (cy - r.top) / r.height;
        return { x, y, on: true, inside: x >= 0 && x <= 1 && y >= 0 && y <= 1 };
      },
    };
  };

  /** Compile and link a WebGL2 program, logging the actual driver error. */
  const glProgram = (gl, vertexSrc, fragmentSrc) => {
    const compile = (type, src) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
      console.warn("[magi-fx] shader compile failed", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    };
    const vs = compile(gl.VERTEX_SHADER, vertexSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragmentSrc);
    if (!vs || !fs) return null;
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
    console.warn("[magi-fx] program link failed", gl.getProgramInfoLog(program));
    return null;
  };

  /** Full-viewport triangle shared by the two WebGL2 effects. */
  const fullscreenTriangle = (gl, program) => {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "a");
    return () => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
  };

  const makeCanvas = (className) => {
    const canvas = document.createElement("canvas");
    canvas.className = className;
    canvas.setAttribute("aria-hidden", "true");
    return canvas;
  };

  /* ------------------------------------------------------------------ *
   * Effect 01 — "Neutral Flow": curl-noise flow field
   *
   * Canvas2D rather than p5: noise() and line() were the only p5 APIs the design
   * prototype used, and 900KB of library for Perlin noise plus a line primitive
   * is not worth it on a static page. The noise below is a port of p5's own
   * implementation, so the tuned constants (0.0014 sample scale, PI * 7 angle
   * spread, 4 sub-steps) produce the field they were tuned against.
   *
   * The canvas stays transparent — the trail decays by erasing alpha rather than
   * painting ink over itself — so the ambient gradient and the drifting wireframe
   * roster behind it remain visible.
   * ------------------------------------------------------------------ */

  const flow = (host) => {
    const canvas = makeCanvas("hero-fx-canvas");
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // p5-compatible Perlin noise, noiseDetail(3, 0.5).
    const SIZE = 4095;
    const YWRAPB = 4;
    const YWRAP = 1 << YWRAPB;
    const ZWRAPB = 8;
    const ZWRAP = 1 << ZWRAPB;
    const OCTAVES = 3;
    const FALLOFF = 0.5;
    const table = new Float64Array(SIZE + 1);
    for (let i = 0; i <= SIZE; i += 1) table[i] = Math.random();
    const fade = (v) => 0.5 * (1 - Math.cos(v * Math.PI));

    const noise = (x, y, z) => {
      let xi = Math.floor(x);
      let yi = Math.floor(y);
      let zi = Math.floor(z);
      let xf = x - xi;
      let yf = y - yi;
      let zf = z - zi;
      let result = 0;
      let ampl = 0.5;

      for (let o = 0; o < OCTAVES; o += 1) {
        let of = xi + (yi << YWRAPB) + (zi << ZWRAPB);
        const rxf = fade(xf);
        const ryf = fade(yf);

        let n1 = table[of & SIZE];
        n1 += rxf * (table[(of + 1) & SIZE] - n1);
        let n2 = table[(of + YWRAP) & SIZE];
        n2 += rxf * (table[(of + YWRAP + 1) & SIZE] - n2);
        n1 += ryf * (n2 - n1);

        of += ZWRAP;
        n2 = table[of & SIZE];
        n2 += rxf * (table[(of + 1) & SIZE] - n2);
        let n3 = table[(of + YWRAP) & SIZE];
        n3 += rxf * (table[(of + YWRAP + 1) & SIZE] - n3);
        n2 += ryf * (n3 - n2);

        n1 += fade(zf) * (n2 - n1);
        result += n1 * ampl;
        ampl *= FALLOFF;

        xi <<= 1;
        xf *= 2;
        yi <<= 1;
        yf *= 2;
        zi <<= 1;
        zf *= 2;
        if (xf >= 1) {
          xi += 1;
          xf -= 1;
        }
        if (yf >= 1) {
          yi += 1;
          yf -= 1;
        }
        if (zf >= 1) {
          zi += 1;
          zf -= 1;
        }
      }
      return result;
    };

    const PALETTE = [MINT, PERIWINKLE, LILAC, ROSE];
    const PICK = [0, 0, 0, 1, 1, 2, 3]; // 3:2:1:1 bias keeps it on-brand, not rainbow
    const SUBSTEPS = 4; // single-step integration stipples; four gives ribbons
    const BUCKETS = 12; // alpha quantization: 48 style strings a frame, not ~3300
    const REPEL_RADIUS = 175;
    // The tuned count of 820 assumes a hero around 1.26M device pixels. Hold
    // agents-per-area constant instead: a phone hero is a quarter the area, and
    // 820 agents in it saturates into a white smear. Capped for the CPU.
    const REF_AREA = 1260000;
    const heroArea = Math.max(1, window.innerWidth) * Math.max(1, Math.round(window.innerHeight * 0.86));
    const COUNT = Math.max(120, Math.min(1400, Math.round((820 * heroArea) / REF_AREA)));

    let w = 0;
    let h = 0;
    let z = 0;
    let needsResize = true;

    const agents = [];
    const respawn = (a) => {
      a.x = Math.random() * w;
      a.y = Math.random() * h;
      a.vx = 0;
      a.vy = 0;
      a.life = 140 + Math.random() * 460;
    };
    for (let i = 0; i < COUNT; i += 1) agents.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0 });

    const batches = [];
    const STYLES = [];
    for (let c = 0; c < PALETTE.length; c += 1) {
      for (let k = 0; k < BUCKETS; k += 1) {
        batches.push([]);
        const alpha = (26 + ((k + 0.5) / BUCKETS) * 120) / 255;
        STYLES.push(`rgba(${PALETTE[c][0]}, ${PALETTE[c][1]}, ${PALETTE[c][2]}, ${alpha.toFixed(3)})`);
      }
    }

    const pointer = trackPointer(canvas);
    new ResizeObserver(() => {
      needsResize = true;
    }).observe(host);

    raf(host, () => {
      if (needsResize) {
        needsResize = false;
        // pixelDensity 1: the tuned constants are all in CSS pixels.
        if (sizeCanvas(canvas, 1)) {
          w = canvas.width;
          h = canvas.height;
          agents.forEach(respawn);
        }
      }

      const p = pointer.read();
      const px0 = p.on ? p.x * w : -9999;
      const py0 = p.on ? p.y * h : -9999;

      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.043)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 1.5;

      for (let b = 0; b < batches.length; b += 1) batches[b].length = 0;
      z += 0.0018;

      for (let i = 0; i < COUNT; i += 1) {
        const a = agents[i];
        const colour = PICK[i % 7];

        for (let s = 0; s < SUBSTEPS; s += 1) {
          const angle = (noise(a.x * 0.0014, a.y * 0.0014, z) - 0.5) * Math.PI * 7;
          a.vx += Math.cos(angle) * 0.44;
          a.vy += Math.sin(angle) * 0.44;

          const dx = a.x - px0;
          const dy = a.y - py0;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < REPEL_RADIUS) {
            const f = (1 - d / REPEL_RADIUS) * 3.2;
            a.vx += (dx / (d + 0.001)) * f;
            a.vy += (dy / (d + 0.001)) * f;
          }

          a.vx *= 0.95;
          a.vy *= 0.95;
          const prevX = a.x;
          const prevY = a.y;
          a.x += a.vx;
          a.y += a.vy;

          const speed = Math.min(1, Math.sqrt(a.vx * a.vx + a.vy * a.vy) / 6);
          const bucket = Math.min(BUCKETS - 1, (speed * BUCKETS) | 0);
          batches[colour * BUCKETS + bucket].push(prevX, prevY, a.x, a.y);
        }

        a.life -= 1;
        if (a.life < 0 || a.x < -30 || a.x > w + 30 || a.y < -30 || a.y > h + 30) respawn(a);
      }

      // Grouped by style but still stroked one at a time: under "lighter" a
      // single path composites once, so batching would merge a bundle of strands
      // into one flat ribbon instead of letting them accumulate into hot spots.
      for (let b = 0; b < batches.length; b += 1) {
        const seg = batches[b];
        if (seg.length === 0) continue;
        ctx.strokeStyle = STYLES[b];
        for (let n = 0; n < seg.length; n += 4) {
          ctx.beginPath();
          ctx.moveTo(seg[n], seg[n + 1]);
          ctx.lineTo(seg[n + 2], seg[n + 3]);
          ctx.stroke();
        }
      }
    });
  };

  /* ------------------------------------------------------------------ *
   * Effect 02 — "Frame Cloud": GPU-resident particle system
   *
   * One compute pass advances every particle, one instanced render pass draws
   * them as additive glow quads. Falls back to a Canvas2D port of the same force
   * model when WebGPU is missing or the adapter request fails.
   * ------------------------------------------------------------------ */

  const CLOUD_STRUCTS = `
struct P { pos: vec2f, vel: vec2f, seed: f32, life: f32 };
struct U {
  time: f32, dt: f32, aspect: f32, count: f32,
  mouse: vec2f, mouseOn: f32, pad0: f32,
  c0: vec4f, c1: vec4f, c2: vec4f,
};
fn hash21(p: vec2f) -> f32 {
  var q = fract(p * vec2f(123.34, 456.21));
  q = q + dot(q, q + 45.32);
  return fract(q.x * q.y);
}`;

  const CLOUD_COMPUTE =
    CLOUD_STRUCTS +
    `
@group(0) @binding(0) var<storage, read_write> parts: array<P>;
@group(0) @binding(1) var<uniform> u: U;
@compute @workgroup_size(64)
fn cs(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= u32(u.count)) { return; }
  var p = parts[i];
  let t = u.time;
  var acc = vec2f(0.0, 0.0);
  // Analytic curl field: this is what gives the cloud its volumetric structure.
  let q = p.pos * 1.7;
  let fx = sin(q.y * 1.7 + t * 0.33) + cos(q.x * 1.15 - t * 0.24) * 0.8;
  let fy = cos(q.y * 1.05 - t * 0.29) * 0.8 - sin(q.x * 1.9 + t * 0.21);
  acc = vec2f(fx, fy) * (0.85 + p.seed * 0.5);
  // Three orbiting attractors, deliberately weak: they bend the field rather
  // than collapsing it into point singularities.
  for (var k: u32 = 0u; k < 3u; k = k + 1u) {
    let ang = t * (0.19 + f32(k) * 0.07) + f32(k) * 2.0944;
    let a = vec2f(cos(ang) * 0.72 * u.aspect, sin(ang * 1.27) * 0.46);
    let d = a - p.pos;
    let r = max(length(d), 0.14);
    acc = acc + (d / r) * (0.11 / (r * r + 0.55));
  }
  acc = acc + vec2f(-p.pos.y, p.pos.x) * 0.75 - p.pos * 0.55;
  if (u.mouseOn > 0.5) {
    let md = p.pos - u.mouse;
    let mr = max(length(md), 0.05);
    acc = acc + (md / mr) * (0.42 / (mr * mr + 0.09));
  }
  p.vel = (p.vel + acc * u.dt) * 0.955;
  p.pos = p.pos + p.vel * u.dt;
  p.life = p.life - u.dt * (0.24 + p.seed * 0.3);
  if (p.life <= 0.0 || abs(p.pos.x) > 1.5 * u.aspect || abs(p.pos.y) > 1.4) {
    // Uniform respawn across the frame is what fills it; radial respawn
    // produced a tight central blob.
    let hx = hash21(vec2f(f32(i) * 0.013, floor(t * 11.0)));
    let hy = hash21(vec2f(floor(t * 13.0) + 7.0, f32(i) * 0.029));
    p.pos = vec2f((hx * 2.0 - 1.0) * 1.18 * u.aspect, (hy * 2.0 - 1.0) * 1.06);
    p.vel = vec2f(0.0, 0.0);
    p.life = 0.8 + hash21(vec2f(f32(i), t)) * 2.6;
  }
  parts[i] = p;
}`;

  const CLOUD_RENDER =
    CLOUD_STRUCTS +
    `
@group(0) @binding(0) var<storage, read> parts: array<P>;
@group(0) @binding(1) var<uniform> u: U;
struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) col: vec3f, @location(2) a: f32 };
@vertex
fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VO {
  var q = array<vec2f, 6>(vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0), vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0));
  let p = parts[ii];
  let o = q[vi];
  let s = 0.0055 + p.seed * 0.008;
  var out: VO;
  out.pos = vec4f((p.pos.x + o.x * s) / u.aspect, p.pos.y + o.y * s, 0.0, 1.0);
  out.uv = o;
  let sp = clamp(length(p.vel) * 0.42, 0.0, 1.0);
  var c = mix(u.c0.rgb, u.c1.rgb, pow(clamp(p.seed, 0.0, 1.0), 1.9));
  c = mix(c, u.c2.rgb, sp * sp * 0.35);
  out.col = c;
  // Fades in on spawn as well as out on death, so particles never pop.
  out.a = clamp(p.life * 0.7, 0.0, 1.0) * min(1.0, 0.9 - p.life * 0.12) * (0.3 + sp * 0.55);
  return out;
}
@fragment
fn fs(in: VO) -> @location(0) vec4f {
  let d = length(in.uv);
  if (d > 1.0) { discard; }
  let f = pow(1.0 - d, 2.8) * in.a;
  return vec4f(in.col * f * 1.7, f * 0.8);
}`;

  const cloud2d = (canvas) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.dataset.fxPath = "canvas2d";

    const MAX = window.innerWidth < 900 ? 3600 : 9000;
    const parts = new Float32Array(MAX * 6);
    for (let i = 0; i < MAX; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.05 + Math.random() * 0.7;
      const o = i * 6;
      parts[o] = Math.cos(a) * r;
      parts[o + 1] = Math.sin(a) * r;
      parts[o + 2] = -Math.sin(a) * 0.2;
      parts[o + 3] = Math.cos(a) * 0.2;
      parts[o + 4] = Math.random();
      parts[o + 5] = 0.4 + Math.random() * 3.6;
    }

    const pointer = trackPointer(canvas);

    raf(canvas, (t, dt) => {
      sizeCanvas(canvas);
      const W = canvas.width;
      const H = canvas.height;
      const asp = W / H;
      const p = pointer.read();
      const mx = (p.x * 2 - 1) * asp;
      const my = -(p.y * 2 - 1);

      // Erase alpha rather than painting ink, so the layers behind the hero
      // canvas stay visible.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < MAX; i += 1) {
        const o = i * 6;
        let ax = 0;
        let ay = 0;

        for (let k = 0; k < 3; k += 1) {
          const ang = t * (0.21 + k * 0.09) + k * 2.0944;
          const tx = Math.cos(ang) * 0.66 * asp;
          const ty = Math.sin(ang * 1.27) * 0.44;
          const dx = tx - parts[o];
          const dy = ty - parts[o + 1];
          const r = Math.max(0.06, Math.hypot(dx, dy));
          const f = 0.55 / (r * r + 0.25);
          ax += (dx / r) * f;
          ay += (dy / r) * f;
        }

        const swirl = 0.55 + 0.4 * Math.sin(parts[o + 1] * 3 + t * 0.6) * Math.cos(parts[o] * 2.4 - t * 0.45);
        ax += -parts[o + 1] * swirl;
        ay += parts[o] * swirl;

        if (p.on) {
          const dx = parts[o] - mx;
          const dy = parts[o + 1] - my;
          const r = Math.max(0.04, Math.hypot(dx, dy));
          const f = 0.6 / (r * r + 0.06);
          ax += (dx / r) * f;
          ay += (dy / r) * f;
        }

        parts[o + 2] = (parts[o + 2] + ax * dt) * 0.968;
        parts[o + 3] = (parts[o + 3] + ay * dt) * 0.968;
        parts[o] += parts[o + 2] * dt;
        parts[o + 1] += parts[o + 3] * dt;
        parts[o + 5] -= dt * (0.18 + parts[o + 4] * 0.16);

        if (parts[o + 5] <= 0 || Math.abs(parts[o]) > 1.8 * asp || Math.abs(parts[o + 1]) > 1.7) {
          const a = Math.random() * Math.PI * 2;
          const r = 0.08 + Math.random() * 0.55;
          parts[o] = Math.cos(a) * r * asp;
          parts[o + 1] = Math.sin(a) * r;
          parts[o + 2] = -Math.sin(a) * 0.24;
          parts[o + 3] = Math.cos(a) * 0.24;
          parts[o + 5] = 1.2 + Math.random() * 3.4;
        }

        const speed = Math.min(1, Math.hypot(parts[o + 2], parts[o + 3]) * 0.5);
        const k = parts[o + 4];
        const cr = MINT[0] * (1 - k) + PERIWINKLE[0] * k;
        const cg = MINT[1] * (1 - k) + PERIWINKLE[1] * k;
        const cb = MINT[2] * (1 - k) + PERIWINKLE[2] * k;
        ctx.fillStyle = `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${(0.16 + speed * 0.5).toFixed(3)})`;
        ctx.fillRect((parts[o] / asp) * 0.5 * W + 0.5 * W, (0.5 - parts[o + 1] * 0.5) * H, 1.6, 1.6);
      }
    });
  };

  const cloud = async (host) => {
    const canvas = makeCanvas("hero-fx-canvas");
    host.appendChild(canvas);
    if (!navigator.gpu) return cloud2d(canvas);

    let device;
    let ctx;
    let format;
    try {
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
      if (!adapter) throw new Error("no adapter");
      device = await adapter.requestDevice();
      ctx = canvas.getContext("webgpu");
      if (!ctx) throw new Error("no webgpu context");
      format = navigator.gpu.getPreferredCanvasFormat();
      ctx.configure({ device, format, alphaMode: "premultiplied" });
    } catch (error) {
      console.info("[magi-fx] WebGPU unavailable, using Canvas2D cloud:", error.message);
      return cloud2d(canvas);
    }
    canvas.dataset.fxPath = "webgpu";

    const computeModule = device.createShaderModule({ code: CLOUD_COMPUTE });
    const renderModule = device.createShaderModule({ code: CLOUD_RENDER });

    const computeLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      ],
    });
    const renderLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
        { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      ],
    });

    const computePipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [computeLayout] }),
      compute: { module: computeModule, entryPoint: "cs" },
    });
    const renderPipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [renderLayout] }),
      vertex: { module: renderModule, entryPoint: "vs" },
      fragment: {
        module: renderModule,
        entryPoint: "fs",
        targets: [
          {
            format,
            blend: {
              color: { srcFactor: "one", dstFactor: "one", operation: "add" },
              alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
            },
          },
        ],
      },
      primitive: { topology: "triangle-list" },
    });

    const MAX = 131072;
    const seed = new Float32Array(MAX * 8);
    for (let i = 0; i < MAX; i += 1) {
      const o = i * 8;
      seed[o] = (Math.random() * 2 - 1) * 1.6;
      seed[o + 1] = (Math.random() * 2 - 1) * 1.05;
      seed[o + 4] = Math.random();
      seed[o + 5] = 0.2 + Math.random() * 3.2;
    }
    const particles = device.createBuffer({
      size: seed.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(particles, 0, seed);

    const uniforms = device.createBuffer({ size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const u = new Float32Array(20);
    const computeBind = device.createBindGroup({
      layout: computeLayout,
      entries: [
        { binding: 0, resource: { buffer: particles } },
        { binding: 1, resource: { buffer: uniforms } },
      ],
    });
    const renderBind = device.createBindGroup({
      layout: renderLayout,
      entries: [
        { binding: 0, resource: { buffer: particles } },
        { binding: 1, resource: { buffer: uniforms } },
      ],
    });

    // Throttled below the study's 65,536 on narrow viewports, which are the
    // ones most likely to be integrated graphics.
    const target = window.innerWidth < 900 ? 24576 : 65536;
    const count = Math.max(4096, Math.min(MAX, Math.round(target / 64) * 64));

    const pointer = trackPointer(canvas);

    raf(canvas, (t, dt) => {
      sizeCanvas(canvas);
      const aspect = canvas.width / canvas.height;
      const p = pointer.read();

      u[0] = t;
      u[1] = dt;
      u[2] = aspect;
      u[3] = count;
      u[4] = (p.x * 2 - 1) * aspect;
      u[5] = -(p.y * 2 - 1);
      u[6] = p.on ? 1 : 0;
      u[7] = 0;
      u[8] = MINT[0] / 255;
      u[9] = MINT[1] / 255;
      u[10] = MINT[2] / 255;
      u[11] = 1;
      u[12] = PERIWINKLE[0] / 255;
      u[13] = PERIWINKLE[1] / 255;
      u[14] = PERIWINKLE[2] / 255;
      u[15] = 1;
      u[16] = ROSE[0] / 255;
      u[17] = ROSE[1] / 255;
      u[18] = ROSE[2] / 255;
      u[19] = 1;
      device.queue.writeBuffer(uniforms, 0, u);

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, computeBind);
      pass.dispatchWorkgroups(Math.ceil(count / 64));
      pass.end();

      const draw = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: ctx.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });
      draw.setPipeline(renderPipeline);
      draw.setBindGroup(0, renderBind);
      draw.draw(6, count);
      draw.end();
      device.queue.submit([encoder.finish()]);
    });
  };

  /* ------------------------------------------------------------------ *
   * Effect 03 — "Wordmark Plasma": WebGL2 fbm through a text mask
   *
   * The prototype replaces the headline with a canvas. Here the real <h1> stays
   * in the DOM — the four .hero-initial letters are already transparent for the
   * CSS gradient treatment, so the mask is rasterized from their measured boxes
   * and the canvas simply provides their fill.
   * ------------------------------------------------------------------ */

  const PLASMA_FS = `#version 300 es
precision highp float;
uniform sampler2D uMask;
uniform vec2 uRes;
uniform float uT;
uniform vec2 uM;
out vec4 o;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
float nz(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=0.5,s=0.0; for(int i=0;i<5;i++){ s+=a*nz(p); p*=2.03; a*=0.5; } return s; }
vec3 pal(float t){
  vec3 mint = vec3(0.494,0.910,0.773);
  vec3 peri = vec3(0.627,0.659,1.0);
  vec3 lila = vec3(0.773,0.714,1.0);
  vec3 rose = vec3(1.0,0.541,0.62);
  vec3 c = mix(mint, peri, smoothstep(0.0,0.42,t));
  c = mix(c, lila, smoothstep(0.38,0.72,t));
  c = mix(c, rose, smoothstep(0.74,1.0,t));
  return c;
}
float mask(vec2 uv){ return texture(uMask, vec2(uv.x, 1.0-uv.y)).a; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = uv * vec2(uRes.x/uRes.y, 1.0) * 2.4 + uM * 0.35;
  float w1 = fbm(p + uT * 0.06);
  float w2 = fbm(p * 1.6 + vec2(w1 * 1.7, -uT * 0.05));
  float v = fbm(p + w2 * 1.5 + uT * 0.03);
  vec3 col = pal(clamp(v * 1.5 - 0.12, 0.0, 1.0));
  float m = mask(uv);
  float e = 0.0035;
  float mr = mask(uv + vec2(e, 0.0));
  float mb = mask(uv - vec2(e, 0.0));
  vec3 chroma = vec3(mr, m, mb);
  float sweep = smoothstep(0.72, 1.0, sin((uv.x * 2.4 - uv.y * 0.7 - uT * 0.42) * 3.14159));
  // The prototype's ambient plasma outside the glyphs exists so its card is not
  // dead black. The hero already has a background, so only the glyphs are drawn.
  vec3 glyph = col * chroma * 1.18 + vec3(0.92,0.96,1.0) * sweep * m * 0.55;
  float a = max(m, max(mr, mb) * 0.6);
  o = vec4(glyph, a);
}`;

  const plasma = (title, initials) => {
    const canvas = makeCanvas("hero-plasma");
    title.appendChild(canvas);
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      canvas.remove();
      return;
    }

    const program = glProgram(gl, "#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}", PLASMA_FS);
    if (!program) {
      canvas.remove();
      return;
    }
    const drawTriangle = fullscreenTriangle(gl, program);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const off = document.createElement("canvas");
    const octx = off.getContext("2d");
    let maskKey = "";

    /** Rasterize the four initials at their measured positions in the h1 box. */
    const buildMask = (force) => {
      const box = title.getBoundingClientRect();
      const key = `${canvas.width}x${canvas.height}x${Math.round(box.width)}`;
      if (!force && key === maskKey) return;
      maskKey = key;

      const scale = canvas.width / Math.max(1, box.width);
      off.width = canvas.width;
      off.height = canvas.height;
      octx.clearRect(0, 0, off.width, off.height);
      octx.fillStyle = "#fff";
      octx.textAlign = "left";
      octx.textBaseline = "alphabetic";

      initials.forEach((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const size = parseFloat(style.fontSize) * scale;
        octx.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
        const metrics = octx.measureText(el.textContent);
        const ascent = metrics.fontBoundingBoxAscent || size * 0.8;
        const descent = metrics.fontBoundingBoxDescent || size * 0.2;
        // Centre the font box inside the element box, then sit on the baseline.
        const top = (r.top - box.top) * scale;
        const baseline = top + ((r.height * scale - (ascent + descent)) / 2 + ascent);
        octx.fillText(el.textContent, (r.left - box.left) * scale, baseline);
      });

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off);
    };

    const pointer = trackPointer(canvas);
    const uRes = gl.getUniformLocation(program, "uRes");
    const uT = gl.getUniformLocation(program, "uT");
    const uM = gl.getUniformLocation(program, "uM");
    const uMask = gl.getUniformLocation(program, "uMask");

    const render = (t) => {
      const resized = sizeCanvas(canvas);
      buildMask(resized);
      const p = pointer.read();

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uMask, 0);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uT, t);
      gl.uniform2f(uM, p.on ? p.x - 0.5 : 0, p.on ? p.y - 0.5 : 0);
      drawTriangle();
    };

    // Reduced motion keeps the iridescence but holds it: one frame at t=0,
    // repainted only when the mask would actually change, rather than a rAF
    // loop redrawing an image that never moves.
    const invalidate = () => {
      maskKey = "";
      if (reduced) requestAnimationFrame(() => render(0));
    };
    document.fonts?.ready.then(invalidate);
    new ResizeObserver(invalidate).observe(title);

    if (reduced) render(0);
    else raf(canvas, render);
  };

  /* ------------------------------------------------------------------ *
   * Effect 04 — "Replay Warp": WebGL2 displacement + chromatic aberration
   *
   * Overlays each screenshot with a canvas rendering the same image. The <img>
   * stays in the DOM (transparent) so the lightbox trigger, alt text and
   * keyboard handling all keep working untouched.
   * ------------------------------------------------------------------ */

  const WARP_FS = `#version 300 es
precision highp float;
in vec2 v;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec2 uImg;
uniform vec2 uMouse;
uniform float uT;
uniform float uHover;
uniform float uDpr;
out vec4 o;
// Contain-fit, matching the .feature-shot object-fit: contain treatment.
vec2 fit(vec2 uv){
  float ca = uRes.x / uRes.y, ia = uImg.x / uImg.y;
  vec2 s = ca > ia ? vec2(ia / ca, 1.0) : vec2(1.0, ca / ia);
  return (uv - 0.5) / s + 0.5;
}
void main(){
  vec2 uv = fit(v);
  vec2 m = uMouse;
  float d = distance(vec2(uv.x * (uRes.x/uRes.y), uv.y), vec2(m.x * (uRes.x/uRes.y), m.y));
  float ring = smoothstep(0.44, 0.0, d) * uHover;
  vec2 dir = normalize(uv - m + vec2(1e-5));
  float wave = sin(d * 34.0 - uT * 4.2) * 0.016 * ring;
  float idle = sin(uv.y * 42.0 + uT * 0.8) * 0.0012;
  vec2 duv = uv + dir * wave + vec2(idle, 0.0);
  float ab = 0.007 * ring + 0.0009;
  vec3 c;
  c.r = texture(uTex, clamp(duv + dir * ab, 0.0, 1.0)).r;
  c.g = texture(uTex, clamp(duv, 0.0, 1.0)).g;
  c.b = texture(uTex, clamp(duv - dir * ab, 0.0, 1.0)).b;
  // Outside the image box is letterbox, not smeared edge pixels.
  vec2 edge = step(vec2(0.0), duv) * step(duv, vec2(1.0));
  c = mix(vec3(0.027,0.035,0.063), c, edge.x * edge.y);
  // The prototype's CRT grade is dialled back here. Its scanline ran at 1.6
  // cycles per device pixel and its vignette bottomed out at 0.55, which is
  // fine over a demo card but moires and dims a real product screenshot — and
  // these figures exist to be read. Scanlines are pinned to CSS pixels so they
  // do not alias differently per display.
  c *= 0.985 + 0.015 * sin(v.y * uRes.y / uDpr * 1.05);
  c += vec3(0.494,0.910,0.773) * ring * 0.16;
  c *= mix(0.86, 1.0, smoothstep(1.25, 0.28, length(v - 0.5)));
  o = vec4(c, 1.0);
}`;

  const warpOne = (figure, img) => {
    const canvas = makeCanvas("feature-warp");
    figure.insertBefore(canvas, img);
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, preserveDrawingBuffer: true });
    if (!gl) {
      canvas.remove();
      return;
    }
    const program = glProgram(
      gl,
      "#version 300 es\nin vec2 a;out vec2 v;void main(){v=a*0.5+0.5;gl_Position=vec4(a,0.0,1.0);}",
      WARP_FS,
    );
    if (!program) {
      canvas.remove();
      return;
    }
    const drawTriangle = fullscreenTriangle(gl, program);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    try {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    } catch (error) {
      console.warn("[magi-fx] texture upload failed", error);
      canvas.remove();
      return;
    }

    figure.classList.add("is-warped");

    const pointer = trackPointer(canvas);
    const uRes = gl.getUniformLocation(program, "uRes");
    const uImg = gl.getUniformLocation(program, "uImg");
    const uMouse = gl.getUniformLocation(program, "uMouse");
    const uT = gl.getUniformLocation(program, "uT");
    const uHover = gl.getUniformLocation(program, "uHover");
    const uDpr = gl.getUniformLocation(program, "uDpr");
    let hover = 0;
    let mx = 0.5;
    let my = 0.5;

    raf(canvas, (t, dt) => {
      sizeCanvas(canvas);
      const p = pointer.read();
      if (p.inside) {
        mx = p.x;
        my = 1 - p.y;
      }
      // Ease so entering and leaving ramp rather than snap.
      hover += ((p.inside ? 1 : 0) - hover) * Math.min(1, dt * 7);

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uImg, img.naturalWidth || 16, img.naturalHeight || 9);
      gl.uniform2f(uMouse, mx, my);
      gl.uniform1f(uT, t);
      gl.uniform1f(uHover, hover);
      gl.uniform1f(uDpr, dpr());
      drawTriangle();
    });
  };

  const warp = () => {
    document.querySelectorAll(".feature-shot").forEach((figure) => {
      const img = figure.querySelector("img");
      if (!img) return;
      // Build the context only once the figure is worth rendering: nine eager
      // WebGL2 contexts on one page is a needless amount of GPU memory.
      const io = new IntersectionObserver(
        (entries) => {
          if (!entries[0]?.isIntersecting) return;
          io.disconnect();
          if (img.complete && img.naturalWidth) warpOne(figure, img);
          else img.addEventListener("load", () => warpOne(figure, img), { once: true });
        },
        { rootMargin: "400px" },
      );
      io.observe(figure);
    });
  };

  /* ------------------------------------------------------------------ *
   * Effect 05 — "Etched Panels": Houdini paint worklet
   * ------------------------------------------------------------------ */

  const etch = () => {
    const panels = [...document.querySelectorAll("[data-etch]")];
    if (panels.length === 0) return;
    const root = document.documentElement;

    panels.forEach((panel, i) => {
      panel.style.setProperty("--etch-dur", `${(7 + i * 1.6).toFixed(1)}s`);
      panel.style.setProperty("--etch-delay", `-${(i * 2.3).toFixed(1)}s`); // spread the sweep across the stack
    });

    const fallback = () => root.classList.add("fx-etch-fallback");
    if (!window.CSS?.paintWorklet) {
      fallback();
      return;
    }
    CSS.paintWorklet
      .addModule("magi-etch-worklet.js")
      .then(() => root.classList.add("fx-etch"))
      .catch(fallback);
  };

  /* ------------------------------------------------------------------ *
   * Effect 08 — "Interference": SVG feTurbulence + feDisplacementMap
   *
   * The uneven keyTimes are the entire effect: they produce two sharp glitch
   * spikes separated by calm, rather than continuous mush. The filter is applied
   * only once its defs exist — a dangling filter reference hides the element.
   * ------------------------------------------------------------------ */

  const interfere = () => {
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    host.setAttribute("aria-hidden", "true");
    host.innerHTML = [
      '<svg width="0" height="0">',
      '<filter id="magi-interfere" x="-18%" y="-40%" width="136%" height="180%" color-interpolation-filters="sRGB">',
      '<feTurbulence type="fractalNoise" baseFrequency="0.005 0.12" numOctaves="2" seed="11" result="noise">',
      '<animate attributeName="baseFrequency" dur="9s" values="0.005 0.12;0.02 0.5;0.004 0.08;0.03 0.72;0.005 0.12" keyTimes="0;0.28;0.42;0.62;1" repeatCount="indefinite"/>',
      "</feTurbulence>",
      '<feDisplacementMap in="SourceGraphic" in2="noise" xChannelSelector="R" yChannelSelector="G" result="disp">',
      '<animate attributeName="scale" dur="6.5s" values="1;2;11;2;16;1" keyTimes="0;0.34;0.38;0.7;0.74;1" repeatCount="indefinite"/>',
      "</feDisplacementMap>",
      '<feOffset in="disp" dy="0" result="rs"><animate attributeName="dx" dur="6.5s" values="0;1;6;1;-7;0" keyTimes="0;0.34;0.38;0.7;0.74;1" repeatCount="indefinite"/></feOffset>',
      '<feColorMatrix in="rs" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="ronly"/>',
      '<feOffset in="disp" dy="0" result="bs"><animate attributeName="dx" dur="6.5s" values="0;-1;-6;-1;7;0" keyTimes="0;0.34;0.38;0.7;0.74;1" repeatCount="indefinite"/></feOffset>',
      '<feColorMatrix in="bs" type="matrix" values="0 0 0 0 0  0 0.4 0 0 0  0 0 1 0 0  0 0 0 1 0" result="bonly"/>',
      '<feBlend in="ronly" in2="bonly" mode="screen" result="split"/>',
      '<feBlend in="split" in2="disp" mode="screen"/>',
      "</filter></svg>",
    ].join("");
    document.body.appendChild(host);
    document.documentElement.classList.add("fx-interfere-on");
  };

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */

  const heroFx = document.querySelector(".hero-fx");
  if (heroFx && !reduced) {
    if (on("cloud")) cloud(heroFx);
    else if (on("flow")) flow(heroFx);
  }

  const title = document.querySelector(".hero-title");
  const initials = title ? [...title.querySelectorAll(".hero-initial")] : [];
  if (on("plasma") && title && initials.length) plasma(title, initials);

  if (on("warp") && !reduced) warp();
  if (on("etch")) etch();
  if (on("interfere") && !reduced) interfere();
})();
