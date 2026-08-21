/* ============================================================
   DATABASE (seed contoh — ganti dengan data riil Anda)
============================================================ */
const DEF = {
  users:[
    {id:'u1',nama:'Koordinator MBG',username:'admin',password:'admin123',role:'admin'},
    {id:'u2',nama:'Ayu Lestari',username:'petugas1',password:'petugas123',role:'petugas'},
    {id:'u3',nama:'Bagas Pratama',username:'petugas2',password:'monitor123',role:'petugas'}
  ],
  units:[
    /* ------- SPPG ------- */
    {id:'s1',jenis:'SPPG',nama:'SPPG Pekalongan Timur 01',ref:'NIK-SPPG-3375-001',status:'aktif',kab:'Kota Pekalongan',kec:'Pekalongan Timur',desa:'Noyontaan',alamat:'Jl. Urip Sumoharjo No. 88, Noyontaan',lat:-6.8895,lng:109.6790,pic:'H. Suryanto',telp:'081234567801',yayasan:'Yayasan Samudra Berkah',kapasitas:3500,sekolah:12,slhs:'ya',mulai:'2026-01-05',note:''},
    {id:'s2',jenis:'SPPG',nama:'SPPG Pekalongan Barat 02',ref:'NIK-SPPG-3375-002',status:'aktif',kab:'Kota Pekalongan',kec:'Pekalongan Barat',desa:'Kertoharjo',alamat:'Jl. Hos Cokroaminoto No. 12',lat:-6.8940,lng:109.6610,pic:'Ibu Ratna Dewi',telp:'082278901234',yayasan:'Yayasan Cahaya Gizi Nusantara',kapasitas:3000,sekolah:10,slhs:'proses',mulai:'2026-02-01',note:''},
    {id:'s3',jenis:'SPPG',nama:'SPPG Wiradesa 01',ref:'NIK-SPPG-3326-004',status:'aktif',kab:'Kab. Pekalongan',kec:'Wiradesa',desa:'Bener',alamat:'Jl. Raya Wiradesa KM 3, Bener',lat:-6.8675,lng:109.7085,pic:'Bp. Hartono',telp:'085643210987',yayasan:'Yayasan BGN Lestari',kapasitas:3000,sekolah:9,slhs:'ya',mulai:'2026-01-12',note:''},
    {id:'s4',jenis:'SPPG',nama:'SPPG Kedungwuni 01',ref:'NIK-SPPG-3326-007',status:'persiapan',kab:'Kab. Pekalongan',kec:'Kedungwuni',desa:'Ambokembang',alamat:'Jl. Raya Kedungwuni No. 45',lat:-6.9715,lng:109.6510,pic:'Bp. Fajar Nugroho',telp:'081392005566',yayasan:'Yayasan Sahabat Gizi',kapasitas:2800,sekolah:8,slhs:'proses',mulai:'',note:'Renovasi dapur tahap 2, target operasi September 2026.'},
    {id:'s5',jenis:'SPPG',nama:'SPPG Kajen 01',ref:'NIK-SPPG-3326-011',status:'aktif',kab:'Kab. Pekalongan',kec:'Kajen',desa:'Kajen',alamat:'Jl. KH Wahid Hasyim, Kawasan Pesantren',lat:-7.0240,lng:109.6561,pic:'Bp. Ahmad Ridwan',telp:'085842337799',yayasan:'Yayasan Berkah Umat',kapasitas:3000,sekolah:11,slhs:'ya',mulai:'2026-01-20',note:''},
    {id:'s6',jenis:'SPPG',nama:'SPPG Batang Kota 01',ref:'NIK-SPPG-3325-001',status:'aktif',kab:'Kab. Batang',kec:'Batang',desa:'Pasekaran',alamat:'Jl. Untung Suropati No. 20',lat:-6.9055,lng:109.7320,pic:'Ibu Sri Wahyuni',telp:'082133445566',yayasan:'Yayasan Nawacita Gizi',kapasitas:3500,sekolah:13,slhs:'ya',mulai:'2026-01-05',note:''},
    {id:'s7',jenis:'SPPG',nama:'SPPG Subah 01',ref:'NIK-SPPG-3325-003',status:'persiapan',kab:'Kab. Batang',kec:'Subah',desa:'Subah',alamat:'Jl. Pantura Subah KM 12',lat:-6.9610,lng:109.8780,pic:'Bp. Danu Prawira',telp:'081901442233',yayasan:'Yayasan Subah Peduli',kapasitas:2500,sekolah:7,slhs:'belum',mulai:'',note:'Menunggu pengadaan peralatan masak dari BGN.'},
    {id:'s10',jenis:'SPPG',nama:'SPPG Gringsing 01',ref:'NIK-SPPG-3325-009',status:'rencana',kab:'Kab. Batang',kec:'Gringsing',desa:'Lebak',alamat:'Jl. Raya Gringsing (lokasi usulan)',lat:-6.9555,lng:110.0135,pic:'Calon pengelola',telp:'',yayasan:'Yayasan Laut Selatan Makmur',kapasitas:2500,sekolah:6,slhs:'belum',mulai:'',note:'Pengajuan ke BGN, survei lokasi sudah dilakukan.'},
    /* ------- KDMP ------- */
    {id:'k1',jenis:'KDMP',nama:'KDMP Tirto Sakti',ref:'NIK-51761-0021',status:'aktif',kab:'Kab. Pekalongan',kec:'Tirto',desa:'Tirto',alamat:'Jl. Raya Tirto No. 3, seberang balai desa',lat:-6.8731,lng:109.6532,pic:'Bp. Eko Purnomo (Ketua)',telp:'085211003344',anggota:214,peran:'Penyuplai Bahan Baku',usaha:'Warung sembako, agen beras & telur',note:''},
    {id:'k2',jenis:'KDMP',nama:'KDMP Kedungwuni Jaya',ref:'NIK-51761-0055',status:'aktif',kab:'Kab. Pekalongan',kec:'Kedungwuni',desa:'Kedungwuni',alamat:'Jl. Raya Kedungwuni',lat:-6.9710,lng:109.6520,pic:'Ibu Yuni Astuti (Ketua)',telp:'081544882211',anggota:180,peran:'Penyuplai Bahan Baku',usaha:'Agen ayam potong & sayur mayur',note:'Kemitraan suplai ke SPPG Kedungwuni & Kajen.'},
    {id:'k3',jenis:'KDMP',nama:'KDMP Kajen Mandiri',ref:'NIK-51761-0078',status:'persiapan',kab:'Kab. Pekalongan',kec:'Kajen',desa:'Nyamok',alamat:'Jl. Kyai Sahal, Nyamok',lat:-7.0225,lng:109.6600,pic:'Bp. Khoirul Anam',telp:'082137726677',anggota:96,peran:'Titik Distribusi MBG',usaha:'Simpan pinjam & logistik',note:'Struktur pengurus baru dilantik Juli 2026.'},
    {id:'k4',jenis:'KDMP',nama:'KDMP Bandar Bagun',ref:'NIK-51762-0013',status:'aktif',kab:'Kab. Batang',kec:'Bandar',desa:'Bandar',alamat:'Jl. Raya Bandar No. 7',lat:-6.9540,lng:109.7660,pic:'Bp. Slamet Widodo (Ketua)',telp:'085869334422',anggota:230,peran:'Penyuplai Bahan Baku',usaha:'Warung sembako, agen beras & ikan pindang',note:'Kandidat titik gudang bersama pesisir.'},
    {id:'k5',jenis:'KDMP',nama:'KDMP Limpung Sejahtera',ref:'NIK-51762-0029',status:'rencana',kab:'Kab. Batang',kec:'Limpung',desa:'Kalisari',alamat:'Jl. Raya Limpung',lat:-7.0760,lng:110.0100,pic:'Bp. Aris Gunawan',telp:'',anggota:0,peran:'Belum Ditentukan',usaha:'Belum beroperasi',note:'Dalam proses badan hukum di Kemencoop.'}
  ],
  monitoring:[
    {id:'m1',unitId:'s1',tgl:'2026-08-04',petugas:'Ayu Lestari',kebersihan:'baik',gizi:'baik',distribusi:'baik',dok:'baik',hasil:'baik',temuan:'Dapur beroperasi normal, 3.500 porsi terkirim tepat waktu ke 12 sekolah.',rekom:'Pertahankan standar; evaluasi menu bulanan.'},
    {id:'m2',unitId:'s1',tgl:'2026-07-22',petugas:'Ayu Lestari',kebersihan:'baik',gizi:'baik',distribusi:'perlu',dok:'baik',hasil:'perbaikan',temuan:'Distribusi ke SDN Krapyak terlambat 25 menit karena ban pick-up bocor.',rekom:'Sediakan armada cadangan / perjanjian sewa cadangan.'},
    {id:'m3',unitId:'s2',tgl:'2026-08-02',petugas:'Bagas Pratama',kebersihan:'perlu',gizi:'baik',distribusi:'baik',dok:'perlu',hasil:'perbaikan',temuan:'Tempat cuci sayur dekat area sampah; SLHS masih proses di Dinkes.',rekom:'Revisi layout area cuci; kejar penerbitan SLHS maksimal Agustus 2026.'},
    {id:'m4',unitId:'s3',tgl:'2026-08-01',petugas:'Ayu Lestari',kebersihan:'baik',gizi:'baik',distribusi:'baik',dok:'baik',hasil:'baik',temuan:'Bahan baku dari KDMP Tirto Sakti lengkap dan segar.',rekom:'Tetapkan kontrak suplai tertulis SPPG–KDMP.'},
    {id:'m5',unitId:'s5',tgl:'2026-07-29',petugas:'Bagas Pratama',kebersihan:'baik',gizi:'baik',distribusi:'baik',dok:'baik',hasil:'baik',temuan:'Gudang bahan kering tertata FIFO, stok aman 7 hari.',rekom:'-'},
    {id:'m6',unitId:'s6',tgl:'2026-08-03',petugas:'Bagas Pratama',kebersihan:'tidak',gizi:'perlu',distribusi:'baik',dok:'perlu',hasil:'kritis',temuan:'Ditemukan lalat pada area plating; menu tidak menampilkan data nilai gizi harian; laporan stok ke BGN telat 3 hari.',rekom:'Desinfeksi & pemasangan lampu UV perangkap serangga 24 jam; kirim ulang laporan 1x24 jam; pengawasan ulang minggu depan.'},
    {id:'m9',unitId:'k1',tgl:'2026-08-01',petugas:'Ayu Lestari',kebersihan:'baik',gizi:'baik',distribusi:'baik',dok:'baik',hasil:'baik',temuan:'Warung sembako aktif, harga bahan baku di bawah HET pasar untuk SPPG mitra.',rekom:'Jaga kualitas suplai telur; catat batch asal peternak.'},
    {id:'m10',unitId:'k2',tgl:'2026-07-28',petugas:'Bagas Pratama',kebersihan:'baik',gizi:'perlu',distribusi:'perlu',dok:'baik',hasil:'perbaikan',temuan:'Pengiriman ayam dua kali terlambat ke SPPG Kajen; rantai dingin belum ada di armada.',rekom:'Sediakan cool box; atur ulang jadwal pemetakan pukul 04.00 WIB.'},
    {id:'m11',unitId:'k4',tgl:'2026-07-31',petugas:'Ayu Lestari',kebersihan:'baik',gizi:'baik',distribusi:'baik',dok:'baik',hasil:'baik',temuan:'Pembukuan digital rapi; saldo cash opname sesuai laporan.',rekom:'-'},
    {id:'m15',unitId:'s6',tgl:'2026-07-25',petugas:'Ayu Lestari',kebersihan:'baik',gizi:'baik',distribusi:'perlu',dok:'baik',hasil:'perbaikan',temuan:'Laporan distribusi ke sekolah sasaran susulan karena keterlambatan kedatangan telur dari suplai luar.',rekom:'Alihkan suplai telur ke KDMP Bandar Bagun.'}
  ]
};

