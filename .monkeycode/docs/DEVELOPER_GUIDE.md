# 开发者指南

## 项目目的

短剧脚本工坊提供从文学内容输入、分章和知识库管理，到 AI 分析、媒体生成、连续性检查与生产交付的完整单用户工作流。项目保持轻量运行结构：一个 Node.js 进程同时承载静态前端、API、SSE 和本地 JSON 存储。

维护工作应优先保护以下不变量：

1. 成功持久化只递增一次 `revision`，冲突更新保留服务端状态和客户端待保存状态。
2. 已存在的实体 ID 在重命名、排序、分析合并和资产更新中保持不变。
3. 完成 Job 时任务、Asset 和目标实体引用在同一次项目保存中更新。
4. 上游变化通过 `sourceRevision`、`derivedFromRevision` 和 `stale` 保持可追踪。
5. 每集 SRT 从零开始，空字幕镜头仍贡献时长。

## 环境要求

- Node.js 18 或更高版本。
- npm，用于执行项目脚本。
- 可选的 OpenAI 兼容文本、图片和视频 Provider。
- 对项目目录的本地文件读写权限。

运行时依赖只有 Express 与 `animal-island-ui`。前端由 Express 从 `public/` 直接提供，`package.json` 当前未定义独立前端构建步骤。

## 安装与运行

依赖已存在时直接启动：

```bash
npm start
```

开发脚本执行相同入口：

```bash
npm run dev
```

默认访问地址为 `http://localhost:3456`。修改端口：

```bash
PORT=4000 npm start
```

服务在非测试环境监听 `0.0.0.0`。启动时会迁移旧 Provider 配置，并输出文本、图片和视频 Provider 的选择状态。

## 环境变量

| 变量 | 默认值 | 作用 |
|------|--------|------|
| `PORT` | `3456` | HTTP 监听端口 |
| `NODE_ENV` | 空值按开发环境处理 | 控制测试监听行为和 Provider URL 网络边界 |
| `APP_ACCESS_TOKEN` | 空 | 为全部 `/api` 路由启用 Bearer 或 `x-app-token` 认证 |
| `APP_MAX_CONCURRENCY` | `4` | 限制预处理、分析、图片和视频生成的并发请求数 |
| `PROVIDER_ALLOWED_HOSTS` | 空 | Provider 主机精确白名单，多个主机使用逗号分隔 |

共享网络部署应设置访问令牌和 Provider 主机白名单：

```bash
APP_ACCESS_TOKEN=<strong-random-token> \
PROVIDER_ALLOWED_HOSTS=api.example.com,media.example.com \
APP_MAX_CONCURRENCY=4 \
NODE_ENV=production \
npm start
```

Provider API Key 通过应用设置界面提交并进入本地配置存储。代码与文档中应使用占位符，避免记录真实凭据。配置读取接口只返回掩码密钥。生产环境 Provider 使用 HTTPS 公网地址；开发环境允许 localhost 或私网地址使用 HTTP。

## 数据存储

项目文件位于 `data/projects/`，文件名来自经过校验的项目 ID。每次读取执行 `normalizeProject`，每次保存执行以下步骤：

1. 规范化项目模型。
2. 读取当前磁盘项目。
3. 校验可选的 `expectedRevision`。
4. 设置 `revision = currentRevision + 1` 和新 `updatedAt`。
5. 将完整 JSON 写入同目录临时文件。
6. 将临时文件重命名为正式项目文件。

调试项目数据时应通过 API、测试夹具或专用临时项目进行。生产工作流依赖完整 JSON 的原子替换和 revision 语义，绕过 `saveProject` 的直接写入会破坏这些保证。

## 前端保存模型

`App` 使用三个按项目 ID 索引的 ref：

- `pendingProjects`：尚未持久化的最新完整项目状态。
- `savingProjects`：当前执行中的保存 Promise。
- `saveTimers`：600ms 防抖计时器。

修改项目时，先更新 `projectRef` 和 React state，再覆盖 `pendingProjects[id]`。`flushProject` 串行处理同一项目的保存；执行中出现新修改时，当前请求结束后继续刷新下一份状态。切换项目会先尝试刷新前一项目，创建或更新 Job 也会先刷新项目，避免任务基于旧实体和旧 revision 创建。

HTTP 409 时，前端读取响应中的服务端项目，递归合并本地待保存值，并以服务端 revision 重试一次。包含稳定 ID 的对象数组按 ID 合并，保持重排与局部编辑的可识别性。保存状态显示为 `saving`、`saved`、`conflict` 或 `failed`。

