# 034GameJam

开发入口：

- Windows：`start-dev.bat`
- PowerShell：`./start-dev.ps1`
- Electron 开发运行：`npm run electron:dev`

开发脚本默认会打开一个可被 Chrome DevTools MCP 接管的专用 Chrome 调试实例。
终端会打印实际 DevTools endpoint，默认优先为 `http://127.0.0.1:9222`。

## Electron 打包

```bash
npm install
npm run electron:dist:win
```

- 产物目录：`dist/`
- 仅生成目录包（不出安装器）：`npm run electron:dist:dir`

唯一 canonical 文档目录：

- `034Docs/source/project-north-star.md`
- `034Docs/source/architecture-overview.md`
- `034Docs/source/module-spec.md`
- `034Docs/source/playground-spec.md`
- `034Docs/source/scenario-spec.md`
- `034Docs/source/tuning-policy.md`
- `034Docs/source/ai-collaboration-rules.md`
- `034Docs/source/terminology.md`

说明：

- 运行时骨架、正式模块、Playground、Scenario、调试命令层与协作规则，全部以 `034Docs/source` 为准。
