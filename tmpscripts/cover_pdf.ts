import { setAssetBaseUrl } from "@/lib/asset-base-url";
import { bookletDefault } from "@/lib/next-booklet";
import { buildBookletPdf } from "@/lib/next-booklet-pdf";
import { BOOKLET_COVER_ART, BOOKLET_COVER_TREATMENTS } from "@/lib/next-booklet-cover-art";
import { writeFileSync } from "node:fs";

setAssetBaseUrl("http://localhost:8080");
for (const t of BOOKLET_COVER_TREATMENTS) {
  const base = bookletDefault();
  const cfg = {
    ...base,
    includeAgenda: false,
    cover: {
      ...base.cover,
      artId: BOOKLET_COVER_ART[0]!.id,
      treatment: t.id,
      eyebrow: "GLOBALLINK NEXT",
      title: "NEXT 2026 London",
      subtitle: "24–25 September 2026 · QEII Centre, Westminster",
      footnote: "Programme correct at print. transperfect.com/next",
    },
  };
  const out = await buildBookletPdf(cfg as never, { agenda: null, imagePages: [] } as never);
  writeFileSync(`/tmp/cv/${t.id}.pdf`, out.bytes);
  console.log(t.id, out.bytes.length, "|", out.notes.join(" | "));
}
