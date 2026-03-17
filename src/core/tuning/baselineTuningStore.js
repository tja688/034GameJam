const BASELINE_TUNING_FILES = {
    movement: 'data/tuning/movement.base.json',
    gameplay: 'data/tuning/gameplay.base.json',
    camera: 'data/tuning/camera.base.json',
    debug: 'data/tuning/debug.base.json'
};

function classifyTuningBucket(key) {
    if (/^camera/i.test(key)) {
        return 'camera';
    }
    if (/^gameplay/i.test(key)) {
        return 'gameplay';
    }
    if (/^(debug|edit|display|audioDebug|fps|show)/i.test(key)) {
        return 'debug';
    }
    return 'movement';
}

const BaselineTuningStore = {
    split(tuning = window.TUNING || {}) {
        const buckets = {
            movement: {},
            gameplay: {},
            camera: {},
            debug: {}
        };

        Object.entries(tuning).forEach(([key, value]) => {
            const bucket = classifyTuningBucket(key);
            buckets[bucket][key] = value;
        });

        return buckets;
    },
    exportCurrentBaselines() {
        const buckets = this.split(window.TUNING || {});
        Object.entries(BASELINE_TUNING_FILES).forEach(([bucket, filePath]) => {
            writeRepoJson(filePath, buckets[bucket]);
        });
        return buckets;
    },
    loadAll() {
        const buckets = {};
        Object.entries(BASELINE_TUNING_FILES).forEach(([bucket, filePath]) => {
            buckets[bucket] = readRepoJson(filePath) || {};
        });
        return buckets;
    }
};

window.BASELINE_TUNING_FILES = BASELINE_TUNING_FILES;
window.BaselineTuningStore = BaselineTuningStore;
