
insert into public.blotato_accounts (account_id, platform, handle, brand, purpose) values
  ('59689','instagram','@sentinelaerialinspector','Sentinel Aerial','Part 107 training'),
  ('59691','instagram','@north_east_corner1','North East Corner','Masonic education')
on conflict (account_id) do update set
  handle = excluded.handle, brand = excluded.brand, purpose = excluded.purpose, platform = excluded.platform;
