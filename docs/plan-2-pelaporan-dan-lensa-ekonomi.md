# PLAN 2 — Paket Pelaporan: Ringkasan PDF Cerminan Dashboard + Lensa Ekonomi Daerah

> Status: ✅ **FINAL — TELAH DIIMPLEMENTASIKAN 2026-08-21** (modul domain economy-analytics.js + 7 test baru; PDF A–E aktif)
> Prasyarat: independen dari Plan 1.

---

# BAGIAN 1 — Redesign "Ringkasan PDF" Dashboard

## Keputusan FINAL

| # | Hal | Keputusan |
|---|---|---|
| 1 | Format uang | **Rupiah penuh** `Rp82.809.900,-` — presisi EXACT (penyimpanan Rp Juta 6 desimal = presisi 1 rupiah); helper existing `formatStoredCurrency()` / `storedCurrencyToAbsolute()` dari `domain/forms/currency.js` |
| 2 | Cakupan baris tabel SPPG | **Kunjungan TERAKHIR per unit** (1 baris/unit) + **baris TOTAL** di bawah (jumlah unit, Σ penerima, Σ belanja, Σ biaya ops) + catatan jumlah seluruh rekaman kunjungan *(revisi user 2026-08-21, menggantikan keputusan awal "semua rekaman 1 baris per kunjungan")* |
| 3 | Orientasi | **Semua portrait**; lebar kolom proporsional isi |
| 4 | Seksi lama A–C | **Diganti cerminan dashboard**; "Unit Perlu Perhatian" **dihapus total** |
| 5 | **P1 — Sinkron filter** | **Angka mengikuti filter aktif** (`filteredUnits()` scope sama dengan dashboard); **kop mencantumkan filter aktif**; tanpa filter = seluruh data |

## Struktur PDF baru (`exportPdfDash()` di `exports/data.js`)

| Seksi | Isi | Cermin dari |
|---|---|---|
| **A. Ringkasan Statistik** | Grid 2×3 metrik angka besar: SPPG · KDMP · Monitoring Utama (+sub SPPG/KDMP/Naker) · Aktif/Operasional · Dalam Persiapan · Rencana/Usulan | 6 kartu `.sbox` |
| **B. Progres Cakupan Monitoring** | SPPG dimonitor x/y, KDMP dimonitor x/y, Total % — bar progress digambar (`doc.rect`) | Bar "Progres Cakupan" |
| **C. Unit per Kabupaten/Kota** | Tabel kab × SPPG × KDMP × total × jumlah monitoring | Bar "Unit per Kabupaten" |
| **D. Ringkasan Monitoring SPPG** | Tabel 7 kolom (sumber `uploads/IMG-20260821-WA0017.jpg`) | baru |
| **E. Lensa Ekonomi Daerah** | 5 skor pilar per kabupaten (lihat Bagian 2) | baru |

## Spesifikasi Tabel D (portrait, font ±6.8, total ≤188mm)

Alokasi kolom (mm): `No 6 · Nama SPPG 28 · Tgl 15 · Penerima 14 · Belanja 19 · Biaya Ops 19 · Kendala 32 · Catatan 55`

| Kolom | Sumber field | Format |
|---|---|---|
| Nama SPPG (+ Ka. SPPG baris ke-2) | `unit.nama` + responden `sp107`/`sp108` (fallback `unit.pic`) | teks 2 baris |
| Tanggal Monitoring | `m.tgl` | `fmtD` |
| Penerima Manfaat | `sp201` total | 2.500 |
| Belanja Bahan Baku (1 minggu) | `sp410` total | Rp82.809.900,- |
| Biaya Operasional 1 Minggu | `sp413` total | Rp82.809.900,- |
| Kendala/Hambatan | `sp414` multi-pilih, gabung koma | teks wrap |
| Catatan Lain | `m.temuan` | teks wrap |

- Cakupan rekaman `formType==='SPPG'` saja; sel kosong "—"; `stripEmoji()`; gaya `TBL_HEAD`+`TBL_ALT`.
- **P1 berlaku juga di sini:** jika filter aktif → tabel D hanya rekaman unit dalam scope filter + kop mencantumkan filter.
- Konversi uang: `formatStoredCurrency(stored, 1000000)` → `Rp82.809.900,-` (format `id-ID`, suffix `,-`), presisi exact (tervalidasi).

## File yang disentuh (Bagian 1)

1. `public/js/features/exports/data.js` — tulis ulang `exportPdfDash()` (seksi A grid metrik via `doc.rect`/`roundedRect`; B tabel+bar; C tabel existing; D baru; E lihat Bagian 2).
2. Selesai — murni lapisan ekspor.

---

# BAGIAN 2 — "Lensa Ekonomi Daerah" dari Data Monev

> Insight kunci: form monev DARMA-1 sudah mengukur 3 bahan dasar ekonomi regional: **arus dana, harga, ketenagakerjaan** — indikator ekonomi daerah dibangun TANPA field baru.

## Keputusan FINAL

