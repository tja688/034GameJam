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
        #game-debug-monitor {
            position: fixed;
            left: 18px;
            bottom: 18px;
            z-index: 20020;
            min-width: 280px;
            max-width: min(460px, calc(100vw - 36px));
            max-height: min(42vh, 420px);
            overflow: auto;
            margin: 0;
            padding: 12px 14px;
            border-radius: 12px;
            border: 1px solid rgba(79, 169, 198, 0.28);
            background: rgba(7, 16, 23, 0.9);
            color: #c8dfe6;
            font: 12px/1.45 Consolas, 'Courier New', monospace;
            white-space: pre-wrap;
            backdrop-filter: blur(10px);
            box-shadow: 0 14px 40px rgba(0, 0, 0, 0.35);
            display: none;
        }
        #game-debug-monitor.alert {
            border-color: rgba(255, 93, 73, 0.52);
            color: #ffd4ce;
        }
        @media (max-width: 640px) {
            .game-menu-panel {
                width: calc(100vw - 24px);
                padding: 24px 18px 18px;
            }
            .game-menu-title {
                font-size: 30px;
            }
            #game-debug-monitor {
                left: 12px;
                right: 12px;
                bottom: 12px;
                min-width: 0;
                max-width: none;
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
        const debugMonitor = document.createElement('pre');
        debugMonitor.id = 'game-debug-monitor';

        document.body.appendChild(overlay);
        document.body.appendChild(toast);
        document.body.appendChild(debugMonitor);

        this.ui = {
            overlay,
            toast,
            debugMonitor,
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

        this.ui.startButton.addEventListener('click', () => this.startNewGame());
        this.ui.mainContinueButton.addEventListener('click', () => this.handleMainContinue());
        this.ui.exitButton.addEventListener('click', () => this.handleExitGame());
        this.ui.pauseContinueButton.addEventListener('click', () => this.resumeGame());
        this.ui.saveButton.addEventListener('click', () => this.saveGameToSlot());
        this.ui.loadButton.addEventListener('click', () => this.loadGameFromSlot());
        this.ui.mainMenuButton.addEventListener('click', () => this.showMainMenu());
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
                : '开始新局，或读取本地单通道存档继续。';
            this.ui.hint.textContent = '单通道存档只保存玩家状态、节点与连线等结构数据，不包含调参本地应用配置。';
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
        this.toastTimer = window.setTimeout(() => {
            this.ui.toast.classList.remove('visible');
        }, 1800);
    },

    showPauseMenu() {
        if (!this.sessionStarted) {
            return;
        }

        this.exitEditMode();
        this.menuMode = 'pause';
        this.paused = true;
        this.refreshMenuState();
    },

    showMainMenu() {
        this.exitEditMode();
        this.menuMode = 'main';
        this.paused = true;
        this.refreshMenuState();
    },
    updateDebugMonitor() {
        if (!this.ui?.debugMonitor) {
            return;
        }

        const probe = this.redDebugProbe;
        if (!probe?.active) {
            this.ui.debugMonitor.style.display = 'none';
            this.ui.debugMonitor.classList.remove('alert');
            return;
        }

        const current = probe.current || {};
        const lastExplosion = probe.lastExplosion;
        const lines = [
            'RED DEBUG MONITOR',
            `label: ${probe.label || '-'}`,
            `frames: ${probe.frames || 0}`,
            `redNodes: ${current.redNodeCount ?? 0}  redLinks: ${current.redLinkCount ?? 0}  clusters: ${current.redClusterCount ?? 0}`,
            `speed now/max: ${(current.maxRedSpeed ?? 0).toFixed(2)} / ${(probe.maxRedSpeed ?? 0).toFixed(2)}`,
            `body speed now/max: ${(current.maxClusterSpeed ?? 0).toFixed(2)} / ${(probe.maxClusterSpeed ?? 0).toFixed(2)}`,
            `body spin now/max: ${(current.maxClusterOmega ?? 0).toFixed(3)} / ${(probe.maxClusterOmega ?? 0).toFixed(3)}`,
            `pose offset now/max: ${(current.maxClusterPoseOffset ?? 0).toFixed(2)} / ${(probe.maxClusterPoseOffset ?? 0).toFixed(2)}`,
            `coord now/max: ${(current.maxAbsCoord ?? 0).toFixed(2)} / ${(probe.maxAbsCoord ?? 0).toFixed(2)}`,
            `link err now/max: ${(current.maxRedLinkError ?? 0).toFixed(2)} / ${(probe.maxRedLinkError ?? 0).toFixed(2)}`,
            `err ratio now/max: ${(current.maxRedLinkErrorRatio ?? 0).toFixed(4)} / ${(probe.maxRedLinkErrorRatio ?? 0).toFixed(4)}`,
            `group radius now/max: ${(current.maxRedRadius ?? 0).toFixed(2)} / ${(probe.maxRedRadius ?? 0).toFixed(2)}`,
            `exploded: ${probe.exploded ? 'YES' : 'NO'}`
        ];

        if (lastExplosion) {
            lines.push(`reason: ${lastExplosion.reason}`);
            lines.push(`explode frame: ${lastExplosion.frame}`);
        }

        this.ui.debugMonitor.textContent = lines.join('\n');
        this.ui.debugMonitor.style.display = 'block';
        this.ui.debugMonitor.classList.toggle('alert', !!probe.exploded);
    },
};
