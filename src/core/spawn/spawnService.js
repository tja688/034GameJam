const SpawnService = {
    resolveFactory(moduleDefinition) {
        if (!moduleDefinition?.factory) {
            return null;
        }
        if (typeof moduleDefinition.factory === 'function') {
            return moduleDefinition.factory;
        }
        return moduleDefinition.factory.spawn || moduleDefinition.factory.apply || null;
    },
    spawn(scene, request = {}) {
        const moduleDefinition = ModuleRegistry.get(request.moduleId || '');
        const factory = this.resolveFactory(moduleDefinition);
        if (!moduleDefinition || typeof factory !== 'function') {
            console.warn(`Unknown module "${request.moduleId || ''}"`);
            return null;
        }

        return factory({
            scene,
            state: scene.sessionState,
            request,
            moduleDefinition,
            presetName: request.preset || moduleDefinition.playground?.defaultPreset || 'default',
            overrides: request.overrides || {}
        });
    },
    spawnBatch(scene, spawnList = []) {
        return spawnList.map((request) => this.spawn(scene, request)).filter(Boolean);
    },
    clearPlayground(scene, keepPlayer = true) {
        scene.clearActivePreyChases?.('spawn-service-clear');
        scene.prey = [];
        scene.effects = [];
        scene.fragments = [];
        scene.pendingDevourRewards = [];
        scene.pendingLootRewardSources = {};
        if (!keepPlayer) {
            this.spawn(scene, {
                moduleId: 'player.cluster',
                preset: 'debug-default',
                x: 0,
                y: 0
            });
        }
    }
};

window.SpawnService = SpawnService;
