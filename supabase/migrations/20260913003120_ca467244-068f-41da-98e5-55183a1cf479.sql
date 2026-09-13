-- These token-gated RPCs still carried an implicit PUBLIC execute grant on top
-- of their explicit anon/authenticated grants. Drop the PUBLIC grant so the
-- privilege set matches the roles the app actually uses.
revoke execute on function public.get_london_head_revision() from public;
revoke execute on function public.get_shared_deck_locales(text) from public;
revoke execute on function public.get_shared_print_asset(text) from public;
revoke execute on function public.record_share_view(text, text, integer, integer) from public;
revoke execute on function public.get_template_deck(uuid) from public;
