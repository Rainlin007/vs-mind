
import * as assert from 'assert';
import * as sinon from 'sinon';
import { getClipboardImageFile, ImageProcessor, ImageModal, MindMapApp } from '../../frameworks/webview/main';

// --- DOM Mocks ---
// We need to set up the global environment before importing/using the classes if they rely on globals at module level.
// However, our classes export types, so we should be careful. 
// Ideally we use jsdom-global, but let's replicate the manual mocks for minimal dependency issues first.



declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace NodeJS {
        interface Global {
            document: any;
            window: any;
            Image: any;
            FileReader: any;
            MindElixir: any;
        }
    }
}

// Setup globals
if (typeof (global as any).document === 'undefined') {
    (global as any).document = {
        createElement: sinon.stub(),
        body: {
            appendChild: sinon.spy()
        },
        getElementById: sinon.stub(),
        querySelector: sinon.stub().returns(null),
        addEventListener: sinon.spy()
    };
}
if (typeof (global as any).window === 'undefined') {
    (global as any).window = {
        addEventListener: sinon.spy()
    };
}
if (typeof (global as any).Image === 'undefined') {
    (global as any).Image = class {
        onload: any;
        _src: any;
        constructor() {
            setTimeout(() => {
                if (this.onload) this.onload();
            }, 0);
        }
        set src(val: any) { this._src = val; }
        get width() { return 1000; }
        get height() { return 1000; }
    };
}
if (typeof (global as any).FileReader === 'undefined') {
    (global as any).FileReader = class {
        onload: any;
        readAsDataURL(_blob: any) {
            setTimeout(() => {
                if (this.onload) this.onload({ target: { result: 'data:image/png;base64,mock' } });
            }, 0);
        }
    };
}
if (typeof (global as any).MutationObserver === 'undefined') {
    (global as any).MutationObserver = class {
        observe() { }
        disconnect() { }
    };
}

// Mock MindElixir on window
(global as any).window.MindElixir = sinon.stub();

// Re-setup document.createElement mock for specific returns
const createDomElement = () => ({
    style: {},
    innerHTML: '',
    addEventListener: sinon.spy(),
    appendChild: sinon.spy(),
    querySelector: sinon.stub().returns({}),
    querySelectorAll: sinon.stub().returns([]),
    setAttribute: sinon.spy(),
    classList: {
        add: sinon.spy(),
        remove: sinon.spy(),
        contains: sinon.stub().returns(false),
        toggle: sinon.spy()
    }
});

(global as any).document.createElement = sinon.stub().callsFake(() => createDomElement());

const themeDomIds = [
    'side-panel',
    'side-panel-resizer',
    'panel-page-node',
    'panel-page-theme',
    'node-panel-empty',
    'node-panel-content',
    'panel-tab-node',
    'panel-tab-theme',
    'btn-close-panel',
    'inspector-size',
    'inspector-color',
    'inspector-hyperlink',
    'inspector-note',
    'inspector-ai-note',
    'theme-select',
    'direction-select',
    'line-style-select',
    'bg-pattern-select',
    'bg-pattern-color',
    'bg-pattern-opacity',
    'bg-pattern-opacity-value',
    'bgPatternOverlay',
];

(global as any).document.getElementById = sinon.stub().callsFake((id: string) => {
    if (id === 'input-box') {
        return null;
    }
    const el = createDomElement();
    if (themeDomIds.includes(id)) {
        (el as any).value = id === 'bg-pattern-opacity' ? '5' : '';
        if (id === 'bg-pattern-opacity-value') {
            (el as any).textContent = '5%';
        }
    }
    return el;
});
(global as any).document.querySelector = sinon.stub().returns(null);
(global as any).document.querySelectorAll = sinon.stub().returns([]);
(global as any).document.body = {
    appendChild: sinon.spy()
};


