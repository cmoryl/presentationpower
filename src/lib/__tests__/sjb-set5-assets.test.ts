import { describe, expect, it } from 'vitest';
import { SJB_SET5_ASSETS, SJB_SET5_PACKS } from '../sjb-set5-assets';
import { SET5_ASSET_GROUPS, groupedSet5Assets, set5AssetGroup } from '../sjb-set5-availability';
import { isPublicNoLoginPath } from '../sign-out';

describe('Design Set 5 reusable asset delivery', () => {
  it('includes all four completed asset packs', () => {
    expect(SJB_SET5_PACKS.map(p => p.filename)).toEqual([
      'sjb-set5-reusable-assets.zip', 'sjb-set5-motion-v2.zip', 'sjb-set5-motion-v3.zip', 'sjb-set5-hires-backgrounds.zip',
    ]);
    expect(SJB_SET5_ASSETS).toHaveLength(137);
    expect(new Set(SJB_SET5_ASSETS.map(a => a.id)).size).toBe(137);
  });
  it('adds eight native compositions, their enlargements and four transparent objects', () => {
    expect(SJB_SET5_ASSETS.filter(a => a.category === 'New backgrounds · native')).toHaveLength(8);
    expect(SJB_SET5_ASSETS.filter(a => a.category === 'New backgrounds · enlarged')).toHaveLength(8);
    const objects = SJB_SET5_ASSETS.filter(a => a.category === 'New transparent objects');
    expect(objects).toHaveLength(4);
    expect(SJB_SET5_ASSETS.filter(a => a.category.startsWith("Cinematic power"))).toHaveLength(17);
    for (const asset of objects) {
      expect(asset.filename.endsWith('.png')).toBe(true);
      expect(asset.downloadUrl).not.toBe(asset.previewUrl);
    }
    expect(SJB_SET5_ASSETS.find(a => a.id === 'variety-panoramic-flight-enlarged')?.dimensions).toBe('12000 × 4000');
  });
  it('delivers both original and rebuilt backgrounds for all four source formats', () => {
    for (const format of ['wide', 'portrait', 'story', 'email']) {
      const original = SJB_SET5_ASSETS.find(a => a.id === `hires-${format}-original`);
      const rebuild = SJB_SET5_ASSETS.find(a => a.id === `hires-${format}-rebuild`);
      expect(original?.filename).toBe(`${format}-original-12000px.jpg`);
      expect(rebuild?.filename).toBe(`${format}-rebuild-12000px.jpg`);
      expect(original?.downloadUrl).not.toBe(original?.previewUrl);
      expect(rebuild?.downloadUrl).not.toBe(rebuild?.previewUrl);
    }
    expect(SJB_SET5_ASSETS.find(a => a.id === 'hires-portrait-original')?.dimensions).toBe('9600 × 12000');
    expect(SJB_SET5_ASSETS.find(a => a.id === 'hires-wide-original')?.dimensions).toBe('12000 × 6840');
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
import { SJB_SET5_FULL_DESIGNS } from '../sjb-set5-full';
describe('Set 5 full designs', () => {
  it('has 12 socials and 16 billboards at the agreed board sizes', () => {
    expect(SJB_SET5_FULL_DESIGNS.filter((a) => a.category === 'Full designs · social')).toHaveLength(12);
    const boards = SJB_SET5_FULL_DESIGNS.filter((a) => a.category === 'Full designs · billboards');
    expect(boards).toHaveLength(16);
    expect(new Set(boards.map((b) => b.dimensions))).toEqual(new Set(['840 × 400', '1728 × 512']));
  });
});
