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
