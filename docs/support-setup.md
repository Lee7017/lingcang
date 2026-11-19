# iOS 开发支持：手动更新公开统计

## 新的数据位置与更新方式

- **官网仓库**：`Lee7017/pleasejot`，公开数据位于仓库根目录的 `support/ios.json`。
- **OTA 仓库**：`Lee7017/pleasejot-ota`，不再承担赞助数据查询与发布任务。
- 官网从 `https://raw.githubusercontent.com/Lee7017/pleasejot/main/support/ios.json` 读取统计，Raw 不可访问时回退到同仓库 GitHub Contents API。
- 官网“刷新”按钮只重新下载**已经发布的 JSON**；访客无法从网页直接查询爱发电，网页不持有任何 API 密钥。
- 只有管理员在官网仓库 Actions 中手动运行 `Manual iOS support sync` 才会查询真实订单并提交 JSON。
- 官网 Pages 的部署工作流通过 `paths-ignore: support/ios.json` 排除这个文件：**只修改这一个 JSON 时，既不构建也不部署官网**。因为网页是从仓库直接读取 JSON，所以仍能看到更新后的数据。GitHub Raw 可能有短暂 CDN 缓存。
- 本次迁移保留此前最后一次真实同步的时间；不会把搬迁文件的时间冒充为查询订单的时间。

## 首次启用真正的手动查询

爱发电的密钥之前存在 OTA 仓库的 Actions Secrets 中。**仓库间的 Secrets 不会自动转移**。必须由仓库管理员在 `Lee7017/pleasejot` 中重新设置，不能写进 JSON、前端代码或仓库文件：

1. 打开 [官网仓库的 Actions Secrets 设置](https://github.com/Lee7017/pleasejot/settings/secrets/actions)。
2. 添加 `AFDIAN_USER_ID`：爱发电 API 的 user_id。
3. 添加 `AFDIAN_API_TOKEN`：爱发电 API token。
4. `AFDIAN_PLAN_ID` 可选：只有使用不同 iOS 赞助方案时才需要；默认沿用已验证的方案 ID `d9aa8642e2b411f181af52540025c377`。
5. `AFDIAN_SUPPORT_URL` 可选：仓库 Actions Variables 中的公开 HTTPS 支持链接，默认使用当前爱发电支持页面。

完成配置后，打开 [官网仓库 → Actions → Manual iOS support sync](https://github.com/Lee7017/pleasejot/actions/workflows/ios-support-manual.yml)，选择 **Run workflow**，确认使用 `main` 分支后点击运行。

工作流先校验凭据和只读订单接口，再查询全部页面、按方案筛选成功订单、去重、计算金额与人数，最后**只提交** `support/ios.json`。每次真实查询成功都会更新 `syncedAt`，即使金额没有变化；查询失败不会发布新数据。缺少 Secrets 会直接失败，不能假装已经同步成功。

工作流完成后检查 [公开 JSON](https://raw.githubusercontent.com/Lee7017/pleasejot/main/support/ios.json) 的 `syncedAt`，再打开官网下载页点击“刷新”。**刷新按钮不会启动 GitHub Actions**，只是重新读取已经生成的数据。

## 数据与安全边界

- `support/ios.json` 是公开数据，只允许公布 `status`、`target`、`raised`、`supporterCount`、`syncedAt`、`supportUrl` 和经过本人明确授权的 `supporters` 名单。
- 不能保存手机号、身份证信息、订单号、留言、爱发电私有 ID、原始 API 响应或任何密钥。
- 支持者昵称及对应金额未经当事人明确授权不得公开；已有代码默认保留明确授权的名单，而不会直接把原始订单姓名写进 JSON。
- 目前只统计指定方案、`status === 2` 的订单及其 `total_amount`，退款状态的全面处理仍需要真实订单验证。
- 查询失败时保留上一次的有效数据及真实同步时间，不伪造“最新同步”。
- OTA 仓库旧定时同步、watchdog 和外部 cron 方案均已停用/移除；后续不会因为时间经过而自动刷新公开统计。
