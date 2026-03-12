# Biological Dynamics Demo - 程序实现综合指引

这份 README 不再只是“技术架构概览”，而是当前项目的统一实现说明书。

它整合了三部分共识：

1. 《034GameJam 核心实现报告：集群生物网状牵引移动系统》中的核心体验判断。
2. 《完整落地策划案》中的正式 demo 目标、关卡节奏与玩法方向。
3. 当前仓库里已经落地的程序实现、开发工具、调参系统、存档系统与正式 demo 循环。

目标只有一个：

让后续任何开发者都能在最短时间内回答下面这些问题：

- 这个项目现在真正的核心是什么？
- 什么可以大胆改，什么必须谨慎改？
- 某一类功能现在已经做到哪里了？
- 我想改移动 / 改 prey / 改编辑器 / 改 HUD / 改相机 / 改调参，应该从哪几个文件下手？
- 策划案里的设计，当前程序到底已经落了多少，剩下的空位在哪里？

---

## 开发入口（固定）

请统一使用仓库根目录的一键脚本启动，避免 `file://` 直开产生行为偏差：

- Windows 双击：`start-dev.bat`
- PowerShell：`./start-dev.ps1`

脚本会固定打开 `http://127.0.0.1:4173/index.html`，并启动 `tools/dev_server.py`。  
该服务器同时提供静态资源与 JSON 写回 API（用于调参写盘与单槽存档写盘）。

---

## 一、先读这四条

### 1. 当前项目的真正核心

当前版本最成熟、最独特、最值得保护的，不是数值，不是关卡，不是 UI，也不是单个敌人机制。

真正的核心是：

**由意图场驱动、通过脉冲巡游和节点抓地实现的集群生物网状牵引移动系统。**

更直白一点：

- 玩家控制的不是一个“角色坐标”。
- 玩家输入的是一个“意图场”。
- 集群不是被直接平移，而是被局部节点轮流抓地、前探、回弹、拖拽。
- 这种拖拽再通过连线、排斥、PBD、显示缓冲和镜头前探，涌现出“活的组织正在侵袭”的感觉。

后续所有开发，都应当围绕这件事放大，而不是稀释它。

### 2. 当前正式 demo 的一句话定义

这是一个俯视角、短局、快节奏、围绕“追猎 -> 吞食 -> 扩张 -> 晋级”展开的生态掠食 demo。

玩家操控的是一个由圆形、方形、三角形节点组成的流体怪物，在持续能量流失的压力下追猎猎物、吞食维生、长出新节点，并在四个阶段里逐渐从求生者演化为压制性捕食集群。

### 3. 本项目的两条最高优先级约束

第一条：

**角色节点集群的移动手感、范式要谨慎修改。**

第二条：

**其余绝大多数内容层，包括正式循环、猎物生态、反馈、UI、编辑器、开发工具，都可以大胆改、补、重构。**

### 4. 当前程序状态

当前仓库已经不再是单纯 playtest playground，而是一个“正式 demo 基底 + 完整开发态工具”的混合体：

- 正式 demo 循环已落地
- 四阶段 progression 已落地
- 猎物 archetype 已落地
- 无文字 HUD 与阶段反馈已落地
- 主菜单 / 暂停 / 单槽存档已接回
- 调参面板已接回并升级
- 点击节点进入慢放编辑态已接回

这意味着后续开发不需要先“把基础搭起来”，而是可以直接在一版已经可玩、可调、可存、可改的基础上继续扩写。

---

## 二、GameJam 语境与设计总意图

本项目的根出发点来自 GameJam 主题“连接”以及美术/规则限制：

- 游戏实例只能由纯色圆形、三角形、矩形构成
- 游戏内原则上不依赖文字解释玩法
- 不能靠复杂具象造型建立魅力

所以这个项目真正能成立的地方，不是“画出了什么”，而是：

- 基础图形如何连接
- 连接如何传递力
- 力如何组织出生命感
- 玩家如何像驱赶一团组织去狩猎，而不是在开飞船

由此衍生出的核心幻想是：

**玩家不是在控制一个角色，而是在驱动一团会呼吸、会扩张、会扑食、会拖拽自身结构的生物组织。**

当前正式 demo 选择的是最收敛也最适合当前程序基底的路线：

- 不做大而全技能树
- 不做重型 RPG build
- 不做复杂 boss 多阶段演出
- 不做深 meta progression

而是专注于：

- 短局生存压力
- 高密度追猎循环
- 体量成长
- 姿态博弈
- 4 个阶段的小关卡递进

---

## 三、当前项目的体验关键词

后续任何内容设计、系统设计、美术反馈和音效判断，最好都围绕下面这些词判断是否“同路”：

- 饥饿
- 追猎
- 吞食
- 扩张
- 包围
- 压制
- 脉动
- 牵引
- 重试

如果某个新增功能无法强化这些词里的至少一个，它大概率不是当前版本最优先需要的东西。

---

## 四、什么是“不要轻易破坏”的核心体验

