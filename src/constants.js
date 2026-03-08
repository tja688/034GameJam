

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

const SAVE_DATA_VERSION = 3;

const STORAGE_KEYS = {
    saveSlot: 'bio-core-save-slot-red-structure-v1',
    legacySaveSlots: ['bio-core-save-slot-1']
};

let TOPOLOGY_EDGE_UID = 1;
let EXPERIMENTAL_RED_GROUP_UID = 1;
