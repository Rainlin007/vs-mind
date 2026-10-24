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
  // Wait for the image to finish loading before editing the node.
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

  await page.keyboard.press('F2');
  await page.waitForSelector('#input-box', { visible: true });
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#input-box', { hidden: true });
  assert.equal(await page.$eval(nodeSelector, el => el.nodeObj.topic), '',
    'clearing an image node title must save an empty string');
  const cleared = await page.evaluate(() => window.__TEST__.lastMessage);
  assert.equal(JSON.parse(cleared.text).nodeData.topic, '');
  assert.deepEqual(JSON.parse(cleared.text).nodeData.image, nodeImage);
  assert.equal(cleared.images['image-edit'], originalImage);
  assert.equal(await page.$eval(`${nodeSelector} .text`, el => el.textContent), '');
  await page.click(`${nodeSelector} > img`);
  assert.equal(await page.$eval('#image-popup', el => el.style.display), 'flex');
  assert.equal(await page.$eval('#popup-img', el => el.src), originalImage);
  await page.click('#image-popup', { offset: { x: 10, y: 10 } });
  result.logs.push({ ok: true, msg: 'clearing an image node title saves empty text and retains the image and its original' });
} catch (error) {
  result.passed = false;
  result.logs.push({ ok: false, msg: `image node editing: ${error.message}` });
}
try {
  const images = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1000, 500);
    ctx.fillStyle = '#123456';
    ctx.font = '40px sans-serif';
    ctx.fillText('Original image / readable text', 30, 100);
    const original = canvas.toDataURL('image/png');
    const thumbnail = document.createElement('canvas');
    thumbnail.width = 200;
    thumbnail.height = 100;
    thumbnail.getContext('2d').drawImage(canvas, 0, 0, 200, 100);
    return { original, thumbnail: thumbnail.toDataURL('image/png') };
  });
  await page.evaluate(({ original, thumbnail }) => window.postMessage({
    type: 'update',
    text: JSON.stringify({
      nodeData: {
        id: 'resize-root', topic: 'Resize image', root: true,
        image: { url: thumbnail, width: 200, height: 100 },
        children: [{ id: 'resize-child', topic: 'Layout stays connected' }],
      },
      arrows: [],
    }),
    images: { 'resize-root': original },
  }, '*'), images);
  const selector = '[data-nodeid="meresize-root"]';
  await page.waitForSelector(`${selector} > img`);
  await page.waitForNetworkIdle({ idleTime: 100 });
  assert.equal(await page.$eval(`${selector} > img`, el => el.naturalWidth), 1000);
  await page.click(`${selector} .text`);
  await page.waitForSelector('.image-resize-handle', { visible: true });
  const beginDrag = async () => {
    // Undo/redo restores the viewport on the next animation frame; the handle
    // then follows that geometry on its own frame.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const rect = await page.$eval('.image-resize-handle', el => {
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.move(rect.x, rect.y);
    await page.mouse.down();
    return rect;
  };
  const start = await beginDrag();
  const originalRect = await page.$eval(`${selector} > img`, el => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y };
  });
  const scale = await page.$eval(`${selector} > img`, el => el.getBoundingClientRect().width / 200);
  await page.mouse.move(start.x + 120 * scale, start.y + 60 * scale, { steps: 8 });
  assert.equal(await page.$eval(selector, el => el.nodeObj.image.width), 200,
    'drag preview must not mutate the persisted model or create history entries');
  const draggedRect = await page.$eval(`${selector} > img`, el => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  assert.ok(Math.abs(draggedRect.x - originalRect.x) < 2 && Math.abs(draggedRect.y - originalRect.y) < 2,
    'resizing must keep the image top-left anchored');
  await page.mouse.up();
  await page.waitForFunction(() => JSON.parse(window.__TEST__.lastMessage.text).nodeData.image.width === 320);
  assert.equal(await page.$eval('#image-popup', el => el.style.display), 'none');
  assert.equal(await page.$eval(selector, el => el.nodeObj.image.height), 160);
  let saved = await page.evaluate(() => window.__TEST__.lastMessage);
  assert.equal(JSON.parse(saved.text).nodeData.image.url, images.thumbnail,
    'displaying the original must not duplicate full-resolution data in the MMF');
  assert.equal(saved.images['resize-root'], images.original);
  result.logs.push({ ok: true, msg: 'old thumbnails display the original; real dragging resizes proportionally, anchors layout and persists on release' });

  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.down(modifier);
  await page.keyboard.press('z');
  await page.keyboard.up(modifier);
  await page.waitForFunction(() => document.querySelector('[data-nodeid="meresize-root"]').nodeObj.image.width === 200);
  assert.equal(await page.$eval(`${selector} > img`, el => el.src), images.original);
  await page.keyboard.down(modifier);
  await page.keyboard.down('Shift');
  await page.keyboard.press('Z');
  await page.keyboard.up('Shift');
  await page.keyboard.up(modifier);
  await page.waitForFunction(() => document.querySelector('[data-nodeid="meresize-root"]').nodeObj.image.width === 320);
  await page.click(`${selector} .text`);
  await page.waitForSelector('.image-resize-handle', { visible: true });
  const cancelStart = await beginDrag();
  await page.mouse.move(cancelStart.x + 50, cancelStart.y + 25, { steps: 4 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  assert.equal(await page.$eval(`${selector} > img`, el => el.style.width), '320px');
  assert.equal(await page.$eval(selector, el => el.nodeObj.image.width), 320);

  // Exercise the library's real zoom handler, then drag in screen pixels.
  const canvasRect = await page.$eval('.map-container', el => {
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.move(canvasRect.x, canvasRect.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel({ deltaY: 250 });
  await page.keyboard.up('Control');
  await page.waitForFunction(() => {
    const img = document.querySelector('[data-nodeid="meresize-root"] > img');
    return Math.abs(img.getBoundingClientRect().width / 320 - 1) > 0.01;
  }, { timeout: 2000 });
  const zoom = await page.$eval(`${selector} > img`, el => el.getBoundingClientRect().width / 320);
  const zoomStart = await beginDrag();
  await page.mouse.move(zoomStart.x + 80 * zoom, zoomStart.y + 40 * zoom, { steps: 6 });
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('[data-nodeid="meresize-root"]').nodeObj.image.width === 400);
  assert.equal(await page.$eval(selector, el => el.nodeObj.image.height), 200);
  saved = await page.evaluate(() => window.__TEST__.lastMessage);
  result.logs.push({ ok: true, msg: 'image resize is one undo step, supports redo and Escape cancellation, and accounts for canvas zoom' });

  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__TEST__?.done === true);
  await page.evaluate(message => window.postMessage({ ...message, type: 'update' }, '*'), saved);
  await page.waitForSelector(`${selector} > img`);
  assert.equal(await page.$eval(selector, el => el.nodeObj.image.width), 400);
  assert.equal(await page.$eval(`${selector} > img`, el => el.src), images.original);
  await page.click(`${selector} > img`);
  assert.equal(await page.$eval('#popup-img', el => el.src), images.original);
  await page.click('#image-popup', { offset: { x: 10, y: 10 } });
  if (process.env.IMAGE_RESIZE_SCREENSHOT_PATH) {
    await page.screenshot({ path: process.env.IMAGE_RESIZE_SCREENSHOT_PATH });
  }
  result.logs.push({ ok: true, msg: 'resized dimensions and original quality survive reload, and image preview still works' });

  // A left-hand child can normally be dragged to reparent it. Its image handle
  // must resize without invoking that gesture or changing the tree structure.
  const leftData = JSON.parse(saved.text);
  leftData.nodeData.children[0].image = leftData.nodeData.image;
  delete leftData.nodeData.image;
  leftData.direction = 0;
  await page.evaluate(({ data, original }) => window.postMessage({
    type: 'update', text: JSON.stringify(data), images: { 'resize-child': original },
  }, '*'), { data: leftData, original: images.original });
  const childSelector = '[data-nodeid="meresize-child"]';
  await page.waitForSelector(`${childSelector} > img`);
  await page.click(`${childSelector} .text`);
  await page.waitForSelector('.image-resize-handle', { visible: true });
  const childScale = await page.$eval(`${childSelector} > img`, el => el.getBoundingClientRect().width / 400);
  const childStart = await beginDrag();
  await page.mouse.move(childStart.x + 40 * childScale, childStart.y + 20 * childScale, { steps: 5 });
  await page.mouse.up();
  const childSaved = await page.evaluate(() => JSON.parse(window.__TEST__.lastMessage.text));
  assert.equal(childSaved.nodeData.children.length, 1);
  assert.equal(childSaved.nodeData.children[0].id, 'resize-child');
  assert.equal(childSaved.nodeData.children[0].image.width, 440);
  assert.equal(childSaved.nodeData.children[0].image.height, 220);

  // A drag that returns to its starting point must restore the preview as well.
  await page.waitForSelector('.image-resize-handle', { visible: true });
  const returnStart = await beginDrag();
  await page.mouse.move(returnStart.x + 60, returnStart.y + 30, { steps: 3 });
  await page.mouse.move(returnStart.x, returnStart.y, { steps: 3 });
  await page.mouse.up();
  assert.equal(await page.$eval(`${childSelector} > img`, el => el.style.width), '440px');
  assert.equal(await page.$eval(childSelector, el => el.nodeObj.image.width), 440);
  result.logs.push({ ok: true, msg: 'left-hand image nodes resize without reparenting, and returning the pointer restores the starting size' });
} catch (error) {
  result.passed = false;
  result.logs.push({ ok: false, msg: `image resize: ${error.stack}` });
}
try {
  await page.evaluate(() => window.postMessage({
    type: 'update',
    text: JSON.stringify({
      nodeData: {
        id: 'empty-root', topic: 'Plain root', root: true,
        children: [{
          id: 'empty-child', topic: 'Plain child',
          children: [{ id: 'kept-child', topic: 'Keep this descendant' }],
        }],
      },
      arrows: [],
    }),
    images: {},
  }, '*'));
  await page.waitForSelector('[data-nodeid="meempty-root"]');
  for (const [id, submitKey] of [['empty-root', 'Enter'], ['empty-child', 'Tab']]) {
    const selector = `[data-nodeid="me${id}"]`;
    await page.click(`${selector} .text`);
    await page.keyboard.press('F2');
    await page.waitForSelector('#input-box', { visible: true });
    await page.keyboard.press('Backspace');
    if (id === 'empty-child') await page.keyboard.type('   ');
    await page.keyboard.press(submitKey);
    await page.waitForSelector('#input-box', { hidden: true });
    assert.equal(await page.$eval(selector, el => el.nodeObj.topic), '');
    const size = await page.$eval(`${selector} .text`, el => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    assert.ok(size.width >= 16 && size.height >= 16, 'empty text must retain a clickable area');
  }
  result.logs.push({ ok: true, msg: 'root and child nodes accept empty or whitespace-only titles with Enter and Tab' });

  const rootSelector = '[data-nodeid="meempty-root"]';
  await page.click(`${rootSelector} .text`, { count: 2, delay: 60 });
  await page.waitForSelector('#input-box', { visible: true });
  await page.keyboard.type('Cancelled title');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval(rootSelector, el => el.nodeObj.topic), '');
  await page.keyboard.press('F2');
  await page.waitForSelector('#input-box', { visible: true });
  await page.keyboard.type('Restored title');
  await page.keyboard.press('Enter');
  await page.keyboard.press('F2');
  await page.waitForSelector('#input-box', { visible: true });
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval(rootSelector, el => el.nodeObj.topic), 'Restored title');

  await page.keyboard.press('F2');
  await page.waitForSelector('#input-box', { visible: true });
  await page.keyboard.press('Backspace');
  await page.click('[data-nodeid="meempty-child"] .text');
  assert.equal(await page.$eval(rootSelector, el => el.nodeObj.topic), '');
  assert.equal(await page.$eval('[data-nodeid="mekept-child"]', el => el.nodeObj.topic), 'Keep this descendant');
  result.logs.push({ ok: true, msg: 'empty nodes can be edited again; Escape cancels edits and clicking another node commits clearing' });

  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.down(modifier);
  await page.keyboard.press('z');
  await page.keyboard.up(modifier);
  await page.waitForFunction(() => document.querySelector('[data-nodeid="meempty-root"]').nodeObj.topic === 'Restored title');
  await page.keyboard.down(modifier);
  await page.keyboard.down('Shift');
  await page.keyboard.press('Z');
  await page.keyboard.up('Shift');
  await page.keyboard.up(modifier);
  await page.waitForFunction(() => {
    const message = window.__TEST__.lastMessage;
    return message?.type === 'change' && JSON.parse(message.text).nodeData.topic === '';
  });
  const saved = await page.evaluate(() => window.__TEST__.lastMessage);
  const data = JSON.parse(saved.text);
  assert.equal(data.nodeData.children[0].topic, '');
  assert.equal(data.nodeData.children[0].children[0].topic, 'Keep this descendant');
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__TEST__?.done === true);
  await page.evaluate(message => window.postMessage({ ...message, type: 'update' }, '*'), saved);
  await page.waitForSelector(rootSelector);
  assert.equal(await page.$eval(rootSelector, el => el.nodeObj.topic), '');
  assert.equal(await page.$eval('[data-nodeid="meempty-child"]', el => el.nodeObj.topic), '');
  result.logs.push({ ok: true, msg: 'clearing titles supports undo/redo and empty titles survive document reload' });
} catch (error) {
  result.passed = false;
  result.logs.push({ ok: false, msg: `empty node titles: ${error.message}` });
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
try {
  await page.evaluate(() => {
    window.postMessage({
      type: 'update',
      text: JSON.stringify({
        nodeData: {
          id: 'rainbow-root', topic: 'Rainbow branches', root: true,
          children: Array.from({ length: 7 }, (_, i) => ({
            id: `rainbow-${i}`, topic: ['Ideas', 'Research', 'Design', 'Build', 'Test', 'Launch', 'Review'][i],
            children: [{ id: `rainbow-leaf-${i}`, topic: 'Next step' }],
          })),
        },
        themeTemplate: 'clayLight',
      }),
      images: {},
    }, '*');
  });
  await page.waitForSelector('[data-nodeid="merainbow-root"]');
  await page.click('#panel-tab-theme');
  const colors = () => page.$$eval('.lines path', paths => paths.map(p => p.getAttribute('stroke')));
  const inheritsBranchColors = () => page.$$eval('me-main > me-wrapper', wrappers => wrappers.every(wrapper => {
    const paths = [...wrapper.querySelectorAll('.subLines path')];
    const color = wrapper.querySelector('me-tpc').style.borderColor;
    return paths.length && paths.every(p => getComputedStyle(p).stroke === color);
  }));
  const themeColors = await colors();
  assert.equal(await page.$eval('#line-color-select', el => el.value), 'theme');
  await page.select('#line-color-select', 'rainbow');
  const rainbowColors = await colors();
  assert.equal(new Set(rainbowColors).size, 7);
  assert.equal(await inheritsBranchColors(), true);
  assert.equal(await page.evaluate(() => JSON.parse(window.__TEST__.lastMessage.text).rainbowLines), true);
  result.logs.push({ ok: true, msg: 'rainbow branches use seven colors, inherit down subtrees and save the setting' });

  for (const direction of ['0', '1', '2']) {
    await page.select('#direction-select', direction);
    for (const style of ['curve', 'straight', 'elbow', 'step', 'branch']) {
      await page.select('#line-style-select', style);
      assert.deepEqual(await colors(), rainbowColors);
      assert.equal(await inheritsBranchColors(), true);
    }
  }
  await page.select('#theme-select', 'oceanDark');
  const darkColors = await colors();
  assert.equal(new Set(darkColors).size, 7);
  assert.notDeepEqual(darkColors, rainbowColors);
  await page.select('#line-color-select', 'theme');
  assert.equal(new Set(await colors()).size, 2);
  await page.select('#theme-select', 'clayLight');
  assert.deepEqual(await colors(), themeColors);
  await page.select('#line-color-select', 'rainbow');
  result.logs.push({ ok: true, msg: 'rainbow works with every line style/layout, adapts to dark themes and restores theme colors when disabled' });

  await page.select('#direction-select', '1');
  await page.select('#line-style-select', 'curve');
  await page.click('[data-nodeid="merainbow-0"] .text');
  await page.keyboard.press('Tab');
  await page.waitForSelector('#input-box');
  await page.keyboard.type('New child');
  await page.keyboard.press('Enter');
  assert.equal(await inheritsBranchColors(), true);
  // Toggle after recording history: undo restores an older theme snapshot.
  await page.click('#panel-tab-theme');
  await page.select('#line-color-select', 'theme');
  await page.focus('.map-container');
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.down(modifier);
  await page.keyboard.press('z');
  await page.keyboard.up(modifier);
  await page.waitForFunction(() => document.querySelector('.lines path')?.getAttribute('stroke') === '#e0733a');
  assert.deepEqual(await colors(), themeColors);
  await page.select('#line-color-select', 'rainbow');
  await page.focus('.map-container');
  await page.keyboard.down(modifier);
  await page.keyboard.down('Shift');
  await page.keyboard.press('Z');
  await page.keyboard.up('Shift');
  await page.keyboard.up(modifier);
  await page.waitForFunction(() => document.querySelector('.lines path')?.getAttribute('stroke') === '#e05252');
  assert.deepEqual(await colors(), rainbowColors);
  assert.equal(await inheritsBranchColors(), true);
  result.logs.push({ ok: true, msg: 'new nodes inherit rainbow colors and undo/redo preserves the current color mode' });

  const saved = await page.evaluate(() => {
    document.getElementById('export-trigger').click();
    document.querySelector('[data-export="mmf"]').click();
    return JSON.parse(window.__TEST__.lastMessage.text);
  });
  assert.equal(saved.rainbowLines, true);
  // Native branch color overrides remain intact when the global palette changes.
  saved.nodeData.children[6].branchColor = '#123456';
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__TEST__?.done === true);
  await page.evaluate(data => window.postMessage({
    type: 'update', text: JSON.stringify(data), images: {},
  }, '*'), saved);
  await page.waitForSelector('[data-nodeid="merainbow-root"]');
  assert.equal(await page.$eval('#line-color-select', el => el.value), 'rainbow');
  assert.deepEqual(await colors(), [...rainbowColors.slice(0, 6), '#123456']);
  assert.equal(await inheritsBranchColors(), true);
  await page.click('#panel-tab-theme');
  if (process.env.BROWSER_SCREENSHOT_PATH) {
    await page.screenshot({ path: process.env.BROWSER_SCREENSHOT_PATH });
  }
  result.logs.push({ ok: true, msg: 'MMF export/reload retains rainbow mode and respects custom branch colors' });
} catch (error) {
  result.passed = false;
  result.logs.push({ ok: false, msg: `rainbow lines: ${error.message}` });
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
