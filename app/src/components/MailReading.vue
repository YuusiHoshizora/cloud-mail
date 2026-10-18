<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { cvtR2Url, escapeHtml, formatBytes, formatDateTime } from '@/lib/url'
import { recipientLine } from '@/lib/mail'

const props = defineProps({ mail: { type: Object, required: true } })
const emit = defineEmits(['delete', 'reply', 'forward', 'star'])

const frame = ref(null)

const atts = computed(() => props.mail.attList || [])

const senderLine = computed(() => {
  const m = props.mail
  const name = m.name || m.sendEmail || ''
  return m.sendEmail && m.name ? `${m.name} <${m.sendEmail}>` : name
})

const recipientDisplay = computed(() => {
  const text = recipientLine(props.mail)
  return text || '—'
})

/* 邮件自带白底时（富文本编辑器常见），强行走「浅色正文」，
   否则会变成白背景 + 我们的浅色文字 = 一片白 */
const LIGHT_RE = /background(?:-color)?\s*:\s*(?:#f{3,6}|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))|bgcolor\s*=\s*["']?#?f{3,6}/i
const isLightContent = computed(() => LIGHT_RE.test(props.mail.content || ''))

const darkCss = `
  html{color-scheme:dark}
  html,body{margin:0;padding:0;background:transparent!important;color:rgba(255,255,255,.88);
    font-family:system-ui,"Segoe UI","Microsoft YaHei",sans-serif;font-size:15px;line-height:1.9;
    letter-spacing:.2px;word-break:break-word}
  a{color:rgba(255,255,255,.9);text-decoration:underline;text-decoration-color:rgba(255,215,0,.35);text-underline-offset:3px}
  a:hover{color:#FFD700}
  img{max-width:100%;height:auto;border-radius:4px}
  blockquote{margin:16px 0;padding:8px 0 8px 16px;border-left:2px solid rgba(255,215,0,.35);color:rgba(255,255,255,.5)}
  pre{background:rgba(0,0,0,.35);padding:12px 14px;border-radius:4px;overflow:auto;font-size:13px}
  table{max-width:100%;border-collapse:collapse}
  td,th{border-color:rgba(255,255,255,.14)}
  hr{border:0;height:1px;background:rgba(255,255,255,.12)}
`

const lightCss = `
  html{color-scheme:light}
  html,body{margin:0;padding:0;background:#ffffff;color:#1d2027;
    font-family:system-ui,"Segoe UI","Microsoft YaHei",sans-serif;font-size:15px;line-height:1.9;
    letter-spacing:.2px;word-break:break-word}
  a{color:#0b6b6b;text-decoration:underline;text-underline-offset:3px}
  img{max-width:100%;height:auto}
  blockquote{margin:16px 0;padding:8px 0 8px 16px;border-left:2px solid #d8c46a;color:#5a5f6a}
  pre{background:#f4f5f7;padding:12px 14px;border-radius:4px;overflow:auto;font-size:13px}
  table{max-width:100%;border-collapse:collapse}
`

/* 邮件正文放进 iframe：与站内 CSS 完全隔离，外部 HTML 不会污染页面。
   sandbox 不给 allow-scripts —— 邮件里的脚本一律不执行。 */
const srcdoc = computed(() => {
  const html = props.mail.content || `<pre>${escapeHtml(props.mail.text || '(无正文)')}</pre>`
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><base target="_blank"><style>${
    isLightContent.value ? lightCss : darkCss
  }</style></head><body>${html}</body></html>`
})

/* 让 iframe 跟着内容长高（sandbox 里保留 allow-same-origin 才能量到高度） */
function fit() {
  const el = frame.value
  if (!el) return
  try {
    const doc = el.contentDocument
    if (doc?.documentElement) el.style.height = `${doc.documentElement.scrollHeight + 8}px`
  } catch {
    el.style.height = '480px'
  }
}

watch(
  () => props.mail.emailId,
  () => nextTick(fit)
)
</script>

<template>
  <div class="reading-head">
    <h2 class="reading-subject">{{ mail.subject || '(无主题)' }}</h2>
    <div class="reading-who">
      <span><b>{{ senderLine }}</b></span>
      <span>{{ mail.type === 1 ? '发送至' : '收件人' }} {{ recipientDisplay }}</span>
      <span>{{ formatDateTime(mail.createTime) }}</span>
    </div>

    <div class="reading-actions">
      <button class="btn" type="button" @click="$emit('reply', mail)">回 复</button>
      <button class="btn" type="button" @click="$emit('forward', mail)">转 发</button>
      <button class="btn btn--ghost" type="button" @click="$emit('star', mail)">
        {{ mail.isStar ? '★ 已标记' : '标 记' }}
      </button>
      <button class="btn btn--danger" type="button" style="margin-left:auto" @click="$emit('delete', mail)">删 除</button>
    </div>
  </div>

  <div class="reading-body" :class="{ 'reading-body--light': isLightContent }">
    <iframe
      ref="frame"
      :srcdoc="srcdoc"
      sandbox="allow-same-origin"
      referrerpolicy="no-referrer"
      title="邮件正文"
      @load="fit"
    ></iframe>
  </div>

  <div v-if="atts.length" class="reading-att">
    <p class="meta" style="margin: 0 0 10px">附件 · {{ atts.length }}</p>
    <a
      v-for="att in atts"
      :key="att.attId"
      class="att-row"
      :href="cvtR2Url(att.key)"
      target="_blank"
      rel="noopener noreferrer"
      download
    >
      <span class="dot dot--off"></span>
      <span>{{ att.filename }}</span>
      <span class="meta" style="margin-left:auto">{{ formatBytes(att.size) }}</span>
    </a>
  </div>
</template>

<style scoped>
.reading-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 28px 28px;
}
/* 白底邮件：给内容一块白卡片，四周留出生硬的边界，读起来像真实的邮件 */
.reading-body--light {
  padding: 0;
}
.reading-body--light iframe {
  background: #fff;
}
.reading-body iframe {
  width: 100%;
  min-height: 220px;
  border: 0;
  display: block;
  background: transparent;
}
</style>
