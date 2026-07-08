import { ImageMap, ImageJson } from '../domain/MindMap';

/**
 * Transforms the nested image format from JSON to a flat map for the webview.
 */
export function transformToWebviewImages(json: any): ImageMap {
    const images: ImageMap = {};
    if (json && json.image && Array.isArray(json.image)) {
        json.image.forEach((item: any) => {
            const id = Object.keys(item)[0];
            if (id && id !== "") {
                Object.assign(images, item);
            }
        });
    }
    return images;
}

/**
 * Transforms the flat map from the webview to the nested JSON format.
 */
export function transformToJsonImages(images: ImageMap): ImageJson {
    const imageList = Object.entries(images).map(([id, data]) => ({ [id]: data }));
    return {
        image: imageList
    };
}
