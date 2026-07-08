import type { MindElixirInstance, MainLineParams, SubLineParams } from 'mind-elixir';

export type LineStyle = 'curve' | 'straight' | 'markmap' | 'straightUnderline';
export type LayoutDirection = 0 | 1 | 2;

export const DEFAULT_DIRECTION: LayoutDirection = 1;
export const DEFAULT_LINE_STYLE: LineStyle = 'curve';

const LHS = 'lhs';
const RHS = 'rhs';

export const LAYOUT_OPTIONS: Array<{ value: LayoutDirection; label: string }> = [
    { value: 0, label: '向左' },
    { value: 1, label: '向右' },
    { value: 2, label: '双侧' },
];

export const LINE_STYLE_OPTIONS: Array<{ value: LineStyle; label: string }> = [
    { value: 'curve', label: '曲线' },
    { value: 'straight', label: '折线' },
    { value: 'markmap', label: '下划线' },
    { value: 'straightUnderline', label: '直角下划线' },
];

function markmapMain({ pT, pL, pW, pH, cT, cL, cW, cH, direction }: MainLineParams): string {
    const y1 = pT + pH / 2;
    const y2 = cT + cH;
    let x1: number;
    let x2: number;
    let end: number;
    let ctrlX: number;
    if (direction === LHS) {
        x1 = pL + 15;
        x2 = cL + cW - 15;
        end = cL + 15;
        ctrlX = x1 - (x1 - x2) / 2;
    } else {
        x1 = pL + pW - 15;
        x2 = cL + 15;
        end = cL + cW - 15;
        ctrlX = x1 + (x2 - x1) / 2;
    }
    return `M ${x1} ${y1} C ${ctrlX} ${y1} ${ctrlX} ${y2} ${x2} ${y2} H ${end}`;
}

function markmapSub(this: MindElixirInstance, { pT, pL, pW, pH, cT, cL, cW, cH, direction }: SubLineParams): string {
    const y1 = pT + pH;
    const y2 = cT + cH;
    let x1: number;
    let x2: number;
    let end: number;
    let ctrlX: number;
    if (direction === LHS) {
        x1 = pL + 15;
        x2 = cL + cW - 15;
        end = cL + 15;
        ctrlX = x1 - (x1 - x2) / 2;
    } else {
        x1 = pL + pW - 15;
        x2 = cL + 15;
        end = cL + cW - 15;
        ctrlX = x1 + (x2 - x1) / 2;
    }
    return `M ${x1} ${y1} C ${ctrlX} ${y1} ${ctrlX} ${y2} ${x2} ${y2} H ${end}`;
}

function straightMain({ pT, pL, pW, pH, cT, cL, cW, cH, direction }: MainLineParams): string {
    const y1 = pT + pH / 2;
    const y2 = cT + cH / 2;
    let x1: number;
    let x2: number;
    if (direction === LHS) {
        x1 = pL + 15;
        x2 = cL + cW - 15;
    } else {
        x1 = pL + pW - 15;
        x2 = cL + 15;
    }
    const midX = x1 + (x2 - x1) / 2;
    return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
}

function straightSub(this: MindElixirInstance, { pT, pL, pW, pH, cT, cL, cW, cH, direction }: SubLineParams): string {
    const y1 = pT + pH / 2;
    const y2 = cT + cH / 2;
    let x1: number;
    let x2: number;
    if (direction === LHS) {
        x1 = pL + 15;
        x2 = cL + cW - 15;
    } else {
        x1 = pL + pW - 15;
        x2 = cL + 15;
    }
    const midX = x1 + (x2 - x1) / 2;
    return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
}

function straightUnderlineMain({ pT, pL, pW, pH, cT, cL, cW, cH, direction }: MainLineParams): string {
    const y1 = pT + pH / 2;
    const y2 = cT + cH;
    let x1: number;
    let x2: number;
    let end: number;
    if (direction === LHS) {
        x1 = pL + 15;
        x2 = cL + cW - 15;
        end = cL + 15;
    } else {
        x1 = pL + pW - 15;
        x2 = cL + 15;
        end = cL + cW - 15;
    }
    const midX = x1 + (x2 - x1) / 2;
    return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2} H ${end}`;
}

function straightUnderlineSub(this: MindElixirInstance, { pT, pL, pW, pH, cT, cL, cW, cH, direction }: SubLineParams): string {
    const y1 = pT + pH;
    const y2 = cT + cH;
    let x1: number;
    let x2: number;
    let end: number;
    if (direction === LHS) {
        x1 = pL + 15;
        x2 = cL + cW - 15;
        end = cL + 15;
    } else {
        x1 = pL + pW - 15;
        x2 = cL + 15;
        end = cL + cW - 15;
    }
    const midX = x1 + (x2 - x1) / 2;
    return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2} H ${end}`;
}

const BRANCH_GENERATORS: Record<Exclude<LineStyle, 'curve'>, {
    main: (params: MainLineParams) => string;
    sub: (this: MindElixirInstance, params: SubLineParams) => string;
}> = {
    straight: { main: straightMain, sub: straightSub },
    markmap: { main: markmapMain, sub: markmapSub },
    straightUnderline: { main: straightUnderlineMain, sub: straightUnderlineSub },
};

export function applyLineStyle(mind: MindElixirInstance, lineStyle: LineStyle): void {
    if (lineStyle === 'curve') {
        mind.changeTheme(mind.theme, true);
        return;
    }
    const gens = BRANCH_GENERATORS[lineStyle];
    mind.generateMainBranch = gens.main as MindElixirInstance['generateMainBranch'];
    mind.generateSubBranch = gens.sub as MindElixirInstance['generateSubBranch'];
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
    if (value === 'straight' || value === 'markmap' || value === 'straightUnderline' || value === 'curve') {
        return value;
    }
    return DEFAULT_LINE_STYLE;
}