这是最重要的一节。

### 1. 玩家感受到的不是平移，而是牵引

当前玩家体感成立的根本，不是“输入后主角往前走了”，而是：

1. 脉冲沿节点网络游走
2. 节点被依次点亮
3. 节点进入短时间抓地 / 生根 / 发劲状态
4. 节点向虚拟锚点暴力拉扯自身
5. 这个局部发力通过网络牵连全体
6. 全体因此被扯动、回弹、舒张、收拢

所以手感上玩家会觉得：

- 我不是推着一个东西走
- 我是在逼一团组织向前侵袭
- 前排节点在探、后排节点在被拖、中间结构在撑住

### 2. 当前最宝贵的不是“有很多节点”，而是“节点分工有生物感”

当前节点不是装饰挂件，而是已经有运动语义分工：

- 圆形更偏核心、吸食、稳定、压缩
- 方形更偏结构、壳体、横向撑开、碾压
- 三角更偏前探、钩挂、切开、攻击器官

这让当前集群不是“多个点一起动”，而是：

- 有的像在蹬地
- 有的像在撑壳
- 有的像探针
- 有的像被整体拖着走但又反过来拉扯全体

### 3. 当前最正确的气质描述

当前项目应被理解为：

- 不是机械编队，而是有骨相的软体
- 不是果冻乱晃，而是有意图的脉动生物
- 不是战机转向，而是组织侵袭
- 不是简单放大缩小，而是收拢、巡航、逼近、扑猎、回弹

### 4. 后续改动的底线

如果后续改动会把体验推向下面这些方向，请格外谨慎：

- 输入一给，整体直接线性平移
- 节点只剩视觉装饰，不再承担发力差异
- 集群铺开和压紧没有代价差异
- 镜头和 HUD 强到压过“世界内可读性”
- 玩法变成单纯输出 check，而不是姿态 check

---

## 五、当前正式 demo 的完整游戏循环

### 1. 大循环

当前正式 demo 的大循环是：

1. 主菜单
2. 开始新局或读取单槽存档
3. 进入当前阶段
4. 通过追猎基础 prey 维持能量
5. 通过吞食积累 growthBuffer
6. 达到成长门槛后自动长出新节点
7. 达到本阶段 progressGoal 后刷新 objective
8. 吞食 objective 晋级下一阶段
9. 最终阶段吞食 apex objective 获胜
10. 若能量耗尽则死亡并快速重开

### 2. 小循环

单次高频 gameplay 循环是：

1. 发现猎物
2. 判断是否值得追
3. 切换姿态：缩 / 巡航 / 追 / 铺 / 扑
4. 接触、附着、撕裂或吞食
5. 回收能量与 biomass
6. 继续找下一只

当前这套小循环大多数时候应该在 5 到 12 秒内完成一次，节奏不能拖。

### 3. 当前四阶段与策划映射

当前阶段定义在 `src/constants.js` 的 `DEMO_STAGE_DEFS` 中。

#### `forage`

- 设计意图：教玩家追、贴、吞
- 体验关键词：求生、初次追猎
- 主要 prey：`skittish` + 小型 `school`
- objective：大型 `skittish`

#### `bloom`

- 设计意图：教玩家体量扩张后的扫荡感，以及“不是一直铺开就最优”
- 体验关键词：扩张、第一层压制
- 主要 prey：`school` + `skittish` + 初次 `bulwark`
- objective：大型 `bulwark`

#### `encircle`

- 设计意图：教玩家包围、绕后、逼弱点
- 体验关键词：围猎、堵位
- 主要 prey：`weakspot` + `bulwark` + `school`
- objective：大型 `weakspot`

#### `saturation`

- 设计意图：把追、缩、铺、扑全部串起来，形成终局压力
- 体验关键词：过饱和、巨构捕食
- 主要 prey：`school` + `bulwark` + `weakspot`
- objective：大型 `apex`

---

## 六、仓库结构与模块职责

项目采用 Phaser 3 + Mixin 的轻量结构。

入口由 `index.html` 顺序加载脚本，再由 `src/main.js` 用 `Object.assign(...)` 把所有 Mixin 拼到 `CoreDemoScene` 上。

### 目录速览

```text
/
├── start-dev.bat
├── start-dev.ps1
├── index.html
├── tuning-profile.json
├── save-slot.json
├── tuning-panel.js
├── README.md
├── vendor/
│   └── phaser.min.js
├── tools/
    └── dev_server.py
└── src/
    ├── constants.js
    ├── utils.js
    ├── storage.js
    ├── ui.js
    ├── scene.js
    ├── sceneInit.js
    ├── sceneProgression.js
    ├── sceneSaveLoad.js
    ├── sceneTopology.js
    ├── sceneInput.js
    ├── sceneMovement.js
    ├── sceneCombat.js
    ├── sceneEnemies.js
    ├── sceneRender.js
    └── main.js
```

### 文件职责速查

#### `index.html`

