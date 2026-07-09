const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3456;

const DATA_DIR = path.join(__dirname, 'data');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
[DATA_DIR, PROJECTS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ===================================================================
//  视觉风格
// ===================================================================
const VISUAL_STYLES = [
  { key: 'cinematic', label: '电影写实', desc: '电影级写实质感，冷调光影，浅景深胶片颗粒', promptSuffix: 'photorealistic, cinematic film still, dramatic lighting, 8K, shallow depth of field, DSLR camera, realistic skin texture, film grain, color grading, anamorphic lens flare, movie poster quality', negativePrompt: 'cartoon, anime, illustration, 3D render, CGI, low quality, blurry, oversaturated, plastic skin' },
  { key: 'anime', label: '日漫风', desc: '日本动漫赛璐珞风格，线条清晰，色彩鲜明', promptSuffix: 'anime style, Japanese animation, cel shading, vibrant colors, clean line art, Studio Ghibli inspired, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive', negativePrompt: 'photorealistic, 3D render, live action, realistic skin texture, blurry, low quality' },
  { key: 'dongman', label: '国漫风', desc: '中国3D动画，水墨元素与仙侠美学', promptSuffix: 'Chinese donghua style, flowing robes, celestial beauty, ink wash elements, dramatic lighting, 3D Chinese animation, ethereal atmosphere, detailed costume, silk texture, high quality render', negativePrompt: 'anime, Japanese style, western cartoon, low quality, flat shading' },
  { key: '3d', label: '3D动画', desc: 'Pixar/Disney 质感三维动画', promptSuffix: '3D animation, Pixar style, Disney aesthetic, Unreal Engine 5 render, subsurface scattering, volumetric lighting, smooth shading, high quality 3D model, CGI, ray tracing, detailed textures', negativePrompt: '2D, flat, hand drawn, sketch, watercolor, low poly, low quality' },
  { key: 'realistic', label: '仿真人', desc: '高度写实真人电影质感', promptSuffix: 'photorealistic, cinematic, live action film still, natural lighting, 8k photography, realistic skin texture, DSLR camera, film grain, shallow depth of field, professional color grading, hyperrealistic', negativePrompt: 'cartoon, anime, illustration, 3D render, CGI, artificial looking, plastic skin, oversaturated' },
  { key: 'comic', label: '美漫风', desc: '美式漫画，粗线条网点强对比', promptSuffix: 'American comic book style, bold ink outlines, halftone dots, dramatic shadows, Marvel DC aesthetic, dynamic composition, Ben-Day dots, cel shading, high contrast, vibrant primary colors', negativePrompt: 'anime, realistic, photograph, 3D render, watercolor, soft shading' },
  { key: 'ink', label: '水墨风', desc: '中国传统水墨画，留白意境', promptSuffix: 'Chinese ink wash painting style, sumi-e, traditional brush strokes, minimalist composition, black ink on rice paper, flowing brushwork, zen aesthetic, monochrome with subtle color accents, negative space', negativePrompt: 'photorealistic, 3D, cartoon, vibrant colors, digital art, western style, sharp edges' },
  { key: 'pixel', label: '像素风', desc: '复古像素游戏风格', promptSuffix: 'pixel art style, retro game aesthetic, 16-bit era, limited color palette, crisp pixels, nostalgic gaming feel, sprite art, dithering, isometric perspective, high quality pixel work', negativePrompt: 'photorealistic, high resolution, smooth, anti-aliased, 3D render, photograph, vector art' },
  { key: 'watercolor', label: '水彩风', desc: '柔和透明水彩画风', promptSuffix: 'watercolor painting style, soft edges, transparent washes, paper texture visible, delicate brushstrokes, dreamy atmosphere, hand-painted illustration, wet-on-wet technique, organic color bleeding', negativePrompt: 'photorealistic, digital art, 3D render, sharp edges, vector art, cartoon, flat colors' },
  { key: 'cyberpunk', label: '赛博朋克', desc: '霓虹灯未来反乌托邦', promptSuffix: 'cyberpunk aesthetic, neon lights, futuristic city, holographic displays, rain-soaked streets, blade runner inspired, high tech low life, glowing neon signs, dark atmosphere, volumetric fog, reflective wet surfaces', negativePrompt: 'natural, pastoral, medieval, fantasy forest, bright daylight, cartoon, pastel colors' },
  { key: 'fantasy', label: '奇幻风', desc: '西式奇幻史诗概念艺术', promptSuffix: 'high fantasy art style, epic fantasy illustration, magical atmosphere, ethereal lighting, Lord of the Rings aesthetic, detailed armor and weapons, mystical environment, concept art, ArtStation quality, dramatic composition', negativePrompt: 'modern, urban, realistic photograph, sci-fi, cyberpunk, cartoon, flat lighting' },
];

function getStyle(key) { return VISUAL_STYLES.find(s => s.key === key) || VISUAL_STYLES[0]; }
function getStyleContext(key) {
  const s = getStyle(key);
  return `\n\n【指定画面风格：${s.label}】${s.desc}\n风格关键词(必须附加到所有生图/视频Prompt末尾)：${s.promptSuffix}\nNegative Prompt：${s.negativePrompt}\n请在每个生图/视频Prompt中附加上述风格关键词，确保生成的画面符合指定风格。`;
}
function getStyleSuffix(key) { const s = getStyle(key); return `, ${s.promptSuffix}`; }
function getStyleNegative(key, extra) {
  const s = getStyle(key); const parts = [];
  if (s.negativePrompt) parts.push(s.negativePrompt);
  if (extra) parts.push(extra);
  return parts.join(', ');
}

// ===================================================================
//  分析模块 Prompt
// ===================================================================
const PROMPTS = {
  structure: `你是一位专业编剧顾问和故事结构分析师，精通三幕结构、英雄之旅、Save the Cat 等编剧理论。请根据用户提供的小说/剧本内容，进行深度剧情结构分析。

## 📐 剧情结构分析

### 1. 核心冲突提炼
- **一句话故事引擎**：用一句话概括这个故事的戏剧引擎（"一个XX的XX，为了XX，必须XX，否则XX"）
- **核心冲突类型**：人 vs 人 / 人 vs 自然 / 人 vs 社会 / 人 vs 自我 / 人 vs 命运
- **主题/母题**：故事探讨的核心主题

### 2. 三幕结构划分

#### 第一幕：建置（约占全文 25%）
- **起始状态**：主角的日常生活/世界观
- **激励事件**：打破平衡的关键事件
- **第一转折点**：主角被迫进入冲突的时刻
- **情节点 I**：主角做出关键决定

#### 第二幕：对抗（约占全文 50%）
- **前半段：上升行动**：主角尝试解决问题，遭遇阻碍
- **中点**：虚假胜利或虚假失败，故事方向转变
- **后半段：升级对抗**：stakes 升高，压力加大
- **第二转折点（暗夜时刻）**：主角跌入谷底，一切看似失败

#### 第三幕：解决（约占全文 25%）
- **高潮**：最终对决/决定/揭示
- **结局**：新平衡的建立
- **尾声**（如有）：留给观众的余韵

### 3. 五个关键转折点
| 转折点 | 位置 | 事件 | 功能 |
|--------|------|------|------|
| 激励事件 | ~10% | [具体事件] | 打破平衡 |
| 第一转折 | ~25% | [具体事件] | 进入冲突 |
| 中点 | ~50% | [具体事件] | 方向转变 |
| 第二转折 | ~75% | [具体事件] | 跌入谷底 |
| 高潮 | ~90% | [具体事件] | 最终解决 |

### 4. 情感曲线
用 1-10 分标注每个关键节点的情感强度：
[起始: X分] → [激励事件: X分] → [上升: X分] → [中点: X分] → [升级: X分] → [暗夜: X分] → [高潮: X分] → [结局: X分]

### 5. 冲突层级
- **外部冲突**：[具体描述]
- **内部冲突**：[角色内心矛盾]
- **关系冲突**：[角色之间的矛盾]

### 6. 节奏建议
- **该快的地方**：[具体段落/场景，为什么]
- **该慢的地方**：[具体段落/场景，为什么]
- **需要留白的地方**：[情感爆发后的静默时刻]

### 7. 短剧改编骨架
- **建议集数**：[X] 集
- **每集覆盖范围**：[章节/段落]
- **每集结尾钩子**：[悬念/反转/情感冲击]
- **改编优先级**：哪些情节必须保留，哪些可以删减

请确保分析基于原文实际内容，不要泛泛而谈。每个转折点必须引用原文中的具体情节。`,

  summary: `你是一位资深的影视制作总监兼改编编剧。请根据用户提供的小说/剧本内容，生成一份面向实际制作的分析报告。

## 📊 制作分析报告

### 1. 内容评估
- **故事类型**：
- **核心卖点**：（一句话说清这个故事最吸引人的是什么）
- **目标平台**：（抖音/快手/B站/YouTube Shorts等）
- **建议集数**：
- **每集时长**：

### 2. 改编策略（重点）
对原文内容进行逐段评估：
- **必须保留的核心情节**：[列出关键情节，说明为什么不能删]
- **可以删减的内容**：[列出可删内容，说明为什么可以删]
- **需要合并/简化的内容**：[哪些段落可以合并处理]
- **建议原创补充的内容**：[为了短剧节奏需要新增什么]

### 3. 断集建议
为每集规划内容：
- **第 X 集**：覆盖 [章节/段落范围]，核心冲突 [是什么]，结尾钩子 [悬念/反转/情感冲击]
- （以此类推）

### 4. 角色分析
- 主要角色数量及复杂度
- 角色关系图谱
- 选角建议（类型/气质）

### 5. 场景分析
- 场景数量及类型
- 拍摄难度评估
- 是否需要特殊场景

### 6. 制作建议
- 推荐拍摄手法
- 特效需求
- 预算级别估算
- 制作周期建议

### 7. 风险提示
- 可能的改编难点
- 审查风险点
- 观众可能的反馈

请给出专业、可执行的建议，特别是改编策略和断集建议要具体到原文的段落级别。`,

  script: `你是一位专业的短剧编剧兼导演。请根据用户提供的小说/剧本内容，生成一份可直接用于拍摄的短剧脚本。

## 📝 短剧脚本

### 基本信息
- **剧名**：
- **集数**：
- **每集时长**：
- **类型/风格**：
- **目标受众**：

### 剧情大纲
[整体故事线概述，3-5 句话]

### 第 [X] 集：[集名]

#### 场景 1：[场景名]
- **时间**：
- **地点**：
- **人物**：
- **画面描述**：（融入镜头语言的电影化描述，如「缓缓推向...」「从...的视角看去」）
- **角色A**：（表演指导：语气/节奏/肢体动作/眼神方向）"对白"
  - 潜台词：[角色真正想说的是什么]
- **角色B**：（表演指导）"对白"
  - 潜台词：[角色真正想说的是什么]
- **（旁白/内心独白）**：[如果需要，标注是旁白还是内心独白]
- **音效/BGM**：[具体音效和音乐变化]
- **[转场设计]**：[具体方式 + 转场时的声音/画面处理，如「画面渐黑，对白声延续到下一场」]

#### 场景 2
...

### 本集要点
- **核心冲突**：本集的主要矛盾
- **情感高潮**：本集最强烈的情感时刻
- **结尾钩子**：吸引观众看下一集的悬念/反转/冲击

---

**请确保**：
1. 节奏紧凑，对白自然，适合短视频平台传播
2. 对白有潜台词，不是直白的信息传递
3. 表演指导具体可执行，导演和演员能直接理解
4. 转场设计有情绪目的，不是简单的硬切
5. 画面描述使用电影化语言，不是小说叙述`,

  assets: `你是一位专业的影视视觉总监兼 AI 绘图专家。请根据用户提供的小说/剧本内容，生成一套风格统一的视觉资产清单。

## 🎨 视觉资产设计

### 0. 全局视觉风格定义
- **整体风格**：[统一的风格描述，如「赛博朋克废土风」「东方仙侠水墨风」]
- **色调体系**：[主色、辅色、点缀色的统一规范，用色值标注]
- **参考作品**：[2-3 部参考影视/游戏/画师的作品]
- **通用画面要求**：[所有 Prompt 共享的画面质量描述，如 "cinematic lighting, 8k, highly detailed, shallow depth of field"]

注意：如果上下文已指定画面风格，请在描述氛围和光影时参考该风格，但不要将风格关键词重复写入每个 Prompt 中。

### 1. 角色立绘
为每个主要角色生成：
- **全身立绘 Prompt**：英文，包含角色外貌和服装关键词
- **半身像 Prompt**：英文
- **表情包 Prompt**：5-8 种不同情绪的面部特写（喜/怒/哀/惧/惊/厌/傲/羞）
- **标志性动作 Prompt**：角色最出彩的姿态/动作

### 2. 关键场景图
为每个重要场景生成：
- **全景图 Prompt**：英文，包含场景氛围和光线
- **细节图 Prompt**：英文，聚焦关键道具或细节

### 3. 道具/物品
- **[道具名] Prompt**：英文，包含材质、大小、使用状态描述

### 4. 封面/海报
- **主视觉 Prompt**：英文，适合宣传海报
- **剧名排版建议**：字体风格、位置、大小
- **系列海报方案**：如果做多张海报的统一方案

### 5. 风格参考图集
- **参考作品 1**：[作品名] — 参考其 [具体方面]
- **参考作品 2**：[作品名] — 参考其 [具体方面]
- **参考艺术家/画师**：[名字] — 参考其 [具体风格]

所有 Prompt 请使用英文，确保风格一致性。`,

  manga: `你是一位专业的漫画分镜师和漫剧编剧，精通漫画叙事语言和分格构图。请根据用户提供的小说/剧本内容，生成漫画/漫剧脚本。

## 📖 漫画/漫剧脚本

### 基本信息
- **漫画名**：
- **总页数**：
- **风格类型**：（日漫/韩漫/国漫/美漫/条漫）
- **目标平台**：（快看/哔哩哔哩漫画/抖音条漫/Webtoon）
- **阅读方向**：（左→右/右→左/上→下）

### 剧情大纲
[整体故事线概述]

### 第 X 页

#### 格1 [布局: 如 2x1左 / 1x1 / 2x2 / 不规则]
- **画面描述**：[详细的画面构图和内容]
- **角色表情**：[角色的面部表情和肢体语言]
- **对白框**：[位置: 左上/右下等] "对白内容"
- **旁白框**：[位置] "旁白内容"（如有）
- **音效字**：[位置] "音效" [风格: 手写体/印刷体/爆炸体/颤抖体]
- **情绪符号**：[如 💢😤💦❗❓ 等，放在合适位置]
- **格间过渡**：[与下一格的关系：连续/对比/时间跳跃/视角切换]
- **留白/出血**：[是否有出血画面或大面积留白]

#### 格2 [布局]
...

### 本页要点
- **叙事节奏**：[本页的节奏：铺垫/推进/爆发/留白]
- **翻页钩子**：[最后一页的悬念/冲击，驱动读者翻页]

---

**请确保**：
1. 每页有明确的叙事目的和节奏变化
2. 分格大小反映重要程度（重要事件用大格，快速反应用小格）
3. 对白框位置考虑阅读流线，不要遮挡关键画面
4. 音效字风格要与画面情绪匹配
5. 利用翻页制造惊喜和悬念（翻页前后的对比冲击）
6. 条漫格式注意上下滚动的节奏感
7. 适当使用留白和出血增强视觉冲击`,
};

// 结构化模块：角色设定（输出 JSON，单张4视图横向排列角色设定图）
const CHARACTERS_PROMPT = `你是一位专业的影视角色设计师兼编剧顾问。请从用户源文本中提取所有角色，为每个角色生成详细的角色设定卡。严格输出JSON，不要输出JSON以外的任何文字：

{
  "characters": [
    {
      "name": "角色名",
      "role": "叙事功能（主角/对手/导师/盟友/信使/变形者/影子，参考英雄之旅原型）",
      "gender": "性别",
      "age": "年龄或年龄段",
      "appearance": "详细外貌描述（发型/五官/体型/肤色/标志性特征，适合AI生图）",
      "personality": "核心性格特征与标志性动作",
      "costume": "日常/特定场景的服装与随身道具",
      "voiceStyle": "语言风格（口头禅/句式特点/情绪表达方式/方言或特殊用语）",
      "relationships": "与其他角色的关系（如：与XX是师徒，与XX是对手）",
      "arc": "角色弧光（起点状态→转折事件→终点状态）",
      "castingReference": "选角参考（气质类型 + 2-3个参考演员/角色）",
      "imagePromptZh": "用于AI生成【一张】角色设定图(character turnaround sheet)的中文prompt。单图横向1x4排列包含4个视图：从左到右依次为面部上半身特写、正面全身照、侧面全身照、背面全身照。要求：同一角色形象、同一服装风格、白色背景、横向一字排列、细节一致。prompt中必须包含角色的外貌特征(发型/五官/体型/肤色)、服装细节、年龄段。必须在末尾附加上下文中指定的画面风格关键词",
      "imagePromptEn": "用于AI生成一张角色设定图的英文prompt。必须包含：character turnaround reference sheet, 1x4 horizontal layout on white background, left face upper-body close-up showing [面部特征], center-left front full-body view showing [服装], center-right side profile full-body view, right back full-body view, same character same costume consistent design, [年龄段] [性别]。必须在末尾附加上下文中指定的画面风格关键词(style keywords)"
    }
  ]
}

要求：
1. 只输出JSON对象，不要输出任何解释文字
2. 提取原文中所有有名角色，信息不足可基于剧情合理补全
3. imagePromptEn必须全英文，描述一张图含4视图横向排列，必须包含角色的具体外貌和服装关键词
4. 4个视图必须保持同一角色形象一致性
5. voiceStyle和relationships基于原文中角色的实际对白和互动
6. 如果提供了【知识库参考】，角色名和描述需与知识库保持一致
7. imagePromptZh和imagePromptEn末尾必须附加【指定画面风格】中的风格关键词`;

// 结构化模块：场景设定（输出 JSON）
const SCENES_PROMPT = `你是一位专业的影视场景设计师兼声音设计师。请从用户源文本中提取所有重要场景，为每个场景生成详细的设计方案。严格输出JSON，不要输出JSON以外的任何文字：

{
  "scenes": [
    {
      "name": "场景名称",
      "environment": "详细环境描述（空间布局/建筑风格/时代背景/材质质感）",
      "mood": "情绪氛围（如：幽闭不安/温馨明亮/诡异寒意）",
      "lighting": "光照设计（光源方向/光线质感/明暗对比/色温）",
      "timeOfDay": "时间段（日/夜/黄昏/清晨等）",
      "narrativeFunction": "叙事功能（建置/激励/上升/对抗/高潮/释放/尾声）",
      "keyProps": "场景中重要的道具（及其叙事意义）",
      "soundDesign": "声音设计（环境音/特殊音效/BGM方向，如「紧张的弦乐，参考Hans Zimmer」）",
      "colorPalette": "色调建议（主色调和辅助色，适合AI生图）",
      "compositionHint": "构图建议（画面重心/视觉引导线）",
      "imagePromptZh": "用于AI生成场景图的中文prompt。必须包含：场景类型、环境描述、光线设计、氛围情绪、时间段、关键道具、构图建议。末尾标注画幅比例。必须在末尾附加上下文中指定的画面风格关键词",
      "imagePromptEn": "用于AI生成场景图的英文prompt。必须包含：scene type, environment description, lighting design, atmosphere, time of day, key props, composition, 末尾标注画幅比例(如 16:9)。必须在末尾附加上下文中指定的画面风格关键词(style keywords)"
    }
  ]
}

要求：
1. 只输出JSON对象，不要输出任何解释文字
2. 为每个出现独立空间/地点的场景生成设计
3. imagePromptEn必须全英文，包含环境/光线/氛围/时间/构图等关键词
4. soundDesign要具体，不要泛泛写"配乐"
5. 如果提供了【知识库参考】，场景名和描述需与知识库保持一致
6. imagePromptZh和imagePromptEn末尾必须附加【指定画面风格】中的风格关键词`;

// 结构化模块：分镜脚本（输出 JSON）
const STORYBOARD_PROMPT = `你是一位专业的分镜师、故事版艺术家兼剪辑师。请将用户源文本拆分为分镜脚本，按叙事目的分组，为每个分镜生成中英文AI视频提示词。分镜需与短剧脚本联动，标注对应的场景和对白，以支撑多个分镜拼接为长视频。严格输出JSON，不要输出JSON以外的任何文字：

{
  "shots": [
    {
      "episode": 1,
      "sceneNo": 1,
      "shotNo": 1,
      "shotType": "景别（远景/全景/中景/近景/特写/大特写）",
      "cameraAngle": "机位角度（平视/俯拍/仰拍/斜角/主观镜头/过肩）",
      "cameraMove": "镜头运动（固定/推/拉/摇/移/跟/升降/手持/斯坦尼康）",
      "visual": "详细画面描述（镜头看到什么，构图和内容）",
      "dialogue": "对白原文（从短剧脚本中提取对应台词，无则留空字符串）",
      "subtitle": "字幕文本（用于视频后期叠加的字幕，如果有对白则取对白原文，无对白则可写旁白或空）",
      "action": "角色动作与镜头运动描述（必须详细描述角色的具体动作：走动/转身/抬头/抬手等，这是视频生成的关键运动信息）",
      "duration": 5,
      "emotion": "情感强度1-10（1=平静，10=极致情感）",
      "characterNames": ["出场角色名，必须与角色参考卡中的name完全一致"],
      "sceneName": "场景名，必须与场景参考卡中的name完全一致",
      "narrativePurpose": "本镜的叙事目的（如：建立氛围/推进情节/揭示信息/情感爆发/留白悬念）",
      "prevShotTransition": "与上一镜的衔接方式（无/硬切/叠化/跳切/匹配剪辑/声音桥接/动作接动作）",
      "nextShotTransition": "与下一镜的衔接方式（硬切/叠化/跳切/匹配剪辑/声音桥接/动作接动作）",
      "continuityNote": "连贯性说明（描述本镜与前后镜在角色位置/服装/光线/情绪上的衔接关系，确保拼接后视觉连贯，如「林夏从右侧走出，下一镜应从左侧入画」）",
      "soundDesign": "声音层次（环境音/动作音效/BGM变化/情绪音效，如「电流嗡鸣+心跳加速+低频弦乐渐强」）",
      "promptZh": "融合角色外貌与场景环境的中文AI视频提示词。必须包含：景别、出场角色的外貌特征(从角色参考卡提取发型/肤色/服装等)、场景环境(从场景参考卡提取环境/光线/氛围)、角色的具体动作(走动/转身/抬头等)、镜头运动、光影氛围、情绪基调、画幅比例",
      "promptEn": "融合角色外貌与场景环境的英文AI视频提示词。必须包含：shot type(景别), character appearance(从角色参考卡提取外貌关键词如hair style/skin tone/clothing), scene environment(从场景参考卡提取环境关键词), character action(具体动作如walking/turning/raising hand), camera movement(如slow dolly-in), lighting, mood/atmosphere, aspect ratio(如16:9)。全英文"
    }
  ]
}

要求：
1. 只输出JSON对象，不要输出任何解释文字
2. characterNames必须使用角色参考卡中的角色名，sceneName必须使用场景参考卡中的场景名
3. promptEn必须全英文，包含景别/角色外貌/场景环境/具体动作/镜头运动/光影/氛围/画幅比例
4. promptZh和promptEn必须融合角色外貌与场景环境，不能只写空泛描述
5. duration为整数，范围3-8秒
6. shotNo在同一sceneNo内递增
7. 情感强度有起伏变化，不要一直平淡或一直激烈
8. 每个镜头组有明确的叙事目的（narrativePurpose不能为空）
9. 如果提供了【角色参考卡】和【场景参考卡】，prompt中的角色外貌和场景描述必须从中提取关键词
10. promptZh和promptEn末尾必须附加【指定画面风格】中的风格关键词
11. dialogue必须从源文本中提取原始对白，不要自己编造
12. action必须描述具体的、可视化的动作（不是「角色表现出紧张」而是「角色手指反复按键，眉头紧锁」），这是AI视频生成的运动指令
13. continuityNote必须说明与前后镜的衔接关系，确保多个分镜拼接为长视频时视觉连贯
14. 相邻分镜的机位角度和景别要有变化（避免连续两个相同景别+相同角度），创造剪辑节奏感
15. 同一场景内的连续分镜，角色位置和服装必须一致（跨场景才能变化）`;

const KB_EXTRACT_PROMPT = `你是一位文学编辑。请从以下小说/剧本内容中提取角色、场景、道具、时间线信息。严格输出JSON，不要输出其他文字：

{
  "characters": [
    {
      "name": "角色名",
      "aliases": ["别名/绰号/称呼"],
      "description": "角色身份与背景描述",
      "traits": "性格特征",
      "appearance": "外貌描述（发型/五官/体型/肤色等，适合AI生图）",
      "voiceStyle": "说话风格（语气/句式/口头禅）",
      "relationships": "与其他角色的关系"
    }
  ],
  "scenes": [
    {
      "name": "场景名",
      "type": "室内/室外",
      "description": "场景环境描述",
      "mood": "氛围情绪",
      "lighting": "光照特征"
    }
  ],
  "props": [
    {
      "name": "道具名",
      "description": "道具描述",
      "significance": "叙事意义/象征作用"
    }
  ],
  "timeline": [
    {
      "chapter": "章节名（如无法确定则写'未知章节'）",
      "event": "关键事件",
      "time": "故事内时间（如能推断）"
    }
  ]
}

要求：
1. 只输出JSON对象
2. 提取所有有名角色和重要场景、道具
3. 如果提供了【已有角色知识库】，已有的角色用aliases匹配后补充新信息，新角色直接添加
4. 无新信息则对应字段输出空数组
5. timeline的chapter字段尽量标注实际章节标题`;

const PREPROCESS_SEGMENT = `你是文学编辑。请对以下小说/剧本段落生成简洁摘要，提取关键信息，用JSON输出：
{"chapter":"章节标题","summary":"2-3句概括","characters":["角色名"],"scenes":["场景名"],"key_events":["关键事件"],"emotion":"情感基调","time":"故事内时间"}
只输出JSON。`;

const PREPROCESS_SYNTHESIZE = `你是资深编剧顾问。根据以下各段落摘要，生成全局分析报告，用JSON输出：
{"title":"标题","genre":"类型","total_chapters":N,"characters":[{"name":"角色名","role":"主角/配角/反派","appearances":["章节"],"brief":"简介"}],"scenes":[{"name":"场景名","description":"描述","chapters":["章节"]}],"timeline":[{"chapter":"章节","event":"事件","emotion":"情感"}],"conflicts":["冲突"],"themes":["主题"]}
各段落摘要：{summaries}
只输出JSON。`;

// ===================================================================
//  LLM 调用
// ===================================================================
let configCache = null;
function loadConfig() {
  if (configCache) return configCache;
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      configCache = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } else {
      configCache = { providers: [], activeProvider: null, mediaProvider: null };
    }
  } catch { configCache = { providers: [], activeProvider: null, mediaProvider: null }; }
  if (!configCache.providers) configCache.providers = [];
  return configCache;
}
function saveConfig(cfg) { configCache = cfg; fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2)); }

