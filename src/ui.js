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
            display: none !important;
        }
        #game-fps-overlay.hidden {
            display: none;
        }
        #game-startup-overlay {
            position: fixed;
            inset: 0;
            z-index: 21000;
            display: flex;
            align-items: center;
            justify-content: center;
            background:
                radial-gradient(circle at 50% 35%, rgba(92, 208, 255, 0.12), transparent 24%),
                linear-gradient(180deg, rgba(3, 8, 12, 0.16), rgba(3, 8, 12, 0.42));
            transition: opacity 0.28s ease;
            pointer-events: auto;
        }
        #game-startup-overlay.hidden {
            opacity: 0;
            pointer-events: none;
        }
        .game-startup-panel {
            width: min(420px, calc(100vw - 48px));
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .game-startup-progress {
            width: min(280px, 62vw);
        }
        .game-startup-progress.hidden {
            display: none;
        }
        .game-startup-progress-bar {
            overflow: hidden;
            height: 6px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.07);
        }
        .game-startup-progress-fill {
            width: 0%;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, rgba(96, 210, 255, 0.82), rgba(255, 255, 255, 0.96));
            transition: width 0.18s ease;
        }
        .game-startup-play {
            display: flex;
            justify-content: center;
        }
        .game-startup-play.hidden {
            display: none;
        }
        .game-startup-play-button {
            position: relative;
            width: 88px;
            height: 88px;
            border: 0;
            background: transparent;
            cursor: pointer;
            transition: transform 0.16s ease, opacity 0.16s ease;
        }
        .game-startup-play-button:hover {
            transform: scale(1.04);
            opacity: 0.92;
        }
        .game-startup-play-button::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-38%, -50%);
            width: 0;
            height: 0;
            border-top: 24px solid transparent;
            border-bottom: 24px solid transparent;
            border-left: 38px solid rgba(255, 255, 255, 0.96);
            filter: drop-shadow(0 0 16px rgba(255, 255, 255, 0.16));
        }
        @media (max-width: 640px) {
            .game-menu-panel {
                width: calc(100vw - 24px);
                padding: 24px 18px 18px;
            }
            .game-menu-title {
                font-size: 30px;
            }
            .game-startup-panel {
                width: calc(100vw - 24px);
            }
        }
    `;
    document.head.appendChild(style);
}

const SceneUiMixin = {
    isMenuUiEnabled() {
        return window.CORE_DEMO_DEBUG !== false;
    },
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

        const startup = document.createElement('div');
        startup.id = 'game-startup-overlay';
        startup.className = 'hidden';
        startup.innerHTML = `
            <div class="game-startup-panel">
                <div class="game-startup-progress" id="game-startup-progress">
                    <div class="game-startup-progress-bar">
                        <div class="game-startup-progress-fill" id="game-startup-progress-fill"></div>
                    </div>
                </div>
                <div class="game-startup-play hidden" id="game-startup-play">
                    <button class="game-startup-play-button" id="game-startup-play-button" aria-label="开始游戏"></button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(toast);
        document.body.appendChild(fps);
        document.body.appendChild(startup);

        this.ui = {
            overlay,
            toast,
            fps,
            startup,
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
            mainMenuButton: overlay.querySelector('#menu-main-menu-btn'),
            startupProgress: startup.querySelector('#game-startup-progress'),
            startupProgressFill: startup.querySelector('#game-startup-progress-fill'),
            startupPlay: startup.querySelector('#game-startup-play'),
            startupPlayButton: startup.querySelector('#game-startup-play-button')
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
        this.ui.startupPlayButton.addEventListener('click', () => {
            this.playAudioEvent?.('ui_click', { control: 'game-startup-play-button' });
            this.handleStartupAction?.();
        });
    },

    showStartupLoading(progress = 0) {
        if (!this.ui?.startup) {
            return;
        }
        const clampedProgress = clamp(progress, 0, 1);
        this.ui.startup.classList.remove('hidden');
        this.ui.startupProgress.classList.remove('hidden');
        this.ui.startupPlay.classList.add('hidden');
        this.ui.startupProgressFill.style.width = `${(clampedProgress * 100).toFixed(1)}%`;
    },

    showStartupReady() {
        if (!this.ui?.startup) {
            return;
        }
        this.ui.startup.classList.remove('hidden');
        this.ui.startupProgress.classList.add('hidden');
        this.ui.startupPlay.classList.remove('hidden');
    },

    hideStartupOverlay() {
        this.ui?.startup?.classList.add('hidden');
    },

    refreshMenuState() {
        if (!this.ui) {
            return;
        }
        if (!this.isMenuUiEnabled()) {
            this.ui.overlay.classList.add('hidden');
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
        if (!this.isMenuUiEnabled() || !this.sessionStarted || !this.ui) {
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
        if (!this.isMenuUiEnabled() || !this.ui) {
            this.ui?.overlay?.classList.add('hidden');
            return;
        }
        this.exitEditMode();
        this.debugMenuAutoPaused = false;
        this.menuMode = 'main';
        this.paused = true;
        this.playAudioEvent?.('ui_menu_open_main', { mode: 'main' });
        this.syncSceneBgm?.({ source: 'show-main-menu' });
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
        if (this.ui?.fps) {
            this.ui.fps.classList.add('hidden');
            this.ui.fps.textContent = '';
        }
    },
};
