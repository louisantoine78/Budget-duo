'use strict';
/*
 * TRACE 5.37 cache migration policy — candidate only, not a registered worker.
 * A safe promotion requires a verified 5.37 shell; stable 5.36.5 is retained
 * for rollback and unrelated caches are never modified.
 */
const PREVIOUS='trace-shell-v5.36.5';
const NEXT_PREFIX='trace-shell-v5.37.0:';
const URLPATH=/^[A-Za-z0-9_./-]+$/;
function cacheRetirementPlan(keys,{nextCache,verified=false,clientsMigrated=false}={}){
 if(!Array.isArray(keys)||keys.some(k=>typeof k!=='string'))
  throw Error('Cache list invalid');
 if(typeof nextCache!=='string'||!nextCache.startsWith(NEXT_PREFIX)||
  nextCache.length<=NEXT_PREFIX.length)throw Error('Invalid 5.37 cache identity');
 const preserve=[...keys];
 const canClean=verified===true&&clientsMigrated===true;
 const deleteNames=canClean?keys.filter(k=>
  k.startsWith(NEXT_PREFIX)&&k!==nextCache):[];
 // Preserve 5.36.5 even after a fully verified migration, for rollback.
 return {canClean,deleteNames,preserve:preserve.filter(k=>!deleteNames.includes(k)),
  stableRetained:preserve.includes(PREVIOUS)};
}
function cacheableStaticRequest(request,origin,files){
 if(!request||request.method!=='GET'||!Array.isArray(files)||files.length<1)return false;
 let url,base;
 try{url=new URL(request.url);base=new URL(origin)}catch{return false}
 if(url.origin!==base.origin||url.username||url.password)return false;
 if(url.search||url.hash)return false;
 let p;try{p=decodeURIComponent(url.pathname).replace(/^\/+/,'' )}catch{return false}
 const allowed=new Set(files);
 if(!URLPATH.test(p)||p.includes('..')||!allowed.has(p))return false;
 if(/^(?:config\.js|index\.html|cloud\.js|app\.js|sw\.js|trace-launch-v2\.html)$/i.test(p))
  return false;
 if(/(?:^|\/)(?:auth|rest|realtime|storage|functions)\/v\d+(?:\/|$)/i.test(p))
  return false;
 if(request.headers&&typeof request.headers.get==='function'&&
   (request.headers.get('Authorization')||request.headers.get('apikey')))
  return false;
 return true;
}
function releaseEntryReadiness(html,worker){
 const is537=typeof html==='string'&&
  /name="trace-build" content="5\.37\.0"/.test(html)&&
  /src="v5-app-5\.37\.0\.js"/.test(html)&&
  !/src="v5-app-5\.36\.5\.js"/.test(html)&&
  !/trace-international-preview-fixtures|trace-preview-pwa-1\.0\.0\.js/.test(html);
 const safeWorker=typeof worker==='string'&&
  !/keys\.filter\(k=>k!==SHELL\)/.test(worker)&&
  !/trace-international-preview-fixtures/.test(worker);
 return{versionEntryReady:is537,workerUpgradeReady:safeWorker,
  releaseReady:is537&&safeWorker};
}
module.exports={PREVIOUS,NEXT_PREFIX,cacheRetirementPlan,
 cacheableStaticRequest,releaseEntryReadiness};

