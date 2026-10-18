<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

/* 日期时间选择器：外观对齐主站 main/mainpage 的 .calendar-widget */

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '选择日期时间' }
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const root = ref(null)
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())
const hour = ref(23)
const minute = ref(59)

const parsed = computed(() => {
  if (!props.modelValue) return null
  const d = new Date(props.modelValue)
  return Number.isNaN(d.getTime()) ? null : d
})

const display = computed(() => {
  const d = parsed.value
  if (!d) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
})

const WEEK = ['一', '二', '三', '四', '五', '六', '日']

const cells = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  // 周一为一周起点
  const offset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const prevDays = new Date(viewYear.value, viewMonth.value, 0).getDate()
  const list = []

  for (let i = offset - 1; i >= 0; i -= 1) {
    list.push({ day: prevDays - i, inMonth: false, offset: -1 })
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    list.push({ day: d, inMonth: true, offset: 0 })
  }
  while (list.length % 7 !== 0 || list.length < 42) {
    list.push({ day: list.length - offset - daysInMonth + 1, inMonth: false, offset: 1 })
    if (list.length >= 42) break
  }
  return list
})

const todayKey = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
})

function cellKey(cell) {
  if (!cell.inMonth) return ''
  return `${viewYear.value}-${viewMonth.value}-${cell.day}`
}

const selectedKey = computed(() => {
  const d = parsed.value
  return d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : ''
})

function toggle() {
  if (!open.value && parsed.value) {
    viewYear.value = parsed.value.getFullYear()
    viewMonth.value = parsed.value.getMonth()
    hour.value = parsed.value.getHours()
    minute.value = parsed.value.getMinutes()
  }
  open.value = !open.value
}

function shiftMonth(step) {
  const d = new Date(viewYear.value, viewMonth.value + step, 1)
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
}

function pick(cell) {
  if (!cell.inMonth) return
  const p = (n) => String(n).padStart(2, '0')
  const date = `${viewYear.value}-${p(viewMonth.value + 1)}-${p(cell.day)}`
  emit('update:modelValue', `${date}T${p(hour.value)}:${p(minute.value)}`)
  open.value = false
}

function clear() {
  emit('update:modelValue', '')
  open.value = false
}

function onDocClick(event) {
  if (root.value && !root.value.contains(event.target)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onDocClick))
onUnmounted(() => document.removeEventListener('mousedown', onDocClick))

watch(open, (value) => {
  if (!value) return
  const d = parsed.value || new Date()
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
  hour.value = d.getHours()
  minute.value = d.getMinutes()
})
</script>

<template>
  <span ref="root" class="dtp">
    <button class="input dtp-trigger" type="button" @click="toggle">
      <span :class="{ 'dtp-empty': !display }">{{ display || placeholder }}</span>
      <span class="dtp-caret" aria-hidden="true">▾</span>
    </button>

    <div v-if="open" class="dtp-pop calendar-widget">
      <div class="calendar-header">
        <span class="year-month">{{ viewYear }} 年 {{ viewMonth + 1 }} 月</span>
        <div class="nav-arrows">
          <button class="nav-arrow" type="button" @click="shiftMonth(-1)">‹</button>
          <button class="nav-arrow" type="button" @click="shiftMonth(1)">›</button>
        </div>
      </div>

      <div class="calendar-grid">
        <span v-for="w in WEEK" :key="w" class="day-name">{{ w }}</span>
        <button
          v-for="(cell, index) in cells"
          :key="index"
          type="button"
          class="day-cell"
          :class="{
            'other-month': !cell.inMonth,
            today: cellKey(cell) === todayKey,
            selected: cellKey(cell) === selectedKey
          }"
          @click="pick(cell)"
        >{{ cell.day }}</button>
      </div>

      <div class="dtp-time">
        <span class="meta">时间</span>
        <input v-model.number="hour" class="input dtp-time-input" type="number" min="0" max="23" />
        <span class="meta">:</span>
        <input v-model.number="minute" class="input dtp-time-input" type="number" min="0" max="59" />
        <button class="nav-arrow" type="button" title="清空" @click="clear">×</button>
      </div>
    </div>
  </span>
</template>

<style scoped>
.dtp { position: relative; display: inline-block; }
.dtp-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 190px;
  min-height: 34px;
  padding: 6px 12px;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.dtp-empty { color: var(--mail-fg-mute); }
.dtp-caret { color: var(--mail-fg-mute); font-size: 11px; }
.dtp-pop {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 60;
  width: 268px;
  background: var(--mail-panel-solid);
  backdrop-filter: blur(10px);
  /* 以下与主站 main/mainpage 的 .calendar-widget 保持一致 */
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 16px;
}
.calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.year-month { font-size: 14px; letter-spacing: 2px; color: rgba(255, 255, 255, 0.8); }
.nav-arrows { display: flex; gap: 8px; }
.nav-arrow {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: 0.2s;
}
.nav-arrow:hover { border-color: rgba(255, 215, 0, 0.4); color: #FFD700; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.day-name { text-align: center; font-size: 11px; color: rgba(255, 255, 255, 0.3); padding: 6px 0; letter-spacing: 1px; }
.day-cell {
  text-align: center;
  padding: 6px 0;
  font: inherit;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: 0.2s;
}
.day-cell:hover { background: rgba(255, 255, 255, 0.06); }
.day-cell.today { background: rgba(255, 215, 0, 0.15); color: #FFD700; border-color: rgba(255, 215, 0, 0.3); }
.day-cell.selected { color: #FFD700; border-color: var(--ctl-border-hover); background: var(--ctl-bg-strong); }
.day-cell.other-month { color: rgba(255, 255, 255, 0.15); cursor: default; }
.day-cell.other-month:hover { background: transparent; }
.dtp-time { display: flex; align-items: center; gap: 6px; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
.dtp-time-input { width: 56px; min-height: 28px; padding: 2px 8px; font-size: 13px; text-align: center; }
.dtp-time .nav-arrow { margin-left: auto; }
</style>
