const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3456;

const DATA_DIR = path.join(__dirname, 'data');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
[DATA_DIR, PROJECTS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

app.use(express.json({ limit: '10mb' }));
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

  manga: `你是一位专业的漫画分镜师和漫剧编剧，精通漫画叙事语言和分格构图。请根据用户提供的小说/剧本内容，生成漫画/漫剧脚本。严格输出JSON，不要输出JSON以外的任何文字：

{
  "title": "漫画名",
  "totalPages": 5,
  "styleType": "日漫/韩漫/国漫/美漫/条漫",
  "platform": "快看/哔哩哔哩漫画/抖音条漫/Webtoon",
  "readingDirection": "right-to-left / left-to-right / top-to-bottom",
  "synopsis": "整体故事线概述（2-3句）",
  "pages": [
    {
      "pageNum": 1,
      "narrativePace": "铺垫/推进/爆发/留白",
      "pageHook": "本页结尾的翻页钩子（悬念/冲击）",
      "panels": [
        {
          "panelNum": 1,
          "layout": "2x1左 / 1x1 / 2x2 / 不规则大格 / 出血",
          "sizeHint": "大格(重要) / 中格 / 小格(快速反应)",
          "sceneDesc": "详细的画面构图和内容描述",
          "characterExpressions": "角色的面部表情和肢体语言",
          "dialogue": [{"position": "左上/右下", "speaker": "角色名", "text": "对白内容"}],
          "narration": {"position": "右上", "text": "旁白内容"},
          "soundEffect": {"text": "音效文字", "style": "手写体/印刷体/爆炸体/颤抖体", "position": "位置"},
          "emotionSymbols": ["💢", "❗"],
          "transitionToNext": "连续/对比/时间跳跃/视角切换",
          "imagePromptZh": "用于AI生成该格漫画画面的中文prompt。必须包含：画面构图、角色表情动作、场景环境、光影氛围、对话框位置示意。如果是条漫则标注竖向滚动。必须在末尾附加上下文中指定的画面风格关键词",
          "imagePromptEn": "用于AI生成该格漫画画面的英文prompt。必须包含：comic panel, [layout description], character [expression] [pose], scene [environment], [lighting] atmosphere, dialogue bubble [position], sound effect text。必须在末尾附加上下文中指定的画面风格关键词(style keywords)。单格漫画画面，不要包含其他格的内容"
        }
      ]
    }
  ]
}

要求：
1. 只输出JSON对象，不要输出任何解释文字
2. 每页有明确的叙事目的和节奏变化
3. 分格大小反映重要程度（重要事件用大格，快速反应用小格）
4. 对白框位置考虑阅读流线，不要遮挡关键画面
5. 音效字风格要与画面情绪匹配
6. 利用翻页制造惊喜和悬念（翻页前后的对比冲击）
7. 条漫格式注意上下滚动的节奏感
8. 适当使用留白和出血增强视觉冲击
9. imagePromptEn必须全英文，描述单格漫画画面，必须包含漫画风格关键词
10. imagePromptZh和imagePromptEn末尾必须附加【指定画面风格】中的风格关键词
11. 如果提供了【知识库参考】，角色名和描述需与知识库保持一致`,
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
      configCache = { providers: [], activeProvider: null, imageProvider: null, videoProvider: null };
    }
  } catch { configCache = { providers: [], activeProvider: null, imageProvider: null, videoProvider: null }; }
  if (!configCache.providers) configCache.providers = [];
  return configCache;
}
function saveConfig(cfg) { configCache = cfg; fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2)); }

const PROVIDER_FIELDS = ['id', 'type', 'name', 'model', 'baseUrl', 'defaultModel', 'models'];
function sanitizeProviderInput(input, existingProvider) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw httpError(400, 'Provider 配置格式无效');
  const provider = {};
  for (const field of PROVIDER_FIELDS) if (input[field] !== undefined) provider[field] = input[field];
  if (!provider.id || !provider.type || !provider.name || !provider.baseUrl) throw httpError(400, 'Provider 缺少必要字段');
  validateProviderBaseUrl(provider.baseUrl);
  const submittedKey = typeof input.apiKey === 'string' ? input.apiKey : '';
  const hasRealKey = submittedKey && !submittedKey.includes('****');
  if (existingProvider && existingProvider.baseUrl !== provider.baseUrl && !hasRealKey) {
    throw httpError(400, '修改 Provider baseUrl 时必须重新提交 API Key');
  }
  provider.apiKey = hasRealKey ? submittedKey : (existingProvider?.apiKey || '');
  return provider;
}

// 向后兼容：旧 agnes-media (type:'media') 自动拆分为 agnes-image + agnes-video
function migrateConfig() {
  const cfg = loadConfig();
  let changed = false;
  // 旧 mediaProvider 迁移到 imageProvider/videoProvider
  if (cfg.mediaProvider && !cfg.imageProvider && !cfg.videoProvider) {
    cfg.imageProvider = cfg.mediaProvider;
    cfg.videoProvider = cfg.mediaProvider;
    changed = true;
  }
  // 旧 agnes-media provider 拆分为 agnes-image + agnes-video
  const oldAgnesMedia = cfg.providers.find(p => p.id === 'agnes-media');
  if (oldAgnesMedia && !cfg.providers.find(p => p.id === 'agnes-image')) {
    const apiKey = oldAgnesMedia.apiKey;
    cfg.providers.push({ id: 'agnes-image', name: 'Agnes 生图', type: 'image', baseUrl: oldAgnesMedia.baseUrl, model: 'agnes-image-2.1-flash', apiKey });
    cfg.providers.push({ id: 'agnes-video', name: 'Agnes 生视频', type: 'video', baseUrl: oldAgnesMedia.baseUrl, model: 'agnes-video-v2.0', apiKey });
    // 更新引用
    if (cfg.imageProvider === 'agnes-media') cfg.imageProvider = 'agnes-image';
    if (cfg.videoProvider === 'agnes-media') cfg.videoProvider = 'agnes-video';
    // 删除旧的合并 provider
    cfg.providers = cfg.providers.filter(p => p.id !== 'agnes-media');
    changed = true;
  }
  // 旧 type:'media' 自定义 provider → 标记为 image
  cfg.providers.forEach(p => { if (p.type === 'media') { p.type = 'image'; changed = true; } });
  if (changed) saveConfig(cfg);
  return cfg;
}

const PRESET_PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek', type: 'llm', baseUrl: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'qwen', name: '通义千问', type: 'llm', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus', models: ['qwen-plus', 'qwen-max', 'qwen-turbo'] },
  { id: 'openai', name: 'OpenAI', type: 'llm', baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  { id: 'mimo', name: 'MiMo', type: 'llm', baseUrl: 'https://api-sgp-oc.xiaomimimo.com/v1', defaultModel: 'mimo-v2.5', models: ['mimo-v2.5'] },
  { id: 'agnes-llm', name: 'Agnes 2.0 Flash', type: 'llm', baseUrl: 'https://apihub.agnes-ai.com/v1', defaultModel: 'agnes-2.0-flash', models: ['agnes-2.0-flash'] },
  { id: 'agnes-image', name: 'Agnes 生图', type: 'image', baseUrl: 'https://apihub.agnes-ai.com/v1', defaultModel: 'agnes-image-2.1-flash', models: ['agnes-image-2.1-flash'] },
  { id: 'agnes-video', name: 'Agnes 生视频', type: 'video', baseUrl: 'https://apihub.agnes-ai.com/v1', defaultModel: 'agnes-video-v2.0', models: ['agnes-video-v2.0'] },
  { id: 'openai-dalle', name: 'OpenAI DALL·E', type: 'image', baseUrl: 'https://api.openai.com/v1', defaultModel: 'dall-e-3', models: ['dall-e-3', 'dall-e-2'] },
];

function getActiveProvider() {
  const cfg = loadConfig();
  if (cfg.activeProvider) {
    const p = cfg.providers.find(x => x.id === cfg.activeProvider);
    if (p && p.apiKey) return p;
  }
  return cfg.providers.find(p => p.apiKey) || null;
}

