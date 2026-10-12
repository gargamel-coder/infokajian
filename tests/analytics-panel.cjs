const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
test('panel dimuat sesuai permintaan, menolak tamu, dan menjelaskan batas statistik',()=>{
 const html=fs.readFileSync('index.html','utf8');assert.match(html,/setAdminTab\('analytics',this\)/);assert.ok(!/<script[^>]+src=["']analytics-/.test(html));
 const src=fs.readFileSync('analytics-admin.js','utf8'),x={module:{exports:{}}};vm.runInNewContext(src,x);
 const nodes={},host={textContent:'',innerHTML:'',querySelector:id=>nodes[id]||(nodes[id]={})};
 x.module.exports.render(host,{admin:false});assert.match(host.textContent,/khusus admin/i);
 x.module.exports.render(host,{admin:true});assert.match(host.innerHTML,/Otomatis untuk pengguna login non-admin/);assert.match(host.innerHTML,/Belum dimuat/);assert.match(host.innerHTML,/Ekspor CSV/);assert.equal(typeof nodes['#ik-an-refresh'].onclick,'function');
});
