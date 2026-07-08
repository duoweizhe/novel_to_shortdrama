// export.js — Markdown / JSON 导出

function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportJSON(project) {
  const data = {
    name: project.name,
    config: project.config,
    sourceText: project.sourceText,
    characters: project.characters,
    scenes: project.scenes,
    shots: project.shots,
  };
  download((project.name || 'shortdrama') + '.json', JSON.stringify(data, null, 2), 'application/json');
}

export function exportMarkdown(project) {
  const L = [];
  L.push(`# ${project.name}\n`);
  L.push(`> 生成时间：${new Date(project.updatedAt).toLocaleString('zh-CN')}`);
  L.push(`> 风格：${project.config.style} | 画幅：${project.config.aspectRatio} | 每集时长：${project.config.durationPerEp}s\n`);

  L.push(`## 一、角色设定\n`);
  project.characters.forEach((c, i) => {
    L.push(`### ${i + 1}. ${c.name || '未命名'}\n`);
    L.push(`- 性别：${c.gender || '-'} ｜ 年龄：${c.age || '-'}`);
    L.push(`- 外貌：${c.appearance || '-'}`);
    L.push(`- 性格：${c.personality || '-'}`);
    L.push(`- 服装道具：${c.costume || '-'}`);
    L.push(`- 形象图 Prompt(中)：${c.imagePromptZh || '-'}`);
    L.push(`- 形象图 Prompt(英)：${c.imagePromptEn || '-'}\n`);
  });

  L.push(`## 二、场景设定\n`);
  project.scenes.forEach((s, i) => {
    L.push(`### ${i + 1}. ${s.name || '未命名'}\n`);
    L.push(`- 环境：${s.environment || '-'}`);
    L.push(`- 氛围：${s.mood || '-'}`);
    L.push(`- 光照：${s.lighting || '-'}`);
    L.push(`- 时间段：${s.timeOfDay || '-'}`);
    L.push(`- 场景图 Prompt(中)：${s.imagePromptZh || '-'}`);
    L.push(`- 场景图 Prompt(英)：${s.imagePromptEn || '-'}\n`);
  });

  L.push(`## 三、分镜脚本\n`);
  const charName = id => (project.characters.find(c => c.id === id) || {}).name || '?';
  const sceneName = id => (project.scenes.find(s => s.id === id) || {}).name || '?';
  project.shots.forEach(s => {
    L.push(`### 第${s.episode}集 · 第${s.sceneNo}场 · 第${s.shotNo}镜  [${s.shotType || '中景'} · ${s.duration}s]\n`);
    L.push(`- 画面：${s.visual || '-'}`);
    L.push(`- 对白：${s.dialogue || '-'}`);
    L.push(`- 动作：${s.action || '-'}`);
    L.push(`- 角色：${(s.characterIds || []).map(charName).join('、') || '-'}`);
    L.push(`- 场景：${sceneName(s.sceneId)}`);
    L.push(`- **AI视频Prompt(中)**：${s.promptZh || '-'}`);
    L.push(`- **AI视频Prompt(英)**：\`${s.promptEn || '-'}\`\n`);
  });

  download((project.name || 'shortdrama') + '.md', L.join('\n'), 'text/markdown;charset=utf-8');
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    return false;
  }
}
