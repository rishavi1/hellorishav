-- SARVIO Supabase setup. Run in Supabase Dashboard > SQL Editor.
-- IMPORTANT: Create the Supabase Auth user with this UUID first.
-- This setup script then grants that user SARVIO admin access.
-- Admin UID supplied by the site owner: 1a08c548-ac0e-4366-9225-66894b941e96.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
-- Register the owner's existing Supabase Auth user as a SARVIO admin.
-- This requires that this UUID already exists in Authentication > Users.
insert into public.admin_users (user_id)
values ('1a08c548-ac0e-4366-9225-66894b941e96'::uuid)
on conflict (user_id) do nothing;

create table if not exists public.sarvio_store_items (
  kind text not null check (kind in ('products','categories','orders')),
  id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (kind,id)
);
create table if not exists public.sarvio_settings (
  key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.sarvio_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.sarvio_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admin_users where user_id = auth.uid()); $$;
revoke all on function public.sarvio_is_admin() from public;
grant execute on function public.sarvio_is_admin() to anon, authenticated;

grant select, insert, update, delete on public.sarvio_store_items to anon, authenticated;
grant select, insert, update, delete on public.sarvio_settings to anon, authenticated;
grant select, insert, update on public.sarvio_profiles to authenticated;
grant select on public.admin_users to authenticated;

alter table public.admin_users enable row level security;
alter table public.sarvio_store_items enable row level security;
alter table public.sarvio_settings enable row level security;
alter table public.sarvio_profiles enable row level security;

drop policy if exists "admins manage admin list" on public.admin_users;
create policy "admins manage admin list" on public.admin_users for all to authenticated using (public.sarvio_is_admin()) with check (public.sarvio_is_admin());

drop policy if exists "public read catalogue" on public.sarvio_store_items;
create policy "public read catalogue" on public.sarvio_store_items for select to anon, authenticated using (kind in ('products','categories') or public.sarvio_is_admin());
drop policy if exists "admins manage catalogue and orders" on public.sarvio_store_items;
create policy "admins manage catalogue and orders" on public.sarvio_store_items for all to authenticated using (public.sarvio_is_admin()) with check (public.sarvio_is_admin());
drop policy if exists "customers submit new orders" on public.sarvio_store_items;
create policy "customers submit new orders" on public.sarvio_store_items for insert to anon, authenticated with check (kind='orders');

drop policy if exists "public read promotions" on public.sarvio_settings;
create policy "public read promotions" on public.sarvio_settings for select to anon, authenticated using (true);
drop policy if exists "admins manage promotions" on public.sarvio_settings;
create policy "admins manage promotions" on public.sarvio_settings for all to authenticated using (public.sarvio_is_admin()) with check (public.sarvio_is_admin());

drop policy if exists "customers manage own profile" on public.sarvio_profiles;
create policy "customers manage own profile" on public.sarvio_profiles for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

-- Optional product/banner storage bucket. The website currently accepts image URLs/data URLs;
-- use this bucket for uploaded images once storage upload support is enabled.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('sarvio-media','sarvio-media',true,5242880,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;
drop policy if exists "public view SARVIO media" on storage.objects;
create policy "public view SARVIO media" on storage.objects for select using (bucket_id='sarvio-media');
drop policy if exists "admins upload SARVIO media" on storage.objects;
create policy "admins upload SARVIO media" on storage.objects for insert to authenticated with check (bucket_id='sarvio-media' and public.sarvio_is_admin());
drop policy if exists "admins update SARVIO media" on storage.objects;
create policy "admins update SARVIO media" on storage.objects for update to authenticated using (bucket_id='sarvio-media' and public.sarvio_is_admin()) with check (bucket_id='sarvio-media' and public.sarvio_is_admin());
drop policy if exists "admins delete SARVIO media" on storage.objects;
create policy "admins delete SARVIO media" on storage.objects for delete to authenticated using (bucket_id='sarvio-media' and public.sarvio_is_admin());

-- Customer saved addresses: each authenticated customer can store up to 3.
create table if not exists public.sarvio_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home' check (label in ('Home','Work','Other')),
  address text not null check (char_length(address) >= 8 and char_length(address) <= 500),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists sarvio_addresses_user_id_idx on public.sarvio_addresses(user_id);
alter table public.sarvio_addresses enable row level security;
grant select, insert, update, delete on public.sarvio_addresses to authenticated;
drop policy if exists "customers manage own saved addresses" on public.sarvio_addresses;
create policy "customers manage own saved addresses" on public.sarvio_addresses
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Restrict order inserts to signed-in customers submitting their own user_id.
drop policy if exists "customers submit new orders" on public.sarvio_store_items;
create policy "customers submit new orders" on public.sarvio_store_items
for insert to authenticated with check (
  kind = 'orders' and (payload->>'user_id') = auth.uid()::text
);
