const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').BuildOptions}
 */
const options = {
    entryPoints: ['./src/frameworks/webview/main.ts'],
    bundle: true,
    outfile: './media/main.js',
    external: ['vscode'],
    format: 'iife',
    minify: production,
    sourcemap: !production,
    target: ['es2020'],
    logLevel: 'info',
};

async function main() {
    const ctx = await esbuild.context(options);
    if (watch) {
        await ctx.watch();
    } else {
        await ctx.rebuild();
        await ctx.dispose();
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
