const GAME_SESSION_ACCESSORS = {
    player: ['player'],
    activeNodes: ['activeNodes'],
    links: ['links'],
    prey: ['prey'],
    runState: ['runState'],
    cameraRig: ['cameraRig'],
    intent: ['intent'],
    clusterVolume: ['clusterVolume'],
    burstDrive: ['burstDrive'],
    performanceProbe: ['performanceProbe'],
    ecoTelemetry: ['ecoTelemetry'],
    effects: ['effects'],
    fragments: ['fragments'],
    poolNodes: ['poolNodes'],
    spawnTimers: ['spawnTimers'],
    baseChain: ['baseChain'],
    timeScaleFactor: ['timeScaleFactor'],
    worldTime: ['worldTime'],
    preySpawnCursor: ['preySpawnCursor'],
    preyIdCounter: ['preyIdCounter'],
    pendingDevourRewards: ['pendingDevourRewards'],
    pendingLootRewardSources: ['pendingLootRewardSources'],
    startupSequence: ['startupSequence'],
    uiState: ['uiState'],
    debugState: ['debugState'],
    sessionFlags: ['sessionFlags'],
    menuMode: ['uiState', 'menuMode'],
    toastTimer: ['uiState', 'toastTimer'],
    paused: ['sessionFlags', 'paused'],
    sessionStarted: ['sessionFlags', 'sessionStarted'],
    debugMenuOpen: ['debugState', 'menuOpen'],
    debugMenuAutoPaused: ['debugState', 'menuAutoPaused']
};

const GameSessionStateFactory = {
    create(runtimeMode = 'mainflow', options = {}) {
        return {
            player: null,
            activeNodes: [],
            links: [],
            prey: [],
            runState: null,
            cameraRig: null,
            uiState: {
                menuMode: null,
                toastTimer: null,
                overlayVisible: false
            },
            debugState: {
                menuOpen: false,
                menuAutoPaused: false,
                overlayFlags: {},
                commandPaletteOpen: false,
                recentScenarioIds: [],
                playground: {
                    activeFixtureId: '',
                    selectedEntityId: '',
                    searchQuery: '',
                    saveTargetPath: 'data/fixtures/playground/custom-sandbox.json'
                }
            },
            sessionFlags: {
                runtimeMode,
                paused: false,
                sessionStarted: options.startSession !== false
            },
            sessionMeta: {
                createdAt: Date.now(),
                revision: 0
            },
            intent: null,
            clusterVolume: null,
            burstDrive: null,
            performanceProbe: null,
            effects: [],
            fragments: [],
            poolNodes: [],
            spawnTimers: null,
            baseChain: [],
            timeScaleFactor: 1,
            worldTime: 0,
            preySpawnCursor: { small: 0, medium: 1, large: 2 },
            preyIdCounter: 1,
            pendingDevourRewards: [],
            pendingLootRewardSources: {},
            ecoTelemetry: null,
            startupSequence: null
        };
    },
    touch(sessionState) {
        if (!sessionState?.sessionMeta) {
            return;
        }
        sessionState.sessionMeta.revision = (sessionState.sessionMeta.revision || 0) + 1;
        sessionState.sessionMeta.updatedAt = Date.now();
    }
};

window.GAME_SESSION_ACCESSORS = GAME_SESSION_ACCESSORS;
window.GameSessionStateFactory = GameSessionStateFactory;
