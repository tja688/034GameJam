const SceneEnemiesMixin = {
    getStageInitialSpawnCount(rule) {
        const density = Math.max(0, this.getRunTuningValue('gameplayPreyInitialDensityMul', 1));
        const bonus = Math.round(this.getRunTuningValue('gameplayPreyInitialCountBonus', 0));
        return Math.max(rule.packMin || 1, Math.round(rule.desired * density) + bonus);
    },
    seedConfiguredPrey(spawnConfig, count = 1) {
        const results = [];
        const worldHalfWidth = this.cameraRig.viewportWidth * 0.5 / this.cameraRig.zoom;
        const worldHalfHeight = this.cameraRig.viewportHeight * 0.5 / this.cameraRig.zoom;
        const fieldMul = Math.max(0.35, this.getRunTuningValue('gameplayPreyFieldRadiusMul', 0.92));
        const spreadMul = Math.max(0.35, this.getRunTuningValue('gameplayPreyFieldSpreadMul', 1));
        const maxRadius = Math.max(220, Math.min(worldHalfWidth, worldHalfHeight) * fieldMul + Math.max(worldHalfWidth, worldHalfHeight) * 0.08);
        const minRadius = Math.max(120, this.getFormationSpan() + 110);
        const groupAngle = Math.random() * Math.PI * 2;
        const groupRadius = Phaser.Math.FloatBetween(minRadius, maxRadius);
        const centerX = this.player.centroidX + Math.cos(groupAngle) * groupRadius;
        const centerY = this.player.centroidY + Math.sin(groupAngle) * groupRadius;
        const clusterBase = (spawnConfig.archetype === 'school' ? 44 : spawnConfig.sizeKey === 'large' ? 28 : spawnConfig.sizeKey === 'medium' ? 64 : 92) * spreadMul;
        const groupId = count > 1 ? `${spawnConfig.id || spawnConfig.archetype}-seed-${this.preyIdCounter}` : '';

        for (let i = 0; i < count; i += 1) {
            const ring = Math.sqrt((i + 0.35) / Math.max(1, count));
            const angle = groupAngle + (Math.PI * 2 * i) / Math.max(1, count) + Phaser.Math.FloatBetween(-0.55, 0.55);
            const offset = clusterBase * ring;
            const prey = this.createPrey(spawnConfig, {
                x: centerX + Math.cos(angle) * offset + Phaser.Math.FloatBetween(-18, 18),
                y: centerY + Math.sin(angle) * offset + Phaser.Math.FloatBetween(-18, 18),
                groupId,
                isObjective: !!spawnConfig.isObjective
            });
            this.prey.push(prey);
            results.push(prey);
        }

        return results;
    },
    populateStagePrey(forceReset = false) {
        if (!forceReset && this.prey.length > 0) {
            return;
        }
        if (!this.getRunTuningToggle?.('gameplayPreySpawnEnabled', true)) {
            return;
        }
        if (!this.getRunTuningToggle?.('gameplayPreyInitialSpawnEnabled', true)) {
            return;
        }
        const stage = this.getCurrentStageDef();
        if (!stage) {
            return;
        }

        stage.spawnRules.forEach((rule) => {
            this.seedConfiguredPrey(rule, this.getStageInitialSpawnCount(rule));
        });
    },
    updateSpawns(simDt) {
        if (this.player.dead || this.runState?.complete) {
            return;
        }
        if (!this.getRunTuningToggle?.('gameplayPreySpawnEnabled', true)) {
            return;
        }

        const stage = this.getCurrentStageDef();
        if (!stage) {
            return;
        }

        if (!this.getRunTuningToggle?.('gameplayPreyRespawnEnabled', false)) {
            return;
        }

        this.syncSpawnTimersForStage(false);
        if (this.prey.length >= stage.spawnCap) {
            return;
        }

        stage.spawnRules.forEach((rule) => {
            const alive = this.prey.filter((prey) => prey.spawnRuleId === rule.id && !prey.isObjective).length;
            if (alive >= rule.desired) {
                this.runState.spawnTimers[rule.id] = Math.min(this.runState.spawnTimers[rule.id], rule.interval * 0.5);
                return;
            }

            this.runState.spawnTimers[rule.id] -= simDt;
            if (this.runState.spawnTimers[rule.id] > 0) {
                return;
            }

            const deficit = Math.max(1, rule.desired - alive);
            const packMin = Math.max(1, rule.packMin || 1);
            const packMax = Math.max(packMin, Math.min(deficit, rule.packMax || packMin));
            const count = Phaser.Math.Between(packMin, packMax);
            this.spawnConfiguredPrey(rule, count);
            this.runState.spawnTimers[rule.id] = rule.interval * Phaser.Math.FloatBetween(0.86, 1.14);
        });
    },
    spawnConfiguredPrey(spawnConfig, count = 1, forceObjective = false) {
        const results = [];
        const side = Phaser.Utils.Array.GetRandom(['left', 'right', 'top', 'bottom']);
        const worldHalfWidth = this.cameraRig.viewportWidth * 0.5 / this.cameraRig.zoom;
        const worldHalfHeight = this.cameraRig.viewportHeight * 0.5 / this.cameraRig.zoom;
        const isHorizontal = side === 'left' || side === 'right';
        const axisBase = isHorizontal
            ? Phaser.Math.Between(this.player.centroidY - worldHalfHeight, this.player.centroidY + worldHalfHeight)
            : Phaser.Math.Between(this.player.centroidX - worldHalfWidth, this.player.centroidX + worldHalfWidth);
        const groupId = count > 1 ? `${spawnConfig.id || spawnConfig.archetype}-${this.preyIdCounter}` : '';

        for (let i = 0; i < count; i += 1) {
            const spread = (i - (count - 1) * 0.5) * (spawnConfig.isObjective || forceObjective ? 42 : 64);
            const axis = axisBase + spread + Phaser.Math.Between(-18, 18);
            const prey = this.createPrey(spawnConfig, {
                side,
                axis,
                groupId,
                isObjective: !!(forceObjective || spawnConfig.isObjective)
            });
            this.prey.push(prey);
            results.push(prey);
        }

        return results;
    },
    createPrey(spawnConfig, options = {}) {
        const sizeKey = spawnConfig.sizeKey || 'small';
        const sizeDef = PREY_SIZE_DEFS[sizeKey];
        const shape = spawnConfig.shape || this.pickSpawnShape(sizeKey);
        const shapeDef = PREY_SHAPE_DEFS[shape];
        const worldHalfWidth = this.cameraRig.viewportWidth * 0.5 / this.cameraRig.zoom;
        const worldHalfHeight = this.cameraRig.viewportHeight * 0.5 / this.cameraRig.zoom;
        const margin = options.isObjective ? 220 : 260;
        const side = options.side || Phaser.Utils.Array.GetRandom(['left', 'right', 'top', 'bottom']);
        let x = 0;
        let y = 0;

        if (Number.isFinite(options.x) && Number.isFinite(options.y)) {
            x = options.x;
            y = options.y;
        } else if (side === 'left') {
            x = this.player.centroidX - worldHalfWidth - margin;
            y = options.axis ?? Phaser.Math.Between(this.player.centroidY - worldHalfHeight, this.player.centroidY + worldHalfHeight);
        } else if (side === 'right') {
            x = this.player.centroidX + worldHalfWidth + margin;
            y = options.axis ?? Phaser.Math.Between(this.player.centroidY - worldHalfHeight, this.player.centroidY + worldHalfHeight);
        } else if (side === 'top') {
            x = options.axis ?? Phaser.Math.Between(this.player.centroidX - worldHalfWidth, this.player.centroidX + worldHalfWidth);
            y = this.player.centroidY - worldHalfHeight - margin;
        } else {
            x = options.axis ?? Phaser.Math.Between(this.player.centroidX - worldHalfWidth, this.player.centroidX + worldHalfWidth);
            y = this.player.centroidY + worldHalfHeight + margin;
        }

        const shapeRadiusMul = shape === 'triangle' ? 0.92 : shape === 'square' ? 1.06 : 1;
        const maxHealth = sizeDef.maxHealth * (shape === 'square' ? 1.12 : shape === 'triangle' ? 0.88 : 1);
        const radius = sizeDef.radius * shapeRadiusMul;
        const id = `prey-${this.preyIdCounter++}`;
        const prey = {
            id,
            shape,
            sizeKey,
            color: shapeDef.color,
            x,
            y,
            displayX: x,
            displayY: y,
            vx: 0,
            vy: 0,
            radius,
            baseRadius: radius,
            maxHealth,
            health: maxHealth,
            speed: sizeDef.speed * shapeDef.speedMul,
            accel: sizeDef.accel * shapeDef.accelMul,
            mass: sizeDef.mass * shapeDef.massMul,
            maxAnchors: sizeDef.maxAnchors + (shape === 'square' ? 1 : 0),
            chunkBurst: sizeDef.chunkBurst,
            yield: sizeDef.yield * shapeDef.yieldMul,
            wander: shapeDef.wander,
            fleeMul: shapeDef.fleeMul,
            pulseMul: shapeDef.pulseMul,
            rotationMul: shapeDef.rotationMul,
            displayRotation: Math.random() * Math.PI * 2,
            pulse: Math.random() * Math.PI * 2,
            spin: 0,
            hitFlash: 0,
            panic: 0,
            wound: 0,
            shudder: 0,
            carve: 0,
            gorePulse: 0,
            devourGlow: 0,
            exposed: sizeKey === 'small' ? 0.36 : 0.08,
            attachments: [],
            chunkThresholds: sizeKey === 'small'
                ? [0.52]
                : sizeKey === 'medium'
                    ? [0.82, 0.56, 0.28]
                    : [0.88, 0.7, 0.48, 0.24],
            chunkCursor: 0,
            seed: Math.random() * 10
        };
        return this.applySpawnConfigToPrey(prey, {
            ...spawnConfig,
            isObjective: !!options.isObjective
        }, options.groupId || '');
    },
    pickSpawnShape(sizeKey) {
        const order = ['triangle', 'square', 'circle'];
        if (!this.preySpawnCursor) {
            this.preySpawnCursor = { small: 0, medium: 1, large: 2 };
        }
        const cursor = this.preySpawnCursor[sizeKey] || 0;
        const shape = order[cursor % order.length];
        this.preySpawnCursor[sizeKey] = cursor + 1;
        return shape;
    },
    createDefaultEcoTelemetry() {
        return {
            player: {
                lastCentroidX: null,
                lastCentroidY: null,
                current: {
                    bucket: 'small',
                    phase: 'cruise',
                    centroidSpeed: 0,
                    nodeSpeed: 0,
                    vx: 0,
                    vy: 0,
                    span: 0,
                    compression: 0,
                    expansion: 0
                },
                stats: {}
            },
            prey: {
                stateStats: {},
                chaseStats: {},
                activeChases: {},
                recentChases: []
            }
        };
    },
    getTelemetryClusterBucket(nodeCount = this.activeNodes?.length || this.player?.chain?.length || DEFAULT_BASE_CHAIN.length) {
        if (nodeCount <= 8) {
            return 'small';
        }
        if (nodeCount <= 14) {
            return 'medium';
        }
        return 'large';
    },
    getTelemetryPhaseBucket(phase = this.intent?.pointerDrivePhase || this.intent?.burstPhase || 'cruise') {
        switch (phase) {
            case 'stable':
            case 'pursuit':
            case 'hunt':
            case 'burst':
                return phase;
            default:
                return 'cruise';
        }
    },
    ensurePlayerTelemetryStats(bucket, phase) {
        if (!this.ecoTelemetry) {
            this.ecoTelemetry = this.createDefaultEcoTelemetry();
        }
        if (!this.ecoTelemetry.player.stats[bucket]) {
            this.ecoTelemetry.player.stats[bucket] = {};
        }
        if (!this.ecoTelemetry.player.stats[bucket][phase]) {
            this.ecoTelemetry.player.stats[bucket][phase] = {
                samples: 0,
                avgCentroidSpeed: 0,
                peakCentroidSpeed: 0,
                avgNodeSpeed: 0,
                avgSpan: 0,
                avgCompression: 0,
                avgExpansion: 0
            };
        }
        return this.ecoTelemetry.player.stats[bucket][phase];
    },
    updateTelemetryAverage(stats, key, value) {
        if (!Number.isFinite(value)) {
            return;
        }
        stats[key] = stats.samples <= 1
            ? value
            : stats[key] + (value - stats[key]) / stats.samples;
    },
    samplePlayerMobilityTelemetry(simDt) {
        if (!this.ecoTelemetry || simDt <= 0 || !Array.isArray(this.activeNodes) || this.activeNodes.length === 0) {
            return;
        }

        const playerTelemetry = this.ecoTelemetry.player;
        const centroidX = this.player.centroidX;
        const centroidY = this.player.centroidY;
        const previousX = Number.isFinite(playerTelemetry.lastCentroidX) ? playerTelemetry.lastCentroidX : centroidX;
        const previousY = Number.isFinite(playerTelemetry.lastCentroidY) ? playerTelemetry.lastCentroidY : centroidY;
        const vx = (centroidX - previousX) / simDt;
        const vy = (centroidY - previousY) / simDt;
        const centroidSpeed = Math.hypot(vx, vy);
        const nodeSpeed = this.samplePlayerMotionIntensity?.() || 0;
        const span = this.getFormationSpan?.() || 0;
        const bucket = this.getTelemetryClusterBucket();
        const phase = this.getTelemetryPhaseBucket();
        const compression = clamp(this.intent?.centerCompression ?? this.clusterVolume?.compression ?? 0, 0, 1);
        const expansion = clamp(this.clusterVolume?.expansion ?? Math.max(0, this.intent?.clusterVolume ?? 0), 0, 1.4);
        const stats = this.ensurePlayerTelemetryStats(bucket, phase);

        stats.samples += 1;
        this.updateTelemetryAverage(stats, 'avgCentroidSpeed', centroidSpeed);
        this.updateTelemetryAverage(stats, 'avgNodeSpeed', nodeSpeed);
        this.updateTelemetryAverage(stats, 'avgSpan', span);
        this.updateTelemetryAverage(stats, 'avgCompression', compression);
        this.updateTelemetryAverage(stats, 'avgExpansion', expansion);
        stats.peakCentroidSpeed = Math.max(stats.peakCentroidSpeed || 0, centroidSpeed);

        playerTelemetry.lastCentroidX = centroidX;
        playerTelemetry.lastCentroidY = centroidY;
        playerTelemetry.current = {
            bucket,
            phase,
            centroidSpeed,
            nodeSpeed,
            vx,
            vy,
            span,
            compression,
            expansion
        };
    },
    getPlayerCapabilityReference(phase = this.getTelemetryPhaseBucket(), bucket = this.getTelemetryClusterBucket()) {
        if (!this.ecoTelemetry) {
            this.ecoTelemetry = this.createDefaultEcoTelemetry();
        }

        const live = this.ecoTelemetry.player.current || {};
        const bucketStats = this.ecoTelemetry.player.stats[bucket] || {};
        const phaseStats = bucketStats[phase] || null;
        const fallbackPhaseStats = bucketStats.cruise || null;
        const reference = phaseStats?.samples > 10 ? phaseStats : fallbackPhaseStats?.samples > 10 ? fallbackPhaseStats : null;
        return {
            samples: reference?.samples || 0,
            avgCentroidSpeed: reference?.avgCentroidSpeed || live.centroidSpeed || 0,
            peakCentroidSpeed: Math.max(reference?.peakCentroidSpeed || 0, live.centroidSpeed || 0),
            avgNodeSpeed: reference?.avgNodeSpeed || live.nodeSpeed || 0,
            avgSpan: reference?.avgSpan || live.span || this.getFormationSpan?.() || 0
        };
    },
    ensurePreyStateStats(archetype, state) {
        if (!this.ecoTelemetry) {
            this.ecoTelemetry = this.createDefaultEcoTelemetry();
        }
        if (!this.ecoTelemetry.prey.stateStats[archetype]) {
            this.ecoTelemetry.prey.stateStats[archetype] = {};
        }
        if (!this.ecoTelemetry.prey.stateStats[archetype][state]) {
            this.ecoTelemetry.prey.stateStats[archetype][state] = {
                entries: 0,
                samples: 0,
                time: 0,
                avgThreat: 0,
                avgSpeed: 0,
                transitions: {}
            };
        }
        return this.ecoTelemetry.prey.stateStats[archetype][state];
    },
    ensurePreyChaseStats(archetype) {
        if (!this.ecoTelemetry) {
            this.ecoTelemetry = this.createDefaultEcoTelemetry();
        }
        if (!this.ecoTelemetry.prey.chaseStats[archetype]) {
            this.ecoTelemetry.prey.chaseStats[archetype] = {
                started: 0,
                devoured: 0,
                escaped: 0,
                aborted: 0,
                avgDuration: 0,
                avgStartDistance: 0,
                avgClosestDistance: 0,
                avgPeakThreat: 0,
                avgBurstCount: 0
            };
        }
        return this.ecoTelemetry.prey.chaseStats[archetype];
    },
    notePreyStateTransition(prey, nextState, context = {}) {
        if (!prey || !nextState) {
            return;
        }

        const previousState = prey.behaviorState || '';
        const stateStats = this.ensurePreyStateStats(prey.archetype || 'skittish', nextState);
        if (context.force !== true && previousState === nextState) {
            return;
        }

        stateStats.entries += 1;
        if (previousState && context.force !== true) {
            stateStats.transitions[previousState] = (stateStats.transitions[previousState] || 0) + 1;
        }
        prey.behaviorState = nextState;
        prey.behaviorStateAge = 0;
        prey.behaviorStateTime = 0;
        if (context.force !== true) {
            prey.alertPulse = Math.max(prey.alertPulse || 0, nextState === 'burst' ? 1 : nextState === 'brace' ? 0.82 : nextState === 'evade' ? 0.58 : 0.34);
        }
    },
    recordPreyStateTelemetry(prey, threat, simDt) {
        if (!prey || simDt <= 0) {
            return;
        }

        const stateStats = this.ensurePreyStateStats(prey.archetype || 'skittish', prey.behaviorState || 'graze');
        stateStats.samples += 1;
        stateStats.time += simDt;
        this.updateTelemetryAverage(stateStats, 'avgThreat', threat?.threat ?? prey.lastThreat ?? 0);
        this.updateTelemetryAverage(stateStats, 'avgSpeed', Math.hypot(prey.vx || 0, prey.vy || 0));
    },
    startPreyChaseTelemetry(prey, threat) {
        if (!prey || !this.ecoTelemetry || this.ecoTelemetry.prey.activeChases[prey.id]) {
            return;
        }

        const chaseStats = this.ensurePreyChaseStats(prey.archetype || 'skittish');
        chaseStats.started += 1;
        this.ecoTelemetry.prey.activeChases[prey.id] = {
            preyId: prey.id,
            archetype: prey.archetype || 'skittish',
            startedAt: this.worldTime || 0,
            startDistance: threat?.distanceFromCenter || 0,
            closestDistance: threat?.distanceFromCenter || 0,
            peakThreat: threat?.threat || 0,
            burstCount: prey.behaviorState === 'burst' ? 1 : 0
        };
    },
    finishPreyChaseTelemetry(prey, outcome = 'aborted', extra = {}) {
        if (!prey || !this.ecoTelemetry) {
            return;
        }

        const chase = this.ecoTelemetry.prey.activeChases[prey.id];
        if (!chase) {
            return;
        }

        const chaseStats = this.ensurePreyChaseStats(chase.archetype);
        const duration = Math.max(0, (this.worldTime || 0) - (chase.startedAt || this.worldTime || 0));
        if (outcome === 'devoured') {
            chaseStats.devoured += 1;
        } else if (outcome === 'escaped' || outcome === 'disengaged') {
            chaseStats.escaped += 1;
        } else {
            chaseStats.aborted += 1;
        }
        const completedCount = chaseStats.devoured + chaseStats.escaped + chaseStats.aborted;
        chaseStats.avgDuration = completedCount <= 1 ? duration : chaseStats.avgDuration + (duration - chaseStats.avgDuration) / completedCount;
        chaseStats.avgStartDistance = completedCount <= 1 ? chase.startDistance : chaseStats.avgStartDistance + (chase.startDistance - chaseStats.avgStartDistance) / completedCount;
        chaseStats.avgClosestDistance = completedCount <= 1 ? chase.closestDistance : chaseStats.avgClosestDistance + (chase.closestDistance - chaseStats.avgClosestDistance) / completedCount;
        chaseStats.avgPeakThreat = completedCount <= 1 ? chase.peakThreat : chaseStats.avgPeakThreat + (chase.peakThreat - chaseStats.avgPeakThreat) / completedCount;
        chaseStats.avgBurstCount = completedCount <= 1 ? chase.burstCount : chaseStats.avgBurstCount + (chase.burstCount - chaseStats.avgBurstCount) / completedCount;

        this.ecoTelemetry.prey.recentChases.unshift({
            preyId: chase.preyId,
            archetype: chase.archetype,
            outcome,
            duration,
            startDistance: chase.startDistance,
            closestDistance: chase.closestDistance,
            peakThreat: chase.peakThreat,
            burstCount: chase.burstCount,
            finishedAt: this.worldTime || 0,
            ...extra
        });
        if (this.ecoTelemetry.prey.recentChases.length > 18) {
            this.ecoTelemetry.prey.recentChases.length = 18;
        }
        delete this.ecoTelemetry.prey.activeChases[prey.id];
    },
    clearActivePreyChases(reason = 'reset') {
        if (!this.ecoTelemetry) {
            return;
        }
        Object.keys(this.ecoTelemetry.prey.activeChases || {}).forEach((preyId) => {
            const prey = this.prey.find((entry) => entry.id === preyId) || { id: preyId, archetype: this.ecoTelemetry.prey.activeChases[preyId].archetype };
            this.finishPreyChaseTelemetry(prey, 'aborted', { reason });
        });
    },
    getEcoTelemetrySnapshot() {
        return cloneData({
            player: {
                current: this.ecoTelemetry?.player?.current || {},
                stats: this.ecoTelemetry?.player?.stats || {}
            },
            prey: {
                stateStats: this.ecoTelemetry?.prey?.stateStats || {},
                chaseStats: this.ecoTelemetry?.prey?.chaseStats || {},
                activeChases: this.ecoTelemetry?.prey?.activeChases || {},
                recentChases: this.ecoTelemetry?.prey?.recentChases || []
            }
        });
    },
    refreshPreySpatialCache() {
        const cellSize = 188;
        this.preySpatialCache = {
            nodes: buildSpatialHash(this.activeNodes, cellSize),
            prey: buildSpatialHash(this.prey, cellSize),
            groups: new Map()
        };

        this.prey.forEach((prey) => {
            const groupKey = prey.groupId || prey.archetype || 'solo';
            if (!this.preySpatialCache.groups.has(groupKey)) {
                this.preySpatialCache.groups.set(groupKey, []);
            }
            this.preySpatialCache.groups.get(groupKey).push(prey);
        });
    },
    pickNearestNode(x, y) {
        const candidates = querySpatialHash(this.preySpatialCache?.nodes, x, y, 260);
        let best = null;
        let bestDistance = Infinity;
        (candidates.length > 0 ? candidates : this.activeNodes).forEach((node) => {
            const dx = node.x - x;
            const dy = node.y - y;
            const distance = dx * dx + dy * dy;
            if (distance < bestDistance) {
                best = node;
                bestDistance = distance;
            }
        });
        return best;
    },
    pickNearbyNodes(x, y, limit = 4, radius = 128) {
        const radiusSq = radius * radius;
        const candidates = [];
        querySpatialHash(this.preySpatialCache?.nodes, x, y, radius, () => true).forEach((node) => {
            const dx = node.x - x;
            const dy = node.y - y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq > radiusSq) {
                return;
            }
            candidates.push({ node, distanceSq });
        });

        candidates.sort((a, b) => a.distanceSq - b.distanceSq);
        return candidates.slice(0, limit).map((entry) => entry.node);
    },
    pickNearbyPrey(target, radius = 220, limit = 6) {
        const radiusSq = radius * radius;
        const matches = [];
        querySpatialHash(this.preySpatialCache?.prey, target.x, target.y, radius, (prey) => prey.id !== target.id).forEach((prey) => {
            const dx = prey.x - target.x;
            const dy = prey.y - target.y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq > radiusSq) {
                return;
            }
            matches.push({ prey, distanceSq });
        });
        matches.sort((a, b) => a.distanceSq - b.distanceSq);
        return matches.slice(0, limit).map((entry) => entry.prey);
    },
    getPreyBehaviorProfile(prey) {
        const archetype = prey?.archetype || 'skittish';
        const dominance = clamp(((this.activeNodes?.length || DEFAULT_BASE_CHAIN.length) - 8) / 14, 0, 1);
        const profile = {
            idleState: 'graze',
            alertEnter: 0.18,
            evadeEnter: 0.34,
            burstEnter: 0.68,
            grazeExit: 0.08,
            recoverEnter: 0.18,
            braceEnter: 0.64,
            braceRelease: 0.86,
            burstDuration: 0.54,
            recoverDuration: 0.92,
            alarmDecay: 0.8,
            fearGain: 1.18,
            fearDecay: 0.74,
            dominanceDrop: 0.18,
            speedCapMul: 1.42,
            nativeSpeedMuls: { graze: 0.46, alert: 0.66, evade: 0.82, burst: 1.06, recover: 0.58, brace: 0.44, schooling: 0.52 },
            capabilityRatios: { graze: 0.36, alert: 0.62, evade: 0.86, burst: 1.04, recover: 0.54, brace: 0.48, schooling: 0.46 },
            accelMuls: { graze: 0.6, alert: 0.92, evade: 1.16, burst: 1.38, recover: 0.82, brace: 0.58, schooling: 0.72 },
            turnRates: { graze: 2.2, alert: 3.6, evade: 5.1, burst: 6.7, recover: 3.2, brace: 4.2, schooling: 2.8 },
            awayWeight: { graze: 0.22, alert: 0.78, evade: 1.02, burst: 1.22, recover: 0.62, brace: 0.42, schooling: 0.34 },
            wanderWeight: { graze: 0.82, alert: 0.22, evade: 0.08, burst: 0.02, recover: 0.28, brace: 0.04, schooling: 0.14 },
            schoolWeight: { graze: 0.12, alert: 0.18, evade: 0.12, burst: 0.04, recover: 0.2, brace: 0.04, schooling: 0.4 },
            strafeWeight: { graze: 0.08, alert: 0.16, evade: 0.22, burst: 0.34, recover: 0.14, brace: 0.46, schooling: 0.1 },
            jitterWeight: { graze: 0.08, alert: 0.14, evade: 0.2, burst: 0.34, recover: 0.1, brace: 0.18, schooling: 0.12 },
            staminaDrain: 0.86,
            staminaRecover: 0.56,
            dominance
        };

        if (archetype === 'school') {
            profile.idleState = 'schooling';
            profile.alertEnter = 0.16;
            profile.evadeEnter = 0.28;
            profile.burstEnter = 0.58;
            profile.grazeExit = 0.1;
            profile.speedCapMul = 1.34;
            profile.dominanceDrop = 0.16;
            profile.capabilityRatios.schooling = 0.5;
            profile.capabilityRatios.evade = 0.9;
            profile.capabilityRatios.burst = 1.08;
            profile.nativeSpeedMuls.schooling = 0.58;
            profile.nativeSpeedMuls.burst = 1.1;
            profile.schoolWeight.schooling = 0.62;
            profile.schoolWeight.alert = 0.34;
            profile.schoolWeight.recover = 0.28;
            profile.jitterWeight.burst = 0.52;
        } else if (archetype === 'bulwark') {
            profile.alertEnter = 0.2;
            profile.evadeEnter = 0.3;
            profile.burstEnter = 0.84;
            profile.braceEnter = 0.46;
            profile.braceRelease = 0.68;
            profile.grazeExit = 0.12;
            profile.speedCapMul = 1.1;
            profile.dominanceDrop = 0.22;
            profile.capabilityRatios.graze = 0.3;
            profile.capabilityRatios.alert = 0.48;
            profile.capabilityRatios.evade = 0.68;
            profile.capabilityRatios.burst = 0.82;
            profile.capabilityRatios.brace = 0.42;
            profile.nativeSpeedMuls.graze = 0.38;
            profile.nativeSpeedMuls.evade = 0.7;
            profile.nativeSpeedMuls.brace = 0.4;
            profile.awayWeight.brace = 0.24;
            profile.strafeWeight.brace = 0.64;
            profile.jitterWeight.burst = 0.18;
            profile.staminaDrain = 0.54;
            profile.staminaRecover = 0.48;
        } else if (archetype === 'weakspot') {
            profile.alertEnter = 0.18;
            profile.evadeEnter = 0.32;
            profile.burstEnter = 0.62;
            profile.grazeExit = 0.1;
            profile.speedCapMul = 1.22;
            profile.dominanceDrop = 0.2;
            profile.capabilityRatios.alert = 0.6;
            profile.capabilityRatios.evade = 0.74;
            profile.capabilityRatios.burst = 0.94;
            profile.strafeWeight.alert = 0.34;
            profile.strafeWeight.evade = 0.62;
            profile.strafeWeight.burst = 0.72;
            profile.strafeWeight.recover = 0.22;
            profile.wanderWeight.graze = 0.42;
        } else if (archetype === 'apex') {
            profile.alertEnter = 0.2;
            profile.evadeEnter = 0.36;
            profile.burstEnter = 0.68;
            profile.braceEnter = 0.4;
            profile.braceRelease = 0.66;
            profile.grazeExit = 0.12;
            profile.speedCapMul = 1.18;
            profile.dominanceDrop = 0.24;
            profile.capabilityRatios.alert = 0.58;
            profile.capabilityRatios.evade = 0.76;
            profile.capabilityRatios.burst = 0.9;
            profile.capabilityRatios.brace = 0.46;
            profile.strafeWeight.alert = 0.24;
            profile.strafeWeight.evade = 0.4;
            profile.strafeWeight.brace = 0.52;
            profile.nativeSpeedMuls.brace = 0.42;
            profile.staminaDrain = 0.62;
            profile.staminaRecover = 0.42;
        } else {
            profile.capabilityRatios.evade = 0.92;
            profile.capabilityRatios.burst = 1.12;
            profile.nativeSpeedMuls.evade = 0.88;
            profile.nativeSpeedMuls.burst = 1.14;
        }

        return profile;
    },
    getPreyPhaseAggro(phase) {
        switch (phase) {
            case 'stable':
                return 0.16;
            case 'pursuit':
                return 0.54;
            case 'hunt':
                return 0.76;
            case 'burst':
                return 1;
            default:
                return 0.32;
        }
    },
    buildSchoolSteer(prey, nearbyPrey, threat) {
        if (!nearbyPrey.length || prey.schoolCohesion <= 0) {
            return { x: 0, y: 0, alarm: 0 };
        }

        let cohesionX = 0;
        let cohesionY = 0;
        let alignX = 0;
        let alignY = 0;
        let separationX = 0;
        let separationY = 0;
        let alarm = 0;
        let count = 0;

        nearbyPrey.forEach((other) => {
            if (other.id === prey.id) {
                return;
            }
            if (prey.groupId && other.groupId && prey.groupId !== other.groupId && prey.archetype !== 'school') {
                return;
            }
            const dx = prey.x - other.x;
            const dy = prey.y - other.y;
            const distance = Math.hypot(dx, dy) || 0.0001;
            const avoid = clamp(1 - distance / Math.max(40, prey.schoolRadius * 0.4), 0, 1);
            cohesionX += other.x;
            cohesionY += other.y;
            alignX += other.vx;
            alignY += other.vy;
            separationX += dx / distance * avoid;
            separationY += dy / distance * avoid;
            alarm = Math.max(alarm, other.alarm || 0, (other.behaviorState === 'burst' ? 0.36 : 0) + (other.fear || 0) * 0.24);
            count += 1;
        });

        if (count <= 0) {
            return { x: 0, y: 0, alarm: 0 };
        }

        cohesionX = cohesionX / count - prey.x;
        cohesionY = cohesionY / count - prey.y;
        return {
            x: cohesionX * prey.schoolCohesion * (1 - threat.threat * 0.62)
                + alignX * prey.schoolAlignment * 0.024
                + separationX * prey.schoolSeparation * (0.62 + threat.threat * 0.8),
            y: cohesionY * prey.schoolCohesion * (1 - threat.threat * 0.62)
                + alignY * prey.schoolAlignment * 0.024
                + separationY * prey.schoolSeparation * (0.62 + threat.threat * 0.8),
            alarm
        };
    },
    evaluatePreyThreat(prey, nearbyNodes, nearbyPrey) {
        const telemetry = this.ecoTelemetry?.player?.current || {};
        const phase = telemetry.phase || this.getTelemetryPhaseBucket();
        const bucket = telemetry.bucket || this.getTelemetryClusterBucket();
        const playerRef = this.getPlayerCapabilityReference(phase, bucket);
        const toCenterX = prey.x - this.player.centroidX;
        const toCenterY = prey.y - this.player.centroidY;
        const distanceFromCenter = Math.hypot(toCenterX, toCenterY);
        const away = normalize(toCenterX, toCenterY, Math.cos(prey.escapeAngle || prey.seed), Math.sin(prey.escapeAngle || prey.seed));
        const playerVx = Number.isFinite(telemetry.vx) ? telemetry.vx : this.intent.flowX * (telemetry.centroidSpeed || 0);
        const playerVy = Number.isFinite(telemetry.vy) ? telemetry.vy : this.intent.flowY * (telemetry.centroidSpeed || 0);
        const preyAlongGap = prey.vx * away.x + prey.vy * away.y;
        const playerAlongGap = playerVx * away.x + playerVy * away.y;
        const gapSpeed = playerAlongGap - preyAlongGap;
        const gapNorm = clamp(gapSpeed / Math.max(48, playerRef.avgCentroidSpeed || telemetry.centroidSpeed || 72), 0, 1.5);
        let nodeThreat = 0;
        let crowd = 0;

        nearbyNodes.forEach((node) => {
            const dx = prey.x - node.x;
            const dy = prey.y - node.y;
            const distance = Math.hypot(dx, dy) || 0.0001;
            const weight = clamp(1 - distance / (prey.radius + 220 + (prey.isObjective ? 40 : 0)), 0, 1);
            const nodeSpeed = Math.hypot(node.vx || 0, node.vy || 0);
            const drive = normalize(node.vx || 0, node.vy || 0, away.x, away.y);
            nodeThreat += weight * (0.42 + clamp(nodeSpeed / 140, 0, 1.2) * 0.34 + Math.max(0, drive.x * away.x + drive.y * away.y) * 0.24);
            crowd = Math.max(crowd, weight);
        });
        nodeThreat = clamp(nodeThreat / Math.max(1, Math.sqrt(nearbyNodes.length || 1)), 0, 1.28);

        const schoolAlarm = nearbyPrey.reduce((best, other) => Math.max(best, other.alarm || 0), 0);
        const phaseAggro = this.getPreyPhaseAggro(phase);
        const pressure = clamp((prey.attachments?.length || 0) / Math.max(1, prey.maxAnchors || 1), 0, 1.4);
        const distanceThreat = clamp(1 - (distanceFromCenter - (prey.isObjective ? 260 : 330)) / (prey.isObjective ? 440 : 560), 0, 1.2);
        const threatValue = clamp(
            distanceThreat * 0.42
            + nodeThreat * 0.34
            + gapNorm * 0.34
            + phaseAggro * 0.24
            + pressure * 0.72
            + schoolAlarm * 0.26
            + (prey.panic || 0) * 0.24,
            0,
            1.9
        );

        return {
            phase,
            bucket,
            away,
            distanceFromCenter,
            gapSpeed,
            gapNorm,
            crowd,
            schoolAlarm,
            phaseAggro,
            playerRefSpeed: Math.max(playerRef.avgCentroidSpeed || 0, telemetry.centroidSpeed || 0, 64),
            threat: threatValue
        };
    },
    updateWeakspotDefense(prey, threat, simDt) {
        if (!(prey.weakArc > 0)) {
            return;
        }
        const threatAngle = Math.atan2(this.player.centroidY - prey.y, this.player.centroidX - prey.x);
        const sway = Math.sin(this.worldTime * (1.6 + prey.rotationMul * 0.18) + prey.seed * 3.4) * 0.18;
        const stateBias = prey.behaviorState === 'burst' ? 0.26 : prey.behaviorState === 'brace' ? 0.22 : prey.behaviorState === 'evade' ? 0.14 : 0.06;
        prey.weakAngle = dampAngle(prey.weakAngle, threatAngle + Math.PI + sway + threat.gapNorm * stateBias, (prey.protectTurnRate || 2.4) + stateBias * 2.4, simDt);
    },
    updateBulwarkGuard(prey, threat, profile, simDt) {
        if (prey.bulwarkChargeRate <= 0) {
            prey.guardPulse = Math.max(0, (prey.guardPulse || 0) - simDt * 1.8);
            prey.pushCharge = Math.max(0, (prey.pushCharge || 0) - simDt * 1.1);
            return;
        }

        const braceBias = prey.behaviorState === 'brace' ? 1.18 : prey.behaviorState === 'evade' ? 0.84 : 0.42;
        prey.pushCharge = clamp(
            prey.pushCharge + (threat.threat * prey.bulwarkChargeRate * braceBias - (prey.bulwarkReleaseRate || 1) * 0.42) * simDt,
            0,
            1.5
        );
        prey.guardPulse = Math.max(0, (prey.guardPulse || 0) - simDt * 2.15);
        if (
            prey.behaviorState === 'brace'
            && threat.threat > profile.braceRelease
            && prey.pushCharge > 0.92
            && prey.guardPulse <= 0.05
        ) {
            prey.guardPulse = prey.bulwarkPulse || 1;
            prey.pushCharge *= 0.4;
            prey.alertPulse = Math.max(prey.alertPulse || 0, 0.92);
            this.createRing(prey.x, prey.y, prey.radius + 24, prey.signalColor || prey.color, 0.14, 2, 'prey-guard');
        }
    },
    updatePreyStateMachine(prey, threat, profile, simDt) {
        const baseIdleState = profile.idleState || 'graze';
        prey.fear = clamp(
            prey.fear + (threat.threat * profile.fearGain - profile.fearDecay - (prey.behaviorState === baseIdleState ? 0.12 : 0)) * simDt,
            0,
            1.8
        );
        prey.alarm = clamp(
            Math.max((prey.alarm || 0) - simDt * profile.alarmDecay, threat.schoolAlarm * 0.92, prey.fear * 0.72),
            0,
            1.8
        );
        prey.behaviorStateAge = (prey.behaviorStateAge || 0) + simDt;
        prey.behaviorStateTime = (prey.behaviorStateTime || 0) + simDt;
        prey.stamina = clamp(
            prey.stamina + (prey.behaviorState === 'burst' ? -profile.staminaDrain : profile.staminaRecover * (prey.behaviorState === 'recover' ? 1.2 : 0.82)) * simDt,
            0,
            1.2
        );
        prey.burstTimer = Math.max(0, (prey.burstTimer || 0) - simDt);
        prey.recoverTimer = Math.max(0, (prey.recoverTimer || 0) - simDt);
        prey.braceTimer = Math.max(0, (prey.braceTimer || 0) - simDt);

        const compressionAccess = this.getCompressionAccess?.(prey, { encirclement: threat.crowd * 0.34 }) || 0;
        const canBurst = prey.stamina > 0.18 && prey.guardPulse <= 0.12 && threat.threat >= profile.burstEnter;
        const shouldBrace = prey.bulwarkChargeRate > 0 && threat.threat >= profile.braceEnter && compressionAccess < 0.72;
        const state = prey.behaviorState || baseIdleState;
        let nextState = state;

        if (state === 'burst') {
            if (prey.burstTimer <= 0) {
                nextState = 'recover';
            }
        } else if (state === 'brace') {
            if (prey.guardPulse > 0.12) {
                nextState = 'evade';
            } else if (prey.braceTimer <= 0 && threat.threat < profile.alertEnter) {
                nextState = 'recover';
            } else if (canBurst && threat.gapNorm > 0.42) {
                nextState = 'burst';
            }
        } else if (state === 'recover') {
            if (shouldBrace) {
                nextState = 'brace';
            } else if (canBurst && threat.gapNorm > 0.48) {
                nextState = 'burst';
            } else if (threat.threat >= profile.evadeEnter) {
                nextState = 'evade';
            } else if (prey.recoverTimer <= 0 && threat.threat < profile.grazeExit) {
                nextState = baseIdleState;
            }
        } else if (state === 'evade') {
            if (shouldBrace) {
                nextState = 'brace';
            } else if (canBurst && threat.gapNorm > 0.24) {
                nextState = 'burst';
            } else if (threat.threat < profile.recoverEnter && prey.behaviorStateAge > 0.44) {
                nextState = 'recover';
            }
        } else if (state === 'alert') {
            if (shouldBrace) {
                nextState = 'brace';
            } else if (threat.threat >= profile.evadeEnter || prey.attachments.length > 0) {
                nextState = 'evade';
            } else if (canBurst && threat.gapNorm > 0.32) {
                nextState = 'burst';
            } else if (threat.threat < profile.grazeExit && prey.behaviorStateAge > 0.3) {
                nextState = baseIdleState;
            }
        } else {
            if (shouldBrace) {
                nextState = 'brace';
            } else if (threat.threat >= profile.evadeEnter || prey.attachments.length > 0) {
                nextState = 'evade';
            } else if (canBurst && threat.gapNorm > 0.44) {
                nextState = 'burst';
            } else if (threat.threat >= profile.alertEnter || threat.schoolAlarm > 0.24) {
                nextState = 'alert';
            }
        }

        if (nextState !== state) {
            this.notePreyStateTransition(prey, nextState, { threat: threat.threat });
            if (nextState === 'burst') {
                prey.burstTimer = profile.burstDuration * (0.86 + prey.stamina * 0.32);
                prey.stamina = Math.max(0, prey.stamina - 0.34);
                prey.alarm = Math.max(prey.alarm || 0, 1.1);
                if (this.ecoTelemetry?.prey?.activeChases?.[prey.id]) {
                    this.ecoTelemetry.prey.activeChases[prey.id].burstCount += 1;
                }
            } else if (nextState === 'recover') {
                prey.recoverTimer = profile.recoverDuration;
            } else if (nextState === 'brace') {
                prey.braceTimer = 0.48 + threat.threat * 0.24;
                prey.alarm = Math.max(prey.alarm || 0, 0.92);
            }
        }

        if (prey.behaviorState !== baseIdleState || threat.threat > 0.18 || prey.attachments.length > 0) {
            this.startPreyChaseTelemetry(prey, threat);
        } else {
            this.finishPreyChaseTelemetry(prey, 'disengaged');
        }
    },
    updatePrey(simDt) {
        this.refreshPreySpatialCache();
        for (let i = this.prey.length - 1; i >= 0; i -= 1) {
            const prey = this.prey[i];
            const distanceFromCenter = Math.hypot(prey.x - this.player.centroidX, prey.y - this.player.centroidY);
            if (distanceFromCenter > 3200) {
                this.finishPreyChaseTelemetry(prey, 'escaped', { reason: 'out-of-range' });
                // swap-and-pop: O(1) removal instead of splice O(n)
                const last = this.prey.length - 1;
                if (i !== last) { this.prey[i] = this.prey[last]; }
                this.prey.pop();
                continue;
            }

            const nearbyNodes = this.pickNearbyNodes(prey.x, prey.y, 6, 240 + prey.radius + (prey.isObjective ? 60 : 0));
            const nearbyPrey = prey.schoolRadius > 0 ? this.pickNearbyPrey(prey, prey.schoolRadius, 6) : [];
            const profile = this.getPreyBehaviorProfile(prey);
            const threat = this.evaluatePreyThreat(prey, nearbyNodes, nearbyPrey);
            this.updatePreyStateMachine(prey, threat, profile, simDt);
            const wanderAngle = this.worldTime * (prey.shape === 'triangle' ? 2.4 : prey.shape === 'circle' ? 1.6 : 1.05) + prey.seed * 4.2;
            const wobble = Math.sin(this.worldTime * (prey.shape === 'triangle' ? 7.2 : 4.6) + prey.seed) * (prey.shape === 'triangle' ? 0.74 : prey.shape === 'circle' ? 0.42 : 0.18);
            const wander = {
                x: Math.cos(wanderAngle + wobble),
                y: Math.sin(wanderAngle * 0.84 - wobble)
            };
            const attachmentPenalty = clamp(prey.attachments.length / Math.max(prey.maxAnchors, 1), 0, 1);
            const school = this.buildSchoolSteer(prey, nearbyPrey, threat);
            prey.groupAlarm = school.alarm || 0;
            prey.alarm = Math.max(prey.alarm || 0, prey.groupAlarm * 0.8);
            this.updateWeakspotDefense(prey, threat, simDt);
            this.updateBulwarkGuard(prey, threat, profile, simDt);

            let strafeX = 0;
            let strafeY = 0;
            if (prey.archetype === 'weakspot' || prey.archetype === 'apex' || prey.behaviorState === 'brace') {
                const side = Math.sin(this.worldTime * 1.8 + prey.seed * 2.4) >= 0 ? 1 : -1;
                strafeX = Math.cos(prey.weakAngle + side * Math.PI * 0.5);
                strafeY = Math.sin(prey.weakAngle + side * Math.PI * 0.5);
            }

            const stateKey = prey.behaviorState || profile.idleState;
            const desiredX = threat.away.x * (profile.awayWeight[stateKey] || 0.6)
                + wander.x * prey.wander * (profile.wanderWeight[stateKey] || 0.12) * (1 - attachmentPenalty * 0.7)
                + school.x * (profile.schoolWeight[stateKey] || 0.1) * 0.016
                + strafeX * (profile.strafeWeight[stateKey] || 0.08)
                + Math.cos(prey.seed * 11 + this.worldTime * 5.8) * (profile.jitterWeight[stateKey] || 0.12);
            const desiredY = threat.away.y * (profile.awayWeight[stateKey] || 0.6)
                + wander.y * prey.wander * (profile.wanderWeight[stateKey] || 0.12) * (1 - attachmentPenalty * 0.7)
                + school.y * (profile.schoolWeight[stateKey] || 0.1) * 0.016
                + strafeY * (profile.strafeWeight[stateKey] || 0.08)
                + Math.sin(prey.seed * 7 + this.worldTime * 5.2) * (profile.jitterWeight[stateKey] || 0.12);
            const desired = normalize(desiredX, desiredY, threat.away.x, threat.away.y);
            const desiredAngle = Math.atan2(desired.y, desired.x);
            prey.escapeAngle = dampAngle(prey.escapeAngle || desiredAngle, desiredAngle, profile.turnRates[stateKey] || 4.2, simDt);
            prey.escapeDirX = Math.cos(prey.escapeAngle);
            prey.escapeDirY = Math.sin(prey.escapeAngle);

            const capabilityRatio = Math.max(0.28, (profile.capabilityRatios[stateKey] || 0.58) - profile.dominance * profile.dominanceDrop);
            const nativeSpeed = prey.speed * (profile.nativeSpeedMuls[stateKey] || 0.62);
            const targetSpeed = clamp(
                Math.max(nativeSpeed, threat.playerRefSpeed * capabilityRatio) * (1 - attachmentPenalty * 0.46),
                prey.speed * 0.34,
                prey.speed * profile.speedCapMul
            ) * ((prey.guardPulse || 0) > 0.18 ? 0.94 : 1);
            const accel = prey.accel
                * (profile.accelMuls[stateKey] || 0.9)
                * (1 + threat.gapNorm * 0.28 + prey.panic * 0.22 + (prey.isObjective ? 0.14 : 0))
                * (1 - attachmentPenalty * 0.48);
            prey.behaviorTargetSpeed = targetSpeed;
            prey.behaviorTargetAccel = accel;

            prey.vx += prey.escapeDirX * accel * simDt;
            prey.vy += prey.escapeDirY * accel * simDt;

            if (prey.attachments.length > 0) {
                const thrashAngle = this.worldTime * (8 + prey.rotationMul * 2.8) + prey.seed * 5.4;
                prey.vx += Math.cos(thrashAngle) * prey.accel * 0.24 * simDt;
                prey.vy += Math.sin(thrashAngle * 0.92) * prey.accel * 0.24 * simDt;
                prey.spin += simDt * (6 + prey.attachments.length * 2.5);
            }

            const speedLimit = targetSpeed;
            const speed = Math.hypot(prey.vx, prey.vy);
            if (speed > speedLimit) {
                const scale = speedLimit / Math.max(speed, 0.0001);
                prey.vx *= scale;
                prey.vy *= scale;
            }

            const drag = prey.attachments.length > 0
                ? 2.05
                : stateKey === 'burst'
                    ? 0.86
                    : stateKey === 'brace'
                        ? 1.48
                        : prey.shape === 'square'
                            ? 1.28
                            : 0.94;
            prey.vx *= Math.exp(-drag * simDt);
            prey.vy *= Math.exp(-drag * simDt);
            prey.x += prey.vx * simDt;
            prey.y += prey.vy * simDt;

            prey.hitFlash = Math.max(0, prey.hitFlash - simDt * 4.8);
            prey.panic = Math.max(0, prey.panic - simDt * 0.72);
            prey.wound = Math.max(0, prey.wound - simDt * 0.34);
            prey.shudder = Math.max(0, prey.shudder - simDt * 1.9);
            prey.carve = Math.max(0, prey.carve - simDt * 0.52);
            prey.gorePulse = Math.max(0, prey.gorePulse - simDt * 1.85);
            prey.devourGlow = Math.max(0, prey.devourGlow - simDt * 1.2);
            prey.alertPulse = Math.max(0, (prey.alertPulse || 0) - simDt * 1.35);
            prey.spin *= Math.exp(-2.4 * simDt);
            prey.objectiveGlow = Math.max(0, (prey.objectiveGlow || 0) - simDt * 0.18);
            prey.lastThreat = threat.threat;
            prey.lastGapSpeed = threat.gapSpeed;
            prey.pulse += simDt * (2.4 + prey.pulseMul * 1.8 + threat.threat * 1.6 + attachmentPenalty * 1.5 + (prey.isObjective ? 1.6 : 0));
            prey.displayX = damp(prey.displayX, prey.x, 18, simDt);
            prey.displayY = damp(prey.displayY, prey.y, 18, simDt);
            const heading = Math.atan2(prey.vy || prey.escapeDirY || Math.sin(wanderAngle), prey.vx || prey.escapeDirX || Math.cos(wanderAngle));
            prey.displayRotation = dampAngle(prey.displayRotation, heading + prey.spin * 0.02, 12, simDt);
            this.recordPreyStateTelemetry(prey, threat, simDt);
            const chase = this.ecoTelemetry?.prey?.activeChases?.[prey.id];
            if (chase) {
                chase.closestDistance = Math.min(chase.closestDistance, threat.distanceFromCenter);
                chase.peakThreat = Math.max(chase.peakThreat, threat.threat);
            }
        }
    },
    resolvePreyNodeCollisions() {
        // Use shared alive-set so finishPreyDevour can mark deaths visible to this loop
        this._preyAliveSet = new Set(this.prey);
        for (let i = this.prey.length - 1; i >= 0; i -= 1) {
            const prey = this.prey[i];
            if (!prey || !this._preyAliveSet.has(prey)) {
                continue;
            }
            const candidates = this.pickNearbyNodes(prey.x, prey.y, 6, prey.radius + 126 + ((prey.guardPulse || 0) > 0.1 ? 24 : 0));
            if (candidates.length === 0) {
                const nearest = this.pickNearestNode(prey.x, prey.y);
                if (nearest) {
                    candidates.push(nearest);
                }
            }
            if (candidates.length === 0) {
                continue;
            }

            for (let j = 0; j < candidates.length; j += 1) {
                if (!this._preyAliveSet.has(prey)) {
                    break;
                }
                const node = candidates[j];
                const dx = prey.x - node.x;
                const dy = prey.y - node.y;
                const distance = Math.hypot(dx, dy) || 0.0001;
                const overlap = prey.radius + this.getNodeContactRadius(node) - distance;
                if (overlap <= 0) {
                    continue;
                }

                const nx = dx / distance;
                const ny = dy / distance;
                const existingAttachment = this.findPredationAttachment(prey, node.index);
                const guardPush = Math.max(0, prey.guardPulse || 0);
                const preyPush = existingAttachment ? 0.12 : guardPush > 0.08 ? 0.8 : 0.62;
                const nodePush = existingAttachment ? 0.08 : guardPush > 0.08 ? 0.42 : 0.24;
                prey.x += nx * overlap * preyPush;
                prey.y += ny * overlap * preyPush;
                node.x -= nx * overlap * nodePush;
                node.y -= ny * overlap * nodePush;

                if (guardPush > 0.08 && !existingAttachment) {
                    const repel = overlap * (18 + guardPush * 34);
                    node.vx -= nx * repel / Math.max(node.mass, 0.1);
                    node.vy -= ny * repel / Math.max(node.mass, 0.1);
                    prey.vx += nx * repel * 0.18 / Math.max(prey.mass, 0.1);
                    prey.vy += ny * repel * 0.18 / Math.max(prey.mass, 0.1);
                    this.damagePlayer(guardPush * 0.3, nx, ny, repel, node);
                }

                const impactScale = clamp(
                    (Math.hypot(node.vx, node.vy) + Math.max(0, node.predationWindow || 0) * 150 + overlap * 24) / 220,
                    0,
                    2
                );
                this.tryLatchPrey(prey, node, nx, ny, impactScale);
                if (!this._preyAliveSet.has(prey)) {
                    break;
                }

                if (!existingAttachment && prey.attachments.length === 0) {
                    prey.vx += nx * overlap * 10 / Math.max(prey.mass, 0.1);
                    prey.vy += ny * overlap * 10 / Math.max(prey.mass, 0.1);
                    node.vx -= nx * overlap * 8 / Math.max(node.mass, 0.1);
                    node.vy -= ny * overlap * 8 / Math.max(node.mass, 0.1);
                }
            }
        }
    }
};
