registerRuntimeModule({
    id: 'prey.bulwark',
    category: 'prey',
    tags: ['prey', 'bulwark', 'compression'],
    version: '1.0.0',
    config: BulwarkPreyConfig,
    presets: BulwarkPreyPresets,
    playground: BulwarkPreyPlayground,
    behavior: BulwarkPreyBehavior,
    factory: BulwarkPreyFactory
});
