const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
test('admin analytics is lazy, fail-closed, honest and network-free while backend unavailable',async()=>{
 const html=fs.readFileSync('index.html','utf8');assert.match(html,/setAdminTab\('analytics',this\)/);
 assert.ok(!/<script[^>]+src=["']analytics-/.test(html));
 const src=fs.readFileSync('analytics-admin.js','utf8');const x={module:{exports:{}}};vm.runInNewContext(src,x);
 const host={textContent:'',innerHTML:''};x.module.exports.render(host,{admin:false});assert.match(host.textContent,/khusus admin/i);
 x.module.exports.render(host,{admin:true});assert.match(host.innerHTML,/belum aktif/i);assert.match(host.innerHTML,/Belum tersedia/);assert.ok(!host.innerHTML.includes('PRIVATE'));
 assert.ok(!/fetch\(|collection\(|XMLHttpRequest|localStorage/.test(src));
});
