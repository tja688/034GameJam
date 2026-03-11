class CoreDemoScene extends Phaser.Scene {

    constructor() {
        super('core-demo');
    }

    create() {
        window.activeScene = this;
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
        this.input.on('pointerdown', (pointer) => {
            if (typeof this.markPerformanceInput === 'function') {
                this.markPerformanceInput('pointer');
            }
            this.handlePointerDown(pointer);
        });
        this.input.on('pointerup', (pointer) => {
            if (typeof this.markPerformanceInput === 'function') {
                this.markPerformanceInput('pointer');
            }
            this.handlePointerUp(pointer);
        });
        this.input.on('pointermove', () => {
            if (typeof this.markPerformanceInput === 'function') {
                this.markPerformanceInput('pointer');
            }
        });
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (typeof this.markPerformanceInput === 'function') {
                this.markPerformanceInput('wheel');
            }
            if (typeof this.nudgeCameraZoom === 'function') {
                this.nudgeCameraZoom(deltaY);
            }
        });
        this.input.keyboard?.on('keydown', () => {
            if (typeof this.markPerformanceInput === 'function') {
                this.markPerformanceInput('keyboard');
            }
        });
        this.input.keyboard?.on('keyup', () => {
            if (typeof this.markPerformanceInput === 'function') {
                this.markPerformanceInput('keyboard');
            }
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
