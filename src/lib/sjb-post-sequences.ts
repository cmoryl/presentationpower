import designs from './sjb-social-calendar-designs.json';
import type { SjbCalendarFormat, SjbCalendarSequence } from './sjb-calendar-formats';

const singles = import.meta.glob<{ url: string }>('../assets/sjb-calendar/*.jpg.asset.json', { eager: true, import: 'default' });
const shared = import.meta.glob<{ url: string }>('../assets/sjb-sequences/*.jpg.asset.json', { eager: true, import: 'default' });
const sizes: Partial<Record<SjbCalendarFormat, string>> = { 'linkedin-portrait': '1350', 'instagram-carousel': '1350', 'linkedin-square': '1080', 'story-sequence': '1920' };
const frames = {
  set2: { '1350': 'DAHapAooonM', '1080': 'DAHapHBhr1A', '1920': 'DAHapMc9w6E' },
  set4: { '1350': 'DAHapBqBImY', '1080': 'DAHapMmFbks', '1920': 'DAHapIKzcRk' },
} as const;
const roles = ['logo-cover', 'headline', 'details', 'tickets'];

/** Four untouched Canva pictures, assembled per post; not a newly saved Canva document. */
export function sjbAssembledPostSequence(post: string, mode: string, format: SjbCalendarFormat): SjbCalendarSequence | null {
  if (mode !== 'set2' && mode !== 'set4') return null;
  const size = sizes[format];
  if (!size) return null;
  const source = (designs as Record<string, Record<string, Record<string, string>>>)[post]?.[mode]?.[size];
  if (!source) return null;
  const frame = frames[mode][size as keyof typeof frames.set2];
  const cover = shared[`../assets/sjb-sequences/${frame}-page-1.jpg.asset.json`]?.url;
  const headline = singles[`../assets/sjb-calendar/${source}.jpg.asset.json`]?.url;
  const details = shared[`../assets/sjb-sequences/${frame}-page-2.jpg.asset.json`]?.url;
  const tickets = shared[`../assets/sjb-sequences/${frame}-page-3.jpg.asset.json`]?.url;
  if (!cover || !headline || !details || !tickets) return null;
  return {
    provenance: 'assembled-canva-pages',
    sourceCanvaUrls: [frame, source].map(id => `https://www.canva.com/design/${id}/edit`),
    pages: [cover, headline, details, tickets].map((url, i) => ({ previewUrl: url, downloadUrl: url, downloadName: `san-juan-bowl-${mode}-post-${post}-${size}-${roles[i]}.jpg` })),
  };
}