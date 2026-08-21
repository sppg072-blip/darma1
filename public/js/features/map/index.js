/* ============================================================
   MAP
============================================================ */
function initMap(){
  map=L.map('map',{zoomControl:true,center:[-6.900,109.56],zoom:10});
  layerStreet=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(map);
  layerSat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'© Esri · Maxar',maxZoom:19});
  
  boundariesLayer = L.layerGroup().addTo(map);
  loadBoundaries();
  syncMarkerZoomMode();
  map.on('zoomend',syncMarkerZoomMode);

  map.on('click',function(e){
    const mu=document.getElementById('mUnit');
    if(!mu.classList.contains('hidden')){
      document.getElementById('eULat').value=e.latlng.lat.toFixed(6);
      document.getElementById('eULng').value=e.latlng.lng.toFixed(6);
      syncTempMarker();
      toast('📍 Koordinat terisi dari peta');
    }
  });
  [150,600,1200].forEach(t=>setTimeout(()=>map.invalidateSize(),t));
}
function syncMarkerZoomMode(){
  if(!map)return;
  const z=map.getZoom();
  const el=map.getContainer();
  el.classList.remove('marker-zoom-far','marker-zoom-mid','marker-zoom-near');
  el.classList.add(z<=10?'marker-zoom-far':(z<=13?'marker-zoom-mid':'marker-zoom-near'));
}
function toggleLayer(){
  if(layerMode==='street'){map.removeLayer(layerStreet);layerSat.addTo(map);layerMode='sat';document.getElementById('layerLbl').textContent='Street';}
  else{map.removeLayer(layerSat);layerStreet.addTo(map);layerMode='street';document.getElementById('layerLbl').textContent='Satelit';}
}

