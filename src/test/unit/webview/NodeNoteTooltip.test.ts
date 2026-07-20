import * as assert from 'assert';
import * as sinon from 'sinon';
import { NodeNoteTooltip } from '../../../frameworks/webview/NodeNoteTooltip';

describe('NodeNoteTooltip', () => {
    const originalDocument = global.document;
    const originalMutationObserver = global.MutationObserver;

    afterEach(() => {
        sinon.restore();
        (global as any).document = originalDocument;
        (global as any).MutationObserver = originalMutationObserver;
    });

    it('restores note markers when MindElixir rebuilds or selects a node', () => {
        const markerToggle = sinon.spy();
        const topics: any[] = [];
        const root = {
            addEventListener: sinon.spy(),
            querySelectorAll: sinon.stub().callsFake(() => topics),
        };
        const tooltip = {
            className: '',
            hidden: false,
            style: {},
            setAttribute: sinon.spy(),
        };
        (global as any).document = {
            body: { appendChild: sinon.spy() },
            createElement: sinon.stub().returns(tooltip),
        };

        let onMutation: MutationCallback | undefined;
        const observe = sinon.spy();
        (global as any).MutationObserver = class {
            constructor(callback: MutationCallback) {
                onMutation = callback;
            }

            observe = observe;
        };

        new NodeNoteTooltip(root as unknown as HTMLElement);
        topics.push({
            nodeObj: { note: 'Persistent note' },
            classList: { toggle: markerToggle },
        });
        onMutation?.([], {} as MutationObserver);

        assert.ok(observe.calledWith(root, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class'],
        }));
        assert.ok(markerToggle.calledWith('has-note', true));
    });
});
