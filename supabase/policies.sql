-- =========================================================
-- Row Level Security
-- Run after schema.sql. This is what turns "tamper-evident
-- record" from a UI promise into a database guarantee:
-- progress_updates and payments can be inserted but never
-- updated or deleted by clients or contractors.
-- =========================================================

alter table profiles enable row level security;
alter table portfolio_images enable row level security;
alter table projects enable row level security;
alter table milestones enable row level security;
alter table estimates enable row level security;
alter table estimate_line_items enable row level security;
alter table change_orders enable row level security;
alter table progress_updates enable row level security;
alter table payments enable row level security;
alter table messages enable row level security;
alter table reviews enable row level security;
alter table review_flags enable row level security;

-- ---------------------------------------------------------
-- Helper: is the current user a member (client or contractor) of a project?
-- ---------------------------------------------------------
create or replace function is_project_member(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from projects
    where id = p_project_id
    and (client_id = auth.uid() or contractor_id = auth.uid())
  );
$$ language sql security definer stable;

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- ---------------------------------------------------------
-- Profiles: anyone authenticated can read public contractor profiles;
-- a user can only edit their own row.
-- ---------------------------------------------------------
create policy "profiles are readable by authenticated users"
  on profiles for select
  using (auth.role() = 'authenticated');

create policy "users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "admins can update any profile"
  on profiles for update
  using (is_admin());

-- ---------------------------------------------------------
-- Portfolio images: public read (they're marketing material for the
-- contractor marketplace), owner-only write.
-- ---------------------------------------------------------
create policy "anyone can view portfolio images"
  on portfolio_images for select
  using (true);

create policy "contractors manage their own portfolio images"
  on portfolio_images for insert
  with check (contractor_id = auth.uid());

create policy "contractors can delete their own portfolio images"
  on portfolio_images for delete
  using (contractor_id = auth.uid());

-- ---------------------------------------------------------
-- Projects
-- ---------------------------------------------------------
create policy "members can view their projects"
  on projects for select
  using (client_id = auth.uid() or contractor_id = auth.uid());

create policy "clients can create projects"
  on projects for insert
  with check (
    client_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and role = 'client')
  );

create policy "members can update their projects"
  on projects for update
  using (client_id = auth.uid() or contractor_id = auth.uid());

create policy "admins can view all projects"
  on projects for select
  using (is_admin());

create policy "admins can update any project"
  on projects for update
  using (is_admin());

-- No public select policy on `projects` itself. The shareable, no-login
-- summary link is served entirely through the `project_public_summary`
-- view below, which is granted to the `anon` role and exposes only a
-- safe subset of columns (no messages, no internal notes, no payments).

-- ---------------------------------------------------------
-- Milestones
-- ---------------------------------------------------------
create policy "members can view milestones"
  on milestones for select
  using (is_project_member(project_id));

create policy "members can insert milestones"
  on milestones for insert
  with check (is_project_member(project_id));

create policy "members can update milestones"
  on milestones for update
  using (is_project_member(project_id));

-- ---------------------------------------------------------
-- Estimates & line items
-- ---------------------------------------------------------
create policy "members can view estimates"
  on estimates for select
  using (is_project_member(project_id));

create policy "contractors can create estimates"
  on estimates for insert
  with check (is_project_member(project_id) and created_by = auth.uid());

create policy "members can update estimate status"
  on estimates for update
  using (is_project_member(project_id));

create policy "members can view line items"
  on estimate_line_items for select
  using (exists (
    select 1 from estimates e
    where e.id = estimate_id and is_project_member(e.project_id)
  ));

create policy "members can insert line items"
  on estimate_line_items for insert
  with check (exists (
    select 1 from estimates e
    where e.id = estimate_id and is_project_member(e.project_id)
  ));

-- ---------------------------------------------------------
-- Change orders
-- ---------------------------------------------------------
create policy "members can view change orders"
  on change_orders for select
  using (is_project_member(project_id));

create policy "members can create change orders"
  on change_orders for insert
  with check (is_project_member(project_id) and requested_by = auth.uid());

create policy "members can resolve change orders"
  on change_orders for update
  using (is_project_member(project_id));

-- ---------------------------------------------------------
-- Progress updates — INSERT ONLY. No update/delete policy exists,
-- so once a row is written it is permanent for the life of the project.
-- ---------------------------------------------------------
create policy "members can view progress updates"
  on progress_updates for select
  using (is_project_member(project_id));

create policy "members can insert progress updates"
  on progress_updates for insert
  with check (is_project_member(project_id) and author_id = auth.uid());

-- ---------------------------------------------------------
-- Payments — also INSERT ONLY for the same reason.
-- ---------------------------------------------------------
create policy "members can view payments"
  on payments for select
  using (is_project_member(project_id));

create policy "members can record payments"
  on payments for insert
  with check (is_project_member(project_id) and recorded_by = auth.uid());

-- ---------------------------------------------------------
-- Messages
-- ---------------------------------------------------------
create policy "members can view messages"
  on messages for select
  using (is_project_member(project_id));

create policy "members can send messages"
  on messages for insert
  with check (is_project_member(project_id) and sender_id = auth.uid());

-- ---------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------
create policy "anyone authenticated can view reviews"
  on reviews for select
  using (auth.role() = 'authenticated');

create policy "clients can leave one review per project"
  on reviews for insert
  with check (
    client_id = auth.uid()
    and is_project_member(project_id)
    and exists (
      select 1 from projects
      where id = project_id and status = 'completed'
    )
  );

create policy "contractors can respond to their reviews"
  on reviews for update
  using (contractor_id = auth.uid());

create policy "admins can moderate any review"
  on reviews for delete
  using (is_admin());

-- ---------------------------------------------------------
-- Review flags (reports on inappropriate reviews)
-- ---------------------------------------------------------
create policy "admins can view review flags"
  on review_flags for select
  using (is_admin());

create policy "authenticated users can report a review"
  on review_flags for insert
  with check (reporter_id = auth.uid());

create policy "admins can clear review flags"
  on review_flags for delete
  using (is_admin());

-- ---------------------------------------------------------
-- Review integrity: the reviews UPDATE policy above is scoped to the
-- reviewed contractor so they can post a response, but RLS can't
-- restrict which columns an UPDATE touches. This trigger closes that
-- gap: a contractor's own update may only change `contractor_response`
-- — the rating and text the client wrote stay immutable to everyone
-- except an admin.
-- ---------------------------------------------------------
create or replace function protect_review_integrity()
returns trigger as $$
begin
  if is_admin() then
    return new;
  end if;
  if new.rating is distinct from old.rating
    or new.body is distinct from old.body
    or new.client_id is distinct from old.client_id
    or new.contractor_id is distinct from old.contractor_id
    or new.project_id is distinct from old.project_id then
    raise exception 'Only contractor_response can be edited on an existing review';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger reviews_protect_integrity
before update on reviews
for each row execute function protect_review_integrity();

-- ---------------------------------------------------------
-- Public read-only summary view for the shareable project link.
-- Expose only what a client would want a spouse/insurer/family
-- member to see — no internal notes, no messages.
-- ---------------------------------------------------------
create view project_public_summary as
select
  p.id,
  p.title,
  p.project_type,
  p.status,
  p.budget,
  p.start_date,
  p.target_end_date,
  p.share_token,
  cp.full_name as client_name,
  ctr.full_name as contractor_name,
  ctr.company_name as contractor_company
from projects p
left join profiles cp on cp.id = p.client_id
left join profiles ctr on ctr.id = p.contractor_id;

grant select on project_public_summary to anon;
