// Builds a single self-contained HTML page (no <html>/<head>/<body> wrappers) for sharing as a Claude artifact.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const out = process.argv[2] || 'dist-artifact/td.html';
const html = readFileSync('index.html', 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset[^>]*>\s*/, '')
  .replace(/<meta name="viewport"[^>]*>\s*/, '');
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1]
  .replace(/<script type="module" src="[^"]+"><\/script>/, '');
const res = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020' });
const js = res.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
mkdirSync(out.replace(/\/[^/]+$/, ''), { recursive: true });
writeFileSync(out, `${head.trim()}\n${body.trim()}\n<script>\n${js}</script>\n`);
console.log('wrote', out, Math.round((head.length + body.length + js.length) / 1024), 'KB');
