'use strict';
// CSV parser tests use the real 5.37.0 code, exclusively fictional statements.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const start=app.indexOf('function normalizedCsvKey('),end=app.indexOf('\nfunction importFile(',start);
assert.ok(start>=0&&end>start,'CSV functions absent');
const {parseCsv,parseCsvMoney,parseCsvDate,inferCsvSep,csvFingerprint,csvImportedDuplicate}=
 new Function(app.slice(start,end)+'\nreturn {parseCsv,parseCsvMoney,parseCsvDate,inferCsvSep,csvFingerprint,csvImportedDuplicate};')();
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
test('French debit and credit columns are parsed with semicolon',()=>{
 const text='Date;Libellé;Débit;Crédit\n12/10/2026;"PRLV SEPA ASSURANCE";"42,50";\n13/10/2026;"VIR SEPA RECU";;"1 234,56"\n';
 assert.equal(inferCsvSep(text.split('\n')[0]),';');
 const rows=parseCsv(text,';');assert.equal(rows.length,3);
 assert.equal(rows[1][1],'PRLV SEPA ASSURANCE');
 assert.equal(parseCsvMoney(rows[1][2]),42.5);
 assert.equal(parseCsvMoney(rows[2][3]),1234.56);
 assert.equal(parseCsvDate(rows[1][0],'dmy'),'2026-10-12');
});
test('quoted merchant names with semicolons remain one cell',()=>{
 const rows=parseCsv('Date;Libellé;Débit\n14/10/2026;"Train; billet A/R";"54,80"',';');
 assert.equal(rows[1][1],'Train; billet A/R');
});
test('different separators, currency symbols, spaces and sign notations',()=>{
 assert.equal(parseCsvMoney('1\u202f234,56 €'),1234.56);
 assert.equal(parseCsvMoney('(1 234,56 EUR)'),-1234.56);
 assert.equal(parseCsvMoney('-46,20'),-46.2);
 assert.equal(parseCsvMoney('1,234.56 USD'),1234.56);
 assert.equal(parseCsvMoney('46.20 CAD'),46.2);
});
test('invalid French dates never roll forward to another month',()=>{
 assert.equal(parseCsvDate('31/02/2026','dmy'),null);
 assert.equal(parseCsvDate('29/02/2026','dmy'),null);
 assert.equal(parseCsvDate('29/02/2028','dmy'),'2028-02-29');
 assert.equal(parseCsvDate('12/31/2026','mdy'),'2026-12-31');
});
test('duplicate matches use bank-native amount and bank account',()=>{
 const original={date:'2026-10-15',type:'expense',name:'CAFÉ DU COIN',accountId:'fr',
  bankAmount:46.2,amountCAD:73.92};
 const duplicate={...original,amountCAD:null};
 assert.equal(csvImportedDuplicate(duplicate,[original]),true);
 const distinct={...duplicate,bankAmount:50};
 assert.equal(csvImportedDuplicate(distinct,[original]),false);
 const anotherBank={...duplicate,accountId:'ca'};
 assert.equal(csvImportedDuplicate(anotherBank,[original]),false);
});
test('incomplete foreign CSV stays pending, never assigns phantom zero-CAD split',()=>{
 const marker="...(ccy==='CAD'?traceSplit(me,amount):{})";
 assert.ok(app.includes(marker));
 assert.ok(app.includes("amountCAD:ccy==='CAD'?amount:null"));
});
console.log(count+' French/international CSV scenarios passed');
