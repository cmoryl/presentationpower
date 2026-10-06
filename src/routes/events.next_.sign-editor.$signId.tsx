// /events/next/sign-editor/$signId — Legal NEXT signage template in the layer editor.

import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { KioskLayerEditor } from "@/components/events/KioskLayerEditor";
import { legalSign, legalSignLayout } from "@/lib/legal-next-signage";
import { useRequireSignIn } from "@/hooks/use-require-sign-in";
import { SaveAsTemplateButton } from "@/components/events/SaveAsTemplateButton";
import type { SignKind } from "@/lib/sign-set";
import { sizedSignId } from "@/lib/next-california-kiosk-live";

const SIGN_KIND_FOR: Record<string, SignKind> = { doors: "door", columns: "column", foyer: "wall", stairs: "directional", header: "header" };

export const Route = createFileRoute("/events/next_/sign-editor/$signId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "NEXT sign editor · TransPerfect Element" },
      { name: "description", content: "Edit a NEXT sign, pillar or pedestal template, make new sizes, check it for print and download live files." },
      { property: "og:title", content: "Legal NEXT sign editor" },
      { property: "og:description", content: "Layered editor for the Legal NEXT signage templates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignEditorWindow,
});

function Screen({ title, body }: { title: string; body: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0B0A2A] p-8 text-white" aria-live="polite">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-white/70">{body}</p>
        <Link to="/events/next/divisions/$divisionId" params={{ divisionId: "legal" }} className="mt-4 inline-block text-sm font-semibold text-[#A1FBF9] hover:underline">Back to Legal signage</Link>
      </div>
    </main>
  );
}

function SignEditorWindow() {
  const auth = useRequireSignIn();
  const { signId } = Route.useParams();
  const sign = legalSign(signId);
  const navigate = useNavigate();
  const [faceId, setFaceId] = useState(sign?.faces[0]?.id ?? "");
  // A new size is its own live file (`<face>~<w>x<h>`): pieces re-flow, the ground stretches.
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [custom, setCustom] = useState<{ w: string; h: string } | null>(null);
  if (auth === "checking") return <Screen title="Opening the sign editor…" body="Checking you're signed in." />;
  if (auth === "signed-out") return <Screen title="Please sign in to edit signs" body="Taking you to the sign-in page." />;
  const baseLayout = legalSignLayout(faceId);
  const supplied = baseLayout ? { w: +(baseLayout.trimW / 72).toFixed(3), h: +(baseLayout.trimH / 72).toFixed(3) } : null;
  const resized = size && supplied && (size.w !== supplied.w || size.h !== supplied.h);
  const layout = resized ? legalSignLayout(sizedSignId(faceId, size.w, size.h)) : baseLayout;
  if (!sign || !layout) return <Screen title="Sign not found" body="This Legal NEXT sign template doesn't exist." />;
  const face = sign.faces.find((f) => f.id === faceId);
  const homeDivision = sign.division ?? (sign.id.startsWith("finance-") ? "finance" : "legal");
  const sizeKey = resized ? `${size.w}x${size.h}` : "supplied";
  const presets = (sign.sizes ?? []).filter((p) => !supplied || p.w !== supplied.w || p.h !== supplied.h);
  const applyCustom = () => {
    const w = Number(custom?.w), h = Number(custom?.h);
    if (w >= 1 && h >= 1 && w <= 600 && h <= 600) { setSize({ w, h }); setCustom(null); }
  };
  const exit = () => {
    // Opened as a separate window from a card: close it and return to that tab.
    if (window.opener && !window.opener.closed) { window.close(); return; }
    if (window.history.length > 1) { window.history.back(); return; }
    void navigate({ to: "/events/next/divisions/$divisionId", params: { divisionId: homeDivision } });
  };
  return (
    <div className="fixed inset-0 flex flex-col bg-[#0B0A2A]">
      <div className="relative z-[75] flex items-center gap-1 border-b border-white/10 bg-[#070620] px-3 py-1.5">
        <button type="button" onClick={exit} aria-label="Exit editor"
          className="mr-2 inline-flex items-center gap-1.5 rounded-sm border border-white/15 px-3 py-1 text-[12px] font-semibold text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Exit editor
        </button>
        {sign.faces.length > 1 ? (
          <div role="tablist" aria-label="Sign face" className="flex gap-1">
            {sign.faces.map((f) => (
              <button key={f.id} role="tab" type="button" aria-selected={f.id === faceId} onClick={() => { setFaceId(f.id); setSize(null); }}
                className="rounded-sm px-3 py-1 text-[12px] font-semibold text-white/60 hover:text-white aria-selected:bg-white/15 aria-selected:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]">
                {f.label}
              </button>
            ))}
          </div>
        ) : null}
        {supplied ? (
          <div className="ml-3 flex items-center gap-1.5 text-[12px] text-white/70">
            <label htmlFor="sign-size" className="font-semibold">Size</label>
            <select id="sign-size" value={custom ? "custom" : sizeKey}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "custom") { setCustom({ w: String(size?.w ?? supplied.w), h: String(size?.h ?? supplied.h) }); return; }
                setCustom(null);
                if (v === "supplied") { setSize(null); return; }
                const [w, h] = v.split("x").map(Number);
                setSize({ w: w!, h: h! });
              }}
              className="rounded-sm border border-white/15 bg-[#0B0A2A] px-2 py-1 text-[12px] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]">
              <option value="supplied">As supplied · {supplied.w} × {supplied.h} in</option>
              {presets.map((p) => <option key={p.label} value={`${p.w}x${p.h}`}>{p.label}</option>)}
              {resized && !presets.some((p) => p.w === size.w && p.h === size.h) ? <option value={sizeKey}>{size.w} × {size.h} in</option> : null}
              <option value="custom">Custom size…</option>
            </select>
            {custom ? (
              <>
                <label className="sr-only" htmlFor="sign-w">Width in inches</label>
                <input id="sign-w" type="number" min={1} max={600} step={0.125} value={custom.w} onChange={(e) => setCustom({ ...custom, w: e.target.value })}
                  className="w-16 rounded-sm border border-white/15 bg-[#0B0A2A] px-1.5 py-1 text-white" />
                <span aria-hidden>×</span>
                <label className="sr-only" htmlFor="sign-h">Height in inches</label>
                <input id="sign-h" type="number" min={1} max={600} step={0.125} value={custom.h} onChange={(e) => setCustom({ ...custom, h: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") applyCustom(); }}
                  className="w-16 rounded-sm border border-white/15 bg-[#0B0A2A] px-1.5 py-1 text-white" />
                <span>in</span>
                <button type="button" onClick={applyCustom} className="rounded-sm bg-[#003FC7] px-2.5 py-1 font-semibold text-white hover:bg-[#0034a6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Apply</button>
              </>
            ) : null}
            {resized ? <span className="ml-1 text-white/50">New size · pieces re-placed, check before export</span> : null}
          </div>
        ) : null}
        <SaveAsTemplateButton key={layout.id} layout={layout} sourceLabel={`${sign.title}${sign.faces.length > 1 ? ` · ${face?.label}` : ""}`} defaultKind={SIGN_KIND_FOR[sign.id] ?? "other"} className="ml-auto" />
      </div>
      <div className="relative flex-1">
        <KioskLayerEditor key={layout.id} layout={layout} vendor={`${sign.title}${sign.faces.length > 1 ? ` · ${face?.label}` : ""}${resized ? ` · ${size.w}×${size.h} in` : ""}`} embedded />
      </div>
    </div>
  );
}
