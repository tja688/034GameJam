# Tuning Policy

## Sources

- `tuning-panel.js`
  - 当前 Baseline Tuning Panel 实现
  - 仍是参数搜索 / 差异导出 / 写盘入口
- `tuning-profile.json`
  - 旧单文件基线，当前仍作为运行时兼容来源
- `data/tuning/*.base.json`
  - 新拆分基线文件
  - 由 `BaselineTuningStore.exportCurrentBaselines()` 写出

## Rules

- Gameplay 手感优先先调参数，再动核心公式
- 影响层级边界时，必须同步更新 `034Docs/source`
- Playground 内对象级参数只改轻量 inspector 字段
- 仓库级基线导出走 `data/tuning`

## Responsibility Split

- Baseline Panel：仓库级参数查看、搜索、导出、写基线
- Playground Inspector：fixture 内对象小范围参数
- Dev Command Layer：入口切换，不承担参数总控
