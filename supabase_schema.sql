-- =================================================================
-- TUNAFY — Supabase Schema Migration
-- Jalankan file ini di Supabase Dashboard → SQL Editor
-- =================================================================

-- ─── EXTENSION ───────────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- =================================================================
-- TABEL: profiles
-- Auto-created saat user daftar via Supabase Auth
-- =================================================================
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  full_name  text,
  avatar_url text,
  role       text not null default 'buyer'
             check (role in ('buyer', 'seller', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;

create policy "Profiles: viewable by owner"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Profiles: public username visible"
  on profiles for select
  to anon, authenticated
  using (true);

create policy "Profiles: updatable by owner"
  on profiles for update
  to authenticated
  using (auth.uid() = id);


-- ─── TRIGGER: auto-create profile on register ────────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'username'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- =================================================================
-- TABEL: products
-- =================================================================
create table if not exists products (
  id             uuid primary key default gen_random_uuid(),
  seller_id      uuid references profiles(id) on delete set null,
  name           text not null,
  species        text not null,           -- 'Bluefin Tuna' | 'Bigeye Tuna' | 'Yellowfin Tuna'
  form           text not null,           -- 'Loin (Skin-on)' | 'Steak' | 'Whole' | 'Fillet'
  grade          text not null,           -- 'A+' | 'A' | 'B+'
  price_per_kg   numeric(12,2) not null,
  min_order_kg   integer default 1,
  stock_kg       numeric(10,2) default 0,
  location       text,
  description    text,
  images         text[] default '{}',
  is_active      boolean default true,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- RLS
alter table products enable row level security;

create policy "Products: viewable by all"
  on products for select
  using (is_active = true);

create policy "Products: insertable by seller/admin"
  on products for insert
  to authenticated
  with check (
    auth.uid() = seller_id
    and exists (
      select 1 from profiles where id = auth.uid() and role in ('seller', 'admin')
    )
  );

create policy "Products: updatable by owner"
  on products for update
  to authenticated
  using (auth.uid() = seller_id);

create policy "Products: deletable by owner"
  on products for delete
  to authenticated
  using (auth.uid() = seller_id);


-- ─── INDEX untuk filter/sort yang sering dipakai ─────────────────
create index if not exists idx_products_species  on products(species);
create index if not exists idx_products_form     on products(form);
create index if not exists idx_products_grade    on products(grade);
create index if not exists idx_products_price    on products(price_per_kg);
create index if not exists idx_products_active   on products(is_active);


-- =================================================================
-- TABEL: cart_items
-- =================================================================
create table if not exists cart_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  qty_kg      integer not null default 1 check (qty_kg >= 1),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, product_id)
);

-- RLS
alter table cart_items enable row level security;

create policy "Cart: all ops by owner"
  on cart_items for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- =================================================================
-- TABEL: orders
-- =================================================================
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  buyer_id         uuid not null references profiles(id),
  status           text not null default 'pending'
                   check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  total_amount     numeric(14,2) not null default 0,
  shipping_address jsonb,      -- snapshot alamat saat order
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- RLS
alter table orders enable row level security;

create policy "Orders: visible by buyer"
  on orders for select
  to authenticated
  using (auth.uid() = buyer_id);

create policy "Orders: insertable by buyer"
  on orders for insert
  to authenticated
  with check (auth.uid() = buyer_id);

create policy "Orders: updatable by buyer (cancel only)"
  on orders for update
  to authenticated
  using (auth.uid() = buyer_id);


-- =================================================================
-- TABEL: order_items
-- =================================================================
create table if not exists order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  product_name  text not null,    -- snapshot nama produk
  price_per_kg  numeric(12,2) not null,
  qty_kg        integer not null,
  subtotal      numeric(14,2) generated always as (price_per_kg * qty_kg) stored
);

-- RLS
alter table order_items enable row level security;

