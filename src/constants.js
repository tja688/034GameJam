

const COLORS = {
    background: 0x071017,
    arena: 0x0d1e28,
    grid: 0x183242,
    pulse: 0xf4f0d7,
    base: 0x7de977,
    inverse: 0xff6d57,
    shield: 0xfff4bf,
    health: 0xff5663,
    triangle: 0xffd147,
    square: 0xff5d49,
    circle: 0x7de977,
    flesh: 0xff8b73,
    meat: 0xffb39d,
    gore: 0xff6c5e,
    energy: 0xf1ffd2,
    core: 0xf6f2df,
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

const NODE_COLORS_BY_SHAPE = {
    triangle: COLORS.triangle,
    square: COLORS.square,
    circle: COLORS.circle
};

const NODE_LIBRARY = [
    { id: 'source', shape: 'circle', polarity: 'base', role: 'source', color: NODE_COLORS_BY_SHAPE.circle },
    { id: 'compressor', shape: 'circle', polarity: 'inverse', role: 'compressor', color: NODE_COLORS_BY_SHAPE.circle },
    { id: 'shell-a', shape: 'square', polarity: 'base', role: 'shell', color: NODE_COLORS_BY_SHAPE.square },
    { id: 'shell-b', shape: 'square', polarity: 'base', role: 'shell', color: NODE_COLORS_BY_SHAPE.square },
    { id: 'prism', shape: 'square', polarity: 'inverse', role: 'prism', color: NODE_COLORS_BY_SHAPE.square },
    { id: 'dart-a', shape: 'triangle', polarity: 'base', role: 'dart', color: NODE_COLORS_BY_SHAPE.triangle },
    { id: 'dart-b', shape: 'triangle', polarity: 'base', role: 'dart', color: NODE_COLORS_BY_SHAPE.triangle },
    { id: 'blade', shape: 'triangle', polarity: 'inverse', role: 'blade', color: NODE_COLORS_BY_SHAPE.triangle }
];

const PREY_SHAPE_DEFS = {
    triangle: { color: COLORS.triangle, speedMul: 1.12, accelMul: 1.14, massMul: 0.84, wander: 0.78, fleeMul: 1.1, pulseMul: 0.86, rotationMul: 1.26, yieldMul: 0.92 },
    square: { color: COLORS.square, speedMul: 0.84, accelMul: 0.8, massMul: 1.26, wander: 0.34, fleeMul: 0.82, pulseMul: 0.74, rotationMul: 0.62, yieldMul: 1.14 },
    circle: { color: COLORS.circle, speedMul: 0.96, accelMul: 0.94, massMul: 1.02, wander: 0.56, fleeMul: 0.98, pulseMul: 1.26, rotationMul: 0.84, yieldMul: 1.02 },
    rect: { color: COLORS.base, speedMul: 1.02, accelMul: 0.96, massMul: 1.08, wander: 0.28, fleeMul: 0.94, pulseMul: 0.82, rotationMul: 0.56, yieldMul: 1.08 },
    dart: { color: COLORS.triangle, speedMul: 1.08, accelMul: 1.06, massMul: 0.78, wander: 0.7, fleeMul: 1.18, pulseMul: 1.08, rotationMul: 1.42, yieldMul: 1 }
};

const PREY_SIZE_DEFS = {
    small: {
        radius: 18,
        maxHealth: 14,
        speed: 118,
        accel: 184,
        mass: 0.72,
        maxAnchors: 1,
        chunkBurst: 3,
        yield: 1.1,
        breakBias: 1.34
    },
    medium: {
        radius: 28,
        maxHealth: 42,
        speed: 84,
        accel: 132,
        mass: 1.7,
        maxAnchors: 3,
        chunkBurst: 6,
        yield: 2.6,
        breakBias: 1
    },
    large: {
        radius: 42,
        maxHealth: 104,
        speed: 52,
        accel: 94,
        mass: 3.8,
        maxAnchors: 5,
        chunkBurst: 10,
        yield: 4.9,
        breakBias: 0.76
    }
};

const PREY_ARCHETYPE_DEFS = {
    basic: {
        progressValue: 0.72,
        biomassValue: 0.86,
        energyValue: 6.4,
        speedMul: 1,
        accelMul: 1,
        fleeMul: 1.08,
        wanderMul: 0.6,
        armor: 0.02,
        compressionNeed: 0,
        encircleNeed: 0,
        schoolRadius: 0,
        cohesion: 0,
        alignment: 0,
        separation: 0,
        weakArc: 0,
        weakExpose: 0.16,
        protectTurnRate: 0,
        bulwarkChargeRate: 0,
        bulwarkReleaseRate: 0,
        bulwarkPulse: 0
    },
    school: {
        progressValue: 0.68,
        biomassValue: 0.82,
        energyValue: 5.9,
        speedMul: 0.96,
        accelMul: 0.98,
        fleeMul: 1,
        wanderMul: 0.54,
        armor: 0.04,
        compressionNeed: 0,
        encircleNeed: 0,
        schoolRadius: 220,
        cohesion: 0.34,
        alignment: 0.3,
        separation: 0.44,
        weakArc: 0,
        weakExpose: 0.18,
        protectTurnRate: 0,
        bulwarkChargeRate: 0,
        bulwarkReleaseRate: 0,
        bulwarkPulse: 0
    },
    eliteRect: {
        progressValue: 2.1,
        biomassValue: 1.86,
        energyValue: 15.2,
        speedMul: 1,
        accelMul: 0.94,
        fleeMul: 0.9,
        wanderMul: 0.24,
        armor: 0.12,
        compressionNeed: 0.12,
        encircleNeed: 0,
        schoolRadius: 0,
        cohesion: 0,
        alignment: 0,
        separation: 0,
        weakArc: 0,
        weakExpose: 0.14,
        protectTurnRate: 0,
        bulwarkChargeRate: 0,
        bulwarkReleaseRate: 0,
        bulwarkPulse: 0
    },
    eliteSpinner: {
        progressValue: 2.8,
        biomassValue: 2.28,
        energyValue: 18.2,
        speedMul: 0.92,
        accelMul: 0.9,
        fleeMul: 0.86,
        wanderMul: 0.22,
        armor: 0.18,
        compressionNeed: 0.2,
        encircleNeed: 0.12,
        schoolRadius: 0,
        cohesion: 0,
        alignment: 0,
        separation: 0,
        weakArc: 0,
        weakExpose: 0.12,
        protectTurnRate: 0,
        bulwarkChargeRate: 0,
        bulwarkReleaseRate: 0,
        bulwarkPulse: 0
    },
    eliteBrute: {
        progressValue: 3.3,
        biomassValue: 2.96,
        energyValue: 23.4,
        speedMul: 0.76,
        accelMul: 0.8,
        fleeMul: 0.74,
        wanderMul: 0.16,
        armor: 0.24,
        compressionNeed: 0.26,
        encircleNeed: 0.12,
        schoolRadius: 0,
        cohesion: 0,
        alignment: 0,
        separation: 0,
        weakArc: 0,
        weakExpose: 0.1,
        protectTurnRate: 0,
        bulwarkChargeRate: 0,
        bulwarkReleaseRate: 0,
        bulwarkPulse: 0
    },
    eliteDart: {
        progressValue: 3.6,
        biomassValue: 2.78,
        energyValue: 24.8,
        speedMul: 1.06,
        accelMul: 1.04,
        fleeMul: 1.18,
        wanderMul: 0.62,
        armor: 0.08,
        compressionNeed: 0.12,
        encircleNeed: 0.36,
        schoolRadius: 0,
        cohesion: 0,
        alignment: 0,
        separation: 0,
        weakArc: 0,
        weakExpose: 0.18,
        protectTurnRate: 0,
        bulwarkChargeRate: 0,
        bulwarkReleaseRate: 0,
        bulwarkPulse: 0
    },
    objectiveOrb: {
        progressValue: 4.2,
        biomassValue: 3.2,
        energyValue: 28,
        speedMul: 0.78,
        accelMul: 0.8,
        fleeMul: 0.82,
        wanderMul: 0.12,
        armor: 0.16,
        compressionNeed: 0,
        encircleNeed: 0,
        schoolRadius: 0,
        cohesion: 0,
        alignment: 0,
        separation: 0,
        weakArc: 0,
        weakExpose: 0.2,
        protectTurnRate: 0,
        bulwarkChargeRate: 0,
        bulwarkReleaseRate: 0,
        bulwarkPulse: 0
    }
};

function createStageNodeTargets(entry, earlyExit, idealExit, overstay, max) {
    return { entry, earlyExit, idealExit, overstay, max };
}

function createDemoStageDef(config) {
    const nodeTargets = { ...config.nodeTargets };
    return {
        ...config,
        nodeTargets,
        progressGoal: Math.max(1, Math.round(nodeTargets.idealExit * 1.35)),
        maxNodes: nodeTargets.max,
        spawnRules: (config.spawnRules || []).map((rule) => ({
            tier: 'common',
            encounterClass: 'basic',
            ...rule
        })),
        eliteRules: (config.eliteRules || []).map((rule) => ({
            tier: 'elite',
            encounterClass: 'elite',
            ...rule
        })),
        objective: config.objective
            ? {
                encounterClass: 'objective',
                tier: 'objective',
                ...config.objective
            }
            : null
    };
}

const DEMO_STAGE_DEFS = [
    createDemoStageDef({
        id: 'forage',
        nodeTargets: createStageNodeTargets(6, 12, 16, 18, 20),
        objectiveRevealNodeCount: 10,
        objectiveRevealRatio: 0.5,
        growthEconomy: { costMul: 1, biomassMul: 1, growthEnergyMul: 1 },
        metabolism: 2.4,
        spawnCap: 52,
        palette: {
            arena: 0x08141c,
            grid: 0x173643,
            mist: 0x1c5f76,
            pulse: 0x9defff,
            signal: 0xf4f0d7,
            threat: 0x7de977
        },
        growthSequence: ['source', 'shell-a', 'dart-a', 'compressor'],
        spawnRules: [
            { id: 'forage-runner', speciesId: 'basic-runner', archetype: 'basic', sizeKey: 'small', shape: 'triangle', desired: 16, interval: 0.28, packMin: 4, packMax: 6, sizeJitter: 0.14 },
            { id: 'forage-school', speciesId: 'basic-school', archetype: 'school', sizeKey: 'small', shape: 'circle', desired: 12, interval: 0.58, packMin: 8, packMax: 12, sizeJitter: 0.12 }
        ],
        eliteRules: [
            { id: 'forage-rect', speciesId: 'elite-rect', behaviorId: 'elite-rect', archetype: 'eliteRect', sizeKey: 'medium', shape: 'rect', desired: 2, interval: 3.1, packMin: 1, packMax: 1, color: 0x9ddf8d, stageColorMix: 0.12, radiusMul: 1.55 }
        ],
        objective: {
            id: 'forage-objective',
            speciesId: 'objective-orb',
            behaviorId: 'objective-orb',
            archetype: 'objectiveOrb',
            sizeKey: 'large',
            shape: 'circle',
            color: COLORS.core,
            radiusMul: 1.56,
            energyBonus: 18,
            biomassBonus: 3.6,
            growthBonus: 1
        }
    }),
    createDemoStageDef({
        id: 'bloom',
        nodeTargets: createStageNodeTargets(16, 24, 30, 34, 36),
        objectiveRevealNodeCount: 22,
        objectiveRevealRatio: 0.52,
        growthEconomy: { costMul: 0.9, biomassMul: 1.18, growthEnergyMul: 1.08 },
        metabolism: 5.3,
        spawnCap: 34,
        palette: {
            arena: 0x0b1614,
            grid: 0x24443b,
            mist: 0x3b7c62,
            pulse: 0x9effcf,
            signal: 0xffd147,
            threat: 0xff8b73
        },
        growthSequence: ['shell-b', 'compressor', 'prism', 'dart-a', 'source'],
        spawnRules: [
            { id: 'bloom-school', speciesId: 'basic-school', archetype: 'school', sizeKey: 'small', shape: 'circle', desired: 8, interval: 1.04, packMin: 4, packMax: 6, sizeJitter: 0.14 },
            { id: 'bloom-runner', speciesId: 'basic-runner', archetype: 'basic', sizeKey: 'medium', shape: 'triangle', desired: 4, interval: 0.82, packMin: 2, packMax: 3, sizeJitter: 0.16 },
            { id: 'bloom-shell', speciesId: 'basic-shell', archetype: 'basic', sizeKey: 'medium', shape: 'square', desired: 3, interval: 1.52, packMin: 2, packMax: 3, sizeJitter: 0.12 }
        ],
        eliteRules: [
            { id: 'bloom-rect', speciesId: 'elite-rect', behaviorId: 'elite-rect', archetype: 'eliteRect', sizeKey: 'medium', shape: 'rect', desired: 1, interval: 6.8, packMin: 1, packMax: 1, color: 0x9ddf8d, stageColorMix: 0.16, radiusMul: 1.56 },
            { id: 'bloom-square', speciesId: 'elite-spinner', behaviorId: 'elite-spinner', archetype: 'eliteSpinner', sizeKey: 'medium', shape: 'square', desired: 1, interval: 7.4, packMin: 1, packMax: 1, color: 0xff8a64, stageColorMix: 0.14, radiusMul: 1.44 }
        ],
        objective: {
            id: 'bloom-objective',
            speciesId: 'objective-orb',
            behaviorId: 'objective-orb',
            archetype: 'objectiveOrb',
            sizeKey: 'large',
            shape: 'circle',
            color: COLORS.core,
            radiusMul: 1.6,
            energyBonus: 20,
            biomassBonus: 4.2,
            growthBonus: 1
        }
    }),
    createDemoStageDef({
        id: 'pressure',
        nodeTargets: createStageNodeTargets(30, 40, 48, 54, 58),
        objectiveRevealNodeCount: 36,
        objectiveRevealRatio: 0.5,
        growthEconomy: { costMul: 0.8, biomassMul: 1.4, growthEnergyMul: 1.18 },
        metabolism: 5.9,
        spawnCap: 44,
        palette: {
            arena: 0x12120e,
            grid: 0x4a4b2c,
            mist: 0x8f7f43,
            pulse: 0xffe0a3,
            signal: 0xf4f0d7,
            threat: 0xff8b73
        },
        growthSequence: ['shell-a', 'shell-b', 'compressor', 'prism', 'dart-b'],
        spawnRules: [
            { id: 'pressure-school', speciesId: 'basic-school', archetype: 'school', sizeKey: 'medium', shape: 'circle', desired: 7, interval: 1.12, packMin: 3, packMax: 4, sizeJitter: 0.16 },
            { id: 'pressure-runner', speciesId: 'basic-runner', archetype: 'basic', sizeKey: 'medium', shape: 'triangle', desired: 4, interval: 0.88, packMin: 2, packMax: 3, sizeJitter: 0.18 },
            { id: 'pressure-shell', speciesId: 'basic-shell', archetype: 'basic', sizeKey: 'medium', shape: 'square', desired: 4, interval: 1.46, packMin: 2, packMax: 3, sizeJitter: 0.14 }
        ],
        eliteRules: [
            { id: 'pressure-rect', speciesId: 'elite-rect', behaviorId: 'elite-rect', archetype: 'eliteRect', sizeKey: 'medium', shape: 'rect', desired: 1, interval: 7.2, packMin: 1, packMax: 1, color: 0x9ddf8d, stageColorMix: 0.18, radiusMul: 1.58 },
            { id: 'pressure-square', speciesId: 'elite-spinner', behaviorId: 'elite-spinner', archetype: 'eliteSpinner', sizeKey: 'medium', shape: 'square', desired: 1, interval: 8.2, packMin: 1, packMax: 1, color: 0xff8a64, stageColorMix: 0.16, radiusMul: 1.46 },
            { id: 'pressure-brute', speciesId: 'elite-brute', behaviorId: 'elite-brute', archetype: 'eliteBrute', sizeKey: 'large', shape: 'triangle', desired: 1, interval: 9.4, packMin: 1, packMax: 1, color: 0xffd147, stageColorMix: 0.12, radiusMul: 1.72 }
        ],
        objective: {
            id: 'pressure-objective',
            speciesId: 'objective-orb',
            behaviorId: 'objective-orb',
            archetype: 'objectiveOrb',
            sizeKey: 'large',
            shape: 'circle',
            color: COLORS.core,
            radiusMul: 1.64,
            energyBonus: 24,
            biomassBonus: 5.4,
            growthBonus: 1
        }
    }),
    createDemoStageDef({
        id: 'encircle',
        nodeTargets: createStageNodeTargets(48, 60, 72, 80, 84),
        objectiveRevealNodeCount: 56,
        objectiveRevealRatio: 0.48,
        growthEconomy: { costMul: 0.68, biomassMul: 1.66, growthEnergyMul: 1.3 },
        metabolism: 6.6,
        spawnCap: 56,
        palette: {
            arena: 0x130f16,
            grid: 0x433347,
            mist: 0x8b4868,
            pulse: 0xffc5db,
            signal: 0xf4f0d7,
            threat: 0xff6d57
        },
        growthSequence: ['prism', 'blade', 'shell-a', 'compressor', 'dart-a', 'source'],
        spawnRules: [
            { id: 'encircle-school', speciesId: 'basic-school', archetype: 'school', sizeKey: 'medium', shape: 'circle', desired: 6, interval: 1, packMin: 3, packMax: 5, sizeJitter: 0.18 },
            { id: 'encircle-runner', speciesId: 'basic-runner', archetype: 'basic', sizeKey: 'medium', shape: 'triangle', desired: 4, interval: 0.92, packMin: 2, packMax: 3, sizeJitter: 0.18 },
            { id: 'encircle-shell', speciesId: 'basic-shell', archetype: 'basic', sizeKey: 'medium', shape: 'square', desired: 4, interval: 1.4, packMin: 2, packMax: 3, sizeJitter: 0.15 }
        ],
        eliteRules: [
            { id: 'encircle-rect', speciesId: 'elite-rect', behaviorId: 'elite-rect', archetype: 'eliteRect', sizeKey: 'medium', shape: 'rect', desired: 1, interval: 7.6, packMin: 1, packMax: 1, color: 0x9ddf8d, stageColorMix: 0.2, radiusMul: 1.58 },
            { id: 'encircle-square', speciesId: 'elite-spinner', behaviorId: 'elite-spinner', archetype: 'eliteSpinner', sizeKey: 'medium', shape: 'square', desired: 1, interval: 8.4, packMin: 1, packMax: 1, color: 0xff8a64, stageColorMix: 0.18, radiusMul: 1.46 },
            { id: 'encircle-brute', speciesId: 'elite-brute', behaviorId: 'elite-brute', archetype: 'eliteBrute', sizeKey: 'large', shape: 'triangle', desired: 1, interval: 9.8, packMin: 1, packMax: 1, color: 0xffd147, stageColorMix: 0.14, radiusMul: 1.76 },
            { id: 'encircle-dart', speciesId: 'elite-dart', behaviorId: 'elite-dart', archetype: 'eliteDart', sizeKey: 'medium', shape: 'dart', desired: 1, interval: 9.2, packMin: 1, packMax: 1, color: 0x75d7ff, stageColorMix: 0.18, radiusMul: 1.5 }
        ],
        objective: {
            id: 'encircle-objective',
            speciesId: 'objective-orb',
            behaviorId: 'objective-orb',
            archetype: 'objectiveOrb',
            sizeKey: 'large',
            shape: 'circle',
            color: COLORS.core,
            radiusMul: 1.68,
            energyBonus: 28,
            biomassBonus: 6.2,
            growthBonus: 2
        }
    }),
    createDemoStageDef({
        id: 'saturation',
        nodeTargets: createStageNodeTargets(72, 88, 96, 100, 100),
        objectiveRevealNodeCount: 82,
        objectiveRevealRatio: 0.45,
        growthEconomy: { costMul: 0.56, biomassMul: 1.94, growthEnergyMul: 1.44 },
        metabolism: 7.4,
        spawnCap: 72,
        palette: {
            arena: 0x16120d,
            grid: 0x57422a,
            mist: 0xd86d36,
            pulse: 0xffd8a8,
            signal: 0xf4f0d7,
            threat: 0xff5663
        },
        growthSequence: ['blade', 'prism', 'compressor', 'shell-b', 'dart-b', 'source'],
        spawnRules: [
            { id: 'saturation-school', speciesId: 'basic-school', archetype: 'school', sizeKey: 'large', shape: 'circle', desired: 8, interval: 0.92, packMin: 4, packMax: 6, sizeJitter: 0.2 },
            { id: 'saturation-runner', speciesId: 'basic-runner', archetype: 'basic', sizeKey: 'medium', shape: 'triangle', desired: 5, interval: 0.84, packMin: 2, packMax: 4, sizeJitter: 0.18 },
            { id: 'saturation-shell', speciesId: 'basic-shell', archetype: 'basic', sizeKey: 'large', shape: 'square', desired: 4, interval: 1.32, packMin: 2, packMax: 3, sizeJitter: 0.16 }
        ],
        eliteRules: [
            { id: 'saturation-rect', speciesId: 'elite-rect', behaviorId: 'elite-rect', archetype: 'eliteRect', sizeKey: 'medium', shape: 'rect', desired: 1, interval: 8.2, packMin: 1, packMax: 1, color: 0x9ddf8d, stageColorMix: 0.22, radiusMul: 1.6 },
            { id: 'saturation-square', speciesId: 'elite-spinner', behaviorId: 'elite-spinner', archetype: 'eliteSpinner', sizeKey: 'medium', shape: 'square', desired: 1, interval: 8.9, packMin: 1, packMax: 1, color: 0xff8a64, stageColorMix: 0.2, radiusMul: 1.5 },
            { id: 'saturation-brute', speciesId: 'elite-brute', behaviorId: 'elite-brute', archetype: 'eliteBrute', sizeKey: 'large', shape: 'triangle', desired: 1, interval: 10.2, packMin: 1, packMax: 1, color: 0xffd147, stageColorMix: 0.16, radiusMul: 1.8 },
            { id: 'saturation-dart', speciesId: 'elite-dart', behaviorId: 'elite-dart', archetype: 'eliteDart', sizeKey: 'medium', shape: 'dart', desired: 1, interval: 9.6, packMin: 1, packMax: 1, color: 0x75d7ff, stageColorMix: 0.2, radiusMul: 1.52 }
        ],
        objective: {
            id: 'saturation-objective',
            speciesId: 'objective-orb',
            behaviorId: 'objective-orb',
            archetype: 'objectiveOrb',
            sizeKey: 'large',
            shape: 'circle',
            color: COLORS.core,
            radiusMul: 1.72,
            energyBonus: 34,
            biomassBonus: 8.4,
            growthBonus: 2
        }
    })
];

const DEFAULT_BASE_CHAIN = [0, 2, 5, 4, 1, 7];

const STORAGE_KEYS = {
    saveSlot: 'bio-core-save-slot-1',
    audioProfile: 'bio-core-audio-profile-v1',
    performanceLog: 'bio-core-performance-stutter-log-v1'
};

let TOPOLOGY_EDGE_UID = 1;
