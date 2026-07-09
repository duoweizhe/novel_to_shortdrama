// example.js — 内置示例项目数据（悬疑推理《最后一班电梯》）
// 日漫风(anime)示例：角色设定1x4横向排列 + 章节管理 + 知识库跨章 + 全模块结果
// prompt不含风格关键词，视觉风格由后端生成时统一追加

export const EXAMPLE_PROJECT = {
  name: '最后一班电梯（示例）',
  style: 'anime',
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
      { id: 'c1', name: '林夏', aliases: ['林记者'], description: '调查记者，28岁，正在追查十四楼失踪案', traits: '冷静、执着、敏锐，遇险时压抑恐惧', appearance: '齐肩短发，冷白肤色，清瘦五官', voiceStyle: '短句为主，语气克制冷静，紧张时呼吸急促但不尖叫', relationships: '与老周是相识关系（老周称她"林记者"）；与人影存在被追踪的未知关联', sourceChapter: '第一章 14楼的停顿' },
      { id: 'c2', name: '老周', aliases: [], description: '夜班保安，52岁，见过怪事', traits: '谨小慎微，对夜班规矩近乎迷信', appearance: '花白寸头，方脸胡茬', voiceStyle: '声音发紧，说话简短急促，带方言口音，紧张时声音压低', relationships: '与林夏是办公楼相识关系，通过监控看到异常后试图警告', sourceChapter: '第二章 负1层的镜中人影' },
      { id: 'c3', name: '人影', aliases: [], description: '出现在电梯镜面中的神秘人影', traits: '沉默、诡谲，意图不明', appearance: '身形修长，面容隐于阴影', voiceStyle: '全程沉默无声，仅通过肢体动作传达意图', relationships: '与林夏存在未知追踪关系，指向其笔记', sourceChapter: '第二章 负1层的镜中人影' },
    ],
    scenes: [
      { id: 's1', name: '办公楼夜景', type: '室外', description: '深夜城市中独栋办公楼，玻璃幕墙反射街灯', mood: '孤寂压抑', lighting: '冷蓝月光与暖黄街灯混合，仅顶层一扇窗亮灯', sourceChapter: '第一章 14楼的停顿' },
      { id: 's2', name: '电梯轿厢', type: '室内', description: '狭窄不锈钢电梯轿厢，镜面四壁，按键面板发冷光', mood: '幽闭不安', lighting: '顶部惨白日光灯，冷调，金属反射', sourceChapter: '第一章 14楼的停顿' },
      { id: 's3', name: '负1层走廊', type: '室内', description: '地下负1层水泥走廊，墙面粉刷斑驳，灯管惨白', mood: '诡异寒意', lighting: '冷白日光灯管，部分闪烁，地面反光', sourceChapter: '第二章 负1层的镜中人影' },
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

### 1. 核心冲突提炼
- **一句话故事引擎**：一个追查失踪案的女记者，为了发出真相稿件，必须独自穿过深夜办公楼的电梯，否则将成为下一个失踪者
- **核心冲突类型**：人 vs 命运（未知超自然力量）
- **主题/母题**：真相的代价；凝视深渊者被深渊凝视

### 2. 三幕结构划分

#### 第一幕：建置（约占全文 25%）
- **起始状态**：林夏深夜加班，完成《十四楼失踪者》调查稿，准备离开办公楼
- **激励事件**：电梯在14楼（失踪案发生楼层）无故停下，门外漆黑无人
- **第一转折点**：电梯不受控制反向坠落至负1层
- **情节点 I**：林夏被迫面对未知，无法逃离

#### 第二幕：对抗（约占全文 50%）
- **前半段：上升行动**：负1层走廊出现与稿子描述一致的划痕，暗示超自然关联
- **中点**：老周对讲机警告"别回头"，外部介入确认危险真实存在
- **后半段：升级对抗**：危险从环境逼近到人身——镜中出现身后人影
- **第二转折点（暗夜时刻）**：人影指向挎包笔记，林夏意识到自己被锁定

#### 第三幕：解决（约占全文 25%）
- **高潮**：人影抬手指向笔记，灯光骤灭——开放式悬念
- **结局**：未给出，留白制造恐惧余韵
- **尾声**：对讲机残余电流声"林……记……"

### 3. 五个关键转折点
| 转折点 | 位置 | 事件 | 功能 |
|--------|------|------|------|
| 激励事件 | ~15% | 电梯14楼异常停下，门外漆黑 | 打破平衡 |
| 第一转折 | ~30% | 电梯反向坠落负1层 | 进入冲突 |
| 中点 | ~50% | 负1层划痕与稿子描述一致 | 方向转变 |
| 第二转折 | ~75% | 镜中人影出现，指向笔记 | 跌入谷底 |
| 高潮 | ~95% | 灯灭黑屏 | 最终冲击 |

### 4. 情感曲线
[起始: 2分] → [激励事件: 4分] → [上升: 6分] → [中点: 7分] → [升级: 8分] → [暗夜: 9分] → [高潮: 10分] → [结局: 10分]

### 5. 冲突层级
- **外部冲突**：林夏 vs 超自然力量（电梯异常、人影出现）
- **内部冲突**：职业本能（追查真相）vs 生存本能（逃离危险）
- **关系冲突**：林夏与老周的信任（老周的警告是否可信）vs 人影的未知意图

### 6. 节奏建议
- **该快的地方**：电梯下坠段落（数字快速跳动），用短句和画面震动加速节奏
- **该慢的地方**：14楼门开的停顿（时间凝固感），镜中人影抬手的动作（慢镜头悬念）
- **需要留白的地方**：灯灭后的黑屏，仅留对讲机电流声，让恐惧在静默中蔓延

### 7. 短剧改编骨架
- **建议集数**：1集（60秒竖屏/横屏短片）
- **每集覆盖范围**：全文（原文已极简，无需拆分）
- **每集结尾钩子**：灯灭黑屏 + 老周对讲机残余电流声"林……记……"
- **改编优先级**：保留全部情节，无需删减；建议开篇增加5秒办公楼外景空镜建立氛围`,

    summary: `## 📊 制作分析报告

### 1. 内容评估
- **故事类型**：悬疑/惊悚微短剧
- **核心卖点**：密闭空间（电梯）+ 镜面恐怖 + 开放式结局，日漫悬疑风格
- **目标平台**：抖音/快手/B站（竖屏优先，横屏亦可）
- **建议集数**：1集
- **每集时长**：60秒

### 2. 改编策略（重点）
- **必须保留的核心情节**：14楼停顿（失踪案楼层暗示）、楼层下坠（失控感）、负1层划痕（超自然关联）、对讲机警告（外部视角确认危险）、镜中人影（视觉恐怖核心）、灯灭（开放式悬念）。每个情节都是情绪递进的关键节点，删减任何一个都会破坏恐惧感的层次构建。
- **可以删减的内容**：无（原文已极简，每句都有叙事功能）
- **需要合并/简化的内容**：林夏看手机的细节可与后续14楼停顿合并处理，用快速切换镜头呈现，避免冗长
- **建议原创补充的内容**：开篇可加5秒办公楼外景空镜建立深夜孤寂氛围；灯灭后可加3秒纯黑屏+电流声，强化余韵

### 3. 断集建议
- **第 1 集**：覆盖全文，核心冲突是"调查者被未知力量锁定"，结尾钩子为灯灭黑屏 + 老周电流声"林……记……"
- 单集结构：外景建立(5s) → 进电梯(4s) → 14楼停顿(8s) → 下坠(6s) → 负1层划痕(5s) → 对讲机(3s) → 镜中人影(6s) → 灯灭黑屏(3s) + 余韵(20s留给音效)

### 4. 角色分析
- 3个角色，林夏为主视角，老周仅声音出场，人影为视觉恐怖元素
- 角色关系图谱：林夏 ←警告— 老周（监控视角）；林夏 ←追踪— 人影（镜面出现）
- 选角建议：林夏需清瘦冷感气质，参考日漫悬疑女主角类型；人影需高挑身形，无需露脸

### 5. 场景分析
- 3个场景，电梯轿厢为核心（占80%时长），其余为外景/走廊空镜
- 制作难度：电梯场景需绘制镜面反射效果，日漫风格下可用网点纸/渐变表现金属质感
- 需要特殊场景：负1层走廊的划痕需特写分格，灯管闪烁用速度线表现

### 6. 制作建议
- 推荐画面手法：固定分格+手持微抖线条交替，镜面用半透叠加表现"人影"效果
- 特效需求：楼层显示屏数字下坠（数字字体抖动）、灯光闪烁（黑白交替闪烁帧）
- 预算级别：低（单场景为主，角色少）
- 制作周期：1-2天绘制 + 1天上色后期

### 7. 风险提示
- 改编难点：镜面人影的视觉效果实现，需在日漫风格下表现反射与超自然感
- 审查风险：无暴力色情，悬疑恐怖尺度适中，注意灯灭后不要有过多恐怖画面
- 观众反馈：开放式结局可能两极分化，建议系列化后续集数`,

    characters: {
      characters: [
        {
          name: '林夏', role: '主角', gender: '女', age: '28',
          appearance: '齐肩短发，五官清瘦，眼下有疲态，肤色偏冷白，身材纤细，大眼锐利',
          personality: '冷静、执着、有调查记者的敏锐，遇险时压抑恐惧而非崩溃',
          costume: '黑色高领毛衣，深灰风衣，挎帆布挎包，颈挂工牌',
          voiceStyle: '短句为主，语气克制冷静，紧张时呼吸急促但不尖叫，习惯用反问确认信息',
          relationships: '与老周是办公楼相识关系（老周称她"林记者"）；与人影存在被追踪的未知关联',
          arc: '从自信调查者（主动追查真相）→ 被未知力量凝视的猎物（意识到自己被锁定）',
          castingReference: '清瘦冷感气质，日漫悬疑女主角类型，参考《Another》见崎鸣、《死亡笔记》夜神月类型',
          imagePromptZh: '角色设定图，横向1x4排列白色背景，从左到右：第1格28岁女性面部上半身特写，齐肩黑色短发，冷白肤色，清瘦五官，大眼锐利，眼下有疲态，黑色高领毛衣领口；第2格正面全身照，28岁女性，齐肩黑发，黑色高领毛衣，深灰风衣，帆布挎包，颈挂工牌，站姿挺拔，纤细身材；第3格侧面全身照，齐肩发侧脸，深灰风衣侧身轮廓，帆布挎包；第4格背面全身照，齐肩发背影，深灰风衣背面，工牌挂绳，帆布挎包。同一角色同一服装一致设计，日漫风格，赛璐珞上色，色彩鲜明，清晰线条，2D动漫美学，高质量，细节丰富',
          imagePromptEn: 'character turnaround reference sheet, 1x4 horizontal layout on white background, left face upper-body close-up of 28yo female shoulder-length black hair pale skin lean features large sharp eyes tired under-eyes black turtleneck collar; center-left front full-body view 28yo female shoulder-length black hair black turtleneck dark grey trench coat canvas shoulder bag ID lanyard upright stance slender build; center-right side profile full-body view side face shoulder-length hair dark grey trench coat side silhouette canvas bag slender figure; right back full-body view shoulder-length hair from behind dark grey trench coat back ID lanyard canvas bag, same character same costume consistent design, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive',
        },
        {
          name: '老周', role: '配角', gender: '男', age: '52',
          appearance: '花白寸头，方脸，眉骨高，下颌胡茬，皮肤粗糙，浓眉',
          personality: '谨小慎微，见过怪事，对夜班规矩近乎迷信，内心善良但胆小',
          costume: '深蓝保安制服，胸前别对讲机，腰间挂手电筒，黑色皮鞋',
          voiceStyle: '声音发紧，说话简短急促，带轻微方言口音，紧张时声音压低到气声',
          relationships: '与林夏是办公楼相识关系，通过监控看到异常后试图警告她',
          arc: '旁观者（见过怪事但不敢深究）→ 试图警告却无能为力（只能通过对讲机喊话）',
          castingReference: '沧桑质朴气质，日漫中年配角类型，参考《名侦探柯南》毛利小五郎类型',
          imagePromptZh: '角色设定图，横向1x4排列白色背景，从左到右：第1格52岁男性面部特写，花白寸头，方脸，胡茬，眉骨高，浓眉，紧张神情，粗糙皮肤，深蓝制服领口；第2格正面全身照，52岁男性，花白寸头，深蓝保安制服，胸前对讲机，腰间手电筒，拘谨站姿；第3格侧面全身照，花白寸头侧脸，深蓝制服侧身，胡茬轮廓；第4格背面全身照，花白寸头背影，深蓝制服背面，腰间手电筒。同一角色同一服装一致设计，日漫风格，赛璐珞上色，色彩鲜明，清晰线条，2D动漫美学，高质量，细节丰富',
          imagePromptEn: 'character turnaround reference sheet, 1x4 horizontal layout on white background, left face close-up of 52yo male grey buzz cut square jaw stubble prominent brow thick eyebrows tense expression rough skin dark blue uniform collar; center-left front full-body view 52yo male grey buzz cut dark blue security uniform walkie-talkie on chest flashlight on waist restrained stance black shoes; center-right side profile full-body view grey buzz cut side face dark blue uniform side body stubble silhouette; right back full-body view grey buzz cut from behind dark blue uniform back waist flashlight, same character same costume consistent design, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive',
        },
        {
          name: '人影', role: '反派/谜团', gender: '未知', age: '不明',
          appearance: '身形修长，面容隐于阴影，轮廓模糊，双手苍白',
          personality: '沉默、诡谲，意图不明，行动缓慢而刻意',
          costume: '灰色风衣，立领遮住下半张脸，双手苍白，无可见配饰',
          voiceStyle: '全程沉默无声，仅通过缓慢的肢体动作传达意图',
          relationships: '与林夏存在未知追踪关系，指向其挎包笔记，意图不明',
          arc: '神秘存在（突然出现在镜中）→ 指向笔记（锁定目标）→ 灯灭（意图未明）',
          castingReference: '高挑修长身形，无需露脸，日漫恐怖角色类型，参考《另一个》中的诅咒人偶类型',
          imagePromptZh: '角色设定图，横向1x4排列白色背景，从左到右：第1格神秘人影面部特写，灰色立领风衣遮住下半脸，上半脸隐于阴影只见轮廓，苍白双手；第2格正面全身照，灰色立领风衣，面容隐于阴影，身形修长，双手苍白垂下；第3格侧面全身照，灰色风衣侧身轮廓，立领遮面，修长身形；第4格背面全身照，灰色风衣背影，立领，修长轮廓。同一角色同一服装一致设计，悬疑恐怖氛围，日漫风格，赛璐珞上色，色彩鲜明，清晰线条，2D动漫美学，高质量，细节丰富',
          imagePromptEn: 'character turnaround reference sheet, 1x4 horizontal layout on white background, left face close-up of mysterious silhouette grey high-collar trench coat covering lower face upper face hidden in shadow only outline visible pale hands; center-left front full-body view grey high-collar trench coat face hidden in shadow tall slender build pale hands hanging down; center-right side profile full-body view grey trench coat side silhouette high collar covering face slender build; right back full-body view grey trench coat from behind high collar slender outline, same character same costume consistent design eerie thriller atmosphere, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive',
        },
      ],
    },
    scenes: {
      scenes: [
        {
          name: '办公楼夜景', environment: '深夜城市中独栋办公楼外景，玻璃幕墙反射街灯，周围无行人车辆', mood: '孤寂、压抑、潜伏危机', lighting: '冷蓝月光与暖黄街灯混合，仅顶层一扇窗亮灯，对比强烈', timeOfDay: '深夜', narrativeFunction: '建置', keyProps: '无',
          soundDesign: '远处交通低频噪音渐弱，风声，偶尔的远车声，低沉的氛围弦乐铺底',
          colorPalette: '主色深蓝(#1a2a3e)/暗紫(#2a1a3e)，辅色暖黄(#d4a843)街灯点缀',
          compositionHint: '办公楼居中偏右，左侧留空强化孤寂感，视觉引导线从街面向上延伸至亮灯窗户',
          imagePromptZh: '深夜城市中一栋办公楼外景，玻璃幕墙反射月光与街灯，仅顶层一扇窗亮着灯光，街面空无一人，孤寂压抑氛围，建筑居中偏右构图，16:9，日漫风格，赛璐珞上色，色彩鲜明，清晰线条，2D动漫美学，高质量，细节丰富',
          imagePromptEn: 'wide shot of a lone office tower at night, glass curtain wall reflecting moonlight and street lamps, only one top-floor window lit, empty street, oppressive lonely mood, building centered-right composition, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive',
        },
        {
          name: '电梯轿厢', environment: '狭窄不锈钢电梯轿厢，镜面四壁，按键面板发冷光，空间逼仄', mood: '幽闭、不安、孤立无援', lighting: '顶部惨白日光灯，金属反射，灯灭前有微弱闪烁', timeOfDay: '深夜', narrativeFunction: '激励/上升', keyProps: '按键面板、镜面四壁',
          soundDesign: '日光灯电流嗡鸣（持续低频），按键电子音，门开关机械声，灯灭瞬间的电流中断声',
          colorPalette: '主色惨白(#f0f0e8)/不锈钢银(#c0c0c0)，辅色暗紫(#2a1a3e)阴影',
          compositionHint: '对称构图强化幽闭感，镜面反射制造纵深错觉，人物偏左或偏右留出镜面空间',
          imagePromptZh: '狭窄不锈钢电梯轿厢内景，镜面四壁反射，按键面板泛冷白光，顶部日光灯，金属反射，幽闭不安氛围，对称构图，16:9，日漫风格，赛璐珞上色，色彩鲜明，清晰线条，2D动漫美学，高质量，细节丰富',
          imagePromptEn: 'interior of narrow stainless-steel elevator car, mirrored walls reflecting, cold-glowing button panel, white ceiling fluorescent, metallic reflections, claustrophobic uneasy mood, symmetrical composition, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive',
        },
        {
          name: '负1层走廊', environment: '地下负1层水泥走廊，墙面粉刷斑驳，灯管惨白，尽头隐入黑暗', mood: '诡异、寒意、危险逼近', lighting: '冷白日光灯管，部分闪烁，地面反光，尽头无灯形成明暗对比', timeOfDay: '深夜', narrativeFunction: '至暗时刻', keyProps: '墙面划痕',
          soundDesign: '灯管电流嗞嗞声（间歇），空旷回声，远处水管滴水声，低频不安氛围音',
          colorPalette: '主色冷白(#e8e8e0)/水泥灰(#8a8a80)，辅色暗黑(#0a0a0a)尽头阴影',
          compositionHint: '单点透视纵深构图，走廊向远处收缩，灯管引导视线至黑暗尽头，划痕位于墙面黄金分割点',
          imagePromptZh: '地下负1层水泥走廊，斑驳墙面，日光灯管部分闪烁，墙面一道新鲜划痕，地面反光，尽头隐入黑暗，诡异寒意氛围，纵深构图，16:9，日漫风格，赛璐珞上色，色彩鲜明，清晰线条，2D动漫美学，高质量，细节丰富',
          imagePromptEn: 'underground B1 concrete corridor, peeling walls, flickering fluorescent tubes, fresh scratch on wall, glossy reflective floor, vanishing into darkness at the end, eerie chilling mood, depth perspective composition, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive',
        },
      ],
    },
    storyboard: {
      shots: [
        {
          episode: 1, sceneNo: 1, shotNo: 1, shotType: '远景', cameraAngle: '平视', cameraMove: '推',
          visual: '深夜城市中独栋办公楼外景，玻璃幕墙反射街灯，仅顶层一扇窗亮着灯光', dialogue: '', action: '镜头缓慢推近办公楼',
          duration: 5, emotion: 3, characterNames: [], sceneName: '办公楼夜景',
          soundDesign: '远处交通低频噪音渐弱 + 低沉氛围弦乐铺底 + 风声',
          transition: '叠化',
          promptZh: '远景，深夜城市中独栋办公楼外景，玻璃幕墙反射月光与街灯，仅顶层一扇窗亮灯，街面空旷无人，镜头缓慢推近，孤寂压抑氛围，16:9，日漫风格，赛璐珞上色，色彩鲜明，清晰线条，2D动漫美学，高质量',
          promptEn: 'Wide shot, lone office tower at night, glass curtain wall reflecting moonlight and street lamps, single lit top-floor window, empty street, slow dolly-in, oppressive lonely atmosphere, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive',
        },
        {
          episode: 1, sceneNo: 2, shotNo: 1, shotType: '中景', cameraAngle: '平视', cameraMove: '固定',
          visual: '林夏走进电梯轿厢，转身按下1层按键', dialogue: '', action: '林夏走进电梯转身按键，门缓缓合上',
          duration: 4, emotion: 2, characterNames: ['林夏'], sceneName: '电梯轿厢',
          soundDesign: '日光灯电流嗡鸣 + 脚步声 + 按键电子音 + 门关闭机械声',
          transition: '硬切',
          promptZh: '中景，28岁齐肩短发女记者穿黑色高领毛衣与深灰风衣走进不锈钢电梯轿厢，转身按1层按键，门缓缓合上，顶灯，镜面四壁反射，幽闭氛围，16:9，日漫风格，赛璐珞上色，色彩鲜明，清晰线条，2D动漫美学，高质量',
          promptEn: 'Medium shot, 28yo female with shoulder-length black hair in black turtleneck and dark grey trench coat enters narrow stainless-steel elevator car, turns and presses floor-1 button, doors slowly close, white ceiling light, mirrored walls reflecting, claustrophobic atmosphere, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive',
        },
        {
          episode: 1, sceneNo: 2, shotNo: 2, shotType: '特写', cameraAngle: '平视', cameraMove: '固定',
          visual: '电梯按键面板，1层按键亮起冷光', dialogue: '', action: '固定镜头，按键数字1亮起',
          duration: 2, emotion: 2, characterNames: [], sceneName: '电梯轿厢',
          soundDesign: '按键电子音（清脆） + 电流嗡鸣持续',
          transition: '硬切',
          promptZh: '特写，电梯不锈钢按键面板，数字1按键亮起冷白光，金属反光，景深虚化，16:9，日漫风格，赛璐珞上色，色彩鲜明，清晰线条，2D动漫美学，高质量',
          promptEn: 'Close-up, stainless-steel elevator button panel, number 1 button glowing cold white, metallic reflection, shallow depth of field, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive',
        },
        {
          episode: 1, sceneNo: 2, shotNo: 3, shotType: '中景', cameraAngle: '平视', cameraMove: '固定',
          visual: '电梯在14楼停下，门缓缓打开，门外走廊漆黑无人', dialogue: '', action: '门开，林夏抬头望向门外黑暗',
          duration: 5, emotion: 5, characterNames: ['林夏'], sceneName: '电梯轿厢',
          soundDesign: '叮声（楼层到达提示） + 门开机械声 + 突然安静（门外无声） + 低频不安音渐入',
          transition: '硬切',
          promptZh: '中景，不锈钢电梯在14楼停下门缓缓打开，门外走廊漆黑无人，28岁齐肩短发女记者穿深灰风衣抬头望向黑暗，顶灯，镜面四壁反射，紧张氛围，16:9，日漫风格，赛璐珞上色，色彩鲜明，清晰线条，2D动漫美学，高质量',
          promptEn: 'Medium shot, stainless-steel elevator stops at floor 14, doors slowly open to pitch-black empty corridor, 28yo female with shoulder-length hair in dark grey trench coat looks up into darkness, white ceiling light, mirrored walls reflecting, tense mood, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive',
        },
        {
          episode: 1, sceneNo: 2, shotNo: 4, shotType: '近景', cameraAngle: '平视', cameraMove: '固定',
          visual: '林夏皱眉，连续按下关门键', dialogue: '', action: '手指反复按关门键，神情焦虑',
          duration: 3, emotion: 6, characterNames: ['林夏'], sceneName: '电梯轿厢',
          soundDesign: '连续按键声（急促） + 呼吸声加重 + 低频弦乐渐强',
          transition: '硬切',
          promptZh: '近景，28岁齐肩短发女记者冷白肤色皱眉，大眼焦虑，手指反复按下关门键，神情焦虑压抑，顶灯，紧张氛围，16:9，日漫风格，赛璐珞上色，色彩鲜明，清晰线条，2D动漫美学，高质量',
          promptEn: 'Close shot, 28yo female with shoulder-length black hair pale skin frowns, large anxious eyes, finger repeatedly pressing close-door button, anxious restrained expression, white ceiling light, tense atmosphere, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive',
        },
        {
          episode: 1, sceneNo: 2, shotNo: 5, shotType: '特写', cameraAngle: '平视', cameraMove: '手持',
          visual: '楼层显示屏数字快速下降：13、10、7、4、负1', dialogue: '', action: '数字跳动下行，画面微微震动',
          duration: 3, emotion: 7, characterNames: [], sceneName: '电梯轿厢',
          soundDesign: '数字跳动电子音（加速） + 画面震动低频轰鸣 + 弦乐急促上行',
          transition: '跳切',
          promptZh: '特写，电梯楼层显示屏数字快速下降13到负1，红色数字跳动闪烁，画面微震，紧张悬疑，16:9，日漫风格，赛璐珞上色，色彩鲜明，清晰线条，2D动漫美学，高质量',
          promptEn: 'Close-up, elevator floor display numbers rapidly descending 13 to B1, red digits flickering, slight camera shake, tense thriller tone, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive',
        },
        {
          episode: 1, sceneNo: 3, shotNo: 1, shotType: '中景', cameraAngle: '平视', cameraMove: '移',
          visual: '负1层走廊门开，惨白灯管下墙面有一道新鲜划痕', dialogue: '', action: '镜头从电梯内望向走廊，灯光闪烁',
          duration: 5, emotion: 8, characterNames: [], sceneName: '负1层走廊',
          soundDesign: '灯管嗞嗞声（间歇闪烁同步） + 空旷回声 + 水管滴水声 + 低频不安氛围音',
          transition: '声音桥接',
          promptZh: '中景，地下负1层水泥走廊门开，日光灯管部分闪烁，斑驳墙面上一道新鲜划痕，地面反光，尽头隐入黑暗，诡异寒意氛围，纵深构图，16:9，日漫风格，赛璐珞上色，色彩鲜明，清晰线条，2D动漫美学，高质量',
          promptEn: 'Medium shot, underground B1 concrete corridor door opens, flickering fluorescent tubes, fresh scratch on peeling wall, glossy reflective floor, vanishing into darkness at the end, eerie chilling mood, depth perspective composition, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive',
        },
        {
          episode: 1, sceneNo: 2, shotNo: 6, shotType: '近景', cameraAngle: '平视', cameraMove: '推',
          visual: '电梯镜面里，林夏身后站着一个穿灰色风衣的人影，人影抬手指向挎包', dialogue: '老周(对讲机): 林记者，你别回头。', action: '林夏僵住，人影缓缓抬手',
          duration: 6, emotion: 10, characterNames: ['林夏', '人影'], sceneName: '电梯轿厢',
          soundDesign: '对讲机电流声 + 老周压低气声 "林记者，你别回头" + 心跳声加速 + 弦乐升至最高 + 灯灭瞬间电流中断声',
          transition: '硬切至黑屏',
          promptZh: '近景，电梯镜面四壁反射中，28岁齐肩短发女记者穿深灰风衣身后站着一个穿灰色立领风衣的修长人影，面容隐于阴影，人影缓缓抬手指向帆布挎包，顶灯骤灭前一刻，惊悚悬疑，16:9，日漫风格，赛璐珞上色，色彩鲜明，清晰线条，2D动漫美学，高质量',
          promptEn: 'Close shot, elevator mirrored walls reflection, 28yo female with shoulder-length hair in dark grey trench coat with a tall slender grey high-collar trench coat silhouette standing behind her, face hidden in shadow, silhouette slowly raising hand pointing at canvas shoulder bag, moment before white light cuts out, horror thriller mood, 16:9, anime style, Japanese animation, cel shading, vibrant colors, clean line art, 2D anime aesthetic, key visual, high quality, detailed eyes, expressive',
        },
      ],
    },
    script: `## 📝 短剧脚本

### 基本信息
- **剧名**：最后一班电梯
- **集数**：1集
- **每集时长**：60秒
- **类型/风格**：悬疑/惊悚，日漫悬疑风格
- **目标受众**：18-35岁悬疑爱好者

### 剧情大纲
调查记者林夏深夜加班后独自乘电梯下楼，电梯在失踪案发生的14楼异常停下，随后反向坠至负1层。负1层走廊的划痕与她正在调查的稿子描述一致，对讲机传来保安老周的警告，镜中出现神秘人影指向她的笔记——灯灭。

### 第 1 集：最后一班电梯

#### 场景 1：办公楼外景 - 深夜 - 室外
- **时间**：凌晨1点
- **地点**：城市办公楼外
- **人物**：无
- **画面描述**：远景，月光下独栋办公楼，玻璃幕墙反射街灯，仅顶层一扇窗亮灯，街面空无一人。镜头缓慢推近。
- **音效/BGM**：远处交通低频噪音渐弱，低沉氛围弦乐铺底，风声
- **[转场设计]**：叠化至电梯内景，声音从风声过渡到日光灯电流嗡鸣

#### 场景 2：电梯轿厢 - 深夜 - 室内
- **时间**：凌晨1点
- **地点**：办公楼电梯
- **人物**：林夏
- **画面描述**：中景，林夏走进不锈钢电梯，转身按1层。门合上，日光灯嗡鸣。镜面四壁反射她清瘦的身影。

**林夏**：（低头看手机，疲惫但专注，手指滑动屏幕上的稿子《十四楼失踪者》。语气平静自语）"就差最后核实……"
  - 潜台词：这篇稿子是她追查多日的心血，必须今晚发出去

（叮。14楼。门开，走廊漆黑无人。林夏皱眉连按关门键。门合上，电梯反向坠落。楼层：13、10、7、4、负1。）

**林夏**：（呼吸急促，手紧握挎包带，眼神从困惑转为警觉。克制低声）"不对……"
  - 潜台词：稿子里写的那些异常……是真的？

- **音效/BGM**：叮声 → 门开机械声 → 突然安静 → 连续按键声急促 → 数字跳动电子音加速 → 低频轰鸣 → 弦乐急促上行
- **[转场设计]**：跳切至楼层显示屏特写，数字快速下坠制造失重感

#### 场景 3：负1层走廊 - 深夜 - 室内
- **时间**：凌晨1点后
- **地点**：地下负1层走廊
- **人物**：无
- **画面描述**：中景，门开。灯管闪烁，墙面一道新鲜划痕——与稿子描述一模一样。镜头从电梯内望向走廊，纵深构图，尽头黑暗。
- **音效/BGM**：灯管嗞嗞声间歇 + 空旷回声 + 水管滴水声 + 低频不安氛围音
- **[转场设计]**：声音桥接——滴水声延续，对讲机电流声渐入

#### 场景 4：电梯轿厢 - 深夜 - 室内
- **时间**：凌晨1点后
- **地点**：办公楼电梯
- **人物**：林夏、人影（镜中）、老周（对讲机声音）

**老周**：（对讲机电流声，声音发紧，气声急促）"林记者，你别回头。"
  - 潜台词：我看到监控了，你身后有东西，我不敢说太清楚

（林夏僵住。镜面中，身后站着一个穿灰色风衣的人影，面容隐于阴影。人影缓缓抬手，指向挎包里的笔记。）

**林夏**：（瞳孔放大，嘴唇微张但无声，身体僵直不敢动）
  - 潜台词：它……在找我的稿子？

（灯，灭了。黑屏。对讲机残余电流声：林……记……）

- **音效/BGM**：对讲机电流声 + 老周气声 + 心跳声加速至最强 + 弦乐升至最高 → 灯灭瞬间电流中断声 → 2秒纯黑屏静默 → 残余电流声"林……记……"渐弱
- **[转场设计]**：硬切至黑屏，所有声音骤停2秒后仅留对讲机残余电流声

### 本集要点
- **核心冲突**：真相调查者 vs 未知超自然力量
- **情感高潮**：镜中人影抬手指向笔记（10分）
- **结尾钩子**：灯灭黑屏 + 老周电流声残留"林……记……"——开放式悬念

---

**请确保**：
1. 节奏紧凑，对白自然，适合短视频平台传播
2. 对白有潜台词，不是直白的信息传递
3. 表演指导具体可执行，导演和演员能直接理解
4. 转场设计有情绪目的，不是简单的硬切
5. 画面描述使用电影化语言，不是小说叙述`,

    assets: `## 🎨 视觉资产设计

### 0. 全局视觉风格定义
- **整体风格**：日漫悬疑恐怖风格，赛璐珞上色，线条清晰，参考《Another》《死亡笔记》的日常空间恐怖美学
- **色调体系**：主色深蓝(#1a2a3e)/暗紫(#2a1a3e)，辅色暖黄(#d4a843)街灯点缀，点缀血红(#8b0000)危险暗示
- **参考作品**：《Another》（日常空间中的诅咒恐怖）、《死亡笔记》（暗调悬疑线条风格）、《Mononoke》（怪异氛围表现）
- **通用画面要求**：clean line art, cel shading, detailed eyes, expressive, high quality

### 1. 角色立绘
为每个主要角色生成：
- **林夏全身立绘 Prompt**：28yo female journalist, shoulder-length black hair, pale skin, lean features, large sharp eyes, black turtleneck, dark grey trench coat, canvas shoulder bag, ID lanyard, standing pose, calm expression, clean line art, cel shading
- **林夏半身像 Prompt**：28yo female journalist upper body, shoulder-length black hair, pale skin, tired under-eyes, large eyes, black turtleneck collar, clean line art, cel shading, detailed eyes
- **林夏表情包 Prompt**：5 emotions face close-up sheet, 28yo female, shoulder-length black hair, pale skin, expressions: calm/focused/anxious/fearful/shocked, black turtleneck, clean line art, cel shading
- **林夏标志性动作 Prompt**：female journalist gripping shoulder bag strap tightly, knuckles white, tense posture, shoulder-length hair, dark grey trench coat, clean line art, cel shading
- **老周全身立绘 Prompt**：52yo male security guard, grey buzz cut, square jaw, stubble, thick eyebrows, dark blue uniform, walkie-talkie on chest, flashlight on waist, restrained tense pose, clean line art, cel shading
- **人影全身立绘 Prompt**：mysterious tall slender silhouette, grey high-collar trench coat, face hidden in shadow, pale hands hanging down, eerie thriller atmosphere, clean line art, cel shading

### 2. 关键场景图
- **办公楼夜景全景 Prompt**：wide shot lone office tower at night, glass curtain wall, moonlight, single lit top-floor window, empty street, oppressive lonely mood, clean line art, cel shading
- **办公楼夜景细节 Prompt**：close-up of single lit top-floor window at night, glass curtain wall reflection, moonlight, ominous feeling, clean line art, cel shading
- **电梯轿厢全景 Prompt**：narrow stainless steel elevator interior, mirrored walls, fluorescent light, metallic reflections, claustrophobic, clean line art, cel shading
- **电梯轿厢细节 Prompt**：close-up elevator button panel, floor 1 glowing cold white, stainless steel reflection, shallow depth of field, clean line art, cel shading
- **负1层走廊全景 Prompt**：underground B1 concrete corridor, flickering fluorescent, peeling wall with scratch, glossy floor, darkness at end, eerie, clean line art, cel shading
- **负1层走廊细节 Prompt**：close-up of fresh scratch on peeling concrete wall, flickering fluorescent light, eerie atmosphere, clean line art, cel shading

### 3. 道具/物品
- **调查笔记 Prompt**：worn leather notebook, handwritten pages, journalist notes, dim light, close-up, clean line art, cel shading
- **对讲机 Prompt**：old walkie-talkie, crackling static, dim green LED, security equipment, close-up, clean line art, cel shading
- **墙面划痕 Prompt**：fresh scratch on peeling concrete wall, flickering fluorescent light, eerie, close-up, clean line art, cel shading

### 4. 封面/海报
- **主视觉 Prompt**：elevator mirror reflection, female journalist silhouette in dark grey trench coat, mysterious tall grey figure standing behind, face hidden in shadow, horror atmosphere, vertical poster, clean line art, cel shading
- **剧名排版建议**：白色无衬线粗体（如黑体 Bold），居中偏下，带轻微抖动效果，字号占画面宽度60%
- **系列海报方案**：统一深蓝暗紫主调，每张以不同场景的"异常瞬间"为主视觉，底部统一排版剧名

### 5. 风格参考图集
- **参考作品 1**：《Another》 — 参考其日常空间中的诅咒恐怖和人物大眼表现
- **参考作品 2**：《死亡笔记》 — 参考其暗调线条风格和悬疑氛围渲染
- **参考艺术家/画师**：小畑健 — 参考其精细线条和暗调上色风格`,
  },
  mediaItems: [],
  snapshots: [],
  createdAt: '2026-07-08T16:00:00.000Z',
  updatedAt: '2026-07-08T16:00:00.000Z',
};
