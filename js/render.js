// render.js — 视图渲染(角色 / 场景 / 分镜)

import { state, current, updateField, updateItem, addItem, deleteItem, updateShot, moveShot } from './store.js';
import { copyToClipboard } from './export.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + (type || '');
  clearTimeout(window.__toastT);
  window.__toastT = setTimeout(() => { el.className = 'toast'; }, 2200);
}
export { toast };

function bindEditable(el, path, getter) {
  el.addEventListener('blur', () => {
    const v = getter(el);
    updateField(path, v);
  });
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && el.tagName !== 'TEXTAREA') { e.preventDefault(); el.blur(); }
  });
}

// ---- 配置面板 ----
export function renderConfig() {
  const p = current();
  if (!p) return;
  const set = (id, key, isNum) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = p.config[key];
    el.oninput = () => {
      const v = isNum ? (parseInt(el.value) || 0) : el.value;
      updateField(['config', key], v);
    };
  };
  set('apiKey', 'apiKey');
  set('baseUrl', 'baseUrl');
  set('model', 'model');
  set('episodes', 'episodes', true);
  set('durationPerEp', 'durationPerEp', true);
  set('style', 'style');
  set('aspectRatio', 'aspectRatio');
  set('batchSize', 'batchSize', true);

  const hint = document.getElementById('keyHint');
  if (p.config.apiKey) {
    const k = p.config.apiKey;
    hint.textContent = '已配置 Key：…' + k.slice(-4);
    hint.style.color = 'var(--ok)';
  } else {
    hint.textContent = '未配置 API Key';
    hint.style.color = 'var(--warn)';
  }
}

// ---- 源文本 ----
export function renderSource() {
  const p = current();
  const ta = document.getElementById('sourceText');
  ta.value = p ? p.sourceText : '';
  document.getElementById('charCount').textContent = ta.value.length;
}

// ---- 项目栏 ----
export function renderProjectBar() {
  const bar = document.getElementById('projectBar');
  const cur = current();
  let html = '<select id="projectSelect">';
  state.projects.forEach(p => {
    html += `<option value="${p.id}" ${p.id === state.currentId ? 'selected' : ''}>${esc(p.name)}</option>`;
  });
  html += '</select>';
  html += '<button class="btn ghost small" id="newProjBtn">新建</button>';
  if (cur) html += `<input type="text" id="projName" value="${esc(cur.name)}" style="width:120px" />`;
  if (state.projects.length > 1) html += '<button class="btn ghost small danger" id="delProjBtn">删除</button>';
  bar.innerHTML = html;

  const sel = document.getElementById('projectSelect');
  if (sel) sel.onchange = () => {
    import('./store.js').then(m => { m.switchProject(sel.value); import('./app.js').then(a => a.refreshAll()); });
  };
  const np = document.getElementById('newProjBtn');
  if (np) np.onclick = () => {
    import('./store.js').then(m => { m.createProject('未命名项目'); import('./app.js').then(a => a.refreshAll()); });
  };
  const pn = document.getElementById('projName');
  if (pn) pn.onchange = () => { updateField(['name'], pn.value); };
  const dp = document.getElementById('delProjBtn');
  if (dp) dp.onclick = () => {
    if (confirm('确认删除当前项目？')) {
      import('./store.js').then(m => { m.deleteProject(state.currentId); import('./app.js').then(a => a.refreshAll()); });
    }
  };
}

// ---- 角色 ----
function characterCard(c, idx) {
  const fields = [
    ['gender', '性别'], ['age', '年龄'], ['appearance', '外貌'],
    ['personality', '性格'], ['costume', '服装道具'],
    ['imagePromptZh', '形象图 Prompt(中)'], ['imagePromptEn', '形象图 Prompt(英)'],
  ];
  const isPrompt = k => k.startsWith('imagePrompt');
  const fhtml = fields.map(([k, label]) => `
    <div class="field">
      <label>${label}</label>
      <${isPrompt(k) ? 'textarea' : 'input'} data-cid="${c.id}" data-k="${k}" class="${isPrompt(k) ? 'prompt' : ''}">${esc(c[k])}</${isPrompt(k) ? 'textarea' : 'input'}>
    </div>`).join('');
  return `
    <div class="item-card" data-cid="${c.id}">
      <div class="item-head">
        <input class="item-name" data-cid="${c.id}" data-k="name" value="${esc(c.name)}" />
        <button class="btn ghost small danger" data-del-char="${c.id}">删除</button>
      </div>
      ${fhtml}
    </div>`;
}

