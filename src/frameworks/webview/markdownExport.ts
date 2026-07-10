import type { MindElixirData } from 'mind-elixir';
import { toMdmm } from '../../adapters/mdmm';

export function toExportMarkdown(data: MindElixirData): string {
    return toMdmm(data);
}
