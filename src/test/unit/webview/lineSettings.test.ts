import * as assert from 'assert';
import * as sinon from 'sinon';
import type { MainLineParams, MindElixirInstance, SubLineParams } from 'mind-elixir';
import {
    applyLineStyle,
    LINE_STYLE_OPTIONS,
    normalizeLineStyle,
} from '../../../frameworks/webview/lineSettings';

const rightParams: MainLineParams = {
    pT: 100,
    pL: 100,
    pW: 80,
    pH: 40,
    cT: 180,
    cL: 300,
    cW: 100,
    cH: 40,
    direction: 'rhs',
    containerHeight: 600,
};

const leftParams: MainLineParams = {
    ...rightParams,
    cL: -100,
    direction: 'lhs',
};

const rightSubParams: SubLineParams = {
    pT: rightParams.pT,
    pL: rightParams.pL,
    pW: rightParams.pW,
    pH: rightParams.pH,
    cT: rightParams.cT,
    cL: rightParams.cL,
    cW: rightParams.cW,
    cH: rightParams.cH,
    direction: rightParams.direction,
    isFirst: false,
};

function createMindStub() {
    const changeTheme = sinon.spy();
    const linkDiv = sinon.spy();
    const mind = {
        theme: { name: 'test-theme' },
        changeTheme,
        linkDiv,
        generateMainBranch: sinon.stub().returns('native-main'),
        generateSubBranch: sinon.stub().returns('native-sub'),
    } as unknown as MindElixirInstance;

    return { mind, changeTheme, linkDiv };
}

describe('lineSettings Unit Test Suite', () => {
    afterEach(() => sinon.restore());

    it('exposes the five approved line styles', () => {
        assert.deepStrictEqual(LINE_STYLE_OPTIONS, [
            { value: 'curve', label: '流畅曲线' },
            { value: 'straight', label: '简洁直线' },
            { value: 'elbow', label: '圆角折线' },
            { value: 'step', label: '阶梯折线' },
            { value: 'branch', label: '经典下划线' },
        ]);
    });

    it('normalizes all approved values and rejects removed values', () => {
        assert.strictEqual(normalizeLineStyle('curve'), 'curve');
        assert.strictEqual(normalizeLineStyle('elbow'), 'elbow');
        assert.strictEqual(normalizeLineStyle('straight'), 'straight');
        assert.strictEqual(normalizeLineStyle('branch'), 'branch');
        assert.strictEqual(normalizeLineStyle('step'), 'step');
        assert.strictEqual(normalizeLineStyle('markmap'), 'curve');
        assert.strictEqual(normalizeLineStyle('straightUnderline'), 'curve');
    });

    it('draws direct straight lines between topic edge centers', () => {
        const { mind, linkDiv } = createMindStub();
        applyLineStyle(mind, 'straight');

        assert.strictEqual(
            mind.generateMainBranch?.call(mind, rightParams),
            'M 165 120 L 315 200',
        );
        assert.strictEqual(
            mind.generateSubBranch?.call(mind, rightSubParams),
            'M 165 120 L 315 200',
        );
        assert.ok(linkDiv.calledOnce);
    });

    it('draws square step paths that mirror horizontally', () => {
        const right = createMindStub();
        applyLineStyle(right.mind, 'step');
        assert.strictEqual(
            right.mind.generateMainBranch?.call(right.mind, rightParams),
            'M 165 120 H 240 V 200 H 315',
        );
        assert.ok(right.linkDiv.calledOnce);

        const left = createMindStub();
        applyLineStyle(left.mind, 'step');
        assert.strictEqual(
            left.mind.generateMainBranch?.call(left.mind, leftParams),
            'M 115 120 H 50 V 200 H -15',
        );
        assert.ok(left.linkDiv.calledOnce);
    });

    it('draws rounded elbow paths in both directions', () => {
        const right = createMindStub();
        applyLineStyle(right.mind, 'elbow');
        assert.strictEqual(
            right.mind.generateMainBranch?.call(right.mind, rightParams),
            'M 165 120 H 228 Q 240 120 240 132 V 188 Q 240 200 252 200 H 315',
        );

        const left = createMindStub();
        applyLineStyle(left.mind, 'elbow');
        assert.strictEqual(
            left.mind.generateMainBranch?.call(left.mind, leftParams),
            'M 115 120 H 62 Q 50 120 50 132 V 188 Q 50 200 38 200 H -15',
        );
    });

    it('collapses a same-row rounded elbow to a horizontal line', () => {
        const { mind } = createMindStub();
        applyLineStyle(mind, 'elbow');
        assert.strictEqual(
            mind.generateMainBranch?.call(mind, { ...rightParams, cT: 100 }),
            'M 165 120 H 315',
        );
    });

    it('rounds an elbow that routes upward', () => {
        const { mind } = createMindStub();
        applyLineStyle(mind, 'elbow');
        assert.strictEqual(
            mind.generateMainBranch?.call(mind, { ...rightParams, cT: 20 }),
            'M 165 120 H 228 Q 240 120 240 108 V 52 Q 240 40 252 40 H 315',
        );
    });

    it('draws a curved branch that underlines the child topic', () => {
        const { mind, linkDiv } = createMindStub();
        applyLineStyle(mind, 'branch');

        assert.strictEqual(
            mind.generateMainBranch?.call(mind, rightParams),
            'M 165 120 C 240 120 240 220 315 220 H 385',
        );
        assert.strictEqual(
            mind.generateSubBranch?.call(mind, rightSubParams),
            'M 165 140 C 240 140 240 220 315 220 H 385',
        );
        assert.ok(linkDiv.calledOnce);
    });

    it('draws smooth curves without restoring native underlines', () => {
        const { mind, changeTheme, linkDiv } = createMindStub();
        applyLineStyle(mind, 'curve');

        assert.strictEqual(
            mind.generateMainBranch?.call(mind, rightParams),
            'M 165 120 C 240 120 240 200 315 200',
        );
        assert.strictEqual(
            mind.generateSubBranch?.call(mind, rightSubParams),
            'M 165 120 C 240 120 240 200 315 200',
        );
        assert.ok(changeTheme.notCalled);
        assert.ok(linkDiv.calledOnce);
    });
});
