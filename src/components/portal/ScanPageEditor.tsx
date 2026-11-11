import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Loader2, Minus, Plus, RotateCcw, RotateCw } from "lucide-react";
import {
  FULL_QUAD,
  isFullQuad,
  isValidQuad,
  rotateQuadCW,
  rotateSource,
  type Quad,
  type ScanSource,
} from "@/lib/scan-image";

export type EditResult = { source: ScanSource; quad: Quad; filter: boolean };

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const PAD = 20;
const HANDLE = 32;
/** Diâmetro da lupa que aparece ao arrastar um canto. */
const LOUPE = 120;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Aproximação visual do filtro «documento» (o resultado real é calculado ao aplicar). */
const FILTER_PREVIEW = "grayscale(1) contrast(1.6) brightness(1.1)";

type Gesture =
  | { type: "corner"; id: number; index: number; px: number; py: number; quad: Quad }
  | { type: "move"; id: number; px: number; py: number; quad: Quad }
  | { type: "pan"; id: number; px: number; py: number; left: number; top: number }
  | { type: "pinch"; d0: number; z0: number };

/**
 * Editor de uma página digitalizada: 4 cantos independentes para acompanhar o
 * papel (o documento é endireitado ao aplicar), lupa ao arrastar um canto,
 * rotação, filtro «documento» e ampliação (botões ou pinça com dois dedos)
 * para confirmar que está legível.
 */
