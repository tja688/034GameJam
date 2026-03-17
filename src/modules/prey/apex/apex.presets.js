const ApexPreyPresets = {
    default: { ...ApexPreyConfig },
    basic: { id: 'basic', archetype: 'apex', behaviorId: 'elite-brute', sizeKey: 'large', shape: 'triangle' },
    'objective-small': { id: 'objective-small', archetype: 'apex', behaviorId: 'elite-brute', sizeKey: 'large', shape: 'triangle', isObjective: true, radiusMul: 1.1, healthMul: 1.32 },
    'objective-large': { id: 'objective-large', archetype: 'apex', behaviorId: 'elite-brute', sizeKey: 'large', shape: 'triangle', isObjective: true, radiusMul: 1.28, healthMul: 1.68 },
    'support-pack': { id: 'support-pack', archetype: 'apex', behaviorId: 'elite-dart', sizeKey: 'medium', shape: 'dart', encircleNeed: 0.32 }
};

window.ApexPreyPresets = ApexPreyPresets;
