import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Input, Modal, Switch, Tag, Select, Card } from 'animal-island-ui';
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
  { id: 'manga', name: '漫画脚本', icon: '📖', type: 'md' },
];

function toast(msg, type) {
  const el = document.createElement('div');
  el.className = 'toast show ' + (type || '');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2200);
}
function renderMd(md) { if (!md) return ''; try { return marked.parse(md); } catch { return md; } }

// ============ Sidebar (可收起) ============
function Sidebar({ projects, currentId, onSelect, onNew, onDelete, onImport, collapsed, onToggle, mobileOpen, onCloseMobile }) {
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
            <span className="del" onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}>✕</span>
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
          <Select options={styleOptions} value={style} onChange={val => setStyle(val)} />
        </div>
      </div>
    </Modal>
  );
}

// ============ Settings Modal (直接显示+媒体provider) ============
function SettingsModal({ open, onClose, onSaved }) {
  const [cfg, setCfg] = useS(null);
  const [testing, setTesting] = useS(null);
  const [testRes, setTestRes] = useS({});

  useE(() => { if (open) api.getConfig().then(setCfg).catch(() => {}); }, [open]);
  if (!open || !cfg) return null;

  const llmProviders = cfg.providers.filter(p => p.type !== 'media');
  const mediaProviders = cfg.providers.filter(p => p.type === 'media');

  const updateProvider = (id, field, val) => setCfg(c => ({ ...c, providers: c.providers.map(p => p.id === id ? { ...p, [field]: val } : p) }));
  const addProvider = (type) => setCfg(c => ({ ...c, providers: [...c.providers, { id: 'prov_' + Date.now().toString(36), name: '新' + (type === 'media' ? '媒体' : 'LLM') + '提供商', baseUrl: '', apiKey: '', model: '', type }] }));
  const delProvider = (id) => setCfg(c => ({ ...c, providers: c.providers.filter(p => p.id !== id) }));
  const addPreset = (preset) => { if (cfg.providers.find(p => p.id === preset.id)) return; setCfg(c => ({ ...c, providers: [...c.providers, { ...preset, type: preset.type || 'llm', apiKey: '' }] })); };
  const save = async () => { await api.saveConfig(cfg); toast('配置已保存', 'ok'); onSaved?.(); onClose(); };
  const test = async (p) => {
    if (!p.baseUrl || !p.apiKey) { toast('请填写完整', 'error'); return; }
    setTesting(p.id); const r = { ...testRes };
    try { r[p.id] = await api.testConn(p.baseUrl, p.apiKey, p.model); } catch (e) { r[p.id] = { ok: false, error: e.message }; }
    setTestRes(r); setTesting(null);
  };

  const renderProvider = (p, isMedia) => (
    <div key={p.id} className={`provider-row ${(!isMedia && p.id === cfg.activeProvider) || (isMedia && p.id === cfg.mediaProvider) ? 'active' : ''}`}>
      <div className="field-mini"><label>名称</label><Input size="small" value={p.name} onChange={e => updateProvider(p.id, 'name', e.target.value)} /></div>
      <div className="field-mini" style={{ flex: 2 }}><label>Base URL</label><Input size="small" value={p.baseUrl} onChange={e => updateProvider(p.id, 'baseUrl', e.target.value)} placeholder="https://..." /></div>
      <div className="field-mini" style={{ flex: 1.5 }}><label>API Key</label><Input size="small" type="password" value={p.apiKey} onChange={e => updateProvider(p.id, 'apiKey', e.target.value)} placeholder="sk-..." /></div>
      <div className="field-mini" style={{ flex: 1 }}><label>模型</label><Input size="small" value={p.model} onChange={e => updateProvider(p.id, 'model', e.target.value)} /></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Button size="small" type={(!isMedia && p.id === cfg.activeProvider) || (isMedia && p.id === cfg.mediaProvider) ? 'primary' : 'default'} onClick={() => setCfg(c => ({ ...c, [isMedia ? 'mediaProvider' : 'activeProvider']: p.id }))}>
          {(!isMedia && p.id === cfg.activeProvider) || (isMedia && p.id === cfg.mediaProvider) ? '✓ 主' : '设为主'}
        </Button>
        <Button size="small" loading={testing === p.id} onClick={() => test(p)}>测</Button>
        <Button size="small" danger onClick={() => delProvider(p.id)}>删</Button>
      </div>
      {testRes[p.id] && <div style={{ flexBasis: '100%', fontSize: 11, color: testRes[p.id].ok ? 'var(--ai-success)' : 'var(--ai-error)' }}>{testRes[p.id].ok ? '✓ 连接成功' : '✗ ' + (testRes[p.id].error || '失败')}</div>}
    </div>
  );

  return (
    <Modal open={open} title="⚙️ 设置" typewriter={false} onClose={onClose} onOk={save} okText="保存" cancelText="取消" width={720}>
      <div className="settings-body modal-content">
        <div className="card-title">📚 LLM 文本模型</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {cfg.presets.filter(p => p.type !== 'media').map(p => (
            <Button key={p.id} size="small" onClick={() => addPreset(p)} disabled={!!cfg.providers.find(x => x.id === p.id)}>{p.name}</Button>
          ))}
        </div>
        {llmProviders.map(p => renderProvider(p, false))}
        <Button size="small" onClick={() => addProvider('llm')} style={{ marginTop: 6 }}>+ 自定义LLM</Button>

        <div className="card-title" style={{ marginTop: 18 }}>🖼️ 媒体生成（Agnes/DALL·E 生图生视频）</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {cfg.presets.filter(p => p.type === 'media').map(p => (
            <Button key={p.id} size="small" onClick={() => addPreset(p)} disabled={!!cfg.providers.find(x => x.id === p.id)}>{p.name}</Button>
          ))}
        </div>
        {mediaProviders.length === 0 && <div style={{ fontSize: 12, color: 'var(--ai-text-muted)', padding: 8 }}>未配置媒体提供商，点击上方预设添加 Agnes AI 或 DALL·E</div>}
        {mediaProviders.map(p => renderProvider(p, true))}
        <Button size="small" onClick={() => addProvider('media')} style={{ marginTop: 6 }}>+ 自定义媒体</Button>

        <p style={{ fontSize: 11, color: 'var(--ai-text-muted)', marginTop: 14 }}>Key 存储在服务端 data/config.json，前端仅显示脱敏。媒体用于 AI 生图/生视频。</p>
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
function InputPanel({ project, onUpdate, onAnalyzeAll, styles, generating, hasChapters, analysisSource, setAnalysisSource, collapsed, onToggleCollapse }) {
  const [content, setContent] = useS(project?.content || '');
  const [selectedModules, setSelectedModules] = useS(MODULES.map(m => m.id));
  const [status, setStatus] = useS('');
  const [preprocessing, setPreprocessing] = useS(false);

  useE(() => { setContent(project?.content || ''); setStatus(''); }, [project?.id]);

  const onContentChange = (v) => { setContent(v); onUpdate({ content: v }); };
  const toggleModule = (id) => setSelectedModules(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const doPreprocess = async () => {
    if (!content.trim()) { toast('请先输入内容', 'error'); return; }
    setPreprocessing(true); setStatus('预处理中...');
    try {
      await api.preprocess(content, (d) => {
        if (d.status === 'split_done') setStatus(`已分 ${d.total} 段`);
        if (d.status === 'summarizing') setStatus(`分析第 ${d.progress}/${d.total} 段...`);
        if (d.status === 'synthesizing') setStatus('综合分析中...');
        if (d.status === 'done') { setStatus('预处理完成'); toast('预处理完成', 'ok'); }
      });
    } catch (e) { setStatus('失败: ' + e.message); toast('预处理失败', 'error'); }
    setPreprocessing(false);
  };

  const chapters = project?.chapters || [];

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
        <div className="card-head"><span className="card-title">📝 源文本</span></div>
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
        <div className="gen-actions"><Button block type="primary" loading={generating} onClick={() => onAnalyzeAll(selectedModules)}>🚀 一键全部分析</Button></div>
        <div className="status-bar info">{status}</div>
      </div>
    </div>
  );
}

// ============ Result Panel ============
function ResultPanel({ project, onUpdate, styles, onAnalyzeAll, analysisSource, streaming, streamingType, setStreaming, setStreamingType }) {
  const [tab, setTab] = useS('characters');
  const [generating, setGenerating] = useS(false);
  const [progress, setProgress] = useS('');
  const [progressPct, setProgressPct] = useS(0);
  const abortRef = useR(null);

  const results = project?.results || {};
  const characters = results.characters?.characters || [];
  const scenes = results.scenes?.scenes || [];
  const shots = results.storyboard?.shots || [];

  const analyzeOne = async (type) => {
    if (!project?.content?.trim() && !project?.chapters?.length) { toast('请先输入内容或章节', 'error'); return; }
    const content = analysisSource;
    setGenerating(true); setStreaming(''); setStreamingType(''); setProgress(`正在生成${MODULES.find(m => m.id === type)?.name}，请稍候...`); setProgressPct(30);
    const ac = new AbortController(); abortRef.current = ac;
    try {
      await api.analyze({ type, content, visualStyle: project.style, projectId: project.id, characters, scenes }, (d) => {
        if (d.status === 'start') setProgressPct(40);
        if (d.status === 'streaming') { setStreamingType(d.type); setStreaming(prev => prev + d.content); setProgressPct(prev => prev < 50 ? 50 : prev); }
        if (d.status === 'done') { onUpdate({ results: { ...results, [type]: d.result } }); setStreaming(''); setStreamingType(''); setProgress(`${MODULES.find(m => m.id === type)?.name} 完成`); setProgressPct(100); toast('生成完成', 'ok'); setTimeout(() => { setProgress(''); setProgressPct(0); }, 1500); }
        if (d.status === 'error') { setProgress('错误: ' + d.error); toast('生成失败', 'error'); }
      }, ac.signal);
    } catch (e) { if (e.name !== 'AbortError') { setProgress('失败: ' + e.message); toast('生成失败', 'error'); } }
    setGenerating(false);
  };

  useE(() => { window.__analyzeOne = analyzeOne; }, [project, results, characters, scenes]);

  const tabs = [
    { id: 'characters', name: '🎭 角色', count: characters.length },
    { id: 'scenes', name: '🏞️ 场景', count: scenes.length },
    { id: 'storyboard', name: '🎬 分镜', count: shots.length },
    ...MODULES.filter(m => m.type === 'md').map(m => ({ id: m.id, name: `${m.icon} ${m.name}` })),
    { id: 'knowledge', name: '📚 知识库' },
    { id: 'media', name: '🖼️ 媒体' },
    { id: 'consistency', name: '🔍 一致性' },
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
          {tab !== 'media' && tab !== 'knowledge' && tab !== 'consistency' && (
            <Button size="small" type="primary" loading={generating} onClick={() => analyzeOne(tab)}>{generating ? '生成中' : '生成'}</Button>
          )}
          <a href={api.exportMd(project?.id)} download><Button size="small">导出MD</Button></a>
        </div>
      </div>
      <div className="result-content">
        {generating && (
          <div style={{ marginBottom: 12, padding: 10, background: 'var(--ai-primary-bg)', borderRadius: 8, fontSize: 13 }}>
            {progress}
            {progressPct > 0 && <div className="progress-line"><div className="fill" style={{ width: progressPct + '%' }} /></div>}
          </div>
        )}
        {tab === 'characters' && <CharactersView characters={characters} onUpdate={(chars) => onUpdate({ results: { ...results, characters: { characters: chars } } })} />}
        {tab === 'scenes' && <ScenesView scenes={scenes} onUpdate={(sc) => onUpdate({ results: { ...results, scenes: { scenes: sc } } })} />}
        {tab === 'storyboard' && <ShotView shots={shots} characters={characters} scenes={scenes} onUpdate={(sh) => onUpdate({ results: { ...results, storyboard: { shots: sh } } })} />}
        {MODULES.filter(m => m.type === 'md').map(m => tab === m.id && <MdView key={m.id} content={streamingType === m.id ? streaming : results[m.id]} emptyTip={`点击右上方"生成"开始`} />)}
        {tab === 'knowledge' && <KnowledgeView project={project} onUpdate={onUpdate} />}
        {tab === 'media' && <MediaGen styles={styles} project={project} characters={characters} scenes={scenes} />}
        {tab === 'consistency' && <ConsistencyView project={project} />}
      </div>
    </div>
  );
}

// ============ Characters View (4视图横向排列单图) ============
function CharactersView({ characters, onUpdate }) {
  if (!characters.length) return <Empty tip="生成角色设定后将显示，每角色含一张1x4横向排列设定图Prompt" />;
  const baseFields = [['role','叙事功能'],['gender','性别'],['age','年龄'],['appearance','外貌'],['personality','性格'],['costume','服装道具'],['voiceStyle','语言风格'],['relationships','人物关系'],['arc','角色弧光'],['castingReference','选角参考']];
  const updateField = (i, k, v) => { const c = [...characters]; c[i] = { ...c[i], [k]: v }; onUpdate(c); };
  return (
    <div className="grid-cards">
      {characters.map((c, i) => (
        <div key={i} className="item-card">
          <div className="item-head">
            <input className="item-name" value={c.name} onChange={e => updateField(i, 'name', e.target.value)} />
            <Button size="small" danger onClick={() => onUpdate(characters.filter((_, x) => x !== i))}>删</Button>
          </div>
          {baseFields.map(([k, label]) => (
            <div key={k} className="field"><label>{label}</label><input value={c[k] || ''} onChange={e => updateField(i, k, e.target.value)} /></div>
          ))}
          <div className="view-prompts" style={{ borderTop: '1px dashed var(--ai-border)', paddingTop: 8, marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-text)', marginBottom: 6 }}>📐 角色设定图 Prompt（单图1x4横向排列：面部特写/正面/侧面/背面全身）</div>
            <div className="field"><label>设定图 Prompt（中文）</label><textarea className="prompt" value={c.imagePromptZh || ''} onChange={e => updateField(i, 'imagePromptZh', e.target.value)} style={{ minHeight: 60 }} /></div>
            <div className="field"><label>设定图 Prompt（English）</label><textarea className="prompt" value={c.imagePromptEn || ''} onChange={e => updateField(i, 'imagePromptEn', e.target.value)} style={{ minHeight: 60 }} /></div>
          </div>
        </div>
      ))}
      <Button onClick={() => onUpdate([...characters, { name: '新角色' }])}>+ 新增角色</Button>
    </div>
  );
}

// ============ Scenes View ============
function ScenesView({ scenes, onUpdate }) {
  if (!scenes.length) return <Empty tip="生成场景设定后将显示在此" />;
  const fields = [['environment','环境'],['mood','氛围'],['lighting','光照'],['timeOfDay','时间段'],['narrativeFunction','叙事功能'],['keyProps','关键道具'],['soundDesign','声音设计'],['colorPalette','色调建议'],['compositionHint','构图建议'],['imagePromptZh','场景图Prompt(中)'],['imagePromptEn','场景图Prompt(英)']];
  const updateField = (i, k, v) => { const s = [...scenes]; s[i] = { ...s[i], [k]: v }; onUpdate(s); };
  return (
    <div className="grid-cards">
      {scenes.map((s, i) => (
        <div key={i} className="item-card">
          <div className="item-head">
            <input className="item-name" value={s.name} onChange={e => updateField(i, 'name', e.target.value)} />
            <Button size="small" danger onClick={() => onUpdate(scenes.filter((_, x) => x !== i))}>删</Button>
          </div>
          {fields.map(([k, label]) => (
            <div key={k} className="field"><label>{label}</label>{k.startsWith('imagePrompt') ? <textarea className="prompt" value={s[k] || ''} onChange={e => updateField(i, k, e.target.value)} /> : <input value={s[k] || ''} onChange={e => updateField(i, k, e.target.value)} />}</div>
          ))}
        </div>
      ))}
      <Button onClick={() => onUpdate([...scenes, { name: '新场景' }])}>+ 新增场景</Button>
    </div>
  );
}

// ============ Shot View ============
function ShotView({ shots, characters, scenes, onUpdate }) {
  const [view, setView] = useS('table');
  const [filterEp, setFilterEp] = useS('');
  const [filterScene, setFilterScene] = useS('');
  if (!shots.length) return <Empty tip="先生成角色与场景设定，再点击右上方生成按钮" />;
  const eps = [...new Set(shots.map(s => s.episode))];
  let filtered = shots;
  if (filterEp) filtered = filtered.filter(s => s.episode == filterEp);
  if (filterScene) filtered = filtered.filter(s => s.sceneName === filterScene);
  const charName = (names) => (names || []).join('、');
  const update = (idx, k, v) => { const sh = [...shots]; const i = shots.indexOf(filtered[idx]); sh[i] = { ...sh[i], [k]: v }; onUpdate(sh); };
  const moveShot = (idx, dir) => { const i = shots.indexOf(filtered[idx]); const j = i + dir; if (j < 0 || j >= shots.length) return; [shots[i], shots[j]] = [shots[j], shots[i]]; onUpdate([...shots]); };

  return (
    <div>
      <div className="shot-toolbar">
        <select value={filterEp} onChange={e => setFilterEp(e.target.value)}><option value="">全部集</option>{eps.map(e => <option key={e} value={e}>第{e}集</option>)}</select>
        <select value={filterScene} onChange={e => setFilterScene(e.target.value)}><option value="">全部场景</option>{scenes.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}</select>
        <div className="seg"><button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>表格</button><button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}>网格</button></div>
        <Button size="small" onClick={() => onUpdate([...shots, { episode: 1, sceneNo: 1, shotNo: shots.length + 1, shotType: '中景', duration: 4, characterNames: [], sceneName: scenes[0]?.name || '' }])}>+ 新增分镜</Button>
      </div>
      {view === 'table' ? (
        <table className="shots"><thead><tr>
          <th className="num">集</th><th className="num">场</th><th className="num">镜</th><th>景别</th><th>画面</th><th>对白</th><th>动作</th><th>声音</th><th>转场</th><th className="num">秒</th><th>角色</th><th>场景</th><th className="prompt-cell">Prompt(中)</th><th className="prompt-cell">Prompt(英)</th><th></th>
        </tr></thead><tbody>
          {filtered.map((s, idx) => (
            <tr key={idx}>
              <td className="num">{s.episode}</td><td className="num">{s.sceneNo}</td><td className="num">{s.shotNo}</td>
              <td><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(idx, 'shotType', e.target.textContent)}>{s.shotType}</div></td>
              <td><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(idx, 'visual', e.target.textContent)}>{s.visual}</div></td>
              <td><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(idx, 'dialogue', e.target.textContent)}>{s.dialogue}</div></td>
              <td><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(idx, 'action', e.target.textContent)}>{s.action}</div></td>
              <td><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(idx, 'soundDesign', e.target.textContent)}>{s.soundDesign}</div></td>
              <td><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(idx, 'transition', e.target.textContent)}>{s.transition}</div></td>
              <td className="num"><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(idx, 'duration', parseInt(e.target.textContent) || 0)}>{s.duration}</div></td>
              <td>{charName(s.characterNames)}</td><td>{s.sceneName}</td>
              <td className="prompt-cell"><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(idx, 'promptZh', e.target.textContent)}>{s.promptZh}</div></td>
              <td className="prompt-cell"><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(idx, 'promptEn', e.target.textContent)}>{s.promptEn}</div></td>
              <td>
                <button className="btn sm ghost" title="复制EN Prompt" onClick={() => { navigator.clipboard?.writeText(s.promptEn); toast('已复制EN', 'ok'); }}>复制</button>
                <button className="btn sm ghost" onClick={() => moveShot(idx, -1)}>↑</button>
                <button className="btn sm ghost" onClick={() => moveShot(idx, 1)}>↓</button>
                <button className="btn sm ghost danger" onClick={() => onUpdate(shots.filter((_, x) => x !== shots.indexOf(s)))}>删</button>
              </td>
            </tr>
          ))}
        </tbody></table>
      ) : (
        <div className="shot-grid">
          {filtered.map((s, idx) => (
            <div key={idx} className="shot-tile">
              <div className="tile-head"><span>第{s.episode}集·{s.sceneNo}场·{s.shotNo}镜</span><span className="badge">{s.shotType} {s.duration}s</span></div>
              <div className="tile-visual">{s.visual}</div>
              {s.dialogue && <div style={{ fontSize: 12, color: 'var(--ai-text-muted)' }}>「{s.dialogue}」</div>}
              {s.soundDesign && <div style={{ fontSize: 11, color: 'var(--ai-text-muted)' }}>🔊 {s.soundDesign}</div>}
              {s.transition && <div style={{ fontSize: 11, color: 'var(--ai-text-muted)' }}>→ {s.transition}</div>}
              <div className="tile-prompt"><b>中</b>：{s.promptZh}<br /><b>EN</b>：{s.promptEn}</div>
              <div className="tile-actions">
                <Button size="small" onClick={() => { navigator.clipboard?.writeText(s.promptEn); toast('已复制EN', 'ok'); }}>复制EN</Button>
                <Button size="small" onClick={() => moveShot(idx, -1)}>↑</Button>
                <Button size="small" onClick={() => moveShot(idx, 1)}>↓</Button>
                <Button size="small" danger onClick={() => onUpdate(shots.filter((_, x) => x !== shots.indexOf(s)))}>删</Button>
              </div>
            </div>
          ))}
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

// ============ Media Gen (角色1x4横向排列快速生图) ============
function MediaGen({ styles, project, characters, scenes }) {
  const [prompt, setPrompt] = useS('');
  const [negPrompt, setNegPrompt] = useS('');
  const [size, setSize] = useS('1024x1024');
  const [gen, setGen] = useS(false);
  const [imgUrl, setImgUrl] = useS(null);
  const [err, setErr] = useS('');

  const generate = async () => {
    if (!prompt) { toast('请输入Prompt', 'error'); return; }
    setGen(true); setErr(''); setImgUrl(null);
    try { const r = await api.genImage(prompt, negPrompt, size, project?.style); if (r.ok) { setImgUrl(r.url); toast('生成成功', 'ok'); } else { setErr(r.error); toast('生成失败', 'error'); } }
    catch (e) { setErr(e.message); toast('生成失败', 'error'); }
    setGen(false);
  };
  const useCharPrompt = (p, label) => { setPrompt(p || ''); toast('已填入' + label, 'ok'); };

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 10 }}>🖼️ AI 生图</div>
        <div className="ai-field"><label>Prompt（自动追加当前视觉风格后缀）</label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="描述要生成的画面..." style={{ minHeight: 80 }} /></div>
        <div className="form-row">
          <div className="ai-field"><label>Negative Prompt</label><input value={negPrompt} onChange={e => setNegPrompt(e.target.value)} /></div>
          <div className="ai-field"><label>尺寸</label><select value={size} onChange={e => setSize(e.target.value)}><option>1024x1024</option><option>1024x768</option><option>768x1024</option></select></div>
        </div>
        <Button type="primary" loading={gen} onClick={generate} block>生成图片</Button>
        {err && <div className="status-bar error">{err}</div>}
        {imgUrl && <img className="img-preview" src={imgUrl} alt="生成结果" />}
      </div>
      <div className="card-title">⚡ 快速填入（点击复制角色1x4横向排列/场景Prompt到上方）</div>
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
        </div>
      )}
    </div>
  );
}