function renderCharacters() {
  const p = current();
  const root = document.getElementById('content');
  if (!p || !p.characters.length) {
    root.innerHTML = emptyHtml('角色设定', '点击左侧"① 生成设定"从源文本提取角色');
    bindAddBtn('char');
    return;
  }
  root.innerHTML = `<div class="grid-cards">${p.characters.map(characterCard).join('')}</div>
    <div style="margin-top:12px"><button class="btn" id="addCharBtn">+ 新增角色</button></div>`;
  bindItemEdits('characters', 'cid');
  document.querySelectorAll('[data-del-char]').forEach(b => b.onclick = () => { deleteItem('characters', b.dataset.delChar); rerender(); });
  document.getElementById('addCharBtn').onclick = () => { addItem('characters', { name: '新角色', gender: '', age: '', appearance: '', personality: '', costume: '', imagePromptZh: '', imagePromptEn: '' }); rerender(); };
}

// ---- 场景 ----
function sceneCard(s) {
  const fields = [
    ['environment', '环境'], ['mood', '氛围'], ['lighting', '光照'], ['timeOfDay', '时间段'],
    ['imagePromptZh', '场景图 Prompt(中)'], ['imagePromptEn', '场景图 Prompt(英)'],
  ];
  const isPrompt = k => k.startsWith('imagePrompt');
  const fhtml = fields.map(([k, label]) => `
    <div class="field">
      <label>${label}</label>
      <${isPrompt(k) ? 'textarea' : 'input'} data-sid="${s.id}" data-k="${k}" class="${isPrompt(k) ? 'prompt' : ''}">${esc(s[k])}</${isPrompt(k) ? 'textarea' : 'input'}>
    </div>`).join('');
  return `
    <div class="item-card" data-sid="${s.id}">
      <div class="item-head">
        <input class="item-name" data-sid="${s.id}" data-k="name" value="${esc(s.name)}" />
        <button class="btn ghost small danger" data-del-scene="${s.id}">删除</button>
      </div>
      ${fhtml}
    </div>`;
}

function renderScenes() {
  const p = current();
  const root = document.getElementById('content');
  if (!p || !p.scenes.length) {
    root.innerHTML = emptyHtml('场景设定', '点击左侧"① 生成设定"从源文本提取场景');
    bindAddBtn('scene');
    return;
  }
  root.innerHTML = `<div class="grid-cards">${p.scenes.map(sceneCard).join('')}</div>
    <div style="margin-top:12px"><button class="btn" id="addSceneBtn">+ 新增场景</button></div>`;
  bindItemEdits('scenes', 'sid');
  document.querySelectorAll('[data-del-scene]').forEach(b => b.onclick = () => { deleteItem('scenes', b.dataset.delScene); rerender(); });
  document.getElementById('addSceneBtn').onclick = () => { addItem('scenes', { name: '新场景', environment: '', mood: '', lighting: '', timeOfDay: '', imagePromptZh: '', imagePromptEn: '' }); rerender(); };
}

// ---- 分镜 ----
let shotViewMode = 'table';
let shotFilter = { episode: '', sceneId: '' };

