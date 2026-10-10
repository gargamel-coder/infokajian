const {chromium}=require('playwright');const fs=require('fs');const assert=require('assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
// Local HTML substituted at public origin. Network is real read-only guest traffic; no login/write actions.
if(!process.env.LIVE)await page.route('https://www.infokajian.app/',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync('index.html','utf8')}));
await page.goto('https://www.infokajian.app/',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>typeof goScreen==='function');
const result=await page.evaluate(()=>{const names=['home','kajian','prayer','qibla','mosques','profile','saved','donation','leaderboard','badges','notes','reminders','attendance','notif','login'];return names.map(n=>{goScreen(n);return {screen:n,active:!!document.querySelector('#scr-'+n+'.active')}})});console.log(JSON.stringify(result));assert(result.filter(r=>!['notes','reminders','attendance','saved','badges'].includes(r.screen)).every(r=>r.active));
await page.evaluate(()=>goScreen('home'));assert.equal(await page.locator('#ik-count-n').innerText(),'--:--:--');
await page.screenshot({path:'/opt/data/cache/infokajian-audit-home.png'});
const counts=await page.evaluate(()=>({kajian:DB.kajian.length,mosques:DB.mosques.length}));console.log(JSON.stringify({mode:process.env.LIVE?'production':'local HTML / live guest reads',screens:result,counts,pageErrors:errors}));assert.deepEqual(errors,[]);await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
