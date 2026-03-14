function ensureGameUiStyles() {
    if (document.getElementById('game-ui-style')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'game-ui-style';
    style.textContent = `
        #game-menu-overlay {
            position: fixed;
            inset: 0;
            z-index: 20000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background:
                radial-gradient(circle at top, rgba(54, 214, 255, 0.12), transparent 32%),
                linear-gradient(180deg, rgba(2, 7, 11, 0.62), rgba(2, 7, 11, 0.82));
            backdrop-filter: blur(10px);
            transition: opacity 0.18s ease;
        }
        #game-menu-overlay.hidden {
            opacity: 0;
            pointer-events: none;
        }
        .game-menu-panel {
            width: min(420px, calc(100vw - 48px));
            padding: 28px 24px 22px;
            border: 1px solid rgba(79, 169, 198, 0.28);
            border-radius: 18px;
            background: rgba(7, 16, 23, 0.88);
            color: #d7e6eb;
            box-shadow: 0 20px 70px rgba(0, 0, 0, 0.45);
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
        }
        .game-menu-eyebrow {
            margin-bottom: 8px;
            color: #4fa9c6;
            font-size: 12px;
            letter-spacing: 0.28em;
            text-transform: uppercase;
        }
        .game-menu-title {
            margin: 0;
            font-size: 36px;
            line-height: 1.1;
            color: #f4f0d7;
        }
        .game-menu-subtitle {
            margin: 10px 0 0;
            color: rgba(215, 230, 235, 0.72);
            font-size: 14px;
            line-height: 1.5;
        }
        .game-menu-buttons {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 22px;
        }
        .game-menu-buttons.hidden {
            display: none;
        }
        .game-menu-button {
            width: 100%;
            padding: 12px 14px;
            border: 1px solid rgba(54, 214, 255, 0.22);
            border-radius: 10px;
            background: rgba(54, 214, 255, 0.12);
            color: #f4f0d7;
            font-size: 15px;
            cursor: pointer;
            transition: transform 0.12s ease, background 0.12s ease, border-color 0.12s ease;
        }
        .game-menu-button:hover:not(:disabled) {
            transform: translateY(-1px);
            border-color: rgba(54, 214, 255, 0.48);
            background: rgba(54, 214, 255, 0.18);
        }
        .game-menu-button.secondary {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 255, 255, 0.12);
            color: rgba(215, 230, 235, 0.92);
        }
        .game-menu-button:disabled {
            opacity: 0.38;
            cursor: default;
        }
        .game-menu-slot {
            margin-top: 18px;
            padding: 12px 14px;
            border-radius: 10px;
            background: rgba(79, 169, 198, 0.08);
            color: rgba(215, 230, 235, 0.8);
            font-size: 13px;
            line-height: 1.45;
        }
        .game-menu-hint {
            margin-top: 12px;
            color: rgba(215, 230, 235, 0.46);
            font-size: 12px;
            line-height: 1.45;
        }
        #game-toast {
            position: fixed;
            left: 50%;
            bottom: 28px;
            z-index: 20010;
            transform: translate(-50%, 10px);
            min-width: 220px;
            max-width: min(460px, calc(100vw - 32px));
            padding: 12px 16px;
            border-radius: 999px;
            background: rgba(7, 16, 23, 0.92);
            border: 1px solid rgba(79, 169, 198, 0.28);
            color: #d7e6eb;
            text-align: center;
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
            font-size: 13px;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.18s ease, transform 0.18s ease;
        }
        #game-toast.visible {
            opacity: 1;
            transform: translate(-50%, 0);
        }
        #game-toast.error {
            border-color: rgba(255, 93, 73, 0.38);
            color: #ffd4ce;
        }
        #game-fps-overlay {
            position: fixed;
            top: 12px;
            left: 12px;
            z-index: 19990;
            min-width: 108px;
            padding: 8px 10px;
            border-radius: 10px;
            background: rgba(7, 16, 23, 0.88);
            border: 1px solid rgba(79, 169, 198, 0.22);
            color: #d7e6eb;
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
            font-size: 12px;
            line-height: 1.35;
            letter-spacing: 0.03em;
            pointer-events: none;
            white-space: pre-line;
        }
        #game-fps-overlay.hidden {
            display: none;
        }
        @media (max-width: 640px) {
            .game-menu-panel {
                width: calc(100vw - 24px);
                padding: 24px 18px 18px;
            }
            .game-menu-title {
                font-size: 30px;
            }
        }
    `;
    document.head.appendChild(style);
}

const SceneUiMixin = {
    buildUi() {
        const overlay = document.createElement('div');
        overlay.id = 'game-menu-overlay';
        overlay.className = 'hidden';
        overlay.innerHTML = `
            <div class="game-menu-panel">
                <div class="game-menu-eyebrow" id="game-menu-eyebrow">Biological Dynamics</div>
                <h1 class="game-menu-title" id="game-menu-title">主菜单</h1>
                <p class="game-menu-subtitle" id="game-menu-subtitle"></p>
                <div class="game-menu-buttons" id="game-main-menu-buttons">
                    <button class="game-menu-button" id="menu-start-btn">开始</button>
                    <button class="game-menu-button" id="menu-main-continue-btn">继续</button>
                    <button class="game-menu-button secondary" id="menu-exit-btn">退出</button>
                </div>
                <div class="game-menu-buttons hidden" id="game-pause-menu-buttons">
                    <button class="game-menu-button" id="menu-pause-continue-btn">继续</button>
                    <button class="game-menu-button" id="menu-save-btn">保存</button>
                    <button class="game-menu-button" id="menu-load-btn">读档</button>
                    <button class="game-menu-button secondary" id="menu-main-menu-btn">返回主菜单</button>
                </div>
                <div class="game-menu-slot" id="game-menu-slot"></div>
                <div class="game-menu-hint" id="game-menu-hint"></div>
            </div>
        `;

        const toast = document.createElement('div');
        toast.id = 'game-toast';

        const fps = document.createElement('div');
        fps.id = 'game-fps-overlay';
        fps.className = 'hidden';

        document.body.appendChild(overlay);
        document.body.appendChild(toast);
        document.body.appendChild(fps);

        this.ui = {
            overlay,
            toast,
            fps,
            title: overlay.querySelector('#game-menu-title'),
            subtitle: overlay.querySelector('#game-menu-subtitle'),
            slot: overlay.querySelector('#game-menu-slot'),
            hint: overlay.querySelector('#game-menu-hint'),
            mainButtons: overlay.querySelector('#game-main-menu-buttons'),
            pauseButtons: overlay.querySelector('#game-pause-menu-buttons'),
            startButton: overlay.querySelector('#menu-start-btn'),
            mainContinueButton: overlay.querySelector('#menu-main-continue-btn'),
            exitButton: overlay.querySelector('#menu-exit-btn'),
            pauseContinueButton: overlay.querySelector('#menu-pause-continue-btn'),
            saveButton: overlay.querySelector('#menu-save-btn'),
            loadButton: overlay.querySelector('#menu-load-btn'),
            mainMenuButton: overlay.querySelector('#menu-main-menu-btn')
        };

        this.ui.startButton.addEventListener('click', () => {
            this.playAudioEvent?.('ui_click', { control: 'menu-start-btn' });
            this.startNewGame();
        });
        this.ui.mainContinueButton.addEventListener('click', () => {
            this.playAudioEvent?.('ui_click', { control: 'menu-main-continue-btn' });
            this.handleMainContinue();
        });
        this.ui.exitButton.addEventListener('click', () => {
            this.playAudioEvent?.('ui_click', { control: 'menu-exit-btn' });
            this.handleExitGame();
        });
        this.ui.pauseContinueButton.addEventListener('click', () => {
            this.playAudioEvent?.('ui_click', { control: 'menu-pause-continue-btn' });
            this.resumeGame();
        });
        this.ui.saveButton.addEventListener('click', () => {
            this.playAudioEvent?.('ui_click', { control: 'menu-save-btn' });
            this.saveGameToSlot();
        });
        this.ui.loadButton.addEventListener('click', () => {
            this.playAudioEvent?.('ui_click', { control: 'menu-load-btn' });
            this.loadGameFromSlot();
        });
        this.ui.mainMenuButton.addEventListener('click', () => {
            this.playAudioEvent?.('ui_click', { control: 'menu-main-menu-btn' });
            this.showMainMenu();
        });
    },

    refreshMenuState() {
        if (!this.ui) {
            return;
        }

        const saveData = this.getSavedGameData();
        const hasSave = !!saveData;
        const hasSession = !!this.sessionStarted;
        const mainContinueText = hasSession ? '继续' : '继续（读档）';

        this.ui.mainContinueButton.textContent = mainContinueText;
        this.ui.mainContinueButton.disabled = !hasSession && !hasSave;
        this.ui.loadButton.disabled = !hasSave;
        this.ui.saveButton.disabled = !hasSession;

        if (this.menuMode === 'pause') {
            this.ui.overlay.classList.remove('hidden');
            this.ui.mainButtons.classList.add('hidden');
            this.ui.pauseButtons.classList.remove('hidden');
            this.ui.title.textContent = '暂停';
            this.ui.subtitle.textContent = '游戏已暂停。可以继续、保存当前单槽、直接读回单槽，或返回主菜单。';
            this.ui.hint.textContent = 'ESC 继续游戏。读档会直接覆盖当前局内状态。';
        } else if (this.menuMode === 'main') {
            this.ui.overlay.classList.remove('hidden');
            this.ui.mainButtons.classList.remove('hidden');
            this.ui.pauseButtons.classList.add('hidden');
            this.ui.title.textContent = '主菜单';
            this.ui.subtitle.textContent = hasSession
                ? '当前局仍保留在内存里。可以继续当前局，或者重新开始新局。'
                : '开始新局，或读取 JSON 单通道存档继续。';
            this.ui.hint.textContent = '单通道存档写入 save-slot.json；调参配置写入 tuning-profile.json。';
        } else {
            this.ui.overlay.classList.add('hidden');
        }

        if (hasSave) {
            const nodeCount = saveData.summary?.nodeCount ?? saveData.activeNodes.length;
            const linkCount = saveData.summary?.linkCount ?? (saveData.player.topology?.edges?.length || 0);
            this.ui.slot.textContent = `单通道存档：${formatSaveTimestamp(saveData.savedAt)} · 节点 ${nodeCount} · 连线 ${linkCount}`;
        } else {
            this.ui.slot.textContent = '单通道存档：空';
        }
    },

    showToast(message, isError = false) {
        if (!this.ui?.toast) {
            return;
        }

        if (this.toastTimer) {
            window.clearTimeout(this.toastTimer);
        }

        this.ui.toast.textContent = message;
        this.ui.toast.classList.toggle('error', isError);
        this.ui.toast.classList.add('visible');
        this.playAudioEvent?.(isError ? 'ui_toast_error' : 'ui_toast_success', { message, isError });
        this.toastTimer = window.setTimeout(() => {
            this.ui.toast.classList.remove('visible');
        }, 1800);
    },

    showPauseMenu() {
        if (!this.sessionStarted || !this.ui) {
            return;
        }

        this.exitEditMode();
        this.debugMenuAutoPaused = false;
        this.menuMode = 'pause';
        this.paused = true;
        this.playAudioEvent?.('ui_menu_open_pause', { mode: 'pause' });
        this.refreshMenuState();
    },

    showMainMenu() {
        if (!this.ui) {
            return;
        }
        this.exitEditMode();
        this.debugMenuAutoPaused = false;
        this.menuMode = 'main';
        this.paused = true;
        this.playAudioEvent?.('ui_menu_open_main', { mode: 'main' });
        this.refreshMenuState();
    },

    setDebugMenuOpen(isOpen) {
        this.debugMenuOpen = !!isOpen;

        if (!this.sessionStarted || this.menuMode || this.player?.dead) {
            this.debugMenuAutoPaused = false;
            return;
        }

        const shouldPauseOnOpen = window.TUNING?.debugPauseOnTuningOpen ?? true;
        if (this.debugMenuOpen && shouldPauseOnOpen) {
            if (!this.paused) {
                this.debugMenuAutoPaused = true;
                this.paused = true;
            }
            return;
        }

        if (this.debugMenuAutoPaused && !this.menuMode) {
            this.paused = false;
        }
        this.debugMenuAutoPaused = false;
    },

    updateFpsOverlay(deltaMs = 16.67) {
        if (!this.ui?.fps) {
            return;
        }

        const showFpsCounter = !!window.TUNING?.showFpsCounter;
        const showTelemetryOverlay = !!window.TUNING?.showTelemetryOverlay;
        this.ui.fps.classList.toggle('hidden', !showFpsCounter && !showTelemetryOverlay);
        if (!showFpsCounter && !showTelemetryOverlay) {
            return;
        }

        const actualFps = Number.isFinite(this.game?.loop?.actualFps) ? this.game.loop.actualFps : 0;
        const frameMs = Number.isFinite(deltaMs) ? deltaMs : 0;
        const probe = this.performanceProbe || {};
        const lines = [];

        if (showFpsCounter) {
            const peakLabel = probe.lastPeakSection ? `${probe.lastPeakSection} ${getFiniteNumber(probe.lastPeakMs, 0).toFixed(1)} ms` : 'section --';
            const devourLabel = `devour ${Math.max(0, probe.lastDevourBurst || 0)} / batch ${Math.max(0, probe.lastDevourBatch || 0)}`;
            const nodeCount = Math.max(0, this.activeNodes?.length ?? this.player?.chain?.length ?? 0);
            const linkCount = Math.max(0, this.links?.length ?? 0);
            lines.push(`FPS ${actualFps.toFixed(1)}`);
            lines.push(`${frameMs.toFixed(1)} ms`);
            lines.push(peakLabel);
            lines.push(devourLabel);
            lines.push(`mesh n ${nodeCount} | l ${linkCount}`);
        }

        if (showTelemetryOverlay) {
            const telemetry = this.getEcoTelemetrySnapshot?.();
            const current = telemetry?.player?.current || {};
            const chaseStats = telemetry?.prey?.chaseStats || {};
            const topArchetype = Object.entries(chaseStats).sort((a, b) => (b[1]?.started || 0) - (a[1]?.started || 0))[0];
            lines.push(`cluster ${current.bucket || '--'} / ${current.phase || '--'}`);
            lines.push(`spd ${getFiniteNumber(current.centroidSpeed, 0).toFixed(1)} | node ${getFiniteNumber(current.nodeSpeed, 0).toFixed(1)}`);
            lines.push(`span ${getFiniteNumber(current.span, 0).toFixed(0)} | c ${getFiniteNumber(current.compression, 0).toFixed(2)} / e ${getFiniteNumber(current.expansion, 0).toFixed(2)}`);
            if (topArchetype) {
                const [archetype, stats] = topArchetype;
                lines.push(`${archetype} chase ${stats.started || 0}/${stats.devoured || 0}/${stats.escaped || 0}`);
            }
        }

        if (showFpsCounter) {
            const rig = this.cameraRig || {};
            const viewportWidth = getFiniteNumber(rig.viewportWidth, this.scale?.width || 0);
            const viewportHeight = getFiniteNumber(rig.viewportHeight, this.scale?.height || 0);
            const zoom = Math.max(0.0001, getFiniteNumber(rig.zoom, 0));
            const worldViewWidth = viewportWidth / zoom;
            const worldViewHeight = viewportHeight / zoom;
            const manualZoom = getFiniteNumber(rig.manualZoom, zoom);
            const targetZoom = getFiniteNumber(rig.targetZoom, zoom);
            const desiredZoom = getFiniteNumber(rig.desiredZoom, manualZoom);
            const zoomSource = rig.autoZoomEnabled
                ? 'auto-node'
                : Math.abs(manualZoom - zoom) > 0.0005
                    ? 'wheel->manualZoom'
                    : 'steady';

            lines.push(`cam zoom ${zoom.toFixed(3)} | tgt ${targetZoom.toFixed(3)}`);
            lines.push(`cam wheel ${manualZoom.toFixed(3)} | want ${desiredZoom.toFixed(3)}`);
            lines.push(`cam pos ${getFiniteNumber(rig.x, 0).toFixed(1)}, ${getFiniteNumber(rig.y, 0).toFixed(1)}`);
            lines.push(`cam focus ${getFiniteNumber(rig.focusX, rig.x || 0).toFixed(1)}, ${getFiniteNumber(rig.focusY, rig.y || 0).toFixed(1)}`);
            lines.push(`cam view ${worldViewWidth.toFixed(0)} x ${worldViewHeight.toFixed(0)} wu`);
            if (rig.autoZoomEnabled) {
                const autoNodeCount = Math.max(0, Math.round(getFiniteNumber(rig.autoZoomNodeCount, 0)));
                const autoViewW = Math.max(0, Math.round(getFiniteNumber(rig.autoZoomTargetViewWidth, 0)));
                const autoViewH = Math.max(0, Math.round(getFiniteNumber(rig.autoZoomTargetViewHeight, 0)));
                lines.push(`cam auto n ${autoNodeCount} -> ${autoViewW}x${autoViewH}`);
            }
            lines.push(`cam wheel affects ${zoomSource}`);
        }

        this.ui.fps.textContent = lines.join('\n');
    },
};
