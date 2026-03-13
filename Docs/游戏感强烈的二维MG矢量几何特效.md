# 超高质感、游戏感强烈的二维MG/矢量几何特效实现研究报告（Phaser 3）

## 执行摘要

本报告聚焦“超高质感、游戏感强烈、节奏紧密刺激”的 **2D 平面 MG 特效 / 矢量几何特效**，将其拆解为可落地的三层体系：**视觉语言（形状+配色+层次）→ 动作范式（曲线+节拍+能量观）→ 技术管线（Phaser3 的粒子 / Graphics / Mesh / RenderTexture / Shader / Tween 组合）**。Phaser 3 作为 Web（桌面+移动）优先的 2D 引擎，具备粒子系统、RenderTexture、Mesh 与 WebGL 渲染管线扩展能力，可在浏览器环境中实现高密度表现与较强的可配置性；同时必须正视移动端约束：**draw call、blend mode 触发的 batch flush、Graphics 动态多边形分解开销、WebGL1 FBO 抗锯齿限制** 等。citeturn0search14turn0search1turn6search19turn5search6

落地策略上，推荐以“**几何风=纹理化**”为核心：把常用几何火花、环、线、三角、十字星等 **先用 Graphics 或 SVG 生成并烘焙为纹理（generateTexture / SVG→Texture）**，在运行时尽量用 **Sprite / Particle** 走批处理；少量高价值镜头级效果再用 **RenderTexture（拖影/擦除）、Mesh（条带/扭曲）、PostFX/Shader（闪白、色偏、扫描、Bloom/Glow 类）**。这样既保留“矢量质感”，又能把性能风险压在可控范围内。citeturn0search1turn15view0turn0search2turn1search0turn6search10

在节奏反馈方面，本报告给出 3 类关键事件（扫荡、击杀高价值目标、通关）的 **毫秒级时间线** 与“视觉-音效-震动-镜头”联动建议，并提供 **可复用特效模板库（≥8个）** 的参数表与伪代码接口，便于直接交给 AI 或工程团队按模板实现与迭代。对“几何节点/脉冲生物”题材（你们策划案强调的“节点脉冲、舒张收缩、吞食晋级目标强反馈”）也给出对应的特效落点（脉冲、吞食吸附、晋级爆发、镜头前冲）。fileciteturn0file0

---

## 视觉与动作特征拆解

### 视觉元素模块化清单

要做到“MG感强烈 + 游戏感强烈”，最有效的方法是把特效拆成可复用的**形状原语（Shape Primitives）**与**构图模板（Composition Patterns）**，并用“层级”制造质感，而不是靠复杂贴图。

**常见矢量几何元素（建议做成可烘焙纹理+可参数化）**  
方形/矩形（块、条、格）、圆形/圆环（Shockwave、锁定圈、能量环）、三角形（碎片、指向、爆散）、线段/折线（速度线、切割线、扫描线）、十字星/星芒（命中火花、暴击闪）、点阵（粒子噪点/火花）、扇形/弧（挥砍弧光、扫荡弧）、井字/网格（科技感 UI）、多边形（护盾/范围提示）。“几何分层”是关键：**实心层（主体）+ 描边层（可读性）+ 外发光/残影层（能量）+ 噪点层（细节）**。

**颜色与纯色主体策略（高质感不等于多颜色）**  
1) **主体纯色 + 少量点睛色**：大部分面积保持 1 个主色（或同色系 2 阶），仅在“命中点/晋级/暴击”使用强对比点睛色，形成节奏峰值。  
2) **冷暖对撞**：底色冷（蓝/青/紫）时，反馈色选暖（橙/黄/粉）；反之亦然，保证“刺激感”来自对比而不是复杂纹理。  
3) **强对比可读性优先**：UI/信息类图形建议至少达到可辨识对比度门槛（文本通常 4.5:1；非文本有意义图形常见建议 3:1），以免在复杂背景下“质感=看不清”。citeturn5search0turn5search28turn5search20  
4) **少用渐变，多用“层叠”模拟质感**：WebGL 里渐变要么是纹理要么是 shader；若要保持矢量感，优先用 2~3 层半透明形状叠加出“渐变错觉”。

**构图与层次（街机/爽感的视觉语法）**  
- **中心爆发型**：命中/击杀常用。“中心点清晰 + 向外扩散的环/碎片 + 方向性速度线”。  
- **方向强调型**：冲刺、挥砍、扫荡。“主方向 1 条强线 + 两侧弱线 + 尾迹衰减”。  
- **框定/标记型**：高价值目标、晋级目标。“环 + 角标（L形）+ 频闪”。  
- **屏幕级强调**：通关/大爆发。“短闪白/闪色 + 轻微镜头冲击 + 大环扩散 + 余韵噪点”。Phaser Camera 自带 Flash/Shake 等效果，可作为屏幕级强化的低成本手段。citeturn1search2turn1search18  

### 动作范式与示例缓动曲线（含参数范围）

下面给出最常见、最“游戏感”的动作范式。每个范式都建议拆成 **主运动（位置/尺度）** 与 **能量衰减（alpha/发光/粒子密度）** 两条曲线：主运动负责“爽点”，能量衰减负责“质感”。