export function ScanPageEditor({
  source,
  initialQuad,
  initialFilter,
  working,
  onApply,
  onCancel,
}: {
  source: ScanSource;
  initialQuad: Quad;
  initialFilter: boolean;
  working: boolean;
  onApply: (result: EditResult) => void;
  onCancel: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [src, setSrc] = useState<ScanSource>(source);
  const [quad, setQuad] = useState<Quad>(initialQuad);
  const [filter, setFilter] = useState(initialFilter);
  const [rotating, setRotating] = useState(false);
  const [loupe, setLoupe] = useState<number | null>(null);
  const [loupeSide, setLoupeSide] = useState<"left" | "right">("right");
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const keepAnchor = useRef<{ rx: number; ry: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const measure = () => setVp({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const base =
    vp.w > 0 && vp.h > 0
      ? Math.max(0.01, Math.min((vp.w - 2 * PAD) / src.width, (vp.h - 2 * PAD) / src.height))
      : 0;
  const stageW = src.width * base * zoom;
  const stageH = src.height * base * zoom;
  const busy = working || rotating;

  /** Altera a ampliação mantendo no mesmo sítio o ponto `anchor` (por omissão, o centro da vista). */
  function changeZoom(next: number, anchor?: { ox: number; oy: number }) {
    const z = clamp(Math.round(next * 100) / 100, MIN_ZOOM, MAX_ZOOM);
    const v = viewportRef.current;
    if (v && v.scrollWidth > 0 && v.scrollHeight > 0) {
      const ox = anchor?.ox ?? v.clientWidth / 2;
      const oy = anchor?.oy ?? v.clientHeight / 2;
      keepAnchor.current = {
        rx: (v.scrollLeft + ox) / v.scrollWidth,
        ry: (v.scrollTop + oy) / v.scrollHeight,
        ox,
        oy,
      };
    }
    setZoom(z);
  }

  // Depois de ampliar/reduzir, repõe o ponto ancorado no mesmo sítio do ecrã.
  useLayoutEffect(() => {
    const v = viewportRef.current;
    const k = keepAnchor.current;
    if (!v || !k) return;
    v.scrollLeft = k.rx * v.scrollWidth - k.ox;
    v.scrollTop = k.ry * v.scrollHeight - k.oy;
    keepAnchor.current = null;
  }, [zoom]);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const v = viewportRef.current;
    if (!v) return;
    v.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      // Dois dedos: pinça (a não ser que um canto esteja a ser arrastado).
      if (gesture.current?.type === "corner") return;
      const [a, b] = Array.from(pointers.current.values()) as [
        { x: number; y: number },
        { x: number; y: number },
      ];
      gesture.current = {
        type: "pinch",
        d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        z0: zoom,
      };
      return;
    }
    if (pointers.current.size > 2) return;

    const kind = (e.target as HTMLElement).closest("[data-kind]")?.getAttribute("data-kind");
    if (kind === "move") {
      gesture.current = { type: "move", id: e.pointerId, px: e.clientX, py: e.clientY, quad };
    } else if (kind !== null && kind !== undefined) {
      const index = Number(kind);
      gesture.current = {
        type: "corner",
        id: e.pointerId,
        index,
        px: e.clientX,
        py: e.clientY,
        quad,
      };
      setLoupe(index);
      updateLoupeSide(e.clientX);
    } else {
      gesture.current = {
        type: "pan",
        id: e.pointerId,
        px: e.clientX,
        py: e.clientY,
        left: v.scrollLeft,
        top: v.scrollTop,
      };
    }
  }

  function updateLoupeSide(clientX: number) {
    const w = wrapperRef.current;
    if (!w) return;
    const r = w.getBoundingClientRect();
    setLoupeSide(clientX - r.left < r.width / 2 ? "right" : "left");
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const tracked = pointers.current.get(e.pointerId);
    if (tracked) {
      tracked.x = e.clientX;
      tracked.y = e.clientY;
    }
    const g = gesture.current;
    const v = viewportRef.current;
    if (!g || !v) return;

    if (g.type === "pinch") {
      if (pointers.current.size < 2) return;
      const [a, b] = Array.from(pointers.current.values()) as [
        { x: number; y: number },
        { x: number; y: number },
      ];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = v.getBoundingClientRect();
      changeZoom(g.z0 * (d / g.d0), {
        ox: (a.x + b.x) / 2 - r.left,
        oy: (a.y + b.y) / 2 - r.top,
      });
      return;
    }
    if (g.id !== e.pointerId) return;

    if (g.type === "pan") {
      v.scrollLeft = g.left - (e.clientX - g.px);
      v.scrollTop = g.top - (e.clientY - g.py);
      return;
    }
    if (stageW <= 0 || stageH <= 0) return;
    const dx = (e.clientX - g.px) / stageW;
    const dy = (e.clientY - g.py) / stageH;
    let next: Quad;
    if (g.type === "move") {
      const xs = g.quad.map((p) => p.x);
      const ys = g.quad.map((p) => p.y);
      const mx = clamp(dx, -Math.min(...xs), 1 - Math.max(...xs));
      const my = clamp(dy, -Math.min(...ys), 1 - Math.max(...ys));
      next = g.quad.map((p) => ({ x: p.x + mx, y: p.y + my })) as Quad;
    } else {
      next = g.quad.map((p, i) =>
        i === g.index ? { x: clamp(p.x + dx, 0, 1), y: clamp(p.y + dy, 0, 1) } : p,
      ) as Quad;
      updateLoupeSide(e.clientX);
    }
    // Ignora posições que cruzam os cantos ou deixam a moldura minúscula.
    if (isValidQuad(next)) setQuad(next);
  }

  function onPointerEnd(e: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g) return;
    if (g.type === "pinch") {
      if (pointers.current.size < 2) gesture.current = null;
      return;
    }
    if (g.id === e.pointerId) {
      gesture.current = null;
      setLoupe(null);
    }
  }

  async function rotate() {
    setRotating(true);
    try {
      const next = await rotateSource(src);
      setSrc(next);
      setQuad((q) => rotateQuadCW(q));
    } finally {
      setRotating(false);
    }
  }

  const pct = (v: number) => `${v * 100}%`;
  const clip = `polygon(${quad.map((p) => `${pct(p.x)} ${pct(p.y)}`).join(", ")})`;
  const svgPts = quad.map((p) => `${p.x * 100},${p.y * 100}`).join(" ");
  const cursors = ["nwse-resize", "nesw-resize", "nwse-resize", "nesw-resize"];
  const isDefault = isFullQuad(quad);

  // Lupa: mostra a zona à volta do canto que está a ser arrastado, ampliada.
  const loupePoint = loupe !== null ? quad[loupe] : undefined;
  const loupeScale = clamp((stageW / src.width) * 3, 0.6, 2);

  return (
    <div className="mt-5">
      <p className="text-sm text-muted-foreground">
        Arraste cada canto dourado até ao canto do papel (ou arraste a moldura inteira). Ao aplicar,
        o documento é endireitado. Amplie com + ou com dois dedos para confirmar que tudo está
        legível.
      </p>

      <div ref={wrapperRef} className="relative mt-4">
        <div
          ref={viewportRef}
          className="flex h-[50vh] select-none overflow-auto rounded-2xl bg-secondary"
          style={{ touchAction: "none" }}
          aria-label="Pré-visualização da página"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          {base > 0 ? (
            <div className="m-auto shrink-0" style={{ padding: PAD }}>
              <div className="relative" style={{ width: stageW, height: stageH }}>
                <img
                  src={src.dataUrl}
                  alt="Página digitalizada"
                  draggable={false}
                  className="block h-full w-full"
                  style={filter ? { filter: FILTER_PREVIEW } : undefined}
                />
                {/* Escurece o que fica fora da moldura e desenha o contorno */}
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  aria-hidden="true"
                >
                  <path
                    d={`M0 0H100V100H0Z M${quad.map((p) => `${p.x * 100} ${p.y * 100}`).join(" L")}Z`}
                    fill="rgba(0,0,0,0.45)"
                    fillRule="evenodd"
                  />
                  <polygon
                    points={svgPts}
                    fill="none"
                    stroke="var(--color-gold, #c9a43f)"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                {/* Arrastar a moldura inteira (só a 100%; ampliado, arrastar percorre a página) */}
                <div
                  data-kind={zoom > MIN_ZOOM ? undefined : "move"}
                  className={`absolute inset-0 ${
                    zoom > MIN_ZOOM ? "pointer-events-none" : "cursor-move"
                  }`}
                  style={{ clipPath: clip }}
                />
                {quad.map((p, i) => (
                  <div
                    key={i}
                    data-kind={i}
                    aria-label={`Ajustar canto ${i + 1}`}
                    className="absolute flex items-center justify-center"
                    style={{
                      left: `calc(${pct(p.x)} - ${HANDLE / 2}px)`,
                      top: `calc(${pct(p.y)} - ${HANDLE / 2}px)`,
                      width: HANDLE,
                      height: HANDLE,
                      cursor: cursors[i],
                    }}
                  >
                    <span className="block h-4 w-4 rounded-full border-2 border-gold bg-background shadow" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {loupePoint ? (
          <div
            data-testid="loupe"
            aria-hidden="true"
            className={`pointer-events-none absolute top-2 z-20 overflow-hidden rounded-full border-2 border-gold bg-neutral-800 shadow-lg ${
              loupeSide === "left" ? "left-2" : "right-2"
            }`}
            style={{
              width: LOUPE,
              height: LOUPE,
              backgroundImage: `url("${src.dataUrl}")`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${src.width * loupeScale}px ${src.height * loupeScale}px`,
              backgroundPosition: `${LOUPE / 2 - loupePoint.x * src.width * loupeScale}px ${
                LOUPE / 2 - loupePoint.y * src.height * loupeScale
              }px`,
              filter: filter ? FILTER_PREVIEW : undefined,
            }}
          >
            <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gold/80" />
            <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gold/80" />
          </div>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {zoom > MIN_ZOOM
          ? "Ampliado: arraste a imagem para percorrer a página. Volte a 100% para mover a moldura."
          : "Ao arrastar um canto aparece uma lupa para o acertar com precisão."}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => changeZoom(zoom - 0.5)}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Reduzir"
          className="rounded-full bg-secondary p-2 text-foreground transition-colors hover:text-gold disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.05}
          value={zoom}
          onChange={(e) => changeZoom(Number(e.target.value))}
          aria-label="Ampliação"
          className="min-w-0 flex-1 accent-gold"
        />
        <button
          type="button"
          onClick={() => changeZoom(zoom + 0.5)}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Ampliar"
          className="rounded-full bg-secondary p-2 text-foreground transition-colors hover:text-gold disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
        <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void rotate()}
          className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:text-gold disabled:opacity-50"
        >
          {rotating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCw className="h-4 w-4" />
          )}
          Rodar
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={filter}
            disabled={busy}
            onChange={(e) => setFilter(e.target.checked)}
            className="h-4 w-4 accent-gold"
          />
          Filtro «documento» (preto e branco)
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
        <button
          type="button"
          disabled={busy}
          onClick={() => onApply({ source: src, quad, filter })}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
        >
          {working ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {working ? "A aplicar…" : "Aplicar"}
        </button>
        <button
          type="button"
          disabled={busy || isDefault}
          onClick={() => setQuad(FULL_QUAD)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:text-gold disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Repor página inteira
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-full border border-gold px-5 py-2.5 text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-ink disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
