<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowUpRight, HeartHandshake } from 'lucide-vue-next'

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

// 一条支持记录对应一枚弹幕，桌面三行、手机两行，不生成假支持者。
const danmaku = computed(() => supporters.value.map((supporter, index, list) => {
  function layout(rows: number) {
    const lane = index % rows
    const order = Math.floor(index / rows)
    const size = Math.floor((list.length - 1 - lane) / rows) + 1
    const duration = Math.max(20, size * 9)
    return { lane, duration, delay: -(1.5 + lane * 4.7 + order * duration / size) }
  }
  const desktop = layout(3)
  const mobile = layout(2)
  return {
    ...supporter,
    topDesktop: (13 + desktop.lane * 43) + 'px',
    topMobile: (12 + mobile.lane * 42) + 'px',
    durationDesktop: desktop.duration + 's',
    durationMobile: mobile.duration + 's',
    delayDesktop: desktop.delay + 's',
    delayMobile: mobile.delay + 's'
  }
}))

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

async function loadSnapshot() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/Lee7017/lingcang-ota/main/support/ios.json?v=' + Date.now(), { cache: 'no-store' })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    snapshot.value = parseSnapshot(await res.json())
  } catch {
    error.value = '进度加载失败，请稍后重新打开页面。'
  }
}

onMounted(loadSnapshot)
</script>

<template>
  <article id="ios-support" class="download-card ios-support-card" aria-labelledby="ios-support-title">
    <div class="ios-card-heading">
      <div class="ios-card-intro">
        <div class="platform-icon ios-card-icon"><HeartHandshake :size="27" stroke-width="1.6" /></div>
        <div class="ios-card-title">
          <span>iOS / iPadOS</span>
          <h2 id="ios-support-title">iOS 开发者支持计划</h2>
        </div>
      </div>
      <a :href="SUPPORT_URL" class="xs-button primary ios-support-link" target="_blank" rel="noopener noreferrer">
        <span>前往支持</span>
        <span class="ios-support-link-arrow"><ArrowUpRight :size="16" stroke-width="2.3" /></span>
      </a>
    </div>

    <div class="ios-funding" aria-live="polite">
      <div class="ios-funding-row">
        <span>筹集进度 · 目标 {{ money.format(target) }}</span>
        <strong>{{ configured ? percent.toFixed(1) + '%' : '—' }}</strong>
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
        <span>后台每 30 分钟更新数据</span>
      </div>
      <p v-if="error" class="ios-error" role="status">{{ error }}</p>
    </div>

    <div class="ios-carousel" role="region" aria-label="公开支持者弹幕">
      <div class="ios-danmaku-panel">
        <template v-if="danmaku.length">
          <div v-for="(supporter, index) in danmaku" :key="index"
            class="ios-danmaku-chip"
            :style="{
              '--top-desktop': supporter.topDesktop,
              '--top-mobile': supporter.topMobile,
              '--duration-desktop': supporter.durationDesktop,
              '--duration-mobile': supporter.durationMobile,
              '--delay-desktop': supporter.delayDesktop,
              '--delay-mobile': supporter.delayMobile
            }">
            <span class="ios-danmaku-name">{{ supporter.name }}</span>
            <span class="ios-danmaku-amount">{{ money.format(supporter.amount) }}</span>
          </div>
        </template>
        <div v-else class="ios-danmaku-empty">暂无已授权公开的支持者</div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.ios-support-card { min-width:0; scroll-margin-top:105px; gap:0; }
