import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/pleasejot/'
const output = 'pleasejot-visual-review'
mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ headless: true })
const failures = []
try {
  for (const variant of [
    { label: 'desktop-light', width: 1440, height: 900, scheme: 'light', mobile: false },
    { label: 'desktop-dark', width: 1440, height: 900, scheme: 'dark', mobile: false },
    { label: 'mobile-light', width: 390, height: 844, scheme: 'light', mobile: true },
    { label: 'mobile-dark', width: 390, height: 844, scheme: 'dark', mobile: true }
  ]) {
    const context = await browser.newContext({
      viewport: { width: variant.width, height: variant.height },
      deviceScaleFactor: 1,
      isMobile: variant.mobile,
      hasTouch: variant.mobile,
      colorScheme: variant.scheme,
      reducedMotion: 'reduce'
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const response = await page.goto(new URL('feedback/', origin).href, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    })
    const state = await page.evaluate(() => ({
      heading: document.querySelector('.feedback-intro h1')?.textContent?.trim(),
      navLink: [...document.querySelectorAll('a')].some(a => a.textContent?.trim() === '用户反馈' && a.getAttribute('href')?.includes('/feedback/')),
      placeholder: !!document.querySelector('.feedback-empty'),
      iframeCount: document.querySelectorAll('.feedback-frame iframe').length,
      iframeSrc: document.querySelector('.feedback-frame iframe')?.getAttribute('src') || '',
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    }))
    if (!response?.ok()) failures.push(variant.label + ': HTTP status ' + response?.status())
    if (state.heading !== '用户反馈' || (!variant.mobile && !state.navLink)) failures.push(variant.label + ': feedback route or navigation missing')
    // An empty URL must show the placeholder; a real URL must show exactly one iframe.
    if (state.placeholder === (state.iframeCount > 0) || state.iframeCount > 1)
      failures.push(variant.label + ': feedback iframe/placeholder state is incorrect')
    if (state.iframeCount === 1 && !/^https:\/\/(?:[a-z0-9-]+\.)*(?:wj\.qq\.com|wesurvey\.com)\//i.test(state.iframeSrc))
      failures.push(variant.label + ': unexpected iframe URL')
    if (state.overflow > 2) failures.push(variant.label + ': horizontal overflow ' + state.overflow)
    if (errors.length) failures.push(variant.label + ': runtime errors ' + errors.join(' | '))
    await page.screenshot({ path: path.join(output, 'feedback-' + variant.label + '.png'), fullPage: true, animations: 'disabled' })
    console.log(JSON.stringify({ test: 'feedback-' + variant.label, ...state, errors }))
    await context.close()
  }
} finally {
  await browser.close()
}
if (failures.length) {
  console.error('Feedback regression failures:\n' + failures.join('\n'))
  process.exitCode = 1
}
