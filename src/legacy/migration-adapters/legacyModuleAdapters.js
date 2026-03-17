const LEGACY_PREY_MODULE_META = {
    'prey.skittish': {
        normalizedArchetype: 'skittish',
        defaultBehaviorId: 'basic-runner',
        defaultTier: 'common',
        defaultEncounterClass: 'basic'
    },
    'prey.school': {
        normalizedArchetype: 'school',
        defaultBehaviorId: 'basic-school',
        defaultTier: 'common',
        defaultEncounterClass: 'basic'
    },
    'prey.bulwark': {
        normalizedArchetype: 'bulwark',
        defaultBehaviorId: 'elite-rect',
        defaultTier: 'elite',
        defaultEncounterClass: 'elite'
    },
    'prey.weakspot': {
        normalizedArchetype: 'weakspot',
        defaultBehaviorId: 'elite-spinner',
        defaultTier: 'elite',
        defaultEncounterClass: 'elite'
    },
    'prey.apex': {
        normalizedArchetype: 'apex',
        defaultBehaviorId: 'elite-brute',
        defaultTier: 'elite',
        defaultEncounterClass: 'elite'
    }
};

function mapNodeIdsToLibraryIndexes(chainIds = []) {
    return chainIds
        .map((nodeId) => NODE_LIBRARY.findIndex((entry) => entry.id === nodeId))
        .filter((index) => index >= 0);
}

