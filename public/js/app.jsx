import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Input, Modal, Switch, Tag } from 'animal-island-ui';
import { api } from './api.js';
import { EXAMPLE_PROJECT } from './example.js';

const { useState: useS, useEffect: useE, useRef: useR, useCallback: useCB } = React;

// 分析模块定义
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

function renderMd(md) {
  if (!md) return '';
  try { return marked.parse(md); } catch { return md; }
}

// ============ Sidebar ============
function Sidebar({ projects, currentId, onSelect, onNew, onDelete, onImport }) {
  const fileRef = useR(null);
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <Button size="small" type="primary" block onClick={onNew}>+ 新建项目</Button>
        <Button size="small" onClick={() => fileRef.current?.click()}>导入</Button>
        <input ref={fileRef} type="file" accept=".json" hidden onChange={async (e) => {
          const f = e.target.files[0]; if (!f) return;
          const text = await f.text();
          try { onImport(JSON.parse(text)); } catch { toast('导入失败', 'error'); }
          e.target.value = '';
        }} />
      </div>
      <div className="sidebar-list">
        {projects.length === 0 && <div style={{ padding: 16, color: 'var(--ai-text-muted)', fontSize: 12, textAlign: 'center' }}>暂无项目</div>}
        {projects.map(p => (
          <div key={p.id} className={`proj-item ${p.id === currentId ? 'active' : ''}`} onClick={() => onSelect(p.id)}>
            <span>{p.name}</span>
            <span className="del" onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}>✕</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ============ Settings Modal ============
function SettingsModal({ open, onClose }) {
  const [cfg, setCfg] = useS(null);
  const [testing, setTesting] = useS(false);
  const [testRes, setTestRes] = useS(null);

  useE(() => { if (open) api.getConfig().then(setCfg).catch(() => {}); }, [open]);

  if (!open || !cfg) return null;

  const updateProvider = (id, field, val) => {
    setCfg(c => ({ ...c, providers: c.providers.map(p => p.id === id ? { ...p, [field]: val } : p) }));
  };
  const addProvider = () => {
    const id = 'prov_' + Date.now().toString(36);
    setCfg(c => ({ ...c, providers: [...c.providers, { id, name: '新提供商', baseUrl: '', apiKey: '', model: '', type: 'llm' }] }));
  };
  const delProvider = (id) => setCfg(c => ({ ...c, providers: c.providers.filter(p => p.id !== id) }));
  const addPreset = (preset) => {
    if (cfg.providers.find(p => p.id === preset.id)) return;
    setCfg(c => ({ ...c, providers: [...c.providers, { ...preset, type: 'llm', apiKey: '' }] }));
  };
  const save = async () => {
    await api.saveConfig(cfg);
    toast('配置已保存', 'ok');
    onClose();
  };
  const test = async () => {
    const p = cfg.providers.find(x => x.id === cfg.activeProvider) || cfg.providers[0];
    if (!p || !p.baseUrl || !p.apiKey) { toast('请填写完整', 'error'); return; }
    setTesting(true); setTestRes(null);
    try {
      const r = await api.testConn(p.baseUrl, p.apiKey, p.model);
      setTestRes(r);
    } catch (e) { setTestRes({ ok: false, error: e.message }); }
    setTesting(false);
  };

  return (
    <Modal open={open} title="⚙️ 设置 — LLM 与媒体生成" onClose={onClose} onOk={save} okText="保存配置" cancelText="取消" width={680}>
      <div className="settings-body">
        <div style={{ marginBottom: 14 }}>
          <div className="card-title" style={{ marginBottom: 8 }}>预设提供商（点击添加）</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {cfg.presets.map(p => (
              <Button key={p.id} size="small" onClick={() => addPreset(p)} disabled={!!cfg.providers.find(x => x.id === p.id)}>{p.name}</Button>
            ))}
          </div>
        </div>

        <div className="card-title" style={{ marginBottom: 8 }}>已配置提供商</div>
        {cfg.providers.map(p => (
          <div key={p.id} className={`provider-row ${p.id === cfg.activeProvider ? 'active' : ''}`}>
            <div className="field-mini">
              <label>名称</label>
              <input value={p.name} onChange={e => updateProvider(p.id, 'name', e.target.value)} />
            </div>
            <div className="field-mini" style={{ flex: 2 }}>
              <label>Base URL</label>
              <input value={p.baseUrl} onChange={e => updateProvider(p.id, 'baseUrl', e.target.value)} placeholder="https://api.openai.com/v1" />
            </div>
            <div className="field-mini" style={{ flex: 1.5 }}>
              <label>API Key</label>
              <input type="password" value={p.apiKey} onChange={e => updateProvider(p.id, 'apiKey', e.target.value)} placeholder="sk-..." />
            </div>
            <div className="field-mini" style={{ flex: 1 }}>
              <label>模型</label>
              <input value={p.model} onChange={e => updateProvider(p.id, 'model', e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Button size="small" type={p.id === cfg.activeProvider ? 'primary' : 'default'} onClick={() => setCfg(c => ({ ...c, activeProvider: p.id }))}>
                {p.id === cfg.activeProvider ? '✓ 主' : '设为主'}
              </Button>
              <Button size="small" danger onClick={() => delProvider(p.id)}>删</Button>
            </div>
          </div>
        ))}
        <Button size="small" onClick={addProvider} style={{ marginTop: 6 }}>+ 自定义提供商</Button>

        <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button type="primary" loading={testing} onClick={test}>测试连接</Button>
          {testRes && (
            <span style={{ fontSize: 12, color: testRes.ok ? 'var(--ai-success)' : 'var(--ai-error)' }}>
              {testRes.ok ? '✓ 连接成功' : '✗ ' + (testRes.error || '失败')}
            </span>
          )}
        </div>
        <p style={{ fontSize: 11, color: 'var(--ai-text-muted)', marginTop: 12 }}>
          提示：API Key 存储在服务端 data/config.json，前端仅显示脱敏。图像/视频生成需配置含 Agnes 的提供商。
        </p>
      </div>
    </Modal>
  );
}

// ============ Input Panel ============
function InputPanel({ project, onUpdate, onPreprocess, onAnalyze, onAnalyzeAll, styles, generating }) {
  const [content, setContent] = useS(project?.content || '');
  const [selectedModules, setSelectedModules] = useS(MODULES.map(m => m.id));
  const [importOpen, setImportOpen] = useS(false);
  const [importText, setImportText] = useS('');
  const [preprocessData, setPreprocessData] = useS(null);
  const [preprocessing, setPreprocessing] = useS(false);
  const [status, setStatus] = useS('');
  const abortRef = useR(null);

  useE(() => { setContent(project?.content || ''); setPreprocessData(null); }, [project?.id]);

  const onContentChange = (v) => { setContent(v); onUpdate({ content: v }); };

  const toggleModule = (id) => {
    setSelectedModules(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const doPreprocess = async () => {
    if (!content.trim()) { toast('请先输入内容', 'error'); return; }
    setPreprocessing(true); setStatus('预处理中...'); setPreprocessData(null);
    try {
      await api.preprocess(content, (d) => {
        if (d.status === 'split_done') setStatus(`已分 ${d.total} 段`);
        if (d.status === 'summarizing') setStatus(`分析第 ${d.progress}/${d.total} 段...`);
        if (d.status === 'synthesizing') setStatus('综合分析中...');
        if (d.status === 'done') { setPreprocessData(d); setStatus('预处理完成'); toast('预处理完成', 'ok'); }
        if (d.status === 'segment_done') setPreprocessData(prev => ({ ...prev, segments: [...(prev?.segments || []), d.data] }));
      });
    } catch (e) { setStatus('预处理失败: ' + e.message); toast('预处理失败', 'error'); }
    setPreprocessing(false);
  };

  const doImportChapters = async () => {
    if (!importText.trim()) return;
    try {
      const r = await api.importChapters(project.id, importText);
      toast(`已导入 ${r.imported} 章`, 'ok');
      setImportOpen(false); setImportText('');
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div className="input-panel">
      <div className="card">
        <div className="card-head">
          <span className="card-title">📝 源文本</span>
          <div className="card-actions">
            <Button size="small" onClick={() => setImportOpen(true)}>分章导入</Button>
            <Button size="small" onClick={() => onAnalyze && onLoadExample()}>加载示例</Button>
          </div>
        </div>
        <textarea id="sourceText" value={content} onChange={e => onContentChange(e.target.value)} placeholder="粘贴小说、故事或剧本文本..." spellCheck={false} />
        <div className="char-count">{content.length} 字</div>
      </div>

      <div className="card">
        <div className="card-head"><span className="card-title">🎨 视觉风格</span></div>
        <div className="style-grid">
          {styles.map(s => (
            <div key={s.key} className={`style-chip ${project?.style === s.key ? 'active' : ''}`} onClick={() => onUpdate({ style: s.key })} title={s.desc}>
              {s.label}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><span className="card-title">📋 分析模块</span></div>
        <div className="module-grid">
          {MODULES.map(m => (
            <div key={m.id} className={`module-chip ${selectedModules.includes(m.id) ? 'active' : ''}`} onClick={() => toggleModule(m.id)}>
              <span className="icon">{m.icon}</span>
              {m.name}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><span className="card-title">⚡ 操作</span></div>
        <div className="gen-actions">
          <Button block loading={preprocessing} onClick={doPreprocess}>🔍 预处理</Button>
        </div>
        <div className="gen-actions">
          <Button block type="primary" loading={generating} onClick={() => onAnalyzeAll(selectedModules)}>🚀 一键全部分析</Button>
        </div>
        <div className="status-bar info">{status}</div>
        {preprocessData?.global && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ai-text-secondary)', background: 'var(--ai-bg)', padding: 10, borderRadius: 8 }}>
            <b style={{ color: 'var(--ai-text)' }}>{preprocessData.global.title || '未命名'}</b> · {preprocessData.global.genre || ''}
            {preprocessData.global.characters?.slice(0, 5).map((c, i) => <Tag key={i} size="small" style={{ marginLeft: 4 }}>{c.name}</Tag>)}
          </div>
        )}
      </div>

      <Modal open={importOpen} title="分章导入" onClose={() => setImportOpen(false)} onOk={doImportChapters} okText="导入" cancelText="取消">
        <p style={{ fontSize: 12, color: 'var(--ai-text-muted)', marginBottom: 8 }}>粘贴全文，系统按"第X章/Chapter N"自动分章。</p>
        <textarea value={importText} onChange={e => setImportText(e.target.value)} style={{ width: '100%', minHeight: 200, border: '2px solid var(--ai-border)', borderRadius: 8, padding: 10, fontSize: 13, fontFamily: 'inherit' }} />
      </Modal>
    </div>
  );
}

function onLoadExample() { window.__loadExample?.(); }

// ============ Result Panel ============
function ResultPanel({ project, onUpdate, styles }) {
  const [tab, setTab] = useS('characters');
  const [streaming, setStreaming] = useS('');
  const [generating, setGenerating] = useS(false);
  const [progress, setProgress] = useS('');
  const abortRef = useR(null);

  const results = project?.results || {};
  const characters = results.characters?.characters || [];
  const scenes = results.scenes?.scenes || [];
  const shots = results.storyboard?.shots || [];

  const analyzeOne = async (type) => {
    if (!project?.content?.trim()) { toast('请先输入源文本', 'error'); return; }
    setGenerating(true); setStreaming(''); setProgress(`正在生成${MODULES.find(m => m.id === type)?.name}...`);
    const ac = new AbortController(); abortRef.current = ac;
    try {
      let mdBuf = '';
      await api.analyze({
        type, content: project.content, visualStyle: project.style,
        projectId: project.id, characters, scenes,
      }, (d) => {
        if (d.status === 'chunk') { mdBuf += d.content; setStreaming(mdBuf); }
        if (d.status === 'done') {
          onUpdate({ results: { ...results, [type]: d.result } });
          setStreaming(''); setProgress(`${MODULES.find(m => m.id === type)?.name} 完成`); toast('生成完成', 'ok');
        }
        if (d.status === 'error') { setProgress('错误: ' + d.error); toast('生成失败', 'error'); }
      }, ac.signal);
    } catch (e) { if (e.name !== 'AbortError') { setProgress('失败: ' + e.message); toast('生成失败', 'error'); } }
    setGenerating(false);
  };

  const analyzeAll = async (modules) => {
    if (!project?.content?.trim()) { toast('请先输入源文本', 'error'); return; }
    setGenerating(true); setStreaming(''); setProgress('开始批量分析...');
    const ac = new AbortController(); abortRef.current = ac;
    try {
      await api.analyzeAll({
        content: project.content, visualStyle: project.style,
        projectId: project.id, modules,
      }, (d) => {
        if (d.status === 'module_start') setProgress(`正在生成 ${MODULES.find(m => m.id === d.type)?.name}...`);
        if (d.status === 'module_chunk') setStreaming(prev => prev + d.content);
        if (d.status === 'module_done') {
          const newResults = { ...results, [d.type]: d.result };
          onUpdate({ results: newResults });
          setStreaming('');
        }
        if (d.status === 'module_error') setProgress(`模块 ${d.type} 失败: ${d.error}`);
        if (d.status === 'all_done') { setProgress('全部完成'); toast('批量分析完成', 'ok'); }
      }, ac.signal);
    } catch (e) { if (e.name !== 'AbortError') { setProgress('失败: ' + e.message); toast('生成失败', 'error'); } }
    setGenerating(false);
  };

  // 暴露给 InputPanel
  useE(() => { window.__analyzeAll = analyzeAll; window.__analyzeOne = analyzeOne; });

  const tabs = [
    { id: 'characters', name: '🎭 角色', count: characters.length },
    { id: 'scenes', name: '🏞️ 场景', count: scenes.length },
    { id: 'storyboard', name: '🎬 分镜', count: shots.length },
    ...MODULES.filter(m => m.type === 'md').map(m => ({ id: m.id, name: `${m.icon} ${m.name}` })),
    { id: 'knowledge', name: '📚 知识库' },
    { id: 'media', name: '🖼️ 媒体生成' },
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
            <Button size="small" type="primary" loading={generating} onClick={() => analyzeOne(tab)}>
              {generating ? '生成中' : `生成${MODULES.find(m => m.id === tab)?.name || ''}`}
            </Button>
          )}
          <a href={api.exportMd(project?.id)} download><Button size="small">导出MD</Button></a>
        </div>
      </div>
      <div className="result-content">
        {(generating || streaming) && (
          <div style={{ marginBottom: 12, padding: 10, background: 'var(--ai-primary-bg)', borderRadius: 8, fontSize: 13 }}>
            {progress}
            {streaming && <div className="md-body" style={{ marginTop: 8, maxHeight: 300, overflow: 'auto' }} dangerouslySetInnerHTML={{ __html: renderMd(streaming) }} />}
          </div>
        )}
        {tab === 'characters' && <CharactersView characters={characters} onUpdate={(chars) => onUpdate({ results: { ...results, characters: { characters: chars } } })} />}
        {tab === 'scenes' && <ScenesView scenes={scenes} onUpdate={(sc) => onUpdate({ results: { ...results, scenes: { scenes: sc } } })} />}
        {tab === 'storyboard' && <ShotView shots={shots} characters={characters} scenes={scenes} onUpdate={(sh) => onUpdate({ results: { ...results, storyboard: { shots: sh } } })} />}
        {MODULES.filter(m => m.type === 'md').map(m => tab === m.id && (
          <MdView key={m.id} content={results[m.id]} emptyTip={`点击右上方"生成${m.name}"开始`} />
        ))}
        {tab === 'knowledge' && <KnowledgeView project={project} onUpdate={onUpdate} />}
        {tab === 'media' && <MediaGen styles={styles} project={project} />}
        {tab === 'consistency' && <ConsistencyView project={project} />}
      </div>
    </div>
  );
}

// ============ Characters View ============
function CharactersView({ characters, onUpdate }) {
  if (!characters.length) return <Empty tip="生成角色设定后将显示在此" />;
  const fields = [['role','叙事功能'],['gender','性别'],['age','年龄'],['appearance','外貌'],['personality','性格'],['costume','服装道具'],['arc','角色弧光'],['imagePromptZh','形象图Prompt(中)'],['imagePromptEn','形象图Prompt(英)']];
  const updateField = (i, k, v) => { const c = [...characters]; c[i] = { ...c[i], [k]: v }; onUpdate(c); };
  return (
    <div className="grid-cards">
      {characters.map((c, i) => (
        <div key={i} className="item-card">
          <div className="item-head">
            <input className="item-name" value={c.name} onChange={e => updateField(i, 'name', e.target.value)} />
            <Button size="small" danger onClick={() => onUpdate(characters.filter((_, x) => x !== i))}>删</Button>
          </div>
          {fields.map(([k, label]) => (
            <div key={k} className="field">
              <label>{label}</label>
              {k.startsWith('imagePrompt') ? <textarea className="prompt" value={c[k] || ''} onChange={e => updateField(i, k, e.target.value)} /> : <input value={c[k] || ''} onChange={e => updateField(i, k, e.target.value)} />}
            </div>
          ))}
        </div>
      ))}
      <Button onClick={() => onUpdate([...characters, { name: '新角色' }])}>+ 新增角色</Button>
    </div>
  );
}

// ============ Scenes View ============
function ScenesView({ scenes, onUpdate }) {
  if (!scenes.length) return <Empty tip="生成场景设定后将显示在此" />;
  const fields = [['environment','环境'],['mood','氛围'],['lighting','光照'],['timeOfDay','时间段'],['narrativeFunction','叙事功能'],['keyProps','关键道具'],['imagePromptZh','场景图Prompt(中)'],['imagePromptEn','场景图Prompt(英)']];
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
            <div key={k} className="field">
              <label>{label}</label>
              {k.startsWith('imagePrompt') ? <textarea className="prompt" value={s[k] || ''} onChange={e => updateField(i, k, e.target.value)} /> : <input value={s[k] || ''} onChange={e => updateField(i, k, e.target.value)} />}
            </div>
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
  if (!shots.length) return <Empty tip="生成设定后，点击右上方生成分镜脚本" />;
  const eps = [...new Set(shots.map(s => s.episode))];
  let filtered = shots;
  if (filterEp) filtered = filtered.filter(s => s.episode == filterEp);
  if (filterScene) filtered = filtered.filter(s => s.sceneName === filterScene);
  const charName = (names) => (names || []).join('、');
  const update = (i, k, v) => { const sh = [...shots]; const idx = shots.indexOf(filtered[i]); sh[idx] = { ...sh[idx], [k]: v }; onUpdate(sh); };

  return (
    <div>
      <div className="shot-toolbar">
        <select value={filterEp} onChange={e => setFilterEp(e.target.value)}>
          <option value="">全部集</option>
          {eps.map(e => <option key={e} value={e}>第{e}集</option>)}
        </select>
        <select value={filterScene} onChange={e => setFilterScene(e.target.value)}>
          <option value="">全部场景</option>
          {scenes.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}
        </select>
        <div className="seg">
          <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>表格</button>
          <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}>网格</button>
        </div>
        <Button size="small" onClick={() => onUpdate([...shots, { episode: 1, sceneNo: 1, shotNo: shots.length + 1, shotType: '中景', duration: 4, characterNames: [], sceneName: scenes[0]?.name || '' }])}>+ 新增分镜</Button>
      </div>
      {view === 'table' ? (
        <table className="shots">
          <thead><tr>
            <th className="num">集</th><th className="num">场</th><th className="num">镜</th><th>景别</th><th>画面</th><th>对白</th><th>动作</th><th className="num">秒</th><th>角色</th><th>场景</th><th className="prompt-cell">Prompt(中)</th><th className="prompt-cell">Prompt(英)</th>
          </tr></thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={i}>
                <td className="num">{s.episode}</td><td className="num">{s.sceneNo}</td><td className="num">{s.shotNo}</td>
                <td><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(i, 'shotType', e.target.textContent)}>{s.shotType}</div></td>
                <td><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(i, 'visual', e.target.textContent)}>{s.visual}</div></td>
                <td><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(i, 'dialogue', e.target.textContent)}>{s.dialogue}</div></td>
                <td><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(i, 'action', e.target.textContent)}>{s.action}</div></td>
                <td className="num"><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(i, 'duration', parseInt(e.target.textContent) || 0)}>{s.duration}</div></td>
                <td>{charName(s.characterNames)}</td>
                <td>{s.sceneName}</td>
                <td className="prompt-cell"><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(i, 'promptZh', e.target.textContent)}>{s.promptZh}</div></td>
                <td className="prompt-cell"><div className="cell-edit" contentEditable suppressContentEditableWarning onBlur={e => update(i, 'promptEn', e.target.textContent)}>{s.promptEn}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="shot-grid">
          {filtered.map((s, i) => (
            <div key={i} className="shot-tile">
              <div className="tile-head"><span>第{s.episode}集·{s.sceneNo}场·{s.shotNo}镜</span><span className="badge">{s.shotType} {s.duration}s</span></div>
              <div className="tile-visual">{s.visual}</div>
              {s.dialogue && <div style={{ fontSize: 12, color: 'var(--ai-text-muted)' }}>「{s.dialogue}」</div>}
              <div className="tile-prompt"><b>中</b>：{s.promptZh}<br /><b>EN</b>：{s.promptEn}</div>
              <div className="tile-actions">
                <Button size="small" onClick={() => { navigator.clipboard?.writeText(s.promptEn); toast('已复制', 'ok'); }}>复制EN</Button>
                <Button size="small" danger onClick={() => onUpdate(shots.filter((_, x) => x !== shots.indexOf(s)))}>删</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Markdown View ============
function MdView({ content, emptyTip }) {
  if (!content) return <Empty tip={emptyTip} />;
  return <div className="md-body" dangerouslySetInnerHTML={{ __html: renderMd(typeof content === 'string' ? content : '```json\n' + JSON.stringify(content, null, 2) + '\n```') }} />;
}

// ============ Knowledge View ============
function KnowledgeView({ project, onUpdate }) {
  const kb = project?.knowledge || { characters: [], scenes: [], props: [], timeline: [] };
  const [sub, setSub] = useS('characters');
  const tabs = [['characters','角色'],['scenes','场景'],['props','道具'],['timeline','时间线']];
  const list = kb[sub] || [];
  return (
    <div>
      <div className="kb-tabs">
        {tabs.map(([k, label]) => <div key={k} className={`kb-tab ${sub === k ? 'active' : ''}`} onClick={() => setSub(k)}>{label} ({(kb[k]||[]).length})</div>)}
      </div>
      {list.length === 0 ? <Empty tip="分析章节后将自动提取知识库" /> : list.map((item, i) => (
        <div key={i} className="kb-item">
          <div className="kb-name">{item.name || item.chapter || '未命名'}</div>
          {Object.entries(item).filter(([k]) => !['id','name','chapter'].includes(k)).map(([k, v]) => (
            <div key={k} style={{ fontSize: 12, marginBottom: 3 }}>
              <b style={{ color: 'var(--ai-text-secondary)' }}>{k}：</b>{Array.isArray(v) ? v.join('、') : String(v)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ============ Media Generation ============
function MediaGen({ styles, project }) {
  const [prompt, setPrompt] = useS('');
  const [negPrompt, setNegPrompt] = useS('');
  const [size, setSize] = useS('1024x1024');
  const [gen, setGen] = useS(false);
  const [imgUrl, setImgUrl] = useS(null);
  const [err, setErr] = useS('');
  const [media, setMedia] = useS(project?.mediaItems || []);

  const generate = async () => {
    if (!prompt) { toast('请输入Prompt', 'error'); return; }
    setGen(true); setErr(''); setImgUrl(null);
    try {
      const r = await api.genImage(prompt, negPrompt, size, project?.style);
      if (r.ok) { setImgUrl(r.url); toast('生成成功', 'ok'); }
      else { setErr(r.error); toast('生成失败', 'error'); }
    } catch (e) { setErr(e.message); toast('生成失败', 'error'); }
    setGen(false);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 10 }}>🖼️ AI 生图</div>
        <div className="ai-field">
          <label>Prompt（自动追加当前视觉风格）</label>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="描述要生成的画面..." style={{ minHeight: 80 }} />
        </div>
        <div className="form-row">
          <div className="ai-field"><label>Negative Prompt</label><input value={negPrompt} onChange={e => setNegPrompt(e.target.value)} /></div>
          <div className="ai-field"><label>尺寸</label><select value={size} onChange={e => setSize(e.target.value)}><option>1024x1024</option><option>1024x768</option><option>768x1024</option></select></div>
        </div>
        <Button type="primary" loading={gen} onClick={generate} block>生成图片</Button>
        {err && <div className="status-bar error">{err}</div>}
        {imgUrl && <img className="img-preview" src={imgUrl} alt="生成结果" />}
      </div>
      <div className="card-title">快速生成（从角色/场景）</div>
      <p style={{ fontSize: 12, color: 'var(--ai-text-muted)' }}>点击角色或场景的 Prompt 可快速填入上方生成框。</p>
    </div>
  );
}

// ============ Consistency View ============
function ConsistencyView({ project }) {
  const [report, setReport] = useS('');
  const [running, setRunning] = useS(false);
  const run = async () => {
    setRunning(true); setReport('');
    try {
      await api.checkConsistency(project.results, project.knowledge, (d) => {
        if (d.content) setReport(prev => prev + d.content);
        if (d.error) setReport(prev => prev + '\n错误: ' + d.error);
      });
      toast('检查完成', 'ok');
    } catch (e) { toast('检查失败', 'error'); }
    setRunning(false);
  };
  return (
    <div>
      <Button type="primary" loading={running} onClick={run} style={{ marginBottom: 12 }}>🔍 检查一致性</Button>
      {report ? <div className="md-body" dangerouslySetInnerHTML={{ __html: renderMd(report) }} /> : <Empty tip="点击上方按钮检查各模块间一致性" />}
    </div>
  );
}

// ============ Empty ============
function Empty({ tip }) {
  return <div className="empty"><div className="big">✦</div><div style={{ fontSize: 16, marginBottom: 6 }}>暂无内容</div><div style={{ fontSize: 13 }}>{tip}</div></div>;
}

// ============ Main App ============
function App() {
  const [projects, setProjects] = useS([]);
  const [currentId, setCurrentId] = useS(null);
  const [project, setProject] = useS(null);
  const [styles, setStyles] = useS([]);
  const [settingsOpen, setSettingsOpen] = useS(false);
  const [cfg, setCfg] = useS(null);

  const refreshProjects = useCB(async () => {
    const r = await api.listProjects();
    setProjects(r.items || []);
  }, []);

  useE(() => {
    refreshProjects();
    api.styles().then(s => setStyles(s)).catch(() => {});
    api.getConfig().then(setCfg).catch(() => {});
  }, []);

  useE(() => { window.__loadExample = loadExample; });

  const loadProject = async (id) => {
    if (!id) { setProject(null); return; }
    try { const p = await api.getProject(id); setProject(p); setCurrentId(id); }
    catch (e) { toast(e.message, 'error'); }
  };

  const updateProject = useCB(async (patch) => {
    if (!project) return;
    const updated = { ...project, ...patch };
    setProject(updated);
    // 防抖保存
    clearTimeout(window.__saveTimer);
    window.__saveTimer = setTimeout(async () => {
      try { await api.updateProject(project.id, patch); refreshProjects(); }
      catch (e) { console.warn('save failed', e); }
    }, 600);
  }, [project]);

  const newProject = async () => {
    const name = prompt('项目名称', '未命名项目');
    if (!name) return;
    const p = await api.createProject(name, 'cinematic');
    await refreshProjects();
    loadProject(p.id);
  };

  const deleteProject = async (id) => {
    if (!confirm('确认删除？')) return;
    await api.deleteProject(id);
    await refreshProjects();
    if (currentId === id) { setCurrentId(null); setProject(null); }
  };

  const importProject = async (data) => {
    try { await api.importProject(data); toast('导入成功', 'ok'); await refreshProjects(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const loadExample = async () => {
    try {
      const p = await api.importProject(EXAMPLE_PROJECT);
      await refreshProjects();
      loadProject(p.id);
      toast('已加载示例', 'ok');
    } catch (e) { toast(e.message, 'error'); }
  };

  const hasProvider = cfg?.providers?.some(p => p.apiKey && p.apiKey !== '');

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">🎬</span>
            <span className="logo-text">短剧脚本工坊</span>
            <span className="logo-badge">v3.0</span>
          </div>
        </div>
        <div className="header-right">
          <div className="model-info" onClick={() => setSettingsOpen(true)}>
            <span className={`model-dot ${hasProvider ? '' : 'off'}`}></span>
            <span>{hasProvider ? (cfg.providers.find(p => p.id === cfg.activeProvider)?.name || '已配置') : '未配置'}</span>
            <span>⚙️</span>
          </div>
          <Button size="small" onClick={() => setSettingsOpen(true)}>设置</Button>
        </div>
      </header>
      <div className="app-body">
        <Sidebar projects={projects} currentId={currentId} onSelect={loadProject} onNew={newProject} onDelete={deleteProject} onImport={importProject} />
        {project ? (
          <div className="main-area">
            <InputPanel project={project} onUpdate={updateProject} styles={styles} generating={false}
              onAnalyzeAll={(mods) => window.__analyzeAll?.(mods)} />
            <ResultPanel project={project} onUpdate={updateProject} styles={styles} />
          </div>
        ) : (
          <div className="main-area" style={{ alignItems: 'center', justifyContent: 'center', color: 'var(--ai-text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ai-text)', marginBottom: 8 }}>短剧脚本工坊</div>
              <div style={{ marginBottom: 16 }}>小说 / 故事 / 剧本 → AI 视频分镜脚本与设定</div>
              <Button type="primary" onClick={newProject}>+ 新建项目</Button>
              <span style={{ margin: '0 8px' }}></span>
              <Button onClick={loadExample}>加载示例</Button>
            </div>
          </div>
        )}
      </div>
      <SettingsModal open={settingsOpen} onClose={() => { setSettingsOpen(false); api.getConfig().then(setCfg); }} />
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
