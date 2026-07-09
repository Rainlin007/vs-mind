declare module 'mind-elixir/plaintextConverter' {
    import type { MindElixirData } from 'mind-elixir';

    export function mindElixirToPlaintext(data: MindElixirData): string;
    export function plaintextToMindElixir(plaintext: string, rootName?: string): MindElixirData;
}
