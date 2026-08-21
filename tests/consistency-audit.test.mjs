import assert from 'node:assert/strict';
import test from 'node:test';
import { auditConsistency } from '../public/js/domain/monitoring/consistency-audit.js';

const UNITS = [
  { id: 'u1', nama: 'SPPG Alpha', jenis: 'SPPG', kab: 'Kab. Test', kapasitas: 3000, sekolah: 50 },
  { id: 'u2', nama: 'SPPG Beta', jenis: 'SPPG', kab: 'Kab. Test', kapasitas: 2000, sekolah: 20 },
];

const baseFields = {
  sp201: { siswa: 1800, guru: 700, total: 2500 }, sp202: { sd: 30, smp: 15, total: 45 },
  sp203: 20, sp205: 20, sp206: 8,
  sp410: { kdkmp: 60, agen: 22, total: 82 },
  sp411: { pokok: { dalam: 50, luar: 30 }, lauk: { dalam: 2, luar: 0 } }, /* Σ = 82 Jt = sp410 ✓ */
  sp413: { tk: 10, bbm: 5, total: 15 },
  sp303: '03:00', sp304: '05:00', sp305: '05:30', sp306: '07:00', sp307: '07:30',
};

function rec(id, unitId, tgl, fields, formType = 'SPPG'){
  return { id, unitId, tgl, formType, form: { fields } };
}

test('Rekaman konsisten → tidak ada temuan', () => {
  const out = auditConsistency(UNITS, [rec('m0', 'u1', '2026-08-01', baseFields)]);
  assert.equal(out.length, 0);
});

test('sp410 ≠ sp411 di luar toleransi ±1% → verify', () => {
  const f = { ...baseFields, sp411: { pokok: { dalam: 50, luar: 25 } } }; /* Σ75 vs 82 → Δ7 > 1% */
  const out = auditConsistency(UNITS, [rec('m1', 'u1', '2026-08-02', f)]);
  const hit = out.find(x => x.rule === 'sp410-neq-sp411');
  assert.ok(hit && hit.severity === 'verify');
  assert.ok(hit.detail.includes('selisih'));
});

test('sp410 ≈ sp411 dalam toleransi ±1% → lolos', () => {
  const f = { ...baseFields, sp411: { pokok: { dalam: 50, luar: 31.5 } } }; /* Σ81.5 vs 82 → Δ0.5 < 1% */
  const out = auditConsistency(UNITS, [rec('m2', 'u1', '2026-08-03', f)]);
  assert.equal(out.filter(x => x.rule === 'sp410-neq-sp411').length, 0);
});

test('Total internal ≠ Σ rincian (khas impor) → verify', () => {
  const f = { ...baseFields, sp201: { siswa: 1000, total: 2500 } }; /* total 2500 ≠ Σ1000 */
  const out = auditConsistency(UNITS, [rec('m3', 'u1', '2026-08-04', f)]);
  assert.ok(out.some(x => x.rule === 'internal-total' && x.severity === 'verify'));
});

test('Juru masak > total pekerja → verify', () => {
  const f = { ...baseFields, sp205: 5, sp206: 8 };
  const out = auditConsistency(UNITS, [rec('m4', 'u1', '2026-08-05', f)]);
  const hit = out.find(x => x.rule === 'sp206-gt-sp205');
  assert.ok(hit && hit.severity === 'verify' && hit.detail.includes('termasuk juru masak'));
});

test('Kronologi waktu mundur → verify', () => {
  const f = { ...baseFields, sp304: '02:30' }; /* selesai sebelum mulai */
  const out = auditConsistency(UNITS, [rec('m5', 'u1', '2026-08-06', f)]);
  assert.ok(out.some(x => x.rule === 'kronologi' && x.severity === 'verify'));
});

test('Kondisional: >30 menit tanpa detail & pengawasan Tidak tapi terisi → verify', () => {
  const f = { ...baseFields, sp204: '> 30 menit, sebutkan', sp301: 'Tidak', sp302: { dinkes: 2, total: 2 } };
  const out = auditConsistency(UNITS, [rec('m6', 'u1', '2026-08-07', f)]);
  assert.ok(out.some(x => x.rule === 'kondisional-204'));
  assert.ok(out.some(x => x.rule === 'kondisional-301'));
});

test('Porsi > kapasitas & sekolah > sasaran → info (bukan verify)', () => {
  const f = { ...baseFields, sp201: { siswa: 3000, total: 3400 }, sp202: { sd: 60, total: 60 } };
  const out = auditConsistency(UNITS, [rec('m7', 'u2', '2026-08-08', f)]);
  assert.ok(out.some(x => x.rule === 'porsi-gt-kapasitas' && x.severity === 'info'));
  assert.ok(out.some(x => x.rule === 'sekolah-gt-sasaran' && x.severity === 'info'));
});

test('Rentang wajar NAKER → verify; NAKER tidak memicu aturan SPPG', () => {
  const naker = rec('n1', 'u1', '2026-08-09', { nk205: 8, nk206: 25, nk203: -100 }, 'NAKER');
  const out = auditConsistency(UNITS, [naker]);
  assert.ok(out.some(x => x.rule === 'rentang-nk205'));
  assert.ok(out.some(x => x.rule === 'rentang-nk206'));
  assert.ok(out.some(x => x.rule === 'negatif-naker'));
  assert.equal(out.filter(x => x.rule === 'sp410-neq-sp411').length, 0);
});

test('Pengurutan: verify sebelum info, tanggal terbaru dulu', () => {
  const f1 = { ...baseFields, sp201: { siswa: 3000, total: 3400 } }; /* info */
  const f2 = { ...baseFields, sp205: 5, sp206: 8 }; /* verify */
  const out = auditConsistency(UNITS, [
    rec('a', 'u1', '2026-07-01', f1),
    rec('b', 'u2', '2026-08-12', f2),
  ]);
  assert.equal(out[0].severity, 'verify');
});
