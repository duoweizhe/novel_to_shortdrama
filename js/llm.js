// llm.js — LLM 调用与 Prompt 模板

const TIMEOUT_MS = 90000;

export async function callLLM(messages, config, { temperature = 0.7, timeout = TIMEOUT_MS } = {}) {
  if (!config.apiKey) throw new Error('请先在左侧配置 API Key');
  const url = config.baseUrl.replace(/\/+$/, '') + '/v1/chat/completions';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config.apiKey },
      body: JSON.stringify({ model: config.model, messages, temperature }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`请求失败 ${res.status}：${txt.slice(0, 300)}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    if (!content) throw new Error('模型返回空内容');
    return content;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('请求超时，请减小单批分镜上限或缩短源文本后重试');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function testConnection(config) {
  const msg = await callLLM(
    [{ role: 'user', content: '请回复"OK"两个字符。' }],
    config,
    { temperature: 0, timeout: 20000 }
  );
  return msg;
}

// 容错 JSON 解析
export function parseJSON(text) {
  if (!text) throw new Error('空内容');
  try { return JSON.parse(text); } catch (_) {}
  const candidates = [
    text.match(/\{[\s\S]*\}/),
    text.match(/\[[\s\S]*\]/),
  ].filter(Boolean);
  for (const m of candidates) {
    try { return JSON.parse(m[0]); } catch (_) {}
  }
  throw new Error('模型输出格式异常，无法解析为 JSON');
}

const SETTINGS_SYS = `你是专业短剧分镜编剧助手。任务：从用户提供的源文本中提取"角色设定"与"场景设定"。
严格输出 JSON，结构如下，不要输出任何 JSON 以外的文字：
{
  "characters": [
    {"name":"角色名","gender":"性别","age":"年龄","appearance":"外貌描述(发型/五官/体型)","personality":"性格特征","costume":"服装与道具","imagePromptZh":"用于AI生成该角色形象图的中文prompt","imagePromptEn":"用于AI生成该角色形象图的英文prompt"}
  ],
  "scenes": [
    {"name":"场景名","environment":"环境描述","mood":"氛围","lighting":"光照","timeOfDay":"时间段(日/夜/黄昏等)","imagePromptZh":"用于AI生成该场景图的中文prompt","imagePromptEn":"用于AI生成该场景图的英文prompt"}
  ]
}
要求：
1. 只输出 JSON 对象，键名必须与上述一致。
2. imagePromptEn 必须为英文，描述具体视觉元素以便文生图模型使用。
3. 若源文本信息不足，可基于剧情合理补全，保持连贯。`;

export async function generateSettings(sourceText, config) {
  const content = await callLLM(
    [
      { role: 'system', content: SETTINGS_SYS },
      { role: 'user', content: '源文本如下：\n\n' + sourceText },
    ],
    config,
    { temperature: 0.5 }
  );
  const obj = parseJSON(content);
  return {
    characters: Array.isArray(obj.characters) ? obj.characters : [],
    scenes: Array.isArray(obj.scenes) ? obj.scenes : [],
  };
}

function buildSettingsContext(characters, scenes) {
  const cs = characters.map((c, i) =>
    `[角色${i + 1}] 名:${c.name} | 外貌:${c.appearance} | 服装:${c.costume} | 性格:${c.personality}`
  ).join('\n');
  const sc = scenes.map((s, i) =>
    `[场景${i + 1}] 名:${s.name} | 环境:${s.environment} | 氛围:${s.mood} | 光照:${s.lighting} | 时间:${s.timeOfDay}`
  ).join('\n');
  return `【角色参考卡】\n${cs}\n\n【场景参考卡】\n${sc}`;
}

const SHOTS_SYS = `你是专业短剧分镜导演。任务：将用户提供的源文本片段拆分为分镜脚本，并为每个分镜生成可直接用于 AI 视频生成模型的中英文提示词。

严格输出 JSON，结构如下，不要输出任何 JSON 以外文字：
{
  "shots": [
    {
      "episode": 1,
      "sceneNo": 1,
      "shotNo": 1,
      "shotType": "景别(远景/全景/中景/近景/特写)",
      "visual": "画面描述(镜头看到什么)",
      "dialogue": "对白(无对白则留空)",
      "action": "动作描述(人物动作与镜头运动)",
      "duration": 5,
      "characterNames": ["出场角色名,与参考卡一致"],
      "sceneName": "场景名,与参考卡一致",
      "promptZh": "融合角色外貌与场景环境的中文AI视频提示词",
      "promptEn": "融合角色外貌与场景环境的英文AI视频提示词"
    }
  ]
}

要求：
1. 只输出 JSON 对象。
2. characterNames 必须使用参考卡中的角色名；sceneName 必须使用参考卡中的场景名。
3. promptEn 必须为英文，包含景别、主体、动作、光影、氛围、画幅比例，用于驱动 Sora/可灵/Runway 等模型。
4. promptZh 与 promptEn 内容对应，promptEn 可更精炼。
5. duration 为整数秒，单个分镜 2-8 秒。
6. shotNo 在同一场内从 1 递增。`;

export async function generateShotsForChunk(chunk, characters, scenes, config) {
  const ctx = buildSettingsContext(characters, scenes);
  const content = await callLLM(
    [
      { role: 'system', content: SHOTS_SYS },
      { role: 'user', content: ctx + '\n\n【短剧参数】画幅: ' + config.aspectRatio + ' | 风格: ' + config.style + ' | 每集时长: ' + config.durationPerEp + '秒\n\n【本段源文本】\n' + chunk + '\n\n请将本段拆分为分镜，输出 JSON。' },
    ],
    config,
    { temperature: 0.6 }
  );
  const obj = parseJSON(content);
  return Array.isArray(obj.shots) ? obj.shots : [];
}

// 将源文本按段落分块
export function chunkText(text, maxChars = 2500) {
  const paras = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  if (!paras.length) return [];
  const chunks = [];
  let cur = '';
  for (const para of paras) {
    if (cur && (cur.length + para.length) > maxChars) {
      chunks.push(cur);
      cur = '';
    }
    cur += (cur ? '\n\n' : '') + para;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

// 名称 → id 映射
function buildNameMaps(characters, scenes) {
  const charByName = {};
  characters.forEach(c => { charByName[c.name] = c.id; charByName[c.name.trim()] = c.id; });
  const sceneByName = {};
  scenes.forEach(s => { sceneByName[s.name] = s.id; sceneByName[s.name.trim()] = s.id; });
  return { charByName, sceneByName };
}

// 完整生成分镜：分块调用并合并、重映射 id、重新编号
export async function generateShots(sourceText, characters, scenes, config, onProgress) {
  const chunks = chunkText(sourceText, 2500);
  const { charByName, sceneByName } = buildNameMaps(characters, scenes);
  const all = [];
  for (let i = 0; i < chunks.length; i++) {
    if (onProgress) onProgress(i + 1, chunks.length);
    const shots = await generateShotsForChunk(chunks[i], characters, scenes, config);
    all.push(...shots);
  }
  // 重映射与重新编号
  let ep = 1, sceneNo = 0, shotNo = 0, accDur = 0;
  const mapped = all.map(s => {
    if (s.episode && s.episode !== ep) { ep = s.episode; sceneNo = 0; shotNo = 0; accDur = 0; }
    if (s.sceneNo && s.sceneNo !== sceneNo) { sceneNo = s.sceneNo; shotNo = 0; }
    shotNo += 1;
    accDur += (s.duration || 5);
    const names = Array.isArray(s.characterNames) ? s.characterNames : [];
    const characterIds = names.map(n => charByName[n] || charByName[(n || '').trim()]).filter(Boolean);
    return {
      episode: ep,
      sceneNo: sceneNo || 1,
      shotNo,
      shotType: s.shotType || '中景',
      visual: s.visual || '',
      dialogue: s.dialogue || '',
      action: s.action || '',
      duration: Number(s.duration) || 5,
      characterIds,
      sceneId: sceneByName[s.sceneName] || sceneByName[(s.sceneName || '').trim()] || (scenes[0] && scenes[0].id) || '',
      promptZh: s.promptZh || '',
      promptEn: s.promptEn || '',
    };
  });
  return mapped;
}
