/* ============================================================
   EXPORT / IMPORT (Excel · PDF · JSON)
============================================================ */
/* ---------- helper teks PDF (tanpa emoji, font standar jsPDF) ---------- */
import { formatRupiahAmount } from '../../domain/forms/currency.js';
import { computeEconomyAnalytics } from '../../domain/monitoring/economy-analytics.js';

function jutaToRpAbs(stored){ const n = Number(stored); return (stored === '' || stored == null || !Number.isFinite(n)) ? null : Math.round(n * 1000000); }
function pdfRp(storedJuta){ const abs = jutaToRpAbs(storedJuta); return abs == null ? '-' : stripEmoji(formatRupiahAmount(abs)); }
function pdfN(v){ const n = Number(v); return (v === '' || v == null || !Number.isFinite(n)) ? '-' : n.toLocaleString('id-ID'); }
const STATUS_PLAIN={aktif:'Operasional',persiapan:'Tahap Persiapan',rencana:'Direncanakan',kendala:'Ada Kendala'};
const HASIL_PLAIN={baik:'BAIK',perbaikan:'PERLU PERBAIKAN',kritis:'KRITIS',belum:'BELUM DIMONITOR'};
const ASPEK_PLAIN={baik:'Baik',perlu:'Perlu',tidak:'Tidak'};
const SLHS_PLAIN={ya:'Sudah Terbit',proses:'Dalam Proses',belum:'Belum'};
function stripEmoji(s){return String(s==null?'':s).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}]/gu,'').trim();}
function getJsPDF(){
  if(!window.jspdf||!window.jspdf.jsPDF){toast('Library PDF belum termuat — butuh internet saat pertama membuka aplikasi.','e');return null;}
  return window.jspdf.jsPDF;
}
function pdfHead(doc,title,subtitle,theme=null){
  const w=doc.internal.pageSize.getWidth();
  const headerBackground=theme&&theme.headerBackground?theme.headerBackground:[29,78,216];
  const headerText=theme&&theme.headerText?theme.headerText:[255,255,255];
  doc.__darmaPdfTheme=theme;
  doc.setFillColor(...headerBackground);doc.rect(0,0,w,20,'F');
  doc.setTextColor(...headerText);
  doc.setFontSize(13);doc.setFont('helvetica','bold');
  doc.text('DARMA-1',12,8.5);
  doc.setFontSize(8.5);doc.setFont('helvetica','normal');
  doc.text('Dashboard Akurat Reporting Manajemen Aplikasi SPPG & KDMP Wilayah Pekalongan',12,14.5);
  doc.setFontSize(8);
  doc.text('Dicetak: '+new Date().toLocaleString('id-ID',{dateStyle:'full',timeStyle:'short'}),w-12,8.5,{align:'right'});
  doc.text('Wilayah: Pekalongan - Batang',w-12,14.5,{align:'right'});
  let y=28;
  doc.setTextColor(30,30,30);doc.setFontSize(12);doc.setFont('helvetica','bold');
  doc.text(title,12,y);y+=5.5;
  if(subtitle){doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(90,90,90);doc.text(subtitle,12,y,{maxWidth:w-24});y+=5;}
  doc.setTextColor(30,30,30);
  return y+1;
}
function pdfFoot(doc){
  const n=doc.internal.getNumberOfPages(),w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();
  for(let i=1;i<=n;i++){
    doc.setPage(i);doc.setFontSize(7.5);doc.setFont('helvetica','normal');doc.setTextColor(140,140,140);
    doc.text('DARMA-1 - dokumen hasil monitoring',12,h-7);
    doc.text('Halaman '+i+' dari '+n,w-12,h-7,{align:'right'});
  }
}
const TBL_STYLE={fontSize:7,cellPadding:1.6,overflow:'linebreak'};
const TBL_HEAD={fillColor:[29,78,216],textColor:[255,255,255],fontSize:7.5,fontStyle:'bold'};
const TBL_ALT={alternateRowStyles:{fillColor:[239,246,255]}};
function exportPdfMonitoring(){
  const jsPDF=getJsPDF();if(!jsPDF)return;
  const fu=getVal('fHUnit'),ft=getVal('fHTgl');
  const fq=(getVal('fHSearch')||'').toLowerCase();
  let list=[...DB.monitoring].sort((a,b)=>a.tgl.localeCompare(b.tgl));
  if(fu)list=list.filter(m=>m.unitId===fu);
  if(ft)list=list.filter(m=>m.tgl===ft);
  if(fq)list=list.filter(m=>{const u=unitById(m.unitId)||{};const f=(m.form&&m.form.fields)||{};return (u.nama+' '+(m.petugas||'')+' '+(m.temuan||'')+' '+(m.rekom||'')+' '+(m.tgl||'')+' '+(f.sp109||'')+' '+(f.nk101||'')).toLowerCase().includes(fq);});
  if(!list.length){toast('Tidak ada data monitoring sesuai filter','e');return;}
  const doc=new jsPDF({orientation:'l',unit:'mm',format:'a4'});
  const filterDesc=['Filter: '+(fu?('Unit: '+(unitById(fu)||{}).nama):'Semua Unit'),
    ft?('Tanggal: '+fmtD(ft)):'Semua Tanggal'];
  let y=pdfHead(doc,'LAPORAN RIWAYAT MONITORING MBG',filterDesc.join('  |  ')+'\nTotal '+list.length+' catatan monitoring.');
  doc.autoTable({
    startY:y,
    head:[['No','Tanggal','Nama Unit','Jenis','Kecamatan','Kabupaten/Kota','Petugas','Kebersihan','Menu & Gizi','Distribusi','Dokumentasi','HASIL','Temuan Lapangan','Rekomendasi']],
    body:list.map((m,i)=>{const u=unitById(m.unitId)||{};
      const pTxt = [m.petugas, (m.form&&m.form.fields&&m.form.fields.sp109) ? 'Wawancara: '+m.form.fields.sp109 : ''].filter(Boolean).join('\n');
      return [i+1,fmtD(m.tgl),stripEmoji(u.nama),u.jenis||'',u.kec||'',u.kab||'',pTxt,ASPEK_PLAIN[m.kebersihan]||'',ASPEK_PLAIN[m.gizi]||'',ASPEK_PLAIN[m.distribusi]||'',ASPEK_PLAIN[m.dok]||'',HASIL_PLAIN[m.hasil]||m.hasil,stripEmoji(m.temuan||'-'),stripEmoji(m.rekom||'-')];}),
    styles:TBL_STYLE,headStyles:TBL_HEAD,...TBL_ALT,
    columnStyles:{0:{cellWidth:7},1:{cellWidth:17},2:{cellWidth:34},3:{cellWidth:13},4:{cellWidth:19},5:{cellWidth:22},6:{cellWidth:19},7:{cellWidth:14},8:{cellWidth:14},9:{cellWidth:14},10:{cellWidth:16},11:{cellWidth:22},12:{cellWidth:37},13:{cellWidth:31}},
    didParseCell:d=>{if(d.section==='head')return;
      if(d.column.index===11){const v=d.cell.raw;const c=v==='BAIK'?[22,163,74]:v==='PERLU PERBAIKAN'?[180,83,9]:[185,28,28];d.cell.styles.textColor=c;d.cell.styles.fontStyle='bold';}
    }
  });
  pdfFoot(doc);
  doc.save('DARMA-1_Monitoring_'+new Date().toISOString().slice(0,10)+'.pdf');
  toast('📄 PDF riwayat monitoring terunduh');
}
function exportPdfUnits(){
  const jsPDF=getJsPDF();if(!jsPDF)return;
  const list=[...filteredUnits()].sort((a,b)=>a.jenis===b.jenis?a.nama.localeCompare(b.nama):a.jenis==='SPPG'?-1:1);
  if(!list.length){toast('Tidak ada unit sesuai filter','e');return;}
  const doc=new jsPDF({orientation:'l',unit:'mm',format:'a4'});
  const fd=[];
  fd.push('Filter: '+(FS.jenis||'Semua Jenis'));
  fd.push(FS.kab||'Semua Kabupaten');
  fd.push(FS.hasil?('Hasil: '+HASIL_PLAIN[FS.hasil]):'Semua Status Hasil');
  if(FS.search)fd.push('Kata kunci: "'+FS.search+'"');
  const s=list.filter(u=>u.jenis==='SPPG').length,k=list.length-s;
  let y=pdfHead(doc,'LAPORAN MASTER UNIT SPPG & KDMP',fd.join('  |  ')+'\nTotal '+list.length+' unit (🍳 SPPG: '+s+' , 🏪 KDMP: '+k+').');
  doc.autoTable({
    startY:y,
    head:[['No','Jenis','Nama Unit','No. Registrasi','Kecamatan','Kabupaten/Kota','Alamat Lengkap','Penanggung Jawab / Kontak','Data Utama','Status Unit','Hasil Monitoring','Tgl Terakhir']],
    body:list.map((u,i)=>{
      const m=lastMon(u.id);
      const data=u.jenis==='SPPG'
        ?('Kapasitas '+fmtN(u.kapasitas)+' porsi/hr, '+fmtN(u.sekolah)+' sekolah. SLHS: '+SLHS_PLAIN[u.slhs||'belum']+'. '+(u.yayasan||''))
        :(fmtN(u.anggota)+' anggota. Peran: '+(u.peran||'-')+'. '+(u.usaha||''));
      return [i+1,u.jenis,stripEmoji(u.nama),u.ref||'-',u.kec,u.kab,stripEmoji(u.alamat)+', '+u.desa,stripEmoji(u.pic||'-')+(u.telp?(' / '+u.telp):''),stripEmoji(data),STATUS_PLAIN[u.status]||u.status,HASIL_PLAIN[unitHasil(u)],m?fmtD(m.tgl):'-'];
    }),
    styles:TBL_STYLE,headStyles:TBL_HEAD,...TBL_ALT,
    columnStyles:{0:{cellWidth:7},1:{cellWidth:14},2:{cellWidth:33},3:{cellWidth:24},4:{cellWidth:19},5:{cellWidth:22},6:{cellWidth:38},7:{cellWidth:30},8:{cellWidth:41},9:{cellWidth:17},10:{cellWidth:19},11:{cellWidth:16}},
    didParseCell:d=>{
      if(d.column.index===10&&d.section==='body'){const v=d.cell.raw;const c=v==='BAIK'?[22,163,74]:v==='PERLU PERBAIKAN'?[180,83,9]:v==='KRITIS'?[185,28,28]:[100,116,139];d.cell.styles.textColor=c;d.cell.styles.fontStyle='bold';}
    }
  });
  pdfFoot(doc);
  doc.save('DARMA-1_MasterUnit_'+new Date().toISOString().slice(0,10)+'.pdf');
  toast('📄 PDF master unit terunduh');
}
function exportPdfUnitDetail(id){
  const jsPDF=getJsPDF();if(!jsPDF)return;
  const u=unitById(id);if(!u)return;
  const ms=monsOf(id),last=ms[0],has=u.jenis==='SPPG';
  const doc=new jsPDF({orientation:'p',unit:'mm',format:'a4'});
  let y=pdfHead(doc,'KARTU PROFIL '+(has?'SPPG (DAPUR MBG)':'KDMP (KOPERASI)'),'Data hasil monitoring dan referensi unit per '+new Date().toLocaleDateString('id-ID',{dateStyle:'long'})+'.');
  const pairs=[
    ['Nama Unit',stripEmoji(u.nama)],
    ['Jenis',has?'SPPG - Satuan Pelayanan Pemenuhan Gizi (Dapur MBG)':'Koperasi Desa Merah Putih (KDMP)'],
    ['No. Registrasi / Referensi',u.ref||'-'],
    ['Status Unit',STATUS_PLAIN[u.status]||u.status],
    ['Kabupaten/Kota',u.kab],['Kecamatan',u.kec],['Desa/Kelurahan',u.desa],
    ['Alamat Lengkap',stripEmoji(u.alamat)],
    ['Koordinat',u.lat+', '+u.lng],
    ['Penanggung Jawab',stripEmoji(u.pic||'-')],
    ['Kontak',u.telp||'-']
  ];
  if(has){pairs.push(['Yayasan Pengelola',stripEmoji(u.yayasan||'-')],['Kapasitas',fmtN(u.kapasitas)+' porsi/hari'],['Sekolah Sasaran',fmtN(u.sekolah)+' sekolah'],['SLHS',SLHS_PLAIN[u.slhs||'belum']],['Mulai Operasi',u.mulai?fmtD(u.mulai):'-']);}
  else{pairs.push(['Jumlah Anggota',fmtN(u.anggota)+' orang'],['Peran dalam MBG',u.peran||'-'],['Unit Usaha',stripEmoji(u.usaha||'-')]);}
  pairs.push(['Hasil Monitoring Terakhir',last?(HASIL_PLAIN[last.hasil]+' ( '+fmtD(last.tgl)+' oleh '+stripEmoji(last.petugas)+' )'):'BELUM DIMONITOR']);
  if(u.note)pairs.push(['Catatan',stripEmoji(u.note)]);
  doc.autoTable({startY:y,body:pairs.map(p=>[{content:p[0],styles:{fontStyle:'bold',fillColor:[248,250,252],cellWidth:52}},{content:p[1]}]),theme:'grid',styles:{fontSize:8,cellPadding:2}});
  y=doc.lastAutoTable.finalY+6;
  doc.setFontSize(10);doc.setFont('helvetica','bold');doc.setTextColor(29,78,216);
  doc.text('RIWAYAT MONITORING ('+ms.length+' kunjungan)',12,y);y+=2;
  if(ms.length){
    doc.autoTable({
      startY:y,
      head:[['Tanggal','Petugas','Kebersihan','Menu & Gizi','Distribusi','Dokumen','HASIL','Temuan Lapangan','Rekomendasi']],
      body:ms.map(m=>[fmtD(m.tgl),[m.petugas, (m.form&&m.form.fields&&m.form.fields.sp109) ? 'Wawancara: '+m.form.fields.sp109 : ''].filter(Boolean).join('\n'),ASPEK_PLAIN[m.kebersihan],ASPEK_PLAIN[m.gizi],ASPEK_PLAIN[m.distribusi],ASPEK_PLAIN[m.dok],HASIL_PLAIN[m.hasil],stripEmoji(m.temuan||'-'),stripEmoji(m.rekom||'-')]),
      styles:{fontSize:6.8,cellPadding:1.5,overflow:'linebreak'},headStyles:TBL_HEAD,...TBL_ALT,
      columnStyles:{0:{cellWidth:16},1:{cellWidth:19},2:{cellWidth:14},3:{cellWidth:14},4:{cellWidth:14},5:{cellWidth:14},6:{cellWidth:21},7:{cellWidth:38},8:{cellWidth:33}},
      didParseCell:d=>{if(d.column.index===6&&d.section==='body'){const v=d.cell.raw;const c=v==='BAIK'?[22,163,74]:v==='PERLU PERBAIKAN'?[180,83,9]:[185,28,28];d.cell.styles.textColor=c;d.cell.styles.fontStyle='bold';}}
    });
  }else{doc.setFontSize(8);doc.setFont('helvetica','italic');doc.setTextColor(120,120,120);doc.text('Belum ada kunjungan monitoring untuk unit ini.',12,y+4);}
  pdfFoot(doc);
  doc.save('DARMA-1_Profil_'+u.nama.replace(/[^\w\s]/g,'').replace(/\s+/g,'_').slice(0,30)+'.pdf');
  toast('📄 PDF profil unit terunduh');
}
/* ============================================================
   PLAN 2 — RINGKASAN PDF = CERMINAN DASHBOARD (seksi A–E)
   P1: angka mengikuti filter aktif; kop mencantumkan filter.
============================================================ */
function pdfFilterDesc(){
  const parts=[];
  if(FS.jenis)parts.push('Jenis: '+FS.jenis);
  if(FS.kab)parts.push('Wilayah: '+FS.kab);
  if(FS.status)parts.push('Status: '+(STATUS_PLAIN[FS.status]||FS.status));
  if(FS.search)parts.push('Pencarian: "'+stripEmoji(FS.search)+'"');
  return parts.length?('Filter aktif — '+parts.join('  ·  ')):'Seluruh data (tanpa filter).';
}
function drawStatGrid(doc,y,cards){
  const x0=12,bw=60.6,bh=19.5,gx=2.3,gy=2.6;
  cards.slice(0,6).forEach((c,i)=>{
    const col=i%3,row=Math.floor(i/3);
    const x=x0+col*(bw+gx),yy=y+row*(bh+gy);
    doc.setDrawColor(226,232,240);doc.setFillColor(248,250,252);doc.roundedRect(x,yy,bw,bh,2,2,'FD');
    doc.setFontSize(13);doc.setFont('helvetica','bold');doc.setTextColor(15,23,42);
    doc.text(String(c.n),x+3.4,yy+7.2);
    doc.setFontSize(6.6);doc.setTextColor(51,65,85);doc.text(c.l,x+3.4,yy+11.8);
    doc.setFontSize(5.7);doc.setFont('helvetica','normal');doc.setTextColor(100,116,139);
    doc.text(c.sub||'',x+3.4,yy+15.3,{maxWidth:bw-6});
  });
  return y+2*(bh+gy)+2;
}
function drawProgressRow(doc,x,yy,w,label,val,total,color){
  const bw=w-64;
  doc.setFontSize(7);doc.setFont('helvetica','bold');doc.setTextColor(51,65,85);
  doc.text(label,x,yy+3.2);
  doc.setFillColor(226,232,240);doc.roundedRect(x+40,yy,bw,3.6,1.8,1.8,'F');
  const p=total>0?Math.min(100,val/total*100):0;
  if(p>0){doc.setFillColor(color[0],color[1],color[2]);doc.roundedRect(x+40,yy,Math.max(bw*p/100,4),3.6,1.8,1.8,'F');}
  doc.setFontSize(7);doc.setTextColor(15,23,42);
  doc.text(val+'/'+total+'  ('+Math.round(p)+'%)',x+44+bw,yy+3.2);
}
function monKind(m){ const u=unitById(m.unitId)||{}; return m.formType||m.jenis||u.jenis||''; }
/* AUDIT: Belanja Bahan Baku 1 minggu = pengeluaran per kelompok BAHAN BAKU (sp411, semua kelompok, dalam+luar kota);
   fallback ke total per kelompok supplier (sp410.total) bila sp411 tidak diisi. Skala tersimpan: Rp Juta. */
