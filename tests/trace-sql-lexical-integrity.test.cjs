'use strict';
// Lightweight fail-closed LEXICAL check only, never a PostgreSQL parser.
// Detects truncated SQL literals inside PL/pgSQL dollar-quoted bodies.
// Native: node --test tests/trace-sql-lexical-integrity.test.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {test}=require('node:test');
const root=path.join(__dirname,'..');
const files=[
 'migrations/07-trace-account-owner-write-guard.sql',
 'migrations/08-trace-personal-settings-owner-guard.sql',
 'migrations/09-trace-cas-versioned-writes.sql',
 'migrations/10-trace-deferred-write-quarantine.sql',
 'migrations/11-trace-csv-unparsed-owner-privacy.sql'
];
function inspect(text, label='candidate SQL'){
 let i=0,line=1,strings=0,bodies=0;
 const fail=msg=>{throw Error(label+': '+msg+' near line '+line);};
 const tick=v=>{for(const c of v)if(c==='\n')line++;};
 while(i<text.length){
  if(text.startsWith('--',i)){let j=text.indexOf('\n',i);if(j<0)j=text.length;tick(text.slice(i,j));i=j;continue;}
  if(text.startsWith('/*',i)){
   const j=text.indexOf('*/',i+2);if(j<0)fail('unclosed block comment');
   tick(text.slice(i,j+2));i=j+2;continue;
  }
  const c=text[i];
  if(c==="'" || c==='"'){
   const quote=c,startLine=line;
   let value='',closed=false;i++;
   while(i<text.length){
    if(text[i]===quote){
     if(text[i+1]===quote){value+=quote;i+=2;continue;}
     i++;closed=true;break;
    }
    if(text[i]==='\n')line++;value+=text[i++];
   }
   if(!closed)fail('unterminated SQL string or quoted identifier');
   // The strict CSV sourceIndex regex must fit on a single physical line.
   if(quote==="'"&&value.includes('[0-9]{1,6}')&&line!==startLine)
    fail('multiline CSV row-index regex: likely a truncated quote');
   if(quote==="'")strings++;
   continue;
  }
  if(c==='$'){
   const m=/^\$[A-Za-z_0-9]*\$/.exec(text.slice(i));
   if(m){
    const delimiter=m[0],next=text.indexOf(delimiter,i+delimiter.length);
    if(next<0)fail('unterminated dollar-quoted body '+delimiter);
    const body=text.slice(i+delimiter.length,next);
    inspect(body,label+' / '+delimiter+' body');bodies++;
    const segment=text.slice(i,next+delimiter.length);tick(segment);
    i=next+delimiter.length;continue;
   }
  }
  if(c==='\n')line++;
  i++;
 }
 return{strings,bodies};
}
const sql=fs.readFileSync(path.join(root,files[4]),'utf8');
test('all SQL candidate migrations 07-11 have closed strings, comments and dollar-quoted bodies',()=>{
 for(const name of files){const src=fs.readFileSync(path.join(root,name),'utf8');
  assert.ok(inspect(src,name));}
});
test('CSV source row regex is anchored and casts only after checking numeric syntax',()=>{
 const dollar=String.fromCharCode(36);
 assert.ok(sql.includes("[0-9]{1,6}"+dollar+"'"),'SQL row-index regex must close on its own line');
 assert.match(sql,/source_index_valid boolean := false/);
 assert.match(sql,/if coalesce\(new\.data->>'sourceIndex',''\) ~/);
 assert.match(sql,/source_index_valid := \(new\.data->>'sourceIndex'\)::integer between 2 and 1001/);
 assert.match(sql,/or not source_index_valid/);
});
test('lexical checker rejects regression where regex closing quote is eaten by JS replace',()=>{
 const proper="'^[0-9]{1,6}"+String.fromCharCode(36)+"'";
 const truncated="'^[0-9]{1,6}";
 const mutated=sql.replace(proper,()=>truncated);
 assert.notEqual(mutated,sql);
 assert.throws(()=>inspect(mutated,'regression'),/unterminated|multiline/i);
});
test('candidate policy, trigger and capability declarations occur exactly once',()=>{
 for(const needle of ['create policy trace_csv_unparsed_private_select',
   'create or replace function public.trace_guard_csv_unparsed_evidence()',
   'create trigger trace_csv_unparsed_evidence_guard',
   'create or replace function public.trace_csv_evidence_guard_ready()']){
  assert.equal(sql.split(needle).length-1,1,needle+' declaration must be singular');
 }
});

test('primary-account owner guard verifies a real active checking account belonging to caller',()=>{
 const sql=fs.readFileSync(path.join(root,'migrations/08-trace-personal-settings-owner-guard.sql'),'utf8');
 assert.match(sql,/field_name = 'primaryBankAccountByOwner'/);
 assert.match(sql,/entry_key = caller_slot/);
 assert.match(sql,/d\.collection = 'accounts'/);
 assert.match(sql,/d\.item_id = after_map->>entry_key/);
 assert.match(sql,/d\.data->>'owner' = caller_slot/);
 assert.match(sql,/d\.data->>'type' = 'checking'/);
 assert.match(sql,/coalesce\(d\.data->>'archived','false'\) = 'false'/);
 assert.match(sql,/TRACE_SETTINGS_FORBIDDEN: primary account must be an active checking account owned by caller/);
});

test('investment bank reference cannot use a checking account archived in the household',()=>{
 const sql=fs.readFileSync(path.join(root,'migrations/09-trace-cas-versioned-writes.sql'),'utf8');
 const newReference=sql.split("if nullif(p_data->>'bankAccountId','') is not null and not exists (")[1]?.split(') then')[0];
 assert.ok(newReference,'missing investment bank reference guard');
 assert.match(newReference,/bank\.data->>'owner' = actor_slot/);
 assert.match(newReference,/bank\.data->>'type' = 'checking'/);
 assert.match(newReference,/coalesce\(bank\.data->>'archived','false'\) = 'false'/,
  'A new investment bank leg must never be posted into an archived checking account');
 // Historical rows with a bank leg may be corrected or deleted after that
 // checking account was archived: original-owner checks must remain intact.
 assert.equal(sql.split("original_bank.data->>'owner' = actor_slot").length-1,2);
});
