<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ArrowUpRight, ChevronLeft, ChevronRight, HeartHandshake, RefreshCw } from 'lucide-vue-next'

interface PublicSupporter {
  name: string
  amount: number
}
interface IosSupportSnapshot {
  status: 'unconfigured' | 'live'
  target: number
  raised: number | null
  supporterCount: number | null
  syncedAt: string | null
  supportUrl: string | null
  supporters: PublicSupporter[]
}

const SUPPORT_URL = 'https://afdian.com/item/d9aa8642e2b411f181af52540025c377'
const snapshot = ref<IosSupportSnapshot | null>(null)
const loading = ref(false)
const error = ref('')
const money = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 })

const configured = computed(() => snapshot.value?.status === 'live')
const target = computed(() => snapshot.value?.target ?? 750)
const raised = computed(() => configured.value ? snapshot.value?.raised ?? null : null)
const percent = computed(() => raised.value === null || target.value <= 0
  ? 0 : Math.min(100, Math.max(0, raised.value / target.value * 100)))
const supporters = computed(() => configured.value ? snapshot.value?.supporters ?? [] : [])
const syncedText = computed(() => {
  if (!snapshot.value?.syncedAt || !configured.value) return '尚未同步'
  const date = new Date(snapshot.value.syncedAt)
  return Number.isNaN(date.getTime()) ? '时间未知' : new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date)
})

const supporterIndex = ref(0)
const carouselPaused = ref(false)
const activeSupporter = computed(() => supporters.value[supporterIndex.value] ?? null)
let carouselTimer: ReturnType<typeof setInterval> | undefined

function stepSupporter(step: number) {
  const length = supporters.value.length
  if (length < 2) return
  supporterIndex.value = (supporterIndex.value + step + length) % length
}

