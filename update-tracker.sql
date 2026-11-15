-- Jalankan sekali di Supabase: SQL Editor > New query > tempel semua > Run.
-- Membuat tabel Tracker trip (centang Solar, Ops, Tol per trip). Data lain tidak berubah.
-- Aman dijalankan dua kali. Perlu update-mobil.sql sudah dijalankan lebih dulu.

create table if not exists public.trip_tracker (
  bulan text not null check (bulan ~ '^[0-9]{4}-[0-9]{2}$'),
  kendaraan text not null,
  trip int not null check (trip between 1 and 15),
  solar boolean not null default false,
  ops boolean not null default false,
  tol boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (bulan, kendaraan, trip)
);

alter table public.trip_tracker enable row level security;
drop policy if exists "akses dengan password" on public.trip_tracker;
create policy "akses dengan password" on public.trip_tracker
  for all to anon, authenticated
  using (public.cek_password())
  with check (public.cek_password());

grant select, insert, update, delete on public.trip_tracker to anon, authenticated;

-- Ganti nama mobil: sekarang centang tracker ikut pindah ke nama baru
create or replace function public.ganti_nama_mobil(lama text, baru text) returns void
language plpgsql
as $$
declare
  n text := btrim(baru);
begin
  if not public.cek_password() then
    raise exception 'Password salah';
  end if;
  if char_length(n) < 1 or char_length(n) > 30 or lower(n) = 'umum' then
    raise exception 'Nama tidak valid';
  end if;
  update public.kendaraan set nama = n where nama = lama;
  update public.pengeluaran set kendaraan = n where kendaraan = lama;
  delete from public.trip_tracker where kendaraan = n;
  update public.trip_tracker set kendaraan = n where kendaraan = lama;
end;
$$;

grant execute on function public.ganti_nama_mobil(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
