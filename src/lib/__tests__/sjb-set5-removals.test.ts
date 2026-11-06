import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { removeSet5Asset } from '../sjb-set5-removals.server';
import { availableSet5Assets, availableSet5Packs } from '../sjb-set5-availability';

function client(admin: boolean) {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const insert = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn().mockResolvedValue({ data: admin, error: null });
  const from = vi.fn().mockReturnValue({ upsert, insert });
  return { sb: { rpc, from } as unknown as SupabaseClient<Database>, upsert, rpc };
}

describe('Set 5 admin deletions', () => {
  const id = 'cinematic-leather-wake-overlay.png';
  it('allows an authenticated admin to remove a registered asset', async () => {
    const { sb, rpc, upsert } = client(true);
    expect(await removeSet5Asset(sb, 'admin-user', id)).toEqual({ assetId: id });
    expect(rpc).toHaveBeenCalledWith('has_role', { _user_id: 'admin-user', _role: 'admin' });
    expect(upsert).toHaveBeenCalledWith({ asset_id: id }, { onConflict: 'asset_id', ignoreDuplicates: true });
  });
  it('denies non-admin deletion without writing', async () => {
    const { sb, upsert } = client(false);
    await expect(removeSet5Asset(sb, 'viewer-user', id)).rejects.toThrow('Only admins');
    expect(upsert).not.toHaveBeenCalled();
  });
  it('denies deletion of an unregistered asset', async () => {
    const { sb, upsert } = client(true);
    await expect(removeSet5Asset(sb, 'admin-user', 'unknown.png')).rejects.toThrow('Asset not found');
    expect(upsert).not.toHaveBeenCalled();
  });
  it('removes the asset and its containing ZIP from available downloads only', () => {
    expect(availableSet5Assets([id]).some(a => a.id === id)).toBe(false);
    expect(availableSet5Assets([id])).toHaveLength(94);
    expect(availableSet5Packs([id]).map(p => p.filename)).toEqual(['sjb-set5-reusable-assets.zip', 'sjb-set5-motion-v2.zip', 'sjb-set5-hires-backgrounds.zip']);
    expect(availableSet5Assets([])).toHaveLength(95);
  });
  it('removes a standalone variety render without hiding unrelated packs', () => {
    expect(availableSet5Assets(['variety-left-flight']).some(a => a.id === 'variety-left-flight')).toBe(false);
    expect(availableSet5Packs(['variety-left-flight'])).toHaveLength(4);
  });
  it('omits only the high-resolution pack when one of its backgrounds is removed', () => {
    expect(availableSet5Packs(['hires-wide-original']).map(p => p.filename)).toEqual(['sjb-set5-reusable-assets.zip', 'sjb-set5-motion-v2.zip', 'sjb-set5-motion-v3.zip']);
    expect(availableSet5Assets(['hires-wide-original']).some(a => a.id === 'hires-wide-original')).toBe(false);
  });
});