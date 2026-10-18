<script setup>
import { ref } from 'vue'

const open = ref(false)

const SITE = 'https://starlightsacredsanctuary.top'
const links = [
  { label: '首页', href: `${SITE}/` },
  { label: '星图', href: `${SITE}/starmap/` },
  { label: '舰队', href: `${SITE}/fleet/` },
  { label: '工具', href: `${SITE}/tool/` },
  { label: '档案', href: `${SITE}/archive/` },
  { label: '关于', href: `${SITE}/about/` }
]
</script>

<template>
  <header class="navbar" :class="{ 'is-menu-open': open }">
    <a class="logo" :href="`${SITE}/`">
      <span class="logo__mark" aria-hidden="true"></span>
      星光圣域
    </a>

    <nav id="site-nav">
      <a v-for="link in links" :key="link.label" :href="link.href">{{ link.label }}</a>
      <router-link to="/" class="is-current">邮箱</router-link>
    </nav>

    <button
      class="navbar__toggle"
      type="button"
      aria-label="导航菜单"
      :aria-expanded="open ? 'true' : 'false'"
      @click="open = !open"
    >
      <span class="navbar__toggle__bars" aria-hidden="true"></span>
    </button>
  </header>
</template>

<style scoped>
.navbar nav a.is-current {
  opacity: 1;
  color: var(--ctl-fg-hover);
}
</style>
