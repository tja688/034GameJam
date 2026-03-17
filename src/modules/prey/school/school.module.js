registerRuntimeModule({
    id: 'prey.school',
    category: 'prey',
    tags: ['prey', 'school', 'swarm'],
    version: '1.0.0',
    config: SchoolPreyConfig,
    presets: SchoolPreyPresets,
    playground: SchoolPreyPlayground,
    behavior: SchoolPreyBehavior,
    factory: SchoolPreyFactory
});
