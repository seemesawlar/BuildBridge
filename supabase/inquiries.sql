-- =========================================================
-- Inquiries (marketplace quote requests)
-- Run LAST — after schema.sql, policies.sql, storage.sql, and
-- notifications.sql — since its triggers call create_notification(),
-- which is defined in notifications.sql.
--
-- Why a separate table instead of just creating a project up front:
-- discovery happens *before* a working relationship exists. A client
-- browsing the marketplace hasn't agreed to anything yet, and a
-- contractor shouldn't be attached to a project just because someone
-- clicked their profile. An inquiry is a lightweight, non-binding
-- request; a project is only created once the client actually decides
-- to proceed with that contractor.
-- =========================================================

create type inquiry_status as enum ('pending', 'responded', 'declined', 'accepted', 'withdrawn');

create table inquiries (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references profiles(id) on delete cascade,
  contractor_id uuid not null references profiles(id) on delete cascade,
  project_type text not null,
  message text,
  budget numeric(12,2),
  status inquiry_status not null default 'pending',
  contractor_response text,
  project_id uuid references projects(id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index on inquiries (client_id);
create index on inquiries (contractor_id);
create index on inquiries (contractor_id, status);

alter table inquiries enable row level security;

create policy "members can view their inquiries"
  on inquiries for select
  using (client_id = auth.uid() or contractor_id = auth.uid());

create policy "clients can send an inquiry"
  on inquiries for insert
  with check (
    client_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and role = 'client')
    and exists (select 1 from profiles where id = contractor_id and role = 'contractor')
  );

create policy "contractors can respond to inquiries"
  on inquiries for update
  using (contractor_id = auth.uid());

create policy "clients can update their own inquiries"
  on inquiries for update
  using (client_id = auth.uid());

create policy "admins can view all inquiries"
  on inquiries for select
  using (is_admin());

-- ---------------------------------------------------------
-- Integrity: same problem as reviews — RLS can gate *who* updates a
-- row but not *which columns*. A contractor responding to an inquiry
-- shouldn't be able to rewrite the client's original message or
-- budget; a client accepting/withdrawing shouldn't be able to rewrite
-- the contractor's response.
-- ---------------------------------------------------------
create or replace function protect_inquiry_integrity()
returns trigger as $$
begin
  if is_admin() then
    return new;
  end if;

  if auth.uid() = new.contractor_id then
    if new.client_id is distinct from old.client_id
      or new.contractor_id is distinct from old.contractor_id
      or new.project_type is distinct from old.project_type
      or new.message is distinct from old.message
      or new.budget is distinct from old.budget
      or new.project_id is distinct from old.project_id then
      raise exception 'Contractors may only update their response and status';
    end if;
  elsif auth.uid() = new.client_id then
    if new.contractor_response is distinct from old.contractor_response
      or new.message is distinct from old.message
      or new.project_type is distinct from old.project_type
      or new.budget is distinct from old.budget
      or new.contractor_id is distinct from old.contractor_id
      or new.client_id is distinct from old.client_id then
      raise exception 'Clients may only update status and link a resulting project';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger inquiries_protect_integrity
before update on inquiries
for each row execute function protect_inquiry_integrity();

-- ---------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------
create or replace function notify_new_inquiry()
returns trigger as $$
begin
  perform create_notification(
    new.contractor_id,
    'inquiry',
    'New quote request',
    left(coalesce(new.message, new.project_type), 140),
    null
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger inquiries_notify_new
after insert on inquiries
for each row execute function notify_new_inquiry();

create or replace function notify_inquiry_response()
returns trigger as $$
begin
  if new.status in ('responded', 'declined') and old.status is distinct from new.status then
    perform create_notification(
      new.client_id,
      'inquiry',
      case when new.status = 'responded' then 'Contractor responded to your request' else 'Contractor declined your request' end,
      left(coalesce(new.contractor_response, ''), 140),
      null
    );
  end if;

  if new.status = 'accepted' and old.status is distinct from new.status then
    perform create_notification(
      new.contractor_id,
      'inquiry',
      'Quote request accepted',
      'The client started a project with you.',
      new.project_id
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger inquiries_notify_response
after update on inquiries
for each row execute function notify_inquiry_response();
