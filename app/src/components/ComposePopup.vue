<script setup>
import { nextTick, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { fileToAttachment, sendMail } from '@/lib/send'
import { formatBytes } from '@/lib/url'

const props = defineProps({
  open: { type: Boolean, default: false },
  draft: { type: Object, required: true }
})
const emit = defineEmits(['close', 'expand', 'sent'])

const auth = useAuthStore()
const bodyEl = ref(null)
const fileEl = ref(null)
const sending = ref(false)
const progress = ref(0)
const status = ref('')

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    status.value = ''
    progress.value = 0
    await nextTick()
    if (bodyEl.value && !bodyEl.value.innerHTML.trim()) {
      bodyEl.value.innerHTML = props.draft.html || ''
    }
  }
)

async function onFiles(event) {
  const files = [...(event.target.files || [])]
  event.target.value = ''
  for (const file of files) {
    const att = await fileToAttachment(file)
    props.draft.attachments.push(att)
  }
  status.value = files.length ? `已添加 ${files.length} 个附件` : ''
}

function removeAtt(index) {
  props.draft.attachments.splice(index, 1)
}

async function send() {
  if (sending.value) return
  sending.value = true
  progress.value = 0
  status.value = '正在发送…'
  try {
    await sendMail({
      auth,
      draft: props.draft,
      content: bodyEl.value?.innerHTML || '',
      onProgress: (value) => {
        progress.value = value
      }
    })
    status.value = '已发送'
    setTimeout(() => emit('sent'), 480)
  } catch (err) {
    status.value = err?.message || '发送失败'
    progress.value = 0
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div v-if="open" class="compose panel panel--solid surface-in">
    <div class="compose-head">
      <span class="meta">{{ draft.sendType === 'reply' ? '回复' : draft.sendType === 'forward' ? '转发' : '新邮件' }}</span>
      <div class="compose-head__actions">
        <button class="btn btn--icon" type="button" title="全屏编辑" @click="$emit('expand', bodyEl?.innerHTML || '')">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4">
            <path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" />
          </svg>
        </button>
        <button class="btn btn--icon" type="button" title="关闭" @click="$emit('close')">
          <svg viewBox="0 0 16 16" width="14" height="14" stroke="currentColor" stroke-width="1.4">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </div>
    </div>

    <div class="compose-fields">
      <input v-model="draft.to" class="line-input" type="text" placeholder="收件人 · recipient@domain" />
      <input v-model="draft.subject" class="line-input" type="text" placeholder="主题 · subject" />
    </div>

    <div ref="bodyEl" class="compose-body" contenteditable="true" role="textbox" aria-multiline="true"></div>

    <div v-if="draft.attachments.length" class="attach-list" style="padding: 0 18px 10px">
      <span v-for="(att, index) in draft.attachments" :key="att.filename + index" class="attach-chip">
        <span>{{ att.filename }}</span>
        <span class="meta">{{ formatBytes(att.size) }}</span>
        <button type="button" aria-label="移除" @click="removeAtt(index)">×</button>
      </span>
    </div>

    <div class="compose-foot">
      <button class="btn btn--primary" type="button" :disabled="sending" @click="send">发 送</button>
      <button class="btn" type="button" @click="fileEl?.click()">附 件</button>
      <input ref="fileEl" type="file" multiple hidden @change="onFiles" />
      <span class="meta compose-foot__meta">{{ status }}</span>
      <div class="compose-progress"><i :style="{ width: progress + '%' }"></i></div>
    </div>
  </div>
</template>
