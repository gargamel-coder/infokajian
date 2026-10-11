const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function core(){const x={module:{exports:{}}};vm.runInNewContext(fs.readFileSync('analytics-core.js','utf8'),x);return x.module.exports;}
test('consent off, bots and admin produce no queue; valid opt-in is bounded and privacy allowlisted',()=>{
 assert.ok(fs.existsSync('analytics-core.js'),'collector missing');
 const a=core().createCollector({now:()=>1000,id:()=> 'random-id'});
 assert.equal(a.track({kind:'pageview',target:'home'}),false);
 a.configure({consent:true,uid:'alice',admin:true}); assert.equal(a.track({kind:'pageview',target:'home'}),false);
 a.configure({consent:true,uid:'alice',bot:true}); assert.equal(a.track({kind:'pageview',target:'home'}),false);
 a.configure({consent:true,uid:'alice'});
 for(let i=0;i<200;i++)a.track({kind:'pageview',target:'home',email:'secret',lat:123,url:'https://x/?secret'});
 const q=a.take(); assert.equal(q.length,1); assert.equal(q[0].count,100); assert.equal(q[0].email,undefined);assert.equal(q[0].lat,undefined);assert.equal(q[0].url,undefined);
 assert.equal(a.track({kind:'invalid',target:'home'}),false);
 a.configure({consent:false});assert.equal(a.take().length,0);
});
