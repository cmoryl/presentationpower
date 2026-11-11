import dark from '@/assets/sjb-calendar-style/dark-ground.jpg.asset.json';
import light from '@/assets/sjb-calendar-style/light-ground.jpg.asset.json';
import set2 from '@/assets/sjb-calendar-style/set2-ground.jpg.asset.json';
import set3 from '@/assets/sjb-calendar-style/set3-ground.jpg.asset.json';
import set4 from '@/assets/sjb-calendar-style/set4-ground.jpg.asset.json';
import player from '@/assets/sjb-calendar-style/player.png.asset.json';
import accWhite from '@/assets/sjb-calendar-style/acc-white.png.asset.json';
import accColor from '@/assets/sjb-calendar-style/acc-color.png.asset.json';
import sunBelt from '@/assets/sjb-calendar-style/sun-belt.png.asset.json';
import cbsBlack from '@/assets/sjb-calendar-style/cbs-vertical-black.svg.asset.json';
import cbsVerticalWhite from '@/assets/sjb-calendar-style/cbs-vertical-white.svg.asset.json';
import type { SjbCalendarMode } from './sjb-social-calendar';

/** Unchanged media recovered from the actual post 04 Canva originals, not menu cover art. */
export const SJB_CALENDAR_STYLE = {
  dark: { ground: dark.url, source: 'DAHaiJbODIo', headline: 'Heading Now 31-38 Bold Italics', align: 'center', italic: true },
  light: { ground: light.url, source: 'DAHaiB8HX6U', headline: 'Heading Now 31-38 Bold Italics', align: 'center', italic: true },
  set2: { ground: set2.url, source: 'DAHai4nSCtc', headline: 'Heading Now 31-38 Bold Italics', align: 'center', italic: true },
  set3: { ground: set3.url, source: 'DAHai6cDjm0', headline: 'Heading Now 31-38 Bold Italics', align: 'left', italic: true },
  set4: { ground: set4.url, source: 'DAHai-4B8c4', headline: 'Heading Now 31-38 Bold Italics', align: 'center', italic: true },
} satisfies Record<SjbCalendarMode, { ground: string; source: string; headline: string; align: string; italic: boolean }>;

export const SJB_CALENDAR_MARKS = { player: player.url, accWhite: accWhite.url, accColor: accColor.url, sunBelt: sunBelt.url };

/** Official broadcaster artwork sourced from cbssportsnetwork.com, never typeset. */
export function sjbBroadcastMark(headline: readonly string[], mode: SjbCalendarMode, _vertical = false) {
  return /\bCBS\b/i.test(headline.join(' ')) ? {
    url: mode === 'light' ? cbsBlack.url : cbsVerticalWhite.url,
    ratio: 1000 / 257.97828,
    alt: 'CBS Sports Network',
    label: 'LIVE ON',
  } : null;
}