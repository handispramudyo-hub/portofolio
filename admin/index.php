<?php
declare(strict_types=1);

require __DIR__ . '/lib.php';

enforce_admin_trailing_slash();
boot_session();
ensure_dirs();

if (is_logged_in()) {
    header('Location: ' . admin_base() . '/app.php');
    exit;
}

$auth = auth_record();
$error = '';
$notice = '';

if (($_GET['logout'] ?? '') === '1') {
    $notice = 'Kamu sudah keluar dari sistem admin.';
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['csrf'] ?? '';
    if (!is_string($token) || empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $token)) {
        $error = 'Sesi kedaluwarsa. Muat ulang halaman lalu coba lagi.';
    } else {
        $wait = throttle_remaining();
        if ($wait > 0) {
            $error = 'Terlalu banyak percobaan. Coba lagi dalam ' . ceil($wait / 60) . ' menit.';
        } else {
            $password = (string) ($_POST['password'] ?? '');

            if ($password !== '' && password_verify($password, (string) ($auth['password_hash'] ?? ''))) {
                clear_login_failures();
                session_regenerate_id(true);
                $_SESSION['admin_logged_in'] = true;
                $_SESSION['csrf'] = bin2hex(random_bytes(32));
                header('Location: ' . admin_base() . '/app.php');
                exit;
            }

            record_login_failure();
            $error = 'Password salah.';
        }
    }
}

$csrf = csrf_token();
$siteName = admin_config()['site_name'] ?? 'Admin';
$mustChange = !empty($auth['must_change']);
?>
<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Login Admin — <?= htmlspecialchars($siteName, ENT_QUOTES, 'UTF-8') ?></title>
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="assets/admin.css?v=2">
</head>
<body class="login-body">

  <main class="login-wrap">
    <div class="login-card">
      <p class="login-brand">
        <span class="login-mark" aria-hidden="true">H</span>
        <?= htmlspecialchars($siteName, ENT_QUOTES, 'UTF-8') ?>
      </p>

      <h1 class="login-title">Masuk ke sistem admin</h1>
      <p class="login-sub">Kelola project, sertifikat, foto, dan seluruh isi portofolio dari sini.</p>

      <?php if ($notice !== ''): ?>
        <p class="alert alert-info"><?= htmlspecialchars($notice, ENT_QUOTES, 'UTF-8') ?></p>
      <?php endif; ?>

      <?php if ($error !== ''): ?>
        <p class="alert alert-error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p>
      <?php endif; ?>

      <form method="post" autocomplete="current-password">
        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8') ?>">

        <label class="login-label" for="password">Password</label>
        <div class="login-input-row">
          <input
            class="login-input"
            type="password"
            id="password"
            name="password"
            required
            autofocus
            autocomplete="current-password"
            placeholder="Masukkan password admin"
          >
          <button class="login-toggle" type="button" data-toggle-password aria-label="Tampilkan password">Lihat</button>
        </div>

        <button class="login-submit" type="submit">Masuk</button>
      </form>

      <?php if ($mustChange): ?>
        <p class="login-hint">
          Password awal: <code>handis123</code><br>
          Segera ganti lewat menu <strong>Pengaturan</strong> setelah masuk.
        </p>
      <?php endif; ?>

      <p class="login-foot"><a href="../index.html">&larr; Kembali ke situs</a></p>
    </div>
  </main>

  <script>
    document.querySelector('[data-toggle-password]').addEventListener('click', function () {
      var input = document.getElementById('password');
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      this.textContent = show ? 'Sembunyi' : 'Lihat';
      this.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password');
    });
  </script>
</body>
</html>