**爆发—衰减（Burst → Decay）**  
- 典型用途：命中火花、爆炸碎片、能量环。  
- 曲线：主尺度 `easeOutExpo` / `easeOutCubic`；透明度 `easeOutQuad`（更快消失显得利落）。Phaser 内置 Easing 命名空间提供大量缓动函数可直接用。citeturn3search1turn1search1  
- 参数建议：  
  - 总时长：80–220ms（命中）；220–600ms（爆炸/通关）  
  - scale：0.6→1.0（轻反馈）、0.8→1.4（重反馈）  
  - alpha：1.0→0（末段 30% 时间快速归零）  
  - 粒子数量：6–24（轻）、24–80（重）  
- Phaser 粒子系统支持在配置里为 scale 指定 start/end 与 ease，例如 scale: {start:0, end:1, ease:'bounce.out'} 这类形式（非常适合 Burst→Decay + Q 弹）。citeturn2search6turn0search8  

**Q 弹（Pop / Overshoot）**  
- 典型用途：暴击字样、拾取、击杀确认、UI 弹出。  
- 曲线：`Back.Out`（一次过冲）或 `Elastic.Out`（多次回弹）。  
- 经验参数：  
  - 过冲幅度：目标值的 10%–35%（例如 scale 1.0 过冲到 1.1~1.35 再回落）  
  - 时长：120–240ms（越短越“硬朗街机”）  
- 注意：若用 UI 同步节拍，建议把回弹次数限制在 1 次（Back.Out），多次弹性会拖节奏。

**反弹（Bounce / Hit-stop Aftershock）**  
- 典型用途：护盾受击、弹跳式提示、节奏音符击中。  
- 曲线：`Bounce.Out`（末端多次触底）。  
- 参数建议：  
  - 时长：140–260ms  
  - 位移幅度：4–18px（UI），8–36px（世界物体）  
  - 反弹次数：2–4 次体感最佳（过多显得软、拖沓）

**节拍同步（Beat Sync / Strobing）**  
- 典型用途：高价值目标标记、扫描圈、危险提示。  
- 曲线：`Stepped`（阶梯闪烁）或 `Sine.InOut`（呼吸）。Phaser Easing 里有 Stepped 等函数。citeturn3search1  
- 参数建议：  
  - BPM 适配：把时长量化到 1/4 拍（例如 120BPM → 500ms/拍；1/4拍≈125ms）  
  - 闪烁 duty：亮 40% / 暗 60%（更紧张）或亮 60% / 暗 40%（更醒目）  
  - alpha：0.2–1.0（不要完全归零，否则会“断”）

**瞬间位移（Teleport / Snap + Smear）**  
- 典型用途：冲刺、闪避、吞食瞬吸。  
- 技法：位置“瞬移”本身不需要 tween，而是 **用 1–2 帧的“拖影/切片/速度线”欺骗**：  
  - RenderTexture 拖影（把前一帧或残影画进 RT）是低成本实现方式，Phaser 示例中就常用 RenderTexture 叠画实现 Trail。citeturn6search0turn0search2  
- 参数建议：  
  - 拖影持续：120–260ms  
  - 拖影层数：6–18 次采样（按距离自适应）  
  - 颜色：主色偏亮一档 + ADD/SCREEN（但注意 blendMode 会触发 batch flush，需谨慎）。citeturn5search6turn5search30  

---

## Phaser 3 技术实现方案与组件化 API

### 总体架构：把“特效”当成可播放的可配置对象

Phaser 3 的粒子、Tween、Shader、RenderTexture 都是“对象+管理器”的模式：粒子由发射器控制池；Tween 由 TweenManager 更新；Shader/后处理基于 Pipeline；RenderTexture 是动态纹理+显示对象组合。citeturn0search8turn1search1turn6search10turn0search2  
建议在项目内统一成 **VFXManager**：  
- 对上层：`play(name, x, y, opts)`  
- 对下层：复用对象池、统一时间线、统一层级（depth）、统一 quality LOD

下面用 Mermaid 给出推荐流程（“请求→实例化→播放→回收”）：

```mermaid
flowchart LR
  A[Gameplay Event<br/>hit / kill / clear] --> B[VFXManager.play(name, x, y, opts)]
  B --> C{Template Registry}
  C -->|Particles| D[ParticleEmitter / Manager]
  C -->|Sprites| E[Sprite / Atlas Frames]
  C -->|Graphics| F[Graphics -> generateTexture -> Sprite]
  C -->|RenderTexture| G[RT Trail / Composite]
  C -->|Mesh| H[Mesh Ribbon / Warp]
  C -->|Shader| I[PostFXPipeline / Shader GO]
  D --> J[Timeline + Tweens]
  E --> J
  F --> J
  G --> J
  H --> J
  I --> J
  J --> K[Auto-despawn / Pool Return]
```

### Phaser 3 各模块的“最强组合拳”

#### 粒子系统（Particles）：几何火花的主力

Phaser 粒子发射器由配置对象驱动，可用多种值格式（固定值、随机范围、start/end 插值、回调等），适合做命中火花、碎片、噪点、能量逸散。citeturn0search8turn6search12  
关键点：  
- “爆发”用 `explode()`：会切到 explode 模式（frequency=-1）一次性释放粒子。citeturn6search20turn6search9  
- 直接在粒子配置中做 `scale: {start, end, ease}` 等，可以把大量动效从 Tween 转移到粒子系统内部，减少对象数量与 tween 数。citeturn2search6  