let boundariesVisible = true;
function toggleBoundaries() {
  if (boundariesVisible) {
    map.removeLayer(boundariesLayer);
    document.getElementById('boundLbl').textContent = 'Tampil Batas';
    toast('Batas wilayah disembunyikan');
  } else {
    map.addLayer(boundariesLayer);
    document.getElementById('boundLbl').textContent = 'Hapus Batas';
    toast('Batas wilayah ditampilkan');
  }
  boundariesVisible = !boundariesVisible;
}
function resetView(){fitAll();}
function fitAll(){
  const pts=filteredUnits();if(!pts.length){map.flyTo([-6.900,109.56],10);return;}
  const b=L.latLngBounds(pts.map(u=>[u.lat,u.lng]));
  map.flyToBounds(b,{padding:[60,60],duration:1});
}
function mapMonitoringKind(record){
  if(record&&record.formType)return record.formType;
  if(record&&record.jenis)return record.jenis;
  const unit=record?unitById(record.unitId):null;
  return unit?unit.jenis:'';
}
function primaryMonitoringForUnit(unitId){return DB.monitoring.filter(record=>record.unitId===unitId&&(mapMonitoringKind(record)==='SPPG'||mapMonitoringKind(record)==='KDMP'));}
function nakerFormsForUnit(unitId){return DB.monitoring.filter(record=>record.unitId===unitId&&mapMonitoringKind(record)==='NAKER');}
function filteredUnits(){
  const q=(FS.search||'').toLowerCase();
  return DB.units.filter(u=>{
    if(FS.jenis&&u.jenis!==FS.jenis)return false;
    if(FS.status&&u.status!==FS.status)return false; /* PLAN 1: filter status unit (kartu dashboard) */
    if(FS.kab&&u.kab!==FS.kab)return false;
    if(FS.hasil&&unitHasil(u)!==FS.hasil)return false;
    const count = primaryMonitoringForUnit(u.id).length;
    if(FS.statusMon==='mon' && count===0) return false;
    if(FS.statusMon==='unmon_sppg' && (u.jenis!=='SPPG' || count>0)) return false;
    if(FS.statusMon==='unmon_kdmp' && (u.jenis!=='KDMP' || count>0)) return false;
    if(FS.statusMon==='unmon' && count>0) return false;
    if(FS.minFreq !== null && FS.minFreq !== undefined){
      if(FS.minFreq === 0 && count !== 0) return false;
      if(FS.minFreq > 0 && count < FS.minFreq) return false;
    }
    if(q){const s=(u.nama+' '+u.desa+' '+u.kec+' '+u.kab+' '+u.alamat+' '+(u.ref||'')).toLowerCase();if(!s.includes(q))return false;}
    return true;
  });
}
function renderMap(){
  markers.forEach(m=>map.removeLayer(m));markers=[];
  const list=filteredUnits();
  list.forEach(u=>{
    const h=unitHasil(u);
    const count = primaryMonitoringForUnit(u.id).length;
    const nakerCount = nakerFormsForUnit(u.id).length;
    const isMon = count > 0;
    let bgClass = u.jenis.toLowerCase();
    let ringClass = '';
    if(FS.modeView === 'progres'){
      if(isMon){
        bgClass = 'dimonitor';
        ringClass = 'ring-' + Math.min(count, 5);
      }
    }
    const icon=L.divIcon({
      html:`<div class="mk ${bgClass} ${ringClass}" title="${esc(u.nama)} (${isMon ? count + 'x monitoring utama' : 'Belum Dimonitor'}${nakerCount ? ' · '+nakerCount+' form Naker' : ''})"><i class="fas ${u.jenis==='SPPG'?'fa-utensils':'fa-store'}"></i></div>`,
      className:'',iconSize:[32,38],iconAnchor:[16,38],popupAnchor:[0,-36]
    });
    const mk=L.marker([u.lat,u.lng],{icon}).addTo(map);
    mk.bindPopup(buildPopup(u),{maxWidth:290,closeButton:true});
    mk.on('popupopen',()=>{const el=mk.getElement();if(el)el.classList.add('marker-selected');});
    mk.on('popupclose',()=>{const el=mk.getElement();if(el)el.classList.remove('marker-selected');});
    markers.push(mk);
  });
  const s=list.filter(u=>u.jenis==='SPPG').length, k=list.filter(u=>u.jenis==='KDMP').length;
  const monitoredUnits=list.filter(u=>primaryMonitoringForUnit(u.id).length>0).length;
  const unmonitoredUnits=Math.max(0,list.length-monitoredUnits);
  document.getElementById('cntTxt').innerHTML=`<span class="map-count-main"><b>${list.length}</b> unit</span><span class="map-count-type sppg"><i class="fas fa-utensils"></i> SPPG ${s}</span><span class="map-count-type kdmp"><i class="fas fa-store"></i> KDMP ${k}</span><span class="map-count-type monitored"><i class="fas fa-check-circle"></i> Termonitor ${monitoredUnits}</span><span class="map-count-type pending"><i class="fas fa-clock"></i> Belum ${unmonitoredUnits}</span>`;
}
function buildPopup(u){
  const primary=[...primaryMonitoringForUnit(u.id)].sort((a,b)=>String(b.tgl||'').localeCompare(String(a.tgl||'')));
  const m=primary[0]||null;
  const nakerCount=nakerFormsForUnit(u.id).length;
  const has=u.jenis==='SPPG';
  /* PLAN 3: angka kunci SPPG dari REALISASI monitoring terakhir (fallback master = sasaran) */
  const mf = (m && m.form && m.form.fields) || {};
  const gridTotal = id => { const g=mf[id]; const t=g && g.total; const n=Number(t); return (t===''||t==null||!Number.isFinite(n)) ? null : n; };
  const plainNum = id => { const v=mf[id]; const n=Number(v); return (v===''||v==null||!Number.isFinite(n)) ? null : n; };
  const kv = has
    ? (() => {
        const porsi=gridTotal('sp201'), sekolah=gridTotal('sp202'), pekerja=plainNum('sp205'), juru=plainNum('sp206');
        return `<div class="pk"><b>${porsi!=null?fmtN(porsi):fmtN(u.kapasitas)}</b><span>porsi terlayani / hari${porsi!=null?'':' (sasaran)'}</span></div>
       <div class="pk"><b>${sekolah!=null?fmtN(sekolah):fmtN(u.sekolah)}</b><span>sekolah penerima${sekolah!=null?'':' (sasaran)'}</span></div>
       <div class="pk"><b>${pekerja!=null?fmtN(pekerja):'—'}</b><span>jumlah pekerja</span></div>
       <div class="pk"><b>${juru!=null?fmtN(juru):'—'}</b><span>juru masak</span></div>`;
      })()
    : `<div class="pk"><b>${fmtN(u.anggota)}</b><span>anggota</span></div>
       <div class="pk"><b>${esc(u.peran||'—')}</b><span>peran MBG</span></div>
       <div class="pk" style="grid-column:1/3"><b>${esc(u.usaha||'—')}</b><span>unit usaha</span></div>`;
  let hasilHtml;
  /* PLAN 3 (revisi): jumlah kunjungan = monitoring utama saja (SPPG/KDMP sesuai jenis unit), NAKER dikecualikan */
  const count = primary.length;
  if(m){
    hasilHtml=`<div class="pop-has ok">
      <b>🟢 Sudah Dimonitor (${count}x Kunjungan)</b> · Terakhir: <i>${fmtD(m.tgl)}</i><br>
      🔎 Temuan: ${esc(m.temuan||'-')}<br>
      💡 Rekomendasi: ${esc(m.rekom||'-')}
    </div>`;
  }else{
    hasilHtml=`<div class="pop-has idle">⚪ <b>Belum Dimonitor</b> — lakukan kunjungan lapangan via tab Monitoring.</div>`;
  }
  if(nakerCount) hasilHtml+=`<div class="pop-has naker-note">👤 Kelengkapan Naker: <b>${nakerCount} form</b> (pendukung SPPG)</div>`;
  return `<div class="pop">
    <div class="pop-hd ${u.jenis.toLowerCase()}">
      <div class="pop-badge">${has?'<i class="fas fa-utensils"></i> SPPG / DAPUR MBG':'<i class="fas fa-store"></i> KDMP KOPERASI'}</div>
      <div class="pop-nm">${esc(u.nama)}</div>
      <div class="pop-sub">📂 ${esc(u.ref||'Belum ada registrasi')} · ${statusUnitLabel(u.status)}</div>
    </div>
    <div class="pop-bd">
      <div class="pop-row"><i class="fas fa-map-marker-alt"></i><span>${esc(u.alamat)},<br>Desa ${esc(u.desa)}, Kec. ${esc(u.kec)},<br><b>${esc(u.kab)}</b></span></div>
      ${u.pic?`<div class="pop-row"><i class="fas fa-user-tie"></i><span><b>${esc(u.pic)}</b>${u.telp?` · 📞 ${esc(u.telp)}`:''}</span></div>`:''}
      <div class="pop-kv">${kv}</div>
      ${hasilHtml}
    </div>
    <div class="pop-act">
      <button class="pop-btn d3" onclick="flyToUnit('${u.id}')"><i class="fas fa-crosshairs"></i> Pusat</button>
      <button class="pop-btn d2" onclick="navToUnit('${u.id}')"><i class="fas fa-route"></i> Rute Maps</button>
      <button class="pop-btn d1" onclick="openDetail('${u.id}')"><i class="fas fa-info-circle"></i> Detail</button>
      <button class="pop-btn d2" onclick="addMonitorFor('${u.id}')"><i class="fas fa-clipboard-check"></i> Monitoring</button>
    </div>
  </div>`;
}
function flyToUnit(id){const u=unitById(id);if(!u)return;map.flyTo([u.lat,u.lng],18,{duration:1.2});selectUnit(id);}
function navigateUnit(){const u=unitById(dtCurrent);if(!u)return;navToUnit(u.id);}
function navToUnit(id){const u=unitById(id);if(!u){toast('Unit tidak ditemukan','e');return;}const dest=encodeURIComponent(u.lat+','+u.lng);window.open('https://www.google.com/maps/dir/?api=1&destination='+dest,'_blank','noopener');toast('🗺️ Membuka rute Google Maps ke '+u.nama);}

