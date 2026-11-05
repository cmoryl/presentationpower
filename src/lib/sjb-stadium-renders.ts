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
