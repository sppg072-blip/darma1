/* ============================================================
   RENDER: DASHBOARD
============================================================ */
import { formatRupiahAmount } from '../../domain/forms/currency.js';

function applyRBAC() {
  const isAdmin = CU && CU.role === 'admin';
  const els = ['btnAddUnit', 'btnBackup', 'btnRestore', 'btnImportTOptimal', 'dtDelBtn', 'dtEditBtn', 'btnClearMon'];
  els.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isAdmin ? 'inline-flex' : 'none';
  });
  const rptTab=document.getElementById('btnReportTab');if(rptTab)rptTab.style.display=isAdmin?'flex':'none';
  const rptDash=document.getElementById('btnDashReport');if(rptDash)rptDash.style.display=isAdmin?'inline-flex':'none';
}
function renderAll(){renderMap();renderDash();renderUnitList();renderHist();refreshUnitSelect();applyRBAC();if(typeof renderEconLens==='function')renderEconLens();if(typeof renderConsistencyPanel==='function')renderConsistencyPanel();}
function monitoringKind(record) {
  if (record && record.formType) return record.formType;
  if (record && record.jenis) return record.jenis;
  const unit = record ? unitById(record.unitId) : null;
  return unit ? unit.jenis : '';
}
function isNakerMonitoring(record) { return monitoringKind(record) === 'NAKER'; }
function isPrimaryMonitoring(record) { const kind = monitoringKind(record); return kind === 'SPPG' || kind === 'KDMP'; }
function mainMonitoringForUnit(unitId, kind = '') {
  return DB.monitoring.filter(record => record.unitId === unitId && isPrimaryMonitoring(record) && (!kind || monitoringKind(record) === kind));
}
function renderDash(){
  const list = filteredUnits();
  const dbBanner=document.getElementById('dashBanner');
  if(dbBanner)dbBanner.innerHTML=(API.mode==='cloud'&&CU&&CU.role==='admin'&&DB.units.length===0)?'<button class="btn bp bblk" style="margin-bottom:10px" onclick="loadSampleCloud()"><i class="fas fa-cloud-upload-alt"></i> Database cloud masih kosong — Muat Data Contoh</button>':'';
  const s=list.filter(u=>u.jenis==='SPPG').length;
  const k=list.filter(u=>u.jenis==='KDMP').length;
  const oper=list.filter(u=>u.status==='aktif');
  const prep=list.filter(u=>u.status==='persiapan');
  const plan=list.filter(u=>u.status==='rencana');
  document.getElementById('stSPPG').textContent=s;
  document.getElementById('stKDMP').textContent=k;
  const scopedMonitoring = DB.monitoring.filter(m=>list.some(u=>u.id===m.unitId));
  const primaryMonitoring = scopedMonitoring.filter(isPrimaryMonitoring);
  const sppgMonitoringCount = primaryMonitoring.filter(m=>monitoringKind(m)==='SPPG').length;
  const kdmpMonitoringCount = primaryMonitoring.filter(m=>monitoringKind(m)==='KDMP').length;
  const nakerFormCount = scopedMonitoring.filter(isNakerMonitoring).length;
  document.getElementById('stMon').textContent=primaryMonitoring.length;
  const stMonSub=document.getElementById('stMonSub');
  if(stMonSub)stMonSub.textContent=`SPPG ${sppgMonitoringCount} · KDMP ${kdmpMonitoringCount} · Naker ${nakerFormCount} form`;
  document.getElementById('stOper').textContent=oper.length;
  const operSub=document.getElementById('stOperSub');if(operSub)operSub.textContent=`${oper.filter(u=>u.jenis==='SPPG').length} SPPG · ${oper.filter(u=>u.jenis==='KDMP').length} KDMP`;
  const prepEl=document.getElementById('stPrep');if(prepEl)prepEl.textContent=prep.length;
  const prepSub=document.getElementById('stPrepSub');if(prepSub)prepSub.textContent=`${prep.filter(u=>u.jenis==='SPPG').length} SPPG · ${prep.filter(u=>u.jenis==='KDMP').length} KDMP`;
  const planEl=document.getElementById('stPlan');if(planEl)planEl.textContent=plan.length;
  const planSub=document.getElementById('stPlanSub');if(planSub)planSub.textContent=`${plan.filter(u=>u.jenis==='SPPG').length} SPPG · ${plan.filter(u=>u.jenis==='KDMP').length} KDMP`;

  // progres cakupan
  const sppgAll = list.filter(u=>u.jenis==='SPPG'), sppgMon = sppgAll.filter(u=>mainMonitoringForUnit(u.id,'SPPG').length>0);
  const kdmpAll = list.filter(u=>u.jenis==='KDMP'), kdmpMon = kdmpAll.filter(u=>mainMonitoringForUnit(u.id,'KDMP').length>0);
  const totAll = list.length || 1, totMon = list.filter(u=>mainMonitoringForUnit(u.id).length>0).length;
  const pSPPG = Math.round(sppgMon.length/(sppgAll.length||1)*100);
  const pKDMP = Math.round(kdmpMon.length/(kdmpAll.length||1)*100);
  const pTot = Math.round(totMon/totAll*100);

  document.getElementById('hasilBars').innerHTML = `
    <div class="hrow" onclick="setMapView('progres','SPPG','mon',null)"><div class="hl" style="width:115px">🍳 SPPG Dimonitor</div><div class="hbar-wrap"><div class="hbar" style="width:${Math.max(pSPPG,2)}%;background:var(--sppg)"></div></div><div class="hv">${sppgMon.length}/${sppgAll.length}</div></div>
    <div class="hrow" onclick="setMapView('progres','KDMP','mon',null)"><div class="hl" style="width:115px">🏪 KDMP Dimonitor</div><div class="hbar-wrap"><div class="hbar" style="width:${Math.max(pKDMP,2)}%;background:var(--kdmp)"></div></div><div class="hv">${kdmpMon.length}/${kdmpAll.length}</div></div>
    <div class="hrow" onclick="setMapView('progres','','mon',null)"><div class="hl" style="width:115px">🟢 Total Cakupan</div><div class="hbar-wrap"><div class="hbar" style="width:${Math.max(pTot,2)}%;background:var(--ok)"></div></div><div class="hv">${pTot}%</div></div>
  `;

  // kabupaten bars
  const kabs=Object.entries(KABUPATEN).map(([kab])=>{
    const us=list.filter(u=>u.kab===kab);
    return {kab,n:us.length,mon:primaryMonitoring.filter(m=>us.some(u=>u.id===m.unitId)).length}; /* monitoring utama saja — NAKER dikecualikan */
  });
  const maxK=Math.max(1,...kabs.map(x=>x.n));
  document.getElementById('kabBars').innerHTML=kabs.map(x=>`
    <div class="hrow" style="cursor:pointer" onclick="pickKab('${x.kab.replace(/'/g,"\\'")}')">
      <div class="hl" style="width:110px">📍 ${x.kab}</div>
      <div class="hbar-wrap"><div class="hbar" style="width:${Math.max(Math.round(x.n/maxK*100),2)}%;background:linear-gradient(90deg,#1D4ED8,#60A5FA)"></div></div>
      <div class="hv">${x.n}</div>
    </div>`).join('');

  // PLAN 1: seksi "Target Sasaran Unit Belum Dimonitor" & "Monitoring Terbaru" dihapus (tampilan terlalu ramai).
}
function pickKab(k){document.getElementById('fdKab').value=k;onFilterChange();fitAll();}


