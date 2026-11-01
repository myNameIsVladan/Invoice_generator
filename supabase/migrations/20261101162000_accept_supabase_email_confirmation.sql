create or replace function public.accept_auth_email_confirmation()
returns timestamptz
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_auth_confirmed timestamptz;
  v_created timestamptz;
  v_profile timestamptz;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  select email_confirmed_at, created_at
  into v_auth_confirmed, v_created
  from auth.users
  where id = v_user_id;

  if v_auth_confirmed is not null
     and v_created is not null
     and v_auth_confirmed > v_created + interval '2 seconds' then
    update public.profiles
    set email_confirmed_at = coalesce(email_confirmed_at, v_auth_confirmed)
    where id = v_user_id;
  end if;

  select email_confirmed_at
  into v_profile
  from public.profiles
  where id = v_user_id;

  return v_profile;
end;
$$;

revoke all on function public.accept_auth_email_confirmation() from public;
grant execute on function public.accept_auth_email_confirmation() to authenticated;

insert into public.profiles (id, email_confirmed_at)
select u.id, u.email_confirmed_at
from auth.users u
where u.email_confirmed_at is not null
  and u.email_confirmed_at > u.created_at + interval '2 seconds'
on conflict (id) do update
set email_confirmed_at = coalesce(public.profiles.email_confirmed_at, excluded.email_confirmed_at);
