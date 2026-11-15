import type { Theme } from 'vitepress'
import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import HomeLanding from './components/HomeLanding.vue'
import DownloadCards from './components/DownloadCards.vue'
import DemoNotice from './components/DemoNotice.vue'
import ScreenshotPage from './components/ScreenshotPage.vue'
import InviteRequest from './components/InviteRequest.vue'
import BackToTop from './components/BackToTop.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'layout-bottom': () => h(BackToTop)
  }),
  enhanceApp({ app }) {
    app.component('HomeLanding', HomeLanding)
    app.component('DownloadCards', DownloadCards)
    app.component('DemoNotice', DemoNotice)
    app.component('ScreenshotPage', ScreenshotPage)
    app.component('InviteRequest', InviteRequest)
  }
} satisfies Theme