/* ============================================================
   PLAN 1: KARTU DASHBOARD KLIK-ABLE + TABEL RINGKAS MONITORING
============================================================ */
function dashCard(type){
  if(type==='mon'){openMonTable();return;}
  if(type==='sppg'||type==='kdmp'){
    FS.status='';
    quickJenis(type==='sppg'?'SPPG':'KDMP');
    goTab('unit');
    toast('🏷️ Filter jenis '+(type==='sppg'?'SPPG (Dapur MBG)':'KDMP (Koperasi)')+' aktif — '+filteredUnits().length+' unit ditampilkan di Master Unit');
    return;
  }
  const st={aktif:'aktif',persiapan:'persiapan',rencana:'rencana'}[type];
  if(!st)return;
  FS.status=st;
  onFilterChange();
  goTab('unit');
  toast('📌 Unit berstatus '+statusUnitLabel(st)+' — '+filteredUnits().length+' unit ditampilkan di Master Unit');
}

/* ---------- Modal Tabel Ringkas Monitoring ---------- */
let monTableSegment='primary';
function openMonTable(){
  const kabSel=document.getElementById('mtKab');
  if(kabSel && kabSel.options.length<=1){
    Object.keys(KABUPATEN).forEach(k=>kabSel.innerHTML+=`<option value="${k}">${k}</option>`);
  }
  renderMonTable();
  document.getElementById('mMonTable').classList.remove('hidden');
}
function closeMonTable(){document.getElementById('mMonTable').classList.add('hidden');}
function setMonTableSegment(seg){
  monTableSegment=seg==='naker'?'naker':'primary';
  const a=document.getElementById('mtSegPrimary'),b=document.getElementById('mtSegNaker');
  if(a)a.classList.toggle('on',monTableSegment==='primary');
  if(b)b.classList.toggle('on',monTableSegment==='naker');
  renderMonTable();
}
function monTableRecords(){
  const searchEl=document.getElementById('mtSearch'),kabEl=document.getElementById('mtKab');
  const q=((searchEl&&searchEl.value)||'').toLowerCase();
  const kab=(kabEl&&kabEl.value)||'';
  return DB.monitoring.filter(m=>{
    const u=unitById(m.unitId);if(!u)return false;
    if(monTableSegment==='primary'?!isPrimaryMonitoring(m):!isNakerMonitoring(m))return false;
    if(kab&&u.kab!==kab)return false;
    if(q){
      const f=(m.form&&m.form.fields)||{};
      const hay=(u.nama+' '+(m.petugas||'')+' '+(f.nk101||'')+' '+(m.tgl||'')+' '+(m.temuan||'')).toLowerCase();
      if(!hay.includes(q))return false;
    }
    return true;
  }).sort((a,b)=>String(b.tgl||'').localeCompare(String(a.tgl||''))||String(b.id||'').localeCompare(String(a.id||'')));
}
function mtNum(v){const n=Number(v);return (v===''||v==null||!Number.isFinite(n))?null:n;}
function mtGridTotal(m,id){const f=(m&&m.form&&m.form.fields)||{};const g=f[id];return mtNum(g&&g.total);}
function mtTrunc(s,n){s=String(s==null?'':s);return s.length>n?esc(s.slice(0,n-1))+'…':esc(s);}
function renderMonTable(){
  const body=document.getElementById('mtBody');if(!body)return;
  const recs=monTableRecords();
  const meta=document.getElementById('mtMeta');
  const totalAll=monTableSegment==='primary'?DB.monitoring.filter(isPrimaryMonitoring).length:DB.monitoring.filter(isNakerMonitoring).length;
  if(meta)meta.innerHTML=`Menampilkan <b>${recs.length}</b> baris${recs.length!==totalAll?` (disaring dari ${totalAll} total)`:''} · klik baris untuk membuka detail unit`;
  if(!recs.length){body.innerHTML='<div class="empty"><i class="fas fa-inbox"></i><p>Tidak ada rekaman sesuai filter.</p></div>';body.style.maxHeight='';return;}
  const rowsHtml=recs.map(m=>{
    const u=unitById(m.unitId)||{};
    const f=(m.form&&m.form.fields)||{};
    if(monTableSegment==='primary'){
      const skor=(m.form&&m.jenis==='KDMP'&&m.form.avg!=null)?('⭐ '+m.form.avg):'—';
      const porsi=mtGridTotal(m,'sp201'),sekolah=mtGridTotal(m,'sp202');
      return `<tr onclick="openDetail('${u.id}')">
        <td class="mt-c">${fmtD(m.tgl)}</td>
        <td class="mt-unit"><span class="kbadge ${String(u.jenis||'sppg').toLowerCase()} baik">${u.jenis==='KDMP'?'K':'S'}</span> ${esc(u.nama)}</td>
        <td class="mt-c">${esc(u.kab||'')}</td>
        <td>${esc(m.petugas||'—')}</td>
        <td class="mt-num">${porsi!=null?fmtN(porsi):'—'}</td>
        <td class="mt-num">${sekolah!=null?fmtN(sekolah):'—'}</td>
        <td class="mt-c">${skor}</td>
        <td class="mt-note">${mtTrunc(m.temuan||'—',90)}</td>
      </tr>`;
    }
    const upah=mtNum(f.nk207),hari=mtNum(f.nk205);
    return `<tr onclick="openDetail('${u.id}')">
      <td class="mt-c">${fmtD(m.tgl)}</td>
      <td class="mt-unit">${esc(u.nama)}</td>
      <td>${esc(f.nk101||'—')}</td>
      <td>${esc(f.nk102||'—')}</td>
      <td class="mt-num">${upah!=null?formatRupiahAmount(upah):'—'}</td>
      <td class="mt-num">${hari!=null?fmtN(hari):'—'}</td>
      <td class="mt-note">${mtTrunc(f.nk308||'—',70)}</td>
    </tr>`;
  }).join('');
  const headHtml=monTableSegment==='primary'
    ?'<tr><th>Tanggal</th><th>Unit</th><th>Kab/Kota</th><th>Petugas</th><th>Porsi/hr</th><th>Sekolah</th><th>Skor</th><th>Temuan</th></tr>'
    :'<tr><th>Tanggal</th><th>Unit SPPG</th><th>Responden</th><th>Jabatan</th><th>Upah/bulan</th><th>Hari/mgg</th><th>Dampak Ekonomi</th></tr>';
  body.innerHTML=`<table class="mt-table"><thead>${headHtml}</thead><tbody>${rowsHtml}</tbody></table>`;
  const rowsSel=(document.getElementById('mtRows')||{}).value||'25';
  if(rowsSel==='all'){body.style.maxHeight='75vh';}
  else{
    const px=Math.min(Math.round(Number(rowsSel))*31+34,Math.round(window.innerHeight*0.75));
    body.style.maxHeight=px+'px';
  }
}

/* Public action bridge for existing HTML controls. */
Object.assign(globalThis, { applyRBAC, renderAll, renderDash, pickKab,
  dashCard, openMonTable, closeMonTable, setMonTableSegment, renderMonTable, monTableRecords, monTableSegment:()=>monTableSegment });
