'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'trace-password-recovery-1.0.0.js'),'utf8');
function fakeElement(){
 const listeners={};
 return {
  value:'',textContent:'',disabled:false,
  classList:{toggle(){},add(){},remove(){}},
  addEventListener(event,callback){listeners[event]=callback},
  async fire(event){return listeners[event]?.({preventDefault(){}})},
  querySelector(){return{disabled:false,textContent:''}}
 };
}
function fixture(urlHash=''){
 const ids=['cloudAuthPanel','cloudAuthTitle','cloudAuthMessage','cloudLoginForm',
 'cloudLoginEmail','cloudSignupForm','traceResetRequestForm',
 'traceResetConfirmForm','traceResetEmail','traceNewPassword',
 'traceConfirmNewPassword','traceForgotPassword'];
 const nodes=Object.fromEntries(ids.map(id=>[id,fakeElement()]));
 const backs=[fakeElement()],tabs=fakeElement(),gates=[],requests=[],updates=[],signouts=[];
 const location={href:'https://louisantoine78.github.io/Budget-duo/index.html'+urlHash,
  pathname:'/Budget-duo/index.html',hash:urlHash,search:''};
 const auth={auth:{
  async resetPasswordForEmail(email,options){requests.push({email,options});return{error:null}},
  async getSession(){return{data:{session:{access_token:'test-token'}},error:null}},
  async updateUser(value){updates.push(value);return{error:null}},
  async signOut(){signouts.push(true);return{error:null}}
 }};
 const window={},document={
  getElementById:id=>nodes[id]||null,
  querySelector:selector=>selector==='#cloudAuthPanel .cloud-tabs'?tabs:null,
  querySelectorAll:selector=>selector==='[data-recovery-back]'?backs:[]
 };
 const histories=[];
 const ctx={window,document,location,URL,URLSearchParams,
  history:{replaceState(...args){histories.push(args)}},console};
 vm.runInNewContext(source,ctx,{filename:'trace-password-recovery-1.0.0.js'});
 window.TracePasswordRecovery.setup(auth,mode=>gates.push(mode));
 return{window,nodes,backs,requests,updates,signouts,gates,histories};
}
test('forgot password requests a private email link to the existing TRACE installation URL',async()=>{
 const f=fixture();
 assert.equal(f.window.TracePasswordRecovery.holdWorkspace(),false);
 f.nodes.cloudLoginEmail.value='partner@example.test';
 await f.nodes.traceForgotPassword.fire('click');
 assert.equal(f.nodes.traceResetEmail.value,'partner@example.test');
 await f.nodes.traceResetRequestForm.fire('submit');
 assert.equal(f.requests.length,1);
 assert.equal(f.requests[0].email,'partner@example.test');
 assert.equal(f.requests[0].options.redirectTo,
  'https://louisantoine78.github.io/Budget-duo/index.html');
 assert.match(f.nodes.cloudAuthMessage.textContent,/Si cette adresse est associée/);
 assert.deepEqual(f.updates,[]);
});
test('recovery callback stops workspace bootstrap and accepts only matching passwords',async()=>{
 const f=fixture('#access_token=placeholder&type=recovery');
 assert.equal(f.window.TracePasswordRecovery.holdWorkspace(),true);
 assert.ok(f.gates.includes('cloudAuthPanel'));
 assert.equal(f.window.TracePasswordRecovery.onAuthEvent('PASSWORD_RECOVERY',{user:{id:'test'},access_token:'test-token'}),true);
 f.nodes.traceNewPassword.value='a-strong-new-password';
 f.nodes.traceConfirmNewPassword.value='not-the-same';
 await f.nodes.traceResetConfirmForm.fire('submit');
 assert.equal(f.updates.length,0);
 assert.match(f.nodes.cloudAuthMessage.textContent,/différents/);
 f.nodes.traceConfirmNewPassword.value='a-strong-new-password';
 await f.nodes.traceResetConfirmForm.fire('submit');
 assert.equal(f.updates.length,1);
 assert.equal(f.updates[0].password,'a-strong-new-password');
 assert.equal(f.signouts.length,1);
 assert.equal(f.window.TracePasswordRecovery.holdWorkspace(),false);
 assert.match(f.nodes.cloudAuthMessage.textContent,/Mot de passe modifié/);
 assert.equal(f.histories.length,1);
});
test('normal signup/login does not trigger password recovery',()=>{
 const f=fixture();
 assert.equal(f.window.TracePasswordRecovery.onAuthEvent('SIGNED_IN',{user:{id:'test'}}),false);
 assert.equal(f.window.TracePasswordRecovery.holdWorkspace(),false);
 assert.equal(f.requests.length,0);
 assert.equal(f.updates.length,0);
});
test('actual installed 2.0 page contains accessible recovery UI and loads helper before app',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 assert.match(html,/id="traceForgotPassword"/);
 assert.match(html,/id="traceResetRequestForm"/);
 assert.match(html,/id="traceResetConfirmForm"/);
 assert.ok(html.indexOf('src="trace-password-recovery-1.0.0.js"')<
  html.indexOf('src="v5-app-5.37.0.js?v=5.37.9"'));
 assert.match(app,/TracePasswordRecovery\?\.setup/);
 assert.match(app,/TracePasswordRecovery\?\.onAuthEvent/);
 assert.match(app,/TracePasswordRecovery\?\.holdWorkspace/);
 assert.ok(html.includes('content="'+JSON.parse(fs.readFileSync(path.join(root,'trace-version.json'),'utf8')).build+'"'));
});

test('a forged recovery URL cannot update a password without a Supabase recovery event',async()=>{
 const f=fixture('#type=recovery');
 f.nodes.traceNewPassword.value='a-long-new-password';
 f.nodes.traceConfirmNewPassword.value='a-long-new-password';
 await f.nodes.traceResetConfirmForm.fire('submit');
 assert.equal(f.updates.length,0);
 assert.match(f.nodes.cloudAuthMessage.textContent,/lien de réinitialisation valide/);
});
