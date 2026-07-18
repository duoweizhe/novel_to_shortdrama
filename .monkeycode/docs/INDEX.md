# 短剧脚本工坊项目文档

本文档集描述 `novel-to-drama-studio` 3.0.0 的当前实现，面向维护服务端、React 前端、生产工作流和交付流程的开发者。内容依据 `server.js`、`public/js/app.jsx`、`public/js/api.js`、`package.json`、`test/server.test.js` 与 `production-workflow` 规格整理。

## 快速链接

- [系统架构](./ARCHITECTURE.md)：运行结构、项目模型、revision 保存、稳定实体 ID、任务与资产、分析和交付数据流。
- [接口参考](./INTERFACES.md)：HTTP API、SSE 事件、并发冲突、认证、输入限制和导出格式。
- [开发者指南](./DEVELOPER_GUIDE.md)：环境搭建、运行、测试、安全配置、常见修改流程和验证清单。

## 系统能力

| 能力 | 当前实现 |
|------|----------|
| 项目持久化 | 每个项目保存为独立 JSON；临时文件写入完成后通过同目录重命名替换 |
| 并发编辑 | `revision` 与 `expectedRevision` 实现乐观并发控制；前端合并冲突状态后重试 |
| 稳定身份 | 角色、场景、分镜和漫画格在项目规范化时补齐稳定 ID |
| 来源追踪 | `sourceRevision`、`derivedFromRevision` 和 `stale` 表达上游变更与派生结果状态 |
| 生成任务 | `jobs` 保存生成目标、Provider 任务 ID、参数、进度、错误和来源版本 |
| 统一资产 | `assets` 保存实体关联、媒体类型、URL、Prompt、模型、参数和父资产 |
| 长文本分析 | 预处理按约 3000 字分段；结构化分析超过 12000 字时分块并合并结果 |
| 恢复能力 | 分析运行写入 `analysisRuns`；批量分析可跳过已完成模块并重试失败模块；视频任务可恢复轮询 |
| 连续性 | 关键帧使用前一镜头状态、关键帧及角色和场景参考；一致性检查输出结构化问题 |
| 生产交付 | 支持 JSON、Markdown、manifest、SRT、交付 JSON 和无压缩 ZIP 归档 |
| 安全边界 | 可选 API 访问令牌、昂贵请求并发限制、文本大小限制、Provider URL 校验和密钥掩码 |

## 阅读路径

1. 从 [系统架构](./ARCHITECTURE.md) 了解项目状态、持久化和生产数据流。
2. 使用 [接口参考](./INTERFACES.md) 调试前后端请求、SSE 事件和导出内容。
3. 按 [开发者指南](./DEVELOPER_GUIDE.md) 启动服务、配置环境并执行测试。

## 关键源文件

| 文件 | 职责 |
|------|------|
| `server.js` | Express 应用、文件存储、Provider 调用、分析、任务资产、导出和快照 |
| `public/js/app.jsx` | React SPA、项目编辑、保存队列、分析交互、媒体任务恢复和交付入口 |
| `public/js/api.js` | JSON 请求与 SSE 客户端封装 |
| `package.json` | Node.js 版本、依赖和运行脚本 |
| `test/server.test.js` | 生产工作流核心函数的 Node.js 单元测试 |
| `.monkeycode/specs/production-workflow/` | 生产工作流需求、设计和完成状态 |

## 实现边界

- 应用采用单 Node.js 进程和本地 JSON 文件存储，定位为单用户生产工具。
- API 访问令牌属于可选部署保护；配置 `APP_ACCESS_TOKEN` 后，所有 `/api` 请求都需携带令牌。
- 资产记录保存媒体 URL 与谱系元数据；交付 ZIP 保存资产清单，不下载远程媒体二进制。
- `package.json` 未定义独立 `build`、`lint` 或前端测试脚本；当前自动验证入口为 `npm test`。
- Provider 凭据由运行中的应用配置并保存在本地配置存储中；接口响应仅返回掩码值。
