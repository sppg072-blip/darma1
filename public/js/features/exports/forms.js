import { themeForFormType } from './pdf-theme.js';
import { currencyScaleForField, displayUnitForField, formatStoredCurrency, storedCurrencyToAbsolute } from '../../domain/forms/currency.js';
import { getSppgAnalytics, formatSppgAnalytics } from '../../domain/monitoring/operational-analytics.js';

/* ============================================================
   CETAK FORM — output persis seperti layout Excel/Juknis
============================================================ */
function pdfSafe(s){s=String(s==null?'':s).replace(/[\u2013\u2014]/g,'-').replace(/[\u2018\u2019\u201A\u201B]/g,"'").replace(/[\u201C\u201D\u201E]/g,'"').replace(/\u2192/g,'->').replace(/\u2026/g,'...');s=stripEmoji(s);return s.replace(/[^A-Za-z0-9 \-_.,&()/:%+*=#@!?<>"']/g,'').replace(/\s+/g,' ').trim();}
function pdfTableHead(doc){const theme=doc.__darmaPdfTheme;if(!theme||!theme.tableHead)return TBL_HEAD;return Object.assign({},theme.tableHead,{fillColor:[...theme.tableHead.fillColor],textColor:[...theme.tableHead.textColor]});}
function pdfLabelBackground(doc){const theme=doc.__darmaPdfTheme;return theme&&theme.labelBackground?[...theme.labelBackground]:[244,244,244];}
function formTitle(doc,text,y,PH){
  if(y>PH-26){doc.addPage();y=18;}
  const theme=doc.__darmaPdfTheme,w=doc.internal.pageSize.getWidth();
  doc.setFontSize(9.5);doc.setFont('helvetica','bold');
  if(theme&&theme.sectionBackground&&theme.sectionText){
    doc.setFillColor(...theme.sectionBackground);doc.roundedRect(12,y-4.5,w-24,7.2,1,1,'F');
    doc.setTextColor(...theme.sectionText);doc.text(pdfSafe(text),14,y);
  }else{
    doc.setTextColor(29,78,216);doc.text(pdfSafe(text),12,y);
  }
  return y+4.8;
}
function recFormData(jenis,mode){
  const u=unitById(getVal('rUnit'));
  const formType=(jenis==='KDMP'?'KDMP':(currentRekamForm||'SPPG'));
  if(mode==='isi'){
    const def=formType==='SPPG'?getActiveSppgFormDefinition():(FORMS[formType]||FORM_NAKER);
    const form=jenis==='KDMP'?collectKDMP():collectGeneric(def);
    if(formType==='SPPG')form.version=currentSppgFormVersion;
    if(jenis==='KDMP'&&form.terjawab===0){toast('Isi minimal satu butir sebelum mencetak','e');return null;}
    return {unitId:u?u.id:'',tgl:getVal('rTgl'),petugas:getVal('rPetugas'),jenis:jenis,formType:formType,form:form,hasil:(jenis==='KDMP')?form.hasil:(getVal('rHasilManual')||'baik')};
  }
  return {unitId:u?u.id:'',tgl:'',petugas:'',jenis:jenis,formType:formType,form:jenis==='KDMP'?{sections:[],compliance:[]}:{version:SPPG_FORM_VERSION,fields:{}}};
}
function fieldVal(fld,v,filled){if(!filled)return '';const scale=currencyScaleForField(fld);if(scale)return formatStoredCurrency(v,scale);if(fld&&fld.type==='photo')return v?'✓ Foto Terlampir (Lihat Gambar di Bawah)':'-';if(fld&&(fld.type==='url'||fld.type==='link'))return v?('Link: '+v):'-';if(Array.isArray(v))return v.join('; ');if(v&&typeof v==='object')return '';return v||'';}
function currencyValueForOutput(field,parentField,value){const scale=currencyScaleForField(field,parentField);return scale?formatStoredCurrency(value,scale):(value||'');}
function unitForOutput(field,parentField=null){return displayUnitForField(field,parentField);}
function hasFormData(form){const f=(form&&form.fields)||{};return Object.keys(f).some(k=>{const v=f[k];if(v==null||v==='')return false;if(Array.isArray(v))return v.length>0;if(typeof v==='object')return Object.values(v).some(x=>x&&(typeof x!=='object'||Object.values(x).some(z=>z)));return true;});}
function computedGridValue(fld,data,row){
  if(!row.computed)return data&&data[row.id];
  if(fld.fields&&fld.fields.length){
    const out={};
    fld.fields.forEach(column=>{let total=0,has=false;fld.rows.filter(item=>!item.computed).forEach(item=>{const value=data&&data[item.id]?data[item.id][column.id]:'';if(value!==''&&value!==null&&value!==undefined&&Number.isFinite(Number(value))){total+=Number(value);has=true;}});out[column.id]=has?Number(total.toFixed(6)):'';});
    return out;
  }
  let total=0,has=false;fld.rows.filter(item=>!item.computed).forEach(item=>{const value=data&&data[item.id];if(value!==''&&value!==null&&value!==undefined&&Number.isFinite(Number(value))){total+=Number(value);has=true;}});
  return has?Number(total.toFixed(6)):'';
}
function fieldCode(fld,i){const c=(fld&&fld.code)||((fld&&fld.id&&fld.id.match(/^(?:sp|nk)(\d+)/)||[])[1]);return c?String(c):(i!=null?String(i+1):'');}
function gridPdf(doc,fld,data,filled,y,PH){
  const d=data||{},fieldUnit=unitForOutput(fld),totalRows=fld.rows.map((row,index)=>row.computed?index:-1).filter(index=>index>=0);
  const markTotalCells=dataTable=>{dataTable.cell.styles.fontStyle='bold';dataTable.cell.styles.fillColor=[236,253,245];dataTable.cell.styles.textColor=[4,120,87];};
  const kode=fieldCode(fld);
  y=formTitle(doc,(kode?kode+'. ':'')+fld.label+(fieldUnit?' ('+fieldUnit+')':''),y,PH);
  if(fld.fields&&fld.fields.length){
    const head=['Item'].concat(fld.fields.map(column=>{const unit=unitForOutput(column,fld);return column.label+(unit?' ('+unit+')':'');}));
    const body=fld.rows.map(row=>{const rowData=computedGridValue(fld,d,row);return [row.label].concat(fld.fields.map(column=>{const value=rowData&&rowData[column.id];return filled?currencyValueForOutput(column,fld,value):'........................';}));});
    doc.autoTable({startY:y,head:[head],body,styles:{fontSize:7.3,cellPadding:1.4,lineWidth:0.1,lineColor:[180,180,180]},headStyles:pdfTableHead(doc),columnStyles:{0:{cellWidth:78}},didParseCell:dataTable=>{if(dataTable.section==='body'&&totalRows.includes(dataTable.row.index))markTotalCells(dataTable);}});
  }else{
    const yn=fld.rows.some(row=>row.type==='yn');
      doc.autoTable({startY:y,head:[['Item',yn?'Jawaban':(fieldUnit||'Nilai')]],body:fld.rows.map(row=>{const value=computedGridValue(fld,d,row);return [row.label,filled?currencyValueForOutput(fld,null,value):'........................'];}),styles:{fontSize:7.3,cellPadding:1.4,lineWidth:0.1,lineColor:[180,180,180]},headStyles:pdfTableHead(doc),columnStyles:{0:{cellWidth:88}},didParseCell:dataTable=>{if(dataTable.section==='body'&&totalRows.includes(dataTable.row.index))markTotalCells(dataTable);}});
  }
  return doc.lastAutoTable.finalY+4;
}
/* ===== Generator PDF form (jsPDF + autotable) — file asli, bukan screenshot ===== */
function generateFormPdf(jenis,filled,rec){
  const jsPDF=getJsPDF();if(!jsPDF)return;
  const formType=(rec&&rec.formType)||(jenis==='KDMP'?'KDMP':'SPPG');const isK=formType==='KDMP';
  const doc=new jsPDF({orientation:'p',unit:'mm',format:'a4'});
  const PH=doc.internal.pageSize.getHeight();
  const u=(rec&&rec.unitId)?unitById(rec.unitId):null;
  const tgl=(rec&&rec.tgl)||'',petugas=(rec&&rec.petugas)||'',f=(rec&&rec.form)||{},reportDef=formType==='SPPG'?getSppgFormDefinition(f):(FORMS[formType]||{});
  const pAll = [petugas, (rec&&rec.form&&rec.form.fields&&rec.form.fields.sp109)?'Wawancara: '+rec.form.fields.sp109:''].filter(Boolean).join(' | ');
  const pdfTheme=themeForFormType(formType);
  let y=pdfHead(doc,isK?'KUESIONER MONEV KDMP/KKMP':(reportDef.title||(formType==='NAKER'?'DAFTAR PERTANYAAN UNTUK TENAGA KERJA':'FORM SURVEI MONITORING SPPG')),
    isK?'Monev Koperasi Desa/Kelurahan Merah Putih (KDMP/KKMP) - Bangunan Permanen':(reportDef.purpose||'')+(filled?'':' (FORM KOSONG)'),pdfTheme);
  const idRows=isK
    ? [
        ['Nama KDMP/KKMP',u?u.nama:'','Tanggal Survei',tgl?fmtD(tgl):''],
        ['NIB Koperasi',f.nib||'','NPWP Koperasi',f.npwp||''],
        ['Bidang Usaha',f.bidang_usaha||'','Status Bangun',f.status_bangun||''],
        ['Provinsi',f.prov||'','Kabupaten/Kota',u?u.kab:''],
        ['Desa/Kelurahan',f.desa||'','Kecamatan',u?u.kec:''],
        ['Nama Responden',f.resp_nama||'','No. HP Responden',f.resp_hp||''],
        ['Jenis Responden',f.resp_jenis||'','','']
      ]
    : [['Nama SPPG',u?u.nama:'','Tanggal Survei',tgl?fmtD(tgl):''],['Kabupaten/Kota',u?u.kab:'','Petugas Survei',pAll],['Nama Responden',(f.fields&&(f.fields.sp107||f.fields.nk101))||'','Jabatan/Posisi',(f.fields&&(f.fields.sp108||f.fields.nk102))||'']];
  doc.autoTable({startY:y,
    body:idRows.map(r=>[{content:pdfSafe(r[0]),styles:{fontStyle:'bold',fillColor:pdfLabelBackground(doc)}},{content:pdfSafe(r[1])},{content:pdfSafe(r[2]),styles:{fontStyle:'bold',fillColor:pdfLabelBackground(doc)}},{content:pdfSafe(r[3])}]).concat([[{content:'Alamat',styles:{fontStyle:'bold',fillColor:pdfLabelBackground(doc)}},{content:pdfSafe(u?u.alamat:''),colSpan:3}]]),
    theme:'grid',styles:{fontSize:8.5,cellPadding:1.7,lineWidth:0.1,lineColor:[180,180,180]},columnStyles:{0:{cellWidth:38},2:{cellWidth:34}}});
  y=doc.lastAutoTable.finalY+5;
  if(isK){
    y=formTitle(doc,'Petunjuk Skala Penilaian (beri tanda X pada kolom pilihan)',y,PH);
    doc.autoTable({startY:y,head:[['Skor','Kriteria']],body:[['1','Sangat Tidak Baik / Sangat Tidak Setuju'],['2','Kurang Baik / Kurang Setuju'],['3','Baik'],['4','Sangat Baik / Sangat Setuju']],styles:{fontSize:8,cellPadding:1.5},headStyles:pdfTableHead(doc),columnStyles:{0:{cellWidth:18,halign:'center'}}});
    y=doc.lastAutoTable.finalY+5;
    const secs=f.sections||[];
    FORM_KDMP.forEach((sec,si)=>{
      const scores=(secs[si]&&secs[si].scores)||[];
      y=formTitle(doc,sec.kode+'. '+sec.judul,y,PH);
      doc.autoTable({startY:y,head:[['No','Pernyataan','1','2','3','4']],
        body:sec.items.map((it,ii)=>{const sel=filled?(scores[ii]||0):0;return [String(ii+1),pdfSafe(it),sel===1?'X':'',sel===2?'X':'',sel===3?'X':'',sel===4?'X':''];}),
        styles:{fontSize:7.3,cellPadding:1.4,lineWidth:0.1,lineColor:[180,180,180]},headStyles:pdfTableHead(doc),
        columnStyles:{0:{cellWidth:8,halign:'center'},2:{cellWidth:9,halign:'center'},3:{cellWidth:9,halign:'center'},4:{cellWidth:9,halign:'center'},5:{cellWidth:9,halign:'center'}},
        didParseCell:d=>{if(d.section==='body'&&d.column.index>=2&&d.cell.raw==='X'){d.cell.styles.fontStyle='bold';d.cell.styles.fillColor=[254,242,242];d.cell.styles.textColor=[200,16,46];}}});
      y=doc.lastAutoTable.finalY+4;
    });
    const comp=f.compliance||[];
    y=formTitle(doc,'Kepatuhan Regulasi & Akuntabilitas (Ya/Tidak)',y,PH);
    doc.autoTable({startY:y,head:[['No','Pernyataan Konfirmasi','Ya','Tidak']],
      body:COMPLIANCE_KDMP.map((c,ci)=>{const sel=filled?comp[ci]:null;return [String(ci+1),pdfSafe(c),sel==='ya'?'X':'',sel==='tidak'?'X':''];}),
      styles:{fontSize:7.3,cellPadding:1.4,lineWidth:0.1,lineColor:[180,180,180]},headStyles:pdfTableHead(doc),
      columnStyles:{0:{cellWidth:8,halign:'center'},2:{cellWidth:16,halign:'center'},3:{cellWidth:16,halign:'center'}},
      didParseCell:d=>{if(d.section==='body'&&d.column.index>=2&&d.cell.raw==='X'){d.cell.styles.fontStyle='bold';d.cell.styles.fillColor=[236,253,245];d.cell.styles.textColor=[22,101,52];}}});
    y=doc.lastAutoTable.finalY+5;
    y=formTitle(doc,'Klasifikasi Nilai Rata-rata',y,PH);
    doc.autoTable({startY:y,head:[['Nilai Rata-rata','Kategori']],body:[['3,26 - 4,00','Sangat Baik'],['2,51 - 3,25','Baik'],['1,76 - 2,50','Kurang Baik'],['1,00 - 1,75','Sangat Kurang']],styles:{fontSize:8,cellPadding:1.5,halign:'center'},headStyles:pdfTableHead(doc)});
    y=doc.lastAutoTable.finalY+5;
    if(filled&&f.avg!=null){
      doc.autoTable({startY:y,body:[[{content:'Nilai Rata-rata: '+f.avg,styles:{fontStyle:'bold',fontSize:10,halign:'center'}},{content:'Kategori: '+(f.kategori||''),styles:{fontStyle:'bold',fontSize:10,halign:'center'}},{content:'Status: '+(HASIL_META[f.hasil]?HASIL_META[f.hasil].label:''),styles:{fontStyle:'bold',fontSize:10,halign:'center',textColor:[200,16,46]}}]],theme:'grid',styles:{fillColor:[254,242,242]}});
      y=doc.lastAutoTable.finalY+5;
    }
    // Bagian D: Pertanyaan Terbuka
    y=formTitle(doc,'D. Pertanyaan Terbuka',y,PH);
    const openRows = [
      ['1. Kelebihan KDMP/KKMP', pdfSafe(f.open_kelebihan || '')],
      ['2. Kendala & Upaya', pdfSafe(f.open_kendala || '')],
      ['3. Saran Perbaikan', pdfSafe(f.open_saran || '')],
      ['4. Tenaga Kerja Pembangunan', (f.num_naker||'0') + ' Orang'],
      ['5. Produk Unggulan / Lokal Desa', pdfSafe(f.open_produk || '')]
    ];
    doc.autoTable({startY:y, body:openRows, theme:'grid', styles:{fontSize:7.5,cellPadding:1.8}, columnStyles:{0:{cellWidth:45, fontStyle:'bold', fillColor:[245,245,245]}}});
    y=doc.lastAutoTable.finalY+10;
    // Tanda Tangan
    doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.text('Mengetahui,', 30, y); doc.text((u?u.kab:'............') + ', ' + (tgl?fmtD(tgl):'........'), 130, y);
    y+=5;
    doc.text('Petugas Monitoring,', 30, y); doc.text('Responden/Pengurus,', 130, y);
    y+=20;
    doc.text('( ' + (petugas || '..........................') + ' )', 30, y); doc.text('( ' + (f.resp_nama || '..........................') + ' )', 130, y);
  }else{
    const formDef=formType==='SPPG'?getSppgFormDefinition(f):(FORMS[formType]||FORM_NAKER);const fields=f.fields||{};
    formDef.sections.forEach(sec=>{
      y=formTitle(doc,sec.title,y,PH);
      const ng=sec.fields.filter(fld=>fld.type!=='g');
      if(ng.length){
        doc.autoTable({startY:y,head:[['No','Pertanyaan','Jawaban']],
          body:ng.map((fld,i)=>{const unit=unitForOutput(fld);const answer=filled?fieldVal(fld,fields[fld.id],true):'................................................';return [String(fld.code||((fld.id&&fld.id.match(/^(?:sp|nk)(\d+)/)||[])[1])||i+1),pdfSafe(fld.label)+(unit?' ('+unit+')':''),pdfSafe(answer)];}),
          styles:{fontSize:7.5,cellPadding:1.5,lineWidth:0.1,lineColor:[180,180,180]},headStyles:pdfTableHead(doc),
          columnStyles:{0:{cellWidth:8,halign:'center'},1:{cellWidth:85}},
          didParseCell:d=>{if(d.section==='body'&&d.column.index===2&&d.cell.raw){d.cell.styles.fontStyle='bold';}}});
        y=doc.lastAutoTable.finalY+4;
      }
      sec.fields.filter(fld=>fld.type==='g').forEach(fld=>{y=gridPdf(doc,fld,fields[fld.id],filled,y,PH);});
    });
    if(filled&&rec&&formType==='SPPG'){
      const analytics=formatSppgAnalytics(getSppgAnalytics(rec,u));
      if(analytics){
        y=formTitle(doc,'Rekap Kinerja Operasional SPPG',y,PH);
        doc.autoTable({startY:y,head:[['Indikator','Target Master','Realisasi Monitoring','Capaian','Gap']],body:[
          ['Porsi/hari',analytics.targetPorsi??'—',analytics.actualPorsi??'—',analytics.utilization,analytics.gapPorsi],
          ['Sekolah',analytics.targetSekolah??'—',analytics.actualSekolah??'—',analytics.schoolCoverage,analytics.gapSekolah]
        ],styles:{fontSize:8,cellPadding:1.7},headStyles:pdfTableHead(doc),columnStyles:{0:{fontStyle:'bold',fillColor:[239,246,255]}}});
        y=doc.lastAutoTable.finalY+5;
      }
    }
    if(filled&&rec&&(rec.temuan||rec.rekom)){y=formTitle(doc,'Analisis Surveyor',y,PH);doc.autoTable({startY:y,body:[['Catatan / Analisis Surveyor',pdfSafe(rec.temuan||'-')],['Rekomendasi / Tindak Lanjut',pdfSafe(rec.rekom||'-')]],theme:'grid',styles:{fontSize:8,cellPadding:1.8},columnStyles:{0:{cellWidth:52,fontStyle:'bold',fillColor:[240,249,250]}}});y=doc.lastAutoTable.finalY+5;}
    if(filled&&rec&&rec.hasil){y=formTitle(doc,'Status Monitoring',y,PH);doc.autoTable({startY:y,body:[[{content:'Status: '+(HASIL_META[rec.hasil]?HASIL_META[rec.hasil].label:rec.hasil),styles:{fontStyle:'bold',fontSize:10,halign:'center',textColor:[29,78,216]}}]],theme:'grid'});y=doc.lastAutoTable.finalY+6;}
    const fotoData = fields.sp_foto_kegiatan || fields.sp205_foto;
    if(filled&&fotoData&&String(fotoData).startsWith('data:image')){
      try{
        const prop=doc.getImageProperties(fotoData);
        const pageW=doc.internal.pageSize.getWidth();
        const maxW=pageW-28,maxH=105;
        let imgW=maxW,imgH=imgW*(prop.height/prop.width);
        if(imgH>maxH){imgH=maxH;imgW=imgH*(prop.width/prop.height);}
        if(y>PH-imgH-18){doc.addPage();y=20;}
        y=formTitle(doc,'Dokumentasi Foto/Gambar Kegiatan',y,PH);
        const imgX=(pageW-imgW)/2;
        doc.addImage(fotoData,'JPEG',imgX,y,imgW,imgH,undefined,'FAST');
        y+=imgH+6;
      }catch(e){
        console.error('PDF image error:',e);
        if(y>PH-28){doc.addPage();y=20;}
        y=formTitle(doc,'Dokumentasi Foto/Gambar Kegiatan',y,PH);
        doc.setFontSize(8);
        doc.text('(Gambar dokumentasi tersimpan di sistem tetapi gagal ditanam ke PDF)',14,y+5);
        y+=10;
      }
    }
  }
  pdfFoot(doc);
  doc.save('DARMA-1_Form_'+formType+'_'+(filled?'Terisi':'Kosong')+'_'+(tgl||new Date().toISOString().slice(0,10))+'.pdf');
  toast('PDF form '+formType+' terunduh');
}
/* ===== Generator Excel form (SheetJS) — file .xlsx persis struktur form ===== */
function gridXls(aoa,fld,data,filled,currencyCells){
  const d=data||{},fieldUnit=unitForOutput(fld);
  const kode=fieldCode(fld);
  aoa.push(['(tabel)',(kode?kode+'. ':'')+fld.label+(fieldUnit?' ('+fieldUnit+')':''),'']);
  if(fld.fields&&fld.fields.length){
    aoa.push(['Item'].concat(fld.fields.map(column=>{const unit=unitForOutput(column,fld);return column.label+(unit?' ('+unit+')':'');})));
    fld.rows.forEach(row=>{
      const rowIndex=aoa.length,rowData=computedGridValue(fld,d,row),values=fld.fields.map((column,columnIndex)=>{
        const value=rowData&&rowData[column.id],scale=currencyScaleForField(column,fld);
        if(filled&&scale){currencyCells.push({r:rowIndex,c:columnIndex+1});return storedCurrencyToAbsolute(value,scale);}
        return filled?(value||''):'';
      });
      aoa.push([row.label].concat(values));
    });
  }else{
    const yn=fld.rows.some(row=>row.type==='yn'),scale=currencyScaleForField(fld);
    aoa.push(['Item',yn?'Jawaban':(fieldUnit||'Nilai')]);
    fld.rows.forEach(row=>{
      const rowIndex=aoa.length,value=computedGridValue(fld,d,row);
      if(filled&&scale)currencyCells.push({r:rowIndex,c:1});
      aoa.push([row.label,filled?(scale?storedCurrencyToAbsolute(value,scale):(value||'')):'']);
    });
  }
  aoa.push([]);
}
function generateFormXlsx(jenis,filled,rec){
  if(!window.XLSX){toast('Library Excel belum termuat','e');return;}
  const formType=(rec&&rec.formType)||(jenis==='KDMP'?'KDMP':'SPPG');const isK=formType==='KDMP';
  const u=(rec&&rec.unitId)?unitById(rec.unitId):null;
  const tgl=(rec&&rec.tgl)||'',petugas=(rec&&rec.petugas)||'',f=(rec&&rec.form)||{},reportDef=formType==='SPPG'?getSppgFormDefinition(f):(FORMS[formType]||{});
  const aoa=[],currencyCells=[];
  aoa.push([isK?'KUESIONER MONEV KDMP/KKMP':(reportDef.title||'FORM')]);
  aoa.push([reportDef.purpose||'']);
  aoa.push([]);
  aoa.push(['Nama KDMP/KKMP',u?u.nama:'','Tanggal Survei',tgl?fmtD(tgl):'']);
  aoa.push(['Kabupaten/Kota',u?u.kab:'','Kecamatan',u?u.kec:'']);
  aoa.push(['Desa/Kelurahan',u?u.desa:'','NIB Koperasi',f.nib||'']);
  aoa.push(['NPWP Koperasi',f.npwp||'','Nama Responden',f.resp_nama||'']);
  aoa.push(['No. HP Responden',f.resp_hp||'','Jenis Responden',f.resp_jenis||'']);
  aoa.push([]);
  if(isK){
    aoa.push(['SKALA: 1=Sangat Tidak Baik, 2=Kurang Baik, 3=Baik, 4=Sangat Baik (beri tanda X)','','','','','']);
    aoa.push([]);
    const secs=f.sections||[];
    FORM_KDMP.forEach((sec,si)=>{
      aoa.push([sec.kode+'. '+sec.judul,'','','','','']);
      aoa.push(['No','Pernyataan','1','2','3','4']);
      const scores=(secs[si]&&secs[si].scores)||[];
      sec.items.forEach((it,ii)=>{const sel=filled?(scores[ii]||0):0;aoa.push([ii+1,it,sel===1?'X':'',sel===2?'X':'',sel===3?'X':'',sel===4?'X':'']);});
      aoa.push([]);
    });
    aoa.push(['Kepatuhan & Akuntabilitas (Ya/Tidak)','','','']);
    aoa.push(['No','Pernyataan','Ya','Tidak']);
    const comp=f.compliance||[];
    COMPLIANCE_KDMP.forEach((c,ci)=>{const sel=filled?comp[ci]:null;aoa.push([ci+1,c,sel==='ya'?'X':'',sel==='tidak'?'X':'']);});
    aoa.push([]);
    aoa.push(['Nilai Rata-rata','Kategori']);
    aoa.push(['3,26-4,00','Sangat Baik'],['2,51-3,25','Baik'],['1,76-2,50','Kurang Baik'],['1,00-1,75','Sangat Kurang']);
    if(filled&&f.avg!=null)aoa.push(['HASIL','Skor '+f.avg+' - '+f.kategori]);
  }else{
    const formDef=formType==='SPPG'?getSppgFormDefinition(f):(FORMS[formType]||FORM_NAKER);const fields=f.fields||{};
    formDef.sections.forEach(sec=>{
      aoa.push([sec.title,'','']);
      aoa.push(['No','Pertanyaan','Jawaban']);
      sec.fields.forEach((fld,i)=>{
        if(fld.type==='g'){gridXls(aoa,fld,fields[fld.id],filled,currencyCells);}
        else{const unit=unitForOutput(fld),scale=currencyScaleForField(fld),rowIndex=aoa.length,value=scale?(filled?storedCurrencyToAbsolute(fields[fld.id],scale):''):fieldVal(fld,fields[fld.id],filled);if(filled&&scale)currencyCells.push({r:rowIndex,c:2});aoa.push([fld.code||((fld.id&&fld.id.match(/^(?:sp|nk)(\d+)/)||[])[1])||i+1,fld.label+(unit?' ('+unit+')':''),value]);}
      });
      aoa.push([]);
    });
    if(filled&&rec&&(rec.temuan||rec.rekom)){aoa.push(['ANALISIS SURVEYOR','','']);aoa.push(['Catatan / Analisis Surveyor',rec.temuan||'','']);aoa.push(['Rekomendasi / Tindak Lanjut',rec.rekom||'','']);aoa.push([]);}
    if(filled&&rec&&rec.hasil)aoa.push(['STATUS MONITORING',HASIL_META[rec.hasil]?HASIL_META[rec.hasil].label:rec.hasil,'']);
  }
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  currencyCells.forEach(position=>{const address=XLSX.utils.encode_cell(position);if(ws[address])ws[address].z='"Rp"#,##0",-"';});
  ws['!cols']=[{wch:6},{wch:58},{wch:18},{wch:18},{wch:18},{wch:18}];
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:5}},{s:{r:1,c:0},e:{r:1,c:5}}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Form '+formType);
  XLSX.writeFile(wb,'DARMA-1_Form_'+formType+'_'+(filled?'Terisi':'Kosong')+'.xlsx');
  toast('File Excel form '+formType+' terunduh');
}
function cetakRekam(mode){
  if(!currentRekamJenis){toast('Pilih unit dulu untuk mencetak form','e');return;}
  const rec=recFormData(currentRekamJenis,mode);if(!rec)return;
  generateFormPdf(currentRekamJenis,mode==='isi',rec);
}
function cetakRekamDocx(mode){
  if(!currentRekamJenis){toast('Pilih unit dulu','e');return;}
  const rec=recFormData(currentRekamJenis,mode);
  if(!rec)return;
  generateFormDocx(currentRekamJenis,mode==='isi',rec).catch(err => {
    console.error('Docx Error:', err);
    toast('Gagal membuat Word: ' + err.message, 'e');
  });
}

async function generateFormDocx(jenis, filled, rec) {
  // Mencoba mendeteksi library di berbagai lokasi
  const docxLib = window.docx;
  
  if(!docxLib || !docxLib.Document){
    toast('Gagal memuat sistem Word. Silakan refresh halaman atau cek koneksi internet Anda.','e');
    return;
  }
  
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = docxLib;
  
  const u = rec.unitId ? unitById(rec.unitId) : null;
  const f = rec.form || {};
  const tgl = rec.tgl || '';
  const isK = jenis === 'KDMP';
  
  const children = [];

  if(isK) {
    // --- Header Document ---
    children.push(new Paragraph({ children: [new TextRun({ text: 'MONEV KDMP/KKMP', bold: true, size: 24 })] }));
    const goals = [
      '1. Penilaian kesesuaian perencanaan dengan keadaan lapangan di KDKMP.',
      '2. Kesesuaian dengan pelaksanaan tata kelola, melalui melihat operasional dan keuangan KDKMP.',
      '3. Seberapa besar dampak untuk perekonomian dan masyarakat dengan adanya KDKMP'
    ];
    goals.forEach(g => children.push(new Paragraph({ children: [new TextRun({ text: g, size: 20 })] })));
    children.push(new Paragraph({ text: '', spacing: { before: 200 } }));

    children.push(new Paragraph({ children: [new TextRun({ text: 'KUESIONER SURVEI KPPN', bold: true, size: 28 })], alignment: AlignmentType.CENTER }));
    children.push(new Paragraph({ children: [new TextRun({ text: 'Monitoring dan Evaluasi Koperasi Desa/Kelurahan Merah Putih (KDMP/KKMP)', bold: true, size: 22 })], alignment: AlignmentType.CENTER }));
    children.push(new Paragraph({ children: [new TextRun({ text: 'Petunjuk Pengisian', bold: true, size: 20 })], spacing: { before: 200 } }));
    children.push(new Paragraph({ children: [new TextRun({ text: 'Berikan penilaian terhadap setiap pernyataan menggunakan skala berikut.', size: 20 })], spacing: { after: 100 } }));

    // --- Criteria Table ---
    children.push(new Table({
      width: { size: 60, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: 'Skor', bold: true, alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph({ text: 'Kriteria', bold: true })] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: '1', alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph({ text: 'Sangat Tidak Baik / Sangat Tidak Setuju' })] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: '2', alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph({ text: 'Kurang Baik / Kurang Setuju' })] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: '3', alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph({ text: 'Baik' })] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: '4', alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph({ text: 'Sangat Baik / Sangat Setuju' })] })] }),
      ]
    }));
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

    // --- Section A: Identitas Koperasi ---
    children.push(new Paragraph({ children: [new TextRun({ text: 'A. Identitas Koperasi', bold: true, size: 22 })] }));
    const idA = [
      ['Nama KDMP/KKMP', u?u.nama:''],
      ['Nomor Identitas Berusaha (NIB) Koperasi', f.nib||''],
      ['Apakah sudah memiliki NPWP Koperasi', f.npwp||''],
      ['Bidang Usaha', f.bidang_usaha||''],
      ['Status Pembangunan Koperasi', f.status_bangun||''],
      ['Provinsi', f.prov||'Jawa Tengah'],
      ['Desa/Kelurahan', f.desa||''],
      ['Kabupaten/Kota', u?u.kab:''],
      ['Tanggal Survei', fmtD(tgl)]
    ];
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: idA.map(r => new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '- ' + r[0] + ' :', size: 20 })] })], width: { size: 50, type: WidthType.PERCENTAGE }, border: { top: {style: BorderStyle.NONE}, bottom: {style: BorderStyle.NONE}, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE} } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r[1] || '....................', size: 20 })] })], width: { size: 50, type: WidthType.PERCENTAGE }, border: { top: {style: BorderStyle.NONE}, bottom: {style: BorderStyle.NONE}, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE} } })
      ]}))
    }));

    // --- Section B: Identitas Responden ---
    children.push(new Paragraph({ children: [new TextRun({ text: 'B. Identitas Responden', bold: true, size: 22 })], spacing: { before: 200 } }));
    const idB = [
      ['Nama Responden', f.resp_nama||''],
      ['No. HP', f.resp_hp||''],
      ['Jenis Responden', f.resp_jenis||'']
    ];
    idB.forEach(r => children.push(new Paragraph({ children: [new TextRun({ text: '- ' + r[0] + ': ' + (r[1] || '....................'), size: 20 })] })));

    // --- Section C: Penilaian ---
    children.push(new Paragraph({ children: [new TextRun({ text: 'C. PENILAIAN', bold: true, size: 22 })], spacing: { before: 300, after: 100 } }));
    
    FORM_KDMP.forEach(sec => {
      children.push(new Paragraph({ children: [new TextRun({ text: sec.kode + '. ' + sec.judul.toUpperCase(), bold: true, size: 20 })], spacing: { before: 150, after: 80 } }));
      const ratingRows = [
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ text: 'No', bold: true, alignment: AlignmentType.CENTER })], width: { size: 5, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: 'Pernyataan', bold: true })], width: { size: 55, type: WidthType.PERCENTAGE } }),
          ...[1,2,3,4].map(v => new TableCell({ children: [new Paragraph({ text: String(v), bold: true, alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }))
        ]})
      ];
      const scores = (f.sections && f.sections.find(s => s.kode === sec.kode))?.scores || [];
      sec.items.forEach((it, ii) => {
        const s = scores[ii] || 0;
        ratingRows.push(new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ text: String(ii+1), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: it })] }),
          ...[1,2,3,4].map(v => new TableCell({ children: [new Paragraph({ text: (filled && s === v) ? 'X' : '', alignment: AlignmentType.CENTER })] }))
        ]}));
      });
      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: ratingRows }));
    });

    // --- Compliance Section VII ---
    children.push(new Paragraph({ children: [new TextRun({ text: 'VII. Kepatuhan Regulasi & Akuntabilitas (Compliance)', bold: true, size: 20 })], spacing: { before: 200, after: 80 } }));
    const compRows = [
      new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ text: 'No', bold: true, alignment: AlignmentType.CENTER })], width: { size: 5, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: 'Pernyataan Konfirmasi', bold: true })], width: { size: 65, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: 'Ya', bold: true, alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: 'Tidak', bold: true, alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } })
      ]})
    ];
    COMPLIANCE_KDMP.forEach((c, ci) => {
      const sel = (f.compliance && f.compliance[ci]);
      compRows.push(new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ text: String(ci+1), alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ text: c })] }),
        new TableCell({ children: [new Paragraph({ text: (filled && sel === 'ya') ? 'X' : '', alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ text: (filled && sel === 'tidak') ? 'X' : '', alignment: AlignmentType.CENTER })] })
      ]}));
    });
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: compRows }));

    // --- Section D: Pertanyaan Terbuka ---
    children.push(new Paragraph({ children: [new TextRun({ text: 'D. Pertanyaan Terbuka', bold: true, size: 22 })], spacing: { before: 300, after: 100 } }));
    const openQ = [
      ['1. Apa kelebihan KDMP/KKMP menurut Anda?', f.open_kelebihan],
      ['2. Apa kendala utama yang dihadapi dan upaya yang sudah dilakukan?', f.open_kendala],
      ['3. Apa saran untuk meningkatkan kinerja KDMP/KKMP?', f.open_saran],
      ['4. Berapa jumlah tenaga kerja yang diserap untuk pembangunan koperasi?', f.num_naker],
      ['5. Produk unggulan yang terjual? (termasuk produk lokal desa)', f.open_produk]
    ];
    openQ.forEach(q => {
      children.push(new Paragraph({ children: [new TextRun({ text: q[0], bold: true, size: 20 })] }));
      children.push(new Paragraph({ children: [new TextRun({ text: filled ? (q[1] || '-') : '.........................................................................', size: 20 })], spacing: { after: 100 } }));
    });

    // --- Signatures ---
    children.push(new Paragraph({ text: '', spacing: { before: 400 } }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ text: 'Mengetahui,', alignment: AlignmentType.CENTER })], border: { top: {style: BorderStyle.NONE}, bottom: {style: BorderStyle.NONE}, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE} } }),
          new TableCell({ children: [new Paragraph({ text: (u?u.kab:'............') + ', ' + (tgl?fmtD(tgl):'........'), alignment: AlignmentType.CENTER })], border: { top: {style: BorderStyle.NONE}, bottom: {style: BorderStyle.NONE}, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE} } })
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ text: 'Petugas Monitoring,', alignment: AlignmentType.CENTER })], border: { top: {style: BorderStyle.NONE}, bottom: {style: BorderStyle.NONE}, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE} } }),
          new TableCell({ children: [new Paragraph({ text: 'Responden/Pengurus,', alignment: AlignmentType.CENTER })], border: { top: {style: BorderStyle.NONE}, bottom: {style: BorderStyle.NONE}, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE} } })
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ text: '', spacing: { before: 800 } })], border: { top: {style: BorderStyle.NONE}, bottom: {style: BorderStyle.NONE}, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE} } }),
          new TableCell({ children: [new Paragraph({ text: '', spacing: { before: 800 } })], border: { top: {style: BorderStyle.NONE}, bottom: {style: BorderStyle.NONE}, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE} } })
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ text: '( ' + ([rec.petugas, (rec.form&&rec.form.fields&&rec.form.fields.sp109) ? 'Wawancara: '+rec.form.fields.sp109 : ''].filter(Boolean).join(' | ') || '..........................') + ' )', alignment: AlignmentType.CENTER, bold: true })], border: { top: {style: BorderStyle.NONE}, bottom: {style: BorderStyle.NONE}, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE} } }),
          new TableCell({ children: [new Paragraph({ text: '( ' + (f.resp_nama || '..........................') + ' )', alignment: AlignmentType.CENTER, bold: true })], border: { top: {style: BorderStyle.NONE}, bottom: {style: BorderStyle.NONE}, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE} } })
        ]})
      ]
    }));
  } else {
    /* ==== SPPG / NAKER: form lengkap — paritas dengan generateFormPdf ==== */
    const formTypeD=(rec&&rec.formType)||(jenis==='KDMP'?'KDMP':'SPPG');
    const formDef=formTypeD==='SPPG'?getSppgFormDefinition(f):(FORMS[formTypeD]||FORM_NAKER);
    const fields=f.fields||{};
    const pAllD=[rec.petugas||'',(fields.sp109)?'Wawancara: '+fields.sp109:''].filter(Boolean).join(' | ');
    const T=(text,o={})=>new Paragraph({children:[new TextRun({text:String(text==null?'':text),bold:!!o.bold,size:o.size||20})],alignment:o.center?AlignmentType.CENTER:undefined,spacing:o.spacing});
    const C=(text,o={})=>new TableCell({children:[new Paragraph({children:[new TextRun({text:String(text==null?'':text),bold:!!o.bold,size:18})],alignment:o.center?AlignmentType.CENTER:undefined})],width:o.width?{size:o.width,type:WidthType.PERCENTAGE}:undefined});
    const H=(text,w)=>new TableCell({children:[new Paragraph({children:[new TextRun({text:String(text==null?'':text),bold:true,size:18})]})],width:{size:w,type:WidthType.PERCENTAGE}});
    children.push(new Paragraph({children:[new TextRun({text:formTypeD==='NAKER'?'DAFTAR PERTANYAAN UNTUK TENAGA KERJA':'FORM SURVEI MONITORING SPPG',bold:true,size:26})],alignment:AlignmentType.CENTER,spacing:{after:80}}));
    const idRows=[['Nama SPPG',u?u.nama:''],['Kabupaten/Kota',u?u.kab:''],['Tanggal Survei',tgl?fmtD(tgl):''],['Petugas Survei',pAllD],['Nama Responden',fields.sp107||fields.nk101||''],['Jabatan/Posisi',fields.sp108||fields.nk102||'']];
    children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:idRows.map(r=>new TableRow({children:[C(r[0],{bold:true,width:30}),C(r[1],{width:70})]}))}));
    formDef.sections.forEach(sec=>{
      children.push(T(sec.title,{bold:true,spacing:{before:240,after:80}}));
      const ng=sec.fields.filter(fl=>fl.type!=='g');
      if(ng.length){
        children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[
          new TableRow({tableHeader:true,children:[H('No',7),H('Pertanyaan',48),H('Jawaban',45)]})
        ].concat(ng.map((fl,i)=>new TableRow({children:[
          C(fieldCode(fl,i),{center:true}),
          C(fl.label+(unitForOutput(fl)?' ('+unitForOutput(fl)+')':'')),
          C(filled ? (fieldVal(fl,fields[fl.id],true) || '-') : '................')
        ]})))}));
      }
      sec.fields.filter(fl=>fl.type==='g').forEach(fl=>{
        const kode=fieldCode(fl),fieldUnit=unitForOutput(fl),d=fields[fl.id]||{};
        children.push(T((kode?kode+'. ':'')+fl.label+(fieldUnit?' ('+fieldUnit+')':''),{bold:true,spacing:{before:200,after:60}}));
        let rows;
        if(fl.fields&&fl.fields.length){
          rows=[new TableRow({tableHeader:true,children:[H('Item',46)].concat(fl.fields.map(col=>H(col.label+(unitForOutput(col,fl)?' ('+unitForOutput(col,fl)+')':''),27)))})]
          .concat(fl.rows.map(r=>{const rd=computedGridValue(fl,d,r);return new TableRow({children:[C(r.label,{bold:!!r.computed})].concat(fl.fields.map(col=>C(filled?(currencyValueForOutput(col,fl,rd&&rd[col.id])||'-'):'................',{bold:!!r.computed})))});}));
        }else{
          rows=[new TableRow({tableHeader:true,children:[H('Item',70),H(fieldUnit||'Nilai',30)]})]
          .concat(fl.rows.map(r=>{const v=computedGridValue(fl,d,r);return new TableRow({children:[C(r.label,{bold:!!r.computed}),C(filled?(currencyValueForOutput(fl,null,v)||'-'):'................',{bold:!!r.computed})]});}));
        }
        children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:rows}));
      });
    });
    if(filled&&formTypeD==='SPPG'){
      const an=formatSppgAnalytics(getSppgAnalytics(rec,u));
      if(an){
        children.push(T('Rekap Kinerja Operasional SPPG',{bold:true,spacing:{before:240,after:80}}));
        children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[
          new TableRow({tableHeader:true,children:[H('Indikator',28),H('Target Master',24),H('Realisasi Monitoring',24),H('Capaian',12),H('Gap',12)]}),
          new TableRow({children:[C('Porsi/hari',{bold:true}),C(an.targetPorsi??'-'),C(an.actualPorsi??'-'),C(an.utilization),C(an.gapPorsi)]}),
          new TableRow({children:[C('Sekolah',{bold:true}),C(an.targetSekolah??'-'),C(an.actualSekolah??'-'),C(an.schoolCoverage),C(an.gapSekolah)]})
        ]}));
      }
    }
    if(rec.temuan){children.push(T('ANALISIS SURVEYOR / TEMUAN',{bold:true,spacing:{before:240,after:80}}));children.push(new Paragraph({text:rec.temuan}));}
    if(rec.rekom){children.push(T('Rekomendasi / Tindak Lanjut',{bold:true,spacing:{before:160,after:60}}));children.push(new Paragraph({text:rec.rekom}));}
    if(rec.hasil&&HASIL_META[rec.hasil]){children.push(T('Status Monitoring: '+(HASIL_META[rec.hasil].label||rec.hasil),{bold:true,center:true,spacing:{before:200}}));}
    if(fields.sp_link_lampiran)children.push(new Paragraph({text:'Link Lampiran: '+fields.sp_link_lampiran}));
    if(fields.sp_foto_kegiatan)children.push(new Paragraph({text:'Dokumentasi Foto: Terlampir di sistem (Gambar Foto Kegiatan)'}));
  }

  const doc = new Document({
    sections: [{ properties: {}, children: children }]
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DARMA-1_Laporan_${jenis}_${tgl || 'blank'}.docx`;
  a.click();
  toast('Word document (.docx) berhasil dibuat');
}
function unduhFormExcelRekam(){
  if(!currentRekamJenis){toast('Pilih unit dulu','e');return;}
  const formType=(currentRekamJenis==='KDMP'?'KDMP':(currentRekamForm||'SPPG'));
  let form,filled;
  if(currentRekamJenis==='KDMP'){form=collectKDMP();filled=form.terjawab>0;}
  else{const def=formType==='SPPG'?getActiveSppgFormDefinition():(FORMS[formType]||FORM_NAKER);form=collectGeneric(def);if(formType==='SPPG')form.version=currentSppgFormVersion;filled=hasFormData(form);}
  const u=unitById(getVal('rUnit'));
  generateFormXlsx(currentRekamJenis,filled,{unitId:u?u.id:'',tgl:getVal('rTgl'),petugas:getVal('rPetugas'),jenis:currentRekamJenis,formType:formType,form:form});
}
function cetakMon(id){const m=DB.monitoring.find(x=>x.id===id);if(!m)return;const u=unitById(m.unitId);const jenis=(u?u.jenis:(m.jenis||'SPPG'));generateFormPdf(jenis,true,m);}
function cetakMonDocx(id){const m=DB.monitoring.find(x=>x.id===id);if(!m)return;const u=unitById(m.unitId);const jenis=(u?u.jenis:(m.jenis||'SPPG'));generateFormDocx(jenis,true,m).catch(e=>toast('Gagal: '+e.message,'e'));}
function cetakMonExcel(id){const m=DB.monitoring.find(x=>x.id===id);if(!m)return;const u=unitById(m.unitId);const jenis=(u?u.jenis:(m.jenis||'SPPG'));generateFormXlsx(jenis,true,m);}
function cetakUnitForm(jenis,unitId){generateFormPdf(jenis,false,{unitId:unitId||'',jenis:jenis,formType:(jenis==='KDMP'?'KDMP':'SPPG'),form:jenis==='KDMP'?{sections:[],compliance:[]}:{version:SPPG_FORM_VERSION,fields:{}}});}

/* Public action bridge for existing HTML controls. */

Object.assign(globalThis, { pdfSafe, formTitle, recFormData, fieldVal, hasFormData, gridPdf, generateFormPdf, gridXls, generateFormXlsx, cetakRekam, cetakRekamDocx, generateFormDocx, unduhFormExcelRekam, cetakMon, cetakMonDocx, cetakMonExcel, cetakUnitForm });
