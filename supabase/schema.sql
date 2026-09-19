-- Хранение маршрута пользователя в Supabase.
-- Выполнить один раз: панель Supabase → SQL Editor → New query → Run.
--
-- Одна строка на пользователя. Состояние маршрута (анкета, шорт-лист, отметки
-- в плане) лежит в jsonb целиком: структура ещё меняется от версии к версии,
-- и разносить её по колонкам рано — миграции обошлись бы дороже пользы.

create table if not exists public.routes (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.routes is 'Маршрут поступления: анкета, выбранные программы и прогресс плана';

-- Row Level Security: каждый видит и меняет только свою строку.
-- Без этого anon key из бандла открыл бы чужие маршруты.
alter table public.routes enable row level security;

drop policy if exists "routes: читать своё" on public.routes;
create policy "routes: читать своё"
  on public.routes for select
  using (auth.uid() = user_id);

drop policy if exists "routes: создавать своё" on public.routes;
create policy "routes: создавать своё"
  on public.routes for insert
  with check (auth.uid() = user_id);

drop policy if exists "routes: обновлять своё" on public.routes;
create policy "routes: обновлять своё"
  on public.routes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "routes: удалять своё" on public.routes;
create policy "routes: удалять своё"
  on public.routes for delete
  using (auth.uid() = user_id);

-- updated_at ставит сервер: время браузера может врать, а по этому полю
-- клиент решает, чья версия свежее.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists routes_touch_updated_at on public.routes;
create trigger routes_touch_updated_at
  before update on public.routes
  for each row execute function public.touch_updated_at();