function getImageProvider() {
  const cfg = loadConfig();
  // 向后兼容：旧 mediaProvider 或 type:'media' 的 agnes provider
  const imgProviderId = cfg.imageProvider || cfg.mediaProvider;
  if (imgProviderId) {
    const p = cfg.providers.find(x => x.id === imgProviderId);
    if (p && p.apiKey) return p;
  }
  // 回退：任何 image 类型且有 key 的
  let p = cfg.providers.find(p => p.type === 'image' && p.apiKey);
  if (p) return p;
  // 回退：旧 type:'media' 的 agnes
  p = cfg.providers.find(p => (p.type === 'media' || p.type === 'image') && p.apiKey && p.id.includes('agnes'));
  return p || null;
}

function getVideoProvider() {
  const cfg = loadConfig();
  const vidProviderId = cfg.videoProvider || cfg.mediaProvider;
  if (vidProviderId) {
    const p = cfg.providers.find(x => x.id === vidProviderId);
    if (p && p.apiKey) return p;
  }
  // 回退：任何 video 类型且有 key 的
  let p = cfg.providers.find(p => p.type === 'video' && p.apiKey);
  if (p) return p;
  // 回退：旧 type:'media' 的 agnes
  p = cfg.providers.find(p => (p.type === 'media' || p.type === 'video') && p.apiKey && p.id.includes('agnes'));
  return p || null;
}

async function withRetry(fn, { maxRetries = 3, timeoutMs = 90000, label = 'API' } = {}) {
  let lastErr;
  for (let i = 0; i <= maxRetries; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error(`${label} 超时(${timeoutMs / 1000}s)`)), timeoutMs);
    try {
      const result = await fn(ctrl.signal);
      clearTimeout(timer);
      return result;
    } catch (err) {
      clearTimeout(timer);
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
  validateProviderBaseUrl(provider.baseUrl);
  const url = provider.baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const body = {
    model: provider.model || provider.defaultModel,
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
    stream: !!stream,
  };
  return withRetry(async (signal) => {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + provider.apiKey },
      body: JSON.stringify(body),
      signal,
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
  // 容错修复：尾逗号
  const repair = (s) => s.replace(/,\s*([}\]])/g, '$1');
  try { return JSON.parse(text); } catch (_) {}
  const repaired = repair(text);
  try { return JSON.parse(repaired); } catch (_) {}
  for (const m of [repaired.match(/\{[\s\S]*\}/), repaired.match(/\[[\s\S]*\]/)].filter(Boolean)) {
    try { return JSON.parse(m[0]); } catch (_) {}
  }
  // 去除 markdown 代码块
  const cleaned = text.replace(/```json\n?|```/g, '').trim();
  const cleanedRepaired = repair(cleaned);
  try { return JSON.parse(cleanedRepaired); } catch (_) {}
  for (const m of [cleanedRepaired.match(/\{[\s\S]*\}/), cleanedRepaired.match(/\[[\s\S]*\]/)].filter(Boolean)) {
    try { return JSON.parse(m[0]); } catch (_) {}
  }
  throw new Error('模型输出格式异常，无法解析为JSON');
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function maskKey(k) { return k ? k.slice(0, 4) + '****' + k.slice(-4) : ''; }
function entityId(prefix) { return `${prefix}_${genId()}`; }

function asArray(value) { return Array.isArray(value) ? value : []; }
function normalizeName(value) { return String(value || '').trim().toLowerCase(); }
function contentHash(content) { return crypto.createHash('sha256').update(String(content || ''), 'utf8').digest('hex'); }
function preprocessMatches(preprocess, content, sourceMode, chapterId) {
  return !!preprocess?.contentHash
    && preprocess.contentHash === contentHash(content)
    && (preprocess.sourceMode || 'content') === (sourceMode || 'content')
    && (preprocess.chapterId || null) === (chapterId || null);
}

function normalizeConsistencyResult(value) {
  const parsed = Array.isArray(value) ? { issues: value } : (value && typeof value === 'object' ? value : {});
  const validSeverity = new Set(['error', 'warning', 'info']);
  const validStatus = new Set(['open', 'resolved', 'accepted']);
  const issues = asArray(parsed.issues).map((issue, index) => ({
    id: String(issue?.id || `issue_${index + 1}`),
    severity: validSeverity.has(issue?.severity) ? issue.severity : 'warning',
    category: String(issue?.category || 'general'),
    entityType: String(issue?.entityType || ''),
    entityId: String(issue?.entityId || ''),
    shotId: String(issue?.shotId || ''),
    rule: String(issue?.rule || ''),
    message: String(issue?.message || ''),
    suggestion: String(issue?.suggestion || ''),
    status: validStatus.has(issue?.status) ? issue.status : 'open',
  }));
  const blockingCount = issues.filter(issue => issue.severity === 'error' && issue.status === 'open').length;
  const summary = typeof parsed.summary === 'string' ? parsed.summary : `## 一致性检查摘要\n\n- 问题总数：${issues.length}\n- 阻断问题：${blockingCount}`;
  return { issues, summary, blockingCount, checkedAt: parsed.checkedAt || new Date().toISOString() };
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createStoreZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(String(file.name).replace(/\\/g, '/'), 'utf8');
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(String(file.data), 'utf8');
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(0, 8); local.writeUInt32LE(checksum, 14); local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8); central.writeUInt16LE(0, 10); central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42); centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}
function assertExpectedRevision(expectedRevision, currentRevision) {
  if (expectedRevision !== undefined && Number(expectedRevision) !== Number(currentRevision || 0)) {
    const error = new Error('项目版本冲突');
    error.status = 409;
    throw error;
  }
}

function normalizeProject(project) {
  const p = project && typeof project === 'object' ? project : {};
  p.results = p.results && typeof p.results === 'object' ? p.results : {};
  p.knowledge = p.knowledge && typeof p.knowledge === 'object' ? p.knowledge : {};
  for (const key of ['characters', 'scenes', 'props', 'timeline']) p.knowledge[key] = asArray(p.knowledge[key]);
  p.revision = Number.isInteger(p.revision) && p.revision >= 0 ? p.revision : 0;
  p.sourceRevision = Number.isInteger(p.sourceRevision) && p.sourceRevision >= 0 ? p.sourceRevision : p.revision;
  p.assets = asArray(p.assets);
  p.jobs = asArray(p.jobs);
  p.analysisRuns = asArray(p.analysisRuns);
  p.snapshots = asArray(p.snapshots);

  const resultCharacters = asArray(p.results.characters?.characters);
  const resultScenes = asArray(p.results.scenes?.scenes);
  const allCharacters = [...p.knowledge.characters, ...resultCharacters];
  const allScenes = [...p.knowledge.scenes, ...resultScenes];
  const assignIds = (items, prefix) => items.forEach(item => { if (item && !item.id) item.id = entityId(prefix); });
  assignIds(allCharacters, 'char');
  assignIds(allScenes, 'scene');

  const characterByName = new Map();
  for (const character of allCharacters) {
    for (const name of [character.name, ...asArray(character.aliases)]) {
      if (normalizeName(name)) characterByName.set(normalizeName(name), character.id);
    }
  }
  const sceneByName = new Map();
  for (const scene of allScenes) {
    for (const name of [scene.name, ...asArray(scene.aliases)]) {
      if (normalizeName(name)) sceneByName.set(normalizeName(name), scene.id);
    }
  }

  for (const shot of asArray(p.results.storyboard?.shots)) {
    if (!shot.id) shot.id = entityId('shot');
    if (!Array.isArray(shot.characterIds)) {
      shot.characterIds = asArray(shot.characterNames).map(name => characterByName.get(normalizeName(name))).filter(Boolean);
    }
    if (!shot.sceneId && shot.sceneName) shot.sceneId = sceneByName.get(normalizeName(shot.sceneName)) || null;
  }
  for (const page of asArray(p.results.manga?.pages)) {
    for (const panel of asArray(page?.panels)) {
      if (!panel.id) panel.id = entityId('panel');
      if (!Array.isArray(panel.characterIds)) {
        const names = asArray(panel.characterNames).concat(asArray(panel.characters));
        panel.characterIds = names.map(name => characterByName.get(normalizeName(name?.name || name))).filter(Boolean);
      }
      if (!panel.sceneId && panel.sceneName) panel.sceneId = sceneByName.get(normalizeName(panel.sceneName)) || null;
    }
  }
  return p;
}