function bahanBakuJuta(f){
  const g=f&&f.sp411;
  if(g&&typeof g==='object'){
    let s=0,has=false;
    Object.keys(g).forEach(r=>{
      if(r==='total')return;
      const c=g[r]||{};
      ['dalam','luar'].forEach(k=>{const raw=c[k];const v=Number(raw);if(raw!==''&&raw!=null&&Number.isFinite(v)){s+=v;has=true;}});
    });
    if(has)return s;
  }
  const t=f&&f.sp410&&f.sp410.total;const n=Number(t);
  return (t!=null&&t!==''&&Number.isFinite(n))?n:null;
}
function exportPdfDash(){
  const jsPDF=getJsPDF();if(!jsPDF)return;
  const doc=new jsPDF({orientation:'p',unit:'mm',format:'a4'});
  /* P1: scope mengikuti filter aktif — sama dengan dashboard */
  const list=filteredUnits();
  const scopedMon=DB.monitoring.filter(m=>list.some(u=>u.id===m.unitId));
  const s=list.filter(u=>u.jenis==='SPPG').length,k=list.length-s;
  const oper=list.filter(u=>u.status==='aktif'),prep=list.filter(u=>u.status==='persiapan'),plan=list.filter(u=>u.status==='rencana');
  const primaryMon=scopedMon.filter(m=>{const kk=monKind(m);return kk==='SPPG'||kk==='KDMP';});
  const nakerMon=scopedMon.filter(m=>monKind(m)==='NAKER');
  const subSplit=arr=>arr.filter(u=>u.jenis==='SPPG').length+' SPPG · '+arr.filter(u=>u.jenis==='KDMP').length+' KDMP';
  let y=pdfHead(doc,'LAPORAN RINGKASAN MONITORING — CERMINAN DASHBOARD',
    DB.units.length+' unit terdaftar · '+list.length+' unit dalam lingkup · '+primaryMon.length+' monitoring utama · '+nakerMon.length+' form Naker.\n'+pdfFilterDesc());

  /* A. Ringkasan Statistik (cerminan 6 kartu dashboard) */
  doc.setFontSize(9.5);doc.setFont('helvetica','bold');doc.setTextColor(29,78,216);
  doc.text('A. Ringkasan Statistik',12,y);y+=2;
  y=drawStatGrid(doc,y,[
    {n:s,l:'SPPG / DAPUR MBG',sub:'unit terdaftar dalam lingkup'},
    {n:k,l:'KDMP KOPERASI',sub:'unit terdaftar dalam lingkup'},
    {n:primaryMon.length,l:'MONITORING UTAMA',sub:'SPPG '+primaryMon.filter(m=>monKind(m)==='SPPG').length+' · KDMP '+primaryMon.filter(m=>monKind(m)==='KDMP').length+' · Naker '+nakerMon.length+' form'},
    {n:oper.length,l:'AKTIF / OPERASIONAL',sub:subSplit(oper)},
    {n:prep.length,l:'DALAM PERSIAPAN',sub:subSplit(prep)},
    {n:plan.length,l:'RENCANA / USULAN',sub:subSplit(plan)},
  ]);

  /* B. Progres Cakupan Monitoring (bar digambar) */
  y+=3;doc.setFontSize(9.5);doc.setFont('helvetica','bold');doc.setTextColor(29,78,216);
  doc.text('B. Progres Cakupan Monitoring (Sudah vs Belum)',12,y);y+=4;
  const monByKind=kind=>{const us=list.filter(u=>u.jenis===kind);const mon=us.filter(u=>scopedMon.some(m=>m.unitId===u.id&&monKind(m)===kind));return [mon.length,us.length];};
  const sPair=monByKind('SPPG'),kPair=monByKind('KDMP');
  const totMon=list.filter(u=>primaryMon.some(m=>m.unitId===u.id)).length;
  drawProgressRow(doc,14,y,184,'SPPG Dimonitor',sPair[0],sPair[1],[245,158,11]);y+=7;
  drawProgressRow(doc,14,y,184,'KDMP Dimonitor',kPair[0],kPair[1],[59,130,246]);y+=7;
  drawProgressRow(doc,14,y,184,'Total Cakupan',totMon,list.length,[22,163,74]);y+=6;

  /* C. Unit per Kabupaten/Kota (cerminan bar kabupaten) */
  doc.setFontSize(9.5);doc.setFont('helvetica','bold');doc.setTextColor(29,78,216);
  doc.text('C. Unit per Kabupaten/Kota',12,y);y+=2;
  const kabs=Object.keys(KABUPATEN).map(kab=>{
    const us=list.filter(u=>u.kab===kab);
    return [kab,us.filter(u=>u.jenis==='SPPG').length,us.filter(u=>u.jenis==='KDMP').length,us.length,primaryMon.filter(m=>us.some(u=>u.id===m.unitId)).length]; /* monitoring utama saja — NAKER dikecualikan, konsisten dgn kartu A */
  });
  doc.autoTable({startY:y,head:[['Kabupaten/Kota','SPPG','KDMP','Total Unit','Monitoring Utama']],body:kabs,
    styles:TBL_STYLE,headStyles:TBL_HEAD,...TBL_ALT,columnStyles:{0:{cellWidth:60},1:{cellWidth:30},2:{cellWidth:30},3:{cellWidth:32},4:{cellWidth:34}}});
  y=doc.lastAutoTable.finalY+6;

  /* D. Ringkasan Monitoring SPPG — kunjungan TERAKHIR per unit + baris TOTAL (revisi user) */
  doc.setFontSize(9.5);doc.setFont('helvetica','bold');doc.setTextColor(29,78,216);
  doc.text('D. Ringkasan Monitoring SPPG (Kunjungan Terakhir per Unit)',12,y);y+=2;
  const allSppgRecs=scopedMon.filter(m=>monKind(m)==='SPPG');
  const seenSppgUnits=new Set();const sppgRecs=[];
  [...allSppgRecs].sort((a,b)=>String(b.tgl||'').localeCompare(String(a.tgl||''))).forEach(m=>{
    if(!seenSppgUnits.has(m.unitId)){seenSppgUnits.add(m.unitId);sppgRecs.push(m);}
  });
  if(sppgRecs.length){
    let sumPenerima=0,sumBelanja=0,sumOps=0;
    const bodyRows=sppgRecs.map((m,i)=>{
      const u=unitById(m.unitId)||{};const f=(m.form&&m.form.fields)||{};
      const ka=(f.sp107&&String(f.sp107).trim())||u.pic||'';
      const nama=stripEmoji(u.nama)+(ka?'\nKa. SPPG: '+stripEmoji(ka):'');
      const kendala=Array.isArray(f.sp414)?f.sp414.filter(Boolean).join(', '):(f.sp414||'-');
      const porsiN=(f.sp201&&f.sp201.total!=null)?Number(f.sp201.total):null;
      const belanjaN=jutaToRpAbs(bahanBakuJuta(f)); /* AUDIT: utama sp411 (kelompok bahan baku), fallback sp410 */
      const opsN=jutaToRpAbs(f.sp413&&f.sp413.total);
      if(porsiN!=null)sumPenerima+=porsiN;
      if(belanjaN!=null)sumBelanja+=belanjaN;
      if(opsN!=null)sumOps+=opsN;
      return [i+1,nama,fmtD(m.tgl),porsiN!=null?pdfN(porsiN):'-',belanjaN!=null?pdfRp(belanjaN/1000000):'-',opsN!=null?pdfRp(f.sp413.total):'-',stripEmoji(kendala||'-'),stripEmoji(m.temuan||'-')];
    });
    doc.autoTable({startY:y,
      head:[['No','Nama SPPG / Ka. SPPG','Tgl','Penerima','Belanja Baku 1mgg','Biaya Ops 1mgg','Kendala/Hambatan','Catatan Lain']],
      body:bodyRows,
      foot:[['','TOTAL — '+sppgRecs.length+' unit','',pdfN(sumPenerima),pdfRp(sumBelanja/1000000),pdfRp(sumOps/1000000),'','']],
      footStyles:{fillColor:[219,234,254],textColor:[30,64,175],fontStyle:'bold',fontSize:6.6,cellPadding:1.5},
      styles:{fontSize:6.6,cellPadding:1.5,overflow:'linebreak'},headStyles:TBL_HEAD,...TBL_ALT,
      columnStyles:{0:{cellWidth:7},1:{cellWidth:28},2:{cellWidth:15},3:{cellWidth:14},4:{cellWidth:19},5:{cellWidth:19},6:{cellWidth:31},7:{cellWidth:55}}});
    y=doc.lastAutoTable.finalY+3.5;
    doc.setFontSize(6.8);doc.setFont('helvetica','italic');doc.setTextColor(100,116,139);
    doc.text('Catatan: tabel menampilkan kunjungan TERAKHIR setiap unit SPPG. Total seluruh kunjungan dalam lingkup: '+allSppgRecs.length+' rekaman dari '+seenSppgUnits.size+' unit SPPG. Belanja Bahan Baku = jumlah sendiri pengeluaran per kelompok bahan baku (sp411: pokok/lauk/sayur/buah/minuman/lainnya, dalam+luar kota); unit yang belum mengisi sp411 tampil sebagai "-".',12,y,{maxWidth:186});
    y+=6;
  }else{doc.setFontSize(8);doc.setFont('helvetica','italic');doc.setTextColor(120);doc.text('Belum ada rekaman monitoring SPPG dalam lingkup.',12,y+3);y+=8;}

  /* E. Lensa Ekonomi Daerah (5 skor terpisah per kabupaten) */
  doc.addPage();
  let yE=pdfHead(doc,'LENSA EKONOMI DAERAH — INDIKATOR PROKSI KAWASAN MBG','Dihitung dari rekaman monev terakhir per unit SPPG.\n'+pdfFilterDesc());
  const econ=computeEconomyAnalytics({units:list,monitoring:scopedMon},Object.keys(KABUPATEN));
  const fmtP2=v=>v==null?'-':(v>=0?'+':'')+v.toFixed(1)+'%';
  doc.autoTable({startY:yE,
    head:[['Kabupaten/Kota','Dana BGN (top-up)','Local Content','Ke Koperasi/Desa','Delta Harga','Pekerja','Payroll (bln)','Serapan','n (SPPG)']],
      body:econ.map(r=>{const p=r.pillars;return [
        r.kab,
        p.dana.topUpRp==null?'-':pdfRp(p.dana.topUpRp/1000000),
        p.lokal.localContentPct==null?'-':p.lokal.localContentPct.toFixed(1)+'%',
        p.lokal.koperasiPct==null?'-':p.lokal.koperasiPct.toFixed(1)+'%',
        p.harga.changePct==null?'-':fmtP2(p.harga.changePct),
        p.naker.pekerja==null?'-':String(p.naker.pekerja),
        p.naker.payrollRp==null?'-':pdfRp(p.naker.payrollRp/1000000),
        p.serapan.utilisasiPct==null?'-':p.serapan.utilisasiPct.toFixed(1)+'%',
        String(r.nSppgVisits)];}),
    styles:{fontSize:7,cellPadding:1.8,overflow:'linebreak'},headStyles:TBL_HEAD,...TBL_ALT,
    columnStyles:{0:{cellWidth:32},1:{cellWidth:26},2:{cellWidth:20},3:{cellWidth:22},4:{cellWidth:18},5:{cellWidth:14},6:{cellWidth:26},7:{cellWidth:15},8:{cellWidth:9}}});
  let yE2=doc.lastAutoTable.finalY+5;
  doc.setFontSize(6.8);doc.setFont('helvetica','italic');doc.setTextColor(100,116,139);
  doc.text('Catatan metodologi: indikator proksi kawasan MBG, BUKAN statistik resmi (bukan PDRB/inflasi BPS). Nilai uang = rupiah penuh (konversi presisi dari skala Rp Juta 6-desimal). n = jumlah kunjungan monitoring SPPG (sumber pilar Dana, Local Content, Harga, Serapan); form NAKER hanya untuk pilar Ketenagakerjaan; monitoring KDMP tidak dipakai lensa ini (instrumen berbeda, tanpa field keuangan/pangan/upah). Delta harga = rata-rata perubahan beras/ayam/telur/susu (bulan ini vs lalu). Skor antar-pilar tidak digabung (tanpa komposit).',12,yE2,{maxWidth:186});
  pdfFoot(doc);
  doc.save('DARMA-1_LaporanRingkasan_'+new Date().toISOString().slice(0,10)+'.pdf');
  toast('📄 Laporan ringkasan (cerminan dashboard) terunduh');
}

