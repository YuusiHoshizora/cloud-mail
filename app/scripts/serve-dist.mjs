/* 本地预览 dist：SPA 回退到 index.html，禁用缓存，方便反复刷新 */
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../dist/', import.meta.url))
const port = Number(process.env.PORT || 8800)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8'
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  let pathname = decodeURIComponent(url.pathname)
  let file = join(root, normalize(pathname).replace(/^(\.\.[/\\])+/, ''))

  if (existsSync(file) && statSync(file).isFile()) {
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    })
    createReadStream(file).pipe(res)
    return
  }

  // SPA 回退
  const index = join(root, 'index.html')
  if (existsSync(index)) {
    res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' })
    createReadStream(index).pipe(res)
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('dist not found — 先运行 npm run build:mock')
}).listen(port, '127.0.0.1', () => {
  console.log(`preview: http://127.0.0.1:${port}/`)
})
