'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('v5-app-5.37.0.js'),html=read('trace-international-preview.html');
test('three Activity tab buttons label separate panels',()=>{
 for(const [key,id,panel,active] of [
  ['transactions','Transactions','activityTransactions',true],
  ['review','Review','activityReview',false],
  ['sharing','Sharing','activitySharing',false]]){
  const tag=html.match(new RegExp('<button[^>]*id="activityTab'+id+'"[^>]*>'));
  assert.ok(tag,'Missing '+key+' button');
  assert.match(tag[0],new RegExp('data-tab="'+key+'"'));
  assert.match(tag[0],new RegExp('aria-controls="'+panel+'"'));
  assert.match(tag[0],new RegExp('tabindex="'+(active?'0':'-1')+'"'));
  assert.match(html,new RegExp('id="'+panel+'"[^>]*aria-labelledby="activityTab'+id+'"'));
 }
});
function mountedKeyboard(){
 const begin=app.indexOf('function activityTabKey(event,button){');
 const end=app.indexOf('\nfunction showTab(t){',begin);
 assert.ok(begin>=0&&end>begin);
 const selected=[],focused=[];
 const buttons=['transactions','review','sharing'].map(tab=>({
  dataset:{tab},focus:()=>focused.push(tab)
 }));
 const f=new Function('$','$$','showTab',app.slice(begin,end)+';return activityTabKey;')(
  ()=>buttons[0],()=>buttons,t=>selected.push(t));
 return{f,buttons,selected,focused};
}
test('keyboard arrows wrap, Home and End land on the correct tab',()=>{
 const x=mountedKeyboard();
 for(const [key,from,target] of [
  ['ArrowRight',2,'transactions'],['ArrowLeft',0,'sharing'],
  ['ArrowDown',0,'review'],['ArrowUp',0,'sharing'],
  ['Home',2,'transactions'],['End',1,'sharing']]){
  let count=0;x.f({key,preventDefault:()=>count++},x.buttons[from]);
  assert.equal(count,1);assert.equal(x.selected.at(-1),target);
  assert.equal(x.focused.at(-1),target);
 }
});
test('other keys do not hijack normal text navigation',()=>{
 const x=mountedKeyboard();
 for(const key of ['Tab','Enter','Escape','x']){
  x.f({key,preventDefault:()=>assert.fail('Unexpected preventDefault')},x.buttons[0]);
 }
 assert.equal(x.selected.length,0);assert.equal(x.focused.length,0);
});
test('switching tab updates aria selection and roving tabindex',()=>{
 const start=app.indexOf('function showTab(t){'),end=app.indexOf('\n}\n',start)+2;
 assert.ok(start>0&&end>start);
 const ids=['activityTransactions','activityReview','activityImport','activitySharing','activityPeriodControl','activityMonthLabel','activityTabs','activityPageTitle'];
 const nodes=Object.fromEntries(ids.map(s=>['#'+s,{textContent:'',classList:{toggle(){}}}]));
 const buttons=['transactions','review','sharing'].map(key=>({
  dataset:{tab:key},attrs:{},classList:{toggle(){}},setAttribute(n,v){this.attrs[n]=v;}
 }));
 const x=new Function('$','$$','monthLabel','renderActivitySharing','activityMonth',
  'let tab="transactions";'+app.slice(start,end)+';return showTab;')(
  key=>nodes[key],()=>buttons,()=> 'octobre 2026',()=>{},'2026-10');
 x('review');
 assert.deepEqual(buttons.map(b=>b.attrs['aria-selected']),['false','true','false']);
 assert.deepEqual(buttons.map(b=>b.attrs.tabindex),['-1','0','-1']);
});
test('event binding and progressive review focus are implemented',()=>{
 assert.match(app,/b\.onkeydown=e=>activityTabKey\(e,b\)/);
 assert.match(app,/legacy\.querySelectorAll\('\[data-import-pending\]'\)\[previous\]\?\.focus\?\.\(\)/);
});

test('tab binding uses the multi-element query and cannot crash lab bootstrap',()=>{
 const bind=app.slice(app.indexOf('function bind(){'),app.indexOf('function bootTrace('));
 assert.match(bind,/\$\$\('#activityTabs \.tab'\)\.forEach\(b=>\{/);
 assert.doesNotMatch(bind,/(^|[^\$])\$\('#activityTabs \.tab'\)\.forEach/);
});

test('keyboard list must use $$ instead of single-element $',()=>{
 const x=mountedKeyboard();
 let count=0;
 x.f({key:'ArrowRight',preventDefault:()=>count++},x.buttons[0]);
 assert.equal(count,1);
 assert.deepEqual(x.selected,['review']);
 assert.deepEqual(x.focused,['review']);
 const body=app.slice(app.indexOf('function activityTabKey(event,button){'),app.indexOf('function showTab(t){'));
 assert.match(body,/const nodes=\$\$\('#activityTabs \.tab'\)/);
 assert.doesNotMatch(body,/const nodes=\$\('#activityTabs \.tab'\)/);
});
