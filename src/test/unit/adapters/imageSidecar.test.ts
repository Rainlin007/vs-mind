import * as assert from 'assert';
import { getImageSidecarPath } from '../../../adapters/imageSidecar';

describe('imageSidecar Adapter Unit Test Suite', () => {
    it('uses an _img.json sidecar for mmf documents', () => {
        assert.strictEqual(
            getImageSidecarPath('/tmp/example.mmf'),
            '/tmp/example_img.json',
        );
    });

    it('matches the mmf extension case-insensitively', () => {
        assert.strictEqual(
            getImageSidecarPath('/tmp/example.MMF'),
            '/tmp/example_img.json',
        );
    });
});
