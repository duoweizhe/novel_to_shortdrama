# 接口参考

## 通用约定

服务默认监听 `http://localhost:3456`。所有业务接口使用 `/api` 前缀。普通接口返回 JSON；导出接口返回 JSON、Markdown、SRT 或 ZIP；分析类接口返回 Server-Sent Events。

请求 JSON 上限为 10 MB。错误通常采用以下格式：

```json
{
  "error": "错误说明"
}
```

### API 认证

设置 `APP_ACCESS_TOKEN` 后，每个 `/api` 请求都需使用以下任一请求头：

```http
Authorization: Bearer <APP_ACCESS_TOKEN>
```

```http
x-app-token: <APP_ACCESS_TOKEN>
```

未配置 `APP_ACCESS_TOKEN` 时 API 直接接受请求。认证失败返回 HTTP 401。

### 并发冲突

项目更新、任务创建和任务更新支持 `expectedRevision`。值与磁盘项目的当前 `revision` 不一致时返回 HTTP 409：

```json
{
  "error": "项目版本冲突",
  "revision": 8,
  "project": {}
}
```

客户端应保留本地待保存状态，以响应中的 `project` 为基线按稳定实体 ID 合并，再使用最新 revision 重试。

## 项目接口

| 方法 | 路径 | 请求 | 响应 |
|------|------|------|------|
| GET | `/api/projects` | 无 | `{ items, total }`；项目摘要按更新时间降序 |
| POST | `/api/projects` | `{ name?, style?, content? }` | 创建并持久化后的项目 |
| GET | `/api/projects/:id` | 无 | 规范化后的完整项目 |
| PUT | `/api/projects/:id` | 项目 patch 与 `expectedRevision?` | 保存后的完整项目 |
| DELETE | `/api/projects/:id` | 无 | `{ ok: true }` |
| POST | `/api/projects/import` | 至少包含 `name` 的项目 JSON | 使用新项目 ID 导入后的项目 |

`PUT` 接受字段：`name`、`style`、`content`、`chapters`、`knowledge`、`results`、`mediaItems`、`preprocess`、`assets`、`jobs`、`analysisRuns` 和 `sourceRevision`。`style`、`content`、`chapters` 或 `knowledge` 变化时，服务端会在请求未显式指定来源版本的情况下递增 `sourceRevision`。

导入会创建新 ID 和时间戳，并重置 `revision`、`sourceRevision`、`assets`、`jobs`、`analysisRuns` 与 `snapshots`。项目读取和保存会规范化历史结构并补充稳定实体 ID。

## 章节与知识库

| 方法 | 路径 | 请求 | 响应 |
|------|------|------|------|
| POST | `/api/projects/:id/chapters/import` | `{ content, group? }` | `{ imported, total }` |
| POST | `/api/projects/:id/chapters` | `{ title, content?, group? }` | 新章节 |
| PUT | `/api/projects/:id/chapters/:chId` | `title`、`content`、`group`、`order` 的 patch | 更新后的章节 |
| DELETE | `/api/projects/:id/chapters/:chId` | 无 | `{ ok: true }` |
| GET | `/api/projects/:id/knowledge` | 无 | `{ characters, scenes, props, timeline }` |
| PUT | `/api/projects/:id/knowledge` | 完整知识库对象 | 保存后的知识库 |

批量分章识别中文“第 N 章/节/回/卷/集/部/篇”和 `Chapter N` 标题。单章对象包含稳定章节 ID、标题、内容、分组、排序、分析结果和创建时间。

## Job 接口

### 列出任务

`GET /api/projects/:id/jobs`

```json
{
  "items": [],
  "total": 0
}
```

### 创建任务

`POST /api/projects/:id/jobs`

```json
{
  "entityType": "shot",
  "entityId": "shot_x",
  "type": "video",
  "kind": "video",
  "status": "processing",
  "provider": "provider-id",
  "providerTaskId": "external-task-id",
  "params": {
    "prompt": "..."
  },
  "expectedRevision": 4
}
```

目标必须能由项目 ID 和稳定实体 ID 解析。成功返回 HTTP 201：

