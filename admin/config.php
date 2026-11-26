<?php
/**
 * Konfigurasi sistem admin.
 *
 * File ini TIDAK berisi password. Password disimpan sebagai hash di
 * admin/auth.php (dibuat otomatis saat pertama kali dipasang).
 */

return [
    // Nama yang tampil di header admin.
    'site_name' => 'Handis.dev',

    // Zona waktu untuk nama file backup.
    'timezone' => 'Asia/Jakarta',

    // Batas ukuran file upload (MB). Tetap tunduk pada php.ini hosting.
    'max_upload_mb' => 10,

    // Lebar maksimum gambar setelah di-resize otomatis (px).
    'image_max_width' => 1800,

    // Kualitas JPEG setelah resize (0-100).
    'jpeg_quality' => 85,

    // Jumlah backup yang disimpan.
    'backup_keep' => 40,

    // Batas percobaan login sebelum dikunci sementara.
    'login_max_attempts' => 6,
    'login_lock_minutes' => 10,
];
