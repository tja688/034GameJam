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
        const tunedMaxEnergy = Math.max(1, this.getRunTuningValue('gameplayMaxEnergy', 100));
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
    getStageCount() {
        return DEMO_STAGE_DEFS.length;
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

        return {
            ...baseStage,
            progressGoal: Math.max(1, baseStage.progressGoal * progressGoalMul),
            maxNodes: Math.max(DEFAULT_BASE_CHAIN.length, baseStage.maxNodes + maxNodesBonus),
            metabolism: Math.max(0.1, baseStage.metabolism * metabolismMul),
            spawnCap: Math.max(1, Math.round(baseStage.spawnCap * spawnCapMul)),
            spawnRules: baseStage.spawnRules.map((rule) => {
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
            }),
            objective: baseStage.objective ? { ...baseStage.objective } : null
        };
    },
    getRunPalette() {
        return this.getCurrentStageDef()?.palette || {
            arena: COLORS.arena,
            grid: COLORS.grid,
            mist: COLORS.link,
            pulse: COLORS.pulse,
            signal: COLORS.core,
            threat: COLORS.health
        };
    },
    ensureRunProgressionState() {
        if (!this.runState) {
            this.runState = this.createDefaultRunState();
        }
        const tunedMaxEnergy = Math.max(1, this.getRunTuningValue('gameplayMaxEnergy', 100));
        this.player.maxEnergy = tunedMaxEnergy;
        if (!Number.isFinite(this.player.energy)) {
            this.player.energy = this.player.maxEnergy * 0.8;
        }
        this.player.energy = clamp(this.player.energy, 0, tunedMaxEnergy);
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
        const maxEnergy = Math.max(1, this.getRunTuningValue('gameplayMaxEnergy', 100));
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
        stage.spawnRules.forEach((rule, index) => {
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
        return Math.min(cap, baseCost + Math.max(0, nodeCount - DEFAULT_BASE_CHAIN.length) * perNodeCost);
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
    applySpawnConfigToPrey(prey, spawnConfig, groupId = '') {
        const stage = this.getCurrentStageDef();
        const archetype = PREY_ARCHETYPE_DEFS[spawnConfig.archetype] || PREY_ARCHETYPE_DEFS.skittish;
        const sizeFactor = prey.sizeKey === 'large' ? 1.95 : prey.sizeKey === 'medium' ? 1.35 : 1;
        const healthMul = spawnConfig.archetype === 'bulwark'
            ? this.getRunTuningValue('gameplayBulwarkHealthMul', 1.42)
            : spawnConfig.archetype === 'weakspot'
                ? this.getRunTuningValue('gameplayWeakspotHealthMul', 1.28)
                : spawnConfig.archetype === 'apex'
                    ? this.getRunTuningValue('gameplayApexHealthMul', 2.1)
                    : spawnConfig.archetype === 'school'
                        ? this.getRunTuningValue('gameplaySchoolHealthMul', 0.9)
                        : 1;
        const objectiveMul = spawnConfig.isObjective
            ? this.getRunTuningValue('gameplayObjectiveHealthMul', 1.22)
            : 1;
        const bulwarkMassMul = this.getRunTuningValue('gameplayBulwarkMassMul', 1.2);
        const apexMassMul = this.getRunTuningValue('gameplayApexMassMul', 1.42);
        const bulwarkExtraAnchors = Math.max(0, Math.round(this.getRunTuningValue('gameplayBulwarkExtraAnchors', 1)));
        const weakspotExtraAnchors = Math.max(0, Math.round(this.getRunTuningValue('gameplayWeakspotExtraAnchors', 1)));
        const apexExtraAnchors = Math.max(0, Math.round(this.getRunTuningValue('gameplayApexExtraAnchors', 2)));

        prey.archetype = spawnConfig.archetype;
        prey.spawnRuleId = spawnConfig.id || spawnConfig.archetype;
        prey.groupId = groupId;
        prey.isObjective = !!spawnConfig.isObjective;
        prey.stageId = stage.id;
        prey.color = spawnConfig.color ?? prey.color;
        prey.baseColor = prey.color;
        prey.signalColor = spawnConfig.signalColor ?? (prey.isObjective ? stage.palette.signal : stage.palette.pulse);
        const visualScale = this.getPreyVisualMultiplier(prey, spawnConfig) * (spawnConfig.radiusMul ?? (prey.isObjective ? 1.08 : 1));
        prey.visualScale = visualScale;
        prey.radius *= visualScale;
        prey.baseRadius = prey.radius;
        prey.chunkBurst = Math.max(1, Math.round(prey.chunkBurst * Math.max(1, Math.pow(visualScale, 0.62))));
        prey.maxHealth *= healthMul * objectiveMul * Math.max(0.85, Math.pow(visualScale, 0.28));
        prey.health = prey.maxHealth;
        prey.speed *= archetype.speedMul;
        prey.accel *= archetype.accelMul;
        prey.fleeMul *= archetype.fleeMul;
        prey.wander *= archetype.wanderMul;
        prey.mass *= (spawnConfig.archetype === 'bulwark' ? bulwarkMassMul : spawnConfig.archetype === 'apex' ? apexMassMul : 1)
            * Math.max(0.8, Math.pow(visualScale, 1.18));
        prey.maxAnchors += spawnConfig.archetype === 'bulwark'
            ? bulwarkExtraAnchors
            : spawnConfig.archetype === 'apex'
                ? apexExtraAnchors
                : spawnConfig.archetype === 'weakspot'
                    ? weakspotExtraAnchors
                    : 0;
        const yieldMul = this.getPreyYieldMultiplier(prey);
        prey.energyValue = (archetype.energyValue * sizeFactor + (spawnConfig.energyBonus || 0)) * yieldMul.energy;
        prey.biomassValue = (archetype.biomassValue * sizeFactor + (spawnConfig.biomassBonus || 0)) * yieldMul.biomass;
        prey.progressValue = (archetype.progressValue * sizeFactor + (spawnConfig.progressBonus || 0)) * yieldMul.progress;
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
        prey.objectiveGlow = prey.isObjective ? 1 : 0;
        prey.pulseGain = prey.isObjective ? 0.68 : 0.18;
        prey.exposed = prey.isObjective ? Math.max(prey.exposed || 0, archetype.weakExpose + 0.04) : Math.max(prey.exposed || 0, archetype.weakExpose);
        prey.behaviorState = prey.archetype === 'school' ? 'schooling' : 'graze';
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

        if (prey.archetype === 'bulwark') {
            multiplier *= this.getRunTuningValue('gameplayBulwarkBaseDamage', 0.16)
                + compressionAccess * this.getRunTuningValue('gameplayBulwarkCompressionDamage', 0.96)
                + encircle * this.getRunTuningValue('gameplayBulwarkEncircleDamage', 0.32);
            if (attachment?.mode === 'feed' && compressionAccess < this.getRunTuningValue('gameplayBulwarkFeedCompressionGate', 0.4)) {
                multiplier *= this.getRunTuningValue('gameplayBulwarkFeedPenalty', 0.58);
            }
        } else if (prey.archetype === 'weakspot') {
            multiplier *= this.getRunTuningValue('gameplayWeakspotBaseDamage', 0.12)
                + weakAccess * this.getRunTuningValue('gameplayWeakspotWeakArcDamage', 1.08);
            if (attachment?.mode === 'feed' && weakAccess < this.getRunTuningValue('gameplayWeakspotFeedGate', 0.42)) {
                multiplier *= this.getRunTuningValue('gameplayWeakspotFeedPenalty', 0.4);
            }
        } else if (prey.archetype === 'apex') {
            multiplier *= this.getRunTuningValue('gameplayApexBaseDamage', 0.08)
                + compressionAccess * this.getRunTuningValue('gameplayApexCompressionDamage', 0.44)
                + weakAccess * this.getRunTuningValue('gameplayApexWeakspotDamage', 0.88)
                + encircle * this.getRunTuningValue('gameplayApexEncircleDamage', 0.26);
            if (
                attachment?.mode === 'feed'
                && (
                    compressionAccess < this.getRunTuningValue('gameplayApexFeedCompressionGate', 0.38)
                    || weakAccess < this.getRunTuningValue('gameplayApexFeedWeakGate', 0.36)
                )
            ) {
                multiplier *= this.getRunTuningValue('gameplayApexFeedPenalty', 0.34);
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
        const nodeCount = this.activeNodes?.length || this.player.chain?.length || DEFAULT_BASE_CHAIN.length;
        const baseCost = Math.max(0, this.getRunTuningValue('gameplayPulseMetabolismBase', 0.18));
        const floorCost = Math.max(0, this.getRunTuningValue('gameplayMetabolismFloor', 0.8)) * 0.04;
        const perStage = Math.max(0, this.getRunTuningValue('gameplayPulseMetabolismStageWeight', 0.038)) * Math.max(0, stage?.metabolism || 0);
        const perNode = Math.max(0, this.getRunTuningValue('gameplayMetabolismNodeWeight', 0.24)) * Math.max(0, nodeCount - DEFAULT_BASE_CHAIN.length) * 0.12;
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
        return Math.max(0, (baseCost + floorCost + perStage + perNode) * Math.max(0.18, activity) * Math.max(0.18, relief) * phaseMul * Math.max(1, triggerCount));
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
        this.player.growthBuffer = (this.player.growthBuffer || 0) + Math.max(0, amount);
        this.runState.growthPulse = Math.max(this.runState.growthPulse || 0, 0.16 + amount * 0.02);
        if (amount > 0) {
            this.emitLivingEnergyBarEvent?.('biomass', 0.08 + amount * 0.06);
        }
    },
    absorbFragment(fragment) {
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
        if (!prey) {
            return;
        }

        this.applyEnergyDelta(prey.energyValue || 0, prey.isObjective ? 0.68 : 0.3, prey.isObjective ? 'objective' : 'devour');
        this.gainBiomass((prey.biomassValue || 0) + (prey.growthBonus || 0));
        this.runState.totalProgress += prey.progressValue || 0;
        if (!prey.isObjective) {
            this.runState.stageProgress += prey.progressValue || 0;
            this.runState.stageFlash = Math.max(this.runState.stageFlash || 0, 0.18 + (prey.progressValue || 0) * 0.04);
            return;
        }

        if (this.runState.objectiveId === prey.id) {
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

        if (prey.isObjective) {
            this.flushPendingDevourRewards();
            this.applyPreyDevourOutcome(prey);
            return;
        }

        if (!Array.isArray(this.pendingDevourRewards)) {
            this.pendingDevourRewards = [];
        }

        this.pendingDevourRewards.push({
            energyValue: prey.energyValue || 0,
            biomassValue: (prey.biomassValue || 0) + (prey.growthBonus || 0),
            progressValue: prey.progressValue || 0
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
    onPreyDevoured(prey, node, attachment) {
        this.finishPreyChaseTelemetry?.(prey, 'devoured', {
            byNode: node?.index ?? -1,
            mode: attachment?.mode || ''
        });
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
            this.runState.growthPulse = Math.max(this.runState.growthPulse || 0, 0.8);
            this.emitLivingEnergyBarEvent?.('growth', 0.3 + grown * 0.28);
            this.applyEnergyDelta(
                this.getRunTuningValue('gameplayGrowthEnergyBase', 6)
                + grown * this.getRunTuningValue('gameplayGrowthEnergyPerNode', 1.5),
                0.16,
                'growth'
            );
            this.createRing(this.player.centroidX, this.player.centroidY, this.getFormationSpan() + 28, this.getRunPalette().pulse, 0.18, 2, 'player-growth');
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
        return objective;
    },
    advanceStage() {
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
    },
    updateRunState(simDt) {
        this.ensureRunProgressionState();
        this.flushPendingDevourRewards();
        const stage = this.getCurrentStageDef();
        const objective = this.getObjectivePrey();
        const nodeCount = this.activeNodes?.length || this.player.chain?.length || DEFAULT_BASE_CHAIN.length;
        const burstAggro = clamp(this.intent?.burstAggro ?? 0, 0, 1);
        const huntWeight = clamp(this.intent?.pointerDriveHuntWeight ?? 0, 0, 1.2);
        const expansion = clamp(this.clusterVolume?.expansion ?? Math.max(0, this.intent?.clusterVolume ?? 0), 0, 1);
        const compression = clamp(this.intent?.centerCompression ?? this.clusterVolume?.compression ?? 0, 0, 1);
        const objectivePulseDamp = Math.max(0.1, this.getRunTuningValue('gameplayObjectivePulseDamp', 3.6));
        const lowEnergyThreshold = clamp(this.getRunTuningValue('gameplayLowEnergyThreshold', 0.28), 0.01, 0.95);

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
        if (this.runState.objectiveSpawned && !objectiveVisible && !this.runState.complete && !this.player.dead) {
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

            if (!this.runState.objectiveSpawned && this.runState.stageProgress >= stage.progressGoal) {
                this.spawnStageObjective();
            }

            if ((this.player.energy || 0) <= 0.01) {
                this.triggerPlayerDeath('starved');
            }
        }

        this.runState.lowEnergyPulse = damp(this.runState.lowEnergyPulse || 0, this.getEnergyRatio() < lowEnergyThreshold ? 1 : 0, 3.2, simDt);
    }
};
