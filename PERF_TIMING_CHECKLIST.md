# Phaser Performance Timing Checklist

用于在 Chrome DevTools Performance 面板里按 `追踪:` 搜索和核对本次插入的 User Timing 标签。

## 主循环

- `追踪: CoreDemoScene-create`
- `追踪: CoreDemoScene-update`
- `追踪: CoreDemoScene-updateCamera`
- `追踪: CoreDemoScene-updateDisplay`

## 队形与物理

- `追踪: CoreDemoScene-rebuildFormation`
- `追踪: CoreDemoScene-updatePulse`
- `追踪: CoreDemoScene-updateFormation`
- `追踪: CoreDemoScene-updateFormation-resetNodes`
- `追踪: CoreDemoScene-updateFormation-applyForces`
- `追踪: CoreDemoScene-updateFormation-springs`
- `追踪: CoreDemoScene-updateFormation-repulsion`
- `追踪: CoreDemoScene-updateFormation-integrate`
- `追踪: CoreDemoScene-updateFormation-pbd`
- `追踪: CoreDemoScene-updatePlayerState`

## 敌人与碰撞

- `追踪: CoreDemoScene-updateSpawns`
- `追踪: CoreDemoScene-updatePrey`
- `追踪: CoreDemoScene-updatePrey-loop`
- `追踪: CoreDemoScene-resolvePreyNodeCollisions`
- `追踪: CoreDemoScene-resolvePreyNodeCollisions-loop`
- `追踪: CoreDemoScene-updatePredation`
- `追踪: CoreDemoScene-updatePredation-loop`
- `追踪: CoreDemoScene-updateFragments`
- `追踪: CoreDemoScene-updateFragments-loop`

## 进度与资源

- `追踪: CoreDemoScene-estimatePulseMetabolism`
- `追踪: CoreDemoScene-flushPendingDevourRewards`
- `追踪: CoreDemoScene-updateRunState`

## 输入与编辑模式

- `追踪: CoreDemoScene-refreshEditHover`
- `追踪: CoreDemoScene-readIntent`
- `追踪: CoreDemoScene-updateEditMode`

## Graphics / RenderTexture 初始化

- `追踪: CoreDemoScene-buildBakedRenderTextures`
- `追踪: CoreDemoScene-buildRenderCaches`
- `追踪: CoreDemoScene-updateEffects`

## 渲染总入口

- `追踪: CoreDemoScene-render`
- `追踪: CoreDemoScene-render-setup`
- `追踪: CoreDemoScene-render-world`
- `追踪: CoreDemoScene-render-fragments`
- `追踪: CoreDemoScene-render-prey`
- `追踪: CoreDemoScene-render-predationLinks`
- `追踪: CoreDemoScene-render-formation`
- `追踪: CoreDemoScene-render-effects`
- `追踪: CoreDemoScene-render-editOverlay`
- `追踪: CoreDemoScene-render-debugOverlay`
- `追踪: CoreDemoScene-render-hud`
- `追踪: CoreDemoScene-render-teardown`

## Baked Sprite 渲染路径

- `追踪: CoreDemoScene-renderEffectSprites`
- `追踪: CoreDemoScene-renderFragmentsSprites`
- `追踪: CoreDemoScene-renderPreySprites`
- `追踪: CoreDemoScene-renderPredationLinkSprites`

## Graphics 直接绘制路径

- `追踪: CoreDemoScene-drawWorld`
- `追踪: CoreDemoScene-drawEffects`
- `追踪: CoreDemoScene-drawFragments`
- `追踪: CoreDemoScene-drawPrey`
- `追踪: CoreDemoScene-drawPredationLinks`
- `追踪: CoreDemoScene-drawFormation`
- `追踪: CoreDemoScene-drawHud`
- `追踪: CoreDemoScene-drawEditOverlay`
- `追踪: CoreDemoScene-drawDebugOverlays`

## 排查建议

- 先按 `追踪: CoreDemoScene-render` 看整帧渲染占比，再下钻 `render-prey` / `render-formation` / `render-hud`。
- 如果 DevTools 里还是落在 `phaser.min.js > batchFillPath`，优先对照 `drawPrey`、`drawFormation`、`drawHud`、`drawEditOverlay`。
- 如果卡在每帧计算，优先看 `updateFormation-pbd`、`updateFormation-repulsion`、`updatePrey-loop`、`updatePredation-loop`、`resolvePreyNodeCollisions-loop`。
