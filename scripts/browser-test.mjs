import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
};

function createServer() {
  return http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const filePath = path.join(root, urlPath === '/' ? 'debug/webview.html' : urlPath.replace(/^\//, ''));
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404).end('Not found');
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/debug/webview.html`;

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const consoleErrors = [];

const failedResources = [];

page.on('pageerror', (err) => consoleErrors.push(err.message));
page.on('response', (res) => {
  if (res.status() === 404) {
    failedResources.push(res.url());
  }
});
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    const text = msg.text();
    if (text.includes('favicon.ico')) return;
    consoleErrors.push(text);
  }
});
page.on('requestfailed', (req) => {
  const url = req.url();
  if (url.includes('favicon.ico')) return;
  consoleErrors.push(`request failed: ${url}`);
});

await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
await page.waitForFunction(() => window.__TEST__?.done === true, { timeout: 15000 });

const result = await page.evaluate(() => window.__TEST__);
const logs = result.logs.map((l) => `${l.ok ? '✓' : '✗'} ${l.msg}`).join('\n');

console.log('\n--- Browser test ---');
console.log(logs);
const ignorable404 = failedResources.every((u) => u.includes('favicon.ico'));
const realConsoleErrors = consoleErrors.filter((e) => {
  if (e.includes('Failed to load resource') && ignorable404 && failedResources.length) return false;
  return true;
});

if (realConsoleErrors.length) {
  console.log('\nConsole errors:');
  realConsoleErrors.forEach((e) => console.log('  ' + e));
}
if (failedResources.length && !ignorable404) {
  console.log('\n404 resources:');
  failedResources.forEach((u) => console.log('  ' + u));
}

await browser.close();
server.close();

if (!result.passed || realConsoleErrors.length || (failedResources.length && !ignorable404)) {
  process.exit(1);
}
console.log('\nBrowser test passed.');
