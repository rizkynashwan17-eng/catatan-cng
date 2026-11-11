# Catatan Pengeluaran CNG

Aplikasi web untuk mencatat pengeluaran kerja dua truk (Nissan dan Quester) plus pengeluaran umum.
Data disimpan di Supabase dan dikunci dengan password aplikasi.

- `index.html`: aplikasinya
- `config.js`: alamat proyek Supabase dan kunci publishable
- `setup.sql`: tabel dan aturan keamanan, dijalankan sekali di SQL Editor Supabase

Untuk mengganti password, ubah angkanya di fungsi `cek_password` pada `setup.sql`, lalu jalankan ulang bagian fungsi itu di SQL Editor.
