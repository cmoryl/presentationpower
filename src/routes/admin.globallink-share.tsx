import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Share2,
  Check,
  AlertTriangle,
  KeyRound,
  Save,
  Loader2,
  Zap,
  Copy,
  ExternalLink,
  History,
  Settings2,
  Ban,
} from "lucide-react";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";
import {
  getGlobalLinkShareStatus,
  getGlobalLinkShareSettings,
  upsertGlobalLinkShareSettings,
  testGlobalLinkShareConnection,
  listGlobalLinkShareActivity,
  type GlobalLinkShareStatus,
  type GlobalLinkShareSettings,
  type GlobalLinkShareTestResult,
  type GlobalLinkShareActivityRow,
} from "@/lib/globallink-share.functions";

export const Route = createFileRoute("/admin/globallink-share")({
  head: () => ({
    meta: [
      { title: "GlobalLink Share · Admin · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Manage the GlobalLink Share integration: connection status, upload defaults, and share activity log.",
      },
    ],
  }),
  component: ShareAdminPage,
});

const DEFAULTS: GlobalLinkShareSettings = {
  defaultLinkExpiryDays: 30,
  passwordProtect: false,
  notifyRecipients: true,
  defaultFolder: null,
  autoShareOnExport: false,
  updatedAt: null,
};

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

