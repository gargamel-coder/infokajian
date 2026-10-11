const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const s=fs.readFileSync('index.html','utf8');
let renders=0; const store=new Map();
const c={state:{user:{id:'a'},notifications:[{id:'n1',message:'Pesan lama'}]},localStorage:{setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)},console,_notifApplyReadFlags(){},updateNotificationBadge(){},screenHistory:['notif'],renderNotifs(){renders++}};
vm.createContext(c);vm.runInContext(s.slice(s.indexOf('function ikSaveNotifCache('),s.indexOf('function _notifReadKey(')),c);
c.ikSaveNotifCache('a'); c.state.notifications=[];c.ikHydrateNotifCache('a');assert.equal(c.state.notifications.length,1);assert.equal(renders,1);
c.state.user={id:'b'};c.state.notifications=[];c.ikHydrateNotifCache('a');assert.equal(c.state.notifications.length,0);
store.set('ik-inbox-v1:b','bad json');c.ikHydrateNotifCache('b');assert.equal(c.state.notifications.length,0);
console.log('LULUS: hidrasi sinkron, render langsung, isolasi akun, cache rusak');
