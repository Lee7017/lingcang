import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/pleasejot/'
const output = 'pleasejot-visual-review'
mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ headless: true })
const failures = []

function inspect(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.feedback-frame iframe')
    const r = el?.getBoundingClientRect()
    return {
      heading: document.querySelector('.feedback-intro h1')?.textContent?.trim(),
      classEnabled: document.documentElement.classList.contains('feedback-immersive'),
      iframeCount: document.querySelectorAll('.feedback-frame iframe').length,
      newWindowLinkCount: document.querySelectorAll('.feedback-panel a[target="_blank"]').length,
      iframeScrolling: el?.getAttribute('scrolling'),
      iframeLoading: el?.getAttribute('loading'),
      iframeSrc: el?.getAttribute('src'),
      iframeRect: r ? { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom } : null,
      parentScrollY: window.scrollY,
      parentScrollHeight: document.documentElement.scrollHeight,
      outerOverflow: getComputedStyle(document.documentElement).overflowY,
      footerDisplay: getComputedStyle(document.querySelector('.VPFooter')).display,
      navBottom: document.querySelector('.VPNav')?.getBoundingClientRect().bottom ?? null,
      overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      viewport: { width: innerWidth, height: innerHeight }
    }
  })
}

// The mock is deliberately separate from Tencent's real site. It verifies
// that short/long conditional questionnaires scroll inside the iframe,
// while the site's outer document stays fixed.
const mockedTencent = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:white;font:16px/1.6 system-ui,-apple-system,sans-serif;color:#17191d">
<main style="padding:24px 18px 36px;box-sizing:border-box;max-width:640px;margin:auto">
<h1 style="font-size:21px;margin:0 0 8px">PleaseJot 用户反馈（测试数据）</h1>
<p style="color:#68707a;font-size:12px;margin-bottom:28px">仅供 Playwright 测试滚动和布局，不是腾讯真实问卷。</p>
<fieldset style="border:0;padding:0;margin:0 0 20px">
<legend style="font-weight:600">1. 反馈类型</legend>
<label style="display:block;padding:12px 0"><input type="radio" name="type" value="bug" checked> BUG / 问题反馈</label>
<label style="display:block;padding:12px 0"><input type="radio" name="type" value="feature"> 新功能或优化建议</label>
</fieldset>
<label style="display:block;margin-bottom:20px">2. 反馈标题<input style="box-sizing:border-box;display:block;width:100%;height:44px;border:1px solid #d1d5db;border-radius:9px;margin-top:9px"></label>
<label style="display:block;margin-bottom:20px">3. 详细描述<textarea style="box-sizing:border-box;display:block;width:100%;height:110px;border:1px solid #d1d5db;border-radius:9px;margin-top:9px"></textarea></label>
<section id="bug-fields">
${Array.from({length:8},(_,i)=>`<label style="display:block;margin-bottom:24px">BUG 信息 ${i+1}<input style="box-sizing:border-box;display:block;width:100%;height:45px;margin-top:8px;border:1px solid #d1d5db;border-radius:9px"></label>`).join('')}
</section>
<button id="submit" type="button" style="border:0;border-radius:10px;padding:13px 24px;background:#17191d;color:white;width:100%">提交反馈</button>
</main>
<script>
document.querySelectorAll('input[name="type"]').forEach(radio=>radio.addEventListener('change',()=>{
  document.getElementById('bug-fields').hidden = document.querySelector('input[name="type"]:checked').value !== 'bug';
  window.scrollTo(0,0);
}));
</script>
</body></html>`;

const variants = [
  { label: 'desktop-light', width: 1440, height: 900, scheme: 'light', mobile: false },
  { label: 'desktop-dark', width: 1440, height: 900, scheme: 'dark', mobile: false },
  { label: 'phone-390-light', width: 390, height: 844, scheme: 'light', mobile: true },
  { label: 'phone-390-dark', width: 390, height: 844, scheme: 'dark', mobile: true },
  { label: 'phone-320', width: 320, height: 640, scheme: 'light', mobile: true },
  { label: 'phone-430', width: 430, height: 932, scheme: 'light', mobile: true },
  { label: 'phone-landscape', width: 844, height: 390, scheme: 'light', mobile: true }
]

try {
  for (const v of variants) {
    const context = await browser.newContext({
      viewport: { width: v.width, height: v.height },
      deviceScaleFactor: 1,
      isMobile: v.mobile,
      hasTouch: v.mobile,
      colorScheme: v.scheme,
      reducedMotion: 'reduce'
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('https://wj.qq.com/s2/28745883/6dyd/**', route =>
      route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: mockedTencent })
    )
    const response = await page.goto(new URL('feedback/', origin).href, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.locator('.feedback-frame iframe').waitFor()
    await page.waitForFunction(() => document.documentElement.classList.contains('feedback-immersive'))
    const state = await inspect(page)
    const prefix = v.label
    if (!response?.ok()) failures.push(prefix + ': HTTP ' + response?.status())
    if (state.heading !== '用户反馈') failures.push(prefix + ': feedback page title missing')
    if (state.iframeCount !== 1 || state.newWindowLinkCount !== 0) failures.push(prefix + ': iframe or external link wrong')
    if (state.iframeScrolling !== 'auto' || state.iframeLoading !== 'eager') failures.push(prefix + ': iframe scroll policy wrong')
    if (!state.iframeSrc?.startsWith('https://wj.qq.com/s2/28745883/6dyd/')) failures.push(prefix + ': iframe source missing')
    if (state.overflowX > 2) failures.push(prefix + ': horizontal overflow ' + state.overflowX)
    if (errors.length) failures.push(prefix + ': JavaScript errors ' + errors.join(' | '))

    if (v.mobile) {
      if (state.outerOverflow !== 'hidden') failures.push(prefix + ': outer page not locked')
      if (state.footerDisplay !== 'none') failures.push(prefix + ': footer still visible')
      if (!state.iframeRect || state.iframeRect.height < v.height * .50 || state.iframeRect.height >= 2900)
        failures.push(prefix + ': iframe not viewport-height ' + JSON.stringify(state.iframeRect))
      if (!state.iframeRect || Math.abs(state.iframeRect.bottom - v.height) > 3)
        failures.push(prefix + ': iframe bottom does not match screen ' + JSON.stringify(state.iframeRect))
      if (state.navBottom !== null && state.iframeRect && state.iframeRect.y - state.navBottom > 55)
        failures.push(prefix + ': too much spacing above iframe ' + JSON.stringify(state.iframeRect))

      const frame = page.frameLocator('iframe[title="PleaseJot 用户反馈问卷（腾讯问卷）"]')
      await frame.locator('#submit').waitFor()
      const beforeScroll = await frame.locator('body').evaluate(el => ({ height: el.scrollHeight, viewport: innerHeight }))
      if (beforeScroll.height <= beforeScroll.viewport + 100) failures.push(prefix + ': mock questionnaire unexpectedly short')

      await frame.locator('body').evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await page.waitForTimeout(80)
      const longScroll = await frame.locator('body').evaluate(() => window.scrollY)
      const parentLong = await page.evaluate(() => window.scrollY)
      if (longScroll < 80) failures.push(prefix + ': long questionnaire cannot scroll internally')
      if (parentLong !== 0) failures.push(prefix + ': outer page scrolls while filling BUG')
      if (v.width === 390) await page.screenshot({ path: path.join(output, 'feedback-' + prefix + '-bug-mock.png'), fullPage: false, animations: 'disabled' })

      await frame.locator('input[value="feature"]').check()
      await page.waitForTimeout(80)
      const parentShort = await page.evaluate(() => window.scrollY)
      if (parentShort !== 0) failures.push(prefix + ': outer page scrolls on feature branch')
      await frame.locator('#submit').scrollIntoViewIfNeeded()
      if (v.width === 390) await page.screenshot({ path: path.join(output, 'feedback-' + prefix + '-feature-mock.png'), fullPage: false, animations: 'disabled' })

      await page.evaluate(() => window.scrollTo(0, 500))
      await page.waitForTimeout(80)
      if (await page.evaluate(() => window.scrollY) !== 0)
        failures.push(prefix + ': outer page permits explicit scroll')

      // Confirm the global scroll lock is removed on client-side navigation.
      if (v.width === 390 && v.scheme === 'light') {
        await page.locator('.VPNavBarTitle a').first().click()
        await page.waitForURL(url => !url.pathname.includes('/feedback/'), { timeout: 10000 })
        if (await page.evaluate(() => document.documentElement.classList.contains('feedback-immersive')))
          failures.push(prefix + ': scroll lock leaked after leaving feedback')
      }
    } else {
      if (state.iframeRect?.height > 1000) failures.push(prefix + ': desktop iframe is still oversized')
      await page.screenshot({ path: path.join(output, 'feedback-' + prefix + '-mock.png'), fullPage: false, animations: 'disabled' })
    }

    console.log(JSON.stringify({ test: 'feedback-' + prefix, ...state, errors }))
    await context.close()
  }
} finally {
  await browser.close()
}
if (failures.length) {
  console.error('FEEDBACK_REGRESSION_FAILURES ' + JSON.stringify(failures))
  process.exitCode = 1
}
