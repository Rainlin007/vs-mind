const esbuild = require('esbuild')
const fs = require('fs')
const path = require('path')

const isWatch = process.argv.includes('--watch')

function copyKatexFonts() {
  const srcDir = path.resolve(__dirname, 'node_modules/katex/dist/fonts')
  const destDir = path.resolve(__dirname, 'media/katex/fonts')
  if (!fs.existsSync(srcDir)) {
    console.warn('KaTeX fonts not found; run npm install first.')
    return
  }
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file))
  }
}

const extensionConfig = {
  entryPoints: [path.resolve(__dirname, 'src/extension.ts')],
  bundle: true,
  outfile: path.resolve(__dirname, 'dist/extension.js'),
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
}

const webviewConfig = {
  entryPoints: [path.resolve(__dirname, 'media/editor.js')],
  bundle: true,
  outfile: path.resolve(__dirname, 'dist/editor.js'),
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  loader: {
    '.png': 'dataurl',
    '.svg': 'dataurl',
  },
}

async function build() {
  copyKatexFonts()
  if (isWatch) {
    const ctx1 = await esbuild.context(extensionConfig)
    const ctx2 = await esbuild.context(webviewConfig)
    await Promise.all([ctx1.watch(), ctx2.watch()])
    console.log('Watching for changes...')
  } else {
    await Promise.all([
      esbuild.build(extensionConfig),
      esbuild.build(webviewConfig),
    ])
    console.log('Build complete.')
  }
}

build().catch((err) => {
  console.error(err)
  process.exit(1)
})
