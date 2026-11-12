import { useState } from 'react';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/design-system/element';
import { SjbSequenceViewer } from './SjbSequenceViewer';
import { SJB_SEQUENCE_PAGE_ORDER } from '@/lib/sjb-campaign-sequence-masters';
import type { SjbCalendarSequence } from '@/lib/sjb-calendar-formats';

export interface SjbSavedSequenceProps {
  sequence: SjbCalendarSequence;
  title: string;
  width: number;
  height: number;
  story: boolean;
  displayHeight?: number;
}

/** Downloads the same cleaned source bytes the player shows, without DOM rasterization. */
export function SjbSavedSequence({ sequence, title, width, height, story, displayHeight }: SjbSavedSequenceProps) {
  const [busy, setBusy] = useState<'pdf' | 'zip' | null>(null);
  async function save(kind: 'pdf' | 'zip') {
    setBusy(kind);
    try {
      const bytes = await Promise.all(sequence.pages.map(async page => {
        const response = await fetch(page.downloadUrl);
        if (!response.ok) throw new Error('A picture could not be downloaded.');
        return new Uint8Array(await response.arrayBuffer());
      }));
      let blob: Blob;
      if (kind === 'zip') {
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        bytes.forEach((data, i) => zip.file(sequence.pages[i].downloadName, data));
        blob = await zip.generateAsync({ type: 'blob' });
      } else {
        const { jsPDF } = await import('jspdf');
        const orientation = width > height ? 'landscape' : 'portrait';
        const pdf = new jsPDF({ orientation, unit: 'pt', format: [width, height], compress: true });
        bytes.forEach((data, i) => {
          if (i) pdf.addPage([width, height], orientation);
          pdf.addImage(data, 'JPEG', 0, 0, width, height, undefined, 'NONE');
        });
        blob = pdf.output('blob');
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sequence.pages[1].downloadName.replace(/-headline\.jpg$/, '')}-sequence.${kind}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The sequence could not be downloaded.');
    } finally { setBusy(null); }
  }
  return <div className="space-y-3">
    <SjbSequenceViewer key={sequence.pages[1].previewUrl + height} pages={sequence.pages.map(p => p.previewUrl)} labels={SJB_SEQUENCE_PAGE_ORDER} variant={story ? 'story' : 'carousel'} width={width} height={height} title={title} displayHeight={displayHeight} />
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void save('zip')}>{busy === 'zip' ? <Loader2 className="animate-spin" /> : <Download />}All four pictures</Button>
      {!story && <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void save('pdf')}>{busy === 'pdf' ? <Loader2 className="animate-spin" /> : <Download />}Carousel PDF</Button>}
      {sequence.sourceCanvaUrls?.map((url, i) => <Button key={url} asChild variant="outline" size="sm"><a href={url} target="_blank" rel="noreferrer"><ExternalLink />{i === 0 ? 'Shared Canva pages' : 'Post headline in Canva'}</a></Button>)}
    </div>
  </div>;
}