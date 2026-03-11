const SceneCombatMixin = {
    getNodeContactRadius(node) {
        if (node.shape === 'square') {
            return 18;
        }
        if (node.shape === 'triangle') {
            return 16;
        }
        return 17;
    },
    getNodePredationProfile(node) {
        if (node.shape === 'triangle') {
            return {
                mode: 'hook',
                biteWindow: 0.54,
                grip: node.role === 'blade' ? 1.34 : 1.12,
                cut: node.role === 'blade' ? 1.46 : 1.18,
                suction: 0.18,
                chewInterval: node.role === 'blade' ? 0.1 : 0.12,
                spin: 0,
                pulse: 0.62
            };
        }
        if (node.shape === 'square') {
            return {
                mode: 'grind',
                biteWindow: 0.62,
                grip: node.role === 'prism' ? 1.06 : 0.92,
                cut: node.role === 'prism' ? 1.36 : 1.14,
                suction: 0.24,
                chewInterval: node.role === 'prism' ? 0.08 : 0.1,
                spin: node.role === 'prism' ? 21 : 16,
                pulse: 0.76
            };
        }
        return {
            mode: 'feed',
            biteWindow: 0.46,
            grip: node.role === 'compressor' ? 0.86 : 0.7,
            cut: 0,
            suction: node.role === 'compressor' ? 1.58 : 1.22,
            chewInterval: node.role === 'compressor' ? 0.07 : 0.09,
            spin: 0,
            pulse: node.role === 'compressor' ? 1.42 : 1.2
        };
    },
    getNodeLivePredationProfile(node) {
        const base = this.getNodePredationProfile(node);
        return {
            ...base,
            mode: node.predationMode || base.mode,
            biteWindow: Math.max(base.biteWindow, node.predationWindow || 0),
            grip: Math.max(base.grip, node.gripPower || 0),
            cut: Math.max(base.cut, node.cutPower || 0),
            suction: Math.max(base.suction, node.suctionPower || 0),
            chewInterval: node.chewInterval || base.chewInterval,
            spin: Math.max(base.spin, node.spinVelocity || 0),
            pulse: Math.max(base.pulse, node.feedPulse || 0)
        };
    },
    primeNodePredation(node, profile, direction) {
        node.predationMode = profile.mode;
        node.predationWindow = Math.max(node.predationWindow, profile.biteWindow);
        node.gripPower = profile.grip;
        node.cutPower = profile.cut;
        node.suctionPower = profile.suction;
        node.chewInterval = profile.chewInterval;
        node.attackTimer = Math.max(node.attackTimer, profile.biteWindow);
        node.attackDirX = direction.x;
        node.attackDirY = direction.y;
        node.attackDamage = profile.cut * 16;
        node.spinVelocity = Math.max(node.spinVelocity || 0, profile.spin || 0);
        node.feedPulse = Math.max(node.feedPulse || 0, profile.pulse || 0);
        node.hookTension = Math.max(node.hookTension || 0, profile.mode === 'hook' ? 1 : 0.42);
        node.biteGlow = Math.max(node.biteGlow || 0, 1);
    },
    pulseFeed(node, edge, variant = 'source') {
        const T = window.TUNING || {};
        const isCompressor = variant === 'compressor';
        this.plantNode(node, {
            forwardBase: isCompressor ? (T.plantCompressorForward ?? 92) : (T.plantSourceForward ?? 78),
            sideBase: isCompressor ? (T.plantCompressorSide ?? 62) : (T.plantSourceSide ?? 88),
            stance: (isCompressor ? (T.plantCompressorStance ?? 0.28) : (T.plantSourceStance ?? 0.36)) * edge.stance,
            strength: isCompressor ? (T.plantCompressorStrength ?? 320) : (T.plantSourceStrength ?? 260),
            reachScale: edge.reach * (isCompressor ? 1.02 : 0.92),
            flowBias: isCompressor ? 0.52 : 0.42,
            aimBias: isCompressor ? 0.48 : 0.58
        });

        const driveIntent = this.resolveNodeDriveIntent(node);
        const mouthDir = normalize(
            driveIntent.focus.x * 0.72 + driveIntent.flow.x * 0.28,
            driveIntent.focus.y * 0.72 + driveIntent.flow.y * 0.28,
            Math.cos(this.player.heading),
            Math.sin(this.player.heading)
        );
        const base = this.getNodePredationProfile(node);
        const profile = {
            ...base,
            biteWindow: isCompressor ? 0.52 : 0.44,
            grip: isCompressor ? 0.9 : 0.72,
            suction: isCompressor ? 1.74 : 1.28,
            chewInterval: isCompressor ? 0.065 : 0.085,
            pulse: isCompressor ? 1.46 : 1.18
        };
        this.primeNodePredation(node, profile, mouthDir);
        this.createRing(node.anchorX, node.anchorY, isCompressor ? 34 : 28, COLORS.circle, 0.14, 2);
    },
    performGrind(node, edge, variant = 'shell') {
        const T = window.TUNING || {};
        const isPrism = variant === 'prism';
        this.plantNode(node, {
            forwardBase: isPrism ? 72 : (T.plantShellForward ?? 52),
            sideBase: isPrism ? 124 : (T.plantShellSide ?? 146),
            stance: (isPrism ? 0.4 : (T.plantShellStance ?? 0.5)) * edge.stance,
            strength: (isPrism ? 450 : (T.plantShellStrength ?? 420)) * edge.stability,
            reachScale: edge.reach * (isPrism ? 0.98 : 0.88),
            flowBias: isPrism ? 0.46 : 0.68,
            aimBias: isPrism ? 0.54 : 0.32
        });

        const driveIntent = this.resolveNodeDriveIntent(node);
        const strikeDir = normalize(
            driveIntent.flow.x * 0.44 + driveIntent.focus.x * 0.56,
            driveIntent.flow.y * 0.44 + driveIntent.focus.y * 0.56,
            Math.cos(this.player.heading),
            Math.sin(this.player.heading)
        );
        const base = this.getNodePredationProfile(node);
        const profile = {
            ...base,
            biteWindow: isPrism ? 0.68 : 0.6,
            grip: isPrism ? 1.12 : 0.94,
            cut: isPrism ? 1.42 : 1.16,
            chewInterval: isPrism ? 0.075 : 0.095,
            spin: isPrism ? 24 : 18,
            pulse: 0.8
        };
        this.primeNodePredation(node, profile, strikeDir);
        this.createRing(node.anchorX, node.anchorY, 38, COLORS.square, 0.14, 2);
    },
    performHookStrike(node, edge, variant = 'dart') {
        const T = window.TUNING || {};
        const isBlade = variant === 'blade';
        this.plantNode(node, {
            forwardBase: isBlade ? 194 : (T.plantDartForward ?? 148),
            sideBase: isBlade ? 18 : (T.plantDartSide ?? 54),
            stance: (isBlade ? 0.3 : (T.plantDartStance ?? 0.42)) * edge.stance,
            strength: isBlade ? 510 : (T.plantDartStrength ?? 330),
            reachScale: edge.reach * (isBlade ? 1.14 : 1.04),
            flowBias: isBlade ? 0.68 : 0.32,
            aimBias: isBlade ? 0.32 : 0.68
        });

        const driveIntent = this.resolveNodeDriveIntent(node);
        const strikeDir = normalize(
            driveIntent.flow.x * 0.62 + driveIntent.focus.x * 0.38,
            driveIntent.flow.y * 0.62 + driveIntent.focus.y * 0.38,
            Math.cos(this.player.heading),
            Math.sin(this.player.heading)
        );
        const base = this.getNodePredationProfile(node);
        const profile = {
            ...base,
            biteWindow: isBlade ? 0.58 : 0.5,
            grip: isBlade ? 1.42 : 1.14,
            cut: isBlade ? 1.52 : 1.2,
            chewInterval: isBlade ? 0.09 : 0.12,
            pulse: 0.68
        };
        this.primeNodePredation(node, profile, strikeDir);
        this.createRing(node.anchorX, node.anchorY, 32, COLORS.triangle, 0.14, 2);
    },
    findPredationAttachment(prey, nodeIndex) {
        return (prey.attachments || []).find((attachment) => attachment.nodeIndex === nodeIndex) || null;
    },
    canNodeLatchPrey(node, prey, profile) {
        if (node.attachedPreyId && node.attachedPreyId !== prey.id) {
            return false;
        }
        if (profile.mode !== 'feed' && (node.predationWindow || 0) <= 0.03) {
            return false;
        }
        if (profile.mode === 'feed') {
            if (prey.sizeKey === 'large' && prey.exposed < 0.22 && (prey.attachments?.length || 0) < 2) {
                return false;
            }
            return true;
        }
        const limit = prey.maxAnchors + Math.floor((prey.exposed || 0) * 2.2);
        return (prey.attachments?.length || 0) < limit;
    },
    tryLatchPrey(prey, node, nx, ny, impactScale = 1) {
        const profile = this.getNodeLivePredationProfile(node);
        const existing = this.findPredationAttachment(prey, node.index);
        if (existing) {
            existing.life = Math.min(1.35, existing.life + 0.18 + impactScale * 0.04);
            existing.depth = Math.max(existing.depth, prey.sizeKey === 'small' ? 0.4 : 0.12);
            node.hookTension = Math.max(node.hookTension || 0, 0.65);
            node.feedPulse = Math.max(node.feedPulse || 0, profile.mode === 'feed' ? 1.18 : 0.62);
            return existing;
        }

        if (!this.canNodeLatchPrey(node, prey, profile)) {
            return null;
        }

        if (prey.sizeKey === 'small' && profile.mode !== 'feed') {
            this.damagePrey(prey, prey.health + prey.maxHealth, -nx, -ny, node, {
                mode: profile.mode,
                grip: profile.grip,
                cut: profile.cut,
                suction: profile.suction
            });
            node.hookTension = Math.max(node.hookTension || 0, 1);
            node.biteGlow = Math.max(node.biteGlow || 0, 1);
            return null;
        }

        const attachment = {
            nodeIndex: node.index,
            mode: profile.mode,
            grip: profile.grip,
            cut: profile.cut,
            suction: profile.suction,
            chewInterval: profile.chewInterval,
            chewTimer: 0,
            depth: prey.sizeKey === 'medium' ? 0.14 : 0.1,
            life: profile.mode === 'hook' ? 1.18 : profile.mode === 'grind' ? 1.02 : 0.82,
            phase: Math.random() * Math.PI * 2
        };
        prey.attachments.push(attachment);
        node.attachedPreyId = prey.id;
        node.hookTension = Math.max(node.hookTension || 0, profile.mode === 'hook' ? 1 : 0.56);
        node.feedPulse = Math.max(node.feedPulse || 0, profile.mode === 'feed' ? 1.36 : 0.8);
        node.spinVelocity = Math.max(node.spinVelocity || 0, profile.mode === 'grind' ? 22 : 0);
        node.biteGlow = Math.max(node.biteGlow || 0, 1);
        prey.panic = clamp((prey.panic || 0) + 0.3, 0, 1.6);
        prey.shudder = clamp((prey.shudder || 0) + 0.44, 0, 1.8);
        this.createRing(prey.x, prey.y, prey.radius + 8, node.color, 0.09, 2);
        this.spawnFragmentBurst(prey.x, prey.y, {
            count: profile.mode === 'feed' ? 2 : 4,
            speed: profile.mode === 'feed' ? 44 : 86,
            size: profile.mode === 'feed' ? 3.8 : 4.8,
            baseColor: profile.mode === 'feed' ? COLORS.energy : COLORS.flesh,
            collectible: false,
            energyBias: profile.mode === 'feed' ? 0.62 : 0.12,
            directionX: node.attackDirX || -nx,
            directionY: node.attackDirY || -ny
        });
        return attachment;
    },
    getPreyPressure(prey, nodeByIndex = null) {
        const attachments = prey.attachments || [];
        if (attachments.length === 0) {
            return {
                pressure: 0,
                cutterCount: 0,
                grindCount: 0,
                feedCount: 0,
                totalGrip: 0,
                encirclement: 0
            };
        }

        let cutterCount = 0;
        let grindCount = 0;
        let feedCount = 0;
        let totalGrip = 0;
        const angles = [];

        attachments.forEach((attachment) => {
            totalGrip += attachment.grip || 0;
            if (attachment.mode === 'feed') {
                feedCount += 1;
            } else {
                cutterCount += 1;
                if (attachment.mode === 'grind') {
                    grindCount += 1;
                }
            }
            const node = nodeByIndex ? nodeByIndex.get(attachment.nodeIndex) : this.activeNodes.find((entry) => entry.index === attachment.nodeIndex);
            if (!node) {
                return;
            }
            angles.push(Math.atan2(node.y - prey.y, node.x - prey.x));
        });

        let spread = 0;
        for (let i = 0; i < angles.length; i += 1) {
            for (let j = i + 1; j < angles.length; j += 1) {
                spread = Math.max(spread, Math.abs(Phaser.Math.Angle.Wrap(angles[i] - angles[j])));
            }
        }

        const encirclement = clamp((attachments.length - 1) / Math.max(2, prey.maxAnchors - 1), 0, 1)
            * clamp(spread / Math.PI, 0, 1);
        const sizeResistance = prey.sizeKey === 'large' ? 3.8 : prey.sizeKey === 'medium' ? 2.5 : 1.2;
        const pressure = clamp(
            (cutterCount * 0.58 + grindCount * 0.22 + totalGrip * 0.28 + encirclement * 1.1 + feedCount * 0.12)
            / sizeResistance,
            0,
            1.45
        );

        return {
            pressure,
            cutterCount,
            grindCount,
            feedCount,
            totalGrip,
            encirclement
        };
    },
    updatePredation(simDt) {
        const nodeByIndex = new Map(this.activeNodes.map((node) => [node.index, node]));
        this.activeNodes.forEach((node) => {
            node.attachedPreyCount = 0;
            node.attachedPreyId = '';
        });

        let totalAttachments = 0;
        for (let i = this.prey.length - 1; i >= 0; i -= 1) {
            const prey = this.prey[i];
            prey.attachments = (prey.attachments || []).filter((attachment) => {
                const node = nodeByIndex.get(attachment.nodeIndex);
                if (!node) {
                    return false;
                }
                const dx = node.x - prey.x;
                const dy = node.y - prey.y;
                const distance = Math.hypot(dx, dy);
                const maxDistance = prey.radius + this.getNodeContactRadius(node) + (attachment.mode === 'hook' ? 82 : 68);
                attachment.life -= distance > maxDistance ? simDt * 2.2 : simDt * 0.3;
                if (attachment.life <= 0) {
                    return false;
                }
                node.attachedPreyCount = (node.attachedPreyCount || 0) + 1;
                node.attachedPreyId = prey.id;
                return true;
            });

            if (prey.attachments.length === 0) {
                prey.exposed = Math.max(0, (prey.exposed || 0) - simDt * 0.035);
                continue;
            }

            const pressure = this.getPreyPressure(prey, nodeByIndex);
            totalAttachments += prey.attachments.length;
            prey.exposed = clamp(
                Math.max(prey.exposed || 0, pressure.pressure * 0.24 + pressure.encirclement * 0.18),
                0,
                1
            );

            for (let j = prey.attachments.length - 1; j >= 0; j -= 1) {
                const attachment = prey.attachments[j];
                const node = nodeByIndex.get(attachment.nodeIndex);
                if (!node) {
                    prey.attachments.splice(j, 1);
                    continue;
                }

                const dx = node.x - prey.x;
                const dy = node.y - prey.y;
                const distance = Math.hypot(dx, dy) || 0.0001;
                const dirX = dx / distance;
                const dirY = dy / distance;
                const desiredDistance = Math.max(8, prey.radius + this.getNodeContactRadius(node) - attachment.depth * prey.radius * 0.32);
                const stretch = distance - desiredDistance;
                const gripForce = (attachment.mode === 'hook' ? 26 : attachment.mode === 'grind' ? 30 : 18)
                    * (0.72 + pressure.pressure * 0.68 + attachment.depth * 0.56);

                prey.vx += dirX * stretch * gripForce / Math.max(prey.mass, 0.1) * simDt;
                prey.vy += dirY * stretch * gripForce / Math.max(prey.mass, 0.1) * simDt;
                node.vx -= dirX * stretch * gripForce * 0.08 / Math.max(node.mass, 0.1) * simDt;
                node.vy -= dirY * stretch * gripForce * 0.08 / Math.max(node.mass, 0.1) * simDt;
                prey.shudder = Math.max(prey.shudder || 0, pressure.pressure * 0.45 + attachment.depth * 0.34);

                if (attachment.mode === 'grind') {
                    prey.spin += simDt * (10 + pressure.pressure * 10);
                    node.spinVelocity = Math.max(node.spinVelocity || 0, 18 + pressure.pressure * 18);
                } else if (attachment.mode === 'hook') {
                    node.hookTension = Math.max(node.hookTension || 0, 0.84 + attachment.depth * 0.28);
                } else {
                    node.feedPulse = Math.max(node.feedPulse || 0, 1.24);
                }

                const depthGain = attachment.mode === 'feed'
                    ? 0.16 + pressure.pressure * 0.2
                    : 0.22 + pressure.pressure * 0.32 + pressure.encirclement * 0.12;
                attachment.depth = clamp(
                    attachment.depth + simDt * (depthGain + ((node.predationWindow || 0) > 0.04 ? 0.18 : 0)),
                    0.08,
                    1
                );

                attachment.chewTimer -= simDt;
                if (attachment.chewTimer <= 0 && ((node.predationWindow || 0) > 0.02 || attachment.mode === 'feed')) {
                    this.performAttachmentBite(prey, attachment, node, pressure);
                }
            }
        }

        this.player.predationPressure = damp(this.player.predationPressure || 0, clamp(totalAttachments / 10, 0, 1.2), 7.5, simDt);
        this.updateFragments(simDt);
    },
    performAttachmentBite(prey, attachment, node, pressure) {
        let amount = 0;
        if (attachment.mode === 'hook') {
            amount = 5.2 + attachment.cut * 7.6 + pressure.pressure * 6.2 + pressure.encirclement * 5.8;
        } else if (attachment.mode === 'grind') {
            amount = 4.8 + attachment.cut * 8.8 + pressure.pressure * 7.4 + pressure.grindCount * 1.2;
        } else {
            amount = 1.2 + attachment.suction * 2.4 + Math.max(0, (prey.exposed || 0) - 0.12) * 8.4 + pressure.feedCount * 0.7;
        }

        if (prey.sizeKey === 'large' && pressure.cutterCount < 2 && attachment.mode !== 'feed') {
            amount *= 0.42;
        }
        if (attachment.mode === 'feed' && prey.sizeKey === 'large' && (prey.exposed || 0) < 0.26) {
            amount *= 0.16;
        }
        if (prey.sizeKey === 'small' && attachment.mode !== 'feed') {
            amount *= 1.6;
        }

        const resistance = prey.sizeKey === 'large' ? 1.48 : prey.sizeKey === 'medium' ? 1.08 : 0.76;
        amount /= resistance;
        amount *= this.getPreyDamageMultiplier(prey, node, attachment, pressure);

        const biteDir = normalize(
            node.attackDirX || (prey.x - node.x),
            node.attackDirY || (prey.y - node.y),
            prey.x - node.x,
            prey.y - node.y
        );
        this.damagePrey(prey, amount, biteDir.x, biteDir.y, node, attachment);
        attachment.chewTimer = attachment.mode === 'grind' ? 0.08 : attachment.mode === 'hook' ? 0.11 : 0.07;
        node.predationWindow = Math.max(0, (node.predationWindow || 0) - (attachment.mode === 'feed' ? 0.02 : 0.04));
        node.biteGlow = Math.max(node.biteGlow || 0, 1);
        node.feedPulse = Math.max(node.feedPulse || 0, attachment.mode === 'feed' ? 1.42 : 0.72);
        if (attachment.mode === 'grind') {
            node.spinVelocity = Math.max(node.spinVelocity || 0, 20);
        }
        this.bumpFeastMeter(amount / Math.max(prey.maxHealth, 1) * (attachment.mode === 'feed' ? 0.22 : 0.1));
    },
    damagePrey(prey, amount, dirX, dirY, node, attachment = null) {
        if (!this.prey.includes(prey)) {
            return;
        }

        const previousRatio = prey.health / Math.max(prey.maxHealth, 1);
        prey.health -= amount;
        prey.hitFlash = 1;
        prey.wound = clamp((prey.wound || 0) + amount / Math.max(prey.maxHealth, 1) * 1.24, 0, 1.8);
        prey.panic = clamp((prey.panic || 0) + amount / Math.max(prey.maxHealth, 1) * 1.12, 0, 1.7);
        prey.shudder = clamp((prey.shudder || 0) + amount / Math.max(prey.maxHealth, 1) * 1.6, 0, 1.8);
        prey.exposed = clamp(
            (prey.exposed || 0) + amount / Math.max(prey.maxHealth, 1) * (attachment?.mode === 'feed' ? 0.14 : 0.28),
            0,
            1
        );
        prey.vx += dirX * (28 + amount * 2.6) / Math.max(prey.mass, 0.1);
        prey.vy += dirY * (28 + amount * 2.6) / Math.max(prey.mass, 0.1);
        this.createRing(prey.x, prey.y, prey.radius + 10, node?.color || prey.color, 0.1, 2);

        const healthRatio = prey.health / Math.max(prey.maxHealth, 1);
        while (prey.chunkCursor < prey.chunkThresholds.length && healthRatio <= prey.chunkThresholds[prey.chunkCursor]) {
            this.releasePreyFragments(prey, prey.sizeKey === 'large' ? 4 : 2, node, attachment, false, false);
            prey.chunkCursor += 1;
        }

        if (attachment && attachment.mode !== 'feed') {
            this.releasePreyFragments(prey, prey.sizeKey === 'large' ? 2 : 1, node, attachment, false, false);
        } else if (attachment && attachment.mode === 'feed') {
            this.releasePreyFragments(prey, 1, node, attachment, true, false);
        }

        if (prey.health > 0) {
            return;
        }

        const fatalAttachment = attachment || { mode: 'hook', grip: 1, cut: 1, suction: 0 };
        if (previousRatio <= 0) {
            return;
        }
        this.finishPreyDevour(prey, node, fatalAttachment);
    },
    releasePreyFragments(prey, count, node, attachment, collectible = false, fatal = false) {
        const directionX = node?.attackDirX ?? normalize(prey.vx, prey.vy, 1, 0).x;
        const directionY = node?.attackDirY ?? normalize(prey.vx, prey.vy, 0, 1).y;
        const feedBias = attachment?.mode === 'feed' ? 0.62 : 0.14;
        this.spawnFragmentBurst(prey.x, prey.y, {
            count,
            speed: fatal ? 182 : (attachment?.mode === 'feed' ? 58 : 104),
            size: fatal ? 6.4 : 4.8,
            baseColor: fatal ? COLORS.meat : (attachment?.mode === 'feed' ? COLORS.energy : COLORS.flesh),
            collectible: collectible || fatal,
            energyBias: fatal ? 0.55 : feedBias,
            directionX,
            directionY
        });
    },
    finishPreyDevour(prey, node, attachment) {
        const index = this.prey.indexOf(prey);
        if (index >= 0) {
            this.prey.splice(index, 1);
        }
        this.releasePreyFragments(prey, prey.chunkBurst + (prey.sizeKey === 'large' ? 4 : 1), node, attachment, true, true);
        this.createRing(prey.x, prey.y, prey.radius + 24, node?.color || prey.color, 0.22, 3);
        this.createRing(prey.x, prey.y, prey.radius + 8, COLORS.core, 0.16, 2);
        this.bumpFeastMeter(0.18 + prey.yield * 0.09);
        if (node) {
            node.feedPulse = Math.max(node.feedPulse || 0, attachment.mode === 'feed' ? 1.56 : 1.08);
            node.hookTension = Math.max(node.hookTension || 0, attachment.mode === 'hook' ? 1.02 : 0.46);
            node.spinVelocity = Math.max(node.spinVelocity || 0, attachment.mode === 'grind' ? 22 : 0);
            node.biteGlow = Math.max(node.biteGlow || 0, 1);
        }
        if (typeof this.onPreyDevoured === 'function') {
            this.onPreyDevoured(prey, node, attachment);
        }
    },
    spawnFragmentBurst(x, y, options = {}) {
        const {
            count = 4,
            speed = 80,
            size = 4.5,
            baseColor = COLORS.flesh,
            collectible = false,
            energyBias = 0.2,
            directionX = 1,
            directionY = 0
        } = options;
        const aim = normalize(directionX, directionY, 1, 0);

        for (let i = 0; i < count; i += 1) {
            const spread = Phaser.Math.FloatBetween(-1.8, 1.8);
            const angle = Math.atan2(aim.y, aim.x) + spread;
            const speedMul = Phaser.Math.FloatBetween(0.35, 1.08);
            const isEnergy = Math.random() < energyBias;
            const life = Phaser.Math.FloatBetween(isEnergy ? 0.85 : 0.45, isEnergy ? 1.35 : 0.82);
            this.fragments.push({
                x,
                y,
                vx: Math.cos(angle) * speed * speedMul + aim.x * speed * 0.18,
                vy: Math.sin(angle) * speed * speedMul + aim.y * speed * 0.18,
                size: Phaser.Math.FloatBetween(size * 0.72, size * 1.28),
                shape: Phaser.Utils.Array.GetRandom(['circle', 'square', 'triangle']),
                color: isEnergy ? COLORS.energy : baseColor,
                kind: isEnergy ? 'energy' : 'meat',
                collectible: collectible || isEnergy,
                life,
                total: life,
                drag: isEnergy ? 3.2 : 2.1,
                rotation: Math.random() * Math.PI * 2,
                spin: Phaser.Math.FloatBetween(-10, 10),
                pulse: Math.random() * Math.PI * 2
            });
        }
    },
    updateFragments(simDt) {
        const feeders = this.activeNodes.filter((node) => node.shape === 'circle');
        for (let i = this.fragments.length - 1; i >= 0; i -= 1) {
            const fragment = this.fragments[i];
            fragment.life -= simDt;
            if (fragment.life <= 0) {
                this.fragments.splice(i, 1);
                continue;
            }

            let targetNode = null;
            let targetDistanceSq = Infinity;
            if (fragment.collectible && feeders.length > 0) {
                feeders.forEach((node) => {
                    const dx = node.x - fragment.x;
                    const dy = node.y - fragment.y;
                    const distanceSq = dx * dx + dy * dy;
                    if (distanceSq < targetDistanceSq) {
                        targetDistanceSq = distanceSq;
                        targetNode = node;
                    }
                });
            }

            if (targetNode) {
                const dx = targetNode.x - fragment.x;
                const dy = targetNode.y - fragment.y;
                const distance = Math.hypot(dx, dy) || 0.0001;
                const dirX = dx / distance;
                const dirY = dy / distance;
                const suckRange = 150 + (targetNode.feedPulse || 0) * 34;
                if (distance < suckRange) {
                    const suction = (fragment.kind === 'energy' ? 280 : 190)
                        * (0.56 + (targetNode.suctionPower || 0) * 0.32 + (targetNode.feedPulse || 0) * 0.22);
                    fragment.vx += dirX * suction * simDt;
                    fragment.vy += dirY * suction * simDt;
                    targetNode.feedPulse = Math.max(targetNode.feedPulse || 0, 1.02);
                    if (distance < this.getNodeContactRadius(targetNode) + fragment.size + 10) {
                        this.consumeFragment(fragment, targetNode);
                        this.fragments.splice(i, 1);
                        continue;
                    }
                }
            }

            fragment.vx *= Math.exp(-fragment.drag * simDt);
            fragment.vy *= Math.exp(-fragment.drag * simDt);
            fragment.x += fragment.vx * simDt;
            fragment.y += fragment.vy * simDt;
            fragment.rotation += fragment.spin * simDt;
        }
    },
    consumeFragment(fragment, node) {
        node.feedPulse = Math.max(node.feedPulse || 0, fragment.kind === 'energy' ? 1.5 : 1.14);
        node.biteGlow = Math.max(node.biteGlow || 0, 0.78);
        this.bumpFeastMeter(fragment.kind === 'energy' ? 0.08 : 0.04);
        this.createRing(node.x, node.y, 16 + fragment.size * 2.1, COLORS.energy, 0.08, 2);
        if (typeof this.absorbFragment === 'function') {
            this.absorbFragment(fragment);
        }
    },
    bumpFeastMeter(amount) {
        this.player.feast = clamp((this.player.feast || 0) + amount * 0.75, 0, 1.3);
        this.player.feastGlow = clamp((this.player.feastGlow || 0) + amount, 0, 1.8);
    },
    damagePlayer(amount, dirX, dirY, push, node) {
        if (this.player.dead) {
            return;
        }
        node.vx -= dirX * push * 0.2;
        node.vy -= dirY * push * 0.2;
        if (typeof this.applyEnergyDelta === 'function') {
            this.applyEnergyDelta(-Math.max(0.12, amount * 2.2));
        }
        this.createRing(node.x, node.y, 28, COLORS.health, 0.14, 2);
    },
};
