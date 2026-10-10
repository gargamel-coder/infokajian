// Run with NODE_PATH pointing to firebase + @firebase/rules-unit-testing.
// FIRESTORE_EMULATOR_HOST must point to a LOCAL emulator; never production.
const fs = require('node:fs');
const {initializeTestEnvironment, assertFails, assertSucceeds} = require('@firebase/rules-unit-testing');
const {doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, collection, setLogLevel} = require('firebase/firestore');
setLogLevel('silent');
(async () => {
  if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) throw Error('Local emulator required');
  const [host,port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  const env = await initializeTestEnvironment({projectId:'demo-infokajian-security',firestore:{host,port:Number(port),rules:fs.readFileSync(process.env.RULES_FILE || require('node:path').join(__dirname,'../firestore.rules'),'utf8')}});
  let passed=0, failed=0;
  const db=env.authenticatedContext('alice',{email:'alice@example.test',email_verified:true}).firestore();
  const check=async(name, fn)=>{try{await fn(); console.log('PASS '+name); passed++;}catch(e){console.log('FAIL '+name+': '+e.message);failed++;}};
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx=>setDoc(doc(ctx.firestore(),'users/bob'),{id:'bob',role:'user',name:'Bob'}));
    await check('ordinary user cannot escalate another profile',()=>assertFails(updateDoc(doc(db,'users/bob'),{role:'admin'})));
    if(process.env.RED_ONLY) return;
    const admin=env.authenticatedContext('admin',{email:'syahlanxzaelani@gmail.com',email_verified:true}).firestore();
    const fake=env.authenticatedContext('fake',{email:'syahlanxzaelani@gmail.com',email_verified:false}).firestore();
    const guest=env.unauthenticatedContext().firestore();
    await check('own normal profile create',()=>assertSucceeds(setDoc(doc(db,'users/alice'),{id:'alice',role:'user',name:'Alice'})));
    await check('own role escalation denied',()=>assertFails(updateDoc(doc(db,'users/alice'),{role:'admin'})));
    await check('own name update',()=>assertSucceeds(updateDoc(doc(db,'users/alice'),{name:'A'})));
    for(const col of ['kajian','speakers','mosques']) {
      await check('admin writes '+col,()=>assertSucceeds(setDoc(doc(admin,col+'/sample'),{title:'Sample',status:'approved'})));
      await check('ordinary write denied '+col,()=>assertFails(updateDoc(doc(db,col+'/sample'),{title:'Changed'})));
      await check('ordinary delete denied '+col,()=>assertFails(deleteDoc(doc(db,col+'/sample'))));
      await check('guest write denied '+col,()=>assertFails(setDoc(doc(guest,col+'/guest'),{title:'X'})));
      await check('unverified admin denied '+col,()=>assertFails(setDoc(doc(fake,col+'/fake'),{title:'X'})));
    }
    await check('pending own submission allowed',()=>assertSucceeds(setDoc(doc(db,'kajian/pending'),{status:'pending',submitted_by:'alice'})));
    await check('self publish denied',()=>assertFails(updateDoc(doc(db,'kajian/pending'),{status:'approved'})));
    await check('admin role management',()=>assertSucceeds(updateDoc(doc(admin,'users/bob'),{role:'contributor'})));
    await check('own personal data',()=>assertSucceeds(setDoc(doc(db,'userData/alice'),{bookmarks:[]})));
    await check('other personal write denied',()=>assertFails(setDoc(doc(db,'userData/bob'),{bookmarks:[]})));
    await check('other personal read denied',()=>assertFails(getDoc(doc(db,'userData/bob'))));
    await check('own note allowed',()=>assertSucceeds(setDoc(doc(db,'userData/alice/notes/n'),{html:'test'})));
    await check('other note denied',()=>assertFails(getDoc(doc(db,'userData/bob/notes/n'))));
  } finally {await env.cleanup();}
  console.log(JSON.stringify({passed,failed})); if(failed) process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
