import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
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
try {
  const originalImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9WlOkAAAAASUVORK5CYII=';
  const nodeImage = { url: originalImage, width: 80, height: 80 };
  await page.evaluate((image) => {
    window.postMessage({
      type: 'update',
      text: JSON.stringify({
        nodeData: { id: 'image-edit', topic: '**Editable title**', root: true, image },
        arrows: [],
      }),
      images: { 'image-edit': image.url },
    }, '*');
  }, nodeImage);
  const nodeSelector = 'me-tpc[data-nodeid="meimage-edit"]';
  await page.waitForSelector(`${nodeSelector} .text strong`);
  // The update handler refreshes image nodes asynchronously.
  await page.waitForNetworkIdle({ idleTime: 100 });

  await page.click(`${nodeSelector} .text strong`);
  assert.equal(await page.$eval('#image-popup', el => el.style.display), 'none',
    'clicking text on an image node must not open the image preview');
  await page.waitForNetworkIdle({ idleTime: 350 });
  await page.click(`${nodeSelector} .text strong`, { count: 2, delay: 60 });
  await page.waitForSelector('#input-box', { visible: true, timeout: 2000 });
  await page.keyboard.type('Updated image node');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const message = window.__TEST__.lastMessage;
    return message?.type === 'change'
      && JSON.parse(message.text).nodeData.topic === 'Updated image node';
  }, { timeout: 2000 });
  const saved = await page.evaluate(() => window.__TEST__.lastMessage);
  assert.deepEqual(JSON.parse(saved.text).nodeData.image, nodeImage);
  assert.equal(saved.images['image-edit'], originalImage);
  result.logs.push({ ok: true, msg: 'image node text can be double-clicked, edited and saved without losing the image' });

  await page.click(`${nodeSelector} > img`);
  assert.equal(await page.$eval('#image-popup', el => el.style.display), 'flex');
  assert.equal(await page.$eval('#popup-img', el => el.src), originalImage);
  await page.click('#image-popup', { offset: { x: 10, y: 10 } });
  assert.equal(await page.$eval('#image-popup', el => el.style.display), 'none');
  assert.equal(await page.$eval(nodeSelector, el => el.classList.contains('selected')), true);
  await page.click(`${nodeSelector} .text`, { count: 2, delay: 60 });
  await page.waitForSelector('#input-box', { visible: true, timeout: 2000 });
  await page.keyboard.press('Escape');
  result.logs.push({ ok: true, msg: 'image preview still opens and restores node selection and editing when closed' });
} catch (error) {
  result.passed = false;
  result.logs.push({ ok: false, msg: `image node editing: ${error.message}` });
}
try {
  await page.evaluate(() => {
    window.postMessage({
      type: 'update',
      text: JSON.stringify({
        nodeData: {
          id: 'copy-root', topic: 'Copy test', root: true,
          children: [
            {
              id: 'copy-source', topic: 'Source', note: 'Keep this note',
              ai_note: 'Keep this context', style: { color: '#123456' },
              children: [{ id: 'copy-child', topic: 'Descendant' }],
            },
            { id: 'copy-target', topic: 'Destination' },
          ],
        },
        arrows: [],
      }),
      images: {},
    }, '*');
  });
  await page.waitForSelector('[data-nodeid="mecopy-source"]');
  await page.click('[data-nodeid="mecopy-source"] .text');
  // VS Code can deliver clipboard commands to the document rather than the map.
  const copiedText = await page.evaluate(() => {
    const clipboardData = new DataTransfer();
    document.dispatchEvent(new ClipboardEvent('copy', { clipboardData, bubbles: true, cancelable: true }));
    return clipboardData.getData('text/plain');
  });
  assert.ok(copiedText, 'copying a selected node should write node data to the clipboard');
  await page.click('[data-nodeid="mecopy-target"] .text');
  await page.evaluate(text => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
  }, copiedText);
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-nodeid="mecopy-target"]').nodeObj;
    return node.children?.[0]?.topic === 'Source';
  }, { timeout: 2000 });
  const saved = await page.evaluate(() => JSON.parse(window.__TEST__.lastMessage.text));
  const [source, target] = saved.nodeData.children;
  assert.equal(target.children[0].topic, source.topic);
  assert.equal(target.children[0].children[0].topic, 'Descendant');
  assert.equal(target.children[0].note, source.note);
  assert.equal(target.children[0].ai_note, source.ai_note);
  assert.deepEqual(target.children[0].style, source.style);
  assert.notEqual(target.children[0].id, source.id);
  assert.notEqual(target.children[0].children[0].id, source.children[0].id);
  result.logs.push({ ok: true, msg: 'copy and paste places a complete node subtree under the selected destination with new IDs' });

  // Native canvas events must still run exactly once.
  await page.waitForNetworkIdle({ idleTime: 350 });
  await page.click('[data-nodeid="mecopy-target"] .text');
  await page.evaluate(text => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);
    document.querySelector('.map-container').dispatchEvent(new ClipboardEvent('paste', {
      clipboardData, bubbles: true, cancelable: true,
    }));
  }, copiedText);
  assert.equal(await page.$eval('[data-nodeid="mecopy-target"]', el => el.nodeObj.children.length), 2);
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.down(modifier);
  await page.keyboard.press('z');
  await page.keyboard.up(modifier);
  await page.waitForFunction(() => {
    const message = window.__TEST__.lastMessage;
    return message?.type === 'change'
      && JSON.parse(message.text).nodeData.children[1].children?.length === 1;
  }, { timeout: 2000 });
  await page.keyboard.down(modifier);
  await page.keyboard.down('Shift');
  await page.keyboard.press('Z');
  await page.keyboard.up('Shift');
  await page.keyboard.up(modifier);
  await page.waitForFunction(() => {
    const message = window.__TEST__.lastMessage;
    return message?.type === 'change'
      && JSON.parse(message.text).nodeData.children[1].children?.length === 2;
  }, { timeout: 2000 });
  result.logs.push({ ok: true, msg: 'native node paste runs once and supports undo/redo with saved changes' });

  await page.click('[data-nodeid="mecopy-source"] .text');
  await page.keyboard.press('F2');
  await page.waitForSelector('#input-box', { visible: true, timeout: 2000 });
  const copiedTopic = await page.evaluate(() => {
    const clipboardData = new DataTransfer();
    document.getElementById('input-box').dispatchEvent(new ClipboardEvent('copy', {
      clipboardData, bubbles: true, cancelable: true,
    }));
    return clipboardData.getData('text/plain');
  });
  assert.equal(copiedTopic, 'Source');
  await page.evaluate(() => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'Edited source text');
    document.getElementById('input-box').dispatchEvent(new ClipboardEvent('paste', {
      clipboardData, bubbles: true, cancelable: true,
    }));
  });
  await page.keyboard.press('Enter');
  assert.equal(await page.$eval('[data-nodeid="mecopy-source"]', el => el.nodeObj.topic), 'Edited source text');
  await page.click('#inspector-note');
  const panelClipboard = await page.evaluate(text => {
    const clipboardData = new DataTransfer();
    const copy = new ClipboardEvent('copy', { clipboardData, bubbles: true, cancelable: true });
    document.dispatchEvent(copy);
    const copied = clipboardData.getData('text/plain');
    clipboardData.setData('text/plain', text);
    const paste = new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true });
    document.dispatchEvent(paste);
    return { copied, copyPrevented: copy.defaultPrevented, pastePrevented: paste.defaultPrevented };
  }, copiedText);
  assert.deepEqual(panelClipboard, { copied: '', copyPrevented: false, pastePrevented: false });
  assert.equal(await page.$eval('[data-nodeid="mecopy-source"]', el => el.nodeObj.children.length), 1);
  result.logs.push({ ok: true, msg: 'node clipboard preserves inline text editing and leaves property field clipboard operations alone' });
} catch (error) {
  result.passed = false;
  result.logs.push({ ok: false, msg: `node clipboard: ${error.message}` });
}
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
