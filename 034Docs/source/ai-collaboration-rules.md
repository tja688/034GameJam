# AI Collaboration Rules

1. 只把 `034Docs/source` 当作 canonical 文档。
2. 新增正式能力时，优先落在 `src/modules`、`src/core`、`src/playground`、`src/mainflow`。
3. 不允许为了 Playground 复制一套平行 prey / player 逻辑。
4. 不允许把 `CoreDemoScene` 重新变回业务总控器。
5. 结构重构期间不继续扩新玩法分支。
6. 改模块边界时必须同步更新对应 canonical 文档。
7. 改 prey 时先定位到对应模块目录，再看 legacy adapter 落点。
8. 改主流程验证时先走 scenario，不依赖完整重打。
9. 改对象组合测试时先走 playground fixture。
10. 旧 mixin 能力未完全迁出前，必须在说明里明确写出 legacy 依赖点。
