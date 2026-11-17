<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowUpRight, CalendarDays, CheckCircle2, HeartHandshake,
  RefreshCw, ShieldCheck, Users, Wallet
} from 'lucide-vue-next'

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

const snapshot = ref<IosSupportSnapshot | null>(null)
const loading = ref(false)
const error = ref('')
const hasLoaded = ref(false)
const money = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 })

const configured = computed(() => snapshot.value?.status === 'live')
const target = computed(() => snapshot.value?.target ?? 750)
const raised = computed(() => configured.value ? snapshot.value?.raised ?? null : null)
const count = computed(() => configured.value ? snapshot.value?.supporterCount ?? null : null)
const percent = computed(() => raised.value === null || target.value <= 0
  ? 0 : Math.min(100, Math.max(0, raised.value / target.value * 100)))
const finished = computed(() => raised.value !== null && raised.value >= target.value)
const supporters = computed(() => configured.value ? snapshot.value?.supporters ?? [] : [])
const supportUrl = computed(() => {
  const url = snapshot.value?.supportUrl
  if (!url || !configured.value) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && ['afdian.com', 'www.afdian.com', 'afdian.net', 'www.afdian.net'].includes(parsed.hostname)
      ? parsed.href : null
  } catch { return null }
})
const syncedText = computed(() => {
  if (!snapshot.value?.syncedAt || !configured.value) return '尚未完成数据同步'
  const date = new Date(snapshot.value.syncedAt)
  return Number.isNaN(date.getTime()) ? '同步时间未知' : new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date)
})

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
    error.value = snapshot.value ? '刷新失败，以下为上次获取的数据。' : '暂时无法加载支持进度，请稍后手动刷新。'
  } finally {
    hasLoaded.value = true
    loading.value = false
  }
}

onMounted(refresh)
</script>

