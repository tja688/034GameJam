const PlayerClusterPresets = {
    default: { ...PlayerClusterConfig },
    'debug-default': { ...PlayerClusterConfig, id: 'debug-default' },
    'compact-hunter': {
        id: 'compact-hunter',
        chainIds: ['source', 'compressor', 'shell-a', 'dart-a', 'blade', 'prism'],
        energyRatio: 0.88,
        growthCursor: 1
    },
    'stage-encircle-mid': {
        id: 'stage-encircle-mid',
        chainIds: ['source', 'shell-a', 'dart-a', 'prism', 'compressor', 'blade', 'shell-b', 'dart-b'],
        energyRatio: 0.72,
        growthCursor: 3
    },
    'stage-saturation-late': {
        id: 'stage-saturation-late',
        chainIds: ['source', 'shell-a', 'dart-a', 'prism', 'compressor', 'blade', 'shell-b', 'dart-b'],
        energyRatio: 0.94,
        growthCursor: 5
    }
};

window.PlayerClusterPresets = PlayerClusterPresets;
