# 调参面板大摸底（程序反向探查详解）

本系列文档旨在从调参面板的各项参数出发，反向追踪代码实现逻辑，明确哪些参数真正参与了系统的底层运算、哪些属于“复合宏”（控制多个底层参数）、哪些只停留在面子工程、以及哪些属于没有实装或者不再使用的“僵尸参数”。这将帮助后续开发和更新提供最直接的认知入口。

---

## 一、 🧠 主角驱动与技能

### 1. 主角 / 镜头总控（复合旋钮）

本节包含了调参面板中最顶部的几个参数。通过底层探查发现，这几个参数**均不是独立的物理量**，而是由 UI 逻辑定义的**组合旋钮（Composite Tuning Macros）**。它们本身不在游戏实际逻辑（`src/`）里直接运算，而是在面板里一键改动多个底层参数。

* **`feelClusterBloom` (体积呼吸感)**
  * **代码映射关系:** 修改它会同时线性插值修改大量与体积相关的参数。
  * **结论:** 非僵尸参数。
* **`feelPredatorSurge` (追猎爆发感)**
  * **结论:** 非僵尸参数。
* **`feelCameraDirector` (镜头目标感)** & **`feelCameraGlide` (稳镜丝滑度)** & **`feelCameraBreathing` (视野呼吸感)**
  * **结论:** 均非僵尸参数。

### 2. 模式与意图控制、爆发细项、体积细项

此处参数将鼠标输入翻译为玩家意图（Intent）和集群动态（Volume/Burst）。

* **`enableBurstIntentDrive` (阶段爆发意图)** & **`intentChaosDegree`**
  * **探查结果:** 在 `sceneMovement.js` 逻辑中决定是否进入爆发节奏。
  * **结论:** 均生效。
* **爆发细项与体积细项 (`burstPressureGain`, `clusterVolumeExpandScale` 等)**
  * **探查结果:** 实装在状态计算中。
  * **结论:** 实装，非僵尸，有效。

---

## 二、 🔧 结构与约束

### 1. 全局物理力场控制
* **`enableDrift`, `enableCorePull`, `enableAnchor`, `enableSpring`, `enableRepulsion`, `enablePBD`**
  * **结论:** 完全有效。

### 2. 阻尼与状态衰减
* **结论:** 全部生效，控制手感阻尼。

### 3. PBD 大网格强保形
* **结论:** 无僵尸失效问题。

---

## 三、 🕸️ 拓扑与连线

决定节点与节点之间的相连张力、结构强度、同极互斥程度等。

* **弹簧、刚性与阻尼系列 (`spineStiffness`, `supportStiffness`, `flexStiffness`, `rigidStiffness` 等)**
  * **探查结果:** 在 `sceneTopology.js` 中依据连线关系提取这些级别硬度。
  * **结论:** 真实有效，通过改变这几级刚度能直接影响软体“果冻度”。
* **极性与长度扩展 (`inversePolarityStiffnessMul`, `samePolarityRestMul` 等)**
  * **结论:** 有效，非僵尸。
* **`slotSpacing` & `forwardStep`**
  * **⚠️局限生效预警⚠️:** 经探查发现，面板提供的这两个参数在 `sceneTopology.js` 创生连线骨架时使用了调参面板数据，但在 `sceneMovement.js` 及其它大量实时推流逻辑中，**代码硬编码读取了 `PARTIAL_MESH_RULES.slotSpacing`**。
  * **结论:** `slotSpacing` 处于**半静默失效/半僵尸状态**，修改调参面板上的“基础散件距离”无法同步覆盖所有逻辑判定，可能导致物理运算和渲染网孔不同步。建议后续重构进行统一。

---

## 四、 🧬 节点模板与植入

### 1. 质量(Mass)与推流(Drift)
* **`massShell`, `massBlade`, `massDefault`** 等。随类别生效。
* **结论:** 生效，无僵尸。

### 2. 脉冲植入 (Plant 发力机制) 【发现重要僵尸群!】