- 页面入口
- 定义脚本加载顺序
- 加载本地 `vendor/phaser.min.js`（避免 CDN 波动）
- 挂载浮动“新增节点”按钮
- 通过 `window.CORE_DEMO_DEBUG !== false` 控制开发态入口是否默认显示

#### `tuning-profile.json`

- 仓库内调参基线
- 随 Git 同步
- 新参数如果希望有稳定默认值，必须同步写进这里

#### `tuning-panel.js`

- 调参系统入口与 UI
- 负责：
  - fallback 默认值
  - 仓库基线加载
  - 历史本地调参一次性迁移
  - 调参项定义表
  - 主 feel 组合旋钮
  - 分类折叠 UI
  - 差异导出
  - 完整 JSON 导出
  - “写入 JSON”并重置比对基线

#### `src/constants.js`

- 全局常量
- 当前最重要的静态数据都在这里：
  - `NODE_LIBRARY`
  - `PREY_ARCHETYPE_DEFS`
  - `DEMO_STAGE_DEFS`
  - 颜色、尺寸、默认链条、拓扑局部规则等

#### `src/storage.js`

- `save-slot.json` 文件读写封装（经 `tools/dev_server.py` API）
- 历史 localStorage 单槽数据自动迁移
- 保存时间格式化

#### `src/ui.js`

- 主菜单 / 暂停菜单 / 单槽存档 UI
- 不负责游戏逻辑，只负责把按钮事件发给 Scene 层

#### `src/scene.js`

- `CoreDemoScene` 定义
- Phaser `create()` 生命周期入口
- 初始化键位、鼠标事件、UI、主菜单

#### `src/sceneInit.js`

- 默认状态工厂
- 主循环 `update(_, deltaMs)`
- 相机状态
- 世界更新顺序编排

#### `src/sceneProgression.js`

- 正式 demo 的中枢逻辑
- 负责：
  - `runState`
  - 阶段切换
  - 能量衰减
  - growth 成本
  - objective 刷新
  - 死亡 / 胜利
  - 全局 gameplay 参数读取

#### `src/sceneSaveLoad.js`

- 当前局状态的序列化与反序列化
- 当前已覆盖：
  - 玩家状态
  - 节点结构
  - 拓扑边
  - pulse runners
  - camera zoom
  - runState

#### `src/sceneTopology.js`

- 节点槽位、自动连边、连边物理参数、拓扑修改 API
- 编辑器和成长系统都依赖它

#### `src/sceneInput.js`

- 鼠标意图场
- 爆发态判定
- 集群体积控制
- 编辑态选择、拖拽、框选、删点、撤销、退出

#### `src/sceneMovement.js`

- 集群动力学核心
- 负责：
  - pulse runner 更新
  - 节点锚定
  - 漂移力 / 核心力 / 弹簧 / 排斥 / PBD
  - 玩家朝向、稳定性、节奏衰减

#### `src/sceneCombat.js`

- 节点与 prey 的接触、附着、咀嚼、伤害、碎片、吞食
- 节点不同形状 / 角色有不同 predation profile

#### `src/sceneEnemies.js`

- spawn rule 执行
- prey 行为更新
- school / bulwark / weakspot / apex 行为逻辑

#### `src/sceneRender.js`

- 所有世界绘制与 HUD 绘制
- 包括：
  - 场景底色和网格
  - prey
  - predation links
  - formation
  - HUD
  - 顶部活体能量条：用 baked 矩形 strip 精灵叠层组成单体矩形，不走每帧 Graphics 重绘
  - 能量条 metrics：给阶段 pips 提供锚点，保证 HUD 跟随主条长度变化
  - 死亡 / 胜利覆盖层
  - 编辑器 overlay
  - debug overlays

#### `src/main.js`

- 组合所有 Mixin 到 `CoreDemoScene.prototype`
- 创建 Phaser 实例

---

## 七、运行时核心数据结构

理解下面这些对象，是快速读懂整个项目的关键。

### 1. `player`

代表玩家集群本体。

当前与正式循环强相关的字段包括：

- `chain`：当前链式顺序
- `centroidX / centroidY`
- `heading`
- `energy / maxEnergy`
- `growthBuffer / nextGrowthCost`
- `metabolism`
- `predationPressure`
- `pulseRunners`
- `pulseCursor / pulseTimer / pulsePath`
- `edit`

### 2. `activeNodes`

真正参与模拟和渲染的节点数组。

每个节点包含：

- 几何和角色信息：`shape / role / polarity / color`
- 物理状态：`x / y / vx / vy`
- 锚定状态：`anchorX / anchorY / anchored / anchorStrength`
- 表现状态：`displayX / displayY / displayAngle / pulseGlow / biteGlow`
- 捕食状态：`predationMode / predationWindow / gripPower / cutPower / suctionPower`

### 3. `links`

拓扑边数组。

重要字段包括：

- `a / b`
- `kind`：如 `spine` / `support`
- `rigidity`
- `samePolarity`
- `tension`

### 4. `intent`

玩家当前意图场的最终结果。