create policy "Order items: visible via order"
  on order_items for select
  to authenticated
  using (
    exists (
      select 1 from orders
      where orders.id = order_id
        and orders.buyer_id = auth.uid()
    )
  );

create policy "Order items: insertable"
  on order_items for insert
  to authenticated
  with check (
    exists (
      select 1 from orders
      where orders.id = order_id
        and orders.buyer_id = auth.uid()
    )
  );


-- =================================================================
-- TABEL: payments (MVP — manual confirmation)
-- =================================================================
create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  amount       numeric(14,2) not null,
  method       text default 'bank_transfer',
  status       text not null default 'waiting'
               check (status in ('waiting','verified','rejected')),
  proof_url    text,             -- URL bukti transfer
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- RLS
alter table payments enable row level security;

create policy "Payments: visible by order owner"
  on payments for select
  to authenticated
  using (
    exists (
      select 1 from orders
      where orders.id = order_id
        and orders.buyer_id = auth.uid()
    )
  );

create policy "Payments: insertable by order owner"
  on payments for insert
  to authenticated
  with check (
    exists (
      select 1 from orders
      where orders.id = order_id
        and orders.buyer_id = auth.uid()
    )
  );


-- =================================================================
-- SAMPLE DATA (opsional, uncomment untuk seeding)
-- Tambahkan produk contoh di Supabase Dashboard jika mau
-- =================================================================
-- insert into products (seller_id, name, species, form, grade, price_per_kg, stock_kg, location) values
-- (null, 'Bluefin Loin', 'Bluefin Tuna', 'Loin (Skin-on)', 'A+', 24000, 100, 'Maluku, ID'),
-- (null, 'Bigeye Steak', 'Bigeye Tuna',  'Steak',          'A',  18500, 80,  'Sulawesi, ID'),
-- (null, 'Yellowfin Whole', 'Yellowfin Tuna', 'Whole',      'A+', 22000, 60,  'Bali, ID');


-- =================================================================
-- TABEL: articles (Blog)
-- Jalankan SQL ini di Supabase Dashboard → SQL Editor
-- =================================================================
create table if not exists articles (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null,                    -- URL-friendly identifier, e.g. tuna-premium-ekspor-jepang
  lang           text not null default 'id'
                 check (lang in ('id', 'en')),     -- bahasa artikel
  category       text not null default 'Umum',     -- mis. Industri, Teknologi, Nelayan, Panduan
  title          text not null,
  excerpt        text,                             -- ringkasan singkat
  content        text,                             -- HTML konten artikel
  cover_image    text,                             -- URL gambar cover
  author_name    text default 'Admin Tunafy',
  read_time_min  integer default 3,                -- estimasi waktu baca (menit)
  is_published   boolean default false,
  is_featured    boolean default false,            -- tampil sebagai artikel unggulan
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique(slug, lang)                               -- slug + lang harus unik bersama
);

-- ─── INDEX ─────────────────────────────────────────────────────────
create index if not exists idx_articles_lang        on articles(lang);
create index if not exists idx_articles_published   on articles(is_published);
create index if not exists idx_articles_created_at  on articles(created_at desc);
create index if not exists idx_articles_category    on articles(category);

-- ─── RLS ─────────────────────────────────────────────────────────
alter table articles enable row level security;

-- Publik hanya bisa baca yang sudah published
create policy "Articles: public read published"
  on articles for select
  using (is_published = true);

-- Admin/seller bisa baca semua (termasuk draft)
create policy "Articles: admin read all"
  on articles for select
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'seller')
    )
  );

-- Hanya admin/seller yang bisa insert
create policy "Articles: admin insert"
  on articles for insert
  to authenticated
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'seller')
    )
  );

-- Hanya admin/seller yang bisa update
create policy "Articles: admin update"
  on articles for update
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'seller')
    )
  );

-- Hanya admin/seller yang bisa delete
create policy "Articles: admin delete"
  on articles for delete
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'seller')
    )
  );
