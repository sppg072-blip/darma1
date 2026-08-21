/* ============================================================
   PLAN 2 BAGIAN 2 — UI "Lensa Ekonomi" di tab Laporan
   5 skor pilar terpisah per kabupaten (tanpa komposit),
   n + disclaimer transparan. P3: tab Laporan, P4: kabupaten.
   v2: layout daftar-baris yang terbaca di sidebar sempit —
       label + penjelasan singkat, nilai ringkas (miliar/juta),
       skor angka di ujung batang, legend cara membaca.
=========================================================== */
import { computeEconomyAnalytics, normalizeScore } from '../../domain/monitoring/economy-analytics.js';
import { formatRupiahAmount } from '../../domain/forms/currency.js';

function escHtml(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtPct(v){ return (v == null || !Number.isFinite(v)) ? '—' : (v >= 0 ? v.toFixed(1) : v.toFixed(1)) + '%'; }
function fmtRpFull(v){ return (v == null || !Number.isFinite(v)) ? '—' : formatRupiahAmount(Math.round(v)); }
function fmtRpShort(v){
  if (v == null || !Number.isFinite(v)) return '—';
  if (Math.abs(v) >= 1e9) return 'Rp' + (v / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' miliar';
  if (Math.abs(v) >= 1e6) return 'Rp' + (v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' juta';
  return formatRupiahAmount(Math.round(v));
}
function fmtInt(v){ return (v == null || !Number.isFinite(v)) ? '—' : Number(Math.round(v)).toLocaleString('id-ID'); }

function econBar(score){
  if (score == null) return '<div class="el-bar"><div class="el-fill" style="width:0%;background:#94a3b8"></div><span class="el-score">—</span></div>';
  const w = Math.max(2, Math.min(100, score));
  const tone = score >= 66 ? 'var(--ok)' : score >= 33 ? '#F59E0B' : '#EF4444';
  return `<div class="el-bar"><div class="el-fill" style="width:${w}%;background:${tone}"></div><span class="el-score" style="color:${tone}">${score}</span></div>`;
}

const PILLAR_HINTS = {
  dana: 'Top-up dana BGN yang masuk ke SPPG di wilayah ini',
  lokal: 'Porsi belanja bahan baku yang terserap ekonomi lokal (tidak bocor ke luar kota)',
  harga: 'Rata-rata perubahan harga beras/ayam/telur/susu vs bulan lalu — makin stabil makin baik',
  naker: 'Pekerja & estimasi total upah/bulan yang mengalir ke rumah tangga',
  serapan: 'Realisasi porsi terlayani dibanding kapasitas dapur',
};

function pillarRow(icon, title, hint, valueHtml, subHtml, score){
  return `<div class="el-row">
    <div class="el-l"><b>${icon} ${escHtml(title)}</b><small>${escHtml(hint)}</small></div>
    <div class="el-r">
      <div class="el-v">${valueHtml}${subHtml ? `<small>${subHtml}</small>` : ''}</div>
      ${econBar(score)}
    </div>
  </div>`;
}

function renderEconLens(){
  const host = document.getElementById('econLensBody');
  if (!host) return;
  if (typeof DB === 'undefined' || !DB || !DB.units) return;
  const rows = computeEconomyAnalytics({ units: DB.units, monitoring: DB.monitoring }, Object.keys(typeof KABUPATEN !== 'undefined' ? KABUPATEN : {}));

  const legend = `<div class="el-legend">📖 <b>Cara membaca:</b> angka = kondisi riil wilayah; <b>batang = skor 0–100</b> posisi relatif antar-kabupaten untuk pilar yang sama (harga: makin dekat nol makin panjang). <b>n</b> = jumlah data sumber.</div>`;

  if (!rows.length){ host.innerHTML = legend + '<div class="empty"><i class="fas fa-inbox"></i><p>Belum ada data unit.</p></div>'; return; }

  const danaVals = rows.map(r => r.pillars.dana.topUpRp);
  const lokalVals = rows.map(r => r.pillars.lokal.localContentPct);
  const hargaVals = rows.map(r => r.pillars.harga.changePct == null ? null : -Math.abs(r.pillars.harga.changePct)); /* stabil = lebih baik */
  const nakerVals = rows.map(r => r.pillars.naker.pekerja);
  const serapVals = rows.map(r => r.pillars.serapan.utilisasiPct);

  host.innerHTML = legend + rows.map(r => {
    const p = r.pillars;
    const hargaTxt = p.harga.changePct == null ? '—' : (p.harga.changePct >= 0 ? '▲ +' + p.harga.changePct.toFixed(1) + '%' : '▼ ' + p.harga.changePct.toFixed(1) + '%');
    const kosong = r.nRecords === 0;
    return `<div class="el-card${kosong ? ' el-empty' : ''}">
      <div class="el-head"><span class="el-kab">📍 ${escHtml(r.kab)}</span><span class="el-meta">${r.nUnitsSppg} SPPG · ${r.nSppgVisits} kunjungan${r.nNaker ? ' · kelengkapan Naker ' + r.nNaker + ' form' : ''}</span></div>
      ${kosong ? '<div class="el-nodata">Belum ada monev di wilayah ini — panel terisi otomatis setelah form monitoring SPPG tersimpan.</div>' : `
      <div class="el-rows">
        ${pillarRow('🏦','Dana BGN', PILLAR_HINTS.dana,
          `<b>${fmtRpShort(p.dana.topUpRp)}</b>`,
          `total ${fmtRpFull(p.dana.topUpRp)} · rata-rata ${fmtRpShort(p.dana.rataPerSppgRp)}/SPPG · n=${p.dana.n}`,
          normalizeScore(p.dana.topUpRp, danaVals))}
        ${pillarRow('🔄','Kandungan Lokal', PILLAR_HINTS.lokal,
          `<b>${fmtPct(p.lokal.localContentPct)}</b>`,
          `ke koperasi/desa/UMKM ${fmtPct(p.lokal.koperasiPct)} · total belanja ${fmtRpShort(p.lokal.totalBelanjaRp)} · n=${p.lokal.n}`,
          normalizeScore(p.lokal.localContentPct, lokalVals))}
        ${pillarRow('📈','Perubahan Harga', PILLAR_HINTS.harga,
          `<b>${hargaTxt}</b>`,
          `${p.harga.nKomoditas} komoditas terpantau (beras·ayam·telur·susu)`,
          normalizeScore(p.harga.changePct == null ? null : -Math.abs(p.harga.changePct), hargaVals))}
        ${pillarRow('👷','Ketenagakerjaan', PILLAR_HINTS.naker,
          `<b>${fmtInt(p.naker.pekerja)} pekerja</b>`,
          `juru masak ${fmtInt(p.naker.juruMasak)} · payroll ≈ ${fmtRpShort(p.naker.payrollRp)}/bln · ${p.naker.dariNonPekerjaan} dari non-bekerja · upah ${fmtPct(p.naker.kenaikanUpahPct)} · n=${p.naker.n}`,
          normalizeScore(p.naker.pekerja, nakerVals))}
        ${pillarRow('🍽','Serapan Kapasitas', PILLAR_HINTS.serapan,
          `<b>${fmtPct(p.serapan.utilisasiPct)}</b>`,
          `cakupan sekolah ${fmtPct(p.serapan.sekolahCovPct)} · n=${p.serapan.n}`,
          normalizeScore(p.serapan.utilisasiPct, serapVals))}
      </div>`}
    </div>`;
  }).join('');
}

Object.assign(globalThis, { renderEconLens, computeEconomyAnalytics });
