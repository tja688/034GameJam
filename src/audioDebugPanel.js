function ensureAudioDebugPanelStyles() {
    if (document.getElementById('audio-debug-style')) {
        return;
    }
    const style = document.createElement('style');
    style.id = 'audio-debug-style';
    style.textContent = `
        #audio-debug-root {
            position: fixed;
            right: 12px;
            top: 12px;
            z-index: 21000;
            width: min(1180px, calc(100vw - 24px));
            pointer-events: none;
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
            color: #d7e6eb;
        }
        #audio-debug-root * {
            box-sizing: border-box;
        }
        #audio-debug-toggle {
            pointer-events: auto;
            margin-left: auto;
            display: block;
            border: 1px solid rgba(54, 214, 255, 0.45);
            background: rgba(7, 16, 23, 0.92);
            color: #7defff;
            border-radius: 999px;
            padding: 8px 14px;
            cursor: pointer;
            font-size: 12px;
            letter-spacing: 0.03em;
        }
        #audio-debug-root.nested-entry #audio-debug-toggle {
            display: none;
        }
        #audio-debug-root.nested-entry {
            right: 432px;
            width: max(320px, min(980px, calc(100vw - 456px)));
        }
        #audio-debug-panel {
            pointer-events: auto;
            margin-top: 8px;
            background: rgba(7, 16, 23, 0.94);
            border: 1px solid rgba(79, 169, 198, 0.28);
            border-radius: 12px;
            box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(8px);
            overflow: hidden;
            display: none;
        }
        #audio-debug-root.open #audio-debug-panel {
            display: block;
        }
        .audio-debug-header {
            display: flex;
            gap: 8px;
            align-items: center;
            padding: 10px 12px;
            border-bottom: 1px solid rgba(79, 169, 198, 0.2);
            background: rgba(79, 169, 198, 0.08);
            font-size: 12px;
        }
        .audio-debug-title {
            font-weight: 700;
            color: #f4f0d7;
            margin-right: auto;
        }
        .audio-debug-pill {
            border: 1px solid rgba(79, 169, 198, 0.36);
            border-radius: 999px;
            padding: 2px 8px;
            font-size: 11px;
            color: #a8cfdb;
            white-space: nowrap;
        }
        .audio-debug-content {
            padding: 10px;
            display: grid;
            grid-template-columns: minmax(240px, 0.8fr) minmax(300px, 1fr) minmax(280px, 1fr);
            gap: 10px;
        }
        .audio-section {
            border: 1px solid rgba(79, 169, 198, 0.2);
            border-radius: 10px;
            padding: 8px;
            background: rgba(2, 10, 16, 0.62);
            min-height: 240px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .audio-section h3 {
            margin: 0;
            font-size: 12px;
            color: #7defff;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }
        .audio-inline {
            display: flex;
            gap: 6px;
        }
        .audio-inline > * {
            flex: 1;
        }
        .audio-debug-content input,
        .audio-debug-content select,
        .audio-debug-content textarea,
        .audio-debug-content button {
            border-radius: 8px;
            border: 1px solid rgba(79, 169, 198, 0.3);
            background: rgba(5, 14, 21, 0.85);
            color: #d7e6eb;
            padding: 6px 8px;
            font-size: 12px;
        }
        .audio-debug-content button {
            cursor: pointer;
            background: rgba(54, 214, 255, 0.16);
            border-color: rgba(54, 214, 255, 0.3);
            color: #f4f0d7;
        }
        .audio-debug-content button.secondary {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.18);
        }
        .audio-debug-content textarea {
            min-height: 56px;
            resize: vertical;
        }
        .audio-list {
            border: 1px solid rgba(79, 169, 198, 0.18);
            border-radius: 8px;
            overflow: auto;
            min-height: 120px;
            max-height: 320px;
        }
        .audio-row {
            padding: 6px 8px;
            border-bottom: 1px solid rgba(79, 169, 198, 0.12);
            display: grid;
            gap: 4px;
        }
        .audio-row:last-child {
            border-bottom: none;
        }
        .audio-row:hover {
            background: rgba(54, 214, 255, 0.08);
        }
        .audio-row.selected {
            background: rgba(54, 214, 255, 0.15);
            outline: 1px solid rgba(54, 214, 255, 0.3);
        }
        .audio-row-title {
            font-size: 12px;
            color: #f4f0d7;
        }
        .audio-row-meta {
            font-size: 11px;
            color: rgba(215, 230, 235, 0.65);
        }
        .audio-actions {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }
        .audio-bus-grid {
            display: grid;
            grid-template-columns: repeat(5, minmax(80px, 1fr));
            gap: 6px;
        }
        .audio-bus-item {
            border: 1px solid rgba(79, 169, 198, 0.2);
            border-radius: 8px;
            padding: 6px;
            background: rgba(3, 12, 19, 0.75);
            display: grid;
            gap: 4px;
            font-size: 11px;
        }
        .audio-bus-item label {
            color: #a8cfdb;
            text-transform: uppercase;
        }
        .audio-status {
            border-top: 1px solid rgba(79, 169, 198, 0.2);
            padding: 8px 12px;
            font-size: 11px;
            color: rgba(215, 230, 235, 0.7);
            display: flex;
            gap: 8px;
            align-items: center;
        }
        #audio-event-effective {
            margin: 0;
            font-size: 11px;
            white-space: pre-wrap;
            word-break: break-word;
            color: rgba(215, 230, 235, 0.76);
            border: 1px solid rgba(79, 169, 198, 0.16);
            border-radius: 8px;
            padding: 8px;
            background: rgba(2, 9, 14, 0.72);
        }
        @media (max-width: 1080px) {
            .audio-debug-content {
                grid-template-columns: 1fr;
            }
            .audio-bus-grid {
                grid-template-columns: repeat(2, minmax(80px, 1fr));
            }
        }
    `;
    document.head.appendChild(style);
}

