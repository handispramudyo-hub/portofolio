<?php
declare(strict_types=1);

require __DIR__ . '/lib.php';

enforce_admin_trailing_slash();
boot_session();
ensure_dirs();
require_auth(true);

$config = admin_config();
$csrf = csrf_token();
$siteName = $config['site_name'] ?? 'Admin';
?>
<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <meta name="csrf-token" content="<?= htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8') ?>">
  <title>Admin — <?= htmlspecialchars($siteName, ENT_QUOTES, 'UTF-8') ?></title>
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="assets/admin.css">
</head>
<body>

  <header class="topbar">
    <a class="topbar-brand" href="app.php">
      <span class="topbar-mark" aria-hidden="true">H</span>
      <span>
        <strong><?= htmlspecialchars($siteName, ENT_QUOTES, 'UTF-8') ?></strong>
        <small>Content Manager</small>
      </span>
    </a>

    <div class="topbar-actions">
      <span class="topbar-state" id="save-state" data-state="saved">Tersimpan</span>
      <a class="btn-ghost" href="../index.html" target="_blank" rel="noopener">Lihat situs &nearr;</a>
      <button class="btn-ghost" type="button" id="logout-btn">Keluar</button>
    </div>
  </header>

  <div class="shell">
    <aside class="side">
      <nav class="side-nav" id="side-nav" aria-label="Bagian konten"></nav>
      <div class="side-foot">
        <a href="app.php?section=settings">Pengaturan</a>
      </div>
    </aside>

    <main class="main" id="main" tabindex="-1">
      <p class="loading">Memuat data…</p>
    </main>
  </div>

  <div class="savebar" id="savebar" hidden>
    <p class="savebar-text" id="savebar-text">Ada perubahan belum disimpan.</p>
    <div class="savebar-actions">
      <button class="btn-ghost" type="button" id="discard-btn">Batalkan</button>
      <button class="btn btn-dark" type="button" id="save-btn">Simpan perubahan</button>
    </div>
  </div>

  <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>

  <script>
    window.ADMIN = {
      base: <?= json_encode(admin_base(), JSON_UNESCAPED_SLASHES) ?>,
      siteBase: <?= json_encode(site_base(), JSON_UNESCAPED_SLASHES) ?>,
      csrf: <?= json_encode($csrf) ?>,
      siteName: <?= json_encode($siteName, JSON_UNESCAPED_UNICODE) ?>
    };
  </script>
  <script src="assets/admin.js?v=2" defer></script>
</body>
</html>
