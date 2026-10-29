-- Run after the migration in a disposable local/test Supabase database, as postgres.
-- All fixtures are rolled back. Stop on the first SQL error.
begin;

do $$
begin
  if has_function_privilege('anon', 'public.submit_inquiry(text,text,text,text,text,text,text,text,text)', 'execute')
     or has_function_privilege('authenticated', 'public.submit_inquiry(text,text,text,text,text,text,text,text,text)', 'execute')
     or not has_function_privilege('service_role', 'public.submit_inquiry(text,text,text,text,text,text,text,text,text)', 'execute') then
    raise exception 'Intake must be service-only';
  end if;
  if has_table_privilege('anon', 'private.contacts', 'select')
     or has_table_privilege('authenticated', 'private.staff_roles', 'insert')
     or has_table_privilege('authenticated', 'private.staff_roles', 'update')
     or has_table_privilege('authenticated', 'private.product_details', 'select')
     or has_table_privilege('authenticated', 'private.inquiries', 'insert') then
    raise exception 'Private data or write grants are too broad';
  end if;
end;
$$;

insert into auth.users (id, email) values
  ('f0000000-0000-0000-0000-000000000001', 'owner-test@example.invalid'),
  ('f0000000-0000-0000-0000-000000000002', 'sales-a-test@example.invalid'),
  ('f0000000-0000-0000-0000-000000000003', 'sales-b-test@example.invalid'),
  ('f0000000-0000-0000-0000-000000000004', 'editor-test@example.invalid'),
  ('f0000000-0000-0000-0000-000000000005', 'customer-test@example.invalid');
insert into private.staff_roles (user_id, role) values
  ('f0000000-0000-0000-0000-000000000001', 'owner'),
  ('f0000000-0000-0000-0000-000000000002', 'sales'),
  ('f0000000-0000-0000-0000-000000000003', 'sales'),
  ('f0000000-0000-0000-0000-000000000004', 'editor');
insert into public.products (code, slug, category, publication_status, verification_status) values
  ('TT-999991', 'integration-published', 'objects', 'published', 'verified'),
  ('TT-999992', 'integration-sample', 'objects', 'sample', 'needs_review');
insert into public.product_translations (product_id, locale, name, description, publication_status)
select id, 'en', code, 'Integration-only record', 'published' from public.products where code = 'TT-999991';

-- Exercise the actual service permission and transaction, not a mock persistence implementation.
set local role service_role;
do $$
declare
  original jsonb;
  replay jsonb;
begin
  original := public.submit_inquiry('Test visitor', 'email', 'first-test@example.invalid',
    'Please tell me about this piece.', 'en', 'TT-999991', 'integration-first-0001', repeat('a',64), repeat('b',64));
  replay := public.submit_inquiry('Test visitor', 'email', 'first-test@example.invalid',
    'Please tell me about this piece.', 'en', 'TT-999991', 'integration-first-0001', repeat('a',64), repeat('b',64));
  if original->>'reference' is null or original->>'reference' <> replay->>'reference'
     or original->>'duplicate' <> 'false' or replay->>'duplicate' <> 'true' then
    raise exception 'Retry did not preserve the original reference';
  end if;
  if (select count(*) from private.inquiries where idempotency_key = 'integration-first-0001') <> 1
     or (select count(*) from private.contacts where contact_value = 'first-test@example.invalid') <> 1
     or (select count(*) from private.notification_jobs n join private.inquiries i on i.id=n.inquiry_id
       where i.idempotency_key='integration-first-0001') <> 1
     or (select count(*) from private.inquiry_items n join private.inquiries i on i.id=n.inquiry_id
       where i.idempotency_key='integration-first-0001') <> 1 then
    raise exception 'Retry created duplicate records or lost the outbox/item';
  end if;
  begin
    perform public.submit_inquiry('Test visitor', 'email', 'first-test@example.invalid',
      'A different message on the same retry key.', 'en', 'TT-999991', 'integration-first-0001', repeat('c',64), repeat('b',64));
    raise exception 'Expected idempotency conflict';
  exception when invalid_parameter_value then
    if sqlerrm <> 'idempotency_conflict' then raise; end if;
  end;
  begin
    perform public.submit_inquiry('Test visitor', 'email', 'draft-test@example.invalid',
      'Please tell me about this piece.', 'en', 'TT-999992', 'integration-draft-0001', repeat('d',64), repeat('e',64));
    raise exception 'A sample product was accepted';
  exception when invalid_parameter_value then
    if sqlerrm <> 'unknown_product' then raise; end if;
  end;
  if exists (select 1 from private.contacts where contact_value='draft-test@example.invalid') then
    raise exception 'A failed transaction left an orphan contact';
  end if;
  perform public.submit_inquiry('Other visitor', 'email', 'other-test@example.invalid',
    'I would like some advice please.', 'en', null, 'integration-other-0001', repeat('1',64), repeat('2',64));
  perform public.submit_inquiry('Waiting visitor', 'email', 'waiting-test@example.invalid',
    'I would like some advice please.', 'en', null, 'integration-waiting-0001', repeat('3',64), repeat('4',64));
