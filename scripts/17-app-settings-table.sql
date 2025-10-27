-- App settings table for global configuration (e.g., maximum capacity)
create table if not exists app_settings (
  key text primary key,
  value_int integer,
  value_json jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Ensure RLS is enabled
alter table app_settings enable row level security;

-- Basic policies: authenticated users can read, only admins can write
drop policy if exists app_settings_select_auth on app_settings;
create policy app_settings_select_auth on app_settings
for select using (auth.role() = 'authenticated');

drop policy if exists app_settings_write_admin on app_settings;
create policy app_settings_write_admin on app_settings
for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'ADMIN')
);

-- trigger to update updated_at
do $$ begin
  perform 1 from pg_proc where proname = 'update_updated_at_column';
  if not found then
    create or replace function update_updated_at_column()
    returns trigger as $$
    begin
      new.updated_at = now();
      return new;
    end;
    $$ language plpgsql;
  end if;
end $$;

drop trigger if exists update_app_settings_updated_at on app_settings;
create trigger update_app_settings_updated_at before update on app_settings
for each row execute function update_updated_at_column();

-- Optional seed: set a default max capacity if not present
insert into app_settings as s (key, value_int)
values ('max_capacity', 100)
on conflict (key) do nothing;