包括：

- 基础移动：`moveX / moveY`
- 瞄准：`aimX / aimY`
- 综合流向：`flowX / flowY`
- 指针圈层：`pointerDrivePhase`
- 爆发参数：`burstAggro / burstPressure / burstSpreadBoost / burstLookAhead`
- 体积参数：`centerCompression / clusterVolume`

### 5. `clusterVolume`

集群当前的收缩 / 舒张状态。

包括：

- `effective`
- `normalized`
- `expansion`
- `compression`
- `radialScale`
- `forwardScale`
- `lateralScale`
- `restScale`
- `repulsionScale`

### 6. `burstDrive`

爆发态的中间缓存。

负责从鼠标距离、外甩趋势、指针速度里算出：

- `phase`
- `pressure`
- `releaseTimer`
- `aggro`
- `chaosBoost`
- `reachBoost`
- `strengthBoost`

### 7. `runState`

正式循环总状态。

包括：

- `stageIndex`
- `stageProgress`
- `totalProgress`
- `objectiveSpawned`
- `objectiveId`
- `spawnTimers`
- `growthCursor`
- `stageFlash`
- `stageSignal`
- `objectivePulse`
- `growthPulse`
- `energyPulse`
- `lowEnergyPulse`
- `complete / completeTimer`

### 8. `prey`

当前场上的猎物实体。

重要字段包括：

- `id / archetype / sizeKey / shape`
- `x / y / vx / vy`
- `radius / maxHealth / health`
- `energyValue / biomassValue / progressValue`
- `compressionNeed / encircleNeed / weakArc`
- `guardPulse / pushCharge / exposed`
- `attachments`
- `isObjective`

### 9. `cameraRig`

相机状态缓存。

包括：

- `x / y / zoom`
- `targetX / targetY / targetZoom`
- `manualZoom`
- `leadX / leadY`
- `baseFocusX / baseFocusY`
- `compositionX / compositionY`

### 10. `ui`

DOM 层菜单引用集合。

只有菜单、暂停、toast 相关，不参与世界模拟。

---

## 八、启动流程与状态机

### 1. 启动流程

当前启动顺序是：

1. `index.html` 载入 Phaser 与所有脚本
2. `tuning-panel.js` 初始化 `window.TUNING`
3. `main.js` 将所有 Mixin 混入 `CoreDemoScene`
4. Phaser 创建场景
5. `scene.js -> create()`
6. 构建 UI
7. `resetSimulation(false)`
8. `showMainMenu()`

所以当前默认不是直接开局，而是先进主菜单。

### 2. 顶层状态

当前 Scene 层主要存在这些顶层运行状态：

- `menuMode === 'main'`
- `menuMode === 'pause'`
- `paused === true`
- `player.dead === true`
- `runState.complete === true`
- `player.edit.active === true`

这些状态会改变主循环里哪些子系统继续跑、哪些暂停。

### 3. 当前控制方式

#### 局内常规

- 鼠标位置：主意图输入
- 滚轮：镜头缩放
- `R`：重开
- `ESC`：暂停 / 继续 / 退出编辑态

#### 开发态与编辑态

- 左键点节点 / 连线：进入编辑态
- 左键拖节点：改槽位
- 左键空地拖拽：框选
- 右键长按节点：删点
- `Delete`：删除当前编辑选中
- `Ctrl + Z`：撤销
- `E`：新增节点

说明：

当前开发工具默认开启，只有当 `window.CORE_DEMO_DEBUG = false` 时才整体关闭。

---

## 九、主循环详解

真正的主循环在 `src/sceneInit.js -> update(_, deltaMs)`。

每帧顺序如下：

### 1. 菜单 / 暂停 / 死亡状态检查

- `ESC` 处理暂停与恢复
- `menuMode` 下只更新 camera / display / render
- 死亡时允许 `R` 或倒计时后重开

### 2. 读取模式输入

- `handleModeInputs()`
- 如果处于编辑态，会把 `timeScaleFactor` 降到慢放
- 当前编辑慢放与删点慢放都可由面板调参

### 3. 读取玩家意图

- `readIntent(frameDt)`
- 输入不是直接位移，而是被转换成：
  - 指针圈层
  - 爆发压力
  - 收缩 / 舒张目标
  - 方向综合流

### 4. 更新编辑态

- `updateEditMode(frameDt)`
- 处理：
  - hover
  - 点选
  - 框选
  - 拖点
  - 长按删点
  - 撤销历史

### 5. 推进模拟世界

`simDt = frameDt * timeScaleFactor`

随后依次执行：

1. `updatePulse(simDt)`
2. `updateFormation(simDt)`
3. `updatePlayerState(simDt)`
4. `updateSpawns(simDt)`
5. `updatePrey(simDt)`
6. `resolvePreyNodeCollisions()`
7. `updatePredation(simDt)`
8. `updateRunState(simDt)`
9. `updateEffects(simDt)`

### 6. 相机、显示、渲染

最后执行：

