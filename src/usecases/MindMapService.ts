import { IImageRepository } from '../domain/IImageRepository';
import { ImageMap } from '../domain/MindMap';
import { createDefaultMindMapData, fromMdmm, toMdmm } from '../adapters/mdmm';

export type MindMapDocumentFormat = 'json' | 'mdmm';

export interface WebviewContent {
    text: string;
    documentText: string;
    images: ImageMap;
    format: MindMapDocumentFormat;
}


export class MindMapService {
    constructor(private readonly imageRepository: IImageRepository) { }

    public getDocumentFormat(fsPath: string): MindMapDocumentFormat {
        return fsPath.toLowerCase().endsWith('.mdmm') ? 'mdmm' : 'json';
    }

    /**
     * Generates default mind map content for new files.
     */
    public getDefaultContent(format: MindMapDocumentFormat = 'json'): string {
        const defaultContent = createDefaultMindMapData();
        return format === 'mdmm'
            ? toMdmm(defaultContent)
            : JSON.stringify(defaultContent, null, 2);
    }

    /**
     * Prepares content for the webview, including loading and transforming images.
     */
    public async getWebviewContent(text: string, fsPath: string): Promise<WebviewContent> {
        const format = this.getDocumentFormat(fsPath);
        let documentText = text;
        if (documentText.trim().length === 0) {
            documentText = this.getDefaultContent(format);
        }

        let images: ImageMap = {};
        try {
            images = await this.imageRepository.readImages(fsPath);
        } catch (e) {
            console.error('Failed to read images file:', e);
            // In case of error (e.g. file not found), return empty images but valid text
        }

        // transformToWebviewImages is used if the repository returns strict JSON format,
        // but here our repository (VSCodeImageRepository) will likely return ImageMap (after internal transformation) 
        // OR it returns raw JSON and we transform it here.
        // Let's decide: Repository should probably return Domain Entity (ImageMap) or raw data.
        // If Repository abstraction returns ImageMap, then we don't need transform here?
        // Wait, current `MindMapDataStore.transformToWebviewImages` takes `json: any` (the raw content of _img.json).
        // So `IImageRepository.readImages` implementation will likely read file -> parse JSON -> return ImageMap.
        // So the repository implementation commonly handles the transformation from Persistence model to Domain model.
        // However, if we want to keep Repository dumb, it could return ImageJson.
        // Let's stick to the interface: `readImages` returns `Promise<ImageMap>`.
        // So the implementing repository will use `transformToWebviewImages`.

        return {
            text: this.toWebviewText(documentText, format),
            documentText,
            images,
            format,
        };
    }

    public serializeWebviewContent(text: string, fsPath: string): string {
        const format = this.getDocumentFormat(fsPath);
        if (format === 'mdmm') {
            return toMdmm(JSON.parse(text));
        }
        return text;
    }

    /**
     * Saves images from the webview.
     */
    public async saveImages(fsPath: string, images: ImageMap): Promise<void> {
        await this.imageRepository.writeImages(fsPath, images);
    }

    private toWebviewText(documentText: string, format: MindMapDocumentFormat): string {
        if (format === 'mdmm') {
            return JSON.stringify(fromMdmm(documentText), null, 2);
        }
        return documentText;
    }
}
