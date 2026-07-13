
import * as assert from 'assert';
import * as sinon from 'sinon';
import { ImageProcessor, ImageModal, MindMapApp } from '../../frameworks/webview/main';

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
            vscodeMock = {
                getState: sinon.stub().returns({}),
                postMessage: sinon.spy()
            };
            mindElixirMock = sinon.stub().returns({
                bus: { addListener: sinon.spy() },
                init: sinon.spy(),
                refresh: sinon.spy(),
                changeTheme: sinon.spy(),
                initLeft: sinon.spy(),
                initRight: sinon.spy(),
                initSide: sinon.spy(),
                linkDiv: sinon.spy(),
                theme: {},
                generateMainBranch: null,
                generateSubBranch: null,
                getData: sinon.stub().returns({ data: 'test' }),
                currentNode: null,
                reshapeNode: sinon.spy(),
                selectNode: sinon.spy(),
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
            assert.ok((app.mind.bus.addListener as any).calledWith('operation', sinon.match.func));
        });

        it('should handle vscode update message', () => {
            const message = {
                type: 'update',
                text: JSON.stringify({
                    nodeData: { id: 'root', topic: 'new', root: true, children: [] },
                    arrows: [],
                }),
                images: { "1": "base64" }
            };
            (app as any).handleVscodeMessage(message);

            assert.deepStrictEqual((app as any).originalImageCache, { "1": "base64" });
            assert.ok((app.mind.init as any).called);
            const initArg = (app.mind.init as any).firstCall.args[0];
            assert.strictEqual(initArg.nodeData.topic, 'new');
            assert.strictEqual(initArg.themeTemplate, 'clayLight');
            assert.strictEqual(initArg.direction, 1);
            assert.strictEqual(initArg.lineStyle, 'curve');
            assert.ok(initArg.theme);
            assert.ok((app.mind.refresh as any).called);
        });

        it('should restore previous selection on update', () => {
            // Setup initial selection
            const selectedNodeId = 'me123';
            app.mind.currentNode = {
                nodeObj: { id: selectedNodeId, topic: 'Selected' },
                style: {}
            };

            // Mock MindElixir.E to return an element when queried
            const mockNodeElement = { id: selectedNodeId };
            mindElixirMock.E.withArgs(selectedNodeId).returns(mockNodeElement);

            const message = { type: 'update', text: '{}' };

            // Act
            (app as any).handleVscodeMessage(message);

            // Assert
            assert.ok((app.mind.selectNode as any).calledWith(mockNodeElement), 'selectNode should be called with the restored node element');
            assert.ok((app.mind.container.focus as any).called, 'container should be focused');
        });
    });
});
