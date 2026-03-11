

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
    triangle: { color: COLORS.triangle, speedMul: 1.16, accelMul: 1.18, massMul: 0.84, wander: 0.92, fleeMul: 1.16, pulseMul: 0.86, rotationMul: 1.28, yieldMul: 0.9 },
    square: { color: COLORS.square, speedMul: 0.82, accelMul: 0.78, massMul: 1.28, wander: 0.36, fleeMul: 0.8, pulseMul: 0.74, rotationMul: 0.62, yieldMul: 1.16 },
    circle: { color: COLORS.circle, speedMul: 0.94, accelMul: 0.92, massMul: 1.02, wander: 0.58, fleeMul: 0.96, pulseMul: 1.28, rotationMul: 0.84, yieldMul: 1.02 }
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
    skittish: {
        progressValue: 1.05,
        biomassValue: 1.12,
        energyValue: 8.8,
        speedMul: 1.18,
        accelMul: 1.14,
        fleeMul: 1.26,
        wanderMul: 1.08,
        armor: 0.04,
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
        progressValue: 0.86,
        biomassValue: 0.94,
        energyValue: 7.2,
        speedMul: 0.98,
        accelMul: 1.02,
        fleeMul: 0.96,
        wanderMul: 0.78,
        armor: 0.1,
        compressionNeed: 0,
        encircleNeed: 0,
        schoolRadius: 248,
        cohesion: 0.84,
        alignment: 0.72,
        separation: 0.58,
        weakArc: 0,
        weakExpose: 0.2,
        protectTurnRate: 0,
        bulwarkChargeRate: 0,
        bulwarkReleaseRate: 0,
        bulwarkPulse: 0
    },
    bulwark: {
        progressValue: 2.65,
        biomassValue: 2.35,
        energyValue: 18.4,
        speedMul: 0.72,
        accelMul: 0.74,
        fleeMul: 0.64,
        wanderMul: 0.24,
        armor: 0.72,
        compressionNeed: 0.4,
        encircleNeed: 0.2,
        schoolRadius: 0,
        cohesion: 0,
        alignment: 0,
        separation: 0,
        weakArc: 0,
        weakExpose: 0.08,
        protectTurnRate: 0,
        bulwarkChargeRate: 1.8,
        bulwarkReleaseRate: 1.3,
        bulwarkPulse: 1.08
    },
    weakspot: {
        progressValue: 3.1,
        biomassValue: 2.7,
        energyValue: 22.2,
        speedMul: 0.88,
        accelMul: 0.92,
        fleeMul: 0.84,
        wanderMul: 0.36,
        armor: 0.82,
        compressionNeed: 0.12,
        encircleNeed: 0.42,
        schoolRadius: 0,
        cohesion: 0,
        alignment: 0,
        separation: 0,
        weakArc: 0.96,
        weakExpose: 0.12,
        protectTurnRate: 2.7,
        bulwarkChargeRate: 0,
        bulwarkReleaseRate: 0,
        bulwarkPulse: 0
    },
    apex: {
        progressValue: 4.6,
        biomassValue: 4.1,
        energyValue: 34.5,
        speedMul: 0.94,
        accelMul: 0.96,
        fleeMul: 0.9,
        wanderMul: 0.18,
        armor: 0.9,
        compressionNeed: 0.32,
        encircleNeed: 0.5,
        schoolRadius: 0,
        cohesion: 0,
        alignment: 0,
        separation: 0,
        weakArc: 0.78,
        weakExpose: 0.1,
        protectTurnRate: 3.2,
        bulwarkChargeRate: 2.2,
        bulwarkReleaseRate: 1.45,
        bulwarkPulse: 1.24
    }
};