function resetCarousel() {
  if (carouselTimer) clearInterval(carouselTimer)
  carouselTimer = undefined
  supporterIndex.value = 0
  if (supporters.value.length < 2 || (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return
  carouselTimer = setInterval(() => {
    if (!carouselPaused.value) stepSupporter(1)
  }, 5000)
}

function onCarouselFocusOut(event: FocusEvent) {
  const area = event.currentTarget as HTMLElement
  if (!area.contains(event.relatedTarget as Node | null)) carouselPaused.value = false
}

function parseSnapshot(value: unknown): IosSupportSnapshot {
  if (!value || typeof value !== 'object') throw new Error('数据格式不正确')
  const data = value as Record<string, unknown>
  if (data.status !== 'live' && data.status !== 'unconfigured') throw new Error('数据状态不正确')
  if (typeof data.target !== 'number' || !Number.isFinite(data.target) || data.target <= 0) throw new Error('筹集目标无效')
  if (data.status === 'live' && (
    typeof data.raised !== 'number' || !Number.isFinite(data.raised) || data.raised < 0 ||
    typeof data.supporterCount !== 'number' || !Number.isSafeInteger(data.supporterCount) || data.supporterCount < 0 ||
    typeof data.syncedAt !== 'string' || Number.isNaN(Date.parse(data.syncedAt))
  )) throw new Error('统计数据无效')
  const raw = Array.isArray(data.supporters) ? data.supporters : []
  const publicSupporters = raw.filter((item): item is PublicSupporter =>
    !!item && typeof item === 'object' && typeof item.name === 'string' &&
    item.name.trim().length > 0 && typeof item.amount === 'number' &&
    Number.isFinite(item.amount) && item.amount >= 0)
    .slice(0, 30)
  return {
    status: data.status,
    target: data.target,
    raised: data.status === 'live' ? data.raised as number : null,
    supporterCount: data.status === 'live' ? data.supporterCount as number : null,
    syncedAt: data.status === 'live' ? data.syncedAt as string : null,
    supportUrl: typeof data.supportUrl === 'string' ? data.supportUrl : null,
    supporters: publicSupporters
  }
}

async function refresh() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('https://raw.githubusercontent.com/Lee7017/lingcang-ota/main/support/ios.json?v=' + Date.now(), { cache: 'no-store' })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    snapshot.value = parseSnapshot(await res.json())
  } catch {
    error.value = snapshot.value ? '刷新失败，仍显示上次获取的数据。' : '进度加载失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

watch(supporters, resetCarousel)
onMounted(refresh)
onUnmounted(() => { if (carouselTimer) clearInterval(carouselTimer) })
</script>

<template>
  <article id="ios-support" class="download-card ios-support-card" aria-labelledby="ios-support-title">
    <div class="ios-card-heading">
      <div class="platform-icon ios-card-icon"><HeartHandshake :size="27" stroke-width="1.6" /></div>
      <div class="ios-card-title">
        <span>iOS / iPadOS</span>
        <h2 id="ios-support-title">iOS 开发者支持计划</h2>
      </div>
    </div>

    <div class="ios-funding" aria-live="polite">
      <div class="ios-funding-row">
        <div class="ios-funding-amount">
          <span>已确认支持</span>
          <strong>{{ raised === null ? '尚未同步' : money.format(raised) }}</strong>
        </div>
        <div class="ios-funding-target">
          <span>目标 {{ money.format(target) }}</span>
          <strong>{{ configured ? percent.toFixed(1) + '%' : '待同步' }}</strong>
        </div>
      </div>
      <div class="ios-progress-track" role="progressbar" :aria-valuemin="0" :aria-valuemax="100"
        :aria-valuenow="configured ? Math.round(percent) : undefined"
        :aria-valuetext="configured ? percent.toFixed(1) + '%' : '尚未同步'">
        <div class="ios-progress-fill" :style="{ width: percent + '%' }"></div>
      </div>
    </div>

    <div class="ios-sync">
      <div class="ios-sync-line">
        <span>最近同步：{{ syncedText }}</span>
        <button type="button" class="ios-refresh" :disabled="loading" @click="refresh"
          :aria-label="loading ? '正在刷新支持进度' : '手动刷新支持进度'" title="刷新已发布的统计数据">
          <RefreshCw :size="15" :class="{ 'ios-spinning': loading }" />
        </button>
      </div>
      <p class="ios-frequency">后台每 30 分钟尝试同步一次（可能延迟），手动刷新仅获取已发布的数据。</p>
      <p v-if="error" class="ios-error" role="status">{{ error }}</p>
    </div>

    <div class="ios-carousel" role="region" aria-roledescription="轮播" aria-label="支持者公示"
      @mouseenter="carouselPaused = true" @mouseleave="carouselPaused = false"
      @focusin="carouselPaused = true" @focusout="onCarouselFocusOut">
      <div class="ios-carousel-heading">
        <h3>支持者公示</h3>
        <div v-if="supporters.length > 1" class="ios-carousel-controls">
          <span>{{ supporterIndex + 1 }} / {{ supporters.length }}</span>
          <button type="button" aria-label="上一位支持者" @click="stepSupporter(-1)"><ChevronLeft :size="16" /></button>
          <button type="button" aria-label="下一位支持者" @click="stepSupporter(1)"><ChevronRight :size="16" /></button>
        </div>
        <span v-else class="ios-carousel-note">自愿公开</span>
      </div>
      <div class="ios-carousel-viewport">
        <Transition name="ios-slide" mode="out-in">
          <div v-if="activeSupporter" :key="supporterIndex" class="ios-supporter">
            <span class="ios-supporter-name">{{ activeSupporter.name }}</span>
            <strong>{{ money.format(activeSupporter.amount) }}</strong>
          </div>
          <p v-else key="empty" class="ios-support-empty">暂无已授权公开的支持者</p>
        </Transition>
      </div>
    </div>

    <a :href="SUPPORT_URL" class="xs-button primary ios-support-link" target="_blank" rel="noopener noreferrer">
      前往爱发电支持 <ArrowUpRight :size="16" />
    </a>
  </article>
</template>

<style scoped>
.ios-support-card { min-width:0; scroll-margin-top:105px; gap:0; }
.ios-card-heading { display:flex; align-items:center; gap:13px; min-width:0; }
.ios-card-icon { width:48px; height:48px; flex:none; margin:0; border-radius:14px; }
.ios-card-title { min-width:0; }
.ios-card-title>span { display:block; color:var(--xs-muted); font-size:11px; margin-bottom:4px; }
.ios-card-title h2 { font-size:19px; line-height:1.25; letter-spacing:-.035em; overflow-wrap:anywhere; }
.ios-funding { margin-top:21px; }
.ios-funding-row { display:flex; align-items:end; justify-content:space-between; gap:10px; }
.ios-funding-amount, .ios-funding-target { display:flex; flex-direction:column; gap:5px; min-width:0; }
.ios-funding-amount>span, .ios-funding-target>span { color:var(--xs-muted); font-size:11px; }
.ios-funding-amount>strong { font-size:clamp(18px,2.2vw,24px); font-weight:780; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
.ios-funding-target { text-align:right; }
.ios-funding-target>strong { font-size:14px; font-weight:760; font-variant-numeric:tabular-nums; }
.ios-progress-track { height:9px; margin-top:11px; border-radius:999px; overflow:hidden; background:var(--xs-rule); }
.ios-progress-fill { height:100%; background:var(--xs-ink); border-radius:inherit; transition:width .4s ease; }
.ios-sync { margin-top:17px; }
.ios-sync-line { display:flex; align-items:center; justify-content:space-between; gap:10px; color:var(--xs-muted); font-size:11px; }
.ios-refresh { width:29px; height:29px; display:grid; place-items:center; flex:none; border:1px solid var(--xs-rule); border-radius:8px; color:var(--xs-ink); background:var(--xs-soft); cursor:pointer; }
.ios-refresh:disabled { opacity:.5; cursor:wait; }
.ios-frequency { margin:5px 0 0!important; color:var(--xs-muted); font-size:11px!important; line-height:1.65!important; }
.ios-error { margin:7px 0 0!important; color:var(--xs-muted); font-size:11px!important; }
.ios-carousel { margin-top:19px; padding-top:15px; border-top:1px solid var(--xs-rule); min-width:0; }
.ios-carousel-heading { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.ios-carousel-heading h3 { font-size:13px; font-weight:740; }
.ios-carousel-note, .ios-carousel-controls>span { font-size:10px; color:var(--xs-muted); }
.ios-carousel-controls { display:flex; align-items:center; gap:6px; }
.ios-carousel-controls button { display:grid; place-items:center; width:25px; height:25px; border:1px solid var(--xs-rule); border-radius:7px; background:var(--xs-soft); color:var(--xs-ink); cursor:pointer; }
.ios-carousel-viewport { position:relative; min-height:49px; margin-top:9px; overflow:hidden; }
.ios-supporter { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:45px; padding:10px 12px; background:var(--xs-soft); border:1px solid var(--xs-rule); border-radius:10px; font-size:12px; }
.ios-supporter-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ios-supporter strong { font-variant-numeric:tabular-nums; white-space:nowrap; }
.ios-support-card .ios-support-empty { display:flex; align-items:center; min-height:45px; padding:10px 12px; margin:0; color:var(--xs-muted); background:var(--xs-soft); border:1px dashed var(--xs-rule); border-radius:10px; font-size:11px; line-height:1.5; }
.ios-support-link { width:100%; min-height:43px; margin-top:auto; display:flex; align-items:center; justify-content:center; gap:8px; }
.ios-slide-enter-active,.ios-slide-leave-active { transition:opacity .2s ease,transform .2s ease; }
.ios-slide-enter-from { opacity:0; transform:translateX(14px); }
.ios-slide-leave-to { opacity:0; transform:translateX(-14px); }
.ios-spinning { animation:ios-spin 1s linear infinite; }
@keyframes ios-spin { to { transform:rotate(360deg); } }
@media (max-width:680px) {
  .ios-card-title h2 { font-size:18px; }
  .ios-funding { margin-top:17px; }
  .ios-carousel { margin-top:15px; }
}
@media (prefers-reduced-motion:reduce) {
  .ios-progress-fill,.ios-slide-enter-active,.ios-slide-leave-active { transition:none; }
  .ios-spinning { animation:none; }
}
</style>
