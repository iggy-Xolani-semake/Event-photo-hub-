-- shutaMzala tier catalogue and retention/download entitlements.
alter table public.packages add column if not exists download_limit integer not null default 10;
alter table public.packages add column if not exists guest_photo_limit integer not null default 10;
alter table public.packages add column if not exists retention_days integer not null default 7;
alter table public.events add column if not exists download_count integer not null default 0;

update public.packages set is_active=false where code not in ('free','party_pack','event_pack');

insert into public.packages (code,name,photo_limit,max_file_size_bytes,max_files_per_upload,price_cents,currency,download_limit,guest_photo_limit,retention_days,sort_order,is_active)
values
 ('free','Free',100,15728640,10,0,'ZAR',10,10,7,1,true),
 ('party_pack','Party Pack',240,15728640,10,5999,'ZAR',100,20,60,2,true),
 ('event_pack','Event Pack',1000,15728640,10,14999,'ZAR',500,30,120,3,true)
on conflict (code) do update set name=excluded.name,photo_limit=excluded.photo_limit,max_file_size_bytes=excluded.max_file_size_bytes,max_files_per_upload=excluded.max_files_per_upload,price_cents=excluded.price_cents,currency=excluded.currency,download_limit=excluded.download_limit,guest_photo_limit=excluded.guest_photo_limit,retention_days=excluded.retention_days,is_active=true;

-- This is a trusted migration; bypass the owner-only commercial-field guard
-- while normalizing legacy events to the replacement package IDs.
select set_config('eph.allow_commercial_write','on',false);

-- Repoint legacy events to the closest new tier; the following migration's
-- package trigger clamps any event-level overrides to the new package caps.
update public.events e set package_id = case
  when old_pkg.photo_limit > 240 then (select id from public.packages where code='event_pack')
  when old_pkg.photo_limit > 100 then (select id from public.packages where code='party_pack')
  else (select id from public.packages where code='free') end
from public.packages old_pkg
where e.package_id=old_pkg.id and old_pkg.code not in ('free','party_pack','event_pack');
select set_config('eph.allow_commercial_write','off',false);

-- Shrink inactive legacy package rows too, so the universal cap can be added
-- without breaking databases that previously allowed larger files.
update public.packages set max_file_size_bytes=least(max_file_size_bytes,15728640);
-- Enforce the universal single-file ceiling at the package boundary.
alter table public.packages drop constraint if exists packages_file_size_range;
alter table public.packages add constraint packages_file_size_range check (max_file_size_bytes between 1048576 and 15728640);
