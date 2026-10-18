<script setup>
import { computed } from 'vue'

const props = defineProps({
  mail: { type: Object, required: true },
  selected: { type: Boolean, default: false }
})
defineEmits(['select'])

const from = computed(() => {
  const mail = props.mail
  // 已发送里「发件人」其实是我们自己，看的人关心的是收件人
  if (mail.type === 1) return mail.toEmail || mail.recipient || '（无收件人）'
  return mail.name || mail.sendEmail || mail.toEmail || '未知发件人'
})

const preview = computed(() => {
  const raw = props.mail.text || props.mail.subject || props.mail.content || ''
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 88)
})

const time = computed(() => {
  const raw = props.mail.createTime
  if (!raw) return ''
  const d = new Date(String(raw).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10)
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  if (d.toDateString() === now.toDateString()) return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (d.getFullYear() === now.getFullYear()) return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
})

const unread = computed(() => props.mail.unread === 0)
const attCount = computed(() => (props.mail.attList || []).length)
</script>

<template>
  <div
    class="mail-row"
    :class="{ 'mail-row--read': !unread }"
    :aria-selected="selected ? 'true' : 'false'"
    role="button"
    tabindex="0"
    @click="$emit('select', mail.emailId)"
    @keydown.enter.prevent="$emit('select', mail.emailId)"
    @keydown.space.prevent="$emit('select', mail.emailId)"
  >
    <span class="dot" :class="{ 'dot--off': !unread }"></span>

    <span class="mail-row__top">
      <span class="mail-row__from">{{ from }}</span>
      <span v-if="mail.isStar" class="mail-row__pin">★</span>
      <span v-if="attCount" class="mail-row__pin" :title="`${attCount} 个附件`">◎</span>
      <span class="mail-row__time">{{ time }}</span>
    </span>

    <span class="mail-row__subject">{{ mail.subject || '(无主题)' }}</span>
    <span class="mail-row__preview">{{ preview }}</span>
  </div>
</template>
