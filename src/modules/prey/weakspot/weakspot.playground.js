const WeakspotPreyPlayground = {
    label: 'Prey / Weakspot',
    searchTerms: ['prey', 'weakspot', 'angle', 'encircle'],
    defaultPreset: 'basic',
    inspectFields: [
        { key: 'health', label: 'Health', type: 'number', step: 1 },
        { key: 'encircleNeed', label: 'Encircle Need', type: 'number', step: 0.05 },
        { key: 'weakExpose', label: 'Weak Expose', type: 'number', step: 0.05 },
        { key: 'remove', label: '移除', type: 'action', action: 'remove' }
    ]
};

window.WeakspotPreyPlayground = WeakspotPreyPlayground;
