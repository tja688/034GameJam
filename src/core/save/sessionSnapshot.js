const SessionSnapshot = {
    captureSpawnList(scene) {
        const spawn = [];

        if (scene.player) {
            spawn.push({
                moduleId: scene.player.moduleId || 'player.cluster',
                preset: scene.player.modulePreset || 'debug-default',
                x: scene.player.centroidX,
                y: scene.player.centroidY,
                overrides: {
                    energyRatio: clamp(
                        (scene.player.energy || 0) / Math.max(1, scene.player.maxEnergy || 1),
                        0,
                        1
                    ),
                    growthCursor: scene.runState?.growthCursor || 0
                }
            });
        }

        (scene.prey || []).forEach((prey) => {
            spawn.push({
                moduleId: prey.moduleId || LegacyModuleAdapters.inferPreyModuleId(prey),
                preset: prey.modulePreset || 'basic',
                x: prey.x,
                y: prey.y,
                overrides: {
                    sizeKey: prey.sizeKey,
                    shape: prey.shape,
                    isObjective: !!prey.isObjective
                }
            });
        });

        return spawn;
    },
    captureFixture(scene, fixtureId = 'playground/custom-sandbox', notes = '') {
        return {
            id: fixtureId,
            spawn: this.captureSpawnList(scene),
            camera: {
                zoom: scene.cameraRig?.manualZoom || scene.cameraRig?.zoom || 1
            },
            notes
        };
    }
};

window.SessionSnapshot = SessionSnapshot;
