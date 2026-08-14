-- Jalankan ini di Supabase SQL Editor.
-- Update function reaction biar bisa dipanggil buat nambah ATAU
-- ngurangin (buat fitur undo/toggle klik ulang).

drop function if exists increment_reaction(text);

create or replace function increment_reaction(emoji_key text, delta int default 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update reactions set count = greatest(count + delta, 0) where emoji = emoji_key;
end;
$$;

grant execute on function increment_reaction(text, int) to anon, authenticated;
