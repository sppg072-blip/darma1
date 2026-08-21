import { getAppContext } from '../../core/context.js';

const unitRepository = getAppContext().repositories.units;

/* ============================================================
   MASTER UNIT
============================================================ */
/* --- Pin 📍 pemilih koordinat (muncul di peta saat form unit terbuka) --- */
function syncTempMarker(){
  const lat=parseFloat(getVal('eULat')),lng=parseFloat(getVal('eULng'));
  updatePkCoords();
  if(isNaN(lat)||isNaN(lng)){removeTempMarker();return;}
  if(!tempMarker){
    const ic=L.divIcon({html:'<div class="pk-mark">📍</div>',className:'',iconSize:[40,40],iconAnchor:[20,38]});
    tempMarker=L.marker([lat,lng],{icon:ic,draggable:true,zIndexOffset:1000}).addTo(map);
    tempMarker.on('drag',function(){
      const p=tempMarker.getLatLng();
      const c=document.getElementById('pkCoords');
      if(c)c.textContent='Lat: '+p.lat.toFixed(6)+', Lng: '+p.lng.toFixed(6);
    });
    tempMarker.on('dragend',function(){
      const p=tempMarker.getLatLng();
      setVal('eULat',p.lat.toFixed(6));setVal('eULng',p.lng.toFixed(6));
      updatePkCoords();
      toast('📍 Koordinat diperbarui dari pin peta');
    });
  }else tempMarker.setLatLng([lat,lng]);
}
function removeTempMarker(){if(tempMarker){map.removeLayer(tempMarker);tempMarker=null;}}
function updatePkCoords(){
  const c=document.getElementById('pkCoords');if(!c)return;
  c.textContent='Lat: '+(getVal('eULat')||'—')+', Lng: '+(getVal('eULng')||'—');
}
/* --- Mode pilih koordinat: form disembunyikan, peta jadi "layar penuh" --- */
function startPickMode(){
  syncTempMarker();
  document.getElementById('mUnit').classList.add('picking');
  pickMode=true;
  const lat=parseFloat(getVal('eULat')),lng=parseFloat(getVal('eULng'));
  if(!isNaN(lat)&&!isNaN(lng))map.flyTo([lat,lng],Math.max(map.getZoom(),14),{duration:.8});
  else toast('🗺️ Klik di peta pada lokasi unit yang dimaksud');
}
function endPickMode(){
  document.getElementById('mUnit').classList.remove('picking');
  pickMode=false;
  if(getVal('eULat')&&getVal('eULng'))toast('📍 Terpilih: '+getVal('eULat')+', '+getVal('eULng'));
}
function closeUnitModal(){
  document.getElementById('mUnit').classList.remove('picking');
  pickMode=false;
  removeTempMarker();
  closeM('mUnit');
}
function renderUnitList(){
  const el=document.getElementById('unitList');
  const list=[...filteredUnits()].sort((a,b)=>a.jenis===b.jenis?a.nama.localeCompare(b.nama):a.jenis==='SPPG'?-1:1);
  el.innerHTML=list.length?list.map(u=>{
    const h=unitHasil(u);
    const kunjungan=primaryMonsOf(u.id).length; /* PLAN 3 revisi: kunjungan = monitoring utama saja, NAKER dikecualikan */
    return `<div class="hcard" onclick="flyToUnit('${u.id}')">
      <div class="hc-top">
        <div class="kbadge ${u.jenis.toLowerCase()} ${h}">${u.jenis==='SPPG'?'S':'K'}</div>
        <div class="hc-name">${esc(u.nama)}</div>
        <div class="kchip ${kunjungan>0 ? 'baik' : 'belum'}">${kunjungan>0 ? '🟢 Sudah Dimonitor (' + kunjungan + 'x)' : '⚪ Belum Dimonitor'}</div>
      </div>
      <div style="font-size:10px;color:var(--text3);margin:2px 0 3px">📍 ${esc(u.alamat)}, ${esc(u.kec)}, ${esc(u.kab)}</div>
      <div style="font-size:9.5px;color:var(--text3)">📂 ${esc(u.ref||'—')} · ${statusUnitLabel(u.status)}${u.pic?' · 👤 '+esc(u.pic):''}</div>
      <div class="hc-actions" onclick="event.stopPropagation()">
        <button class="btn bs bsm" onclick="openDetail('${u.id}')"><i class="fas fa-eye"></i> Detail</button>
        ${CU&&CU.role==='admin'?`<button class="btn bx bsm" onclick="openUnitModal('${u.id}')"><i class="fas fa-edit"></i> Edit</button>`:''}
        <button class="btn bp bsm" onclick="addMonitorFor('${u.id}')"><i class="fas fa-clipboard-check"></i> Monitoring</button>
        ${CU&&CU.role==='admin'?`<button class="btn bd bsm" onclick="confirmDelUnit('${u.id}')"><i class="fas fa-trash"></i></button>`:''}
      </div>
    </div>`;
  }).join(''):'<div class="empty"><i class="fas fa-inbox"></i><p>Tidak ada unit sesuai filter.</p></div>';
}
function initUnitForm(){
  const sel=document.getElementById('eUKab');
  sel.innerHTML='<option value="">— Pilih Kabupaten —</option>';
  Object.keys(KABUPATEN).forEach(k=>sel.innerHTML+=`<option value="${k}">${k}</option>`);
  fillKec('eUKab','eUKec');
  // ketikan manual lat/lng → pin 📍 ikut berpindah
  ['eULat','eULng'].forEach(id=>{
    document.getElementById(id).addEventListener('input',syncTempMarker);
  });
}
function fillKec(kabId,kecId){
  const kab=document.getElementById(kabId).value;
  const kec=document.getElementById(kecId);
  kec.innerHTML='<option value="">— Pilih Kecamatan —</option>';
  (KABUPATEN[kab]||[]).forEach(k=>kec.innerHTML+=`<option value="${k}">${k}</option>`);
}
function setJenis(j){
  editingJenis=j;
  document.getElementById('pickSPPG').classList.toggle('on-sppg',j==='SPPG');
  document.getElementById('pickKDMP').classList.toggle('on-kdmp',j==='KDMP');
  document.getElementById('boxSPPG').style.display=j==='SPPG'?'block':'none';
  document.getElementById('boxKDMP').style.display=j==='KDMP'?'block':'none';
}
function getVal(id){const el=document.getElementById(id);return el?String(el.value==null?'':el.value).trim():'';}
function setVal(id,v){const el=document.getElementById(id);if(el)el.value=v==null?'':v;}
function openUnitModal(id){
  const u=id?unitById(id):null;
  document.getElementById('mUnitTitle').innerHTML=u?'<i class="fas fa-edit"></i> Edit Unit':'<i class="fas fa-plus-circle"></i> Tambah Unit Baru';
  setVal('eUId',u?u.id:'');
  setJenis(u?u.jenis:'SPPG');
  setVal('eUNama',u?u.nama:'');setVal('eURef',u?u.ref:'');setVal('eUStatus',u?u.status:'aktif');
  setVal('eUKab',u?u.kab:'');fillKec('eUKab','eUKec');setVal('eUKec',u?u.kec:'');
  setVal('eUDesa',u?u.desa:'');setVal('eUAlamat',u?u.alamat:'');
  setVal('eULat',u?u.lat:'');setVal('eULng',u?u.lng:'');
  setVal('eUPic',u?u.pic:'');setVal('eUTelp',u?u.telp:'');
  setVal('eUYayasan',u?(u.yayasan||''):'');setVal('eUKapasitas',u?(u.kapasitas||''):'');setVal('eUSekolah',u?(u.sekolah||''):'');
  setVal('eUSlhs',u?(u.slhs||'belum'):'belum');setVal('eUMulai',u?(u.mulai||''):'');
  setVal('eUAnggota',u?(u.anggota||''):'');setVal('eUPeran',u?(u.peran||'Penyuplai Bahan Baku'):'Penyuplai Bahan Baku');
  setVal('eUUsaha',u?(u.usaha||''):'');setVal('eUNote',u?(u.note||''):'');
  document.getElementById('mUnit').classList.remove('hidden');
  updatePkCoords();syncTempMarker(); // pin 📍 muncul sesuai koordinat tersimpan (saat edit)
}
function getGPSUnit(){
  if(!navigator.geolocation){toast('GPS tidak didukung perangkat','e');return;}
  toast('🛰️ Mengambil lokasi GPS...');
  navigator.geolocation.getCurrentPosition(p=>{
    setVal('eULat',p.coords.latitude.toFixed(6));setVal('eULng',p.coords.longitude.toFixed(6));
    syncTempMarker();
    map.flyTo([p.coords.latitude,p.coords.longitude],16,{duration:1});
    toast('📍 Koordinat GPS terisi & pin tersorot di peta');
  },()=>toast('Gagal mengambil GPS. Izinkan akses lokasi.','e'),{timeout:10000});
}
function saveUnit(){
  const id=getVal('eUId');
  const nama=getVal('eUNama'),kab=getVal('eUKab'),kec=getVal('eUKec'),desa=getVal('eUDesa'),alamat=getVal('eUAlamat');
  const lat=parseFloat(getVal('eULat')),lng=parseFloat(getVal('eULng'));
  if(!nama||!kab||!kec||!desa||!alamat){toast('Lengkapi nama, wilayah, dan alamat unit','e');return;}
  if(isNaN(lat)||isNaN(lng)){toast('Koordinat latitude/longitude wajib diisi','e');return;}
  const base={jenis:editingJenis,nama,ref:getVal('eURef'),status:getVal('eUStatus'),kab,kec,desa,alamat,lat,lng,pic:getVal('eUPic'),telp:getVal('eUTelp'),note:getVal('eUNote')};
  if(editingJenis==='SPPG'){base.yayasan=getVal('eUYayasan');base.kapasitas=parseInt(getVal('eUKapasitas'))||0;base.sekolah=parseInt(getVal('eUSekolah'))||0;base.slhs=getVal('eUSlhs');base.mulai=getVal('eUMulai');}
  else{base.anggota=parseInt(getVal('eUAnggota'))||0;base.peran=getVal('eUPeran');base.usaha=getVal('eUUsaha');}
  const saved=id?Object.assign({},unitById(id),base):Object.assign({id:uid('unit')},base);
  unitRepository.save(saved);
  toast(id?'✅ Unit diperbarui':'✅ Unit "'+nama+'" ditambahkan');
  closeUnitModal();renderAll();
}
function confirmDelUnit(id){
  const u=unitById(id);if(!u)return;
  confirmDo(`Hapus unit "${u.nama}" beserta seluruh riwayat monitoringnya?`,()=>{
    unitRepository.remove(id);closeM('mDetail');renderAll();toast('🗑️ Unit dihapus');
  });
}
function editFromDetail(){closeM('mDetail');openUnitModal(dtCurrent);}
function monitorFromDetail(){closeM('mDetail');addMonitorFor(dtCurrent);}


/* Public action bridge for existing HTML controls. */
Object.assign(globalThis, { syncTempMarker, removeTempMarker, updatePkCoords, startPickMode, endPickMode, closeUnitModal, renderUnitList, initUnitForm, fillKec, setJenis, getVal, setVal, openUnitModal, getGPSUnit, saveUnit, confirmDelUnit, editFromDetail, monitorFromDetail });
