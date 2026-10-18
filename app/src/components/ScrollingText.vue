<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

/* 文本放不下时自动横向滚动（跑马灯），放得下就保持静止。
   - 只在真正溢出时启动动画，短文本不会有任何多余动作
   - 鼠标悬停暂停，方便逐字看清
   - 位移 -50% 与「两份同样宽度」配合，循环无跳变 */

const props = defineProps({
  text: { type: String, default: '' },
  /** 每字符停留时长（秒），整体速度约 30 像素/秒左右 */
  speed: { type: Number, default: 0.35 }
})

const wrap = ref(null)
const overflow = ref(false)
const duration = ref(8)

function measure() {
  const el = wrap.value
  if (!el) return
  overflow.value = el.scrollWidth > el.clientWidth + 1
  const length = (props.text || '').length
  duration.value = Math.max(6, Math.round(length * props.speed + 4))
}

onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
})

onUnmounted(() => window.removeEventListener('resize', measure))

watch(
  () => props.text,
  async () => {
    await nextTick()
    measure()
  }
)
</script>

<template>
  <span ref="wrap" class="scroll-text" :class="{ 'is-overflow': overflow }" :title="text">
    <span class="scroll-text__track" :style="{ animationDuration: `${duration}s` }">
      <span class="scroll-text__item">{{ text }}</span>
      <span v-if="overflow" class="scroll-text__item" aria-hidden="true">{{ text }}</span>
    </span>
  </span>
</template>

<style scoped>
.scroll-text {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  min-width: 0;
  flex: 1 1 auto;
}
.scroll-text__track {
  display: inline-flex;
  align-items: baseline;
  will-change: transform;
}
.scroll-text__item {
  flex: 0 0 auto;
  padding-right: 40px;
}
.scroll-text.is-overflow .scroll-text__track {
  animation-name: scroll-text-marquee;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
.scroll-text:hover .scroll-text__track {
  animation-play-state: paused;
}
@keyframes scroll-text-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  .scroll-text.is-overflow .scroll-text__track { animation: none; }
}
</style>
