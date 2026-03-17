registerRuntimeModule({
    id: 'hud.main',
    category: 'hud',
    tags: ['hud', 'readability', 'mainflow'],
    version: '1.0.0',
    config: HudMainConfig,
    presets: HudMainPresets,
    playground: HudMainPlayground,
    behavior: HudMainBehavior,
    factory: HudMainFactory
});
