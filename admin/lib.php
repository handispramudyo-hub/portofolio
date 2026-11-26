<?php
/**
 * Fungsi bersama untuk sistem admin.
 *
 * Semua akses file dilakukan dari sini supaya validasi (path traversal,
 * tipe file, ukuran) hanya ada di satu tempat.
 */

declare(strict_types=1);

define('ADMIN_DIR', __DIR__);
define('SITE_DIR', dirname(__DIR__));
define('CONTENT_FILE', SITE_DIR . '/content.json');
define('DATA_FILE', SITE_DIR . '/data.js');
define('AUTH_FILE', ADMIN_DIR . '/auth.php');
define('STORAGE_DIR', ADMIN_DIR . '/storage');
define('BACKUP_DIR', ADMIN_DIR . '/backups');
define('ASSETS_DIR', SITE_DIR . '/assets');

define('MAX_CONTENT_BYTES', 2 * 1024 * 1024);

/* -------------------------------------------------------------------------
 * URL dasar admin
 * ---------------------------------------------------------------------- */

/**
 * Path URL folder admin, misalnya "/admin" atau "/porto-web/admin".
 * Dipakai supaya redirect dan request JS tidak bergantung pada URL saat ini.
 */
function admin_base(): string
{
    $dir = realpath(ADMIN_DIR) ?: str_replace('\\', '/', ADMIN_DIR);
    $docRoot = realpath((string)($_SERVER['DOCUMENT_ROOT'] ?? '')) ?: '';

    if ($docRoot !== '' && str_starts_with($dir, $docRoot)) {
        $base = str_replace('\\', '/', substr($dir, strlen($docRoot)));
    } else {
        $base = str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? '')));
        if ($base === '.') {
            $base = '';
        }
    }

    return rtrim($base, '/');
}

/**
 * Paksa "/admin" menjadi "/admin/" supaya path relatif (CSS, JS, app.php)
 * tidak di-resolve dari root situs.
 */
function enforce_admin_trailing_slash(): void
{
    $uri = (string)($_SERVER['REQUEST_URI'] ?? '');
    $path = parse_url($uri, PHP_URL_PATH);
    $base = admin_base();

    if (is_string($path) && $base !== '' && rtrim($path, '/') === $base && !str_ends_with($path, '/')) {
        $query = parse_url($uri, PHP_URL_QUERY);
        header('Location: ' . $base . '/' . ($query ? '?' . $query : ''));
        exit;
    }
}

/* -------------------------------------------------------------------------
 * Konfigurasi & util
 * ---------------------------------------------------------------------- */

function admin_config(): array
{
    static $config = null;
    if ($config === null) {
        $config = require ADMIN_DIR . '/config.php';
        date_default_timezone_set($config['timezone'] ?? 'Asia/Jakarta');
    }
    return $config;
}

function auth_record(): array
{
    static $auth = null;
    if ($auth === null) {
        $auth = is_file(AUTH_FILE) ? require AUTH_FILE : ['password_hash' => '', 'must_change' => false];
    }
    return $auth;
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['SERVER_PORT'] ?? '') === '443')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function ensure_dirs(): void
{
    $dirs = [
        STORAGE_DIR,
        BACKUP_DIR,
        ASSETS_DIR . '/profile',
        ASSETS_DIR . '/projects',
        ASSETS_DIR . '/certificates',
    ];

    foreach ($dirs as $dir) {
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
    }
}

function json_out($payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function human_bytes(int $bytes): string
{
    if ($bytes >= 1048576) {
        return round($bytes / 1048576, 1) . ' MB';
    }
    if ($bytes >= 1024) {
        return round($bytes / 1024) . ' KB';
    }
    return $bytes . ' B';
}

function parse_bytes(string $value): int
{
    $value = trim($value);
    if ($value === '') {
        return 0;
    }

    $unit = strtolower($value[strlen($value) - 1]);
    $number = (int) $value;

    switch ($unit) {
        case 'g':
            return $number * 1024 * 1024 * 1024;
        case 'm':
            return $number * 1024 * 1024;
        case 'k':
            return $number * 1024;
        default:
            return $number;
    }
}

function upload_limit_bytes(): int
{
    $config = admin_config();
    $ini = parse_bytes((string) ini_get('upload_max_filesize'));
    $post = parse_bytes((string) ini_get('post_max_size'));
    $limit = (int) round(($config['max_upload_mb'] ?? 10) * 1024 * 1024);

    foreach ([$ini, $post] as $candidate) {
        if ($candidate > 0 && $candidate < $limit) {
            $limit = $candidate;
        }
    }

    return $limit;
}

/* -------------------------------------------------------------------------
 * Session, CSRF, login
 * ---------------------------------------------------------------------- */

function boot_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_name('handis_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function csrf_token(): string
{
    boot_session();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function check_csrf(): void
{
    boot_session();
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf'] ?? '');

    if (empty($_SESSION['csrf']) || !is_string($sent) || !hash_equals($_SESSION['csrf'], $sent)) {
        json_out(['error' => 'Token keamanan tidak valid. Muat ulang halaman lalu coba lagi.'], 419);
    }
}

function require_post(string $message = 'Gunakan POST.'): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        json_out(['error' => $message], 405);
    }
    check_csrf();
}

function is_logged_in(): bool
{
    boot_session();
    return !empty($_SESSION['admin_logged_in']);
}

function require_auth(bool $redirect = false): void
{
    if (is_logged_in()) {
        return;
    }

    if ($redirect) {
        header('Location: ' . admin_base() . '/index.php');
        exit;
    }

    json_out(['error' => 'Sesi berakhir. Silakan login ulang.', 'code' => 'auth'], 401);
}

function login_attempts_file(): string
{
    return STORAGE_DIR . '/login-attempts.json';
}

function client_key(): string
{
    return hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . ($_SERVER['HTTP_USER_AGENT'] ?? ''));
}

