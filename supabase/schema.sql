-- =========================================================
-- BuildBridge core schema
-- Run this in the Supabase SQL editor (or via CLI migration).
-- Designed so the append-only tables (progress_updates, payments,
-- estimate history) form a tamper-evident record of the project —
-- rows are never edited or deleted through the app, only inserted.
-- =========================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------
-- Profiles (extends Supabase auth.users)
-- ---------------------------------------------------------
create type user_role as enum ('client', 'contractor', 'admin');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'client',
  email text unique,
  full_name text not null,
  company_name text,
  phone text,
  avatar_url text,
  service_area text,
  specialties text[] not null default '{}',
  years_experience int,
  license_url text,
  is_verified boolean not null default false,
  bio text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Portfolio images (contractor's previous work, shown on their profile)
-- ---------------------------------------------------------
create table portfolio_images (
  id uuid primary key default uuid_generate_v4(),
  contractor_id uuid not null references profiles(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index on portfolio_images (contractor_id);

-- ---------------------------------------------------------
-- Projects
-- ---------------------------------------------------------
create type project_status as enum ('draft', 'active', 'on_hold', 'completed', 'cancelled');

create table projects (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  project_type text not null, -- basement | deck | den | kitchen | bathroom | general
  description text,
  client_id uuid not null references profiles(id) on delete cascade,
  contractor_id uuid references profiles(id) on delete set null,
  status project_status not null default 'draft',
  budget numeric(12,2),
  address text,
  start_date date,
  target_end_date date,
  share_token uuid not null default uuid_generate_v4(), -- powers the read-only public summary link
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on projects (client_id);
create index on projects (contractor_id);
create unique index on projects (share_token);

-- ---------------------------------------------------------
-- Milestones
-- ---------------------------------------------------------
create type milestone_status as enum ('not_started', 'in_progress', 'complete', 'blocked');

create table milestones (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  status milestone_status not null default 'not_started',
  pct_complete int not null default 0 check (pct_complete between 0 and 100),
  expected_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index on milestones (project_id);

-- ---------------------------------------------------------
-- Estimates (versioned — never overwritten, only superseded)
-- ---------------------------------------------------------
create type estimate_status as enum ('draft', 'sent', 'accepted', 'rejected', 'superseded');

create table estimates (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  version int not null,
  status estimate_status not null default 'draft',
  labor_total numeric(12,2) not null default 0,
  material_total numeric(12,2) not null default 0,
  other_total numeric(12,2) not null default 0,
  total numeric(12,2) generated always as (labor_total + material_total + other_total) stored,
  notes text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create table estimate_line_items (
  id uuid primary key default uuid_generate_v4(),
  estimate_id uuid not null references estimates(id) on delete cascade,
  category text not null check (category in ('labor', 'material', 'other')),
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_cost numeric(12,2) not null default 0,
  line_total numeric(12,2) generated always as (quantity * unit_cost) stored
);

create index on estimates (project_id);
create index on estimate_line_items (estimate_id);

-- ---------------------------------------------------------
-- Change orders (the core trust/differentiation feature)
-- ---------------------------------------------------------
create type change_order_status as enum ('pending', 'approved', 'rejected');

create table change_orders (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text not null,
  cost_delta numeric(12,2) not null default 0, -- can be negative (credit)
  status change_order_status not null default 'pending',
  requested_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id)
);

create index on change_orders (project_id);

-- ---------------------------------------------------------
-- Progress updates (append-only — no update/delete policy granted)
-- ---------------------------------------------------------
create table progress_updates (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  milestone_id uuid references milestones(id) on delete set null,
  author_id uuid not null references profiles(id),
  note text,
  photo_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index on progress_updates (project_id);

-- ---------------------------------------------------------
-- Payments (tracking only — no processing in v1)
-- ---------------------------------------------------------
create type payment_type as enum ('deposit', 'milestone', 'final', 'other');

create table payments (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  type payment_type not null,
  amount numeric(12,2) not null,
  note text,
  recorded_by uuid not null references profiles(id),
  paid_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index on payments (project_id);

-- ---------------------------------------------------------
-- Messages (scoped per project, not a generic inbox)
-- ---------------------------------------------------------
create table messages (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index on messages (project_id, created_at);

-- ---------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  contractor_id uuid not null references profiles(id),
  client_id uuid not null references profiles(id),
  rating int not null check (rating between 1 and 5),
  body text,
  contractor_response text,
  created_at timestamptz not null default now(),
  unique (project_id, client_id)
);

-- Reports on a review, used by the admin moderation queue. Kept as its
-- own table (rather than a boolean flag directly on `reviews`) so that
-- reporting doesn't require broadening the reviews update policy beyond
-- "contractor responds to their own review".
create table review_flags (
  id uuid primary key default uuid_generate_v4(),
  review_id uuid not null references reviews(id) on delete cascade,
  reporter_id uuid not null references profiles(id),
  reason text,
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);

create index on review_flags (review_id);

-- ---------------------------------------------------------
-- updated_at trigger for projects
-- ---------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_set_updated_at
before update on projects
for each row execute function set_updated_at();

-- Note: the trigger that protects review integrity (contractors may only
-- edit `contractor_response`, never the client's rating or text) lives in
-- policies.sql, since it depends on the is_admin() helper defined there.
