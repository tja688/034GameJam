# Biological Dynamics Demo - 技术架构文档

本文档记录当前 **Biological Dynamics** 浏览器 Demo 的代码结构、职责分层和主循环。项目现阶段已经从单纯验证“集群牵引移动手感”的 playground，升级为一个具备正式短局循环的可玩 Demo：

- 鼠标意图场驱动的集群牵引移动
- 四阶段生态推进
- 持续能量衰减与吞食回补
- 吞食成长与节点扩张
- 基于猎物生态类型的姿态博弈
- 无文字 HUD 与阶段化视听反馈

代码仍保持 Phaser 3 + Mixin 的轻量结构，方便继续在 GameJam 节奏里快速增删系统。

## 一、项目架构与组织

核心项目入口文件是 `index.html`，按照特定顺序加载所有模块。游戏业务逻辑被拆分至 `src/` 目录下，并通过原型的 `Object.assign` 方法组合 (Mixin 模式) 到核心游戏类 `CoreDemoScene` 中。

项目的目录核心速览：
```text
/
├── index.html            # 游戏入口，定义脚本加载顺序
├── tuning-profile.json   # 仓库内调参基线，随 Git 同步
├── tuning-panel.js       # 调参系统；默认仅在 `window.CORE_DEMO_DEBUG === true` 时显示 UI
├── README.md             # 本架构设计文档
└── src/                  # 游戏核心逻辑模块（解构自 app.js）
    ├── constants.js      # 全局常量：节点库、猎物 archetype、阶段配置、颜色和尺寸定义
    ├── utils.js          # 全局帮助函数：数学计算、绘图基础等
    ├── storage.js        # 数据持久化封装
    ├── ui.js             # 开发态菜单 UI；正式 demo 默认不显示，仅保留底层能力
    ├── scene.js          # CoreDemoScene 定义与 Phaser 生命周期入口
    ├── sceneInit.js      # 场景初始化、主循环、镜头基础状态与系统更新顺序
    ├── sceneProgression.js # 正式 demo 循环：阶段推进、能量、成长、目标、死亡与胜利状态
    ├── sceneSaveLoad.js  # 存档封装；现已覆盖 runState / growth / energy 等正式循环状态
    ├── sceneTopology.js  # 核心：局部网状节点算法设计、自动刚度生成与边缘计算
    ├── sceneInput.js     # 输入与编辑工具：正式 demo 中默认以鼠标意图场为主，调试编辑功能受 debug 开关控制
    ├── sceneMovement.js  # 动态运算：质心跟随、阻尼计算、形态布局与位置平滑
    ├── sceneCombat.js    # 吞食/附着/撕裂/碎片吸收；把猎物 devour 结果回流到 progression
    ├── sceneEnemies.js   # 猎物生态：按阶段配置刷出 skittish / school / bulwark / weakspot / apex，并负责行为更新
    ├── sceneRender.js    # 图形渲染：世界氛围、猎物状态、主角集群、无文字 HUD、阶段/胜利/死亡反馈
    └── main.js           # 组合全部 Mixin 并启动 Phaser 实例
```

## 二、模块边界与职责解析

为了解决原型初期由单文件产生的“高耦合”问题，我们把庞大的行为切割成不同的“子系统 Mixins”。这里详细列举每个主要子系统的边界：

### 1. 结构与网状拓扑系统 (`sceneTopology.js`)
* **职责**：维护节点列表(`chain` 和 `activeNodes`)及关系约束。
* **边界**：不涉及具体的图形渲染与鼠标键盘操作，只提供逻辑 API (`addTopologyEdge`, `removeTopologyEdge`, `relaxExpansionSlot`)。
* **核心控制**：`buildPartialMeshEdges` (生成部分网状支撑约束)。

### 2. 局部物理运动 (`sceneMovement.js`)
* **职责**：执行脉冲周期触发，计算质心拉力，更新节点锚点及其位移弹性。处理黄金角展开的数学模型。
* **边界**：不处理交互，只依赖来自 Input 或 Combat 注入的 `intent` 和拓扑结构带来的张力。

### 3. 输入与工具 (`sceneInput.js`)
* **职责**：处理鼠标世界坐标、距离圈层、爆发判定、体积舒张/收缩，以及开发态编辑工具。
* **边界**：正式 demo 下默认不启用点击进入编辑态；编辑拓扑、拖点、删点等行为只在 debug 模式开放。

### 4. 正式循环 (`sceneProgression.js`)
* **职责**：维护 `runState`，包括阶段索引、阶段进度、目标刷新、能量衰减、成长门槛、死亡、胜利与阶段切换反馈。
* **边界**：不直接处理底层物理解算，而是给 Enemy / Combat / Render 提供当前阶段的规则、色板和资源状态。

### 5. 猎物生态与吞食 (`sceneEnemies.js` + `sceneCombat.js`)
* **职责**：
  * `sceneEnemies.js` 依据阶段配置刷出不同 archetype 的猎物，并更新其学校行为、护体脉冲、弱点朝向等。
  * `sceneCombat.js` 负责节点附着、撕裂、咀嚼、碎片吸附，并依据 prey archetype 计算伤害倍率。
* **边界**：它们可以推动 `runState` 前进，但不会改变节点拓扑核心的牵引运动算法。

### 6. 生命周期与保存加载 (`sceneInit.js` + `sceneSaveLoad.js`)
* **职责**：`sceneInit.js` 组织每帧更新顺序，`sceneSaveLoad.js` 提供当前局状态的序列化/反序列化。
* **边界**：`sceneSaveLoad.js` 不负责运行规则，只负责保存已经存在的运行态。

## 三、核心主循环 (Main Loop)

