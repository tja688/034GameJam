# Architecture Overview

## Layer Map

- `src/core`
  - `state/gameSessionState.js`：统一运行时状态容器
  - `runtime/runtimeCoordinator.js`：统一帧调度顺序
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

运行时资源回收约束：

- `CoreAudioManager` 必须在 voice 自然结束时销毁对应 `Phaser.Sound` 实例，不能只把 record 从追踪表里移除
- runtime guard 除了维持 BGM singleton，还要周期性清扫 `sound.sounds` 中“未追踪且已停止”的历史实例
- `resetSimulation` 必须主动触发一次音频残留清扫，避免高关卡结束后回到第一关仍背着旧 run 的短音效对象

## Dev Launch

- 开发入口仍是仓库根目录的 `start-dev.ps1` / `start-dev.bat`
- 启动脚本默认拉起本地 dev server，并打开一个专用 Google Chrome 调试实例，而不是依赖系统默认浏览器
- 该 Chrome 实例固定开启 `remote debugging`，默认优先使用 `http://127.0.0.1:9222`
- 若 `9222` 被占用，脚本会自动向后寻找可用端口，并在终端打印实际 DevTools endpoint
- Chrome 使用独立 `user-data-dir`，用于保证 Chrome DevTools MCP 可稳定连接和全量控制，不污染日常浏览器会话

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
