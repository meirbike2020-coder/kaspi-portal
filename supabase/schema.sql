-- Kaspi портал: схема базы.
-- Запустите целиком в Supabase: SQL Editor → New query → вставить → Run.

create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  budget numeric not null default 100000,
  tax_percent numeric not null default 4,
  goal_month numeric not null default 1000000,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  status text not null default 'idea' check (status in ('idea', 'buying', 'selling', 'rejected')),
  kaspi_url text,
  buy_price numeric not null default 0 check (buy_price >= 0),
  ship_cost numeric not null default 0 check (ship_cost >= 0),
  sell_price numeric not null default 0 check (sell_price >= 0),
  fee_percent numeric not null default 12 check (fee_percent >= 0 and fee_percent <= 100),
  delivery_cost numeric not null default 1000 check (delivery_cost >= 0),
  ads_cost numeric not null default 0 check (ads_cost >= 0),
  qty int not null default 10 check (qty >= 0),
  leader_reviews int check (leader_reviews >= 0),
  sellers int check (sellers >= 0),
  note text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_status_idx on public.products (status);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- Доступ: только вошедшие пользователи (ваша команда). Анонимы не видят ничего.
alter table public.settings enable row level security;
alter table public.products enable row level security;

drop policy if exists "team reads settings" on public.settings;
create policy "team reads settings" on public.settings for select to authenticated using (true);
drop policy if exists "team updates settings" on public.settings;
create policy "team updates settings" on public.settings for update to authenticated using (true) with check (id = 1);

drop policy if exists "team reads products" on public.products;
create policy "team reads products" on public.products for select to authenticated using (true);
drop policy if exists "team inserts products" on public.products;
create policy "team inserts products" on public.products for insert to authenticated with check (true);
drop policy if exists "team updates products" on public.products;
create policy "team updates products" on public.products for update to authenticated using (true) with check (true);
drop policy if exists "team deletes products" on public.products;
create policy "team deletes products" on public.products for delete to authenticated using (true);