| # | Keputusan | Pilihan |
|---|---|---|
| **P2** | Pilar v1 | **Semua 5 pilar** (field sudah tersedia semua) |
| **P3** | Lokasi tampilan | **Tab Laporan** — panel/bagian "Lensa Ekonomi" |
| **P4** | Level wilayah | **Kabupaten saja** (3 kab/kota wilayah kerja) |
| **P5** | Metode skor | **5 skor terpisah per pilar — TANPA skor komposit gabungan** (lebih jujur, hindari kesan "angka sakti") |
| **P6** | Output | **Seksi E di Ringkasan PDF yang sama** (tidak ada PDF terpisah) |

## 5 Pilar & sumber datanya (semuanya field existing)

| Pilar | Dibangun dari | Skor yang ditampilkan |
|---|---|---|
| 🏦 **Injeksi Dana** | `sp403` top-up BGN (+ `sp401` saldo VA, `sp407`–`sp408` insentif) | Total dana masuk per kab (Rp penuh) + rata-rata per SPPG |
| 🔄 **Kandungan Lokal** | `sp411` dalam vs luar kota; `sp410` per grup pemasok (KDKMP/BUMDes/UMKM vs agen/distributor); `sp410` total | % local content; % ke koperasi/usaha desa; total belanja berputar (Rp) |
| 📈 **Harga Bahan Baku** | `sp412` beras/ayam/telur/susu bulan ini vs lalu | % perubahan bulanan per komoditas + indeks gabungan sederhana |
| 👷 **Ketenagakerjaan** | (`sp205`+`sp206`)×`nk207` = payroll; `nk201/202/204` asal pekerja; `nk203` vs `nk207`; `sp208` BPJS; `nk308` | Jumlah & massa upah (Rp); % dari penganggur/RT; % kenaikan upah; % BPJS |
| 🍽 **Serapan** | `sp201` vs `unit.kapasitas`; `sp202` | % utilisasi kapasitas; jumlah sekolah jangkauan |

- Setiap pilar dinormalisasi tampil sebagai **skor 0–100 per pilar** (min–max antar kabupaten) **tanpa digabung**; ditampilkan berdampingan (kartu/tabel per kabupaten × pilar).
- **Selalu tampilkan n (jumlah rekaman sumber)** per kabupaten per pilar; kab dengan data kosong → "—" bukan 0.
- Label wajib: **"Indikator proksi kawasan MBG — bukan statistik resmi (bukan PDRB/inflasi BPS)"** + rumus singkat transparan.

## Produk bertahap

- **Tahap 1 (dieksekusi sekarang):** panel **"Lensa Ekonomi"** di tab Laporan (5 kartu pilar × 3 kab, n & disclaimer) + **seksi E Ringkasan PDF** (tabel kab × 5 pilar).
- **Tahap 2 (kemudian):** choropleth peta per kabupaten — karena tidak ada komposit, pewarnaan peta **per pilar yang dipilih** (dropdown pilar → arsir warna via `renderBoundaries()`); tren bulanan indeks harga.
- **Tahap 3 (opsional):** validasi silang data BPS.

## File yang disentuh (Bagian 2 — Tahap 1)

1. `public/js/domain/monitoring/economy-analytics.js` — **baru**: agregasi 5 pilar per kabupaten (domain murni, pola `operational-analytics.js`).
2. `public/js/features/reports/` — UI panel "Lensa Ekonomi" di tab Laporan.
3. `public/js/features/exports/data.js` — seksi E PDF.
4. `tests/` — unit test perhitungan pilar (pola `npm run validate`).

---

## Riwayat Keputusan (gabungan, semua sudah final)

| # | Keputusan | Alasan/catatan |
|---|---|---|
| 1 | Tabel gambar → seksi output "Ringkasan PDF" | keinginan user |
| 2 | Mapping kolom → field existing | tanpa field baru |
| 3 | Uang: rupiah penuh presisi exact | pilihan user; terverifikasi 6-desimal |
| 4 | Tabel D: kunjungan terakhir per unit + baris total | revisi user 2026-08-21 (semula: semua rekaman) |
| 5 | Portrait semua, kolom menyesuaikan | pilihan user |
| 6 | A–C = cerminan dashboard; "Perlu Perhatian" dihapus | pilihan user |
| P1 | Ikut filter aktif + kop filter | pilihan user |
| P2 | 5 pilar lengkap di v1 | pilihan user |
| P3 | Tampil di tab Laporan | pilihan user |
| P4 | Kabupaten saja | pilihan user |
| P5 | 5 skor terpisah, tanpa komposit | pilihan user — lebih jujur metodologi |
| P6 | Seksi E PDF yang sama | pilihan user |

**Plan 2 FINAL **Plan 2 FINAL & TERSIMPAN. Eksekusi ditunda hingga seluruh rencana (termasuk Plan 3 yang akan dibuat user) selesai didiskusikan.** TELAH DIIMPLEMENTASIKAN (2026-08-21).**
