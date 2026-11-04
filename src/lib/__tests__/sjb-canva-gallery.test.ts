import { describe, it, expect } from 'vitest';
import { SJB_CANVA_COLLECTIONS, SJB_CANVA_GALLERY, filterSjbCanvaDesigns } from '../sjb-canva-gallery';
describe('Bowl Canva gallery', () => {
  it('keeps reviewed campaign adaptations unsaved', () => {
    const drafts = SJB_CANVA_GALLERY.filter(d => d.status === 'draft' && !d.format && d.campaign !== 'tickets');
    expect(drafts).toHaveLength(9);
    expect(drafts.filter(d => d.collectionId === 'stadium-night')).toHaveLength(6);
    expect(drafts.filter(d => d.collectionId === 'bold-graphic')).toHaveLength(3);
    const originals = SJB_CANVA_GALLERY.filter(d => d.collectionId === 'bold-graphic' && !d.format && d.campaign !== 'tickets');
    expect(originals).toHaveLength(5);
    expect(originals.filter(d => d.status === 'saved')).toHaveLength(2);
    expect(originals.every(d => d.provenance === 'illustration')).toBe(true);
  });
  it('keeps all fourteen Stadium Night render revisions unsaved and traceable', () => {
    const stadium = filterSjbCanvaDesigns('stadium-night', 'all', 'all');
    expect(stadium).toHaveLength(14);
    expect(stadium.every(d => d.provenance === 'artistic-render')).toBe(true);
    expect(stadium.every(d => d.status === 'draft' && Boolean(d.draftTransactionId))).toBe(true);
    expect(new Set(stadium.map(d => d.draftTransactionId)).size).toBe(14);
    expect(stadium.find(d => d.id === 'DAHZ9kjer6Y')?.draftTransactionId).toBe('5463387488312995695');
  });
  it('uses actual Canva sizes, not the old square label', () => {
    expect(SJB_CANVA_GALLERY.find(d => d.id === 'DAHZ-Soacj8')).toMatchObject({ width: 1080, height: 1440 });
    expect(SJB_CANVA_GALLERY.find(d => d.id === 'DAHZ9qo9-Do')).toMatchObject({ width: 1200, height: 630 });
    expect(SJB_CANVA_GALLERY.some(d => d.width === 1080 && d.height === 1080)).toBe(false);
  });
  it('combines collection, size and ad type without inventing unavailable sizes', () => {
    expect(filterSjbCanvaDesigns('bold-graphic', '1080×1920', 'Instagram Story').map(d => d.id)).toEqual(['DAHZ-U87YZ4']);
    expect(filterSjbCanvaDesigns('launch', '1600×900', 'all').map(d => d.id)).toEqual(['DAHZ-TTRcKU']);
  });
  it('ticket versions belong to each existing look, never a separate collection', () => {
    expect(SJB_CANVA_COLLECTIONS.map(c => c.id)).not.toContain('tickets');
    const tickets = SJB_CANVA_GALLERY.filter(d => d.campaign === 'tickets');
    expect(tickets).toHaveLength(16);
    for (const style of ['bold-graphic', 'stadium-night', 'action-spotlight']) {
      const versions = tickets.filter(d => d.collectionId === style);
      expect(versions).toHaveLength(5);
      expect(versions.map(d => `${d.width}×${d.height}`)).toEqual(['1080×1350', '1080×1440', '1080×1920', '1600×900', style === 'bold-graphic' ? '1200×630' : '1200×628']);
      expect(filterSjbCanvaDesigns(style, 'all', 'Tickets on sale')).toHaveLength(5);
    }
    expect(new Set(tickets.map(d => d.id)).size).toBe(16);
    expect(tickets.every(d => d.status === 'draft' && Boolean(d.draftTransactionId))).toBe(true);
  });
  it('email artwork stays within each established look at the three supplied sizes', () => {
    expect(SJB_CANVA_COLLECTIONS.map(c => c.id)).not.toContain('email');
    expect(SJB_CANVA_GALLERY.filter(d => d.format)).toHaveLength(12);
    for (const style of ['bold-graphic', 'stadium-night', 'action-spotlight', 'launch']) {
      const email = filterSjbCanvaDesigns(style, 'all', 'all').filter(d => d.format);
      expect(email.map(d => [d.format, d.width, d.height])).toEqual([
        ['email-hero', 1200, 600], ['email-header', 1200, 300], ['email-signature', 1200, 200],
      ]);
      expect(email.every(d => d.status === 'draft' && Boolean(d.draftTransactionId))).toBe(true);
    }
  });
});
