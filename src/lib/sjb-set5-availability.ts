import { queryOptions } from '@tanstack/react-query';
import { listSet5Removals } from './sjb-set5-removals.functions';
import { SJB_SET5_ASSETS, SJB_SET5_PACKS } from './sjb-set5-assets';

export const set5RemovalsOptions = queryOptions({
  queryKey: ['sjb-set5-removals'],
  queryFn: () => listSet5Removals(),
  staleTime: 0,
  refetchInterval: 30_000,
});

export function availableSet5Assets(removed: readonly string[]) {
  const ids = new Set(removed);
  return SJB_SET5_ASSETS.filter(asset => !ids.has(asset.id));
}

export function availableSet5Packs(removed: readonly string[]) {
  const prefixes = ['base-', 'motion-', 'cinematic-', 'hires-'];
  return SJB_SET5_PACKS.filter((_, index) => !removed.some(id => id.startsWith(prefixes[index] ?? '')));
}

// Display grouping for the Set 5 asset pages. Categories stay granular on each
// card; groups are the browsing sections and filter choices. Order matters:
// it is the order sections render on the page.
export const SET5_ASSET_GROUPS = [
  'Finished designs',
  'Backgrounds',
  'Enlarged 12,000px backgrounds',
  'Movable objects (transparent)',
  'Motion & light effects',
  'Layered artwork',
  'Official logos',
] as const;

export type Set5AssetGroup = (typeof SET5_ASSET_GROUPS)[number];

const SET5_GROUP_BY_CATEGORY: Record<string, Set5AssetGroup> = {
  'Full designs · social': 'Finished designs',
  'Full designs · billboards': 'Finished designs',
  'Rule of thirds · native': 'Backgrounds',
  'Cinematic power · native': 'Backgrounds',
  'New backgrounds · native': 'Backgrounds',
  'Backgrounds': 'Backgrounds',
  'Rule of thirds · enlarged': 'Enlarged 12,000px backgrounds',
  'Cinematic power · enlarged': 'Enlarged 12,000px backgrounds',
  'New backgrounds · enlarged': 'Enlarged 12,000px backgrounds',
  'Original backgrounds — enlarged': 'Enlarged 12,000px backgrounds',
  'Backgrounds — detail rebuilds': 'Enlarged 12,000px backgrounds',
  'Cinematic power · transparent': 'Movable objects (transparent)',
  'New transparent objects': 'Movable objects (transparent)',
  'Objects': 'Movable objects (transparent)',
  'Motion footballs': 'Movable objects (transparent)',
  'Motion effects': 'Motion & light effects',
  'Cinematic effects': 'Motion & light effects',
  'Vector effects': 'Motion & light effects',
  'Layered artwork': 'Layered artwork',
  'Official logos': 'Official logos',
};

export function set5AssetGroup(category: string): Set5AssetGroup {
  const group = SET5_GROUP_BY_CATEGORY[category];
  if (!group) throw new Error(`Set 5 asset category has no display group: ${category}`);
  return group;
}

export interface Set5AssetSection<T extends { category: string }> {
  group: Set5AssetGroup;
  assets: T[];
}

export function groupedSet5Assets<T extends { category: string }>(assets: readonly T[]): Set5AssetSection<T>[] {
  return SET5_ASSET_GROUPS
    .map(group => ({ group, assets: assets.filter(a => set5AssetGroup(a.category) === group) }))
    .filter(section => section.assets.length > 0);
}