import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Input, Modal, Tag } from 'animal-island-ui';
import { api } from './api.js';
import { EXAMPLE_PROJECT } from './example.js';

const { useState: useS, useEffect: useE, useRef: useR, useCallback: useCB } = React;

const MODULES = [
  { id: 'structure', name: '剧情结构', icon: '📐', type: 'md' },
  { id: 'summary', name: '制作分析', icon: '📊', type: 'md' },
  { id: 'characters', name: '角色设定', icon: '🎭', type: 'json' },
  { id: 'scenes', name: '场景设计', icon: '🏞️', type: 'json' },
  { id: 'storyboard', name: '分镜脚本', icon: '🎬', type: 'json' },
  { id: 'script', name: '短剧脚本', icon: '📝', type: 'md' },
  { id: 'assets', name: '视觉资产', icon: '🎨', type: 'md' },
  { id: 'manga', name: '漫画脚本', icon: '📖', type: 'json' },
];

function toast(msg, type) {
  const el = document.createElement('div');
  el.className = 'toast show ' + (type || '');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2200);
}
function renderMd(md) { if (!md) return ''; try { return DOMPurify.sanitize(marked.parse(md)); } catch { return DOMPurify.sanitize(String(md)); } }

function stableId(prefix) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function normalizeProject(project) {
  const production = project.results?.__production || {};
  const normalized = { ...project, revision: project.revision ?? production.revision ?? 0, sourceRevision: project.sourceRevision ?? production.sourceRevision ?? 1, assets: project.assets || production.assets || [], jobs: project.jobs || production.jobs || [] };
  const results = { ...(normalized.results || {}) };
  const withIds = (items, prefix) => (items || []).map(item => ({ ...item, id: item.id || stableId(prefix) }));
  if (results.characters) results.characters = { ...results.characters, characters: withIds(results.characters.characters, 'char') };
  if (results.scenes) results.scenes = { ...results.scenes, scenes: withIds(results.scenes.scenes, 'scene') };
  if (results.storyboard) results.storyboard = { ...results.storyboard, shots: withIds(results.storyboard.shots, 'shot') };
  if (results.manga?.pages) results.manga = { ...results.manga, pages: results.manga.pages.map(page => ({ ...page, id: page.id || stableId('page'), panels: withIds(page.panels, 'panel') })) };
  normalized.results = results;
  return normalized;
}
function mergeProjectState(serverValue, localValue) {
  if (Array.isArray(serverValue) && Array.isArray(localValue)) {
    if (![...serverValue, ...localValue].some(item => item && typeof item === 'object' && item.id)) return localValue;
    const merged = new Map(serverValue.map(item => [item?.id || stableId('merge'), item]));
    localValue.forEach(item => merged.set(item?.id || stableId('merge'), item));
    return [...merged.values()];
  }
  if (serverValue && localValue && typeof serverValue === 'object' && typeof localValue === 'object') {
    const keys = new Set([...Object.keys(serverValue), ...Object.keys(localValue)]);
    return Object.fromEntries([...keys].map(key => [key, mergeProjectState(serverValue[key], localValue[key])]));
  }
  return localValue === undefined ? serverValue : localValue;
}
function staleUpstream(project) {
  const sourceRevision = (project.sourceRevision || 1) + 1;
  const results = Object.fromEntries(Object.entries(project.results || {}).map(([key, value]) => [key, value && typeof value === 'object' ? { ...value, stale: true } : value]));
  return { sourceRevision, results, assets: (project.assets || []).map(asset => ({ ...asset, stale: true })) };
}

