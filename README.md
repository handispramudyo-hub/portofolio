# Handis.dev — Portfolio

One-page portfolio for **Handis Pramudio Ananta**. Static HTML, CSS, and vanilla JavaScript.
No build step, no framework — open `index.html` or host the folder anywhere.

---

## Menjalankan secara lokal

Cara paling cepat: klik dua kali `index.html`.

Kalau ingin lebih mirip kondisi production (dan agar semua file termuat dengan benar),
jalankan server statis sederhana dari folder ini:

```bash
# Python 3
python -m http.server 8000

# atau Node.js
npx serve .
```

Lalu buka `http://localhost:8000`.

---

## Struktur file

```
porto-web/
├── index.html          struktur halaman (jarang perlu disentuh)
├── styles.css          semua tampilan
├── data.js             ★ semua konten — edit di sini
├── app.js              logika & render
├── favicon.svg
├── README.md
└── assets/
    ├── profile/        foto portrait
    ├── projects/       screenshot project
    ├── certificates/   foto / screenshot sertifikat
    ├── og-cover.png    preview saat link dibagikan (1200 × 630)
    └── cv-handis.pdf   file CV
```

**Aturan penting:** kamu hampir tidak pernah perlu mengedit `index.html`.
Tambahkan konten lewat `data.js`, taruh gambarnya di folder `assets/`.

---

## 1. Ganti data profil

Buka `data.js`, bagian `profile`:

| Field | Keterangan |
|---|---|
| `name` | Nama lengkap (untuk meta & aksesibilitas) |
| `firstName` / `lastName` | Dua bagian nama yang tampil di hero |
| `brand` | Nama brand di header/footer |
| `roles` | Frasa yang bergantian di hero (efek mengetik) |
| `status` | Contoh: `Open to Work` |
| `availability` | Teks pill di bawah hero |
| `city`, `timezone` | Jam live di header (default `Asia/Jakarta`) |
| `bio` | Paragraf singkat di hero |
| `email` | Dipakai tombol copy & form kontak |
| `cv` | Path file CV |
| `photo` | Path foto portrait |

### Foto profil

1. Siapkan foto portrait (disarankan 800 × 1000 px atau lebih, rasio 4:5).
2. Simpan sebagai `assets/profile/handis.jpg`.
3. Selama file belum ada, hero otomatis menampilkan monogram `HP` — tidak error.

### CV

Saat ini `assets/cv-handis.pdf` berisi **PDF placeholder** yang bertuliskan
"PLACEHOLDER FILE". Timpa file itu dengan CV kamu (nama file tetap sama), dan tombol
**Download CV** akan otomatis mengarah ke CV yang baru.

---

## 2. Menambah project

Copy satu blok di dalam array `projects` pada `data.js`, lalu ubah isinya:

```js
{
  id: "nama-project",
  title: "Nama Project",
  category: "Web Application",
  year: "2025",
  summary: "Satu sampai dua kalimat ringkas tentang project.",
  tags: ["Laravel", "MySQL"],

  cover: "assets/projects/nama-project-cover.jpg",
  gallery: [
    "assets/projects/nama-project-1.jpg",
    "assets/projects/nama-project-2.jpg"
  ],

  links: { demo: "https://...", repo: "https://..." },

  shape: "cube",          // cube | ring | card | pill
  fallbackTheme: "light", // light | dark

  details: [
    { label: "The Problem",  text: "..." },
    { label: "What I Built", text: "..." },
    { label: "Result",       text: "..." }
  ]
}
```

**Gambar:**
- `cover` = gambar utama kartu (rasio 16:10, disarankan 1600 × 1000 px).
- `gallery` = screenshot tambahan untuk carousel di modal (boleh kosong `[]`).
- Kalau file gambar belum ada, kartu memakai visual CSS pengganti sesuai `shape`.
- `links` boleh dikosongkan: `{ demo: "", repo: "" }`.

**Menambah project ke-4, ke-5, dst.** — cukup tambah blok baru. Grid otomatis menyesuaikan.

