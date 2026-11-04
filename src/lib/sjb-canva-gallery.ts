import boldTall from '@/assets/sjb-canva/bold-tall.png.asset.json';
import boldWide from '@/assets/sjb-canva/bold-wide.png.asset.json';
import boldLink from '@/assets/sjb-canva/bold-link.png.asset.json';
import boldPortrait from '@/assets/sjb-canva/bold-portrait.png.asset.json';
import boldStory from '@/assets/sjb-canva/bold-story.png.asset.json';
import stadiumWide from '@/assets/sjb-canva/stadium-wide.png.asset.json';
import stadiumSocialWide from '@/assets/sjb-canva/stadium-social-wide.png.asset.json';
import stadiumLink from '@/assets/sjb-canva/stadium-link.png.asset.json';
import stadiumTall from '@/assets/sjb-canva/stadium-tall.png.asset.json';
import stadiumPortrait from '@/assets/sjb-canva/stadium-portrait.png.asset.json';
import stadiumStory from '@/assets/sjb-canva/stadium-story.png.asset.json';
import actionWide from '@/assets/sjb-canva/action-wide.png.asset.json';
import actionLink from '@/assets/sjb-canva/action-link.png.asset.json';
import actionTall from '@/assets/sjb-canva/action-tall.png.asset.json';
import actionPortrait from '@/assets/sjb-canva/action-portrait.png.asset.json';
import actionStory from '@/assets/sjb-canva/action-story.png.asset.json';
import launchDate from '@/assets/sjb-canva/launch-date.png.asset.json';
import launchQuote from '@/assets/sjb-canva/launch-quote.png.asset.json';
import launchScore from '@/assets/sjb-canva/launch-score.png.asset.json';
import launchCountdown from '@/assets/sjb-canva/launch-countdown.png.asset.json';
import launchMatchup from '@/assets/sjb-canva/launch-matchup.png.asset.json';
import launchGameDay from '@/assets/sjb-canva/launch-game-day.png.asset.json';
import ticketsPortrait1 from '@/assets/sjb-canva/tickets-portrait-1.png.asset.json';
import ticketsPortrait2 from '@/assets/sjb-canva/tickets-portrait-2.png.asset.json';
import ticketsSquare1 from '@/assets/sjb-canva/tickets-square-1.png.asset.json';
import ticketsSquare2 from '@/assets/sjb-canva/tickets-square-2.png.asset.json';
import ticketsStory1 from '@/assets/sjb-canva/tickets-story-1.png.asset.json';
import ticketsStory2 from '@/assets/sjb-canva/tickets-story-2.png.asset.json';
import ticketsWide1 from '@/assets/sjb-canva/tickets-wide-1.png.asset.json';
import ticketsWide2 from '@/assets/sjb-canva/tickets-wide-2.png.asset.json';
import ticketsLink1 from '@/assets/sjb-canva/tickets-link-1.png.asset.json';
import ticketsLink2 from '@/assets/sjb-canva/tickets-link-2.png.asset.json';
import emailHeroBadge from '@/assets/sjb-canva/email-hero-badge.png.asset.json';
import emailHeroMatchup from '@/assets/sjb-canva/email-hero-matchup.png.asset.json';
import emailHeroAction from '@/assets/sjb-canva/email-hero-action.png.asset.json';
import emailHeaderBadge from '@/assets/sjb-canva/email-header-badge-draft.png.asset.json';
import emailHeaderMatchup from '@/assets/sjb-canva/email-header-matchup-draft.png.asset.json';
import emailHeaderAction from '@/assets/sjb-canva/email-header-action.png.asset.json';
import emailSignatureBadge from '@/assets/sjb-canva/email-signature-badge-draft.png.asset.json';
import emailSignatureMatchup from '@/assets/sjb-canva/email-signature-matchup-draft.png.asset.json';
import emailSignatureAction from '@/assets/sjb-canva/email-signature-action.png.asset.json';

