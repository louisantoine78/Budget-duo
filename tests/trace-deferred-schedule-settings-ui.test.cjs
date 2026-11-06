'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const engine=fs.readFileSync(path.join(__dirname,'..','trace-deferred-debit-1.0.0.js'),'utf8');
const from=app.indexOf('function openBankMetadata('),to=app.indexOf('function confirmBankArchive(',from);
assert.ok(from>0&&to>from);
const section=app.slice(from,to);
const card={id:'visa-fr',owner:'la',type:'card',paymentMode:'deferred',
 name:'Visa France',country:'FR',currency:'EUR',settlementAccountId:'bank-fr'};
const bank={id:'bank-fr',owner:'la',type:'checking',name:'Compte FR',country:'FR',currency:'EUR'};
function scenario(overrides={}){
 const window={};if(!overrides.noEngine)vm.runInNewContext(engine,{window});
 const state={accounts:[bank,{...card,...overrides.card}],transactions:[],reconciliations:[],
  investmentOperations:[],household:{accountOpeningBalances:{}}};
 const before=JSON.stringify(state);
 const els={};
 const $=id=>els[id]||(els[id]={value:'',textContent:'',innerHTML:'',disabled:false,onclick:null});
 const I={country:a=>a.country,currency:a=>a.currency,currencies:()=>['CAD','EUR'],
  exactMoney:x=>x===undefined||x===null?null:Number(x)};
 let sheet='',detailCalls=0;
 const fn=new Function('state','window','me','accountType','esc','$','openSheet',
  'visibleBankAccounts','shortAccountLabel','openAccountSettings',
  'openTraceAccountDetail','confirmBankArchive','saveDocument','renderAll',
  'localDateISO',section+'return openBankMetadata;');
 const open=fn(state,window,'la',a=>a.type,s=>String(s),
  $,(_title,html)=>{sheet=html},
  ()=>state.accounts,a=>a.name,()=>{},()=>{detailCalls++},()=>{},async()=>{},()=>{},
  ()=>overrides.today||'2026-10-26');
 // TraceInternational only needed when open actually runs.
 window.TraceInternational=I;
 open('visa-fr');
 return{$,state,html:sheet,unchanged:()=>JSON.stringify(state)===before,
  select:(id,value)=>{$(id).value=value},
  detailCalls:()=>detailCalls,chooseCalendar:()=>$('#traceBankMetaSchedulePreview').onclick(),
  propose:()=>$('#traceBankMetaRevisionRun').onclick()};
}
test('French deferred card settings show effective-dated read-only planner',()=>{
 const s=scenario();
 assert.match(s.html,/traceBankMetaRevisionDebit/);
 assert.match(s.html,/traceBankMetaRevisionClosing/);
 assert.match(s.html,/traceBankMetaRevisionEffective/);
 assert.match(s.html,/sans enregistrer/);
 assert.doesNotMatch(s.html,/traceBankMetaRevisionSave/);
});
test('first valid version previews future date without editing card or transactions',()=>{
 const s=scenario();
 s.select('#traceBankMetaRevisionDebit','28');
 s.select('#traceBankMetaRevisionClosing','20');
 s.select('#traceBankMetaRevisionEffective','2026-11-01');
 s.propose();
 assert.match(s.$('#traceBankMetaRevisionResult').textContent,/prise d’effet le 2026-11-01/);
 assert.equal(s.unchanged(),true);
});
test('unversioned previous card settings fail closed rather than invent effective date',()=>{
 const s=scenario({card:{deferredDebitDay:5,deferredClosingDay:20}});
 s.select('#traceBankMetaRevisionDebit','28');
 s.select('#traceBankMetaRevisionClosing','20');
 s.select('#traceBankMetaRevisionEffective','2026-11-21');
 s.propose();
 assert.match(s.$('#traceBankMetaRevisionResult').textContent,/Ancien calendrier sans prise d’effet/);
 assert.equal(s.unchanged(),true);
});
test('misdated effective date cannot create an unsafe plan',()=>{
 const s=scenario();
 s.select('#traceBankMetaRevisionDebit','28');
 s.select('#traceBankMetaRevisionClosing','20');
 s.select('#traceBankMetaRevisionEffective','2026-10-26');
 s.propose();
 assert.match(s.$('#traceBankMetaRevisionResult').textContent,/date future/);
 assert.equal(s.unchanged(),true);
});
test('missing simulation module reports unavailable instead of fabricated date',()=>{
 const s=scenario({noEngine:true});
 s.select('#traceBankMetaRevisionDebit','28');
 s.select('#traceBankMetaRevisionEffective','2026-11-01');
 s.propose();
 assert.match(s.$('#traceBankMetaRevisionResult').textContent,/indisponible/);
 assert.equal(s.unchanged(),true);
});
test('non-French deferred card never exposes French schedule editor',()=>{
 const s=scenario({card:{country:'CA',currency:'CAD'}});
 assert.doesNotMatch(s.html,/traceBankMetaRevisionRun/);
 assert.equal(s.unchanged(),true);
});

test('unlinked or nonowned checking does not permit a calendar proposal',()=>{
 const s=scenario({card:{settlementAccountId:'foreign-bank'}});
 s.select('#traceBankMetaRevisionDebit','28');
 s.select('#traceBankMetaRevisionEffective','2026-11-01');
 s.propose();
 assert.match(s.$('#traceBankMetaRevisionResult').textContent,/Compte courant français EUR/);
 assert.equal(s.unchanged(),true);
});

test('calendar preview illustrates cutoff and actual month-clamped planned debit',()=>{
 const s=scenario();
 s.select('#traceBankMetaRevisionDebit','31');
 s.select('#traceBankMetaRevisionClosing','20');
 s.select('#traceBankMetaRevisionEffective','2027-02-21');
 s.propose();
 assert.match(s.$('#traceBankMetaRevisionResult').textContent,/clôture le 2027-03-20/);
 assert.match(s.$('#traceBankMetaRevisionResult').textContent,/prélèvement théorique le 2027-03-31/);
 assert.equal(s.unchanged(),true);
});
test('calendar without closing date shows next possible debit without assigning a due date',()=>{
 const s=scenario();
 s.select('#traceBankMetaRevisionDebit','28');
 s.select('#traceBankMetaRevisionClosing','');
 s.select('#traceBankMetaRevisionEffective','2026-11-01');
 s.propose();
 const text=s.$('#traceBankMetaRevisionResult').textContent;
 assert.match(text,/prochain prélèvement indicatif le 2026-11-28/);
 assert.match(text,/aucune échéance ne peut être attribuée/);
 assert.doesNotMatch(text,/prélèvement théorique le/);
 assert.equal(s.unchanged(),true);
});

test('calendar shortcut focuses the real French simulator instead of navigating away',()=>{
 const s=scenario(),field=s.$('#traceBankMetaRevisionDebit');
 let focus=0,scrolled=0;
 field.focus=()=>focus++;
 field.scrollIntoView=opts=>{assert.equal(opts.block,'center');scrolled++};
 s.chooseCalendar();
 assert.equal(focus,1);assert.equal(scrolled,1);assert.equal(s.detailCalls(),0);
 assert.equal(s.unchanged(),true);
});
test('unavailable calendar form never attempts a phantom focus or hidden write',()=>{
 const s=scenario({card:{country:'CA',currency:'CAD'}});
 s.chooseCalendar();
 assert.equal(s.detailCalls(),1);
 assert.equal(s.unchanged(),true);
});
