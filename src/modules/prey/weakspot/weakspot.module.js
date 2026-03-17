registerRuntimeModule({
    id: 'prey.weakspot',
    category: 'prey',
    tags: ['prey', 'weakspot', 'encircle'],
    version: '1.0.0',
    config: WeakspotPreyConfig,
    presets: WeakspotPreyPresets,
    playground: WeakspotPreyPlayground,
    behavior: WeakspotPreyBehavior,
    factory: WeakspotPreyFactory
});
