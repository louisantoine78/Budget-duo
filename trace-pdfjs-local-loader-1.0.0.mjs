/* Isolated candidate only: audited pinned assets, same-origin module worker,
 * no remote services. Native + Chromium extraction tested; Safari is a separate
 * release gate. Production 5.36.5 does not include this loader.
 */
import * as pdfjs from './vendor/pdfjs/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc=
 new URL('./vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
if(pdfjs.version!=='6.4.299')throw Error('Version du PDF.js local inattendue');
window.TracePDFJSLocalEngine=pdfjs;
