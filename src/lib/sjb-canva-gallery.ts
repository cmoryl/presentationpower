import set4SocialPortrait from '@/assets/sjb-canva/set4-social-portrait.png.asset.json';
import set4SocialTall from '@/assets/sjb-canva/set4-social-tall.png.asset.json';
import set4SocialStory from '@/assets/sjb-canva/set4-social-story.png.asset.json';
import set4SocialWide from '@/assets/sjb-canva/set4-social-wide.png.asset.json';
import set4SocialLink from '@/assets/sjb-canva/set4-social-link.png.asset.json';
import set4TicketPortrait from '@/assets/sjb-canva/set4-ticket-portrait.png.asset.json';
import set4TicketTall from '@/assets/sjb-canva/set4-ticket-tall.png.asset.json';
import set4TicketStory from '@/assets/sjb-canva/set4-ticket-story.png.asset.json';
import set4TicketLink from '@/assets/sjb-canva/set4-ticket-link.png.asset.json';
import launchEmailHero from '@/assets/sjb-canva/launch-email-hero-review.png.asset.json';
import launchEmailHeader from '@/assets/sjb-canva/launch-email-header-review.png.asset.json';
import launchEmailSignature from '@/assets/sjb-canva/launch-email-signature-review.png.asset.json';
import launchTicketWide from '@/assets/sjb-canva/launch-ticket-wide-review.png.asset.json';
import boldTall from '@/assets/sjb-canva/bold-master-tall-review.png.asset.json';
import boldWide from '@/assets/sjb-canva/bold-original-wide.png.asset.json';
import boldLink from '@/assets/sjb-canva/bold-original-link.png.asset.json';
import boldPortrait from '@/assets/sjb-canva/bold-master-portrait-review.png.asset.json';
import boldStory from '@/assets/sjb-canva/bold-master-story-review.png.asset.json';
import stadiumWide from '@/assets/sjb-canva/stadium-accent-wide.png.asset.json';
import stadiumSocialWide from '@/assets/sjb-canva/stadium-accent-social-wide.png.asset.json';
import stadiumLink from '@/assets/sjb-canva/stadium-accent-link.png.asset.json';
import stadiumTall from '@/assets/sjb-canva/stadium-accent-tall.png.asset.json';
import stadiumPortrait from '@/assets/sjb-canva/stadium-accent-portrait.png.asset.json';
import stadiumStory from '@/assets/sjb-canva/stadium-accent-story.png.asset.json';
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
import ticketBoldPortrait from '@/assets/sjb-canva/bold-ticket-portrait-review.png.asset.json';
import ticketBoldTall from '@/assets/sjb-canva/bold-ticket-tall-review.png.asset.json';
import ticketBoldStory from '@/assets/sjb-canva/bold-ticket-story-review.png.asset.json';
import ticketBoldWide from '@/assets/sjb-canva/bold-ticket-wide-review.png.asset.json';
import ticketBoldLink from '@/assets/sjb-canva/bold-ticket-link-review.png.asset.json';
import ticketStadiumPortrait from '@/assets/sjb-canva/stadium-accent-ticket-portrait.png.asset.json';
import ticketStadiumTall from '@/assets/sjb-canva/stadium-accent-ticket-tall.png.asset.json';
import ticketStadiumStory from '@/assets/sjb-canva/stadium-accent-ticket-story.png.asset.json';
import ticketStadiumWide from '@/assets/sjb-canva/stadium-accent-ticket-wide.png.asset.json';
import ticketStadiumLink from '@/assets/sjb-canva/stadium-accent-ticket-link.png.asset.json';
import ticketActionPortrait from '@/assets/sjb-canva/style-tickets-action-portrait.png.asset.json';
import ticketActionTall from '@/assets/sjb-canva/style-tickets-action-tall.png.asset.json';
import ticketActionStory from '@/assets/sjb-canva/style-tickets-action-story.png.asset.json';
import ticketActionWide from '@/assets/sjb-canva/style-tickets-action-wide.png.asset.json';
import ticketActionLink from '@/assets/sjb-canva/style-tickets-action-link.png.asset.json';
import emailBoldHero from '@/assets/sjb-canva/bold-email-hero-review.png.asset.json';
import emailBoldHeader from '@/assets/sjb-canva/bold-email-header-review.png.asset.json';
import emailBoldSignature from '@/assets/sjb-canva/bold-email-signature-review.png.asset.json';
import emailStadiumHero from '@/assets/sjb-canva/stadium-accent-email-hero.png.asset.json';
import emailStadiumHeader from '@/assets/sjb-canva/stadium-accent-email-header.png.asset.json';
import emailStadiumSignature from '@/assets/sjb-canva/stadium-accent-email-signature.png.asset.json';
import emailActionHero from '@/assets/sjb-canva/canopy-email-action-hero.png.asset.json';
import emailActionHeader from '@/assets/sjb-canva/canopy-email-action-header.png.asset.json';
import emailActionSignature from '@/assets/sjb-canva/canopy-email-action-signature.png.asset.json';

