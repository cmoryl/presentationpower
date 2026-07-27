import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import reference from "@/lib/next-build-reference.json";
import { NEXT_EVENT } from "@/lib/next-event";

export const Route = createFileRoute("/knowledge/brand-guides/next-2026-build")({
  head: () => ({
    meta: [
      { title: "NEXT 2026 Build Reference · Formats, IDs & Decisions" },
      {
        name: "description",
        content:
          "The full TransPerfect NEXT 2026 production reference: all 28 format specs, Canva asset and element IDs, build status, knowledge base, folder directory and PowerPoint masters.",
      },
      { property: "og:title", content: "NEXT 2026 Build Reference" },
      {
        property: "og:description",
        content:
          "Format specs, Canva asset/element IDs, build decisions and the live folder directory for TransPerfect NEXT 2026.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NextBuildReference,
});

type Block =
  | { t: "h3" | "h4" | "p" | "note"; v: string }
  | { t: "list"; items: string[] }
  | { t: "table"; rows: string[][] };

type Section = { id: string; title: string; blocks: Block[] };

const SECTIONS = reference as unknown as Section[];

const ID_RE = /^[A-Z]{2,3}[A-Za-z0-9_-]{6,}$/;

function Cell({ value }: { value: string }) {
  if (ID_RE.test(value)) {
    return (
      <code className="rounded bg-black/[0.06] px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/10">
        {value}
      </code>
    );
  }
  return <span>{value}</span>;
}

function BlockView({ block }: { block: Block }) {
  if (block.t === "h3" || block.t === "h4") {
    return (
      <h3 className="mt-8 text-base font-semibold tracking-tight text-black dark:text-white">
        {block.v}
      </h3>
    );
  }
  if (block.t === "note") {
    return (
      <p className="rounded-xl border border-black/10 bg-black/[0.03] p-4 text-sm leading-relaxed text-black/70 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70">
        {block.v}
      </p>
    );
  }
  if (block.t === "p") {
    return (
      <p className="text-sm leading-relaxed text-black/70 dark:text-white/70">{block.v}</p>
    );
  }
  if (block.t === "list") {
    return (
      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-black/70 dark:text-white/70">
        {block.items.map((i, n) => (
          <li key={n}>{i}</li>
        ))}
      </ul>
    );
  }
  const [head, ...body] = block.rows;
  return (
    <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
      <table className="w-full min-w-[420px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-black/[0.04] dark:bg-white/[0.06]">
            {head.map((c, i) => (
              <th
                key={i}
                className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/55 dark:text-white/55"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r} className="border-t border-black/[0.07] dark:border-white/10">
              {row.map((c, i) => (
                <td key={i} className="px-3 py-2 align-top text-black/75 dark:text-white/75">
                  <Cell value={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function blockText(b: Block): string {
  if (b.t === "list") return b.items.join(" ");
  if (b.t === "table") return b.rows.flat().join(" ");
  return b.v;
}

function NextBuildReference() {
  const [query, setQuery] = useState("");

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.map((s) => ({
      ...s,
      blocks: s.blocks.filter(
        (b) => blockText(b).toLowerCase().includes(q) || s.title.toLowerCase().includes(q),
      ),
    })).filter((s) => s.blocks.length > 0);
  }, [query]);

  const tableCount = SECTIONS.reduce(
    (n, s) => n + s.blocks.filter((b) => b.t === "table").length,
    0,
  );

  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-3xl bg-[#1B3E6F] px-8 py-14 text-white sm:px-12">
        <div className="relative max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.32em] text-white/55">
            {NEXT_EVENT.name} · Production reference
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            NEXT 2026 build reference
          </h1>
          <p className="mt-4 text-white/70">
            The complete production companion to the master brand guide — layout logic for all 28
            formats, Canva asset and element IDs for direct API edits, build status and decisions,
            the team knowledge base, the live folder directory and the native PowerPoint masters.
          </p>
          <div className="mt-8 flex flex-wrap gap-8 text-sm">
            {[
              [String(SECTIONS.length), "Reference sections"],
              [String(tableCount), "ID / spec tables"],
              ["28", "Documented formats"],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="text-3xl font-semibold tabular-nums">{n}</div>
                <div className="text-white/55">{l}</div>
              </div>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to={"/knowledge/brand-guides/next-2026" as never}
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-[#1B3E6F] transition hover:bg-white/90"
            >
              ← Master brand guide
            </Link>
            <Link
              to={"/events/next" as never}
              className="rounded-full border border-white/30 px-5 py-2 text-sm text-white/85 transition hover:border-white"
            >
              NEXT 2026 hub
            </Link>
            <a
              href={NEXT_EVENT.referenceUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/30 px-5 py-2 text-sm text-white/85 transition hover:border-white"
            >
              Canva master reference ↗
            </a>
          </div>
        </div>
      </header>

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex flex-wrap gap-2" aria-label="Reference sections">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-black/15 px-4 py-1.5 text-xs text-black/70 transition hover:border-black/40 dark:border-white/15 dark:text-white/70 dark:hover:border-white/40"
            >
              {s.title}
            </a>
          ))}
        </nav>
        <label className="flex items-center gap-2 text-sm">
          <span className="sr-only">Search the build reference</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search formats, IDs, decisions…"
            className="w-full rounded-full border border-black/15 bg-transparent px-4 py-2 text-sm outline-none transition focus:border-black/40 dark:border-white/15 dark:focus:border-white/40 lg:w-72"
          />
        </label>
      </div>

      <div className="mt-10 space-y-14 pb-24">
        {sections.length === 0 && (
          <p className="text-sm text-black/60 dark:text-white/60">
            No entries match “{query}”.
          </p>
        )}
        {sections.map((s) => (
          <section
            key={s.id}
            id={s.id}
            className="scroll-mt-24 border-t border-black/10 pt-10 dark:border-white/10"
          >
            <h2 className="text-3xl font-semibold tracking-tight">{s.title}</h2>
            <div className="mt-6 space-y-4">
              {s.blocks.map((b, i) => (
                <BlockView key={i} block={b} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
