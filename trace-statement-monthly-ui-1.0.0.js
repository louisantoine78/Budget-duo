/* TRACE 5.37.0 — Local monthly PDF statement review (candidate lab only).
 * No automatic PDF text extraction: the account holder transcribes and checks
 * EVERY bank movement, with page/line and original excerpt. No remote requests,
 * storage, Supabase writes, automatic transaction creation or implicit approval.
 */
(function(root){'use strict';
 const MAX_FILE=12*1024*1024,MAX_ROWS=250;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
 const money=(n,c)=>Number.isFinite(Number(n))?
  Number(n).toFixed(2).replace('.',',')+' '+esc(c):'À vérifier';
 const dateISO=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))&&
  !Number.isNaN(new Date(s+'T12:00:00Z').getTime())&&
  new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 const el=(host,id)=>host.querySelector('#'+id);
 const stableFilename=s=>String(s||'').slice(0,120);
 function monthBoundaries(month){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month||'')))return null;
  const [year,mm]=month.split('-').map(Number);
  return{from:month+'-01',to:year+'-'+String(mm).padStart(2,'0')+'-'+
    String(new Date(Date.UTC(year,mm,0)).getUTCDate()).padStart(2,'0')};
 }
 // Entire workflow is in local, temporary memory; nothing is persisted.
 function mount({host,accounts,transactions,amountOnAccount,onOpenActivity,currentMonth}={}){
  if(!host||typeof accounts!=='function'||typeof transactions!=='function'||
   typeof amountOnAccount!=='function')return null;
  if(host.dataset.traceStatementMounted==='true')return null;
  host.dataset.traceStatementMounted='true';
  let file=null,url=null,staged=null,verified=null,report=null;
  const initialMonth=typeof currentMonth==='function'?currentMonth():currentMonth;
  const period=monthBoundaries(initialMonth)||monthBoundaries(new Date().toISOString().slice(0,7));
  host.innerHTML='<div class="trace-statement-heading"><strong>Contrôle mensuel du relevé PDF</strong>'+
   '<p>Ce laboratoire ne lit pas automatiquement les lignes PDF. Ouvre le relevé localement, retranscris <b>toutes</b> ses opérations, vérifie la page et la ligne, puis compare-les avec TRACE. Aucun mouvement n’est créé.</p></div>'+
   '<div class="trace-statement-grid">'+
    '<label>Compte du relevé<select class="input" id="traceStatementAccount"></select></label>'+
    '<label>Début de période<input class="input" type="date" id="traceStatementFrom" value="'+period.from+'"></label>'+
    '<label>Fin de période<input class="input" type="date" id="traceStatementTo" value="'+period.to+'"></label>'+
    '<label>Nombre total de mouvements sur le PDF<input class="input" type="number" min="1" max="'+MAX_ROWS+'" step="1" inputmode="numeric" id="traceStatementCount" value="1"></label>'+
   '</div>'+
   '<label class="trace-statement-file-label">Relevé mensuel (PDF, 12 Mo maximum)'+
    '<input type="file" class="input" id="traceStatementFile" accept=".pdf,application/pdf"></label>'+
   '<p id="traceStatementLocalFile" class="trace-statement-note" role="status">Aucun document choisi. Le fichier ne sera pas téléversé.</p>'+
   '<div class="trace-statement-rows-head"><strong>Lignes du relevé à vérifier</strong>'+
    '<button type="button" class="secondary" id="traceStatementAdd">+ Une ligne</button></div>'+
   '<div id="traceStatementRows" class="trace-statement-rows"></div>'+
   '<button type="button" class="primary full" id="traceStatementPrepare">Préparer les vérifications</button>'+
   '<p id="traceStatementNotice" class="trace-statement-notice" role="status" aria-live="polite"></p>'+
   '<div id="traceStatementReview"></div><div id="traceStatementResults"></div>'+
   '<p class="trace-statement-disclaimer">Aucune garantie de couverture à 100 % : TRACE ne sait pas si une ligne du PDF a été oubliée. Les preuves sont relues et attestées manuellement.</p>';
  const accountNode=el(host,'traceStatementAccount'),
   fromNode=el(host,'traceStatementFrom'),toNode=el(host,'traceStatementTo'),
   countNode=el(host,'traceStatementCount'),fileNode=el(host,'traceStatementFile'),
   rowsNode=el(host,'traceStatementRows'),reviewNode=el(host,'traceStatementReview'),
   reportNode=el(host,'traceStatementResults'),notice=el(host,'traceStatementNotice'),
   fileInfo=el(host,'traceStatementLocalFile');
  const clearReview=()=>{
   staged=null;verified=null;report=null;
   reviewNode.innerHTML='';reportNode.innerHTML='';
  };
  const say=(message,warning=false)=>{notice.textContent=message;notice.dataset.status=warning?'warning':'info';};
  const getAccounts=()=>accounts().filter(a=>a&&!a.archived&&
   ['checking','card'].includes(a.type||a.accountType));
  const syncAccounts=()=>{
   const before=accountNode.value,list=getAccounts();
   accountNode.innerHTML='<option value="">Choisir un compte bancaire</option>'+
    list.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name||a.id)+' · '+
     esc(a.currency||'CAD')+'</option>').join('');
   if(list.some(a=>a.id===before))accountNode.value=before;
  };
  const addRow=()=>{
   const count=rowsNode.querySelectorAll('.trace-statement-row').length;
   if(count>=MAX_ROWS){say('Maximum '+MAX_ROWS+' lignes dans ce contrôle manuel.',true);return;}
   rowsNode.insertAdjacentHTML('beforeend',
    '<div class="trace-statement-row" data-statement-row><div class="trace-statement-row-title">'+
    '<strong>Mouvement #'+(count+1)+'</strong><button type="button" class="linkbtn" data-statement-remove>Retirer</button></div>'+
    '<div class="trace-statement-grid">'+
     '<label>Page PDF<input class="input" data-field="page" type="number" inputmode="numeric" min="1" step="1" value="1"></label>'+
     '<label>Numéro de ligne sur la page<input class="input" data-field="line" type="number" inputmode="numeric" min="1" step="1" value="'+(count+1)+'"></label>'+
     '<label>Date de l’opération<input class="input" data-field="date" type="date"></label>'+
     '<label>Sens<select class="input" data-field="direction"><option value="">Choisir</option><option value="out">Débit · argent sorti</option><option value="in">Crédit · argent reçu</option></select></label>'+
     '<label>Montant dans la devise du compte<input class="input" data-field="amount" type="text" inputmode="decimal" placeholder="Ex. 54,90"></label>'+
     '<label>Libellé bancaire<input class="input" data-field="name" maxlength="120" type="text" placeholder="Libellé sur le PDF"></label>'+
    '</div>'+
    '<label>Extrait exact du PDF (preuve de cette ligne)<textarea class="input" data-field="rawText" maxlength="500" rows="2" placeholder="Copie du texte ou recopie fidèle de la ligne bancaire"></textarea></label>'+
    '</div>');
   clearReview();
  };
  const rows=()=>[...rowsNode.querySelectorAll('[data-statement-row]')].map(row=>{
   const f=name=>row.querySelector('[data-field="'+name+'"]').value;
   return{page:f('page'),line:f('line'),date:f('date'),
    direction:f('direction'),amount:f('amount'),name:f('name'),
    rawText:f('rawText')};
  });
  const selectedAccount=()=>getAccounts().find(a=>a.id===accountNode.value);
  function renderReview(){
   if(!staged)return;
   reviewNode.innerHTML='<div class="trace-statement-stage"><h3>Vérification des preuves</h3>'+
   '<p>'+staged.ready.length+' ligne(s) normalisée(s) · '+staged.issues.length+
   ' erreur(s). Vérifie une par une les dates, montants, sens, pages et extraits.</p>'+
   (staged.issues.length?staged.issues.map(x=>'<p class="trace-statement-issue">Ligne '+
    (x.index+1)+' : '+esc(x.reason)+'</p>').join(''):'')+
   staged.ready.map((x,index)=>
    '<label class="trace-statement-confirm"><input type="checkbox" data-statement-approve="'+index+'">'+
    '<span><b>Page '+x.page+', ligne '+x.line+' · '+esc(x.date)+
    ' · '+esc(x.direction==='in'?'Crédit':'Débit')+' '+money(x.amount,staged.currency)+
    '</b><small>'+esc(x.name||'Sans libellé')+' — '+esc(x.rawText)+'</small></span></label>'
   ).join('')+
   '<label class="trace-statement-attest"><input type="checkbox" id="traceStatementAttest">'+
    '<span>J’ai vérifié la totalité des mouvements de ce PDF et recopié chaque ligne sans omission.</span></label>'+
   '<button class="primary full" type="button" id="traceStatementCompare">Comparer les lignes vérifiées à TRACE</button>'+
   '<p class="trace-statement-note">Une case cochée approuve uniquement la preuve affichée. Toute modification des champs oblige à recommencer.</p></div>';
   el(host,'traceStatementCompare').onclick=runCompare;
  }
  function renderReport(result){
   const t=result.totals;
   const lineTitle={matched:'Correspondance unique',pending:'Présente mais à valider',
    ambiguous:'Ambiguë · contrôle nécessaire',missing:'Introuvable dans TRACE'};
   reportNode.innerHTML='<div class="trace-statement-report" aria-live="polite">'+
    '<h3>Rapport de contrôle · '+esc(result.currency)+'</h3>'+
    '<p>'+esc(result.fromDate)+' au '+esc(result.toDate)+
    ' · lignes retranscrites manuellement, comparées en lecture seule.</p>'+
    '<div class="trace-statement-stats">'+
     [['Correspondances',t.matched],['Manquantes',t.missing],
      ['À valider',t.pending],['Ambiguës',t.ambiguous],
      ['Présentes uniquement dans TRACE',t.notOnStatement]].map(([name,n])=>
      '<div><span>'+esc(name)+'</span><strong>'+n+'</strong></div>').join('')+
    '</div>'+
    (result.lines.length?result.lines.map(x=>
      '<div class="trace-statement-result-line"><span><b>'+esc(x.date)+' · '+
       esc(x.name||'Ligne du PDF')+'</b><small>'+esc(x.direction==='in'?'Crédit':'Débit')+
       ' '+money(x.amount,result.currency)+'</small></span><strong data-state="'+
       esc(x.status)+'">'+esc(lineTitle[x.status]||'À contrôler')+'</strong></div>'
    ).join(''):'')+
    (result.notOnStatement.length?'<h4>Opérations TRACE non retrouvées sur le relevé</h4>'+
      result.notOnStatement.map(x=>'<div class="trace-statement-result-line"><span>'+
       '<b>'+esc(x.name||'Opération TRACE')+'</b><small>'+esc(x.date)+
       ' · '+money(x.amount,result.currency)+'</small></span><strong>À vérifier</strong></div>'
      ).join(''):'')+
    '<div class="trace-statement-report-warning">Rapport indicatif : aucune ligne du PDF n’a été extraite automatiquement. Même si toutes les lignes saisies correspondent, le relevé complet n’est pas certifié.</div>'+
    '<button type="button" class="secondary full" id="traceStatementOpenActivity">Voir les transactions du compte</button>'+
    '</div>';
   el(host,'traceStatementOpenActivity').onclick=()=>{
    if(typeof onOpenActivity==='function')onOpenActivity(result.accountId,result.fromDate.slice(0,7));
   };
  }
  function prepare(){
   clearReview();
   if(!file){say('Choisis d’abord un PDF bancaire valide.',true);return;}
   const account=selectedAccount(),from=fromNode.value,to=toNode.value,
    total=Number(countNode.value),values=rows();
   if(!account||!dateISO(from)||!dateISO(to)||from>to){
    say('Choisis un compte et une période de relevé cohérente.',true);return;
   }
   if(!Number.isSafeInteger(total)||total<1||total>MAX_ROWS||total!==values.length){
    say('Le nombre de lignes déclaré doit être exactement égal aux mouvements recopiés ('+
     values.length+').',true);return;
   }
   const E=root.TraceStatementEvidence;
   if(!E){say('Module de preuves non chargé. Aucun contrôle exécuté.',true);return;}
   try{
    const currency=String(account.currency||'CAD').toUpperCase();
    staged=E.stage({documentId:file.name+' · '+file.size+' octets',accountId:account.id,
     currency,fromDate:from,toDate:to,
     rows:values.map(v=>({...v,currency}))});
    if(staged.issues.length){
     say('Des lignes sont à corriger. Aucun rapport ne peut être calculé.',true);
    }else{
     say('Preuves préparées. Coche chaque ligne après l’avoir comparée au PDF.');
    }
    renderReview();
   }catch(error){say(error.message||'Préparation impossible.',true);}
  }
  function runCompare(){
   if(!file||!staged||!selectedAccount()){say('Recommence depuis le PDF.',true);return;}
   if(!el(host,'traceStatementAttest')?.checked){
    say('Atteste que toutes les lignes du PDF ont été retranscrites et vérifiées.',true);return;
   }
   const E=root.TraceStatementEvidence,C=root.TraceStatementReconcile;
   if(!E||!C){say('Moteur de comparaison indisponible.',true);return;}
   const approvals=staged.ready.map((row,index)=>({
    id:row.id,evidenceKey:row.evidenceKey,
    confirmed:el(host,'traceStatementReview').querySelector(
     '[data-statement-approve="'+index+'"]')?.checked===true
   }));
   try{
    verified=E.compareReviewed({staged,approvals,account:{
      ...selectedAccount(),currency:String(selectedAccount().currency||'CAD').toUpperCase()},
     transactions:transactions(),amountOnAccount,
     comparator:C.compare,dateTolerance:2});
    if(verified.status!=='comparison_ready'){
     say(verified.reason||'Certaines preuves ne sont pas confirmées.',true);
     reportNode.innerHTML='';return;
    }
    report=verified.report;
    renderReport(report);
    say('Rapport établi en lecture seule. Aucun enregistrement ou changement budgétaire.');
   }catch(error){say(error.message||'Comparaison impossible.',true);reportNode.innerHTML='';}
  }
  const invalidate=(event)=>{
   if(event.target.closest('#traceStatementReview'))return;
   if(event.target.closest('#traceStatementResults'))return;
   if(event.target.closest('#traceStatementPrepare'))return;
   if(event.target.closest('#traceStatementFile'))return;
   clearReview();
  };
  host.addEventListener('input',invalidate);
  host.addEventListener('change',invalidate);
  host.addEventListener('click',event=>{
   if(event.target.closest('#traceStatementAdd')){addRow();return;}
   const remove=event.target.closest('[data-statement-remove]');
   if(remove){remove.closest('[data-statement-row]')?.remove();
    [...rowsNode.querySelectorAll('[data-statement-row]')].forEach((row,index)=>
     row.querySelector('.trace-statement-row-title strong').textContent=
      'Mouvement #'+(index+1));
    clearReview();
   }
  });
  fileNode.onchange=async()=>{
   clearReview();file=null;
   if(url){root.URL?.revokeObjectURL?.(url);url=null;}
   fileInfo.textContent='Vérification du document local…';
   const picked=fileNode.files?.[0];
   if(!picked){fileInfo.textContent='Aucun PDF choisi.';return;}
   if(picked.size<=0||picked.size>MAX_FILE||!/\.pdf$/i.test(picked.name)||
      (picked.type&&picked.type!=='application/pdf')){
    fileInfo.textContent='PDF invalide ou supérieur à 12 Mo.';return;
   }
   try{
    const bytes=new Uint8Array(await picked.slice(0,5).arrayBuffer());
    if(String.fromCharCode(...bytes)!=='%PDF-')throw Error('Signature PDF invalide');
    file=picked;
    url=root.URL?.createObjectURL?.(picked)||null;
    fileInfo.innerHTML='Fichier local : <b>'+esc(stableFilename(picked.name))+'</b>'+
      (url?' · <a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+
       'Ouvrir le PDF pour vérifier les lignes</a>':' · Ouvre le PDF dans Fichiers');
    say('PDF reconnu. Les lignes ne sont pas extraites : saisis-les ci-dessous.');
   }catch(e){fileInfo.textContent='Lecture ou signature du PDF non prise en charge.';
    say('Ce PDF ne peut pas être utilisé pour ce contrôle.',true);}
  };
  el(host,'traceStatementPrepare').onclick=prepare;
  syncAccounts();addRow();
  return Object.freeze({getReport:()=>report,
   dispose(){if(url)root.URL?.revokeObjectURL?.(url);
    file=null;url=null;clearReview();host.dataset.traceStatementMounted='false';}});
 }
 root.TraceMonthlyStatementUI=Object.freeze({mount,monthBoundaries});
})(typeof window!=='undefined'?window:globalThis);
