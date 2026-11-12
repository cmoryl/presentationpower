import { Download, ExternalLink, Layers } from 'lucide-react';
import { useCanvaSynced } from '@/lib/use-canva-sync';
import { SJB_CAMPAIGN_SEQUENCE_MASTERS, SJB_SEQUENCE_PAGE_ORDER, sjbCanvaEditUrl, sjbCampaignSequencePictures } from '@/lib/sjb-campaign-sequence-masters';
import { Button } from '@/design-system/element';
import { SjbSequenceViewer } from '../SjbSequenceViewer';
import { SJB_CALENDAR_STYLE, SJB_CALENDAR_MARKS } from '@/lib/sjb-calendar-style';
import { SJB_SEQUENCE_BACKGROUNDS } from '@/lib/sjb-sequence-backgrounds';
import type { SjbCalendarMode } from '@/lib/sjb-social-calendar';
import shieldDark from '@/assets/san-juan-bowl/sjb-logo-dark.svg.asset.json';
import shieldLight from '@/assets/san-juan-bowl/sjb-logo-color.svg.asset.json';
import ticketeraWhite from '@/assets/sjb-calendar/partners/ticketera-white.png.asset.json';
import ticketeraColour from '@/assets/sjb-calendar/partners/ticketera-colour.png.asset.json';
import cbsWhite from '@/assets/sjb-calendar-style/cbs-white.svg.asset.json';
import cbsBlack from '@/assets/sjb-calendar-style/cbs-black.svg.asset.json';

interface Asset { name: string; url: string; note: string; dark?: boolean }

/** Reusable campaign pieces only — no finished ads. All files are existing registry artwork. */
export function sjbCampaignAssets(mode: SjbCalendarMode): Asset[] {
  const dark = mode !== 'light';
  const seq = SJB_SEQUENCE_BACKGROUNDS[mode];
  const list: Asset[] = [
    { name: 'Campaign background', url: SJB_CALENDAR_STYLE[mode].ground, note: 'Recovered from the Canva original', dark },
    { name: 'Headline page background', url: seq.headline, note: 'Sequence companion ground (AI-edited)', dark },
    { name: 'Details page background', url: seq.details, note: 'Sequence companion ground (AI-edited)', dark },
    { name: 'Tickets page background', url: seq.tickets, note: 'Sequence companion ground (AI-edited)', dark },
  ];
  if (mode === 'set3') list.push({ name: 'Player cut-out', url: SJB_CALENDAR_MARKS.player, note: 'Transparent PNG', dark });
  list.push(
    { name: 'San Juan Bowl shield', url: dark ? shieldDark.url : shieldLight.url, note: dark ? 'White-outline master (SVG)' : 'Full-colour master (SVG)', dark },
    { name: 'ACC logo', url: dark ? SJB_CALENDAR_MARKS.accWhite : SJB_CALENDAR_MARKS.accColor, note: dark ? 'White' : 'Colour', dark },
    { name: 'Sun Belt logo', url: SJB_CALENDAR_MARKS.sunBelt, note: 'Official mark', dark },
    { name: 'CBS Sports Network', url: dark ? cbsWhite.url : cbsBlack.url, note: dark ? 'White single colour (SVG)' : 'Black single colour (SVG)', dark },
    { name: 'Ticketera', url: dark ? ticketeraWhite.url : ticketeraColour.url, note: dark ? 'White' : 'Colour', dark },
  );
  return list;
}

export function SjbCampaignAssets({ mode, label }: { mode: SjbCalendarMode; label: string }) {
  const synced = useCanvaSynced();
  const masters = mode === 'set2' || mode === 'set3' || mode === 'set4' ? SJB_CAMPAIGN_SEQUENCE_MASTERS[mode] : [];
  return <div className="mb-8 rounded-lg border border-border p-5">
    <h3 className="text-base font-bold">{label} — design assets</h3>
    <p className="mb-4 mt-1 text-sm text-muted-foreground">Backgrounds and logos for building new pieces in this style. No finished ads; logos are the supplied files, unchanged.</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {sjbCampaignAssets(mode).map(a => <figure key={a.name} className="min-w-0 overflow-hidden rounded-md border border-border">
        <div className={`flex aspect-[4/3] items-center justify-center p-3 ${a.dark ? 'bg-[#03002C]' : 'bg-muted'}`}><img src={a.url} alt={a.name} loading="lazy" className="max-h-full max-w-full object-contain" /></div>
        <figcaption className="flex items-center justify-between gap-2 p-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{a.name}</span><span className="block truncate text-xs text-muted-foreground">{a.note}</span></span>
          <Button asChild variant="outline" size="sm"><a href={a.url} download target="_blank" rel="noreferrer" aria-label={`Download ${a.name}`}><Download /></a></Button></figcaption>
      </figure>)}
    </div>
    {masters.length > 0 && <section className="mt-6 border-t border-border pt-5" aria-labelledby={`${mode}-multipage`}>
      <h4 id={`${mode}-multipage`} className="flex items-center gap-2 text-sm font-bold"><Layers className="size-4" />Multi-page Canva files</h4>
      <p className="mt-1 text-xs text-muted-foreground">Four pages each: {SJB_SEQUENCE_PAGE_ORDER.join(' → ')}. Swap page 2 for any post headline.</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">{masters.map(m => {
        const bundled = sjbCampaignSequencePictures(m.id);
        const saved = bundled && { ...bundled, pages: bundled.pages.map((u, i) => synced(m.id, u, i + 1)) };
        return <div key={m.id} className="min-w-0">
          <Button asChild variant="outline" className="h-auto w-full justify-between py-3"><a href={sjbCanvaEditUrl(m.id)} target="_blank" rel="noreferrer" aria-label={`Open ${label} ${m.size} four-page Canva file`}><span className="text-left"><span className="block text-sm font-semibold">{m.size}</span><span className="block text-xs text-muted-foreground">4 pages · live Canva</span></span><ExternalLink /></a></Button>
          {saved && <><div className="mt-3"><SjbSequenceViewer pages={saved.pages} labels={SJB_SEQUENCE_PAGE_ORDER} variant={m.size.startsWith('Story') ? 'story' : 'carousel'} width={1080} height={m.size.startsWith('Story') ? 1920 : m.size.startsWith('Square') ? 1080 : 1350} title={`${label} ${m.size}`} displayHeight={320} /></div>{saved.zipUrl && <Button asChild size="sm" variant="outline" className="mt-3"><a href={saved.zipUrl} download><Download />All four pictures</a></Button>}</>}
        </div>;
      })}</div>
    </section>}
  </div>;
}
