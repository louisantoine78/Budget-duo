'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const context={window:{},document:{},console};
vm.runInNewContext(read('trace-bank-doc-1.11.1.js'),context,{timeout:1500});
const D=context.window.TraceBankDocuments;
const tsv=items=>['level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',
 ...items.map(([text,left,top,width],i)=>[5,1,1,1,1,i+1,left,top,width,35,93,text].join('\t'))].join('\n');

test('Cropped top: keep first Desjardins row and dated signed transactions',()=>{
 const rows=[['Virement',205,46,170],['test',380,46,85],['-',803,46,15],['43,00',820,46,136],
 ['9',206,178,20],['NOV',243,178,87],
 ['Achat',205,325,110],['Alimentation',320,325,200],['-',807,324,12],['10,54',822,324,135],
 ['9',206,457,20],['NOV',243,457,87],
 ['Versement',205,1881,180],['test',390,1881,80],['+',807,1880,12],['130,00',824,1880,140],
 ['4',206,1954,20],['NOV',243,1954,87]];
 const out=D.screenshotLayoutCandidates(tsv(rows),1179,2263,'2026-11-11');
 assert.equal(out.length,3);
 assert.equal(out[0].name,'Virement test');
 assert.equal(out[0].date,'2026-11-09');
 assert.equal(out[0].bankDirection,'out');
 assert.equal(out[2].bankDirection,'in');
});
test('Date below multiline November 11 card payment; preserve comma-less OCR uncertainty',()=>{
 const rows=[['Novembre',92,53,225],['2026',328,53,99],
 ['Paiement',205,197,190],['facture',401,197,150],['-',808,194,12],['51984$',824,194,136],
 ['AccèsD',205,255,134],['Internet',205,316,130],['Mastercard',205,375,200],
 ['11',206,446,36],['NOV',255,446,84],
 ['Achat',205,593,100],['Boutique',310,593,200],['-',807,592,12],['21730$',824,592,136],
 ['9',206,725,20],['NOV',243,725,87]];
 const out=D.screenshotLayoutCandidates(tsv(rows),1179,1377,'2026-11-11');
 assert.equal(out.length,2);
 assert.equal(out[0].date,'2026-11-11');
 assert.equal(out[0].name,'Paiement facture AccèsD Internet Mastercard');
 assert.equal(out[0].bankDirection,'out');
 assert.equal(D.priceEvidence('-51984$').amount,519.84);
 assert.equal(D.priceEvidence('-51984$').explicit,false);
 assert.equal(out.filter(r=>r.date==='2026-11-11').length,1);
});
test('If OCR coordinates are missing, dates and complete merchants are recoverable but unvalued',()=>{
 const data=['Novembre 2026','Paiement facture','AccesD Internet',
 'World Elite Mastercard','11 NOV','Achat alimentation','9 NOV'].join('\n');
 const out=D.extractCandidates(data);
 assert.equal(out.candidates.length,2);
 assert.match(out.candidates[0].name,/Paiement facture AccesD Internet/);
 assert.equal(out.candidates[0].amount,'');
 assert.equal(out.candidates[0].selected,false);
 assert.equal(out.candidates[0].date,'2026-11-11');
});
test('Safari uses same-origin OCR worker without loosening CSP',()=>{
 const doc=read('trace-bank-doc-1.11.1.js'),worker=read('trace-ocr-worker-5.1.1.js'),html=read('index.html');
 assert.ok(doc.includes("workerPath:'/trace-ocr-worker-5.1.1.js',workerBlobURL:false"));
 assert.ok(worker.includes("importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js')"));
 assert.ok(html.includes("worker-src 'self'"));
 assert.ok(!html.includes("worker-src 'self' blob:"));
 assert.ok(html.includes('trace-bank-doc-1.11.1.js?v=1.11.6'));
 assert.ok(html.includes('trace-bank-ui-5.37.0.js?v=1.11.6'));
 assert.ok(html.includes('trace-smart-inbox-3.5.0.js?v=1.11.6'));
});
