
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
    hyperLink?: string;
    note?: string;
    dangerouslySetInnerHTML?: string;
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
    lineStyle?: 'curve' | 'elbow' | 'straight' | 'branch' | 'step';
}

export function createDefaultMindMapData(): MindMapData {
    return {
        nodeData: {
            id: 'root',
            topic: 'Central Topic',
            root: true,
            children: [],
        },
        arrows: [],
        themeTemplate: 'clayLight',
        backgroundPattern: 'grid',
        bgPatternColor: '#808080',
        bgPatternOpacity: 5,
        direction: 1,
        lineStyle: 'curve',
    };
}

export interface ImageMap {
    [id: string]: string; // id -> base64
}

export interface ImageJson {
    image: { [id: string]: string }[];
}
