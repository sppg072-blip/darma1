/* ============================================================
   WIZARD "IMPOR UNIT" — pratinjau + validasi kemiripan + keputusan admin
   Pola mengikuti impor T-OPTIMAL: muat file → pratinjau → cocokkan
   otomatis (skor nama/kec/desa/jarak koordinat) → keputusan per baris
   (Baru / Gabung / Lewati) → konfirmasi → simpan.
   Gabung = isi field yang masih kosong pada unit lama (tidak menimpa).
=========================================================== */
const UNIT_FIELDS = ['jenis','nama','ref','status','kab','kec','desa','alamat','lat','lng','pic','telp','note','yayasan','kapasitas','sekolah','slhs','mulai','anggota','peran','usaha'];

let unitsImportState = { rows: [], jenisFilter: '', search: '' };

function iuNormName(value){
  const M = (typeof toptMatch !== 'undefined') ? toptMatch : null;
  if (!M) return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  let key = M.norm(value).replace(/\b(kdmp|koperasi|desa|kelurahan|sppg|dapur|mbg)\b/g, ' ');
  return key.replace(/[^a-z0-9]/g, '');
}

function iuClassify(row){
  const u = row.unit;
  const M = (typeof toptMatch !== 'undefined') ? toptMatch : null;
  if (M && typeof DB !== 'undefined' && DB.units && DB.units.length){
    const identity = { name: u.nama, kab: u.kab, kec: u.kec, desa: u.desa, lat: u.lat, lng: u.lng };
    const ranked = M.rankUnitCandidates(identity, u.jenis) || [];
    row.candidates = ranked.slice(0, 8);
    const best = ranked[0];
    if (best){
      const sameKec = best.reasons.includes('kecamatan sama');
      row.match = { unitId: best.unit.id, unitNama: best.unit.nama, unit: best.unit, score: best.score, ratio: best.ratio, reasons: best.reasons, distance: best.distance };
      if (best.exactName && sameKec){ row.status = 'duplikat'; row.decision = 'skip'; return; }
      if (best.score >= 75){ row.status = 'mirip-kuat'; row.decision = 'merge'; return; }
      if (best.score >= 55){ row.status = 'mirip'; row.decision = 'skip'; return; }
    }
  }
  row.status = 'baru'; row.decision = 'new';
}

function openUnitsImportWizard(){
  if (!CU || CU.role !== 'admin'){ toast('Hanya Admin yang dapat mengimpor unit', 'e'); return; }
  document.getElementById('mImportUnits').classList.remove('hidden');
  renderUnitsImport();
}
function closeUnitsImportWizard(){ document.getElementById('mImportUnits').classList.add('hidden'); }

function handleUnitsImportFile(ev){
  const f = ev.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      const list = Array.isArray(d) ? d : (Array.isArray(d.units) ? d.units : null);
      if (!list) throw 0;
      const existId = new Set((typeof DB !== 'undefined' ? DB.units : []).map(u => u.id));
      unitsImportState.rows = list.filter(Boolean).map((src, i) => {
        const jenis = String(src.jenis || '').toUpperCase();
        const u = { id: '' };
        UNIT_FIELDS.forEach(k => { u[k] = src[k] === undefined ? '' : src[k]; });
        u.jenis = (jenis === 'SPPG' || jenis === 'KDMP') ? jenis : '';
        if (!u.nama || !u.jenis) return null;
        let id = String(src.id || ''); while (!id || existId.has(id)) id = 'iu' + (i + 1) + '-' + Math.random().toString(36).slice(2, 7);
        u.id = id; existId.add(id);
        return { key: 'iu' + i, unit: u, checked: true, match: null, candidates: [] };
      }).filter(Boolean);
      unitsImportState.rows.forEach(iuClassify);
      unitsImportState.jenisFilter = ''; unitsImportState.search = '';
      renderUnitsImport();
      if (!unitsImportState.rows.length) toast('Tidak ada baris unit valid di file', 'e');
      else toast(`📂 ${unitsImportState.rows.length} baris dimuat — periksa kecocokan sebelum menyimpan`);
    } catch (e) { toast('File unit tidak valid (butuh {units:[...]})', 'e'); }
  };
  r.readAsText(f); ev.target.value = '';
}

