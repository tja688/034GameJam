const COLORS = {
    background: 0x071017,
    arena: 0x0d1e28,
    grid: 0x183242,
    pulse: 0xf4f0d7,
    base: 0x36d6ff,
    inverse: 0xff5d49,
    shield: 0xfff4bf,
    health: 0xff5663,
    swarm: 0x98ff4d,
    stinger: 0xffd147,
    brute: 0xffffff,
    shadow: 0x02070b,
    link: 0x4fa9c6
};

const MASS_BY_COUNT = { 3: 1.0, 4: 1.18, 5: 1.42, 6: 1.72 };
const CHAIN_SPAN_BY_COUNT = { 3: 150, 4: 200, 5: 250, 6: 310 };
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const PARTIAL_MESH_RULES = {
    slotSpacing: 102,
    supportRadius: 208,
    autoMaxDegree: 4,
    manualMaxDegree: 6,
    forwardStep: 72,
    deleteHoldDuration: 0.72
};
const NODE_LIBRARY = [
    { id: 'source', shape: 'circle', polarity: 'base', role: 'source', color: COLORS.base },
    { id: 'compressor', shape: 'circle', polarity: 'inverse', role: 'compressor', color: COLORS.inverse },
    { id: 'shell-a', shape: 'square', polarity: 'base', role: 'shell', color: COLORS.base },
    { id: 'shell-b', shape: 'square', polarity: 'base', role: 'shell', color: COLORS.base },
    { id: 'prism', shape: 'square', polarity: 'inverse', role: 'prism', color: COLORS.inverse },
    { id: 'dart-a', shape: 'triangle', polarity: 'base', role: 'dart', color: COLORS.base },
    { id: 'dart-b', shape: 'triangle', polarity: 'base', role: 'dart', color: COLORS.base },
    { id: 'blade', shape: 'triangle', polarity: 'inverse', role: 'blade', color: COLORS.inverse }
];

const ENEMY_DEFS = {
    swarm: { color: COLORS.swarm, radius: 18, maxHealth: 12, speed: 86, accel: 170, mass: 0.9, touchDamage: 8, push: 70, shape: 'circle' },
    stinger: { color: COLORS.stinger, radius: 16, maxHealth: 8, speed: 118, accel: 190, mass: 0.75, touchDamage: 12, push: 88, shape: 'triangle' },
    brute: { color: COLORS.brute, radius: 28, maxHealth: 40, speed: 52, accel: 96, mass: 2.4, touchDamage: 18, push: 124, shape: 'square' }
};
const DEFAULT_BASE_CHAIN = [0, 2, 5, 4, 1, 7];
const STORAGE_KEYS = {
    saveSlot: 'bio-core-save-slot-1'
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function damp(current, target, rate, dt) {
    return Phaser.Math.Linear(current, target, 1 - Math.exp(-rate * dt));
}

function normalize(x, y, fallbackX = 0, fallbackY = 0) {
    const length = Math.hypot(x, y);
    if (length < 0.0001) {
        return { x: fallbackX, y: fallbackY, length: 0 };
    }
    return { x: x / length, y: y / length, length };
}

function vectorFromAngle(angle) {
    return { x: Math.cos(angle), y: Math.sin(angle) };
}

function rotateLocal(x, y, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: x * cos - y * sin, y: x * sin + y * cos };
}

function makeEdgeKey(a, b) {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
}

let TOPOLOGY_EDGE_UID = 1;
function createTopologyEdgeId() {
    const id = TOPOLOGY_EDGE_UID;
    TOPOLOGY_EDGE_UID += 1;
    return `edge-${id}`;
}

function angleDistance(a, b) {
    return Math.abs(Phaser.Math.Angle.Wrap(a - b));
}

function distanceToSegmentSquared(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const lengthSq = abx * abx + aby * aby;
    if (lengthSq <= 0.0001) {
        const dx = px - ax;
        const dy = py - ay;
        return dx * dx + dy * dy;
    }

    const t = clamp(((px - ax) * abx + (py - ay) * aby) / lengthSq, 0, 1);
    const closestX = ax + abx * t;
    const closestY = ay + aby * t;
    const dx = px - closestX;
    const dy = py - closestY;
    return dx * dx + dy * dy;
}

function polygonPoints(x, y, radius, sides, rotation) {
    const points = [];
    for (let i = 0; i < sides; i += 1) {
        const angle = rotation + (Math.PI * 2 * i) / sides;
        points.push(new Phaser.Geom.Point(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius));
    }
    return points;
}

function drawShape(graphics, shape, x, y, size, color, alpha, rotation = 0) {
    graphics.fillStyle(color, alpha);
    if (shape === 'circle') {
        graphics.fillCircle(x, y, size * 0.5);
        return;
    }
    if (shape === 'square') {
        graphics.fillPoints(polygonPoints(x, y, size * 0.78, 4, rotation + Math.PI * 0.25), true);
        return;
    }
    graphics.fillPoints(polygonPoints(x, y, size * 0.82, 3, rotation - Math.PI * 0.5), true);
}

function getChainMass(count) {
    if (MASS_BY_COUNT[count]) {
        return MASS_BY_COUNT[count];
    }
    return 1.72 + (count - 6) * 0.14;
}

function getChainSpan(count) {
    if (CHAIN_SPAN_BY_COUNT[count]) {
        return CHAIN_SPAN_BY_COUNT[count];
    }
    return 310 + (count - 6) * 42;
}

function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
}

function getFiniteNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
}

function readStoredJson(key) {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw);
    } catch (error) {
        console.warn(`Failed to read storage key "${key}"`, error);
        return null;
    }
}

function writeStoredJson(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn(`Failed to write storage key "${key}"`, error);
        return false;
    }
}

function formatSaveTimestamp(timestamp) {
    if (!Number.isFinite(timestamp)) {
        return '未知时间';
    }

    try {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(new Date(timestamp));
    } catch (error) {
        return new Date(timestamp).toLocaleString();
    }
}

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

class CoreDemoScene extends Phaser.Scene {
    constructor() {
        super('core-demo');
    }

