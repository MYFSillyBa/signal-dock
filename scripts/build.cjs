const { build } = require('esbuild');
const { mkdir, copyFile } = require('node:fs/promises');

async function main() {
  await mkdir('dist', { recursive: true });
  await build({
    entryPoints: ['web/app.mjs'], bundle: true, outdir: 'dist', entryNames: 'app',
    format: 'iife', platform: 'browser', target: ['chrome132'], minify: true, legalComments: 'linked'
  });
  await copyFile('web/index.html', 'dist/index.html');
  await copyFile('node_modules/three/LICENSE', 'dist/THREE-LICENSE.txt');
  await copyFile('node_modules/html-to-image/LICENSE', 'dist/HTML-TO-IMAGE-LICENSE.txt');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
