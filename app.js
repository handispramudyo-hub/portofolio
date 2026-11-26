/* ============================================================================
   HANDIS.DEV — APP LOGIC
   ----------------------------------------------------------------------------
   Kamu tidak perlu mengedit file ini untuk menambah konten.
   Semua isi ada di data.js.
   ========================================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------------------- */
  /* 1. HELPERS                                                       */
  /* ---------------------------------------------------------------- */
  var DATA = window.PORTFOLIO || {};

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ESCAPES[ch];
    });
  }

  function getPath(obj, path) {
    return path.split('.').reduce(function (acc, key) {
      return acc == null ? undefined : acc[key];
    }, obj);
  }

  var state = { lab: false, px: 0, py: 0, scroll: 0, heroVisible: true };

  /* ---------------------------------------------------------------- */
  /* 2. PROFILE BINDINGS                                              */
  /* ---------------------------------------------------------------- */
  function applyBindings() {
    $$('[data-bind]').forEach(function (el) {
      var value = getPath(DATA, el.getAttribute('data-bind'));
      if (value !== undefined && value !== null && value !== '') {
        el.textContent = value;
      }
    });

    var profile = DATA.profile || {};

    $$('img[data-profile-photo]').forEach(function (img) {
      if (profile.photo) img.setAttribute('src', profile.photo);
      if (profile.name) img.setAttribute('alt', 'Portrait of ' + profile.name);
    });

    $$('[data-cv]').forEach(function (link) {
      if (profile.cv) link.setAttribute('href', profile.cv);
    });

    var clock = document.getElementById('live-clock');
    if (clock) updateClock();
  }

  /* ---------------------------------------------------------------- */
  /* 3. STATS                                                         */
  /* ---------------------------------------------------------------- */
  function renderStats() {
    var grid = document.getElementById('stats-grid');
    if (!grid) return;

    grid.innerHTML = (DATA.stats || []).map(function (stat, i) {
      return '' +
        '<div class="stat reveal" style="--delay:' + (i * 70) + 'ms">' +
          '<p class="stat-value">' +
            '<span data-count="' + (Number(stat.value) || 0) + '">0</span>' +
            '<span class="suffix">' + esc(stat.suffix || '') + '</span>' +
          '</p>' +
          '<p class="stat-label">' + esc(stat.label) + '</p>' +
        '</div>';
    }).join('');
  }

  /* ---------------------------------------------------------------- */
  /* 4. ABOUT                                                         */
  /* ---------------------------------------------------------------- */
  function renderAbout() {
    var about = DATA.about || {};

    var paragraphs = document.getElementById('about-paragraphs');
    if (paragraphs) {
      paragraphs.innerHTML = (about.paragraphs || []).map(function (text) {
        return '<p>' + esc(text) + '</p>';
      }).join('');
    }

    var traits = document.getElementById('about-traits');
    if (traits) {
      traits.innerHTML = (about.traits || []).map(function (trait) {
        return '<li>' + esc(trait) + '</li>';
      }).join('');
    }

    var facts = document.getElementById('about-facts');
    if (facts) {
      facts.innerHTML = (about.facts || []).map(function (fact) {
        return '' +
          '<div>' +
            '<dt>' + esc(fact.label) + '</dt>' +
            '<dd' + (fact.accent ? ' class="is-accent"' : '') + '>' + esc(fact.value) + '</dd>' +
          '</div>';
      }).join('');
    }
  }

  /* ---------------------------------------------------------------- */
  /* 5. SKILLS                                                        */
  /* ---------------------------------------------------------------- */
  function renderSkills() {
    var skills = DATA.skills || {};

    var grid = document.getElementById('skills-grid');
    if (grid) {
      grid.innerHTML = (skills.capabilities || []).map(function (cap, i) {
        return '' +
          '<article class="cap-card reveal" style="--delay:' + (i % 2) * 80 + 'ms">' +
            '<div class="cap-top">' +
              '<span class="cap-index">' + String(i + 1).padStart(2, '0') + '</span>' +
              '<span class="cap-tag">' + esc(cap.tag || '') + '</span>' +
            '</div>' +
            '<h3 class="cap-title">' + esc(cap.title) + '</h3>' +
            '<p class="cap-desc">' + esc(cap.description) + '</p>' +
          '</article>';
      }).join('');
    }

    var stack = document.getElementById('stack-grid');
    if (stack) {
      stack.innerHTML = (skills.stack || []).map(function (group) {
        return '' +
          '<div class="stack-group">' +
            '<p class="stack-group-label">' + esc(group.group) + '</p>' +
            '<ul class="stack-items">' +
              (group.items || []).map(function (item) {
                return '<li>' + esc(item) + '</li>';
              }).join('') +
            '</ul>' +
          '</div>';
      }).join('');
    }

    var count = document.getElementById('stack-count');
    if (count) {
      var total = (skills.stack || []).reduce(function (sum, group) {
        return sum + (group.items || []).length;
      }, 0);
      count.textContent = total + ' TECHNOLOGIES';
    }
  }

  /* ---------------------------------------------------------------- */
  /* 6. SOCIALS                                                       */
  /* ---------------------------------------------------------------- */
  function renderSocials() {
    var row = document.getElementById('social-row');
    if (!row) return;

    var links = (DATA.socials || []).filter(function (s) { return s && s.url; });
    if (!links.length) {
      var block = row.closest('.social-block');
      if (block) block.hidden = true;
      return;
    }

    row.innerHTML = links.map(function (s) {
      return '<a class="social-chip" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' +
        esc(s.label) + ' <span aria-hidden="true">↗</span></a>';
    }).join('');
  }

  /* ---------------------------------------------------------------- */
  /* 7. FALLBACK SHAPES                                               */
  /* ---------------------------------------------------------------- */
  function shapeMarkup(type) {
    switch (type) {
      case 'ring':
        return '<div class="shape shape-ring"><span></span></div>';
      case 'card':
        return '<div class="shape shape-card"></div>';
      case 'pill':
        return '<div class="shape shape-pill">Aa<span></span></div>';
      case 'cert':
        return '<div class="shape shape-cert"><i></i><i></i><i></i></div>';
      default:
        return '<div class="shape shape-cube"></div>';
    }
  }

  /* ---------------------------------------------------------------- */
  /* 8. PROJECTS                                                      */
  /* ---------------------------------------------------------------- */
  function renderProjects() {
    var grid = document.getElementById('projects-grid');
    if (!grid) return;

    grid.innerHTML = (DATA.projects || []).map(function (project, i) {
      var tags = (project.tags || []).map(function (tag) {
        return '<li class="tag">' + esc(tag) + '</li>';
      }).join('');

      return '' +
        '<article class="project-card reveal" style="--delay:' + (i % 2) * 90 + 'ms">' +
          '<a class="card-link" href="#projects" data-project="' + i + '" ' +
             'aria-label="Open case study: ' + esc(project.title) + '"></a>' +
          '<div class="media media--16x10' + (project.fallbackTheme === 'dark' ? ' media--dark' : '') + '">' +
            '<div class="media-fallback" aria-hidden="true">' + shapeMarkup(project.shape) + '</div>' +
            (project.cover
              ? '<img src="' + esc(project.cover) + '" alt="' + esc(project.title) + ' preview" loading="lazy" decoding="async" data-img>'
              : '') +
            '<span class="card-arrow" aria-hidden="true">↗</span>' +
          '</div>' +
          '<div class="project-body">' +
            '<p class="card-meta">' + esc(project.category) +
              '<span aria-hidden="true">·</span>' + esc(project.year) + '</p>' +
            '<h3 class="project-title">' + esc(project.title) + '</h3>' +
            '<p class="project-summary">' + esc(project.summary) + '</p>' +
            '<ul class="tag-row">' + tags + '</ul>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  /* ---------------------------------------------------------------- */
  /* 9. CERTIFICATES                                                  */
  /* ---------------------------------------------------------------- */
  function renderCertificates() {
    var grid = document.getElementById('cert-grid');
    if (!grid) return;

    grid.innerHTML = (DATA.certificates || []).map(function (cert, i) {
      var meta = [cert.issuer, cert.year].filter(Boolean).join(' · ');
      return '' +
        '<article class="cert-card reveal" style="--delay:' + (i % 3) * 70 + 'ms">' +
          '<a class="card-link" href="#certificates" data-cert="' + i + '" ' +
             'aria-label="View certificate: ' + esc(cert.title) + '"></a>' +
          '<div class="media media--4x3">' +
            '<div class="media-fallback" aria-hidden="true">' + shapeMarkup('cert') + '</div>' +
            (cert.image
              ? '<img src="' + esc(cert.image) + '" alt="' + esc(cert.title) + '" loading="lazy" decoding="async" data-img>'
              : '') +
            '<span class="cert-view">View</span>' +
          '</div>' +
          '<div class="cert-body">' +
            '<h3 class="cert-title">' + esc(cert.title) + '</h3>' +
            '<p class="cert-meta">' + esc(meta) + '</p>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  /* ---------------------------------------------------------------- */
  /* 10. EXPERIENCE                                                   */
  /* ---------------------------------------------------------------- */
  function renderExperience() {
    var list = document.getElementById('experience-list');
    if (!list) return;

    list.innerHTML = (DATA.experience || []).map(function (item, i) {
      return '' +
        '<article class="timeline-row reveal' + (item.current ? ' is-current' : '') + '" ' +
                 'style="--delay:' + (i * 60) + 'ms">' +
          '<p class="timeline-period">' + esc(item.period) + '</p>' +
          '<div class="timeline-main">' +
            '<h3 class="timeline-title">' + esc(item.title) + '</h3>' +
            '<p class="timeline-org">' + esc(item.org) + '</p>' +
          '</div>' +
          '<p class="timeline-note">' + esc(item.note) + '</p>' +
          '<span class="timeline-tag">' + esc(item.tag) + '</span>' +
        '</article>';
    }).join('');
  }

  /* ---------------------------------------------------------------- */
  /* 11. IMAGE FALLBACKS                                              */
  /* ---------------------------------------------------------------- */
  function watchImages(scope) {
    $$('img[data-img], img[data-profile-photo]', scope).forEach(function (img) {
      if (img.dataset.watched) return;
      img.dataset.watched = '1';

      function markMissing() {
        var holder = img.closest('.media') || img.closest('.hero-portrait');
        if (holder) holder.classList.add('is-missing');
        else img.classList.add('is-broken');
      }

      img.addEventListener('error', markMissing);
      img.addEventListener('load', function () {
        var holder = img.closest('.media');
        if (holder) holder.classList.remove('is-missing');
        img.classList.remove('is-broken');
      });
      if (img.complete && img.naturalWidth === 0) markMissing();
    });
  }

  /* ---------------------------------------------------------------- */
  /* 12. REVEAL + COUNTERS                                            */
  /* ---------------------------------------------------------------- */
  function animateCounter(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';

    var target = Number(el.getAttribute('data-count')) || 0;
    if (reduceMotion) { el.textContent = String(target); return; }

    var duration = 1000;
    var start = performance.now();

    function tick(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  var revealObserver = null;

  function initReveals(scope) {
    var nodes = $$('.reveal', scope || document);

    if (reduceMotion || !('IntersectionObserver' in window)) {
      nodes.forEach(function (el) {
        el.classList.add('is-visible');
        $$('[data-count]', el).forEach(animateCounter);
      });
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          $$('[data-count]', entry.target).forEach(animateCounter);
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
    }

    nodes.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------------------------------------------------------------- */
  /* 13. SCROLLSPY                                                    */
  /* ---------------------------------------------------------------- */
  function setActiveSection(id) {
    $$('[data-dock]').forEach(function (link) {
      if (link.getAttribute('data-dock') === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  function initScrollspy() {
    var sections = $$('section[data-nav]');
    if (!sections.length) return;

    if (!('IntersectionObserver' in window)) {
      setActiveSection('home');
      return;
    }

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActiveSection(entry.target.getAttribute('data-nav'));
      });
    }, { rootMargin: '-44% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (section) { spy.observe(section); });
  }

  /* ---------------------------------------------------------------- */
  /* 14. CLOCK                                                        */
  /* ---------------------------------------------------------------- */
  function updateClock() {
    var clock = document.getElementById('live-clock');
    if (!clock) return;

    var profile = DATA.profile || {};
    var city = (profile.city || 'Jakarta').toUpperCase();
    var zone = profile.timezone || 'Asia/Jakarta';
    var label = profile.timezoneLabel || 'GMT+7';
    var time = '';

    try {
      time = new Intl.DateTimeFormat('en-GB', {
        timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false
      }).format(new Date());
    } catch (err) {
      time = new Date().toTimeString().slice(0, 5);
    }

    clock.textContent = city + ' ' + time + ' ' + label;
  }

  /* ---------------------------------------------------------------- */
  /* 15. TYPING ROLES                                                 */
  /* ---------------------------------------------------------------- */
  function initTyping() {
    var el = document.getElementById('role-typing');
    if (!el) return;

    var roles = (DATA.profile && DATA.profile.roles) || [];
    if (!roles.length) return;

    el.textContent = roles[0];
    if (reduceMotion || roles.length < 2) return;

    var roleIndex = 0;
    var charIndex = roles[0].length;
    var deleting = false;

    function step() {
      var word = roles[roleIndex];
      charIndex += deleting ? -1 : 1;
      el.textContent = word.slice(0, charIndex);

      var delay = deleting ? 42 : 78;

      if (!deleting && charIndex >= word.length) {
        delay = 1750;
        deleting = true;
      } else if (deleting && charIndex <= 0) {
        deleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        delay = 320;
      }

      window.setTimeout(step, delay);
    }

    window.setTimeout(function () {
      deleting = true;
      step();
    }, 2100);
  }

  /* ---------------------------------------------------------------- */
  /* 16. BODY SCROLL LOCK                                             */
  /* ---------------------------------------------------------------- */
  var lockCount = 0;

  function lockBody() {
    if (lockCount === 0) {
      var scrollbar = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.setProperty('--sbw', scrollbar + 'px');
      document.body.classList.add('is-locked');
    }
    lockCount += 1;
  }

  function unlockBody() {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.classList.remove('is-locked');
      document.body.style.removeProperty('--sbw');
    }
  }

  /* ---------------------------------------------------------------- */
  /* 17. GENERIC DIALOG                                               */
  /* ---------------------------------------------------------------- */
  function wrap(index, total) {
    return ((index % total) + total) % total;
  }

  function getFocusable(root) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), ' +
             'textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
      .filter(function (node) {
        return node.getClientRects().length > 0 && node.getAttribute('aria-hidden') !== 'true';
      });
  }

  function createDialog(el, opts) {
    opts = opts || {};
    var panel = $('.dialog-panel, .lightbox-panel', el) || el;
    panel.setAttribute('tabindex', '-1');

    var isOpen = false;
    var lastFocus = null;

    function onKey(e) {
      if (opts.onKey && opts.onKey(e) === true) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab') return;

      var focusable = getFocusable(panel);
      if (!focusable.length) {
        e.preventDefault();
        panel.focus();
        return;
      }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function open(trigger) {
      if (isOpen) return;
      isOpen = true;
      lastFocus = trigger || document.activeElement;
      el.hidden = false;
      lockBody();
      document.addEventListener('keydown', onKey);
      requestAnimationFrame(function () { panel.focus(); });
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      el.hidden = true;
      document.removeEventListener('keydown', onKey);
      unlockBody();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      if (opts.onClose) opts.onClose();
    }

    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) {
        e.preventDefault();
        close();
      }
    });

    return { open: open, close: close };
  }

  /* ---------------------------------------------------------------- */
  /* 18. DRAWER                                                       */
  /* ---------------------------------------------------------------- */
  function initDrawer() {
    var drawer = document.getElementById('drawer');
    var scrim = document.getElementById('drawer-scrim');
    if (!drawer || !scrim) return;

    var triggers = $$('.menu-open');
    var closeBtn = $('.drawer-close', drawer);
    var isOpen = false;
    var lastFocus = null;
    var hideTimer = 0;

    function setExpanded(value) {
      triggers.forEach(function (btn) { btn.setAttribute('aria-expanded', String(value)); });
    }

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDrawer();
        return;
      }
      if (e.key !== 'Tab') return;

      var focusable = getFocusable(drawer);
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function openDrawer(trigger) {
      if (isOpen) return;
      isOpen = true;
      lastFocus = trigger || document.activeElement;
      window.clearTimeout(hideTimer);

      drawer.hidden = false;
      scrim.hidden = false;
      void drawer.offsetWidth;
      drawer.classList.add('is-open');
      scrim.classList.add('is-open');

      lockBody();
      setExpanded(true);
      document.addEventListener('keydown', onKey);
      requestAnimationFrame(function () { if (closeBtn) closeBtn.focus(); });
    }

    function closeDrawer() {
      if (!isOpen) return;
      isOpen = false;

      drawer.classList.remove('is-open');
      scrim.classList.remove('is-open');
      setExpanded(false);
      document.removeEventListener('keydown', onKey);
      unlockBody();

      hideTimer = window.setTimeout(function () {
        drawer.hidden = true;
        scrim.hidden = true;
      }, 430);

      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    triggers.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (isOpen) closeDrawer();
        else openDrawer(btn);
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    scrim.addEventListener('click', closeDrawer);

    $$('a', drawer).forEach(function (link) {
      link.addEventListener('click', closeDrawer);
    });

    $$('[data-lab-open]', drawer).forEach(function (btn) {
      btn.addEventListener('click', closeDrawer);
    });
  }

  /* ---------------------------------------------------------------- */
  /* 19. PROJECT MODAL + GALLERY                                      */
  /* ---------------------------------------------------------------- */
  var galleryState = { images: [], index: 0 };
  var projectDialog = null;

  function galleryMarkup(images, shape) {
    var count = images.length;
    var thumbs = images.map(function (image, i) {
      return '<button class="gallery-thumb" type="button" data-goto="' + i + '" ' +
             'aria-current="' + (i === 0 ? 'true' : 'false') + '" ' +
             'aria-label="Show image ' + (i + 1) + '">' +
               '<img src="' + esc(image.src) + '" alt="" loading="lazy" decoding="async" data-img>' +
             '</button>';
    }).join('');

    return '' +
      '<div class="gallery">' +
        '<div class="gallery-main media media--16x10">' +
          '<div class="media-fallback" aria-hidden="true">' + shapeMarkup(shape) + '</div>' +
          '<img id="gallery-img" src="' + esc(images[0].src) + '" alt="' + esc(images[0].alt) + '" data-img decoding="async">' +
          '<span class="gallery-count" id="gallery-count">1 / ' + count + '</span>' +
          '<button class="gallery-btn gallery-prev" type="button" data-gallery="-1" aria-label="Previous image"' +
            (count < 2 ? ' hidden' : '') + '>‹</button>' +
          '<button class="gallery-btn gallery-next" type="button" data-gallery="1" aria-label="Next image"' +
            (count < 2 ? ' hidden' : '') + '>›</button>' +
        '</div>' +
        (count > 1 ? '<div class="gallery-thumbs">' + thumbs + '</div>' : '') +
      '</div>';
  }

  function setGallery(index) {
    var total = galleryState.images.length;
    if (!total) return;

    galleryState.index = wrap(index, total);
    var image = galleryState.images[galleryState.index];
    var img = document.getElementById('gallery-img');
    var counter = document.getElementById('gallery-count');

    if (img) {
      var holder = img.closest('.media');
      if (holder) holder.classList.remove('is-missing');
      img.setAttribute('src', image.src);
      img.setAttribute('alt', image.alt);
    }
    if (counter) counter.textContent = (galleryState.index + 1) + ' / ' + total;

    $$('[data-goto]').forEach(function (thumb) {
      thumb.setAttribute('aria-current', String(Number(thumb.getAttribute('data-goto')) === galleryState.index));
    });
  }

  function openProject(index, trigger) {
    var project = (DATA.projects || [])[index];
    if (!project || !projectDialog) return;

    var images = [];
    if (project.cover) images.push({ src: project.cover, alt: project.title });
    (project.gallery || []).forEach(function (src, i) {
      images.push({ src: src, alt: project.title + ' screenshot ' + (i + 1) });
    });

    galleryState.images = images;
    galleryState.index = 0;

    var body = document.getElementById('project-modal-body');
    if (!body) return;

    var links = '';
    if (project.links && project.links.demo) {
      links += '<a class="btn btn-dark btn-sm" href="' + esc(project.links.demo) + '" target="_blank" rel="noopener noreferrer">Live demo ↗</a>';
    }
    if (project.links && project.links.repo) {
      links += '<a class="btn btn-ghost btn-sm" href="' + esc(project.links.repo) + '" target="_blank" rel="noopener noreferrer">Source code ↗</a>';
    }

    body.innerHTML = '' +
      '<div class="case-head">' +
        '<p class="card-meta">' + esc(project.category) + '<span aria-hidden="true">·</span>' + esc(project.year) + '</p>' +
        '<h2 class="case-title" id="project-modal-title">' + esc(project.title) + '</h2>' +
        '<p class="case-summary">' + esc(project.summary) + '</p>' +
      '</div>' +
      (images.length ? galleryMarkup(images, project.shape || 'cube') : '') +
      '<div class="case-details">' +
        (project.details || []).map(function (detail) {
          return '<div class="case-detail">' +
            '<h3>' + esc(detail.label) + '</h3>' +
            '<p>' + esc(detail.text) + '</p>' +
          '</div>';
        }).join('') +
      '</div>' +
      (project.tags && project.tags.length
        ? '<ul class="tag-row case-tags">' + project.tags.map(function (tag) {
            return '<li class="tag">' + esc(tag) + '</li>';
          }).join('') + '</ul>'
        : '') +
      (links ? '<div class="case-links">' + links + '</div>' : '');

    watchImages(body);
    projectDialog.open(trigger);
  }

  function initProjectModal() {
    var el = document.getElementById('project-modal');
    if (!el) return;

    projectDialog = createDialog(el, {
      onKey: function (e) {
        if (galleryState.images.length < 2) return false;
        if (e.key === 'ArrowRight') { setGallery(galleryState.index + 1); return true; }
        if (e.key === 'ArrowLeft') { setGallery(galleryState.index - 1); return true; }
        return false;
      }
    });

    var body = document.getElementById('project-modal-body');
    if (body) {
      body.addEventListener('click', function (e) {
        var step = e.target.closest('[data-gallery]');
        if (step) {
          setGallery(galleryState.index + Number(step.getAttribute('data-gallery')));
          return;
        }
        var goTo = e.target.closest('[data-goto]');
        if (goTo) setGallery(Number(goTo.getAttribute('data-goto')));
      });
    }

    var grid = document.getElementById('projects-grid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        var link = e.target.closest('[data-project]');
        if (!link) return;
        e.preventDefault();
        openProject(Number(link.getAttribute('data-project')), link);
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /* 20. CERTIFICATE LIGHTBOX                                         */
  /* ---------------------------------------------------------------- */
  var lightboxItems = [];
  var lightboxIndex = 0;
  var lightboxDialog = null;

  function setLightboxZoom(on) {
    var stage = document.getElementById('lb-stage');
    var button = $('[data-zoom]');
    if (!stage) return;
    stage.classList.toggle('is-zoomed', on);
    if (button) button.setAttribute('aria-pressed', String(on));
  }

  function renderLightbox() {
    var item = lightboxItems[lightboxIndex];
    if (!item) return;

    var stage = document.getElementById('lb-stage');
    var img = document.getElementById('lb-img');
    var title = document.getElementById('lb-title');
    var meta = document.getElementById('lb-meta');
    var counter = document.getElementById('lb-count');
    var credential = document.getElementById('lb-credential');
    var prev = document.getElementById('lb-prev');
    var next = document.getElementById('lb-next');

    setLightboxZoom(false);

    if (title) title.textContent = item.title;
    if (meta) meta.textContent = [item.issuer, item.year].filter(Boolean).join(' · ');
    if (counter) counter.textContent = (lightboxIndex + 1) + ' / ' + lightboxItems.length;

    if (img) {
      if (item.image) {
        if (stage) stage.classList.remove('is-missing');
        img.hidden = false;
        if (img.getAttribute('src') !== item.image) img.setAttribute('src', item.image);
        img.setAttribute('alt', item.title + ' certificate');
      } else {
        if (stage) stage.classList.add('is-missing');
        img.hidden = true;
        img.removeAttribute('src');
      }
    }

    if (credential) {
      if (item.credential) {
        credential.hidden = false;
        credential.setAttribute('href', item.credential);
      } else {
        credential.hidden = true;
        credential.removeAttribute('href');
      }
    }

    var multiple = lightboxItems.length > 1;
    if (prev) prev.hidden = !multiple;
    if (next) next.hidden = !multiple;
  }

  function stepLightbox(direction) {
    if (lightboxItems.length < 2) return;
    lightboxIndex = wrap(lightboxIndex + direction, lightboxItems.length);
    renderLightbox();
  }

  function openLightbox(index, trigger) {
    lightboxItems = DATA.certificates || [];
    if (!lightboxItems[index] || !lightboxDialog) return;
    lightboxIndex = index;
    renderLightbox();
    lightboxDialog.open(trigger);
  }

  function initLightbox() {
    var el = document.getElementById('lightbox');
    if (!el) return;

    lightboxDialog = createDialog(el, {
      onKey: function (e) {
        if (e.key === 'ArrowRight') { stepLightbox(1); return true; }
        if (e.key === 'ArrowLeft') { stepLightbox(-1); return true; }
        if (e.key.toLowerCase() === 'z') {
          var stage = document.getElementById('lb-stage');
          setLightboxZoom(!stage.classList.contains('is-zoomed'));
          return true;
        }
        return false;
      },
      onClose: function () { setLightboxZoom(false); }
    });

    var prev = document.getElementById('lb-prev');
    var next = document.getElementById('lb-next');
    var zoom = $('[data-zoom]', el);
    var img = document.getElementById('lb-img');
    var stage = document.getElementById('lb-stage');

    if (prev) prev.addEventListener('click', function () { stepLightbox(-1); });
    if (next) next.addEventListener('click', function () { stepLightbox(1); });
    if (zoom) zoom.addEventListener('click', function () {
      setLightboxZoom(!stage.classList.contains('is-zoomed'));
    });
    if (img) {
      img.addEventListener('click', function () {
        setLightboxZoom(!stage.classList.contains('is-zoomed'));
      });
      img.addEventListener('load', function () {
        if (stage) stage.classList.remove('is-missing');
      });
      img.addEventListener('error', function () {
        if (stage) stage.classList.add('is-missing');
      });
    }

    var grid = document.getElementById('cert-grid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        var link = e.target.closest('[data-cert]');
        if (!link) return;
        e.preventDefault();
        openLightbox(Number(link.getAttribute('data-cert')), link);
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /* 21. TOAST + COPY EMAIL                                           */
  /* ---------------------------------------------------------------- */
  var toastTimer = 0;

  function showToast(message) {
    var toast = document.getElementById('toast');
    var text = document.getElementById('toast-text');
    if (!toast || !text) return;

    text.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 2800);
  }

  function legacyCopy(value) {
    var field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.top = '-1000px';
    document.body.appendChild(field);
    field.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    document.body.removeChild(field);
    return ok;
  }

  function initCopyEmail() {
    var button = document.getElementById('copy-email');
    if (!button) return;

    button.addEventListener('click', function () {
      var email = (DATA.profile && DATA.profile.email) || '';
      if (!email) return;

      function done() { showToast('Copied: ' + email); }
      function failed() { showToast('Email: ' + email); }

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email).then(done, function () {
          if (legacyCopy(email)) done(); else failed();
        });
      } else if (legacyCopy(email)) {
        done();
      } else {
        failed();
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* 22. CONTACT FORM                                                 */
  /* ---------------------------------------------------------------- */
  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    var status = document.getElementById('cf-status');
    var submit = document.getElementById('cf-submit');
    var email = (DATA.profile && DATA.profile.email) || 'hello@handis.dev';
    var fields = ['name', 'email', 'subject', 'message'];

    function setError(name, message) {
      var input = form.elements[name];
      if (!input) return;
      var field = input.closest('.field');
      if (field) field.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      var error = document.getElementById('cf-' + name + '-error');
      if (error) {
        error.textContent = message;
        input.setAttribute('aria-describedby', error.id);
      }
    }

    function clearError(name) {
      var input = form.elements[name];
      if (!input) return;
      var field = input.closest('.field');
      if (field) field.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
      var error = document.getElementById('cf-' + name + '-error');
      if (error) {
        error.textContent = '';
        input.removeAttribute('aria-describedby');
      }
    }

    fields.forEach(function (name) {
      var input = form.elements[name];
      if (input) input.addEventListener('input', function () { clearError(name); });
    });

    // On phones the floating dock can sit over the field being typed into
    // (especially with the keyboard open). Step it out of the way.
    form.addEventListener('focusin', function () {
      document.body.classList.add('is-typing');
    });
    form.addEventListener('focusout', function (event) {
      if (!form.contains(event.relatedTarget)) document.body.classList.remove('is-typing');
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      fields.forEach(clearError);

      var values = {
        name: String(form.elements.name.value || '').trim(),
        email: String(form.elements.email.value || '').trim(),
        subject: String(form.elements.subject.value || '').trim(),
        message: String(form.elements.message.value || '').trim(),
        botcheck: form.elements.botcheck ? form.elements.botcheck.checked : false
      };

      var valid = true;
      if (values.name.length < 2) { setError('name', 'Please enter your name.'); valid = false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) {
        setError('email', 'Please enter a valid email address.'); valid = false;
      }
      if (values.subject.length < 3) { setError('subject', 'Please add a short subject.'); valid = false; }
      if (values.message.length < 10) { setError('message', 'Please write at least 10 characters.'); valid = false; }

      if (!valid) {
        status.textContent = 'Please fix the highlighted fields and try again.';
        status.setAttribute('data-state', 'error');
        var firstInvalid = $('.field.is-invalid input, .field.is-invalid textarea', form);
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Honeypot: bots fill hidden fields.
      if (values.botcheck) { form.reset(); return; }

      var key = (DATA.contact && DATA.contact.accessKey) || '';
      var configured = key && !/^YOUR_/i.test(key) && key.length > 10;

      if (!configured) {
        status.innerHTML = 'The form is not connected yet. Please email me directly at ' +
          '<a href="mailto:' + esc(email) + '">' + esc(email) + '</a>.';
        status.setAttribute('data-state', 'error');
        return;
      }

      submit.disabled = true;
      submit.setAttribute('data-loading', 'true');
      status.textContent = 'Sending your message…';
      status.setAttribute('data-state', 'loading');

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: key,
          subject: 'Portfolio enquiry — ' + values.subject,
          from_name: (DATA.profile && DATA.profile.name) || 'Portfolio contact form',
          name: values.name,
          email: values.email,
          message: values.message,
          botcheck: false
        })
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (json) {
          return { ok: response.ok, json: json };
        });
      }).then(function (result) {
        if (!result.ok || !result.json.success) throw new Error(result.json.message || 'Request failed');
        form.reset();
        status.textContent = 'Thanks, ' + values.name + '! Your message is on its way.';
        status.setAttribute('data-state', 'success');
        showToast('Message sent successfully');
      }).catch(function () {
        status.innerHTML = 'Something went wrong while sending. Please email me at ' +
          '<a href="mailto:' + esc(email) + '">' + esc(email) + '</a>.';
        status.setAttribute('data-state', 'error');
      }).finally(function () {
        submit.disabled = false;
        submit.removeAttribute('data-loading');
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* 23. POINTER PARALLAX (PORTRAIT TILT)                             */
  /* ---------------------------------------------------------------- */
  function initParallax() {
    var portrait = document.getElementById('hero-portrait');
    var scheduled = false;

    window.addEventListener('pointermove', function (event) {
      state.px = (event.clientX / window.innerWidth) * 2 - 1;
      state.py = (event.clientY / window.innerHeight) * 2 - 1;

      if (!portrait || reduceMotion || state.lab || scheduled) return;
      scheduled = true;

      window.requestAnimationFrame(function () {
        scheduled = false;
        portrait.style.transform =
          'perspective(900px) rotateY(' + (state.px * 5).toFixed(2) + 'deg) ' +
          'rotateX(' + (-state.py * 4).toFixed(2) + 'deg)';
      });
    }, { passive: true });
  }

  /* ---------------------------------------------------------------- */
  /* 24. 3D LAB MODE                                                  */
  /* ---------------------------------------------------------------- */
  var propsApi = null;

  function setLabMode(on) {
    if (on && !propsApi) return;

    state.lab = on;
    document.body.classList.toggle('lab-mode', on);

    var bar = document.getElementById('lab-bar');
    if (bar) bar.hidden = !on;

    if (propsApi) propsApi.setLab(on);

    if (on && !reduceMotion) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (on) {
      window.scrollTo(0, 0);
    }
  }

  function initLabMode() {
    $$('[data-lab-open]').forEach(function (button) {
      button.addEventListener('click', function () { setLabMode(true); });
    });

    var exit = document.getElementById('lab-exit');
    if (exit) exit.addEventListener('click', function () { setLabMode(false); });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && state.lab && !document.body.classList.contains('is-locked')) {
        setLabMode(false);
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* 25. THREE.JS — AMBIENT STUDIO PROPS                              */
  /* ---------------------------------------------------------------- */
  function initPropsScene() {
    if (reduceMotion) {
      var idleCanvas = document.getElementById('props-canvas');
      if (idleCanvas && idleCanvas.parentNode) idleCanvas.parentNode.removeChild(idleCanvas);
      return null;
    }

    var THREE = window.THREE;
    var canvas = document.getElementById('props-canvas');
    if (!THREE || !canvas) return null;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (err) {
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      return null;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    /* Studio environment for believable chrome reflections */
    var pmrem = new THREE.PMREMGenerator(renderer);
    var envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0xF2EEE7);

    var panelGeo = new THREE.PlaneGeometry(1, 1);
    function addPanel(hex, intensity, position, scale, rotation) {
      var material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(hex).multiplyScalar(intensity)
      });
      var mesh = new THREE.Mesh(panelGeo, material);
      mesh.position.set(position[0], position[1], position[2]);
      mesh.scale.set(scale[0], scale[1], 1);
      mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
      envScene.add(mesh);
    }

    addPanel(0xffffff, 2.4, [0, 7, 0], [18, 18], [-Math.PI / 2, 0, 0]);
    addPanel(0xffd9bd, 1.7, [-8, 1, 2], [10, 10], [0, Math.PI / 2, 0]);
    addPanel(0xccd9ff, 0.9, [8, 2, -1], [8, 12], [0, -Math.PI / 2, 0]);
    addPanel(0x1b1a19, 0.6, [0, -7, 0], [18, 18], [Math.PI / 2, 0, 0]);
    addPanel(0xffffff, 1.0, [0, 1, 9], [12, 12], [0, Math.PI, 0]);

    scene.environment = pmrem.fromScene(envScene, 0.05).texture;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0xffffff, 0xe8dfd5, 0.55));

    var keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(6, 8, 8);
    scene.add(keyLight);

    var rimLight = new THREE.DirectionalLight(0xffd9bd, 0.7);
    rimLight.position.set(-8, 3, -4);
    scene.add(rimLight);

    var chromeMat = new THREE.MeshStandardMaterial({
      color: 0xF7F5F1,
      metalness: 0.98,
      roughness: 0.09,
      envMapIntensity: 1.5
    });

    var orangeMat = new THREE.MeshPhysicalMaterial({
      color: 0xFF5500,
      roughness: 0.24,
      metalness: 0.06,
      clearcoat: 0.9,
      clearcoatRoughness: 0.16,
      envMapIntensity: 1.2
    });

    /* Curly brace */
    function createBrace(mirror) {
      var shape = new THREE.Shape();
      var s = mirror ? -1 : 1;

      shape.moveTo(0.28 * s, 0.95);
      shape.bezierCurveTo(0.05 * s, 0.95, 0.02 * s, 0.78, 0.02 * s, 0.52);
      shape.bezierCurveTo(0.02 * s, 0.22, -0.05 * s, 0.08, -0.24 * s, 0);
      shape.bezierCurveTo(-0.05 * s, -0.08, 0.02 * s, -0.22, 0.02 * s, -0.52);
      shape.bezierCurveTo(0.02 * s, -0.78, 0.05 * s, -0.95, 0.28 * s, -0.95);
      shape.lineTo(0.28 * s, -0.76);
      shape.bezierCurveTo(0.18 * s, -0.76, 0.16 * s, -0.66, 0.16 * s, -0.45);
      shape.bezierCurveTo(0.16 * s, -0.18, 0.10 * s, -0.06, -0.04 * s, 0);
      shape.bezierCurveTo(0.10 * s, 0.06, 0.16 * s, 0.18, 0.16 * s, 0.45);
      shape.bezierCurveTo(0.16 * s, 0.66, 0.18 * s, 0.76, 0.28 * s, 0.76);
      shape.closePath();

      var geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.22,
        bevelEnabled: true,
        bevelSegments: 5,
        steps: 1,
        bevelSize: 0.045,
        bevelThickness: 0.045
      });
      geometry.center();

      return new THREE.Mesh(geometry, chromeMat);
    }

    var propsGroup = new THREE.Group();
    scene.add(propsGroup);

    var braceGroup = new THREE.Group();
    var leftBrace = createBrace(false);
    leftBrace.position.x = -0.34;
    var rightBrace = createBrace(true);
    rightBrace.position.x = 0.34;
    braceGroup.add(leftBrace, rightBrace);
    braceGroup.rotation.set(0.22, -0.35, -0.18);
    propsGroup.add(braceGroup);

    /* Rounded orange keycap */
    var size = 0.78;
    var radius = 0.18;
    var rounded = new THREE.Shape();
    rounded.moveTo(-size / 2 + radius, -size / 2);
    rounded.lineTo(size / 2 - radius, -size / 2);
    rounded.quadraticCurveTo(size / 2, -size / 2, size / 2, -size / 2 + radius);
    rounded.lineTo(size / 2, size / 2 - radius);
    rounded.quadraticCurveTo(size / 2, size / 2, size / 2 - radius, size / 2);
    rounded.lineTo(-size / 2 + radius, size / 2);
    rounded.quadraticCurveTo(-size / 2, size / 2, -size / 2, size / 2 - radius);
    rounded.lineTo(-size / 2, -size / 2 + radius);
    rounded.quadraticCurveTo(-size / 2, -size / 2, -size / 2 + radius, -size / 2);

    var keycapGeo = new THREE.ExtrudeGeometry(rounded, {
      depth: 0.56,
      bevelEnabled: true,
      bevelSegments: 7,
      steps: 1,
      bevelSize: 0.09,
      bevelThickness: 0.09
    });
    keycapGeo.center();

    var keycap = new THREE.Mesh(keycapGeo, orangeMat);
    keycap.rotation.set(0.35, 0.45, -0.22);
    propsGroup.add(keycap);

    /* Layout */
    var target = { bx: 0, by: 0, bs: 0.82, kx: 0, ky: 0, ks: 0.8 };
    var current = { bx: 0, by: 0, bs: 0.82, kx: 0, ky: 0, ks: 0.8 };

    function computeLayout() {
      var halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z;
      var halfW = halfH * camera.aspect;
      var mobile = window.innerWidth < 768;

      if (state.lab) {
        target = { bx: -0.95, by: 0.15, bs: 1.35, kx: 0.95, ky: -0.2, ks: 1.3 };
      } else if (mobile) {
        target = {
          bx: halfW - 0.52, by: halfH - 0.7, bs: 0.5,
          kx: -halfW + 0.52, ky: -halfH + 0.72, ks: 0.46
        };
      } else {
        target = {
          bx: halfW - 1.02, by: halfH - 1.15, bs: 0.82,
          kx: -halfW + 0.9, ky: -halfH + 1.0, ks: 0.8
        };
      }
    }

    function resize() {
      var width = window.innerWidth;
      var height = window.innerHeight;
      var dpr = Math.min(window.devicePixelRatio || 1, width < 768 ? 1.5 : 2);

      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      computeLayout();
    }

    resize();

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 160);
    });

    /* Drag to rotate (3D Lab) */
    var drag = { active: false, lastX: 0, lastY: 0, rotX: 0, rotY: 0 };

    window.addEventListener('pointerdown', function (event) {
      if (!state.lab) return;
      if (event.target.closest('button, a, input, textarea, select, .lab-bar')) return;
      drag.active = true;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
    });

    window.addEventListener('pointermove', function (event) {
      if (!drag.active) return;
      drag.rotY += (event.clientX - drag.lastX) * 0.006;
      drag.rotX += (event.clientY - drag.lastY) * 0.004;
      drag.rotX = Math.max(-0.9, Math.min(0.9, drag.rotX));
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
    });

    function endDrag() { drag.active = false; }
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    /* Pause when hero is off-screen */
    var hero = document.getElementById('home');
    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        state.heroVisible = entries[0].isIntersecting;
      }, { threshold: 0 }).observe(hero);
    }

    var clock = new THREE.Clock();
    var lastOpacity = 1;

    function frame() {
      window.requestAnimationFrame(frame);
      if (document.hidden) return;
      if (!state.heroVisible && !state.lab) return;

      var t = clock.getElapsedTime();

      current.bx += (target.bx - current.bx) * 0.075;
      current.by += (target.by - current.by) * 0.075;
      current.bs += (target.bs - current.bs) * 0.075;
      current.kx += (target.kx - current.kx) * 0.075;
      current.ky += (target.ky - current.ky) * 0.075;
      current.ks += (target.ks - current.ks) * 0.075;

      braceGroup.position.set(current.bx, current.by, 0);
      braceGroup.scale.setScalar(current.bs);
      keycap.position.set(current.kx, current.ky, 0);
      keycap.scale.setScalar(current.ks);

      if (state.lab) {
        if (!drag.active) drag.rotY += 0.0016;
        propsGroup.rotation.y = drag.rotY;
        propsGroup.rotation.x = drag.rotX;
      } else {
        propsGroup.rotation.y += (0 - propsGroup.rotation.y) * 0.08;
        propsGroup.rotation.x += (0 - propsGroup.rotation.x) * 0.08;
      }

      braceGroup.rotation.x = 0.22 + Math.cos(t * 0.8) * 0.07 - state.py * 0.12;
      braceGroup.rotation.y = -0.35 + Math.sin(t * 0.9) * 0.12 + state.px * 0.22;
      braceGroup.rotation.z = -0.18;

      keycap.rotation.x = 0.35 + Math.sin(t * 1.1) * 0.1 - state.py * 0.2;
      keycap.rotation.y = 0.45 + Math.cos(t * 0.95) * 0.12 + state.px * 0.22;
      keycap.rotation.z = -0.22;

      var opacity = state.lab ? 1 : Math.max(0.16, 1 - state.scroll / 900);
      if (Math.abs(opacity - lastOpacity) > 0.01) {
        canvas.style.opacity = opacity.toFixed(2);
        lastOpacity = opacity;
      }

      renderer.render(scene, camera);
    }

    window.requestAnimationFrame(frame);

    return {
      setLab: function (on) {
        if (!on) { drag.rotX = 0; drag.rotY = 0; }
        computeLayout();
      }
    };
  }

  /* ---------------------------------------------------------------- */
  /* 26. THREE.JS LAZY LOAD                                           */
  /* ---------------------------------------------------------------- */
  function setLabReady(ready) {
    $$('[data-lab-open]').forEach(function (btn) { btn.hidden = !ready; });
  }

  function bootProps() {
    try {
      propsApi = initPropsScene();
    } catch (err) {
      propsApi = null;
    }
    setLabReady(!!propsApi);
  }

  function initProps() {
    if (reduceMotion) {
      initPropsScene(); // removes the idle canvas
      setLabReady(false);
      return;
    }

    if (window.THREE) {
      bootProps();
      return;
    }

    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.async = true;
    script.onload = bootProps;
    script.onerror = function () { setLabReady(false); };
    document.head.appendChild(script);
  }

  /* ---------------------------------------------------------------- */
  /* 27. SCROLL STATE                                                 */
  /* ---------------------------------------------------------------- */
  function initScrollState() {
    function update() {
      state.scroll = window.scrollY || window.pageYOffset || 0;
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---------------------------------------------------------------- */
  /* 28. BOOT                                                         */
  /* ---------------------------------------------------------------- */
  function boot() {
    applyBindings();

    renderStats();
    renderAbout();
    renderSkills();
    renderProjects();
    renderCertificates();
    renderExperience();
    renderSocials();

    watchImages(document);

    initReveals();
    initScrollspy();
    initScrollState();
    initDrawer();
    initProjectModal();
    initLightbox();
    initCopyEmail();
    initContactForm();
    initParallax();
    initLabMode();
    initTyping();

    window.setInterval(updateClock, 15000);

    // Keep the first paint cheap: pull Three.js in only after the page is idle.
    window.setTimeout(initProps, 260);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
