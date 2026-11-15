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
 assert.ok(html.includes('trace-bank-doc-1.11.1.js?v=1.11.7'));
 assert.ok(html.includes('trace-bank-ui-5.37.0.js?v=1.11.6'));
 assert.ok(html.includes('trace-smart-inbox-3.5.0.js?v=1.11.6'));
});


test('Monthly header and total are excluded; all eight dated operations survive',()=>{
 // Synthetic word coordinates reproduce the financial layout, not the user's image.
 const rows=[
  ['3',206,317,18],['NOV',241,316,88],
  ['Cardicare',207,465,202],['Health',429,465,135],['+28,70$',809,462,175],
  ['3',206,537,18],['NOV',241,536,88],
  ['Chrono-Recharge',207,685,382],['Opus',608,686,112],['110,00$',814,682,170],
  ['2',206,757,18],['NOV',241,756,87],
  ['Live-Tennis-Api',208,906,328],['1453S',842,902,142],
  ['2',206,977,18],['NOV',241,976,87],
  ['Cardicare',207,1125,202],['Health',429,1125,135],['2867S',837,1122,147],
  ['2',206,1197,18],['NOV',241,1196,87],
  ['Dunkin',208,1338,147],['519$S',869,1342,115],
  ['1',205,1417,11],['NOV',235,1416,87],
  ['Petro-Canada',208,1565,294],['30,00$',825,1562,159],
  ['1',205,1637,11],['NOV',235,1636,87],
  ['Total',97,1785,116],['+78,18',795,1794,144],['$',957,1789,27],
  ['Facturées',101,2030,260],['en',380,2043,63],['octobre',464,2029,211],['2026',695,2031,131],
  ['Market',208,2173,145],['Basket',371,2173,138],['9295S',860,2170,125],
  ['31',206,2245,32],['OCT',256,2244,85],
  ['Trader',205,2393,135],['Joe',356,2394,74],['S',448,2394,24],['716S',873,2390,111],
  ['31',206,2465,32],['OCT',256,2464,85]
 ];
 const out=D.screenshotLayoutCandidates(tsv(rows),1179,2556,'2026-11-15');
 assert.equal(out.length,8,'total and month heading are not transactions');
 assert.deepEqual(Array.from(out.map(x=>x.date)),
  ['2026-11-03','2026-11-02','2026-11-02','2026-11-02',
   '2026-11-01','2026-11-01','2026-10-31','2026-10-31']);
 assert.deepEqual(Array.from(out.map(x=>x.name)),
  ['Cardicare Health','Chrono-Recharge Opus','Live-Tennis-Api',
   'Cardicare Health','Dunkin','Petro-Canada','Market Basket','Trader Joe S']);
 assert.ok(out.every(x=>!/(?:total|facturées en octobre)/i.test(x.name)));
 assert.equal(out[6].columnRaw,'9295S','missing comma is raw OCR evidence only');
 assert.equal(out[6].amount,'','full price must be re-read before approval');
});
test('Screenshot UI headings and summary labels are not treated as merchants',()=>{
 for(const header of ['Novembre 2026','Octobre 2026','Facturées en octobre 2026',
  'Facturées en octobre','En octobre 2026','Transactions','Opérations','En attente']){
  assert.equal(D.screenshotNonTransactionKind(header),'header',header);
 }
 for(const value of ['Total','Total +78,18 $','Sous-total 78,18 $',
  'Montant total 3 010,00 €','Solde courant 560,00 €']){
  assert.equal(D.screenshotNonTransactionKind(value),'summary',value);
 }
 for(const transaction of ['TotalEnergies','Facture Restaurant','Market Basket',
  'Trader Joe S','Paiement facture AccèsD Internet','Comptoir du Marché']){
  assert.equal(D.screenshotNonTransactionKind(transaction),'',transaction);
 }
});
test('Text-only fallback excludes summary and month header without losing Market Basket',()=>{
 const text=['3 NOV','Total +78,18 $','Facturées en octobre 2026',
  'Market Basket','9,29 $','31 OCT','Trader Joe S','7,16 $','31 OCT'].join('\n');
 const res=D.extractScreenshotDateBlocks(text,'2026-11-15');
 assert.equal(res.candidates.length,2);
 assert.deepEqual(Array.from(res.candidates.map(x=>x.name)),['Market Basket','Trader Joe S']);
 assert.deepEqual(Array.from(res.candidates.map(x=>x.date)),['2026-10-31','2026-10-31']);
 assert.ok(res.candidates.every(x=>x.amount===''&&!x.selected));
 const summaryOnly=D.extractCandidates('Total +78,18 $\n31 OCT');
 assert.equal(summaryOnly.candidates.length,0,'a total cannot be imported as a transaction');
});


test('Amounts without a clear decimal mark remain unapproved even if OCR agrees',()=>{
 const implicit=D.reconcilePriceReadings(
  [{text:'9295S',confidence:99},{text:'9295S',confidence:98}],'9295S');
 assert.equal(implicit.review,true);
 assert.equal(implicit.reason,'Décimales non confirmées');
 const explicit=D.reconcilePriceReadings(
  [{text:'9,29$',confidence:99},{text:'9,29$',confidence:98}],'9,29$');
 assert.equal(explicit.amount,9.29);
 assert.equal(explicit.review,false);
 const mismatch=D.reconcilePriceReadings(
  [{text:'9,29$',confidence:99},{text:'9,29$',confidence:98}],'9295S');
 assert.equal(mismatch.review,true,'contradicting full-image amount requires review');
});