涉及保存逻辑的改动应验证连续快速编辑、项目切换期间编辑、任务创建前刷新和 409 合并四条路径。

## 稳定 ID 开发规则

- 新角色、场景、分镜和漫画格应尽早获得 ID。
- 更新实体应以 ID 定位，数组索引只适合当前渲染位置。
- 名称用于显示与历史迁移，任务和资产关联使用 ID。
- 重新排序只修改顺序或编号字段。
- 结构化分析替换结果时，应保留仍代表同一业务实体的 ID；当前历史数据迁移由 `normalizeProject` 补齐缺失 ID。
- 新增 Job 目标类型时，同时扩展 `findProjectEntity`、资产绑定规则和测试。

## Jobs 与 Assets 开发流程

媒体生成的标准流程是：

1. 刷新项目待保存状态。
2. 调用 Provider 创建媒体或取得同步图片结果。
3. 创建持久化 Job，记录目标实体、Provider 任务 ID、参数和当前来源版本。
4. 视频任务轮询期间 PATCH 状态与进度。
5. 完成时 PATCH Job，并在 `asset` 中提供 URL 与谱系信息。
6. 服务端通过 `attachAsset` 同时更新统一资产库、Job 和目标实体引用。
7. 失败时持久化 `status: failed` 与 `error`，保留 `params` 供重试。

同步图片结果由前端 `recordCompletedAsset` 创建短生命周期 Job，再立即以完成状态绑定 Asset。视频任务在项目重新加载后，会根据 `jobs` 中未结束状态恢复轮询。

资产谱系应至少保留 Prompt、模型或 Provider、生成参数、来源 revision、父资产和创建时间。视频从关键帧生成时使用 `parentAssetId` 指向关键帧资产。

## 分块分析开发流程

### 文本边界

分析中间件执行 `validateTextInput`：默认最多 300000 字、100 个分块。预处理以 3000 字作为分块尺寸，分析以 12000 字作为分块尺寸。超限返回 HTTP 413。

### 预处理缓存

预处理结果保存内容 SHA-256、来源模式和章节 ID。修改匹配逻辑时应保证三个条件同时匹配，避免全文预处理被错误注入单章分析，或旧内容摘要被新内容复用。

### 结构化合并

`mergeStructuredResults` 按模块处理：

- `characters` 合并所有 `characters`。
- `scenes` 合并所有 `scenes`。
- `storyboard` 合并 `shots` 并从 1 重新编号 `shotNo`。
- `manga` 合并页面，重新编号 `pageNum` 和每页 `panelNum`。
- 其他类型采用最后一个分块结果。

增加新的结构化模块时，应定义明确的合并规则、稳定身份策略和失败检查点格式。

### 恢复语义

单模块结构化长文本分析在每个块后更新 `analysisRuns`。批量分析在模块级保存状态，通过 `resumeRunId` 跳过已完成模块。当前批量结构化模块内部调用未传入逐块检查点回调，批量恢复粒度主要是模块级；单模块长文本具有分块级检查点记录。

## 连续性开发规则

关键帧 Prompt 应传递前一镜头的连续性说明、画面、动作、角色状态和场景状态。参考图优先包含前一镜头关键帧，再补当前角色和场景设定图。镜头定位使用稳定 `shot.id`，确保重排后能重新计算真实前镜头。

一致性检查输出应经过 `normalizeConsistencyResult`，保持以下 schema：

```json
{
  "issues": [
    {
      "id": "issue_x",
      "severity": "error",
      "category": "continuity",
      "entityType": "shot",
      "entityId": "shot_x",
      "shotId": "shot_x",
      "rule": "wardrobe",
      "message": "...",
      "suggestion": "...",
      "status": "open"
    }
  ],
  "summary": "...",
  "blockingCount": 1,
  "checkedAt": "..."
}
```

开放状态的 `error` 是阻断问题。前端允许将问题标记为 `resolved` 或 `accepted`，并重新计算阻断数量。

## 交付与 ZIP

交付 ZIP 使用自实现 store writer，包含 manifest、完整项目 JSON、项目 Markdown、资产清单和逐集字幕。开发导出功能时应保持：

- `manifest.json` 可定位项目版本、实体、任务、资产和分析运行。
- `assets-manifest.json` 包含可复现生成谱系的精简字段。
- 每集 SRT 从 `00:00:00,000` 起算。
- 空字幕镜头依然累加持续时间。
- ZIP 条目使用 UTF-8 文件名、CRC32、本地文件头、中央目录和结束记录。
- 远程资产本体当前不进入 ZIP，交付依赖资产 URL 的可访问性。

