(()=>{'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
async function readDocument(file){
 const target=$('#importResult');
 target.innerHTML='<article class="card"><b>Lecture sur cet appareil…</b><div class="empty-note" id="readProgress"></div></article>';
 try{
  const extracted=await window.TraceBankDocuments.extract(file,msg=>{const e=$('#readProgress');if(e)e.textContent=msg;});
  showDocumentReview(file,extracted);
 }catch(error){target.innerHTML='<div class="empty-note">'+esc(error.message)+'</div>';}
}
function showDocumentReview(file,data){
 const root=$('#importResult');
 const accounts=window.TraceBankBridge.accounts();
 root.innerHTML='<article class="card"><b>'+esc(file.name)+'</b><div class="empty-note">Texte détecté localement : corrige-le puis vérifie les montants avant import.</div>'+
 '<textarea id="docText" class="input" style="width:100%;min-height:140px;font-size:16px">'+esc(data.text)+'</textarea>'+
 '<label class="label2">Compte</label><select class="input" id="docAccount">'+accounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join('')+'</select>'+
 '<label class="label2">Format de date</label><select class="input" id="docFormat"><option value="dmy">JJ/MM/AAAA</option><option value="mdy">MM/JJ/AAAA</option></select>'+
 '<button id="docParse" class="primary full" style="margin-top:10px">Préparer les lignes</button><div id="docRows"></div></article>';
 $('#docParse').onclick=()=>renderCandidateRows(file,data);
 $('#docParse').click();
}
function renderCandidateRows(file,data){
 const parsed=window.TraceBankDocuments.extractCandidates($('#docText').value,$('#docFormat').value);
 const since=window.TraceBankBridge.referenceDate();
 const excluded=parsed.candidates.filter(r=>since&&r.date<since);
 const eligible=parsed.candidates.filter(r=>!since||r.date>=since);
 const records=eligible.slice(0,50);
 const node=$('#docRows');
 node.innerHTML='<div class="empty-note" style="margin:10px 0">'+records.length+' ligne(s) proposées à vérifier. '+excluded.length+' antérieure(s) au '+(since||'début du suivi')+' écartée(s). '+(parsed.skippedPayments||0)+' paiement(s) de carte écarté(s). '+(eligible.length>50?'Limite de 50 nouvelles lignes par passage.':'')+' Vérifie le sens des crédits et les doublons.</div>'+
 records.map(r=>'<div class="trace-doc-row"><label><input type="checkbox" class="docSelected" '+(r.selected?'checked':'')+'> Inclure</label>'+
 '<div class="formrow"><div><label class="label2">Date</label><input type="date" class="input docDate" value="'+esc(r.date)+'"></div>'+
 '<div><label class="label2">Type</label><select class="input docType"><option value="expense" '+(r.type==='expense'?'selected':'')+'>Dépense</option><option value="income" '+(r.type==='income'?'selected':'')+'>Revenu</option><option value="refund">Remboursement</option></select></div></div>'+
 '<input class="input docName" maxlength="80" value="'+esc(r.name)+'" aria-label="Description">'+
 '<input class="input docAmount" type="number" inputmode="decimal" min="0.01" step="0.01" value="'+esc(r.amount)+'" aria-label="Montant CAD">'+
 '<small>'+esc(r.raw)+'</small></div>').join('')+
 (records.length?'<button class="primary full" id="docSave" style="margin-top:14px">Importer vers À valider</button>':'<div class="empty-note">Aucune ligne reconnaissable. Corrige le texte ou utilise un CSV.</div>')+
 '<div class="trace-feedback" id="docError"></div>';
 if(!records.length)return;
 $('#docSave').onclick=async()=>{
 const rows=[...node.querySelectorAll('.trace-doc-row')].filter(el=>el.querySelector('.docSelected').checked).map(el=>({
 date:el.querySelector('.docDate').value,name:el.querySelector('.docName').value,
 amount:Number(el.querySelector('.docAmount').value),type:el.querySelector('.docType').value
 }));
 if(!rows.length){$('#docError').textContent='Sélectionne des opérations.';return;}
 if(rows.some(r=>!r.date||!r.name||!Number.isFinite(r.amount)||r.amount<=0)){$('#docError').textContent='Complète toutes les lignes sélectionnées.';return;}
 $('#docSave').disabled=true;
 try{
 const saved=await window.TraceBankBridge.submit(rows,$('#docAccount').value,file.name,data.ocrPages?'ocr':'pdf');
 $('#importResult').innerHTML='<div class="empty-note">'+saved.added+' opération(s) ajoutée(s) à À valider. '+saved.duplicates+' doublon(s) évité(s).</div>';
 }catch(e){$('#docSave').disabled=false;$('#docError').textContent=esc(e.message);}
 };
}
document.addEventListener('change',e=>{
 if(e.target?.id!=='importFile')return;
 const input=e.target,file=input.files?.[0];
 if(!file||/\.csv$/i.test(file.name)||file.type==='text/csv')return;
 e.preventDefault();e.stopImmediatePropagation();input.value='';
 void readDocument(file);
},true);
})();