-- =========================================================
-- Notifications
-- Run after schema.sql and policies.sql (needs `profiles`, `projects`,
-- and the other feature tables to already exist).
--
-- Design choice: notifications are created by database triggers, not by
-- the frontend inserting a row after every mutation. A trigger can't be
-- forgotten by a future feature branch the way a client-side insert can,
-- and it guarantees a notification fires even if two different UI flows
-- lead to the same underlying change.
-- =========================================================

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  project_id uuid references projects(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index on notifications (user_id, created_at desc);
create index on notifications (user_id, read);

alter table notifications enable row level security;

create policy "users can view their own notifications"
  on notifications for select
  using (user_id = auth.uid());

create policy "users can mark their own notifications read"
  on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No insert/delete policy for regular users — rows are only ever created
-- by the security-definer function below.

create or replace function create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_project_id uuid default null
) returns void as $$
begin
  if p_user_id is null then
    return;
  end if;
  insert into notifications (user_id, type, title, body, project_id)
  values (p_user_id, p_type, p_title, p_body, p_project_id);
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------
-- Estimates: notify the client when one is sent, notify the contractor
-- who wrote it when the client accepts or rejects.
-- ---------------------------------------------------------
create or replace function notify_new_estimate()
returns trigger as $$
declare
  v_client_id uuid;
