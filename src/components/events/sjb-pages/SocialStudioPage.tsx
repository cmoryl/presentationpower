import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, ExternalLink, Maximize2, X } from 'lucide-react';
import { Button } from '@/design-system/element';
import { SjbLink, SjbShell } from '@/components/events/SjbShare';
import { SJB_EVENT } from '@/lib/san-juan-bowl';
import { SJB_CANVA_FOLDER_URL } from '@/lib/sjb-social-templates';
import { SJB_CANVA_COLLECTIONS, SJB_CANVA_GALLERY, filterSjbCanvaDesigns, sjbCanvaSize, type SjbCanvaGalleryDesign } from '@/lib/sjb-canva-gallery';
import coverSet1 from '@/assets/sjb-card-covers/set-1.jpg';
import coverSet2 from '@/assets/sjb-card-covers/set-2.jpg';
import coverSet3 from '@/assets/sjb-card-covers/set-3.jpg';
import coverSet4 from '@/assets/sjb-card-covers/set-4.jpg';
import coverSet5 from '@/assets/sjb-card-covers/set-5.jpg';
import coverSet6 from '@/assets/sjb-card-covers/set-6.jpg';
import coverAll from '@/assets/sjb-card-covers/all.jpg';

async function saveSocialImage(d: SjbCanvaGalleryDesign) {
  const name = `san-juan-bowl-${d.collectionId}-${d.name}-${sjbCanvaSize(d)}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  try {
    const blob = await (await fetch(d.previewUrl)).blob();
    const ext = blob.type.includes('jpeg') ? 'jpg' : blob.type.includes('webp') ? 'webp' : 'png';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${name}.${ext}`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch {
    window.open(d.previewUrl, '_blank', 'noopener');
  }
}

const SET_COVERS: Record<string, string> = {
  all: coverAll,
  'bold-graphic': coverSet1,
  'stadium-night': coverSet2,
  'action-spotlight': coverSet3,
  launch: coverSet4,
  'light-action': coverSet5,
  'light-cinematic': coverSet6,
};