1. `updateCamera(frameDt)`
2. `updateDisplay(frameDt)`
3. `render()`

这里要注意：

**相机和显示缓冲使用的是常规帧时间 `frameDt`，而不是总跟着慢放倍率走。**

这能保证编辑态慢放时仍然“像高级慢动作”，而不是所有东西都一起僵住。

---

## 十、集群牵引移动系统深度说明

这一节是整个项目最重要的程序理解区。

### 1. 输入不是移动命令，而是意图场

当前程序里，鼠标相对质心的世界距离会被解释成不同圈层：

- 贴近：稳定 / 收缩
- 中距：巡航
- 拉远：追击
- 更远：狩猎
- 外甩：爆发

这层逻辑主要在 `src/sceneInput.js` 中。

### 2. 集群体积控制不是装饰，而是玩法姿态

当前体积系统会计算：

- `expansion`
- `compression`
- `forwardScale`
- `lateralScale`
- `restScale`
- `repulsionScale`

这意味着“铺开”与“压紧”不是纯视觉缩放，而会真实影响：

- 节点间距
- 前探长度
- 横向展开
- 弹簧静息长度
- 排斥强度
- 核心收束力度

### 3. 脉冲巡游是驱动节奏，不是特效

`pulseRunners` 会沿节点链与拓扑关系巡游。

当脉冲命中节点时，会触发该节点的发力行为：

- 进入短时锚定
- 向锚点拉扯
- 提升该节点的 pulseGlow / biteGlow / hookTension 等表现

### 4. 真正的动力学链路

当前运动核心不是单一公式，而是多层叠加：

1. 漂移推进力
2. 核心收束力
3. 节点锚定牵引
4. 弹簧与拓扑张力
5. 节点排斥
6. PBD 约束校正
7. 阻尼衰减
8. 显示层插值缓冲

这个顺序非常重要。

它决定了当前手感会表现成：

- 前部探出
- 中段撑开
- 后段被拖上来
- 整体没完全散掉

### 5. 为什么现在它有“活物感”

因为当前系统里至少同时存在：

- 局部发力
- 网络传导
- 节点角色差异
- 软体体积感
- 结构保形
- 朝向与镜头前探

这些因素共同让它不像：

- 飞船
- rigid body
- 简单 boids
- 普通蛇形跟随

而像：

- 有骨相但仍柔软的组织

### 6. 这一系统后续如何改才安全

如果要改它，优先从这些地方做“层外扩展”，而不是先拆核心：

- 调参项新增
- 节点角色更多样化
- prey 对姿态的反馈更鲜明
- 相机和渲染反馈更强
- pulse 可视和音效更高级

如果必须改核心，请先确认不会破坏下面三件事：

1. 玩家仍在驱动“牵引”，不是直接平移
2. 收缩 / 舒张仍是有效决策，不是纯视觉动画
3. 节点的角色差异仍然会影响运动与捕食表现

---

## 十一、拓扑、节点与成长系统

### 1. 节点库

当前节点模板定义在 `src/constants.js -> NODE_LIBRARY`。

默认包含：

- `source`
- `compressor`
- `shell-a`
- `shell-b`
- `prism`
- `dart-a`
- `dart-b`
- `blade`

### 2. 默认初始集群

当前默认初始链条定义为：

`DEFAULT_BASE_CHAIN = [0, 2, 5, 4, 1, 7]`

对应的是一个 6 节点混编起始体。

### 3. 当前节点角色语义

#### 圆形

- 更偏核心与吸食
- `compressor` 拥有更强 suction / feed 脉冲

#### 方形

- 更偏壳体与碾压
- `prism` 比普通方块更适合 grind / cut

#### 三角

- 更偏钩挂与切开
- `blade` 比普通三角更凶，hook / cut 更高

### 4. 自动成长

成长不是开菜单选技能，而是自动长新节点。

流程是：

1. 吞食与碎片吸收积累 `growthBuffer`
2. 达到 `nextGrowthCost`
3. 调用 `growCluster()`
4. 内部调用 `addDebugNode({ template, silent: true })`
5. 从当前阶段的 `growthSequence` 中选模板加入结构

### 5. 拓扑生长时发生的事

当节点被加入时，系统会：

- 选扩张方向
- 选锚定邻居
- 计算局部槽位
- 自动生成主干 / 支撑连接
- 重建 formation
- 重置 pulse flow

所以节点增长不是“数量加一”，而是会真实改变结构骨架与运动姿态。

---

## 十二、捕食、附着与伤害系统

### 1. 当前不是传统攻击系统

当前 combat 不是“按下按钮 -> 发射伤害”。

它是基于节点接触与附着的 predation 系统：

- 接近
- 接触
- 判断是否可挂住
- 附着
- 咀嚼 / 撕裂 / 吸食
- 生成碎片
- 吞食结算

### 2. 三种 predation mode

#### `feed`

- 偏吸食
- 常见于圆形节点
- 更依赖 suction

#### `grind`

