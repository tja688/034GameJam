const STAGE_BGM_EVENT_ID = 'bgm_main';
const STAGE_BGM_ASSET_IDS = Object.freeze(['dem_1', 'dem_2', 'dem_3', 'dem_4', 'dem_5']);
const STARTUP_BGM_ASSET_ID = 'dem_3';
const STAGE_BGM_VOLUME_MUL_BY_ASSET_ID = Object.freeze({});
const STAGE_BGM_START_SEEK_BY_ASSET_ID = Object.freeze({
    // Manual musical-entry cuts so stage swaps land on the groove instead of the cold intro.
    dem_1: 4.8,
    dem_2: 4.6,
    dem_3: 4.9,
    dem_4: 4.4,
    dem_5: 4.2
});
const BGM_STATE_MODE = Object.freeze({
    idle: 'idle',
    switching: 'switching',
    playing: 'playing'
});

function createDefaultBgmState() {
    return {
        mode: BGM_STATE_MODE.idle,
        activeAssetId: '',
        requestedAssetId: '',
        requestSerial: 0,
        lastStageIndex: -1
    };
}

function clampStageBgmIndex(stageIndex) {
    const normalized = Number.isFinite(stageIndex) ? Math.round(stageIndex) : 0;
    return Math.max(0, Math.min(STAGE_BGM_ASSET_IDS.length - 1, normalized));
}