// ============ Sidebar (可收起) ============
function Sidebar({ projects, currentId, onSelect, onNew, onDelete, onImport, onRename, collapsed, onToggle, mobileOpen, onCloseMobile }) {
  const fileRef = useR(null);
  if (collapsed && !mobileOpen) {
    return (
      <aside className="sidebar collapsed">
        <div className="sidebar-head" style={{ justifyContent: 'center' }}>
          <Button size="small" onClick={onToggle}>»</Button>
        </div>
        <div className="sidebar-list" style={{ textAlign: 'center', padding: '8px 4px' }}>
          <div className="proj-mini" title="新建项目" onClick={onNew} style={{ fontSize: 18, cursor: 'pointer', padding: '8px 0' }}>＋</div>
          {projects.map(p => (
            <div key={p.id} title={p.name} className={`proj-mini ${p.id === currentId ? 'active' : ''}`} onClick={() => onSelect(p.id)} style={{ padding: '6px 0', cursor: 'pointer', fontSize: 13, borderRadius: 6, color: p.id === currentId ? '#fff' : 'inherit' }}>
              {p.name.slice(0, 1)}
            </div>
          ))}
        </div>
      </aside>
    );
  }
  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-head">
        <Button size="small" type="primary" onClick={onNew}>+ 新建</Button>
        <Button size="small" onClick={() => fileRef.current?.click()}>导入</Button>
        <Button size="small" ghost onClick={onToggle} className="sidebar-collapse-desktop" style={{ marginLeft: 'auto' }}>«</Button>
        <button className="sidebar-close-mobile" onClick={onCloseMobile}>✕</button>
        <input ref={fileRef} type="file" accept=".json" hidden onChange={async (e) => {
          const f = e.target.files[0]; if (!f) return;
          try { onImport(JSON.parse(await f.text())); } catch { toast('导入失败', 'error'); }
          e.target.value = '';
        }} />
      </div>
      <div className="sidebar-list">
        <div className="sidebar-list-title">项目列表</div>
        {projects.length === 0 && <div style={{ padding: 16, color: 'var(--ai-text-muted)', fontSize: 12, textAlign: 'center' }}>暂无项目<br/><span style={{fontSize:11}}>点击上方「+ 新建」创建</span></div>}
        {projects.map(p => (
          <div key={p.id} className={`proj-item ${p.id === currentId ? 'active' : ''}`} onClick={() => onSelect(p.id)} title={p.name}>
            <span className="proj-name">{p.name}</span>
            <span className="proj-actions">
              <span className="rename" onClick={(e) => { e.stopPropagation(); const n = prompt('重命名项目', p.name); if (n && n.trim()) onRename(p.id, n.trim()); }}>✎</span>
              <span className="del" onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}>✕</span>
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ============ 新建项目 Modal ============
function NewProjectModal({ open, onClose, onCreate }) {
  const [name, setName] = useS('');
  const [style, setStyle] = useS('cinematic');
  useE(() => { if (open) { setName(''); setStyle('cinematic'); } }, [open]);
  if (!open) return null;
  const styleOptions = [
    { key: 'cinematic', label: '电影写实' }, { key: 'anime', label: '日漫风' }, { key: 'dongman', label: '国漫风' },
    { key: '3d', label: '3D动画' }, { key: 'realistic', label: '仿真人' }, { key: 'cyberpunk', label: '赛博朋克' },
    { key: 'fantasy', label: '奇幻风' }, { key: 'ink', label: '水墨风' },
  ];
  return (
    <Modal open={open} title="🎬 新建项目" onClose={onClose} okText="创建" cancelText="取消" typewriter={false}
      onOk={() => { if (!name.trim()) { toast('请输入项目名', 'error'); return; } onCreate(name.trim(), style); }}>
      <div className="modal-content">
        <div className="ai-field">
          <label>项目名称</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="如：最后一班电梯" allowClear size="large" />
        </div>
        <div className="ai-field">
          <label>默认视觉风格</label>
          <select className="native-select" value={style} onChange={e => setStyle(e.target.value)}>
            {styleOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

// ============ Settings Modal (LLM + 媒体生图/生视频) ============
function SettingsModal({ open, onClose, onSaved }) {
  const [cfg, setCfg] = useS(null);
  const [testing, setTesting] = useS(null);
  const [testRes, setTestRes] = useS({});

  useE(() => { if (open) api.getConfig().then(setCfg).catch(() => {}); }, [open]);
  if (!open || !cfg) return null;

  const llmProviders = cfg.providers.filter(p => p.type === 'llm' || (!p.type && !p.id.includes('agnes')));
  const imageProviders = cfg.providers.filter(p => p.type === 'image' || (p.type === 'media' && p.id.includes('agnes')));
  const videoProviders = cfg.providers.filter(p => p.type === 'video' || (p.type === 'media' && p.id.includes('agnes')));
  const findPreset = (id) => cfg.presets?.find(p => p.id === id);

  const updateProvider = (id, field, val) => setCfg(c => ({ ...c, providers: c.providers.map(p => p.id === id ? { ...p, [field]: val } : p) }));
  const addProvider = (type) => setCfg(c => ({ ...c, providers: [...c.providers, { id: 'prov_' + Date.now().toString(36), name: '自定义' + (type === 'llm' ? '文本' : type === 'image' ? '生图' : '生视频'), baseUrl: '', apiKey: '', model: '', type }] }));
  const delProvider = (id) => setCfg(c => ({ ...c, providers: c.providers.filter(p => p.id !== id), activeProvider: c.activeProvider === id ? null : c.activeProvider, imageProvider: c.imageProvider === id ? null : c.imageProvider, videoProvider: c.videoProvider === id ? null : c.videoProvider }));
  const addPreset = (preset) => { if (cfg.providers.find(p => p.id === preset.id)) return; setCfg(c => ({ ...c, providers: [...c.providers, { ...preset, type: preset.type || 'llm', apiKey: '' }] })); };
  const save = async () => { await api.saveConfig(cfg); toast('配置已保存', 'ok'); onSaved?.(); onClose(); };
  const test = async (p) => {
    if (!p.baseUrl || !p.apiKey) { toast('请填写完整', 'error'); return; }
    setTesting(p.id); const r = { ...testRes };
    try { r[p.id] = await api.testConn(p.baseUrl, p.apiKey, p.model); } catch (e) { r[p.id] = { ok: false, error: e.message }; }
    setTestRes(r); setTesting(null);
  };

  // 模型下拉选择（预设模型列表 + 自定义输入）
  const modelSelect = (p) => {
    const preset = findPreset(p.id);
    const models = preset?.models || [];
    return (
      <div className="field-mini" style={{ flex: 1 }}>
        <label>模型</label>
        {models.length > 0 ? (
          <select value={p.model || ''} onChange={e => updateProvider(p.id, 'model', e.target.value)} style={{ width: '100%', padding: '4px 8px', border: '1px solid var(--ai-border)', borderRadius: 6, fontSize: 12 }}>
            <option value="">{preset?.defaultModel || '选择模型...'}</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        ) : (
          <Input size="small" value={p.model} onChange={e => updateProvider(p.id, 'model', e.target.value)} placeholder="模型名" />
        )}
      </div>
    );
  };

  // providerType: 'llm' | 'image' | 'video'
  const renderProvider = (p, providerType) => {
    const activeKey = providerType === 'llm' ? 'activeProvider' : providerType === 'image' ? 'imageProvider' : 'videoProvider';
    const isActive = cfg[activeKey] === p.id;
    const preset = findPreset(p.id);
    const desc = preset ? `${preset.name}` : '';
    return (
      <div key={p.id} className={`provider-row ${isActive ? 'active' : ''}`}>
        <div className="field-mini" style={{ flex: 1.5 }}><label>名称 {desc && <span style={{ color: 'var(--ai-primary)', fontSize: 10 }}>({desc})</span>}</label><Input size="small" value={p.name} onChange={e => updateProvider(p.id, 'name', e.target.value)} /></div>
        <div className="field-mini" style={{ flex: 2 }}><label>Base URL</label><Input size="small" value={p.baseUrl} onChange={e => updateProvider(p.id, 'baseUrl', e.target.value)} placeholder="https://..." /></div>
        <div className="field-mini" style={{ flex: 1.5 }}><label>API Key {p.apiKey && <span style={{ color: 'var(--ai-success)', fontSize: 10 }}>✓已填</span>}</label><Input size="small" type="password" value={p.apiKey} onChange={e => updateProvider(p.id, 'apiKey', e.target.value)} placeholder="sk-..." /></div>
        {modelSelect(p)}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 60 }}>
          <Button size="small" type={isActive ? 'primary' : 'default'} onClick={() => setCfg(c => ({ ...c, [activeKey]: p.id }))}>
            {isActive ? '✓ 主' : '设为主'}
          </Button>
          <Button size="small" loading={testing === p.id} onClick={() => test(p)}>测试</Button>
          <Button size="small" danger onClick={() => delProvider(p.id)}>删</Button>
        </div>
        {testRes[p.id] && <div style={{ flexBasis: '100%', fontSize: 11, color: testRes[p.id].ok ? 'var(--ai-success)' : 'var(--ai-error)' }}>{testRes[p.id].ok ? '✓ 连接成功: ' + (testRes[p.id].reply || '').slice(0, 50) : '✗ ' + (testRes[p.id].error || '失败')}</div>}
      </div>
    );
  };

  return (
    <Modal open={open} title="⚙️ 模型配置" typewriter={false} onClose={onClose} onOk={save} okText="保存" cancelText="取消" width={760}>
      <div className="settings-body modal-content">
        {/* LLM 文本模型 */}
        <div className="settings-section">
          <div className="card-title">📚 文本模型（剧情分析/角色/场景/分镜/脚本生成）</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {cfg.presets.filter(p => p.type === 'llm').map(p => (
              <Button key={p.id} size="small" onClick={() => addPreset(p)} disabled={!!cfg.providers.find(x => x.id === p.id)}>+ {p.name}</Button>
            ))}
          </div>
          {llmProviders.length === 0 && <div className="settings-hint">未配置文本模型，点击上方预设按钮添加（推荐 Agnes 2.0 Flash 或 DeepSeek）</div>}
          {llmProviders.map(p => renderProvider(p, 'llm'))}
          <Button size="small" onClick={() => addProvider('llm')} style={{ marginTop: 6 }}>+ 自定义文本模型</Button>
        </div>

        {/* 生图模型 */}
        <div className="settings-section" style={{ marginTop: 18 }}>
          <div className="card-title">🎨 生图模型（AI生图/图生图，默认使用 Agnes）</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {cfg.presets.filter(p => p.type === 'image').map(p => (
              <Button key={p.id} size="small" onClick={() => addPreset(p)} disabled={!!cfg.providers.find(x => x.id === p.id)}>+ {p.name}</Button>
            ))}
          </div>
          {imageProviders.length === 0 && <div className="settings-hint">未配置生图模型，默认回退 Agnes 生图（agnes-image-2.1-flash，免费）</div>}
          {imageProviders.map(p => renderProvider(p, 'image'))}
          <Button size="small" onClick={() => addProvider('image')} style={{ marginTop: 6 }}>+ 自定义生图模型</Button>
        </div>

        {/* 生视频模型 */}
        <div className="settings-section" style={{ marginTop: 18 }}>
          <div className="card-title">🎬 生视频模型（文生视频/图生视频/关键帧，默认使用 Agnes）</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {cfg.presets.filter(p => p.type === 'video').map(p => (
              <Button key={p.id} size="small" onClick={() => addPreset(p)} disabled={!!cfg.providers.find(x => x.id === p.id)}>+ {p.name}</Button>
            ))}
          </div>
          {videoProviders.length === 0 && <div className="settings-hint">未配置生视频模型，默认回退 Agnes 生视频（agnes-video-v2.0，免费）</div>}
          {videoProviders.map(p => renderProvider(p, 'video'))}
          <Button size="small" onClick={() => addProvider('video')} style={{ marginTop: 6 }}>+ 自定义生视频模型</Button>
        </div>

        {/* 模型说明 */}
        <div className="settings-section" style={{ marginTop: 18 }}>
          <div className="card-title">📖 模型说明</div>
          <div className="settings-help">
            <div><b>agnes-2.0-flash</b> — Agnes文本模型，512K上下文，支持图像理解/工具调用/流式输出</div>
            <div><b>agnes-image-2.1-flash</b> — Agnes生图模型，文生图/图生图，支持高信息密度复杂构图，免费</div>
            <div><b>agnes-video-v2.0</b> — Agnes视频模型，文生视频/图生视频/关键帧动画，异步任务，免费</div>
            <div><b>deepseek-chat</b> — DeepSeek文本模型，性价比高</div>
            <div style={{ marginTop: 6, color: 'var(--ai-text-muted)' }}>三种模型独立配置，互不影响。生图和生视频未配置时自动回退 Agnes。API Key 存储在服务端 data/config.json，前端脱敏显示。</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ============ 章节管理 ============
function ChapterManager({ project, onUpdate }) {
  const [addOpen, setAddOpen] = useS(false);
  const [newTitle, setNewTitle] = useS('');
  const [newContent, setNewContent] = useS('');
  const [newGroup, setNewGroup] = useS('');
  const [editId, setEditId] = useS(null);
  const [editTitle, setEditTitle] = useS('');
  const [editContent, setEditContent] = useS('');
  const [previewId, setPreviewId] = useS(null);
  const [collapsedGroups, setCollapsedGroups] = useS({});
  const [importOpen, setImportOpen] = useS(false);
  const [importText, setImportText] = useS('');

  const chapters = project?.chapters || [];
  const groups = {};
  chapters.forEach(ch => { const g = ch.group || '未分组'; (groups[g] = groups[g] || []).push(ch); });

  const addChapter = async () => {
    if (!newTitle.trim()) { toast('请输入标题', 'error'); return; }
    const ch = await api.addChapter(project.id, newTitle.trim(), newContent, newGroup.trim());
    onUpdate({ chapters: [...chapters, ch] });
    setAddOpen(false); setNewTitle(''); setNewContent(''); setNewGroup('');
    toast('章节已添加', 'ok');
  };
  const startEdit = (ch) => { setEditId(ch.id); setEditTitle(ch.title); setEditContent(ch.content || ''); setPreviewId(null); };
  const saveEdit = async () => {
    if (!editId) return;
    await api.updateChapter(project.id, editId, { title: editTitle, content: editContent });
    onUpdate({ chapters: chapters.map(c => c.id === editId ? { ...c, title: editTitle, content: editContent } : c) });
    setEditId(null); toast('已保存', 'ok');
  };
  const delChapter = async (id) => { if (!confirm('删除该章节？')) return; await api.deleteChapter(project.id, id); onUpdate({ chapters: chapters.filter(c => c.id !== id) }); toast('已删除', 'ok'); };
  const doImport = async () => {
    if (!importText.trim()) return;
    try { const r = await api.importChapters(project.id, importText); toast(`已导入 ${r.imported} 章`, 'ok'); const p = await api.getProject(project.id); onUpdate({ chapters: p.chapters }); setImportOpen(false); setImportText(''); }
    catch (e) { toast(e.message, 'error'); }
  };
  const togglePreview = (id) => setPreviewId(prev => prev === id ? null : id);

  const renderCh = (ch) => {
    if (editId === ch.id) {
      return (
        <div className="chapter-item editing">
          <div className="chapter-edit">
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--ai-border)', borderRadius: 6, fontSize: 12 }} />
            <Button size="small" type="primary" onClick={saveEdit}>保存</Button>
            <Button size="small" onClick={() => setEditId(null)}>取消</Button>
          </div>
          <div className="ai-field" style={{ marginTop: 6 }}>
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{ minHeight: 100, width: '100%', border: '1px solid var(--ai-border)', borderRadius: 6, padding: 8, fontSize: 12, fontFamily: 'inherit', background: 'var(--ai-bg-content)' }} />
            <Button size="small" type="primary" onClick={saveEdit} style={{ marginTop: 4 }}>保存内容</Button>
          </div>
        </div>
      );
    }
    return (
      <div className="chapter-item">
        <div className="chapter-row">
          <span className="ch-icon">{previewId === ch.id ? '▾' : '▸'}</span>
          <span className="ch-title" onClick={() => togglePreview(ch.id)}>{ch.title}</span>
          <span className="ch-meta">{(ch.content || '').length}字</span>
          <span className="ch-actions">
            {ch.analysis?.characters && <Tag size="small" color="app-green">已分析</Tag>}
            <span className="ch-btn" title="编辑" onClick={(e) => { e.stopPropagation(); startEdit(ch); }}>✏</span>
            <span className="ch-del" title="删除" onClick={(e) => { e.stopPropagation(); delChapter(ch.id); }}>✕</span>
          </span>
        </div>
        {previewId === ch.id && (
          <div className="ch-preview" style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.7, color: 'var(--ai-text-body)', background: 'var(--ai-bg)', padding: 10, borderRadius: 6, marginTop: 4, maxHeight: 200, overflow: 'auto', border: '1px solid var(--ai-border-light)' }}>
            {ch.content || '（无内容）'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">📚 章节管理 ({chapters.length})</span>
        <div className="card-actions">
          <Button size="small" onClick={() => setImportOpen(true)}>批量分章</Button>
          <Button size="small" type="primary" onClick={() => setAddOpen(true)}>+ 添加章节</Button>
        </div>
      </div>
      {chapters.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--ai-text-muted)', padding: 12, textAlign: 'center' }}>
          暂无章节。可粘贴全文"批量分章"自动按"第X章"切分，或手动"+ 添加章节"。<br/>
          <span style={{ fontSize: 11 }}>长篇建议分章管理：每章单独分析，知识库自动跨章积累保持人物/场景一致。</span>
        </div>
      ) : (
        <div className="chapter-tree">
          {Object.entries(groups).map(([gname, chs]) => (
            <div key={gname} className="chapter-group">
              <div className="group-head" onClick={() => setCollapsedGroups(s => ({ ...s, [gname]: !s[gname] }))}>
                <span className="group-arrow">{collapsedGroups[gname] ? '▶' : '▼'}</span>
                <span className="group-name">{gname}</span>
                <span className="group-count">({chs.length})</span>
              </div>
              {!collapsedGroups[gname] && chs.map(renderCh)}
            </div>
          ))}
        </div>
      )}

      <Modal open={addOpen} title="添加章节" typewriter={false} onClose={() => setAddOpen(false)} onOk={addChapter} okText="添加" cancelText="取消">
        <div className="modal-content">
          <div className="ai-field"><label>卷/分组（可选）</label><Input value={newGroup} onChange={e => setNewGroup(e.target.value)} placeholder="如：第一卷" allowClear /></div>
          <div className="ai-field"><label>章节标题</label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="如：第一章 初遇" allowClear /></div>
          <div className="ai-field"><label>章节内容</label><textarea value={newContent} onChange={e => setNewContent(e.target.value)} style={{ minHeight: 120 }} /></div>
        </div>
      </Modal>
      <Modal open={importOpen} title="批量分章导入" typewriter={false} onClose={() => setImportOpen(false)} onOk={doImport} okText="导入" cancelText="取消" width={620}>
        <div className="modal-content">
          <p style={{ fontSize: 12, color: 'var(--ai-text-muted)', marginBottom: 8 }}>粘贴全文，系统按"第X章/Chapter N"自动切分为多个章节。</p>
          <textarea value={importText} onChange={e => setImportText(e.target.value)} style={{ width: '100%', minHeight: 220 }} />
        </div>
      </Modal>
    </div>
  );
}

// ============ Input Panel ============
function InputPanel({ project, onUpdate, onAnalyzeAll, styles, generating, hasChapters, hasProvider, analysisSource, setAnalysisSource, analysisContent, collapsed, onToggleCollapse }) {
  const [content, setContent] = useS(project?.content || '');
  const [selectedModules, setSelectedModules] = useS(MODULES.map(m => m.id));
  const [status, setStatus] = useS('');
  const [preprocessing, setPreprocessing] = useS(false);

  useE(() => { setContent(project?.content || ''); setStatus(''); }, [project?.id]);

  const onContentChange = (v) => { setContent(v); onUpdate({ content: v }); };
  const toggleModule = (id) => setSelectedModules(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const doPreprocess = async () => {
    const text = analysisContent || content;
    if (!text.trim()) {
      if (hasChapters && analysisSource?.mode === 'chapter' && !analysisSource?.chId) { toast('请先选择一个章节', 'error'); return; }
      toast('请先输入内容或添加章节', 'error'); return;
    }
    setPreprocessing(true); setStatus('预处理中...');
    try {
      await api.preprocess(text, project?.id, analysisSource, (d) => {
        if (d.status === 'split_done') setStatus(`已分 ${d.total} 段`);
        if (d.status === 'summarizing') setStatus(`分析第 ${d.progress}/${d.total} 段...`);
        if (d.status === 'synthesizing') setStatus('综合分析中...');
        if (d.status === 'done') { onUpdate({ preprocess: { segments: d.segments || [], global: d.global || {}, sourceMode: d.sourceMode, chapterId: d.chapterId, contentHash: d.contentHash, createdAt: d.createdAt } }); setStatus('预处理完成'); toast('预处理完成，已为后续分析提供全局上下文', 'ok'); }
      });
    } catch (e) { setStatus('失败: ' + e.message); toast('预处理失败', 'error'); }
    setPreprocessing(false);
  };

  const chapters = project?.chapters || [];
  const retryRun = [...(project?.analysisRuns || [])].reverse().find(run => run.status === 'failed' && Object.values(run.modules || {}).some(module => module.status === 'failed'));
  const retryModules = retryRun ? Object.entries(retryRun.modules).filter(([, module]) => module.status === 'failed').map(([type]) => type) : [];

  if (collapsed) {
    return (
      <div className="input-panel collapsed">
        <div className="input-collapsed-bar" onClick={onToggleCollapse} title="展开输入面板">
          <span className="input-collapsed-icon">›</span>
          <span className="input-collapsed-label">输入面板</span>
          <div className="input-collapsed-mini">
            <div title="源文本" style={{ fontSize: 16 }}>📝</div>
            <div title="章节管理" style={{ fontSize: 16 }}>📖</div>
            <div title="视觉风格" style={{ fontSize: 16 }}>🎨</div>
            <div title="分析模块" style={{ fontSize: 16 }}>📋</div>
            <div title="操作" style={{ fontSize: 16 }}>⚡</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="input-panel">
      <div className="input-panel-head">
        <span className="input-panel-title">⚙️ 输入配置</span>
        <button className="input-collapse-btn" onClick={onToggleCollapse} title="收起面板">‹</button>
      </div>
      <div className="card">
        <div className="card-head"><span className="card-title">📝 源文本</span>
          <Button size="small" onClick={() => document.getElementById('txtUpload')?.click()}>导入文件</Button>
          <input type="file" accept=".txt,.md" hidden id="txtUpload" onChange={async (e) => {
            const f = e.target.files[0]; if (!f) return;
            try { const text = await f.text(); onContentChange(text); toast(`已导入 ${f.name} (${text.length}字)`, 'ok'); } catch { toast('导入失败', 'error'); }
            e.target.value = '';
          }} />
        </div>
        <textarea id="sourceText" value={content} onChange={e => onContentChange(e.target.value)} placeholder="粘贴小说/故事/剧本全文，或使用下方章节管理分章..." spellCheck={false} />
        <div className="char-count">{content.length} 字</div>
      </div>

      <ChapterManager project={project} onUpdate={onUpdate} />

      <div className="card">
        <div className="card-head"><span className="card-title">🎨 视觉风格</span></div>
        <div className="style-grid">
          {styles.map(s => (
            <div key={s.key} className={`style-chip ${project?.style === s.key ? 'active' : ''}`} onClick={() => onUpdate({ style: s.key })} title={s.desc}>{s.label}</div>
          ))}
        </div>
      </div>

      {hasChapters && (
        <div className="card">
          <div className="card-head"><span className="card-title">🎯 分析范围</span></div>
          <select value={analysisSource.mode} onChange={e => setAnalysisSource(s => ({ ...s, mode: e.target.value, chId: '' }))} style={{ width: '100%', padding: '6px 10px', border: '2px solid var(--ai-border)', borderRadius: 8, background: 'var(--ai-bg-content)', fontSize: 13, marginBottom: 6 }}>
            <option value="chapters">全部章节（{chapters.length}章拼接）</option>
            <option value="chapter">单章分析</option>
            <option value="content">源文本（不使用章节）</option>
          </select>
          {analysisSource.mode === 'chapter' && (
            <select value={analysisSource.chId} onChange={e => setAnalysisSource(s => ({ ...s, chId: e.target.value }))} style={{ width: '100%', padding: '6px 10px', border: '2px solid var(--ai-border)', borderRadius: 8, background: 'var(--ai-bg-content)', fontSize: 13 }}>
              <option value="">请选择章节...</option>
              {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          )}
          <p style={{ fontSize: 11, color: 'var(--ai-primary)', marginTop: 6 }}>💡 分析时知识库自动注入上下文，确保跨章人物/场景一致。</p>
        </div>
      )}

      <div className="card">
        <div className="card-head"><span className="card-title">📋 分析模块</span><span style={{ fontSize: 11, color: 'var(--ai-text-muted)' }}>已选 {selectedModules.length}</span></div>
        <div className="module-grid">
          {MODULES.map(m => (
            <div key={m.id} className={`module-chip ${selectedModules.includes(m.id) ? 'active' : ''}`} onClick={() => toggleModule(m.id)}>
              <span className="icon">{m.icon}</span>{m.name}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><span className="card-title">⚡ 操作</span></div>
        <div className="gen-actions"><Button block loading={preprocessing} onClick={doPreprocess}>🔍 预处理</Button></div>
        <div className="gen-actions"><Button block type="primary" loading={generating} disabled={!hasProvider} onClick={() => { if (!hasProvider) { toast('请先在设置中配置API Key', 'error'); return; } onAnalyzeAll(selectedModules); }}>🚀 一键全部分析</Button></div>
        {retryModules.length > 0 && <div className="analysis-retry"><span>可重试：{retryModules.map(type => MODULES.find(module => module.id === type)?.name || type).join('、')}</span><Button size="small" loading={generating} onClick={() => onAnalyzeAll(retryModules, retryRun.id)}>重试失败模块</Button></div>}
        <div className="status-bar info">{status}</div>
        {project?.preprocess?.global && (
          <div className="preprocess-summary">
            <div className="card-title" style={{ fontSize: 13 }}>📋 预处理全局分析</div>
            {project.preprocess.global.title && <div className="pp-field"><b>标题:</b> {project.preprocess.global.title}</div>}
            {project.preprocess.global.genre && <div className="pp-field"><b>类型:</b> {project.preprocess.global.genre}</div>}
            {project.preprocess.global.conflicts?.length > 0 && <div className="pp-field"><b>冲突:</b> {project.preprocess.global.conflicts.join('; ')}</div>}
            {project.preprocess.global.themes?.length > 0 && <div className="pp-field"><b>主题:</b> {project.preprocess.global.themes.join('; ')}</div>}
            {project.preprocess.global.characters?.length > 0 && (
              <div className="pp-field"><b>角色:</b> {project.preprocess.global.characters.map(c => `${c.name}(${c.role||''})`).join(', ')}</div>
            )}
            {project.preprocess.global.timeline?.length > 0 && (
              <div className="pp-field"><b>时间线:</b> {project.preprocess.global.timeline.map(t => t.event).join(' → ')}</div>
            )}
            <div className="pp-field" style={{ fontSize: 11, color: 'var(--ai-text-muted)' }}>已分段 {project.preprocess.segments?.length || 0} 段，后续分析将参考此全局上下文</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Result Panel ============
function ResultPanel({ project, onUpdate, styles, onAnalyzeAll, analysisSource, analysisScope, streaming, streamingType, setStreaming, setStreamingType, projectRef, hasProvider, flushProject, createServerJob, updateServerJob, recordCompletedAsset }) {
  const [tab, setTab] = useS('characters');
  const [generating, setGenerating] = useS(false);
  const [progress, setProgress] = useS('');
  const [progressPct, setProgressPct] = useS(0);
  const abortRef = useR(null);
  // 视频轮询状态提升到 ResultPanel，切换 tab 不会中断
  const [vidTask, setVidTask] = useS(null);
  const [vidPolling, setVidPolling] = useS(false);
  const pollRef = useR(null);
  useE(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  // Ctrl+Enter 触发当前 Tab 生成
  useE(() => {
    const handler = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); const btn = document.querySelector('.result-tab.active'); if (btn) { const genBtn = document.querySelector('.result-content .gen-btn-trigger'); if (genBtn) genBtn.click(); else { const tab = btn.textContent.trim(); const genBtns = document.querySelectorAll('button[type="primary"]'); genBtns.forEach(b => { if (b.textContent.includes('生成') && !b.disabled) b.click(); }); } } } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [project?.id]);

  const results = project?.results || {};
  const characters = results.characters?.characters || [];
  const scenes = results.scenes?.scenes || [];
  const shots = results.storyboard?.shots || [];

  const analyzeOne = async (type) => {
    if (!project?.content?.trim() && !project?.chapters?.length) { toast('请先输入内容或章节', 'error'); return; }
    const content = analysisSource;
    const targetId = project.id;
    setGenerating(true); setStreaming(''); setStreamingType(''); setProgress(`正在生成${MODULES.find(m => m.id === type)?.name}，请稍候...`); setProgressPct(30);
    const ac = new AbortController(); abortRef.current = ac;
    try {
      await api.analyze({ type, content, visualStyle: project.style, projectId: targetId, characters, scenes, sourceMode: analysisScope?.mode, chapterId: analysisScope?.mode === 'chapter' ? analysisScope.chId : undefined }, (d) => {
        if (d.status === 'start') setProgressPct(40);
        if (d.status === 'streaming') { setStreamingType(d.type); setStreaming(prev => prev + d.content); setProgressPct(prev => prev < 50 ? 50 : prev); }
        if (d.status === 'done') {
          if (projectRef?.current?.id !== targetId) return; // 用户已切换项目
          onUpdate(prev => prev.id === targetId ? (() => {
            const prevResults = prev.results || {};
            const prevType = prevResults[type];
             let newResult = d.result;
             if (prevType && typeof prevType === 'object' && typeof newResult === 'object' && !Array.isArray(newResult)) {
               newResult = { ...d.result, derivedFromRevision: prev.sourceRevision || 1, stale: false };
               if (prevType.panelImages && newResult.pages) newResult.panelImages = prevType.panelImages;
             }
             return normalizeProject({ ...prev, results: { ...prevResults, [type]: newResult } });
          })() : prev);
          setStreaming(''); setStreamingType(''); setProgress(`${MODULES.find(m => m.id === type)?.name} 完成`); setProgressPct(100); toast('生成完成', 'ok'); setTimeout(() => { setProgress(''); setProgressPct(0); }, 1500);
        }
        if (d.status === 'error') { setStreaming(''); setStreamingType(''); setProgress('错误: ' + d.error); toast('生成失败', 'error'); }
      }, ac.signal);
    } catch (e) { if (e.name !== 'AbortError') { setStreaming(''); setStreamingType(''); setProgress('失败: ' + e.message); toast('生成失败', 'error'); } }
    setGenerating(false);
  };

  // 切换项目时 abort 进行中的分析
  useE(() => () => { if (abortRef.current) abortRef.current.abort(); }, [project?.id]);


  const tabs = [
    { id: 'characters', name: '🎭 角色', count: characters.length },
    { id: 'scenes', name: '🏞️ 场景', count: scenes.length },
    { id: 'storyboard', name: '🎬 分镜', count: shots.length },
    ...MODULES.filter(m => m.type === 'md').map(m => ({ id: m.id, name: `${m.icon} ${m.name}` })),
    { id: 'manga', name: '📖 漫画', count: results.manga?.pages?.length || 0 },
    { id: 'knowledge', name: '📚 知识库' },
    { id: 'media', name: '🖼️ 媒体' },
    { id: 'consistency', name: '🔍 一致性' },
    { id: 'snapshots', name: '📸 快照' },
  ];

  return (
    <div className="result-panel">
      <div className="result-tabs">
        {tabs.map(t => (
          <div key={t.id} className={`result-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.name}{t.count !== undefined && <span className="count">{t.count}</span>}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {tab !== 'media' && tab !== 'knowledge' && tab !== 'consistency' && tab !== 'snapshots' && (
            <Button size="small" type="primary" loading={generating} disabled={!hasProvider} onClick={() => { if (!hasProvider) { toast('请先在设置中配置API Key', 'error'); return; } analyzeOne(tab); }}>{generating ? '生成中' : '生成'}</Button>
          )}
          <a href={api.exportMd(project?.id)} download><Button size="small">导出MD</Button></a>
          <a href={api.exportJson(project?.id)} download><Button size="small">导出JSON</Button></a>
          <a href={api.exportSrt(project?.id)} download><Button size="small">导出SRT</Button></a>
          <a href={api.exportManifest(project?.id)} download><Button size="small">Manifest</Button></a>
          <a href={api.exportDeliveryZip(project?.id)} download><Button size="small">交付ZIP</Button></a>
          {[...new Set(shots.map(shot => shot.episode).filter(Boolean))].map(episode => <a key={episode} href={api.exportEpisodeSrt(project?.id, episode)} download><Button size="small">第{episode}集SRT</Button></a>)}
          <Button size="small" onClick={() => { const mod = prompt('导出单个模块（输入: characters/scenes/storyboard/manga/script/assets/structure/summary）'); if (mod && results[mod]) { const blob = new Blob([JSON.stringify(results[mod], null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${project?.name}_${mod}.json`; a.click(); URL.revokeObjectURL(a.href); } }}>导出模块</Button>
        </div>
      </div>
      <div className="result-content">
        {results[tab]?.stale && <div className="stale-notice">上游内容已变化，此结果与关联资产可能失效，请重新生成后确认。</div>}
        {generating && (
          <div style={{ marginBottom: 12, padding: 10, background: 'var(--ai-primary-bg)', borderRadius: 8, fontSize: 13 }}>
            {progress}
            {progressPct > 0 && <div className="progress-line"><div className="fill" style={{ width: progressPct + '%' }} /></div>}
          </div>
        )}
        {tab === 'characters' && <CharactersView characters={characters} onUpdate={(chars) => onUpdate(prev => ({ results: { ...prev.results, characters: { ...prev.results.characters, characters: chars, charImages: prev.results?.characters?.charImages || {} } } }))} project={project} projectRef={projectRef} recordCompletedAsset={recordCompletedAsset} />}
        {tab === 'scenes' && <ScenesView scenes={scenes} onUpdate={(sc) => onUpdate(prev => ({ results: { ...prev.results, scenes: { ...prev.results.scenes, scenes: sc, sceneImages: prev.results?.scenes?.sceneImages || {} } } }))} project={project} projectRef={projectRef} recordCompletedAsset={recordCompletedAsset} />}
        {tab === 'storyboard' && <ShotView shots={shots} characters={characters} scenes={scenes} onUpdate={(patchOrFn) => onUpdate(prev => {
          const prevShots = prev.results?.storyboard?.shots || [];
          const newShots = typeof patchOrFn === 'function' ? patchOrFn(prevShots) : patchOrFn;
          return { results: { ...(prev.results || {}), storyboard: { ...(prev.results?.storyboard || {}), shots: newShots } } };
        })} project={project} projectRef={projectRef} createServerJob={createServerJob} updateServerJob={updateServerJob} recordCompletedAsset={recordCompletedAsset} />}
        {MODULES.filter(m => m.type === 'md').map(m => tab === m.id && <MdView key={m.id} content={streamingType === m.id ? streaming : results[m.id]} emptyTip={`点击右上方"生成"开始`} />)}
        {tab === 'manga' && <MangaView manga={results.manga} project={project} onUpdate={onUpdate} projectRef={projectRef} recordCompletedAsset={recordCompletedAsset} />}
        {tab === 'knowledge' && <KnowledgeView project={project} onUpdate={onUpdate} />}
        {tab === 'media' && <MediaGen styles={styles} project={project} characters={characters} scenes={scenes} onUpdate={onUpdate} projectRef={projectRef} vidTask={vidTask} setVidTask={setVidTask} vidPolling={vidPolling} setVidPolling={setVidPolling} pollRef={pollRef} createServerJob={createServerJob} updateServerJob={updateServerJob} recordCompletedAsset={recordCompletedAsset} />}
        {tab === 'consistency' && <ConsistencyView project={project} onUpdate={onUpdate} />}
        {tab === 'snapshots' && <SnapshotView project={project} flushProject={flushProject} />}
      </div>
    </div>
  );
}

// ============ Characters View (4视图横向排列单图 + 批量生图) ============
function CharactersView({ characters, onUpdate, project, projectRef, recordCompletedAsset }) {
  const [genIdx, setGenIdx] = useS(null);
  if (!characters.length) return <Empty tip="生成角色设定后将显示，每角色含一张1x4横向排列设定图Prompt" />;
  const baseFields = [['role','叙事功能'],['gender','性别'],['age','年龄'],['appearance','外貌'],['personality','性格'],['costume','服装道具'],['voiceStyle','语言风格'],['relationships','人物关系'],['arc','角色弧光'],['castingReference','选角参考']];
  const updateField = (i, k, v) => { const c = [...characters]; c[i] = { ...c[i], [k]: v }; onUpdate(c); };
  const charImages = project?.results?.characters?.charImages || {};

  const genOne = async (i) => {
    const c = characters[i];
    const targetProjectId = project.id; const entityId = c.id;
    if (!c.imagePromptEn) { toast('该角色缺少英文Prompt', 'error'); return; }
    setGenIdx(i);
    try {
      const r = await api.genImage(c.imagePromptEn, '', '1024x768', project?.style);
      if (r.ok) { await recordCompletedAsset(targetProjectId, 'character', entityId, 'image', r.url, { prompt: c.imagePromptEn }); toast(`${c.name} 设定图生成完成`, 'ok'); }
      else { toast(r.error || '生成失败', 'error'); }
    } catch (e) { toast(e.message, 'error'); }
    setGenIdx(null);
  };

  const genAll = async () => {
    for (let i = 0; i < characters.length; i++) {
      const c = characters[i];
      const cur = projectRef?.current?.results?.characters?.charImages || charImages;
      if (cur[c.id] || c.imageUrl) continue;
      await genOne(i);
    }
  };

  const pending = characters.filter(c => !charImages[c.id] && !c.imageUrl && c.imagePromptEn).length;

  return (
    <div>
      <div className="card" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>🎭 角色设定图</span>
        {pending > 0 && <Button size="small" type="primary" loading={genIdx !== null} onClick={genAll}>一键生成全部设定图 ({pending})</Button>}
        <span style={{ fontSize: 11, color: 'var(--ai-text-muted)' }}>已生成 {Object.keys(charImages).length}/{characters.length}</span>
      </div>
      <div className="grid-cards">
        {characters.map((c, i) => (
          <div key={c.id} className="item-card">
            <div className="item-head">
              <input className="item-name" value={c.name} onChange={e => updateField(i, 'name', e.target.value)} />
              <Button size="small" danger onClick={() => { if (confirm('确认删除该角色？')) onUpdate(characters.filter((_, x) => x !== i)); }}>删</Button>
            </div>
            {(c.imageUrl || charImages[c.id] || charImages[c.name]) && <img src={c.imageUrl || charImages[c.id] || charImages[c.name]} alt={c.name} style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <Button size="small" type="primary" loading={genIdx === i} onClick={() => genOne(i)} disabled={!c.imagePromptEn}>{c.imageUrl || charImages[c.id] || charImages[c.name] ? '重新生图' : '生图'}</Button>
              {(c.imageUrl || charImages[c.id] || charImages[c.name]) && <a href={c.imageUrl || charImages[c.id] || charImages[c.name]} download target="_blank" rel="noreferrer"><Button size="small">下载</Button></a>}
            </div>
            {baseFields.map(([k, label]) => (
              <div key={k} className="field"><label>{label}</label><input value={c[k] || ''} onChange={e => updateField(i, k, e.target.value)} /></div>
            ))}
            <div className="view-prompts" style={{ borderTop: '1px dashed var(--ai-border)', paddingTop: 8, marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-text)', marginBottom: 6 }}>📐 角色设定图 Prompt（单图1x4横向排列：面部特写/正面/侧面/背面全身）</div>
              <div className="field"><label>设定图 Prompt（中文）</label><div style={{ display: 'flex', gap: 4 }}><textarea className="prompt" value={c.imagePromptZh || ''} onChange={e => updateField(i, 'imagePromptZh', e.target.value)} style={{ minHeight: 60, flex: 1 }} />{c.imagePromptZh && <Button size="small" onClick={() => { navigator.clipboard.writeText(c.imagePromptZh); toast('已复制', 'ok'); }}>复制</Button>}</div></div>
              <div className="field"><label>设定图 Prompt（English）</label><div style={{ display: 'flex', gap: 4 }}><textarea className="prompt" value={c.imagePromptEn || ''} onChange={e => updateField(i, 'imagePromptEn', e.target.value)} style={{ minHeight: 60, flex: 1 }} />{c.imagePromptEn && <Button size="small" onClick={() => { navigator.clipboard.writeText(c.imagePromptEn); toast('已复制', 'ok'); }}>复制</Button>}</div></div>
            </div>
          </div>
        ))}
        <Button onClick={() => onUpdate([...characters, { id: stableId('char'), name: '新角色' }])}>+ 新增角色</Button>
      </div>
    </div>
  );
}

// ============ Scenes View (含批量生图) ============
function ScenesView({ scenes, onUpdate, project, projectRef, recordCompletedAsset }) {
  const [genIdx, setGenIdx] = useS(null);
  if (!scenes.length) return <Empty tip="生成场景设定后将显示在此" />;
  const fields = [['environment','环境'],['mood','氛围'],['lighting','光照'],['timeOfDay','时间段'],['narrativeFunction','叙事功能'],['keyProps','关键道具'],['soundDesign','声音设计'],['colorPalette','色调建议'],['compositionHint','构图建议'],['imagePromptZh','场景图Prompt(中)'],['imagePromptEn','场景图Prompt(英)']];
  const updateField = (i, k, v) => { const s = [...scenes]; s[i] = { ...s[i], [k]: v }; onUpdate(s); };
  const sceneImages = project?.results?.scenes?.sceneImages || {};

  const genOne = async (i) => {
    const s = scenes[i];
    const targetProjectId = project.id; const entityId = s.id;
    if (!s.imagePromptEn) { toast('该场景缺少英文Prompt', 'error'); return; }
    setGenIdx(i);
    try {
      const r = await api.genImage(s.imagePromptEn, '', '1024x768', project?.style);
      if (r.ok) { await recordCompletedAsset(targetProjectId, 'scene', entityId, 'image', r.url, { prompt: s.imagePromptEn }); toast(`${s.name} 场景图生成完成`, 'ok'); }
      else { toast(r.error || '生成失败', 'error'); }
    } catch (e) { toast(e.message, 'error'); }
    setGenIdx(null);
  };

  const genAll = async () => {
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      const cur = projectRef?.current?.results?.scenes?.sceneImages || sceneImages;
      if (cur[s.id] || s.imageUrl) continue;
      await genOne(i);
    }
  };

  const pending = scenes.filter(s => !sceneImages[s.id] && !s.imageUrl && s.imagePromptEn).length;

  return (
    <div>
      <div className="card" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>🏞️ 场景设定图</span>
        {pending > 0 && <Button size="small" type="primary" loading={genIdx !== null} onClick={genAll}>一键生成全部场景图 ({pending})</Button>}
        <span style={{ fontSize: 11, color: 'var(--ai-text-muted)' }}>已生成 {Object.keys(sceneImages).length}/{scenes.length}</span>
      </div>
      <div className="grid-cards">
        {scenes.map((s, i) => (
          <div key={s.id} className="item-card">
            <div className="item-head">
              <input className="item-name" value={s.name} onChange={e => updateField(i, 'name', e.target.value)} />
              <Button size="small" danger onClick={() => { if (confirm('确认删除该场景？')) onUpdate(scenes.filter((_, x) => x !== i)); }}>删</Button>
            </div>
            {(s.imageUrl || sceneImages[s.id] || sceneImages[s.name]) && <img src={s.imageUrl || sceneImages[s.id] || sceneImages[s.name]} alt={s.name} style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <Button size="small" type="primary" loading={genIdx === i} onClick={() => genOne(i)} disabled={!s.imagePromptEn}>{s.imageUrl || sceneImages[s.id] || sceneImages[s.name] ? '重新生图' : '生图'}</Button>
              {(s.imageUrl || sceneImages[s.id] || sceneImages[s.name]) && <a href={s.imageUrl || sceneImages[s.id] || sceneImages[s.name]} download target="_blank" rel="noreferrer"><Button size="small">下载</Button></a>}
            </div>
            {fields.map(([k, label]) => {
              if (k.startsWith('imagePrompt')) {
                return <div key={k} className="field"><label>{label}</label><div style={{ display: 'flex', gap: 4 }}>{s[k] && <Button size="small" onClick={() => { navigator.clipboard.writeText(s[k]); toast('已复制', 'ok'); }}>复制</Button>}<textarea className="prompt" value={s[k] || ''} onChange={e => updateField(i, k, e.target.value)} style={{ flex: 1 }} /></div></div>;
              }
              return <div key={k} className="field"><label>{label}</label><input value={s[k] || ''} onChange={e => updateField(i, k, e.target.value)} /></div>;
            })}
          </div>
        ))}
        <Button onClick={() => onUpdate([...scenes, { id: stableId('scene'), name: '新场景' }])}>+ 新增场景</Button>
      </div>
    </div>
  );
}

// ============ Shot View (分镜 + 关键帧图 + 视频 + 覆盖率 + 备注) ============
function ShotView({ shots, characters, scenes, onUpdate, project, projectRef, createServerJob, updateServerJob, recordCompletedAsset }) {
  const [view, setView] = useS('table');
  const [filterEp, setFilterEp] = useS('');
  const [filterScene, setFilterScene] = useS('');
  const [filterPending, setFilterPending] = useS(false);
  const [genKey, setGenKey] = useS(null);
  const [useCharRef, setUseCharRef] = useS(true);
  if (!shots.length) return <Empty tip="先生成角色与场景设定，再点击右上方生成按钮" />;
  const eps = [...new Set(shots.map(s => s.episode))];
  let filtered = shots;
  if (filterEp) filtered = filtered.filter(s => s.episode == filterEp);
  if (filterScene) filtered = filtered.filter(s => s.sceneName === filterScene);
  if (filterPending) filtered = filtered.filter(s => !s.videoUrl);
  const charName = (names) => (names || []).join('、');

  // 函数式更新单个分镜字段，避免闭包过期（onUpdate 接收 (prevShots) => newShots）
  const updateShot = (realIdx, patch) => onUpdate(prevShots => { const arr = [...(prevShots || shots)]; arr[realIdx] = { ...arr[realIdx], ...patch }; return arr; });
  const update = (idx, k, v) => { const i = shots.indexOf(filtered[idx]); updateShot(i, { [k]: v }); };
  const moveShot = (idx, dir) => { const i = shots.indexOf(filtered[idx]); const j = i + dir; if (j < 0 || j >= shots.length) return; onUpdate(prevShots => { const arr = [...(prevShots || shots)]; [arr[i], arr[j]] = [arr[j], arr[i]]; return arr; }); };

  // 角色设定图参考
  const charImages = project?.results?.characters?.charImages || {};
  const sceneImages = project?.results?.scenes?.sceneImages || {};
  const charMap = {}; characters.forEach(c => { charMap[c.name] = c; });
  const sceneMap = {}; scenes.forEach(s => { sceneMap[s.name] = s; });

  // 构建一致性参考图列表
  const getRefImages = (s, previousShot) => {
    const refs = [];
    if (previousShot?.keyframeUrl) refs.push(previousShot.keyframeUrl);
    if (useCharRef && s.characterNames?.length) s.characterNames.forEach(n => { if (charImages[n]) refs.push(charImages[n]); });
    if (useCharRef && s.sceneName && sceneImages[s.sceneName]) refs.push(sceneImages[s.sceneName]);
    return refs.length ? refs : undefined;
  };

  // 增强关键帧 prompt：注入角色外貌+服装 + 场景环境细节
  const buildKeyframePrompt = (s, previousShot) => {
    let p = s.promptEn || '';
    const parts = [];
    if (s.characterNames?.length) {
      s.characterNames.forEach(n => {
        const c = charMap[n];
        if (c) parts.push(`Character "${n}": ${c.appearance || ''}, wearing ${c.costume || ''}`);
      });
    }
    if (s.sceneName) {
      const sc = sceneMap[s.sceneName];
      if (sc) parts.push(`Scene "${s.sceneName}": ${sc.environment || ''}, ${sc.lighting || ''} lighting, ${sc.mood || ''} atmosphere`);
    }
    if (previousShot) {
      const continuity = [
        previousShot.continuityNote || previousShot.notes,
        previousShot.visual && `Previous visual: ${previousShot.visual}`,
        previousShot.action && `Previous action: ${previousShot.action}`,
        (previousShot.characterState || previousShot.charactersState) && `Character state: ${previousShot.characterState || previousShot.charactersState}`,
        previousShot.sceneState && `Scene state: ${previousShot.sceneState}`,
      ].filter(Boolean);
      if (continuity.length) parts.push(`Continue from shot ${previousShot.id}: ${continuity.join('; ')}`);
    }
    if (parts.length) p = parts.join('. ') + '. ' + p;
    return p;
  };

  // 覆盖率统计
  const withKeyframe = shots.filter(s => s.keyframeUrl).length;
  const withVideo = shots.filter(s => s.videoUrl).length;
  const total = shots.length;
  const coverage = { total, withKeyframe, withVideo, pending: total - withVideo };

  // 获取最新分镜数据（从 projectRef 读，避免闭包过期）
  const getShot = (realIdx) => projectRef?.current?.results?.storyboard?.shots?.find(item => item.id === shots[realIdx]?.id) || shots[realIdx];

  const findPreviousShot = (shotId) => { const currentShots = projectRef?.current?.results?.storyboard?.shots || shots; const index = currentShots.findIndex(item => item.id === shotId); return index > 0 ? currentShots[index - 1] : null; };

  // 生关键帧（以稳定 shot id 为任务目标）
  const genKeyframe = async (shotId) => {
    const currentShots = projectRef?.current?.results?.storyboard?.shots || shots;
    const s = currentShots.find(item => item.id === shotId);
    if (!s || !s.promptEn) { toast('该分镜缺少英文Prompt', 'error'); return false; }
    const targetProjectId = project.id; const entityId = s.id;
    const key = `kf-${entityId}`;
    setGenKey(key);
    try {
      const previousShot = findPreviousShot(shotId);
      const refs = getRefImages(s, previousShot);
      const enhancedPrompt = buildKeyframePrompt(s, previousShot);
      const r = await api.genImage(enhancedPrompt, '', '1024x768', project?.style, refs);
      if (r.ok) { await recordCompletedAsset(targetProjectId, 'shot', entityId, 'keyframe', r.url, { prompt: enhancedPrompt }); toast(`分镜${s.episode}-${s.sceneNo}-${s.shotNo} 关键帧生成完成`, 'ok'); setGenKey(null); return r.url; }
      else { toast(r.error || '生成失败', 'error'); setGenKey(null); return false; }
    } catch (e) { toast(e.message, 'error'); setGenKey(null); return false; }
  };

  // 生视频（图生视频，按真实索引）
  const genShotVideo = async (realIdx, keyframeUrl) => {
    const s = getShot(realIdx);
    if (!s) return false;
    const imageUrl = keyframeUrl || s.keyframeUrl;
    if (!imageUrl) { toast(`分镜${s.episode}-${s.sceneNo}-${s.shotNo} 请先生成关键帧`, 'error'); return false; }
    const targetProjectId = project.id; const entityId = s.id;
    const key = `vd-${entityId}`;
    setGenKey(key);
    try {
      const enhancedPrompt = buildKeyframePrompt(s);
      const params = { prompt: enhancedPrompt, visualStyle: project?.style, image: imageUrl, num_frames: 121, frame_rate: 24, height: 768, width: 1152 };
      const r = await api.genVideo(params);
      if (r.ok && r.video_id) {
        const job = await createServerJob(targetProjectId, { type: 'video', entityType: 'shot', entityId, providerTaskId: r.video_id, status: r.status || 'processing', params });
        return new Promise((resolve) => {
          let attempts = 0; const delay = 10000;
          const poll = async () => {
            attempts++;
            try {
              const vr = await api.getVideo(r.video_id);
              if (vr.rate_limited) { if (attempts < 60) { setTimeout(poll, Math.min(delay * 1.5, 30000)); } else { toast('视频生成超时(限流)', 'error'); setGenKey(null); resolve(false); } return; }
              if (vr.status === 'completed') { await updateServerJob(targetProjectId, job.id, { status: 'completed', asset: { kind: 'video', url: vr.url, prompt: enhancedPrompt, parentAssetId: getShot(realIdx)?.keyframeAssetId } }); toast(`分镜${s.episode}-${s.sceneNo}-${s.shotNo} 视频生成完成`, 'ok'); setGenKey(null); resolve(true); return; }
              if (vr.status === 'failed') { await updateServerJob(targetProjectId, job.id, { status: 'failed', error: vr.error || '视频生成失败' }); toast('视频生成失败', 'error'); setGenKey(null); resolve(false); return; }
              if (vr.status && vr.status !== job.status) { await updateServerJob(targetProjectId, job.id, { status: vr.status, progress: vr.progress }); job.status = vr.status; }
              if (attempts < 60) { setTimeout(poll, delay); } else { toast('视频生成超时', 'error'); setGenKey(null); resolve(false); }
            } catch (e) { toast(e.message, 'error'); setGenKey(null); resolve(false); }
          };
          toast(`分镜${s.episode}-${s.sceneNo}-${s.shotNo} 视频任务已创建...`, 'info');
          poll();
        });
      } else { toast(r.error || '创建视频任务失败', 'error'); setGenKey(null); return false; }
    } catch (e) { toast(e.message, 'error'); setGenKey(null); return false; }
  };

  // 批量生成全部分镜视频
  const genAllVideos = async () => {
    for (let realIdx = 0; realIdx < shots.length; realIdx++) {
      const s = getShot(realIdx);
      if (!s || s.videoUrl) continue;
      let keyframeUrl = s.keyframeUrl;
       if (!keyframeUrl) { keyframeUrl = await genKeyframe(s.id); if (!keyframeUrl) continue; }
      await genShotVideo(realIdx, keyframeUrl);
    }
  };

  // #8 时长自动估算
  const estimateDuration = (s) => {
    const words = (s.dialogue || '').length;
    const dialogueSec = words / 3.5;
    const actionBeats = (s.action || '').split(/[，,；;。]/).filter(Boolean).length;
    const actionSec = actionBeats * 0.8;
    return Math.max(3, Math.min(10, Math.round(dialogueSec + actionSec)));
  };
  const recalcDurations = () => { onUpdate(prevShots => { const arr = [...(prevShots || shots)]; arr.forEach((s, i) => { arr[i] = { ...s, duration: estimateDuration(s) }; }); return arr; }); toast('已重新估算时长', 'ok'); };

  return (
    <div>
      {/* 覆盖率面板 #3 */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>📊 分镜覆盖率</span>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, alignItems: 'center' }}>
            <span>总计 {total}</span>
            <span style={{ color: 'var(--ai-text-muted)' }}>关键帧 {withKeyframe}/{total}</span>
            <span style={{ color: 'var(--ai-text-muted)' }}>视频 {withVideo}/{total}</span>
            <span style={{ color: withVideo === total ? 'var(--ai-success)' : 'var(--ai-warning)' }}>未完成 {coverage.pending}</span>
          </div>
          <div className="progress-line" style={{ flex: 1, minWidth: 100, maxWidth: 200 }}><div className="fill" style={{ width: (total ? (withVideo / total * 100) : 0) + '%' }} /></div>
        </div>
      </div>

      <div className="shot-toolbar">
        <select value={filterEp} onChange={e => setFilterEp(e.target.value)}><option value="">全部集</option>{eps.map(e => <option key={e} value={e}>第{e}集</option>)}</select>
        <select value={filterScene} onChange={e => setFilterScene(e.target.value)}><option value="">全部场景</option>{scenes.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}</select>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}><input type="checkbox" checked={filterPending} onChange={e => setFilterPending(e.target.checked)} />仅未生成视频</label>
        <div className="seg"><button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>表格</button><button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}>网格</button></div>
        <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }} title="使用角色设定图作为参考图保持一致性"><input type="checkbox" checked={useCharRef} onChange={e => setUseCharRef(e.target.checked)} />🔒角色一致性</label>
        <Button size="small" onClick={recalcDurations}>⏱ 重算时长</Button>
        <Button size="small" type="primary" loading={genKey !== null} onClick={genAllVideos} disabled={coverage.pending === 0}>🎬 一键生成全部视频 ({coverage.pending})</Button>
        <Button size="small" onClick={() => onUpdate(prevShots => { const arr = prevShots || []; return [...arr, { id: stableId('shot'), episode: 1, sceneNo: 1, shotNo: arr.length + 1, shotType: '中景', duration: 4, characterNames: [], sceneName: scenes[0]?.name || '' }]; })}>+ 新增分镜</Button>
      </div>
      {view === 'table' ? (
        <div className="shots-scroll"><table className="shots"><thead><tr>
          <th className="num">缩略</th><th className="num">集</th><th className="num">场</th><th className="num">镜</th><th>景别</th><th>画面</th><th>对白</th><th>动作</th><th>字幕</th><th className="num">秒</th><th>角色</th><th>场景</th><th className="prompt-cell">Prompt(英)</th><th>导演备注</th><th></th>
        </tr></thead><tbody>
          {filtered.map((s, idx) => {
            const realIdx = shots.indexOf(s);
            return (
            <tr key={s.id} className={s.videoUrl ? 'row-done' : s.keyframeUrl ? 'row-partial' : ''}>
              <td className="num">{s.keyframeUrl ? <img src={s.keyframeUrl} style={{ width: 48, height: 27, objectFit: 'cover', borderRadius: 3 }} /> : s.videoUrl ? '🎬' : '—'}</td>
              <td className="num">{s.episode}</td><td className="num">{s.sceneNo}</td><td className="num">{s.shotNo}</td>
              <td><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(idx, 'shotType', e.target.textContent)}>{s.shotType}</div></td>
              <td><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(idx, 'visual', e.target.textContent)}>{s.visual}</div></td>
              <td><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(idx, 'dialogue', e.target.textContent)}>{s.dialogue}</div></td>
              <td><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(idx, 'action', e.target.textContent)}>{s.action}</div></td>
              <td><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(idx, 'subtitle', e.target.textContent)}>{s.subtitle || ''}</div></td>
              <td className="num"><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(idx, 'duration', parseInt(e.target.textContent) || 0)}>{s.duration}</div></td>
              <td>{charName(s.characterNames)}</td><td>{s.sceneName}</td>
              <td className="prompt-cell"><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(idx, 'promptEn', e.target.textContent)}>{s.promptEn}</div></td>
              <td><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(idx, 'notes', e.target.textContent)}>{s.notes || ''}</div></td>
              <td className="shot-actions-cell"><div className="shot-actions">
                 <button className="btn sm ghost" title="复制EN Prompt" onClick={() => { navigator.clipboard?.writeText(s.promptEn); toast('已复制EN', 'ok'); }}>复制</button>
                 <button className="btn sm" title="生成关键帧" disabled={!!genKey} onClick={() => genKeyframe(s.id)}>{genKey === `kf-${s.id}` ? '...' : s.keyframeUrl ? '🔄' : '🖼'}</button>
                 <button className="btn sm" title="生成视频" disabled={!!genKey} onClick={() => genShotVideo(realIdx)}>{genKey === `vd-${s.id}` ? '...' : s.videoUrl ? '✅' : '🎬'}</button>
                <button className="btn sm ghost" onClick={() => moveShot(idx, -1)}>↑</button>
                <button className="btn sm ghost" onClick={() => moveShot(idx, 1)}>↓</button>
                 <button className="btn sm ghost danger" onClick={() => { if (confirm('确认删除该分镜？')) onUpdate(prevShots => { const arr = prevShots || shots; return arr.filter((_, x) => x !== realIdx); }); }}>删</button>
              </div></td>
            </tr>
          ); })}
        </tbody></table></div>
      ) : (
        <div className="shot-grid">
          {filtered.map((s, idx) => {
            const realIdx = shots.indexOf(s);
            return (
            <div key={s.id} className="shot-tile">
              <div className="tile-head"><span>第{s.episode}集·{s.sceneNo}场·{s.shotNo}镜</span><span className="badge">{s.shotType} {s.duration}s</span></div>
              {s.keyframeUrl && <img src={s.keyframeUrl} style={{ width: '100%', borderRadius: 6, marginBottom: 6 }} />}
              {s.videoUrl && <video src={s.videoUrl} controls style={{ width: '100%', borderRadius: 6, marginBottom: 6 }} />}
              {s.narrativePurpose && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-primary)', marginBottom: 4 }}>🎯 {s.narrativePurpose}</div>}
              <div className="tile-visual">{s.visual}</div>
              {s.action && <div style={{ fontSize: 11, color: 'var(--ai-text)', marginBottom: 4 }}>🏃 {s.action}</div>}
              {s.dialogue && <div style={{ fontSize: 12, color: 'var(--ai-text-muted)' }}>「{s.dialogue}」</div>}
              {s.subtitle && s.subtitle !== s.dialogue && <div style={{ fontSize: 11, color: 'var(--ai-text-secondary)' }}>📝 {s.subtitle}</div>}
              {s.soundDesign && <div style={{ fontSize: 11, color: 'var(--ai-text-muted)' }}>🔊 {s.soundDesign}</div>}
              {s.continuityNote && <div style={{ fontSize: 11, color: 'var(--ai-warning)', borderTop: '1px dashed var(--ai-border-light)', paddingTop: 4, marginTop: 4 }}>🔗 {s.continuityNote}</div>}
              {s.nextShotTransition && <div style={{ fontSize: 11, color: 'var(--ai-text-muted)' }}>→ {s.nextShotTransition}</div>}
              <div className="tile-prompt"><b>中</b>：{s.promptZh}<br /><b>EN</b>：{s.promptEn}</div>
              <input className="cell-edit" style={{ width: '100%', marginTop: 4, fontSize: 11 }} placeholder="导演备注..." defaultValue={s.notes || ''} onBlur={e => update(idx, 'notes', e.target.value)} />
              <div className="tile-actions">
                <Button size="small" onClick={() => { navigator.clipboard?.writeText(s.promptEn); toast('已复制EN', 'ok'); }}>复制EN</Button>
                 <Button size="small" type="primary" loading={genKey === `kf-${s.id}`} onClick={() => genKeyframe(s.id)} disabled={!s.promptEn}>{s.keyframeUrl ? '🔄关键帧' : '🖼关键帧'}</Button>
                 <Button size="small" type="primary" loading={genKey === `vd-${s.id}`} onClick={() => genShotVideo(realIdx)} disabled={!s.keyframeUrl}>{s.videoUrl ? '🔄视频' : '🎬视频'}</Button>
                <Button size="small" onClick={() => moveShot(idx, -1)}>↑</Button>
                <Button size="small" onClick={() => moveShot(idx, 1)}>↓</Button>
                <Button size="small" danger onClick={() => { if (confirm('确认删除该分镜？')) onUpdate(prevShots => { const arr = prevShots || shots; return arr.filter((_, x) => x !== realIdx); }); }}>删</Button>
              </div>
            </div>
          ); })}
        </div>
      )}
    </div>
  );
}

function MdView({ content, emptyTip }) {
  if (!content) return <Empty tip={emptyTip} />;
  return <div className="md-body" dangerouslySetInnerHTML={{ __html: renderMd(typeof content === 'string' ? content : '```json\n' + JSON.stringify(content, null, 2) + '\n```') }} />;
}

// ============ Knowledge View (跨章上下文) ============
function KnowledgeView({ project, onUpdate }) {
  const kb = project?.knowledge || { characters: [], scenes: [], props: [], timeline: [] };
  const [sub, setSub] = useS('characters');
  const tabs = [['characters','角色'],['scenes','场景'],['props','道具'],['timeline','时间线']];
  const list = kb[sub] || [];
  return (
    <div>
      <div style={{ background: 'var(--ai-primary-bg)', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12, color: 'var(--ai-text-body)' }}>
        💡 知识库在每次章节分析时自动提取并跨章累积。后续分析（角色/场景/分镜等）会注入知识库上下文，确保人物形象、性格、场景描述跨章一致（避免OCC）。
      </div>
      <div className="kb-tabs">{tabs.map(([k, label]) => <div key={k} className={`kb-tab ${sub === k ? 'active' : ''}`} onClick={() => setSub(k)}>{label} ({(kb[k] || []).length})</div>)}</div>
      {list.length === 0 ? <Empty tip="分析章节后将自动提取知识库；或分析角色设定后自动积累" /> : list.map((item, i) => (
        <div key={i} className="kb-item">
          <div className="kb-name">{item.name || item.chapter || '未命名'} {item.sourceChapter && <Tag size="small" color="app-blue">来源:{item.sourceChapter}</Tag>}</div>
          {Object.entries(item).filter(([k]) => !['id', 'name', 'chapter', 'sourceChapter', 'sourceChapterId'].includes(k)).map(([k, v]) => (
            <div key={k} style={{ fontSize: 12, marginBottom: 3 }}><b style={{ color: 'var(--ai-text-secondary)' }}>{k}：</b>{Array.isArray(v) ? v.join('、') : String(v)}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ============ Media Gen (生图/生视频/图生图/图生视频) ============
function MediaGen({ styles, project, characters, scenes, onUpdate, projectRef, vidTask, setVidTask, vidPolling, setVidPolling, pollRef, createServerJob, updateServerJob, recordCompletedAsset }) {
  const [tab, setTab] = useS('image'); // 'image' | 'video'
  const [prompt, setPrompt] = useS('');
  const [negPrompt, setNegPrompt] = useS('');
  const [size, setSize] = useS('1024x768');
  const [gen, setGen] = useS(false);
  const [imgUrl, setImgUrl] = useS(null);
  const [err, setErr] = useS('');
  const [refImage, setRefImage] = useS(''); // 图生图/图生视频参考图URL
  const [vidDuration, setVidDuration] = useS('5'); // 3s/5s/10s
  const [vidRatio, setVidRatio] = useS('16:9');
  const [histOpen, setHistOpen] = useS(false);

  const mediaHistory = project?.results?.media || [];
  const delMedia = (id) => onUpdate(prev => ({ results: { ...(prev.results || {}), media: (prev.results?.media || []).filter(m => m.id !== id) } }));

  const DURATION_MAP = { '3': { num_frames: 81, frame_rate: 24 }, '5': { num_frames: 121, frame_rate: 24 }, '10': { num_frames: 241, frame_rate: 24 } };
  const RATIO_MAP = { '16:9': { width: 1152, height: 768 }, '9:16': { width: 768, height: 1152 }, '1:1': { width: 896, height: 896 } };

  const generateImage = async () => {
    if (!prompt) { toast('请输入Prompt', 'error'); return; }
    setGen(true); setErr(''); setImgUrl(null);
    try {
      const images = refImage ? [refImage] : undefined;
      const r = await api.genImage(prompt, negPrompt, size, project?.style, images);
       if (r.ok) { setImgUrl(r.url); await recordCompletedAsset(project.id, 'project', project.id, 'image', r.url, { prompt, negPrompt, size, hasRef: !!refImage }); toast(refImage ? '图生图完成' : '文生图完成', 'ok'); }
      else { setErr(r.error); toast('生成失败', 'error'); }
    } catch (e) { setErr(e.message); toast('生成失败', 'error'); }
    setGen(false);
  };

  const generateVideo = async () => {
    if (!prompt) { toast('请输入Prompt', 'error'); return; }
    const targetId = project?.id;
    setGen(true); setErr(''); setVidTask(null); setVidPolling(true);
    try {
      const dur = DURATION_MAP[vidDuration];
      const ratio = RATIO_MAP[vidRatio];
      const params = {
        prompt, visualStyle: project?.style, negativePrompt: negPrompt || undefined,
        height: ratio.height, width: ratio.width,
        num_frames: dur.num_frames, frame_rate: dur.frame_rate,
        image: refImage || undefined,
      };
      const r = await api.genVideo(params);
      if (r.ok && r.video_id) {
        const job = await createServerJob(targetId, { type: 'video', entityType: 'project', entityId: targetId, providerTaskId: r.video_id, status: r.status || 'processing', params });
        setVidTask({ video_id: r.video_id, status: r.status, progress: r.progress || 0, url: null });
        toast('视频任务已创建，正在生成...', 'info');
        pollVideo(r.video_id, targetId, job);
      } else { setErr(r.error || '创建任务失败'); setVidPolling(false); }
    } catch (e) { setErr(e.message); setVidPolling(false); }
    setGen(false);
  };

  const pollVideo = async (videoId, targetId, job) => {
    let attempts = 0;
    let delay = 10000; // 初始10秒，避免429限流
    const poll = async () => {
      attempts++;
      try {
        const r = await api.getVideo(videoId);
        if (!r.ok) { setErr(r.error); setVidPolling(false); return; }
        // 429限流：不更新状态，延长等待后重试
        if (r.rate_limited) {
          if (attempts < 60) { pollRef.current = setTimeout(poll, Math.min(delay * 1.5, 30000)); }
          else { setErr('视频生成超时(限流)'); setVidPolling(false); }
          return;
        }
        setVidTask({ video_id: videoId, status: r.status, progress: r.progress || 0, url: r.url || null, seconds: r.seconds, size: r.size });
        if (r.status === 'completed') { await updateServerJob(targetId, job.id, { status: 'completed', asset: { kind: 'video', url: r.url, prompt, negPrompt, duration: vidDuration, ratio: vidRatio, hasRef: !!refImage, seconds: r.seconds, size: r.size } }); setVidPolling(false); toast('视频生成完成', 'ok'); return; }
        if (r.status === 'failed') { await updateServerJob(targetId, job.id, { status: 'failed', error: r.error || '视频生成失败' }); setErr('视频生成失败'); setVidPolling(false); return; }
        if (r.status && r.status !== job.status) { await updateServerJob(targetId, job.id, { status: r.status, progress: r.progress }); job.status = r.status; }
        if (attempts < 60) { pollRef.current = setTimeout(poll, delay); }
        else { setErr('视频生成超时'); setVidPolling(false); }
      } catch (e) { setErr(e.message); setVidPolling(false); }
    };
    poll();
  };

  const useCharPrompt = (p, label) => { setPrompt(p || ''); toast('已填入' + label, 'ok'); };
  const onUploadRef = (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (!f.type.startsWith('image/')) { toast('仅支持图片文件', 'error'); e.target.value = ''; return; }
    if (f.size > 8 * 1024 * 1024) { toast('参考图需小于8MB', 'error'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => setRefImage(reader.result);
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  return (
    <div>
      <div className="seg" style={{ marginBottom: 12 }}>
        <button className={tab === 'image' ? 'active' : ''} onClick={() => setTab('image')}>🖼️ 生图</button>
        <button className={tab === 'video' ? 'active' : ''} onClick={() => setTab('video')}>🎬 生视频</button>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ai-field"><label>Prompt（已自动追加当前视觉风格）</label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="描述要生成的画面..." style={{ minHeight: 80 }} /></div>
        <div className="form-row">
          <div className="ai-field"><label>Negative Prompt</label><input value={negPrompt} onChange={e => setNegPrompt(e.target.value)} placeholder="排除的元素..." /></div>
          {tab === 'image' ? (
            <div className="ai-field"><label>尺寸</label><select value={size} onChange={e => setSize(e.target.value)}><option>1024x768</option><option>768x1024</option><option>1024x1024</option></select></div>
          ) : (
            <>
              <div className="ai-field"><label>时长</label><select value={vidDuration} onChange={e => setVidDuration(e.target.value)}><option value="3">约3秒</option><option value="5">约5秒</option><option value="10">约10秒</option></select></div>
              <div className="ai-field"><label>画幅</label><select value={vidRatio} onChange={e => setVidRatio(e.target.value)}><option value="16:9">16:9 横屏</option><option value="9:16">9:16 竖屏</option><option value="1:1">1:1 方形</option></select></div>
            </>
          )}
        </div>
        {/* 参考图（图生图/图生视频） */}
        <div className="ai-field">
          <label>参考图（可选，用于图生图/图生视频）</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={refImage ? '(已上传参考图)' : ''} readOnly placeholder="无参考图则文生图/文生视频" style={{ flex: 1 }} />
            <input type="file" accept="image/*" hidden id="refUpload" onChange={onUploadRef} />
            <Button size="small" onClick={() => document.getElementById('refUpload')?.click()}>上传</Button>
            {refImage && <Button size="small" danger onClick={() => setRefImage('')}>清除</Button>}
          </div>
          {refImage && <img src={refImage} alt="参考图" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 6, border: '2px solid var(--ai-border)' }} />}
        </div>
        {tab === 'image' ? (
          <Button type="primary" loading={gen} onClick={generateImage} block>{refImage ? '🎨 图生图' : '🖼️ 文生图'}</Button>
        ) : (
          <Button type="primary" loading={gen} onClick={generateVideo} block>{refImage ? '🎬 图生视频' : '🎬 文生视频'}</Button>
        )}
        {err && <div className="status-bar error">{err}</div>}
        {imgUrl && <img className="img-preview" src={imgUrl} alt="生成结果" />}
        {/* 视频任务状态 */}
        {vidTask && (
          <div style={{ marginTop: 12, padding: 12, background: 'var(--ai-bg-content)', borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              视频任务 {vidTask.status === 'completed' ? '✅ 完成' : vidTask.status === 'failed' ? '❌ 失败' : '⏳ 生成中...'}
              {vidTask.seconds && <span style={{ marginLeft: 8, color: 'var(--ai-text-muted)' }}>{vidTask.seconds}s / {vidTask.size}</span>}
            </div>
            {vidTask.status !== 'completed' && vidTask.status !== 'failed' && (
              <div className="progress-line"><div className="fill" style={{ width: vidTask.progress + '%' }} /></div>
            )}
            {vidTask.status === 'completed' && vidTask.url && (
              <video src={vidTask.url} controls style={{ width: '100%', borderRadius: 8, marginTop: 8 }} />
            )}
          </div>
        )}
      </div>

      <div className="card-title">⚡ 快速填入（点击复制角色/场景Prompt到上方）</div>
      {characters.length === 0 && scenes.length === 0 ? <Empty tip="先生成角色/场景设定" /> : (
        <div className="grid-cards" style={{ marginTop: 10 }}>
          {characters.map((c, i) => (
            <div key={'c' + i} className="item-card">
              <div className="kb-name">{c.name}</div>
              <Button size="small" style={{ marginTop: 6 }} onClick={() => useCharPrompt(c.imagePromptEn, c.name + '设定图')} disabled={!c.imagePromptEn}>填入设定图EN</Button>
            </div>
          ))}
          {scenes.map((s, i) => (
            <div key={'s' + i} className="item-card">
              <div className="kb-name">{s.name}</div>
              <Button size="small" style={{ marginTop: 6 }} onClick={() => useCharPrompt(s.imagePromptEn, s.name)} disabled={!s.imagePromptEn}>场景图</Button>
            </div>
          ))}
          {project?.results?.storyboard?.shots?.map((s, i) => (
            <div key={'v' + i} className="item-card">
              <div className="kb-name">第{s.episode}集 {s.sceneNo}-{s.shotNo}</div>
              <Button size="small" style={{ marginTop: 6 }} onClick={() => { setTab('video'); useCharPrompt(s.promptEn, '分镜' + s.shotNo); }} disabled={!s.promptEn}>填入视频EN</Button>
            </div>
          ))}
        </div>
      )}

      {mediaHistory.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => setHistOpen(!histOpen)}>
            <span>🗂️ 生成历史（{mediaHistory.length}）</span>
            <span style={{ fontSize: 12, color: 'var(--ai-text-muted)' }}>{histOpen ? '收起 ▴' : '展开 ▾'}</span>
          </div>
          {histOpen && (
            <div className="media-gallery">
              {[...mediaHistory].reverse().map(m => (
                <div key={m.id} className="media-item">
                  <div className="media-thumb">
                    {m.type === 'image' ? (
                      <img src={m.url} alt={m.prompt} loading="lazy" />
                    ) : (
                      <video src={m.url} controls preload="metadata" />
                    )}
                  </div>
                  <div className="media-meta">
                    <span className="media-tag">{m.type === 'image' ? '🖼️' : '🎬'}{m.hasRef ? '(参考图)' : ''}</span>
                    {m.size && m.type === 'image' && <span className="media-size">{m.size}</span>}
                    {m.duration && <span className="media-size">{m.duration}s</span>}
                    {m.seconds && <span className="media-size">{m.seconds}s</span>}
                    <span className="media-time">{m.createdAt ? new Date(m.createdAt).toLocaleString('zh-CN', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : ''}</span>
                  </div>
                  <div className="media-prompt" title={m.prompt}>{(m.prompt || '').slice(0, 60)}{(m.prompt||'').length > 60 ? '...' : ''}</div>
                  <div className="media-actions">
                    <a href={m.url} download target="_blank" rel="noreferrer"><Button size="small">下载</Button></a>
                    <Button size="small" danger onClick={() => delMedia(m.id)}>删</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ Manga View (漫画分格 + 一键生图) ============
function MangaView({ manga, project, onUpdate, projectRef, recordCompletedAsset }) {
  const [generatingKey, setGeneratingKey] = useS(null);

  if (!manga || !manga.pages || !manga.pages.length) return <Empty tip="生成漫画脚本后将显示分格画面，每格可一键生成漫画图" />;

  const pages = manga.pages;
  // 生成的图片存到 manga.panelImages，随项目持久化
  const panelImages = manga.panelImages || {};
  // 使用函数式更新避免 stale closure（genAll 循环中每次都从最新 state 取值）

  const genPanelImage = async (pageIdx, panelIdx, panel) => {
    const key = panel.id;
    const targetProjectId = project.id;
    if (!panel.imagePromptEn) { toast('该格缺少英文Prompt', 'error'); return; }
    setGeneratingKey(key);
    try {
      const r = await api.genImage(panel.imagePromptEn, '', '1024x1024', project?.style);
      if (r.ok) {
        await recordCompletedAsset(targetProjectId, 'panel', panel.id, 'image', r.url, { prompt: panel.imagePromptEn });
        toast('漫画格生成完成', 'ok');
      } else { toast(r.error || '生成失败', 'error'); }
    } catch (e) { toast(e.message, 'error'); }
    setGeneratingKey(null);
  };

  const genAll = async () => {
    for (let pi = 0; pi < pages.length; pi++) {
      for (let gi = 0; gi < pages[pi].panels.length; gi++) {
        const key = pages[pi].panels[gi].id;
        // 从最新 project state 读取已生成的图片，避免 stale closure
        const currentImages = (projectRef?.current?.results?.manga?.panelImages) || panelImages;
        if (currentImages[key]) continue;
        await genPanelImage(pi, gi, pages[pi].panels[gi]);
      }
    }
  };

  const pendingCount = pages.reduce((sum, pg) => sum + pg.panels.filter(panel => !panel.imageUrl && !panelImages[panel.id]).length, 0);

  return (
    <div>
      <div className="card" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{manga.title || '未命名漫画'}</div>
          <div style={{ fontSize: 12, color: 'var(--ai-text-muted)' }}>{manga.styleType} · {manga.totalPages}页 · {manga.readingDirection} · {manga.platform}</div>
        </div>
        <Button type="primary" loading={!!generatingKey} onClick={genAll} disabled={pendingCount === 0}>{generatingKey ? '生成中...' : `一键生成全部漫画图${pendingCount > 0 ? `(${pendingCount}格待生成)` : ''}`}</Button>
      </div>
      {manga.synopsis && <div className="md-body" style={{ marginBottom: 12, fontSize: 13, color: 'var(--ai-text-muted)' }}>{manga.synopsis}</div>}
      {pages.map((page, pi) => (
        <div key={page.id} className="card" style={{ marginBottom: 16 }}>
          <div className="manga-page-head">
            <span className="manga-page-num">第{page.pageNum || pi + 1}页</span>
            <span className="manga-pace">{page.narrativePace}</span>
            {page.pageHook && <span className="manga-hook" title={page.pageHook}>翻页钩子: {page.pageHook}</span>}
          </div>
          <div className="manga-panels">
            {page.panels.map((panel, gi) => {
              const key = panel.id;
              const imgUrl = panel.imageUrl || panelImages[key] || panelImages[`${pi}-${gi}`];
              const isGenerating = generatingKey === key;
              return (
                <div key={panel.id} className={`manga-panel ${panel.sizeHint?.includes('大') ? 'large' : panel.sizeHint?.includes('小') ? 'small' : ''}`}>
                  <div className="manga-panel-head">
                    <span className="manga-panel-num">格{panel.panelNum || gi + 1}</span>
                    <span className="manga-layout">{panel.layout}</span>
                    {panel.sizeHint && <span className="manga-size-hint">{panel.sizeHint}</span>}
                  </div>
                  {(imgUrl || isGenerating) && (
                    <div className="manga-panel-image">
                      {isGenerating && <div className="manga-gen-loading">生成中...</div>}
                      {imgUrl && <img src={imgUrl} alt={`格${gi+1}`} loading="lazy" />}
                    </div>
                  )}
                  <div className="manga-panel-desc">{panel.sceneDesc}</div>
                  {panel.characterExpressions && <div className="manga-panel-meta"><b>表情:</b> {panel.characterExpressions}</div>}
                  {panel.dialogue?.length > 0 && (
                    <div className="manga-dialogues">
                      {panel.dialogue.map((d, di) => (
                        <div key={di} className="manga-dialogue"><span className="dl-pos">{d.position}</span><span className="dl-speaker">{d.speaker}:</span> <span className="dl-text">「{d.text}」</span></div>
                      ))}
                    </div>
                  )}
                  {panel.narration?.text && <div className="manga-narration"><span className="dl-pos">{panel.narration.position}</span> {panel.narration.text}</div>}
                  {panel.soundEffect?.text && <div className="manga-sfx" data-style={panel.soundEffect.style}>{panel.soundEffect.text}</div>}
                  {panel.emotionSymbols?.length > 0 && <div className="manga-emotions">{panel.emotionSymbols.join(' ')}</div>}
                  {panel.transitionToNext && <div className="manga-transition">→ {panel.transitionToNext}</div>}
                  {panel.imagePromptEn && (
                    <div className="manga-panel-prompt">
                      <details><summary>英文Prompt</summary><div className="prompt-text">{panel.imagePromptEn}</div></details>
                    </div>
                  )}
                  <div className="manga-panel-actions">
                    <Button size="small" type="primary" loading={isGenerating} onClick={() => genPanelImage(pi, gi, panel)} disabled={!panel.imagePromptEn}>
                      {imgUrl ? '重新生图' : '生图'}
                    </Button>
                    {imgUrl && <a href={imgUrl} download target="_blank" rel="noreferrer"><Button size="small">下载</Button></a>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ Snapshot View (版本快照) ============
function SnapshotView({ project, flushProject }) {
  const [snapshots, setSnapshots] = useS([]);
  const [loading, setLoading] = useS(false);
  const [label, setLabel] = useS('');

  const refresh = async () => { if (!project?.id) return; try { setSnapshots(await api.getSnapshots(project.id)); } catch {} };
  useE(() => { refresh(); }, [project?.id]);

  const create = async () => {
    if (!project?.id) return;
    setLoading(true);
    try { await flushProject(project.id); await api.snapshot(project.id, label.trim() || `快照 ${snapshots.length + 1}`); setLabel(''); toast('快照已创建', 'ok'); refresh(); }
    catch (e) { toast('创建失败: ' + e.message, 'error'); }
    setLoading(false);
  };

  const restore = async (snId) => {
    if (!confirm('恢复快照将覆盖当前内容（会自动保存当前状态为快照）')) return;
    try { await flushProject(project.id); await api.restoreSnapshot(project.id, snId); toast('快照已恢复', 'ok'); window.location.reload(); }
    catch (e) { toast('恢复失败: ' + e.message, 'error'); }
  };

  if (!snapshots.length) return (
    <div>
      <div className="card" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="快照名称（可选）" style={{ flex: 1 }} />
        <Button type="primary" loading={loading} onClick={create}>📸 创建快照</Button>
      </div>
      <Empty tip="创建快照可保存当前项目状态，随时可恢复（最多20个）" />
    </div>
  );

  return (
    <div>
      <div className="card" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="快照名称（可选）" style={{ flex: 1 }} />
        <Button type="primary" loading={loading} onClick={create}>📸 创建快照</Button>
      </div>
      <div className="grid-cards">
        {snapshots.slice().reverse().map(s => (
          <div key={s.id} className="item-card">
            <div className="item-head">
              <input className="item-name" value={s.label} readOnly />
              <Button size="small" type="primary" onClick={() => restore(s.id)}>恢复</Button>
            </div>
            <div className="field" style={{ fontSize: 11, color: 'var(--ai-text-muted)' }}>{new Date(s.timestamp).toLocaleString('zh-CN')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConsistencyView({ project, onUpdate }) {
  const consistency = project.results?.consistency || { issues: [], summary: '', blockingCount: 0 };
  const [running, setRunning] = useS(false);
  const run = async () => {
    if (!project.results || Object.keys(project.results).length === 0) { toast('请先生成分析结果', 'error'); return; }
    setRunning(true);
    try { await api.checkConsistency(project.id, project.results, project.knowledge, (d) => { if (d.status === 'done' && d.result) onUpdate(prev => ({ results: { ...prev.results, consistency: d.result } })); if (d.error) toast(d.error, 'error'); }); toast('检查完成', 'ok'); }
    catch (e) { toast('检查失败', 'error'); }
    setRunning(false);
  };
  const updateStatus = (issueId, status) => onUpdate(prev => {
    const current = prev.results?.consistency || consistency;
    const issues = (current.issues || []).map(issue => issue.id === issueId ? { ...issue, status } : issue);
    const blockingCount = issues.filter(issue => issue.severity === 'error' && issue.status === 'open').length;
    return { results: { ...prev.results, consistency: { ...current, issues, blockingCount } } };
  });
  return <div className="consistency-view">
    <div className="consistency-toolbar"><Button type="primary" loading={running} onClick={run}>🔍 检查一致性</Button><span className={`blocking-count ${consistency.blockingCount ? 'active' : ''}`}>阻断 {consistency.blockingCount || 0}</span><span>问题 {(consistency.issues || []).length}</span></div>
    {consistency.summary && <div className="md-body consistency-summary" dangerouslySetInnerHTML={{ __html: renderMd(consistency.summary) }} />}
    {(consistency.issues || []).length ? <div className="consistency-issues">{consistency.issues.map(issue => <div key={issue.id} className={`consistency-issue severity-${issue.severity} status-${issue.status}`}>
      <div className="issue-head"><Tag>{issue.severity}</Tag><b>{issue.rule || issue.category}</b><span>{issue.entityType}{issue.entityId ? ` · ${issue.entityId}` : ''}{issue.shotId ? ` · shot ${issue.shotId}` : ''}</span></div>
      <div className="issue-message">{issue.message}</div>{issue.suggestion && <div className="issue-suggestion">建议：{issue.suggestion}</div>}
      <div className="issue-actions">{['open', 'resolved', 'accepted'].map(status => <button key={status} className={issue.status === status ? 'active' : ''} onClick={() => updateStatus(issue.id, status)}>{status}</button>)}</div>
    </div>)}</div> : !consistency.summary && <Empty tip="点击上方按钮检查各模块间角色、场景和时间线一致性" />}
  </div>;
}

function Empty({ tip }) { return <div className="empty"><div className="big">✦</div><div style={{ fontSize: 16, marginBottom: 6 }}>暂无内容</div><div style={{ fontSize: 13 }}>{tip}</div></div>; }

// ============ Main App ============
function App() {
  const [projects, setProjects] = useS([]);
  const [currentId, setCurrentId] = useS(null);
  const [project, setProject] = useS(null);
  const [styles, setStyles] = useS([]);
  const [settingsOpen, setSettingsOpen] = useS(false);
  const [newOpen, setNewOpen] = useS(false);
  const [collapsed, setCollapsed] = useS(false);
  const [inputCollapsed, setInputCollapsed] = useS(false);
  const [mobileTab, setMobileTab] = useS('input');
  const [sidebarOpen, setSidebarOpen] = useS(false);
  const [cfg, setCfg] = useS(null);
  const [darkMode, setDarkMode] = useS(() => { try { return localStorage.getItem('theme') === 'dark'; } catch { return false; } });
  useE(() => { document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light'); try { localStorage.setItem('theme', darkMode ? 'dark' : 'light'); } catch {} }, [darkMode]);
  const [analysisSource, setAnalysisSource] = useS({ mode: 'chapters', chId: '' });
  const [streaming, setStreaming] = useS('');
  const [streamingType, setStreamingType] = useS('');
  const [batchGenerating, setBatchGenerating] = useS(false);
  const [loadingProject, setLoadingProject] = useS(false);
  const [saveStatus, setSaveStatus] = useS('saved');

  const refreshProjects = useCB(async () => { try { const r = await api.listProjects(); setProjects(r.items || []); } catch {} }, []);

  useE(() => { refreshProjects(); api.styles().then(s => setStyles(s)).catch(() => {}); api.getConfig().then(setCfg).catch(() => {}); }, []);
  useE(() => { window.__analyzeAll = (mods) => window.__analyzeAllImpl?.(mods); });

  const projectRef = useR(null);
  const saveTimers = useR({});
  const pendingProjects = useR({});
  const savingProjects = useR({});
  const loadToken = useR(0);
  useE(() => { projectRef.current = project; }, [project]);

  const flushProject = useCB(async (id) => {
    clearTimeout(saveTimers.current[id]); delete saveTimers.current[id];
    if (savingProjects.current[id]) { await savingProjects.current[id]; if (pendingProjects.current[id]) return flushProject(id); return; }
    const pending = pendingProjects.current[id];
    if (!pending) return;
    delete pendingProjects.current[id]; setSaveStatus('saving');
    const save = async (payload, retried = false) => {
      try {
        return await api.updateProject(id, payload, payload.revision || 0);
      } catch (error) {
        const serverProject = error.status === 409 && error.data?.project;
        if (!retried && serverProject) {
          const merged = normalizeProject(mergeProjectState(serverProject, payload));
          merged.revision = serverProject.revision;
          pendingProjects.current[id] = merged;
          const saved = await save(merged, true);
          if (pendingProjects.current[id] === merged) delete pendingProjects.current[id];
          return saved;
        }
        throw error;
      }
    };
    const promise = save(pending).then(saved => {
      const revision = saved.revision ?? pending.revision;
      if (pendingProjects.current[id]) pendingProjects.current[id] = { ...pendingProjects.current[id], revision };
      if (projectRef.current?.id === id) {
        const next = pendingProjects.current[id] ? { ...projectRef.current, revision } : normalizeProject({ ...projectRef.current, ...saved, revision });
        projectRef.current = next; setProject(next); setSaveStatus(pendingProjects.current[id] ? 'saving' : 'saved');
      }
      refreshProjects();
    }).catch(error => {
      pendingProjects.current[id] = pendingProjects.current[id] || pending;
      setSaveStatus(error.status === 409 ? 'conflict' : 'failed');
      throw error;
    }).finally(() => { delete savingProjects.current[id]; });
    savingProjects.current[id] = promise;
    await promise;
    if (pendingProjects.current[id]) return flushProject(id);
  }, [refreshProjects]);

  const loadProject = async (id) => {
    const token = ++loadToken.current;
    const previousId = projectRef.current?.id;
    if (previousId) { try { await flushProject(previousId); } catch {} }
    if (!id || token !== loadToken.current) { if (!id) { setProject(null); setCurrentId(null); } return; }
    setLoadingProject(true);
    try {
      const loaded = normalizeProject(await api.getProject(id));
      if (token !== loadToken.current) return;
      projectRef.current = loaded; setProject(loaded); setCurrentId(id); setSaveStatus('saved'); setAnalysisSource({ mode: 'chapters', chId: '' });
    } catch (e) { if (token === loadToken.current) toast(e.message, 'error'); }
    if (token === loadToken.current) setLoadingProject(false);
  };

  const updateProject = useCB((patchOrFn) => {
    const current = projectRef.current; if (!current) return;
    const patch = typeof patchOrFn === 'function' ? patchOrFn(current) : patchOrFn;
    let updated = { ...current, ...patch };
    const upstreamChanged = ['content', 'style', 'chapters'].some(key => patch[key] !== undefined && patch[key] !== current[key]);
    if (upstreamChanged) updated = { ...updated, ...staleUpstream(updated) };
    updated = normalizeProject(updated);
    projectRef.current = updated; setProject(updated); pendingProjects.current[current.id] = updated; setSaveStatus('saving');
    clearTimeout(saveTimers.current[current.id]);
    saveTimers.current[current.id] = setTimeout(() => { flushProject(current.id).catch(() => {}); }, 600);
  }, [flushProject]);

  const updateTargetProject = useCB(async (targetProjectId, patchOrFn, flushNow = false) => {
    if (projectRef.current?.id === targetProjectId) {
      updateProject(patchOrFn);
      if (flushNow) await flushProject(targetProjectId);
      return;
    }
    const base = pendingProjects.current[targetProjectId] || normalizeProject(await api.getProject(targetProjectId));
    const patch = typeof patchOrFn === 'function' ? patchOrFn(base) : patchOrFn;
    pendingProjects.current[targetProjectId] = normalizeProject({ ...base, ...patch });
    clearTimeout(saveTimers.current[targetProjectId]);
    if (flushNow) await flushProject(targetProjectId);
    else saveTimers.current[targetProjectId] = setTimeout(() => { flushProject(targetProjectId).catch(() => {}); }, 600);
  }, [flushProject, updateProject]);

  const syncServerProject = useCB((serverProject) => {
    if (!serverProject) return;
    let normalized = normalizeProject(serverProject);
    const pending = pendingProjects.current[normalized.id];
    if (pending) {
      normalized = normalizeProject(mergeProjectState(normalized, pending));
      normalized.revision = serverProject.revision;
      pendingProjects.current[normalized.id] = normalized;
    }
    if (projectRef.current?.id === normalized.id) {
      projectRef.current = normalized;
      setProject(normalized);
      setSaveStatus(pending ? 'saving' : 'saved');
    }
  }, []);

  const createServerJob = useCB(async (projectId, job) => {
    await flushProject(projectId);
    const create = async (retried = false) => {
      const current = projectRef.current?.id === projectId ? projectRef.current : normalizeProject(await api.getProject(projectId));
      try {
        const response = await api.createJob(projectId, job, current.revision);
        syncServerProject(response.project);
        return response.job;
      } catch (error) {
        if (!retried && error.status === 409) {
          const latest = normalizeProject(error.data?.project || await api.getProject(projectId));
          syncServerProject(latest);
          return create(true);
        }
        throw error;
      }
    };
    return create();
  }, [flushProject, syncServerProject]);

  const updateServerJob = useCB(async (projectId, jobId, patch) => {
    await flushProject(projectId);
    const update = async (retried = false) => {
      const current = projectRef.current?.id === projectId ? projectRef.current : normalizeProject(await api.getProject(projectId));
      try {
        const response = await api.updateJob(projectId, jobId, patch, current.revision);
        syncServerProject(response.project);
        return response;
      } catch (error) {
        if (!retried && error.status === 409) {
          syncServerProject(error.data?.project || await api.getProject(projectId));
          return update(true);
        }
        throw error;
      }
    };
    return update();
  }, [flushProject, syncServerProject]);

  const recordCompletedAsset = useCB(async (projectId, entityType, entityId, kind, url, metadata = {}) => {
    const job = await createServerJob(projectId, { type: kind, kind, entityType, entityId, status: 'processing', params: metadata });
    return updateServerJob(projectId, job.id, { status: 'completed', asset: { kind, url, ...metadata } });
  }, [createServerJob, updateServerJob]);

  useE(() => () => { Object.values(saveTimers.current).forEach(clearTimeout); }, []);

  useE(() => {
    if (!project?.id) return;
    const pendingJobs = (project.jobs || []).filter(job => job.type === 'video' && ['pending', 'processing', 'in_progress', 'running', 'queued'].includes(job.status));
    let cancelled = false; const timers = [];
    pendingJobs.forEach(job => {
      const poll = async () => {
        if (cancelled) return;
        try {
          const result = await api.getVideo(job.providerTaskId);
          if (cancelled) return;
          if (result.status === 'completed') {
            await updateServerJob(project.id, job.id, { status: 'completed', asset: { kind: 'video', url: result.url, jobId: job.id } });
            return;
          }
          if (result.status === 'failed') { await updateServerJob(project.id, job.id, { status: 'failed', error: result.error || '视频生成失败' }); return; }
          if (result.status && result.status !== job.status) { await updateServerJob(project.id, job.id, { status: result.status, progress: result.progress }); job.status = result.status; }
          timers.push(setTimeout(poll, 10000));
        } catch { timers.push(setTimeout(poll, 15000)); }
      };
      poll();
    });
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [project?.id, updateServerJob]);

  const createProject = async (name, style) => {
    const p = await api.createProject(name, style); await refreshProjects(); setNewOpen(false); loadProject(p.id); toast('项目已创建', 'ok');
  };
  const deleteProject = async (id) => { if (!confirm('确认删除该项目？')) return; clearTimeout(saveTimers.current[id]); delete pendingProjects.current[id]; await api.deleteProject(id); await refreshProjects(); if (currentId === id) { setCurrentId(null); setProject(null); projectRef.current = null; } };
  const renameProject = async (id, name) => { try { if (currentId === id) await flushProject(id); const current = currentId === id ? projectRef.current : normalizeProject(await api.getProject(id)); const saved = await api.updateProject(id, { name }, current.revision); if (currentId === id) syncServerProject(saved); await refreshProjects(); toast('已重命名', 'ok'); } catch (e) { toast(e.message, 'error'); } };
  const importProject = async (data) => { try { await api.importProject(data); toast('导入成功', 'ok'); await refreshProjects(); } catch (e) { toast(e.message, 'error'); } };
  const loadExample = async () => { try { const p = await api.importProject(EXAMPLE_PROJECT); await refreshProjects(); loadProject(p.id); toast('已加载示例', 'ok'); } catch (e) { toast(e.message, 'error'); } };

  const hasProvider = cfg?.providers?.some(p => p.apiKey && p.apiKey !== '');
  const hasChapters = (project?.chapters?.length || 0) > 0;

  // 根据分析范围计算实际内容
  const computeContent = () => {
    if (!project) return '';
    const chapters = project.chapters || [];
    if (hasChapters) {
      if (analysisSource.mode === 'chapter') {
        const ch = chapters.find(c => c.id === analysisSource.chId);
        return ch ? `## ${ch.title}\n${ch.content || ''}` : '';
      }
      if (analysisSource.mode === 'content') return project.content || '';
      // 默认 chapters
      return chapters.map(c => `## ${c.title}\n${c.content || ''}`).join('\n\n');
    }
    return project.content || '';
  };
  const analysisContent = computeContent();

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <div className="logo"><span className="logo-icon">🎬</span><span className="logo-text">短剧脚本工坊</span><span className="logo-badge">v3.1</span></div>
          {project && <span className="mobile-current-proj" onClick={() => setSidebarOpen(true)}>{project.name} ▾</span>}
        </div>
        <div className="header-right">
          {project && <span className={`save-state ${saveStatus}`}>{saveStatus === 'saving' ? '保存中' : saveStatus === 'saved' ? '已保存' : saveStatus === 'conflict' ? '保存冲突' : '保存失败'}</span>}
          <div className="model-info" onClick={() => setSettingsOpen(true)}>
            <span className={`model-dot ${hasProvider ? '' : 'off'}`}></span>
            <span className="model-name-text">{hasProvider ? (cfg.providers.find(p => p.id === cfg.activeProvider)?.name || '已配置') : '未配置模型'}</span>
            <span className="model-gear">⚙️</span>
          </div>
          <Button size="small" onClick={() => setDarkMode(d => !d)} title="切换深色模式">{darkMode ? '☀️' : '🌙'}</Button>
          <Button size="small" onClick={() => setSettingsOpen(true)}><span className="settings-text">设置</span><span className="settings-icon">⚙️</span></Button>
        </div>
        {project && (
          <div className="mobile-tabs">
            <button onClick={() => setSidebarOpen(true)}>📁 项目</button>
            <button className={mobileTab === 'input' ? 'active' : ''} onClick={() => setMobileTab('input')}>📝 输入</button>
            <button className={mobileTab === 'result' ? 'active' : ''} onClick={() => setMobileTab('result')}>🎬 结果</button>
          </div>
        )}
      </header>
      <div className="app-body">
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
        <Sidebar projects={projects} currentId={currentId} onSelect={(id) => { loadProject(id); setSidebarOpen(false); }} onNew={() => { setNewOpen(true); setSidebarOpen(false); }} onDelete={deleteProject} onImport={importProject} onRename={renameProject} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} mobileOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} />
        {loadingProject ? (
          <div className="main-area" style={{ alignItems: 'center', justifyContent: 'center', color: 'var(--ai-text-muted)' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div><div>加载项目...</div></div>
          </div>
        ) : project ? (
          <div className={`main-area mobile-tab-${mobileTab}`}>
            <InputPanel project={project} onUpdate={updateProject} styles={styles} generating={batchGenerating} hasChapters={hasChapters} hasProvider={hasProvider}
              analysisSource={analysisSource} setAnalysisSource={setAnalysisSource} analysisContent={analysisContent}
              collapsed={inputCollapsed} onToggleCollapse={() => setInputCollapsed(c => !c)}
              onAnalyzeAll={(mods, resumeRunId) => window.__analyzeAllImpl?.(mods, resumeRunId)} />
            <ResultPanel project={project} onUpdate={updateProject} styles={styles} onAnalyzeAll={(mods) => window.__analyzeAllImpl?.(mods)} analysisSource={analysisContent} analysisScope={analysisSource} streaming={streaming} streamingType={streamingType} setStreaming={setStreaming} setStreamingType={setStreamingType} projectRef={projectRef} hasProvider={hasProvider} flushProject={flushProject} createServerJob={createServerJob} updateServerJob={updateServerJob} recordCompletedAsset={recordCompletedAsset} />
          </div>
        ) : (
          <div className="main-area" style={{ alignItems: 'center', justifyContent: 'center', color: 'var(--ai-text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ai-text)', marginBottom: 8 }}>短剧脚本工坊</div>
              <div style={{ marginBottom: 16 }}>小说 / 故事 / 剧本 → AI 视频分镜脚本与设定</div>
              <Button type="primary" onClick={() => setNewOpen(true)}>+ 新建项目</Button>
              <span style={{ margin: '0 8px' }}></span>
              <Button onClick={loadExample}>加载示例</Button>
            </div>
          </div>
        )}
      </div>
      <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={createProject} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={() => api.getConfig().then(setCfg)} />
      <ResultPanelAnalyzeBridge project={project} results={project?.results || {}} characters={project?.results?.characters?.characters || []} scenes={project?.results?.scenes?.scenes || []} onUpdate={updateProject} analysisContent={analysisContent} analysisScope={analysisSource} setStreaming={setStreaming} setStreamingType={setStreamingType} setBatchGenerating={setBatchGenerating} projectRef={projectRef} />
    </div>
  );
}

// 把 analyzeAll 桥接到 window，供 InputPanel 调用
function ResultPanelAnalyzeBridge({ project, results, characters, scenes, onUpdate, analysisContent, analysisScope, setStreaming, setStreamingType, setBatchGenerating, projectRef }) {
  useE(() => {
    window.__analyzeAllImpl = async (modules, resumeRunId) => {
      if (!project) return;
      const content = analysisContent || project.content || '';
      if (!content.trim()) { toast('请先输入内容或选择章节', 'error'); return; }
      toast('开始批量分析', 'info');
      setBatchGenerating(true);
      const targetId = project.id;
      let activeRunId = resumeRunId;
      const resumedRun = (project.analysisRuns || []).find(run => run.id === resumeRunId);
      const moduleStates = { ...(resumedRun?.modules || {}) };
      try {
        await api.analyzeAll({ content, visualStyle: project.style, projectId: targetId, modules, characters, scenes, sourceMode: analysisScope?.mode, chapterId: analysisScope?.mode === 'chapter' ? analysisScope.chId : undefined, resumeRunId }, (d) => {
          if (d.status === 'run_start') activeRunId = d.runId;
          if (d.status === 'module_start') { toast(`生成 ${MODULES.find(m => m.id === d.type)?.name}...`, 'info'); setStreaming(''); setStreamingType(d.type); }
          if (d.status === 'module_streaming') { setStreaming(prev => prev + d.content); }
          if (d.status === 'module_done') {
            if (projectRef?.current?.id !== targetId) return;
            onUpdate(prev => prev.id === targetId ? (() => {
              const prevResults = prev.results || {};
              const prevType = prevResults[d.type];
              let newResult = d.result;
              if (prevType && typeof prevType === 'object' && typeof newResult === 'object' && !Array.isArray(newResult)) {
                newResult = { ...d.result, derivedFromRevision: prev.sourceRevision || 1, stale: false };
                if (prevType.panelImages && newResult.pages) newResult.panelImages = prevType.panelImages;
              }
              return normalizeProject({ ...prev, results: { ...prevResults, [d.type]: newResult } });
            })() : prev);
            setStreaming(''); setStreamingType('');
          }
          if (d.status === 'module_done' || d.status === 'module_skipped') moduleStates[d.type] = { status: 'completed' };
          if (d.status === 'module_error') { moduleStates[d.type] = { status: 'failed', error: d.error }; setStreaming(''); setStreamingType(''); toast(`模块 ${d.type} 生成失败: ${d.error}`, 'error'); }
          if (d.status === 'all_done') {
            onUpdate(prev => ({ analysisRuns: [...(prev.analysisRuns || []).filter(run => run.id !== activeRunId), { id: activeRunId, status: d.retryModules?.length ? 'failed' : 'completed', modules: moduleStates, updatedAt: new Date().toISOString() }] }));
            setBatchGenerating(false); toast(d.retryModules?.length ? `批量分析完成，${d.retryModules.length} 个模块可重试` : '批量分析完成', d.retryModules?.length ? 'error' : 'ok');
          }
        });
      } catch (e) { toast('分析失败: ' + e.message, 'error'); setStreaming(''); setStreamingType(''); }
      setBatchGenerating(false);
    };
    return () => { delete window.__analyzeAllImpl; };
  });
  return null;
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
