/* ============================================================
   UI "Pemeriksaan Konsistensi Wawancara" — panel di tab Laporan
   Deteksi PASIF (tanpa validasi input): ⚠️ perlu verifikasi · ℹ️ info.
=========================================================== */
import { auditConsistency } from '../../domain/monitoring/consistency-audit.js';

function escHtml(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const RULE_LABELS = {
  'sp410-neq-sp411': 'Selisih belanja (sp410 vs sp411)',
  'internal-total': 'Total ≠ Σ rincian',
  'sp206-gt-sp205': 'Juru masak > total pekerja',
  'kronologi': 'Kronologi waktu',
  'kondisional-204': 'Kondisional >30 mnt',
  'kondisional-301': 'Kondisional pengawasan',
  'porsi-gt-kapasitas': 'Porsi > kapasitas',
  'sekolah-gt-sasaran': 'Sekolah > sasaran',
  'rentang-sp203': 'Rentang hari',
  'rentang-nk205': 'Rentang hari Naker',
  'rentang-nk206': 'Rentang jam Naker',
  'negatif': 'Nilai negatif',
  'negatif-naker': 'Nilai negatif Naker',
};

function renderConsistencyPanel(){
  const host = document.getElementById('consistencyBody');
  if (!host) return;
  if (typeof DB === 'undefined' || !DB || !DB.units) return;
  const findings = auditConsistency(DB.units, DB.monitoring);
  const verify = findings.filter(x => x.severity === 'verify');
  const info = findings.filter(x => x.severity === 'info');

  const head = `<div class="cs-summary">
    <span class="cs-chip ${verify.length ? 'warn' : 'ok'}">⚠️ Perlu verifikasi: <b>${verify.length}</b></span>
    <span class="cs-chip info">ℹ️ Info plausibilitas: <b>${info.length}</b></span>
    ${!findings.length ? '<span class="cs-chip ok">✅ Tidak ditemukan indikasi inkonsistensi</span>' : ''}
  </div>`;

  if (!findings.length){
    host.innerHTML = head + '<div class="empty"><i class="fas fa-check-circle"></i><p>Seluruh rekaman monitoring lolos pemeriksaan konsistensi.</p></div>';
    return;
  }

  const byRule = {};
  findings.forEach(x => { byRule[x.rule] = (byRule[x.rule] || 0) + 1; });
  const chips = Object.entries(byRule).sort((a, b) => b[1] - a[1])
    .map(r => `<span class="cs-chip mini ${r[0].startsWith('porsi') || r[0].startsWith('sekolah') ? 'info' : 'warn'}">${escHtml(RULE_LABELS[r[0]] || r[0])} <b>${r[1]}</b></span>`).join('');

  const rows = findings.map(x => `<tr onclick="openDetail('${x.unitId}')" class="cs-${x.severity}">
    <td class="cs-unit">${escHtml(x.unitNama)}<small>${escHtml(x.tgl || '')}</small></td>
    <td class="cs-sev">${x.severity === 'verify' ? '⚠️ Perlu verifikasi' : 'ℹ️ Info'}</td>
    <td class="cs-label">${escHtml(x.label)}</td>
    <td class="cs-detail">${escHtml(x.detail)}</td>
  </tr>`).join('');

  host.innerHTML = head + `<div class="cs-rules">${chips}</div>
    <div class="cs-table-wrap"><table class="cs-table">
      <thead><tr><th>Unit / Tanggal</th><th>Tingkat</th><th>Temuan</th><th>Detail</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

Object.assign(globalThis, { renderConsistencyPanel, auditConsistency });
