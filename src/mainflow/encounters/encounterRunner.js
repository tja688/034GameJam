const EncounterRunner = {
    run(scene, encounter = {}) {
        const spawnList = Array.isArray(encounter.spawn) ? encounter.spawn : [];
        const results = SpawnService.spawnBatch(scene, spawnList);
        const objective = results.find((entry) => entry?.isObjective);
        if (objective) {
            scene.runState.objectiveSpawned = true;
            scene.runState.objectiveId = objective.id || '';
        }
        return results;
    }
};

window.EncounterRunner = EncounterRunner;
