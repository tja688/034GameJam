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
            lowEnergyPulse: 0,
            complete: false,
            completeTimer: 0,
            deathCause: '',
            stageChangedAt: 0
        };
    },
    isDebugToolsEnabled() {
        return !!window.CORE_DEMO_DEBUG;
    },
    getStageCount() {
        return DEMO_STAGE_DEFS.length;
    },
    getCurrentStageDef() {
        if (!this.runState) {
            return DEMO_STAGE_DEFS[0];
        }
        return DEMO_STAGE_DEFS[clamp(this.runState.stageIndex || 0, 0, DEMO_STAGE_DEFS.length - 1)];
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
        if (!Number.isFinite(this.player.maxEnergy) || this.player.maxEnergy <= 0) {
            this.player.maxEnergy = 100;
        }
        if (!Number.isFinite(this.player.energy)) {
            this.player.energy = this.player.maxEnergy * 0.8;
        }
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
    },
    resetRunProgression() {
        this.runState = this.createDefaultRunState();
        this.player.maxEnergy = 100;
        this.player.energy = 78;
        this.player.growthBuffer = 0;
        this.player.nextGrowthCost = this.getGrowthCostForNodeCount(this.player.chain?.length || DEFAULT_BASE_CHAIN.length);
        this.player.metabolism = 0;
        this.player.energyFlash = 0;
        this.player.stagePulse = 0;
        this.player.victoryPulse = 0;
        this.syncSpawnTimersForStage(true);
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
        return Math.min(18, 3.2 + Math.max(0, nodeCount - DEFAULT_BASE_CHAIN.length) * 0.92);
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
    applySpawnConfigToPrey(prey, spawnConfig, groupId = '') {
        const stage = this.getCurrentStageDef();
        const archetype = PREY_ARCHETYPE_DEFS[spawnConfig.archetype] || PREY_ARCHETYPE_DEFS.skittish;
        const sizeFactor = prey.sizeKey === 'large' ? 1.95 : prey.sizeKey === 'medium' ? 1.35 : 1;
        const healthMul = spawnConfig.archetype === 'bulwark'
            ? 1.42
            : spawnConfig.archetype === 'weakspot'
                ? 1.28
                : spawnConfig.archetype === 'apex'
                    ? 2.1
                    : spawnConfig.archetype === 'school'
                        ? 0.9
                        : 1;
        const objectiveMul = spawnConfig.isObjective ? 1.22 : 1;

        prey.archetype = spawnConfig.archetype;
        prey.spawnRuleId = spawnConfig.id || spawnConfig.archetype;
        prey.groupId = groupId;
        prey.isObjective = !!spawnConfig.isObjective;
        prey.stageId = stage.id;
        prey.color = spawnConfig.color ?? prey.color;
        prey.baseColor = prey.color;
        prey.signalColor = spawnConfig.signalColor ?? (prey.isObjective ? stage.palette.signal : stage.palette.pulse);
        prey.radius *= spawnConfig.radiusMul ?? (prey.isObjective ? 1.08 : 1);
        prey.baseRadius = prey.radius;
        prey.maxHealth *= healthMul * objectiveMul;
        prey.health = prey.maxHealth;
        prey.speed *= archetype.speedMul;
        prey.accel *= archetype.accelMul;
        prey.fleeMul *= archetype.fleeMul;
        prey.wander *= archetype.wanderMul;
        prey.mass *= spawnConfig.archetype === 'bulwark' ? 1.2 : spawnConfig.archetype === 'apex' ? 1.42 : 1;
        prey.maxAnchors += spawnConfig.archetype === 'bulwark' ? 1 : spawnConfig.archetype === 'apex' ? 2 : spawnConfig.archetype === 'weakspot' ? 1 : 0;
        prey.energyValue = archetype.energyValue * sizeFactor + (spawnConfig.energyBonus || 0);
        prey.biomassValue = archetype.biomassValue * sizeFactor + (spawnConfig.biomassBonus || 0);
        prey.progressValue = archetype.progressValue * sizeFactor + (spawnConfig.progressBonus || 0);
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
        return prey;
    },
    getCompressionAccess(prey, pressure) {
        const compression = clamp(this.intent?.centerCompression ?? this.clusterVolume?.compression ?? 0, 0, 1);
        const encircle = clamp(pressure?.encirclement || 0, 0, 1);
        const need = clamp(prey?.compressionNeed || 0, 0, 0.9);
        return clamp((compression - need + encircle * 0.26) / Math.max(0.08, 1 - need), 0, 1);
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
        return clamp(Math.max(angularAccess, encircle * 0.82 + compression * 0.18), 0, 1);
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
            multiplier *= 0.16 + compressionAccess * 0.96 + encircle * 0.32;
            if (attachment?.mode === 'feed' && compressionAccess < 0.4) {
                multiplier *= 0.58;
            }
        } else if (prey.archetype === 'weakspot') {
            multiplier *= 0.12 + weakAccess * 1.08;
            if (attachment?.mode === 'feed' && weakAccess < 0.42) {
                multiplier *= 0.4;
            }
        } else if (prey.archetype === 'apex') {
            multiplier *= 0.08 + compressionAccess * 0.44 + weakAccess * 0.88 + encircle * 0.26;
            if (attachment?.mode === 'feed' && (compressionAccess < 0.38 || weakAccess < 0.36)) {
                multiplier *= 0.34;
            }
        }

        if (prey.isObjective) {
            multiplier *= 0.92 + clamp((pressure?.cutterCount || 0) / 4, 0, 1) * 0.18;
        }

        return multiplier;
    },
    applyEnergyDelta(amount, pulseBoost = 0) {
        this.ensureRunProgressionState();
        this.player.energy = clamp((this.player.energy || 0) + amount, 0, this.player.maxEnergy || 100);
        if (amount > 0) {
            this.player.energyFlash = clamp((this.player.energyFlash || 0) + amount * 0.02 + pulseBoost, 0, 1.8);
            this.runState.energyPulse = Math.max(this.runState.energyPulse || 0, 0.2 + pulseBoost);
        }
    },
    gainBiomass(amount) {
        this.ensureRunProgressionState();
        this.player.growthBuffer = (this.player.growthBuffer || 0) + Math.max(0, amount);
        this.runState.growthPulse = Math.max(this.runState.growthPulse || 0, 0.16 + amount * 0.02);
    },
    absorbFragment(fragment) {
        const isEnergy = fragment.kind === 'energy';
        this.applyEnergyDelta(isEnergy ? 4.8 : 2.1, isEnergy ? 0.22 : 0.08);
        this.gainBiomass(isEnergy ? 0.24 : 0.08);
    },
    onPreyDevoured(prey, node, attachment) {
        if (!prey) {
            return;
        }

        this.applyEnergyDelta(prey.energyValue || 0, prey.isObjective ? 0.68 : 0.3);
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
            this.applyEnergyDelta(6 + grown * 1.5, 0.16);
            this.createRing(this.player.centroidX, this.player.centroidY, this.getFormationSpan() + 28, this.getRunPalette().pulse, 0.18, 2);
        }
        return grown;
    },
    spawnStageObjective() {
        const stage = this.getCurrentStageDef();
        if (!stage?.objective || this.runState.objectiveSpawned || typeof this.spawnConfiguredPrey !== 'function') {
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
        this.createRing(objective.x, objective.y, objective.radius + 34, stage.palette.signal, 0.28, 3);
        return objective;
    },
    advanceStage() {
        if ((this.runState.stageIndex || 0) >= this.getStageCount() - 1) {
            this.triggerVictory();
            return;
        }

        this.prey = [];
        this.runState.stageIndex += 1;
        this.runState.stageProgress = 0;
        this.runState.objectiveSpawned = false;
        this.runState.objectiveId = '';
        this.runState.stageFlash = 1.25;
        this.runState.stageSignal = 1;
        this.runState.stageChangedAt = this.worldTime;
        this.syncSpawnTimersForStage(true);
        this.applyEnergyDelta(Math.max(12, this.player.maxEnergy * 0.24), 0.42);
        this.createRing(this.player.centroidX, this.player.centroidY, this.getFormationSpan() + 46, this.getRunPalette().signal, 0.32, 3);
    },
    triggerVictory() {
        if (this.runState.complete) {
            return;
        }

        this.runState.complete = true;
        this.runState.completeTimer = 5.5;
        this.runState.stageFlash = 1.8;
        this.runState.objectiveSpawned = false;
        this.runState.objectiveId = '';
        this.prey = [];
        this.applyEnergyDelta(this.player.maxEnergy, 0.6);
        this.player.victoryPulse = 1;
        this.createRing(this.player.centroidX, this.player.centroidY, this.getFormationSpan() + 84, this.getRunPalette().signal, 0.36, 4);
    },
    triggerPlayerDeath(reason = 'starved') {
        if (this.player.dead) {
            return;
        }

        this.player.dead = true;
        this.player.deathTimer = 2.6;
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
        this.createRing(this.player.centroidX, this.player.centroidY, this.getFormationSpan() + 38, COLORS.health, 0.24, 3);
    },
    updateRunState(simDt) {
        this.ensureRunProgressionState();
        const stage = this.getCurrentStageDef();
        const objective = this.getObjectivePrey();
        const nodeCount = this.activeNodes?.length || this.player.chain?.length || DEFAULT_BASE_CHAIN.length;
        const burstAggro = clamp(this.intent?.burstAggro ?? 0, 0, 1);
        const huntWeight = clamp(this.intent?.pointerDriveHuntWeight ?? 0, 0, 1.2);
        const expansion = clamp(this.clusterVolume?.expansion ?? Math.max(0, this.intent?.clusterVolume ?? 0), 0, 1);
        const compression = clamp(this.intent?.centerCompression ?? this.clusterVolume?.compression ?? 0, 0, 1);

        this.runState.stageFlash = Math.max(0, (this.runState.stageFlash || 0) - simDt * 0.64);
        this.runState.stageSignal += simDt * (0.8 + (this.runState.stageIndex || 0) * 0.18);
        this.runState.energyPulse = Math.max(0, (this.runState.energyPulse || 0) - simDt * 1.55);
        this.runState.growthPulse = Math.max(0, (this.runState.growthPulse || 0) - simDt * 1.4);
        this.player.energyFlash = Math.max(0, (this.player.energyFlash || 0) - simDt * 1.6);
        this.player.victoryPulse = Math.max(0, (this.player.victoryPulse || 0) - simDt * 0.65);

        const objectiveVisible = !!objective;
        this.runState.objectivePulse = damp(this.runState.objectivePulse || 0, objectiveVisible ? 1 : 0, 3.6, simDt);
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
            const drain = Math.max(
                0.8,
                stage.metabolism
                + nodeCount * 0.24
                + burstAggro * 2.45
                + huntWeight * 1.28
                + expansion * 1.72
                + (objectiveVisible ? 0.5 : 0)
                - compression * 1.9
                - clamp(this.player.predationPressure || 0, 0, 1) * 0.55
            );
            this.player.metabolism = drain;
            this.applyEnergyDelta(-drain * simDt);

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

        this.runState.lowEnergyPulse = damp(this.runState.lowEnergyPulse || 0, this.getEnergyRatio() < 0.28 ? 1 : 0, 3.2, simDt);
    }
};
