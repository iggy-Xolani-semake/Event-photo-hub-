-- Allow guests to select and upload up to 30 photos in one batch.
-- This is separate from guest_photo_limit, which remains the per-guest lifetime
-- entitlement defined by each package.

update public.packages
set max_files_per_upload = 30
where is_active;

update public.events e
set max_files_per_upload = 30
from public.packages p
where e.package_id = p.id
  and p.is_active;

update public.events
set max_files_per_upload = 30
where package_id is null;

create or replace function public.assert_event_limits_within_caps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.upload_limit is null or new.upload_limit < 1 or new.upload_limit > 1000 then
    raise exception 'UPLOAD_LIMIT_OUT_OF_RANGE';
  end if;

  if new.max_file_size_bytes is null
     or new.max_file_size_bytes < 1048576
     or new.max_file_size_bytes > 15728640 then
    raise exception 'FILE_SIZE_OUT_OF_RANGE';
  end if;

  if new.max_files_per_upload is null
     or new.max_files_per_upload < 1
     or new.max_files_per_upload > 30 then
    raise exception 'FILES_PER_UPLOAD_OUT_OF_RANGE';
  end if;

  if new.guest_photo_limit is null
     or new.guest_photo_limit < 1
     or new.guest_photo_limit > 50 then
    raise exception 'GUEST_LIMIT_OUT_OF_RANGE';
  end if;

  return new;
end;
$$;

create or replace function public.apply_package_entitlements()
returns trigger language plpgsql set search_path=public as $$
declare p public.packages%rowtype;
begin
  if new.package_id is null then
    new.upload_limit := least(coalesce(new.upload_limit,100),100);
    new.max_file_size_bytes := least(coalesce(new.max_file_size_bytes,15728640),15728640);
    new.guest_photo_limit := least(coalesce(new.guest_photo_limit,30),30);
    new.max_files_per_upload := least(coalesce(new.max_files_per_upload,30),30);
    if tg_op = 'INSERT' then
      new.gallery_expires_at := new.created_at + interval '7 days';
    else
      new.gallery_expires_at := coalesce(new.gallery_expires_at,new.created_at + interval '7 days');
    end if;
    return new;
  end if;

  select * into p from public.packages where id=new.package_id;
  if not found then raise exception 'PACKAGE_NOT_FOUND'; end if;

  if tg_op='UPDATE' and new.package_id is distinct from old.package_id then
    new.gallery_expires_at := new.created_at + make_interval(days=>p.retention_days);
    new.upload_limit := least(new.upload_limit,p.photo_limit);
    new.guest_photo_limit := least(new.guest_photo_limit,p.guest_photo_limit);
    new.max_file_size_bytes := least(new.max_file_size_bytes,p.max_file_size_bytes,15728640);
    new.max_files_per_upload := least(new.max_files_per_upload,p.max_files_per_upload);
  else
    if new.upload_limit > p.photo_limit then raise exception 'PACKAGE_PHOTO_LIMIT_EXCEEDED'; end if;
    if new.max_file_size_bytes > least(p.max_file_size_bytes,15728640) then raise exception 'PACKAGE_FILE_SIZE_EXCEEDED'; end if;
    if new.guest_photo_limit > p.guest_photo_limit then raise exception 'PACKAGE_GUEST_LIMIT_EXCEEDED'; end if;
    if new.max_files_per_upload > p.max_files_per_upload then raise exception 'PACKAGE_BATCH_LIMIT_EXCEEDED'; end if;
  end if;

  if tg_op = 'INSERT' or new.package_id is distinct from old.package_id then
    new.gallery_expires_at := new.created_at + make_interval(days=>p.retention_days);
  else
    new.gallery_expires_at := coalesce(new.gallery_expires_at,new.created_at + make_interval(days=>p.retention_days));
  end if;

  return new;
end $$;
