import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import JSZip from "jszip";

export const Route = createFileRoute("/export/guide-images")({
  head: () => ({
    meta: [
      { title: "Guide image export — TransPerfect Element" },
      { name: "description", content: "Download every brand guide and event kit image as one zip." },
      { property: "og:title", content: "Guide image export — TransPerfect Element" },
      { property: "og:description", content: "Download every brand guide and event kit image as one zip." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GuideImagesExport,
});

const IMG = /\.(svg|png|jpe?g|webp)$/i;

function collect(x: unknown, out: Set<string>) {
  if (Array.isArray(x)) x.forEach((v) => collect(v, out));
  else if (x && typeof x === "object") Object.values(x).forEach((v) => collect(v, out));
  else if (typeof x === "string" && x.startsWith("/") && IMG.test(x)) out.add(x);
}

function GuideImagesExport() {
  const [paths, setPaths] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [result, setResult] = useState<{ saved: number; failed: string[] } | null>(null);

  useEffect(() => {
    fetch("/brand-kit-export.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        const s = new Set<string>();
        collect(d, s);
        setPaths([...s].sort());
      })
      .catch((e) => setError(String(e)));
  }, []);

  async function run() {
    if (!paths) return;
    setBusy(true); setDone(0); setResult(null);
    const zip = new JSZip();
    const files: { path: string; bytes: number; type: string }[] = [];
    const failed: string[] = [];
    let i = 0;
    const worker = async () => {
      while (i < paths.length) {
        const p = paths[i++]!;
        try {
          const r = await fetch(p);
          if (!r.ok) throw new Error(String(r.status));
          const b = await r.blob();
          zip.file(p.replace(/^\/+/, ""), b);
          files.push({ path: p, bytes: b.size, type: b.type });
        } catch {
          failed.push(p);
        }
        setDone((n) => n + 1);
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    files.sort((a, b) => a.path.localeCompare(b.path));
    failed.sort();
    zip.file("manifest.json", JSON.stringify({ origin: window.location.origin, generatedAt: new Date().toISOString(), files, failed }, null, 2));
    const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "element-guide-images.zip";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    setResult({ saved: files.length, failed });
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-2xl p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Guide image export</h1>
      {error && <p>Could not load the export data: {error}</p>}
      {paths && <p>{paths.length} distinct images</p>}
      <button type="button" className="rounded border px-4 py-2" disabled={!paths || busy} onClick={run}>
        Download all guide images (.zip)
      </button>
      {busy && paths && <p>{done} of {paths.length}</p>}
      {result && (
        <div>
          <p>Saved {result.saved} files, {result.failed.length} failed</p>
          {result.failed.length > 0 && <ul className="list-disc pl-6 text-sm">{result.failed.map((f) => <li key={f}>{f}</li>)}</ul>}
        </div>
      )}
    </main>
  );
}
