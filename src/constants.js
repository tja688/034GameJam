

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

const DEFAULT_BASE_CHAIN = [0, 2, 5, 4, 1, 7];

const STORAGE_KEYS = {
    saveSlot: 'bio-core-save-slot-1'
};

let TOPOLOGY_EDGE_UID = 1;