function fmtBytes(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function ShareAdminPage() {
  const statusFn = useServerFn(getGlobalLinkShareStatus);
  const settingsFn = useServerFn(getGlobalLinkShareSettings);
  const saveFn = useServerFn(upsertGlobalLinkShareSettings);
  const testFn = useServerFn(testGlobalLinkShareConnection);
  const activityFn = useServerFn(listGlobalLinkShareActivity);

  const [status, setStatus] = useState<GlobalLinkShareStatus | null>(null);
  const [settings, setSettings] = useState<GlobalLinkShareSettings>(DEFAULTS);
  const [activity, setActivity] = useState<GlobalLinkShareActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<GlobalLinkShareTestResult | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, cfg, act] = await Promise.all([statusFn(), settingsFn(), activityFn()]);
        setStatus(s);
        setSettings(cfg ?? DEFAULTS);
        setActivity(act);
      } catch (e) {
        if (isForbidden(e)) setForbidden(true);
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
      const next = await saveFn({
        data: {
          defaultLinkExpiryDays: settings.defaultLinkExpiryDays,
          passwordProtect: settings.passwordProtect,
          notifyRecipients: settings.notifyRecipients,
          defaultFolder: settings.defaultFolder,
          autoShareOnExport: settings.autoShareOnExport,
        },
      });
      setSettings(next);
      setFlash("Share defaults saved.");
      setTimeout(() => setFlash(null), 2000);
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
      const r = await testFn();
      setTestResult(r);
    } catch (e) {
      setTestResult({ configured: false, ok: false, message: (e as Error).message });
    } finally {
      setTesting(false);
    }
  }

  async function copyUrl(id: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* ignore */
    }
  }

  const connected = !!status?.configured;
  const successCount = useMemo(
    () => activity.filter((a) => a.status === "success").length,
    [activity],
  );

  if (forbidden) return <AdminForbidden />;
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 text-black/60">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.35em] text-black/40">
            Admin · Localization · GlobalLink · Share
          </div>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight text-[#03002C]">
            <Share2 size={24} className="text-[#003FC7]" />
            GlobalLink Share
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-black/60">
            Secure file handoff for exported decks. Configure org-wide upload defaults here;
            individual users trigger uploads from the deck export screen.
          </p>
        </div>
        <div
          className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium ${
            connected
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-amber-300 bg-amber-50 text-amber-700"
          }`}
        >
          {connected ? <Check size={14} /> : <AlertTriangle size={14} />}
          {connected ? "Connected" : "Not connected"}
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
            disabled={testing || !connected}
            title={connected ? "Ping GlobalLink Share with the configured credentials" : "Configure credentials first"}
            className="inline-flex items-center gap-2 rounded-full border border-[#003FC7]/30 bg-[#003FC7]/10 px-4 py-1.5 text-xs font-medium text-[#003FC7] hover:bg-[#003FC7]/20 disabled:opacity-40"
          >
            {testing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            Test connection
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SecretRow
            label="GLOBALLINK_SHARE_API_BASE_URL"
            configured={!!status?.baseUrlConfigured}
          />
          <SecretRow
            label="GLOBALLINK_SHARE_API_KEY"
            configured={!!status?.apiKeyConfigured}
          />
        </div>

        {!connected && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-800">
            <div className="mb-1 font-semibold">Action required</div>
            Add <span className="font-mono">GLOBALLINK_SHARE_API_BASE_URL</span> and{" "}
            <span className="font-mono">GLOBALLINK_SHARE_API_KEY</span> in Project Settings → Secrets to
            enable direct uploads. Until then, users see the manual handoff (open share.transperfect.com in a new tab).
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
            <div className="flex items-center gap-2 font-semibold">
              {testResult.ok ? <Check size={12} /> : <AlertTriangle size={12} />}
              {testResult.ok ? "Reachable" : "Failed"}
              {"latencyMs" in testResult && testResult.configured ? (
                <span className="ml-2 rounded-full bg-white/60 px-2 py-0.5 font-mono">
                  {testResult.latencyMs}ms
                </span>
              ) : null}
            </div>
            <div className="mt-1 whitespace-pre-wrap">{testResult.message}</div>
          </div>
        )}
      </section>

      {/* Share defaults */}
      <section className="mb-8 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-black/70">
            <Settings2 size={14} /> Share defaults
          </h2>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#03002C] disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save defaults
          </button>
        </div>

        {!connected && (
          <p className="mb-4 rounded-lg bg-black/[0.03] px-3 py-2 text-[11px] text-black/60">
            You can edit these now — they take effect on every upload once the API credentials are added.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default link expiry (days)">
            <input
              type="number"
              min={1}
              max={3650}
              value={settings.defaultLinkExpiryDays}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  defaultLinkExpiryDays: Math.max(1, Math.min(3650, Number(e.target.value) || 30)),
                }))
              }
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm focus:border-[#003FC7] focus:outline-none"
            />
          </Field>

          <Field label="Default folder (optional)">
            <input
              type="text"
              value={settings.defaultFolder ?? ""}
              placeholder="e.g. Sales / EMEA"
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  defaultFolder: e.target.value.trim() ? e.target.value : null,
                }))
              }
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm focus:border-[#003FC7] focus:outline-none"
            />
          </Field>

          <Toggle
            label="Password protect share links"
            hint="Recipients must enter a password before downloading."
            checked={settings.passwordProtect}
            onChange={(v) => setSettings((s) => ({ ...s, passwordProtect: v }))}
          />
          <Toggle
            label="Notify recipients"
            hint="Send an email notification when the file is available."
            checked={settings.notifyRecipients}
            onChange={(v) => setSettings((s) => ({ ...s, notifyRecipients: v }))}
          />
          <Toggle
            label="Auto-share on export"
            hint="Automatically upload every downloaded PPTX to GlobalLink Share."
            checked={settings.autoShareOnExport}
            onChange={(v) => setSettings((s) => ({ ...s, autoShareOnExport: v }))}
            disabled={!connected}
            disabledHint="Available once GlobalLink Share is connected."
          />
        </div>

        {flash && <div className="mt-4 text-xs text-black/60">{flash}</div>}
      </section>

      {/* Activity */}
      <section className="mb-8 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-black/70">
            <History size={14} /> Recent activity
          </h2>
          <span className="text-[11px] text-black/50">
            {activity.length === 0
              ? "No shares yet"
              : `${successCount}/${activity.length} successful`}
          </span>
        </div>

        {activity.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/10 bg-black/[0.02] p-8 text-center text-sm text-black/50">
            No shares yet — activity appears here once GlobalLink Share is connected and used.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-black/10">
            <table className="w-full text-sm">
              <thead className="bg-black/[0.03] text-[11px] uppercase tracking-widest text-black/50">
                <tr>
                  <th className="px-3 py-2 text-left">Deck / File</th>
                  <th className="px-3 py-2 text-left">Size</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Link</th>
                  <th className="px-3 py-2 text-left">When</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((a) => (
                  <tr key={a.id} className="border-t border-black/5">
                    <td className="px-3 py-2">
                      <div className="font-medium text-[#03002C]">
                        {a.deckTitle ?? "—"}
                      </div>
                      <div className="font-mono text-[11px] text-black/50">{a.fileName}</div>
                    </td>
                    <td className="px-3 py-2 text-black/70">{fmtBytes(a.fileSizeBytes)}</td>
                    <td className="px-3 py-2">
                      {a.status === "success" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          <Check size={12} /> Success
                        </span>
                      ) : (
                        <span
                          title={a.errorMessage ?? ""}
                          className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700"
                        >
                          <AlertTriangle size={12} /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {a.shareUrl ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={a.shareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 truncate text-[#003FC7] hover:underline"
                          >
                            <ExternalLink size={12} />
                            <span className="max-w-[260px] truncate">{a.shareUrl}</span>
                          </a>
                          <button
                            onClick={() => copyUrl(a.id, a.shareUrl!)}
                            className="rounded-full border border-black/10 px-2 py-0.5 text-[10px] text-black/60 hover:border-black/30"
                          >
                            {copiedId === a.id ? "Copied" : <Copy size={12} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-black/40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-black/60">{relativeTime(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Advanced / dormant */}
      <section className="mb-8 rounded-2xl border border-dashed border-black/15 bg-black/[0.015] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-black/50">
            <Ban size={14} /> Advanced · Available when connected
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <DormantButton label="Revoke share link" hint="Invalidate an existing shared file so the link stops working." />
          <DormantButton label="Re-share existing export" hint="Push a previously exported PPTX to Share again." />
          <DormantButton label="Bulk-share selected decks" hint="Queue multiple decks for a single Share batch." />
        </div>
      </section>
    </div>
  );
}

function SecretRow({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        configured ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-black/70">{label}</span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            configured ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
          }`}
        >
          {configured ? <Check size={12} /> : <AlertTriangle size={12} />}
          {configured ? "Configured" : "Missing"}
        </span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-widest text-black/50">
        {label}
      </div>
      {children}
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
  disabledHint,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-black/10 bg-white p-3 ${
        disabled ? "opacity-60" : "hover:border-black/20"
      }`}
      title={disabled ? disabledHint : undefined}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-[#03002C]">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] text-black/50">{hint}</div>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-[#003FC7]"
      />
    </label>
  );
}

function DormantButton({ label, hint }: { label: string; hint: string }) {
  return (
    <button
      disabled
      title={`${hint}\n\nAvailable when GlobalLink Share is connected.`}
      className="cursor-not-allowed rounded-xl border border-black/10 bg-white/60 p-3 text-left opacity-70"
    >
      <div className="text-sm font-medium text-[#03002C]">{label}</div>
      <div className="mt-1 text-[11px] text-black/50">{hint}</div>
    </button>
  );
}
