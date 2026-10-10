// Notifikasi admin saat user baru mendaftar.
// Tes mengekstrak fungsi asli dari index.html; tidak memakai data produksi.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
function extract(name){
  const s=html.indexOf('function '+name+'(');
  assert.notEqual(s,-1,'function '+name+' belum ada di index.html');
  let depth=0,i=html.indexOf('{',s);
  for(let j=i;j<html.length;j++){if(html[j]==='{')depth++;if(html[j]==='}'){depth--;if(!depth){return html.slice(s,j+1);}}}
}
(async()=>{
 let passes=0,fails=0;
 const check=(name,fn)=>fn().then(()=>{console.log('PASS '+name);passes++;},e=>{console.log('FAIL '+name+': '+e.message);fails++;});
 const nu={uid:'u_baru',name:'Pengguna Baru',email:'baru@example.test',timestamp:'2026-10-10T07:00:00Z'};
 const expected='Pengguna baru mendaftar: Pengguna Baru (baru@example.test).';

 // Skenario 1: sesi admin aktif -> masuk inbox lokal admin.
 await check('admin aktif: notif masuk inbox lokal',async()=>{
   const ctx={DB:{users:[]},state:{user:{role:'admin'},notifications:[]},saved:false,
     db:null,fsSet:async()=>{},fsSaveUserData:()=>{ctx.__saved=true;},console,Date};
   vm.createContext(ctx);vm.runInContext(extract('notifyNewUser'),ctx);
   await ctx.notifyNewUser(nu);
   assert.equal(ctx.state.notifications.length,1,'inbox lokal harus berisi 1 notif');
   assert.equal(ctx.state.notifications[0].message,expected);
   assert.equal(ctx.state.notifications[0].read,false);
   assert.ok(ctx.__saved,'harus dipersist');
   assert.ok(!ctx._fcmPush||ctx._fcmPush.length===0,'push FCM tidak dikirim dari klien saat admin aktif lokal');
 });

 // Skenario 2: mendaftar saat tidak ada sesi admin -> tulis ke userData admin.
 await check('tanpa sesi admin: ditulis ke inbox Firestore admin',async()=>{
   const writes=[];const adminDoc={exists:true,data:()=>({notifications:[{message:'lama',read:true}]})};
   const ctx={DB:{users:[{id:'adm',role:'admin'}]},state:{user:null},
     db:{collection:c=>({doc:id=>({get:async()=>adminDoc,set:async(d)=>writes.push({id,data:d})})})},
     fsSet:async()=>{},fsSaveUserData:()=>{},console,_fcmSend:async p=>writes.push({fcm:p}),Date};
   vm.createContext(ctx);vm.runInContext(extract('notifyNewUser'),ctx);
   await ctx.notifyNewUser(nu);
   await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
   const w=writes.find(x=>x.id==='adm');
   assert.ok(w,'harus menulis ke userData admin');
   assert.equal(w.data.notifications.length,2);
   assert.equal(w.data.notifications[0].message,expected);
   assert.ok(writes.some(x=>x.fcm),'harus menyiapkan push FCM ke admin');
 });

 // Skenario 3: push payload FCM berisi title/body/link admin.
 await check('payload push ke admin lengkap',async()=>{
   const pushed=[];const adminDoc={exists:false,data:()=>({notifications:[]})};
   const ctx={DB:{users:[{id:'adm',role:'admin'}]},state:{user:null},
     db:{collection:c=>({doc:id=>({get:async()=>adminDoc,set:async(d)=>pushed.push({id,data:d})})})},
     fsSet:async()=>{},fsSaveUserData(){},console,_fcmSend:async p=>pushed.push({fcm:p}),Date};
   vm.createContext(ctx);vm.runInContext(extract('notifyNewUser'),ctx);
   await ctx.notifyNewUser(nu);await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
   const f=pushed.find(x=>x.fcm);
   assert.ok(f,'harus ada payload FCM');
   assert.equal(f.fcm.title,'Pendaftaran baru');
   assert.ok(f.fcm.body.includes('Pengguna Baru'));
   assert.equal(f.fcm.link,'https://www.infokajian.app/#/admin');
 });

 // Skenario 4: tidak ada admin terdaftar -> tidak melempar error.
 await check('tanpa admin terdaftar: aman',async()=>{
   const ctx={DB:{users:[]},state:{user:null},db:{collection(){throw Error('tidak boleh dipanggil')}},
     fsSet:async()=>{},fsSaveUserData(){},console,_fcmSend:async()=>{},Date};
   vm.createContext(ctx);vm.runInContext(extract('notifyNewUser'),ctx);
   await ctx.notifyNewUser(nu);
 });

 // Skenario 5: user biasa yang baru mendaftar TIDAK menerima notif admin.
 await check('user biasa tidak menerima notif admin',async()=>{
   const writes=[];const plain={exists:false,data:()=>({notifications:[]})};
   const ctx={DB:{users:[{id:'biasa',role:'user'}]},state:{user:null},
     db:{collection:c=>({doc:id=>({get:async()=>plain,set:async(d)=>writes.push({id,data:d})})})},
     fsSet:async()=>{},fsSaveUserData(){},console,_fcmSend:async p=>writes.push({fcm:p}),Date};
   vm.createContext(ctx);vm.runInContext(extract('notifyNewUser'),ctx);
   await ctx.notifyNewUser(nu);await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
   assert.ok(!writes.some(x=>x.id==='biasa'),'user biasa tidak boleh ditulis');
   assert.ok(!writes.some(x=>x.fcm),'tidak ada push ke user biasa');
 });

 console.log(JSON.stringify({passed:passes,failed:fails}));if(fails)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
