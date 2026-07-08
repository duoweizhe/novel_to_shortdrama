// example.js — 内置示例项目数据（悬疑推理《最后一班电梯》）

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
  knowledge: {
    characters: [
      { id: 'c1', name: '林夏', aliases: ['林记者'], description: '调查记者，28岁，正在追查十四楼失踪案', traits: '冷静、执着、敏锐，遇险时压抑恐惧', appearance: '齐肩短发，冷白肤色，清瘦五官' },
      { id: 'c2', name: '老周', aliases: [], description: '夜班保安，52岁，见过怪事', traits: '谨小慎微，对夜班规矩近乎迷信', appearance: '花白寸头，方脸胡茬' },
      { id: 'c3', name: '人影', aliases: [], description: '出现在电梯镜面中的神秘人影', traits: '沉默、诡谲，意图不明', appearance: '身形修长，面容隐于阴影' },
    ],
    scenes: [
      { id: 's1', name: '办公楼夜景', type: '室外', description: '深夜城市中独栋办公楼，玻璃幕墙反射街灯', mood: '孤寂压抑' },
      { id: 's2', name: '电梯轿厢', type: '室内', description: '狭窄不锈钢电梯轿厢，镜面四壁，按键面板发冷光', mood: '幽闭不安' },
      { id: 's3', name: '负1层走廊', type: '室内', description: '地下负1层水泥走廊，墙面粉刷斑驳，灯管惨白', mood: '诡异寒意' },
    ],
    props: [
      { id: 'p1', name: '调查笔记', description: '林夏挎包中的稿子《十四楼失踪者》', significance: '人影指向的核心道具，推动剧情' },
      { id: 'p2', name: '对讲机', description: '老周与林夏联络的工具', significance: '制造紧张感的关键道具' },
    ],
    timeline: [
      { chapter: '全文', event: '林夏深夜加班后乘电梯下楼', time: '凌晨1点' },
      { chapter: '全文', event: '电梯异常停在14楼后坠落至负1层', time: '凌晨1点后' },
      { chapter: '全文', event: '镜中出现神秘人影，灯光熄灭', time: '凌晨1点后' },
    ],
  },
  results: {
    characters: {
      characters: [
        { name: '林夏', role: '主角', gender: '女', age: '28', appearance: '齐肩短发，五官清瘦，眼下有疲态，肤色偏冷白', personality: '冷静、执着、有调查记者的敏锐，遇险时压抑恐惧', costume: '黑色高领毛衣，深灰风衣，挎帆布挎包，颈挂工牌', arc: '从自信调查者→被未知力量凝视的猎物', imagePromptZh: '一位28岁短发女记者，齐肩黑发，冷白肤色，穿黑色高领毛衣与深灰风衣，挎帆布包，神情冷峻疲惫，冷调电影光影，半身像', imagePromptEn: '28-year-old female journalist, shoulder-length black hair, pale cold skin, black turtleneck and dark grey trench coat, canvas shoulder bag, cold resolute exhausted expression, cinematic cold-toned lighting, half-body portrait, 16:9' },
        { name: '老周', role: '配角', gender: '男', age: '52', appearance: '花白寸头，方脸，眉骨高，下颌胡茬', personality: '谨小慎微，见过怪事，对夜班规矩近乎迷信', costume: '深蓝保安制服，胸前别对讲机，腰间挂手电筒', arc: '旁观者→试图警告却无能为力', imagePromptZh: '一位52岁夜班保安，花白寸头，方脸胡茬，穿深蓝保安制服，胸前别对讲机，神情紧张，冷调监视器光线，半身像', imagePromptEn: '52-year-old night-shift security guard, grey buzz cut, square jaw stubble, dark blue uniform, walkie-talkie on chest, tense expression, cold monitor glow, half-body portrait, cinematic, 16:9' },
        { name: '人影', role: '反派/谜团', gender: '未知', age: '不明', appearance: '身形修长，面容隐于阴影，轮廓模糊', personality: '沉默、诡谲，意图不明', costume: '灰色风衣，立领遮住下半张脸，双手苍白', arc: '神秘存在，指向笔记后灯灭', imagePromptZh: '一个身形修长的神秘人影，穿灰色立领风衣，面部隐于阴影只见轮廓，双手苍白，幽暗冷光，悬疑氛围，全身像', imagePromptEn: 'tall slender mysterious silhouette in grey high-collar trench coat, face hidden in shadow only outline visible, pale hands, dim cold light, eerie thriller atmosphere, full-body shot, cinematic, 16:9' },
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
  },
};
