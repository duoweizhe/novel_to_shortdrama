// store.js — 状态管理与 localStorage 持久化

const STORAGE_KEY = 'shortdrama_studio_v1';

export const state = {
  projects: [],
  currentId: null,
  view: 'characters',
  generating: false,
  error: null,
};

function uid() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function defaultProject(name) {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: name || '未命名项目',
    sourceText: '',
    createdAt: now,
    updatedAt: now,
    config: {
      apiKey: '',
      baseUrl: 'https://api.openai.com',
      model: 'gpt-4o-mini',
      episodes: 1,
      durationPerEp: 60,
      style: '电影感·冷调悬疑',
      aspectRatio: '16:9',
      batchSize: 8,
    },
    characters: [],
    scenes: [],
    shots: [],
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      state.projects = data.projects || [];
      state.currentId = data.currentId || (state.projects[0] && state.projects[0].id);
      if (!state.currentId && state.projects.length) state.currentId = state.projects[0].id;
    }
  } catch (e) {
    console.warn('load failed', e);
  }
  if (!state.projects.length) {
    return false;
  }
  return true;
}

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      projects: state.projects,
      currentId: state.currentId,
    }));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('localStorage 配额已满');
      return false;
    }
    console.warn('save failed', e);
    return false;
  }
  return true;
}

export function current() {
  return state.projects.find(p => p.id === state.currentId) || null;
}

export function createProject(name, preset) {
  const p = preset ? { ...defaultProject(name), ...preset, id: uid() } : defaultProject(name);
  state.projects.push(p);
  state.currentId = p.id;
  save();
  return p;
}

export function deleteProject(id) {
  const idx = state.projects.findIndex(p => p.id === id);
  if (idx === -1) return;
  state.projects.splice(idx, 1);
  if (state.currentId === id) {
    state.currentId = state.projects[0] ? state.projects[0].id : null;
  }
  save();
}

export function switchProject(id) {
  state.currentId = id;
  save();
}

export function touch() {
  const p = current();
  if (p) { p.updatedAt = new Date().toISOString(); save(); }
}

// 通用字段更新：path 如 ['characters', id, 'name']
export function updateField(path, value) {
  const p = current();
  if (!p) return;
  let obj = p;
  for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
  obj[path[path.length - 1]] = value;
  touch();
}

export function updateItem(type, id, patch) {
  const p = current();
  if (!p) return;
  const item = p[type].find(x => x.id === id);
  if (item) { Object.assign(item, patch); touch(); }
}

export function updateConfig(patch) {
  const p = current();
  if (!p) return;
  Object.assign(p.config, patch);
  touch();
}

export function addItem(type, item) {
  const p = current();
  if (!p) return;
  const full = { id: uid(), ...item };
  p[type].push(full);
  touch();
  return full;
}

export function deleteItem(type, id) {
  const p = current();
  if (!p) return;
  p[type] = p[type].filter(x => x.id !== id);
  if (type === 'characters') {
    p.shots.forEach(s => { s.characterIds = s.characterIds.filter(cid => cid !== id); });
  }
  if (type === 'scenes') {
    p.shots.forEach(s => { if (s.sceneId === id) s.sceneId = ''; });
  }
  touch();
}

export function updateShot(id, patch) {
  const p = current();
  if (!p) return;
  const s = p.shots.find(x => x.id === id);
  if (s) { Object.assign(s, patch); touch(); }
}

export function moveShot(id, dir) {
  const p = current();
  if (!p) return;
  const idx = p.shots.findIndex(s => s.id === id);
  const ni = idx + dir;
  if (idx === -1 || ni < 0 || ni >= p.shots.length) return;
  [p.shots[idx], p.shots[ni]] = [p.shots[ni], p.shots[idx]];
  touch();
}

export { uid, defaultProject };
