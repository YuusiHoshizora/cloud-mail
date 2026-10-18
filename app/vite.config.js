import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// 产物默认输出到 dist/；设 VITE_OUT_DIR=../mail-worker/dist 就能直接内嵌进 Worker
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE')

  return {
    plugins: [vue()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
    },
    server: {
      port: 3001,
      strictPort: true
    },
    build: {
      outDir: env.VITE_OUT_DIR || 'dist',
      emptyOutDir: true,
      // Worker 静态资源总量只有 ~3 MiB（免费）/ 10 MiB（付费），别让单包过大
      chunkSizeWarningLimit: 600
    }
  }
})
