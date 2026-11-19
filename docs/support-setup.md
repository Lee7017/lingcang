# iOS 开发支持：OTA 定时同步统计

## 仓库分工

- **`Lee7017/pleasejot-ota`**：持有爱发电 API 的 GitHub Actions Secrets，定时查询爱发电并提交公开 `support/ios.json`。
- **`Lee7017/pleasejot`**：官网静态页面，仅从 OTA 仓库读取已发布的公开 JSON，不查询爱发电、不持有 API 密钥，也不因 OTA 数据更新重新构建。
- 官网数据源：`https://raw.githubusercontent.com/Lee7017/pleasejot-ota/main/support/ios.json`；GitHub Raw 不可访问时回退到同仓库的 GitHub Contents API。

## 自动同步规则

GitHub Actions 的 `schedule` 最短支持每 5 分钟运行一次。OTA 工作流配置为 `3-59/5 * * * *`（UTC 每小时的 03、08、…、58 分），每次任务实际执行时都会查询爱发电订单。

- 金额、人数、配置发生变化：真实查询成功后即可提交新 JSON。
- 数据不变：距离上次成功发布未满 1 小时则不重复提交；达到 1 小时后更新真实 `syncedAt`。
- GitHub 的 `schedule` 有可能延迟或漏跑，即使设置 5 分钟也不保证 5 分钟内执行。因此官网保留「**每隔数小时更新**」说明，并显示 JSON 里的真实最近同步时间。
- 无需访客主动刷新或管理员每天运行，页面首次加载时自动读取公开数据。没有后台服务、没有面向访客的 GitHub Token。
- 查询失败则保留最后成功公开的数据和时间，不伪造为最新数据。

实际运行记录：[OTA Sync iOS support statistics](https://github.com/Lee7017/pleasejot-ota/actions/workflows/ios-support.yml)。如时间长期不动，应检查 `schedule` 事件是否实际触发，而不仅是工作流手动执行是否成功。

## 密钥与数据保护

所有爱发电 API 凭据都在 OTA 仓库的 [Actions Secrets](https://github.com/Lee7017/pleasejot-ota/settings/secrets/actions)，绝不可放入官网脚本或公开 JSON。

- `AFDIAN_USER_ID`、`AFDIAN_API_TOKEN`：调用爱发电所需。
- `AFDIAN_PLAN_ID`：可选，默认已采用的 iOS 开发支持方案 ID。
- `AFDIAN_SUPPORT_URL`：可选公开地址（Actions Variables）。

公开 JSON 仅存储 `status`、`target`、`raised`、`supporterCount`、`syncedAt`、`supportUrl`、经过明确授权公开的 `supporters`；不得存订单号、手机号、留言、私有用户 ID、API 密钥或原始订单数据。

当前脚本仅按指定方案、付款状态为 2 的订单统计，退款规则仍需要根据真实订单进一步核验。
