create or replace function public.release_failed_invoice(p_invoice_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_invoice public.invoices%rowtype;
  v_year integer;
  v_seq integer;
  v_last integer;
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

  v_year := substring(v_invoice.invoice_number from '^INV-([0-9]{4})-[0-9]+$')::integer;
  v_seq := substring(v_invoice.invoice_number from '^INV-[0-9]{4}-([0-9]+)$')::integer;

  if v_year is null or v_seq is null or v_seq <= 0 then
    raise exception 'invoice number cannot be released';
  end if;

  select last_number
  into v_last
  from public.invoice_counters
  where user_id = v_user_id
    and year = v_year
  for update;

  delete from public.invoices
  where id = v_invoice.id
    and user_id = v_user_id;

  if v_last is not null and v_last = v_seq then
    if v_seq = 1 then
      delete from public.invoice_counters
      where user_id = v_user_id
        and year = v_year;
    else
      update public.invoice_counters
      set last_number = v_seq - 1
      where user_id = v_user_id
        and year = v_year;
    end if;
  end if;
end;
$$;

revoke all on function public.release_failed_invoice(bigint) from public;
revoke all on function public.release_failed_invoice(bigint) from anon;
revoke all on function public.release_failed_invoice(bigint) from authenticated;
grant execute on function public.release_failed_invoice(bigint) to authenticated;
