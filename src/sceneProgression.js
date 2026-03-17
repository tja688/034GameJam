const SceneProgressionMixin = {
    createDefaultRunState() {
        return {
            stageIndex: 0,
            stageProgress: 0,
            totalProgress: 0,
            objectiveSpawned: false,
            objectiveId: '',
            spawnTimers: {},
            growthCursor: 0,
            stageFlash: 1,
            stageSignal: 0,
            objectivePulse: 0,
            growthPulse: 0,
            energyPulse: 0,
            energyGainPulse: 0,
            energyLossPulse: 0,
            energyBeat: 0,
            hudJolt: 0,
            lowEnergyPulse: 0,
            lowEnergyWarned: false,
            complete: false,
            completeTimer: 0,
            deathCause: '',
            stageChangedAt: 0
        };
    },
    isDebugToolsEnabled() {
        return window.CORE_DEMO_DEBUG !== false;
    },
    isInfiniteEnergyEnabled() {
        return !!window.TUNING?.gameplayInfiniteEnergy;
    },
    syncInfiniteEnergyState() {
        const tunedMaxEnergy = this.getPlayerMaxEnergyForNodeCount();
        this.player.maxEnergy = tunedMaxEnergy;
        this.player.energy = tunedMaxEnergy;
        this.player.energyDisplay = tunedMaxEnergy;
        this.player.energyGhost = tunedMaxEnergy;
        this.player.energyFlash = 0;
        this.player.energyDeltaFlash = 0;
        if (this.runState) {
            this.runState.lowEnergyPulse = 0;
        }
    },
    getRunTuningValue(key, fallback) {
        return getFiniteNumber(window.TUNING?.[key], fallback);
    },
    getRunTuningToggle(key, fallback = false) {
        const value = window.TUNING?.[key];
        return typeof value === 'boolean' ? value : fallback;
    },
    getPlayerNodeCount() {
        return this.activeNodes?.length || this.player.chain?.length || DEFAULT_BASE_CHAIN.length;
    },
    getPlayerMaxEnergyForNodeCount(nodeCount = this.getPlayerNodeCount()) {
        const baseEnergy = Math.max(1, this.getRunTuningValue('gameplayMaxEnergy', 100));
        const perNodeEnergy = Math.max(0, this.getRunTuningValue('gameplayMaxEnergyPerNode', 0));
        return baseEnergy + Math.max(0, nodeCount - DEFAULT_BASE_CHAIN.length) * perNodeEnergy;
    },
    syncPlayerEnergyCapacity(preserveRatioOnGrowth = true) {
        const nextMax = this.getPlayerMaxEnergyForNodeCount();
        const previousMaxRaw = Number.isFinite(this.player.maxEnergy) ? this.player.maxEnergy : nextMax;
        const previousMax = Math.max(1, previousMaxRaw);
        const currentEnergy = Number.isFinite(this.player.energy) ? this.player.energy : nextMax * 0.8;
        const currentRatio = clamp(currentEnergy / previousMax, 0, 1);

        this.player.maxEnergy = nextMax;
        this.player.energy = preserveRatioOnGrowth && nextMax > previousMax + 0.001
            ? clamp(currentRatio * nextMax, 0, nextMax)
            : clamp(currentEnergy, 0, nextMax);

        if (Number.isFinite(this.player.energyDisplay)) {
            this.player.energyDisplay = clamp(this.player.energyDisplay, 0, nextMax);
        }
        if (Number.isFinite(this.player.energyGhost)) {
            this.player.energyGhost = clamp(this.player.energyGhost, 0, nextMax);
        }
        return nextMax;
    },
    getEffectivePulseMetabolismRunnerCount(actualRunnerCount = Math.max(1, this.player.pulseRunners?.length || 1)) {
        const protectedRunners = Math.min(2, Math.max(1, actualRunnerCount));
        const overflowRunners = Math.max(0, actualRunnerCount - protectedRunners);
        const overflowMul = clamp(this.getRunTuningValue('gameplayPulseMetabolismExtraRunnerMul', 0.3), 0, 2);
        return protectedRunners + overflowRunners * overflowMul;
    },
    getEffectiveMetabolismNodeLoad(nodeCount = this.getPlayerNodeCount()) {
        const extraNodes = Math.max(0, nodeCount - DEFAULT_BASE_CHAIN.length);
        const softStart = Math.max(0, this.getRunTuningValue('gameplayMetabolismNodeSoftStart', 18));
        const overflowMul = clamp(this.getRunTuningValue('gameplayMetabolismNodeOverflowMul', 0.12), 0, 2);
        const linearNodes = Math.min(extraNodes, softStart);
        const overflowNodes = Math.max(0, extraNodes - softStart);
        return linearNodes + overflowNodes * overflowMul;
    },
    getStageCount() {
        return DEMO_STAGE_DEFS.length;
    },
    getStageScopedTuningValue(baseKey, stageId, fallback) {
        if (!stageId) {
            return fallback;
        }
        return this.getRunTuningValue(`${baseKey}__${stageId}`, fallback);
    },
    getBandScopedTuningValue(baseKey, band, fallback) {
        if (!band) {
            return fallback;
        }
        const bandKey = `${band.charAt(0).toUpperCase()}${band.slice(1)}`;
        return this.getRunTuningValue(`${baseKey}${bandKey}`, fallback);
    },
    getRuntimeStageNodeTargets(baseStage, maxNodesBonus = 0) {
        const baseNodes = DEFAULT_BASE_CHAIN.length;
        const targets = baseStage?.nodeTargets || {};
        const entry = Math.max(baseNodes, Math.round(this.getStageScopedTuningValue('gameplayStageNodeEntry', baseStage?.id, targets.entry ?? baseNodes)));
        const earlyExit = Math.max(entry, Math.round(this.getStageScopedTuningValue('gameplayStageNodeEarlyExit', baseStage?.id, targets.earlyExit ?? entry)));
        const idealExit = Math.max(earlyExit, Math.round(this.getStageScopedTuningValue('gameplayStageNodeIdealExit', baseStage?.id, targets.idealExit ?? earlyExit)));
        const overstay = Math.max(idealExit, Math.round(this.getStageScopedTuningValue('gameplayStageNodeOverstay', baseStage?.id, targets.overstay ?? idealExit)));
        const tunedMax = Math.max(overstay, Math.round(this.getStageScopedTuningValue('gameplayStageNodeMax', baseStage?.id, targets.max ?? overstay)));
        return {
            entry,
            earlyExit,
            idealExit,
            overstay,
            max: Math.max(overstay, tunedMax + maxNodesBonus)
        };
    },
    getStageGrowthEconomy(baseStage) {
        return {
            costMul: Math.max(0.1, this.getStageScopedTuningValue('gameplayStageGrowthCostMul', baseStage?.id, baseStage?.growthEconomy?.costMul ?? 1)),
            biomassMul: Math.max(0.1, this.getStageScopedTuningValue('gameplayStageGrowthBiomassMul', baseStage?.id, baseStage?.growthEconomy?.biomassMul ?? 1)),
            growthEnergyMul: Math.max(0.1, this.getStageScopedTuningValue('gameplayStageGrowthEnergyMul', baseStage?.id, baseStage?.growthEconomy?.growthEnergyMul ?? 1))
        };
    },
    getCurrentStageNodeBand(nodeCount = this.getPlayerNodeCount(), stage = this.getCurrentStageDef()) {
        const targets = stage?.nodeTargets;
        if (!targets) {
            return 'comfort';
        }
        if (nodeCount < targets.earlyExit) {
            return 'underweight';
        }
        if (nodeCount <= targets.idealExit) {
            return 'comfort';
        }
        if (nodeCount <= targets.overstay) {
            return 'heavy';
        }
        return 'oversized';
    },
    getCurrentStageCarryProfile(stage = this.getCurrentStageDef(), nodeCount = this.getPlayerNodeCount()) {
        const band = this.getCurrentStageNodeBand(nodeCount, stage);
        const densityFallbacks = { underweight: 1.1, comfort: 1, heavy: 0.82, oversized: 0.66 };
        const yieldFallbacks = { underweight: 1.06, comfort: 1, heavy: 0.86, oversized: 0.72 };
        return {
            band,
            densityMul: Math.max(
                0.2,
                this.getStageScopedTuningValue('gameplayStageCommonCarryDensity', stage?.id, 1)
                * this.getBandScopedTuningValue('gameplayCarryDensity', band, densityFallbacks[band] ?? 1)
            ),
            yieldMul: Math.max(
                0.2,
                this.getStageScopedTuningValue('gameplayStageCommonCarryYield', stage?.id, 1)
                * this.getBandScopedTuningValue('gameplayCarryYield', band, yieldFallbacks[band] ?? 1)
            )
        };
    },
    getStageEncounterProfile(stage = this.getCurrentStageDef(), nodeCount = this.getPlayerNodeCount()) {
        const band = this.getCurrentStageNodeBand(nodeCount, stage);
        const basicBase = {
            size: Math.max(0.2, this.getRunTuningValue('gameplayBasicGlobalSizeMul', 1) * this.getStageScopedTuningValue('gameplayStageBasicSize', stage?.id, 1)),
            health: Math.max(0.2, this.getRunTuningValue('gameplayBasicGlobalHealthMul', 1) * this.getStageScopedTuningValue('gameplayStageBasicHealth', stage?.id, 1)),
            speed: Math.max(0.2, this.getRunTuningValue('gameplayBasicGlobalSpeedMul', 1) * this.getStageScopedTuningValue('gameplayStageBasicSpeed', stage?.id, 1)),
            yield: Math.max(0.2, this.getRunTuningValue('gameplayBasicGlobalYieldMul', 1) * this.getStageScopedTuningValue('gameplayStageBasicYield', stage?.id, 1))
        };
        const eliteSizeFallbacks = { underweight: 1.12, comfort: 1, heavy: 0.98, oversized: 0.94 };
        const eliteHealthFallbacks = { underweight: 1.15, comfort: 1, heavy: 1.04, oversized: 1 };
        const eliteSpeedFallbacks = { underweight: 1.06, comfort: 1, heavy: 1, oversized: 1 };
        const objectiveSizeFallbacks = { underweight: 1.06, comfort: 1, heavy: 1, oversized: 1 };
        const objectiveHealthFallbacks = { underweight: 1.08, comfort: 1, heavy: 1, oversized: 1 };
        const objectiveSpeedFallbacks = { underweight: 1, comfort: 1, heavy: 1, oversized: 1 };
        const eliteBase = {
            size: Math.max(0.2, this.getRunTuningValue('gameplayEliteGlobalSizeMul', 1) * this.getStageScopedTuningValue('gameplayStageEliteSize', stage?.id, 1)),
            health: Math.max(0.2, this.getRunTuningValue('gameplayEliteGlobalHealthMul', 1) * this.getStageScopedTuningValue('gameplayStageEliteHealth', stage?.id, 1)),
            speed: Math.max(0.2, this.getRunTuningValue('gameplayEliteGlobalSpeedMul', 1) * this.getStageScopedTuningValue('gameplayStageEliteSpeed', stage?.id, 1)),
            yield: Math.max(0.2, this.getRunTuningValue('gameplayEliteGlobalYieldMul', 1))
        };
        const objectiveBase = {
            size: Math.max(0.2, this.getRunTuningValue('gameplayObjectiveGlobalSizeMul', 1) * this.getStageScopedTuningValue('gameplayStageObjectiveSize', stage?.id, 1)),
            health: Math.max(0.2, this.getRunTuningValue('gameplayObjectiveGlobalHealthMul', 1) * this.getStageScopedTuningValue('gameplayStageObjectiveHealth', stage?.id, 1)),
            speed: Math.max(0.2, this.getRunTuningValue('gameplayObjectiveGlobalSpeedMul', 1) * this.getStageScopedTuningValue('gameplayStageObjectiveSpeed', stage?.id, 1)),
            yield: Math.max(0.2, this.getRunTuningValue('gameplayObjectiveGlobalYieldMul', 1))
        };
        const eliteBand = {
            size: this.getBandScopedTuningValue('gameplayEliteBandSize', band, eliteSizeFallbacks[band] ?? 1),
            health: this.getBandScopedTuningValue('gameplayEliteBandHealth', band, eliteHealthFallbacks[band] ?? 1),
            speed: this.getBandScopedTuningValue('gameplayEliteBandSpeed', band, eliteSpeedFallbacks[band] ?? 1)
        };
        const objectiveBand = {
            size: this.getBandScopedTuningValue('gameplayObjectiveBandSize', band, objectiveSizeFallbacks[band] ?? 1),
            health: this.getBandScopedTuningValue('gameplayObjectiveBandHealth', band, objectiveHealthFallbacks[band] ?? 1),
            speed: this.getBandScopedTuningValue('gameplayObjectiveBandSpeed', band, objectiveSpeedFallbacks[band] ?? 1)
        };
        return {
            band,
            basic: {
                sizeMul: basicBase.size,
                healthMul: basicBase.health,
                speedMul: basicBase.speed,
                yieldMul: basicBase.yield
            },
            elite: {
                sizeMul: eliteBase.size * eliteBand.size,
                healthMul: eliteBase.health * eliteBand.health,
                speedMul: eliteBase.speed * eliteBand.speed,
                yieldMul: eliteBase.yield
            },
            objective: {
                sizeMul: objectiveBase.size * eliteBand.size * objectiveBand.size,
                healthMul: objectiveBase.health * eliteBand.health * objectiveBand.health,
                speedMul: objectiveBase.speed * eliteBand.speed * objectiveBand.speed,
                yieldMul: objectiveBase.yield
            }
        };
    },
    getPreySpawnTierAdjustment(spawnConfig, isObjective = false, stage = this.getCurrentStageDef(), nodeCount = this.getPlayerNodeCount()) {
        const encounterClass = isObjective
            ? 'objective'
            : (spawnConfig?.encounterClass || (spawnConfig?.tier === 'elite' ? 'elite' : 'basic'));
        const encounter = this.getStageEncounterProfile(stage, nodeCount);
        const scoped = encounter[encounterClass] || encounter.basic;
        return {
            band: encounter.band,
            tier: encounterClass === 'basic' ? 'common' : encounterClass,
            encounterClass,
            sizeMul: scoped.sizeMul,
            healthMul: scoped.healthMul,
            speedMul: scoped.speedMul,
            yieldMul: scoped.yieldMul
        };
    },
    getCurrentStageObjectiveRevealProgress(stage = this.getCurrentStageDef()) {
        if (!stage) {
            return 0;
        }
        return Math.max(1, (stage.progressGoal || 1) * clamp(stage.objectiveRevealRatio || 1, 0.1, 1));
    },
    getCurrentStageDef() {
        const stageIndex = this.runState
            ? clamp(this.runState.stageIndex || 0, 0, DEMO_STAGE_DEFS.length - 1)
            : 0;
        const baseStage = DEMO_STAGE_DEFS[stageIndex];
        const spawnDensityMul = Math.max(0.25, this.getRunTuningValue('gameplayStageSpawnDensityMul', 1));
        const spawnIntervalMul = Math.max(0.25, this.getRunTuningValue('gameplayStageSpawnIntervalMul', 1));
        const spawnCapMul = Math.max(0.25, this.getRunTuningValue('gameplayStageSpawnCapMul', 1));
        const progressGoalMul = Math.max(0.25, this.getRunTuningValue('gameplayStageProgressGoalMul', 1));
        const metabolismMul = Math.max(0.25, this.getRunTuningValue('gameplayStageMetabolismMul', 1));
        const maxNodesBonus = Math.round(this.getRunTuningValue('gameplayStageMaxNodesBonus', 0));
        const nodeTargets = this.getRuntimeStageNodeTargets(baseStage, maxNodesBonus);
        const growthEconomy = this.getStageGrowthEconomy(baseStage);
        const progressGoalBase = Math.max(1, Math.round(nodeTargets.idealExit * 1.35));
        const objectiveRevealRatio = clamp(
            this.getStageScopedTuningValue('gameplayStageObjectiveRevealRatio', baseStage.id, baseStage.objectiveRevealRatio ?? 1),
            0.1,
            1
        );
        const objectiveRevealNodeCount = clamp(
            Math.round(
                this.getStageScopedTuningValue(
                    'gameplayStageObjectiveRevealNode',
                    baseStage.id,
                    baseStage.objectiveRevealNodeCount ?? nodeTargets.earlyExit
                )
            ),
            nodeTargets.entry,
            nodeTargets.max
        );

        const scaleRules = (rules = []) => rules.map((rule) => {
            const desired = Math.max(1, Math.round(rule.desired * spawnDensityMul));
            const packMin = Math.min(desired, Math.max(1, Math.round((rule.packMin || 1) * spawnDensityMul)));
            const packMaxBase = Math.max(rule.packMax || packMin, packMin);
            const packMax = Math.min(desired, Math.max(packMin, Math.round(packMaxBase * spawnDensityMul)));
            return {
                ...rule,
                desired,
                packMin,
                packMax,
                interval: Math.max(0.12, rule.interval * spawnIntervalMul)
            };
        });

        return {
            ...baseStage,
            nodeTargets,
            progressGoal: Math.max(1, progressGoalBase * progressGoalMul),
            maxNodes: nodeTargets.max,
            objectiveRevealRatio,
            objectiveRevealNodeCount,
            growthEconomy,
            metabolism: Math.max(0.1, baseStage.metabolism * metabolismMul),
            spawnCap: Math.max(1, Math.round(baseStage.spawnCap * spawnCapMul)),
            spawnRules: scaleRules(baseStage.spawnRules),
            eliteRules: scaleRules(baseStage.eliteRules),
            objective: baseStage.objective ? { ...baseStage.objective, tier: baseStage.objective.tier || 'objective' } : null
        };
    },
    getRunPalette() {
        if (this.isStartupSequenceActive?.()) {
            return STARTUP_SCENE_PALETTE;
        }
        return this.getCurrentStageDef()?.palette || {
            arena: COLORS.arena,
            grid: COLORS.grid,
            mist: COLORS.link,
            pulse: COLORS.pulse,
            signal: COLORS.core,
            threat: COLORS.health
        };
    },
    getStagePresentation(stageIndex = this.runState?.stageIndex || 0) {
        const normalizedIndex = clamp(stageIndex, 0, Math.max(0, DEMO_STAGE_DEFS.length - 1));
        const stage = DEMO_STAGE_DEFS[normalizedIndex] || null;
        return {
            stageIndex: normalizedIndex,
            stageId: stage?.id || '',
            palette: stage?.palette || this.getRunPalette()
        };
    },
    ensureRunProgressionState() {
        if (!this.runState) {
            this.runState = this.createDefaultRunState();
        }
        const tunedMaxEnergy = this.getPlayerMaxEnergyForNodeCount();
        this.player.maxEnergy = tunedMaxEnergy;
        if (!Number.isFinite(this.player.energy)) {
            this.player.energy = tunedMaxEnergy * 0.8;
        }
        this.syncPlayerEnergyCapacity(true);
        if (!Number.isFinite(this.player.growthBuffer)) {
            this.player.growthBuffer = 0;
        }
        if (!Number.isFinite(this.player.nextGrowthCost) || this.player.nextGrowthCost <= 0) {
            this.player.nextGrowthCost = this.getGrowthCostForNodeCount(this.activeNodes?.length || this.player.chain?.length || DEFAULT_BASE_CHAIN.length);
        }
        if (!Number.isFinite(this.player.metabolism)) {
            this.player.metabolism = 0;
        }
        if (!Number.isFinite(this.player.energyFlash)) {
            this.player.energyFlash = 0;
        }
        if (!Number.isFinite(this.player.energyDisplay)) {
            this.player.energyDisplay = this.player.energy;
        }
        if (!Number.isFinite(this.player.energyGhost)) {
            this.player.energyGhost = this.player.energy;
        }
        if (!Number.isFinite(this.player.energyDeltaFlash)) {
            this.player.energyDeltaFlash = 0;
        }
        if (this.isInfiniteEnergyEnabled()) {
            this.syncInfiniteEnergyState();
        }
    },
    resetRunProgression() {
        const maxEnergy = this.getPlayerMaxEnergyForNodeCount(this.player.chain?.length || DEFAULT_BASE_CHAIN.length);
        const startEnergyRatio = clamp(this.getRunTuningValue('gameplayStartEnergyRatio', 0.78), 0, 1);
        this.runState = this.createDefaultRunState();
        this.player.maxEnergy = maxEnergy;
        this.player.energy = maxEnergy * startEnergyRatio;
        this.player.growthBuffer = 0;
        this.player.nextGrowthCost = this.getGrowthCostForNodeCount(this.player.chain?.length || DEFAULT_BASE_CHAIN.length);
        this.player.metabolism = 0;
        this.player.energyFlash = 0;
        this.player.energyDisplay = this.player.energy;
        this.player.energyGhost = this.player.energy;
        this.player.energyDeltaFlash = 0;
        this.player.stagePulse = 0;
        this.player.victoryPulse = 0;
        if (this.isInfiniteEnergyEnabled()) {
            this.syncInfiniteEnergyState();
        }
        this.syncSpawnTimersForStage(true);
        this.populateStagePrey?.(true);
    },
    syncSpawnTimersForStage(forceReset = false) {
        this.ensureRunProgressionState();
        const stage = this.getCurrentStageDef();
        const timers = this.runState.spawnTimers || {};
        (this.getStageEncounterRules?.(stage) || stage.spawnRules || []).forEach((rule, index) => {
            if (forceReset || !Number.isFinite(timers[rule.id])) {
                timers[rule.id] = rule.interval * (0.2 + index * 0.08);
            }
        });
        this.runState.spawnTimers = timers;
    },
    getGrowthCostForNodeCount(nodeCount) {
        const baseCost = this.getRunTuningValue('gameplayGrowthCostBase', 3.2);
        const perNodeCost = this.getRunTuningValue('gameplayGrowthCostPerNode', 0.92);
        const cap = Math.max(1, this.getRunTuningValue('gameplayGrowthCostCap', 18));
        const stageCostMul = Math.max(0.1, this.getCurrentStageDef()?.growthEconomy?.costMul || 1);
        return Math.min(cap, (baseCost + Math.max(0, nodeCount - DEFAULT_BASE_CHAIN.length) * perNodeCost) * stageCostMul);
    },
    getEnergyRatio() {
        return clamp((this.player.energy || 0) / Math.max(1, this.player.maxEnergy || 100), 0, 1);
    },
    getGrowthRatio() {
        return clamp((this.player.growthBuffer || 0) / Math.max(0.0001, this.player.nextGrowthCost || 1), 0, 1);
    },
    getStageProgressRatio() {
        const stage = this.getCurrentStageDef();
        if (!stage) {
            return 0;
        }
        return clamp((this.runState?.stageProgress || 0) / Math.max(0.0001, stage.progressGoal || 1), 0, 1);
    },
    getObjectivePrey() {
        const objectiveId = this.runState?.objectiveId;
        if (!objectiveId) {
            return null;
        }
        return this.prey.find((entry) => entry.id === objectiveId) || null;
    },
    getPreyRuleSizeMultiplier(ruleId = '') {
        if (!ruleId) {
            return 1;
        }
        return Math.max(0.2, this.getRunTuningValue(`gameplayPreySize__${ruleId}`, 1));
    },
    getPreyVisualMultiplier(prey, spawnConfig) {
        const sizeKey = prey?.sizeKey || spawnConfig?.sizeKey || 'small';
        const sizeMul = sizeKey === 'large'
            ? this.getRunTuningValue('gameplayPreyLargeSizeMul', 1)
            : sizeKey === 'medium'
                ? this.getRunTuningValue('gameplayPreyMediumSizeMul', 1)
                : this.getRunTuningValue('gameplayPreySmallSizeMul', 1);
        const globalMul = this.getRunTuningValue('gameplayPreyGlobalSizeMul', 1);
        const ruleMul = this.getPreyRuleSizeMultiplier(spawnConfig?.id || prey?.spawnRuleId || '');
        return Math.max(0.2, globalMul * sizeMul * ruleMul);
    },
    getPreyYieldMultiplier(prey) {
        const visualScale = Math.max(0.25, prey?.visualScale || 1);
        const scaleYield = Math.max(0.65, Math.pow(visualScale, 0.32));
        return {
            energy: Math.max(0.1, this.getRunTuningValue('gameplayPreyEnergyYieldMul', 1) * scaleYield),
            biomass: Math.max(0.1, this.getRunTuningValue('gameplayPreyBiomassYieldMul', 1) * scaleYield),
            progress: Math.max(0.1, this.getRunTuningValue('gameplayPreyProgressYieldMul', 1) * Math.max(0.72, Math.pow(visualScale, 0.18)))
        };
    },
    getEncounterSpeciesStatMultiplier(speciesId, stat, fallback = 1) {
        if (!speciesId) {
            return fallback;
        }
        const suffix = stat.charAt(0).toUpperCase() + stat.slice(1);
        return Math.max(0.2, this.getRunTuningValue(`gameplaySpecies${suffix}__${speciesId}`, fallback));
    },
    pickEncounterSpawnColor(prey, spawnConfig, stage, encounterClass) {
        if (spawnConfig.color != null) {
            if (encounterClass === 'objective') {
                return spawnConfig.color;
            }
            const tintTarget = encounterClass === 'elite' ? stage.palette.threat : stage.palette.pulse;
            const tintWeight = clamp(spawnConfig.stageColorMix ?? (encounterClass === 'elite' ? 0.16 : 0.12), 0, 1);
            return tintWeight > 0 ? blendColor(spawnConfig.color, tintTarget, tintWeight) : spawnConfig.color;
        }

        if (encounterClass === 'basic') {
            const pool = [COLORS.base, COLORS.circle, COLORS.triangle, COLORS.square, COLORS.link];
            const base = pool[Math.floor((prey.seed || 0) * 10) % pool.length];
            return blendColor(base, stage.palette.pulse, 0.22);
        }

        return prey.color;
    },
    applySpawnConfigToPrey(prey, spawnConfig, groupId = '') {
        const stage = this.getCurrentStageDef();
        const speciesId = spawnConfig.speciesId || spawnConfig.id || spawnConfig.archetype || '';
        const archetype = PREY_ARCHETYPE_DEFS[spawnConfig.archetype] || PREY_ARCHETYPE_DEFS.basic;
        const spawnAdjustment = this.getPreySpawnTierAdjustment(spawnConfig, !!spawnConfig.isObjective, stage);
        const encounterClass = spawnAdjustment.encounterClass || (spawnConfig.isObjective ? 'objective' : spawnConfig.tier === 'elite' ? 'elite' : 'basic');
        const sizeFactor = prey.sizeKey === 'large' ? 1.95 : prey.sizeKey === 'medium' ? 1.35 : 1;
        const speciesSizeMul = this.getEncounterSpeciesStatMultiplier(speciesId, 'size', 1);
        const speciesHealthMul = this.getEncounterSpeciesStatMultiplier(speciesId, 'health', 1);
        const speciesSpeedMul = this.getEncounterSpeciesStatMultiplier(speciesId, 'speed', 1);
        const speciesYieldMul = this.getEncounterSpeciesStatMultiplier(speciesId, 'yield', 1);
        const jitterDefault = encounterClass === 'basic'
            ? this.getRunTuningValue('gameplayBasicSizeJitter', 0.18)
            : encounterClass === 'elite'
                ? this.getRunTuningValue('gameplayEliteSizeJitter', 0.08)
                : this.getRunTuningValue('gameplayObjectiveSizeJitter', 0.03);
        const sizeJitter = Math.max(0, spawnConfig.sizeJitter ?? jitterDefault);
        const sizeVariance = Phaser.Math.FloatBetween(Math.max(0.55, 1 - sizeJitter), 1 + sizeJitter);
        const classYieldMul = spawnAdjustment.yieldMul || 1;

        prey.archetype = spawnConfig.archetype;
        prey.spawnRuleId = spawnConfig.id || spawnConfig.archetype;
        prey.spawnTier = spawnAdjustment.tier;
        prey.spawnBand = spawnAdjustment.band;
        prey.encounterClass = encounterClass;
        prey.speciesId = speciesId;
        prey.behaviorId = spawnConfig.behaviorId || speciesId || encounterClass;
        prey.groupId = groupId;
        prey.isElite = encounterClass === 'elite';
        prey.isObjective = encounterClass === 'objective';
        prey.stageId = stage.id;
        prey.color = this.pickEncounterSpawnColor(prey, spawnConfig, stage, encounterClass);
        prey.baseColor = prey.color;
        prey.signalColor = spawnConfig.signalColor
            ?? (prey.isObjective
                ? COLORS.core
                : prey.isElite
                    ? blendColor(prey.color, stage.palette.signal, 0.36)
                    : blendColor(prey.color, stage.palette.pulse, 0.42));
        const visualScale = this.getPreyVisualMultiplier(prey, spawnConfig)
            * (spawnConfig.radiusMul ?? (prey.isObjective ? 1.08 : 1))
            * spawnAdjustment.sizeMul
            * speciesSizeMul
            * sizeVariance;
        prey.visualScale = visualScale;
        prey.radius *= visualScale;
        prey.baseRadius = prey.radius;
        prey.chunkBurst = Math.max(1, Math.round(prey.chunkBurst * Math.max(1, Math.pow(visualScale, 0.62))));
        prey.maxHealth *= spawnAdjustment.healthMul
            * speciesHealthMul
            * (spawnConfig.healthMul ?? 1)
            * Math.max(0.82, Math.pow(visualScale, encounterClass === 'basic' ? 0.88 : prey.isObjective ? 0.56 : 0.42));
        prey.health = prey.maxHealth;
        prey.speed *= archetype.speedMul * spawnAdjustment.speedMul * speciesSpeedMul * (spawnConfig.speedMul ?? 1);
        prey.accel *= archetype.accelMul * spawnAdjustment.speedMul * speciesSpeedMul * (spawnConfig.speedMul ?? 1);
        prey.fleeMul *= archetype.fleeMul;
        prey.wander *= archetype.wanderMul;
        prey.mass *= Math.max(0.8, Math.pow(visualScale, encounterClass === 'basic' ? 1.04 : 1.18)) * (spawnConfig.massMul ?? 1);
        prey.maxAnchors += Math.max(0, Math.round(spawnConfig.extraAnchors || 0));
        const yieldMul = this.getPreyYieldMultiplier(prey);
        prey.energyValue = (archetype.energyValue * sizeFactor + (spawnConfig.energyBonus || 0)) * yieldMul.energy * classYieldMul * speciesYieldMul * (spawnConfig.yieldMul ?? 1);
        prey.biomassValue = (archetype.biomassValue * sizeFactor + (spawnConfig.biomassBonus || 0)) * yieldMul.biomass * classYieldMul * speciesYieldMul * (spawnConfig.yieldMul ?? 1);
        prey.progressValue = (archetype.progressValue * sizeFactor + (spawnConfig.progressBonus || 0)) * yieldMul.progress * classYieldMul * speciesYieldMul * (spawnConfig.yieldMul ?? 1);
        prey.growthBonus = spawnConfig.growthBonus || 0;
        prey.armor = archetype.armor;
        prey.compressionNeed = archetype.compressionNeed;
        prey.encircleNeed = archetype.encircleNeed;
        prey.schoolRadius = archetype.schoolRadius;
        prey.schoolCohesion = archetype.cohesion;
        prey.schoolAlignment = archetype.alignment;
        prey.schoolSeparation = archetype.separation;
        prey.weakArc = archetype.weakArc;
        prey.weakAngle = Math.random() * Math.PI * 2;
        prey.weakExpose = archetype.weakExpose;
        prey.protectTurnRate = archetype.protectTurnRate;
        prey.bulwarkChargeRate = archetype.bulwarkChargeRate;
        prey.bulwarkReleaseRate = archetype.bulwarkReleaseRate;
        prey.bulwarkPulse = archetype.bulwarkPulse;
        prey.guardPulse = 0;
        prey.pushCharge = 0;
        prey.objectiveGlow = prey.isObjective ? 1 : prey.isElite ? 0.18 : 0;
        prey.pulseGain = prey.isObjective ? 0.68 : 0.18;
        prey.exposed = prey.isObjective ? Math.max(prey.exposed || 0, archetype.weakExpose + 0.04) : Math.max(prey.exposed || 0, archetype.weakExpose);
        prey.behaviorState = prey.isObjective
            ? 'objective'
            : prey.isElite
                ? 'elite'
                : prey.archetype === 'school'
                    ? 'schooling'
                    : 'graze';
        prey.behaviorStateTime = 0;
        prey.behaviorStateAge = 0;
        prey.fear = prey.isObjective ? 0.12 : 0;
        prey.alarm = 0;
        prey.stamina = 1;
        prey.burstTimer = 0;
        prey.recoverTimer = 0;
        prey.braceTimer = 0;
        prey.escapeAngle = Math.random() * Math.PI * 2;
        prey.escapeDirX = Math.cos(prey.escapeAngle);
        prey.escapeDirY = Math.sin(prey.escapeAngle);
        prey.behaviorTargetSpeed = prey.speed;
        prey.behaviorTargetAccel = prey.accel;
        prey.lastThreat = 0;
        prey.lastGapSpeed = 0;
        prey.groupAlarm = 0;
        prey.alertPulse = 0;
        prey.chaseStartedAt = 0;
        prey.locomotionState = prey.behaviorId === 'elite-rect' ? 'turn' : 'cruise';
        prey.locomotionTimer = Phaser.Math.FloatBetween(0.4, 1.2);
        prey.curveSign = Math.random() < 0.5 ? -1 : 1;
        prey.spinHazardActive = false;
        prey.spinCycleTimer = Phaser.Math.FloatBetween(0.6, 1.4);
        prey.objectivePulseTimer = Phaser.Math.FloatBetween(0.6, 1.2);
        prey.renderStretchX = (prey.renderStretchX || 1) * (spawnConfig.renderStretchX || 1);
        prey.renderStretchY = (prey.renderStretchY || 1) * (spawnConfig.renderStretchY || 1);
        this.notePreyStateTransition?.(prey, prey.behaviorState, {
            stateDuration: 0,
            threat: 0,
            force: true
        });
        return prey;
    },
    getCompressionAccess(prey, pressure) {
        const compression = clamp(this.intent?.centerCompression ?? this.clusterVolume?.compression ?? 0, 0, 1);
        const encircle = clamp(pressure?.encirclement || 0, 0, 1);
        const need = clamp(prey?.compressionNeed || 0, 0, 0.9);
        const encircleAssist = this.getRunTuningValue('gameplayCompressionEncircleAssist', 0.26);
        return clamp((compression - need + encircle * encircleAssist) / Math.max(0.08, 1 - need), 0, 1);
    },
    getWeakspotAccess(prey, node, pressure) {
        if (!prey || !(prey.weakArc > 0) || !node) {
            return 1;
        }

        const attackAngle = Math.atan2(node.y - prey.y, node.x - prey.x);
        const weakAngle = Number.isFinite(prey.weakAngle) ? prey.weakAngle : attackAngle;
        const angularAccess = 1 - clamp(angleDistance(attackAngle, weakAngle) / Math.max(0.0001, prey.weakArc), 0, 1);
        const encircle = clamp(pressure?.encirclement || 0, 0, 1);
        const compression = clamp(this.intent?.centerCompression ?? 0, 0, 1);
        const encircleAssist = this.getRunTuningValue('gameplayWeakspotEncircleAssist', 0.82);
        const compressionAssist = this.getRunTuningValue('gameplayWeakspotCompressionAssist', 0.18);
        return clamp(Math.max(angularAccess, encircle * encircleAssist + compression * compressionAssist), 0, 1);
    },
    getPreyDamageMultiplier(prey, node, attachment, pressure) {
        if (!prey) {
            return 1;
        }

        const encircle = clamp(pressure?.encirclement || 0, 0, 1);
        const compressionAccess = this.getCompressionAccess(prey, pressure);
        const weakAccess = this.getWeakspotAccess(prey, node, pressure);
        let multiplier = 1;

        if (prey.behaviorId === 'elite-spinner') {
            multiplier *= prey.spinHazardActive
                ? this.getRunTuningValue('gameplayEliteSpinnerSpinDamageMul', 0.72)
                : this.getRunTuningValue('gameplayEliteSpinnerRestDamageMul', 1.12);
        } else if (prey.behaviorId === 'elite-brute') {
            multiplier *= this.getRunTuningValue('gameplayEliteBruteBaseDamageMul', 0.82)
                + encircle * this.getRunTuningValue('gameplayEliteBruteEncircleDamageMul', 0.24)
                + clamp((pressure?.cutterCount || 0) / 4, 0, 1) * this.getRunTuningValue('gameplayEliteBruteCutterDamageMul', 0.26);
        } else if (prey.behaviorId === 'elite-dart') {
            multiplier *= this.getRunTuningValue('gameplayEliteDartBaseDamageMul', 0.68)
                + encircle * this.getRunTuningValue('gameplayEliteDartEncircleDamageMul', 0.54)
                + clamp((pressure?.pressure || 0) / 1.2, 0, 1) * this.getRunTuningValue('gameplayEliteDartPressureDamageMul', 0.3);
            if (attachment?.mode === 'feed' && encircle < this.getRunTuningValue('gameplayEliteDartFeedEncircleGate', 0.34)) {
                multiplier *= this.getRunTuningValue('gameplayEliteDartFeedPenalty', 0.52);
            }
        }

        if (prey.isObjective) {
            multiplier *= this.getRunTuningValue('gameplayObjectiveCutterBase', 0.92)
                + clamp((pressure?.cutterCount || 0) / 4, 0, 1) * this.getRunTuningValue('gameplayObjectiveCutterPerCount', 0.18);
        }

        return multiplier;
    },
    getPulseMetabolismPhaseMultiplier(phase) {
        switch (phase) {
            case 'stable':
                return this.getRunTuningValue('gameplayPulseStableMul', 1);
            case 'pursuit':
                return this.getRunTuningValue('gameplayPulsePursuitMul', 1);
            case 'hunt':
                return this.getRunTuningValue('gameplayPulseHuntMul', 1);
            case 'burst':
                return this.getRunTuningValue('gameplayPulseBurstMul', 1);
            default:
                return this.getRunTuningValue('gameplayPulseCruiseMul', 1);
        }
    },
    samplePlayerMotionIntensity() {
        if (!Array.isArray(this.activeNodes) || this.activeNodes.length === 0) {
            return 0;
        }
        let totalSpeed = 0;
        this.activeNodes.forEach((node) => {
            totalSpeed += Math.hypot(node.vx || 0, node.vy || 0);
        });
        return totalSpeed / this.activeNodes.length;
    },
    estimatePulseMetabolism(triggerCount = 1) {
        const stage = this.getCurrentStageDef();
        const nodeCount = this.getPlayerNodeCount();
        const actualRunnerCount = Math.max(1, this.player.pulseRunners?.length || 1);
        const effectiveRunnerCount = this.getEffectivePulseMetabolismRunnerCount(actualRunnerCount);
        const effectiveTriggerCount = Math.max(0, triggerCount) * effectiveRunnerCount / actualRunnerCount;
        if (effectiveTriggerCount <= 0) {
            return 0;
        }
        const baseCost = Math.max(0, this.getRunTuningValue('gameplayPulseMetabolismBase', 0.18));
        const floorCost = Math.max(0, this.getRunTuningValue('gameplayMetabolismFloor', 0.8)) * 0.04;
        const perStage = Math.max(0, this.getRunTuningValue('gameplayPulseMetabolismStageWeight', 0.038)) * Math.max(0, stage?.metabolism || 0);
        const perNode = Math.max(0, this.getRunTuningValue('gameplayMetabolismNodeWeight', 0.24)) * this.getEffectiveMetabolismNodeLoad(nodeCount) * 0.12;
        const motionNorm = clamp(
            this.samplePlayerMotionIntensity() / Math.max(1, this.getRunTuningValue('gameplayPulseMotionSpeedNorm', 85)),
            0,
            2.2
        );
        const pointerNorm = clamp(
            (this.intent?.burstPointerSpeed || 0) / Math.max(1, this.getRunTuningValue('gameplayPulsePointerSpeedNorm', 520)),
            0,
            2.4
        );
        const moveInput = clamp(this.intent?.moveLength || 0, 0, 1);
        const burstAggro = clamp(this.intent?.burstAggro || 0, 0, 1);
        const huntWeight = clamp(this.intent?.pointerDriveHuntWeight || 0, 0, 1.5);
        const expansion = clamp(this.clusterVolume?.expansion ?? Math.max(0, this.intent?.clusterVolume ?? 0), 0, 1.4);
        const compression = clamp(this.intent?.centerCompression ?? this.clusterVolume?.compression ?? 0, 0, 1);
        const predation = clamp(this.player.predationPressure || 0, 0, 1);
        const objectiveVisible = !!this.getObjectivePrey();
        const activity = 1
            + burstAggro * Math.max(0, this.getRunTuningValue('gameplayMetabolismBurstWeight', 2.45)) * 0.2
            + huntWeight * Math.max(0, this.getRunTuningValue('gameplayMetabolismHuntWeight', 1.28)) * 0.16
            + expansion * Math.max(0, this.getRunTuningValue('gameplayMetabolismExpansionWeight', 1.72)) * 0.2
            + motionNorm * Math.max(0, this.getRunTuningValue('gameplayPulseMetabolismMotionWeight', 0.58))
            + moveInput * Math.max(0, this.getRunTuningValue('gameplayPulseMetabolismMoveWeight', 0.24))
            + pointerNorm * Math.max(0, this.getRunTuningValue('gameplayPulseMetabolismPointerWeight', 0.28))
            + (objectiveVisible ? Math.max(0, this.getRunTuningValue('gameplayMetabolismObjectiveWeight', 0.5)) * 0.16 : 0);
        const relief = 1
            - compression * Math.max(0, this.getRunTuningValue('gameplayMetabolismCompressionRelief', 1.9)) * 0.18
            - predation * Math.max(0, this.getRunTuningValue('gameplayMetabolismPredationRelief', 0.55)) * 0.18;
        const phase = this.intent?.burstPhase || this.intent?.pointerDrivePhase || 'cruise';
        const phaseMul = this.getPulseMetabolismPhaseMultiplier(phase);
        return Math.max(0, (baseCost + floorCost + perStage + perNode) * Math.max(0.18, activity) * Math.max(0.18, relief) * phaseMul * effectiveTriggerCount);
    },
    consumePulseMetabolism(triggerCount = 1) {
        if (this.player.dead || this.runState?.complete || triggerCount <= 0) {
            return 0;
        }
        const drain = this.estimatePulseMetabolism(triggerCount);
        this.player.metabolism = drain;
        this.runState.energyBeat = Math.max(this.runState.energyBeat || 0, 0.24 + Math.min(0.9, triggerCount * 0.18));
        this.applyEnergyDelta(-drain, 0.1 + Math.min(0.3, triggerCount * 0.04), 'pulse');
        return drain;
    },
    applyEnergyDelta(amount, pulseBoost = 0, source = 'generic') {
        this.ensureRunProgressionState();
        if (this.isInfiniteEnergyEnabled()) {
            this.syncInfiniteEnergyState();
            return 0;
        }
        const previous = this.player.energy || 0;
        const maxEnergy = this.player.maxEnergy || 100;
        this.player.energy = clamp(previous + amount, 0, this.player.maxEnergy || 100);
        const applied = this.player.energy - previous;
        const overflow = Math.max(0, amount - applied);
        const wasFull = previous >= maxEnergy - 0.01;
        if (applied > 0) {
            this.player.energyFlash = clamp((this.player.energyFlash || 0) + applied * 0.024 + pulseBoost, 0, 2.6);
            this.runState.energyPulse = Math.max(this.runState.energyPulse || 0, 0.2 + pulseBoost);
            this.runState.energyGainPulse = Math.max(this.runState.energyGainPulse || 0, 0.16 + applied * 0.024 + pulseBoost);
            this.runState.hudJolt = Math.max(this.runState.hudJolt || 0, 0.12 + applied * 0.012);
            this.player.energyDeltaFlash = Math.max(this.player.energyDeltaFlash || 0, 0.1 + applied * 0.02);
            this.emitLivingEnergyBarEvent?.('gain', 0.12 + applied * 0.04 + pulseBoost * 0.6, { overflow, wasFull, source });
            if (source === 'devour' || source === 'objective' || source === 'fragment') {
                this.addScreenShake?.(Math.min(0.9, 0.08 + applied * 0.012), Math.min(1, 0.12 + applied * 0.015));
            }
        } else if (applied < 0) {
            const loss = Math.abs(applied);
            this.runState.energyLossPulse = Math.max(
                this.runState.energyLossPulse || 0,
                0.16 + loss * 0.022 + pulseBoost + (source === 'pulse' ? 0.06 : 0)
            );
            this.runState.hudJolt = Math.max(this.runState.hudJolt || 0, 0.1 + loss * 0.02 + (source === 'pulse' ? 0.08 : 0));
            this.player.energyDeltaFlash = Math.max(this.player.energyDeltaFlash || 0, 0.08 + loss * 0.028);
            this.emitLivingEnergyBarEvent?.('loss', 0.14 + loss * 0.05 + pulseBoost * 0.8, { source });
            if (source !== 'pulse') {
                this.addScreenShake?.(Math.min(0.7, 0.05 + loss * 0.01), Math.min(0.85, 0.08 + loss * 0.014));
            }
        } else if (amount > 0 && (overflow > 0 || wasFull)) {
            this.emitLivingEnergyBarEvent?.('overload', 0.16 + Math.max(amount, overflow) * 0.045 + pulseBoost * 0.6, { source });
        }
        return applied;
    },
    gainBiomass(amount) {
        this.ensureRunProgressionState();
        const stageBiomassMul = Math.max(0.1, this.getCurrentStageDef()?.growthEconomy?.biomassMul || 1);
        const applied = Math.max(0, amount) * stageBiomassMul;
        this.player.growthBuffer = (this.player.growthBuffer || 0) + applied;
        this.runState.growthPulse = Math.max(this.runState.growthPulse || 0, 0.16 + applied * 0.02);
        if (applied > 0) {
            this.emitLivingEnergyBarEvent?.('biomass', 0.08 + applied * 0.06);
        }
        return applied;
    },
    buildPreyDevourRewardPayload(prey) {
        if (!prey) {
            return null;
        }
        const rewardMul = (prey.spawnTier || '') === 'common'
            ? this.getCurrentStageCarryProfile()?.yieldMul || 1
            : 1;
        return {
            sourceId: prey.id,
            stageId: prey.stageId || '',
            isObjective: !!prey.isObjective,
            energyValue: (prey.energyValue || 0) * rewardMul,
            biomassValue: ((prey.biomassValue || 0) + (prey.growthBonus || 0)) * rewardMul,
            progressValue: (prey.progressValue || 0) * rewardMul
        };
    },
    ensureLootRewardSourceState() {
        if (!this.pendingLootRewardSources || typeof this.pendingLootRewardSources !== 'object') {
            this.pendingLootRewardSources = {};
        }
        return this.pendingLootRewardSources;
    },
    registerLootRewardSource(payload, shardCount) {
        if (!payload?.sourceId || shardCount <= 0) {
            return;
        }
        const sources = this.ensureLootRewardSourceState();
        sources[payload.sourceId] = {
            remaining: Math.max(1, Math.round(shardCount)),
            isObjective: !!payload.isObjective
        };
    },
    hasPendingObjectiveLoot(objectiveId = this.runState?.objectiveId) {
        if (!objectiveId) {
            return false;
        }
        const sources = this.ensureLootRewardSourceState();
        return (sources[objectiveId]?.remaining || 0) > 0;
    },
    resolveLootRewardSourceConsumption(sourceId) {
        if (!sourceId) {
            return;
        }
        const sources = this.ensureLootRewardSourceState();
        const source = sources[sourceId];
        if (!source) {
            return;
        }
        source.remaining = Math.max(0, (source.remaining || 0) - 1);
        if (source.remaining > 0) {
            return;
        }
        delete sources[sourceId];
        if (!source.isObjective) {
            return;
        }
        if (this.runState.objectiveId === sourceId) {
            this.runState.objectiveId = '';
        }
        this.runState.stageFlash = Math.max(this.runState.stageFlash || 0, 1.1);
        if ((this.runState.stageIndex || 0) >= this.getStageCount() - 1) {
            this.triggerVictory();
        } else {
            this.advanceStage();
        }
    },
    absorbFragment(fragment) {
        const rewardEnergy = Math.max(0, fragment.rewardEnergy || 0);
        const rewardBiomass = Math.max(0, fragment.rewardBiomass || 0);
        const rewardProgress = Math.max(0, fragment.rewardProgress || 0);
        const hasDistributedReward = rewardEnergy > 0
            || rewardBiomass > 0
            || rewardProgress > 0
            || !!fragment.rewardSourceId;
        if (hasDistributedReward) {
            if (rewardEnergy > 0) {
                this.applyEnergyDelta(
                    rewardEnergy,
                    fragment.rewardIsObjective ? Math.min(0.62, 0.2 + rewardEnergy * 0.03) : Math.min(0.34, 0.12 + rewardEnergy * 0.025),
                    fragment.rewardIsObjective ? 'objective' : 'fragment'
                );
            }
            if (rewardBiomass > 0) {
                this.gainBiomass(rewardBiomass);
            }
            if (rewardProgress > 0) {
                const currentStageId = this.getCurrentStageDef?.()?.id || '';
                this.runState.totalProgress += rewardProgress;
                if (!fragment.rewardIsObjective && (!fragment.rewardStageId || fragment.rewardStageId === currentStageId)) {
                    this.runState.stageProgress += rewardProgress;
                }
                this.runState.stageFlash = Math.max(this.runState.stageFlash || 0, 0.16 + rewardProgress * 0.04);
            }
            this.resolveLootRewardSourceConsumption(fragment.rewardSourceId || '');
            return;
        }
        const isEnergy = fragment.kind === 'energy';
        this.applyEnergyDelta(
            isEnergy
                ? this.getRunTuningValue('gameplayFragmentEnergyGain', 4.8)
                : this.getRunTuningValue('gameplayFragmentMatterGain', 2.1),
            isEnergy ? 0.22 : 0.08,
            'fragment'
        );
        this.gainBiomass(
            isEnergy
                ? this.getRunTuningValue('gameplayFragmentEnergyBiomass', 0.24)
                : this.getRunTuningValue('gameplayFragmentMatterBiomass', 0.08)
        );
    },
    applyPreyDevourOutcome(prey) {
        const reward = this.buildPreyDevourRewardPayload(prey);
        if (!reward) {
            return;
        }

        this.applyEnergyDelta(reward.energyValue, reward.isObjective ? 0.68 : 0.3, reward.isObjective ? 'objective' : 'devour');
        this.gainBiomass(reward.biomassValue);
        this.runState.totalProgress += reward.progressValue;
        if (!reward.isObjective) {
            this.runState.stageProgress += reward.progressValue;
            this.runState.stageFlash = Math.max(this.runState.stageFlash || 0, 0.18 + reward.progressValue * 0.04);
            return;
        }

        if (this.runState.objectiveId === reward.sourceId) {
            this.runState.objectiveId = '';
        }
        this.runState.stageFlash = Math.max(this.runState.stageFlash || 0, 1.1);
        if ((this.runState.stageIndex || 0) >= this.getStageCount() - 1) {
            this.triggerVictory();
        } else {
            this.advanceStage();
        }
    },
    queuePreyDevourOutcome(prey) {
        if (!prey) {
            return;
        }
        const reward = this.buildPreyDevourRewardPayload(prey);
        if (!reward) {
            return;
        }

        if (prey.isObjective) {
            this.flushPendingDevourRewards();
            this.applyPreyDevourOutcome(prey);
            return;
        }

        if (!Array.isArray(this.pendingDevourRewards)) {
            this.pendingDevourRewards = [];
        }

        this.pendingDevourRewards.push({
            energyValue: reward.energyValue || 0,
            biomassValue: reward.biomassValue || 0,
            progressValue: reward.progressValue || 0
        });
    },
    flushPendingDevourRewards() {
        if (!Array.isArray(this.pendingDevourRewards) || this.pendingDevourRewards.length === 0) {
            return;
        }

        let totalEnergy = 0;
        let totalBiomass = 0;
        let totalProgress = 0;
        let flash = this.runState?.stageFlash || 0;
        let count = 0;

        while (this.pendingDevourRewards.length > 0) {
            const reward = this.pendingDevourRewards.pop();
            totalEnergy += reward.energyValue || 0;
            totalBiomass += reward.biomassValue || 0;
            totalProgress += reward.progressValue || 0;
            flash = Math.max(flash, 0.18 + (reward.progressValue || 0) * 0.04);
            count += 1;
        }

        this.applyEnergyDelta(totalEnergy, Math.min(0.52, 0.18 + count * 0.06), 'devour');
        this.gainBiomass(totalBiomass);
        this.runState.totalProgress += totalProgress;
        this.runState.stageProgress += totalProgress;
        this.runState.stageFlash = Math.max(this.runState.stageFlash || 0, flash);
        this.noteDevourBatch?.(count);
    },
    onPreyDevoured(prey, node, attachment, options = null) {
        this.finishPreyChaseTelemetry?.(prey, 'devoured', {
            byNode: node?.index ?? -1,
            mode: attachment?.mode || ''
        });
        if (options?.deferReward === true) {
            return;
        }
        this.queuePreyDevourOutcome(prey, node, attachment);
    },
    pickGrowthTemplate() {
        const stage = this.getCurrentStageDef();
        const sequence = Array.isArray(stage.growthSequence) && stage.growthSequence.length > 0
            ? stage.growthSequence
            : NODE_LIBRARY.map((node) => node.id);
        const pickId = sequence[(this.runState.growthCursor || 0) % sequence.length];
        this.runState.growthCursor = (this.runState.growthCursor || 0) + 1;
        return NODE_LIBRARY.find((node) => node.id === pickId) || NODE_LIBRARY[this.runState.growthCursor % NODE_LIBRARY.length];
    },
    growCluster(count = 1) {
        let grown = 0;
        for (let i = 0; i < count; i += 1) {
            const template = this.pickGrowthTemplate();
            if (typeof this.addDebugNode !== 'function') {
                break;
            }
            const added = this.addDebugNode({ template, silent: true });
            if (!added) {
                break;
            }
            grown += 1;
        }
        if (grown > 0) {
            const growthEnergyMul = Math.max(0.1, this.getCurrentStageDef()?.growthEconomy?.growthEnergyMul || 1);
            this.syncPlayerEnergyCapacity(true);
            this.runState.growthPulse = Math.max(this.runState.growthPulse || 0, 0.8);
            this.emitLivingEnergyBarEvent?.('growth', 0.3 + grown * 0.28);
            this.applyEnergyDelta(
                (
                    this.getRunTuningValue('gameplayGrowthEnergyBase', 6)
                    + grown * this.getRunTuningValue('gameplayGrowthEnergyPerNode', 1.5)
                ) * growthEnergyMul,
                0.16,
                'growth'
            );
            this.createRing(this.player.centroidX, this.player.centroidY, this.getFormationSpan() + 28, this.getRunPalette().pulse, 0.18, 2, 'player-growth');
            this.playAudioEvent?.('player_growth', {
                grownCount: grown,
                nodeCount: this.activeNodes?.length || 0,
                stageIndex: this.runState.stageIndex || 0
            });
        }
        return grown;
    },
    spawnStageObjective() {
        const stage = this.getCurrentStageDef();
        if (!stage?.objective || this.runState.objectiveSpawned || typeof this.spawnConfiguredPrey !== 'function') {
            return null;
        }
        if (!this.getRunTuningToggle?.('gameplayPreySpawnEnabled', true)) {
            return null;
        }
        if (!this.getRunTuningToggle?.('gameplayPreyObjectiveSpawnEnabled', true)) {
            return null;
        }

        const objective = this.spawnConfiguredPrey({
            ...stage.objective,
            isObjective: true,
            signalColor: stage.palette.signal
        }, 1, true)?.[0] || null;
        if (!objective) {
            return null;
        }

        this.runState.objectiveSpawned = true;
        this.runState.objectiveId = objective.id;
        this.runState.objectivePulse = 1;
        this.runState.stageFlash = Math.max(this.runState.stageFlash || 0, 0.8);
        this.createRing(objective.x, objective.y, objective.radius + 34, stage.palette.signal, 0.28, 3, 'objective-spawn');
        this.playAudioEvent?.('objective_spawn', {
            stageIndex: this.runState.stageIndex || 0,
            objectiveId: objective.id,
            archetype: objective.archetype || stage.objective?.archetype || '',
            sizeKey: objective.sizeKey || stage.objective?.sizeKey || ''
        });
        return objective;
    },
    advanceStage() {
        const previousStageIndex = this.runState.stageIndex || 0;
        if ((this.runState.stageIndex || 0) >= this.getStageCount() - 1) {
            this.triggerVictory();
            return;
        }

        this.clearActivePreyChases?.('stage-advance');
        this.prey = [];
        this.runState.stageIndex += 1;
        this.runState.stageProgress = 0;
        this.runState.objectiveSpawned = false;
        this.runState.objectiveId = '';
        this.runState.stageFlash = 1.25;
        this.runState.stageSignal = 1;
        this.runState.stageChangedAt = this.worldTime;
        this.syncSpawnTimersForStage(true);
        this.populateStagePrey?.(true);
        this.applyEnergyDelta(
            Math.max(
                this.getRunTuningValue('gameplayStageAdvanceEnergyFlat', 12),
                this.player.maxEnergy * this.getRunTuningValue('gameplayStageAdvanceEnergyRatio', 0.24)
            ),
            0.42,
            'stage'
        );
        this.createRing(this.player.centroidX, this.player.centroidY, this.getFormationSpan() + 46, this.getRunPalette().signal, 0.32, 3, 'stage-advance');
        this.playAudioEvent?.('stage_advance', {
            fromStage: previousStageIndex,
            toStage: this.runState.stageIndex || 0
        });
        this.syncSceneBgm?.({ source: 'stage-advance' });
        this.showStageTransition?.(this.runState.stageIndex || 0, {
            source: 'stage-advance',
            fromStageIndex: previousStageIndex
        });
    },
    triggerVictory() {
        if (this.runState.complete) {
            return;
        }

        this.runState.complete = true;
        this.runState.completeTimer = Math.max(0.5, this.getRunTuningValue('gameplayVictoryDuration', 5.5));
        this.runState.stageFlash = 1.8;
        this.runState.objectiveSpawned = false;
        this.runState.objectiveId = '';
        this.clearActivePreyChases?.('victory');
        this.prey = [];
        this.applyEnergyDelta(this.player.maxEnergy, 0.6, 'victory');
        this.player.victoryPulse = 1;
        this.createRing(this.player.centroidX, this.player.centroidY, this.getFormationSpan() + 84, this.getRunPalette().signal, 0.36, 4, 'player-victory');
        this.playAudioEvent?.('game_victory', {
            stageIndex: this.runState.stageIndex || 0,
            totalProgress: this.runState.totalProgress || 0
        });
    },
    triggerPlayerDeath(reason = 'starved') {
        if (this.player.dead) {
            return;
        }

        this.clearActivePreyChases?.('player-death');
        this.player.dead = true;
        this.player.deathTimer = Math.max(0.5, this.getRunTuningValue('gameplayDeathDuration', 2.6));
        this.runState.deathCause = reason;
        this.runState.lowEnergyPulse = 1;
        this.runState.stageFlash = Math.max(this.runState.stageFlash || 0, 0.9);
        this.activeNodes.forEach((node) => {
            const dir = normalize(node.x - this.player.centroidX, node.y - this.player.centroidY, Math.cos(this.player.heading), Math.sin(this.player.heading));
            node.anchored = false;
            node.anchorStrength = 0;
            node.vx += dir.x * (42 + node.order * 8);
            node.vy += dir.y * (42 + node.order * 8);
        });
        this.createRing(this.player.centroidX, this.player.centroidY, this.getFormationSpan() + 38, COLORS.health, 0.24, 3, 'player-death');
        this.playAudioEvent?.('game_death', {
            reason,
            stageIndex: this.runState.stageIndex || 0,
            energy: this.player.energy || 0
        });
    },
    updateRunState(simDt) {
        this.ensureRunProgressionState();
        this.syncPlayerEnergyCapacity(true);
        this.flushPendingDevourRewards();
        const stage = this.getCurrentStageDef();
        const objective = this.getObjectivePrey();
        const nodeCount = this.getPlayerNodeCount();
        const burstAggro = clamp(this.intent?.burstAggro ?? 0, 0, 1);
        const huntWeight = clamp(this.intent?.pointerDriveHuntWeight ?? 0, 0, 1.2);
        const expansion = clamp(this.clusterVolume?.expansion ?? Math.max(0, this.intent?.clusterVolume ?? 0), 0, 1);
        const compression = clamp(this.intent?.centerCompression ?? this.clusterVolume?.compression ?? 0, 0, 1);
        const objectivePulseDamp = Math.max(0.1, this.getRunTuningValue('gameplayObjectivePulseDamp', 3.6));
        const lowEnergyThreshold = clamp(this.getRunTuningValue('gameplayLowEnergyThreshold', 0.28), 0.01, 0.95);
        const objectiveRevealProgress = this.getCurrentStageObjectiveRevealProgress(stage);
        const objectiveRevealDelay = 60;
        const stageChangedAt = Number.isFinite(this.runState.stageChangedAt) ? this.runState.stageChangedAt : 0;
        const objectiveRevealDelayElapsed = (this.worldTime - stageChangedAt) >= objectiveRevealDelay;

        this.runState.stageFlash = Math.max(0, (this.runState.stageFlash || 0) - simDt * 0.64);
        this.runState.stageSignal += simDt * (0.8 + (this.runState.stageIndex || 0) * 0.18);
        this.runState.energyPulse = Math.max(0, (this.runState.energyPulse || 0) - simDt * 1.55);
        this.runState.energyGainPulse = Math.max(0, (this.runState.energyGainPulse || 0) - simDt * 1.85);
        this.runState.energyLossPulse = Math.max(0, (this.runState.energyLossPulse || 0) - simDt * 2.35);
        this.runState.energyBeat = Math.max(0, (this.runState.energyBeat || 0) - simDt * 4.8);
        this.runState.hudJolt = Math.max(0, (this.runState.hudJolt || 0) - simDt * 3.2);
        this.runState.growthPulse = Math.max(0, (this.runState.growthPulse || 0) - simDt * 1.4);
        this.player.energyFlash = Math.max(0, (this.player.energyFlash || 0) - simDt * 1.6);
        this.player.energyDeltaFlash = Math.max(0, (this.player.energyDeltaFlash || 0) - simDt * 2.2);
        this.player.victoryPulse = Math.max(0, (this.player.victoryPulse || 0) - simDt * 0.65);
        this.player.energyDisplay = damp(this.player.energyDisplay || this.player.energy || 0, this.player.energy || 0, (this.player.energy || 0) >= (this.player.energyDisplay || 0) ? 16 : 28, simDt);
        this.player.energyGhost = damp(this.player.energyGhost || this.player.energy || 0, this.player.energy || 0, (this.player.energy || 0) >= (this.player.energyGhost || 0) ? 4.2 : 7.4, simDt);

        if (this.isInfiniteEnergyEnabled()) {
            this.syncInfiniteEnergyState();
        }

        const objectiveVisible = !!objective;
        this.runState.objectivePulse = damp(this.runState.objectivePulse || 0, objectiveVisible ? 1 : 0, objectivePulseDamp, simDt);
        if (
            this.runState.objectiveSpawned
            && !objectiveVisible
            && !this.runState.complete
            && !this.player.dead
            && !this.hasPendingObjectiveLoot(this.runState.objectiveId)
        ) {
            this.runState.objectiveSpawned = false;
            this.runState.objectiveId = '';
        }

        if (this.runState.complete) {
            this.runState.completeTimer -= simDt;
            if (this.runState.completeTimer <= 0) {
                this.resetSimulation(true);
            }
            return;
        }

        if (!this.player.dead) {
            this.player.metabolism = this.estimatePulseMetabolism(Math.max(1, this.player.pulseRunners?.length || 1));

            while ((this.player.growthBuffer || 0) >= (this.player.nextGrowthCost || Infinity)) {
                const currentNodeCount = this.activeNodes?.length || nodeCount;
                if (currentNodeCount >= stage.maxNodes) {
                    break;
                }
                this.player.growthBuffer -= this.player.nextGrowthCost;
                const grown = this.growCluster(1);
                if (grown <= 0) {
                    break;
                }
                this.player.nextGrowthCost = this.getGrowthCostForNodeCount(this.activeNodes?.length || currentNodeCount);
            }

            if (
                !this.runState.objectiveSpawned
                && objectiveRevealDelayElapsed
                && (
                    this.runState.stageProgress >= objectiveRevealProgress
                    || nodeCount >= (stage.objectiveRevealNodeCount || stage.nodeTargets?.earlyExit || stage.maxNodes || nodeCount)
                )
            ) {
                this.spawnStageObjective();
            }

            if ((this.player.energy || 0) <= 0.01) {
                this.triggerPlayerDeath('starved');
            }
        }

        const energyRatio = this.getEnergyRatio();
        const lowEnergyActive = energyRatio < lowEnergyThreshold && !this.player.dead && !this.runState.complete;
        if (lowEnergyActive && !this.runState.lowEnergyWarned) {
            this.runState.lowEnergyWarned = true;
            this.playAudioEvent?.('player_low_energy_warning', {
                energyRatio,
                threshold: lowEnergyThreshold,
                stageIndex: this.runState.stageIndex || 0
            });
        } else if (
            !lowEnergyActive
            || energyRatio > Math.min(0.98, lowEnergyThreshold + 0.06)
        ) {
            this.runState.lowEnergyWarned = false;
        }

        this.runState.lowEnergyPulse = damp(this.runState.lowEnergyPulse || 0, lowEnergyActive ? 1 : 0, 3.2, simDt);
    }
};
