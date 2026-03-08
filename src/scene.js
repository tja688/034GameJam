class CoreDemoScene extends Phaser.Scene {

    constructor() {
        super('core-demo');
    }

    create() {
        ensureGameUiStyles();
        this.cameras.main.setBackgroundColor(COLORS.background);
        this.graphics = this.add.graphics();
        this.input.mouse?.disableContextMenu();
        this.scale.on('resize', this.handleResize, this);
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            expand: Phaser.Input.Keyboard.KeyCodes.E,
            shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
            ctrl: Phaser.Input.Keyboard.KeyCodes.CTRL,
            undo: Phaser.Input.Keyboard.KeyCodes.Z,
            cancel: Phaser.Input.Keyboard.KeyCodes.ESC,
            deleteAction: Phaser.Input.Keyboard.KeyCodes.DELETE,
            restart: Phaser.Input.Keyboard.KeyCodes.R
        });
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointerup', this.handlePointerUp, this);
        this.cameraZoomScale = 1;
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            this.cameraZoomScale = clamp(this.cameraZoomScale - deltaY * 0.001, 0.1, 5.0);
        });
        this.menuMode = null;
        this.toastTimer = null;
        this.buildUi();
        this.resetSimulation(false);
        this.showMainMenu();
    }

    handleResize() {
        if (!this.cameraRig || !this.player) {
            return;
        }
        this.cameraRig.viewportWidth = this.scale.width;
        this.cameraRig.viewportHeight = this.scale.height;
    }
}
