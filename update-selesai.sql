-- Jalankan sekali di Supabase: SQL Editor > New query > tempel > Run.
-- Menambah centang "Selesai" per trip di Tracker. Data lain tidak berubah.
alter table public.trip_tracker
  add column if not exists selesai boolean not null default false;

notify pgrst, 'reload schema';