一切核心驱动由 `sceneInit.js` 中的 `update(_, deltaMs)` 完成。它分离了系统帧与模拟物理帧：

1. **状态检查**：处理死亡重开、开发态菜单/暂停（若 UI 被启用）等高层状态。
2. **读入意图 (Intent)**：`handleModeInputs()` 和 `readIntent()` 把鼠标相对质心的位置转成 `stable / cruise / pursuit / hunt / burst`、集群体积态和镜头前探。
3. **集群模拟**：
   * `updatePulse()` 推进脉冲巡游
   * `updateFormation()` 执行锚定力、弹簧、排斥与 PBD
   * `updatePlayerState()` 更新朝向、稳定性、节奏衰减等基础属性
4. **生态推进**：
   * `updateSpawns()` 根据当前 stage 的 spawn rule 补充猎物
   * `updatePrey()` 更新 school / bulwark / weakspot / apex 行为
   * `resolvePreyNodeCollisions()` 处理节点与猎物接触、护体反推与附着入口
   * `updatePredation()` 推进附着咀嚼、伤害、碎片吸收与 devour
   * `updateRunState()` 统一处理能量衰减、成长、阶段目标刷新、阶段切换、死亡与胜利
5. **表现层**：
   * `updateEffects()` 更新环形闪光等表现粒子
   * `updateCamera()` 维持镜头前探和缩放
   * `updateDisplay()` 对节点显示层做缓冲
   * `render()` 统一绘制世界、猎物、集群、HUD 和结局反馈

## 四、当前正式循环的数据结构

### 1. `player`
在保留原有牵引移动状态的基础上，正式 demo 额外维护：

- `energy / maxEnergy`：短局生存压力
- `growthBuffer / nextGrowthCost`：节点成长资源与门槛
- `metabolism`：当前帧能量消耗速率
- `energyFlash / victoryPulse`：纯表现层脉冲反馈

### 2. `runState`
`sceneProgression.js` 维护的运行态，负责把“正式循环”从游玩层面串起来：

- `stageIndex`：当前阶段
- `stageProgress / totalProgress`：当前关卡与整局推进进度
- `objectiveSpawned / objectiveId`：晋级目标是否已刷新
- `spawnTimers`：按 spawn rule 独立计时
- `stageFlash / objectivePulse / growthPulse / lowEnergyPulse`：无文字反馈用的表现脉冲
- `complete / completeTimer`：终局状态

### 3. `prey`
猎物不再只是大小和形状的组合，而是扩展成带 archetype 的生态实体：

- `archetype`：`skittish / school / bulwark / weakspot / apex`
- `isObjective`：是否为当前阶段的晋级目标
- `energyValue / biomassValue / progressValue`：被吞食后分别回流到能量、成长和关卡推进
- `compressionNeed / weakArc / guardPulse`：分别服务于“逼收缩”“逼绕后/包围”“逼防反推”的核心博弈

## 五、本次升级的架构变化

### 1. 从 playground 刷怪改成 stage-driven 生态循环
- 变化文件：`constants.js`、`sceneProgression.js`、`sceneEnemies.js`
- 原因：需要把已有移动手感包进完整 demo 循环，而不是继续依赖随机刷怪验证。
- 结果：阶段配置、猎物生态、目标刷新和成长节奏都变成静态可配置数据。

### 2. 吞食结果正式回流到资源与推进
- 变化文件：`sceneCombat.js`、`sceneProgression.js`
- 原因：原有 predation 已经很好玩，但只是局部反馈；正式 demo 需要让它驱动能量、成长和过关。
- 结果：每次 devour / fragment absorption 都会推进 `energy`、`growthBuffer` 和 `stageProgress`。

### 3. UI 从开发文字界面退居二线
- 变化文件：`scene.js`、`ui.js`、`tuning-panel.js`、`index.html`
- 原因：遵守 GameJam 的无文字 gameplay 方向，并隐藏 playground 感太强的按钮/面板。
- 结果：正式 demo 默认自动进局，调试按钮和调参面板仅在 debug 标志开启时才显示。

### 4. 渲染层开始承担“可读性”而不是只做调试
- 变化文件：`sceneRender.js`
- 原因：没有文字说明时，世界和 HUD 必须主动表达饥饿、阶段、目标和弱点状态。
- 结果：加入阶段色板、目标 aura、护体脉冲、弱点高亮、无文字 HUD、死亡/胜利覆盖层。

## 六、开发与维护指南

任何涉及“游戏逻辑机制”的内容变动，如果跨责任区，必须遵循当前的模块化准则。

- **不能在 `scene Render` 文件处理伤害判定**；所有状态更改只应当发生在 `Movement` 或 `Combat` 阶段。
- **如果有新游戏节点**：需要更新 `constants.js` 中的 `NODE_LIBRARY`，并检查 `sceneInput.js` / `sceneProgression.js` 的成长逻辑是否需要接入。
- **如果新增阶段或猎物类型**：优先更新 `constants.js` 中的 `DEMO_STAGE_DEFS` / `PREY_ARCHETYPE_DEFS`，其次再补 `sceneEnemies.js` 和 `sceneCombat.js` 的行为与伤害规则。
- **在 `UI.js` 修改界面**：注意它的事件回调只是发送指令至逻辑层，不直接改变底层的游玩时内部数据结构。
- **添加全新的子系统**：如果在当前子系统（例如 meta progression、关卡编辑器）无处归口，则应当新建对应的 `sceneXxx.js`，按 `SceneXxxMixin` 抛出并在 `main.js` 中注册。

使用这种按功能分离到混合 (Mixin) 的方式，使得所有引擎钩子在跨系统调用时可以直接通过 `this.` 互通，既保持了单体调用的便利性，又实现了项目架构的清晰拆解与阅读指引。
