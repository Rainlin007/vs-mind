import type { MindElixirData, Theme } from 'mind-elixir';
import type { BackgroundPattern } from './bgPattern';
import {
    applyBackgroundPattern,
    DEFAULT_BACKGROUND_PATTERN,
} from './bgPattern';
import {
    applyLayoutDirection,
    applyLineStyle,
    DEFAULT_DIRECTION,
    DEFAULT_LINE_STYLE,
    LAYOUT_OPTIONS,
    LINE_STYLE_OPTIONS,
    normalizeDirection,
    normalizeLineStyle,
    type LayoutDirection,
    type LineStyle,
} from './lineSettings';
import { DEFAULT_THEME_ID, getThemeById, getThemeGroups } from './themes/presetThemes';

export interface ThemeDocumentSettings {
    themeTemplate: string;
    backgroundPattern: BackgroundPattern;
    bgPatternColor: string;
    bgPatternOpacity: number;
    direction: LayoutDirection;
    lineStyle: LineStyle;
}

export const DEFAULT_THEME_SETTINGS: ThemeDocumentSettings = {
    themeTemplate: DEFAULT_THEME_ID,
    ...DEFAULT_BACKGROUND_PATTERN,
    direction: DEFAULT_DIRECTION,
    lineStyle: DEFAULT_LINE_STYLE,
};

export interface MindElixirThemeHost {
    changeTheme(theme: Theme, shouldRefresh?: boolean): void;
    initLeft(): void;
    initRight(): void;
    initSide(): void;
    linkDiv(): void;
    theme: Theme;
    generateMainBranch: unknown;
    generateSubBranch: unknown;
}

export class ThemePanel {
    private themeSelect: HTMLSelectElement;
    private directionSelect: HTMLSelectElement;
    private lineStyleSelect: HTMLSelectElement;
    private bgPatternSelect: HTMLSelectElement;
    private bgPatternColor: HTMLInputElement;
    private bgPatternOpacity: HTMLInputElement;
    private bgPatternOpacityValue: HTMLElement;
    private bgOverlay: HTMLElement;
    private settings: ThemeDocumentSettings = { ...DEFAULT_THEME_SETTINGS };
    private mindReady = false;

    constructor(
        private readonly mind: MindElixirThemeHost,
        private readonly onChange: () => void
    ) {
        this.themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
        this.directionSelect = document.getElementById('direction-select') as HTMLSelectElement;
        this.lineStyleSelect = document.getElementById('line-style-select') as HTMLSelectElement;
        this.bgPatternSelect = document.getElementById('bg-pattern-select') as HTMLSelectElement;
        this.bgPatternColor = document.getElementById('bg-pattern-color') as HTMLInputElement;
        this.bgPatternOpacity = document.getElementById('bg-pattern-opacity') as HTMLInputElement;
        this.bgPatternOpacityValue = document.getElementById('bg-pattern-opacity-value') as HTMLElement;
        this.bgOverlay = document.getElementById('bgPatternOverlay') as HTMLElement;

        this.populateThemeSelect();
        this.populateDirectionSelect();
        this.populateLineStyleSelect();
        this.initListeners();
        this.syncSettingsToUi(this.settings);
        this.applyBgPattern();
    }

    markMindReady(): void {
        this.mindReady = true;
    }

    getSettings(): ThemeDocumentSettings {
        return { ...this.settings };
    }

    loadFromDocument(data: Partial<ThemeDocumentSettings> | undefined): void {
        this.syncSettingsToUi({
            themeTemplate: data?.themeTemplate || DEFAULT_THEME_ID,
            backgroundPattern: data?.backgroundPattern || DEFAULT_BACKGROUND_PATTERN.backgroundPattern,
            bgPatternColor: data?.bgPatternColor || DEFAULT_BACKGROUND_PATTERN.bgPatternColor,
            bgPatternOpacity: data?.bgPatternOpacity ?? DEFAULT_BACKGROUND_PATTERN.bgPatternOpacity,
            direction: normalizeDirection(data?.direction),
            lineStyle: normalizeLineStyle(data?.lineStyle),
        });
        this.applyBgPattern();
        if (this.mindReady) {
            this.applyDirection();
            this.applyLineStyleOnly();
        }
    }

