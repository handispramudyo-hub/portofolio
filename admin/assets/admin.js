/* ==========================================================================
   ADMIN APP — Handis.dev Content Manager
   Vanilla JS, no build step.
   ========================================================================== */
(function () {
  'use strict';

  var ADMIN = window.ADMIN || {};
  var CURRENT_YEAR = new Date().getFullYear();

  var state = {
    data: null,
    meta: {},
    section: 'overview',
    dirty: false,
    saving: false
  };

  /* ------------------------------------------------------------------ */
  /* DOM helpers                                                        */
  /* ------------------------------------------------------------------ */
  var uidCounter = 0;
  function uid(prefix) {
    uidCounter += 1;
    return (prefix || 'f') + '-' + uidCounter;
  }

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);

    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined || value === false) return;

        if (key === 'class') {
          node.className = value;
        } else if (key === 'text') {
          node.textContent = value;
        } else if (key === 'dataset') {
          Object.keys(value).forEach(function (dataKey) {
            node.dataset[dataKey] = value[dataKey];
          });
        } else if (key.slice(0, 2) === 'on' && typeof value === 'function') {
          node.addEventListener(key.slice(2), value);
        } else if (value === true) {
          node.setAttribute(key, '');
        } else {
          node.setAttribute(key, String(value));
        }
      });
    }

    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (child) {
        if (child === null || child === undefined || child === false) return;
        node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
      });
    }

    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function toast(message, tone) {
    var node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.dataset.tone = tone || 'ok';
    node.hidden = false;
    window.requestAnimationFrame(function () {
      node.classList.add('is-visible');
    });
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(function () {
      node.classList.remove('is-visible');
      window.setTimeout(function () { node.hidden = true; }, 240);
    }, tone === 'error' ? 5200 : 2800);
  }

  /* ------------------------------------------------------------------ */
  /* State / save bar                                                   */
  /* ------------------------------------------------------------------ */
  function updateSaveState() {
    var savebar = $('#savebar');
    var badge = $('#save-state');
    var saveBtn = $('#save-btn');
    var text = $('#savebar-text');

    if (!savebar) return;

    savebar.hidden = !state.dirty && !state.saving;
    saveBtn.disabled = state.saving;

    if (badge) {
      if (state.saving) {
        badge.dataset.state = 'saving';
        badge.textContent = 'Menyimpan…';
      } else if (state.dirty) {
        badge.dataset.state = 'dirty';
        badge.textContent = 'Belum disimpan';
      } else {
        badge.dataset.state = 'saved';
        badge.textContent = 'Tersimpan';
      }
    }

    if (text) {
      text.textContent = state.saving ? 'Menyimpan perubahan…' : 'Ada perubahan yang belum disimpan.';
    }

    document.title = (state.dirty ? '● ' : '') + 'Admin — ' + (ADMIN.siteName || 'Handis.dev');
  }

  function markDirty() {
    if (state.dirty) return;
    state.dirty = true;
    updateSaveState();
  }

  /* ------------------------------------------------------------------ */
  /* API                                                                */
  /* ------------------------------------------------------------------ */
  function api(action, options) {
    options = options || {};

    var base = (window.ADMIN && typeof window.ADMIN.base === 'string') ? window.ADMIN.base : '';
    var url = base + '/api.php?action=' + encodeURIComponent(action);
    if (options.query) {
      Object.keys(options.query).forEach(function (key) {
        url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(options.query[key]);
      });
    }

    var headers = { 'X-CSRF-Token': ADMIN.csrf || '' };
    var body;

    if (options.formData) {
      body = options.formData;
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    return fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: headers,
      body: body,
      credentials: 'same-origin'
    }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (json) {
        if (response.status === 401) {
          window.location.href = base + '/index.php';
          throw new Error('Sesi berakhir. Silakan login ulang.');
        }
        if (!response.ok) {
          throw new Error((json && json.error) || 'Terjadi kesalahan (' + response.status + ').');
        }
        return json;
      });
    });
  }

  function uploadFile(file, kind) {
    if (!file) return Promise.reject(new Error('Tidak ada file.'));
    if (state.meta.maxUpload && file.size > state.meta.maxUpload) {
      return Promise.reject(new Error('File terlalu besar. Maksimal ' + (state.meta.maxUploadLabel || '10 MB') + '.'));
    }

    var formData = new FormData();
    formData.append('file', file);

    return api('upload', { formData: formData, query: { kind: kind } })
      .then(function (json) { return json.file; });
  }

  /* ------------------------------------------------------------------ */
  /* Schema                                                             */
  /* ------------------------------------------------------------------ */
  var SECTIONS = [
    { id: 'overview', label: 'Ringkasan' },
    { id: 'profile', label: 'Profil & Foto' },
    { id: 'stats', label: 'Statistik' },
    { id: 'about', label: 'Tentang' },
    { id: 'skills', label: 'Skills' },
    { id: 'projects', label: 'Project' },
    { id: 'certificates', label: 'Sertifikat' },
    { id: 'experience', label: 'Pengalaman' },
    { id: 'socials', label: 'Sosial' },
    { id: 'contact', label: 'Kontak' },
    { id: 'footer', label: 'Footer' },
    { id: 'settings', label: 'Pengaturan' }
  ];

  var PROFILE_FIELDS = [
    { key: 'name', label: 'Nama lengkap', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { key: 'firstName', label: 'Nama depan', type: 'text' },
        { key: 'lastName', label: 'Nama belakang', type: 'text' }
      ]
    },
    { key: 'brand', label: 'Nama brand', type: 'text', help: 'Tampil di header & footer, misalnya Handis.dev' },
    { key: 'roles', label: 'Peran di hero', type: 'tags', help: 'Pisahkan dengan koma. Teks ini berganti-ganti dengan efek mengetik.' },
    {
      type: 'row',
      fields: [
        { key: 'status', label: 'Status', type: 'text' },
        { key: 'availability', label: 'Ketersediaan', type: 'text' }
      ]
    },
    {
      type: 'row',
      class: 'three',
      fields: [
        { key: 'city', label: 'Kota', type: 'text' },
        { key: 'timezone', label: 'Zona waktu', type: 'text', help: 'mis. Asia/Jakarta' },
        { key: 'timezoneLabel', label: 'Label zona waktu', type: 'text', help: 'mis. GMT+7' }
      ]
    },
    { key: 'bio', label: 'Bio singkat', type: 'textarea', help: 'Muncul di bawah nama pada bagian hero.' },
    { key: 'email', label: 'Email', type: 'text', help: 'Dipakai tombol copy email dan form kontak.' },
    { key: 'photo', label: 'Foto profil', type: 'image', kind: 'photo', help: 'Rasio 4:5. Contoh 800 × 1000 px. JPG/PNG/WebP.' },
    { key: 'cv', label: 'File CV', type: 'file', kind: 'cv', accept: '.pdf', help: 'PDF. Tombol Download CV mengarah ke file ini.' }
  ];

  var STAT_FIELDS = [
    { key: 'value', label: 'Angka', type: 'number' },
    { key: 'suffix', label: 'Akhiran', type: 'text', help: 'mis. + atau %' },
    { key: 'label', label: 'Keterangan', type: 'text' }
  ];

  var ABOUT_FIELDS = [
    { key: 'paragraphs', label: 'Paragraf', type: 'textList', help: 'Satu kotak = satu paragraf.' },
    { key: 'traits', label: 'Sifat / karakter', type: 'tags', help: 'Pisahkan dengan koma.' },
    {
      key: 'facts',
      label: 'Fakta singkat',
      type: 'list',
      itemLabel: 'Fakta',
      itemTitle: function (item) { return item.label || 'Fakta baru'; },
      newItem: function () { return { label: '', value: '', accent: false }; },
      fields: [
        { key: 'label', label: 'Label', type: 'text' },
        { key: 'value', label: 'Isi', type: 'text' },
        { key: 'accent', label: 'Tandai oranye (accent)', type: 'checkbox' }
      ]
    }
  ];

  var CAPABILITY_FIELDS = [
    { key: 'title', label: 'Judul', type: 'text' },
    { key: 'description', label: 'Deskripsi', type: 'textarea' },
    { key: 'tag', label: 'Label kecil', type: 'text', help: 'mis. Frontend, Design' }
  ];

  var STACK_FIELDS = [
    { key: 'group', label: 'Nama grup', type: 'text', help: 'mis. Frontend, Backend, Tools' },
    { key: 'items', label: 'Daftar teknologi', type: 'tags', help: 'Pisahkan dengan koma.' }
  ];

  var PROJECT_FIELDS = [
    { key: 'title', label: 'Nama project', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { key: 'id', label: 'ID unik', type: 'text', help: 'Huruf kecil tanpa spasi, mis. inventory' },
        { key: 'year', label: 'Tahun', type: 'text' }
      ]
    },
    { key: 'category', label: 'Kategori', type: 'text', help: 'mis. Web Application, Company Profile' },
    { key: 'summary', label: 'Ringkasan', type: 'textarea', help: 'Tampil di kartu project dan pembuka case study.' },
    { key: 'tags', label: 'Teknologi', type: 'tags', help: 'Pisahkan dengan koma.' },
    { key: 'cover', label: 'Gambar cover', type: 'image', kind: 'project', help: 'Rasio 16:10. Tampil di kartu project.' },
    { key: 'gallery', label: 'Screenshot tambahan', type: 'imageList', kind: 'project', help: 'Muncul di popup case study. Rasio 16:10.' },
    {
      key: 'links',
      label: 'Link project',
      type: 'group',
      fields: [
        { key: 'demo', label: 'Link demo / live', type: 'text', help: 'Kosongkan kalau belum ada.' },
        { key: 'repo', label: 'Link repository', type: 'text' }
      ]
    },
    {
      type: 'row',
      fields: [
        {
          key: 'shape',
          label: 'Bentuk placeholder',
          type: 'select',
          options: [
            { value: 'cube', label: 'Cube' },
            { value: 'ring', label: 'Ring' },
            { value: 'card', label: 'Card' },
            { value: 'pill', label: 'Pill' }
          ]
        },
        {
          key: 'fallbackTheme',
          label: 'Tema placeholder',
          type: 'select',
          options: [
            { value: 'light', label: 'Terang' },
            { value: 'dark', label: 'Gelap' }
          ]
        }
      ]
    },
    {
      key: 'details',
      label: 'Detail case study',
      type: 'list',
      itemLabel: 'Bagian',
      itemTitle: function (item) { return item.label || 'Bagian baru'; },
      newItem: function () { return { label: '', text: '' }; },
      fields: [
        { key: 'label', label: 'Judul bagian', type: 'text', help: 'mis. The Problem, What I Built, Result' },
        { key: 'text', label: 'Isi', type: 'textarea' }
      ]
    }
  ];

  var CERT_FIELDS = [
    { key: 'title', label: 'Judul sertifikat', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { key: 'issuer', label: 'Penerbit', type: 'text' },
        { key: 'year', label: 'Tahun', type: 'text' }
      ]
    },
    { key: 'image', label: 'Gambar sertifikat', type: 'image', kind: 'cert', help: 'JPG/PNG/WebP. Sebaiknya landscape.' },
    { key: 'credential', label: 'Link verifikasi (opsional)', type: 'text', help: 'mis. URL kredensial dari penerbit.' }
  ];

  var EXPERIENCE_FIELDS = [
    { key: 'period', label: 'Periode', type: 'text', help: 'mis. 2024 — Present' },
    { key: 'title', label: 'Posisi / judul', type: 'text' },
    { key: 'org', label: 'Organisasi', type: 'text' },
    { key: 'note', label: 'Keterangan', type: 'textarea' },
    { key: 'tag', label: 'Label', type: 'text', help: 'mis. Work, Education, Leadership' },
    { key: 'current', label: 'Tandai sebagai sedang berjalan', type: 'checkbox' }
  ];

  var SOCIAL_FIELDS = [
    { key: 'label', label: 'Nama platform', type: 'text', help: 'mis. GitHub, LinkedIn, Instagram' },
    { key: 'url', label: 'URL profil', type: 'text', help: 'URL kosong otomatis disembunyikan di situs.' }
  ];

  var CONTACT_FIELDS = [
    { key: 'heading', label: 'Judul', type: 'text' },
    { key: 'description', label: 'Deskripsi', type: 'textarea' },
    {
      key: 'accessKey',
      label: 'Web3Forms access key',
      type: 'text',
      help: 'Ambil gratis di web3forms.com. Selama masih placeholder, form akan menampilkan pesan "belum terhubung".'
    }
  ];

  var FOOTER_FIELDS = [
    { key: 'tagline', label: 'Tagline', type: 'text' },
    { key: 'year', label: 'Tahun', type: 'text' }
  ];

  /* ------------------------------------------------------------------ */
  /* Generic field renderer                                             */
  /* ------------------------------------------------------------------ */
  function renderFields(container, obj, fields) {
    fields.forEach(function (spec) {
      container.appendChild(renderField(obj, spec));
    });
  }

  function fieldLabel(spec, forId) {
    if (!spec.label) return null;
    return el('label', { class: 'field-label', for: forId || null }, [
      spec.label,
      spec.required ? el('span', { class: 'field-required', text: '*' }) : null
    ]);
  }

  function wrapField(spec, control, forId) {
    var wrap = el('div', { class: 'field' }, [
      fieldLabel(spec, forId),
      control,
      spec.help ? el('p', { class: 'field-help', text: spec.help }) : null
    ]);
    return wrap;
  }

  function renderField(obj, spec) {
    if (spec.type === 'row') {
      var row = el('div', { class: 'field-row' + (spec.class === 'three' ? ' three' : '') });
      spec.fields.forEach(function (child) {
        row.appendChild(renderField(obj, child));
      });
      return row;
    }

    switch (spec.type) {
      case 'text':
        return renderControl(obj, spec, { prefix: 'text' });
      case 'number':
        return renderControl(obj, spec, { prefix: 'num', type: 'number', step: 'any', parse: toNumber });
      case 'textarea':
        return renderControl(obj, spec, { prefix: 'ta', tag: 'textarea' });
      case 'select':
        return renderSelect(obj, spec);
      case 'checkbox':
        return renderCheckbox(obj, spec);
      case 'tags':
        return renderControl(obj, spec, { prefix: 'tags', format: tagValue, parse: parseTags });
      case 'textList':
        return renderTextList(obj, spec);
      case 'image':
        return renderImageField(obj, spec);
      case 'file':
        return renderFileField(obj, spec);
      case 'imageList':
        return renderImageList(obj, spec);
      case 'list':
        return renderListField(obj, spec);
      case 'group':
        return renderGroup(obj, spec);
      default:
        return el('p', { class: 'field-help', text: 'Tipe field tidak dikenal: ' + spec.type });
    }
  }

  function toNumber(value) {
    var number = value === '' ? 0 : Number(value);
    return Number.isNaN(number) ? 0 : number;
  }

  function tagValue(value) {
    return (Array.isArray(value) ? value : []).join(', ');
  }

  // Shared renderer for text, number, textarea and comma-separated tags.
  function renderControl(obj, spec, cfg) {
    var id = uid(cfg.prefix);
    var raw = obj[spec.key];
    var value = cfg.format ? cfg.format(raw) : (raw == null ? '' : String(raw));
    var attrs = { class: cfg.tag === 'textarea' ? 'textarea' : 'input', id: id };

    if (cfg.tag === 'textarea') {
      attrs.rows = 4;
    } else {
      attrs.type = cfg.type || 'text';
      attrs.step = cfg.step || null;
      attrs.value = value;
    }

    var input = el(cfg.tag || 'input', attrs);
    if (cfg.tag === 'textarea') input.value = value;

    input.addEventListener('input', function () {
      obj[spec.key] = cfg.parse ? cfg.parse(input.value) : input.value;
      markDirty();
    });

    return wrapField(spec, input, id);
  }

  function renderSelect(obj, spec) {
    var id = uid('sel');
    var select = el('select', { class: 'select', id: id });

    spec.options.forEach(function (option) {
      var node = el('option', { value: option.value, text: option.label });
      if (String(obj[spec.key] || '') === String(option.value)) node.selected = true;
      select.appendChild(node);
    });

    select.addEventListener('change', function () {
      obj[spec.key] = select.value;
      markDirty();
    });

    return wrapField(spec, select, id);
  }

  function renderCheckbox(obj, spec) {
    var input = el('input', { type: 'checkbox' });
    input.checked = Boolean(obj[spec.key]);

    input.addEventListener('change', function () {
      obj[spec.key] = input.checked;
      markDirty();
    });

    return el('div', { class: 'field' }, [
      el('label', { class: 'check' }, [input, el('span', { text: spec.label })]),
      spec.help ? el('p', { class: 'field-help', text: spec.help }) : null
    ]);
  }

  function parseTags(value) {
    return String(value || '')
      .split(',')
      .map(function (item) { return item.trim(); })
      .filter(function (item) { return item !== ''; });
  }

  function renderTextList(obj, spec) {
    var list = Array.isArray(obj[spec.key]) ? obj[spec.key] : (obj[spec.key] = []);
    var wrap = el('div', { class: 'field' }, [
      fieldLabel(spec, null),
      spec.help ? el('p', { class: 'field-help', text: spec.help }) : null
    ]);

    var rep = el('div', { class: 'rep' });
    wrap.appendChild(rep);

    function draw() {
      clear(rep);

      list.forEach(function (value, index) {
        var id = uid('para');
        var area = el('textarea', { class: 'textarea', id: id, rows: 3 });
        area.value = value;

        area.addEventListener('input', function () {
          list[index] = area.value;
          markDirty();
        });

        var body = el('div', { class: 'rep-body' }, [area]);
        var head = el('div', { class: 'rep-head' }, [
          el('span', { class: 'rep-index', text: 'PARAGRAF ' + (index + 1) }),
          el('div', { class: 'rep-tools' }, [
            el('button', {
              class: 'icon-btn danger',
              type: 'button',
              title: 'Hapus paragraf',
              text: '✕',
              onclick: function () {
                if (!window.confirm('Hapus paragraf ini?')) return;
                list.splice(index, 1);
                markDirty();
                draw();
              }
            })
          ])
        ]);

        rep.appendChild(el('div', { class: 'rep-item' }, [head, body]));
      });

      rep.appendChild(el('button', {
        class: 'rep-add',
        type: 'button',
        text: '+ Tambah paragraf',
        onclick: function () {
          list.push('');
          markDirty();
          draw();
        }
      }));
    }

    draw();
    return wrap;
  }

  function renderImageField(obj, spec) {
    var wrap = el('div', { class: 'field' });
    if (spec.label) wrap.appendChild(fieldLabel(spec, null));

    var preview = el('div', { class: 'img-preview' });
    var path = el('p', { class: 'img-path' });
    var fileInput = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp' });
    var uploadLabel = el('label', { class: 'upload-btn' }, [fileInput, el('span', { text: 'Unggah gambar' })]);
    var removeBtn = el('button', {
      class: 'upload-btn',
      type: 'button',
      text: 'Hapus dari konten',
      onclick: function () {
        obj[spec.key] = '';
        markDirty();
        paint();
      }
    });

    var pathInput = el('input', {
      class: 'input',
      type: 'text',
      placeholder: 'atau tempel path/URL gambar',
      value: obj[spec.key] || ''
    });

    pathInput.addEventListener('input', function () {
      obj[spec.key] = pathInput.value.trim();
      markDirty();
      paint();
    });

    function paint() {
      clear(preview);
      var src = obj[spec.key];

      if (src) {
        var img = el('img', { src: src, alt: '' });
        img.addEventListener('error', function () {
          clear(preview);
          preview.appendChild(el('span', { class: 'img-empty', text: 'Gambar tidak ditemukan' }));
        });
        preview.appendChild(img);
        path.textContent = src;
        removeBtn.hidden = false;
      } else {
        preview.appendChild(el('span', { class: 'img-empty', text: 'Belum ada gambar' }));
        path.textContent = 'Belum ada gambar — situs akan memakai placeholder.';
        removeBtn.hidden = true;
      }

      if (pathInput.value !== (src || '')) pathInput.value = src || '';
    }

    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;

      uploadLabel.classList.add('is-busy');
      uploadLabel.lastChild.textContent = 'Mengunggah…';
      uploadLabel.style.pointerEvents = 'none';

      uploadFile(file, spec.kind)
        .then(function (uploaded) {
          obj[spec.key] = uploaded.url;
          markDirty();
          paint();
          toast('Gambar berhasil diunggah.');
        })
        .catch(function (error) {
          toast(error.message, 'error');
        })
        .finally(function () {
          uploadLabel.classList.remove('is-busy');
          uploadLabel.lastChild.textContent = 'Unggah gambar';
          uploadLabel.style.pointerEvents = '';
          fileInput.value = '';
        });
    });

    wrap.appendChild(el('div', { class: 'img-field' }, [
      preview,
      el('div', { class: 'img-controls' }, [
        path,
        el('div', { class: 'img-actions' }, [uploadLabel, removeBtn]),
        pathInput
      ])
    ]));

    if (spec.help) wrap.appendChild(el('p', { class: 'field-help', text: spec.help }));

    paint();
    return wrap;
  }

  function renderFileField(obj, spec) {
    var wrap = el('div', { class: 'field' });
    if (spec.label) wrap.appendChild(fieldLabel(spec, null));

    var path = el('p', { class: 'img-path', text: obj[spec.key] || 'Belum ada file.' });
    var fileInput = el('input', { type: 'file', accept: spec.accept || '' });
    var uploadLabel = el('label', { class: 'upload-btn' }, [fileInput, el('span', { text: 'Unggah file' })]);

    var removeBtn = el('button', {
      class: 'upload-btn',
      type: 'button',
      text: 'Hapus dari konten',
      onclick: function () {
        obj[spec.key] = '';
        markDirty();
        path.textContent = 'Belum ada file.';
        removeBtn.hidden = true;
      }
    });

    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;

      uploadLabel.style.pointerEvents = 'none';
      uploadLabel.lastChild.textContent = 'Mengunggah…';

      uploadFile(file, spec.kind)
        .then(function (uploaded) {
          obj[spec.key] = uploaded.url;
          markDirty();
          path.textContent = uploaded.url;
          removeBtn.hidden = false;
          toast('File berhasil diunggah.');
        })
        .catch(function (error) {
          toast(error.message, 'error');
        })
        .finally(function () {
          uploadLabel.style.pointerEvents = '';
          uploadLabel.lastChild.textContent = 'Unggah file';
          fileInput.value = '';
        });
    });

    removeBtn.hidden = !obj[spec.key];

    wrap.appendChild(path);
    wrap.appendChild(el('div', { class: 'img-actions' }, [uploadLabel, removeBtn]));
    if (spec.help) wrap.appendChild(el('p', { class: 'field-help', text: spec.help }));

    return wrap;
  }

  function renderImageList(obj, spec) {
    if (!Array.isArray(obj[spec.key])) obj[spec.key] = [];
    var list = obj[spec.key];

    var wrap = el('div', { class: 'field' });
    if (spec.label) wrap.appendChild(fieldLabel(spec, null));

    var thumbs = el('div', { class: 'thumbs' });
    wrap.appendChild(thumbs);

    var fileInput = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true });
    var addLabel = el('label', { class: 'upload-btn' }, [fileInput, el('span', { text: '+ Tambah gambar' })]);
    wrap.appendChild(addLabel);

    if (spec.help) wrap.appendChild(el('p', { class: 'field-help', text: spec.help }));

    function paint() {
      clear(thumbs);

      if (!list.length) {
        thumbs.appendChild(el('p', { class: 'field-help', text: 'Belum ada gambar tambahan.' }));
        return;
      }

      list.forEach(function (src, index) {
        var img = el('img', { src: src, alt: '' });
        img.addEventListener('error', function () {
          img.style.opacity = '0.25';
        });

        thumbs.appendChild(el('div', { class: 'thumb' }, [
          img,
          el('div', { class: 'thumb-tools' }, [
            el('button', {
              class: 'icon-btn',
              type: 'button',
              title: 'Geser ke kiri',
              text: '←',
              disabled: index === 0,
              onclick: function () {
                list.splice(index - 1, 0, list.splice(index, 1)[0]);
                markDirty();
                paint();
              }
            }),
            el('button', {
              class: 'icon-btn',
              type: 'button',
              title: 'Geser ke kanan',
              text: '→',
              disabled: index === list.length - 1,
              onclick: function () {
                list.splice(index + 1, 0, list.splice(index, 1)[0]);
                markDirty();
                paint();
              }
            }),
            el('button', {
              class: 'icon-btn danger',
              type: 'button',
              title: 'Hapus gambar',
              text: '✕',
              onclick: function () {
                list.splice(index, 1);
                markDirty();
                paint();
              }
            })
          ])
        ]));
      });
    }

    fileInput.addEventListener('change', function () {
      var files = Array.prototype.slice.call(fileInput.files || []);
      if (!files.length) return;

      addLabel.style.pointerEvents = 'none';
      addLabel.lastChild.textContent = 'Mengunggah ' + files.length + ' gambar…';

      var chain = Promise.resolve();
      files.forEach(function (file) {
        chain = chain.then(function () {
          return uploadFile(file, spec.kind).then(function (uploaded) {
            list.push(uploaded.url);
            paint();
          });
        });
      });

      chain
        .then(function () { markDirty(); toast(files.length + ' gambar diunggah.'); })
        .catch(function (error) { toast(error.message, 'error'); })
        .finally(function () {
          addLabel.style.pointerEvents = '';
          addLabel.lastChild.textContent = '+ Tambah gambar';
          fileInput.value = '';
        });
    });

    paint();
    return wrap;
  }

  function renderListField(obj, spec) {
    if (!Array.isArray(obj[spec.key])) obj[spec.key] = [];
    var list = obj[spec.key];

    var wrap = el('div', { class: 'field' });
    if (spec.label) wrap.appendChild(fieldLabel(spec, null));
    if (spec.help) wrap.appendChild(el('p', { class: 'field-help', text: spec.help }));

    var rep = el('div', { class: 'rep' });
    wrap.appendChild(rep);

    function rebuild() {
      renderSection();
    }

    list.forEach(function (item, index) {
      if (!item || typeof item !== 'object') {
        list[index] = item = {};
      }

      var title = spec.itemTitle ? spec.itemTitle(item, index) : (item.title || item.label || 'Item ' + (index + 1));
      var head = el('div', { class: 'rep-head' }, [
        el('span', { class: 'rep-index', text: String(index + 1).padStart(2, '0') }),
        el('h3', { class: 'rep-title', text: title }),
        el('div', { class: 'rep-tools' }, [
          el('button', {
            class: 'icon-btn',
            type: 'button',
            title: 'Naikkan',
            text: '↑',
            disabled: index === 0,
            onclick: function () {
              list.splice(index - 1, 0, list.splice(index, 1)[0]);
              markDirty();
              rebuild();
            }
          }),
          el('button', {
            class: 'icon-btn',
            type: 'button',
            title: 'Turunkan',
            text: '↓',
            disabled: index === list.length - 1,
            onclick: function () {
              list.splice(index + 1, 0, list.splice(index, 1)[0]);
              markDirty();
              rebuild();
            }
          }),
          el('button', {
            class: 'icon-btn danger',
            type: 'button',
            title: 'Hapus',
            text: '✕',
            onclick: function () {
              if (!window.confirm('Hapus "' + title + '"?')) return;
              list.splice(index, 1);
              markDirty();
              rebuild();
            }
          })
        ])
      ]);

      var body = el('div', { class: 'rep-body' });
      renderFields(body, item, spec.fields);

      rep.appendChild(el('div', { class: 'rep-item' }, [head, body]));
    });

    rep.appendChild(el('button', {
      class: 'rep-add',
      type: 'button',
      text: '+ Tambah ' + (spec.itemLabel || 'item'),
      onclick: function () {
        list.push(spec.newItem ? spec.newItem() : {});
        markDirty();
        rebuild();
      }
    }));

    return wrap;
  }

  function renderGroup(obj, spec) {
    if (!obj[spec.key] || typeof obj[spec.key] !== 'object') obj[spec.key] = {};

    var body = el('div', { class: 'rep-body' });
    renderFields(body, obj[spec.key], spec.fields);

    return el('div', { class: 'field' }, [
      spec.label ? fieldLabel(spec, null) : null,
      el('div', { class: 'rep-item' }, [body]),
      spec.help ? el('p', { class: 'field-help', text: spec.help }) : null
    ]);
  }

  /* ------------------------------------------------------------------ */
  /* Page builders                                                      */
  /* ------------------------------------------------------------------ */
  function pageHead(title, description) {
    return el('header', { class: 'page-head' }, [
      el('h1', { class: 'page-title', text: title }),
      description ? el('p', { class: 'page-desc', text: description }) : null
    ]);
  }

  function card(title, description) {
    var body = el('div', { class: 'card-body' });
    var node = el('section', { class: 'card' }, [
      title || description
        ? el('header', { class: 'card-head' }, [
            el('h2', { class: 'card-title', text: title }),
            description ? el('p', { class: 'card-desc', text: description }) : null
          ])
        : null,
      body
    ]);
    return { node: node, body: body };
  }

  function sectionWithFields(title, description, obj, fields) {
    var frag = document.createDocumentFragment();
    frag.appendChild(pageHead(title, description));
    var c = card(null, null);
    renderFields(c.body, obj, fields);
    frag.appendChild(c.node);
    return frag;
  }

  /* ------------------------------------------------------------------ */
  /* Overview                                                           */
  /* ------------------------------------------------------------------ */
  function renderOverview(main) {
    var data = state.data;
    var profile = data.profile || {};
    var projects = data.projects || [];
    var certificates = data.certificates || [];
    var experience = data.experience || [];

    var frag = document.createDocumentFragment();

    frag.appendChild(el('div', { class: 'hero-strip' }, [
      el('div', {}, [
        el('h2', { text: 'Halo, ' + (profile.firstName || 'Handis') + ' 👋' }),
        el('p', {
          text: state.meta.savedAt
            ? 'Terakhir disimpan: ' + state.meta.savedAt
            : 'Belum pernah disimpan lewat admin.'
        })
      ]),
      el('a', { class: 'btn-ghost', href: '../index.html', target: '_blank', rel: 'noopener', text: 'Lihat situs ↗' })
    ]));

    var warnings = [];

    if (state.meta.mustChange) {
      warnings.push(['banner-warn', 'Kamu masih memakai password default. ', 'Segera ganti di menu Pengaturan.']);
    }
    if (!profile.email || /example|handis\.dev/i.test(profile.email)) {
      warnings.push(['banner-warn', 'Email masih placeholder. ', 'Ganti dengan email asli di menu Profil.']);
    }
    if (!profile.photo) {
      warnings.push(['banner-warn', 'Belum ada foto profil. ', 'Unggah di menu Profil & Foto.']);
    }
    if (!data.contact || !data.contact.accessKey || /YOUR_WEB3FORMS/i.test(data.contact.accessKey || '')) {
      warnings.push(['banner-warn', 'Form kontak belum terhubung. ', 'Isi Web3Forms access key di menu Kontak.']);
    }
    if (profile.photo && !profile.photo.match(/\.(jpe?g|png|webp)$/i)) {
      warnings.push(['banner-warn', 'Format foto profil tidak dikenali. ', 'Gunakan JPG/PNG/WebP.']);
    }
    if (!warnings.length) {
      warnings.push(['banner-info', 'Semua pengaturan dasar sudah lengkap. ', 'Situs siap dibagikan.']);
    }

    warnings.forEach(function (row) {
      frag.appendChild(el('div', { class: 'banner ' + row[0] }, [
        el('span', {}, [
          el('strong', { text: row[1] }),
          document.createTextNode(row[2])
        ])
      ]));
    });

    frag.appendChild(el('div', { class: 'stat-grid' }, [
      statCard(projects.length, 'Project'),
      statCard(certificates.length, 'Sertifikat'),
      statCard(experience.length, 'Pengalaman'),
      statCard(Object.keys(profile).length ? '✓' : '—', 'Profil')
    ]));

    var quick = card('Edit cepat', 'Semua isi situs bisa diubah dari sini.');
    var grid = el('div', { class: 'quick-grid' });
    [
      ['profile', 'Profil & Foto', 'Nama, bio, email, foto, CV'],
      ['projects', 'Project', 'Tambah, edit, hapus project'],
      ['certificates', 'Sertifikat', 'Kelola gambar sertifikat'],
      ['experience', 'Pengalaman', 'Kerja, pendidikan, organisasi'],
      ['skills', 'Skills', 'Kemampuan & teknologi'],
      ['contact', 'Kontak', 'Form & access key']
    ].forEach(function (item) {
      grid.appendChild(el('button', {
        class: 'quick-card',
        type: 'button',
        onclick: function () { navigate(item[0]); },
        text: ''
      }, [
        el('div', {}, [
          el('strong', { text: item[1] }),
          el('span', { text: item[2] })
        ])
      ]));
    });
    quick.body.appendChild(grid);
    frag.appendChild(quick.node);

    main.appendChild(frag);
  }

  function statCard(value, label) {
    return el('div', { class: 'stat-card' }, [
      el('b', { text: String(value) }),
      el('span', { text: label })
    ]);
  }

  /* ------------------------------------------------------------------ */
  /* Sections                                                           */
  /* ------------------------------------------------------------------ */
  function renderSection() {
    var main = $('#main');
    if (!main || !state.data) return;

    clear(main);
    renderNav();

    var data = state.data;

    switch (state.section) {
      case 'overview':
        renderOverview(main);
        break;

      case 'profile':
        main.appendChild(sectionWithFields(
          'Profil & Foto',
          'Data ini tampil di hero, about, dan tombol kontak.',
          data.profile,
          PROFILE_FIELDS
        ));
        break;

      case 'stats':
        main.appendChild(pageHead('Statistik', 'Angka yang tampil di bawah hero.'));
        main.appendChild(listCard('Angka statistik', data.stats, STAT_FIELDS, {
          itemLabel: 'statistik',
          title: function (item) { return (item.value + (item.suffix || '')) + ' — ' + (item.label || 'Statistik'); },
          newItem: function () { return { value: 0, suffix: '+', label: 'Statistik baru' }; }
        }));
        break;

      case 'about':
        main.appendChild(sectionWithFields(
          'Tentang',
          'Paragraf, sifat, dan fakta singkat di bagian About.',
          data.about,
          ABOUT_FIELDS
        ));
        break;

      case 'skills':
        main.appendChild(pageHead('Skills', 'Kemampuan utama dan daftar teknologi.'));
        main.appendChild(listCard('Kemampuan utama', data.skills.capabilities, CAPABILITY_FIELDS, {
          itemLabel: 'kemampuan',
          title: function (item) { return item.title || 'Kemampuan baru'; },
          newItem: function () { return { title: '', description: '', tag: '' }; }
        }));
        main.appendChild(listCard('Teknologi per grup', data.skills.stack, STACK_FIELDS, {
          itemLabel: 'grup',
          title: function (item) { return item.group || 'Grup baru'; },
          newItem: function () { return { group: '', items: [] }; }
        }));
        break;

      case 'projects':
        main.appendChild(pageHead('Project', 'Tambah, ubah, urutkan, atau hapus project. Gambar bisa diunggah langsung.'));
        main.appendChild(listCard('Daftar project', data.projects, PROJECT_FIELDS, {
          itemLabel: 'project',
          title: function (item) { return item.title || 'Project baru'; },
          newItem: function () {
            return {
              id: 'project-' + Math.random().toString(36).slice(2, 7),
              title: 'Project baru',
              category: 'Web Application',
              year: String(CURRENT_YEAR),
              summary: '',
              tags: [],
              cover: '',
              gallery: [],
              links: { demo: '', repo: '' },
              shape: 'cube',
              fallbackTheme: 'light',
              details: []
            };
          }
        }));
        break;

      case 'certificates':
        main.appendChild(pageHead('Sertifikat', 'Kelola sertifikat beserta gambarnya. Urutan di sini = urutan di situs.'));
        main.appendChild(listCard('Daftar sertifikat', data.certificates, CERT_FIELDS, {
          itemLabel: 'sertifikat',
          title: function (item) { return item.title || 'Sertifikat baru'; },
          newItem: function () {
            return { title: 'Sertifikat baru', issuer: '', year: String(CURRENT_YEAR), image: '', credential: '' };
          }
        }));
        break;

      case 'experience':
        main.appendChild(pageHead('Pengalaman', 'Pengalaman kerja, pendidikan, dan organisasi.'));
        main.appendChild(listCard('Daftar pengalaman', data.experience, EXPERIENCE_FIELDS, {
          itemLabel: 'pengalaman',
          title: function (item) { return item.title || 'Pengalaman baru'; },
          newItem: function () {
            return { period: '', title: '', org: '', note: '', tag: 'Work', current: false };
          }
        }));
        break;

      case 'socials':
        main.appendChild(pageHead('Sosial', 'Tautan yang tampil di bagian kontak. URL kosong otomatis disembunyikan.'));
        main.appendChild(listCard('Daftar sosial', data.socials, SOCIAL_FIELDS, {
          itemLabel: 'sosial',
          title: function (item) { return item.label || 'Sosial baru'; },
          newItem: function () { return { label: '', url: '' }; }
        }));
        break;

      case 'contact':
        main.appendChild(sectionWithFields(
          'Kontak',
          'Judul, deskripsi, dan pengaturan form kontak.',
          data.contact,
          CONTACT_FIELDS
        ));
        break;

      case 'footer':
        main.appendChild(sectionWithFields(
          'Footer',
          'Teks kecil di bagian paling bawah situs.',
          data.footer,
          FOOTER_FIELDS
        ));
        break;

      case 'settings':
        renderSettings(main);
        break;

      default:
        renderOverview(main);
    }

    main.scrollIntoView({ block: 'start' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function listCard(title, list, fields, options) {
    if (!Array.isArray(list)) list = [];
    var c = card(title, 'Urutan bisa diatur dengan tombol ↑ dan ↓.');
    var body = el('div', { class: 'card-body tight' });
    body.appendChild(renderListField({ items: list }, {
      key: 'items',
      type: 'list',
      itemLabel: options.itemLabel,
      itemTitle: options.title,
      newItem: options.newItem,
      fields: fields
    }));
    c.body.appendChild(body);
    return c.node;
  }

  /* ------------------------------------------------------------------ */
  /* Settings                                                           */
  /* ------------------------------------------------------------------ */
  function renderSettings(main) {
    main.appendChild(pageHead('Pengaturan', 'Keamanan, backup, dan pembersihan file.'));

    if (state.meta.mustChange) {
      main.appendChild(el('div', { class: 'banner banner-warn' }, [
        el('span', {}, [
          el('strong', { text: 'Password masih default. ' }),
          document.createTextNode('Ganti sekarang supaya orang lain tidak bisa masuk.')
        ])
      ]));
    }

    /* Password */
    var pw = card('Ganti password', 'Minimal 8 karakter. Gunakan kombinasi huruf dan angka.');
    var currentInput = el('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'Password saat ini' });
    var newInput = el('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'Password baru' });
    var confirmInput = el('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'Ulangi password baru' });
    var pwButton = el('button', { class: 'btn btn-dark', type: 'button', text: 'Simpan password' });

    pwButton.addEventListener('click', function () {
      if (newInput.value.length < 8) {
        toast('Password baru minimal 8 karakter.', 'error');
        return;
      }
      if (newInput.value !== confirmInput.value) {
        toast('Konfirmasi password tidak sama.', 'error');
        return;
      }

      pwButton.disabled = true;
      api('change-password', { body: { current: currentInput.value, new: newInput.value } })
        .then(function () {
          currentInput.value = '';
          newInput.value = '';
          confirmInput.value = '';
          state.meta.mustChange = false;
          toast('Password berhasil diganti.');
          renderSection();
        })
        .catch(function (error) { toast(error.message, 'error'); })
        .finally(function () { pwButton.disabled = false; });
    });

    pw.body.appendChild(el('div', { class: 'field-row three' }, [
      wrapField({ label: 'Password saat ini' }, currentInput, null),
      wrapField({ label: 'Password baru' }, newInput, null),
      wrapField({ label: 'Ulangi password baru' }, confirmInput, null)
    ]));
    pw.body.appendChild(el('div', { class: 'img-actions' }, [pwButton]));
    main.appendChild(pw.node);

    /* Backup */
    var backup = card('Backup & restore', 'Backup otomatis dibuat setiap kali kamu menyimpan. ' +
      (state.meta.backupCount || 0) + ' backup tersimpan di server.');

    var downloadLink = el('a', {
      class: 'btn-ghost',
      href: 'api.php?action=backup',
      text: 'Unduh content.json'
    });

    var restoreInput = el('input', { type: 'file', accept: '.json,application/json' });
    var restoreLabel = el('label', { class: 'upload-btn' }, [restoreInput, el('span', { text: 'Pilih file backup' })]);
    var restoreButton = el('button', { class: 'btn btn-dark', type: 'button', text: 'Restore sekarang', disabled: true });

    restoreInput.addEventListener('change', function () {
      restoreButton.disabled = !(restoreInput.files && restoreInput.files.length);
    });

    restoreButton.addEventListener('click', function () {
      var file = restoreInput.files && restoreInput.files[0];
      if (!file) return;
      if (!window.confirm('Restore akan menimpa konten saat ini. Lanjutkan?')) return;

      var formData = new FormData();
      formData.append('file', file);

      restoreButton.disabled = true;
      api('restore', { formData: formData })
        .then(function (json) {
          state.data = json.content;
          state.dirty = false;
          updateSaveState();
          renderSection();
          toast('Backup berhasil dipulihkan.');
        })
        .catch(function (error) {
          toast(error.message, 'error');
          restoreButton.disabled = false;
        });
    });

    backup.body.appendChild(el('div', { class: 'settings-row' }, [
      el('div', {}, [
        el('p', { text: 'Unduh semua konten sebagai file JSON.' }),
        el('small', { text: 'Simpan di tempat aman sebagai cadangan pribadi.' })
      ]),
      downloadLink
    ]));

    backup.body.appendChild(el('div', { class: 'settings-row' }, [
      el('div', {}, [
        el('p', { text: 'Pulihkan dari file backup.' }),
        el('small', { text: 'Gambar tidak ikut di-restore, hanya data teks dan path-nya.' })
      ]),
      el('div', { class: 'img-actions' }, [restoreLabel, restoreButton])
    ]));

    main.appendChild(backup.node);

    /* Unused files */
    var cleanup = card('Gambar tak terpakai', 'File di folder assets/ yang tidak lagi dirujuk oleh konten.');
    var scanButton = el('button', { class: 'btn-ghost', type: 'button', text: 'Pindai sekarang' });
    var fileList = el('ul', { class: 'file-list' });
    var cleanupStatus = el('p', { class: 'field-help', text: 'Klik "Pindai sekarang" untuk melihat file yatim.' });

    scanButton.addEventListener('click', function () {
      scanButton.disabled = true;
      api('unused')
        .then(function (json) {
          clear(fileList);
          var files = json.files || [];

          if (!files.length) {
            cleanupStatus.textContent = 'Tidak ada file yatim. Semua gambar dipakai.';
            return;
          }

          cleanupStatus.textContent = files.length + ' file tidak dipakai. Hapus untuk menghemat ruang hosting.';

          files.forEach(function (file) {
            var row = el('li', { class: 'file-row' }, [
              el('code', { text: file.path }),
              el('span', { class: 'meta', text: humanSize(file.bytes) }),
              el('button', {
                class: 'icon-btn danger',
                type: 'button',
                title: 'Hapus file',
                text: '✕',
                onclick: function () {
                  if (!window.confirm('Hapus permanen ' + file.path + '?')) return;
                  api('delete-file', { body: { path: file.path } })
                    .then(function () {
                      row.remove();
                      toast('File dihapus.');
                    })
                    .catch(function (error) { toast(error.message, 'error'); });
                }
              })
            ]);
            fileList.appendChild(row);
          });
        })
        .catch(function (error) { toast(error.message, 'error'); })
        .finally(function () { scanButton.disabled = false; });
    });

    cleanup.body.appendChild(el('div', { class: 'img-actions' }, [scanButton]));
    cleanup.body.appendChild(cleanupStatus);
    cleanup.body.appendChild(fileList);
    main.appendChild(cleanup.node);

    /* System info */
    var info = card('Informasi sistem', null);
    var dl = el('dl', { class: 'kv' });
    [
      ['PHP', state.meta.phpVersion || '—'],
      ['Batas upload', state.meta.maxUploadLabel || '—'],
      ['upload_max_filesize', state.meta.uploadIni || '—'],
      ['post_max_size', state.meta.postIni || '—'],
      ['GD (resize gambar)', state.meta.gd ? 'Aktif' : 'Tidak aktif'],
      ['Ukuran content.json', humanSize(state.meta.contentBytes || 0)],
      ['Backup tersimpan', String(state.meta.backupCount || 0)],
      ['Terakhir disimpan', state.meta.savedAt || 'Belum pernah']
    ].forEach(function (row) {
      dl.appendChild(el('dt', { text: row[0] }));
      dl.appendChild(el('dd', { text: row[1] }));
    });
    info.body.appendChild(dl);
    main.appendChild(info.node);
  }

  function humanSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
    return bytes + ' B';
  }

  /* ------------------------------------------------------------------ */
  /* Navigation                                                         */
  /* ------------------------------------------------------------------ */
  function counts() {
    var data = state.data || {};
    return {
      projects: (data.projects || []).length,
      certificates: (data.certificates || []).length,
      experience: (data.experience || []).length,
      socials: (data.socials || []).length,
      stats: (data.stats || []).length
    };
  }

  function renderNav() {
    var nav = $('#side-nav');
    if (!nav) return;

    clear(nav);
    var c = counts();

    SECTIONS.forEach(function (section) {
      var count = c[section.id];
      nav.appendChild(el('a', {
        class: 'side-link',
        href: '#' + section.id,
        'aria-current': state.section === section.id ? 'true' : 'false',
        onclick: function (event) {
          event.preventDefault();
          navigate(section.id);
        }
      }, [
        el('span', { text: section.label }),
        count !== undefined ? el('span', { class: 'count', text: String(count) }) : null
      ]));
    });
  }

  function navigate(section) {
    if (state.section === section) return;
    state.section = section;
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#' + section);
    }
    renderSection();
  }

  /* ------------------------------------------------------------------ */
  /* Save / discard / logout                                            */
  /* ------------------------------------------------------------------ */
  function save() {
    if (state.saving || !state.dirty) return;

    state.saving = true;
    updateSaveState();

    api('save', { body: { content: state.data } })
      .then(function (json) {
        state.dirty = false;
        state.meta.savedAt = json.savedAt;
        state.meta.contentBytes = JSON.stringify(state.data).length;
        toast('Tersimpan. Perubahan langsung tampil di situs.');
      })
      .catch(function (error) {
        toast(error.message, 'error');
      })
      .finally(function () {
        state.saving = false;
        updateSaveState();
      });
  }

  function discard() {
    if (!state.dirty) return;
    if (!window.confirm('Batalkan semua perubahan yang belum disimpan?')) return;

    api('get')
      .then(function (json) {
        state.data = json.content;
        state.meta = json.meta;
        state.dirty = false;
        updateSaveState();
        renderSection();
        toast('Perubahan dibatalkan.');
      })
      .catch(function (error) { toast(error.message, 'error'); });
  }

  function logout() {
    if (state.dirty && !window.confirm('Ada perubahan belum disimpan. Keluar tetap?')) return;

    api('logout', { body: {} })
      .catch(function () { /* tetap keluar */ })
      .finally(function () {
        window.location.href = 'index.php?logout=1';
      });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                               */
  /* ------------------------------------------------------------------ */
  function normalize(data) {
    data = data || {};
    data.profile = data.profile || {};
    data.socials = data.socials || [];
    data.stats = data.stats || [];
    data.about = data.about || {};
    data.skills = data.skills || {};
    data.skills.capabilities = data.skills.capabilities || [];
    data.skills.stack = data.skills.stack || [];
    data.projects = data.projects || [];
    data.certificates = data.certificates || [];
    data.experience = data.experience || [];
    data.contact = data.contact || {};
    data.footer = data.footer || {};
    return data;
  }

  function boot() {
    var hash = (window.location.hash || '').replace('#', '');
    var known = SECTIONS.some(function (section) { return section.id === hash; });
    state.section = known ? hash : 'overview';

    var saveBtn = $('#save-btn');
    var discardBtn = $('#discard-btn');
    var logoutBtn = $('#logout-btn');

    if (saveBtn) saveBtn.addEventListener('click', save);
    if (discardBtn) discardBtn.addEventListener('click', discard);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    window.addEventListener('beforeunload', function (event) {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = '';
    });

    window.addEventListener('keydown', function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        save();
      }
    });

    api('get')
      .then(function (json) {
        state.data = normalize(json.content);
        state.meta = json.meta || {};
        state.dirty = false;
        updateSaveState();
        renderSection();
      })
      .catch(function (error) {
        var main = $('#main');
        if (main) {
          clear(main);
          main.appendChild(el('div', { class: 'banner banner-warn' }, [
            el('span', { text: 'Gagal memuat data: ' + error.message })
          ]));
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
