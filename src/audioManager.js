const AUDIO_PROFILE_SCHEMA_VERSION = 1;
const AUDIO_PROFILE_PATH = 'audio-profile.json';
const AUDIO_LIBRARY_MANIFEST_PATH = 'audio-library.manifest.json';

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function normalizeAudioPath(basePath, rawPath) {
    if (!isNonEmptyString(rawPath)) {
        return '';
    }
    const normalized = rawPath.trim().replace(/\\/g, '/');
    if (/^https?:\/\//i.test(normalized) || normalized.startsWith('/')) {
        return normalized;
    }
    const base = isNonEmptyString(basePath) ? basePath.trim().replace(/\\/g, '/').replace(/\/+$/, '') : '';
    return base ? `${base}/${normalized.replace(/^\/+/, '')}` : normalized;
}

function normalizeAudioAssetList(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return [...new Set(value.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter((entry) => entry.length > 0))];
}

function tokenizeAudioSearchTerms(...values) {
    const tokens = new Set();
    values.forEach((value) => {
        if (typeof value !== 'string' || !value.trim()) {
            return;
        }
        value
            .toLowerCase()
            .split(/[^a-z0-9]+/g)
            .filter((token) => token.length >= 2)
            .forEach((token) => tokens.add(token));
    });
    return [...tokens];
}

class CoreAudioManager {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.sound = scene?.sound || null;
        this.manifestPath = options.manifestPath || AUDIO_LIBRARY_MANIFEST_PATH;
        this.profilePath = options.profilePath || AUDIO_PROFILE_PATH;
        this.profileStorageKey = options.profileStorageKey || STORAGE_KEYS.audioProfile;
        this.eventRegistry = Array.isArray(AUDIO_EVENT_REGISTRY) ? AUDIO_EVENT_REGISTRY : [];
        this.eventIndex = new Map(this.eventRegistry.map((entry) => [entry.id, entry]));

        this.busVolumes = { ...AUDIO_DEFAULT_BUS_VOLUMES };
        this.appliedEventBindings = {};
        this.runtimeOverrides = {};
        this.manifestMeta = {
            path: this.manifestPath,
            version: 0,
            generatedAt: '',
            basePath: 'assets/audio',
            preloadLimit: 24
        };
        this.assetCatalog = [];
        this.assetById = new Map();
        this.assetIdByKey = new Map();
        this.assetLoadState = {};
        this.assetLoadQueue = [];
        this.assetLoadPromises = new Map();
        this.assetLoadRunning = false;
        this.pendingPlayRequests = new Map();

        this.eventMetrics = {};
        this.eventLastPlayedAt = {};
        this.eventRoundRobinCursor = {};
        this.activeVoicesByEvent = new Map();
        this.activeVoices = new Set();
        this.previewVoices = new Set();
        this.debugListeners = new Set();
        this.recentEvents = [];
        this.recentAudioTrace = [];
        this.lastSaveResult = { ok: true, message: '' };
        this.audioUnlockInstalled = false;
        this.nextVoiceId = 1;
        this.runtimeGuardInstalled = false;
        this.lastRuntimeGuardAt = 0;

