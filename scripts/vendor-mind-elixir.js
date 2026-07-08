const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'node_modules', 'mind-elixir', 'dist');
const media = path.join(root, 'media');

const copies = [
    ['MindElixir.iife.js', 'MindElixir.js'],
    ['MindElixir.css', 'MindElixir.css'],
];

if (!fs.existsSync(dist)) {
    console.error('mind-elixir dist not found. Run npm install first.');
    process.exit(1);
}

fs.mkdirSync(media, { recursive: true });

for (const [src, dest] of copies) {
    const srcPath = path.join(dist, src);
    const destPath = path.join(media, dest);

    if (!fs.existsSync(srcPath)) {
        console.error(`Missing ${srcPath}`);
        process.exit(1);
    }

    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${src} -> media/${dest}`);
}

const version = require(path.join(root, 'node_modules', 'mind-elixir', 'package.json')).version;
console.log(`mind-elixir@${version} vendored to media/`);
