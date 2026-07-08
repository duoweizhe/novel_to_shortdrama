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
  { key: 'cinematic', label: '电影写实', desc: '电影级写实质感，冷调光影', promptSuffix: 'photorealistic, cinematic lighting, 8K, film grain, shallow depth of field, DSLR, realistic skin texture, movie still', negativePrompt: 'cartoon, anime, illustration, 3D render, CGI' },
  { key: 'anime', label: '日漫风', desc: '日本动漫，线条清晰，色彩鲜明', promptSuffix: 'anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic', negativePrompt: 'photorealistic, 3D render, live action' },
  { key: 'dongman', label: '国漫风', desc: '中国动画，水墨元素与现代表现', promptSuffix: 'Chinese donghua style, flowing robes, celestial beauty, ink wash elements, dramatic lighting, 3D Chinese animation', negativePrompt: 'anime, Japanese style, western cartoon' },
  { key: '3d', label: '3D动画', desc: 'Pixar/Disney 质感三维动画', promptSuffix: '3D animation, Pixar style, Unreal Engine 5 render, volumetric lighting, smooth shading, CGI', negativePrompt: '2D, flat, hand drawn, sketch' },
  { key: 'realistic', label: '仿真人', desc: '高度写实真人电影质感', promptSuffix: 'photorealistic, cinematic, live action film still, natural lighting, 8k photography, realistic skin texture', negativePrompt: 'cartoon, anime, illustration, 3D render' },
  { key: 'comic', label: '美漫风', desc: '美式漫画，粗线条强对比', promptSuffix: 'American comic book style, bold outlines, halftone dots, dramatic shadows, dynamic composition', negativePrompt: 'anime, realistic, photograph, 3D render' },
  { key: 'ink', label: '水墨风', desc: '中国传统水墨画，留白意境', promptSuffix: 'Chinese ink wash painting, sumi-e, brush strokes, minimalist composition, monochrome with subtle color', negativePrompt: 'photorealistic, 3D, cartoon, vibrant colors' },
  { key: 'pixel', label: '像素风', desc: '复古像素游戏风格', promptSuffix: 'pixel art, 16-bit style, limited color palette, crisp pixels, retro game aesthetic', negativePrompt: 'photorealistic, high resolution, smooth, 3D render' },
  { key: 'watercolor', label: '水彩风', desc: '柔和透明水彩画风', promptSuffix: 'watercolor painting, soft edges, transparent washes, paper texture, delicate brushstrokes', negativePrompt: 'photorealistic, digital art, 3D render, sharp edges' },
  { key: 'cyberpunk', label: '赛博朋克', desc: '霓虹灯未来反乌托邦', promptSuffix: 'cyberpunk aesthetic, neon lights, rain-soaked streets, holographic displays, blade runner inspired, dark atmosphere', negativePrompt: 'natural, pastoral, medieval, bright daylight, cartoon' },
  { key: 'fantasy', label: '奇幻风', desc: '西式奇幻史诗感', promptSuffix: 'high fantasy art, epic illustration, magical atmosphere, ethereal lighting, detailed armor, concept art', negativePrompt: 'modern, urban, realistic photograph, sci-fi' },
];

