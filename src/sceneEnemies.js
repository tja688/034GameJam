const SceneEnemiesMixin = {
    getStageEncounterRules(stage = this.getCurrentStageDef?.()) {
        if (!stage) {
            return [];
        }
        return [
            ...(Array.isArray(stage.spawnRules) ? stage.spawnRules : []),
            ...(Array.isArray(stage.eliteRules) ? stage.eliteRules : [])
        ];
    },
    isEliteSpawnConfig(spawnConfig) {
        return !!(spawnConfig && (
            spawnConfig.encounterClass === 'elite'
            || spawnConfig.tier === 'elite'
            || spawnConfig.isElite === true
        ));
    },
    getStageInitialSpawnCount(rule) {
        if (this.isEliteSpawnConfig(rule)) {
            return Math.max(0, Math.round(rule?.desired || 0));
        }
        const stage = this.getCurrentStageDef?.();
        const density = Math.max(0, this.getRunTuningValue('gameplayPreyInitialDensityMul', 1))
            * Math.max(1, this.getRoundDifficultyMultiplier?.() || 1);
        const bonus = Math.round(this.getRunTuningValue('gameplayPreyInitialCountBonus', 0));
        const viewScale = this.getPreyInitialPopulationScale?.() || 1;
        const carryDensity = this.getRuleCarryDensityMul?.(rule, stage) || 1;
        return Math.max(rule.packMin || 1, Math.round(rule.desired * density * viewScale * carryDensity) + bonus);
    },
    getRuleCarryDensityMul(rule, stage = this.getCurrentStageDef?.(), nodeCount = this.getPlayerNodeCount?.()) {
        if ((rule?.tier || 'common') !== 'common') {
            return 1;
        }
        return this.getCurrentStageCarryProfile?.(stage, nodeCount)?.densityMul || 1;
    },
    getPreyEncounterDensityMul() {
        const baseDensity = this.getRunTuningValue('gameplayPreyEncounterDensityMul', 1);
        return clamp(baseDensity * Math.max(1, this.getRoundDifficultyMultiplier?.() || 1), 0.35, 8);
    },
    isPreyCameraPopulationScalingEnabled() {
        return this.getRunTuningToggle?.('gameplayPreyCameraScaleEnabled', true)
            && !!(this.cameraRig?.autoZoomEnabled || window.TUNING?.cameraAutoNodeZoomEnabled);
    },
    getPreyCameraPopulationViewScale() {
        if (!this.isPreyCameraPopulationScalingEnabled()) {
            return 1;
        }

        const zoom = Math.max(0.03, this.cameraRig?.zoom || 1);
        const referenceZoom = Math.max(0.12, this.getRunTuningValue('gameplayPreySpawnReferenceZoomMin', 0.68));
        const exponent = clamp(this.getRunTuningValue('gameplayPreyCameraScaleExponent', 0.55), 0.18, 1.2);
        const cap = Math.max(1, this.getRunTuningValue('gameplayPreyCameraScaleCap', 8));
        const zoomRatio = Math.max(1, referenceZoom / zoom);
        return clamp(Math.pow(zoomRatio * zoomRatio, exponent), 1, cap);
    },
    getPreyInitialPopulationScale() {
        const exponent = clamp(this.getRunTuningValue('gameplayPreyCameraSeedScaleExponent', 0.38), 0, 1);
        return Math.max(1, Math.pow(this.getPreyCameraPopulationViewScale(), exponent));
    },
    getPreySpawnPackScale(encounterMul = this.getPreyEncounterDensityMul(), viewScale = this.getPreyCameraPopulationViewScale()) {
        return 1
            + Math.max(0, encounterMul - 1) * 0.35
            + Math.max(0, viewScale - 1) * 0.6;
    },
    getPreyStagePopulationBudget(stage, encounterMul = this.getPreyEncounterDensityMul()) {
        const baseCap = Math.max(1, stage?.spawnCap || 1);
        const viewScale = this.getPreyCameraPopulationViewScale();
        const carryDensity = this.getCurrentStageCarryProfile?.(stage)?.densityMul || 1;
        const budgetScale = Math.max(0.55, encounterMul * viewScale * carryDensity);
        const softCap = Math.max(baseCap, Math.round(baseCap * budgetScale));
        const hardCapMul = Math.max(1.12, this.getRunTuningValue('gameplayPreyHardCapMul', 1.28));
        const hardCap = Math.max(softCap + 4, Math.round(softCap * hardCapMul));
        const baseNearby = Math.max(2, (stage?.spawnRules?.length || 0) + 2);
        const nearbyTarget = clamp(
            Math.round(baseNearby * budgetScale),
            baseNearby,
            Math.max(baseNearby + 1, softCap - 1)
        );
        return {
            viewScale,
            budgetScale,
            softCap,
            hardCap,
            nearbyTarget
        };
    },
    getPreySpawnViewportMetrics() {
        const viewportWidth = Math.max(1, this.cameraRig?.viewportWidth || this.scale?.width || 1280);
        const viewportHeight = Math.max(1, this.cameraRig?.viewportHeight || this.scale?.height || 720);
        const zoom = Math.max(0.03, this.cameraRig?.zoom || 1);
        const referenceZoomFloor = Math.max(0.35, this.getRunTuningValue('gameplayPreySpawnReferenceZoomMin', 0.68));
        // Auto node zoom is part of the intended play space, so spawn/cull must match the real view.
        // Manual debug zoom still clamps to a reference floor to avoid blowing up the sim budget.
        const spawnZoom = this.isPreyCameraPopulationScalingEnabled()
            ? zoom
            : Math.max(zoom, referenceZoomFloor);
        const halfWidth = viewportWidth * 0.5 / spawnZoom;
        const halfHeight = viewportHeight * 0.5 / spawnZoom;
        return {
            viewportWidth,
            viewportHeight,
            zoom,
            spawnZoom,
            halfWidth,
            halfHeight,
            viewRadius: Math.hypot(halfWidth, halfHeight)
        };
    },
    getPreySpawnRing(isObjective = false) {
        const metrics = this.getPreySpawnViewportMetrics();
        const encounterMul = this.getPreyEncounterDensityMul();
        const hidePaddingBase = Math.max(90, this.getRunTuningValue('gameplayPreySpawnHidePadding', 170));
        const hidePadding = Math.max(70, hidePaddingBase / Math.sqrt(encounterMul));
        const formationSafety = Math.max(130, this.getFormationSpan() + 90);
        const ringMin = Math.max(formationSafety, metrics.viewRadius + hidePadding);
        const ringThicknessBase = metrics.viewRadius * (isObjective ? 0.62 : 0.44);
        const ringThickness = Math.max(160, Math.min(760, ringThicknessBase * (0.8 + encounterMul * 0.22)));
        const ringMax = ringMin + ringThickness;
        return {
            ...metrics,
            ringMin,
            ringMax,
            ringThickness
        };
    },
    getPreySpawnPredictionState(ring, isObjective = false) {
        const telemetry = this.ecoTelemetry?.player?.current || {};
        const flow = this.getPreySpawnFlowDirection();
        const phase = this.getTelemetryPhaseBucket(telemetry.phase || this.intent?.pointerDrivePhase || this.intent?.burstPhase || 'cruise');
        const burstAggro = clamp(this.intent?.burstAggro ?? 0, 0, 1.5);
        const burstTempo = clamp(this.intent?.burstTempo ?? 0, 0, 1.5);
        const encounterMul = this.getPreyEncounterDensityMul();
        const phaseMul = phase === 'burst'
            ? 1.44
            : phase === 'hunt'
                ? 1.2
                : phase === 'pursuit'
                    ? 1.1
                    : 1;
        const lookAheadBase = Math.max(0.2, this.getRunTuningValue('gameplayPreySpawnLookAheadSec', 0.56));
        const lookAheadSec = clamp(lookAheadBase * phaseMul * (1 + burstAggro * 0.34 + burstTempo * 0.22), 0.2, 1.85);
        const rawSpeed = Number.isFinite(telemetry.centroidSpeed) ? telemetry.centroidSpeed : 0;
        const fallbackSpeed = this.getPlayerCapabilityReference?.()?.avgCentroidSpeed || 0;
        const centroidSpeed = Math.max(rawSpeed, fallbackSpeed, 72);
        const vx = Number.isFinite(telemetry.vx) ? telemetry.vx : flow.x * centroidSpeed;
        const vy = Number.isFinite(telemetry.vy) ? telemetry.vy : flow.y * centroidSpeed;
        const speedPadding = centroidSpeed * lookAheadSec;
        const phasePadding = phase === 'burst' ? 140 : phase === 'hunt' ? 92 : phase === 'pursuit' ? 56 : 20;
        const dynamicPadding = clamp(
            (speedPadding * 0.55 + phasePadding + burstAggro * 88 + burstTempo * 52) * (encounterMul > 1 ? 1 / Math.sqrt(encounterMul) : 1),
            80,
            980
        ) * (isObjective ? 1.12 : 1);
        const currentPlayerX = this.player.centroidX;
        const currentPlayerY = this.player.centroidY;
        const predictedPlayerX = currentPlayerX + vx * lookAheadSec + flow.x * dynamicPadding * 0.24;
        const predictedPlayerY = currentPlayerY + vy * lookAheadSec + flow.y * dynamicPadding * 0.24;
        const cameraX = Number.isFinite(this.cameraRig?.x) ? this.cameraRig.x : currentPlayerX;
        const cameraY = Number.isFinite(this.cameraRig?.y) ? this.cameraRig.y : currentPlayerY;
        const cameraTargetX = Number.isFinite(this.cameraRig?.targetX) ? this.cameraRig.targetX : cameraX;
        const cameraTargetY = Number.isFinite(this.cameraRig?.targetY) ? this.cameraRig.targetY : cameraY;
        const predictedCameraX = cameraTargetX + vx * lookAheadSec * 0.42;
        const predictedCameraY = cameraTargetY + vy * lookAheadSec * 0.42;
        const safeRadiusCurrent = ring.ringMin + dynamicPadding * 0.55;
        const safeRadiusPredicted = ring.ringMin + dynamicPadding * 0.38;
        const viewPadding = Math.max(96, this.getRunTuningValue('gameplayPreySpawnViewSafetyPadding', 180) + dynamicPadding * 0.24);
        const pathCorridorRadius = Math.max(130, this.getFormationSpan() * 0.32 + dynamicPadding * 0.14);
        return {
            flow,
            phase,
            lookAheadSec,
            dynamicPadding,
            currentPlayerX,
            currentPlayerY,
            predictedPlayerX,
            predictedPlayerY,
            cameraX,
            cameraY,
            predictedCameraX,
            predictedCameraY,
            halfWidth: ring.halfWidth,
            halfHeight: ring.halfHeight,
            safeRadiusCurrent,
            safeRadiusPredicted,
            viewPadding,
            pathCorridorRadius
        };
    },
    isPointInsidePreySpawnViewRect(x, y, centerX, centerY, halfWidth, halfHeight, padding = 0) {
        return x >= centerX - halfWidth - padding
            && x <= centerX + halfWidth + padding
            && y >= centerY - halfHeight - padding
            && y <= centerY + halfHeight + padding;
    },
    isPreySpawnPointSafe(x, y, prediction) {
        const currentDistance = Math.hypot(x - prediction.currentPlayerX, y - prediction.currentPlayerY);
        if (currentDistance < prediction.safeRadiusCurrent) {
            return false;
        }
        const predictedDistance = Math.hypot(x - prediction.predictedPlayerX, y - prediction.predictedPlayerY);
        if (predictedDistance < prediction.safeRadiusPredicted) {
            return false;
        }
        const insideCurrentView = this.isPointInsidePreySpawnViewRect(
            x,
            y,
            prediction.cameraX,
            prediction.cameraY,
            prediction.halfWidth,
            prediction.halfHeight,
            prediction.viewPadding
        );
        if (insideCurrentView) {
            return false;
        }
        const insidePredictedView = this.isPointInsidePreySpawnViewRect(
            x,
            y,
            prediction.predictedCameraX,
            prediction.predictedCameraY,
            prediction.halfWidth,
            prediction.halfHeight,
            prediction.viewPadding
        );
        if (insidePredictedView) {
            return false;
        }
        const corridorDistanceSq = distanceToSegmentSquared(
            x,
            y,
            prediction.currentPlayerX,
            prediction.currentPlayerY,
            prediction.predictedPlayerX,
            prediction.predictedPlayerY
        );
        return corridorDistanceSq >= prediction.pathCorridorRadius * prediction.pathCorridorRadius;
    },
    resolvePreySpawnPointSafety(x, y, anchor, prediction) {
        if (this.isPreySpawnPointSafe(x, y, prediction)) {
            return { x, y };
        }

        const baseAngle = Math.atan2(y - prediction.predictedPlayerY, x - prediction.predictedPlayerX);
        const minDistance = Math.max(anchor.safeMinDistance || anchor.ring.ringMin, prediction.safeRadiusCurrent + 24);
        const maxDistance = Math.max(minDistance + 140, anchor.safeMaxDistance || anchor.ring.ringMax);
        const attempts = 10;

        for (let i = 0; i < attempts; i += 1) {
            const ratio = i / Math.max(1, attempts - 1);
            const distance = lerp(minDistance, maxDistance, ratio) + Phaser.Math.FloatBetween(10, 84);
            const angle = baseAngle + Phaser.Math.FloatBetween(-0.85, 0.85) + (i % 2 === 0 ? 0 : (Math.PI * 0.16 * ratio));
            const candidateX = this.player.centroidX + Math.cos(angle) * distance;
            const candidateY = this.player.centroidY + Math.sin(angle) * distance;
            if (this.isPreySpawnPointSafe(candidateX, candidateY, prediction)) {
                return { x: candidateX, y: candidateY };
            }
        }

        const fallbackDistance = maxDistance + prediction.dynamicPadding * 0.12;
        return {
            x: this.player.centroidX + Math.cos(baseAngle) * fallbackDistance,
            y: this.player.centroidY + Math.sin(baseAngle) * fallbackDistance
        };
    },
    getPreySpawnAvailabilityDistance() {
        const metrics = this.getPreySpawnViewportMetrics();
        const encounterMul = this.getPreyEncounterDensityMul();
        return Math.max(860, metrics.viewRadius * (1.18 + 0.42 / Math.sqrt(encounterMul)));
    },
    getRuleEffectiveAliveCount(ruleId, availabilityDistance, options = {}) {
        if (!ruleId) {
            return 0;
        }
        const strict = options?.strict === true;
        const availabilitySq = availabilityDistance * availabilityDistance;
        let effective = 0;
        this.prey.forEach((prey) => {
            if (prey.isObjective || prey.spawnRuleId !== ruleId) {
                return;
            }
            if (strict) {
                effective += 1;
                return;
            }
            const dx = prey.x - this.player.centroidX;
            const dy = prey.y - this.player.centroidY;
            const distanceSq = dx * dx + dy * dy;
            effective += distanceSq <= availabilitySq ? 1 : 0.38;
        });
        return effective;
    },
    getEffectiveSpawnOccupancy(availabilityDistance) {
        const availabilitySq = availabilityDistance * availabilityDistance;
        let occupancy = 0;
        this.prey.forEach((prey) => {
            if (prey.isObjective) {
                return;
            }
            const dx = prey.x - this.player.centroidX;
            const dy = prey.y - this.player.centroidY;
            const distanceSq = dx * dx + dy * dy;
            occupancy += distanceSq <= availabilitySq ? 1 : 0.42;
        });
        return occupancy;
    },
    ensureEncounterPresence(stage, availabilityDistance, encounterMul) {
        if (!stage?.spawnRules?.length) {
            return;
        }
        const budget = this.getPreyStagePopulationBudget(stage, encounterMul);
        this.runState.encounterSpawnCooldown = Math.max(0, (this.runState.encounterSpawnCooldown || 0));
        if (this.runState.encounterSpawnCooldown > 0) {
            return;
        }

        const nearbyDistance = availabilityDistance * 0.88;
        const nearbyDistanceSq = nearbyDistance * nearbyDistance;
        let nearbyTotal = 0;
        const nearbyByRule = {};
        this.prey.forEach((prey) => {
            if (prey.isObjective) {
                return;
            }
            const dx = prey.x - this.player.centroidX;
            const dy = prey.y - this.player.centroidY;
            if (dx * dx + dy * dy > nearbyDistanceSq) {
                return;
            }
            nearbyTotal += 1;
            nearbyByRule[prey.spawnRuleId] = (nearbyByRule[prey.spawnRuleId] || 0) + 1;
        });

        const nearbyTarget = budget.nearbyTarget;
        if (nearbyTotal >= nearbyTarget) {
            return;
        }

        const hardCap = budget.hardCap;
        if (this.prey.length >= hardCap) {
            return;
        }

        let pickRule = stage.spawnRules[0];
        let pickScore = Number.POSITIVE_INFINITY;
        stage.spawnRules.forEach((rule) => {
            const desired = Math.max(1, Math.round(rule.desired * encounterMul * budget.viewScale * this.getRuleCarryDensityMul(rule, stage)));
            const nearby = nearbyByRule[rule.id] || 0;
            const score = nearby / Math.max(1, desired);
            if (score < pickScore) {
                pickScore = score;
                pickRule = rule;
            }
        });

        const deficit = Math.max(1, nearbyTarget - nearbyTotal);
        const packScale = this.getPreySpawnPackScale(encounterMul, budget.viewScale);
        const burstCap = Math.max(6, Math.round(this.getRunTuningValue('gameplayPreyBurstSpawnCap', 24)));
        const remainingCapacity = hardCap - this.prey.length;
        if (remainingCapacity <= 0) {
            return;
        }
        const burstCount = clamp(
            Math.min(deficit, Math.round((pickRule.packMax || 2) * packScale)),
            1,
            Math.min(burstCap, remainingCapacity)
        );
        this.spawnConfiguredPrey(pickRule, burstCount);
        this.runState.spawnTimers[pickRule.id] = Math.max(0.2, (pickRule.interval || 0.8) * 0.66);
        this.runState.encounterSpawnCooldown = clamp((pickRule.interval || 0.9) * 0.58, 0.3, 1.2);
    },
    getPreySpawnFlowDirection() {
        const heading = this.player?.heading ?? (-Math.PI * 0.5);
        const baseForward = vectorFromAngle(heading);
        const flow = normalize(
            this.intent?.flowX ?? baseForward.x,
            this.intent?.flowY ?? baseForward.y,
            baseForward.x,
            baseForward.y
        );
        return {
            x: flow.x,
            y: flow.y,
            angle: Math.atan2(flow.y, flow.x),
            moving: flow.length > 0.08
        };
    },
    scorePreySpawnCrowding(x, y, radius, spawnRuleId = '') {
        const radiusSq = radius * radius;
        let crowding = 0;
        for (let i = 0; i < this.prey.length; i += 1) {
            const prey = this.prey[i];
            const dx = prey.x - x;
            const dy = prey.y - y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq >= radiusSq) {
                continue;
            }
            const distance = Math.sqrt(distanceSq);
            const sameRuleWeight = spawnRuleId && prey.spawnRuleId === spawnRuleId ? 1.35 : 1;
            crowding += (1 - distance / Math.max(1, radius)) * sameRuleWeight;
        }
        return crowding;
    },
    pickSpawnClusterAnchor(spawnConfig, count = 1, isObjective = false) {
        const ring = this.getPreySpawnRing(isObjective);
        const prediction = this.getPreySpawnPredictionState(ring, isObjective);
        const flow = this.getPreySpawnFlowDirection();
        const isElite = this.isEliteSpawnConfig(spawnConfig);
        const forwardBias = clamp(this.getRunTuningValue('gameplayPreyForwardSpawnBias', 0.62), 0, 1);
        if (!Number.isFinite(this.preySpawnSweepAngle)) {
            this.preySpawnSweepAngle = Math.random() * Math.PI * 2;
        }
        this.preySpawnSweepAngle = Phaser.Math.Angle.Wrap(this.preySpawnSweepAngle + GOLDEN_ANGLE * 0.58);

        const candidateAngles = [];
        const candidateCount = Math.min(8, 4 + Math.max(0, count - 1));
        for (let i = 0; i < candidateCount; i += 1) {
            candidateAngles.push(
                Phaser.Math.Angle.Wrap(
                    this.preySpawnSweepAngle
                    + (Math.PI * 2 * i) / Math.max(1, candidateCount)
                    + Phaser.Math.FloatBetween(-0.2, 0.2)
                )
            );
        }

        if (flow.moving && Math.random() < forwardBias) {
            const fan = isObjective ? Math.PI * 0.52 : Math.PI * 0.66;
            for (let i = 0; i < 4; i += 1) {
                candidateAngles.push(
                    Phaser.Math.Angle.Wrap(flow.angle + Phaser.Math.FloatBetween(-fan, fan))
                );
            }
        }

        const spacingBase = isElite
            ? 560
            : spawnConfig.archetype === 'school'
            ? 240
            : spawnConfig.sizeKey === 'large'
                ? 190
                : spawnConfig.sizeKey === 'medium'
                    ? 220
                    : 260;
        const crowdRadius = Math.max(isElite ? 520 : 180, spacingBase + count * (isElite ? 64 : 34));

        let best = null;
        candidateAngles.forEach((angle) => {
            const distance = Phaser.Math.FloatBetween(ring.ringMin, ring.ringMax) + prediction.dynamicPadding * Phaser.Math.FloatBetween(0.12, 0.62);
            const x = this.player.centroidX + Math.cos(angle) * distance;
            const y = this.player.centroidY + Math.sin(angle) * distance;
            let score = this.scorePreySpawnCrowding(x, y, crowdRadius, spawnConfig.id || '');
            if (isElite) {
                for (let i = 0; i < this.prey.length; i += 1) {
                    const prey = this.prey[i];
                    if (prey?.isObjective) {
                        continue;
                    }
                    const dx = prey.x - x;
                    const dy = prey.y - y;
                    const distanceToPrey = Math.hypot(dx, dy);
                    const minGap = prey.isElite ? crowdRadius * 1.15 : crowdRadius * 0.7;
                    if (distanceToPrey >= minGap) {
                        continue;
                    }
                    const overlap = 1 - distanceToPrey / Math.max(1, minGap);
                    score += overlap * (prey.isElite ? 2800 : 1200);
                }
            }
            const safe = this.isPreySpawnPointSafe(x, y, prediction);
            if (!safe) {
                score += 1600;
                const predictedDistance = Math.hypot(x - prediction.predictedPlayerX, y - prediction.predictedPlayerY);
                score += Math.max(0, prediction.safeRadiusPredicted - predictedDistance) * 4.5;
            }
            if (flow.moving) {
                const alignment = Math.cos(Phaser.Math.Angle.Wrap(angle - flow.angle));
                const directionalPenalty = clamp(0.35 - alignment, 0, 1.35);
                score += directionalPenalty * 0.55;
            }

            if (!best || score < best.score) {
                best = { x, y, angle, score, ring, prediction };
            }
        });

        return best || {
            x: this.player.centroidX + Math.cos(this.preySpawnSweepAngle) * ring.ringMin,
            y: this.player.centroidY + Math.sin(this.preySpawnSweepAngle) * ring.ringMin,
            angle: this.preySpawnSweepAngle,
            ring,
            prediction
        };
    },
    getPreyCullDistance(prey = null) {
        const metrics = this.getPreySpawnViewportMetrics();
        const encounterMul = this.getPreyEncounterDensityMul();
        const viewMul = Math.max(1.1, this.getRunTuningValue('gameplayPreyCullViewMul', 1.82) * (encounterMul > 1 ? 0.92 : 1.04));
        const baseDistance = Math.max(
            980,
            metrics.viewRadius * viewMul + Math.max(140, this.getFormationSpan() * 0.35 + 120)
        );
        return prey?.isObjective ? baseDistance * 1.22 : prey?.isElite ? baseDistance * 1.08 : baseDistance;
    },
    seedConfiguredPrey(spawnConfig, count = 1) {
        const results = [];
        const isElite = this.isEliteSpawnConfig(spawnConfig);
        const spawnCount = isElite
            ? Math.min(1, Math.max(0, Math.round(count)))
            : Math.max(0, Math.round(count));
        if (spawnCount <= 0) {
            return results;
        }
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
        const clusterBase = isElite
            ? 0
            : (spawnConfig.archetype === 'school' ? 44 : spawnConfig.sizeKey === 'large' ? 28 : spawnConfig.sizeKey === 'medium' ? 64 : 92) * spreadMul;
        const groupId = !isElite && spawnCount > 1 ? `${spawnConfig.id || spawnConfig.archetype}-seed-${this.preyIdCounter}` : '';

        for (let i = 0; i < spawnCount; i += 1) {
            const ring = Math.sqrt((i + 0.35) / Math.max(1, spawnCount));
            const angle = groupAngle + (Math.PI * 2 * i) / Math.max(1, spawnCount) + Phaser.Math.FloatBetween(-0.55, 0.55);
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

        if (results.length > 0) {
            this.playAudioEvent?.('prey_spawn_batch', {
                source: 'seed',
                count: results.length,
                archetype: spawnConfig.archetype || '',
                sizeKey: spawnConfig.sizeKey || '',
                isObjective: !!spawnConfig.isObjective
            });
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

        this.getStageEncounterRules(stage).forEach((rule) => {
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
        const encounterMul = this.getPreyEncounterDensityMul();
        const budget = this.getPreyStagePopulationBudget(stage, encounterMul);
        const availabilityDistance = this.getPreySpawnAvailabilityDistance();
        const effectiveOccupancy = this.getEffectiveSpawnOccupancy(availabilityDistance);
        const hardCap = budget.hardCap;
        if (this.prey.length >= hardCap || effectiveOccupancy >= budget.softCap) {
            return;
        }
        this.runState.encounterSpawnCooldown = Math.max(0, (this.runState.encounterSpawnCooldown || 0) - simDt);

        this.getStageEncounterRules(stage).forEach((rule) => {
            const isEliteRule = this.isEliteSpawnConfig(rule);
            const desired = isEliteRule
                ? Math.max(0, Math.round(rule.desired || 0))
                : Math.max(1, Math.round(rule.desired * encounterMul * budget.viewScale * this.getRuleCarryDensityMul(rule, stage)));
            if (desired <= 0) {
                return;
            }
            const aliveEffective = this.getRuleEffectiveAliveCount(rule.id, availabilityDistance, { strict: isEliteRule });
            if (aliveEffective >= desired) {
                this.runState.spawnTimers[rule.id] = Math.min(this.runState.spawnTimers[rule.id], rule.interval * 0.5);
                return;
            }

            this.runState.spawnTimers[rule.id] -= simDt;
            if (this.runState.spawnTimers[rule.id] > 0) {
                return;
            }

            const deficit = Math.max(1, Math.round(desired - aliveEffective));
            const remainingCapacity = hardCap - this.prey.length;
            if (remainingCapacity <= 0) {
                return;
            }
            let count = 1;
            if (!isEliteRule) {
                const packBoost = this.getPreySpawnPackScale(encounterMul, budget.viewScale);
                const packMinBase = Math.max(1, rule.packMin || 1);
                const packMaxBase = Math.max(packMinBase, rule.packMax || packMinBase);
                const packMin = Math.max(1, Math.min(deficit, Math.round(packMinBase * packBoost)));
                const packMax = Math.max(packMin, Math.min(deficit, Math.round(packMaxBase * packBoost)));
                const burstCap = Math.max(6, Math.round(this.getRunTuningValue('gameplayPreyBurstSpawnCap', 24)));
                count = clamp(
                    Phaser.Math.Between(packMin, packMax),
                    1,
                    Math.min(burstCap, remainingCapacity)
                );
            }
            this.spawnConfiguredPrey(rule, count);
            this.runState.spawnTimers[rule.id] = rule.interval * Phaser.Math.FloatBetween(0.86, 1.14);
        });

        this.ensureEncounterPresence(stage, availabilityDistance, encounterMul);
    },
    spawnConfiguredPrey(spawnConfig, count = 1, forceObjective = false) {
        const results = [];
        const isElite = this.isEliteSpawnConfig(spawnConfig);
        const spawnCount = isElite
            ? Math.min(1, Math.max(0, Math.round(count)))
            : Math.max(1, Math.round(count));
        if (spawnCount <= 0) {
            return results;
        }
        const isObjective = !!(forceObjective || spawnConfig.isObjective);
        const anchor = this.pickSpawnClusterAnchor(spawnConfig, spawnCount, isObjective);
        const prediction = anchor.prediction || this.getPreySpawnPredictionState(anchor.ring, isObjective);
        const safeMinDistance = Math.max(
            anchor.ring.ringMin,
            prediction.safeRadiusCurrent + Phaser.Math.FloatBetween(12, 68)
        );
        const safeMaxDistance = Math.max(
            safeMinDistance + 180,
            anchor.ring.ringMax + prediction.dynamicPadding * 0.46
        );
        anchor.safeMinDistance = safeMinDistance;
        anchor.safeMaxDistance = safeMaxDistance;
        const spreadMul = Math.max(0.35, this.getRunTuningValue('gameplayPreyFieldSpreadMul', 1));
        const clusterBase = isElite
            ? 0
            : (spawnConfig.archetype === 'school'
            ? 52
            : spawnConfig.sizeKey === 'large'
                ? 32
                : spawnConfig.sizeKey === 'medium'
                    ? 72
                    : 96) * spreadMul * (isObjective ? 0.72 : 1);
        const groupId = !isElite && spawnCount > 1 ? `${spawnConfig.id || spawnConfig.archetype}-${this.preyIdCounter}` : '';

        for (let i = 0; i < spawnCount; i += 1) {
            const ring = Math.sqrt((i + 0.35) / Math.max(1, spawnCount));
            const angle = anchor.angle + (Math.PI * 2 * i) / Math.max(1, spawnCount) + Phaser.Math.FloatBetween(-0.55, 0.55);
            const offset = clusterBase * ring;
            let x = anchor.x + Math.cos(angle) * offset + Phaser.Math.FloatBetween(-22, 22);
            let y = anchor.y + Math.sin(angle) * offset + Phaser.Math.FloatBetween(-22, 22);
            const dx = x - this.player.centroidX;
            const dy = y - this.player.centroidY;
            const distance = Math.hypot(dx, dy);
            if (distance < safeMinDistance) {
                const pullOut = (safeMinDistance + Phaser.Math.FloatBetween(12, 58)) / Math.max(distance, 0.0001);
                x = this.player.centroidX + dx * pullOut;
                y = this.player.centroidY + dy * pullOut;
            }
            const safePoint = this.resolvePreySpawnPointSafety(x, y, anchor, prediction);
            const prey = this.createPrey(spawnConfig, {
                x: safePoint.x,
                y: safePoint.y,
                groupId,
                isObjective
            });
            this.prey.push(prey);
            results.push(prey);
        }

        if (results.length > 0) {
            this.playAudioEvent?.('prey_spawn_batch', {
                source: 'spawn',
                count: results.length,
                archetype: spawnConfig.archetype || '',
                sizeKey: spawnConfig.sizeKey || '',
                isObjective
            });
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

        const shapeRadiusMul = shape === 'triangle'
            ? 0.92
            : shape === 'square'
                ? 1.06
                : shape === 'rect'
                    ? 0.98
                    : shape === 'dart'
                        ? 0.9
                        : 1;
        const maxHealth = sizeDef.maxHealth * (
            shape === 'square'
                ? 1.12
                : shape === 'triangle'
                    ? 0.88
                    : shape === 'rect'
                        ? 1.04
                        : shape === 'dart'
                            ? 0.84
                            : 1
        );
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
            maxAnchors: sizeDef.maxAnchors + (shape === 'square' || shape === 'rect' ? 1 : 0),
            chunkBurst: sizeDef.chunkBurst,
            yield: sizeDef.yield * shapeDef.yieldMul,
            wander: shapeDef.wander,
            fleeMul: shapeDef.fleeMul,
            pulseMul: shapeDef.pulseMul,
            rotationMul: shapeDef.rotationMul,
            displayRotation: Math.random() * Math.PI * 2,
            renderStretchX: shape === 'rect' ? 1.32 : shape === 'dart' ? 1.18 : 1,
            renderStretchY: shape === 'rect' ? 0.62 : shape === 'dart' ? 0.72 : 1,
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
        if (nodeCount <= 20) {
            return 'small';
        }
        if (nodeCount <= 58) {
            return 'medium';
        }
        if (nodeCount <= 84) {
            return 'large';
        }
        return 'colossal';
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
            prey: buildSpatialHash(this.prey, cellSize)
        };
    },
    insertNearestSpatialCandidate(buffer, item, distanceSq, limit) {
        const targetLimit = Math.max(1, limit | 0);
        let insertAt = buffer.length;
        while (insertAt > 0 && distanceSq < buffer[insertAt - 1].distanceSq) {
            insertAt -= 1;
        }
        if (insertAt >= targetLimit) {
            return;
        }
        buffer.splice(insertAt, 0, { item, distanceSq });
        if (buffer.length > targetLimit) {
            buffer.length = targetLimit;
        }
    },
    pickNearestNode(x, y) {
        const queryBuffer = this.preyNearestNodeQueryBuffer || (this.preyNearestNodeQueryBuffer = []);
        const candidates = querySpatialHash(this.preySpatialCache?.nodes, x, y, 260, null, queryBuffer);
        let best = null;
        let bestDistance = Infinity;
        const nodes = candidates.length > 0 ? candidates : this.activeNodes;
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            const dx = node.x - x;
            const dy = node.y - y;
            const distance = dx * dx + dy * dy;
            if (distance < bestDistance) {
                best = node;
                bestDistance = distance;
            }
        }
        return best;
    },
    pickNearbyNodes(x, y, limit = 4, radius = 128) {
        const cappedLimit = Math.max(1, limit | 0);
        const radiusSq = radius * radius;
        const queryBuffer = this.preyNearbyNodesQueryBuffer || (this.preyNearbyNodesQueryBuffer = []);
        const nearestBuffer = this.preyNearbyNodesNearestBuffer || (this.preyNearbyNodesNearestBuffer = []);
        nearestBuffer.length = 0;
        const candidates = querySpatialHash(this.preySpatialCache?.nodes, x, y, radius, null, queryBuffer);
        for (let i = 0; i < candidates.length; i += 1) {
            const node = candidates[i];
            const dx = node.x - x;
            const dy = node.y - y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq > radiusSq) {
                continue;
            }
            this.insertNearestSpatialCandidate(nearestBuffer, node, distanceSq, cappedLimit);
        }
        const results = [];
        for (let i = 0; i < nearestBuffer.length; i += 1) {
            results.push(nearestBuffer[i].item);
        }
        return results;
    },
    pickNearbyPrey(target, radius = 220, limit = 6) {
        const cappedLimit = Math.max(1, limit | 0);
        const radiusSq = radius * radius;
        const queryBuffer = this.preyNearbyPreyQueryBuffer || (this.preyNearbyPreyQueryBuffer = []);
        const nearestBuffer = this.preyNearbyPreyNearestBuffer || (this.preyNearbyPreyNearestBuffer = []);
        nearestBuffer.length = 0;
        const candidates = querySpatialHash(
            this.preySpatialCache?.prey,
            target.x,
            target.y,
            radius,
            (prey) => prey.id !== target.id,
            queryBuffer
        );
        for (let i = 0; i < candidates.length; i += 1) {
            const prey = candidates[i];
            const dx = prey.x - target.x;
            const dy = prey.y - target.y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq > radiusSq) {
                continue;
            }
            this.insertNearestSpatialCandidate(nearestBuffer, prey, distanceSq, cappedLimit);
        }
        const results = [];
        for (let i = 0; i < nearestBuffer.length; i += 1) {
            results.push(nearestBuffer[i].item);
        }
        return results;
    },
    getPreyBehaviorTuning() {
        const get = (key, fallback) => (typeof this.getRunTuningValue === 'function'
            ? this.getRunTuningValue(key, fallback)
            : Number.isFinite(window.TUNING?.[key]) ? window.TUNING[key] : fallback);
        return {
            threat: {
                distanceWeight: Math.max(0, get('gameplayPreyThreatDistanceWeight', 0.42)),
                nodeWeight: Math.max(0, get('gameplayPreyThreatNodeWeight', 0.34)),
                gapWeight: Math.max(0, get('gameplayPreyThreatGapWeight', 0.34)),
                phaseWeight: Math.max(0, get('gameplayPreyThreatPhaseWeight', 0.24)),
                pressureWeight: Math.max(0, get('gameplayPreyThreatPressureWeight', 0.72)),
                schoolWeight: Math.max(0, get('gameplayPreyThreatSchoolWeight', 0.26)),
                panicWeight: Math.max(0, get('gameplayPreyThreatPanicWeight', 0.24))
            },
            radii: {
                distanceRangeMul: Math.max(0.2, get('gameplayPreyThreatDistanceRangeMul', 1)),
                nodeRangeMul: Math.max(0.2, get('gameplayPreyThreatNodeRangeMul', 1)),
                objectiveRangeMul: Math.max(0.2, get('gameplayPreyThreatObjectiveRangeMul', 1))
            },
            phaseAggro: {
                stable: Math.max(0, get('gameplayPreyPhaseAggroStable', 0.16)),
                cruise: Math.max(0, get('gameplayPreyPhaseAggroCruise', 0.32)),
                pursuit: Math.max(0, get('gameplayPreyPhaseAggroPursuit', 0.54)),
                hunt: Math.max(0, get('gameplayPreyPhaseAggroHunt', 0.76)),
                burst: Math.max(0, get('gameplayPreyPhaseAggroBurst', 1))
            },
            thresholds: {
                alertEnterMul: Math.max(0.25, get('gameplayPreyBehaviorAlertEnterMul', 1)),
                evadeEnterMul: Math.max(0.25, get('gameplayPreyBehaviorEvadeEnterMul', 1)),
                burstEnterMul: Math.max(0.25, get('gameplayPreyBehaviorBurstEnterMul', 1)),
                recoverEnterMul: Math.max(0.25, get('gameplayPreyBehaviorRecoverEnterMul', 1)),
                grazeExitMul: Math.max(0.25, get('gameplayPreyBehaviorGrazeExitMul', 1)),
                braceEnterMul: Math.max(0.25, get('gameplayPreyBehaviorBraceEnterMul', 1)),
                braceReleaseMul: Math.max(0.25, get('gameplayPreyBehaviorBraceReleaseMul', 1)),
                burstGapGateMul: Math.max(0.2, get('gameplayPreyBehaviorBurstGapGateMul', 1))
            },
            pacing: {
                globalSpeedMul: Math.max(0.2, get('gameplayPreyBehaviorGlobalSpeedMul', 1)),
                globalAccelMul: Math.max(0.2, get('gameplayPreyBehaviorGlobalAccelMul', 1)),
                globalSpeedCapMul: Math.max(0.3, get('gameplayPreyBehaviorGlobalSpeedCapMul', 1)),
                globalTurnMul: Math.max(0.2, get('gameplayPreyBehaviorGlobalTurnMul', 1)),
                globalDragMul: Math.max(0.2, get('gameplayPreyBehaviorGlobalDragMul', 1)),
                burstDragMul: Math.max(0.1, get('gameplayPreyBehaviorBurstDragMul', 1)),
                attachmentDragMul: Math.max(0.1, get('gameplayPreyBehaviorAttachmentDragMul', 1)),
                awayMul: Math.max(0, get('gameplayPreyBehaviorAwayMul', 1)),
                wanderMul: Math.max(0, get('gameplayPreyBehaviorWanderMul', 1)),
                schoolMul: Math.max(0, get('gameplayPreyBehaviorSchoolMul', 1)),
                strafeMul: Math.max(0, get('gameplayPreyBehaviorStrafeMul', 1)),
                jitterMul: Math.max(0, get('gameplayPreyBehaviorJitterMul', 1))
            },
            timers: {
                burstWindowMul: Math.max(0.2, get('gameplayPreyBehaviorBurstWindowMul', 1)),
                recoverWindowMul: Math.max(0.2, get('gameplayPreyBehaviorRecoverWindowMul', 1))
            },
            emotion: {
                alarmDecayMul: Math.max(0.1, get('gameplayPreyBehaviorAlarmDecayMul', 1)),
                fearGainMul: Math.max(0.1, get('gameplayPreyBehaviorFearGainMul', 1)),
                fearDecayMul: Math.max(0.1, get('gameplayPreyBehaviorFearDecayMul', 1)),
                staminaDrainMul: Math.max(0.1, get('gameplayPreyBehaviorStaminaDrainMul', 1)),
                staminaRecoverMul: Math.max(0.1, get('gameplayPreyBehaviorStaminaRecoverMul', 1))
            },
            stateCapability: {
                graze: Math.max(0.2, get('gameplayPreyStateCapGrazeMul', 1)),
                alert: Math.max(0.2, get('gameplayPreyStateCapAlertMul', 1)),
                evade: Math.max(0.2, get('gameplayPreyStateCapEvadeMul', 1)),
                burst: Math.max(0.2, get('gameplayPreyStateCapBurstMul', 1)),
                recover: Math.max(0.2, get('gameplayPreyStateCapRecoverMul', 1)),
                brace: Math.max(0.2, get('gameplayPreyStateCapBraceMul', 1)),
                schooling: Math.max(0.2, get('gameplayPreyStateCapSchoolingMul', 1))
            },
            archetypeSpeed: {
                skittish: Math.max(0.2, get('gameplayPreyArchetypeDefaultSpeedMul', 1)),
                school: Math.max(0.2, get('gameplayPreyArchetypeSchoolSpeedMul', 1)),
                bulwark: Math.max(0.2, get('gameplayPreyArchetypeBulwarkSpeedMul', 1)),
                weakspot: Math.max(0.2, get('gameplayPreyArchetypeWeakspotSpeedMul', 1)),
                apex: Math.max(0.2, get('gameplayPreyArchetypeApexSpeedMul', 1)),
                objective: Math.max(0.2, get('gameplayPreyArchetypeObjectiveSpeedMul', 1))
            }
        };
    },
    getPreyBehaviorProfile(prey, tuning = this.getPreyBehaviorTuning()) {
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

        profile.alertEnter *= tuning.thresholds.alertEnterMul;
        profile.evadeEnter *= tuning.thresholds.evadeEnterMul;
        profile.burstEnter *= tuning.thresholds.burstEnterMul;
        profile.grazeExit *= tuning.thresholds.grazeExitMul;
        profile.recoverEnter *= tuning.thresholds.recoverEnterMul;
        profile.braceEnter *= tuning.thresholds.braceEnterMul;
        profile.braceRelease *= tuning.thresholds.braceReleaseMul;
        profile.burstDuration *= tuning.timers.burstWindowMul;
        profile.recoverDuration *= tuning.timers.recoverWindowMul;
        profile.alarmDecay *= tuning.emotion.alarmDecayMul;
        profile.fearGain *= tuning.emotion.fearGainMul;
        profile.fearDecay *= tuning.emotion.fearDecayMul;
        profile.staminaDrain *= tuning.emotion.staminaDrainMul;
        profile.staminaRecover *= tuning.emotion.staminaRecoverMul;
        Object.keys(profile.turnRates).forEach((stateKey) => {
            profile.turnRates[stateKey] *= tuning.pacing.globalTurnMul;
        });

        return profile;
    },
    getPreyPhaseAggro(phase, tuning = this.getPreyBehaviorTuning()) {
        switch (phase) {
            case 'stable':
                return tuning.phaseAggro.stable;
            case 'pursuit':
                return tuning.phaseAggro.pursuit;
            case 'hunt':
                return tuning.phaseAggro.hunt;
            case 'burst':
                return tuning.phaseAggro.burst;
            default:
                return tuning.phaseAggro.cruise;
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
            if (other.isElite || other.isObjective) {
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
    evaluatePreyThreat(prey, nearbyNodes, nearbyPrey, tuning = this.getPreyBehaviorTuning()) {
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
            const weight = clamp(
                1 - distance / ((prey.radius + 220 + (prey.isObjective ? 40 : 0)) * tuning.radii.nodeRangeMul),
                0,
                1
            );
            const nodeSpeed = Math.hypot(node.vx || 0, node.vy || 0);
            const drive = normalize(node.vx || 0, node.vy || 0, away.x, away.y);
            nodeThreat += weight * (0.42 + clamp(nodeSpeed / 140, 0, 1.2) * 0.34 + Math.max(0, drive.x * away.x + drive.y * away.y) * 0.24);
            crowd = Math.max(crowd, weight);
        });
        nodeThreat = clamp(nodeThreat / Math.max(1, Math.sqrt(nearbyNodes.length || 1)), 0, 1.28);

        const schoolAlarm = nearbyPrey.reduce((best, other) => Math.max(best, other.alarm || 0), 0);
        const phaseAggro = this.getPreyPhaseAggro(phase, tuning);
        const pressure = clamp((prey.attachments?.length || 0) / Math.max(1, prey.maxAnchors || 1), 0, 1.4);
        const distanceRangeMul = tuning.radii.distanceRangeMul * (prey.isObjective ? tuning.radii.objectiveRangeMul : 1);
        const distanceThreat = clamp(
            1 - (distanceFromCenter - (prey.isObjective ? 260 : 330) * distanceRangeMul) / ((prey.isObjective ? 440 : 560) * distanceRangeMul),
            0,
            1.2
        );
        const threatValue = clamp(
            distanceThreat * tuning.threat.distanceWeight
            + nodeThreat * tuning.threat.nodeWeight
            + gapNorm * tuning.threat.gapWeight
            + phaseAggro * tuning.threat.phaseWeight
            + pressure * tuning.threat.pressureWeight
            + schoolAlarm * tuning.threat.schoolWeight
            + (prey.panic || 0) * tuning.threat.panicWeight,
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
            this.playAudioEvent?.('prey_guard_pulse', {
                preyId: prey.id,
                archetype: prey.archetype || '',
                sizeKey: prey.sizeKey || '',
                threat: threat.threat
            });
        }
    },
    updatePreyStateMachine(prey, threat, profile, tuning, simDt) {
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
        const burstGapGateMul = tuning.thresholds.burstGapGateMul;
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
            } else if (canBurst && threat.gapNorm > 0.42 * burstGapGateMul) {
                nextState = 'burst';
            }
        } else if (state === 'recover') {
            if (shouldBrace) {
                nextState = 'brace';
            } else if (canBurst && threat.gapNorm > 0.48 * burstGapGateMul) {
                nextState = 'burst';
            } else if (threat.threat >= profile.evadeEnter) {
                nextState = 'evade';
            } else if (prey.recoverTimer <= 0 && threat.threat < profile.grazeExit) {
                nextState = baseIdleState;
            }
        } else if (state === 'evade') {
            if (shouldBrace) {
                nextState = 'brace';
            } else if (canBurst && threat.gapNorm > 0.24 * burstGapGateMul) {
                nextState = 'burst';
            } else if (threat.threat < profile.recoverEnter && prey.behaviorStateAge > 0.44) {
                nextState = 'recover';
            }
        } else if (state === 'alert') {
            if (shouldBrace) {
                nextState = 'brace';
            } else if (threat.threat >= profile.evadeEnter || prey.attachments.length > 0) {
                nextState = 'evade';
            } else if (canBurst && threat.gapNorm > 0.32 * burstGapGateMul) {
                nextState = 'burst';
            } else if (threat.threat < profile.grazeExit && prey.behaviorStateAge > 0.3) {
                nextState = baseIdleState;
            }
        } else {
            if (shouldBrace) {
                nextState = 'brace';
            } else if (threat.threat >= profile.evadeEnter || prey.attachments.length > 0) {
                nextState = 'evade';
            } else if (canBurst && threat.gapNorm > 0.44 * burstGapGateMul) {
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
                this.playAudioEvent?.('prey_state_burst', {
                    preyId: prey.id,
                    fromState: state,
                    threat: threat.threat,
                    gapNorm: threat.gapNorm,
                    archetype: prey.archetype || '',
                    sizeKey: prey.sizeKey || ''
                });
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
    isPreySimpleFleeModeEnabled() {
        return !!this.getRunTuningToggle?.('gameplayPreySimpleFleeMode', false);
    },
    getPreyBehaviorLodDistance() {
        const metrics = this.getPreySpawnViewportMetrics();
        const lodMul = clamp(this.getRunTuningValue('gameplayPreyBehaviorLodViewMul', 0.72), 0.3, 1.5);
        return Math.max(520, metrics.viewRadius * lodMul);
    },
    shouldUseSimplifiedPreyBehavior(prey, distanceFromCenter, behaviorLodDistance, simpleFleeMode) {
        if (!prey || prey.isObjective || (prey.attachments?.length || 0) > 0) {
            return false;
        }
        if (simpleFleeMode) {
            return true;
        }
        if (!this.getRunTuningToggle?.('gameplayPreyBehaviorLodEnabled', true)) {
            return false;
        }
        return distanceFromCenter > behaviorLodDistance;
    },
    updatePreySimpleBehavior(prey, distanceFromCenter, behaviorLodDistance, simpleFleeMode, tuning, simDt) {
        const away = normalize(
            prey.x - this.player.centroidX,
            prey.y - this.player.centroidY,
            Math.cos(prey.escapeAngle || prey.seed),
            Math.sin(prey.escapeAngle || prey.seed)
        );
        const threat = clamp(
            1 - (distanceFromCenter - Math.max(160, this.getFormationSpan() * 0.55)) / Math.max(220, behaviorLodDistance),
            0.04,
            1
        );
        const nextState = threat > 0.2 || simpleFleeMode
            ? 'evade'
            : prey.archetype === 'school'
                ? 'schooling'
                : 'graze';
        if (prey.behaviorState !== nextState) {
            this.notePreyStateTransition(prey, nextState, { threat });
        }

        const wanderAngle = this.worldTime * (prey.shape === 'triangle' ? 1.8 : prey.shape === 'circle' ? 1.28 : 1.04) + prey.seed * 3.2;
        const jitterWeight = simpleFleeMode ? 0.06 : 0.14;
        const desired = normalize(
            away.x * (0.82 + threat * 0.42) + Math.cos(wanderAngle) * jitterWeight,
            away.y * (0.82 + threat * 0.42) + Math.sin(wanderAngle * 0.92) * jitterWeight,
            away.x,
            away.y
        );

        prey.escapeAngle = dampAngle(
            prey.escapeAngle || Math.atan2(desired.y, desired.x),
            Math.atan2(desired.y, desired.x),
            2.6 * tuning.pacing.globalTurnMul,
            simDt
        );
        prey.escapeDirX = Math.cos(prey.escapeAngle);
        prey.escapeDirY = Math.sin(prey.escapeAngle);

        const archetypePaceMul = (tuning.archetypeSpeed[prey.archetype] || tuning.archetypeSpeed.skittish) * (prey.isObjective ? tuning.archetypeSpeed.objective : 1);
        const paceMul = tuning.pacing.globalSpeedMul * archetypePaceMul;
        const targetSpeed = clamp(
            prey.speed * (simpleFleeMode ? (0.72 + threat * 0.38) : (0.5 + threat * 0.44)) * paceMul,
            prey.speed * 0.26 * paceMul,
            prey.speed * 1.04 * tuning.pacing.globalSpeedCapMul * paceMul
        );
        const accel = prey.accel
            * (simpleFleeMode ? (0.5 + threat * 0.42) : (0.38 + threat * 0.36))
            * tuning.pacing.globalAccelMul;
        prey.behaviorTargetSpeed = targetSpeed;
        prey.behaviorTargetAccel = accel;

        prey.vx += prey.escapeDirX * accel * simDt;
        prey.vy += prey.escapeDirY * accel * simDt;

        const speed = Math.hypot(prey.vx, prey.vy);
        if (speed > targetSpeed) {
            const scale = targetSpeed / Math.max(speed, 0.0001);
            prey.vx *= scale;
            prey.vy *= scale;
        }

        const drag = (simpleFleeMode ? 1.08 : 0.96 + (1 - threat) * 0.52) * tuning.pacing.globalDragMul;
        prey.vx *= Math.exp(-drag * simDt);
        prey.vy *= Math.exp(-drag * simDt);
        prey.x += prey.vx * simDt;
        prey.y += prey.vy * simDt;

        prey.fear = Math.max(0, (prey.fear || 0) - simDt * 0.32) + threat * simDt * 0.18;
        prey.alarm = Math.max(threat * 0.62, (prey.alarm || 0) - simDt * 0.54);
        prey.stamina = clamp((prey.stamina || 1) + simDt * (simpleFleeMode ? 0.16 : 0.22), 0, 1.2);
        prey.burstTimer = Math.max(0, (prey.burstTimer || 0) - simDt);
        prey.recoverTimer = Math.max(0, (prey.recoverTimer || 0) - simDt);
        prey.braceTimer = Math.max(0, (prey.braceTimer || 0) - simDt);
        prey.guardPulse = Math.max(0, (prey.guardPulse || 0) - simDt * 2.2);
        prey.pushCharge = Math.max(0, (prey.pushCharge || 0) - simDt * 1.2);
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
        prey.lastThreat = threat;
        prey.lastGapSpeed = 0;
        prey.pulse += simDt * (1.9 + prey.pulseMul * 1.2 + threat * 0.9);
        prey.displayX = damp(prey.displayX, prey.x, 18, simDt);
        prey.displayY = damp(prey.displayY, prey.y, 18, simDt);
        const heading = Math.atan2(prey.vy || prey.escapeDirY, prey.vx || prey.escapeDirX);
        prey.displayRotation = dampAngle(prey.displayRotation, heading + prey.spin * 0.02, 12, simDt);

        const telemetryThreat = {
            distanceFromCenter,
            threat,
            gapSpeed: 0,
            schoolAlarm: 0
        };
        if (threat > 0.18) {
            this.startPreyChaseTelemetry(prey, telemetryThreat);
        } else {
            this.finishPreyChaseTelemetry(prey, 'disengaged');
        }
        this.recordPreyStateTelemetry(prey, telemetryThreat, simDt);
        const chase = this.ecoTelemetry?.prey?.activeChases?.[prey.id];
        if (chase) {
            chase.closestDistance = Math.min(chase.closestDistance, distanceFromCenter);
            chase.peakThreat = Math.max(chase.peakThreat, threat);
        }
    },
    getEncounterBehaviorTuning(speciesId, key, fallback) {
        if (!speciesId) {
            return fallback;
        }
        return this.getRunTuningValue(`gameplayBehavior${key}__${speciesId}`, fallback);
    },
    sampleEncounterThreat(prey, distanceFromCenter, rangeMul = 1) {
        const away = normalize(
            prey.x - this.player.centroidX,
            prey.y - this.player.centroidY,
            Math.cos(prey.escapeAngle || prey.seed),
            Math.sin(prey.escapeAngle || prey.seed)
        );
        const formationRadius = Math.max(160, this.getFormationSpan() * 0.55);
        const dangerRange = Math.max(240, this.getPreyBehaviorLodDistance() * rangeMul);
        const threat = clamp(1 - (distanceFromCenter - formationRadius) / dangerRange, 0.04, 1);
        const orbitSign = prey.curveSign || (Math.sin(prey.seed * 3.17) >= 0 ? 1 : -1);
        return {
            threat,
            away,
            orbit: {
                x: -away.y * orbitSign,
                y: away.x * orbitSign
            }
        };
    },
    buildLightSchoolSteer(prey, radius = prey.schoolRadius || 180, maxCount = 5) {
        const neighbors = this.pickNearbyPrey(prey, radius, maxCount);
        if (!neighbors.length) {
            return { x: 0, y: 0 };
        }
        let centerX = 0;
        let centerY = 0;
        let separateX = 0;
        let separateY = 0;
        neighbors.forEach((other) => {
            centerX += other.x;
            centerY += other.y;
            const dx = prey.x - other.x;
            const dy = prey.y - other.y;
            const distance = Math.hypot(dx, dy) || 0.0001;
            if (distance < radius * 0.52) {
                separateX += dx / distance;
                separateY += dy / distance;
            }
        });
        centerX /= neighbors.length;
        centerY /= neighbors.length;
        const cohesion = normalize(centerX - prey.x, centerY - prey.y, 0, 0);
        const separation = normalize(separateX, separateY, 0, 0);
        return {
            x: cohesion.x * 0.46 + separation.x * 0.54,
            y: cohesion.y * 0.46 + separation.y * 0.54
        };
    },
    decayEncounterFeedback(prey, simDt, threat = 0) {
        prey.fear = Math.max(0, (prey.fear || 0) - simDt * 0.28) + threat * simDt * 0.18;
        prey.alarm = Math.max(threat * 0.58, (prey.alarm || 0) - simDt * 0.52);
        prey.stamina = clamp((prey.stamina || 1) + simDt * 0.18, 0, 1.2);
        prey.burstTimer = Math.max(0, (prey.burstTimer || 0) - simDt);
        prey.recoverTimer = Math.max(0, (prey.recoverTimer || 0) - simDt);
        prey.braceTimer = Math.max(0, (prey.braceTimer || 0) - simDt);
        prey.guardPulse = Math.max(0, (prey.guardPulse || 0) - simDt * 2);
        prey.pushCharge = Math.max(0, (prey.pushCharge || 0) - simDt * 1.08);
        prey.hitFlash = Math.max(0, prey.hitFlash - simDt * 4.8);
        prey.panic = Math.max(0, prey.panic - simDt * 0.72);
        prey.wound = Math.max(0, prey.wound - simDt * 0.34);
        prey.shudder = Math.max(0, prey.shudder - simDt * 1.9);
        prey.carve = Math.max(0, prey.carve - simDt * 0.52);
        prey.gorePulse = Math.max(0, prey.gorePulse - simDt * 1.85);
        prey.devourGlow = Math.max(0, prey.devourGlow - simDt * 1.2);
        prey.alertPulse = Math.max(0, (prey.alertPulse || 0) - simDt * 1.35);
        prey.spin *= Math.exp(-2.2 * simDt);
        prey.objectiveGlow = Math.max(0, (prey.objectiveGlow || 0) - simDt * 0.16);
    },
    finalizeEncounterTelemetry(prey, distanceFromCenter, threat, simDt) {
        prey.lastThreat = threat;
        prey.lastGapSpeed = 0;
        const telemetryThreat = {
            distanceFromCenter,
            threat,
            gapSpeed: 0,
            schoolAlarm: 0
        };
        if (threat > 0.18 || (prey.attachments?.length || 0) > 0) {
            this.startPreyChaseTelemetry(prey, telemetryThreat);
        } else {
            this.finishPreyChaseTelemetry(prey, 'disengaged');
        }
        this.recordPreyStateTelemetry(prey, telemetryThreat, simDt);
        const chase = this.ecoTelemetry?.prey?.activeChases?.[prey.id];
        if (chase) {
            chase.closestDistance = Math.min(chase.closestDistance, distanceFromCenter);
            chase.peakThreat = Math.max(chase.peakThreat, threat);
        }
    },
    updateBasicEncounterBehavior(prey, distanceFromCenter, simpleFleeMode, tuning, simDt) {
        const sampled = this.sampleEncounterThreat(prey, distanceFromCenter, 0.9);
        const school = prey.archetype === 'school' && !simpleFleeMode
            ? this.buildLightSchoolSteer(prey, Math.max(120, prey.schoolRadius || 180), 5)
            : { x: 0, y: 0 };
        const wanderAngle = this.worldTime * (prey.shape === 'triangle' ? 1.8 : prey.shape === 'circle' ? 1.32 : 1.08) + prey.seed * 3.2;
        const jitterWeight = simpleFleeMode ? 0.04 : 0.12;
        const desired = normalize(
            sampled.away.x * (0.84 + sampled.threat * 0.4)
                + school.x * 0.22
                + Math.cos(wanderAngle) * jitterWeight,
            sampled.away.y * (0.84 + sampled.threat * 0.4)
                + school.y * 0.22
                + Math.sin(wanderAngle * 0.92) * jitterWeight,
            sampled.away.x,
            sampled.away.y
        );
        const targetState = sampled.threat > 0.18 ? 'evade' : prey.archetype === 'school' ? 'schooling' : 'graze';
        if (prey.behaviorState !== targetState) {
            this.notePreyStateTransition(prey, targetState, { threat: sampled.threat });
        }

        prey.escapeAngle = dampAngle(prey.escapeAngle || Math.atan2(desired.y, desired.x), Math.atan2(desired.y, desired.x), 2.4 * tuning.pacing.globalTurnMul, simDt);
        prey.escapeDirX = Math.cos(prey.escapeAngle);
        prey.escapeDirY = Math.sin(prey.escapeAngle);

        const targetSpeed = clamp(
            prey.speed * (simpleFleeMode ? (0.68 + sampled.threat * 0.34) : (0.54 + sampled.threat * 0.4)) * tuning.pacing.globalSpeedMul,
            prey.speed * 0.24,
            prey.speed * 1.02 * tuning.pacing.globalSpeedCapMul
        );
        const accel = prey.accel * (0.42 + sampled.threat * 0.34) * tuning.pacing.globalAccelMul;
        prey.behaviorTargetSpeed = targetSpeed;
        prey.behaviorTargetAccel = accel;
        prey.vx += prey.escapeDirX * accel * simDt;
        prey.vy += prey.escapeDirY * accel * simDt;

        const speed = Math.hypot(prey.vx, prey.vy);
        if (speed > targetSpeed) {
            const scale = targetSpeed / Math.max(speed, 0.0001);
            prey.vx *= scale;
            prey.vy *= scale;
        }

        const drag = (0.94 + (1 - sampled.threat) * 0.38) * tuning.pacing.globalDragMul;
        prey.vx *= Math.exp(-drag * simDt);
        prey.vy *= Math.exp(-drag * simDt);
        prey.x += prey.vx * simDt;
        prey.y += prey.vy * simDt;

        this.decayEncounterFeedback(prey, simDt, sampled.threat);
        prey.renderStretchX = prey.shape === 'square' ? 1.08 : 1;
        prey.renderStretchY = prey.shape === 'square' ? 0.92 : 1;
        prey.pulse += simDt * (1.8 + prey.pulseMul * 1.12 + sampled.threat * 0.8);
        prey.displayX = damp(prey.displayX, prey.x, 18, simDt);
        prey.displayY = damp(prey.displayY, prey.y, 18, simDt);
        prey.displayRotation = dampAngle(prey.displayRotation, Math.atan2(prey.vy || prey.escapeDirY, prey.vx || prey.escapeDirX), 11, simDt);
        this.finalizeEncounterTelemetry(prey, distanceFromCenter, sampled.threat, simDt);
    },
    updateRectEliteBehavior(prey, distanceFromCenter, tuning, simDt) {
        const sampled = this.sampleEncounterThreat(prey, distanceFromCenter, 1);
        const turnRate = this.getEncounterBehaviorTuning(prey.speciesId, 'TurnRate', 1.78) * tuning.pacing.globalTurnMul;
        const surgeSpeed = this.getEncounterBehaviorTuning(prey.speciesId, 'SurgeSpeed', 1.34) * tuning.pacing.globalSpeedMul;
        const turnSpeed = this.getEncounterBehaviorTuning(prey.speciesId, 'TurnSpeed', 0.34) * tuning.pacing.globalSpeedMul;
        const surgeDuration = this.getEncounterBehaviorTuning(prey.speciesId, 'SurgeDuration', 0.86);
        const turnDuration = this.getEncounterBehaviorTuning(prey.speciesId, 'TurnDuration', 0.72);
        const desiredAngle = Math.atan2(sampled.away.y, sampled.away.x);

        prey.locomotionTimer = Math.max(0, (prey.locomotionTimer || 0) - simDt);
        if (prey.locomotionState !== 'surge' && (prey.locomotionTimer <= 0 || Math.abs(Phaser.Math.Angle.Wrap(desiredAngle - (prey.escapeAngle || desiredAngle))) < 0.18)) {
            prey.locomotionState = 'surge';
            prey.locomotionTimer = surgeDuration * Phaser.Math.FloatBetween(0.9, 1.12);
            prey.alertPulse = Math.max(prey.alertPulse || 0, 0.48);
        } else if (prey.locomotionState === 'surge' && prey.locomotionTimer <= 0) {
            prey.locomotionState = 'turn';
            prey.locomotionTimer = turnDuration * Phaser.Math.FloatBetween(0.9, 1.12);
        } else if (!prey.locomotionState) {
            prey.locomotionState = 'turn';
            prey.locomotionTimer = turnDuration;
        }

        const inSurge = prey.locomotionState === 'surge';
        const nextState = inSurge ? 'burst' : 'alert';
        if (prey.behaviorState !== nextState) {
            this.notePreyStateTransition(prey, nextState, { threat: sampled.threat });
        }

        prey.escapeAngle = dampAngle(prey.escapeAngle || desiredAngle, desiredAngle, inSurge ? turnRate * 0.42 : turnRate, simDt);
        prey.escapeDirX = Math.cos(prey.escapeAngle);
        prey.escapeDirY = Math.sin(prey.escapeAngle);
        const targetSpeed = prey.speed * (inSurge ? (surgeSpeed + sampled.threat * 0.2) : (turnSpeed + sampled.threat * 0.08));
        const accel = prey.accel * (inSurge ? 0.72 : 0.34) * tuning.pacing.globalAccelMul;
        prey.vx += prey.escapeDirX * accel * simDt;
        prey.vy += prey.escapeDirY * accel * simDt;
        const speed = Math.hypot(prey.vx, prey.vy);
        if (speed > targetSpeed) {
            const scale = targetSpeed / Math.max(speed, 0.0001);
            prey.vx *= scale;
            prey.vy *= scale;
        }
        const drag = (inSurge ? 0.64 : 1.22) * tuning.pacing.globalDragMul;
        prey.vx *= Math.exp(-drag * simDt);
        prey.vy *= Math.exp(-drag * simDt);
        prey.x += prey.vx * simDt;
        prey.y += prey.vy * simDt;

        const pulseBeat = Math.sin(this.worldTime * (inSurge ? 10.6 : 4.8) + prey.seed);
        this.decayEncounterFeedback(prey, simDt, sampled.threat);
        prey.renderStretchX = 1.38 + (inSurge ? 0.18 : 0.08) + Math.max(0, pulseBeat) * 0.16;
        prey.renderStretchY = 0.58 - Math.max(0, pulseBeat) * 0.08;
        prey.pulse += simDt * (2.1 + prey.pulseMul * 1.34 + sampled.threat);
        prey.displayX = damp(prey.displayX, prey.x, 16, simDt);
        prey.displayY = damp(prey.displayY, prey.y, 16, simDt);
        prey.displayRotation = dampAngle(prey.displayRotation, prey.escapeAngle, inSurge ? 9 : 7, simDt);
        this.finalizeEncounterTelemetry(prey, distanceFromCenter, sampled.threat, simDt);
    },
    updateSpinnerEliteBehavior(prey, distanceFromCenter, tuning, simDt) {
        const sampled = this.sampleEncounterThreat(prey, distanceFromCenter, 1);
        const spinDuration = this.getEncounterBehaviorTuning(prey.speciesId, 'SpinDuration', 1.4);
        const restDuration = this.getEncounterBehaviorTuning(prey.speciesId, 'RestDuration', 1.1);
        const spinSpeed = this.getEncounterBehaviorTuning(prey.speciesId, 'SpinSpeed', 12.5);

        prey.spinCycleTimer = Math.max(0, (prey.spinCycleTimer || 0) - simDt);
        if (prey.spinCycleTimer <= 0) {
            prey.spinHazardActive = !prey.spinHazardActive;
            prey.spinCycleTimer = prey.spinHazardActive ? spinDuration : restDuration;
            prey.alertPulse = Math.max(prey.alertPulse || 0, prey.spinHazardActive ? 0.72 : 0.3);
        }

        const desiredAngle = Math.atan2(sampled.away.y, sampled.away.x);
        prey.escapeAngle = dampAngle(prey.escapeAngle || desiredAngle, desiredAngle, (prey.spinHazardActive ? 1.8 : 3.1) * tuning.pacing.globalTurnMul, simDt);
        prey.escapeDirX = Math.cos(prey.escapeAngle);
        prey.escapeDirY = Math.sin(prey.escapeAngle);
        const targetSpeed = prey.speed * (prey.spinHazardActive ? 0.56 : 0.38 + sampled.threat * 0.1) * tuning.pacing.globalSpeedMul;
        const accel = prey.accel * (prey.spinHazardActive ? 0.52 : 0.32) * tuning.pacing.globalAccelMul;
        prey.vx += prey.escapeDirX * accel * simDt;
        prey.vy += prey.escapeDirY * accel * simDt;
        const speed = Math.hypot(prey.vx, prey.vy);
        if (speed > targetSpeed) {
            const scale = targetSpeed / Math.max(speed, 0.0001);
            prey.vx *= scale;
            prey.vy *= scale;
        }
        const drag = (prey.spinHazardActive ? 0.9 : 1.18) * tuning.pacing.globalDragMul;
        prey.vx *= Math.exp(-drag * simDt);
        prey.vy *= Math.exp(-drag * simDt);
        prey.x += prey.vx * simDt;
        prey.y += prey.vy * simDt;

        if (prey.spinHazardActive) {
            prey.spin += simDt * spinSpeed;
            prey.guardPulse = Math.max(prey.guardPulse || 0, 0.54);
            if (prey.behaviorState !== 'brace') {
                this.notePreyStateTransition(prey, 'brace', { threat: sampled.threat });
            }
        } else {
            if (prey.behaviorState !== 'recover') {
                this.notePreyStateTransition(prey, 'recover', { threat: sampled.threat });
            }
        }

        this.decayEncounterFeedback(prey, simDt, sampled.threat);
        prey.renderStretchX = 1.06;
        prey.renderStretchY = 1.06;
        prey.pulse += simDt * (2 + prey.pulseMul * 1.22 + sampled.threat * 0.8);
        prey.displayX = damp(prey.displayX, prey.x, 18, simDt);
        prey.displayY = damp(prey.displayY, prey.y, 18, simDt);
        prey.displayRotation = dampAngle(prey.displayRotation, prey.escapeAngle + prey.spin, 9, simDt);
        this.finalizeEncounterTelemetry(prey, distanceFromCenter, sampled.threat, simDt);
    },
    updateBruteEliteBehavior(prey, distanceFromCenter, tuning, simDt) {
        const sampled = this.sampleEncounterThreat(prey, distanceFromCenter, 1.08);
        const desiredAngle = Math.atan2(sampled.away.y, sampled.away.x);
        const nextState = sampled.threat > 0.2 ? 'evade' : 'graze';
        if (prey.behaviorState !== nextState) {
            this.notePreyStateTransition(prey, nextState, { threat: sampled.threat });
        }
        prey.escapeAngle = dampAngle(prey.escapeAngle || desiredAngle, desiredAngle, 1.64 * tuning.pacing.globalTurnMul, simDt);
        prey.escapeDirX = Math.cos(prey.escapeAngle);
        prey.escapeDirY = Math.sin(prey.escapeAngle);
        const targetSpeed = prey.speed * (0.42 + sampled.threat * 0.2) * tuning.pacing.globalSpeedMul;
        const accel = prey.accel * (0.28 + sampled.threat * 0.16) * tuning.pacing.globalAccelMul;
        prey.vx += prey.escapeDirX * accel * simDt;
        prey.vy += prey.escapeDirY * accel * simDt;
        const speed = Math.hypot(prey.vx, prey.vy);
        if (speed > targetSpeed) {
            const scale = targetSpeed / Math.max(speed, 0.0001);
            prey.vx *= scale;
            prey.vy *= scale;
        }
        prey.vx *= Math.exp(-1.24 * tuning.pacing.globalDragMul * simDt);
        prey.vy *= Math.exp(-1.24 * tuning.pacing.globalDragMul * simDt);
        prey.x += prey.vx * simDt;
        prey.y += prey.vy * simDt;

        this.decayEncounterFeedback(prey, simDt, sampled.threat);
        prey.renderStretchX = 1.06;
        prey.renderStretchY = 0.94;
        prey.pulse += simDt * (1.68 + prey.pulseMul * 1.04 + sampled.threat * 0.46);
        prey.displayX = damp(prey.displayX, prey.x, 16, simDt);
        prey.displayY = damp(prey.displayY, prey.y, 16, simDt);
        prey.displayRotation = dampAngle(prey.displayRotation, prey.escapeAngle, 6.4, simDt);
        this.finalizeEncounterTelemetry(prey, distanceFromCenter, sampled.threat, simDt);
    },
    updateDartEliteBehavior(prey, distanceFromCenter, tuning, simDt) {
        const sampled = this.sampleEncounterThreat(prey, distanceFromCenter, 0.94);
        const curveStrength = this.getEncounterBehaviorTuning(prey.speciesId, 'CurveStrength', 0.68);
        const desired = normalize(
            sampled.away.x * (0.54 + sampled.threat * 0.26) + sampled.orbit.x * curveStrength,
            sampled.away.y * (0.54 + sampled.threat * 0.26) + sampled.orbit.y * curveStrength,
            sampled.away.x,
            sampled.away.y
        );
        const desiredAngle = Math.atan2(desired.y, desired.x);
        const nextState = prey.attachments.length > 0 ? 'burst' : 'evade';
        if (prey.behaviorState !== nextState) {
            this.notePreyStateTransition(prey, nextState, { threat: sampled.threat });
        }
        prey.escapeAngle = dampAngle(prey.escapeAngle || desiredAngle, desiredAngle, 4.8 * tuning.pacing.globalTurnMul, simDt);
        prey.escapeDirX = Math.cos(prey.escapeAngle);
        prey.escapeDirY = Math.sin(prey.escapeAngle);
        const targetSpeed = prey.speed * (0.86 + sampled.threat * 0.28) * tuning.pacing.globalSpeedMul;
        const accel = prey.accel * (0.78 + sampled.threat * 0.22) * tuning.pacing.globalAccelMul;
        prey.vx += prey.escapeDirX * accel * simDt;
        prey.vy += prey.escapeDirY * accel * simDt;
        const speed = Math.hypot(prey.vx, prey.vy);
        if (speed > targetSpeed) {
            const scale = targetSpeed / Math.max(speed, 0.0001);
            prey.vx *= scale;
            prey.vy *= scale;
        }
        const drag = (prey.attachments.length > 0 ? 0.72 : 0.84) * tuning.pacing.globalDragMul;
        prey.vx *= Math.exp(-drag * simDt);
        prey.vy *= Math.exp(-drag * simDt);
        prey.x += prey.vx * simDt;
        prey.y += prey.vy * simDt;

        this.decayEncounterFeedback(prey, simDt, sampled.threat);
        prey.renderStretchX = 1.18;
        prey.renderStretchY = 0.7;
        prey.alertPulse = Math.max(prey.alertPulse || 0, 0.24 + prey.attachments.length * 0.08);
        prey.pulse += simDt * (2.22 + prey.pulseMul * 1.42 + sampled.threat * 1.18);
        prey.displayX = damp(prey.displayX, prey.x, 20, simDt);
        prey.displayY = damp(prey.displayY, prey.y, 20, simDt);
        prey.displayRotation = dampAngle(prey.displayRotation, prey.escapeAngle, 14, simDt);
        this.finalizeEncounterTelemetry(prey, distanceFromCenter, sampled.threat, simDt);
    },
    updateEliteEncounterBehavior(prey, distanceFromCenter, tuning, simDt) {
        switch (prey.behaviorId) {
            case 'elite-rect':
                this.updateRectEliteBehavior(prey, distanceFromCenter, tuning, simDt);
                break;
            case 'elite-spinner':
                this.updateSpinnerEliteBehavior(prey, distanceFromCenter, tuning, simDt);
                break;
            case 'elite-brute':
                this.updateBruteEliteBehavior(prey, distanceFromCenter, tuning, simDt);
                break;
            case 'elite-dart':
                this.updateDartEliteBehavior(prey, distanceFromCenter, tuning, simDt);
                break;
            default:
                this.updateBruteEliteBehavior(prey, distanceFromCenter, tuning, simDt);
                break;
        }
    },
    emitObjectivePulse(prey) {
        const pushRadius = this.getEncounterBehaviorTuning(prey.speciesId, 'PushRadius', 460);
        const pushStrength = this.getEncounterBehaviorTuning(prey.speciesId, 'PushStrength', 380);
        const life = this.getEncounterBehaviorTuning(prey.speciesId, 'PulseLife', 0.82);
        this.createRing(prey.x, prey.y, prey.radius + 30, prey.signalColor || COLORS.core, life, 3, 'objective-wave');
        this.createRing(prey.x, prey.y, prey.radius + pushRadius * 0.22, prey.signalColor || COLORS.core, life * 1.08, 2, 'objective-wave');
        this.activeNodes.forEach((node) => {
            const dx = node.x - prey.x;
            const dy = node.y - prey.y;
            const distance = Math.hypot(dx, dy) || 0.0001;
            if (distance > pushRadius) {
                return;
            }
            const force = Math.max(0, 1 - distance / pushRadius);
            node.vx += dx / distance * pushStrength * force * 0.018;
            node.vy += dy / distance * pushStrength * force * 0.018;
            node.hookTension = Math.max(node.hookTension || 0, 0.24 + force * 0.42);
        });
    },
    updateObjectiveEncounterBehavior(prey, distanceFromCenter, tuning, simDt) {
        const sampled = this.sampleEncounterThreat(prey, distanceFromCenter, 1.14);
        const desiredAngle = Math.atan2(sampled.away.y, sampled.away.x);
        const driftSpeed = this.getEncounterBehaviorTuning(prey.speciesId, 'DriftSpeed', 0.24) * tuning.pacing.globalSpeedMul;
        const pulseInterval = this.getEncounterBehaviorTuning(prey.speciesId, 'PulseInterval', 1.42);
        if (prey.behaviorState !== 'objective') {
            this.notePreyStateTransition(prey, 'objective', { threat: sampled.threat });
        }
        prey.escapeAngle = dampAngle(prey.escapeAngle || desiredAngle, desiredAngle, 1.2 * tuning.pacing.globalTurnMul, simDt);
        prey.escapeDirX = Math.cos(prey.escapeAngle);
        prey.escapeDirY = Math.sin(prey.escapeAngle);
        prey.vx += prey.escapeDirX * prey.accel * driftSpeed * simDt * 0.2;
        prey.vy += prey.escapeDirY * prey.accel * driftSpeed * simDt * 0.2;
        const targetSpeed = prey.speed * driftSpeed;
        const speed = Math.hypot(prey.vx, prey.vy);
        if (speed > targetSpeed) {
            const scale = targetSpeed / Math.max(speed, 0.0001);
            prey.vx *= scale;
            prey.vy *= scale;
        }
        prey.vx *= Math.exp(-1.34 * tuning.pacing.globalDragMul * simDt);
        prey.vy *= Math.exp(-1.34 * tuning.pacing.globalDragMul * simDt);
        prey.x += prey.vx * simDt;
        prey.y += prey.vy * simDt;

        prey.objectivePulseTimer = Math.max(0, (prey.objectivePulseTimer || pulseInterval) - simDt);
        if (prey.objectivePulseTimer <= 0) {
            prey.objectivePulseTimer = pulseInterval * Phaser.Math.FloatBetween(0.92, 1.08);
            prey.objectiveGlow = Math.max(prey.objectiveGlow || 0, 1.18);
            this.emitObjectivePulse(prey);
        }

        this.decayEncounterFeedback(prey, simDt, sampled.threat * 0.5);
        prey.objectiveGlow = Math.max(prey.objectiveGlow || 0, 0.28);
        prey.renderStretchX = 1 + Math.sin(this.worldTime * 2.6 + prey.seed) * 0.04;
        prey.renderStretchY = 1 + Math.cos(this.worldTime * 2.1 + prey.seed) * 0.04;
        prey.pulse += simDt * (2.4 + prey.pulseMul * 1.6 + sampled.threat * 0.6);
        prey.displayX = damp(prey.displayX, prey.x, 14, simDt);
        prey.displayY = damp(prey.displayY, prey.y, 14, simDt);
        prey.displayRotation = dampAngle(prey.displayRotation, prey.escapeAngle, 5.4, simDt);
        this.finalizeEncounterTelemetry(prey, distanceFromCenter, sampled.threat, simDt);
    },
    updatePrey(simDt) {
        this.refreshPreySpatialCache();
        const tuning = this.getPreyBehaviorTuning();
        const behaviorLodDistance = this.getPreyBehaviorLodDistance();
        const simpleFleeMode = this.isPreySimpleFleeModeEnabled();
        const behaviorProfileCache = Object.create(null);
        for (let i = this.prey.length - 1; i >= 0; i -= 1) {
            const prey = this.prey[i];
            const distanceFromCenter = Math.hypot(prey.x - this.player.centroidX, prey.y - this.player.centroidY);
            const cullDistance = this.getPreyCullDistance(prey);
            if (distanceFromCenter > cullDistance) {
                this.finishPreyChaseTelemetry(prey, 'escaped', { reason: 'out-of-range' });
                // swap-and-pop: O(1) removal instead of splice O(n)
                const last = this.prey.length - 1;
                if (i !== last) { this.prey[i] = this.prey[last]; }
                this.prey.pop();
                continue;
            }

            if (prey.encounterClass === 'basic') {
                this.updateBasicEncounterBehavior(prey, distanceFromCenter, simpleFleeMode, tuning, simDt);
                continue;
            }
            if (prey.encounterClass === 'elite') {
                this.updateEliteEncounterBehavior(prey, distanceFromCenter, tuning, simDt);
                continue;
            }
            if (prey.isObjective) {
                this.updateObjectiveEncounterBehavior(prey, distanceFromCenter, tuning, simDt);
                continue;
            }

            if (this.shouldUseSimplifiedPreyBehavior(prey, distanceFromCenter, behaviorLodDistance, simpleFleeMode)) {
                this.updatePreySimpleBehavior(prey, distanceFromCenter, behaviorLodDistance, simpleFleeMode, tuning, simDt);
                continue;
            }

            const nearbyNodes = this.pickNearbyNodes(prey.x, prey.y, 6, 240 + prey.radius + (prey.isObjective ? 60 : 0));
            const nearbyPrey = prey.schoolRadius > 0 ? this.pickNearbyPrey(prey, prey.schoolRadius, 6) : [];
            const profileKey = prey.archetype || 'skittish';
            let profile = behaviorProfileCache[profileKey];
            if (!profile) {
                profile = this.getPreyBehaviorProfile(prey, tuning);
                behaviorProfileCache[profileKey] = profile;
            }
            const threat = this.evaluatePreyThreat(prey, nearbyNodes, nearbyPrey, tuning);
            this.updatePreyStateMachine(prey, threat, profile, tuning, simDt);
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
            const awayWeight = (profile.awayWeight[stateKey] || 0.6) * tuning.pacing.awayMul;
            const wanderWeight = (profile.wanderWeight[stateKey] || 0.12) * tuning.pacing.wanderMul;
            const schoolWeight = (profile.schoolWeight[stateKey] || 0.1) * tuning.pacing.schoolMul;
            const strafeWeight = (profile.strafeWeight[stateKey] || 0.08) * tuning.pacing.strafeMul;
            const jitterWeight = (profile.jitterWeight[stateKey] || 0.12) * tuning.pacing.jitterMul;
            const desiredX = threat.away.x * awayWeight
                + wander.x * prey.wander * wanderWeight * (1 - attachmentPenalty * 0.7)
                + school.x * schoolWeight * 0.016
                + strafeX * strafeWeight
                + Math.cos(prey.seed * 11 + this.worldTime * 5.8) * jitterWeight;
            const desiredY = threat.away.y * awayWeight
                + wander.y * prey.wander * wanderWeight * (1 - attachmentPenalty * 0.7)
                + school.y * schoolWeight * 0.016
                + strafeY * strafeWeight
                + Math.sin(prey.seed * 7 + this.worldTime * 5.2) * jitterWeight;
            const desired = normalize(desiredX, desiredY, threat.away.x, threat.away.y);
            const desiredAngle = Math.atan2(desired.y, desired.x);
            prey.escapeAngle = dampAngle(prey.escapeAngle || desiredAngle, desiredAngle, profile.turnRates[stateKey] || 4.2, simDt);
            prey.escapeDirX = Math.cos(prey.escapeAngle);
            prey.escapeDirY = Math.sin(prey.escapeAngle);

            const archetypePaceMul = (tuning.archetypeSpeed[prey.archetype] || tuning.archetypeSpeed.skittish) * (prey.isObjective ? tuning.archetypeSpeed.objective : 1);
            const paceMul = tuning.pacing.globalSpeedMul * archetypePaceMul;
            const capabilityRatio = Math.max(
                0.18,
                0.28 * paceMul,
                (profile.capabilityRatios[stateKey] || 0.58) * (tuning.stateCapability[stateKey] || 1) * paceMul - profile.dominance * profile.dominanceDrop
            );
            const nativeSpeed = prey.speed * (profile.nativeSpeedMuls[stateKey] || 0.62) * paceMul;
            const targetSpeed = clamp(
                Math.max(nativeSpeed, threat.playerRefSpeed * capabilityRatio) * (1 - attachmentPenalty * 0.46),
                prey.speed * 0.34 * paceMul,
                prey.speed * profile.speedCapMul * tuning.pacing.globalSpeedCapMul * paceMul
            ) * ((prey.guardPulse || 0) > 0.18 ? 0.94 : 1);
            const accel = prey.accel
                * (profile.accelMuls[stateKey] || 0.9)
                * tuning.pacing.globalAccelMul
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

            const baseDrag = prey.attachments.length > 0
                ? 2.05
                : stateKey === 'burst'
                    ? 0.86
                    : stateKey === 'brace'
                        ? 1.48
                        : prey.shape === 'square'
                            ? 1.28
                            : 0.94;
            const drag = baseDrag
                * tuning.pacing.globalDragMul
                * (prey.attachments.length > 0 ? tuning.pacing.attachmentDragMul : stateKey === 'burst' ? tuning.pacing.burstDragMul : 1);
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
                const preyPush = 0;
                const nodePush = 0;
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
                    const reboundMul = 0;
                    prey.vx += nx * overlap * 10 * reboundMul / Math.max(prey.mass, 0.1);
                    prey.vy += ny * overlap * 10 * reboundMul / Math.max(prey.mass, 0.1);
                    node.vx -= nx * overlap * 8 * reboundMul / Math.max(node.mass, 0.1);
                    node.vy -= ny * overlap * 8 * reboundMul / Math.max(node.mass, 0.1);
                }
            }
        }
    }
};
