import type { MindElixirData } from 'mind-elixir';

export async function toExportPlaintext(data: MindElixirData): Promise<string> {
    const { mindElixirToPlaintext } = await import('mind-elixir/plaintextConverter');
    return mindElixirToPlaintext(data);
}
