import { ExternalLink } from 'lucide-react';
import { Button } from '@/design-system/element';
import { SjbSequenceViewer } from './SjbSequenceViewer';
import { SjbPackButton } from './SjbPackButton';
import { SJB_SEQUENCE_PAGE_ORDER } from '@/lib/sjb-campaign-sequence-masters';
import { useCanvaSynced } from '@/lib/use-canva-sync';
import type { SjbCalendarSequence } from '@/lib/sjb-calendar-formats';

export interface SjbSavedSequenceProps {
  sequence: SjbCalendarSequence;
  title: string;
  width: number;
  height: number;
  story: boolean;
  displayHeight?: number;
}

/** Plays and downloads the newest pictures (Canva sync first, bundled originals otherwise). */
export function SjbSavedSequence({ sequence: raw, title, width, height, story, displayHeight }: SjbSavedSequenceProps) {
  const synced = useCanvaSynced();
  const pages = raw.pages.map((p, i) => {
    const [id, page] = raw.syncSources?.[i] ?? [null, 1];
    return { ...p, previewUrl: synced(id, p.previewUrl, page), downloadUrl: synced(id, p.downloadUrl, page) };
  });
  const base = pages[1]!.downloadName.replace(/-headline\.jpg$/, '');
  const pack = pages.map(p => ({ url: p.downloadUrl, name: p.downloadName }));
  return <div className="space-y-3">
    <SjbSequenceViewer key={pages[1]!.previewUrl + height} pages={pages.map(p => p.previewUrl)} labels={SJB_SEQUENCE_PAGE_ORDER} variant={story ? 'story' : 'carousel'} width={width} height={height} title={title} displayHeight={displayHeight} />
    <div className="flex flex-wrap gap-2">
      <SjbPackButton kind="zip" pages={pack} width={width} height={height} filename={`${base}-sequence.zip`} label="All four pictures" />
      {!story && <SjbPackButton kind="pdf" pages={pack} width={width} height={height} filename={`${base}-sequence.pdf`} label="Carousel PDF" />}
      {raw.sourceCanvaUrls?.map((url, i) => <Button key={url} asChild variant="outline" size="sm"><a href={url} target="_blank" rel="noreferrer"><ExternalLink />{i === 0 ? 'Shared Canva pages' : 'Post headline in Canva'}</a></Button>)}
    </div>
  </div>;
}
