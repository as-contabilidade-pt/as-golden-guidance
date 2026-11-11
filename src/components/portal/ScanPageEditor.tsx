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

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Aproximação visual do filtro «documento» (o resultado real é calculado ao aplicar). */
const FILTER_PREVIEW = "grayscale(1) contrast(1.6) brightness(1.1)";

/**
 * Editor de uma página digitalizada: 4 cantos independentes para acompanhar o
 * papel (o documento é endireitado ao aplicar), rotação, filtro «documento»
 * e ampliação para confirmar que está legível.
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
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [src, setSrc] = useState<ScanSource>(source);
  const [quad, setQuad] = useState<Quad>(initialQuad);
  const [filter, setFilter] = useState(initialFilter);
  const [rotating, setRotating] = useState(false);
  const drag = useRef<{ kind: "move" | number; px: number; py: number; quad: Quad } | null>(null);
  const keepCenter = useRef<{ cx: number; cy: number } | null>(null);

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

  function changeZoom(next: number) {
    const z = clamp(Math.round(next * 100) / 100, MIN_ZOOM, MAX_ZOOM);
    const v = viewportRef.current;
    if (v && v.scrollWidth > 0 && v.scrollHeight > 0) {
      keepCenter.current = {
        cx: (v.scrollLeft + v.clientWidth / 2) / v.scrollWidth,
        cy: (v.scrollTop + v.clientHeight / 2) / v.scrollHeight,
      };
    }
    setZoom(z);
  }

  // Mantém o centro da vista ao ampliar/reduzir.
  useLayoutEffect(() => {
    const v = viewportRef.current;
    const k = keepCenter.current;
    if (!v || !k) return;
    v.scrollLeft = k.cx * v.scrollWidth - v.clientWidth / 2;
    v.scrollTop = k.cy * v.scrollHeight - v.clientHeight / 2;
    keepCenter.current = null;
  }, [zoom]);

  function down(kind: "move" | number) {
    return (e: ReactPointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { kind, px: e.clientX, py: e.clientY, quad };
    };
  }

  function move(e: ReactPointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d || stageW <= 0 || stageH <= 0) return;
    const dx = (e.clientX - d.px) / stageW;
    const dy = (e.clientY - d.py) / stageH;
    let next: Quad;
    if (d.kind === "move") {
      const xs = d.quad.map((p) => p.x);
      const ys = d.quad.map((p) => p.y);
      const mx = clamp(dx, -Math.min(...xs), 1 - Math.max(...xs));
      const my = clamp(dy, -Math.min(...ys), 1 - Math.max(...ys));
      next = d.quad.map((p) => ({ x: p.x + mx, y: p.y + my })) as Quad;
    } else {
      next = d.quad.map((p, i) =>
        i === d.kind ? { x: clamp(p.x + dx, 0, 1), y: clamp(p.y + dy, 0, 1) } : p,
      ) as Quad;
    }
    // Ignora posições que cruzam os cantos ou deixam a moldura minúscula.
    if (isValidQuad(next)) setQuad(next);
  }

  function up() {
    drag.current = null;
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

  const pointer = { onPointerMove: move, onPointerUp: up, onPointerCancel: up };
  const pct = (v: number) => `${v * 100}%`;
  const clip = `polygon(${quad.map((p) => `${pct(p.x)} ${pct(p.y)}`).join(", ")})`;
  const svgPts = quad.map((p) => `${p.x * 100},${p.y * 100}`).join(" ");
  const cursors = ["nwse-resize", "nesw-resize", "nwse-resize", "nesw-resize"];
  const isDefault = isFullQuad(quad);

  return (
    <div className="mt-5">
      <p className="text-sm text-muted-foreground">
        Arraste cada canto dourado até ao canto do papel (ou arraste a moldura inteira). Ao aplicar,
        o documento é endireitado. Use + para ampliar e confirmar que tudo está legível.
      </p>

      <div
        ref={viewportRef}
        className="mt-4 flex h-[50vh] overflow-auto rounded-2xl bg-secondary"
        aria-label="Pré-visualização da página"
      >
        {base > 0 ? (
          <div className="m-auto shrink-0" style={{ padding: PAD }}>
            <div className="relative select-none" style={{ width: stageW, height: stageH }}>
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
              {/* Arrastar a moldura inteira (só a 100%, para não impedir percorrer a página ampliada) */}
              <div
                {...pointer}
                onPointerDown={down("move")}
                className={`absolute inset-0 ${
                  zoom > MIN_ZOOM ? "pointer-events-none" : "cursor-move touch-none"
                }`}
                style={{ clipPath: clip }}
              />
              {quad.map((p, i) => (
                <div
                  key={i}
                  {...pointer}
                  onPointerDown={down(i)}
                  aria-label={`Ajustar canto ${i + 1}`}
                  className="absolute flex touch-none items-center justify-center"
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

      <p className="mt-2 text-xs text-muted-foreground">
        {zoom > MIN_ZOOM
          ? "Ampliado: arraste a imagem para percorrer a página. Volte a 100% para mover a moldura."
          : "Quando ampliar, pode arrastar a imagem para ver cada zona."}
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
          step={0.25}
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
