// Admin dashboard: daftar kajian, pembicara, masjid, pengguna diurutkan
// dari yang paling terbaru. Elemen diurutkan memakai urutan masuk Firestore
// (arrOrder) yang diukur saat snapshot dimuat; id numerik (Date.now) sebagai
// fallback untuk item lama.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {parseHTML}=require('linkedom');
const html=fs.readFileSync('index.html','utf8');
// Ekstrak from 'function byNewest' sampai sebelum 'function adminApprove' —
// mencakup byNewest, renderAdmin, dan setAdminTab dalam satu scope VM.
const start=html.indexOf('function _ikItemCreatedMs(');
const end=html.indexOf('function adminApprove(');
const src=html.slice(start,end);
assert.ok(start>0&&end>start,'rentang byNewest..adminApprove harus ada');
assert.ok(src.includes('setAdminTab'),'setAdminTab harus berada dalam rentang');
assert.ok(src.includes('byNewest')&&src.includes('_ikItemCreatedMs'),'kedua helper harus dalam rentang');

function buildFixture(){
  const {document}=parseHTML(html);
  const ctx={document,console,Date,URL,
    state:{user:{id:'adm',role:'admin'},adminTab:null,notifications:[]},
    DB:{kajian:[],users:[],speakers:[],mosques:[]},
    getSpeaker:id=>({full_name:'Ustadz Uji'}),
    getMosque:id=>({name:'Masjid Uji'}),
    STATUS:{pending:{cls:'tag-w',label:'Pending'},approved:{cls:'tag-g',label:'Disetujui'},cancelled:{cls:'tag-x',label:'Dibatalkan'}},
    fmtDateShort:d=>d,
    db:{collection:()=>({})},fsLoadCollection:async()=>[],
    encodeURIComponent,Infinity,Number,String,Array,Object,Promise};
  vm.createContext(ctx);
  vm.runInContext(src,ctx);global.__bn=ctx.byNewest;
  return ctx;
}

