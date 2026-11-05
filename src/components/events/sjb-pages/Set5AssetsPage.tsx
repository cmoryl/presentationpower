import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Download, Link2, Maximize2, X } from 'lucide-react';
import { Button } from '@/design-system/element';
import { SjbLink, SjbShell } from '@/components/events/SjbShare';
import { SJB_SET5_ASSETS, SJB_SET5_PACKS, type SjbSet5Asset } from '@/lib/sjb-set5-assets';

async function saveAsset(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Download unavailable. Please try again.');
  const local = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = local; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(local), 2000);
}

export function SjbSet5Assets() {
  const [category, setCategory] = useState('All assets');
  const [ground, setGround] = useState('Light');
  const [selected, setSelected] = useState<SjbSet5Asset | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const categories = ['All assets', ...new Set(SJB_SET5_ASSETS.map(a => a.category))];
  const visible = SJB_SET5_ASSETS.filter(a => category === 'All assets' || a.category === category);
  const previewGround = ground === 'Dark' ? 'bg-foreground' : 'bg-muted';
  useEffect(() => { if (selected) dialog.current?.showModal(); else dialog.current?.close(); }, [selected]);
  async function download(url: string, filename: string) {
    setBusy(filename); setError('');
    try { await saveAsset(url, filename); }
    catch { setError('Download unavailable. Please try again.'); }
    finally { setBusy(null); }
  }
  return <SjbShell>
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-8 text-foreground sm:px-8">
      <SjbLink page="social" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"><ArrowLeft className="size-4" />Social designs</SjbLink>
      <header className="mt-5 flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6">
        <div><p className="text-sm text-muted-foreground">TransPerfect San Juan Bowl · Design Set 5</p><h1 className="mt-1 text-3xl font-bold">Design assets</h1></div>
        <Button variant="outline" onClick={async () => {
          const url = `${window.location.origin}/share/san-juan-bowl/set-5-assets`;
          try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
          catch { window.prompt('Copy asset viewing link', url); }
        }}>{copied ? <Check /> : <Link2 />}{copied ? 'Link copied' : 'Copy viewing link'}</Button>
      </header>
      <section aria-label="Complete download packs" className="grid gap-4 border-b border-border py-6 md:grid-cols-3">
        {SJB_SET5_PACKS.map(pack => <div key={pack.filename} className="min-w-0"><h2 className="font-semibold">{pack.title}</h2><Button className="mt-3" variant="outline" size="sm" disabled={busy === pack.filename} onClick={() => download(pack.url, pack.filename)}><Download />{busy === pack.filename ? 'Preparing…' : `Download ZIP · ${pack.size}`}</Button></div>)}
      </section>
      <p className="mt-5 border-l-2 border-border pl-3 text-sm leading-relaxed text-muted-foreground">Matching rebuilt artwork, not recovered original layers. Raster objects and cinematic effects have native detail up to 1,920px; 3,000px and 6,000px composites do not add raster detail. Vector effects scale independently. Layered SVGs contain raster pieces. RGB assets; final billboard suitability depends on size, viewing distance and printer requirements. Saved Canva designs are unchanged.</p>
      {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <label htmlFor="set5-category" className="grid gap-1.5 text-sm font-medium">Asset type<select id="set5-category" value={category} onChange={e => setCategory(e.target.value)} className="h-10 max-w-full rounded-md border border-input bg-background px-3 text-foreground focus-visible:ring-2 focus-visible:ring-ring">{categories.map(c => <option key={c}>{c}</option>)}</select></label>
        <fieldset><legend className="mb-1.5 text-sm font-medium">Preview background</legend><div className="flex gap-1">{['Light', 'Dark'].map(g => <Button key={g} variant={ground === g ? 'default' : 'outline'} size="sm" aria-pressed={ground === g} onClick={() => setGround(g)}>{g}</Button>)}</div></fieldset>
      </div>
      <p className="mt-5 text-sm text-muted-foreground">{visible.length} assets</p>
      <div className="mt-4 grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(asset => <article key={asset.id} className="min-w-0 overflow-hidden rounded-lg border border-border bg-background">
          <Button variant="ghost" aria-label={`Enlarge ${asset.title}`} onClick={() => setSelected(asset)} className={`relative block h-64 w-full rounded-none p-3 hover:bg-transparent ${previewGround}`}><img src={asset.previewUrl} alt={asset.title} loading="lazy" className="h-full w-full object-contain" /><Maximize2 className="absolute bottom-3 right-3 rounded bg-background text-foreground" aria-hidden /></Button>
          <div className="p-4"><p className="text-xs text-muted-foreground">{asset.category}</p><h2 className="mt-1 font-semibold">{asset.title}</h2><p className="mt-1 text-sm text-muted-foreground">{asset.dimensions}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{asset.note}</p><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={busy === asset.filename} onClick={() => download(asset.downloadUrl, asset.filename)}><Download />{busy === asset.filename ? 'Preparing…' : `Save ${asset.filename.split('.').pop()?.toUpperCase()}`}</Button>{asset.vectorUrl && <Button variant="outline" size="sm" onClick={() => download(asset.vectorUrl ?? '', asset.filename.replace(/\.png$/, '.svg'))}><Download />Save SVG</Button>}</div></div>
        </article>)}
      </div>
      <dialog ref={dialog} onClose={() => setSelected(null)} onCancel={() => setSelected(null)} aria-labelledby="set5-preview-title" className="fixed inset-0 m-auto max-h-[92dvh] w-[min(1100px,94vw)] overflow-auto rounded-lg border border-border bg-background p-5 text-foreground shadow-xl backdrop:bg-foreground/60">
        {selected && <><div className="mb-4 flex items-start justify-between gap-3"><div><h2 id="set5-preview-title" className="text-lg font-semibold">{selected.title}</h2><p className="text-sm text-muted-foreground">{selected.dimensions} · {selected.note}</p></div><Button variant="ghost" size="icon" aria-label="Close preview" onClick={() => setSelected(null)}><X /></Button></div><div className={`flex min-h-64 items-center justify-center p-4 ${previewGround}`}><img src={selected.previewUrl} alt={selected.title} className="max-h-[65dvh] max-w-full object-contain" /></div><Button className="mt-4" variant="outline" disabled={busy === selected.filename} onClick={() => download(selected.downloadUrl, selected.filename)}><Download />Save original</Button>{error && <p role="alert" className="mt-3 text-destructive">{error}</p>}</>}
      </dialog>
    </div>
  </SjbShell>;
}