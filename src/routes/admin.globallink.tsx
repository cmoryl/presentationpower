import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Globe,
  Check,
  AlertTriangle,
  Copy,
  KeyRound,
  Save,
  Loader2,
  Zap,
  ShieldCheck,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import {
  getGlobalLinkStatus,
  getGlobalLinkConfig,
  upsertGlobalLinkConfig,
  testGlobalLinkConnection,
  type GlobalLinkConfig,
  type GlobalLinkStatus,
} from "@/lib/globallink.functions";
import { listLanguages } from "@/lib/translation.functions";

export const Route = createFileRoute("/admin/globallink")({
  head: () => ({
    meta: [
      { title: "GlobalLink · Admin · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Configure the TransPerfect GlobalLink translation connection, credentials, workflow, glossary enforcement, and callback settings.",
      },
    ],
  }),
  component: GlobalLinkAdminPage,
});

type LangRow = { id: string; label: string; native: string; rtl: boolean };

const DEFAULT_CONFIG: GlobalLinkConfig = {
  project_code: null,
  workflow: "mt",
  default_source_lang: "en",
  submitter_override: null,
  human_review_default: false,
  use_translation_memory: true,
  enforce_glossary: true,
  callback_url: null,
  batch_size: 100,
  request_timeout_ms: 60000,
  notes: null,
  updated_at: new Date().toISOString(),
};

