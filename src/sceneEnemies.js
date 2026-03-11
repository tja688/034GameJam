const SceneEnemiesMixin = {
    updateSpawns(simDt) {
        if (this.prey.length > 48) {
            return;
        }

        const time = this.worldTime;
        this.spawnTimers.small -= simDt;
        this.spawnTimers.medium -= simDt;
        this.spawnTimers.large -= simDt;

        if (this.prey.length < 5 && this.spawnTimers.small > 0.2) {
            this.spawnTimers.small = 0.2;
        }

        if (this.spawnTimers.small <= 0) {
            this.spawnPreyGroup('small', Phaser.Math.Between(1, time > 14 ? 3 : 2));
            this.spawnTimers.small = Math.max(0.28, 0.62 - Math.min(0.24, time * 0.008));
        }

        if (time > 7 && this.spawnTimers.medium <= 0) {
            this.spawnPreyGroup('medium', Phaser.Math.Between(1, time > 26 ? 2 : 1));
            this.spawnTimers.medium = Math.max(1.35, 2.3 - Math.min(0.75, (time - 7) * 0.018));
        }

        if (time > 18 && this.spawnTimers.large <= 0) {
            this.spawnPreyGroup('large', 1);
            this.spawnTimers.large = Math.max(5.2, 7.6 - Math.min(1.6, (time - 18) * 0.035));
        }
    },
    spawnPreyGroup(sizeKey, count, forcedShape = null) {
        for (let i = 0; i < count; i += 1) {
            this.prey.push(this.createPrey(sizeKey, null, null, forcedShape));
        }
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
    createPrey(sizeKey, forcedSide = null, forcedAxis = null, forcedShape = null) {
        const sizeDef = PREY_SIZE_DEFS[sizeKey];
        const shape = forcedShape || this.pickSpawnShape(sizeKey);
        const shapeDef = PREY_SHAPE_DEFS[shape];
        const worldHalfWidth = this.cameraRig.viewportWidth * 0.5 / this.cameraRig.zoom;
        const worldHalfHeight = this.cameraRig.viewportHeight * 0.5 / this.cameraRig.zoom;
        const margin = 260;
        const side = forcedSide || Phaser.Utils.Array.GetRandom(['left', 'right', 'top', 'bottom']);
        let x = 0;
        let y = 0;

        if (side === 'left') {
            x = this.player.centroidX - worldHalfWidth - margin;
            y = forcedAxis ?? Phaser.Math.Between(this.player.centroidY - worldHalfHeight, this.player.centroidY + worldHalfHeight);
        } else if (side === 'right') {
            x = this.player.centroidX + worldHalfWidth + margin;
            y = forcedAxis ?? Phaser.Math.Between(this.player.centroidY - worldHalfHeight, this.player.centroidY + worldHalfHeight);
        } else if (side === 'top') {
            x = Phaser.Math.Between(this.player.centroidX - worldHalfWidth, this.player.centroidX + worldHalfWidth);
            y = this.player.centroidY - worldHalfHeight - margin;
        } else {
            x = Phaser.Math.Between(this.player.centroidX - worldHalfWidth, this.player.centroidX + worldHalfWidth);
            y = this.player.centroidY + worldHalfHeight + margin;
        }

        const shapeRadiusMul = shape === 'triangle' ? 0.92 : shape === 'square' ? 1.06 : 1;
        const maxHealth = sizeDef.maxHealth * (shape === 'square' ? 1.12 : shape === 'triangle' ? 0.88 : 1);
        const radius = sizeDef.radius * shapeRadiusMul;
        const id = `prey-${this.preyIdCounter++}`;
        return {
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
    },
    updatePrey(simDt) {
        for (let i = this.prey.length - 1; i >= 0; i -= 1) {
            const prey = this.prey[i];
            const toCenterX = prey.x - this.player.centroidX;
            const toCenterY = prey.y - this.player.centroidY;
            const distanceFromCenter = Math.hypot(toCenterX, toCenterY);
            if (distanceFromCenter > 2600) {
                this.prey.splice(i, 1);
                continue;
            }

            const nearbyNodes = this.pickNearbyNodes(prey.x, prey.y, 6, 240 + prey.radius);
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
            const steer = normalize(
                escape.x * (0.88 + danger * prey.fleeMul) + wander.x * prey.wander * (1 - attachmentPenalty * 0.72),
                escape.y * (0.88 + danger * prey.fleeMul) + wander.y * prey.wander * (1 - attachmentPenalty * 0.72),
                escape.x,
                escape.y
            );
            const accel = prey.accel
                * (1 + danger * 0.55 + prey.panic * 0.32)
                * (1 - attachmentPenalty * 0.58);

            prey.vx += steer.x * accel * simDt;
            prey.vy += steer.y * accel * simDt;

            if (prey.attachments.length > 0) {
                const thrashAngle = this.worldTime * (8 + prey.rotationMul * 2.8) + prey.seed * 5.4;
                prey.vx += Math.cos(thrashAngle) * prey.accel * 0.24 * simDt;
                prey.vy += Math.sin(thrashAngle * 0.92) * prey.accel * 0.24 * simDt;
                prey.spin += simDt * (6 + prey.attachments.length * 2.5);
            }

            const speedLimit = prey.speed * (1 - attachmentPenalty * 0.52 + danger * 0.18);
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
            prey.spin *= Math.exp(-2.4 * simDt);
            prey.pulse += simDt * (2.4 + prey.pulseMul * 1.8 + danger * 1.2 + attachmentPenalty * 1.5);
            prey.displayX = damp(prey.displayX, prey.x, 18, simDt);
            prey.displayY = damp(prey.displayY, prey.y, 18, simDt);
            const heading = Math.atan2(
                prey.vy || Math.sin(wanderAngle),
                prey.vx || Math.cos(wanderAngle)
            );
            prey.displayRotation = dampAngle(prey.displayRotation, heading + prey.spin * 0.02, 12, simDt);
        }
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
    resolvePreyNodeCollisions() {
        for (let i = this.prey.length - 1; i >= 0; i -= 1) {
            const prey = this.prey[i];
            const candidates = this.pickNearbyNodes(prey.x, prey.y, 6, prey.radius + 126);
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
                if (!this.prey.includes(prey)) {
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
                const preyPush = existingAttachment ? 0.12 : 0.62;
                const nodePush = existingAttachment ? 0.08 : 0.24;
                prey.x += nx * overlap * preyPush;
                prey.y += ny * overlap * preyPush;
                node.x -= nx * overlap * nodePush;
                node.y -= ny * overlap * nodePush;

                const impactScale = clamp(
                    (Math.hypot(node.vx, node.vy) + Math.max(0, node.predationWindow || 0) * 150 + overlap * 24) / 220,
                    0,
                    2
                );
                this.tryLatchPrey(prey, node, nx, ny, impactScale);
                if (!this.prey.includes(prey)) {
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
    },
};
