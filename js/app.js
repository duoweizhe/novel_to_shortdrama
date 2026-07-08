// app.js — 入口与事件绑定

import { state, load, createProject, current, updateField, save } from './store.js';
import { EXAMPLE } from './example.js';
import { testConnection, generateSettings, generateShots } from './llm.js';
import { renderConfig, renderSource, renderProjectBar, rerender, toast } from './render.js';
import { exportMarkdown, exportJSON } from './export.js';

function setStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg || '';
  el.className = 'status ' + (type || '');
}

function setGenerating(on) {
  state.generating = on;
  document.getElementById('genSettingsBtn').disabled = on;
  document.getElementById('genShotsBtn').disabled = on;
  document.getElementById('testConnBtn').disabled = on;
}

function loadExample() {
  const preset = JSON.parse(JSON.stringify(EXAMPLE));
  createProject(preset.name, preset);
  refreshAll();
  toast('已加载示例项目：最后一班电梯', 'ok');
}

export function refreshAll() {
  renderProjectBar();
  renderConfig();
  renderSource();
  rerender();
}

function initEvents() {
  // 源文本
  const ta = document.getElementById('sourceText');
  ta.addEventListener('input', () => {
    document.getElementById('charCount').textContent = ta.value.length;
    updateField(['sourceText'], ta.value);
  });

  // 文件导入
  document.getElementById('fileInput').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      ta.value = r.result;
      document.getElementById('charCount').textContent = ta.value.length;
      updateField(['sourceText'], ta.value);
      toast('已导入 ' + f.name, 'ok');
    };
    r.readAsText(f);
  });

  document.getElementById('loadExampleBtn').addEventListener('click', loadExample);

  // 测试连接
  document.getElementById('testConnBtn').addEventListener('click', async () => {
    const p = current();
    if (!p) return;
    if (!p.config.apiKey) { toast('请先填写 API Key', 'error'); return; }
    setGenerating(true);
    setStatus('测试连接中…', 'info');
    try {
      await testConnection(p.config);
      setStatus('连接成功', 'ok');
      toast('连接成功', 'ok');
    } catch (e) {
      setStatus('连接失败：' + e.message, 'error');
      toast('连接失败', 'error');
    } finally {
      setGenerating(false);
    }
  });

  // 生成设定
  document.getElementById('genSettingsBtn').addEventListener('click', async () => {
    const p = current();
    if (!p) return;
    if (!p.sourceText.trim()) { toast('请先输入源文本', 'error'); return; }
    if (!p.config.apiKey) { toast('请先配置 API Key', 'error'); return; }
    setGenerating(true);
    setStatus('正在生成角色与场景设定…', 'info');
    try {
      const r = await generateSettings(p.sourceText, p.config);
      p.characters = r.characters.map((c, i) => ({ id: 'c_' + Date.now() + '_' + i, ...c }));
      p.scenes = r.scenes.map((s, i) => ({ id: 'sc_' + Date.now() + '_' + i, ...s }));
      save();
      state.view = 'characters';
      setActiveTab('characters');
      rerender();
      setStatus(`已生成 ${p.characters.length} 个角色、${p.scenes.length} 个场景`, 'ok');
      toast('设定生成完成', 'ok');
    } catch (e) {
      setStatus('生成失败：' + e.message, 'error');
      toast('生成失败', 'error');
    } finally {
      setGenerating(false);
    }
  });

  // 生成分镜
  document.getElementById('genShotsBtn').addEventListener('click', async () => {
    const p = current();
    if (!p) return;
    if (!p.sourceText.trim()) { toast('请先输入源文本', 'error'); return; }
    if (!p.config.apiKey) { toast('请先配置 API Key', 'error'); return; }
    if (!p.characters.length || !p.scenes.length) {
      toast('请先生成设定(角色/场景)', 'error'); return;
    }
    setGenerating(true);
    setStatus('正在生成分镜…', 'info');
    try {
      const shots = await generateShots(p.sourceText, p.characters, p.scenes, p.config, (i, n) => {
        setStatus(`生成分镜中… 第 ${i}/${n} 批`, 'info');
      });
      p.shots = shots.map((s, i) => ({ id: 'shot_' + Date.now() + '_' + i, ...s }));
      save();
      state.view = 'shots';
      setActiveTab('shots');
      rerender();
      setStatus(`已生成 ${p.shots.length} 个分镜`, 'ok');
      toast('分镜生成完成', 'ok');
    } catch (e) {
      setStatus('生成失败：' + e.message, 'error');
      toast('生成失败', 'error');
    } finally {
      setGenerating(false);
    }
  });

  // 视图切换
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      state.view = t.dataset.view;
      setActiveTab(t.dataset.view);
      rerender();
    });
  });

  // 导出
  document.getElementById('exportMdBtn').addEventListener('click', () => {
    const p = current();
    if (!p) return;
    if (!p.characters.length && !p.scenes.length && !p.shots.length) { toast('暂无可导出内容', 'error'); return; }
    exportMarkdown(p);
    toast('已导出 Markdown', 'ok');
  });
  document.getElementById('exportJsonBtn').addEventListener('click', () => {
    const p = current();
    if (!p) return;
    exportJSON(p);
    toast('已导出 JSON', 'ok');
  });
}

function setActiveTab(view) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === view);
  });
}

function init() {
  const has = load();
  if (!has) {
    const preset = JSON.parse(JSON.stringify(EXAMPLE));
    createProject(preset.name, preset);
  }
  initEvents();
  refreshAll();
}

document.addEventListener('DOMContentLoaded', init);