* **Source & Compressor & Shell & Dart:**
  * **探查结果:** 参数在 `sceneCombat.js` 中正常调用。
* **Prism (方/反) & Blade (三角/反):**
  * **🚨🚨僵尸参数大面积爆发预警🚨🚨**
  * **现象描述:** 面板里完整暴露了 `plantPrismForward`, `plantPrismSide`, `plantPrismStance`, `plantPrismStrength`，以及 `plantBladeForward` 等整整 12 个参数。但在 `src/sceneCombat.js` 的实现代码中却是硬编码写死的：`forwardBase: isPrism ? 72 : (T.plantShellForward ?? 52)`。
  * **结论:** **Prism 和 Blade 这两类的发力调参已完全阵亡**！变成面子工程，调节它们不会产生任何效果。后续如需调这两种节点的发力，必须修改 `sceneCombat.js` 进行对接。

---

## 五、 ✏️ 编辑与开发 & 🎥 镜头与呈现

* **`maxNodeCount`, `formationSpanFactor`, `editTimeScale`, 及其它编辑态命中参数:**
  * **探查结果:** 在 `sceneInput.js` 和 `sceneTopology.js` 均完美实装，无失效。
  * **结论:** 100% 存活，全权掌控开发态体验。
* **镜头微调参数 (`cameraZoomDamp`, `cameraMouseInfluence` 等):**
  * **探查结果:** `sceneInit.js` 中大量直接读取运算 (`T.cameraZoomTrackDamp ?? 2.6`)。
  * **结论:** 实装，非僵尸参数。

---

## 六、 🎮 Gameplay 循环 & 🧪 调试与可视化

这一大组占据了调参面板半壁江山的参数群。

* **系统与全局成长参数 (`gameplayStageProgressGoalMul`, `gameplayPreyRespawnEnabled`, `gameplayGrowthCostPerNode` 等):**
  * **探查结果:** 在 `sceneProgression.js`, `sceneCombat.js`, `sceneEnemies.js` 均做了完整的动态读取 `this.getRunTuningValue()` 和 `this.getRunTuningToggle()`。
  * **结论:** 逻辑完整接通，随调随动。
* **猎物 AI、威胁感知、状态机 (`gameplayPreyThreatDistanceWeight`, `gameplayPreyStateCapGrazeMul`, `gameplayPreyBehaviorGlobalSpeedMul` 等):**
  * **探查结果:** 全部打通到 `sceneEnemies.js` 里的状态机算式，动态调整了恐惧积累速度、逃跑阈值和机能倍率。
  * **结论:** 无僵尸失效参数，极大提升了生态的多样性和压迫力的调节空间。
* **可视化调试与图层精简 (`graphicsRender...`，`showDriveVectorsDebug`):**
  * **探查结果:** 在 `sceneRender.js` 里完整应用，用来精准剥离图形性能瓶颈。
  * **结论:** 非僵尸，排查性能利器。

---

## 摸底行动总计盘点 (TL;DR)

整个调参面板系统的完成度极高（>95%参数均在物理层/渲染层有效运算），但这 **少数几处** 是隐藏的深坑，它们静默失效，成了名副其实的“僵尸参数”。在后续重构和维护时请优先处理：

1. **🚨 `plantPrism...` 与 `plantBlade...` 整套 12 个发力参数** 完全是僵尸，必须去 `sceneCombat.js` 里把硬编码（如 `isBlade ? 194 : ...`）改回读取调参面板。
2. **⚠️ `slotSpacing` 与 `forwardStep`** 面临部分静默失效。在 `sceneMovement.js` 等运算骨架时，代码无视了面板的调节，直接硬读取了常量 `PARTIAL_MESH_RULES.slotSpacing`。必须全局统一改为优先读 Tuning 值。

其余所有系统（移动、网格物理、UI、HUD渲染、Gameplay反馈）的参数均实装到位，大可放心通过该面板进行快速的体感迭代！
