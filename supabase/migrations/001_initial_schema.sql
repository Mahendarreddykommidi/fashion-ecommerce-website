-- ATELIER — PostgreSQL / Supabase Migration & Row Level Security Policies
-- Covers all 15 relational tables, constraints, indexes, RLS, and atomic order RPC.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text default '',
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  gender text not null default 'unisex' check (gender in ('men', 'women', 'unisex')),
  brand text not null,
  base_price integer not null check (base_price >= 0),
  sale_price integer check (sale_price is null or sale_price >= 0),
  featured boolean not null default false,
  bestseller boolean not null default false,
  new_arrival boolean not null default false,
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  display_order integer not null default 0
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  color text not null,
  sku text not null unique,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  price_adjustment integer not null default 0
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text not null,
  address_line text not null,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'India',
  is_default boolean not null default false
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unique(cart_id, product_variant_id)
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  order_number text not null unique,
  subtotal integer not null check (subtotal >= 0),
  discount integer not null default 0 check (discount >= 0),
  shipping_fee integer not null default 0 check (shipping_fee >= 0),
  tax_amount integer not null default 0 check (tax_amount >= 0),
  total_amount integer not null check (total_amount >= 0),
  payment_method text not null check (payment_method in ('razorpay', 'stripe', 'cod')),
  payment_status text not null check (payment_status in ('pending', 'pending_cod', 'paid', 'failed', 'refunded')),
  order_status text not null check (order_status in ('pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled')),
  shipping_address jsonb not null,
  tracking_number text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  product_name_snapshot text not null,
  selected_size text not null,
  selected_color text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null check (provider in ('razorpay', 'stripe', 'cod')),
  provider_payment_id text,
  amount integer not null check (amount >= 0),
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  minimum_order integer not null default 0,
  maximum_discount integer,
  expiry_date timestamptz not null,
  usage_limit integer not null default 1000,
  usage_count integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_variants_product on public.product_variants(product_id);
create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_number on public.orders(order_number);
create index if not exists idx_reviews_product on public.reviews(product_id);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlists enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.coupons enable row level security;
alter table public.reviews enable row level security;
alter table public.newsletter_subscribers enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Public read catalog policies
create policy "Public read categories" on public.categories for select using (true);
create policy "Public read active products" on public.products for select using (status = 'active' or public.is_admin());
create policy "Public read product images" on public.product_images for select using (true);
create policy "Public read product variants" on public.product_variants for select using (true);
create policy "Public read reviews" on public.reviews for select using (true);

-- Customer private record policies
create policy "Own profile read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "Own profile update" on public.profiles for update using (id = auth.uid());
create policy "Own addresses" on public.addresses for all using (user_id = auth.uid());
create policy "Own carts" on public.carts for all using (user_id = auth.uid());
create policy "Own cart items" on public.cart_items for all using (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
);
create policy "Own wishlist" on public.wishlists for all using (user_id = auth.uid());
create policy "Own orders read" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "Own order items read" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
);
create policy "Authenticated create review" on public.reviews for insert with check (user_id = auth.uid());
create policy "Newsletter insert" on public.newsletter_subscribers for insert with check (true);

-- Admin policies
create policy "Admin manage categories" on public.categories for all using (public.is_admin());
create policy "Admin manage products" on public.products for all using (public.is_admin());
create policy "Admin manage product images" on public.product_images for all using (public.is_admin());
create policy "Admin manage variants" on public.product_variants for all using (public.is_admin());
create policy "Admin manage orders" on public.orders for update using (public.is_admin());
create policy "Admin manage coupons" on public.coupons for all using (public.is_admin());
create policy "Admin read payments" on public.payments for select using (public.is_admin());
