import { describe, expect, it } from 'vitest';
import { SJB_SET5_ASSETS, SJB_SET5_PACKS } from '../sjb-set5-assets';
import { isPublicNoLoginPath } from '../sign-out';

describe('Design Set 5 reusable asset delivery', () => {
  it('includes all three completed asset packs', () => {
    expect(SJB_SET5_PACKS.map(p => p.filename)).toEqual([
      'sjb-set5-reusable-assets.zip', 'sjb-set5-motion-v2.zip', 'sjb-set5-motion-v3.zip',
    ]);
    expect(SJB_SET5_ASSETS).toHaveLength(58);
    expect(new Set(SJB_SET5_ASSETS.map(a => a.id)).size).toBe(58);
  });
  it('keeps cinematic original PNG downloads separate from lightweight previews', () => {
    const asset = SJB_SET5_ASSETS.find(a => a.filename === 'leather-cinematic-transparent.png');
    expect(asset?.dimensions).toBe('1920 × 1280');
    expect(asset?.downloadUrl).toContain('.png');
    expect(asset?.previewUrl).toContain('.webp');
    expect(asset?.downloadUrl).not.toBe(asset?.previewUrl);
  });
  it('allows viewing both asset pages without signing in', () => {
    expect(isPublicNoLoginPath('/share/san-juan-bowl/set-5-assets')).toBe(true);
    expect(isPublicNoLoginPath('/events/san-juan-bowl/set-5-assets')).toBe(true);
  });
});