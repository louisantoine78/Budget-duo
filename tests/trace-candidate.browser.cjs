'use strict';
/* Real Chromium against the real candidate shell, entirely fictional fixtures.
 * Playwright + a local Chromium executable are test-only prerequisites.
 * TRACE_CHROMIUM_PATH=/path/to/chromium node tests/trace-candidate.browser.cjs
 * No Safari claims, credentials, Supabase, deployments or external HTTP calls.
 */
const assert=require('node:assert/strict'),http=require('node:http');
const fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),results=[],external=[],errors=[],workers=[];
const reportIndex=process.argv.indexOf('--report'),reportPath=reportIndex<0?null:process.argv[reportIndex+1];
let browser,server,page,context;
let euroSavingsId;
let backupBankId;
const test=async(name,fn)=>{await fn();results.push({name,passed:true});console.log('PASS '+name)};
const text=async id=>{
 if(id==='homeChecking'||id==='homeCard')
  await page.locator('.trace-home-balance-breakdown').evaluate(el=>{el.open=true});
 return page.locator('#'+id).innerText();
};
const selectPrimary=async id=>{
 if(!await page.locator('[data-primary-bank="'+id+'"]').isVisible()){
  if(await page.locator('#sheetBackdrop').evaluate(el=>el.classList.contains('open')))
   await page.locator('#closeSheet').click();
  await accountSettings();
 }
 await page.locator('[data-primary-bank="'+id+'"]').click();
};
const openImports=async(mode='monthly')=>{
 await page.locator('#quickAdd').click();
 await page.locator('#¶»§q«^