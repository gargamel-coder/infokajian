// Read-only guest audit. Cold = fresh browser context; warm = reload same context.
const {chromium}=require('playwright-core'),fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:process.env.AGENT_BROWSER_EXECUTABLE_PATH,args:['--no-sandbox']});try{
const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
if(process.env.HTML)await p.route('https://www.infokajian.app/',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.HTML,'utf8')}));
await p.addInitScript(()=>{window.__long=[];new PerformanceObserver(l=>window.__long.push(...l.getEntries().map(x=>({start:x.startTime,duration:x.duration})))).observe({type:'longtask',buffered:true});});
const runs=[];for(const mode of ['cold','warm']){
await p.goto('https://www.infokajian.app/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>typeof goScreen==='function');
let catalogReady=true;try{await p.waitForFunction(()=>Object.values(_catalogLoaded).every(Boolean),{},{timeout:20000});}catch{catalogReady=false;}
const boot=await p.evaluate(()=>({navigation:performance.getEntriesByType('navigation')[0].toJSON(),paint:performance.getEntriesByType('paint').map(x=>x.toJSON()),catalog:performance.getEntriesByName('ik-catalog-refresh').map(x=>x.duration),firebaseReady:fbReady,counts:{kajian:DB.kajian.length,mosques:DB.mosques.length},longTasks:window.__long}));
const ui=await p.evaluate(async()=>{const out=[];async function measure(name,fn){const t=performance.now();fn();const sync=performance.now()-t;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));out.push({name,syncMs:sync,frameMs:performance.now()-t,active:document.querySelector('.screen.active')?.id});}for(const name of ['home','kajian','mosques','prayer','saved','notes','notif','login'])await measure(name,()=>goScreen(name));await measure('search',()=>{goScreen('kajian');document.querySelector('#kajian-q').value='kajian';onSearchSuggest('kajian');renderKajianList();});if(DB.kajian.length)await measure('detail',()=>openKajian(DB.kajian[0].id));return out;});
runs.push({mode,catalogReady,boot,ui});}
console.log(JSON.stringify({source:process.env.HTML||'production',runs,errors},null,2));if(errors.length)process.exitCode=1;
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