class CoreAudioDebugPanel {
    constructor(scene, audioManager, options = {}) {
        this.scene = scene;
        this.audio = audioManager;
        this.showToggle = options.showToggle !== false;
        this.snapshot = null;
        this.selectedEventId = AUDIO_EVENT_REGISTRY[0]?.id || '';
        this.eventSearch = '';
        this.eventGroup = 'all';
        this.assetSearch = '';
        this.assetGroup = 'all';
        this.assetAB = { a: '', b: '' };
        this.eventDrafts = {};
        this.renderQueued = false;

        ensureAudioDebugPanelStyles();
        this.buildDom();
        this.unsubscribe = this.audio.onDebugUpdate(() => this.queueRender());
        this.bindDomEvents();
        this.render();
        this.emitPanelState();
    }

    buildDom() {
        const root = document.createElement('div');
        root.id = 'audio-debug-root';
        root.innerHTML = `
            <button id="audio-debug-toggle" type="button">Audio Debug</button>
            <div id="audio-debug-panel">
                <div class="audio-debug-header">
                    <div class="audio-debug-title">Audio Manager</div>
                    <div class="audio-debug-pill" id="audio-manifest-pill">manifest: 0</div>
                    <button type="button" id="audio-refresh-manifest" class="secondary">Reload Manifest</button>
                    <button type="button" id="audio-save-all">Save Profile</button>
                </div>
                <div class="audio-debug-content">
                    <section class="audio-section">
                        <h3>Events</h3>
                        <div class="audio-inline">
                            <input id="audio-event-search" type="text" placeholder="search event id / module">
                            <select id="audio-event-group"></select>
                        </div>
                        <div id="audio-event-list" class="audio-list"></div>
                    </section>
                    <section class="audio-section">
                        <h3>Event Config</h3>
                        <div id="audio-event-title" class="audio-row-title"></div>
                        <div id="audio-event-meta" class="audio-row-meta"></div>
                        <div class="audio-inline">
                            <label><input id="audio-event-enabled" type="checkbox"> enabled</label>
                            <label><input id="audio-event-loop" type="checkbox"> loop</label>
                            <select id="audio-event-bus"></select>
                        </div>
                        <div class="audio-inline">
                            <input id="audio-event-volume" type="number" min="0" max="2" step="0.01" placeholder="volume">
                            <input id="audio-event-rate" type="number" min="0.2" max="3" step="0.01" placeholder="rate">
                            <input id="audio-event-detune" type="number" min="-2400" max="2400" step="1" placeholder="detune">
                        </div>
                        <div class="audio-inline">
                            <input id="audio-event-cooldown" type="number" min="0" max="8" step="0.01" placeholder="cooldown">
                            <input id="audio-event-maxvoices" type="number" min="1" max="24" step="1" placeholder="voices">
                            <select id="audio-event-strategy">
                                <option value="random">random</option>
                                <option value="round_robin">round_robin</option>
                                <option value="first">first</option>
                            </select>
                        </div>
                        <textarea id="audio-event-assets" placeholder="asset pool: comma/newline separated ids"></textarea>
                        <div class="audio-actions">
                            <button type="button" id="audio-preview-event">Preview Event</button>
                            <button type="button" id="audio-stop-event" class="secondary">Stop Event</button>
                            <button type="button" id="audio-apply-runtime" class="secondary">Apply Runtime</button>
                            <button type="button" id="audio-clear-runtime" class="secondary">Clear Runtime</button>
                            <button type="button" id="audio-apply-save">Apply + Save</button>
                            <button type="button" id="audio-reset-default" class="secondary">Reset Default</button>
                        </div>
                        <pre id="audio-event-effective"></pre>
                    </section>
                    <section class="audio-section">
                        <h3>Library</h3>
                        <div class="audio-inline">
                            <input id="audio-asset-search" type="text" placeholder="search asset id / tags">
                            <select id="audio-asset-group"></select>
                        </div>
                        <div class="audio-inline">
                            <input id="audio-ab-a" type="text" placeholder="A candidate" readonly>
                            <button type="button" id="audio-play-a" class="secondary">Play A</button>
                        </div>
                        <div class="audio-inline">
                            <input id="audio-ab-b" type="text" placeholder="B candidate" readonly>
                            <button type="button" id="audio-play-b" class="secondary">Play B</button>
                        </div>
                        <div id="audio-asset-list" class="audio-list"></div>
                    </section>
                </div>
                <div class="audio-section" style="margin: 0 10px 10px; min-height: 0;">
                    <h3>Bus</h3>
                    <div id="audio-bus-grid" class="audio-bus-grid"></div>
                </div>
                <div class="audio-status">
                    <span id="audio-status-manifest"></span>
                    <span id="audio-status-save"></span>
                </div>
            </div>
        `;
        document.body.appendChild(root);
        this.dom = {
            root,
            toggle: root.querySelector('#audio-debug-toggle'),
            panel: root.querySelector('#audio-debug-panel'),
            refreshManifest: root.querySelector('#audio-refresh-manifest'),
            saveAll: root.querySelector('#audio-save-all'),
            manifestPill: root.querySelector('#audio-manifest-pill'),
            eventSearch: root.querySelector('#audio-event-search'),
            eventGroup: root.querySelector('#audio-event-group'),
            eventList: root.querySelector('#audio-event-list'),
            eventTitle: root.querySelector('#audio-event-title'),
            eventMeta: root.querySelector('#audio-event-meta'),
            eventEnabled: root.querySelector('#audio-event-enabled'),
            eventLoop: root.querySelector('#audio-event-loop'),
            eventBus: root.querySelector('#audio-event-bus'),
            eventVolume: root.querySelector('#audio-event-volume'),
            eventRate: root.querySelector('#audio-event-rate'),
            eventDetune: root.querySelector('#audio-event-detune'),
            eventCooldown: root.querySelector('#audio-event-cooldown'),
            eventMaxVoices: root.querySelector('#audio-event-maxvoices'),
            eventStrategy: root.querySelector('#audio-event-strategy'),
            eventAssets: root.querySelector('#audio-event-assets'),
            previewEvent: root.querySelector('#audio-preview-event'),
            stopEvent: root.querySelector('#audio-stop-event'),
            applyRuntime: root.querySelector('#audio-apply-runtime'),
            clearRuntime: root.querySelector('#audio-clear-runtime'),
            applySave: root.querySelector('#audio-apply-save'),
            resetDefault: root.querySelector('#audio-reset-default'),
            effective: root.querySelector('#audio-event-effective'),
            assetSearch: root.querySelector('#audio-asset-search'),
            assetGroup: root.querySelector('#audio-asset-group'),
            assetList: root.querySelector('#audio-asset-list'),
            abA: root.querySelector('#audio-ab-a'),
            abB: root.querySelector('#audio-ab-b'),
            playA: root.querySelector('#audio-play-a'),
            playB: root.querySelector('#audio-play-b'),
            busGrid: root.querySelector('#audio-bus-grid'),
            statusManifest: root.querySelector('#audio-status-manifest'),
            statusSave: root.querySelector('#audio-status-save')
        };
        if (!this.showToggle) {
            root.classList.add('nested-entry');
        }
        this.initEventBusOptions();
    }

