/* ============================================================
   PEMERIKSAAN KONSISTENSI DATA WAWANCARA (deteksi pasif — BUKAN validasi)
   Dipicu diskusi user: pewawancara bisa salah tulis; panel di menu Laporan
   menyinari kemungkinan inkonsistensi tanpa memblokir input lapangan.

   Severity:
   - 'verify' (⚠️ perlu verifikasi) : hampir pasti salah tulis (logika mustahil)
   - 'info'   (ℹ️ plausibilitas)    : aneh tapi bisa benar — perlu konteks
   Toleransi kesetaraan uang: ±1% (menoleransi pembulatan isian).
=========================================================== */
const JUTA = 1000000;
const TOL_PCT = 0.01;

function num(v){ const n = Number(v); return (v === '' || v == null || !Number.isFinite(n)) ? null : n; }
function gridTotal(fields, id){ const g = fields && fields[id]; return num(g && g.total); }
function gridRowsSum(fields, id){
  const g = fields && fields[id];
  if (!g || typeof g !== 'object') return null;
  let s = 0, has = false;
  Object.keys(g).forEach(r => { if (r === 'total') return; const v = num(g[r]); if (v != null) { s += v; has = true; } });
  return has ? s : null;
}
function sp411SumJuta(fields){
  const g = fields && fields.sp411;
  if (!g || typeof g !== 'object') return null;
  let s = 0, has = false;
  Object.keys(g).forEach(r => {
    if (r === 'total') return;
    const c = g[r] || {};
    ['dalam', 'luar'].forEach(k => { const v = num(c[k]); if (v != null) { s += v; has = true; } });
  });
  return has ? s : null;
}
function kindOf(m, unit){ return String(m.formType || m.jenis || (unit ? unit.jenis : '') || '').toUpperCase(); }
function minutes(t){ const mm = /^(\d{1,2}):(\d{2})/.exec(String(t || '')); return mm ? (+mm[1]) * 60 + (+mm[2]) : null; }
function fmtJutaRp(j){ return 'Rp' + Math.round(Math.abs(j) * JUTA).toLocaleString('id-ID') + ',-'; }
function fmtN(v){ return Number(v).toLocaleString('id-ID'); }

