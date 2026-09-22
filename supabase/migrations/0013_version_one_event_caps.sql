-- Memora version-one operating limits.
-- Keep the database ceiling aligned with the API and dashboard policy so a
-- future route or direct SQL client cannot create an event outside the tested
-- cost and abuse envelope.

create or replace function public.assert_event_limits_within_caps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.upload_limit is null or new.upload_limit < 1 or new.upload_limit > 500 then
    raise exception 'UPLOAD_LIMIT_OUT_OF_RANGE';
  end if;
  if new.max_file_size_bytes is null
     or new.max_file_size_bytes < 1048576
     or new.max_file_size_bytes > 15728640 then
    raise exception 'FILE_SIZE_OUT_OF_RANGE';
  end if;
  if new.guest_photo_limit is null
     or new.guest_photo_limit < 1
     or new.guest_photo_limit > 10 then
    raise exception 'GUEST_LIMIT_OUT_OF_RANGE';
  end if;
  return new;
end;
$$;
