// Upload or paste a visual knowledge map ("design DNA") so the agent designs
// the deck against the user's own system instead of only the built-in catalog.
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  designDnaSummary,
  parseDesignDna,
  readStoredDesignDna,
  writeStoredDesignDna,
  type DesignDna,
} from "@/lib/agent/design-dna";

export function AgentDesignDnaImport({
  threadId,
  variant = "light",
  onChange,
}: {
  threadId?: string;
  variant?: "light" | "dark";
  onChange?: (dna: DesignDna | null) => void;
}) {
  const [dna, setDna] = useState<DesignDna | null>(() => readStoredDesignDna(threadId));
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const dark = variant === "dark";

  const apply = (raw: string, fileName?: string) => {
    const result = parseDesignDna(raw, fileName);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setDna(result);
    writeStoredDesignDna(threadId, result);
    onChange?.(result);
    setOpen(false);
    setText("");
    toast.success(`Design DNA imported — ${designDnaSummary(result)}`);
  };

  const clear = () => {
    setDna(null);
    writeStoredDesignDna(threadId, null);
    onChange?.(null);
  };

  const btn = `rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition ${
    dark
      ? "border-white/10 bg-white/[0.05] text-white/75 hover:border-white/30 hover:text-white"
      : "border-black/10 bg-white text-[#03002C]/75 hover:border-[#003FC7] hover:text-[#03002C]"
  }`;

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`text-[10px] font-semibold uppercase tracking-widest ${
            dark ? "text-white/45" : "text-[#03002C]/45"
          }`}
        >
          Your design DNA
        </span>
        <button type="button" className={btn} onClick={() => fileRef.current?.click()}>
          Upload map
        </button>
        <button type="button" className={btn} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Cancel paste" : "Paste map"}
        </button>
        {dna && (
          <button type="button" className={btn} onClick={clear}>
            Remove
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".json,.md,.markdown,.txt,.yaml,.yml,application/json,text/plain,text/markdown"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > 1_000_000) {
              toast.error("That file is too large — keep the knowledge map under 1 MB.");
              return;
            }
            apply(await file.text(), file.name);
          }}
        />
      </div>

      {open && (
        <div className="space-y-2">
          <textarea
            value={text}
            rows={5}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              'Paste JSON (e.g. { "name": "Acme Deck DNA", "palette": { "page": "#0B1020", "accent": "#7CF" }, "typography": { "heading": "Aeonik", "body": "Inter" }, "rules": ["No gradients", "Always full-bleed covers"] }) or plain notes with hex colors, fonts and rules.'
            }
            className={`w-full resize-y rounded-lg border px-3 py-2 font-mono text-[11px] outline-none transition ${
              dark
                ? "border-white/10 bg-[#03002C]/40 text-white placeholder:text-white/35 focus:border-[#A1FBF9]"
                : "border-black/10 bg-white text-[#03002C] placeholder:text-[#03002C]/35 focus:border-[#003FC7]"
            }`}
          />
          <button
            type="button"
            disabled={text.trim().length < 8}
            onClick={() => apply(text)}
            className="rounded-lg bg-[#003FC7] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
          >
            Use this design DNA
          </button>
        </div>
      )}

      {dna && (
        <div
          className={`rounded-lg border p-2.5 ${
            dark ? "border-white/10 bg-white/[0.04]" : "border-black/[0.06] bg-white/70"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-semibold ${dark ? "text-white" : "text-[#03002C]"}`}>
              {dna.name}
            </span>
            {dna.mode && (
              <span className={`text-[10px] uppercase tracking-widest ${dark ? "text-white/50" : "text-[#03002C]/50"}`}>
                {dna.mode} mode
              </span>
            )}
            {dna.fileName && (
              <span className={`text-[10px] ${dark ? "text-white/40" : "text-[#03002C]/40"}`}>{dna.fileName}</span>
            )}
          </div>
          {dna.palette.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {dna.palette.slice(0, 12).map((p, i) => (
                <span
                  key={`${p.name}-${i}`}
                  title={`${p.name} ${p.value}`}
                  className="h-4 w-4 rounded-full border border-black/10"
                  style={{ background: p.value }}
                />
              ))}
            </div>
          )}
          <p className={`mt-1.5 text-[11px] leading-snug ${dark ? "text-white/60" : "text-[#03002C]/60"}`}>
            {designDnaSummary(dna)} — the agent will design this deck against it.
          </p>
        </div>
      )}
    </div>
  );
}
