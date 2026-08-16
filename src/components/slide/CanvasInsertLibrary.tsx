import { useMemo, useRef, useState } from "react";
import * as Lucide from "lucide-react";

import { CANVAS_UI_ATTR } from "@/lib/canvas-adopt";
import {
  SHAPE_GROUPS,
  SHAPES,
  shapeDataUrl,
  shapeSvg,
  type ShapeDef,
  type ShapeStyle,
} from "@/lib/canvas-shapes";
import { importSvgFile } from "@/lib/svg-import";

/**
 * Insert library for the Studio canvas: a browsable shape inventory plus a
 * searchable icon set, the way Figma / Canva / Illustrator present them.
 *
 * Both tabs emit the same thing — a vector data URL and a natural aspect — so
 * an inserted icon or shape is an ordinary canvas object: movable, resizable,
 * layerable, and carried through the PPTX / PDF / PNG pipelines as artwork
 * rather than a flattened screenshot.
 */

export type InsertPayload = {
  src: string;
  alt: string;
  /** Natural width / height, so the editor can size the new block sensibly. */
  aspect: number;
};

/** Curated icon set: business-deck vocabulary, not the whole 1,500-icon dump. */
const ICON_NAMES = [
  "Activity", "AlertTriangle", "Award", "BarChart3", "BarChart4", "Battery", "Bell", "Bookmark",
  "Box", "Brain", "Briefcase", "Building2", "Calendar", "Camera", "CheckCircle2", "CircleDot",
  "Clock", "Cloud", "Code2", "Compass", "Cpu", "CreditCard", "Database", "DollarSign",
  "Download", "Droplet", "Eye", "Factory", "FileText", "Filter", "Flag", "Flame",
  "Folder", "Gauge", "Gem", "Gift", "Globe2", "GraduationCap", "Grid3x3", "Handshake",
  "HeartPulse", "Hexagon", "Home", "Image", "Infinity", "Info", "Key", "Landmark",
  "Languages", "Layers", "Layout", "Leaf", "Lightbulb", "LineChart", "Link2", "ListChecks",
  "Lock", "Mail", "MapPin", "Megaphone", "MessageSquare", "Mic", "Monitor", "Moon",
  "Network", "Package", "Palette", "PenTool", "Percent", "PieChart", "Plane", "Play",
  "Plug", "Presentation", "Puzzle", "QrCode", "Radar", "Recycle", "Refresh_Cw", "Rocket",
  "Route", "Ruler", "Scale", "Scan", "Search", "Send", "Server", "Settings",
  "Share2", "Shield", "ShieldCheck", "ShoppingCart", "Signal", "Smartphone", "Sparkles", "Star",
  "Store", "Sun", "Table2", "Tag", "Target", "Terminal", "ThumbsUp", "Timer",
  "TrendingDown", "TrendingUp", "Trophy", "Truck", "Users", "UserCheck", "Video", "Wallet",
  "Wand2", "Waves", "Workflow", "Wrench", "Zap",
].map((n) => n.replace("_", ""));

type IconEntry = { name: string; Comp: React.ComponentType<{ className?: string }> };

const ICONS: readonly IconEntry[] = ICON_NAMES.flatMap((name) => {
  const Comp = (Lucide as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    name
  ];
  return Comp ? [{ name, Comp }] : [];
});

