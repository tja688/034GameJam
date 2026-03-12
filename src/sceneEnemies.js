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
        performance.mark('CoreDemoScene-updateSpawns-start');
        try {
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
        } finally {
            performance.mark('CoreDemoScene-updateSpawns-end');
            performance.measure('追踪: CoreDemoScene-updateSpawns', 'CoreDemoScene-updateSpawns-start', 'CoreDemoScene-updateSpawns-end');
        }
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
    pickNearestNode(x, y) {
        let best = null;
        let bestDistance = Infinity;
        this.activeNodes.forEach((node) => {
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

        this.activeNodes.forEach((node) => {
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
        this.prey.forEach((prey) => {
            if (prey.id === target.id) {
                return;
            }
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
    updatePrey(simDt) {
        performance.mark('CoreDemoScene-updatePrey-start');
        try {
        performance.mark('CoreDemoScene-updatePrey-loop-start');
        for (let i = this.prey.length - 1; i >= 0; i -= 1) {
            const prey = this.prey[i];
            const toCenterX = prey.x - this.player.centroidX;
            const toCenterY = prey.y - this.player.centroidY;
            const distanceFromCenter = Math.hypot(toCenterX, toCenterY);
            if (distanceFromCenter > 3200) {
                // swap-and-pop: O(1) removal instead of splice O(n)
                const last = this.prey.length - 1;
                if (i !== last) { this.prey[i] = this.prey[last]; }
                this.prey.pop();
                continue;
            }

            const nearbyNodes = this.pickNearbyNodes(prey.x, prey.y, 6, 240 + prey.radius + (prey.isObjective ? 60 : 0));
            const nearbyPrey = prey.schoolRadius > 0 ? this.pickNearbyPrey(prey, prey.schoolRadius, 6) : [];
            let fleeX = toCenterX;
            let fleeY = toCenterY;
            let danger = clamp(1 - (distanceFromCenter - 160) / 260, 0, 1);

            nearbyNodes.forEach((node) => {
                const dx = prey.x - node.x;
                const dy = prey.y - node.y;
                const distance = Math.hypot(dx, dy) || 0.0001;
                const weight = clamp(1 - distance / (240 + prey.radius), 0, 1);
                fleeX += dx / distance * weight * 220;
                fleeY += dy / distance * weight * 220;
                danger = Math.max(danger, weight);
            });

            const escape = normalize(fleeX, fleeY, Math.cos(prey.seed), Math.sin(prey.seed));
            const wanderAngle = this.worldTime * (prey.shape === 'triangle' ? 2.4 : prey.shape === 'circle' ? 1.6 : 1.05) + prey.seed * 4.2;
            const wobble = Math.sin(this.worldTime * (prey.shape === 'triangle' ? 7.2 : 4.6) + prey.seed) * (prey.shape === 'triangle' ? 0.74 : prey.shape === 'circle' ? 0.42 : 0.18);
            const wander = {
                x: Math.cos(wanderAngle + wobble),
                y: Math.sin(wanderAngle * 0.84 - wobble)
            };
            const attachmentPenalty = clamp(prey.attachments.length / Math.max(prey.maxAnchors, 1), 0, 1);

            let schoolX = 0;
            let schoolY = 0;
            if (nearbyPrey.length > 0 && prey.schoolCohesion > 0) {
                let cohesionX = 0;
                let cohesionY = 0;
                let alignX = 0;
                let alignY = 0;
                let separationX = 0;
                let separationY = 0;
                nearbyPrey.forEach((other) => {
                    cohesionX += other.x;
                    cohesionY += other.y;
                    alignX += other.vx;
                    alignY += other.vy;
                    const dx = prey.x - other.x;
                    const dy = prey.y - other.y;
                    const distance = Math.hypot(dx, dy) || 0.0001;
                    const avoid = clamp(1 - distance / Math.max(32, prey.schoolRadius * 0.42), 0, 1);
                    separationX += dx / distance * avoid;
                    separationY += dy / distance * avoid;
                });
                cohesionX = cohesionX / nearbyPrey.length - prey.x;
                cohesionY = cohesionY / nearbyPrey.length - prey.y;
                schoolX += cohesionX * prey.schoolCohesion * (1 - danger * 0.72);
                schoolY += cohesionY * prey.schoolCohesion * (1 - danger * 0.72);
                schoolX += alignX * prey.schoolAlignment * 0.02;
                schoolY += alignY * prey.schoolAlignment * 0.02;
                schoolX += separationX * prey.schoolSeparation * (0.54 + danger * 0.62);
                schoolY += separationY * prey.schoolSeparation * (0.54 + danger * 0.62);
            }

            if ((prey.archetype === 'weakspot' || prey.archetype === 'apex') && prey.weakArc > 0) {
                const threatAngle = Math.atan2(this.player.centroidY - prey.y, this.player.centroidX - prey.x);
                const sway = Math.sin(this.worldTime * (1.8 + prey.rotationMul * 0.16) + prey.seed * 3.4) * 0.22;
                prey.weakAngle = dampAngle(prey.weakAngle, threatAngle + Math.PI + sway, prey.protectTurnRate || 2.4, simDt);
            }

            if ((prey.archetype === 'bulwark' || prey.archetype === 'apex') && prey.bulwarkChargeRate > 0) {
                prey.pushCharge = clamp(
                    prey.pushCharge + (danger * prey.bulwarkChargeRate - (prey.bulwarkReleaseRate || 1) * 0.45) * simDt,
                    0,
                    1.4
                );
                prey.guardPulse = Math.max(0, (prey.guardPulse || 0) - simDt * 2.1);
                if (danger > 0.58 && prey.pushCharge > 0.95 && prey.guardPulse <= 0.05) {
                    prey.guardPulse = prey.bulwarkPulse || 1;
                    prey.pushCharge *= 0.42;
                    this.createRing(prey.x, prey.y, prey.radius + 22, prey.signalColor || prey.color, 0.14, 2, 'prey-guard');
                }
            } else {
                prey.guardPulse = Math.max(0, (prey.guardPulse || 0) - simDt * 1.8);
                prey.pushCharge = Math.max(0, (prey.pushCharge || 0) - simDt * 1.2);
            }

            let strafeX = 0;
            let strafeY = 0;
            if (prey.archetype === 'weakspot' || prey.archetype === 'apex') {
                const side = Math.sin(this.worldTime * 1.7 + prey.seed * 2.4) >= 0 ? 1 : -1;
                strafeX = Math.cos(prey.weakAngle + side * Math.PI * 0.5);
                strafeY = Math.sin(prey.weakAngle + side * Math.PI * 0.5);
            }

            const steer = normalize(
                escape.x * (prey.archetype === 'bulwark' ? 0.58 : prey.archetype === 'apex' ? 0.72 : 0.88 + danger * prey.fleeMul)
                    + wander.x * prey.wander * (1 - attachmentPenalty * 0.72)
                    + schoolX * (prey.archetype === 'school' ? 0.016 : 0.008)
                    + strafeX * (prey.archetype === 'weakspot' ? 0.52 : prey.archetype === 'apex' ? 0.32 : 0),
                escape.y * (prey.archetype === 'bulwark' ? 0.58 : prey.archetype === 'apex' ? 0.72 : 0.88 + danger * prey.fleeMul)
                    + wander.y * prey.wander * (1 - attachmentPenalty * 0.72)
                    + schoolY * (prey.archetype === 'school' ? 0.016 : 0.008)
                    + strafeY * (prey.archetype === 'weakspot' ? 0.52 : prey.archetype === 'apex' ? 0.32 : 0),
                escape.x,
                escape.y
            );
            const accel = prey.accel
                * (1 + danger * 0.55 + prey.panic * 0.32 + (prey.isObjective ? 0.18 : 0))
                * (1 - attachmentPenalty * 0.58);

            prey.vx += steer.x * accel * simDt;
            prey.vy += steer.y * accel * simDt;

            if (prey.attachments.length > 0) {
                const thrashAngle = this.worldTime * (8 + prey.rotationMul * 2.8) + prey.seed * 5.4;
                prey.vx += Math.cos(thrashAngle) * prey.accel * 0.24 * simDt;
                prey.vy += Math.sin(thrashAngle * 0.92) * prey.accel * 0.24 * simDt;
                prey.spin += simDt * (6 + prey.attachments.length * 2.5);
            }

            const speedLimit = prey.speed
                * (1 - attachmentPenalty * 0.52 + danger * 0.18 + (prey.isObjective ? 0.08 : 0))
                * ((prey.guardPulse || 0) > 0.2 ? 0.9 : 1);
            const speed = Math.hypot(prey.vx, prey.vy);
            if (speed > speedLimit) {
                const scale = speedLimit / Math.max(speed, 0.0001);
                prey.vx *= scale;
                prey.vy *= scale;
            }

            const drag = prey.attachments.length > 0 ? 2.15 : prey.shape === 'square' ? 1.32 : 0.96;
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
            prey.spin *= Math.exp(-2.4 * simDt);
            prey.objectiveGlow = Math.max(0, (prey.objectiveGlow || 0) - simDt * 0.18);
            prey.pulse += simDt * (2.4 + prey.pulseMul * 1.8 + danger * 1.2 + attachmentPenalty * 1.5 + (prey.isObjective ? 1.6 : 0));
            prey.displayX = damp(prey.displayX, prey.x, 18, simDt);
            prey.displayY = damp(prey.displayY, prey.y, 18, simDt);
            const heading = Math.atan2(
                prey.vy || Math.sin(wanderAngle),
                prey.vx || Math.cos(wanderAngle)
            );
            prey.displayRotation = dampAngle(prey.displayRotation, heading + prey.spin * 0.02, 12, simDt);
        }
        performance.mark('CoreDemoScene-updatePrey-loop-end');
        performance.measure('追踪: CoreDemoScene-updatePrey-loop', 'CoreDemoScene-updatePrey-loop-start', 'CoreDemoScene-updatePrey-loop-end');
        } finally {
            performance.mark('CoreDemoScene-updatePrey-end');
            performance.measure('追踪: CoreDemoScene-updatePrey', 'CoreDemoScene-updatePrey-start', 'CoreDemoScene-updatePrey-end');
        }
    },
    resolvePreyNodeCollisions() {
        performance.mark('CoreDemoScene-resolvePreyNodeCollisions-start');
        try {
        // Use shared alive-set so finishPreyDevour can mark deaths visible to this loop
        this._preyAliveSet = new Set(this.prey);
        performance.mark('CoreDemoScene-resolvePreyNodeCollisions-loop-start');
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
        performance.mark('CoreDemoScene-resolvePreyNodeCollisions-loop-end');
        performance.measure('追踪: CoreDemoScene-resolvePreyNodeCollisions-loop', 'CoreDemoScene-resolvePreyNodeCollisions-loop-start', 'CoreDemoScene-resolvePreyNodeCollisions-loop-end');
        } finally {
            performance.mark('CoreDemoScene-resolvePreyNodeCollisions-end');
            performance.measure('追踪: CoreDemoScene-resolvePreyNodeCollisions', 'CoreDemoScene-resolvePreyNodeCollisions-start', 'CoreDemoScene-resolvePreyNodeCollisions-end');
        }
    }
};
