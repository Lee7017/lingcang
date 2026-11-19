// Chromium / Playwright regression checks for page-to-page navigation and responsive layouts.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/pleasejot/'
const output = 'pleasejot-visual-review/layout'
mkdirSync(output, { recursive: true })

const routes = [
  { title: '首页', path: '', slug: 'home' },
  { title: '下载', path: 'download/', slug: 'download' },
  { title: '使用文档', path: 'guide/', slug: 'guide' },
  { title: '在线体验', path: 'demo/', slug: 'demo' },
  { title: '更新日志', path: 'changelog/', slug: 'changelog' },
  { title: '关于', path: 'about/', slug: 'about' }
]
const widths = [390, 768, 960, 1024, 1280, 1440, 1450, 1456, 1650, 1920]
const failures = []
const results = []
const browser = await chromium.launch({ headless: true })
try {
  for (const width of widths) {
    const mobile = width < 768
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      deviceScaleFactor: 1,
      isMobile: mobile,
      hasTouch: mobile
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const original = await page.goto(new URL(routes[0].path, origin).href, { waitUntil: 'networkidle', timeout: 45000 })
    if (!original?.ok()) failures.push(width + ': home HTTP ' + original?.status())
    let baseline = null
    for (const route of routes) {
      if (route.slug !== 'home') {
        const target = new URL(route.path, origin)
        if (mobile) {
          await page.goto(target.href, { waitUntil: 'networkidle', timeout: 45000 })
        } else {
          const link = page.locator('.VPNavBarMenuLink').filter({ hasText: route.title }).first()
          await link.click()
          await page.waitForURL(url => url.pathname === target.pathname, { timeout: 10000 })
          await page.waitForTimeout(220)
        }
      }
      await page.evaluate(() => document.fonts.ready)
      const measure = await page.evaluate(() => {
        const rect = el => {
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10,
            width: Math.round(r.width * 10) / 10, right: Math.round(r.right * 10) / 10 }
        }
        return {
          horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
          scrollbarGutter: getComputedStyle(document.documentElement).scrollbarGutter,
          hasSidebar: !!document.querySelector('.VPNavBar.has-sidebar'),
          nav: [...document.querySelectorAll('.VPNavBarMenuLink')].map(el => ({
            label: el.textContent?.trim(), ...rect(el), weight: getComputedStyle(el).fontWeight
          })),
          logo: rect(document.querySelector('.VPNavBarTitle')),
          sidebar: rect(document.querySelector('.VPSidebar')),
          card: rect(document.querySelector('.VPDoc .content-container') || document.querySelector('.page-design')),
          aside: rect(document.querySelector('.VPDocAside')),
          h1: document.querySelector('h1')?.textContent?.trim()
        }
      })
      results.push({ viewport: width, page: route.slug, ...measure })
      if (measure.horizontalOverflow > 2) failures.push(width + '/' + route.slug + ': horizontal overflow ' + measure.horizontalOverflow)
      if (!measure.h1) failures.push(width + '/' + route.slug + ': missing H1')
      if (measure.card && (measure.card.x < -2 || measure.card.right > width + 2)) {
        failures.push(width + '/' + route.slug + ': content outside viewport ' + JSON.stringify(measure.card))
      }
      // 大屏必须有效利用横向空间，不能仅仅以「无横向滚动条」作为合格标准。
      if (width >= 1650 && route.slug === 'guide') {
        if (!measure.card || measure.card.width < 820) {
          failures.push(width + '/guide: document content still too narrow ' + JSON.stringify(measure.card))
        }
        if (!measure.sidebar || measure.sidebar.right > 350) {
          failures.push(width + '/guide: excessive left-side empty space ' + JSON.stringify(measure.sidebar))
        }
        if (!measure.aside || width - measure.aside.right > (width === 1650 ? 155 : 200)) {
          failures.push(width + '/guide: excessive right-side empty space ' + JSON.stringify(measure.aside))
        }
      }
      if (width >= 1650 && route.slug === 'about' && (!measure.card || measure.card.width < 820)) {
        failures.push(width + '/about: unsided document still too narrow ' + JSON.stringify(measure.card))
      }
      if (!mobile && measure.nav.length) {
        if (!baseline) baseline = measure.nav
        else for (let index = 0; index < baseline.length; index++) {
          const a = baseline[index], b = measure.nav[index]
          if (!b || a.label !== b.label || Math.abs(a.x - b.x) > 1.5 ||
              Math.abs(a.width - b.width) > 1.5) {
            failures.push(width + '/' + route.slug + ': navigation shifted at ' + a.label +
              ' baseline=' + JSON.stringify(a) + ' now=' + JSON.stringify(b))
          }
        }
        if (measure.nav.some(el => el.weight !== measure.nav[0].weight)) {
          failures.push(width + '/' + route.slug + ': nav weights differ: ' +
            measure.nav.map(el => el.label + '=' + el.weight).join(','))
        }
      }
      if ([390, 768, 1650, 1920].includes(width)) {
        await page.screenshot({
          path: path.join(output, width + '-' + route.slug + '.png'),
          fullPage: false, animations: 'disabled'
        })
      }
      if ((width === 1650 || width === 390) && route.slug === 'guide') {
        const jpeg = await page.screenshot({ type: 'jpeg', quality: 58, fullPage: false, animations: 'disabled' })
        const b64 = jpeg.toString('base64')
        console.log('LAYOUT_IMAGE_START:' + width)
        for (let i = 0; i < b64.length; i += 1600) console.log('LAYOUT_IMAGE_PART:' + b64.slice(i, i + 1600))
        console.log('LAYOUT_IMAGE_END:' + width)
      }
    }
    if (errors.length) failures.push(width + ': JS exceptions ' + errors.join(' | '))
    await context.close()
  }
} finally {
  await browser.close()
}
console.log('LAYOUT_RESULTS ' + JSON.stringify(results))
if (failures.length) {
  console.error('LAYOUT_FAILURES ' + JSON.stringify(failures))
  process.exitCode = 1
} else console.log('LAYOUT_REGRESSION_PASSED')
