// Homepage showreel band.
//
// A cinematic, full-bleed marketing moment between "Choose your element" and
// the finished examples: a parallax collage of real showcase photography, the
// five-brick Element rail, and a drifting marquee of what the system ships.
// Presentation-only — every layer is decorative and compositor-driven, and all
// motion is dropped under prefers-reduced-motion.

import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { ElementBrickRow } from "@/components/brand/ElementBrickMotif";
import { showcaseArt } from "@/lib/showcase-art";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const COLLAGE = [
  { id: "globallink-enterprise-pitch", caption: "Presentation", accent: "#003FC7" },
  { id: "pd-legal-proposal", caption: "Print", accent: "#EC388A" },
  { id: "sc-conference", caption: "Event", accent: "#A6FA87" },
  { id: "sc-gaming", caption: "Social", accent: "#FF9B70" },
] as const;

const MARQUEE = [
  "189 approved slide modules",
  "29 style packs",
  "Editable PowerPoint export",
  "PDF/X-4 press-ready print",
  "Division brand modes",
  "Interactive locations map",
  "Live cost math",
  "Deck + print agents",
  "Hyper-real imagery on demand",
  "Section module library",
  "Brand review scoring",
  "One brief, four surfaces",
];

export function ElementShowreel() {
  const reduced = useReducedMotion();

  return (
    <section className="full-bleed relative mt-12 overflow-hidden border-y border-white/10 bg-[#03002C] py-12 text-white sm:py-14">
      {/* accent blooms */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className={`absolute -left-24 top-[-20%] h-[420px] w-[420px] rounded-full blur-[120px] ${reduced ? "" : "el-bloom"}`}
          style={{ background: "#003FC7", opacity: 0.42 }}
        />
        <div
          className={`absolute right-[-6%] bottom-[-30%] h-[380px] w-[380px] rounded-full blur-[130px] ${reduced ? "" : "el-bloom"}`}
          style={{ background: "#A1FBF9", opacity: 0.2, animationDelay: "2.5s" }}
        />
        <div
          className={`absolute left-[42%] top-[-30%] h-[340px] w-[340px] rounded-full blur-[130px] ${reduced ? "" : "el-bloom"}`}
          style={{ background: "#C2A3FF", opacity: 0.18, animationDelay: "4.5s" }}
        />
      </div>

      <div className="relative grid gap-9 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#A1FBF9]">
            Element · Showreel
          </div>
          <h2 className="mt-3 max-w-lg text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[42px]">
            One brief in. Four finished surfaces out.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/70">
            The same approved modules, palette and brand rules render a deck, a press-ready print
            piece, an event kit and a full social run — no redesign between them, no版 drift, nothing
            to rebuild.
          </p>
          <ElementBrickRow thickness="6px" unit="7px" gap="5px" style={{ marginTop: 24 }} />
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link
              to="/brief/new"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#03002C] transition hover:bg-[#E0E8F5]"
            >
              Start from a brief <ArrowRight size={14} />
            </Link>
            <Link
              to="/elements"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/40 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              See every element
            </Link>
          </div>
        </div>

        {/* Collage — staggered plates, each one real demo photography. */}
        <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
          {COLLAGE.map((c, i) => {
            const art = showcaseArt(c.id);
            return (
              <figure
                key={c.id}
                className={`group relative overflow-hidden rounded-2xl border border-white/12 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.9)] ${
                  i % 2 === 1 ? "sm:translate-y-6" : ""
                }`}
              >
                <div className="relative h-[132px] overflow-hidden sm:h-[168px]">
                  <img
                    src={art.src}
                    alt={art.alt}
                    loading="lazy"
                    width={1536}
                    height={1024}
                    className={`h-full w-full object-cover transition duration-700 group-hover:scale-[1.06] ${
                      reduced ? "" : "tp-kenburns"
                    }`}
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(180deg, transparent 35%, ${c.accent}33 70%, rgba(3,0,44,0.86) 100%)`,
                    }}
                  />
                </div>
                <figcaption className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-3 pb-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/90">
                  <span
                    aria-hidden
                    className="h-3 w-[3px] rounded-full"
                    style={{ background: c.accent }}
                  />
                  {c.caption}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>

      {/* Capability marquee */}
      <div className="relative mt-12 overflow-hidden">
        <div className="el-marquee-track gap-2.5" aria-hidden>
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span
              key={`${m}-${i}`}
              className="shrink-0 rounded-full border border-white/12 bg-white/[0.05] px-4 py-1.5 text-[12px] font-medium text-white/75 backdrop-blur"
            >
              {m}
            </span>
          ))}
        </div>
        <span className="sr-only">{MARQUEE.join(", ")}</span>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-16"
          style={{ background: "linear-gradient(90deg, #03002C, transparent)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-16"
          style={{ background: "linear-gradient(270deg, #03002C, transparent)" }}
        />
      </div>
    </section>
  );
}
