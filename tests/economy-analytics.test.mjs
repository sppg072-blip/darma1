import assert from 'node:assert/strict';
import test from 'node:test';
import { computeEconomyAnalytics, normalizeScore } from '../public/js/domain/monitoring/economy-analytics.js';

const UNITS = [
  { id: 'u1', jenis: 'SPPG', kab: 'Kab. Test Satu', kapasitas: 3000, sekolah: 50 },
  { id: 'u2', jenis: 'SPPG', kab: 'Kab. Test Satu', kapasitas: 1000, sekolah: 20 },
  { id: 'u3', jenis: 'SPPG', kab: 'Kab. Test Dua', kapasitas: 2000, sekolah: 30 },
  { id: 'u4', jenis: 'KDMP', kab: 'Kab. Test Satu' },
];

const MONITORING = [
  { id: 'm1', unitId: 'u1', tgl: '2026-08-12', formType: 'SPPG', form: { fields: {
    sp203: 20,
    sp201: { siswa: 2000, total: 2500 },
    sp202: { sd: 30, total: 45 },
    sp205: 20, sp206: 8,
    sp403: 100.5, /* Juta → Rp100.500.000 */
    sp410: { kdkmp: 40, bumdes: 10, umkm: 10, agen: 20, distributor: 0, produsen: 0, total: 80 },
    sp411: { pokok: { dalam: 30, luar: 10 }, lauk: { dalam: 20, luar: 0 } },
    sp412: { beras: { ini: 13200, lalu: 12000 }, telur: { ini: 27000, lalu: 30000 } },
  } } },
  { id: 'm2', unitId: 'u2', tgl: '2026-07-01', formType: 'SPPG', form: { fields: {
    sp201: { total: 800 }, sp202: { total: 15 }, sp205: 5, sp206: 2,
    sp403: 50,
    sp410: { agen: 100, total: 100 },
    sp411: { pokok: { dalam: 10, luar: 40 } },
  } } },
  { id: 'm3', unitId: 'u3', tgl: '2026-08-02', formType: 'SPPG', form: { fields: {
    sp201: { total: 1000 }, sp202: { total: 30 }, sp205: 10, sp206: 4,
    sp403: 200,
    sp410: { kdkmp: 60, agen: 40, total: 100 },
    sp411: { pokok: { dalam: 60, luar: 20 } },
    sp412: { beras: { ini: 12500, lalu: 12500 } },
  } } },
  { id: 'n1', unitId: 'u1', tgl: '2026-08-13', formType: 'NAKER', form: { fields: {
    nk101: 'A', nk102: 'Juru Masak', nk203: 1500000, nk204: 'Mencari Pekerjaan', nk205: 5, nk207: 2000000, nk308: 'Sangat membantu',
  } } },
  { id: 'n2', unitId: 'u2', tgl: '2026-07-02', formType: 'NAKER', form: { fields: {
    nk101: 'B', nk102: 'Akuntan', nk203: 2500000, nk204: 'Sekolah', nk205: 6, nk207: 2500000, nk308: 'Cukup membantu',
  } } },
];

test('Pilar 1 — Dana: total top-up BGN dalam rupiah penuh presisi exact', () => {
  const rows = computeEconomyAnalytics({ units: UNITS, monitoring: MONITORING }, ['Kab. Test Satu', 'Kab. Test Dua']);
  const satu = rows.find(r => r.kab === 'Kab. Test Satu');
  assert.equal(satu.pillars.dana.topUpRp, 150500000); /* 100,5 Juta + 50 Juta — presisi 1 rupiah */
  assert.equal(satu.pillars.dana.n, 2);
});

test('Pilar 2 — Lokal: local content & porsi koperasi', () => {
  const rows = computeEconomyAnalytics({ units: UNITS, monitoring: MONITORING }, ['Kab. Test Satu', 'Kab. Test Dua']);
  const satu = rows.find(r => r.kab === 'Kab. Test Satu');
  /* m1: dalam 50 Jt vs luar 10 Jt; m2: dalam 10 vs luar 40 → total dalam 60, luar 50 → 60/110 */
  assert.ok(Math.abs(satu.pillars.lokal.localContentPct - (60 / 110) * 100) < 0.01);
  /* m1 koperasi (40+10+10)/80 = 75%; m2 0/100 = 0% → total 60/180 */
  assert.ok(Math.abs(satu.pillars.lokal.koperasiPct - (60 / 180) * 100) < 0.01);
});

