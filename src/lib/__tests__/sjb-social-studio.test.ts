import { describe, expect, it } from 'vitest';
import { SJB_SOCIAL_STUDIO_COLLECTIONS, SJB_SOCIAL_STUDIO_DESIGNS, sjbSocialStudioSequences } from '../sjb-social-studio';
import { SJB_CALENDAR_POSTS, SJB_CALENDAR_SIZES, sjbCalendarDesign } from '../sjb-social-calendar';
import { sjbProjection } from '../sjb-projections';

describe('Bowl social page selection', () => {
  it('removes legacy Design Set 1 without deleting its source files', () => {
    expect(SJB_SOCIAL_STUDIO_COLLECTIONS.map(c => c.id)).not.toContain('bold-graphic');
    expect(SJB_SOCIAL_STUDIO_DESIGNS.some(d => d.collectionId === 'bold-graphic')).toBe(false);
  });
  it('removes legacy Design Set 4 on socials, not calendar Set 4', () => {
    expect(SJB_SOCIAL_STUDIO_COLLECTIONS.map(c => c.id)).not.toContain('launch');
    expect(SJB_SOCIAL_STUDIO_DESIGNS.some(d => d.collectionId === 'launch')).toBe(false);
    expect(sjbCalendarDesign('04', 'set4', '1350')?.id).toBeTruthy();
  });
  it('uses every calendar size and live file for the three matching retained sets', () => {
    for (const [collection, mode] of [['stadium-night', 'set2'], ['action-spotlight', 'set3'], ['light-action', 'light']] as const) {
      const singles = SJB_SOCIAL_STUDIO_DESIGNS.filter(d => d.collectionId === collection && d.post);
      expect(singles).toHaveLength(84);
      for (const post of SJB_CALENDAR_POSTS) for (const size of SJB_CALENDAR_SIZES) {
        const saved = sjbCalendarDesign(post.n, mode, size.id);
        expect(singles.find(d => d.id === saved?.id)).toMatchObject({ canvaUrl: saved?.canvaUrl, previewUrl: saved?.previewUrl ?? '', width: 1080, height: size.h });
      }
    }
  });
  it('places the three night projections in Set 2 only', () => {
    const projections = SJB_SOCIAL_STUDIO_DESIGNS.filter(d => d.name === 'Bowl projections');
    expect(projections.map(d => d.id)).toEqual(['1350', '1440', '1920'].map(size => sjbProjection('night', size).id));
    expect(projections.every(d => d.collectionId === 'stadium-night')).toBe(true);
  });
  it('includes saved multipage files from the same calendar post', () => {
    const design = SJB_SOCIAL_STUDIO_DESIGNS.find(d => d.post === '04' && d.mode === 'light');
    expect(design).toBeDefined();
    if (!design) return;
    expect(sjbSocialStudioSequences(design)).toHaveLength(4);
    expect(sjbSocialStudioSequences(design).every(s => s.url.startsWith('https://www.canva.com/design/'))).toBe(true);
  });
});