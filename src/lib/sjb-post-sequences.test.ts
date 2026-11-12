import { describe, expect, it } from 'vitest';
import designs from './sjb-social-calendar-designs.json';
import { sjbCalendarSequence } from './sjb-calendar-formats';
import { sjbCalendarDesign, type SjbCalendarSize } from './sjb-social-calendar';

describe('Set 2 and Set 4 full post sequences', () => {
  for (const mode of ['set2', 'set4'] as const) {
    it(`${mode} has four real pages for every post in all carousel/story formats`, () => {
      for (const post of Object.keys(designs)) {
        for (const format of ['linkedin-portrait', 'linkedin-square', 'instagram-carousel', 'story-sequence'] as const) {
          const size: SjbCalendarSize = format === 'story-sequence' ? '1920' : format === 'linkedin-square' ? '1080' : '1350';
          const sequence = sjbCalendarSequence(post, mode, format);
          expect(sequence?.pages).toHaveLength(4);
          expect(sequence?.pages[1].previewUrl).toBe(sjbCalendarDesign(post, mode, size)?.previewUrl);
          expect(new Set(sequence?.pages.map(p => p.previewUrl)).size).toBe(4);
          expect(sequence?.provenance).toBe('assembled-canva-pages');
          expect(sequence?.canvaUrl).toBeUndefined();
        }
      }
    });
    it(`${mode} never substitutes post 01's headline for another post`, () => {
      const first = sjbCalendarSequence('01', mode, 'story-sequence');
      const other = sjbCalendarSequence('22', mode, 'story-sequence');
      expect(other?.pages[1].previewUrl).not.toBe(first?.pages[1].previewUrl);
      expect(other?.pages[0].previewUrl).toBe(first?.pages[0].previewUrl);
    });
  }
  it('does not assemble unknown posts or single images', () => {
    expect(sjbCalendarSequence('99', 'set2', 'story-sequence')).toBeNull();
    expect(sjbCalendarSequence('01', 'set4', 'single')).toBeNull();
  });
});