const SceneAudioMixin = {
    ensureBgmState() {
        if (!this.bgmState || typeof this.bgmState !== 'object') {
            this.bgmState = createDefaultBgmState();
        }
        return this.bgmState;
    },

    initAudioSystem() {
        if (this.audioManager) {
            return this.audioManager;
        }
        this.audioManager = new CoreAudioManager(this, {
            profileStorageKey: STORAGE_KEYS.audioProfile
        });
        window.audioManager = this.audioManager;
        window.playAudioEvent = (eventId, options = {}) => {
            return window.activeScene?.playAudioEvent?.(eventId, options.meta || null, options);
        };
        window.getAudioDebugSnapshot = () => window.activeScene?.audioManager?.getDebugSnapshot?.() || null;
        window.getAudioTrace = () => window.activeScene?.audioManager?.getDebugSnapshot?.()?.recentAudioTrace || [];

        const devToolsEnabled = this.isDebugToolsEnabled?.() ?? (window.CORE_DEMO_DEBUG !== false);
        if (devToolsEnabled) {
            if (window.audioDebugPanel && typeof window.audioDebugPanel.destroy === 'function') {
                window.audioDebugPanel.destroy();
            }
            window.audioDebugPanel = new CoreAudioDebugPanel(this, this.audioManager, {
                showToggle: false
            });
        }

        if (this.events && !this._audioShutdownBound) {
            this._audioShutdownBound = true;
            this.events.once('shutdown', () => {
                this.audioManager?.stopAll?.({ fadeOutMs: 40 });
                this.bgmState = createDefaultBgmState();
            });
        }

        this.ensureBgmState();
        this.playAudioEvent('system_boot', { source: 'scene-create' }, { forceReplay: true });
        this.syncSceneBgm({ source: 'scene-create' });
        return this.audioManager;
    },

    ensureAudioSystem() {
        return this.audioManager || this.initAudioSystem();
    },

    getSceneBgmSpec() {
        const isStartupScene = !!(this.isStartupSequenceActive?.() && !this.sessionStarted);
        const isMainMenu = this.menuMode === 'main';
        const startupStageIndex = STAGE_BGM_ASSET_IDS.indexOf(STARTUP_BGM_ASSET_ID);
        const stageIndex = isStartupScene
            ? Math.max(0, startupStageIndex)
            : isMainMenu
                ? 0
                : clampStageBgmIndex(this.runState?.stageIndex || 0);
        const assetId = isStartupScene
            ? STARTUP_BGM_ASSET_ID
            : (STAGE_BGM_ASSET_IDS[stageIndex] || STAGE_BGM_ASSET_IDS[0]);
        return {
            eventId: STAGE_BGM_EVENT_ID,
            assetId,
            stageIndex,
            volumeMul: STAGE_BGM_VOLUME_MUL_BY_ASSET_ID[assetId] || 1,
            startSeek: STAGE_BGM_START_SEEK_BY_ASSET_ID[assetId] || 0,
            source: isStartupScene ? 'startup' : isMainMenu ? 'main-menu' : 'stage'
        };
    },

    syncSceneBgm(options = {}) {
        const manager = this.ensureAudioSystem();
        if (!manager) {
            return Promise.resolve(false);
        }
        const spec = this.getSceneBgmSpec();
        const bgmState = this.ensureBgmState();
        const currentAssetId = manager.getCurrentAssetIdForEvent?.(spec.eventId) || '';
        if (!options.forceReplay && bgmState.mode === BGM_STATE_MODE.switching && bgmState.requestedAssetId === spec.assetId) {
            return Promise.resolve(true);
        }
        if (!options.forceReplay && currentAssetId === spec.assetId) {
            bgmState.mode = BGM_STATE_MODE.playing;
            bgmState.activeAssetId = spec.assetId;
            bgmState.requestedAssetId = '';
            bgmState.lastStageIndex = spec.stageIndex;
            return Promise.resolve(true);
        }
        const requestSerial = (bgmState.requestSerial || 0) + 1;
        bgmState.requestSerial = requestSerial;
        bgmState.mode = BGM_STATE_MODE.switching;
        bgmState.requestedAssetId = spec.assetId;
        bgmState.lastStageIndex = spec.stageIndex;

        // Hard stop old BGM first, then start a single authoritative voice.
        manager.stopEvent(spec.eventId, { fadeOutMs: 0 });

        return manager.playEvent(spec.eventId, {
            forceReplay: true,
            dedupeInFlight: false,
            assetId: spec.assetId,
            volumeMul: spec.volumeMul,
            seek: spec.startSeek,
            overridePatch: {
                cooldown: 0,
                loop: true,
                maxVoices: 1,
                strategy: 'first'
            },
            meta: {
                ...(options.meta && typeof options.meta === 'object' ? options.meta : {}),
                source: options.source || spec.source,
                stageIndex: spec.stageIndex,
                bgmAssetId: spec.assetId,
                bgmStartSeek: spec.startSeek
            },
            playGuard: () => {
                const liveState = this.ensureBgmState();
                return liveState.requestSerial === requestSerial && liveState.requestedAssetId === spec.assetId;
            }
        }).then((played) => {
            const liveState = this.ensureBgmState();
            if (liveState.requestSerial !== requestSerial) {
                return false;
            }
            liveState.mode = played ? BGM_STATE_MODE.playing : BGM_STATE_MODE.idle;
            liveState.activeAssetId = played ? spec.assetId : '';
            liveState.requestedAssetId = '';
            return played;
        }).catch((error) => {
            const liveState = this.ensureBgmState();
            if (liveState.requestSerial === requestSerial) {
                liveState.mode = BGM_STATE_MODE.idle;
                liveState.activeAssetId = '';
                liveState.requestedAssetId = '';
            }
            console.warn('Failed to sync scene BGM.', error);
            return false;
        });
    },

    playAudioEvent(eventId, meta = null, options = {}) {
        const manager = this.ensureAudioSystem();
        if (!manager || !eventId) {
            return Promise.resolve(false);
        }
        if (this.isStartupSequenceActive?.() && ![
            STAGE_BGM_EVENT_ID,
            'system_boot',
            'ui_click',
            'game_start_new_run'
        ].includes(eventId)) {
            return Promise.resolve(false);
        }
        if (manager.isEventSuppressed?.(eventId)) {
            return Promise.resolve(false);
        }
        return manager.playEvent(eventId, {
            ...(options || {}),
            meta: meta && typeof meta === 'object' ? meta : {}
        });
    },

    previewAudioAsset(assetId, options = {}) {
        const manager = this.ensureAudioSystem();
        if (!manager || !assetId) {
            return Promise.resolve(false);
        }
        return manager.playAssetPreview(assetId, options);
    },

    stopAudioEvent(eventId, fadeOutMs = 0) {
        if (!this.audioManager || !eventId) {
            return;
        }
        this.audioManager.stopEvent(eventId, { fadeOutMs });
        if (eventId === STAGE_BGM_EVENT_ID) {
            this.bgmState = createDefaultBgmState();
        }
    },

    stopAllAudio(fadeOutMs = 0) {
        if (!this.audioManager) {
            return;
        }
        this.audioManager.stopAll({ fadeOutMs });
        this.bgmState = createDefaultBgmState();
    },

    applyAudioRuntimeOverride(eventId, patch) {
        if (!this.audioManager || !eventId) {
            return;
        }
        this.audioManager.setRuntimeOverride(eventId, patch, { persist: false });
    },

    applyAudioEventConfig(eventId, patch, persist = true) {
        if (!this.audioManager || !eventId) {
            return false;
        }
        return this.audioManager.applyEventConfig(eventId, patch, { persist, clearRuntime: true });
    }
};
