'use strict';
/* Deterministic tests: no internet, no Supabase, no actual user financial data. */
const assert=require('node:assert/strict'),test=require('node:test'),
 fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8');
function setup(initial){
 const clock={now:Date.parse(initial)};
 class FixedDate extends Date{
  constructor(...args){super(...(args.length?args:[clock.now]))}
  static now(){return clock.now}
 }
 const ctx={Date:FixedDate,Intl,console,Map,Promise,Number,String,Math,Error,Array,Object,JSON};
 ctx.window=ctx;
 vm.runInNewContext(code,ctx,{filename:'trace-international-1.0.0.js'});
 return {fx:ctx.TraceInternational,clock};
}
const response=observations=>({ok:true,json:async()=>({observations})});
test('the published observation and the requested transaction day are different fields',async()=>{
 const {fx}=setup('2026-11-02T14:30:00-05:00');
 const q=await fx.fetchDailyRate('EUR','2026-11-02',async()=>response([
  {d:'2026-10-30',FXEURCAD:{v:'1.6123'}}
 ]));
 assert.equal(q.currency,'EUR');
 assert.equal(q.requestedDate,'2026-11-02');
 assert.equal(q.date,'2026-10-30');
 assert.equal(q.kind,'previous_business_day');
 assert.equal(q.cadPerUnit,1.6123);
 assert.match(q.source,/Banque du Canada/);
});
test('when 16:30 ET publication arrives the previously cached quote can be refreshed',async()=>{
 const {fx,clock}=setup('2026-11-02T15:00:00-05:00');
 let calls=0;
 const transport=async()=>{
  calls++;
  return calls===1?response([{d:'2026-10-30',FXUSDCAD:{v:'1.3930'}}]):
   response([{d:'2026-10-30',FXUSDCAD:{v:'1.3930'}},{d:'2026-11-02',FXUSDCAD:{v:'1.4020'}}]);
 };
 const older=await fx.getRate('USD','2026-11-02',transport);
 assert.equal(older.date,'2026-10-30');
 await fx.getRate('USD','2026-11-02',transport);
 assert.equal(calls,1,'recent provisional value is cached briefly');
 clock.now+=16*60*1000;
 const published=await fx.getRate('USD','2026-11-02',transport);
 assert.equal(published.date,'2026-11-02');
 assert.equal(published.cadPerUnit,1.402);
 assert.equal(calls,2,'fallback was retried rather than frozen forever');
 const same=await fx.getRate('USD','2026-11-02',transport);
 assert.equal(same.date,'2026-11-02');
 assert.equal(calls,2,'published same-day quote is stable');
});
test('the historical requested date is immutable once retrieved',async()=>{
 const {fx,clock}=setup('2026-11-02T19:00:00-05:00');
 let calls=0;
 const source=async()=>{calls++;return response([{d:'2026-10-30',FXGBPCAD:{v:'1.83'}}])};
 const a=await fx.getRate('GBP','2026-10-31',source);
 clock.now+=48*60*60*1000;
 const b=await fx.getRate('GBP','2026-10-31',source);
 assert.equal(a.date,'2026-10-30');
 assert.equal(b.date,'2026-10-30');
 assert.equal(calls,1);
});
test('no fabricated FX is returned on missing publication or offline network error',async()=>{
 const {fx}=setup('2026-11-02T19:00:00-05:00');
 await assert.rejects(()=>fx.fetchDailyRate('CHF','2026-11-02',async()=>response([])),/Aucun taux/);
 await assert.rejects(()=>fx.fetchDailyRate('CHF','2026-11-02',async()=>{throw Error('offline')}),/offline/);
});