function GlobalLinkAdminPage() {
  const statusFn = useServerFn(getGlobalLinkStatus);
  const cfgFn = useServerFn(getGlobalLinkConfig);
  const saveFn = useServerFn(upsertGlobalLinkConfig);
  const testFn = useServerFn(testGlobalLinkConnection);
  const langsFn = useServerFn(listLanguages);

  const [status, setStatus] = useState<GlobalLinkStatus | null>(null);
  const [config, setConfig] = useState<GlobalLinkConfig>(DEFAULT_CONFIG);
  const [languages, setLanguages] = useState<LangRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latencyMs?: number } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, c, l] = await Promise.all([statusFn(), cfgFn(), langsFn()]);
        setStatus(s as GlobalLinkStatus);
        setConfig((c as GlobalLinkConfig) ?? DEFAULT_CONFIG);
        setLanguages(l as LangRow[]);
      } catch (err) {
        console.warn("GlobalLink admin load failed", err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    setFlash(null);
    try {
      await saveFn({
        data: {
          project_code: config.project_code,
          workflow: config.workflow,
          default_source_lang: config.default_source_lang,
          submitter_override: config.submitter_override,
          human_review_default: config.human_review_default,
          use_translation_memory: config.use_translation_memory,
          enforce_glossary: config.enforce_glossary,
          callback_url: config.callback_url,
          batch_size: config.batch_size,
          request_timeout_ms: config.request_timeout_ms,
          notes: config.notes,
        },
      });
      setFlash("Settings saved.");
    } catch (e) {
      setFlash((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = (await testFn()) as { ok: boolean; message: string; latencyMs?: number };
      setTestResult(r);
    } finally {
      setTesting(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    setFlash("Copied.");
    setTimeout(() => setFlash(null), 1500);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 text-black/60">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const requiredMissing = status?.secrets.filter((s) => s.required && !s.configured) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.35em] text-black/40">
            Admin · Localization · Connection
          </div>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight text-[#03002C]">
            <Globe size={26} className="text-[#003FC7]" />
            GlobalLink
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-black/60">
            TransPerfect GlobalLink powers regulated, brand-critical translation. Configure credentials
            and workflow defaults here; individual decks pick languages from the Translate panel.
          </p>
        </div>
        <div
          className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium ${
            status?.connected
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-amber-300 bg-amber-50 text-amber-700"
          }`}
        >
          {status?.connected ? <Check size={14} /> : <AlertTriangle size={14} />}
          {status?.connected ? "Connected" : "Not connected"}
        </div>
      </div>

      {/* Connection */}
      <section className="mb-8 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-black/70">
            <KeyRound size={14} /> Credentials
          </h2>
          <button
            onClick={runTest}
            disabled={testing || !status?.connected}
            className="inline-flex items-center gap-2 rounded-full border border-[#003FC7]/30 bg-[#003FC7]/10 px-4 py-1.5 text-xs font-medium text-[#003FC7] hover:bg-[#003FC7]/20 disabled:opacity-40"
          >
            {testing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            Test connection
          </button>
        </div>

        {requiredMissing.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-800">
            <div className="mb-1 font-semibold">Action required</div>
            Ask Lovable to <span className="font-mono font-semibold">add the GlobalLink secrets below</span> — you'll
            be shown a secure form to paste each value once. Values are never stored in code and are available to
            server functions only.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {status?.secrets.map((s) => (
            <div
              key={s.name}
              className={`rounded-xl border p-4 ${
                s.configured
                  ? "border-emerald-300 bg-emerald-50"
                  : s.required
                    ? "border-amber-300 bg-amber-50"
                    : "border-black/10 bg-[#F8F9FB]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-black">
                  {s.configured ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : s.required ? (
                    <AlertTriangle size={14} className="text-amber-600" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-black/30" />
                  )}
                  <span className="font-mono text-xs font-semibold">{s.name}</span>
                </div>
                <button
                  onClick={() => copy(s.name)}
                  className="rounded p-1 text-black/40 hover:bg-black/5 hover:text-black"
                  title="Copy env var name"
                >
                  <Copy size={12} />
                </button>
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-widest text-black/50">
                {s.label} {s.required && <span className="text-amber-700">· required</span>}
              </div>
              <div className="mt-2 text-xs text-black/60">{s.description}</div>
              <div className="mt-2 text-[10px] text-black/40">
                {s.configured ? "✓ Saved securely" : "Not set"}
              </div>
            </div>
          ))}
        </div>

        {status?.endpoint && (
          <div className="mt-4 rounded-xl border border-black/10 bg-[#F2F2F2] p-3 text-xs">
            <div className="mb-1 text-[10px] uppercase tracking-widest text-black/50">Resolved endpoint</div>
            <div className="flex items-center justify-between gap-2 font-mono text-black/80">
              <span className="truncate">{status.endpoint}</span>
              <button onClick={() => copy(status.endpoint!)} className="rounded p-1 text-black/40 hover:text-black">
                <Copy size={12} />
              </button>
            </div>
          </div>
        )}

        {testResult && (
          <div
            className={`mt-4 rounded-xl border p-4 text-xs ${
              testResult.ok
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-red-300 bg-red-50 text-red-800"
            }`}
          >
            <div className="font-semibold">
              {testResult.ok ? "Live" : "Failed"}
              {typeof testResult.latencyMs === "number" && (
                <span className="ml-2 text-black/60">· {testResult.latencyMs} ms</span>
              )}
            </div>
            <div className="mt-1 whitespace-pre-wrap break-words">{testResult.message}</div>
          </div>
        )}
      </section>

      {/* Workflow & features */}
      <section className="mb-8 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-black/70">
          <ShieldCheck size={14} /> Workflow &amp; features
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left column */}
          <div className="space-y-4">
            <Field label="Project code" hint="Client / project identifier logged with every job.">
              <input
                value={config.project_code ?? ""}
                onChange={(e) => setConfig({ ...config, project_code: e.target.value || null })}
                placeholder="e.g. TP-MODULAR"
                className="w-full rounded-lg border border-black/15 bg-[#F2F2F2] px-3 py-2 text-sm text-black placeholder:text-black/40 outline-none focus:border-[#003FC7]"
              />
            </Field>

            <Field label="Workflow" hint="Default translation workflow for new jobs.">
              <select
                value={config.workflow}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    workflow: e.target.value as GlobalLinkConfig["workflow"],
                    human_review_default: e.target.value !== "mt",
                  })
                }
                className="w-full rounded-lg border border-black/15 bg-[#F2F2F2] px-3 py-2 text-sm text-black"
              >
                <option value="mt">MT only — fastest</option>
                <option value="mt_pe">MT + Post-Edit — balanced</option>
                <option value="human">Human — regulated / brand-critical</option>
              </select>
            </Field>

            <Field label="Default source language" hint="BCP-47 code (e.g. en, en-US, fr).">
              <select
                value={config.default_source_lang}
                onChange={(e) => setConfig({ ...config, default_source_lang: e.target.value })}
                className="w-full rounded-lg border border-black/15 bg-[#F2F2F2] px-3 py-2 text-sm text-black"
              >
                {languages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label} ({l.id})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Submitter override" hint="Optional. Overrides GLOBALLINK_SUBMITTER on outgoing jobs.">
              <input
                type="email"
                value={config.submitter_override ?? ""}
                onChange={(e) => setConfig({ ...config, submitter_override: e.target.value || null })}
                placeholder="name@transperfect.com"
                className="w-full rounded-lg border border-black/15 bg-[#F2F2F2] px-3 py-2 text-sm text-black placeholder:text-black/40 outline-none focus:border-[#003FC7]"
              />
            </Field>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <Toggle
              label="Human review default"
              hint="Send jobs to reviewer queue by default. Auto-on for MT+PE and Human workflows."
              checked={config.human_review_default}
              onChange={(v) => setConfig({ ...config, human_review_default: v })}
            />
            <Toggle
              label="Translation Memory"
              hint="Leverage TM matches on outgoing jobs (recommended)."
              checked={config.use_translation_memory}
              onChange={(v) => setConfig({ ...config, use_translation_memory: v })}
            />
            <Toggle
              label="Enforce glossary"
              hint='Protect DNT terms via inline span translate="no" markers.'
              checked={config.enforce_glossary}
              onChange={(v) => setConfig({ ...config, enforce_glossary: v })}
            />

            <Field label="Batch size" hint="Segments per GlobalLink request (1–500).">
              <input
                type="number"
                min={1}
                max={500}
                value={config.batch_size}
                onChange={(e) => setConfig({ ...config, batch_size: Number(e.target.value) || 100 })}
                className="w-full rounded-lg border border-black/15 bg-[#F2F2F2] px-3 py-2 text-sm text-black outline-none focus:border-[#003FC7]"
              />
            </Field>

            <Field label="Request timeout (ms)" hint="Between 5,000 and 600,000.">
              <input
                type="number"
                min={5000}
                max={600000}
                step={1000}
                value={config.request_timeout_ms}
                onChange={(e) =>
                  setConfig({ ...config, request_timeout_ms: Number(e.target.value) || 60000 })
                }
                className="w-full rounded-lg border border-black/15 bg-[#F2F2F2] px-3 py-2 text-sm text-black outline-none focus:border-[#003FC7]"
              />
            </Field>
          </div>
        </div>

        <div className="mt-6">
          <Field label="Callback URL" hint="Public HTTPS URL GlobalLink can POST job-status webhooks to.">
            <input
              type="url"
              value={config.callback_url ?? ""}
              onChange={(e) => setConfig({ ...config, callback_url: e.target.value || null })}
              placeholder="https://yourapp.lovable.app/api/public/globallink/callback"
              className="w-full rounded-lg border border-black/15 bg-[#F2F2F2] px-3 py-2 text-sm text-black placeholder:text-black/40 outline-none focus:border-[#003FC7]"
            />
          </Field>

          <Field label="Notes (internal)" hint="Shown only to admins on this page.">
            <textarea
              value={config.notes ?? ""}
              onChange={(e) => setConfig({ ...config, notes: e.target.value || null })}
              rows={3}
              className="w-full rounded-lg border border-black/15 bg-[#F2F2F2] px-3 py-2 text-sm text-black placeholder:text-black/40 outline-none focus:border-[#003FC7]"
            />
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-xs text-black/50">
            Last updated {config.updated_at ? new Date(config.updated_at).toLocaleString() : "—"}
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#003FC7] px-5 py-2 text-sm font-medium text-white hover:bg-[#003FC7]/90 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save settings
          </button>
        </div>

        {flash && <div className="mt-3 text-xs text-black/60">{flash}</div>}
      </section>

      {/* Reference */}
      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-black/70">
          <BookOpen size={14} /> Reference
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href="/admin/translation"
            className="group flex items-center justify-between rounded-xl border border-black/10 bg-[#F8F9FB] p-4 text-sm text-black/80 hover:border-[#003FC7]/40 hover:bg-[#003FC7]/5"
          >
            <span>
              <span className="block font-semibold text-black">Translation admin</span>
              <span className="text-xs text-black/50">Manage engines, glossary, and active languages.</span>
            </span>
            <ExternalLink size={14} className="text-black/40 group-hover:text-[#003FC7]" />
          </a>
          <a
            href="https://www.transperfect.com/globallink"
            target="_blank"
            rel="noreferrer"
            className="group flex items-center justify-between rounded-xl border border-black/10 bg-[#F8F9FB] p-4 text-sm text-black/80 hover:border-[#003FC7]/40 hover:bg-[#003FC7]/5"
          >
            <span>
              <span className="block font-semibold text-black">GlobalLink product docs</span>
              <span className="text-xs text-black/50">TransPerfect's public overview and workflows.</span>
            </span>
            <ExternalLink size={14} className="text-black/40 group-hover:text-[#003FC7]" />
          </a>
        </div>
      </section>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-black/60">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-black/40">{hint}</div>}
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-black/10 bg-[#F8F9FB] p-3">
      <div>
        <div className="text-sm font-medium text-black">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] text-black/50">{hint}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[#003FC7]" : "bg-black/20"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