export function auditConsistency(units, monitoring){
  const unitById = id => units.find(u => u.id === id) || null;
  const out = [];
  (monitoring || []).forEach(m => {
    const u = unitById(m.unitId); if (!u) return;
    const f = (m.form && m.form.fields) || {};
    const kind = kindOf(m, u);
    const push = (rule, severity, label, detail) => out.push({
      unitId: m.unitId, unitNama: u.nama, tgl: m.tgl, recordId: m.id,
      rule, severity, label, detail,
    });

    if (kind === 'SPPG') {
      /* 1. Kesetaraan: total supplier (sp410) vs total bahan baku (sp411, dalam+luar) — ±1% */
      const a = gridTotal(f, 'sp410'), b = sp411SumJuta(f);
      if (a != null && b != null && Math.max(Math.abs(a), Math.abs(b)) > 0 && Math.abs(a - b) > TOL_PCT * Math.max(Math.abs(a), Math.abs(b))) {
        push('sp410-neq-sp411', 'verify', 'Selisih belanja bahan baku (sp410 vs sp411)',
          `supplier ${fmtJutaRp(a)} ≠ bahan ${fmtJutaRp(b)} — selisih ${fmtJutaRp(a - b)} di luar toleransi ±1%`);
      }
      /* 2. Kesetaraan internal: total ≠ Σ rincian (khas data impor) */
      [['sp201', 'penerima'], ['sp202', 'sekolah'], ['sp302', 'pengawasan'], ['sp413', 'biaya operasional']].forEach(pair => {
        const tot = gridTotal(f, pair[0]), sum = gridRowsSum(f, pair[0]);
        if (tot != null && sum != null && Math.abs(tot - sum) > 0.005) {
          push('internal-total', 'verify', `Total ${pair[1]} ≠ jumlah rincian`, `${pair[0]}: total ${fmtN(tot)} vs Σ rincian ${fmtN(sum)} — periksa (umum pada data impor)`);
        }
      });
      /* 3. Sub-set: juru masak ≤ total pekerja */
      const pw = num(f.sp205), jm = num(f.sp206);
      if (pw != null && jm != null && jm > pw) {
        push('sp206-gt-sp205', 'verify', 'Juru masak melebihi total pekerja',
          `sp206 juru masak ${fmtN(jm)} > sp205 total pekerja ${fmtN(pw)} — periksa apakah total pekerja dihitung termasuk juru masak`);
      }
      /* 4. Kronologi waktu dapur: mulai masak ≤ selesai ≤ pemorsian ≤ kirim */
      const seq = [['sp303', 'mulai masak'], ['sp304', 'selesai masak'], ['sp305', 'mulai pemorsian'], ['sp306', 'selesai pemorsian'], ['sp307', 'dikirim ke penerima']];
      let prev = null;
      for (const s of seq) {
        const mm = minutes(f[s[0]]);
        if (mm == null) continue;
        if (prev != null && mm < prev.val) { push('kronologi', 'verify', 'Kronologi waktu dapur mundur', `${s[1]} lebih awal daripada ${prev.nm} — periksa isian jam (sp303–sp307)`); break; }
        prev = { val: mm, nm: s[1] };
      }
      /* 5. Kondisional */
      if (String(f.sp204 || '').includes('> 30') && (f.sp204_detail === '' || f.sp204_detail == null)) {
        push('kondisional-204', 'verify', 'Waktu tempuh >30 menit tanpa rincian', 'sp204 memilih ">30 menit" tetapi rincian menit (204a) tidak diisi');
      }
      if (String(f.sp301 || '').toLowerCase() === 'tidak') {
        const g = f.sp302 || {};
        const anyRow = Object.keys(g).some(r => { const v = num(g[r]); return r !== 'total' && v != null && v > 0; });
        if (anyRow) push('kondisional-301', 'verify', 'Pengawasan eksternal "Tidak" tetapi jumlah terisi', 'sp301=Tidak namun sp302 berisi angka');
      }
      /* 6. Realisasi vs master (plausibilitas — bisa saja benar) */
      const porsi = gridTotal(f, 'sp201'), kap = num(u.kapasitas);
      if (porsi != null && kap != null && kap > 0 && porsi > kap) {
        push('porsi-gt-kapasitas', 'info', 'Porsi terlayani melebihi kapasitas', `${fmtN(porsi)} porsi vs kapasitas master ${fmtN(kap)} (${Math.round(porsi / kap * 100)}%) — overload riil atau salah tulis`);
      }
      const sek = gridTotal(f, 'sp202'), target = num(u.sekolah);
      if (sek != null && target != null && target > 0 && sek > target) {
        push('sekolah-gt-sasaran', 'info', 'Sekolah penerima melebihi sasaran', `${fmtN(sek)} vs sasaran master ${fmtN(target)} — cek master atau hasil wawancara`);
      }
      /* 7. Rentang wajar */
      const hari = num(f.sp203);
      if (hari != null && (hari > 31 || hari < 0)) push('rentang-sp203', 'verify', 'Hari penyaluran di luar rentang', `sp203=${fmtN(hari)} (wajar 0–31)`);
      [['sp401', 'Saldo VA'], ['sp403', 'Top-up BGN'], ['sp410', 'Belanja supplier'], ['sp413', 'Biaya operasional']].forEach(p => {
        const t = gridTotal(f, p[0]);
        if (t != null && t < 0) push('negatif', 'verify', `${p[1]} bernilai negatif`, `${p[0]} = ${t}`);
      });
    }

    if (kind === 'NAKER') {
      const h = num(f.nk205), j = num(f.nk206), up = num(f.nk207), old = num(f.nk203);
      if (h != null && h > 7) push('rentang-nk205', 'verify', 'Hari kerja/minggu > 7', `nk205=${fmtN(h)} (maks 7)`);
      if (j != null && j > 24) push('rentang-nk206', 'verify', 'Jam kerja/hari > 24', `nk206=${fmtN(j)} (maks 24)`);
      [['nk203', 'upah sebelumnya', old], ['nk207', 'upah sekarang', up]].forEach(p => {
        if (p[2] != null && p[2] < 0) push('negatif-naker', 'verify', `${p[1]} negatif`, `${p[0]}=${p[2]}`);
      });
    }
  });

  const order = { verify: 0, info: 1 };
  return out.sort((a, b) => order[a.severity] - order[b.severity] || String(b.tgl || '').localeCompare(String(a.tgl || '')));
}
