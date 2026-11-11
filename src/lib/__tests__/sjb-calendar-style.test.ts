import { describe, expect, it } from 'vitest';
import { SJB_CALENDAR_STYLE, SJB_CALENDAR_MARKS, sjbBroadcastMark } from '../sjb-calendar-style';
import { SJB_DEMO_LOOKS } from '../sjb-calendar-demo';
import { SJB_COLORS } from '../san-juan-bowl';
import { SJB_CALENDAR_FORMATS } from '../sjb-calendar-formats';

describe('Bowl campaign identity across sizes', () => {
  it('uses the approved taller white CBS master for every dark multi-frame format, retaining black on Light', () => {
    for (const format of SJB_CALENDAR_FORMATS.filter(f => f.id !== 'single')) {
      for (const mode of ['dark', 'set2', 'set3', 'set4'] as const) {
        const mark = sjbBroadcastMark(['LIVE ON CBS', 'SPORTS NETWORK'], mode, format.height > format.width);
        expect(mark?.url).toContain('cbs-sports-network-vertical-white.svg');
        expect(mark?.ratio).toBe(1000 / 257.97828);
      }
      expect(sjbBroadcastMark(['LIVE ON CBS'], 'light', format.height > format.width)?.url).toContain('official-black');
    }
  });
  it('uses the supplied white CBS logo on dark vertical and square artwork', () => {
    for (const mode of ['dark', 'set2', 'set3', 'set4'] as const) {
      expect(sjbBroadcastMark(['LIVE ON CBS'], mode, true)?.url).toContain('cbs-sports-network-vertical-white.svg');
      expect(sjbBroadcastMark(['LIVE ON CBS'], mode, true)?.ratio).toBe(1000 / 257.97828);
    }
    expect(sjbBroadcastMark(['LIVE ON CBS'], 'light', true)?.url).toContain('official-black');
    expect(sjbBroadcastMark(['LIVE ON CBS'], 'dark', false)?.url).toContain('vertical-white');
  });
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
  it('selects official single-color CBS artwork for every dark look and contrasting black for Light', () => {
    for (const mode of ['dark', 'set2', 'set3', 'set4'] as const) {
      expect(sjbBroadcastMark(['LIVE ON CBS', 'SPORTS NETWORK'], mode)?.url).toContain('cbs-sports-network-vertical-white.svg');
    }
    expect(sjbBroadcastMark(['LIVE ON CBS', 'SPORTS NETWORK'], 'light')?.url).toContain('cbs-sports-network-official-black.svg');
    expect(sjbBroadcastMark(['TICKETS', 'ON SALE'], 'dark')).toBeNull();
  });
});