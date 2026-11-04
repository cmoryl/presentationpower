import { describe, it, expect } from 'vitest';
import { SJB_CANVA_GALLERY, filterSjbCanvaDesigns } from '../sjb-canva-gallery';
describe('Bowl Canva gallery', () => {
  it('keeps all eleven pending Canva revisions unsaved', () => {
    const drafts = SJB_CANVA_GALLERY.filter(d => d.status === 'draft' && d.collectionId !== 'email');
    expect(drafts).toHaveLength(11);
    expect(drafts.filter(d => d.collectionId === 'stadium-night')).toHaveLength(6);
    expect(drafts.filter(d => d.collectionId === 'bold-graphic')).toHaveLength(5);
  });
  it('uses actual Canva sizes, not the old square label', () => {
    expect(SJB_CANVA_GALLERY.find(d => d.id === 'DAHZ9nvVT-Q')).toMatchObject({ width: 1080, height: 1440 });
    expect(SJB_CANVA_GALLERY.find(d => d.id === 'DAHZ9qo9-Do')).toMatchObject({ width: 1200, height: 628 });
    expect(SJB_CANVA_GALLERY.some(d => d.collectionId !== 'tickets' && d.width === 1080 && d.height === 1080)).toBe(false);
  });
  it('combines collection, size and ad type without inventing unavailable sizes', () => {
    expect(filterSjbCanvaDesigns('bold-graphic', '1080×1920', 'Instagram Story').map(d => d.id)).toEqual(['DAHZ9tOPYr4']);
    expect(filterSjbCanvaDesigns('launch', '1600×900', 'all')).toEqual([]);
  });
  it('ticket campaign provides two supplied versions in five exact sizes', () => {
    const tickets = filterSjbCanvaDesigns('tickets', 'all', 'all');
    expect(tickets).toHaveLength(10);
    for (const size of ['1080×1350', '1080×1080', '1080×1920', '1600×900', '1200×628']) {
      expect(filterSjbCanvaDesigns('tickets', size, 'all')).toHaveLength(2);
    }
    expect(new Set(tickets.map(d => d.id)).size).toBe(10);
    expect(tickets.every(d => d.status === 'saved')).toBe(true);
  });
  it('email campaign covers heroes, headers and signature banners at double display resolution', () => {
    expect(filterSjbCanvaDesigns('email', 'all', 'all')).toHaveLength(9);
    for (const size of ['1200×600', '1200×300', '1200×200']) {
      expect(filterSjbCanvaDesigns('email', size, 'all')).toHaveLength(3);
    }
    expect(filterSjbCanvaDesigns('email', 'all', 'all').filter(d => d.status === 'draft')).toHaveLength(4);
  });
});
