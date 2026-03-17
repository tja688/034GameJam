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
            align-items: flex-start;
            justify-content: center;
            padding-top: min(76vh, calc(50vh + 180px));
            background:
                radial-gradient(circle at 50% 38%, rgba(92, 208, 255, 0.08), transparent 26%),
                linear-gradient(180deg, rgba(3, 8, 12, 0.04), rgba(3, 8, 12, 0.28));
            transition: opacity 0.28s ease;
            pointer-events: none;
        }
        #game-startup-overlay.hidden {
            opacity: 0;
            pointer-events: none;
        }
        .game-startup-panel {
            width: min(420px, calc(100vw - 32px));
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            gap: 12px;
        }
        .game-startup-cta {
            width: min(360px, 72vw);
            height: 18px;
            padding: 0;
            border: 1px solid rgba(132, 214, 243, 0.22);
            border-radius: 5px;
            background: rgba(5, 12, 18, 0.54);
            box-shadow: 0 0 0 1px rgba(8, 20, 28, 0.46);
            overflow: hidden;
            cursor: default;
            pointer-events: auto;
            transition:
                width 0.28s ease,
                height 0.28s ease,
                border-radius 0.28s ease,
                border-color 0.22s ease,
                background 0.22s ease,
                box-shadow 0.22s ease,
                transform 0.16s ease;
        }
        .game-startup-cta:disabled {
            cursor: default;
        }
        .game-startup-cta.ready {
            width: 92px;
            height: 92px;
            border-radius: 24px;
            border-color: rgba(180, 238, 255, 0.36);
            background: rgba(7, 17, 24, 0.82);
            box-shadow:
                0 0 0 1px rgba(180, 238, 255, 0.06),
                0 20px 48px rgba(0, 0, 0, 0.34);
            cursor: pointer;
        }
        .game-startup-cta.ready:hover {
            transform: translateY(-1px) scale(1.02);
        }
        .game-startup-cta-track {
            position: relative;
            display: block;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.06);
            transition:
                clip-path 0.28s ease,
                background 0.28s ease,
                transform 0.28s ease;
        }
        .game-startup-progress-fill {
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, rgba(96, 210, 255, 0.82), rgba(255, 255, 255, 0.96));
            transition: width 0.18s ease, opacity 0.18s ease;
        }
        .game-startup-cta.ready .game-startup-cta-track {
            clip-path: polygon(28% 18%, 80% 50%, 28% 82%);
            background: linear-gradient(135deg, rgba(138, 230, 255, 0.96), rgba(245, 240, 215, 0.96));
            transform: scale(0.82);
        }
        .game-startup-cta.ready .game-startup-progress-fill {
            opacity: 0;
        }
        .game-startup-caption {
            min-height: 18px;
            color: rgba(212, 228, 236, 0.62);
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
            font-size: 12px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            transition: opacity 0.18s ease, color 0.18s ease;
        }
        .game-startup-caption.ready {
            color: rgba(244, 240, 215, 0.82);
        }
        #game-stage-transition {
            position: fixed;
            inset: 0;
            z-index: 20950;
            pointer-events: none;
            opacity: 0;
        }
        #game-stage-transition.active {
            opacity: 1;
        }
        .game-stage-transition-shutter {
            position: absolute;
            left: 0;
            width: 100%;
            height: 50vh;
            background:
                linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent),
                linear-gradient(180deg, rgba(3, 8, 12, 0.96), rgba(3, 8, 12, 0.86));
            border-color: rgba(var(--transition-accent-rgb, 244, 240, 215), 0.26);
            border-style: solid;
        }
        .game-stage-transition-shutter.top {
            top: 0;
            border-width: 0 0 1px 0;
            transform: translateY(-100%);
        }
        .game-stage-transition-shutter.bottom {
            bottom: 0;
            border-width: 1px 0 0 0;
            transform: translateY(100%);
        }
        .game-stage-transition-card {
            position: absolute;
            left: 50%;
            top: 50%;
            min-width: min(460px, calc(100vw - 48px));
            padding: 22px 28px;
            border: 1px solid rgba(var(--transition-accent-rgb, 244, 240, 215), 0.28);
            border-radius: 18px;
            background: rgba(4, 10, 14, 0.76);
            box-shadow: 0 18px 54px rgba(0, 0, 0, 0.34);
            color: #f4f0d7;
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
            text-align: center;
            transform: translate(-50%, -50%) scale(0.94);
            opacity: 0;
        }
        .game-stage-transition-index {
            color: rgba(var(--transition-accent-rgb, 244, 240, 215), 0.88);
            font-size: 13px;
            letter-spacing: 0.32em;
            text-transform: uppercase;
        }
        .game-stage-transition-name {
            margin-top: 10px;
            font-size: clamp(28px, 4vw, 42px);
            letter-spacing: 0.08em;
        }
        #game-stage-transition.animating .game-stage-transition-shutter.top {
            animation: game-stage-shutter-top 1180ms cubic-bezier(0.2, 0.86, 0.24, 1) both;
        }
        #game-stage-transition.animating .game-stage-transition-shutter.bottom {
            animation: game-stage-shutter-bottom 1180ms cubic-bezier(0.2, 0.86, 0.24, 1) both;
        }
        #game-stage-transition.animating .game-stage-transition-card {
            animation: game-stage-card 1180ms cubic-bezier(0.22, 0.86, 0.28, 1) both;
        }
        @keyframes game-stage-shutter-top {
            0% { transform: translateY(-100%); }
            18% { transform: translateY(0); }
            72% { transform: translateY(0); }
            100% { transform: translateY(-100%); }
        }
        @keyframes game-stage-shutter-bottom {
            0% { transform: translateY(100%); }
            18% { transform: translateY(0); }
            72% { transform: translateY(0); }
            100% { transform: translateY(100%); }
        }
        @keyframes game-stage-card {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            72% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(1.04); }
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
            .game-startup-cta {
                width: min(320px, calc(100vw - 48px));
            }
            .game-startup-cta.ready {
                width: 80px;
                height: 80px;
            }
            .game-stage-transition-card {
                min-width: calc(100vw - 32px);
                padding: 18px 20px;
            }
        }
    `;
    document.head.appendChild(style);
}

function formatUiColorRgb(value, fallback = COLORS.core) {
    const color = Number.isFinite(value) ? value : fallback;
    const safeColor = Math.max(0, Math.min(0xffffff, Math.round(color)));
    return [
        (safeColor >> 16) & 0xff,
        (safeColor >> 8) & 0xff,
        safeColor & 0xff
    ].join(', ');
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
                <button class="game-startup-cta" id="game-startup-cta" type="button" aria-label="资源加载中" disabled>
                    <span class="game-startup-cta-track">
                        <span class="game-startup-progress-fill" id="game-startup-progress-fill"></span>
                    </span>
                </button>
                <div class="game-startup-caption" id="game-startup-caption">资源加载中 0%</div>
            </div>
        `;

        const stageTransition = document.createElement('div');
        stageTransition.id = 'game-stage-transition';
        stageTransition.innerHTML = `
            <div class="game-stage-transition-shutter top"></div>
            <div class="game-stage-transition-shutter bottom"></div>
            <div class="game-stage-transition-card">
                <div class="game-stage-transition-index" id="game-stage-transition-index">第一关</div>
                <div class="game-stage-transition-name" id="game-stage-transition-name">FORAGE</div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(toast);
        document.body.appendChild(fps);
        document.body.appendChild(stageTransition);
        document.body.appendChild(startup);

        this.ui = {
            overlay,
            toast,
            fps,
            stageTransition,
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
            stageTransitionIndex: stageTransition.querySelector('#game-stage-transition-index'),
            stageTransitionName: stageTransition.querySelector('#game-stage-transition-name'),
            startupCta: startup.querySelector('#game-startup-cta'),
            startupProgressFill: startup.querySelector('#game-startup-progress-fill'),
            startupCaption: startup.querySelector('#game-startup-caption')
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
        this.ui.startupCta.addEventListener('click', () => {
            this.playAudioEvent?.('ui_click', { control: 'game-startup-cta' });
            this.handleStartupAction?.();
        });
    },

    showStartupLoading(progress = 0) {
        if (!this.ui?.startup) {
            return;
        }
        const clampedProgress = clamp(progress, 0, 1);
        this.ui.startup.classList.remove('hidden');
        this.ui.startupCta.classList.remove('ready');
        this.ui.startupCaption.classList.remove('ready');
        this.ui.startupCta.disabled = true;
        this.ui.startupCta.setAttribute('aria-label', '资源加载中');
        this.ui.startupProgressFill.style.width = `${(clampedProgress * 100).toFixed(1)}%`;
        this.ui.startupCaption.textContent = `资源加载中 ${(clampedProgress * 100).toFixed(0)}%`;
    },

    showStartupReady() {
        if (!this.ui?.startup) {
            return;
        }
        this.ui.startup.classList.remove('hidden');
        this.ui.startupCta.classList.add('ready');
        this.ui.startupCaption.classList.add('ready');
        this.ui.startupCta.disabled = false;
        this.ui.startupCta.setAttribute('aria-label', '开始游戏');
        this.ui.startupProgressFill.style.width = '100%';
        this.ui.startupCaption.textContent = '点击开始';
    },

    hideStartupOverlay() {
        this.ui?.startup?.classList.add('hidden');
        this.ui?.startupCta?.classList.remove('ready');
        this.ui?.startupCaption?.classList.remove('ready');
    },

    hideStageTransition() {
        if (!this.ui?.stageTransition) {
            return;
        }
        this.ui.stageTransition.classList.remove('animating');
        this.ui.stageTransition.classList.remove('active');
    },

    showStageTransition(stageIndex = this.runState?.stageIndex || 0) {
        if (!this.ui?.stageTransition) {
            return;
        }
        const presentation = this.getStagePresentation?.(stageIndex) || {};
        const accentRgb = formatUiColorRgb(presentation.palette?.signal, COLORS.core);
        this.ui.stageTransitionIndex.textContent = presentation.title || `第 ${stageIndex + 1} 关`;
        this.ui.stageTransitionName.textContent = presentation.subtitle || '';
        this.ui.stageTransition.style.setProperty('--transition-accent-rgb', accentRgb);

        if (this.stageTransitionHideTimer) {
            window.clearTimeout(this.stageTransitionHideTimer);
        }

        this.ui.stageTransition.classList.remove('animating');
        this.ui.stageTransition.classList.add('active');
        void this.ui.stageTransition.offsetWidth;
        this.ui.stageTransition.classList.add('animating');
        this.stageTransitionHideTimer = window.setTimeout(() => {
            this.hideStageTransition();
        }, 1220);
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
