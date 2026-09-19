import * as assert from 'assert';
import * as sinon from 'sinon';
import { SidePanel } from '../../../frameworks/webview/SidePanel';

describe('SidePanel defaults', () => {
    const originalDocument = global.document;

    afterEach(() => {
        sinon.restore();
        (global as any).document = originalDocument;
    });

    it('opens the panel by default', () => {
        const classes = new Set(['hidden']);
        const panel = {
            style: {},
            classList: {
                add: (name: string) => classes.add(name),
                remove: (name: string) => classes.delete(name),
                contains: (name: string) => classes.has(name),
            },
        };
        const passiveElement = {
            addEventListener: sinon.spy(),
            classList: { add: sinon.spy(), remove: sinon.spy(), toggle: sinon.spy() },
        };
        (global as any).document = {
            getElementById: (id: string) => id === 'side-panel' ? panel : passiveElement,
            querySelectorAll: sinon.stub().returns([]),
            body: { style: {} },
            addEventListener: sinon.spy(),
            removeEventListener: sinon.spy(),
        };

        const sidePanel = new SidePanel();

        assert.strictEqual(sidePanel.isVisible(), true);
        assert.strictEqual(classes.has('hidden'), false);
    });
});
