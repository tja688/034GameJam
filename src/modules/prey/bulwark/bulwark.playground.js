const BulwarkPreyPlayground = {
    label: 'Prey / Bulwark',
    searchTerms: ['prey', 'bulwark', 'tank', 'compression'],
    defaultPreset: 'basic',
    inspectFields: [
        { key: 'health', label: 'Health', type: 'number', step: 1 },
        { key: 'compressionNeed', label: 'Compression Need', type: 'number', step: 0.05 },
        { key: 'behaviorState', label: 'Behavior', type: 'enum', options: ['graze', 'brace', 'recover', 'alert', 'evade'] },
        { key: 'remove', label: '移除', type: 'action', action: 'remove' }
    ]
};

window.BulwarkPreyPlayground = BulwarkPreyPlayground;
