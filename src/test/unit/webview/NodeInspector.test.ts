import * as assert from 'assert';
import * as sinon from 'sinon';
import { NodeInspector } from '../../../frameworks/webview/NodeInspector';

class MockControl {
    value = '';
    disabled = false;
    style: Record<string, string> = {};
    classList = {
        add: sinon.spy(),
        remove: sinon.spy(),
    };
    private readonly listeners = new Map<string, Array<() => void>>();

    addEventListener(type: string, listener: () => void): void {
        const listeners = this.listeners.get(type) ?? [];
        listeners.push(listener);
        this.listeners.set(type, listeners);
    }

    querySelectorAll(): never[] {
        return [];
    }

    dispatch(type: string): void {
        this.listeners.get(type)?.forEach(listener => listener());
    }
}

describe('NodeInspector AI note', () => {
    const originalDocument = global.document;

    afterEach(() => {
        sinon.restore();
        (global as any).document = originalDocument;
    });

    it('loads, saves, and removes ai_note for the selected node', () => {
        const controls: Record<string, MockControl> = {
            'node-panel-content': new MockControl(),
            'node-panel-empty': new MockControl(),
            'inspector-size': new MockControl(),
            'inspector-color': new MockControl(),
            'inspector-hyperlink': new MockControl(),
            'inspector-note': new MockControl(),
            'inspector-ai-note': new MockControl(),
        };
        (global as any).document = {
            getElementById: (id: string) => controls[id] ?? null,
        };

        const nodeObj: any = {
            id: 'node-1',
            topic: 'Node',
            ai_note: 'Existing AI note',
        };
        const mind = {
            currentNode: { nodeObj, style: {} },
            reshapeNode: sinon.spy(),
            findEle: sinon.stub().returns(null),
            container: null,
        };
        const onChange = sinon.spy();
        const inspector = new NodeInspector(mind, onChange);
        const aiNoteInput = controls['inspector-ai-note'];

        inspector.show(nodeObj);
        assert.strictEqual(aiNoteInput.value, 'Existing AI note');

        aiNoteInput.dispatch('focus');
        aiNoteInput.value = 'Only consider offline deployment.';
        aiNoteInput.dispatch('blur');
        assert.strictEqual(nodeObj.ai_note, 'Only consider offline deployment.');

        aiNoteInput.value = '   ';
        aiNoteInput.dispatch('blur');
        assert.ok(!('ai_note' in nodeObj));
        assert.strictEqual(onChange.callCount, 2);
    });
});
