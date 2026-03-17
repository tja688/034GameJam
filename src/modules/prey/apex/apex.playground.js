const ApexPreyPlayground = {
    label: 'Prey / Apex',
    searchTerms: ['prey', 'apex', 'boss', 'pressure'],
    defaultPreset: 'basic',
    inspectFields: [
        { key: 'health', label: 'Health', type: 'number', step: 1 },
        { key: 'compressionNeed', label: 'Compression Need', type: 'number', step: 0.05 },
        { key: 'encircleNeed', label: 'Encircle Need', type: 'number', step: 0.05 },
        { key: 'remove', label: '移除', type: 'action', action: 'remove' }
    ]
};

window.ApexPreyPlayground = ApexPreyPlayground;