---

## 3. Menambah sertifikat

Edit array `certificates`:

```js
{
  title: "Nama Sertifikat",
  issuer: "Dicoding",
  year: "2024",
  image: "assets/certificates/dicoding-web.jpg",
  credential: "https://link-verifikasi" // opsional, boleh ""
}
```

- Taruh gambar di `assets/certificates/` (JPG/PNG, landscape disarankan).
- Klik kartu → lightbox full-screen, bisa di-zoom dan dinavigasi dengan panah.
- Kalau `credential` diisi, tombol **Verify credential** muncul di lightbox.
- Kalau gambar belum ada, tampil placeholder dokumen — tidak error.

> Data sertifikat saat ini masih placeholder (`Certificate Title 01`, dst).
> Ganti dengan sertifikat aslimu.

---

## 4. Form kontak (Web3Forms)

Form memakai [Web3Forms](https://web3forms.com) — gratis, tanpa backend.

1. Buka https://web3forms.com
2. Masukkan email kamu, lalu cek inbox untuk access key.
3. Di `data.js`, ganti:

```js
contact: {
  ...
  accessKey: "YOUR_WEB3FORMS_ACCESS_KEY"
}
```

menjadi key kamu, misalnya `accessKey: "a1b2c3d4-...."`.

Selama key belum diisi, form tetap memvalidasi input dan menampilkan pesan
"form belum terhubung" beserta email alternatif — tidak ada pesan sukses palsu.

---

## 5. Sosial & statistik

- `socials` — isi `url` dengan link asli. Yang `url`-nya kosong otomatis disembunyikan.
- `stats` — angka di bawah hero. Ubah `value`, `suffix`, dan `label`.
- `experience` — tambah baris timeline dengan format yang sama.

---

## 6. Mengganti warna

Semua warna ada di bagian `:root` pada `styles.css`:

```css
--cream: #F8F6F2;
--carbon: #141413;
--tangerine: #FF5500;      /* aksen utama: bentuk, garis, tombol */
--tangerine-ink: #BA3E00;  /* oranye lebih gelap untuk teks di atas krem */
--warm-gray: #6B6660;      /* teks sekunder */
```

Ganti `--tangerine` untuk mengubah aksen oranye. Kalau mengganti warnanya, sesuaikan
juga `--tangerine-ink` agar teks oranye tetap mudah dibaca (kontras minimal 4.5:1).

---

## 7. Catatan teknis

- **Three.js** dimuat dari CDN (r128) hanya setelah halaman siap, jadi tidak menahan
  render konten. Kalau gagal dimuat, situs tetap berjalan normal — tombol 3D Lab
  otomatis disembunyikan.
- **Font** dari Google Fonts. Tanpa internet, font fallback sistem tetap dipakai.
- **Reduced motion**: kalau pengunjung mengaktifkan `prefers-reduced-motion`, animasi
  dan scene 3D otomatis dinonaktifkan.
- **Aksesibilitas**: semua kartu bisa diakses keyboard, modal punya focus trap dan
  tombol Escape, gambar punya alt text, dan navigasi punya `aria-current`.
- **Tanpa JavaScript**: sebagian konten dinamis tidak muncul. Untuk portfolio, JavaScript
  hampir selalu tersedia.

---

## 8. Deploy

Karena ini situs statis, tinggal upload seluruh folder ke:

- **Netlify** — drag & drop folder ke app.netlify.com/drop
- **Vercel** — `npx vercel`
- **GitHub Pages** — push ke repo, aktifkan Pages di Settings
- **Hosting biasa** — upload via FTP ke `public_html`

Preview media sosial memakai `assets/og-cover.png` (1200 × 630 px) yang sudah disertakan.
Kalau mau menggantinya, timpa file tersebut dengan gambar berukuran sama. Setelah situs
punya domain, ganti `og:image` di `index.html` menjadi URL lengkap (mis.
`https://domainmu.com/assets/og-cover.png`) supaya preview muncul di semua platform.
