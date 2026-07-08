import type { Theme } from 'mind-elixir';

export interface PresetThemeEntry {
    value: string;
    name: string;
    dark: boolean;
    theme: Theme;
}

interface ThemeColors {
    bg: string;
    line: string;
    accent: string;
    rootText?: string;
    secondFill: string;
    secondText: string;
    secondBorder: string;
    nodeText: string;
}

function buildTheme(id: string, name: string, dark: boolean, colors: ThemeColors): PresetThemeEntry {
    const rootText = colors.rootText ?? '#ffffff';
    return {
        value: id,
        name,
        dark,
        theme: {
            name,
            type: dark ? 'dark' : 'light',
            palette: [
                colors.accent,
                colors.line,
                colors.accent,
                colors.line,
                colors.accent,
                colors.line,
                colors.accent,
                colors.line,
                colors.accent,
                colors.line,
            ],
            cssVar: {
                '--bgcolor': colors.bg,
                '--color': colors.nodeText,
                '--main-color': colors.secondText,
                '--main-bgcolor': colors.secondFill,
                '--main-bgcolor-transparent': colors.secondFill,
                '--main-border': `1px solid ${colors.secondBorder}`,
                '--root-color': rootText,
                '--root-bgcolor': colors.accent,
                '--root-border-color': 'transparent',
                '--accent-color': colors.accent,
                '--selected': colors.accent,
                '--panel-color': colors.secondText,
                '--panel-bgcolor': colors.secondFill,
                '--panel-border-color': colors.secondBorder,
            },
        },
    };
}

export const DEFAULT_THEME_ID = 'clayLight';

export const presetThemes: PresetThemeEntry[] = [
    buildTheme('auroraLight', '微光紫', false, {
        bg: '#f7f8fa', line: '#c3c8e6', accent: '#5e6ad2',
        secondFill: '#eef0fb', secondText: '#3b3f66', secondBorder: '#d5d9f2', nodeText: '#4a4e69',
    }),
    buildTheme('mintLight', '薄荷绿', false, {
        bg: '#f4faf7', line: '#a9dcc8', accent: '#10a37f',
        secondFill: '#e4f5ee', secondText: '#1d5d4b', secondBorder: '#c7eadd', nodeText: '#37655a',
    }),
    buildTheme('clayLight', '暖阳橙', false, {
        bg: '#fbf7f3', line: '#ecc9ad', accent: '#e0733a',
        secondFill: '#fbeee2', secondText: '#8a4a24', secondBorder: '#f2d9c4', nodeText: '#6f5545',
    }),
    buildTheme('graphiteLight', '石墨灰', false, {
        bg: '#fafafa', line: '#cfd2d6', accent: '#27272a',
        secondFill: '#f1f2f4', secondText: '#2b2d31', secondBorder: '#e2e4e8', nodeText: '#52555c',
    }),
    buildTheme('auroraDark', '午夜紫', true, {
        bg: '#0f1011', line: '#3b3f5c', accent: '#6e79e0',
        secondFill: '#1a1b22', secondText: '#d7d9e6', secondBorder: '#2b2d3a', nodeText: '#a6a9bd',
    }),
    buildTheme('oceanDark', '深海青', true, {
        bg: '#0b1220', line: '#274156', accent: '#2dd4bf', rootText: '#04201b',
        secondFill: '#111c2e', secondText: '#cbe7e6', secondBorder: '#22344a', nodeText: '#8fb0b8',
    }),
    buildTheme('obsidianDark', '曜石粉', true, {
        bg: '#0a0a0c', line: '#3a2a35', accent: '#ec4899',
        secondFill: '#17151a', secondText: '#ecdfe6', secondBorder: '#2a2630', nodeText: '#b6a8b0',
    }),
    buildTheme('amberDark', '琥珀夜', true, {
        bg: '#14110c', line: '#4a3d28', accent: '#f59e0b', rootText: '#1f1500',
        secondFill: '#201a11', secondText: '#ecdfc9', secondBorder: '#33291a', nodeText: '#b8a888',
    }),
];

export function getThemeById(id: string): PresetThemeEntry | undefined {
    return presetThemes.find((item) => item.value === id);
}

export function getThemeGroups(): Array<{ label: string; themes: Array<{ value: string; label: string }> }> {
    const light = presetThemes.filter((t) => !t.dark).map((t) => ({ value: t.value, label: t.name }));
    const dark = presetThemes.filter((t) => t.dark).map((t) => ({ value: t.value, label: t.name }));
    const groups = [];
    if (light.length) groups.push({ label: '亮色', themes: light });
    if (dark.length) groups.push({ label: '暗色', themes: dark });
    return groups;
}
