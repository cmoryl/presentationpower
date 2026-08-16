/**
 * ALTERNATE LOOKS — the guided intake wizard.
 *
 * A side rail lists every look in progress; the panel walks one look through
 * five gates, each of which needs a recorded admin approval before the next
 * unlocks:
 *
 *   assets → derive → review → tests → published
 *
 * The wizard never invents its own rules: the upload slots, the checklist, the
 * derived palette and the gate blockers all come from `template-intake.ts`, and
 * the server re-runs the same check when an approval is recorded. What you see
 * here is exactly what the server will allow.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  approveIntakeStage,
  createIntake,
  deleteIntake,
  deleteIntakeAsset,
  listIntakes,
  requestIntakeChanges,
  updateIntake,
  uploadIntakeAsset,
} from "@/lib/template-intake.functions";
import {
  approvalFor,
  assetFor,
  canAdvance,
  checklistSummary,
  deriveTemplateFromIntake,
  evaluateChecklist,
  extensionOf,
  INTAKE_SLOTS,
  progressPercent,
  STAGE_ORDER,
  STAGES,
  stageIndex,
  type IntakeSlot,
  type IntakeStage,
  type TemplateIntake,
} from "@/lib/template-intake";
import { sampleUpload } from "@/lib/swatch-sample";
import { templateToPack, type CustomTemplate } from "@/lib/custom-templates";
import { runTemplateTests, testSummary, BASE_CODES } from "@/lib/template-tests";
import { LookPreviewTile } from "@/components/skins/SkinPreviewTile";

const MB = 1024 * 1024;

function fmtBytes(n: number): string {
  return n >= MB ? `${(n / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

function StageChip({ stage }: { stage: IntakeStage }) {
  const spec = STAGES.find((s) => s.id === stage)!;
  const done = stage === "published";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
        done
          ? "bg-[#A6FA87]/40 text-[#03002C]"
          : "bg-[#003FC7]/10 text-[#003FC7] dark:bg-[#A1FBF9]/15 dark:text-[#A1FBF9]"
      }`}
    >
      {spec.label}
    </span>
  );
}

export function AlternateLookWizard({
  existingTemplateCodes,
  onPublished,
}: {
  existingTemplateCodes: string[];
  onPublished: () => void;
}) {
  const load = useServerFn(listIntakes);
  const [intakes, setIntakes] = useState<TemplateIntake[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(
    (keep?: string | null) => {
      setLoading(true);
      return load()
        .then((r) => {
          setIntakes(r.intakes);
          setUrls(r.urls);
          setSelectedId((cur) => keep ?? cur ?? r.intakes[0]?.id ?? null);
        })
        .catch((e: Error) => toast.error(e.message))
        .finally(() => setLoading(false));
    },
    [load],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = intakes.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="lg:w-80 lg:shrink-0" aria-label="Looks in progress">
        <IntakeRail
          intakes={intakes}
          loading={loading}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreated={(id) => refresh(id)}
        />
      </aside>

      <div className="min-w-0 flex-1">
        {selected ? (
          <IntakePanel
            key={selected.id}
            intake={selected}
            urls={urls}
            existingTemplateCodes={existingTemplateCodes}
            onChanged={(next) => {
              setIntakes((list) => list.map((i) => (i.id === next.id ? next : i)));
              if (next.stage === "published") onPublished();
              void refresh(next.id);
            }}
            onDeleted={() => {
              setSelectedId(null);
              void refresh(null);
            }}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-black/15 p-10 text-center text-sm opacity-70 dark:border-white/20">
            {loading
              ? "Loading looks in progress…"
              : "Start a look on the left. You'll be asked for a fixed set of brand files, and the system derives the template from them."}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Side rail: the list + the "new look" form ──────────────────────────── */

