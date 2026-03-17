const CheckpointLoader = {
    apply(scene, scenario = {}) {
        const checkpoint = scenario.checkpoint || {};
        const stageId = checkpoint.stageId || scenario.stageId || 'forage';
        const stageIndex = Math.max(0, DEMO_STAGE_DEFS.findIndex((stage) => stage.id === stageId));

        scene.resetSimulation(true);
        scene.startupSequence = null;
        scene.hideStartupOverlay?.();
        scene.menuMode = null;
        scene.paused = false;
        scene.sessionStarted = true;
        scene.prey = [];
        scene.effects = [];
        scene.fragments = [];
        scene.runState.stageIndex = stageIndex;
        scene.runState.stageProgress = Math.max(0, checkpoint.stageProgress || 0);
        scene.runState.totalProgress = Math.max(0, checkpoint.totalProgress || scene.runState.stageProgress);
        scene.runState.growthCursor = Math.max(0, checkpoint.growthCursor || 0);
        scene.runState.objectiveSpawned = false;
        scene.runState.objectiveId = '';
        scene.syncSpawnTimersForStage?.(true);

        SpawnService.spawn(scene, {
            moduleId: 'player.cluster',
            preset: checkpoint.playerPreset || 'debug-default',
            x: checkpoint.x,
            y: checkpoint.y,
            overrides: {
                energyRatio: Number.isFinite(checkpoint.energy) ? checkpoint.energy : 0.78,
                growthCursor: checkpoint.growthCursor || 0
            }
        });

        if (Number.isFinite(checkpoint.cameraZoom)) {
            scene.cameraRig.manualZoom = checkpoint.cameraZoom;
            scene.cameraRig.zoom = checkpoint.cameraZoom;
            scene.cameraRig.targetZoom = checkpoint.cameraZoom;
            scene.cameraRig.desiredZoom = checkpoint.cameraZoom;
        }
    }
};

window.CheckpointLoader = CheckpointLoader;
