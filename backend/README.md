<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

In addition, [Laracasts](https://laracasts.com) contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

You can also watch bite-sized lessons with real-world projects on [Laravel Learn](https://laravel.com/learn), where you will be guided through building a Laravel application from scratch while learning PHP fundamentals.

## Agentic Development

Laravel's predictable structure and conventions make it ideal for AI coding agents like Claude Code, Cursor, and GitHub Copilot. Install [Laravel Boost](https://laravel.com/docs/ai) to supercharge your AI workflow:

```bash
composer require laravel/boost --dev

php artisan boost:install
```

Boost provides your agent 15+ tools and skills that help agents build Laravel applications while following best practices.

## Cloud NL — Catatan Verifikasi Email

Untuk tahap saat ini, OTP email hanya diwajibkan ketika akun dengan role **admin** melakukan login. User biasa belum diwajibkan melewati verifikasi OTP sampai alur autentikasi user difokuskan pada tahap berikutnya.

## Google OAuth dan Google Drive

Integrasi Google disiapkan melalui **Admin → System Settings → Google OAuth & Drive**. Isi Client ID, Client Secret, dan redirect URI dari OAuth client bertipe Web application di Google Cloud Console. Secret dan refresh token disimpan terenkripsi di database; keduanya tidak dikirim ke frontend.

Redirect URI yang didaftarkan harus sama persis dengan nilai di System Settings:

- Login: `https://domain-anda/api/auth/google/callback`
- Drive: `https://domain-anda/api/auth/google/callback`

Atur `FRONTEND_URL` pada backend agar callback dapat kembali ke frontend. Google sign-in hanya menerima email user yang sudah terdaftar dan aktif di Cloud NL. Koneksi Drive saat ini memakai scope metadata read-only dan endpoint daftar file root; sinkronisasi upload/download dua arah dapat ditambahkan setelah kebijakan storage diputuskan.

Fitur yang tersedia untuk admin:

- Mengirim OTP 6 digit ke email akun admin yang belum terverifikasi.
- Masa berlaku OTP 10 menit dengan maksimal 5 percobaan.
- Resend OTP dengan cooldown 60 detik.
- Verifikasi email user secara manual dari panel admin.
- Status verifikasi email pada halaman Admin Users.

Migration yang diperlukan:

```bash
php artisan migrate
```

Pada development, gunakan `MAIL_MAILER=log` untuk melihat OTP di log Laravel. Untuk production, konfigurasi SMTP pada `.env` terlebih dahulu. Verifikasi OTP untuk user biasa, forgot password, dan template email akan dikerjakan pada tahap autentikasi berikutnya.

## Cloud NL — Backlog Pekerjaan Besok

Prioritas pengembangan berikutnya sebelum deployment production:

1. **Backup restore yang aman**
   - Tambahkan dialog konfirmasi sebelum restore.
   - Sediakan pilihan restore metadata saja atau seluruh storage.
   - Buat backup otomatis sebelum proses restore.

2. **System settings admin**
   - Nama aplikasi, logo, ukuran maksimal file, dan tipe file yang diizinkan.
   - Konfigurasi storage dan durasi link sharing.
   - Simpan konfigurasi melalui environment atau tabel settings.

3. **Permission granular**
   - Finalisasi role `admin`, `manager`, dan `user`.
   - Tambahkan policy untuk dashboard, user, file global, backup, dan audit log.
   - Pastikan manager tidak dapat menjalankan operasi admin penuh.

4. **Monitoring production**
   - Pantau database, storage, queue, cache, memory, dan disk.
   - Tambahkan endpoint health check untuk uptime monitor.
   - Buat notifikasi ketika quota atau kapasitas disk mendekati batas.

5. **File management admin**
   - Tambahkan pagination dan filter user/type/ukuran/tanggal.
   - Tambahkan restore file yang dihapus admin.
   - Cleanup orphaned file dengan mode preview sebelum eksekusi.

6. **Deployment readiness**
   - Jalankan migration dan seed pada environment staging.
   - Pastikan SMTP, storage disk, backup disk, CORS, dan Sanctum dikonfigurasi.
   - Tambahkan backup database terjadwal, log rotation, dan queue worker.
   - Uji upload besar, restore, OTP admin, PWA mobile, dark mode, dan responsive layout.

7. **Testing dan observability**
   - Tambahkan feature test untuk role manager, backup, analytics, dan global files.
   - Tambahkan error tracking dan request ID pada API.
   - Review rate limit, validasi upload, authorization, dan kebijakan penghapusan data.

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

### Google OAuth dan Google Drive

Konfigurasi Google dilakukan dari Admin → System Settings. Client Secret dan refresh token disimpan terenkripsi di database. Setelah koneksi Drive aktif, admin dapat menggunakan endpoint daftar file root serta impor/ekspor file biasa menggunakan scope Drive. File Google Docs, Sheets, dan Slides native perlu diekspor lebih dulu ke DOCX/XLSX/PPTX. Jika scope berubah, lakukan koneksi ulang agar Google meminta consent terbaru.

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
