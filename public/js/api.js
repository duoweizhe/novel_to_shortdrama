// api.js — 前端 API 封装

export async function http(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// 流式 SSE 调用，onData 接收解析后的事件对象
export async function sse(url, body, onData, signal) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
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
      try { onData(JSON.parse(d)); } catch {}
    }
  }
}

export const api = {
  listProjects: () => http('/api/projects'),
  createProject: (name, style) => http('/api/projects', { method: 'POST', body: { name, style } }),
  getProject: (id) => http('/api/projects/' + id),
  updateProject: (id, patch) => http('/api/projects/' + id, { method: 'PUT', body: patch }),
  deleteProject: (id) => http('/api/projects/' + id, { method: 'DELETE' }),
  importProject: (data) => http('/api/projects/import', { method: 'POST', body: data }),
  importChapters: (id, content) => http(`/api/projects/${id}/chapters/import`, { method: 'POST', body: { content } }),
  addChapter: (id, title, content, group) => http(`/api/projects/${id}/chapters`, { method: 'POST', body: { title, content, group } }),
  updateChapter: (id, chId, patch) => http(`/api/projects/${id}/chapters/${chId}`, { method: 'PUT', body: patch }),
  deleteChapter: (id, chId) => http(`/api/projects/${id}/chapters/${chId}`, { method: 'DELETE' }),
  getKnowledge: (id) => http(`/api/projects/${id}/knowledge`),
  updateKnowledge: (id, kb) => http(`/api/projects/${id}/knowledge`, { method: 'PUT', body: kb }),
  exportMd: (id) => `/api/projects/${id}/export-md`,
  snapshot: (id, label) => http(`/api/projects/${id}/snapshot`, { method: 'POST', body: { label } }),
  getSnapshots: (id) => http(`/api/projects/${id}/snapshots`),
  restoreSnapshot: (id, snId) => http(`/api/projects/${id}/snapshots/${snId}/restore`, { method: 'POST' }),
  styles: () => http('/api/styles'),
  getConfig: () => http('/api/config/llm'),
  saveConfig: (cfg) => http('/api/config/llm', { method: 'PUT', body: cfg }),
  testConn: (baseUrl, apiKey, model) => http('/api/config/llm/test', { method: 'POST', body: { baseUrl, apiKey, model } }),
  genImage: (prompt, negativePrompt, size, style) => http('/api/generate/image', { method: 'POST', body: { prompt, negativePrompt, size, visualStyle: style } }),
  genVideo: (prompt, style, opts) => http('/api/generate/video', { method: 'POST', body: { prompt, visualStyle: style, ...opts } }),
  getVideo: (id) => http('/api/generate/video/' + id),
  preprocess: (content, onData, signal) => sse('/api/preprocess', { content }, onData, signal),
  analyze: (params, onData, signal) => sse('/api/analyze', params, onData, signal),
  analyzeAll: (params, onData, signal) => sse('/api/analyze-all', params, onData, signal),
  checkConsistency: (results, knowledge, onData, signal) => sse('/api/check-consistency', { results, knowledge }, onData, signal),
};
