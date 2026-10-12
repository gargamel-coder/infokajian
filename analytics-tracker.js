/* Telemetri opt-in Info Kajian.
   Hanya pengguna login non-admin yang menyetujui. Antrean tetap ada saat jaringan gagal. */
(function(root){
 'use strict';
 var LS_CONSENT='ik_analytics_consent';
 var collector=null,flushTimer=null,flushing=null,pending=[],identity='',startedIdentity='';
 function consent(){try{return localStorage.getItem(LS_CONSENT)==='1';}catch(e){return false;}}
 function context(){try{return root.ikAnalyticsContext?root.ikAnalyticsContext():{};}catch(e){return {};}}
 function user(ctx){return ctx&&ctx.user||null;}
 function uid(ctx){var u=user(ctx);return u&&u.id||'';}
 function admin(ctx){var u=user(ctx);return !!(u&&u.role==='admin');}
 function idGen(){return 's'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
 function ensureCollector(){
  if(!root.IKAnalyticsCore)return false;
  var ctx=context(),next=uid(ctx),allowed=consent()&&!!next&&!admin(ctx);
  if(next!==identity||!allowed){pending=[];startedIdentity='';}
  identity=next;
  if(!collector)collector=root.IKAnalyticsCore.createCollector({now:function(){return Date.now();},id:idGen});
  collector.configure({uid:next,consent:allowed,admin:admin(ctx),bot:false});
  if(!allowed)collector.take();
  return allowed;
 }
 function target(v){return String(v||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100);}
 function track(kind,value){
  if(!ensureCollector())return false;
  var safe=target(value);if(!safe)return false;
  return collector.track({kind:kind,target:safe});
 }
 function flush(){
  if(flushing)return flushing;
  if(!ensureCollector())return Promise.resolve(false);
  var fresh=collector.take();
  // Batasi memori tanpa menimpa aktivitas lama yang sedang menunggu retry.
  if(fresh.length&&pending.length<200)pending=pending.concat(fresh.slice(0,200-pending.length));
  if(!pending.length)return Promise.resolve(true);
  var ctx=context(),db=ctx.db;if(!db)return Promise.resolve(false);
  var batch=db.batch(),items=pending.slice(),activeUid=identity;
  items.forEach(function(e){
   var uidPart=target(e.uid)||'x',docId='e'+e.clientTime+'-'+uidPart+'-'+e.session+'-'+e.kind+'-'+e.target;
   batch.set(db.collection('analyticsEvents').doc(docId),{uid:e.uid,kind:e.kind,target:e.target,session:e.session,count:e.count,clientTime:e.clientTime,createdAt:new Date().toISOString()});
  });
  flushing=Promise.resolve().then(function(){return batch.commit();}).then(function(){
   if(identity===activeUid)pending.splice(0,items.length);
   return true;
  }).catch(function(){return false;}).then(function(ok){flushing=null;return ok;});
  return flushing;
 }
 function start(){
  if(!ensureCollector())return;
  var ctx=context(),current=uid(ctx);
  if(startedIdentity!==current){startedIdentity=current;track('pageview',ctx.screen||'home');}
  if(!flushTimer)flushTimer=setInterval(function(){if(collector&&collector.size()||pending.length)flush();},30000);
  if(typeof root.goScreen==='function'&&!root.__ikPvPatched){
   var orig=root.goScreen;root.__ikPvPatched=true;
   root.goScreen=function(name){try{if(name!=='login')track('pageview',name||'home');}catch(e){}return orig.apply(this,arguments);};
  }
  if(!root.__ikUnloadPatched){root.__ikUnloadPatched=true;root.addEventListener('beforeunload',function(){if(collector&&collector.size()||pending.length)flush();});}
 }
 function setConsent(v){
  try{if(v)localStorage.setItem(LS_CONSENT,'1');else localStorage.removeItem(LS_CONSENT);}catch(e){}
  ensureCollector();if(v)start();
 }
 root.IKAnalytics={consent:consent,setConsent:setConsent,track:track,start:start,flush:flush,_collector:function(){return collector;},_pendingSize:function(){return pending.length;}};
})(typeof globalThis!=='undefined'?globalThis:this);