- 偏碾压 / 切削
- 常见于方形节点
- 更依赖 cut 与旋转

#### `hook`

- 偏钩住 / 撕裂
- 常见于三角节点
- 更依赖 grip 与 cut

### 3. 节点形状与角色的捕食倾向

当前 `sceneCombat.js` 中已经把不同节点的 predation profile 做了角色化：

- `compressor`：更强 feed / suction
- `prism`：更强 grind / cut
- `blade`：更强 hook / cut

### 4. prey 上的附着数据

每个 prey 会维护 `attachments`。

attachment 包含：

- `nodeIndex`
- `mode`
- `grip / cut / suction`
- `chewInterval`
- `depth`
- `life`

### 5. prey 的受击乘区不是固定的

当前 prey 伤害会吃到姿态判定。

典型逻辑包括：

- `bulwark` 更需要收缩压开
- `weakspot` 更需要绕后与打弱点
- `apex` 同时吃 compression / weakspot / encircle

这就是当前项目把“输出 check”转成“姿态 check”的关键部分。

### 6. 碎片与回收

prey 受击、撕裂或死亡时会生成 fragments。

当前 fragments 至少分为：

- `energy`
- 普通肉块类

它们会回流到：

- `energy`
- `growthBuffer`

### 7. devour 的正式回流

现在 prey 被吞掉后，已经会正式推进：

- 能量回复
- biomass 成长
- 阶段进度
- objective 晋级

这条链已经不再是纯演示性质。

---

## 十三、prey 生态系统

当前 prey 的行为重点不是“攻击玩家”，而是“逼玩家改变姿态”。

### 1. `skittish`

- 逃跑型
- 教玩家追和贴身咬

### 2. `school`

- 群聚型
- 为中后期扫荡快感服务
- 单体价值低，成群价值高

### 3. `bulwark`

- 抗压 / 反推型
- 会逼玩家先收缩再吃
- 用来防止“无脑铺开一路撞”

### 4. `weakspot`

- 弱点型
- 会保护脆弱角度
- 逼玩家包围、绕后、堵位

### 5. `apex`

- 综合终局型
- 同时吃 compression、weakspot、encircle
- 把前面学过的姿态一起串起来

### 6. 当前 prey 行为入口

主要在 `src/sceneEnemies.js`：

- `updateSpawns(simDt)`
- `spawnConfiguredPrey(...)`
- `createPrey(...)`
- `updatePrey(simDt)`

---

## 十四、正式 progression 与 gameplay 参数系统

### 1. 当前 progression 中枢

正式循环大部分集中在 `src/sceneProgression.js`。

它负责：

- 当前阶段读取
- runtime stage 缩放
- 资源校验
- growth 成本
- objective 刷新
- 阶段切换
- 胜利 / 死亡
- gameplay 参数读取

### 2. `getCurrentStageDef()` 的特殊性

这里非常关键：

当前程序不会直接把 `DEMO_STAGE_DEFS` 原样拿来跑，而是会在运行时构造一个“带 gameplay 全局倍率”的 stage 副本。

这意味着：

- `constants.js` 是静态设计稿
- `sceneProgression.js` 才是当前局实际生效值

因此如果你发现策划表和游戏里实际节奏不完全一致，先查这里。

### 3. 当前已接入的 gameplay 参数类别

这批参数已不只是面板里“显示出来”，而是已经真的接入运行逻辑。

#### 局内基础

- 最大能量池
- 开局能量比例

#### 阶段缩放

- `progressGoal` 倍率
- `metabolism` 倍率
- `spawnCap` 倍率
- `spawn density` 倍率
- `spawn interval` 倍率
- `maxNodes` 补正

#### 成长经济

- 成长基础成本
- 每节点增量
- 成本上限
- 长节点返还能量

#### 碎片收益

- energy 碎片回能
- 肉块回能
- 二者的 growthBuffer 回流

#### 代谢压力

- 代谢保底
- 节点耗能权重
- 爆发耗能权重
- 追猎耗能权重
- 舒张耗能权重
- objective 压迫耗能
- 收缩减负
- 捕食减负
- 低能阈值

#### 阶段切换

- 晋级回能
- 胜利停留时长
- 死亡停留时长

#### prey 强度

- `bulwark / weakspot / apex / school / objective` 生命倍率
- `bulwark / apex` 质量倍率
- 各类额外挂载上限

#### 姿态判定与伤害乘区

- compression assist
- weakspot assist
- archetype 受击公式各项倍率
- objective cutter 加成

---

## 十五、相机、HUD 与非文字可读性

### 1. 相机的设计目标

当前相机不是简单跟角色中心，而是服务于“侵袭感”：

- 鼠标会影响构图重心
- 集群朝向会前探
- 大体量时会被主体回拉
- 放大缩小时会保留空间呼吸感

### 2. 当前 HUD 的信息结构

当前 HUD 仍坚持无文字局内表达。

`sceneRender.js -> drawHud(g)` 主要表达：

