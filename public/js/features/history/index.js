import { getAppContext } from '../../core/context.js';
import { getSppgAnalytics, formatSppgAnalytics } from '../../domain/monitoring/operational-analytics.js';

const monitoringRepository = getAppContext().repositories.monitoring;

/* ============================================================
   HISTORI
============================================================ */
function renderHist(){
  const fu=getVal('fHUnit'),ft=getVal('fHTgl');
  const fq=(getVal('fHSearch')||'').toLowerCase(); /* pencarian teks histori: nama unit / petugas / temuan / rekom / tanggal */
  let list=[...DB.monitoring].sort((a,b)=>b.tgl.localeCompare(a.tgl)||b.id.localeCompare(a.id));
  if(fu)list=list.filter(m=>m.unitId===fu);
  if(ft)list=list.filter(m=>m.tgl===ft);
  if(fq)list=list.filter(m=>{
    const u=unitById(m.unitId)||{};
    const f=(m.form&&m.form.fields)||{};
    const hay=(u.nama+' '+(m.petugas||'')+' '+(m.temuan||'')+' '+(m.rekom||'')+' '+(m.tgl||'')+' '+(f.sp109||'')+' '+(f.nk101||'')).toLowerCase();
    return hay.includes(fq);
  });
  const el=document.getElementById('histList');
  if(!el)return;
  if(!DB.monitoring.length){
    el.innerHTML=`<div class="empty" style="padding:40px 10px">
      <i class="fas fa-inbox"></i>
      <p style="font-weight:700;margin-bottom:8px">Belum ada riwayat monitoring tersimpan.</p>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap">
        <button class="btn bp bsm" onclick="loadSampleCloud()"><i class="fas fa-database"></i> Muat Data Contoh</button>
        <button class="btn bs bsm" onclick="goTab('rekam')"><i class="fas fa-plus"></i> Buat Monitoring Baru</button>
      </div>
    </div>`;
    return;
  }
  if(!list.length){
    el.innerHTML=`<div class="empty" style="padding:30px 10px">
      <i class="fas fa-filter"></i>
      <p>Tidak ada riwayat monitoring untuk filter unit/tanggal/pencarian yang dipilih.</p>
      <button class="btn bx bsm" style="margin-top:8px" onclick="document.getElementById('fHSearch').value='';document.getElementById('fHUnit').value='';document.getElementById('fHTgl').value='';renderHist();">✕ Reset Filter Histori</button>
    </div>`;
    return;
  }
  el.innerHTML=list.map(m=>{
    const u=unitById(m.unitId);
    if(!u)return '';
    const scoreTag=(m.form&&m.jenis==='KDMP'&&m.form.avg!=null)?`<span class="kchip" style="background:#1E3A8A;color:#fff;margin-right:4px">⭐ ${m.form.avg}</span>`:'';
    const fotoVal = (m.form && m.form.fields && (m.form.fields.sp_foto_kegiatan || m.form.fields.sp205_foto));
    const fotoHtml = fotoVal ? `<div style="margin-top:8px"><img src="${fotoVal}" style="max-height:160px;max-width:100%;border-radius:8px;border:1px solid var(--border)"/></div>` : '';
    const linkVal = (m.form && m.form.fields && m.form.fields.sp_link_lampiran);
    const linkHtml = linkVal ? `<div style="margin-top:6px;font-size:11px"><a href="${esc(linkVal)}" target="_blank" rel="noopener noreferrer" style="color:var(--brand);font-weight:700;display:inline-flex;align-items:center;gap:5px"><i class="fas fa-external-link-alt"></i> <b>Link Lampiran Berkas</b></a></div>` : '';
    const pTxt = [m.petugas, (m.form && m.form.fields && m.form.fields.sp109) ? '🎙️ '+m.form.fields.sp109 : ''].filter(Boolean).join(' · ');
    const analytics = m.formType === 'SPPG' ? formatSppgAnalytics(getSppgAnalytics(m, u)) : null;
    const analyticsHtml = analytics ? `<div class="hc-analytics"><b>Realisasi:</b> ${esc(String(analytics.actualPorsi ?? '—'))} porsi · ${esc(String(analytics.actualSekolah ?? '—'))} sekolah &nbsp; <b>Capaian:</b> ${esc(analytics.utilization)} kapasitas · ${esc(analytics.schoolCoverage)} sekolah &nbsp; <b>Gap:</b> ${esc(String(analytics.gapPorsi))} porsi · ${esc(String(analytics.gapSekolah))} sekolah</div>` : '';
    return `<div class="hcard" onclick="openDetail('${u.id}')">
      <div class="hc-top">
        <div class="kbadge ${u.jenis.toLowerCase()} baik">${u.jenis==='SPPG'?'S':'K'}</div>
        <div class="hc-name">${esc(u.nama)}</div>
        ${scoreTag}<div class="kchip baik">🟢 Sudah Dimonitor</div>
      </div>
      <div class="hc-date">📅 ${fmtD(m.tgl)} · 👤 ${esc(pTxt || m.petugas || 'Petugas')}</div>
      <div class="hc-aspects">${monDetailAspects(m)}</div>
      ${analyticsHtml}
      ${m.temuan?`<div class="hc-temuan">🔎 ${esc(m.temuan)}</div>`:''}
      ${linkHtml}
      ${fotoHtml}
      <div class="hc-actions" onclick="event.stopPropagation()">
        <button class="btn bd bsm" onclick="cetakMon('${m.id}')"><i class="fas fa-file-pdf"></i> PDF</button>
        <button class="btn bs bsm" onclick="cetakMonDocx('${m.id}')"><i class="fas fa-file-word"></i> DOCX</button>
        <button class="btn bg bsm" onclick="cetakMonExcel('${m.id}')"><i class="fas fa-file-excel"></i> Excel</button>
        ${CU&&CU.role==='admin'?`<button class="btn bx bsm hc-admin-action" onclick="openEditMon('${m.id}')"><i class="fas fa-edit"></i> Edit Monitoring</button>`:''}
        ${CU&&CU.role==='admin'?`<button class="btn bd bsm hc-admin-action" onclick="confirmDelMon('${m.id}')"><i class="fas fa-trash"></i> Hapus</button>`:''}
      </div>
    </div>`;
  }).join('');
}
function openEditMon(id){
  const m=DB.monitoring.find(x=>x.id===id);if(!m)return;
  const u=unitById(m.unitId);if(!u)return;
  goTab('rekam');refreshUnitSelect();
  editMonId=id;
  currentRekamForm=(m.formType==='NAKER')?'NAKER':'SPPG';
  document.getElementById('rUnit').value=m.unitId;
  syncMonitoringUnitSearch(u);
  setVal('rTgl',m.tgl);
  setMSVal('rPetugas',m.petugas||'');
  setVal('rTemuan',m.temuan||'');setVal('rRekom',m.rekom||'');
  document.getElementById('unitInfo').innerHTML=`📍 ${esc(u.alamat)}, ${esc(u.kec)}, ${esc(u.kab)} · <b style="color:var(--brand)">EDIT MONITORING</b>`;
  renderRekamForm(u.jenis,m);
  toast('✏️ Mode edit — ubah lalu klik Simpan');
}
function updateMon(){
  const id=getVal('mId');const current=monitoringRepository.getAll().find(x=>x.id===id);if(!current)return;
  const updated=Object.assign({},current,{tgl:getVal('mTgl'),petugas:getVal('mPetugas'),kebersihan:getVal('mKebersihan'),gizi:getVal('mGizi'),distribusi:getVal('mDistribusi'),dok:getVal('mDok'),temuan:getVal('mTemuan'),rekom:getVal('mRekom')});
  updated.hasil=computeHasil(updated.kebersihan,updated.gizi,updated.distribusi,updated.dok);
  monitoringRepository.save(updated);closeM('mEditMon');renderAll();toast('✅ Monitoring diperbarui');
}
function confirmDelMon(id){
  confirmDo('Hapus catatan monitoring ini?',()=>{
    monitoringRepository.remove(id);renderAll();toast('🗑️ Catatan dihapus');
  });
}
function confirmClearMon(){
  if(!monitoringRepository.getAll().length){toast('Tidak ada data monitoring','e');return;}
  confirmDo(`Hapus SELURUH ${monitoringRepository.getAll().length} catatan monitoring? Data unit tetap aman.`,()=>{
    monitoringRepository.clear();renderAll();toast('🗑️ Semua catatan monitoring dihapus');
  });
}


/* Public action bridge for existing HTML controls. */
Object.assign(globalThis, { renderHist, openEditMon, updateMon, confirmDelMon, confirmClearMon });
