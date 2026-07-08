import { IImageRepository } from '../domain/IImageRepository';
import { ImageMap } from '../domain/MindMap';
// Imports removed as they were unused


export class MindMapService {
    constructor(private readonly imageRepository: IImageRepository) { }

    /**
     * Generates default mind map content for new files.
     */
    public getDefaultContent(): string {
        const defaultContent = {
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
        return JSON.stringify(defaultContent, null, 2);
    }

    /**
     * Prepares content for the webview, including loading and transforming images.
     */
    public async getWebviewContent(text: string, fsPath: string): Promise<{ text: string, images: ImageMap }> {
        let contentText = text;
        if (contentText.trim().length === 0) {
            contentText = this.getDefaultContent();
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
            text: contentText,
            images: images
        };
    }

    /**
     * Saves images from the webview.
     */
    public async saveImages(fsPath: string, images: ImageMap): Promise<void> {
        await this.imageRepository.writeImages(fsPath, images);
    }
}
