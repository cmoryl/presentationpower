// NEXT 2026 London — post-event design audit viewer. Renders the two audit
// write-ups kept in docs/ (photo audit round 2 + the lessons drawn from the
// v4 design audit) so staff can read them from the London page.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen } from "lucide-react";
import type { ReactNode } from "react";

import { AppShell } from "@/components/AppShell";
import round2Md from "../../docs/london-2026-photo-audit-round2.md?raw";
import lessonsMd from "../../docs/EVENT-LESSONS.md?raw";

export const Route = createFileRoute("/events/next_/london_/audit")({
  head: () => ({
    meta: [
      { title: "London 2026 event audit · TransPerfect Element" },
      {
        name: "description",
        content:
          "Post-event design audit of NEXT 2026 London: what worked, problems ranked by impact, and the fixes carried to San Francisco.",
      },
      { property: "og:title", content: "NEXT 2026 London — event design audit" },
      {
        property: "og:description",
        content: "Photo-based audit of London signage with fixes for San Francisco.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuditPage,
});

/** The London audit part of the lessons log: from the v4 audit heading to the end. */
function londonLessons(md: string): string {
  const start = md.indexOf("## NEXT 2026 London — post-event design audit");
  return start >= 0 ? md.slice(start).replace(/<!--[\s\S]*?-->/g, "") : "";
}

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <em key={i}>{p.slice(1, -1)}</em>;
    return p;
  });
}

function Markdown({ md }: { md: string }) {
  const out: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (!list.length) return;
    out.push(
      <ul key={`ul${out.length}`} className="my-3 list-disc space-y-1.5 pl-6">
        {list.map((l, i) => (
          <li key={i}>{inline(l)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    const li = line.match(/^\s*[*-]\s+(.*)$/);
    if (li) {
      list.push(li[1]);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      const cls =
        lvl === 1
          ? "mt-2 text-2xl font-bold"
          : lvl === 2
            ? "mt-10 border-t border-border pt-6 text-xl font-bold"
            : "mt-6 text-base font-semibold";
      out.push(
        <p key={out.length} role="heading" aria-level={lvl + 1} className={cls}>
          {inline(h[2])}
        </p>,
      );
      continue;
    }
    out.push(
      <p key={out.length} className="my-2 leading-relaxed">
        {inline(line)}
      </p>,
    );
  }
  flush();
  return <div className="text-sm text-foreground">{out}</div>;
}

function AuditPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/events/next/london"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to NEXT London
          </Link>
          <Link
            to="/events/next/london/photos"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <BookOpen className="h-4 w-4" aria-hidden /> Event photos
          </Link>
        </div>
        <h1 className="mt-6 text-3xl font-bold">NEXT 2026 London — event audit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Built from the event photography. AI photo notes are first guesses, and heights are
          suggestions, not measurements.
        </p>
        <section className="mt-8">
          <Markdown md={round2Md} />
        </section>
        <section className="mt-12">
          <Markdown md={londonLessons(lessonsMd)} />
        </section>
      </main>
    </AppShell>
  );
}
