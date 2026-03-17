const PlayerClusterPlayground = {
    label: 'Player Cluster',
    searchTerms: ['player', 'cluster', 'hero', 'main character'],
    defaultPreset: 'debug-default',
    inspectFields: [
        { key: 'energy', label: 'Energy', type: 'number', step: 1 },
        { key: 'growthBuffer', label: 'Growth Buffer', type: 'number', step: 0.1 },
        { key: 'heading', label: 'Heading', type: 'number', step: 0.1 },
        { key: 'heal', label: '恢复满能量', type: 'action', action: 'heal' }
    ]
};

window.PlayerClusterPlayground = PlayerClusterPlayground;