function read_attempts(): array
{
    $file = login_attempts_file();
    if (!is_file($file)) {
        return [];
    }
    $data = json_decode((string) file_get_contents($file), true);
    return is_array($data) ? $data : [];
}

function write_attempts(array $data): void
{
    ensure_dirs();
    @file_put_contents(login_attempts_file(), json_encode($data), LOCK_EX);
}

function throttle_remaining(): int
{
    $key = client_key();
    $attempts = read_attempts();

    if (empty($attempts[$key]['until'])) {
        return 0;
    }

    $remaining = (int) $attempts[$key]['until'] - time();
    return $remaining > 0 ? $remaining : 0;
}

function record_login_failure(): void
{
    $config = admin_config();
    $key = client_key();
    $attempts = read_attempts();
    $row = $attempts[$key] ?? ['count' => 0, 'until' => 0];
    $row['count'] = (int) ($row['count'] ?? 0) + 1;

    if ($row['count'] >= (int) ($config['login_max_attempts'] ?? 6)) {
        $row['until'] = time() + ((int) ($config['login_lock_minutes'] ?? 10) * 60);
        $row['count'] = 0;
    }

    $attempts[$key] = $row;
    write_attempts($attempts);
}

function clear_login_failures(): void
{
    $key = client_key();
    $attempts = read_attempts();
    unset($attempts[$key]);
    write_attempts($attempts);
}

/* -------------------------------------------------------------------------
 * Data: content.json  ->  data.js
 * ---------------------------------------------------------------------- */

function read_content(): array
{
    if (!is_file(CONTENT_FILE)) {
        return [];
    }

    $raw = file_get_contents(CONTENT_FILE);
    $data = json_decode((string) $raw, true);
    return is_array($data) ? $data : [];
}

function atomic_write(string $path, string $data): void
{
    $tmp = $path . '.tmp';
    if (@file_put_contents($tmp, $data, LOCK_EX) === false) {
        throw new RuntimeException('Tidak bisa menulis ' . basename($path) . '. Periksa izin file (chmod 644) dan folder (755).');
    }

    if (!@rename($tmp, $path)) {
        @unlink($path);
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            throw new RuntimeException('Gagal mengganti ' . basename($path) . '.');
        }
    }

    @chmod($path, 0644);
}

function content_json(array $content): string
{
    return json_encode(
        $content,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );
}

function data_js_source(array $content): string
{
    $header = "/* ============================================================================\n"
        . "   HANDIS.DEV - DATA SITUS\n"
        . "   ----------------------------------------------------------------------------\n"
        . "   FILE INI DIBUAT OTOMATIS oleh sistem admin.\n"
        . "   Jangan diedit manual - perubahan akan tertimpa saat kamu menyimpan\n"
        . "   lewat admin. Sumber datanya ada di content.json.\n"
        . "   ========================================================================== */\n\n";

    return $header . 'window.PORTFOLIO = ' . content_json($content) . ";\n";
}

function backup_content(array $content): void
{
    ensure_dirs();

    $file = BACKUP_DIR . '/content-' . date('Ymd-His') . '.json';
    @file_put_contents($file, content_json($content) . "\n", LOCK_EX);

    $keep = (int) (admin_config()['backup_keep'] ?? 40);
    $files = glob(BACKUP_DIR . '/content-*.json') ?: [];
    sort($files);

    while (count($files) > $keep) {
        $oldest = array_shift($files);
        if ($oldest) {
            @unlink($oldest);
        }
    }
}

function write_content(array $content): void
{
    ensure_dirs();

    $previous = read_content();
    if ($previous) {
        backup_content($previous);
    }

    $json = content_json($content);

    atomic_write(CONTENT_FILE, $json . "\n");
    atomic_write(DATA_FILE, data_js_source($content));
}