const LegacyModuleAdapters = {
    resolvePreset(moduleDefinition, presetName, overrides = {}) {
        const preset = moduleDefinition?.presets?.[presetName] || moduleDefinition?.presets?.default || {};
        return {
            ...(moduleDefinition?.config || {}),
            ...preset,
            ...overrides
        };
    },
    inferPreyModuleId(prey) {
        if (!prey) {
            return 'prey.skittish';
        }
        switch (prey.archetype) {
            case 'school':
                return 'prey.school';
            case 'bulwark':
            case 'eliteRect':
                return 'prey.bulwark';
            case 'weakspot':
            case 'eliteSpinner':
                return 'prey.weakspot';
            case 'apex':
            case 'eliteBrute':
            case 'eliteDart':
                return 'prey.apex';
            default:
                return 'prey.skittish';
        }
    },
    spawnPlayerCluster(context) {
        const { scene, moduleDefinition, presetName, request, overrides } = context;
        const preset = this.resolvePreset(moduleDefinition, presetName, overrides);
        const chainIds = Array.isArray(preset.chainIds) && preset.chainIds.length > 0
            ? preset.chainIds
            : DEFAULT_BASE_CHAIN.map((poolIndex) => NODE_LIBRARY[poolIndex]?.id).filter(Boolean);
        const chain = mapNodeIdsToLibraryIndexes(chainIds);
        const nextChain = chain.length >= 3 ? chain : [...DEFAULT_BASE_CHAIN];
        const energyRatio = clamp(
            Number.isFinite(preset.energyRatio) ? preset.energyRatio : 0.78,
            0,
            1
        );
        const heading = Number.isFinite(preset.heading) ? preset.heading : -Math.PI * 0.5;

        scene.clearActivePreyChases?.('player-cluster-spawn');
        scene.baseChain = [...nextChain];
        scene.player = scene.createDefaultPlayer(nextChain);
        scene.player.moduleId = moduleDefinition.id;
        scene.player.modulePreset = preset.id || presetName;
        scene.player.heading = heading;
        scene.player.centroidX = Number.isFinite(request.x) ? request.x : Number.isFinite(preset.x) ? preset.x : 0;
        scene.player.centroidY = Number.isFinite(request.y) ? request.y : Number.isFinite(preset.y) ? preset.y : 0;
        scene.player.topology = scene.rebuildTopologyFromCurrentChain(true);
        scene.activeNodes = [];
        scene.links = [];
        scene.rebuildFormation(true);
        scene.runState.growthCursor = Math.max(0, Math.round(preset.growthCursor || 0));
        scene.player.growthBuffer = Math.max(0, preset.growthBuffer || 0);
        scene.player.nextGrowthCost = scene.getGrowthCostForNodeCount?.(scene.player.chain.length) || scene.player.nextGrowthCost;
        scene.syncPlayerEnergyCapacity?.(false);
        scene.player.energy = scene.player.maxEnergy * energyRatio;
        scene.player.energyDisplay = scene.player.energy;
        scene.player.energyGhost = scene.player.energy;
        return scene.player;
    },
    spawnPreyModule(context) {
        const { scene, moduleDefinition, presetName, request, overrides } = context;
        const preset = this.resolvePreset(moduleDefinition, presetName, overrides);
        const meta = LEGACY_PREY_MODULE_META[moduleDefinition.id] || LEGACY_PREY_MODULE_META['prey.skittish'];
        const spawnConfig = {
            id: preset.id || `${moduleDefinition.id}.${presetName}`,
            moduleId: moduleDefinition.id,
            speciesId: preset.speciesId || preset.id || moduleDefinition.id,
            behaviorId: preset.behaviorId || meta.defaultBehaviorId,
            archetype: preset.archetype || meta.normalizedArchetype,
            tier: preset.tier || meta.defaultTier,
            encounterClass: preset.encounterClass || meta.defaultEncounterClass,
            sizeKey: preset.sizeKey || 'small',
            shape: preset.shape || 'circle',
            color: preset.color,
            signalColor: preset.signalColor,
            speedMul: preset.speedMul,
            healthMul: preset.healthMul,
            yieldMul: preset.yieldMul,
            radiusMul: preset.radiusMul,
            energyBonus: preset.energyBonus,
            biomassBonus: preset.biomassBonus,
            progressBonus: preset.progressBonus,
            growthBonus: preset.growthBonus,
            sizeJitter: preset.sizeJitter,
            isObjective: preset.isObjective === true
        };

        const prey = scene.createPrey(spawnConfig, {
            x: Number.isFinite(request.x) ? request.x : preset.x,
            y: Number.isFinite(request.y) ? request.y : preset.y,
            isObjective: spawnConfig.isObjective,
            groupId: preset.groupId || ''
        });
        prey.moduleId = moduleDefinition.id;
        prey.modulePreset = preset.id || presetName;
        scene.prey.push(prey);
        return prey;
    },
    applySystemModule(context) {
        const { scene, moduleDefinition, presetName, overrides } = context;
        const preset = this.resolvePreset(moduleDefinition, presetName, overrides);
        if (moduleDefinition.id === 'camera.invasive') {
            const zoom = clamp(
                Number.isFinite(preset.zoom) ? preset.zoom : scene.cameraRig.manualZoom,
                window.TUNING?.cameraMinZoom ?? 0.03,
                window.TUNING?.cameraMaxZoom ?? 1.12
            );
            scene.cameraRig.manualZoom = zoom;
            scene.cameraRig.targetZoom = zoom;
            scene.cameraRig.zoom = zoom;
            scene.cameraRig.desiredZoom = zoom;
            scene.cameraRig.autoZoomEnabled = !!preset.autoZoom;
            return scene.cameraRig;
        }

        if (moduleDefinition.id === 'hud.main') {
            scene.debugState.overlayFlags.hudPreset = preset.id || presetName;
            scene.debugState.overlayFlags.hudCompact = !!preset.compact;
            return scene.debugState.overlayFlags;
        }

        if (moduleDefinition.id === 'progression.demo5stage') {
            const stageIndex = DEMO_STAGE_DEFS.findIndex((stage) => stage.id === (preset.stageId || 'forage'));
            scene.runState.stageIndex = stageIndex >= 0 ? stageIndex : 0;
            scene.runState.stageProgress = Math.max(0, preset.stageProgress || 0);
            scene.runState.totalProgress = Math.max(0, preset.totalProgress || 0);
            scene.runState.growthCursor = Math.max(0, preset.growthCursor || scene.runState.growthCursor || 0);
            scene.runState.objectiveSpawned = false;
            scene.runState.objectiveId = '';
            scene.syncSpawnTimersForStage?.(true);
            return scene.runState;
        }

        return null;
    }
};

window.LegacyModuleAdapters = LegacyModuleAdapters;
