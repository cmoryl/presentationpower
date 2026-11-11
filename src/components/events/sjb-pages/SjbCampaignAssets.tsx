import { Download } from 'lucide-react';
import { Button } from '@/design-system/element';
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
  </div>;
}
