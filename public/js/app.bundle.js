// public/js/app.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { Button, Input, Modal, Tag } from "animal-island-ui";

// public/js/api.js
async function http(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : void 0
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
async function sse(url, body, onData, signal) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const processEvent = (block) => {
    let event = "message";
    const dataLines = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    }
    const raw = dataLines.join("\n").trim();
    if (!raw || raw === "[DONE]") return;
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { error: raw };
    }
    if (event === "error") throw new Error(data.error || data.message || "\u6D41\u5F0F\u8BF7\u6C42\u5931\u8D25");
    onData(data);
  };
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done }).replace(/\r\n/g, "\n");
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";
    for (const block of blocks) processEvent(block);
    if (done) break;
  }
  if (buffer.trim()) processEvent(buffer);
}
var api = {
  listProjects: () => http("/api/projects"),
  createProject: (name, style) => http("/api/projects", { method: "POST", body: { name, style } }),
  getProject: (id) => http("/api/projects/" + id),
  updateProject: (id, patch, expectedRevision) => http("/api/projects/" + id, { method: "PUT", body: { ...patch, ...expectedRevision === void 0 ? {} : { expectedRevision } } }),
  deleteProject: (id) => http("/api/projects/" + id, { method: "DELETE" }),
  importProject: (data) => http("/api/projects/import", { method: "POST", body: data }),
  importChapters: (id, content) => http(`/api/projects/${id}/chapters/import`, { method: "POST", body: { content } }),
  addChapter: (id, title, content, group) => http(`/api/projects/${id}/chapters`, { method: "POST", body: { title, content, group } }),
  updateChapter: (id, chId, patch) => http(`/api/projects/${id}/chapters/${chId}`, { method: "PUT", body: patch }),
  deleteChapter: (id, chId) => http(`/api/projects/${id}/chapters/${chId}`, { method: "DELETE" }),
  getKnowledge: (id) => http(`/api/projects/${id}/knowledge`),
  updateKnowledge: (id, kb) => http(`/api/projects/${id}/knowledge`, { method: "PUT", body: kb }),
  exportMd: (id) => `/api/projects/${id}/export-md`,
  exportJson: (id) => `/api/projects/${id}/export-json`,
  exportSrt: (id) => `/api/projects/${id}/export-srt`,
  exportEpisodeSrt: (id, episode) => `/api/projects/${id}/export-srt/${episode}`,
  exportManifest: (id) => `/api/projects/${id}/export-manifest`,
  exportDeliveryZip: (id) => `/api/projects/${id}/export-delivery.zip`,
  snapshot: (id, label) => http(`/api/projects/${id}/snapshot`, { method: "POST", body: { label } }),
  getSnapshots: (id) => http(`/api/projects/${id}/snapshots`),
  restoreSnapshot: (id, snId) => http(`/api/projects/${id}/snapshots/${snId}/restore`, { method: "POST" }),
  styles: () => http("/api/styles"),
  getConfig: () => http("/api/config/llm"),
  saveConfig: (cfg) => http("/api/config/llm", { method: "PUT", body: cfg }),
  testConn: (baseUrl, apiKey, model) => http("/api/config/llm/test", { method: "POST", body: { baseUrl, apiKey, model } }),
  genImage: (prompt2, negativePrompt, size, style, images) => http("/api/generate/image", { method: "POST", body: { prompt: prompt2, negativePrompt, size, visualStyle: style, images } }),
  genVideo: (params) => http("/api/generate/video", { method: "POST", body: params }),
  getVideo: (id) => http("/api/generate/video/" + id),
  listJobs: (projectId) => http(`/api/projects/${projectId}/jobs`),
  createJob: (projectId, job, expectedRevision) => http(`/api/projects/${projectId}/jobs`, { method: "POST", body: { ...job, ...expectedRevision === void 0 ? {} : { expectedRevision } } }),
  updateJob: (projectId, jobId, patch, expectedRevision) => http(`/api/projects/${projectId}/jobs/${jobId}`, { method: "PATCH", body: { ...patch, ...expectedRevision === void 0 ? {} : { expectedRevision } } }),
  preprocess: (content, projectId, scope, onData, signal) => sse("/api/preprocess", { content, projectId, sourceMode: scope?.mode || "content", chapterId: scope?.mode === "chapter" ? scope.chId : void 0 }, onData, signal),
  analyze: (params, onData, signal) => sse("/api/analyze", params, onData, signal),
  analyzeAll: (params, onData, signal) => sse("/api/analyze-all", params, onData, signal),
  checkConsistency: (projectId, results, knowledge, onData, signal) => sse("/api/check-consistency", { projectId, results, knowledge }, onData, signal)
};

