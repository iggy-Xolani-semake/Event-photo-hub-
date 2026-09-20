create table if not exists public.rate_limit_buckets (
  key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null
);

alter table public.rate_limit_buckets enable row level security;

create or replace function public.consume_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_max_requests integer
)
returns table (allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_bucket public.rate_limit_buckets%rowtype;
begin
  if p_window_seconds < 1 or p_max_requests < 1 then
    raise exception 'INVALID_RATE_LIMIT';
  end if;

  insert into public.rate_limit_buckets (key, window_started_at, request_count)
  values (p_key, v_now, 1)
  on conflict (key) do update
  set window_started_at = case
        when public.rate_limit_buckets.window_started_at + make_interval(secs => p_window_seconds) <= v_now
          then v_now
        else public.rate_limit_buckets.window_started_at
      end,
      request_count = case
        when public.rate_limit_buckets.window_started_at + make_interval(secs => p_window_seconds) <= v_now
          then 1
        else public.rate_limit_buckets.request_count + 1
      end;

  select * into v_bucket from public.rate_limit_buckets where key = p_key;

  return query select
    v_bucket.request_count <= p_max_requests,
    greatest(p_max_requests - v_bucket.request_count, 0);
end;
$$;

revoke all on table public.rate_limit_buckets from public, anon, authenticated;
revoke execute on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

create index if not exists rate_limit_buckets_window_idx
  on public.rate_limit_buckets (window_started_at);