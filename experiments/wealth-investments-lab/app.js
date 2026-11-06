/* TRACE Patrimoine Investments lab controller. Memory-only; never loads Supabase. */
(()=>{'use strict';
const E=window.TraceWealthLabEngine,U=window.TraceWealthLabUI;
if(!E||!U)throw Error('Laboratoire Investissements incomplet.');
const $=id=>document.getElementById(id);
let model=E.demo(),route='overview',portfolioId='pea-demo',securityId='',range='all',serial=0,notice='';
const current=()=>model.portfolios.find(p=>p.id===portfolioId);
const catalog=id=>current().catalog.find(s=>s.id===id);
const date=()=>new Date().toISOString().slice(0,10);
const get=(fd,key)=>String(fd.get(key)||'').trim();
const field=(name,label,value='',type='text',extra='')=>
 '<label><span class="wl-label">'+U.e(label)+'</span><input class="wl-field" name="'+name+'" type="'+type+'" value="'+U.e(value)+'" '+extra+'></label>';
const select=(name,label,items,selected='')=>
 '<label><span class="wl-label">'+U.e(label)+'</span><select class="wl-field" name="'+name+'">'+
 items.map(([id,text])=>'<option value="'+U.e(id)+'" '+(String(id)===String(selected)?'selected':'')+'>'+U.e(text)+'</option>').join('')+'</select></label>';
const paired=(a,b)=>'<div class="wl-form-two">'+a+b+'</div>';
const note=s=>'<p class="wl-help">'+s+'</p>';
const moneyInput=n=>n===null||n===undefined?'':String(n/100);
const priceInput=n=>n===null||n===undefined?'':String(n/10000);
const qtyInput=n=>n===null||n===undefined?'':String(n/1000000);
function replacePortfolio(p){E.evaluate(p);model.portfolios=model.portfolios.map(x=>x.id===p.id?p:x);}
function breadcrumb(){
 if(route==='overview')return '<button data-act="home">Patrimoine</button><span>/</span><b>Investissements</b>';
 const p=current();const base='<button data-act="home">Patrimoine</button><span>/</span><button data-act="home">Investissements</button><span>/</span>';
 if(route==='portfolio')return base+'<b>'+U.e(p.name)+'</b>';
 const sub='<button data-act="portfolio" data-id="'+U.e(p.id)+'">'+U.e(p.name)+'</button><span>/</span>';
 return base+sub+'<b>'+(route==='position'?U.e(catalog(securityId)?.name||'Position'):'Analyse')+'</b>';
}
function render(){
 $('wl-crumb').innerHTML=breadcrumb();
 const p=current();
 $('wl-main').innerHTML=route==='overview'?U.overview(model):
  route==='portfolio'?U.portfolio(p):route==='position'?U.position(p,securityId):U.analytics(p,range);
 if(notice){const div=document.createElement('div');div.className='wl-warning';div.textContent=notice;$('wl-main').prepend(div);notice='';}
}
function go(next,id=''){
 if(id&&model.portfolios.some(p=>p.id===id))portfolioId=id;
 route=next;render();window.scrollTo({top:0,behavior:'auto'});
}
function sheet(kind,id=''){
 const p=current(),s=catalog(id),old=p.operations.find(o=>o.id===id);
 let heading='',body='';
 if(kind==='viewSnapshot'){
  const snap=p.snapshots?.find(s=>s.date===id);
  if(!snap)return;
  $('wl-dialog-title').textContent='Valorisation du '+U.date(snap.date);
  const evidence=Array.isArray(snap.evidence)?snap.evidence:[];
  $('wl-dialog-body').innerHTML='<div class="wl-card wl-analytics">'+
   '<span class="wl-kicker">VALEUR ENREGISTRÉE</span>'+
   '<div class="wl-perf">'+U.fmt(snap.valueCents,p.currency)+'</div>'+
   '<p class="wl-muted-small">'+U.e(snap.source||'Source non documentée')+'</p>'+
   '<p class="wl-muted-small">'+(snap.estimated?'Estimation sur les derniers cours connus à cette date.':
   evidence.length?'Cours disponibles à cette date.':'Valeur de référence fournie, non reconstituée à partir de cotations.')+'</p></div>'+
   (evidence.length?'<div class="wl-section"><div class="wl-section-head"><h2>Justificatifs de cours</h2></div>'+
    '<div class="wl-card wl-analytics">'+evidence.map(entry=>{
     const sec=p.catalog.find(s=>s.id===entry.securityId);
     return '<div class="wl-snapshot-source"><span class="wl-row-icon">↗</span>'+
      '<span><b>'+U.e(sec?.name||entry.securityId)+'</b>'+
      '<small>'+U.date(entry.quoteDate)+' · '+U.e(entry.source)+' · '+U.e(entry.kind)+'</small></span></div>';
    }).join('')+'</div></div>':
    '<p class="wl-note">Cette référence ne prouve pas les cours individuels ni les plus-values du portefeuille.</p>');
  $('wl-dialog').showModal();return;
 }
 if(kind==='newPortfolio'){
  heading='Créer un portefeuille';
  body=field('name','Nom du portefeuille','','text','required maxlength="70"')+
   paired(select('type','Enveloppe',[['PEA','PEA'],['CTO','Compte-titres'],['CELI','CELI'],['REER','REER'],['Autre','Autre']],'PEA'),
    select('currency','Devise',E.SUPPORTED.map(c=>[c,c]),'EUR'))+
   select('owner','Titulaire',[['la','Moi'],['partner','Partenaire']],'la')+
   paired(field('start','Date de départ',date(),'date','required'),
    field('cash','Espèces initiales','0','text','required inputmode="decimal"'));
 }else if(kind==='newSecurity'){
  heading='Ajouter un titre';
  body=field('name','Nom de l’action, ETF ou fonds','','text','required maxlength="100"')+
   paired(select('assetType','Nature',[['Action','Action'],['ETF','ETF'],['Fonds','Fonds'],['Autre','Autre']],'Action'),
    field('symbol','Symbole (facultatif)'))+
   paired(field('isin','ISIN (facultatif)','','text','maxlength="12"'),field('marketMic','Marché MIC (facultatif)','','text','maxlength="4"'))+
   paired(field('sector','Secteur'),field('geography','Géographie'))+
   paired(field('quantity','Quantité initiale','0','text','required inputmode="decimal"'),
    field('basisPrice','PRU initial, si connu','','text','inputmode="decimal"'))+
   note('La quantité initiale est une reprise, sans opération historique fictive. Laisse 0 pour un nouveau titre acheté ultérieurement.');
 }else if(kind==='opening'){
  if(!s)return;
  const found=p.positions.find(x=>x.id===id),basis=found?.costBasisCents;
  heading='PRU et informations';
  body='<p class="wl-op-summary">'+U.e(s.name)+' · '+U.qty(found?.quantityMicro||0)+' titres au départ.</p>'+
   paired(field('symbol','Symbole',s.symbol||''),field('isin','ISIN',s.isin||'','text','maxlength="12"'))+
   field('marketMic','Marché de cotation (MIC)',s.marketMic||'','text','maxlength="4"')+
   paired(select('assetType','Nature',[['Action','Action'],['ETF','ETF'],['Fonds','Fonds'],['Autre','Autre']],s.assetType||'Action'),
    field('sector','Secteur',s.sector||''))+
   field('geography','Géographie',s.geography||'')+
   field('basisPrice','PRU initial par titre',basis===null||basis===undefined?'':(basis/100/(found.quantityMicro/1000000)).toFixed(4),'text','inputmode="decimal"')+
   note('Un PRU inconnu reste vide. Aucun prix d’exécution ni date passée ne sont inventés.');
 }else if(kind==='quote'){
  if(!s)return;
  heading='Cotation manuelle';
  const q=p.quotes?.[id];
  body='<p class="wl-op-summary">'+U.e(s.name)+' · aucune connexion boursière dans ce laboratoire.</p>'+
   field('unitPrice','Dernier cours ('+p.currency+')',priceInput(q?.priceUnits),'text','required inputmode="decimal"')+
   paired(field('date','Date du cours',q?.date||date(),'date','required'),
    select('kind','Type',[['manuel','Manuel'],['clôture','Clôture vérifiée'],['différé','Différé vérifié']],'manuel'))+
   field('source','Source du prix',q?.source||'Saisie manuelle','text','required')+
   note('Un cours manuel n’est jamais présenté comme temps réel.');
 }else if(kind==='strategy'){
  if(!s)return;
  heading='Stratégie de position';const st=s.strategy||{};
  body=field('thesis','Thèse d’investissement',st.thesis||'')+
   field('horizon','Horizon de détention',st.horizon||'')+
   paired(field('priceBelow','Réévaluer sous',st.priceBelow||'','text','inputmode="decimal"'),
    field('priceAbove','Réévaluer au-dessus',st.priceAbove||'','text','inputmode="decimal"'))+
   paired(field('maxWeight','Concentration maximum (%)',st.maxWeight||'','text','inputmode="decimal"'),
    field('resultsDate','Prochains résultats',st.resultsDate||'','date'))+
   note('Une alerte propose uniquement de réévaluer la position. Aucun ordre automatique.');
 }else if(kind==='snapshot'){
  heading='Valorisation datée';
  body='<p class="wl-op-summary">La valorisation utilise uniquement les opérations effectuées et les cours datés disponibles à cette date. Un cours plus récent n’est jamais appliqué rétroactivement.</p>'+
   field('date','Date de valorisation',date(),'date','required');
 }else if(kind==='newOp'||kind==='editOp'){
  heading=old?'Corriger une opération':'Enregistrer une opération';
  const ty=old?.type||'deposit';
  body=select('type','Nature',Object.entries({deposit:'Versement',withdrawal:'Retrait',buy:'Achat',sell:'Vente',dividend:'Dividende',fee:'Frais'}),ty)+
   field('date','Date',old?.date||date(),'date','required')+
   '<div class="wl-trade-fields">'+select('securityId','Titre',p.catalog.map(x=>[x.id,x.name]),old?.securityId||'')+
   paired(field('quantity','Quantité',qtyInput(old?.quantityMicro),'text','inputmode="decimal"'),
    field('unitPrice','Prix unitaire',priceInput(old?.unitPriceUnits),'text','inputmode="decimal"'))+
   field('tradeFee','Frais de transaction',moneyInput(old?.feeCents)||'0','text','inputmode="decimal"')+'</div>'+
   '<div class="wl-cash-fields">'+field('amount','Montant',moneyInput(old?.amountCents),'text','inputmode="decimal"')+'</div>'+
   note('Les frais d’achat sont inclus dans le coût de revient. Une correction recalculera le journal complet.');
 }else return;
 $('wl-dialog-title').textContent=heading;
 $('wl-dialog-body').innerHTML='<form class="wl-form" id="wl-form">'+body+
 '<div class="wl-form-error" role="alert" id="wl-error"></div>'+
 '<button class="wl-btn" type="submit">Enregistrer dans la démonstration</button></form>';
 const form=$('wl-form');
 form.addEventListener('submit',event=>{event.preventDefault();save(kind,id,new FormData(form));});
 if(kind==='newOp'||kind==='editOp'){
  const sync=()=>{const ty=form.elements.namedItem('type').value;
   form.querySelector('.wl-trade-fields').hidden=!['buy','sell'].includes(ty);
   form.querySelector('.wl-cash-fields').hidden=['buy','sell'].includes(ty);
  };
  form.elements.namedItem('type').addEventListener('change',sync);sync();
 }
 $('wl-dialog').showModal();
}
function save(kind,id,fd){
 const p=current(),read=k=>get(fd,k);
 try{
  if(kind==='newPortfolio'){
   const name=read('name');if(!name||name.length>70)throw Error('Nom de portefeuille requis');
   const next={id:'p-'+(++serial)+'-'+Date.now(),name,type:read('type'),owner:read('owner'),currency:read('currency'),
    openingDate:read('start'),openingCashCents:E.cents(read('cash')),openingCashConfirmed:true,
    positions:[],catalog:[],operations:[],quotes:{},snapshots:[]};
   E.evaluate(next);model.portfolios.push(next);portfolioId=next.id;route='portfolio';
  }else if(kind==='newSecurity'){
   const name=read('name');if(!name)throw Error('Nom du titre requis');
   if(p.catalog.some(s=>s.name.toLocaleLowerCase('fr')===name.toLocaleLowerCase('fr')))throw Error('Titre déjà présent');
   const q=E.quantity(read('quantity')),cost=read('basisPrice')?E.tradeCents(q,E.price(read('basisPrice'))):null;
   const isin=read('isin').toUpperCase(),mic=read('marketMic').toUpperCase();
   if(isin&&!E.isinValid(isin))throw Error('ISIN invalide : vérifie le code et la clé de contrôle.');
   if(mic&&!E.micValid(mic))throw Error('Le code MIC doit comporter 4 caractères.');
   if(isin&&p.catalog.some(s=>String(s.isin||'').toUpperCase()===isin&&String(s.marketMic||'').toUpperCase()===mic))throw Error('Ce titre et cette place existent déjà.');
   const item={id:'s-'+(++serial)+'-'+Date.now(),name,assetType:read('assetType'),symbol:read('symbol'),
    isin,marketMic:mic,sector:read('sector'),geography:read('geography'),quantityMicro:q,costBasisCents:cost,strategy:{}};
   replacePortfolio({...p,positions:q?[...p.positions,item]:p.positions.slice(),catalog:[...p.catalog,item]});
  }else if(kind==='opening'){
   const s=p.positions.find(s=>s.id===id);if(!s)throw Error('Position initiale inconnue');
   const cost=read('basisPrice')?E.tradeCents(s.quantityMicro,E.price(read('basisPrice'))):null;
   const isin=read('isin').toUpperCase(),mic=read('marketMic').toUpperCase();
   if(isin&&!E.isinValid(isin))throw Error('ISIN invalide : vérifie le code et la clé de contrôle.');
   if(mic&&!E.micValid(mic))throw Error('Le code MIC doit comporter 4 caractères.');
   const fields={symbol:read('symbol'),isin,marketMic:mic,assetType:read('assetType'),sector:read('sector'),geography:read('geography')};
   const next=E.setOpeningPosition(p,id,cost,fields);
   next.catalog=p.catalog.map(s=>s.id===id?{...s,...fields,costBasisCents:cost}:s);
   replacePortfolio(next);
  }else if(kind==='quote'){
   replacePortfolio(E.setQuote(p,id,{priceUnits:E.price(read('unitPrice')),date:read('date'),
    kind:read('kind'),source:read('source')}));
  }else if(kind==='strategy'){
   for(const k of ['priceBelow','priceAbove'])if(read(k))E.price(read(k));
   const max=read('maxWeight').replace(',','.');
   if(max&&(!Number.isFinite(Number(max))||Number(max)<=0||Number(max)>100))throw Error('Concentration de 0 à 100 %');
   if(read('resultsDate')&&!E.dateValid(read('resultsDate')))throw Error('Date des résultats invalide');
   const strategy={thesis:read('thesis'),horizon:read('horizon'),priceBelow:read('priceBelow'),
    priceAbove:read('priceAbove'),maxWeight:max,resultsDate:read('resultsDate')};
   const next={...p,positions:p.positions.map(s=>s.id===id?{...s,strategy}:s),
    catalog:p.catalog.map(s=>s.id===id?{...s,strategy}:s)};
   replacePortfolio(next);
  }else if(kind==='snapshot'){
   const d=read('date');
   if(!E.dateValid(d)||d<p.openingDate)throw Error('Date de valorisation invalide');
   if(p.snapshots.some(s=>s.date===d))throw Error('Une valorisation existe déjà à cette date');
   const snapshot=E.snapshotAt(p,d);
   replacePortfolio({...p,snapshots:[...p.snapshots,snapshot]});
  }else if(kind==='newOp'||kind==='editOp'){
   const old=p.operations.find(x=>x.id===id),ty=read('type');
   const operation={id:old?.id||'o-'+(++serial)+'-'+Date.now(),date:read('date'),type:ty,
    amountCents:0,feeCents:0,quantityMicro:0,unitPriceUnits:0};
   if(['buy','sell'].includes(ty)){
    operation.securityId=read('securityId');
    operation.quantityMicro=E.quantity(read('quantity'));
    operation.unitPriceUnits=E.price(read('unitPrice'));
    operation.feeCents=E.cents(read('tradeFee')||'0');
   }else operation.amountCents=E.cents(read('amount'));
   replacePortfolio(E.appendOperation(p,operation,old?.id||null));
  }
  $('wl-dialog').close();notice='Modifié dans la démonstration uniquement.';render();
 }catch(error){$('wl-error').textContent=String(error?.message||error);}
}
document.addEventListener('click',event=>{
 const el=event.target.closest('[data-act]');if(!el)return;
 const a=el.dataset.act,id=el.dataset.id||'';
 if(a==='home')go('overview');
 else if(a==='portfolio')go('portfolio',id);
 else if(a==='position'){securityId=id;go('position');}
 else if(a==='analytics')go('analytics');
 else if(a==='range'){range=id;render();}
 else if(['newPortfolio','newSecurity','opening','quote','strategy','snapshot','newOp','editOp','viewSnapshot'].includes(a))sheet(a,id);
});
$('wl-close').addEventListener('click',()=>$('wl-dialog').close());
$('wl-dialog').addEventListener('click',event=>{if(event.target===$('wl-dialog'))$('wl-dialog').close();});
render();
})();