const PRESET_PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek', type: 'llm', baseUrl: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'qwen', name: '通义千问', type: 'llm', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus', models: ['qwen-plus', 'qwen-max', 'qwen-turbo'] },
  { id: 'openai', name: 'OpenAI', type: 'llm', baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  { id: 'mimo', name: 'MiMo', type: 'llm', baseUrl: 'https://api-sgp-oc.xiaomimimo.com/v1', defaultModel: 'mimo-v2.5', models: ['mimo-v2.5'] },
  { id: 'agnes-llm', name: 'Agnes 2.0 Flash', type: 'llm', baseUrl: 'https://apihub.agnes-ai.com/v1', defaultModel: 'agnes-2.0-flash', models: ['agnes-2.0-flash'] },
  { id: 'agnes-media', name: 'Agnes 生图/视频', type: 'media', baseUrl: 'https://apihub.agnes-ai.com/v1', defaultModel: 'agnes-image-2.1-flash', models: ['agnes-image-2.1-flash', 'agnes-video-v2.0'] },
  { id: 'openai-dalle', name: 'OpenAI DALL·E', type: 'media', baseUrl: 'https://api.openai.com/v1', defaultModel: 'dall-e-3', models: ['dall-e-3', 'dall-e-2'] },
];

function getActiveProvider() {
  const cfg = loadConfig();
  if (cfg.activeProvider) {
    const p = cfg.providers.find(x => x.id === cfg.activeProvider);
    if (p && p.apiKey) return p;
  }
  return cfg.providers.find(p => p.apiKey) || null;
}

