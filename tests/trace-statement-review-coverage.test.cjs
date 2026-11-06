'use strict';
/* Candidate monthly PDF UI regression: NEVER hide unparsed or proposed bank lines. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','trace-statement-monthly-ui-1.0.0.js'),'utf8');
const start=code.indexOf('function renderExtraction(){');
const end=code.indexOf('function adoptSuggestions(){',start);
assert.ok(start>=0&&end>start,'renderExtraction must remain present');
const src=code.slice(start,end);
function renderWith({proposals=[],unparsed=[],status='review_required'}={}){
 let html='',used=false;const button={onclick:null},node={set innerHTML(s){html=s;},get innerHTML(){return html;}};
 const deps={extractionNode:node,extraction:{status,pages:2,proposals,unparsed,reason:'Unsupported'},
  esc:s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),
  selectedAccount:()=>({currency:'CAD'}),money:(v,c)=>v+' '+c,
  el:()=>button,host:{},adoptSuggestions:()=>{used=true;}};
 new Function(...Object.keys(deps),src+';renderExtraction();')(...Object.values(deps));
 return{html,button,used:()=>used};
}
test('all 80 proposed lines must be visible before voluntary adoption',()=>{
 const proposals=Array.from({length:80},(_,i)=>({page:2,line:i+1,date:'2026-10-15',
  name:'PROPOSAL_'+(i+1),direction:'out',amount:i+0.5}));
 const r=renderWith({proposals});
 assert.match(r.html,/PROPOSAL_1\b/);assert.match(r.html,/PROPOSAL_80\b/);
 assert.match(r.html,/Aucune ligne n’est approuvée/);
 assert.equal(r.used(),false);assert.equal(typeof r.button.onclick,'function');
});
test('all 60 unparsed bank lines can be reviewed, not just 40',()=>{
 const unparsed=Array.from({length:60},(_,i)=>({page:1,line:i+1,rawText:'RAW_'+(i+1)}));
 const r=renderWith({unparsed});
 assert.match(r.html,/RAW_1\b/);assert.match(r.html,/RAW_60\b/);
 assert.match(r.html,/toutes les lignes non interprétées · 60/);
});
test('unexpected text is escaped as HTML in noninterpreted lines',()=>{
 const r=renderWith({unparsed:[{page:1,line:1,rawText:'<img src=x>'}]});
 assert.doesNotMatch(r.html,/<img/);assert.match(r.html,/&lt;img/);
});
test('unsupported PDFs remain manual fallback, never adopted',()=>{
 const r=renderWith({status:'unsupported'});
 assert.match(r.html,/Extraction non disponible/);assert.match(r.html,/vérification manuelles/);
 assert.equal(r.button.onclick,null);
});
test('no silent preview truncation remains in the review function',()=>{
 assert.doesNotMatch(src,/\.slice\(0,\s*(?:25|40)\)/);
});