// ===================================================================
//  项目存储
// ===================================================================
function assertSafeId(id) {
  if (!id || !/^[\w.-]+$/.test(id) || id.includes('..')) {
    const e = new Error('无效的项目ID'); e.status = 400; throw e;
  }
}
function projectPath(id) { assertSafeId(id); return path.join(PROJECTS_DIR, id + '.json'); }
function loadProject(id) {
  const fp = projectPath(id);
  if (!fs.existsSync(fp)) return null;
  try { return normalizeProject(JSON.parse(fs.readFileSync(fp, 'utf8'))); }
  catch (e) { console.error('项目文件损坏:', fp, e.message); return null; }
}
function saveProject(p, expectedRevision) {
  normalizeProject(p);
  const fp = projectPath(p.id);
  const current = fs.existsSync(fp) ? loadProject(p.id) : null;
  try {
    assertExpectedRevision(expectedRevision, current?.revision || 0);
  } catch (error) {
    error.project = current;
    throw error;
  }
  p.revision = (current?.revision || p.revision || 0) + 1;
  p.updatedAt = new Date().toISOString();
  const tempPath = `${fp}.${process.pid}.${genId()}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(p, null, 2));
    fs.renameSync(tempPath, fp);
  } catch (error) {
    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
    throw error;
  }
  return p;
}

// ===================================================================
//  知识库
// ===================================================================
function buildKnowledgeContext(kb) {
  if (!kb) return '';
  const parts = [];
  const characters = asArray(kb.characters);
  const scenes = asArray(kb.scenes);
  const props = asArray(kb.props);
  if (characters.length) parts.push('### 角色');
  characters.filter(Boolean).forEach(c => parts.push(`- ${c.name||''}${asArray(c.aliases).length ? '(别名:' + c.aliases.join(',') + ')' : ''}：${c.description||''}，性格:${c.traits||''}，外貌:${c.appearance||''}`));
  if (scenes.length) parts.push('### 场景');
  scenes.filter(Boolean).forEach(s => parts.push(`- ${s.name||''}(${s.type||''})：${s.description||''}，氛围:${s.mood||''}`));
  if (props.length) parts.push('### 道具');
  props.filter(Boolean).forEach(p => parts.push(`- ${p.name||''}：${p.description||''}`));
  return parts.join('\n');
}

function buildPreprocessContext(preprocess) {
  if (!preprocess?.global) return '';
  const g = preprocess.global;
  const parts = ['【预处理全局分析（参考以下信息进行后续分析）】'];
  if (g.title) parts.push(`标题: ${g.title}`);
  if (g.genre) parts.push(`类型: ${g.genre}`);
  if (g.total_chapters) parts.push(`总章节数: ${g.total_chapters}`);
  if (g.characters?.length) {
    parts.push('角色概况:');
    g.characters.forEach(c => parts.push(`  - ${c.name}(${c.role||''}): ${c.brief||''} 出场:${(c.appearances||[]).join(',')}`));
  }
  if (g.scenes?.length) {
    parts.push('场景概况:');
    g.scenes.forEach(s => parts.push(`  - ${s.name}: ${s.description||''} 出现章节:${(s.chapters||[]).join(',')}`));
  }
  if (g.timeline?.length) {
    parts.push('时间线:');
    g.timeline.forEach(t => parts.push(`  - [${t.chapter}] ${t.event} (${t.emotion||''})`));
  }
  if (g.conflicts?.length) parts.push(`核心冲突: ${g.conflicts.join('; ')}`);
  if (g.themes?.length) parts.push(`主题: ${g.themes.join('; ')}`);
  return parts.join('\n');
}

function mergeKnowledge(existing, incoming, chapterTitle) {
  const merged = JSON.parse(JSON.stringify(existing || { characters: [], scenes: [], props: [], timeline: [] }));
  const norm = s => (s || '').trim().toLowerCase();
  for (const type of ['characters', 'scenes', 'props']) {
    for (const ent of (incoming[type] || [])) {
      const idx = (merged[type] || []).findIndex(e => norm(e.name) === norm(ent.name)
        || (e.aliases || []).some(a => norm(a) === norm(ent.name))
        || (ent.aliases || []).some(a => norm(a) === norm(e.name)));
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
    if (cur.length > maxChunk) {
      if (cur.length > maxChunk * 2) { for (let j = 0; j < cur.length; j += maxChunk) chunks.push(cur.slice(j, j + maxChunk).trim()); cur = ''; }
      else { chunks.push(cur.trim()); cur = ''; }
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

function mergeStructuredResults(type, results) {
  if (results.length === 1) return results[0];
  if (type === 'characters') return { characters: results.flatMap(result => asArray(result?.characters)) };
  if (type === 'scenes') return { scenes: results.flatMap(result => asArray(result?.scenes)) };
  if (type === 'storyboard') {
    const shots = results.flatMap(result => asArray(result?.shots));
    shots.forEach((shot, index) => { shot.shotNo = index + 1; });
    return { shots };
  }
  if (type === 'manga') {
    const pages = results.flatMap(result => asArray(result?.pages));
    pages.forEach((page, pageIndex) => {
      page.pageNum = pageIndex + 1;
      asArray(page.panels).forEach((panel, panelIndex) => { panel.panelNum = panelIndex + 1; });
    });
    return { ...results[0], totalPages: pages.length, pages };
  }
  return results[results.length - 1];
}

async function generateStructured(type, prompt, content, onCheckpoint) {
  const chunks = content.length > 12000 ? splitText(content, 12000) : [content];
  const results = [];
  for (let index = 0; index < chunks.length; index++) {
    try {
      results.push(parseJSON(await callLLM(prompt, chunks[index], false)));
      if (onCheckpoint) await onCheckpoint(index + 1, chunks.length, mergeStructuredResults(type, results), null);
    } catch (error) {
      if (onCheckpoint) await onCheckpoint(index, chunks.length, results.length ? mergeStructuredResults(type, results) : null, error);
      throw error;
    }
  }
  return mergeStructuredResults(type, results);
}

function formatSrtTime(ms) {
  const safeMs = Math.max(0, Math.round(Number(ms) || 0));
  const hours = Math.floor(safeMs / 3600000);
  const minutes = Math.floor((safeMs % 3600000) / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const fraction = safeMs % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(fraction).padStart(3, '0')}`;
}

function buildSrt(shots, episode) {
  let index = 0;
  let timeMs = 0;
  let srt = '';
  for (const shot of asArray(shots).filter(item => episode === undefined || Number(item.episode || 1) === Number(episode))) {
    const durationMs = Math.max(0, Number(shot.duration) || 4) * 1000;
    const text = String(shot.subtitle || shot.dialogue || '').trim();
    if (text) {
      index++;
      srt += `${index}\n${formatSrtTime(timeMs)} --> ${formatSrtTime(timeMs + durationMs)}\n${text}\n\n`;
    }
    timeMs += durationMs;
  }
  return srt;
}

function buildManifest(project) {
  const p = normalizeProject(JSON.parse(JSON.stringify(project)));
  return {
    project: { id: p.id, name: p.name, revision: p.revision, sourceRevision: p.sourceRevision, style: p.style, updatedAt: p.updatedAt },
    entities: {
      characters: asArray(p.results.characters?.characters),
      scenes: asArray(p.results.scenes?.scenes),
      shots: asArray(p.results.storyboard?.shots),
      mangaPages: asArray(p.results.manga?.pages),
    },
    assets: p.assets,
    jobs: p.jobs,
    analysisRuns: p.analysisRuns,
  };
}

