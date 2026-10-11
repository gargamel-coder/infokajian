// Real Chromium parser test; all external traffic blocked. No production writes.
const {chromium}=require('playwright-core');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{const b=await chromium.launch({executablePath:process.env.AGENT_BROWSER_EXECUTABLE_PATH,args:['--no-sandbox']});try{
const p=await b.newPage();let releases=[];
await p.addInitScript(()=>{window.__shellReady=null;const timer=setInterval(()=>{if(document.querySelector('#scr-home.active')&&typeof goScreen==='function'){window.__shellReady=performance.now();clearInterval(timer);}},10);});
await p.route('**/*',r=>{if(r.request().url()==='https://www.infokajian.app/')return r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.HTML||'index.html','utf8')});if(r.request().url().includes('firebasejs'))return new Promise(resolve=>releases.push(()=>r.fulfill({contentType:'text/javascript',body:''}).then(resolve)));return r.abort();});
const started=Date.now();const nav=p.goto('https://www.infokajian.app/',{waitUntil:'load',timeout:15000}).catch(()=>{});
await p.waitForTimeout(1200);
const result=await p.evaluate(()=>({screen:!!document.querySelector('#scr-home.active'),navigation:typeof goScreen==='function',time:performance.now(),shellReadyMs:window.__shellReady}));
console.log(JSON.stringify({scenario:'SDK held pending for 1200ms',...result,elapsed:Date.now()-started}));
for(const release of releases)release();await p.unrouteAll({behavior:'ignoreErrors'});await nav;
assert(result.screen&&result.navigation,'Home and navigation must exist while Firebase CDN remains pending');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