const DEMO_STAGE_DEFS = [
    {
        id: 'forage',
        progressGoal: 10.5,
        maxNodes: 9,
        metabolism: 5.1,
        spawnCap: 20,
        palette: {
            arena: 0x08141c,
            grid: 0x173643,
            mist: 0x1c5f76,
            pulse: 0x9defff,
            signal: 0xf4f0d7,
            threat: 0x7de977
        },
        growthSequence: ['source', 'shell-a', 'dart-a'],
        spawnRules: [
            { id: 'forage-runner', archetype: 'skittish', sizeKey: 'small', shape: 'triangle', desired: 7, interval: 0.56, packMin: 1, packMax: 2 },
            { id: 'forage-school', archetype: 'school', sizeKey: 'small', shape: 'circle', desired: 6, interval: 1.34, packMin: 3, packMax: 4 },
            { id: 'forage-hunter', archetype: 'skittish', sizeKey: 'medium', shape: 'triangle', desired: 1, interval: 2.9, packMin: 1, packMax: 1 }
        ],
        objective: {
            id: 'forage-core',
            archetype: 'skittish',
            sizeKey: 'large',
            shape: 'circle',
            color: 0xf4f0d7,
            energyBonus: 18,
            biomassBonus: 3.6,
            growthBonus: 1
        }
    },
    {
        id: 'bloom',
        progressGoal: 18,
        maxNodes: 13,
        metabolism: 5.9,
        spawnCap: 24,
        palette: {
            arena: 0x0b1614,
            grid: 0x24443b,
            mist: 0x3b7c62,
            pulse: 0x9effcf,
            signal: 0xffd147,
            threat: 0xff8b73
        },
        growthSequence: ['shell-b', 'compressor', 'prism', 'dart-a'],
        spawnRules: [
            { id: 'bloom-school', archetype: 'school', sizeKey: 'small', shape: 'circle', desired: 8, interval: 1.18, packMin: 3, packMax: 5 },
            { id: 'bloom-runner', archetype: 'skittish', sizeKey: 'small', shape: 'triangle', desired: 5, interval: 0.72, packMin: 1, packMax: 2 },
            { id: 'bloom-bulwark', archetype: 'bulwark', sizeKey: 'medium', shape: 'square', desired: 2, interval: 2.7, packMin: 1, packMax: 1 }
        ],
        objective: {
            id: 'bloom-bulwark-core',
            archetype: 'bulwark',
            sizeKey: 'large',
            shape: 'square',
            color: 0xffd147,
            energyBonus: 20,
            biomassBonus: 4.2,
            growthBonus: 1
        }
    },
    {
        id: 'encircle',
        progressGoal: 25,
        maxNodes: 17,
        metabolism: 6.8,
        spawnCap: 28,
        palette: {
            arena: 0x130f16,
            grid: 0x433347,
            mist: 0x8b4868,
            pulse: 0xffc5db,
            signal: 0xf4f0d7,
            threat: 0xff6d57
        },
        growthSequence: ['prism', 'blade', 'shell-a', 'compressor'],
        spawnRules: [
            { id: 'encircle-weakspot', archetype: 'weakspot', sizeKey: 'medium', shape: 'triangle', desired: 2, interval: 2.6, packMin: 1, packMax: 1 },
            { id: 'encircle-bulwark', archetype: 'bulwark', sizeKey: 'medium', shape: 'square', desired: 2, interval: 2.9, packMin: 1, packMax: 1 },
            { id: 'encircle-school', archetype: 'school', sizeKey: 'small', shape: 'circle', desired: 6, interval: 1.1, packMin: 3, packMax: 4 }
        ],
        objective: {
            id: 'encircle-crown',
            archetype: 'weakspot',
            sizeKey: 'large',
            shape: 'triangle',
            color: 0xf4f0d7,
            energyBonus: 22,
            biomassBonus: 4.8,
            growthBonus: 1
        }
    },
    {
        id: 'saturation',
        progressGoal: 34,
        maxNodes: 22,
        metabolism: 7.8,
        spawnCap: 34,
        palette: {
            arena: 0x16120d,
            grid: 0x57422a,
            mist: 0xd86d36,
            pulse: 0xffd8a8,
            signal: 0xf4f0d7,
            threat: 0xff5663
        },
        growthSequence: ['blade', 'prism', 'compressor', 'shell-b', 'dart-b'],
        spawnRules: [
            { id: 'saturation-school', archetype: 'school', sizeKey: 'small', shape: 'circle', desired: 8, interval: 0.98, packMin: 4, packMax: 6 },
            { id: 'saturation-bulwark', archetype: 'bulwark', sizeKey: 'medium', shape: 'square', desired: 3, interval: 2.2, packMin: 1, packMax: 1 },
            { id: 'saturation-weakspot', archetype: 'weakspot', sizeKey: 'medium', shape: 'triangle', desired: 3, interval: 2.36, packMin: 1, packMax: 1 }
        ],
        objective: {
            id: 'saturation-apex',
            archetype: 'apex',
            sizeKey: 'large',
            shape: 'circle',
            color: 0xf4f0d7,
            energyBonus: 28,
            biomassBonus: 6.5,
            growthBonus: 2
        }
    }
];

const DEFAULT_BASE_CHAIN = [0, 2, 5, 4, 1, 7];

const STORAGE_KEYS = {
    saveSlot: 'bio-core-save-slot-1'
};

let TOPOLOGY_EDGE_UID = 1;