export const SJB_CANVA_COLLECTIONS = [
  { id: 'bold-graphic', name: 'Design Set 1', folderId: 'FAHZ9_NN2FQ' },
  { id: 'stadium-night', name: 'Design Set 2', folderId: 'FAHZ93d8ki8' },
  { id: 'action-spotlight', name: 'Design Set 3', folderId: 'FAHZ90BI6Mo' },
  { id: 'launch', name: 'Design Set 4', folderId: 'FAHZ99Po6eg' },
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
  campaign?: 'tickets';
  format?: 'email-hero' | 'email-header' | 'email-signature';
  draftTransactionId?: string;
  provenance: 'historical-photo' | 'artistic-render' | 'supplied-artwork' | 'illustration';
}
function design(id: string, collectionId: SjbCanvaCollectionId, name: string, width: number, height: number, asset: { url: string }, status: SjbCanvaGalleryDesign['status'], provenance: SjbCanvaGalleryDesign['provenance'], canvaUrl?: string): SjbCanvaGalleryDesign {
  return { id, collectionId, name, width, height, previewUrl: asset.url, status, provenance, canvaUrl: canvaUrl ?? `https://www.canva.com/design/${id}/edit` };
}
// Canva artwork snapshots, not a second renderer. Actual artboard sizes are
// independent of the legacy native editor's format labels. Drafts are NOT saved.
export const SJB_CANVA_GALLERY: readonly SjbCanvaGalleryDesign[] = [
  { ...design('DAHZ-dNZnAQ', 'bold-graphic', 'Instagram post', 1080, 1350, boldPortrait, 'saved', 'illustration') },
  { ...design('DAHZ-Soacj8', 'bold-graphic', 'Portrait post', 1080, 1440, boldTall, 'saved', 'illustration') },
  { ...design('DAHZ-U87YZ4', 'bold-graphic', 'Instagram Story', 1080, 1920, boldStory, 'saved', 'illustration') },
  design('DAHZ9vWnYJ0', 'bold-graphic', 'Wide post', 1600, 900, boldWide, 'saved', 'illustration'),
  design('DAHZ9qo9-Do', 'bold-graphic', 'Facebook ad', 1200, 630, boldLink, 'saved', 'illustration'),
  design('DAHZ9shQ9M8', 'stadium-night', 'Instagram post', 1080, 1350, stadiumPortrait, 'saved', 'artistic-render'),
  design('DAHZ9opoks4', 'stadium-night', 'Portrait post', 1080, 1440, stadiumTall, 'saved', 'artistic-render'),
  design('DAHZ9lBM3mI', 'stadium-night', 'Instagram Story', 1080, 1920, stadiumStory, 'saved', 'artistic-render'),
  design('DAHZ9kjer6Y', 'stadium-night', 'Wide post', 1600, 900, stadiumWide, 'saved', 'artistic-render'),
  design('DAHZ9uJCTzk', 'stadium-night', 'Social post', 1600, 900, stadiumSocialWide, 'saved', 'artistic-render'),
  design('DAHZ9qKVbrI', 'stadium-night', 'Facebook ad', 1200, 628, stadiumLink, 'saved', 'artistic-render'),
  design('DAHZ9m49-nA', 'action-spotlight', 'Instagram post', 1080, 1350, actionPortrait, 'saved', 'illustration', 'https://www.canva.com/d/mbgzbxD3RkNvPQO'),
  design('DAHZ9nPhkZ0', 'action-spotlight', 'Portrait post', 1080, 1440, actionTall, 'saved', 'illustration', 'https://www.canva.com/d/plo9nR8OtHjXWk-'),
  design('DAHZ9lwpgeY', 'action-spotlight', 'Instagram Story', 1080, 1920, actionStory, 'saved', 'illustration', 'https://www.canva.com/d/szxKC_ms6jUFfPq'),
  design('DAHZ9gXp6qo', 'action-spotlight', 'Wide post', 1600, 900, actionWide, 'saved', 'illustration', 'https://www.canva.com/d/Z5t1NpV0hchS-XC'),
  design('DAHZ9u2WHbw', 'action-spotlight', 'Facebook ad', 1200, 628, actionLink, 'saved', 'illustration', 'https://www.canva.com/d/urZU_r3ZXyrtLd_'),
  { ...design('DAHZ-SifCjs', 'launch', 'Instagram post', 1080, 1350, set4SocialPortrait, 'saved', 'illustration') },
  { ...design('DAHZ-et9N3M', 'launch', 'Portrait post', 1080, 1440, set4SocialTall, 'saved', 'illustration') },
  { ...design('DAHZ-dbu5-o', 'launch', 'Instagram Story', 1080, 1920, set4SocialStory, 'saved', 'illustration') },
  { ...design('DAHZ-c_lW7M', 'launch', 'Wide post', 1600, 900, set4SocialWide, 'saved', 'illustration') },
  { ...design('DAHZ-eY_-Lg', 'launch', 'Facebook ad', 1200, 628, set4SocialLink, 'saved', 'illustration') },
  design('DAHZ9mUpIQY', 'launch', 'Game day', 1080, 1350, launchGameDay, 'saved', 'supplied-artwork', 'https://www.canva.com/d/J7Tgz72gRGAYu0k'),
  design('DAHZ9pe47-Q', 'launch', 'Matchup', 1080, 1350, launchMatchup, 'saved', 'illustration', 'https://www.canva.com/d/W37aGaxcMLi4972'),
  design('DAHZ9vTP7Xw', 'launch', 'Countdown', 1080, 1350, launchCountdown, 'saved', 'illustration', 'https://www.canva.com/d/yQ6sSYAdlE7n-WT'),
  design('DAHZ9ll6m0A', 'launch', 'Final score', 1080, 1350, launchScore, 'saved', 'illustration', 'https://www.canva.com/d/fsDIjvMGkEy7ti3'),
  design('DAHZ9hR5aI4', 'launch', 'Quote card', 1080, 1350, launchQuote, 'saved', 'illustration', 'https://www.canva.com/d/OM2Zo5qnCSfn8fH'),
  design('DAHZ9lAkSN4', 'launch', 'Save the date', 1080, 1350, launchDate, 'saved', 'illustration', 'https://www.canva.com/d/hq22hG4ig3mw66E'),
  { ...design('DAHZ-X6Y3aQ', 'bold-graphic', 'Tickets on sale', 1080, 1350, ticketBoldPortrait, 'saved', 'supplied-artwork'), campaign: 'tickets' },
  { ...design('DAHZ-XiK_cw', 'bold-graphic', 'Tickets on sale', 1080, 1440, ticketBoldTall, 'saved', 'supplied-artwork'), campaign: 'tickets' },
  { ...design('DAHZ-fzb_kE', 'bold-graphic', 'Tickets on sale', 1080, 1920, ticketBoldStory, 'saved', 'supplied-artwork'), campaign: 'tickets' },
  { ...design('DAHZ-Pk8fbQ', 'bold-graphic', 'Tickets on sale', 1600, 900, ticketBoldWide, 'saved', 'supplied-artwork'), campaign: 'tickets' },
  { ...design('DAHZ-SRV5eo', 'bold-graphic', 'Tickets on sale', 1200, 630, ticketBoldLink, 'saved', 'supplied-artwork'), campaign: 'tickets' },
  { ...design('DAHZ-JE36VU', 'stadium-night', 'Tickets on sale', 1080, 1350, ticketStadiumPortrait, 'saved', 'artistic-render'), campaign: 'tickets' },
  { ...design('DAHZ-LEwyYM', 'stadium-night', 'Tickets on sale', 1080, 1440, ticketStadiumTall, 'saved', 'artistic-render'), campaign: 'tickets' },
  { ...design('DAHZ-KzmDcI', 'stadium-night', 'Tickets on sale', 1080, 1920, ticketStadiumStory, 'saved', 'artistic-render'), campaign: 'tickets' },
  { ...design('DAHZ-GDY4eA', 'stadium-night', 'Tickets on sale', 1600, 900, ticketStadiumWide, 'saved', 'artistic-render'), campaign: 'tickets' },
  { ...design('DAHZ-KEtDD4', 'stadium-night', 'Tickets on sale', 1200, 628, ticketStadiumLink, 'draft', 'artistic-render'), campaign: 'tickets', draftTransactionId: '7600345514221140723' },
  { ...design('DAHZ-Atic_E', 'action-spotlight', 'Tickets on sale', 1080, 1350, ticketActionPortrait, 'draft', 'illustration'), campaign: 'tickets', draftTransactionId: '2788249304273450131' },
  { ...design('DAHZ-NpZy44', 'action-spotlight', 'Tickets on sale', 1080, 1440, ticketActionTall, 'draft', 'illustration'), campaign: 'tickets', draftTransactionId: '1961838772873181076' },
  { ...design('DAHZ-NF5PtA', 'action-spotlight', 'Tickets on sale', 1080, 1920, ticketActionStory, 'draft', 'illustration'), campaign: 'tickets', draftTransactionId: '2053036667138260088' },
  { ...design('DAHZ-N6mNgc', 'action-spotlight', 'Tickets on sale', 1600, 900, ticketActionWide, 'draft', 'illustration'), campaign: 'tickets', draftTransactionId: '2110457562923382698' },
  { ...design('DAHZ-OdHBcs', 'action-spotlight', 'Tickets on sale', 1200, 628, ticketActionLink, 'draft', 'illustration'), campaign: 'tickets', draftTransactionId: '5047930417440512682' },
  { ...design('DAHZ-VDklRg', 'bold-graphic', 'Email hero', 1200, 600, emailBoldHero, 'draft', 'illustration'), format: 'email-hero', draftTransactionId: '1345971528029034038' },
  { ...design('DAHZ-YcI5iE', 'bold-graphic', 'Email header', 1200, 300, emailBoldHeader, 'draft', 'illustration'), format: 'email-header', draftTransactionId: '6086010137548569216' },
  { ...design('DAHZ-f35Lqw', 'bold-graphic', 'Signature banner', 1200, 200, emailBoldSignature, 'draft', 'illustration'), format: 'email-signature', draftTransactionId: '7352647531791887347' },
  { ...design('DAHZ-eoZTJU', 'stadium-night', 'Email hero', 1200, 600, emailStadiumHero, 'saved', 'artistic-render'), format: 'email-hero' },
  { ...design('DAHZ-Qz7ysE', 'stadium-night', 'Email header', 1200, 300, emailStadiumHeader, 'saved', 'artistic-render'), format: 'email-header' },
  { ...design('DAHZ-aWPdWY', 'stadium-night', 'Signature banner', 1200, 200, emailStadiumSignature, 'saved', 'artistic-render'), format: 'email-signature' },
  { ...design('DAHZ-Yhfmec', 'action-spotlight', 'Email hero', 1200, 600, emailActionHero, 'draft', 'illustration'), format: 'email-hero', draftTransactionId: '8162169567027417018' },
  { ...design('DAHZ-TAfRe8', 'action-spotlight', 'Email header', 1200, 300, emailActionHeader, 'draft', 'illustration'), format: 'email-header', draftTransactionId: '6970967462904580402' },
  { ...design('DAHZ-ZUgZMI', 'action-spotlight', 'Signature banner', 1200, 200, emailActionSignature, 'draft', 'illustration'), format: 'email-signature', draftTransactionId: '2769109010084629642' },
  { ...design('DAHZ-aJqp0I', 'launch', 'Email hero', 1200, 600, launchEmailHero, 'draft', 'illustration'), format: 'email-hero', draftTransactionId: '6689492486664486248' },
  { ...design('DAHZ-U8rDwo', 'launch', 'Email header', 1200, 300, launchEmailHeader, 'draft', 'illustration'), format: 'email-header', draftTransactionId: '8431259644166711706' },
  { ...design('DAHZ-VP1heY', 'launch', 'Signature banner', 1200, 200, launchEmailSignature, 'draft', 'illustration'), format: 'email-signature', draftTransactionId: '110859331556479713' },
  { ...design('DAHZ-TTRcKU', 'launch', 'Tickets on sale', 1600, 900, launchTicketWide, 'draft', 'illustration'), campaign: 'tickets', draftTransactionId: '8837709509885405027' },
  { ...design('DAHZ-UjWPds', 'launch', 'Tickets on sale', 1080, 1350, set4TicketPortrait, 'draft', 'illustration'), campaign: 'tickets', draftTransactionId: '2262454058549592735' },
  { ...design('DAHZ-YjfF04', 'launch', 'Tickets on sale', 1080, 1440, set4TicketTall, 'draft', 'illustration'), campaign: 'tickets', draftTransactionId: '2534921835841596116' },
  { ...design('DAHZ-ThB-v8', 'launch', 'Tickets on sale', 1080, 1920, set4TicketStory, 'draft', 'illustration'), campaign: 'tickets', draftTransactionId: '5008523931598344622' },
  { ...design('DAHZ-U-Ytrw', 'launch', 'Tickets on sale', 1200, 628, set4TicketLink, 'draft', 'illustration'), campaign: 'tickets', draftTransactionId: '7352647537621375104' },
];
export function sjbCanvaSize(d: Pick<SjbCanvaGalleryDesign, 'width' | 'height'>) { return `${d.width}×${d.height}`; }
export function filterSjbCanvaDesigns(collectionId: string, size: string, name: string) {
  return SJB_CANVA_GALLERY.filter(d => (collectionId === 'all' || d.collectionId === collectionId) && (size === 'all' || sjbCanvaSize(d) === size) && (name === 'all' || d.name === name));
}
