// public/js/app.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { Button, Input, Modal, Switch, Tag, Select, Card } from "animal-island-ui";

// public/js/api.js
async function http(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : void 0
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
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
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const d = line.slice(6).trim();
      if (d === "[DONE]") continue;
      try {
        onData(JSON.parse(d));
      } catch {
      }
    }
  }
}
var api = {
  listProjects: () => http("/api/projects"),
  createProject: (name, style) => http("/api/projects", { method: "POST", body: { name, style } }),
  getProject: (id) => http("/api/projects/" + id),
  updateProject: (id, patch) => http("/api/projects/" + id, { method: "PUT", body: patch }),
  deleteProject: (id) => http("/api/projects/" + id, { method: "DELETE" }),
  importProject: (data) => http("/api/projects/import", { method: "POST", body: data }),
  importChapters: (id, content) => http(`/api/projects/${id}/chapters/import`, { method: "POST", body: { content } }),
  addChapter: (id, title, content, group) => http(`/api/projects/${id}/chapters`, { method: "POST", body: { title, content, group } }),
  updateChapter: (id, chId, patch) => http(`/api/projects/${id}/chapters/${chId}`, { method: "PUT", body: patch }),
  deleteChapter: (id, chId) => http(`/api/projects/${id}/chapters/${chId}`, { method: "DELETE" }),
  getKnowledge: (id) => http(`/api/projects/${id}/knowledge`),
  updateKnowledge: (id, kb) => http(`/api/projects/${id}/knowledge`, { method: "PUT", body: kb }),
  exportMd: (id) => `/api/projects/${id}/export-md`,
  snapshot: (id, label) => http(`/api/projects/${id}/snapshot`, { method: "POST", body: { label } }),
  getSnapshots: (id) => http(`/api/projects/${id}/snapshots`),
  restoreSnapshot: (id, snId) => http(`/api/projects/${id}/snapshots/${snId}/restore`, { method: "POST" }),
  styles: () => http("/api/styles"),
  getConfig: () => http("/api/config/llm"),
  saveConfig: (cfg) => http("/api/config/llm", { method: "PUT", body: cfg }),
  testConn: (baseUrl, apiKey, model) => http("/api/config/llm/test", { method: "POST", body: { baseUrl, apiKey, model } }),
  genImage: (prompt, negativePrompt, size, style, images) => http("/api/generate/image", { method: "POST", body: { prompt, negativePrompt, size, visualStyle: style, images } }),
  genVideo: (params) => http("/api/generate/video", { method: "POST", body: params }),
  getVideo: (id) => http("/api/generate/video/" + id),
  preprocess: (content, onData, signal) => sse("/api/preprocess", { content }, onData, signal),
  analyze: (params, onData, signal) => sse("/api/analyze", params, onData, signal),
  analyzeAll: (params, onData, signal) => sse("/api/analyze-all", params, onData, signal),
  checkConsistency: (results, knowledge, onData, signal) => sse("/api/check-consistency", { results, knowledge }, onData, signal)
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
  { id: "manga", name: "\u6F2B\u753B\u811A\u672C", icon: "\u{1F4D6}", type: "md" }
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
    return marked.parse(md);
  } catch {
    return md;
  }
}
function Sidebar({ projects, currentId, onSelect, onNew, onDelete, onImport, collapsed, onToggle, mobileOpen, onCloseMobile }) {
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
        /* @__PURE__ */ jsx("span", { className: "del", onClick: (e) => {
          e.stopPropagation();
          onDelete(p.id);
        }, children: "\u2715" })
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
          /* @__PURE__ */ jsx(Select, { options: styleOptions, value: style, onChange: (val) => setStyle(val) })
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
  const llmProviders = cfg.providers.filter((p) => p.type !== "media");
  const mediaProviders = cfg.providers.filter((p) => p.type === "media");
  const updateProvider = (id, field, val) => setCfg((c) => ({ ...c, providers: c.providers.map((p) => p.id === id ? { ...p, [field]: val } : p) }));
  const addProvider = (type) => setCfg((c) => ({ ...c, providers: [...c.providers, { id: "prov_" + Date.now().toString(36), name: "\u65B0" + (type === "media" ? "\u5A92\u4F53" : "LLM") + "\u63D0\u4F9B\u5546", baseUrl: "", apiKey: "", model: "", type }] }));
  const delProvider = (id) => setCfg((c) => ({ ...c, providers: c.providers.filter((p) => p.id !== id) }));
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
  const renderProvider = (p, isMedia) => /* @__PURE__ */ jsxs("div", { className: `provider-row ${!isMedia && p.id === cfg.activeProvider || isMedia && p.id === cfg.mediaProvider ? "active" : ""}`, children: [
    /* @__PURE__ */ jsxs("div", { className: "field-mini", children: [
      /* @__PURE__ */ jsx("label", { children: "\u540D\u79F0" }),
      /* @__PURE__ */ jsx(Input, { size: "small", value: p.name, onChange: (e) => updateProvider(p.id, "name", e.target.value) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "field-mini", style: { flex: 2 }, children: [
      /* @__PURE__ */ jsx("label", { children: "Base URL" }),
      /* @__PURE__ */ jsx(Input, { size: "small", value: p.baseUrl, onChange: (e) => updateProvider(p.id, "baseUrl", e.target.value), placeholder: "https://..." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "field-mini", style: { flex: 1.5 }, children: [
      /* @__PURE__ */ jsx("label", { children: "API Key" }),
      /* @__PURE__ */ jsx(Input, { size: "small", type: "password", value: p.apiKey, onChange: (e) => updateProvider(p.id, "apiKey", e.target.value), placeholder: "sk-..." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "field-mini", style: { flex: 1 }, children: [
      /* @__PURE__ */ jsx("label", { children: "\u6A21\u578B" }),
      /* @__PURE__ */ jsx(Input, { size: "small", value: p.model, onChange: (e) => updateProvider(p.id, "model", e.target.value) })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [
      /* @__PURE__ */ jsx(Button, { size: "small", type: !isMedia && p.id === cfg.activeProvider || isMedia && p.id === cfg.mediaProvider ? "primary" : "default", onClick: () => setCfg((c) => ({ ...c, [isMedia ? "mediaProvider" : "activeProvider"]: p.id })), children: !isMedia && p.id === cfg.activeProvider || isMedia && p.id === cfg.mediaProvider ? "\u2713 \u4E3B" : "\u8BBE\u4E3A\u4E3B" }),
      /* @__PURE__ */ jsx(Button, { size: "small", loading: testing === p.id, onClick: () => test(p), children: "\u6D4B" }),
      /* @__PURE__ */ jsx(Button, { size: "small", danger: true, onClick: () => delProvider(p.id), children: "\u5220" })
    ] }),
    testRes[p.id] && /* @__PURE__ */ jsx("div", { style: { flexBasis: "100%", fontSize: 11, color: testRes[p.id].ok ? "var(--ai-success)" : "var(--ai-error)" }, children: testRes[p.id].ok ? "\u2713 \u8FDE\u63A5\u6210\u529F" : "\u2717 " + (testRes[p.id].error || "\u5931\u8D25") })
  ] }, p.id);
  return /* @__PURE__ */ jsx(Modal, { open, title: "\u2699\uFE0F \u8BBE\u7F6E", typewriter: false, onClose, onOk: save, okText: "\u4FDD\u5B58", cancelText: "\u53D6\u6D88", width: 720, children: /* @__PURE__ */ jsxs("div", { className: "settings-body modal-content", children: [
    /* @__PURE__ */ jsx("div", { className: "card-title", children: "\u{1F4DA} LLM \u6587\u672C\u6A21\u578B" }),
    /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }, children: cfg.presets.filter((p) => p.type !== "media").map((p) => /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => addPreset(p), disabled: !!cfg.providers.find((x) => x.id === p.id), children: p.name }, p.id)) }),
    llmProviders.map((p) => renderProvider(p, false)),
    /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => addProvider("llm"), style: { marginTop: 6 }, children: "+ \u81EA\u5B9A\u4E49LLM" }),
    /* @__PURE__ */ jsx("div", { className: "card-title", style: { marginTop: 18 }, children: "\u{1F5BC}\uFE0F \u5A92\u4F53\u751F\u6210\uFF08Agnes/DALL\xB7E \u751F\u56FE\u751F\u89C6\u9891\uFF09" }),
    /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }, children: cfg.presets.filter((p) => p.type === "media").map((p) => /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => addPreset(p), disabled: !!cfg.providers.find((x) => x.id === p.id), children: p.name }, p.id)) }),
    mediaProviders.length === 0 && /* @__PURE__ */ jsx("div", { style: { fontSize: 12, color: "var(--ai-text-muted)", padding: 8 }, children: "\u672A\u914D\u7F6E\u5A92\u4F53\u63D0\u4F9B\u5546\uFF0C\u70B9\u51FB\u4E0A\u65B9\u9884\u8BBE\u6DFB\u52A0 Agnes AI \u6216 DALL\xB7E" }),
    mediaProviders.map((p) => renderProvider(p, true)),
    /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => addProvider("media"), style: { marginTop: 6 }, children: "+ \u81EA\u5B9A\u4E49\u5A92\u4F53" }),
    /* @__PURE__ */ jsx("p", { style: { fontSize: 11, color: "var(--ai-text-muted)", marginTop: 14 }, children: "Key \u5B58\u50A8\u5728\u670D\u52A1\u7AEF data/config.json\uFF0C\u524D\u7AEF\u4EC5\u663E\u793A\u8131\u654F\u3002\u5A92\u4F53\u7528\u4E8E AI \u751F\u56FE/\u751F\u89C6\u9891\u3002" })
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
function InputPanel({ project, onUpdate, onAnalyzeAll, styles, generating, hasChapters, analysisSource, setAnalysisSource, collapsed, onToggleCollapse }) {
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
    if (!content.trim()) {
      toast("\u8BF7\u5148\u8F93\u5165\u5185\u5BB9", "error");
      return;
    }
    setPreprocessing(true);
    setStatus("\u9884\u5904\u7406\u4E2D...");
    try {
      await api.preprocess(content, (d) => {
        if (d.status === "split_done") setStatus(`\u5DF2\u5206 ${d.total} \u6BB5`);
        if (d.status === "summarizing") setStatus(`\u5206\u6790\u7B2C ${d.progress}/${d.total} \u6BB5...`);
        if (d.status === "synthesizing") setStatus("\u7EFC\u5408\u5206\u6790\u4E2D...");
        if (d.status === "done") {
          setStatus("\u9884\u5904\u7406\u5B8C\u6210");
          toast("\u9884\u5904\u7406\u5B8C\u6210", "ok");
        }
      });
    } catch (e) {
      setStatus("\u5931\u8D25: " + e.message);
      toast("\u9884\u5904\u7406\u5931\u8D25", "error");
    }
    setPreprocessing(false);
  };
  const chapters = project?.chapters || [];
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
      /* @__PURE__ */ jsx("div", { className: "card-head", children: /* @__PURE__ */ jsx("span", { className: "card-title", children: "\u{1F4DD} \u6E90\u6587\u672C" }) }),
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
      /* @__PURE__ */ jsx("div", { className: "gen-actions", children: /* @__PURE__ */ jsx(Button, { block: true, type: "primary", loading: generating, onClick: () => onAnalyzeAll(selectedModules), children: "\u{1F680} \u4E00\u952E\u5168\u90E8\u5206\u6790" }) }),
      /* @__PURE__ */ jsx("div", { className: "status-bar info", children: status })
    ] })
  ] });
}
function ResultPanel({ project, onUpdate, styles, onAnalyzeAll, analysisSource, streaming, streamingType, setStreaming, setStreamingType }) {
  const [tab, setTab] = useS("characters");
  const [generating, setGenerating] = useS(false);
  const [progress, setProgress] = useS("");
  const [progressPct, setProgressPct] = useS(0);
  const abortRef = useR(null);
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
    setGenerating(true);
    setStreaming("");
    setStreamingType("");
    setProgress(`\u6B63\u5728\u751F\u6210${MODULES.find((m) => m.id === type)?.name}\uFF0C\u8BF7\u7A0D\u5019...`);
    setProgressPct(30);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      await api.analyze({ type, content, visualStyle: project.style, projectId: project.id, characters, scenes }, (d) => {
        if (d.status === "start") setProgressPct(40);
        if (d.status === "streaming") {
          setStreamingType(d.type);
          setStreaming((prev) => prev + d.content);
          setProgressPct((prev) => prev < 50 ? 50 : prev);
        }
        if (d.status === "done") {
          onUpdate({ results: { ...results, [type]: d.result } });
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
          setProgress("\u9519\u8BEF: " + d.error);
          toast("\u751F\u6210\u5931\u8D25", "error");
        }
      }, ac.signal);
    } catch (e) {
      if (e.name !== "AbortError") {
        setProgress("\u5931\u8D25: " + e.message);
        toast("\u751F\u6210\u5931\u8D25", "error");
      }
    }
    setGenerating(false);
  };
  useE(() => {
    window.__analyzeOne = analyzeOne;
  }, [project, results, characters, scenes]);
  const tabs = [
    { id: "characters", name: "\u{1F3AD} \u89D2\u8272", count: characters.length },
    { id: "scenes", name: "\u{1F3DE}\uFE0F \u573A\u666F", count: scenes.length },
    { id: "storyboard", name: "\u{1F3AC} \u5206\u955C", count: shots.length },
    ...MODULES.filter((m) => m.type === "md").map((m) => ({ id: m.id, name: `${m.icon} ${m.name}` })),
    { id: "knowledge", name: "\u{1F4DA} \u77E5\u8BC6\u5E93" },
    { id: "media", name: "\u{1F5BC}\uFE0F \u5A92\u4F53" },
    { id: "consistency", name: "\u{1F50D} \u4E00\u81F4\u6027" }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "result-panel", children: [
    /* @__PURE__ */ jsxs("div", { className: "result-tabs", children: [
      tabs.map((t) => /* @__PURE__ */ jsxs("div", { className: `result-tab ${tab === t.id ? "active" : ""}`, onClick: () => setTab(t.id), children: [
        t.name,
        t.count !== void 0 && /* @__PURE__ */ jsx("span", { className: "count", children: t.count })
      ] }, t.id)),
      /* @__PURE__ */ jsxs("div", { style: { marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }, children: [
        tab !== "media" && tab !== "knowledge" && tab !== "consistency" && /* @__PURE__ */ jsx(Button, { size: "small", type: "primary", loading: generating, onClick: () => analyzeOne(tab), children: generating ? "\u751F\u6210\u4E2D" : "\u751F\u6210" }),
        /* @__PURE__ */ jsx("a", { href: api.exportMd(project?.id), download: true, children: /* @__PURE__ */ jsx(Button, { size: "small", children: "\u5BFC\u51FAMD" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "result-content", children: [
      generating && /* @__PURE__ */ jsxs("div", { style: { marginBottom: 12, padding: 10, background: "var(--ai-primary-bg)", borderRadius: 8, fontSize: 13 }, children: [
        progress,
        progressPct > 0 && /* @__PURE__ */ jsx("div", { className: "progress-line", children: /* @__PURE__ */ jsx("div", { className: "fill", style: { width: progressPct + "%" } }) })
      ] }),
      tab === "characters" && /* @__PURE__ */ jsx(CharactersView, { characters, onUpdate: (chars) => onUpdate({ results: { ...results, characters: { characters: chars } } }) }),
      tab === "scenes" && /* @__PURE__ */ jsx(ScenesView, { scenes, onUpdate: (sc) => onUpdate({ results: { ...results, scenes: { scenes: sc } } }) }),
      tab === "storyboard" && /* @__PURE__ */ jsx(ShotView, { shots, characters, scenes, onUpdate: (sh) => onUpdate({ results: { ...results, storyboard: { shots: sh } } }) }),
      MODULES.filter((m) => m.type === "md").map((m) => tab === m.id && /* @__PURE__ */ jsx(MdView, { content: streamingType === m.id ? streaming : results[m.id], emptyTip: `\u70B9\u51FB\u53F3\u4E0A\u65B9"\u751F\u6210"\u5F00\u59CB` }, m.id)),
      tab === "knowledge" && /* @__PURE__ */ jsx(KnowledgeView, { project, onUpdate }),
      tab === "media" && /* @__PURE__ */ jsx(MediaGen, { styles, project, characters, scenes }),
      tab === "consistency" && /* @__PURE__ */ jsx(ConsistencyView, { project })
    ] })
  ] });
}
function CharactersView({ characters, onUpdate }) {
  if (!characters.length) return /* @__PURE__ */ jsx(Empty, { tip: "\u751F\u6210\u89D2\u8272\u8BBE\u5B9A\u540E\u5C06\u663E\u793A\uFF0C\u6BCF\u89D2\u8272\u542B\u4E00\u5F201x4\u6A2A\u5411\u6392\u5217\u8BBE\u5B9A\u56FEPrompt" });
  const baseFields = [["role", "\u53D9\u4E8B\u529F\u80FD"], ["gender", "\u6027\u522B"], ["age", "\u5E74\u9F84"], ["appearance", "\u5916\u8C8C"], ["personality", "\u6027\u683C"], ["costume", "\u670D\u88C5\u9053\u5177"], ["voiceStyle", "\u8BED\u8A00\u98CE\u683C"], ["relationships", "\u4EBA\u7269\u5173\u7CFB"], ["arc", "\u89D2\u8272\u5F27\u5149"], ["castingReference", "\u9009\u89D2\u53C2\u8003"]];
  const updateField = (i, k, v) => {
    const c = [...characters];
    c[i] = { ...c[i], [k]: v };
    onUpdate(c);
  };
  return /* @__PURE__ */ jsxs("div", { className: "grid-cards", children: [
    characters.map((c, i) => /* @__PURE__ */ jsxs("div", { className: "item-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "item-head", children: [
        /* @__PURE__ */ jsx("input", { className: "item-name", value: c.name, onChange: (e) => updateField(i, "name", e.target.value) }),
        /* @__PURE__ */ jsx(Button, { size: "small", danger: true, onClick: () => onUpdate(characters.filter((_, x) => x !== i)), children: "\u5220" })
      ] }),
      baseFields.map(([k, label]) => /* @__PURE__ */ jsxs("div", { className: "field", children: [
        /* @__PURE__ */ jsx("label", { children: label }),
        /* @__PURE__ */ jsx("input", { value: c[k] || "", onChange: (e) => updateField(i, k, e.target.value) })
      ] }, k)),
      /* @__PURE__ */ jsxs("div", { className: "view-prompts", style: { borderTop: "1px dashed var(--ai-border)", paddingTop: 8, marginTop: 8 }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--ai-text)", marginBottom: 6 }, children: "\u{1F4D0} \u89D2\u8272\u8BBE\u5B9A\u56FE Prompt\uFF08\u5355\u56FE1x4\u6A2A\u5411\u6392\u5217\uFF1A\u9762\u90E8\u7279\u5199/\u6B63\u9762/\u4FA7\u9762/\u80CC\u9762\u5168\u8EAB\uFF09" }),
        /* @__PURE__ */ jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsx("label", { children: "\u8BBE\u5B9A\u56FE Prompt\uFF08\u4E2D\u6587\uFF09" }),
          /* @__PURE__ */ jsx("textarea", { className: "prompt", value: c.imagePromptZh || "", onChange: (e) => updateField(i, "imagePromptZh", e.target.value), style: { minHeight: 60 } })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "field", children: [
          /* @__PURE__ */ jsx("label", { children: "\u8BBE\u5B9A\u56FE Prompt\uFF08English\uFF09" }),
          /* @__PURE__ */ jsx("textarea", { className: "prompt", value: c.imagePromptEn || "", onChange: (e) => updateField(i, "imagePromptEn", e.target.value), style: { minHeight: 60 } })
        ] })
      ] })
    ] }, i)),
    /* @__PURE__ */ jsx(Button, { onClick: () => onUpdate([...characters, { name: "\u65B0\u89D2\u8272" }]), children: "+ \u65B0\u589E\u89D2\u8272" })
  ] });
}
function ScenesView({ scenes, onUpdate }) {
  if (!scenes.length) return /* @__PURE__ */ jsx(Empty, { tip: "\u751F\u6210\u573A\u666F\u8BBE\u5B9A\u540E\u5C06\u663E\u793A\u5728\u6B64" });
  const fields = [["environment", "\u73AF\u5883"], ["mood", "\u6C1B\u56F4"], ["lighting", "\u5149\u7167"], ["timeOfDay", "\u65F6\u95F4\u6BB5"], ["narrativeFunction", "\u53D9\u4E8B\u529F\u80FD"], ["keyProps", "\u5173\u952E\u9053\u5177"], ["soundDesign", "\u58F0\u97F3\u8BBE\u8BA1"], ["colorPalette", "\u8272\u8C03\u5EFA\u8BAE"], ["compositionHint", "\u6784\u56FE\u5EFA\u8BAE"], ["imagePromptZh", "\u573A\u666F\u56FEPrompt(\u4E2D)"], ["imagePromptEn", "\u573A\u666F\u56FEPrompt(\u82F1)"]];
  const updateField = (i, k, v) => {
    const s = [...scenes];
    s[i] = { ...s[i], [k]: v };
    onUpdate(s);
  };
  return /* @__PURE__ */ jsxs("div", { className: "grid-cards", children: [
    scenes.map((s, i) => /* @__PURE__ */ jsxs("div", { className: "item-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "item-head", children: [
        /* @__PURE__ */ jsx("input", { className: "item-name", value: s.name, onChange: (e) => updateField(i, "name", e.target.value) }),
        /* @__PURE__ */ jsx(Button, { size: "small", danger: true, onClick: () => onUpdate(scenes.filter((_, x) => x !== i)), children: "\u5220" })
      ] }),
      fields.map(([k, label]) => /* @__PURE__ */ jsxs("div", { className: "field", children: [
        /* @__PURE__ */ jsx("label", { children: label }),
        k.startsWith("imagePrompt") ? /* @__PURE__ */ jsx("textarea", { className: "prompt", value: s[k] || "", onChange: (e) => updateField(i, k, e.target.value) }) : /* @__PURE__ */ jsx("input", { value: s[k] || "", onChange: (e) => updateField(i, k, e.target.value) })
      ] }, k))
    ] }, i)),
    /* @__PURE__ */ jsx(Button, { onClick: () => onUpdate([...scenes, { name: "\u65B0\u573A\u666F" }]), children: "+ \u65B0\u589E\u573A\u666F" })
  ] });
}
function ShotView({ shots, characters, scenes, onUpdate }) {
  const [view, setView] = useS("table");
  const [filterEp, setFilterEp] = useS("");
  const [filterScene, setFilterScene] = useS("");
  if (!shots.length) return /* @__PURE__ */ jsx(Empty, { tip: "\u5148\u751F\u6210\u89D2\u8272\u4E0E\u573A\u666F\u8BBE\u5B9A\uFF0C\u518D\u70B9\u51FB\u53F3\u4E0A\u65B9\u751F\u6210\u6309\u94AE" });
  const eps = [...new Set(shots.map((s) => s.episode))];
  let filtered = shots;
  if (filterEp) filtered = filtered.filter((s) => s.episode == filterEp);
  if (filterScene) filtered = filtered.filter((s) => s.sceneName === filterScene);
  const charName = (names) => (names || []).join("\u3001");
  const update = (idx, k, v) => {
    const sh = [...shots];
    const i = shots.indexOf(filtered[idx]);
    sh[i] = { ...sh[i], [k]: v };
    onUpdate(sh);
  };
  const moveShot = (idx, dir) => {
    const i = shots.indexOf(filtered[idx]);
    const j = i + dir;
    if (j < 0 || j >= shots.length) return;
    [shots[i], shots[j]] = [shots[j], shots[i]];
    onUpdate([...shots]);
  };
  return /* @__PURE__ */ jsxs("div", { children: [
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
      /* @__PURE__ */ jsxs("div", { className: "seg", children: [
        /* @__PURE__ */ jsx("button", { className: view === "table" ? "active" : "", onClick: () => setView("table"), children: "\u8868\u683C" }),
        /* @__PURE__ */ jsx("button", { className: view === "grid" ? "active" : "", onClick: () => setView("grid"), children: "\u7F51\u683C" })
      ] }),
      /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => onUpdate([...shots, { episode: 1, sceneNo: 1, shotNo: shots.length + 1, shotType: "\u4E2D\u666F", duration: 4, characterNames: [], sceneName: scenes[0]?.name || "" }]), children: "+ \u65B0\u589E\u5206\u955C" })
    ] }),
    view === "table" ? /* @__PURE__ */ jsxs("table", { className: "shots", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "num", children: "\u96C6" }),
        /* @__PURE__ */ jsx("th", { className: "num", children: "\u573A" }),
        /* @__PURE__ */ jsx("th", { className: "num", children: "\u955C" }),
        /* @__PURE__ */ jsx("th", { children: "\u666F\u522B" }),
        /* @__PURE__ */ jsx("th", { children: "\u753B\u9762" }),
        /* @__PURE__ */ jsx("th", { children: "\u5BF9\u767D" }),
        /* @__PURE__ */ jsx("th", { children: "\u52A8\u4F5C" }),
        /* @__PURE__ */ jsx("th", { children: "\u58F0\u97F3" }),
        /* @__PURE__ */ jsx("th", { children: "\u8F6C\u573A" }),
        /* @__PURE__ */ jsx("th", { className: "num", children: "\u79D2" }),
        /* @__PURE__ */ jsx("th", { children: "\u89D2\u8272" }),
        /* @__PURE__ */ jsx("th", { children: "\u573A\u666F" }),
        /* @__PURE__ */ jsx("th", { className: "prompt-cell", children: "Prompt(\u4E2D)" }),
        /* @__PURE__ */ jsx("th", { className: "prompt-cell", children: "Prompt(\u82F1)" }),
        /* @__PURE__ */ jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: filtered.map((s, idx) => /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("td", { className: "num", children: s.episode }),
        /* @__PURE__ */ jsx("td", { className: "num", children: s.sceneNo }),
        /* @__PURE__ */ jsx("td", { className: "num", children: s.shotNo }),
        /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(idx, "shotType", e.target.textContent), children: s.shotType }) }),
        /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(idx, "visual", e.target.textContent), children: s.visual }) }),
        /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(idx, "dialogue", e.target.textContent), children: s.dialogue }) }),
        /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(idx, "action", e.target.textContent), children: s.action }) }),
        /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(idx, "soundDesign", e.target.textContent), children: s.soundDesign }) }),
        /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(idx, "transition", e.target.textContent), children: s.transition }) }),
        /* @__PURE__ */ jsx("td", { className: "num", children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(idx, "duration", parseInt(e.target.textContent) || 0), children: s.duration }) }),
        /* @__PURE__ */ jsx("td", { children: charName(s.characterNames) }),
        /* @__PURE__ */ jsx("td", { children: s.sceneName }),
        /* @__PURE__ */ jsx("td", { className: "prompt-cell", children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(idx, "promptZh", e.target.textContent), children: s.promptZh }) }),
        /* @__PURE__ */ jsx("td", { className: "prompt-cell", children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(idx, "promptEn", e.target.textContent), children: s.promptEn }) }),
        /* @__PURE__ */ jsxs("td", { children: [
          /* @__PURE__ */ jsx("button", { className: "btn sm ghost", title: "\u590D\u5236EN Prompt", onClick: () => {
            navigator.clipboard?.writeText(s.promptEn);
            toast("\u5DF2\u590D\u5236EN", "ok");
          }, children: "\u590D\u5236" }),
          /* @__PURE__ */ jsx("button", { className: "btn sm ghost", onClick: () => moveShot(idx, -1), children: "\u2191" }),
          /* @__PURE__ */ jsx("button", { className: "btn sm ghost", onClick: () => moveShot(idx, 1), children: "\u2193" }),
          /* @__PURE__ */ jsx("button", { className: "btn sm ghost danger", onClick: () => onUpdate(shots.filter((_, x) => x !== shots.indexOf(s))), children: "\u5220" })
        ] })
      ] }, idx)) })
    ] }) : /* @__PURE__ */ jsx("div", { className: "shot-grid", children: filtered.map((s, idx) => /* @__PURE__ */ jsxs("div", { className: "shot-tile", children: [
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
      /* @__PURE__ */ jsx("div", { className: "tile-visual", children: s.visual }),
      s.dialogue && /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, color: "var(--ai-text-muted)" }, children: [
        "\u300C",
        s.dialogue,
        "\u300D"
      ] }),
      s.soundDesign && /* @__PURE__ */ jsxs("div", { style: { fontSize: 11, color: "var(--ai-text-muted)" }, children: [
        "\u{1F50A} ",
        s.soundDesign
      ] }),
      s.transition && /* @__PURE__ */ jsxs("div", { style: { fontSize: 11, color: "var(--ai-text-muted)" }, children: [
        "\u2192 ",
        s.transition
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
      /* @__PURE__ */ jsxs("div", { className: "tile-actions", children: [
        /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => {
          navigator.clipboard?.writeText(s.promptEn);
          toast("\u5DF2\u590D\u5236EN", "ok");
        }, children: "\u590D\u5236EN" }),
        /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => moveShot(idx, -1), children: "\u2191" }),
        /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => moveShot(idx, 1), children: "\u2193" }),
        /* @__PURE__ */ jsx(Button, { size: "small", danger: true, onClick: () => onUpdate(shots.filter((_, x) => x !== shots.indexOf(s))), children: "\u5220" })
      ] })
    ] }, idx)) })
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
function MediaGen({ styles, project, characters, scenes }) {
  const [tab, setTab] = useS("image");
  const [prompt, setPrompt] = useS("");
  const [negPrompt, setNegPrompt] = useS("");
  const [size, setSize] = useS("1024x768");
  const [gen, setGen] = useS(false);
  const [imgUrl, setImgUrl] = useS(null);
  const [err, setErr] = useS("");
  const [refImage, setRefImage] = useS("");
  const [vidDuration, setVidDuration] = useS("5");
  const [vidRatio, setVidRatio] = useS("16:9");
  const [vidTask, setVidTask] = useS(null);
  const [vidPolling, setVidPolling] = useS(false);
  const pollRef = useR(null);
  const DURATION_MAP = { "3": { num_frames: 81, frame_rate: 24 }, "5": { num_frames: 121, frame_rate: 24 }, "10": { num_frames: 241, frame_rate: 24 } };
  const RATIO_MAP = { "16:9": { width: 1152, height: 768 }, "9:16": { width: 768, height: 1152 }, "1:1": { width: 896, height: 896 } };
  const generateImage = async () => {
    if (!prompt) {
      toast("\u8BF7\u8F93\u5165Prompt", "error");
      return;
    }
    setGen(true);
    setErr("");
    setImgUrl(null);
    try {
      const images = refImage ? [refImage] : void 0;
      const r = await api.genImage(prompt, negPrompt, size, project?.style, images);
      if (r.ok) {
        setImgUrl(r.url);
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
    if (!prompt) {
      toast("\u8BF7\u8F93\u5165Prompt", "error");
      return;
    }
    setGen(true);
    setErr("");
    setVidTask(null);
    setVidPolling(true);
    try {
      const dur = DURATION_MAP[vidDuration];
      const ratio = RATIO_MAP[vidRatio];
      const params = {
        prompt,
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
        setVidTask({ video_id: r.video_id, status: r.status, progress: r.progress || 0, url: null });
        toast("\u89C6\u9891\u4EFB\u52A1\u5DF2\u521B\u5EFA\uFF0C\u6B63\u5728\u751F\u6210...", "info");
        pollVideo(r.video_id);
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
  const pollVideo = async (videoId) => {
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const r = await api.getVideo(videoId);
        if (!r.ok) {
          setErr(r.error);
          setVidPolling(false);
          return;
        }
        setVidTask({ video_id: videoId, status: r.status, progress: r.progress || 0, url: r.url || null, seconds: r.seconds, size: r.size });
        if (r.status === "completed") {
          setVidPolling(false);
          toast("\u89C6\u9891\u751F\u6210\u5B8C\u6210", "ok");
          return;
        }
        if (r.status === "failed") {
          setErr("\u89C6\u9891\u751F\u6210\u5931\u8D25");
          setVidPolling(false);
          return;
        }
        if (attempts < 120) {
          pollRef.current = setTimeout(poll, 3e3);
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
  useE(() => () => {
    if (pollRef.current) clearTimeout(pollRef.current);
  }, []);
  const useCharPrompt = (p, label) => {
    setPrompt(p || "");
    toast("\u5DF2\u586B\u5165" + label, "ok");
  };
  const onUploadRef = (e) => {
    const f = e.target.files[0];
    if (!f) return;
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
        /* @__PURE__ */ jsx("textarea", { value: prompt, onChange: (e) => setPrompt(e.target.value), placeholder: "\u63CF\u8FF0\u8981\u751F\u6210\u7684\u753B\u9762...", style: { minHeight: 80 } })
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
    ] })
  ] });
}
function ConsistencyView({ project }) {
  const [report, setReport] = useS("");
  const [running, setRunning] = useS(false);
  const run = async () => {
    if (!project.results || Object.keys(project.results).length === 0) {
      toast("\u8BF7\u5148\u751F\u6210\u5206\u6790\u7ED3\u679C", "error");
      return;
    }
    setRunning(true);
    setReport("");
    try {
      await api.checkConsistency(project.results, project.knowledge, (d) => {
        if (d.content) setReport((p) => p + d.content);
        if (d.error) setReport((p) => p + "\n\u9519\u8BEF: " + d.error);
      });
      toast("\u68C0\u67E5\u5B8C\u6210", "ok");
    } catch (e) {
      toast("\u68C0\u67E5\u5931\u8D25", "error");
    }
    setRunning(false);
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx(Button, { type: "primary", loading: running, onClick: run, style: { marginBottom: 12 }, children: "\u{1F50D} \u68C0\u67E5\u4E00\u81F4\u6027" }),
    report ? /* @__PURE__ */ jsx("div", { className: "md-body", dangerouslySetInnerHTML: { __html: renderMd(report) } }) : /* @__PURE__ */ jsx(Empty, { tip: "\u70B9\u51FB\u4E0A\u65B9\u6309\u94AE\u68C0\u67E5\u5404\u6A21\u5757\u95F4\u89D2\u8272/\u573A\u666F/\u65F6\u95F4\u7EBF\u4E00\u81F4\u6027" })
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
  const [analysisSource, setAnalysisSource] = useS({ mode: "chapters", chId: "" });
  const [streaming, setStreaming] = useS("");
  const [streamingType, setStreamingType] = useS("");
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
  const loadProject = async (id) => {
    if (!id) {
      setProject(null);
      return;
    }
    try {
      setProject(await api.getProject(id));
      setCurrentId(id);
    } catch (e) {
      toast(e.message, "error");
    }
  };
  const updateProject = useCB(async (patch) => {
    if (!project) return;
    const updated = { ...project, ...patch };
    setProject(updated);
    clearTimeout(window.__saveTimer);
    window.__saveTimer = setTimeout(async () => {
      try {
        await api.updateProject(project.id, patch);
        refreshProjects();
      } catch (e) {
        console.warn("save", e);
      }
    }, 600);
  }, [project]);
  const createProject = async (name, style) => {
    const p = await api.createProject(name, style);
    await refreshProjects();
    setNewOpen(false);
    loadProject(p.id);
    toast("\u9879\u76EE\u5DF2\u521B\u5EFA", "ok");
  };
  const deleteProject = async (id) => {
    if (!confirm("\u786E\u8BA4\u5220\u9664\u8BE5\u9879\u76EE\uFF1F")) return;
    await api.deleteProject(id);
    await refreshProjects();
    if (currentId === id) {
      setCurrentId(null);
      setProject(null);
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
        /* @__PURE__ */ jsxs("div", { className: "model-info", onClick: () => setSettingsOpen(true), children: [
          /* @__PURE__ */ jsx("span", { className: `model-dot ${hasProvider ? "" : "off"}` }),
          /* @__PURE__ */ jsx("span", { className: "model-name-text", children: hasProvider ? cfg.providers.find((p) => p.id === cfg.activeProvider)?.name || "\u5DF2\u914D\u7F6E" : "\u672A\u914D\u7F6E\u6A21\u578B" }),
          /* @__PURE__ */ jsx("span", { className: "model-gear", children: "\u2699\uFE0F" })
        ] }),
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
      }, onDelete: deleteProject, onImport: importProject, collapsed, onToggle: () => setCollapsed((c) => !c), mobileOpen: sidebarOpen, onCloseMobile: () => setSidebarOpen(false) }),
      project ? /* @__PURE__ */ jsxs("div", { className: `main-area mobile-tab-${mobileTab}`, children: [
        /* @__PURE__ */ jsx(
          InputPanel,
          {
            project,
            onUpdate: updateProject,
            styles,
            generating: false,
            hasChapters,
            analysisSource,
            setAnalysisSource,
            collapsed: inputCollapsed,
            onToggleCollapse: () => setInputCollapsed((c) => !c),
            onAnalyzeAll: (mods) => window.__analyzeAllImpl?.(mods)
          }
        ),
        /* @__PURE__ */ jsx(ResultPanel, { project, onUpdate: updateProject, styles, onAnalyzeAll: (mods) => window.__analyzeAllImpl?.(mods), analysisSource: analysisContent, streaming, streamingType, setStreaming, setStreamingType })
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
    /* @__PURE__ */ jsx(ResultPanelAnalyzeBridge, { project, results: project?.results || {}, characters: project?.results?.characters?.characters || [], scenes: project?.results?.scenes?.scenes || [], onUpdate: updateProject, analysisContent, setStreaming, setStreamingType })
  ] });
}
function ResultPanelAnalyzeBridge({ project, results, characters, scenes, onUpdate, analysisContent, setStreaming, setStreamingType }) {
  useE(() => {
    window.__analyzeAllImpl = async (modules) => {
      if (!project) return;
      const content = analysisContent || project.content || "";
      if (!content.trim()) {
        toast("\u8BF7\u5148\u8F93\u5165\u5185\u5BB9\u6216\u9009\u62E9\u7AE0\u8282", "error");
        return;
      }
      toast("\u5F00\u59CB\u6279\u91CF\u5206\u6790", "info");
      try {
        await api.analyzeAll({ content, visualStyle: project.style, projectId: project.id, modules }, (d) => {
          if (d.status === "module_start") {
            toast(`\u751F\u6210 ${MODULES.find((m) => m.id === d.type)?.name}...`, "info");
            setStreaming("");
            setStreamingType(d.type);
          }
          if (d.status === "module_streaming") {
            setStreaming((prev) => prev + d.content);
          }
          if (d.status === "module_done") {
            onUpdate({ results: { ...results, [d.type]: d.result } });
            setStreaming("");
            setStreamingType("");
          }
          if (d.status === "all_done") toast("\u6279\u91CF\u5206\u6790\u5B8C\u6210", "ok");
        });
      } catch (e) {
        toast("\u5206\u6790\u5931\u8D25: " + e.message, "error");
      }
    };
  });
  return null;
}
var root = createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ jsx(App, {}));
