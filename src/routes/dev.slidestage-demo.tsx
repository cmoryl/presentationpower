import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SlideStage, type Direction } from "@/components/slide/SlideStage";
import {
  DEFAULT_SLIDE_TRANSITION,
  type SlideTransition,
  type TransitionType,
} from "@/lib/deck-store";

export const Route = createFileRoute("/dev/slidestage-demo")({
  head: () => ({ meta: [{ title: "SlideStage demo · TransPerfect" }] }),
  component: DemoView,
});

const DEMO = [
  { id: "d-1", label: "Slide 1", color: "#003FC7" },
  { id: "d-2", label: "Slide 2", color: "#A1FBF9" },
  { id: "d-3", label: "Slide 3", color: "#FFEB66" },
];

const TYPES: TransitionType[] = ["none", "fade", "push-left", "push-right", "zoom", "cut"];

function DemoView() {
  const [i, setI] = useState(0);
  const [type, setType] = useState<TransitionType>("fade");
  const [durationMs, setDurationMs] = useState(800);
  const [dir, setDir] = useState<Direction>("forward");

  const slide = DEMO[i];
  const transition: SlideTransition = { type, durationMs };

  function go(delta: number) {
    setDir(delta > 0 ? "forward" : "back");
    setI((n) => Math.max(0, Math.min(DEMO.length - 1, n + delta)));
  }

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-lg font-semibold uppercase tracking-widest text-white/80">
          SlideStage demo
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1">
            Type
            <select
              data-testid="demo-type"
              value={type}
              onChange={(e) => setType(e.target.value as TransitionType)}
              className="rounded bg-white/10 px-2 py-1 text-white"
            >
              {TYPES.map((t) => (
                <option key={t} value={t} className="text-black">
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            Duration
            <input
              data-testid="demo-duration"
              type="number"
              value={durationMs}
              onChange={(e) => setDurationMs(Math.max(0, Number(e.target.value)))}
              className="w-20 rounded bg-white/10 px-2 py-1 text-white"
            />
          </label>
          <button
            type="button"
            data-testid="demo-prev"
            onClick={() => go(-1)}
            className="rounded border border-white/20 px-3 py-1"
          >
            Prev
          </button>
          <button
            type="button"
            data-testid="demo-next"
            onClick={() => go(1)}
            className="rounded border border-white/20 px-3 py-1"
          >
            Next
          </button>
          <span data-testid="demo-index" className="ml-2 text-white/60">
            {i + 1} / {DEMO.length}
          </span>
        </div>
        <div className="mt-4 aspect-[16/9] w-full overflow-hidden rounded-lg bg-white">
          <SlideStage slideKey={slide.id} direction={dir} transition={transition}>
            <div
              data-testid={`demo-slide-${slide.id}`}
              className="flex h-full w-full items-center justify-center text-6xl font-bold"
              style={{ background: slide.color, color: "#03002C" }}
            >
              {slide.label}
            </div>
          </SlideStage>
        </div>
        <p className="mt-2 text-[11px] text-white/50">
          Default: {DEFAULT_SLIDE_TRANSITION.type} · {DEFAULT_SLIDE_TRANSITION.durationMs}ms
        </p>
      </div>
    </div>
  );
}
