import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { StoreRequest } from './store-adapter';

export const mountedStore = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: StoreRequest) => data)
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc('element_v221_store', {
      op: data.op, p: data.path, body: JSON.parse(JSON.stringify(data.body ?? {})),
      sort_field: data.sortField, sort_desc: data.sortDesc ?? false, max_rows: data.limit ?? 1000,
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const mountedIdentity = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: roles, error }, { data: profile }] = await Promise.all([
      context.supabase.from('user_roles').select('role').eq('user_id', context.userId),
      context.supabase.from('profiles').select('display_name').eq('id', context.userId).maybeSingle(),
    ]);
    if (error || !roles?.length) throw new Error('Staff access required');
    return { id: context.userId, name: profile?.display_name || 'You',
      canWrite: roles.some(r => ['admin','editor','content_owner','brand_lead','brand_reviewer'].includes(r.role)),
      isAdmin: roles.some(r => r.role === 'admin'),
    };
  });

export const mountedPeople = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { ids?: string[]; query?: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: staff, error: roleError } = await context.supabase.rpc('has_any_role', { _user_id: context.userId });
    if (roleError || !staff) throw new Error('Staff access required');
    const { data: rows, error } = await context.supabase.rpc('element_v221_people', { ids: data.ids ?? [], q: data.query ?? '' });
    if (error) throw new Error(error.message);
    const people = (rows ?? []).map(r => ({ id: r.id, name: r.display_name || 'Teammate' }));
    return data.ids ? Object.fromEntries(people.map(p => [p.id, p])) : people;
  });