// Isolated DOM tests: real app functions, synthetic catalog/API; no production writes or OAuth.
const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');
const html=fs.readFileSync('index.html','utf8');
function fixture(){
 const {document}=parseHTML(html);
 const ctx={document,console,Date,URL,encodeURIComponent,setTimeout,clearTimeout,state:{location:null},DB:{mosques:[{id:'fixture',name:'Masjid Uji',address:'Alamat',lat:-6,lng:106}]},today:()=> '2026-10-10',fmtDateLong:()=>'',fmtHijri:()=>'',localStorage:{getItem:()=>null},PRAYER_ICONS:[],fmtDist:String,haversine:()=>1};
 ctx.fetch=async()=>{throw Error('offline fixture')};vm.createContext(ctx);
 vm.runInContext(html.slice(html.indexOf('const IK_NAMES ='),html.indexOf('function ikRenderShortcut()')),ctx);
 vm.runInContext(html.slice(html.indexOf('function renderMosques(){'),html.indexOf('function ikOpenMaps(')),ctx);
 return ctx;
}
const tests=[];function test(name,fn){tests.push([name,fn]);}
test('No invented prayer countdown when GPS unavailable',()=>{const c=fixture();c.ikTick();assert.equal(c.document.getElementById('ik-count-n').textContent,'--:--:--');assert.match(c.document.getElementById('ik-count-h').textContent,/lokasi/i);assert.doesNotMatch(c.document.getElementById('ik-hdr-strip').textContent,/04:30/);});
test('Validated API times display; stale location and malformed responses do not',async()=>{const c=fixture();c.state.location={lat:-6,lng:106};c.fetch=async()=>({ok:true,json:async()=>({data:{timings:{Fajr:'04:31',Sunrise:'05:40',Dhuhr:'12:00',Asr:'15:00',Maghrib:'18:00',Isha:'19:00'}}})});await c.ikFetchTimes();assert.match(c.document.getElementById('ik-hdr-strip').textContent,/04:31/);c.state.location.lat=-7;c.ikTick();assert.equal(c.document.getElementById('ik-count-n').textContent,'--:--:--');c.fetch=async()=>({ok:true,json:async()=>({data:{timings:{Fajr:'bad',Sunrise:'bad',Dhuhr:'bad',Asr:'bad',Maghrib:'bad',Isha:'bad'}}})});await c.ikFetchTimes();assert.equal(c.document.getElementById('ik-count-n').textContent,'--:--:--');});
test('Mosque cards do not invent azan times and map buttons have valid handlers',()=>{const c=fixture();c.renderMosques();assert.doesNotMatch(c.document.getElementById('mosques-list').textContent,/Azan \d/);const b=c.document.querySelector('.ik-mqcard-nav');assert.doesNotThrow(()=>new Function(b.getAttribute('onclick')));let args;c.ikOpenMaps=(...a)=>args=a;b.click();assert.equal(args[2],'Masjid Uji');});
test('Donation illustration is explicitly not a payment QR',()=>{const c=fixture();assert.match(c.document.getElementById('scr-donation').textContent,/bukan kode pembayaran/i);});
test('ICS uses valid UTC date-times and rolls overnight end forward',()=>{const c=fixture();c.getSpeaker=c.getMosque=()=>null;vm.runInContext(html.slice(html.indexOf('function escapeICS('),html.indexOf('function exportToICal(')),c);const out=c.buildICSEvent({id:'fixture',date:'2026-10-10',time:'23:30',title:'Test'});assert.match(out,/DTSTART:20261010T163000Z/);assert.match(out,/DTEND:20261010T180000Z/);assert.doesNotMatch(out,/\+0700/);});
(async()=>{let fail=0;for(const [n,f]of tests){try{await f();console.log('PASS',n);}catch(e){fail++;console.error('FAIL',n,e.message)}}process.exitCode=fail?1:0;})();
