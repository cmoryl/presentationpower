import { describe, expect, it } from 'vitest';
import { SJB_CALENDAR_STYLE, SJB_CALENDAR_MARKS } from '../sjb-calendar-style';
import { SJB_DEMO_LOOKS } from '../sjb-calendar-demo';
import { SJB_COLORS } from '../san-juan-bowl';

describe('Bowl campaign identity across sizes', () => {
  it('binds all five looks to their original Canva media, not menu illustrations', () => {
    expect(Object.values(SJB_CALENDAR_STYLE).map(s => s.source)).toEqual(['DAHaiJbODIo', 'DAHaiB8HX6U', 'DAHai4nSCtc', 'DAHai6cDjm0', 'DAHai-4B8c4']);
    expect(new Set(Object.values(SJB_CALENDAR_STYLE).map(s => s.ground)).size).toBe(5);
  });
  it('uses the original gold Set 2 headline treatment, not cyan', () => {
    expect(SJB_DEMO_LOOKS.set2.accent).toBe(SJB_COLORS.find(c => c.id === 'gold')?.hex);
  });
  it('keeps the white and colour conference masters distinct for dark and light grounds', () => {
    expect(SJB_CALENDAR_MARKS.accWhite).not.toBe(SJB_CALENDAR_MARKS.accColor);
  });
});