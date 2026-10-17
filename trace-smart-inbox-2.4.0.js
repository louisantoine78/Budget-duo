/* TRACE 5.20 — multi-day capture inbox. Drafts never affect balances until approved. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=n=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(Number(n||0));
const dayLabel=s=>new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'long',year:'numeric'}).format(new Date(s+'T12:00:00'));
let account='',busy=false;
const bridge=()=>window.TraceBankBridge;
function node(){return $('#traceSmartOverlay');}
function show(title,content){
 const root=node();if(!root)return;
 root.classList.remove('hidden');root.innerHTML='<div class="trace-smart-scrim" data-smart-close></div>'+
 '<section class="trace-smart-sheet" role="dialog" aria-modal="true" aria-labelledby="smartTitle">'+
 '<div class="trace-smart-bar"></div><div class="trace-smart-top"><div><span class="trace-kicker">TRACE · IMPORT INTELLIGENT</span><h2 id="smartTitle">'+esc(title)+'</h2></div>'+
 '<button class="trace-smart-close" id="smartClose" type="button" aria-label="Fermer">×</button></div>'+
 '<div class="trace-smart-content" id="smartContent">'+content+'</div></section>';
 $('#smartClose').onclick=()=>{if(!busy)close();};
 root.querySelector('[data-smart-close]').onclick=()=>{if(!busy)close();};
}
function close(){node()?.classList.add('hidden');node().innerHTML='';window.TraceImportCalendar?.render?.();}
function proposedType(row,accountId=account){
 const a=bridge().accounts().find(z=>z.id===accountId);
 const name=String(row.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(a?.type==='card')return /paiement.{0,100}(?:carte|mastercard|visa|received|recu|caisse)/.test(name)?'unknown':row.type==='refund'?'refund':'expense';
 if(a?.type==='checking'&&/paiement.{0,100}(?:mastercard|visa|carte de credit|odyssee|world elite)|(?:mastercard|visa).{0,80}paiement/.test(name))return'transfer';
 if(/virement|interac|transfert|remboursement|versement/.test(name))return'unknown';
 if(/salaire|payroll|paie\s|depot direct/.test(name))return'income';
 return row.type==='income'?'income':'expense';
}
function pending(){return bridge()?.smartDrafts?.(account)||[];}
function dateBuckets(){
 const result={};
 for(const d of pending()){const key=d.date||'';(result[key]??=[]).push(d);}
 return result;
}
function outcome(summary){
 const buckets=dateBuckets(),keys=Object.keys(buckets).sort((a,b)=>a.localeCompare(b)),unknown=buckets['']?.length||0;
 show('Opérations à examiner',
  '<div class="trace-smart-intro"><span class="trace-kicker">COMPTE SÉLECTIONNÉ</span><b>'+
   esc(bridge().accounts().find(x=>x.id===account)?.name||'Compte bancaire')+'</b>'+
   '<p>'+esc(summary)+'</p></div>'+
  '<div class="trace-smart-buckets">'+keys.map(key=>
   '<button type="button" class="trace-smart-bucket" data-smart-day="'+esc(key)+'">'+
    '<span><strong>'+esc(key?dayLabel(key):'Date à identifier')+'</strong><small>'+
      buckets[key].length+' opération(s) à vérifier</small></span><span class="trace-smart-bucket-arrow">›</span></button>').join('')+
  (keys.length?'':'<p class="trace-smart-empty">Aucune opération en attente pour ce compte.</p>')+'</div>'+
  (unknown?'<div class="trace-smart-alert">'+unknown+' ligne(s) sans date à attribuer avant confirmation.</div>':'')+
  '<button type="button" class="secondary full" id="smartDone">Revenir au calendrier</button>');
 $('#smartDone').onclick=close;
 node().querySelectorAll('[data-smart-day]').forEach(b=>b.onclick=()=>openDay(account,b.dataset.smartDay));
}

async function loadFiles(files){
 if(busy)return;
 const batchAccount=account,bank=bridge().accounts().find(a=>a.id===batchAccount);
 if(!bank)return;
 busy=true;
 show('Lecture des captures','<div class="trace-smart-intro"><span class="trace-kicker">COMPTE CHOISI</span><b>'+esc(bank.name)+'</b><p>Chaque capture de ce lot sera rattachée à ce compte. TRACE conserve les journées trouvées et signale les dates ou montants incertains.</p></div>'+
 '<div class="trace-smart-progress" id="smartProgress">Préparation…</div><div id="smartLog"></div>');
 let added=0,recovered=0,matched=0,suppressed=0,failed=0;
 for(let i=0;i<files.length;i++){
  const file=files[i];const progress=$('#smartProgress'),log=$('#smartLog');
  progress.textContent='Capture '+(i+1)+' sur '+files.length+' · '+file.name;
  try{
   const data=await window.TraceBankDocuments.extract(file,msg=>{if($('#smartProgress'))$('#smartProgress').textContent='Capture '+(i+1)+'/'+files.length+' · '+msg;},{hintDate:bridge().month()+'-01'});
   const parsed=Array.isArray(data.structuredCandidates)&&data.structuredCandidates.length?data.structuredCandidates:window.TraceBankDocuments.extractCandidates(data.text||'').candidates;
   const records=parsed.map(row=>({
    date:row.date||'',name:row.name||'',
    amount:row.needsReview?null:row.amount,
    suggestedAmount:Number(row.amount)>0?Number(row.amount):null,
    sourcePreview:row.sourcePreview||'',
    needsReview:Boolean(row.needsReview||row.ambiguous),
    needsDateReview:Boolean(row.needsDateReview),
    type:proposedType(row,batchAccount),raw:row.raw||''
   }));
   if(!records.length)throw Error('Aucune opération identifiée. Utilise une capture plus lisible.');
   const result=await bridge().smartStageRows(batchAccount,file.name,records);
   added+=result.added;recovered+=Number(result.recovered)||0;matched+=Number(result.matched)||0;suppressed+=Number(result.suppressed)||0;
   log.innerHTML+='<p class="trace-smart-log-ok">✓ '+esc(file.name)+' · '+result.added+' nouvelle(s), '+(result.matched||0)+' déjà préparée(s), '+(result.suppressed||0)+' exclue(s) conservée(s)</p>';
  }catch(error){failed++;log.innerHTML+='<p class="trace-smart-log-error">'+esc(file.name)+' : '+esc(error?.message||'Lecture impossible')+'</p>';}
 }
 busy=false;
 account=batchAccount;
 outcome(added+' nouvelle(s) opération(s) pour '+bank.name+' · '+matched+' déjà reconnue(s)'+(suppressed?' · '+suppressed+' exclusion(s) respectée(s)':'')+(failed?' · '+failed+' capture(s) à reprendre':'')+'.');
}
function start(id){
 if(busy)return;
 account=id;
 if(!bridge()?.accounts().some(a=>a.id===account))return;
 window.TraceImportCalendar?.closeDayAction?.();
 const input=$('#traceSmartFiles');if(!input)return;
 input.value='';input.click();
}
function options(items,value,placeholder){
 return (placeholder?'<option value="">'+esc(placeholder)+'</option>':'')+
 items.map(i=>'<option value="'+esc(i.id)+'"'+(i.id===value?' selected':'')+'>'+esc(i.name)+'</option>').join('');
}
function typeName(t){
 return {expense:'Dépense',income:'Revenu',refund:'Remboursement',card_payment:'Paiement de carte · hors budget',transfer:'Transfert · hors budget',
 savings_transfer:'Épargne / CELI',external_transfer:'Virement hors budget',external_refund:'Entrée hors budget',friend_reimbursement:'Remboursement d’un proche'}[t]||'À qualifier';
}
function rowForm(d,bank,accounts,known,expanded=false){
 const title=esc(d.name),amount=d.amount===null?(d.suggestedAmount?'OCR : '+money(d.suggestedAmount):'À vérifier'):money(d.amount),
  flag=d.needsAmountReview?'Montant incertain':known?'À confirmer':'Date à préciser';
 if(!known){
  return '<article class="trace-smart-draft trace-smart-undated" data-smart-id="'+esc(d.id)+'">'+
   '<div class="trace-smart-item-top"><span class="trace-kicker">'+flag+'</span><strong>'+esc(amount)+'</strong></div>'+
   '<strong class="trace-smart-item-name">'+title+'</strong>'+
   '<div class="trace-smart-assign"><label>Jour de cette opération<input class="input smart-date" type="date" value=""></label>'+
   '<button class="primary smart-approve" type="button">Attribuer la date</button></div>'+
   '<button class="trace-smart-ignore-link smart-ignore" type="button">Écarter cette ligne</button>'+
   '<div class="trace-smart-feedback" role="status"></div></article>';
 }
 const duplicates=bridge().smartDuplicateMatches?.(d.id)||[];
 const rawType=d.type||'unknown';
 const normalizedName=String(d.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const cardRepayment=bank.type==='checking'&&rawType==='transfer'&&
  /paiement.{0,100}(?:mastercard|visa|carte de credit|odyssee|world elite)|(?:mastercard|visa).{0,80}paiement/.test(normalizedName);
 const t=cardRepayment?'card_payment':rawType;
 const suggestion=['expense','income','refund'].includes(t)?bridge().suggestImportCategory({
  name:d.name,type:t,amountCAD:d.amount,categoryId:d.categoryId||''
 }):'';
 const suggestionCat=suggestion?bridge().importCategoryOptions(t).find(c=>c.id===suggestion):null;
 const types=[
  ['','Nature à choisir'],['expense','Dépense'],['income','Revenu'],['refund','Retour de commerçant'],['friend_reimbursement','Remboursement d’un proche · hors budget'],
  ['external_refund','Autre entrée hors budget'],['card_payment','Paiement de carte de crédit · hors budget'],['transfer','Autre transfert entre comptes · hors budget'],
  ['savings_transfer','Épargne / CELI (hors budget)'],['external_transfer','Virement sortant hors budget']];
 const recipients=bridge().importRecipients(),dest=accounts.filter(a=>a.id!==account),
  preferred=dest.find(a=>a.type==='card')||dest[0];
 const inspect=d.date&&d.amount?bridge().inspect([{date:d.date,name:d.name,amount:d.amount,type:t}],account)[0]:null;
 const match=inspect?.status==='already'?'Opération identique déjà présente':
  inspect?.status==='possible'?'Opération ressemblante déjà présente':null;
 const initialRisk=duplicates.length||['already','possible'].includes(inspect?.status);
 return '<article class="trace-smart-draft trace-smart-fold'+(expanded?' is-expanded':'')+(initialRisk?' is-duplicate':'')+'" data-smart-id="'+esc(d.id)+'">'+
  '<button class="trace-smart-toggle" type="button" aria-expanded="'+String(expanded)+'">'+
  '<span class="trace-smart-title-col"><span class="trace-kicker trace-review-state">'+(initialRisk?'DOUBLON À EXAMINER':esc(flag))+'</span>'+
  '<strong class="trace-smart-item-name">'+title+'</strong><small>'+esc(bank.name)+' · '+esc(typeName(t))+(suggestionCat?' · '+esc(suggestionCat.name)+' suggérée':'')+'</small></span>'+
  '<span class="trace-smart-title-right"><strong>'+esc(amount)+'</strong><i class="trace-smart-chevron">'+(expanded?'−':'+')+'</i></span></button>'+
  (duplicates.filter(x=>x.status==='pending').length?
   '<div class="trace-smart-dedup"><div class="trace-smart-dedup-lead"><strong>Présente sur plusieurs captures ?</strong>'+
   '<small>Vérifie qu’il s’agit bien du même mouvement. Même commerçant et montant ne prouvent pas toujours un doublon.</small></div>'+
   '<button type="button" class="trace-smart-keep-one">Garder cette ligne · Écarter '+
    duplicates.filter(x=>x.status==='pending').length+' copie(s)</button>'+
   '<div class="trace-smart-dedup-confirm" hidden><p>Les copies seront écartées, mais cette ligne restera à vérifier et à valider. Aucune dépense ne sera enregistrée maintenant.</p>'+
    '<label><input type="checkbox" class="trace-smart-dedup-checked"> J’ai comparé les captures : il s’agit bien du même mouvement bancaire.</label>'+
    '<div class="trace-smart-dedup-buttons"><button type="button" class="primary trace-smart-dedup-apply" disabled>Conserver une seule ligne</button>'+
    '<button type="button" class="secondary trace-smart-dedup-cancel">Annuler</button></div></div>'+
    '<div class="trace-smart-dedup-feedback" role="status"></div></div>':'')+
  '<div class="trace-smart-editor"'+(expanded?'':' hidden')+'>'+
  '<div class="trace-smart-risk-slot" aria-live="polite"></div>'+
  '<div class="trace-review-section-title"><span>01</span><div><strong>Contrôle bancaire</strong><small>Compare la ligne originale avec les informations reconnues.</small></div></div>'+
  (d.evidenceSource==='provided_bank_screenshot'?
    '<div class="trace-smart-bank-evidence"><strong>Montant repéré sur ton relevé fourni</strong>'+
    '<p>'+esc(d.suggestedAmount?money(d.suggestedAmount):'À vérifier')+
    ' · Proposition non comptabilisée tant que tu ne confirmes pas.</p></div>':'')+
  (d.needsAmountReview&&d.sourcePreviewVersion!==2?
    '<div class="trace-smart-legacy-note"><strong>Ancien extrait incomplet</strong>'+
    '<p>Le montant n’avait pas été conservé. Réimporte la capture pour remplacer l’extrait et retrouver le prix, sans confirmer automatiquement le paiement.</p>'+
    '<button type="button" class="secondary trace-smart-retry-photo">Relire la capture</button></div>':'')+
  (d.sourcePreview&&d.sourcePreview.startsWith('data:image/jpeg;base64,')&&d.sourcePreview.length<105000?
   '<div class="trace-smart-proof"><span class="trace-kicker">'+
    (d.sourcePreviewVersion===2?'CAPTURE BANCAIRE · LIGNE D’ORIGINE':'EXTRAIT ANCIEN · PARTIEL')+'</span>'+
    '<button type="button" class="trace-smart-preview-btn" aria-label="Agrandir ou réduire l’extrait de la banque"><img loading="lazy" src="'+esc(d.sourcePreview)+'" alt="Extrait de la capture bancaire"></button>'+
    '<small>Touche l’extrait pour l’agrandir. Vérifie la date, le montant et le commerçant sans quitter TRACE.</small></div>':
   d.needsAmountReview?'<div class="trace-smart-proof-note">Réimporte la même capture pour retrouver son extrait ici, sans créer de nouvelle opération.</div>':'')+
  '<details class="trace-smart-origin-box"><summary>Compte source · '+esc(bank.name)+' <span>Modifier</span></summary>'+
   '<label class="trace-smart-field">Réattribuer à un autre compte<select class="input smart-origin">'+
   options(accounts,account)+'</select></label>'+
   '<button type="button" class="secondary smart-reassign" disabled>Déplacer vers ce compte</button>'+
   '<small>Cette correction déplace uniquement le brouillon, sans affecter tes soldes ni ton budget.</small></details>'+
  '<div class="trace-smart-grid"><label>Date<input class="input smart-date" type="date" value="'+esc(d.date)+'"></label>'+
  '<label>Montant ($)<input class="input smart-amount" type="number" inputmode="decimal" min="0.01" step="0.01" value="'+esc(d.amount??d.suggestedAmount??'')+'"></label></div>'+
  '<label class="trace-smart-field">Description<input class="input smart-name" maxlength="85" value="'+title+'"></label>'+
  '<div class="trace-review-section-title"><span>02</span><div><strong>Classer l’opération</strong><small>Nature, catégorie et répartition du budget.</small></div></div>'+ 
  '<label class="trace-smart-field">Type de mouvement<select class="input smart-type">'+types.map(([v,label])=>'<option value="'+v+'"'+(v===t?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>'+
  '<div class="smart-budget-fields"><div class="trace-smart-category-label"><span>Catégorie</span>'+
  '<button type="button" class="trace-smart-add-category">+ Créer</button></div>'+
  '<select class="input smart-category" aria-label="Catégorie de l’opération"></select>'+
  '<label class="trace-smart-field">Pour qui ?<select class="input smart-who">'+options(recipients,recipients[0]?.id)+'</select></label>'+
  '<div class="trace-smart-grid smart-custom hidden"><label>Part amis ($)<input type="number" class="input smart-friends" min="0" step=".01" value="0"></label>'+
  '<label>Part partenaire ($)<input type="number" class="input smart-partner" min="0" step=".01" value="0"></label></div></div>'+
  '<div class="smart-transfer-fields hidden"><label class="trace-smart-field">Compte destinataire<select class="input smart-target">'+options(dest,preferred?.id||'','Choisir le compte')+'</select></label>'+
   '<p class="trace-card-payment-explainer hidden">Ton compte courant baisse et ta dette de carte diminue : ce n’est pas une nouvelle dépense dans ton budget.</p></div>'+
  '<div class="smart-savings-fields hidden"><label class="trace-smart-field">Vers quel CELI ?<select class="input smart-savings-target"><option value="">Choisir le CELI</option>'+
   (bridge().savingsAccounts?.()||[]).map(a=>'<option value="'+esc(a.id)+'"'+(d.investmentAccountId===a.id?' selected':'')+'>'+
   esc(a.name)+(a.ready?'':' · à configurer')+'</option>').join('')+'</select></label>'+
  '<div class="trace-smart-celi-impact" aria-live="polite">'+
 '<strong>Effet de ce virement après validation</strong>'+
 '<div class="trace-smart-celi-impact-line"><span>Compte courant · disponible</span><b class="trace-smart-celi-out" data-celi-out>À vérifier</b></div>'+
 '<div class="trace-smart-celi-impact-line"><span data-celi-target>CELI à sélectionner</span><b class="trace-smart-celi-in" data-celi-in>À vérifier</b></div>'+
 '<div class="trace-smart-celi-impact-line"><span>Dépenses du budget</span><b>0 $</b></div>'+
 '<div class="trace-smart-celi-impact-line"><span>Patrimoine net</span><b>0 $</b></div>'+
 '<p>Cette sortie diminue vraiment ton compte courant, mais l’argent reste à toi dans le CELI. Les 4 effets ne sont appliqués qu’après ta confirmation.</p></div>'+
 '<small class="trace-smart-saving-note">Le CELI doit avoir un solde initial daté dans Patrimoine.</small></div>'+
   '<p class="empty-note trace-smart-friend-note hidden">Remboursement d’un proche : ce virement augmente le compte courant, sans revenu ni réduction supplémentaire de dépenses. Vérifie la part des amis sur l’achat initial.</p>'+
  '<div class="trace-review-section-title"><span>03</span><div><strong>Validation</strong><small>Rien n’est ajouté au budget sans ta confirmation.</small></div></div>'+
  (d.needsAmountReview?'<div class="trace-review-ocr-uncertain"><strong>Montant OCR incertain</strong>'+
   '<p>La lecture automatique n’est pas assez fiable. Compare le montant dans ce formulaire à celui de la capture, puis confirme ta vérification.</p>'+
   '<label class="trace-smart-confirm"><input type="checkbox" class="smart-amount-confirm"> J’ai vérifié ce montant sur la capture</label></div>':'')+
  '<div class="trace-smart-actions"><button class="primary smart-approve" type="button">Confirmer l’opération</button><button class="secondary smart-ignore" type="button">Écarter</button></div>'+
  '<div class="trace-smart-feedback" role="status"></div></div></article>';
}

function updateSavingsImpact(el){
 const panel=el.querySelector('.trace-smart-celi-impact');
 if(!panel)return;
 const raw=el.querySelector('.smart-amount')?.value?.trim()||'',number=Number(raw);
 const recognized=raw!==''&&Number.isFinite(number)&&number>0;
 const formatted=recognized?money(Math.round(number*100)/100):'À vérifier';
 panel.querySelector('[data-celi-out]').textContent=recognized?'−'+formatted:formatted;
 panel.querySelector('[data-celi-in]').textContent=recognized?'+'+formatted:formatted;
 const selected=el.querySelector('.smart-savings-target')?.value||'';
 panel.querySelector('[data-celi-target]').textContent=
  bridge().savingsAccounts?.().find(a=>a.id===selected)?.name||'CELI à sélectionner';
}
function synchronizeRow(el){
 const type=el.querySelector('.smart-type').value,budget=['expense','income','refund'].includes(type);
 el.querySelector('.smart-budget-fields').classList.toggle('hidden',!budget);
 el.querySelector('.smart-transfer-fields').classList.toggle('hidden',!['transfer','card_payment'].includes(type));
 const destAccounts=(bridge().accounts()||[]).filter(a=>a.id!==account&&(type!=='card_payment'||a.type==='card'));
 const target=el.querySelector('.smart-target'),previousTarget=target.value;
 target.innerHTML=options(destAccounts,destAccounts.some(a=>a.id===previousTarget)?previousTarget:destAccounts[0]?.id||'','Choisir le compte');
 el.querySelector('.trace-card-payment-explainer').classList.toggle('hidden',type!=='card_payment');
 el.querySelector('.smart-savings-fields').classList.toggle('hidden',type!=='savings_transfer');
  el.querySelector('.trace-smart-friend-note').classList.toggle('hidden',type!=='friend_reimbursement');
 const categories=budget?bridge().importCategoryOptions(type):[],
  previous=el.querySelector('.smart-category').value;
 const proposed=categories.some(x=>x.id===previous)?previous:bridge().suggestImportCategory({
  name:el.querySelector('.smart-name').value,amountCAD:Number(el.querySelector('.smart-amount').value),type
 });
 el.querySelector('.smart-category').innerHTML=options(categories,proposed,'Choisir une catégorie');
 el.querySelector('.smart-who').disabled=type==='income';
 el.querySelector('.smart-custom').classList.toggle('hidden',type==='income'||el.querySelector('.smart-who').value!=='custom');
 updateSavingsImpact(el);
}
function openSmartCategoryCreator(el){
 if(document.getElementById('traceSmartCategoryCreator'))return;
 const type=el.querySelector('.smart-type').value==='income'?'income':'expense';
 const layer=document.createElement('div');
 layer.id='traceSmartCategoryCreator';layer.className='trace-smart-category-layer';
 layer.innerHTML='<div class="trace-smart-category-scrim"></div>'+
  '<section class="trace-smart-category-panel" role="dialog" aria-modal="true" aria-labelledby="traceSmartCategoryTitle">'+
  '<span class="trace-kicker">PERSONNALISER MON BUDGET</span><h3 id="traceSmartCategoryTitle">Nouvelle catégorie</h3>'+
  '<p>Elle sera ajoutée à ton budget et sélectionnée pour cette opération.</p>'+
  '<label>Nom de la catégorie<input id="traceSmartCategoryName" maxlength="60" class="input" placeholder="Ex. Animaux, sorties"></label>'+
  (type==='expense'?'<label>Type de budget<select id="traceSmartCategoryKind" class="input"><option value="variable">Variable</option><option value="fixed">Fixe</option></select></label>':'')+
  '<div class="trace-smart-category-actions"><button type="button" class="primary" id="traceSmartCategorySave">Créer la catégorie</button>'+
  '<button type="button" class="secondary" id="traceSmartCategoryCancel">Annuler</button></div>'+
  '<small id="traceSmartCategoryError" role="status"></small></section>';
 document.body.appendChild(layer);
 const cancel=()=>layer.remove();
 layer.querySelector('#traceSmartCategoryCancel').onclick=cancel;
 layer.querySelector('.trace-smart-category-scrim').onclick=cancel;
 layer.querySelector('#traceSmartCategorySave').onclick=async()=>{
  const btn=layer.querySelector('#traceSmartCategorySave');
  const name=layer.querySelector('#traceSmartCategoryName').value;
  const kind=layer.querySelector('#traceSmartCategoryKind')?.value||'variable';
  btn.disabled=true;
  try{
   const created=await bridge().smartCreateCategory(name,type,kind);
   synchronizeRow(el);
   el.querySelector('.smart-category').value=created.id;
   el.querySelector('.trace-smart-feedback').textContent=created.reused?
    'Catégorie existante sélectionnée.':'Catégorie créée et sélectionnée.';
   cancel();
  }catch(e){btn.disabled=false;layer.querySelector('#traceSmartCategoryError').textContent=e.message;}
 };
 layer.querySelector('#traceSmartCategoryName').focus({preventScroll:true});
}

function updateDuplicateReview(el){
 const d=bridge().smartDrafts(account).find(x=>x.id===el.dataset.smartId);
 if(!d)return;
 const field=x=>el.querySelector(x),date=field('.smart-date')?.value||'',
  name=field('.smart-name')?.value.trim()||'',
  raw=field('.smart-amount')?.value||'',amount=raw===''?null:Number(raw),
  type=field('.smart-type')?.value||'';
 const overlaps=bridge().smartDuplicateMatches?.(d.id,{date,name,amount})||[];
 const inspected=date&&name&&amount>0?
  bridge().inspect([{date,name,amount,type:type==='card_payment'?'transfer':type}],account)[0]:null;
 const recorded=overlaps.some(x=>x.exact&&x.status==='recorded')||inspected?.status==='already';
 const possible=overlaps.length>0||['possible','already'].includes(inspected?.status);
 const slot=field('.trace-smart-risk-slot'),state=field('.trace-review-state'),action=field('.smart-approve');
 const previous=Boolean(slot.querySelector('.smart-duplicate-confirm')?.checked);
 el.classList.toggle('is-duplicate',possible);
 if(state)state.textContent=possible?'DOUBLON À EXAMINER':d.needsAmountReview?'MONTANT À VÉRIFIER':'À CONFIRMER';
 if(!possible){slot.innerHTML='';action.disabled=false;action.textContent='Confirmer l’opération';return;}
 const matches=overlaps.map(x=>'<li>'+esc(x.name)+' · '+esc(x.date)+' · '+
  (Number(x.amount)>0?esc(money(x.amount)):'montant à confirmer')+
  (x.status==='recorded'?' · déjà comptabilisé':' · en attente')+'</li>').join('');
 const inspectedMatch=!overlaps.length&&inspected?.matchName?
  '<li>'+esc(inspected.matchName)+' · '+esc(inspected.matchDate||'')+' · même montant</li>':'';
 slot.innerHTML='<div class="trace-smart-duplicate" role="alert"><span class="trace-smart-risk-label">RAPPROCHEMENT À CONTRÔLER</span>'+
  '<strong>'+(recorded?'Cette opération semble déjà comptabilisée':'Doublon potentiel · vérification nécessaire')+'</strong>'+
  '<p>Même compte et montant, avec un commerçant et une date similaires. Vérifie la capture avant de poursuivre.</p>'+
  ((matches||inspectedMatch)?'<ul>'+matches+inspectedMatch+'</ul>':'')+
  (recorded?'<p class="trace-smart-risk-blocked">Pour éviter un double comptage, cette ligne ne peut pas être confirmée une deuxième fois. Corrige-la si les informations diffèrent, ou écarte-la.</p>':
   '<label class="trace-smart-confirm"><input type="checkbox" class="smart-duplicate-confirm"'+(previous?' checked':'')+
   '> Ce sont bien deux opérations distinctes ; j’ai comparé les captures.</label>')+
  '</div>';
 action.disabled=Boolean(recorded);
 action.textContent=recorded?'Déjà comptabilisée':'Confirmer l’opération';
}

function readRow(el){
 const q=x=>el.querySelector(x),d=bridge().smartDrafts(account).find(x=>x.id===el.dataset.smartId);
 return{id:el.dataset.smartId,date:q('.smart-date').value,name:q('.smart-name').value.trim(),
  amount:q('.smart-amount').value,type:q('.smart-type').value,
  categoryId:q('.smart-category').value,beneficiary:q('.smart-who').value,
  toAccountId:q('.smart-target')?.value||'',investmentAccountId:q('.smart-savings-target')?.value||'',friendsAmount:q('.smart-friends').value,
  partnerAmount:q('.smart-partner').value,allowPossibleDuplicate:!!q('.smart-duplicate-confirm')?.checked,
  amountChecked:!d?.needsAmountReview||!!q('.smart-amount-confirm')?.checked,verified:true};
}
function openUnknown(accountId){openDay(accountId,'');}
function openDay(accountId,date){
 account=accountId;const bank=bridge().accounts().find(a=>a.id===account);if(!bank)return;
 const drafts=bridge().smartDrafts(account,date),known=Boolean(date),
  targetCard=known&&bank.type==='checking'?(bridge().accounts().filter(a=>a.type==='card').length===1?bridge().accounts().find(a=>a.type==='card'):null):null,
  info=known?bridge().importDayInfo(account,date):null,
  unknown=known?bridge().smartDrafts(account,'').length:0,
  canFinish=known&&!drafts.length&&!info?.pending&&!info?.unresolved&&!unknown;
 show(known?dayLabel(date):'Dates à compléter',
  '<div class="trace-smart-day-header"><strong>'+esc(bank.name)+'</strong><small>'+
  esc(known?drafts.length+' opération(s) à vérifier · ouvre une carte pour la compléter':
   drafts.length+' date(s) à attribuer avant leur vérification')+'</small></div>'+
  (targetCard&&drafts.length>1?'<div class="trace-smart-origin-box"><strong>Ces opérations viennent-elles de la carte ?</strong>'+
   '<small>Si toutes les '+drafts.length+' opérations en attente de cette journée viennent de '+esc(targetCard.name)+', déplace-les ensemble avant de les valider. Les transactions déjà confirmées ne changeront pas.</small>'+
   '<button type="button" class="secondary full" id="smartMoveDayToCard">Déplacer '+drafts.length+' brouillons vers la carte</button>'+
   '<div id="smartMoveDayConfirm" hidden><p>Confirmer le déplacement de '+drafts.length+' brouillons vers '+esc(targetCard.name)+' ?</p>'+
   '<button type="button" class="primary full" id="smartMoveDayConfirmButton">Confirmer le compte carte</button>'+
   '<button type="button" class="secondary full" id="smartMoveDayCancel">Annuler</button></div>'+
   '<small id="smartMoveDayFeedback" role="status"></small></div>':'')+
  '<p id="smartDedupSummary" class="trace-smart-dedup-summary" role="status"></p>'+ 
  (drafts.length?'<div class="trace-smart-draft-list">'+drafts.map((d,i)=>rowForm(d,bank,bridge().accounts(),known,known&&i===0)).join('')+'</div>':
   '<div class="trace-smart-empty">Aucune opération en attente pour cette journée.</div>')+
  (known?'<div class="trace-smart-finish"><strong>La journée est complète ?</strong><p>Confirme seulement lorsque toutes les captures ont été ajoutées.</p>'+
   '<button class="primary full" id="smartFinishDay" type="button"'+(canFinish?'':' disabled')+'>Valider la journée</button>'+
   (canFinish?'':'<p class="trace-smart-waiting">'+(drafts.length?drafts.length+' opération(s) à confirmer. ':'')+
    (unknown?unknown+' date(s) encore à identifier. ':'')+
    (info?.unresolved?'Lignes OCR à revérifier.':'')+'</p>')+
   '<div id="smartFinishMessage" class="trace-smart-feedback" role="status"></div></div>':'')+
  (known&&drafts.length?'<div class="trace-smart-reset-zone"><button class="trace-smart-reset-trigger" type="button" id="smartResetDay">Recommencer l’import de cette journée</button>'+
    '<div id="smartResetPrompt" hidden><strong>Remettre '+drafts.length+' brouillon(s) de côté ?</strong>'+
    '<p>Cette action retire seulement les opérations encore en attente du '+esc(dayLabel(date))+'. '+
    (info?.confirmed?info.confirmed+' transaction(s) déjà validée(s) seront conservée(s). ':'')+
    'Tes soldes, catégories et transactions validées ne seront pas modifiés.</p>'+
    '<button type="button" class="secondary full trace-smart-reset-confirm" id="smartConfirmReset">Oui, recommencer cet import</button>'+
    '<button type="button" class="trace-smart-reset-cancel" id="smartCancelReset">Annuler</button>'+
    '<small id="smartResetFeedback" role="status"></small></div></div>':'')+
  '<button class="secondary full trace-smart-return" id="smartBack" type="button">Toutes les journées</button>');
 $('#smartBack').onclick=()=>outcome('Opérations en attente sur ce compte');
 const content=$('#smartContent');
 $('#smartMoveDayToCard')?.addEventListener('click',()=>{
  $('#smartMoveDayConfirm').hidden=false;$('#smartMoveDayToCard').hidden=true;
 });
 $('#smartMoveDayCancel')?.addEventListener('click',()=>{
  $('#smartMoveDayConfirm').hidden=true;$('#smartMoveDayToCard').hidden=false;
 });
 $('#smartMoveDayConfirmButton')?.addEventListener('click',async()=>{
  if(busy||!targetCard)return;
  const btn=$('#smartMoveDayConfirmButton');btn.disabled=true;busy=true;
  try{
   await bridge().smartMoveDayDraftsAccount(account,date,targetCard.id,drafts.map(d=>d.id));
   busy=false;account=targetCard.id;window.TraceImportCalendar?.selectAccount?.(account);openDay(account,date);
  }catch(error){
   busy=false;btn.disabled=false;$('#smartMoveDayFeedback').textContent=String(error.message||error);
  }
 });
 content.querySelectorAll('[data-smart-id]').forEach(el=>{
  if(known){
   const toggle=el.querySelector('.trace-smart-toggle');
   toggle.onclick=()=>{
    const editor=el.querySelector('.trace-smart-editor'),expand=editor.hidden;
    content.querySelectorAll('.trace-smart-fold').forEach(other=>{
     const block=other.querySelector('.trace-smart-editor'),button=other.querySelector('.trace-smart-toggle');
     if(block)block.hidden=true;
     if(button){button.setAttribute('aria-expanded','false');button.querySelector('.trace-smart-chevron').textContent='+';}
     other.classList.remove('is-expanded');
    });
    editor.hidden=!expand;toggle.setAttribute('aria-expanded',String(expand));
    toggle.querySelector('.trace-smart-chevron').textContent=expand?'−':'+';
    el.classList.toggle('is-expanded',expand);
   };
   const dedupStart=el.querySelector('.trace-smart-keep-one');
   if(dedupStart){
    const box=el.querySelector('.trace-smart-dedup-confirm'),
      check=el.querySelector('.trace-smart-dedup-checked'),apply=el.querySelector('.trace-smart-dedup-apply'),
      cancel=el.querySelector('.trace-smart-dedup-cancel'),feedback=el.querySelector('.trace-smart-dedup-feedback');
    dedupStart.addEventListener('click',()=>{
     box.hidden=false;dedupStart.hidden=true;check.checked=false;apply.disabled=true;
    });
    check.addEventListener('change',()=>{apply.disabled=!check.checked||busy;});
    cancel.addEventListener('click',()=>{
     box.hidden=true;dedupStart.hidden=false;check.checked=false;apply.disabled=true;feedback.textContent='';
    });
    apply.addEventListener('click',async()=>{
     if(busy||!check.checked)return;
     const selectedDraft=bridge().smartDrafts(account,date).find(d=>d.id===el.dataset.smartId);
     if(!selectedDraft){feedback.textContent='Cette opération a changé. Rouvre la journée.';return;}
     const copies=bridge().smartDuplicateMatches?.(selectedDraft.id)?.filter(x=>x.status==='pending')||[];
     if(!copies.length){feedback.textContent='Aucune copie en attente à écarter. Rouvre la journée.';return;}
     busy=true;apply.disabled=true;apply.textContent='Vérification…';
     try{
      const result=await bridge().smartKeepSingleDraft(selectedDraft.id,copies.map(x=>x.id));
      busy=false;
      openDay(account,date);
      const note=$('#smartDedupSummary');
      if(note)note.textContent=result.excluded+' copie(s) écartée(s), 1 opération conservée en attente de validation.';
     }catch(err){
      busy=false;apply.disabled=false;apply.textContent='Conserver une seule ligne';
      feedback.textContent=String(err.message||err);
     }
    });
   }
   el.querySelector('.trace-smart-preview-btn')?.addEventListener('click',e=>e.currentTarget.classList.toggle('is-zoomed'));
   el.querySelector('.trace-smart-retry-photo')?.addEventListener('click',()=>start(account));
   const origin=el.querySelector('.smart-origin'),move=el.querySelector('.smart-reassign');
   origin?.addEventListener('change',()=>{
    move.disabled=origin.value===account;
    move.textContent='Déplacer vers '+(bridge().accounts().find(a=>a.id===origin.value)?.name||'ce compte');
   });
   move?.addEventListener('click',async()=>{
    if(busy||origin.value===account)return;
    busy=true;move.disabled=true;
    try{
     const target=origin.value;
     await bridge().smartMoveDraftAccount(el.dataset.smartId,target);
     busy=false;account=target;window.TraceImportCalendar?.selectAccount?.(account);outcome('Brouillon déplacé vers ce compte. Il reste en attente de validation.');
    }catch(e){busy=false;move.disabled=false;el.querySelector('.trace-smart-feedback').textContent=e.message;}
   });
   el.querySelector('.trace-smart-add-category').onclick=()=>openSmartCategoryCreator(el);
   el.querySelector('.smart-type').onchange=()=>{synchronizeRow(el);updateDuplicateReview(el);};
   el.querySelector('.smart-who').onchange=()=>synchronizeRow(el);
   synchronizeRow(el);
   updateDuplicateReview(el);
   ['.smart-amount','.smart-name','.smart-date'].forEach(selector=>{
    el.querySelector(selector)?.addEventListener('input',()=>{
     if(selector==='.smart-name')synchronizeRow(el);
     updateDuplicateReview(el);
     if(selector==='.smart-amount')updateSavingsImpact(el);
    });
   });
   el.querySelector('.smart-savings-target')?.addEventListener('change',()=>updateSavingsImpact(el));
   el.querySelector('.smart-approve').onclick=async()=>{
    if(busy)return;
    const v=readRow(el),button=el.querySelector('.smart-approve');
    if(!v.amountChecked){el.querySelector('.trace-smart-feedback').textContent='Vérifie le montant sur ta capture bancaire.';return;}
    busy=true;button.disabled=true;button.textContent='Enregistrement…';
    try{await bridge().smartApproveDraft(v.id,v);busy=false;openDay(account,date);}
    catch(e){busy=false;button.disabled=false;button.textContent='Confirmer l’opération';el.querySelector('.trace-smart-feedback').textContent=e.message;}
   };
  }else{
   el.querySelector('.smart-approve').onclick=async()=>{
    if(busy)return;const btn=el.querySelector('.smart-approve'),dateValue=el.querySelector('.smart-date').value;
    busy=true;btn.disabled=true;
    try{
     const draft=drafts.find(x=>x.id===el.dataset.smartId);
     await bridge().smartSaveDraft(el.dataset.smartId,{date:dateValue,name:draft?.name});
     busy=false;openDay(account,'');
    }catch(e){busy=false;btn.disabled=false;el.querySelector('.trace-smart-feedback').textContent=e.message;}
   };
  }
  el.querySelector('.smart-ignore').onclick=()=>{
   const btn=el.querySelector('.smart-ignore');
   if(btn.dataset.sure!=='yes'){btn.dataset.sure='yes';btn.textContent='Confirmer l’exclusion';return;}
   btn.disabled=true;
   bridge().smartIgnoreDraft(el.dataset.smartId).then(()=>openDay(account,date))
    .catch(e=>{btn.disabled=false;el.querySelector('.trace-smart-feedback').textContent=e.message;});
  };
 });
 $('#smartResetDay')?.addEventListener('click',()=>{
  const el=$('#smartResetPrompt');el.hidden=false;
  $('#smartResetDay').hidden=true;
 });
 $('#smartCancelReset')?.addEventListener('click',()=>{
  $('#smartResetPrompt').hidden=true;$('#smartResetDay').hidden=false;
 });
 $('#smartConfirmReset')?.addEventListener('click',async()=>{
  if(busy)return;
  const btn=$('#smartConfirmReset');btn.disabled=true;busy=true;
  try{
   await bridge().smartResetDay(account,date,drafts.map(d=>d.id));
   busy=false;openDay(account,date);
  }catch(e){busy=false;btn.disabled=false;$('#smartResetFeedback').textContent=e.message;}
 });
 $('#smartFinishDay')?.addEventListener('click',async()=>{
  const btn=$('#smartFinishDay');btn.disabled=true;
  try{await bridge().markDayChecked(account,date,false);close();
   const toast=$('#traceDayNotice');if(toast){toast.textContent='✓ Journée validée';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),4500);}
  }catch(e){btn.disabled=false;$('#smartFinishMessage').textContent=e.message;}
 });
}
$('#traceSmartFiles')?.addEventListener('change',e=>{
 const files=[...(e.target.files||[])];e.target.value='';
 if(files.length)void loadFiles(files);
});
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const dialog=document.getElementById('traceSmartCategoryCreator');if(dialog){dialog.remove();return;}if(!busy&&!node()?.classList.contains('hidden'))close();});
window.TraceSmartInbox={start,openDay,openUnknown,overview:(accountId)=>{account=accountId;outcome('Opérations en attente');},close};
})();