end;
$$;
reset role;

update private.inquiries set assigned_to='f0000000-0000-0000-0000-000000000002' where idempotency_key='integration-first-0001';
update private.inquiries set assigned_to='f0000000-0000-0000-0000-000000000003' where idempotency_key='integration-other-0001';

set local role anon;
do $$
begin
  if (select count(*) from public.products where code in ('TT-999991','TT-999992')) <> 1 then
    raise exception 'Anonymous catalog access exposed sample products';
  end if;
  begin
    perform count(*) from private.contacts;
    raise exception 'Anonymous user could read contacts';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.submit_inquiry('Test visitor', 'email', 'anon-test@example.invalid',
      'This call must be denied.', 'en', null, 'integration-denied-0001', repeat('0',64), repeat('0',64));
    raise exception 'Anonymous user could execute intake';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000002', true);
set local role authenticated;
do $$
begin
  if (select count(*) from private.inquiries where idempotency_key like 'integration-%') <> 1
     or (select count(*) from private.contacts where contact_value like '%-test@example.invalid') <> 1
     or (select count(*) from private.inquiry_items n join private.inquiries i on i.id=n.inquiry_id where i.idempotency_key like 'integration-%') <> 1 then
    raise exception 'Sales user must see exactly the assigned inquiry and its contact/item';
  end if;
  begin
    insert into private.staff_roles (user_id,role) values ('f0000000-0000-0000-0000-000000000005','owner');
    raise exception 'Staff role escalation succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000001', true);
set local role authenticated;
do $$
begin
  if (select count(*) from private.inquiries where idempotency_key like 'integration-%') <> 3
     or (select count(*) from private.contacts where contact_value like '%-test@example.invalid') <> 3 then
    raise exception 'Owner cannot review the inquiry queue';
  end if;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000004', true);
set local role authenticated;
do $$ begin
  if exists (select 1 from private.inquiries) or exists (select 1 from private.contacts) then
    raise exception 'Catalog editor can read CRM data';
  end if;
end; $$;
reset role;

select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000005', true);
set local role authenticated;
do $$ begin
  if exists (select 1 from private.inquiries) or exists (select 1 from private.contacts)
     or exists (select 1 from public.products where code='TT-999992') then
    raise exception 'Unprivileged account can read CRM or sample catalog data';
  end if;
end; $$;
reset role;

set local role service_role;
do $$
declare before_count integer;
begin
  for i in 1..5 loop
    perform public.submit_inquiry('Rate test', 'email', 'rate-test@example.invalid',
      'Please provide more information.', 'en', null, 'integration-rate-000' || i, repeat('5',64), repeat('6',64));
  end loop;
  select count(*) into before_count from private.contacts where contact_value='rate-test@example.invalid';
  begin
    perform public.submit_inquiry('Rate test', 'email', 'rate-test@example.invalid',
      'Please provide more information.', 'en', null, 'integration-rate-0006', repeat('5',64), repeat('6',64));
    raise exception 'Expected the sixth inquiry to be rate limited';
  exception when raise_exception then
    if sqlerrm <> 'rate_limited' then raise; end if;
  end;
  if (select count(*) from private.contacts where contact_value='rate-test@example.invalid') <> before_count
     or (select submission_count from private.intake_rate_limits where bucket_key=repeat('6',64)) <> 5 then
    raise exception 'Rate-limited request did not roll back';
  end if;
end;
$$;
reset role;
rollback;
