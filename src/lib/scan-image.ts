/**
 * Processamento de imagem da digitalização (só no browser, sem bibliotecas):
 * recorte, correção de perspetiva a partir de 4 cantos, rotação e filtro «documento».
 */

export type ScanSource = { dataUrl: string; width: number; height: number };
export type Pt = { x: number; y: number };
/** Quatro cantos normalizados (0 a 1) da imagem original, por ordem: topo-esq., topo-dir., baixo-dir., baixo-esq. */
export type Quad = [Pt, Pt, Pt, Pt];

export const FULL_QUAD: Quad = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

/** Lado maior da página que vai para o PDF. */
export const MAX_SIDE = 1600;
export const QUALITY = 0.7;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Não foi possível abrir a fotografia."));
    el.src = src;
  });
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Não foi possível processar a fotografia.");
  return { canvas, ctx };
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.002;

export function isAxisAlignedRect(q: Quad) {
  return (
    near(q[0].y, q[1].y) && near(q[3].y, q[2].y) && near(q[0].x, q[3].x) && near(q[1].x, q[2].x)
  );
}

export function isFullQuad(q: Quad) {
  return (
    isAxisAlignedRect(q) && near(q[0].x, 0) && near(q[0].y, 0) && near(q[2].x, 1) && near(q[2].y, 1)
  );
}

/** Um quadrilátero válido é convexo e não demasiado pequeno (evita cantos cruzados). */
export function isValidQuad(q: Quad) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i]!;
    const b = q[(i + 1) % 4]!;
    const c = q[(i + 2) % 4]!;
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-5) return false;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
    if (Math.hypot(b.x - a.x, b.y - a.y) < 0.06) return false;
  }
  return true;
}

/** Roda a imagem 90° para a direita (a qualidade quase não se perde: JPEG a 0,92). */
export async function rotateSource(source: ScanSource): Promise<ScanSource> {
  const img = await loadImage(source.dataUrl);
  const { canvas, ctx } = makeCanvas(source.height, source.width);
  ctx.translate(source.height, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, 0, 0, source.width, source.height);
  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.92),
    width: source.height,
    height: source.width,
  };
}

/** Acompanha a rotação de 90° para a direita: (x, y) → (1 − y, x) e o canto «baixo-esq.» passa a «topo-esq.». */
export function rotateQuadCW(q: Quad): Quad {
  const r = (p: Pt): Pt => ({ x: 1 - p.y, y: p.x });
  return [r(q[3]), r(q[0]), r(q[1]), r(q[2])];
}

/** Homografia do quadrado unitário para o quadrilátero (Heckbert). */
function squareToQuad(p: Quad) {
  const [p0, p1, p2, p3] = p;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    return {
      a: p1.x - p0.x,
      b: p2.x - p1.x,
      c: p0.x,
      d: p1.y - p0.y,
      e: p2.y - p1.y,
      f: p0.y,
      g: 0,
      h: 0,
    };
  }
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const h = (dx1 * dy3 - dx3 * dy1) / den;
  return {
    a: p1.x - p0.x + g * p1.x,
    b: p3.x - p0.x + h * p3.x,
    c: p0.x,
    d: p1.y - p0.y + g * p1.y,
    e: p3.y - p0.y + h * p3.y,
    f: p0.y,
    g,
    h,
  };
}

type V3 = [number, number, number];
const cross3 = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Proporção largura/altura real do papel, a partir da perspetiva dos 4 cantos
 * (método de Zhang & He, câmara com o centro ótico no meio da foto).
 * Devolve null quando não há perspetiva suficiente ou o resultado não é fiável.
 */
