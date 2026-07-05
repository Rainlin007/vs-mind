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

// 使用本地 fork（git submodule）作为 simple-mind-map 的源码，
// 以获得空节点宽度修复等改动；其余传递依赖仍从 node_modules 解析。
const simpleMindMapDir = path.resolve(
  __dirname,
  'vendor/mind-map/simple-mind-map'
)

// 将 `simple-mind-map` 及其子路径（如 simple-mind-map/src/plugins/...）
// 统一重定向到本地 fork 目录，保证只打包一份且都带有本地修复。
const simpleMindMapForkPlugin = {
  name: 'simple-mind-map-fork',
  setup(build) {
    build.onResolve({ filter: /^simple-mind-map(\/|$)/ }, args => {
      const rest = args.path.slice('simple-mind-map'.length)
      if (rest === '' || rest === '/') {
        // 裸导入：交给包内 module 字段（index.js）解析
        return { path: path.join(simpleMindMapDir, 'index.js') }
      }
      // 子路径导入：直接映射到 fork 内对应文件
      return { path: path.join(simpleMindMapDir, rest) }
    })
  },
}

const webviewConfig = {
  entryPoints: [path.resolve(__dirname, 'media/editor.js')],
  bundle: true,
  outfile: path.resolve(__dirname, 'dist/editor.js'),
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  plugins: [simpleMindMapForkPlugin],
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
