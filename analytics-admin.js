/* Dashboard Analitik Admin. Lazy: data diambil hanya saat tab dibuka.
   Query Firestore terbatas (limit 5000 event terbaru per ambil). Ringkasan oleh IKAnalyticsCore.
   Ekspor CSV agregat tanpa identitas. */
(function(root){
 'use strict';
 var WIB='Asia/Jakarta';
 function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
 function fmt(n){return (typeof n==='number')?n.toLocaleString('id-ID'):'-';}
 function render(host,options){
  if(!options.admin){host.textContent='Analitik khusus admin.';return;}
  host.innerHTML=
   '<section class="card" style="padding:16px;margin-bottom:12px">'
   +'<p style="font-weight:800;font-size:15px;margin-bottom:6px">Analitik Pengunjung</p>'
   +'<p style="font-size:12px;color:var(--muted);line-height:1.6">Opt-in, hanya pengguna login, sejak tracking aktif. Bukan seluruh trafik; tamu &amp; tanpa persetujuan tidak tercatat. Jangan sajikan angka ini sebagai total pengguna aplikasi.</p>'
   +'<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">'
   +'<button id="ik-an-refresh" class="btn btn-p btn-sm">Muat Data</button>'
   +'<button id="ik-an-export" class="btn btn-o btn-sm" disabled>Ekspor CSV</button>'
   +'</div><p id="ik-an-status" style="font-size:12px;color:var(--muted);margin-top:8px">Belum dimuat.</p>'
   +'</section><div id="ik-an-body"></div>';
  host.querySelector('#ik-an-refresh').onclick=load;
  host.querySelector('#ik-an-export').onclick=exportCSV;
 }
 function bar(values,max,color){
  var mx=max||Math.max.apply(null,values.map(function(v){return v.value;}))||1;
  return '<div style="display:flex;align-items:flex-end;gap:2px;height:70px">'+values.map(function(v){
   var h=Math.max(2,Math.round(v.value/mx*66));
   return '<div title="'+esc(v.label)+': '+v.value+'" style="flex:1;background:'+color+';height:'+h+'px;border-radius:3px 3px 0 0"></div>';
  }).join('')+'</div>';
 }
 var lastSummary=null;
 function load(){
  var status=document.getElementById('ik-an-status'),body=document.getElementById('ik-an-body');
  var btn=document.getElementById('ik-an-refresh'); if(btn){btn.disabled=true;}
  status.textContent='Mengambil data…';
  var context=root.ikAnalyticsContext?root.ikAnalyticsContext():{};
  if(!context.db||!context.user||context.user.role!=='admin'){status.textContent='Akses ditolak.';if(btn)btn.disabled=false;return;}
  lastSummary=null;
  var exportButton=document.getElementById('ik-an-export');if(exportButton)exportButton.disabled=true;
  var events=[];
  return Promise.resolve().then(function(){return context.db.collection('analyticsEvents').orderBy('clientTime','desc').limit(5000).get();}).then(function(snap){
   var current=root.ikAnalyticsContext();
   if(!current.user||current.user.role!=='admin'||!document.getElementById('ik-an-body')||document.getElementById('ik-an-body')!==body)return;
   snap.forEach(function(d){events.push(d.data());});
   if(!root.IKAnalyticsCore){status.textContent='Pustaka ringkasan belum termuat.';return;}
   lastSummary=root.IKAnalyticsCore.summarize(events,{now:Date.now()});
   var s=lastSummary;
   var card=(l,v)=>'<div class="admin-stat" style="min-width:88px"><p style="font-size:20px;font-weight:800;color:#fff">'+esc(v)+'</p><p style="font-size:10px;color:rgba(255,255,255,.75);font-weight:700">'+l+'</p></div>';
   body.innerHTML=
    '<section class="card" style="padding:14px;margin-bottom:10px">'
    +'<p style="font-weight:700;font-size:13px;margin-bottom:8px">Hari ini ('+esc(s.today.date)+' WIB)</p>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap">'+card('Pengunjung',fmt(s.today.visitors))+card('Sesi',fmt(s.today.sessions))+card('Pageview',fmt(s.today.pageviews))+'</div>'
    +'<p style="font-size:11px;color:var(--muted);margin-top:8px">Aktif: harian '+fmt(s.active.dau)+' · mingguan '+fmt(s.active.wau)+' · bulanan '+fmt(s.active.mau)+'</p>'
    +'</section>'
    +'<section class="card" style="padding:14px;margin-bottom:10px"><p style="font-weight:700;font-size:13px;margin-bottom:8px">Tren 30 hari (pageview)</p>'+bar(s.trend.map(function(r){return {label:r.date,value:r.pageviews};}),'','var(--p)')+'<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted)"><span>'+esc(s.trend[0].date)+'</span><span>'+esc(s.trend[s.trend.length-1].date)+'</span></div></section>'
    +'<section class="card" style="padding:14px;margin-bottom:10px"><p style="font-weight:700;font-size:13px;margin-bottom:8px">Jam kunjungan hari ini (WIB)</p>'+bar(s.hours.map(function(r){return {label:r.hour+':00',value:r.pageviews};}),'','var(--acc)')+'</section>'
    +'<section class="card" style="padding:14px;margin-bottom:10px"><p style="font-weight:700;font-size:13px;margin-bottom:8px">Konten teratas</p>'
    +(s.top.length?('<table style="width:100%;font-size:12px;border-collapse:collapse">'+s.top.map(function(t){return '<tr><td style="padding:4px 0">'+esc(t.kind)+'</td><td style="padding:4px 0">'+esc(t.target)+'</td><td style="text-align:right;font-weight:700">'+fmt(t.count)+'</td></tr>';}).join('')+'</table>'):'<p style="font-size:12px;color:var(--muted)">Belum ada data.</p>')
    +'</section>'
    +'<section class="card" style="padding:14px;margin-bottom:10px"><p style="font-weight:700;font-size:13px;margin-bottom:8px">Interaksi</p><p style="font-size:12px;color:var(--muted)">Follow: '+fmt(s.actions.follow||0)+' · Simpan: '+fmt(s.actions.bookmark||0)+' · Klik peta: '+fmt(s.actions.maps||0)+'</p></section>'
    +'<p style="font-size:11px;color:var(--muted);line-height:1.6">Batasan: '+esc(s.basis)+'. '+(s.partial?'Data terpotong pada batas 5000 event — angka minimum.':'')+' Tidak menampilkan nama/email pengguna.</p>';
   status.textContent='Dimuat: '+events.length+' event. Terakhir: '+new Date().toLocaleTimeString('id-ID');
   var ex=document.getElementById('ik-an-export'); if(ex)ex.disabled=false;
  }).catch(function(e){
   status.textContent='Gagal mengambil data: '+(e&&e.code?e.code:'error')+'. Pastikan Anda login admin.';
  }).then(function(){ if(btn)btn.disabled=false; });
 }
 function exportCSV(){
  if(!lastSummary)return;
  var rows=[['metrik','nilai']];
  rows.push(['tanggal_basis_WIB',lastSummary.today.date]);
  rows.push(['pengunjung_hari_ini',lastSummary.today.visitors]);
  rows.push(['sesi_hari_ini',lastSummary.today.sessions]);
  rows.push(['pageview_hari_ini',lastSummary.today.pageviews]);
  rows.push(['aktif_harian',lastSummary.active.dau]);
  rows.push(['aktif_mingguan',lastSummary.active.wau]);
  rows.push(['aktif_bulanan',lastSummary.active.mau]);
  rows.push([]);
  rows.push(['trend_tanggal','pageview']);
  lastSummary.trend.forEach(function(r){rows.push([r.date,r.pageviews]);});
  rows.push([]);
  rows.push(['konten','jenis','jumlah']);
  lastSummary.top.forEach(function(t){rows.push([t.target,t.kind,t.count]);});
  rows.push([]);
  rows.push(['interaksi','jumlah']);
  Object.keys(lastSummary.actions).forEach(function(k){rows.push([k,lastSummary.actions[k]]);});
  var csv=rows.map(function(r){return r.map(function(c){c=String(c==null?'':c);return /[",\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c;}).join(',');}).join('\n');
  var blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='infokajian-analitik-'+lastSummary.today.date+'.csv';a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);},2000);
 }
 var api={render:render,load:load};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.IKAnalyticsAdmin=api;
})(typeof globalThis!=='undefined'?globalThis:this);
