// public/js/app.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { Button, Input, Modal, Switch, Tag } from "animal-island-ui";

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
  genImage: (prompt2, negativePrompt, size, style) => http("/api/generate/image", { method: "POST", body: { prompt: prompt2, negativePrompt, size, visualStyle: style } }),
  genVideo: (prompt2, style, opts) => http("/api/generate/video", { method: "POST", body: { prompt: prompt2, visualStyle: style, ...opts } }),
  getVideo: (id) => http("/api/generate/video/" + id),
  preprocess: (content, onData, signal) => sse("/api/preprocess", { content }, onData, signal),
  analyze: (params, onData, signal) => sse("/api/analyze", params, onData, signal),
  analyzeAll: (params, onData, signal) => sse("/api/analyze-all", params, onData, signal),
  checkConsistency: (results, knowledge, onData, signal) => sse("/api/check-consistency", { results, knowledge }, onData, signal)
};

// public/js/example.js
var EXAMPLE_PROJECT = {
  name: "\u6700\u540E\u4E00\u73ED\u7535\u68AF\uFF08\u793A\u4F8B\uFF09",
  style: "cinematic",
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
  knowledge: {
    characters: [
      { id: "c1", name: "\u6797\u590F", aliases: ["\u6797\u8BB0\u8005"], description: "\u8C03\u67E5\u8BB0\u8005\uFF0C28\u5C81\uFF0C\u6B63\u5728\u8FFD\u67E5\u5341\u56DB\u697C\u5931\u8E2A\u6848", traits: "\u51B7\u9759\u3001\u6267\u7740\u3001\u654F\u9510\uFF0C\u9047\u9669\u65F6\u538B\u6291\u6050\u60E7", appearance: "\u9F50\u80A9\u77ED\u53D1\uFF0C\u51B7\u767D\u80A4\u8272\uFF0C\u6E05\u7626\u4E94\u5B98" },
      { id: "c2", name: "\u8001\u5468", aliases: [], description: "\u591C\u73ED\u4FDD\u5B89\uFF0C52\u5C81\uFF0C\u89C1\u8FC7\u602A\u4E8B", traits: "\u8C28\u5C0F\u614E\u5FAE\uFF0C\u5BF9\u591C\u73ED\u89C4\u77E9\u8FD1\u4E4E\u8FF7\u4FE1", appearance: "\u82B1\u767D\u5BF8\u5934\uFF0C\u65B9\u8138\u80E1\u832C" },
      { id: "c3", name: "\u4EBA\u5F71", aliases: [], description: "\u51FA\u73B0\u5728\u7535\u68AF\u955C\u9762\u4E2D\u7684\u795E\u79D8\u4EBA\u5F71", traits: "\u6C89\u9ED8\u3001\u8BE1\u8C32\uFF0C\u610F\u56FE\u4E0D\u660E", appearance: "\u8EAB\u5F62\u4FEE\u957F\uFF0C\u9762\u5BB9\u9690\u4E8E\u9634\u5F71" }
    ],
    scenes: [
      { id: "s1", name: "\u529E\u516C\u697C\u591C\u666F", type: "\u5BA4\u5916", description: "\u6DF1\u591C\u57CE\u5E02\u4E2D\u72EC\u680B\u529E\u516C\u697C\uFF0C\u73BB\u7483\u5E55\u5899\u53CD\u5C04\u8857\u706F", mood: "\u5B64\u5BC2\u538B\u6291" },
      { id: "s2", name: "\u7535\u68AF\u8F7F\u53A2", type: "\u5BA4\u5185", description: "\u72ED\u7A84\u4E0D\u9508\u94A2\u7535\u68AF\u8F7F\u53A2\uFF0C\u955C\u9762\u56DB\u58C1\uFF0C\u6309\u952E\u9762\u677F\u53D1\u51B7\u5149", mood: "\u5E7D\u95ED\u4E0D\u5B89" },
      { id: "s3", name: "\u8D1F1\u5C42\u8D70\u5ECA", type: "\u5BA4\u5185", description: "\u5730\u4E0B\u8D1F1\u5C42\u6C34\u6CE5\u8D70\u5ECA\uFF0C\u5899\u9762\u7C89\u5237\u6591\u9A73\uFF0C\u706F\u7BA1\u60E8\u767D", mood: "\u8BE1\u5F02\u5BD2\u610F" }
    ],
    props: [
      { id: "p1", name: "\u8C03\u67E5\u7B14\u8BB0", description: "\u6797\u590F\u630E\u5305\u4E2D\u7684\u7A3F\u5B50\u300A\u5341\u56DB\u697C\u5931\u8E2A\u8005\u300B", significance: "\u4EBA\u5F71\u6307\u5411\u7684\u6838\u5FC3\u9053\u5177\uFF0C\u63A8\u52A8\u5267\u60C5" },
      { id: "p2", name: "\u5BF9\u8BB2\u673A", description: "\u8001\u5468\u4E0E\u6797\u590F\u8054\u7EDC\u7684\u5DE5\u5177", significance: "\u5236\u9020\u7D27\u5F20\u611F\u7684\u5173\u952E\u9053\u5177" }
    ],
    timeline: [
      { chapter: "\u5168\u6587", event: "\u6797\u590F\u6DF1\u591C\u52A0\u73ED\u540E\u4E58\u7535\u68AF\u4E0B\u697C", time: "\u51CC\u66681\u70B9" },
      { chapter: "\u5168\u6587", event: "\u7535\u68AF\u5F02\u5E38\u505C\u572814\u697C\u540E\u5760\u843D\u81F3\u8D1F1\u5C42", time: "\u51CC\u66681\u70B9\u540E" },
      { chapter: "\u5168\u6587", event: "\u955C\u4E2D\u51FA\u73B0\u795E\u79D8\u4EBA\u5F71\uFF0C\u706F\u5149\u7184\u706D", time: "\u51CC\u66681\u70B9\u540E" }
    ]
  },
  results: {
    characters: {
      characters: [
        { name: "\u6797\u590F", role: "\u4E3B\u89D2", gender: "\u5973", age: "28", appearance: "\u9F50\u80A9\u77ED\u53D1\uFF0C\u4E94\u5B98\u6E05\u7626\uFF0C\u773C\u4E0B\u6709\u75B2\u6001\uFF0C\u80A4\u8272\u504F\u51B7\u767D", personality: "\u51B7\u9759\u3001\u6267\u7740\u3001\u6709\u8C03\u67E5\u8BB0\u8005\u7684\u654F\u9510\uFF0C\u9047\u9669\u65F6\u538B\u6291\u6050\u60E7", costume: "\u9ED1\u8272\u9AD8\u9886\u6BDB\u8863\uFF0C\u6DF1\u7070\u98CE\u8863\uFF0C\u630E\u5E06\u5E03\u630E\u5305\uFF0C\u9888\u6302\u5DE5\u724C", arc: "\u4ECE\u81EA\u4FE1\u8C03\u67E5\u8005\u2192\u88AB\u672A\u77E5\u529B\u91CF\u51DD\u89C6\u7684\u730E\u7269", imagePromptZh: "\u4E00\u4F4D28\u5C81\u77ED\u53D1\u5973\u8BB0\u8005\uFF0C\u9F50\u80A9\u9ED1\u53D1\uFF0C\u51B7\u767D\u80A4\u8272\uFF0C\u7A7F\u9ED1\u8272\u9AD8\u9886\u6BDB\u8863\u4E0E\u6DF1\u7070\u98CE\u8863\uFF0C\u630E\u5E06\u5E03\u5305\uFF0C\u795E\u60C5\u51B7\u5CFB\u75B2\u60EB\uFF0C\u51B7\u8C03\u7535\u5F71\u5149\u5F71\uFF0C\u534A\u8EAB\u50CF", imagePromptEn: "28-year-old female journalist, shoulder-length black hair, pale cold skin, black turtleneck and dark grey trench coat, canvas shoulder bag, cold resolute exhausted expression, cinematic cold-toned lighting, half-body portrait, 16:9" },
        { name: "\u8001\u5468", role: "\u914D\u89D2", gender: "\u7537", age: "52", appearance: "\u82B1\u767D\u5BF8\u5934\uFF0C\u65B9\u8138\uFF0C\u7709\u9AA8\u9AD8\uFF0C\u4E0B\u988C\u80E1\u832C", personality: "\u8C28\u5C0F\u614E\u5FAE\uFF0C\u89C1\u8FC7\u602A\u4E8B\uFF0C\u5BF9\u591C\u73ED\u89C4\u77E9\u8FD1\u4E4E\u8FF7\u4FE1", costume: "\u6DF1\u84DD\u4FDD\u5B89\u5236\u670D\uFF0C\u80F8\u524D\u522B\u5BF9\u8BB2\u673A\uFF0C\u8170\u95F4\u6302\u624B\u7535\u7B52", arc: "\u65C1\u89C2\u8005\u2192\u8BD5\u56FE\u8B66\u544A\u5374\u65E0\u80FD\u4E3A\u529B", imagePromptZh: "\u4E00\u4F4D52\u5C81\u591C\u73ED\u4FDD\u5B89\uFF0C\u82B1\u767D\u5BF8\u5934\uFF0C\u65B9\u8138\u80E1\u832C\uFF0C\u7A7F\u6DF1\u84DD\u4FDD\u5B89\u5236\u670D\uFF0C\u80F8\u524D\u522B\u5BF9\u8BB2\u673A\uFF0C\u795E\u60C5\u7D27\u5F20\uFF0C\u51B7\u8C03\u76D1\u89C6\u5668\u5149\u7EBF\uFF0C\u534A\u8EAB\u50CF", imagePromptEn: "52-year-old night-shift security guard, grey buzz cut, square jaw stubble, dark blue uniform, walkie-talkie on chest, tense expression, cold monitor glow, half-body portrait, cinematic, 16:9" },
        { name: "\u4EBA\u5F71", role: "\u53CD\u6D3E/\u8C1C\u56E2", gender: "\u672A\u77E5", age: "\u4E0D\u660E", appearance: "\u8EAB\u5F62\u4FEE\u957F\uFF0C\u9762\u5BB9\u9690\u4E8E\u9634\u5F71\uFF0C\u8F6E\u5ED3\u6A21\u7CCA", personality: "\u6C89\u9ED8\u3001\u8BE1\u8C32\uFF0C\u610F\u56FE\u4E0D\u660E", costume: "\u7070\u8272\u98CE\u8863\uFF0C\u7ACB\u9886\u906E\u4F4F\u4E0B\u534A\u5F20\u8138\uFF0C\u53CC\u624B\u82CD\u767D", arc: "\u795E\u79D8\u5B58\u5728\uFF0C\u6307\u5411\u7B14\u8BB0\u540E\u706F\u706D", imagePromptZh: "\u4E00\u4E2A\u8EAB\u5F62\u4FEE\u957F\u7684\u795E\u79D8\u4EBA\u5F71\uFF0C\u7A7F\u7070\u8272\u7ACB\u9886\u98CE\u8863\uFF0C\u9762\u90E8\u9690\u4E8E\u9634\u5F71\u53EA\u89C1\u8F6E\u5ED3\uFF0C\u53CC\u624B\u82CD\u767D\uFF0C\u5E7D\u6697\u51B7\u5149\uFF0C\u60AC\u7591\u6C1B\u56F4\uFF0C\u5168\u8EAB\u50CF", imagePromptEn: "tall slender mysterious silhouette in grey high-collar trench coat, face hidden in shadow only outline visible, pale hands, dim cold light, eerie thriller atmosphere, full-body shot, cinematic, 16:9" }
      ]
    },
    scenes: {
      scenes: [
        { name: "\u529E\u516C\u697C\u591C\u666F", environment: "\u6DF1\u591C\u57CE\u5E02\u4E2D\u72EC\u680B\u529E\u516C\u697C\u5916\u666F\uFF0C\u73BB\u7483\u5E55\u5899\u53CD\u5C04\u8857\u706F", mood: "\u5B64\u5BC2\u3001\u538B\u6291\u3001\u6F5C\u4F0F\u5371\u673A", lighting: "\u51B7\u84DD\u6708\u5149\u4E0E\u6696\u9EC4\u8857\u706F\u6DF7\u5408\uFF0C\u4EC5\u9876\u5C42\u4E00\u6247\u7A97\u4EAE\u706F", timeOfDay: "\u6DF1\u591C", narrativeFunction: "\u5EFA\u7F6E", keyProps: "\u65E0", imagePromptZh: "\u6DF1\u591C\u57CE\u5E02\u4E2D\u4E00\u680B\u529E\u516C\u697C\u5916\u666F\uFF0C\u73BB\u7483\u5E55\u5899\uFF0C\u51B7\u84DD\u6708\u5149\u4E0E\u6696\u9EC4\u8857\u706F\uFF0C\u4EC5\u9876\u5C42\u4E00\u6247\u7A97\u4EAE\u7740\u706F\u5149\uFF0C\u8857\u9762\u7A7A\u65E0\u4E00\u4EBA\uFF0C\u538B\u6291\u5B64\u5BC2\uFF0C\u7535\u5F71\u611F\u5E7F\u89D2\uFF0C16:9", imagePromptEn: "wide shot of a lone office tower at night, glass curtain wall, cold blue moonlight mixed with warm street lamps, only one top-floor window lit, empty street, oppressive lonely mood, cinematic wide-angle, 16:9" },
        { name: "\u7535\u68AF\u8F7F\u53A2", environment: "\u72ED\u7A84\u4E0D\u9508\u94A2\u7535\u68AF\u8F7F\u53A2\uFF0C\u955C\u9762\u56DB\u58C1\uFF0C\u6309\u952E\u9762\u677F\u53D1\u51B7\u5149", mood: "\u5E7D\u95ED\u3001\u4E0D\u5B89\u3001\u5B64\u7ACB\u65E0\u63F4", lighting: "\u9876\u90E8\u60E8\u767D\u65E5\u5149\u706F\uFF0C\u51B7\u8C03\uFF0C\u91D1\u5C5E\u53CD\u5C04", timeOfDay: "\u6DF1\u591C", narrativeFunction: "\u6FC0\u52B1/\u4E0A\u5347", keyProps: "\u6309\u952E\u9762\u677F\u3001\u955C\u9762", imagePromptZh: "\u72ED\u7A84\u4E0D\u9508\u94A2\u7535\u68AF\u8F7F\u53A2\u5185\u666F\uFF0C\u955C\u9762\u56DB\u58C1\uFF0C\u6309\u952E\u9762\u677F\u6CDB\u51B7\u5149\uFF0C\u9876\u90E8\u60E8\u767D\u65E5\u5149\u706F\uFF0C\u91D1\u5C5E\u53CD\u5C04\uFF0C\u5E7D\u95ED\u4E0D\u5B89\u6C1B\u56F4\uFF0C\u7535\u5F71\u611F\uFF0C16:9", imagePromptEn: "interior of narrow stainless-steel elevator car, mirrored walls, cold-glowing button panel, harsh white ceiling fluorescent, metallic reflections, claustrophobic uneasy mood, cinematic, 16:9" },
        { name: "\u8D1F1\u5C42\u8D70\u5ECA", environment: "\u5730\u4E0B\u8D1F1\u5C42\u6C34\u6CE5\u8D70\u5ECA\uFF0C\u5899\u9762\u7C89\u5237\u6591\u9A73\uFF0C\u706F\u7BA1\u60E8\u767D", mood: "\u8BE1\u5F02\u3001\u5BD2\u610F\u3001\u5371\u9669\u903C\u8FD1", lighting: "\u51B7\u767D\u65E5\u5149\u706F\u7BA1\uFF0C\u90E8\u5206\u95EA\u70C1\uFF0C\u5730\u9762\u53CD\u5149", timeOfDay: "\u6DF1\u591C", narrativeFunction: "\u81F3\u6697\u65F6\u523B", keyProps: "\u5899\u9762\u5212\u75D5", imagePromptZh: "\u5730\u4E0B\u8D1F1\u5C42\u6C34\u6CE5\u8D70\u5ECA\uFF0C\u6591\u9A73\u5899\u9762\uFF0C\u60E8\u767D\u65E5\u5149\u706F\u7BA1\u90E8\u5206\u95EA\u70C1\uFF0C\u5730\u9762\u53CD\u5149\uFF0C\u5C3D\u5934\u9690\u5165\u9ED1\u6697\uFF0C\u8BE1\u5F02\u5BD2\u610F\uFF0C\u7535\u5F71\u611F\u7EB5\u6DF1\u6784\u56FE\uFF0C16:9", imagePromptEn: "underground B1 concrete corridor, peeling walls, pale flickering fluorescent tubes, glossy reflective floor, vanishing into darkness at the end, eerie chilling mood, cinematic depth composition, 16:9" }
      ]
    },
    storyboard: {
      shots: [
        { episode: 1, sceneNo: 1, shotNo: 1, shotType: "\u8FDC\u666F", cameraAngle: "\u5E73\u89C6", cameraMove: "\u63A8", visual: "\u6DF1\u591C\u57CE\u5E02\u4E2D\u72EC\u680B\u529E\u516C\u697C\u5916\u666F\uFF0C\u73BB\u7483\u5E55\u5899\u53CD\u5C04\u8857\u706F\uFF0C\u4EC5\u9876\u5C42\u4E00\u6247\u7A97\u4EAE\u7740\u706F\u5149", dialogue: "", action: "\u955C\u5934\u7F13\u6162\u63A8\u8FD1\u529E\u516C\u697C", duration: 5, emotion: 3, characterNames: [], sceneName: "\u529E\u516C\u697C\u591C\u666F", promptZh: "\u8FDC\u666F\uFF0C\u6DF1\u591C\u57CE\u5E02\u4E2D\u72EC\u680B\u529E\u516C\u697C\u5916\u666F\uFF0C\u73BB\u7483\u5E55\u5899\u53CD\u5C04\u51B7\u84DD\u6708\u5149\u4E0E\u6696\u9EC4\u8857\u706F\uFF0C\u4EC5\u9876\u5C42\u4E00\u6247\u7A97\u4EAE\u706F\uFF0C\u8857\u9762\u7A7A\u65F7\uFF0C\u955C\u5934\u7F13\u6162\u63A8\u8FD1\uFF0C\u7535\u5F71\u611F\u51B7\u8C03\u60AC\u7591\uFF0C16:9", promptEn: "Wide shot, lone office tower at night, glass curtain wall reflecting cold blue moonlight and warm street lamps, single lit top-floor window, empty street, slow dolly-in, cinematic cold thriller tone, 16:9" },
        { episode: 1, sceneNo: 2, shotNo: 1, shotType: "\u4E2D\u666F", cameraAngle: "\u5E73\u89C6", cameraMove: "\u56FA\u5B9A", visual: "\u6797\u590F\u8D70\u8FDB\u7535\u68AF\u8F7F\u53A2\uFF0C\u8F6C\u8EAB\u6309\u4E0B1\u5C42\u6309\u952E", dialogue: "", action: "\u6797\u590F\u8D70\u8FDB\u7535\u68AF\u8F6C\u8EAB\u6309\u952E\uFF0C\u95E8\u7F13\u7F13\u5408\u4E0A", duration: 4, emotion: 2, characterNames: ["\u6797\u590F"], sceneName: "\u7535\u68AF\u8F7F\u53A2", promptZh: "\u4E2D\u666F\uFF0C\u9F50\u80A9\u77ED\u53D1\u5973\u8BB0\u8005\u7A7F\u9ED1\u8272\u9AD8\u9886\u6BDB\u8863\u4E0E\u6DF1\u7070\u98CE\u8863\u8D70\u8FDB\u4E0D\u9508\u94A2\u7535\u68AF\uFF0C\u8F6C\u8EAB\u63091\u5C42\u6309\u952E\uFF0C\u95E8\u7F13\u7F13\u5408\u4E0A\uFF0C\u60E8\u767D\u9876\u706F\uFF0C\u955C\u9762\u53CD\u5C04\uFF0C\u51B7\u8C03\u7535\u5F71\u611F\uFF0C16:9", promptEn: "Medium shot, shoulder-length-haired female journalist in black turtleneck and dark grey trench coat enters stainless-steel elevator, turns and presses floor-1 button, doors slowly close, harsh white ceiling light, mirror reflections, cold cinematic tone, 16:9" },
        { episode: 1, sceneNo: 2, shotNo: 2, shotType: "\u7279\u5199", cameraAngle: "\u5E73\u89C6", cameraMove: "\u56FA\u5B9A", visual: "\u7535\u68AF\u6309\u952E\u9762\u677F\uFF0C1\u5C42\u6309\u952E\u4EAE\u8D77\u51B7\u5149", dialogue: "", action: "\u56FA\u5B9A\u955C\u5934\uFF0C\u6309\u952E\u6570\u5B571\u4EAE\u8D77", duration: 2, emotion: 2, characterNames: [], sceneName: "\u7535\u68AF\u8F7F\u53A2", promptZh: "\u7279\u5199\uFF0C\u7535\u68AF\u4E0D\u9508\u94A2\u6309\u952E\u9762\u677F\uFF0C\u6570\u5B571\u6309\u952E\u4EAE\u8D77\u51B7\u767D\u5149\uFF0C\u91D1\u5C5E\u53CD\u5149\uFF0C\u666F\u6DF1\u865A\u5316\uFF0C\u51B7\u8C03\u60AC\u7591\uFF0C16:9", promptEn: "Close-up, stainless-steel elevator button panel, number 1 button glowing cold white, metallic reflection, shallow depth of field, cold thriller tone, 16:9" },
        { episode: 1, sceneNo: 2, shotNo: 3, shotType: "\u4E2D\u666F", cameraAngle: "\u5E73\u89C6", cameraMove: "\u56FA\u5B9A", visual: "\u7535\u68AF\u572814\u697C\u505C\u4E0B\uFF0C\u95E8\u7F13\u7F13\u6253\u5F00\uFF0C\u95E8\u5916\u8D70\u5ECA\u6F06\u9ED1\u65E0\u4EBA", dialogue: "", action: "\u95E8\u5F00\uFF0C\u6797\u590F\u62AC\u5934\u671B\u5411\u95E8\u5916\u9ED1\u6697", duration: 5, emotion: 5, characterNames: ["\u6797\u590F"], sceneName: "\u7535\u68AF\u8F7F\u53A2", promptZh: "\u4E2D\u666F\uFF0C\u4E0D\u9508\u94A2\u7535\u68AF\u572814\u697C\u505C\u4E0B\u95E8\u7F13\u7F13\u6253\u5F00\uFF0C\u95E8\u5916\u8D70\u5ECA\u6F06\u9ED1\u65E0\u4EBA\uFF0C\u77ED\u53D1\u5973\u8BB0\u8005\u62AC\u5934\u671B\u5411\u9ED1\u6697\uFF0C\u60E8\u767D\u9876\u706F\uFF0C\u955C\u9762\u53CD\u5C04\uFF0C\u7D27\u5F20\u6C1B\u56F4\uFF0C\u7535\u5F71\u611F\uFF0C16:9", promptEn: "Medium shot, stainless-steel elevator stops at floor 14, doors slowly open to pitch-black empty corridor, short-haired female journalist looks up into darkness, harsh white ceiling light, mirror reflections, tense mood, cinematic, 16:9" },
        { episode: 1, sceneNo: 2, shotNo: 4, shotType: "\u8FD1\u666F", cameraAngle: "\u5E73\u89C6", cameraMove: "\u56FA\u5B9A", visual: "\u6797\u590F\u76B1\u7709\uFF0C\u8FDE\u7EED\u6309\u4E0B\u5173\u95E8\u952E", dialogue: "", action: "\u624B\u6307\u53CD\u590D\u6309\u5173\u95E8\u952E\uFF0C\u795E\u60C5\u7126\u8651", duration: 3, emotion: 6, characterNames: ["\u6797\u590F"], sceneName: "\u7535\u68AF\u8F7F\u53A2", promptZh: "\u8FD1\u666F\uFF0C\u9F50\u80A9\u77ED\u53D1\u5973\u8BB0\u8005\u76B1\u7709\uFF0C\u624B\u6307\u53CD\u590D\u6309\u4E0B\u5173\u95E8\u952E\uFF0C\u795E\u60C5\u7126\u8651\u538B\u6291\uFF0C\u60E8\u767D\u9876\u706F\uFF0C\u51B7\u8C03\uFF0C\u7535\u5F71\u611F\uFF0C16:9", promptEn: "Close shot, shoulder-length-haired female journalist frowns, finger repeatedly pressing close-door button, anxious restrained expression, harsh white light, cold tone, cinematic, 16:9" },
        { episode: 1, sceneNo: 2, shotNo: 5, shotType: "\u7279\u5199", cameraAngle: "\u5E73\u89C6", cameraMove: "\u624B\u6301", visual: "\u697C\u5C42\u663E\u793A\u5C4F\u6570\u5B57\u5FEB\u901F\u4E0B\u964D\uFF1A13\u300110\u30017\u30014\u3001\u8D1F1", dialogue: "", action: "\u6570\u5B57\u8DF3\u52A8\u4E0B\u884C\uFF0C\u753B\u9762\u5FAE\u5FAE\u9707\u52A8", duration: 3, emotion: 7, characterNames: [], sceneName: "\u7535\u68AF\u8F7F\u53A2", promptZh: "\u7279\u5199\uFF0C\u7535\u68AF\u697C\u5C42\u663E\u793A\u5C4F\u6570\u5B57\u5FEB\u901F\u4E0B\u964D13\u5230\u8D1F1\uFF0C\u7EA2\u8272\u6570\u5B57\u8DF3\u52A8\uFF0C\u753B\u9762\u5FAE\u9707\uFF0C\u51B7\u8C03\u60AC\u7591\uFF0C16:9", promptEn: "Close-up, elevator floor display numbers rapidly descending 13 to B1, red digits flickering, slight camera shake, cold thriller tone, 16:9" },
        { episode: 1, sceneNo: 3, shotNo: 1, shotType: "\u4E2D\u666F", cameraAngle: "\u5E73\u89C6", cameraMove: "\u79FB", visual: "\u8D1F1\u5C42\u8D70\u5ECA\u95E8\u5F00\uFF0C\u60E8\u767D\u706F\u7BA1\u4E0B\u5899\u9762\u6709\u4E00\u9053\u65B0\u9C9C\u5212\u75D5", dialogue: "", action: "\u955C\u5934\u4ECE\u7535\u68AF\u5185\u671B\u5411\u8D70\u5ECA\uFF0C\u706F\u5149\u95EA\u70C1", duration: 5, emotion: 8, characterNames: [], sceneName: "\u8D1F1\u5C42\u8D70\u5ECA", promptZh: "\u4E2D\u666F\uFF0C\u8D1F1\u5C42\u8D70\u5ECA\u95E8\u5F00\uFF0C\u60E8\u767D\u65E5\u5149\u706F\u7BA1\u90E8\u5206\u95EA\u70C1\uFF0C\u6591\u9A73\u5899\u9762\u4E0A\u4E00\u9053\u65B0\u9C9C\u5212\u75D5\uFF0C\u5730\u9762\u53CD\u5149\uFF0C\u5C3D\u5934\u9ED1\u6697\uFF0C\u8BE1\u5F02\u5BD2\u610F\uFF0C\u7EB5\u6DF1\u6784\u56FE\uFF0C\u7535\u5F71\u611F\uFF0C16:9", promptEn: "Medium shot, B1 corridor door opens, pale flickering fluorescent tubes, fresh scratch on peeling wall, glossy reflective floor, darkness at the end, eerie chilling mood, depth composition, cinematic, 16:9" },
        { episode: 1, sceneNo: 2, shotNo: 6, shotType: "\u8FD1\u666F", cameraAngle: "\u5E73\u89C6", cameraMove: "\u63A8", visual: "\u7535\u68AF\u955C\u9762\u91CC\uFF0C\u6797\u590F\u8EAB\u540E\u7AD9\u7740\u4E00\u4E2A\u7A7F\u7070\u8272\u98CE\u8863\u7684\u4EBA\u5F71\uFF0C\u4EBA\u5F71\u62AC\u624B\u6307\u5411\u630E\u5305", dialogue: "\u8001\u5468(\u5BF9\u8BB2\u673A): \u6797\u8BB0\u8005\uFF0C\u4F60\u522B\u56DE\u5934\u3002", action: "\u6797\u590F\u50F5\u4F4F\uFF0C\u4EBA\u5F71\u7F13\u7F13\u62AC\u624B", duration: 6, emotion: 10, characterNames: ["\u6797\u590F", "\u4EBA\u5F71"], sceneName: "\u7535\u68AF\u8F7F\u53A2", promptZh: "\u8FD1\u666F\uFF0C\u7535\u68AF\u955C\u9762\u53CD\u5C04\u4E2D\uFF0C\u77ED\u53D1\u5973\u8BB0\u8005\u8EAB\u540E\u7AD9\u7740\u4E00\u4E2A\u7A7F\u7070\u8272\u7ACB\u9886\u98CE\u8863\u7684\u4EBA\u5F71\uFF0C\u9762\u5BB9\u9690\u4E8E\u9634\u5F71\uFF0C\u4EBA\u5F71\u7F13\u7F13\u62AC\u624B\u6307\u5411\u630E\u5305\uFF0C\u60E8\u767D\u9876\u706F\u9AA4\u706D\u524D\u4E00\u523B\uFF0C\u60CA\u609A\u60AC\u7591\uFF0C\u7535\u5F71\u611F\uFF0C16:9", promptEn: "Close shot, elevator mirror reflection, short-haired female journalist with a grey high-collar trench-coat silhouette standing behind her, face hidden in shadow, silhouette slowly raising hand pointing at her shoulder bag, moment before white light cuts out, horror thriller mood, cinematic, 16:9" }
      ]
    }
  }
};

