import { mindElixirToPlaintext } from 'mind-elixir/plaintextConverter';
import type { MindElixirData } from 'mind-elixir';

export function toExportPlaintext(data: MindElixirData): string {
    return mindElixirToPlaintext(data);
}