test('Pilar 3 — Harga: rata-rata perubahan komoditas', () => {
  const rows = computeEconomyAnalytics({ units: UNITS, monitoring: MONITORING }, ['Kab. Test Satu', 'Kab. Test Dua']);
  const satu = rows.find(r => r.kab === 'Kab. Test Satu');
  /* beras +10%, telur -10% → rata 0% */
  assert.ok(Math.abs(satu.pillars.harga.changePct) < 0.001);
  assert.equal(satu.pillars.harga.nKomoditas, 2);
});

test('Pilar 4 — Naker: pekerja, payroll, non-bekerja, kenaikan upah', () => {
  const rows = computeEconomyAnalytics({ units: UNITS, monitoring: MONITORING }, ['Kab. Test Satu', 'Kab. Test Dua']);
  const satu = rows.find(r => r.kab === 'Kab. Test Satu');
  assert.equal(satu.pillars.naker.pekerja, 25); /* 20 + 5 */
  assert.equal(satu.pillars.naker.juruMasak, 10);
  /* payroll = (25 + 10) × rata-rata upah 2.250.000 = 78.750.000 */
  assert.equal(satu.pillars.naker.payrollRp, 78750000);
  assert.equal(satu.pillars.naker.dariNonPekerjaan, 2);
  /* upah A +33,33%, B 0% → rata ≈ 16,67% */
  assert.ok(Math.abs(satu.pillars.naker.kenaikanUpahPct - 16.6667) < 0.01);
});

test('Pilar 5 — Serapan: utilisasi kapasitas & cakupan sekolah', () => {
  const rows = computeEconomyAnalytics({ units: UNITS, monitoring: MONITORING }, ['Kab. Test Satu', 'Kab. Test Dua']);
  const satu = rows.find(r => r.kab === 'Kab. Test Satu');
  /* u1: 2500/3000=83,33%; u2: 800/1000=80% → rata 81,67% */
  assert.ok(Math.abs(satu.pillars.serapan.utilisasiPct - (2500 / 3000 * 100 + 80) / 2) < 0.01);
  assert.ok(Math.abs(satu.pillars.serapan.sekolahCovPct - (45 / 50 * 100 + 75) / 2) < 0.01);
});

test('KDMP tidak dihitung sebagai rekaman SPPG; kab kosong → null bukan 0', () => {
  const rows = computeEconomyAnalytics({ units: UNITS, monitoring: MONITORING }, ['Kab. Test Satu', 'Kab. Kosong']);
  const kosong = rows.find(r => r.kab === 'Kab. Kosong');
  assert.equal(kosong.nUnitsSppg, 0);
  assert.equal(kosong.pillars.dana.topUpRp, null);
  assert.equal(kosong.pillars.serapan.utilisasiPct, null);
});

test('Pemisahan hitungan: kunjungan SPPG vs form NAKER vs total rekaman', () => {
  const rows = computeEconomyAnalytics({ units: UNITS, monitoring: MONITORING }, ['Kab. Test Satu', 'Kab. Test Dua']);
  const satu = rows.find(r => r.kab === 'Kab. Test Satu');
  /* m1+m2 = 2 kunjungan SPPG; n1+n2 = 2 form NAKER */
  assert.equal(satu.nSppgVisits, 2);
  assert.equal(satu.nNaker, 2);
  assert.equal(satu.nRecords, 4);
  assert.equal(satu.nPrimary, 2); /* SPPG+KDMP = 2 (tidak ada KDMP di fixture) */
  const dua = rows.find(r => r.kab === 'Kab. Test Dua');
  assert.equal(dua.nSppgVisits, 1);
  assert.equal(dua.nNaker, 0);
});

test('normalizeScore: min-maks antar kabupaten, tanpa komposit', () => {
  assert.equal(normalizeScore(10, [10, 20, 30]), 0);
  assert.equal(normalizeScore(20, [10, 20, 30]), 50);
  assert.equal(normalizeScore(30, [10, 20, 30]), 100);
  assert.equal(normalizeScore(null, [10, 20]), null);
  assert.equal(normalizeScore(5, [5, 5]), 100); /* semua sama → 100 */
});
