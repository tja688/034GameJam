const AppBootstrap = {
    createConfig() {
        return {
            type: Phaser.AUTO,
            backgroundColor: '#071017',
            scale: {
                mode: Phaser.Scale.RESIZE,
                width: window.innerWidth,
                height: window.innerHeight
            },
            scene: AppSceneRegistry.list()
        };
    },
    start() {
        const game = new Phaser.Game(this.createConfig());
        window.__034GameApp = { game };
        return game;
    }
};

window.AppBootstrap = AppBootstrap;