示例：一个“十字星火花 + 三角碎片”的爆发（伪代码，TypeScript 风格）：

```ts
// 预先准备：用 Graphics 或 SVG 烘焙出几何贴图帧：sparkX, triShard, dot
// 然后统一放入同一个 atlas，保证批处理机会更大（同纹理）citeturn5search3turn5search31

function playHitBurst(scene: Phaser.Scene, x: number, y: number, colorTint: number) {
  const particles = scene.add.particles(x, y, 'vfxAtlas', {
    frame: ['sparkX', 'triShard', 'dot'],
    quantity: 18,              // 12–24：移动端也较稳
    lifespan: { min: 90, max: 160 },
    speed: { min: 120, max: 520 },
    angle: { min: 0, max: 360 },
    rotate: { min: 0, max: 360 }, // 三角碎片更有“动感”
    scale: { start: 0.9, end: 0, ease: 'cubic.out' },
    alpha: { start: 1, end: 0, ease: 'quad.out' },
    tint: colorTint,
    blendMode: Phaser.BlendModes.ADD, // 亮能量（注意批次刷新风险）citeturn5search6turn5search30
  });

  // 关键：爆发而不是持续 flow
  particles.explode(18, x, y); // explode 行为见文档解释citeturn6search20

  // 自动回收：用 delayedCall 或 emitter.stop() + destroy
  scene.time.delayedCall(220, () => particles.destroy());
}
```

#### Graphics：用来“造形”，而不是用来“每帧画”

Graphics 在 WebGL 下会把图形数据分解为多边形，这个过程对复杂形状很昂贵；如果图形不怎么变化，官方建议调用 `generateTexture` 把 Graphics “烘焙”为纹理，再给 Sprite/粒子使用。citeturn0search1turn0search9  
因此推荐工作流：  
1) Graphics 画出“环/星/角标/箭头/条”等基础形状  
2) `generateTexture('key', w, h)`  
3) 销毁 Graphics（或保留作编辑器模式）  
4) 运行时用 Sprite/Particles 批处理显示

示例：烘焙一个“圆环 Shockwave”纹理：

```ts
function bakeRingTexture(scene: Phaser.Scene, key: string, radius: number, thickness: number, color: number) {
  const g = scene.add.graphics();
  g.lineStyle(thickness, color, 1);
  g.strokeCircle(radius, radius, radius - thickness * 0.5);
  g.generateTexture(key, radius * 2, radius * 2); // 官方建议：静态图形烘焙提升性能citeturn0search1
  g.destroy();
}
```

#### RenderTexture：拖影、擦除、合批“神器”

RenderTexture 是“Dynamic Texture + Image GameObject”的组合：你可以把很多对象画到这一个动态纹理里，再作为单个对象显示。citeturn0search2turn0search22  
典型用途：  
- 冲刺拖影（trail）  
- “吞食吸附轨迹”（连续画点/线到 RT，形成可控轨迹）  
- 批量合成（把复杂 UI/VFX 合到一张纹理减少 draw call）

注意一个关键限制：在 WebGL1 下，RenderTexture 内部使用的 FrameBuffer **不能抗锯齿**，画 Shapes/Graphics 到 RT 时边缘可能显得锯齿明显（这是 WebGL1 的技术限制）。citeturn6search19  
应对：  
- 尽量向 RT 绘制“已经是纹理的 Sprite”（而不是 Graphics 原始矢量）  
- 或者用“2x 分辨率 RT → 缩放显示”做伪超采样（成本可控时）

Phaser 示例“Trail”就是 RT 叠画的经典用法，可作为你们“瞬间位移/冲刺/吞食拉扯”的直接参考。citeturn6search0turn6search11

#### Mesh：条带、能量带、扭曲的高级形态

Mesh GameObject 可以渲染一组纹理顶点并对其进行变换，适合做“能量条带/丝带/扭曲拖尾”。citeturn1search0turn1search16  
在“几何风特效”里，Mesh 的价值主要是：**用少量顶点做出“连续带状”的高级动感**，比“用很多粒子拼出一条带”更省 draw call 与更稳定。

建议用法：  
- 贴图用你烘焙的“白色条带/带软边的矩形”，再用 tint 控色  
- 每帧只更新少量顶点位置（比如 8–24 个点形成一条带）  
- 结合 Tween 做长度/宽度/alpha 的节奏变化

#### Shader / Pipelines：屏幕级“高级质感”的关键

Phaser 的 Shader GameObject 是一个带自定义 shader 的 quad；由于其工作方式，你不能直接改它的 alpha 或 blend mode，需要通过 uniforms 自己控制。citeturn6search28  
更推荐的屏幕级做法是 **PostFXPipeline**：典型可做 bloom、blur、color manipulation 等后处理；官方说明它通过把对象渲染到 Render Targets，再应用 shader 效果返回主渲染器。citeturn6search10turn6search13  
自定义 pipeline 可以通过 PipelineManager 添加注册（Phaser 渲染器的 PipelineManager 明确支持 add 自定义 pipeline）。citeturn0search3  

