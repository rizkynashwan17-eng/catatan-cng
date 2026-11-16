-- Jalankan sekali di Supabase: SQL Editor > New query > tempel > Run.
-- Menambah biaya standar per trip di acuan (solar, ops, tol). Data lain tidak berubah.
-- Perlu update-acuan.sql sudah dijalankan lebih dulu.
alter table public.acuan_mobil
  add column if not exists solar_trip bigint not null default 870000 check (solar_trip >= 0),
  add column if not exists ops_trip bigint not null default 500000 check (ops_trip >= 0),
  add column if not exists tol_trip bigint not null default 300000 check (tol_trip >= 0);

notify pgrst, 'reload schema';