function buildDeliveryMarkdown(project) {
  const p = normalizeProject(JSON.parse(JSON.stringify(project)));
  let markdown = `# ${p.name}\n\n- 风格：${getStyle(p.style).label}\n- 项目版本：${p.revision}\n\n`;
  if (p.content) markdown += `## 源文本\n\n${p.content}\n\n`;
  for (const chapter of asArray(p.chapters)) markdown += `## ${chapter.title}\n\n${chapter.content || ''}\n\n`;
  for (const [type, result] of Object.entries(p.results || {})) {
    if (type === 'media') continue;
    markdown += `## ${type}\n\n${typeof result === 'string' ? result : `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``}\n\n`;
  }
  return markdown;
}

function buildDeliveryZip(project) {
  const p = normalizeProject(JSON.parse(JSON.stringify(project)));
  const shots = asArray(p.results?.storyboard?.shots);
  const episodes = [...new Set(shots.map(shot => Number(shot.episode || 1)))].sort((a, b) => a - b);
  const assets = p.assets.map(({ id, entityType, entityId, kind, url, prompt, sourceRevision, parentAssetId, createdAt }) => ({ id, entityType, entityId, kind, url, prompt, sourceRevision, parentAssetId, createdAt }));
  const files = [
    { name: 'manifest.json', data: JSON.stringify(buildManifest(p), null, 2) },
    { name: 'project.json', data: JSON.stringify(p, null, 2) },
    { name: 'project.md', data: buildDeliveryMarkdown(p) },
    { name: 'assets-manifest.json', data: JSON.stringify({ assets }, null, 2) },
    ...episodes.map(episode => ({ name: `subtitles/episode-${episode}.srt`, data: buildSrt(shots, episode) })),
  ];
  return createStoreZip(files);
}

function buildShotContinuityContext(shots, shotId) {
  const items = asArray(shots);
  const index = items.findIndex(shot => shot?.id === shotId);
  const previous = index > 0 ? items[index - 1] : null;
  if (!previous) return { previousShotId: null, prompt: '', referenceImages: [] };
  const state = {
    continuityNote: previous.continuityNote || previous.notes || '',
    visual: previous.visual || '', action: previous.action || '',
    characterState: previous.characterState || previous.charactersState || '',
    sceneState: previous.sceneState || '',
  };
  const prompt = Object.entries(state).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join('; ');
  return { previousShotId: previous.id, prompt, referenceImages: previous.keyframeUrl ? [previous.keyframeUrl] : [] };
}

function findProjectEntity(project, entityType, entityId) {
  if (entityType === 'project') return !entityId || entityId === project.id ? project : null;
  if (entityType === 'character') return asArray(project.results?.characters?.characters).find(item => item.id === entityId) || asArray(project.knowledge?.characters).find(item => item.id === entityId);
  if (entityType === 'scene') return asArray(project.results?.scenes?.scenes).find(item => item.id === entityId) || asArray(project.knowledge?.scenes).find(item => item.id === entityId);
  if (entityType === 'shot') return asArray(project.results?.storyboard?.shots).find(item => item.id === entityId);
  if (entityType === 'panel' || entityType === 'mangaPanel') {
    return asArray(project.results?.manga?.pages).flatMap(page => asArray(page?.panels)).find(item => item.id === entityId);
  }
  return null;
}

function attachAsset(project, job, assetInput) {
  const target = findProjectEntity(project, job.entityType, job.entityId);
  if (!target) throw Object.assign(new Error('任务目标实体不存在'), { status: 400 });
  const existing = job.assetId && project.assets.find(item => item.id === job.assetId);
  if (existing) return existing;
  const asset = {
    id: assetInput.id || entityId('asset'),
    entityType: job.entityType,
    entityId: job.entityId,
    kind: assetInput.kind || job.kind || job.type,
    url: String(assetInput.url || '').trim(),
    prompt: assetInput.prompt || job.params?.prompt || '',
    model: assetInput.model || job.provider || '',
    params: assetInput.params || job.params || {},
    sourceRevision: job.sourceRevision,
    parentAssetId: assetInput.parentAssetId || null,
    createdAt: assetInput.createdAt || new Date().toISOString(),
  };
  if (!asset.url) throw Object.assign(new Error('资产 URL 不能为空'), { status: 400 });
  project.assets.push(asset);
  job.assetId = asset.id;
  job.url = asset.url;
  if (job.entityType === 'project') {
    project.results.media = [...asArray(project.results.media), { ...assetInput, id: asset.id, assetId: asset.id, type: asset.kind, url: asset.url, createdAt: asset.createdAt }];
  } else if (job.entityType === 'character' || job.entityType === 'scene' || job.entityType === 'panel' || job.entityType === 'mangaPanel') {
    target.assetId = asset.id;
    target.imageAssetId = asset.id;
    target.imageUrl = asset.url;
    if (job.entityType === 'character' && project.results.characters) project.results.characters.charImages = { ...(project.results.characters.charImages || {}), [job.entityId]: asset.url };
    if (job.entityType === 'scene' && project.results.scenes) project.results.scenes.sceneImages = { ...(project.results.scenes.sceneImages || {}), [job.entityId]: asset.url };
    if ((job.entityType === 'panel' || job.entityType === 'mangaPanel') && project.results.manga) project.results.manga.panelImages = { ...(project.results.manga.panelImages || {}), [job.entityId]: asset.url };
  } else if (asset.kind === 'video') {
    target.assetId = asset.id;
    target.videoAssetId = asset.id;
    target.videoUrl = asset.url;
  } else {
    target.assetId = asset.id;
    target.keyframeAssetId = asset.id;
    target.keyframeUrl = asset.url;
    target.imageUrl = asset.url;
  }
  return asset;
}

// ===================================================================
//  API: 视觉风格
// ===================================================================
function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function validateTextInput(content, options = {}) {
  const maxCharacters = options.maxCharacters || 300000;
  const maxChunks = options.maxChunks || 100;
  const chunkSize = options.chunkSize || 12000;
  const text = typeof content === 'string' ? content : '';
  if (text.length > maxCharacters) throw httpError(413, `输入内容不能超过 ${maxCharacters} 个字符`);
  const chunkCount = text ? splitText(text, chunkSize).length : 0;
  if (chunkCount > maxChunks) throw httpError(413, `输入内容不能超过 ${maxChunks} 个分块`);
  return { characterCount: text.length, chunkCount };
}

function isApiRequestAuthorized(req, accessToken = process.env.APP_ACCESS_TOKEN) {
  if (!accessToken) return true;
  const bearerToken = String(req.headers?.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
  return bearerToken === accessToken || req.headers?.['x-app-token'] === accessToken;
}

function createConcurrencyLimiter(maxConcurrency = 4) {
  let activeRequests = 0;
  return (req, res, next) => {
    if (activeRequests >= maxConcurrency) return res.status(429).json({ error: '服务繁忙，请稍后重试' });
    activeRequests++;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      activeRequests--;
    };
    res.once('finish', release);
    res.once('close', release);
    next();
  };
}

function isPrivateHostname(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::1') return true;
  if (/^(127|10)\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return true;
  return host === '0.0.0.0' || /^(fc|fd|fe8|fe9|fea|feb)/.test(host);
}

function validateProviderBaseUrl(baseUrl, options = {}) {
  let parsed;
  try { parsed = new URL(String(baseUrl || '')); } catch { throw httpError(400, 'Provider baseUrl 必须是有效 URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw httpError(400, 'Provider baseUrl 仅支持 http 或 https');
  if (parsed.username || parsed.password) throw httpError(400, 'Provider baseUrl 不能包含凭据');
  const nodeEnv = options.nodeEnv === undefined ? process.env.NODE_ENV : options.nodeEnv;
  const isDevelopment = !nodeEnv || nodeEnv === 'development';
  if (parsed.protocol === 'http:' && !(isDevelopment && isPrivateHostname(parsed.hostname))) throw httpError(400, 'Provider baseUrl 必须使用 https；开发环境仅允许 localhost 或私网地址使用 http');
  if (!isDevelopment && isPrivateHostname(parsed.hostname)) throw httpError(400, 'Provider baseUrl 不能指向 localhost 或私网 IP');
  const allowedHostsValue = options.allowedHosts === undefined ? process.env.PROVIDER_ALLOWED_HOSTS : options.allowedHosts;
  const allowedHosts = String(allowedHostsValue || '').split(',').map(host => host.trim().toLowerCase()).filter(Boolean);
  if (allowedHosts.length && !allowedHosts.includes(parsed.hostname.toLowerCase())) throw httpError(400, 'Provider host 不在允许列表中');
  return parsed;
}

const configuredConcurrency = Number.parseInt(process.env.APP_MAX_CONCURRENCY || '', 10);
const limitExpensiveRequest = createConcurrencyLimiter(configuredConcurrency > 0 ? configuredConcurrency : 4);
app.use('/api', (req, res, next) => {
  if (!isApiRequestAuthorized(req)) return res.status(401).json({ error: '未授权访问' });
  next();
});
app.use(['/api/preprocess', '/api/analyze', '/api/analyze-all'], (req, res, next) => {
  if (req.method !== 'POST') return next();
  try {
    validateTextInput(req.body?.content, { chunkSize: req.originalUrl.startsWith('/api/preprocess') ? 3000 : 12000 });
    next();
  } catch (error) { res.status(error.status || 400).json({ error: error.message }); }
});
app.use(['/api/preprocess', '/api/analyze', '/api/analyze-all', '/api/generate/image', '/api/generate/video'], (req, res, next) => {
  limitExpensiveRequest(req, res, next);
});

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
    revision: 0, sourceRevision: 0, results: {}, mediaItems: [], assets: [], jobs: [], analysisRuns: [], snapshots: [], createdAt: now, updatedAt: now,
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
  const sourceKeys = ['style', 'content', 'chapters', 'knowledge'];
  const sourceChanged = sourceKeys.some(key => req.body[key] !== undefined && JSON.stringify(req.body[key]) !== JSON.stringify(p[key]));
  for (const k of ['name', 'style', 'content', 'chapters', 'knowledge', 'results', 'mediaItems', 'preprocess', 'assets', 'jobs', 'analysisRuns', 'sourceRevision']) {
    if (req.body[k] !== undefined) p[k] = req.body[k];
  }
  if (sourceChanged && req.body.sourceRevision === undefined) p.sourceRevision++;
  try {
    saveProject(p, req.body.expectedRevision);
    res.json({ ...p, revision: p.revision });
  } catch (error) {
    if (error.status === 409) return res.status(409).json({ error: error.message, revision: error.project?.revision, project: error.project });
    throw error;
  }
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
  data.revision = 0; data.sourceRevision = 0; data.results = data.results || {}; data.mediaItems = data.mediaItems || []; data.assets = []; data.jobs = []; data.analysisRuns = []; data.snapshots = [];
  saveProject(data); res.json(data);
});

app.get('/api/projects/:id/jobs', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  res.json({ items: p.jobs, total: p.jobs.length });
});

app.post('/api/projects/:id/jobs', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  const entityType = req.body.entityType;
  const entityIdValue = req.body.entityId;
  if (!findProjectEntity(p, entityType, entityIdValue)) return res.status(400).json({ error: '任务目标实体不存在' });
  const now = new Date().toISOString();
  const job = {
    id: entityId('job'), entityType, entityId: entityIdValue,
    type: req.body.type || req.body.kind || 'generation', kind: req.body.kind || req.body.type || 'image',
    status: req.body.status || 'pending', provider: req.body.provider || '', providerTaskId: req.body.providerTaskId || '',
    params: req.body.params || {}, sourceRevision: p.sourceRevision, error: null, createdAt: now, updatedAt: now,
  };
  p.jobs.push(job);
  try {
    saveProject(p, req.body.expectedRevision);
    res.status(201).json({ job, revision: p.revision, project: normalizeProject(p) });
  } catch (error) {
    if (error.status === 409) return res.status(409).json({ error: error.message, revision: error.project?.revision, project: error.project });
    throw error;
  }
});

app.patch('/api/projects/:id/jobs/:jobId', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  const job = p.jobs.find(item => item.id === req.params.jobId);
  if (!job) return res.status(404).json({ error: '任务不存在' });
  for (const key of ['status', 'providerTaskId', 'error', 'progress']) if (req.body[key] !== undefined) job[key] = req.body[key];
  job.updatedAt = new Date().toISOString();
  let asset = null;
  try {
    if (job.status === 'completed' && req.body.asset) asset = attachAsset(p, job, req.body.asset);
    saveProject(p, req.body.expectedRevision);
    res.json({ job, asset, revision: p.revision, project: normalizeProject(p) });
  } catch (error) {
    if (error.status === 409) return res.status(409).json({ error: error.message, revision: error.project?.revision, project: error.project });
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/api/projects/:id/export-json', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(p.name)}.json"`);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(p, null, 2));
});