落地建议（按性价比排序）：  
1) **优先用内置 FX / PostFX** 做“闪白、色偏、像素化、Glow/Bloom”，把成本压到最小（Phaser 3.90 的 FX / PostFX 体系就是为此服务）。citeturn6search32turn6search10turn6search18  
2) 需要“扫描线/冲击波扭曲/径向模糊”再上自定义 PostFXPipeline（参考官方 Custom Post Fx Pipeline 示例）。citeturn6search2turn0search15  

#### Tween：用更少的 Tween 做更强的节奏

TweenManager 是 Scene 插件，用配置对象创建 tweens，专门负责随时间修改目标属性。citeturn1search1turn1search5  
工程建议：  
- **短促（<250ms）** 的弹性/冲击用 Tween  
- 大量重复的小粒子动效尽量交给粒子系统（减少 tween 数量）  
- 用 **Timeline**（如果你们封装）统一各层触发，保证节奏一致

### SVG / 矢量路径与几何生成器：动态造形的两条路

#### 路线 A：Loader.svg → 直接把 SVG 渲染成纹理（推荐入门）

LoaderPlugin 提供 `this.load.svg(key, url, svgConfig)`：加载完成后会把 SVG 渲染为位图纹理并放进 Texture Manager；还支持通过 `svgConfig` 指定 width/height 或 scale（scale 优先）。citeturn15view0turn3search0  
这条路的优点：**美术可控、工程简单、可批处理（当你把多个 SVG 烘焙到 atlas 或统一纹理策略时）**。

示例：

```ts
// preload
this.load.svg('vfx_ring', 'assets/vfx/ring.svg', { scale: 2.0 }); // svgConfig 支持 scale/width/heightciteturn15view0

// create
this.add.image(x, y, 'vfx_ring');
```

补充：官方也提示“SVG 文件类型只在包含该 file type 的 Phaser 构建中可用，默认 build 有但自定义 build 可能被排除”。citeturn2search0turn15view0

#### 路线 B：解析 SVG path → 采样点 → 几何化（适合“程序化形状”）

当你希望“形状可随玩法实时变形”（例如根据速度拉长、根据连击扭曲），SVG 直接位图化会丢失“路径结构”。这时可以用 `svg-path-properties`：可计算路径长度、按长度取点，适合把 path 采样成点序列。citeturn2search3turn2search11  
采样后你可以：  
- 用 Graphics 画折线/多边形（再决定是否 generateTexture）  
- 或构建 Mesh（把点序列变成带状三角形 strip）

---

## 性能与优化策略（移动端与低端设备重点）

### 关键瓶颈地图：你在“矢量特效”里最容易踩的坑

**Graphics 动态绘制很贵**  
WebGL 下 Graphics 会被分解为多边形，复杂形状尤其昂贵；静态图形应尽量 generateTexture 烘焙为纹理使用。citeturn0search1turn0search9  

**BlendMode 会打断批处理（draw call 上升）**  
Phaser 文档明确指出：Blend modes 在 Canvas/WebGL 以及浏览器间表现不同；更关键的是 **遇到新的 blend mode 会导致 WebGL batch flush**，所以要谨慎使用和切换频率。citeturn5search6turn5search30  

**RenderTexture 在 WebGL1 下没有 MSAA**  
在 WebGL1 下 FrameBuffer 不能抗锯齿，Shapes/Graphics 画进 RT 可能边缘锯齿明显，这是技术限制。citeturn6search19  

**移动端渲染管线差异**  
PipelineManager 提到 Mobile Pipeline 负责“移动端单纹理绑定渲染”，这意味着在移动端更要强调“同纹理/同 pipeline/少状态切换”的策略。citeturn0search3  

### 具体可执行的优化清单

**批处理与 Draw Calls（最优先）**  
- 把常用几何元素烘焙到同一张 atlas（或同一 Texture）里，粒子与 sprite 共用纹理，减少纹理切换。Phaser 的纹理系统以 Texture/Frame 的概念组织 sprite sheet / atlas。citeturn5search3turn5search31  
- 统一 blend mode：多数特效默认 NORMAL；只有“能量高光层”使用 ADD/SCREEN，并尽量把它们集中在同一层渲染，避免频繁切换导致 batch flush。citeturn5search6turn5search30  
- 能不用 Graphics 实时画就不用：用烘焙纹理替代。citeturn0search1  
- 对“瞬间大量对象”的效果，优先用 **粒子系统一次性爆发**（explode），而不是创建 N 个独立 Sprite + 各自 Tween。citeturn6search20turn0search8  

**粒子数量与生命周期（移动端建议区间）**  
- “命中火花”：同时存活粒子建议控制在 80–200（全屏合计），单次爆发 12–24 粒子，寿命 90–180ms  
- “扫荡/吞食吸附”：用“少粒子 + 更强拖影/条带”的策略，避免每帧喷射上百粒  
- “通关”：允许短时间峰值（例如 300–600 粒子短寿命）但要保证 400–800ms 内彻底回落，避免下一波事件叠加造成持续高负载

**LOD（质量档位）策略（强烈建议做成全局开关）**  
- Quality 2（高）：启用 PostFX、拖影采样更多、粒子数量上限更高  
- Quality 1（中）：关闭或弱化 PostFX、拖影采样减半、粒子上限降低 30%  
- Quality 0（低）：禁用 shader 后处理、拖影改为少量残影 sprite、粒子上限降低 60%，并把部分“细节噪点层”删掉  
（这类建议属于工程经验值：务必配合真机 profile 校准。）