function getMediaProvider() {
  const cfg = loadConfig();
  if (cfg.mediaProvider) {
    const p = cfg.providers.find(x => x.id === cfg.mediaProvider);
    if (p && p.apiKey) return p;
  }
  return cfg.providers.find(p => p.apiKey && p.id.includes('agnes')) || null;
}

async function withRetry(fn, { maxRetries = 3, timeoutMs = 90000, label = 'API' } = {}) {
  let lastErr;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} 超时(${timeoutMs / 1000}s)`)), timeoutMs))
      ]);
    } catch (err) {
      lastErr = err;
      if (i < maxRetries) {
        const delay = Math.min(2000 * Math.pow(2, i), 10000);
        console.log(`[重试] ${label} 第${i + 1}次失败，${delay}ms后重试: ${err.message}`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

async function callLLM(systemPrompt, userContent, stream, provider) {
  provider = provider || getActiveProvider();
  if (!provider) throw new Error('未配置LLM提供商，请在设置中添加API Key');
  const url = provider.baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const body = {
    model: provider.model || provider.defaultModel,
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
    stream: !!stream,
  };
  return withRetry(async () => {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + provider.apiKey },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`API错误 ${resp.status}: ${txt.slice(0, 300)}`);
    }
    if (!stream) {
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || '';
    }
    return resp.body;
  }, { maxRetries: 2, timeoutMs: 120000, label: 'LLM' });
}

function parseDelta(data) {
  try {
    const p = JSON.parse(data);
    return p.choices?.[0]?.delta?.content || p.choices?.[0]?.delta?.reasoning_content || '';
  } catch { return ''; }
}

async function* streamChunks(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const d = line.slice(6).trim();
      if (d === '[DONE]') continue;
      const delta = parseDelta(d);
      if (delta) yield delta;
    }
  }
}

function parseJSON(text) {
  if (!text) throw new Error('空内容');
  try { return JSON.parse(text); } catch (_) {}
  for (const m of [text.match(/\{[\s\S]*\}/), text.match(/\[[\s\S]*\]/)].filter(Boolean)) {
    try { return JSON.parse(m[0]); } catch (_) {}
  }
  // 去除 markdown 代码块
  const cleaned = text.replace(/```json\n?|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch (_) {}
  for (const m of [cleaned.match(/\{[\s\S]*\}/), cleaned.match(/\[[\s\S]*\]/)].filter(Boolean)) {
    try { return JSON.parse(m[0]); } catch (_) {}
  }
  throw new Error('模型输出格式异常，无法解析为JSON');
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function maskKey(k) { return k ? k.slice(0, 4) + '****' + k.slice(-4) : ''; }

