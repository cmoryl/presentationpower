import { describe, it, expect } from 'vitest';
import { SJB_CANVA_GALLERY, filterSjbCanvaDesigns } from '../sjb-canva-gallery';
describe('Bowl Canva gallery', () => {
  it('keeps all eleven pending Canva revisions unsaved', () => {
    const drafts = SJB_CANVA_GALLERY.filter(d => d.status === 'draft');
    expect(drafts).toHaveLength(11);
    expect(drafts.filter(d => d.collectionId === 'stadium-night')).toHaveLength(6);
    expect(drafts.filter(d => d.collectionId === 'bold-graphic')).toHaveLength(5);
  });
  it('uses actual Canva sizes, not the old square label', () => {
    expect(SJB_CANVA_GALLERY.find(d => d.id === 'DAHZ9nvVT-Q')).toMatchObject({ width: 1080, height: 1440 });
    expect(SJB_CANVA_GALLERY.find(d => d.id === 'DAHZ9qo9-Do')).toMatchObject({ width: 1200, height: 630 });
    expect(SJB_CANVA_GALLERY.some(d => d.width === 1080 && d.height === 1080)).toBe(false);
  });
  it('combines collection, size and ad type without inventing unavailable sizes', () => {
    expect(filterSjbCanvaDesigns('bold-graphic', '1080×1920', 'Instagram Story').map(d => d.id)).toEqual(['DAHZ9tOPYr4']);
    expect(filterSjbCanvaDesigns('launch', '1600×900', 'all')).toEqual([]);
  });
});
