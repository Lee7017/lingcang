<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Send, Copy, Check } from 'lucide-vue-next'

const recipientPhone = '13231226535'
const applicationTitle = '灵仓内测邀请码申请'
const applicantPhone = ref('')
const nickname = ref('')
const explanation = ref('')
const isAppleMobile = ref(false)
const copied = ref('')
const copyNotice = ref('')

onMounted(() => {
  const agent = navigator.userAgent
  isAppleMobile.value = /iPad|iPhone|iPod/i.test(agent)
    || (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1)
})

const messageText = computed(() => {
  const content = [
    applicationTitle,
    `手机号：${applicantPhone.value.trim() || '请填写手机号'}`,
    `昵称：${nickname.value.trim() || '请填写昵称'}`
  ]
  if (explanation.value.trim()) content.push(`说明：${explanation.value.trim()}`)
  return content.join('\n')
})

const isReady = computed(() =>
  /^1[3-9]\d{9}$/.test(applicantPhone.value.trim())
  && nickname.value.trim().length > 0
)

const smsHref = computed(() =>
  isAppleMobile.value
    ? `sms:${recipientPhone}`
    : `sms:${recipientPhone}?body=${encodeURIComponent(messageText.value)}`
)

function onInput() {
  copied.value = ''
  copyNotice.value = ''
}

async function copyText(key: string, value: string) {
  try {
    await navigator.clipboard.writeText(value)
    copied.value = key
    copyNotice.value = '已复制，可以粘贴到短信应用中。'
  } catch {
    copied.value = ''
    copyNotice.value = '无法自动复制，请选中文字后手动复制。'
  }
}

function onSmsClick(event: MouseEvent) {
  if (!isReady.value) {
    event.preventDefault()
    copyNotice.value = '请先填写有效的 11 位手机号和昵称。'
    return
  }
  copyNotice.value = isAppleMobile.value
    ? '请将复制的短信内容粘贴到短信应用中，检查后由你自己发送。'
    : '请在短信应用中核对收件人和内容后发送。'
}
</script>

<template>
  <main class="page-design invite-page section-width">
    <div class="page-intro">
      <h1>申请灵仓内测邀请码</h1>
    </div>

    <section class="invite-panel" aria-labelledby="invite-instructions-title">
      <div class="invite-panel-heading">
        <div>
          <h2 id="invite-instructions-title">通过短信申请</h2>
          <p>短信由你本人确认发送，官网不会代发短信或收集申请表单。</p>
        </div>
      </div>

      <div class="invite-copy-section">
        <div class="invite-copy-heading"><strong>短信收件号码</strong><span>发往灵仓</span></div>
        <div class="invite-copy-row">
          <span class="invite-copy-value">{{ recipientPhone }}</span>
        </div>
      </div>

      <div class="invite-copy-section">
        <div class="invite-copy-heading">
          <strong>申请信息</strong>
          <span>手机号、昵称必填；说明可不填</span>
        </div>
        <div class="invite-fields">
          <label class="invite-field" for="invite-phone">
            <span>手机号 <em>必填</em></span>
            <input id="invite-phone" v-model="applicantPhone" type="tel" inputmode="numeric"
              maxlength="11" autocomplete="tel-national" placeholder="请输入 11 位手机号" @input="onInput" />
          </label>
          <label class="invite-field" for="invite-nickname">
            <span>昵称 <em>必填</em></span>
            <input id="invite-nickname" v-model="nickname" type="text" maxlength="32"
              autocomplete="nickname" placeholder="请输入昵称" @input="onInput" />
          </label>
          <label class="invite-field invite-field-full" for="invite-explanation">
            <span>可选说明</span>
            <textarea id="invite-explanation" v-model="explanation" rows="3" maxlength="200"
              placeholder="例如：想体验哪项功能（可不填）" @input="onInput"></textarea>
          </label>
        </div>
      </div>

      <div class="invite-copy-section">
        <div class="invite-sms-actions">
          <button class="xs-button secondary" type="button" @click="copyText('message', messageText)">
            <Check v-if="copied === 'message'" :size="16" /><Copy v-else :size="16" />
            {{ copied === 'message' ? '已复制内容' : '复制短信内容' }}
          </button>
          <a class="xs-button primary" :class="{ disabled: !isReady }"
            :href="isReady ? smsHref : undefined" :aria-disabled="!isReady"
            @click="onSmsClick">
            <Send :size="16" />打开短信应用
          </a>
        </div>
        <p class="invite-hint" v-if="isAppleMobile">iPhone / iPad：请先点击「复制短信内容」，打开短信应用后粘贴并发送。</p>
      </div>

      <p class="invite-copy-notice" role="status" aria-live="polite">{{ copyNotice }}</p>
    </section>
  </main>
</template>
