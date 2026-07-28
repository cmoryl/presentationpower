// Editorial photography set for an event playbook.
//
// Each playbook has a cinematic hero frame plus two supporting frames so the
// demo page communicates the look and feel of the live event, not just the
// generated social assets.

import { useState } from "react";
import { X } from "lucide-react";
import { getPlaybookImagery } from "@/lib/playbook-imagery";

type Props = {
  playbookId: string;
  accent: string;
  name: string;
};

export function PlaybookGallery({ playbookId, accent, name }: Props) {
  const imagery = getPlaybookImagery(playbookId);
  const [zoom, setZoom] = useState<string | null>(null);
  if (!imagery) return null;

  const frames = [imagery.hero, ...imagery.secondary];

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {frames.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setZoom(src)}
            aria-label={`Enlarge look and feel image ${i + 1} for ${name}`}
            className={`group relative overflow-hidden rounded-2xl border border-black/10 bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7] ${
              i === 0 ? "md:col-span-2 aspect-[16/7]" : "aspect-[4/3]"
            }`}

          >
            <img
              src={src}
              alt={`${name} — event environment ${i + 1}`}
              loading="lazy"
              width={i === 0 ? 1536 : 1024}
              height={i === 0 ? 864 : 768}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-25"
              style={{ background: `linear-gradient(160deg, ${accent}00 40%, ${accent} 100%)` }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1"
              style={{ background: accent }}
            />
          </button>
        ))}
      </div>

      {zoom ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} imagery preview`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setZoom(null)}
        >
          <img
            src={zoom}
            alt={`${name} — enlarged event environment`}
            className="max-h-full max-w-full rounded-2xl object-contain"
          />
          <button
            type="button"
            onClick={() => setZoom(null)}
            aria-label="Close image preview"
            className="absolute right-6 top-6 rounded-full bg-white/90 p-2 text-[#03002C]"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}
    </>
  );
}
