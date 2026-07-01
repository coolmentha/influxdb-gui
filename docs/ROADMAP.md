# InfluxDB 1.x GUI Roadmap

面向 InfluxDB 1.x 的桌面 GUI，参考 DataGrip 的日常使用体验，去掉迁移/结构演进等高级功能。

术语见 [CONTEXT.md](../CONTEXT.md)。架构决策见 [docs/adr/](./adr/)。

## 技术栈

- **壳**: Tauri 2（Rust 后端做 HTTP 代理 & keyring）
- **前端**: React + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **网格**: TanStack Table
- **编辑器**: CodeMirror 6（自定义 InfluxQL 语法）
- **凭据存储**: OS keyring（Windows Credential Manager / macOS Keychain / Linux Secret Service）

## v1 — 只读浏览与查询（MVP）

范围锁定为"我要看数据、我要写查询"，不涉及任何写入。

- [ ] Connection 管理：新建/编辑/删除/连接测试；支持无认证、Basic Auth、Token（Token 按 `ServerCapabilities` 启用）
- [ ] TLS：默认校验，连接表单可勾"跳过 TLS 校验"
- [ ] 凭据存入 OS keyring
- [ ] 对象树：Databases → Measurements / RetentionPolicies / Tag Keys / Field Keys（懒加载）
- [ ] QueryTab 多标签编辑器
  - InfluxQL 语法高亮
  - 基于 SHOW 元数据缓存的自动补全（measurement / tag key / field key / 关键字）
  - 执行范围：选区 > 光标所在语句 > "运行全部"（Ctrl+Enter / Ctrl+Shift+Enter）
- [ ] 结果网格
  - 每个 SELECT 一个结果集子 Tab
  - 列排序、单元格复制
  - 结果内 Ctrl+F 搜索
  - time 列默认本地时区，工具栏可切 UTC / 原始纳秒
  - 导出当前结果集为 CSV / JSON
- [ ] 大结果集：默认自动追加 `LIMIT 1000`、硬上限 100k 行（见 ADR-0002），顶栏可调
- [ ] 查询取消：按 `ServerCapabilities` 支持则调用服务端取消；不支持则仅前端 abort 并给出置灰提示
- [ ] 错误：状态栏 + 全局"错误历史"面板
- [ ] 主题：跟随系统 + 手动切换

## v2 — 可写与效率增强

- [ ] Line Protocol 写入面板 + `INSERT` 语句执行（写操作前二次确认）
- [ ] `DROP SERIES` / `DELETE`（危险操作显式确认）
- [ ] 查询历史（持久化 + 搜索 + 重开）
- [ ] 基础可视化：单 series 自动折线图（结果集子 Tab 里）
- [ ] 结果分页 fetch（LIMIT/OFFSET 分页导航）
- [ ] 收藏查询 / 命名查询

## v3 — 管理面

- [ ] RetentionPolicy CRUD
- [ ] ContinuousQuery CRUD
- [ ] User & Privilege 管理
- [ ] SHOW STATS / SHOW DIAGNOSTICS 面板
- [ ] 更完善的可视化（多 series、简单聚合视图）

## 明确不做

- Schema 迁移 / 结构演进工具
- 从 1.x 到 2.x/3.x 的自动迁移
- Flux 语言支持（只做 InfluxQL）
- 通用告警/监控面板（用 Grafana）
- 数据同步/双写
