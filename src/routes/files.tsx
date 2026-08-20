// My Files — one place where a user finds everything they saved, edited, or
// created: presentation decks, print assets, saved modules, and social/email
// surfaces. Owner-scoped server side; this page only filters and sorts.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  FileText,
  Presentation,
  LayoutGrid,
  Share2,
  Search,
  Trash2,
  Loader2,
  FolderOpen,
  ArrowUpRight,
  Download,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { listMyFiles, deleteMyFile, type MyFile, type MyFileKind } from "@/lib/my-files.functions";
import { getSlideFileUrl } from "@/lib/slide-files.functions";

export const Route = createFileRoute("/files")({
  head: () => ({
    meta: [
      { title: "My Files · TransPerfect Element" },
      {
        name: "description",
        content:
          "Every deck, print asset, saved module, and social surface you created or edited — in one searchable place.",
      },
      { property: "og:title", content: "My Files · TransPerfect Element" },
      {
        property: "og:description",
        content: "Find and reopen everything you saved, edited, or created.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyFilesPage,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-red-600">My Files failed to load: {error.message}</div>
  ),
});

const KIND_META: Record<
  MyFileKind,
  { label: string; icon: typeof FileText; tint: string; group: string; accent: string; blurb: string }
> = {
  deck: {
    label: "Presentation",
    icon: Presentation,
    tint: "bg-[#003FC7]/10 text-[#003FC7]",
    group: "Decks",
    accent: "#003FC7",
    blurb: "Full presentations",
  },
  print: {
    label: "Print",
    icon: FileText,
    tint: "bg-[#EC388A]/10 text-[#EC388A]",
    group: "Print",
    accent: "#EC388A",
    blurb: "Brochures & case studies",
  },
  module: {
    label: "Module",
    icon: LayoutGrid,
    tint: "bg-[#A1FBF9]/40 text-[#03002C]",
    group: "Modules",
    accent: "#12B8B4",
    blurb: "Reusable sections",
  },
  slide: {
    label: "Slide",
    icon: Presentation,
    tint: "bg-[#C2A3FF]/35 text-[#03002C]",
    group: "Slides",
    accent: "#8A5CF6",
    blurb: "Single saved slides",
  },
  surface: {
    label: "Social / Email",
    icon: Share2,
    tint: "bg-[#FFEB66]/40 text-[#03002C]",
    group: "Surfaces",
    accent: "#E39A00",
    blurb: "Social & email surfaces",
  },
};


type SortKey = "recent" | "created" | "title";

function MyFilesPage() {
  const listFn = useServerFn(listMyFiles);
  const delFn = useServerFn(deleteMyFile);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-files"],
    queryFn: () => listFn(),
  });
  const rows = (data ?? []) as MyFile[];

  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | MyFileKind>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    rows.forEach((r) => {
      c[r.kind] = (c[r.kind] ?? 0) + 1;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (kind !== "all" && r.kind !== kind) return false;
      if (!needle) return true;
      return (
        r.title.toLowerCase().includes(needle) ||
        (r.subtitle ?? "").toLowerCase().includes(needle) ||
        (r.status ?? "").toLowerCase().includes(needle)
      );
    });
    return [...out].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "created") return a.createdAt < b.createdAt ? 1 : -1;
      return a.updatedAt < b.updatedAt ? 1 : -1;
    });
  }, [rows, q, kind, sort]);

  const delMutation = useMutation({
    mutationFn: (f: MyFile) => delFn({ data: { kind: f.kind, id: f.id } }),
    onSuccess: (_r, f) => {
      toast.success(`“${f.title}” deleted`);
      queryClient.invalidateQueries({ queryKey: ["my-files"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div>
        {/* ============ HERO ============ */}
        <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white px-7 py-9 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:px-10 sm:py-12">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full opacity-25 blur-3xl"
            style={{ backgroundColor: "#003FC7" }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full opacity-20 blur-3xl"
            style={{ backgroundColor: "#C2A3FF" }}
          />
          {/* Element brick rail */}
          <span aria-hidden className="pointer-events-none absolute left-0 top-0 flex h-full w-2 flex-col">
            {["#003FC7", "#A1FBF9", "#03002C", "#FF9B70", "#C2A3FF"].map((c) => (
              <span key={c} className="flex-1" style={{ backgroundColor: c }} />
            ))}
          </span>

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#003FC7]/25 bg-[#003FC7]/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#003FC7]">
              My files
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Everything you’ve made.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-black/60 dark:text-white/60">
              Decks, individual saved slides, print assets, saved modules, and social surfaces —
              saved automatically as you work. Search, reopen, or clear out what you no longer need.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-6">
              <HeroStat value={rows.length} label="Saved items" />
              <HeroStat value={counts.deck ?? 0} label="Presentations" accent="#003FC7" />
              <HeroStat value={counts.print ?? 0} label="Print assets" accent="#EC388A" />
              <HeroStat value={counts.slide ?? 0} label="Slides" accent="#8A5CF6" />
            </div>
          </div>
        </section>

        {/* ============ ELEMENT SELECTOR ============ */}
        <div className="mt-8 text-[10px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
          Browse by element
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {(["all", "deck", "slide", "print", "module", "surface"] as const).map((k) => {
            const active = kind === k;
            const meta = k === "all" ? null : KIND_META[k];
            const accent = meta?.accent ?? "#03002C";
            const Icon = meta?.icon ?? FolderOpen;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={active}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                  active
                    ? "border-transparent shadow-md"
                    : "border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.04]"
                }`}
                style={active ? { backgroundColor: `${accent}12`, borderColor: `${accent}80` } : undefined}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-0 h-full w-1"
                  style={{ backgroundColor: accent, opacity: active ? 1 : 0.35 }}
                />
                <span
                  className="inline-flex size-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${accent}1f`, color: accent }}
                >
                  <Icon size={16} />
                </span>
                <div className="mt-3 text-sm font-semibold tracking-[-0.01em]">
                  {k === "all" ? "All files" : meta!.group}
                </div>
                <div className="mt-0.5 text-[11px] text-black/50 dark:text-white/50">
                  {k === "all" ? "Everything saved" : meta!.blurb}
                </div>
                <div
                  className="mt-3 text-2xl font-semibold tabular-nums tracking-[-0.03em]"
                  style={{ color: accent }}
                >
                  {counts[k] ?? 0}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-3 text-foreground/40"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search your files…"
              aria-label="Search your files"
              className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 pl-8 text-sm shadow-sm focus:border-[#003FC7] focus:outline-none focus:ring-2 focus:ring-[#003FC7]/20 dark:border-white/15 dark:bg-white/[0.04]"
            />
          </div>
          <select
            aria-label="Sort files"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm dark:border-white/15 dark:bg-white/[0.04]"
          >
            <option value="recent">Recently edited</option>
            <option value="created">Recently created</option>
            <option value="title">Title A–Z</option>
          </select>
          <span className="ml-auto text-xs text-black/50 dark:text-white/50">
            {filtered.length} of {rows.length}
          </span>
        </div>


        <div className="mt-6">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-black/60">
              <Loader2 size={14} className="animate-spin" /> Loading your files…
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {(error as Error).message}
            </div>
          )}
          {!isLoading && !error && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-16 text-center dark:border-white/15 dark:bg-white/[0.03]">
              <FolderOpen size={24} className="mx-auto text-foreground/30" />
              <div className="mt-3 text-sm font-medium text-black/70 dark:text-white/70">
                {rows.length === 0 ? "Nothing saved yet." : "No files match your filters."}
              </div>
              <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                Start a{" "}
                <Link to="/brief/new" className="underline">
                  new brief
                </Link>
                , build a deck in the{" "}
                <Link to="/library" className="underline">
                  Presentation library
                </Link>
                , or create a{" "}
                <Link to="/library/print" className="underline">
                  print asset
                </Link>
                .
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((f) => (
              <FileCard
                key={`${f.kind}:${f.id}`}
                file={f}
                onDelete={() => {
                  if (window.confirm(`Delete “${f.title}”? This can’t be undone.`))
                    delMutation.mutate(f);
                }}
                deleting={delMutation.isPending && delMutation.variables?.id === f.id}
              />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function FileCard({
  file,
  onDelete,
  deleting,
}: {
  file: MyFile;
  onDelete: () => void;
  deleting: boolean;
}) {
  const meta = KIND_META[file.kind];
  const Icon = meta.icon;
  return (
    <div className="group relative flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition hover:border-[#003FC7]/40 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${meta.tint}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <Link
          to={file.href}
          className="block truncate text-sm font-semibold hover:text-[#003FC7]"
          title={file.title}
        >
          {file.title}
        </Link>
        <div className="mt-0.5 truncate text-[11px] text-black/55 dark:text-white/55">
          {meta.label}
          {file.subtitle ? ` · ${file.subtitle}` : ""}
          {file.fileName ? ` · .pptx${file.fileSize ? ` (${formatBytes(file.fileSize)})` : ""}` : ""}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">
          <span>Edited {formatWhen(file.updatedAt)}</span>
          {file.status && (
            <span className="rounded-full bg-black/5 px-2 py-0.5 tracking-normal dark:bg-white/10">
              {file.status}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {file.fileName && <DownloadFileButton file={file} />}
        <Link
          to={file.href}
          aria-label={`Open ${file.title}`}
          className="rounded-lg p-1.5 text-black/40 transition hover:bg-[#003FC7]/10 hover:text-[#003FC7]"
        >
          <ArrowUpRight size={14} />
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`Delete ${file.title}`}
          className="rounded-lg p-1.5 text-black/30 transition hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  );
}

function formatWhen(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Fetches a short-lived signed URL and downloads the attached .pptx. */
function DownloadFileButton({ file }: { file: MyFile }) {
  const urlFn = useServerFn(getSlideFileUrl);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      aria-label={`Download ${file.title} as PowerPoint`}
      title="Download .pptx"
      onClick={async () => {
        setBusy(true);
        try {
          const res = await urlFn({ data: { moduleId: file.id } });
          if (!res?.url) {
            toast.error("No PowerPoint file attached to this item yet.");
            return;
          }
          const a = document.createElement("a");
          a.href = res.url;
          a.download = res.fileName ?? `${file.title}.pptx`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        } catch (err) {
          toast.error((err as Error)?.message ?? "Download failed.");
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-lg p-1.5 text-black/40 transition hover:bg-[#003FC7]/10 hover:text-[#003FC7] disabled:opacity-50"
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
    </button>
  );
}
