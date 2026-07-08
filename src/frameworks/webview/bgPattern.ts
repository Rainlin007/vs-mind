export type BackgroundPattern = 'none' | 'dots' | 'grid' | 'crossDot';

export interface BackgroundPatternSettings {
    backgroundPattern: BackgroundPattern;
    bgPatternColor: string;
    bgPatternOpacity: number;
}

export const DEFAULT_BACKGROUND_PATTERN: BackgroundPatternSettings = {
    backgroundPattern: 'grid',
    bgPatternColor: '#808080',
    bgPatternOpacity: 5,
};

function hexToRgb(hex: string): [number, number, number] {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function applyBackgroundPattern(
    overlay: HTMLElement,
    settings: BackgroundPatternSettings
): void {
    const { backgroundPattern: pattern, bgPatternColor, bgPatternOpacity } = settings;

    if (!pattern || pattern === 'none') {
        overlay.style.backgroundImage = 'none';
        overlay.style.backgroundSize = '';
        return;
    }

    const [r, g, b] = hexToRgb(bgPatternColor);
    const c = `rgba(${r},${g},${b},${bgPatternOpacity / 100})`;

    const styles: Record<Exclude<BackgroundPattern, 'none'>, { backgroundImage: string; backgroundSize: string }> = {
        dots: {
            backgroundImage: `radial-gradient(circle, ${c} 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
        },
        grid: {
            backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
        },
        crossDot: {
            backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
        },
    };

    const style = styles[pattern];
    if (style) {
        overlay.style.backgroundImage = style.backgroundImage;
        overlay.style.backgroundSize = style.backgroundSize;
    } else {
        overlay.style.backgroundImage = 'none';
        overlay.style.backgroundSize = '';
    }
}
