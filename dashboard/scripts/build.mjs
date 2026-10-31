import {build} from 'esbuild';
import {mkdir, copyFile} from 'node:fs/promises';
await mkdir('dist/assets', {recursive: true});
await build({entryPoints: ['src/app.js'], bundle: true, minify: true, format: 'iife',
  outfile: 'dist/assets/app.js', target: ['es2022'], legalComments: 'none',
  define: {'process.env.NODE_ENV': '"production"'}});
await copyFile('src/styles.css', 'dist/assets/styles.css');
await copyFile('src/index.html', 'dist/index.html');
await import('./report.mjs');
console.log('Web lista en dist/index.html');
