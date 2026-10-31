-- =============================================================================
-- MAA LAKSHMI ALANKAR (মা লক্ষ্মী অলংকার)
-- Complete Supabase PostgreSQL Schema, Storage Policies & Row Level Security
-- =============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ADMIN PROFILES TABLE (Authorized Admin Registry)
-- -----------------------------------------------------------------------------
create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  created_at timestamptz not null default now()
);

alter table public.admin_profiles enable row level security;

-- Helper function: securely checks if the current authenticated user is an authorized admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
  );
$$;

create policy "Admins can view own admin profile"
  on public.admin_profiles
  for select
  using (auth.uid() = id or public.is_admin());

-- -----------------------------------------------------------------------------
-- 2. CATEGORIES TABLE
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id text primary key default ('cat-' || substr(gen_random_uuid()::text, 1, 8)),
  slug text not null unique,
  name text not null,
  name_bn text not null default '',
  description text not null default '',
  description_bn text not null default '',
  image text not null default '',
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists idx_categories_slug on public.categories(slug);
create index if not exists idx_categories_sort on public.categories(sort_order);

alter table public.categories enable row level security;

create policy "Anyone can view categories"
  on public.categories for select
  using (true);

create policy "Only admins can insert categories"
  on public.categories for insert
  with check (public.is_admin());

create policy "Only admins can update categories"
  on public.categories for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Only admins can delete categories"
  on public.categories for delete
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. PRODUCTS TABLE
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id text primary key default ('prod-' || substr(gen_random_uuid()::text, 1, 8)),
  product_code text not null unique,
  slug text not null unique,
  name text not null,
  name_bn text not null default '',
  description text not null default '',
  description_bn text not null default '',
  regular_price numeric(12, 2) not null check (regular_price >= 0),
  discount_price numeric(12, 2) check (discount_price is null or discount_price >= 0),
  category text not null references public.categories(slug) on update cascade,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  in_stock boolean not null default true,
  variations jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  purity text not null default '22K (916 Hallmarked)',
  weight_info text not null default '',
  is_featured boolean not null default false,
  is_best_seller boolean not null default false,
  is_new_arrival boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_slug on public.products(slug);
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_featured on public.products(is_featured);

alter table public.products enable row level security;

create policy "Anyone can view products"
  on public.products for select
  using (true);

create policy "Only admins can insert products"
  on public.products for insert
  with check (public.is_admin());

create policy "Only admins can update products"
  on public.products for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Only admins can delete products"
  on public.products for delete
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4. ORDERS & ORDER ITEMS TABLES
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id text primary key default ('ord-' || substr(gen_random_uuid()::text, 1, 10)),
  order_number text not null unique,
  customer_name text not null,
  mobile_number text not null,
  district text not null,
  upazila text not null,
  full_address text not null,
  order_notes text not null default '',
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  delivery_charge numeric(12, 2) not null default 0 check (delivery_charge >= 0),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  payment_method text not null default 'Cash on Delivery' check (payment_method = 'Cash on Delivery'),
  status text not null default 'Pending' check (
    status in ('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_order_number on public.orders(order_number);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_mobile on public.orders(mobile_number);
create index if not exists idx_orders_created_at on public.orders(created_at desc);

alter table public.orders enable row level security;

-- Customers CANNOT list or view other customers' orders!
create policy "Only admins can view all orders"
  on public.orders for select
  using (public.is_admin());

create policy "Only admins can update orders"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Only admins can delete orders"
  on public.orders for delete
  using (public.is_admin());

-- Secure Order Tracking RPC (verifies Order Number + Mobile Number match)
create or replace function public.track_customer_order(
  p_order_number text,
  p_mobile_number text
)
returns setof public.orders
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.orders
  where upper(trim(order_number)) = upper(trim(p_order_number))
    and regexp_replace(mobile_number, '[^0-9]', '', 'g')
      like '%' || right(regexp_replace(p_mobile_number, '[^0-9]', '', 'g'), 10);
$$;

-- -----------------------------------------------------------------------------
-- 5. SITE SETTINGS TABLE (Single Row id = 1)
-- -----------------------------------------------------------------------------
create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

create policy "Anyone can view public site settings"
  on public.site_settings for select
  using (true);

create policy "Only admins can update site settings"
  on public.site_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 6. SUPABASE STORAGE BUCKET FOR PRODUCT & BANNER IMAGES
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('jewellery-media', 'jewellery-media', true)
on conflict (id) do nothing;

create policy "Public read access on jewellery-media"
  on storage.objects for select
  using (bucket_id = 'jewellery-media');

create policy "Admin upload access on jewellery-media"
  on storage.objects for insert
  with check (bucket_id = 'jewellery-media' and public.is_admin());

create policy "Admin update access on jewellery-media"
  on storage.objects for update
  using (bucket_id = 'jewellery-media' and public.is_admin());

create policy "Admin delete access on jewellery-media"
  on storage.objects for delete
  using (bucket_id = 'jewellery-media' and public.is_admin());