app.get('/api/projects/:id/export-manifest', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(p.name)}-manifest.json"`);
  res.json(buildManifest(p));
});

app.get('/api/projects/:id/export-delivery', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  const episodes = [...new Set(asArray(p.results?.storyboard?.shots).map(shot => Number(shot.episode || 1)))].sort((a, b) => a - b);
  res.json({ manifest: buildManifest(p), project: p, subtitles: Object.fromEntries(episodes.map(episode => [`episode-${episode}.srt`, buildSrt(p.results?.storyboard?.shots, episode)])) });
});

app.get('/api/projects/:id/export-delivery.zip', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  const filename = `${String(p.name || 'delivery').replace(/[\r\n"\\/]/g, '_')}-delivery.zip`;
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.setHeader('Content-Type', 'application/zip');
  res.send(buildDeliveryZip(p));
});

app.get(['/api/projects/:id/export-srt', '/api/projects/:id/export-srt/:episode'], (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  const srt = buildSrt(p.results?.storyboard?.shots, req.params.episode);
  const suffix = req.params.episode ? `-episode-${req.params.episode}` : '';
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(p.name)}${suffix}.srt"`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(srt || '(无字幕)');
});

app.get('/api/projects/:id/export-md', (req, res) => {
  const p = loadProject(req.params.id);
  if (!p) return res.status(404).json({ error: '项目不存在' });
  const names = { structure: '📐剧情结构', summary: '📊制作分析', characters: '🎭角色设定', scenes: '🏞️场景设计', storyboard: '🎬分镜脚本', script: '📝短剧脚本', assets: '🎨视觉资产', manga: '📖漫画脚本' };
  let md = `# ${p.name}\n\n> 风格：${getStyle(p.style).label} | 更新：${p.updatedAt}\n\n---\n\n`;

  // 章节内容
  if (p.chapters?.length) {
    md += `## 📖 章节内容\n\n`;
    p.chapters.forEach(ch => { md += `### ${ch.title}\n\n${ch.content || ''}\n\n`; });
    md += `---\n\n`;
  }

  // 源文本
  if (p.content) { md += `## 📝 源文本\n\n${p.content}\n\n---\n\n`; }

  // 预处理全局分析
  if (p.preprocess?.global) {
    const g = p.preprocess.global;
    md += `## 🔍 预处理全局分析\n\n`;
    if (g.title) md += `- **标题**: ${g.title}\n`;
    if (g.genre) md += `- **类型**: ${g.genre}\n`;
    if (g.conflicts?.length) md += `- **核心冲突**: ${g.conflicts.join('; ')}\n`;
    if (g.themes?.length) md += `- **主题**: ${g.themes.join('; ')}\n`;
    if (g.characters?.length) { md += `\n### 角色概况\n\n| 角色 | 定位 | 简介 | 出场 |\n|---|---|---|---|\n`; g.characters.forEach(c => md += `| ${c.name} | ${c.role||''} | ${c.brief||''} | ${(c.appearances||[]).join(',')} |\n`); }
    if (g.timeline?.length) { md += `\n### 时间线\n\n`; g.timeline.forEach(t => md += `- **[${t.chapter}]** ${t.event} (${t.emotion||''})\n`); }
    md += `\n---\n\n`;
  }

  // 分析模块
  for (const [k, title] of Object.entries(names)) {
    if (p.results?.[k]) {
      md += `## ${title}\n\n${typeof p.results[k] === 'string' ? p.results[k] : JSON.stringify(p.results[k], null, 2)}\n\n---\n\n`;
    }
  }

  // 知识库
  if (p.knowledge) {
    const kb = p.knowledge;
    const hasKb = (kb.characters?.length || kb.scenes?.length || kb.props?.length || kb.timeline?.length);
    if (hasKb) {
      md += `## 📚 知识库\n\n`;
      if (kb.characters?.length) { md += `### 角色\n\n| 名称 | 描述 | 性格 | 外貌 |\n|---|---|---|---|\n`; kb.characters.forEach(c => md += `| ${c.name} | ${c.description||''} | ${c.traits||''} | ${c.appearance||''} |\n`); }
      if (kb.scenes?.length) { md += `\n### 场景\n\n| 名称 | 描述 | 氛围 |\n|---|---|---|\n`; kb.scenes.forEach(s => md += `| ${s.name} | ${s.description||''} | ${s.mood||''} |\n`); }
      if (kb.props?.length) { md += `\n### 道具\n\n| 名称 | 描述 |\n|---|---|\n`; kb.props.forEach(pr => md += `| ${pr.name} | ${pr.description||''} |\n`); }
      if (kb.timeline?.length) { md += `\n### 时间线\n\n`; kb.timeline.forEach(t => md += `- ${t.chapter}: ${t.event} (${t.emotion||''})\n`); }
      md += `\n---\n\n`;
    }
  }

  // 媒体生成历史
  if (p.results?.media?.length) {
    md += `## 🖼️ 媒体生成历史\n\n`;
    p.results.media.forEach(m => { md += `- **${m.type === 'image' ? '🖼️' : '🎬'}** ${m.prompt || ''}\n  - URL: ${m.url}\n  - 时间: ${m.createdAt || ''}\n`; });
    md += `\n---\n\n`;
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
  if (!title?.trim()) return res.status(400).json({ error: '缺少章节标题' });
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
  const { content, projectId, sourceMode = 'content', chapterId } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: '请输入内容' });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = d => res.write(`data: ${JSON.stringify(d)}\n\n`);
  const pingI = setInterval(() => { try { res.write(':ping\n\n'); } catch {} }, 15000);
  req.on('close', () => clearInterval(pingI));
  try {
    send({ status: 'splitting', message: '正在分段...' });
    const chunks = splitText(content);
    if (!chunks.length) { send({ status: 'done', segments: [], global: {} }); res.write('data: [DONE]\n\n'); res.end(); return; }
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
    // 服务端持久化
    const metadata = { sourceMode, chapterId: chapterId || null, contentHash: contentHash(content), createdAt: new Date().toISOString() };
    if (projectId) { const f = loadProject(projectId); if (f) { f.preprocess = { segments: segs, global, ...metadata }; saveProject(f); } }
    send({ status: 'done', segments: segs, global, ...metadata });
  } catch (e) {
    send({ error: e.message });
  }
  clearInterval(pingI);
  res.write('data: [DONE]\n\n'); res.end();
});