export function estimatePaperAspect(px: Quad, W: number, H: number): number | null {
  const m = (p: Pt): V3 => [p.x - W / 2, p.y - H / 2, 1];
  const m1 = m(px[0]);
  const m2 = m(px[1]);
  const m3 = m(px[3]);
  const m4 = m(px[2]);
  const d2 = dot3(cross3(m2, m4), m3);
  const d3 = dot3(cross3(m3, m4), m2);
  if (Math.abs(d2) < 1e-9 || Math.abs(d3) < 1e-9) return null;
  const k2 = dot3(cross3(m1, m4), m3) / d2;
  const k3 = dot3(cross3(m1, m4), m2) / d3;
  const n2: V3 = [k2 * m2[0] - m1[0], k2 * m2[1] - m1[1], k2 * m2[2] - m1[2]];
  const n3: V3 = [k3 * m3[0] - m1[0], k3 * m3[1] - m1[1], k3 * m3[2] - m1[2]];
  const den = n2[2] * n3[2];
  if (Math.abs(den) < 1e-6) return null;
  const f2 = -(n2[0] * n3[0] + n2[1] * n3[1]) / den;
  if (!(f2 > 0)) return null;
  const q = (n: V3) => (n[0] * n[0] + n[1] * n[1]) / f2 + n[2] * n[2];
  const r = Math.sqrt(q(n2) / q(n3));
  return Number.isFinite(r) && r > 0 ? r : null;
}

function warpToCanvas(img: HTMLImageElement, source: ScanSource, quad: Quad) {
  const W = source.width;
  const H = source.height;
  const px = quad.map((p) => ({ x: p.x * W, y: p.y * H })) as Quad;
  const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
  const topW = dist(px[0], px[1]);
  const botW = dist(px[3], px[2]);
  const leftH = dist(px[0], px[3]);
  const rightH = dist(px[1], px[2]);
  let rawW = (topW + botW) / 2;
  let rawH = (leftH + rightH) / 2;
  // Com perspetiva forte, as larguras na foto enganam: estima a proporção real do papel.
  const skew = Math.max(
    Math.abs(topW - botW) / Math.max(topW, botW),
    Math.abs(leftH - rightH) / Math.max(leftH, rightH),
  );
  const aspect = skew > 0.06 ? estimatePaperAspect(px, W, H) : null;
  const simple = rawW / rawH;
  if (aspect && aspect > simple * 0.6 && aspect < simple * 1.4) {
    const area = rawW * rawH;
    rawH = Math.sqrt(area / aspect);
    rawW = rawH * aspect;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(rawW, rawH));
  const outW = Math.max(1, Math.round(rawW * scale));
  const outH = Math.max(1, Math.round(rawH * scale));

  const src = makeCanvas(W, H);
  src.ctx.drawImage(img, 0, 0, W, H);
  const sd = src.ctx.getImageData(0, 0, W, H).data;

  const out = makeCanvas(outW, outH);
  const od = out.ctx.createImageData(outW, outH);
  const o = od.data;
  const { a, b, c, d, e, f, g, h } = squareToQuad(px);

  for (let oy = 0; oy < outH; oy++) {
    const v = (oy + 0.5) / outH;
    for (let ox = 0; ox < outW; ox++) {
      const u = (ox + 0.5) / outW;
      const den = g * u + h * v + 1;
      let sx = (a * u + b * v + c) / den - 0.5;
      let sy = (d * u + e * v + f) / den - 0.5;
      sx = sx < 0 ? 0 : sx > W - 1 ? W - 1 : sx;
      sy = sy < 0 ? 0 : sy > H - 1 ? H - 1 : sy;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = x0 + 1 < W ? x0 + 1 : x0;
      const y1 = y0 + 1 < H ? y0 + 1 : y0;
      const fx = sx - x0;
      const fy = sy - y0;
      const i00 = (y0 * W + x0) * 4;
      const i10 = (y0 * W + x1) * 4;
      const i01 = (y1 * W + x0) * 4;
      const i11 = (y1 * W + x1) * 4;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;
      const oi = (oy * outW + ox) * 4;
      o[oi] = sd[i00]! * w00 + sd[i10]! * w10 + sd[i01]! * w01 + sd[i11]! * w11;
      o[oi + 1] = sd[i00 + 1]! * w00 + sd[i10 + 1]! * w10 + sd[i01 + 1]! * w01 + sd[i11 + 1]! * w11;
      o[oi + 2] = sd[i00 + 2]! * w00 + sd[i10 + 2]! * w10 + sd[i01 + 2]! * w01 + sd[i11 + 2]! * w11;
      o[oi + 3] = 255;
    }
  }
  out.ctx.putImageData(od, 0, 0);
  return out;
}