// public/js/example.js
var EXAMPLE_PROJECT = {
  name: "\u6700\u540E\u4E00\u73ED\u7535\u68AF\uFF08\u793A\u4F8B\uFF09",
  style: "anime",
  content: `\u51CC\u6668\u4E00\u70B9\uFF0C\u6797\u590F\u628A\u6700\u540E\u4E00\u9875\u8C03\u67E5\u7B14\u8BB0\u585E\u8FDB\u630E\u5305\u3002\u529E\u516C\u697C\u7684\u706F\u5DF2\u7ECF\u7184\u4E86\u5927\u534A\uFF0C\u53EA\u5269\u8D70\u5ECA\u5C3D\u5934\u7684\u5B89\u5168\u51FA\u53E3\u6307\u793A\u706F\u6CDB\u7740\u60E8\u7EFF\u3002\u5979\u8D70\u8FDB\u7535\u68AF\uFF0C\u6309\u4E0B1\u5C42\u3002

\u7535\u68AF\u95E8\u7F13\u7F13\u5408\u4E0A\uFF0C\u8F7F\u53A2\u91CC\u53EA\u6709\u5934\u9876\u90A3\u76CF\u65E5\u5149\u706F\u53D1\u51FA\u5FAE\u5F31\u7684\u7535\u6D41\u58F0\u3002\u6797\u590F\u4F4E\u5934\u770B\u624B\u673A\uFF0C\u5C4F\u5E55\u4E0A\u662F\u5979\u4ECA\u665A\u8981\u53D1\u7684\u7A3F\u5B50\u2014\u2014\u300A\u5341\u56DB\u697C\u5931\u8E2A\u8005\u300B\u3002

\u53EE\u3002\u7535\u68AF\u572814\u697C\u505C\u4E86\u4E0B\u6765\u3002
\u95E8\u5F00\u4E86\u3002\u8D70\u5ECA\u6F06\u9ED1\u4E00\u7247\uFF0C\u6CA1\u6709\u4EBA\u3002
\u6797\u590F\u76B1\u7709\uFF0C\u8FDE\u6309\u5173\u95E8\u952E\u3002\u95E8\u5408\u4E0A\uFF0C\u7535\u68AF\u5374\u6CA1\u6709\u4E0A\u884C\uFF0C\u53CD\u800C\u4E00\u8DEF\u4E0B\u6C89\u3002\u697C\u5C42\u663E\u793A\uFF1A13\u300110\u30017\u30014\u3001\u8D1F1\u3002

\u8D1F1\u5C42\u3002\u95E8\u5F00\u3002\u8D70\u5ECA\u7684\u706F\u7BA1\u60E8\u767D\uFF0C\u5899\u4E0A\u6709\u4E00\u9053\u65B0\u9C9C\u7684\u5212\u75D5\u2014\u2014\u548C\u5979\u7A3F\u5B50\u91CC\u63CF\u8FF0\u7684\u90A3\u9053\u4E00\u6A21\u4E00\u6837\u3002

\u5BF9\u8BB2\u673A\u7A81\u7136\u54CD\u4E86\u3002\u662F\u591C\u73ED\u4FDD\u5B89\u8001\u5468\uFF0C\u58F0\u97F3\u53D1\u7D27\uFF1A"\u6797\u8BB0\u8005\uFF0C\u4F60\u522B\u56DE\u5934\u3002"

\u6797\u590F\u50F5\u5728\u539F\u5730\u3002\u5979\u770B\u89C1\u7535\u68AF\u955C\u9762\u91CC\uFF0C\u81EA\u5DF1\u8EAB\u540E\u7AD9\u7740\u4E00\u4E2A\u7A7F\u7070\u8272\u98CE\u8863\u7684\u4EBA\u5F71\u3002\u53EF\u5979\u660E\u660E\u662F\u4E00\u4E2A\u4EBA\u8FDB\u7684\u7535\u68AF\u3002
\u4EBA\u5F71\u7F13\u7F13\u62AC\u8D77\u624B\uFF0C\u6307\u5411\u5979\u630E\u5305\u91CC\u7684\u7B14\u8BB0\u3002

\u706F\uFF0C\u706D\u4E86\u3002`,
  chapters: [
    {
      id: "ch_ex_1",
      title: "\u7B2C\u4E00\u7AE0 14\u697C\u7684\u505C\u987F",
      group: "\u7B2C\u4E00\u5377 \u6DF1\u591C\u5F52\u9014",
      order: 0,
      content: `\u51CC\u6668\u4E00\u70B9\uFF0C\u6797\u590F\u628A\u6700\u540E\u4E00\u9875\u8C03\u67E5\u7B14\u8BB0\u585E\u8FDB\u630E\u5305\u3002\u529E\u516C\u697C\u7684\u706F\u5DF2\u7ECF\u7184\u4E86\u5927\u534A\uFF0C\u53EA\u5269\u8D70\u5ECA\u5C3D\u5934\u7684\u5B89\u5168\u51FA\u53E3\u6307\u793A\u706F\u6CDB\u7740\u60E8\u7EFF\u3002\u5979\u8D70\u8FDB\u7535\u68AF\uFF0C\u6309\u4E0B1\u5C42\u3002

\u7535\u68AF\u95E8\u7F13\u7F13\u5408\u4E0A\uFF0C\u8F7F\u53A2\u91CC\u53EA\u6709\u5934\u9876\u90A3\u76CF\u65E5\u5149\u706F\u53D1\u51FA\u5FAE\u5F31\u7684\u7535\u6D41\u58F0\u3002\u6797\u590F\u4F4E\u5934\u770B\u624B\u673A\uFF0C\u5C4F\u5E55\u4E0A\u662F\u5979\u4ECA\u665A\u8981\u53D1\u7684\u7A3F\u5B50\u2014\u2014\u300A\u5341\u56DB\u697C\u5931\u8E2A\u8005\u300B\u3002

\u53EE\u3002\u7535\u68AF\u572814\u697C\u505C\u4E86\u4E0B\u6765\u3002
\u95E8\u5F00\u4E86\u3002\u8D70\u5ECA\u6F06\u9ED1\u4E00\u7247\uFF0C\u6CA1\u6709\u4EBA\u3002
\u6797\u590F\u76B1\u7709\uFF0C\u8FDE\u6309\u5173\u95E8\u952E\u3002\u95E8\u5408\u4E0A\uFF0C\u7535\u68AF\u5374\u6CA1\u6709\u4E0A\u884C\uFF0C\u53CD\u800C\u4E00\u8DEF\u4E0B\u6C89\u3002\u697C\u5C42\u663E\u793A\uFF1A13\u300110\u30017\u30014\u3001\u8D1F1\u3002`,
      analysis: {},
      createdAt: "2026-07-08T16:00:00.000Z"
    },
    {
      id: "ch_ex_2",
      title: "\u7B2C\u4E8C\u7AE0 \u8D1F1\u5C42\u7684\u955C\u4E2D\u4EBA\u5F71",
      group: "\u7B2C\u4E00\u5377 \u6DF1\u591C\u5F52\u9014",
      order: 1,
      content: `\u8D1F1\u5C42\u3002\u95E8\u5F00\u3002\u8D70\u5ECA\u7684\u706F\u7BA1\u60E8\u767D\uFF0C\u5899\u4E0A\u6709\u4E00\u9053\u65B0\u9C9C\u7684\u5212\u75D5\u2014\u2014\u548C\u5979\u7A3F\u5B50\u91CC\u63CF\u8FF0\u7684\u90A3\u9053\u4E00\u6A21\u4E00\u6837\u3002

\u5BF9\u8BB2\u673A\u7A81\u7136\u54CD\u4E86\u3002\u662F\u591C\u73ED\u4FDD\u5B89\u8001\u5468\uFF0C\u58F0\u97F3\u53D1\u7D27\uFF1A"\u6797\u8BB0\u8005\uFF0C\u4F60\u522B\u56DE\u5934\u3002"

\u6797\u590F\u50F5\u5728\u539F\u5730\u3002\u5979\u770B\u89C1\u7535\u68AF\u955C\u9762\u91CC\uFF0C\u81EA\u5DF1\u8EAB\u540E\u7AD9\u7740\u4E00\u4E2A\u7A7F\u7070\u8272\u98CE\u8863\u7684\u4EBA\u5F71\u3002\u53EF\u5979\u660E\u660E\u662F\u4E00\u4E2A\u4EBA\u8FDB\u7684\u7535\u68AF\u3002
\u4EBA\u5F71\u7F13\u7F13\u62AC\u8D77\u624B\uFF0C\u6307\u5411\u5979\u630E\u5305\u91CC\u7684\u7B14\u8BB0\u3002

\u706F\uFF0C\u706D\u4E86\u3002`,
      analysis: {},
      createdAt: "2026-07-08T16:00:00.000Z"
    }
  ],
  knowledge: {
    characters: [
      { id: "c1", name: "\u6797\u590F", aliases: ["\u6797\u8BB0\u8005"], description: "\u8C03\u67E5\u8BB0\u8005\uFF0C28\u5C81\uFF0C\u6B63\u5728\u8FFD\u67E5\u5341\u56DB\u697C\u5931\u8E2A\u6848", traits: "\u51B7\u9759\u3001\u6267\u7740\u3001\u654F\u9510\uFF0C\u9047\u9669\u65F6\u538B\u6291\u6050\u60E7", appearance: "\u9F50\u80A9\u77ED\u53D1\uFF0C\u51B7\u767D\u80A4\u8272\uFF0C\u6E05\u7626\u4E94\u5B98", voiceStyle: "\u77ED\u53E5\u4E3A\u4E3B\uFF0C\u8BED\u6C14\u514B\u5236\u51B7\u9759\uFF0C\u7D27\u5F20\u65F6\u547C\u5438\u6025\u4FC3\u4F46\u4E0D\u5C16\u53EB", relationships: '\u4E0E\u8001\u5468\u662F\u76F8\u8BC6\u5173\u7CFB\uFF08\u8001\u5468\u79F0\u5979"\u6797\u8BB0\u8005"\uFF09\uFF1B\u4E0E\u4EBA\u5F71\u5B58\u5728\u88AB\u8FFD\u8E2A\u7684\u672A\u77E5\u5173\u8054', sourceChapter: "\u7B2C\u4E00\u7AE0 14\u697C\u7684\u505C\u987F" },
      { id: "c2", name: "\u8001\u5468", aliases: [], description: "\u591C\u73ED\u4FDD\u5B89\uFF0C52\u5C81\uFF0C\u89C1\u8FC7\u602A\u4E8B", traits: "\u8C28\u5C0F\u614E\u5FAE\uFF0C\u5BF9\u591C\u73ED\u89C4\u77E9\u8FD1\u4E4E\u8FF7\u4FE1", appearance: "\u82B1\u767D\u5BF8\u5934\uFF0C\u65B9\u8138\u80E1\u832C", voiceStyle: "\u58F0\u97F3\u53D1\u7D27\uFF0C\u8BF4\u8BDD\u7B80\u77ED\u6025\u4FC3\uFF0C\u5E26\u65B9\u8A00\u53E3\u97F3\uFF0C\u7D27\u5F20\u65F6\u58F0\u97F3\u538B\u4F4E", relationships: "\u4E0E\u6797\u590F\u662F\u529E\u516C\u697C\u76F8\u8BC6\u5173\u7CFB\uFF0C\u901A\u8FC7\u76D1\u63A7\u770B\u5230\u5F02\u5E38\u540E\u8BD5\u56FE\u8B66\u544A", sourceChapter: "\u7B2C\u4E8C\u7AE0 \u8D1F1\u5C42\u7684\u955C\u4E2D\u4EBA\u5F71" },
      { id: "c3", name: "\u4EBA\u5F71", aliases: [], description: "\u51FA\u73B0\u5728\u7535\u68AF\u955C\u9762\u4E2D\u7684\u795E\u79D8\u4EBA\u5F71", traits: "\u6C89\u9ED8\u3001\u8BE1\u8C32\uFF0C\u610F\u56FE\u4E0D\u660E", appearance: "\u8EAB\u5F62\u4FEE\u957F\uFF0C\u9762\u5BB9\u9690\u4E8E\u9634\u5F71", voiceStyle: "\u5168\u7A0B\u6C89\u9ED8\u65E0\u58F0\uFF0C\u4EC5\u901A\u8FC7\u80A2\u4F53\u52A8\u4F5C\u4F20\u8FBE\u610F\u56FE", relationships: "\u4E0E\u6797\u590F\u5B58\u5728\u672A\u77E5\u8FFD\u8E2A\u5173\u7CFB\uFF0C\u6307\u5411\u5176\u7B14\u8BB0", sourceChapter: "\u7B2C\u4E8C\u7AE0 \u8D1F1\u5C42\u7684\u955C\u4E2D\u4EBA\u5F71" }
    ],
    scenes: [
      { id: "s1", name: "\u529E\u516C\u697C\u591C\u666F", type: "\u5BA4\u5916", description: "\u6DF1\u591C\u57CE\u5E02\u4E2D\u72EC\u680B\u529E\u516C\u697C\uFF0C\u73BB\u7483\u5E55\u5899\u53CD\u5C04\u8857\u706F", mood: "\u5B64\u5BC2\u538B\u6291", lighting: "\u51B7\u84DD\u6708\u5149\u4E0E\u6696\u9EC4\u8857\u706F\u6DF7\u5408\uFF0C\u4EC5\u9876\u5C42\u4E00\u6247\u7A97\u4EAE\u706F", sourceChapter: "\u7B2C\u4E00\u7AE0 14\u697C\u7684\u505C\u987F" },
      { id: "s2", name: "\u7535\u68AF\u8F7F\u53A2", type: "\u5BA4\u5185", description: "\u72ED\u7A84\u4E0D\u9508\u94A2\u7535\u68AF\u8F7F\u53A2\uFF0C\u955C\u9762\u56DB\u58C1\uFF0C\u6309\u952E\u9762\u677F\u53D1\u51B7\u5149", mood: "\u5E7D\u95ED\u4E0D\u5B89", lighting: "\u9876\u90E8\u60E8\u767D\u65E5\u5149\u706F\uFF0C\u51B7\u8C03\uFF0C\u91D1\u5C5E\u53CD\u5C04", sourceChapter: "\u7B2C\u4E00\u7AE0 14\u697C\u7684\u505C\u987F" },
      { id: "s3", name: "\u8D1F1\u5C42\u8D70\u5ECA", type: "\u5BA4\u5185", description: "\u5730\u4E0B\u8D1F1\u5C42\u6C34\u6CE5\u8D70\u5ECA\uFF0C\u5899\u9762\u7C89\u5237\u6591\u9A73\uFF0C\u706F\u7BA1\u60E8\u767D", mood: "\u8BE1\u5F02\u5BD2\u610F", lighting: "\u51B7\u767D\u65E5\u5149\u706F\u7BA1\uFF0C\u90E8\u5206\u95EA\u70C1\uFF0C\u5730\u9762\u53CD\u5149", sourceChapter: "\u7B2C\u4E8C\u7AE0 \u8D1F1\u5C42\u7684\u955C\u4E2D\u4EBA\u5F71" }
    ],
    props: [
      { id: "p1", name: "\u8C03\u67E5\u7B14\u8BB0", description: "\u6797\u590F\u630E\u5305\u4E2D\u7684\u7A3F\u5B50\u300A\u5341\u56DB\u697C\u5931\u8E2A\u8005\u300B", significance: "\u4EBA\u5F71\u6307\u5411\u7684\u6838\u5FC3\u9053\u5177\uFF0C\u63A8\u52A8\u5267\u60C5", sourceChapter: "\u7B2C\u4E00\u7AE0 14\u697C\u7684\u505C\u987F" },
      { id: "p2", name: "\u5BF9\u8BB2\u673A", description: "\u8001\u5468\u4E0E\u6797\u590F\u8054\u7EDC\u7684\u5DE5\u5177", significance: "\u5236\u9020\u7D27\u5F20\u611F\u7684\u5173\u952E\u9053\u5177", sourceChapter: "\u7B2C\u4E8C\u7AE0 \u8D1F1\u5C42\u7684\u955C\u4E2D\u4EBA\u5F71" },
      { id: "p3", name: "\u5899\u9762\u5212\u75D5", description: "\u8D1F1\u5C42\u8D70\u5ECA\u5899\u4E0A\u7684\u65B0\u9C9C\u5212\u75D5\uFF0C\u4E0E\u6797\u590F\u7A3F\u5B50\u63CF\u8FF0\u4E00\u81F4", significance: "\u6697\u793A\u8D85\u81EA\u7136\u4E0E\u7A3F\u5B50\u7684\u5173\u8054", sourceChapter: "\u7B2C\u4E8C\u7AE0 \u8D1F1\u5C42\u7684\u955C\u4E2D\u4EBA\u5F71" }
    ],
    timeline: [
      { chapter: "\u7B2C\u4E00\u7AE0 14\u697C\u7684\u505C\u987F", event: "\u6797\u590F\u6DF1\u591C\u52A0\u73ED\u540E\u4E58\u7535\u68AF\u4E0B\u697C", time: "\u51CC\u66681\u70B9" },
      { chapter: "\u7B2C\u4E00\u7AE0 14\u697C\u7684\u505C\u987F", event: "\u7535\u68AF\u5F02\u5E38\u505C\u572814\u697C\uFF0C\u95E8\u5916\u6F06\u9ED1\u65E0\u4EBA", time: "\u51CC\u66681\u70B9\u540E" },
      { chapter: "\u7B2C\u4E00\u7AE0 14\u697C\u7684\u505C\u987F", event: "\u7535\u68AF\u53CD\u5411\u4E0B\u5760\u81F3\u8D1F1\u5C42", time: "\u51CC\u66681\u70B9\u540E" },
      { chapter: "\u7B2C\u4E8C\u7AE0 \u8D1F1\u5C42\u7684\u955C\u4E2D\u4EBA\u5F71", event: "\u8D1F1\u5C42\u8D70\u5ECA\u53D1\u73B0\u4E0E\u7A3F\u5B50\u4E00\u81F4\u7684\u5212\u75D5", time: "\u51CC\u66681\u70B9\u540E" },
      { chapter: "\u7B2C\u4E8C\u7AE0 \u8D1F1\u5C42\u7684\u955C\u4E2D\u4EBA\u5F71", event: "\u8001\u5468\u5BF9\u8BB2\u673A\u8B66\u544A\u6797\u590F\u522B\u56DE\u5934", time: "\u51CC\u66681\u70B9\u540E" },
      { chapter: "\u7B2C\u4E8C\u7AE0 \u8D1F1\u5C42\u7684\u955C\u4E2D\u4EBA\u5F71", event: "\u955C\u4E2D\u51FA\u73B0\u795E\u79D8\u4EBA\u5F71\u6307\u5411\u7B14\u8BB0\uFF0C\u706F\u5149\u7184\u706D", time: "\u51CC\u66681\u70B9\u540E" }
    ]
  },
  results: {
    structure: `## \u{1F4D0} \u5267\u60C5\u7ED3\u6784\u5206\u6790

### 1. \u6838\u5FC3\u51B2\u7A81\u63D0\u70BC
- **\u4E00\u53E5\u8BDD\u6545\u4E8B\u5F15\u64CE**\uFF1A\u4E00\u4E2A\u8FFD\u67E5\u5931\u8E2A\u6848\u7684\u5973\u8BB0\u8005\uFF0C\u4E3A\u4E86\u53D1\u51FA\u771F\u76F8\u7A3F\u4EF6\uFF0C\u5FC5\u987B\u72EC\u81EA\u7A7F\u8FC7\u6DF1\u591C\u529E\u516C\u697C\u7684\u7535\u68AF\uFF0C\u5426\u5219\u5C06\u6210\u4E3A\u4E0B\u4E00\u4E2A\u5931\u8E2A\u8005
- **\u6838\u5FC3\u51B2\u7A81\u7C7B\u578B**\uFF1A\u4EBA vs \u547D\u8FD0\uFF08\u672A\u77E5\u8D85\u81EA\u7136\u529B\u91CF\uFF09
- **\u4E3B\u9898/\u6BCD\u9898**\uFF1A\u771F\u76F8\u7684\u4EE3\u4EF7\uFF1B\u51DD\u89C6\u6DF1\u6E0A\u8005\u88AB\u6DF1\u6E0A\u51DD\u89C6

### 2. \u4E09\u5E55\u7ED3\u6784\u5212\u5206

#### \u7B2C\u4E00\u5E55\uFF1A\u5EFA\u7F6E\uFF08\u7EA6\u5360\u5168\u6587 25%\uFF09
- **\u8D77\u59CB\u72B6\u6001**\uFF1A\u6797\u590F\u6DF1\u591C\u52A0\u73ED\uFF0C\u5B8C\u6210\u300A\u5341\u56DB\u697C\u5931\u8E2A\u8005\u300B\u8C03\u67E5\u7A3F\uFF0C\u51C6\u5907\u79BB\u5F00\u529E\u516C\u697C
- **\u6FC0\u52B1\u4E8B\u4EF6**\uFF1A\u7535\u68AF\u572814\u697C\uFF08\u5931\u8E2A\u6848\u53D1\u751F\u697C\u5C42\uFF09\u65E0\u6545\u505C\u4E0B\uFF0C\u95E8\u5916\u6F06\u9ED1\u65E0\u4EBA
- **\u7B2C\u4E00\u8F6C\u6298\u70B9**\uFF1A\u7535\u68AF\u4E0D\u53D7\u63A7\u5236\u53CD\u5411\u5760\u843D\u81F3\u8D1F1\u5C42
- **\u60C5\u8282\u70B9 I**\uFF1A\u6797\u590F\u88AB\u8FEB\u9762\u5BF9\u672A\u77E5\uFF0C\u65E0\u6CD5\u9003\u79BB

#### \u7B2C\u4E8C\u5E55\uFF1A\u5BF9\u6297\uFF08\u7EA6\u5360\u5168\u6587 50%\uFF09
- **\u524D\u534A\u6BB5\uFF1A\u4E0A\u5347\u884C\u52A8**\uFF1A\u8D1F1\u5C42\u8D70\u5ECA\u51FA\u73B0\u4E0E\u7A3F\u5B50\u63CF\u8FF0\u4E00\u81F4\u7684\u5212\u75D5\uFF0C\u6697\u793A\u8D85\u81EA\u7136\u5173\u8054
- **\u4E2D\u70B9**\uFF1A\u8001\u5468\u5BF9\u8BB2\u673A\u8B66\u544A"\u522B\u56DE\u5934"\uFF0C\u5916\u90E8\u4ECB\u5165\u786E\u8BA4\u5371\u9669\u771F\u5B9E\u5B58\u5728
- **\u540E\u534A\u6BB5\uFF1A\u5347\u7EA7\u5BF9\u6297**\uFF1A\u5371\u9669\u4ECE\u73AF\u5883\u903C\u8FD1\u5230\u4EBA\u8EAB\u2014\u2014\u955C\u4E2D\u51FA\u73B0\u8EAB\u540E\u4EBA\u5F71
- **\u7B2C\u4E8C\u8F6C\u6298\u70B9\uFF08\u6697\u591C\u65F6\u523B\uFF09**\uFF1A\u4EBA\u5F71\u6307\u5411\u630E\u5305\u7B14\u8BB0\uFF0C\u6797\u590F\u610F\u8BC6\u5230\u81EA\u5DF1\u88AB\u9501\u5B9A

#### \u7B2C\u4E09\u5E55\uFF1A\u89E3\u51B3\uFF08\u7EA6\u5360\u5168\u6587 25%\uFF09
- **\u9AD8\u6F6E**\uFF1A\u4EBA\u5F71\u62AC\u624B\u6307\u5411\u7B14\u8BB0\uFF0C\u706F\u5149\u9AA4\u706D\u2014\u2014\u5F00\u653E\u5F0F\u60AC\u5FF5
- **\u7ED3\u5C40**\uFF1A\u672A\u7ED9\u51FA\uFF0C\u7559\u767D\u5236\u9020\u6050\u60E7\u4F59\u97F5
- **\u5C3E\u58F0**\uFF1A\u5BF9\u8BB2\u673A\u6B8B\u4F59\u7535\u6D41\u58F0"\u6797\u2026\u2026\u8BB0\u2026\u2026"

### 3. \u4E94\u4E2A\u5173\u952E\u8F6C\u6298\u70B9
| \u8F6C\u6298\u70B9 | \u4F4D\u7F6E | \u4E8B\u4EF6 | \u529F\u80FD |
|--------|------|------|------|
| \u6FC0\u52B1\u4E8B\u4EF6 | ~15% | \u7535\u68AF14\u697C\u5F02\u5E38\u505C\u4E0B\uFF0C\u95E8\u5916\u6F06\u9ED1 | \u6253\u7834\u5E73\u8861 |
| \u7B2C\u4E00\u8F6C\u6298 | ~30% | \u7535\u68AF\u53CD\u5411\u5760\u843D\u8D1F1\u5C42 | \u8FDB\u5165\u51B2\u7A81 |
| \u4E2D\u70B9 | ~50% | \u8D1F1\u5C42\u5212\u75D5\u4E0E\u7A3F\u5B50\u63CF\u8FF0\u4E00\u81F4 | \u65B9\u5411\u8F6C\u53D8 |
| \u7B2C\u4E8C\u8F6C\u6298 | ~75% | \u955C\u4E2D\u4EBA\u5F71\u51FA\u73B0\uFF0C\u6307\u5411\u7B14\u8BB0 | \u8DCC\u5165\u8C37\u5E95 |
| \u9AD8\u6F6E | ~95% | \u706F\u706D\u9ED1\u5C4F | \u6700\u7EC8\u51B2\u51FB |

### 4. \u60C5\u611F\u66F2\u7EBF
[\u8D77\u59CB: 2\u5206] \u2192 [\u6FC0\u52B1\u4E8B\u4EF6: 4\u5206] \u2192 [\u4E0A\u5347: 6\u5206] \u2192 [\u4E2D\u70B9: 7\u5206] \u2192 [\u5347\u7EA7: 8\u5206] \u2192 [\u6697\u591C: 9\u5206] \u2192 [\u9AD8\u6F6E: 10\u5206] \u2192 [\u7ED3\u5C40: 10\u5206]

### 5. \u51B2\u7A81\u5C42\u7EA7
- **\u5916\u90E8\u51B2\u7A81**\uFF1A\u6797\u590F vs \u8D85\u81EA\u7136\u529B\u91CF\uFF08\u7535\u68AF\u5F02\u5E38\u3001\u4EBA\u5F71\u51FA\u73B0\uFF09
- **\u5185\u90E8\u51B2\u7A81**\uFF1A\u804C\u4E1A\u672C\u80FD\uFF08\u8FFD\u67E5\u771F\u76F8\uFF09vs \u751F\u5B58\u672C\u80FD\uFF08\u9003\u79BB\u5371\u9669\uFF09
- **\u5173\u7CFB\u51B2\u7A81**\uFF1A\u6797\u590F\u4E0E\u8001\u5468\u7684\u4FE1\u4EFB\uFF08\u8001\u5468\u7684\u8B66\u544A\u662F\u5426\u53EF\u4FE1\uFF09vs \u4EBA\u5F71\u7684\u672A\u77E5\u610F\u56FE

### 6. \u8282\u594F\u5EFA\u8BAE
- **\u8BE5\u5FEB\u7684\u5730\u65B9**\uFF1A\u7535\u68AF\u4E0B\u5760\u6BB5\u843D\uFF08\u6570\u5B57\u5FEB\u901F\u8DF3\u52A8\uFF09\uFF0C\u7528\u77ED\u53E5\u548C\u753B\u9762\u9707\u52A8\u52A0\u901F\u8282\u594F
- **\u8BE5\u6162\u7684\u5730\u65B9**\uFF1A14\u697C\u95E8\u5F00\u7684\u505C\u987F\uFF08\u65F6\u95F4\u51DD\u56FA\u611F\uFF09\uFF0C\u955C\u4E2D\u4EBA\u5F71\u62AC\u624B\u7684\u52A8\u4F5C\uFF08\u6162\u955C\u5934\u60AC\u5FF5\uFF09
- **\u9700\u8981\u7559\u767D\u7684\u5730\u65B9**\uFF1A\u706F\u706D\u540E\u7684\u9ED1\u5C4F\uFF0C\u4EC5\u7559\u5BF9\u8BB2\u673A\u7535\u6D41\u58F0\uFF0C\u8BA9\u6050\u60E7\u5728\u9759\u9ED8\u4E2D\u8513\u5EF6

### 7. \u77ED\u5267\u6539\u7F16\u9AA8\u67B6
- **\u5EFA\u8BAE\u96C6\u6570**\uFF1A1\u96C6\uFF0860\u79D2\u7AD6\u5C4F/\u6A2A\u5C4F\u77ED\u7247\uFF09
- **\u6BCF\u96C6\u8986\u76D6\u8303\u56F4**\uFF1A\u5168\u6587\uFF08\u539F\u6587\u5DF2\u6781\u7B80\uFF0C\u65E0\u9700\u62C6\u5206\uFF09
- **\u6BCF\u96C6\u7ED3\u5C3E\u94A9\u5B50**\uFF1A\u706F\u706D\u9ED1\u5C4F + \u8001\u5468\u5BF9\u8BB2\u673A\u6B8B\u4F59\u7535\u6D41\u58F0"\u6797\u2026\u2026\u8BB0\u2026\u2026"
- **\u6539\u7F16\u4F18\u5148\u7EA7**\uFF1A\u4FDD\u7559\u5168\u90E8\u60C5\u8282\uFF0C\u65E0\u9700\u5220\u51CF\uFF1B\u5EFA\u8BAE\u5F00\u7BC7\u589E\u52A05\u79D2\u529E\u516C\u697C\u5916\u666F\u7A7A\u955C\u5EFA\u7ACB\u6C1B\u56F4`,
    summary: `## \u{1F4CA} \u5236\u4F5C\u5206\u6790\u62A5\u544A

### 1. \u5185\u5BB9\u8BC4\u4F30
- **\u6545\u4E8B\u7C7B\u578B**\uFF1A\u60AC\u7591/\u60CA\u609A\u5FAE\u77ED\u5267
- **\u6838\u5FC3\u5356\u70B9**\uFF1A\u5BC6\u95ED\u7A7A\u95F4\uFF08\u7535\u68AF\uFF09+ \u955C\u9762\u6050\u6016 + \u5F00\u653E\u5F0F\u7ED3\u5C40\uFF0C\u65E5\u6F2B\u60AC\u7591\u98CE\u683C
- **\u76EE\u6807\u5E73\u53F0**\uFF1A\u6296\u97F3/\u5FEB\u624B/B\u7AD9\uFF08\u7AD6\u5C4F\u4F18\u5148\uFF0C\u6A2A\u5C4F\u4EA6\u53EF\uFF09
- **\u5EFA\u8BAE\u96C6\u6570**\uFF1A1\u96C6
- **\u6BCF\u96C6\u65F6\u957F**\uFF1A60\u79D2

### 2. \u6539\u7F16\u7B56\u7565\uFF08\u91CD\u70B9\uFF09
- **\u5FC5\u987B\u4FDD\u7559\u7684\u6838\u5FC3\u60C5\u8282**\uFF1A14\u697C\u505C\u987F\uFF08\u5931\u8E2A\u6848\u697C\u5C42\u6697\u793A\uFF09\u3001\u697C\u5C42\u4E0B\u5760\uFF08\u5931\u63A7\u611F\uFF09\u3001\u8D1F1\u5C42\u5212\u75D5\uFF08\u8D85\u81EA\u7136\u5173\u8054\uFF09\u3001\u5BF9\u8BB2\u673A\u8B66\u544A\uFF08\u5916\u90E8\u89C6\u89D2\u786E\u8BA4\u5371\u9669\uFF09\u3001\u955C\u4E2D\u4EBA\u5F71\uFF08\u89C6\u89C9\u6050\u6016\u6838\u5FC3\uFF09\u3001\u706F\u706D\uFF08\u5F00\u653E\u5F0F\u60AC\u5FF5\uFF09\u3002\u6BCF\u4E2A\u60C5\u8282\u90FD\u662F\u60C5\u7EEA\u9012\u8FDB\u7684\u5173\u952E\u8282\u70B9\uFF0C\u5220\u51CF\u4EFB\u4F55\u4E00\u4E2A\u90FD\u4F1A\u7834\u574F\u6050\u60E7\u611F\u7684\u5C42\u6B21\u6784\u5EFA\u3002
- **\u53EF\u4EE5\u5220\u51CF\u7684\u5185\u5BB9**\uFF1A\u65E0\uFF08\u539F\u6587\u5DF2\u6781\u7B80\uFF0C\u6BCF\u53E5\u90FD\u6709\u53D9\u4E8B\u529F\u80FD\uFF09
- **\u9700\u8981\u5408\u5E76/\u7B80\u5316\u7684\u5185\u5BB9**\uFF1A\u6797\u590F\u770B\u624B\u673A\u7684\u7EC6\u8282\u53EF\u4E0E\u540E\u7EED14\u697C\u505C\u987F\u5408\u5E76\u5904\u7406\uFF0C\u7528\u5FEB\u901F\u5207\u6362\u955C\u5934\u5448\u73B0\uFF0C\u907F\u514D\u5197\u957F
- **\u5EFA\u8BAE\u539F\u521B\u8865\u5145\u7684\u5185\u5BB9**\uFF1A\u5F00\u7BC7\u53EF\u52A05\u79D2\u529E\u516C\u697C\u5916\u666F\u7A7A\u955C\u5EFA\u7ACB\u6DF1\u591C\u5B64\u5BC2\u6C1B\u56F4\uFF1B\u706F\u706D\u540E\u53EF\u52A03\u79D2\u7EAF\u9ED1\u5C4F+\u7535\u6D41\u58F0\uFF0C\u5F3A\u5316\u4F59\u97F5

### 3. \u65AD\u96C6\u5EFA\u8BAE
- **\u7B2C 1 \u96C6**\uFF1A\u8986\u76D6\u5168\u6587\uFF0C\u6838\u5FC3\u51B2\u7A81\u662F"\u8C03\u67E5\u8005\u88AB\u672A\u77E5\u529B\u91CF\u9501\u5B9A"\uFF0C\u7ED3\u5C3E\u94A9\u5B50\u4E3A\u706F\u706D\u9ED1\u5C4F + \u8001\u5468\u7535\u6D41\u58F0"\u6797\u2026\u2026\u8BB0\u2026\u2026"
- \u5355\u96C6\u7ED3\u6784\uFF1A\u5916\u666F\u5EFA\u7ACB(5s) \u2192 \u8FDB\u7535\u68AF(4s) \u2192 14\u697C\u505C\u987F(8s) \u2192 \u4E0B\u5760(6s) \u2192 \u8D1F1\u5C42\u5212\u75D5(5s) \u2192 \u5BF9\u8BB2\u673A(3s) \u2192 \u955C\u4E2D\u4EBA\u5F71(6s) \u2192 \u706F\u706D\u9ED1\u5C4F(3s) + \u4F59\u97F5(20s\u7559\u7ED9\u97F3\u6548)

### 4. \u89D2\u8272\u5206\u6790
- 3\u4E2A\u89D2\u8272\uFF0C\u6797\u590F\u4E3A\u4E3B\u89C6\u89D2\uFF0C\u8001\u5468\u4EC5\u58F0\u97F3\u51FA\u573A\uFF0C\u4EBA\u5F71\u4E3A\u89C6\u89C9\u6050\u6016\u5143\u7D20
- \u89D2\u8272\u5173\u7CFB\u56FE\u8C31\uFF1A\u6797\u590F \u2190\u8B66\u544A\u2014 \u8001\u5468\uFF08\u76D1\u63A7\u89C6\u89D2\uFF09\uFF1B\u6797\u590F \u2190\u8FFD\u8E2A\u2014 \u4EBA\u5F71\uFF08\u955C\u9762\u51FA\u73B0\uFF09
- \u9009\u89D2\u5EFA\u8BAE\uFF1A\u6797\u590F\u9700\u6E05\u7626\u51B7\u611F\u6C14\u8D28\uFF0C\u53C2\u8003\u65E5\u6F2B\u60AC\u7591\u5973\u4E3B\u89D2\u7C7B\u578B\uFF1B\u4EBA\u5F71\u9700\u9AD8\u6311\u8EAB\u5F62\uFF0C\u65E0\u9700\u9732\u8138

### 5. \u573A\u666F\u5206\u6790
- 3\u4E2A\u573A\u666F\uFF0C\u7535\u68AF\u8F7F\u53A2\u4E3A\u6838\u5FC3\uFF08\u536080%\u65F6\u957F\uFF09\uFF0C\u5176\u4F59\u4E3A\u5916\u666F/\u8D70\u5ECA\u7A7A\u955C
- \u5236\u4F5C\u96BE\u5EA6\uFF1A\u7535\u68AF\u573A\u666F\u9700\u7ED8\u5236\u955C\u9762\u53CD\u5C04\u6548\u679C\uFF0C\u65E5\u6F2B\u98CE\u683C\u4E0B\u53EF\u7528\u7F51\u70B9\u7EB8/\u6E10\u53D8\u8868\u73B0\u91D1\u5C5E\u8D28\u611F
- \u9700\u8981\u7279\u6B8A\u573A\u666F\uFF1A\u8D1F1\u5C42\u8D70\u5ECA\u7684\u5212\u75D5\u9700\u7279\u5199\u5206\u683C\uFF0C\u706F\u7BA1\u95EA\u70C1\u7528\u901F\u5EA6\u7EBF\u8868\u73B0

### 6. \u5236\u4F5C\u5EFA\u8BAE
- \u63A8\u8350\u753B\u9762\u624B\u6CD5\uFF1A\u56FA\u5B9A\u5206\u683C+\u624B\u6301\u5FAE\u6296\u7EBF\u6761\u4EA4\u66FF\uFF0C\u955C\u9762\u7528\u534A\u900F\u53E0\u52A0\u8868\u73B0"\u4EBA\u5F71"\u6548\u679C
- \u7279\u6548\u9700\u6C42\uFF1A\u697C\u5C42\u663E\u793A\u5C4F\u6570\u5B57\u4E0B\u5760\uFF08\u6570\u5B57\u5B57\u4F53\u6296\u52A8\uFF09\u3001\u706F\u5149\u95EA\u70C1\uFF08\u9ED1\u767D\u4EA4\u66FF\u95EA\u70C1\u5E27\uFF09
- \u9884\u7B97\u7EA7\u522B\uFF1A\u4F4E\uFF08\u5355\u573A\u666F\u4E3A\u4E3B\uFF0C\u89D2\u8272\u5C11\uFF09
- \u5236\u4F5C\u5468\u671F\uFF1A1-2\u5929\u7ED8\u5236 + 1\u5929\u4E0A\u8272\u540E\u671F

### 7. \u98CE\u9669\u63D0\u793A
- \u6539\u7F16\u96BE\u70B9\uFF1A\u955C\u9762\u4EBA\u5F71\u7684\u89C6\u89C9\u6548\u679C\u5B9E\u73B0\uFF0C\u9700\u5728\u65E5\u6F2B\u98CE\u683C\u4E0B\u8868\u73B0\u53CD\u5C04\u4E0E\u8D85\u81EA\u7136\u611F
- \u5BA1\u67E5\u98CE\u9669\uFF1A\u65E0\u66B4\u529B\u8272\u60C5\uFF0C\u60AC\u7591\u6050\u6016\u5C3A\u5EA6\u9002\u4E2D\uFF0C\u6CE8\u610F\u706F\u706D\u540E\u4E0D\u8981\u6709\u8FC7\u591A\u6050\u6016\u753B\u9762
- \u89C2\u4F17\u53CD\u9988\uFF1A\u5F00\u653E\u5F0F\u7ED3\u5C40\u53EF\u80FD\u4E24\u6781\u5206\u5316\uFF0C\u5EFA\u8BAE\u7CFB\u5217\u5316\u540E\u7EED\u96C6\u6570`,
    characters: {
      characters: [
        {
          name: "\u6797\u590F",
          role: "\u4E3B\u89D2",
          gender: "\u5973",
          age: "28",
          appearance: "\u9F50\u80A9\u77ED\u53D1\uFF0C\u4E94\u5B98\u6E05\u7626\uFF0C\u773C\u4E0B\u6709\u75B2\u6001\uFF0C\u80A4\u8272\u504F\u51B7\u767D\uFF0C\u8EAB\u6750\u7EA4\u7EC6\uFF0C\u5927\u773C\u9510\u5229",
          personality: "\u51B7\u9759\u3001\u6267\u7740\u3001\u6709\u8C03\u67E5\u8BB0\u8005\u7684\u654F\u9510\uFF0C\u9047\u9669\u65F6\u538B\u6291\u6050\u60E7\u800C\u975E\u5D29\u6E83",
          costume: "\u9ED1\u8272\u9AD8\u9886\u6BDB\u8863\uFF0C\u6DF1\u7070\u98CE\u8863\uFF0C\u630E\u5E06\u5E03\u630E\u5305\uFF0C\u9888\u6302\u5DE5\u724C",
          voiceStyle: "\u77ED\u53E5\u4E3A\u4E3B\uFF0C\u8BED\u6C14\u514B\u5236\u51B7\u9759\uFF0C\u7D27\u5F20\u65F6\u547C\u5438\u6025\u4FC3\u4F46\u4E0D\u5C16\u53EB\uFF0C\u4E60\u60EF\u7528\u53CD\u95EE\u786E\u8BA4\u4FE1\u606F",
          relationships: '\u4E0E\u8001\u5468\u662F\u529E\u516C\u697C\u76F8\u8BC6\u5173\u7CFB\uFF08\u8001\u5468\u79F0\u5979"\u6797\u8BB0\u8005"\uFF09\uFF1B\u4E0E\u4EBA\u5F71\u5B58\u5728\u88AB\u8FFD\u8E2A\u7684\u672A\u77E5\u5173\u8054',
          arc: "\u4ECE\u81EA\u4FE1\u8C03\u67E5\u8005\uFF08\u4E3B\u52A8\u8FFD\u67E5\u771F\u76F8\uFF09\u2192 \u88AB\u672A\u77E5\u529B\u91CF\u51DD\u89C6\u7684\u730E\u7269\uFF08\u610F\u8BC6\u5230\u81EA\u5DF1\u88AB\u9501\u5B9A\uFF09",
          castingReference: "\u6E05\u7626\u51B7\u611F\u6C14\u8D28\uFF0C\u65E5\u6F2B\u60AC\u7591\u5973\u4E3B\u89D2\u7C7B\u578B\uFF0C\u53C2\u8003\u300AAnother\u300B\u89C1\u5D0E\u9E23\u3001\u300A\u6B7B\u4EA1\u7B14\u8BB0\u300B\u591C\u795E\u6708\u7C7B\u578B",
          imagePromptZh: "\u89D2\u8272\u8BBE\u5B9A\u56FE\uFF0C\u6A2A\u54111x4\u6392\u5217\u767D\u8272\u80CC\u666F\uFF0C\u4ECE\u5DE6\u5230\u53F3\uFF1A\u7B2C1\u683C28\u5C81\u5973\u6027\u9762\u90E8\u4E0A\u534A\u8EAB\u7279\u5199\uFF0C\u9F50\u80A9\u9ED1\u8272\u77ED\u53D1\uFF0C\u51B7\u767D\u80A4\u8272\uFF0C\u6E05\u7626\u4E94\u5B98\uFF0C\u5927\u773C\u9510\u5229\uFF0C\u773C\u4E0B\u6709\u75B2\u6001\uFF0C\u9ED1\u8272\u9AD8\u9886\u6BDB\u8863\u9886\u53E3\uFF1B\u7B2C2\u683C\u6B63\u9762\u5168\u8EAB\u7167\uFF0C28\u5C81\u5973\u6027\uFF0C\u9F50\u80A9\u9ED1\u53D1\uFF0C\u9ED1\u8272\u9AD8\u9886\u6BDB\u8863\uFF0C\u6DF1\u7070\u98CE\u8863\uFF0C\u5E06\u5E03\u630E\u5305\uFF0C\u9888\u6302\u5DE5\u724C\uFF0C\u7AD9\u59FF\u633A\u62D4\uFF0C\u7EA4\u7EC6\u8EAB\u6750\uFF1B\u7B2C3\u683C\u4FA7\u9762\u5168\u8EAB\u7167\uFF0C\u9F50\u80A9\u53D1\u4FA7\u8138\uFF0C\u6DF1\u7070\u98CE\u8863\u4FA7\u8EAB\u8F6E\u5ED3\uFF0C\u5E06\u5E03\u630E\u5305\uFF1B\u7B2C4\u683C\u80CC\u9762\u5168\u8EAB\u7167\uFF0C\u9F50\u80A9\u53D1\u80CC\u5F71\uFF0C\u6DF1\u7070\u98CE\u8863\u80CC\u9762\uFF0C\u5DE5\u724C\u6302\u7EF3\uFF0C\u5E06\u5E03\u630E\u5305\u3002\u540C\u4E00\u89D2\u8272\u540C\u4E00\u670D\u88C5\u4E00\u81F4\u8BBE\u8BA1\uFF0C\u65E5\u6F2B\u98CE\u683C\uFF0C\u8D5B\u7490\u73DE\u4E0A\u8272\uFF0C\u8272\u5F69\u9C9C\u660E\uFF0C\u6E05\u6670\u7EBF\u6761\uFF0C2D\u52A8\u6F2B\u7F8E\u5B66\uFF0C\u9AD8\u8D28\u91CF\uFF0C\u7EC6\u8282\u4E30\u5BCC",
          imagePromptEn: "character turnaround reference sheet, 1x4 horizontal layout on white background, left face upper-body close-up of 28yo female shoulder-length black hair pale skin lean features large sharp eyes tired under-eyes black turtleneck collar; center-left front full-body view 28yo female shoulder-length black hair black turtleneck dark grey trench coat canvas shoulder bag ID lanyard upright stance slender build; center-right side profile full-body view side face shoulder-length hair dark grey trench coat side silhouette canvas bag slender figure; right back full-body view shoulder-length hair from behind dark grey trench coat back ID lanyard canvas bag, same character same costume consistent design, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive"
        },
        {
          name: "\u8001\u5468",
          role: "\u914D\u89D2",
          gender: "\u7537",
          age: "52",
          appearance: "\u82B1\u767D\u5BF8\u5934\uFF0C\u65B9\u8138\uFF0C\u7709\u9AA8\u9AD8\uFF0C\u4E0B\u988C\u80E1\u832C\uFF0C\u76AE\u80A4\u7C97\u7CD9\uFF0C\u6D53\u7709",
          personality: "\u8C28\u5C0F\u614E\u5FAE\uFF0C\u89C1\u8FC7\u602A\u4E8B\uFF0C\u5BF9\u591C\u73ED\u89C4\u77E9\u8FD1\u4E4E\u8FF7\u4FE1\uFF0C\u5185\u5FC3\u5584\u826F\u4F46\u80C6\u5C0F",
          costume: "\u6DF1\u84DD\u4FDD\u5B89\u5236\u670D\uFF0C\u80F8\u524D\u522B\u5BF9\u8BB2\u673A\uFF0C\u8170\u95F4\u6302\u624B\u7535\u7B52\uFF0C\u9ED1\u8272\u76AE\u978B",
          voiceStyle: "\u58F0\u97F3\u53D1\u7D27\uFF0C\u8BF4\u8BDD\u7B80\u77ED\u6025\u4FC3\uFF0C\u5E26\u8F7B\u5FAE\u65B9\u8A00\u53E3\u97F3\uFF0C\u7D27\u5F20\u65F6\u58F0\u97F3\u538B\u4F4E\u5230\u6C14\u58F0",
          relationships: "\u4E0E\u6797\u590F\u662F\u529E\u516C\u697C\u76F8\u8BC6\u5173\u7CFB\uFF0C\u901A\u8FC7\u76D1\u63A7\u770B\u5230\u5F02\u5E38\u540E\u8BD5\u56FE\u8B66\u544A\u5979",
          arc: "\u65C1\u89C2\u8005\uFF08\u89C1\u8FC7\u602A\u4E8B\u4F46\u4E0D\u6562\u6DF1\u7A76\uFF09\u2192 \u8BD5\u56FE\u8B66\u544A\u5374\u65E0\u80FD\u4E3A\u529B\uFF08\u53EA\u80FD\u901A\u8FC7\u5BF9\u8BB2\u673A\u558A\u8BDD\uFF09",
          castingReference: "\u6CA7\u6851\u8D28\u6734\u6C14\u8D28\uFF0C\u65E5\u6F2B\u4E2D\u5E74\u914D\u89D2\u7C7B\u578B\uFF0C\u53C2\u8003\u300A\u540D\u4FA6\u63A2\u67EF\u5357\u300B\u6BDB\u5229\u5C0F\u4E94\u90CE\u7C7B\u578B",
          imagePromptZh: "\u89D2\u8272\u8BBE\u5B9A\u56FE\uFF0C\u6A2A\u54111x4\u6392\u5217\u767D\u8272\u80CC\u666F\uFF0C\u4ECE\u5DE6\u5230\u53F3\uFF1A\u7B2C1\u683C52\u5C81\u7537\u6027\u9762\u90E8\u7279\u5199\uFF0C\u82B1\u767D\u5BF8\u5934\uFF0C\u65B9\u8138\uFF0C\u80E1\u832C\uFF0C\u7709\u9AA8\u9AD8\uFF0C\u6D53\u7709\uFF0C\u7D27\u5F20\u795E\u60C5\uFF0C\u7C97\u7CD9\u76AE\u80A4\uFF0C\u6DF1\u84DD\u5236\u670D\u9886\u53E3\uFF1B\u7B2C2\u683C\u6B63\u9762\u5168\u8EAB\u7167\uFF0C52\u5C81\u7537\u6027\uFF0C\u82B1\u767D\u5BF8\u5934\uFF0C\u6DF1\u84DD\u4FDD\u5B89\u5236\u670D\uFF0C\u80F8\u524D\u5BF9\u8BB2\u673A\uFF0C\u8170\u95F4\u624B\u7535\u7B52\uFF0C\u62D8\u8C28\u7AD9\u59FF\uFF1B\u7B2C3\u683C\u4FA7\u9762\u5168\u8EAB\u7167\uFF0C\u82B1\u767D\u5BF8\u5934\u4FA7\u8138\uFF0C\u6DF1\u84DD\u5236\u670D\u4FA7\u8EAB\uFF0C\u80E1\u832C\u8F6E\u5ED3\uFF1B\u7B2C4\u683C\u80CC\u9762\u5168\u8EAB\u7167\uFF0C\u82B1\u767D\u5BF8\u5934\u80CC\u5F71\uFF0C\u6DF1\u84DD\u5236\u670D\u80CC\u9762\uFF0C\u8170\u95F4\u624B\u7535\u7B52\u3002\u540C\u4E00\u89D2\u8272\u540C\u4E00\u670D\u88C5\u4E00\u81F4\u8BBE\u8BA1\uFF0C\u65E5\u6F2B\u98CE\u683C\uFF0C\u8D5B\u7490\u73DE\u4E0A\u8272\uFF0C\u8272\u5F69\u9C9C\u660E\uFF0C\u6E05\u6670\u7EBF\u6761\uFF0C2D\u52A8\u6F2B\u7F8E\u5B66\uFF0C\u9AD8\u8D28\u91CF\uFF0C\u7EC6\u8282\u4E30\u5BCC",
          imagePromptEn: "character turnaround reference sheet, 1x4 horizontal layout on white background, left face close-up of 52yo male grey buzz cut square jaw stubble prominent brow thick eyebrows tense expression rough skin dark blue uniform collar; center-left front full-body view 52yo male grey buzz cut dark blue security uniform walkie-talkie on chest flashlight on waist restrained stance black shoes; center-right side profile full-body view grey buzz cut side face dark blue uniform side body stubble silhouette; right back full-body view grey buzz cut from behind dark blue uniform back waist flashlight, same character same costume consistent design, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive"
        },
        {
          name: "\u4EBA\u5F71",
          role: "\u53CD\u6D3E/\u8C1C\u56E2",
          gender: "\u672A\u77E5",
          age: "\u4E0D\u660E",
          appearance: "\u8EAB\u5F62\u4FEE\u957F\uFF0C\u9762\u5BB9\u9690\u4E8E\u9634\u5F71\uFF0C\u8F6E\u5ED3\u6A21\u7CCA\uFF0C\u53CC\u624B\u82CD\u767D",
          personality: "\u6C89\u9ED8\u3001\u8BE1\u8C32\uFF0C\u610F\u56FE\u4E0D\u660E\uFF0C\u884C\u52A8\u7F13\u6162\u800C\u523B\u610F",
          costume: "\u7070\u8272\u98CE\u8863\uFF0C\u7ACB\u9886\u906E\u4F4F\u4E0B\u534A\u5F20\u8138\uFF0C\u53CC\u624B\u82CD\u767D\uFF0C\u65E0\u53EF\u89C1\u914D\u9970",
          voiceStyle: "\u5168\u7A0B\u6C89\u9ED8\u65E0\u58F0\uFF0C\u4EC5\u901A\u8FC7\u7F13\u6162\u7684\u80A2\u4F53\u52A8\u4F5C\u4F20\u8FBE\u610F\u56FE",
          relationships: "\u4E0E\u6797\u590F\u5B58\u5728\u672A\u77E5\u8FFD\u8E2A\u5173\u7CFB\uFF0C\u6307\u5411\u5176\u630E\u5305\u7B14\u8BB0\uFF0C\u610F\u56FE\u4E0D\u660E",
          arc: "\u795E\u79D8\u5B58\u5728\uFF08\u7A81\u7136\u51FA\u73B0\u5728\u955C\u4E2D\uFF09\u2192 \u6307\u5411\u7B14\u8BB0\uFF08\u9501\u5B9A\u76EE\u6807\uFF09\u2192 \u706F\u706D\uFF08\u610F\u56FE\u672A\u660E\uFF09",
          castingReference: "\u9AD8\u6311\u4FEE\u957F\u8EAB\u5F62\uFF0C\u65E0\u9700\u9732\u8138\uFF0C\u65E5\u6F2B\u6050\u6016\u89D2\u8272\u7C7B\u578B\uFF0C\u53C2\u8003\u300A\u53E6\u4E00\u4E2A\u300B\u4E2D\u7684\u8BC5\u5492\u4EBA\u5076\u7C7B\u578B",
          imagePromptZh: "\u89D2\u8272\u8BBE\u5B9A\u56FE\uFF0C\u6A2A\u54111x4\u6392\u5217\u767D\u8272\u80CC\u666F\uFF0C\u4ECE\u5DE6\u5230\u53F3\uFF1A\u7B2C1\u683C\u795E\u79D8\u4EBA\u5F71\u9762\u90E8\u7279\u5199\uFF0C\u7070\u8272\u7ACB\u9886\u98CE\u8863\u906E\u4F4F\u4E0B\u534A\u8138\uFF0C\u4E0A\u534A\u8138\u9690\u4E8E\u9634\u5F71\u53EA\u89C1\u8F6E\u5ED3\uFF0C\u82CD\u767D\u53CC\u624B\uFF1B\u7B2C2\u683C\u6B63\u9762\u5168\u8EAB\u7167\uFF0C\u7070\u8272\u7ACB\u9886\u98CE\u8863\uFF0C\u9762\u5BB9\u9690\u4E8E\u9634\u5F71\uFF0C\u8EAB\u5F62\u4FEE\u957F\uFF0C\u53CC\u624B\u82CD\u767D\u5782\u4E0B\uFF1B\u7B2C3\u683C\u4FA7\u9762\u5168\u8EAB\u7167\uFF0C\u7070\u8272\u98CE\u8863\u4FA7\u8EAB\u8F6E\u5ED3\uFF0C\u7ACB\u9886\u906E\u9762\uFF0C\u4FEE\u957F\u8EAB\u5F62\uFF1B\u7B2C4\u683C\u80CC\u9762\u5168\u8EAB\u7167\uFF0C\u7070\u8272\u98CE\u8863\u80CC\u5F71\uFF0C\u7ACB\u9886\uFF0C\u4FEE\u957F\u8F6E\u5ED3\u3002\u540C\u4E00\u89D2\u8272\u540C\u4E00\u670D\u88C5\u4E00\u81F4\u8BBE\u8BA1\uFF0C\u60AC\u7591\u6050\u6016\u6C1B\u56F4\uFF0C\u65E5\u6F2B\u98CE\u683C\uFF0C\u8D5B\u7490\u73DE\u4E0A\u8272\uFF0C\u8272\u5F69\u9C9C\u660E\uFF0C\u6E05\u6670\u7EBF\u6761\uFF0C2D\u52A8\u6F2B\u7F8E\u5B66\uFF0C\u9AD8\u8D28\u91CF\uFF0C\u7EC6\u8282\u4E30\u5BCC",
          imagePromptEn: "character turnaround reference sheet, 1x4 horizontal layout on white background, left face close-up of mysterious silhouette grey high-collar trench coat covering lower face upper face hidden in shadow only outline visible pale hands; center-left front full-body view grey high-collar trench coat face hidden in shadow tall slender build pale hands hanging down; center-right side profile full-body view grey trench coat side silhouette high collar covering face slender build; right back full-body view grey trench coat from behind high collar slender outline, same character same costume consistent design eerie thriller atmosphere, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive"
        }
      ]
    },
    scenes: {
      scenes: [
        {
          name: "\u529E\u516C\u697C\u591C\u666F",
          environment: "\u6DF1\u591C\u57CE\u5E02\u4E2D\u72EC\u680B\u529E\u516C\u697C\u5916\u666F\uFF0C\u73BB\u7483\u5E55\u5899\u53CD\u5C04\u8857\u706F\uFF0C\u5468\u56F4\u65E0\u884C\u4EBA\u8F66\u8F86",
          mood: "\u5B64\u5BC2\u3001\u538B\u6291\u3001\u6F5C\u4F0F\u5371\u673A",
          lighting: "\u51B7\u84DD\u6708\u5149\u4E0E\u6696\u9EC4\u8857\u706F\u6DF7\u5408\uFF0C\u4EC5\u9876\u5C42\u4E00\u6247\u7A97\u4EAE\u706F\uFF0C\u5BF9\u6BD4\u5F3A\u70C8",
          timeOfDay: "\u6DF1\u591C",
          narrativeFunction: "\u5EFA\u7F6E",
          keyProps: "\u65E0",
          soundDesign: "\u8FDC\u5904\u4EA4\u901A\u4F4E\u9891\u566A\u97F3\u6E10\u5F31\uFF0C\u98CE\u58F0\uFF0C\u5076\u5C14\u7684\u8FDC\u8F66\u58F0\uFF0C\u4F4E\u6C89\u7684\u6C1B\u56F4\u5F26\u4E50\u94FA\u5E95",
          colorPalette: "\u4E3B\u8272\u6DF1\u84DD(#1a2a3e)/\u6697\u7D2B(#2a1a3e)\uFF0C\u8F85\u8272\u6696\u9EC4(#d4a843)\u8857\u706F\u70B9\u7F00",
          compositionHint: "\u529E\u516C\u697C\u5C45\u4E2D\u504F\u53F3\uFF0C\u5DE6\u4FA7\u7559\u7A7A\u5F3A\u5316\u5B64\u5BC2\u611F\uFF0C\u89C6\u89C9\u5F15\u5BFC\u7EBF\u4ECE\u8857\u9762\u5411\u4E0A\u5EF6\u4F38\u81F3\u4EAE\u706F\u7A97\u6237",
          imagePromptZh: "\u6DF1\u591C\u57CE\u5E02\u4E2D\u4E00\u680B\u529E\u516C\u697C\u5916\u666F\uFF0C\u73BB\u7483\u5E55\u5899\u53CD\u5C04\u6708\u5149\u4E0E\u8857\u706F\uFF0C\u4EC5\u9876\u5C42\u4E00\u6247\u7A97\u4EAE\u7740\u706F\u5149\uFF0C\u8857\u9762\u7A7A\u65E0\u4E00\u4EBA\uFF0C\u5B64\u5BC2\u538B\u6291\u6C1B\u56F4\uFF0C\u5EFA\u7B51\u5C45\u4E2D\u504F\u53F3\u6784\u56FE\uFF0C16:9\uFF0C\u65E5\u6F2B\u98CE\u683C\uFF0C\u8D5B\u7490\u73DE\u4E0A\u8272\uFF0C\u8272\u5F69\u9C9C\u660E\uFF0C\u6E05\u6670\u7EBF\u6761\uFF0C2D\u52A8\u6F2B\u7F8E\u5B66\uFF0C\u9AD8\u8D28\u91CF\uFF0C\u7EC6\u8282\u4E30\u5BCC",
          imagePromptEn: "wide shot of a lone office tower at night, glass curtain wall reflecting moonlight and street lamps, only one top-floor window lit, empty street, oppressive lonely mood, building centered-right composition, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive"
        },
        {
          name: "\u7535\u68AF\u8F7F\u53A2",
          environment: "\u72ED\u7A84\u4E0D\u9508\u94A2\u7535\u68AF\u8F7F\u53A2\uFF0C\u955C\u9762\u56DB\u58C1\uFF0C\u6309\u952E\u9762\u677F\u53D1\u51B7\u5149\uFF0C\u7A7A\u95F4\u903C\u4EC4",
          mood: "\u5E7D\u95ED\u3001\u4E0D\u5B89\u3001\u5B64\u7ACB\u65E0\u63F4",
          lighting: "\u9876\u90E8\u60E8\u767D\u65E5\u5149\u706F\uFF0C\u91D1\u5C5E\u53CD\u5C04\uFF0C\u706F\u706D\u524D\u6709\u5FAE\u5F31\u95EA\u70C1",
          timeOfDay: "\u6DF1\u591C",
          narrativeFunction: "\u6FC0\u52B1/\u4E0A\u5347",
          keyProps: "\u6309\u952E\u9762\u677F\u3001\u955C\u9762\u56DB\u58C1",
          soundDesign: "\u65E5\u5149\u706F\u7535\u6D41\u55E1\u9E23\uFF08\u6301\u7EED\u4F4E\u9891\uFF09\uFF0C\u6309\u952E\u7535\u5B50\u97F3\uFF0C\u95E8\u5F00\u5173\u673A\u68B0\u58F0\uFF0C\u706F\u706D\u77AC\u95F4\u7684\u7535\u6D41\u4E2D\u65AD\u58F0",
          colorPalette: "\u4E3B\u8272\u60E8\u767D(#f0f0e8)/\u4E0D\u9508\u94A2\u94F6(#c0c0c0)\uFF0C\u8F85\u8272\u6697\u7D2B(#2a1a3e)\u9634\u5F71",
          compositionHint: "\u5BF9\u79F0\u6784\u56FE\u5F3A\u5316\u5E7D\u95ED\u611F\uFF0C\u955C\u9762\u53CD\u5C04\u5236\u9020\u7EB5\u6DF1\u9519\u89C9\uFF0C\u4EBA\u7269\u504F\u5DE6\u6216\u504F\u53F3\u7559\u51FA\u955C\u9762\u7A7A\u95F4",
          imagePromptZh: "\u72ED\u7A84\u4E0D\u9508\u94A2\u7535\u68AF\u8F7F\u53A2\u5185\u666F\uFF0C\u955C\u9762\u56DB\u58C1\u53CD\u5C04\uFF0C\u6309\u952E\u9762\u677F\u6CDB\u51B7\u767D\u5149\uFF0C\u9876\u90E8\u65E5\u5149\u706F\uFF0C\u91D1\u5C5E\u53CD\u5C04\uFF0C\u5E7D\u95ED\u4E0D\u5B89\u6C1B\u56F4\uFF0C\u5BF9\u79F0\u6784\u56FE\uFF0C16:9\uFF0C\u65E5\u6F2B\u98CE\u683C\uFF0C\u8D5B\u7490\u73DE\u4E0A\u8272\uFF0C\u8272\u5F69\u9C9C\u660E\uFF0C\u6E05\u6670\u7EBF\u6761\uFF0C2D\u52A8\u6F2B\u7F8E\u5B66\uFF0C\u9AD8\u8D28\u91CF\uFF0C\u7EC6\u8282\u4E30\u5BCC",
          imagePromptEn: "interior of narrow stainless-steel elevator car, mirrored walls reflecting, cold-glowing button panel, white ceiling fluorescent, metallic reflections, claustrophobic uneasy mood, symmetrical composition, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive"
        },
        {
          name: "\u8D1F1\u5C42\u8D70\u5ECA",
          environment: "\u5730\u4E0B\u8D1F1\u5C42\u6C34\u6CE5\u8D70\u5ECA\uFF0C\u5899\u9762\u7C89\u5237\u6591\u9A73\uFF0C\u706F\u7BA1\u60E8\u767D\uFF0C\u5C3D\u5934\u9690\u5165\u9ED1\u6697",
          mood: "\u8BE1\u5F02\u3001\u5BD2\u610F\u3001\u5371\u9669\u903C\u8FD1",
          lighting: "\u51B7\u767D\u65E5\u5149\u706F\u7BA1\uFF0C\u90E8\u5206\u95EA\u70C1\uFF0C\u5730\u9762\u53CD\u5149\uFF0C\u5C3D\u5934\u65E0\u706F\u5F62\u6210\u660E\u6697\u5BF9\u6BD4",
          timeOfDay: "\u6DF1\u591C",
          narrativeFunction: "\u81F3\u6697\u65F6\u523B",
          keyProps: "\u5899\u9762\u5212\u75D5",
          soundDesign: "\u706F\u7BA1\u7535\u6D41\u55DE\u55DE\u58F0\uFF08\u95F4\u6B47\uFF09\uFF0C\u7A7A\u65F7\u56DE\u58F0\uFF0C\u8FDC\u5904\u6C34\u7BA1\u6EF4\u6C34\u58F0\uFF0C\u4F4E\u9891\u4E0D\u5B89\u6C1B\u56F4\u97F3",
          colorPalette: "\u4E3B\u8272\u51B7\u767D(#e8e8e0)/\u6C34\u6CE5\u7070(#8a8a80)\uFF0C\u8F85\u8272\u6697\u9ED1(#0a0a0a)\u5C3D\u5934\u9634\u5F71",
          compositionHint: "\u5355\u70B9\u900F\u89C6\u7EB5\u6DF1\u6784\u56FE\uFF0C\u8D70\u5ECA\u5411\u8FDC\u5904\u6536\u7F29\uFF0C\u706F\u7BA1\u5F15\u5BFC\u89C6\u7EBF\u81F3\u9ED1\u6697\u5C3D\u5934\uFF0C\u5212\u75D5\u4F4D\u4E8E\u5899\u9762\u9EC4\u91D1\u5206\u5272\u70B9",
          imagePromptZh: "\u5730\u4E0B\u8D1F1\u5C42\u6C34\u6CE5\u8D70\u5ECA\uFF0C\u6591\u9A73\u5899\u9762\uFF0C\u65E5\u5149\u706F\u7BA1\u90E8\u5206\u95EA\u70C1\uFF0C\u5899\u9762\u4E00\u9053\u65B0\u9C9C\u5212\u75D5\uFF0C\u5730\u9762\u53CD\u5149\uFF0C\u5C3D\u5934\u9690\u5165\u9ED1\u6697\uFF0C\u8BE1\u5F02\u5BD2\u610F\u6C1B\u56F4\uFF0C\u7EB5\u6DF1\u6784\u56FE\uFF0C16:9\uFF0C\u65E5\u6F2B\u98CE\u683C\uFF0C\u8D5B\u7490\u73DE\u4E0A\u8272\uFF0C\u8272\u5F69\u9C9C\u660E\uFF0C\u6E05\u6670\u7EBF\u6761\uFF0C2D\u52A8\u6F2B\u7F8E\u5B66\uFF0C\u9AD8\u8D28\u91CF\uFF0C\u7EC6\u8282\u4E30\u5BCC",
          imagePromptEn: "underground B1 concrete corridor, peeling walls, flickering fluorescent tubes, fresh scratch on wall, glossy reflective floor, vanishing into darkness at the end, eerie chilling mood, depth perspective composition, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive"
        }
      ]
    },
    storyboard: {
      shots: [
        {
          episode: 1,
          sceneNo: 1,
          shotNo: 1,
          shotType: "\u8FDC\u666F",
          cameraAngle: "\u5E73\u89C6",
          cameraMove: "\u63A8",
          visual: "\u6DF1\u591C\u57CE\u5E02\u4E2D\u72EC\u680B\u529E\u516C\u697C\u5916\u666F\uFF0C\u73BB\u7483\u5E55\u5899\u53CD\u5C04\u8857\u706F\uFF0C\u4EC5\u9876\u5C42\u4E00\u6247\u7A97\u4EAE\u7740\u706F\u5149",
          dialogue: "",
          action: "\u955C\u5934\u7F13\u6162\u63A8\u8FD1\u529E\u516C\u697C",
          duration: 5,
          emotion: 3,
          characterNames: [],
          sceneName: "\u529E\u516C\u697C\u591C\u666F",
          soundDesign: "\u8FDC\u5904\u4EA4\u901A\u4F4E\u9891\u566A\u97F3\u6E10\u5F31 + \u4F4E\u6C89\u6C1B\u56F4\u5F26\u4E50\u94FA\u5E95 + \u98CE\u58F0",
          transition: "\u53E0\u5316",
          promptZh: "\u8FDC\u666F\uFF0C\u6DF1\u591C\u57CE\u5E02\u4E2D\u72EC\u680B\u529E\u516C\u697C\u5916\u666F\uFF0C\u73BB\u7483\u5E55\u5899\u53CD\u5C04\u6708\u5149\u4E0E\u8857\u706F\uFF0C\u4EC5\u9876\u5C42\u4E00\u6247\u7A97\u4EAE\u706F\uFF0C\u8857\u9762\u7A7A\u65F7\u65E0\u4EBA\uFF0C\u955C\u5934\u7F13\u6162\u63A8\u8FD1\uFF0C\u5B64\u5BC2\u538B\u6291\u6C1B\u56F4\uFF0C16:9\uFF0C\u65E5\u6F2B\u98CE\u683C\uFF0C\u8D5B\u7490\u73DE\u4E0A\u8272\uFF0C\u8272\u5F69\u9C9C\u660E\uFF0C\u6E05\u6670\u7EBF\u6761\uFF0C2D\u52A8\u6F2B\u7F8E\u5B66\uFF0C\u9AD8\u8D28\u91CF",
          promptEn: "Wide shot, lone office tower at night, glass curtain wall reflecting moonlight and street lamps, single lit top-floor window, empty street, slow dolly-in, oppressive lonely atmosphere, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive"
        },
        {
          episode: 1,
          sceneNo: 2,
          shotNo: 1,
          shotType: "\u4E2D\u666F",
          cameraAngle: "\u5E73\u89C6",
          cameraMove: "\u56FA\u5B9A",
          visual: "\u6797\u590F\u8D70\u8FDB\u7535\u68AF\u8F7F\u53A2\uFF0C\u8F6C\u8EAB\u6309\u4E0B1\u5C42\u6309\u952E",
          dialogue: "",
          action: "\u6797\u590F\u8D70\u8FDB\u7535\u68AF\u8F6C\u8EAB\u6309\u952E\uFF0C\u95E8\u7F13\u7F13\u5408\u4E0A",
          duration: 4,
          emotion: 2,
          characterNames: ["\u6797\u590F"],
          sceneName: "\u7535\u68AF\u8F7F\u53A2",
          soundDesign: "\u65E5\u5149\u706F\u7535\u6D41\u55E1\u9E23 + \u811A\u6B65\u58F0 + \u6309\u952E\u7535\u5B50\u97F3 + \u95E8\u5173\u95ED\u673A\u68B0\u58F0",
          transition: "\u786C\u5207",
          promptZh: "\u4E2D\u666F\uFF0C28\u5C81\u9F50\u80A9\u77ED\u53D1\u5973\u8BB0\u8005\u7A7F\u9ED1\u8272\u9AD8\u9886\u6BDB\u8863\u4E0E\u6DF1\u7070\u98CE\u8863\u8D70\u8FDB\u4E0D\u9508\u94A2\u7535\u68AF\u8F7F\u53A2\uFF0C\u8F6C\u8EAB\u63091\u5C42\u6309\u952E\uFF0C\u95E8\u7F13\u7F13\u5408\u4E0A\uFF0C\u9876\u706F\uFF0C\u955C\u9762\u56DB\u58C1\u53CD\u5C04\uFF0C\u5E7D\u95ED\u6C1B\u56F4\uFF0C16:9\uFF0C\u65E5\u6F2B\u98CE\u683C\uFF0C\u8D5B\u7490\u73DE\u4E0A\u8272\uFF0C\u8272\u5F69\u9C9C\u660E\uFF0C\u6E05\u6670\u7EBF\u6761\uFF0C2D\u52A8\u6F2B\u7F8E\u5B66\uFF0C\u9AD8\u8D28\u91CF",
          promptEn: "Medium shot, 28yo female with shoulder-length black hair in black turtleneck and dark grey trench coat enters narrow stainless-steel elevator car, turns and presses floor-1 button, doors slowly close, white ceiling light, mirrored walls reflecting, claustrophobic atmosphere, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive"
        },
        {
          episode: 1,
          sceneNo: 2,
          shotNo: 2,
          shotType: "\u7279\u5199",
          cameraAngle: "\u5E73\u89C6",
          cameraMove: "\u56FA\u5B9A",
          visual: "\u7535\u68AF\u6309\u952E\u9762\u677F\uFF0C1\u5C42\u6309\u952E\u4EAE\u8D77\u51B7\u5149",
          dialogue: "",
          action: "\u56FA\u5B9A\u955C\u5934\uFF0C\u6309\u952E\u6570\u5B571\u4EAE\u8D77",
          duration: 2,
          emotion: 2,
          characterNames: [],
          sceneName: "\u7535\u68AF\u8F7F\u53A2",
          soundDesign: "\u6309\u952E\u7535\u5B50\u97F3\uFF08\u6E05\u8106\uFF09 + \u7535\u6D41\u55E1\u9E23\u6301\u7EED",
          transition: "\u786C\u5207",
          promptZh: "\u7279\u5199\uFF0C\u7535\u68AF\u4E0D\u9508\u94A2\u6309\u952E\u9762\u677F\uFF0C\u6570\u5B571\u6309\u952E\u4EAE\u8D77\u51B7\u767D\u5149\uFF0C\u91D1\u5C5E\u53CD\u5149\uFF0C\u666F\u6DF1\u865A\u5316\uFF0C16:9\uFF0C\u65E5\u6F2B\u98CE\u683C\uFF0C\u8D5B\u7490\u73DE\u4E0A\u8272\uFF0C\u8272\u5F69\u9C9C\u660E\uFF0C\u6E05\u6670\u7EBF\u6761\uFF0C2D\u52A8\u6F2B\u7F8E\u5B66\uFF0C\u9AD8\u8D28\u91CF",
          promptEn: "Close-up, stainless-steel elevator button panel, number 1 button glowing cold white, metallic reflection, shallow depth of field, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive"
        },
        {
          episode: 1,
          sceneNo: 2,
          shotNo: 3,
          shotType: "\u4E2D\u666F",
          cameraAngle: "\u5E73\u89C6",
          cameraMove: "\u56FA\u5B9A",
          visual: "\u7535\u68AF\u572814\u697C\u505C\u4E0B\uFF0C\u95E8\u7F13\u7F13\u6253\u5F00\uFF0C\u95E8\u5916\u8D70\u5ECA\u6F06\u9ED1\u65E0\u4EBA",
          dialogue: "",
          action: "\u95E8\u5F00\uFF0C\u6797\u590F\u62AC\u5934\u671B\u5411\u95E8\u5916\u9ED1\u6697",
          duration: 5,
          emotion: 5,
          characterNames: ["\u6797\u590F"],
          sceneName: "\u7535\u68AF\u8F7F\u53A2",
          soundDesign: "\u53EE\u58F0\uFF08\u697C\u5C42\u5230\u8FBE\u63D0\u793A\uFF09 + \u95E8\u5F00\u673A\u68B0\u58F0 + \u7A81\u7136\u5B89\u9759\uFF08\u95E8\u5916\u65E0\u58F0\uFF09 + \u4F4E\u9891\u4E0D\u5B89\u97F3\u6E10\u5165",
          transition: "\u786C\u5207",
          promptZh: "\u4E2D\u666F\uFF0C\u4E0D\u9508\u94A2\u7535\u68AF\u572814\u697C\u505C\u4E0B\u95E8\u7F13\u7F13\u6253\u5F00\uFF0C\u95E8\u5916\u8D70\u5ECA\u6F06\u9ED1\u65E0\u4EBA\uFF0C28\u5C81\u9F50\u80A9\u77ED\u53D1\u5973\u8BB0\u8005\u7A7F\u6DF1\u7070\u98CE\u8863\u62AC\u5934\u671B\u5411\u9ED1\u6697\uFF0C\u9876\u706F\uFF0C\u955C\u9762\u56DB\u58C1\u53CD\u5C04\uFF0C\u7D27\u5F20\u6C1B\u56F4\uFF0C16:9\uFF0C\u65E5\u6F2B\u98CE\u683C\uFF0C\u8D5B\u7490\u73DE\u4E0A\u8272\uFF0C\u8272\u5F69\u9C9C\u660E\uFF0C\u6E05\u6670\u7EBF\u6761\uFF0C2D\u52A8\u6F2B\u7F8E\u5B66\uFF0C\u9AD8\u8D28\u91CF",
          promptEn: "Medium shot, stainless-steel elevator stops at floor 14, doors slowly open to pitch-black empty corridor, 28yo female with shoulder-length hair in dark grey trench coat looks up into darkness, white ceiling light, mirrored walls reflecting, tense mood, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive"
        },
        {
          episode: 1,
          sceneNo: 2,
          shotNo: 4,
          shotType: "\u8FD1\u666F",
          cameraAngle: "\u5E73\u89C6",
          cameraMove: "\u56FA\u5B9A",
          visual: "\u6797\u590F\u76B1\u7709\uFF0C\u8FDE\u7EED\u6309\u4E0B\u5173\u95E8\u952E",
          dialogue: "",
          action: "\u624B\u6307\u53CD\u590D\u6309\u5173\u95E8\u952E\uFF0C\u795E\u60C5\u7126\u8651",
          duration: 3,
          emotion: 6,
          characterNames: ["\u6797\u590F"],
          sceneName: "\u7535\u68AF\u8F7F\u53A2",
          soundDesign: "\u8FDE\u7EED\u6309\u952E\u58F0\uFF08\u6025\u4FC3\uFF09 + \u547C\u5438\u58F0\u52A0\u91CD + \u4F4E\u9891\u5F26\u4E50\u6E10\u5F3A",
          transition: "\u786C\u5207",
          promptZh: "\u8FD1\u666F\uFF0C28\u5C81\u9F50\u80A9\u77ED\u53D1\u5973\u8BB0\u8005\u51B7\u767D\u80A4\u8272\u76B1\u7709\uFF0C\u5927\u773C\u7126\u8651\uFF0C\u624B\u6307\u53CD\u590D\u6309\u4E0B\u5173\u95E8\u952E\uFF0C\u795E\u60C5\u7126\u8651\u538B\u6291\uFF0C\u9876\u706F\uFF0C\u7D27\u5F20\u6C1B\u56F4\uFF0C16:9\uFF0C\u65E5\u6F2B\u98CE\u683C\uFF0C\u8D5B\u7490\u73DE\u4E0A\u8272\uFF0C\u8272\u5F69\u9C9C\u660E\uFF0C\u6E05\u6670\u7EBF\u6761\uFF0C2D\u52A8\u6F2B\u7F8E\u5B66\uFF0C\u9AD8\u8D28\u91CF",
          promptEn: "Close shot, 28yo female with shoulder-length black hair pale skin frowns, large anxious eyes, finger repeatedly pressing close-door button, anxious restrained expression, white ceiling light, tense atmosphere, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive"
        },
        {
          episode: 1,
          sceneNo: 2,
          shotNo: 5,
          shotType: "\u7279\u5199",
          cameraAngle: "\u5E73\u89C6",
          cameraMove: "\u624B\u6301",
          visual: "\u697C\u5C42\u663E\u793A\u5C4F\u6570\u5B57\u5FEB\u901F\u4E0B\u964D\uFF1A13\u300110\u30017\u30014\u3001\u8D1F1",
          dialogue: "",
          action: "\u6570\u5B57\u8DF3\u52A8\u4E0B\u884C\uFF0C\u753B\u9762\u5FAE\u5FAE\u9707\u52A8",
          duration: 3,
          emotion: 7,
          characterNames: [],
          sceneName: "\u7535\u68AF\u8F7F\u53A2",
          soundDesign: "\u6570\u5B57\u8DF3\u52A8\u7535\u5B50\u97F3\uFF08\u52A0\u901F\uFF09 + \u753B\u9762\u9707\u52A8\u4F4E\u9891\u8F70\u9E23 + \u5F26\u4E50\u6025\u4FC3\u4E0A\u884C",
          transition: "\u8DF3\u5207",
          promptZh: "\u7279\u5199\uFF0C\u7535\u68AF\u697C\u5C42\u663E\u793A\u5C4F\u6570\u5B57\u5FEB\u901F\u4E0B\u964D13\u5230\u8D1F1\uFF0C\u7EA2\u8272\u6570\u5B57\u8DF3\u52A8\u95EA\u70C1\uFF0C\u753B\u9762\u5FAE\u9707\uFF0C\u7D27\u5F20\u60AC\u7591\uFF0C16:9\uFF0C\u65E5\u6F2B\u98CE\u683C\uFF0C\u8D5B\u7490\u73DE\u4E0A\u8272\uFF0C\u8272\u5F69\u9C9C\u660E\uFF0C\u6E05\u6670\u7EBF\u6761\uFF0C2D\u52A8\u6F2B\u7F8E\u5B66\uFF0C\u9AD8\u8D28\u91CF",
          promptEn: "Close-up, elevator floor display numbers rapidly descending 13 to B1, red digits flickering, slight camera shake, tense thriller tone, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive"
        },
        {
          episode: 1,
          sceneNo: 3,
          shotNo: 1,
          shotType: "\u4E2D\u666F",
          cameraAngle: "\u5E73\u89C6",
          cameraMove: "\u79FB",
          visual: "\u8D1F1\u5C42\u8D70\u5ECA\u95E8\u5F00\uFF0C\u60E8\u767D\u706F\u7BA1\u4E0B\u5899\u9762\u6709\u4E00\u9053\u65B0\u9C9C\u5212\u75D5",
          dialogue: "",
          action: "\u955C\u5934\u4ECE\u7535\u68AF\u5185\u671B\u5411\u8D70\u5ECA\uFF0C\u706F\u5149\u95EA\u70C1",
          duration: 5,
          emotion: 8,
          characterNames: [],
          sceneName: "\u8D1F1\u5C42\u8D70\u5ECA",
          soundDesign: "\u706F\u7BA1\u55DE\u55DE\u58F0\uFF08\u95F4\u6B47\u95EA\u70C1\u540C\u6B65\uFF09 + \u7A7A\u65F7\u56DE\u58F0 + \u6C34\u7BA1\u6EF4\u6C34\u58F0 + \u4F4E\u9891\u4E0D\u5B89\u6C1B\u56F4\u97F3",
          transition: "\u58F0\u97F3\u6865\u63A5",
          promptZh: "\u4E2D\u666F\uFF0C\u5730\u4E0B\u8D1F1\u5C42\u6C34\u6CE5\u8D70\u5ECA\u95E8\u5F00\uFF0C\u65E5\u5149\u706F\u7BA1\u90E8\u5206\u95EA\u70C1\uFF0C\u6591\u9A73\u5899\u9762\u4E0A\u4E00\u9053\u65B0\u9C9C\u5212\u75D5\uFF0C\u5730\u9762\u53CD\u5149\uFF0C\u5C3D\u5934\u9690\u5165\u9ED1\u6697\uFF0C\u8BE1\u5F02\u5BD2\u610F\u6C1B\u56F4\uFF0C\u7EB5\u6DF1\u6784\u56FE\uFF0C16:9\uFF0C\u65E5\u6F2B\u98CE\u683C\uFF0C\u8D5B\u7490\u73DE\u4E0A\u8272\uFF0C\u8272\u5F69\u9C9C\u660E\uFF0C\u6E05\u6670\u7EBF\u6761\uFF0C2D\u52A8\u6F2B\u7F8E\u5B66\uFF0C\u9AD8\u8D28\u91CF",
          promptEn: "Medium shot, underground B1 concrete corridor door opens, flickering fluorescent tubes, fresh scratch on peeling wall, glossy reflective floor, vanishing into darkness at the end, eerie chilling mood, depth perspective composition, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive"
        },
        {
          episode: 1,
          sceneNo: 2,
          shotNo: 6,
          shotType: "\u8FD1\u666F",
          cameraAngle: "\u5E73\u89C6",
          cameraMove: "\u63A8",
          visual: "\u7535\u68AF\u955C\u9762\u91CC\uFF0C\u6797\u590F\u8EAB\u540E\u7AD9\u7740\u4E00\u4E2A\u7A7F\u7070\u8272\u98CE\u8863\u7684\u4EBA\u5F71\uFF0C\u4EBA\u5F71\u62AC\u624B\u6307\u5411\u630E\u5305",
          dialogue: "\u8001\u5468(\u5BF9\u8BB2\u673A): \u6797\u8BB0\u8005\uFF0C\u4F60\u522B\u56DE\u5934\u3002",
          action: "\u6797\u590F\u50F5\u4F4F\uFF0C\u4EBA\u5F71\u7F13\u7F13\u62AC\u624B",
          duration: 6,
          emotion: 10,
          characterNames: ["\u6797\u590F", "\u4EBA\u5F71"],
          sceneName: "\u7535\u68AF\u8F7F\u53A2",
          soundDesign: '\u5BF9\u8BB2\u673A\u7535\u6D41\u58F0 + \u8001\u5468\u538B\u4F4E\u6C14\u58F0 "\u6797\u8BB0\u8005\uFF0C\u4F60\u522B\u56DE\u5934" + \u5FC3\u8DF3\u58F0\u52A0\u901F + \u5F26\u4E50\u5347\u81F3\u6700\u9AD8 + \u706F\u706D\u77AC\u95F4\u7535\u6D41\u4E2D\u65AD\u58F0',
          transition: "\u786C\u5207\u81F3\u9ED1\u5C4F",
          promptZh: "\u8FD1\u666F\uFF0C\u7535\u68AF\u955C\u9762\u56DB\u58C1\u53CD\u5C04\u4E2D\uFF0C28\u5C81\u9F50\u80A9\u77ED\u53D1\u5973\u8BB0\u8005\u7A7F\u6DF1\u7070\u98CE\u8863\u8EAB\u540E\u7AD9\u7740\u4E00\u4E2A\u7A7F\u7070\u8272\u7ACB\u9886\u98CE\u8863\u7684\u4FEE\u957F\u4EBA\u5F71\uFF0C\u9762\u5BB9\u9690\u4E8E\u9634\u5F71\uFF0C\u4EBA\u5F71\u7F13\u7F13\u62AC\u624B\u6307\u5411\u5E06\u5E03\u630E\u5305\uFF0C\u9876\u706F\u9AA4\u706D\u524D\u4E00\u523B\uFF0C\u60CA\u609A\u60AC\u7591\uFF0C16:9\uFF0C\u65E5\u6F2B\u98CE\u683C\uFF0C\u8D5B\u7490\u73DE\u4E0A\u8272\uFF0C\u8272\u5F69\u9C9C\u660E\uFF0C\u6E05\u6670\u7EBF\u6761\uFF0C2D\u52A8\u6F2B\u7F8E\u5B66\uFF0C\u9AD8\u8D28\u91CF",
          promptEn: "Close shot, elevator mirrored walls reflection, 28yo female with shoulder-length hair in dark grey trench coat with a tall slender grey high-collar trench coat silhouette standing behind her, face hidden in shadow, silhouette slowly raising hand pointing at canvas shoulder bag, moment before white light cuts out, horror thriller mood, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive"
        }
      ]
    },
    script: `## \u{1F4DD} \u77ED\u5267\u811A\u672C

### \u57FA\u672C\u4FE1\u606F
- **\u5267\u540D**\uFF1A\u6700\u540E\u4E00\u73ED\u7535\u68AF
- **\u96C6\u6570**\uFF1A1\u96C6
- **\u6BCF\u96C6\u65F6\u957F**\uFF1A60\u79D2
- **\u7C7B\u578B/\u98CE\u683C**\uFF1A\u60AC\u7591/\u60CA\u609A\uFF0C\u65E5\u6F2B\u60AC\u7591\u98CE\u683C
- **\u76EE\u6807\u53D7\u4F17**\uFF1A18-35\u5C81\u60AC\u7591\u7231\u597D\u8005

### \u5267\u60C5\u5927\u7EB2
\u8C03\u67E5\u8BB0\u8005\u6797\u590F\u6DF1\u591C\u52A0\u73ED\u540E\u72EC\u81EA\u4E58\u7535\u68AF\u4E0B\u697C\uFF0C\u7535\u68AF\u5728\u5931\u8E2A\u6848\u53D1\u751F\u768414\u697C\u5F02\u5E38\u505C\u4E0B\uFF0C\u968F\u540E\u53CD\u5411\u5760\u81F3\u8D1F1\u5C42\u3002\u8D1F1\u5C42\u8D70\u5ECA\u7684\u5212\u75D5\u4E0E\u5979\u6B63\u5728\u8C03\u67E5\u7684\u7A3F\u5B50\u63CF\u8FF0\u4E00\u81F4\uFF0C\u5BF9\u8BB2\u673A\u4F20\u6765\u4FDD\u5B89\u8001\u5468\u7684\u8B66\u544A\uFF0C\u955C\u4E2D\u51FA\u73B0\u795E\u79D8\u4EBA\u5F71\u6307\u5411\u5979\u7684\u7B14\u8BB0\u2014\u2014\u706F\u706D\u3002

### \u7B2C 1 \u96C6\uFF1A\u6700\u540E\u4E00\u73ED\u7535\u68AF

#### \u573A\u666F 1\uFF1A\u529E\u516C\u697C\u5916\u666F - \u6DF1\u591C - \u5BA4\u5916
- **\u65F6\u95F4**\uFF1A\u51CC\u66681\u70B9
- **\u5730\u70B9**\uFF1A\u57CE\u5E02\u529E\u516C\u697C\u5916
- **\u4EBA\u7269**\uFF1A\u65E0
- **\u753B\u9762\u63CF\u8FF0**\uFF1A\u8FDC\u666F\uFF0C\u6708\u5149\u4E0B\u72EC\u680B\u529E\u516C\u697C\uFF0C\u73BB\u7483\u5E55\u5899\u53CD\u5C04\u8857\u706F\uFF0C\u4EC5\u9876\u5C42\u4E00\u6247\u7A97\u4EAE\u706F\uFF0C\u8857\u9762\u7A7A\u65E0\u4E00\u4EBA\u3002\u955C\u5934\u7F13\u6162\u63A8\u8FD1\u3002
- **\u97F3\u6548/BGM**\uFF1A\u8FDC\u5904\u4EA4\u901A\u4F4E\u9891\u566A\u97F3\u6E10\u5F31\uFF0C\u4F4E\u6C89\u6C1B\u56F4\u5F26\u4E50\u94FA\u5E95\uFF0C\u98CE\u58F0
- **[\u8F6C\u573A\u8BBE\u8BA1]**\uFF1A\u53E0\u5316\u81F3\u7535\u68AF\u5185\u666F\uFF0C\u58F0\u97F3\u4ECE\u98CE\u58F0\u8FC7\u6E21\u5230\u65E5\u5149\u706F\u7535\u6D41\u55E1\u9E23

#### \u573A\u666F 2\uFF1A\u7535\u68AF\u8F7F\u53A2 - \u6DF1\u591C - \u5BA4\u5185
- **\u65F6\u95F4**\uFF1A\u51CC\u66681\u70B9
- **\u5730\u70B9**\uFF1A\u529E\u516C\u697C\u7535\u68AF
- **\u4EBA\u7269**\uFF1A\u6797\u590F
- **\u753B\u9762\u63CF\u8FF0**\uFF1A\u4E2D\u666F\uFF0C\u6797\u590F\u8D70\u8FDB\u4E0D\u9508\u94A2\u7535\u68AF\uFF0C\u8F6C\u8EAB\u63091\u5C42\u3002\u95E8\u5408\u4E0A\uFF0C\u65E5\u5149\u706F\u55E1\u9E23\u3002\u955C\u9762\u56DB\u58C1\u53CD\u5C04\u5979\u6E05\u7626\u7684\u8EAB\u5F71\u3002

**\u6797\u590F**\uFF1A\uFF08\u4F4E\u5934\u770B\u624B\u673A\uFF0C\u75B2\u60EB\u4F46\u4E13\u6CE8\uFF0C\u624B\u6307\u6ED1\u52A8\u5C4F\u5E55\u4E0A\u7684\u7A3F\u5B50\u300A\u5341\u56DB\u697C\u5931\u8E2A\u8005\u300B\u3002\u8BED\u6C14\u5E73\u9759\u81EA\u8BED\uFF09"\u5C31\u5DEE\u6700\u540E\u6838\u5B9E\u2026\u2026"
  - \u6F5C\u53F0\u8BCD\uFF1A\u8FD9\u7BC7\u7A3F\u5B50\u662F\u5979\u8FFD\u67E5\u591A\u65E5\u7684\u5FC3\u8840\uFF0C\u5FC5\u987B\u4ECA\u665A\u53D1\u51FA\u53BB

\uFF08\u53EE\u300214\u697C\u3002\u95E8\u5F00\uFF0C\u8D70\u5ECA\u6F06\u9ED1\u65E0\u4EBA\u3002\u6797\u590F\u76B1\u7709\u8FDE\u6309\u5173\u95E8\u952E\u3002\u95E8\u5408\u4E0A\uFF0C\u7535\u68AF\u53CD\u5411\u5760\u843D\u3002\u697C\u5C42\uFF1A13\u300110\u30017\u30014\u3001\u8D1F1\u3002\uFF09

**\u6797\u590F**\uFF1A\uFF08\u547C\u5438\u6025\u4FC3\uFF0C\u624B\u7D27\u63E1\u630E\u5305\u5E26\uFF0C\u773C\u795E\u4ECE\u56F0\u60D1\u8F6C\u4E3A\u8B66\u89C9\u3002\u514B\u5236\u4F4E\u58F0\uFF09"\u4E0D\u5BF9\u2026\u2026"
  - \u6F5C\u53F0\u8BCD\uFF1A\u7A3F\u5B50\u91CC\u5199\u7684\u90A3\u4E9B\u5F02\u5E38\u2026\u2026\u662F\u771F\u7684\uFF1F

- **\u97F3\u6548/BGM**\uFF1A\u53EE\u58F0 \u2192 \u95E8\u5F00\u673A\u68B0\u58F0 \u2192 \u7A81\u7136\u5B89\u9759 \u2192 \u8FDE\u7EED\u6309\u952E\u58F0\u6025\u4FC3 \u2192 \u6570\u5B57\u8DF3\u52A8\u7535\u5B50\u97F3\u52A0\u901F \u2192 \u4F4E\u9891\u8F70\u9E23 \u2192 \u5F26\u4E50\u6025\u4FC3\u4E0A\u884C
- **[\u8F6C\u573A\u8BBE\u8BA1]**\uFF1A\u8DF3\u5207\u81F3\u697C\u5C42\u663E\u793A\u5C4F\u7279\u5199\uFF0C\u6570\u5B57\u5FEB\u901F\u4E0B\u5760\u5236\u9020\u5931\u91CD\u611F

#### \u573A\u666F 3\uFF1A\u8D1F1\u5C42\u8D70\u5ECA - \u6DF1\u591C - \u5BA4\u5185
- **\u65F6\u95F4**\uFF1A\u51CC\u66681\u70B9\u540E
- **\u5730\u70B9**\uFF1A\u5730\u4E0B\u8D1F1\u5C42\u8D70\u5ECA
- **\u4EBA\u7269**\uFF1A\u65E0
- **\u753B\u9762\u63CF\u8FF0**\uFF1A\u4E2D\u666F\uFF0C\u95E8\u5F00\u3002\u706F\u7BA1\u95EA\u70C1\uFF0C\u5899\u9762\u4E00\u9053\u65B0\u9C9C\u5212\u75D5\u2014\u2014\u4E0E\u7A3F\u5B50\u63CF\u8FF0\u4E00\u6A21\u4E00\u6837\u3002\u955C\u5934\u4ECE\u7535\u68AF\u5185\u671B\u5411\u8D70\u5ECA\uFF0C\u7EB5\u6DF1\u6784\u56FE\uFF0C\u5C3D\u5934\u9ED1\u6697\u3002
- **\u97F3\u6548/BGM**\uFF1A\u706F\u7BA1\u55DE\u55DE\u58F0\u95F4\u6B47 + \u7A7A\u65F7\u56DE\u58F0 + \u6C34\u7BA1\u6EF4\u6C34\u58F0 + \u4F4E\u9891\u4E0D\u5B89\u6C1B\u56F4\u97F3
- **[\u8F6C\u573A\u8BBE\u8BA1]**\uFF1A\u58F0\u97F3\u6865\u63A5\u2014\u2014\u6EF4\u6C34\u58F0\u5EF6\u7EED\uFF0C\u5BF9\u8BB2\u673A\u7535\u6D41\u58F0\u6E10\u5165

#### \u573A\u666F 4\uFF1A\u7535\u68AF\u8F7F\u53A2 - \u6DF1\u591C - \u5BA4\u5185
- **\u65F6\u95F4**\uFF1A\u51CC\u66681\u70B9\u540E
- **\u5730\u70B9**\uFF1A\u529E\u516C\u697C\u7535\u68AF
- **\u4EBA\u7269**\uFF1A\u6797\u590F\u3001\u4EBA\u5F71\uFF08\u955C\u4E2D\uFF09\u3001\u8001\u5468\uFF08\u5BF9\u8BB2\u673A\u58F0\u97F3\uFF09

**\u8001\u5468**\uFF1A\uFF08\u5BF9\u8BB2\u673A\u7535\u6D41\u58F0\uFF0C\u58F0\u97F3\u53D1\u7D27\uFF0C\u6C14\u58F0\u6025\u4FC3\uFF09"\u6797\u8BB0\u8005\uFF0C\u4F60\u522B\u56DE\u5934\u3002"
  - \u6F5C\u53F0\u8BCD\uFF1A\u6211\u770B\u5230\u76D1\u63A7\u4E86\uFF0C\u4F60\u8EAB\u540E\u6709\u4E1C\u897F\uFF0C\u6211\u4E0D\u6562\u8BF4\u592A\u6E05\u695A

\uFF08\u6797\u590F\u50F5\u4F4F\u3002\u955C\u9762\u4E2D\uFF0C\u8EAB\u540E\u7AD9\u7740\u4E00\u4E2A\u7A7F\u7070\u8272\u98CE\u8863\u7684\u4EBA\u5F71\uFF0C\u9762\u5BB9\u9690\u4E8E\u9634\u5F71\u3002\u4EBA\u5F71\u7F13\u7F13\u62AC\u624B\uFF0C\u6307\u5411\u630E\u5305\u91CC\u7684\u7B14\u8BB0\u3002\uFF09

**\u6797\u590F**\uFF1A\uFF08\u77B3\u5B54\u653E\u5927\uFF0C\u5634\u5507\u5FAE\u5F20\u4F46\u65E0\u58F0\uFF0C\u8EAB\u4F53\u50F5\u76F4\u4E0D\u6562\u52A8\uFF09
  - \u6F5C\u53F0\u8BCD\uFF1A\u5B83\u2026\u2026\u5728\u627E\u6211\u7684\u7A3F\u5B50\uFF1F

\uFF08\u706F\uFF0C\u706D\u4E86\u3002\u9ED1\u5C4F\u3002\u5BF9\u8BB2\u673A\u6B8B\u4F59\u7535\u6D41\u58F0\uFF1A\u6797\u2026\u2026\u8BB0\u2026\u2026\uFF09

- **\u97F3\u6548/BGM**\uFF1A\u5BF9\u8BB2\u673A\u7535\u6D41\u58F0 + \u8001\u5468\u6C14\u58F0 + \u5FC3\u8DF3\u58F0\u52A0\u901F\u81F3\u6700\u5F3A + \u5F26\u4E50\u5347\u81F3\u6700\u9AD8 \u2192 \u706F\u706D\u77AC\u95F4\u7535\u6D41\u4E2D\u65AD\u58F0 \u2192 2\u79D2\u7EAF\u9ED1\u5C4F\u9759\u9ED8 \u2192 \u6B8B\u4F59\u7535\u6D41\u58F0"\u6797\u2026\u2026\u8BB0\u2026\u2026"\u6E10\u5F31
- **[\u8F6C\u573A\u8BBE\u8BA1]**\uFF1A\u786C\u5207\u81F3\u9ED1\u5C4F\uFF0C\u6240\u6709\u58F0\u97F3\u9AA4\u505C2\u79D2\u540E\u4EC5\u7559\u5BF9\u8BB2\u673A\u6B8B\u4F59\u7535\u6D41\u58F0

### \u672C\u96C6\u8981\u70B9
- **\u6838\u5FC3\u51B2\u7A81**\uFF1A\u771F\u76F8\u8C03\u67E5\u8005 vs \u672A\u77E5\u8D85\u81EA\u7136\u529B\u91CF
- **\u60C5\u611F\u9AD8\u6F6E**\uFF1A\u955C\u4E2D\u4EBA\u5F71\u62AC\u624B\u6307\u5411\u7B14\u8BB0\uFF0810\u5206\uFF09
- **\u7ED3\u5C3E\u94A9\u5B50**\uFF1A\u706F\u706D\u9ED1\u5C4F + \u8001\u5468\u7535\u6D41\u58F0\u6B8B\u7559"\u6797\u2026\u2026\u8BB0\u2026\u2026"\u2014\u2014\u5F00\u653E\u5F0F\u60AC\u5FF5

---

**\u8BF7\u786E\u4FDD**\uFF1A
1. \u8282\u594F\u7D27\u51D1\uFF0C\u5BF9\u767D\u81EA\u7136\uFF0C\u9002\u5408\u77ED\u89C6\u9891\u5E73\u53F0\u4F20\u64AD
2. \u5BF9\u767D\u6709\u6F5C\u53F0\u8BCD\uFF0C\u4E0D\u662F\u76F4\u767D\u7684\u4FE1\u606F\u4F20\u9012
3. \u8868\u6F14\u6307\u5BFC\u5177\u4F53\u53EF\u6267\u884C\uFF0C\u5BFC\u6F14\u548C\u6F14\u5458\u80FD\u76F4\u63A5\u7406\u89E3
4. \u8F6C\u573A\u8BBE\u8BA1\u6709\u60C5\u7EEA\u76EE\u7684\uFF0C\u4E0D\u662F\u7B80\u5355\u7684\u786C\u5207
5. \u753B\u9762\u63CF\u8FF0\u4F7F\u7528\u7535\u5F71\u5316\u8BED\u8A00\uFF0C\u4E0D\u662F\u5C0F\u8BF4\u53D9\u8FF0`,
    assets: `## \u{1F3A8} \u89C6\u89C9\u8D44\u4EA7\u8BBE\u8BA1

### 0. \u5168\u5C40\u89C6\u89C9\u98CE\u683C\u5B9A\u4E49
- **\u6574\u4F53\u98CE\u683C**\uFF1A\u65E5\u6F2B\u60AC\u7591\u6050\u6016\u98CE\u683C\uFF0C\u8D5B\u7490\u73DE\u4E0A\u8272\uFF0C\u7EBF\u6761\u6E05\u6670\uFF0C\u53C2\u8003\u300AAnother\u300B\u300A\u6B7B\u4EA1\u7B14\u8BB0\u300B\u7684\u65E5\u5E38\u7A7A\u95F4\u6050\u6016\u7F8E\u5B66
- **\u8272\u8C03\u4F53\u7CFB**\uFF1A\u4E3B\u8272\u6DF1\u84DD(#1a2a3e)/\u6697\u7D2B(#2a1a3e)\uFF0C\u8F85\u8272\u6696\u9EC4(#d4a843)\u8857\u706F\u70B9\u7F00\uFF0C\u70B9\u7F00\u8840\u7EA2(#8b0000)\u5371\u9669\u6697\u793A
- **\u53C2\u8003\u4F5C\u54C1**\uFF1A\u300AAnother\u300B\uFF08\u65E5\u5E38\u7A7A\u95F4\u4E2D\u7684\u8BC5\u5492\u6050\u6016\uFF09\u3001\u300A\u6B7B\u4EA1\u7B14\u8BB0\u300B\uFF08\u6697\u8C03\u60AC\u7591\u7EBF\u6761\u98CE\u683C\uFF09\u3001\u300AMononoke\u300B\uFF08\u602A\u5F02\u6C1B\u56F4\u8868\u73B0\uFF09
- **\u901A\u7528\u753B\u9762\u8981\u6C42**\uFF1Aclean line art, cel shading, detailed eyes, expressive, high quality

### 1. \u89D2\u8272\u7ACB\u7ED8
\u4E3A\u6BCF\u4E2A\u4E3B\u8981\u89D2\u8272\u751F\u6210\uFF1A
- **\u6797\u590F\u5168\u8EAB\u7ACB\u7ED8 Prompt**\uFF1A28yo female journalist, shoulder-length black hair, pale skin, lean features, large sharp eyes, black turtleneck, dark grey trench coat, canvas shoulder bag, ID lanyard, standing pose, calm expression, clean line art, cel shading
- **\u6797\u590F\u534A\u8EAB\u50CF Prompt**\uFF1A28yo female journalist upper body, shoulder-length black hair, pale skin, tired under-eyes, large eyes, black turtleneck collar, clean line art, cel shading, detailed eyes
- **\u6797\u590F\u8868\u60C5\u5305 Prompt**\uFF1A5 emotions face close-up sheet, 28yo female, shoulder-length black hair, pale skin, expressions: calm/focused/anxious/fearful/shocked, black turtleneck, clean line art, cel shading
- **\u6797\u590F\u6807\u5FD7\u6027\u52A8\u4F5C Prompt**\uFF1Afemale journalist gripping shoulder bag strap tightly, knuckles white, tense posture, shoulder-length hair, dark grey trench coat, clean line art, cel shading
- **\u8001\u5468\u5168\u8EAB\u7ACB\u7ED8 Prompt**\uFF1A52yo male security guard, grey buzz cut, square jaw, stubble, thick eyebrows, dark blue uniform, walkie-talkie on chest, flashlight on waist, restrained tense pose, clean line art, cel shading
- **\u4EBA\u5F71\u5168\u8EAB\u7ACB\u7ED8 Prompt**\uFF1Amysterious tall slender silhouette, grey high-collar trench coat, face hidden in shadow, pale hands hanging down, eerie thriller atmosphere, clean line art, cel shading

### 2. \u5173\u952E\u573A\u666F\u56FE
- **\u529E\u516C\u697C\u591C\u666F\u5168\u666F Prompt**\uFF1Awide shot lone office tower at night, glass curtain wall, moonlight, single lit top-floor window, empty street, oppressive lonely mood, clean line art, cel shading
- **\u529E\u516C\u697C\u591C\u666F\u7EC6\u8282 Prompt**\uFF1Aclose-up of single lit top-floor window at night, glass curtain wall reflection, moonlight, ominous feeling, clean line art, cel shading
- **\u7535\u68AF\u8F7F\u53A2\u5168\u666F Prompt**\uFF1Anarrow stainless steel elevator interior, mirrored walls, fluorescent light, metallic reflections, claustrophobic, clean line art, cel shading
- **\u7535\u68AF\u8F7F\u53A2\u7EC6\u8282 Prompt**\uFF1Aclose-up elevator button panel, floor 1 glowing cold white, stainless steel reflection, shallow depth of field, clean line art, cel shading
- **\u8D1F1\u5C42\u8D70\u5ECA\u5168\u666F Prompt**\uFF1Aunderground B1 concrete corridor, flickering fluorescent, peeling wall with scratch, glossy floor, darkness at end, eerie, clean line art, cel shading
- **\u8D1F1\u5C42\u8D70\u5ECA\u7EC6\u8282 Prompt**\uFF1Aclose-up of fresh scratch on peeling concrete wall, flickering fluorescent light, eerie atmosphere, clean line art, cel shading

### 3. \u9053\u5177/\u7269\u54C1
- **\u8C03\u67E5\u7B14\u8BB0 Prompt**\uFF1Aworn leather notebook, handwritten pages, journalist notes, dim light, close-up, clean line art, cel shading
- **\u5BF9\u8BB2\u673A Prompt**\uFF1Aold walkie-talkie, crackling static, dim green LED, security equipment, close-up, clean line art, cel shading
- **\u5899\u9762\u5212\u75D5 Prompt**\uFF1Afresh scratch on peeling concrete wall, flickering fluorescent light, eerie, close-up, clean line art, cel shading

### 4. \u5C01\u9762/\u6D77\u62A5
- **\u4E3B\u89C6\u89C9 Prompt**\uFF1Aelevator mirror reflection, female journalist silhouette in dark grey trench coat, mysterious tall grey figure standing behind, face hidden in shadow, horror atmosphere, vertical poster, clean line art, cel shading
- **\u5267\u540D\u6392\u7248\u5EFA\u8BAE**\uFF1A\u767D\u8272\u65E0\u886C\u7EBF\u7C97\u4F53\uFF08\u5982\u9ED1\u4F53 Bold\uFF09\uFF0C\u5C45\u4E2D\u504F\u4E0B\uFF0C\u5E26\u8F7B\u5FAE\u6296\u52A8\u6548\u679C\uFF0C\u5B57\u53F7\u5360\u753B\u9762\u5BBD\u5EA660%
- **\u7CFB\u5217\u6D77\u62A5\u65B9\u6848**\uFF1A\u7EDF\u4E00\u6DF1\u84DD\u6697\u7D2B\u4E3B\u8C03\uFF0C\u6BCF\u5F20\u4EE5\u4E0D\u540C\u573A\u666F\u7684"\u5F02\u5E38\u77AC\u95F4"\u4E3A\u4E3B\u89C6\u89C9\uFF0C\u5E95\u90E8\u7EDF\u4E00\u6392\u7248\u5267\u540D

### 5. \u98CE\u683C\u53C2\u8003\u56FE\u96C6
- **\u53C2\u8003\u4F5C\u54C1 1**\uFF1A\u300AAnother\u300B \u2014 \u53C2\u8003\u5176\u65E5\u5E38\u7A7A\u95F4\u4E2D\u7684\u8BC5\u5492\u6050\u6016\u548C\u4EBA\u7269\u5927\u773C\u8868\u73B0
- **\u53C2\u8003\u4F5C\u54C1 2**\uFF1A\u300A\u6B7B\u4EA1\u7B14\u8BB0\u300B \u2014 \u53C2\u8003\u5176\u6697\u8C03\u7EBF\u6761\u98CE\u683C\u548C\u60AC\u7591\u6C1B\u56F4\u6E32\u67D3
- **\u53C2\u8003\u827A\u672F\u5BB6/\u753B\u5E08**\uFF1A\u5C0F\u7551\u5065 \u2014 \u53C2\u8003\u5176\u7CBE\u7EC6\u7EBF\u6761\u548C\u6697\u8C03\u4E0A\u8272\u98CE\u683C`
  },
  manga: {
    title: "\u6700\u540E\u4E00\u73ED\u7535\u68AF",
    totalPages: 2,
    styleType: "\u65E5\u6F2B",
    platform: "\u54D4\u54E9\u54D4\u54E9\u6F2B\u753B",
    readingDirection: "right-to-left",
    synopsis: "\u6DF1\u591C\u52A0\u73ED\u7684\u5973\u8BB0\u8005\u6797\u590F\u4E58\u5750\u6700\u540E\u4E00\u73ED\u7535\u68AF\uFF0C\u53D1\u73B0\u955C\u4E2D\u5012\u5F71\u51FA\u73B0\u5F02\u5E38\uFF0C\u4E00\u6B65\u6B65\u63ED\u5F00\u5927\u697C\u91CC\u9690\u85CF\u7684\u6050\u6016\u79D8\u5BC6\u3002",
    pages: [
      {
        pageNum: 1,
        narrativePace: "\u94FA\u57AB",
        pageHook: '\u955C\u4E2D\u7684"\u5979"\u7F13\u7F13\u8F6C\u8FC7\u5934\uFF0C\u9732\u51FA\u4E00\u4E2A\u4E0D\u5C5E\u4E8E\u6797\u590F\u7684\u7B11\u5BB9...',
        panels: [
          {
            panelNum: 1,
            layout: "\u4E0D\u89C4\u5219\u5927\u683C",
            sizeHint: "\u5927\u683C(\u91CD\u8981)",
            sceneDesc: "\u6DF1\u591C\u7A7A\u65F7\u7684\u5199\u5B57\u697C\u5927\u5385\uFF0C\u6797\u590F\u72EC\u81EA\u8D70\u5411\u7535\u68AF\uFF0C\u80CC\u666F\u662F\u5173\u706F\u540E\u7684\u529E\u516C\u533A\uFF0C\u53EA\u6709\u7535\u68AF\u6307\u793A\u706F\u4EAE\u7740",
            characterExpressions: "\u6797\u590F\u75B2\u60EB\u7684\u8868\u60C5\uFF0C\u5FAE\u5FAE\u4F4E\u5934\uFF0C\u624B\u63D0\u5305\u642D\u5728\u80A9\u4E0A",
            dialogue: [{ position: "\u53F3\u4E0A", speaker: "\u65C1\u767D", text: "\u51CC\u66681\u70B917\u5206\uFF0C\u52A0\u73ED\u5230\u6700\u540E\u7684\u53EA\u6709\u6211\u3002" }],
            narration: { position: "\u5DE6\u4E0A", text: "\u8FD9\u680B\u697C\u7684\u6700\u540E\u4E00\u73ED\u7535\u68AF\uFF0C\u4F20\u8BF4\u51CC\u6668\u540E\u53EA\u4E0B\u4E0D\u4E0A..." },
            soundEffect: { text: "\u53EE\u2014\u2014", style: "\u5370\u5237\u4F53", position: "\u7535\u68AF\u95E8\u65C1" },
            emotionSymbols: [],
            transitionToNext: "\u65F6\u95F4\u8DF3\u8DC3",
            imagePromptZh: "\u6DF1\u591C\u7A7A\u65F7\u5199\u5B57\u697C\u5927\u5385\uFF0C\u5E74\u8F7B\u5973\u8BB0\u8005\u7A7F\u6DF1\u7070\u8272\u98CE\u8863\u72EC\u81EA\u8D70\u5411\u7535\u68AF\uFF0C\u80CC\u666F\u5173\u706F\u529E\u516C\u533A\u660F\u6697\uFF0C\u53EA\u6709\u7535\u68AF\u6307\u793A\u706F\u4EAE\u8D77\u51B7\u5149\uFF0Canime style, Japanese animation, cel shading, vibrant colors, clean line art, mysterious atmosphere",
            imagePromptEn: "comic panel, large establishing shot, late night empty office building lobby, young female journalist in dark grey trench coat walking alone towards elevator, dark background with only elevator indicator light glowing cold blue, tired expression, anime style, Japanese animation, cel shading, clean line art, mysterious atmosphere, Studio Ghibli inspired, 2D anime aesthetic, high quality"
          },
          {
            panelNum: 2,
            layout: "1x1",
            sizeHint: "\u4E2D\u683C",
            sceneDesc: "\u7535\u68AF\u5185\u90E8\u7279\u5199\uFF0C\u6797\u590F\u6309\u4E0B\u8D1F1\u5C42\u6309\u94AE\uFF0C\u7535\u68AF\u95E8\u7F13\u7F13\u5173\u95ED",
            characterExpressions: "\u6797\u590F\u9762\u65E0\u8868\u60C5\uFF0C\u673A\u68B0\u5730\u6309\u6309\u94AE\uFF0C\u773C\u795E\u75B2\u60EB",
            dialogue: [{ position: "\u5DE6\u4E0A", speaker: "\u6797\u590F", text: "\u8D1F1\u5C42...\u505C\u8F66\u573A\u3002" }],
            narration: null,
            soundEffect: { text: "\u5494\u55D2", style: "\u5370\u5237\u4F53", position: "\u6309\u94AE\u65C1" },
            emotionSymbols: [],
            transitionToNext: "\u8FDE\u7EED",
            imagePromptZh: "\u7535\u68AF\u5185\u90E8\u7279\u5199\u753B\u9762\uFF0C\u5973\u8BB0\u8005\u7A7F\u6DF1\u7070\u8272\u98CE\u8863\u4F38\u624B\u6309\u8D1F1\u5C42\u6309\u94AE\uFF0C\u7535\u68AF\u95E8\u6B63\u5728\u5173\u95ED\uFF0C\u7535\u68AF\u5185\u51B7\u767D\u8272\u706F\u5149\uFF0C\u4E0D\u9508\u94A2\u58C1\u9762\u53CD\u5C04\uFF0Canime style, Japanese animation, cel shading, clean line art",
            imagePromptEn: "comic panel, medium shot, elevator interior close-up, female journalist in dark grey trench coat pressing basement level 1 button, elevator doors closing, cold white fluorescent lighting, stainless steel walls reflecting, tired blank expression, anime style, Japanese animation, cel shading, clean line art, 2D anime aesthetic, high quality"
          },
          {
            panelNum: 3,
            layout: "2x1\u5DE6",
            sizeHint: "\u5C0F\u683C(\u5FEB\u901F\u53CD\u5E94)",
            sceneDesc: "\u6797\u590F\u65E0\u610F\u95F4\u77A5\u5411\u7535\u68AF\u955C\u9762\uFF0C\u955C\u4E2D\u81EA\u5DF1\u7684\u5012\u5F71\u4F3C\u4E4E\u6162\u4E86\u534A\u62CD",
            characterExpressions: "\u6797\u590F\u77B3\u5B54\u5FAE\u7F29\uFF0C\u5634\u89D2\u521A\u653E\u677E\u8FD8\u6CA1\u5B8C\u5168\u653E\u677E\uFF0C\u8B66\u89C9\u7684\u77AC\u95F4",
            dialogue: [],
            narration: { position: "\u5E95\u90E8", text: "\u90A3\u4E00\u77AC\u95F4\uFF0C\u6211\u89C9\u5F97\u955C\u5B50\u91CC\u7684\u81EA\u5DF1...\u6162\u4E86\u534A\u62CD\u3002" },
            soundEffect: null,
            emotionSymbols: ["\u2757"],
            transitionToNext: "\u5BF9\u6BD4",
            imagePromptZh: "\u5C0F\u683C\u6F2B\u753B\u753B\u9762\uFF0C\u7535\u68AF\u955C\u9762\u53CD\u5C04\u5973\u8BB0\u8005\u7684\u8138\uFF0C\u955C\u4E2D\u5012\u5F71\u8868\u60C5\u4E0E\u73B0\u5B9E\u7565\u6709\u4E0D\u540C\uFF0C\u955C\u4E2D\u4EBA\u7269\u773C\u795E\u66F4\u9634\u6697\uFF0C\u51B7\u767D\u8272\u706F\u5149\uFF0C\u7D27\u5F20\u60AC\u7591\u6C1B\u56F4\uFF0Canime style, Japanese animation, cel shading, clean line art",
            imagePromptEn: "comic panel, small reaction shot, elevator mirror reflection showing female journalist face, reflection expression slightly different from real person, mirror version has darker eyes, cold white lighting, tense suspenseful atmosphere, anime style, Japanese animation, cel shading, clean line art, 2D anime aesthetic, high quality"
          }
        ]
      },
      {
        pageNum: 2,
        narrativePace: "\u7206\u53D1",
        pageHook: '\u955C\u4E2D\u7684"\u5979"\u62AC\u624B\u6307\u5411\u7535\u68AF\u9876\u90E8\uFF0C\u90A3\u91CC\u523B\u7740\u4E00\u4E2A\u88AB\u9057\u5FD8\u7684\u6570\u5B57\u2014\u201413\u3002',
        panels: [
          {
            panelNum: 1,
            layout: "\u51FA\u8840",
            sizeHint: "\u5927\u683C(\u91CD\u8981)",
            sceneDesc: "\u955C\u4E2D\u7684\u5012\u5F71\u7F13\u7F13\u8F6C\u8FC7\u5934\u6765\uFF0C\u9732\u51FA\u4E00\u4E2A\u4E0D\u5C5E\u4E8E\u6797\u590F\u7684\u8BE1\u5F02\u7B11\u5BB9\uFF0C\u7535\u68AF\u706F\u5149\u5F00\u59CB\u95EA\u70C1",
            characterExpressions: "\u955C\u4E2D\u5012\u5F71\u5634\u89D2\u4E0A\u626C\u9732\u51FA\u8BE1\u5F02\u5FAE\u7B11\uFF0C\u773C\u775B\u5FAE\u5FAE\u53D1\u7EA2\uFF0C\u73B0\u5B9E\u4E2D\u7684\u6797\u590F\u60CA\u6050\u540E\u9000",
            dialogue: [],
            narration: null,
            soundEffect: { text: "\u6ECB\u2014\u2014\u6ECB\u2014\u2014", style: "\u98A4\u6296\u4F53", position: "\u5168\u753B\u9762" },
            emotionSymbols: ["\u{1F4A2}", "\u2757", "\u2757"],
            transitionToNext: "\u5BF9\u6BD4",
            imagePromptZh: "\u51FA\u8840\u5927\u683C\u6F2B\u753B\u753B\u9762\uFF0C\u7535\u68AF\u955C\u9762\u4E2D\u5012\u5F71\u8F6C\u8FC7\u5934\u9732\u51FA\u8BE1\u5F02\u7B11\u5BB9\uFF0C\u773C\u775B\u5FAE\u7EA2\uFF0C\u706F\u5149\u95EA\u70C1\uFF0C\u73B0\u5B9E\u4E2D\u5973\u8BB0\u8005\u60CA\u6050\u540E\u9000\uFF0C\u6050\u6016\u6C1B\u56F4\uFF0Canime style, Japanese animation, cel shading, dark atmosphere, horror",
            imagePromptEn: "comic panel, full bleed large panel, elevator mirror reflection turning head to reveal eerie smile, glowing red eyes, flickering lights, real female journalist stepping back in horror, dark horror atmosphere, anime style, Japanese animation, cel shading, clean line art, dramatic shadows, 2D anime aesthetic, high quality"
          },
          {
            panelNum: 2,
            layout: "1x1",
            sizeHint: "\u4E2D\u683C",
            sceneDesc: "\u6797\u590F\u731B\u6309\u5F00\u95E8\u6309\u94AE\uFF0C\u7535\u68AF\u663E\u793A\u7684\u697C\u5C42\u6570\u5B57\u5F00\u59CB\u8DF3\u52A8\u2014\u201414\u300115\u300113\u300114...",
            characterExpressions: "\u6797\u590F\u60CA\u614C\u5931\u63AA\uFF0C\u624B\u6307\u75AF\u72C2\u6309\u6309\u94AE\uFF0C\u989D\u5934\u5192\u6C57",
            dialogue: [{ position: "\u53F3\u4E0B", speaker: "\u6797\u590F", text: "\u5F00\u95E8\uFF01\u5F00\u95E8\uFF01\uFF01" }],
            narration: null,
            soundEffect: { text: "\u7830\u7830\u7830", style: "\u7206\u70B8\u4F53", position: "\u6309\u94AE\u5904" },
            emotionSymbols: ["\u{1F4A6}", "\u2757"],
            transitionToNext: "\u8FDE\u7EED",
            imagePromptZh: "\u4E2D\u683C\u6F2B\u753B\u753B\u9762\uFF0C\u5973\u8BB0\u8005\u60CA\u614C\u731B\u6309\u7535\u68AF\u5F00\u95E8\u6309\u94AE\uFF0C\u697C\u5C42\u663E\u793A\u5C4F\u6570\u5B57\u8DF3\u52A8\u6DF7\u4E71\uFF0C\u989D\u5934\u5192\u6C57\uFF0C\u7D27\u5F20\u6C1B\u56F4\uFF0Canime style, Japanese animation, cel shading, clean line art",
            imagePromptEn: "comic panel, medium shot, panicked female journalist frantically pressing elevator open button, floor display numbers jumping chaotically 14 15 13 14, sweat on forehead, intense panic atmosphere, anime style, Japanese animation, cel shading, clean line art, 2D anime aesthetic, high quality"
          }
        ]
      }
    ]
  },
  mediaItems: [],
  snapshots: [],
  createdAt: "2026-07-08T16:00:00.000Z",
  updatedAt: "2026-07-08T16:00:00.000Z"
};

