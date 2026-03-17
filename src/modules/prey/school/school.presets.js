const SchoolPreyPresets = {
    default: { ...SchoolPreyConfig },
    pack: { id: 'pack', archetype: 'school', behaviorId: 'basic-school', sizeKey: 'small', shape: 'circle' },
    medium: { id: 'medium', archetype: 'school', behaviorId: 'basic-school', sizeKey: 'medium', shape: 'circle' },
    swarm: { id: 'swarm', archetype: 'school', behaviorId: 'basic-school', sizeKey: 'large', shape: 'circle', radiusMul: 1.18 }
};

window.SchoolPreyPresets = SchoolPreyPresets;
