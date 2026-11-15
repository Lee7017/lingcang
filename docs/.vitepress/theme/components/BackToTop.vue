<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { ArrowUp } from 'lucide-vue-next'

const visible = ref(false)
let frame = 0

function updateVisibility() {
  visible.value = window.scrollY > 560
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
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  if (frame) cancelAnimationFrame(frame)
})
</script>

<template>
  <button v-if="visible" class="xs-back-to-top" type="button"
    aria-label="返回顶部" title="返回顶部" @click="goToTop">
    <ArrowUp :size="20" :stroke-width="2" />
  </button>
</template>
