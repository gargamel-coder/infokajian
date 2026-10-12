/* Analytics primitives. No I/O, no Firebase or DOM dependency. */
(function(root){
 'use strict';
 function createCollector(options){
  var config={}, queue=new Map(), session='',last=0,identity='';
  var now=options.now,id=options.id;
  return {
   configure:function(next){
    var key=next.uid||'';
    if(key!==identity || !next.consent || next.admin || next.bot){queue.clear();session='';last=0;}
    identity=key;config=next;
   },
   track:function(input){
    if(!config.consent || !identity || config.admin || config.bot)return false;
    if(!['pageview','kajian','mosque','speaker','follow','bookmark','maps'].includes(input.kind))return false;
    if(typeof input.target!=='string'||! /^[a-zA-Z0-9_-]{1,100}$/.test(input.target))return false;
    var time=now();
    if(!session || time-last>=1800000){session=id();}last=time;
    var key=session+'|'+input.kind+'|'+input.target;
    if(queue.has(key)){var old=queue.get(key);old.count=Math.min(100,old.count+1);return true;}
    if(queue.size>=20)return false;
    queue.set(key,{uid:identity,session:session,kind:input.kind,target:input.target,count:1,clientTime:time});return true;
   },
   take:function(){var result=Array.from(queue.values());queue.clear();return result;},
   size:function(){return queue.size;}
  };
 }
 function summarize(events,options){
  var now=options.now,day=86400000,offset=7*3600000;
  function date(t){return new Date(t+offset).toISOString().slice(0,10);}
  var today=date(now),start=Date.parse(today+'T00:00:00+07:00'),users=new Set(),week=new Set(),month=new Set(),sessions=new Set();
  var trend=Array.from({length:30},function(_,i){return {date:date(start-(29-i)*day),pageviews:0};});
  var hours=Array.from({length:24},function(_,i){return {hour:i,pageviews:0};});
  var views=0,actions=Object.create(null),top=new Map();
  (events||[]).slice(0,5000).forEach(function(e){
   if(!e || typeof e.uid!=='string'||!e.uid || typeof e.session!=='string'||!e.session || !Number.isFinite(e.clientTime)||e.clientTime>now||e.clientTime<start-29*day || !Number.isInteger(e.count)||e.count<1||e.count>100 || !['pageview','kajian','mosque','speaker','follow','bookmark','maps'].includes(e.kind)||! /^[a-zA-Z0-9_-]{1,100}$/.test(e.target))return;
   var t=e.clientTime,d=date(t);month.add(e.uid);if(t>=start-6*day)week.add(e.uid);
   if(d===today){users.add(e.uid);sessions.add(JSON.stringify([e.uid,e.session]));}
   if(e.kind==='pageview'){
    var row=trend.find(function(r){return r.date===d;});if(row)row.pageviews+=e.count;
    if(d===today){views+=e.count;hours[new Date(t+offset).getUTCHours()].pageviews+=e.count;}
   }else if(['follow','bookmark','maps'].includes(e.kind)){actions[e.kind]=(actions[e.kind]||0)+e.count;}
   else {var key=e.kind+':'+e.target;var r=top.get(key)||{kind:e.kind,target:e.target,count:0};r.count+=e.count;top.set(key,r);}
  });
  return {timezone:'Asia/Jakarta',basis:'Pengguna login non-admin; 30 hari kalender, waktu klien; tamu tidak tercatat',partial:events.length>=5000,today:{date:today,visitors:users.size,sessions:sessions.size,pageviews:views},active:{dau:users.size,wau:week.size,mau:month.size},trend:trend,hours:hours,actions:actions,top:Array.from(top.values()).sort(function(a,b){return b.count-a.count;}).slice(0,20),duration:null,guests:null,source:null,region:null,newReturning:null};
 }
 var api={createCollector:createCollector,summarize:summarize};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.IKAnalyticsCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