**内存与 GC 优化（JS/Web 必做）**  
- 避免每次播放特效都 `new Array()` / `new Graphics()`：改为对象池（Pool）  
- 频繁播放的特效（命中火花、吸附点）使用“预热”（prewarm）：启动时创建一定数量的 emitter/sprite 放池子里  
- 粒子贴图与 atlas 一次加载，避免运行时生成过多新纹理；Graphics.generateTexture 如果高频调用会不断生成新纹理、吞内存（官方也提醒频繁生成会消耗内存）。citeturn0search1  

**Instanced Rendering（高级选项：只在你们真的卡 draw call 时上）**  
- WebGL1 可用 `ANGLE_instanced_arrays` 扩展实现实例化绘制：它允许在共享顶点数据的情况下多次绘制相同对象，从而减少 draw call。citeturn1search3  
- WebGL2 则原生支持 `drawArraysInstanced`。citeturn1search7  
在 Phaser 3 内做 instancing 通常需要自定义 pipeline / shader 与顶点属性组织，工程成本较高；建议作为“终极优化牌”，先用 atlas + 统一 blend mode + 烘焙纹理通常就够了。

**调试工具与性能测试方法（可执行）**  
- WebGL 帧分析：Spector.js 可以捕获一帧的 WebGL 命令列表、状态、draw call 等信息，适合定位“为什么突然爆 draw call”。citeturn4search2turn4search6  
- 参数实时调优：Tweakpane 是轻量调参面板，适合把特效参数（粒子数量、寿命、颜色、强度）接到 UI 上热调。citeturn4search3turn4search7  
- 粒子可视化编辑：Phaser Editor 支持在编辑器里添加粒子发射器、调属性并预览，并且“因为使用同一 Phaser API，编辑器里看到的动画与游戏里一致”。citeturn6search31  

---

## 节奏与游戏反馈设计（事件级时间线、联动与优先级）

“游戏感强烈”的核心不只是“画面更花”，而是 **反馈在正确的时间，以正确的优先级出现**。GDC 的“Juice It or Lose It”演讲是典型方法论：用粒子、屏幕反馈、声音等把交互变得更满足。citeturn4search0turn4search4  
你的策划案也强调“吞食晋级目标时必须极强正反馈（发亮、脉冲加速、能量暴涨、镜头前冲、背景短变）”——这非常适合用 MG 几何特效体系做出“层级晋升”的掌控感。fileciteturn0file0

### 统一的反馈编排原则（建议写进项目规范）

**优先级（从高到低）**  
1) 生死/结算类（死亡、通关、晋级）  
2) 高价值事件（暴击、击杀高价值目标、关键吞食）  
3) 高频事件（普通命中、拾取、小吞食）  
4) 装饰性（环境粒子、背景呼吸）

**时间预算（建议硬约束）**  
- 高频事件：主反馈必须在 **0–120ms** 内完成峰值（否则“不跟手”）  
- 高价值事件：允许 300–900ms 的余韵，但在 1.2s 内必须收束，以免遮挡下一次决策

### 三类事件的毫秒级时间线方案

#### 扫荡（AOE Sweep / 群聚吞食）

目标体验：连续、高频、节奏紧密；“刷刷刷”但不遮挡视野。

建议时间线（示例）：  
- **t=0ms**：触发中心方向性“扫荡弧”（Arc/Sweep），alpha 快速抬到 1  
- **t=0–80ms**：轻微镜头震（可选，低强度），加一点“速度线”强调方向  
- **t=60–220ms**：碎片/点阵粒子沿扫荡方向喷射（数量中等），并快速衰减  
- **t=120–320ms**：RenderTexture 拖影/残影层淡出（若启用）  
- **t=200–500ms**：余韵环形波纹（很淡，主要做“连贯性”）

联动建议：  
- 音效：短促高频（每次扫荡不一定都播完整音，做“限频器”）  
- 震动：移动端可用 10–20ms 轻震（但注意浏览器支持与用户激活要求）。citeturn3search3  
- 配置：把“扫荡粒子数量上限”暴露成参数，作为 LOD 最敏感项。

#### 击杀高价值目标（High-Value Kill / 晋级目标前奏）

目标体验：让玩家明确感到“这不是普通击杀”，要有“印章式确认”。

建议时间线（示例）：  
- **t=0ms**：Hit-stop（建议 40–80ms）：可通过暂停关键动画/降低 timeScale 模拟（这里不展开具体实现细节，按你们框架处理）  
- **t=0–50ms**：中心“十字星爆闪 + 反差描边”（一帧到峰值）  
- **t=30–160ms**：大一圈 Shockwave ring 扩散（清晰可读）  
- **t=80–260ms**：三角碎片向外爆散并旋转衰减  
- **t=120–420ms**：屏幕轻微 Flash 或色偏（可用 Camera Flash/后处理），强化层级感。Camera 内置 Flash/Shake。citeturn1search2turn1search18  
- **t=260–900ms**：目标残留“标记圈”呼吸 2–3 次，提示收益/掉落/晋级

