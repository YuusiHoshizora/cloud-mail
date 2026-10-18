<script setup>
import { onMounted, onUnmounted, ref, watchEffect } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

/* 站点标题跟随后台「站点设置」里的 title（/setting/websiteConfig），拿不到就用默认 */
watchEffect(() => {
  const title = auth.settings?.title
  document.title = title ? `${title}` : '邮箱 · 星光圣域'
})

const canvas = ref(null)
let timer = null

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* 星野：固定种子，刷新后星位不变（与主站 background.js 同一思路） */
function draw() {
  const el = canvas.value
  if (!el) return
  const ctx = el.getContext('2d')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  let w = 0
  let h = 0
  let stars = []

  const seeded = (seed) => {
    let s = seed
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      return s / 0x7fffffff
    }
  }

  const resize = () => {
    w = el.clientWidth
    h = el.clientHeight
    el.width = Math.floor(w * dpr)
    el.height = Math.floor(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const rnd = seeded(20260412)
    const count = Math.round((w * h) / 12000)
    stars = Array.from({ length: count }, () => ({
      x: rnd() * w,
      y: rnd() * h,
      r: rnd() * 1.25 + 0.25,
      a: rnd() * 0.5 + 0.15,
      phase: rnd() * Math.PI * 2
    }))
  }

  let t = 0
  const frame = () => {
    t += 0.012
    ctx.clearRect(0, 0, w, h)
    for (const s of stars) {
      const twinkle = 0.65 + 0.35 * Math.sin(t + s.phase)
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${(s.a * twinkle).toFixed(3)})`
      ctx.fill()
    }
  }

  resize()
  window.addEventListener('resize', resize)
  if (!reduceMotion) timer = setInterval(frame, 90)
  frame()
}

onMounted(draw)
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="mail-bg"></div>
  <canvas ref="canvas" class="stars" aria-hidden="true"></canvas>
  <div class="mail-dim"></div>

  <NavBar />

  <router-view />

  <footer class="site-footer">
    © 2025–2026 余事星空（YuusiHoshizora） · 星光圣域 邮箱 ·
    <a href="https://starlightsacredsanctuary.top/">返回主站</a>
  </footer>
</template>
