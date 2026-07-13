export function getImageSidecarPath(mmfFsPath: string): string {
    return mmfFsPath.replace(/\.mmf$/i, '_img.json');
}