联动建议：  
- 镜头：Shake 强度中等但持续短（80–160ms），避免晕  
- 音效：加入“确认音”（更高频、更干净），并叠一点“能量回收”尾音  
- 震动：`navigator.vibrate([20, 20, 30])` 类“双击确认”节奏（注意兼容性与用户激活要求）。citeturn3search3  

#### 通关（Stage Clear / 吞食晋级目标）

目标体验：策划案要求“吞掉一个层级”的仪式感：结构发亮、脉冲加速、能量暴涨、镜头前冲、背景短变。fileciteturn0file0  

建议时间线（示例）：  
- **t=0ms**：屏幕中心闪色（不要纯白太久，8–16ms 即可），同时播放“晋级确认音”  
- **t=0–120ms**：大环扩散（2 层：实线环+虚线/点阵环），形成“关卡盖章”  
- **t=60–260ms**：向外爆散的几何碎片（数量明显高于普通击杀）  
- **t=120–400ms**：主角或核心区域“脉冲加速”——可通过节拍闪烁/发光频率提高实现  
- **t=300–900ms**：背景短时变化（轻微色偏/暗角/扫描），用 PostFXPipeline 实现最自然。citeturn6search10turn6search13  
- **t=900–1400ms**：收束：只留一个很淡的呼吸圈 1–2 次，进入下一关

---

## 可复用特效库模板（至少 8 种，含参数表与伪代码）

下面给出 8 个“几何风 MG 特效模板”，按“高频→高价值→结算”覆盖。你可以直接把它们做成 `templates/*.ts` 工厂函数，并注册到 VFXManager。

> 表中“参数表”是核心参数；你可以统一再加上通用参数：`depth`、`blendMode`、`tint`、`timeScale`、`quality`、`seed` 等。

| 模板名称 | 视觉描述 | 触发条件 | 参数表（核心） | 示例参数 | 伪代码（核心逻辑） |
|---|---|---|---|---|---|
| ImpactXCross | 命中点一帧爆闪：十字星（X）+描边+小点阵 | 普通命中 / 咬到目标 | `sizePx(18–64)` `thickness(2–6)` `durationMs(60–120)` `sparkCount(6–18)` `colorA` `colorOutline` | `{sizePx:36,durationMs:90,sparkCount:12}` | `spawnSprite('sparkX').scalePop(); particles.explode();` |
| RingShockwave | 圆环从命中点扩散，末端快速衰减（街机确认感） | 命中 / 爆炸 / 技能落点 | `r0(8–24)` `r1(40–220)` `thickness(2–10)` `durationMs(120–260)` `ease('expo.out'等)` | `{r0:10,r1:120,durationMs:180}` | `ring.scale = r0; tween ring to r1; alpha easeOut;` |
| TriangleBurst | 旋转三角碎片爆散（动感强、几何味） | 击杀 / 暴击 / 破盾 | `count(8–48)` `speed(180–820)` `lifespan(120–260)` `spin(180–720deg/s)` | `{count:24,speed:[220,680]}` | `particles(frame:'triShard').explode(count)` |
| LineStreakDash | 冲刺速度线：主方向 1 条强线 + 2–4 条弱线 + 尾迹 | 冲刺/瞬移/扑击 | `len(40–240)` `width(2–8)` `count(3–8)` `durationMs(80–180)` `spreadDeg(6–18)` | `{len:160,count:6}` | `for i in count: spawnLine(angle+rand); scaleX decay` |
| ScanLockOn | 锁定/高价值标记：环+角标（L形）+节拍闪烁 | 高价值目标出现 / 需要提示 | `radius(24–160)` `blinkPeriodMs(120–260)` `duty(0.4–0.7)` `holdMs(600–3000)` | `{radius:90,blinkPeriodMs:160}` | `tween alpha stepped; corner sprites rotate slight` |
| AbsorbSuction | 吞食吸附：点阵沿曲线向中心汇聚 + 中心闪一下 | 吞食/拾取能量 | `count(12–120)` `curveType('bezier')` `travelMs(180–520)` `coreFlashMs(60–120)` | `{count:64,travelMs:320}` | `spawn dots along random ring; tween to center; onComplete flash` |
| HighValueKillStamp | “印章式”击杀确认：大 X 闪 + 大环 + 轻 Flash + 微 Shake | 击杀高价值目标 | `hitStopMs(40–80)` `shakeMs(80–160)` `shakeIntensity(0.002–0.01)` `flashMs(40–120)` | `{hitStopMs:60,shakeMs:120}` | `timeScale dip; camera.shake(); camera.flash();` |
| StageClearEruption | 通关/晋级：双层大环扩散 + 大量碎片 + 背景短后处理 | 通关/晋级目标吞食 | `ringR1(180–520)` `burstCount(80–360)` `postFxMs(300–900)` `themeColor` | `{ringR1:420,burstCount:240}` | `rings + particles + postFX pipeline enable then fade` |

### 统一模板实现接口（建议）

```ts
export type VfxPlayOptions = {
  x: number; y: number;
  dir?: Phaser.Math.Vector2;
  intensity?: number;       // 0..1
  themeColor?: number;      // tint
  quality?: 0 | 1 | 2;
  seed?: number;
};

export interface VfxTemplate {
  name: string;
  // 预热：创建纹理、缓存配置、填充对象池
  prewarm?(scene: Phaser.Scene): void;
  // 播放：返回一个 handle，便于取消或提前结束
  play(scene: Phaser.Scene, opts: VfxPlayOptions): { stop(): void };
}
```

