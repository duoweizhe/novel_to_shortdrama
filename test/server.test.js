const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

process.env.NODE_ENV = 'test';
const {
  normalizeProject, assertExpectedRevision, findProjectEntity, attachAsset, buildSrt,
  buildDeliveryZip, buildShotContinuityContext, normalizeConsistencyResult, contentHash, preprocessMatches,
  validateTextInput, isApiRequestAuthorized, createConcurrencyLimiter,
  validateProviderBaseUrl, sanitizeProviderInput,
} = require('../server');

test('validateTextInput enforces character and chunk limits with 413 errors', () => {
  assert.deepEqual(validateTextInput('short text', { maxCharacters: 20, maxChunks: 2, chunkSize: 10 }), { characterCount: 10, chunkCount: 1 });
  assert.throws(() => validateTextInput('123456', { maxCharacters: 5 }), error => error.status === 413);
  assert.throws(() => validateTextInput('a'.repeat(21), { maxCharacters: 100, maxChunks: 2, chunkSize: 10 }), error => error.status === 413);
});

test('isApiRequestAuthorized supports optional bearer and app tokens', () => {
  assert.equal(isApiRequestAuthorized({ headers: {} }, ''), true);
  assert.equal(isApiRequestAuthorized({ headers: { authorization: 'Bearer secret' } }, 'secret'), true);
  assert.equal(isApiRequestAuthorized({ headers: { 'x-app-token': 'secret' } }, 'secret'), true);
  assert.equal(isApiRequestAuthorized({ headers: { authorization: 'Bearer wrong' } }, 'secret'), false);
});

test('createConcurrencyLimiter rejects overflow and releases completed requests', () => {
  const limiter = createConcurrencyLimiter(1);
  const firstResponse = new EventEmitter();
  const secondResponse = Object.assign(new EventEmitter(), {
    statusCode: 0,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  });
  let admitted = 0;
  limiter({}, firstResponse, () => admitted++);
  limiter({}, secondResponse, () => admitted++);
  assert.equal(admitted, 1);
  assert.equal(secondResponse.statusCode, 429);
  firstResponse.emit('finish');
  limiter({}, new EventEmitter(), () => admitted++);
  assert.equal(admitted, 2);
});

test('validateProviderBaseUrl enforces protocols, environments, and host allowlist', () => {
  assert.equal(validateProviderBaseUrl('https://api.example.com/v1', { nodeEnv: 'production' }).hostname, 'api.example.com');
  assert.equal(validateProviderBaseUrl('http://localhost:1234/v1', { nodeEnv: 'development' }).hostname, 'localhost');
  assert.throws(() => validateProviderBaseUrl('ftp://api.example.com', { nodeEnv: 'development' }), error => error.status === 400);
  assert.throws(() => validateProviderBaseUrl('http://api.example.com', { nodeEnv: 'development' }), error => error.status === 400);
  assert.throws(() => validateProviderBaseUrl('https://127.0.0.1', { nodeEnv: 'production' }), error => error.status === 400);
  assert.throws(() => validateProviderBaseUrl('https://other.example.com', { nodeEnv: 'production', allowedHosts: 'api.example.com' }), error => error.status === 400);
});

test('sanitizeProviderInput allowlists fields and protects retained keys on URL changes', () => {
  const existing = { id: 'custom', type: 'llm', name: 'Old', baseUrl: 'https://api.example.com/v1', apiKey: 'stored-key' };
  const retained = sanitizeProviderInput({ ...existing, name: 'New', apiKey: 'sk-****', unexpected: true }, existing);
  assert.equal(retained.apiKey, 'stored-key');
  assert.equal(retained.unexpected, undefined);
  assert.throws(() => sanitizeProviderInput({ ...existing, baseUrl: 'https://other.example.com/v1', apiKey: 'sk-****' }, existing), error => error.status === 400);
  const created = sanitizeProviderInput({ id: 'new', type: 'llm', name: 'New', baseUrl: 'https://api.example.com/v1', apiKey: 'real-key' });
  assert.equal(created.apiKey, 'real-key');
});

test('normalizeProject assigns stable IDs and resolves legacy names', () => {
  const project = {
    results: {
      characters: { characters: [{ name: '林夏', aliases: ['小夏'] }] },
      scenes: { scenes: [{ name: '天台' }] },
      storyboard: { shots: [{ characterNames: ['小夏'], sceneName: '天台' }] },
      manga: { pages: [{ panels: [{ characterNames: ['林夏'], sceneName: '天台' }] }] },
    },
  };

  normalizeProject(project);
  const ids = {
    character: project.results.characters.characters[0].id,
    scene: project.results.scenes.scenes[0].id,
    shot: project.results.storyboard.shots[0].id,
    panel: project.results.manga.pages[0].panels[0].id,
  };
  normalizeProject(project);

  assert.deepEqual({
    character: project.results.characters.characters[0].id,
    scene: project.results.scenes.scenes[0].id,
    shot: project.results.storyboard.shots[0].id,
    panel: project.results.manga.pages[0].panels[0].id,
  }, ids);
  assert.deepEqual(project.results.storyboard.shots[0].characterIds, [ids.character]);
  assert.equal(project.results.storyboard.shots[0].sceneId, ids.scene);
  assert.deepEqual(project.assets, []);
  assert.deepEqual(project.jobs, []);
  assert.equal(project.revision, 0);
  assert.equal(project.sourceRevision, 0);
});

