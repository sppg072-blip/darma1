/* ============================================================
   FILTER
============================================================ */
function initFilters(){
  const kabSel=document.getElementById('fdKab');
  Object.keys(KABUPATEN).forEach(k=>kabSel.innerHTML+=`<option value="${k}">${k}</option>`);
}
function onFilterChange(){
  FS.jenis=document.getElementById('fdJenis').value;
  FS.hasil=document.getElementById('fdHasil').value;
  FS.kab=document.getElementById('fdKab').value;
  FS.search=document.getElementById('fdSearch').value;
  renderMap();renderUnitList();renderDash();
}
function clearFilters(){
  ['fdJenis','fdHasil','fdKab','fdSearch'].forEach(id=>document.getElementById(id).value='');
  FS = {jenis:'', kab:'', hasil:'', search:'', status:'', statusMon:'all', modeView:'progres', minFreq:null};
  document.querySelectorAll('#legendBox .lg-chip-view').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('#legendBox .lg-chip-freq').forEach(b => b.classList.remove('on'));
  const defProg = document.getElementById('lfc_prog_all');
  if(defProg) defProg.classList.add('on');
  const defFreq = document.getElementById('lff_all');
  if(defFreq) defFreq.classList.add('on');
  renderBoundaries(''); // Reset boundaries arsir
  onFilterChange();clearSel();fitAll();
}
function quickJenis(j){
  if(j === ''){
    clearFilters();
  } else {
    // preserve region if any, but clear results and search
    document.getElementById('fdHasil').value = '';
    document.getElementById('fdSearch').value = '';
    document.getElementById('fdJenis').value = j;
    onFilterChange();
    fitAll();
  }
}
function toggleLegendMenu() {
  const box = document.getElementById('legendBox');
  if (box) box.classList.toggle('collapsed');
}
function setMapView(mode, jenis, statusMon) {
  FS.modeView = mode || 'progres';
  FS.jenis = jenis || '';
  FS.statusMon = statusMon || 'all';

  document.querySelectorAll('#legendBox .lg-chip-view').forEach(b => b.classList.remove('on'));
  if (mode === 'murni') {
    const id = jenis === 'SPPG' ? 'lfc_murni_sppg' : jenis === 'KDMP' ? 'lfc_murni_kdmp' : 'lfc_murni_all';
    const btn = document.getElementById(id);
    if (btn) btn.classList.add('on');
  } else {
    const id = statusMon === 'mon' ? 'lfc_prog_mon' : statusMon === 'unmon_sppg' ? 'lfc_prog_unmon_sppg' : statusMon === 'unmon_kdmp' ? 'lfc_prog_unmon_kdmp' : 'lfc_prog_all';
    const btn = document.getElementById(id);
    if (btn) btn.classList.add('on');
  }

  const fdJenis = document.getElementById('fdJenis');
  if (fdJenis) fdJenis.value = FS.jenis;

  renderAll();
  const msg = mode === 'murni'
    ? `🗺️ Mode Murni: ${jenis ? 'Seluruh ' + jenis : 'Semua Unit (Biru & Merah)'}`
    : `🏷️ Mode Monitoring: ${statusMon === 'mon' ? 'Sudah Dimonitor' : statusMon === 'unmon_sppg' ? 'SPPG Belum Dimonitor' : statusMon === 'unmon_kdmp' ? 'KDMP Belum Dimonitor' : 'Semua Unit (Hijau/Biru/Merah)'}`;
  toast(msg);
}

function setFreqFilter(minFreq) {
  FS.minFreq = minFreq;
  document.querySelectorAll('#legendBox .lg-chip-freq').forEach(b => b.classList.remove('on'));
  const fid = minFreq === null ? 'lff_all' : 'lff_' + minFreq;
  const fbtn = document.getElementById(fid);
  if (fbtn) fbtn.classList.add('on');
  renderAll();
  const label = minFreq === null ? '🏷️ Semua frekuensi kunjungan' : minFreq === 0 ? '○ Hanya unit dengan 0 kunjungan (Belum)' : `◎ Minimal ${minFreq} kali kunjungan`;
  toast(label);
}
function clearSel(){document.getElementById('selCard').classList.remove('visible');}
function selectUnit(id){
  const u=unitById(id);if(!u)return;
  const m=lastMon(id), ms=monsOf(id), kritis=ms.filter(x=>x.hasil==='kritis').length;
  document.getElementById('scIcon').textContent=u.jenis==='SPPG'?'🍳':'🏪';
  document.getElementById('scMain').textContent=u.nama;
  document.getElementById('scSub').textContent=`${u.desa}, Kec. ${u.kec}, ${u.kab}`;
  const chip=document.getElementById('scChip');
  const hh=unitHasil(u);const hm=HASIL_META[hh];
  chip.textContent=hm.label;chip.className='sc-chip kchip '+hh;
  document.getElementById('scMon').textContent=ms.length;
  document.getElementById('scLast').textContent=m?fmtD(m.tgl):'—';
  document.getElementById('scKritis').textContent=kritis;
  document.getElementById('scTip').innerHTML=m?`<i class="fas fa-lightbulb"></i> ${esc(m.rekom||'Tidak ada rekomendasi khusus.')}`:'<i class="fas fa-lightbulb"></i> Unit belum pernah dimonitoring — jadwalkan kunjungan pertama.';
  document.getElementById('selCard').classList.add('visible');
}


/* Public action bridge for existing HTML controls. */
Object.assign(globalThis, { initFilters, onFilterChange, clearFilters, quickJenis, toggleLegendMenu, setMapView, setFreqFilter, clearSel, selectUnit });
