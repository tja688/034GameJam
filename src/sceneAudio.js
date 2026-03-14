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
        return this.audioManager;
    },

    ensureAudioSystem() {
        return this.audioManager || this.initAudioSystem();
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
