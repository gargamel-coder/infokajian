// Tes pencarian & edit masjid di Admin Dashboard (linkedom, tanpa jaringan).
// Jalankan: NODE_PATH=/opt/data/cache/ik-perf-tools/node_modules node tests/admin-search-edit.cjs
const fs=require('fs'),vm=require('vm');
const {parseHTML}=require('linkedom');
const main=(async()=>{
const assert=require('node:assert/strict');

const html=fs.readFileSync('index.html','utf8');
assert.ok(html.includes('adminSearchInput'), 'Fitur pencarian admin belum ada (harus RED dulu)');

const {document}=parseHTML(`<!doctype html>
<div id="admin-content"></div>
<div id="modal-mq"><div class="sheet"><div id="admin-mq-body"></div><button id="adm-mq-save">Simpan</button></div></div>`);
let saved=[],toasts=[];
const DB={kajian:[
  {id:'k1',title:'Tafsir Ibnu Katsir',status:'approved',speaker_id:'sp1',mosque_id:'m1',date:'2026-10-12'},
  {id:'k2',title:'Kajian Kitab',status:'pending',speaker_id:'sp2',mosque_id:'m2',date:'2026-10-13'}],
  speakers:[{id:'sp1',full_name:'Ustadz Firanda Andirja'},{id:'sp2',full_name:'Ustadz Khalid Basalamah'}],
  mosques:[{id:'m1',name:'Masjid Al Fattah',city:'Jakarta Timur',lat:-6.19,lng:106.92,verified:true},
           {id:'m2',name:'Masjid Hijau Nurul Iman Cilangkap',city:'Jakarta Timur',verified:false}],
  users:[{id:'u1',name:'Andi',email:'andi@mail.test',role:'user'},
         {id:'u2',name:'Budi Santoso',email:'budi@mail.test',role:'contributor'}]};
const state={user:{id:'adm',role:'admin'},adminTab:'kajian',kajianStatus:'all'};
const STATUS={pending:{label:'Pending',cls:'tag-y'},approved:{label:'Approved',cls:'tag-g'}};
const ctx={document,DB,state,STATUS,saved,toasts,
  byNewest:()=>0,fmtDateShort:d=>d,getSpeaker:id=>DB.speakers.find(s=>s.id===id),
  getMosque:id=>DB.mosques.find(m=>m.id===id),
  suppressSnapshotFor(){},fsSet:async(c,i,d)=>{saved.push({c,i,d});},
  showToast:(m,k)=>toasts.push({m,k}),renderAdmin(){},setAdminTab(){},adminSetStatus(){},adminVerifyMq(){},adminVerifySpk(){},
  confirmDelete(){},openModal(){},closeModal(){},iconSVG:()=>'',console};
vm.createContext(ctx);
// Inject error nyata dari adminSaveMq: buang catch generik agar penyebab terlihat.
let _vm=html.slice(html.indexOf('function setAdminTab(tab,btn)'),html.indexOf('function adminApprove'));
_vm=_vm.split('}catch(e){').join('}catch(e){console.log("CATCH",String(e&&e.message));');
vm.runInContext(_vm,ctx);
vm.runInContext(`function runTab(t){state.adminTab=t;setAdminTab(t,null);return document.getElementById('admin-content').innerHTML;} this.runTab=runTab;`,ctx);

// 1) Pencarian kajian
assert.ok(ctx.runTab('kajian').includes('adminSearchInput'),'input pencarian kajian tampil');
vm.runInContext(`adminSearchSet('tafsir')`,ctx);
assert.ok(document.getElementById('admin-content').innerHTML.includes('Tafsir Ibnu Katsir'));
const H=document.getElementById('admin-content').innerHTML;const allPart=H.slice(H.indexOf('Semua Kajian'));assert.ok(!allPart.includes('>Kajian Kitab<'),'hasil filter tidak boleh memuat kajian tak cocok');

// 2) Pencarian pembicara, pengguna, masjid
ctx.runTab('speakers');vm.runInContext(`adminSearchSet('khalid')`,ctx);
assert.ok(document.getElementById('admin-content').innerHTML.includes('Khalid Basalamah'));
ctx.runTab('users');vm.runInContext(`adminSearchSet('budi')`,ctx);
assert.ok(document.getElementById('admin-content').innerHTML.includes('Budi Santoso'));
assert.ok(!document.getElementById('admin-content').innerHTML.includes('Andi<'));
ctx.runTab('mosques');vm.runInContext(`adminSearchSet('hijau')`,ctx);
assert.ok(document.getElementById('admin-content').innerHTML.includes('Hijau Nurul Iman'));
assert.ok(document.getElementById('admin-content').innerHTML.includes('adminEditMq'),'tombol Edit masjid ada');

// 3) Edit masjid: validasi & simpan
vm.runInContext(`this.adminEditMq=adminEditMq;this.adminSaveMq=adminSaveMq;`,ctx);
assert.ok(typeof ctx.adminEditMq==='function','fungsi edit masjid ada');
ctx.adminEditMq('m1');
const g=id=>document.getElementById(id);
assert.equal(g('adm-mq-nama').value,'Masjid Al Fattah');
assert.equal(g('adm-mq-lat').value,'-6.19');
// validasi: satu kosong satu isi (adminSaveMq async)
const r1=await vm.runInContext(`adminSaveMq('m1',{name:'Masjid Al Fattah',address:'',city:'Jakarta Timur',lat:'',lng:'106.9'})`,ctx);
assert.equal(r1.ok,false);
// validasi: out of range
const r2=await vm.runInContext(`adminSaveMq('m1',{name:'Masjid Al Fattah',address:'',city:'Jakarta Timur',lat:'99',lng:'106.9'})`,ctx);
assert.equal(r2.ok,false);
// valid: update nama+koordinat
const res=await vm.runInContext(`adminSaveMq('m1',{name:'Masjid Al Fattah Baru',address:'Jl. Baru 1',city:'Jakarta Timur',lat:'-6.2',lng:'106.93'})`,ctx);
assert.equal(res.ok,true);
assert.equal(DB.mosques[0].lat,-6.2); assert.equal(DB.mosques[0].lng,106.93);
assert.equal(DB.mosques[0].name,'Masjid Al Fattah Baru');
assert.equal(saved.length,1); assert.equal(toasts.some(t=>t.k==='s'),true);
// koordinat lama tetap bila dikosongkan keduanya
const res2=await vm.runInContext(`adminSaveMq('m1',{name:'Masjid Al Fattah Baru',address:'',city:'Jakarta Timur',lat:'',lng:''})`,ctx);
assert.equal(res2.ok,true); assert.equal(DB.mosques[0].lat,-6.2);
// gagal simpan: tidak ada toast sukses, data lokal tak berubah
ctx.fsSet=async()=>{throw new Error('boom');};
toasts.length=0;saved.length=0;
const res3=await vm.runInContext(`adminSaveMq('m1',{name:'Diganti Gagal',address:'',city:'',lat:'-6.2',lng:'106.9'})`,ctx);
assert.equal(res3.ok,false); assert.equal(DB.mosques[0].name,'Masjid Al Fattah Baru');
assert.equal(toasts.some(t=>t.k==='s'),false);

// 4) Guard non-admin
ctx.state.user={id:'u1',role:'user'};
const res4=await vm.runInContext(`adminSaveMq('m1',{name:'Nakal',address:'',city:'',lat:'-6.2',lng:'106.9'})`,ctx);
assert.equal(res4.ok,false); assert.equal(saved.length,0);

console.log('LULUS: pencarian 4 tab, edit masjid, validasi koordinat, guard non-admin, kegagalan simpan aman');
})().catch(e=>{console.error(e);process.exit(1);});
