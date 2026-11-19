<script setup lang="ts">
import { Clock3, MessageSquareText, ShieldCheck } from 'lucide-vue-next'
import { tencentQuestionnaireEmbedSrc } from '../data/feedback'

// 仅接受腾讯问卷官方 HTTPS 域名，防止误贴其他网站或不安全的链接。
const embedSrc = (() => {
  const input = tencentQuestionnaireEmbedSrc.trim()
  if (!input) return ''
  try {
    const url = new URL(input)
    const host = url.hostname.toLowerCase()
    const isTencentQuestionnaire =
      host === 'wj.qq.com' || host.endsWith('.wj.qq.com') ||
      host === 'wesurvey.com' || host.endsWith('.wesurvey.com')
    return url.protocol === 'https:' && isTencentQuestionnaire ? url.href : ''
  } catch {
    return ''
  }
})()
</script>

<template>
  <main class="page-design section-width feedback-page">
    <header class="feedback-intro">
      <span class="feedback-eyebrow"><MessageSquareText :size="15" /> 帮助我们把 PleaseJot 做得更好</span>
      <h1>用户反馈</h1>
      <p>遇到问题、发现 Bug，或是有想要的功能？欢迎告诉我们。</p>
    </header>

    <section class="feedback-panel" aria-label="用户反馈问卷">
      <div class="feedback-panel-head">
        <div>
          <h2>意见与建议</h2>
          <p>填写后将直接提交至腾讯问卷。</p>
        </div>
      </div>

      <div v-if="embedSrc" class="feedback-frame">
        <iframe
          :src="embedSrc"
          title="PleaseJot 用户反馈问卷（腾讯问卷）"
          loading="lazy"
          scrolling="no"
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      </div>
      <div v-else class="feedback-empty" role="status">
        <Clock3 :size="29" :stroke-width="1.7" aria-hidden="true" />
        <h2>反馈问卷尚未开放</h2>
        <p>我们正在配置腾讯问卷。完成后你就可以在这里直接提交反馈。</p>
      </div>
    </section>

    <p class="feedback-privacy">
      <ShieldCheck :size="16" aria-hidden="true" />
      <span>问卷启用后，提交的内容将由腾讯问卷接收和保存。请勿填写密码、验证码等敏感信息。</span>
    </p>
  </main>
</template>

<style scoped>
.feedback-page {
  padding: 48px 28px 76px;
  max-width: 1040px;
}
.feedback-intro {
  margin: 0 auto 28px;
  text-align: center;
}
.feedback-eyebrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--xs-muted);
  font-size: 12px;
  font-weight: 650;
  letter-spacing: .01em;
}
.feedback-intro h1 {
  margin: 14px 0 10px;
  color: var(--xs-ink);
  font-size: clamp(29px, 3.6vw, 41px);
  font-weight: 780;
  letter-spacing: -.055em;
  line-height: 1.25;
}
.feedback-intro > p {
  color: var(--xs-muted);
  font-size: 14px;
  line-height: 1.8;
}
.feedback-panel {
  overflow: hidden;
  border: 1px solid var(--xs-border);
  border-radius: 22px;
  background: var(--xs-frost-strong);
  box-shadow: var(--xs-shadow), inset 0 1px var(--xs-glow);
  -webkit-backdrop-filter: blur(20px) saturate(130%);
  backdrop-filter: blur(20px) saturate(130%);
}
.feedback-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 21px 24px;
  border-bottom: 1px solid var(--xs-rule);
}
.feedback-panel-head h2 {
  margin: 0 0 5px;
  font-size: 17px;
  line-height: 1.4;
  font-weight: 720;
  color: var(--xs-ink);
}
.feedback-panel-head p {
  margin: 0;
  color: var(--xs-muted);
  font-size: 12px;
  line-height: 1.7;
}
.feedback-frame {
  padding: 14px;
  background: var(--xs-soft);
}
.feedback-frame iframe {
  display: block;
  width: 100%;
  /* 腾讯问卷为跨域内容，无法直接读取其内部高度。
     预留足够的完整答题空间，让用户主要滚动官网页面。 */
  height: 2100px;
  overflow: hidden;
  border: 0;
  border-radius: 12px;
  background: #fff;
  color-scheme: light;
}
.feedback-empty {
  min-height: 350px;
  padding: 64px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 13px;
  color: var(--xs-muted);
}
.feedback-empty h2 {
  margin: 3px 0 0;
  font-size: 18px;
  font-weight: 710;
  color: var(--xs-ink);
}
.feedback-empty p {
  margin: 0;
  max-width: 350px;
  font-size: 13px;
  line-height: 1.8;
}
.feedback-privacy {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 8px;
  margin: 17px 0 0;
  color: var(--xs-muted);
  font-size: 11px;
  line-height: 1.8;
}
.feedback-privacy svg { flex: none; margin-top: 1px; }
@media (max-width: 680px) {
  .feedback-page { padding: 29px 16px 54px; }
  .feedback-intro { margin-bottom: 21px; }
  .feedback-intro h1 { font-size: 28px; }
  .feedback-intro > p { font-size: 12px; }
  .feedback-panel { border-radius: 16px; }
  .feedback-panel-head { padding: 16px; gap: 12px; }
  .feedback-panel-head h2 { font-size: 15px; }
  .feedback-frame { padding: 8px; }
  .feedback-frame iframe {
    height: 2600px;
    border-radius: 9px;
  }
  .feedback-empty { min-height: 320px; padding: 48px 18px; }
  .feedback-empty h2 { font-size: 16px; }
  .feedback-privacy { justify-content: flex-start; font-size: 11px; }
}
@media (max-width: 375px) {
  .feedback-frame iframe { height: 2900px; }
}
</style>
