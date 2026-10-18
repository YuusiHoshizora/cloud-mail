<script setup>
import { computed, ref } from 'vue'
import { suggestContacts } from '@/lib/contacts'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '收件人 · recipient@domain' }
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const active = ref(0)

/** 逗号分隔的多收件人：只看最后一个正在输入的片段 */
function parts(value) {
  return String(value || '')
    .split(/[,;，；]/)
    .map((item) => item.trim())
}

const typedToken = computed(() => {
  const list = String(props.modelValue || '').split(/[,;，；]/)
  return (list[list.length - 1] || '').trim()
})

const suggestions = computed(() => {
  if (!open.value) return []
  return suggestContacts(typedToken.value, parts(props.modelValue).slice(0, -1))
})

function update(event) {
  emit('update:modelValue', event.target.value)
  open.value = true
  active.value = 0
}

function pick(email) {
  /* 已经确定的前几段原样保留，最后一段（正在输入的）替换成选中的地址 */
  const tokens = String(props.modelValue || '')
    .split(/[,;，；]/)
    .map((item) => item.trim())
    .filter(Boolean)
  tokens.pop()
  tokens.push(email)
  emit('update:modelValue', `${tokens.join(', ')}, `)
  open.value = false
  active.value = 0
}

function onKeydown(event) {
  if (!suggestions.value.length) {
    if (event.key === 'Escape') open.value = false
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    active.value = (active.value + 1) % suggestions.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = (active.value - 1 + suggestions.value.length) % suggestions.value.length
  } else if (event.key === 'Enter' || event.key === 'Tab') {
    event.preventDefault()
    pick(suggestions.value[active.value])
  } else if (event.key === 'Escape') {
    open.value = false
  }
}

function onFocus() {
  if (typedToken.value) open.value = true
  active.value = 0
}

function closeSoon() {
  setTimeout(() => { open.value = false }, 120)
}
</script>

<template>
  <span class="recipient-field">
    <input
      class="line-input"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      autocomplete="off"
      @input="update"
      @focus="onFocus"
      @keydown="onKeydown"
      @blur="closeSoon"
    />
    <ul v-if="open && suggestions.length" class="recipient-suggest">
      <li
        v-for="(item, index) in suggestions"
        :key="item"
        :class="{ 'is-active': index === active }"
        @mousedown.prevent="pick(item)"
        @mouseenter="active = index"
      >{{ item }}</li>
    </ul>
  </span>
</template>
