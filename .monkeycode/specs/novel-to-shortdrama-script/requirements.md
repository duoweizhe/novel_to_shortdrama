# 需求文档

## 引言

本系统是一个纯前端 Web 应用"短剧脚本工坊"(ShortDrama Studio)，用于将小说、故事或剧本文本转化为可直接用于 AI 视频生成的短剧分镜脚本与设定文档。用户在浏览器中粘贴源文本，配置自有的大模型 API Key 后，系统调用兼容 OpenAI 格式的 LLM，自动提取角色设定、场景设定，并生成包含中英文 AI 视频提示词的分镜脚本。所有产出可在页面内编辑并以 JSON / Markdown 格式导出。

## 术语表

- **源文本**: 用户输入的小说、故事或剧本原始文本
- **角色设定卡**: 描述角色姓名、性别、年龄、外貌、性格、服装道具的结构化数据
- **场景设定卡**: 描述场景名称、环境、氛围、光照、时间段的结构化数据
- **分镜**: 短剧最小拍摄单元，包含集号、场号、镜号、景别、画面、对白、动作、时长、AI 视频提示词
- **AI 视频提示词**: 用于驱动 AI 视频生成模型(如 Sora / 可灵 / Runway)的画面描述文本，本系统同时产出中文与英文版本
- **LLM Provider**: 兼容 OpenAI Chat Completions 格式的模型服务方

## 需求

### 需求 1: 源文本输入与项目持久化

**用户故事:** AS 短剧创作者, I want 粘贴或导入小说/故事/剧本文本并保存项目, so that 我能随时继续编辑

#### 验收标准

1. The system SHALL 提供多行文本输入区，支持粘贴与文件导入(.txt / .md)
2. WHEN 用户输入源文本, the system SHALL 实时统计字符数并显示
3. The system SHALL 将项目(源文本、配置、生成结果)自动保存到浏览器 localStorage
4. WHEN 用户重新打开页面, the system SHALL 恢复上一次的项目状态
5. The system SHALL 支持创建多个命名项目并在项目间切换

### 需求 2: LLM 服务配置

**用户故事:** AS 短剧创作者, I want 在前端配置自己的大模型 API Key 与端点, so that 系统能调用模型生成脚本

#### 验收标准

1. The system SHALL 提供配置表单，包含 API Key、Base URL、模型名称三个字段
2. The system SHALL 将配置存储于 localStorage，页面刷新后保留
3. WHEN 用户点击"测试连接", the system SHALL 发送一次最小请求验证配置可用性并显示结果
4. IF API Key 为空, the system SHALL 禁用生成按钮并提示用户配置
5. The system SHALL 在配置区显示 Key 脱敏后的预览(仅显示后 4 位)

### 需求 3: 角色设定生成

**User Story:** AS 短剧创作者, I want 系统自动从源文本提取角色设定, so that 我能获得统一的角色视觉参考

#### 验收标准

1. WHEN 用户点击"生成设定", the system SHALL 调用 LLM 从源文本提取角色列表
2. The system SHALL 为每个角色生成包含姓名、性别、年龄、外貌描述、性格特征、服装道具的结构化设定卡
3. The system SHALL 为每张角色卡生成可用于 AI 图像生成的外貌描述 prompt(中英文)
4. The system SHALL 允许用户在页面内直接编辑任何角色字段
5. The system SHALL 支持手动新增与删除角色

### 需求 4: 场景设定生成

**User Story:** AS 短剧创作者, I want 系统自动提取场景设定, so that 分镜画面具备一致的环境基础

#### 验收标准

1. WHEN 用户点击"生成设定", the system SHALL 同时从源文本提取场景列表
2. The system SHALL 为每个场景生成包含场景名、环境描述、氛围、光照、时间段的结构化设定卡
3. The system SHALL 为每张场景卡生成可用于 AI 图像生成的场景描述 prompt(中英文)
4. The system SHALL 允许用户在页面内直接编辑场景字段
5. The system SHALL 支持手动新增与删除场景

### 需求 5: 分镜脚本生成

**User Story:** AS 短剧创作者, I want 系统将源文本拆分为带 AI 视频提示词的分镜脚本, so that 我能直接用于 AI 视频生成工具

#### 验收标准

1. WHEN 用户点击"生成分镜", the system SHALL 调用 LLM 将源文本拆分为分镜序列
2. The system SHALL 支持配置短剧参数：总集数、每集时长(秒)、视频风格、画幅比例
3. The system SHALL 为每个分镜生成包含集号、场号、镜号、景别、画面描述、对白、动作、时长(秒)、关联角色、关联场景的字段
4. The system SHALL 为每个分镜生成 AI 视频提示词，包含中文 prompt 与英文 prompt，并融入对应角色外貌与场景环境描述以保持一致性
5. WHEN 源文本较长, the system SHALL 分批调用 LLM(按章节或段落)并合并结果，单次请求分镜数量不超过用户设定上限
6. The system SHALL 允许用户在分镜表中直接编辑任意字段
7. The system SHALL 支持手动新增、删除、重排分镜

### 需求 6: 结果查看与导出

**User Story:** AS 短剧创作者, I want 查看、编辑并导出全部产出, so that 我能交付给视频制作流程

#### 验收标准

1. The system SHALL 提供三个视图：角色设定、场景设定、分镜脚本
2. The system SHALL 在分镜视图中支持按集号、场景筛选
3. WHEN 用户点击"导出 Markdown", the system SHALL 生成包含全部设定与分镜的 Markdown 文档并下载
4. WHEN 用户点击"导出 JSON", the system SHALL 生成结构化 JSON 文件并下载
5. The system SHALL 支持复制单个分镜的英文 prompt 到剪贴板
6. The system SHALL 提供分镜的网格缩略卡视图与表格视图切换

### 需求 7: 示例脚本

**User Story:** AS 短剧创作者, I want 系统内置一份示例短剧脚本, so that 我能快速理解输出格式与质量

#### 验收标准

1. The system SHALL 内置一份完整的示例项目，包含源文本、角色设定、场景设定、分镜脚本
2. WHEN 用户首次打开应用且无保存项目, the system SHALL 自动加载示例项目
3. The system SHALL 提供"加载示例"按钮供用户随时调用
4. The 示例脚本 SHALL 涵盖至少 3 个角色、2 个场景、8 个分镜，且每个分镜含中英文 AI 视频提示词