function renderShots() {
  const p = current();
  const root = document.getElementById('content');
  if (!p || !p.shots.length) {
    root.innerHTML = emptyHtml('分镜脚本', '先生成设定，再点击"② 生成分镜"');
    return;
  }
  const episodes = [...new Set(p.shots.map(s => s.episode))].sort((a, b) => a - b);
  const sceneName = id => (p.scenes.find(s => s.id === id) || {}).name || '?';

  let shots = p.shots;
  if (shotFilter.episode) shots = shots.filter(s => s.episode == shotFilter.episode);
  if (shotFilter.sceneId) shots = shots.filter(s => s.sceneId === shotFilter.sceneId);

  const toolbar = `
    <div class="shot-toolbar">
      <select id="filterEp">
        <option value="">全部集</option>
        ${episodes.map(e => `<option value="${e}" ${shotFilter.episode == e ? 'selected' : ''}>第${e}集</option>`).join('')}
      </select>
      <select id="filterScene">
        <option value="">全部场景</option>
        ${p.scenes.map(s => `<option value="${s.id}" ${shotFilter.sceneId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
      </select>
      <div class="seg">
        <button class="${shotViewMode === 'table' ? 'active' : ''}" data-mode="table">表格</button>
        <button class="${shotViewMode === 'grid' ? 'active' : ''}" data-mode="grid">网格</button>
      </div>
      <button class="btn small" id="addShotBtn">+ 新增分镜</button>
    </div>`;

  let body = '';
  if (shotViewMode === 'table') {
    body = `<table class="shots"><thead><tr>
      <th class="num">集</th><th class="num">场</th><th class="num">镜</th>
      <th>景别</th><th>画面</th><th>对白</th><th>动作</th><th class="num">秒</th>
      <th>角色</th><th>场景</th><th class="prompt-cell">Prompt(中)</th><th class="prompt-cell">Prompt(英)</th><th></th>
    </tr></thead><tbody>
    ${shots.map(s => `<tr>
      <td class="num">${s.episode}</td>
      <td class="num">${s.sceneNo}</td>
      <td class="num">${s.shotNo}</td>
      <td><div class="cell-edit" contenteditable data-shot="${s.id}" data-k="shotType">${esc(s.shotType)}</div></td>
      <td><div class="cell-edit" contenteditable data-shot="${s.id}" data-k="visual">${esc(s.visual)}</div></td>
      <td><div class="cell-edit" contenteditable data-shot="${s.id}" data-k="dialogue">${esc(s.dialogue)}</div></td>
      <td><div class="cell-edit" contenteditable data-shot="${s.id}" data-k="action">${esc(s.action)}</div></td>
      <td class="num"><div class="cell-edit" contenteditable data-shot="${s.id}" data-k="duration">${s.duration}</div></td>
      <td>${s.characterIds.map(id => esc((p.characters.find(c => c.id === id) || {}).name || '?')).join('、')}</td>
      <td>${esc(sceneName(s.sceneId))}</td>
      <td class="prompt-cell"><div class="cell-edit" contenteditable data-shot="${s.id}" data-k="promptZh">${esc(s.promptZh)}</div></td>
      <td class="prompt-cell"><div class="cell-edit" contenteditable data-shot="${s.id}" data-k="promptEn">${esc(s.promptEn)}</div></td>
      <td>
        <button class="btn ghost small" data-copy="${s.id}">复制</button>
        <button class="btn ghost small" data-up="${s.id}">↑</button>
        <button class="btn ghost small" data-down="${s.id}">↓</button>
        <button class="btn ghost small danger" data-del-shot="${s.id}">删</button>
      </td>
    </tr>`).join('')}
    </tbody></table>`;
  } else {
    body = `<div class="shot-grid">${shots.map(s => `
      <div class="shot-tile">
        <div class="tile-head"><span>第${s.episode}集·${s.sceneNo}场·${s.shotNo}镜</span><span class="badge">${esc(s.shotType)} ${s.duration}s</span></div>
        <div class="tile-visual">${esc(s.visual)}</div>
        ${s.dialogue ? `<div style="font-size:12px;color:var(--text-dim)">「${esc(s.dialogue)}」</div>` : ''}
        <div class="tile-prompt"><b>中</b>：${esc(s.promptZh)}<br><b>EN</b>：${esc(s.promptEn)}</div>
        <div class="tile-actions">
          <button class="btn ghost small" data-copy="${s.id}">复制EN</button>
          <button class="btn ghost small" data-up="${s.id}">↑</button>
          <button class="btn ghost small" data-down="${s.id}">↓</button>
          <button class="btn ghost small danger" data-del-shot="${s.id}">删</button>
        </div>
      </div>`).join('')}</div>`;
  }

  root.innerHTML = toolbar + body;

  document.getElementById('filterEp').onchange = e => { shotFilter.episode = e.target.value; renderShots(); };
  document.getElementById('filterScene').onchange = e => { shotFilter.sceneId = e.target.value; renderShots(); };
  document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { shotViewMode = b.dataset.mode; renderShots(); });
  document.getElementById('addShotBtn').onclick = () => {
    const last = p.shots[p.shots.length - 1];
    addItem('shots', {
      episode: last ? last.episode : 1, sceneNo: last ? last.sceneNo : 1, shotNo: (last ? last.shotNo : 0) + 1,
      shotType: '中景', visual: '', dialogue: '', action: '', duration: 4,
      characterIds: [], sceneId: p.scenes[0] ? p.scenes[0].id : '', promptZh: '', promptEn: '',
    });
    renderShots();
  };
  document.querySelectorAll('[data-shot]').forEach(el => {
    el.addEventListener('blur', () => {
      const k = el.dataset.k;
      let v = el.textContent;
      if (k === 'duration') v = parseInt(v) || 0;
      updateShot(el.dataset.shot, { [k]: v });
    });
  });
  document.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
    const s = p.shots.find(x => x.id === b.dataset.copy);
    if (await copyToClipboard(s.promptEn)) toast('已复制英文 Prompt', 'ok');
  });
  document.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { moveShot(b.dataset.up, -1); renderShots(); });
  document.querySelectorAll('[data-down]').forEach(b => b.onclick = () => { moveShot(b.dataset.down, 1); renderShots(); });
  document.querySelectorAll('[data-del-shot]').forEach(b => b.onclick = () => { deleteItem('shots', b.dataset.delShot); renderShots(); });
}

function bindItemEdits(type, idAttr) {
  document.querySelectorAll(`[data-${idAttr}]`).forEach(el => {
    const handler = () => {
      updateItem(type, el.dataset[idAttr], { [el.dataset.k]: el.value });
    };
    el.addEventListener('change', handler);
  });
}

function bindAddBtn(kind) {
  // placeholder
}

function emptyHtml(title, tip) {
  return `<div class="empty"><div class="big">✦</div><div style="font-size:16px;margin-bottom:6px">${title}</div><div>${tip}</div></div>`;
}

export function rerender() {
  const v = state.view;
  if (v === 'characters') renderCharacters();
  else if (v === 'scenes') renderScenes();
  else renderShots();
}

export function renderView() {
  rerender();
}
