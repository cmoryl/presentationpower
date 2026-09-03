// Directory of shareable preset module-set links.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { LIBRARY_PRESETS, presetPath, type LibraryPreset } from "@/lib/library-presets";

export const Route = createFileRoute("/showcase/")({
  head: () => ({
    meta: [
      { title: "Showcase links · TransPerfect Element" },
      {
        name: "description",
        content:
          "Permanent URLs that open the module library scoped to one division, company or product with its template applied.",
      },
      { property: "og:title", content: "Showcase links · TransPerfect Element" },
      {
        property: "og:description",
        content: "Share a module set per division, company or product — template already applied.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShowcaseIndex,
});

const GROUPS: { kind: LibraryPreset["kind"]; label: string; note: string }[] = [
  { kind: "company", label: "Companies", note: "Master brand and named companies" },
  { kind: "division", label: "Divisions", note: "Approved brand system, division lockup + copy" },
  { kind: "product", label: "Products", note: "Products that own their own template" },
  { kind: "theme", label: "Focused cuts", note: "One brand, filtered to a kind of module" },
];

function CopyLink({ path }: { path: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        const url =
          typeof window === "undefined" ? path : new URL(path, window.location.origin).toString();
        void navigator.clipboard?.writeText(url).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1600);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 px-2.5 py-1 text-xs font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "Copied" : "Copy link"}
    </button>
  );
}

function ShowcaseIndex() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-5 py-10">
        <header>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#003FC7] uppercase">
            Showcase
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Preset module-set links</h1>
          <p className="mt-3 max-w-2xl text-sm text-black/65 dark:text-white/65">
            Each link opens the module library already scoped to one brand with its template applied
            — nothing to configure before a demo. Filters you set afterwards stay in the URL, so any
            view you build by hand is shareable too.
          </p>
        </header>

        {GROUPS.map((group) => {
          const items = LIBRARY_PRESETS.filter((p) => p.kind === group.kind);
          if (items.length === 0) return null;
          return (
            <section key={group.kind} className="mt-10">
              <h2 className="text-lg font-semibold">{group.label}</h2>
              <p className="mt-1 text-xs text-black/55 dark:text-white/55">{group.note}</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {items.map((preset) => {
                  const path = presetPath(preset);
                  return (
                    <li
                      key={preset.slug}
                      className="rounded-2xl border border-black/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
                    >
                      <Link
                        to="/showcase/$presetId"
                        params={{ presetId: preset.slug }}
                        className="font-semibold hover:underline"
                      >
                        {preset.title}
                      </Link>
                      <p className="mt-1 text-sm text-black/65 dark:text-white/65">
                        {preset.blurb}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <code className="truncate rounded bg-black/5 px-2 py-1 text-[11px] dark:bg-white/10">
                          {path}
                        </code>
                        <CopyLink path={path} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
