import { describe, it, expect } from 'vitest';
import { SJB_CANVA_COLLECTIONS, SJB_CANVA_GALLERY, filterSjbCanvaDesigns } from '../sjb-canva-gallery';
describe('Bowl Canva gallery', () => {
  it('keeps only un-reviewed campaign adaptations unsaved', () => {
    const drafts = SJB_CANVA_GALLERY.filter(d => d.status === 'draft' && !d.format && d.campaign !== 'tickets');
    expect(drafts).toHaveLength(0);
    expect(drafts.filter(d => d.collectionId === 'stadium-night')).toHaveLength(0);
    expect(drafts.filter(d => d.collectionId === 'bold-graphic')).toHaveLength(0);
    const originals = SJB_CANVA_GALLERY.filter(d => d.collectionId === 'bold-graphic' && !d.format && d.campaign !== 'tickets');
    expect(originals).toHaveLength(5);
    expect(originals.filter(d => d.status === 'saved')).toHaveLength(5);
    expect(originals.every(d => d.provenance === 'illustration')).toBe(true);
  });
  it('tracks the fourteen Stadium Night render revisions, thirteen saved and one still drafting', () => {
    const stadium = filterSjbCanvaDesigns('stadium-night', 'all', 'all');
    expect(stadium).toHaveLength(14);
    expect(stadium.every(d => d.provenance === 'artistic-render')).toBe(true);
    const saved = stadium.filter(d => d.status === 'saved');
    expect(saved).toHaveLength(13);
    expect(saved.every(d => !d.draftTransactionId)).toBe(true);
    const drafts = stadium.filter(d => d.status === 'draft');
    expect(drafts.map(d => d.id)).toEqual(['DAHZ-KEtDD4']);
    expect(drafts.every(d => Boolean(d.draftTransactionId))).toBe(true);
  });
  it('uses actual Canva sizes, not the old square label', () => {
    expect(SJB_CANVA_GALLERY.find(d => d.id === 'DAHZ-Soacj8')).toMatchObject({ width: 1080, height: 1440 });
    expect(SJB_CANVA_GALLERY.find(d => d.id === 'DAHZ9qo9-Do')).toMatchObject({ width: 1200, height: 630 });
    expect(SJB_CANVA_GALLERY.some(d => d.width === 1080 && d.height === 1080)).toBe(false);
  });
  it('combines collection, size and ad type without inventing unavailable sizes', () => {
    expect(filterSjbCanvaDesigns('bold-graphic', '1080×1920', 'Instagram Story').map(d => d.id)).toEqual(['DAHZ-U87YZ4']);
    expect(filterSjbCanvaDesigns('launch', '1600×900', 'all').map(d => d.id)).toEqual(['DAHZ-c_lW7M', 'DAHZ-TTRcKU']);
  });
  it('ticket versions belong to each existing look, never a separate collection', () => {
    expect(SJB_CANVA_COLLECTIONS.map(c => c.id)).not.toContain('tickets');
    const tickets = SJB_CANVA_GALLERY.filter(d => d.campaign === 'tickets');
    expect(tickets).toHaveLength(20);
    for (const style of ['bold-graphic', 'stadium-night', 'action-spotlight', 'launch']) {
      const versions = tickets.filter(d => d.collectionId === style);
      expect(versions).toHaveLength(5);
      expect(versions.map(d => `${d.width}×${d.height}`).sort()).toEqual(['1080×1350', '1080×1440', '1080×1920', '1600×900', style === 'bold-graphic' ? '1200×630' : '1200×628'].sort());
      expect(filterSjbCanvaDesigns(style, 'all', 'Tickets on sale')).toHaveLength(5);
    }
    expect(new Set(tickets.map(d => d.id)).size).toBe(20);
    const boldTickets = tickets.filter(d => d.collectionId === 'bold-graphic');
    expect(boldTickets.every(d => d.status === 'saved' && !d.draftTransactionId)).toBe(true);
    const nonStadium = tickets.filter(d => d.collectionId !== 'stadium-night' && d.collectionId !== 'bold-graphic');
    expect(nonStadium.every(d => d.status === 'draft' && Boolean(d.draftTransactionId))).toBe(true);
    const stadiumTickets = tickets.filter(d => d.collectionId === 'stadium-night');
    expect(stadiumTickets.filter(d => d.status === 'saved')).toHaveLength(4);
    expect(stadiumTickets.find(d => d.id === 'DAHZ-KEtDD4')?.status).toBe('draft');
  });
  it('email artwork stays within each established look at the three supplied sizes', () => {
    expect(SJB_CANVA_COLLECTIONS.map(c => c.id)).not.toContain('email');
    expect(SJB_CANVA_GALLERY.filter(d => d.format)).toHaveLength(12);
    for (const style of ['bold-graphic', 'stadium-night', 'action-spotlight', 'launch']) {
      const email = filterSjbCanvaDesigns(style, 'all', 'all').filter(d => d.format);
      expect(email.map(d => [d.format, d.width, d.height])).toEqual([
        ['email-hero', 1200, 600], ['email-header', 1200, 300], ['email-signature', 1200, 200],
      ]);
      if (style === 'stadium-night' || style === 'bold-graphic') {
        expect(email.every(d => d.status === 'saved')).toBe(true);
      } else {
        expect(email.every(d => d.status === 'draft' && Boolean(d.draftTransactionId))).toBe(true);
      }
    }
  });
  it('covers all five social formats in every one of the four design sets', () => {
    expect(SJB_CANVA_COLLECTIONS).toHaveLength(4);
    for (const { id } of SJB_CANVA_COLLECTIONS) {
      const social = filterSjbCanvaDesigns(id, 'all', 'all').filter(d => ['Instagram post', 'Portrait post', 'Instagram Story', 'Wide post', 'Facebook ad'].includes(d.name));
      expect(social).toHaveLength(5);
      expect(social.map(d => [d.width, d.height])).toEqual([[1080,1350],[1080,1440],[1080,1920],[1600,900],[1200,id === 'bold-graphic' ? 630 : 628]]);
      expect(new Set(social.map(d => d.id)).size).toBe(5);
    }
  });
});
