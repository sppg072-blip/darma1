/* ============================================================
   PLAN 2 BAGIAN 2 — UI "Lensa Ekonomi" di tab Laporan
   5 skor pilar terpisah per kabupaten (tanpa komposit),
   n + disclaimer transparan. P3: tab Laporan, P4: kabupaten.
=========================================================== */
import { computeEconomyAnalytics, normalizeScore } from '../../domain/monitoring/economy-analytics.js';
import { formatRupiahAmount } from '../../domain/forms/currency.js';

function escHtml(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtPct(v){ return (v == null || !Number.isFinite(v)) ? '—' : (v >= 0 ? v.toFixed(1) : v.toFixed(1)) + '%'; }
function fmtRp(v){ return (v == null || !Number.isFinite(v)) ? '—' : formatRupiahAmount(Math.round(v)); }
function fmtN2(v){ return (v == null || !Number.isFinite(v)) ? '—' : Number(Math.round(v)).toLocaleString('id-ID'); }

function econBar(score){
  if (score == null) return '<div class="el-bar"><div class="el-fill" style="width:0%;background:var(--text3)"></div></div>';
  const w = Math.max(2, Math.min(100, score));
  const color = score >= 66 ? 'var(--ok)' : score >= 33 ? '#F59E0B' : '#EF4444';
  return `<div class="el-bar"><div class="el-fill" style="width:${w}%;background:${color}"></div></div>`;
}

function renderEconLens(){
  const host = document.getElementById('econLensBody');
  if (!host) return;
  if (typeof DB === 'undefined' || !DB || !DB.units) return;
  const rows = computeEconomyAnalytics({ units: DB.units, monitoring: DB.monitoring }, Object.keys(typeof KABUPATEN !== 'undefined' ? KABUPATEN : {}));
  if (!rows.length){ host.innerHTML = '<div class="empty"><i class="fas fa-inbox"></i><p>Belum ada data unit.</p></div>'; return; }

  const danaVals = rows.map(r => r.pillars.dana.topUpRp);
  const lokalVals = rows.map(r => r.pillars.lokal.localContentPct);
  const hargaVals = rows.map(r => r.pillars.harga.changePct == null ? null : -Math.abs(r.pillars.harga.changePct)); /* stabil = lebih baik */
  const nakerVals = rows.map(r => r.pillars.naker.pekerja);
  const serapVals = rows.map(r => r.pillars.serapan.utilisasiPct);

  host.innerHTML = rows.map(r => {
    const p = r.pillars;
    const cells = [
      { icon:'🏦', t:'Injeksi Dana BGN', v: fmtRp(p.dana.topUpRp), s:`rata-rata ${fmtRp(p.dana.rataPerSppgRp)} / SPPG · n=${p.dana.n}`, score: normalizeScore(p.dana.topUpRp, danaVals) },
      { icon:'🔄', t:'Kandungan Lokal Belanja', v: fmtPct(p.lokal.localContentPct), s:`ke koperasi/desa/UMKM ${fmtPct(p.lokal.koperasiPct)} · total ${fmtRp(p.lokal.totalBelanjaRp)} · n=${p.lokal.n}`, score: normalizeScore(p.lokal.localContentPct, lokalVals) },
      { icon:'📈', t:'Perubahan Harga Bahan', v: (p.harga.changePct == null ? '—' : (p.harga.changePct >= 0 ? '▲ +' : '▼ ') + fmtPct(p.harga.changePct)), s:`${p.harga.nKomoditas} komoditas (beras·ayam·telur·susu)`, score: normalizeScore(p.harga.changePct == null ? null : -Math.abs(p.harga.changePct), hargaVals) },
      { icon:'👷', t:'Ketenagakerjaan', v: `${fmtN2(p.naker.pekerja)} pekerja`, s:`juru masak ${fmtN2(p.naker.juruMasak)} · payroll ≈ ${fmtRp(p.naker.payrollRp)}/bln · ${p.naker.dariNonPekerjaan} dari non-bekerja · upah ${fmtPct(p.naker.kenaikanUpahPct)} · n=${p.naker.n}`, score: normalizeScore(p.naker.pekerja, nakerVals) },
      { icon:'🍽', t:'Serapan Kapasitas', v: fmtPct(p.serapan.utilisasiPct), s:`cakupan sekolah ${fmtPct(p.serapan.sekolahCovPct)} · n=${p.serapan.n}`, score: normalizeScore(p.serapan.utilisasiPct, serapVals) },
    ];
    return `<div class="el-card">
      <div class="el-head"><span class="el-kab">📍 ${escHtml(r.kab)}</span><span class="el-meta">${r.nUnitsSppg} SPPG · ${r.nRecords} rekaman monev</span></div>
      <div class="el-grid">
        ${cells.map(c => `<div class="el-cell">
          <div class="el-t">${c.icon} ${escHtml(c.t)}</div>
          <div class="el-v">${escHtml(c.v)}</div>
          ${econBar(c.score)}
          <div class="el-s">${escHtml(c.s)}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

Object.assign(globalThis, { renderEconLens, computeEconomyAnalytics });
