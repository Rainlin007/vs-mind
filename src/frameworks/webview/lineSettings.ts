import type { MindElixirInstance, MainLineParams, SubLineParams } from 'mind-elixir';

export type LineStyle = 'curve' | 'elbow' | 'straight' | 'branch' | 'step';
export type LayoutDirection = 0 | 1 | 2;

export const DEFAULT_DIRECTION: LayoutDirection = 1;
export const DEFAULT_LINE_STYLE: LineStyle = 'curve';

const LHS = 'lhs';
const MAX_ELBOW_RADIUS = 12;

export const LAYOUT_OPTIONS: Array<{ value: LayoutDirection; label: string }> = [
    { value: 0, label: '向左' },
    { value: 1, label: '向右' },
    { value: 2, label: '双侧' },
];

export const LINE_STYLE_OPTIONS: Array<{ value: LineStyle; label: string }> = [
    { value: 'curve', label: '流畅曲线' },
    { value: 'straight', label: '简洁直线' },
    { value: 'elbow', label: '圆角折线' },
    { value: 'step', label: '阶梯折线' },
    { value: 'branch', label: '经典下划线' },
];

interface HorizontalAnchors {
    x1: number;
    x2: number;
    childFarX: number;
}

function getHorizontalAnchors(
    { pL, pW, cL, cW, direction }: Pick<MainLineParams, 'pL' | 'pW' | 'cL' | 'cW' | 'direction'>,
): HorizontalAnchors {
    if (direction === LHS) {
        return {
            x1: pL + 15,
            x2: cL + cW - 15,
            childFarX: cL + 15,
        };
    }
    return {
        x1: pL + pW - 15,
        x2: cL + 15,
        childFarX: cL + cW - 15,
    };
}

function getCenterPoints(params: MainLineParams | SubLineParams) {
    const { pT, pH, cT, cH } = params;
    const { x1, x2 } = getHorizontalAnchors(params);
    return {
        x1,
        y1: pT + pH / 2,
        x2,
        y2: cT + cH / 2,
    };
}

function flowingCurvePath(params: MainLineParams | SubLineParams): string {
    const { x1, y1, x2, y2 } = getCenterPoints(params);
    const midX = x1 + (x2 - x1) / 2;
    return `M ${x1} ${y1} C ${midX} ${y1} ${midX} ${y2} ${x2} ${y2}`;
}

function curveMain(params: MainLineParams): string {
    return flowingCurvePath(params);
}

function curveSub(this: MindElixirInstance, params: SubLineParams): string {
    return flowingCurvePath(params);
}

function roundedElbowPath(params: MainLineParams | SubLineParams): string {
    const { pT, pH, cT, cH } = params;
    const { x1, x2 } = getHorizontalAnchors(params);
    const y1 = pT + pH / 2;
    const y2 = cT + cH / 2;

    if (y1 === y2) {
        return `M ${x1} ${y1} H ${x2}`;
    }

    const midX = x1 + (x2 - x1) / 2;
    const horizontalSign = Math.sign(x2 - x1) || 1;
    const verticalSign = Math.sign(y2 - y1) || 1;
    const radius = Math.min(
        MAX_ELBOW_RADIUS,
        Math.abs(midX - x1),
        Math.abs(y2 - y1) / 2,
    );

    const firstTurnStartX = midX - horizontalSign * radius;
    const firstTurnEndY = y1 + verticalSign * radius;
    const secondTurnStartY = y2 - verticalSign * radius;
    const secondTurnEndX = midX + horizontalSign * radius;

    return [
        `M ${x1} ${y1}`,
        `H ${firstTurnStartX}`,
        `Q ${midX} ${y1} ${midX} ${firstTurnEndY}`,
        `V ${secondTurnStartY}`,
        `Q ${midX} ${y2} ${secondTurnEndX} ${y2}`,
        `H ${x2}`,
    ].join(' ');
}

function elbowMain(params: MainLineParams): string {
    return roundedElbowPath(params);
}

function elbowSub(this: MindElixirInstance, params: SubLineParams): string {
    return roundedElbowPath(params);
}

function straightPath(params: MainLineParams | SubLineParams): string {
    const { x1, y1, x2, y2 } = getCenterPoints(params);
    return `M ${x1} ${y1} L ${x2} ${y2}`;
}

function straightMain(params: MainLineParams): string {
    return straightPath(params);
}

function straightSub(this: MindElixirInstance, params: SubLineParams): string {
    return straightPath(params);
}

function branchPath(params: MainLineParams | SubLineParams, nested: boolean): string {
    const { pT, pH, cT, cH } = params;
    const { x1, x2, childFarX } = getHorizontalAnchors(params);
    const y1 = nested ? pT + pH : pT + pH / 2;
    const y2 = cT + cH;
    const controlX = x1 + (x2 - x1) / 2;

    return `M ${x1} ${y1} C ${controlX} ${y1} ${controlX} ${y2} ${x2} ${y2} H ${childFarX}`;
}

function branchMain(params: MainLineParams): string {
    return branchPath(params, false);
}

function branchSub(this: MindElixirInstance, params: SubLineParams): string {
    return branchPath(params, true);
}

function stepPath(params: MainLineParams | SubLineParams): string {
    const { x1, y1, x2, y2 } = getCenterPoints(params);
    const midX = x1 + (x2 - x1) / 2;
    return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
}

function stepMain(params: MainLineParams): string {
    return stepPath(params);
}

function stepSub(this: MindElixirInstance, params: SubLineParams): string {
    return stepPath(params);
}

const LINE_GENERATORS: Record<LineStyle, {
    main: (params: MainLineParams) => string;
    sub: (this: MindElixirInstance, params: SubLineParams) => string;
}> = {
    curve: { main: curveMain, sub: curveSub },
    elbow: { main: elbowMain, sub: elbowSub },
    straight: { main: straightMain, sub: straightSub },
    branch: { main: branchMain, sub: branchSub },
    step: { main: stepMain, sub: stepSub },
};

export function applyLineStyle(mind: MindElixirInstance, lineStyle: LineStyle): void {
    const generators = LINE_GENERATORS[lineStyle];
    mind.generateMainBranch = generators.main as MindElixirInstance['generateMainBranch'];
    mind.generateSubBranch = generators.sub as MindElixirInstance['generateSubBranch'];
    mind.linkDiv();
}

export function applyLayoutDirection(mind: MindElixirInstance, direction: LayoutDirection): void {
    switch (direction) {
        case 0:
            mind.initLeft();
            break;
        case 1:
            mind.initRight();
            break;
        case 2:
            mind.initSide();
            break;
    }
}

export function normalizeDirection(value: unknown): LayoutDirection {
    if (value === 0 || value === 1 || value === 2) {
        return value;
    }
    return DEFAULT_DIRECTION;
}

export function normalizeLineStyle(value: unknown): LineStyle {
    if (
        value === 'curve'
        || value === 'elbow'
        || value === 'straight'
        || value === 'branch'
        || value === 'step'
    ) {
        return value;
    }
    return DEFAULT_LINE_STYLE;
}
