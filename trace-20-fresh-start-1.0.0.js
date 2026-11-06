'use strict';
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.Trace20FreshStart=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const RESET=['transactions','imports','import_days','reconciliations'];
 const KEEP=['accounts','budgets','categories','investment_accounts','investment_operations'];
 function cutoff(value){
  if(value==null||value==='')return null;
  if(typeof value!=='string'||!/^20\\d\\d-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d(?:\\.\\d{1,6})?Z$/.test(value))throw Error('Invalid UTC restart timestamp');
  const ms=Date.parse(value);
  if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,19)!==value.slice(0,19))throw Error('Invalid restart date');
  return ms;
 }
 function partition(documents,settings){
  if(!Array.isArray(documents))throw Error('Expected document array');
  const ms=cutoff(settings?.trace20FreshStartAt),visible=[],archived=[];
  for(const d of documents){
   if(!d||typeof d.collection!=='string')throw Error('Invalid document');
   if(ms===null||!RESET.includes(d.collection)){visible.push(d);continue;}
   if(typeof d.created_at!=='string'||!Number.isFinite(Date.parse(d.created_at)))throw Error('Missing creation date');
   (Date.parse(d.created_at)<=ms?archived:visible).push(d);
  }
  return {active:ms!==null,visible,archived};
 }
 return Object.freeze({RESET:Object.freeze(RESET),KEEP:Object.freeze(KEEP),cutoff,partition});
});
