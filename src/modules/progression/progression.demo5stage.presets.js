const ProgressionDemo5StagePresets = {
    default: { ...ProgressionDemo5StageConfig },
    forage: { id: 'forage', stageId: 'forage', stageProgress: 0.12, totalProgress: 0.12, growthCursor: 0 },
    bloom: { id: 'bloom', stageId: 'bloom', stageProgress: 0.28, totalProgress: 0.28, growthCursor: 1 },
    pressure: { id: 'pressure', stageId: 'pressure', stageProgress: 0.36, totalProgress: 0.36, growthCursor: 2 },
    encircle: { id: 'encircle', stageId: 'encircle', stageProgress: 0.48, totalProgress: 0.48, growthCursor: 3 },
    saturation: { id: 'saturation', stageId: 'saturation', stageProgress: 0.6, totalProgress: 0.6, growthCursor: 4 }
};

window.ProgressionDemo5StagePresets = ProgressionDemo5StagePresets;