// ===================================================================
//  项目存储
// ===================================================================
function projectPath(id) { return path.join(PROJECTS_DIR, id + '.json'); }
function loadProject(id) {
  const fp = projectPath(id);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}
function saveProject(p) {
  p.updatedAt = new Date().toISOString();
  fs.writeFileSync(projectPath(p.id), JSON.stringify(p, null, 2));
}

// ===================================================================
//  知识库
// ===================================================================
function buildKnowledgeContext(kb) {
  if (!kb) return '';
  const parts = [];
  if (kb.characters?.length) {
    parts.push('【已有角色知识库(请保持一致)】');
    kb.characters.forEach(c => parts.push(`- ${c.name}${c.aliases?.length ? '(别名:' + c.aliases.join(',') + ')' : ''}：${c.description||''}，性格:${c.traits||''}，外貌:${c.appearance||''}`));
  }
  if (kb.scenes?.length) {
    parts.push('【已有场景知识库】');
    kb.scenes.forEach(s => parts.push(`- ${s.name}(${s.type||''})：${s.description||''}，氛围:${s.mood||''}`));
  }
  if (kb.props?.length) {
    parts.push('已知道具】');
    kb.props.forEach(p => parts.push(`- ${p.name}：${p.description||''}`));
  }
  return parts.join('\n');
}

