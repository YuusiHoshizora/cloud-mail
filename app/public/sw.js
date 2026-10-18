/* ============================================================================
   这个文件不是新前端用的（新前端没有任何 Service Worker 注册）。
   它只是占住 /sw.js 这个作用域根路径，专门用来清理**旧前端**（vite-plugin-pwa）
   留在浏览器里的 Service Worker 和缓存。

   旧 SW 会定期请求自己的脚本地址做更新检查；拿到这个文件后：
     1. install  -> skipWaiting()
     2. activate -> 删掉所有 Cache Storage 里的缓存
     3. activate -> 注销自己（unregister）
     4. activate -> 刷新所有已打开的同源页面
   结果：老用户下一次访问时，旧缓存和旧界面被自动清干净，不需要教他们清缓存。
   ---------------------------------------------------------------------------- */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      } catch (error) {
        /* 忽略 */
      }

      try {
        await self.registration.unregister()
      } catch (error) {
        /* 忽略 */
      }

      try {
        const clients = await self.clients.matchAll({ type: 'window' })
        await Promise.all(
          clients.map((client) => {
            try {
              return client.navigate(client.url)
            } catch (error) {
              return null
            }
          })
        )
      } catch (error) {
        /* 忽略 */
      }
    })()
  )
})
