'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const src=read('v5-app-5.37.0.js'),html=read('trace-international-preview.html'),
 css=read('trace-international-1.0.0.css');
const begin=src.indexOf('/* TRACE 5.37 — native Activity/Partage.'),
 end=src.indexOf('\nfunction showTab(t){',begin);
assert.ok(begin>=0&&end>begin,'Partage must be present in candidate source');
function setup({solo=false,unassigned=false}={}){
 const state={household:{workspaceMembers:solo?['la']:['la','partner'],
  referenceDate:'2026-10-01',sharingOpeningBalance:25},transactions:[]};
 const nodes=new Map(),actions={navigation:[],tabs:[],settlements:0,opening:0,coupleSetup:0,manual:[],writes:0};
 const $=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',onclick:null,
  classList:{toggle(){}},value:''});return nodes.get(s)};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
 const group={owner:'la',name:'Camille',advancedCAD:100,receivedCAD:45,
  outstandingCAD:55,unassigned:false,unattributedCAD:0,
  advances:[
   {expenseId:'a',label:'Restaurant',date:'2026-10-13',
    advancedCAD:75,receivedCAD:45,outstandingCAD:30},
   {expenseId:'b',label:'Billets',date:'2026-10-18',
    advancedCAD:25,receivedCAD:0,outstandingCAD:25}
  ]};
 const unknown={owner:'la',name:'À attribuer',unassigned:true,advancedCAD:10,
  receivedCAD:0,outstandingCAD:10,unattributedCAD:0,
  advances:[{expenseId:'c',label:'Ancienne avance',date:'2026-10-19',
   advancedCAD:10,receivedCAD:0,outstandingCAD:10}]};
 const deps={state,$,esc,shortMemberName:id=>id==='la'?'Moi':'Partenaire',
  window:{TraceMovement:{friendReceivables:(transactions,owner)=>owner==='la'?
   (unassigned?[group,unknown]:[group]):[]},
   TraceInternational:{money:(v,c)=>Number(v).toFixed(2)+' '+c}},
  coupleBalance:()=>45,sharingHistory:()=>[
   {t:{id:'s1',name:'Dépense partagée',date:'2026-10-09',type:'expense'},delta:70},
   {t:{id:'r1',name:'Règlement',date:'2026-10-15',type:'transfer'},delta:-25}
  ],
  openSettlement:()=>{actions.settlements++},
  editTricountOpening:()=>{actions.opening++},
  openCoupleSettings:()=>{actions.coupleSetup++},
  openManualTransaction:type=>actions.manual.push(type),
  navigate:page=>actions.navigation.push(page),
  showTab:tab=>actions.tabs.push(tab)
 };
 const fn=new Function(...Object.keys(deps),src.slice(begin,end)+
  '\nreturn {openActivitySharing,renderActivitySharing};');
 return{...fn(...Object.values(deps)),$,actions,state};
}
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}
test('Partage lives in Activity, not a sixth bottom navigation tab',()=>{
 assert.match(html,/data-tab="sharing">Partage/);
 assert.match(html,/id="activitySharing"/);
 const nav=html.slice(html.indexOf('<nav class="nav"'),html.indexOf('</nav>'));
 assert.doesNotMatch(nav,/data-nav="sharing"/);
});
test('Couple precedes Proches, preserving separate debts',()=>{
 const f=setup();f.renderActivitySharing();
 const value=f.$('#activitySharing').innerHTML;
 assert.ok(value.indexOf('>Couple</h2>')<value.indexOf('>Proches</h2>'));
 assert.match(value,/Partenaire doit 45\.00 CAD à Moi/);
 assert.match(value,/65\.00 CAD|55\.00 CAD/);
 assert.match(value,/Remboursement ne crée ni nouveau revenu|remboursement ne crée ni nouveau revenu/);
});
test('two friends advances preserve partial repayment and outstanding amounts',()=>{
 const f=setup();f.renderActivitySharing();const html=f.$('#activitySharing').innerHTML;
 assert.match(html,/Camille/);
 assert.match(html,/Restaurant/);assert.match(html,/Billets/);
 assert.match(html,/Remboursé 45\.00 CAD/);
 assert.match(html,/Reste 30\.00 CAD/);
 assert.match(html,/Reste 25\.00 CAD/);
});
test('older unassigned friend entries remain explicitly unattributed',()=>{
 const f=setup({unassigned:true});f.renderActivitySharing();
 const value=f.$('#activitySharing').innerHTML;
 assert.match(value,/data-unassigned="true"/);
 assert.match(value,/À attribuer/);
 assert.match(value,/65\.00 CAD/);
});
test('couple settlement button calls existing editor, not a second ledger',()=>{
 const f=setup();f.renderActivitySharing();
 f.$('#traceShareSettle').onclick();
 f.$('#traceShareOpening').onclick();
 assert.equal(f.actions.settlements,1);assert.equal(f.actions.opening,1);
 assert.deepEqual(f.actions.manual,[]);
});
test('friend reimbursement and advance reuse manual operation kinds',()=>{
 const f=setup();f.renderActivitySharing();
 f.$('#traceShareFriendRepay').onclick();
 f.$('#traceShareFriendAdvance').onclick();
 assert.deepEqual(f.actions.manual,['friend_reimbursement','expense']);
});
test('solo member shows invite, without false couple debt',()=>{
 const f=setup({solo:true});f.renderActivitySharing();
 const value=f.$('#activitySharing').innerHTML;
 assert.match(value,/Inviter votre partenaire/);
 assert.doesNotMatch(value,/Partenaire doit/);
 assert.doesNotMatch(value,/id="traceShareSettle"/);
});
test('Accueil shortcut opens Activity Partage for established couple',()=>{
 const f=setup();f.openActivitySharing();
 assert.deepEqual(f.actions.navigation,['activity']);
 assert.deepEqual(f.actions.tabs,['sharing']);
});
test('Accueil shortcut opens invite workflow when couple not established',()=>{
 const f=setup({solo:true});f.openActivitySharing();
 assert.equal(f.actions.coupleSetup,1);
 assert.deepEqual(f.actions.navigation,[]);
});
test('no account, transaction or household mutation by rendering',()=>{
 const f=setup({unassigned:true});const original=JSON.stringify(f.state);
 f.renderActivitySharing();
 assert.equal(JSON.stringify(f.state),original);
});
test('entry forms are preselected only for explicit string kind',()=>{
 assert.match(src,/function openManualTransaction\(preferredKind='expense'\)/);
 assert.match(src,/choose\(typeof preferredKind==='string'&&M\.get\(preferredKind\)\?preferredKind:'expense'\)/);
});
test('tab control retains old review links and hides irrelevant period',()=>{
 assert.match(src,/if\(t==='review'\)t='import'/);
 assert.match(src,/\['transactions','import','sharing'\]\.includes\(t\)/);
 assert.match(src,/period\.classList\.toggle\('hidden',tab==='sharing'\)/);
});
test('CSP, legacy imports and deferred guard remain unchanged',()=>{
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/id="importPendingTransactions"/);
 assert.match(html,/trace-international-preview-fixtures-1\.0\.0\.js/);
 assert.match(src,/<option value="deferred" disabled>/);
});
test('premium styling respects mobile, readable couple and friends cards',()=>{
 assert.match(css,/\.trace-share-hero/);
 assert.match(css,/\.trace-share-friend/);
 assert.match(css,/@media\(max-width:375px\)/);
});
console.log(n+' activity sharing integration scenarios passed');
