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
  const prefixes = ['base-', 'motion-', 'cinematic-'];
  return SJB_SET5_PACKS.filter((_, index) => !removed.some(id => id.startsWith(prefixes[index] ?? '')));
}