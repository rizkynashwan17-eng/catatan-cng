-- Jalankan sekali di Supabase: SQL Editor > New query > tempel semua > Run.
-- Menyimpan acuan per mobil (pendapatan dan gaji sopir per bulan). Data lain tidak berubah.
-- Aman dijalankan dua kali. Perlu update-mobil.sql sudah dijalankan lebih dulu.

create table if not exists public.acuan_mobil (
  kendaraan text primary key,
  pendapatan bigint not null default 65000000 check (pendapatan >= 0),
  gaji bigint not null default 7500000 check (gaji >= 0),
  updated_at timestamptz not null default now()
);

alter table public.acuan_mobil enable row level security;
drop policy if exists "akses dengan password" on public.acuan_mobil;
create policy "akses dengan password" on public.acuan_mobil
  for all to anon, authenticated
  using (public.cek_password())
  with check (public.cek_password());

grant select, insert, update, delete on public.acuan_mobil to anon, authenticated;

-- Isi awal untuk mobil yang sudah ada
insert into public.acuan_mobil (kendaraan)
select k.nama from public.kendaraan k
where not exists (select 1 from public.acuan_mobil a where a.kendaraan = k.nama);

-- Ganti nama mobil: acuan dan centang tracker ikut pindah ke nama baru
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
  delete from public.acuan_mobil where kendaraan = n;
  update public.acuan_mobil set kendaraan = n where kendaraan = lama;
  if to_regclass('public.trip_tracker') is not null then
    delete from public.trip_tracker where kendaraan = n;
    update public.trip_tracker set kendaraan = n where kendaraan = lama;
  end if;
end;
$$;

grant execute on function public.ganti_nama_mobil(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
