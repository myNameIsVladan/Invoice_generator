create or replace function public.issue_email_confirmation(p_token text, p_expires_at timestamptz)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_token is null or char_length(p_token) = 0 then
    raise exception 'token is required';
  end if;

  if p_expires_at is null or p_expires_at <= now() then
    raise exception 'confirmation expiry must be in the future';
  end if;

  if exists (
    select 1
    from public.email_confirmations
    where user_id = v_user_id
      and created_at > now() - interval '60 seconds'
  ) then
    raise exception 'confirmation email was sent recently';
  end if;

  insert into public.email_confirmations (user_id, token_hash, expires_at)
  values (
    v_user_id,
    encode(extensions.digest(p_token, 'sha256'), 'hex'),
    p_expires_at
  );
end;
$$;
