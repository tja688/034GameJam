

const SceneMovementMixin = {
    rebuildFormation(forceReset = false) {
        const count = this.player.chain.length;
        if (!this.player.topology || this.player.chain.some((poolIndex) => !Object.prototype.hasOwnProperty.call(this.player.topology.slots || {}, poolIndex))) {
            this.player.topology = this.rebuildTopologyFromCurrentChain(true);
        }

        const existingNodes = forceReset ? new Map() : new Map(this.activeNodes.map((node) => [node.index, node]));
        this.player.mass = getChainMass(count);
        const centerX = this.player.centroidX;
        const centerY = this.player.centroidY;
        const heading = this.player.heading;
        const slots = this.player.topology.slots;
        let topologyRadius = 0;

        this.player.chain.forEach((poolIndex) => {
            const slot = slots[poolIndex];
            topologyRadius = Math.max(topologyRadius, Math.hypot(slot.x, slot.y));
        });
        this.player.topologyRadius = Math.max(PARTIAL_MESH_RULES.slotSpacing, topologyRadius);

        this.activeNodes = this.player.chain.map((poolIndex, order) => {
            const base = this.poolNodes[poolIndex];
            const slot = slots[poolIndex] || this.getDefaultTopologySlot(order);
            const rotated = rotateLocal(slot.x, slot.y, heading);
            const existing = existingNodes.get(poolIndex);
            const seed = { x: centerX + rotated.x, y: centerY + rotated.y };
            const TM = window.TUNING || {};
            return {
                ...(existing || {}),
                ...base,
                order,
                localX: slot.x,
                localY: slot.y,
                mass: base.role === 'shell' ? (TM.massShell ?? 1.35) : base.role === 'blade' ? (TM.massBlade ?? 1.15) : (TM.massDefault ?? 1),
                x: existing ? existing.x : seed.x,
                y: existing ? existing.y : seed.y,
                vx: existing ? existing.vx : 0,
                vy: existing ? existing.vy : 0,
                fx: 0,
                fy: 0,
                anchorX: existing ? existing.anchorX : seed.x,
                anchorY: existing ? existing.anchorY : seed.y,
                anchored: existing ? existing.anchored : order % 2 === 0,
                stanceTimer: existing ? existing.stanceTimer : 0.25 + order * 0.03,
                anchorStrength: existing ? existing.anchorStrength : 220,
                pulseGlow: existing ? existing.pulseGlow : 0,
                tension: existing ? existing.tension : 0,
                displayX: existing ? existing.displayX : seed.x,
                displayY: existing ? existing.displayY : seed.y,
                displayAnchorX: existing ? existing.displayAnchorX : seed.x,
                displayAnchorY: existing ? existing.displayAnchorY : seed.y,
                attackTimer: existing ? existing.attackTimer : 0,
                attackDirX: existing ? existing.attackDirX : 0,
                attackDirY: existing ? existing.attackDirY : -1,
                attackDamage: existing ? existing.attackDamage : 0
            };
        });

        const activeOrderByIndex = new Map(this.activeNodes.map((node) => [node.index, node.order]));
        const neighborSetByIndex = new Map(this.player.chain.map((poolIndex) => [poolIndex, new Set()]));
        const pairCountByKey = new Map();
        const pairSeenByKey = new Map();
        this.player.topology.edges.forEach((edge) => {
            if (!neighborSetByIndex.has(edge.a) || !neighborSetByIndex.has(edge.b)) {
                return;
            }
            neighborSetByIndex.get(edge.a)?.add(edge.b);
            neighborSetByIndex.get(edge.b)?.add(edge.a);
            const pairKey = makeEdgeKey(edge.a, edge.b);
            pairCountByKey.set(pairKey, (pairCountByKey.get(pairKey) || 0) + 1);
        });
        this.links = [];
        this.player.topology.edges.forEach((edge) => {
            const a = activeOrderByIndex.get(edge.a);
            const b = activeOrderByIndex.get(edge.b);
            if (a === undefined || b === undefined) {
                return;
            }

            const first = this.activeNodes[a];
            const second = this.activeNodes[b];
            const samePolarity = first.polarity === second.polarity;
            const slotA = slots[edge.a];
            const slotB = slots[edge.b];
            const distance = Math.hypot(slotA.x - slotB.x, slotA.y - slotB.y);
            const T = window.TUNING || {};
            const sameRestMul = T.samePolarityRestMul ?? 1.02;
            const invRestMul = T.inversePolarityRestMul ?? 1.08;
            const restMin = T.linkRestMin ?? 84;
            const restMax = T.linkRestMax ?? 206;
            const pairKey = makeEdgeKey(edge.a, edge.b);
            const parallelCount = pairCountByKey.get(pairKey) || 1;
            const parallelIndex = pairSeenByKey.get(pairKey) || 0;
            pairSeenByKey.set(pairKey, parallelIndex + 1);
            const profile = this.buildTopologyLinkProfile(
                edge,
                samePolarity,
                parallelCount
            );
            this.links.push({
                id: edge.id,
                a,
                b,
                kind: edge.kind,
                key: edge.id,
                pairKey,
                topologyA: edge.a,
                topologyB: edge.b,
                rest: clamp(distance * (samePolarity ? sameRestMul : invRestMul), restMin, restMax),
                stiffness: profile.stiffness,
                damping: profile.damping,
                stretchSlack: profile.stretchSlack,
                pbdWeight: profile.pbdWeight,
                rigidity: profile.rigidity,
                parallelCount,
                parallelIndex,
                samePolarity
            });
        });

        this.activeNodes.forEach((node) => {
            node.degree = neighborSetByIndex.get(node.index)?.size || 0;
        });

        this.computeCentroid();
    },
    computeCentroid() {
        if (this.activeNodes.length === 0) {
            return;
        }

        let sumX = 0;
        let sumY = 0;
        this.activeNodes.forEach((node) => {
            sumX += node.x;
            sumY += node.y;
        });

        this.player.centroidX = sumX / this.activeNodes.length;
        this.player.centroidY = sumY / this.activeNodes.length;
    },
    getFormationSpan() {
        let maxDistance = 0;
        this.activeNodes.forEach((node) => {
            const dx = node.x - this.player.centroidX;
            const dy = node.y - this.player.centroidY;
            maxDistance = Math.max(maxDistance, Math.hypot(dx, dy));
        });
        return maxDistance;
    },
    updatePulse(simDt) {
        const T = window.TUNING || {};
        if (!(T.enablePulse ?? true) || this.activeNodes.length === 0) return;
        this.rebalancePulseRunners();

        this.player.pulseRunners.forEach((runner) => {
            runner.timer -= simDt;
            runner.path.timer -= simDt;

            while (runner.timer <= 0) {
                const chainIndex = clamp(getFiniteNumber(runner.cursor, 0), 0, Math.max(0, this.activeNodes.length - 1));
                const current = this.activeNodes[chainIndex];
                const edge = this.getEdgeModifier(chainIndex);
                this.triggerNode(current, edge);

                const loopReset = chainIndex === this.activeNodes.length - 1;
                const nextIndex = loopReset ? 0 : chainIndex + 1;
                const nextNode = this.activeNodes[nextIndex];
                const duration = this.getPulseInterval(current, nextNode, loopReset);

                runner.cursor = nextIndex;
                runner.timer += duration;
                runner.path = {
                    from: chainIndex,
                    to: nextIndex,
                    timer: duration,
                    duration,
                    loopReset
                };
            }
        });

        this.syncLegacyPulseState();
    },
    getPulseVisualState(runner) {
        const path = runner?.path;
        if (!path) {
            return null;
        }

        const fromNode = this.activeNodes[path.from];
        const toNode = this.activeNodes[path.to];
        if (!fromNode || !toNode) {
            return null;
        }

        const progress = path.loopReset ? 1 : clamp(1 - path.timer / Math.max(path.duration, 0.0001), 0, 1);
        return {
            x: path.loopReset ? fromNode.displayX : lerp(fromNode.displayX, toNode.displayX, progress),
            y: path.loopReset ? fromNode.displayY : lerp(fromNode.displayY, toNode.displayY, progress)
        };
    },
    getEdgeModifier(chainIndex) {
        if (chainIndex <= 0) {
            return { kind: 'restart', reach: 1, stance: 1, stability: 1 };
        }

        const previous = this.activeNodes[chainIndex - 1];
        const current = this.activeNodes[chainIndex];
        if (previous.polarity === current.polarity) {
            return { kind: 'steady', reach: 0.94, stance: 1.16, stability: 1.18 };
        }
        return { kind: 'inverse', reach: 1.18, stance: 0.84, stability: 0.82 };
    },
    getPulseInterval(current, next, loopReset) {
        let interval = loopReset ? 0.36 : 0.22;
        let factor = 1;
        if (!loopReset && current.polarity !== next.polarity) {
            factor *= 0.94;
        }
        if (this.keys.shift.isDown) {
            factor *= 0.92;
        }
        factor *= lerp(1, 0.86, clamp(this.player.tempoBoost, 0, 1));
        return interval * Math.max(0.74, factor);
    },
    computeNominalOffset(node) {
        return {
            x: node.localX || 0,
            y: node.localY || 0
        };
    },
    isBlueOnlyDriveMode() {
        const T = window.TUNING || {};
        return !(T.legacyAllNodesMove ?? true);
    },
    nodeIsFunctionSuppressed(node) {
        return this.isBlueOnlyDriveMode() && node.polarity === 'inverse';
    },
    nodeHasMoveAbility(node) {
        if (!this.isBlueOnlyDriveMode()) {
            return true;
        }
        return node.polarity === 'base';
    },
    plantNode(node, profile) {
        const flow = normalize(this.intent.flowX, this.intent.flowY, Math.cos(this.player.heading), Math.sin(this.player.heading));
        const aim = normalize(this.intent.aimX, this.intent.aimY, flow.x, flow.y);
        const lead = normalize(flow.x * (profile.flowBias ?? 0.55) + aim.x * (profile.aimBias ?? 0.45), flow.y * (profile.flowBias ?? 0.55) + aim.y * (profile.aimBias ?? 0.45), aim.x, aim.y);
        const right = { x: -lead.y, y: lead.x };
        const lateralBias = clamp((node.localY || 0) / Math.max(PARTIAL_MESH_RULES.slotSpacing, this.player.topologyRadius || PARTIAL_MESH_RULES.slotSpacing), -1, 1);
        const sideSign = Math.abs(lateralBias) < 0.18 ? (node.order % 2 === 0 ? -1 : 1) : Math.sign(lateralBias);
        const T = window.TUNING || {};
        const spanFactor = T.formationSpanFactor ?? 0.16;
        const forwardReach = (profile.forwardBase + this.getFormationSpan() * spanFactor) * profile.reachScale;
        const sideReach = (profile.sideBase ?? 0) * sideSign * (profile.sideScale ?? Math.max(0.35, Math.abs(lateralBias)));
        node.anchorX = this.player.centroidX + lead.x * forwardReach + right.x * sideReach;
        node.anchorY = this.player.centroidY + lead.y * forwardReach + right.y * sideReach;
        node.pulseGlow = 1;
        if (this.nodeHasMoveAbility(node)) {
            node.anchorStrength = profile.strength;
            node.stanceTimer = profile.stance;
            node.anchored = true;
            return;
        }

        node.anchorStrength = 0;
        node.stanceTimer = 0;
        node.anchored = false;
    },
    triggerNode(node, edge) {
        if (this.nodeIsFunctionSuppressed(node)) {
            node.anchorStrength = 0;
            node.stanceTimer = 0;
            node.anchored = false;
            return;
        }

        if (edge.kind === 'inverse') {
            this.player.agitation = clamp(this.player.agitation + 0.22, 0, 2);
        } else if (edge.kind === 'steady') {
            this.player.stability = Math.min(1.3, this.player.stability + 0.12);
        }

        const T = window.TUNING || {};
        switch (node.role) {
            case 'source':
                this.player.energy = Math.min(3, this.player.energy + 1);
                this.player.stability = Math.min(1.2, this.player.stability + 0.08);
                this.plantNode(node, { forwardBase: T.plantSourceForward ?? 78, sideBase: T.plantSourceSide ?? 88, stance: (T.plantSourceStance ?? 0.36) * edge.stance, strength: (T.plantSourceStrength ?? 260) * edge.stability, reachScale: edge.reach });
                break;
            case 'compressor':
                this.player.energy = Math.min(3, this.player.energy + 1);
                this.player.overload = Math.min(3, this.player.overload + 1);
                this.player.tempoBoost = clamp(this.player.tempoBoost + 0.5, 0, 1);
                this.player.agitation = clamp(this.player.agitation + 0.2, 0, 2);
                this.plantNode(node, { forwardBase: T.plantCompressorForward ?? 92, sideBase: T.plantCompressorSide ?? 62, stance: (T.plantCompressorStance ?? 0.28) * edge.stance, strength: T.plantCompressorStrength ?? 320, reachScale: edge.reach * 1.06 });
                break;
            case 'shell':
                this.player.guard = Math.min(2, this.player.guard + 1);
                this.player.stability = Math.min(1.4, this.player.stability + 0.18);
                this.player.turnAssist = Math.max(this.player.turnAssist, 0.18);
                this.plantNode(node, { forwardBase: T.plantShellForward ?? 52, sideBase: T.plantShellSide ?? 146, stance: (T.plantShellStance ?? 0.5) * edge.stance, strength: (T.plantShellStrength ?? 420) * edge.stability, reachScale: edge.reach * 0.94, flowBias: T.plantShellFlowBias ?? 0.68, aimBias: T.plantShellAimBias ?? 0.32 });
                break;
            case 'prism':
                this.player.echo = 1;
                this.player.turnAssist = Math.min(1.2, this.player.turnAssist + 0.45);
                this.plantNode(node, { forwardBase: T.plantPrismForward ?? 86, sideBase: T.plantPrismSide ?? 134, stance: (T.plantPrismStance ?? 0.4) * edge.stance, strength: T.plantPrismStrength ?? 360, reachScale: edge.reach, flowBias: T.plantPrismFlowBias ?? 0.3, aimBias: T.plantPrismAimBias ?? 0.7 });
                break;
            case 'dart':
                this.fireVolley(node, edge);
                break;
            case 'blade':
                this.performSlash(node, edge);
                break;
            default:
                break;
        }
    },
    updateFormation(simDt) {
        const T = window.TUNING || {};
        const forward = vectorFromAngle(this.player.heading);
        const drift = normalize(this.intent.flowX, this.intent.flowY, forward.x, forward.y);
        const draggedTarget = this.player.edit.active && this.player.edit.dragNode >= 0
            ? {
                index: this.player.edit.dragNode,
                x: this.player.edit.dragWorldX,
                y: this.player.edit.dragWorldY
            }
            : null;

        this.computeCentroid();

        this.activeNodes.forEach((node) => {
            node.fx = 0;
            node.fy = 0;
            if (draggedTarget && node.index === draggedTarget.index) {
                node.x = draggedTarget.x;
                node.y = draggedTarget.y;
                node.vx = 0;
                node.vy = 0;
                node.anchored = false;
                node.anchorStrength = 0;
            }
            if (!this.nodeHasMoveAbility(node) && node.anchored) {
                node.anchored = false;
                node.anchorStrength = 0;
                node.stanceTimer = 0;
            }
            if (node.anchored) {
                node.stanceTimer -= simDt;
                if (node.stanceTimer <= 0) {
                    node.anchored = false;
                    node.anchorStrength = 0;
                }
            }
        });

        this.activeNodes.forEach((node) => {
            const canDrive = this.nodeHasMoveAbility(node);
            // ── 编队拉力 ──
            if ((T.enableFormationPull ?? true) && canDrive) {
                const nominal = this.computeNominalOffset(node);
                const rotated = rotateLocal(nominal.x, nominal.y, this.player.heading);
                const targetX = this.player.centroidX + rotated.x;
                const targetY = this.player.centroidY + rotated.y;
                const toNominalX = targetX - node.x;
                const toNominalY = targetY - node.y;
                const formationPull = node.anchored
                    ? (T.formationPullAnchored ?? 32)
                    : (T.formationPullFreeBase ?? 76) + this.player.stability * (T.formationPullStabilityBonus ?? 22);
                node.fx += toNominalX * formationPull;
                node.fy += toNominalY * formationPull;
            }

            // ── 漂移力 ──
            if ((T.enableDrift ?? true) && !node.anchored && canDrive) {
                const drive = node.role === 'blade' || node.role === 'dart'
                    ? (T.driftAttack ?? 54)
                    : node.role === 'shell'
                        ? (T.driftShell ?? 18)
                        : (T.driftDefault ?? 28);
                node.fx += drift.x * drive;
                node.fy += drift.y * drive;
            }

            // ── 核心收束力 ──
            if ((T.enableCorePull ?? true) && canDrive && (node.role === 'source' || node.role === 'compressor')) {
                const pullToCoreX = this.player.centroidX - node.x;
                const pullToCoreY = this.player.centroidY - node.y;
                const coreStr = T.corePullStrength ?? 24;
                node.fx += pullToCoreX * coreStr;
                node.fy += pullToCoreY * coreStr;
            }

            // ── 锚定力 ──
            if ((T.enableAnchor ?? true) && node.anchored && canDrive) {
                node.fx += (node.anchorX - node.x) * node.anchorStrength;
                node.fy += (node.anchorY - node.y) * node.anchorStrength;
            }

            if (draggedTarget && node.index === draggedTarget.index) {
                node.fx = 0;
                node.fy = 0;
            }
        });

        // ── 弹簧力 ──
        if (T.enableSpring ?? true) {
            const sK = T.springK ?? 260;
            const sD = T.springDamping ?? 42;
            this.links.forEach((link) => {
                const first = this.activeNodes[link.a];
                const second = this.activeNodes[link.b];
                const dx = second.x - first.x;
                const dy = second.y - first.y;
                const distance = Math.hypot(dx, dy) || 0.0001;
                const dirX = dx / distance;
                const dirY = dy / distance;
                const stretch = this.getLinkConstraintError(distance, link);
                const relVel = (second.vx - first.vx) * dirX + (second.vy - first.vy) * dirY;
                const force = stretch * (sK * link.stiffness) + relVel * (sD * link.damping);
                first.fx += dirX * force;
                first.fy += dirY * force;
                second.fx -= dirX * force;
                second.fy -= dirY * force;
                link.tension = Math.abs(stretch) / Math.max(link.rest, 0.0001);
                first.tension = Math.max(first.tension * 0.82, link.tension);
                second.tension = Math.max(second.tension * 0.82, link.tension);
            });
        }

        // ── 排斥力 ──
        if (T.enableRepulsion ?? true) {
            const repMinDist = T.repulsionMinDist ?? 72;
            const repDegMax = T.repulsionDegreeMax ?? 18;
            const repDegScale = T.repulsionDegreeScale ?? 1.6;
            const repK = T.repulsionStiffness ?? 16;
            for (let i = 0; i < this.activeNodes.length; i += 1) {
                for (let j = i + 1; j < this.activeNodes.length; j += 1) {
                    const first = this.activeNodes[i];
                    const second = this.activeNodes[j];
                    const dx = second.x - first.x;
                    const dy = second.y - first.y;
                    const distance = Math.hypot(dx, dy) || 0.0001;
                    const minDistance = repMinDist + Math.min(repDegMax, (first.degree || 0) + (second.degree || 0)) * repDegScale;
                    if (distance >= minDistance) {
                        continue;
                    }
                    const push = (minDistance - distance) * repK;
                    const dirX = dx / distance;
                    const dirY = dy / distance;
                    first.fx -= dirX * push;
                    first.fy -= dirY * push;
                    second.fx += dirX * push;
                    second.fy += dirY * push;
                }
            }
        }

        // ── 速度积分 + 阻力 ──
        const dragAnch = T.dragAnchored ?? 7.8;
        const dragFBase = T.dragFreeBase ?? 5.6;
        const dragStabB = T.dragStabilityBonus ?? 1.1;
        const tDecay = T.tensionDecay ?? 0.85;
        this.activeNodes.forEach((node) => {
            const drag = node.anchored ? dragAnch : dragFBase + this.player.stability * dragStabB;
            node.vx = (node.vx + (node.fx / node.mass) * simDt) * Math.exp(-drag * simDt);
            node.vy = (node.vy + (node.fy / node.mass) * simDt) * Math.exp(-drag * simDt);
            node.x += node.vx * simDt;
            node.y += node.vy * simDt;
            node.tension *= tDecay;
        });

        // ── PBD 位置校正 ──
        if (T.enablePBD ?? true) {
            const pbdIter = T.pbdIterations ?? 3;
            const pbdRate = T.pbdCorrectionRate ?? 0.18;
            const rigidPasses = T.pbdRigidPasses ?? 2;
            const draggedIndex = draggedTarget ? draggedTarget.index : -1;
            for (let iteration = 0; iteration < pbdIter; iteration += 1) {
                this.links.forEach((link) => {
                    this.solveLinkConstraint(link, pbdRate, draggedIndex);
                });
            }
            for (let extraPass = 0; extraPass < rigidPasses; extraPass += 1) {
                this.links.forEach((link) => {
                    if (link.rigidity !== 'rigid') {
                        return;
                    }
                    this.solveLinkConstraint(link, pbdRate, draggedIndex);
                });
            }
        }

        if (draggedTarget) {
            const draggedNode = this.activeNodes.find((node) => node.index === draggedTarget.index);
            if (draggedNode) {
                draggedNode.x = draggedTarget.x;
                draggedNode.y = draggedTarget.y;
                draggedNode.vx = 0;
                draggedNode.vy = 0;
            }
        }

        this.computeCentroid();
    },
    updatePlayerState(simDt) {
        const T = window.TUNING || {};
        const desiredHeading = Math.atan2(this.intent.flowY, this.intent.flowX);
        const turnRate = (T.baseTurnRate ?? 3.1) + this.player.turnAssist * (T.turnAssistBonus ?? 2.1);
        this.player.heading = Phaser.Math.Angle.RotateTo(this.player.heading, desiredHeading, turnRate * simDt);
        this.player.shieldTimer = Math.max(0, this.player.shieldTimer - simDt);
        this.player.tempoBoost = Math.max(0, this.player.tempoBoost - simDt * (T.tempoBoostDecay ?? 1.5));
        this.player.agitation = Math.max(0, this.player.agitation - simDt * (T.agitationDecay ?? 0.9));
        this.player.turnAssist = Math.max(0, this.player.turnAssist - simDt * (T.turnAssistDecay ?? 1.8));
        this.player.stability = Math.max(T.stabilityMin ?? 0.3, this.player.stability - simDt * (T.stabilityDecay ?? 0.4));
        if (this.player.shieldTimer <= 0) {
            this.player.shield = 0;
        }
    },
};