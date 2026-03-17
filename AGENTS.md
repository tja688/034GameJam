# AGENTS.md

本仓库的唯一 canonical 文档目录是 `034Docs/source/`。

协作硬规则：

- 改系统边界时，必须同步更新 `034Docs/source` 中对应文档。
- 正式模块新增或迁移时，优先进入 `src/modules/`，并保持 `module/factory/behavior/config/presets/playground` 六件套。
- 主流程问题复现优先走 `data/scenarios/`。
- 模块组合验证优先走 `data/fixtures/` + `src/playground/`。
- `src/legacy/migration-adapters/` 只能做过渡桥接，不能重新长成业务中心。
- 不复制平行 prey / player 实现给 Playground 使用。
- 不在结构重构过程中顺手扩玩法。
