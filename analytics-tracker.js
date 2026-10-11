/* Telemetri opt-in Info Kajian. Memakai IKAnalyticsCore untuk queue & ringkasan.
   Nonblocking: flush berkala + beforeunload; gagal jaringan diabaikan (retry menyusul).
   Hanya pengguna login yang ditelemetri; tamu tidak dikirim (dashboard tetap jujur). */
(function(root){
 'use strict';
 var LS_CONSENT='ik_analytics_consent';
 function consent(){ try{return localStorage.getItem(LS_CONSENT)==='1';}catch(e){return false;} }
 function setConsent(v){ try{ if(v)localStorage.setItem(LS_CONSENT,'1'); else localStorage.removeItem(LS_CONSENT); }catch(e){} ensureCollector(); if(!v&&collector)collector.take(); if(v&&typeof start==='function')start(); }
 var collector=null,flushTimer=null,flushing=false;
 function uid(){ return (root.state&&root.state.user&&root.state.user.id)||''; }
 function isAdmin(){ return !!(root.state&&root.state.user&&root.state.user.role==='admin'); }
 function idGen(){ return 's'+Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
 function now(){ return Date.now(); }
 function ensureCollector(){
  if(!root.IKAnalyticsCore)return false;
  if(!collector){ collector=root.IKAnalyticsCore.createCollector({now:now,id:idGen}); }
  collector.configure({uid:uid(),consent:consent(),admin:isAdmin(),bot:false});
  return true;
 }
 function screenName(){ var s=root.screenHistory&&root.screenHistory.length?root.screenHistory[root.screenHistory.length-1]:'home'; return String(s||'home').replace(/[^a-zA-Z0-9_-]/g,'')||'home'; }
 function track(kind,target){
  if(!consent()||!uid()||isAdmin())return;
  if(!ensureCollector())return;
  collector.track({kind:kind,target:target});
 }
 function flush(){
  if(!collector||flushing)return;
  var items=collector.take(); if(!items.length)return;
  flushing=true;
  var db=root.db;
  if(!db){flushing=false;root.__ikPending=(root.__ikPending||[]).concat(items);return;}
  var batch=db.batch();
  items.forEach(function(e){
   var uidPart=String(e.uid||'x').replace(/[^a-zA-Z0-9_-]/g,'');
   batch.set(db.collection('analyticsEvents').doc('e'+e.clientTime+'-'+uidPart+'-'+e.session+'-'+e.kind+'-'+e.target),{
    uid:e.uid,kind:e.kind,target:e.target,session:e.session,count:e.count,clientTime:e.clientTime,createdAt:new Date().toISOString()
   });
  });
  batch.commit().catch(function(){ /* diam: retry via event berikutnya; jangan ganggu UX */ })
   .then(function(){flushing=false;});
 }
 function start(){
  if(flushTimer)return;
  flushTimer=setInterval(function(){
   if(!consent()||!uid()||isAdmin())return;
   if(collector&&collector.size())flush();
  },30000);
  root.addEventListener('beforeunload',function(){ if(consent()&&uid()&&!isAdmin()&&collector&&collector.size())flush(); });
  // pageview saat pindah layar
  var orig=root.goScreen;
  if(typeof orig==='function'&&!root.__ikPvPatched){
   root.__ikPvPatched=true;
   root.goScreen=function(name){ try{ if(name!=='login')track('pageview',String(name).replace(/[^a-zA-Z0-9_-]/g,'')||'home'); }catch(e){} return orig.apply(this,arguments); };
  }
 }
 root.IKAnalytics={consent:consent,setConsent:setConsent,track:track,start:start,flush:flush,_collector:function(){return collector;}};
})(typeof globalThis!=='undefined'?globalThis:this);
