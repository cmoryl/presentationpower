import { SJB_CANVA_COLLECTIONS, SJB_CANVA_GALLERY, type SjbCanvaGalleryDesign } from './sjb-canva-gallery';
import { SJB_CALENDAR_POSTS, SJB_CALENDAR_SIZES, sjbCalendarDesign, type SjbCalendarMode } from './sjb-social-calendar';
import { SJB_PROJECTION_SIZES, sjbProjection } from './sjb-projections';
import { SJB_CALENDAR_FORMATS, sjbCalendarSequenceCanvaUrl } from './sjb-calendar-formats';

/** Social-page selection only; issued registries and calendar looks stay intact. */
export const SJB_SOCIAL_STUDIO_COLLECTIONS = SJB_CANVA_COLLECTIONS.filter(c => c.id !== 'bold-graphic' && c.id !== 'launch');
const CALENDAR_MODES: Partial<Record<SjbCanvaGalleryDesign['collectionId'], SjbCalendarMode>> = {
  'stadium-night': 'set2', 'action-spotlight': 'set3', 'light-action': 'light',
};

export interface SjbSocialStudioDesign extends SjbCanvaGalleryDesign {
  post?: string;
  mode?: SjbCalendarMode;
  waitingOn?: string;
}

export const SJB_SOCIAL_STUDIO_DESIGNS: readonly SjbSocialStudioDesign[] = SJB_SOCIAL_STUDIO_COLLECTIONS.flatMap(collection => {
  const mode = CALENDAR_MODES[collection.id];
  if (!mode) return SJB_CANVA_GALLERY.filter(d => d.collectionId === collection.id);
  const singles: SjbSocialStudioDesign[] = SJB_CALENDAR_POSTS.flatMap(post => SJB_CALENDAR_SIZES.flatMap(size => {
    const saved = sjbCalendarDesign(post.n, mode, size.id);
    if (!saved) return [];
    return [{ id: saved.id, collectionId: collection.id, name: post.title, width: size.w, height: size.h,
      previewUrl: saved.previewUrl ?? '', canvaUrl: saved.canvaUrl, status: 'saved' as const,
      provenance: 'artistic-render' as const, post: post.n, mode, waitingOn: post.waitingOn }];
  }));
  if (collection.id === 'stadium-night') {
    for (const size of SJB_PROJECTION_SIZES) {
      const saved = sjbProjection('night', size.id);
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