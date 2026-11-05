// Standalone San Juan Bowl stadium render set — clean plates (no text, no
// logos) in one cinematic night-game style, reusable as backgrounds across
// every design set. Hyper-realistic interpretations of Hiram Bithorn
// Stadium converted for football: sawtooth folded-plate roof, leaning
// A-frame floodlight pylons, red lower / blue upper bowl, palms.
// Each render is also uploaded to the shared Canva account (canvaMediaId).
import stadiumWide16x9 from '@/assets/sjb-stadium/stadium-night-wide-16x9.jpg';
import stadiumPano2x1 from '@/assets/sjb-stadium/stadium-night-pano-2x1.jpg';
import stadiumPortrait4x5 from '@/assets/sjb-stadium/stadium-night-portrait-4x5.jpg';
import stadiumPortrait3x4 from '@/assets/sjb-stadium/stadium-night-portrait-3x4.jpg';
import stadiumStory9x16 from '@/assets/sjb-stadium/stadium-night-story-9x16.jpg';
import stadiumSquare1x1 from '@/assets/sjb-stadium/stadium-night-square-1x1.jpg';

export interface SjbStadiumRender {
  id: string;
  name: string;
  ratio: string;
  width: number;
  height: number;
  src: string;
  canvaMediaId: string;
  provenance: 'artistic-render';
}

export const SJB_STADIUM_RENDERS: readonly SjbStadiumRender[] = [
  { id: 'stadium-night-wide-16x9', name: 'Stadium night — wide 16:9', ratio: '16:9', width: 1920, height: 1088, src: stadiumWide16x9, canvaMediaId: 'MAHaAD8vpi0', provenance: 'artistic-render' },
  { id: 'stadium-night-pano-2x1', name: 'Stadium night — panoramic 2:1', ratio: '2:1', width: 1920, height: 960, src: stadiumPano2x1, canvaMediaId: 'MAHaACBu8fQ', provenance: 'artistic-render' },
  { id: 'stadium-night-portrait-4x5', name: 'Stadium night — portrait 4:5', ratio: '4:5', width: 1536, height: 1920, src: stadiumPortrait4x5, canvaMediaId: 'MAHaAHj6x3g', provenance: 'artistic-render' },
  { id: 'stadium-night-portrait-3x4', name: 'Stadium night — portrait 3:4', ratio: '3:4', width: 1440, height: 1920, src: stadiumPortrait3x4, canvaMediaId: 'MAHaAO3YvzA', provenance: 'artistic-render' },
  { id: 'stadium-night-story-9x16', name: 'Stadium night — story 9:16', ratio: '9:16', width: 1088, height: 1920, src: stadiumStory9x16, canvaMediaId: 'MAHaANQnhac', provenance: 'artistic-render' },
  { id: 'stadium-night-square-1x1', name: 'Stadium night — square 1:1', ratio: '1:1', width: 1920, height: 1920, src: stadiumSquare1x1, canvaMediaId: 'MAHaAKJhOxE', provenance: 'artistic-render' },
];

// Standalone venue plate set — same cinematic night-game style as the
// stadium renders above, focused on the Hiram Bithorn venue itself (roof
// canopy, A-frame pylons, red/blue bowls, palms) with no text or logos so
// any design set can drop one in as a background. All six are uploaded to
// the shared Canva account (canvaMediaId).
import venuePlate16x9 from '@/assets/sjb-venue-plates/plate-16x9.jpg';
import venuePlate2x1 from '@/assets/sjb-venue-plates/plate-2x1.jpg';
import venuePlate4x5 from '@/assets/sjb-venue-plates/plate-4x5.jpg';
import venuePlate3x4 from '@/assets/sjb-venue-plates/plate-3x4.jpg';
import venuePlate9x16 from '@/assets/sjb-venue-plates/plate-9x16.jpg';
import venuePlate1x1 from '@/assets/sjb-venue-plates/plate-1x1.jpg';

export const SJB_VENUE_PLATES: readonly SjbStadiumRender[] = [
  { id: 'venue-plate-wide-16x9', name: 'Venue plate — wide 16:9', ratio: '16:9', width: 1920, height: 1088, src: venuePlate16x9, canvaMediaId: 'MAHaABl0Qx8', provenance: 'artistic-render' },
  { id: 'venue-plate-pano-2x1', name: 'Venue plate — panoramic 2:1', ratio: '2:1', width: 1920, height: 960, src: venuePlate2x1, canvaMediaId: 'MAHaAAcMIyY', provenance: 'artistic-render' },
  { id: 'venue-plate-portrait-4x5', name: 'Venue plate — portrait 4:5', ratio: '4:5', width: 1536, height: 1920, src: venuePlate4x5, canvaMediaId: 'MAHaANpiBvc', provenance: 'artistic-render' },
  { id: 'venue-plate-portrait-3x4', name: 'Venue plate — portrait 3:4', ratio: '3:4', width: 1440, height: 1920, src: venuePlate3x4, canvaMediaId: 'MAHaACNwV2k', provenance: 'artistic-render' },
  { id: 'venue-plate-story-9x16', name: 'Venue plate — story 9:16', ratio: '9:16', width: 1088, height: 1920, src: venuePlate9x16, canvaMediaId: 'MAHaAOOWk6Y', provenance: 'artistic-render' },
  { id: 'venue-plate-square-1x1', name: 'Venue plate — square 1:1', ratio: '1:1', width: 1920, height: 1920, src: venuePlate1x1, canvaMediaId: 'MAHaAGdtO1Y', provenance: 'artistic-render' },
];
