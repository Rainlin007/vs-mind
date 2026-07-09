import type { MindElixirData } from 'mind-elixir';

export function toExportJson(data: MindElixirData): string {
    return JSON.stringify(data, null, 2);
}