/** Space out a PascalCase icon name for search + alt text ("BarChart3" → "bar chart 3"). */
const pretty = (name: string) =>
  name
    .replace(/([a-z])([A-Z0-9])/g, "$1 $2")
    .replace(/([0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();

/**
 * Freeze a rendered lucide icon into standalone SVG markup at the chosen ink.
 * lucide draws with `currentColor`, which means nothing once detached, so the
 * colour is baked onto the root element.
 */
function iconSvgFrom(node: SVGSVGElement, color: string, weight: number): string {
  const clone = node.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.removeAttribute("class");
  clone.setAttribute("width", "100");
  clone.setAttribute("height", "100");
  clone.setAttribute("stroke", color);
  clone.setAttribute("stroke-width", String(weight));
  clone.setAttribute("fill", "none");
  return new XMLSerializer().serializeToString(clone);
}

const SWATCH_LABELS: Record<string, string> = {
  "#03002C": "Brand navy",
  "#003FC7": "Brand blue",
  "#A1FBF9": "Aqua",
  "#C2A3FF": "Lavender",
  "#FFEB66": "Yellow",
  "#EC388A": "Pink",
  "#FFFFFF": "White",
  "#666666": "Gray",
};

export function CanvasInsertLibrary({
  accent,
  onInsert,
  onClose,
}: {
  /** Deck accent, offered first so inserts stay on-palette by default. */
  accent: string;
  onInsert: (payload: InsertPayload) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"shapes" | "icons" | "upload">("shapes");
  const [query, setQuery] = useState("");
  const [color, setColor] = useState(accent);
  const [style, setStyle] = useState<ShapeStyle>("solid");
  const [weight, setWeight] = useState(2);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);


  const swatches = useMemo(
    () => [accent, ...Object.keys(SWATCH_LABELS).filter((c) => c.toLowerCase() !== accent.toLowerCase())],
    [accent],
  );

  const shapes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? SHAPES.filter((s) => `${s.label} ${s.group} ${s.id}`.toLowerCase().includes(q))
      : SHAPES;
    return SHAPE_GROUPS.map((g) => ({ group: g, items: rows.filter((s) => s.group === g) })).filter(
      (g) => g.items.length > 0,
    );
  }, [query]);

  const icons = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? ICONS.filter((i) => pretty(i.name).includes(q)) : ICONS;
  }, [query]);

  const insertShape = (shape: ShapeDef) =>
    onInsert({
      src: shapeDataUrl(shape, color, style, style === "outline" ? weight * 3 : 6),
      alt: `${shape.label} shape`,
      aspect: shape.aspect ?? 1,
    });

  const insertIcon = (name: string) => {
    const svg = gridRef.current?.querySelector<SVGSVGElement>(`[data-icon="${name}"] svg`);
    if (!svg) return;
    onInsert({
      src: `data:image/svg+xml;utf8,${encodeURIComponent(iconSvgFrom(svg, color, weight))}`,
      alt: `${pretty(name)} icon`,
      aspect: 1,
    });
  };

  /** Insert one or more uploaded `.svg` files as vector artwork. */
  const insertFiles = async (files: FileList | File[] | null) => {
    const list = [...(files ?? [])];
    if (list.length === 0) return;
    let ok = 0;
    for (const file of list) {
      const art = await importSvgFile(file);
      if (!art) continue;
      onInsert({ src: art.src, alt: art.alt, aspect: art.aspect });
      ok += 1;
    }
    setUploadNote(
      ok === 0
        ? "That file isn’t a readable SVG — export as plain SVG and try again."
        : `Placed ${ok} vector graphic${ok === 1 ? "" : "s"} on the slide.`,
    );
  };

  const tabBtn = (id: "shapes" | "icons" | "upload", label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      aria-pressed={tab === id}
      className="min-h-8 rounded-lg px-3 text-[12px] font-semibold transition-colors"
      style={
        tab === id
          ? { background: color, color: "#FFFFFF" }
          : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.78)" }
      }
    >
      {label}
    </button>
  );


  return (
    <div
      {...{ [CANVAS_UI_ATTR]: "" }}
      className="flex max-h-full w-80 flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#03002C]/95 text-white shadow-2xl backdrop-blur"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
        <div className="flex gap-1.5">
          {tabBtn("shapes", "Shapes")}
          {tabBtn("icons", "Icons")}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close insert library"
          className="ml-auto min-h-8 rounded-lg px-2 text-white/70 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2.5 border-b border-white/10 px-3 py-2.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === "shapes" ? "Search shapes…" : "Search icons…"}
          aria-label={tab === "shapes" ? "Search shapes" : "Search icons"}
          className="min-h-8 w-full rounded-lg border border-white/15 bg-white/10 px-2.5 text-[12px] text-white placeholder:text-white/45 focus:outline-none focus:ring-2"
          style={{ ["--tw-ring-color" as string]: color }}
        />

        <div className="flex flex-wrap items-center gap-1.5">
          {swatches.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`${SWATCH_LABELS[c] ?? "Accent"} ${c}`}
              aria-pressed={color === c}
              className="h-6 w-6 rounded-md border transition-transform hover:scale-110"
              style={{
                background: c,
                borderColor: color === c ? "#FFFFFF" : "rgba(255,255,255,0.25)",
                boxShadow: color === c ? "0 0 0 2px rgba(255,255,255,0.35)" : undefined,
              }}
            />
          ))}
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#003FC7"}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Custom colour"
            className="h-6 w-8 cursor-pointer rounded-md border border-white/25 bg-transparent p-0"
          />
        </div>

        <div className="flex items-center gap-2 text-[11px] text-white/70">
          {tab === "shapes" && (
            <div className="flex gap-1">
              {(["solid", "outline"] as ShapeStyle[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  aria-pressed={style === s}
                  className="min-h-7 rounded-md px-2 font-semibold"
                  style={
                    style === s
                      ? { background: "rgba(255,255,255,0.9)", color: "#03002C" }
                      : { background: "rgba(255,255,255,0.08)" }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {(tab === "icons" || style === "outline") && (
            <label className="ml-auto flex items-center gap-1.5">
              stroke
              <input
                type="range"
                min={1}
                max={4}
                step={0.5}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-20 accent-white"
                aria-label="Stroke weight"
              />
            </label>
          )}
        </div>
      </div>

      <div ref={gridRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
        {tab === "shapes" ? (
          shapes.map(({ group, items }) => (
            <section key={group} className="mb-3 last:mb-0">
              <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                {group}
              </h4>
              <div className="grid grid-cols-5 gap-1.5">
                {items.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    title={s.label}
                    aria-label={`Insert ${s.label}`}
                    onClick={() => insertShape(s)}
                    className="grid aspect-square place-items-center rounded-lg border border-white/10 bg-white/5 p-1.5 transition-colors hover:border-white/40 hover:bg-white/12"
                  >
                    {/* Preview always renders light so every shape reads on the dark panel. */}
                    <span
                      className="h-full w-full"
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{
                        __html: shapeSvg(s, "#FFFFFF", style, style === "outline" ? 6 : 6),
                      }}
                    />
                  </button>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="grid grid-cols-6 gap-1.5">
            {icons.map(({ name, Comp }) => (
              <button
                key={name}
                type="button"
                data-icon={name}
                title={pretty(name)}
                aria-label={`Insert ${pretty(name)} icon`}
                onClick={() => insertIcon(name)}
                className="grid aspect-square place-items-center rounded-lg border border-white/10 bg-white/5 transition-colors hover:border-white/40 hover:bg-white/12"
              >
                <Comp className="h-5 w-5" />
              </button>
            ))}
          </div>
        )}

        {((tab === "shapes" && shapes.length === 0) || (tab === "icons" && icons.length === 0)) && (
          <p className="py-6 text-center text-[12px] text-white/55">Nothing matches “{query}”.</p>
        )}
      </div>
    </div>
  );
}