function getStyle(key) { return VISUAL_STYLES.find(s => s.key === key) || VISUAL_STYLES[0]; }
function getStyleContext(key) {
  const s = getStyle(key);
  return `\n\n【指定画面风格：${s.label}】${s.desc}\n风格后缀(请附加到所有生图/视频Prompt)：${s.promptSuffix}\nNegative Prompt：${s.negativePrompt}`;
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
  structure: `你是一位专业编剧顾问和故事结构分析师，精通三幕结构、英雄之旅。请根据用户内容进行剧情结构分析。

## 📐 剧情结构分析

### 1. 核心冲突
- 一句话故事引擎：一个XX的XX，为了XX，必须XX，否则XX
- 核心冲突类型：人vs人/人vs自然/人vs社会/人vs自我/人vs命运
- 主题/母题

### 2. 三幕结构
#### 第一幕：建置（约25%）
- 起始状态、激励事件、第一转折点
#### 第二幕：对抗（约50%）
- 上升行动、中点、升级对抗、暗夜时刻
#### 第三幕：解决（约25%）
- 高潮、结局

### 3. 五个关键转折点
| 转折点 | 位置 | 事件 | 功能 |
（激励事件~10% / 第一转折~25% / 中点~50% / 第二转折~75% / 高潮~90%）

### 4. 情感曲线（1-10分标注）
### 5. 冲突层级（外部/内部/关系）
### 6. 节奏建议
### 7. 短剧改编骨架（建议集数、每集覆盖、结尾钩子、改编优先级）

基于原文实际内容，转折点引用具体情节。`,

  summary: `你是一位资深影视制作总监兼改编编剧。请生成面向实际制作的分析报告。

## 📊 制作分析报告

### 1. 内容评估
- 故事类型、核心卖点、目标平台、建议集数、每集时长

### 2. 改编策略
- 必须保留的核心情节、可删减内容、需合并简化内容、建议原创补充

### 3. 断集建议
- 每集覆盖范围、核心冲突、结尾钩子

### 4. 角色分析（数量、关系图谱、选角建议）
### 5. 场景分析（数量类型、拍摄难度、特殊场景）
### 6. 制作建议（拍摄手法、特效需求、预算级别、周期）
### 7. 风险提示（改编难点、审查风险、观众反馈）

改编策略和断集建议要具体到原文段落级别。`,

  script: `你是一位专业短剧编剧兼导演。请生成可直接拍摄的短剧脚本。

## 📝 短剧脚本

### 基本信息
剧名、集数、每集时长、类型风格、目标受众

### 剧情大纲（3-5句）

### 第 X 集：[集名]
#### 场景 1：[场景名]
- 时间、地点、人物
- 画面描述（电影化镜头语言）
- 角色A：（表演指导：语气/节奏/肢体）"对白"  潜台词：[...]
- 音效/BGM
- [转场设计]

### 本集要点
核心冲突、情感高潮、结尾钩子

要求：节奏紧凑、对白有潜台词、表演指导具体可执行、转场有情绪目的。`,

  assets: `你是一位专业影视视觉总监兼AI绘图专家。请生成风格统一的视觉资产清单。

## 🎨 视觉资产设计

### 0. 全局视觉风格
整体风格、色调体系、参考作品、通用风格后缀、通用负面后缀

### 1. 角色立绘
为每个主要角色生成：全身立绘Prompt、半身像Prompt、表情包Prompt、标志性动作Prompt（英文）

### 2. 关键场景图
为每个重要场景生成：全景图Prompt、细节图Prompt（英文）

### 3. 道具/物品 Prompt（英文）

### 4. 封面/海报
主视觉Prompt、剧名排版建议、系列海报方案

### 5. 风格参考图集

所有Prompt使用英文，包含通用风格后缀。`,

  manga: `你是一位专业漫画分镜师和漫剧编剧。请生成漫画/漫剧脚本。

## 📖 漫画/漫剧脚本

### 基本信息
漫画名、总页数、风格类型（日漫/韩漫/国漫/美漫/条漫）、目标平台、阅读方向

### 剧情大纲

### 第 X 页
#### 格1 [布局]
- 画面描述、角色表情、对白框[位置]"对白"、旁白框、音效字[风格]、情绪符号、格间过渡、留白/出血

### 本页要点
叙事节奏、翻页钩子

要求：每页有叙事目的、分格反映重要程度、对白框考虑阅读流线、音效字匹配情绪、翻页制造惊喜。`,
};

// 结构化模块：角色设定（输出 JSON，4视图 Prompt）
const CHARACTERS_PROMPT = `你是专业短剧角色设计师。从用户源文本提取角色设定。严格输出JSON，不要输出JSON以外文字：
{
  "characters": [
    {
      "name":"角色名","role":"主角/对手/导师/盟友等","gender":"性别","age":"年龄",
      "appearance":"外貌描述(发型/五官/体型/肤色)","personality":"性格特征与说话方式",
      "costume":"服装与道具","arc":"角色弧光(起点→终点)",
      "facePromptZh":"面部上半身特写的中文AI生图prompt(五官/表情/发型/肤色)",
      "facePromptEn":"面部上半身特写的英文AI生图prompt",
      "frontPromptZh":"正面全身照的中文AI生图prompt(全身比例/站姿/服装/鞋)",
      "frontPromptEn":"正面全身照的英文AI生图prompt",
      "sidePromptZh":"侧面全身照的中文AI生图prompt(侧脸/侧身轮廓/姿态)",
      "sidePromptEn":"侧面全身照的英文AI生图prompt",
      "backPromptZh":"背面全身照的中文AI生图prompt(背影/发型背面/服装背面)",
      "backPromptEn":"背面全身照的英文AI生图prompt"
    }
  ]
}
要求：只输出JSON对象；所有英文Prompt必须英文；4视图需保持同一角色形象一致性；信息不足可基于剧情合理补全。`;

