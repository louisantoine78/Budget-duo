'use strict';
// Pure local QA policy, no I/O. A zero-exit script with zero tests is NO-GO.
function checkSuiteResult({status,signal=null,error=null,stdout=''}={}){
 const text=String(stdout||'').replace(/\r/g,'');
 const custom=(text.match(/^(?:# )?PASS /gm)||[]).length;
 const customFailures=(text.match(/^(?:# )?FAIL /gm)||[]).length;
 const find=label=>{
  const pattern=new RegExp('^# '+label+' (\\d+)$','gm');
  const matches=[...text.matchAll(pattern)];
  return matches.length?Number(matches.at(-1)[1]):null;
 };
 const native=find('tests'),pass=find('pass'),failed=find('fail');
 const nativeGood=native!==null&&native>0&&pass!==null&&pass>0&&
  failed===0&&pass<=native;
 const scenarios=custom|| (nativeGood?pass:0);
 const passed=status===0&&!signal&&!error&&scenarios>0&&
  customFailures===0&&!/^not ok \d+\b/m.test(text)&&
  (native===null||nativeGood);
 return{passed,reportedScenarios:scenarios,
  reason:passed?'ok':status!==0||signal||error?'process_failed':
   !scenarios?'no_executed_scenarios':'failed_assertion_reported'};
}
module.exports={checkSuiteResult};