// ===================================================================
//  API: 分析（SSE）— 单模块
// ===================================================================
app.post('/api/analyze', async (req, res) => {
  const { type, content, visualStyle, projectId, characters, scenes, sourceMode = 'content', chapterId } = req.body;
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
    let preCtx = preprocessMatches(p?.preprocess, content, sourceMode, chapterId) ? buildPreprocessContext(p.preprocess) : '';

    // 结构化模块需要角色/场景上下文
    let settingCtx = '';
    const referenceCharacters = characters?.length ? characters : asArray(p?.results?.characters?.characters);
    const referenceScenes = scenes?.length ? scenes : asArray(p?.results?.scenes?.scenes);
    if ((type === 'storyboard' || type === 'manga') && referenceCharacters.length) {
      settingCtx += '\n\n【角色参考卡】\n' + referenceCharacters.map((c, i) => `[角色${i + 1}] 名:${c.name} | 外貌:${c.appearance} | 服装:${c.costume} | 性格:${c.personality}`).join('\n');
    }
    if ((type === 'storyboard' || type === 'manga') && referenceScenes.length) {
      settingCtx += '\n【场景参考卡】\n' + referenceScenes.map((s, i) => `[场景${i + 1}] 名:${s.name} | 环境:${s.environment} | 氛围:${s.mood} | 光照:${s.lighting} | 时间:${s.timeOfDay}`).join('\n');
    }

    let finalContent = content;
    if (kbCtx) finalContent = `【知识库参考】\n${kbCtx}\n\n---\n\n${finalContent}`;
    if (preCtx) finalContent = `${preCtx}\n\n---\n\n${finalContent}`;
    if (settingCtx) finalContent += settingCtx;
    if (visualStyle) finalContent += getStyleContext(visualStyle);

    send({ status: 'start', type });

    let parsed = null, mdText = '';
    // 结构化模块（非流式，需整体解析JSON）
    if (type === 'characters' || type === 'scenes' || type === 'storyboard' || type === 'manga') {
      const promptMap = { characters: CHARACTERS_PROMPT, scenes: SCENES_PROMPT, storyboard: STORYBOARD_PROMPT, manga: PROMPTS.manga };
      const runId = entityId('analysis');
      parsed = await generateStructured(type, promptMap[type], finalContent, async (completedChunks, totalChunks, partialResult, checkpointError) => {
        if (!projectId || totalChunks === 1) return;
        const checkpointProject = loadProject(projectId);
        if (!checkpointProject) return;
        const run = checkpointProject.analysisRuns.find(item => item.id === runId) || { id: runId, type, createdAt: new Date().toISOString() };
        Object.assign(run, {
          status: checkpointError ? 'failed' : completedChunks === totalChunks ? 'completed' : 'processing',
          completedChunks, totalChunks, result: partialResult, error: checkpointError?.message || null,
          failedChunk: checkpointError ? completedChunks + 1 : null, updatedAt: new Date().toISOString(),
        });
        if (!checkpointProject.analysisRuns.some(item => item.id === runId)) checkpointProject.analysisRuns.push(run);
        saveProject(checkpointProject);
      });
      parsed.derivedFromRevision = p?.sourceRevision || 0;
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

    // 保存到项目（reload 最新状态避免竞态覆盖）
    if (projectId) {
      const fresh = loadProject(projectId);
      if (fresh) {
        if (!fresh.results) fresh.results = {};
        const result = parsed || mdText;
        fresh.results[type] = result;
        if (sourceMode === 'chapter' && chapterId) {
          const chapter = asArray(fresh.chapters).find(item => item.id === chapterId);
          if (!chapter) throw Object.assign(new Error('章节不存在'), { status: 404 });
          chapter.analysis = chapter.analysis || {};
          chapter.analysis[type] = typeof result === 'string'
            ? { content: result, derivedFromRevision: fresh.sourceRevision }
            : { ...result, derivedFromRevision: fresh.sourceRevision };
        }
        // 知识库自动提取（首次分析角色时）
        if (type === 'characters' && (!fresh.knowledge || !fresh.knowledge.characters?.length)) {
          try {
            const extracted = await extractKnowledgeFromText(content, fresh.knowledge);
            fresh.knowledge = mergeKnowledge(fresh.knowledge, extracted, '自动提取');
          } catch (e) { console.log('KB extract failed:', e.message); }
        }
        saveProject(fresh);
      }
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
  const { content, visualStyle, projectId, modules, sourceMode = 'content', chapterId, resumeRunId } = req.body;
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
    let preCtx = preprocessMatches(p?.preprocess, content, sourceMode, chapterId) ? buildPreprocessContext(p.preprocess) : '';
    let finalContent = content;
    if (kbCtx) finalContent = `【知识库参考】\n${kbCtx}\n\n---\n\n${finalContent}`;
    if (preCtx) finalContent = `${preCtx}\n\n---\n\n${finalContent}`;
    if (visualStyle) finalContent += getStyleContext(visualStyle);

    // 先生成角色与场景，分镜依赖它们
    const order = ['structure', 'summary', 'characters', 'scenes', 'storyboard', 'script', 'assets', 'manga'].filter(t => allTypes.includes(t));
    let run = p?.analysisRuns.find(item => item.id === resumeRunId);
    if (resumeRunId && !run) throw new Error('恢复的批量分析记录不存在');
    if (!run) run = { id: entityId('analysis_run'), status: 'processing', modules: {}, requestedModules: order, sourceMode, chapterId: chapterId || null, contentHash: contentHash(content), createdAt: new Date().toISOString() };
    run.status = 'processing'; run.updatedAt = new Date().toISOString();
    if (p) { if (!p.analysisRuns.some(item => item.id === run.id)) p.analysisRuns.push(run); saveProject(p); }
    send({ status: 'run_start', runId: run.id });
    let chars = asArray(p?.results?.characters?.characters), scns = asArray(p?.results?.scenes?.scenes);
    for (const type of order) {
      if (run.modules[type]?.status === 'completed') { send({ status: 'module_skipped', type, runId: run.id }); continue; }
      send({ status: 'module_start', type });
      run.modules[type] = { status: 'processing', startedAt: new Date().toISOString(), error: null };
      try {
        let contentForType = finalContent;
        if (type === 'storyboard') {
          if (chars.length) contentForType += '\n\n【角色参考卡】\n' + chars.map((c, i) => `[角色${i+1}] 名:${c.name}|外貌:${c.appearance}|服装:${c.costume}|性格:${c.personality}`).join('\n');
          if (scns.length) contentForType += '\n【场景参考卡】\n' + scns.map((s, i) => `[场景${i+1}] 名:${s.name}|环境:${s.environment}|氛围:${s.mood}|光照:${s.lighting}|时间:${s.timeOfDay}`).join('\n');
        }
        if (type === 'manga' && chars.length) {
          contentForType += '\n\n【角色参考卡】\n' + chars.map((c, i) => `[角色${i+1}] 名:${c.name}|外貌:${c.appearance}|服装:${c.costume}|性格:${c.personality}`).join('\n');
          if (scns.length) contentForType += '\n【场景参考卡】\n' + scns.map((s, i) => `[场景${i+1}] 名:${s.name}|环境:${s.environment}|氛围:${s.mood}|光照:${s.lighting}|时间:${s.timeOfDay}`).join('\n');
        }
        if (type === 'characters' || type === 'scenes' || type === 'storyboard' || type === 'manga') {
          const promptMap = { characters: CHARACTERS_PROMPT, scenes: SCENES_PROMPT, storyboard: STORYBOARD_PROMPT, manga: PROMPTS.manga };
          const parsed = await generateStructured(type, promptMap[type], contentForType);
          parsed.derivedFromRevision = p?.sourceRevision || 0;
          if (type === 'characters') chars = parsed.characters || [];
          if (type === 'scenes') scns = parsed.scenes || [];
          send({ status: 'module_done', type, result: parsed, runId: run.id });
          if (projectId) { const f = loadProject(projectId); if (f) { f.results = f.results || {}; f.results[type] = parsed; if (sourceMode === 'chapter' && chapterId) { const chapter = f.chapters.find(item => item.id === chapterId); if (!chapter) throw new Error('章节不存在'); chapter.analysis = chapter.analysis || {}; chapter.analysis[type] = { ...parsed, derivedFromRevision: f.sourceRevision }; } const savedRun = f.analysisRuns.find(item => item.id === run.id); Object.assign(savedRun.modules[type], { status: 'completed', completedAt: new Date().toISOString() }); saveProject(f); run = savedRun; } }
        } else {
          if (!PROMPTS[type]) throw new Error('未知模块');
          // 流式传输，实时推送生成内容
          const stream = await callLLM(PROMPTS[type], contentForType, true);
          let buf = '';
          for await (const delta of streamChunks(stream)) {
            buf += delta;
            send({ status: 'module_streaming', type, content: delta });
          }
          send({ status: 'module_done', type, result: buf, runId: run.id });
          if (projectId) { const f = loadProject(projectId); if (f) { f.results = f.results || {}; f.results[type] = buf; if (sourceMode === 'chapter' && chapterId) { const chapter = f.chapters.find(item => item.id === chapterId); if (!chapter) throw new Error('章节不存在'); chapter.analysis = chapter.analysis || {}; chapter.analysis[type] = { content: buf, derivedFromRevision: f.sourceRevision }; } const savedRun = f.analysisRuns.find(item => item.id === run.id); Object.assign(savedRun.modules[type], { status: 'completed', completedAt: new Date().toISOString() }); saveProject(f); run = savedRun; } }
        }
      } catch (e) {
        run.modules[type] = { ...run.modules[type], status: 'failed', error: e.message, failedAt: new Date().toISOString() };
        if (projectId) { const f = loadProject(projectId); if (f) { const savedRun = f.analysisRuns.find(item => item.id === run.id); savedRun.modules[type] = run.modules[type]; saveProject(f); run = savedRun; } }
        send({ status: 'module_error', type, error: e.message, runId: run.id });
      }
    }
    const retryModules = order.filter(type => run.modules[type]?.status === 'failed');
    run.status = retryModules.length ? 'failed' : 'completed'; run.updatedAt = new Date().toISOString();
    if (projectId) { const f = loadProject(projectId); if (f) { Object.assign(f.analysisRuns.find(item => item.id === run.id), run); saveProject(f); } }
    send({ status: 'all_done', runId: run.id, retryModules });
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
  const { results, knowledge, projectId } = req.body;
  if (!results) return res.status(400).json({ error: '没有分析结果' });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = d => res.write(`data: ${JSON.stringify(d)}\n\n`);
  const pingI = setInterval(() => { try { res.write(':ping\n\n'); } catch {} }, 15000);
  req.on('close', () => clearInterval(pingI));
  try {
    const names = { structure: '剧情结构', summary: '制作分析', characters: '角色设定', scenes: '场景设计', storyboard: '分镜脚本', script: '短剧脚本', assets: '视觉资产', manga: '漫画脚本' };
    let combined = knowledge ? `【知识库】\n${JSON.stringify(knowledge, null, 2)}\n\n` : '';
    for (const [k, name] of Object.entries(names)) {
      if (results[k]) combined += `\n\n=== ${name} ===\n${typeof results[k] === 'string' ? results[k] : JSON.stringify(results[k], null, 2)}`;
    }
    const prompt = `你是一位影视制作质量控制专家。检查角色、场景、情节逻辑、时间线和视觉资产的一致性。只输出严格 JSON：{"issues":[{"id":"稳定且简短的ID","severity":"error|warning|info","category":"分类","entityType":"project|character|scene|shot|panel","entityId":"关联实体ID或空字符串","shotId":"关联分镜ID或空字符串","rule":"规则名","message":"具体问题","suggestion":"可执行建议","status":"open"}],"summary":"Markdown格式摘要"}。error 表示阻断生产，warning 表示需复核，info 表示优化建议。基于实际内容检查；无问题时 issues 为空数组。`;
    const result = normalizeConsistencyResult(parseJSON(await callLLM(prompt, combined, false)));
    if (projectId) {
      const project = loadProject(projectId);
      if (project) { project.results.consistency = result; saveProject(project); }
    }
    send({ status: 'done', result });
  } catch (e) { send({ error: e.message }); }
  clearInterval(pingI);
  res.write('data: [DONE]\n\n'); res.end();
});

// ===================================================================
//  API: AI 生图/生视频
// ===================================================================
app.post('/api/generate/image', async (req, res) => {
  const { prompt, negativePrompt, size, visualStyle, images } = req.body;
  if (!prompt) return res.status(400).json({ error: '请提供prompt' });
  const provider = getImageProvider();
  if (!provider) return res.status(400).json({ error: '未配置图像生成提供商' });
  const styledNeg = getStyleNegative(visualStyle, negativePrompt);
  try {
    validateProviderBaseUrl(provider.baseUrl);
    const url = provider.baseUrl.replace(/\/+$/, '') + '/images/generations';
    const extraBody = { response_format: 'url' };
    // 图生图：传入参考图片
    if (images && images.length > 0) extraBody.image = images;
    const body = {
      model: provider.model || 'agnes-image-2.1-flash',
      prompt: styledNeg ? `${prompt} [negative: ${styledNeg}]` : prompt,
      size: size || '1024x768',
      extra_body: extraBody,
    };
    const r = await withRetry(async (signal) => {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + provider.apiKey }, body: JSON.stringify(body), signal });
      if (!resp.ok) throw new Error(`图片API错误 ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
      const d = await resp.json();
      return d.data?.[0]?.url || d.data?.[0]?.b64_json || '';
    }, { maxRetries: 0, timeoutMs: 180000, label: '图片生成' });
    if (!r) throw new Error('图片服务返回空 URL');
    res.json({ ok: true, url: r });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.post('/api/generate/video', async (req, res) => {
  const { prompt, visualStyle, negativePrompt, image, height, width, num_frames, frame_rate, mode } = req.body;
  if (!prompt) return res.status(400).json({ error: '请提供prompt' });
  const provider = getVideoProvider();
  if (!provider) return res.status(400).json({ error: '未配置视频生成提供商' });
  try {
    validateProviderBaseUrl(provider.baseUrl);
    const url = provider.baseUrl.replace(/\/+$/, '') + '/videos';
    const body = {
      model: provider.model || 'agnes-video-v2.0',
      prompt,
      height: height || 768,
      width: width || 1152,
      num_frames: [81, 121, 241, 441].includes(Number(num_frames)) ? Number(num_frames) : 121,  // 8n+1 校验
      frame_rate: frame_rate || 24,
    };
    // 图生视频
    if (image) body.image = image;
    // 关键帧模式
    if (mode === 'keyframes' && req.body.images) {
      body.extra_body = { image: req.body.images, mode: 'keyframes' };
    }
    if (negativePrompt) body.negative_prompt = negativePrompt;
    const r = await withRetry(async (signal) => {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + provider.apiKey }, body: JSON.stringify(body), signal });
      if (!resp.ok) throw new Error(`视频API错误 ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
      return resp.json();
    }, { maxRetries: 0, timeoutMs: 60000, label: '视频任务' });
    res.json({ ok: true, ...r });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.get('/api/generate/video/:videoId', async (req, res) => {
  const provider = getVideoProvider();
  if (!provider) return res.status(400).json({ error: '未配置提供商' });
  try {
    validateProviderBaseUrl(provider.baseUrl);
    const baseRoot = provider.baseUrl.replace(/\/v1\/?$/, '');
    const modelName = provider.model || 'agnes-video-v2.0';
    if (!baseRoot.trim()) return res.status(400).json({ error: '视频服务 URL 不能为空' });
    const resp = await fetch(`${baseRoot}/agnesapi?video_id=${encodeURIComponent(req.params.videoId)}&model_name=${encodeURIComponent(modelName)}`, { headers: { 'Authorization': 'Bearer ' + provider.apiKey }, signal: AbortSignal.timeout(30000) });
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
    imageProvider: cfg.imageProvider,
    videoProvider: cfg.videoProvider,
    // 向后兼容
    mediaProvider: cfg.mediaProvider || cfg.imageProvider,
    presets: PRESET_PROVIDERS,
  });
});

app.put('/api/config/llm', (req, res) => {
  try {
    const cfg = loadConfig();
    const { providers, activeProvider, imageProvider, videoProvider, mediaProvider } = req.body;
    if (providers !== undefined) {
      if (!Array.isArray(providers)) throw httpError(400, 'providers 必须是数组');
      const oldMap = new Map(cfg.providers.map(provider => [provider.id, provider]));
      cfg.providers = providers.map(provider => sanitizeProviderInput(provider, oldMap.get(provider.id)));
    }
    if (activeProvider !== undefined) cfg.activeProvider = activeProvider;
    if (imageProvider !== undefined) cfg.imageProvider = imageProvider;
    if (videoProvider !== undefined) cfg.videoProvider = videoProvider;
    if (mediaProvider !== undefined && imageProvider === undefined) cfg.imageProvider = mediaProvider;
    if (mediaProvider !== undefined && videoProvider === undefined) cfg.videoProvider = mediaProvider;
    saveConfig(cfg);
    res.json({ ok: true, providers: cfg.providers.map(p => ({ ...p, apiKey: maskKey(p.apiKey) })), activeProvider: cfg.activeProvider, imageProvider: cfg.imageProvider, videoProvider: cfg.videoProvider, mediaProvider: cfg.imageProvider });
  } catch (error) { res.status(error.status || 400).json({ error: error.message }); }
});

app.post('/api/config/llm/test', async (req, res) => {
  const { baseUrl, apiKey, model } = req.body;
  if (!baseUrl || !apiKey) return res.status(400).json({ error: '参数不全' });
  try {
    validateProviderBaseUrl(baseUrl);
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
  if (p.snapshots.length >= 20) p.snapshots.shift();
  const snap = { id: genId(), label: req.body.label || `快照${p.snapshots.length + 1}`, timestamp: new Date().toISOString(), data: snapshotData(p) };
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
  if (p.snapshots.length >= 20) p.snapshots.shift();
  p.snapshots.push({ id: genId(), label: '恢复前自动保存', timestamp: new Date().toISOString(), data: snapshotData(p) });
  for (const key of ['content', 'chapters', 'knowledge', 'results', 'style', 'preprocess', 'assets', 'jobs', 'revision', 'sourceRevision']) {
    if (snap.data[key] !== undefined) p[key] = JSON.parse(JSON.stringify(snap.data[key]));
  }
  saveProject(p); res.json(p);
});

function snapshotData(project) {
  const data = {};
  for (const key of ['content', 'chapters', 'knowledge', 'results', 'style', 'preprocess', 'assets', 'jobs', 'revision', 'sourceRevision']) {
    data[key] = JSON.parse(JSON.stringify(project[key] === undefined ? null : project[key]));
  }
  return data;
}

if (process.env.NODE_ENV !== 'test') app.listen(PORT, '0.0.0.0', () => {
  const cfg = migrateConfig();
  const llm = cfg.providers.find(p => p.id === cfg.activeProvider);
  const img = cfg.providers.find(p => p.id === cfg.imageProvider);
  const vid = cfg.providers.find(p => p.id === cfg.videoProvider);
  console.log(`短剧脚本工坊已启动: http://localhost:${PORT}`);
  console.log(`文本模型: ${llm?.name || '未配置'} | 生图模型: ${img?.name || '未配置(回退Agnes)'} | 生视频模型: ${vid?.name || '未配置(回退Agnes)'}`);
});

module.exports = { app, normalizeProject, assertExpectedRevision, saveProject, loadProject, findProjectEntity, attachAsset, buildSrt, formatSrtTime, buildManifest, buildDeliveryZip, createStoreZip, crc32, buildShotContinuityContext, normalizeConsistencyResult, contentHash, preprocessMatches, validateTextInput, isApiRequestAuthorized, createConcurrencyLimiter, validateProviderBaseUrl, sanitizeProviderInput, PROJECTS_DIR };