function mergeKnowledge(existing, incoming, chapterTitle) {
  const merged = JSON.parse(JSON.stringify(existing || { characters: [], scenes: [], props: [], timeline: [] }));
  for (const type of ['characters', 'scenes', 'props']) {
    for (const ent of (incoming[type] || [])) {
      const idx = (merged[type] || []).findIndex(e => e.name === ent.name || (e.aliases?.includes(ent.name)) || (ent.aliases?.includes(e.name)));
      if (idx >= 0) {
        for (const [k, v] of Object.entries(ent)) { if (v && v !== '' && !(Array.isArray(v) && !v.length)) merged[type][idx][k] = v; }
      } else {
        ent.id = genId(); ent.sourceChapter = chapterTitle;
        merged[type].push(ent);
      }
    }
  }
  if (incoming.timeline?.length) { merged.timeline = merged.timeline || []; merged.timeline.push(...incoming.timeline); }
  return merged;
}

async function extractKnowledgeFromText(content, existingKb) {
  const ctx = buildKnowledgeContext(existingKb);
  const full = ctx ? `${ctx}\n\n---\n\n${content}` : content;
  const raw = await callLLM(KB_EXTRACT_PROMPT, full, false);
  return parseJSON(raw);
}

// ===================================================================
//  文本分段
// ===================================================================
function splitText(text, maxChunk = 3000) {
  const chapterRegex = /^(第[一二三四五六七八九十百千零\d]+[章节回卷集部篇]|Chapter\s+\d+|CHAPTER\s+\d+|\d+\.|【.+】)/m;
  const lines = text.split('\n');
  const chunks = []; let cur = '';
  for (const line of lines) {
    if (chapterRegex.test(line) && cur.length > 500) { chunks.push(cur.trim()); cur = line + '\n'; }
    else cur += line + '\n';
    if (cur.length > maxChunk) { chunks.push(cur.trim()); cur = ''; }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

// ===================================================================
//  API: 视觉风格
// ===================================================================
app.get('/api/styles', (req, res) => {
  res.json(VISUAL_STYLES.map(s => ({ key: s.key, label: s.label, desc: s.desc, promptSuffix: s.promptSuffix, negativePrompt: s.negativePrompt })));
});

// ===================================================================
//  API: 项目管理
// ===================================================================
app.get('/api/projects', (req, res) => {
  const all = fs.readdirSync(PROJECTS_DIR).filter(f => f.endsWith('.json')).map(f => {
    try {
      const p = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, f), 'utf8'));
      return { id: p.id, name: p.name, style: p.style, chapterCount: (p.chapters||[]).length, updatedAt: p.updatedAt, createdAt: p.createdAt };
    } catch { return null; }
  }).filter(Boolean).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ items: all, total: all.length });
});

app.post('/api/projects', (req, res) => {
  const { name, style, content } = req.body;
  const now = new Date().toISOString();
  const p = {
    id: 'proj_' + genId(), name: name || '未命名项目', style: style || 'cinematic',
    content: content || '', chapters: [], knowledge: { characters: [], scenes: [], props: [], timeline: [] },
    results: {}, mediaItems: [], snapshots: [], createdAt: now, updatedAt: now,
  };
  saveProject(p); res.json(p);
});

app.get('/api/projects/:id', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  res.json(p);
});

app.put('/api/projects/:id', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  for (const k of ['name', 'style', 'content', 'chapters', 'knowledge', 'results', 'mediaItems']) {
    if (req.body[k] !== undefined) p[k] = req.body[k];
  }
  saveProject(p); res.json(p);
});

app.delete('/api/projects/:id', (req, res) => {
  const fp = projectPath(req.params.id);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  res.json({ ok: true });
});

