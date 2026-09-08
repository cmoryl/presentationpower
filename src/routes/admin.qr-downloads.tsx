// /admin/qr-downloads — which event kits are people pulling QR codes out of?
//
// One row per kit, split by the two things a recipient can take: the vector
// SVG (print) and the PNG proof (digital). Sorted by total so the kits that
// earn their keep sit at the top.

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { QrCode } from "lucide-react";
import { AdminLoading, AdminPageHeader, AdminSection } from "@/components/admin/AdminPage";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";
import { getKitQrDownloads } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/qr-downloads")({
  head: () => ({
    meta: [
      { title: "QR downloads · Admin · TransPerfect Element" },
      {
        name: "description",
        content:
          "See how many QR codes each event kit hands out, split by vector SVG and PNG, so you can tell which kits get used.",
      },
      { property: "og:title", content: "QR downloads · Admin · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "See how many QR codes each event kit hands out, split by vector SVG and PNG, so you can tell which kits get used.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QrDownloadsView,
});

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "12 months" },
];

function QrDownloadsView() {
  const [days, setDays] = useState(90);
  const load = useServerFn(getKitQrDownloads);
  const { data, isLoading, error } = useQuery({
    queryKey: ["kit-qr-downloads", days],
    queryFn: () => load({ data: { days } }),
  });

  if (error && isForbidden(error)) return <AdminForbidden />;

  const kits = data?.kits ?? [];
  const totals = data?.totals;
  const max = Math.max(1, ...kits.map((k) => k.total));

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <AdminPageHeader
        eyebrow="Event kits"
        title="QR downloads"
        description="Every QR code taken out of an event kit, by kit and by file type."
        actions={
          <div className="flex flex-wrap gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => setDays(r.days)}
                className={`rounded-full px-3 py-1.5 text-xs ${
                  days === r.days
                    ? "bg-[#003FC7] text-white"
                    : "border border-black/15 text-black/60 hover:bg-black/5"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <AdminLoading label="Counting downloads…" />
      ) : (
        <>
          <div className="mb-8 grid gap-3 sm:grid-cols-4">
            {[
              { label: "Downloads", value: totals?.total ?? 0 },
              { label: "Kits used", value: totals?.kits ?? 0 },
              { label: "SVG (vector)", value: totals?.svg ?? 0 },
              { label: "PNG", value: totals?.png ?? 0 },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-black/50">
                  {s.label}
                </div>
                <div className="mt-1 text-2xl font-semibold text-[#03002C]">{s.value}</div>
              </div>
            ))}
          </div>

          <AdminSection eyebrow="By kit" title="Which kits get used">
            {kits.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-black/55">
                <QrCode size={14} /> No QR codes have been downloaded in this period yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left text-[10px] uppercase tracking-widest text-black/50">
                    <th className="py-2">Kit</th>
                    <th className="py-2 text-right">SVG</th>
                    <th className="py-2 text-right">PNG</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2 text-right">Last</th>
                  </tr>
                </thead>
                <tbody>
                  {kits.map((k) => (
                    <tr key={k.kitId} className="border-b border-black/5">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-[#03002C]">{k.label}</div>
                        <div className="mt-1 h-1.5 w-full max-w-[260px] rounded-full bg-black/5">
                          <div
                            className="h-1.5 rounded-full bg-[#003FC7]"
                            style={{ width: `${(k.total / max) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{k.svg}</td>
                      <td className="py-2.5 text-right tabular-nums">{k.png}</td>
                      <td className="py-2.5 text-right font-semibold tabular-nums">{k.total}</td>
                      <td className="py-2.5 text-right text-black/50">
                        {new Date(k.last).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </AdminSection>
        </>
      )}
    </div>
  );
}