function IntakeRail({
  intakes,
  loading,
  selectedId,
  onSelect,
  onCreated,
}: {
  intakes: TemplateIntake[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreated: (id: string) => void;
}) {
  const create = useServerFn(createIntake);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [base, setBase] = useState("S01");
  const [mode, setMode] = useState<"auto" | "light" | "dark">("auto");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const made = await create({
        data: { code, name, brief, baseSkinCode: base, modeIntent: mode },
      });
      toast.success(`Look ${made.code} started — collect its assets next.`);
      setOpen(false);
      setCode("");
      setName("");
      setBrief("");
      onCreated(made.id);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-60">
          Looks in progress
        </h2>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2 py-1 text-xs hover:border-[#003FC7]/40 dark:border-white/15"
        >
          {open ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {open ? "Cancel" : "New look"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={submit}
          className="space-y-2 rounded-2xl border border-[#003FC7]/25 bg-[#003FC7]/[0.04] p-3"
        >
          <label className="block text-xs">
            Code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              minLength={2}
              maxLength={12}
              pattern="[A-Za-z0-9\-]+"
              placeholder="ACME-1"
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-sm dark:border-white/15 dark:bg-white/5"
            />
          </label>
          <label className="block text-xs">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              placeholder="Acme Industrial"
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-sm dark:border-white/15 dark:bg-white/5"
            />
          </label>
          <label className="block text-xs">
            Brief — who it's for, where it will run
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-sm dark:border-white/15 dark:bg-white/5"
            />
          </label>
          <div className="flex gap-2">
            <label className="flex-1 text-xs">
              Base geometry
              <select
                value={base}
                onChange={(e) => setBase(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-sm dark:border-white/15 dark:bg-white/5"
              >
                {BASE_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1 text-xs">
              Mode
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-sm dark:border-white/15 dark:bg-white/5"
              >
                <option value="auto">Auto (from palette)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#003FC7] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Start intake
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {intakes.map((i) => {
          const sum = checklistSummary(i);
          return (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => onSelect(i.id)}
                aria-current={selectedId === i.id ? "true" : undefined}
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                  selectedId === i.id
                    ? "border-[#003FC7] bg-[#003FC7]/[0.06]"
                    : "border-black/10 hover:border-[#003FC7]/40 dark:border-white/15"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{i.name || i.code}</span>
                  <StageChip stage={i.stage} />
                </div>
                <div className="mt-1 text-[11px] opacity-60">
                  {i.code} · {sum.requiredDone}/{sum.requiredTotal} required files ·{" "}
                  {progressPercent(i)}%
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                  <div
                    className="h-full rounded-full bg-[#003FC7]"
                    style={{ width: `${progressPercent(i)}%` }}
                  />
                </div>
              </button>
            </li>
          );
        })}
        {!intakes.length && !loading && (
          <li className="rounded-xl border border-dashed border-black/15 p-3 text-xs opacity-60 dark:border-white/20">
            No looks in progress.
          </li>
        )}
      </ul>
    </div>
  );
}

/* ── The wizard panel ───────────────────────────────────────────────────── */

function IntakePanel({
  intake,
  urls,
  existingTemplateCodes,
  onChanged,
  onDeleted,
}: {
  intake: TemplateIntake;
  urls: Record<string, string>;
  existingTemplateCodes: string[];
  onChanged: (next: TemplateIntake) => void;
  onDeleted: () => void;
}) {
  const approve = useServerFn(approveIntakeStage);
  const reject = useServerFn(requestIntakeChanges);
  const remove = useServerFn(deleteIntake);
  const save = useServerFn(updateIntake);

  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const derived = useMemo(() => deriveTemplateFromIntake(intake), [intake]);
  const pack = useMemo(() => {
    try {
      return templateToPack(derived.template);
    } catch {
      return null;
    }
  }, [derived.template]);

  const tests = useMemo(
    () =>
      runTemplateTests(derived.template, {
        existingCodes: existingTemplateCodes.filter(
          (c) => c.toUpperCase() !== derived.template.code.toUpperCase(),
        ),
      }),
    [derived.template, existingTemplateCodes],
  );
  const summary = testSummary(tests);
  const gate = canAdvance(intake, { testsPassing: summary.ready });
  const idx = stageIndex(intake.stage);

  async function doApprove() {
    setBusy(true);
    try {
      const next = await approve({
        data: { id: intake.id, note, testsPassing: summary.ready },
      });
      setNote("");
      toast.success(
        next.stage === "published"
          ? `${next.code} is published to the catalog.`
          : `Approved — now at "${STAGES.find((s) => s.id === next.stage)!.label}".`,
      );
      onChanged(next);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function doReject() {
    if (!note.trim()) {
      toast.error("Say what needs to change — the reason is recorded on the intake.");
      return;
    }
    setBusy(true);
    try {
      const next = await reject({ data: { id: intake.id, reason: note } });
      setNote("");
      toast.success("Sent back a stage with your notes.");
      onChanged(next);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#003FC7]">
              {intake.code}
            </div>
            <h2 className="truncate text-xl font-semibold tracking-[-0.02em]">
              {intake.name || intake.code}
            </h2>
            {intake.brief && (
              <p className="mt-1 max-w-2xl whitespace-pre-line text-xs opacity-70">
                {intake.brief}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm(`Delete intake ${intake.code} and its uploaded files?`)) return;
              try {
                await remove({ data: { id: intake.id } });
                toast.success("Intake deleted.");
                onDeleted();
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2 py-1 text-xs hover:border-[#E53D2E]/60 dark:border-white/15"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>

        <ol className="mt-4 flex flex-wrap items-center gap-1.5" aria-label="Approval stages">
          {STAGES.map((s, i) => {
            const state = i < idx ? "done" : i === idx ? "current" : "todo";
            const ap = approvalFor(intake, s.id);
            return (
              <li key={s.id} className="flex items-center gap-1.5">
                <span
                  title={ap ? `Approved ${new Date(ap.at).toLocaleString()}` : s.gate}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${
                    state === "done"
                      ? "border-transparent bg-[#A6FA87]/40 text-[#03002C]"
                      : state === "current"
                        ? "border-[#003FC7] bg-[#003FC7] text-white"
                        : "border-black/10 opacity-60 dark:border-white/15"
                  }`}
                >
                  {state === "done" && <Check className="h-3 w-3" aria-hidden="true" />}
                  {s.label}
                </span>
                {i < STAGES.length - 1 && (
                  <ChevronRight className="h-3 w-3 opacity-40" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs opacity-70">
          <strong className="font-medium">This gate:</strong>{" "}
          {STAGES.find((s) => s.id === intake.stage)!.gate}
        </p>
      </header>

      {/* 1 — assets */}
      <AssetChecklist intake={intake} urls={urls} onChanged={onChanged} />

      {/* 2 — the derived look */}
      {idx >= 1 && (
        <section className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
          <h3 className="text-sm font-semibold">Generated look</h3>
          <p className="mt-1 text-xs opacity-70">
            Derived from the uploads. Approve it only if these calls are right for the brand.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {derived.template.palette.map((hex, i) => (
              <span key={i} className="flex items-center gap-2 rounded-lg border border-black/10 px-2 py-1 text-[11px] dark:border-white/15">
                <span
                  className="h-4 w-4 rounded"
                  style={{ background: hex, outline: "1px solid rgba(0,0,0,0.12)" }}
                />
                {hex}
              </span>
            ))}
            <span className="rounded-lg border border-black/10 px-2 py-1 text-[11px] dark:border-white/15">
              {derived.template.mode} · {derived.template.density} density
            </span>
          </div>
          <ul className="mt-3 space-y-1 text-xs opacity-75">
            {derived.notes.map((n, i) => (
              <li key={i}>· {n}</li>
            ))}
          </ul>
          {pack && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(["cover", "stats", "process"] as const).map((seed) => (
                <LookPreviewTile key={seed} pack={pack} kicker={seed} seed={seed} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4 — readiness suite */}
      {idx >= 3 && (
        <section className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Readiness suite</h3>
            <span className="text-xs opacity-70">
              {summary.pass} pass · {summary.warn} warn · {summary.fail} fail
            </span>
          </div>
          <ul className="mt-2 space-y-1 text-xs">
            {tests.map((t) => (
              <li key={t.id} className="flex gap-2">
                <span
                  className={
                    t.status === "pass"
                      ? "text-[#1c7c3c]"
                      : t.status === "warn"
                        ? "text-[#a06800]"
                        : "text-[#E53D2E]"
                  }
                >
                  {t.status === "pass" ? "✓" : t.status === "warn" ? "!" : "✕"}
                </span>
                <span>
                  <strong className="font-medium">{t.label}</strong> — {t.detail}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Approval */}
      {intake.stage === "published" ? (
        <section className="rounded-2xl border border-[#A6FA87]/60 bg-[#A6FA87]/15 p-4">
          <h3 className="text-sm font-semibold">Published</h3>
          <p className="mt-1 text-xs opacity-80">
            {intake.code} is in the catalog for every builder, with the supplied plate as its
            section background. Approvals on file:{" "}
            {intake.approvals.map((a) => STAGES.find((s) => s.id === a.stage)!.label).join(" → ")}.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
          <h3 className="text-sm font-semibold">
            Approve “{STAGES.find((s) => s.id === intake.stage)!.label}”
          </h3>
          {!gate.ok && (
            <ul className="mt-2 space-y-1 text-xs text-[#E53D2E]">
              {gate.blockers.map((b, i) => (
                <li key={i}>· {b}</li>
              ))}
            </ul>
          )}
          <label className="mt-3 block text-xs">
            Approval note (recorded with your name and the time)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-sm dark:border-white/15 dark:bg-white/5"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={doApprove}
              disabled={busy || (!gate.ok && intake.stage !== "review")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#003FC7] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {STAGE_ORDER[idx + 1] === "published" ? "Approve & publish" : "Approve & continue"}
            </button>
            {idx > 0 && (
              <button
                type="button"
                onClick={doReject}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm hover:border-[#E53D2E]/60 disabled:opacity-50 dark:border-white/15"
              >
                <RotateCcw className="h-4 w-4" /> Request changes
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                try {
                  const next = await save({ data: { id: intake.id, brief: intake.brief } });
                  onChanged(next);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
              className="ml-auto text-xs underline opacity-60"
            >
              Refresh gate
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Upload checklist ───────────────────────────────────────────────────── */

function AssetChecklist({
  intake,
  urls,
  onChanged,
}: {
  intake: TemplateIntake;
  urls: Record<string, string>;
  onChanged: (next: TemplateIntake) => void;
}) {
  const rows = evaluateChecklist(intake);
  const sum = checklistSummary(intake);
  return (
    <section className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Required uploads</h3>
        <span className="text-xs opacity-70">
          {sum.requiredDone}/{sum.requiredTotal} required · {sum.optionalDone} optional on file
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <SlotRow
            key={row.slot.id}
            slot={row.slot}
            intake={intake}
            url={row.asset ? urls[row.asset.path] : undefined}
            problems={row.problems}
            onChanged={onChanged}
          />
        ))}
      </ul>
    </section>
  );
}

function SlotRow({
  slot,
  intake,
  url,
  problems,
  onChanged,
}: {
  slot: IntakeSlot;
  intake: TemplateIntake;
  url?: string;
  problems: string[];
  onChanged: (next: TemplateIntake) => void;
}) {
  const upload = useServerFn(uploadIntakeAsset);
  const drop = useServerFn(deleteIntakeAsset);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const asset = assetFor(intake, slot.id);
  const locked = intake.stage === "published";

  async function pick(file: File | null | undefined) {
    if (!file) return;
    const ext = extensionOf(file.name);
    if (!slot.formats.includes(ext)) {
      toast.error(`${slot.label} accepts ${slot.formats.map((f) => `.${f}`).join(", ")}.`);
      return;
    }
    if (file.size > slot.maxBytes) {
      toast.error(`${slot.label} is capped at ${Math.round(slot.maxBytes / MB)} MB.`);
      return;
    }
    setBusy(true);
    try {
      // Colours are sampled in the browser (canvas), then travel with the file
      // so the server never has to decode a bitmap.
      const sampled = await sampleUpload(file);
      const next = await upload({
        data: {
          id: intake.id,
          slot: slot.id,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          data: sampled.dataUrl,
          swatches: sampled.swatches,
          width: sampled.width,
          height: sampled.height,
        },
      });
      toast.success(`${slot.label} uploaded.`);
      onChanged(next);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const ok = problems.length === 0 && Boolean(asset);
  return (
    <li
      className={`rounded-xl border p-3 ${
        problems.length
          ? "border-[#E53D2E]/40 bg-[#E53D2E]/[0.04]"
          : ok
            ? "border-[#A6FA87]/60 bg-[#A6FA87]/[0.08]"
            : "border-black/10 dark:border-white/15"
      }`}
      data-slot={slot.id}
      data-slot-ok={ok ? "true" : "false"}
    >
      <div className="flex flex-wrap items-start gap-3">
        {url && /\.(png|jpe?g|webp|svg|gif)$/i.test(asset?.filename ?? "") ? (
          <img
            src={url}
            alt={`${slot.label} preview`}
            className="h-14 w-20 shrink-0 rounded-lg object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-14 w-20 shrink-0 place-items-center rounded-lg bg-black/5 text-[10px] uppercase opacity-60 dark:bg-white/10">
            {asset ? extensionOf(asset.filename) || "file" : "empty"}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{slot.label}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] ${
                slot.required
                  ? "bg-[#003FC7]/10 text-[#003FC7] dark:bg-[#A1FBF9]/15 dark:text-[#A1FBF9]"
                  : "bg-black/5 opacity-70 dark:bg-white/10"
              }`}
            >
              {slot.required ? "Required" : "Optional"}
            </span>
          </div>
          <p className="mt-0.5 text-xs opacity-70">{slot.purpose}</p>
          <p className="text-[11px] opacity-55">
            Feeds: {slot.feeds} · {slot.formats.map((f) => `.${f}`).join(" ")} · max{" "}
            {Math.round(slot.maxBytes / MB)} MB
          </p>
          {asset && (
            <p className="mt-1 truncate text-[11px] opacity-70">
              {asset.filename} · {fmtBytes(asset.bytes)}
              {asset.width ? ` · ${asset.width}×${asset.height}px` : ""}
            </p>
          )}
          {Boolean(asset?.swatches?.length) && (
            <div className="mt-1 flex flex-wrap gap-1">
              {asset!.swatches!.map((hex) => (
                <span
                  key={hex}
                  title={hex}
                  className="h-3.5 w-3.5 rounded"
                  style={{ background: hex, outline: "1px solid rgba(0,0,0,0.12)" }}
                />
              ))}
            </div>
          )}
          {problems.map((p, i) => (
            <p key={i} className="mt-1 text-[11px] text-[#E53D2E]">
              {p}
            </p>
          ))}
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          <input
            ref={inputRef}
            type="file"
            accept={slot.formats.map((f) => `.${f}`).join(",")}
            className="hidden"
            aria-label={`Upload ${slot.label}`}
            data-testid={`file-${slot.id}`}
            onChange={(e) => void pick(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={busy || locked}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2 py-1 text-xs hover:border-[#003FC7]/40 disabled:opacity-50 dark:border-white/15"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {asset ? "Replace" : "Upload"}
          </button>
          {asset && !locked && (
            <button
              type="button"
              onClick={async () => {
                try {
                  onChanged(await drop({ data: { id: intake.id, slot: slot.id } }));
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2 py-1 text-xs hover:border-[#E53D2E]/60 dark:border-white/15"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