app.post('/api/projects/import', (req, res) => {
  const data = req.body;
  if (!data.name) return res.status(400).json({ error: '缺少项目名称' });
  const now = new Date().toISOString();
  data.id = 'proj_' + genId(); data.createdAt = now; data.updatedAt = now;
  data.chapters = data.chapters || []; data.knowledge = data.knowledge || { characters: [], scenes: [], props: [], timeline: [] };
  data.results = data.results || {}; data.mediaItems = data.mediaItems || []; data.snapshots = [];
  saveProject(data); res.json(data);
});

app.get('/api/projects/:id/export-md', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  const names = { structure: '📐剧情结构', summary: '📊制作分析', characters: '🎭角色设定', scenes: '🏞️场景设计', storyboard: '🎬分镜脚本', script: '📝短剧脚本', assets: '🎨视觉资产', manga: '📖漫画脚本' };
  let md = `# ${p.name}\n\n> 风格：${getStyle(p.style).label} | 更新：${p.updatedAt}\n\n---\n\n## 原文\n\n${p.content || ''}\n\n---\n\n`;
  for (const [k, title] of Object.entries(names)) {
    if (p.results?.[k]) {
      md += `## ${title}\n\n${typeof p.results[k] === 'string' ? p.results[k] : JSON.stringify(p.results[k], null, 2)}\n\n---\n\n`;
    }
  }
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(p.name)}.md"`);
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.send(md);
});

// ===================================================================
//  API: 章节管理
// ===================================================================
app.post('/api/projects/:id/chapters/import', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  const { content, group } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: '请输入内容' });
  const regex = /^(第[一二三四五六七八九十百千零\d]+[章节回卷集部篇]|Chapter\s+\d+|CHAPTER\s+\d+)/gm;
  const indices = []; let m;
  while ((m = regex.exec(content)) !== null) indices.push({ title: m[1].trim(), index: m.index });
  const splits = indices.length === 0
    ? [{ title: '全文', content: content.trim() }]
    : indices.map((it, i) => ({ title: it.title, content: content.slice(it.index, indices[i + 1]?.index || content.length).trim() }));
  if (!p.chapters) p.chapters = [];
  splits.forEach((s, i) => p.chapters.push({ id: 'ch_' + genId(), title: s.title, content: s.content, group: group || '', order: p.chapters.length + i, analysis: {}, createdAt: new Date().toISOString() }));
  saveProject(p);
  res.json({ imported: splits.length, total: p.chapters.length });
});

// 单章节添加
app.post('/api/projects/:id/chapters', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  const { title, content, group } = req.body;
  if (!title) return res.status(400).json({ error: '缺少章节标题' });
  if (!p.chapters) p.chapters = [];
  const ch = { id: 'ch_' + genId(), title, content: content || '', group: group || '', order: p.chapters.length, analysis: {}, createdAt: new Date().toISOString() };
  p.chapters.push(ch); saveProject(p);
  res.json(ch);
});

// 更新章节
app.put('/api/projects/:id/chapters/:chId', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  const ch = (p.chapters || []).find(c => c.id === req.params.chId);
  if (!ch) return res.status(404).json({ error: '章节不存在' });
  for (const k of ['title', 'content', 'group', 'order']) if (req.body[k] !== undefined) ch[k] = req.body[k];
  saveProject(p); res.json(ch);
});

// 删除章节
app.delete('/api/projects/:id/chapters/:chId', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  p.chapters = (p.chapters || []).filter(c => c.id !== req.params.chId);
  saveProject(p); res.json({ ok: true });
});

// ===================================================================
//  API: 知识库
// ===================================================================
app.get('/api/projects/:id/knowledge', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  res.json(p.knowledge || { characters: [], scenes: [], props: [], timeline: [] });
});

app.put('/api/projects/:id/knowledge', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  p.knowledge = req.body; saveProject(p); res.json(p.knowledge);
});

// ===================================================================
//  API: 预处理（SSE）
// ===================================================================
app.post('/api/preprocess', async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: '请输入内容' });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = d => res.write(`data: ${JSON.stringify(d)}\n\n`);
  try {
    send({ status: 'splitting', message: '正在分段...' });
    const chunks = splitText(content);
    send({ status: 'split_done', total: chunks.length });
    const segs = [];
    for (let i = 0; i < chunks.length; i++) {
      send({ status: 'summarizing', progress: i + 1, total: chunks.length });
      try {
        const r = await callLLM(PREPROCESS_SEGMENT, chunks[i], false);
        const j = parseJSON(r);
        segs.push(j); send({ status: 'segment_done', index: i, data: j });
      } catch (e) {
        segs.push({ chapter: `段落${i + 1}`, summary: '失败', characters: [], scenes: [], key_events: [], emotion: '未知', time: '' });
        send({ status: 'segment_error', index: i, error: e.message });
      }
    }
    send({ status: 'synthesizing', message: '综合分析中...' });
    let global = {};
    try {
      const summaries = segs.map((s, i) => `【${s.chapter || '段落' + (i + 1)}】摘要:${s.summary} 角色:${(s.characters||[]).join(',')} 场景:${(s.scenes||[]).join(',')} 事件:${(s.key_events||[]).join(',')} 情感:${s.emotion}`).join('\n\n');
      const syn = await callLLM(PREPROCESS_SYNTHESIZE.replace('{summaries}', summaries), '', false);
      global = parseJSON(syn);
    } catch (e) { send({ status: 'synthesis_error', error: e.message }); }
    send({ status: 'done', segments: segs, global });
  } catch (e) {
    send({ error: e.message });
  }
  res.write('data: [DONE]\n\n'); res.end();
});

// ===================================================================
//  API: 分析（SSE）— 单模块
// ===================================================================
app.post('/api/analyze', async (req, res) => {
  const { type, content, visualStyle, projectId, characters, scenes } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: '请输入内容' });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = d => res.write(`data: ${JSON.stringify(d)}\n\n`);
  const pingI = setInterval(() => { try { res.write(':ping\n\n'); } catch {} }, 15000);
  req.on('close', () => clearInterval(pingI));

  try {
    const p = projectId ? loadProject(projectId) : null;
    let kbCtx = p ? buildKnowledgeContext(p.knowledge) : '';

    // 结构化模块需要角色/场景上下文
    let settingCtx = '';
    if (type === 'storyboard' && characters?.length) {
      settingCtx += '\n\n【角色参考卡】\n' + characters.map((c, i) => `[角色${i + 1}] 名:${c.name} | 外貌:${c.appearance} | 服装:${c.costume} | 性格:${c.personality}`).join('\n');
    }
    if (type === 'storyboard' && scenes?.length) {
      settingCtx += '\n【场景参考卡】\n' + scenes.map((s, i) => `[场景${i + 1}] 名:${s.name} | 环境:${s.environment} | 氛围:${s.mood} | 光照:${s.lighting} | 时间:${s.timeOfDay}`).join('\n');
    }

    let finalContent = content;
    if (kbCtx) finalContent = `【知识库参考】\n${kbCtx}\n\n---\n\n${finalContent}`;
    if (settingCtx) finalContent += settingCtx;
    if (visualStyle) finalContent += getStyleContext(visualStyle);

    send({ status: 'start', type });

    let parsed = null, mdText = '';
    // 结构化模块（非流式，需整体解析JSON）
    if (type === 'characters' || type === 'scenes' || type === 'storyboard') {
      const promptMap = { characters: CHARACTERS_PROMPT, scenes: SCENES_PROMPT, storyboard: STORYBOARD_PROMPT };
      const raw = await callLLM(promptMap[type], finalContent, false);
      parsed = parseJSON(raw);
      send({ status: 'done', type, result: parsed });
    } else {
      // Markdown 模块 — 流式传输，实时推送生成内容
      if (!PROMPTS[type]) throw new Error('不支持的分析类型: ' + type);
      const stream = await callLLM(PROMPTS[type], finalContent, true);
      mdText = '';
      for await (const delta of streamChunks(stream)) {
        mdText += delta;
        send({ status: 'streaming', type, content: delta });
      }
      send({ status: 'done', type, result: mdText });
    }

    // 保存到项目
    if (p) {
      if (!p.results) p.results = {};
      p.results[type] = parsed || mdText;
      // 知识库自动提取（首次分析角色时）
      if (type === 'characters' && (!p.knowledge || !p.knowledge.characters?.length)) {
        try {
          const extracted = await extractKnowledgeFromText(content, p.knowledge);
          p.knowledge = mergeKnowledge(p.knowledge, extracted, '自动提取');
        } catch (e) { console.log('KB extract failed:', e.message); }
      }
      saveProject(p);
    }
  } catch (e) {
    send({ status: 'error', type, error: e.message });
  }
  clearInterval(pingI);
  res.write('data: [DONE]\n\n'); res.end();
});

