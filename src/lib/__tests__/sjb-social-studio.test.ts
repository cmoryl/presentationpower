import { describe, expect, it } from 'vitest';
import { SJB_SOCIAL_STUDIO_COLLECTIONS, SJB_SOCIAL_STUDIO_DESIGNS, sjbSocialStudioSequences, filterSjbSocialStudio } from '../sjb-social-studio';
import { SJB_CALENDAR_MODES, SJB_CALENDAR_POSTS, SJB_CALENDAR_SIZES, sjbCalendarDesign } from '../sjb-social-calendar';
import { sjbProjection } from '../sjb-projections';
import { SJB_ADVERTISING_FORMATS } from '../sjb-advertising-designs';

describe('Bowl social page selection', () => {
  it('searches post names case-insensitively with existing filters', () => {
    const results = filterSjbSocialStudio('set2', '1080×1350', 'all', '  TICKETS reminder  ');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ post: '02', collectionId: 'set2', height: 1350 });
    expect(filterSjbSocialStudio('set2', '1080×1350', 'TV announcement', 'tickets')).toHaveLength(0);
  });
  it('searches style names and restores all designs when cleared', () => {
    expect(filterSjbSocialStudio('all', 'all', 'all', 'spotlight')).toHaveLength(103);
    expect(filterSjbSocialStudio('all', 'all', 'all', '')).toHaveLength(421);
    expect(filterSjbSocialStudio('all', 'all', 'all', 'no-matching-post')).toHaveLength(0);
  });
  it('provides both requested custom dimensions in every active style with distinct real Canva links', () => {
    for (const style of ['light', 'set2', 'set3', 'set4']) {
      for (const size of ['160×600', '600×160']) {
        const designs = filterSjbSocialStudio(style, size, 'all', '');
        expect(designs).toHaveLength(1);
        expect(designs[0].advertising).toBe(true);
        expect(designs[0].canvaUrl).toMatch(/^https:\/\/www.canva.com\/design\/D[\w-]{10}\/edit$/);
      }
    }
    expect(new Set(SJB_ADVERTISING_FORMATS.flatMap(f => [...f.ids])).size).toBe(76);
  });
  it('uses precisely the current calendar styles, order and labels', () => {
    expect(SJB_SOCIAL_STUDIO_COLLECTIONS.map(c => ({ id: c.id, label: c.name }))).toEqual(SJB_CALENDAR_MODES);
    expect(SJB_SOCIAL_STUDIO_COLLECTIONS.map(c => c.id)).toEqual(['light', 'set2', 'set3', 'set4']);
  });
  it('uses every calendar size and live file for all four current styles', () => {
    for (const { id: mode } of SJB_CALENDAR_MODES) {
      const collection = mode;
      const singles = SJB_SOCIAL_STUDIO_DESIGNS.filter(d => d.collectionId === collection && d.post);
      expect(singles).toHaveLength(84);
      for (const post of SJB_CALENDAR_POSTS) for (const size of SJB_CALENDAR_SIZES) {
        const saved = sjbCalendarDesign(post.n, mode, size.id);
        expect(singles.find(d => d.id === saved?.id)).toMatchObject({ canvaUrl: saved?.canvaUrl, previewUrl: saved?.previewUrl ?? '', width: 1080, height: size.h });
      }
    }
  });
  it('keeps extra portrait projection sizes inside their actual matching calendar look', () => {
    const projections = SJB_SOCIAL_STUDIO_DESIGNS.filter(d => d.name === 'Bowl projections');
    expect(projections.filter(d => d.collectionId === 'set2').map(d => d.id)).toEqual(['1350', '1440', '1920'].map(size => sjbProjection('night', size).id));
    expect(projections.filter(d => d.collectionId === 'set4').map(d => d.id)).toEqual(['1350', '1440', '1920'].map(size => sjbProjection('blue', size).id));
    expect(projections.filter(d => d.collectionId === 'light').map(d => d.id)).toEqual(['DAHaqb6b4nw', 'DAHaqTn7K_0', 'DAHaqTaPWRc']);
    expect(projections.filter(d => d.height === 1440)).toHaveLength(3);
    expect(projections.some(d => d.collectionId === 'dark')).toBe(false);
  });
  it('includes saved multipage files from the same calendar post', () => {
    const design = SJB_SOCIAL_STUDIO_DESIGNS.find(d => d.post === '04' && d.mode === 'light');
    expect(design).toBeDefined();
    if (!design) return;
    expect(sjbSocialStudioSequences(design)).toHaveLength(4);
    expect(sjbSocialStudioSequences(design).every(s => s.url.startsWith('https://www.canva.com/design/'))).toBe(true);
  });
});