/**
 * A division's starter sign set, built from the London kit. Previews are drawn
 * in the browser from the same builders as London; every download passes the
 * London print QA gate before it is written.
 */

import { useMemo, useState } from "react";
import { Download, Pencil } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sign3dLink } from "@/components/events/Sign3dLink";
import {
  DIVISION_SIGN_GROUP_LABEL,
  divisionSignArtOptions,
  divisionSignFile,
  divisionSigns,
  type DivisionSign,
  type DivisionSignGroup,
} from "@/lib/next-division-signage";
import { buildLondonPanelAiAsync, buildLondonPanelSvg, londonAiBytes } from "@/lib/next-london-revise";
import { auditAi, auditSvg, gateOnQa } from "@/lib/london-signage-qa";
import { legalSign, legalSignMasterUrl } from "@/lib/legal-next-signage";
import { useLondonSignageFace } from "@/hooks/use-london-signage-face";

function dataUrl(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function SignCard({ sign, compact }: { sign: DivisionSign; compact?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  // A desk with a supplied live file shows and downloads that file, not the generated art.
  const supplied = sign.liveSignId ? legalSign(sign.liveSignId) : null;
  const suppliedMaster = supplied ? legalSignMasterUrl(supplied) : null;
  const preview = useMemo(() => {
    if (supplied?.preview) return supplied.preview;
    try {
      return dataUrl(buildLondonPanelSvg(sign.panel, divisionSignArtOptions(sign)));
    } catch {
      return null;
    }
  }, [sign, supplied]);

  async function download(kind: "svg" | "ai") {
    setBusy(kind);
    try {
      const art = divisionSignArtOptions(sign);
      if (kind === "svg") {
        const svg = buildLondonPanelSvg(sign.panel, art);
        gateOnQa(auditSvg(sign.panel, svg));
        save(new Blob([svg], { type: "image/svg+xml" }), `${divisionSignFile(sign)}.svg`);
      } else {
        const ai = await buildLondonPanelAiAsync(sign.panel, art);
        gateOnQa(auditAi(sign.panel, ai));
        save(new Blob([londonAiBytes(ai)], { type: "application/illustrator" }), `${divisionSignFile(sign)}.ai`);
      }
    } catch (e) {
      toast.error(`${sign.label} — not downloaded`, { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <figure className="flex flex-col rounded-xl border border-border bg-card p-3">
      <div className="flex h-44 items-center justify-center rounded-lg bg-muted/60 p-2">
        {preview ? (
          <img src={preview} alt={`${sign.label} preview`} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">Preview unavailable</span>
        )}
      </div>
      <figcaption className="mt-2 text-sm font-medium">{sign.label}</figcaption>
      {!compact && (
        <div className="mt-2 flex flex-wrap gap-2">
          {suppliedMaster ? (
            <Button size="sm" variant="outline" asChild>
              <a href={suppliedMaster} download={supplied?.master}>
                <Download className="h-3.5 w-3.5" /> Supplied .ai
              </a>
            </Button>
          ) : (<>
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => download("svg")}>
            <Download className="h-3.5 w-3.5" /> {busy === "svg" ? "…" : "SVG"}
          </Button>
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => download("ai")}>
            <Download className="h-3.5 w-3.5" /> {busy === "ai" ? "…" : "AI"}
          </Button>
          </>)}
          {sign.liveSignId ? (
            <Button size="sm" asChild>
              <Link to="/events/next/sign-editor/$signId" params={{ signId: sign.liveSignId }}>
                <Pencil className="h-3.5 w-3.5" /> Edit live file
              </Link>
            </Button>
          ) : null}
          <Sign3dLink sign={sign.liveSignId} label={sign.name ?? "sign"} />
        </div>
      )}
    </figure>
  );
}

export function DivisionSignageKit({
  divisionId,
  compact,
  only,
}: {
  divisionId: string;
  compact?: boolean;
  /** Limit the kit to these groups (e.g. the desk on the master templates page). */
  only?: DivisionSignGroup[];
}) {
  const faceReady = useLondonSignageFace();
  const signs = useMemo(
    () => divisionSigns(divisionId).filter((s) => !only || only.includes(s.group)),
    [divisionId, only?.join(",")],
  );
  if (signs.length === 0) return null;
  if (!faceReady) return <p className="text-sm text-muted-foreground">Loading the signage typeface…</p>;
  const shown = compact ? signs.filter((_, i) => [0, 2, 5, 8].includes(i)) : signs;
  const groups = [...new Set(shown.map((s) => s.group))] as DivisionSignGroup[];
  if (compact) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((s) => (
          <SignCard key={s.panel.id} sign={s} compact />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g}>
          {!compact && <h3 className="mb-3 text-base font-semibold">{DIVISION_SIGN_GROUP_LABEL[g]}</h3>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {shown.filter((s) => s.group === g).map((s) => (
              <SignCard key={s.panel.id} sign={s} compact={compact} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
