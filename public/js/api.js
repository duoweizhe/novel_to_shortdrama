// api.js — 前端 API 封装

export async function http(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    error.response = { status: res.status, data };
    throw error;
  }
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
  const processEvent = (block) => {
    let event = 'message';
    const dataLines = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }
    const raw = dataLines.join('\n').trim();
    if (!raw || raw === '[DONE]') return;
    let data;
    try { data = JSON.parse(raw); } catch { data = { error: raw }; }
    if (event === 'error') throw new Error(data.error || data.message || '流式请求失败');
    onData(data);
  };
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done }).replace(/\r\n/g, '\n');
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';
    for (const block of blocks) processEvent(block);
    if (done) break;
  }
  if (buffer.trim()) processEvent(buffer);
}

export const api = {
  listProjects: () => http('/api/projects'),
  createProject: (name, style) => http('/api/projects', { method: 'POST', body: { name, style } }),
  getProject: (id) => http('/api/projects/' + id),
  updateProject: (id, patch, expectedRevision) => http('/api/projects/' + id, { method: 'PUT', body: { ...patch, ...(expectedRevision === undefined ? {} : { expectedRevision }) } }),
  deleteProject: (id) => http('/api/projects/' + id, { method: 'DELETE' }),
  importProject: (data) => http('/api/projects/import', { method: 'POST', body: data }),
  importChapters: (id, content) => http(`/api/projects/${id}/chapters/import`, { method: 'POST', body: { content } }),
  addChapter: (id, title, content, group) => http(`/api/projects/${id}/chapters`, { method: 'POST', body: { title, content, group } }),
  updateChapter: (id, chId, patch) => http(`/api/projects/${id}/chapters/${chId}`, { method: 'PUT', body: patch }),
  deleteChapter: (id, chId) => http(`/api/projects/${id}/chapters/${chId}`, { method: 'DELETE' }),
  getKnowledge: (id) => http(`/api/projects/${id}/knowledge`),
  updateKnowledge: (id, kb) => http(`/api/projects/${id}/knowledge`, { method: 'PUT', body: kb }),
  exportMd: (id) => `/api/projects/${id}/export-md`,
  exportJson: (id) => `/api/projects/${id}/export-json`,
  exportSrt: (id) => `/api/projects/${id}/export-srt`,
  exportEpisodeSrt: (id, episode) => `/api/projects/${id}/export-srt/${episode}`,
  exportManifest: (id) => `/api/projects/${id}/export-manifest`,
  exportDeliveryZip: (id) => `/api/projects/${id}/export-delivery.zip`,
  snapshot: (id, label) => http(`/api/projects/${id}/snapshot`, { method: 'POST', body: { label } }),
  getSnapshots: (id) => http(`/api/projects/${id}/snapshots`),
  restoreSnapshot: (id, snId) => http(`/api/projects/${id}/snapshots/${snId}/restore`, { method: 'POST' }),
  styles: () => http('/api/styles'),
  getConfig: () => http('/api/config/llm'),
  saveConfig: (cfg) => http('/api/config/llm', { method: 'PUT', body: cfg }),
  testConn: (baseUrl, apiKey, model) => http('/api/config/llm/test', { method: 'POST', body: { baseUrl, apiKey, model } }),
  genImage: (prompt, negativePrompt, size, style, images) => http('/api/generate/image', { method: 'POST', body: { prompt, negativePrompt, size, visualStyle: style, images } }),
  genVideo: (params) => http('/api/generate/video', { method: 'POST', body: params }),
  getVideo: (id) => http('/api/generate/video/' + id),
  listJobs: (projectId) => http(`/api/projects/${projectId}/jobs`),
  createJob: (projectId, job, expectedRevision) => http(`/api/projects/${projectId}/jobs`, { method: 'POST', body: { ...job, ...(expectedRevision === undefined ? {} : { expectedRevision }) } }),
  updateJob: (projectId, jobId, patch, expectedRevision) => http(`/api/projects/${projectId}/jobs/${jobId}`, { method: 'PATCH', body: { ...patch, ...(expectedRevision === undefined ? {} : { expectedRevision }) } }),
  preprocess: (content, projectId, scope, onData, signal) => sse('/api/preprocess', { content, projectId, sourceMode: scope?.mode || 'content', chapterId: scope?.mode === 'chapter' ? scope.chId : undefined }, onData, signal),
  analyze: (params, onData, signal) => sse('/api/analyze', params, onData, signal),
  analyzeAll: (params, onData, signal) => sse('/api/analyze-all', params, onData, signal),
  checkConsistency: (projectId, results, knowledge, onData, signal) => sse('/api/check-consistency', { projectId, results, knowledge }, onData, signal),
};
