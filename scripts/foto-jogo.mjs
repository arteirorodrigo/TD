// Tira uma foto do jogo num Chrome sem janela, opcionalmente rodando um JS antes.
// Uso: node scripts/foto-jogo.mjs <url> <saida.png> [script.js] [espera_ms]
// Tamanho de tela: TELA=largura,altura (padrão 1400,900). Ex.: TELA=390,844 para celular em pé.
// O script.js pode devolver JSON {"click":[x,y]} para clicar num ponto da tela.
// Ganchos do jogo para scripts: window.__game(), window.__view(), window.__towers.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [url, out, jsfile, wait = '2000'] = process.argv.slice(2);
if (!url || !out) { console.error('uso: node scripts/foto-jogo.mjs <url> <saida.png> [script.js] [espera_ms]'); process.exit(1); }
const js = jsfile ? fs.readFileSync(jsfile, 'utf8') : '';
const port = 9300 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'foto-jogo-'));
const chrome = spawn('google-chrome', ['--headless=new', `--remote-debugging-port=${port}`, '--window-size=1400,900', '--use-gl=angle', '--enable-unsafe-swiftshader', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const done = async (code) => {
  chrome.kill();
  await new Promise((r) => setTimeout(r, 500)); // Chrome still writes its profile for a moment after closing
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* temp folder, the system cleans it */ }
  process.exit(code);
};

let tabs;
for (let i = 0; i < 40 && !tabs; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(250); } }
if (!tabs) { console.error('Chrome não abriu'); done(1); }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
  else if (d.method === 'Runtime.exceptionThrown') console.log('ERRO NA PÁGINA:', JSON.stringify(d.params.exceptionDetails).slice(0, 400));
  else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') console.log('ERRO NO CONSOLE:', JSON.stringify(d.params.args).slice(0, 400));
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable');
if (process.env.TELA) { const [w, h] = process.env.TELA.split(',').map(Number); await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < h }); }
await send('Page.navigate', { url });
await sleep(2500);
if (js) {
  const r = await send('Runtime.evaluate', { expression: js, awaitPromise: true });
  const v = r.result?.result;
  console.log('RESULTADO:', JSON.stringify(v?.value ?? v).slice(0, 2000));
  try {
    const parsed = JSON.parse(v.value);
    if (parsed.click) for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: parsed.click[0], y: parsed.click[1], button: 'left', clickCount: 1 });
  } catch { /* not a click request */ }
}
await sleep(+wait);
const { result } = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(out, Buffer.from(result.data, 'base64'));
console.log('FOTO:', out);
done(0);