function content_is_valid($content): bool
{
    if (!is_array($content) || $content === []) {
        return false;
    }

    $required = ['profile', 'projects', 'certificates'];
    foreach ($required as $key) {
        if (!array_key_exists($key, $content)) {
            return false;
        }
    }

    return is_array($content['profile']);
}

/* -------------------------------------------------------------------------
 * Upload gambar
 * ---------------------------------------------------------------------- */

function upload_kinds(): array
{
    $images = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

    return [
        'photo' => [
            'dir' => ASSETS_DIR . '/profile',
            'url' => 'assets/profile',
            'prefix' => 'photo',
            'mimes' => $images,
            'label' => 'foto',
        ],
        'project' => [
            'dir' => ASSETS_DIR . '/projects',
            'url' => 'assets/projects',
            'prefix' => 'project',
            'mimes' => $images,
            'label' => 'gambar project',
        ],
        'cert' => [
            'dir' => ASSETS_DIR . '/certificates',
            'url' => 'assets/certificates',
            'prefix' => 'cert',
            'mimes' => $images,
            'label' => 'gambar sertifikat',
        ],
        'cv' => [
            'dir' => ASSETS_DIR,
            'url' => 'assets',
            'prefix' => 'cv',
            'mimes' => ['application/pdf' => 'pdf'],
            'label' => 'CV',
        ],
    ];
}

function slugify(string $text): string
{
    $text = strtolower(trim($text));
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    $text = trim((string) $text, '-');
    return substr($text, 0, 60);
}

function upload_error_message(int $code): string
{
    switch ($code) {
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            return 'File melebihi batas upload server (' . ini_get('upload_max_filesize') . ').';
        case UPLOAD_ERR_PARTIAL:
            return 'Upload terputus. Coba lagi.';
        case UPLOAD_ERR_NO_FILE:
            return 'Tidak ada file yang dipilih.';
        case UPLOAD_ERR_NO_TMP_DIR:
            return 'Folder sementara server tidak tersedia.';
        case UPLOAD_ERR_CANT_WRITE:
            return 'Server tidak bisa menulis file.';
        default:
            return 'Upload gagal (kode ' . $code . ').';
    }
}

function handle_upload(string $kind): array
{
    ensure_dirs();

    $kinds = upload_kinds();
    if (!isset($kinds[$kind])) {
        json_out(['error' => 'Jenis upload tidak dikenal.'], 400);
    }

    $conf = $kinds[$kind];

    if (!isset($_FILES['file'])) {
        json_out(['error' => 'Tidak ada file yang dikirim.'], 400);
    }

    $file = $_FILES['file'];

    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        json_out(['error' => upload_error_message((int) $file['error'])], 400);
    }

    $limit = upload_limit_bytes();
    if ($limit > 0 && (int) $file['size'] > $limit) {
        json_out(['error' => 'Ukuran file terlalu besar. Maksimal ' . human_bytes($limit) . '.'], 400);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']) ?: '';

    if (!isset($conf['mimes'][$mime])) {
        $allowed = $kind === 'cv' ? 'PDF' : 'JPG, PNG, atau WebP';
        json_out(['error' => 'Format file tidak didukung. Gunakan ' . $allowed . '.'], 400);
    }

    $ext = $conf['mimes'][$mime];
    $base = slugify(pathinfo($file['name'] ?? '', PATHINFO_FILENAME));
    if ($base === '') {
        $base = $conf['prefix'];
    }

    $name = $base . '-' . bin2hex(random_bytes(3)) . '.' . $ext;
    $dest = $conf['dir'] . '/' . $name;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        json_out(['error' => 'Gagal menyimpan file. Pastikan folder assets/ bisa ditulis (chmod 755).'], 500);
    }

    @chmod($dest, 0644);

    if ($mime !== 'application/pdf') {
        optimize_image($dest, $mime);
    }

    return [
        'url' => $conf['url'] . '/' . $name,
        'name' => $name,
        'mime' => $mime,
        'bytes' => (int) @filesize($dest),
        'label' => $conf['label'],
    ];
}

/**
 * Perkecil gambar kalau terlalu besar, perbaiki rotasi EXIF.
 * Kalau GD tidak tersedia, file dibiarkan apa adanya.
 */