修改 ZIP 结构时同步更新 `buildDeliveryZip` 测试与接口文档。

## 测试

执行完整测试：

```bash
npm test
```

该脚本设置 `NODE_ENV=test` 并运行：

```bash
node --test test/server.test.js
```

测试环境导入 `server.js` 时不会启动监听端口。当前测试覆盖：

| 测试区域 | 验证内容 |
|----------|----------|
| 输入限制 | 字符数、分块数和 HTTP 413 |
| API 认证 | 空令牌、Bearer、`x-app-token` 和错误令牌 |
| 并发限制 | 超限 HTTP 429 与请求完成后的配额释放 |
| Provider URL | 协议、环境、私网地址和主机白名单 |
| Provider 输入 | 字段白名单、掩码密钥保留和 URL 变化保护 |
| 项目迁移 | 稳定 ID、名称引用解析、默认生产字段 |
| Revision | 版本匹配与 HTTP 409 冲突 |
| Job 目标 | 项目、角色、场景、分镜和漫画格定位 |
| Asset | 幂等绑定与目标实体兼容字段 |
| SRT | 每集时间轴重置与静默镜头时长 |
| ZIP | 本地头、预期条目、中央目录和结束记录 |
| 连续性 | 通过稳定 ID 找到前镜头及参考帧 |
| 一致性 | schema 默认值、严重级别和阻断计数 |
| 预处理 | 内容哈希、来源模式和章节范围匹配 |

## 构建与验证

`package.json` 当前提供 `start`、`dev` 和 `test`，未提供独立 `build` 或 `lint`。前端 JSX 的加载方式属于静态应用运行路径，当前仓库指定验证集中在 Node.js 测试。

变更后的最小验证顺序：

1. 运行 `npm test`。
2. 使用 `npm run dev` 启动服务进行浏览器冒烟验证。
3. 创建测试项目并连续编辑，确认保存状态回到“已保存”。
4. 验证一个结构化分析和一个 Markdown 流式分析。
5. 验证 Job 创建、状态更新、资产绑定和刷新后的轮询恢复。
6. 导出 manifest、单集 SRT 和交付 ZIP，检查版本、实体 ID 与归档条目。

涉及前端语法的修改需要通过实际页面加载验证，因为当前没有独立前端构建脚本。

## 安全检查清单

- 共享网络运行时设置 `APP_ACCESS_TOKEN`。
- 生产环境设置 `NODE_ENV=production`。
- 使用 `PROVIDER_ALLOWED_HOSTS` 限定预期 Provider 主机。
- 保持 Provider URL 禁止内嵌凭据。
- 保持生产环境 HTTPS 与私网地址限制。
- 保持昂贵请求并发限制和文本输入限制。
- 在日志、文档、测试夹具和导出示例中使用凭据占位符。
- Provider base URL 变化时要求重新提交真实密钥。
- 新增 API 时确认其位于 `/api` 认证中间件之后。

## 常见修改

### 新增分析模块

1. 在服务端定义 Prompt 和支持类型。
2. 在前端 `MODULES` 注册显示信息与结果类型。
3. 将模块加入批量分析顺序或明确依赖位置。
4. 为结构化结果实现分块合并和稳定 ID 策略。
5. 确认单章保存、聚合结果、来源 revision 和 stale 行为。
6. 更新导出名称、连续性输入和测试。

### 新增媒体目标类型

1. 扩展 `findProjectEntity` 的稳定 ID 定位。
2. 定义 `attachAsset` 对目标实体写入的兼容字段。
3. 通过 Job API 保存任务与来源参数。
4. 添加完成幂等性、目标缺失和 revision 冲突测试。
5. 确认 manifest 与交付资产清单包含新类型。

### 修改保存逻辑

1. 保持前端每项目串行队列。
2. 保持请求携带 `expectedRevision`。
3. 保持 409 响应包含最新完整项目。
4. 保持同目录临时文件和重命名替换。
5. 验证快速连续编辑、切换项目、任务更新和失败重试。

### 修改交付格式

1. 更新 manifest 或 ZIP 构建函数。
2. 保持版本、稳定 ID、资产谱系和任务状态可追踪。
3. 更新 ZIP 条目测试。
4. 更新 `INTERFACES.md` 的导出契约。
