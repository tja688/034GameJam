function getNestedSessionValue(root, path) {
    return path.reduce((cursor, key) => (cursor ? cursor[key] : undefined), root);
}

function setNestedSessionValue(root, path, value) {
    let cursor = root;
    for (let index = 0; index < path.length - 1; index += 1) {
        const key = path[index];
        if (!cursor[key] || typeof cursor[key] !== 'object') {
            cursor[key] = {};
        }
        cursor = cursor[key];
    }
    cursor[path[path.length - 1]] = value;
}

const LegacySessionBridge = {
    ensureSceneAccessors(scene) {
        if (!scene || scene.__sessionAccessorsBound) {
            return;
        }

        Object.entries(GAME_SESSION_ACCESSORS).forEach(([propertyName, path]) => {
            Object.defineProperty(scene, propertyName, {
                configurable: true,
                enumerable: false,
                get() {
                    return getNestedSessionValue(this.sessionState, path);
                },
                set(value) {
                    if (!this.sessionState) {
                        this.sessionState = GameSessionStateFactory.create(this.runtimeMode || 'mainflow');
                    }
                    setNestedSessionValue(this.sessionState, path, value);
                }
            });
        });

        scene.__sessionAccessorsBound = true;
    },
    attach(scene, sessionState) {
        if (!scene) {
            return null;
        }
        this.ensureSceneAccessors(scene);
        scene.sessionState = sessionState;
        return sessionState;
    },
    create(scene, options = {}) {
        const runtimeMode = options.runtimeMode || scene.runtimeMode || 'mainflow';
        const state = GameSessionStateFactory.create(runtimeMode, options);
        return this.attach(scene, state);
    },
    createOrReuse(scene, options = {}) {
        if (!scene.sessionState) {
            return this.create(scene, options);
        }
        this.attach(scene, scene.sessionState);
        scene.sessionState.sessionFlags.runtimeMode = options.runtimeMode || scene.runtimeMode || scene.sessionState.sessionFlags.runtimeMode || 'mainflow';
        if (typeof options.startSession === 'boolean') {
            scene.sessionState.sessionFlags.sessionStarted = options.startSession;
        }
        return scene.sessionState;
    },
    reset(scene, options = {}) {
        const sessionState = this.createOrReuse(scene, options);
        sessionState.sessionFlags.runtimeMode = options.runtimeMode || scene.runtimeMode || 'mainflow';
        sessionState.sessionFlags.paused = false;
        sessionState.sessionFlags.sessionStarted = options.startSession !== false;
        sessionState.uiState.menuMode = null;
        sessionState.uiState.toastTimer = null;
        sessionState.debugState.menuOpen = false;
        sessionState.debugState.menuAutoPaused = false;

        scene.destroyBakedSpritePool?.();
        scene.effects = [];
        scene.fragments = [];
        scene.resetFragmentPool?.();
        scene.prey = [];
        scene.spawnTimers = scene.createDefaultSpawnTimers();
        scene.preySpawnCursor = { small: 0, medium: 1, large: 2 };
        scene.preyIdCounter = 1;
        scene.baseChain = [...DEFAULT_BASE_CHAIN];
        scene.player = scene.createDefaultPlayer();
        scene.intent = scene.createDefaultIntent();
        scene.cameraRig = scene.createDefaultCameraRig();
        scene.clusterVolume = scene.createDefaultClusterVolumeState();
        scene.burstDrive = scene.createDefaultBurstDriveState();
        scene.performanceProbe = scene.createDefaultPerformanceProbe();
        scene.ecoTelemetry = scene.createDefaultEcoTelemetry?.() || null;
        scene.pendingDevourRewards = [];
        scene.pendingLootRewardSources = {};
        scene.poolNodes = scene.createPoolNodesFromLibrary();
        scene.runState = typeof scene.createDefaultRunState === 'function' ? scene.createDefaultRunState() : null;
        scene.timeScaleFactor = 1;
        scene.worldTime = 0;
        scene.startupSequence = null;

        scene.resetLivingEnergyBarState?.();
        scene.player.topology = scene.rebuildTopologyFromCurrentChain();
        scene.activeNodes = [];
        scene.links = [];
        scene.rebuildFormation(true);

        if (typeof scene.resetRunProgression === 'function') {
            scene.resetRunProgression();
        }

        scene.expandHoldTimer = 0;
        scene.expandAddCount = 0;
        scene.nextExpandThreshold = 0;
        scene.syncSceneBgm?.({ source: options.startSession === false ? 'reset-idle' : 'reset-session' });
        scene.refreshMenuState?.();
        GameSessionStateFactory.touch(scene.sessionState);
        return scene.sessionState;
    }
};

window.LegacySessionBridge = LegacySessionBridge;
