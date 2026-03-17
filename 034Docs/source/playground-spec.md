# Playground Spec

## Scenes

- `PlaygroundWorldScene`
  - 独立 session state
  - 禁用主流程自动 spawn / progression
  - 支持按模块 id 生成对象
  - 支持 fixture 加载 / 保存
- `PlaygroundOverlayScene`
  - DOM 搜索面板
  - fixture 列表
  - 轻量 inspector
  - 返回主流程

## Shared Assets

Playground 与主流程共享：

- `ModuleRegistry`
- `SpawnService`
- 正式模块目录
- `fixture` / `scenario` 数据 schema

不共享：

- 运行时实例对象
- 会话状态引用
- 主流程当前 prey 列表

## Inspector Scope

仅允许 4 类字段：

- `number`
- `boolean`
- `enum`
- `action`

当前 inspector 只暴露模块在 `*.playground.js` 中声明的字段。

## Fixture MVP

当前仓库已接入的 fixture：

- `player/cluster-traction-smoke`
- `prey/skittish-herd-burst`
- `prey/school-sweep-line`
- `combat/bulwark-vs-player-compress`
- `combat/weakspot-wrap-check`
- `combat/apex-pressure-gate`
- `playground/custom-sandbox`

保存路径：

- `data/fixtures/playground/custom-sandbox.json`