let DB = JSON.parse(JSON.stringify(DEF));
window.getDarmaDB=()=>DB;
let CU = null;
window.getDarmaCurrentUser=()=>CU;
let map, layerStreet, layerSat, layerMode='street', boundariesLayer;
let markers = [];
let pendingDel = null, dtCurrent = null, editingJenis = 'SPPG';
let tempMarker = null, pickMode = false; // pin 📍 pemilihan koordinat unit di peta
let FS = {jenis:'', hasil:'', kab:'', search:'', statusMon:'all', modeView:'progres', minFreq:null};
const LS_KEY = 'darma_mbg_v1';
/* ============================================================
   API / SYNC LAYER  (Cloudflare D1 via Worker — fallback lokal)
   - API.mode = 'cloud' bila Worker /api terjangkau, else 'local'
   - penulisan: persist() -> POST /api/{kind};  hapus: persistRemove()
============================================================ */
const API={
  base:(function(){try{return localStorage.getItem('simon_api_base')||'';}catch(e){return '';}})(),
  mode:'local',
  token:(function(){try{return localStorage.getItem('simon_token')||'';}catch(e){return '';}})(),
  setToken(t){this.token=t;try{if(t)localStorage.setItem('simon_token',t);else localStorage.removeItem('simon_token');}catch(e){}},
  async req(path,opts){const h=Object.assign({'Content-Type':'application/json'},(opts&&opts.headers)||{});if(this.token)h['Authorization']='Bearer '+this.token;const r=await fetch(this.base+path,Object.assign({},opts,{headers:h}));if(r.status===401){this.setToken('');}return r;},
  async isCloud(){try{const r=await fetch(this.base+'/api/ping');return r.ok;}catch(e){return false;}},
  async probe(){try{const r=await this.req('/api/state');if(!r.ok)return null;return await r.json();}catch(e){return null;}},
  async login(u,p){try{const r=await fetch(this.base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});if(!r.ok)return null;return await r.json();}catch(e){return null;}},
  async upsert(kind,item){try{const r=await this.req('/api/'+kind,{method:'POST',body:JSON.stringify(item)});return r.ok;}catch(e){return false;}},
  async remove(kind,id){try{const r=await this.req('/api/'+kind+'/'+encodeURIComponent(id),{method:'DELETE'});return r.ok;}catch(e){return false;}},
  async clear(kind){try{const r=await this.req('/api/'+kind,{method:'DELETE'});return r.ok;}catch(e){return false;}},
  async replaceAll(db){try{const r=await this.req('/api/state',{method:'PUT',body:JSON.stringify(db)});return r.ok;}catch(e){return false;}},
  async getUsers(){try{const r=await this.req('/api/users');if(!r.ok)return null;return (await r.json()).users;}catch(e){return null;}}
};

