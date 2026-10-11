// Tes rules analyticsEvents — versi manual (tanpa assertFails, tanpa mix SDK).
// Jalankan: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 NODE_PATH=/opt/data/cache/ik-rules-tools/node_modules node tests/analytics-rules.cjs
const fs=require('fs');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const fbMod=require.resolve('firebase/firestore');
const {doc,setDoc,getDocs,collection,query,limit}=require(fbMod);

(async()=>{
 const rules=fs.readFileSync('firestore.rules','utf8');
 const env=await initializeTestEnvironment({projectId:'analytics-rules-test',firestore:{rules}});
 const RUN=Date.now();
 const ev=(uid,extra)=>Object.assign({uid:uid,kind:'pageview',target:'home',session:'s1',count:1,clientTime:Date.now(),createdAt:new Date().toISOString()},extra||{});
 async function attempt(dbFn,path,data,method){
  try{
   if(method==='set') await setDoc(doc(dbFn,path),data);
   else if(method==='merge') await setDoc(doc(dbFn,path),data,{merge:true});
   else if(method==='read') await getDocs(query(collection(dbFn,'analyticsEvents'),limit(5)));
   return {allowed:true};
  }catch(e){ return {allowed:false,code:e.code||''}; }
 }
 let pass=0,fail=0;
 function check(name,cond){ if(cond){pass++;console.log('PASS',name);} else {fail++;console.log('FAIL',name);} }

 // 1. owner-create ok
 const alice=env.authenticatedContext('alice').firestore();
 check('owner-create',(await attempt(alice,'analyticsEvents/e1-'+RUN,ev('alice'),'set')).allowed);
 // 2. spoof uid ditolak
 check('spoof-ditolak',!(await attempt(alice,'analyticsEvents/e2-'+RUN,ev('bob'),'set')).allowed);
 // 3. immutable: update & delete ditolak
 check('update-ditolak',!(await attempt(alice,'analyticsEvents/e1-'+RUN,ev('alice',{count:99}),'merge')).allowed);
 // 4. schema ketat
 check('field-asing-ditolak',!(await attempt(alice,'analyticsEvents/e3-'+RUN,Object.assign(ev('alice'),{hack:true}),'set')).allowed);
 check('target-kepanjangan',!(await attempt(alice,'analyticsEvents/e4-'+RUN,Object.assign(ev('alice'),{target:'x'.repeat(200)}),'set')).allowed);
 check('count-0-ditolak',!(await attempt(alice,'analyticsEvents/e5-'+RUN,Object.assign(ev('alice'),{count:0}),'set')).allowed);
 check('count-101-ditolak',!(await attempt(alice,'analyticsEvents/e6-'+RUN,Object.assign(ev('alice'),{count:101}),'set')).allowed);
 check('kind-asing-ditolak',!(await attempt(alice,'analyticsEvents/e7-'+RUN,Object.assign(ev('alice'),{kind:'hack'}),'set')).allowed);
 check('target-berspasi-ditolak',!(await attempt(alice,'analyticsEvents/e8-'+RUN,Object.assign(ev('alice'),{target:'bad path'}),'set')).allowed);
 // 5. non-admin read ditolak
 const bob=env.authenticatedContext('bob').firestore();
 check('nonadmin-read-ditolak',!(await attempt(bob,null,null,'read')).allowed);
 // 6. admin read ok
 const adm=env.authenticatedContext('admin-uid',{email:'syahlanxzaelani@gmail.com',email_verified:true}).firestore();
 check('admin-read-ok',(await attempt(adm,null,null,'read')).allowed);
 // 7. tamu write ditolak
 const anon=env.unauthenticatedContext().firestore();
 check('tamu-write-ditolak',!(await attempt(anon,'analyticsEvents/e9-'+RUN,ev('anon'),'set')).allowed);

 await env.cleanup();
 console.log('HASIL:',pass,'pass /',fail,'fail');
 if(fail)process.exit(1);
 console.log('LULUS: rules analyticsEvents — owner-create immutable, schema ketat, admin-only read, tamu ditolak');
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(1);});
