# 使用 Tauri 而非 Electron 作为桌面壳

用户明确要求"桌面端、内存占用低、操作流畅"。Tauri 的二进制体积约 10MB、运行时内存显著低于 Electron，且自带 Rust 后端可直接做 HTTP 代理绕开浏览器直连 InfluxDB 的 CORS 限制。代价是需要少量 Rust，但代理逻辑很薄，可接受。

## Considered Options

- **Electron**：生态最成熟，但 100MB+ 体积与高内存占用与"低内存、流畅"的诉求直接冲突。
- **纯 Web**：无桌面，但浏览器直连 InfluxDB 有 CORS 问题，需要额外后端，等同变成全栈。
