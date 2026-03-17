class CoreDemoScene extends Phaser.Scene {

    constructor(sceneKey = 'core-demo', runtimeMode = 'mainflow') {
        super(sceneKey);
        this.runtimeMode = runtimeMode;
    }

    getShellConfig() {
        return {
            runtimeMode: this.runtimeMode || 'mainflow',
            enableMenuUi: true,
            startSession: false,
            useStartupSequence: true
        };
    }

    afterShellCreate() {}

    create(data = {}) {
        const shellConfig = {
            ...this.getShellConfig(),
            ...(data.shellConfig || {})
        };
        this.runtimeMode = shellConfig.runtimeMode || this.runtimeMode || 'mainflow';

        window.activeScene = this;
        window.dumpEcoTelemetry = () => window.activeScene?.getEcoTelemetrySnapshot?.();
        ensureGameUiStyles();
        this.initAudioSystem?.();
        this.cameras.main.setBackgroundColor(COLORS.background);
        this.graphicsWorld = this.add.graphics();
        this.graphicsWorld.setDepth(0);
        this.graphics = this.add.graphics();
        this.graphics.setDepth(20);
        this.graphicsHud = this.add.graphics();
        this.graphicsHud.setDepth(40);
        this.initBakedSpriteRenderer?.();
        this.initInfiniteMapBackgrounds?.('geometric');
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
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            if (typeof this.nudgeCameraZoom === 'function') {
                this.nudgeCameraZoom(deltaY);
            }
        });

        RuntimeCoordinator.bootstrapScene(this, {
            runtimeMode: this.runtimeMode,
            startSession: shellConfig.startSession !== false
        });

        if (shellConfig.enableMenuUi) {
            this.buildUi();
        } else {
            this.ui = null;
        }

        this.hideExternalDebugUi?.();
        this.resetSimulation(shellConfig.startSession !== false);

        if (shellConfig.useStartupSequence) {
            this.beginStartupSequence?.();
        } else {
            this.startupSequence = null;
            this.menuMode = null;
            this.paused = false;
            this.sessionStarted = shellConfig.startSession !== false;
            this.hideStartupOverlay?.();
        }

        this.afterShellCreate(data, shellConfig);
    }

    handleResize() {
        if (!this.cameraRig || !this.player) {
            return;
        }
        this.cameraRig.viewportWidth = this.scale.width;
        this.cameraRig.viewportHeight = this.scale.height;
    }
}