// ===================================================================
//  API: 批量分析（SSE）
// ===================================================================
app.post('/api/analyze-all', async (req, res) => {
  const { content, visualStyle, projectId, modules } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: '请输入内容' });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = d => res.write(`data: ${JSON.stringify(d)}\n\n`);
  const pingI = setInterval(() => { try { res.write(':ping\n\n'); } catch {} }, 15000);
  req.on('close', () => clearInterval(pingI));

  const allTypes = modules || ['structure', 'summary', 'characters', 'scenes', 'storyboard', 'script', 'assets', 'manga'];
  try {
    const p = projectId ? loadProject(projectId) : null;
    let kbCtx = p ? buildKnowledgeContext(p.knowledge) : '';
    let finalContent = content;
    if (kbCtx) finalContent = `【知识库参考】\n${kbCtx}\n\n---\n\n${finalContent}`;
    if (visualStyle) finalContent += getStyleContext(visualStyle);

    // 先生成角色与场景，分镜依赖它们
    const order = ['structure', 'summary', 'characters', 'scenes', 'storyboard', 'script', 'assets', 'manga'].filter(t => allTypes.includes(t));
    let chars = [], scns = [];
    for (const type of order) {
      send({ status: 'module_start', type });
      try {
        let contentForType = finalContent;
        if (type === 'storyboard') {
          if (chars.length) contentForType += '\n\n【角色参考卡】\n' + chars.map((c, i) => `[角色${i+1}] 名:${c.name}|外貌:${c.appearance}|服装:${c.costume}|性格:${c.personality}`).join('\n');
          if (scns.length) contentForType += '\n【场景参考卡】\n' + scns.map((s, i) => `[场景${i+1}] 名:${s.name}|环境:${s.environment}|氛围:${s.mood}|光照:${s.lighting}|时间:${s.timeOfDay}`).join('\n');
        }
        if (type === 'characters' || type === 'scenes' || type === 'storyboard') {
          const promptMap = { characters: CHARACTERS_PROMPT, scenes: SCENES_PROMPT, storyboard: STORYBOARD_PROMPT };
          const raw = await callLLM(promptMap[type], contentForType, false);
          const parsed = parseJSON(raw);
          if (type === 'characters') chars = parsed.characters || [];
          if (type === 'scenes') scns = parsed.scenes || [];
          send({ status: 'module_done', type, result: parsed });
          if (p) { p.results = p.results || {}; p.results[type] = parsed; saveProject(p); }
        } else {
          if (!PROMPTS[type]) { send({ status: 'module_error', type, error: '未知模块' }); continue; }
          // 流式传输，实时推送生成内容
          const stream = await callLLM(PROMPTS[type], contentForType, true);
          let buf = '';
          for await (const delta of streamChunks(stream)) {
            buf += delta;
            send({ status: 'module_streaming', type, content: delta });
          }
          send({ status: 'module_done', type, result: buf });
          if (p) { p.results = p.results || {}; p.results[type] = buf; saveProject(p); }
        }
      } catch (e) {
        send({ status: 'module_error', type, error: e.message });
      }
    }
    send({ status: 'all_done' });
  } catch (e) {
    send({ status: 'error', error: e.message });
  }
  clearInterval(pingI);
  res.write('data: [DONE]\n\n'); res.end();
});

// ===================================================================
//  API: 一致性检查（SSE）
// ===================================================================
app.post('/api/check-consistency', async (req, res) => {
  const { results, knowledge } = req.body;
  if (!results) return res.status(400).json({ error: '没有分析结果' });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = d => res.write(`data: ${JSON.stringify(d)}\n\n`);
  try {
    const names = { structure: '剧情结构', summary: '制作分析', characters: '角色设定', scenes: '场景设计', storyboard: '分镜脚本', script: '短剧脚本', assets: '视觉资产', manga: '漫画脚本' };
    let combined = knowledge ? `【知识库】\n${JSON.stringify(knowledge, null, 2)}\n\n` : '';
    for (const [k, name] of Object.entries(names)) {
      if (results[k]) combined += `\n\n=== ${name} ===\n${typeof results[k] === 'string' ? results[k] : JSON.stringify(results[k], null, 2)}`;
    }
    const prompt = `你是一位影视制作的质量控制专家。请检查以下各分析模块之间的一致性问题，输出Markdown格式的报告：

## 🔍 一致性检查报告

### 检查结果概览
- **检查项总数**：X
- **通过**：X
- **警告**：X
- **错误**：X

### 检查详情

#### 1. 角色一致性
检查各模块中角色描述是否一致：
- [角色名]：
  - 角色设定 vs 分镜脚本：✅一致 / ⚠️警告 [具体差异]
  - 角色设定 vs 短剧脚本：✅一致 / ⚠️警告 [具体差异]

#### 2. 场景一致性
检查各模块中场景描述是否一致：
- [场景名]：
  - 场景设计 vs 分镜脚本：✅一致 / ⚠️警告 [具体差异]
  - 场景设计 vs 短剧脚本：✅一致 / ⚠️警告 [具体差异]

#### 3. 情节逻辑
检查剧情结构与脚本的逻辑连贯性：
- 转折点是否在脚本中体现：✅/❌
- 情感曲线是否与分镜匹配：✅/⚠️

#### 4. 时间线
检查时间线是否合理：
- 时间顺序是否连贯：✅/⚠️
- 是否有时间矛盾：✅/❌

#### 5. 视觉资产一致性
检查生图Prompt是否与角色设定和场景设计匹配：
- 角色立绘Prompt vs 角色设定：✅/⚠️
- 场景图Prompt vs 场景设计：✅/⚠️

#### 6. 修改建议
对每个警告/错误给出具体修改建议：
- [模块名] [位置]：建议修改为 [具体内容]

请基于实际内容进行检查，不要泛泛而谈。`;
    const stream = await callLLM(prompt, combined, true);
    for await (const delta of streamChunks(stream)) send({ content: delta });
  } catch (e) { send({ error: e.message }); }
  res.write('data: [DONE]\n\n'); res.end();
});

