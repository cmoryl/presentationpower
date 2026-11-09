import { describe, expect, it } from 'vitest';
import { SJB_CANVA_GALLERY } from '@/lib/sjb-canva-gallery';
import { sjbIllustratorMaster, sjbIllustratorMasterIds } from '@/lib/sjb-illustrator-masters';

describe('Bowl social Illustrator packages', () => {
  const socials = SJB_CANVA_GALLERY.filter(d => !d.format?.startsWith('email'));

  it('every saved non-email social has an editable Illustrator package', () => {
    const missing = socials.filter(d => d.status === 'saved' && !sjbIllustratorMaster(d.id)).map(d => d.id);
    expect(missing).toEqual([]);
  });

  it('packages only exist for designs in the social gallery', () => {
    const ids = new Set(SJB_CANVA_GALLERY.map(d => d.id));
    expect(sjbIllustratorMasterIds().filter(id => !ids.has(id))).toEqual([]);
  });
});
