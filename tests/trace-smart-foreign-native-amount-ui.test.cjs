'use strict';
// Source-backed fictional UI currency and budget-preview checks; no network.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ui=fs.readFileSync(path.join(__dirname,'..','trace-smart-inbox-3.5.0.js'),'utf8');
const fx=fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8');
const guide=fs.readFileSync(path.join(__dirname,'..','trace-import-guide-1.2.1.js'),'utf8');
const movement=fs.readFileSync(path.join(__dirname,'..','trace-movement-5.36.0.js'),'utf8');
const window={};new Function('window',fx)(window);new Function('window',guide)(window);
new Function('window',movement)(window);
function extract(from,to){
 const i=ui.indexOf('function '+from+'('),j=ui.indexOf('function '+to+'(',i);
 assert.ok(i>=0&&j>i);return ui.slice(i,j);
}
function card(currency,value,hasDate){
 const bank={id:'bank',name:'Fictional Bank',type:'checking',owner:'la',currency},
  d={id:'draft',date:hasDate?'2026-10-12':'',name:'Librairie',amount:value,
   status:'pending',needsAmountReview:false};
 const row=new Function('esc','money','window',extract('rowForm','applyApprovalConstraints')+
  'return rowForm;')(x=>String(x),n=>n+' CAD',window);
 // Unknown-date mode renders the same native amount without requiring a full DOM.
 return row(d,bank,[bank],false);
}
test('EUR bank screenshot displays native euro value instead of CAD',()=>{
 const html=card('EUR',40);
 assert.match(html,/40,00/);assert.match(html,/€/);assert.doesNotMatch(html,/40 CAD/);
});
test('USD screenshot displays its native dollar denomination',()=>{
 const html=card('USD',50);
 assert.match(html,/50\.00/);assert.match(html,/\$/);assert.doesNotMatch(html,/50 CAD/);
});
test('legacy CAD bank screenshot preserves existing Canadian formatting',()=>{
 assert.match(card('CAD',40),/40 CAD/);
});
test('unknown foreign OCR amount is left unknown, not shown as zero CAD',()=>{
 const html=card('EUR',null);
 assert.match(html,/À vérifier/);assert.doesNotMatch(html,/0 CAD/);
});
test('amounts suggested by OCR remain in native bank currency',()=>{
 const bank={id:'bank',name:'French Bank',currency:'EUR',type:'checking'};
 const d={id:'draft',name:'Librairie',amount:null,suggestedAmount:40,
  needsAmountReview:true};
 const row=new Function('esc','money','window',extract('rowForm','applyApprovalConstraints')+
  'return rowForm;')(x=>String(x),n=>n+' CAD',window);
 const html=row(d,bank,[bank],false);
 assert.match(html,/OCR : 40,00/);assert.match(html,/€/);assert.doesNotMatch(html,/40 CAD/);
});
test('international budget preview never uses an invented native-as-CAD amount',()=>{
 const code=extract('synchronizeRow','openSmartCategoryCreator');
 assert.match(code,/foreignCurrency!=='CAD'/);
 assert.match(code,/Contre-valeur CAD calculée uniquement au taux historique daté/);
 assert.match(code,/Aucun impact budgétaire enregistré à ce stade/);
});
test('CAD budget preview continues to use existing movementPreview',()=>{
 const code=extract('synchronizeRow','openSmartCategoryCreator');
 assert.match(code,/def\?bridge\(\)\.movementPreview\(type,Number/);
});
