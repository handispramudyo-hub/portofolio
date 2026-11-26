<?php
declare(strict_types=1);

require __DIR__ . '/lib.php';

boot_session();
ensure_dirs();

$action = (string) ($_GET['action'] ?? '');

if ($action === 'logout') {
    require_post('Gunakan POST untuk logout.');
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    json_out(['ok' => true]);
}

require_auth();

$auth = auth_record();

switch ($action) {
    /* --------------------------------------------------------------------- */
    case 'get':
        $content = read_content();
        $backups = glob(BACKUP_DIR . '/content-*.json') ?: [];
        $maxUpload = upload_limit_bytes();

        json_out([
            'content' => $content,
            'meta' => [
                'mustChange' => !empty($auth['must_change']),
                'phpVersion' => PHP_VERSION,
                'maxUpload' => $maxUpload,
                'maxUploadLabel' => human_bytes($maxUpload),
                'uploadIni' => (string) ini_get('upload_max_filesize'),
                'postIni' => (string) ini_get('post_max_size'),
                'gd' => function_exists('imagecreatetruecolor'),
                'contentBytes' => is_file(CONTENT_FILE) ? (int) filesize(CONTENT_FILE) : 0,
                'backupCount' => count($backups),
                'savedAt' => is_file(CONTENT_FILE) ? date('d M Y H:i', (int) filemtime(CONTENT_FILE)) : null,
            ],
        ]);
        break;

    /* --------------------------------------------------------------------- */
    case 'save':
        require_post();

        $raw = file_get_contents('php://input');
        if ($raw === false || strlen($raw) > MAX_CONTENT_BYTES) {
            json_out(['error' => 'Data terlalu besar (maksimal 2 MB).'], 413);
        }

        $payload = json_decode($raw, true);
        $content = $payload['content'] ?? null;

        if (!content_is_valid($content)) {
            json_out(['error' => 'Struktur data tidak valid.'], 400);
        }

        try {
            write_content($content);
        } catch (Throwable $e) {
            json_out(['error' => $e->getMessage()], 500);
        }

        json_out([
            'ok' => true,
            'savedAt' => date('d M Y H:i:s'),
            'projects' => count($content['projects'] ?? []),
            'certificates' => count($content['certificates'] ?? []),
        ]);
        break;

    /* --------------------------------------------------------------------- */
    case 'upload':
        require_post();

        $file = handle_upload((string) ($_GET['kind'] ?? 'project'));

        json_out(['ok' => true, 'file' => $file]);
        break;

    /* --------------------------------------------------------------------- */
    case 'delete-file':
        require_post();

        $payload = json_decode((string) file_get_contents('php://input'), true);
        $path = (string) ($payload['path'] ?? '');

        if ($path === '') {
            json_out(['error' => 'Path file kosong.'], 400);
        }

        $content = read_content();
        if (in_array($path, referenced_assets($content), true)) {
            json_out(['error' => 'File ini masih dipakai di konten. Hapus dulu dari form, simpan, lalu bersihkan.'], 409);
        }

        if (!delete_asset($path)) {
            json_out(['error' => 'File tidak ditemukan atau tidak boleh dihapus.'], 400);
        }

        json_out(['ok' => true]);
        break;

    /* --------------------------------------------------------------------- */
    case 'unused':
        json_out([
            'ok' => true,
            'files' => unused_assets(read_content()),
        ]);
        break;

    /* --------------------------------------------------------------------- */
    case 'change-password':
        require_post();

        $payload = json_decode((string) file_get_contents('php://input'), true);
        $current = (string) ($payload['current'] ?? '');
        $new = (string) ($payload['new'] ?? '');

        if (!password_verify($current, (string) ($auth['password_hash'] ?? ''))) {
            json_out(['error' => 'Password saat ini salah.'], 400);
        } elseif (strlen($new) < 8) {
            json_out(['error' => 'Password baru minimal 8 karakter.'], 400);
        } elseif ($current === $new) {
            json_out(['error' => 'Password baru harus berbeda dari yang lama.'], 400);
        }

        try {
            write_password($new);
        } catch (Throwable $e) {
            json_out(['error' => $e->getMessage()], 500);
        }

        json_out(['ok' => true]);
        break;

    /* --------------------------------------------------------------------- */
    case 'backup':
        $content = read_content();
        $filename = 'content-backup-' . date('Ymd-His') . '.json';

        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-store');
        echo content_json($content) . "\n";
        exit;

    /* --------------------------------------------------------------------- */
    case 'restore':
        require_post();

        if (!isset($_FILES['file']) || ($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            json_out(['error' => 'Pilih file backup (.json) yang valid.'], 400);
        }

        $tmp = $_FILES['file']['tmp_name'];
        $raw = (string) file_get_contents($tmp);
        if (strlen($raw) > MAX_CONTENT_BYTES) {
            json_out(['error' => 'File backup terlalu besar.'], 413);
        }

        $decoded = json_decode($raw, true);
        if (!content_is_valid($decoded)) {
            json_out(['error' => 'File bukan backup konten yang valid.'], 400);
        }

        try {
            write_content($decoded);
        } catch (Throwable $e) {
            json_out(['error' => $e->getMessage()], 500);
        }

        json_out(['ok' => true, 'content' => read_content()]);
        break;

    /* --------------------------------------------------------------------- */
    default:
        json_out(['error' => 'Aksi tidak dikenal.'], 404);
}
