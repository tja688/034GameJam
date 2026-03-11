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
        #game-perf-panel {
            position: fixed;
            left: 22px;
            bottom: 22px;
            z-index: 19050;
            width: min(330px, calc(100vw - 44px));
            padding: 12px 12px 10px;
            border-radius: 16px;
            border: 1px solid rgba(79, 169, 198, 0.28);
            background:
                linear-gradient(180deg, rgba(10, 22, 31, 0.92), rgba(5, 12, 18, 0.94));
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.38);
            backdrop-filter: blur(10px);
            color: #d7e6eb;
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
        }
        #game-perf-panel.hidden {
            display: none;
        }
        .game-perf-head {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 10px;
        }
        .game-perf-title {
            color: #f4f0d7;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.08em;
        }
        .game-perf-window {
            color: rgba(215, 230, 235, 0.56);
            font-size: 11px;
        }
        .game-perf-metrics {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
            margin-bottom: 10px;
        }
        .game-perf-metric {
            padding: 8px 8px 7px;
            border-radius: 10px;
            background: rgba(79, 169, 198, 0.08);
            border: 1px solid rgba(79, 169, 198, 0.12);
        }
        .game-perf-label {
            color: rgba(215, 230, 235, 0.54);
            font-size: 10px;
            line-height: 1;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .game-perf-value {
            margin-top: 5px;
            color: #f4f0d7;
            font-size: 16px;
            line-height: 1.1;
            font-family: 'Consolas', 'Courier New', monospace;
        }
        .game-perf-subvalue {
            margin-top: 3px;
            color: rgba(215, 230, 235, 0.52);
            font-size: 10px;
            line-height: 1.2;
        }
        #game-perf-canvas {
            display: block;
            width: 100%;
            height: 116px;
        }
        .game-perf-legend {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-top: 8px;
            color: rgba(215, 230, 235, 0.58);
            font-size: 11px;
        }
        .game-perf-legend-item {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .game-perf-swatch {
            width: 10px;
            height: 10px;
            border-radius: 999px;
        }
        .game-perf-swatch.fps {
            background: #62e8c9;
        }
        .game-perf-swatch.latency {
            background: #ffb86b;
        }
        @media (max-width: 640px) {
            .game-menu-panel {
                width: calc(100vw - 24px);
                padding: 24px 18px 18px;
            }
            .game-menu-title {
                font-size: 30px;
            }
            #game-perf-panel {
                left: 12px;
                bottom: 12px;
                width: calc(100vw - 24px);
            }
        }
    `;
    document.head.appendChild(style);
}

function getPerformancePanelWindowSeconds() {
    const T = window.TUNING || {};
    return clamp(T.performanceHistorySeconds ?? 8, 2, 20);
}

function formatPerfMetric(value, digits = 0, suffix = '') {
    if (!Number.isFinite(value)) {
        return '--';
    }
    return `${value.toFixed(digits)}${suffix}`;
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

        const perfPanel = document.createElement('div');
        perfPanel.id = 'game-perf-panel';
        perfPanel.className = 'hidden';
        perfPanel.innerHTML = `
            <div class="game-perf-head">
                <div class="game-perf-title">性能调试</div>
                <div class="game-perf-window" id="game-perf-window"></div>
            </div>
            <div class="game-perf-metrics">
                <div class="game-perf-metric">
                    <div class="game-perf-label">FPS</div>
                    <div class="game-perf-value" id="game-perf-fps">--</div>
                    <div class="game-perf-subvalue" id="game-perf-fps-sub">--</div>
                </div>
                <div class="game-perf-metric">
                    <div class="game-perf-label">Frame</div>
                    <div class="game-perf-value" id="game-perf-frame">--</div>
                    <div class="game-perf-subvalue" id="game-perf-frame-sub">--</div>
                </div>
                <div class="game-perf-metric">
                    <div class="game-perf-label">Latency</div>
                    <div class="game-perf-value" id="game-perf-latency">--</div>
                    <div class="game-perf-subvalue" id="game-perf-latency-sub">等待输入</div>
                </div>
            </div>
            <canvas id="game-perf-canvas" width="306" height="116"></canvas>
            <div class="game-perf-legend">
                <span class="game-perf-legend-item"><span class="game-perf-swatch fps"></span>FPS</span>
                <span class="game-perf-legend-item"><span class="game-perf-swatch latency"></span>输入到当前帧延迟</span>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(toast);
        document.body.appendChild(perfPanel);

        this.ui = {
            overlay,
            toast,
            perfPanel,
            title: overlay.querySelector('#game-menu-title'),
            subtitle: overlay.querySelector('#game-menu-subtitle'),
            slot: overlay.querySelector('#game-menu-slot'),
            hint: overlay.querySelector('#game-menu-hint'),
            perfWindow: perfPanel.querySelector('#game-perf-window'),
            perfFps: perfPanel.querySelector('#game-perf-fps'),
            perfFpsSub: perfPanel.querySelector('#game-perf-fps-sub'),
            perfFrame: perfPanel.querySelector('#game-perf-frame'),
            perfFrameSub: perfPanel.querySelector('#game-perf-frame-sub'),
            perfLatency: perfPanel.querySelector('#game-perf-latency'),
            perfLatencySub: perfPanel.querySelector('#game-perf-latency-sub'),
            perfCanvas: perfPanel.querySelector('#game-perf-canvas'),
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
    updatePerformanceDebugPanel() {
        if (!this.ui?.perfPanel) {
            return;
        }

        const T = window.TUNING || {};
        const visible = !!(T.showDebugVisuals && T.showPerformanceDebug);
        this.ui.perfPanel.classList.toggle('hidden', !visible);
        if (!visible || !this.performanceStats) {
            return;
        }

        const windowSeconds = getPerformancePanelWindowSeconds();
        const now = this.performanceStats.lastFrameAt || (typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now());
        const cutoff = now - windowSeconds * 1000;
        const samples = this.performanceStats.samples.filter((sample) => sample.time >= cutoff);
        const latencySamples = this.performanceStats.latencySamples.filter((sample) => sample.time >= cutoff);
        const latestSample = samples[samples.length - 1] || null;
        const latestLatency = latencySamples.length > 0 ? latencySamples[latencySamples.length - 1].latencyMs : null;
        const avgFps = samples.length > 0
            ? samples.reduce((sum, sample) => sum + sample.fps, 0) / samples.length
            : NaN;
        const minFps = samples.length > 0
            ? samples.reduce((min, sample) => Math.min(min, sample.fps), Infinity)
            : NaN;
        const avgFrameMs = samples.length > 0
            ? samples.reduce((sum, sample) => sum + sample.frameMs, 0) / samples.length
            : NaN;
        const maxFrameMs = samples.length > 0
            ? samples.reduce((max, sample) => Math.max(max, sample.frameMs), 0)
            : NaN;
        const avgLatency = latencySamples.length > 0
            ? latencySamples.reduce((sum, sample) => sum + sample.latencyMs, 0) / latencySamples.length
            : NaN;
        const maxLatency = latencySamples.length > 0
            ? latencySamples.reduce((max, sample) => Math.max(max, sample.latencyMs), 0)
            : NaN;

        this.ui.perfWindow.textContent = `最近 ${windowSeconds.toFixed(windowSeconds >= 10 ? 0 : 1)} 秒`;
        this.ui.perfFps.textContent = formatPerfMetric(latestSample?.fps ?? NaN, 1);
        this.ui.perfFpsSub.textContent = Number.isFinite(avgFps) && Number.isFinite(minFps)
            ? `均 ${avgFps.toFixed(1)} / 低 ${minFps.toFixed(1)}`
            : '--';
        this.ui.perfFrame.textContent = formatPerfMetric(latestSample?.frameMs ?? NaN, 1, ' ms');
        this.ui.perfFrameSub.textContent = Number.isFinite(avgFrameMs) && Number.isFinite(maxFrameMs)
            ? `均 ${avgFrameMs.toFixed(1)} / 峰 ${maxFrameMs.toFixed(1)}`
            : '--';
        this.ui.perfLatency.textContent = Number.isFinite(latestLatency)
            ? formatPerfMetric(latestLatency, 1, ' ms')
            : '--';
        this.ui.perfLatencySub.textContent = Number.isFinite(avgLatency) && Number.isFinite(maxLatency)
            ? `均 ${avgLatency.toFixed(1)} / 峰 ${maxLatency.toFixed(1)}`
            : '等待输入';

        const canvas = this.ui.perfCanvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
        const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        ctx.clearRect(0, 0, width, height);

        const padLeft = 10 * dpr;
        const padRight = 10 * dpr;
        const padTop = 8 * dpr;
        const padBottom = 14 * dpr;
        const graphWidth = Math.max(1, width - padLeft - padRight);
        const graphHeight = Math.max(1, height - padTop - padBottom);
        const baselineY = padTop + graphHeight;
        const fpsMax = Math.max(60, Math.ceil((samples.reduce((max, sample) => Math.max(max, sample.fps), 0) || 60) / 30) * 30);
        const latencyMax = Math.max(16, Math.ceil((latencySamples.reduce((max, sample) => Math.max(max, sample.latencyMs), 0) || 16) / 8) * 8);

        ctx.strokeStyle = 'rgba(125, 233, 119, 0.08)';
        ctx.lineWidth = 1 * dpr;
        for (let i = 0; i <= 3; i += 1) {
            const y = padTop + (graphHeight * i) / 3;
            ctx.beginPath();
            ctx.moveTo(padLeft, y);
            ctx.lineTo(width - padRight, y);
            ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(79, 169, 198, 0.18)';
        ctx.beginPath();
        ctx.moveTo(padLeft, baselineY);
        ctx.lineTo(width - padRight, baselineY);
        ctx.stroke();

        if (samples.length > 0) {
            ctx.strokeStyle = '#62e8c9';
            ctx.lineWidth = 2 * dpr;
            ctx.beginPath();
            samples.forEach((sample, index) => {
                const x = padLeft + ((sample.time - cutoff) / (windowSeconds * 1000)) * graphWidth;
                const y = baselineY - clamp(sample.fps / fpsMax, 0, 1) * graphHeight;
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
        }

        if (latencySamples.length > 0) {
            ctx.strokeStyle = '#ffb86b';
            ctx.lineWidth = 1.6 * dpr;
            ctx.beginPath();
            latencySamples.forEach((sample, index) => {
                const x = padLeft + ((sample.time - cutoff) / (windowSeconds * 1000)) * graphWidth;
                const y = baselineY - clamp(sample.latencyMs / latencyMax, 0, 1) * graphHeight;
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(215, 230, 235, 0.46)';
        ctx.font = `${10 * dpr}px Segoe UI`;
        ctx.textBaseline = 'top';
        ctx.fillText(`${fpsMax} FPS`, padLeft, 0);
        ctx.textAlign = 'right';
        ctx.fillText(`${latencyMax} ms`, width - padRight, 0);
        ctx.textAlign = 'left';
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
        if (!this.sessionStarted || !this.ui) {
            return;
        }

        this.exitEditMode();
        this.menuMode = 'pause';
        this.paused = true;
        this.refreshMenuState();
    },

    showMainMenu() {
        if (!this.ui) {
            return;
        }
        this.exitEditMode();
        this.menuMode = 'main';
        this.paused = true;
        this.refreshMenuState();
    },
};