function cropToCanvas(img: HTMLImageElement, source: ScanSource, quad: Quad) {
  const sx = Math.round(quad[0].x * source.width);
  const sy = Math.round(quad[0].y * source.height);
  const sw = Math.max(1, Math.round((quad[1].x - quad[0].x) * source.width));
  const sh = Math.max(1, Math.round((quad[3].y - quad[0].y) * source.height));
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));
  const out = makeCanvas(width, height);
  out.ctx.fillStyle = "#ffffff";
  out.ctx.fillRect(0, 0, width, height);
  out.ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
  return out;
}

/**
 * Filtro «documento»: corrige sombras e iluminação desigual, deixa o fundo
 * branco e o texto escuro, a preto e branco (tons de cinzento).
 */
export function applyDocumentFilter(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const n = w * h;
  const gray = new Float32Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    gray[i] = 0.299 * d[j]! + 0.587 * d[j + 1]! + 0.114 * d[j + 2]!;
  }

  // Estimativa do fundo (papel): imagem pequena + dilatação para apagar o texto.
  const sw = Math.max(8, Math.round(w / 16));
  const sh = Math.max(8, Math.round(h / 16));
  const small = makeCanvas(sw, sh);
  small.ctx.imageSmoothingQuality = "high";
  small.ctx.drawImage(canvas, 0, 0, sw, sh);
  const sImg = small.ctx.getImageData(0, 0, sw, sh);
  let sg = new Float32Array(sw * sh);
  for (let i = 0, j = 0; i < sg.length; i++, j += 4) {
    sg[i] = 0.299 * sImg.data[j]! + 0.587 * sImg.data[j + 1]! + 0.114 * sImg.data[j + 2]!;
  }
  for (let pass = 0; pass < 2; pass++) {
    const next = new Float32Array(sg.length);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        let m = 0;
        for (let yy = Math.max(0, y - 1); yy <= Math.min(sh - 1, y + 1); yy++) {
          for (let xx = Math.max(0, x - 1); xx <= Math.min(sw - 1, x + 1); xx++) {
            const v = sg[yy * sw + xx]!;
            if (v > m) m = v;
          }
        }
        next[y * sw + x] = m;
      }
    }
    sg = next;
  }
  const bgSmall = makeCanvas(sw, sh);
  const bgImg = bgSmall.ctx.createImageData(sw, sh);
  for (let i = 0, j = 0; i < sg.length; i++, j += 4) {
    const v = sg[i]!;
    bgImg.data[j] = v;
    bgImg.data[j + 1] = v;
    bgImg.data[j + 2] = v;
    bgImg.data[j + 3] = 255;
  }
  bgSmall.ctx.putImageData(bgImg, 0, 0);
  const bgFull = makeCanvas(w, h);
  bgFull.ctx.imageSmoothingQuality = "high";
  bgFull.ctx.drawImage(bgSmall.canvas, 0, 0, w, h);
  const bg = bgFull.ctx.getImageData(0, 0, w, h).data;

  // Normaliza pelo fundo e acerta os níveis (preto = tinta, branco = papel).
  const norm = new Uint8ClampedArray(n);
  const hist = new Uint32Array(256);
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const b = Math.max(40, bg[j]!);
    const v = Math.min(255, (gray[i]! * 255) / b);
    norm[i] = v;
    hist[Math.round(v)]!++;
  }
  let acc = 0;
  let lo = 0;
  const target = n * 0.005;
  for (let v = 0; v < 256; v++) {
    acc += hist[v]!;
    if (acc >= target) {
      lo = v;
      break;
    }
  }
  lo = Math.min(lo, 120);
  const hi = 232;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    let t = (norm[i]! - lo) / (hi - lo);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const s = t * t * (3 - 2 * t);
    const out = 255 * (0.5 * t + 0.5 * s);
    d[j] = out;
    d[j + 1] = out;
    d[j + 2] = out;
    d[j + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

/** Gera a página final (JPEG) a partir da foto original, dos 4 cantos e do filtro. */
export async function renderScan(source: ScanSource, quad: Quad, filter: boolean) {
  const img = await loadImage(source.dataUrl);
  const out = isAxisAlignedRect(quad)
    ? cropToCanvas(img, source, quad)
    : warpToCanvas(img, source, quad);
  if (filter) applyDocumentFilter(out.canvas);
  return {
    dataUrl: out.canvas.toDataURL("image/jpeg", QUALITY),
    width: out.canvas.width,
    height: out.canvas.height,
  };
}