// public/js/app.jsx
import { jsx, jsxs } from "react/jsx-runtime";
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
function Sidebar({ projects, currentId, onSelect, onNew, onDelete, onImport }) {
  const fileRef = useR(null);
  return /* @__PURE__ */ jsxs("aside", { className: "sidebar", children: [
    /* @__PURE__ */ jsxs("div", { className: "sidebar-head", children: [
      /* @__PURE__ */ jsx(Button, { size: "small", type: "primary", block: true, onClick: onNew, children: "+ \u65B0\u5EFA\u9879\u76EE" }),
      /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => fileRef.current?.click(), children: "\u5BFC\u5165" }),
      /* @__PURE__ */ jsx("input", { ref: fileRef, type: "file", accept: ".json", hidden: true, onChange: async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const text = await f.text();
        try {
          onImport(JSON.parse(text));
        } catch {
          toast("\u5BFC\u5165\u5931\u8D25", "error");
        }
        e.target.value = "";
      } })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "sidebar-list", children: [
      projects.length === 0 && /* @__PURE__ */ jsx("div", { style: { padding: 16, color: "var(--ai-text-muted)", fontSize: 12, textAlign: "center" }, children: "\u6682\u65E0\u9879\u76EE" }),
      projects.map((p) => /* @__PURE__ */ jsxs("div", { className: `proj-item ${p.id === currentId ? "active" : ""}`, onClick: () => onSelect(p.id), children: [
        /* @__PURE__ */ jsx("span", { children: p.name }),
        /* @__PURE__ */ jsx("span", { className: "del", onClick: (e) => {
          e.stopPropagation();
          onDelete(p.id);
        }, children: "\u2715" })
      ] }, p.id))
    ] })
  ] });
}
function SettingsModal({ open, onClose }) {
  const [cfg, setCfg] = useS(null);
  const [testing, setTesting] = useS(false);
  const [testRes, setTestRes] = useS(null);
  useE(() => {
    if (open) api.getConfig().then(setCfg).catch(() => {
    });
  }, [open]);
  if (!open || !cfg) return null;
  const updateProvider = (id, field, val) => {
    setCfg((c) => ({ ...c, providers: c.providers.map((p) => p.id === id ? { ...p, [field]: val } : p) }));
  };
  const addProvider = () => {
    const id = "prov_" + Date.now().toString(36);
    setCfg((c) => ({ ...c, providers: [...c.providers, { id, name: "\u65B0\u63D0\u4F9B\u5546", baseUrl: "", apiKey: "", model: "", type: "llm" }] }));
  };
  const delProvider = (id) => setCfg((c) => ({ ...c, providers: c.providers.filter((p) => p.id !== id) }));
  const addPreset = (preset) => {
    if (cfg.providers.find((p) => p.id === preset.id)) return;
    setCfg((c) => ({ ...c, providers: [...c.providers, { ...preset, type: "llm", apiKey: "" }] }));
  };
  const save = async () => {
    await api.saveConfig(cfg);
    toast("\u914D\u7F6E\u5DF2\u4FDD\u5B58", "ok");
    onClose();
  };
  const test = async () => {
    const p = cfg.providers.find((x) => x.id === cfg.activeProvider) || cfg.providers[0];
    if (!p || !p.baseUrl || !p.apiKey) {
      toast("\u8BF7\u586B\u5199\u5B8C\u6574", "error");
      return;
    }
    setTesting(true);
    setTestRes(null);
    try {
      const r = await api.testConn(p.baseUrl, p.apiKey, p.model);
      setTestRes(r);
    } catch (e) {
      setTestRes({ ok: false, error: e.message });
    }
    setTesting(false);
  };
  return /* @__PURE__ */ jsx(Modal, { open, title: "\u2699\uFE0F \u8BBE\u7F6E \u2014 LLM \u4E0E\u5A92\u4F53\u751F\u6210", onClose, onOk: save, okText: "\u4FDD\u5B58\u914D\u7F6E", cancelText: "\u53D6\u6D88", width: 680, children: /* @__PURE__ */ jsxs("div", { className: "settings-body", children: [
    /* @__PURE__ */ jsxs("div", { style: { marginBottom: 14 }, children: [
      /* @__PURE__ */ jsx("div", { className: "card-title", style: { marginBottom: 8 }, children: "\u9884\u8BBE\u63D0\u4F9B\u5546\uFF08\u70B9\u51FB\u6DFB\u52A0\uFF09" }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: cfg.presets.map((p) => /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => addPreset(p), disabled: !!cfg.providers.find((x) => x.id === p.id), children: p.name }, p.id)) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "card-title", style: { marginBottom: 8 }, children: "\u5DF2\u914D\u7F6E\u63D0\u4F9B\u5546" }),
    cfg.providers.map((p) => /* @__PURE__ */ jsxs("div", { className: `provider-row ${p.id === cfg.activeProvider ? "active" : ""}`, children: [
      /* @__PURE__ */ jsxs("div", { className: "field-mini", children: [
        /* @__PURE__ */ jsx("label", { children: "\u540D\u79F0" }),
        /* @__PURE__ */ jsx("input", { value: p.name, onChange: (e) => updateProvider(p.id, "name", e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "field-mini", style: { flex: 2 }, children: [
        /* @__PURE__ */ jsx("label", { children: "Base URL" }),
        /* @__PURE__ */ jsx("input", { value: p.baseUrl, onChange: (e) => updateProvider(p.id, "baseUrl", e.target.value), placeholder: "https://api.openai.com/v1" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "field-mini", style: { flex: 1.5 }, children: [
        /* @__PURE__ */ jsx("label", { children: "API Key" }),
        /* @__PURE__ */ jsx("input", { type: "password", value: p.apiKey, onChange: (e) => updateProvider(p.id, "apiKey", e.target.value), placeholder: "sk-..." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "field-mini", style: { flex: 1 }, children: [
        /* @__PURE__ */ jsx("label", { children: "\u6A21\u578B" }),
        /* @__PURE__ */ jsx("input", { value: p.model, onChange: (e) => updateProvider(p.id, "model", e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [
        /* @__PURE__ */ jsx(Button, { size: "small", type: p.id === cfg.activeProvider ? "primary" : "default", onClick: () => setCfg((c) => ({ ...c, activeProvider: p.id })), children: p.id === cfg.activeProvider ? "\u2713 \u4E3B" : "\u8BBE\u4E3A\u4E3B" }),
        /* @__PURE__ */ jsx(Button, { size: "small", danger: true, onClick: () => delProvider(p.id), children: "\u5220" })
      ] })
    ] }, p.id)),
    /* @__PURE__ */ jsx(Button, { size: "small", onClick: addProvider, style: { marginTop: 6 }, children: "+ \u81EA\u5B9A\u4E49\u63D0\u4F9B\u5546" }),
    /* @__PURE__ */ jsxs("div", { style: { marginTop: 16, display: "flex", gap: 10, alignItems: "center" }, children: [
      /* @__PURE__ */ jsx(Button, { type: "primary", loading: testing, onClick: test, children: "\u6D4B\u8BD5\u8FDE\u63A5" }),
      testRes && /* @__PURE__ */ jsx("span", { style: { fontSize: 12, color: testRes.ok ? "var(--ai-success)" : "var(--ai-error)" }, children: testRes.ok ? "\u2713 \u8FDE\u63A5\u6210\u529F" : "\u2717 " + (testRes.error || "\u5931\u8D25") })
    ] }),
    /* @__PURE__ */ jsx("p", { style: { fontSize: 11, color: "var(--ai-text-muted)", marginTop: 12 }, children: "\u63D0\u793A\uFF1AAPI Key \u5B58\u50A8\u5728\u670D\u52A1\u7AEF data/config.json\uFF0C\u524D\u7AEF\u4EC5\u663E\u793A\u8131\u654F\u3002\u56FE\u50CF/\u89C6\u9891\u751F\u6210\u9700\u914D\u7F6E\u542B Agnes \u7684\u63D0\u4F9B\u5546\u3002" })
  ] }) });
}
function InputPanel({ project, onUpdate, onPreprocess, onAnalyze, onAnalyzeAll, styles, generating }) {
  const [content, setContent] = useS(project?.content || "");
  const [selectedModules, setSelectedModules] = useS(MODULES.map((m) => m.id));
  const [importOpen, setImportOpen] = useS(false);
  const [importText, setImportText] = useS("");
  const [preprocessData, setPreprocessData] = useS(null);
  const [preprocessing, setPreprocessing] = useS(false);
  const [status, setStatus] = useS("");
  const abortRef = useR(null);
  useE(() => {
    setContent(project?.content || "");
    setPreprocessData(null);
  }, [project?.id]);
  const onContentChange = (v) => {
    setContent(v);
    onUpdate({ content: v });
  };
  const toggleModule = (id) => {
    setSelectedModules((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };
  const doPreprocess = async () => {
    if (!content.trim()) {
      toast("\u8BF7\u5148\u8F93\u5165\u5185\u5BB9", "error");
      return;
    }
    setPreprocessing(true);
    setStatus("\u9884\u5904\u7406\u4E2D...");
    setPreprocessData(null);
    try {
      await api.preprocess(content, (d) => {
        if (d.status === "split_done") setStatus(`\u5DF2\u5206 ${d.total} \u6BB5`);
        if (d.status === "summarizing") setStatus(`\u5206\u6790\u7B2C ${d.progress}/${d.total} \u6BB5...`);
        if (d.status === "synthesizing") setStatus("\u7EFC\u5408\u5206\u6790\u4E2D...");
        if (d.status === "done") {
          setPreprocessData(d);
          setStatus("\u9884\u5904\u7406\u5B8C\u6210");
          toast("\u9884\u5904\u7406\u5B8C\u6210", "ok");
        }
        if (d.status === "segment_done") setPreprocessData((prev) => ({ ...prev, segments: [...prev?.segments || [], d.data] }));
      });
    } catch (e) {
      setStatus("\u9884\u5904\u7406\u5931\u8D25: " + e.message);
      toast("\u9884\u5904\u7406\u5931\u8D25", "error");
    }
    setPreprocessing(false);
  };
  const doImportChapters = async () => {
    if (!importText.trim()) return;
    try {
      const r = await api.importChapters(project.id, importText);
      toast(`\u5DF2\u5BFC\u5165 ${r.imported} \u7AE0`, "ok");
      setImportOpen(false);
      setImportText("");
    } catch (e) {
      toast(e.message, "error");
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "input-panel", children: [
    /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsxs("div", { className: "card-head", children: [
        /* @__PURE__ */ jsx("span", { className: "card-title", children: "\u{1F4DD} \u6E90\u6587\u672C" }),
        /* @__PURE__ */ jsxs("div", { className: "card-actions", children: [
          /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => setImportOpen(true), children: "\u5206\u7AE0\u5BFC\u5165" }),
          /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => onAnalyze && onLoadExample(), children: "\u52A0\u8F7D\u793A\u4F8B" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("textarea", { id: "sourceText", value: content, onChange: (e) => onContentChange(e.target.value), placeholder: "\u7C98\u8D34\u5C0F\u8BF4\u3001\u6545\u4E8B\u6216\u5267\u672C\u6587\u672C...", spellCheck: false }),
      /* @__PURE__ */ jsxs("div", { className: "char-count", children: [
        content.length,
        " \u5B57"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsx("div", { className: "card-head", children: /* @__PURE__ */ jsx("span", { className: "card-title", children: "\u{1F3A8} \u89C6\u89C9\u98CE\u683C" }) }),
      /* @__PURE__ */ jsx("div", { className: "style-grid", children: styles.map((s) => /* @__PURE__ */ jsx("div", { className: `style-chip ${project?.style === s.key ? "active" : ""}`, onClick: () => onUpdate({ style: s.key }), title: s.desc, children: s.label }, s.key)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsx("div", { className: "card-head", children: /* @__PURE__ */ jsx("span", { className: "card-title", children: "\u{1F4CB} \u5206\u6790\u6A21\u5757" }) }),
      /* @__PURE__ */ jsx("div", { className: "module-grid", children: MODULES.map((m) => /* @__PURE__ */ jsxs("div", { className: `module-chip ${selectedModules.includes(m.id) ? "active" : ""}`, onClick: () => toggleModule(m.id), children: [
        /* @__PURE__ */ jsx("span", { className: "icon", children: m.icon }),
        m.name
      ] }, m.id)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsx("div", { className: "card-head", children: /* @__PURE__ */ jsx("span", { className: "card-title", children: "\u26A1 \u64CD\u4F5C" }) }),
      /* @__PURE__ */ jsx("div", { className: "gen-actions", children: /* @__PURE__ */ jsx(Button, { block: true, loading: preprocessing, onClick: doPreprocess, children: "\u{1F50D} \u9884\u5904\u7406" }) }),
      /* @__PURE__ */ jsx("div", { className: "gen-actions", children: /* @__PURE__ */ jsx(Button, { block: true, type: "primary", loading: generating, onClick: () => onAnalyzeAll(selectedModules), children: "\u{1F680} \u4E00\u952E\u5168\u90E8\u5206\u6790" }) }),
      /* @__PURE__ */ jsx("div", { className: "status-bar info", children: status }),
      preprocessData?.global && /* @__PURE__ */ jsxs("div", { style: { marginTop: 10, fontSize: 12, color: "var(--ai-text-secondary)", background: "var(--ai-bg)", padding: 10, borderRadius: 8 }, children: [
        /* @__PURE__ */ jsx("b", { style: { color: "var(--ai-text)" }, children: preprocessData.global.title || "\u672A\u547D\u540D" }),
        " \xB7 ",
        preprocessData.global.genre || "",
        preprocessData.global.characters?.slice(0, 5).map((c, i) => /* @__PURE__ */ jsx(Tag, { size: "small", style: { marginLeft: 4 }, children: c.name }, i))
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Modal, { open: importOpen, title: "\u5206\u7AE0\u5BFC\u5165", onClose: () => setImportOpen(false), onOk: doImportChapters, okText: "\u5BFC\u5165", cancelText: "\u53D6\u6D88", children: [
      /* @__PURE__ */ jsx("p", { style: { fontSize: 12, color: "var(--ai-text-muted)", marginBottom: 8 }, children: '\u7C98\u8D34\u5168\u6587\uFF0C\u7CFB\u7EDF\u6309"\u7B2CX\u7AE0/Chapter N"\u81EA\u52A8\u5206\u7AE0\u3002' }),
      /* @__PURE__ */ jsx("textarea", { value: importText, onChange: (e) => setImportText(e.target.value), style: { width: "100%", minHeight: 200, border: "2px solid var(--ai-border)", borderRadius: 8, padding: 10, fontSize: 13, fontFamily: "inherit" } })
    ] })
  ] });
}
function onLoadExample() {
  window.__loadExample?.();
}
function ResultPanel({ project, onUpdate, styles }) {
  const [tab, setTab] = useS("characters");
  const [streaming, setStreaming] = useS("");
  const [generating, setGenerating] = useS(false);
  const [progress, setProgress] = useS("");
  const abortRef = useR(null);
  const results = project?.results || {};
  const characters = results.characters?.characters || [];
  const scenes = results.scenes?.scenes || [];
  const shots = results.storyboard?.shots || [];
  const analyzeOne = async (type) => {
    if (!project?.content?.trim()) {
      toast("\u8BF7\u5148\u8F93\u5165\u6E90\u6587\u672C", "error");
      return;
    }
    setGenerating(true);
    setStreaming("");
    setProgress(`\u6B63\u5728\u751F\u6210${MODULES.find((m) => m.id === type)?.name}...`);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      let mdBuf = "";
      await api.analyze({
        type,
        content: project.content,
        visualStyle: project.style,
        projectId: project.id,
        characters,
        scenes
      }, (d) => {
        if (d.status === "chunk") {
          mdBuf += d.content;
          setStreaming(mdBuf);
        }
        if (d.status === "done") {
          onUpdate({ results: { ...results, [type]: d.result } });
          setStreaming("");
          setProgress(`${MODULES.find((m) => m.id === type)?.name} \u5B8C\u6210`);
          toast("\u751F\u6210\u5B8C\u6210", "ok");
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
  const analyzeAll = async (modules) => {
    if (!project?.content?.trim()) {
      toast("\u8BF7\u5148\u8F93\u5165\u6E90\u6587\u672C", "error");
      return;
    }
    setGenerating(true);
    setStreaming("");
    setProgress("\u5F00\u59CB\u6279\u91CF\u5206\u6790...");
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      await api.analyzeAll({
        content: project.content,
        visualStyle: project.style,
        projectId: project.id,
        modules
      }, (d) => {
        if (d.status === "module_start") setProgress(`\u6B63\u5728\u751F\u6210 ${MODULES.find((m) => m.id === d.type)?.name}...`);
        if (d.status === "module_chunk") setStreaming((prev) => prev + d.content);
        if (d.status === "module_done") {
          const newResults = { ...results, [d.type]: d.result };
          onUpdate({ results: newResults });
          setStreaming("");
        }
        if (d.status === "module_error") setProgress(`\u6A21\u5757 ${d.type} \u5931\u8D25: ${d.error}`);
        if (d.status === "all_done") {
          setProgress("\u5168\u90E8\u5B8C\u6210");
          toast("\u6279\u91CF\u5206\u6790\u5B8C\u6210", "ok");
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
    window.__analyzeAll = analyzeAll;
    window.__analyzeOne = analyzeOne;
  });
  const tabs = [
    { id: "characters", name: "\u{1F3AD} \u89D2\u8272", count: characters.length },
    { id: "scenes", name: "\u{1F3DE}\uFE0F \u573A\u666F", count: scenes.length },
    { id: "storyboard", name: "\u{1F3AC} \u5206\u955C", count: shots.length },
    ...MODULES.filter((m) => m.type === "md").map((m) => ({ id: m.id, name: `${m.icon} ${m.name}` })),
    { id: "knowledge", name: "\u{1F4DA} \u77E5\u8BC6\u5E93" },
    { id: "media", name: "\u{1F5BC}\uFE0F \u5A92\u4F53\u751F\u6210" },
    { id: "consistency", name: "\u{1F50D} \u4E00\u81F4\u6027" }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "result-panel", children: [
    /* @__PURE__ */ jsxs("div", { className: "result-tabs", children: [
      tabs.map((t) => /* @__PURE__ */ jsxs("div", { className: `result-tab ${tab === t.id ? "active" : ""}`, onClick: () => setTab(t.id), children: [
        t.name,
        t.count !== void 0 && /* @__PURE__ */ jsx("span", { className: "count", children: t.count })
      ] }, t.id)),
      /* @__PURE__ */ jsxs("div", { style: { marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }, children: [
        tab !== "media" && tab !== "knowledge" && tab !== "consistency" && /* @__PURE__ */ jsx(Button, { size: "small", type: "primary", loading: generating, onClick: () => analyzeOne(tab), children: generating ? "\u751F\u6210\u4E2D" : `\u751F\u6210${MODULES.find((m) => m.id === tab)?.name || ""}` }),
        /* @__PURE__ */ jsx("a", { href: api.exportMd(project?.id), download: true, children: /* @__PURE__ */ jsx(Button, { size: "small", children: "\u5BFC\u51FAMD" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "result-content", children: [
      (generating || streaming) && /* @__PURE__ */ jsxs("div", { style: { marginBottom: 12, padding: 10, background: "var(--ai-primary-bg)", borderRadius: 8, fontSize: 13 }, children: [
        progress,
        streaming && /* @__PURE__ */ jsx("div", { className: "md-body", style: { marginTop: 8, maxHeight: 300, overflow: "auto" }, dangerouslySetInnerHTML: { __html: renderMd(streaming) } })
      ] }),
      tab === "characters" && /* @__PURE__ */ jsx(CharactersView, { characters, onUpdate: (chars) => onUpdate({ results: { ...results, characters: { characters: chars } } }) }),
      tab === "scenes" && /* @__PURE__ */ jsx(ScenesView, { scenes, onUpdate: (sc) => onUpdate({ results: { ...results, scenes: { scenes: sc } } }) }),
      tab === "storyboard" && /* @__PURE__ */ jsx(ShotView, { shots, characters, scenes, onUpdate: (sh) => onUpdate({ results: { ...results, storyboard: { shots: sh } } }) }),
      MODULES.filter((m) => m.type === "md").map((m) => tab === m.id && /* @__PURE__ */ jsx(MdView, { content: results[m.id], emptyTip: `\u70B9\u51FB\u53F3\u4E0A\u65B9"\u751F\u6210${m.name}"\u5F00\u59CB` }, m.id)),
      tab === "knowledge" && /* @__PURE__ */ jsx(KnowledgeView, { project, onUpdate }),
      tab === "media" && /* @__PURE__ */ jsx(MediaGen, { styles, project }),
      tab === "consistency" && /* @__PURE__ */ jsx(ConsistencyView, { project })
    ] })
  ] });
}
function CharactersView({ characters, onUpdate }) {
  if (!characters.length) return /* @__PURE__ */ jsx(Empty, { tip: "\u751F\u6210\u89D2\u8272\u8BBE\u5B9A\u540E\u5C06\u663E\u793A\u5728\u6B64" });
  const fields = [["role", "\u53D9\u4E8B\u529F\u80FD"], ["gender", "\u6027\u522B"], ["age", "\u5E74\u9F84"], ["appearance", "\u5916\u8C8C"], ["personality", "\u6027\u683C"], ["costume", "\u670D\u88C5\u9053\u5177"], ["arc", "\u89D2\u8272\u5F27\u5149"], ["imagePromptZh", "\u5F62\u8C61\u56FEPrompt(\u4E2D)"], ["imagePromptEn", "\u5F62\u8C61\u56FEPrompt(\u82F1)"]];
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
      fields.map(([k, label]) => /* @__PURE__ */ jsxs("div", { className: "field", children: [
        /* @__PURE__ */ jsx("label", { children: label }),
        k.startsWith("imagePrompt") ? /* @__PURE__ */ jsx("textarea", { className: "prompt", value: c[k] || "", onChange: (e) => updateField(i, k, e.target.value) }) : /* @__PURE__ */ jsx("input", { value: c[k] || "", onChange: (e) => updateField(i, k, e.target.value) })
      ] }, k))
    ] }, i)),
    /* @__PURE__ */ jsx(Button, { onClick: () => onUpdate([...characters, { name: "\u65B0\u89D2\u8272" }]), children: "+ \u65B0\u589E\u89D2\u8272" })
  ] });
}
function ScenesView({ scenes, onUpdate }) {
  if (!scenes.length) return /* @__PURE__ */ jsx(Empty, { tip: "\u751F\u6210\u573A\u666F\u8BBE\u5B9A\u540E\u5C06\u663E\u793A\u5728\u6B64" });
  const fields = [["environment", "\u73AF\u5883"], ["mood", "\u6C1B\u56F4"], ["lighting", "\u5149\u7167"], ["timeOfDay", "\u65F6\u95F4\u6BB5"], ["narrativeFunction", "\u53D9\u4E8B\u529F\u80FD"], ["keyProps", "\u5173\u952E\u9053\u5177"], ["imagePromptZh", "\u573A\u666F\u56FEPrompt(\u4E2D)"], ["imagePromptEn", "\u573A\u666F\u56FEPrompt(\u82F1)"]];
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
  if (!shots.length) return /* @__PURE__ */ jsx(Empty, { tip: "\u751F\u6210\u8BBE\u5B9A\u540E\uFF0C\u70B9\u51FB\u53F3\u4E0A\u65B9\u751F\u6210\u5206\u955C\u811A\u672C" });
  const eps = [...new Set(shots.map((s) => s.episode))];
  let filtered = shots;
  if (filterEp) filtered = filtered.filter((s) => s.episode == filterEp);
  if (filterScene) filtered = filtered.filter((s) => s.sceneName === filterScene);
  const charName = (names) => (names || []).join("\u3001");
  const update = (i, k, v) => {
    const sh = [...shots];
    const idx = shots.indexOf(filtered[i]);
    sh[idx] = { ...sh[idx], [k]: v };
    onUpdate(sh);
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
        /* @__PURE__ */ jsx("th", { className: "num", children: "\u79D2" }),
        /* @__PURE__ */ jsx("th", { children: "\u89D2\u8272" }),
        /* @__PURE__ */ jsx("th", { children: "\u573A\u666F" }),
        /* @__PURE__ */ jsx("th", { className: "prompt-cell", children: "Prompt(\u4E2D)" }),
        /* @__PURE__ */ jsx("th", { className: "prompt-cell", children: "Prompt(\u82F1)" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: filtered.map((s, i) => /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("td", { className: "num", children: s.episode }),
        /* @__PURE__ */ jsx("td", { className: "num", children: s.sceneNo }),
        /* @__PURE__ */ jsx("td", { className: "num", children: s.shotNo }),
        /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(i, "shotType", e.target.textContent), children: s.shotType }) }),
        /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(i, "visual", e.target.textContent), children: s.visual }) }),
        /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(i, "dialogue", e.target.textContent), children: s.dialogue }) }),
        /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(i, "action", e.target.textContent), children: s.action }) }),
        /* @__PURE__ */ jsx("td", { className: "num", children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(i, "duration", parseInt(e.target.textContent) || 0), children: s.duration }) }),
        /* @__PURE__ */ jsx("td", { children: charName(s.characterNames) }),
        /* @__PURE__ */ jsx("td", { children: s.sceneName }),
        /* @__PURE__ */ jsx("td", { className: "prompt-cell", children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(i, "promptZh", e.target.textContent), children: s.promptZh }) }),
        /* @__PURE__ */ jsx("td", { className: "prompt-cell", children: /* @__PURE__ */ jsx("div", { className: "cell-edit", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => update(i, "promptEn", e.target.textContent), children: s.promptEn }) })
      ] }, i)) })
    ] }) : /* @__PURE__ */ jsx("div", { className: "shot-grid", children: filtered.map((s, i) => /* @__PURE__ */ jsxs("div", { className: "shot-tile", children: [
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
          toast("\u5DF2\u590D\u5236", "ok");
        }, children: "\u590D\u5236EN" }),
        /* @__PURE__ */ jsx(Button, { size: "small", danger: true, onClick: () => onUpdate(shots.filter((_, x) => x !== shots.indexOf(s))), children: "\u5220" })
      ] })
    ] }, i)) })
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
    /* @__PURE__ */ jsx("div", { className: "kb-tabs", children: tabs.map(([k, label]) => /* @__PURE__ */ jsxs("div", { className: `kb-tab ${sub === k ? "active" : ""}`, onClick: () => setSub(k), children: [
      label,
      " (",
      (kb[k] || []).length,
      ")"
    ] }, k)) }),
    list.length === 0 ? /* @__PURE__ */ jsx(Empty, { tip: "\u5206\u6790\u7AE0\u8282\u540E\u5C06\u81EA\u52A8\u63D0\u53D6\u77E5\u8BC6\u5E93" }) : list.map((item, i) => /* @__PURE__ */ jsxs("div", { className: "kb-item", children: [
      /* @__PURE__ */ jsx("div", { className: "kb-name", children: item.name || item.chapter || "\u672A\u547D\u540D" }),
      Object.entries(item).filter(([k]) => !["id", "name", "chapter"].includes(k)).map(([k, v]) => /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, marginBottom: 3 }, children: [
        /* @__PURE__ */ jsxs("b", { style: { color: "var(--ai-text-secondary)" }, children: [
          k,
          "\uFF1A"
        ] }),
        Array.isArray(v) ? v.join("\u3001") : String(v)
      ] }, k))
    ] }, i))
  ] });
}
function MediaGen({ styles, project }) {
  const [prompt2, setPrompt] = useS("");
  const [negPrompt, setNegPrompt] = useS("");
  const [size, setSize] = useS("1024x1024");
  const [gen, setGen] = useS(false);
  const [imgUrl, setImgUrl] = useS(null);
  const [err, setErr] = useS("");
  const [media, setMedia] = useS(project?.mediaItems || []);
  const generate = async () => {
    if (!prompt2) {
      toast("\u8BF7\u8F93\u5165Prompt", "error");
      return;
    }
    setGen(true);
    setErr("");
    setImgUrl(null);
    try {
      const r = await api.genImage(prompt2, negPrompt, size, project?.style);
      if (r.ok) {
        setImgUrl(r.url);
        toast("\u751F\u6210\u6210\u529F", "ok");
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
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "card", style: { marginBottom: 12 }, children: [
      /* @__PURE__ */ jsx("div", { className: "card-title", style: { marginBottom: 10 }, children: "\u{1F5BC}\uFE0F AI \u751F\u56FE" }),
      /* @__PURE__ */ jsxs("div", { className: "ai-field", children: [
        /* @__PURE__ */ jsx("label", { children: "Prompt\uFF08\u81EA\u52A8\u8FFD\u52A0\u5F53\u524D\u89C6\u89C9\u98CE\u683C\uFF09" }),
        /* @__PURE__ */ jsx("textarea", { value: prompt2, onChange: (e) => setPrompt(e.target.value), placeholder: "\u63CF\u8FF0\u8981\u751F\u6210\u7684\u753B\u9762...", style: { minHeight: 80 } })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxs("div", { className: "ai-field", children: [
          /* @__PURE__ */ jsx("label", { children: "Negative Prompt" }),
          /* @__PURE__ */ jsx("input", { value: negPrompt, onChange: (e) => setNegPrompt(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "ai-field", children: [
          /* @__PURE__ */ jsx("label", { children: "\u5C3A\u5BF8" }),
          /* @__PURE__ */ jsxs("select", { value: size, onChange: (e) => setSize(e.target.value), children: [
            /* @__PURE__ */ jsx("option", { children: "1024x1024" }),
            /* @__PURE__ */ jsx("option", { children: "1024x768" }),
            /* @__PURE__ */ jsx("option", { children: "768x1024" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Button, { type: "primary", loading: gen, onClick: generate, block: true, children: "\u751F\u6210\u56FE\u7247" }),
      err && /* @__PURE__ */ jsx("div", { className: "status-bar error", children: err }),
      imgUrl && /* @__PURE__ */ jsx("img", { className: "img-preview", src: imgUrl, alt: "\u751F\u6210\u7ED3\u679C" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "card-title", children: "\u5FEB\u901F\u751F\u6210\uFF08\u4ECE\u89D2\u8272/\u573A\u666F\uFF09" }),
    /* @__PURE__ */ jsx("p", { style: { fontSize: 12, color: "var(--ai-text-muted)" }, children: "\u70B9\u51FB\u89D2\u8272\u6216\u573A\u666F\u7684 Prompt \u53EF\u5FEB\u901F\u586B\u5165\u4E0A\u65B9\u751F\u6210\u6846\u3002" })
  ] });
}
function ConsistencyView({ project }) {
  const [report, setReport] = useS("");
  const [running, setRunning] = useS(false);
  const run = async () => {
    setRunning(true);
    setReport("");
    try {
      await api.checkConsistency(project.results, project.knowledge, (d) => {
        if (d.content) setReport((prev) => prev + d.content);
        if (d.error) setReport((prev) => prev + "\n\u9519\u8BEF: " + d.error);
      });
      toast("\u68C0\u67E5\u5B8C\u6210", "ok");
    } catch (e) {
      toast("\u68C0\u67E5\u5931\u8D25", "error");
    }
    setRunning(false);
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx(Button, { type: "primary", loading: running, onClick: run, style: { marginBottom: 12 }, children: "\u{1F50D} \u68C0\u67E5\u4E00\u81F4\u6027" }),
    report ? /* @__PURE__ */ jsx("div", { className: "md-body", dangerouslySetInnerHTML: { __html: renderMd(report) } }) : /* @__PURE__ */ jsx(Empty, { tip: "\u70B9\u51FB\u4E0A\u65B9\u6309\u94AE\u68C0\u67E5\u5404\u6A21\u5757\u95F4\u4E00\u81F4\u6027" })
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
  const [cfg, setCfg] = useS(null);
  const refreshProjects = useCB(async () => {
    const r = await api.listProjects();
    setProjects(r.items || []);
  }, []);
  useE(() => {
    refreshProjects();
    api.styles().then((s) => setStyles(s)).catch(() => {
    });
    api.getConfig().then(setCfg).catch(() => {
    });
  }, []);
  useE(() => {
    window.__loadExample = loadExample;
  });
  const loadProject = async (id) => {
    if (!id) {
      setProject(null);
      return;
    }
    try {
      const p = await api.getProject(id);
      setProject(p);
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
        console.warn("save failed", e);
      }
    }, 600);
  }, [project]);
  const newProject = async () => {
    const name = prompt("\u9879\u76EE\u540D\u79F0", "\u672A\u547D\u540D\u9879\u76EE");
    if (!name) return;
    const p = await api.createProject(name, "cinematic");
    await refreshProjects();
    loadProject(p.id);
  };
  const deleteProject = async (id) => {
    if (!confirm("\u786E\u8BA4\u5220\u9664\uFF1F")) return;
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
  return /* @__PURE__ */ jsxs("div", { className: "app-layout", children: [
    /* @__PURE__ */ jsxs("header", { className: "app-header", children: [
      /* @__PURE__ */ jsx("div", { className: "header-left", children: /* @__PURE__ */ jsxs("div", { className: "logo", children: [
        /* @__PURE__ */ jsx("span", { className: "logo-icon", children: "\u{1F3AC}" }),
        /* @__PURE__ */ jsx("span", { className: "logo-text", children: "\u77ED\u5267\u811A\u672C\u5DE5\u574A" }),
        /* @__PURE__ */ jsx("span", { className: "logo-badge", children: "v3.0" })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "header-right", children: [
        /* @__PURE__ */ jsxs("div", { className: "model-info", onClick: () => setSettingsOpen(true), children: [
          /* @__PURE__ */ jsx("span", { className: `model-dot ${hasProvider ? "" : "off"}` }),
          /* @__PURE__ */ jsx("span", { children: hasProvider ? cfg.providers.find((p) => p.id === cfg.activeProvider)?.name || "\u5DF2\u914D\u7F6E" : "\u672A\u914D\u7F6E" }),
          /* @__PURE__ */ jsx("span", { children: "\u2699\uFE0F" })
        ] }),
        /* @__PURE__ */ jsx(Button, { size: "small", onClick: () => setSettingsOpen(true), children: "\u8BBE\u7F6E" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "app-body", children: [
      /* @__PURE__ */ jsx(Sidebar, { projects, currentId, onSelect: loadProject, onNew: newProject, onDelete: deleteProject, onImport: importProject }),
      project ? /* @__PURE__ */ jsxs("div", { className: "main-area", children: [
        /* @__PURE__ */ jsx(
          InputPanel,
          {
            project,
            onUpdate: updateProject,
            styles,
            generating: false,
            onAnalyzeAll: (mods) => window.__analyzeAll?.(mods)
          }
        ),
        /* @__PURE__ */ jsx(ResultPanel, { project, onUpdate: updateProject, styles })
      ] }) : /* @__PURE__ */ jsx("div", { className: "main-area", style: { alignItems: "center", justifyContent: "center", color: "var(--ai-text-muted)" }, children: /* @__PURE__ */ jsxs("div", { style: { textAlign: "center" }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: 48, marginBottom: 12 }, children: "\u{1F3AC}" }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: 18, fontWeight: 700, color: "var(--ai-text)", marginBottom: 8 }, children: "\u77ED\u5267\u811A\u672C\u5DE5\u574A" }),
        /* @__PURE__ */ jsx("div", { style: { marginBottom: 16 }, children: "\u5C0F\u8BF4 / \u6545\u4E8B / \u5267\u672C \u2192 AI \u89C6\u9891\u5206\u955C\u811A\u672C\u4E0E\u8BBE\u5B9A" }),
        /* @__PURE__ */ jsx(Button, { type: "primary", onClick: newProject, children: "+ \u65B0\u5EFA\u9879\u76EE" }),
        /* @__PURE__ */ jsx("span", { style: { margin: "0 8px" } }),
        /* @__PURE__ */ jsx(Button, { onClick: loadExample, children: "\u52A0\u8F7D\u793A\u4F8B" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(SettingsModal, { open: settingsOpen, onClose: () => {
      setSettingsOpen(false);
      api.getConfig().then(setCfg);
    } })
  ] });
}
var root = createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ jsx(App, {}));
