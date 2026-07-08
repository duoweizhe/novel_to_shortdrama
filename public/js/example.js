// example.js — 内置示例项目数据（悬疑推理《最后一班电梯》）
// 按当前项目结构完善：章节管理 + 知识库跨章 + 角色4视图单图 + 全模块结果

export const EXAMPLE_PROJECT = {
  name: '最后一班电梯（示例）',
  style: 'cinematic',
  content: `凌晨一点，林夏把最后一页调查笔记塞进挎包。办公楼的灯已经熄了大半，只剩走廊尽头的安全出口指示灯泛着惨绿。她走进电梯，按下1层。

电梯门缓缓合上，轿厢里只有头顶那盏日光灯发出微弱的电流声。林夏低头看手机，屏幕上是她今晚要发的稿子——《十四楼失踪者》。

叮。电梯在14楼停了下来。
门开了。走廊漆黑一片，没有人。
林夏皱眉，连按关门键。门合上，电梯却没有上行，反而一路下沉。楼层显示：13、10、7、4、负1。

负1层。门开。走廊的灯管惨白，墙上有一道新鲜的划痕——和她稿子里描述的那道一模一样。

对讲机突然响了。是夜班保安老周，声音发紧："林记者，你别回头。"

林夏僵在原地。她看见电梯镜面里，自己身后站着一个穿灰色风衣的人影。可她明明是一个人进的电梯。
人影缓缓抬起手，指向她挎包里的笔记。

灯，灭了。`,
  chapters: [
    {
      id: 'ch_ex_1', title: '第一章 14楼的停顿', group: '第一卷 深夜归途', order: 0,
      content: `凌晨一点，林夏把最后一页调查笔记塞进挎包。办公楼的灯已经熄了大半，只剩走廊尽头的安全出口指示灯泛着惨绿。她走进电梯，按下1层。

电梯门缓缓合上，轿厢里只有头顶那盏日光灯发出微弱的电流声。林夏低头看手机，屏幕上是她今晚要发的稿子——《十四楼失踪者》。

叮。电梯在14楼停了下来。
门开了。走廊漆黑一片，没有人。
林夏皱眉，连按关门键。门合上，电梯却没有上行，反而一路下沉。楼层显示：13、10、7、4、负1。`,
      analysis: {}, createdAt: '2026-07-08T16:00:00.000Z',
    },
    {
      id: 'ch_ex_2', title: '第二章 负1层的镜中人影', group: '第一卷 深夜归途', order: 1,
      content: `负1层。门开。走廊的灯管惨白，墙上有一道新鲜的划痕——和她稿子里描述的那道一模一样。

对讲机突然响了。是夜班保安老周，声音发紧："林记者，你别回头。"

林夏僵在原地。她看见电梯镜面里，自己身后站着一个穿灰色风衣的人影。可她明明是一个人进的电梯。
人影缓缓抬起手，指向她挎包里的笔记。

灯，灭了。`,
      analysis: {}, createdAt: '2026-07-08T16:00:00.000Z',
    },
  ],
  knowledge: {
    characters: [
      { id: 'c1', name: '林夏', aliases: ['林记者'], description: '调查记者，28岁，正在追查十四楼失踪案', traits: '冷静、执着、敏锐，遇险时压抑恐惧', appearance: '齐肩短发，冷白肤色，清瘦五官', sourceChapter: '第一章 14楼的停顿' },
      { id: 'c2', name: '老周', aliases: [], description: '夜班保安，52岁，见过怪事', traits: '谨小慎微，对夜班规矩近乎迷信', appearance: '花白寸头，方脸胡茬', sourceChapter: '第二章 负1层的镜中人影' },
      { id: 'c3', name: '人影', aliases: [], description: '出现在电梯镜面中的神秘人影', traits: '沉默、诡谲，意图不明', appearance: '身形修长，面容隐于阴影', sourceChapter: '第二章 负1层的镜中人影' },
    ],
    scenes: [
      { id: 's1', name: '办公楼夜景', type: '室外', description: '深夜城市中独栋办公楼，玻璃幕墙反射街灯', mood: '孤寂压抑', sourceChapter: '第一章 14楼的停顿' },
      { id: 's2', name: '电梯轿厢', type: '室内', description: '狭窄不锈钢电梯轿厢，镜面四壁，按键面板发冷光', mood: '幽闭不安', sourceChapter: '第一章 14楼的停顿' },
      { id: 's3', name: '负1层走廊', type: '室内', description: '地下负1层水泥走廊，墙面粉刷斑驳，灯管惨白', mood: '诡异寒意', sourceChapter: '第二章 负1层的镜中人影' },
    ],
    props: [
      { id: 'p1', name: '调查笔记', description: '林夏挎包中的稿子《十四楼失踪者》', significance: '人影指向的核心道具，推动剧情', sourceChapter: '第一章 14楼的停顿' },
      { id: 'p2', name: '对讲机', description: '老周与林夏联络的工具', significance: '制造紧张感的关键道具', sourceChapter: '第二章 负1层的镜中人影' },
      { id: 'p3', name: '墙面划痕', description: '负1层走廊墙上的新鲜划痕，与林夏稿子描述一致', significance: '暗示超自然与稿子的关联', sourceChapter: '第二章 负1层的镜中人影' },
    ],
    timeline: [
      { chapter: '第一章 14楼的停顿', event: '林夏深夜加班后乘电梯下楼', time: '凌晨1点' },
      { chapter: '第一章 14楼的停顿', event: '电梯异常停在14楼，门外漆黑无人', time: '凌晨1点后' },
      { chapter: '第一章 14楼的停顿', event: '电梯反向下坠至负1层', time: '凌晨1点后' },
      { chapter: '第二章 负1层的镜中人影', event: '负1层走廊发现与稿子一致的划痕', time: '凌晨1点后' },
      { chapter: '第二章 负1层的镜中人影', event: '老周对讲机警告林夏别回头', time: '凌晨1点后' },
      { chapter: '第二章 负1层的镜中人影', event: '镜中出现神秘人影指向笔记，灯光熄灭', time: '凌晨1点后' },
    ],
  },
  results: {
    structure: `## 📐 剧情结构分析

### 1. 核心冲突
- **一句话故事引擎**：一个追查失踪案的女记者，为了发出真相稿件，必须独自穿过深夜办公楼的电梯，否则将成为下一个失踪者。
- **核心冲突类型**：人 vs 命运（未知超自然力量）
- **主题/母题**：真相的代价；凝视深渊者被深渊凝视

### 2. 三幕结构

#### 第一幕：建置（约25%）
- **起始状态**：林夏深夜加班，完成《十四楼失踪者》调查稿，准备离开办公楼
- **激励事件**：电梯在14楼（失踪案发生楼层）无故停下，门外漆黑无人
- **第一转折点**：电梯不受控制反向坠落至负1层

#### 第二幕：对抗（约50%）
- **上升行动**：负1层走廊出现与稿子描述一致的划痕，暗示超自然关联
- **中点**：老周对讲机警告"别回头"，外部介入确认危险真实存在
- **暗夜时刻**：镜中出现身后人影，指向挎包笔记——林夏意识到自己被锁定

#### 第三幕：解决（约25%）
- **高潮**：人影抬手指向笔记，灯光骤灭——开放式悬念
- **结局**：未给出，留白制造恐惧余韵

### 3. 五个关键转折点
| 转折点 | 位置 | 事件 | 功能 |
|--------|------|------|------|
| 激励事件 | ~15% | 电梯14楼异常停下 | 打破平衡 |
| 第一转折 | ~30% | 电梯反向坠落负1层 | 进入冲突 |
| 中点 | ~50% | 负1层划痕与稿子一致 | 方向转变 |
| 第二转折 | ~75% | 镜中人影出现 | 跌入谷底 |
| 高潮 | ~95% | 灯灭 | 最终冲击 |

### 4. 情感曲线
起始: 2分 → 激励事件: 4分 → 上升: 6分 → 中点: 7分 → 暗夜: 9分 → 高潮: 10分

### 5. 短剧改编骨架
- **建议集数**：1集（60秒竖屏/横屏短片）
- **每集结尾钩子**：灯灭黑屏 + 老周对讲机残余电流声
- **改编优先级**：保留全部，无需删减（原文已极简）`,

    summary: `## 📊 制作分析报告

### 1. 内容评估
- **故事类型**：悬疑/惊悚微短剧
- **核心卖点**：密闭空间（电梯）+ 镜面恐怖 + 开放式结局，一镜到底的压迫感
- **目标平台**：抖音/快手/B站（竖屏优先，横屏亦可）
- **建议集数**：1集
- **每集时长**：60秒

### 2. 改编策略
- **必须保留**：14楼停顿、楼层下坠、负1层划痕、对讲机警告、镜中人影、灯灭
- **可删减**：无（原文已极简）
- **建议原创补充**：开篇可加5秒办公楼外景空镜建立氛围

### 3. 断集建议
- 单集结构：外景建立(5s) → 进电梯(4s) → 14楼停顿(8s) → 下坠(6s) → 负1层划痕(5s) → 对讲机(3s) → 镜中人影(6s) → 灯灭黑屏(3s) + 余韵(20s留给音效)
- 结尾钩子：灯灭 + 老周电流声"林...记..."

### 4. 角色分析
- 3个角色，林夏为主视角，老周仅声音出场，人影为视觉恐怖元素
- 选角：林夏需清瘦冷感气质，人影需高挑身形

### 5. 场景分析
- 3个场景，电梯轿厢为核心（占80%时长），其余为外景/走廊空镜
- 拍摄难度：电梯实景或搭景，镜面反射需特殊机位

### 6. 制作建议
- 拍摄手法：建议固定机位+手持微抖，镜面用半透镜技巧
- 特效需求：楼层显示屏数字下坠、灯光闪烁
- 预算级别：低（单场景为主）
- 制作周期：1-2天拍摄 + 1天后期

### 7. 风险提示
- 审查：无暴力色情，悬疑恐怖尺度适中
- 观众反馈：开放式结局可能两极分化，建议系列化后续集数`,

    characters: {
      characters: [
        { name: '林夏', role: '主角', gender: '女', age: '28', appearance: '齐肩短发，五官清瘦，眼下有疲态，肤色偏冷白', personality: '冷静、执着、有调查记者的敏锐，遇险时压抑恐惧', costume: '黑色高领毛衣，深灰风衣，挎帆布挎包，颈挂工牌', arc: '从自信调查者→被未知力量凝视的猎物', imagePromptZh: '角色设定图，2x2四宫格白色背景，左上：28岁女性面部上半身特写齐肩黑发冷白肤色清瘦五官眼下疲态黑色高领毛衣领口冷调电影光影；右上：正面全身照黑色高领毛衣深灰风衣帆布挎包工牌站姿挺拔；左下：侧面全身照侧脸齐肩发深灰风衣侧身轮廓帆布挎包；右下：背面全身照齐肩发背影深灰风衣背面工牌挂绳。同一角色同一服装一致设计', imagePromptEn: 'character turnaround reference sheet, 2x2 grid on white background, top-left upper-body face close-up of 28yo female shoulder-length black hair pale cold skin lean features tired under-eyes black turtleneck collar cinematic cold-toned lighting; top-right front full-body view black turtleneck dark grey trench coat canvas bag ID lanyard upright stance; bottom-left side profile full-body view side face shoulder-length hair trench coat side silhouette canvas bag; bottom-right back full-body view shoulder-length hair from behind trench coat back ID lanyard, same character same costume consistent design' },
        { name: '老周', role: '配角', gender: '男', age: '52', appearance: '花白寸头，方脸，眉骨高，下颌胡茬', personality: '谨小慎微，见过怪事，对夜班规矩近乎迷信', costume: '深蓝保安制服，胸前别对讲机，腰间挂手电筒', arc: '旁观者→试图警告却无能为力', imagePromptZh: '角色设定图，2x2四宫格白色背景，左上：52岁男性面部特写花白寸头方脸胡茬眉骨高紧张神情深蓝制服领口；右上：正面全身照深蓝保安制服对讲机手电筒拘谨站姿；左下：侧面全身照花白寸头侧脸深蓝制服侧身胡茬轮廓；右下：背面全身照花白寸头背影深蓝制服背面腰间手电。同一角色同一服装一致设计', imagePromptEn: 'character turnaround reference sheet, 2x2 grid on white background, top-left face close-up of 52yo male grey buzz cut square jaw stubble prominent brow tense expression dark blue uniform collar; top-right front full-body view dark blue security uniform walkie-talkie flashlight restrained stance; bottom-left side profile full-body view grey buzz cut side face dark blue uniform side body stubble silhouette; bottom-right back full-body view grey buzz cut from behind dark blue uniform back waist flashlight, same character same costume consistent design' },
        { name: '人影', role: '反派/谜团', gender: '未知', age: '不明', appearance: '身形修长，面容隐于阴影，轮廓模糊', personality: '沉默、诡谲，意图不明', costume: '灰色风衣，立领遮住下半张脸，双手苍白', arc: '神秘存在，指向笔记后灯灭', imagePromptZh: '角色设定图，2x2四宫格白色背景，左上：神秘人影面部特写立领风衣遮住下半脸上半脸隐于阴影只见轮廓苍白双手；右上：正面全身照灰色立领风衣面容隐于阴影身形修长双手苍白；左下：侧面全身照灰色风衣侧身轮廓立领遮面修长身形；右下：背面全身照灰色风衣背影立领修长轮廓。同一角色同一服装一致设计悬疑氛围', imagePromptEn: 'character turnaround reference sheet, 2x2 grid on white background, top-left face close-up of mysterious silhouette high-collar trench coat covering lower face upper face hidden in shadow only outline visible pale hands; top-right front full-body view grey high-collar trench coat face hidden in shadow tall slender build pale hands; bottom-left side profile full-body view grey trench coat side silhouette high collar covering face slender build; bottom-right back full-body view grey trench coat from behind high collar slender outline, same character same costume consistent design eerie thriller atmosphere' },
      ],
    },
    scenes: {
      scenes: [
        { name: '办公楼夜景', environment: '深夜城市中独栋办公楼外景，玻璃幕墙反射街灯', mood: '孤寂、压抑、潜伏危机', lighting: '冷蓝月光与暖黄街灯混合，仅顶层一扇窗亮灯', timeOfDay: '深夜', narrativeFunction: '建置', keyProps: '无', imagePromptZh: '深夜城市中一栋办公楼外景，玻璃幕墙，冷蓝月光与暖黄街灯，仅顶层一扇窗亮着灯光，街面空无一人，压抑孤寂，电影感广角，16:9', imagePromptEn: 'wide shot of a lone office tower at night, glass curtain wall, cold blue moonlight mixed with warm street lamps, only one top-floor window lit, empty street, oppressive lonely mood, cinematic wide-angle, 16:9' },
        { name: '电梯轿厢', environment: '狭窄不锈钢电梯轿厢，镜面四壁，按键面板发冷光', mood: '幽闭、不安、孤立无援', lighting: '顶部惨白日光灯，冷调，金属反射', timeOfDay: '深夜', narrativeFunction: '激励/上升', keyProps: '按键面板、镜面', imagePromptZh: '狭窄不锈钢电梯轿厢内景，镜面四壁，按键面板泛冷光，顶部惨白日光灯，金属反射，幽闭不安氛围，电影感，16:9', imagePromptEn: 'interior of narrow stainless-steel elevator car, mirrored walls, cold-glowing button panel, harsh white ceiling fluorescent, metallic reflections, claustrophobic uneasy mood, cinematic, 16:9' },
        { name: '负1层走廊', environment: '地下负1层水泥走廊，墙面粉刷斑驳，灯管惨白', mood: '诡异、寒意、危险逼近', lighting: '冷白日光灯管，部分闪烁，地面反光', timeOfDay: '深夜', narrativeFunction: '至暗时刻', keyProps: '墙面划痕', imagePromptZh: '地下负1层水泥走廊，斑驳墙面，惨白日光灯管部分闪烁，地面反光，尽头隐入黑暗，诡异寒意，电影感纵深构图，16:9', imagePromptEn: 'underground B1 concrete corridor, peeling walls, pale flickering fluorescent tubes, glossy reflective floor, vanishing into darkness at the end, eerie chilling mood, cinematic depth composition, 16:9' },
      ],
    },
    storyboard: {
      shots: [
        { episode: 1, sceneNo: 1, shotNo: 1, shotType: '远景', cameraAngle: '平视', cameraMove: '推', visual: '深夜城市中独栋办公楼外景，玻璃幕墙反射街灯，仅顶层一扇窗亮着灯光', dialogue: '', action: '镜头缓慢推近办公楼', duration: 5, emotion: 3, characterNames: [], sceneName: '办公楼夜景', promptZh: '远景，深夜城市中独栋办公楼外景，玻璃幕墙反射冷蓝月光与暖黄街灯，仅顶层一扇窗亮灯，街面空旷，镜头缓慢推近，电影感冷调悬疑，16:9', promptEn: 'Wide shot, lone office tower at night, glass curtain wall reflecting cold blue moonlight and warm street lamps, single lit top-floor window, empty street, slow dolly-in, cinematic cold thriller tone, 16:9' },
        { episode: 1, sceneNo: 2, shotNo: 1, shotType: '中景', cameraAngle: '平视', cameraMove: '固定', visual: '林夏走进电梯轿厢，转身按下1层按键', dialogue: '', action: '林夏走进电梯转身按键，门缓缓合上', duration: 4, emotion: 2, characterNames: ['林夏'], sceneName: '电梯轿厢', promptZh: '中景，齐肩短发女记者穿黑色高领毛衣与深灰风衣走进不锈钢电梯，转身按1层按键，门缓缓合上，惨白顶灯，镜面反射，冷调电影感，16:9', promptEn: 'Medium shot, shoulder-length-haired female journalist in black turtleneck and dark grey trench coat enters stainless-steel elevator, turns and presses floor-1 button, doors slowly close, harsh white ceiling light, mirror reflections, cold cinematic tone, 16:9' },
        { episode: 1, sceneNo: 2, shotNo: 2, shotType: '特写', cameraAngle: '平视', cameraMove: '固定', visual: '电梯按键面板，1层按键亮起冷光', dialogue: '', action: '固定镜头，按键数字1亮起', duration: 2, emotion: 2, characterNames: [], sceneName: '电梯轿厢', promptZh: '特写，电梯不锈钢按键面板，数字1按键亮起冷白光，金属反光，景深虚化，冷调悬疑，16:9', promptEn: 'Close-up, stainless-steel elevator button panel, number 1 button glowing cold white, metallic reflection, shallow depth of field, cold thriller tone, 16:9' },
        { episode: 1, sceneNo: 2, shotNo: 3, shotType: '中景', cameraAngle: '平视', cameraMove: '固定', visual: '电梯在14楼停下，门缓缓打开，门外走廊漆黑无人', dialogue: '', action: '门开，林夏抬头望向门外黑暗', duration: 5, emotion: 5, characterNames: ['林夏'], sceneName: '电梯轿厢', promptZh: '中景，不锈钢电梯在14楼停下门缓缓打开，门外走廊漆黑无人，短发女记者抬头望向黑暗，惨白顶灯，镜面反射，紧张氛围，电影感，16:9', promptEn: 'Medium shot, stainless-steel elevator stops at floor 14, doors slowly open to pitch-black empty corridor, short-haired female journalist looks up into darkness, harsh white ceiling light, mirror reflections, tense mood, cinematic, 16:9' },
        { episode: 1, sceneNo: 2, shotNo: 4, shotType: '近景', cameraAngle: '平视', cameraMove: '固定', visual: '林夏皱眉，连续按下关门键', dialogue: '', action: '手指反复按关门键，神情焦虑', duration: 3, emotion: 6, characterNames: ['林夏'], sceneName: '电梯轿厢', promptZh: '近景，齐肩短发女记者皱眉，手指反复按下关门键，神情焦虑压抑，惨白顶灯，冷调，电影感，16:9', promptEn: 'Close shot, shoulder-length-haired female journalist frowns, finger repeatedly pressing close-door button, anxious restrained expression, harsh white light, cold tone, cinematic, 16:9' },
        { episode: 1, sceneNo: 2, shotNo: 5, shotType: '特写', cameraAngle: '平视', cameraMove: '手持', visual: '楼层显示屏数字快速下降：13、10、7、4、负1', dialogue: '', action: '数字跳动下行，画面微微震动', duration: 3, emotion: 7, characterNames: [], sceneName: '电梯轿厢', promptZh: '特写，电梯楼层显示屏数字快速下降13到负1，红色数字跳动，画面微震，冷调悬疑，16:9', promptEn: 'Close-up, elevator floor display numbers rapidly descending 13 to B1, red digits flickering, slight camera shake, cold thriller tone, 16:9' },
        { episode: 1, sceneNo: 3, shotNo: 1, shotType: '中景', cameraAngle: '平视', cameraMove: '移', visual: '负1层走廊门开，惨白灯管下墙面有一道新鲜划痕', dialogue: '', action: '镜头从电梯内望向走廊，灯光闪烁', duration: 5, emotion: 8, characterNames: [], sceneName: '负1层走廊', promptZh: '中景，负1层走廊门开，惨白日光灯管部分闪烁，斑驳墙面上一道新鲜划痕，地面反光，尽头黑暗，诡异寒意，纵深构图，电影感，16:9', promptEn: 'Medium shot, B1 corridor door opens, pale flickering fluorescent tubes, fresh scratch on peeling wall, glossy reflective floor, darkness at the end, eerie chilling mood, depth composition, cinematic, 16:9' },
        { episode: 1, sceneNo: 2, shotNo: 6, shotType: '近景', cameraAngle: '平视', cameraMove: '推', visual: '电梯镜面里，林夏身后站着一个穿灰色风衣的人影，人影抬手指向挎包', dialogue: '老周(对讲机): 林记者，你别回头。', action: '林夏僵住，人影缓缓抬手', duration: 6, emotion: 10, characterNames: ['林夏', '人影'], sceneName: '电梯轿厢', promptZh: '近景，电梯镜面反射中，短发女记者身后站着一个穿灰色立领风衣的人影，面容隐于阴影，人影缓缓抬手指向挎包，惨白顶灯骤灭前一刻，惊悚悬疑，电影感，16:9', promptEn: 'Close shot, elevator mirror reflection, short-haired female journalist with a grey high-collar trench-coat silhouette standing behind her, face hidden in shadow, silhouette slowly raising hand pointing at her shoulder bag, moment before white light cuts out, horror thriller mood, cinematic, 16:9' },
      ],
    },
    script: `## 📝 短剧脚本

### 基本信息
- **剧名**：最后一班电梯
- **集数**：1集
- **每集时长**：60秒
- **类型/风格**：悬疑/惊悚，电影感冷调
- **目标受众**：18-35岁悬疑爱好者

### 剧情大纲
调查记者林夏深夜加班后独自乘电梯下楼，电梯在失踪案发生的14楼异常停下，随后反向坠至负1层。负1层走廊的划痕与她正在调查的稿子描述一致，对讲机传来保安老周的警告，镜中出现神秘人影指向她的笔记——灯灭。

### 第1集：最后一班电梯

#### 场景1：办公楼外景 - 深夜 - 室外
（远景，冷蓝月光下独栋办公楼，仅顶层一扇窗亮灯，街面空无一人。镜头缓慢推近。）

#### 场景2：电梯轿厢 - 深夜 - 室内
（林夏走进不锈钢电梯，转身按1层。门合上，惨白日光灯嗡鸣。）

**林夏**：（低头看手机，疲惫但专注，手指滑动屏幕上的稿子《十四楼失踪者》）

（叮。14楼。门开，走廊漆黑无人。林夏皱眉连按关门键。门合上，电梯反向坠落。楼层：13、10、7、4、负1。）

**林夏**：（呼吸急促，手紧握挎包带，眼神从困惑转为警觉）
> 潜台词：稿子里写的那些……是真的？

#### 场景3：负1层走廊 - 深夜 - 室内
（门开。惨白灯管闪烁，墙面一道新鲜划痕。）

#### 场景4：电梯轿厢 - 深夜 - 室内
**老周**：（对讲机电流声，声音发紧）"林记者，你别回头。"
> 潜台词：我看到监控了，你身后有东西

（林夏僵住。镜面中，身后站着一个穿灰色风衣的人影，面容隐于阴影。人影缓缓抬手，指向挎包里的笔记。）

（灯，灭了。黑屏。对讲机残余电流声：林……记……）

### 本集要点
- **核心冲突**：真相调查者 vs 未知超自然力量
- **情感高潮**：镜中人影抬手指向笔记（10分）
- **结尾钩子**：灯灭黑屏 + 老周电流声残留——开放式悬念

### 表演指导
- **林夏**：全程压抑情绪，恐惧通过微表情（皱眉、呼吸、手指动作）传达，避免夸张尖叫
- **节奏**：前40秒缓慢建立不安，后20秒急转直下到高潮`,
    assets: `## 🎨 视觉资产设计

### 0. 全局视觉风格
- **整体风格**：电影感冷调悬疑，参考《咒怨》《午夜凶铃》的密闭空间恐怖
- **色调体系**：主色冷蓝(#1a2a3e)/惨白(#f0f0e8)，辅色暖黄(#d4a843)街灯点缀，点缀血红(#8b0000)危险暗示
- **通用风格后缀**：cinematic lighting, 8k, cold tone, film grain, shallow depth of field
- **通用负面后缀**：cartoon, anime, warm colors, bright daylight

### 1. 角色立绘 Prompt
参见角色设定卡，每个角色含单张4视图设定图（面部/正面/侧面/背面）。

### 2. 关键场景图 Prompt
- **办公楼夜景**：wide shot lone office tower night, glass curtain wall, cold blue moonlight, single lit window, empty street, cinematic, 8k
- **电梯轿厢**：narrow stainless steel elevator interior, mirrored walls, cold fluorescent light, metallic reflections, claustrophobic, cinematic, 8k
- **负1层走廊**：underground B1 concrete corridor, flickering fluorescent, peeling wall with scratch, glossy floor, darkness at end, eerie, cinematic, 8k

### 3. 道具 Prompt
- **调查笔记**：worn leather notebook, handwritten pages, journalist notes, dim cold light, close-up, cinematic, 8k
- **对讲机**：old walkie-talkie, crackling static, dim green LED, security equipment, close-up, cinematic, 8k

### 4. 封面/海报
- **主视觉**：elevator mirror reflection, female journalist silhouette, mysterious grey figure behind, cold horror atmosphere, vertical poster, cinematic, 8k
- **剧名排版**：白色无衬线粗体，居中偏下，带轻微故障(glitch)效果

### 5. 风格参考
- 参考《咒怨》的密闭空间镜面恐怖
- 参考《信条》的冷调反转质感
- 参考画师 Zdzisław Beksiński 的压抑氛围光影`,
  },
  mediaItems: [],
  snapshots: [],
  createdAt: '2026-07-08T16:00:00.000Z',
  updatedAt: '2026-07-08T16:00:00.000Z',
};
