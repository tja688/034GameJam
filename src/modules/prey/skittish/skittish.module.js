registerRuntimeModule({
    id: 'prey.skittish',
    category: 'prey',
    tags: ['prey', 'skittish', 'runner'],
    version: '1.0.0',
    config: SkittishPreyConfig,
    presets: SkittishPreyPresets,
    playground: SkittishPreyPlayground,
    behavior: SkittishPreyBehavior,
    factory: SkittishPreyFactory
});