(async()=>{
 let passes=0,fails=0;
 const check=async(name,fn)=>{try{await fn();console.log('PASS '+name);passes++;}catch(e){console.log('FAIL '+name+': '+e.message);fails++;}};

 await check('kajian terurut terbaru dulu di tab Semua Kajian',async()=>{
   const c=buildFixture();
   c.DB.kajian=[
     {id:'k100',title:'Lama',date:'2026-01-01',status:'approved',arrOrder:0},
     {id:'k300',title:'Baru',date:'2026-03-01',status:'approved',arrOrder:2},
     {id:'k200',title:'Tengah',date:'2026-02-01',status:'approved',arrOrder:1}];
   c.state.adminTab='kajian';c.renderAdmin();c.setAdminTab('kajian');
   const htmlOut=c.document.getElementById('admin-content').innerHTML;
   assert.ok(htmlOut.indexOf('Baru')<htmlOut.indexOf('Tengah'),'Baru harus sebelum Tengah');
   assert.ok(htmlOut.indexOf('Tengah')<htmlOut.indexOf('Lama'),'Tengah harus sebelum Lama');
 });

 await check('pengguna terurut terbaru dulu',async()=>{
   const c=buildFixture();
   c.DB.users=[
     {id:'u_a',name:'User Lama',email:'a@x.test',role:'user',arrOrder:0},
     {id:'u_c',name:'User Baru',email:'c@x.test',role:'user',arrOrder:2},
     {id:'u_b',name:'User Tengah',email:'b@x.test',role:'user',arrOrder:1}];
   c.state.adminTab='users';c.renderAdmin();c.setAdminTab('users');
   const htmlOut=c.document.getElementById('admin-content').innerHTML;
   assert.ok(htmlOut.indexOf('User Baru')<htmlOut.indexOf('User Tengah'),'Baru sebelum Tengah');
   assert.ok(htmlOut.indexOf('User Tengah')<htmlOut.indexOf('User Lama'),'Tengah sebelum Lama');
 });

 await check('pembicara dan masjid terurut terbaru dulu',async()=>{
   const c=buildFixture();
   c.DB.speakers=[
     {id:'s1',full_name:'Spk Lama',normalized_name:'spk lama',verified:true,arrOrder:0},
     {id:'s2',full_name:'Spk Baru',normalized_name:'spk baru',verified:true,arrOrder:1}];
   c.DB.mosques=[
     {id:'m1',name:'Msq Lama',city:'Kota A',verified:true,arrOrder:0},
     {id:'m2',name:'Msq Baru',city:'Kota B',verified:true,arrOrder:1}];
   c.state.adminTab='speakers';c.setAdminTab('speakers');
   let out=c.document.getElementById('admin-content').innerHTML;
   assert.ok(out.indexOf('Spk Baru')<out.indexOf('Spk Lama'),'pembicara: Baru dulu');
   c.state.adminTab='mosques';c.setAdminTab('mosques');
   out=c.document.getElementById('admin-content').innerHTML;
   assert.ok(out.indexOf('Msq Baru')<out.indexOf('Msq Lama'),'masjid: Baru dulu');
 });

 await check('fallback id numerik saat arrOrder tidak ada',async()=>{
   const c=buildFixture();
   c.DB.kajian=[
     {id:'k1700000000000',title:'ID Lama',date:'2026-01-01',status:'approved'},
     {id:'k1790000000000',title:'ID Baru',date:'2026-01-02',status:'approved'}];
   c.state.adminTab='kajian';c.setAdminTab('kajian');
   const out=c.document.getElementById('admin-content').innerHTML;
   assert.ok(out.indexOf('ID Baru')<out.indexOf('ID Lama'),'id lebih besar (lebih baru) dulu');
 });

 await check('pending tetap tampil di atas Semua Kajian',async()=>{
   const c=buildFixture();
   c.DB.kajian=[
     {id:'k200',title:'Approved Baru',date:'2026-03-01',status:'approved',arrOrder:2},
     {id:'k100',title:'Pending',date:'2026-01-01',status:'pending',arrOrder:0}];
   c.state.adminTab='kajian';c.setAdminTab('kajian');
   const out=c.document.getElementById('admin-content').innerHTML;
   assert.ok(out.indexOf('Menunggu Review')>=0,'label pending ada');
   assert.ok(out.indexOf('Pending')<out.indexOf('Approved Baru'),'pending tetap di atas');
 });

 await check('urutan mengikuti created_at: pendaftar terbaru paling atas (bug produksi)',async()=>{
   const c=buildFixture();
   // Data asli produksi: Rudi created 2026-04-19 (arrOrder tinggi dari snapshot), Zubair created 2026-10-10.
   c.DB.users=[
     {id:'abc_rudi',name:'Rudi',email:'r@x.test',role:'user',created_at:'2026-04-19',arrOrder:18},
     {id:'xyz_zubair',name:'Zubair',email:'z@x.test',role:'user',created_at:'2026-10-10',arrOrder:12}];
   c.state.adminTab='users';c.renderAdmin();c.setAdminTab('users');
   const out=c.document.getElementById('admin-content').innerHTML;
   assert.ok(out.indexOf('Zubair')<out.indexOf('Rudi'),'Zubair (2026-10-10) harus di atas Rudi (2026-04-19)');
 });
 await check('kajian dengan created_ms terurut benar',async()=>{
   const c=buildFixture();
   c.DB.kajian=[
     {id:'k1000',title:'Kajian Lama',date:'2026-01-01',status:'approved',created_ms:1700000000000,arrOrder:5},
     {id:'k2000',title:'Kajian Baru',date:'2026-01-02',status:'approved',created_ms:1790000000000,arrOrder:1}];
   c.state.adminTab='kajian';c.setAdminTab('kajian');
   const out=c.document.getElementById('admin-content').innerHTML;
   assert.ok(out.indexOf('Kajian Baru')<out.indexOf('Kajian Lama'),'created_ms lebih besar dulu walau arrOrder lebih kecil');
 });
 console.log(JSON.stringify({passed:passes,failed:fails}));if(fails)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