    private populateThemeSelect(): void {
        if (!this.themeSelect) return;
        this.themeSelect.innerHTML = '';
        for (const group of getThemeGroups()) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = group.label;
            for (const theme of group.themes) {
                const option = document.createElement('option');
                option.value = theme.value;
                option.textContent = theme.label;
                optgroup.appendChild(option);
            }
            this.themeSelect.appendChild(optgroup);
        }
    }

    private populateDirectionSelect(): void {
        if (!this.directionSelect) return;
        this.directionSelect.innerHTML = '';
        for (const item of LAYOUT_OPTIONS) {
            const option = document.createElement('option');
            option.value = String(item.value);
            option.textContent = item.label;
            this.directionSelect.appendChild(option);
        }
    }

    private populateLineStyleSelect(): void {
        if (!this.lineStyleSelect) return;
        this.lineStyleSelect.innerHTML = '';
        for (const item of LINE_STYLE_OPTIONS) {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.label;
            this.lineStyleSelect.appendChild(option);
        }
    }

    private initListeners(): void {
        this.themeSelect?.addEventListener('change', () => {
            this.settings.themeTemplate = this.themeSelect.value;
            this.applyTheme();
            this.onChange();
        });

        this.directionSelect?.addEventListener('change', () => {
            this.settings.direction = normalizeDirection(parseInt(this.directionSelect.value, 10));
            this.applyDirection();
            this.onChange();
        });

        this.lineStyleSelect?.addEventListener('change', () => {
            this.settings.lineStyle = normalizeLineStyle(this.lineStyleSelect.value);
            this.applyLineStyleOnly();
            this.onChange();
        });

        this.bgPatternSelect?.addEventListener('change', () => {
            this.settings.backgroundPattern = this.bgPatternSelect.value as BackgroundPattern;
            this.applyBgPattern();
            this.onChange();
        });

        this.bgPatternColor?.addEventListener('input', () => {
            this.settings.bgPatternColor = this.bgPatternColor.value;
            this.applyBgPattern();
            this.onChange();
        });

        this.bgPatternOpacity?.addEventListener('input', () => {
            this.settings.bgPatternOpacity = parseInt(this.bgPatternOpacity.value, 10);
            if (this.bgPatternOpacityValue) {
                this.bgPatternOpacityValue.textContent = `${this.settings.bgPatternOpacity}%`;
            }
            this.applyBgPattern();
        });

        this.bgPatternOpacity?.addEventListener('change', () => {
            this.onChange();
        });
    }

    private syncSettingsToUi(settings: ThemeDocumentSettings): void {
        this.settings = { ...settings };

        if (this.themeSelect) this.themeSelect.value = settings.themeTemplate;
        if (this.directionSelect) this.directionSelect.value = String(settings.direction);
        if (this.lineStyleSelect) this.lineStyleSelect.value = settings.lineStyle;
        if (this.bgPatternSelect) this.bgPatternSelect.value = settings.backgroundPattern;
        if (this.bgPatternColor) this.bgPatternColor.value = settings.bgPatternColor;
        if (this.bgPatternOpacity) this.bgPatternOpacity.value = String(settings.bgPatternOpacity);
        if (this.bgPatternOpacityValue) {
            this.bgPatternOpacityValue.textContent = `${settings.bgPatternOpacity}%`;
        }
    }

    private applyTheme(): void {
        if (!this.mindReady) return;
        const preset = getThemeById(this.settings.themeTemplate) || getThemeById(DEFAULT_THEME_ID);
        if (preset) {
            this.mind.changeTheme(preset.theme, true);
            this.applyLineStyleOnly();
        }
    }

    private applyDirection(): void {
        if (!this.mindReady) return;
        applyLayoutDirection(this.mind as Parameters<typeof applyLayoutDirection>[0], this.settings.direction);
    }

    private applyLineStyleOnly(): void {
        if (!this.mindReady) return;
        applyLineStyle(this.mind as Parameters<typeof applyLineStyle>[0], this.settings.lineStyle);
    }

    private applyBgPattern(): void {
        if (!this.bgOverlay) return;
        applyBackgroundPattern(this.bgOverlay, this.settings);
    }
}

export function prepareMindData(json: MindElixirData & Partial<ThemeDocumentSettings>): MindElixirData & ThemeDocumentSettings {
    const template = json.themeTemplate || DEFAULT_THEME_ID;
    const preset = getThemeById(template) || getThemeById(DEFAULT_THEME_ID);
    return {
        ...json,
        themeTemplate: template,
        theme: preset?.theme || json.theme,
        backgroundPattern: json.backgroundPattern || DEFAULT_BACKGROUND_PATTERN.backgroundPattern,
        bgPatternColor: json.bgPatternColor || DEFAULT_BACKGROUND_PATTERN.bgPatternColor,
        bgPatternOpacity: json.bgPatternOpacity ?? DEFAULT_BACKGROUND_PATTERN.bgPatternOpacity,
        direction: normalizeDirection(json.direction),
        lineStyle: normalizeLineStyle(json.lineStyle),
    };
}