begin
  if new.status = 'sent' then
    select client_id into v_client_id from projects where id = new.project_id;
    perform create_notification(
      v_client_id,
      'estimate',
      'New estimate received',
      format('Version %s — $%s total. Review it and accept or reject.',
        new.version, to_char(new.total, 'FM999,999,990.00')),
      new.project_id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger estimates_notify_new
after insert on estimates
for each row execute function notify_new_estimate();

create or replace function notify_estimate_response()
returns trigger as $$
declare
  v_title text;
begin
  if new.status in ('accepted', 'rejected') and old.status is distinct from new.status then
    v_title := case when new.status = 'accepted' then 'Estimate accepted' else 'Estimate rejected' end;
    perform create_notification(
      new.created_by,
      'estimate',
      v_title,
      format('Version %s was %s by the client.', new.version, new.status),
      new.project_id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger estimates_notify_response
after update on estimates
for each row execute function notify_estimate_response();

-- ---------------------------------------------------------
-- Change orders: notify whichever project member didn't request it;
-- notify the requester once it's approved or rejected.
-- ---------------------------------------------------------
create or replace function notify_new_change_order()
returns trigger as $$
declare
  v_client_id uuid;
  v_contractor_id uuid;
  v_recipient uuid;
begin
  select client_id, contractor_id into v_client_id, v_contractor_id
  from projects where id = new.project_id;

  v_recipient := case
    when new.requested_by = v_client_id then v_contractor_id
    else v_client_id
  end;

  perform create_notification(
    v_recipient,
    'change_order',
    'New change order proposed',
    format('%s (%s%s)', new.title, case when new.cost_delta >= 0 then '+' else '' end,
      to_char(new.cost_delta, 'FM999,999,990.00')),
    new.project_id
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger change_orders_notify_new
after insert on change_orders
for each row execute function notify_new_change_order();

create or replace function notify_change_order_resolved()
returns trigger as $$
begin
  if new.status in ('approved', 'rejected') and old.status is distinct from new.status then
    perform create_notification(
      new.requested_by,
      'change_order',
      format('Change order %s', new.status),
      new.title,
      new.project_id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger change_orders_notify_resolved
after update on change_orders
for each row execute function notify_change_order_resolved();

-- ---------------------------------------------------------
-- Progress updates: notify whichever member didn't post it.
-- ---------------------------------------------------------
create or replace function notify_new_progress_update()
returns trigger as $$
declare
  v_client_id uuid;
  v_contractor_id uuid;
  v_recipient uuid;
begin
  select client_id, contractor_id into v_client_id, v_contractor_id
  from projects where id = new.project_id;

  v_recipient := case
    when new.author_id = v_client_id then v_contractor_id
    else v_client_id
  end;

  perform create_notification(
    v_recipient,
    'progress_update',
    'New progress update posted',
    left(coalesce(new.note, ''), 140),
    new.project_id
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger progress_updates_notify_new
after insert on progress_updates
for each row execute function notify_new_progress_update();

-- ---------------------------------------------------------
-- Payments: notify whichever member didn't record it.
-- ---------------------------------------------------------
create or replace function notify_new_payment()
returns trigger as $$
declare
  v_client_id uuid;
  v_contractor_id uuid;
  v_recipient uuid;
begin
  select client_id, contractor_id into v_client_id, v_contractor_id
  from projects where id = new.project_id;

  v_recipient := case
    when new.recorded_by = v_client_id then v_contractor_id
    else v_client_id
  end;

  perform create_notification(
    v_recipient,
    'payment',
    'Payment recorded',
    format('%s payment of $%s logged.', new.type, to_char(new.amount, 'FM999,999,990.00')),
    new.project_id
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger payments_notify_new
after insert on payments
for each row execute function notify_new_payment();

-- ---------------------------------------------------------
-- Messages: notify whichever member didn't send it.
-- ---------------------------------------------------------
create or replace function notify_new_message()
returns trigger as $$
declare
  v_client_id uuid;
  v_contractor_id uuid;
  v_recipient uuid;
begin
  select client_id, contractor_id into v_client_id, v_contractor_id
  from projects where id = new.project_id;

  v_recipient := case
    when new.sender_id = v_client_id then v_contractor_id
    else v_client_id
  end;

  perform create_notification(
    v_recipient,
    'message',
    'New message',
    left(new.body, 140),
    new.project_id
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger messages_notify_new
after insert on messages
for each row execute function notify_new_message();

-- ---------------------------------------------------------
-- Milestones: notify the client when a milestone is completed.
-- (Simplification: the client is the one most likely to want to know
-- work finished a stage; there's no "who changed this" column on
-- milestones to notify the other party generically.)
-- ---------------------------------------------------------
create or replace function notify_milestone_complete()
returns trigger as $$
declare
  v_client_id uuid;
begin
  if new.status = 'complete' and old.status is distinct from new.status then
    select client_id into v_client_id from projects where id = new.project_id;
    perform create_notification(
      v_client_id,
      'milestone',
      'Milestone completed',
      new.name,
      new.project_id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger milestones_notify_complete
after update on milestones
for each row execute function notify_milestone_complete();

-- ---------------------------------------------------------
-- Projects: notify a contractor when they're invited onto a project.
-- ---------------------------------------------------------
create or replace function notify_contractor_invited()
returns trigger as $$
begin
  if new.contractor_id is not null and old.contractor_id is null then
    perform create_notification(
      new.contractor_id,
      'invite',
      'Added to a project',
      format('You''ve been added to "%s".', new.title),
      new.id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger projects_notify_invited
after update on projects
for each row execute function notify_contractor_invited();

-- ---------------------------------------------------------
-- Reviews: notify the contractor when reviewed, notify the client when
-- the contractor responds.
-- ---------------------------------------------------------
create or replace function notify_new_review()
returns trigger as $$
begin
  perform create_notification(
    new.contractor_id,
    'review',
    'New review received',
    format('%s stars.%s', new.rating, case when new.body is not null then ' "' || left(new.body, 100) || '"' else '' end),
    new.project_id
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger reviews_notify_new
after insert on reviews
for each row execute function notify_new_review();

create or replace function notify_review_response()
returns trigger as $$
begin
  if new.contractor_response is not null
     and (old.contractor_response is null or old.contractor_response is distinct from new.contractor_response) then
    perform create_notification(
      new.client_id,
      'review',
      'Contractor responded to your review',
      left(new.contractor_response, 140),
      new.project_id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger reviews_notify_response
after update on reviews
for each row execute function notify_review_response();

-- ---------------------------------------------------------
-- Profile verification: notify the contractor when their status changes.
-- ---------------------------------------------------------
create or replace function notify_verification_change()
returns trigger as $$
begin
  if new.role = 'contractor' and new.is_verified is distinct from old.is_verified then
    perform create_notification(
      new.id,
      'verification',
      case when new.is_verified then 'You''re verified!' else 'Verification revoked' end,
      case
        when new.is_verified then 'Your license was reviewed and your profile now shows a verified badge.'
        else 'Your verified badge has been removed. Contact support if this seems wrong.'
      end,
      null
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger profiles_notify_verification
after update on profiles
for each row execute function notify_verification_change();

-- ---------------------------------------------------------
-- Realtime: let the frontend subscribe to new notifications without
-- polling. Wrapped defensively — on some projects `supabase_realtime`
-- is already a FOR ALL TABLES publication, where explicitly adding a
-- table isn't allowed (and isn't needed).
-- ---------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    begin
      execute 'alter publication supabase_realtime add table notifications';
    exception when others then
      raise notice 'Could not add notifications to supabase_realtime automatically — enable Realtime for this table manually via Database > Replication in the Supabase dashboard.';
    end;
  end if;
end $$;