/* ============================================================
   UTIL
============================================================ */
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function uid(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function fmtD(tgl){if(!tgl)return '—';const d=new Date(tgl+'T00:00:00');if(isNaN(d))return tgl;return d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});}
function fmtN(n){return (n==null||n==='')?'—':Number(n).toLocaleString('id-ID');}
function toast(msg,type='ok'){const w=document.getElementById('toastwrap');const t=document.createElement('div');t.className='toast '+type;t.textContent=msg;w.appendChild(t);setTimeout(()=>{t.style.transition='all .3s';t.style.opacity='0';t.style.transform='translateX(40px)';setTimeout(()=>t.remove(),300);},2800);}
function loadDB(){try{const s=localStorage.getItem(LS_KEY);if(s)DB=JSON.parse(s);}catch(e){}}
function saveDB(){if(API.mode!=='local')return;try{localStorage.setItem(LS_KEY,JSON.stringify(DB));}catch(e){}}
async function loadDBAsync(){
  if(await API.isCloud()){
    API.mode='cloud';
    if(!API.token)return null;
    const st=await API.probe();
    if(st&&st.units){DB.units=st.units;DB.monitoring=st.monitoring;return st.user||null;}
    return null;
  }
  API.mode='local';loadDB();return null;
}
function reportDataChanged(){if(typeof markReportStale==='function')markReportStale();window.dispatchEvent(new CustomEvent('darma:data-changed'));}
function persist(kind,item){saveDB();reportDataChanged();if(API.mode==='cloud')API.upsert(kind,item).then(ok=>{if(!ok)toast('Gagal menyimpan ke cloud','e');});}
function persistRemove(kind,id){saveDB();reportDataChanged();if(API.mode==='cloud')API.remove(kind,id).then(ok=>{if(!ok)toast('Gagal menghapus di cloud','e');});}
function persistClear(kind){saveDB();reportDataChanged();if(API.mode==='cloud')API.clear(kind).then(ok=>{if(!ok)toast('Gagal sync cloud','e');});}
function persistReplace(){saveDB();reportDataChanged();if(API.mode==='cloud')API.replaceAll(DB).then(ok=>{if(!ok)toast('Gagal sync cloud','e');});}
function updateModeBadge(){const b=document.getElementById('modeBadge');if(!b)return;b.style.display='flex';if(API.mode==='cloud'){b.innerHTML='☁️ Cloud (D1)';b.style.background='#eff6ff';b.style.color='#1e40af';b.style.borderColor='#bfdbfe';}else{b.innerHTML='💾 Lokal (browser)';b.style.background='#f1f5f9';b.style.color='#475569';b.style.borderColor='#e2e8f0';}}
function loadSampleCloud(){DB=JSON.parse(JSON.stringify(DEF));persistReplace();renderAll();toast('☁️ Data contoh dimuat ke cloud');}
function closeM(id){document.getElementById(id).classList.add('hidden');}
function unitById(id){return DB.units.find(u=>u.id===id);}
function monsOf(unitId){return DB.monitoring.filter(m=>m.unitId===unitId).sort((a,b)=>b.tgl.localeCompare(a.tgl));}
/* PLAN 3 (revisi): hitungan KUNJUNGAN hanya monitoring utama sesuai jenis unit — form NAKER (per responden) TIDAK dihitung sebagai kunjungan */
function primaryMonsOf(unitId){const u=unitById(unitId);const k=m=>m.formType||m.jenis||(u?u.jenis:'');return DB.monitoring.filter(m=>m.unitId===unitId&&(k(m)==='SPPG'||k(m)==='KDMP')).sort((a,b)=>b.tgl.localeCompare(a.tgl));}
function lastMon(unitId){const m=monsOf(unitId);return m.length?m[0]:null;}
function unitHasil(u){const m=lastMon(u.id);return m?m.hasil:'belum';}
function computeHasil(k,g,d,dok){if([k,g,d,dok].includes('tidak'))return 'kritis';if([k,g,d,dok].includes('perlu'))return 'perbaikan';return 'baik';}
function slhsLabel(v){return v==='ya'?'✅ Sudah Terbit':v==='proses'?'🟡 Dalam Proses':'❌ Belum';}
function statusUnitLabel(v){return {aktif:'✅ Operasional',persiapan:'🟡 Persiapan',rencana:'⚪ Rencana',kendala:'🔴 Kendala'}[v]||v;}