// 结构化模块：场景设定（输出 JSON）
const SCENES_PROMPT = `你是专业影视场景设计师。从用户源文本提取场景设定。严格输出JSON，不要输出JSON以外文字：
{
  "scenes": [
    {
      "name":"场景名","environment":"环境描述(空间布局/建筑/时代)","mood":"氛围情绪",
      "lighting":"光照设计(光源/质感/明暗)","timeOfDay":"时间段(日/夜/黄昏等)",
      "narrativeFunction":"叙事功能(建置/激励/高潮等)","keyProps":"关键道具",
      "imagePromptZh":"用于AI生成场景图的中文prompt，含环境氛围光线",
      "imagePromptEn":"用于AI生成场景图的英文prompt，含环境氛围光线"
    }
  ]
}
要求：只输出JSON对象；imagePromptEn必须英文。`;

// 结构化模块：分镜脚本（输出 JSON）
const STORYBOARD_PROMPT = `你是专业短剧分镜导演。将用户源文本拆分为分镜脚本，为每个分镜生成中英文AI视频提示词。严格输出JSON，不要输出JSON以外文字：
{
  "shots": [
    {
      "episode":1,"sceneNo":1,"shotNo":1,
      "shotType":"景别(远景/全景/中景/近景/特写)",
      "cameraAngle":"机位角度(平视/俯拍/仰拍/主观/过肩)",
      "cameraMove":"镜头运动(固定/推/拉/摇/移/跟/手持)",
      "visual":"画面描述(镜头看到什么)","dialogue":"对白(无则空)",
      "action":"动作描述(人物动作与镜头运动)","duration":5,
      "emotion":"情感强度1-10",
      "characterNames":["出场角色名,与角色参考卡一致"],
      "sceneName":"场景名,与场景参考卡一致",
      "promptZh":"融合角色外貌与场景环境的中文AI视频提示词",
      "promptEn":"融合角色外貌与场景环境的英文AI视频提示词，含景别主体动作光影氛围画幅"
    }
  ]
}
要求：只输出JSON对象；characterNames用参考卡角色名；sceneName用参考卡场景名；promptEn必须英文含景别/主体/动作/光影/氛围/画幅比例；duration整数2-8秒；shotNo同场内递增。`;