// public/js/app.jsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var { useState: useS, useEffect: useE, useRef: useR, useCallback: useCB } = React;
var MODULES = [
  { id: "structure", name: "\u5267\u60C5\u7ED3\u6784", icon: "\u{1F4D0}", type: "md" },
  { id: "summary", name: "\u5236\u4F5C\u5206\u6790", icon: "\u{1F4CA}", type: "md" },
  { id: "characters", name: "\u89D2\u8272\u8BBE\u5B9A", icon: "\u{1F3AD}", type: "json" },
  { id: "scenes", name: "\u573A\u666F\u8BBE\u8BA1", icon: "\u{1F3DE}\uFE0F", type: "json" },
  { id: "storyboard", name: "\u5206\u955C\u811A\u672C", icon: "\u{1F3AC}", type: "json" },
  { id: "script", name: "\u77ED\u5267\u811A\u672C", icon: "\u{1F4DD}", type: "md" },
  { id: "assets", name: "\u89C6\u89C9\u8D44\u4EA7", icon: "\u{1F3A8}", type: "md" },
  { id: "manga", name: "\u6F2B\u753B\u811A\u672C", icon: "\u{1F4D6}", type: "json" }
];
function toast(msg, type) {
  const el = document.createElement("div");
  el.className = "toast show " + (type || "");
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 2200);
}
function renderMd(md) {
  if (!md) return "";
  try {
    return DOMPurify.sanitize(marked.parse(md));
  } catch {
    return DOMPurify.sanitize(String(md));
  }
}
function stableId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function normalizeProject(project) {
  const production = project.results?.__production || {};
  const normalized = { ...project, revision: project.revision ?? production.revision ?? 0, sourceRevision: project.sourceRevision ?? production.sourceRevision ?? 1, assets: project.assets || production.assets || [], jobs: project.jobs || production.jobs || [] };
  const results = { ...normalized.results || {} };
  const withIds = (items, prefix) => (items || []).map((item) => ({ ...item, id: item.id || stableId(prefix) }));
  if (results.characters) results.characters = { ...results.characters, characters: withIds(results.characters.characters, "char") };
  if (results.scenes) results.scenes = { ...results.scenes, scenes: withIds(results.scenes.scenes, "scene") };
  if (results.storyboard) results.storyboard = { ...results.storyboard, shots: withIds(results.storyboard.shots, "shot") };
  if (results.manga?.pages) results.manga = { ...results.manga, pages: results.manga.pages.map((page) => ({ ...page, id: page.id || stableId("page"), panels: withIds(page.panels, "panel") })) };
  normalized.results = results;
  return normalized;
}
function mergeProjectState(serverValue, localValue) {
  if (Array.isArray(serverValue) && Array.isArray(localValue)) {
    if (![...serverValue, ...localValue].some((item) => item && typeof item === "object" && item.id)) return localValue;
    const merged = new Map(serverValue.map((item) => [item?.id || stableId("merge"), item]));
    localValue.forEach((item) => merged.set(item?.id || stableId("merge"), item));
    return [...merged.values()];
  }
  if (serverValue && localValue && typeof serverValue === "object" && typeof localValue === "object") {
    const keys = /* @__PURE__ */ new Set([...Object.keys(serverValue), ...Object.keys(localValue)]);
    return Object.fromEntries([...keys].map((key) => [key, mergeProjectState(serverValue[key], localValue[key])]));
  }
  return localValue === void 0 ? serverValue : localValue;
}
function staleUpstream(project) {
  const sourceRevision = (project.sourceRevision || 1) + 1;
  const results = Object.fromEntries(Object.entries(project.results || {}).map(([key, value]) => [key, value && typeof value === "object" ? { ...value, stale: true } : value]));
  return { sourceRevision, results, assets: (project.assets || []).map((asset) => ({ ...asset, stale: true })) };
}
function Sidebar({ projects, currentId, onSelect, onNew, onDelete, onImport, onRename, collapsed, onToggle, mobileOpen, onCloseMobile }) {
  const fileRef = useR(null);
  if (collapsed && !mobileOpen) {
    return /* @__PURE__ */ jsxs("aside", { className: "sidebar collapsed", children: [
      /* @__PURE__ */ jsx("div", { className: "sidebar-head", style: { justifyContent: "center" }, children: /* @__PURE__ */ jsx(Button, { size: "small", onClick: onToggle, children: "\xBB" }) }),
      /* @__PURE__ */ jsxs("div", { className: "sidebar-list", style: { textAlign: "center", padding: "8px 4px" }, children: [
        /* @__PURE__ */ jsx("div", { className: "proj-mini", title: "\u65B0\u5EFA\u9879\u76EE", onClick: onNew, style: { fontSize: 18, cursor: "pointer", padding: "8px 0" }, children: "\uFF0B" }),
        projects.map((p) => /* @__PURE__ */ jsx("div", { title: p.name, className: `proj-mini ${p.id === currentId ? "active" : ""}`, onClick: () => onSelect(p.id), style: { padding: "6px 0", cursor: "pointer", fontSize: 13, borderRadius: 6, color: p.id === currentId ? "#fff" : "inherit" }, children: p.name.slice(0, 1) }, p.id))
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs("aside", { className: `sidebar ${mobileOpen ? "mobile-open" : ""}`, children: [
    /* @__PURE__ */ jsxs("div", { className: "sidebar-head", children: [
      /* @__PURE__ */ jsx(Button, { size: "small", type: "primary", onClick: onNew, children: "+ \u65B0\u5EFA" }),
      /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => fileRef.current?.click(), children: "\u5BFC\u5165" }),
      /* @__PURE__ */ jsx(Button, { size: "small", ghost: true, onClick: onToggle, className: "sidebar-collapse-desktop", style: { marginLeft: "auto" }, children: "\xAB" }),
      /* @__PURE__ */ jsx("button", { className: "sidebar-close-mobile", onClick: onCloseMobile, children: "\u2715" }),
      /* @__PURE__ */ jsx("input", { ref: fileRef, type: "file", accept: ".json", hidden: true, onChange: async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        try {
          onImport(JSON.parse(await f.text()));
        } catch {
          toast("\u5BFC\u5165\u5931\u8D25", "error");
        }
        e.target.value = "";
      } })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "sidebar-list", children: [
      /* @__PURE__ */ jsx("div", { className: "sidebar-list-title", children: "\u9879\u76EE\u5217\u8868" }),
      projects.length === 0 && /* @__PURE__ */ jsxs("div", { style: { padding: 16, color: "var(--ai-text-muted)", fontSize: 12, textAlign: "center" }, children: [
        "\u6682\u65E0\u9879\u76EE",
        /* @__PURE__ */ jsx("br", {}),
        /* @__PURE__ */ jsx("span", { style: { fontSize: 11 }, children: "\u70B9\u51FB\u4E0A\u65B9\u300C+ \u65B0\u5EFA\u300D\u521B\u5EFA" })
      ] }),
      projects.map((p) => /* @__PURE__ */ jsxs("div", { className: `proj-item ${p.id === currentId ? "active" : ""}`, onClick: () => onSelect(p.id), title: p.name, children: [
        /* @__PURE__ */ jsx("span", { className: "proj-name", children: p.name }),
        /* @__PURE__ */ jsxs("span", { className: "proj-actions", children: [
          /* @__PURE__ */ jsx("span", { className: "rename", onClick: (e) => {
            e.stopPropagation();
            const n = prompt("\u91CD\u547D\u540D\u9879\u76EE", p.name);
            if (n && n.trim()) onRename(p.id, n.trim());
          }, children: "\u270E" }),
          /* @__PURE__ */ jsx("span", { className: "del", onClick: (e) => {
            e.stopPropagation();
            onDelete(p.id);
          }, children: "\u2715" })
        ] })
      ] }, p.id))
    ] })
  ] });
}
function NewProjectModal({ open, onClose, onCreate }) {
  const [name, setName] = useS("");
  const [style, setStyle] = useS("cinematic");
  useE(() => {
    if (open) {
      setName("");
      setStyle("cinematic");
    }
  }, [open]);
  if (!open) return null;
  const styleOptions = [
    { key: "cinematic", label: "\u7535\u5F71\u5199\u5B9E" },
    { key: "anime", label: "\u65E5\u6F2B\u98CE" },
    { key: "dongman", label: "\u56FD\u6F2B\u98CE" },
    { key: "3d", label: "3D\u52A8\u753B" },
    { key: "realistic", label: "\u4EFF\u771F\u4EBA" },
    { key: "cyberpunk", label: "\u8D5B\u535A\u670B\u514B" },
    { key: "fantasy", label: "\u5947\u5E7B\u98CE" },
    { key: "ink", label: "\u6C34\u58A8\u98CE" }
  ];
  return /* @__PURE__ */ jsx(
    Modal,
    {
      open,
      title: "\u{1F3AC} \u65B0\u5EFA\u9879\u76EE",
      onClose,
      okText: "\u521B\u5EFA",
      cancelText: "\u53D6\u6D88",
      typewriter: false,
      onOk: () => {
        if (!name.trim()) {
          toast("\u8BF7\u8F93\u5165\u9879\u76EE\u540D", "error");
          return;
        }
        onCreate(name.trim(), style);
      },
      children: /* @__PURE__ */ jsxs("div", { className: "modal-content", children: [
        /* @__PURE__ */ jsxs("div", { className: "ai-field", children: [
          /* @__PURE__ */ jsx("label", { children: "\u9879\u76EE\u540D\u79F0" }),
          /* @__PURE__ */ jsx(Input, { value: name, onChange: (e) => setName(e.target.value), placeholder: "\u5982\uFF1A\u6700\u540E\u4E00\u73ED\u7535\u68AF", allowClear: true, size: "large" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "ai-field", children: [
          /* @__PURE__ */ jsx("label", { children: "\u9ED8\u8BA4\u89C6\u89C9\u98CE\u683C" }),
          /* @__PURE__ */ jsx("select", { className: "native-select", value: style, onChange: (e) => setStyle(e.target.value), children: styleOptions.map((o) => /* @__PURE__ */ jsx("option", { value: o.key, children: o.label }, o.key)) })
        ] })
      ] })
    }
  );
}
function SettingsModal({ open, onClose, onSaved }) {
  const [cfg, setCfg] = useS(null);
  const [testing, setTesting] = useS(null);
  const [testRes, setTestRes] = useS({});
  useE(() => {
    if (open) api.getConfig().then(setCfg).catch(() => {
    });
  }, [open]);
  if (!open || !cfg) return null;
  const llmProviders = cfg.providers.filter((p) => p.type === "llm" || !p.type && !p.id.includes("agnes"));
  const imageProviders = cfg.providers.filter((p) => p.type === "image" || p.type === "media" && p.id.includes("agnes"));
  const videoProviders = cfg.providers.filter((p) => p.type === "video" || p.type === "media" && p.id.includes("agnes"));
  const findPreset = (id) => cfg.presets?.find((p) => p.id === id);
  const updateProvider = (id, field, val) => setCfg((c) => ({ ...c, providers: c.providers.map((p) => p.id === id ? { ...p, [field]: val } : p) }));
  const addProvider = (type) => setCfg((c) => ({ ...c, providers: [...c.providers, { id: "prov_" + Date.now().toString(36), name: "\u81EA\u5B9A\u4E49" + (type === "llm" ? "\u6587\u672C" : type === "image" ? "\u751F\u56FE" : "\u751F\u89C6\u9891"), baseUrl: "", apiKey: "", model: "", type }] }));
  const delProvider = (id) => setCfg((c) => ({ ...c, providers: c.providers.filter((p) => p.id !== id), activeProvider: c.activeProvider === id ? null : c.activeProvider, imageProvider: c.imageProvider === id ? null : c.imageProvider, videoProvider: c.videoProvider === id ? null : c.videoProvider }));
  const addPreset = (preset) => {
    if (cfg.providers.find((p) => p.id === preset.id)) return;
    setCfg((c) => ({ ...c, providers: [...c.providers, { ...preset, type: preset.type || "llm", apiKey: "" }] }));
  };
  const save = async () => {
    await api.saveConfig(cfg);
    toast("\u914D\u7F6E\u5DF2\u4FDD\u5B58", "ok");
    onSaved?.();
    onClose();
  };
  const test = async (p) => {
    if (!p.baseUrl || !p.apiKey) {
      toast("\u8BF7\u586B\u5199\u5B8C\u6574", "error");
      return;
    }
    setTesting(p.id);
    const r = { ...testRes };
    try {
      r[p.id] = await api.testConn(p.baseUrl, p.apiKey, p.model);
    } catch (e) {
      r[p.id] = { ok: false, error: e.message };
    }
    setTestRes(r);
    setTesting(null);
  };
  const modelSelect = (p) => {
    const preset = findPreset(p.id);
    const models = preset?.models || [];
    return /* @__PURE__ */ jsxs("div", { className: "field-mini", style: { flex: 1 }, children: [
      /* @__PURE__ */ jsx("label", { children: "\u6A21\u578B" }),
      models.length > 0 ? /* @__PURE__ */ jsxs("select", { value: p.model || "", onChange: (e) => updateProvider(p.id, "model", e.target.value), style: { width: "100%", padding: "4px 8px", border: "1px solid var(--ai-border)", borderRadius: 6, fontSize: 12 }, children: [
        /* @__PURE__ */ jsx("option", { value: "", children: preset?.defaultModel || "\u9009\u62E9\u6A21\u578B..." }),
        models.map((m) => /* @__PURE__ */ jsx("option", { value: m, children: m }, m))
      ] }) : /* @__PURE__ */ jsx(Input, { size: "small", value: p.model, onChange: (e) => updateProvider(p.id, "model", e.target.value), placeholder: "\u6A21\u578B\u540D" })
    ] });
  };
  const renderProvider = (p, providerType) => {
    const activeKey = providerType === "llm" ? "activeProvider" : providerType === "image" ? "imageProvider" : "videoProvider";
    const isActive = cfg[activeKey] === p.id;
    const preset = findPreset(p.id);
    const desc = preset ? `${preset.name}` : "";
    return /* @__PURE__ */ jsxs("div", { className: `provider-row ${isActive ? "active" : ""}`, children: [
      /* @__PURE__ */ jsxs("div", { className: "field-mini", style: { flex: 1.5 }, children: [
        /* @__PURE__ */ jsxs("label", { children: [
          "\u540D\u79F0 ",
          desc && /* @__PURE__ */ jsxs("span", { style: { color: "var(--ai-primary)", fontSize: 10 }, children: [
            "(",
            desc,
            ")"
          ] })
        ] }),
        /* @__PURE__ */ jsx(Input, { size: "small", value: p.name, onChange: (e) => updateProvider(p.id, "name", e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "field-mini", style: { flex: 2 }, children: [
        /* @__PURE__ */ jsx("label", { children: "Base URL" }),
        /* @__PURE__ */ jsx(Input, { size: "small", value: p.baseUrl, onChange: (e) => updateProvider(p.id, "baseUrl", e.target.value), placeholder: "https://..." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "field-mini", style: { flex: 1.5 }, children: [
        /* @__PURE__ */ jsxs("label", { children: [
          "API Key ",
          p.apiKey && /* @__PURE__ */ jsx("span", { style: { color: "var(--ai-success)", fontSize: 10 }, children: "\u2713\u5DF2\u586B" })
        ] }),
        /* @__PURE__ */ jsx(Input, { size: "small", type: "password", value: p.apiKey, onChange: (e) => updateProvider(p.id, "apiKey", e.target.value), placeholder: "sk-..." })
      ] }),
      modelSelect(p),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 4, minWidth: 60 }, children: [
        /* @__PURE__ */ jsx(Button, { size: "small", type: isActive ? "primary" : "default", onClick: () => setCfg((c) => ({ ...c, [activeKey]: p.id })), children: isActive ? "\u2713 \u4E3B" : "\u8BBE\u4E3A\u4E3B" }),
        /* @__PURE__ */ jsx(Button, { size: "small", loading: testing === p.id, onClick: () => test(p), children: "\u6D4B\u8BD5" }),
        /* @__PURE__ */ jsx(Button, { size: "small", danger: true, onClick: () => delProvider(p.id), children: "\u5220" })
      ] }),
      testRes[p.id] && /* @__PURE__ */ jsx("div", { style: { flexBasis: "100%", fontSize: 11, color: testRes[p.id].ok ? "var(--ai-success)" : "var(--ai-error)" }, children: testRes[p.id].ok ? "\u2713 \u8FDE\u63A5\u6210\u529F: " + (testRes[p.id].reply || "").slice(0, 50) : "\u2717 " + (testRes[p.id].error || "\u5931\u8D25") })
    ] }, p.id);
  };
  return /* @__PURE__ */ jsx(Modal, { open, title: "\u2699\uFE0F \u6A21\u578B\u914D\u7F6E", typewriter: false, onClose, onOk: save, okText: "\u4FDD\u5B58", cancelText: "\u53D6\u6D88", width: 760, children: /* @__PURE__ */ jsxs("div", { className: "settings-body modal-content", children: [
    /* @__PURE__ */ jsxs("div", { className: "settings-section", children: [
      /* @__PURE__ */ jsx("div", { className: "card-title", children: "\u{1F4DA} \u6587\u672C\u6A21\u578B\uFF08\u5267\u60C5\u5206\u6790/\u89D2\u8272/\u573A\u666F/\u5206\u955C/\u811A\u672C\u751F\u6210\uFF09" }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }, children: cfg.presets.filter((p) => p.type === "llm").map((p) => /* @__PURE__ */ jsxs(Button, { size: "small", onClick: () => addPreset(p), disabled: !!cfg.providers.find((x) => x.id === p.id), children: [
        "+ ",
        p.name
      ] }, p.id)) }),
      llmProviders.length === 0 && /* @__PURE__ */ jsx("div", { className: "settings-hint", children: "\u672A\u914D\u7F6E\u6587\u672C\u6A21\u578B\uFF0C\u70B9\u51FB\u4E0A\u65B9\u9884\u8BBE\u6309\u94AE\u6DFB\u52A0\uFF08\u63A8\u8350 Agnes 2.0 Flash \u6216 DeepSeek\uFF09" }),
      llmProviders.map((p) => renderProvider(p, "llm")),
      /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => addProvider("llm"), style: { marginTop: 6 }, children: "+ \u81EA\u5B9A\u4E49\u6587\u672C\u6A21\u578B" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "settings-section", style: { marginTop: 18 }, children: [
      /* @__PURE__ */ jsx("div", { className: "card-title", children: "\u{1F3A8} \u751F\u56FE\u6A21\u578B\uFF08AI\u751F\u56FE/\u56FE\u751F\u56FE\uFF0C\u9ED8\u8BA4\u4F7F\u7528 Agnes\uFF09" }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }, children: cfg.presets.filter((p) => p.type === "image").map((p) => /* @__PURE__ */ jsxs(Button, { size: "small", onClick: () => addPreset(p), disabled: !!cfg.providers.find((x) => x.id === p.id), children: [
        "+ ",
        p.name
      ] }, p.id)) }),
      imageProviders.length === 0 && /* @__PURE__ */ jsx("div", { className: "settings-hint", children: "\u672A\u914D\u7F6E\u751F\u56FE\u6A21\u578B\uFF0C\u9ED8\u8BA4\u56DE\u9000 Agnes \u751F\u56FE\uFF08agnes-image-2.1-flash\uFF0C\u514D\u8D39\uFF09" }),
      imageProviders.map((p) => renderProvider(p, "image")),
      /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => addProvider("image"), style: { marginTop: 6 }, children: "+ \u81EA\u5B9A\u4E49\u751F\u56FE\u6A21\u578B" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "settings-section", style: { marginTop: 18 }, children: [
      /* @__PURE__ */ jsx("div", { className: "card-title", children: "\u{1F3AC} \u751F\u89C6\u9891\u6A21\u578B\uFF08\u6587\u751F\u89C6\u9891/\u56FE\u751F\u89C6\u9891/\u5173\u952E\u5E27\uFF0C\u9ED8\u8BA4\u4F7F\u7528 Agnes\uFF09" }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }, children: cfg.presets.filter((p) => p.type === "video").map((p) => /* @__PURE__ */ jsxs(Button, { size: "small", onClick: () => addPreset(p), disabled: !!cfg.providers.find((x) => x.id === p.id), children: [
        "+ ",
        p.name
      ] }, p.id)) }),
      videoProviders.length === 0 && /* @__PURE__ */ jsx("div", { className: "settings-hint", children: "\u672A\u914D\u7F6E\u751F\u89C6\u9891\u6A21\u578B\uFF0C\u9ED8\u8BA4\u56DE\u9000 Agnes \u751F\u89C6\u9891\uFF08agnes-video-v2.0\uFF0C\u514D\u8D39\uFF09" }),
      videoProviders.map((p) => renderProvider(p, "video")),
      /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => addProvider("video"), style: { marginTop: 6 }, children: "+ \u81EA\u5B9A\u4E49\u751F\u89C6\u9891\u6A21\u578B" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "settings-section", style: { marginTop: 18 }, children: [
      /* @__PURE__ */ jsx("div", { className: "card-title", children: "\u{1F4D6} \u6A21\u578B\u8BF4\u660E" }),
      /* @__PURE__ */ jsxs("div", { className: "settings-help", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: "agnes-2.0-flash" }),
          " \u2014 Agnes\u6587\u672C\u6A21\u578B\uFF0C512K\u4E0A\u4E0B\u6587\uFF0C\u652F\u6301\u56FE\u50CF\u7406\u89E3/\u5DE5\u5177\u8C03\u7528/\u6D41\u5F0F\u8F93\u51FA"
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: "agnes-image-2.1-flash" }),
          " \u2014 Agnes\u751F\u56FE\u6A21\u578B\uFF0C\u6587\u751F\u56FE/\u56FE\u751F\u56FE\uFF0C\u652F\u6301\u9AD8\u4FE1\u606F\u5BC6\u5EA6\u590D\u6742\u6784\u56FE\uFF0C\u514D\u8D39"
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: "agnes-video-v2.0" }),
          " \u2014 Agnes\u89C6\u9891\u6A21\u578B\uFF0C\u6587\u751F\u89C6\u9891/\u56FE\u751F\u89C6\u9891/\u5173\u952E\u5E27\u52A8\u753B\uFF0C\u5F02\u6B65\u4EFB\u52A1\uFF0C\u514D\u8D39"
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: "deepseek-chat" }),
          " \u2014 DeepSeek\u6587\u672C\u6A21\u578B\uFF0C\u6027\u4EF7\u6BD4\u9AD8"
        ] }),
        /* @__PURE__ */ jsx("div", { style: { marginTop: 6, color: "var(--ai-text-muted)" }, children: "\u4E09\u79CD\u6A21\u578B\u72EC\u7ACB\u914D\u7F6E\uFF0C\u4E92\u4E0D\u5F71\u54CD\u3002\u751F\u56FE\u548C\u751F\u89C6\u9891\u672A\u914D\u7F6E\u65F6\u81EA\u52A8\u56DE\u9000 Agnes\u3002API Key \u5B58\u50A8\u5728\u670D\u52A1\u7AEF data/config.json\uFF0C\u524D\u7AEF\u8131\u654F\u663E\u793A\u3002" })
      ] })
    ] })
  ] }) });
}
function ChapterManager({ project, onUpdate }) {
  const [addOpen, setAddOpen] = useS(false);
  const [newTitle, setNewTitle] = useS("");
  const [newContent, setNewContent] = useS("");
  const [newGroup, setNewGroup] = useS("");
  const [editId, setEditId] = useS(null);
  const [editTitle, setEditTitle] = useS("");
  const [editContent, setEditContent] = useS("");
  const [previewId, setPreviewId] = useS(null);
  const [collapsedGroups, setCollapsedGroups] = useS({});
  const [importOpen, setImportOpen] = useS(false);
  const [importText, setImportText] = useS("");
  const chapters = project?.chapters || [];
  const groups = {};
  chapters.forEach((ch) => {
    const g = ch.group || "\u672A\u5206\u7EC4";
    (groups[g] = groups[g] || []).push(ch);
  });
  const addChapter = async () => {
    if (!newTitle.trim()) {
      toast("\u8BF7\u8F93\u5165\u6807\u9898", "error");
      return;
    }
    const ch = await api.addChapter(project.id, newTitle.trim(), newContent, newGroup.trim());
    onUpdate({ chapters: [...chapters, ch] });
    setAddOpen(false);
    setNewTitle("");
    setNewContent("");
    setNewGroup("");
    toast("\u7AE0\u8282\u5DF2\u6DFB\u52A0", "ok");
  };
  const startEdit = (ch) => {
    setEditId(ch.id);
    setEditTitle(ch.title);
    setEditContent(ch.content || "");
    setPreviewId(null);
  };
  const saveEdit = async () => {
    if (!editId) return;
    await api.updateChapter(project.id, editId, { title: editTitle, content: editContent });
    onUpdate({ chapters: chapters.map((c) => c.id === editId ? { ...c, title: editTitle, content: editContent } : c) });
    setEditId(null);
    toast("\u5DF2\u4FDD\u5B58", "ok");
  };
  const delChapter = async (id) => {
    if (!confirm("\u5220\u9664\u8BE5\u7AE0\u8282\uFF1F")) return;
    await api.deleteChapter(project.id, id);
    onUpdate({ chapters: chapters.filter((c) => c.id !== id) });
    toast("\u5DF2\u5220\u9664", "ok");
  };
  const doImport = async () => {
    if (!importText.trim()) return;
    try {
      const r = await api.importChapters(project.id, importText);
      toast(`\u5DF2\u5BFC\u5165 ${r.imported} \u7AE0`, "ok");
      const p = await api.getProject(project.id);
      onUpdate({ chapters: p.chapters });
      setImportOpen(false);
      setImportText("");
    } catch (e) {
      toast(e.message, "error");
    }
  };
  const togglePreview = (id) => setPreviewId((prev) => prev === id ? null : id);
  const renderCh = (ch) => {
    if (editId === ch.id) {
      return /* @__PURE__ */ jsxs("div", { className: "chapter-item editing", children: [
        /* @__PURE__ */ jsxs("div", { className: "chapter-edit", children: [
          /* @__PURE__ */ jsx("input", { value: editTitle, onChange: (e) => setEditTitle(e.target.value), style: { flex: 1, padding: "4px 8px", border: "1px solid var(--ai-border)", borderRadius: 6, fontSize: 12 } }),
          /* @__PURE__ */ jsx(Button, { size: "small", type: "primary", onClick: saveEdit, children: "\u4FDD\u5B58" }),
          /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => setEditId(null), children: "\u53D6\u6D88" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "ai-field", style: { marginTop: 6 }, children: [
          /* @__PURE__ */ jsx("textarea", { value: editContent, onChange: (e) => setEditContent(e.target.value), style: { minHeight: 100, width: "100%", border: "1px solid var(--ai-border)", borderRadius: 6, padding: 8, fontSize: 12, fontFamily: "inherit", background: "var(--ai-bg-content)" } }),
          /* @__PURE__ */ jsx(Button, { size: "small", type: "primary", onClick: saveEdit, style: { marginTop: 4 }, children: "\u4FDD\u5B58\u5185\u5BB9" })
        ] })
      ] });
    }
    return /* @__PURE__ */ jsxs("div", { className: "chapter-item", children: [
      /* @__PURE__ */ jsxs("div", { className: "chapter-row", children: [
        /* @__PURE__ */ jsx("span", { className: "ch-icon", children: previewId === ch.id ? "\u25BE" : "\u25B8" }),
        /* @__PURE__ */ jsx("span", { className: "ch-title", onClick: () => togglePreview(ch.id), children: ch.title }),
        /* @__PURE__ */ jsxs("span", { className: "ch-meta", children: [
          (ch.content || "").length,
          "\u5B57"
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "ch-actions", children: [
          ch.analysis?.characters && /* @__PURE__ */ jsx(Tag, { size: "small", color: "app-green", children: "\u5DF2\u5206\u6790" }),
          /* @__PURE__ */ jsx("span", { className: "ch-btn", title: "\u7F16\u8F91", onClick: (e) => {
            e.stopPropagation();
            startEdit(ch);
          }, children: "\u270F" }),
          /* @__PURE__ */ jsx("span", { className: "ch-del", title: "\u5220\u9664", onClick: (e) => {
            e.stopPropagation();
            delChapter(ch.id);
          }, children: "\u2715" })
        ] })
      ] }),
      previewId === ch.id && /* @__PURE__ */ jsx("div", { className: "ch-preview", style: { whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.7, color: "var(--ai-text-body)", background: "var(--ai-bg)", padding: 10, borderRadius: 6, marginTop: 4, maxHeight: 200, overflow: "auto", border: "1px solid var(--ai-border-light)" }, children: ch.content || "\uFF08\u65E0\u5185\u5BB9\uFF09" })
    ] });
  };
  return /* @__PURE__ */ jsxs("div", { className: "card", children: [
    /* @__PURE__ */ jsxs("div", { className: "card-head", children: [
      /* @__PURE__ */ jsxs("span", { className: "card-title", children: [
        "\u{1F4DA} \u7AE0\u8282\u7BA1\u7406 (",
        chapters.length,
        ")"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "card-actions", children: [
        /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => setImportOpen(true), children: "\u6279\u91CF\u5206\u7AE0" }),
        /* @__PURE__ */ jsx(Button, { size: "small", type: "primary", onClick: () => setAddOpen(true), children: "+ \u6DFB\u52A0\u7AE0\u8282" })
      ] })
    ] }),
    chapters.length === 0 ? /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, color: "var(--ai-text-muted)", padding: 12, textAlign: "center" }, children: [
      '\u6682\u65E0\u7AE0\u8282\u3002\u53EF\u7C98\u8D34\u5168\u6587"\u6279\u91CF\u5206\u7AE0"\u81EA\u52A8\u6309"\u7B2CX\u7AE0"\u5207\u5206\uFF0C\u6216\u624B\u52A8"+ \u6DFB\u52A0\u7AE0\u8282"\u3002',
      /* @__PURE__ */ jsx("br", {}),
      /* @__PURE__ */ jsx("span", { style: { fontSize: 11 }, children: "\u957F\u7BC7\u5EFA\u8BAE\u5206\u7AE0\u7BA1\u7406\uFF1A\u6BCF\u7AE0\u5355\u72EC\u5206\u6790\uFF0C\u77E5\u8BC6\u5E93\u81EA\u52A8\u8DE8\u7AE0\u79EF\u7D2F\u4FDD\u6301\u4EBA\u7269/\u573A\u666F\u4E00\u81F4\u3002" })
    ] }) : /* @__PURE__ */ jsx("div", { className: "chapter-tree", children: Object.entries(groups).map(([gname, chs]) => /* @__PURE__ */ jsxs("div", { className: "chapter-group", children: [
      /* @__PURE__ */ jsxs("div", { className: "group-head", onClick: () => setCollapsedGroups((s) => ({ ...s, [gname]: !s[gname] })), children: [
        /* @__PURE__ */ jsx("span", { className: "group-arrow", children: collapsedGroups[gname] ? "\u25B6" : "\u25BC" }),
        /* @__PURE__ */ jsx("span", { className: "group-name", children: gname }),
        /* @__PURE__ */ jsxs("span", { className: "group-count", children: [
          "(",
          chs.length,
          ")"
        ] })
      ] }),
      !collapsedGroups[gname] && chs.map(renderCh)
    ] }, gname)) }),
    /* @__PURE__ */ jsx(Modal, { open: addOpen, title: "\u6DFB\u52A0\u7AE0\u8282", typewriter: false, onClose: () => setAddOpen(false), onOk: addChapter, okText: "\u6DFB\u52A0", cancelText: "\u53D6\u6D88", children: /* @__PURE__ */ jsxs("div", { className: "modal-content", children: [
      /* @__PURE__ */ jsxs("div", { className: "ai-field", children: [
        /* @__PURE__ */ jsx("label", { children: "\u5377/\u5206\u7EC4\uFF08\u53EF\u9009\uFF09" }),
        /* @__PURE__ */ jsx(Input, { value: newGroup, onChange: (e) => setNewGroup(e.target.value), placeholder: "\u5982\uFF1A\u7B2C\u4E00\u5377", allowClear: true })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "ai-field", children: [
        /* @__PURE__ */ jsx("label", { children: "\u7AE0\u8282\u6807\u9898" }),
        /* @__PURE__ */ jsx(Input, { value: newTitle, onChange: (e) => setNewTitle(e.target.value), placeholder: "\u5982\uFF1A\u7B2C\u4E00\u7AE0 \u521D\u9047", allowClear: true })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "ai-field", children: [
        /* @__PURE__ */ jsx("label", { children: "\u7AE0\u8282\u5185\u5BB9" }),
        /* @__PURE__ */ jsx("textarea", { value: newContent, onChange: (e) => setNewContent(e.target.value), style: { minHeight: 120 } })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Modal, { open: importOpen, title: "\u6279\u91CF\u5206\u7AE0\u5BFC\u5165", typewriter: false, onClose: () => setImportOpen(false), onOk: doImport, okText: "\u5BFC\u5165", cancelText: "\u53D6\u6D88", width: 620, children: /* @__PURE__ */ jsxs("div", { className: "modal-content", children: [
      /* @__PURE__ */ jsx("p", { style: { fontSize: 12, color: "var(--ai-text-muted)", marginBottom: 8 }, children: '\u7C98\u8D34\u5168\u6587\uFF0C\u7CFB\u7EDF\u6309"\u7B2CX\u7AE0/Chapter N"\u81EA\u52A8\u5207\u5206\u4E3A\u591A\u4E2A\u7AE0\u8282\u3002' }),
      /* @__PURE__ */ jsx("textarea", { value: importText, onChange: (e) => setImportText(e.target.value), style: { width: "100%", minHeight: 220 } })
    ] }) })
  ] });
}
function InputPanel({ project, onUpdate, onAnalyzeAll, styles, generating, hasChapters, hasProvider, analysisSource, setAnalysisSource, analysisContent, collapsed, onToggleCollapse }) {
  const [content, setContent] = useS(project?.content || "");
  const [selectedModules, setSelectedModules] = useS(MODULES.map((m) => m.id));
  const [status, setStatus] = useS("");
  const [preprocessing, setPreprocessing] = useS(false);
  useE(() => {
    setContent(project?.content || "");
    setStatus("");
  }, [project?.id]);
  const onContentChange = (v) => {
    setContent(v);
    onUpdate({ content: v });
  };
  const toggleModule = (id) => setSelectedModules((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const doPreprocess = async () => {
    const text = analysisContent || content;
    if (!text.trim()) {
      if (hasChapters && analysisSource?.mode === "chapter" && !analysisSource?.chId) {
        toast("\u8BF7\u5148\u9009\u62E9\u4E00\u4E2A\u7AE0\u8282", "error");
        return;
      }
      toast("\u8BF7\u5148\u8F93\u5165\u5185\u5BB9\u6216\u6DFB\u52A0\u7AE0\u8282", "error");
      return;
    }
    setPreprocessing(true);
    setStatus("\u9884\u5904\u7406\u4E2D...");
    try {
      await api.preprocess(text, project?.id, analysisSource, (d) => {
        if (d.status === "split_done") setStatus(`\u5DF2\u5206 ${d.total} \u6BB5`);
        if (d.status === "summarizing") setStatus(`\u5206\u6790\u7B2C ${d.progress}/${d.total} \u6BB5...`);
        if (d.status === "synthesizing") setStatus("\u7EFC\u5408\u5206\u6790\u4E2D...");
        if (d.status === "done") {
          onUpdate({ preprocess: { segments: d.segments || [], global: d.global || {}, sourceMode: d.sourceMode, chapterId: d.chapterId, contentHash: d.contentHash, createdAt: d.createdAt } });
          setStatus("\u9884\u5904\u7406\u5B8C\u6210");
          toast("\u9884\u5904\u7406\u5B8C\u6210\uFF0C\u5DF2\u4E3A\u540E\u7EED\u5206\u6790\u63D0\u4F9B\u5168\u5C40\u4E0A\u4E0B\u6587", "ok");
        }
      });
    } catch (e) {
      setStatus("\u5931\u8D25: " + e.message);
      toast("\u9884\u5904\u7406\u5931\u8D25", "error");
    }
    setPreprocessing(false);
  };
  const chapters = project?.chapters || [];
  const retryRun = [...project?.analysisRuns || []].reverse().find((run) => run.status === "failed" && Object.values(run.modules || {}).some((module) => module.status === "failed"));
  const retryModules = retryRun ? Object.entries(retryRun.modules).filter(([, module]) => module.status === "failed").map(([type]) => type) : [];
  if (collapsed) {
    return /* @__PURE__ */ jsx("div", { className: "input-panel collapsed", children: /* @__PURE__ */ jsxs("div", { className: "input-collapsed-bar", onClick: onToggleCollapse, title: "\u5C55\u5F00\u8F93\u5165\u9762\u677F", children: [
      /* @__PURE__ */ jsx("span", { className: "input-collapsed-icon", children: "\u203A" }),
      /* @__PURE__ */ jsx("span", { className: "input-collapsed-label", children: "\u8F93\u5165\u9762\u677F" }),
      /* @__PURE__ */ jsxs("div", { className: "input-collapsed-mini", children: [
        /* @__PURE__ */ jsx("div", { title: "\u6E90\u6587\u672C", style: { fontSize: 16 }, children: "\u{1F4DD}" }),
        /* @__PURE__ */ jsx("div", { title: "\u7AE0\u8282\u7BA1\u7406", style: { fontSize: 16 }, children: "\u{1F4D6}" }),
        /* @__PURE__ */ jsx("div", { title: "\u89C6\u89C9\u98CE\u683C", style: { fontSize: 16 }, children: "\u{1F3A8}" }),
        /* @__PURE__ */ jsx("div", { title: "\u5206\u6790\u6A21\u5757", style: { fontSize: 16 }, children: "\u{1F4CB}" }),
        /* @__PURE__ */ jsx("div", { title: "\u64CD\u4F5C", style: { fontSize: 16 }, children: "\u26A1" })
      ] })
    ] }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "input-panel", children: [
    /* @__PURE__ */ jsxs("div", { className: "input-panel-head", children: [
      /* @__PURE__ */ jsx("span", { className: "input-panel-title", children: "\u2699\uFE0F \u8F93\u5165\u914D\u7F6E" }),
      /* @__PURE__ */ jsx("button", { className: "input-collapse-btn", onClick: onToggleCollapse, title: "\u6536\u8D77\u9762\u677F", children: "\u2039" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsxs("div", { className: "card-head", children: [
        /* @__PURE__ */ jsx("span", { className: "card-title", children: "\u{1F4DD} \u6E90\u6587\u672C" }),
        /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => document.getElementById("txtUpload")?.click(), children: "\u5BFC\u5165\u6587\u4EF6" }),
        /* @__PURE__ */ jsx("input", { type: "file", accept: ".txt,.md", hidden: true, id: "txtUpload", onChange: async (e) => {
          const f = e.target.files[0];
          if (!f) return;
          try {
            const text = await f.text();
            onContentChange(text);
            toast(`\u5DF2\u5BFC\u5165 ${f.name} (${text.length}\u5B57)`, "ok");
          } catch {
            toast("\u5BFC\u5165\u5931\u8D25", "error");
          }
          e.target.value = "";
        } })
      ] }),
      /* @__PURE__ */ jsx("textarea", { id: "sourceText", value: content, onChange: (e) => onContentChange(e.target.value), placeholder: "\u7C98\u8D34\u5C0F\u8BF4/\u6545\u4E8B/\u5267\u672C\u5168\u6587\uFF0C\u6216\u4F7F\u7528\u4E0B\u65B9\u7AE0\u8282\u7BA1\u7406\u5206\u7AE0...", spellCheck: false }),
      /* @__PURE__ */ jsxs("div", { className: "char-count", children: [
        content.length,
        " \u5B57"
      ] })
    ] }),
    /* @__PURE__ */ jsx(ChapterManager, { project, onUpdate }),
    /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsx("div", { className: "card-head", children: /* @__PURE__ */ jsx("span", { className: "card-title", children: "\u{1F3A8} \u89C6\u89C9\u98CE\u683C" }) }),
      /* @__PURE__ */ jsx("div", { className: "style-grid", children: styles.map((s) => /* @__PURE__ */ jsx("div", { className: `style-chip ${project?.style === s.key ? "active" : ""}`, onClick: () => onUpdate({ style: s.key }), title: s.desc, children: s.label }, s.key)) })
    ] }),
    hasChapters && /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsx("div", { className: "card-head", children: /* @__PURE__ */ jsx("span", { className: "card-title", children: "\u{1F3AF} \u5206\u6790\u8303\u56F4" }) }),
      /* @__PURE__ */ jsxs("select", { value: analysisSource.mode, onChange: (e) => setAnalysisSource((s) => ({ ...s, mode: e.target.value, chId: "" })), style: { width: "100%", padding: "6px 10px", border: "2px solid var(--ai-border)", borderRadius: 8, background: "var(--ai-bg-content)", fontSize: 13, marginBottom: 6 }, children: [
        /* @__PURE__ */ jsxs("option", { value: "chapters", children: [
          "\u5168\u90E8\u7AE0\u8282\uFF08",
          chapters.length,
          "\u7AE0\u62FC\u63A5\uFF09"
        ] }),
        /* @__PURE__ */ jsx("option", { value: "chapter", children: "\u5355\u7AE0\u5206\u6790" }),
        /* @__PURE__ */ jsx("option", { value: "content", children: "\u6E90\u6587\u672C\uFF08\u4E0D\u4F7F\u7528\u7AE0\u8282\uFF09" })
      ] }),
      analysisSource.mode === "chapter" && /* @__PURE__ */ jsxs("select", { value: analysisSource.chId, onChange: (e) => setAnalysisSource((s) => ({ ...s, chId: e.target.value })), style: { width: "100%", padding: "6px 10px", border: "2px solid var(--ai-border)", borderRadius: 8, background: "var(--ai-bg-content)", fontSize: 13 }, children: [
        /* @__PURE__ */ jsx("option", { value: "", children: "\u8BF7\u9009\u62E9\u7AE0\u8282..." }),
        chapters.map((c) => /* @__PURE__ */ jsx("option", { value: c.id, children: c.title }, c.id))
      ] }),
      /* @__PURE__ */ jsx("p", { style: { fontSize: 11, color: "var(--ai-primary)", marginTop: 6 }, children: "\u{1F4A1} \u5206\u6790\u65F6\u77E5\u8BC6\u5E93\u81EA\u52A8\u6CE8\u5165\u4E0A\u4E0B\u6587\uFF0C\u786E\u4FDD\u8DE8\u7AE0\u4EBA\u7269/\u573A\u666F\u4E00\u81F4\u3002" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsxs("div", { className: "card-head", children: [
        /* @__PURE__ */ jsx("span", { className: "card-title", children: "\u{1F4CB} \u5206\u6790\u6A21\u5757" }),
        /* @__PURE__ */ jsxs("span", { style: { fontSize: 11, color: "var(--ai-text-muted)" }, children: [
          "\u5DF2\u9009 ",
          selectedModules.length
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "module-grid", children: MODULES.map((m) => /* @__PURE__ */ jsxs("div", { className: `module-chip ${selectedModules.includes(m.id) ? "active" : ""}`, onClick: () => toggleModule(m.id), children: [
        /* @__PURE__ */ jsx("span", { className: "icon", children: m.icon }),
        m.name
      ] }, m.id)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsx("div", { className: "card-head", children: /* @__PURE__ */ jsx("span", { className: "card-title", children: "\u26A1 \u64CD\u4F5C" }) }),
      /* @__PURE__ */ jsx("div", { className: "gen-actions", children: /* @__PURE__ */ jsx(Button, { block: true, loading: preprocessing, onClick: doPreprocess, children: "\u{1F50D} \u9884\u5904\u7406" }) }),
      /* @__PURE__ */ jsx("div", { className: "gen-actions", children: /* @__PURE__ */ jsx(Button, { block: true, type: "primary", loading: generating, disabled: !hasProvider, onClick: () => {
        if (!hasProvider) {
          toast("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6EAPI Key", "error");
          return;
        }
        onAnalyzeAll(selectedModules);
      }, children: "\u{1F680} \u4E00\u952E\u5168\u90E8\u5206\u6790" }) }),
      retryModules.length > 0 && /* @__PURE__ */ jsxs("div", { className: "analysis-retry", children: [
        /* @__PURE__ */ jsxs("span", { children: [
          "\u53EF\u91CD\u8BD5\uFF1A",
          retryModules.map((type) => MODULES.find((module) => module.id === type)?.name || type).join("\u3001")
        ] }),
        /* @__PURE__ */ jsx(Button, { size: "small", loading: generating, onClick: () => onAnalyzeAll(retryModules, retryRun.id), children: "\u91CD\u8BD5\u5931\u8D25\u6A21\u5757" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "status-bar info", children: status }),
      project?.preprocess?.global && /* @__PURE__ */ jsxs("div", { className: "preprocess-summary", children: [
        /* @__PURE__ */ jsx("div", { className: "card-title", style: { fontSize: 13 }, children: "\u{1F4CB} \u9884\u5904\u7406\u5168\u5C40\u5206\u6790" }),
        project.preprocess.global.title && /* @__PURE__ */ jsxs("div", { className: "pp-field", children: [
          /* @__PURE__ */ jsx("b", { children: "\u6807\u9898:" }),
          " ",
          project.preprocess.global.title
        ] }),
        project.preprocess.global.genre && /* @__PURE__ */ jsxs("div", { className: "pp-field", children: [
          /* @__PURE__ */ jsx("b", { children: "\u7C7B\u578B:" }),
          " ",
          project.preprocess.global.genre
        ] }),
        project.preprocess.global.conflicts?.length > 0 && /* @__PURE__ */ jsxs("div", { className: "pp-field", children: [
          /* @__PURE__ */ jsx("b", { children: "\u51B2\u7A81:" }),
          " ",
          project.preprocess.global.conflicts.join("; ")
        ] }),
        project.preprocess.global.themes?.length > 0 && /* @__PURE__ */ jsxs("div", { className: "pp-field", children: [
          /* @__PURE__ */ jsx("b", { children: "\u4E3B\u9898:" }),
          " ",
          project.preprocess.global.themes.join("; ")
        ] }),
        project.preprocess.global.characters?.length > 0 && /* @__PURE__ */ jsxs("div", { className: "pp-field", children: [
          /* @__PURE__ */ jsx("b", { children: "\u89D2\u8272:" }),
          " ",
          project.preprocess.global.characters.map((c) => `${c.name}(${c.role || ""})`).join(", ")
        ] }),
        project.preprocess.global.timeline?.length > 0 && /* @__PURE__ */ jsxs("div", { className: "pp-field", children: [
          /* @__PURE__ */ jsx("b", { children: "\u65F6\u95F4\u7EBF:" }),
          " ",
          project.preprocess.global.timeline.map((t) => t.event).join(" \u2192 ")
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "pp-field", style: { fontSize: 11, color: "var(--ai-text-muted)" }, children: [
          "\u5DF2\u5206\u6BB5 ",
          project.preprocess.segments?.length || 0,
          " \u6BB5\uFF0C\u540E\u7EED\u5206\u6790\u5C06\u53C2\u8003\u6B64\u5168\u5C40\u4E0A\u4E0B\u6587"
        ] })
      ] })
    ] })
  ] });
}
function ResultPanel({ project, onUpdate, styles, onAnalyzeAll, analysisSource, analysisScope, streaming, streamingType, setStreaming, setStreamingType, projectRef, hasProvider, flushProject, createServerJob, updateServerJob, recordCompletedAsset }) {
  const [tab, setTab] = useS("characters");
  const [generating, setGenerating] = useS(false);
  const [progress, setProgress] = useS("");
  const [progressPct, setProgressPct] = useS(0);
  const abortRef = useR(null);
  const [vidTask, setVidTask] = useS(null);
  const [vidPolling, setVidPolling] = useS(false);
  const pollRef = useR(null);
  useE(() => () => {
    if (pollRef.current) clearTimeout(pollRef.current);
  }, []);
  useE(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        const btn = document.querySelector(".result-tab.active");
        if (btn) {
          const genBtn = document.querySelector(".result-content .gen-btn-trigger");
          if (genBtn) genBtn.click();
          else {
            const tab2 = btn.textContent.trim();
            const genBtns = document.querySelectorAll('button[type="primary"]');
            genBtns.forEach((b) => {
              if (b.textContent.includes("\u751F\u6210") && !b.disabled) b.click();
            });
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [project?.id]);
  const results = project?.results || {};
  const characters = results.characters?.characters || [];
  const scenes = results.scenes?.scenes || [];
  const shots = results.storyboard?.shots || [];
  const analyzeOne = async (type) => {
    if (!project?.content?.trim() && !project?.chapters?.length) {
      toast("\u8BF7\u5148\u8F93\u5165\u5185\u5BB9\u6216\u7AE0\u8282", "error");
      return;
    }
    const content = analysisSource;
    const targetId = project.id;
    setGenerating(true);
    setStreaming("");
    setStreamingType("");
    setProgress(`\u6B63\u5728\u751F\u6210${MODULES.find((m) => m.id === type)?.name}\uFF0C\u8BF7\u7A0D\u5019...`);
    setProgressPct(30);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      await api.analyze({ type, content, visualStyle: project.style, projectId: targetId, characters, scenes, sourceMode: analysisScope?.mode, chapterId: analysisScope?.mode === "chapter" ? analysisScope.chId : void 0 }, (d) => {
        if (d.status === "start") setProgressPct(40);
        if (d.status === "streaming") {
          setStreamingType(d.type);
          setStreaming((prev) => prev + d.content);
          setProgressPct((prev) => prev < 50 ? 50 : prev);
        }
        if (d.status === "done") {
          if (projectRef?.current?.id !== targetId) return;
          onUpdate((prev) => prev.id === targetId ? (() => {
            const prevResults = prev.results || {};
            const prevType = prevResults[type];
            let newResult = d.result;
            if (prevType && typeof prevType === "object" && typeof newResult === "object" && !Array.isArray(newResult)) {
              newResult = { ...d.result, derivedFromRevision: prev.sourceRevision || 1, stale: false };
              if (prevType.panelImages && newResult.pages) newResult.panelImages = prevType.panelImages;
            }
            return normalizeProject({ ...prev, results: { ...prevResults, [type]: newResult } });
          })() : prev);
          setStreaming("");
          setStreamingType("");
          setProgress(`${MODULES.find((m) => m.id === type)?.name} \u5B8C\u6210`);
          setProgressPct(100);
          toast("\u751F\u6210\u5B8C\u6210", "ok");
          setTimeout(() => {
            setProgress("");
            setProgressPct(0);
          }, 1500);
        }
        if (d.status === "error") {
          setStreaming("");
          setStreamingType("");
          setProgress("\u9519\u8BEF: " + d.error);
          toast("\u751F\u6210\u5931\u8D25", "error");
        }
      }, ac.signal);
    } catch (e) {
      if (e.name !== "AbortError") {
        setStreaming("");
        setStreamingType("");
        setProgress("\u5931\u8D25: " + e.message);
        toast("\u751F\u6210\u5931\u8D25", "error");
      }
    }
    setGenerating(false);
  };
  useE(() => () => {
    if (abortRef.current) abortRef.current.abort();
  }, [project?.id]);
  const tabs = [
    { id: "characters", name: "\u{1F3AD} \u89D2\u8272", count: characters.length },
    { id: "scenes", name: "\u{1F3DE}\uFE0F \u573A\u666F", count: scenes.length },
    { id: "storyboard", name: "\u{1F3AC} \u5206\u955C", count: shots.length },
    ...MODULES.filter((m) => m.type === "md").map((m) => ({ id: m.id, name: `${m.icon} ${m.name}` })),
    { id: "manga", name: "\u{1F4D6} \u6F2B\u753B", count: results.manga?.pages?.length || 0 },
    { id: "knowledge", name: "\u{1F4DA} \u77E5\u8BC6\u5E93" },
    { id: "media", name: "\u{1F5BC}\uFE0F \u5A92\u4F53" },
    { id: "consistency", name: "\u{1F50D} \u4E00\u81F4\u6027" },
    { id: "snapshots", name: "\u{1F4F8} \u5FEB\u7167" }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "result-panel", children: [
    /* @__PURE__ */ jsxs("div", { className: "result-tabs", children: [
      tabs.map((t) => /* @__PURE__ */ jsxs("div", { className: `result-tab ${tab === t.id ? "active" : ""}`, onClick: () => setTab(t.id), children: [
        t.name,
        t.count !== void 0 && /* @__PURE__ */ jsx("span", { className: "count", children: t.count })
      ] }, t.id)),
      /* @__PURE__ */ jsxs("div", { style: { marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }, children: [
        tab !== "media" && tab !== "knowledge" && tab !== "consistency" && tab !== "snapshots" && /* @__PURE__ */ jsx(Button, { size: "small", type: "primary", loading: generating, disabled: !hasProvider, onClick: () => {
          if (!hasProvider) {
            toast("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6EAPI Key", "error");
            return;
          }
          analyzeOne(tab);
        }, children: generating ? "\u751F\u6210\u4E2D" : "\u751F\u6210" }),
        /* @__PURE__ */ jsx("a", { href: api.exportMd(project?.id), download: true, children: /* @__PURE__ */ jsx(Button, { size: "small", children: "\u5BFC\u51FAMD" }) }),
        /* @__PURE__ */ jsx("a", { href: api.exportJson(project?.id), download: true, children: /* @__PURE__ */ jsx(Button, { size: "small", children: "\u5BFC\u51FAJSON" }) }),
        /* @__PURE__ */ jsx("a", { href: api.exportSrt(project?.id), download: true, children: /* @__PURE__ */ jsx(Button, { size: "small", children: "\u5BFC\u51FASRT" }) }),
        /* @__PURE__ */ jsx("a", { href: api.exportManifest(project?.id), download: true, children: /* @__PURE__ */ jsx(Button, { size: "small", children: "Manifest" }) }),
        /* @__PURE__ */ jsx("a", { href: api.exportDeliveryZip(project?.id), download: true, children: /* @__PURE__ */ jsx(Button, { size: "small", children: "\u4EA4\u4ED8ZIP" }) }),
        [...new Set(shots.map((shot) => shot.episode).filter(Boolean))].map((episode) => /* @__PURE__ */ jsx("a", { href: api.exportEpisodeSrt(project?.id, episode), download: true, children: /* @__PURE__ */ jsxs(Button, { size: "small", children: [
          "\u7B2C",
          episode,
          "\u96C6SRT"
        ] }) }, episode)),
        /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => {
          const mod = prompt("\u5BFC\u51FA\u5355\u4E2A\u6A21\u5757\uFF08\u8F93\u5165: characters/scenes/storyboard/manga/script/assets/structure/summary\uFF09");
          if (mod && results[mod]) {
            const blob = new Blob([JSON.stringify(results[mod], null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${project?.name}_${mod}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
          }
        }, children: "\u5BFC\u51FA\u6A21\u5757" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "result-content", children: [
      results[tab]?.stale && /* @__PURE__ */ jsx("div", { className: "stale-notice", children: "\u4E0A\u6E38\u5185\u5BB9\u5DF2\u53D8\u5316\uFF0C\u6B64\u7ED3\u679C\u4E0E\u5173\u8054\u8D44\u4EA7\u53EF\u80FD\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u751F\u6210\u540E\u786E\u8BA4\u3002" }),
      generating && /* @__PURE__ */ jsxs("div", { style: { marginBottom: 12, padding: 10, background: "var(--ai-primary-bg)", borderRadius: 8, fontSize: 13 }, children: [
        progress,
        progressPct > 0 && /* @__PURE__ */ jsx("div", { className: "progress-line", children: /* @__PURE__ */ jsx("div", { className: "fill", style: { width: progressPct + "%" } }) })
      ] }),
      tab === "characters" && /* @__PURE__ */ jsx(CharactersView, { characters, onUpdate: (chars) => onUpdate((prev) => ({ results: { ...prev.results, characters: { ...prev.results.characters, characters: chars, charImages: prev.results?.characters?.charImages || {} } } })), project, projectRef, recordCompletedAsset }),
      tab === "scenes" && /* @__PURE__ */ jsx(ScenesView, { scenes, onUpdate: (sc) => onUpdate((prev) => ({ results: { ...prev.results, scenes: { ...prev.results.scenes, scenes: sc, sceneImages: prev.results?.scenes?.sceneImages || {} } } })), project, projectRef, recordCompletedAsset }),
      tab === "storyboard" && /* @__PURE__ */ jsx(ShotView, { shots, characters, scenes, onUpdate: (patchOrFn) => onUpdate((prev) => {
        const prevShots = prev.results?.storyboard?.shots || [];
        const newShots = typeof patchOrFn === "function" ? patchOrFn(prevShots) : patchOrFn;
        return { results: { ...prev.results || {}, storyboard: { ...prev.results?.storyboard || {}, shots: newShots } } };
      }), project, projectRef, createServerJob, updateServerJob, recordCompletedAsset }),
      MODULES.filter((m) => m.type === "md").map((m) => tab === m.id && /* @__PURE__ */ jsx(MdView, { content: streamingType === m.id ? streaming : results[m.id], emptyTip: `\u70B9\u51FB\u53F3\u4E0A\u65B9"\u751F\u6210"\u5F00\u59CB` }, m.id)),
      tab === "manga" && /* @__PURE__ */ jsx(MangaView, { manga: results.manga, project, onUpdate, projectRef, recordCompletedAsset }),
      tab === "knowledge" && /* @__PURE__ */ jsx(KnowledgeView, { project, onUpdate }),
      tab === "media" && /* @__PURE__ */ jsx(MediaGen, { styles, project, characters, scenes, onUpdate, projectRef, vidTask, setVidTask, vidPolling, setVidPolling, pollRef, createServerJob, updateServerJob, recordCompletedAsset }),
      tab === "consistency" && /* @__PURE__ */ jsx(ConsistencyView, { project, onUpdate }),
      tab === "snapshots" && /* @__PURE__ */ jsx(SnapshotView, { project, flushProject })
    ] })
  ] });
}
function CharactersView({ characters, onUpdate, project, projectRef, recordCompletedAsset }) {
  const [genIdx, setGenIdx] = useS(null);
  if (!characters.length) return /* @__PURE__ */ jsx(Empty, { tip: "\u751F\u6210\u89D2\u8272\u8BBE\u5B9A\u540E\u5C06\u663E\u793A\uFF0C\u6BCF\u89D2\u8272\u542B\u4E00\u5F201x4\u6A2A\u5411\u6392\u5217\u8BBE\u5B9A\u56FEPrompt" });
  const baseFields = [["role", "\u53D9\u4E8B\u529F\u80FD"], ["gender", "\u6027\u522B"], ["age", "\u5E74\u9F84"], ["appearance", "\u5916\u8C8C"], ["personality", "\u6027\u683C"], ["costume", "\u670D\u88C5\u9053\u5177"], ["voiceStyle", "\u8BED\u8A00\u98CE\u683C"], ["relationships", "\u4EBA\u7269\u5173\u7CFB"], ["arc", "\u89D2\u8272\u5F27\u5149"], ["castingReference", "\u9009\u89D2\u53C2\u8003"]];
  const updateField = (i, k, v) => {
    const c = [...characters];
    c[i] = { ...c[i], [k]: v };
    onUpdate(c);
  };
  const charImages = project?.results?.characters?.charImages || {};
  const genOne = async (i) => {
    const c = characters[i];
    const targetProjectId = project.id;
    const entityId = c.id;
    if (!c.imagePromptEn) {
      toast("\u8BE5\u89D2\u8272\u7F3A\u5C11\u82F1\u6587Prompt", "error");
      return;
    }
    setGenIdx(i);
    try {
      const r = await api.genImage(c.imagePromptEn, "", "1024x768", project?.style);
      if (r.ok) {
        await recordCompletedAsset(targetProjectId, "character", entityId, "image", r.url, { prompt: c.imagePromptEn });
        toast(`${c.name} \u8BBE\u5B9A\u56FE\u751F\u6210\u5B8C\u6210`, "ok");
      } else {
        toast(r.error || "\u751F\u6210\u5931\u8D25", "error");
      }
    } catch (e) {
      toast(e.message, "error");
    }
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
  const pending = characters.filter((c) => !charImages[c.id] && !c.imageUrl && c.imagePromptEn).length;
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "card", style: { marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsx("span", { style: { fontWeight: 700, fontSize: 13 }, children: "\u{1F3AD} \u89D2\u8272\u8BBE\u5B9A\u56FE" }),
      pending > 0 && /* @__PURE__ */ jsxs(Button, { size: "small", type: "primary", loading: genIdx !== null, onClick: genAll, children: [
        "\u4E00\u952E\u751F\u6210\u5168\u90E8\u8BBE\u5B9A\u56FE (",
        pending,
        ")"
      ] }),
      /* @__PURE__ */ jsxs("span", { style: { fontSize: 11, color: "var(--ai-text-muted)" }, children: [
        "\u5DF2\u751F\u6210 ",
        Object.keys(charImages).length,
        "/",
        characters.length
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid-cards", children: [
      characters.map((c, i) => /* @__PURE__ */ jsxs("div", { className: "item-card", children: [
        /* @__PURE__ */ jsxs("div", { className: "item-head", children: [
          /* @__PURE__ */ jsx("input", { className: "item-name", value: c.name, onChange: (e) => updateField(i, "name", e.target.value) }),
          /* @__PURE__ */ jsx(Button, { size: "small", danger: true, onClick: () => {
            if (confirm("\u786E\u8BA4\u5220\u9664\u8BE5\u89D2\u8272\uFF1F")) onUpdate(characters.filter((_, x) => x !== i));
          }, children: "\u5220" })
        ] }),
        (c.imageUrl || charImages[c.id] || charImages[c.name]) && /* @__PURE__ */ jsx("img", { src: c.imageUrl || charImages[c.id] || charImages[c.name], alt: c.name, style: { width: "100%", borderRadius: 8, marginBottom: 8 } }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, marginBottom: 8 }, children: [
          /* @__PURE__ */ jsx(Button, { size: "small", type: "primary", loading: genIdx === i, onClick: () => genOne(i), disabled: !c.imagePromptEn, children: c.imageUrl || charImages[c.id] || charImages[c.name] ? "\u91CD\u65B0\u751F\u56FE" : "\u751F\u56FE" }),
          (c.imageUrl || charImages[c.id] || charImages[c.name]) && /* @__PURE__ */ jsx("a", { href: c.imageUrl || charImages[c.id] || charImages[c.name], download: true, target: "_blank", rel: "noreferrer", children: /* @__PURE__ */ jsx(Button, { size: "small", children: "\u4E0B\u8F7D" }) })
        ] }),
        baseFields.map(([k, label]) => /* @__PURE__ */ jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsx("label", { children: label }),
          /* @__PURE__ */ jsx("input", { value: c[k] || "", onChange: (e) => updateField(i, k, e.target.value) })
        ] }, k)),
        /* @__PURE__ */ jsxs("div", { className: "view-prompts", style: { borderTop: "1px dashed var(--ai-border)", paddingTop: 8, marginTop: 8 }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--ai-text)", marginBottom: 6 }, children: "\u{1F4D0} \u89D2\u8272\u8BBE\u5B9A\u56FE Prompt\uFF08\u5355\u56FE1x4\u6A2A\u5411\u6392\u5217\uFF1A\u9762\u90E8\u7279\u5199/\u6B63\u9762/\u4FA7\u9762/\u80CC\u9762\u5168\u8EAB\uFF09" }),
          /* @__PURE__ */ jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsx("label", { children: "\u8BBE\u5B9A\u56FE Prompt\uFF08\u4E2D\u6587\uFF09" }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 4 }, children: [
              /* @__PURE__ */ jsx("textarea", { className: "prompt", value: c.imagePromptZh || "", onChange: (e) => updateField(i, "imagePromptZh", e.target.value), style: { minHeight: 60, flex: 1 } }),
              c.imagePromptZh && /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => {
                navigator.clipboard.writeText(c.imagePromptZh);
                toast("\u5DF2\u590D\u5236", "ok");
              }, children: "\u590D\u5236" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsx("label", { children: "\u8BBE\u5B9A\u56FE Prompt\uFF08English\uFF09" }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 4 }, children: [
              /* @__PURE__ */ jsx("textarea", { className: "prompt", value: c.imagePromptEn || "", onChange: (e) => updateField(i, "imagePromptEn", e.target.value), style: { minHeight: 60, flex: 1 } }),
              c.imagePromptEn && /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => {
                navigator.clipboard.writeText(c.imagePromptEn);
                toast("\u5DF2\u590D\u5236", "ok");
              }, children: "\u590D\u5236" })
            ] })
          ] })
        ] })
      ] }, c.id)),
      /* @__PURE__ */ jsx(Button, { onClick: () => onUpdate([...characters, { id: stableId("char"), name: "\u65B0\u89D2\u8272" }]), children: "+ \u65B0\u589E\u89D2\u8272" })
    ] })
  ] });
}
function ScenesView({ scenes, onUpdate, project, projectRef, recordCompletedAsset }) {
  const [genIdx, setGenIdx] = useS(null);
  if (!scenes.length) return /* @__PURE__ */ jsx(Empty, { tip: "\u751F\u6210\u573A\u666F\u8BBE\u5B9A\u540E\u5C06\u663E\u793A\u5728\u6B64" });
  const fields = [["environment", "\u73AF\u5883"], ["mood", "\u6C1B\u56F4"], ["lighting", "\u5149\u7167"], ["timeOfDay", "\u65F6\u95F4\u6BB5"], ["narrativeFunction", "\u53D9\u4E8B\u529F\u80FD"], ["keyProps", "\u5173\u952E\u9053\u5177"], ["soundDesign", "\u58F0\u97F3\u8BBE\u8BA1"], ["colorPalette", "\u8272\u8C03\u5EFA\u8BAE"], ["compositionHint", "\u6784\u56FE\u5EFA\u8BAE"], ["imagePromptZh", "\u573A\u666F\u56FEPrompt(\u4E2D)"], ["imagePromptEn", "\u573A\u666F\u56FEPrompt(\u82F1)"]];
  const updateField = (i, k, v) => {
    const s = [...scenes];
    s[i] = { ...s[i], [k]: v };
    onUpdate(s);
  };
  const sceneImages = project?.results?.scenes?.sceneImages || {};
  const genOne = async (i) => {
    const s = scenes[i];
    const targetProjectId = project.id;
    const entityId = s.id;
    if (!s.imagePromptEn) {
      toast("\u8BE5\u573A\u666F\u7F3A\u5C11\u82F1\u6587Prompt", "error");
      return;
    }
    setGenIdx(i);
    try {
      const r = await api.genImage(s.imagePromptEn, "", "1024x768", project?.style);
      if (r.ok) {
        await recordCompletedAsset(targetProjectId, "scene", entityId, "image", r.url, { prompt: s.imagePromptEn });
        toast(`${s.name} \u573A\u666F\u56FE\u751F\u6210\u5B8C\u6210`, "ok");
      } else {
        toast(r.error || "\u751F\u6210\u5931\u8D25", "error");
      }
    } catch (e) {
      toast(e.message, "error");
    }
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
  const pending = scenes.filter((s) => !sceneImages[s.id] && !s.imageUrl && s.imagePromptEn).length;
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "card", style: { marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsx("span", { style: { fontWeight: 700, fontSize: 13 }, children: "\u{1F3DE}\uFE0F \u573A\u666F\u8BBE\u5B9A\u56FE" }),
      pending > 0 && /* @__PURE__ */ jsxs(Button, { size: "small", type: "primary", loading: genIdx !== null, onClick: genAll, children: [
        "\u4E00\u952E\u751F\u6210\u5168\u90E8\u573A\u666F\u56FE (",
        pending,
        ")"
      ] }),
      /* @__PURE__ */ jsxs("span", { style: { fontSize: 11, color: "var(--ai-text-muted)" }, children: [
        "\u5DF2\u751F\u6210 ",
        Object.keys(sceneImages).length,
        "/",
        scenes.length
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid-cards", children: [
      scenes.map((s, i) => /* @__PURE__ */ jsxs("div", { className: "item-card", children: [
        /* @__PURE__ */ jsxs("div", { className: "item-head", children: [
          /* @__PURE__ */ jsx("input", { className: "item-name", value: s.name, onChange: (e) => updateField(i, "name", e.target.value) }),
          /* @__PURE__ */ jsx(Button, { size: "small", danger: true, onClick: () => {
            if (confirm("\u786E\u8BA4\u5220\u9664\u8BE5\u573A\u666F\uFF1F")) onUpdate(scenes.filter((_, x) => x !== i));
          }, children: "\u5220" })
        ] }),
        (s.imageUrl || sceneImages[s.id] || sceneImages[s.name]) && /* @__PURE__ */ jsx("img", { src: s.imageUrl || sceneImages[s.id] || sceneImages[s.name], alt: s.name, style: { width: "100%", borderRadius: 8, marginBottom: 8 } }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, marginBottom: 8 }, children: [
          /* @__PURE__ */ jsx(Button, { size: "small", type: "primary", loading: genIdx === i, onClick: () => genOne(i), disabled: !s.imagePromptEn, children: s.imageUrl || sceneImages[s.id] || sceneImages[s.name] ? "\u91CD\u65B0\u751F\u56FE" : "\u751F\u56FE" }),
          (s.imageUrl || sceneImages[s.id] || sceneImages[s.name]) && /* @__PURE__ */ jsx("a", { href: s.imageUrl || sceneImages[s.id] || sceneImages[s.name], download: true, target: "_blank", rel: "noreferrer", children: /* @__PURE__ */ jsx(Button, { size: "small", children: "\u4E0B\u8F7D" }) })
        ] }),
        fields.map(([k, label]) => {
          if (k.startsWith("imagePrompt")) {
            return /* @__PURE__ */ jsxs("div", { className: "field", children: [
              /* @__PURE__ */ jsx("label", { children: label }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 4 }, children: [
                s[k] && /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => {
                  navigator.clipboard.writeText(s[k]);
                  toast("\u5DF2\u590D\u5236", "ok");
                }, children: "\u590D\u5236" }),
                /* @__PURE__ */ jsx("textarea", { className: "prompt", value: s[k] || "", onChange: (e) => updateField(i, k, e.target.value), style: { flex: 1 } })
              ] })
            ] }, k);
          }
          return /* @__PURE__ */ jsxs("div", { className: "field", children: [
            /* @__PURE__ */ jsx("label", { children: label }),
            /* @__PURE__ */ jsx("input", { value: s[k] || "", onChange: (e) => updateField(i, k, e.target.value) })
          ] }, k);
        })
      ] }, s.id)),
      /* @__PURE__ */ jsx(Button, { onClick: () => onUpdate([...scenes, { id: stableId("scene"), name: "\u65B0\u573A\u666F" }]), children: "+ \u65B0\u589E\u573A\u666F" })
    ] })
  ] });
}
function ShotView({ shots, characters, scenes, onUpdate, project, projectRef, createServerJob, updateServerJob, recordCompletedAsset }) {
  const [view, setView] = useS("table");
  const [filterEp, setFilterEp] = useS("");
  const [filterScene, setFilterScene] = useS("");
  const [filterPending, setFilterPending] = useS(false);
  const [genKey, setGenKey] = useS(null);
  const [useCharRef, setUseCharRef] = useS(true);
  if (!shots.length) return /* @__PURE__ */ jsx(Empty, { tip: "\u5148\u751F\u6210\u89D2\u8272\u4E0E\u573A\u666F\u8BBE\u5B9A\uFF0C\u518D\u70B9\u51FB\u53F3\u4E0A\u65B9\u751F\u6210\u6309\u94AE" });
  const eps = [...new Set(shots.map((s) => s.episode))];
  let filtered = shots;
  if (filterEp) filtered = filtered.filter((s) => s.episode == filterEp);
  if (filterScene) filtered = filtered.filter((s) => s.sceneName === filterScene);
  if (filterPending) filtered = filtered.filter((s) => !s.videoUrl);
  const charName = (names) => (names || []).join("\u3001");
  const updateShot = (realIdx, patch) => onUpdate((prevShots) => {
    const arr = [...prevShots || shots];
    arr[realIdx] = { ...arr[realIdx], ...patch };
    return arr;
  });
  const update = (idx, k, v) => {
    const i = shots.indexOf(filtered[idx]);
    updateShot(i, { [k]: v });
  };
  const moveShot = (idx, dir) => {
    const i = shots.indexOf(filtered[idx]);
    const j = i + dir;
    if (j < 0 || j >= shots.length) return;
    onUpdate((prevShots) => {
      const arr = [...prevShots || shots];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };
  const charImages = project?.results?.characters?.charImages || {};
  const sceneImages = project?.results?.scenes?.sceneImages || {};
  const charMap = {};
  characters.forEach((c) => {
    charMap[c.name] = c;
  });
  const sceneMap = {};
  scenes.forEach((s) => {
    sceneMap[s.name] = s;
  });
  const getRefImages = (s, previousShot) => {
    const refs = [];
    if (previousShot?.keyframeUrl) refs.push(previousShot.keyframeUrl);
    if (useCharRef && s.characterNames?.length) s.characterNames.forEach((n) => {
      if (charImages[n]) refs.push(charImages[n]);
    });
    if (useCharRef && s.sceneName && sceneImages[s.sceneName]) refs.push(sceneImages[s.sceneName]);
    return refs.length ? refs : void 0;
  };
  const buildKeyframePrompt = (s, previousShot) => {
    let p = s.promptEn || "";
    const parts = [];
    if (s.characterNames?.length) {
      s.characterNames.forEach((n) => {
        const c = charMap[n];
        if (c) parts.push(`Character "${n}": ${c.appearance || ""}, wearing ${c.costume || ""}`);
      });
    }
    if (s.sceneName) {
      const sc = sceneMap[s.sceneName];
      if (sc) parts.push(`Scene "${s.sceneName}": ${sc.environment || ""}, ${sc.lighting || ""} lighting, ${sc.mood || ""} atmosphere`);
    }
    if (previousShot) {
      const continuity = [
        previousShot.continuityNote || previousShot.notes,
        previousShot.visual && `Previous visual: ${previousShot.visual}`,
        previousShot.action && `Previous action: ${previousShot.action}`,
        (previousShot.characterState || previousShot.charactersState) && `Character state: ${previousShot.characterState || previousShot.charactersState}`,
        previousShot.sceneState && `Scene state: ${previousShot.sceneState}`
      ].filter(Boolean);
      if (continuity.length) parts.push(`Continue from shot ${previousShot.id}: ${continuity.join("; ")}`);
    }
    if (parts.length) p = parts.join(". ") + ". " + p;
    return p;
  };
  const withKeyframe = shots.filter((s) => s.keyframeUrl).length;
  const withVideo = shots.filter((s) => s.videoUrl).length;
  const total = shots.length;
  const coverage = { total, withKeyframe, withVideo, pending: total - withVideo };
  const getShot = (realIdx) => projectRef?.current?.results?.storyboard?.shots?.find((item) => item.id === shots[realIdx]?.id) || shots[realIdx];
  const findPreviousShot = (shotId) => {
    const currentShots = projectRef?.current?.results?.storyboard?.shots || shots;
    const index = currentShots.findIndex((item) => item.id === shotId);
    return index > 0 ? currentShots[index - 1] : null;
  };
  const genKeyframe = async (shotId) => {
    const currentShots = projectRef?.current?.results?.storyboard?.shots || shots;
    const s = currentShots.find((item) => item.id === shotId);
    if (!s || !s.promptEn) {
      toast("\u8BE5\u5206\u955C\u7F3A\u5C11\u82F1\u6587Prompt", "error");
      return false;
    }
    const targetProjectId = project.id;
    const entityId = s.id;
    const key = `kf-${entityId}`;
    setGenKey(key);
    try {
      const previousShot = findPreviousShot(shotId);
      const refs = getRefImages(s, previousShot);
      const enhancedPrompt = buildKeyframePrompt(s, previousShot);
      const r = await api.genImage(enhancedPrompt, "", "1024x768", project?.style, refs);
      if (r.ok) {
        await recordCompletedAsset(targetProjectId, "shot", entityId, "keyframe", r.url, { prompt: enhancedPrompt });
        toast(`\u5206\u955C${s.episode}-${s.sceneNo}-${s.shotNo} \u5173\u952E\u5E27\u751F\u6210\u5B8C\u6210`, "ok");
        setGenKey(null);
        return r.url;
      } else {
        toast(r.error || "\u751F\u6210\u5931\u8D25", "error");
        setGenKey(null);
        return false;
      }
    } catch (e) {
      toast(e.message, "error");
      setGenKey(null);
      return false;
    }
  };
  const genShotVideo = async (realIdx, keyframeUrl) => {
    const s = getShot(realIdx);
    if (!s) return false;
    const imageUrl = keyframeUrl || s.keyframeUrl;
    if (!imageUrl) {
      toast(`\u5206\u955C${s.episode}-${s.sceneNo}-${s.shotNo} \u8BF7\u5148\u751F\u6210\u5173\u952E\u5E27`, "error");
      return false;
    }
    const targetProjectId = project.id;
    const entityId = s.id;
    const key = `vd-${entityId}`;
    setGenKey(key);
    try {
      const enhancedPrompt = buildKeyframePrompt(s);
      const params = { prompt: enhancedPrompt, visualStyle: project?.style, image: imageUrl, num_frames: 121, frame_rate: 24, height: 768, width: 1152 };
      const r = await api.genVideo(params);
      if (r.ok && r.video_id) {
        const job = await createServerJob(targetProjectId, { type: "video", entityType: "shot", entityId, providerTaskId: r.video_id, status: r.status || "processing", params });
        return new Promise((resolve) => {
          let attempts = 0;
          const delay = 1e4;
          const poll = async () => {
            attempts++;
            try {
              const vr = await api.getVideo(r.video_id);
              if (vr.rate_limited) {
                if (attempts < 60) {
                  setTimeout(poll, Math.min(delay * 1.5, 3e4));
                } else {
                  toast("\u89C6\u9891\u751F\u6210\u8D85\u65F6(\u9650\u6D41)", "error");
                  setGenKey(null);
                  resolve(false);
                }
                return;
              }
              if (vr.status === "completed") {
                await updateServerJob(targetProjectId, job.id, { status: "completed", asset: { kind: "video", url: vr.url, prompt: enhancedPrompt, parentAssetId: getShot(realIdx)?.keyframeAssetId } });
                toast(`\u5206\u955C${s.episode}-${s.sceneNo}-${s.shotNo} \u89C6\u9891\u751F\u6210\u5B8C\u6210`, "ok");
                setGenKey(null);
                resolve(true);
                return;
              }
              if (vr.status === "failed") {
                await updateServerJob(targetProjectId, job.id, { status: "failed", error: vr.error || "\u89C6\u9891\u751F\u6210\u5931\u8D25" });
                toast("\u89C6\u9891\u751F\u6210\u5931\u8D25", "error");
                setGenKey(null);
                resolve(false);
                return;
              }
              if (vr.status && vr.status !== job.status) {
                await updateServerJob(targetProjectId, job.id, { status: vr.status, progress: vr.progress });
                job.status = vr.status;
              }
              if (attempts < 60) {
                setTimeout(poll, delay);
              } else {
                toast("\u89C6\u9891\u751F\u6210\u8D85\u65F6", "error");
                setGenKey(null);
                resolve(false);
              }
            } catch (e) {
              toast(e.message, "error");
              setGenKey(null);
              resolve(false);
            }
          };
          toast(`\u5206\u955C${s.episode}-${s.sceneNo}-${s.shotNo} \u89C6\u9891\u4EFB\u52A1\u5DF2\u521B\u5EFA...`, "info");
          poll();
        });
      } else {
        toast(r.error || "\u521B\u5EFA\u89C6\u9891\u4EFB\u52A1\u5931\u8D25", "error");
        setGenKey(null);
        return false;
      }
    } catch (e) {
      toast(e.message, "error");
      setGenKey(null);
      return false;
    }
  };
  const genAllVideos = async () => {
    for (let realIdx = 0; realIdx < shots.length; realIdx++) {
      const s = getShot(realIdx);
      if (!s || s.videoUrl) continue;
      let keyframeUrl = s.keyframeUrl;
      if (!keyframeUrl) {
        keyframeUrl = await genKeyframe(s.id);
        if (!keyframeUrl) continue;
      }
      await genShotVideo(realIdx, keyframeUrl);
    }
  };
  const estimateDuration = (s) => {
    const words = (s.dialogue || "").length;
    const dialogueSec = words / 3.5;
    const actionBeats = (s.action || "").split(/[，,；;。]/).filter(Boolean).length;
    const actionSec = actionBeats * 0.8;
    return Math.max(3, Math.min(10, Math.round(dialogueSec + actionSec)));
  };
  const recalcDurations = () => {
    onUpdate((prevShots) => {
      const arr = [...prevShots || shots];
      arr.forEach((s, i) => {
        arr[i] = { ...s, duration: estimateDuration(s) };
      });
      return arr;
    });
    toast("\u5DF2\u91CD\u65B0\u4F30\u7B97\u65F6\u957F", "ok");
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { className: "card", style: { marginBottom: 12 }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsx("span", { style: { fontWeight: 700, fontSize: 13 }, children: "\u{1F4CA} \u5206\u955C\u8986\u76D6\u7387" }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 12, fontSize: 12, alignItems: "center" }, children: [
        /* @__PURE__ */ jsxs("span", { children: [
          "\u603B\u8BA1 ",
          total
        ] }),
        /* @__PURE__ */ jsxs("span", { style: { color: "var(--ai-text-muted)" }, children: [
          "\u5173\u952E\u5E27 ",
          withKeyframe,
          "/",
          total
        ] }),
        /* @__PURE__ */ jsxs("span", { style: { color: "var(--ai-text-muted)" }, children: [
          "\u89C6\u9891 ",
          withVideo,
          "/",
          total
        ] }),
        /* @__PURE__ */ jsxs("span", { style: { color: withVideo === total ? "var(--ai-success)" : "var(--ai-warning)" }, children: [
          "\u672A\u5B8C\u6210 ",
          coverage.pending
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "progress-line", style: { flex: 1, minWidth: 100, maxWidth: 200 }, children: /* @__PURE__ */ jsx("div", { className: "fill", style: { width: (total ? withVideo / total * 100 : 0) + "%" } }) })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "shot-toolbar", children: [
      /* @__PURE__ */ jsxs("select", { value: filterEp, onChange: (e) => setFilterEp(e.target.value), children: [
        /* @__PURE__ */ jsx("option", { value: "", children: "\u5168\u90E8\u96C6" }),
        eps.map((e) => /* @__PURE__ */ jsxs("option", { value: e, children: [
          "\u7B2C",
          e,
          "\u96C6"
        ] }, e))
      ] }),
      /* @__PURE__ */ jsxs("select", { value: filterScene, onChange: (e) => setFilterScene(e.target.value), children: [
        /* @__PURE__ */ jsx("option", { value: "", children: "\u5168\u90E8\u573A\u666F" }),
        scenes.map((s, i) => /* @__PURE__ */ jsx("option", { value: s.name, children: s.name }, i))
      ] }),
      /* @__PURE__ */ jsxs("label", { style: { fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }, children: [
        /* @__PURE__ */ jsx("input", { type: "checkbox", checked: filterPending, onChange: (e) => setFilterPending(e.target.checked) }),
        "\u4EC5\u672A\u751F\u6210\u89C6\u9891"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "seg", children: [
        /* @__PURE__ */ jsx("button", { className: view === "table" ? "active" : "", onClick: () => setView("table"), children: "\u8868\u683C" }),
        /* @__PURE__ */ jsx("button", { className: view === "grid" ? "active" : "", onClick: () => setView("grid"), children: "\u7F51\u683C" })
      ] }),
      /* @__PURE__ */ jsxs("label", { style: { fontSize: 11, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }, title: "\u4F7F\u7528\u89D2\u8272\u8BBE\u5B9A\u56FE\u4F5C\u4E3A\u53C2\u8003\u56FE\u4FDD\u6301\u4E00\u81F4\u6027", children: [
        /* @__PURE__ */ jsx("input", { type: "checkbox", checked: useCharRef, onChange: (e) => setUseCharRef(e.target.checked) }),
        "\u{1F512}\u89D2\u8272\u4E00\u81F4\u6027"
      ] }),
      /* @__PURE__ */ jsx(Button, { size: "small", onClick: recalcDurations, children: "\u23F1 \u91CD\u7B97\u65F6\u957F" }),
      /* @__PURE__ */ jsxs(Button, { size: "small", type: "primary", loading: genKey !== null, onClick: genAllVideos, disabled: coverage.pending === 0, children: [
        "\u{1F3AC} \u4E00\u952E\u751F\u6210\u5168\u90E8\u89C6\u9891 (",
        coverage.pending,
        ")"
      ] }),
      /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => onUpdate((prevShots) => {
        const arr = prevShots || [];
        return [...arr, { id: stableId("shot"), episode: 1, sceneNo: 1, shotNo: arr.length + 1, shotType: "\u4E2D\u666F", duration: 4, characterNames: [], sceneName: scenes[0]?.name || "" }];
      }), children: "+ \u65B0\u589E\u5206\u955C" })
    ] }),
    view === "table" ? /* @__PURE__ */ jsx("div", { className: "shots-scroll", children: /* @__PURE__ */ jsxs("table", { className: "shots", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "num", children: "\u7F29\u7565" }),
        /* @__PURE__ */ jsx("th", { className: "num", children: "\u96C6" }),
        /* @__PURE__ */ jsx("th", { className: "num", children: "\u573A" }),
        /* @__PURE__ */ jsx("th", { className: "num", children: "\u955C" }),
        /* @__PURE__ */ jsx("th", { children: "\u666F\u522B" }),
        /* @__PURE__ */ jsx("th", { children: "\u753B\u9762" }),
        /* @__PURE__ */ jsx("th", { children: "\u5BF9\u767D" }),
        /* @__PURE__ */ jsx("th", { children: "\u52A8\u4F5C" }),
        /* @__PURE__ */ jsx("th", { children: "\u5B57\u5E55" }),
        /* @__PURE__ */ jsx("th", { className: "num", children: "\u79D2" }),
        /* @__PURE__ */ jsx("th", { children: "\u89D2\u8272" }),
        /* @__PURE__ */ jsx("th", { children: "\u573A\u666F" }),
        /* @__PURE__ */ jsx("th", { className: "prompt-cell", children: "Prompt(\u82F1)" }),
        /* @__PURE__ */ jsx("th", { children: "\u5BFC\u6F14\u5907\u6CE8" }),
        /* @__PURE__ */ jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: filtered.map((s, idx) => {
        const realIdx = shots.indexOf(s);
        return /* @__PURE__ */ jsxs("tr", { className: s.videoUrl ? "row-done" : s.keyframeUrl ? "row-partial" : "", children: [
          /* @__PURE__ */ jsx("td", { className: "num", children: s.keyframeUrl ? /* @__PURE__ */ jsx("img", { src: s.keyframeUrl, style: { width: 48, height: 27, objectFit: "cover", borderRadius: 3 } }) : s.videoUrl ? "\u{1F3AC}" : "\u2014" }),
          /* @__PURE__ */ jsx("td", { className: "num", children: s.episode }),
          /* @__PURE__ */ jsx("td", { className: "num", children: s.sceneNo }),
          /* @__PURE__ */ jsx("td", { className: "num", children: s.shotNo }),
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(idx, "shotType", e.target.textContent), children: s.shotType }) }),
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(idx, "visual", e.target.textContent), children: s.visual }) }),
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(idx, "dialogue", e.target.textContent), children: s.dialogue }) }),
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(idx, "action", e.target.textContent), children: s.action }) }),
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(idx, "subtitle", e.target.textContent), children: s.subtitle || "" }) }),
          /* @__PURE__ */ jsx("td", { className: "num", children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(idx, "duration", parseInt(e.target.textContent) || 0), children: s.duration }) }),
          /* @__PURE__ */ jsx("td", { children: charName(s.characterNames) }),
          /* @__PURE__ */ jsx("td", { children: s.sceneName }),
          /* @__PURE__ */ jsx("td", { className: "prompt-cell", children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(idx, "promptEn", e.target.textContent), children: s.promptEn }) }),
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(idx, "notes", e.target.textContent), children: s.notes || "" }) }),
          /* @__PURE__ */ jsx("td", { className: "shot-actions-cell", children: /* @__PURE__ */ jsxs("div", { className: "shot-actions", children: [
            /* @__PURE__ */ jsx("button", { className: "btn sm ghost", title: "\u590D\u5236EN Prompt", onClick: () => {
              navigator.clipboard?.writeText(s.promptEn);
              toast("\u5DF2\u590D\u5236EN", "ok");
            }, children: "\u590D\u5236" }),
            /* @__PURE__ */ jsx("button", { className: "btn sm", title: "\u751F\u6210\u5173\u952E\u5E27", disabled: !!genKey, onClick: () => genKeyframe(s.id), children: genKey === `kf-${s.id}` ? "..." : s.keyframeUrl ? "\u{1F504}" : "\u{1F5BC}" }),
            /* @__PURE__ */ jsx("button", { className: "btn sm", title: "\u751F\u6210\u89C6\u9891", disabled: !!genKey, onClick: () => genShotVideo(realIdx), children: genKey === `vd-${s.id}` ? "..." : s.videoUrl ? "\u2705" : "\u{1F3AC}" }),
            /* @__PURE__ */ jsx("button", { className: "btn sm ghost", onClick: () => moveShot(idx, -1), children: "\u2191" }),
            /* @__PURE__ */ jsx("button", { className: "btn sm ghost", onClick: () => moveShot(idx, 1), children: "\u2193" }),
            /* @__PURE__ */ jsx("button", { className: "btn sm ghost danger", onClick: () => {
              if (confirm("\u786E\u8BA4\u5220\u9664\u8BE5\u5206\u955C\uFF1F")) onUpdate((prevShots) => {
                const arr = prevShots || shots;
                return arr.filter((_, x) => x !== realIdx);
              });
            }, children: "\u5220" })
          ] }) })
        ] }, s.id);
      }) })
    ] }) }) : /* @__PURE__ */ jsx("div", { className: "shot-grid", children: filtered.map((s, idx) => {
      const realIdx = shots.indexOf(s);
      return /* @__PURE__ */ jsxs("div", { className: "shot-tile", children: [
        /* @__PURE__ */ jsxs("div", { className: "tile-head", children: [
          /* @__PURE__ */ jsxs("span", { children: [
            "\u7B2C",
            s.episode,
            "\u96C6\xB7",
            s.sceneNo,
            "\u573A\xB7",
            s.shotNo,
            "\u955C"
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "badge", children: [
            s.shotType,
            " ",
            s.duration,
            "s"
          ] })
        ] }),
        s.keyframeUrl && /* @__PURE__ */ jsx("img", { src: s.keyframeUrl, style: { width: "100%", borderRadius: 6, marginBottom: 6 } }),
        s.videoUrl && /* @__PURE__ */ jsx("video", { src: s.videoUrl, controls: true, style: { width: "100%", borderRadius: 6, marginBottom: 6 } }),
        s.narrativePurpose && /* @__PURE__ */ jsxs("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--ai-primary)", marginBottom: 4 }, children: [
          "\u{1F3AF} ",
          s.narrativePurpose
        ] }),
        /* @__PURE__ */ jsx("div", { className: "tile-visual", children: s.visual }),
        s.action && /* @__PURE__ */ jsxs("div", { style: { fontSize: 11, color: "var(--ai-text)", marginBottom: 4 }, children: [
          "\u{1F3C3} ",
          s.action
        ] }),
        s.dialogue && /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, color: "var(--ai-text-muted)" }, children: [
          "\u300C",
          s.dialogue,
          "\u300D"
        ] }),
        s.subtitle && s.subtitle !== s.dialogue && /* @__PURE__ */ jsxs("div", { style: { fontSize: 11, color: "var(--ai-text-secondary)" }, children: [
          "\u{1F4DD} ",
          s.subtitle
        ] }),
        s.soundDesign && /* @__PURE__ */ jsxs("div", { style: { fontSize: 11, color: "var(--ai-text-muted)" }, children: [
          "\u{1F50A} ",
          s.soundDesign
        ] }),
        s.continuityNote && /* @__PURE__ */ jsxs("div", { style: { fontSize: 11, color: "var(--ai-warning)", borderTop: "1px dashed var(--ai-border-light)", paddingTop: 4, marginTop: 4 }, children: [
          "\u{1F517} ",
          s.continuityNote
        ] }),
        s.nextShotTransition && /* @__PURE__ */ jsxs("div", { style: { fontSize: 11, color: "var(--ai-text-muted)" }, children: [
          "\u2192 ",
          s.nextShotTransition
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "tile-prompt", children: [
          /* @__PURE__ */ jsx("b", { children: "\u4E2D" }),
          "\uFF1A",
          s.promptZh,
          /* @__PURE__ */ jsx("br", {}),
          /* @__PURE__ */ jsx("b", { children: "EN" }),
          "\uFF1A",
          s.promptEn
        ] }),
        /* @__PURE__ */ jsx("input", { className: "cell-edit", style: { width: "100%", marginTop: 4, fontSize: 11 }, placeholder: "\u5BFC\u6F14\u5907\u6CE8...", defaultValue: s.notes || "", onBlur: (e) => update(idx, "notes", e.target.value) }),
        /* @__PURE__ */ jsxs("div", { className: "tile-actions", children: [
          /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => {
            navigator.clipboard?.writeText(s.promptEn);
            toast("\u5DF2\u590D\u5236EN", "ok");
          }, children: "\u590D\u5236EN" }),
          /* @__PURE__ */ jsx(Button, { size: "small", type: "primary", loading: genKey === `kf-${s.id}`, onClick: () => genKeyframe(s.id), disabled: !s.promptEn, children: s.keyframeUrl ? "\u{1F504}\u5173\u952E\u5E27" : "\u{1F5BC}\u5173\u952E\u5E27" }),
          /* @__PURE__ */ jsx(Button, { size: "small", type: "primary", loading: genKey === `vd-${s.id}`, onClick: () => genShotVideo(realIdx), disabled: !s.keyframeUrl, children: s.videoUrl ? "\u{1F504}\u89C6\u9891" : "\u{1F3AC}\u89C6\u9891" }),
          /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => moveShot(idx, -1), children: "\u2191" }),
          /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => moveShot(idx, 1), children: "\u2193" }),
          /* @__PURE__ */ jsx(Button, { size: "small", danger: true, onClick: () => {
            if (confirm("\u786E\u8BA4\u5220\u9664\u8BE5\u5206\u955C\uFF1F")) onUpdate((prevShots) => {
              const arr = prevShots || shots;
              return arr.filter((_, x) => x !== realIdx);
            });
          }, children: "\u5220" })
        ] })
      ] }, s.id);
    }) })
  ] });
}
function MdView({ content, emptyTip }) {
  if (!content) return /* @__PURE__ */ jsx(Empty, { tip: emptyTip });
  return /* @__PURE__ */ jsx("div", { className: "md-body", dangerouslySetInnerHTML: { __html: renderMd(typeof content === "string" ? content : "```json\n" + JSON.stringify(content, null, 2) + "\n```") } });
}
function KnowledgeView({ project, onUpdate }) {
  const kb = project?.knowledge || { characters: [], scenes: [], props: [], timeline: [] };
  const [sub, setSub] = useS("characters");
  const tabs = [["characters", "\u89D2\u8272"], ["scenes", "\u573A\u666F"], ["props", "\u9053\u5177"], ["timeline", "\u65F6\u95F4\u7EBF"]];
  const list = kb[sub] || [];
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { style: { background: "var(--ai-primary-bg)", borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12, color: "var(--ai-text-body)" }, children: "\u{1F4A1} \u77E5\u8BC6\u5E93\u5728\u6BCF\u6B21\u7AE0\u8282\u5206\u6790\u65F6\u81EA\u52A8\u63D0\u53D6\u5E76\u8DE8\u7AE0\u7D2F\u79EF\u3002\u540E\u7EED\u5206\u6790\uFF08\u89D2\u8272/\u573A\u666F/\u5206\u955C\u7B49\uFF09\u4F1A\u6CE8\u5165\u77E5\u8BC6\u5E93\u4E0A\u4E0B\u6587\uFF0C\u786E\u4FDD\u4EBA\u7269\u5F62\u8C61\u3001\u6027\u683C\u3001\u573A\u666F\u63CF\u8FF0\u8DE8\u7AE0\u4E00\u81F4\uFF08\u907F\u514DOCC\uFF09\u3002" }),
    /* @__PURE__ */ jsx("div", { className: "kb-tabs", children: tabs.map(([k, label]) => /* @__PURE__ */ jsxs("div", { className: `kb-tab ${sub === k ? "active" : ""}`, onClick: () => setSub(k), children: [
      label,
      " (",
      (kb[k] || []).length,
      ")"
    ] }, k)) }),
    list.length === 0 ? /* @__PURE__ */ jsx(Empty, { tip: "\u5206\u6790\u7AE0\u8282\u540E\u5C06\u81EA\u52A8\u63D0\u53D6\u77E5\u8BC6\u5E93\uFF1B\u6216\u5206\u6790\u89D2\u8272\u8BBE\u5B9A\u540E\u81EA\u52A8\u79EF\u7D2F" }) : list.map((item, i) => /* @__PURE__ */ jsxs("div", { className: "kb-item", children: [
      /* @__PURE__ */ jsxs("div", { className: "kb-name", children: [
        item.name || item.chapter || "\u672A\u547D\u540D",
        " ",
        item.sourceChapter && /* @__PURE__ */ jsxs(Tag, { size: "small", color: "app-blue", children: [
          "\u6765\u6E90:",
          item.sourceChapter
        ] })
      ] }),
      Object.entries(item).filter(([k]) => !["id", "name", "chapter", "sourceChapter", "sourceChapterId"].includes(k)).map(([k, v]) => /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, marginBottom: 3 }, children: [
        /* @__PURE__ */ jsxs("b", { style: { color: "var(--ai-text-secondary)" }, children: [
          k,
          "\uFF1A"
        ] }),
        Array.isArray(v) ? v.join("\u3001") : String(v)
      ] }, k))
    ] }, i))
  ] });
}
function MediaGen({ styles, project, characters, scenes, onUpdate, projectRef, vidTask, setVidTask, vidPolling, setVidPolling, pollRef, createServerJob, updateServerJob, recordCompletedAsset }) {
  const [tab, setTab] = useS("image");
  const [prompt2, setPrompt] = useS("");
  const [negPrompt, setNegPrompt] = useS("");
  const [size, setSize] = useS("1024x768");
  const [gen, setGen] = useS(false);
  const [imgUrl, setImgUrl] = useS(null);
  const [err, setErr] = useS("");
  const [refImage, setRefImage] = useS("");
  const [vidDuration, setVidDuration] = useS("5");
  const [vidRatio, setVidRatio] = useS("16:9");
  const [histOpen, setHistOpen] = useS(false);
  const mediaHistory = project?.results?.media || [];
  const delMedia = (id) => onUpdate((prev) => ({ results: { ...prev.results || {}, media: (prev.results?.media || []).filter((m) => m.id !== id) } }));
  const DURATION_MAP = { "3": { num_frames: 81, frame_rate: 24 }, "5": { num_frames: 121, frame_rate: 24 }, "10": { num_frames: 241, frame_rate: 24 } };
  const RATIO_MAP = { "16:9": { width: 1152, height: 768 }, "9:16": { width: 768, height: 1152 }, "1:1": { width: 896, height: 896 } };
  const generateImage = async () => {
    if (!prompt2) {
      toast("\u8BF7\u8F93\u5165Prompt", "error");
      return;
    }
    setGen(true);
    setErr("");
    setImgUrl(null);
    try {
      const images = refImage ? [refImage] : void 0;
      const r = await api.genImage(prompt2, negPrompt, size, project?.style, images);
      if (r.ok) {
        setImgUrl(r.url);
        await recordCompletedAsset(project.id, "project", project.id, "image", r.url, { prompt: prompt2, negPrompt, size, hasRef: !!refImage });
        toast(refImage ? "\u56FE\u751F\u56FE\u5B8C\u6210" : "\u6587\u751F\u56FE\u5B8C\u6210", "ok");
      } else {
        setErr(r.error);
        toast("\u751F\u6210\u5931\u8D25", "error");
      }
    } catch (e) {
      setErr(e.message);
      toast("\u751F\u6210\u5931\u8D25", "error");
    }
    setGen(false);
  };
  const generateVideo = async () => {
    if (!prompt2) {
      toast("\u8BF7\u8F93\u5165Prompt", "error");
      return;
    }
    const targetId = project?.id;
    setGen(true);
    setErr("");
    setVidTask(null);
    setVidPolling(true);
    try {
      const dur = DURATION_MAP[vidDuration];
      const ratio = RATIO_MAP[vidRatio];
      const params = {
        prompt: prompt2,
        visualStyle: project?.style,
        negativePrompt: negPrompt || void 0,
        height: ratio.height,
        width: ratio.width,
        num_frames: dur.num_frames,
        frame_rate: dur.frame_rate,
        image: refImage || void 0
      };
      const r = await api.genVideo(params);
      if (r.ok && r.video_id) {
        const job = await createServerJob(targetId, { type: "video", entityType: "project", entityId: targetId, providerTaskId: r.video_id, status: r.status || "processing", params });
        setVidTask({ video_id: r.video_id, status: r.status, progress: r.progress || 0, url: null });
        toast("\u89C6\u9891\u4EFB\u52A1\u5DF2\u521B\u5EFA\uFF0C\u6B63\u5728\u751F\u6210...", "info");
        pollVideo(r.video_id, targetId, job);
      } else {
        setErr(r.error || "\u521B\u5EFA\u4EFB\u52A1\u5931\u8D25");
        setVidPolling(false);
      }
    } catch (e) {
      setErr(e.message);
      setVidPolling(false);
    }
    setGen(false);
  };
  const pollVideo = async (videoId, targetId, job) => {
    let attempts = 0;
    let delay = 1e4;
    const poll = async () => {
      attempts++;
      try {
        const r = await api.getVideo(videoId);
        if (!r.ok) {
          setErr(r.error);
          setVidPolling(false);
          return;
        }
        if (r.rate_limited) {
          if (attempts < 60) {
            pollRef.current = setTimeout(poll, Math.min(delay * 1.5, 3e4));
          } else {
            setErr("\u89C6\u9891\u751F\u6210\u8D85\u65F6(\u9650\u6D41)");
            setVidPolling(false);
          }
          return;
        }
        setVidTask({ video_id: videoId, status: r.status, progress: r.progress || 0, url: r.url || null, seconds: r.seconds, size: r.size });
        if (r.status === "completed") {
          await updateServerJob(targetId, job.id, { status: "completed", asset: { kind: "video", url: r.url, prompt: prompt2, negPrompt, duration: vidDuration, ratio: vidRatio, hasRef: !!refImage, seconds: r.seconds, size: r.size } });
          setVidPolling(false);
          toast("\u89C6\u9891\u751F\u6210\u5B8C\u6210", "ok");
          return;
        }
        if (r.status === "failed") {
          await updateServerJob(targetId, job.id, { status: "failed", error: r.error || "\u89C6\u9891\u751F\u6210\u5931\u8D25" });
          setErr("\u89C6\u9891\u751F\u6210\u5931\u8D25");
          setVidPolling(false);
          return;
        }
        if (r.status && r.status !== job.status) {
          await updateServerJob(targetId, job.id, { status: r.status, progress: r.progress });
          job.status = r.status;
        }
        if (attempts < 60) {
          pollRef.current = setTimeout(poll, delay);
        } else {
          setErr("\u89C6\u9891\u751F\u6210\u8D85\u65F6");
          setVidPolling(false);
        }
      } catch (e) {
        setErr(e.message);
        setVidPolling(false);
      }
    };
    poll();
  };
  const useCharPrompt = (p, label) => {
    setPrompt(p || "");
    toast("\u5DF2\u586B\u5165" + label, "ok");
  };
  const onUploadRef = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast("\u4EC5\u652F\u6301\u56FE\u7247\u6587\u4EF6", "error");
      e.target.value = "";
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast("\u53C2\u8003\u56FE\u9700\u5C0F\u4E8E8MB", "error");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setRefImage(reader.result);
    reader.readAsDataURL(f);
    e.target.value = "";
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "seg", style: { marginBottom: 12 }, children: [
      /* @__PURE__ */ jsx("button", { className: tab === "image" ? "active" : "", onClick: () => setTab("image"), children: "\u{1F5BC}\uFE0F \u751F\u56FE" }),
      /* @__PURE__ */ jsx("button", { className: tab === "video" ? "active" : "", onClick: () => setTab("video"), children: "\u{1F3AC} \u751F\u89C6\u9891" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "card", style: { marginBottom: 12 }, children: [
      /* @__PURE__ */ jsxs("div", { className: "ai-field", children: [
        /* @__PURE__ */ jsx("label", { children: "Prompt\uFF08\u5DF2\u81EA\u52A8\u8FFD\u52A0\u5F53\u524D\u89C6\u89C9\u98CE\u683C\uFF09" }),
        /* @__PURE__ */ jsx("textarea", { value: prompt2, onChange: (e) => setPrompt(e.target.value), placeholder: "\u63CF\u8FF0\u8981\u751F\u6210\u7684\u753B\u9762...", style: { minHeight: 80 } })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxs("div", { className: "ai-field", children: [
          /* @__PURE__ */ jsx("label", { children: "Negative Prompt" }),
          /* @__PURE__ */ jsx("input", { value: negPrompt, onChange: (e) => setNegPrompt(e.target.value), placeholder: "\u6392\u9664\u7684\u5143\u7D20..." })
        ] }),
        tab === "image" ? /* @__PURE__ */ jsxs("div", { className: "ai-field", children: [
          /* @__PURE__ */ jsx("label", { children: "\u5C3A\u5BF8" }),
          /* @__PURE__ */ jsxs("select", { value: size, onChange: (e) => setSize(e.target.value), children: [
            /* @__PURE__ */ jsx("option", { children: "1024x768" }),
            /* @__PURE__ */ jsx("option", { children: "768x1024" }),
            /* @__PURE__ */ jsx("option", { children: "1024x1024" })
          ] })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "ai-field", children: [
            /* @__PURE__ */ jsx("label", { children: "\u65F6\u957F" }),
            /* @__PURE__ */ jsxs("select", { value: vidDuration, onChange: (e) => setVidDuration(e.target.value), children: [
              /* @__PURE__ */ jsx("option", { value: "3", children: "\u7EA63\u79D2" }),
              /* @__PURE__ */ jsx("option", { value: "5", children: "\u7EA65\u79D2" }),
              /* @__PURE__ */ jsx("option", { value: "10", children: "\u7EA610\u79D2" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "ai-field", children: [
            /* @__PURE__ */ jsx("label", { children: "\u753B\u5E45" }),
            /* @__PURE__ */ jsxs("select", { value: vidRatio, onChange: (e) => setVidRatio(e.target.value), children: [
              /* @__PURE__ */ jsx("option", { value: "16:9", children: "16:9 \u6A2A\u5C4F" }),
              /* @__PURE__ */ jsx("option", { value: "9:16", children: "9:16 \u7AD6\u5C4F" }),
              /* @__PURE__ */ jsx("option", { value: "1:1", children: "1:1 \u65B9\u5F62" })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "ai-field", children: [
        /* @__PURE__ */ jsx("label", { children: "\u53C2\u8003\u56FE\uFF08\u53EF\u9009\uFF0C\u7528\u4E8E\u56FE\u751F\u56FE/\u56FE\u751F\u89C6\u9891\uFF09" }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
          /* @__PURE__ */ jsx("input", { value: refImage ? "(\u5DF2\u4E0A\u4F20\u53C2\u8003\u56FE)" : "", readOnly: true, placeholder: "\u65E0\u53C2\u8003\u56FE\u5219\u6587\u751F\u56FE/\u6587\u751F\u89C6\u9891", style: { flex: 1 } }),
          /* @__PURE__ */ jsx("input", { type: "file", accept: "image/*", hidden: true, id: "refUpload", onChange: onUploadRef }),
          /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => document.getElementById("refUpload")?.click(), children: "\u4E0A\u4F20" }),
          refImage && /* @__PURE__ */ jsx(Button, { size: "small", danger: true, onClick: () => setRefImage(""), children: "\u6E05\u9664" })
        ] }),
        refImage && /* @__PURE__ */ jsx("img", { src: refImage, alt: "\u53C2\u8003\u56FE", style: { width: 80, height: 80, objectFit: "cover", borderRadius: 8, marginTop: 6, border: "2px solid var(--ai-border)" } })
      ] }),
      tab === "image" ? /* @__PURE__ */ jsx(Button, { type: "primary", loading: gen, onClick: generateImage, block: true, children: refImage ? "\u{1F3A8} \u56FE\u751F\u56FE" : "\u{1F5BC}\uFE0F \u6587\u751F\u56FE" }) : /* @__PURE__ */ jsx(Button, { type: "primary", loading: gen, onClick: generateVideo, block: true, children: refImage ? "\u{1F3AC} \u56FE\u751F\u89C6\u9891" : "\u{1F3AC} \u6587\u751F\u89C6\u9891" }),
      err && /* @__PURE__ */ jsx("div", { className: "status-bar error", children: err }),
      imgUrl && /* @__PURE__ */ jsx("img", { className: "img-preview", src: imgUrl, alt: "\u751F\u6210\u7ED3\u679C" }),
      vidTask && /* @__PURE__ */ jsxs("div", { style: { marginTop: 12, padding: 12, background: "var(--ai-bg-content)", borderRadius: 8 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { fontSize: 13, fontWeight: 700, marginBottom: 6 }, children: [
          "\u89C6\u9891\u4EFB\u52A1 ",
          vidTask.status === "completed" ? "\u2705 \u5B8C\u6210" : vidTask.status === "failed" ? "\u274C \u5931\u8D25" : "\u23F3 \u751F\u6210\u4E2D...",
          vidTask.seconds && /* @__PURE__ */ jsxs("span", { style: { marginLeft: 8, color: "var(--ai-text-muted)" }, children: [
            vidTask.seconds,
            "s / ",
            vidTask.size
          ] })
        ] }),
        vidTask.status !== "completed" && vidTask.status !== "failed" && /* @__PURE__ */ jsx("div", { className: "progress-line", children: /* @__PURE__ */ jsx("div", { className: "fill", style: { width: vidTask.progress + "%" } }) }),
        vidTask.status === "completed" && vidTask.url && /* @__PURE__ */ jsx("video", { src: vidTask.url, controls: true, style: { width: "100%", borderRadius: 8, marginTop: 8 } })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "card-title", children: "\u26A1 \u5FEB\u901F\u586B\u5165\uFF08\u70B9\u51FB\u590D\u5236\u89D2\u8272/\u573A\u666FPrompt\u5230\u4E0A\u65B9\uFF09" }),
    characters.length === 0 && scenes.length === 0 ? /* @__PURE__ */ jsx(Empty, { tip: "\u5148\u751F\u6210\u89D2\u8272/\u573A\u666F\u8BBE\u5B9A" }) : /* @__PURE__ */ jsxs("div", { className: "grid-cards", style: { marginTop: 10 }, children: [
      characters.map((c, i) => /* @__PURE__ */ jsxs("div", { className: "item-card", children: [
        /* @__PURE__ */ jsx("div", { className: "kb-name", children: c.name }),
        /* @__PURE__ */ jsx(Button, { size: "small", style: { marginTop: 6 }, onClick: () => useCharPrompt(c.imagePromptEn, c.name + "\u8BBE\u5B9A\u56FE"), disabled: !c.imagePromptEn, children: "\u586B\u5165\u8BBE\u5B9A\u56FEEN" })
      ] }, "c" + i)),
      scenes.map((s, i) => /* @__PURE__ */ jsxs("div", { className: "item-card", children: [
        /* @__PURE__ */ jsx("div", { className: "kb-name", children: s.name }),
        /* @__PURE__ */ jsx(Button, { size: "small", style: { marginTop: 6 }, onClick: () => useCharPrompt(s.imagePromptEn, s.name), disabled: !s.imagePromptEn, children: "\u573A\u666F\u56FE" })
      ] }, "s" + i)),
      project?.results?.storyboard?.shots?.map((s, i) => /* @__PURE__ */ jsxs("div", { className: "item-card", children: [
        /* @__PURE__ */ jsxs("div", { className: "kb-name", children: [
          "\u7B2C",
          s.episode,
          "\u96C6 ",
          s.sceneNo,
          "-",
          s.shotNo
        ] }),
        /* @__PURE__ */ jsx(Button, { size: "small", style: { marginTop: 6 }, onClick: () => {
          setTab("video");
          useCharPrompt(s.promptEn, "\u5206\u955C" + s.shotNo);
        }, disabled: !s.promptEn, children: "\u586B\u5165\u89C6\u9891EN" })
      ] }, "v" + i))
    ] }),
    mediaHistory.length > 0 && /* @__PURE__ */ jsxs("div", { className: "card", style: { marginTop: 12 }, children: [
      /* @__PURE__ */ jsxs("div", { className: "card-title", style: { display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }, onClick: () => setHistOpen(!histOpen), children: [
        /* @__PURE__ */ jsxs("span", { children: [
          "\u{1F5C2}\uFE0F \u751F\u6210\u5386\u53F2\uFF08",
          mediaHistory.length,
          "\uFF09"
        ] }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: 12, color: "var(--ai-text-muted)" }, children: histOpen ? "\u6536\u8D77 \u25B4" : "\u5C55\u5F00 \u25BE" })
      ] }),
      histOpen && /* @__PURE__ */ jsx("div", { className: "media-gallery", children: [...mediaHistory].reverse().map((m) => /* @__PURE__ */ jsxs("div", { className: "media-item", children: [
        /* @__PURE__ */ jsx("div", { className: "media-thumb", children: m.type === "image" ? /* @__PURE__ */ jsx("img", { src: m.url, alt: m.prompt, loading: "lazy" }) : /* @__PURE__ */ jsx("video", { src: m.url, controls: true, preload: "metadata" }) }),
        /* @__PURE__ */ jsxs("div", { className: "media-meta", children: [
          /* @__PURE__ */ jsxs("span", { className: "media-tag", children: [
            m.type === "image" ? "\u{1F5BC}\uFE0F" : "\u{1F3AC}",
            m.hasRef ? "(\u53C2\u8003\u56FE)" : ""
          ] }),
          m.size && m.type === "image" && /* @__PURE__ */ jsx("span", { className: "media-size", children: m.size }),
          m.duration && /* @__PURE__ */ jsxs("span", { className: "media-size", children: [
            m.duration,
            "s"
          ] }),
          m.seconds && /* @__PURE__ */ jsxs("span", { className: "media-size", children: [
            m.seconds,
            "s"
          ] }),
          /* @__PURE__ */ jsx("span", { className: "media-time", children: m.createdAt ? new Date(m.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "media-prompt", title: m.prompt, children: [
          (m.prompt || "").slice(0, 60),
          (m.prompt || "").length > 60 ? "..." : ""
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "media-actions", children: [
          /* @__PURE__ */ jsx("a", { href: m.url, download: true, target: "_blank", rel: "noreferrer", children: /* @__PURE__ */ jsx(Button, { size: "small", children: "\u4E0B\u8F7D" }) }),
          /* @__PURE__ */ jsx(Button, { size: "small", danger: true, onClick: () => delMedia(m.id), children: "\u5220" })
        ] })
      ] }, m.id)) })
    ] })
  ] });
}
function MangaView({ manga, project, onUpdate, projectRef, recordCompletedAsset }) {
  const [generatingKey, setGeneratingKey] = useS(null);
  if (!manga || !manga.pages || !manga.pages.length) return /* @__PURE__ */ jsx(Empty, { tip: "\u751F\u6210\u6F2B\u753B\u811A\u672C\u540E\u5C06\u663E\u793A\u5206\u683C\u753B\u9762\uFF0C\u6BCF\u683C\u53EF\u4E00\u952E\u751F\u6210\u6F2B\u753B\u56FE" });
  const pages = manga.pages;
  const panelImages = manga.panelImages || {};
  const genPanelImage = async (pageIdx, panelIdx, panel) => {
    const key = panel.id;
    const targetProjectId = project.id;
    if (!panel.imagePromptEn) {
      toast("\u8BE5\u683C\u7F3A\u5C11\u82F1\u6587Prompt", "error");
      return;
    }
    setGeneratingKey(key);
    try {
      const r = await api.genImage(panel.imagePromptEn, "", "1024x1024", project?.style);
      if (r.ok) {
        await recordCompletedAsset(targetProjectId, "panel", panel.id, "image", r.url, { prompt: panel.imagePromptEn });
        toast("\u6F2B\u753B\u683C\u751F\u6210\u5B8C\u6210", "ok");
      } else {
        toast(r.error || "\u751F\u6210\u5931\u8D25", "error");
      }
    } catch (e) {
      toast(e.message, "error");
    }
    setGeneratingKey(null);
  };
  const genAll = async () => {
    for (let pi = 0; pi < pages.length; pi++) {
      for (let gi = 0; gi < pages[pi].panels.length; gi++) {
        const key = pages[pi].panels[gi].id;
        const currentImages = projectRef?.current?.results?.manga?.panelImages || panelImages;
        if (currentImages[key]) continue;
        await genPanelImage(pi, gi, pages[pi].panels[gi]);
      }
    }
  };
  const pendingCount = pages.reduce((sum, pg) => sum + pg.panels.filter((panel) => !panel.imageUrl && !panelImages[panel.id]).length, 0);
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "card", style: { marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: 15 }, children: manga.title || "\u672A\u547D\u540D\u6F2B\u753B" }),
        /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, color: "var(--ai-text-muted)" }, children: [
          manga.styleType,
          " \xB7 ",
          manga.totalPages,
          "\u9875 \xB7 ",
          manga.readingDirection,
          " \xB7 ",
          manga.platform
        ] })
      ] }),
      /* @__PURE__ */ jsx(Button, { type: "primary", loading: !!generatingKey, onClick: genAll, disabled: pendingCount === 0, children: generatingKey ? "\u751F\u6210\u4E2D..." : `\u4E00\u952E\u751F\u6210\u5168\u90E8\u6F2B\u753B\u56FE${pendingCount > 0 ? `(${pendingCount}\u683C\u5F85\u751F\u6210)` : ""}` })
    ] }),
    manga.synopsis && /* @__PURE__ */ jsx("div", { className: "md-body", style: { marginBottom: 12, fontSize: 13, color: "var(--ai-text-muted)" }, children: manga.synopsis }),
    pages.map((page, pi) => /* @__PURE__ */ jsxs("div", { className: "card", style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ jsxs("div", { className: "manga-page-head", children: [
        /* @__PURE__ */ jsxs("span", { className: "manga-page-num", children: [
          "\u7B2C",
          page.pageNum || pi + 1,
          "\u9875"
        ] }),
        /* @__PURE__ */ jsx("span", { className: "manga-pace", children: page.narrativePace }),
        page.pageHook && /* @__PURE__ */ jsxs("span", { className: "manga-hook", title: page.pageHook, children: [
          "\u7FFB\u9875\u94A9\u5B50: ",
          page.pageHook
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "manga-panels", children: page.panels.map((panel, gi) => {
        const key = panel.id;
        const imgUrl = panel.imageUrl || panelImages[key] || panelImages[`${pi}-${gi}`];
        const isGenerating = generatingKey === key;
        return /* @__PURE__ */ jsxs("div", { className: `manga-panel ${panel.sizeHint?.includes("\u5927") ? "large" : panel.sizeHint?.includes("\u5C0F") ? "small" : ""}`, children: [
          /* @__PURE__ */ jsxs("div", { className: "manga-panel-head", children: [
            /* @__PURE__ */ jsxs("span", { className: "manga-panel-num", children: [
              "\u683C",
              panel.panelNum || gi + 1
            ] }),
            /* @__PURE__ */ jsx("span", { className: "manga-layout", children: panel.layout }),
            panel.sizeHint && /* @__PURE__ */ jsx("span", { className: "manga-size-hint", children: panel.sizeHint })
          ] }),
          (imgUrl || isGenerating) && /* @__PURE__ */ jsxs("div", { className: "manga-panel-image", children: [
            isGenerating && /* @__PURE__ */ jsx("div", { className: "manga-gen-loading", children: "\u751F\u6210\u4E2D..." }),
            imgUrl && /* @__PURE__ */ jsx("img", { src: imgUrl, alt: `\u683C${gi + 1}`, loading: "lazy" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "manga-panel-desc", children: panel.sceneDesc }),
          panel.characterExpressions && /* @__PURE__ */ jsxs("div", { className: "manga-panel-meta", children: [
            /* @__PURE__ */ jsx("b", { children: "\u8868\u60C5:" }),
            " ",
            panel.characterExpressions
          ] }),
          panel.dialogue?.length > 0 && /* @__PURE__ */ jsx("div", { className: "manga-dialogues", children: panel.dialogue.map((d, di) => /* @__PURE__ */ jsxs("div", { className: "manga-dialogue", children: [
            /* @__PURE__ */ jsx("span", { className: "dl-pos", children: d.position }),
            /* @__PURE__ */ jsxs("span", { className: "dl-speaker", children: [
              d.speaker,
              ":"
            ] }),
            " ",
            /* @__PURE__ */ jsxs("span", { className: "dl-text", children: [
              "\u300C",
              d.text,
              "\u300D"
            ] })
          ] }, di)) }),
          panel.narration?.text && /* @__PURE__ */ jsxs("div", { className: "manga-narration", children: [
            /* @__PURE__ */ jsx("span", { className: "dl-pos", children: panel.narration.position }),
            " ",
            panel.narration.text
          ] }),
          panel.soundEffect?.text && /* @__PURE__ */ jsx("div", { className: "manga-sfx", "data-style": panel.soundEffect.style, children: panel.soundEffect.text }),
          panel.emotionSymbols?.length > 0 && /* @__PURE__ */ jsx("div", { className: "manga-emotions", children: panel.emotionSymbols.join(" ") }),
          panel.transitionToNext && /* @__PURE__ */ jsxs("div", { className: "manga-transition", children: [
            "\u2192 ",
            panel.transitionToNext
          ] }),
          panel.imagePromptEn && /* @__PURE__ */ jsx("div", { className: "manga-panel-prompt", children: /* @__PURE__ */ jsxs("details", { children: [
            /* @__PURE__ */ jsx("summary", { children: "\u82F1\u6587Prompt" }),
            /* @__PURE__ */ jsx("div", { className: "prompt-text", children: panel.imagePromptEn })
          ] }) }),
          /* @__PURE__ */ jsxs("div", { className: "manga-panel-actions", children: [
            /* @__PURE__ */ jsx(Button, { size: "small", type: "primary", loading: isGenerating, onClick: () => genPanelImage(pi, gi, panel), disabled: !panel.imagePromptEn, children: imgUrl ? "\u91CD\u65B0\u751F\u56FE" : "\u751F\u56FE" }),
            imgUrl && /* @__PURE__ */ jsx("a", { href: imgUrl, download: true, target: "_blank", rel: "noreferrer", children: /* @__PURE__ */ jsx(Button, { size: "small", children: "\u4E0B\u8F7D" }) })
          ] })
        ] }, panel.id);
      }) })
    ] }, page.id))
  ] });
}
function SnapshotView({ project, flushProject }) {
  const [snapshots, setSnapshots] = useS([]);
  const [loading, setLoading] = useS(false);
  const [label, setLabel] = useS("");
  const refresh = async () => {
    if (!project?.id) return;
    try {
      setSnapshots(await api.getSnapshots(project.id));
    } catch {
    }
  };
  useE(() => {
    refresh();
  }, [project?.id]);
  const create = async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      await flushProject(project.id);
      await api.snapshot(project.id, label.trim() || `\u5FEB\u7167 ${snapshots.length + 1}`);
      setLabel("");
      toast("\u5FEB\u7167\u5DF2\u521B\u5EFA", "ok");
      refresh();
    } catch (e) {
      toast("\u521B\u5EFA\u5931\u8D25: " + e.message, "error");
    }
    setLoading(false);
  };
  const restore = async (snId) => {
    if (!confirm("\u6062\u590D\u5FEB\u7167\u5C06\u8986\u76D6\u5F53\u524D\u5185\u5BB9\uFF08\u4F1A\u81EA\u52A8\u4FDD\u5B58\u5F53\u524D\u72B6\u6001\u4E3A\u5FEB\u7167\uFF09")) return;
    try {
      await flushProject(project.id);
      await api.restoreSnapshot(project.id, snId);
      toast("\u5FEB\u7167\u5DF2\u6062\u590D", "ok");
      window.location.reload();
    } catch (e) {
      toast("\u6062\u590D\u5931\u8D25: " + e.message, "error");
    }
  };
  if (!snapshots.length) return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "card", style: { marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }, children: [
      /* @__PURE__ */ jsx(Input, { value: label, onChange: (e) => setLabel(e.target.value), placeholder: "\u5FEB\u7167\u540D\u79F0\uFF08\u53EF\u9009\uFF09", style: { flex: 1 } }),
      /* @__PURE__ */ jsx(Button, { type: "primary", loading, onClick: create, children: "\u{1F4F8} \u521B\u5EFA\u5FEB\u7167" })
    ] }),
    /* @__PURE__ */ jsx(Empty, { tip: "\u521B\u5EFA\u5FEB\u7167\u53EF\u4FDD\u5B58\u5F53\u524D\u9879\u76EE\u72B6\u6001\uFF0C\u968F\u65F6\u53EF\u6062\u590D\uFF08\u6700\u591A20\u4E2A\uFF09" })
  ] });
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "card", style: { marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }, children: [
      /* @__PURE__ */ jsx(Input, { value: label, onChange: (e) => setLabel(e.target.value), placeholder: "\u5FEB\u7167\u540D\u79F0\uFF08\u53EF\u9009\uFF09", style: { flex: 1 } }),
      /* @__PURE__ */ jsx(Button, { type: "primary", loading, onClick: create, children: "\u{1F4F8} \u521B\u5EFA\u5FEB\u7167" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grid-cards", children: snapshots.slice().reverse().map((s) => /* @__PURE__ */ jsxs("div", { className: "item-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "item-head", children: [
        /* @__PURE__ */ jsx("input", { className: "item-name", value: s.label, readOnly: true }),
        /* @__PURE__ */ jsx(Button, { size: "small", type: "primary", onClick: () => restore(s.id), children: "\u6062\u590D" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "field", style: { fontSize: 11, color: "var(--ai-text-muted)" }, children: new Date(s.timestamp).toLocaleString("zh-CN") })
    ] }, s.id)) })
  ] });
}
function ConsistencyView({ project, onUpdate }) {
  const consistency = project.results?.consistency || { issues: [], summary: "", blockingCount: 0 };
  const [running, setRunning] = useS(false);
  const run = async () => {
    if (!project.results || Object.keys(project.results).length === 0) {
      toast("\u8BF7\u5148\u751F\u6210\u5206\u6790\u7ED3\u679C", "error");
      return;
    }
    setRunning(true);
    try {
      await api.checkConsistency(project.id, project.results, project.knowledge, (d) => {
        if (d.status === "done" && d.result) onUpdate((prev) => ({ results: { ...prev.results, consistency: d.result } }));
        if (d.error) toast(d.error, "error");
      });
      toast("\u68C0\u67E5\u5B8C\u6210", "ok");
    } catch (e) {
      toast("\u68C0\u67E5\u5931\u8D25", "error");
    }
    setRunning(false);
  };
  const updateStatus = (issueId, status) => onUpdate((prev) => {
    const current = prev.results?.consistency || consistency;
    const issues = (current.issues || []).map((issue) => issue.id === issueId ? { ...issue, status } : issue);
    const blockingCount = issues.filter((issue) => issue.severity === "error" && issue.status === "open").length;
    return { results: { ...prev.results, consistency: { ...current, issues, blockingCount } } };
  });
  return /* @__PURE__ */ jsxs("div", { className: "consistency-view", children: [
    /* @__PURE__ */ jsxs("div", { className: "consistency-toolbar", children: [
      /* @__PURE__ */ jsx(Button, { type: "primary", loading: running, onClick: run, children: "\u{1F50D} \u68C0\u67E5\u4E00\u81F4\u6027" }),
      /* @__PURE__ */ jsxs("span", { className: `blocking-count ${consistency.blockingCount ? "active" : ""}`, children: [
        "\u963B\u65AD ",
        consistency.blockingCount || 0
      ] }),
      /* @__PURE__ */ jsxs("span", { children: [
        "\u95EE\u9898 ",
        (consistency.issues || []).length
      ] })
    ] }),
    consistency.summary && /* @__PURE__ */ jsx("div", { className: "md-body consistency-summary", dangerouslySetInnerHTML: { __html: renderMd(consistency.summary) } }),
    (consistency.issues || []).length ? /* @__PURE__ */ jsx("div", { className: "consistency-issues", children: consistency.issues.map((issue) => /* @__PURE__ */ jsxs("div", { className: `consistency-issue severity-${issue.severity} status-${issue.status}`, children: [
      /* @__PURE__ */ jsxs("div", { className: "issue-head", children: [
        /* @__PURE__ */ jsx(Tag, { children: issue.severity }),
        /* @__PURE__ */ jsx("b", { children: issue.rule || issue.category }),
        /* @__PURE__ */ jsxs("span", { children: [
          issue.entityType,
          issue.entityId ? ` \xB7 ${issue.entityId}` : "",
          issue.shotId ? ` \xB7 shot ${issue.shotId}` : ""
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "issue-message", children: issue.message }),
      issue.suggestion && /* @__PURE__ */ jsxs("div", { className: "issue-suggestion", children: [
        "\u5EFA\u8BAE\uFF1A",
        issue.suggestion
      ] }),
      /* @__PURE__ */ jsx("div", { className: "issue-actions", children: ["open", "resolved", "accepted"].map((status) => /* @__PURE__ */ jsx("button", { className: issue.status === status ? "active" : "", onClick: () => updateStatus(issue.id, status), children: status }, status)) })
    ] }, issue.id)) }) : !consistency.summary && /* @__PURE__ */ jsx(Empty, { tip: "\u70B9\u51FB\u4E0A\u65B9\u6309\u94AE\u68C0\u67E5\u5404\u6A21\u5757\u95F4\u89D2\u8272\u3001\u573A\u666F\u548C\u65F6\u95F4\u7EBF\u4E00\u81F4\u6027" })
  ] });
}
function Empty({ tip }) {
  return /* @__PURE__ */ jsxs("div", { className: "empty", children: [
    /* @__PURE__ */ jsx("div", { className: "big", children: "\u2726" }),
    /* @__PURE__ */ jsx("div", { style: { fontSize: 16, marginBottom: 6 }, children: "\u6682\u65E0\u5185\u5BB9" }),
    /* @__PURE__ */ jsx("div", { style: { fontSize: 13 }, children: tip })
  ] });
}
function App() {
  const [projects, setProjects] = useS([]);
  const [currentId, setCurrentId] = useS(null);
  const [project, setProject] = useS(null);
  const [styles, setStyles] = useS([]);
  const [settingsOpen, setSettingsOpen] = useS(false);
  const [newOpen, setNewOpen] = useS(false);
  const [collapsed, setCollapsed] = useS(false);
  const [inputCollapsed, setInputCollapsed] = useS(false);
  const [mobileTab, setMobileTab] = useS("input");
  const [sidebarOpen, setSidebarOpen] = useS(false);
  const [cfg, setCfg] = useS(null);
  const [darkMode, setDarkMode] = useS(() => {
    try {
      return localStorage.getItem("theme") === "dark";
    } catch {
      return false;
    }
  });
  useE(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    try {
      localStorage.setItem("theme", darkMode ? "dark" : "light");
    } catch {
    }
  }, [darkMode]);
  const [analysisSource, setAnalysisSource] = useS({ mode: "chapters", chId: "" });
  const [streaming, setStreaming] = useS("");
  const [streamingType, setStreamingType] = useS("");
  const [batchGenerating, setBatchGenerating] = useS(false);
  const [loadingProject, setLoadingProject] = useS(false);
  const [saveStatus, setSaveStatus] = useS("saved");
  const refreshProjects = useCB(async () => {
    try {
      const r = await api.listProjects();
      setProjects(r.items || []);
    } catch {
    }
  }, []);
  useE(() => {
    refreshProjects();
    api.styles().then((s) => setStyles(s)).catch(() => {
    });
    api.getConfig().then(setCfg).catch(() => {
    });
  }, []);
  useE(() => {
    window.__analyzeAll = (mods) => window.__analyzeAllImpl?.(mods);
  });
  const projectRef = useR(null);
  const saveTimers = useR({});
  const pendingProjects = useR({});
  const savingProjects = useR({});
  const loadToken = useR(0);
  useE(() => {
    projectRef.current = project;
  }, [project]);
  const flushProject = useCB(async (id) => {
    clearTimeout(saveTimers.current[id]);
    delete saveTimers.current[id];
    if (savingProjects.current[id]) {
      await savingProjects.current[id];
      if (pendingProjects.current[id]) return flushProject(id);
      return;
    }
    const pending = pendingProjects.current[id];
    if (!pending) return;
    delete pendingProjects.current[id];
    setSaveStatus("saving");
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
    const promise = save(pending).then((saved) => {
      const revision = saved.revision ?? pending.revision;
      if (pendingProjects.current[id]) pendingProjects.current[id] = { ...pendingProjects.current[id], revision };
      if (projectRef.current?.id === id) {
        const next = pendingProjects.current[id] ? { ...projectRef.current, revision } : normalizeProject({ ...projectRef.current, ...saved, revision });
        projectRef.current = next;
        setProject(next);
        setSaveStatus(pendingProjects.current[id] ? "saving" : "saved");
      }
      refreshProjects();
    }).catch((error) => {
      pendingProjects.current[id] = pendingProjects.current[id] || pending;
      setSaveStatus(error.status === 409 ? "conflict" : "failed");
      throw error;
    }).finally(() => {
      delete savingProjects.current[id];
    });
    savingProjects.current[id] = promise;
    await promise;
    if (pendingProjects.current[id]) return flushProject(id);
  }, [refreshProjects]);
  const loadProject = async (id) => {
    const token = ++loadToken.current;
    const previousId = projectRef.current?.id;
    if (previousId) {
      try {
        await flushProject(previousId);
      } catch {
      }
    }
    if (!id || token !== loadToken.current) {
      if (!id) {
        setProject(null);
        setCurrentId(null);
      }
      return;
    }
    setLoadingProject(true);
    try {
      const loaded = normalizeProject(await api.getProject(id));
      if (token !== loadToken.current) return;
      projectRef.current = loaded;
      setProject(loaded);
      setCurrentId(id);
      setSaveStatus("saved");
      setAnalysisSource({ mode: "chapters", chId: "" });
    } catch (e) {
      if (token === loadToken.current) toast(e.message, "error");
    }
    if (token === loadToken.current) setLoadingProject(false);
  };
  const updateProject = useCB((patchOrFn) => {
    const current = projectRef.current;
    if (!current) return;
    const patch = typeof patchOrFn === "function" ? patchOrFn(current) : patchOrFn;
    let updated = { ...current, ...patch };
    const upstreamChanged = ["content", "style", "chapters"].some((key) => patch[key] !== void 0 && patch[key] !== current[key]);
    if (upstreamChanged) updated = { ...updated, ...staleUpstream(updated) };
    updated = normalizeProject(updated);
    projectRef.current = updated;
    setProject(updated);
    pendingProjects.current[current.id] = updated;
    setSaveStatus("saving");
    clearTimeout(saveTimers.current[current.id]);
    saveTimers.current[current.id] = setTimeout(() => {
      flushProject(current.id).catch(() => {
      });
    }, 600);
  }, [flushProject]);
  const updateTargetProject = useCB(async (targetProjectId, patchOrFn, flushNow = false) => {
    if (projectRef.current?.id === targetProjectId) {
      updateProject(patchOrFn);
      if (flushNow) await flushProject(targetProjectId);
      return;
    }
    const base = pendingProjects.current[targetProjectId] || normalizeProject(await api.getProject(targetProjectId));
    const patch = typeof patchOrFn === "function" ? patchOrFn(base) : patchOrFn;
    pendingProjects.current[targetProjectId] = normalizeProject({ ...base, ...patch });
    clearTimeout(saveTimers.current[targetProjectId]);
    if (flushNow) await flushProject(targetProjectId);
    else saveTimers.current[targetProjectId] = setTimeout(() => {
      flushProject(targetProjectId).catch(() => {
      });
    }, 600);
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
      setSaveStatus(pending ? "saving" : "saved");
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
    const job = await createServerJob(projectId, { type: kind, kind, entityType, entityId, status: "processing", params: metadata });
    return updateServerJob(projectId, job.id, { status: "completed", asset: { kind, url, ...metadata } });
  }, [createServerJob, updateServerJob]);
  useE(() => () => {
    Object.values(saveTimers.current).forEach(clearTimeout);
  }, []);
  useE(() => {
    if (!project?.id) return;
    const pendingJobs = (project.jobs || []).filter((job) => job.type === "video" && ["pending", "processing", "in_progress", "running", "queued"].includes(job.status));
    let cancelled = false;
    const timers = [];
    pendingJobs.forEach((job) => {
      const poll = async () => {
        if (cancelled) return;
        try {
          const result = await api.getVideo(job.providerTaskId);
          if (cancelled) return;
          if (result.status === "completed") {
            await updateServerJob(project.id, job.id, { status: "completed", asset: { kind: "video", url: result.url, jobId: job.id } });
            return;
          }
          if (result.status === "failed") {
            await updateServerJob(project.id, job.id, { status: "failed", error: result.error || "\u89C6\u9891\u751F\u6210\u5931\u8D25" });
            return;
          }
          if (result.status && result.status !== job.status) {
            await updateServerJob(project.id, job.id, { status: result.status, progress: result.progress });
            job.status = result.status;
          }
          timers.push(setTimeout(poll, 1e4));
        } catch {
          timers.push(setTimeout(poll, 15e3));
        }
      };
      poll();
    });
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [project?.id, updateServerJob]);
  const createProject = async (name, style) => {
    const p = await api.createProject(name, style);
    await refreshProjects();
    setNewOpen(false);
    loadProject(p.id);
    toast("\u9879\u76EE\u5DF2\u521B\u5EFA", "ok");
  };
  const deleteProject = async (id) => {
    if (!confirm("\u786E\u8BA4\u5220\u9664\u8BE5\u9879\u76EE\uFF1F")) return;
    clearTimeout(saveTimers.current[id]);
    delete pendingProjects.current[id];
    await api.deleteProject(id);
    await refreshProjects();
    if (currentId === id) {
      setCurrentId(null);
      setProject(null);
      projectRef.current = null;
    }
  };
  const renameProject = async (id, name) => {
    try {
      if (currentId === id) await flushProject(id);
      const current = currentId === id ? projectRef.current : normalizeProject(await api.getProject(id));
      const saved = await api.updateProject(id, { name }, current.revision);
      if (currentId === id) syncServerProject(saved);
      await refreshProjects();
      toast("\u5DF2\u91CD\u547D\u540D", "ok");
    } catch (e) {
      toast(e.message, "error");
    }
  };
  const importProject = async (data) => {
    try {
      await api.importProject(data);
      toast("\u5BFC\u5165\u6210\u529F", "ok");
      await refreshProjects();
    } catch (e) {
      toast(e.message, "error");
    }
  };
  const loadExample = async () => {
    try {
      const p = await api.importProject(EXAMPLE_PROJECT);
      await refreshProjects();
      loadProject(p.id);
      toast("\u5DF2\u52A0\u8F7D\u793A\u4F8B", "ok");
    } catch (e) {
      toast(e.message, "error");
    }
  };
  const hasProvider = cfg?.providers?.some((p) => p.apiKey && p.apiKey !== "");
  const hasChapters = (project?.chapters?.length || 0) > 0;
  const computeContent = () => {
    if (!project) return "";
    const chapters = project.chapters || [];
    if (hasChapters) {
      if (analysisSource.mode === "chapter") {
        const ch = chapters.find((c) => c.id === analysisSource.chId);
        return ch ? `## ${ch.title}
${ch.content || ""}` : "";
      }
      if (analysisSource.mode === "content") return project.content || "";
      return chapters.map((c) => `## ${c.title}
${c.content || ""}`).join("\n\n");
    }
    return project.content || "";
  };
  const analysisContent = computeContent();
  return /* @__PURE__ */ jsxs("div", { className: "app-layout", children: [
    /* @__PURE__ */ jsxs("header", { className: "app-header", children: [
      /* @__PURE__ */ jsxs("div", { className: "header-left", children: [
        /* @__PURE__ */ jsx("button", { className: "mobile-menu-btn", onClick: () => setSidebarOpen(true), children: "\u2630" }),
        /* @__PURE__ */ jsxs("div", { className: "logo", children: [
          /* @__PURE__ */ jsx("span", { className: "logo-icon", children: "\u{1F3AC}" }),
          /* @__PURE__ */ jsx("span", { className: "logo-text", children: "\u77ED\u5267\u811A\u672C\u5DE5\u574A" }),
          /* @__PURE__ */ jsx("span", { className: "logo-badge", children: "v3.1" })
        ] }),
        project && /* @__PURE__ */ jsxs("span", { className: "mobile-current-proj", onClick: () => setSidebarOpen(true), children: [
          project.name,
          " \u25BE"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "header-right", children: [
        project && /* @__PURE__ */ jsx("span", { className: `save-state ${saveStatus}`, children: saveStatus === "saving" ? "\u4FDD\u5B58\u4E2D" : saveStatus === "saved" ? "\u5DF2\u4FDD\u5B58" : saveStatus === "conflict" ? "\u4FDD\u5B58\u51B2\u7A81" : "\u4FDD\u5B58\u5931\u8D25" }),
        /* @__PURE__ */ jsxs("div", { className: "model-info", onClick: () => setSettingsOpen(true), children: [
          /* @__PURE__ */ jsx("span", { className: `model-dot ${hasProvider ? "" : "off"}` }),
          /* @__PURE__ */ jsx("span", { className: "model-name-text", children: hasProvider ? cfg.providers.find((p) => p.id === cfg.activeProvider)?.name || "\u5DF2\u914D\u7F6E" : "\u672A\u914D\u7F6E\u6A21\u578B" }),
          /* @__PURE__ */ jsx("span", { className: "model-gear", children: "\u2699\uFE0F" })
        ] }),
        /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => setDarkMode((d) => !d), title: "\u5207\u6362\u6DF1\u8272\u6A21\u5F0F", children: darkMode ? "\u2600\uFE0F" : "\u{1F319}" }),
        /* @__PURE__ */ jsxs(Button, { size: "small", onClick: () => setSettingsOpen(true), children: [
          /* @__PURE__ */ jsx("span", { className: "settings-text", children: "\u8BBE\u7F6E" }),
          /* @__PURE__ */ jsx("span", { className: "settings-icon", children: "\u2699\uFE0F" })
        ] })
      ] }),
      project && /* @__PURE__ */ jsxs("div", { className: "mobile-tabs", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setSidebarOpen(true), children: "\u{1F4C1} \u9879\u76EE" }),
        /* @__PURE__ */ jsx("button", { className: mobileTab === "input" ? "active" : "", onClick: () => setMobileTab("input"), children: "\u{1F4DD} \u8F93\u5165" }),
        /* @__PURE__ */ jsx("button", { className: mobileTab === "result" ? "active" : "", onClick: () => setMobileTab("result"), children: "\u{1F3AC} \u7ED3\u679C" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "app-body", children: [
      sidebarOpen && /* @__PURE__ */ jsx("div", { className: "sidebar-overlay", onClick: () => setSidebarOpen(false) }),
      /* @__PURE__ */ jsx(Sidebar, { projects, currentId, onSelect: (id) => {
        loadProject(id);
        setSidebarOpen(false);
      }, onNew: () => {
        setNewOpen(true);
        setSidebarOpen(false);
      }, onDelete: deleteProject, onImport: importProject, onRename: renameProject, collapsed, onToggle: () => setCollapsed((c) => !c), mobileOpen: sidebarOpen, onCloseMobile: () => setSidebarOpen(false) }),
      loadingProject ? /* @__PURE__ */ jsx("div", { className: "main-area", style: { alignItems: "center", justifyContent: "center", color: "var(--ai-text-muted)" }, children: /* @__PURE__ */ jsxs("div", { style: { textAlign: "center" }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: 28, marginBottom: 8 }, children: "\u23F3" }),
        /* @__PURE__ */ jsx("div", { children: "\u52A0\u8F7D\u9879\u76EE..." })
      ] }) }) : project ? /* @__PURE__ */ jsxs("div", { className: `main-area mobile-tab-${mobileTab}`, children: [
        /* @__PURE__ */ jsx(
          InputPanel,
          {
            project,
            onUpdate: updateProject,
            styles,
            generating: batchGenerating,
            hasChapters,
            hasProvider,
            analysisSource,
            setAnalysisSource,
            analysisContent,
            collapsed: inputCollapsed,
            onToggleCollapse: () => setInputCollapsed((c) => !c),
            onAnalyzeAll: (mods, resumeRunId) => window.__analyzeAllImpl?.(mods, resumeRunId)
          }
        ),
        /* @__PURE__ */ jsx(ResultPanel, { project, onUpdate: updateProject, styles, onAnalyzeAll: (mods) => window.__analyzeAllImpl?.(mods), analysisSource: analysisContent, analysisScope: analysisSource, streaming, streamingType, setStreaming, setStreamingType, projectRef, hasProvider, flushProject, createServerJob, updateServerJob, recordCompletedAsset })
      ] }) : /* @__PURE__ */ jsx("div", { className: "main-area", style: { alignItems: "center", justifyContent: "center", color: "var(--ai-text-muted)" }, children: /* @__PURE__ */ jsxs("div", { style: { textAlign: "center" }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: 48, marginBottom: 12 }, children: "\u{1F3AC}" }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: 18, fontWeight: 700, color: "var(--ai-text)", marginBottom: 8 }, children: "\u77ED\u5267\u811A\u672C\u5DE5\u574A" }),
        /* @__PURE__ */ jsx("div", { style: { marginBottom: 16 }, children: "\u5C0F\u8BF4 / \u6545\u4E8B / \u5267\u672C \u2192 AI \u89C6\u9891\u5206\u955C\u811A\u672C\u4E0E\u8BBE\u5B9A" }),
        /* @__PURE__ */ jsx(Button, { type: "primary", onClick: () => setNewOpen(true), children: "+ \u65B0\u5EFA\u9879\u76EE" }),
        /* @__PURE__ */ jsx("span", { style: { margin: "0 8px" } }),
        /* @__PURE__ */ jsx(Button, { onClick: loadExample, children: "\u52A0\u8F7D\u793A\u4F8B" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(NewProjectModal, { open: newOpen, onClose: () => setNewOpen(false), onCreate: createProject }),
    /* @__PURE__ */ jsx(SettingsModal, { open: settingsOpen, onClose: () => setSettingsOpen(false), onSaved: () => api.getConfig().then(setCfg) }),
    /* @__PURE__ */ jsx(ResultPanelAnalyzeBridge, { project, results: project?.results || {}, characters: project?.results?.characters?.characters || [], scenes: project?.results?.scenes?.scenes || [], onUpdate: updateProject, analysisContent, analysisScope: analysisSource, setStreaming, setStreamingType, setBatchGenerating, projectRef })
  ] });
}
function ResultPanelAnalyzeBridge({ project, results, characters, scenes, onUpdate, analysisContent, analysisScope, setStreaming, setStreamingType, setBatchGenerating, projectRef }) {
  useE(() => {
    window.__analyzeAllImpl = async (modules, resumeRunId) => {
      if (!project) return;
      const content = analysisContent || project.content || "";
      if (!content.trim()) {
        toast("\u8BF7\u5148\u8F93\u5165\u5185\u5BB9\u6216\u9009\u62E9\u7AE0\u8282", "error");
        return;
      }
      toast("\u5F00\u59CB\u6279\u91CF\u5206\u6790", "info");
      setBatchGenerating(true);
      const targetId = project.id;
      let activeRunId = resumeRunId;
      const resumedRun = (project.analysisRuns || []).find((run) => run.id === resumeRunId);
      const moduleStates = { ...resumedRun?.modules || {} };
      try {
        await api.analyzeAll({ content, visualStyle: project.style, projectId: targetId, modules, characters, scenes, sourceMode: analysisScope?.mode, chapterId: analysisScope?.mode === "chapter" ? analysisScope.chId : void 0, resumeRunId }, (d) => {
          if (d.status === "run_start") activeRunId = d.runId;
          if (d.status === "module_start") {
            toast(`\u751F\u6210 ${MODULES.find((m) => m.id === d.type)?.name}...`, "info");
            setStreaming("");
            setStreamingType(d.type);
          }
          if (d.status === "module_streaming") {
            setStreaming((prev) => prev + d.content);
          }
          if (d.status === "module_done") {
            if (projectRef?.current?.id !== targetId) return;
            onUpdate((prev) => prev.id === targetId ? (() => {
              const prevResults = prev.results || {};
              const prevType = prevResults[d.type];
              let newResult = d.result;
              if (prevType && typeof prevType === "object" && typeof newResult === "object" && !Array.isArray(newResult)) {
                newResult = { ...d.result, derivedFromRevision: prev.sourceRevision || 1, stale: false };
                if (prevType.panelImages && newResult.pages) newResult.panelImages = prevType.panelImages;
              }
              return normalizeProject({ ...prev, results: { ...prevResults, [d.type]: newResult } });
            })() : prev);
            setStreaming("");
            setStreamingType("");
          }
          if (d.status === "module_done" || d.status === "module_skipped") moduleStates[d.type] = { status: "completed" };
          if (d.status === "module_error") {
            moduleStates[d.type] = { status: "failed", error: d.error };
            setStreaming("");
            setStreamingType("");
            toast(`\u6A21\u5757 ${d.type} \u751F\u6210\u5931\u8D25: ${d.error}`, "error");
          }
          if (d.status === "all_done") {
            onUpdate((prev) => ({ analysisRuns: [...(prev.analysisRuns || []).filter((run) => run.id !== activeRunId), { id: activeRunId, status: d.retryModules?.length ? "failed" : "completed", modules: moduleStates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }] }));
            setBatchGenerating(false);
            toast(d.retryModules?.length ? `\u6279\u91CF\u5206\u6790\u5B8C\u6210\uFF0C${d.retryModules.length} \u4E2A\u6A21\u5757\u53EF\u91CD\u8BD5` : "\u6279\u91CF\u5206\u6790\u5B8C\u6210", d.retryModules?.length ? "error" : "ok");
          }
        });
      } catch (e) {
        toast("\u5206\u6790\u5931\u8D25: " + e.message, "error");
        setStreaming("");
        setStreamingType("");
      }
      setBatchGenerating(false);
    };
    return () => {
      delete window.__analyzeAllImpl;
    };
  });
  return null;
}
var root = createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ jsx(App, {}));
