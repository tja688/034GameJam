# Architecture Overview

## Layer Map

- `src/core`
  - `state/gameSessionState.js`：统一运行时状态容器；`timeDilation` 也必须落在 session state 里，避免 reset / pause / menu 后残留慢放态
  - `runtime/runtimeCoordinator.js`：统一帧调度顺序；编辑模式 / 英雄镜头的 `updateTimeDilationState()` 必须在计算 `simDt` 前执行
  - `spawn/moduleRegistry.js` + `spawn/spawnService.js`：正式模块注册与生成入口
  - `tuning/baselineTuningStore.js`：Baseline tuning 拆分写盘
  - `save/sessionSnapshot.js`：fixture / snapshot 导出
- `src/modules`
  - 正式模块层。当前已建：`player.cluster`、5 类 prey、`hud.main`、`camera.invasive`、`progression.demo5stage`
- `src/playground`
  - `PlaygroundWorldScene`：独立世界模拟
  - `PlaygroundOverlayScene`：搜索、fixture、轻量 inspector
- `src/mainflow`
  - `MainFlowScene`：正式验证入口
  - `ScenarioLoader` / `CheckpointLoader` / `EncounterRunner`
- `src/debug`
  - `DevCommandLayer`：命令入口
- `src/legacy/migration-adapters`
  - `legacySessionBridge.js`：把旧 Scene 字段桥接到 `GameSessionState`
  - `legacyModuleAdapters.js`：把新模块 factory 接到旧 prey/player 运行逻辑

## Runtime

`CoreDemoScene` 现在只保留壳职责：

- Scene 生命周期
- 输入/graphics/DOM 挂载
- runtime mode 配置
- 把 `resetSimulation` 和 `update` 委托给 `RuntimeCoordinator`

当前主循环顺序：

1. `preUpdateInput`
2. `updateIntent`
3. `updateTopology`
4. `updateMovement`
5. `updatePrey`
6. `updatePredation`
7. `updateProgression`
8. `updateCamera`
9. `updateHud`
10. `render`

启动序列 / 关卡转场补充：

- 默认主流程入口先进入 startup sequence，而不是直接开局；该状态会拦截常规主循环，单独驱动基础 player cluster 预览、资产渐进加载、专用 startup palette / map background，以及 DOM 启动控件
- startup sequence 的 DOM loading CTA 继续承担唯一可见进度反馈；进度填充条必须真实响应资产加载进度，而不是只显示空矩形壳
- startup sequence 不再复用 stage 1 预览，而是清空 prey / fragments / effects，只保留基础人物；人物保持自然游走，并允许鼠标吸引跟随
- startup sequence 的 BGM 固定复用第三关素材；离开 startup sequence 后恢复正式 stage-aware BGM
- stage transition 现在是一套统一 DOM 转场层：第一关起手和后续 `advanceStage()` 共用同一表现，不再只有后续关卡有切场反馈
- `progression.demo5stage` 主流程现在按 5 个 stage 为一轮循环推进；打满一轮后会把玩家 cluster 与成长进度重置回基础开局，再从第一关重新开始，同时给该轮后续所有 stage 叠加 `+10%` pulse metabolism 与 `+10%` common prey density
- 轮次增量只作为内部难度标量，不再额外追加 round HUD 图标
- 只有 `elite` 致死时才会触发英雄镜头，并且该镜头会叠加强化过的时间放缓、屏幕闪屏、屏幕抖动与全局音频慢放后处理；编辑模式继续共用同一运行时混音层，恢复时必须自动回正
- 玩家 cluster 渲染继续保持 034 基础形体，但每关节点配色与 living energy bar 都会跟随 stage palette 切换，节点在 pulse 触发瞬间会额外膨胀回弹
- 精英 / objective 致死碎片爆散半径翻倍；玩家 circle 节点的碎片吸收搜索半径提升到原来的 `1.5x`

运行时资源回收约束：