/* ============================================================
   PLAN 1 — PDF TABEL RINGKAS MONITORING (modal)
   Mencetak SEMUA baris hasil filter modal (bukan hanya yang terlihat).
============================================================ */
function exportMonTablePdf(){
  const jsPDF=getJsPDF();if(!jsPDF)return;
  if(typeof monTableRecords!=='function'){toast('Tabel monitoring belum siap.','e');return;}
  const recs=monTableRecords();
  if(!recs.length){toast('Tidak ada data sesuai filter tabel.','e');return;}
  const isNaker=(typeof monTableSegment==='function'?monTableSegment():'primary')==='naker';
  const doc=new jsPDF({orientation:'l',unit:'mm',format:'a4'});
  const searchEl=document.getElementById('mtSearch'),kabEl=document.getElementById('mtKab');
  const desc=[(searchEl&&searchEl.value)?('Cari: "'+stripEmoji(searchEl.value)+'"'):'',(kabEl&&kabEl.value)?('Kab/Kota: '+kabEl.value):''].filter(Boolean).join('  ·  ')||'Tanpa filter tambahan';
  let y=pdfHead(doc,'RINGKASAN MONITORING — '+(isNaker?'TENAGA KERJA (NAKER)':'MONITORING UTAMA (SPPG & KDMP)'),desc+'\nTotal '+recs.length+' baris — mencetak SEMUA baris filter, bukan hanya yang terlihat di layar.');
  if(isNaker){
    doc.autoTable({startY:y,head:[['No','Tanggal','Unit SPPG','Responden','Jabatan','Upah/Bulan','Hari/Mgg','Dampak Ekonomi Keluarga']],
      body:recs.map((m,i)=>{const u=unitById(m.unitId)||{};const f=(m.form&&m.form.fields)||{};const up=Number(f.nk207);
        return [i+1,fmtD(m.tgl),stripEmoji(u.nama),stripEmoji(f.nk101||'-'),stripEmoji(f.nk102||'-'),(f.nk207===''||f.nk207==null||!Number.isFinite(up))?'-':stripEmoji(formatRupiahAmount(up)),(f.nk205===''||f.nk205==null)?'-':String(f.nk205),stripEmoji(f.nk308||'-')];}),
      styles:{fontSize:7,cellPadding:1.7,overflow:'linebreak'},headStyles:TBL_HEAD,...TBL_ALT,
      columnStyles:{0:{cellWidth:9},1:{cellWidth:20},2:{cellWidth:52},3:{cellWidth:36},4:{cellWidth:30},5:{cellWidth:28},6:{cellWidth:14},7:{cellWidth:75}}});
  }else{
    doc.autoTable({startY:y,head:[['No','Tanggal','Unit','Kab/Kota','Petugas','Porsi/hr','Sekolah','Skor','Temuan']],
      body:recs.map((m,i)=>{const u=unitById(m.unitId)||{};const f=(m.form&&m.form.fields)||{};
        const porsi=(f.sp201&&f.sp201.total!=null)?pdfN(f.sp201.total):'-';
        const sek=(f.sp202&&f.sp202.total!=null)?pdfN(f.sp202.total):'-';
        const skor=(m.form&&m.jenis==='KDMP'&&m.form.avg!=null)?String(m.form.avg):'-';
        return [i+1,fmtD(m.tgl),stripEmoji(u.nama),stripEmoji(u.kab||'-'),stripEmoji(m.petugas||'-'),porsi,sek,skor,stripEmoji(m.temuan||'-')];}),
      styles:{fontSize:7,cellPadding:1.7,overflow:'linebreak'},headStyles:TBL_HEAD,...TBL_ALT,
      columnStyles:{0:{cellWidth:9},1:{cellWidth:20},2:{cellWidth:56},3:{cellWidth:26},4:{cellWidth:34},5:{cellWidth:15},6:{cellWidth:15},7:{cellWidth:13},8:{cellWidth:76}}});
  }
  pdfFoot(doc);
  doc.save('DARMA-1_TabelMonitoring_'+new Date().toISOString().slice(0,10)+'.pdf');
  toast('📄 PDF tabel monitoring terunduh ('+recs.length+' baris)');
}
function exportXlsxUnit(id){
  const u=unitById(id);if(!u)return;
  const has=u.jenis==='SPPG',ms=monsOf(id);
  const info=[['Nama Unit',u.nama],['Jenis',has?'SPPG (Dapur MBG)':'KDMP (Koperasi Desa Merah Putih)'],['No. Registrasi',u.ref||''],['Status',statusUnitLabel(u.status)],['Kabupaten/Kota',u.kab],['Kecamatan',u.kec],['Desa',u.desa],['Alamat',u.alamat],['Latitude',u.lat],['Longitude',u.lng],['Penanggung Jawab',u.pic||''],['Kontak',u.telp||'']];
  if(has)info.push(['Yayasan',u.yayasan||''],['Kapasitas Porsi/Hari',u.kapasitas||0],['Sekolah Sasaran',u.sekolah||0],['SLHS',slhsLabel(u.slhs||'belum')],['Mulai Operasi',u.mulai||'']);
  else info.push(['Jumlah Anggota',u.anggota||0],['Peran MBG',u.peran||''],['Unit Usaha',u.usaha||'']);
  info.push(['Catatan',u.note||'']);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(info),'Profil Unit');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(ms.map(m=>({'Tanggal':m.tgl,'Petugas Tim':m.petugas,'Pewawancara (SPPG)':(m.form&&m.form.fields&&m.form.fields.sp109)||'','Link Lampiran Berkas':(m.form&&m.form.fields&&m.form.fields.sp_link_lampiran)||'','Kebersihan':ASPEK_META[m.kebersihan],'Menu & Gizi':ASPEK_META[m.gizi],'Distribusi':ASPEK_META[m.distribusi],'Dokumentasi':ASPEK_META[m.dok],'Hasil':HASIL_META[m.hasil].label,'Temuan':m.temuan||'','Rekomendasi':m.rekom||''}))),'Riwayat Monitoring');
  XLSX.writeFile(wb,'DARMA-1_'+u.nama.replace(/[^\w\s]/g,'').replace(/\s+/g,'_').slice(0,30)+'.xlsx');
  toast('📥 Excel unit terunduh');
}
function exportXlsx(mode,useFilters){
  const wb=XLSX.utils.book_new();
  if(mode!=='monitoring'){
    const rows=DB.units.map(u=>({'Jenis':u.jenis==='SPPG'?'SPPG (Dapur MBG)':'KDMP (Koperasi)','Nama Unit':u.nama,'No Registrasi/Referensi':u.ref||'','Status':statusUnitLabel(u.status),'Kabupaten/Kota':u.kab,'Kecamatan':u.kec,'Desa/Kelurahan':u.desa,'Alamat Lengkap':u.alamat,'Latitude':u.lat,'Longitude':u.lng,'Penanggung Jawab':u.pic||'','Kontak':u.telp||'',
      ...(u.jenis==='SPPG'?{'Yayasan':u.yayasan||'','Kapasitas Porsi/Hari':u.kapasitas||0,'Sekolah Sasaran':u.sekolah||0,'SLHS':slhsLabel(u.slhs||'belum'),'Anggota':'','Peran MBG':'','Unit Usaha':''}:{'Yayasan':'','Kapasitas Porsi/Hari':'','Sekolah Sasaran':'','SLHS':'','Anggota':u.anggota||0,'Peran MBG':u.peran||'','Unit Usaha':u.usaha||''}),
      'Hasil Monitoring Terakhir':HASIL_META[unitHasil(u)].label,'Tgl Monitoring Terakhir':(lastMon(u.id)||{}).tgl||'','Catatan':u.note||''}));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Master Unit');
  }
  let mons=DB.monitoring;
  if(useFilters){
    const fu=getVal('fHUnit'),ft=getVal('fHTgl');
    const fq=(getVal('fHSearch')||'').toLowerCase();
    if(fu)mons=mons.filter(m=>m.unitId===fu);
    if(ft)mons=mons.filter(m=>m.tgl===ft);
    if(fq)mons=mons.filter(m=>{const u=unitById(m.unitId)||{};const f=(m.form&&m.form.fields)||{};return (u.nama+' '+(m.petugas||'')+' '+(m.temuan||'')+' '+(m.rekom||'')+' '+(m.tgl||'')+' '+(f.sp109||'')+' '+(f.nk101||'')).toLowerCase().includes(fq);});
    if(!mons.length){toast('Tidak ada data monitoring sesuai filter untuk diekspor','e');return;}
  }
  const mrows=[...mons].sort((a,b)=>a.tgl.localeCompare(b.tgl)).map(m=>{
    const u=unitById(m.unitId)||{};
    const isKdmp=m.form&&m.jenis==='KDMP', isSppg=m.form&&m.jenis==='SPPG';
    let survey='';
    if(isSppg){survey=Object.entries(m.form.fields||{}).filter(([,v])=>v&&v!=='').map(([k,v])=>(SPPG_FIELD_LABEL[k]||k)+': '+v).join('  |  ');}
    const comp=m.form&&m.form.compliance?m.form.compliance:[];
    return {'Tanggal':m.tgl,'Jenis':u.jenis||'','Nama Unit':u.nama||'','Kecamatan':u.kec||'','Kabupaten/Kota':u.kab||'','Petugas Tim':m.petugas,'Pewawancara':(m.form&&m.form.fields&&m.form.fields.sp109)||'','Link Lampiran':(m.form&&m.form.fields&&m.form.fields.sp_link_lampiran)||'',
      'Kebersihan & Sanitasi':ASPEK_META[m.kebersihan]||m.kebersihan||'','Kualitas Menu & Gizi':ASPEK_META[m.gizi]||m.gizi||'','Distribusi':ASPEK_META[m.distribusi]||m.distribusi||'','Dokumentasi':ASPEK_META[m.dok]||m.dok||'',
      'Skor Rata-rata (KDMP)':isKdmp?(m.form.avg!=null?m.form.avg:''):'',
      'Kategori (KDMP)':isKdmp?(m.form.kategori||''):'',
      'Kepatuhan Ya/Total (KDMP)':isKdmp?(comp.filter(x=>x==='ya').length+'/'+comp.length):'',
      'Ringkasan Survei (SPPG)':survey,
      'HASIL':HASIL_META[m.hasil]?HASIL_META[m.hasil].label:m.hasil,'Temuan Lapangan':m.temuan||'','Rekomendasi':m.rekom||''};
  });
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(mrows),'Hasil Monitoring');
  XLSX.writeFile(wb,`DARMA-1_${mode==='monitoring'?'monitoring':'lengkap'}_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('📥 File Excel terunduh');
}
function exportJSON(){
  const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`DARMA-1_backup_${new Date().toISOString().slice(0,10)}.json`;a.click();
  toast('📥 Backup JSON terunduh');
}
function importJSON(ev){
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{try{
    const d=JSON.parse(r.result);
    if(!d.units||!d.monitoring)throw 0;
    DB=d;persistReplace();renderAll();toast('✅ Data backup dipulihkan');
  }catch(e){toast('File backup tidak valid','e');}};
  r.readAsText(f);ev.target.value='';
}


/* IMPOR UNIT (GABUNG) — tambah unit dari file JSON tanpa menghapus data lain.
   Aman untuk file sampling DJPb {units:[...]} maupun backup penuh (diambil units-nya saja).
   Duplikat dilewati berdasarkan kombinasi nama+kecamatan+kabupaten. */
function importUnitsJSON(ev){
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{try{
    const d=JSON.parse(r.result);
    const list=Array.isArray(d)?d:(Array.isArray(d.units)?d.units:null);
    if(!list)throw 0;
    const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
    const key=u=>norm(u.nama)+'|'+norm(u.kec)+'|'+norm(u.kab);
    const existId=new Set(DB.units.map(u=>u.id));
    const existKey=new Set(DB.units.map(key));
    let added=0,skipped=0;
    list.forEach(src=>{
      const jenis=String((src&&src.jenis)||'KDMP').toUpperCase();
      if(!src||!src.nama||(jenis!=='SPPG'&&jenis!=='KDMP')){skipped++;return;}
      const u={id:''};
      ['jenis','nama','ref','status','kab','kec','desa','alamat','lat','lng','pic','telp','note','yayasan','kapasitas','sekolah','slhs','mulai','anggota','peran','usaha'].forEach(k=>{u[k]=src[k]===undefined?'':src[k];});
      u.jenis=jenis;
      if(existKey.has(key(u))){skipped++;return;}
      let id=src.id||uid('u');while(existId.has(id))id=uid('u');
      u.id=id;existId.add(id);existKey.add(key(u));
      DB.units.push(u);persist('units',u);added++;
    });
    renderAll();
    toast(added?`✅ ${added} unit ditambahkan${skipped?` · ${skipped} dilewati (duplikat/tidak valid)`:''}`:'Tidak ada unit baru — semua duplikat atau tidak valid',added?'':'e');
  }catch(e){toast('File unit tidak valid','e');}};
  r.readAsText(f);ev.target.value='';
}

/* Public action bridge for existing HTML controls. */
Object.assign(globalThis, { STATUS_PLAIN, HASIL_PLAIN, ASPEK_PLAIN, SLHS_PLAIN, TBL_STYLE, TBL_HEAD, TBL_ALT });
Object.assign(globalThis, { stripEmoji, getJsPDF, pdfHead, pdfFoot, exportPdfMonitoring, exportPdfUnits, exportPdfUnitDetail, exportPdfDash, exportMonTablePdf, exportXlsxUnit, exportXlsx, exportJSON, importJSON, importUnitsJSON });
