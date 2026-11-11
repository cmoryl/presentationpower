import { sjbCanvaSize, type SjbCanvaGalleryDesign } from './sjb-canva-gallery';
import { SJB_CALENDAR_MODES, SJB_CALENDAR_POSTS, SJB_CALENDAR_SIZES, sjbCalendarDesign, type SjbCalendarMode } from './sjb-social-calendar';
import { SJB_PROJECTION_SIZES, sjbProjection, type SjbProjectionLook } from './sjb-projections';
import { SJB_CALENDAR_FORMATS, sjbCalendarSequenceCanvaUrl } from './sjb-calendar-formats';

/** Social-page selection only; issued registries and calendar looks stay intact. */
export const SJB_SOCIAL_STUDIO_COLLECTIONS = SJB_CALENDAR_MODES.map(mode => ({ id: mode.id, name: mode.label, blurb: 'Feed · Square · Story · Carousels' }));
const PROJECTION_LOOKS: Partial<Record<SjbCalendarMode, SjbProjectionLook>> = { set2: 'night', set4: 'blue' };

export interface SjbSocialStudioDesign extends Omit<SjbCanvaGalleryDesign, 'collectionId'> {
  collectionId: SjbCalendarMode;
  post?: string;
  mode?: SjbCalendarMode;
  waitingOn?: string;
}

export const SJB_SOCIAL_STUDIO_DESIGNS: readonly SjbSocialStudioDesign[] = SJB_SOCIAL_STUDIO_COLLECTIONS.flatMap(collection => {
  const mode = collection.id;
  const singles: SjbSocialStudioDesign[] = SJB_CALENDAR_POSTS.flatMap(post => SJB_CALENDAR_SIZES.flatMap(size => {
    const saved = sjbCalendarDesign(post.n, mode, size.id);
    if (!saved) return [];
    return [{ id: saved.id, collectionId: collection.id, name: post.title, width: size.w, height: size.h,
      previewUrl: saved.previewUrl ?? '', canvaUrl: saved.canvaUrl, status: 'saved' as const,
      provenance: 'artistic-render' as const, post: post.n, mode, waitingOn: post.waitingOn }];
  }));
  const projectionLook = PROJECTION_LOOKS[mode];
  if (projectionLook) {
    for (const size of SJB_PROJECTION_SIZES) {
      const saved = sjbProjection(projectionLook, size.id);
      singles.push({ id: saved.id, collectionId: collection.id, name: 'Bowl projections', width: 1080,
        height: Number(size.id), previewUrl: saved.jpg ?? saved.png ?? '', canvaUrl: saved.canvaUrl,
        status: 'saved', provenance: 'artistic-render', waitingOn: 'Projected teams are placeholders, not an announced matchup' });
    }
  }
  return singles;
});

export function sjbSocialStudioSequences(design: SjbSocialStudioDesign) {
  const { post, mode } = design;
  if (!post || !mode) return [];
  return SJB_CALENDAR_FORMATS.filter(f => f.id !== 'single').flatMap(format => {
    const url = sjbCalendarSequenceCanvaUrl(post, mode, format.id);
    return url ? [{ label: format.label, url }] : [];
  });
}

export function filterSjbSocialStudio(collection: string, size: string, adType: string, search: string) {
  const terms = search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return SJB_SOCIAL_STUDIO_DESIGNS.filter(design => {
    const style = SJB_SOCIAL_STUDIO_COLLECTIONS.find(c => c.id === design.collectionId)?.name ?? '';
    const searchable = `${design.name} ${style} ${design.post ?? ''} ${sjbCanvaSize(design)}`.toLocaleLowerCase();
    return (collection === 'all' || design.collectionId === collection)
      && (size === 'all' || sjbCanvaSize(design) === size)
      && (adType === 'all' || design.name === adType)
      && terms.every(term => searchable.includes(term));
  });
}