function iuStatusChip(status){
  const map = { baru:['iu-chip baru','✅ Baru'], 'mirip-kuat':['iu-chip mirip','🔗 Mirip kuat'], mirip:['iu-chip mirip','🔗 Mirip'], duplikat:['iu-chip dup','⏭️ Duplikat'] };
  const m = map[status] || map.baru; return `<span class="${m[0]}">${m[1]}</span>`;
}

function renderUnitsImport(){
  const body = document.getElementById('iuBody'); if (!body) return;
  const meta = document.getElementById('iuMeta');
  if (!unitsImportState.rows.length){
    if (meta) meta.innerHTML = 'Pilih file JSON berisi {units:[...]} — mis. hasil sampling DJPb atau backup unit DARMA-1.';
    body.innerHTML = '<div class="empty"><i class="fas fa-file-import"></i><p>Belum ada file dimuat.</p></div>';
    return;
  }
  const q = unitsImportState.search.toLowerCase();
  const rows = unitsImportState.rows.filter(r => {
    if (unitsImportState.jenisFilter && r.unit.jenis !== unitsImportState.jenisFilter) return false;
    if (q){
      const hay = (r.unit.nama + ' ' + r.unit.kec + ' ' + r.unit.kab + ' ' + r.unit.desa + ' ' + (r.match ? r.match.unitNama : '')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const cnt = s => unitsImportState.rows.filter(r => r.status === s).length;
  if (meta) meta.innerHTML = `<b>${rows.length}</b> baris tampil · ${cnt('baru')} baru · ${cnt('mirip') + cnt('mirip-kuat')} kemiripan · ${cnt('duplikat')} duplikat — baris tercentang & berkeputusan akan diproses.`;
  if (!rows.length){ body.innerHTML = '<div class="empty"><i class="fas fa-filter"></i><p>Tidak ada baris sesuai filter.</p></div>'; return; }
  body.innerHTML = `<table class="iu-table"><thead><tr>
    <th>Pilih</th><th>Unit di file</th><th>Status &amp; kandidat</th><th>Keputusan</th>
  </tr></thead><tbody>${rows.map(row => {
    const u = row.unit, m = row.match;
    const kandidatHtml = m
      ? `<div class="iu-match"><small>↳ cocok: <b>${esc(m.unitNama)}</b>${m.distance != null ? ` · ${Math.round(m.distance)} m` : ''} · skor ${Math.round(m.score)} (${m.reasons.slice(0,3).join(', ')})</small>
         <select class="fc iu-select" onchange="iuAssignMatch('${row.key}',this.value)">${iuCandidateOptions(row)}</select></div>`
      : '<small class="iu-nomatch">tidak ada kandidat di master</small>';
    const decision = row.decision;
    const radio = (val, label) => `<label class="iu-radio"><input type="radio" name="dec-${row.key}" ${decision === val ? 'checked' : ''} onchange="iuSetDecision('${row.key}','${val}')"> ${label}</label>`;
    return `<tr class="iu-${row.status}">
      <td><input type="checkbox" ${row.checked ? 'checked' : ''} onchange="iuToggle('${row.key}',this.checked)"></td>
      <td class="iu-unit"><b>${esc(u.nama)}</b><small>${esc(u.jenis)} · ${esc(u.kec || '—')}, ${esc(u.kab || '—')}${u.desa ? ' · desa ' + esc(u.desa) : ''}</small><small>${Number.isFinite(Number(u.lat)) ? `📍 ${u.lat}, ${u.lng}` : 'tanpa koordinat'}</small></td>
      <td>${iuStatusChip(row.status)}${kandidatHtml}</td>
      <td>${radio('new','➕ Baru')}${radio('merge','🔗 Gabung')}${radio('skip','⏭️ Lewati')}</td>
    </tr>`;
  }).join('')}</tbody></table>`;
}

function iuCandidateOptions(row){
  const opts = (row.candidates || []).map(c => `<option value="${c.unit.id}" ${row.match && row.match.unitId === c.unit.id ? 'selected' : ''}>${esc(c.unit.nama)} (${esc(c.unit.kec || '—')}, skor ${Math.round(c.score)})</option>`).join('');
  return `<option value="">— pilih unit master lain —</option>${opts}`;
}
function iuAssignMatch(key, unitId){
  const row = unitsImportState.rows.find(r => r.key === key); if (!row) return;
  if (unitId){ row.match = Object.assign({}, row.match, { unitId, unitNama: (unitById(unitId) || {}).nama || '', unit: unitById(unitId) });
    if (row.status === 'baru'){ row.status = 'mirip'; row.decision = 'merge'; }
    else row.decision = 'merge';
  } else if (row.status !== 'baru'){ row.decision = 'skip'; }
  renderUnitsImport();
}
function iuSetDecision(key, val){
  const row = unitsImportState.rows.find(r => r.key === key); if (!row) return;
  row.decision = val;
  if (val !== 'skip') row.checked = true;
}
function iuToggle(key, checked){
  const row = unitsImportState.rows.find(r => r.key === key); if (row) row.checked = checked;
}
function iuFilterChange(){
  unitsImportState.jenisFilter = (document.getElementById('iuJenis') || {}).value || '';
  unitsImportState.search = (document.getElementById('iuSearch') || {}).value || '';
  renderUnitsImport();
}
function iuSelectAll(on){
  const visible = unitsImportState.rows; visible.forEach(r => { r.checked = !!on; });
  renderUnitsImport();
}

function commitUnitsImport(){
  if (!CU || CU.role !== 'admin'){ toast('Hanya Admin yang dapat mengimpor unit', 'e'); return; }
  const selected = unitsImportState.rows.filter(r => r.checked && r.decision !== 'skip');
  const merging = selected.filter(r => r.decision === 'merge' && r.match && r.match.unit);
  const invalidMerge = selected.filter(r => r.decision === 'merge' && !(r.match && r.match.unit));
  if (invalidMerge.length){ toast(`${invalidMerge.length} baris "Gabung" tanpa kandidat — pilih kandidat atau ubah ke Baru/Lewati`, 'e'); return; }
  if (!selected.length){ toast('Tidak ada baris terpilih untuk diproses', 'e'); return; }
  if (!window.confirm(`Proses ${selected.length} baris?\n\n• Baru: ${selected.filter(r => r.decision === 'new').length} unit ditambahkan\n• Gabung: ${merging.length} unit lama dilengkapi (field kosong saja, tidak menimpa)`)) return;
  let added = 0, merged = 0;
  selected.forEach(row => {
    const u = row.unit;
    if (row.decision === 'new'){
      DB.units.push(u); persist('units', u); added++;
    } else {
      const old = row.match.unit;
      let changed = [];
      UNIT_FIELDS.forEach(k => {
        if (k === 'id' || k === 'jenis') return;
        const oldEmpty = old[k] === undefined || old[k] === null || old[k] === '';
        if (oldEmpty && u[k] !== '' && u[k] !== undefined && u[k] !== null){ old[k] = u[k]; changed.push(k); }
      });
      if (changed.length){
        old.note = (old.note ? String(old.note) + ' · ' : '') + `dilengkapi dari impor unit ${new Date().toISOString().slice(0, 10)} (${changed.join(', ')})`;
        persist('units', old); merged++;
      }
    }
  });
  renderAll();
  closeUnitsImportWizard();
  unitsImportState.rows = [];
  toast(`✅ ${added} unit baru · ${merged} unit lama dilengkapi`);
}

Object.assign(globalThis, {
  openUnitsImportWizard, closeUnitsImportWizard, handleUnitsImportFile,
  renderUnitsImport, iuAssignMatch, iuSetDecision, iuToggle, iuFilterChange, iuSelectAll, commitUnitsImport
});
