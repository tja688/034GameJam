const BulwarkPreyPresets = {
    default: { ...BulwarkPreyConfig },
    basic: { id: 'basic', archetype: 'bulwark', behaviorId: 'elite-rect', sizeKey: 'medium', shape: 'rect', compressionNeed: 0.24 },
    heavy: { id: 'heavy', archetype: 'bulwark', behaviorId: 'elite-rect', sizeKey: 'large', shape: 'rect', radiusMul: 1.12, healthMul: 1.3, compressionNeed: 0.34 },
    objective: { id: 'objective', archetype: 'bulwark', behaviorId: 'elite-rect', sizeKey: 'large', shape: 'rect', isObjective: true, radiusMul: 1.28, healthMul: 1.5, compressionNeed: 0.4 }
};

window.BulwarkPreyPresets = BulwarkPreyPresets;