function optimize_image(string $path, string $mime): void
{
    if (!function_exists('imagecreatetruecolor')) {
        return;
    }

    $info = @getimagesize($path);
    if (!$info) {
        return;
    }

    $width = (int) $info[0];
    $height = (int) $info[1];
    if ($width < 1 || $height < 1) {
        return;
    }

    $creators = [
        'image/jpeg' => 'imagecreatefromjpeg',
        'image/png' => 'imagecreatefrompng',
        'image/webp' => 'imagecreatefromwebp',
    ];

    $source = false;
    if (isset($creators[$mime]) && function_exists($creators[$mime])) {
        $source = @$creators[$mime]($path);
    }
    if (!$source) {
        return;
    }

    // Rotasi sesuai EXIF (foto dari HP sering butuh ini).
    if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
        $exif = @exif_read_data($path);
        $orientation = (int) ($exif['Orientation'] ?? 1);
        if ($orientation === 3) {
            $source = imagerotate($source, 180, 0);
        } elseif ($orientation === 6) {
            $source = imagerotate($source, -90, 0);
        } elseif ($orientation === 8) {
            $source = imagerotate($source, 90, 0);
        }
    }

    $max = (int) (admin_config()['image_max_width'] ?? 1800);
    $w = imagesx($source);
    $h = imagesy($source);

    if ($w > $max) {
        $newW = $max;
        $newH = (int) round($h * ($max / $w));
        $target = imagecreatetruecolor($newW, $newH);

        if ($mime === 'image/png') {
            imagealphablending($target, false);
            imagesavealpha($target, true);
            $transparent = imagecolorallocatealpha($target, 0, 0, 0, 127);
            imagefilledrectangle($target, 0, 0, $newW, $newH, $transparent);
        }

        imagecopyresampled($target, $source, 0, 0, 0, 0, $newW, $newH, $w, $h);
        imagedestroy($source);
        $source = $target;
    }

    $quality = (int) (admin_config()['jpeg_quality'] ?? 85);

    if ($mime === 'image/jpeg') {
        @imagejpeg($source, $path, $quality);
    } elseif ($mime === 'image/png') {
        @imagepng($source, $path, 8);
    } elseif ($mime === 'image/webp') {
        @imagewebp($source, $path, $quality);
    }

    imagedestroy($source);
}

function delete_asset(string $relative): bool
{
    $relative = str_replace('\\', '/', trim($relative));
    if ($relative === '' || strpos($relative, '..') !== false) {
        return false;
    }
    if (strpos($relative, 'assets/') !== 0) {
        return false;
    }

    $ext = strtolower(pathinfo($relative, PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'pdf'], true)) {
        return false;
    }

    $assetsRoot = realpath(ASSETS_DIR);
    $full = realpath(SITE_DIR . '/' . $relative);

    if (!$assetsRoot || !$full) {
        return false;
    }
    if (strpos($full, $assetsRoot) !== 0) {
        return false;
    }
    if (!is_file($full)) {
        return false;
    }

    return @unlink($full);
}

/**
 * Kumpulkan semua path gambar yang dipakai di content.
 */
function referenced_assets(array $content): array
{
    $found = [];
    $walk = function ($value) use (&$walk, &$found) {
        if (is_string($value)) {
            if (strpos($value, 'assets/') === 0) {
                $found[$value] = true;
            }
            return;
        }
        if (is_array($value)) {
            foreach ($value as $item) {
                $walk($item);
            }
        }
    };
    $walk($content);

    return array_keys($found);
}

/**
 * Daftar file gambar di assets/ yang tidak dipakai content.
 */
function unused_assets(array $content): array
{
    $used = array_fill_keys(referenced_assets($content), true);
    $result = [];

    $dirs = [
        'assets/profile' => ['jpg', 'jpeg', 'png', 'webp'],
        'assets/projects' => ['jpg', 'jpeg', 'png', 'webp'],
        'assets/certificates' => ['jpg', 'jpeg', 'png', 'webp'],
    ];

    foreach ($dirs as $relDir => $exts) {
        $dir = SITE_DIR . '/' . $relDir;
        if (!is_dir($dir)) {
            continue;
        }

        $files = scandir($dir) ?: [];
        foreach ($files as $file) {
            if ($file === '.' || $file === '..' || $file[0] === '.') {
                continue;
            }

            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (!in_array($ext, $exts, true)) {
                continue;
            }

            $rel = $relDir . '/' . $file;
            if (!isset($used[$rel])) {
                $result[] = [
                    'path' => $rel,
                    'bytes' => (int) @filesize($dir . '/' . $file),
                    'modified' => date('Y-m-d H:i', (int) @filemtime($dir . '/' . $file)),
                ];
            }
        }
    }

    usort($result, function ($a, $b) {
        return strcmp($a['path'], $b['path']);
    });

    return $result;
}

function write_password(string $password): void
{
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $source = "<?php\n"
        . "/**\n"
        . " * Admin auth file - dibuat otomatis oleh menu Pengaturan.\n"
        . " * Jangan diedit manual.\n"
        . " */\n\n"
        . "return [\n"
        . "    'password_hash' => " . var_export($hash, true) . ",\n"
        . "    'must_change'   => false,\n"
        . "];\n";

    atomic_write(AUTH_FILE, $source);
    @chmod(AUTH_FILE, 0644);
}
