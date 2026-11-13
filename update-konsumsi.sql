-- Jalankan sekali di Supabase: SQL Editor > New query > tempel > Run.
-- Menambah kolom liter (opsional) untuk catatan solar. Data lama tidak berubah.
alter table public.pengeluaran
  add column if not exists liter numeric(10,2) check (liter is null or liter > 0);

notify pgrst, 'reload schema';
