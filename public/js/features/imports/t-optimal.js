import { getAppContext } from '../../core/context.js';
import { normalizeTOptimalBundle } from '../../domain/imports/t-optimal-map.js';
import { attachSppgAnalytics } from '../../domain/monitoring/operational-analytics.js';

const { repositories } = getAppContext();
const unitsRepository = repositories.units;
const monitoringRepository = repositories.monitoring;
const UNIT_ALIAS_KEY = 'darma_toptimal_unit_aliases_v1';
let importState = { bundle: null, rows: [], filters: {}, mode: 'sppg' };
let pendingImportMode = '';

function norm(value) {
  return String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/kabupaten/g, 'kab.').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function dateOnly(value, fallback) {
  const raw = String(value == null ? '' : value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const dmY = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmY) return `${dmY[3]}-${dmY[2].padStart(2, '0')}-${dmY[1].padStart(2, '0')}`;
  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : fallback;
}

function number(value, fallback = 0) {
  const n = Number(String(value == null ? '' : value).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function stableId(prefix, value) {
  let h = 2166136261;
  for (const ch of String(value)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return `${prefix}${(h >>> 0).toString(36)}`;
}

function sourceKey(item) { return `toptimal:${item.sheetName}:${item.sourceId}`; }

function naturalUnitKey(item) {
  const unit = findUnit(item.identity, item.formType === 'KDMP' ? 'KDMP' : 'SPPG');
  if (unit) return unit.id;
  const identity = item.identity || {};
  return `name:${norm(identity.name)}|kab:${norm(identity.kab)}|kec:${norm(identity.kec)}|desa:${norm(identity.desa)}`;
}

function naturalKey(item) {
  if (item.formType !== 'SPPG' || !item.tgl || !item.identity?.name) return '';
  return `natural:sppg:${naturalUnitKey(item)}:${item.tgl}`;
}

function compactName(value) {
  let key = norm(value).replace(/^sppg/, '').replace(/\b(sppg|dapur|mbg)\b/g, ' ').replace(/\bno\.?\b/g, ' ');
  key = key.replace(/\b0+(\d+)\b/g, '$1').replace(/[^a-z0-9]/g, '');
  return key.replace(/0+(\d+)$/, '$1');
}

function aliasKey(identity, jenis = 'SPPG') {
  const item = identity || {};
  return `${jenis}|${compactName(item.name)}|${norm(item.kab)}|${norm(item.kec)}|${norm(item.desa)}`;
}
function loadUnitAliases() {
  try { return JSON.parse(localStorage.getItem(UNIT_ALIAS_KEY) || '{}'); } catch { return {}; }
}
function rememberUnitAlias(item, unit) {
  if (!unit || !item?.identity?.name) return;
  const aliases = loadUnitAliases();
  aliases[aliasKey(item.identity, unit.jenis)] = { unitId: unit.id, unitName: unit.nama, savedAt: new Date().toISOString() };
  localStorage.setItem(UNIT_ALIAS_KEY, JSON.stringify(aliases));
}
function unitByAlias(identity, jenis = 'SPPG') {
  const alias = loadUnitAliases()[aliasKey(identity, jenis)];
  return alias?.unitId ? unitsRepository.getById(alias.unitId) : null;
}

function levenshteinRatio(a, b) {
  if (!a || !b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = prev[0]; prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = old;
    }
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length);
}

function coordinateDistanceMeters(aLat, aLng, bLat, bLng) {
  const lat1 = Number(aLat), lon1 = Number(aLng), lat2 = Number(bLat), lon2 = Number(bLng);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
  const rad = Math.PI / 180, dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function rankUnitCandidates(identity, jenis = 'SPPG') {
  const sourceName = compactName(identity?.name), sourceKab = norm(identity?.kab), sourceKec = norm(identity?.kec), sourceDesa = norm(identity?.desa);
  if (!sourceName) return [];
  return unitsRepository.getAll().filter(unit => unit.jenis === jenis).map(unit => {
    const targetName = compactName(unit.nama), ratio = levenshteinRatio(sourceName, targetName);
    const exactName = sourceName === targetName;
    const namePartial = sourceName.length > 5 && (targetName.includes(sourceName) || sourceName.includes(targetName));
    const sameKab = Boolean(sourceKab && norm(unit.kab) === sourceKab);
    const sameKec = Boolean(sourceKec && norm(unit.kec) === sourceKec);
    const sameDesa = Boolean(sourceDesa && norm(unit.desa) === sourceDesa);
    const distance = coordinateDistanceMeters(identity?.lat, identity?.lng, unit.lat, unit.lng);
    let score = exactName ? 62 : namePartial ? 46 : ratio >= 0.82 ? 40 : ratio >= 0.68 ? 25 : 0;
    const reasons = [];
    if (exactName) reasons.push('nama dinormalisasi sama'); else if (namePartial) reasons.push('nama sebagian cocok'); else if (ratio >= 0.68) reasons.push('nama mirip');
    if (sameKab) { score += 14; reasons.push('kabupaten sama'); }
    if (sameKec) { score += 14; reasons.push('kecamatan sama'); }
    if (sameDesa) { score += 8; reasons.push('desa sama'); }
    if (distance !== null && distance <= 50) { score += 30; reasons.push(`${Math.round(distance)} m`); }
    else if (distance !== null && distance <= 150) { score += 22; reasons.push(`${Math.round(distance)} m`); }
    else if (distance !== null && distance <= 500) { score += 10; reasons.push(`${Math.round(distance)} m`); }
    return { unit, score, ratio, exactName, distance, reasons };
  }).sort((a, b) => b.score - a.score || (a.distance ?? Infinity) - (b.distance ?? Infinity));
}

function findUnit(identity, jenis = 'SPPG') {
  const remembered = unitByAlias(identity, jenis);
  if (remembered) return remembered;
  const candidates = rankUnitCandidates(identity, jenis);
  const best = candidates[0];
  const second = candidates[1];
  if (!best) return null;
  const confident = best.score >= 75 || (best.exactName && (!second || best.score - second.score >= 8));
  return confident ? best.unit : null;
}

function unitTypeForItem(item) { return item?.formType === 'KDMP' ? 'KDMP' : 'SPPG'; }
function rowUnit(row) {
  const manual = row?.manualUnitId ? unitsRepository.getById(row.manualUnitId) : null;
  return manual || findUnit(row.item.identity, unitTypeForItem(row.item));
}
function candidatePool(row) {
  const jenis = unitTypeForItem(row.item);
  const ranked = rankUnitCandidates(row.item.identity, jenis).filter(candidate => candidate.score >= 45);
  const rankedIds = new Set(ranked.map(candidate => candidate.unit.id));
  const pool = unitsRepository.getAll().filter(unit => unit.jenis === jenis && !rankedIds.has(unit.id)).sort((a, b) => a.nama.localeCompare(b.nama));
  return { ranked: ranked.slice(0, 20), pool };
}
function candidateOptionHtml(row) {
  const mapped = rowUnit(row), query = norm(row.candidateQuery || '');
  const { ranked, pool } = candidatePool(row);
  const options = [];
  if (mapped) options.push(`<option value="${esc(mapped.id)}" selected>✓ ${esc(mapped.nama)} · Master saat ini</option>`);
  const choices = [...ranked.map(candidate => ({ unit: candidate.unit, label: `${candidate.unit.nama} · kandidat ${Math.min(99, Math.round(candidate.score))}%${candidate.distance !== null ? ` · ${Math.round(candidate.distance)} m` : ''}` })), ...pool.map(unit => ({ unit, label: `${unit.nama} · pilih manual` }))];
  choices.filter(choice => !mapped || choice.unit.id !== mapped.id).filter(choice => !query || norm([choice.unit.nama, choice.unit.kab, choice.unit.kec, choice.unit.desa].join(' ')).includes(query)).slice(0, 60).forEach(choice => options.push(`<option value="${esc(choice.unit.id)}">${esc(choice.label)}</option>`));
  return `<option value="">Pilih Master Unit...</option>${options.join('')}`;
}
function candidateOptions(row) {
  const mapped = rowUnit(row), { ranked, pool } = candidatePool(row);
  if (!mapped && !ranked.length && !pool.length) return '<small class="import-no-candidate">Belum ada Master Unit untuk dipasangkan.</small>';
  return `<div class="import-map-control"><small>Pasangkan ke Master Unit:</small><input class="fc import-candidate-search" data-import-key="${esc(row.key)}" placeholder="Cari nama/kecamatan..." value="${esc(row.candidateQuery || '')}" oninput="filterTOptimalCandidateOptions(this.dataset.importKey,this.value)"><select class="fc import-candidate-select" data-import-key="${esc(row.key)}" onchange="assignTOptimalUnit(this.dataset.importKey,this.value)">${candidateOptionHtml(row)}</select></div>`;
}
function filterTOptimalCandidateOptions(key, query) {
  const row = importState.rows.find(item => item.key === key);
  if (!row) return;
  row.candidateQuery = query || '';
  const select = document.querySelector(`select.import-candidate-select[data-import-key="${CSS.escape(key)}"]`);
  if (select) select.innerHTML = candidateOptionHtml(row);
}
function assignTOptimalUnit(key, unitId) {
  const row = importState.rows.find(item => item.key === key);
  if (!row) return;
  row.manualUnitId = unitId || '';
  if (unitId && row.item.formType === 'SPPG' && row.tgl) {
    row.naturalKey = `natural:sppg:${unitId}:${row.tgl}`;
    const existing = monitoringRepository.getAll().find(record => record.formType === 'SPPG' && record.unitId === unitId && record.tgl === row.tgl);
    if (existing) { row.status = 'duplikat-hari'; row.existingId = existing.id; }
    else row.status = 'baru';
  }
  row.selected = Boolean(unitId) && (importState.mode === 'coordinates' ? hasValidCoordinates(row.item.identity) : displayStatus(row) === 'baru');
  renderImportSummary();
}

function makeUnit(item) {
  const identity = item.identity || {};
  const raw = item.raw || {};
  const name = identity.name || `SPPG T-OPTIMAL ${item.sourceId}`;
  const jenis = item.formType === 'KDMP' ? 'KDMP' : 'SPPG';
  return {
    id: stableId('topt-unit-', `${jenis}|${name}|${identity.kab}|${identity.kec}`), jenis, nama: name,
    ref: `T-OPTIMAL:${item.sourceId}`, status: String(raw.q104_beroperasi || '').toLowerCase().includes('tidak') ? 'kendala' : 'aktif',
    kab: identity.kab || '', kec: identity.kec || '', desa: identity.desa || '', alamat: '',
    lat: number(identity.lat), lng: number(identity.lng), pic: '', telp: '',
    note: `Unit dibuat saat impor T-OPTIMAL (${item.sheetName}, respons ${item.sourceId}). Periksa master unit.`,
    yayasan: '', kapasitas: 0, sekolah: 0, slhs: 'belum', mulai: '', anggota: 0, peran: '', usaha: ''
  };
}

function makeMonitoring(item, unit, bundle) {
  const raw = item.raw || {};
  const fallbackDate = dateOnly(bundle?.exportedAt, new Date().toISOString().slice(0, 10));
  const form = item.formType === 'KDMP'
    ? Object.assign({}, item.fields, { raw, _source: { system: 'T-OPTIMAL', responseId: item.sourceId, sheetName: item.sheetName, importedAt: new Date().toISOString(), normalizationVersion: 't-optimal-darma-v1', scope: bundle?.scope || {} } })
    : {
      version: item.formType === 'SPPG' ? 'SPPG-2026-08' : 'NAKER-REMOTE',
      fields: item.fields, raw,
      _source: { system: 'T-OPTIMAL', responseId: item.sourceId, sheetName: item.sheetName, importedAt: new Date().toISOString(), normalizationVersion: 't-optimal-darma-v1', scope: bundle?.scope || {} }
    };
  const record = {
    id: sourceKey(item), unitId: unit.id, tgl: dateOnly(item.tgl, fallbackDate),
    petugas: item.petugas || bundle?.scope?.email || 'T-OPTIMAL', jenis: item.formType === 'KDMP' ? 'KDMP' : 'SPPG', formType: item.formType,
    form,
    hasil: item.formType === 'KDMP' ? (item.fields.hasil || 'sudah') : 'sudah', kebersihan: '', gizi: '', distribusi: '', dok: item.fileUrl ? 'baik' : '',
    temuan: String(raw.analisisSurveyor || '').trim() || `Respons ${item.formType} diimpor dari T-OPTIMAL.`, rekom: ''
  };
  return item.formType === 'SPPG' ? attachSppgAnalytics(record, unit) : record;
}

function rowStatus(item, existingIds) {
  if (!item.sourceId) return 'invalid';
  if (existingIds.has(sourceKey(item))) return 'sudah-ada';
  if (!item.identity?.name) return 'tanpa-unit';
  return findUnit(item.identity, item.formType === 'KDMP' ? 'KDMP' : 'SPPG') ? 'baru' : 'unit-baru';
}

function statusLabel(status) {
  return ({ baru: 'Data baru', 'sudah-ada': 'Sudah ada', 'duplikat-hari': 'Duplikat SPPG/hari', 'duplikat-file': 'Duplikat dalam file', 'siap-mapping': 'Sudah dipetakan', 'perlu-pemetaan': 'Perlu pemetaan', 'siap-koordinat': 'Siap update koordinat', 'unit-baru': 'Unit belum ada', 'tanpa-unit': 'Nama unit kosong', invalid: 'Tidak valid' })[status] || status;
}

function coordinateValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hasValidCoordinates(identity) {
  const lat = coordinateValue(identity?.lat), lng = coordinateValue(identity?.lng);
  return lat !== null && lng !== null && lat !== 0 && lng !== 0 && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function coordinateText(value) {
  const n = coordinateValue(value);
  return n === null ? '—' : n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

function coordinateCell(row) {
  const incoming = row.item.identity || {};
  const unit = rowUnit(row);
  const incomingText = hasValidCoordinates(incoming) ? `${coordinateText(incoming.lat)}, ${coordinateText(incoming.lng)}` : 'Tidak tersedia';
  const existingText = unit && hasValidCoordinates(unit) ? `${coordinateText(unit.lat)}, ${coordinateText(unit.lng)}` : 'Master kosong';
  return `<div><small>JSON: ${esc(incomingText)}</small><small>Master: ${esc(existingText)}</small></div>`;
}

const MODE_HELP = {
  mapping: 'Pasangkan nama/identitas dari T-Optimal ke Master Unit DARMA-1. Mapping disimpan di browser dan tidak mengubah database.',
  coordinates: 'Hanya menampilkan respons yang memiliki koordinat dan mencocokkannya dengan Master Unit. Tidak membuat monitoring baru.',
  sppg: 'Mengimpor monitoring SPPG/MBG. Satu Master Unit pada tanggal survei yang sama diperlakukan sebagai satu rekaman.',
  naker: 'Mengimpor monitoring Tenaga Kerja. Banyak responden pada SPPG dan tanggal yang sama tetap diperbolehkan.',
  kdmp: 'Mengimpor monitoring KDMP/KKMP dan mencocokkannya dengan Master Unit berjenis KDMP.'
};

function currentTOptimalMode() { return document.getElementById('toptProcessMode')?.value || importState.mode || 'coordinates'; }
function modeMatches(row) {
  const mode = importState.mode || currentTOptimalMode();
  if (mode === 'mapping') return Boolean(row.item.identity?.name);
  if (mode === 'coordinates') return hasValidCoordinates(row.item.identity);
  if (mode === 'sppg') return row.item.formType === 'SPPG';
  if (mode === 'naker') return row.item.formType === 'NAKER';
  if (mode === 'kdmp') return row.item.formType === 'KDMP';
  return true;
}
function displayStatus(row) {
  const unit = rowUnit(row);
  if (importState.mode === 'mapping') {
    return unit ? 'siap-mapping' : row.item.identity?.name ? 'perlu-pemetaan' : 'tanpa-unit';
  }
  if (importState.mode === 'coordinates') {
    if (!unit) return 'unit-baru';
    return hasValidCoordinates(row.item.identity) ? 'siap-koordinat' : 'invalid';
  }
  if (row.status === 'unit-baru' && unit) return 'baru';
  return row.status;
}
function changeTOptimalMode() {
  importState.mode = currentTOptimalMode();
  const help = document.getElementById('toptModeHelp'); if (help) help.textContent = MODE_HELP[importState.mode] || '';
  const updateCoordinates = document.getElementById('toptUpdateCoordinates');
  const autoCreate = document.getElementById('toptAutoCreateUnits');
  const replaceSameDay = document.getElementById('toptReplaceSameDay');
  if (updateCoordinates) { updateCoordinates.checked = importState.mode === 'coordinates'; updateCoordinates.disabled = importState.mode === 'coordinates' || importState.mode === 'mapping'; }
  if (autoCreate) { autoCreate.disabled = importState.mode === 'coordinates' || importState.mode === 'mapping'; autoCreate.checked = false; }
  if (replaceSameDay) { replaceSameDay.disabled = importState.mode !== 'sppg'; if (importState.mode !== 'sppg') replaceSameDay.checked = false; }
  const head = document.getElementById('toptImportHead');
  if (head) head.innerHTML = importState.mode === 'mapping'
    ? '<tr><th style="width:34px">Pilih</th><th>Nama dari T-Optimal</th><th>Pasangkan ke Master Unit</th><th>Wilayah</th><th>Koordinat</th><th>Status</th></tr>'
    : '<tr><th style="width:34px">Pilih</th><th>Form</th><th>SPPG / Unit</th><th>Tanggal</th><th>ID Respons</th><th>Koordinat</th><th>Status</th></tr>';
  const commit = document.getElementById('toptImportCommit');
  if (commit) commit.innerHTML = importState.mode === 'mapping' ? '<i class="fas fa-link"></i> Simpan Pemetaan Browser' : importState.mode === 'coordinates' ? '<i class="fas fa-map-marker-alt"></i> Simpan Koordinat Terpilih' : '<i class="fas fa-check"></i> Tambahkan Data Terpilih';
  importState.rows.forEach(row => { row.selected = modeMatches(row) && (importState.mode === 'mapping' ? Boolean(rowUnit(row)) : importState.mode === 'coordinates' ? displayStatus(row) === 'siap-koordinat' : row.status === 'baru'); });
  renderImportSummary();
}

function getFilters() {
  return {
    form: document.getElementById('toptFilterForm')?.value || '',
    status: document.getElementById('toptFilterStatus')?.value || '',
    kab: document.getElementById('toptFilterKab')?.value || '',
    search: (document.getElementById('toptFilterSearch')?.value || '').toLowerCase().trim(),
    start: document.getElementById('toptFilterStart')?.value || '',
    end: document.getElementById('toptFilterEnd')?.value || ''
  };
}

function visibleRows() {
  const f = getFilters();
  return importState.rows.filter(row => {
    if (!modeMatches(row)) return false;
    const item = row.item, identity = item.identity || {};
    if (f.form && item.formType !== f.form) return false;
    if (f.status && displayStatus(row) !== f.status) return false;
    if (f.kab && identity.kab !== f.kab) return false;
    if (f.start && row.tgl < f.start) return false;
    if (f.end && row.tgl > f.end) return false;
    if (f.search) {
      const hay = [identity.name, identity.kab, identity.kec, identity.desa, item.sourceId, item.formType].join(' ').toLowerCase();
      if (!hay.includes(f.search)) return false;
    }
    return true;
  });
}

function renderImportSummary() {
  const all = importState.rows;
  const visible = visibleRows();
  const selected = all.filter(row => row.selected && modeMatches(row)).length;
  const counts = all.filter(modeMatches).reduce((out, row) => { const status = displayStatus(row); out[status] = (out[status] || 0) + 1; return out; }, {});
  const meta = document.getElementById('toptImportMeta');
  const coordinateCount = all.filter(row => modeMatches(row) && hasValidCoordinates(row.item.identity)).length;
  if (meta) meta.innerHTML = `<b>${all.length}</b> respons dibaca · tampil <b>${visible.length}</b> · dipilih <b>${selected}</b> · baru <b>${counts.baru || 0}</b> · sudah ada <b>${counts['sudah-ada'] || 0}</b> · duplikat hari <b>${counts['duplikat-hari'] || 0}</b> · duplikat file <b>${counts['duplikat-file'] || 0}</b> · unit belum ada <b>${counts['unit-baru'] || 0}</b> · koordinat valid <b>${coordinateCount}</b>`;
  const body = document.getElementById('toptImportRows');
  if (!body) return;
  body.innerHTML = visible.length ? visible.map(row => {
    const item = row.item, identity = item.identity || {}, checked = row.selected ? 'checked' : '';
    const checkbox = `<td><input type="checkbox" ${checked} data-import-key="${esc(row.key)}" onchange="toggleTOptimalRow(this.dataset.importKey,this.checked)"></td>`;
    const status = `<span class="import-status ${displayStatus(row)}">${statusLabel(displayStatus(row))}</span>`;
    if (importState.mode === 'mapping') {
      return `<tr>${checkbox}<td><b>${esc(identity.name || '—')}</b><small>ID: ${esc(item.sourceId || '—')}</small></td><td>${candidateOptions(row)}</td><td>${esc(identity.kab || '—')} · ${esc(identity.kec || '—')} · ${esc(identity.desa || '—')}</td><td>${coordinateCell(row)}</td><td>${status}</td></tr>`;
    }
    return `<tr>${checkbox}<td><span class="import-type-chip ${item.formType === 'NAKER' ? 'naker' : item.formType === 'KDMP' ? 'kdmp' : 'sppg'}">${item.formType}</span></td><td><b>${esc(identity.name || '—')}</b><small>${esc(identity.kab || '')} · ${esc(identity.kec || '')}</small>${candidateOptions(row)}</td><td>${esc(row.tgl || '—')}</td><td>${esc(item.sourceId)}</td><td>${coordinateCell(row)}</td><td>${status}</td></tr>`;
  }).join('') : `<tr><td colspan="${importState.mode === 'mapping' ? 6 : 7}" class="text-center text-muted py-3">Tidak ada data yang cocok dengan filter.</td></tr>`;
  const commit = document.getElementById('toptImportCommit');
  if (commit) commit.disabled = selected === 0;
}

function toggleTOptimalRow(key, checked) {
  const row = importState.rows.find(item => item.key === key);
  if (row) row.selected = checked;
  renderImportSummary();
}

function filterTOptimalPreview() { renderImportSummary(); }
function selectAllTOptimal(checked) {
  visibleRows().forEach(row => {
    const safeForNewImport = !['invalid', 'sudah-ada', 'duplikat-hari', 'duplikat-file', 'unit-baru', 'perlu-pemetaan', 'tanpa-unit'].includes(displayStatus(row));
    row.selected = checked && safeForNewImport;
  });
  renderImportSummary();
}

function resetTOptimalFilters() {
  ['toptFilterForm', 'toptFilterStatus', 'toptFilterKab', 'toptFilterSearch', 'toptFilterStart', 'toptFilterEnd'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderImportSummary();
}

function openImportModal() { document.getElementById('mTOptimalImport')?.classList.remove('hidden'); }
function closeImportModal() { document.getElementById('mTOptimalImport')?.classList.add('hidden'); }
function openTOptimalImportMode() { closeTOptimalProcessMenu(); document.getElementById('mTOptimalImportMode')?.classList.remove('hidden'); }
function closeTOptimalImportMode() { document.getElementById('mTOptimalImportMode')?.classList.add('hidden'); }
function chooseTOptimalImportMode(mode) { pendingImportMode = mode; closeTOptimalImportMode(); document.getElementById('impTOptimal')?.click(); }

function importTOptimal(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const bundle = JSON.parse(reader.result);
      if (bundle?.source !== 'T-OPTIMAL' || !Array.isArray(bundle.records)) throw new Error('Format file bukan ekspor T-OPTIMAL yang valid.');
      const existingRecords = monitoringRepository.getAll();
      const existingIds = new Set(existingRecords.map(record => record.id));
      const existingNatural = new Map();
      existingRecords.forEach(record => {
        if (record.formType !== 'SPPG' || !record.unitId || !record.tgl) return;
        existingNatural.set(`natural:sppg:${record.unitId}:${record.tgl}`, record.id);
      });
      const seenSources = new Set();
      const mapped = normalizeTOptimalBundle(bundle);
      const rows = mapped.map(item => {
        const tgl = dateOnly(item.tgl, dateOnly(bundle.exportedAt, ''));
        const prepared = Object.assign({}, item, { tgl });
        const key = sourceKey(prepared);
        const duplicateSource = seenSources.has(key);
        seenSources.add(key);
        const nKey = naturalKey(prepared);
        const existingId = nKey ? existingNatural.get(nKey) || '' : '';
        const status = duplicateSource ? 'sudah-ada' : existingId ? 'duplikat-hari' : rowStatus(prepared, existingIds);
        return { key, item: prepared, naturalKey: nKey, existingId, sourceUpdatedAt: prepared.sourceUpdatedAt || tgl, status, tgl, selected: status === 'baru' };
      });
      const naturalGroups = new Map();
      rows.filter(row => row.naturalKey).forEach(row => {
        const list = naturalGroups.get(row.naturalKey) || [];
        list.push(row); naturalGroups.set(row.naturalKey, list);
      });
      naturalGroups.forEach(list => {
        if (list.length < 2) return;
        list.sort((a, b) => String(b.sourceUpdatedAt).localeCompare(String(a.sourceUpdatedAt)) || String(b.tgl).localeCompare(String(a.tgl)));
        list.slice(1).forEach(row => { row.status = 'duplikat-file'; row.selected = false; });
      });
      const sheetNames = (bundle.sheets || mapped.map(item => item.sheetName)).map(value => String(value).toLowerCase());
      const suggestedMode = sheetNames.some(value => value.includes('naker') || value.includes('tenaga')) ? 'naker'
        : sheetNames.some(value => value.includes('kdkmp') || value.includes('kdmp')) ? 'kdmp' : 'sppg';
      const selectedMode = pendingImportMode || suggestedMode;
      importState = { bundle, rows, filters: {}, mode: selectedMode };
      pendingImportMode = '';
      const modeSelect = document.getElementById('toptProcessMode');
      if (modeSelect) modeSelect.value = selectedMode;
      const kabSelect = document.getElementById('toptFilterKab');
      if (kabSelect) {
        const values = [...new Set(importState.rows.map(row => row.item.identity?.kab).filter(Boolean))].sort();
        kabSelect.innerHTML = '<option value="">Semua Kabupaten/Kota</option>' + values.map(value => `<option>${esc(value)}</option>`).join('');
      }
      resetTOptimalFilters(); openImportModal(); changeTOptimalMode();
    } catch (error) { toast(`File T-OPTIMAL tidak valid: ${error.message || error}`, 'e'); }
    finally { event.target.value = ''; }
  };
  reader.readAsText(file);
}

function commitMappingProcess() {
  const selected = importState.rows.filter(row => row.selected && modeMatches(row) && rowUnit(row));
  if (!selected.length) { toast('Pilih dan pasangkan minimal satu unit Master.', 'e'); return; }
  if (!window.confirm(`Simpan ${selected.length} pemetaan nama T-Optimal ke Master Unit di browser ini?\n\nBelum ada perubahan database.`)) return;
  selected.forEach(row => rememberUnitAlias(row.item, rowUnit(row)));
  closeImportModal();
  toast(`✅ ${selected.length} pemetaan disimpan di browser.`);
}

function commitCoordinateProcess() {
  const selected = importState.rows.filter(row => row.selected && modeMatches(row) && hasValidCoordinates(row.item.identity));
  if (!selected.length) { toast('Pilih minimal satu unit dengan koordinat valid.', 'e'); return; }
  const unresolved = selected.filter(row => !rowUnit(row));
  if (unresolved.length) { toast(`${unresolved.length} unit belum cocok. Sinkronisasi koordinat tidak membuat unit baru.`, 'e'); return; }
  if (!window.confirm(`Perbarui koordinat ${new Set(selected.map(row => row.item.identity?.name).filter(Boolean)).size} Master Unit?\n\nTidak ada monitoring baru yang akan dibuat.`)) return;
  const latestByUnit = new Map();
  selected.forEach(row => {
    const unit = rowUnit(row);
    if (!unit) return;
    const previous = latestByUnit.get(unit.id);
    if (!previous || String(row.tgl || '').localeCompare(String(previous.row.tgl || '')) >= 0) latestByUnit.set(unit.id, { row, unit });
  });
  let updated = 0;
  latestByUnit.forEach(({ row, unit }) => {
    const identity = row.item.identity;
    unitsRepository.save(Object.assign({}, unit, { lat: coordinateValue(identity.lat), lng: coordinateValue(identity.lng) }));
    rememberUnitAlias(row.item, unit);
    updated += 1;
  });
  if (typeof renderAll === 'function') renderAll();
  closeImportModal();
  toast(`✅ ${updated} koordinat Master Unit diperbarui.`);
}

function commitTOptimalImport() {
  if (!CU) { toast('Silakan masuk ke DARMA-1 terlebih dahulu.', 'e'); return; }
  if (CU.role !== 'admin') { toast('Proses T-OPTIMAL hanya dapat dilakukan oleh Admin.', 'e'); return; }
  if (importState.mode === 'mapping') { commitMappingProcess(); return; }
  if (importState.mode === 'coordinates') { commitCoordinateProcess(); return; }
  const selected = importState.rows.filter(row => row.selected && modeMatches(row) && row.status !== 'invalid');
  const autoCreate = Boolean(document.getElementById('toptAutoCreateUnits')?.checked);
  const updateCoordinates = Boolean(document.getElementById('toptUpdateCoordinates')?.checked);
  const replaceSameDay = Boolean(document.getElementById('toptReplaceSameDay')?.checked);
  if (!selected.length) { toast('Pilih minimal satu respons.', 'e'); return; }
  const fileDuplicates = selected.filter(row => row.status === 'duplikat-file');
  if (fileDuplicates.length) { toast('Respons duplikat dalam file tidak dapat disimpan sebagai respons baru. Pilih baris terbaru saja.', 'e'); return; }
  const sameDayDuplicates = selected.filter(row => row.status === 'duplikat-hari');
  if (sameDayDuplicates.length && !replaceSameDay) { toast('Ada respons SPPG dengan unit dan tanggal yang sudah ada. Centang opsi perbarui rekaman tanggal sama jika ingin menggantinya.', 'e'); return; }
  const missing = selected.filter(row => !rowUnit(row));
  if (missing.length && (!autoCreate || CU.role !== 'admin')) {
    toast('Ada unit belum cocok. Centang pembuatan unit otomatis dan gunakan akun Admin, atau hilangkan pilihan unit tersebut.', 'e'); return;
  }
  const coordinateRows = selected.filter(row => hasValidCoordinates(row.item.identity));
  const coordinateNote = updateCoordinates
    ? `\nKoordinat Master Unit akan diperbarui untuk ${new Set(coordinateRows.map(row => row.item.identity?.name).filter(Boolean)).size} unit (koordinat respons terbaru yang terpilih digunakan).`
    : '';
  const replaceNote = replaceSameDay && sameDayDuplicates.length ? `\n${sameDayDuplicates.length} rekaman SPPG dengan tanggal sama akan diperbarui.` : '';
  if (!window.confirm(`Simpan ${selected.length} respons terpilih ke DARMA-1?\n\nNilai keuangan akan dinormalisasi: Rupiah penuh → Rp Juta/Rp Ribu sesuai form DARMA-1.${replaceNote}${coordinateNote}`)) return;

  let imported = 0, skipped = 0, createdUnits = 0;
  const resolved = [];
  selected.forEach(row => {
    let unit = rowUnit(row);
    if (!unit && autoCreate && CU.role === 'admin') { unit = makeUnit(row.item); unitsRepository.save(unit); createdUnits += 1; }
    if (!unit) { skipped += 1; return; }
    resolved.push({ row, unit });
    rememberUnitAlias(row.item, unit);
    const record = makeMonitoring(row.item, unit, importState.bundle);
    if (replaceSameDay && row.status === 'duplikat-hari' && row.existingId) record.id = row.existingId;
    monitoringRepository.save(record); imported += 1;
  });

  let updatedCoordinates = 0;
  if (updateCoordinates) {
    const latestByUnit = new Map();
    resolved.forEach(({ row, unit }) => {
      if (!hasValidCoordinates(row.item.identity)) return;
      const previous = latestByUnit.get(unit.id);
      if (!previous || String(row.tgl || '').localeCompare(String(previous.row.tgl || '')) >= 0) latestByUnit.set(unit.id, { row, unit });
    });
    latestByUnit.forEach(({ row, unit }) => {
      const identity = row.item.identity;
      unitsRepository.save(Object.assign({}, unit, { lat: coordinateValue(identity.lat), lng: coordinateValue(identity.lng) }));
      updatedCoordinates += 1;
    });
  }

  if (typeof renderAll === 'function') renderAll();
  closeImportModal();
  toast(`✅ Impor selesai: ${imported} respons, ${createdUnits} unit baru, ${sameDayDuplicates.length && replaceSameDay ? sameDayDuplicates.length : 0} rekaman SPPG diperbarui, ${updatedCoordinates} koordinat diperbarui, ${skipped} dilewati.`);
}

Object.assign(globalThis, {
  importTOptimal, openImportModal, closeImportModal, filterTOptimalPreview,
  resetTOptimalFilters, selectAllTOptimal, toggleTOptimalRow, assignTOptimalUnit, filterTOptimalCandidateOptions, changeTOptimalMode, commitMappingProcess, commitCoordinateProcess, commitTOptimalImport,
  openTOptimalImportMode, closeTOptimalImportMode, chooseTOptimalImportMode
});
/* Dipakai ulang oleh wizard 'Impor Unit' (features/imports/units-import.js) */
Object.assign(globalThis, { toptMatch: { norm, compactName, levenshteinRatio, coordinateDistanceMeters, rankUnitCandidates } });
