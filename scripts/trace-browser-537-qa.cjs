'use strict';
// TRACE 5.37.0 International â€” opt-in browser/PWA smoke test.
// Usage: TRACE_PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core \
//        TRACE_CHROMIUM_EXECUTABLE=/absolute/path/to/chromium \
//        node scripts/trace-browser-537-qa.cjs [--report /tmp/trace-browser.json]
// Set TRACE_BROWSER_ENGINE=webkit with PLAYWRIGHT_BROWSERS_PATH for
// Playwright-managed WebKit Linux. This is not Safari on physical iPhone.
// Never load a production origin, financial data, credentials or external requests.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require(process.env.TRACE_PLAYWRIGHT_MODULE||'playwright-core');
const engine=process.env.TRACE_BROWSER_ENGINE||'chromium';
if(!['chromium','webkit'].includes(engine))
 throw Error('TRACE_BROWSER_ENGINE must be chromium or webkit');
const root=process.env.TRACE_LAB_ROOT?path.resolve(process.env.TRACE_LAB_ROOT):
 path.resolve(__dirname,'..');
if(process.env.TRACE_LAB_ROOT&&!fs.existsSync(path.join(root,'trace-lab-export-audit.json')))
 throw Error('TRACE_LAB_ROOT must point to a fictional-only PWA export');
const preview='trace-international-preview.html';
const mime={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript',
 '.css':'text/css','.webmanifest':'application/manifest+json','.json':'application/json',
 '.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font¶»§q«^