<template>
  <section id="ios-support" class="ios-support" aria-labelledby="ios-support-title">
    <div class="ios-support-topline">
      <span class="ios-support-kicker"><HeartHandshake :size="16" /> iOS / iPadOS</span>
      <span class="ios-support-status"><span class="status-dot" /> 开发支持计划</span>
    </div>
    <div class="ios-support-header">
      <div>
        <h2 id="ios-support-title">一起让灵仓登上 App Store</h2>
        <p>iOS / iPadOS 版本正在筹备中。我们希望通过自愿支持，筹集 Apple Developer Program 的年度会员费用。</p>
      </div>
      <div class="ios-support-target">
        <span>本期计划目标</span><strong>{{ money.format(target) }}</strong>
        <small>金额暂定，按实际费用调整</small>
      </div>
    </div>

    <div class="ios-support-stats" aria-live="polite">
      <div class="ios-stat">
        <div class="ios-stat-label"><Wallet :size="17" /> 已确认支持</div>
        <strong>{{ raised === null ? '尚未同步' : money.format(raised) }}</strong>
        <span>{{ configured ? (finished ? '本期目标已达到' : '来自已核实的支持订单') : '等待爱发电数据接入' }}</span>
      </div>
      <div class="ios-stat">
        <div class="ios-stat-label"><Users :size="17" /> 支持人数</div>
        <strong>{{ count === null ? '—' : count + ' 人' }}</strong>
        <span>以去重后的有效支持者统计</span>
      </div>
    </div>

    <div class="ios-support-progress">
      <div class="ios-progress-heading">
        <strong>筹集进度</strong>
        <span>{{ configured ? percent.toFixed(1) + '%' : '待同步' }}</span>
      </div>
      <div class="ios-progress-track" role="progressbar" :aria-valuemin="0"
        :aria-valuemax="100" :aria-valuenow="configured ? Math.round(percent) : undefined"
        :aria-valuetext="configured ? percent.toFixed(1) + '%' : '尚未同步'">
        <div class="ios-progress-fill" :style="{ width: percent + '%' }"></div>
      </div>
      <p v-if="finished">感谢大家的支持！超出目标的实际金额仍会如实统计。</p>
      <p v-else>数据不是实时到账记录，显示最近一次成功发布的统计结果。</p>
    </div>

    <div class="ios-support-controls">
      <div class="ios-sync-info"><CheckCircle2 :size="16" />
        <div class="ios-sync-details">
          <span>最近公开数据更新：{{ syncedText }}</span>
          <span>后台计划每 30 分钟尝试同步一次（可能延迟）；手动刷新仅获取已发布数据。</span>
        </div>
      </div>
      <button type="button" class="xs-button secondary ios-refresh" :disabled="loading"
        @click="refresh" :aria-label="loading ? '正在刷新支持进度' : '手动刷新支持进度'">
        <RefreshCw :size="16" :class="{ 'ios-spinning': loading }" />
        {{ loading ? '刷新中…' : '刷新进度' }}
      </button>
    </div>
    <p v-if="error" class="ios-support-error" role="status">{{ error }}</p>
    <p v-if="!configured && hasLoaded && !error" class="ios-support-pending" role="status">
      爱发电订单同步尚未开通，当前不展示未经核实的筹款金额。
    </p>

    <div class="ios-support-public">
      <div class="ios-public-heading"><h3>支持者公示</h3><span>自愿公开 · 默认匿名</span></div>
      <ul v-if="supporters.length > 0" class="ios-supporters">
        <li v-for="(supporter, i) in supporters" :key="i">
          <span>{{ supporter.name }}</span><strong>{{ money.format(supporter.amount) }}</strong>
        </li>
      </ul>
      <p v-else class="ios-support-empty">暂无已获授权公开的支持者记录。手机号及私人订单信息不会出现在这里。</p>
    </div>

    <div class="ios-support-footer">
      <div class="ios-support-action">
        <a v-if="supportUrl" class="xs-button primary" :href="supportUrl" target="_blank" rel="noopener noreferrer">
          前往爱发电支持 <ArrowUpRight :size="16" />
        </a>
        <span v-else class="xs-button disabled" aria-disabled="true">支持入口准备中</span>
        <p>支持完全自愿；收款和手机号关联功能以正式开放的信息为准。</p>
      </div>
      <div class="ios-support-policy">
        <div><CalendarDays :size="17" /><p>iOS 版正式上架后，计划首年免费下载；第二年起改为付费下载，具体价格待定。</p></div>
        <div><ShieldCheck :size="17" /><p>目前不收集手机号；未来与历史支持金额关联的方式，待支付渠道确认后再开放。</p></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ios-support { max-width: 910px; margin: 26px auto 0; padding: 32px; border-radius: 22px; border: 1px solid var(--xs-border); background: var(--xs-frost); box-shadow: var(--xs-shadow), inset 0 1px var(--xs-glow); backdrop-filter: blur(22px) saturate(145%); scroll-margin-top: 105px; }
