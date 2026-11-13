-- Jalankan sekali di Supabase: menu SQL Editor > New query > tempel semua isi file ini > Run.

-- 1. Tabel pengeluaran
create table if not exists public.pengeluaran (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  kendaraan text not null default 'Umum',
  kategori text not null,
  keterangan text not null,
  lokasi text not null default '',
  oleh text not null,
  jumlah bigint not null check (jumlah > 0),
  created_at timestamptz not null default now()
);
create index if not exists pengeluaran_tanggal_idx on public.pengeluaran (tanggal desc);

-- 2. Password aplikasi. Untuk menggantinya, ubah angka 122122122 di bawah
--    lalu jalankan ulang bagian fungsi ini (dari "create or replace" sampai tanda ;).
create or replace function public.cek_password() returns boolean
language sql stable
as $$
  select coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-app-password', '') = '122122122';
$$;

create or replace function public.cek_login() returns boolean
language sql stable
as $$
  select public.cek_password();
$$;

-- 3. Keamanan: baca dan tulis hanya lolos kalau password yang dikirim aplikasi benar
alter table public.pengeluaran enable row level security;
drop policy if exists "akses dengan password" on public.pengeluaran;
create policy "akses dengan password" on public.pengeluaran
  for all to anon, authenticated
  using (public.cek_password())
  with check (public.cek_password());

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.pengeluaran to anon, authenticated;
grant execute on function public.cek_password() to anon, authenticated;
grant execute on function public.cek_login() to anon, authenticated;

-- ===== Daftar mobil dan ganti nama mobil =====
-- 1. Daftar mobil
create table if not exists public.kendaraan (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (char_length(btrim(nama)) between 1 and 30 and lower(btrim(nama)) <> 'umum'),
  urutan int not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists kendaraan_nama_uq on public.kendaraan (lower(nama));

-- Isi awal: Nissan dan Quester (hanya kalau belum ada)
insert into public.kendaraan (nama, urutan)
select v.nama, v.urutan
from (values ('Nissan', 1), ('Quester', 2)) as v(nama, urutan)
where not exists (select 1 from public.kendaraan k where lower(k.nama) = lower(v.nama));

-- 2. Keamanan: sama seperti tabel pengeluaran, hanya lolos kalau password aplikasi benar
alter table public.kendaraan enable row level security;
drop policy if exists "akses dengan password" on public.kendaraan;
create policy "akses dengan password" on public.kendaraan
  for all to anon, authenticated
  using (public.cek_password())
  with check (public.cek_password());

grant select, insert, update, delete on public.kendaraan to anon, authenticated;

-- 3. Ganti nama mobil: mengubah daftar mobil dan semua catatan lama sekaligus
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
end;
$$;

grant execute on function public.ganti_nama_mobil(text, text) to anon, authenticated;

-- Supaya perubahan langsung terbaca oleh aplikasi
notify pgrst, 'reload schema';

-- ===== Kolom liter untuk solar =====
alter table public.pengeluaran
  add column if not exists liter numeric(10,2) check (liter is null or liter > 0);

notify pgrst, 'reload schema';
