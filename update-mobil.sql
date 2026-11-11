-- Jalankan sekali di Supabase: SQL Editor > New query > tempel semua isi file ini > Run.
-- Aman kalau tidak sengaja dijalankan dua kali. Data pengeluaran yang sudah ada tidak berubah.
-- Isinya: tabel daftar mobil, dan fungsi untuk mengganti nama mobil (nama di semua catatan lama ikut berganti).

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
