'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const P=require('../trace-portfolio-capture-parser-1.0.0.js');
const screenshot=[
 'PEA','3 819,25 €',
 'Évaluation Titres 3 680,96 €',
 'Espèces 138,29 €',
 '+/- valeurs latentes CPT 362,31 €',
 'PORTEFEUILLE','CARNET D\'ORDRES',
 'AIR LIQUIDE',
 '187,78 EUR 06/11 -1,02 %',
 '3 PRU 159,123 563,34 € 85,97',
 'ALPES (COMPAGNIE)',
 '19,50 EUR 06/11 +1,46 %',
 '15 PRU 24,311 292,50 € -72,17',
 'AMUNDI PEA SP 500 UCITS ETF ACC',
 '58,61 EUR 06/11 +0,10 %',
 '8 PRU 52,211 468,88 € 51,19',
 'BNP PARIBAS EASY STOXX EUROPE 600 UCITS ET…',
 '21,415 EUR 06/11 -1,02 %',
 '10 PRU 19,736 214,15 € 16,79',
 'DASSAULT SYSTEMES',
 '25,950 EUR 06/11 -0,92 %',
 '40 PRU 19,708 1 038,00 € 249,68'
].join('\n');
test('parses real-format cropped broker screenshots without inventing hidden holdings',()=>{
 const p=P.parse(screenshot,'2026-11-08');
 assert.equal(p.rows.length,5);
 assert.deepEqual(p.rows.map(r=>r.quantity),['3','15','8','10','40']);
 assert.deepEqual(p.rows.map(r=>r.quoteDate),Array(5).fill('2026-11-06'));
 assert.equal(p.summary.totalCents,381925);
 assert.equal(p.summary.securitiesCents,368096);
 assert.equal(p.summary.cashCents,13829);
 assert.equal(p.summary.partial,true);
 assert.equal(p.rows[0].valuationCents,56334);
 assert.equal(p.rows[4].valuationCents,103800);
 assert.equal(p.rows[3].truncated,true);
 assert.ok(p.warnings.some(x=>x.includes('capture ne couvre pas tous les titres')));
});
test('rejects ambiguous or impossible data and never synthesizes prices',()=>{
 assert.equal(P.moneyCents('3 819,25'),381925);
 assert.equal(P.moneyCents('3 819,259'),null);
 assert.equal(P.captureQuoteDate('31/02','2026-11-08'),'');
 assert.equal(P.captureQuoteDate('31/12','2027-01-02'),'2026-12-31');
 assert.equal(P.parse('Sans cours ni quantité','2026-11-08').rows.length,0);
});
test('screenshots with bad line valuation are flagged for review',()=>{
 const p=P.parse('AIR LIQUIDE\n187,78 EUR 06/11\n3 PRU 159,123 999,99 €','2026-11-08');
 assert.equal(p.rows.length,1);
 assert.equal(p.rows[0].consistent,false);
 assert.match(p.warnings[0],/différent/);
});
test('capture import is additive, explicitly approved, owner scoped and uses the existing CAS host',()=>{
 const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const capture=fs.readFileSync(path.join(root,'trace-portfolio-capture-1.0.0.js'),'utf8');
 const version=JSON.parse(fs.readFileSync(path.join(root,'trace-version.json'),'utf8'));
 const wealth=fs.readFileSync(path.join(root,'trace-wealth-201.js'),'utf8');
 assert.equal(version.build,'5.37.7');
 assert.ok(app.includes('id="traceAddPortfolioCapture"'));
 assert.ok(app.includes('window.TracePortfolioCapture?.open()'));
 for(const asset of ['trace-portfolio-capture-parser-1.0.0.js','trace-portfolio-capture-1.0.0.js'])
  assert.ok(index.includes('<script src="'+asset+'"></script>'));
 assert.ok(index.indexOf('trace-portfolio-capture-parser-1.0.0.js')<index.indexOf('trace-portfolio-capture-1.0.0.js'));
 for(const guard of ['host().save(a.id,next)','owner===c.viewer',
  "node('wcapApprove')?.checked!==true",'Capture de portefeuille confirmée',
  "status:'draft'",'next.positions.map(x=>({...x}))','aucune transaction fictive']){
  assert.ok(capture.includes(guard),'capture guard absent: '+guard);
 }
 assert.ok(wealth.includes('p.brokerCapture'));
 assert.ok(!capture.includes('createClient('));
 assert.ok(!capture.includes("saveDocument("));
 assert.ok(!capture.includes("removeDocument("));
 assert.ok(!capture.includes("root.localStorage"));
 assert.ok(!capture.includes("root.fetch("));
 assert.ok(index.includes("worker-src 'self'"));
 assert.ok(index.includes("'wasm-unsafe-eval'"));
 assert.ok(index.includes('v5-app-5.37.0.js?v=5.37.7'));
});
