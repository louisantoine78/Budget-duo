/* TRACE 2.0.2 — Screenshot-to-portfolio import, opt-in and review-first.
 * OCR runs locally in the browser; raw images and OCR text are never persisted.
 * The authenticated host retains exclusive control of all financial writes. */
(function(root,factory){
 const api=factory(root,root.TracePortfolioCaptureParser,root.TraceWealth201Engine);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.TracePortfolioCapture=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root,P,E){
 'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 const cashText=c=>c===null||c===undefined?'':(c/100).toFixed(2).replace('.',',');
 const money=(c,cur)=>c===null||c===undefined?'À compléter':new Intl.NumberFormat('fr-FR',{style:'currency',currency:cur||'EUR'}).format(c/100);
 let accountId='',captureDate='',imageFile=null,imageUrl='',ocrText='',proposal=null,notice='',busy=false;
 const node=id=>root.document.querySelector('#'+id);
 const host=()=>root.Trace201Host;
 function accounts(){
  const c=host()?.context?.();
  if(!c?.active)throw Error('Connecte-toi à TRACE pour importer une capture.');
  const used=new Set(c.operations.map(o=>o.accountId));
  return c.accounts.filter(a=>a.owner===c.viewer&&!a.archived&&a.savingsTracking!=='linked'&&
   !['CELI','Épargne','Livret','Savings'].includes(a.type)&&!used.has(a.id));
 }
 const account=()=>accounts().find(a=>a.id===accountId);
 function current(){
  const a=account();
  if(!a)throw Error('Sélectionne un portefeuille personnel disponible.');
  const p=root.TraceWealth201?.load?.(a);
  if(!p||!E)throw Error('Le suivi des investissements n’est pas accessible.');
  return{a,p};
 }
 function cleanupImage(){
  if(imageUrl&&root.URL?.revokeObjectURL)root.URL.revokeObjectURL(imageUrl);
  imageFile=null;imageUrl='';
 }
 const field=(title,id,value='',type='text',attrs='')=>'<label class="wcap-field">'+esc(title)+
  '<input id="'+id+'" type="'+type+'" value="'+esc(value)+'" '+attrs+'></label>';
 function matches(p,name){
  const label=P.normalized(name);
  const exact=p.positions.filter(s=>P.normalized(s.name)===label);
  if(exact.length===1)return exact[0].id;
  const near=p.positions.filter(s=>label.length>=12&&
    (P.normalized(s.name).startsWith(label)||label.startsWith(P.normalized(s.name))));
  return near.length===1?near[0].id:'';
 }
 function rowHtml(r,i,p){
  const matched=matches(p,r.name),resolved=p.positions.find(x=>x.id===matched);
  const restricted=p.operations.length>0||p.status==='verified';
  const chosen=matched?'id:'+matched:r.truncated||!r.consistent||restricted?'skip':'new';
  const options='<option value="skip" '+(chosen==='skip'?'selected':'')+'>Ne pas modifier</option>'+
   (!restricted?'<option value="new" '+(chosen==='new'?'selected':'')+'>Nouvelle position initiale</option>':'')+
   p.positions.map(s=>'<option value="id:'+esc(s.id)+'" '+(chosen==='id:'+s.id?'selected':'')+'>'+
    'Mettre à jour · '+esc(s.name)+'</option>').join('');
  return '<div class="wcap-row" data-capture-row="'+i+'">'+
   '<div class="wcap-row-head"><strong>Ligne '+(i+1)+'</strong><small>'+
    (r.consistent?'Calcul cohérent':'Valeur à contrôler')+(r.truncated?' · Titre tronqué':'')+'</small></div>'+
   field('Titre','wcapName'+i,resolved&&r.truncated?resolved.name:r.name,'text','maxlength="100"')+
   (r.truncated&&resolved?'<p class="wcap-muted">Titre tronqué retrouvé dans ton portefeuille : '+esc(resolved.name)+'</p>':
    r.truncated?'<p class="wcap-warning">Nom incomplet : complète-le et sélectionne Nouvelle position pour l’ajouter.</p>':'')+
   '<div class="wcap-pair">'+field('Quantité','wcapQuantity'+i,r.quantity,'text','inputmode="decimal"')+
   field('Cours ('+esc(p.currency)+')','wcapPrice'+i,r.price,'text','inputmode="decimal"')+'</div>'+
   '<div class="wcap-pair">'+field('PRU indicatif','wcapPru'+i,r.pru,'text','inputmode="decimal"')+
   field('Date du cours','wcapQuoteDate'+i,r.quoteDate||captureDate,'date','max="'+today()+'"')+'</div>'+
   '<label class="wcap-field">Action<select id="wcapAction'+i+'">'+options+'</select></label>'+
   (r.valuationCents!==null?'<p class="wcap-muted">Valeur lue : '+money(r.valuationCents,p.currency)+'</p>':'')+
   '</div>';
 }
 function render(){
  if(!host()?.openSheet)return;
  let list=[],p=null;
  try{list=accounts();const value=account();if(value)p=root.TraceWealth201.load(value);}
  catch(ex){notice=String(ex.message||ex);}
  const items=list.map(a=>'<option value="'+esc(a.id)+'" '+(a.id===accountId?'selected':'')+'>'+
   esc(a.name)+' · '+esc(a.currency)+'</option>').join('');
  const sum=proposal?.summary;
  const absent=proposal&&p?p.positions.filter(position=>
   !proposal.rows.some(row=>matches(p,row.name)===position.id)):[];
  host().openSheet('Importer un portefeuille',
   '<div id="wcap-root" class="wcap">'+
   '<p class="wcap-intro">Ajoute une capture de ton courtier. TRACE propose les quantités, les cours et les espèces, puis te demande de tout vérifier avant sauvegarde.</p>'+
   (!list.length?'<p class="wcap-alert">Aucun compte de placement personnel compatible. Ajoute d’abord un PEA, un compte-titres ou un REER dans Patrimoine.</p>':
    '<label class="wcap-field">Portefeuille destinataire<select id="wcapAccount">'+items+'</select></label>')+
   field('Date à laquelle tu as consulté le portefeuille','wcapDate',captureDate,'date','max="'+today()+'"')+
   '<div class="wcap-upload"><input id="wcapFile" type="file" accept="image/png,image/jpeg,image/webp" hidden>'+
   '<button type="button" class="w201-btn primary" id="wcapPick">Choisir une capture</button>'+
   '<span class="wcap-muted">'+esc(imageFile?.name||'PNG ou JPEG · maximum 10 Mo')+'</span></div>'+
   (imageUrl?'<img id="wcapImage" src="'+esc(imageUrl)+'" alt="Aperçu local de la capture importée">':'')+
   '<div class="wcap-actions"><button type="button" class="w201-btn" id="wcapOCR" '+(!imageFile||busy?'disabled':'')+'>Lire la capture automatiquement</button></div>'+
   '<p class="wcap-muted">Lecture OCR effectuée sur ton appareil. Si elle échoue, utilise le texte reconnu par Live Text sur iPhone ou corrige les lignes manuellement.</p>'+
   '<label class="wcap-field">Texte reconnu · modifiable<textarea id="wcapText" rows="5" placeholder="Le texte détecté dans la capture apparaîtra ici.">'+esc(ocrText)+'</textarea></label>'+
   '<button type="button" class="w201-btn" id="wcapAnalyze">Analyser le texte</button>'+
   (notice?'<p id="wcapNotice" class="wcap-alert" role="status">'+esc(notice)+'</p>':
    '<p id="wcapNotice" role="status" class="wcap-muted"></p>')+
   (proposal&&p?'<div class="wcap-review"><h3>Vérifier les informations lues</h3>'+
    '<p class="wcap-warning">Capture analysée : '+proposal.rows.length+' ligne(s) détectée(s) · '+p.positions.length+
     ' position(s) déjà suivie(s). Vérifie les lignes ignorées ou absentes : aucune ne sera supprimée automatiquement.</p>'+
    (absent.length?'<p class="wcap-warning">Titres non visibles sur cette capture : '+
      absent.slice(0,6).map(s=>esc(s.name)).join(', ')+(absent.length>6?'…':'')+
      '. Ils restent conservés et leur valeur doit être vérifiée.</p>':'')+
    '<div class="wcap-pair">'+field('Valeur totale du courtier ('+p.currency+')','wcapTotal',cashText(sum.totalCents),'text','inputmode="decimal"')+
    field('Titres ('+p.currency+')','wcapSecurities',cashText(sum.securitiesCents),'text','inputmode="decimal"')+'</div>'+
    field('Espèces ('+p.currency+')','wcapCash',cashText(sum.cashCents),'text','inputmode="decimal"')+
    (sum.partial?'<p class="wcap-warning">Capture partielle : la somme des titres visibles est différente du total des titres affiché.</p>':'')+
    proposal.warnings.map(w=>'<p class="wcap-muted">• '+esc(w)+'</p>').join('')+
    (p.operations.length||p.status==='verified'?
     '<p class="wcap-warning">Ce portefeuille possède un historique ou un rapprochement : les quantités seront enregistrées comme observation. Aucun achat ou vente fictive ne sera créé.</p>':'')+
    '<div class="wcap-rows">'+proposal.rows.map((r,i)=>rowHtml(r,i,p)).join('')+'</div>'+
    '<button type="button" class="w201-btn" id="wcapAddRow">Ajouter une ligne manuellement</button>'+
    '<label class="wcap-approve"><input type="checkbox" id="wcapApprove"> J’ai comparé les valeurs et les quantités avec la capture ; je confirme le compte et la date.</label>'+
    '<label class="wcap-approve"><input type="checkbox" id="wcapOmissionsAck"> Si la capture est partielle ou si une ligne est ignorée, je confirme que les titres absents restent à vérifier et ne doivent pas être supprimés.</label>'+
    '<button type="button" class="w201-btn primary wcap-save" id="wcapSave" '+(busy?'disabled':'')+'>Enregistrer les données vérifiées</button>'+
    '<p class="wcap-muted">Les informations extraites restent un brouillon de suivi jusqu’au rapprochement avec le relevé courtier. Le budget et les soldes bancaires ne changent pas.</p>'+
   '</div>':'')+
   '</div>');
  const a=node('wcapAccount');if(a)a.onchange=()=>{accountId=a.value;render();};
  const d=node('wcapDate');if(d)d.onchange=()=>{captureDate=d.value;if(ocrText)proposal=P.parse(ocrText,captureDate);render();};
  const f=node('wcapFile'),pick=node('wcapPick');
  if(pick)pick.onclick=()=>f.click();
  if(f)f.onchange=()=>{const next=f.files?.[0];
   if(!next)return;
   if(!['image/png','image/jpeg','image/webp'].includes(next.type)||next.size>10*1024*1024||!next.size){
    notice='Choisis une capture PNG, JPEG ou WebP de moins de 10 Mo.';render();return;
   }
   cleanupImage();imageFile=next;imageUrl=root.URL.createObjectURL(next);
   ocrText='';proposal=null;notice='Capture chargée. Lance la lecture, puis vérifie les résultats.';render();
  };
  const textNode=node('wcapText');
  if(textNode)textNode.oninput=()=>{ocrText=textNode.value;};
  const analyze=node('wcapAnalyze');if(analyze)analyze.onclick=()=>{ocrText=node('wcapText')?.value||'';
   proposal=P.parse(ocrText,captureDate);notice='Texte analysé. Compare chaque ligne avec la photo.';render();
  };
  const read=node('wcapOCR');if(read)read.onclick=()=>readOCR();
  const add=node('wcapAddRow');if(add)add.onclick=()=>{if(!proposal)return;
   proposal.rows.push({name:'',quantity:'',price:'',pru:'',quoteDate:captureDate,valuationCents:null,consistent:true,truncated:false});
   render();};
  const save=node('wcapSave');if(save)save.onclick=()=>commit();
 }
 function lazyOCR(){
  if(root.Tesseract?.createWorker)return Promise.resolve(root.Tesseract);
  return new Promise((resolve,reject)=>{
   const script=root.document.createElement('script');
   script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
   script.async=true;script.onload=()=>root.Tesseract?.createWorker?resolve(root.Tesseract):reject(Error('OCR indisponible'));
   script.onerror=()=>reject(Error('Moteur OCR non chargé. Tu peux utiliser le texte Live Text de ton iPhone.'));
   root.document.head.appendChild(script);
  });
 }
 async function readOCR(){
  if(!imageFile||busy)return;
  busy=true;const status=node('wcapNotice');if(status)status.textContent='Lecture locale de la capture en cours…';
  let worker;
  try{
   const T=await lazyOCR();
   worker=await T.createWorker('eng',1,{
    workerPath:new URL('trace-portfolio-ocr-worker.js',root.document.baseURI).href,
    workerBlobURL:false,corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0',
    langPath:'https://tessdata.projectnaptha.com/4.0.0'
   });
   const ret=await worker.recognize(imageFile);
   ocrText=String(ret?.data?.text||'').slice(0,20000);
   proposal=P.parse(ocrText,captureDate);
   notice=proposal.rows.length+' ligne(s) détectée(s). Vérifie soigneusement avant enregistrement.';
  }catch(ex){notice='OCR non disponible : '+String(ex.message||ex)+'. Tu peux coller le texte Live Text ou ajouter les lignes manuellement.';
   if(!proposal)proposal=P.parse('',captureDate);
  }finally{if(worker)await worker.terminate().catch(()=>{});busy=false;render();}
 }
 function collect(){
  if(!imageFile)throw Error('Sélectionne d’abord une capture de portefeuille.');
  const {a,p}=current(),date=node('wcapDate')?.value||captureDate;
  if(!E.dateValid(date)||date>today())throw Error('Date de consultation invalide.');
  if(proposal?.currency&&proposal.currency!==p.currency)throw Error('La capture contient des cours en '+proposal.currency+' mais le compte est en '+p.currency+'. Aucun taux de change n’est estimé.');
  if(node('wcapApprove')?.checked!==true)throw Error('Confirme la comparaison avec la capture.');
  const readMoney=id=>{
   const val=String(node(id)?.value||'').trim();
   if(!val)return null;
   const cents=P.moneyCents(val);
   if(cents===null)throw Error('Montant invalide : '+id+'. Centimes obligatoires.');
   return cents;
  };
  const summary={totalCents:readMoney('wcapTotal'),securitiesCents:readMoney('wcapSecurities'),cashCents:readMoney('wcapCash')};
  if(summary.totalCents!==null&&summary.securitiesCents!==null&&summary.cashCents!==null&&
    summary.totalCents!==summary.securitiesCents+summary.cashCents)
   throw Error('Total, titres et espèces ne correspondent pas. Corrige la lecture avant de sauvegarder.');
  const restricted=p.operations.length>0||p.status==='verified',taken=new Set();
  const rows=proposal.rows.map((source,i)=>{
   const name=String(node('wcapName'+i)?.value||'').trim(),
    quantityRaw=String(node('wcapQuantity'+i)?.value||'').trim(),
    priceRaw=String(node('wcapPrice'+i)?.value||'').trim(),
    pruRaw=String(node('wcapPru'+i)?.value||'').trim(),
    quoteDate=String(node('wcapQuoteDate'+i)?.value||'').trim(),
    action=String(node('wcapAction'+i)?.value||'skip');
   if(action==='skip')return{name,action:'skip'};
   if(!name||name.length>100||name.includes('…')||name.includes('...'))
    throw Error('Complète le nom du titre de la ligne '+(i+1)+'.');
   const qty=E.quantity(quantityRaw),price=E.price(priceRaw);
   if(!qty||!price)throw Error('Quantité et cours strictement positifs, ligne '+(i+1)+'.');
   if(!E.dateValid(quoteDate)||quoteDate>date||quoteDate>today())
    throw Error('Vérifie la date du cours de la ligne '+(i+1)+'.');
   const cost=pruRaw?E.tradeCents(qty,E.price(pruRaw)):null;
   if(action==='new'&&restricted)throw Error('Historique existant : aucune position initiale ne peut être ajoutée.');
   if(action!=='new'&&!action.startsWith('id:'))throw Error('Action de position inconnue.');
   const id=action==='new'?'new:'+P.normalized(name):action.slice(3);
   if(taken.has(id))throw Error('Une même position figure plusieurs fois dans cet import.');
   taken.add(id);
   if(action.startsWith('id:')&&!p.positions.some(s=>s.id===id))
    throw Error('La position cible a changé : recommence l’import.');
   if(action==='new'&&matches(p,name))
    throw Error('Un titre semblable existe déjà : associe la ligne au titre présent, sans créer de doublon.');
   return{name,action,quantityMicro:qty,priceUnits:price,costBasisCents:cost,quoteDate};
  });
  const ignored=rows.filter(x=>x.action==='skip'&&x.name);
  if((proposal.summary.partial||ignored.length)&&node('wcapOmissionsAck')?.checked!==true)
   throw Error('Capture partielle ou '+ignored.length+' ligne(s) ignorée(s) : confirme explicitement les omissions avant de sauvegarder.');
  if(!rows.some(x=>x.action!=='skip')&&summary.totalCents===null&&summary.cashCents===null)
   throw Error('Aucune donnée vérifiée à enregistrer.');
  return{a,p,date,summary,rows,restricted};
 }
 async function commit(){
  if(busy)return;
  const button=node('wcapSave'),status=node('wcapNotice');
  try{
   const data=collect(),{a,p,date,summary,rows,restricted}=data;
   let next={...p,positions:p.positions.map(x=>({...x})),catalog:(p.catalog||[]).map(x=>({...x}))};
   const reviews=[],seen=new Set(),applied=[];
   for(const row of rows){
    if(row.action==='skip'){if(row.name)reviews.push({name:row.name,status:'non modifié'});continue;}
    const id=row.action==='new'?('w201_cap_'+Date.now().toString(36)+'_'+(reviews.length+1)):row.action.slice(3);
    if(seen.has(id))throw Error('Ligne dupliquée.');seen.add(id);
    const before=E.evaluate(next).positions.find(x=>x.id===id);
    const different=before&&before.quantityMicro!==row.quantityMicro;
    if(row.action==='new'){
     const base=P.normalized(row.name).replace(/ /g,'_').slice(0,15)||'TITRE';
     let symbol=base,n=1;
     while(next.catalog.some(s=>s.symbol===symbol)){symbol=base.slice(0,11)+'_'+n++;if(n>99)throw Error('Symbole non unique');}
     const item={id,name:row.name,symbol,assetType:/ETF|UCITS/i.test(row.name)?'ETF':'Action',
       isin:'',marketMic:'',sector:'',geography:'',quantityMicro:row.quantityMicro,
       costBasisCents:row.costBasisCents,strategy:{}};
     next.positions.push(item);next.catalog.push(item);
     applied.push(row.name+' · nouvelle position');
    }else if(!restricted){
     const orig=next.positions.find(s=>s.id===id);
     const cost=row.costBasisCents===null&&different?null:row.costBasisCents===null?orig.costBasisCents:row.costBasisCents;
     next.positions=next.positions.map(s=>s.id===id?{...s,quantityMicro:row.quantityMicro,costBasisCents:cost}:s);
     next.catalog=next.catalog.map(s=>s.id===id?{...s,quantityMicro:row.quantityMicro,costBasisCents:cost}:s);
     applied.push(row.name+' · quantité revue');
    }else{
     applied.push(row.name+' · cours seulement');
    }
    next=E.setQuote(next,id,{priceUnits:row.priceUnits,date:row.quoteDate,source:'Capture courtier confirmée le '+date,kind:'différé'});
    reviews.push({id,name:row.name,quantityMicro:row.quantityMicro,quoteDate:row.quoteDate,
     status:restricted&&different?'Écart de quantité : opérations à rapprocher':'capturé'});
   }
   if(summary.cashCents!==null&&!restricted){
    next={...next,openingCashCents:summary.cashCents,openingCashConfirmed:true};
    applied.push('Espèces confirmées');
   }
   // Preserve previous reconciliation evidence while withholding verified totals until reviewed.
   if(applied.length)next={...next,status:'draft'};
   const missingPositions=summary.securitiesCents!==null&&
    (proposal.summary.partial||reviews.filter(x=>x.status==='capturé').length<next.positions.length);
   next={...next,brokerCapture:{
    date,source:'Capture de portefeuille confirmée',currency:p.currency,
    cashCents:summary.cashCents,securitiesCents:summary.securitiesCents,
    totalCents:summary.totalCents,partial:!!missingPositions,
    rows:reviews.slice(0,50),requiresReconciliation:true
   }};
   E.evaluate(next);
   if(button){button.disabled=true;button.textContent='Enregistrement sécurisé…';}
   busy=true;
   // CAS-protected, owner-scoped existing TRACE save; no bypass or direct Supabase calls.
   await host().save(a.id,next);
   busy=false;
   host().openSheet('Capture de portefeuille enregistrée',
    '<div class="wcap"><h3>Import contrôlé enregistré</h3>'+
    '<p>Portefeuille : <strong>'+esc(a.name)+'</strong></p>'+
    '<p>Référence courtier : <strong>'+money(summary.totalCents,a.currency)+'</strong></p>'+
    '<p>'+next.positions.length+' position(s) suivie(s) au total · '+
     reviews.filter(x=>x.status==='non modifié').length+' ligne(s) ignorée(s) sur cette capture.</p>'+
    '<p>'+applied.length+' information(s) appliquée(s). Les lignes absentes restent inchangées et aucune transaction fictive n’a été créée.</p>'+
    '<p class="wcap-warning">Le suivi reste à rapprocher : cette capture ne valide pas automatiquement le patrimoine net.</p>'+
    '<button type="button" class="w201-btn primary" id="wcapOpenAccount">Voir le suivi du portefeuille</button></div>');
   const openAccount=node('wcapOpenAccount');if(openAccount)openAccount.onclick=()=>root.TraceWealth201.open(a.id);
   // Revoke only after the preview image has been detached from the sheet.
   cleanupImage();
  }catch(ex){busy=false;
   if(status)status.textContent='Import non enregistré : '+String(ex.message||ex);
   if(button){button.disabled=false;button.textContent='Enregistrer les données vérifiées';}
  }
 }
 function open(){
  if(!P||!E||!host()?.openSheet||!root.TraceWealth201?.load)throw Error('Module Patrimoine incomplet.');
  cleanupImage();notice='';ocrText='';proposal=null;captureDate=today();
  const list=accounts();accountId=list[0]?.id||'';
  render();
 }
 return Object.freeze({open});
});
