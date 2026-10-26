'use strict';
// Check the exact read-only predicates embedded in TRACE's ESM preflight.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','scripts/trace-release-preflight.mjs'),'utf8');
const start=code.indexOf('function traceQualificationHeadMatches('),
 end=code.indexOf('const root=',start);
assert.ok(start>=0&&end>start,'Preflight predicates must remain present');
const x=new Function(code.slice(start,end)+
 'return {head:traceQualificationHeadMatches,native:traceQualifiedNativeEvidence,'+
 'postgres:traceQualifiedPostgresEvidence};')();
const old='94c613cd4e1c547a38671083c1da773967bded70',
 now='5b814d28b838d3b837d5329b7ee642db2d4aee86';
const native={passed:true,summary:{syntaxFiles:46,testFiles:54,reportedScenarios:911,failedFiles:0}};
const pg={testsPassed:true,hostedSupabase:false,checks:[{passed:true}],findings:[]};
test('stale reviewed HEAD never certifies newer changes',()=>{
 assert.equal(x.head(now,old),false);assert.equal(x.head(old,old),true);
});
test('head check fails for missing and abbreviated SHA',()=>{
 for(const v of [null,undefined,'',old.slice(0,8),'HEAD'])assert.equal(x.head(now,v),false);
});
test('positive native scenario and syntax counts are required',()=>{
 assert.equal(x.native(native),true);
 for(const v of [{testFiles:0},{syntaxFiles:0},{reportedScenarios:0},{failedFiles:1}])
  assert.equal(x.native({...native,summary:{...native.summary,...v}}),false);
});
test('missing native summary or nonnumeric counts cannot qualify',()=>{
 assert.equal(x.native(null),false);
 assert.equal(x.native({passed:true}),false);
 assert.equal(x.native({...native,summary:{...native.summary,testFiles:'54'}}),false);
});
test('fictional PG report with real checks and no findings may qualify automation only',()=>{
 assert.equal(x.postgres(pg),true);
});
test('historical 17 passed SQL checks with personal-settings and stale-write findings are NO-GO',()=>{
 const oldReport={...pg,checks:Array.from({length:17},()=>({passed:true})),
  findings:[{id:'RLS-PARTNER-WRITE',severity:'corrected-in-local-candidate-only'},
   {id:'RLS-PERSONAL-SETTINGS',severity:'release-blocker'},
   {id:'STALE-WRITE',severity:'release-blocker'}]};
 assert.equal(x.postgres(oldReport),false);
});
test('no report findings section or zero executed PG checks is NO-GO',()=>{
 assert.equal(x.postgres({...pg,findings:undefined}),false);
 assert.equal(x.postgres({...pg,checks:[]}),false);
 assert.equal(x.postgres({...pg,checks:[{passed:false}]}),false);
});
test('hosted Supabase and failed SQL suites never qualify',()=>{
 assert.equal(x.postgres({...pg,hostedSupabase:true}),false);
 assert.equal(x.postgres({...pg,testsPassed:false}),false);
 assert.equal(x.postgres(null),false);
});
