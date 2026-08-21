# PLAN 1 — Perapian Sidebar Dashboard & Kartu Klik-able

> Status: ✅ **FINAL — TELAH DIIMPLEMENTASIKAN 2026-08-21** (validasi 38/38 test lolos; server sandbox dijalankan ulang)
> Catatan: file ini hanya catatan kerja, belum tentu perlu di-commit ke repository.

---

## Ruang Lingkup (3 perubahan)

### Perubahan 1 — Hapus dua seksi "ramai" di tab Dashboard sidebar

Menghilangkan:
- **"Target Sasaran Unit Belum Dimonitor"** (elemen `#attnList`)
- **"Monitoring Terbaru"** (elemen `#recentMon`)

File yang diubah (keduanya **wajib berpasangan**, jika tidak `renderDash()` crash `TypeError` karena elemen null → seluruh statistik dashboard ikut mati):

| File | Yang dihapus |
|---|---|
| `public/index.html` | 4 baris di dalam `#tab-dash` (±baris 202–205): `sec-title` + `div#attnList`, dan `sec-title` + `div#recentMon` |
| `public/js/features/dashboard/index.js` | Blok `// target sasaran unit belum dimonitor (0 kunjungan)` (±baris 79–88) dan blok `// recent monitoring` (±baris 90–100) di dalam `renderDash()` |

---

### Perubahan 2 — Kartu statistik jadi klik-able → tampilkan data

6 kartu `.sbox` di `.sgrid` (±baris 175–190 `index.html`) diberi `onclick` + `cursor:pointer`.

Perilaku klik (kesepakatan):

| Kartu | Aksi | Hasil |
|---|---|---|
| 🍳 SPPG / Dapur MBG | `quickJenis('SPPG')` + `goTab('unit')` | Daftar semua unit SPPG |
| 🏪 KDMP Koperasi | `quickJenis('KDMP')` + `goTab('unit')` | Daftar semua unit KDMP |
| 📋 Monitoring Utama | **buka modal tabel ringkas** (lihat Perubahan 3) | Tabel 2 segmen |
| ✅ Aktif / Operasional | `FS.status='aktif'` + `goTab('unit')` | Unit berstatus aktif |
| 🟡 Dalam Persiapan | `FS.status='persiapan'` + `goTab('unit')` | Unit dalam persiapan |
| ⚪ Rencana / Usulan | `FS.status='rencana'` + `goTab('unit')` | Unit rencana/usulan |

Tambalan arsitektur (kartu status butuh filter yang belum ada):
- `public/js/features/map/index.js` → `filteredUnits()` (baris 64): tambah
  `if(FS.status && u.status!==FS.status) return false;`
- `public/js/features/filters/index.js` → `clearFilters()`: sertakan `status:''` saat reset `FS`; pastikan `onFilterChange()` tidak menimpa `FS.status`.

---

### Perubahan 3 — Kartu "Monitoring Utama" → modal tabel ringkas (Opsi A)

**Sumber data:** `DB.monitoring` (sama dengan tab Histori — murni presentation layer baru, tanpa duplikasi logika data).

**Dua segmen (bukan per-jenis):**

| Segmen | Isi | Kolom |
|---|---|---|
| 📋 Monitoring Utama | SPPG & KDMP | Tanggal · Unit (badge S/K) · Kab · Petugas · 🍽 Porsi/hari (`sp201`) · 🏫 Sekolah (`sp202`) · ⭐ Skor KDMP (`avg`) · Temuan (1 baris) · aksi Detail |
| 👷 Tenaga Kerja | NAKER | Tanggal · Unit SPPG · Responden (`nk101`) · Jabatan (`nk102`) · 💵 Upah (`nk207`) · Hari/mgg (`nk205`) · Dampak ekonomi (`nk308`) · aksi Detail |

**Kesepakatan tampilan & interaksi:**
- Modal lebar menutupi area peta (**Opsi A**), tombol ✕ menutup.
- Batas tampil **25 baris** = jumlah terlihat di layar; **semua baris tetap dirender** dan digulir.
- Scroll **dua arah**: `max-height ±65vh; overflow:auto` (vertikal) + `min-width` tabel (horizontal).
- **Header sticky** saat scroll vertikal; sticky kolom pertama (unit) saat horizontal (opsional, nice-to-have).
- Dropdown penyesuaian jumlah baris: **25 / 50 / 100 / Semua** + indikator "Menampilkan N baris".
- Kotak pencarian kecil + filter kabupaten di toolbar modal.
- Klik baris → `openDetail(unitId)` (konsisten perilaku lama).
- Jika suatu hari datanya ribuan → baru pertimbangkan virtual scrolling (desain sekarang tidak menghalangi).

**Cetak PDF (kesepakatan):**
- Tombol "📄 Cetak PDF" di modal.
- **Mencetak SEMUA baris hasil filter saat itu — bukan hanya yang terlihat 25.**
- Pakai ulang mesin yang ada: `jsPDF 2.5.1` + `autotable 3.8.2` (sudah dimuat di `index.html`), helper `pdfHead()`/`pdfFoot()`/`TBL_HEAD` dari `features/exports/data.js`, A4 **landscape**, baris selang-seling.
- Nama file mengikuti pola existing: `DARMA-1_RingkasanMonitoring_YYYY-MM-DD.pdf`.

---

## Ringkasan File yang Disentuh

1. `public/index.html` — hapus 2 seksi; `onclick` 6 kartu; skeleton modal tabel
2. `public/js/features/dashboard/index.js` — hapus 2 blok render; fungsi `dashCard(type)`, `openMonitoringTable()` → daftar ke `Object.assign(globalThis, {...})`
3. `public/js/features/map/index.js` — 1 baris filter `FS.status` di `filteredUnits()`
4. `public/js/features/filters/index.js` — reset & jaga `FS.status`
5. `public/js/features/exports/data.js` — fungsi PDF tabel ringkas (pipeline autotable existing)
6. `public/styles/20-shell-components.css` — CSS modal, tabel sticky, efek hover kartu

**Tidak menyentuh:** `server/`, skema database, repositori data — murni front-end.

---

## Riwayat Keputusan

| # | Keputusan | Alasan |
|---|---|---|
| 1 | Hapus seksi "Target Sasaran" & "Monitoring Terbaru" | Tampilan sidebar terlalu ramai |
| 2 | Kartu klik-able → data muncul | Info tersembunyi jadi mudah diakses |
| 3 | Kartu Monitoring Utama = **Opsi A** (modal), bukan toggle di Histori | Sidebar sempit; dashboard tetap bersih |
| 4 | Tabel dibagi **2 segmen** (Monitoring Utama SPPG+KDMP vs Naker), bukan per-jenis | "Monitoring utama" = SPPG+KDMP per `isPrimaryMonitoring()`; Naker terpisah |
| 5 | 25 baris terlihat + scroll 2 arah, semua baris ter-render | Keseimbangan ringkas vs lengkap |
| 6 | Dropdown 25/50/100/Semua | "Bisa disesuaikan nanti" |
| 7 | PDF cetak semua baris filter, bukan yang terlihat | Laporan tidak boleh terpotong diam-diam |

*Plan 1 FINAL *Plan 1 FINAL & tersimpan. Eksekusi ditunda hingga seluruh rencana selesai didiskusikan.* TELAH DIIMPLEMENTASIKAN (2026-08-21).*