    initEventBusOptions() {
        if (this.dom.eventBus.dataset.initialized) {
            return;
        }
        this.dom.eventBus.innerHTML = '';
        AUDIO_BUS_ORDER.filter((bus) => bus !== 'master').forEach((bus) => {
            const option = document.createElement('option');
            option.value = bus;
            option.textContent = bus;
            this.dom.eventBus.appendChild(option);
        });
        this.dom.eventBus.dataset.initialized = '1';
    }

    bindDomEvents() {
        this.dom.toggle.addEventListener('click', () => this.togglePanel());
        window.addEventListener('keydown', (event) => {
            if (event.code === 'F8') {
                event.preventDefault();
                this.togglePanel();
            }
        });

        this.dom.refreshManifest.addEventListener('click', () => this.audio.refreshManifest());
        this.dom.saveAll.addEventListener('click', () => this.audio.saveProfile());

        this.dom.eventSearch.addEventListener('input', () => {
            this.eventSearch = this.dom.eventSearch.value || '';
            this.renderEventList();
        });
        this.dom.eventGroup.addEventListener('change', () => {
            this.eventGroup = this.dom.eventGroup.value || 'all';
            this.renderEventList();
        });

        this.dom.assetSearch.addEventListener('input', () => {
            this.assetSearch = this.dom.assetSearch.value || '';
            this.renderAssetList();
        });
        this.dom.assetGroup.addEventListener('change', () => {
            this.assetGroup = this.dom.assetGroup.value || 'all';
            this.renderAssetList();
        });

        this.dom.previewEvent.addEventListener('click', () => this.previewCurrentEvent());
        this.dom.stopEvent.addEventListener('click', () => this.audio.stopEvent(this.selectedEventId, { fadeOutMs: 80 }));
        this.dom.applyRuntime.addEventListener('click', () => this.applyCurrentDraftAsRuntime());
        this.dom.clearRuntime.addEventListener('click', () => this.clearCurrentRuntimeOverride());
        this.dom.applySave.addEventListener('click', () => this.applyCurrentDraftAndSave());
        this.dom.resetDefault.addEventListener('click', () => this.resetCurrentToDefault());
        this.dom.playA.addEventListener('click', () => this.previewAssetById(this.assetAB.a));
        this.dom.playB.addEventListener('click', () => this.previewAssetById(this.assetAB.b));

        this.dom.assetList.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) {
                return;
            }
            const assetId = button.dataset.assetId || '';
            const action = button.dataset.action || '';
            if (!assetId || !action) {
                return;
            }
            if (action === 'preview') {
                this.previewAssetById(assetId);
                return;
            }
            if (action === 'bind') {
                const draft = this.getCurrentDraft();
                if (!draft.assetPool.includes(assetId)) {
                    draft.assetPool.push(assetId);
                }
                this.syncFormFromDraft();
                this.renderEffective();
                return;
            }
            if (action === 'setA') {
                this.assetAB.a = assetId;
                this.dom.abA.value = assetId;
                return;
            }
            if (action === 'setB') {
                this.assetAB.b = assetId;
                this.dom.abB.value = assetId;
            }
        });

        this.dom.eventList.addEventListener('click', (event) => {
            const row = event.target.closest('[data-event-id]');
            if (!row) {
                return;
            }
            const eventId = row.dataset.eventId || '';
            if (!eventId || eventId === this.selectedEventId) {
                return;
            }
            this.selectedEventId = eventId;
            this.syncFormFromDraft();
            this.renderEventList();
            this.renderEventDetail();
        });

        const onDraftChanged = () => {
            this.readDraftFromForm();
            this.renderEffective();
        };
        [
            this.dom.eventEnabled,
            this.dom.eventLoop,
            this.dom.eventBus,
            this.dom.eventVolume,
            this.dom.eventRate,
            this.dom.eventDetune,
            this.dom.eventCooldown,
            this.dom.eventMaxVoices,
            this.dom.eventStrategy,
            this.dom.eventAssets
        ].forEach((control) => {
            control.addEventListener('input', onDraftChanged);
            control.addEventListener('change', onDraftChanged);
        });
    }

    queueRender() {
        if (this.renderQueued) {
            return;
        }
        this.renderQueued = true;
        window.setTimeout(() => {
            this.renderQueued = false;
            this.render();
        }, 80);
    }

    isOpen() {
        return this.dom.root.classList.contains('open');
    }

    emitPanelState() {
        window.dispatchEvent(new CustomEvent('audio:panel-state', {
            detail: { open: this.isOpen() }
        }));
    }

    setOpen(open) {
        this.dom.root.classList.toggle('open', !!open);
        this.emitPanelState();
    }

    togglePanel(forceOpen = null) {
        if (typeof forceOpen === 'boolean') {
            this.setOpen(forceOpen);
            return this.isOpen();
        }
        this.setOpen(!this.isOpen());
        return this.isOpen();
    }

    getSnapshot() {
        this.snapshot = this.audio.getDebugSnapshot();
        return this.snapshot;
    }

    getCurrentDraft() {
        if (!this.eventDrafts[this.selectedEventId]) {
            const effective = this.snapshot?.events?.find((entry) => entry.id === this.selectedEventId)?.effective
                || this.audio.getResolvedEventConfig(this.selectedEventId);
            this.eventDrafts[this.selectedEventId] = cloneData(effective);
        }
        return this.eventDrafts[this.selectedEventId];
    }

    readDraftFromForm() {
        const draft = this.getCurrentDraft();
        draft.enabled = !!this.dom.eventEnabled.checked;
        draft.loop = !!this.dom.eventLoop.checked;
        draft.bus = this.dom.eventBus.value || 'sfx';
        draft.volume = clamp(Number(this.dom.eventVolume.value) || 0, 0, 2);
        draft.rate = clamp(Number(this.dom.eventRate.value) || 1, 0.2, 3);
        draft.detune = clamp(Number(this.dom.eventDetune.value) || 0, -2400, 2400);
        draft.cooldown = clamp(Number(this.dom.eventCooldown.value) || 0, 0, 8);
        draft.maxVoices = clamp(Math.round(Number(this.dom.eventMaxVoices.value) || 1), 1, 24);
        draft.strategy = this.dom.eventStrategy.value || 'random';
        draft.assetPool = normalizeAudioAssetList((this.dom.eventAssets.value || '').split(/[\n,]/g));
    }

    syncFormFromDraft() {
        const draft = this.getCurrentDraft();
        this.dom.eventEnabled.checked = !!draft.enabled;
        this.dom.eventLoop.checked = !!draft.loop;
        this.dom.eventBus.value = draft.bus || 'sfx';
        this.dom.eventVolume.value = Number.isFinite(draft.volume) ? String(draft.volume) : '0.9';
        this.dom.eventRate.value = Number.isFinite(draft.rate) ? String(draft.rate) : '1';
        this.dom.eventDetune.value = Number.isFinite(draft.detune) ? String(draft.detune) : '0';
        this.dom.eventCooldown.value = Number.isFinite(draft.cooldown) ? String(draft.cooldown) : '0';
        this.dom.eventMaxVoices.value = Number.isFinite(draft.maxVoices) ? String(draft.maxVoices) : '4';
        this.dom.eventStrategy.value = draft.strategy || 'random';
        this.dom.eventAssets.value = (draft.assetPool || []).join(', ');
    }

    previewCurrentEvent() {
        if (!this.selectedEventId) {
            return;
        }
        const draft = cloneData(this.getCurrentDraft());
        this.audio.playEvent(this.selectedEventId, {
            forceReplay: true,
            preview: true,
            overridePatch: draft,
            meta: { fromPanel: true }
        });
    }

    previewAssetById(assetId) {
        if (!isNonEmptyString(assetId)) {
            return;
        }
        const draft = this.getCurrentDraft();
        this.audio.playAssetPreview(assetId, {
            eventId: this.selectedEventId,
            bus: draft.bus,
            volume: draft.volume,
            rate: draft.rate,
            detune: draft.detune
        });
    }

    applyCurrentDraftAsRuntime() {
        const draft = cloneData(this.getCurrentDraft());
        this.audio.setRuntimeOverride(this.selectedEventId, draft, { persist: false });
    }

    clearCurrentRuntimeOverride() {
        this.audio.clearRuntimeOverride(this.selectedEventId, { persist: false });
        delete this.eventDrafts[this.selectedEventId];
        this.syncFormFromDraft();
        this.renderEffective();
    }

    applyCurrentDraftAndSave() {
        const draft = cloneData(this.getCurrentDraft());
        this.audio.applyEventConfig(this.selectedEventId, draft, { persist: true, clearRuntime: true });
        delete this.eventDrafts[this.selectedEventId];
        this.syncFormFromDraft();
        this.renderEffective();
    }

    resetCurrentToDefault() {
        this.audio.resetEventToDefault(this.selectedEventId, { persist: true });
        delete this.eventDrafts[this.selectedEventId];
        this.syncFormFromDraft();
        this.renderEffective();
    }

    renderGroups(select, groups, selectedValue) {
        const values = ['all', ...groups];
        const existing = new Set(Array.from(select.options).map((option) => option.value));
        if (values.length !== existing.size || values.some((value) => !existing.has(value))) {
            select.innerHTML = '';
            values.forEach((value) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value === 'all' ? 'all groups' : value;
                select.appendChild(option);
            });
        }
        select.value = values.includes(selectedValue) ? selectedValue : 'all';
    }

    formatAge(ms) {
        if (!Number.isFinite(ms) || ms <= 0) {
            return 'n/a';
        }
        const seconds = ms / 1000;
        if (seconds < 1) {
            return `${seconds.toFixed(2)}s`;
        }
        if (seconds < 10) {
            return `${seconds.toFixed(1)}s`;
        }
        return `${Math.round(seconds)}s`;
    }

    renderEventList() {
        const events = Array.isArray(this.snapshot?.events) ? this.snapshot.events : [];
        const keyword = (this.eventSearch || '').trim().toLowerCase();
        const matches = events.filter((entry) => {
            if (this.eventGroup !== 'all' && entry.group !== this.eventGroup) {
                return false;
            }
            if (!keyword) {
                return true;
            }
            return (
                entry.id.toLowerCase().includes(keyword)
                || (entry.module || '').toLowerCase().includes(keyword)
                || (entry.label || '').toLowerCase().includes(keyword)
                || (entry.anchor || '').toLowerCase().includes(keyword)
            );
        });
        if (!matches.some((entry) => entry.id === this.selectedEventId)) {
            this.selectedEventId = matches[0]?.id || events[0]?.id || '';
            if (this.selectedEventId) {
                this.syncFormFromDraft();
            }
        }

        const fragment = document.createDocumentFragment();
        const now = this.audio.getNowMs();
        matches.forEach((entry) => {
            const row = document.createElement('div');
            row.className = `audio-row${entry.id === this.selectedEventId ? ' selected' : ''}`;
            row.dataset.eventId = entry.id;
            const ageMs = now - (entry.metrics?.lastTriggeredAt || 0);
            const triggerText = entry.metrics?.lastTriggeredAt ? this.formatAge(ageMs) : 'n/a';
            row.innerHTML = `
                <div class="audio-row-title">${entry.id}</div>
                <div class="audio-row-meta">${entry.group} | ${entry.module || 'unknown'} | played ${entry.metrics?.playCount || 0} / skipped ${entry.metrics?.skipCount || 0}</div>
                <div class="audio-row-meta">last ${entry.metrics?.lastStatus || 'idle'} | ${triggerText} ago</div>
            `;
            fragment.appendChild(row);
        });
        this.dom.eventList.innerHTML = '';
        this.dom.eventList.appendChild(fragment);
    }

    renderEventDetail() {
        const selected = this.snapshot?.events?.find((entry) => entry.id === this.selectedEventId) || null;
        if (!selected) {
            this.dom.eventTitle.textContent = 'No event selected';
            this.dom.eventMeta.textContent = '';
            this.dom.effective.textContent = '';
            return;
        }
        this.dom.eventTitle.textContent = `${selected.label || selected.id} (${selected.id})`;
        this.dom.eventMeta.textContent = `${selected.group} | ${selected.module || 'unknown'} | anchor: ${selected.anchor || '-'}`;
        this.syncFormFromDraft();
        this.renderEffective();
    }

    renderEffective() {
        const eventId = this.selectedEventId;
        const selected = this.snapshot?.events?.find((entry) => entry.id === eventId) || null;
        if (!selected) {
            this.dom.effective.textContent = '';
            return;
        }
        const draft = this.getCurrentDraft();
        const preview = this.audio.getResolvedEventConfig(eventId, draft);
        const lines = [
            `bus=${preview.bus} volume=${preview.volume.toFixed(3)} rate=${preview.rate.toFixed(3)} detune=${preview.detune}`,
            `loop=${preview.loop} cooldown=${preview.cooldown.toFixed(3)} maxVoices=${preview.maxVoices} strategy=${preview.strategy}`,
            `assets=${(preview.assetPool || []).join(', ') || '(none)'}`,
            `appliedOverride=${selected.applied && Object.keys(selected.applied).length > 0} runtimeOverride=${selected.runtime && Object.keys(selected.runtime).length > 0}`
        ];
        this.dom.effective.textContent = lines.join('\n');
    }

    renderAssetList() {
        const assets = Array.isArray(this.snapshot?.assets) ? this.snapshot.assets : [];
        const keyword = (this.assetSearch || '').trim().toLowerCase();
        const matches = assets.filter((asset) => {
            if (this.assetGroup !== 'all' && asset.group !== this.assetGroup) {
                return false;
            }
            if (!keyword) {
                return true;
            }
            return (
                asset.id.toLowerCase().includes(keyword)
                || (asset.group || '').toLowerCase().includes(keyword)
                || (asset.tags || []).some((tag) => tag.includes(keyword))
            );
        }).slice(0, 160);

        const fragment = document.createDocumentFragment();
        matches.forEach((asset) => {
            const row = document.createElement('div');
            row.className = 'audio-row';
            row.innerHTML = `
                <div class="audio-row-title">${asset.id}</div>
                <div class="audio-row-meta">${asset.group} | ${(asset.tags || []).join(', ') || 'no-tags'} | ${asset.state?.status || 'unknown'}</div>
                <div class="audio-actions">
                    <button type="button" data-action="preview" data-asset-id="${asset.id}">preview</button>
                    <button type="button" class="secondary" data-action="bind" data-asset-id="${asset.id}">bind</button>
                    <button type="button" class="secondary" data-action="setA" data-asset-id="${asset.id}">A</button>
                    <button type="button" class="secondary" data-action="setB" data-asset-id="${asset.id}">B</button>
                </div>
            `;
            fragment.appendChild(row);
        });
        this.dom.assetList.innerHTML = '';
        this.dom.assetList.appendChild(fragment);
    }

    renderBusGrid() {
        const buses = AUDIO_BUS_ORDER;
        if (!this.dom.busGrid.dataset.initialized) {
            this.dom.busGrid.innerHTML = '';
            buses.forEach((bus) => {
                const item = document.createElement('div');
                item.className = 'audio-bus-item';
                item.innerHTML = `
                    <label>${bus}</label>
                    <input type="range" min="0" max="2" step="0.01" data-bus-range="${bus}">
                    <input type="number" min="0" max="2" step="0.01" data-bus-number="${bus}">
                `;
                this.dom.busGrid.appendChild(item);
            });
            this.dom.busGrid.addEventListener('input', (event) => {
                const range = event.target.closest('[data-bus-range]');
                const number = event.target.closest('[data-bus-number]');
                const bus = range?.dataset.busRange || number?.dataset.busNumber || '';
                if (!bus) {
                    return;
                }
                const value = clamp(Number(event.target.value) || 0, 0, 2);
                const rangeControl = this.dom.busGrid.querySelector(`[data-bus-range="${bus}"]`);
                const numberControl = this.dom.busGrid.querySelector(`[data-bus-number="${bus}"]`);
                if (rangeControl && rangeControl !== event.target) {
                    rangeControl.value = String(value);
                }
                if (numberControl && numberControl !== event.target) {
                    numberControl.value = String(value);
                }
                this.audio.setBusVolume(bus, value, { persist: false });
            });
            this.dom.busGrid.dataset.initialized = '1';
        }
        buses.forEach((bus) => {
            const value = this.snapshot?.busVolumes?.[bus] ?? AUDIO_DEFAULT_BUS_VOLUMES[bus] ?? 1;
            const rangeControl = this.dom.busGrid.querySelector(`[data-bus-range="${bus}"]`);
            const numberControl = this.dom.busGrid.querySelector(`[data-bus-number="${bus}"]`);
            if (rangeControl && document.activeElement !== rangeControl) {
                rangeControl.value = String(value);
            }
            if (numberControl && document.activeElement !== numberControl) {
                numberControl.value = String(value);
            }
        });
    }

    renderStatus() {
        const stats = this.snapshot?.manifestStats || { total: 0, loaded: 0, loading: 0 };
        this.dom.manifestPill.textContent = `manifest ${stats.loaded}/${stats.total} (loading ${stats.loading})`;
        this.dom.statusManifest.textContent = `assets: ${stats.total} | loaded: ${stats.loaded} | queue: ${stats.loading} | preloadLimit: ${stats.preloadLimit}`;
        const save = this.snapshot?.lastSaveResult || { ok: true, message: '' };
        this.dom.statusSave.textContent = `last save: ${save.ok ? 'ok' : 'failed'} ${save.message || ''}`;
    }

    render() {
        this.getSnapshot();
        const eventGroups = [...new Set((this.snapshot?.events || []).map((entry) => entry.group || 'misc'))];
        const assetGroups = [...new Set((this.snapshot?.assets || []).map((entry) => entry.group || 'misc'))];
        this.renderGroups(this.dom.eventGroup, eventGroups, this.eventGroup);
        this.renderGroups(this.dom.assetGroup, assetGroups, this.assetGroup);
        this.renderEventList();
        this.renderEventDetail();
        this.renderAssetList();
        this.renderBusGrid();
        this.renderStatus();
        this.dom.abA.value = this.assetAB.a;
        this.dom.abB.value = this.assetAB.b;
        this.initEventBusOptions();
        this.dom.eventBus.value = this.getCurrentDraft().bus || 'sfx';
    }

    destroy() {
        this.unsubscribe?.();
        this.setOpen(false);
        if (this.dom?.root?.parentNode) {
            this.dom.root.parentNode.removeChild(this.dom.root);
        }
    }
}

window.CoreAudioDebugPanel = CoreAudioDebugPanel;

