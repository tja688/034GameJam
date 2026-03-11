

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
                attackDamage: existing ? existing.attackDamage : 0,
                displayAngle: existing ? existing.displayAngle : -Math.PI * 0.5,
                spinVelocity: existing ? existing.spinVelocity : 0,
                feedPulse: existing ? existing.feedPulse : 0,
                hookTension: existing ? existing.hookTension : 0,
                biteGlow: existing ? existing.biteGlow : 0,
                predationWindow: existing ? existing.predationWindow : 0,
                predationMode: existing ? existing.predationMode : '',
                gripPower: existing ? existing.gripPower : 0,
                cutPower: existing ? existing.cutPower : 0,
                suctionPower: existing ? existing.suctionPower : 0,
                chewInterval: existing ? existing.chewInterval : 0.1,
                attachedPreyId: existing ? existing.attachedPreyId : '',
                attachedPreyCount: existing ? existing.attachedPreyCount : 0
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
                slotDx: slotB.x - slotA.x,
                slotDy: slotB.y - slotA.y,
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
    getFormationBounds(padding = 0) {
        if (!this.activeNodes || this.activeNodes.length === 0) {
            return {
                minX: this.player.centroidX - padding,
                maxX: this.player.centroidX + padding,
                minY: this.player.centroidY - padding,
                maxY: this.player.centroidY + padding,
                width: padding * 2,
                height: padding * 2,
                centerX: this.player.centroidX,
                centerY: this.player.centroidY
            };
        }

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        this.activeNodes.forEach((node) => {
            minX = Math.min(minX, node.x);
            maxX = Math.max(maxX, node.x);
            minY = Math.min(minY, node.y);
            maxY = Math.max(maxY, node.y);
        });

        minX -= padding;
        maxX += padding;
        minY -= padding;
        maxY += padding;
        return {
            minX,
            maxX,
            minY,
            maxY,
            width: Math.max(1, maxX - minX),
            height: Math.max(1, maxY - minY),
            centerX: (minX + maxX) * 0.5,
            centerY: (minY + maxY) * 0.5
        };
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
        const burstTempo = this.isBurstIntentDriveEnabled()
            ? clamp(this.intent?.burstTempo ?? 0, 0, 1)
            : 0;
        return interval * Math.max(0.38, factor * lerp(1, 0.58, burstTempo));
    },
    computeNominalOffset(node) {
        const volume = this.getClusterVolumeState();
        return {
            x: (node.localX || 0) * (volume.forwardScale || 1),
            y: (node.localY || 0) * (volume.lateralScale || 1)
        };
    },
    refreshDynamicLinkRestState() {
        const T = window.TUNING || {};
        const volume = this.getClusterVolumeState();
        const sameRestMul = T.samePolarityRestMul ?? 1.02;
        const invRestMul = T.inversePolarityRestMul ?? 1.08;
        const restMin = (T.linkRestMin ?? 84) * (1 - Math.min(0.35, volume.compression || 0));
        const restMax = (T.linkRestMax ?? 206) * (1 + Math.max(0, (volume.expansion || 0) * (T.clusterVolumeRestClampBoost ?? 0.8)));

        this.links.forEach((link) => {
            const polarityMul = link.samePolarity ? sameRestMul : invRestMul;
            const targetRest = Math.hypot(
                (link.slotDx || 0) * (volume.forwardScale || 1),
                (link.slotDy || 0) * (volume.lateralScale || 1)
            ) * polarityMul * (volume.restScale || 1);
            link.rest = clamp(targetRest, restMin, restMax);
        });
    },
    isBurstIntentDriveEnabled() {
        const T = window.TUNING || {};
        return !!(T.enableBurstIntentDrive ?? false);
    },
    isClusterVolumeControlEnabled() {
        const T = window.TUNING || {};
        return !!(T.enableClusterVolumeControl ?? false);
    },
    getClusterVolumeState() {
        if (!this.clusterVolume) {
            this.clusterVolume = this.createDefaultClusterVolumeState();
        }
        return this.clusterVolume;
    },
    getBurstDriveState() {
        if (!this.burstDrive) {
            this.burstDrive = this.createDefaultBurstDriveState();
        }
        return this.burstDrive;
    },
    getIntentDriveSpan() {
        const liveSpan = this.activeNodes && this.activeNodes.length > 0 ? this.getFormationSpan() : 0;
        return Math.max(PARTIAL_MESH_RULES.slotSpacing, this.player.topologyRadius || 0, liveSpan);
    },
    getNodeDriveFrontRatio(node, direction, span = this.getIntentDriveSpan()) {
        const rotated = rotateLocal(node.localX || 0, node.localY || 0, this.player.heading);
        const projection = rotated.x * direction.x + rotated.y * direction.y;
        return clamp(projection / Math.max(span, PARTIAL_MESH_RULES.slotSpacing), -1, 1);
    },
    resolveNodeDriveIntent(node) {
        const forward = vectorFromAngle(this.player.heading);
        const flow = normalize(this.intent.flowX, this.intent.flowY, forward.x, forward.y);
        const aim = normalize(this.intent.aimX, this.intent.aimY, flow.x, flow.y);
        const burstAggro = this.isBurstIntentDriveEnabled()
            ? clamp(this.intent.burstAggro ?? 0, 0, 1)
            : 0;
        return {
            flow,
            focus: aim,
            aggression: burstAggro * 0.72,
            activity: 1 + burstAggro * 0.24
        };
    },
    plantNode(node, profile) {
        const driveIntent = this.resolveNodeDriveIntent(node);
        let leadX = driveIntent.flow.x * (profile.flowBias ?? 0.55) + driveIntent.focus.x * (profile.aimBias ?? 0.45);
        let leadY = driveIntent.flow.y * (profile.flowBias ?? 0.55) + driveIntent.focus.y * (profile.aimBias ?? 0.45);
        let lead = normalize(leadX, leadY, driveIntent.focus.x, driveIntent.focus.y);

        const T = window.TUNING || {};
        const volume = this.getClusterVolumeState();
        const burstReachBoost = this.isBurstIntentDriveEnabled() ? clamp(this.intent.burstReachBoost ?? 0, 0, 2) : 0;
        const burstStrengthBoost = this.isBurstIntentDriveEnabled() ? clamp(this.intent.burstStrengthBoost ?? 0, 0, 2) : 0;
        const burstSpreadBoost = this.isBurstIntentDriveEnabled() ? clamp(this.intent.burstSpreadBoost ?? 0, 0, 1.5) : 0;
        const burstTempo = this.isBurstIntentDriveEnabled() ? clamp(this.intent.burstTempo ?? 0, 0, 1) : 0;
        const chaos = (T.intentChaosDegree ?? 0.0) + (this.intent.burstChaos ?? 0);
        if (chaos > 0 && driveIntent.activity > 0) {
            const rot = (Math.random() - 0.5) * Math.PI * chaos;
            const cosR = Math.cos(rot);
            const sinR = Math.sin(rot);
            const cx = lead.x * cosR - lead.y * sinR;
            const cy = lead.x * sinR + lead.y * cosR;
            lead = normalize(cx, cy, lead.x, lead.y);
        }

        const right = { x: -lead.y, y: lead.x };
        const lateralBias = clamp((node.localY || 0) / Math.max(PARTIAL_MESH_RULES.slotSpacing, this.player.topologyRadius || PARTIAL_MESH_RULES.slotSpacing), -1, 1);
        const sideSign = Math.abs(lateralBias) < 0.18 ? (node.order % 2 === 0 ? -1 : 1) : Math.sign(lateralBias);
        const spanFactor = T.formationSpanFactor ?? 0.16;
        const span = this.getIntentDriveSpan();
        const frontRatio = this.getNodeDriveFrontRatio(node, lead, span);
        const scaleBoost = driveIntent.aggression * span * 0.32;
        const frontBoost = Math.max(0, frontRatio) * span * (0.18 + driveIntent.aggression * 0.44);
        const rearDrag = Math.max(0, -frontRatio) * span * (0.06 + driveIntent.aggression * 0.12);

        const reachJitter = chaos > 0 ? 1.0 + (Math.random() - 0.5) * chaos * 0.8 : 1.0;
        const forwardReach = (profile.forwardBase + span * spanFactor + scaleBoost + frontBoost - rearDrag)
            * profile.reachScale
            * reachJitter
            * (1 + (volume.expansion || 0) * (T.clusterVolumePulseReach ?? 0.18))
            * (1 + burstReachBoost * (T.burstReachBoost ?? 0.58));
        const sideReach = (profile.sideBase ?? 0)
            * sideSign
            * (profile.sideScale ?? Math.max(0.35, Math.abs(lateralBias)))
            * (1 + driveIntent.aggression * 0.1 + (volume.expansion || 0) * (T.clusterVolumeSideReach ?? 0.34) + burstSpreadBoost)
            * reachJitter;

        node.anchorX = this.player.centroidX + lead.x * forwardReach + right.x * sideReach;
        node.anchorY = this.player.centroidY + lead.y * forwardReach + right.y * sideReach;
        node.pulseGlow = 1;
        const stanceJitter = chaos > 0 ? 1.0 + (Math.random() - 0.5) * chaos * 0.5 : 1.0;
        node.anchorStrength = profile.strength
            * (1 + driveIntent.aggression * 0.52 + burstStrengthBoost * (T.burstStrengthBoost ?? 0.78))
            * driveIntent.activity;
        node.stanceTimer = profile.stance
            * lerp(1, 0.84, driveIntent.aggression)
            * lerp(1, 0.72, burstTempo)
            * stanceJitter;
        node.anchored = driveIntent.activity > 0.05;
        if (!node.anchored) {
            node.anchorStrength = 0;
            node.stanceTimer = 0;
        }
    },
    triggerNode(node, edge) {
        if (edge.kind === 'inverse') {
            this.player.agitation = clamp(this.player.agitation + 0.22, 0, 2);
        } else if (edge.kind === 'steady') {
            this.player.stability = Math.min(1.3, this.player.stability + 0.12);
        }

        switch (node.role) {
            case 'source':
                this.player.stability = Math.min(1.2, this.player.stability + 0.08);
                this.pulseFeed(node, edge, 'source');
                break;
            case 'compressor':
                this.player.tempoBoost = clamp(this.player.tempoBoost + 0.5, 0, 1);
                this.player.agitation = clamp(this.player.agitation + 0.2, 0, 2);
                this.pulseFeed(node, edge, 'compressor');
                break;
            case 'shell':
                this.player.stability = Math.min(1.4, this.player.stability + 0.18);
                this.player.turnAssist = Math.max(this.player.turnAssist, 0.18);
                this.performGrind(node, edge, 'shell');
                break;
            case 'prism':
                this.player.turnAssist = Math.min(1.2, this.player.turnAssist + 0.45);
                this.performGrind(node, edge, 'prism');
                break;
            case 'dart':
                this.performHookStrike(node, edge, 'dart');
                break;
            case 'blade':
                this.performHookStrike(node, edge, 'blade');
                break;
            default:
                break;
        }
    },
    updateFormation(simDt) {
        const T = window.TUNING || {};
        const volume = this.getClusterVolumeState();
        const burstDriftBoost = this.isBurstIntentDriveEnabled() ? clamp(this.intent.burstDriftBoost ?? 0, 0, 1.5) : 0;
        const draggedTarget = this.player.edit.active && this.player.edit.dragNode >= 0
            ? {
                index: this.player.edit.dragNode,
                x: this.player.edit.dragWorldX,
                y: this.player.edit.dragWorldY
            }
            : null;

        this.computeCentroid();
        const driveSpan = this.getIntentDriveSpan();
        this.refreshDynamicLinkRestState();

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
            if (node.anchored) {
                node.stanceTimer -= simDt;
                if (node.stanceTimer <= 0) {
                    node.anchored = false;
                    node.anchorStrength = 0;
                }
            }
        });

        this.activeNodes.forEach((node) => {
            const driveIntent = this.resolveNodeDriveIntent(node);
            if ((this.isClusterVolumeControlEnabled() || volume.latticePull > 0.01) && !(draggedTarget && node.index === draggedTarget.index)) {
                const nominal = this.computeNominalOffset(node);
                const rotated = rotateLocal(nominal.x, nominal.y, this.player.heading);
                const targetX = this.player.centroidX + rotated.x;
                const targetY = this.player.centroidY + rotated.y;
                node.fx += (targetX - node.x) * volume.latticePull;
                node.fy += (targetY - node.y) * volume.latticePull;
            }

            // ── 漂移力 ──
            if ((T.enableDrift ?? true) && !node.anchored) {
                const drive = node.role === 'blade' || node.role === 'dart'
                    ? (T.driftAttack ?? 54)
                    : node.role === 'shell'
                        ? (T.driftShell ?? 18)
                        : (T.driftDefault ?? 28);
                const frontRatio = this.getNodeDriveFrontRatio(node, driveIntent.flow, driveSpan);
                const driftScale = (1 + driveIntent.aggression * 0.85)
                    * lerp(0.92, 1.42, clamp((frontRatio + 1) * 0.5, 0, 1))
                    * driveIntent.activity
                    * (1 + burstDriftBoost);
                node.fx += driveIntent.flow.x * drive * driftScale;
                node.fy += driveIntent.flow.y * drive * driftScale;
            }

            // ── 核心收束力 ──
            if ((T.enableCorePull ?? true) && (node.role === 'source' || node.role === 'compressor')) {
                const pullToCoreX = this.player.centroidX - node.x;
                const pullToCoreY = this.player.centroidY - node.y;
                const coreStr = (T.corePullStrength ?? 24) * (volume.corePullScale || 1);
                node.fx += pullToCoreX * coreStr;
                node.fy += pullToCoreY * coreStr;
            }

            // ── 锚定力 ──
            if ((T.enableAnchor ?? true) && node.anchored) {
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
            const repK = (T.repulsionStiffness ?? 16) * lerp(1, 1.18, clamp(this.intent.burstSpreadBoost ?? 0, 0, 1));
            for (let i = 0; i < this.activeNodes.length; i += 1) {
                for (let j = i + 1; j < this.activeNodes.length; j += 1) {
                    const first = this.activeNodes[i];
                    const second = this.activeNodes[j];
                    const dx = second.x - first.x;
                    const dy = second.y - first.y;
                    const distance = Math.hypot(dx, dy) || 0.0001;
                    const minDistance = (repMinDist + Math.min(repDegMax, (first.degree || 0) + (second.degree || 0)) * repDegScale)
                        * (volume.repulsionScale || 1);
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
        const burstAggro = this.isBurstIntentDriveEnabled() ? clamp(this.intent.burstAggro ?? 0, 0, 1) : 0;
        const turnRate = ((T.baseTurnRate ?? 3.1) + this.player.turnAssist * (T.turnAssistBonus ?? 2.1))
            * (1 + burstAggro * 0.42);
        this.player.heading = Phaser.Math.Angle.RotateTo(this.player.heading, desiredHeading, turnRate * simDt);
        this.player.shieldTimer = Math.max(0, this.player.shieldTimer - simDt);
        this.player.tempoBoost = Math.max(0, this.player.tempoBoost - simDt * (T.tempoBoostDecay ?? 1.5));
        this.player.agitation = Math.max(0, this.player.agitation - simDt * (T.agitationDecay ?? 0.9));
        this.player.turnAssist = Math.max(0, this.player.turnAssist - simDt * (T.turnAssistDecay ?? 1.8));
        this.player.stability = Math.max(T.stabilityMin ?? 0.3, this.player.stability - simDt * (T.stabilityDecay ?? 0.4));
        this.player.feast = Math.max(0, (this.player.feast || 0) - simDt * 0.28);
        this.player.feastGlow = Math.max(0, (this.player.feastGlow || 0) - simDt * 0.55);
        if (this.player.shieldTimer <= 0) {
            this.player.shield = 0;
        }
    },
};
