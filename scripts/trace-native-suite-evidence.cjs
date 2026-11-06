'use strict';
// Pure local QA policy, no I/O. A zero-exit script with zero tests is NO-GO.
// Inspect lexical tokens, not raw text: comments or quoted examples containing
// require('node:test') must never turn a legacy script into a native test suite.
function sourceUsesNodeTest(source){
 const input=String(source||''),tokens=[];
 for(let i=0;i<input.length;){
  const ch=input[i],next=input[i+1];
  if(/\s/.test(ch)){i++;continue}
  if(ch==='/'&&next==='/'){
   i+=2;while(i<input.length&&input[i]!=='\n')i++;
   continue;
  }
  if(ch==='/'&&next==='*'){
   i+=2;while(i<input.length&&!(input[i]==='*'&&input[i+1]==='/'))i++;
   i=Math.min(input.length,i+2);continue;
  }
  if(ch==='\''||ch==='"'||ch==='`'){
   const quote=ch;let value='';i++;
   while(i<input.length){
    if(input[i]==='\\'){
     // Only unescaped plain package names count as module specifiers.
     i+=Math.min(2,input.length-i);value+='\\';continue;
    }
    if(input[i]===quote){i++;break}
    value+=input[i++];
   }
   tokens.push({type:quote==='`'?'template':'string',value});continue;
  }
  if(/[A-Za-z_$]/.test(ch)){
   let value='';while(i<input.length&&/[A-Za-z0-9_$]/.test(input[i]))value+=input[i++];
   tokens.push({type:'id',value});continue;
  }
  tokens.push({type:'punct',value:ch});i++;
 }
 const pkg=t=>t?.type==='string'&&(t.value==='node:test'||t.value==='test');
 for(let i=0;i<tokens.length;i++){
  const t=tokens[i];
  if(t.type!=='id')continue;
  if(t.value==='require'&&tokens[i+1]?.value==='('&&pkg(tokens[i+2])&&
   tokens[i+3]?.value===')')return true;
  if(t.value==='import'){
   if(pkg(tokens[i+1]))return true;
   if(tokens[i+1]?.value==='('&&pkg(tokens[i+2])&&tokens[i+3]?.value===')')return true;
   // Regular static imports are short token sequences; never scan into
   // another statement or across more than 64 import tokens.
   for(let j=i+1;j<Math.min(i+64,tokens.length);j++){
    if(tokens[j]?.value===';')break;
    if(tokens[j]?.value==='from'&&pkg(tokens[j+1]))return true;
   }
  }
 }
 return false;
}

function checkSuiteResult({status,signal=null,error=null,stdout='',nativeSuite=true}={}){
 const text=String(stdout||'').replace(/\r/g,'');
 const custom=(text.match(/^(?:# )?PASS /gm)||[]).length;
 const customFailures=(text.match(/^(?:# )?FAIL /gm)||[]).length;
 const find=label=>{
  const pattern=new RegExp('^# '+label+' (\\d+)$','gm');
  const matches=[...text.matchAll(pattern)];
  return matches.length?Number(matches.at(-1)[1]):null;
 };
 const native=find('tests'),pass=find('pass'),failed=find('fail');
 const skipped=find('skipped'),cancelled=find('cancelled'),todo=find('todo');
 // A partial suite is not a valid release gate: even one skipped, cancelled
 // or TODO case leaves an unverified behaviour. Reject contradictory TAP.
 const subtests=[...text.matchAll(/^# Subtest: (.+)$/gm)].map(m=>m[1].trim());
 // Node --test wraps a CJS file with zero registered tests in a successful
 // one-test TAP file subtest. Require at least one named native test instead.
 const registeredTests=subtests.some(name=>
  !/(?:^|[\\/])[^\\/]+\.(?:test|spec)\.[cm]?js$/.test(name));
 const summaryGood=native!==null&&native>0&&pass!==null&&pass>0&&
  failed===0&&pass===native&&[skipped,cancelled,todo].every(n=>n===null||n===0);
 const nativeGood=summaryGood&&registeredTests;
 // Node --test wraps a legacy script as one successful TAP case even
 // if the script ran zero financial assertions. Require explicit PASS
 // markers for legacy suites; use executed TAP pass count for node:test.
 const scenarios=nativeSuite?(nativeGood?pass:0):custom;
 const passed=status===0&&!signal&&!error&&scenarios>0&&
  customFailures===0&&!/^not ok \d+\b/m.test(text)&&
  (native===null||(nativeSuite?nativeGood:summaryGood));
 return{passed,reportedScenarios:scenarios,
  reason:passed?'ok':status!==0||signal||error?'process_failed':
   !scenarios?'no_executed_scenarios':'failed_assertion_reported'};
}
module.exports={checkSuiteResult,sourceUsesNodeTest};
