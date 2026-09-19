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
await page.setViewport({ width: 1440, height: 900 });
await page.exposeFunction('selectTestTopic', (nodeId) => page.click(`me-tpc[data-nodeid="${nodeId}"]`));
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

// Use real keyboard input: synthetic keydown events do not insert contenteditable line breaks.
try {
  const topicSelector = 'me-tpc[data-nodeid="mechild"]';
  await page.$eval(topicSelector, async (node) => {
    // MindElixir detects double clicks from pointerup events.
    node.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse' }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    node.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse' }));
  });
  await page.waitForSelector('#input-box');
  await page.focus('#input-box');
  await page.keyboard.type('First line');
  await page.keyboard.down('Shift');
  await page.keyboard.press('Enter');
  await page.keyboard.up('Shift');
  await page.keyboard.type('Second line');
  await page.evaluate(() => log('Shift+Enter keeps the node editor open', !!document.getElementById('input-box')));
  await page.keyboard.press('Enter');
  await page.waitForSelector('#input-box', { hidden: true });
  await page.evaluate((selector) => {
    const node = document.querySelector(selector);
    const text = node.querySelector('.text');
    log('Enter saves multiline node text', node.nodeObj.topic === 'First line\nSecond line');
    log('saved node displays two lines', text.innerText === 'First line\nSecond line');
  }, topicSelector);

  await page.keyboard.press('F2');
  await page.waitForSelector('#input-box');
  await page.focus('#input-box');
  await page.evaluate(() => {
    const editor = document.getElementById('input-box');
    log('reopened editor preserves visible line breaks',
      editor.innerText === 'First line\nSecond line' && getComputedStyle(editor).whiteSpace === 'pre-wrap');
    const range = document.createRange();
    range.selectNodeContents(editor);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'Pasted first\nPasted second');
    editor.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }));
  });
  await page.keyboard.press('Enter');
  await page.waitForSelector('#input-box', { hidden: true });
  const exportedData = await page.evaluate((selector) => {
    const node = document.querySelector(selector);
    log('multiline paste is saved and rendered: ' + JSON.stringify(node.nodeObj.topic),
      node.nodeObj.topic === 'Pasted first\nPasted second'
      && node.querySelector('.text').innerText === 'Pasted first\nPasted second');
    document.getElementById('export-trigger').click();
    document.querySelector('[data-export="mmf"]').click();
    const message = window.__TEST__.lastMessage;
    const data = JSON.parse(message.text);
    log('MMF export preserves node line breaks', data.nodeData.children[0].topic === 'Pasted first\nPasted second');
    return data;
  }, topicSelector);
  const editingChecks = await page.evaluate(() => window.__TEST__.logs);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__TEST__?.done === true);
  await page.evaluate((data, checks) => {
    window.__TEST__.logs = checks;
    window.postMessage({ type: 'update', text: JSON.stringify(data), images: {} }, '*');
  }, exportedData, editingChecks);
  await page.waitForFunction((selector) => {
    const node = document.querySelector(selector);
    return node?.querySelector('.text')?.innerText === 'Pasted first\nPasted second';
  }, { timeout: 5000 }, topicSelector);
  await page.evaluate(() => log('reloaded document displays multiline nodes', true));
} catch (error) {
  await page.evaluate((message) => log('multiline editing: ' + message, false), error.message);
}
await page.evaluate(() => {
  window.__TEST__.passed = window.__TEST__.passed && window.__TEST__.logs.every((entry) => entry.ok);
});

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
