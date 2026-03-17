const WeakspotPreyPresets = {
    default: { ...WeakspotPreyConfig },
    basic: { id: 'basic', archetype: 'weakspot', behaviorId: 'elite-spinner', sizeKey: 'medium', shape: 'square' },
    objective: { id: 'objective', archetype: 'weakspot', behaviorId: 'elite-spinner', sizeKey: 'large', shape: 'square', isObjective: true, radiusMul: 1.18, healthMul: 1.46 },
    agile: { id: 'agile', archetype: 'weakspot', behaviorId: 'elite-dart', sizeKey: 'medium', shape: 'dart', encircleNeed: 0.28 }
};

window.WeakspotPreyPresets = WeakspotPreyPresets;
