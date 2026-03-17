registerRuntimeModule({
    id: 'player.cluster',
    category: 'playerCluster',
    tags: ['player', 'cluster', 'traction', 'core'],
    version: '1.0.0',
    config: PlayerClusterConfig,
    presets: PlayerClusterPresets,
    playground: PlayerClusterPlayground,
    behavior: PlayerClusterBehavior,
    factory: PlayerClusterFactory
});
