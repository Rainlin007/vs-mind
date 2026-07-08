import { ImageMap } from './MindMap';

export interface IImageRepository {
    /**
     * Reads the images for a given mind map file path.
     * @param mindMapFsPath The file system path of the .mm or .mindmap file.
     * @returns A map of image IDs to base64 strings.
     */
    readImages(mindMapFsPath: string): Promise<ImageMap>;

    /**
     * Writes the images for a given mind map file path.
     * @param mindMapFsPath The file system path of the .mm or .mindmap file.
     * @param images The map of image IDs to base64 strings.
     */
    writeImages(mindMapFsPath: string, images: ImageMap): Promise<void>;

    /**
     * Gets the path to the images file.
     */
    getImagesPath(mindMapFsPath: string): string;
}
