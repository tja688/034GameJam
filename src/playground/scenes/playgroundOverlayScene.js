class PlaygroundOverlayScene extends Phaser.Scene {
    constructor() {
        super('playground-overlay');
        this.uiController = null;
    }

    create(data = {}) {
        const worldScene = this.scene.get(data.worldSceneKey || 'playground-world');
        this.uiController = new PlaygroundUiController(worldScene);
        this.uiController.mount();
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.uiController?.destroy();
            this.uiController = null;
        });
    }
}

window.PlaygroundOverlayScene = PlaygroundOverlayScene;