---

## 调色与视觉一致性（含 5 套配色示例与背景适配）

### 五套“纯色主体 + 点睛色”的推荐调色板（可直接落地）

这些调色板来自 Lospec 的常用像素/低规格调色板页面，你可以直接选其中 2–4 个高亮色作为“特效主题色”，再配 1 个深色作描边/阴影层。

**Arne 16（高对比、适合街机火花）**  
`#000000 #493c2b #be2633 #e06f8b #9d9d9d #a46422 #eb8931 #f7e26b #ffffff #1b2632 #2f484e #44891a #a3ce27 #005784 #31a2f2 #b2dcef` citeturn12view0  

**Endesga 16（现代、饱和、科幻友好）**  
`#e4a672 #b86f50 #743f39 #3f2832 #9e2835 #e53b44 #fb922b #ffe762 #63c64d #327345 #193d3f #4f6781 #afbfd2 #ffffff #2ce8f4 #0484d1` citeturn12view1  

**DawnBringer 16（复古但层次好，适合“生物组织+脉冲”）**  
`#140c1c #442434 #30346d #4e4a4e #854c30 #346524 #d04648 #757161 #597dce #d27d2c #8595a1 #6daa2c #d2aa99 #6dc2ca #dad45e #deeed6` citeturn12view2  

**PICO-8（经典 16 色，节奏感强，适合 UI 与 VFX 统一）**  
`#000000 #1D2B53 #7E2553 #008751 #AB5236 #5F574F #C2C3C7 #FFF1E8 #FF004D #FFA300 #FFEC27 #00E436 #29ADFF #83769C #FF77A8 #FFCCAA` citeturn13view0  

**Sweetie 16（更柔和但依旧鲜明，适合“高质感”几何层叠）**  
`#1a1c2c #5d275d #b13e53 #ef7d57 #ffcd75 #a7f070 #38b764 #257179 #29366f #3b5dc9 #41a6f6 #73eff7 #f4f4f4 #94b0c2 #566c86 #333c57` citeturn12view3  

### 可读性与对比度（你“质感提升”的底盘）

- 文本/关键数字：目标至少满足 WCAG 的最低对比建议（常见最低 4.5:1），避免“特效一多就看不清”。citeturn5search0turn5search28  
- 有意义图形（准星、提示圈、箭头）：建议至少 3:1 对比（非文本对比度要求思路），并尽量提供**描边/底板**。citeturn5search20turn5search28  

### 不同背景适配策略（暗 / 亮 / 纹理）

**暗背景**（常见）：  
- 主色用高亮（青/黄/粉/白），描边用深色（接近背景但更深一点）  
- ADD/SCREEN 能很好做“能量感”，但要控制切换频率避免 batch flush。citeturn5search6turn5search30  

**亮背景**：  
- 主色要“压暗一档”，并用深描边（黑/深蓝）保证轮廓  
- 少用纯白闪屏，改用“浅灰/浅黄闪”更舒服

**纹理复杂背景**：  
- 任何关键特效都要加“底板层”（半透明深色圆/菱形/条），或加外描边  
- 让“信息层”与“装饰层”分离：信息层轮廓干净、装饰层才允许噪点/粒子

---

## 协作流程、参考资源与快速开始清单

### 开发与美术协作流程（资源规范 + 参数化 + 实时调参）

**资源规范（建议写成团队约定）**  
- 矢量源文件：SVG（用于 Loader.svg 或作为烘焙参考）；PSD/AI 作为源工程  
- 运行时资产：统一输出到 atlas（PNG/WebP + JSON）或 spritesheet；并在命名上区分 `vfx_` 前缀（例如 `vfx_ring_01`）  
- 颜色策略：美术提供“主题色表”（主色/辅色/描边/危险色/奖励色），工程侧做成常量，避免每个特效随意取色导致风格漂移

**版本控制与变更协作**  
- 资产与参数分离：特效“参数 JSON/TS config”走代码审查；贴图变更走 LFS（若你们仓库需要）  
- 每个模板提供“默认参数 + 3 档强度（low/med/high）”，避免玩法同学临时拉参数把风格拉散

**调试面板与实时调参**  
- 推荐把关键参数挂到 Tweakpane：粒子数量、寿命、ring 半径、flash 时长、shake 强度、颜色。citeturn4search3turn4search7  
- 把“质量档位（quality 0/1/2）”也挂面板，方便在手机上现场切换验证

**性能与渲染调试**  
- 用 Spector.js 抓取 WebGL 帧，检查 draw call、blend 切换、pipeline 切换是否异常。citeturn4search2turn4search6  

### 参考资源与优先来源（按优先级）

