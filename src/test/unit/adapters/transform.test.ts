import * as assert from 'assert';
import { transformToWebviewImages, transformToJsonImages } from '../../../adapters/transform';
import { ImageMap } from '../../../domain/MindMap';

describe('Transform Adapter Unit Test Suite', () => {

    it('transformToWebviewImages should convert JSON to flat map', () => {
        const json = {
            image: [
                { "node1": "data1" },
                { "node2": "data2" }
            ]
        };
        const expected: ImageMap = {
            "node1": "data1",
            "node2": "data2"
        };
        assert.deepStrictEqual(transformToWebviewImages(json), expected);
    });

    it('transformToWebviewImages should handle empty/malformed JSON', () => {
        assert.deepStrictEqual(transformToWebviewImages({}), {});
        assert.deepStrictEqual(transformToWebviewImages(null), {});
        assert.deepStrictEqual(transformToWebviewImages({ image: "not an array" }), {});
    });

    it('transformToJsonImages should convert flat map to JSON', () => {
        const images: ImageMap = {
            "node1": "data1",
            "node2": "data2"
        };
        const result = transformToJsonImages(images);
        assert.strictEqual(Array.isArray(result.image), true);
        assert.strictEqual(result.image.length, 2);

        const node1Entry = result.image.find((item: any) => item["node1"] === "data1");
        const node2Entry = result.image.find((item: any) => item["node2"] === "data2");
        assert.ok(node1Entry);
        assert.ok(node2Entry);
    });
});