export const SJB_CANVA_COLLECTIONS = [
  { id: 'bold-graphic', name: 'Bold Graphic', folderId: 'FAHZ9_NN2FQ' },
  { id: 'stadium-night', name: 'Stadium Night', folderId: 'FAHZ93d8ki8' },
  { id: 'action-spotlight', name: 'Action Spotlight', folderId: 'FAHZ90BI6Mo' },
  { id: 'launch', name: 'Launch Ads', folderId: 'FAHZ99Po6eg' },
  { id: 'tickets', name: 'Tickets On Sale', folderId: 'FAHZ-E2iiCU' },
  { id: 'email', name: 'Email Campaign', folderId: 'FAHZ-NXtUsQ' },
] as const;
export type SjbCanvaCollectionId = typeof SJB_CANVA_COLLECTIONS[number]['id'];
export interface SjbCanvaGalleryDesign {
  id: string;
  collectionId: SjbCanvaCollectionId;
  name: string;
  width: number;
  height: number;
  previewUrl: string;
  canvaUrl: string;
  status: 'draft' | 'saved';
  provenance: 'historical-photo' | 'supplied-artwork' | 'illustration';
}
function design(id: string, collectionId: SjbCanvaCollectionId, name: string, width: number, height: number, asset: { url: string }, status: SjbCanvaGalleryDesign['status'], provenance: SjbCanvaGalleryDesign['provenance'], canvaUrl?: string): SjbCanvaGalleryDesign {
  return { id, collectionId, name, width, height, previewUrl: asset.url, status, provenance, canvaUrl: canvaUrl ?? `https://www.canva.com/design/${id}/edit` };
}
// Canva artwork snapshots, not a second renderer. Actual artboard sizes are
// independent of the legacy native editor's format labels. Drafts are NOT saved.
export const SJB_CANVA_GALLERY: readonly SjbCanvaGalleryDesign[] = [
  design('DAHZ9jq7cVQ', 'bold-graphic', 'Instagram post', 1080, 1350, boldPortrait, 'draft', 'supplied-artwork'),
  design('DAHZ9nvVT-Q', 'bold-graphic', 'Portrait post', 1080, 1440, boldTall, 'draft', 'supplied-artwork'),
  design('DAHZ9tOPYr4', 'bold-graphic', 'Instagram Story', 1080, 1920, boldStory, 'draft', 'supplied-artwork'),
  design('DAHZ9vWnYJ0', 'bold-graphic', 'Wide post', 1600, 900, boldWide, 'draft', 'supplied-artwork'),
  design('DAHZ9qo9-Do', 'bold-graphic', 'Facebook ad', 1200, 628, boldLink, 'draft', 'supplied-artwork'),
  design('DAHZ9shQ9M8', 'stadium-night', 'Instagram post', 1080, 1350, stadiumPortrait, 'draft', 'historical-photo'),
  design('DAHZ9opoks4', 'stadium-night', 'Portrait post', 1080, 1440, stadiumTall, 'draft', 'historical-photo'),
  design('DAHZ9lBM3mI', 'stadium-night', 'Instagram Story', 1080, 1920, stadiumStory, 'draft', 'historical-photo'),
  design('DAHZ9kjer6Y', 'stadium-night', 'Wide post', 1600, 900, stadiumWide, 'draft', 'historical-photo'),
  design('DAHZ9uJCTzk', 'stadium-night', 'Social post', 1600, 900, stadiumSocialWide, 'draft', 'historical-photo'),
  design('DAHZ9qKVbrI', 'stadium-night', 'Facebook ad', 1200, 628, stadiumLink, 'draft', 'historical-photo'),
  design('DAHZ9m49-nA', 'action-spotlight', 'Instagram post', 1080, 1350, actionPortrait, 'saved', 'illustration', 'https://www.canva.com/d/mbgzbxD3RkNvPQO'),
  design('DAHZ9nPhkZ0', 'action-spotlight', 'Portrait post', 1080, 1440, actionTall, 'saved', 'illustration', 'https://www.canva.com/d/plo9nR8OtHjXWk-'),
  design('DAHZ9lwpgeY', 'action-spotlight', 'Instagram Story', 1080, 1920, actionStory, 'saved', 'illustration', 'https://www.canva.com/d/szxKC_ms6jUFfPq'),
  design('DAHZ9gXp6qo', 'action-spotlight', 'Wide post', 1600, 900, actionWide, 'saved', 'illustration', 'https://www.canva.com/d/Z5t1NpV0hchS-XC'),
  design('DAHZ9u2WHbw', 'action-spotlight', 'Facebook ad', 1200, 628, actionLink, 'saved', 'illustration', 'https://www.canva.com/d/urZU_r3ZXyrtLd_'),
  design('DAHZ9mUpIQY', 'launch', 'Game day', 1080, 1350, launchGameDay, 'saved', 'supplied-artwork', 'https://www.canva.com/d/J7Tgz72gRGAYu0k'),
  design('DAHZ9pe47-Q', 'launch', 'Matchup', 1080, 1350, launchMatchup, 'saved', 'illustration', 'https://www.canva.com/d/W37aGaxcMLi4972'),
  design('DAHZ9vTP7Xw', 'launch', 'Countdown', 1080, 1350, launchCountdown, 'saved', 'illustration', 'https://www.canva.com/d/yQ6sSYAdlE7n-WT'),
  design('DAHZ9ll6m0A', 'launch', 'Final score', 1080, 1350, launchScore, 'saved', 'illustration', 'https://www.canva.com/d/fsDIjvMGkEy7ti3'),
  design('DAHZ9hR5aI4', 'launch', 'Quote card', 1080, 1350, launchQuote, 'saved', 'illustration', 'https://www.canva.com/d/OM2Zo5qnCSfn8fH'),
  design('DAHZ9lAkSN4', 'launch', 'Save the date', 1080, 1350, launchDate, 'saved', 'illustration', 'https://www.canva.com/d/hq22hG4ig3mw66E'),
  ...[
    { id: 'DAHZ-D4CwjU', width: 1080, height: 1350, assets: [ticketsPortrait1, ticketsPortrait2], url: 'https://www.canva.com/d/Vhh_Qj-cYSDj6nP' },
    { id: 'DAHZ-GobKqc', width: 1080, height: 1080, assets: [ticketsSquare1, ticketsSquare2], url: 'https://www.canva.com/d/Tqdg34NUFpsE-mp' },
    { id: 'DAHZ-PdonI8', width: 1080, height: 1920, assets: [ticketsStory1, ticketsStory2], url: 'https://www.canva.com/d/cU17XZEuMgqLqlX' },
    { id: 'DAHZ-B1mOFw', width: 1600, height: 900, assets: [ticketsWide1, ticketsWide2], url: 'https://www.canva.com/d/UV8ZgLKZ6aPNLcA' },
    { id: 'DAHZ-MivkpE', width: 1200, height: 628, assets: [ticketsLink1, ticketsLink2], url: 'https://www.canva.com/d/SH1Fn9LcZjINDna' },
  ].flatMap(format => format.assets.map((asset, index) => design(
    `${format.id}:page-${index + 1}`, 'tickets', index === 0 ? 'Tickets on sale · Badge' : 'Tickets on sale · Matchup',
    format.width, format.height, asset, 'saved', 'supplied-artwork', format.url,
  ))),
  design('DAHZ-P9AtRQ:page-1', 'email', 'Email hero · Tickets', 1200, 600, emailHeroBadge, 'saved', 'supplied-artwork', 'https://www.canva.com/d/aKZWJqiNBpEEFG0'),
  design('DAHZ-P9AtRQ:page-2', 'email', 'Email hero · Matchup', 1200, 600, emailHeroMatchup, 'saved', 'supplied-artwork', 'https://www.canva.com/d/aKZWJqiNBpEEFG0'),
  design('DAHZ-DriNbg', 'email', 'Email hero · Action', 1200, 600, emailHeroAction, 'saved', 'illustration', 'https://www.canva.com/d/KygXhOJv_JKO1Qb'),
  design('DAHZ-HQ5HSY:page-1', 'email', 'Email header · Tickets', 1200, 300, emailHeaderBadge, 'draft', 'supplied-artwork', 'https://www.canva.com/d/b_-YwPht-y-7VjI'),
  design('DAHZ-HQ5HSY:page-2', 'email', 'Email header · Matchup', 1200, 300, emailHeaderMatchup, 'draft', 'supplied-artwork', 'https://www.canva.com/d/b_-YwPht-y-7VjI'),
  design('DAHZ-FqKmoM', 'email', 'Email header · Action', 1200, 300, emailHeaderAction, 'saved', 'illustration', 'https://www.canva.com/d/KyxaAUc2EXzvaPp'),
  design('DAHZ-DoHqJI:page-1', 'email', 'Signature banner · Tickets', 1200, 200, emailSignatureBadge, 'draft', 'supplied-artwork', 'https://www.canva.com/d/m8wv9F0eKEQELfp'),
  design('DAHZ-DoHqJI:page-2', 'email', 'Signature banner · Matchup', 1200, 200, emailSignatureMatchup, 'draft', 'supplied-artwork', 'https://www.canva.com/d/m8wv9F0eKEQELfp'),
  design('DAHZ-NCRcNQ', 'email', 'Signature banner · Action', 1200, 200, emailSignatureAction, 'saved', 'illustration', 'https://www.canva.com/d/QnKz_2M0AVLFbbJ'),
];
export function sjbCanvaSize(d: Pick<SjbCanvaGalleryDesign, 'width' | 'height'>) { return `${d.width}×${d.height}`; }
export function filterSjbCanvaDesigns(collectionId: string, size: string, name: string) {
  return SJB_CANVA_GALLERY.filter(d => (collectionId === 'all' || d.collectionId === collectionId) && (size === 'all' || sjbCanvaSize(d) === size) && (name === 'all' || d.name === name));
}
