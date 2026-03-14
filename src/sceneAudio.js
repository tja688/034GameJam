const STAGE_BGM_EVENT_ID = 'bgm_main';
const STAGE_BGM_ASSET_IDS = Object.freeze(['dem_1', 'dem_2', 'dem_3', 'dem_4', 'dem_5']);
const STAGE_BGM_VOLUME_MUL_BY_ASSET_ID = Object.freeze({
    dem_1: 2
});

function clampStageBgmIndex(stageIndex) {
    const normalized = Number.isFinite(stageIndex) ? Math.round(stageIndex) : 0;
    return Math.max(0, Math.min(STAGE_BGM_ASSET_IDS.length - 1, normalized));
}

const SceneAudioMixin = {
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
            });
        }

        this.playAudioEvent('system_boot', { source: 'scene-create' }, { forceReplay: true });
        this.syncSceneBgm({ source: 'scene-create' });
        return this.audioManager;
    },

    ensureAudioSystem() {
        return this.audioManager || this.initAudioSystem();
    },

    getSceneBgmSpec() {
        const isMainMenu = this.menuMode === 'main';
        const stageIndex = isMainMenu ? 0 : clampStageBgmIndex(this.runState?.stageIndex || 0);
        const assetId = STAGE_BGM_ASSET_IDS[stageIndex] || STAGE_BGM_ASSET_IDS[0];
        return {
            eventId: STAGE_BGM_EVENT_ID,
            assetId,
            stageIndex,
            volumeMul: STAGE_BGM_VOLUME_MUL_BY_ASSET_ID[assetId] || 1,
            source: isMainMenu ? 'main-menu' : 'stage'
        };
    },

    syncSceneBgm(options = {}) {
        const manager = this.ensureAudioSystem();
        if (!manager) {
            return Promise.resolve(false);
        }
        const spec = this.getSceneBgmSpec();
        const currentAssetId = manager.getCurrentAssetIdForEvent?.(spec.eventId) || '';
        if (!options.forceReplay && currentAssetId === spec.assetId) {
            return Promise.resolve(true);
        }
        return manager.playEvent(spec.eventId, {
            forceReplay: true,
            assetId: spec.assetId,
            volumeMul: spec.volumeMul,
            meta: {
                ...(options.meta && typeof options.meta === 'object' ? options.meta : {}),
                source: options.source || spec.source,
                stageIndex: spec.stageIndex,
                bgmAssetId: spec.assetId
            }
        });
    },

    playAudioEvent(eventId, meta = null, options = {}) {
        const manager = this.ensureAudioSystem();
        if (!manager || !eventId) {
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
    },

    stopAllAudio(fadeOutMs = 0) {
        if (!this.audioManager) {
            return;
        }
        this.audioManager.stopAll({ fadeOutMs });
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