        this.bootstrap();
    }

    bootstrap() {
        this.loadManifestFromDisk();
        this.loadProfileFromStorage();
        this.installAutoplayUnlock();
        this.installRuntimeGuards();
        this.preloadInitialAssets();
        this.emitDebugUpdate('boot');
    }

    onDebugUpdate(listener) {
        if (typeof listener !== 'function') {
            return () => {};
        }
        this.debugListeners.add(listener);
        return () => {
            this.debugListeners.delete(listener);
        };
    }

    emitDebugUpdate(reason, payload = null) {
        this.debugListeners.forEach((listener) => {
            try {
                listener(reason, payload);
            } catch (error) {
                console.warn('Audio debug listener failed.', error);
            }
        });
    }

    getNowMs() {
        if (typeof performance?.now === 'function') {
            return performance.now();
        }
        return Date.now();
    }

    installAutoplayUnlock() {
        if (this.audioUnlockInstalled) {
            return;
        }
        this.audioUnlockInstalled = true;
        const resume = () => {
            if (!this.sound?.context || typeof this.sound.context.resume !== 'function') {
                return;
            }
            if (this.sound.context.state === 'running') {
                window.removeEventListener('pointerdown', resume, true);
                window.removeEventListener('keydown', resume, true);
                return;
            }
            this.sound.context.resume().catch(() => {});
        };
        window.addEventListener('pointerdown', resume, true);
        window.addEventListener('keydown', resume, true);
    }

    installRuntimeGuards() {
        if (this.runtimeGuardInstalled || !this.scene?.events) {
            return;
        }
        this.runtimeGuardInstalled = true;
        this.scene.events.on('update', this.handleRuntimeGuardUpdate, this);
        this.scene.events.once('shutdown', () => {
            this.scene?.events?.off?.('update', this.handleRuntimeGuardUpdate, this);
            this.runtimeGuardInstalled = false;
        });
    }

    handleRuntimeGuardUpdate() {
        const now = this.getNowMs();
        if (now - this.lastRuntimeGuardAt < 250) {
            return;
        }
        this.lastRuntimeGuardAt = now;
        this.enforceBgmSingleton();
    }

    readJsonFile(filePath) {
        if (!isNonEmptyString(filePath)) {
            return null;
        }
        if (typeof readRepoJson === 'function') {
            return readRepoJson(filePath);
        }
        try {
            const request = new XMLHttpRequest();
            request.open('GET', `${filePath}?_ts=${Date.now()}`, false);
            request.send(null);
            if (request.status !== 200 || !request.responseText) {
                return null;
            }
            return JSON.parse(request.responseText);
        } catch (error) {
            console.warn(`Failed to read JSON file "${filePath}".`, error);
            return null;
        }
    }

    normalizeManifestAsset(entry, index, basePath) {
        if (!entry || typeof entry !== 'object') {
            return null;
        }
        const fallbackId = `audio_asset_${index + 1}`;
        const rawId = isNonEmptyString(entry.id) ? entry.id.trim() : fallbackId;
        const id = rawId.replace(/\s+/g, '_');
        const urlsFromFiles = Array.isArray(entry.files)
            ? entry.files.map((path) => normalizeAudioPath(basePath, path)).filter((path) => path.length > 0)
            : [];
        const singlePath = normalizeAudioPath(basePath, entry.path || '');
        const explicitUrls = Array.isArray(entry.urls)
            ? entry.urls.map((path) => normalizeAudioPath('', path)).filter((path) => path.length > 0)
            : [];
        const urls = [...new Set([...explicitUrls, ...urlsFromFiles, ...(singlePath ? [singlePath] : [])])];
        if (urls.length <= 0) {
            return null;
        }
        const keySafeId = id.replace(/[^a-zA-Z0-9_:.@-]/g, '_');
        const tags = Array.isArray(entry.tags)
            ? [...new Set(entry.tags.map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : '')).filter((tag) => tag.length > 0))]
            : [];
        return {
            id,
            key: `audio__${keySafeId}`,
            group: isNonEmptyString(entry.group) ? entry.group.trim() : 'misc',
            label: isNonEmptyString(entry.label) ? entry.label.trim() : id,
            tags,
            preload: !!entry.preload,
            urls,
            raw: entry
        };
    }

    loadManifestFromDisk() {
        const manifestRaw = this.readJsonFile(this.manifestPath);
        const manifest = manifestRaw && typeof manifestRaw === 'object' ? manifestRaw : {};
        const basePath = isNonEmptyString(manifest.basePath) ? manifest.basePath : 'assets/audio';
        const preloadLimit = clamp(
            Math.round(Number.isFinite(manifest.preloadLimit) ? manifest.preloadLimit : 24),
            0,
            256
        );
        const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
        const normalizedAssets = [];
        const seenIds = new Set();
        assets.forEach((entry, index) => {
            const normalized = this.normalizeManifestAsset(entry, index, basePath);
            if (!normalized) {
                return;
            }
            if (seenIds.has(normalized.id)) {
                return;
            }
            seenIds.add(normalized.id);
            normalizedAssets.push(normalized);
        });
        this.manifestMeta = {
            path: this.manifestPath,
            version: Number.isFinite(manifest.version) ? manifest.version : 1,
            generatedAt: isNonEmptyString(manifest.generatedAt) ? manifest.generatedAt : '',
            basePath,
            preloadLimit
        };
        this.assetCatalog = normalizedAssets;
        this.assetById = new Map(normalizedAssets.map((asset) => [asset.id, asset]));
        this.assetIdByKey = new Map(normalizedAssets.map((asset) => [asset.key, asset.id]));
        this.assetLoadState = {};
        normalizedAssets.forEach((asset) => {
            this.assetLoadState[asset.id] = {
                status: this.scene?.cache?.audio?.exists(asset.key) ? 'loaded' : 'idle',
                error: ''
            };
        });
    }

    sanitizeBusVolumes(rawVolumes) {
        const next = { ...AUDIO_DEFAULT_BUS_VOLUMES };
        if (!rawVolumes || typeof rawVolumes !== 'object') {
            return next;
        }
        AUDIO_BUS_ORDER.forEach((bus) => {
            if (!Number.isFinite(rawVolumes[bus])) {
                return;
            }
            next[bus] = clamp(rawVolumes[bus], 0, 2);
        });
        return next;
    }

    normalizeEventPatch(rawPatch, eventId = '') {
        const defaults = getAudioEventDefaults(eventId);
        const patch = rawPatch && typeof rawPatch === 'object' ? rawPatch : {};
        return {
            enabled: typeof patch.enabled === 'boolean' ? patch.enabled : defaults.enabled,
            bus: isNonEmptyString(patch.bus) ? patch.bus.trim() : defaults.bus,
            volume: Number.isFinite(patch.volume) ? clamp(patch.volume, 0, 2) : defaults.volume,
            rate: Number.isFinite(patch.rate) ? clamp(patch.rate, 0.2, 3) : defaults.rate,
            detune: Number.isFinite(patch.detune) ? clamp(patch.detune, -2400, 2400) : defaults.detune,
            loop: typeof patch.loop === 'boolean' ? patch.loop : defaults.loop,
            cooldown: Number.isFinite(patch.cooldown) ? clamp(patch.cooldown, 0, 8) : defaults.cooldown,
            maxVoices: Number.isFinite(patch.maxVoices) ? clamp(Math.round(patch.maxVoices), 1, 24) : defaults.maxVoices,
            strategy: isNonEmptyString(patch.strategy) ? patch.strategy.trim() : defaults.strategy,
            assetPool: normalizeAudioAssetList(Array.isArray(patch.assetPool) ? patch.assetPool : [])
        };
    }

    normalizeBindingMap(rawMap) {
        const source = rawMap && typeof rawMap === 'object' ? rawMap : {};
        const output = {};
        Object.keys(source).forEach((eventId) => {
            output[eventId] = this.normalizeEventPatch(source[eventId], eventId);
        });
        return output;
    }

    loadProfileFromStorage() {
        const raw = typeof readStoredJson === 'function'
            ? readStoredJson(this.profileStorageKey)
            : this.readJsonFile(this.profilePath);
        if (!raw || typeof raw !== 'object') {
            this.busVolumes = { ...AUDIO_DEFAULT_BUS_VOLUMES };
            this.appliedEventBindings = {};
            this.runtimeOverrides = {};
            return;
        }
        this.busVolumes = this.sanitizeBusVolumes(raw.busVolumes);
        const legacyBindings = raw.eventBindings || {};
        this.appliedEventBindings = this.normalizeBindingMap(raw.appliedEventBindings || legacyBindings);
        this.runtimeOverrides = this.normalizeBindingMap(raw.runtimeOverrides || {});
    }

    buildProfilePayload() {
        return {
            version: AUDIO_PROFILE_SCHEMA_VERSION,
            savedAt: Date.now(),
            manifestPath: this.manifestPath,
            busVolumes: this.sanitizeBusVolumes(this.busVolumes),
            appliedEventBindings: cloneData(this.appliedEventBindings),
            runtimeOverrides: cloneData(this.runtimeOverrides)
        };
    }

    saveProfile() {
        const payload = this.buildProfilePayload();
        const ok = typeof writeStoredJson === 'function'
            ? writeStoredJson(this.profileStorageKey, payload)
            : false;
        this.lastSaveResult = {
            ok,
            message: ok ? 'saved' : 'write failed'
        };
        this.emitDebugUpdate('profile_saved', this.lastSaveResult);
        return ok;
    }

    getAppliedEventConfig(eventId) {
        return this.appliedEventBindings[eventId] || null;
    }

    getRuntimeOverride(eventId) {
        return this.runtimeOverrides[eventId] || null;
    }

    getResolvedEventConfig(eventId, inlineOverride = null) {
        const base = getAudioEventDefaults(eventId);
        const applied = this.getAppliedEventConfig(eventId) || {};
        const runtime = this.getRuntimeOverride(eventId) || {};
        const inline = inlineOverride ? this.normalizeEventPatch(inlineOverride, eventId) : {};
        return this.normalizeEventPatch({
            ...base,
            ...applied,
            ...runtime,
            ...inline,
            assetPool: inline.assetPool || runtime.assetPool || applied.assetPool || base.assetPool
        }, eventId);
    }

    getEventMetrics(eventId) {
        if (!this.eventMetrics[eventId]) {
            this.eventMetrics[eventId] = {
                triggerCount: 0,
                playCount: 0,
                skipCount: 0,
                lastTriggeredAt: 0,
                lastPlayedAt: 0,
                lastStatus: 'idle',
                lastReason: '',
                lastAssetId: '',
                lastMeta: null
            };
        }
        return this.eventMetrics[eventId];
    }

    recordEvent(eventId, status, reason = '', assetId = '', meta = null) {
        const metrics = this.getEventMetrics(eventId);
        const now = this.getNowMs();
        metrics.triggerCount += 1;
        metrics.lastTriggeredAt = now;
        metrics.lastStatus = status;
        metrics.lastReason = reason || '';
        metrics.lastAssetId = assetId || '';
        metrics.lastMeta = meta && typeof meta === 'object' ? meta : null;
        if (status === 'played') {
            metrics.playCount += 1;
            metrics.lastPlayedAt = now;
        } else if (status === 'skipped') {
            metrics.skipCount += 1;
        }
        this.recentEvents.unshift({
            eventId,
            status,
            reason: metrics.lastReason,
            assetId: metrics.lastAssetId,
            at: now
        });
        if (this.recentEvents.length > 64) {
            this.recentEvents.length = 64;
        }
        this.recentAudioTrace.unshift({
            eventId,
            status,
            reason: metrics.lastReason,
            assetId: metrics.lastAssetId,
            meta: metrics.lastMeta ? cloneData(metrics.lastMeta) : null,
            at: now
        });
        if (this.recentAudioTrace.length > 128) {
            this.recentAudioTrace.length = 128;
        }
        this.emitDebugUpdate('event', { eventId, status, reason, assetId });
    }

    buildPendingPlayRequestKey(eventId, assetId) {
        return `${eventId}::${assetId || ''}`;
    }

    getPendingPlayRequest(eventId, assetId) {
        const key = this.buildPendingPlayRequestKey(eventId, assetId);
        return this.pendingPlayRequests.get(key) || null;
    }

    setPendingPlayRequest(eventId, assetId, promise) {
        const key = this.buildPendingPlayRequestKey(eventId, assetId);
        this.pendingPlayRequests.set(key, promise);
        promise.finally(() => {
            if (this.pendingPlayRequests.get(key) === promise) {
                this.pendingPlayRequests.delete(key);
            }
        });
        return promise;
    }

    getActiveVoicesForEvent(eventId) {
        if (!this.activeVoicesByEvent.has(eventId)) {
            this.activeVoicesByEvent.set(eventId, []);
        }
        const voices = this.activeVoicesByEvent.get(eventId);
        const next = voices.filter((record) => record && !record.ended && record.sound && !record.sound.isDestroyed);
        if (next.length !== voices.length) {
            this.activeVoicesByEvent.set(eventId, next);
        }
        return next;
    }

    getCurrentVoiceForEvent(eventId) {
        const voices = this.getActiveVoicesForEvent(eventId);
        if (!Array.isArray(voices) || voices.length <= 0) {
            return null;
        }
        return voices.reduce((latest, record) => {
            if (!latest) {
                return record;
            }
            return (record?.startedAt || 0) >= (latest?.startedAt || 0) ? record : latest;
        }, null);
    }

    getCurrentAssetIdForEvent(eventId) {
        return this.getCurrentVoiceForEvent(eventId)?.assetId || '';
    }

    getLiveManagerSounds() {
        const sounds = Array.isArray(this.sound?.sounds) ? this.sound.sounds : [];
        return sounds.filter((sound) => !!sound && !sound.isDestroyed);
    }

    stopManagerSound(sound, options = {}) {
        if (!sound || sound.isDestroyed) {
            return false;
        }
        const destroy = options.destroy !== false;
        let touched = false;
        if (sound.isPlaying) {
            try {
                sound.stop();
                touched = true;
            } catch (error) {
                console.warn('Audio manager sound stop failed.', error);
            }
        }
        if (destroy && !sound.isDestroyed) {
            try {
                sound.destroy();
                touched = true;
            } catch (error) {
                console.warn('Audio manager sound destroy failed.', error);
            }
        }
        return touched;
    }

    getBgmAssetIds() {
        return normalizeAudioAssetList(this.getResolvedEventConfig('bgm_main').assetPool || []);
    }

    getBgmAssetKeys() {
        const keys = new Set();
        this.getBgmAssetIds().forEach((assetId) => {
            const key = this.getAssetEntry(assetId)?.key || '';
            if (key) {
                keys.add(key);
            }
        });
        return keys;
    }

    getTrackedSoundSet() {
        return new Set(
            [...this.activeVoices]
                .filter((record) => !!record && !record.ended && !!record.sound && !record.sound.isDestroyed)
                .map((record) => record.sound)
        );
    }

    stopOrphanedBgmManagerSounds(options = {}) {
        const bgmKeys = this.getBgmAssetKeys();
        if (bgmKeys.size <= 0) {
            return 0;
        }
        const trackedSounds = this.getTrackedSoundSet();
        const exceptSound = options.exceptSound || null;
        let cleaned = 0;
        this.getLiveManagerSounds().forEach((sound) => {
            if (
                !sound
                || sound === exceptSound
                || trackedSounds.has(sound)
                || !sound.isPlaying
                || !bgmKeys.has(sound.key || '')
            ) {
                return;
            }
            if (this.stopManagerSound(sound, { destroy: true })) {
                cleaned += 1;
            }
        });
        if (cleaned > 0) {
            this.emitDebugUpdate('orphan_bgm_cleanup', { count: cleaned });
        }
        return cleaned;
    }

    getActiveBgmVoiceRecords() {
        return [...this.activeVoices]
            .filter((record) => (
                !!record
                && !record.ended
                && record.bus === 'bgm'
                && !record.preview
                && !!record.sound
                && !record.sound.isDestroyed
            ))
            .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
    }

    getLiveBgmManagerSounds() {
        const bgmKeys = this.getBgmAssetKeys();
        if (bgmKeys.size <= 0) {
            return [];
        }
        return this.getLiveManagerSounds()
            .filter((sound) => bgmKeys.has(sound.key || '') && !!sound.isPlaying)
            .sort((a, b) => {
                const aAt = Number.isFinite(a.__coreAudioStartedAt) ? a.__coreAudioStartedAt : 0;
                const bAt = Number.isFinite(b.__coreAudioStartedAt) ? b.__coreAudioStartedAt : 0;
                return bAt - aAt;
            });
    }

    enforceBgmSingleton() {
        const bgmSounds = this.getLiveBgmManagerSounds();
        if (bgmSounds.length <= 1) {
            return 0;
        }

        const trackedBgmVoices = this.getActiveBgmVoiceRecords();
        const keeper = trackedBgmVoices[0]?.sound || bgmSounds[0] || null;
        let cleaned = 0;
        bgmSounds.forEach((sound) => {
            if (!sound || sound === keeper) {
                return;
            }
            if (this.stopManagerSound(sound, { destroy: true })) {
                cleaned += 1;
            }
        });

        if (cleaned > 0) {
            this.emitDebugUpdate('bgm_singleton_enforced', {
                cleaned,
                keeperKey: keeper?.key || ''
            });
        }
        return cleaned;
    }

    getRuntimeSnapshot() {
        const now = this.getNowMs();
        const trackedSounds = this.getTrackedSoundSet();
        const bgmKeys = this.getBgmAssetKeys();
        const activeVoices = [...this.activeVoices]
            .filter((record) => !!record && !record.ended && !!record.sound && !record.sound.isDestroyed)
            .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))
            .map((record) => ({
                voiceId: record.voiceId || '',
                eventId: record.eventId,
                assetId: record.assetId,
                bus: record.bus,
                preview: !!record.preview,
                loop: !!record.loop,
                startedAt: record.startedAt || 0,
                ageMs: Math.max(0, now - (record.startedAt || now)),
                isPlaying: !!record.sound?.isPlaying,
                isPaused: !!record.sound?.isPaused,
                volume: Number.isFinite(record.sound?.volume) ? record.sound.volume : null,
                rate: Number.isFinite(record.sound?.rate) ? record.sound.rate : null
            }));
        const managerSounds = this.getLiveManagerSounds().map((sound, index) => ({
            index,
            key: sound.key || '',
            assetId: sound.__coreAudioAssetId || this.assetIdByKey.get(sound.key || '') || '',
            eventId: sound.__coreAudioEventId || '',
            voiceId: sound.__coreAudioVoiceId || '',
            tracked: trackedSounds.has(sound),
            isPlaying: !!sound.isPlaying,
            isPaused: !!sound.isPaused,
            loop: !!sound.loop,
            volume: Number.isFinite(sound.volume) ? sound.volume : null,
            rate: Number.isFinite(sound.rate) ? sound.rate : null
        }));
        return {
            activeVoices,
            managerSounds,
            pendingPlayRequests: Array.from(this.pendingPlayRequests.keys()),
            orphanBgmVoices: managerSounds.filter((entry) => entry.isPlaying && bgmKeys.has(entry.key) && !entry.tracked)
        };
    }

    enforceVoiceLimit(eventId, maxVoices) {
        const voices = this.getActiveVoicesForEvent(eventId);
        while (voices.length >= maxVoices) {
            const oldest = voices.shift();
            this.scheduleStop(oldest, 10);
        }
    }

    getEffectiveBusGain(bus) {
        const master = clamp(this.busVolumes.master ?? AUDIO_DEFAULT_BUS_VOLUMES.master, 0, 2);
        if (bus === 'master') {
            return master;
        }
        const busGain = clamp(this.busVolumes[bus] ?? AUDIO_DEFAULT_BUS_VOLUMES[bus] ?? 1, 0, 2);
        return master * busGain;
    }

    isEventInCooldown(eventId, cooldownSeconds, nowMs) {
        if (cooldownSeconds <= 0) {
            return false;
        }
        const lastPlayed = this.eventLastPlayedAt[eventId] || 0;
        return nowMs - lastPlayed < cooldownSeconds * 1000;
    }

    buildEventSearchTokens(eventId) {
        const definition = getAudioEventDefinition(eventId) || {};
        return tokenizeAudioSearchTerms(
            eventId,
            definition.group || '',
            definition.label || '',
            definition.anchor || '',
            definition.description || ''
        );
    }

    scoreAssetForEvent(asset, tokens) {
        if (!asset || !Array.isArray(tokens) || tokens.length <= 0) {
            return 0;
        }
        const searchable = `${asset.id} ${asset.group || ''} ${asset.label || ''} ${(asset.tags || []).join(' ')}`.toLowerCase();
        let score = 0;
        tokens.forEach((token) => {
            if (!searchable.includes(token)) {
                return;
            }
            score += token.length >= 4 ? 2 : 1;
            if (asset.id.toLowerCase().startsWith(token)) {
                score += 1;
            }
        });
        return score;
    }

    findFuzzyAssetPool(eventId, limit = 8) {
        const tokens = this.buildEventSearchTokens(eventId);
        if (tokens.length <= 0) {
            return [];
        }
        return this.assetCatalog
            .map((asset) => ({
                id: asset.id,
                score: this.scoreAssetForEvent(asset, tokens)
            }))
            .filter((candidate) => candidate.score > 0)
            .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
            .slice(0, Math.max(1, limit))
            .map((candidate) => candidate.id);
    }

    findHintAssetPool(hints, limit = 8) {
        const normalizedHints = tokenizeAudioSearchTerms(...(Array.isArray(hints) ? hints : []));
        if (normalizedHints.length <= 0) {
            return [];
        }
        return this.assetCatalog
            .map((asset) => ({
                id: asset.id,
                score: this.scoreAssetForEvent(asset, normalizedHints)
            }))
            .filter((candidate) => candidate.score > 0)
            .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
            .slice(0, Math.max(1, limit))
            .map((candidate) => candidate.id);
    }

    findGroupFallbackPool(eventId, config, limit = 8) {
        const definition = getAudioEventDefinition(eventId) || {};
        const hintsByGroup = {
            ui: ['ui', 'button', 'click', 'open', 'close', 'select'],
            editor: ['ui', 'button', 'click', 'select'],
            topology: ['ui', 'button', 'click', 'select'],
            player: ['player', 'hit', 'hurt', 'jump', 'swim', 'step'],
            prey: ['spawn', 'hit', 'capture', 'explode', 'jellyfish'],
            progression: ['transition', 'task', 'completed', 'spawn', 'open', 'close'],
            system: ['ui', 'button', 'transition', 'open']
        };
        const groupHints = hintsByGroup[definition.group] || [];
        const busHints = config.bus === 'ui'
            ? ['ui', 'button', 'click', 'select']
            : config.bus === 'ambience'
                ? ['ambience', 'ocean', 'main']
                : ['hit', 'spawn', 'move', 'step'];
        return this.findHintAssetPool([...groupHints, ...busHints], limit);
    }

    resolveCandidatePool(eventId, config, forcedAssetId = '') {
        if (isNonEmptyString(forcedAssetId)) {
            return [forcedAssetId.trim()];
        }
        const configuredPool = normalizeAudioAssetList(config.assetPool || []);
        const knownPool = configuredPool.filter((assetId) => this.assetById.has(assetId));
        if (knownPool.length > 0) {
            return knownPool;
        }
        const fuzzy = this.findFuzzyAssetPool(eventId, 8);
        if (fuzzy.length > 0) {
            return fuzzy;
        }
        const groupFallback = this.findGroupFallbackPool(eventId, config, 8);
        if (groupFallback.length > 0) {
            return groupFallback;
        }
        if (configuredPool.length > 0) {
            return configuredPool;
        }
        return fuzzy;
    }

    pickAssetId(eventId, pool, strategy = 'random') {
        if (!Array.isArray(pool) || pool.length <= 0) {
            return '';
        }
        if (strategy === 'first') {
            return pool[0];
        }
        if (strategy === 'round_robin') {
            const cursor = this.eventRoundRobinCursor[eventId] || 0;
            this.eventRoundRobinCursor[eventId] = cursor + 1;
            return pool[cursor % pool.length];
        }
        return pool[Math.floor(Math.random() * pool.length)];
    }

    getAssetEntry(assetId) {
        return this.assetById.get(assetId) || null;
    }

    getAssetState(assetId) {
        return this.assetLoadState[assetId] || { status: 'missing', error: '' };
    }

    isAssetLoaded(assetId) {
        const entry = this.getAssetEntry(assetId);
        if (!entry) {
            return false;
        }
        if (this.scene?.cache?.audio?.exists(entry.key)) {
            this.assetLoadState[assetId] = { status: 'loaded', error: '' };
            return true;
        }
        return this.getAssetState(assetId).status === 'loaded';
    }

    ensureAssetLoaded(assetId) {
        const entry = this.getAssetEntry(assetId);
        if (!entry) {
            return Promise.resolve(false);
        }
        if (this.isAssetLoaded(assetId)) {
            return Promise.resolve(true);
        }
        if (this.assetLoadPromises.has(assetId)) {
            return this.assetLoadPromises.get(assetId);
        }
        const promise = new Promise((resolve) => {
            this.assetLoadQueue.push({ assetId, entry, resolve });
            this.assetLoadState[assetId] = { status: 'queued', error: '' };
            this.emitDebugUpdate('asset_queue', { assetId });
            this.processAssetLoadQueue();
        });
        this.assetLoadPromises.set(assetId, promise);
        promise.finally(() => {
            this.assetLoadPromises.delete(assetId);
        });
        return promise;
    }

    processAssetLoadQueue() {
        if (this.assetLoadRunning || this.assetLoadQueue.length <= 0) {
            return;
        }
        if (!this.scene?.load) {
            const pending = this.assetLoadQueue.splice(0);
            pending.forEach((job) => {
                this.assetLoadState[job.assetId] = { status: 'error', error: 'loader unavailable' };
                job.resolve(false);
            });
            return;
        }
        const loader = this.scene.load;
        const loaderBusy = typeof loader.isLoading === 'function' ? loader.isLoading() : !!loader.isLoading;
        if (loaderBusy) {
            window.setTimeout(() => this.processAssetLoadQueue(), 30);
            return;
        }
        const job = this.assetLoadQueue.shift();
        if (!job) {
            return;
        }
        const { assetId, entry } = job;
        if (this.scene?.cache?.audio?.exists(entry.key)) {
            this.assetLoadState[assetId] = { status: 'loaded', error: '' };
            job.resolve(true);
            this.processAssetLoadQueue();
            return;
        }

        this.assetLoadRunning = true;
        this.assetLoadState[assetId] = { status: 'loading', error: '' };
        let loadError = '';
        const onLoadError = (file) => {
            if (file?.key === entry.key) {
                loadError = 'file load error';
            }
        };
        const onComplete = () => {
            loader.off('loaderror', onLoadError);
            this.assetLoadRunning = false;
            const loaded = !!this.scene?.cache?.audio?.exists(entry.key);
            this.assetLoadState[assetId] = {
                status: loaded ? 'loaded' : 'error',
                error: loaded ? '' : (loadError || 'not cached')
            };
            this.emitDebugUpdate('asset_loaded', { assetId, loaded });
            job.resolve(loaded);
            this.processAssetLoadQueue();
        };

        loader.on('loaderror', onLoadError);
        loader.once('complete', onComplete);
        try {
            loader.audio(entry.key, entry.urls);
            loader.start();
        } catch (error) {
            loader.off('loaderror', onLoadError);
            loader.off('complete', onComplete);
            this.assetLoadRunning = false;
            this.assetLoadState[assetId] = { status: 'error', error: String(error?.message || error) };
            this.emitDebugUpdate('asset_loaded', { assetId, loaded: false });
            job.resolve(false);
            this.processAssetLoadQueue();
        }
    }

    computePlaybackConfig(config, eventId, assetId, options = {}) {
        const bus = isNonEmptyString(config.bus) ? config.bus : 'sfx';
        const volumeMul = Number.isFinite(options.volumeMul) ? options.volumeMul : 1;
        const rateMul = Number.isFinite(options.rateMul) ? options.rateMul : 1;
        const detuneAdd = Number.isFinite(options.detuneAdd) ? options.detuneAdd : 0;
        const seek = Number.isFinite(options.seek) ? Math.max(0, options.seek) : 0;
        const finalVolume = clamp(config.volume * this.getEffectiveBusGain(bus) * volumeMul, 0, 2);
        return {
            eventId,
            assetId,
            bus,
            volume: finalVolume,
            baseVolume: clamp(config.volume * volumeMul, 0, 2),
            rate: clamp(config.rate * rateMul, 0.2, 3),
            detune: clamp(config.detune + detuneAdd, -2400, 2400),
            seek,
            loop: !!config.loop,
            preview: !!options.preview
        };
    }

    registerVoice(record) {
        if (!record.voiceId) {
            record.voiceId = `voice_${this.nextVoiceId++}`;
        }
        const eventVoices = this.getActiveVoicesForEvent(record.eventId);
        eventVoices.push(record);
        this.activeVoices.add(record);
        if (record.sound) {
            record.sound.__coreAudioVoiceId = record.voiceId;
            record.sound.__coreAudioEventId = record.eventId;
            record.sound.__coreAudioAssetId = record.assetId;
            record.sound.__coreAudioStartedAt = record.startedAt || this.getNowMs();
        }
        if (record.preview) {
            this.previewVoices.add(record);
        }
        this.emitDebugUpdate('voice_registered', {
            voiceId: record.voiceId,
            eventId: record.eventId,
            assetId: record.assetId
        });
    }

    onVoiceEnded(record) {
        if (!record || record.ended) {
            return;
        }
        record.ended = true;
        const voices = this.activeVoicesByEvent.get(record.eventId);
        if (Array.isArray(voices)) {
            this.activeVoicesByEvent.set(record.eventId, voices.filter((entry) => entry !== record && !entry.ended));
        }
        this.activeVoices.delete(record);
        this.previewVoices.delete(record);
        this.emitDebugUpdate('voice_ended', {
            voiceId: record.voiceId || '',
            eventId: record.eventId,
            assetId: record.assetId
        });
    }

    scheduleStop(record, fadeOutMs = 0, options = {}) {
        if (!record || !record.sound || record.ended) {
            return;
        }
        const sound = record.sound;
        const destroyAfterStop = options.destroy !== false;
        const finalizeStop = () => {
            this.onVoiceEnded(record);
            if (destroyAfterStop && sound && !sound.isDestroyed) {
                try {
                    sound.destroy();
                } catch (error) {
                    console.warn('Audio voice destroy failed.', error);
                }
            }
        };
        if (fadeOutMs > 0 && this.scene?.tweens) {
            this.scene.tweens.add({
                targets: sound,
                volume: 0,
                duration: fadeOutMs,
                onComplete: () => {
                    if (sound && !sound.isDestroyed) {
                        try {
                            sound.stop();
                        } catch (error) {
                            console.warn('Audio voice fade-stop failed.', error);
                        }
                    }
                    finalizeStop();
                }
            });
            return;
        }
        if (sound && !sound.isDestroyed) {
            try {
                sound.stop();
            } catch (error) {
                console.warn('Audio voice stop failed.', error);
            }
        }
        finalizeStop();
    }

    stopVoicesByPredicate(predicate, options = {}) {
        if (typeof predicate !== 'function') {
            return;
        }
        const fadeOutMs = Number.isFinite(options.fadeOutMs) ? options.fadeOutMs : 0;
        const destroy = options.destroy !== false;
        [...this.activeVoices].forEach((record) => {
            if (!record || record.ended) {
                return;
            }
            if (!predicate(record)) {
                return;
            }
            this.scheduleStop(record, fadeOutMs, { destroy });
        });
    }

    ensureExclusiveBgmVoice(playback) {
        if (!playback || playback.preview || playback.bus !== 'bgm') {
            return;
        }
        this.stopVoicesByPredicate((record) => (
            !!record
            && !record.ended
            && record.bus === 'bgm'
            && !record.preview
        ), { fadeOutMs: 0, destroy: true });
        this.stopOrphanedBgmManagerSounds();
    }

    applyPlaybackSeek(sound, playback) {
        if (!sound || !playback || !(playback.seek > 0)) {
            return;
        }
        try {
            if (typeof sound.setSeek === 'function') {
                sound.setSeek(playback.seek);
                return;
            }
            if ('seek' in sound) {
                sound.seek = playback.seek;
            }
        } catch (error) {
            console.warn('Audio playback seek apply failed.', error);
        }
    }

    playEvent(eventId, options = {}) {
        const config = this.getResolvedEventConfig(eventId, options.overridePatch || null);
        const now = this.getNowMs();
        if (!config.enabled) {
            this.recordEvent(eventId, 'skipped', 'disabled', '', options.meta);
            return Promise.resolve(false);
        }
        if (!options.forceReplay && this.isEventInCooldown(eventId, config.cooldown, now)) {
            this.recordEvent(eventId, 'skipped', 'cooldown', '', options.meta);
            return Promise.resolve(false);
        }
        const pool = this.resolveCandidatePool(eventId, config, options.assetId || '');
        if (pool.length <= 0) {
            this.recordEvent(eventId, 'skipped', 'no_asset_pool', '', options.meta);
            return Promise.resolve(false);
        }

        const assetId = isNonEmptyString(options.assetId)
            ? options.assetId.trim()
            : this.pickAssetId(eventId, pool, config.strategy || 'random');
        const asset = this.getAssetEntry(assetId);
        if (!asset) {
            this.recordEvent(eventId, 'skipped', 'asset_missing', assetId, options.meta);
            return Promise.resolve(false);
        }

        const currentAssetId = this.getCurrentAssetIdForEvent(eventId);
        if (!options.forceReplay && currentAssetId === assetId) {
            this.recordEvent(eventId, 'skipped', 'already_playing', assetId, options.meta);
            return Promise.resolve(true);
        }

        if (options.dedupeInFlight !== false) {
            const pendingRequest = this.getPendingPlayRequest(eventId, assetId);
            if (pendingRequest) {
                this.recordEvent(eventId, 'skipped', 'pending_duplicate', assetId, options.meta);
                return pendingRequest;
            }
        }

        const playPromise = this.ensureAssetLoaded(assetId).then((loaded) => {
            if (!loaded) {
                this.recordEvent(eventId, 'skipped', 'asset_not_loaded', assetId, options.meta);
                return false;
            }
            if (typeof options.playGuard === 'function') {
                let allow = false;
                try {
                    allow = !!options.playGuard();
                } catch (error) {
                    allow = false;
                    console.warn('Audio play guard check failed.', error);
                }
                if (!allow) {
                    this.recordEvent(eventId, 'skipped', 'play_guard_rejected', assetId, options.meta);
                    return false;
                }
            }
            if (!this.sound) {
                this.recordEvent(eventId, 'skipped', 'sound_unavailable', assetId, options.meta);
                return false;
            }
            const playback = this.computePlaybackConfig(config, eventId, assetId, options);
            this.ensureExclusiveBgmVoice(playback);
            this.enforceVoiceLimit(eventId, config.maxVoices);
            let sound;
            try {
                sound = this.sound.add(asset.key);
            } catch (error) {
                this.recordEvent(eventId, 'skipped', `sound_add_failed:${error?.message || 'unknown'}`, assetId, options.meta);
                return false;
            }
            if (!sound) {
                this.recordEvent(eventId, 'skipped', 'sound_add_null', assetId, options.meta);
                return false;
            }

            const voiceRecord = {
                eventId,
                assetId,
                sound,
                bus: playback.bus,
                baseVolume: playback.baseVolume,
                preview: playback.preview,
                loop: playback.loop,
                startedAt: now,
                ended: false
            };
            const onEnd = () => this.onVoiceEnded(voiceRecord);
            if (!playback.loop) {
                sound.once('complete', onEnd);
            }
            sound.once('stop', onEnd);
            sound.once('destroy', onEnd);
            sound.setVolume(playback.volume);
            sound.setRate(playback.rate);
            sound.setDetune(playback.detune);
            sound.setLoop(playback.loop);
            this.registerVoice(voiceRecord);

            const playConfig = playback.seek > 0 ? { seek: playback.seek } : undefined;
            const played = playConfig ? sound.play(playConfig) : sound.play();
            if (!played) {
                this.onVoiceEnded(voiceRecord);
                sound.destroy();
                this.recordEvent(eventId, 'skipped', 'sound_play_failed', assetId, options.meta);
                return false;
            }
            this.applyPlaybackSeek(sound, playback);
            this.eventLastPlayedAt[eventId] = now;
            this.recordEvent(eventId, 'played', '', assetId, options.meta);
            return true;
        });

        return options.dedupeInFlight === false
            ? playPromise
            : this.setPendingPlayRequest(eventId, assetId, playPromise);
    }

    playAssetPreview(assetId, options = {}) {
        const previewEventId = options.eventId || 'ui_click';
        const patch = {
            bus: options.bus || 'ui',
            volume: Number.isFinite(options.volume) ? options.volume : 0.88,
            rate: Number.isFinite(options.rate) ? options.rate : 1,
            detune: Number.isFinite(options.detune) ? options.detune : 0,
            loop: !!options.loop,
            cooldown: 0,
            maxVoices: 1,
            strategy: 'first',
            assetPool: [assetId]
        };
        this.stopPreview({ fadeOutMs: 30 });
        return this.playEvent(previewEventId, {
            forceReplay: true,
            preview: true,
            overridePatch: patch,
            assetId,
            meta: { previewAsset: true }
        });
    }

    stopPreview(options = {}) {
        const fadeOutMs = Number.isFinite(options.fadeOutMs) ? options.fadeOutMs : 80;
        [...this.previewVoices].forEach((record) => {
            this.scheduleStop(record, fadeOutMs, { destroy: true });
        });
    }

    stopEvent(eventId, options = {}) {
        const fadeOutMs = Number.isFinite(options.fadeOutMs) ? options.fadeOutMs : 0;
        this.stopVoicesByPredicate((record) => record?.eventId === eventId, {
            fadeOutMs,
            destroy: true
        });
        if (eventId === 'bgm_main') {
            this.stopOrphanedBgmManagerSounds();
        }
    }

    stopAll(options = {}) {
        const fadeOutMs = Number.isFinite(options.fadeOutMs) ? options.fadeOutMs : 0;
        [...this.activeVoices].forEach((record) => {
            this.scheduleStop(record, fadeOutMs, { destroy: true });
        });
    }

    updateActiveVoiceVolumes() {
        [...this.activeVoices].forEach((record) => {
            if (!record || record.ended || !record.sound || record.sound.isDestroyed) {
                return;
            }
            const gain = clamp(record.baseVolume * this.getEffectiveBusGain(record.bus), 0, 2);
            record.sound.setVolume(gain);
        });
    }

    setBusVolume(bus, value, options = {}) {
        if (!isNonEmptyString(bus) || !AUDIO_BUS_ORDER.includes(bus)) {
            return;
        }
        this.busVolumes[bus] = clamp(Number.isFinite(value) ? value : this.busVolumes[bus], 0, 2);
        this.updateActiveVoiceVolumes();
        if (options.persist) {
            this.saveProfile();
        }
        this.emitDebugUpdate('bus_volume', { bus, value: this.busVolumes[bus] });
    }

    setRuntimeOverride(eventId, patch, options = {}) {
        if (!isNonEmptyString(eventId)) {
            return;
        }
        this.runtimeOverrides[eventId] = this.normalizeEventPatch(patch, eventId);
        if (options.persist) {
            this.saveProfile();
        }
        this.emitDebugUpdate('runtime_override', { eventId });
    }

    clearRuntimeOverride(eventId, options = {}) {
        if (!isNonEmptyString(eventId) || !Object.prototype.hasOwnProperty.call(this.runtimeOverrides, eventId)) {
            return;
        }
        delete this.runtimeOverrides[eventId];
        if (options.persist) {
            this.saveProfile();
        }
        this.emitDebugUpdate('runtime_override_clear', { eventId });
    }

    applyEventConfig(eventId, patch, options = {}) {
        if (!isNonEmptyString(eventId)) {
            return false;
        }
        this.appliedEventBindings[eventId] = this.normalizeEventPatch(patch, eventId);
        if (options.clearRuntime !== false) {
            delete this.runtimeOverrides[eventId];
        }
        const persisted = options.persist === false ? true : this.saveProfile();
        this.emitDebugUpdate('event_applied', { eventId, persisted });
        return persisted;
    }

    resetEventToDefault(eventId, options = {}) {
        if (!isNonEmptyString(eventId)) {
            return false;
        }
        delete this.appliedEventBindings[eventId];
        delete this.runtimeOverrides[eventId];
        const persisted = options.persist === false ? true : this.saveProfile();
        this.emitDebugUpdate('event_reset', { eventId, persisted });
        return persisted;
    }

    preloadInitialAssets() {
        const preloadLimit = clamp(
            Number.isFinite(this.manifestMeta.preloadLimit) ? this.manifestMeta.preloadLimit : 24,
            0,
            256
        );
        const ids = [];
        this.eventRegistry.forEach((entry) => {
            const config = this.getResolvedEventConfig(entry.id, null);
            (config.assetPool || []).forEach((assetId) => {
                if (!this.assetById.has(assetId) || ids.includes(assetId)) {
                    return;
                }
                ids.push(assetId);
            });
        });
        this.assetCatalog.forEach((asset) => {
            if (asset.preload && !ids.includes(asset.id)) {
                ids.push(asset.id);
            }
        });
        ids.slice(0, preloadLimit).forEach((assetId) => {
            this.ensureAssetLoaded(assetId);
        });
    }

    refreshManifest() {
        this.loadManifestFromDisk();
        this.preloadInitialAssets();
        this.emitDebugUpdate('manifest_refresh');
    }

    getManifestStats() {
        let loadedCount = 0;
        let loadingCount = 0;
        this.assetCatalog.forEach((asset) => {
            const state = this.getAssetState(asset.id).status;
            if (state === 'loaded') {
                loadedCount += 1;
            } else if (state === 'loading' || state === 'queued') {
                loadingCount += 1;
            }
        });
        return {
            total: this.assetCatalog.length,
            loaded: loadedCount,
            loading: loadingCount,
            preloadLimit: Number.isFinite(this.manifestMeta.preloadLimit) ? this.manifestMeta.preloadLimit : 24
        };
    }

    exportDiff() {
        const appliedDiff = {};
        Object.keys(this.appliedEventBindings).forEach((eventId) => {
            const defaults = getAudioEventDefaults(eventId);
            const applied = this.appliedEventBindings[eventId];
            const diff = {};
            Object.keys(applied).forEach((key) => {
                if (key === 'assetPool') {
                    const next = normalizeAudioAssetList(applied.assetPool);
                    const base = normalizeAudioAssetList(defaults.assetPool);
                    if (JSON.stringify(next) !== JSON.stringify(base)) {
                        diff.assetPool = next;
                    }
                    return;
                }
                if (applied[key] !== defaults[key]) {
                    diff[key] = applied[key];
                }
            });
            if (Object.keys(diff).length > 0) {
                appliedDiff[eventId] = diff;
            }
        });
        const runtimeDiff = {};
        Object.keys(this.runtimeOverrides).forEach((eventId) => {
            runtimeDiff[eventId] = cloneData(this.runtimeOverrides[eventId]);
        });
        return {
            busVolumes: cloneData(this.busVolumes),
            appliedEventBindings: appliedDiff,
            runtimeOverrides: runtimeDiff,
            manifestPath: this.manifestPath
        };
    }

    getDebugSnapshot() {
        const runtime = this.getRuntimeSnapshot();
        return {
            manifest: cloneData(this.manifestMeta),
            manifestStats: this.getManifestStats(),
            busVolumes: cloneData(this.busVolumes),
            events: this.eventRegistry.map((entry) => {
                const eventId = entry.id;
                const metrics = this.getEventMetrics(eventId);
                return {
                    ...entry,
                    defaults: getAudioEventDefaults(eventId),
                    applied: cloneData(this.getAppliedEventConfig(eventId) || {}),
                    runtime: cloneData(this.getRuntimeOverride(eventId) || {}),
                    effective: this.getResolvedEventConfig(eventId, null),
                    metrics: cloneData(metrics)
                };
            }),
            assets: this.assetCatalog.map((asset) => ({
                id: asset.id,
                label: asset.label,
                group: asset.group,
                tags: [...asset.tags],
                preload: !!asset.preload,
                urls: [...asset.urls],
                state: this.getAssetState(asset.id)
            })),
            lastSaveResult: cloneData(this.lastSaveResult),
            recentEvents: cloneData(this.recentEvents.slice(0, 24)),
            recentAudioTrace: cloneData(this.recentAudioTrace.slice(0, 64)),
            runtime: cloneData(runtime)
        };
    }
}

window.CoreAudioManager = CoreAudioManager;
