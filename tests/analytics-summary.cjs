const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../analytics-core.js');
test('aggregate rolling windows, WIB days, UID-scoped sessions and aggregate-only export',()=>{
 const now=Date.parse('2026-10-11T10:00:00Z'),day=86400000;
 const event=(uid,time,kind='pageview',count=1)=>({uid,session:'same',target:'home',kind,count,clientTime:time,email:'PRIVATE',name:'PRIVATE'});
 const out=core.summarize([event('a',now, 'pageview',3),event('b',now),event('a',now-day*2),event('c',now-day*9),event('d',now-day*31),event('future',now+1),event('bad',now,'pageview',-2)],{now});
 assert.equal(out.today.visitors,2);assert.equal(out.today.sessions,2);assert.equal(out.today.pageviews,4);
 assert.deepEqual(out.active,{dau:2,wau:2,mau:3});
 assert.equal(out.trend.length,30);assert.equal(out.hours.reduce((a,b)=>a+b.pageviews,0),4);
 const exported=JSON.stringify(out);assert.ok(!exported.includes('PRIVATE'));assert.ok(!exported.includes('uid'));assert.equal(out.duration,null);assert.equal(out.guests,null);
 assert.equal(out.today.date,'2026-10-11');
});
