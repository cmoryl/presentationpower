import { AdminLoading } from "@/components/admin/AdminPage";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";
import { BRAND_MODES } from "@/lib/taxonomy";
import {
  createClientLogo,
  deleteClientLogo,
  listClientLogos,
  updateClientLogo,
} from "@/lib/client-logos.functions";

export const Route = createFileRoute("/admin/logohub")({
  component: LogoHubAdmin,
});

type Variant = "primaryPath" | "darkPath" | "lightPath" | "monoPath";

const VARIANTS: Array<{ key: Variant; label: string; required: boolean }> = [
  { key: "primaryPath", label: "Primary", required: true },
  { key: "darkPath", label: "On dark", required: false },
  { key: "lightPath", label: "On light", required: false },
  { key: "monoPath", label: "Mono", required: false },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function LogoHubAdmin() {
  const listFn = useServerFn(listClientLogos);
  const createFn = useServerFn(createClientLogo);
  const updateFn = useServerFn(updateClientLogo);
  const deleteFn = useServerFn(deleteClientLogo);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "logohub"],
    queryFn: () => listFn().catch(() => []),
    retry: false,
  });

  const [clientName, setClientName] = useState("");
  const [slug, setSlug] = useState("");
  const [industry, setIndustry] = useState("");
  const [division, setDivision] = useState("master");
  const [website, setWebsite] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [files, setFiles] = useState<Partial<Record<Variant, File | null>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "logohub"] }),
  });

  const editTags = useMutation({
    mutationFn: (args: { id: string; tags: string[] }) => updateFn({ data: args }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "logohub"] }),
  });

  const filtered = useMemo(() => {
    const rows = q.data ?? [];
    if (!search.trim()) return rows;
    const s = search.trim().toLowerCase();
    return rows.filter(
      (r: any) =>
        r.client_name.toLowerCase().includes(s) ||
        r.slug.toLowerCase().includes(s) ||
        (r.industry ?? "").toLowerCase().includes(s) ||
        (r.tags ?? []).some((t: string) => t.toLowerCase().includes(s)),
    );
  }, [q.data, search]);

  async function handleSubmit() {
    const primary = files.primaryPath ?? null;
    if (!clientName.trim() || !slug.trim() || !primary) {
      setStatus("Client name, slug, and a primary logo file are required.");
      return;
    }
    setBusy("uploading");
    setStatus(null);
    try {
      const finalSlug = slug.trim();
      const paths: Partial<Record<Variant, string>> = {};
      let primaryFilename = primary.name;
      let primaryMime = primary.type || "image/png";
      let primarySize = primary.size;

      for (const v of VARIANTS) {
        const f = files[v.key];
        if (!f) continue;
        const cleanName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${finalSlug}/${v.key.replace("Path", "")}-${Date.now()}-${cleanName}`;
        const { error } = await supabase.storage.from("client-logos").upload(path, f, {
          cacheControl: "3600",
          upsert: false,
          contentType: f.type || "image/png",
        });
        if (error) throw error;
        paths[v.key] = path;
        if (v.key === "primaryPath") {
          primaryFilename = f.name;
          primaryMime = f.type || "image/png";
          primarySize = f.size;
        }
      }

      await createFn({
        data: {
          clientName: clientName.trim(),
          slug: finalSlug,
          industry: industry.trim() || null,
          divisionId: division === "master" ? null : division,
          notes: notes.trim() || null,
          website: website.trim() || null,
          source: source.trim() || null,
          primaryPath: paths.primaryPath!,
          darkPath: paths.darkPath ?? null,
          lightPath: paths.lightPath ?? null,
          monoPath: paths.monoPath ?? null,
          sourceFilename: primaryFilename,
          mimeType: primaryMime,
          fileSize: primarySize,
          tags: tagsStr
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
      });
      setStatus(`Added ${clientName.trim()}.`);
      setClientName("");
      setSlug("");
      setIndustry("");
      setWebsite("");
      setSource("");
      setNotes("");
      setTagsStr("");
      setFiles({});
      qc.invalidateQueries({ queryKey: ["admin", "logohub"] });
    } catch (e) {
      setStatus(`Add failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  if (q.error && isForbidden(q.error)) return <AdminForbidden />;

  const totalRows = (q.data ?? []).length;

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">LogoHub</h2>
            <p className="mt-1 text-sm text-black/60">
              Client logo repository. Upload primary, dark, light and mono variants per client for
              reuse across decks, case studies and briefs.
            </p>
          </div>
          <Link
            to="/logohub"
            className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium hover:border-[#003FC7]/40 hover:text-[#003FC7]"
          >
            Browse public LogoHub →
          </Link>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-black/60">
          Add a client
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-xs text-black/70">
            <div className="mb-1 font-medium">Client name</div>
            <input
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value);
                if (!slug || slug === slugify(clientName)) setSlug(slugify(e.target.value));
              }}
              placeholder="e.g. Novartis"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-black/70">
            <div className="mb-1 font-medium">Slug</div>
            <input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="novartis"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-mono"
            />
          </label>
          <label className="text-xs text-black/70">
            <div className="mb-1 font-medium">Industry</div>
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Life Sciences"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-black/70">
            <div className="mb-1 font-medium">Division owner</div>
            <select
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            >
              <option value="master">TransPerfect (master)</option>
              {BRAND_MODES.filter((b) => b.id !== "master").map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-black/70">
            <div className="mb-1 font-medium">Website</div>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.novartis.com"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-black/70">
            <div className="mb-1 font-medium">Source</div>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="brand-guidelines.pdf, direct from client, etc."
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-black/70 md:col-span-3">
            <div className="mb-1 font-medium">Notes</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Usage restrictions, minimum size, clearspace, colour rules…"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-black/70 md:col-span-3">
            <div className="mb-1 font-medium">Tags (comma-separated)</div>
            <input
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="pharma, top-100, case-study"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {VARIANTS.map((v) => (
            <label key={v.key} className="text-xs text-black/70">
              <div className="mb-1 font-medium">
                {v.label}
                {v.required && <span className="ml-1 text-red-600">*</span>}
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp,image/avif"
                onChange={(e) =>
                  setFiles((prev) => ({ ...prev, [v.key]: e.target.files?.[0] ?? null }))
                }
                className="w-full text-xs"
              />
              {files[v.key] && (
                <div className="mt-1 truncate text-[11px] text-black/50">{files[v.key]!.name}</div>
              )}
            </label>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => void handleSubmit()}
            disabled={busy !== null}
            className="rounded-full bg-[#003FC7] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Add client logo"}
          </button>
          {status && <span className="text-xs text-black/60">{status}</span>}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-black/60">
            Repository <span className="ml-2 text-black/40">({totalRows})</span>
          </h3>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client, tag or industry…"
            className="w-64 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm"
          />
        </div>

        {q.isLoading ? (
          <div className="mt-6">
            <AdminLoading />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-black/15 bg-black/[0.02] p-8 text-center text-sm text-black/50">
            {totalRows === 0 ? "No logos yet. Add your first client above." : "No matches."}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r: any) => (
              <AdminLogoCard
                key={r.id}
                row={r}
                onEditTags={() => {
                  const t = prompt("Tags (comma-separated)", (r.tags ?? []).join(", "));
                  if (t === null) return;
                  editTags.mutate({
                    id: r.id,
                    tags: t
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  });
                }}
                onDelete={() => {
                  if (confirm(`Delete ${r.client_name}?`)) del.mutate(r.id);
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const ADMIN_VARIANTS = [
  { key: "primary", label: "Primary", urlField: "primaryUrl" },
  { key: "light", label: "Light", urlField: "lightUrl" },
  { key: "dark", label: "Dark", urlField: "darkUrl" },
  { key: "mono", label: "Mono", urlField: "monoUrl" },
] as const;

function AdminLogoCard({
  row,
  onEditTags,
  onDelete,
}: {
  row: any;
  onEditTags: () => void;
  onDelete: () => void;
}) {
  const available = ADMIN_VARIANTS.filter(
    (v) => typeof row[v.urlField] === "string" && row[v.urlField].length > 0,
  );
  const initial = available[0]?.key ?? "primary";
  const [active, setActive] = useState<string>(initial);
  const activeUrl = row[ADMIN_VARIANTS.find((v) => v.key === active)?.urlField ?? "primaryUrl"];
  const isDark = active === "dark";

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div
        className="flex h-24 w-full items-center justify-center rounded-lg transition-colors"
        style={{ backgroundColor: isDark ? "#03002C" : "#F5F7FB" }}
      >
        {activeUrl ? (
          <img
            src={activeUrl}
            alt={`${row.client_name} logo (${active})`}
            className="max-h-20 max-w-[80%] object-contain"
          />
        ) : (
          <span className="text-xs text-black/40">preview unavailable</span>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{row.client_name}</div>
          <div className="mt-0.5 text-[11px] text-black/50">
            {row.industry ?? "—"}
            {row.division_id &&
              ` · ${BRAND_MODES.find((b) => b.id === row.division_id)?.name ?? row.division_id}`}
          </div>
        </div>
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-mono uppercase text-black/60">
          {row.slug}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {ADMIN_VARIANTS.map((v) => {
          const url = row[v.urlField];
          const has = typeof url === "string" && url.length > 0;
          const isActive = v.key === active;
          return (
            <button
              key={v.key}
              type="button"
              disabled={!has}
              onClick={() => setActive(v.key)}
              className={
                "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest transition " +
                (isActive
                  ? "border-[#003FC7] bg-[#003FC7] text-white"
                  : has
                    ? "border-black/10 text-black/60 hover:border-[#003FC7]/40 hover:text-[#003FC7]"
                    : "cursor-not-allowed border-black/5 text-black/25")
              }
              title={has ? `Preview ${v.label} variant` : `No ${v.label} variant uploaded`}
            >
              {v.label}
            </button>
          );
        })}
      </div>
      {row.tags?.length ? (
        <div className="mt-2 text-[11px] text-black/50">{row.tags.join(" · ")}</div>
      ) : null}
      <div className="mt-3 flex gap-2">
        <a
          href={activeUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-black/10 px-2.5 py-1 text-[11px] hover:border-black/30"
        >
          Open {active}
        </a>
        <button
          onClick={onEditTags}
          className="rounded-lg border border-black/10 px-2.5 py-1 text-[11px] hover:border-black/30"
        >
          Edit tags
        </button>
        <button
          onClick={onDelete}
          className="ml-auto rounded-lg border border-red-200 px-2.5 py-1 text-[11px] text-red-700 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
