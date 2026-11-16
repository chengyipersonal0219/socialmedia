import { build } from 'esbuild';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const extension = join('Build', 'browser-extension');
const android = join('apps', 'android', 'app', 'src', 'main', 'assets');
await mkdir(extension, { recursive: true });
await mkdir(android, { recursive: true });
await Promise.all([
  build({ entryPoints: ['apps/browser-extension/src/content.ts'], bundle: true, format: 'iife', target: 'chrome110', outfile: join(extension, 'content.js') }),
  build({ entryPoints: ['apps/browser-extension/src/options.ts'], bundle: true, format: 'iife', target: 'chrome110', outfile: join(extension, 'options.js') }),
  build({ entryPoints: ['apps/android/filter-bootstrap.ts'], bundle: true, format: 'iife', target: 'chrome110', outfile: join(android, 'filter.js') })
]);
await Promise.all([
  copyFile('apps/browser-extension/manifest.json', join(extension, 'manifest.json')),
  copyFile('apps/browser-extension/options.html', join(extension, 'options.html'))
]);
const manifest = JSON.parse(await readFile(join(extension, 'manifest.json'), 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('Invalid extension output');
await writeFile(join('Build', 'build-info.txt'), 'SocialFilter local build\n');
