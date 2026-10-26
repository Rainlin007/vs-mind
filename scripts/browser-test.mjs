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

  await page.click(`${nodeSelector} > img`);
  await page.waitForNetworkIdle({ idleTime: 350 });
  assert.equal(await page.$eval(nodeSelector, el => el.classList.contains('selected')), true,
    'the first image click must select its node');
  assert.equal(await page.$eval('#image-popup', el => el.style.display), 'none',
    'the first image click must not preview it');
  await page.click(`${nodeSelector} > img`);
  await page.waitForSelector('#image-popup', { visible: true, timeout: 2000 });
  assert.equal(await page.$eval('#popup-img', el => el.src), originalImage);
  await page.click('#image-popup', { offset: { x: 10, y: 10 } });
  await page.click(`${nodeSelector} > img`, { count: 2, delay: 60 });
  await page.waitForSelector('#input-box', { visible: true, timeout: 2000 });
  await page.waitForNetworkIdle({ idleTime: 350 });
  assert.equal(await page.$eval('#image-popup', el => el.style.display), 'none',
    'double-clicking a selected image must edit its text without opening preview');
  await page.keyboard.press('Escape');
  await page.waitForNetworkIdle({ idleTime: 350 });
  result.logs.push({ ok: true, msg: 'first image click selects, selected single click previews, and double click edits without preview' });

  const dragPoint = await page.$eval(`${nodeSelector} > img`, image => {
    const rect = image.getBoundingClientRect();
    return { x: rect.left + 20, y: rect.top + 20 };
  });
  await page.mouse.move(dragPoint.x, dragPoint.y);
  await page.mouse.down();
  await page.mouse.move(dragPoint.x + 20, dragPoint.y + 20, { steps: 5 });
  await page.mouse.up();
  await page.waitForNetworkIdle({ idleTime: 350 });
  assert.equal(await page.$eval('#image-popup', el => el.style.display), 'none',
    'moving the pointer while pressed must not trigger image preview');
  await page.click(`${nodeSelector} > img`);
  await page.click('.map-container', { offset: { x: 10, y: 200 } });
  await page.waitForNetworkIdle({ idleTime: 350 });
  assert.equal(await page.$eval('#image-popup', el => el.style.display), 'none',
    'clicking elsewhere must cancel a pending image preview');
  assert.equal(await page.$eval(nodeSelector, el => el.classList.contains('selected')), false);
  await page.click(`${nodeSelector} > img`, { count: 2, delay: 60 });
  await page.waitForSelector('#input-box', { visible: true, timeout: 2000 });
  await page.waitForNetworkIdle({ idleTime: 350 });
  assert.equal(await page.$eval('#image-popup', el => el.style.display), 'none',
    'double-clicking an unselected image must also edit without preview');
  await page.keyboard.press('Escape');
  await page.waitForNetworkIdle({ idleTime: 350 });
  result.logs.push({ ok: true, msg: 'image dragging and selection changes cancel preview; unselected image double click edits directly' });

  await page.click(`${nodeSelector} .text strong`);
  assert.equal(await page.$eval('#image-popup', el => el.style.display), 'none',
    'clicking text on an image node must not open the image preview');
  await page.waitForNetworkIdle({ idleTime: 350 });
  await page.click(`${nodeSelector} .text strong`, { count: 2, delay: 60 });
  await page.waitForSelector('#input-box', { visible: true, timeout: 2000 });
  const assertImageVisibleWhileEditing = async (selector = nodeSelector) => {
    const state = await page.$eval(selector, node => {
      const image = node.querySelector('img');
      const editor = document.getElementById('input-box');
      const text = node.querySelector('.text');
      const imageRect = image.getBoundingClientRect();
      const editorRect = editor.getBoundingClientRect();
      const textRect = text.getBoundingClientRect();
      const collapsed = getComputedStyle(text).display === 'none';
      const scale = node.getBoundingClientRect().width / node.offsetWidth;
      const titleLeft = collapsed ? imageRect.left : textRect.left;
      const titleTop = collapsed ? imageRect.bottom + 8 * scale : textRect.top;
      return {
        nodeOpacity: getComputedStyle(node).opacity,
        imageVisible: image.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }),
        belowImage: editorRect.top >= imageRect.bottom,
        aligned: Math.abs(editorRect.left - titleLeft) < 2
          && Math.abs(editorRect.top - titleTop) < 2,
      };
    });
    assert.equal(state.nodeOpacity, '1', 'editing must keep the image node opaque');
    assert.equal(state.imageVisible, true, 'the image must remain visible while typing');
    assert.equal(state.belowImage, true, 'the editor must not cover the image');
    assert.equal(state.aligned, true, 'the editor must align with the title');
  };
  const assertCompactImage = async (selector = nodeSelector) => {
    const state = await page.$eval(selector, node => {
      const style = getComputedStyle(node);
      const image = node.querySelector('img');
      return {
        textDisplay: getComputedStyle(node.querySelector('.text')).display,
        imageMargin: getComputedStyle(image).marginBottom,
        extraHeight: node.offsetHeight - image.offsetHeight
          - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
          - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth),
      };
    });
    assert.equal(state.textDisplay, 'none', 'empty image title must not occupy a line');
    assert.equal(state.imageMargin, '0px', 'image-only nodes need no title gap');
    assert.ok(Math.abs(state.extraHeight) < 2, `image-only height must exclude blank lines: ${state.extraHeight}`);
  };
  await assertImageVisibleWhileEditing();
  await page.keyboard.type('Updated image node');
  await assertImageVisibleWhileEditing();
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

  await page.waitForNetworkIdle({ idleTime: 350 });
  await page.click(`${nodeSelector} > img`);
  await page.waitForSelector('#image-popup', { visible: true, timeout: 2000 });
  assert.equal(await page.$eval('#popup-img', el => el.src), originalImage);
  await page.click('#image-popup', { offset: { x: 10, y: 10 } });
  assert.equal(await page.$eval('#image-popup', el => el.style.display), 'none');
  assert.equal(await page.$eval(nodeSelector, el => el.classList.contains('selected')), true);
  await page.click(`${nodeSelector} .text`, { count: 2, delay: 60 });
  await page.waitForSelector('#input-box', { visible: true, timeout: 2000 });
  await assertImageVisibleWhileEditing();
  await page.keyboard.type('Cancelled title');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval(`${nodeSelector} .text`, el => getComputedStyle(el).visibility), 'visible');
  assert.equal(await page.$eval(nodeSelector, el => el.nodeObj.topic), 'Updated image node');
  result.logs.push({ ok: true, msg: 'image preview still opens and restores node selection and editing when closed' });

  await page.keyboard.press('F2');
  await page.waitForSelector('#input-box', { visible: true });
  await assertImageVisibleWhileEditing();
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
  await assertCompactImage();
  await page.click('#action-undo');
  assert.equal(await page.$eval(nodeSelector, el => el.nodeObj.topic), 'Updated image node');
  assert.equal(await page.$eval(`${nodeSelector} > img`, el => getComputedStyle(el).marginBottom), '8px');
  await page.click('#action-redo');
  await assertCompactImage();
  await page.click(`${nodeSelector} > img`);
  await page.waitForSelector('#image-popup', { visible: true, timeout: 2000 });
  assert.equal(await page.$eval('#popup-img', el => el.src), originalImage);
  await page.click('#image-popup', { offset: { x: 10, y: 10 } });
  await page.click(`${nodeSelector} > img`, { count: 2, delay: 60 });
  await page.waitForSelector('#input-box', { visible: true });
  await assertImageVisibleWhileEditing();
  await page.waitForNetworkIdle({ idleTime: 350 });
  assert.equal(await page.$eval('#image-popup', el => el.style.display), 'none');
  await page.keyboard.type('Restored title');
  await page.keyboard.press('Enter');
  assert.equal(await page.$eval(`${nodeSelector} .text`, el => el.textContent), 'Restored title');
  assert.equal(await page.$eval(`${nodeSelector} .text`, el => getComputedStyle(el).visibility), 'visible');
  assert.equal(await page.$eval(`${nodeSelector} > img`, el => getComputedStyle(el).marginBottom), '8px');
  result.logs.push({ ok: true, msg: 'clearing an image node title saves empty text and retains the image and its original' });

  // Exercise offset parents and scaled coordinates on both root and child nodes.
  for (const direction of [0, 1, 2]) {
    await page.evaluate(({ image, direction }) => window.postMessage({
      type: 'update',
      text: JSON.stringify({
        nodeData: {
          id: 'image-edit', topic: 'Root title', root: true, image,
          children: [{ id: 'image-edit-child', topic: 'Child title', image }],
        },
        direction,
      }),
      images: {},
    }, '*'), { image: nodeImage, direction });
    const childSelector = '[data-nodeid="meimage-edit-child"]';
    await page.waitForSelector(childSelector);
    const beforeZoom = await page.$eval(`${nodeSelector} > img`, el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, width: rect.width };
    });
    await page.mouse.move(beforeZoom.x, beforeZoom.y);
    await page.keyboard.down('Control');
    await page.mouse.wheel({ deltaY: 150 });
    await page.keyboard.up('Control');
    await page.waitForFunction(width => {
      const image = document.querySelector('[data-nodeid="meimage-edit"] > img');
      return Math.abs(image.getBoundingClientRect().width - width) > 1;
    }, {}, beforeZoom.width);
    for (const selector of [nodeSelector, childSelector]) {
      await page.click(`${selector} .text`);
      await page.keyboard.press('F2');
      await page.waitForSelector('#input-box', { visible: true });
      await assertImageVisibleWhileEditing(selector);
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval(`${selector} .text`, el => getComputedStyle(el).visibility), 'visible');
      await page.keyboard.press('F2');
      await page.waitForSelector('#input-box', { visible: true });
      await page.keyboard.type('   ');
      await page.keyboard.press('Enter');
      await assertCompactImage(selector);
      await page.keyboard.press('F2');
      await page.waitForSelector('#input-box', { visible: true });
      await assertImageVisibleWhileEditing(selector);
      await page.keyboard.type('Cancelled');
      await page.keyboard.press('Escape');
      await assertCompactImage(selector);
    }
    const compactDocument = await page.evaluate(() => window.__TEST__.lastMessage);
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction(() => window.__TEST__?.done === true);
    await page.evaluate(message => window.postMessage({ ...message, type: 'update' }, '*'), compactDocument);
    await page.waitForNetworkIdle({ idleTime: 100 });
    await assertCompactImage(nodeSelector);
    await assertCompactImage(childSelector);
  }
  result.logs.push({ ok: true, msg: 'image-only nodes collapse blank titles and gaps, survive undo/redo and reload, and reopen editors across layouts and zoom' });
  result.logs.push({ ok: true, msg: 'image nodes stay visible with aligned text editors across layouts and canvas zoom' });
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
    // Let the resize handle follow the restored viewport on its next frame.
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
  await page.waitForNetworkIdle({ idleTime: 350 });
  assert.equal(await page.$eval('#image-popup', el => el.style.display), 'none');
  await page.click(`${selector} > img`);
  await page.waitForSelector('#image-popup', { visible: true, timeout: 2000 });
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
try {
  const data = {
    nodeData: {
      id: 'viewport-root', topic: 'Viewport root', root: true,
      children: Array.from({ length: 8 }, (_, i) => ({ id: `viewport-${i}`, topic: `Branch ${i}` })),
    },
    direction: 1,
  };
  const update = async () => {
    await page.evaluate(data => window.postMessage({
      type: 'update', text: JSON.stringify(data), images: {},
    }, '*'), data);
    await page.waitForFunction(topic => document.querySelector('[data-nodeid="meviewport-0"]')?.nodeObj.topic === topic,
      {}, data.nodeData.children[0].topic);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  const position = selector => page.$eval(selector, node => {
    const rect = node.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, width: rect.width };
  });
  await update();
  const selected = '[data-nodeid="meviewport-5"]';
  await page.click(selected);
  assert.equal(await page.$eval(selected, node => node.classList.contains('selected')), true);
  for (const withSelection of [true, false]) {
    if (!withSelection) {
      await page.click('.map-container', { offset: { x: 15, y: 15 } });
      assert.equal(await page.$$eval('me-tpc.selected', nodes => nodes.length), 0);
    }
    const anchor = withSelection ? selected : '[data-nodeid="meviewport-root"]';
    const zoomBefore = await position(anchor);
    const container = await position('.map-container');
    await page.mouse.move(container.x, container.y);
    await page.keyboard.down('Control');
    await page.mouse.wheel({ deltaY: 150 });
    await page.keyboard.up('Control');
    await page.waitForFunction(({ anchor, width }) =>
      Math.abs(document.querySelector(anchor).getBoundingClientRect().width - width) > 1,
    {}, { anchor, width: zoomBefore.width });
    // Pan without changing the zoom maintained by MindElixir.
    await page.$eval('.map-canvas', map => {
      map.style.transform = map.style.transform.replace(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/,
        (_, x, y) => `translate3d(${Number(x) + 180}px, ${Number(y) - 120}px`);
    });
    const before = await position(anchor);
    data.nodeData.children[0].topic += '\nAdditional content from document synchronization';
    await update();
    const after = await position(anchor);
    assert.ok(Math.abs(after.x - before.x) < 2 && Math.abs(after.y - before.y) < 2,
      `document refresh must preserve the ${withSelection ? 'selected node' : 'root'} screen position`);
    assert.ok(Math.abs(after.width - before.width) < 1, 'document refresh must preserve zoom');
    if (withSelection) assert.equal(await page.$eval(selected, node => node.classList.contains('selected')), true);
  }
  result.logs.push({ ok: true, msg: 'document synchronization preserves pan, zoom and selection, including when no node is selected' });
  const latestPan = await page.evaluate(data => {
    for (let i = 0; i < 2; i++) {
      data.nodeData.children[0].topic += '\nRapid update';
      window.dispatchEvent(new MessageEvent('message', { data: {
        type: 'update', text: JSON.stringify(data), images: {},
      } }));
    }
    const map = document.querySelector('.map-canvas');
    map.style.transform = map.style.transform.replace(/translate3d\(([-\d.]+)px/,
      (_, x) => `translate3d(${Number(x) + 60}px`);
    return map.style.transform;
  }, data);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.$eval('.map-canvas', map => map.style.transform), latestPan,
    'a pending viewport restoration must not overwrite a newer update or pan');
  result.logs.push({ ok: true, msg: 'back-to-back document updates do not undo subsequent canvas panning' });
} catch (error) {
  result.passed = false;
  result.logs.push({ ok: false, msg: `document viewport preservation: ${error.message}` });
}
try {
  const original = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9WlOkAAAAASUVORK5CYII=';
  await page.evaluate(original => window.postMessage({
    type: 'update',
    text: JSON.stringify({
      nodeData: { id: 'tools-root', topic: '工具栏验证', root: true, children: [
        { id: 'tools-a', topic: '产品设计', children: [
          { id: 'tools-a1', topic: '用户调研' },
          { id: 'tools-a2', topic: '交互设计' },
          { id: 'tools-a3', topic: '视觉设计' },
        ] },
        { id: 'tools-b', topic: '开发实施', image: { url: original, width: 40, height: 40 } },
      ] },
      direction: 0,
    }),
    images: { 'tools-b': original },
  }, '*'), original);
  const topic = id => `[data-nodeid="me${id}"]`;
  await page.waitForSelector(topic('tools-root'));
  const disabled = id => page.$eval(`#action-${id}`, button => button.disabled);
  const saved = () => page.evaluate(() => JSON.parse(window.__TEST__.lastMessage.text));
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await disabled('child'), true);
  assert.equal(await disabled('undo'), true);
  await page.click(topic('tools-root'));
  assert.equal(await disabled('sibling'), true);
  assert.equal(await disabled('focus'), true);
  await page.click(topic('tools-a'));
  await page.click('#action-fold');
  assert.equal(await page.$(topic('tools-a1')), null);
  assert.equal((await saved()).nodeData.children[0].expanded, false);
  assert.equal(await page.$eval('#action-fold', button => button.getAttribute('aria-label')), 'Expand branch');
  await page.click('#action-fold');
  await page.waitForSelector(topic('tools-a1'));

  await page.click('#action-child');
  await page.waitForSelector('#input-box');
  await page.keyboard.type('New child');
  await page.keyboard.press('Enter');
  const addedId = (await saved()).nodeData.children[0].children.at(-1).id;
  assert.equal(await disabled('undo'), false);
  await page.click('#action-undo'); // undo title edit
  await page.click('#action-undo'); // undo creation
  assert.equal(await page.$(topic(addedId)), null);
  await page.click('#action-redo');
  await page.click('#action-redo');
  assert.equal(await page.$eval(topic(addedId), node => node.nodeObj.topic), 'New child');
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.focus('.map-container');
  await page.keyboard.down(modifier);
  await page.keyboard.press('z');
  await page.keyboard.up(modifier);
  assert.equal(await disabled('redo'), false);
  await page.click('#action-redo');
  assert.equal(await page.$eval(topic(addedId), node => node.nodeObj.topic), 'New child');
  await page.click(topic('tools-a1'));
  await page.click('#action-sibling');
  await page.waitForSelector('#input-box');
  await page.keyboard.type('New sibling');
  await page.keyboard.press('Enter');
  assert.equal((await saved()).nodeData.children[0].children[1].topic, 'New sibling');
  result.logs.push({ ok: true, msg: 'toolbar fold/unfold persists; child/sibling creation and keyboard/button undo/redo share history' });

  await page.click(topic('tools-a'));
  const beforeFocus = await page.$eval(topic('tools-a'), node => {
    const rect = node.getBoundingClientRect();
    return { x: rect.x, y: rect.y };
  });
  await page.click('#action-focus');
  assert.equal(await page.$('me-root > [data-nodeid="metools-root"]'), null);
  assert.notEqual(await page.$('me-root > [data-nodeid="metools-a"]'), null);
  assert.equal(await page.$(topic('tools-b')), null);
  assert.equal(await page.$eval('#action-focus', button => button.getAttribute('aria-label')), 'Exit focus');
  await page.click(topic('tools-a1'));
  await page.keyboard.press('F2');
  await page.waitForSelector('#input-box');
  await page.keyboard.type('Edited in focus');
  await page.keyboard.press('Enter');
  assert.equal((await saved()).nodeData.id, 'tools-root');
  assert.equal((await saved()).nodeData.children[1].id, 'tools-b');
  assert.equal(await page.evaluate(() => window.__TEST__.lastMessage.images['tools-b']), original);
  await page.click('#action-undo');
  assert.equal(await page.$eval(topic('tools-a1'), node => node.nodeObj.topic), '用户调研');
  assert.notEqual(await page.$('me-root > [data-nodeid="metools-a"]'), null);
  await page.click('#action-redo');
  assert.equal((await saved()).nodeData.children[0].children[0].topic, 'Edited in focus');
  await page.click('#action-focus');
  await page.waitForSelector(topic('tools-b'));
  const afterFocus = await page.$eval(topic('tools-a'), node => {
    const rect = node.getBoundingClientRect();
    return { x: rect.x, y: rect.y };
  });
  assert.ok(Math.abs(afterFocus.x - beforeFocus.x) < 2 && Math.abs(afterFocus.y - beforeFocus.y) < 2);
  result.logs.push({ ok: true, msg: 'focus mode preserves the full document and images across edits/undo/redo and restores the original viewport on exit' });

  await page.click(topic('tools-a1'));
  await page.click('#action-relationship');
  assert.equal(await page.$eval('#action-relationship', button => button.getAttribute('aria-pressed')), 'true');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('#action-relationship', button => button.getAttribute('aria-pressed')), 'false');
  await page.click('#action-relationship');
  await page.click(topic('tools-a2'));
  assert.deepEqual((await saved()).arrows.map(arrow => [arrow.from, arrow.to]), [['tools-a1', 'tools-a2']]);
  await page.click('#action-undo');
  assert.equal((await saved()).arrows.length, 0);
  await page.click('#action-redo');
  await page.click(topic('tools-a2'));
  await page.keyboard.down(modifier);
  await page.click(topic('tools-a3'));
  await page.keyboard.up(modifier);
  await page.click('#action-relationship');
  assert.equal((await saved()).arrows.length, 2);
  await page.click('#action-summary');
  await page.waitForSelector('#input-box');
  await page.keyboard.type('Design phase');
  await page.keyboard.press('Enter');
  const summary = (await saved()).summaries[0];
  assert.equal(summary.parent, 'tools-a');
  assert.equal(summary.label, 'Design phase');
  assert.equal(summary.end - summary.start, 1);
  await page.click(topic('tools-a1'));
  await page.keyboard.down(modifier);
  await page.click(topic('tools-a3'));
  await page.keyboard.up(modifier);
  assert.equal(await disabled('summary'), true, 'non-adjacent siblings must not silently include unselected nodes');
  result.logs.push({ ok: true, msg: 'toolbar connections support two-node selection or target picking with Escape cancellation; summaries validate contiguous siblings' });

  await page.click(topic('tools-a'));
  await page.click('#action-focus');
  const update = await saved();
  update.nodeData.children[0].children[0].topic = 'External update in focus';
  await page.evaluate(({ data, original }) => window.postMessage({
    type: 'update', text: JSON.stringify(data), images: { 'tools-b': original },
  }, '*'), { data: update, original });
  await page.waitForFunction(() => document.querySelector('[data-nodeid="metools-a1"]')?.nodeObj.topic === 'External update in focus');
  assert.notEqual(await page.$('me-root > [data-nodeid="metools-a"]'), null);
  await page.click('#action-focus');
  await page.waitForSelector(topic('tools-b'));
  await page.click(topic('tools-a'));
  await settle();
  if (process.env.TOOLBAR_SCREENSHOT_PATH) await page.screenshot({ path: process.env.TOOLBAR_SCREENSHOT_PATH });
  await page.setViewport({ width: 800, height: 700 });
  await settle();
  assert.equal(await page.$$eval('.canvas-action', buttons => buttons.every(button => button.textContent.trim() === '' && !!button.title)), true);
  assert.equal(await page.$eval('.map-toolbar', toolbar => toolbar.scrollWidth <= toolbar.clientWidth), true);
  result.logs.push({ ok: true, msg: 'external updates keep focus attached to the current full document; compact toolbars remain usable in narrow editors' });
} catch (error) {
  result.passed = false;
  result.logs.push({ ok: false, msg: `canvas toolbar: ${error.stack}` });
}
try {
  await page.$eval('#debug-bar', bar => { bar.style.display = 'none'; });
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9WlOkAAAAASUVORK5CYII=';
  const data = {
    nodeData: { id: 'fit-root', topic: 'Fit the whole map', root: true, children:
      Array.from({ length: 18 }, (_, index) => ({
        id: `fit-${index}`, topic: `Branch ${index}`, direction: index % 2,
        ...(index === 0 ? { image: { url: image, width: 640, height: 320 } } : {}),
        children: Array.from({ length: 4 }, (_, child) => ({
          id: `fit-${index}-${child}`, topic: `Detailed topic ${index}.${child}`,
        })),
      })) },
    direction: 2,
  };
  const assertFits = async () => {
    const geometry = await page.evaluate(() => {
      const container = document.querySelector('.map-container').getBoundingClientRect();
      const rects = [...document.querySelectorAll('me-tpc, me-tpc > img')].map(node => node.getBoundingClientRect());
      const map = document.querySelector('.map-canvas');
      return {
        contained: rects.every(rect => rect.left >= container.left + 1 && rect.top >= container.top + 1
          && rect.right <= container.right - 1 && rect.bottom <= container.bottom - 1),
        bounds: [Math.min(...rects.map(rect => rect.left)), Math.min(...rects.map(rect => rect.top)),
          Math.max(...rects.map(rect => rect.right)), Math.max(...rects.map(rect => rect.bottom))],
        canvas: [container.left, container.top, container.right, container.bottom],
        transform: map.style.transform,
        fullscreen: !!document.fullscreenElement,
      };
    });
    assert.equal(geometry.contained, true, `every visible topic and image must fit inside the canvas: ${JSON.stringify(geometry)}`);
    assert.equal(geometry.fullscreen, false, 'fit must not enter browser fullscreen');
    return geometry.transform;
  };
  assert.equal(await page.$('#fullscreen'), null);
  assert.equal(await page.$eval('#fit-view', button => button.title), 'Fit to view');
  const zoomGeometry = () => page.evaluate(() => {
    const canvas = document.querySelector('.map-container').getBoundingClientRect();
    const node = document.querySelector('me-root > me-tpc').getBoundingClientRect();
    return {
      x: node.left + node.width / 2, y: node.top + node.height / 2, width: node.width,
      center: { x: canvas.left + canvas.width / 2, y: canvas.top + canvas.height / 2 },
      pointer: { x: canvas.left + canvas.width * 0.3, y: canvas.top + canvas.height * 0.4 },
    };
  });
  const assertZoomAnchor = async (before, anchor, label) => {
    const after = await zoomGeometry();
    const ratio = after.width / before.width;
    assert.ok(ratio > 1, `${label}: zoom must increase`);
    const expected = { x: anchor.x + (before.x - anchor.x) * ratio,
      y: anchor.y + (before.y - anchor.y) * ratio };
    assert.ok(Math.abs(after.x - expected.x) < 1 && Math.abs(after.y - expected.y) < 1,
      `${label}: zoom must preserve its screen anchor: ${JSON.stringify({ before, after, expected })}`);
  };
  const assertZoomAfterFit = async () => {
    const beforeButton = await zoomGeometry();
    await page.click('#zoomin');
    await assertZoomAnchor(beforeButton, beforeButton.center, 'button after fit');
    await page.click('#fit-view');
    const beforeWheel = await zoomGeometry();
    await page.mouse.move(beforeWheel.pointer.x, beforeWheel.pointer.y);
    await page.keyboard.down('Control');
    try {
      await page.mouse.wheel({ deltaY: -100 });
      await page.waitForFunction(width => document.querySelector('me-root > me-tpc').getBoundingClientRect().width > width,
        {}, beforeWheel.width);
    } finally {
      await page.keyboard.up('Control');
    }
    await assertZoomAnchor(beforeWheel, beforeWheel.pointer, 'wheel after fit');
    await page.click('#fit-view');
    await assertFits();
  };
  for (const direction of [0, 1, 2]) {
    data.direction = direction;
    await page.evaluate(data => window.postMessage({ type: 'update', text: JSON.stringify(data), images: {} }, '*'), data);
    await page.waitForSelector('[data-nodeid="mefit-17-3"]');
    await page.waitForFunction(direction => document.getElementById('direction-select').value === String(direction), {}, direction);
    await page.$eval('.map-canvas', map => {
      map.style.transform = map.style.transform.replace(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/,
        (_, x, y) => `translate3d(${Number(x) + 900}px, ${Number(y) - 600}px`);
    });
    const before = await page.evaluate(() => JSON.stringify(window.__TEST__.lastMessage));
    await page.click('#fit-view');
    const transform = await assertFits();
    await page.click('#fit-view');
    assert.equal(await assertFits(), transform, 'fitting again must not drift or change zoom');
    await assertZoomAfterFit();
    assert.equal(await page.evaluate(() => JSON.stringify(window.__TEST__.lastMessage)), before,
      'fitting the viewport must not modify or save the document');
  }
  await page.click('[data-nodeid="mefit-0"] .text');
  assert.equal(await page.$eval('[data-nodeid="mefit-0"]', node => node.classList.contains('selected')), true);
  assert.equal(await page.$eval('#action-focus', button => button.disabled), false);
  await page.click('#action-focus');
  await page.click('#fit-view');
  await assertFits();
  await assertZoomAfterFit();
  assert.equal(await page.$('[data-nodeid="mefit-17"]'), null);
  await page.click('#action-focus');
  await page.setViewport({ width: 700, height: 500 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.focus('#fit-view');
  await page.keyboard.press('Enter');
  await assertFits();
  await assertZoomAfterFit();
  assert.equal(await page.$$eval('me-tpc', nodes => nodes.length), 91,
    'keyboard activation must not add a sibling node');
  result.logs.push({ ok: true, msg: 'Fit to view replaces fullscreen, fits large image maps in every layout, supports focus and narrow canvases, and leaves document data unchanged' });
  result.logs.push({ ok: true, msg: 'Manual zoom after fit preserves the canvas center for buttons and the pointer position for wheel zoom, across all layouts, focus and narrow canvases' });
} catch (error) {
  result.passed = false;
  result.logs.push({ ok: false, msg: `fit to view: ${error.stack}` });
}
try {
  await page.setViewport({ width: 1440, height: 900 });
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 80;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fb1121';
    context.fillRect(0, 0, 120, 80);
    const image = { url: canvas.toDataURL(), width: 120, height: 80 };
    return { nodeData: { id: 'rounded-root', topic: 'Image corners', root: true, image,
      children: [{ id: 'rounded-child', topic: 'Second image', image }] } };
  });
  const load = async data => {
    await page.evaluate(data => window.postMessage({ type: 'update', text: JSON.stringify(data), images: {} }, '*'), data);
    await page.waitForSelector('[data-nodeid="merounded-child"] > img');
    await page.waitForFunction(enabled => document.getElementById('rounded-images').checked === enabled,
      {}, data.roundedImages === true);
  };
  const radii = () => page.$$eval('me-tpc > img', images => images.map(image => getComputedStyle(image).borderTopLeftRadius));
  const assertBoxSelection = async label => {
    await page.click('#fit-view');
    const bounds = await page.$$eval('me-tpc', nodes => {
      const rects = nodes.map(node => node.getBoundingClientRect());
      return { left: Math.min(...rects.map(rect => rect.left)) - 12,
        top: Math.min(...rects.map(rect => rect.top)) - 12,
        right: Math.max(...rects.map(rect => rect.right)) + 12,
        bottom: Math.max(...rects.map(rect => rect.bottom)) + 12 };
    });
    assert.equal(await page.evaluate(({ left, top }) => document.elementFromPoint(left, top)
      === document.querySelector('.map-container'), bounds), true, `${label}: drag must start on empty canvas`);
    await page.mouse.move(bounds.left, bounds.top);
    await page.mouse.down();
    try {
      await page.mouse.move(bounds.right, bounds.bottom, { steps: 15 });
      assert.equal(await page.$eval('.selection-area', area => {
        const rect = area.getBoundingClientRect();
        return rect.width > 20 && rect.height > 20 && getComputedStyle(area).visibility !== 'hidden';
      }), true, `${label}: dragging must show a selection rectangle`);
    } finally {
      await page.mouse.up();
    }
    assert.deepEqual(await page.$$eval('me-tpc.selected', nodes => nodes.map(node => node.nodeObj.id).sort()),
      ['rounded-child', 'rounded-root'], `${label}: dragging must select every enclosed node`);
    await page.mouse.click(bounds.left, bounds.top);
  };
  const exportData = async format => {
    await page.evaluate(format => {
      window.__TEST__.lastMessage = null;
      document.getElementById('export-trigger').click();
      document.querySelector(`[data-export="${format}"]`).click();
    }, format);
    await page.waitForFunction(format => window.__TEST__.lastMessage?.type === 'exportFile'
      && window.__TEST__.lastMessage.format === format, {}, format);
    return page.evaluate(() => window.__TEST__.lastMessage);
  };
  const countImagePixels = async () => {
    const { dataBase64 } = await exportData('png');
    return page.evaluate(async base64 => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] === 251 && pixels[i + 1] === 17 && pixels[i + 2] === 33 && pixels[i + 3] === 255) count++;
      }
      return count;
    }, dataBase64);
  };
  await load(data);
  await page.click('#panel-tab-theme');
  assert.deepEqual(await radii(), ['0px', '0px'], 'existing documents keep square images by default');
  await assertBoxSelection('square images');
  await page.click('#panel-tab-theme');
  const squarePixels = await countImagePixels();
  assert.ok(squarePixels > 18000, 'PNG must contain both complete images');
  await page.click('#rounded-images');
  assert.deepEqual(await radii(), ['12px', '12px']);
  assert.equal(await page.evaluate(() => JSON.parse(window.__TEST__.lastMessage.text).roundedImages), true);
  await assertBoxSelection('rounded images');
  const roundedPixels = await countImagePixels();
  assert.ok(roundedPixels < squarePixels - 100 && roundedPixels > squarePixels * 0.9,
    `PNG must clip image corners while preserving the image contents: ${squarePixels} -> ${roundedPixels}`);
  const saved = JSON.parse((await exportData('mmf')).text);
  assert.equal(saved.roundedImages, true);
  assert.deepEqual(saved.nodeData.image, data.nodeData.image, 'rounding must not modify source image or dimensions');
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__TEST__?.done === true);
  await load(saved);
  assert.deepEqual(await radii(), ['12px', '12px'], 'reopening the document restores rounded images');
  await assertBoxSelection('reopened rounded images');
  await page.click('[data-nodeid="merounded-child"] .text');
  await page.click('#action-focus');
  assert.deepEqual(await radii(), ['12px'], 'focused branches retain rounded images');
  await page.click('#action-focus');
  await page.click('#panel-tab-theme');
  await page.click('#rounded-images');
  assert.deepEqual(await radii(), ['0px', '0px']);
  assert.equal(await page.evaluate(() => JSON.parse(window.__TEST__.lastMessage.text).roundedImages), false);
  await assertBoxSelection('rounding disabled');
  assert.equal(await countImagePixels(), squarePixels, 'disabling rounding restores square PNG images');
  await page.click('#panel-tab-theme');
  await page.click('#rounded-images');
  await load(data);
  assert.deepEqual(await radii(), ['0px', '0px'], 'loading a document without the setting clears the previous rounding');
  result.logs.push({ ok: true, msg: 'Global rounded images toggle applies to all images, persists through MMF reload/focus, clips PNG corners and resets for older documents without altering image data' });
  result.logs.push({ ok: true, msg: 'Dragging on blank canvas displays a selection rectangle and selects all enclosed nodes with rounded images enabled, disabled and after reopening' });
} catch (error) {
  result.passed = false;
  result.logs.push({ ok: false, msg: `rounded images: ${error.stack}` });
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
