begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- The public catalog deliberately contains no cost, supplier, customer, or internal-note columns.
create table public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^TT-[0-9]{3,6}$'),
  slug text not null unique,
  category text not null check (category in ('saddles','vessels','accessories','jewelry','objects')),
  publication_status text not null default 'sample' check (publication_status in ('sample','draft','published','archived')),
  verification_status text not null default 'needs_review' check (verification_status in ('needs_review','verified')),
  availability text not null default 'unverified' check (availability in ('unverified','available','sold')),
  price numeric(16,2) check (price >= 0),
  currency text not null default 'MNT' check (currency ~ '^[A-Z]{3}$'),
  material text,
  dimensions text,
  weight text,
  maker text,
  period text,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_product_is_verified check (publication_status <> 'published' or verification_status = 'verified')
);

create table public.product_translations (
  product_id uuid not null references public.products(id) on delete cascade,
  locale text not null check (locale in ('mn','en')),
  name text not null,
  description text not null,
  observations text,
  publication_status text not null default 'draft' check (publication_status in ('draft','published')),
  primary key (product_id, locale)
);

create table private.product_details (
  product_id uuid primary key references public.products(id) on delete cascade,
  source_file_name text,
  source_url text,
  source_folder_url text,
  needs_confirmation jsonb not null default '[]'::jsonb,
  internal_notes text,
  cost numeric(16,2) check (cost >= 0)
);

create table private.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','sales','editor')),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function private.has_staff_role(allowed_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.staff_roles s
    where s.user_id = (select auth.uid()) and s.enabled and s.role = any(allowed_roles)
  );
$$;
revoke all on function private.has_staff_role(text[]) from public, anon;
grant execute on function private.has_staff_role(text[]) to authenticated, service_role;

-- Guest contacts do not have an auth user ID and cannot claim another contact's history.
create table private.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  contact_method text not null check (contact_method in ('email','phone')),
  contact_value text not null check (char_length(contact_value) between 5 and 160),
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now()
);