// ===================================================================
//  API: AI 生图/生视频
// ===================================================================
app.post('/api/generate/image', async (req, res) => {
  const { prompt, negativePrompt, size, visualStyle, images } = req.body;
  if (!prompt) return res.status(400).json({ error: '请提供prompt' });
  const provider = getMediaProvider();
  if (!provider) return res.status(400).json({ error: '未配置图像生成提供商' });
  const styledNeg = getStyleNegative(visualStyle, negativePrompt);
  try {
    const url = provider.baseUrl.replace(/\/+$/, '') + '/images/generations';
    const extraBody = { response_format: 'url' };
    // 图生图：传入参考图片
    if (images && images.length > 0) extraBody.image = images;
    const body = {
      model: provider.model?.includes('agnes') ? 'agnes-image-2.1-flash' : (provider.model || 'agnes-image-2.1-flash'),
      prompt: styledNeg ? `${prompt} [negative: ${styledNeg}]` : prompt,
      size: size || '1024x768',
      extra_body: extraBody,
    };
    const r = await withRetry(async () => {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + provider.apiKey }, body: JSON.stringify(body) });
      if (!resp.ok) throw new Error(`图片API错误 ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
      const d = await resp.json();
      return d.data?.[0]?.url || d.data?.[0]?.b64_json || '';
    }, { maxRetries: 3, timeoutMs: 180000, label: '图片生成' });
    res.json({ ok: true, url: r });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.post('/api/generate/video', async (req, res) => {
  const { prompt, visualStyle, negativePrompt, image, height, width, num_frames, frame_rate, mode } = req.body;
  if (!prompt) return res.status(400).json({ error: '请提供prompt' });
  const provider = getMediaProvider();
  if (!provider) return res.status(400).json({ error: '未配置视频生成提供商' });
  try {
    const url = provider.baseUrl.replace(/\/+$/, '') + '/videos';
    const body = {
      model: 'agnes-video-v2.0',
      prompt,
      height: height || 768,
      width: width || 1152,
      num_frames: num_frames || 121,  // 8n+1: 81(3s)/121(5s)/241(10s)/441(18s)
      frame_rate: frame_rate || 24,
    };
    // 图生视频
    if (image) body.image = image;
    // 关键帧模式
    if (mode === 'keyframes' && req.body.images) {
      body.extra_body = { image: req.body.images, mode: 'keyframes' };
    }
    if (negativePrompt) body.negative_prompt = negativePrompt;
    const r = await withRetry(async () => {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + provider.apiKey }, body: JSON.stringify(body) });
      if (!resp.ok) throw new Error(`视频API错误 ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
      return resp.json();
    }, { maxRetries: 2, timeoutMs: 60000, label: '视频任务' });
    res.json({ ok: true, ...r });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.get('/api/generate/video/:videoId', async (req, res) => {
  const provider = getMediaProvider();
  if (!provider) return res.status(400).json({ error: '未配置提供商' });
  try {
    const baseRoot = provider.baseUrl.replace(/\/v1\/?$/, '');
    const resp = await fetch(`${baseRoot}/agnesapi?video_id=${req.params.videoId}&model_name=agnes-video-v2.0`, { headers: { 'Authorization': 'Bearer ' + provider.apiKey } });
    if (resp.status === 429) {
      // 限流：返回 retry 状态让前端等待后重试，而非报错
      res.json({ ok: true, status: 'in_progress', progress: -1, rate_limited: true });
      return;
    }
    if (!resp.ok) throw new Error(`查询错误 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    res.json({ ok: true, ...(await resp.json()) });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ===================================================================
//  API: 配置
// ===================================================================
app.get('/api/config/llm', (req, res) => {
  const cfg = loadConfig();
  res.json({
    providers: cfg.providers.map(p => ({ ...p, apiKey: maskKey(p.apiKey) })),
    activeProvider: cfg.activeProvider,
    mediaProvider: cfg.mediaProvider,
    presets: PRESET_PROVIDERS,
  });
});

app.put('/api/config/llm', (req, res) => {
  const cfg = loadConfig();
  const { providers, activeProvider, mediaProvider } = req.body;
  if (providers) {
    // 保留旧 key（前端传来的是脱敏的）
    const oldMap = {}; cfg.providers.forEach(p => oldMap[p.id] = p.apiKey);
    cfg.providers = providers.map(p => ({ ...p, apiKey: (p.apiKey && !p.apiKey.includes('****')) ? p.apiKey : (oldMap[p.id] || '') }));
  }
  if (activeProvider !== undefined) cfg.activeProvider = activeProvider;
  if (mediaProvider !== undefined) cfg.mediaProvider = mediaProvider;
  saveConfig(cfg);
  res.json({ ok: true, providers: cfg.providers.map(p => ({ ...p, apiKey: maskKey(p.apiKey) })), activeProvider: cfg.activeProvider, mediaProvider: cfg.mediaProvider });
});

app.post('/api/config/llm/test', async (req, res) => {
  const { baseUrl, apiKey, model } = req.body;
  if (!baseUrl || !apiKey) return res.status(400).json({ error: '参数不全' });
  try {
    const resp = await fetch(baseUrl.replace(/\/+$/, '') + '/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ model: model || 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] }),
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) return res.json({ ok: false, error: `HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}` });
    const d = await resp.json();
    res.json({ ok: !!d.choices?.[0], reply: d.choices?.[0]?.message?.content || '' });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ===================================================================
//  API: 版本快照
// ===================================================================
app.post('/api/projects/:id/snapshot', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  if (!p.snapshots) p.snapshots = [];
  if (p.snapshots.length >= 20) return res.status(400).json({ error: '快照已达上限(20)' });
  const snap = { id: genId(), label: req.body.label || `快照${p.snapshots.length + 1}`, timestamp: new Date().toISOString(), data: { content: p.content, chapters: JSON.parse(JSON.stringify(p.chapters||[])), knowledge: JSON.parse(JSON.stringify(p.knowledge||{})), results: JSON.parse(JSON.stringify(p.results||{})), style: p.style } };
  p.snapshots.push(snap); saveProject(p);
  res.json({ ok: true, id: snap.id, label: snap.label, timestamp: snap.timestamp });
});

app.get('/api/projects/:id/snapshots', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  res.json((p.snapshots || []).map(s => ({ id: s.id, label: s.label, timestamp: s.timestamp })));
});

app.post('/api/projects/:id/snapshots/:snId/restore', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  const snap = (p.snapshots || []).find(s => s.id === req.params.snId);
  if (!snap) return res.status(404).json({ error: '快照不存在' });
  // 恢复前自动保存
  p.snapshots.push({ id: genId(), label: '恢复前自动保存', timestamp: new Date().toISOString(), data: { content: p.content, chapters: JSON.parse(JSON.stringify(p.chapters||[])), knowledge: JSON.parse(JSON.stringify(p.knowledge||{})), results: JSON.parse(JSON.stringify(p.results||{})), style: p.style } });
  p.content = snap.data.content; p.chapters = snap.data.chapters; p.knowledge = snap.data.knowledge; p.results = snap.data.results; p.style = snap.data.style;
  saveProject(p); res.json(p);
});

app.listen(PORT, '0.0.0.0', () => {
  const cfg = loadConfig();
  const active = cfg.providers.find(p => p.id === cfg.activeProvider);
  console.log(`短剧脚本工坊已启动: http://localhost:${PORT}`);
  console.log(`当前LLM: ${active?.name || '未配置'}`);
});