```json
{
  "job": {},
  "revision": 5,
  "project": {}
}
```

### 更新任务

`PATCH /api/projects/:id/jobs/:jobId`

可更新 `status`、`providerTaskId`、`error` 和 `progress`。任务完成时可同时提交资产：

```json
{
  "status": "completed",
  "asset": {
    "kind": "video",
    "url": "https://media.example/video.mp4",
    "prompt": "...",
    "parentAssetId": "asset_keyframe"
  },
  "expectedRevision": 5
}
```

成功响应包含 `{ job, asset, revision, project }`。资产 URL 为空或目标实体已消失时返回 HTTP 400。任务已经绑定资产时，重复完成请求复用已有资产。

## 分析 SSE

`public/js/api.js` 将响应流按空行分隔为事件块，支持 `event:` 与多行 `data:`。`data: [DONE]` 表示流结束。JSON 解析失败的数据会转换为 `{ "error": "原始文本" }`；`event: error` 会在客户端抛出异常。

分析端点每 15 秒发送 SSE 注释 ping，以维持连接。

### 预处理

`POST /api/preprocess`

```json
{
  "content": "长文本",
  "projectId": "proj_x",
  "sourceMode": "content|chapters|chapter",
  "chapterId": "ch_x"
}
```

事件状态：

| `status` | 关键字段 | 含义 |
|----------|----------|------|
| `splitting` | `message` | 开始拆分 |
| `split_done` | `total` | 分块数确定 |
| `summarizing` | `progress`, `total` | 正在摘要某个分块 |
| `segment_done` | `index`, `data` | 分块摘要成功 |
| `segment_error` | `index`, `error` | 分块摘要失败并继续 |
| `synthesizing` | `message` | 正在生成全局摘要 |
| `synthesis_error` | `error` | 全局综合失败 |
| `done` | `segments`, `global`, `sourceMode`, `chapterId`, `contentHash`, `createdAt` | 完成并可持久化 |

### 单模块分析

`POST /api/analyze`

```json
{
  "type": "storyboard",
  "content": "...",
  "visualStyle": "cinematic",
  "projectId": "proj_x",
  "characters": [],
  "scenes": [],
  "sourceMode": "chapter",
  "chapterId": "ch_x"
}
```

结构化类型为 `characters`、`scenes`、`storyboard`、`manga`；其余支持的模块按 Markdown 流式生成。事件包括 `start`、`streaming`、`done` 和 `error`。`done.result` 为完整结构化对象或完整 Markdown 字符串。

项目模式下，最终结果写入 `results[type]`。单章模式还写入 `chapters[].analysis[type]`。长结构化输入的检查点写入 `analysisRuns`。

### 批量分析

`POST /api/analyze-all`

请求字段与单模块分析相似，并增加：

```json
{
  "modules": ["characters", "scenes", "storyboard"],
  "resumeRunId": "analysis_run_x"
}
```

事件包括：

| `status` | 含义 |
|----------|------|
| `run_start` | 返回当前 `runId` |
| `module_start` | 模块开始 |
| `module_streaming` | Markdown 增量内容 |
| `module_done` | 模块完成并返回结果 |
| `module_skipped` | 恢复运行时跳过已完成模块 |
| `module_error` | 模块失败，批量流程继续 |
| `all_done` | 返回 `runId` 与 `retryModules` |
| `error` | 批量运行级错误 |

### 一致性检查

`POST /api/check-consistency`

```json
{
  "projectId": "proj_x",
  "results": {},
  "knowledge": {}
}
```

完成事件为 `{ "status": "done", "result": consistency }`。`consistency` 包含 `issues`、`summary`、`blockingCount` 和 `checkedAt`。每个问题包含稳定问题 ID、严重级别、分类、实体类型、实体 ID、分镜 ID、规则、消息、建议和处理状态。

## 媒体生成

### 图片

`POST /api/generate/image`

```json
{
  "prompt": "...",
  "negativePrompt": "...",
  "size": "1024x768",
  "visualStyle": "cinematic",
  "images": ["https://media.example/reference.png"]
}
```