describe('Webview Refactoring Tests (TypeScript)', () => {

    describe('ImageProcessor', () => {
        it('should resize image using mock canvas', async () => {
            const mockCanvas = {
                getContext: sinon.stub().returns({
                    drawImage: sinon.spy(),
                }),
                toDataURL: sinon.stub().returns('data:image/jpeg;base64,resized'),
                width: 0,
                height: 0
            };
            (global as any).document.createElement.withArgs('canvas').returns(mockCanvas);

            const result = await ImageProcessor.resizeImage('data:image/jpeg;base64,original', 200, 200);
            assert.deepStrictEqual(result, {
                base64: 'data:image/jpeg;base64,resized',
                width: 200,
                height: 200
            });
            assert.strictEqual(mockCanvas.width, 200);
            assert.strictEqual(mockCanvas.height, 200);
        });
    });

    describe('ImageModal', () => {
        let modal: ImageModal;
        let mindMock: any;

        beforeEach(() => {
            mindMock = {
                selectNode: sinon.spy(),
                container: { focus: sinon.spy() }
            };
            const mockDiv = {
                style: {},
                appendChild: sinon.spy(),
                querySelector: sinon.stub().returns({}),
                addEventListener: sinon.spy()
            };
            (global as any).document.createElement.withArgs('div').returns(mockDiv);
            modal = new ImageModal(null, mindMock);
        });

        it('should initialize modal element', () => {
            // We can't access private property 'modal' easily in TS without casting to any or using bracket notation
            assert.ok((modal as any).modal);
            assert.strictEqual((modal as any).modal.id, 'image-popup');
        });
    });

    describe('MindMapApp', () => {
        let vscodeMock: any;
        let mindElixirMock: any;
        let app: MindMapApp;

        beforeEach(() => {
            ((global as any).document.addEventListener as sinon.SinonSpy).resetHistory();
            vscodeMock = {
                getState: sinon.stub().returns({}),
                postMessage: sinon.spy()
            };
            mindElixirMock = sinon.stub().returns({
                bus: { addListener: sinon.spy() },
                init: sinon.stub(),
                refresh: sinon.stub(),
                changeTheme: sinon.spy(),
                initLeft: sinon.spy(),
                initRight: sinon.spy(),
                initSide: sinon.spy(),
                linkDiv: sinon.spy(),
                direction: 1,
                theme: {},
                generateMainBranch: null,
                generateSubBranch: null,
                getData: sinon.stub().returns({
                    nodeData: { id: 'root', topic: 'Root', children: [] },
                    arrows: [],
                }),
                undo: sinon.spy(),
                redo: sinon.spy(),
                clearHistory: sinon.spy(),
                currentNode: null,
                reshapeNode: sinon.stub(),
                selectNode: sinon.spy(),
                findEle: sinon.stub().returns(null),
                container: {
                    focus: sinon.spy(),
                    addEventListener: sinon.spy(),
                    querySelectorAll: sinon.stub().returns([])
                }
            });
            mindElixirMock.RIGHT = 1;
            mindElixirMock.E = sinon.stub();
            mindElixirMock.default = mindElixirMock;

            const mockDiv = {
                addEventListener: sinon.spy(),
                appendChild: sinon.spy(),
                setAttribute: sinon.spy(),
                style: {},
                querySelectorAll: sinon.stub().returns([])
            };
            (global as any).document.getElementById.withArgs('mindmap').returns(mockDiv);
            (global as any).document.createElement.withArgs('div').returns(mockDiv);

            (global as any).MindElixir = mindElixirMock;
            app = new MindMapApp(vscodeMock, mindElixirMock);
        });

        it('should initialize MindElixir', () => {
            assert.ok(mindElixirMock.called);
            assert.strictEqual(mindElixirMock.firstCall.args[0].allowUndo, true);
            assert.ok((app.mind.bus.addListener as any).calledWith('operation', sinon.match.func));
        });

        it('should handle vscode update message', () => {
            const message = {
                type: 'update',
                text: JSON.stringify({
                    nodeData: {
                        id: '1',
                        topic: 'new',
                        root: true,
                        image: { url: 'thumbnail', width: 10, height: 10 },
                        children: [],
                    },
                    arrows: [],
                }),
                images: { "1": "base64" }
            };
            (app.mind.getData as sinon.SinonStub).returns(JSON.parse(message.text));
            (app as any).handleVscodeMessage(message);

            assert.deepStrictEqual((app as any).originalImageCache, { "1": "base64" });
            assert.ok((app.mind.init as any).called);
            const initArg = (app.mind.init as any).firstCall.args[0];
            assert.strictEqual(initArg.nodeData.topic, 'new');
            assert.strictEqual(initArg.themeTemplate, 'clayLight');
            assert.strictEqual(initArg.direction, 1);
            assert.strictEqual(initArg.lineStyle, 'curve');
            assert.ok(initArg.theme);
            assert.ok((app.mind.init as any).calledOnce);
        });

        it('should restore previous selection on update', () => {
            // Setup initial selection
            const selectedNodeId = 'me123';
            app.mind.currentNode = {
                nodeObj: { id: selectedNodeId, topic: 'Selected' },
                style: {}
            };

            // Mock the instance lookup to return an element when queried
            const mockNodeElement = { id: selectedNodeId };
            (app.mind.findEle as sinon.SinonStub).withArgs(selectedNodeId).returns(mockNodeElement);

            const message = {
                type: 'update',
                text: JSON.stringify({
                    nodeData: { id: 'root', topic: 'Root', children: [] },
                    arrows: [],
                }),
            };

            // Act
            (app as any).handleVscodeMessage(message);

            // Assert
            assert.ok((app.mind.selectNode as any).calledWith(mockNodeElement), 'selectNode should be called with the restored node element');
            assert.ok((app.mind.container.focus as any).called, 'container should be focused');
        });

        it('should initialize MindElixir only once across external document updates', () => {
            (app as any).handleVscodeMessage({
                type: 'update',
                text: JSON.stringify({ nodeData: { id: 'root', topic: 'one', children: [] } }),
                images: {},
            });
            (app as any).handleVscodeMessage({
                type: 'update',
                text: JSON.stringify({ nodeData: { id: 'root', topic: 'two', children: [] } }),
                images: {},
            });

            assert.ok((app.mind.init as sinon.SinonSpy).calledOnce);
            assert.ok((app.mind.refresh as sinon.SinonSpy).calledWith(sinon.match({
                nodeData: sinon.match({ topic: 'two' }),
            })));
            assert.ok((app.mind.clearHistory as sinon.SinonSpy).calledTwice);
        });

        it('should wrap MindElixir native undo and redo after initialization', () => {
            const nativeUndo = app.mind.undo as sinon.SinonSpy;
            const nativeRedo = app.mind.redo as sinon.SinonSpy;
            (app as any).handleVscodeMessage({
                type: 'update',
                text: JSON.stringify({ nodeData: { id: 'root', topic: 'original', children: [] } }),
                images: {},
            });

            assert.notStrictEqual(app.mind.undo, nativeUndo);
            assert.notStrictEqual(app.mind.redo, nativeRedo);
            app.mind.undo?.();
            app.mind.redo?.();

            assert.ok(nativeUndo.calledOnce);
            assert.ok(nativeRedo.calledOnce);
        });

        it('should restore the matching original image after native history changes the canvas', () => {
            let data: any = {
                nodeData: {
                    id: 'root',
                    topic: 'Image',
                    image: { url: 'thumbnail-old', width: 10, height: 10 },
                    children: [],
                },
                arrows: [],
            };
            (app.mind.init as sinon.SinonStub).callsFake((doc: any) => {
                data = JSON.parse(JSON.stringify(doc));
            });
            (app.mind.getData as sinon.SinonStub).callsFake(() => JSON.parse(JSON.stringify(data)));

            (app as any).handleVscodeMessage({
                type: 'update',
                text: JSON.stringify(data),
                images: { root: 'original-old' },
            });

            data.nodeData = { id: 'root', topic: 'Image removed', children: [] };
            app.handleOperation({ name: 'removeNodes' });
            assert.deepStrictEqual(vscodeMock.postMessage.lastCall.args[0].images, {});

            data.nodeData = {
                id: 'root',
                topic: 'Image',
                image: { url: 'thumbnail-old', width: 10, height: 10 },
                children: [],
            };
            app.saveChanges();
            assert.deepStrictEqual(vscodeMock.postMessage.lastCall.args[0].images, {
                root: 'original-old',
            });
        });

        it('should paste an image into the selected node from the document', async () => {
            const targetNode = {
                nodeObj: { id: 'image-node', topic: 'Image node', children: [] } as any,
                style: {}
            };
            app.mind.currentNode = targetNode;
            (app.mind.reshapeNode as sinon.SinonStub).callsFake((_node: any, patch: any) => {
                Object.assign(targetNode.nodeObj, patch);
            });
            (app.mind.getData as sinon.SinonStub).callsFake(() => ({
                nodeData: JSON.parse(JSON.stringify(targetNode.nodeObj)),
                arrows: [],
            }));
            const renderedNode = { id: 'image-node' };
            mindElixirMock.E.withArgs('image-node').returns(renderedNode);
            const resizeStub = sinon.stub(ImageProcessor, 'resizeImage').resolves({
                base64: 'data:image/jpeg;base64,resized',
                width: 200,
                height: 120,
            });
            const imageFile = { type: 'image/png' } as File;
            const preventDefault = sinon.spy();
            const stopImmediatePropagation = sinon.spy();
            const clipboardEvent = {
                clipboardData: {
                    items: [{ type: 'image/png', getAsFile: () => imageFile }],
                    files: [],
                },
                preventDefault,
                stopImmediatePropagation,
            } as unknown as ClipboardEvent;
            const pasteListener = ((global as any).document.addEventListener as sinon.SinonSpy)
                .getCalls()
                .find(call => call.args[0] === 'paste' && call.args[2] === true)?.args[1];

            assert.ok(pasteListener, 'document-level image paste listener should be registered');
            pasteListener(clipboardEvent);
            await new Promise(resolve => setTimeout(resolve, 10));

            assert.ok(preventDefault.called);
            assert.ok(stopImmediatePropagation.calledOnce);
            assert.ok((app.mind.reshapeNode as any).calledWith(targetNode, {
                image: {
                    url: 'data:image/jpeg;base64,resized',
                    width: 200,
                    height: 120,
                }
            }));
            assert.deepStrictEqual((app as any).originalImageCache, {
                'image-node': 'data:image/png;base64,mock'
            });
            resizeStub.restore();
        });
    });

    it('should find clipboard images from the files fallback', () => {
        const imageFile = { type: 'image/png' } as File;
        const event = {
            clipboardData: { items: [], files: [imageFile] }
        } as unknown as ClipboardEvent;

        assert.strictEqual(getClipboardImageFile(event), imageFile);
    });
});
