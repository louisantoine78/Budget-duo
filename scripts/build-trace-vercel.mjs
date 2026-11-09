import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'trace-vercel-output');
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0').filter(Boolean);

// Preserve the last pre-TRACE 2.0 bundle for older installed PWA shells.
const legacyFallback = 'v5-app-5.36.5.js';
const excludedBundles = new Set(files.filter(file =>
  /^v5-app-5\.(?:\d|[12]\d|3[0-6])\.\d+\.js$/.test(file) && file !== legacyFallback
));

// Keep any historical bundle still referenced by a served page, module or worker.
for (const file of files) {
  if (/^(?:\.github|docs|scripts|tests)\//.test(file) ||
      !/\.(?:html|js|mjs|cjs|css|json|webmanifest)$/.test(file)) continue;
  const source = readFileSync(join(root, file), 'utf8');
  for (const [bundle] of source.matchAll(/v5-app-5\.\d+\.\d+\.js/g)) {
    excludedBundles.delete(bundle);
  }
}

rmSync(output, { recursive: true, force: true });
for (const file of files) {
  if (excludedBundles.has(file) || file === 'vercel.json' ||
      file === 'scripts/build-trace-vercel.mjs') continue;
  const destination = join(output, file);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(join(root, file), destination);
}

const excludedBytes = [...excludedBundles].reduce(
  (total, file) => total + statSync(join(root, file)).size, 0
);
console.log(`Excluded ${excludedBundles.size} unreferenced TRACE bundles (${excludedBytes} bytes).`);
