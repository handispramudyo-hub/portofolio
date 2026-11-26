/* ==========================================================================
   HANDIS.DEV — HERO DECORATION PARALLAX
   Ringan, vanilla JS, bisa di-destroy. Tidak dipakai di mobile/reduced motion.
   ========================================================================== */

(function () {
  'use strict';

  var layer = document.querySelector('.hero-decor');
  if (!layer) return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var started = false;
  var frame = 0;
  var idleTimer = 0;
  var items = [];
  var mouseX = 0, mouseY = 0, currentX = 0, currentY = 0;
  var onMove = null, onVisibility = null;

  function buildItems() {
    return Array.prototype.slice.call(layer.querySelectorAll('.decor-item'))
      .filter(function (el) {
        return getComputedStyle(el).display !== 'none';
      })
      .map(function (el) {
        return {
          el: el,
          depth: Number(el.getAttribute('data-depth')) || 10,
          rotate: Number(el.getAttribute('data-rotate')) || 5
        };
      });
  }

  function tick() {
    currentX += (mouseX - currentX) * 0.1;
    currentY += (mouseY - currentY) * 0.1;

    items.forEach(function (item) {
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

  function kick() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function start() {
    if (started || reduceMotion || !finePointer || window.innerWidth <= 720) return;
    started = true;

    items = buildItems();
    if (!items.length) return;

    onMove = function (event) {
      mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
      clearTimeout(idleTimer);
      idleTimer = window.setTimeout(function () {
        mouseX = 0;
        mouseY = 0;
        kick();
      }, 260);
      kick();
    };

    onVisibility = function () {
      if (document.hidden) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      } else {
        kick();
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
  }

  function destroy() {
    if (onMove) window.removeEventListener('mousemove', onMove);
    if (onVisibility) document.removeEventListener('visibilitychange', onVisibility);
    clearTimeout(idleTimer);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    onMove = null;
    onVisibility = null;
    items.forEach(function (item) { item.el.style.transform = ''; });
    items = [];
    started = false;
  }

  window.HandisHeroDecor = {
    start: start,
    destroy: destroy
  };

  window.addEventListener('pagehide', destroy, { once: true });

  if (document.body.classList.contains('is-loaded')) {
    window.setTimeout(start, 120);
  } else {
    window.addEventListener('handis:intro-complete', function () {
      window.setTimeout(start, 120);
    }, { once: true });
  }
})();
