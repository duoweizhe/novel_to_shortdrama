# 短剧脚本工坊 (Novel-to-Drama Studio)

小说 / 剧本 / 故事 一站式转化为 AI 短剧视频分镜脚本与角色场景设定，支持 AI 生图、生视频、漫画分格生成。

## 功能概览

### 文本分析（8 大模块）
- 剧情结构分析 — 三幕结构、五转折点、情感曲线
- 制作分析 — 集数规划、成本预算、选角建议
- 角色设定 — 外貌/性格/服装/语言风格/人物关系/角色弧光/选角参考，含 1x4 横向设定图 Prompt
- 场景设计 — 环境/氛围/光照/声音设计/色调/构图，含场景图 Prompt
- 分镜脚本 — 镜头/景别/运镜/对白/音效/转场/连贯性备注，15 条长视频构图约束
- 短剧脚本 — 可直接拍摄的完整剧本
- 视觉资产 — 道具/特效/封面 Prompt 清单
- 漫画脚本 — 结构化分页分格，每格含画面描述/对白/音效/情绪符号/英文生图 Prompt
- 长文本自动按章节边界分块并合并结构化结果，也可选择单章独立分析
- 角色、场景、分镜和漫画格使用稳定 ID 关联，减少跨模块名称漂移

### AI 媒体生成
- 文生图 / 图生图（支持参考图上传）
- 文生视频 / 图生视频（异步任务轮询）
- 漫画分格一键生图 / 批量生成全部漫画格
- 生成任务持久化到 `jobs`，重新打开项目后可继续轮询未完成的视频任务
- 图片和视频统一记录到 `assets`，并关联项目、角色、场景、分镜或漫画格

### 项目管理
- 多项目管理，章节导入与分组折叠
- 知识库自动提取（角色/场景/道具/时间线跨章节合并）
- 项目以稳定 ID 保存，`revision` 提供乐观并发控制，冲突时返回最新项目状态
- 源内容更新后递增 `sourceRevision`，旧分析结果与关联资产显示 stale 提示
- 版本快照与恢复；批量分析记录可跳过已完成模块并恢复失败任务
- 结构化一致性检查，输出带稳定 ID、严重级别、实体关联和处理状态的问题列表
- 导出 Markdown、JSON、Manifest、完整 SRT、逐集 SRT 与交付 ZIP

### 模型配置（三类独立）
- 文本模型 — DeepSeek / 通义千问 / OpenAI / MiMo / Agnes 2.0 Flash
- 生图模型 — Agnes 生图（默认）/ OpenAI DALL·E / 自定义
- 生视频模型 — Agnes 视频（默认）/ 自定义
- 三种模型独立配置互不影响，生图/生视频未配置时自动回退 Agnes

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + animal-island-ui 组件库 |
| 构建 | esbuild（JSX → ESM bundle） |
| 后端 | Node.js + Express（单端口） |
| AI | Agnes AI（LLM / 生图 / 生视频） |
| 存储 | 文件系统（data/ 目录，JSON 持久化） |

## 快速开始

```bash
# 安装依赖
npm install

# 启动服务
npm start

# 运行测试
npm test
```

服务默认运行在 `http://localhost:3456`。

启动后在页面右上角点击齿轮图标配置模型 API Key：

1. 添加文本模型（推荐 Agnes 2.0 Flash 或 DeepSeek），填入 API Key，点击「设为主」
2. 生图/生视频默认回退 Agnes，如需自定义可单独添加
3. 点击「测试」确认连接成功后保存

## 视觉风格

内置 11 种视觉风格，所有生图/视频 Prompt 自动附加风格关键词：

电影写实 / 日漫风 / 国漫风 / 3D动画 / 仿真人 / 美漫风 / 水墨风 / 像素风 / 水彩风 / 赛博朋克 / 奇幻风

## 环境变量

| 变量 | 说明 |
|---|---|
| `PORT` | HTTP 端口，默认 `3456` |
| `APP_ACCESS_TOKEN` | 可选 API 访问令牌；客户端通过 `Authorization: Bearer <token>` 或 `X-App-Token` 发送 |
| `PROVIDER_ALLOWED_HOSTS` | 可选 Provider 主机白名单，多个主机以逗号分隔 |
| `APP_MAX_CONCURRENCY` | 预处理、分析、生图和生视频请求的并发上限，默认 `4` |

Provider URL 在生产环境必须使用 HTTPS 且不能指向私网；开发环境允许 localhost 或私网 HTTP。

## 环境要求

- Node.js >= 18（内置 fetch 支持）
- 现代浏览器（支持 ES Modules + Import Maps）

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/styles` | 获取视觉风格列表 |
| GET | `/api/config/llm` | 获取模型配置（Key 脱敏） |
| PUT | `/api/config/llm` | 保存模型配置 |
| POST | `/api/config/llm/test` | 测试模型连接 |
| GET/POST | `/api/projects` | 列出或创建项目 |
| GET/PUT/DELETE | `/api/projects/:id` | 读取、更新或删除项目；更新支持 `expectedRevision` |
| POST | `/api/projects/import` | 导入项目 |
| POST/PUT/DELETE | `/api/projects/:id/chapters...` | 导入、新增、更新或删除章节 |
| GET/PUT | `/api/projects/:id/knowledge` | 知识库管理 |
| GET/POST/PATCH | `/api/projects/:id/jobs...` | 列出、创建或更新可恢复生成任务 |
| POST | `/api/preprocess` | 长文本分块预处理（SSE） |
| POST | `/api/analyze` | 单模块或单章分析（SSE） |
| POST | `/api/analyze-all` | 可恢复的批量分析（SSE） |
| POST | `/api/check-consistency` | 结构化一致性检查（SSE） |
| POST | `/api/generate/image` | AI 生图 |
| POST | `/api/generate/video` | AI 生视频 |
| GET | `/api/generate/video/:videoId` | 查询视频任务状态 |
| GET | `/api/projects/:id/export-{md,json,manifest,srt}` | 导出 Markdown、JSON、Manifest 或完整 SRT |
| GET | `/api/projects/:id/export-srt/:episode` | 导出指定集 SRT |
| GET | `/api/projects/:id/export-delivery` | 获取交付数据及逐集字幕 |
| GET | `/api/projects/:id/export-delivery.zip` | 下载含 Manifest、项目数据、资产清单和逐集 SRT 的交付 ZIP |
| POST/GET | `/api/projects/:id/snapshot(s)` | 创建或列出版本快照 |
| POST | `/api/projects/:id/snapshots/:snId/restore` | 恢复版本快照 |

## License

ISC
