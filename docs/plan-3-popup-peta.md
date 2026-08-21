# PLAN 3 (DRAF — BERKEMBANG) — Popup Peta & Perbaikan Lainnya

> Status: ✅ **FINAL — TELAH DIIMPLEMENTASIKAN 2026-08-21** (Item 1 + Item 2, termasuk M1–M4)
> Item pertama: popup peta. Nama file boleh diganti belakangan bila lingkupnya melebar.

## Item 1 — Popup Peta: "porsi" & "sekolah" diganti REALISASI monitoring

### Keputusan
Di popup marker SPPG (`buildPopup()` di `public/js/features/map/index.js`), dua angka yang tadinya dari **master (sasaran)**:

| Lama (dari Master Unit) | Baru (dari monitoring terakhir) |
|---|---|
| 🍳 `kapasitas` — "porsi / hari" (sasaran) | **`sp201` total** — porsi/hari **terlayani** (akhir bulan lalu) |
| 🏫 `sekolah` — "sekolah sasaran" | **`sp202` total** — sekolah **penerima MBG** |

Label ikut disesuaikan: "porsi terlayani / hari" dan "sekolah penerima" — bukan "porsi/hari (kapasitas)" dan "sekolah sasaran".

### Detail teknis
- Sumber: rekaman monitoring utama SPPG **terbaru** per unit (pola sudah ada: `primaryMonitoringForUnit(u.id)` diurut tanggal — sama seperti blok status monitoring di popup).
- Ambil `m.form.fields.sp201.total` dan `m.form.fields.sp202.total` (guard null → "—").
- Baris "yayasan pengelola" diganti jumlah tenaga kerja — lihat **Item 2**.
- KDMP tidak berubah (anggota/peran/usaha tetap dari master).

### Keputusan mikro
| # | Hal | Keputusan |
|---|---|---|
| M1 | Unit **belum pernah dimonitor** | ✅ **Ambil dari data Master** (`u.kapasitas`, `u.sekolah`) — disepakati user. Penanda label kecil *"(sasaran)"* agar pengguna tahu angka itu rencana, bukan hasil ukur *(default usulan — dapat dibatalkan)* |
| M2 | Unit **pernah dimonitor tapi sp201/sp202 kosong** | 🟡 usulan: tampil "—" |

### File yang disentuh
1. `public/js/features/monitoring/../map/index.js` — hanya fungsi `buildPopup()` (±10 baris).

---

## Item 2 — Popup SPPG: baris "yayasan pengelola" diganti JUMLAH TENAGA KERJA

### Keputusan
Baris ke-3 grid angka kunci popup SPPG (yang sekarang: *yayasan pengelola*, full-width) diganti **jumlah tenaga kerja** dari field **`sp205`** — *"Total jumlah pekerja bulan lalu (termasuk Kepala SPPG, Pengawas Gizi, Akuntan)"* (satuan: orang).

Susunan grid angka kunci popup SPPG setelah Item 1 + 2 (layout **2×2**):

| Sel | Isi | Sumber |
|---|---|---|
| kiri-atas | 🍳 porsi terlayani / hari | realisasi `sp201` (fallback: master `kapasitas` + label "(sasaran)") |
| kanan-atas | 🏫 sekolah penerima | realisasi `sp202` (fallback: master `sekolah` + label "(sasaran)") |
| kiri-bawah | 👷 jumlah pekerja | realisasi `sp205` — **sel terpisah** |
| kanan-bawah | 👨‍🍳 juru masak | realisasi `sp206` — **sel terpisah** |

### Catatan
- **Master tidak punya field tenaga kerja** (sudah diverifikasi: master SPPG hanya yayasan/kapasitas/sekolah/SLHS/mulai operasi) → unit belum dimonitor tidak ada fallback: tampil **"—"**.
- Informasi yayasan tidak hilang total — tetap ada di modal Detail unit.
- Opsi kecil (M4): tampil gabung `"25 pekerja · 8 juru masak"` memakai `sp205`+`sp206` dalam satu baris — atau cukup `sp205` saja.

### File yang disentuh
1. `public/js/features/map/index.js` — tetap hanya `buildPopup()` (gabungan Item 1+2, total ±15 baris).

---

## Implementasi

Item 1 + Item 2 diimplementasikan di `buildPopup()` (`public/js/features/map/index.js`) pada 2026-08-21.

## Item 3, dst. — slot kosong (belum ada)

*(slot untuk tambahan diskusi)*

## Rekap keputusan terbuka

| Kode | Keputusan | Status |
|---|---|---|
| M1 | Belum dimonitor → data master | ✅ disepakati |
| M2 | Field realisasi kosong → "—" | 🟡 usulan, belum dikonfirmasi |
| M3 | Tenaga kerja, unit belum dimonitor → "—" (master tak punya field) | 🟡 usulan, belum dikonfirmasi |
| M4 | sp205 & sp206 **dipisah** dua sel terpisah | ✅ disepakati |
