import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bot, Download, LayoutGrid, Sparkles, Wand2 } from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const HERO_ACCENT = "#003FC7";
const HERO_GLOW = "#A1FBF9";

const CAPABILITIES = [
  { label: "Browse every module", icon: LayoutGrid, color: "#A1FBF9" },
  { label: "Apply brand layouts", icon: Wand2, color: "#EC388A" },
  { label: "Export stills & PPTX", icon: Download, color: "#A6FA87" },
  { label: "Build full decks with AI", icon: Bot, color: "#FF9B70" },
] as const;

function ParallaxWatermark({ text }: { text: string }) {
  const reducedMotion = useReducedMotion();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrollY(window.scrollY);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  const y = reducedMotion ? 0 : Math.min(scrollY, 800);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -bottom-6 select-none text-center font-semibold leading-none tracking-[-0.04em] will-change-transform"
      style={{
        fontSize: "clamp(80px, 18vw, 280px)",
        background: "linear-gradient(180deg, #ffffff00 0%, #ffffff16 35%, #ffffff05 75%, transparent 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        mixBlendMode: "screen",
        transform: `translate3d(0, ${y * 0.45}px, 0)`,
        opacity: Math.max(0, 1 - y / 700),
        WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 25%, black 100%)",
        maskImage: "linear-gradient(180deg, transparent 0%, black 25%, black 100%)",
      }}
    >
      {text}
    </div>
  );
}

function AuroraBackground() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  const [scrollY, setScrollY] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrollY(window.scrollY);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const el = rootRef.current?.parentElement;
    if (!el) return;
    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    const tick = () => {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      if (Math.abs(targetX - curX) < 0.001 && Math.abs(targetY - curY) < 0.001) {
        raf = 0;
        setPointer({ x: curX, y: curY });
        return;
      }
      setPointer({ x: curX, y: curY });
      raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      targetX = ((e.clientX - r.left) / r.width) * 2 - 1;
      targetY = ((e.clientY - r.top) / r.height) * 2 - 1;
      kick();
    };
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      kick();
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  const y = reducedMotion ? 0 : Math.min(scrollY, 800);
  const pxA = pointer.x * 22;
  const pyA = pointer.y * 16;
  const pxB = pointer.x * -18;
  const pyB = pointer.y * -12;
  const washX = pointer.x * 6;
  const washY = pointer.y * 4;

  return (
    <div ref={rootRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(60% 55% at ${20 + washX}% ${30 + washY}%, ${HERO_ACCENT}22 0%, transparent 60%), radial-gradient(55% 50% at ${85 + washX}% ${75 + washY}%, ${HERO_GLOW}1c 0%, transparent 65%)`,
        }}
      />
      <div
        className="absolute h-[520px] w-[520px] rounded-full blur-[120px] will-change-transform"
        style={{
          backgroundColor: HERO_ACCENT,
          opacity: 0.42,
          top: "-160px",
          left: "-120px",
          transform: `translate3d(${y * 0.08 + pxA}px, ${y * -0.35 + pyA}px, 0) scale(1)`,
          transition: "transform 1600ms cubic-bezier(.4,0,.2,1)",
        }}
      />
      <div
        className="absolute h-[460px] w-[460px] rounded-full blur-[140px] will-change-transform"
        style={{
          backgroundColor: HERO_GLOW,
          opacity: 0.32,
          bottom: "-100px",
          right: "-80px",
          transform: `translate3d(${y * -0.1 + pxB}px, ${y * 0.22 + pyB}px, 0) scale(1)`,
          transition: "transform 1600ms cubic-bezier(.4,0,.2,1)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),rgba(255,255,255,0)_90%)]" />
    </div>
  );
}

export function ModuleLibraryHero() {
  return (
    <section className="full-bleed relative overflow-hidden bg-[#03002C] py-8 sm:py-10 lg:py-12">
      <AuroraBackground />
      <ParallaxWatermark text="MODULES" />

      <div className="relative mx-auto max-w-[1400px] px-6">
        {/* Eyebrow */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/75 backdrop-blur">
            <Sparkles size={12} className="text-[#A1FBF9]" />
            Public review · read only
          </span>
          <span className="hidden text-[11px] text-white/45 sm:inline">
            Every approved slide module in the TransPerfect modular system
          </span>
        </div>

        {/* Headline + capabilities */}
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#E0E8F5] sm:text-4xl lg:text-5xl">
              Module variant library
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#E0E8F5]/65">
              Browse every approved TransPerfect slide module in light and dark, filter by family
              and brand, enlarge any layout, and download a still. Need a complete deck? Hand the
              same brief to the Presentation Agent and get a fully editable PPTX in one
              conversation.
            </p>

            {/* CTA to Presentation Agent */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                to="/agent"
                className="group inline-flex items-center gap-2 rounded-xl border border-[#A1FBF9]/30 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-[#A1FBF9] shadow-sm transition hover:bg-white/[0.1] hover:shadow-md"
              >
                <Wand2 size={14} />
                Create a full deck with the Presentation Agent
              </Link>
              <span className="text-[11px] text-white/40">
                AI-powered · brand-compliant · editable PPTX
              </span>
            </div>
          </div>

          {/* Capability cards */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            {CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.label}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-2.5 backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/[0.06]"
                >
                  <div
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${cap.color}18`, color: cap.color }}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="mt-1.5 text-[11px] font-semibold leading-tight text-[#E0E8F5]">
                    {cap.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
