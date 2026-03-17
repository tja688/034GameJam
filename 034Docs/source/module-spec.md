# Module Spec

正式模块目录约定：

```text
moduleName/
  *.module.js
  *.factory.js
  *.behavior.js
  *.config.js
  *.presets.js
  *.playground.js
```

## Registered Formal Modules

- `player.cluster`
- `prey.skittish`
- `prey.school`
- `prey.bulwark`
- `prey.weakspot`
- `prey.apex`
- `hud.main`
- `camera.invasive`
- `progression.demo5stage`

## Contract

- `*.module.js`
  - 注册 `id`、`category`、`tags`、`version`
  - 绑定 `factory` / `behavior` / `config` / `presets` / `playground`
- `*.factory.js`
  - 唯一生成入口
  - 通过 `SpawnService` / `LegacyModuleAdapters` 进入运行时
- `*.behavior.js`
  - 声明 legacy runtime 对应关系
  - 行为落点必须可定位
- `*.config.js`
  - 默认配置
- `*.presets.js`
  - 具名预设
- `*.playground.js`
  - 搜索标签
  - 默认 preset
  - inspector 可暴露字段

## Current Migration Rule

- 正式模块的创建入口必须走 `SpawnService`
- 正式模块不复制一份平行 player/prey 实现
- 真正行为仍在旧 mixin 时，必须明确标记 `legacy-*-adapter`
