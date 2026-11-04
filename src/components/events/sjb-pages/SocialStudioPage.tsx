import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, Maximize2, X } from 'lucide-react';
import { Button } from '@/design-system/element';
import { SjbLink, SjbShell } from '@/components/events/SjbShare';
import { SJB_EVENT } from '@/lib/san-juan-bowl';
import { SJB_CANVA_FOLDER_URL } from '@/lib/sjb-social-templates';
import { SJB_CANVA_COLLECTIONS, SJB_CANVA_GALLERY, filterSjbCanvaDesigns, sjbCanvaSize, type SjbCanvaGalleryDesign } from '@/lib/sjb-canva-gallery';

export function SjbSocialStudio() {
  const [collectionId, setCollectionId] = useState('all');
  const [size, setSize] = useState('all');
  const [adType, setAdType] = useState('all');
  const [selected, setSelected] = useState<SjbCanvaGalleryDesign | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const sizes = [...new Set(SJB_CANVA_GALLERY.map(sjbCanvaSize))];
  const types = [...new Set(SJB_CANVA_GALLERY.map(d => d.name))];
  const visible = filterSjbCanvaDesigns(collectionId, size, adType);
  useEffect(() => { if (selected) dialog.current?.showModal(); else dialog.current?.close(); }, [selected]);

  return <SjbShell>
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-8 text-foreground sm:px-8">
      <SjbLink page="kit" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"><ArrowLeft className="size-4" />Brand kit</SjbLink>
      <header className="mt-5 flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6">
        <div><p className="text-sm text-muted-foreground">{SJB_EVENT.name}</p><h1 className="mt-1 text-3xl font-bold">Social designs</h1><p className="mt-2 text-sm text-muted-foreground">Canva collection · {SJB_CANVA_GALLERY.length} designs · Preview edition</p></div>
        <Button asChild variant="outline"><a href={SJB_CANVA_FOLDER_URL} target="_blank" rel="noreferrer"><ExternalLink />Canva folder</a></Button>
      </header>
      <nav aria-label="Design collections" className="mt-6 flex flex-wrap gap-2">
        <Button variant={collectionId === 'all' ? 'default' : 'outline'} onClick={() => setCollectionId('all')} aria-pressed={collectionId === 'all'}>All collections</Button>
        {SJB_CANVA_COLLECTIONS.map(c => <Button key={c.id} variant={collectionId === c.id ? 'default' : 'outline'} aria-pressed={collectionId === c.id} onClick={() => setCollectionId(c.id)}>{c.name}</Button>)}
      </nav>
      <div className="mt-5 flex flex-wrap items-end gap-4">
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="sjb-size">Size<select id="sjb-size" value={size} onChange={e => setSize(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="all">All sizes</option>{sizes.map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="sjb-type">Ad type<select id="sjb-type" value={adType} onChange={e => setAdType(e.target.value)} className="h-10 max-w-full rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="all">All ad types</option>{types.map(t => <option key={t}>{t}</option>)}</select></label>
        <p role="status" className="pb-2 text-sm text-muted-foreground">{visible.length} designs</p>
      </div>
      <p className="mt-5 border-l-2 border-border pl-3 text-sm text-muted-foreground">Draft labels identify unsaved Canva revisions. Saved labels identify Canva snapshots, not campaign approval. Preview images are not full-resolution downloads.</p>
      {visible.length === 0 && <div className="py-20 text-center"><p>No designs in this selection.</p><Button variant="link" onClick={() => { setSize('all'); setAdType('all'); setCollectionId('all'); }}>Reset filters</Button></div>}
      {SJB_CANVA_COLLECTIONS.map(collection => {
        const designs = visible.filter(d => d.collectionId === collection.id);
        if (!designs.length) return null;
        return <section key={collection.id} aria-labelledby={`collection-${collection.id}`} className="mt-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3"><h2 id={`collection-${collection.id}`} className="text-xl font-bold">{collection.name}</h2><Button asChild variant="link" size="sm"><a href={`https://www.canva.com/folder/${collection.folderId}`} target="_blank" rel="noreferrer">Open collection<ExternalLink /></a></Button></div>
          {collection.id === 'stadium-night' && <p className="mb-5 text-sm text-muted-foreground">Historical Hiram Bithorn photography · Bryce Edwards, 2010 · <a href="https://creativecommons.org/licenses/by/2.0/" className="underline" target="_blank" rel="noreferrer">CC BY 2.0</a> · Cropped. Not current game-day photography.</p>}
          {collection.id === 'tickets' && <p className="mb-5 text-sm text-muted-foreground">Badge and conference-matchup versions · Five sizes · Two pages per Canva design. Supplied December artwork; outdated January page excluded. Adaptations pending final campaign review.</p>}
          {collection.id === 'email' && <p className="mb-5 text-sm text-muted-foreground">Heroes 1200×600 · Headers 1200×300 · Signature banners 1200×200. Intended display width: 600 px. Ticket header and signature refinements are unsaved drafts; email sending and ticket links are not configured.</p>}
          <div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {designs.map(d => <article key={d.id} className="min-w-0 overflow-hidden rounded-lg border border-border bg-background" data-canva-design={d.id}>
              <Button variant="ghost" className="relative block h-[360px] w-full rounded-none bg-muted p-3" aria-label={`Enlarge ${collection.name} ${d.name} ${sjbCanvaSize(d)}`} onClick={() => setSelected(d)}>
                <img src={d.previewUrl} alt={`${collection.name} — ${d.name}, ${sjbCanvaSize(d)}`} loading="lazy" className="h-full w-full object-contain" /><Maximize2 className="absolute bottom-3 right-3 rounded bg-background text-foreground" aria-hidden />
              </Button>
              <div className="p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold">{d.name}</h3><span className="text-xs text-muted-foreground">{d.status === 'draft' ? 'Draft · unsaved' : 'Saved in Canva'}</span></div><p className="mt-1 text-sm text-muted-foreground">{sjbCanvaSize(d)} px</p><Button asChild variant="outline" size="sm" className="mt-4"><a href={d.canvaUrl} target="_blank" rel="noreferrer"><ExternalLink />{d.status === 'draft' ? 'Open Canva original' : 'Edit in Canva'}</a></Button></div>
            </article>)}
          </div>
        </section>;
      })}
      <dialog ref={dialog} onClose={() => setSelected(null)} onCancel={() => setSelected(null)} aria-labelledby="sjb-preview-title" className="fixed inset-0 m-auto max-h-[92dvh] w-[min(1100px,94vw)] overflow-auto rounded-lg border border-border bg-background p-5 text-foreground shadow-xl backdrop:bg-foreground/60">
        {selected && <><div className="mb-4 flex items-start justify-between gap-3"><div><h2 id="sjb-preview-title" className="text-lg font-semibold">{SJB_CANVA_COLLECTIONS.find(c => c.id === selected.collectionId)?.name} · {selected.name}</h2><p className="text-sm text-muted-foreground">{sjbCanvaSize(selected)} px · {selected.status === 'draft' ? 'Unsaved draft' : 'Saved Canva snapshot'}</p></div><Button variant="ghost" size="icon" aria-label="Close preview" onClick={() => setSelected(null)}><X /></Button></div><img src={selected.previewUrl} alt={selected.name} className="mx-auto max-h-[68dvh] max-w-full object-contain" /><Button asChild variant="outline" className="mt-4"><a href={selected.canvaUrl} target="_blank" rel="noreferrer"><ExternalLink />Open in Canva</a></Button></>}
      </dialog>
    </main>
  </SjbShell>;
}
