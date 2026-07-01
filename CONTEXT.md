# InfluxDB 1.x GUI

一个面向 InfluxDB 1.x 的现代化桌面 GUI 客户端，交互形态参考 DataGrip，但只保留浏览与查询这类"日常读写"能力，不做迁移、结构演进等高级功能。

## Language

**Connection**:
一份用户配置的 InfluxDB 服务器接入信息（URL、认证、默认 DB），是所有操作的入口。
_Avoid_: Server, Host, DataSource

**Database**:
InfluxDB 1.x 的一级容器，内含 Measurement、RetentionPolicy、ContinuousQuery 等。
_Avoid_: Schema, Bucket（Bucket 是 2.x 的术语）

**Measurement**:
类似关系型数据库的表，是 Series 的集合。
_Avoid_: Table, Collection

**RetentionPolicy (RP)**:
数据库中定义数据留存时长与副本数的策略。
_Avoid_: TTL policy

**Series**:
由 Measurement + Tag 集合唯一确定的一条时间序列。
_Avoid_: Stream

**Tag / Field**:
Tag 是被索引的字符串键值对；Field 是不被索引的实际数值。二者不可混用。
_Avoid_: Column（Column 会让人以为是关系型语义）

**InfluxQL**:
本项目支持的唯一查询语言（1.x 原生）。不支持 Flux。
_Avoid_: Query language（要明确说 InfluxQL）

**QueryTab**:
编辑器中的一个查询标签页，绑定一个 Connection + 可选 Database。
_Avoid_: Editor, Worksheet

**ServerCapabilities**:
连接建立时探测出的目标 InfluxDB 版本及其支持的可选能力（如"服务端取消查询"、"Token 认证"）。UI 依据它启用/置灰功能，绝不假设能力存在。
_Avoid_: Features, Flags

**ExecutionScope**:
一次执行请求的目标语句集，按优先级判定为：选区非空 → 选区内所有语句；否则 → 光标所在单条语句；显式"运行全部"→ 当前 QueryTab 全部语句。
_Avoid_: Selection, Statement

**ErrorLog**:
本进程内保留的历史错误记录（查询失败、连接失败），可在错误历史面板回看，不上报网络。
_Avoid_: Log, Console
