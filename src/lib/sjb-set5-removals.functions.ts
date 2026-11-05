import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const listSet5Removals = createServerFn({ method: 'GET' }).handler(async () => {
  const { set5PublicClient } = await import('./sjb-set5-removals.server');
  const { data, error } = await set5PublicClient().from('sjb_set5_asset_removals').select('asset_id');
  if (error) throw new Error('Asset availability cannot be checked. Please try again.');
  return (data ?? []).map(row => row.asset_id);
});

export const deleteSet5Asset = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ assetId: z.string().min(1).max(200) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { removeSet5Asset } = await import('./sjb-set5-removals.server');
    return removeSet5Asset(context.supabase, context.userId, data.assetId);
  });