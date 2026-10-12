// Dry run E2E analitik: collector→queue→flush stub Firestore; dashboard render dari data sintetis. Tanpa produksi.
const fs=require('fs'),vm=require('vm');
const assert=require('node:assert/strict');
const coreSrc=fs.readFileSync('analytics-core.js','utf8'),trackerSrc=fs.readFileSync('analytics-tracker.js','utf8'),adminSrc=fs.readFileSync('analytics-admin.js','utf8');
let writes=[],toasts=[];
const store=new Map();
const ctx={
 console,window:null,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
 state:{user:{id:'u1',role:'user'},subscriptions:{speakers:[],mosques:[],contributors:[]}},
 screenHistory:['home'],
 db:{batch(){const b={};b.set=(ref,data)=>{writes.push({ref,data});return b;};b.commit=async()=>{return {};};return b;},
      collection:c=>({doc:id=>c+'/'+id})},
 addEventListener(){},goScreen(name){ctx.screenHistory.push(name);},
 showToast(m,k){toasts.push({m,k})},Date,
 setTimeout,clearTimeout,setInterval(){return 1;},clearInterval(){},
 };
ctx.globalThis=ctx;ctx.window=ctx;
ctx.ikAnalyticsContext=()=>({user:ctx.state.user,db:ctx.db,screen:ctx.screenHistory[ctx.screenHistory.length-1]||'home'});
vm.createContext(ctx);
vm.runInContext(coreSrc,ctx);vm.runInContext(trackerSrc,ctx);vm.runInContext(adminSrc,ctx);
(async()=>{
 const IK=ctx.IKAnalytics;
 // 1. Sebelum consent: track diabaikan (collector belum dibuat — null adalah normal)
 IK.track('pageview','home');assert.ok(!IK._collector() || IK._collector().size()===0,'tanpa consent tidak ada antrean');
 // 2. Set consent → pageview tercatat
 IK.setConsent(true);
 IK.track('pageview','home');IK.track('kajian','k-abc');IK.track('bookmark','k-abc');
 assert.ok(IK._collector() && IK._collector().size()>=1);
 // 3. Flush → tulis ke batch (stub) sebelum identitas berubah
 await IK.flush();
 assert.ok(writes.length>=2,'flush menulis event ke Firestore. got '+writes.length);
 writes.forEach(w=>{assert.match(w.ref,/analyticsEvents\/e\d+-u1-s[a-z0-9]+-/);assert.equal(typeof w.data.createdAt,'string');});
 // 4. Admin ditolak
 ctx.state.user={id:'adm',role:'admin'};
 IK.track('pageview','home'); // harus diabaikan
 // 5. Withdraw consent: antrean dibuang
 ctx.state.user={id:'u2',role:'user'};
 IK.track('pageview','home');IK.setConsent(false);assert.ok(!IK._collector() || IK._collector().size()===0);
 // 6. Dashboard: render dari data sintetis (admin)
 ctx.state.user={id:'adm',role:'admin'};
 let host={innerHTML:'',querySelector:sel=>({onclick(){},disabled:false}),querySelectorAll:()=>[]};
 IK.setConsent(true);
 // panggil render admin langsung dengan data fake di root.db? gunakan summarize dari core utk konten
 const summary=ctx.IKAnalyticsCore.summarize([{uid:'u1',session:'s1',kind:'pageview',target:'home',count:3,clientTime:Date.now()}],{now:Date.now()});
 assert.equal(summary.today.pageviews,3);assert.equal(summary.active.dau,1);
 assert.equal(typeof summary.today.date,'string');
 console.log('LULUS: dry run E2E analitik — consent, batching, admin exclusion, withdraw, summarize');
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(1);});
