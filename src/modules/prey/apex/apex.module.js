registerRuntimeModule({
    id: 'prey.apex',
    category: 'prey',
    tags: ['prey', 'apex', 'pressure'],
    version: '1.0.0',
    config: ApexPreyConfig,
    presets: ApexPreyPresets,
    playground: ApexPreyPlayground,
    behavior: ApexPreyBehavior,
    factory: ApexPreyFactory
});
