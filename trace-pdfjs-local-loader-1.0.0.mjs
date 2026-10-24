/* Candidate ONLY. Do not add this module script to HTML until the pinned
 * local pdfjs-dist assets have been vendored AND CSP worker-src / Safari
 * have been reviewed. Never load this module from a CDN.
 */
import * as pdfjs from './vendor/pdfjs/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc=
 new URL('./vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
if(pdfjs.version!=='6.4.299')throw Error('Version du PDF.js local inattendue');
window.TracePDFJSLocalEngine=pdfjs;
