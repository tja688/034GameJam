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
const config = {
    type: Phaser.AUTO,
    backgroundColor: '#071017',
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: window.innerWidth,
        height: window.innerHeight
    },
    scene: [CoreDemoScene]
};

new Phaser.Game(config);
