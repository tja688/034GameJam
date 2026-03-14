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
        prey.carve = clamp((prey.carve || 0) + 0.18, 0, 1.8);
        prey.gorePulse = clamp((prey.gorePulse || 0) + 0.24, 0, 1.8);
        this.spawnFragmentBurst(prey.x, prey.y, {
            count: profile.mode === 'feed' ? 4 : 7,
            speed: profile.mode === 'feed' ? 58 : 122,
            size: profile.mode === 'feed' ? 4.8 : 5.8,
            baseColor: profile.mode === 'feed' ? COLORS.energy : COLORS.flesh,
            collectible: false,
            energyBias: profile.mode === 'feed' ? 0.62 : 0.12,
            directionX: node.attackDirX || -nx,
            directionY: node.attackDirY || -ny
        });
        const latchEventId = profile.mode === 'hook'
            ? 'prey_latched_hook'
            : profile.mode === 'grind'
                ? 'prey_latched_grind'
                : 'prey_latched_feed';
        this.playAudioEvent?.(latchEventId, {
            preyId: prey.id,
            preySize: prey.sizeKey,
            nodeIndex: node.index,
            mode: profile.mode
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
        this._preyAliveSet = new Set(this.prey);
        const nodeByIndex = new Map(this.activeNodes.map((node) => [node.index, node]));
        this.activeNodes.forEach((node) => {
            node.attachedPreyCount = 0;
            node.attachedPreyId = '';
        });

        let totalAttachments = 0;
        for (let i = this.prey.length - 1; i >= 0; i -= 1) {
            const prey = this.prey[i];
            if (!prey) {
                continue;
            }
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

            if (prey.behaviorId === 'elite-spinner' && prey.spinHazardActive && prey.attachments.length > 0) {
                const spinDrainRate = Math.max(0, this.getRunTuningValue?.('gameplayBehaviorSpinDrain__elite-spinner', 6.8) ?? 6.8);
                const drainLoad = Math.max(0.2, pressure.feedCount + pressure.cutterCount * 0.42 + pressure.grindCount * 0.28);
                this.applyEnergyDelta?.(-spinDrainRate * drainLoad * simDt, 0.04 + drainLoad * 0.02, 'elite-spinner');
                prey.guardPulse = Math.max(prey.guardPulse || 0, 0.66);
            }
            if (prey.behaviorId === 'elite-dart' && prey.attachments.length > 0) {
                const holdGate = Math.max(0, this.getRunTuningValue?.('gameplayBehaviorHoldPressure__elite-dart', 0.54) ?? 0.54);
                const escapeDrain = Math.max(0, this.getRunTuningValue?.('gameplayBehaviorEscapeDrain__elite-dart', 1.4) ?? 1.4);
                const holdScore = pressure.pressure * 0.72 + pressure.encirclement * 0.56 + pressure.feedCount * 0.08;
                const deficit = Math.max(0, holdGate - holdScore);
                if (deficit > 0) {
                    prey.attachments.forEach((attachment) => {
                        attachment.life -= deficit * escapeDrain * simDt;
                    });
                    prey.alertPulse = Math.max(prey.alertPulse || 0, 0.42 + deficit * 0.36);
                }
            }

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
                prey.carve = Math.max(prey.carve || 0, pressure.pressure * 0.3 + attachment.depth * 0.28);
                prey.gorePulse = Math.max(prey.gorePulse || 0, pressure.pressure * 0.28 + attachment.depth * 0.18);
                prey.devourGlow = Math.max(prey.devourGlow || 0, attachment.mode === 'feed' ? 0.24 + attachment.depth * 0.3 : 0.12 + attachment.depth * 0.16);

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
                    if (!this._preyAliveSet || !this._preyAliveSet.has(prey)) {
                        break;
                    }
                }
            }
        }

        this._preyAliveSet = null;
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
        const biteEventId = attachment.mode === 'hook'
            ? 'prey_bite_hook'
            : attachment.mode === 'grind'
                ? 'prey_bite_grind'
                : 'prey_bite_feed';
        this.playAudioEvent?.(biteEventId, {
            preyId: prey.id,
            preySize: prey.sizeKey,
            mode: attachment.mode,
            amount
        });
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
        if (this._preyAliveSet ? !this._preyAliveSet.has(prey) : !this.prey.includes(prey)) {
            return;
        }

        const previousRatio = prey.health / Math.max(prey.maxHealth, 1);
        prey.health -= amount;
        prey.hitFlash = 1;
        const damageRatio = amount / Math.max(prey.maxHealth, 1);
        prey.wound = clamp((prey.wound || 0) + damageRatio * 1.48, 0, 2.2);
        prey.panic = clamp((prey.panic || 0) + damageRatio * 1.3, 0, 1.9);
        prey.shudder = clamp((prey.shudder || 0) + damageRatio * 2.1, 0, 2.4);
        prey.carve = clamp((prey.carve || 0) + damageRatio * 1.4 + (attachment?.mode === 'feed' ? 0.08 : 0.22), 0, 2.4);
        prey.gorePulse = clamp((prey.gorePulse || 0) + damageRatio * 1.7 + (attachment?.mode === 'feed' ? 0.06 : 0.26), 0, 2.8);
        prey.devourGlow = clamp((prey.devourGlow || 0) + damageRatio * 0.9 + (attachment?.mode === 'feed' ? 0.24 : 0.08), 0, 2.2);
        prey.exposed = clamp(
            (prey.exposed || 0) + damageRatio * (attachment?.mode === 'feed' ? 0.14 : 0.28),
            0,
            1
        );
        const hitPushMul = 0;
        prey.vx += dirX * (28 + amount * 2.6) * hitPushMul / Math.max(prey.mass, 0.1);
        prey.vy += dirY * (28 + amount * 2.6) * hitPushMul / Math.max(prey.mass, 0.1);

        const healthRatio = prey.health / Math.max(prey.maxHealth, 1);
        while (prey.chunkCursor < prey.chunkThresholds.length && healthRatio <= prey.chunkThresholds[prey.chunkCursor]) {
            this.releasePreyFragments(prey, prey.sizeKey === 'large' ? 6 : 3, node, attachment, false, false);
            prey.chunkCursor += 1;
        }

        if (attachment && attachment.mode !== 'feed') {
            this.releasePreyFragments(prey, prey.sizeKey === 'large' ? 3 : 2, node, attachment, false, false);
        } else if (attachment && attachment.mode === 'feed') {
            this.releasePreyFragments(prey, prey.sizeKey === 'large' ? 2 : 1, node, attachment, true, false);
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
        const countMul = this.getRunTuningValue ? this.getRunTuningValue('gameplayPreyFragmentCountMul', 1.7) : 1.7;
        const speedMul = this.getRunTuningValue ? this.getRunTuningValue('gameplayPreyFragmentSpeedMul', 1.2) : 1.2;
        const sizeMul = this.getRunTuningValue ? this.getRunTuningValue('gameplayPreyFragmentSizeMul', 1.28) : 1.28;
        const visualMul = Math.max(0.8, Math.pow(prey?.visualScale || 1, 0.48));
        const directionX = node?.attackDirX ?? normalize(prey.vx, prey.vy, 1, 0).x;
        const directionY = node?.attackDirY ?? normalize(prey.vx, prey.vy, 0, 1).y;
        const feedBias = attachment?.mode === 'feed' ? 0.62 : 0.14;
        const spawned = this.spawnFragmentBurst(prey.x, prey.y, {
            count: Math.max(1, Math.round(count * countMul * visualMul)),
            speed: (fatal ? 182 : (attachment?.mode === 'feed' ? 58 : 104)) * speedMul * Math.max(0.85, visualMul * 0.9),
            size: (fatal ? 6.4 : 4.8) * sizeMul * Math.max(0.9, visualMul * 0.72),
            baseColor: fatal ? COLORS.meat : (attachment?.mode === 'feed' ? COLORS.energy : COLORS.flesh),
            collectible: collectible || fatal,
            energyBias: fatal ? 0.55 : feedBias,
            directionX,
            directionY
        });
        if (fatal && Array.isArray(spawned) && spawned.length > 0) {
            this.distributePreyRewardAcrossFragments(prey, spawned);
        }
        return spawned;
    },
    finishPreyDevour(prey, node, attachment) {
        const index = this.prey.indexOf(prey);
        if (index >= 0) {
            // swap-and-pop: O(1) removal instead of splice O(n)
            const last = this.prey.length - 1;
            if (index !== last) { this.prey[index] = this.prey[last]; }
            this.prey.pop();
        }
        // Keep alive-set in sync for same-frame checks
        if (this._preyAliveSet) { this._preyAliveSet.delete(prey); }
        this.noteDevourBurst?.(1);
        const deathLoot = this.releasePreyFragments(prey, prey.chunkBurst + (prey.sizeKey === 'large' ? 8 : 3), node, attachment, true, true);
        const rewardDeferred = Array.isArray(deathLoot) && deathLoot.some((fragment) => !!fragment.rewardSourceId);
        if (!this.getRunTuningToggle || this.getRunTuningToggle('gameplayPreyDeathRingsEnabled', true)) {
            this.createRing(prey.x, prey.y, prey.radius + 34, node?.color || prey.color, 0.28, 4, 'prey-death');
            this.createRing(prey.x, prey.y, prey.radius + 16, COLORS.core, 0.22, 3, 'prey-death');
            this.createRing(prey.x, prey.y, prey.radius * 0.82, COLORS.gore, 0.18, 2, 'prey-death');
        }
        this.bumpFeastMeter(0.18 + prey.yield * 0.09);
        this.addScreenShake?.(
            prey.sizeKey === 'large' ? 0.8 : prey.sizeKey === 'medium' ? 0.46 : 0.24,
            prey.sizeKey === 'large' ? 0.95 : prey.sizeKey === 'medium' ? 0.56 : 0.3
        );
        const devourEventId = prey.isObjective
            ? 'prey_devoured_objective'
            : prey.sizeKey === 'large'
                ? 'prey_devoured_large'
                : prey.sizeKey === 'medium'
                    ? 'prey_devoured_medium'
                    : 'prey_devoured_small';
        this.playAudioEvent?.(devourEventId, {
            preyId: prey.id,
            preySize: prey.sizeKey,
            isObjective: !!prey.isObjective,
            nodeIndex: node?.index ?? -1,
            mode: attachment?.mode || ''
        });
        if (node) {
            node.feedPulse = Math.max(node.feedPulse || 0, attachment.mode === 'feed' ? 1.56 : 1.08);
            node.hookTension = Math.max(node.hookTension || 0, attachment.mode === 'hook' ? 1.02 : 0.46);
            node.spinVelocity = Math.max(node.spinVelocity || 0, attachment.mode === 'grind' ? 22 : 0);
            node.biteGlow = Math.max(node.biteGlow || 0, 1);
        }
        if (typeof this.onPreyDevoured === 'function') {
            this.onPreyDevoured(prey, node, attachment, {
                deferReward: rewardDeferred
            });
        }
    },
    createFragmentState() {
        return {
            active: false,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            size: 0,
            shape: 'circle',
            color: COLORS.flesh,
            kind: 'meat',
            collectible: false,
            life: 0,
            total: 0,
            drag: 0,
            rotation: 0,
            spin: 0,
            pulse: 0,
            state: 'burst',
            stateTime: 0,
            age: 0,
            burstDuration: 0.12,
            collectDelay: 0,
            targetNodeIndex: -1,
            homeAge: 0,
            arcSign: 1,
            homeCurve: 0,
            floatStrength: 0,
            rewardEnergy: 0,
            rewardBiomass: 0,
            rewardProgress: 0,
            rewardSourceId: '',
            rewardIsObjective: false,
            rewardStageId: ''
        };
    },
    resetFragmentPool() {
        if (!Array.isArray(this.fragmentPool)) {
            this.fragmentPool = [];
            this.fragmentPoolCursor = 0;
            return;
        }
        this.fragmentPool.forEach((fragment) => {
            fragment.active = false;
            fragment.targetNodeIndex = -1;
            fragment.rewardEnergy = 0;
            fragment.rewardBiomass = 0;
            fragment.rewardProgress = 0;
            fragment.rewardSourceId = '';
            fragment.rewardIsObjective = false;
            fragment.rewardStageId = '';
        });
        this.fragmentPoolCursor = 0;
    },
    ensureFragmentPoolCapacity(minCapacity) {
        if (!Array.isArray(this.fragmentPool)) {
            this.fragmentPool = [];
            this.fragmentPoolCursor = 0;
        }
        while (this.fragmentPool.length < minCapacity) {
            this.fragmentPool.push(this.createFragmentState());
        }
    },
    acquireFragment() {
        if (!Array.isArray(this.fragmentPool) || this.fragmentPool.length === 0) {
            return null;
        }
        const poolSize = this.fragmentPool.length;
        const start = this.fragmentPoolCursor || 0;
        for (let offset = 0; offset < poolSize; offset += 1) {
            const index = (start + offset) % poolSize;
            const fragment = this.fragmentPool[index];
            if (fragment.active) {
                continue;
            }
            fragment.active = true;
            this.fragmentPoolCursor = (index + 1) % poolSize;
            return fragment;
        }
        return null;
    },
    releaseFragment(fragment) {
        if (!fragment) {
            return;
        }
        fragment.active = false;
        fragment.x = 0;
        fragment.y = 0;
        fragment.vx = 0;
        fragment.vy = 0;
        fragment.size = 0;
        fragment.collectible = false;
        fragment.life = 0;
        fragment.total = 0;
        fragment.drag = 0;
        fragment.rotation = 0;
        fragment.spin = 0;
        fragment.state = 'burst';
        fragment.stateTime = 0;
        fragment.age = 0;
        fragment.burstDuration = 0.12;
        fragment.collectDelay = 0;
        fragment.targetNodeIndex = -1;
        fragment.homeAge = 0;
        fragment.arcSign = 1;
        fragment.homeCurve = 0;
        fragment.floatStrength = 0;
        fragment.rewardEnergy = 0;
        fragment.rewardBiomass = 0;
        fragment.rewardProgress = 0;
        fragment.rewardSourceId = '';
        fragment.rewardIsObjective = false;
        fragment.rewardStageId = '';
    },
    removeFragmentAt(index) {
        const lastIndex = this.fragments.length - 1;
        if (index < 0 || index > lastIndex) {
            return null;
        }
        const removed = this.fragments[index];
        if (index !== lastIndex) {
            this.fragments[index] = this.fragments[lastIndex];
        }
        this.fragments.pop();
        return removed;
    },
    releaseFragmentAt(index) {
        const fragment = this.removeFragmentAt(index);
        this.releaseFragment(fragment);
        return fragment;
    },
    distributePreyRewardAcrossFragments(prey, fragments) {
        const reward = this.buildPreyDevourRewardPayload?.(prey);
        if (!reward || !Array.isArray(fragments) || fragments.length <= 0) {
            return false;
        }

        let energyWeightTotal = 0;
        let biomassWeightTotal = 0;
        let progressWeightTotal = 0;
        fragments.forEach((fragment) => {
            const energyWeight = fragment.kind === 'energy' ? 1.2 : 0.35;
            const biomassWeight = fragment.kind === 'energy' ? 0.45 : 1.1;
            const progressWeight = fragment.kind === 'energy' ? 0.8 : 1;
            fragment.rewardEnergy = reward.energyValue * energyWeight;
            fragment.rewardBiomass = reward.biomassValue * biomassWeight;
            fragment.rewardProgress = reward.progressValue * progressWeight;
            fragment.rewardSourceId = reward.sourceId;
            fragment.rewardIsObjective = reward.isObjective;
            fragment.rewardStageId = reward.stageId || '';
            energyWeightTotal += energyWeight;
            biomassWeightTotal += biomassWeight;
            progressWeightTotal += progressWeight;
        });

        fragments.forEach((fragment) => {
            fragment.rewardEnergy = energyWeightTotal > 0 ? fragment.rewardEnergy / energyWeightTotal : 0;
            fragment.rewardBiomass = biomassWeightTotal > 0 ? fragment.rewardBiomass / biomassWeightTotal : 0;
            fragment.rewardProgress = progressWeightTotal > 0 ? fragment.rewardProgress / progressWeightTotal : 0;
        });

        this.registerLootRewardSource?.(reward, fragments.length);
        return true;
    },
    spawnFragmentBurst(x, y, options = {}) {
        if (this.getRunTuningToggle && !this.getRunTuningToggle('gameplayPreyFragmentsEnabled', true)) {
            return [];
        }
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
        const burstCap = Math.max(1, Math.round(this.getRunTuningValue?.('gameplayPreyFragmentBurstCap', 36) ?? 36));
        const activeCap = Math.max(burstCap, Math.round(this.getRunTuningValue?.('gameplayPreyFragmentActiveCap', 160) ?? 160));
        this.ensureFragmentPoolCapacity(activeCap);
        const available = Math.max(0, activeCap - this.fragments.length);
        const spawnCount = Math.min(Math.max(0, Math.round(count)), burstCap, available);

        if (spawnCount <= 0) {
            return [];
        }

        const created = [];
        const lootLifetime = Math.max(1.8, this.getRunTuningValue?.('gameplayLootLifetime', 4.2) ?? 4.2);
        const lootBurstDuration = Math.max(0.08, this.getRunTuningValue?.('gameplayLootBurstDuration', 0.16) ?? 0.16);
        const lootCollectDelay = Math.max(0.03, this.getRunTuningValue?.('gameplayLootCollectDelay', 0.08) ?? 0.08);
        const burstSpeedMul = Math.max(0.2, this.getRunTuningValue?.('gameplayLootBurstSpeedMul', 1) ?? 1);
        const burstSpreadMul = Math.max(0.2, this.getRunTuningValue?.('gameplayLootBurstSpreadMul', 1) ?? 1);
        const lootSizeMul = Math.max(0.2, this.getRunTuningValue?.('gameplayLootVisualSizeMul', 1) ?? 1);
        for (let i = 0; i < spawnCount; i += 1) {
            const fragment = this.acquireFragment();
            if (!fragment) {
                break;
            }
            const spread = Phaser.Math.FloatBetween(
                -(collectible ? 3.05 : 2.3) * burstSpreadMul,
                (collectible ? 3.05 : 2.3) * burstSpreadMul
            );
            const angle = Math.atan2(aim.y, aim.x) + spread;
            const speedMul = Phaser.Math.FloatBetween(collectible ? 0.78 : 0.48, collectible ? 1.55 : 1.18) * burstSpeedMul;
            const isEnergy = Math.random() < energyBias;
            const shardCollectible = collectible || isEnergy;
            const life = shardCollectible
                ? Phaser.Math.FloatBetween(lootLifetime * 0.82, lootLifetime * 1.18)
                : Phaser.Math.FloatBetween(isEnergy ? 0.85 : 0.45, isEnergy ? 1.35 : 0.82);
            const shape = Phaser.Utils.Array.GetRandom(['circle', 'square', 'triangle']);
            const accentColor = shape === 'triangle'
                ? COLORS.triangle
                : shape === 'square'
                    ? COLORS.square
                    : COLORS.circle;
            const mixedColor = typeof blendColor === 'function'
                ? blendColor(baseColor, accentColor, Phaser.Math.FloatBetween(0.32, 0.72))
                : baseColor;
            fragment.x = x;
            fragment.y = y;
            fragment.vx = Math.cos(angle) * speed * speedMul + aim.x * speed * (shardCollectible ? 0.34 : 0.2);
            fragment.vy = Math.sin(angle) * speed * speedMul + aim.y * speed * (shardCollectible ? 0.34 : 0.2);
            fragment.size = Phaser.Math.FloatBetween(
                size * (shardCollectible ? 1.04 : 0.82) * lootSizeMul,
                size * (shardCollectible ? 1.78 : 1.34) * lootSizeMul
            );
            fragment.shape = shape;
            fragment.color = isEnergy
                ? Phaser.Utils.Array.GetRandom([COLORS.energy, COLORS.core, COLORS.base])
                : Phaser.Utils.Array.GetRandom([baseColor, mixedColor, accentColor, COLORS.meat]);
            fragment.kind = isEnergy ? 'energy' : 'meat';
            fragment.collectible = shardCollectible;
            fragment.life = life;
            fragment.total = life;
            fragment.drag = isEnergy ? 2.4 : 1.65;
            fragment.rotation = Math.random() * Math.PI * 2;
            fragment.spin = Phaser.Math.FloatBetween(-16, 16);
            fragment.pulse = Math.random() * Math.PI * 2;
            fragment.state = 'burst';
            fragment.stateTime = 0;
            fragment.age = 0;
            fragment.burstDuration = lootBurstDuration * Phaser.Math.FloatBetween(0.84, 1.08);
            fragment.collectDelay = shardCollectible ? lootCollectDelay * Phaser.Math.FloatBetween(0.78, 1.08) : 0;
            fragment.targetNodeIndex = -1;
            fragment.homeAge = 0;
            fragment.arcSign = Math.random() < 0.5 ? -1 : 1;
            fragment.homeCurve = shardCollectible ? Phaser.Math.FloatBetween(0.08, 0.18) : 0;
            fragment.floatStrength = shardCollectible ? Phaser.Math.FloatBetween(14, 28) : Phaser.Math.FloatBetween(6, 12);
            fragment.rewardEnergy = 0;
            fragment.rewardBiomass = 0;
            fragment.rewardProgress = 0;
            fragment.rewardSourceId = '';
            fragment.rewardIsObjective = false;
            fragment.rewardStageId = '';
            this.fragments.push(fragment);
            created.push(fragment);
        }
        return created;
    },
    findFragmentTarget(fragment, feeders, feederLoad, searchRange) {
        if (!Array.isArray(feeders) || feeders.length === 0) {
            return null;
        }
        const currentTargetIndex = fragment.targetNodeIndex;
        const loadPenalty = Math.max(0.08, this.getRunTuningValue?.('gameplayLootTargetLoadPenalty', 0.18) ?? 0.18);
        const keepBias = Math.max(10, this.getRunTuningValue?.('gameplayLootTargetKeepBias', 34) ?? 34);
        const searchRangeSq = searchRange * searchRange;
        let bestNode = null;
        let bestScore = Infinity;

        for (let i = 0; i < feeders.length; i += 1) {
            const node = feeders[i];
            const dx = node.x - fragment.x;
            const dy = node.y - fragment.y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq > searchRangeSq && node.index !== currentTargetIndex) {
                continue;
            }
            const distance = Math.sqrt(distanceSq) || 0.0001;
            const load = feederLoad.get(node.index) || 0;
            let score = distance * (1 + load * loadPenalty);
            score -= (node.feedPulse || 0) * 22;
            score -= (node.suctionPower || 0) * 26;
            if (node.index === currentTargetIndex) {
                score -= keepBias;
            }
            if (score < bestScore) {
                bestScore = score;
                bestNode = node;
            }
        }

        return bestNode;
    },
    updateFragments(simDt) {
        if (this.getRunTuningToggle && !this.getRunTuningToggle('gameplayPreyFragmentsEnabled', true)) {
            for (let i = this.fragments.length - 1; i >= 0; i -= 1) {
                if (this.shouldFallbackConsumeFragment(this.fragments[i])) {
                    this.consumeFragment(this.fragments[i], null);
                }
                this.releaseFragmentAt(i);
            }
            return;
        }
        const feeders = [];
        for (let i = 0; i < this.activeNodes.length; i += 1) {
            const node = this.activeNodes[i];
            if (node.shape === 'circle') {
                node.lootTargetCount = 0;
                feeders.push(node);
            }
        }
        const feederLoad = new Map(feeders.map((node) => [node.index, 0]));
        for (let i = 0; i < this.fragments.length; i += 1) {
            const fragment = this.fragments[i];
            if (
                fragment.collectible
                && fragment.state === 'homing'
                && fragment.targetNodeIndex >= 0
                && feederLoad.has(fragment.targetNodeIndex)
            ) {
                feederLoad.set(fragment.targetNodeIndex, (feederLoad.get(fragment.targetNodeIndex) || 0) + 1);
            }
        }
        const collectPerFrameCap = Math.max(1, Math.round(this.getRunTuningValue?.('gameplayPreyFragmentCollectPerFrameCap', 8) ?? 8));
        let collectedThisFrame = 0;
        const lootRangeBase = Math.max(140, this.getRunTuningValue?.('gameplayLootHomingRange', 260) ?? 260);
        const lootRangeGrow = Math.max(30, this.getRunTuningValue?.('gameplayLootHomingRangeGrow', 180) ?? 180);
        const lootRetargetRange = Math.max(220, this.getRunTuningValue?.('gameplayLootRetargetRange', 360) ?? 360);
        const absorbSpeedMul = Math.max(0.2, this.getRunTuningValue?.('gameplayLootAbsorbSpeedMul', 1) ?? 1);
        const hasFeeders = feeders.length > 0;
        for (let i = this.fragments.length - 1; i >= 0; i -= 1) {
            const fragment = this.fragments[i];
            fragment.age += simDt;
            fragment.stateTime += simDt;
            fragment.life -= simDt;
            if (fragment.life <= 0) {
                if (this.shouldFallbackConsumeFragment(fragment)) {
                    this.consumeFragment(fragment, null);
                }
                this.releaseFragmentAt(i);
                continue;
            }

            if (fragment.state === 'burst' && fragment.stateTime >= fragment.burstDuration) {
                fragment.state = 'drift';
                fragment.stateTime = 0;
            }

            let decay = Math.exp(-Math.max(0.4, fragment.drag) * simDt);
            if (fragment.state === 'burst') {
                const burstProgress = clamp(fragment.stateTime / Math.max(0.0001, fragment.burstDuration), 0, 1);
                const burstEaseOut = 1 - Math.pow(1 - burstProgress, 2);
                decay = Math.exp(-Math.max(0.08, fragment.drag * lerp(0.12, 1.9, burstEaseOut)) * simDt);
            } else if (fragment.state === 'drift') {
                decay = Math.exp(-Math.max(0.72, fragment.drag * 0.96) * simDt);
                const driftAngle = fragment.pulse + fragment.age * 3.2;
                fragment.vx += Math.cos(driftAngle) * fragment.floatStrength * 0.22 * simDt;
                fragment.vy += Math.sin(driftAngle * 0.84) * fragment.floatStrength * 0.28 * simDt;
            }

            if (fragment.collectible && hasFeeders && fragment.age >= fragment.collectDelay) {
                const searchRange = lootRangeBase + Math.min(lootRetargetRange, fragment.age * lootRangeGrow);
                if (fragment.state === 'drift') {
                    const targetNode = this.findFragmentTarget(fragment, feeders, feederLoad, searchRange);
                    if (targetNode) {
                        fragment.targetNodeIndex = targetNode.index;
                        feederLoad.set(targetNode.index, (feederLoad.get(targetNode.index) || 0) + 1);
                        fragment.state = 'homing';
                        fragment.stateTime = 0;
                        fragment.homeAge = 0;
                        fragment.vx *= 0.18;
                        fragment.vy *= 0.18;
                    }
                } else if (fragment.state === 'homing') {
                    fragment.homeAge += simDt;
                    let targetNode = feeders.find((node) => node.index === fragment.targetNodeIndex) || null;
                    if (targetNode) {
                        const distanceToCurrent = Math.hypot(targetNode.x - fragment.x, targetNode.y - fragment.y);
                        if (distanceToCurrent > lootRetargetRange && fragment.homeAge > 0.12) {
                            const replacement = this.findFragmentTarget(fragment, feeders, feederLoad, searchRange);
                            if (replacement && replacement.index !== targetNode.index) {
                                feederLoad.set(targetNode.index, Math.max(0, (feederLoad.get(targetNode.index) || 0) - 1));
                                feederLoad.set(replacement.index, (feederLoad.get(replacement.index) || 0) + 1);
                                fragment.targetNodeIndex = replacement.index;
                                targetNode = replacement;
                                fragment.homeAge = 0;
                            }
                        }
                    } else {
                        fragment.state = 'drift';
                        fragment.stateTime = 0;
                        fragment.homeAge = 0;
                        fragment.targetNodeIndex = -1;
                    }

                    if (targetNode) {
                        const targetX = targetNode.x;
                        const targetY = targetNode.y;
                        const dx = targetX - fragment.x;
                        const dy = targetY - fragment.y;
                        const distance = Math.hypot(dx, dy) || 0.0001;
                        const dirX = dx / distance;
                        const dirY = dy / distance;
                        const closeFactor = 1 - clamp(distance / Math.max(48, searchRange), 0, 1);
                        const absorbEaseIn = Math.min(1, Math.pow(clamp(fragment.homeAge / 0.22, 0, 1), 2));
                        const desiredSpeed = (fragment.kind === 'energy' ? 540 : 420)
                            * (0.38 + absorbEaseIn * 1.18)
                            * (0.94 + (targetNode.suctionPower || 0) * 0.34 + (targetNode.feedPulse || 0) * 0.26 + closeFactor * 0.55)
                            * absorbSpeedMul;
                        const turnLerp = clamp(simDt * (10 + absorbEaseIn * 26), 0, 1);
                        fragment.vx = lerp(fragment.vx, dirX * desiredSpeed, turnLerp);
                        fragment.vy = lerp(fragment.vy, dirY * desiredSpeed, turnLerp);
                        decay = Math.exp(-Math.max(0.02, fragment.drag * lerp(0.16, 0.03, absorbEaseIn)) * simDt);
                        targetNode.feedPulse = Math.max(targetNode.feedPulse || 0, 1.08 + closeFactor * 0.72);
                        targetNode.absorbLoad = Math.max(targetNode.absorbLoad || 0, 0.14 + closeFactor * 0.26 + (feederLoad.get(targetNode.index) || 0) * 0.05);
                        if (distance < this.getNodeContactRadius(targetNode) + fragment.size + 10 && collectedThisFrame < collectPerFrameCap) {
                            collectedThisFrame += 1;
                            this.consumeFragment(fragment, targetNode);
                            this.releaseFragmentAt(i);
                            continue;
                        }
                    }
                }
            }

            fragment.vx *= decay;
            fragment.vy *= decay;
            fragment.x += fragment.vx * simDt;
            fragment.y += fragment.vy * simDt;
            fragment.rotation += fragment.spin * simDt;
        }
        feeders.forEach((node) => {
            node.lootTargetCount = feederLoad.get(node.index) || 0;
            if (node.lootTargetCount > 0) {
                node.absorbLoad = Math.max(node.absorbLoad || 0, node.lootTargetCount * 0.08);
            }
        });
    },
    consumeFragment(fragment, node) {
        if (node) {
            const rewardMagnitude = Math.max(
                fragment.kind === 'energy' ? 0.22 : 0.14,
                (fragment.rewardEnergy || 0) * 0.03 + (fragment.rewardBiomass || 0) * 0.08 + (fragment.rewardProgress || 0) * 0.1
            );
            node.feedPulse = Math.max(node.feedPulse || 0, fragment.kind === 'energy' ? 1.5 + rewardMagnitude * 0.2 : 1.14 + rewardMagnitude * 0.18);
            node.biteGlow = Math.max(node.biteGlow || 0, 0.78 + rewardMagnitude * 0.24);
            node.absorbLoad = clamp((node.absorbLoad || 0) + 0.24 + rewardMagnitude * 0.3, 0, 3.2);
            node.absorbJitter = clamp((node.absorbJitter || 0) + 0.18 + rewardMagnitude * 0.22, 0, 2.4);
            node.absorbFlash = clamp((node.absorbFlash || 0) + 0.3 + rewardMagnitude * 0.3, 0, 2.8);
        }
        this.bumpFeastMeter(fragment.kind === 'energy' ? 0.08 : 0.04);
        this.playAudioEvent?.(fragment.kind === 'energy' ? 'loot_absorb_energy' : 'loot_absorb_biomass', {
            kind: fragment.kind,
            nodeIndex: node?.index ?? -1,
            rewardEnergy: fragment.rewardEnergy || 0,
            rewardBiomass: fragment.rewardBiomass || 0,
            rewardProgress: fragment.rewardProgress || 0
        });
        if (typeof this.absorbFragment === 'function') {
            this.absorbFragment(fragment);
        }
    },
    shouldFallbackConsumeFragment(fragment) {
        return !!(
            fragment
            && (
                fragment.rewardSourceId
                || (fragment.rewardEnergy || 0) > 0
                || (fragment.rewardBiomass || 0) > 0
                || (fragment.rewardProgress || 0) > 0
            )
        );
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
        this.playAudioEvent?.('player_hit_guard', {
            nodeIndex: node?.index ?? -1,
            amount,
            push
        });
        if (typeof this.applyEnergyDelta === 'function') {
            this.applyEnergyDelta(-Math.max(0.12, amount * 2.2), 0.08, 'hit');
        }
    },
};