let currentGeoJSON = null;

function selectRegion(name) {
  // Update UI & Filter
  document.getElementById('boundMenu').classList.remove('show');
  document.getElementById('fdKab').value = name;
  onFilterChange();
  
  // Update Boundary Arsir
  renderBoundaries(name);
  
  if (name) {
    toast('📂 Fokus wilayah: ' + name);
  } else {
    toast('🌍 Menampilkan seluruh wilayah');
    fitAll();
  }
}

async function loadBoundaries() {
  try {
    const res = await fetch('./regencies.json');
    if (!res.ok) throw new Error('Local file not found');
    currentGeoJSON = await res.json();
    renderBoundaries(''); // Start with all boundaries
  } catch (e) {
    console.error('Boundaries error:', e);
  }
}

function renderBoundaries(filterName) {
  if (!currentGeoJSON) return;
  boundariesLayer.clearLayers();
  
  const regionMeta = {
    '3375': { name: 'Kota Pekalongan', color: '#3B82F6' },
    '3326': { name: 'Kab. Pekalongan', color: '#64748B' },
    '3325': { name: 'Kab. Batang', color: '#F59E0B' }
  };

  const layer = L.geoJSON(currentGeoJSON, {
    filter: (feat) => {
      const id = String(feat.properties.id || feat.properties.code || '3325');
      if (!filterName) return regionMeta[id] != null;
      return regionMeta[id] && regionMeta[id].name === filterName;
    },
    style: (feat) => {
      const id = String(feat.properties.id || feat.properties.code || '3325');
      const meta = regionMeta[id] || { color: '#64748B' };
      return {
        fillColor: meta.color,
        fillOpacity: filterName ? 0.22 : 0.12,
        color: meta.color,
        weight: filterName ? 3 : 2,
        dashArray: '5, 5'
      };
    },
    onEachFeature: (feat, layer) => {
      const id = String(feat.properties.id || feat.properties.code || '3325');
      const name = regionMeta[id] ? regionMeta[id].name : 'Wilayah Kerja';
      layer.bindTooltip(name, { sticky: true, direction: 'top' });
    }
  }).addTo(boundariesLayer);
  
  if (filterName && layer.getBounds().isValid()) {
    map.flyToBounds(layer.getBounds(), {padding: [50, 50], duration: 1});
  }

  boundariesLayer.getLayers().forEach(l => { if(l.bringToBack) l.bringToBack(); });
}


/* Public action bridge for existing HTML controls. */
Object.defineProperties(globalThis, {
  boundariesVisible: { configurable: true, get: () => boundariesVisible, set: value => { boundariesVisible = value; } },
  currentGeoJSON: { configurable: true, get: () => currentGeoJSON, set: value => { currentGeoJSON = value; } }
});
Object.assign(globalThis, { initMap, syncMarkerZoomMode, toggleLayer, toggleBoundaries, resetView, fitAll, filteredUnits, renderMap, buildPopup, flyToUnit, navigateUnit, navToUnit, selectRegion, loadBoundaries, renderBoundaries });
