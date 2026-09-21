// The GlobalLink Universe on the GlobalLink brand guide page.
//
// Products sit on orbits around the platform hub, joined by their recorded
// connections. Selecting a product lifts it and the products it connects to and
// prints its tagline and description underneath. Keyboard users move through the
// same list of buttons the pointer uses, so nothing here is pointer-only.

import { useMemo, useState } from "react";

import {
  GLOBALLINK_CATEGORY_TAG,
  GLOBALLINK_UNIVERSE,
  globalLinkConnections,
  globalLinkNeighbours,
  globalLinkProduct,
  type GlobalLinkProduct,
} from "@/lib/globallink-universe";

const SIZE = 560;
const C = SIZE / 2;

/** Orbit radius per ring, and which ring a product sits on. */
function ring(p: GlobalLinkProduct): number {
  if (p.hub) return 0;
  if (p.category === "Core Platform") return 1;
  if (p.category === "Media" || p.category === "Live") return 2;
  return 1;
}

type Placed = GlobalLinkProduct & { x: number; y: number };

function place(): Placed[] {
  const rings: Record<number, GlobalLinkProduct[]> = { 0: [], 1: [], 2: [] };
  for (const p of GLOBALLINK_UNIVERSE) rings[ring(p)]!.push(p);
  const radius = [0, 150, 232];
  const out: Placed[] = [];
  for (const key of [0, 1, 2]) {
    const list = rings[key]!;
    list.forEach((p, i) => {
      if (!key) {
        out.push({ ...p, x: C, y: C });
        return;
      }
      const a = (i / list.length) * Math.PI * 2 - Math.PI / 2;
      out.push({
        ...p,
        x: C + Math.cos(a) * radius[key]!,
        y: C + Math.sin(a) * radius[key]!,
      });
    });
  }
  return out;
}

export function GlobalLinkUniverse() {
  const nodes = useMemo(place, []);
  const links = useMemo(globalLinkConnections, []);
  const [selected, setSelected] = useState<string | null>("tms");

  const active = selected ? globalLinkProduct(selected) : undefined;
  const near = useMemo(() => (selected ? globalLinkNeighbours(selected) : []), [selected]);
  const lit = (id: string) => !selected || id === selected || near.includes(id);
  const at = (id: string) => nodes.find((n) => n.id === id)!;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold tracking-tight text-[#03002C]">
        The GlobalLink Universe
      </h2>
      <p className="mt-1 max-w-[70ch] text-sm leading-[1.5] text-black/60">
        The GlobalLink product ecosystem as recorded in the brand kit: the platform at the centre,
        with the web, AI, media, live, development and collaboration products orbiting it. Choose a
        product to see what it does and what it connects to.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-black/10 bg-[#EEF1F7] p-4">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="mx-auto h-auto w-full max-w-[560px]"
            role="img"
            aria-label="GlobalLink product ecosystem map"
          >
            {[150, 232].map((r) => (
              <circle
                key={r}
                cx={C}
                cy={C}
                r={r}
                fill="none"
                stroke="#03002C"
                strokeOpacity={0.08}
                strokeDasharray="3 6"
              />
            ))}
            {links.map(([a, b]) => {
              const on = lit(a) && lit(b) && (!selected || a === selected || b === selected);
              return (
                <line
                  key={`${a}|${b}`}
                  x1={at(a).x}
                  y1={at(a).y}
                  x2={at(b).x}
                  y2={at(b).y}
                  stroke={on ? "#003FC7" : "#03002C"}
                  strokeOpacity={on ? 0.8 : 0.12}
                  strokeWidth={on ? 2 : 1}
                />
              );
            })}
            {nodes.map((n) => {
              const tag = GLOBALLINK_CATEGORY_TAG[n.category];
              const on = lit(n.id);
              const isSel = n.id === selected;
              return (
                <g
                  key={n.id}
                  className="cursor-pointer"
                  opacity={on ? 1 : 0.35}
                  onClick={() => setSelected(n.id === selected ? null : n.id)}
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.hub ? 40 : 30}
                    fill={tag.bg}
                    stroke={isSel ? "#003FC7" : "#FFFFFF"}
                    strokeWidth={isSel ? 3 : 2}
                  />
                  <text
                    x={n.x}
                    y={n.y + 3}
                    textAnchor="middle"
                    fontSize={n.hub ? 13 : 11}
                    fontWeight={600}
                    fill={tag.ink}
                  >
                    {n.name.replace("GlobalLink ", "")}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div>
          <ul className="flex flex-wrap gap-1.5">
            {GLOBALLINK_UNIVERSE.map((p) => {
              const tag = GLOBALLINK_CATEGORY_TAG[p.category];
              const isSel = p.id === selected;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(isSel ? null : p.id)}
                    aria-pressed={isSel}
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003FC7]"
                    style={
                      isSel
                        ? { background: tag.bg, color: tag.ink }
                        : { background: "#FFFFFF", color: "#03002C" }
                    }
                  >
                    {p.name}
                  </button>
                </li>
              );
            })}
          </ul>

          {active ? (
            <article className="mt-4 rounded-xl border border-black/10 bg-white p-5">
              <span
                className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{
                  background: GLOBALLINK_CATEGORY_TAG[active.category].bg,
                  color: GLOBALLINK_CATEGORY_TAG[active.category].ink,
                }}
              >
                {active.category}
              </span>
              <h3 className="mt-2 text-base font-semibold text-[#03002C]">{active.name}</h3>
              <p className="text-sm font-medium text-[#003FC7]">{active.tagline}</p>
              <p className="mt-2 text-sm leading-[1.5] text-black/70">{active.description}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.06em] text-black/55">
                Connects to:{" "}
                <span className="normal-case text-black/75">
                  {near.map((id) => globalLinkProduct(id)?.name).join(", ") || "not recorded"}
                </span>
              </p>
            </article>
          ) : (
            <p className="mt-4 text-sm text-black/55">
              Choose a product to read what it does and what it connects to.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
