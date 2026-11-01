create or replace function public.create_invoice(
  p_client_id bigint,
  p_invoice_date date,
  p_due_date date,
  p_currency text,
  p_comments text,
  p_lines jsonb
)
returns public.invoices
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_profile public.profiles;
  v_client public.clients;
  v_invoice public.invoices;
  v_line jsonb;
  v_quantity numeric(10,2);
  v_unit_price numeric(12,2);
  v_vat_rate numeric(5,2);
  v_line_subtotal numeric(12,2);
  v_line_tax numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_tax numeric(12,2) := 0;
  v_total numeric(12,2);
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_invoice_date is null or p_due_date is null then
    raise exception 'invoice date and due date are required';
  end if;

  if p_due_date < p_invoice_date then
    raise exception 'due date must be on or after the invoice date';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) < 1 then
    raise exception 'at least one line is required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id;

  if not found then
    raise exception 'profile not found';
  end if;

  if char_length(btrim(coalesce(v_profile.full_name, ''))) = 0
    and char_length(btrim(coalesce(v_profile.company_name, ''))) = 0
  then
    raise exception 'profile needs a full name or a company name';
  end if;

  select *
  into v_client
  from public.clients
  where id = p_client_id
    and user_id = v_user_id;

  if not found then
    raise exception 'client not found';
  end if;

  if v_client.email is null or char_length(btrim(v_client.email)) = 0 then
    raise exception 'client needs an email';
  end if;

  for v_line in
    select value
    from jsonb_array_elements(p_lines)
  loop
    v_quantity := (v_line ->> 'quantity')::numeric(10,2);
    v_unit_price := (v_line ->> 'unit_price')::numeric(12,2);
    v_vat_rate := (v_line ->> 'vat_rate')::numeric(5,2);
    v_line_subtotal := round(v_quantity * v_unit_price, 2);
    v_line_tax := round(v_line_subtotal * v_vat_rate / 100, 2);
    v_subtotal := v_subtotal + v_line_subtotal;
    v_tax := v_tax + v_line_tax;
  end loop;

  v_total := v_subtotal + v_tax;

  if v_total <= 0 then
    raise exception 'invoice total must be greater than zero';
  end if;

  insert into public.invoices (
    user_id,
    client_id,
    invoice_number,
    invoice_date,
    due_date,
    currency,
    comments,
    from_full_name,
    from_company_name,
    from_email,
    from_address,
    from_vat_id,
    from_website,
    to_full_name,
    to_company_name,
    to_email,
    to_address,
    to_vat_id,
    subtotal,
    tax,
    total
  )
  values (
    v_user_id,
    p_client_id,
    gen_random_uuid()::text,
    p_invoice_date,
    p_due_date,
    p_currency,
    p_comments,
    v_profile.full_name,
    v_profile.company_name,
    v_profile.email,
    v_profile.address,
    v_profile.vat_id,
    v_profile.website,
    v_client.full_name,
    v_client.company_name,
    btrim(v_client.email),
    v_client.address,
    v_client.vat_id,
    v_subtotal,
    v_tax,
    v_total
  )
  returning * into v_invoice;

  update public.invoices
  set invoice_number = format(
    'INV-%s-%s-%s-%s',
    to_char(p_invoice_date, 'YYYY'),
    to_char(p_invoice_date, 'MM'),
    to_char(p_invoice_date, 'DD'),
    lpad(v_invoice.id::text, 8, '0')
  )
  where id = v_invoice.id
  returning * into v_invoice;

  insert into public.invoice_line_items (
    invoice_id,
    user_id,
    position,
    description,
    quantity,
    unit,
    unit_price,
    vat_rate,
    line_subtotal,
    line_tax,
    line_total
  )
  select
    v_invoice.id,
    v_user_id,
    lines.ordinality::integer,
    lines.item ->> 'description',
    (lines.item ->> 'quantity')::numeric(10,2),
    lines.item ->> 'unit',
    (lines.item ->> 'unit_price')::numeric(12,2),
    (lines.item ->> 'vat_rate')::numeric(5,2),
    0,
    0,
    0
  from jsonb_array_elements(p_lines) with ordinality as lines(item, ordinality);

  select *
  into v_invoice
  from public.invoices
  where id = v_invoice.id;

  if v_invoice.total <= 0 then
    raise exception 'invoice total must be greater than zero';
  end if;

  return v_invoice;
end;
$$;

create or replace function public.release_failed_invoice(p_invoice_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_invoice public.invoices%rowtype;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_invoice_id is null or p_invoice_id <= 0 then
    raise exception 'invoice not found';
  end if;

  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'invoice not found';
  end if;

  if v_invoice.status is distinct from 'not_paid'
    or v_invoice.paid_via is not null
  then
    raise exception 'only an unpaid invoice can be released';
  end if;

  delete from public.invoices
  where id = v_invoice.id
    and user_id = v_user_id;
end;
$$;

revoke all on function public.release_failed_invoice(bigint) from public;
revoke all on function public.release_failed_invoice(bigint) from anon;
revoke all on function public.release_failed_invoice(bigint) from authenticated;
grant execute on function public.release_failed_invoice(bigint) to authenticated;