.ios-support-topline { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:20px; }
.ios-support-kicker { display:inline-flex; gap:8px; align-items:center; font-size:12px; font-weight:760; }
.ios-support-status { display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border-radius:99px; background:var(--xs-soft); border:1px solid var(--xs-rule); color:var(--xs-muted); font-size:11px; font-weight:650; }
.ios-support-header { display:grid; grid-template-columns:minmax(0,1fr) 210px; gap:25px; align-items:center; }
.ios-support-header h2 { font-size:clamp(23px,3.4vw,30px); font-weight:790; letter-spacing:-.055em; }
.ios-support-header p { max-width:490px; margin:12px 0 0; color:var(--xs-muted); font-size:13px; line-height:1.85; }
.ios-support-target { display:flex; flex-direction:column; padding:19px 20px; border-radius:16px; background:var(--xs-frost-strong); border:1px solid var(--xs-rule); }
.ios-support-target span, .ios-support-target small { color:var(--xs-muted); font-size:11px; }
.ios-support-target strong { font-size:29px; letter-spacing:-.06em; font-variant-numeric:tabular-nums; margin:4px 0; }
.ios-support-stats { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:13px; margin-top:26px; }
.ios-stat { display:flex; flex-direction:column; gap:9px; padding:23px; border:1px solid var(--xs-rule); border-radius:16px; background:var(--xs-soft); min-width:0; }
.ios-stat-label { display:flex; align-items:center; gap:9px; color:var(--xs-muted); font-size:12px; font-weight:660; }
.ios-stat strong { font-size:clamp(22px,3vw,30px); letter-spacing:-.05em; font-weight:790; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
.ios-stat>span { color:var(--xs-muted); font-size:11px; line-height:1.6; }
.ios-support-progress { margin-top:25px; }
.ios-progress-heading { display:flex; align-items:center; justify-content:space-between; font-size:12px; gap:12px; }
.ios-progress-heading span { font-weight:770; font-variant-numeric:tabular-nums; }
.ios-progress-track { height:11px; margin-top:12px; border-radius:99px; overflow:hidden; background:var(--xs-rule); }
.ios-progress-fill { height:100%; background:var(--xs-ink); border-radius:inherit; transition:width .4s ease; }
.ios-support-progress p { margin-top:10px; font-size:11px; line-height:1.7; color:var(--xs-muted); }
.ios-support-controls { display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap; padding:21px 0; border-bottom:1px solid var(--xs-rule); }
.ios-sync-info { display:flex; align-items:flex-start; gap:8px; flex:1 1 290px; min-width:0; font-size:11px; color:var(--xs-muted); }
.ios-sync-info>svg { flex:none; margin-top:2px; }
.ios-sync-details { display:flex; flex-direction:column; gap:4px; line-height:1.65; }
.ios-refresh { min-height:38px; padding:0 13px; font-size:12px; cursor:pointer; }
.ios-refresh:disabled { opacity:.6; cursor:wait; }
.ios-spinning { animation:ios-spin 1s linear infinite; }
@keyframes ios-spin { to { transform:rotate(360deg); } }
.ios-support-error, .ios-support-pending { padding:10px 12px; margin:12px 0 0; border-radius:10px; background:var(--xs-soft); border:1px solid var(--xs-rule); color:var(--xs-muted); font-size:12px; line-height:1.7; }
.ios-support-public { padding-top:24px; }
.ios-public-heading { display:flex; justify-content:space-between; align-items:center; gap:15px; flex-wrap:wrap; }
.ios-public-heading h3 { font-size:17px; font-weight:770; }
.ios-public-heading span { color:var(--xs-muted); font-size:11px; }
.ios-support-empty { padding:19px; margin-top:13px !important; border:1px dashed var(--xs-rule); border-radius:12px; color:var(--xs-muted); font-size:12px; line-height:1.8; }
.ios-supporters { list-style:none; padding:0; margin:13px 0 0; }
.ios-supporters li { display:flex; align-items:center; justify-content:space-between; padding:13px 5px; gap:14px; border-bottom:1px solid var(--xs-rule); font-size:13px; }
.ios-supporters strong { font-variant-numeric:tabular-nums; }
.ios-support-footer { display:grid; grid-template-columns:230px minmax(0,1fr); gap:25px; padding-top:25px; align-items:start; }
.ios-support-action .xs-button { width:100%; }
.ios-support-action p { color:var(--xs-muted); font-size:11px; line-height:1.7; margin-top:10px; }
.ios-support-policy { display:grid; gap:12px; }
.ios-support-policy>div { display:flex; align-items:flex-start; gap:10px; color:var(--xs-muted); }
.ios-support-policy>div svg { flex:none; margin-top:2px; }
.ios-support-policy p { font-size:11px; line-height:1.8; }
@media (max-width:680px) {
  .ios-support { padding:23px 20px; margin-top:18px; }
  .ios-support-header { grid-template-columns:1fr; gap:17px; }
  .ios-support-target { padding:15px 16px; }
  .ios-support-target strong { font-size:24px; }
  .ios-stat { padding:16px 14px; }
  .ios-stat strong { font-size:22px; }
  .ios-support-footer { grid-template-columns:1fr; gap:20px; }
  .ios-support-action .xs-button { width:100%; }
}
@media (max-width:360px) { .ios-support-stats { grid-template-columns:1fr; } }
@media (prefers-reduced-motion:reduce) { .ios-progress-fill { transition:none; } .ios-spinning { animation:none; } }
</style>
