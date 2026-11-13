/* Same-origin worker for TRACE's pinned on-device Tesseract 5.1.1 OCR.
 * The CSP intentionally forbids blob: workers. Keep this entrypoint on
 * our own origin and import the pinned vendor worker from an allowed CDN.
 * Never transfer screenshot bytes outside the device. */
'use strict';
importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js');
