<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { ArrowUp } from 'lucide-vue-next'

const visible = ref(false)
const footerBottom = ref<number | null>(null)
let frame = 0

function updateVisibility() {
  visible.value = window.scrollY > 560
  const footer = document.querySelector('.Layout .VPFooter')
  const rect = footer?.getBoundingClientRect()
  // 页面到底时把箭头保持在版权栏上方，避免遮挡文字。
  footerBottom.value = rect && rect.top < window.innerHeight && rect.bottom > 0
    ? Math.round(window.innerHeight - rect.top + 12)
    : null
}
function onScroll() {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    updateVisibility()
  })
}
function goToTop() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? 'instant' : 'smooth' })
}

onMounted(() => {
  updateVisibility()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  if (frame) cancelAnimationFrame(frame)
})
</script>

<template>
  <button v-if="visible" class="xs-back-to-top" type="button"
    :style="footerBottom === null ? undefined : { bottom: footerBottom + 'px' }"
    aria-label="返回顶部" title="返回顶部" @click="goToTop">
    <ArrowUp :size="20" :stroke-width="2" />
  </button>
</template>
