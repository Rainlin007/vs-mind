import * as vscode from 'vscode';
import { IImageRepository } from '../../domain/IImageRepository';
import { ImageMap } from '../../domain/MindMap';
import { transformToWebviewImages, transformToJsonImages } from '../../adapters/transform';
import { getImageSidecarPath } from '../../adapters/imageSidecar';

export class VSCodeImageRepository implements IImageRepository {

    public getImagesPath(mindMapFsPath: string): string {
        return getImageSidecarPath(mindMapFsPath);
    }

    public async readImages(mindMapFsPath: string): Promise<ImageMap> {
        const imagesPath = this.getImagesPath(mindMapFsPath);
        const imagesUri = vscode.Uri.file(imagesPath);

        try {
            const bytes = await vscode.workspace.fs.readFile(imagesUri);
            const json = JSON.parse(Buffer.from(bytes).toString('utf8'));
            return transformToWebviewImages(json);
        } catch (error) {
            if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                return {};
            }
            throw error;
        }
    }

    public async writeImages(mindMapFsPath: string, images: ImageMap): Promise<void> {
        const imagesPath = this.getImagesPath(mindMapFsPath);
        const imagesUri = vscode.Uri.file(imagesPath);

        if (Object.keys(images).length === 0) {
            try {
                await vscode.workspace.fs.delete(imagesUri);
            } catch (error) {
                if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                    return;
                }
                throw error;
            }
            return;
        }

        const json = transformToJsonImages(images);
        const content = Buffer.from(JSON.stringify(json, null, 2), 'utf8');
        await vscode.workspace.fs.writeFile(imagesUri, content);
    }
}
