const SkittishPreyPresets = {
    default: { ...SkittishPreyConfig },
    basic: { id: 'basic', archetype: 'skittish', behaviorId: 'basic-runner', sizeKey: 'small', shape: 'triangle' },
    medium: { id: 'medium', archetype: 'skittish', behaviorId: 'basic-runner', sizeKey: 'medium', shape: 'triangle' },
    objective: { id: 'objective', archetype: 'skittish', behaviorId: 'basic-runner', sizeKey: 'large', shape: 'triangle', isObjective: true, radiusMul: 1.32, healthMul: 1.4 }
};

window.SkittishPreyPresets = SkittishPreyPresets;
