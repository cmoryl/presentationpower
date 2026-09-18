// /events/next/guide — the delegate guide builder, one guide per event location.
//
// Every page of the printed handout is editable here: the cover, the welcome
// letter, practical information, the schedule, the keynote, the what's-on and
// programme lists, the floor directory and the app links. The same content
// drives the press PDF, the Word file and the PowerPoint deck, and each save
// keeps a numbered snapshot so an earlier state can be brought back.

import { toast } from "sonner";
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileDown,
  FileText,
  History,
  Plus,
  Presentation,
  Save,
  Trash2,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { GuidePage } from "@/components/events/GuidePage";
import { Button, Input, Textarea } from "@/design-system/element";
import { runWithExportFeedback } from "@/lib/export-feedback";
import { NEXT_EVENT } from "@/lib/next-event";
import {
  GUIDE_BLOCK_LABELS,
  GUIDE_SIZES,
  guideDefault,
  guideNewBlock,
  guidePagePlan,
  guideSize,
  guideSlug,
  londonGuideConfig,
  type GuideBlock,
  type GuideBlockKind,
  type GuideConfig,
  type GuideSizeId,
} from "@/lib/next-guide";
import { buildGuideDocx } from "@/lib/next-guide-docx";
import { buildGuidePdf } from "@/lib/next-guide-pdf";
import { buildGuidePptx } from "@/lib/next-guide-pptx";
import {
  deleteEventGuide,
  listEventGuideVersions,
  listEventGuides,
  saveEventGuide,
  updateEventGuide,
} from "@/lib/next-guide.functions";

