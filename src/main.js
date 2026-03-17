Object.assign(
    CoreDemoScene.prototype,
    SceneUiMixin,
    SceneAudioMixin,
    SceneInitMixin,
    SceneProgressionMixin,
    SceneSaveLoadMixin,
    SceneTopologyMixin,
    SceneInputMixin,
    SceneMovementMixin,
    SceneCombatMixin,
    SceneEnemiesMixin,
    SceneRenderMixin
);

CoreDemoScene.prototype.resetSimulation = function resetSimulation(startSession = true) {
    return RuntimeCoordinator.resetSession(this, {
        runtimeMode: this.runtimeMode || 'mainflow',
        startSession
    });
};

CoreDemoScene.prototype.update = function update(_, deltaMs) {
    return RuntimeCoordinator.tick(this, deltaMs);
};

start034GameApp();
