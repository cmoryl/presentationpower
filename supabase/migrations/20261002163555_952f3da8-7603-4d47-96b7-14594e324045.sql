create or replace function public.lock_master_slide_order()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.position is distinct from old.position
     and coalesce(current_setting('app.allow_master_reorder', true), '') <> 'on'
     and exists (select 1 from public.decks d where d.id = old.deck_id and d.is_template and d.context ? 'master') then
    new.position := old.position;
  end if;
  return new;
end $$;

drop trigger if exists trg_lock_master_slide_order on public.deck_slides;
create trigger trg_lock_master_slide_order
before update on public.deck_slides
for each row execute function public.lock_master_slide_order();