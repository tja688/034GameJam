# Biological Dynamics Core Demo - 技术架构文档

本文档是敏捷开发游戏项目 **Biological Dynamics** 的代码设计、模块架构及快速索引。游戏核心理念强调极简结构、生物模拟和模块化的底层实现。通过解耦巨大的单体脚本，当前项目采用了模块化的 Mixin 架构组合主游戏场景，提高了可维护性和迭代速度。

## 一、项目架构与组织

核心项目入口文件是 `index.html`，按照特定顺序加载所有模块。游戏业务逻辑被拆分至 `src/` 目录下，并通过原型的 `Object.assign` 方法组合 (Mixin 模式) 到核心游戏类 `CoreDemoScene` 中。

项目的目录核心速览：
```text
/
├── index.html            # 游戏入口，定义脚本加载顺序
├── tuning-profile.json   # 仓库内调参基线，随 Git 同步
├── tuning-panel.js       # 独立运行的调参UI，往全局注入 TUNING 配置
├── README.md             # 本架构设计文档
└── src/                  # 游戏核心逻辑模块（解构自 app.js）
    ├── constants.js      # 全局常量：颜色、质量、角度、字典等
    ├── utils.js          # 全局帮助函数：数学计算、绘图基础等
    ├── storage.js        # 数据持久化封装
    ├── ui.js             # 游戏内叠加UI（暂停菜单、消息提示）
    ├── scene.js          # CoreDemoScene 的类定义与生命周期入口 (create, resize)
    ├── sceneInit.js      # 数据初始化模型、脉冲轨道分配与主循环 update 控制
    ├── sceneSaveLoad.js  # 复杂游戏状态的导入导出与存档恢复
    ├── sceneTopology.js  # 核心：局部网状节点算法设计、自动刚度生成与边缘计算
    ├── sceneInput.js     # 键鼠交互：编辑模式下的节点拖拽、连线生成移除等
    ├── sceneMovement.js  # 动态运算：质心跟随、阻尼计算、形态布局与位置平滑
    ├── sceneCombat.js    # 交互实现：护盾执行、近战挥砍、飞弹与扇形爆炸逻辑
    ├── sceneEnemies.js   # 敌人系统：刷怪机制、单位运动与集群碰撞判定
    ├── sceneRender.js    # 图形渲染系统：多层级绘制图形实体及特效、HUD
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

### 3. 编辑态交互控制 (`sceneInput.js`)
* **职责**：完全负责处理鼠标按下、移动与游戏内“场景坐标系”的关系换算。
* **边界**：拦截原生输入，根据操作行为向 Topology 系统发送建立/销毁连线指令，并临时覆盖节点位置，实现场景内结构的直接捏造。

### 4. 敌群决策逻辑 (`sceneEnemies.js` & `sceneCombat.js`)
* **职责**：包含生成不同阵型敌机的规则，以及敌机运动向玩家核心靠近的索敌逻辑。玩家的进攻反击逻辑也在此执行。
* **边界**：依赖实体列表 (`enemies`)，仅涉及碰撞结算，并不操作节点网络底层的状态变迁。

### 5. 生命周期与保存加载 (`sceneSaveLoad.js` & `sceneInit.js`)
* **职责**：提供完全静态可序列化的 `buildSaveData` 数据模型及逆向构建 `applySaveData` 引擎状态重建的业务封装。主逻辑循环通过 `update` 每帧分发。

## 三、核心主循环 (Main Loop)

一切核心驱动由 `sceneInit.js` 中的 `update(_, deltaMs)` 完成。它分离了系统帧与模拟物理帧：

1. **状态检查**：判定是否处于菜单模式、暂停状态、或死亡惩罚周期。
2. **读入意图 (Intent)**：调用 `sceneInput.js -> handleModeInputs()` 及 `readIntent()` 更新全局方向向量。
3. **拓扑反馈**：`syncTopologySlotLayoutMode()` 设置目前的规则体系支撑力度。
4. **模拟推进 (Simulation Step)**：按物理缩放 `simDt`，顺序依次更新：
   * 脉冲流向推进 (`updatePulse`)
   * 重拉节点和变形计算 (`updateFormation`)
   * 核心基础属性判定 (`updatePlayerState`)
   * 剩余表现更新（回响、投射物、敌人索敌、敌群碰撞等）
5. **视窗追踪与绘制**：根据最终态进行画幅适配及所有 Layer 的覆盖重绘 (`render`)。

## 四、开发与维护指南

任何涉及“游戏逻辑机制”的内容变动，如果跨责任区，必须遵循当前的模块化准则。

- **不能在 `scene Render` 文件处理伤害判定**；所有状态更改只应当发生在 `Movement` 或 `Combat` 阶段。
- **如果有新游戏节点**：需要更新 `constants.js` 中的 `NODE_LIBRARY` 及 `saveLoad.js` 的序列化规则。
- **在 `UI.js` 修改界面**：注意它的事件回调只是发送指令至逻辑层，不直接改变底层的游玩时内部数据结构。
- **添加全新的子系统**：如果在当前子系统（例如成就模块）无处归口，则应当新建 `sceneAchievements.js`，按 `SceneAchievementsMixin` 抛出并在 `main.js` 最后进行 `Object.assign`。 

使用这种按功能分离到混合 (Mixin) 的方式，使得所有引擎钩子在跨系统调用时可以直接通过 `this.` 互通，既保持了单体调用的便利性，又实现了项目架构的清晰拆解与阅读指引。
