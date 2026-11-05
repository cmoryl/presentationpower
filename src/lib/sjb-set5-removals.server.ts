import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { SJB_SET5_ASSETS } from './sjb-set5-assets';
import { logLearningSignal } from './learning.server';

export function set5PublicClient() {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error('Asset availability cannot be checked.');
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
      headers.set('apikey', key);
      return fetch(input, { ...init, headers });
    } },
  });
}

export async function removeSet5Asset(sb: SupabaseClient<Database>, userId: string, assetId: string) {
  const { data: admin, error: roleError } = await sb.rpc('has_role', { _user_id: userId, _role: 'admin' });
  if (roleError || admin !== true) throw new Error('Only admins can delete assets.');
  const asset = SJB_SET5_ASSETS.find(a => a.id === assetId);
  if (!asset) throw new Error('Asset not found.');
  const { error } = await sb.from('sjb_set5_asset_removals').upsert({ asset_id: assetId }, { onConflict: 'asset_id', ignoreDuplicates: true });
  if (error) throw new Error('Asset could not be deleted. Please try again.');
  await logLearningSignal(sb, userId, { source: 'edit', subjectType: 'set5_asset', subjectId: assetId, eventId: 'san-juan-bowl', summary: `Removed Set 5 asset from gallery: ${asset.title}`, detail: { operation: 'remove', originalsPreserved: true } });
  return { assetId };
}