- `CoreAudioManager` 必须在 voice 自然结束时销毁对应 `Phaser.Sound` 实例，不能只把 record 从追踪表里移除
- runtime guard 除了维持 BGM singleton，还要周期性清扫 `sound.sounds` 中“未追踪且已停止”的历史实例
- `resetSimulation` 必须主动触发一次音频残留清扫，避免高关卡结束后回到第一关仍背着旧 run 的短音效对象
- `sceneCombat.damagePrey` 现在负责统一触发 elite / objective 受击音；该事件复用 weakspot spinner 的受击素材，避免把“是否是 grind bite”与“是否该播精英受击反馈”绑死在一起
- `sceneCombat.finishPreyDevour` 现在为所有 elite / objective 死亡爆裂统一触发 `SFX_boss_hit2.wav`，与普通 prey 的吞噬收口音分离
- `sceneCombat.consumeFragment` 的成功吸收音现在统一走 `snd_coin_collect_01/02/03` 随机池，并在运行时附加轻微 `rate/detune` 抖动，避免连续吸收时机械重复

音频排查快捷流（快速降噪定位）：

- `Ctrl + M`：开/关“音效排查模式”
- `Ctrl + /`：开/关右侧实时音频列表（当前 active voices + manager sounds）
- 排查模式开启后：`{` 上一个候选、`}` 下一个候选、`|` 确认当前候选
- 候选切换时会临时仅禁用当前事件，并在顶部短暂 toast 显示 `event/group/module/anchor` 绑定信息
- `|` 确认后会同时：
  1. 写入 `audio-noise-mute-config.json`（可追溯禁用记录）
  2. 将该事件写入 `audio-profile.json` 的 applied binding（`enabled=false`）
  3. 在运行时触发入口直接拦截该事件，避免继续进入播放链
- `CoreAudioManager.resolveCandidatePool` 对 `loop=false` 事件启用 one-shot 保底：若候选池同时含 loop 与非 loop 资产，会优先过滤 loop，避免回退到 `*_loop` 造成持续底噪

## Dev Launch

- 开发入口仍是仓库根目录的 `start-dev.ps1` / `start-dev.bat`
- 启动脚本默认拉起本地 dev server，并打开一个专用 Google Chrome 调试实例，而不是依赖系统默认浏览器
- 该 Chrome 实例固定开启 `remote debugging`，默认优先使用 `http://127.0.0.1:9222`
- 若 `9222` 被占用，脚本会自动向后寻找可用端口，并在终端打印实际 DevTools endpoint
- Chrome 使用独立 `user-data-dir`，用于保证 Chrome DevTools MCP 可稳定连接和全量控制，不污染日常浏览器会话

## Desktop Shell (Electron)

- 新增桌面壳入口：`electron/main.js`
- Electron 主进程会启动内置 HTTP 服务（默认优先 `127.0.0.1:4173`，端口被占用时自动向后探测）
- 该服务复用 dev server 的关键协议约束：
  - `GET /__api/ping`
  - `POST /__api/write-json`（同白名单文件集）
  - 静态资源服务（`index.html`、`src/`、`assets/`、`data/`、`vendor/`）
- 前端运行路径保持 `http://` 协议，不改 `tuning-panel.js` 与 `src/storage.js` 的读写协议假设
- JSON 可写文件策略分层：
  - 开发态（未打包）：写回仓库根目录对应 JSON 文件
  - 打包态（`app.isPackaged=true`）：写入 `app.getPath('userData')/mutable-json/`，并在读取时优先覆盖同名内置资源
- 打包配置由仓库根 `package.json` 中的 `electron-builder` 维护，Windows 目标为 `nsis` 安装包

## Current Bridge Status

以下能力已经进入新骨架，但底层行为仍依赖 legacy 实现：

- 玩家 cluster 力学：依赖 `sceneMovement.js`
- prey 行为与 spawn：依赖 `sceneEnemies.js`
- progression：依赖 `sceneProgression.js`
- HUD / render：依赖 `sceneRender.js`
- 编辑态工具：依赖 `sceneInput.js` + `sceneTopology.js`

判断原则：

- 新增入口、新模块注册、新数据 schema 走新层
- 老逻辑只在 adapter 或 mixin 内被调用，不再由 Scene 主循环直接拼装
