'use strict';
// Candidate CSV same-source row conflict contract; real source and fixtures only.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const source=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const begin=source.indexOf('function csvFingerprint('),end=source.indexOf('// Read-only review of a statement row',begin);
assert.ok(begin>=0&&end>begin,'CSV evidence helper missing');
const fn=new Function(source.slice(begin,end)+
 'return {csvFingerprint,csvAlreadyImportedSourceRow,csvConflictingSourceRows};')();
const row={id:'new1',source:'csv',importFileName:'transactions.csv',
 csvSourceRowIndex:4,accountId:'checking-la',date:'2026-10-20',
 type:'expense',name:'Courses',bankAmount:40};
test('reimport of identical physical row is idempotent',()=>{
 assert.equal(fn.csvAlreadyImportedSourceRow(row,[{...row,id:'old1'}]),true);
 assert.equal(fn.csvConflictingSourceRows(row,[{...row,id:'old1'}]).length,0);
});
test('same filename and source index with a different bank amount stops import',()=>{
 const old={...row,id:'old1',bankAmount:44};
 assert.equal(fn.csvAlreadyImportedSourceRow(row,[old]),false);
 assert.equal(fn.csvConflictingSourceRows(row,[old]).length,1);
});
test('different physical row in the same statement remains eligible',()=>{
 const old={...row,id:'old1',csvSourceRowIndex:5};
 assert.equal(fn.csvAlreadyImportedSourceRow(row,[old]),false);
 assert.equal(fn.csvConflictingSourceRows(row,[old]).length,0);
});
test('same CSV name in a separate bank account is not this account source',()=>{
 const old={...row,id:'old1',accountId:'checking-partner',bankAmount:44};
 assert.equal(fn.csvConflictingSourceRows(row,[old]).length,0);
});
test('historical import fingerprint keeps original identity after later confirmation edit',()=>{
 const old={...row,id:'old1',status:'confirmed',type:'transfer',
  bankAmount:55,importFingerprint:fn.csvFingerprint(row)};
 assert.equal(fn.csvAlreadyImportedSourceRow(row,[old]),true);
 assert.equal(fn.csvConflictingSourceRows(row,[old]).length,0);
});
test('reused default filename for a new month is flagged, not silently treated as a new source',()=>{
 const old={...row,id:'old1',date:'2026-09-20'};
 assert.equal(fn.csvAlreadyImportedSourceRow(row,[old]),false);
 assert.equal(fn.csvConflictingSourceRows(row,[old]).length,1);
});
test('preview and commit path both stop when same-source evidence conflicts',()=>{
 assert.match(source,/sourceConflicts=result\.all\.filter\(t=>csvConflictingSourceRows/);
 assert.match(source,/if\(\(!result\.all\.length&&!newInvalidEvidence\.length\)\|\|totalConflicts\)return/);
 assert.match(source,/newInvalidEvidence=invalidEvidence\.filter/);
 assert.match(source,/if\(result\.all\.some\(t=>csvConflictingSourceRows/);
 assert.match(source,/if\(csvConflictingSourceRows\(t,state\.transactions\)\.length\|\|/);
 assert.match(source,/csvConflictingUnparsedEvidence\(t,state\.smartImports\)/);
});