test('assertExpectedRevision rejects stale revisions', () => {
  assert.doesNotThrow(() => assertExpectedRevision(4, 4));
  assert.throws(() => assertExpectedRevision(3, 4), error => error.status === 409 && error.message === '项目版本冲突');
});

test('findProjectEntity resolves every supported job target', () => {
  const project = normalizeProject({
    id: 'project-1',
    results: {
      characters: { characters: [{ id: 'character-1' }] },
      scenes: { scenes: [{ id: 'scene-1' }] },
      storyboard: { shots: [{ id: 'shot-1' }] },
      manga: { pages: [{ panels: [{ id: 'panel-1' }] }] },
    },
  });

  for (const [type, id] of [['project', 'project-1'], ['character', 'character-1'], ['scene', 'scene-1'], ['shot', 'shot-1'], ['panel', 'panel-1']]) {
    assert.ok(findProjectEntity(project, type, id), `${type} target should resolve`);
  }
});

test('attachAsset binds completed job asset and compatible entity fields', () => {
  const project = normalizeProject({
    id: 'project-1',
    results: { storyboard: { shots: [{ id: 'shot-1' }] } },
  });
  const job = { id: 'job-1', entityType: 'shot', entityId: 'shot-1', kind: 'video', sourceRevision: 2 };

  const asset = attachAsset(project, job, { url: 'https://example.com/video.mp4' });

  assert.equal(job.assetId, asset.id);
  assert.equal(job.url, asset.url);
  assert.equal(project.assets[0].id, asset.id);
  assert.equal(project.results.storyboard.shots[0].assetId, asset.id);
  assert.equal(project.results.storyboard.shots[0].videoAssetId, asset.id);
  assert.equal(project.results.storyboard.shots[0].videoUrl, asset.url);
  assert.equal(attachAsset(project, job, { url: asset.url }).id, asset.id);
  assert.equal(project.assets.length, 1);
});

test('buildSrt resets each episode timeline and keeps silent shot duration', () => {
  const shots = [
    { episode: 1, duration: 2, subtitle: '' },
    { episode: 1, duration: 3, dialogue: '第一句' },
    { episode: 2, duration: 1.5, subtitle: '第二集' },
  ];

  assert.equal(buildSrt(shots, 1), '1\n00:00:02,000 --> 00:00:05,000\n第一句\n\n');
  assert.equal(buildSrt(shots, 2), '1\n00:00:00,000 --> 00:00:01,500\n第二集\n\n');
});

test('buildDeliveryZip writes store entries and central directory', () => {
  const zip = buildDeliveryZip(normalizeProject({
    id: 'project-1', name: 'delivery-test', style: 'cinematic',
    results: { storyboard: { shots: [{ episode: 1, duration: 2, subtitle: 'line' }] } },
    assets: [{ id: 'asset-1', kind: 'image', url: 'https://example.com/image.png' }],
  }));
  assert.equal(zip.subarray(0, 4).toString('hex'), '504b0304');
  for (const entry of ['manifest.json', 'project.json', 'project.md', 'assets-manifest.json', 'subtitles/episode-1.srt']) assert.ok(zip.includes(Buffer.from(entry)));
  assert.ok(zip.includes(Buffer.from([0x50, 0x4b, 0x01, 0x02])));
  assert.equal(zip.subarray(-22, -18).toString('hex'), '504b0506');
});

test('buildShotContinuityContext resolves previous shot by stable id', () => {
  const context = buildShotContinuityContext([
    { id: 'shot-1', continuityNote: 'rain grows', visual: 'door', action: 'looks up', characterState: 'wet coat', sceneState: 'puddles', keyframeUrl: 'https://example.com/1.png' },
    { id: 'shot-2' },
  ], 'shot-2');
  assert.equal(context.previousShotId, 'shot-1');
  assert.match(context.prompt, /rain grows/);
  assert.deepEqual(context.referenceImages, ['https://example.com/1.png']);
});

test('normalizeConsistencyResult supplies schema defaults and blockers', () => {
  const result = normalizeConsistencyResult({ issues: [{ id: 'x', severity: 'error', message: 'conflict' }, { severity: 'invalid' }] });
  assert.equal(result.issues[0].status, 'open');
  assert.equal(result.issues[1].severity, 'warning');
  assert.equal(result.blockingCount, 1);
});

test('preprocessMatches requires matching content hash and scope', () => {
  const preprocess = { contentHash: contentHash('source'), sourceMode: 'chapter', chapterId: 'chapter-1' };
  assert.equal(preprocessMatches(preprocess, 'source', 'chapter', 'chapter-1'), true);
  assert.equal(preprocessMatches(preprocess, 'changed', 'chapter', 'chapter-1'), false);
  assert.equal(preprocessMatches(preprocess, 'source', 'chapters'), false);
});
