/* ============================================================
   PLAN 2 BAGIAN 2 — LENSE EKONOMI DAERAH (domain murni)
   Agregasi 5 pilar indikator proksi kawasan MBG per kabupaten,
   seluruhnya dari field monev existing (tanpa field baru).
   CATATAN METODOLOGI: indikator proksi kawasan MBG — bukan
   statistik resmi (bukan PDRB/inflasi BPS); selalu tampilkan n.
============================================================ */
const JUTA = 1000000;

function num(v){ const n = Number(v); return (v === '' || v == null || !Number.isFinite(n)) ? null : n; }
function gridTotal(fields, id){ const g = fields && fields[id]; return num(g && g.total); }
function jutaToRp(stored){ const n = num(stored); return n == null ? null : Math.round(n * JUTA); }
function mean(arr){ const v = arr.filter(x => x != null && Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }
function pct(a, b){ return (a == null || b == null || b === 0) ? null : (a / b) * 100; }

/* skor 0–100 per pilar (min–max antar kabupaten; tanpa komposit gabungan) */
export function normalizeScore(value, values){
  const nums = values.filter(v => v != null && Number.isFinite(v)).map(Number);
  if (value == null || !Number.isFinite(Number(value))) return null;
  if (nums.length === 0) return null;
  const min = Math.min(...nums), max = Math.max(...nums);
  if (max === min) return 100;
  return Math.round(((Number(value) - min) / (max - min)) * 100);
}

export function recordKind(record, unit){
  if (record && record.formType) return record.formType;
  if (record && record.jenis) return record.jenis;
  return unit ? unit.jenis : '';
}

/*
  computeEconomyAnalytics({ units, monitoring }, kabupatenKeys?) →
  [{ kab, nUnitsSppg, nRecords, pillars: { dana, lokal, harga, naker, serapan } }]
*/
export function computeEconomyAnalytics(db, kabupatenKeys){
  const units = (db && db.units) || [];
  const monitoring = (db && db.monitoring) || [];
  const unitById = id => units.find(u => u.id === id) || null;
  const kabs = (kabupatenKeys && kabupatenKeys.length)
    ? kabupatenKeys.slice()
    : [...new Set(units.map(u => u.kab).filter(Boolean))];

  return kabs.map(kab => {
    const kabUnits = units.filter(u => u.kab === kab);
    const sppgUnits = kabUnits.filter(u => u.jenis === 'SPPG');
    const kabRecs = monitoring.filter(m => { const u = unitById(m.unitId); return !!u && u.kab === kab; });
    /* KUNJUNGAN = rekaman SPPG (form NAKER hanya kelengkapan kunjungan; monitoring KDMP tidak dipakai lensa ini) */
    const kabSppgVisits = kabRecs.filter(m => recordKind(m, unitById(m.unitId)) === 'SPPG');
    const kabNakerCount = kabRecs.filter(m => recordKind(m, unitById(m.unitId)) === 'NAKER').length;

    /* rekaman SPPG terbaru per unit */
    const latest = sppgUnits.map(u => {
      const recs = monitoring
        .filter(m => m.unitId === u.id && recordKind(m, u) === 'SPPG')
        .sort((a, b) => String(b.tgl || '').localeCompare(String(a.tgl || '')));
      return { unit: u, m: recs[0] || null };
    });
    const withM = latest.filter(x => x.m && x.m.form && x.m.form.fields);
    const F = x => (x.m && x.m.form && x.m.form.fields) || {};

    /* PILAR 1 — Injeksi Dana (top-up BGN, saldo VA) */
    const danaVals = withM.map(x => jutaToRp(F(x).sp403)).filter(v => v != null);
    const dana = {
      topUpRp: danaVals.length ? danaVals.reduce((a, b) => a + b, 0) : null,
      rataPerSppgRp: mean(danaVals.map(v => Math.round(v))),
      n: danaVals.length,
    };

    /* PILAR 2 — Kandungan lokal belanja (sp411 dalam vs luar; sp410 grup pemasok) */
    let dalamRp = 0, luarRp = 0, lokalN = 0;
    withM.forEach(x => {
      const g = F(x).sp411;
      if (!g || typeof g !== 'object') return;
      let d = 0, l = 0, has = false;
      Object.keys(g).forEach(row => {
        if (row === 'total') return;
        const cell = g[row] || {};
        const dv = jutaToRp(cell.dalam), lv = jutaToRp(cell.luar);
        if (dv != null) { d += dv; has = true; }
        if (lv != null) { l += lv; has = true; }
      });
      if (has) { dalamRp += d; luarRp += l; lokalN++; }
    });
    let coopRp = 0, totalBelanjaRp = 0, belanjaN = 0;
    withM.forEach(x => {
      const g = F(x).sp410;
      const tot = jutaToRp(g && g.total);
      if (tot == null) return;
      totalBelanjaRp += tot; belanjaN++;
      ['kdkmp', 'bumdes', 'umkm'].forEach(key => { const v = jutaToRp(g[key]); if (v != null) coopRp += v; });
    });
    const lokal = {
      dalamRp: lokalN ? dalamRp : null,
      luarRp: lokalN ? luarRp : null,
      localContentPct: (dalamRp + luarRp) > 0 ? (dalamRp / (dalamRp + luarRp)) * 100 : null,
      koperasiPct: totalBelanjaRp > 0 ? (coopRp / totalBelanjaRp) * 100 : null, /* pembilang & penyebut sama-sama sp410 */
      totalBelanjaRp: lokalN ? dalamRp + luarRp : null, /* konsistensi: total belanja bahan = sp411 (dalam+luar), bukan sp410 */
      n: Math.max(lokalN, belanjaN),
    };

    /* PILAR 3 — Indeks harga bahan baku (sp412 bulan ini vs lalu, Rp Ribu/kg) */
    const changes = [];
    withM.forEach(x => {
      const g = F(x).sp412;
      if (!g || typeof g !== 'object') return;
      ['beras', 'ayam', 'telur', 'susu'].forEach(key => {
        const c = g[key] || {};
        const ini = num(c.ini), lalu = num(c.lalu);
        const ch = pct(ini && lalu ? ini - lalu : null, lalu);
        if (ch != null) changes.push(ch);
      });
    });
    const harga = { changePct: mean(changes), nKomoditas: changes.length };

    /* PILAR 4 — Ketenagakerjaan (sp205/sp206 + form NAKER) */
    const workers = withM.map(x => num(F(x).sp205)).filter(v => v != null);
    const juru = withM.map(x => num(F(x).sp206)).filter(v => v != null);
    const nakerRecs = kabRecs.filter(m => recordKind(m, unitById(m.unitId)) === 'NAKER');
    const upah = nakerRecs.map(m => num(((m.form || {}).fields || {}).nk207)).filter(v => v != null && v > 0);
    const upahLama = nakerRecs.map(m => num(((m.form || {}).fields || {}).nk203)).filter(v => v != null && v > 0);
    const totalPekerja = (workers.length ? workers.reduce((a, b) => a + b, 0) : null);
    const totalJuru = (juru.length ? juru.reduce((a, b) => a + b, 0) : null);
    const upahMean = mean(upah);
    const payroll = (totalPekerja != null || totalJuru != null) && upahMean != null
      ? Math.round(((totalPekerja || 0) + (totalJuru || 0)) * upahMean)
      : null;
    const newJobs = nakerRecs.filter(m => {
      const v = ((m.form || {}).fields || {}).nk204;
      return v === 'Mencari Pekerjaan' || v === 'Ibu/Bapak Rumah Tangga' || v === 'Sekolah';
    }).length;
    const uplifts = nakerRecs.map(m => {
      const f = (m.form || {}).fields || {};
      const now = num(f.nk207), before = num(f.nk203);
      return (now != null && before != null && before > 0) ? ((now - before) / before) * 100 : null;
    }).filter(v => v != null);
    const naker = {
      pekerja: totalPekerja, juruMasak: totalJuru,
      payrollRp: payroll, respondenNaker: nakerRecs.length,
      dariNonPekerjaan: newJobs,
      kenaikanUpahPct: mean(uplifts),
      n: Math.max(workers.length, nakerRecs.length),
    };

    /* PILAR 5 — Serapan (realisasi vs kapasitas master) */
    const utils = [], sekCov = [];
    withM.forEach(x => {
      const porsi = gridTotal(F(x), 'sp201');
      const kap = num(x.unit.kapasitas);
      const u = pct(porsi, kap); if (u != null) utils.push(u);
      const sek = gridTotal(F(x), 'sp202');
      const target = num(x.unit.sekolah);
      const sc = pct(sek, target); if (sc != null) sekCov.push(sc);
    });
    const serapan = { utilisasiPct: mean(utils), sekolahCovPct: mean(sekCov), n: utils.length };

    return {
      kab,
      nUnitsSppg: sppgUnits.length,
      nRecords: kabRecs.length,
      nPrimary: kabRecs.length - kabNakerCount, /* SPPG+KDMP (kompatibilitas) */
      nSppgVisits: kabSppgVisits.length,
      nNaker: kabNakerCount,
      pillars: { dana, lokal, harga, naker, serapan },
    };
  });
}
