import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Copy, Download, Link2, Maximize2, Trash2, X } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { deleteSet5Asset } from '@/lib/sjb-set5-removals.functions';
import { availableSet5Assets, availableSet5Packs, groupedSet5Assets, set5RemovalsOptions } from '@/lib/sjb-set5-availability';
import { Button } from '@/design-system/element';
import { SjbLink, SjbShell } from '@/components/events/SjbShare';
import { type SjbSet5Asset } from '@/lib/sjb-set5-assets';
import { set5CreationPrompt } from '@/lib/sjb-set5-prompts';

function PromptBlock({ asset }: { asset: SjbSet5Asset }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const prompt = set5CreationPrompt(asset);
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt('Copy creation prompt', prompt); }
  }
  return <div className="mt-3 border-t border-border pt-3">
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? 'Hide creation prompt' : 'Creation prompt'}</Button>
      <Button variant="ghost" size="sm" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? 'Copied' : 'Copy prompt'}</Button>
    </div>
    {open && <p className="mt-2 max-h-48 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed text-muted-foreground">{prompt}</p>}
  </div>;
}

async function saveAsset(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Download unavailable. Please try again.');
  const local = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = local; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(local), 2000);
}

export function SjbSet5Assets() {
  const isAdmin = useIsAdmin();
  const removeAsset = useServerFn(deleteSet5Asset);
  const queryClient = useQueryClient();
  const { data: removed } = useSuspenseQuery(set5RemovalsOptions);
  const assets = availableSet5Assets(removed);
  const packs = availableSet5Packs(removed);
  const [pendingDelete, setPendingDelete] = useState<SjbSet5Asset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const [group, setGroup] = useState('All assets');
  const [ground, setGround] = useState('Light');
  const [selected, setSelected] = useState<SjbSet5Asset | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const sections = groupedSet5Assets(assets);
  const groupNames = ['All assets', ...sections.map(s => s.group)];
  const visibleSections = sections.filter(s => group === 'All assets' || s.group === group);
  const visibleCount = visibleSections.reduce((sum, s) => sum + s.assets.length, 0);
  const previewGround = ground === 'Dark' ? 'bg-foreground' : 'bg-muted';
  useEffect(() => { if (selected) dialog.current?.showModal(); else dialog.current?.close(); }, [selected]);
  useEffect(() => { if (pendingDelete) deleteDialog.current?.showModal(); else deleteDialog.current?.close(); }, [pendingDelete]);
  useEffect(() => { if (selected && removed.includes(selected.id)) setSelected(null); }, [removed, selected]);
  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true); setError('');
    try {
      const { assetId } = await removeAsset({ data: { assetId: pendingDelete.id } });
      queryClient.setQueryData<string[]>(set5RemovalsOptions.queryKey, current => [...new Set([...(current ?? []), assetId])]);
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: set5RemovalsOptions.queryKey });
    } catch { setError('Asset could not be deleted. Please try again.'); }
    finally { setDeleting(false); }
  }
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
        {packs.map(pack => <div key={pack.filename} className="min-w-0"><h2 className="font-semibold">{pack.title}</h2><Button className="mt-3" variant="outline" size="sm" disabled={busy === pack.filename} onClick={() => download(pack.url, pack.filename)}><Download />{busy === pack.filename ? 'Preparing…' : `Download ZIP · ${pack.size}`}</Button></div>)}
      </section>
      <p className="mt-5 border-l-2 border-border pl-3 text-sm leading-relaxed text-muted-foreground">New Set 5 variations include eight background compositions in native and 12,000px enlarged versions, plus four transparent objects. These are AI-created matching artwork, not exact Canva originals or real venue photographs; the new additions are individual downloads, not included in the existing ZIP packs. Other 12,000px backgrounds include cleaned enlarged Canva originals and separately labelled AI-edited detail rebuilds. These are not native 12K images: enlargement adds pixels, not recovered detail; rebuilds may change small details. Each asset lists its actual source resolution. The email original was recovered at 840 × 426, below the Canva catalogue's 1,200 × 608. Existing objects and cinematic effects have native detail up to 1,920px. Vector effects scale independently; layered SVGs contain raster pieces, not recovered original layers. RGB assets; final billboard suitability depends on size, viewing distance and printer requirements. Saved Canva designs are unchanged.</p>
      {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <label htmlFor="set5-category" className="grid gap-1.5 text-sm font-medium">Asset type<select id="set5-category" value={group} onChange={e => setGroup(e.target.value)} className="h-10 max-w-full rounded-md border border-input bg-background px-3 text-foreground focus-visible:ring-2 focus-visible:ring-ring">{groupNames.map(g => <option key={g}>{g}</option>)}</select></label>
        <fieldset><legend className="mb-1.5 text-sm font-medium">Preview background</legend><div className="flex gap-1">{['Light', 'Dark'].map(g => <Button key={g} variant={ground === g ? 'default' : 'outline'} size="sm" aria-pressed={ground === g} onClick={() => setGround(g)}>{g}</Button>)}</div></fieldset>
      </div>
      <p className="mt-5 text-sm text-muted-foreground">{visibleCount} assets</p>
      {visibleSections.map(section => <section key={section.group} aria-label={section.group} className="mt-8">
        <h2 className="border-b border-border pb-2 text-xl font-semibold">{section.group}<span className="ml-2 text-sm font-normal text-muted-foreground">{section.assets.length}</span></h2>
        <div className="mt-4 grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {section.assets.map(asset => <article key={asset.id} className="min-w-0 overflow-hidden rounded-lg border border-border bg-background">
          {isAdmin && <div className="flex justify-end px-2 pt-2"><Button variant="ghost" size="icon" aria-label={`Delete ${asset.title}`} title={`Delete ${asset.title}`} onClick={() => { setError(''); setPendingDelete(asset); }}><Trash2 className="size-4 text-destructive" /></Button></div>}
          <Button variant="ghost" aria-label={`Enlarge ${asset.title}`} onClick={() => setSelected(asset)} className={`relative block h-64 w-full rounded-none p-3 hover:bg-transparent ${previewGround}`}><img src={asset.previewUrl} alt={asset.title} loading="lazy" className="h-full w-full object-contain" /><Maximize2 className="absolute bottom-3 right-3 rounded bg-background text-foreground" aria-hidden /></Button>
          <div className="p-4"><p className="text-xs text-muted-foreground">{asset.category}</p><h3 className="mt-1 font-semibold">{asset.title}</h3><p className="mt-1 text-sm text-muted-foreground">{asset.dimensions}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{asset.note}</p><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={busy === asset.filename} onClick={() => download(asset.downloadUrl, asset.filename)}><Download />{busy === asset.filename ? 'Preparing…' : `Save ${asset.filename.split('.').pop()?.toUpperCase()}`}</Button>{asset.vectorUrl && <Button variant="outline" size="sm" onClick={() => download(asset.vectorUrl ?? '', asset.filename.replace(/\.png$/, '.svg'))}><Download />Save SVG</Button>}</div></div>
        </article>)}
        </div>
      </section>)}
      <dialog ref={dialog} onClose={() => setSelected(null)} onCancel={() => setSelected(null)} aria-labelledby="set5-preview-title" className="fixed inset-0 m-auto max-h-[92dvh] w-[min(1100px,94vw)] overflow-auto rounded-lg border border-border bg-background p-5 text-foreground shadow-xl backdrop:bg-foreground/60">
        {selected && <><div className="mb-4 flex items-start justify-between gap-3"><div><h2 id="set5-preview-title" className="text-lg font-semibold">{selected.title}</h2><p className="text-sm text-muted-foreground">{selected.dimensions} · {selected.note}</p></div><Button variant="ghost" size="icon" aria-label="Close preview" onClick={() => setSelected(null)}><X /></Button></div><div className={`flex min-h-64 items-center justify-center p-4 ${previewGround}`}><img src={selected.previewUrl} alt={selected.title} className="max-h-[65dvh] max-w-full object-contain" /></div><Button className="mt-4" variant="outline" disabled={busy === selected.filename} onClick={() => download(selected.downloadUrl, selected.filename)}><Download />Save original</Button>{error && <p role="alert" className="mt-3 text-destructive">{error}</p>}</>}
      </dialog>
      <dialog ref={deleteDialog} onCancel={e => { if (deleting) e.preventDefault(); else setPendingDelete(null); }} onClose={() => setPendingDelete(null)} aria-labelledby="set5-delete-title" className="fixed inset-0 m-auto w-[min(440px,94vw)] rounded-lg border border-border bg-background p-6 text-foreground shadow-xl backdrop:bg-foreground/60">
        {pendingDelete && <><h2 id="set5-delete-title" className="text-lg font-semibold">Delete {pendingDelete.title}?</h2><p className="mt-3 text-sm text-muted-foreground">Remove this asset from both Set 5 viewing pages. Its download will no longer appear. Any existing ZIP pack containing it will also be hidden. Canva designs, source files and previously downloaded copies remain unchanged.</p><div className="mt-6 flex justify-end gap-2"><Button variant="outline" disabled={deleting} onClick={() => setPendingDelete(null)}>Cancel</Button><Button variant="destructive" disabled={deleting} onClick={confirmDelete}><Trash2 />{deleting ? 'Deleting…' : 'Delete asset'}</Button></div>{error && <p role="alert" className="mt-3 text-destructive">{error}</p>}</>}
      </dialog>
    </div>
  </SjbShell>;
}