- 屏幕中上主条：活体能量条
- 主条内部亮面：当前能量
- 主条总长度：当前容量与成长后体量
- 主条顶部薄膜：growthBuffer 推进
- 主条右端过载 flare：满能量继续进食时的额外成长反馈
- 主条下方阶段 pips：当前阶段与进度
- 底部中心圆环：当前姿态与 objective 紧张度
- 死亡 / 胜利覆盖层：直接在世界上盖反馈

最近一次 HUD 重构把旧的分段式能量条替换为“单体矩形 + 冲量阻尼”实现：

- 保留顶部中置、无文字、纯矩形的 jam 限制
- 能量扣减反馈改为整条收缩、轻微抽动、快速回稳，而不是持续规律摇摆
- 吞食 / 满能量过载 / 长节点都通过同一套 impulse-spring 状态驱动，避免频繁重建 Graphics

### 3. 当前场景可读性强化

渲染层已经承担了大量“世界内解释”工作：

- 阶段色板
- objective aura
- low-energy 全屏染色
- prey guard pulse
- weakspot 高亮
- predation links
- growth / victory 辉光

这部分后续可以继续做得更高级，但方向已经成立。

---

## 十六、开发工具：主菜单、存档、调参、编辑态

### 1. 主菜单与暂停

当前 DOM 菜单位于 `src/ui.js`。

支持：

- 开始新局
- 继续当前局
- 保存
- 读档
- 返回主菜单
- toast 提示

### 2. 单槽存档

当前存档是单槽设计。

存档 key 在 `src/constants.js -> STORAGE_KEYS.saveSlot`。

保存内容包括：

- 玩家核心状态
- chain
- topology
- activeNodes
- pulse state
- camera zoom
- runState

不保存的典型内容：

- 面板当前未应用的临时调参

### 3. 调参面板

当前调参面板默认显示。

只有显式设置：

```js
window.CORE_DEMO_DEBUG = false
```

时才会整体关闭。

### 4. 调参面板当前分组

当前面板分为：

- 主角驱动与技能
- 结构与约束
- 拓扑与连线
- 节点模板与植入
- 编辑与开发
- 镜头与呈现
- Gameplay 循环
- 调试与可视化

### 5. 当前面板支持的能力

- 搜索参数
- 分类折叠
- 单项重置
- 全部重置到当前基线
- 复制完整 JSON
- 复制差异 JSON
- 写入 `tuning-profile.json`
- 当前相对基线改动计数
- 浮动新增节点入口

### 6. 面板的基线加载顺序

当前调参基线顺序是：

1. 先载入 `tuning-profile.json`
2. 如果检测到历史 localStorage 调参，仅做一次迁移并写回 `tuning-profile.json`
3. 然后把结果快照为当前比对基线 `TUNING_DEFAULTS`

这意味着：

- “复制差异”比较的是“当前值 vs 当前 JSON 基线”
- “写入 JSON”会把当前值写入 `tuning-profile.json`，并把它设为新的比对基线

### 7. `file://` 行为

调参面板对 `file://` 打开做了兼容：

- 不会去同步 XHR 读取仓库 `tuning-profile.json`
- 会直接回退到 fallback，避免浏览器 CORS 噪音
- 也无法把改动写回 JSON（需要通过 `start-dev` 脚本启动本地服务）

### 8. 编辑态

当前点击节点或连线会进入编辑态。

编辑态包含：

- 慢放
- 环境氛围 overlay
- hover 高亮
- 节点拖拽
- 连线选择
- 框选
- 删点
- 删除选中
- 撤销

这套系统目前是“后续大改编辑器”的临时但够用基底。

---

## 十七、当前已接入的编辑态参数

这是当前后续开发很容易要找的一组参数。

它们都在 `tuning-panel.js`，并且已经接到 `sceneInput.js`。

### 1. 进入与慢放

- `enableClickToEditMode`
- `editTimeScale`
- `editDeleteTimeScale`
- `editAmbienceDamp`

### 2. 命中与拖拽

- `editNodePickRadiusPx`
- `editLinkPickRadiusPx`
- `editNodeDragThresholdPx`
- `editBoxSelectThresholdPx`

### 3. 删除与退场

- `editExitPaddingPx`
- `editDeleteHoldDuration`
- `editDeleteHoldRadiusBonusPx`

这意味着后续改编辑器手感时，不需要先硬改逻辑，很多入口已经可直接调。

---

## 十八、后续开发最常见需求应该改哪里

这一节是给“我现在就想动手改东西”的人看的。

### 1. 我想改主角移动手感

优先看：

- `src/sceneInput.js`
- `src/sceneMovement.js`
- `src/sceneTopology.js`
- `tuning-panel.js`
- `tuning-profile.json`

先调参，再动逻辑。

### 2. 我想改相机

优先看：

- `src/sceneInit.js` 中的 camera 相关函数
- `tuning-panel.js` 的 camera 分组

### 3. 我想改正式 progression 节奏

优先看：

- `src/constants.js -> DEMO_STAGE_DEFS`
- `src/sceneProgression.js`
- `tuning-panel.js -> Gameplay 循环`

