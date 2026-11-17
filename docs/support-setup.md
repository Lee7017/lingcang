# iOS 开发支持：统计数据设置

## 统计数据与官网彻底分离

- **`Lee7017/lingcang`**：只负责官网页面、展示 UI。更新网站代码才会重新构建和部署。
- **`Lee7017/lingcang-ota`**：负责 React 前端 OTA Releases，以及**独立的公开统计文件** `support/ios.json`。
- 官网从 `https://raw.githubusercontent.com/Lee7017/lingcang-ota/main/support/ios.json` 读取统计。首次打开页面读取一次，用户点击「刷新进度」才重新请求。**不定时轮询。**
- 爱发电订单变化时，OTA 仓库中的 GitHub Actions 仅提交 `support/ios.json`；**不构建、不部署官网**。
- 该链接由 GitHub Raw CDN 提供，可能有几分钟缓存，手动刷新不保证立即显示刚刚提交的金额；页面必须显示真实的最后公开同步时间。

## 开通爱发电

1. 在爱发电创建专门用于 iOS 开发支持的方案，取得它的 `plan_id`，避免混入其他订单。爱发电提供订单查询 API，具体字段和退款状况需用真实账号核验。
2. 在 **`Lee7017/lingcang-ota` 仓库**的 Settings → Secrets and variables → Actions → **Secrets** 添加：
   - `AFDIAN_USER_ID`：爱发电 API user_id。
   - `AFDIAN_API_TOKEN`：爱发电 API token。
   - `AFDIAN_PLAN_ID`：仅统计此 iOS 开发支持方案的订单 ID。
3. 在同一仓库的 **Variables** 添加 `AFDIAN_SUPPORT_URL`：真实的爱发电 HTTPS 主页或方案链接。
4. 首次使用时，在 OTA 仓库 Actions 页面手动执行 `Sync iOS support statistics`，核对统计结果、订单去重、退款处理和日志隐私。通过后按每五分钟的定时任务尝试同步。

**尚未配置密钥时**：公开数据保持 `unconfigured`，官网显示「尚未同步」和「支持入口准备中」，不会虚构支持金额、支持者或者付款入口。

## 安全边界

- API 密钥只进 OTA 仓库的 Actions Secrets，绝不进入任何前端、公开 JSON 或 Actions 日志。
- `support/ios.json` 为公开数据，不能包含手机号、真实姓名、订单号、订单留言、收件人信息、私有平台 ID 或原始 API 结果。
- 支持者昵称与金额未经本人明确同意不得公示，`supporters` 初始为空。
- 计算确认有效订单的实际付款额 `total_amount` 并去重；退款处理能力尚需使用真实数据验证。
- 金额或支持人数变化时提交 JSON；没有变化时不重复发布，最多约每小时更新一次同步时间。
- 任何订单接口失败都应保留最后一份有效的公开记录。

## 未在此阶段实现

手机号收集、手机号与订单绑定、未来账号余额、短信通知、支付回调、达标推送都没有开放。不得把它们标为已完成。
