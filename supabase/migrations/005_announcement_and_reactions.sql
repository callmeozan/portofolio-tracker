-- Jalankan ini di Supabase SQL Editor.

-- Kolom pengumuman di portfolio_settings (kalau belum ada)
alter table portfolio_settings add column if not exists announcement text;
alter table portfolio_settings add column if not exists announcement_updated_at timestamptz;

-- Tabel reactions
create table if not exists reactions (
  emoji text primary key,
  count int default 0
);
alter table reactions enable row level security;
create policy "public_read_reactions" on reactions for select using (true);

insert into reactions (emoji, count) values
  ('👍', 0), ('🔥', 0), ('❤️', 0), ('🎉', 0), ('💪', 0)
on conflict (emoji) do nothing;

create or replace function increment_reaction(emoji_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update reactions set count = count + 1 where emoji = emoji_key;
end;
$$;

grant execute on function increment_reaction(text) to anon, authenticated;