**Phaser 官方 / 原始资料（最高优先级）**  
- 粒子系统概念与配置：Particles 概念页（粒子由配置对象驱动，可形成复杂效果）。citeturn0search8turn6search12  
- ParticleEmitter API（scale start/end + ease、explode 等关键能力）。citeturn0search0turn2search6turn6search20  
- Graphics 的性能提示（WebGL 多边形分解昂贵；静态图形用 generateTexture 烘焙）。citeturn0search1turn0search9  
- RenderTexture 概念与 API（合成复杂对象到单纹理；WebGL1 FBO 无 MSAA 限制）。citeturn0search2turn0search22turn6search19  
- Mesh GameObject（纹理顶点组渲染/变换，适合条带扭曲）。citeturn1search0turn1search16  
- Shader / PostFXPipeline（shader GO 的 uniform 机制；后处理管线的工作方式与典型效果）。citeturn6search28turn6search10turn6search13  
- PipelineManager（可添加自定义 pipeline；移动端 Mobile Pipeline 与单纹理绑定倾向）。citeturn0search3  
- Loader.svg（SVG 载入、缩放配置、渲染为纹理存入 Texture Manager）。citeturn15view0turn3search0  

**WebGL/GLSL & 浏览器能力（关键英文/中文原始资料）**  
- WebGL1 实例化扩展 ANGLE_instanced_arrays（减少 draw call 的方向）。citeturn1search3  
- WebGL2 `drawArraysInstanced`（WebGL2 原生实例化）。citeturn1search7  
- 震动 API：`navigator.vibrate()` 行为与 pattern（移动端反馈联动）。citeturn3search3  

**方法论 / 作品拆解与“游戏感”**  
- GDC “Juice It or Lose It”（用粒子、音效、屏幕反馈提升满足感）。citeturn4search0turn4search4  
- Game Feel（Steve Swink，系统性讨论“游戏感”的构成维度）。citeturn4search13turn4search9  

**相关开源库 / 辅助工具**  
- `svg-path-properties`（SVG path 采样）。citeturn2search3turn2search11  
- Spector.js（WebGL 帧捕获调试）。citeturn4search2turn4search6  
- Tweakpane（实时参数调优面板）。citeturn4search3turn4search7  

### 可视化与示意（示例帧/动态图链接建议 ≥3）

以下都可作为“你们内部 Demo/对照实现”的直接参考（不在正文贴 URL，用引用作为可点击来源）：

- RenderTexture 拖影（Trail）官方示例：非常适合作为“冲刺/瞬移/吞食拉扯”的底层实现参考。citeturn6search0turn6search11  
- 粒子爆发（Explode）示例：用于命中火花、碎片爆散。citeturn6search1turn6search20  
- 自定义 Post FX Pipeline 官方示例：用于通关闪屏、色偏、后处理质感。citeturn6search2turn6search10  
-（可选补充）CodePen 上的 Phaser RenderTexture Trail demo（便于快速在线调参/改代码）。citeturn6search4  

### 快速开始清单（可直接交给 AI 落地实现，含优先级与时间估计）

> 假设你们已有基础 Phaser3 项目骨架与资源加载流程；时间估计按“1 名熟练前端/游戏工程 + 1 名 TA/动效”粗略估算。

**P0：一切特效的地基（预计 0.5–1 天）**  
1) 搭建 `VFXManager`（registry + play + pool + quality 档位 + depth 约定）。  
2) 接入 Tweakpane：暴露全局 `quality`、`globalIntensity`、`debugDrawCalls`（面板先做最小版）。citeturn4search3turn4search7  

**P0：建立“几何形状资产管 profiler 友好”的生产方式（预计 0.5–1.5 天）**  
3) 用 Graphics 生成 6–10 个基础几何纹理（环、X 星、三角碎片、点、速度线条段、角标 L），并 `generateTexture` 烘焙（静态图形性能关键）。citeturn0search1  
4) 或引入 SVG：用 `this.load.svg` 加载 3–5 个可控 SVG（环/角标/特殊符号），验证 `svgConfig.scale/size` 的清晰度与内存开销。citeturn15view0  

**P1：先把 8 个模板跑起来（预计 1.5–3 天）**  
5) 按本报告表格实现 8 个模板（ImpactXCross、RingShockwave、TriangleBurst、LineStreakDash、ScanLockOn、AbsorbSuction、HighValueKillStamp、StageClearEruption）。  
6) 统一参数命名与默认值：所有模板都支持 `intensity(0..1)` 与 `themeColor`。

**P1：加入屏幕级反馈（预计 0.5–1.5 天）**  
7) 接入 Camera 的 `shake/flash`（高价值击杀、通关），并做强度限幅（防眩晕）。citeturn1search2turn1search18  
8)（移动端可选）接入 `navigator.vibrate()`：做 2–3 套 pattern（轻/中/重），并保证“用户激活后才触发”。citeturn3search3  

**P2：性能与一致性收尾（预计 1–2 天）**  
9) 用 Spector.js 抓 3 个高压场景（满屏扫荡、连续击杀、通关叠加），检查 draw call 是否因为 blendMode/pipeline 切换异常上升；必要时合并层级、减少切换。citeturn4search2turn4search6turn5search30  
10) 做 LOD：quality=0 关闭 postFX、减少粒子数量与拖影采样；quality=2 全开。  
11) 用 5 套调色板选定项目风格基线（建议先锁 1 套主色系 + 1 套备用），并建立“描边/底板”规则，保证复杂背景下可读性。citeturn12view1turn5search28  

**P2：把节奏写进玩法事件表（预计 0.5–1 天）**  
12) 维护一张 `Event->FeedbackPreset` 映射表：扫荡/高价值击杀/通关各自的时间线（ms）与强度；并加“限频器”（例如同类事件 80ms 内只触发一次高层反馈），确保节奏干净。

fileciteturn0file0