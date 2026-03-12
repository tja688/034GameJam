const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { performance } = require('perf_hooks');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_FILES = [
    'src/utils.js',
    'src/constants.js',
    'src/sceneTopology.js',
    'src/sceneInit.js',
    'src/sceneProgression.js',
    'src/sceneInput.js',
    'src/sceneMovement.js',
    'src/sceneCombat.js',
    'src/sceneEnemies.js'
];

function createSeededRandom(seed = 3434) {
    let state = seed >>> 0;
    return () => {
        state += 0x6d2b79f5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function wrapAngle(angle) {
    let wrapped = angle;
    while (wrapped <= -Math.PI) {
        wrapped += Math.PI * 2;
    }
    while (wrapped > Math.PI) {
        wrapped -= Math.PI * 2;
    }
    return wrapped;
}

let seededRandom = null;
function resetSeededRandom(seed = 3434) {
    seededRandom = createSeededRandom(seed);
    Math.random = seededRandom;
}

resetSeededRandom();
global.performance = performance;
global.window = {
    TUNING: JSON.parse(fs.readFileSync(path.join(ROOT, 'tuning-profile.json'), 'utf8')),
    CORE_DEMO_DEBUG: false
};
global.Phaser = {
    Math: {
        Linear: (a, b, t) => a + (b - a) * t,
        FloatBetween: (a, b) => a + (b - a) * Math.random(),
        Between: (a, b) => Math.floor(a + (b - a + 1) * Math.random()),
        Angle: {
            Wrap: wrapAngle,
            RotateTo(current, target, maxDelta) {
                const delta = wrapAngle(target - current);
                if (Math.abs(delta) <= maxDelta) {
                    return target;
                }
                return current + Math.sign(delta) * maxDelta;
            }
        }
    },
    Utils: {
        Array: {
            GetRandom(items) {
                return items[Math.floor(Math.random() * items.length)];
            }
        }
    },
    Input: {
        Keyboard: {
            JustDown() {
                return false;
            }
        }
    },
    Display: {
        Color: {
            ValueToColor(value) {
                return {
                    r: (value >> 16) & 0xff,
                    g: (value >> 8) & 0xff,
                    b: value & 0xff
                };
            },
            Interpolate: {
                ColorWithColor(from, to, steps, step) {
                    const t = steps <= 0 ? 0 : step / steps;
                    return {
                        r: Math.round(from.r + (to.r - from.r) * t),
                        g: Math.round(from.g + (to.g - from.g) * t),
                        b: Math.round(from.b + (to.b - from.b) * t)
                    };
                }
            },
            GetColor(r, g, b) {
                return (r << 16) | (g << 8) | b;
            }
        }
    },
    Geom: {
        Point: class Point {
            constructor(x, y) {
                this.x = x;
                this.y = y;
            }
        }
    }
};

SOURCE_FILES.forEach((file) => {
    const absolutePath = path.join(ROOT, file);
    vm.runInThisContext(fs.readFileSync(absolutePath, 'utf8'), { filename: absolutePath });
});

function createScene() {
    const scene = {
        scale: { width: 1920, height: 1080 },
        input: { activePointer: { x: 960, y: 540 } },
        keys: {
            up: { isDown: false },
            down: { isDown: false },
            left: { isDown: false },
            right: { isDown: false },
            shift: { isDown: false },
            ctrl: { isDown: false },
            undo: { isDown: false },
            restart: { isDown: false },
            cancel: { isDown: false },
            expand: { isDown: false },
            deleteAction: { isDown: false }
        },
        createRing() {},
        addScreenShake() {},
        refreshMenuState() {},
        getSavedGameData() { return null; },
        resumeGame() {},
        showMainMenu() {},
        exitEditMode() {},
        buildUi() {}
    };
    Object.assign(
        scene,
        SceneInitMixin,
        SceneProgressionMixin,
        SceneTopologyMixin,
        SceneInputMixin,
        SceneMovementMixin,
        SceneCombatMixin,
        SceneEnemiesMixin
    );

    const tuning = global.window.TUNING;
    const previousSpawn = tuning.gameplayPreySpawnEnabled;
    const previousInitial = tuning.gameplayPreyInitialSpawnEnabled;
    tuning.gameplayPreySpawnEnabled = false;
    tuning.gameplayPreyInitialSpawnEnabled = false;
    scene.resetSimulation(true);
    tuning.gameplayPreySpawnEnabled = previousSpawn;
    tuning.gameplayPreyInitialSpawnEnabled = previousInitial;

    scene.menuMode = null;
    scene.paused = false;
    scene.sessionStarted = true;
    scene.prey = [];
    scene.cameraRig.x = scene.player.centroidX;
    scene.cameraRig.y = scene.player.centroidY;
    return scene;
}

function setPointerWorld(scene, worldX, worldY) {
    scene.cameraRig.x = scene.player.centroidX;
    scene.cameraRig.y = scene.player.centroidY;
    scene.input.activePointer.x = (worldX - scene.cameraRig.x) * scene.cameraRig.zoom + scene.cameraRig.viewportWidth * 0.5;
    scene.input.activePointer.y = (worldY - scene.cameraRig.y) * scene.cameraRig.zoom + scene.cameraRig.viewportHeight * 0.5;
}

function getDriveRadii(scene) {
    const tuning = global.window.TUNING;
    const span = scene.getIntentDriveSpan();
    return {
        inner: Math.max(tuning.driveInnerRadiusMin ?? 76, span * (tuning.driveInnerRadiusFactor ?? 0.26)),
        middle: Math.max(tuning.driveMiddleRadiusMin ?? 170, span * (tuning.driveMiddleRadiusFactor ?? 0.72)),
        outer: Math.max(tuning.driveOuterRadiusMin ?? 280, span * (tuning.driveOuterRadiusFactor ?? 1.18))
    };
}

function getHeadingVector(scene) {
    return vectorFromAngle(scene.player.heading);
}

function pointerForPhase(phase, elapsed) {
    return (scene) => {
        const radii = getDriveRadii(scene);
        const heading = getHeadingVector(scene);
        let distance = radii.middle;
        let angle = Math.atan2(heading.y, heading.x);

        if (phase === 'stable') {
            distance = radii.inner * 0.42;
        } else if (phase === 'cruise') {
            distance = radii.inner + (radii.middle - radii.inner) * 0.52;
        } else if (phase === 'pursuit') {
            distance = radii.middle + (radii.outer - radii.middle) * 0.56;
        } else if (phase === 'hunt') {
            distance = radii.outer + 140;
            angle += Math.sin(elapsed * 1.6) * 0.12;
        } else {
            const cycle = elapsed % 0.7;
            const burstRamp = cycle < 0.14 ? cycle / 0.14 : Math.max(0, 1 - (cycle - 0.14) / 0.56);
            distance = radii.outer + 120 + burstRamp * 240;
            angle += Math.sin(elapsed * 10.5) * 0.22;
        }

        return {
            x: scene.player.centroidX + Math.cos(angle) * distance,
            y: scene.player.centroidY + Math.sin(angle) * distance
        };
    };
}

function stepPlayer(scene, dt, pointerResolver) {
    const pointer = pointerResolver(scene);
    setPointerWorld(scene, pointer.x, pointer.y);
    scene.readIntent(dt);
    scene.worldTime += dt;
    scene.updatePulse(dt);
    scene.updateFormation(dt);
    scene.updatePlayerState(dt);
    scene.samplePlayerMobilityTelemetry(dt);
}

function growToCount(scene, targetCount) {
    const dt = 1 / 60;
    while (scene.activeNodes.length < targetCount) {
        const heading = getHeadingVector(scene);
        setPointerWorld(scene, scene.player.centroidX + heading.x * 220, scene.player.centroidY + heading.y * 220);
        scene.addDebugNode({ silent: true });
        for (let i = 0; i < 18; i += 1) {
            stepPlayer(scene, dt, pointerForPhase('cruise', i * dt));
        }
    }
}

function percentile(values, ratio) {
    if (!values.length) {
        return 0;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
    return sorted[index];
}

function average(values) {
    if (!values.length) {
        return 0;
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function measureMobility(nodeCount, phase) {
    const scene = createScene();
    growToCount(scene, nodeCount);
    const dt = 1 / 60;
    const warmupSteps = 180;
    const sampleSteps = 300;
    const speedSamples = [];
    const nodeSamples = [];
    const spanSamples = [];
    const compressionSamples = [];
    const expansionSamples = [];

    for (let step = 0; step < warmupSteps + sampleSteps; step += 1) {
        const elapsed = step * dt;
        stepPlayer(scene, dt, pointerForPhase(phase, elapsed));
        if (step < warmupSteps) {
            continue;
        }
        const current = scene.ecoTelemetry.player.current;
        speedSamples.push(current.centroidSpeed || 0);
        nodeSamples.push(current.nodeSpeed || 0);
        spanSamples.push(current.span || 0);
        compressionSamples.push(current.compression || 0);
        expansionSamples.push(current.expansion || 0);
    }

    return {
        nodeCount,
        phase,
        avgCentroidSpeed: average(speedSamples),
        p95CentroidSpeed: percentile(speedSamples, 0.95),
        avgNodeSpeed: average(nodeSamples),
        avgSpan: average(spanSamples),
        avgCompression: average(compressionSamples),
        avgExpansion: average(expansionSamples)
    };
}

function toMarkdown(results) {
    const lines = [];
    lines.push('# 集群追逃机能测量');
    lines.push('');
    lines.push('| 节点数 | 驱动相位 | 质心均速 | 质心 P95 | 节点均速 | 平均跨度 | 压缩 | 舒张 |');
    lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |');
    results.forEach((entry) => {
        lines.push(`| ${entry.nodeCount} | ${entry.phase} | ${entry.avgCentroidSpeed.toFixed(1)} | ${entry.p95CentroidSpeed.toFixed(1)} | ${entry.avgNodeSpeed.toFixed(1)} | ${entry.avgSpan.toFixed(1)} | ${entry.avgCompression.toFixed(2)} | ${entry.avgExpansion.toFixed(2)} |`);
    });
    return lines.join('\n');
}

function generateReport(nodeCounts = [6, 9, 13, 17, 22], phases = ['stable', 'cruise', 'pursuit', 'hunt', 'burst']) {
    resetSeededRandom();
    const results = [];
    nodeCounts.forEach((nodeCount) => {
        phases.forEach((phase) => {
            results.push(measureMobility(nodeCount, phase));
        });
    });
    return results;
}

if (require.main === module) {
    console.log(toMarkdown(generateReport()));
}

module.exports = {
    createScene,
    generateReport,
    measureMobility,
    pointerForPhase,
    setPointerWorld,
    stepPlayer,
    toMarkdown
};