### 4. 我想加新 prey archetype

最常见入口：

- `src/constants.js -> PREY_ARCHETYPE_DEFS`
- `src/sceneEnemies.js`
- `src/sceneCombat.js`
- `src/sceneRender.js`

### 5. 我想加新 stage

最常见入口：

- `src/constants.js -> DEMO_STAGE_DEFS`
- `src/sceneEnemies.js`
- `src/sceneProgression.js`
- `src/sceneRender.js`

### 6. 我想加新节点类型

最常见入口：

- `src/constants.js -> NODE_LIBRARY`
- `src/sceneCombat.js` 的 predation profile / pulse 行为
- `src/sceneTopology.js`
- `tuning-panel.js`

### 7. 我想改 HUD 或世界可读性

优先看：

- `src/sceneRender.js`
- `src/sceneProgression.js`

### 8. 我想重做编辑器

优先看：

- `src/sceneInput.js`
- `src/sceneRender.js -> drawEditOverlay()`
- `src/sceneTopology.js`
- `tuning-panel.js`

### 9. 我想改存档结构

优先看：

- `src/sceneSaveLoad.js`
- `src/storage.js`
- `src/constants.js -> STORAGE_KEYS`

### 10. 我想加新的开发工具

优先看：

- `tuning-panel.js`
- `src/ui.js`
- `index.html`

---

## 十九、几类典型开发任务的推荐工作流

### 1. 调一个手感问题

推荐顺序：

1. 找到对应调参项是否已存在
2. 用面板快速验证方向
3. 如果方向成立，再决定是否把它固化进 `tuning-profile.json`
4. 只有现有参数覆盖不了时，再改底层逻辑

### 2. 新增一类 prey

推荐顺序：

1. 先在 `constants.js` 定义 archetype 静态数据
2. 在 `sceneEnemies.js` 写行为
3. 在 `sceneCombat.js` 处理它吃到的受击逻辑
4. 在 `sceneRender.js` 补足可读性
5. 最后把 stage spawn rule 接进去

### 3. 新增一个节点角色

推荐顺序：

1. 先在 `NODE_LIBRARY` 补模板
2. 再决定：
   - 它的发力语义
   - 它的捕食语义
   - 它在 growthSequence 中何时出现
3. 最后暴露必要调参项

### 4. 重做编辑器

推荐顺序：

1. 先保护现有数据结构：`player.topology`, `activeNodes`, `links`
2. 再重构交互层：`sceneInput.js`
3. 再重构 overlay：`sceneRender.js`
4. 最后再扩展调参项和面板分组

---

## 二十、当前实现中的关键稳定性注意点

### 1. 不要在 Render 层改游戏状态

`sceneRender.js` 应只负责绘制与表现，不应承担真正的状态变更。

### 2. `DEMO_STAGE_DEFS` 不是最终运行值

当前 stage 会在 `sceneProgression.js -> getCurrentStageDef()` 中被 runtime 缩放。

### 3. `updatePredation()` 期间 prey 列表可能变化

因为 devour / objective 晋级会清空或移除 prey，predation 逻辑必须注意失效引用和中途数组变化。

### 4. 调参面板默认是开发态工具，不是玩家 UI

它服务开发效率，不代表正式发行形态。

### 5. 编辑态与慢放是“开发中枢能力”

后续即使大改交互，也建议保留：

- 慢放
- 选择
- 拖点
- 删点
- 撤销

因为这套能力对拓扑型角色开发极其重要。

---

## 二十一、后续开发建议的优先级

如果继续沿当前版本迭代，推荐优先级是：

### 第一优先级

- 继续放大 prey 逼姿态的设计
- 继续提升捕食反馈和 world readability
- 继续丰富阶段差异与 objective 体验

### 第二优先级

- 升级编辑系统
- 升级音效与脉冲反馈
- 升级相机演出

### 第三优先级

- 扩展节点角色类型
- 扩展更复杂的 prey 组合
- 扩展更高级的关卡布局

### 暂不建议优先投入

- 重型 meta progression
- 复杂技能树
- 传统数值 build
- 很重的 boss 演出

因为这些东西目前都会比“进一步放大已有核心”更容易分散项目力量。

---

## 二十二、用一句话描述当前项目给新成员听

如果要把当前项目讲给一个刚进组的人，最准确的版本是：

> 这是一个围绕“集群牵引移动”建立起来的短局生态捕食 demo。玩家输入的是意图场，而不是坐标；主角是一团由圆、方、三角节点组成的生物组织，通过脉冲巡游、节点抓地、连线张力、体积舒张和保形约束向前侵袭。正式循环已经包含四阶段 progression、猎物 archetype、能量与成长、objective 晋级、无文字 HUD，以及主菜单、存档、调参和慢放编辑态等完整开发工具。后续开发的主线，不是推翻这套东西重做，而是围绕它继续丰富 prey、阶段、反馈、编辑器和整体质感。  