响应为 `{ "ok": true, "url": "..." }` 或 `{ "ok": false, "error": "..." }`。`images` 用于参考图生成。

### 视频任务

`POST /api/generate/video`

```json
{
  "prompt": "...",
  "negativePrompt": "...",
  "image": "https://media.example/keyframe.png",
  "height": 768,
  "width": 1152,
  "num_frames": 121,
  "frame_rate": 24,
  "mode": "keyframes"
}
```

`num_frames` 接受 `81`、`121`、`241` 或 `441`，其他值回退为 `121`。Provider 返回的任务字段与 `{ ok: true }` 合并后返回。

`GET /api/generate/video/:videoId` 查询状态。Provider 限流时接口返回 `{ ok: true, status: "in_progress", progress: -1, rate_limited: true }`，前端延长轮询间隔。普通查询设置 30 秒超时。

媒体生成接口只负责 Provider 调用。持久化生产记录需要客户端配合 Job API：先创建 Job，再在完成时 PATCH Job 并附带 Asset。

## 风格与 Provider 配置

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/styles` | 返回视觉风格、Prompt 后缀和 Negative Prompt |
| GET | `/api/config/llm` | 返回 Provider 配置、激活项、预设和掩码密钥 |
| PUT | `/api/config/llm` | 保存字段白名单内的 Provider 与激活项 |
| POST | `/api/config/llm/test` | 使用指定配置发送 20 秒超时的简单文本请求 |

Provider 必填 `id`、`type`、`name` 和 `baseUrl`。允许保存的普通字段为 `id`、`type`、`name`、`model`、`baseUrl`、`defaultModel`、`models`，`apiKey` 单独处理。掩码密钥不会覆盖已有真实密钥；base URL 变化时请求必须包含真实密钥。

## 快照

| 方法 | 路径 | 请求或响应 |
|------|------|------------|
| POST | `/api/projects/:id/snapshot` | 请求 `{ label? }`；返回快照摘要 |
| GET | `/api/projects/:id/snapshots` | 返回不含快照数据的摘要数组 |
| POST | `/api/projects/:id/snapshots/:snId/restore` | 恢复快照并返回项目 |

每个项目最多保留 20 个快照。恢复前会先追加“恢复前自动保存”。快照覆盖内容、章节、知识库、结果、风格、预处理、资产、任务和版本字段；恢复完成后的 `saveProject` 会生成新的持久化 revision。

## 导出接口

| 方法 | 路径 | Content Type | 内容 |
|------|------|--------------|------|
| GET | `/api/projects/:id/export-json` | `application/json` | 完整项目 JSON |
| GET | `/api/projects/:id/export-manifest` | JSON | 项目、实体、资产、任务与分析运行清单 |
| GET | `/api/projects/:id/export-delivery` | JSON | manifest、完整项目和逐集字幕映射 |
| GET | `/api/projects/:id/export-delivery.zip` | `application/zip` | manifest、项目 JSON、Markdown、资产清单和逐集 SRT |
| GET | `/api/projects/:id/export-srt` | `text/plain` | 所有分镜串联生成的 SRT |
| GET | `/api/projects/:id/export-srt/:episode` | `text/plain` | 指定集从零开始的 SRT |
| GET | `/api/projects/:id/export-md` | `text/markdown` | 面向阅读的项目内容与分析结果 |

逐集字幕优先使用 `shot.subtitle`，其次使用 `shot.dialogue`。镜头默认时长为 4 秒，空字幕镜头继续推进时间轴。ZIP 文件名会清理换行、引号、斜杠和反斜杠。

## 状态码

| 状态码 | 场景 |
|--------|------|
| 200 | 普通成功、部分 Provider 业务失败包装为 `{ ok: false }` |
| 201 | Job 创建成功 |
| 400 | 请求参数、实体目标、Provider URL 或资产无效 |
| 401 | API 访问令牌缺失或不匹配 |
| 404 | 项目、章节、任务或快照不存在 |
| 409 | `expectedRevision` 与当前版本冲突 |
| 413 | 文本字符数或分块数超限 |
| 429 | 昂贵请求并发数达到上限 |
| 500 | 未处理的持久化或服务端错误 |
