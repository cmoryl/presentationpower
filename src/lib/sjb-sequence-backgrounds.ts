import darkHeadline from '@/assets/sjb-sequence/dark-headline-v2.jpg.asset.json';
import darkDetails from '@/assets/sjb-sequence/dark-details-v2.jpg.asset.json';
import darkTickets from '@/assets/sjb-sequence/dark-tickets-v2.jpg.asset.json';
import lightHeadline from '@/assets/sjb-sequence/light-headline-v2.jpg.asset.json';
import lightDetails from '@/assets/sjb-sequence/light-details-v2.jpg.asset.json';
import lightTickets from '@/assets/sjb-sequence/light-tickets-v2.jpg.asset.json';
import set2Headline from '@/assets/sjb-sequence/set2-headline-v2.jpg.asset.json';
import set2Details from '@/assets/sjb-sequence/set2-details-v2.jpg.asset.json';
import set2Tickets from '@/assets/sjb-sequence/set2-tickets-v2.jpg.asset.json';
import set3Headline from '@/assets/sjb-sequence/set3-headline-v2.jpg.asset.json';
import set3Details from '@/assets/sjb-sequence/set3-details-v2.jpg.asset.json';
import set3Tickets from '@/assets/sjb-sequence/set3-tickets-v2.jpg.asset.json';
import set4Headline from '@/assets/sjb-sequence/set4-headline-v2.jpg.asset.json';
import set4Details from '@/assets/sjb-sequence/set4-details-v2.jpg.asset.json';
import set4Tickets from '@/assets/sjb-sequence/set4-tickets-v2.jpg.asset.json';
import type { SjbCalendarMode } from './sjb-social-calendar';

/** AI-edited companion grounds; original covers and saved Canva artwork are unchanged. */
export const SJB_SEQUENCE_BACKGROUNDS = {
  dark: { headline: darkHeadline.url, details: darkDetails.url, tickets: darkTickets.url },
  light: { headline: lightHeadline.url, details: lightDetails.url, tickets: lightTickets.url },
  set2: { headline: set2Headline.url, details: set2Details.url, tickets: set2Tickets.url },
  set3: { headline: set3Headline.url, details: set3Details.url, tickets: set3Tickets.url },
  set4: { headline: set4Headline.url, details: set4Details.url, tickets: set4Tickets.url },
} satisfies Record<SjbCalendarMode, Record<'headline' | 'details' | 'tickets', string>>;