export const Route = createFileRoute("/events/next_/guide")({
  component: GuideStudio,
  head: () => ({
    meta: [
      { title: "NEXT delegate guide builder | TransPerfect Element" },
      {
        name: "description",
        content:
          "Build the printed NEXT delegate guide for any event location: cover, welcome, practical information, schedule, keynote, exhibits and floor directory, exported as a press PDF, Word file or PowerPoint deck.",
      },
      { property: "og:title", content: "NEXT delegate guide builder" },
      {
        property: "og:description",
        content:
          "One editable guide per event city, with saved versions and press, Word and PowerPoint outputs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const YEAR = Number(NEXT_EVENT.startDate.slice(0, 4));

/** Cities in the NEXT series a guide can be started for. */
const CITY_SEEDS: { city: string; venue: string; dates: string }[] = [
  { city: "London", venue: "QEII Centre", dates: NEXT_EVENT.datesLabel },
  { city: "New York", venue: "", dates: "" },
  { city: "Singapore", venue: "", dates: "" },
  { city: "Tokyo", venue: "", dates: "" },
];

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

function Field({
  label,
  value,
  onChange,
  long,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  long?: boolean;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-muted-foreground">{label}</span>
      {long ? (
        <Textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function BlockEditor({
  block,
  onChange,
}: {
  block: GuideBlock;
  onChange: (next: GuideBlock) => void;
}) {
  const set = (patch: Partial<GuideBlock>) => onChange({ ...block, ...patch } as GuideBlock);

  switch (block.kind) {
    case "cover":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Dates line" value={block.eyebrow} onChange={(v) => set({ eyebrow: v })} />
          <Field label="Title" value={block.title} onChange={(v) => set({ title: v })} />
          <Field label="Theme" value={block.theme} onChange={(v) => set({ theme: v })} />
          <Field label="Strapline" value={block.strapline} onChange={(v) => set({ strapline: v })} />
          <Field label="Footnote" value={block.footnote} onChange={(v) => set({ footnote: v })} />
        </div>
      );
    case "welcome":
      return (
        <div className="grid gap-3">
          <Field label="Title" value={block.title} onChange={(v) => set({ title: v })} />
          <Field label="Letter" value={block.body} onChange={(v) => set({ body: v })} long />
          <Field label="Signed by" value={block.byline} onChange={(v) => set({ byline: v })} />
          <Field label="Highlighted note" value={block.note} onChange={(v) => set({ note: v })} long />
        </div>
      );
    case "keynote":
      return (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Eyebrow" value={block.eyebrow} onChange={(v) => set({ eyebrow: v })} />
            <Field label="Speaker" value={block.name} onChange={(v) => set({ name: v })} />
            <Field label="Talk title" value={block.talkTitle} onChange={(v) => set({ talkTitle: v })} />
            <Field label="When and where" value={block.when} onChange={(v) => set({ when: v })} />
          </div>
          <Field label="Description" value={block.body} onChange={(v) => set({ body: v })} long />
        </div>
      );
    case "info":
    case "list":
      return (
        <div className="grid gap-3">
          <Field label="Title" value={block.title} onChange={(v) => set({ title: v })} />
          <Field
            label="Standfirst"
            value={block.standfirst}
            onChange={(v) => set({ standfirst: v })}
            long
          />
          {block.items.map((it, i) => (
            <div key={it.id} className="rounded-md border border-border/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Entry {i + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    set({ items: block.items.filter((x) => x.id !== it.id) } as Partial<GuideBlock>)
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <div className="grid gap-2">
                <Field
                  label="Heading"
                  value={it.label}
                  onChange={(v) =>
                    set({
                      items: block.items.map((x) => (x.id === it.id ? { ...x, label: v } : x)),
                    } as Partial<GuideBlock>)
                  }
                />
                <Field
                  label="Copy"
                  value={it.body}
                  long
                  onChange={(v) =>
                    set({
                      items: block.items.map((x) => (x.id === it.id ? { ...x, body: v } : x)),
                    } as Partial<GuideBlock>)
                  }
                />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              set({
                items: [...block.items, { id: rid("i"), label: "", body: "" }],
              } as Partial<GuideBlock>)
            }
          >
            <Plus className="mr-1 size-3.5" /> Add an entry
          </Button>
        </div>
      );
    case "schedule":
      return (
        <div className="grid gap-3">
          <Field label="Title" value={block.title} onChange={(v) => set({ title: v })} />
          <Field label="Standfirst" value={block.standfirst} onChange={(v) => set({ standfirst: v })} />
          {block.days.map((day) => (
            <div key={day.id} className="rounded-md border border-border/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Input
                  value={day.name}
                  onChange={(e) =>
                    set({
                      days: block.days.map((d) =>
                        d.id === day.id ? { ...d, name: e.target.value } : d,
                      ),
                    } as Partial<GuideBlock>)
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    set({ days: block.days.filter((d) => d.id !== day.id) } as Partial<GuideBlock>)
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              {day.rows.map((r) => (
                <div key={r.id} className="mb-2 flex items-center gap-2">
                  <Input
                    className="w-28"
                    value={r.time}
                    onChange={(e) =>
                      set({
                        days: block.days.map((d) =>
                          d.id === day.id
                            ? {
                                ...d,
                                rows: d.rows.map((x) =>
                                  x.id === r.id ? { ...x, time: e.target.value } : x,
                                ),
                              }
                            : d,
                        ),
                      } as Partial<GuideBlock>)
                    }
                  />
                  <Input
                    value={r.item}
                    onChange={(e) =>
                      set({
                        days: block.days.map((d) =>
                          d.id === day.id
                            ? {
                                ...d,
                                rows: d.rows.map((x) =>
                                  x.id === r.id ? { ...x, item: e.target.value } : x,
                                ),
                              }
                            : d,
                        ),
                      } as Partial<GuideBlock>)
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      set({
                        days: block.days.map((d) =>
                          d.id === day.id ? { ...d, rows: d.rows.filter((x) => x.id !== r.id) } : d,
                        ),
                      } as Partial<GuideBlock>)
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  set({
                    days: block.days.map((d) =>
                      d.id === day.id
                        ? { ...d, rows: [...d.rows, { id: rid("r"), time: "", item: "" }] }
                        : d,
                    ),
                  } as Partial<GuideBlock>)
                }
              >
                <Plus className="mr-1 size-3.5" /> Add a time
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              set({
                days: [...block.days, { id: rid("d"), name: "New day", rows: [] }],
              } as Partial<GuideBlock>)
            }
          >
            <Plus className="mr-1 size-3.5" /> Add a day
          </Button>
        </div>
      );
    case "floors":
      return (
        <div className="grid gap-3">
          <Field label="Title" value={block.title} onChange={(v) => set({ title: v })} />
          <Field label="Standfirst" value={block.standfirst} onChange={(v) => set({ standfirst: v })} />
          {block.floors.map((floor) => (
            <div key={floor.id} className="rounded-md border border-border/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Floor</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    set({
                      floors: block.floors.filter((f) => f.id !== floor.id),
                    } as Partial<GuideBlock>)
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field
                  label="Floor name"
                  value={floor.name}
                  onChange={(v) =>
                    set({
                      floors: block.floors.map((f) => (f.id === floor.id ? { ...f, name: v } : f)),
                    } as Partial<GuideBlock>)
                  }
                />
                <Field
                  label="Rooms"
                  value={floor.room}
                  onChange={(v) =>
                    set({
                      floors: block.floors.map((f) => (f.id === floor.id ? { ...f, room: v } : f)),
                    } as Partial<GuideBlock>)
                  }
                />
              </div>
              <Field
                label="What's there (one per line)"
                value={floor.lines.join("\n")}
                long
                onChange={(v) =>
                  set({
                    floors: block.floors.map((f) =>
                      f.id === floor.id
                        ? { ...f, lines: v.split("\n").map((l) => l.trim()).filter(Boolean) }
                        : f,
                    ),
                  } as Partial<GuideBlock>)
                }
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              set({
                floors: [...block.floors, { id: rid("f"), name: "", room: "", lines: [] }],
              } as Partial<GuideBlock>)
            }
          >
            <Plus className="mr-1 size-3.5" /> Add a floor
          </Button>
        </div>
      );
    case "links":
      return (
        <div className="grid gap-3">
          <Field label="Title" value={block.title} onChange={(v) => set({ title: v })} />
          <Field label="Standfirst" value={block.standfirst} onChange={(v) => set({ standfirst: v })} long />
          {block.links.map((link) => (
            <div key={link.id} className="flex items-end gap-2">
              <div className="flex-1">
                <Field
                  label="Label"
                  value={link.label}
                  onChange={(v) =>
                    set({
                      links: block.links.map((x) => (x.id === link.id ? { ...x, label: v } : x)),
                    } as Partial<GuideBlock>)
                  }
                />
              </div>
              <div className="flex-[2]">
                <Field
                  label="Address"
                  value={link.url}
                  onChange={(v) =>
                    set({
                      links: block.links.map((x) => (x.id === link.id ? { ...x, url: v } : x)),
                    } as Partial<GuideBlock>)
                  }
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  set({ links: block.links.filter((x) => x.id !== link.id) } as Partial<GuideBlock>)
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              set({
                links: [...block.links, { id: rid("l"), label: "", url: "" }],
              } as Partial<GuideBlock>)
            }
          >
            <Plus className="mr-1 size-3.5" /> Add a link
          </Button>
        </div>
      );
  }
}

function GuideStudio() {
  const qc = useQueryClient();
  const list = useServerFn(listEventGuides);
  const create = useServerFn(saveEventGuide);
  const patch = useServerFn(updateEventGuide);
  const remove = useServerFn(deleteEventGuide);
  const versions = useServerFn(listEventGuideVersions);

  const [config, setConfig] = useState<GuideConfig>(() => londonGuideConfig());
  const [name, setName] = useState("NEXT London 2026 — your guide");
  const [notes, setNotes] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>("cover");
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const saved = useQuery({ queryKey: ["event-guides"], queryFn: () => list() });
  const history = useQuery({
    queryKey: ["event-guide-versions", savedId],
    queryFn: () => versions({ data: { guideId: savedId! } }),
    enabled: Boolean(savedId) && showHistory,
  });

  const size = guideSize(config.sizeId);
  const plan = useMemo(() => guidePagePlan(config), [config]);

  const setBlock = (next: GuideBlock) =>
    setConfig((c) => ({ ...c, blocks: c.blocks.map((b) => (b.id === next.id ? next : b)) }));
  const move = (id: string, dir: -1 | 1) =>
    setConfig((c) => {
      const i = c.blocks.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= c.blocks.length) return c;
      const blocks = [...c.blocks];
      const a = blocks[i]!;
      blocks[i] = blocks[j]!;
      blocks[j] = a;
      return { ...c, blocks };
    });

  async function exportPdf() {
    setBusy(true);
    await runWithExportFeedback(
      {
        pending: "Writing the press PDF…",
        // Overflow is reported honestly rather than silently trimmed.
        success: "Press PDF written",
        failure: "PDF export failed",
      },
      async () => {
        const built = await buildGuidePdf(config);
        // Press faults are surfaced, never swallowed.
        const faults = built.notes.filter((n) => n !== GUIDE_ARTWORK_NOTE);
        if (faults.length) toast.warning(faults.join(" "));
        download(
          new Blob([built.bytes as unknown as BlobPart], { type: "application/pdf" }),
          `${guideSlug(config)}.pdf`,
        );
        return built;
      },
    ).catch(() => {})
      .finally(() => setBusy(false));
  }

  async function exportDocx() {
    setBusy(true);
    await runWithExportFeedback(
      { pending: "Writing the Word file…", success: "Word file written.", failure: "Word export failed" },
      async () => {
        const bytes = await buildGuideDocx(config);
        download(
          new Blob([bytes as unknown as BlobPart], {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          }),
          `${guideSlug(config)}.docx`,
        );
      },
    ).catch(() => {})
      .finally(() => setBusy(false));
  }

  async function exportPptx() {
    setBusy(true);
    await runWithExportFeedback(
      {
        pending: "Writing the PowerPoint deck…",
        success: "PowerPoint deck written — open it in PowerPoint to confirm before sharing.",
        failure: "PowerPoint export failed",
      },
      async () => {
        const bytes = await buildGuidePptx(config);
        download(
          new Blob([bytes as unknown as BlobPart], {
            type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          }),
          `${guideSlug(config)}.pptx`,
        );
      },
    ).catch(() => {})
      .finally(() => setBusy(false));
  }

  async function save() {
    setBusy(true);
    await runWithExportFeedback(
      { pending: "Saving…", success: "Guide saved.", failure: "Could not save the guide" },
      async () => {
        if (savedId) {
          await patch({ data: { id: savedId, name, notes, city: config.location.city, config } });
        } else {
          const row = await create({
            data: { name, notes, city: config.location.city, year: YEAR, config },
          });
          setSavedId(row.id);
        }
        await qc.invalidateQueries({ queryKey: ["event-guides"] });
        await qc.invalidateQueries({ queryKey: ["event-guide-versions"] });
      },
    ).catch(() => {})
      .finally(() => setBusy(false));
  }


  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/events/next" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowLeft className="size-3.5" /> NEXT
            </Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Delegate guide builder</h1>
            <p className="text-sm text-muted-foreground">
              One guide per event location — {plan.length} pages at {size.name}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={save} disabled={busy}>
              <Save className="mr-1 size-4" /> {savedId ? "Save a new version" : "Save"}
            </Button>
            <Button variant="outline" onClick={exportDocx} disabled={busy}>
              <FileText className="mr-1 size-4" /> Word
            </Button>
            <Button variant="outline" onClick={exportPptx} disabled={busy}>
              <Presentation className="mr-1 size-4" /> PowerPoint
            </Button>
            <Button onClick={exportPdf} disabled={busy}>
              <FileDown className="mr-1 size-4" /> Press PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Editor */}
          <div className="space-y-4">
            <section className="rounded-lg border border-border/60 p-4">
              <h2 className="mb-3 text-sm font-semibold">This location</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Guide name" value={name} onChange={setName} />
                <label className="block text-xs">
                  <span className="mb-1 block font-medium text-muted-foreground">Page size</span>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={config.sizeId}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, sizeId: e.target.value as GuideSizeId }))
                    }
                  >
                    {GUIDE_SIZES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                {(
                  [
                    ["city", "City"],
                    ["venue", "Venue"],
                    ["address", "Address"],
                    ["dates", "Dates"],
                    ["wifi", "Event Wi-Fi"],
                    ["supportEmail", "Support email"],
                    ["siteUrl", "Event site"],
                  ] as const
                ).map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    value={config.location[key]}
                    onChange={(v) =>
                      setConfig((c) => ({ ...c, location: { ...c.location, [key]: v } }))
                    }
                  />
                ))}
              </div>
              <div className="mt-3">
                <Field label="Internal notes" value={notes} onChange={setNotes} long />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfig(londonGuideConfig())}>
                  Start from London 2026
                </Button>
                {CITY_SEEDS.filter((c) => c.city !== "London").map((seed) => (
                  <Button
                    key={seed.city}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setConfig(guideDefault({ city: seed.city, venue: seed.venue, dates: seed.dates }));
                      setName(`NEXT ${seed.city} ${YEAR} — your guide`);
                      setSavedId(null);
                    }}
                  >
                    Blank {seed.city}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const carried = londonGuideConfig();
                    setConfig({
                      ...carried,
                      location: { ...carried.location, city: "", venue: "", address: "", dates: "" },
                    });
                    setSavedId(null);
                  }}
                >
                  Carry London's content to a new city
                </Button>
              </div>
            </section>

            <section className="space-y-3">
              {config.blocks.map((block, i) => (
                <div key={block.id} className="rounded-lg border border-border/60">
                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <button
                      className="flex-1 text-left"
                      onClick={() => setOpen(open === block.id ? null : block.id)}
                    >
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Page {i + 1} · {GUIDE_BLOCK_LABELS[block.kind]}
                      </span>
                      <p className="text-sm font-medium">{plan[i]?.label}</p>
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => move(block.id, -1)}>
                      <ChevronUp className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => move(block.id, 1)}>
                      <ChevronDown className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setConfig((c) => ({ ...c, blocks: c.blocks.filter((b) => b.id !== block.id) }))
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  {open === block.id ? (
                    <div className="border-t border-border/60 p-4">
                      <BlockEditor block={block} onChange={setBlock} />
                    </div>
                  ) : null}
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                {(Object.keys(GUIDE_BLOCK_LABELS) as GuideBlockKind[])
                  .filter((k) => k !== "cover")
                  .map((kind) => (
                    <Button
                      key={kind}
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setConfig((c) => {
                          const block = guideNewBlock(kind);
                          setOpen(block.id);
                          return { ...c, blocks: [...c.blocks, block] };
                        })
                      }
                    >
                      <Plus className="mr-1 size-3.5" /> {GUIDE_BLOCK_LABELS[kind]}
                    </Button>
                  ))}
              </div>
            </section>
          </div>

          {/* Proof and saved guides */}
          <div className="space-y-4">
            <section className="space-y-3 rounded-lg border border-border/60 p-4">
              <h2 className="text-sm font-semibold">Page proof</h2>
              <p className="text-xs text-muted-foreground">
                A screen proof at trim — the printed pages are live vector type.
              </p>
              {config.blocks.map((block, i) => (
                <GuidePage
                  key={block.id}
                  block={block}
                  config={config}
                  trim={{ w: size.trimW, h: size.trimH }}
                  pageNo={i + 1}
                />
              ))}
            </section>

            <section className="rounded-lg border border-border/60 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Saved guides</h2>
                {savedId ? (
                  <Button variant="ghost" size="sm" onClick={() => setShowHistory((v) => !v)}>
                    <History className="mr-1 size-3.5" /> History
                  </Button>
                ) : null}
              </div>
              <ul className="space-y-2 text-sm">
                {(saved.data ?? []).map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-2">
                    <button
                      className="flex-1 text-left hover:underline"
                      onClick={() => {
                        setConfig(row.config as unknown as GuideConfig);
                        setName(row.name);
                        setNotes(row.notes ?? "");
                        setSavedId(row.id);
                      }}
                    >
                      {row.name}
                      <span className="ml-2 text-xs text-muted-foreground">{row.city}</span>
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await runWithExportFeedback(
                          {
                            pending: "Removing…",
                            success: "Guide removed.",
                            failure: "Could not remove this guide",
                          },
                          async () => {
                            await remove({ data: { id: row.id } });
                            if (savedId === row.id) setSavedId(null);
                            await qc.invalidateQueries({ queryKey: ["event-guides"] });
                          },
                        );

                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
                {!saved.data?.length ? (
                  <li className="text-xs text-muted-foreground">Nothing saved yet.</li>
                ) : null}
              </ul>

              {showHistory && savedId ? (
                <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Versions
                  </h3>
                  {(history.data ?? []).map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        v{v.rev}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {new Date(v.created_at).toLocaleString()}
                        </span>
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfig(v.config as unknown as GuideConfig)}
                      >
                        Bring back
                      </Button>
                    </div>
                  ))}
                  {!history.data?.length ? (
                    <p className="text-xs text-muted-foreground">No versions yet.</p>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
