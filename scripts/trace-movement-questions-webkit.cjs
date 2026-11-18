'use strict';
/* iPhone-sized WebKit guide smoke test: fictional UI, zero network and no cloud. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {webkit}=require('playwright');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
(async()=>{
 const browser=await webkit.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,
   isMobile:true,hasTouch:true});
  await page.route('**/*',route=>route.abort());
  await page.setContent('<!DOCTYPE html><meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<style>body{font:16px system-ui;margin:14px;background:#fffdfa}</style><div id="guide" class="trace-plain-guide"></div>');
  await page.addStyleTag({content:read('trace-premium-panels-5.37.0.css')});
  await page.addScriptTag({content:read('trace-movement-5.36.0.js')});
  await page.addScriptTag({content:read('trace-import-guide-1.2.1.js')});
  await page.addScriptTag({content:read('trace-movement-questions-1.0.0.js')});
  await page.evaluate(()=>{
   window.__selected='';
   window.__render=(selected)=>{
    window.TraceMovementQuestions.mount(document.getElementById('guide'),{
     accountType:'checking',direction:'out',selected,
     allowed:window.TraceImportGuide.all('checking','out'),
     onChoose:id=>{window.__selected=id;window.__render(id);}
    });
   };
   window.__render('');
  });
  assert.equal(await page.locator('.trace-plain-choice').count(),7);
  assert.equal(await page.evaluate(()=>window.__selected),'','nothing auto-selected');
  await page.getByRole('button',{name:/Je paie une autre carte/}).click();
  assert.equal(await page.evaluate(()=>window.__selected),'external_card_payment');
  assert.equal(await page.getByRole('button',{name:/Je paie une autre carte/}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:/Je reverse de l’argent à un proche/}).click();
  assert.equal(await page.evaluate(()=>window.__selected),'pass_through_payout');
  const widths=await page.locator('.trace-plain-options').evaluate(el=>({
   scroll:el.scrollWidth,client:el.clientWidth,window:document.documentElement.scrollWidth,
   viewport:document.documentElement.clientWidth
  }));
  assert.ok(widths.scroll<=widths.client+1&&widths.window<=widths.viewport+1,
   'guide must not overflow iPhone viewport: '+JSON.stringify(widths));
  console.log('PASS iPhone Safari choices, press state, explicit actions and mobile width');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
