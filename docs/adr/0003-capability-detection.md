# 按服务器能力探测启用功能，而非按用户声明版本号

InfluxDB 1.x 从 1.0 到 1.11 跨度大：1.8 才有 Token 认证，服务端取消查询能力在不同小版本行为也不同。GUI 不让用户在连接表单里填"版本号"，而是在连接建立时探测（读 `/ping` 头 `X-Influxdb-Version`、试探性 API），得到 `ServerCapabilities`，据此启用/置灰"取消查询"、"Token 登录"等 UI。

## Consequences

- 每个新连接首次使用时多一次探测请求。
- 用户不用理解能力矩阵，功能不可用时按钮直接置灰并 tooltip 说明所需版本。
- 未来接入 InfluxDB 新小版本，只需扩展探测逻辑，不用改 UI 流程。