const KB_EXTRACT_PROMPT = `你是文学编辑。从以下内容提取角色、场景、道具信息，用JSON输出：
{
  "characters":[{"name":"角色名","aliases":[],"description":"描述","traits":"性格","appearance":"外貌"}],
  "scenes":[{"name":"场景名","type":"室内/室外","description":"描述","mood":"氛围"}],
  "props":[{"name":"道具名","description":"描述","significance":"叙事意义"}],
  "timeline":[{"chapter":"章节","event":"事件","time":"时间"}]
}
只输出JSON。无新信息则对应字段输出空数组。`;

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
  { id: 'agnes', name: 'Agnes AI', type: 'media', baseUrl: 'https://apihub.agnes-ai.com/v1', defaultModel: 'agnes-image-2.0-flash', models: ['agnes-image-2.0-flash', 'agnes-video-v2.0'] },
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
  return cfg.providers.find(p => p.apiKey && p.baseUrl.includes('agnes')) || null;
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

    // 结构化模块
    if (type === 'characters' || type === 'scenes' || type === 'storyboard') {
      const promptMap = { characters: CHARACTERS_PROMPT, scenes: SCENES_PROMPT, storyboard: STORYBOARD_PROMPT };
      const raw = await callLLM(promptMap[type], finalContent, false);
      send({ status: 'done', type, result: parseJSON(raw), raw });
    } else {
      // Markdown 模块 — 流式
      if (!PROMPTS[type]) throw new Error('不支持的分析类型: ' + type);
      const stream = await callLLM(PROMPTS[type], finalContent, true);
      let buf = '';
      for await (const delta of streamChunks(stream)) {
        buf += delta; send({ status: 'chunk', type, content: delta });
      }
      send({ status: 'done', type, result: buf });
    }

    // 保存到项目
    if (p) {
      if (!p.results) p.results = {};
      if (type === 'characters' || type === 'scenes' || type === 'storyboard') {
        p.results[type] = parseJSON(await new Promise(r => r(null)) || raw);
      }
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
          const stream = await callLLM(PROMPTS[type], contentForType, true);
          let buf = '';
          for await (const delta of streamChunks(stream)) { buf += delta; send({ status: 'module_chunk', type, content: delta }); }
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
    const prompt = `你是影视制作质量控制专家。检查以下各分析模块间的一致性问题，输出Markdown报告：检查结果概览(总数/通过/警告/错误)、角色一致性、场景一致性、情节逻辑、时间线、修改建议。基于实际内容检查，不要泛泛而谈。`;
    const stream = await callLLM(prompt, combined, true);
    for await (const delta of streamChunks(stream)) send({ content: delta });
  } catch (e) { send({ error: e.message }); }
  res.write('data: [DONE]\n\n'); res.end();
});

// ===================================================================
//  API: AI 生图/生视频
// ===================================================================
app.post('/api/generate/image', async (req, res) => {
  const { prompt, negativePrompt, size, visualStyle } = req.body;
  if (!prompt) return res.status(400).json({ error: '请提供prompt' });
  const provider = getMediaProvider();
  if (!provider) return res.status(400).json({ error: '未配置图像生成提供商(Agnes/DALL-E)' });
  const styledPrompt = prompt + getStyleSuffix(visualStyle);
  const styledNeg = getStyleNegative(visualStyle, negativePrompt);
  try {
    const url = provider.baseUrl.replace(/\/+$/, '') + '/images/generations';
    const body = { model: provider.model || 'agnes-image-2.0-flash', prompt: styledNeg ? `${styledPrompt} [negative: ${styledNeg}]` : styledPrompt, size: size || '1024x1024', extra_body: { response_format: 'url' } };
    const r = await withRetry(async () => {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + provider.apiKey }, body: JSON.stringify(body) });
      if (!resp.ok) throw new Error(`图片API错误 ${resp.status}: ${await resp.text()}`);
      const d = await resp.json();
      return d.data?.[0]?.url || d.data?.[0]?.b64_json || '';
    }, { maxRetries: 3, timeoutMs: 120000, label: '图片生成' });
    res.json({ ok: true, url: r });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.post('/api/generate/video', async (req, res) => {
  const { prompt, visualStyle, ...opts } = req.body;
  if (!prompt) return res.status(400).json({ error: '请提供prompt' });
  const provider = getMediaProvider();
  if (!provider) return res.status(400).json({ error: '未配置视频生成提供商' });
  const styledPrompt = prompt + getStyleSuffix(visualStyle);
  try {
    const url = provider.baseUrl.replace(/\/+$/, '') + '/videos';
    const r = await withRetry(async () => {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + provider.apiKey }, body: JSON.stringify({ model: 'agnes-video-v2.0', prompt: styledPrompt, height: opts.height || 768, width: opts.width || 1152, num_frames: opts.num_frames || 121, frame_rate: opts.frame_rate || 24, ...opts }) });
      if (!resp.ok) throw new Error(`视频API错误 ${resp.status}`);
      return resp.json();
    }, { maxRetries: 2, timeoutMs: 60000, label: '视频任务' });
    res.json({ ok: true, ...r });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.get('/api/generate/video/:videoId', async (req, res) => {
  const provider = getMediaProvider();
  if (!provider) return res.status(400).json({ error: '未配置提供商' });
  try {
    const resp = await fetch(`https://apihub.agnes-ai.com/agnesapi?video_id=${req.params.videoId}`, { headers: { 'Authorization': 'Bearer ' + provider.apiKey } });
    if (!resp.ok) throw new Error(`查询错误 ${resp.status}`);
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