.ios-card-heading { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:10px; min-width:0; }
.ios-card-intro { display:flex; align-items:center; gap:10px; min-width:0; }
.ios-card-icon { width:45px; height:45px; flex:none; margin:0; border-radius:13px; }
.ios-card-title { min-width:0; }
.ios-support-link { min-height:46px; height:46px; min-width:0; flex:none; padding:0 8px 0 14px; gap:8px; font-size:12px; font-weight:760; letter-spacing:.01em; box-shadow:inset 0 1px rgba(255,255,255,.22),0 8px 19px rgba(15,18,25,.13); }
.ios-support-link-arrow { display:grid; place-items:center; width:28px; height:28px; border-radius:9px; background:rgba(255,255,255,.17); box-shadow:inset 0 1px rgba(255,255,255,.16); transition:transform .18s ease,background-color .18s ease; }
.ios-support-link:hover .ios-support-link-arrow { transform:translate(1px,-1px); background:rgba(255,255,255,.25); }
:global(.dark) .ios-support-link-arrow { background:rgba(18,21,27,.10); box-shadow:inset 0 1px rgba(18,21,27,.06); }
:global(.dark) .ios-support-link:hover .ios-support-link-arrow { background:rgba(18,21,27,.18); }
.ios-support-link:focus-visible { outline:2px solid var(--xs-ink); outline-offset:3px; }
.ios-card-title>span { display:block; color:var(--xs-muted); font-size:11px; margin-bottom:4px; }
.ios-card-title h2 { font-size:19px; line-height:1.25; letter-spacing:-.035em; overflow-wrap:anywhere; }
.ios-funding { margin-top:21px; }
.ios-funding-row { display:flex; align-items:baseline; justify-content:space-between; gap:10px; }
.ios-funding-row>span { color:var(--xs-muted); font-size:11px; }
.ios-funding-row>strong { font-size:14px; font-weight:760; font-variant-numeric:tabular-nums; white-space:nowrap; }
.ios-progress-track { height:9px; margin-top:11px; border-radius:999px; overflow:hidden; background:var(--xs-rule); }
.ios-progress-fill { height:100%; background:var(--xs-ink); border-radius:inherit; transition:width .4s ease; }
.ios-sync { margin-top:17px; }
.ios-sync-line { display:flex; align-items:center; justify-content:space-between; gap:8px; white-space:nowrap; color:var(--xs-muted); font-size:11px; line-height:1.65; }
.ios-error { margin:7px 0 0!important; color:var(--xs-muted); font-size:11px!important; }
.ios-carousel { margin-top:20px; min-width:0; }
.ios-danmaku-panel { position:relative; overflow:hidden; height:145px; min-width:0; isolation:isolate; border:1px solid var(--xs-rule); border-radius:14px; background:var(--xs-soft); }
.ios-danmaku-panel::before,.ios-danmaku-panel::after { content:''; position:absolute; top:0; bottom:0; width:24px; z-index:1; pointer-events:none; }
.ios-danmaku-panel::before { left:0; background:linear-gradient(to right,var(--xs-soft),transparent); }
.ios-danmaku-panel::after { right:0; background:linear-gradient(to left,var(--xs-soft),transparent); }
.ios-danmaku-chip { position:absolute; top:var(--top-desktop); left:100%; display:inline-flex; align-items:center; gap:11px; height:32px; max-width:none; padding:0 13px; border:1px solid var(--xs-rule); border-radius:999px; color:var(--xs-ink); background:var(--xs-frost-strong); box-shadow:0 2px 8px rgba(15,18,28,.055),inset 0 1px var(--xs-glow); white-space:nowrap; font-size:11px; will-change:left,transform; animation:ios-danmaku-fly var(--duration-desktop) linear infinite; animation-delay:var(--delay-desktop); }
.ios-danmaku-name { font-weight:700; }
.ios-danmaku-amount { color:var(--xs-muted); font-size:10px; font-variant-numeric:tabular-nums; }
@keyframes ios-danmaku-fly { from { left:100%; transform:translateX(0); } to { left:0; transform:translateX(-100%); } }
.ios-danmaku-panel:hover .ios-danmaku-chip,.ios-danmaku-panel:focus-within .ios-danmaku-chip { animation-play-state:paused; }
.ios-danmaku-empty { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--xs-muted); font-size:11px; }
@media (max-width:680px) {
  .ios-sync-line { font-size:10px; }
  .ios-card-title h2 { font-size:17px; }
  .ios-support-link { padding-left:10px; font-size:11px; gap:5px; }
  .ios-support-link-arrow { width:25px; height:25px; border-radius:8px; }
  .ios-funding { margin-top:17px; }
  .ios-carousel { margin-top:17px; }
  .ios-danmaku-panel { height:105px; }
  .ios-danmaku-chip { top:var(--top-mobile); animation-duration:var(--duration-mobile); animation-delay:var(--delay-mobile); }
}
@media (max-width:380px) { .ios-sync-line { font-size:9px; gap:4px; } }
@media (prefers-reduced-motion:reduce) {
  .ios-progress-fill,.ios-support-link-arrow { transition:none; }
  .ios-danmaku-panel { display:flex; align-items:flex-start; flex-wrap:wrap; gap:8px; padding:11px; overflow:auto; }
  .ios-danmaku-chip { position:static; animation:none; transform:none; flex:none; }
}
</style>
