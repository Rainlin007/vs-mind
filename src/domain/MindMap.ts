
export interface Node {
    id: string;
    topic: string;
    root?: boolean;
    children?: Node[];
    style?: {
        fontSize?: string;
        color?: string;
        fontWeight?: string;
        fontStyle?: string;
        background?: string;
    };
    image?: {
        url: string; // base64 or url
        height: number;
        width: number;
    };
    // Add other MindElixir properties as needed (tags, icons, etc.)
}

export interface MindMapData {
    nodeData: Node;
    arrows?: unknown[];
    theme?: unknown;
    themeTemplate?: string;
    backgroundPattern?: 'none' | 'dots' | 'grid' | 'crossDot';
    bgPatternColor?: string;
    bgPatternOpacity?: number;
    direction?: number;
    lineStyle?: 'curve' | 'straight' | 'markmap' | 'straightUnderline';
}

export interface ImageMap {
    [id: string]: string; // id -> base64
}

export interface ImageJson {
    image: { [id: string]: string }[];
}
