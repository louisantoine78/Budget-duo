'use strict';
/* Explicit public, free historical FX lookup only. No bank/household data.
 * Never part of native or CI suites. Opt-in network execution:
 * TRACE_ALLOW_PUBLIC_RATE_QA=1 node tests/trace-valet-public.integration.cjs
 */
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
require('../trace-international-1.0.0.js');
const results=[];
(async()=>{
 if(process.env.TRACE_ALLOW_PUBLIC_RATE_QA!=='1')throw Error('Public HTTP QA requires explicit TRACE_ALLOW_PUBLIC_RATE_QA=1');
 const I=globalThis.TraceInternational;
 const transport=async url=>{
  const parsed=new URL(url);
  assert.equal(parsed.origin,'https://www.bankofcanada.ca');
  assert.match(parsed.pathname,/^\/valet\/observations\/FX(?:EUR|USD|GBP|CHF)CAD$/);
  return fetch(url,{signal:AbortSignal.timeout(15000)});
 };
 // Stable historical dates, no claim of a current trading quote.
 for(const date of ['2025-06-20','2025-06-21']){
  const quotes=await Promise.all(['EUR','USD','GBP','CHF'].map(currency=>I.fetchDailyRate(currency,date,transport)));
  for(const quote of quotes){
   assert.equal(quote.requestedDate,date);assert.equal(quote.date,'2025-06-20');
   assert.ok(Number.isFinite(quote.cadPerUnit)&&quote.cadPerUnit>0);
   assert.equal(quote.kind,date===quote.date?'exact':'previous_business_day');
   assert.equal(quote.source,'Banque du Canada · Valet');
   assert.ok(Number.isFinite(I.fxValue(40,quote.currency,quote)));
   results.push({name:quote.currency+' '+date,passed:true,quote});
   console.log('PASS '+quote.currency+' '+date+' -> '+quote.date+' ('+quote.kind+')');
  }
 }
})().catch(error=>{results.push({name:'first failing public API boundary',passed:false,error:error.message});
 console.error(error.message);process.exitCode=1;
}).finally(async()=>{
 const index=process.argv.indexOf('--report');
 if(index>=0)await fs.writeFile(path.resolve(process.argv[index+1]),JSON.stringify({
  source:'Bank of Canada Valet public HTTPS API',financialData:'No bank, household or transaction data; public historical quotes only',
  realHTTP:true,browserCORS:false,currentMarketQuote:false,results,passed:results.length===8&&results.every(x=>x.passed)},null,2)+'\n');
});