    create() {
        ensureGameUiStyles();
        this.cameras.main.setBackgroundColor(COLORS.background);
        this.graphics = this.add.graphics();
        this.input.mouse?.disableContextMenu();
        this.scale.on('resize', this.handleResize, this);
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            expand: Phaser.Input.Keyboard.KeyCodes.E,
            shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
            cancel: Phaser.Input.Keyboard.KeyCodes.ESC,
            restart: Phaser.Input.Keyboard.KeyCodes.R
        });
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointerup', this.handlePointerUp, this);
        this.cameraZoomScale = 1;
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            this.cameraZoomScale = clamp(this.cameraZoomScale - deltaY * 0.001, 0.1, 5.0);
        });
        this.menuMode = null;
        this.toastTimer = null;
        this.buildUi();
        this.resetSimulation(false);
        this.showMainMenu();
    }

    handleResize() {
        if (!this.cameraRig || !this.player) {
            return;
        }
        this.cameraRig.viewportWidth = this.scale.width;
        this.cameraRig.viewportHeight = this.scale.height;
    }

    createDefaultEditState() {
        return {
            active: false,
            ambience: 0,
            hoverNode: -1,
            hoverLink: '',
            selectedNode: -1,
            pointerNode: -1,
            dragNode: -1,
            dragStartX: 0,
            dragStartY: 0,
            dragOffsetX: 0,
            dragOffsetY: 0,
            dragWorldX: 0,
            dragWorldY: 0,
            deleteNode: -1,
            deleteProgress: 0
        };
    }

    createDefaultPlayer(chain = this.baseChain) {
        return {
            chain: [...chain],
            centroidX: 0,
            centroidY: 0,
            heading: -Math.PI * 0.5,
            health: 100,
            maxHealth: 100,
            shield: 0,
            shieldTimer: 0,
            mass: 1,
            energy: 0,
            guard: 0,
            overload: 0,
            echo: 0,
            tempoBoost: 0,
            agitation: 0,
            stability: 0.35,
            turnAssist: 0,
            dead: false,
            deathTimer: 0,
            pulseRunners: [this.createPulseRunner()],
            pulseCursor: 0,
            pulseTimer: 0.12,
            pulsePath: { from: 0, to: 0, timer: 0.12, duration: 0.12, loopReset: false },
            edit: this.createDefaultEditState()
        };
    }

    createDefaultPulsePath() {
        return { from: 0, to: 0, timer: 0.12, duration: 0.12, loopReset: false };
    }

    createTopologyEdgeDescriptor(a, b, kind = 'support', id = createTopologyEdgeId()) {
        return { id, a, b, kind };
    }

    normalizeTopologyEdges(edges) {
        return (Array.isArray(edges) ? edges : [])
            .filter((edge) => Number.isInteger(edge?.a) && Number.isInteger(edge?.b) && edge.a !== edge.b)
            .map((edge) => this.createTopologyEdgeDescriptor(edge.a, edge.b, edge.kind || 'support', edge.id || createTopologyEdgeId()));
    }

    createPulseRunner(cursor = 0, timer = 0.12, path = null) {
        return {
            cursor,
            timer,
            path: {
                ...this.createDefaultPulsePath(),
                ...(path || {})
            }
        };
    }

    getDesiredPulseOrbCount() {
        const T = window.TUNING || {};
        return clamp(Math.round(T.pulseOrbCount ?? 1), 1, 8);
    }

    syncLegacyPulseState() {
        const leadRunner = Array.isArray(this.player?.pulseRunners) && this.player.pulseRunners.length > 0
            ? this.player.pulseRunners[0]
            : this.createPulseRunner();
        this.player.pulseCursor = clamp(getFiniteNumber(leadRunner.cursor, 0), 0, Math.max(0, (this.activeNodes?.length || this.player.chain.length || 1) - 1));
        this.player.pulseTimer = getFiniteNumber(leadRunner.timer, 0.12);
        this.player.pulsePath = {
            ...this.createDefaultPulsePath(),
            ...(leadRunner.path || {})
        };
    }

    getPulseRunnerPhase(runner, nodeCount) {
        if (!runner || nodeCount <= 0) {
            return 0;
        }

        const path = runner.path || this.createDefaultPulsePath();
        const from = clamp(getFiniteNumber(path.from, 0), 0, Math.max(0, nodeCount - 1));
        const duration = Math.max(0.0001, getFiniteNumber(path.duration, 0.12));
        const timer = getFiniteNumber(path.timer, duration);
        const progress = path.loopReset ? 0 : clamp(1 - timer / duration, 0, 1);
        return (((from + progress) / nodeCount) % 1 + 1) % 1;
    }

    createPulseRunnerAtPhase(phase, nodeCount) {
        if (nodeCount <= 1) {
            return this.createPulseRunner(0, 0.12, this.createDefaultPulsePath());
        }

        const wrappedPhase = (((phase % 1) + 1) % 1);
        const segmentCount = Math.max(1, nodeCount - 1);
        const scaled = wrappedPhase * segmentCount;
        const from = clamp(Math.floor(scaled), 0, Math.max(0, nodeCount - 2));
        const progress = scaled - from;
        const to = from + 1;
        const current = this.activeNodes?.[from];
        const next = this.activeNodes?.[to];
        const duration = current && next ? this.getPulseInterval(current, next, false) : 0.22;
        const timer = Math.max(0.0001, duration * (1 - progress));
        return this.createPulseRunner(to, timer, {
            from,
            to,
            timer,
            duration,
            loopReset: false
        });
    }

    rebalancePulseRunners(forceReset = false) {
        const nodeCount = Math.max(
            1,
            this.activeNodes?.length === this.player.chain.length
                ? this.activeNodes.length
                : this.player.chain.length || 1
        );
        const desiredCount = nodeCount <= 1 ? 1 : this.getDesiredPulseOrbCount();
        const existing = Array.isArray(this.player.pulseRunners)
            ? this.player.pulseRunners.map((runner) => this.createPulseRunner(
                clamp(getFiniteNumber(runner.cursor, 0), 0, Math.max(0, nodeCount - 1)),
                getFiniteNumber(runner.timer, 0.12),
                runner.path
            ))
            : [];
        const needsRedistribute = forceReset
            || existing.length !== desiredCount
            || existing.some((runner) => !runner.path
                || !Number.isFinite(runner.path.duration)
                || runner.path.duration <= 0
                || runner.path.from < 0
                || runner.path.from >= nodeCount
                || runner.path.to < 0
                || runner.path.to >= nodeCount);

        if (needsRedistribute) {
            const anchorPhase = forceReset ? 0 : this.getPulseRunnerPhase(existing[0], nodeCount);
            this.player.pulseRunners = Array.from({ length: desiredCount }, (_, index) => {
                const phase = (anchorPhase + index / desiredCount) % 1;
                return this.createPulseRunnerAtPhase(phase, nodeCount);
            });
        } else {
            this.player.pulseRunners = existing;
        }

        this.syncLegacyPulseState();
    }

    createDefaultIntent() {
        return {
            moveX: 0,
            moveY: 0,
            moveLength: 0,
            aimX: 0,
            aimY: -1,
            aimLength: 1,
            flowX: 0,
            flowY: -1
        };
    }

    createDefaultCameraRig() {
        return {
            x: 0,
            y: 0,
            zoom: 0.92,
            targetZoom: 0.92,
            viewportWidth: this.scale.width,
            viewportHeight: this.scale.height
        };
    }

    createDefaultSpawnTimers() {
        return { swarm: 0.35, stinger: 8, brute: 46, flank: 21 };
    }

    createPoolNodesFromLibrary() {
        return NODE_LIBRARY.map((node, index) => ({ ...node, index }));
    }

    resetSimulation(startSession = true) {
        this.paused = false;
        this.sessionStarted = startSession;
        this.timeScaleFactor = 1;
        this.worldTime = 0;
        this.effects = [];
        this.projectiles = [];
        this.echoQueue = [];
        this.enemies = [];
        this.spawnTimers = this.createDefaultSpawnTimers();
        this.baseChain = [...DEFAULT_BASE_CHAIN];
        this.player = this.createDefaultPlayer();
        this.intent = this.createDefaultIntent();
        this.cameraRig = this.createDefaultCameraRig();
        this.poolNodes = this.createPoolNodesFromLibrary();
        this.player.topology = this.rebuildTopologyFromCurrentChain();
        this.activeNodes = [];
        this.links = [];
        this.rebuildFormation(true);
        this.lastSunflowerTopologyEnabled = this.isSunflowerTopologyEnabled();
        this.refreshMenuState();
    }

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

        document.body.appendChild(overlay);
        document.body.appendChild(toast);

        this.ui = {
            overlay,
            toast,
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
    }

    hasSavedGame() {
        return !!this.getSavedGameData();
    }

    getSavedGameData() {
        const data = readStoredJson(STORAGE_KEYS.saveSlot);
        if (!data || !Array.isArray(data.player?.chain) || !data.player?.topology || !Array.isArray(data.poolNodes) || !Array.isArray(data.activeNodes)) {
            return null;
        }
        return data;
    }

    buildSaveData() {
        this.rebalancePulseRunners();
        return {
            version: 2,
            savedAt: Date.now(),
            baseChain: [...this.baseChain],
            player: {
                chain: [...this.player.chain],
                centroidX: this.player.centroidX,
                centroidY: this.player.centroidY,
                heading: this.player.heading,
                health: this.player.health,
                maxHealth: this.player.maxHealth,
                shield: this.player.shield,
                shieldTimer: this.player.shieldTimer,
                mass: this.player.mass,
                energy: this.player.energy,
                guard: this.player.guard,
                overload: this.player.overload,
                echo: this.player.echo,
                tempoBoost: this.player.tempoBoost,
                agitation: this.player.agitation,
                stability: this.player.stability,
                turnAssist: this.player.turnAssist,
                dead: this.player.dead,
                deathTimer: this.player.deathTimer,
                pulseRunners: cloneData(this.player.pulseRunners || []),
                pulseCursor: this.player.pulseCursor,
                pulseTimer: this.player.pulseTimer,
                pulsePath: cloneData(this.player.pulsePath),
                topology: {
                    slots: cloneData(this.player.topology?.slots || {}),
                    edges: cloneData(this.player.topology?.edges || [])
                }
            },
            poolNodes: this.poolNodes.map((node) => ({
                index: node.index,
                id: node.id,
                shape: node.shape,
                polarity: node.polarity,
                role: node.role,
                color: node.color
            })),
            activeNodes: this.activeNodes.map((node) => ({
                index: node.index,
                x: node.x,
                y: node.y,
                vx: node.vx,
                vy: node.vy,
                anchorX: node.anchorX,
                anchorY: node.anchorY,
                anchored: node.anchored,
                stanceTimer: node.stanceTimer,
                anchorStrength: node.anchorStrength,
                pulseGlow: node.pulseGlow,
                tension: node.tension,
                displayX: node.displayX,
                displayY: node.displayY,
                displayAnchorX: node.displayAnchorX,
                displayAnchorY: node.displayAnchorY,
                attackTimer: node.attackTimer,
                attackDirX: node.attackDirX,
                attackDirY: node.attackDirY,
                attackDamage: node.attackDamage
            })),
            summary: {
                nodeCount: this.activeNodes.length,
                linkCount: this.links.length
            }
        };
    }

    saveGameToSlot() {
        if (!this.sessionStarted) {
            this.showToast('当前没有可保存的局内状态。', true);
            return false;
        }

        const ok = writeStoredJson(STORAGE_KEYS.saveSlot, this.buildSaveData());
        this.refreshMenuState();
        this.showToast(ok ? '单通道存档已保存。' : '保存失败，无法写入本地存储。', !ok);
        return ok;
    }

    applySaveData(data) {
        const savedBaseChain = Array.isArray(data.baseChain) && data.baseChain.length >= 3 ? data.baseChain : [...DEFAULT_BASE_CHAIN];
        const savedPoolNodes = Array.isArray(data.poolNodes) && data.poolNodes.length > 0 ? data.poolNodes : this.createPoolNodesFromLibrary();
        const validIndices = new Set(savedPoolNodes.map((node, index) => Number.isInteger(node.index) ? node.index : index));
        const savedChain = Array.isArray(data.player?.chain)
            ? data.player.chain.filter((index) => validIndices.has(index))
            : [];
        const chain = savedChain.length >= 3 ? savedChain : [...savedBaseChain];

        this.paused = false;
        this.sessionStarted = true;
        this.timeScaleFactor = 1;
        this.worldTime = 0;
        this.effects = [];
        this.projectiles = [];
        this.echoQueue = [];
        this.enemies = [];
        this.spawnTimers = this.createDefaultSpawnTimers();
        this.baseChain = [...savedBaseChain];
        this.player = this.createDefaultPlayer(chain);
        this.intent = this.createDefaultIntent();
        this.cameraRig = this.createDefaultCameraRig();
        this.cameraZoomScale = 1;
        this.poolNodes = savedPoolNodes.map((node, index) => ({
            ...node,
            index: Number.isInteger(node.index) ? node.index : index
        }));

        Object.assign(this.player, {
            centroidX: getFiniteNumber(data.player.centroidX, this.player.centroidX),
            centroidY: getFiniteNumber(data.player.centroidY, this.player.centroidY),
            heading: getFiniteNumber(data.player.heading, this.player.heading),
            health: getFiniteNumber(data.player.health, this.player.health),
            maxHealth: getFiniteNumber(data.player.maxHealth, this.player.maxHealth),
            shield: getFiniteNumber(data.player.shield, this.player.shield),
            shieldTimer: getFiniteNumber(data.player.shieldTimer, this.player.shieldTimer),
            mass: getFiniteNumber(data.player.mass, this.player.mass),
            energy: getFiniteNumber(data.player.energy, this.player.energy),
            guard: getFiniteNumber(data.player.guard, this.player.guard),
            overload: getFiniteNumber(data.player.overload, this.player.overload),
            echo: getFiniteNumber(data.player.echo, this.player.echo),
            tempoBoost: getFiniteNumber(data.player.tempoBoost, this.player.tempoBoost),
            agitation: getFiniteNumber(data.player.agitation, this.player.agitation),
            stability: getFiniteNumber(data.player.stability, this.player.stability),
            turnAssist: getFiniteNumber(data.player.turnAssist, this.player.turnAssist),
            dead: !!data.player.dead,
            deathTimer: getFiniteNumber(data.player.deathTimer, this.player.deathTimer),
            pulseRunners: Array.isArray(data.player.pulseRunners) && data.player.pulseRunners.length > 0
                ? cloneData(data.player.pulseRunners)
                : [this.createPulseRunner(
                    clamp(getFiniteNumber(data.player.pulseCursor, 0), 0, Math.max(0, chain.length - 1)),
                    getFiniteNumber(data.player.pulseTimer, this.player.pulseTimer),
                    data.player.pulsePath
                )],
            pulseCursor: clamp(getFiniteNumber(data.player.pulseCursor, 0), 0, Math.max(0, chain.length - 1)),
            pulseTimer: getFiniteNumber(data.player.pulseTimer, this.player.pulseTimer),
            pulsePath: {
                ...this.player.pulsePath,
                ...(data.player.pulsePath || {})
            },
            topology: {
                slots: cloneData(data.player.topology?.slots || {}),
                edges: this.normalizeTopologyEdges(cloneData(data.player.topology?.edges || []))
            },
            edit: this.createDefaultEditState()
        });

        this.activeNodes = [];
        this.links = [];
        this.rebuildFormation(true);

        const savedNodeMap = new Map(
            (Array.isArray(data.activeNodes) ? data.activeNodes : []).map((node) => [node.index, node])
        );

        this.activeNodes.forEach((node) => {
            const savedNode = savedNodeMap.get(node.index);
            if (!savedNode) {
                return;
            }

            node.x = getFiniteNumber(savedNode.x, node.x);
            node.y = getFiniteNumber(savedNode.y, node.y);
            node.vx = getFiniteNumber(savedNode.vx, node.vx);
            node.vy = getFiniteNumber(savedNode.vy, node.vy);
            node.anchorX = getFiniteNumber(savedNode.anchorX, node.anchorX);
            node.anchorY = getFiniteNumber(savedNode.anchorY, node.anchorY);
            node.anchored = !!savedNode.anchored;
            node.stanceTimer = getFiniteNumber(savedNode.stanceTimer, node.stanceTimer);
            node.anchorStrength = getFiniteNumber(savedNode.anchorStrength, node.anchorStrength);
            node.pulseGlow = getFiniteNumber(savedNode.pulseGlow, node.pulseGlow);
            node.tension = getFiniteNumber(savedNode.tension, node.tension);
            node.displayX = getFiniteNumber(savedNode.displayX, node.displayX);
            node.displayY = getFiniteNumber(savedNode.displayY, node.displayY);
            node.displayAnchorX = getFiniteNumber(savedNode.displayAnchorX, node.displayAnchorX);
            node.displayAnchorY = getFiniteNumber(savedNode.displayAnchorY, node.displayAnchorY);
            node.attackTimer = getFiniteNumber(savedNode.attackTimer, node.attackTimer);
            node.attackDirX = getFiniteNumber(savedNode.attackDirX, node.attackDirX);
            node.attackDirY = getFiniteNumber(savedNode.attackDirY, node.attackDirY);
            node.attackDamage = getFiniteNumber(savedNode.attackDamage, node.attackDamage);
        });

        this.computeCentroid();
        this.rebalancePulseRunners();
        this.updateDisplay(0);
        this.lastSunflowerTopologyEnabled = this.isSunflowerTopologyEnabled();
        this.menuMode = null;
        this.refreshMenuState();
        return true;
    }

    loadGameFromSlot() {
        const data = this.getSavedGameData();
        if (!data) {
            this.showToast('没有可读取的单通道存档。', true);
            this.refreshMenuState();
            return false;
        }

        const ok = this.applySaveData(data);
        this.showToast(ok ? '单通道存档已读取。' : '读档失败，存档数据不可用。', !ok);
        return ok;
    }

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
    }

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
    }

    startNewGame() {
        this.resetSimulation(true);
        this.resumeGame();
    }

    handleMainContinue() {
        if (this.sessionStarted) {
            this.resumeGame();
            return;
        }
        this.loadGameFromSlot();
    }

    resumeGame() {
        if (!this.sessionStarted) {
            this.handleMainContinue();
            return;
        }

        this.menuMode = null;
        this.paused = false;
        this.refreshMenuState();
    }

    showPauseMenu() {
        if (!this.sessionStarted) {
            return;
        }

        this.exitEditMode();
        this.menuMode = 'pause';
        this.paused = true;
        this.refreshMenuState();
    }

    showMainMenu() {
        this.exitEditMode();
        this.menuMode = 'main';
        this.paused = true;
        this.refreshMenuState();
    }

    handleExitGame() {
        window.close();
        window.setTimeout(() => {
            if (!document.hidden) {
                this.showToast('浏览器阻止了关闭窗口。', true);
            }
        }, 120);
    }

    isSunflowerTopologyEnabled() {
        const T = window.TUNING || {};
        return T.enableSunflowerTopologySlots ?? true;
    }

    getSunflowerTopologySlot(order) {
        if (order <= 0) {
            return { x: 0, y: 0 };
        }
        const T = window.TUNING || {};
        const spacing = T.slotSpacing ?? PARTIAL_MESH_RULES.slotSpacing;
        const yComp = T.slotYCompression ?? 0.84;
        const rScale = T.slotRadiusScale ?? 0.94;
        const radius = spacing * Math.sqrt(order) * rScale;
        const angle = order * GOLDEN_ANGLE;
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius * yComp
        };
    }

    getLinearTopologySlot(order) {
        if (order <= 0) {
            return { x: 0, y: 0 };
        }
        const T = window.TUNING || {};
        const spacing = T.slotSpacing ?? PARTIAL_MESH_RULES.slotSpacing;
        const forwardStep = Math.max(T.forwardStep ?? PARTIAL_MESH_RULES.forwardStep, spacing * 0.72);
        const lane = Math.ceil(order / 2);
        const side = order % 2 === 0 ? -1 : 1;
        return {
            x: lane * forwardStep,
            y: side * spacing * 0.38
        };
    }

    getDefaultTopologySlot(order) {
        return this.isSunflowerTopologyEnabled()
            ? this.getSunflowerTopologySlot(order)
            : this.getLinearTopologySlot(order);
    }

    captureNodeLocalSlot(node) {
        const local = rotateLocal(node.x - this.player.centroidX, node.y - this.player.centroidY, -this.player.heading);
        return { x: local.x, y: local.y };
    }

    applyTopologySlotLayout(useSunflower) {
        const previousTopology = this.player.topology || { slots: {}, edges: [] };
        const previousSlots = previousTopology.slots || {};
        const activeByIndex = new Map((this.activeNodes || []).map((node) => [node.index, node]));
        const slots = {};

        this.player.chain.forEach((poolIndex, order) => {
            if (useSunflower) {
                slots[poolIndex] = this.getSunflowerTopologySlot(order);
                return;
            }

            const activeNode = activeByIndex.get(poolIndex);
            if (activeNode) {
                slots[poolIndex] = this.captureNodeLocalSlot(activeNode);
                return;
            }
            if (Object.prototype.hasOwnProperty.call(previousSlots, poolIndex)) {
                slots[poolIndex] = { ...previousSlots[poolIndex] };
                return;
            }
            slots[poolIndex] = this.getLinearTopologySlot(order);
        });

        this.player.topology = {
            slots,
            edges: this.normalizeTopologyEdges(
                (previousTopology.edges || []).filter((edge) => Object.prototype.hasOwnProperty.call(slots, edge.a) && Object.prototype.hasOwnProperty.call(slots, edge.b))
            )
        };
    }

    syncTopologySlotLayoutMode() {
        const useSunflower = this.isSunflowerTopologyEnabled();
        if (this.lastSunflowerTopologyEnabled === useSunflower) {
            return;
        }

        this.lastSunflowerTopologyEnabled = useSunflower;
        if (!this.player?.topology) {
            return;
        }

        this.applyTopologySlotLayout(useSunflower);
        this.rebuildFormation();
    }

    buildPartialMeshEdges(chain, slots) {
        const entries = chain.map((index) => {
            const slot = slots[index];
            return { index, x: slot.x, y: slot.y };
        });
        const degreeByIndex = new Map(chain.map((index) => [index, 0]));
        const edgeKeys = new Set();
        const edges = [];
        const addEdge = (a, b, kind) => {
            if (a === b) {
                return false;
            }

            const key = makeEdgeKey(a, b);
            if (edgeKeys.has(key)) {
                return false;
            }

            if ((degreeByIndex.get(a) || 0) >= PARTIAL_MESH_RULES.autoMaxDegree || (degreeByIndex.get(b) || 0) >= PARTIAL_MESH_RULES.autoMaxDegree) {
                return false;
            }

            edgeKeys.add(key);
            degreeByIndex.set(a, (degreeByIndex.get(a) || 0) + 1);
            degreeByIndex.set(b, (degreeByIndex.get(b) || 0) + 1);
            edges.push({ a, b, kind });
            return true;
        };

        for (let i = 1; i < entries.length; i += 1) {
            const current = entries[i];
            let best = entries[i - 1];
            let bestScore = Infinity;

            for (let j = 0; j < i; j += 1) {
                const candidate = entries[j];
                const distance = Math.hypot(current.x - candidate.x, current.y - candidate.y);
                const forwardBias = Math.abs(current.x - candidate.x) * 0.18;
                const score = distance + forwardBias;
                if (score < bestScore) {
                    bestScore = score;
                    best = candidate;
                }
            }

            addEdge(current.index, best.index, 'spine');
        }

        const supportRadius = PARTIAL_MESH_RULES.supportRadius + Math.min(chain.length, 24) * 2.5;
        entries.forEach((entry) => {
            if ((degreeByIndex.get(entry.index) || 0) >= PARTIAL_MESH_RULES.autoMaxDegree) {
                return;
            }

            const linkedAngles = [];
            edges.forEach((edge) => {
                if (edge.a === entry.index || edge.b === entry.index) {
                    const otherIndex = edge.a === entry.index ? edge.b : edge.a;
                    const other = slots[otherIndex];
                    linkedAngles.push(Math.atan2(other.y - entry.y, other.x - entry.x));
                }
            });

            const candidates = entries
                .filter((other) => other.index !== entry.index)
                .map((other) => {
                    const dx = other.x - entry.x;
                    const dy = other.y - entry.y;
                    return {
                        other,
                        distance: Math.hypot(dx, dy),
                        angle: Math.atan2(dy, dx)
                    };
                })
                .sort((a, b) => a.distance - b.distance);

            for (let i = 0; i < candidates.length; i += 1) {
                const candidate = candidates[i];
                if (candidate.distance > supportRadius) {
                    break;
                }
                if ((degreeByIndex.get(entry.index) || 0) >= PARTIAL_MESH_RULES.autoMaxDegree) {
                    break;
                }
                if ((degreeByIndex.get(candidate.other.index) || 0) >= PARTIAL_MESH_RULES.autoMaxDegree) {
                    continue;
                }
                if (linkedAngles.some((existingAngle) => angleDistance(existingAngle, candidate.angle) < 0.42)) {
                    continue;
                }
                if (addEdge(entry.index, candidate.other.index, 'support')) {
                    linkedAngles.push(candidate.angle);
                }
            }
        });

        return edges;
    }

    buildSeedPolarityEdges(chain) {
        const baseNodes = [];
        const inverseNodes = [];

        chain.forEach((index) => {
            const node = this.poolNodes[index];
            if (!node) {
                return;
            }
            if (node.polarity === 'inverse') {
                inverseNodes.push(index);
            } else {
                baseNodes.push(index);
            }
        });

        const edges = [];
        for (let i = 0; i < inverseNodes.length; i += 1) {
            for (let j = i + 1; j < inverseNodes.length; j += 1) {
                edges.push(this.createTopologyEdgeDescriptor(inverseNodes[i], inverseNodes[j], 'spine'));
                edges.push(this.createTopologyEdgeDescriptor(inverseNodes[i], inverseNodes[j], 'support'));
            }
        }

        if (inverseNodes.length > 0) {
            baseNodes.forEach((baseIndex, order) => {
                const targetInverse = inverseNodes[order % inverseNodes.length];
                edges.push(this.createTopologyEdgeDescriptor(baseIndex, targetInverse, 'support'));
            });
        }

        return edges;
    }

    rebuildTopologyFromCurrentChain(preserveExistingSlots = false) {
        const chain = [...this.player.chain];
        const previousSlots = preserveExistingSlots ? (this.player.topology?.slots || {}) : {};
        const slots = {};

        chain.forEach((poolIndex, order) => {
            if (Object.prototype.hasOwnProperty.call(previousSlots, poolIndex)) {
                slots[poolIndex] = { ...previousSlots[poolIndex] };
                return;
            }
            slots[poolIndex] = this.getDefaultTopologySlot(order);
        });

        return {
            slots,
            edges: this.normalizeTopologyEdges(this.buildSeedPolarityEdges(chain))
        };
    }

    getExpansionDirection() {
        const pointerWorld = this.screenToWorld(this.input.activePointer.x, this.input.activePointer.y);
        const desiredWorld = normalize(
            pointerWorld.x - this.player.centroidX,
            pointerWorld.y - this.player.centroidY,
            Math.cos(this.player.heading),
            Math.sin(this.player.heading)
        );
        const desiredLocalRaw = rotateLocal(desiredWorld.x, desiredWorld.y, -this.player.heading);
        const desiredLocal = normalize(desiredLocalRaw.x, desiredLocalRaw.y, 1, 0);
        return { world: desiredWorld, local: desiredLocal };
    }

    getActiveTopologyEntries() {
        const slots = this.player.topology?.slots || {};
        const neighborSetByIndex = new Map(this.player.chain.map((index) => [index, new Set()]));

        (this.player.topology?.edges || []).forEach((edge) => {
            if (!neighborSetByIndex.has(edge.a) || !neighborSetByIndex.has(edge.b)) {
                return;
            }
            neighborSetByIndex.get(edge.a)?.add(edge.b);
            neighborSetByIndex.get(edge.b)?.add(edge.a);
        });

        return this.player.chain.map((index, order) => {
            const slot = slots[index] || this.getDefaultTopologySlot(order);
            return {
                index,
                order,
                x: slot.x,
                y: slot.y,
                degree: neighborSetByIndex.get(index)?.size || 0
            };
        });
    }

    pickExpansionAnchor(entries, desiredLocal) {
        let best = entries[0];
        let bestScore = -Infinity;

        entries.forEach((entry) => {
            const radial = normalize(entry.x, entry.y, desiredLocal.x, desiredLocal.y);
            const projection = entry.x * desiredLocal.x + entry.y * desiredLocal.y;
            const directional = radial.x * desiredLocal.x + radial.y * desiredLocal.y;
            const openness = 1 - clamp((entry.degree - 1) / PARTIAL_MESH_RULES.autoMaxDegree, 0, 1);
            const score = projection + directional * 54 + radial.length * 0.18 + openness * 46;
            if (score > bestScore) {
                bestScore = score;
                best = entry;
            }
        });

        return best;
    }

    relaxExpansionSlot(candidate, entries, desiredLocal) {
        const slot = { ...candidate };
        const minSpacing = PARTIAL_MESH_RULES.slotSpacing;
        let maxProjection = 0;

        entries.forEach((entry) => {
            maxProjection = Math.max(maxProjection, entry.x * desiredLocal.x + entry.y * desiredLocal.y);
        });

        for (let iteration = 0; iteration < 5; iteration += 1) {
            entries.forEach((entry) => {
                const dx = slot.x - entry.x;
                const dy = slot.y - entry.y;
                const distance = Math.hypot(dx, dy) || 0.0001;
                const overlap = minSpacing - distance;
                if (overlap <= 0) {
                    return;
                }

                slot.x += (dx / distance) * overlap * 0.58;
                slot.y += (dy / distance) * overlap * 0.58;
            });

            const projection = slot.x * desiredLocal.x + slot.y * desiredLocal.y;
            const targetProjection = maxProjection + PARTIAL_MESH_RULES.forwardStep;
            if (projection < targetProjection) {
                const delta = targetProjection - projection;
                slot.x += desiredLocal.x * delta * 0.32;
                slot.y += desiredLocal.y * delta * 0.32;
            }
        }

        return slot;
    }

    findBestPulseInsertionIndex(slot, anchorIndex) {
        let bestIndex = this.player.chain.length;
        let bestScore = Infinity;

        for (let insertIndex = 0; insertIndex <= this.player.chain.length; insertIndex += 1) {
            const previousIndex = insertIndex > 0 ? this.player.chain[insertIndex - 1] : null;
            const nextIndex = insertIndex < this.player.chain.length ? this.player.chain[insertIndex] : null;
            let score = 0;

            if (previousIndex !== null) {
                const previousSlot = this.player.topology.slots[previousIndex];
                score += Math.hypot(slot.x - previousSlot.x, slot.y - previousSlot.y);
                if (previousIndex === anchorIndex) {
                    score -= 38;
                }
            } else {
                score += 66;
            }

            if (nextIndex !== null) {
                const nextSlot = this.player.topology.slots[nextIndex];
                score += Math.hypot(slot.x - nextSlot.x, slot.y - nextSlot.y);
                if (nextIndex === anchorIndex) {
                    score -= 38;
                }
            } else {
                score += 42;
            }

            if (previousIndex !== null && nextIndex !== null) {
                const previousSlot = this.player.topology.slots[previousIndex];
                const nextSlot = this.player.topology.slots[nextIndex];
                score -= Math.hypot(previousSlot.x - nextSlot.x, previousSlot.y - nextSlot.y) * 0.22;
            }

            if (score < bestScore) {
                bestScore = score;
                bestIndex = insertIndex;
            }
        }

        return bestIndex;
    }

    pickExpansionNeighbors(slot, entries, anchorIndex) {
        const neighbors = [];
        const usedAngles = [];
        const anchor = entries.find((entry) => entry.index === anchorIndex);
        const pushNeighbor = (entry, allowTightAngle = false) => {
            if (!entry || neighbors.includes(entry.index)) {
                return false;
            }
            if (entry.degree >= PARTIAL_MESH_RULES.manualMaxDegree) {
                return false;
            }

            const angle = Math.atan2(entry.y - slot.y, entry.x - slot.x);
            if (!allowTightAngle && usedAngles.some((existingAngle) => angleDistance(existingAngle, angle) < 0.4)) {
                return false;
            }

            neighbors.push(entry.index);
            usedAngles.push(angle);
            return true;
        };

        pushNeighbor(anchor, true);

        const candidates = entries
            .filter((entry) => entry.index !== anchorIndex)
            .map((entry) => ({
                entry,
                distance: Math.hypot(entry.x - slot.x, entry.y - slot.y)
            }))
            .sort((a, b) => a.distance - b.distance);

        for (let i = 0; i < candidates.length; i += 1) {
            if (neighbors.length >= 3) {
                break;
            }
            const candidate = candidates[i];
            if (candidate.distance > PARTIAL_MESH_RULES.supportRadius + 48) {
                break;
            }
            pushNeighbor(candidate.entry);
        }

        for (let i = 0; i < candidates.length && neighbors.length < 2; i += 1) {
            pushNeighbor(candidates[i].entry, true);
        }

        return neighbors;
    }

    resetPulseFlow() {
        this.player.pulseRunners = [];
        this.rebalancePulseRunners(true);
    }

    getTopologyDegree(index) {
        const neighbors = new Set();
        this.player.topology.edges.forEach((edge) => {
            if (edge.a === index || edge.b === index) {
                neighbors.add(edge.a === index ? edge.b : edge.a);
            }
        });
        return neighbors.size;
    }

    getTopologyEdgeCount(a, b) {
        const key = makeEdgeKey(a, b);
        return this.player.topology.edges.filter((edge) => makeEdgeKey(edge.a, edge.b) === key).length;
    }

    addTopologyEdge(a, b, kind = 'support') {
        if (a === b) {
            return false;
        }
        this.player.topology.edges.push(this.createTopologyEdgeDescriptor(a, b, kind));
        return true;
    }

    removeTopologyEdge(edgeId) {
        const nextEdges = this.player.topology.edges.filter((edge) => edge.id !== edgeId);
        if (nextEdges.length === this.player.topology.edges.length) {
            return false;
        }
        this.player.topology.edges = nextEdges;
        return true;
    }

    removeNodeFromTopology(index) {
        if (this.player.chain.length <= 3) {
            return false;
        }

        this.player.chain = this.player.chain.filter((entry) => entry !== index);
        delete this.player.topology.slots[index];
        this.player.topology.edges = this.player.topology.edges.filter((edge) => edge.a !== index && edge.b !== index);
        this.player.energy = 0;
        this.player.guard = 0;
        this.player.overload = 0;
        this.player.echo = 0;
        this.player.tempoBoost = 0;
        this.player.stability = 0.35;
        this.player.turnAssist = 0;
        if (this.player.edit.selectedNode === index) {
            this.player.edit.selectedNode = -1;
        }
        if (this.player.edit.hoverNode === index) {
            this.player.edit.hoverNode = -1;
        }
        this.player.edit.hoverLink = '';
        if (this.player.edit.pointerNode === index) {
            this.player.edit.pointerNode = -1;
        }
        if (this.player.edit.dragNode === index) {
            this.player.edit.dragNode = -1;
        }
        if (this.player.edit.deleteNode === index) {
            this.player.edit.deleteNode = -1;
            this.player.edit.deleteProgress = 0;
        }
        this.rebuildFormation();
        this.resetPulseFlow();
        return true;
    }

    getTopologyLinkRigidity(parallelCount) {
        if (parallelCount >= 3) {
            return 'rigid';
        }
        if (parallelCount === 2) {
            return 'joint';
        }
        return 'flex';
    }

    buildTopologyLinkProfile(edge, samePolarity, parallelCount) {
        const T = window.TUNING || {};
        const kindStiffness = edge.kind === 'support' ? (T.supportStiffness ?? 0.78) : (T.spineStiffness ?? 0.98);
        const kindDamping = edge.kind === 'support' ? (T.supportDamping ?? 0.18) : (T.spineDamping ?? 0.24);
        const inverseStiffMul = samePolarity ? 1 : (T.inversePolarityStiffnessMul ?? 0.88) * (edge.kind === 'support' ? (T.supportSoftness ?? 0.88) : 1);
        const inverseDampMul = samePolarity ? 1 : (T.inversePolarityDampingMul ?? 0.86);
        const rigidity = this.getTopologyLinkRigidity(parallelCount);

        let stiffnessBase = T.jointStiffness ?? 0.72;
        let dampingBase = T.jointDamping ?? 0.55;
        let stretchSlack = T.jointStretchSlack ?? 12;
        let pbdWeight = T.jointPbdWeight ?? 0.56;

        if (rigidity === 'flex') {
            stiffnessBase = T.flexStiffness ?? 0.18;
            dampingBase = T.flexDamping ?? 0.16;
            stretchSlack = T.flexStretchSlack ?? 44;
            pbdWeight = T.flexPbdWeight ?? 0.14;
        } else if (rigidity === 'rigid') {
            stiffnessBase = T.rigidStiffness ?? 2.6;
            dampingBase = T.rigidDamping ?? 1.45;
            stretchSlack = T.rigidStretchSlack ?? 2;
            pbdWeight = (T.rigidPbdWeight ?? 2.1) + Math.max(0, parallelCount - 3) * 0.6;
        }

        return {
            rigidity,
            stiffness: stiffnessBase * kindStiffness * inverseStiffMul,
            damping: dampingBase * kindDamping * inverseDampMul,
            stretchSlack,
            pbdWeight,
            parallelCount
        };
    }

    getLinkConstraintError(distance, link) {
        let error = distance - link.rest;
        if (error > 0) {
            error = Math.max(0, error - (link.stretchSlack || 0));
        }
        return error;
    }

    solveLinkConstraint(link, correctionRate, draggedIndex = -1) {
        const first = this.activeNodes[link.a];
        const second = this.activeNodes[link.b];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.hypot(dx, dy) || 0.0001;
        const error = this.getLinkConstraintError(distance, link);
        if (Math.abs(error) < 0.0001) {
            return;
        }

        const moveA = first.index === draggedIndex ? 0 : (first.anchored ? 0.18 : 1) / Math.max(first.mass, 0.1);
        const moveB = second.index === draggedIndex ? 0 : (second.anchored ? 0.18 : 1) / Math.max(second.mass, 0.1);
        const moveTotal = moveA + moveB;
        if (moveTotal <= 0) {
            return;
        }

        const strength = clamp(correctionRate * link.pbdWeight, 0, 0.92);
        const correction = (error / distance) * strength;
        const correctionX = dx * correction;
        const correctionY = dy * correction;
        first.x += correctionX * (moveA / moveTotal);
        first.y += correctionY * (moveA / moveTotal);
        second.x -= correctionX * (moveB / moveTotal);
        second.y -= correctionY * (moveB / moveTotal);
    }

    getLinkRenderPoints(link, useDisplay = true) {
        const first = this.activeNodes[link.a];
        const second = this.activeNodes[link.b];
        const fromX = useDisplay ? first.displayX : first.x;
        const fromY = useDisplay ? first.displayY : first.y;
        const toX = useDisplay ? second.displayX : second.x;
        const toY = useDisplay ? second.displayY : second.y;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.hypot(dx, dy) || 1;
        const normalX = -dy / distance;
        const normalY = dx / distance;
        const spread = link.parallelCount > 1 ? 12 : 0;
        const laneOffset = (link.parallelIndex - (link.parallelCount - 1) * 0.5) * spread;
        return {
            fromX: fromX + normalX * laneOffset,
            fromY: fromY + normalY * laneOffset,
            toX: toX + normalX * laneOffset,
            toY: toY + normalY * laneOffset
        };
    }

    getPointerWorld() {
        return this.screenToWorld(this.input.activePointer.x, this.input.activePointer.y);
    }

    enterEditMode() {
        const edit = this.player.edit;
        edit.active = true;
        edit.hoverNode = -1;
        edit.hoverLink = '';
        edit.selectedNode = -1;
        edit.pointerNode = -1;
        edit.dragNode = -1;
        edit.deleteNode = -1;
        edit.deleteProgress = 0;
    }

    exitEditMode() {
        const edit = this.player.edit;
        edit.active = false;
        edit.hoverNode = -1;
        edit.hoverLink = '';
        edit.selectedNode = -1;
        edit.pointerNode = -1;
        edit.dragNode = -1;
        edit.deleteNode = -1;
        edit.deleteProgress = 0;
    }

    findActiveNodeAtWorld(x, y, extraRadius = 0) {
        const radius = 28 / this.cameraRig.zoom + extraRadius;
        const radiusSq = radius * radius;
        let best = null;
        let bestDistance = Infinity;

        this.activeNodes.forEach((node) => {
            const dx = node.displayX - x;
            const dy = node.displayY - y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq > radiusSq || distanceSq >= bestDistance) {
                return;
            }
            best = node;
            bestDistance = distanceSq;
        });

        return best;
    }

    findActiveLinkAtWorld(x, y) {
        const threshold = (18 / this.cameraRig.zoom) ** 2;
        let best = null;
        let bestDistance = threshold;

        this.links.forEach((link) => {
            const render = this.getLinkRenderPoints(link);
            const distanceSq = distanceToSegmentSquared(x, y, render.fromX, render.fromY, render.toX, render.toY);
            if (distanceSq >= bestDistance) {
                return;
            }
            best = link;
            bestDistance = distanceSq;
        });

        return best;
    }

    shouldExitEditMode(x, y) {
        return Math.hypot(x - this.player.centroidX, y - this.player.centroidY) > this.getFormationSpan() + 96;
    }

    refreshEditHover() {
        const edit = this.player.edit;
        const pointerWorld = this.getPointerWorld();
        const hoverNode = this.findActiveNodeAtWorld(pointerWorld.x, pointerWorld.y);
        const hoverLink = hoverNode ? null : this.findActiveLinkAtWorld(pointerWorld.x, pointerWorld.y);
        edit.hoverNode = hoverNode ? hoverNode.index : -1;
        edit.hoverLink = hoverLink ? hoverLink.key : '';
    }

    setNodeSlotFromWorld(index, worldX, worldY) {
        const local = rotateLocal(worldX - this.player.centroidX, worldY - this.player.centroidY, -this.player.heading);
        this.player.topology.slots[index] = { x: local.x, y: local.y };
    }

    rebuildFormation(forceReset = false) {
        const count = this.player.chain.length;
        if (!this.player.topology || this.player.chain.some((poolIndex) => !Object.prototype.hasOwnProperty.call(this.player.topology.slots || {}, poolIndex))) {
            this.player.topology = this.rebuildTopologyFromCurrentChain(true);
        }

        const existingNodes = forceReset ? new Map() : new Map(this.activeNodes.map((node) => [node.index, node]));
        this.player.mass = getChainMass(count);
        const centerX = this.player.centroidX;
        const centerY = this.player.centroidY;
        const heading = this.player.heading;
        const slots = this.player.topology.slots;
        let topologyRadius = 0;

        this.player.chain.forEach((poolIndex) => {
            const slot = slots[poolIndex];
            topologyRadius = Math.max(topologyRadius, Math.hypot(slot.x, slot.y));
        });
        this.player.topologyRadius = Math.max(PARTIAL_MESH_RULES.slotSpacing, topologyRadius);

        this.activeNodes = this.player.chain.map((poolIndex, order) => {
            const base = this.poolNodes[poolIndex];
            const slot = slots[poolIndex] || this.getDefaultTopologySlot(order);
            const rotated = rotateLocal(slot.x, slot.y, heading);
            const existing = existingNodes.get(poolIndex);
            const seed = { x: centerX + rotated.x, y: centerY + rotated.y };
            const TM = window.TUNING || {};
            return {
                ...(existing || {}),
                ...base,
                order,
                localX: slot.x,
                localY: slot.y,
                mass: base.role === 'shell' ? (TM.massShell ?? 1.35) : base.role === 'blade' ? (TM.massBlade ?? 1.15) : (TM.massDefault ?? 1),
                x: existing ? existing.x : seed.x,
                y: existing ? existing.y : seed.y,
                vx: existing ? existing.vx : 0,
                vy: existing ? existing.vy : 0,
                fx: 0,
                fy: 0,
                anchorX: existing ? existing.anchorX : seed.x,
                anchorY: existing ? existing.anchorY : seed.y,
                anchored: existing ? existing.anchored : order % 2 === 0,
                stanceTimer: existing ? existing.stanceTimer : 0.25 + order * 0.03,
                anchorStrength: existing ? existing.anchorStrength : 220,
                pulseGlow: existing ? existing.pulseGlow : 0,
                tension: existing ? existing.tension : 0,
                displayX: existing ? existing.displayX : seed.x,
                displayY: existing ? existing.displayY : seed.y,
                displayAnchorX: existing ? existing.displayAnchorX : seed.x,
                displayAnchorY: existing ? existing.displayAnchorY : seed.y,
                attackTimer: existing ? existing.attackTimer : 0,
                attackDirX: existing ? existing.attackDirX : 0,
                attackDirY: existing ? existing.attackDirY : -1,
                attackDamage: existing ? existing.attackDamage : 0
            };
        });

        const activeOrderByIndex = new Map(this.activeNodes.map((node) => [node.index, node.order]));
        const neighborSetByIndex = new Map(this.player.chain.map((poolIndex) => [poolIndex, new Set()]));
        const pairCountByKey = new Map();
        const pairSeenByKey = new Map();
        this.player.topology.edges.forEach((edge) => {
            if (!neighborSetByIndex.has(edge.a) || !neighborSetByIndex.has(edge.b)) {
                return;
            }
            neighborSetByIndex.get(edge.a)?.add(edge.b);
            neighborSetByIndex.get(edge.b)?.add(edge.a);
            const pairKey = makeEdgeKey(edge.a, edge.b);
            pairCountByKey.set(pairKey, (pairCountByKey.get(pairKey) || 0) + 1);
        });
        this.links = [];
        this.player.topology.edges.forEach((edge) => {
            const a = activeOrderByIndex.get(edge.a);
            const b = activeOrderByIndex.get(edge.b);
            if (a === undefined || b === undefined) {
                return;
            }

            const first = this.activeNodes[a];
            const second = this.activeNodes[b];
            const samePolarity = first.polarity === second.polarity;
            const slotA = slots[edge.a];
            const slotB = slots[edge.b];
            const distance = Math.hypot(slotA.x - slotB.x, slotA.y - slotB.y);
            const T = window.TUNING || {};
            const sameRestMul = T.samePolarityRestMul ?? 1.02;
            const invRestMul = T.inversePolarityRestMul ?? 1.08;
            const restMin = T.linkRestMin ?? 84;
            const restMax = T.linkRestMax ?? 206;
            const pairKey = makeEdgeKey(edge.a, edge.b);
            const parallelCount = pairCountByKey.get(pairKey) || 1;
            const parallelIndex = pairSeenByKey.get(pairKey) || 0;
            pairSeenByKey.set(pairKey, parallelIndex + 1);
            const profile = this.buildTopologyLinkProfile(
                edge,
                samePolarity,
                parallelCount
            );
            this.links.push({
                id: edge.id,
                a,
                b,
                kind: edge.kind,
                key: edge.id,
                pairKey,
                topologyA: edge.a,
                topologyB: edge.b,
                rest: clamp(distance * (samePolarity ? sameRestMul : invRestMul), restMin, restMax),
                stiffness: profile.stiffness,
                damping: profile.damping,
                stretchSlack: profile.stretchSlack,
                pbdWeight: profile.pbdWeight,
                rigidity: profile.rigidity,
                parallelCount,
                parallelIndex,
                samePolarity
            });
        });

        this.activeNodes.forEach((node) => {
            node.degree = neighborSetByIndex.get(node.index)?.size || 0;
        });

        this.computeCentroid();
    }

    update(_, deltaMs) {
        const frameDt = Math.min(deltaMs, 33) / 1000;

        if (Phaser.Input.Keyboard.JustDown(this.keys.cancel) && !this.player.dead) {
            if (this.menuMode === 'pause') {
                this.resumeGame();
                return;
            }
            if (this.menuMode === 'main') {
                return;
            }
            if (this.player.edit.active) {
                this.exitEditMode();
            } else if (this.sessionStarted) {
                this.showPauseMenu();
                return;
            }
        }

        if (this.menuMode) {
            this.updateCamera(frameDt);
            this.updateDisplay(frameDt);
            this.render();
            return;
        }

        if (this.player.dead) {
            this.player.deathTimer -= frameDt;
            if (Phaser.Input.Keyboard.JustDown(this.keys.restart) || Phaser.Input.Keyboard.JustDown(this.keys.cancel) || this.player.deathTimer <= 0) {
                this.resetSimulation(true);
                this.resumeGame();
                return;
            }
        }

        if (this.paused) {
            this.updateCamera(frameDt);
            this.updateDisplay(frameDt);
            this.render();
            return;
        }

        if (!this.player.dead && !this.player.edit.active && Phaser.Input.Keyboard.JustDown(this.keys.expand)) {
            this.addDebugNode();
        }
        if (!this.player.dead && !this.player.edit.active && Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
            this.resetSimulation(true);
            return;
        }

        this.handleModeInputs();
        this.readIntent();
        this.updateEditMode(frameDt);
        this.syncTopologySlotLayoutMode();

        const simDt = frameDt * this.timeScaleFactor;
        this.worldTime += simDt;

        if (!this.player.dead) {
            this.updatePulse(simDt);
            this.updateFormation(simDt);
            this.updatePlayerState(simDt);
            this.updateEchoes(simDt);
            this.updateProjectiles(simDt);
            this.updateSpawns(simDt);
            this.updateEnemies(simDt);
            this.resolveEnemyNodeCollisions();
            this.updateEffects(simDt);
        } else {
            this.updateEffects(frameDt);
        }

        this.updateCamera(frameDt);
        this.updateDisplay(frameDt);
        this.render();
    }

    worldToScreen(x, y) {
        return {
            x: (x - this.cameraRig.x) * this.cameraRig.zoom + this.cameraRig.viewportWidth * 0.5,
            y: (y - this.cameraRig.y) * this.cameraRig.zoom + this.cameraRig.viewportHeight * 0.5
        };
    }

    screenToWorld(x, y) {
        return {
            x: (x - this.cameraRig.viewportWidth * 0.5) / this.cameraRig.zoom + this.cameraRig.x,
            y: (y - this.cameraRig.viewportHeight * 0.5) / this.cameraRig.zoom + this.cameraRig.y
        };
    }

    readIntent() {
        const moveX = this.player.edit.active ? 0 : (this.keys.right.isDown ? 1 : 0) - (this.keys.left.isDown ? 1 : 0);
        const moveY = this.player.edit.active ? 0 : (this.keys.down.isDown ? 1 : 0) - (this.keys.up.isDown ? 1 : 0);
        const move = normalize(moveX, moveY);

        const worldPointer = this.screenToWorld(this.input.activePointer.x, this.input.activePointer.y);
        const aim = normalize(worldPointer.x - this.player.centroidX, worldPointer.y - this.player.centroidY, Math.cos(this.player.heading), Math.sin(this.player.heading));
        const T = window.TUNING || {};
        const moveWeight = this.keys.shift.isDown ? (T.shiftMoveWeight ?? 0.32) : (T.normalMoveWeight ?? 0.58);
        const aimWeight = 1 - moveWeight;
        const flow = normalize(move.x * moveWeight + aim.x * aimWeight, move.y * moveWeight + aim.y * aimWeight, aim.x, aim.y);

        this.intent.moveX = move.x;
        this.intent.moveY = move.y;
        this.intent.moveLength = move.length;
        this.intent.aimX = aim.x;
        this.intent.aimY = aim.y;
        this.intent.aimLength = aim.length;
        this.intent.flowX = flow.x;
        this.intent.flowY = flow.y;
    }

    handleModeInputs() {
        if (!this.player.edit.active) {
            this.timeScaleFactor = 1;
            return;
        }

        this.timeScaleFactor = this.player.edit.deleteNode >= 0 ? 0.05 : 0.08;
        this.refreshEditHover();
    }

    handlePointerDown(pointer) {
        if (this.menuMode) {
            return;
        }

        if (this.player.dead) {
            this.resetSimulation(true);
            return;
        }

        const pointerWorld = this.screenToWorld(pointer.x, pointer.y);
        const hitNode = this.findActiveNodeAtWorld(pointerWorld.x, pointerWorld.y);
        const hitLink = hitNode ? null : this.findActiveLinkAtWorld(pointerWorld.x, pointerWorld.y);

        if (!this.player.edit.active) {
            if (hitNode || hitLink) {
                this.enterEditMode();
            }
            return;
        }

        if (pointer.button === 2) {
            if (hitNode) {
                this.player.edit.deleteNode = hitNode.index;
                this.player.edit.deleteProgress = 0;
                this.player.edit.selectedNode = -1;
                this.player.edit.pointerNode = -1;
                this.player.edit.dragNode = hitNode.index;
                this.player.edit.dragWorldX = hitNode.x;
                this.player.edit.dragWorldY = hitNode.y;
            } else if (hitLink) {
                if (this.removeTopologyEdge(hitLink.id)) {
                    this.rebuildFormation();
                }
            }
            return;
        }

        if (pointer.button !== 0) {
            return;
        }

        if (!hitNode) {
            if (this.shouldExitEditMode(pointerWorld.x, pointerWorld.y)) {
                this.exitEditMode();
            } else {
                this.player.edit.selectedNode = -1;
            }
            return;
        }

        this.player.edit.pointerNode = hitNode.index;
        this.player.edit.dragNode = -1;
        this.player.edit.dragStartX = pointerWorld.x;
        this.player.edit.dragStartY = pointerWorld.y;
        this.player.edit.dragOffsetX = pointerWorld.x - hitNode.x;
        this.player.edit.dragOffsetY = pointerWorld.y - hitNode.y;
        this.player.edit.dragWorldX = hitNode.x;
        this.player.edit.dragWorldY = hitNode.y;
    }

    handlePointerUp(pointer) {
        if (this.menuMode) {
            return;
        }

        if (!this.player.edit.active) {
            return;
        }

        if (pointer.button === 2) {
            this.player.edit.deleteNode = -1;
            this.player.edit.deleteProgress = 0;
            this.player.edit.dragNode = -1;
            this.player.edit.pointerNode = -1;
            return;
        }

        if (pointer.button !== 0) {
            return;
        }

        const edit = this.player.edit;
        const pointerWorld = this.screenToWorld(pointer.x, pointer.y);
        const pointerNode = edit.pointerNode;
        const draggedNode = edit.dragNode;

        edit.pointerNode = -1;
        edit.dragNode = -1;

        if (draggedNode >= 0) {
            return;
        }

        if (pointerNode >= 0) {
            if (edit.selectedNode >= 0 && edit.selectedNode !== pointerNode) {
                const sourceNode = edit.selectedNode;
                if (this.addTopologyEdge(sourceNode, pointerNode, 'support')) {
                    this.rebuildFormation();
                }
                edit.selectedNode = sourceNode;
                return;
            }

            edit.selectedNode = edit.selectedNode === pointerNode ? -1 : pointerNode;
            return;
        }

        if (this.shouldExitEditMode(pointerWorld.x, pointerWorld.y)) {
            this.exitEditMode();
        }
    }

    updateEditMode(frameDt) {
        const edit = this.player.edit;
        edit.ambience = damp(edit.ambience, edit.active ? 1 : 0, 8.5, frameDt);

        if (!edit.active) {
            return;
        }

        this.refreshEditHover();
        const pointer = this.input.activePointer;
        const pointerWorld = this.getPointerWorld();

        if (pointer.leftButtonDown() && edit.pointerNode >= 0) {
            const dragThreshold = 16 / this.cameraRig.zoom;
            const dragDistance = Math.hypot(pointerWorld.x - edit.dragStartX, pointerWorld.y - edit.dragStartY);
            if (edit.dragNode < 0 && dragDistance >= dragThreshold) {
                edit.dragNode = edit.pointerNode;
                edit.selectedNode = -1;
            }
        }

        if (pointer.leftButtonDown() && edit.dragNode >= 0) {
            edit.dragWorldX = pointerWorld.x - edit.dragOffsetX;
            edit.dragWorldY = pointerWorld.y - edit.dragOffsetY;
            this.setNodeSlotFromWorld(edit.dragNode, edit.dragWorldX, edit.dragWorldY);

            const dragged = this.activeNodes.find((node) => node.index === edit.dragNode);
            if (dragged) {
                dragged.x = edit.dragWorldX;
                dragged.y = edit.dragWorldY;
                dragged.displayX = edit.dragWorldX;
                dragged.displayY = edit.dragWorldY;
                dragged.vx = 0;
                dragged.vy = 0;
            }
        }

        if (edit.deleteNode >= 0) {
            const deleteTarget = this.activeNodes.find((node) => node.index === edit.deleteNode);
            const stillHovering = deleteTarget
                && this.findActiveNodeAtWorld(pointerWorld.x, pointerWorld.y, 8)?.index === edit.deleteNode
                && pointer.rightButtonDown();

            if (!stillHovering) {
                edit.deleteNode = -1;
                edit.deleteProgress = 0;
                edit.dragNode = -1;
                return;
            }

            edit.deleteProgress = clamp(edit.deleteProgress + frameDt / PARTIAL_MESH_RULES.deleteHoldDuration, 0, 1);
            if (edit.deleteProgress >= 1) {
                this.removeNodeFromTopology(edit.deleteNode);
                edit.deleteNode = -1;
                edit.deleteProgress = 0;
                edit.dragNode = -1;
            }
        }
    }

    addDebugNode() {
        if (this.poolNodes.length >= 96) {
            return;
        }

        const expansion = this.getExpansionDirection();
        const entries = this.getActiveTopologyEntries();
        const anchor = this.pickExpansionAnchor(entries, expansion.local);
        const template = Phaser.Utils.Array.GetRandom(NODE_LIBRARY);
        const index = this.poolNodes.length;
        this.poolNodes.push({
            ...template,
            index,
            id: `${template.id}-${index}`
        });

        const anchorDrift = normalize(anchor.x, anchor.y, expansion.local.x, expansion.local.y);
        const lead = normalize(
            expansion.local.x * 0.76 + anchorDrift.x * 0.24,
            expansion.local.y * 0.76 + anchorDrift.y * 0.24,
            expansion.local.x,
            expansion.local.y
        );
        const side = { x: -lead.y, y: lead.x };
        const sideSign = Math.abs(expansion.local.y) < 0.16 ? (index % 2 === 0 ? 1 : -1) : Math.sign(expansion.local.y);
        const seedSlot = {
            x: anchor.x + lead.x * (PARTIAL_MESH_RULES.slotSpacing + 12),
            y: anchor.y + lead.y * (PARTIAL_MESH_RULES.slotSpacing + 12)
        };
        const candidateSlot = {
            x: seedSlot.x + side.x * sideSign * 18,
            y: seedSlot.y + side.y * sideSign * 18
        };
        const slot = this.relaxExpansionSlot(candidateSlot, entries, expansion.local);
        const insertIndex = this.findBestPulseInsertionIndex(slot, anchor.index);
        const neighborIndices = this.pickExpansionNeighbors(slot, entries, anchor.index);

        this.player.chain.splice(insertIndex, 0, index);
        this.player.topology.slots[index] = slot;
        neighborIndices.forEach((neighborIndex, neighborOrder) => {
            this.addTopologyEdge(index, neighborIndex, neighborOrder === 0 ? 'spine' : 'support');
        });
        this.player.energy = 0;
        this.player.guard = 0;
        this.player.overload = 0;
        this.player.echo = 0;
        this.player.tempoBoost = 0;
        this.player.stability = 0.35;
        this.player.turnAssist = 0;
        this.rebuildFormation();
        this.resetPulseFlow();
    }

    computeCentroid() {
        if (this.activeNodes.length === 0) {
            return;
        }

        let sumX = 0;
        let sumY = 0;
        this.activeNodes.forEach((node) => {
            sumX += node.x;
            sumY += node.y;
        });

        this.player.centroidX = sumX / this.activeNodes.length;
        this.player.centroidY = sumY / this.activeNodes.length;
    }

    getFormationSpan() {
        let maxDistance = 0;
        this.activeNodes.forEach((node) => {
            const dx = node.x - this.player.centroidX;
            const dy = node.y - this.player.centroidY;
            maxDistance = Math.max(maxDistance, Math.hypot(dx, dy));
        });
        return maxDistance;
    }

    updateCamera(frameDt) {
        const T = window.TUNING || {};
        const span = this.getFormationSpan() + (T.cameraSpanPadding ?? 180);
        const widthFit = this.cameraRig.viewportWidth / (span * 2.2);
        const heightFit = this.cameraRig.viewportHeight / (span * 1.85);
        let targetZ = clamp(Math.min(widthFit, heightFit), T.cameraMinZoom ?? 0.36, T.cameraMaxZoom ?? 1.08);
        targetZ *= lerp(1, 1.12, this.player.edit.ambience || 0);
        targetZ *= (this.cameraZoomScale || 1);
        this.cameraRig.targetZoom = targetZ;
        this.cameraRig.zoom = damp(this.cameraRig.zoom, this.cameraRig.targetZoom, T.cameraZoomDamp ?? 3.2, frameDt);
        this.cameraRig.x = damp(this.cameraRig.x, this.player.centroidX, T.cameraPosDamp ?? 3.4, frameDt);
        this.cameraRig.y = damp(this.cameraRig.y, this.player.centroidY, T.cameraPosDamp ?? 3.4, frameDt);
    }

    updateDisplay(frameDt) {
        const T = window.TUNING || {};
        const dd = T.displayDamping ?? 18;
        const pgd = T.pulseGlowDecay ?? 3.2;
        this.activeNodes.forEach((node) => {
            node.displayX = damp(node.displayX, node.x, dd, frameDt);
            node.displayY = damp(node.displayY, node.y, dd, frameDt);
            node.displayAnchorX = damp(node.displayAnchorX, node.anchorX, dd, frameDt);
            node.displayAnchorY = damp(node.displayAnchorY, node.anchorY, dd, frameDt);
            node.pulseGlow = Math.max(0, node.pulseGlow - frameDt * pgd);
            node.attackTimer = Math.max(0, node.attackTimer - frameDt);
        });
    }

    updatePulse(simDt) {
        const T = window.TUNING || {};
        if (!(T.enablePulse ?? true) || this.activeNodes.length === 0) return;
        this.rebalancePulseRunners();

        this.player.pulseRunners.forEach((runner) => {
            runner.timer -= simDt;
            runner.path.timer -= simDt;

            while (runner.timer <= 0) {
                const chainIndex = clamp(getFiniteNumber(runner.cursor, 0), 0, Math.max(0, this.activeNodes.length - 1));
                const current = this.activeNodes[chainIndex];
                const edge = this.getEdgeModifier(chainIndex);
                this.triggerNode(current, edge);

                const loopReset = chainIndex === this.activeNodes.length - 1;
                const nextIndex = loopReset ? 0 : chainIndex + 1;
                const nextNode = this.activeNodes[nextIndex];
                const duration = this.getPulseInterval(current, nextNode, loopReset);

                runner.cursor = nextIndex;
                runner.timer += duration;
                runner.path = {
                    from: chainIndex,
                    to: nextIndex,
                    timer: duration,
                    duration,
                    loopReset
                };
            }
        });

        this.syncLegacyPulseState();
    }

    getPulseVisualState(runner) {
        const path = runner?.path;
        if (!path) {
            return null;
        }

        const fromNode = this.activeNodes[path.from];
        const toNode = this.activeNodes[path.to];
        if (!fromNode || !toNode) {
            return null;
        }

        const progress = path.loopReset ? 1 : clamp(1 - path.timer / Math.max(path.duration, 0.0001), 0, 1);
        return {
            x: path.loopReset ? fromNode.displayX : lerp(fromNode.displayX, toNode.displayX, progress),
            y: path.loopReset ? fromNode.displayY : lerp(fromNode.displayY, toNode.displayY, progress)
        };
    }

    getEdgeModifier(chainIndex) {
        if (chainIndex <= 0) {
            return { kind: 'restart', reach: 1, stance: 1, stability: 1 };
        }

        const previous = this.activeNodes[chainIndex - 1];
        const current = this.activeNodes[chainIndex];
        if (previous.polarity === current.polarity) {
            return { kind: 'steady', reach: 0.94, stance: 1.16, stability: 1.18 };
        }
        return { kind: 'inverse', reach: 1.18, stance: 0.84, stability: 0.82 };
    }

    getPulseInterval(current, next, loopReset) {
        let interval = loopReset ? 0.36 : 0.22;
        let factor = 1;
        if (!loopReset && current.polarity !== next.polarity) {
            factor *= 0.94;
        }
        if (this.keys.shift.isDown) {
            factor *= 0.92;
        }
        factor *= lerp(1, 0.86, clamp(this.player.tempoBoost, 0, 1));
        return interval * Math.max(0.74, factor);
    }

    computeNominalOffset(node) {
        return {
            x: node.localX || 0,
            y: node.localY || 0
        };
    }

    nodeHasMoveAbility(node) {
        const T = window.TUNING || {};
        return !!(T.legacyAllNodesMove ?? false) || node.shape === 'square';
    }

    plantNode(node, profile) {
        const flow = normalize(this.intent.flowX, this.intent.flowY, Math.cos(this.player.heading), Math.sin(this.player.heading));
        const aim = normalize(this.intent.aimX, this.intent.aimY, flow.x, flow.y);
        const lead = normalize(flow.x * (profile.flowBias ?? 0.55) + aim.x * (profile.aimBias ?? 0.45), flow.y * (profile.flowBias ?? 0.55) + aim.y * (profile.aimBias ?? 0.45), aim.x, aim.y);
        const right = { x: -lead.y, y: lead.x };
        const lateralBias = clamp((node.localY || 0) / Math.max(PARTIAL_MESH_RULES.slotSpacing, this.player.topologyRadius || PARTIAL_MESH_RULES.slotSpacing), -1, 1);
        const sideSign = Math.abs(lateralBias) < 0.18 ? (node.order % 2 === 0 ? -1 : 1) : Math.sign(lateralBias);
        const T = window.TUNING || {};
        const spanFactor = T.formationSpanFactor ?? 0.16;
        const forwardReach = (profile.forwardBase + this.getFormationSpan() * spanFactor) * profile.reachScale;
        const sideReach = (profile.sideBase ?? 0) * sideSign * (profile.sideScale ?? Math.max(0.35, Math.abs(lateralBias)));
        node.anchorX = this.player.centroidX + lead.x * forwardReach + right.x * sideReach;
        node.anchorY = this.player.centroidY + lead.y * forwardReach + right.y * sideReach;
        node.pulseGlow = 1;
        if (this.nodeHasMoveAbility(node)) {
            node.anchorStrength = profile.strength;
            node.stanceTimer = profile.stance;
            node.anchored = true;
            return;
        }

        node.anchorStrength = 0;
        node.stanceTimer = 0;
        node.anchored = false;
    }

    triggerNode(node, edge) {
        if (edge.kind === 'inverse') {
            this.player.agitation = clamp(this.player.agitation + 0.22, 0, 2);
        } else if (edge.kind === 'steady') {
            this.player.stability = Math.min(1.3, this.player.stability + 0.12);
        }

        const T = window.TUNING || {};
        switch (node.role) {
            case 'source':
                this.player.energy = Math.min(3, this.player.energy + 1);
                this.player.stability = Math.min(1.2, this.player.stability + 0.08);
                this.plantNode(node, { forwardBase: T.plantSourceForward ?? 78, sideBase: T.plantSourceSide ?? 88, stance: (T.plantSourceStance ?? 0.36) * edge.stance, strength: (T.plantSourceStrength ?? 260) * edge.stability, reachScale: edge.reach });
                break;
            case 'compressor':
                this.player.energy = Math.min(3, this.player.energy + 1);
                this.player.overload = Math.min(3, this.player.overload + 1);
                this.player.tempoBoost = clamp(this.player.tempoBoost + 0.5, 0, 1);
                this.player.agitation = clamp(this.player.agitation + 0.2, 0, 2);
                this.plantNode(node, { forwardBase: T.plantCompressorForward ?? 92, sideBase: T.plantCompressorSide ?? 62, stance: (T.plantCompressorStance ?? 0.28) * edge.stance, strength: T.plantCompressorStrength ?? 320, reachScale: edge.reach * 1.06 });
                break;
            case 'shell':
                this.player.guard = Math.min(2, this.player.guard + 1);
                this.player.stability = Math.min(1.4, this.player.stability + 0.18);
                this.player.turnAssist = Math.max(this.player.turnAssist, 0.18);
                this.plantNode(node, { forwardBase: T.plantShellForward ?? 52, sideBase: T.plantShellSide ?? 146, stance: (T.plantShellStance ?? 0.5) * edge.stance, strength: (T.plantShellStrength ?? 420) * edge.stability, reachScale: edge.reach * 0.94, flowBias: T.plantShellFlowBias ?? 0.68, aimBias: T.plantShellAimBias ?? 0.32 });
                break;
            case 'prism':
                this.player.echo = 1;
                this.player.turnAssist = Math.min(1.2, this.player.turnAssist + 0.45);
                this.plantNode(node, { forwardBase: T.plantPrismForward ?? 86, sideBase: T.plantPrismSide ?? 134, stance: (T.plantPrismStance ?? 0.4) * edge.stance, strength: T.plantPrismStrength ?? 360, reachScale: edge.reach, flowBias: T.plantPrismFlowBias ?? 0.3, aimBias: T.plantPrismAimBias ?? 0.7 });
                break;
            case 'dart':
                this.fireVolley(node, edge);
                break;
            case 'blade':
                this.performSlash(node, edge);
                break;
            default:
                break;
        }
    }

    updateFormation(simDt) {
        const T = window.TUNING || {};
        const forward = vectorFromAngle(this.player.heading);
        const drift = normalize(this.intent.flowX, this.intent.flowY, forward.x, forward.y);
        const draggedTarget = this.player.edit.active && this.player.edit.dragNode >= 0
            ? {
                index: this.player.edit.dragNode,
                x: this.player.edit.dragWorldX,
                y: this.player.edit.dragWorldY
            }
            : null;

        this.computeCentroid();

        this.activeNodes.forEach((node) => {
            node.fx = 0;
            node.fy = 0;
            if (draggedTarget && node.index === draggedTarget.index) {
                node.x = draggedTarget.x;
                node.y = draggedTarget.y;
                node.vx = 0;
                node.vy = 0;
                node.anchored = false;
                node.anchorStrength = 0;
            }
            if (!this.nodeHasMoveAbility(node) && node.anchored) {
                node.anchored = false;
                node.anchorStrength = 0;
                node.stanceTimer = 0;
            }
            if (node.anchored) {
                node.stanceTimer -= simDt;
                if (node.stanceTimer <= 0) {
                    node.anchored = false;
                    node.anchorStrength = 0;
                }
            }
        });

        this.activeNodes.forEach((node) => {
            // ── 编队拉力 ──
            if (T.enableFormationPull ?? true) {
                const nominal = this.computeNominalOffset(node);
                const rotated = rotateLocal(nominal.x, nominal.y, this.player.heading);
                const targetX = this.player.centroidX + rotated.x;
                const targetY = this.player.centroidY + rotated.y;
                const toNominalX = targetX - node.x;
                const toNominalY = targetY - node.y;
                const formationPull = node.anchored
                    ? (T.formationPullAnchored ?? 32)
                    : (T.formationPullFreeBase ?? 76) + this.player.stability * (T.formationPullStabilityBonus ?? 22);
                node.fx += toNominalX * formationPull;
                node.fy += toNominalY * formationPull;
            }

            // ── 漂移力 ──
            if ((T.enableDrift ?? true) && !node.anchored && this.nodeHasMoveAbility(node)) {
                const drive = node.role === 'blade' || node.role === 'dart'
                    ? (T.driftAttack ?? 54)
                    : node.role === 'shell'
                        ? (T.driftShell ?? 18)
                        : (T.driftDefault ?? 28);
                node.fx += drift.x * drive;
                node.fy += drift.y * drive;
            }

            // ── 核心收束力 ──
            if ((T.enableCorePull ?? true) && (node.role === 'source' || node.role === 'compressor')) {
                const pullToCoreX = this.player.centroidX - node.x;
                const pullToCoreY = this.player.centroidY - node.y;
                const coreStr = T.corePullStrength ?? 24;
                node.fx += pullToCoreX * coreStr;
                node.fy += pullToCoreY * coreStr;
            }

            // ── 锚定力 ──
            if ((T.enableAnchor ?? true) && node.anchored) {
                node.fx += (node.anchorX - node.x) * node.anchorStrength;
                node.fy += (node.anchorY - node.y) * node.anchorStrength;
            }

            if (draggedTarget && node.index === draggedTarget.index) {
                node.fx = 0;
                node.fy = 0;
            }
        });

        // ── 弹簧力 ──
        if (T.enableSpring ?? true) {
            const sK = T.springK ?? 260;
            const sD = T.springDamping ?? 42;
            this.links.forEach((link) => {
                const first = this.activeNodes[link.a];
                const second = this.activeNodes[link.b];
                const dx = second.x - first.x;
                const dy = second.y - first.y;
                const distance = Math.hypot(dx, dy) || 0.0001;
                const dirX = dx / distance;
                const dirY = dy / distance;
                const stretch = this.getLinkConstraintError(distance, link);
                const relVel = (second.vx - first.vx) * dirX + (second.vy - first.vy) * dirY;
                const force = stretch * (sK * link.stiffness) + relVel * (sD * link.damping);
                first.fx += dirX * force;
                first.fy += dirY * force;
                second.fx -= dirX * force;
                second.fy -= dirY * force;
                link.tension = Math.abs(stretch) / Math.max(link.rest, 0.0001);
                first.tension = Math.max(first.tension * 0.82, link.tension);
                second.tension = Math.max(second.tension * 0.82, link.tension);
            });
        }

        // ── 排斥力 ──
        if (T.enableRepulsion ?? true) {
            const repMinDist = T.repulsionMinDist ?? 72;
            const repDegMax = T.repulsionDegreeMax ?? 18;
            const repDegScale = T.repulsionDegreeScale ?? 1.6;
            const repK = T.repulsionStiffness ?? 16;
            for (let i = 0; i < this.activeNodes.length; i += 1) {
                for (let j = i + 1; j < this.activeNodes.length; j += 1) {
                    const first = this.activeNodes[i];
                    const second = this.activeNodes[j];
                    const dx = second.x - first.x;
                    const dy = second.y - first.y;
                    const distance = Math.hypot(dx, dy) || 0.0001;
                    const minDistance = repMinDist + Math.min(repDegMax, (first.degree || 0) + (second.degree || 0)) * repDegScale;
                    if (distance >= minDistance) {
                        continue;
                    }
                    const push = (minDistance - distance) * repK;
                    const dirX = dx / distance;
                    const dirY = dy / distance;
                    first.fx -= dirX * push;
                    first.fy -= dirY * push;
                    second.fx += dirX * push;
                    second.fy += dirY * push;
                }
            }
        }

        // ── 速度积分 + 阻力 ──
        const dragAnch = T.dragAnchored ?? 7.8;
        const dragFBase = T.dragFreeBase ?? 5.6;
        const dragStabB = T.dragStabilityBonus ?? 1.1;
        const tDecay = T.tensionDecay ?? 0.85;
        this.activeNodes.forEach((node) => {
            const drag = node.anchored ? dragAnch : dragFBase + this.player.stability * dragStabB;
            node.vx = (node.vx + (node.fx / node.mass) * simDt) * Math.exp(-drag * simDt);
            node.vy = (node.vy + (node.fy / node.mass) * simDt) * Math.exp(-drag * simDt);
            node.x += node.vx * simDt;
            node.y += node.vy * simDt;
            node.tension *= tDecay;
        });

        // ── PBD 位置校正 ──
        if (T.enablePBD ?? true) {
            const pbdIter = T.pbdIterations ?? 3;
            const pbdRate = T.pbdCorrectionRate ?? 0.18;
            const rigidPasses = T.pbdRigidPasses ?? 2;
            const draggedIndex = draggedTarget ? draggedTarget.index : -1;
            for (let iteration = 0; iteration < pbdIter; iteration += 1) {
                this.links.forEach((link) => {
                    this.solveLinkConstraint(link, pbdRate, draggedIndex);
                });
            }
            for (let extraPass = 0; extraPass < rigidPasses; extraPass += 1) {
                this.links.forEach((link) => {
                    if (link.rigidity !== 'rigid') {
                        return;
                    }
                    this.solveLinkConstraint(link, pbdRate, draggedIndex);
                });
            }
        }

        if (draggedTarget) {
            const draggedNode = this.activeNodes.find((node) => node.index === draggedTarget.index);
            if (draggedNode) {
                draggedNode.x = draggedTarget.x;
                draggedNode.y = draggedTarget.y;
                draggedNode.vx = 0;
                draggedNode.vy = 0;
            }
        }

        this.computeCentroid();
    }

    updatePlayerState(simDt) {
        const T = window.TUNING || {};
        const desiredHeading = Math.atan2(this.intent.flowY, this.intent.flowX);
        const turnRate = (T.baseTurnRate ?? 3.1) + this.player.turnAssist * (T.turnAssistBonus ?? 2.1);
        this.player.heading = Phaser.Math.Angle.RotateTo(this.player.heading, desiredHeading, turnRate * simDt);
        this.player.shieldTimer = Math.max(0, this.player.shieldTimer - simDt);
        this.player.tempoBoost = Math.max(0, this.player.tempoBoost - simDt * (T.tempoBoostDecay ?? 1.5));
        this.player.agitation = Math.max(0, this.player.agitation - simDt * (T.agitationDecay ?? 0.9));
        this.player.turnAssist = Math.max(0, this.player.turnAssist - simDt * (T.turnAssistDecay ?? 1.8));
        this.player.stability = Math.max(T.stabilityMin ?? 0.3, this.player.stability - simDt * (T.stabilityDecay ?? 0.4));
        if (this.player.shieldTimer <= 0) {
            this.player.shield = 0;
        }
    }

    addShield(amount) {
        this.player.shield = Math.min(16, this.player.shield + amount);
        this.player.shieldTimer = 1.2;
    }

    fireVolley(node, edge) {
        const target = this.pickRangedTarget(node.x, node.y, this.intent.aimX, this.intent.aimY);
        const fireDir = target ? normalize(target.x - node.x, target.y - node.y, this.intent.aimX, this.intent.aimY) : normalize(this.intent.aimX, this.intent.aimY, Math.cos(this.player.heading), Math.sin(this.player.heading));
        const effectiveEnergy = Math.max(1, this.player.energy);
        const projectileCount = effectiveEnergy === 3 ? 3 : effectiveEnergy;
        const spread = projectileCount === 1 ? [0] : projectileCount === 2 ? [-0.09, 0.09] : [-0.18, 0, 0.18];
        const damage = 9 + effectiveEnergy * 4 + this.player.overload * 2;
        const baseAngle = Math.atan2(fireDir.y, fireDir.x);

        { const T = window.TUNING || {}; this.plantNode(node, { forwardBase: T.plantDartForward ?? 148, sideBase: T.plantDartSide ?? 54, stance: (T.plantDartStance ?? 0.42) * edge.stance, strength: (T.plantDartStrength ?? 330) * edge.stability, reachScale: edge.reach, flowBias: T.plantDartFlowBias ?? 0.32, aimBias: T.plantDartAimBias ?? 0.68 }); }

        spread.forEach((offset) => {
            const angle = baseAngle + offset;
            this.projectiles.push({
                x: node.x + Math.cos(angle) * 24,
                y: node.y + Math.sin(angle) * 24,
                vx: Math.cos(angle) * (440 + effectiveEnergy * 70),
                vy: Math.sin(angle) * (440 + effectiveEnergy * 70),
                dirX: Math.cos(angle),
                dirY: Math.sin(angle),
                damage,
                pierce: this.player.overload > 0 ? 1 : 0,
                life: 1.15,
                radius: 7,
                color: node.color,
                alpha: 0.9
            });
        });

        if (this.player.guard > 0) {
            this.addShield(this.player.guard * 8);
        }
        if (this.player.echo > 0) {
            this.echoQueue.push({ type: 'volley', timer: 0.14, x: node.x, y: node.y, angle: baseAngle, count: projectileCount, damage: damage * 0.6 });
        }

        node.attackTimer = 0.16;
        node.attackDirX = fireDir.x;
        node.attackDirY = fireDir.y;
        node.attackDamage = damage * 0.35;
        this.createRing(node.x, node.y, 34, COLORS.pulse, 0.18, 2);
        this.clearExecutionState();
    }

    performSlash(node, edge) {
        const strikeDir = normalize(this.intent.flowX * 0.58 + this.intent.aimX * 0.42, this.intent.flowY * 0.58 + this.intent.aimY * 0.42, Math.cos(this.player.heading), Math.sin(this.player.heading));
        const effectiveEnergy = Math.max(1, this.player.energy);
        const damage = (13 + effectiveEnergy * 6 + this.player.overload * 4) * edge.reach;

        { const T = window.TUNING || {}; this.plantNode(node, { forwardBase: T.plantBladeForward ?? 184, sideBase: T.plantBladeSide ?? 26, stance: (T.plantBladeStance ?? 0.34) * edge.stance, strength: T.plantBladeStrength ?? 460, reachScale: edge.reach * 1.08, flowBias: T.plantBladeFlowBias ?? 0.62, aimBias: T.plantBladeAimBias ?? 0.38 }); }
        this.slashCone(node.x, node.y, strikeDir.x, strikeDir.y, 150 + effectiveEnergy * 24, 0.84, damage, 260, 0);

        if (this.player.echo > 0) {
            this.echoQueue.push({ type: 'slash', timer: 0.11, x: node.x, y: node.y, dirX: strikeDir.x, dirY: strikeDir.y, range: 120 + effectiveEnergy * 18, damage: damage * 0.6 });
        }
        if (this.player.overload > 0) {
            this.echoQueue.push({ type: 'burst', timer: 0.14, x: node.anchorX, y: node.anchorY, range: 120 + effectiveEnergy * 18, damage: 10 + effectiveEnergy * 4 + this.player.overload * 4 });
        }
        if (this.player.guard > 0) {
            this.addShield(this.player.guard * 4);
        }

        node.attackTimer = 0.24;
        node.attackDirX = strikeDir.x;
        node.attackDirY = strikeDir.y;
        node.attackDamage = damage * 0.5;
        this.createRing(node.anchorX, node.anchorY, 42, COLORS.inverse, 0.22, 3);
        this.clearExecutionState();
    }

    clearExecutionState() {
        this.player.energy = 0;
        this.player.guard = 0;
        this.player.overload = 0;
        this.player.echo = 0;
    }

    updateEchoes(simDt) {
        for (let i = this.echoQueue.length - 1; i >= 0; i -= 1) {
            const echo = this.echoQueue[i];
            echo.timer -= simDt;
            if (echo.timer > 0) {
                continue;
            }

            if (echo.type === 'volley') {
                const spread = echo.count === 1 ? [0] : echo.count === 2 ? [-0.09, 0.09] : [-0.18, 0, 0.18];
                spread.forEach((offset) => {
                    const angle = echo.angle + offset;
                    this.projectiles.push({
                        x: echo.x,
                        y: echo.y,
                        vx: Math.cos(angle) * 380,
                        vy: Math.sin(angle) * 380,
                        dirX: Math.cos(angle),
                        dirY: Math.sin(angle),
                        damage: echo.damage,
                        pierce: 0,
                        life: 0.9,
                        radius: 6,
                        color: COLORS.pulse,
                        alpha: 0.65
                    });
                });
                this.createRing(echo.x, echo.y, 26, COLORS.pulse, 0.14, 2);
            } else if (echo.type === 'slash') {
                this.slashCone(echo.x, echo.y, echo.dirX, echo.dirY, echo.range, 0.92, echo.damage, 180, 0);
                this.createRing(echo.x, echo.y, 34, COLORS.pulse, 0.16, 2);
            } else if (echo.type === 'burst') {
                this.emitBurst(echo.x, echo.y, echo.range, echo.damage, COLORS.inverse);
            }

            this.echoQueue.splice(i, 1);
        }
    }

    updateProjectiles(simDt) {
        for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
            const projectile = this.projectiles[i];
            projectile.life -= simDt;
            projectile.x += projectile.vx * simDt;
            projectile.y += projectile.vy * simDt;

            if (projectile.life <= 0) {
                this.projectiles.splice(i, 1);
                continue;
            }

            for (let j = this.enemies.length - 1; j >= 0; j -= 1) {
                const enemy = this.enemies[j];
                const dx = enemy.x - projectile.x;
                const dy = enemy.y - projectile.y;
                const combined = enemy.radius + projectile.radius;
                if (dx * dx + dy * dy > combined * combined) {
                    continue;
                }

                this.damageEnemy(enemy, projectile.damage, 180, projectile.dirX, projectile.dirY, projectile.color);
                projectile.pierce -= 1;
                if (projectile.pierce < 0) {
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
        }
    }

    pickRangedTarget(originX, originY, dirX, dirY) {
        return this.pickDirectionalEnemy(originX, originY, dirX, dirY, 0.6, 520, 10) || this.pickNearestEnemy(originX, originY);
    }

    pickDirectionalEnemy(originX, originY, dirX, dirY, halfAngle, range, clusterWeight) {
        const aim = normalize(dirX, dirY);
        if (aim.length <= 0) {
            return null;
        }

        const cosThreshold = Math.cos(halfAngle);
        let best = null;
        let bestScore = -Infinity;

        this.enemies.forEach((enemy) => {
            const dx = enemy.x - originX;
            const dy = enemy.y - originY;
            const distance = Math.hypot(dx, dy);
            if (distance > range) {
                return;
            }

            const direction = normalize(dx, dy);
            const alignment = direction.x * aim.x + direction.y * aim.y;
            if (alignment < cosThreshold) {
                return;
            }

            let neighbors = 0;
            this.enemies.forEach((other) => {
                if (other === enemy) {
                    return;
                }
                const odx = other.x - enemy.x;
                const ody = other.y - enemy.y;
                if (odx * odx + ody * ody < 110 * 110) {
                    neighbors += 1;
                }
            });

            const score = alignment * 120 - distance + neighbors * clusterWeight;
            if (score > bestScore) {
                best = enemy;
                bestScore = score;
            }
        });

        return best;
    }

    pickNearestEnemy(originX, originY) {
        let best = null;
        let bestDistance = Infinity;

        this.enemies.forEach((enemy) => {
            const dx = enemy.x - originX;
            const dy = enemy.y - originY;
            const distance = dx * dx + dy * dy;
            if (distance < bestDistance) {
                best = enemy;
                bestDistance = distance;
            }
        });

        return best;
    }

    slashCone(x, y, dirX, dirY, range, halfAngle, damage, knockback, cooldown) {
        const cosThreshold = Math.cos(halfAngle);

        this.enemies.forEach((enemy) => {
            if (cooldown > 0 && enemy.slashCooldown > 0) {
                return;
            }
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const distance = Math.hypot(dx, dy);
            if (distance > range + enemy.radius) {
                return;
            }
            const direction = normalize(dx, dy);
            if (direction.x * dirX + direction.y * dirY < cosThreshold) {
                return;
            }
            const falloff = 1 - clamp(distance / (range + enemy.radius), 0, 1) * 0.28;
            this.damageEnemy(enemy, damage * falloff, knockback, dirX, dirY, COLORS.inverse);
            enemy.slashCooldown = cooldown;
        });
    }

    emitBurst(x, y, radius, damage, color) {
        this.createRing(x, y, radius, color, 0.24, 3);
        this.enemies.forEach((enemy) => {
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const distance = Math.hypot(dx, dy);
            if (distance > radius + enemy.radius) {
                return;
            }
            const direction = normalize(dx, dy, 1, 0);
            const falloff = 1 - clamp(distance / (radius + enemy.radius), 0, 1) * 0.45;
            this.damageEnemy(enemy, damage * falloff, 220, direction.x, direction.y, color);
        });
    }

    updateSpawns(simDt) {
        if (this.enemies.length > 90) {
            return;
        }

        const time = this.worldTime;
        this.spawnTimers.swarm -= simDt;
        this.spawnTimers.stinger -= simDt;
        this.spawnTimers.brute -= simDt;
        this.spawnTimers.flank -= simDt;

        if (time < 20) {
            if (this.spawnTimers.swarm <= 0) {
                this.spawnEnemyGroup('swarm', Phaser.Math.Between(1, 2));
                this.spawnTimers.swarm = Math.max(0.8, 1.14 - time * 0.012);
            }
            return;
        }

        if (time < 45) {
            if (this.spawnTimers.swarm <= 0) {
                this.spawnEnemyGroup('swarm', Phaser.Math.Between(2, 3));
                this.spawnTimers.swarm = 0.78;
            }
            if (this.spawnTimers.stinger <= 0) {
                this.spawnEnemyGroup('stinger', 1);
                this.spawnTimers.stinger = 5.1;
            }
            return;
        }

        if (this.spawnTimers.swarm <= 0) {
            this.spawnEnemyGroup('swarm', Phaser.Math.Between(2, 4));
            this.spawnTimers.swarm = Math.max(0.48, 0.72 - (time - 45) * 0.002);
        }
        if (this.spawnTimers.stinger <= 0) {
            this.spawnEnemyGroup('stinger', Phaser.Math.Between(1, 2));
            this.spawnTimers.stinger = 4.2;
        }
        if (this.spawnTimers.brute <= 0) {
            this.spawnEnemyGroup('brute', 1);
            this.spawnTimers.brute = 12;
        }
        if (this.spawnTimers.flank <= 0) {
            this.spawnFlankWave();
            this.spawnTimers.flank = 20;
        }
    }

    spawnEnemyGroup(type, count) {
        for (let i = 0; i < count; i += 1) {
            this.enemies.push(this.createEnemy(type));
        }
    }

    spawnFlankWave() {
        const yOffset = Phaser.Math.Between(-220, 220);
        this.enemies.push(this.createEnemy('stinger', 'left', this.player.centroidY + yOffset));
        this.enemies.push(this.createEnemy('stinger', 'right', this.player.centroidY - yOffset));
    }

    createEnemy(type, forcedSide = null, forcedAxis = null) {
        const definition = ENEMY_DEFS[type];
        const worldHalfWidth = this.cameraRig.viewportWidth * 0.5 / this.cameraRig.zoom;
        const worldHalfHeight = this.cameraRig.viewportHeight * 0.5 / this.cameraRig.zoom;
        const margin = 220;
        const side = forcedSide || Phaser.Utils.Array.GetRandom(['left', 'right', 'top', 'bottom']);
        let x = 0;
        let y = 0;

        if (side === 'left') {
            x = this.player.centroidX - worldHalfWidth - margin;
            y = forcedAxis ?? Phaser.Math.Between(this.player.centroidY - worldHalfHeight, this.player.centroidY + worldHalfHeight);
        } else if (side === 'right') {
            x = this.player.centroidX + worldHalfWidth + margin;
            y = forcedAxis ?? Phaser.Math.Between(this.player.centroidY - worldHalfHeight, this.player.centroidY + worldHalfHeight);
        } else if (side === 'top') {
            x = Phaser.Math.Between(this.player.centroidX - worldHalfWidth, this.player.centroidX + worldHalfWidth);
            y = this.player.centroidY - worldHalfHeight - margin;
        } else {
            x = Phaser.Math.Between(this.player.centroidX - worldHalfWidth, this.player.centroidX + worldHalfWidth);
            y = this.player.centroidY + worldHalfHeight + margin;
        }

        return {
            type,
            shape: definition.shape,
            color: definition.color,
            x,
            y,
            vx: 0,
            vy: 0,
            radius: definition.radius,
            maxHealth: definition.maxHealth,
            health: definition.maxHealth,
            speed: definition.speed,
            accel: definition.accel,
            mass: definition.mass,
            touchDamage: definition.touchDamage,
            push: definition.push,
            hitFlash: 0,
            attackCooldown: Phaser.Math.FloatBetween(0.08, 0.3),
            slashCooldown: 0,
            state: 'approach',
            stateTimer: 0,
            seed: Math.random() * 10
        };
    }

    updateEnemies(simDt) {
        for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
            const enemy = this.enemies[i];
            const targetNode = this.pickNearestNode(enemy.x, enemy.y);
            const chaseX = targetNode ? targetNode.x : this.player.centroidX;
            const chaseY = targetNode ? targetNode.y : this.player.centroidY;
            const toTarget = normalize(chaseX - enemy.x, chaseY - enemy.y, 1, 0);

            enemy.hitFlash = Math.max(0, enemy.hitFlash - simDt * 4.2);
            enemy.attackCooldown = Math.max(0, enemy.attackCooldown - simDt);
            enemy.slashCooldown = Math.max(0, enemy.slashCooldown - simDt);

            if (enemy.type === 'swarm') {
                const orbit = Math.sin(this.worldTime * 2.1 + enemy.seed) * 0.38;
                const steer = normalize(toTarget.x - toTarget.y * orbit, toTarget.y + toTarget.x * orbit, toTarget.x, toTarget.y);
                enemy.vx += steer.x * enemy.accel * simDt;
                enemy.vy += steer.y * enemy.accel * simDt;
            } else if (enemy.type === 'stinger') {
                this.updateStinger(enemy, toTarget, chaseX, chaseY, simDt);
            } else {
                enemy.vx += toTarget.x * enemy.accel * simDt;
                enemy.vy += toTarget.y * enemy.accel * simDt;
            }

            const speed = Math.hypot(enemy.vx, enemy.vy);
            if (speed > enemy.speed) {
                const scale = enemy.speed / speed;
                enemy.vx *= scale;
                enemy.vy *= scale;
            }

            enemy.vx *= Math.exp(-(enemy.type === 'brute' ? 0.4 : 1.1) * simDt);
            enemy.vy *= Math.exp(-(enemy.type === 'brute' ? 0.4 : 1.1) * simDt);
            enemy.x += enemy.vx * simDt;
            enemy.y += enemy.vy * simDt;
        }
    }

    updateStinger(enemy, toTarget, targetX, targetY, simDt) {
        const distance = Math.hypot(targetX - enemy.x, targetY - enemy.y);

        if (enemy.state === 'approach') {
            const orbit = Math.sin(this.worldTime * 3 + enemy.seed) * 0.6;
            const steer = normalize(toTarget.x - toTarget.y * orbit, toTarget.y + toTarget.x * orbit, toTarget.x, toTarget.y);
            enemy.vx += steer.x * enemy.accel * simDt;
            enemy.vy += steer.y * enemy.accel * simDt;
            if (distance < 170) {
                enemy.state = 'windup';
                enemy.stateTimer = 0.32;
            }
            return;
        }

        if (enemy.state === 'windup') {
            enemy.stateTimer -= simDt;
            enemy.vx *= Math.exp(-6 * simDt);
            enemy.vy *= Math.exp(-6 * simDt);
            if (enemy.stateTimer <= 0) {
                const lead = normalize(targetX - enemy.x, targetY - enemy.y, toTarget.x, toTarget.y);
                enemy.vx = lead.x * 300;
                enemy.vy = lead.y * 300;
                enemy.state = 'dash';
                enemy.stateTimer = 0.22;
            }
            return;
        }

        if (enemy.state === 'dash') {
            enemy.stateTimer -= simDt;
            if (enemy.stateTimer <= 0) {
                enemy.state = 'recover';
                enemy.stateTimer = 0.48;
            }
            return;
        }

        enemy.stateTimer -= simDt;
        enemy.vx *= Math.exp(-4 * simDt);
        enemy.vy *= Math.exp(-4 * simDt);
        if (enemy.stateTimer <= 0) {
            enemy.state = 'approach';
        }
    }

    pickNearestNode(x, y) {
        let best = null;
        let bestDistance = Infinity;
        this.activeNodes.forEach((node) => {
            const dx = node.x - x;
            const dy = node.y - y;
            const distance = dx * dx + dy * dy;
            if (distance < bestDistance) {
                best = node;
                bestDistance = distance;
            }
        });
        return best;
    }

    pickNearbyNodes(x, y, limit = 4, radius = 128) {
        const radiusSq = radius * radius;
        const candidates = [];

        this.activeNodes.forEach((node) => {
            const dx = node.x - x;
            const dy = node.y - y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq > radiusSq) {
                return;
            }
            candidates.push({ node, distanceSq });
        });

        candidates.sort((a, b) => a.distanceSq - b.distanceSq);
        return candidates.slice(0, limit).map((entry) => entry.node);
    }

    resolveEnemyNodeCollisions() {
        this.enemies.forEach((enemy) => {
            const candidates = this.pickNearbyNodes(enemy.x, enemy.y, 4, enemy.radius + 104);
            if (candidates.length === 0) {
                const focus = this.pickNearestNode(enemy.x, enemy.y);
                if (focus) {
                    candidates.push(focus);
                }
            }
            if (candidates.length === 0) {
                return;
            }

            candidates.forEach((node) => {
                const dx = enemy.x - node.x;
                const dy = enemy.y - node.y;
                const distance = Math.hypot(dx, dy) || 0.0001;
                const overlap = enemy.radius + 22 - distance;
                if (overlap <= 0) {
                    return;
                }

                const nx = dx / distance;
                const ny = dy / distance;
                enemy.x += nx * overlap * 0.72;
                enemy.y += ny * overlap * 0.72;
                node.x -= nx * overlap * 0.22;
                node.y -= ny * overlap * 0.22;

                if (node.attackTimer > 0) {
                    this.damageEnemy(enemy, node.attackDamage, 170, node.attackDirX || nx, node.attackDirY || ny, node.color);
                }
                if (enemy.attackCooldown <= 0) {
                    this.damagePlayer(enemy.touchDamage, nx, ny, enemy.push, node);
                    enemy.attackCooldown = enemy.type === 'brute' ? 0.92 : 0.56;
                }
            });
        });
    }

    damagePlayer(amount, dirX, dirY, push, node) {
        if (this.player.dead) {
            return;
        }

        let remaining = amount;
        if (this.player.shield > 0) {
            const absorbed = Math.min(this.player.shield, remaining);
            this.player.shield -= absorbed;
            remaining -= absorbed;
            this.createRing(node.x, node.y, 28, COLORS.shield, 0.14, 2);
            if (remaining <= 0) {
                return;
            }
        }

        // // this.player.health -= remaining; // Infinite health currently enabled // infinite health
        node.vx -= dirX * push * 0.22;
        node.vy -= dirY * push * 0.22;
        this.createRing(node.x, node.y, 34, COLORS.health, 0.2, 3);

        if (this.player.health <= 0) {
            this.player.dead = true;
            this.player.deathTimer = 2;
            this.createRing(this.player.centroidX, this.player.centroidY, 110, COLORS.health, 0.32, 4);
        }
    }

    damageEnemy(enemy, amount, knockback, dirX, dirY, color) {
        enemy.health -= amount;
        enemy.hitFlash = 1;
        enemy.vx += dirX * knockback / enemy.mass;
        enemy.vy += dirY * knockback / enemy.mass;
        this.createRing(enemy.x, enemy.y, enemy.radius + 8, color, 0.12, 2);

        if (enemy.health > 0) {
            return;
        }

        const index = this.enemies.indexOf(enemy);
        if (index >= 0) {
            this.enemies.splice(index, 1);
        }
        this.createRing(enemy.x, enemy.y, enemy.radius + 20, color, 0.24, 3);
    }

    createRing(x, y, radius, color, life, thickness) {
        this.effects.push({ type: 'ring', x, y, radius, color, life, total: life, thickness });
    }

    updateEffects(simDt) {
        for (let i = this.effects.length - 1; i >= 0; i -= 1) {
            this.effects[i].life -= simDt;
            if (this.effects[i].life <= 0) {
                this.effects.splice(i, 1);
            }
        }
    }

    render() {
        const g = this.graphics;
        g.clear();
        this.drawWorld(g);
        this.drawEffects(g);
        this.drawEnemies(g);
        this.drawProjectiles(g);
        this.drawFormation(g);
        if (this.player.edit.active || this.player.edit.ambience > 0.01) {
            this.drawEditOverlay(g);
        }
        this.drawHud(g);
    }

    drawWorld(g) {
        const width = this.cameraRig.viewportWidth;
        const height = this.cameraRig.viewportHeight;
        g.fillStyle(COLORS.arena, 0.96);
        g.fillRect(0, 0, width, height);

        const worldLeft = this.cameraRig.x - width * 0.5 / this.cameraRig.zoom;
        const worldRight = this.cameraRig.x + width * 0.5 / this.cameraRig.zoom;
        const worldTop = this.cameraRig.y - height * 0.5 / this.cameraRig.zoom;
        const worldBottom = this.cameraRig.y + height * 0.5 / this.cameraRig.zoom;
        const gridSize = 120;
        const startX = Math.floor(worldLeft / gridSize) * gridSize;
        const startY = Math.floor(worldTop / gridSize) * gridSize;

        g.lineStyle(1, COLORS.grid, 0.48);
        for (let x = startX; x <= worldRight; x += gridSize) {
            const screen = this.worldToScreen(x, 0);
            g.lineBetween(screen.x, 0, screen.x, height);
        }
        for (let y = startY; y <= worldBottom; y += gridSize) {
            const screen = this.worldToScreen(0, y);
            g.lineBetween(0, screen.y, width, screen.y);
        }
    }

    drawEffects(g) {
        this.effects.forEach((effect) => {
            const position = this.worldToScreen(effect.x, effect.y);
            const alpha = clamp(effect.life / effect.total, 0, 1);
            g.lineStyle(effect.thickness, effect.color, alpha * 0.9);
            g.strokeCircle(position.x, position.y, effect.radius * this.cameraRig.zoom + (1 - alpha) * 18);
        });
    }

    drawEnemies(g) {
        this.enemies.forEach((enemy) => {
            const position = this.worldToScreen(enemy.x, enemy.y);
            const size = clamp(enemy.radius * this.cameraRig.zoom * 2, 12, 42);
            const color = enemy.hitFlash > 0 ? COLORS.pulse : enemy.color;
            drawShape(g, enemy.shape, position.x, position.y, size, color, 0.94, Math.atan2(enemy.vy, enemy.vx));
        });
    }

    drawProjectiles(g) {
        this.projectiles.forEach((projectile) => {
            const position = this.worldToScreen(projectile.x, projectile.y);
            g.lineStyle(2, projectile.color, projectile.alpha * 0.55);
            g.lineBetween(
                position.x - projectile.dirX * 12 * this.cameraRig.zoom,
                position.y - projectile.dirY * 12 * this.cameraRig.zoom,
                position.x + projectile.dirX * 12 * this.cameraRig.zoom,
                position.y + projectile.dirY * 12 * this.cameraRig.zoom
            );
            g.fillStyle(projectile.color, projectile.alpha);
            g.fillCircle(position.x, position.y, clamp(projectile.radius * this.cameraRig.zoom, 3, 7));
        });
    }

    drawFormation(g) {
        this.links.forEach((link) => {
            const render = this.getLinkRenderPoints(link);
            const from = this.worldToScreen(render.fromX, render.fromY);
            const to = this.worldToScreen(render.toX, render.toY);
            const rigidityWidth = link.rigidity === 'rigid' ? 0.9 : link.rigidity === 'flex' ? -0.35 : 0.15;
            const width = clamp(((link.kind === 'support' ? 1.4 : 2.1) + rigidityWidth + link.tension * (link.kind === 'support' ? 8 : 12)) * this.cameraRig.zoom, 1, 9);
            const color = link.samePolarity ? COLORS.link : COLORS.pulse;
            const baseAlpha = link.samePolarity
                ? (link.kind === 'support' ? 0.3 : 0.52)
                : (link.kind === 'support' ? 0.54 : 0.76);
            const alpha = clamp(baseAlpha + (link.rigidity === 'rigid' ? 0.12 : link.rigidity === 'flex' ? -0.08 : 0), 0.18, 0.95);
            g.lineStyle(width, color, alpha);
            g.lineBetween(from.x, from.y, to.x, to.y);
        });

        (this.player.pulseRunners || []).forEach((runner, index) => {
            const pulseState = this.getPulseVisualState(runner);
            if (!pulseState) {
                return;
            }
            const pulse = this.worldToScreen(pulseState.x, pulseState.y);
            const radius = clamp((8 - Math.min(index, 3) * 0.6) * this.cameraRig.zoom, 3.5, 8);
            const alpha = clamp(0.94 - index * 0.06, 0.55, 0.94);
            g.fillStyle(COLORS.pulse, alpha);
            g.fillCircle(pulse.x, pulse.y, radius);
        });

        this.activeNodes.forEach((node) => {
            const nodePos = this.worldToScreen(node.displayX, node.displayY);
            const anchorPos = this.worldToScreen(node.displayAnchorX, node.displayAnchorY);
            if (node.anchored) {
                g.lineStyle(clamp(2.6 * this.cameraRig.zoom, 1, 3), COLORS.pulse, 0.45);
                g.lineBetween(nodePos.x, nodePos.y, anchorPos.x, anchorPos.y);
                g.lineStyle(clamp(2.2 * this.cameraRig.zoom, 1, 3), node.color, 0.55);
                g.strokeCircle(anchorPos.x, anchorPos.y, clamp(14 * this.cameraRig.zoom, 5, 14));
            }

            const glowRadius = clamp((18 + node.pulseGlow * 10) * this.cameraRig.zoom, 10, 28);
            if (node.pulseGlow > 0) {
                g.lineStyle(3, COLORS.pulse, node.pulseGlow * 0.9);
                g.strokeCircle(nodePos.x, nodePos.y, glowRadius);
            }

            const size = clamp(30 * this.cameraRig.zoom, 14, 28);
            drawShape(g, node.shape, nodePos.x, nodePos.y, size, node.color, 0.96, Math.atan2(node.vy, node.vx));
        });
    }

    drawHud(g) {
        const left = 22;
        const top = 22;
        const healthWidth = 180;
        const healthRatio = clamp(this.player.health / this.player.maxHealth, 0, 1);
        const shieldRatio = clamp(this.player.shield / 16, 0, 1);

        g.fillStyle(COLORS.shadow, 0.3);
        g.fillRect(left, top, healthWidth, 16);
        g.fillStyle(COLORS.health, 0.9);
        g.fillRect(left, top, healthWidth * healthRatio, 16);
        g.fillStyle(COLORS.shield, 0.85);
        g.fillRect(left, top + 20, healthWidth * shieldRatio, 8);

        const pressure = clamp(this.worldTime / 120, 0, 1);
        g.fillStyle(COLORS.shadow, 0.28);
        g.fillRect(left, top + 40, healthWidth, 6);
        g.fillStyle(COLORS.inverse, 0.78);
        g.fillRect(left, top + 40, healthWidth * pressure, 6);

        if (this.menuMode === 'pause') {
            g.fillStyle(0x000000, 0.18);
            g.fillRect(0, 0, this.scale.width, this.scale.height);
        }
    }

    drawEditOverlay(g) {
        const edit = this.player.edit;
        const ambience = edit.ambience;
        if (ambience <= 0.01) {
            return;
        }

        const width = this.cameraRig.viewportWidth;
        const height = this.cameraRig.viewportHeight;
        const center = this.worldToScreen(this.player.centroidX, this.player.centroidY);
        const focusRadius = (this.getFormationSpan() + 108) * this.cameraRig.zoom;

        g.fillStyle(COLORS.shadow, 0.16 * ambience);
        g.fillRect(0, 0, width, height);
        g.lineStyle(2, COLORS.pulse, 0.22 * ambience);
        g.strokeCircle(center.x, center.y, focusRadius);
        g.lineStyle(4, COLORS.base, 0.08 * ambience);
        g.strokeCircle(center.x, center.y, focusRadius + 16);

        const hoverLink = edit.hoverLink ? this.links.find((link) => link.key === edit.hoverLink) : null;
        if (hoverLink) {
            const render = this.getLinkRenderPoints(hoverLink);
            const from = this.worldToScreen(render.fromX, render.fromY);
            const to = this.worldToScreen(render.toX, render.toY);
            g.lineStyle(clamp(5 * this.cameraRig.zoom, 2, 6), COLORS.inverse, 0.68);
            g.lineBetween(from.x, from.y, to.x, to.y);
        }

        if (edit.selectedNode >= 0) {
            const selected = this.activeNodes.find((node) => node.index === edit.selectedNode);
            if (selected) {
                const selectedPos = this.worldToScreen(selected.displayX, selected.displayY);
                const pulse = 20 + Math.sin(this.worldTime * 10) * 4;
                g.lineStyle(3, COLORS.pulse, 0.9);
                g.strokeCircle(selectedPos.x, selectedPos.y, clamp(pulse * this.cameraRig.zoom, 10, 26));
                if (edit.active && edit.dragNode < 0) {
                    const pointerWorld = this.getPointerWorld();
                    const pointerPos = this.worldToScreen(pointerWorld.x, pointerWorld.y);
                    g.lineStyle(2, COLORS.base, 0.55);
                    g.lineBetween(selectedPos.x, selectedPos.y, pointerPos.x, pointerPos.y);
                }
            }
        }

        if (edit.hoverNode >= 0) {
            const hovered = this.activeNodes.find((node) => node.index === edit.hoverNode);
            if (hovered) {
                const hoveredPos = this.worldToScreen(hovered.displayX, hovered.displayY);
                g.lineStyle(3, COLORS.base, 0.9);
                g.strokeCircle(hoveredPos.x, hoveredPos.y, clamp(18 * this.cameraRig.zoom, 9, 20));
            }
        }

        if (edit.deleteNode >= 0) {
            const target = this.activeNodes.find((node) => node.index === edit.deleteNode);
            if (target) {
                const targetPos = this.worldToScreen(target.displayX, target.displayY);
                const radius = clamp(26 * this.cameraRig.zoom, 12, 28);
                g.lineStyle(4, COLORS.shadow, 0.6);
                g.strokeCircle(targetPos.x, targetPos.y, radius);
                g.lineStyle(4, COLORS.inverse, 0.95);
                g.beginPath();
                g.arc(targetPos.x, targetPos.y, radius, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * edit.deleteProgress, false);
                g.strokePath();
            }
        }
    }
}

const config = {
    type: Phaser.AUTO,
    backgroundColor: '#071017',
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: window.innerWidth,
        height: window.innerHeight
    },
    scene: [CoreDemoScene]
};

new Phaser.Game(config);
