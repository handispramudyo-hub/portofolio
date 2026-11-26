/* ==========================================================================
   HANDIS.DEV — PREMIUM INTRO LOADER LOGIC
   Progress dihitung dari resource yang benar-benar dimuat, bukan timer palsu.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var loader = document.getElementById('portfolio-loader');
  var percent = document.getElementById('loader-percent');
  var progressBar = document.getElementById('loader-progress-bar');
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var startedAt = performance.now();
  var MIN_DURATION = reduceMotion ? 0 : 950;
  var MAX_DURATION = reduceMotion ? 0 : 4200;
  var finished = false;
  var monitorId = 0;
  var rafId = 0;
  var parallaxCleanup = null;

  function announce() {
    window.dispatchEvent(new CustomEvent('handis:intro-complete'));
  }

  /* -- Skip saat kunjungan berikutnya dalam satu sesi ------------------- */
  if (!loader || root.classList.contains('intro-seen')) {
    root.classList.remove('has-intro');
    root.classList.add('intro-complete');
    document.body.classList.add('is-loaded');
    if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
    announce();
    return;
  }

  /* -- Kumpulkan resource penting -------------------------------------- */
  var tasks = [];

  function urlOf(el) {
    try {
      return new URL(el.href || el.src, location.href).href;
    } catch (err) {
      return el.href || el.src || '';
    }
  }

  function record(el) {
    if (el) el.setAttribute('data-loader-settled', '1');
  }

  function addResource(el, kind) {
    if (!el) return;
    var url = urlOf(el);
    tasks.push({
      url: url,
      kind: kind,
      el: el,
      done: false
    });

    function settle() { record(el); }
    el.addEventListener('load', settle, { once: true });
    el.addEventListener('error', settle, { once: true });
  }

  addResource(document.querySelector('link[href*="styles.css"]'), 'style');
  addResource(document.querySelector('link[href*="loader.css"]'), 'style');
  addResource(document.querySelector('link[href*="hero-decor.css"]'), 'style');
  addResource(document.querySelector('script[src*="loader.js"]'), 'script');
  addResource(document.querySelector('script[src*="data.js"]'), 'script');
  addResource(document.querySelector('script[src*="app.js"]'), 'script');
  addResource(document.querySelector('script[src*="hero-decor.js"]'), 'script');
  addResource(document.querySelector('img[data-profile-photo]'), 'image');

  /* Font tidak boleh menahan loader tanpa batas. */
  tasks.push({
    kind: 'fonts',
    done: !document.fonts,
    check: function () {
      return !document.fonts || document.fonts.status === 'loaded';
    }
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { record(document.body); });
  }

  /* App harus sudah siap dipakai. */
  tasks.push({
    kind: 'app',
    done: false,
    check: function () { return document.readyState !== 'loading'; }
  });

  /* Resource milik loader sendiri sudah tersedia saat kode ini berjalan. */
  var own = document.querySelector('script[src*="loader.js"]');
  if (own) record(own);

  var resourceNames = {};
  try {
    performance.getEntriesByType('resource').forEach(function (entry) {
      resourceNames[entry.name] = true;
    });
  } catch (err) { /* Performance API bisa tidak tersedia. */ }

  function isSettled(task) {
    if (task.done) return true;
    if (typeof task.check === 'function' && task.check()) {
      task.done = true;
      return true;
    }
    if (task.el && task.el.getAttribute('data-loader-settled') === '1') {
      task.done = true;
      return true;
    }
    if (task.kind === 'image' && task.el && task.el.complete) {
      task.done = true;
      return true;
    }
    if (task.url && resourceNames[task.url]) {
      task.done = true;
      return true;
    }
    try {
      if (task.url && performance.getEntriesByName(task.url).length) {
        task.done = true;
        return true;
      }
    } catch (err) { /* abaikan */ }
    return false;
  }

  /* -- Progress yang benar --------------------------------------------- */
  var currentProgress = 0;
  var targetProgress = 0;

  function updateProgress(value) {
    targetProgress = Math.max(currentProgress, Math.min(100, value));
  }

  function paint(value) {
    var shown = Math.floor(value);
    if (percent) percent.textContent = String(shown).padStart(2, '0') + '%';
    if (progressBar) progressBar.style.width = shown + '%';
  }

  function animateProgress() {
    currentProgress += (targetProgress - currentProgress) * 0.15;
    if (targetProgress - currentProgress < 0.1) currentProgress = targetProgress;
    paint(currentProgress);

    if (currentProgress < 100) {
      rafId = requestAnimationFrame(animateProgress);
    } else if (performance.now() - startedAt >= MIN_DURATION) {
      finish();
    }
  }

  function monitor() {
    var done = 0;
    for (var i = 0; i < tasks.length; i++) {
      if (isSettled(tasks[i])) done++;
    }
    updateProgress((done / tasks.length) * 100);
  }

  /* -- Parallax ringan di scene loader --------------------------------- */
  function initLoaderParallax() {
    var scene = document.querySelector('.loader-scene');
    if (!scene || reduceMotion) return null;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return null;
    if (window.innerWidth < 768) return null;

    var objects = Array.prototype.slice.call(scene.querySelectorAll('.ld-obj'))
      .map(function (el) {
        return {
          el: el,
          depth: Number(el.getAttribute('data-depth')) || 12,
          rotate: Number(el.getAttribute('data-rotate')) || 6
        };
      });

    if (!objects.length) return null;

    var mouseX = 0, mouseY = 0, currentX = 0, currentY = 0;
    var frame = 0, idle = 0;

    function onMove(event) {
      mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
      clearTimeout(idle);
      idle = window.setTimeout(function () { mouseX = 0; mouseY = 0; kick(); }, 260);
      kick();
    }

    function tick() {
      currentX += (mouseX - currentX) * 0.1;
      currentY += (mouseY - currentY) * 0.1;

      objects.forEach(function (item) {
        var x = currentX * item.depth;
        var y = currentY * item.depth;
        item.el.style.transform =
          'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) ' +
          'rotateX(' + (-currentY * item.rotate).toFixed(2) + 'deg) ' +
          'rotateY(' + (currentX * item.rotate).toFixed(2) + 'deg)';
      });

      if (Math.abs(mouseX - currentX) > 0.001 || Math.abs(mouseY - currentY) > 0.001) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    }

    function kick() { if (!frame) frame = requestAnimationFrame(tick); }

    window.addEventListener('mousemove', onMove, { passive: true });
    kick();

    return function destroy() {
      window.removeEventListener('mousemove', onMove);
      clearTimeout(idle);
      if (frame) cancelAnimationFrame(frame);
    };
  }

  /* -- Tutup loader ---------------------------------------------------- */
  function finish() {
    if (finished) return;
    finished = true;

    clearInterval(monitorId);
    if (rafId) cancelAnimationFrame(rafId);
    if (parallaxCleanup) parallaxCleanup();

    updateProgress(100);
    paint(100);

    try { sessionStorage.setItem('handis-intro', '1'); } catch (err) { /* private mode */ }

    root.classList.remove('has-intro');
    root.classList.add('intro-complete');
    document.body.classList.add('is-loaded');
    loader.classList.add('is-exiting');
    announce();

    window.setTimeout(function () {
      loader.classList.add('is-hidden');
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, reduceMotion ? 0 : 760);
  }

  paint(0);
  monitor();
  monitorId = window.setInterval(monitor, 80);
  rafId = requestAnimationFrame(animateProgress);
  parallaxCleanup = initLoaderParallax();

  /* Jangan pernah menahan halaman tanpa batas. */
  window.setTimeout(function () {
    tasks.forEach(function (task) { task.done = true; });
    updateProgress(100);
    var wait = Math.max(0, MIN_DURATION - (performance.now() - startedAt));
    window.setTimeout(finish, wait + 60);
  }, MAX_DURATION);
})();