create table private.inquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('TT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))),
  contact_id uuid not null references private.contacts(id),
  locale text not null check (locale in ('mn','en')),
  message text not null check (char_length(message) between 10 and 2000),
  stage text not null default 'new' check (stage in ('new','contacted','qualified','quoted','waiting','won','closed','spam')),
  assigned_to uuid references auth.users(id),
  source text not null default 'website',
  idempotency_key text not null unique check (idempotency_key ~ '^[a-zA-Z0-9_-]{16,128}$'),
  request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inquiries_assignee_stage_idx on private.inquiries (assigned_to, stage, created_at desc);
create index inquiries_contact_idx on private.inquiries (contact_id);

create table private.inquiry_items (
  inquiry_id uuid not null references private.inquiries(id),
  product_id uuid not null references public.products(id),
  product_code_snapshot text not null,
  primary key (inquiry_id, product_id)
);

create table private.activities (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references private.inquiries(id),
  actor_id uuid references auth.users(id),
  kind text not null check (kind in ('created','contacted','note','stage_changed','assigned')),
  note text,
  created_at timestamptz not null default now()
);

create table private.tasks (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references private.inquiries(id),
  assigned_to uuid references auth.users(id),
  title text not null,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index tasks_due_idx on private.tasks (assigned_to, due_at) where completed_at is null;
create index activities_inquiry_idx on private.activities (inquiry_id, created_at);
create index tasks_inquiry_idx on private.tasks (inquiry_id);

create table private.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null unique references private.inquiries(id),
  kind text not null default 'new_inquiry' check (kind = 'new_inquiry'),
  status text not null default 'pending' check (status in ('pending','processing','sent','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now()
);

create table private.intake_rate_limits (
  bucket_key text primary key check (bucket_key ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  submission_count integer not null check (submission_count > 0)
);
create index notification_jobs_pending_idx on private.notification_jobs (available_at) where status in ('pending','failed');

-- Explicit grants: RLS alone is not a column-level secrecy boundary.
revoke all on public.products, public.product_translations from public, anon, authenticated;
grant select on public.products, public.product_translations to anon, authenticated;
grant all on public.products, public.product_translations to service_role;

revoke all on all tables in schema private from public, anon, authenticated;
grant all on all tables in schema private to service_role;
grant select on private.contacts, private.inquiries, private.inquiry_items, private.activities, private.tasks to authenticated;

alter table public.products enable row level security;
alter table public.product_translations enable row level security;
create policy published_products on public.products for select to anon, authenticated
  using (publication_status = 'published');
create policy published_product_translations on public.product_translations for select to anon, authenticated
  using (publication_status = 'published' and exists (
    select 1 from public.products p where p.id = product_id and p.publication_status = 'published'
  ));
create policy staff_catalog on public.products for select to authenticated
  using (private.has_staff_role(array['owner','sales','editor']));
create policy staff_translations on public.product_translations for select to authenticated
  using (private.has_staff_role(array['owner','sales','editor']));

alter table private.product_details enable row level security;
alter table private.staff_roles enable row level security;
alter table private.contacts enable row level security;
alter table private.inquiries enable row level security;
alter table private.inquiry_items enable row level security;
alter table private.activities enable row level security;
alter table private.tasks enable row level security;
alter table private.notification_jobs enable row level security;
alter table private.intake_rate_limits enable row level security;

create policy staff_inquiries_read on private.inquiries for select to authenticated
  using (private.has_staff_role(array['owner']) or
    (private.has_staff_role(array['sales']) and assigned_to = (select auth.uid())));
create policy staff_contacts_read on private.contacts for select to authenticated
  using (private.has_staff_role(array['owner']) or exists (
    select 1 from private.inquiries i where i.contact_id = contacts.id and i.assigned_to = (select auth.uid())
      and private.has_staff_role(array['sales'])
  ));
create policy staff_inquiry_items_read on private.inquiry_items for select to authenticated
  using (exists (select 1 from private.inquiries i where i.id = inquiry_items.inquiry_id));
create policy staff_activities_read on private.activities for select to authenticated
  using (exists (select 1 from private.inquiries i where i.id = activities.inquiry_id));
create policy staff_tasks_read on private.tasks for select to authenticated
  using (exists (select 1 from private.inquiries i where i.id = tasks.inquiry_id));

-- Only the trusted API can execute this function. Each call is one transaction.
-- An advisory lock makes same-key retries safe even while the first request is still in flight.
create or replace function public.submit_inquiry(
  p_name text,
  p_contact_method text,
  p_contact_value text,
  p_message text,
  p_locale text,
  p_product_code text,
  p_idempotency_key text,
  p_fingerprint text,
  p_rate_key text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  existing private.inquiries%rowtype;
  product_uuid uuid;
  contact_uuid uuid;
  inquiry_uuid uuid;
  inquiry_reference text;
  current_count integer;
begin
  if p_name is null or char_length(p_name) not between 2 and 100
     or p_contact_method not in ('email','phone') or p_contact_method is null
     or p_contact_value is null or char_length(p_contact_value) not between 5 and 160
     or p_message is null or char_length(p_message) not between 10 and 2000
     or p_locale not in ('mn','en') or p_locale is null
     or p_idempotency_key is null or p_idempotency_key !~ '^[a-zA-Z0-9_-]{16,128}$'
     or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$'
     or p_rate_key is null or p_rate_key !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_inquiry' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_idempotency_key, 0));
  select * into existing from private.inquiries where idempotency_key = p_idempotency_key;
  if found then
    if existing.request_fingerprint <> p_fingerprint then
      raise exception 'idempotency_conflict' using errcode = '22023';
    end if;
    return jsonb_build_object('reference', existing.reference, 'duplicate', true);
  end if;

  if p_product_code is not null then
    select id into product_uuid from public.products
      where code = p_product_code and publication_status = 'published';
    if not found then raise exception 'unknown_product' using errcode = '22023'; end if;
  end if;

  insert into private.intake_rate_limits (bucket_key, window_started_at, submission_count)
    values (p_rate_key, now(), 1)
  on conflict (bucket_key) do update set
    submission_count = case when private.intake_rate_limits.window_started_at <= now() - interval '15 minutes'
      then 1 else private.intake_rate_limits.submission_count + 1 end,
    window_started_at = case when private.intake_rate_limits.window_started_at <= now() - interval '15 minutes'
      then now() else private.intake_rate_limits.window_started_at end
  returning submission_count into current_count;
  if current_count > 5 then raise exception 'rate_limited' using errcode = 'P0001'; end if;

  -- New unverified contact each time; duplicate identity merging is a staff-reviewed operation.
  insert into private.contacts (name, contact_method, contact_value)
    values (p_name, p_contact_method, p_contact_value) returning id into contact_uuid;
  insert into private.inquiries (contact_id, locale, message, idempotency_key, request_fingerprint)
    values (contact_uuid, p_locale, p_message, p_idempotency_key, p_fingerprint)
    returning id, reference into inquiry_uuid, inquiry_reference;
  if product_uuid is not null then
    insert into private.inquiry_items (inquiry_id, product_id, product_code_snapshot)
      values (inquiry_uuid, product_uuid, p_product_code);
  end if;
  insert into private.activities (inquiry_id, kind) values (inquiry_uuid, 'created');
  insert into private.notification_jobs (inquiry_id) values (inquiry_uuid);
  return jsonb_build_object('reference', inquiry_reference, 'duplicate', false);
end;
$$;
revoke all on function public.submit_inquiry(text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_inquiry(text,text,text,text,text,text,text,text,text) to service_role;

comment on function public.submit_inquiry(text,text,text,text,text,text,text,text,text)
  is 'Service-only inquiry intake. Does not reserve stock, create orders, record payments, or send mail.';

commit;