export function SjbSocialStudio() {
  const [collectionId, setCollectionId] = useState('all');
  const [size, setSize] = useState('all');
  const [adType, setAdType] = useState('all');
  const [selected, setSelected] = useState<SjbCanvaGalleryDesign | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef(false);
  const [selectionCount, setSelectionCount] = useState(0);
  const sizes = [...new Set(SJB_CANVA_GALLERY.map(sjbCanvaSize))];
  const types = [...new Set(SJB_CANVA_GALLERY.map(d => d.name))];
  const visible = filterSjbCanvaDesigns(collectionId, size, adType);
  useEffect(() => { if (selected) dialog.current?.showModal(); else dialog.current?.close(); }, [selected]);
  useEffect(() => {
    if (!pendingScroll.current) return;
    pendingScroll.current = false;
    const target = document.getElementById(`collection-${collectionId}`) ?? results.current;
    target?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [collectionId, selectionCount]);

  return <SjbShell>
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-8 text-foreground sm:px-8">
      <SjbLink page="kit" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"><ArrowLeft className="size-4" />Brand kit</SjbLink>
      <header className="mt-5 flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6">
        <div><p className="text-sm text-muted-foreground">{SJB_EVENT.name}</p><h1 className="mt-1 text-3xl font-bold">Social designs</h1><p className="mt-2 text-sm text-muted-foreground">Canva collection · Preview edition</p></div>
        <Button asChild variant="outline"><a href={SJB_CANVA_FOLDER_URL} target="_blank" rel="noreferrer"><ExternalLink />Canva folder</a></Button>
      </header>
      <nav aria-label="Design campaigns" className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {[{ id: 'all', name: 'All campaigns', blurb: 'Every design set', accent: '#03002C' } as const, ...SJB_CANVA_COLLECTIONS].map(c => {
          const active = collectionId === c.id;
          return <button key={c.id} type="button" aria-pressed={active} onClick={() => { pendingScroll.current = true; setCollectionId(c.id); setSelectionCount(count => count + 1); }} className={`group overflow-hidden rounded-lg border bg-background text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-foreground/40'}`}>
            <span className="relative block h-28 overflow-hidden bg-muted">
              <img src={SET_COVERS[c.id]} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: c.accent }} />
            </span>
            <span className="block p-3"><span className="block text-sm font-semibold">{c.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{c.blurb}</span></span>
          </button>;
        })}
      </nav>
      <div ref={results} className="mt-5 flex scroll-mt-24 flex-wrap items-end gap-4">
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="sjb-size">Size<select id="sjb-size" value={size} onChange={e => setSize(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="all">All sizes</option>{sizes.map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="sjb-type">Ad type<select id="sjb-type" value={adType} onChange={e => setAdType(e.target.value)} className="h-10 max-w-full rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="all">All ad types</option>{types.map(t => <option key={t}>{t}</option>)}</select></label>
      </div>
      <p className="mt-5 border-l-2 border-border pl-3 text-sm text-muted-foreground">Draft labels identify unsaved Canva revisions. Saved labels identify Canva snapshots, not campaign approval. Preview images are not full-resolution downloads.</p>
      {visible.length === 0 && <div className="py-20 text-center"><p>No designs in this selection.</p><Button variant="link" onClick={() => { setSize('all'); setAdType('all'); setCollectionId('all'); }}>Reset filters</Button></div>}
      {SJB_CANVA_COLLECTIONS.map(collection => {
        const designs = visible.filter(d => d.collectionId === collection.id);
        if (!designs.length) return null;
        return <section key={collection.id} aria-labelledby={`collection-${collection.id}`} className="mt-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3"><h2 id={`collection-${collection.id}`} className="scroll-mt-24 text-xl font-bold">{collection.name}</h2><Button asChild variant="link" size="sm"><a href={`https://www.canva.com/folder/${collection.folderId}`} target="_blank" rel="noreferrer">Open campaign folder<ExternalLink /></a></Button></div>
          {collection.id === 'stadium-night' && <p className="mb-5 text-sm text-muted-foreground">Original Element canopy and football-action artwork · Artistic visualisations, not verified venue photography or a field-conversion plan.</p>}
          {designs.some(d => d.format) && <p className="mb-5 text-sm text-muted-foreground">Heroes 1200×600 · Headers 1200×300 · Signature banners 1200×200. Intended display width: 600 px. Email artwork is saved in Canva; email sending and ticket links are not configured.</p>}
          <div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {designs.map(d => <article key={d.id} className="min-w-0 overflow-hidden rounded-lg border border-border bg-background" data-canva-design={d.id}>
              <Button variant="ghost" className="relative block h-[360px] w-full rounded-none bg-muted p-3" aria-label={`Enlarge ${collection.name} ${d.name} ${sjbCanvaSize(d)}`} onClick={() => setSelected(d)}>
                <img src={d.previewUrl} alt={`${collection.name} — ${d.name}, ${sjbCanvaSize(d)}`} loading="lazy" className="h-full w-full object-contain" /><Maximize2 className="absolute bottom-3 right-3 rounded bg-background text-foreground" aria-hidden />
              </Button>
              <div className="p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold">{d.name}</h3><span className="text-xs text-muted-foreground">{d.status === 'draft' ? 'Draft · unsaved' : 'Saved in Canva'}</span></div><p className="mt-1 text-sm text-muted-foreground">{sjbCanvaSize(d)} px</p><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => saveSocialImage(d)} aria-label={`Save image: ${collection.name} ${d.name} ${sjbCanvaSize(d)}`}><Download />Save image</Button><Button asChild variant="outline" size="sm"><a href={d.canvaUrl} target="_blank" rel="noreferrer"><ExternalLink />{d.status === 'draft' ? 'Open Canva original' : 'Edit in Canva'}</a></Button></div></div>
            </article>)}
          </div>
        </section>;
      })}
      <dialog ref={dialog} onClose={() => setSelected(null)} onCancel={() => setSelected(null)} aria-labelledby="sjb-preview-title" className="fixed inset-0 m-auto max-h-[92dvh] w-[min(1100px,94vw)] overflow-auto rounded-lg border border-border bg-background p-5 text-foreground shadow-xl backdrop:bg-foreground/60">
        {selected && <><div className="mb-4 flex items-start justify-between gap-3"><div><h2 id="sjb-preview-title" className="text-lg font-semibold">{SJB_CANVA_COLLECTIONS.find(c => c.id === selected.collectionId)?.name} · {selected.name}</h2><p className="text-sm text-muted-foreground">{sjbCanvaSize(selected)} px · {selected.status === 'draft' ? 'Unsaved draft' : 'Saved Canva snapshot'}</p></div><Button variant="ghost" size="icon" aria-label="Close preview" onClick={() => setSelected(null)}><X /></Button></div><img src={selected.previewUrl} alt={selected.name} className="mx-auto max-h-[68dvh] max-w-full object-contain" /><Button variant="outline" className="mr-2 mt-4" onClick={() => saveSocialImage(selected)}><Download />Save image</Button><Button asChild variant="outline" className="mt-4"><a href={selected.canvaUrl} target="_blank" rel="noreferrer"><ExternalLink />Open in Canva</a></Button></>}
      </dialog>
    </main>
  </SjbShell>;
}
