const SchoolPreyPlayground = {
    label: 'Prey / School',
    searchTerms: ['prey', 'school', 'swarm', 'pack'],
    defaultPreset: 'pack',
    inspectFields: [
        { key: 'health', label: 'Health', type: 'number', step: 1 },
        { key: 'schoolRadius', label: 'School Radius', type: 'number', step: 5 },
        { key: 'behaviorState', label: 'Behavior', type: 'enum', options: ['schooling', 'alert', 'evade', 'burst', 'recover'] },
        { key: 'remove', label: '移除', type: 'action', action: 'remove' }
    ]
};

window.SchoolPreyPlayground = SchoolPreyPlayground;