/* Public action bridge for existing HTML controls. */
Object.assign(globalThis, { DEF, LS_KEY, API });
Object.defineProperties(globalThis, {
  DB: { configurable: true, get: () => DB, set: value => { DB = value; } },
  CU: { configurable: true, get: () => CU, set: value => { CU = value; } },
  map: { configurable: true, get: () => map, set: value => { map = value; } },
  layerStreet: { configurable: true, get: () => layerStreet, set: value => { layerStreet = value; } },
  layerSat: { configurable: true, get: () => layerSat, set: value => { layerSat = value; } },
  layerMode: { configurable: true, get: () => layerMode, set: value => { layerMode = value; } },
  boundariesLayer: { configurable: true, get: () => boundariesLayer, set: value => { boundariesLayer = value; } },
  markers: { configurable: true, get: () => markers, set: value => { markers = value; } },
  pendingDel: { configurable: true, get: () => pendingDel, set: value => { pendingDel = value; } },
  dtCurrent: { configurable: true, get: () => dtCurrent, set: value => { dtCurrent = value; } },
  editingJenis: { configurable: true, get: () => editingJenis, set: value => { editingJenis = value; } },
  tempMarker: { configurable: true, get: () => tempMarker, set: value => { tempMarker = value; } },
  pickMode: { configurable: true, get: () => pickMode, set: value => { pickMode = value; } },
  FS: { configurable: true, get: () => FS, set: value => { FS = value; } }
});
Object.assign(globalThis, { esc, uid, fmtD, fmtN, toast, loadDB, saveDB, loadDBAsync, reportDataChanged, persist, persistRemove, persistClear, persistReplace, updateModeBadge, loadSampleCloud, closeM, unitById, monsOf, primaryMonsOf, lastMon, unitHasil, computeHasil, slhsLabel, statusUnitLabel });