function ConsistencyView({ project }) {
  const [report, setReport] = useS('');
  const [running, setRunning] = useS(false);
  const run = async () => {
    if (!project.results || Object.keys(project.results).length === 0) { toast('请先生成分析结果', 'error'); return; }
    setRunning(true); setReport('');
    try { await api.checkConsistency(project.results, project.knowledge, (d) => { if (d.content) setReport(p => p + d.content); if (d.error) setReport(p => p + '\n错误: ' + d.error); }); toast('检查完成', 'ok'); }
    catch (e) { toast('检查失败', 'error'); }
    setRunning(false);
  };
  return <div><Button type="primary" loading={running} onClick={run} style={{ marginBottom: 12 }}>🔍 检查一致性</Button>{report ? <div className="md-body" dangerouslySetInnerHTML={{ __html: renderMd(report) }} /> : <Empty tip="点击上方按钮检查各模块间角色/场景/时间线一致性" />}</div>;
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
  const [mobileTab, setMobileTab] = useS('input');  // 'input' | 'result'
  const [sidebarOpen, setSidebarOpen] = useS(false); // 手机端 sidebar 抽屉
  const [cfg, setCfg] = useS(null);
  const [analysisSource, setAnalysisSource] = useS({ mode: 'chapters', chId: '' });
  const [streaming, setStreaming] = useS('');
  const [streamingType, setStreamingType] = useS('');

  const refreshProjects = useCB(async () => { try { const r = await api.listProjects(); setProjects(r.items || []); } catch {} }, []);

  useE(() => { refreshProjects(); api.styles().then(s => setStyles(s)).catch(() => {}); api.getConfig().then(setCfg).catch(() => {}); }, []);
  useE(() => { window.__analyzeAll = (mods) => window.__analyzeAllImpl?.(mods); });

  const loadProject = async (id) => { if (!id) { setProject(null); return; } try { setProject(await api.getProject(id)); setCurrentId(id); } catch (e) { toast(e.message, 'error'); } };

  const updateProject = useCB(async (patch) => {
    if (!project) return;
    const updated = { ...project, ...patch }; setProject(updated);
    clearTimeout(window.__saveTimer);
    window.__saveTimer = setTimeout(async () => { try { await api.updateProject(project.id, patch); refreshProjects(); } catch (e) { console.warn('save', e); } }, 600);
  }, [project]);

  const createProject = async (name, style) => {
    const p = await api.createProject(name, style); await refreshProjects(); setNewOpen(false); loadProject(p.id); toast('项目已创建', 'ok');
  };
  const deleteProject = async (id) => { if (!confirm('确认删除该项目？')) return; await api.deleteProject(id); await refreshProjects(); if (currentId === id) { setCurrentId(null); setProject(null); } };
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
          <div className="model-info" onClick={() => setSettingsOpen(true)}>
            <span className={`model-dot ${hasProvider ? '' : 'off'}`}></span>
            <span className="model-name-text">{hasProvider ? (cfg.providers.find(p => p.id === cfg.activeProvider)?.name || '已配置') : '未配置模型'}</span>
            <span className="model-gear">⚙️</span>
          </div>
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
        <Sidebar projects={projects} currentId={currentId} onSelect={(id) => { loadProject(id); setSidebarOpen(false); }} onNew={() => { setNewOpen(true); setSidebarOpen(false); }} onDelete={deleteProject} onImport={importProject} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} mobileOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} />
        {project ? (
          <div className={`main-area mobile-tab-${mobileTab}`}>
            <InputPanel project={project} onUpdate={updateProject} styles={styles} generating={false} hasChapters={hasChapters}
              analysisSource={analysisSource} setAnalysisSource={setAnalysisSource}
              collapsed={inputCollapsed} onToggleCollapse={() => setInputCollapsed(c => !c)}
              onAnalyzeAll={(mods) => window.__analyzeAllImpl?.(mods)} />
            <ResultPanel project={project} onUpdate={updateProject} styles={styles} onAnalyzeAll={(mods) => window.__analyzeAllImpl?.(mods)} analysisSource={analysisContent} streaming={streaming} streamingType={streamingType} setStreaming={setStreaming} setStreamingType={setStreamingType} />
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
      <ResultPanelAnalyzeBridge project={project} results={project?.results || {}} characters={project?.results?.characters?.characters || []} scenes={project?.results?.scenes?.scenes || []} onUpdate={updateProject} analysisContent={analysisContent} setStreaming={setStreaming} setStreamingType={setStreamingType} />
    </div>
  );
}

// 把 analyzeAll 桥接到 window，供 InputPanel 调用
function ResultPanelAnalyzeBridge({ project, results, characters, scenes, onUpdate, analysisContent, setStreaming, setStreamingType }) {
  useE(() => {
    window.__analyzeAllImpl = async (modules) => {
      if (!project) return;
      const content = analysisContent || project.content || '';
      if (!content.trim()) { toast('请先输入内容或选择章节', 'error'); return; }
      toast('开始批量分析', 'info');
      try {
        await api.analyzeAll({ content, visualStyle: project.style, projectId: project.id, modules }, (d) => {
          if (d.status === 'module_start') { toast(`生成 ${MODULES.find(m => m.id === d.type)?.name}...`, 'info'); setStreaming(''); setStreamingType(d.type); }
          if (d.status === 'module_streaming') { setStreaming(prev => prev + d.content); }
          if (d.status === 'module_done') { onUpdate({ results: { ...results, [d.type]: d.result } }); setStreaming(''); setStreamingType(''); }
          if (d.status === 'all_done') toast('批量分析完成', 'ok');
        });
      } catch (e) { toast('分析失败: ' + e.message, 'error'); }
    };
  });
  return null;
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
