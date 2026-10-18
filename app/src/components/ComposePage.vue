<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ICONS, TOOL_GROUPS, applyCommand } from '@/lib/toolbar'
import { fileToAttachment, sendMail } from '@/lib/send'
import { formatBytes } from '@/lib/url'
import RecipientInput from '@/components/RecipientInput.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  draft: { type: Object, required: true }
})
const emit = defineEmits(['collapse', 'close', 'sent'])

const auth = useAuthStore()
const editorEl = ref(null)
const fileEl = ref(null)
const showCc = ref(false)
const status = ref('草稿已自动保存')
const sending = ref(false)
const saving = ref(false)

const counter = ref(0)

const title = computed(() =>
  props.draft.sendType === 'reply' ? '回复' : props.draft.sendType === 'forward' ? '转发' : '新邮件'
)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    status.value = '草稿已自动保存'
    await nextTick()
    const el = editorEl.value
    if (el) {
      if (!el.innerHTML.trim()) el.innerHTML = props.draft.html || ''
      el.focus()
      countWords()
    }
  }
)

function countWords() {
  const text = (editorEl.value?.innerText || '').replace(/\s+/g, '')
  counter.value = text.length
}

function onInput(event) {
  countWords()
  if (event?.target) props.draft.html = event.target.innerHTML
  if (saving.value) return
  saving.value = true
  status.value = '正在保存…'
  setTimeout(() => {
    saving.value = false
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    status.value = `草稿已自动保存 · ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }, 600)
}

/* 工具栏：mousedown 阻止默认，避免编辑器丢选区 */
function onToolMouseDown(event) {
  if (event.target.closest('.tool-btn')) event.preventDefault()
}

async function onTool(event) {
  const btn = event.target.closest('.tool-btn')
  if (!btn) return
  const { cmd, arg } = btn.dataset
  if (cmd === 'attach') {
    fileEl.value?.click()
    return
  }
  const notice = applyCommand(cmd, arg, editorEl.value)
  if (notice) status.value = notice
  countWords()
}

async function onFiles(event) {
  const files = [...(event.target.files || [])]
  event.target.value = ''
  for (const file of files) {
    props.draft.attachments.push(await fileToAttachment(file))
  }
  if (files.length) status.value = `已添加 ${files.length} 个附件`
}

async function send() {
  if (sending.value) return
  sending.value = true
  status.value = '正在发送…'
  try {
    await sendMail({
      auth,
      draft: props.draft,
      content: editorEl.value?.innerHTML || ''
    })
    status.value = '已发送'
    setTimeout(() => emit('sent'), 520)
  } catch (err) {
    status.value = err?.message || '发送失败'
  } finally {
    sending.value = false
  }
}

function onKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    send()
  }
}
</script>

<template>
  <section v-if="open" class="compose-page surface-in" aria-label="全屏写信">
    <header class="compose-page__head">
      <div class="compose-page__title">
        <span class="dot"></span>
        <span>{{ title }}</span>
        <span class="meta">FULL EDITOR</span>
      </div>
      <div class="compose-page__actions">
        <button class="btn" type="button" @click="$emit('collapse', editorEl?.innerHTML || '')">收拢为浮窗</button>
        <button class="btn btn--primary" type="button" :disabled="sending" @click="send">发 送</button>
        <button class="btn btn--icon" type="button" title="关闭" @click="$emit('close')">
          <svg viewBox="0 0 16 16" width="14" height="14" stroke="currentColor" stroke-width="1.4">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </div>
    </header>

    <div class="compose-page__inner">
      <div class="compose-page__meta">
        <div class="meta-row">
          <span class="meta-row__label">收件人</span>
          <RecipientInput v-model="draft.to" placeholder="recipient@domain" />
          <button class="btn btn--ghost btn--slim" type="button" @click="showCc = !showCc">抄送</button>
        </div>
        <div v-if="showCc" class="meta-row">
          <span class="meta-row__label">抄送</span>
          <input v-model="draft.cc" class="line-input" type="text" placeholder="cc@domain" />
        </div>
        <div class="meta-row">
          <span class="meta-row__label">主题</span>
          <input v-model="draft.subject" class="line-input" type="text" placeholder="subject" />
        </div>
      </div>

      <div class="editor-wrap">
        <div class="editor-toolbar" role="toolbar" aria-label="格式工具" @mousedown="onToolMouseDown" @click="onTool">
          <template v-for="(group, gi) in TOOL_GROUPS" :key="gi">
            <span v-if="gi > 0" class="editor-toolbar__sep"></span>
            <button
              v-for="item in group"
              :key="item.cmd + (item.arg || '')"
              type="button"
              class="tool-btn"
              :class="[item.cls, { 'tool-btn--swatch': item.swatch }]"
              :title="item.title"
              :data-cmd="item.cmd"
              :data-arg="item.arg"
            >
              <i v-if="item.swatch" :style="{ background: item.swatch }"></i>
              <span v-else-if="item.icon" v-html="ICONS[item.icon]"></span>
              <template v-else>{{ item.label }}</template>
            </button>
          </template>
        </div>

        <div
          ref="editorEl"
          class="editor"
          contenteditable="true"
          role="textbox"
          aria-multiline="true"
          @input="onInput"
          @keydown="onKeydown"
        ></div>

        <footer class="compose-page__foot">
          <div class="attach-list">
            <span v-for="(att, index) in draft.attachments" :key="att.filename + index" class="attach-chip">
              <span>{{ att.filename }}</span>
              <span class="meta">{{ formatBytes(att.size) }}</span>
              <button type="button" aria-label="移除" @click="draft.attachments.splice(index, 1)">×</button>
            </span>
          </div>
          <input ref="fileEl" type="file" multiple hidden @change="onFiles" />
          <span class="meta" style="margin-left: auto">{{ counter }} 字</span>
          <span class="meta">{{ status }}</span>
        </footer>
      </div>
    </div>
  </section>
</template>
