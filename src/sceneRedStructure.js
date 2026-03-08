const SceneRedStructureMixin = {
    createDefaultRedClusterMemberState(previous = null) {
        return {
            targetX: getFiniteNumber(previous?.targetX, 0),
            targetY: getFiniteNumber(previous?.targetY, 0),
            offsetX: getFiniteNumber(previous?.offsetX, 0),
            offsetY: getFiniteNumber(previous?.offsetY, 0),
            previousOffsetX: getFiniteNumber(previous?.previousOffsetX, 0),
            previousOffsetY: getFiniteNumber(previous?.previousOffsetY, 0),
            timer: getFiniteNumber(previous?.timer, 0)
        };
    },
    syncActiveNodeLocalFromSlots(targets = null) {
        const slots = this.player?.topology?.slots || {};
        const targetSet = Array.isArray(targets)
            ? new Set(
                targets
                    .map((entry) => (Number.isInteger(entry) ? entry : entry?.index))
                    .filter((index) => Number.isInteger(index))
            )
            : null;
        (this.activeNodes || []).forEach((node) => {
            if (targetSet && !targetSet.has(node.index)) {
                return;
            }
            const slot = slots[node.index];
            if (!slot) {
                return;
            }
            node.localX = slot.x;
            node.localY = slot.y;
        });
    },
    markRedClusterRestDirty(groupId = 0) {
        this.redClustersRestDirty = true;
        if (!this.redClustersDirtyGroups) {
            this.redClustersDirtyGroups = new Set();
        }
        if (groupId > 0) {
            this.redClustersDirtyGroups.add(groupId);
        }
    },
    clearRedClusterRestDirty() {
        this.redClustersRestDirty = false;
        this.redClustersDirtyGroups = new Set();
    },
    getRedClusterForNode(indexOrNode) {
        const groupId = this.getExperimentalRedGroupId(indexOrNode);
        if (groupId <= 0 || !this.redClusters) {
            return null;
        }
        return this.redClusters.get(groupId) || null;
    },
    getRedClusterMemberState(cluster, nodeIndex) {
        if (!cluster?.memberStates) {
            return this.createDefaultRedClusterMemberState();
        }
        if (!cluster.memberStates.has(nodeIndex)) {
            cluster.memberStates.set(nodeIndex, this.createDefaultRedClusterMemberState());
        }
        return cluster.memberStates.get(nodeIndex);
    },
    isNodeDrivenByRedCluster(indexOrNode) {
        return !!this.getRedClusterForNode(indexOrNode);
    },
    estimateRedClusterPose(memberNodes, restLocalByIndex) {
        if (!Array.isArray(memberNodes) || memberNodes.length === 0) {
            return {
                x: this.player.centroidX,
                y: this.player.centroidY,
                angle: this.player.heading,
                vx: 0,
                vy: 0
            };
        }

        const centroid = memberNodes.reduce((acc, node) => {
            acc.x += node.x || 0;
            acc.y += node.y || 0;
            acc.vx += node.vx || 0;
            acc.vy += node.vy || 0;
            return acc;
        }, { x: 0, y: 0, vx: 0, vy: 0 });
        centroid.x /= memberNodes.length;
        centroid.y /= memberNodes.length;
        centroid.vx /= memberNodes.length;
        centroid.vy /= memberNodes.length;

        let sinSum = 0;
        let cosSum = 0;
        let weightSum = 0;
        memberNodes.forEach((node) => {
            const rest = restLocalByIndex[node.index];
            if (!rest) {
                return;
            }
            const restRadius = Math.hypot(rest.x, rest.y);
            if (restRadius < 0.0001) {
                return;
            }
            const worldAngle = Math.atan2((node.y || 0) - centroid.y, (node.x || 0) - centroid.x);
            const restAngle = Math.atan2(rest.y, rest.x);
            const delta = Phaser.Math.Angle.Wrap(worldAngle - restAngle);
            sinSum += Math.sin(delta) * restRadius;
            cosSum += Math.cos(delta) * restRadius;
            weightSum += restRadius;
        });

        return {
            x: centroid.x,
            y: centroid.y,
            angle: weightSum > 0 ? Math.atan2(sinSum, cosSum) : this.player.heading,
            vx: centroid.vx,
            vy: centroid.vy
        };
    },
    buildRedClusterState(groupId, previousCluster = null, preservePose = false) {
        const groupNodes = this.getExperimentalRedNodesByGroup(groupId, true).sort((first, second) => first.order - second.order);
        if (groupNodes.length === 0) {
            return null;
        }
        const canPreserve = !!previousCluster
            && preservePose
            && Array.isArray(previousCluster.memberIndices)
            && previousCluster.memberIndices.length === groupNodes.length
            && previousCluster.memberIndices.every((index, order) => index === groupNodes[order].index);

        const slots = this.player?.topology?.slots || {};
        const centerLocal = groupNodes.reduce((acc, node) => {
            const slot = slots[node.index] || { x: node.localX || 0, y: node.localY || 0 };
            acc.x += slot.x;
            acc.y += slot.y;
            return acc;
        }, { x: 0, y: 0 });
        centerLocal.x /= groupNodes.length;
        centerLocal.y /= groupNodes.length;

        const restLocalByIndex = {};
        let totalMass = 0;
        let inertia = 0;
        groupNodes.forEach((node) => {
            const slot = slots[node.index] || { x: node.localX || 0, y: node.localY || 0 };
            const local = {
                x: slot.x - centerLocal.x,
                y: slot.y - centerLocal.y
            };
            restLocalByIndex[node.index] = local;
            const mass = Math.max(node.mass || 1, 0.1);
            totalMass += mass;
            inertia += mass * Math.max(36, local.x * local.x + local.y * local.y);
        });

        const estimatedPose = this.estimateRedClusterPose(groupNodes, restLocalByIndex);
        const memberStates = new Map();
        groupNodes.forEach((node) => {
            const previousState = canPreserve ? previousCluster?.memberStates?.get(node.index) : null;
            memberStates.set(node.index, this.createDefaultRedClusterMemberState(previousState));
        });

        const cluster = {
            groupId,
            memberIndices: groupNodes.map((node) => node.index),
            memberIndexSet: new Set(groupNodes.map((node) => node.index)),
            memberStates,
            restCenterLocal: centerLocal,
            restLocalByIndex,
            x: canPreserve ? previousCluster.x : estimatedPose.x,
            y: canPreserve ? previousCluster.y : estimatedPose.y,
            angle: canPreserve ? previousCluster.angle : estimatedPose.angle,
            vx: canPreserve ? previousCluster.vx : estimatedPose.vx,
            vy: canPreserve ? previousCluster.vy : estimatedPose.vy,
            omega: canPreserve ? previousCluster.omega : 0,
            forceX: 0,
            forceY: 0,
            torque: 0,
            mass: Math.max(totalMass, 0.1),
            inertia: Math.max(inertia, totalMass * 36, 1),
            poseOffsetMax: 0
        };
        return cluster;
    },
    syncRedClusterState(forceReset = false) {
        if (!this.isExperimentalRedTopologyEnabled()) {
            this.redClusters = new Map();
            this.redNodeToCluster = new Map();
            this.clearRedClusterRestDirty();
            return;
        }

        this.syncActiveNodeLocalFromSlots();
        const nextClusters = new Map();
        const nextNodeMap = new Map();
        const previousClusters = this.redClusters || new Map();

        this.getExperimentalRedGroups().forEach((_, groupId) => {
            const previousCluster = previousClusters.get(groupId);
            const nextCluster = this.buildRedClusterState(groupId, previousCluster, !!previousCluster && !forceReset);
            if (!nextCluster) {
                return;
            }
            nextClusters.set(groupId, nextCluster);
            nextCluster.memberIndices.forEach((index) => nextNodeMap.set(index, nextCluster));
            this.refreshExperimentalRedLinkRuntime(groupId);
        });

        this.redClusters = nextClusters;
        this.redNodeToCluster = nextNodeMap;
        this.clearRedClusterRestDirty();
    },
    getRedClusterMemberBaseWorld(cluster, nodeIndex) {
        const local = cluster?.restLocalByIndex?.[nodeIndex] || { x: 0, y: 0 };
        const rotated = rotateLocal(local.x, local.y, cluster?.angle || 0);
        return {
            x: (cluster?.x || 0) + rotated.x,
            y: (cluster?.y || 0) + rotated.y
        };
    },
    getRedClusterTargetPoint(cluster, nodeIndex) {
        const local = cluster?.restLocalByIndex?.[nodeIndex] || { x: 0, y: 0 };
        const memberState = this.getRedClusterMemberState(cluster, nodeIndex);
        const targetLocal = {
            x: local.x + memberState.offsetX,
            y: local.y + memberState.offsetY
        };
        const rotated = rotateLocal(targetLocal.x, targetLocal.y, cluster?.angle || 0);
        return {
            x: (cluster?.x || 0) + rotated.x,
            y: (cluster?.y || 0) + rotated.y,
            localX: targetLocal.x,
            localY: targetLocal.y
        };
    },
    queueRedClusterForce(cluster, worldX, worldY, fx, fy) {
        if (!cluster || (!fx && !fy)) {
            return;
        }
        cluster.forceX += fx;
        cluster.forceY += fy;
        const relX = worldX - cluster.x;
        const relY = worldY - cluster.y;
        cluster.torque += relX * fy - relY * fx;
    },
    collectRedClusterNodeForces() {
        (this.activeNodes || []).forEach((node) => {
            const cluster = this.getRedClusterForNode(node);
            if (!cluster) {
                return;
            }
            this.queueRedClusterForce(cluster, node.x, node.y, node.fx || 0, node.fy || 0);
            node.fx = 0;
            node.fy = 0;
        });
    },
    stepRedClusterMemberStates(simDt) {
        const T = window.TUNING || {};
        const poseBlend = Math.max(1, T.redClusterPoseBlend ?? 18);
        const poseDecay = Math.max(1, T.redClusterPoseDecay ?? 10);

        (this.redClusters || new Map()).forEach((cluster) => {
            let poseOffsetMax = 0;
            cluster.memberStates.forEach((memberState) => {
                memberState.previousOffsetX = memberState.offsetX;
                memberState.previousOffsetY = memberState.offsetY;
                memberState.timer = Math.max(0, memberState.timer - simDt);

                const targetX = memberState.timer > 0 ? memberState.targetX : 0;
                const targetY = memberState.timer > 0 ? memberState.targetY : 0;
                const followRate = memberState.timer > 0 ? poseBlend : poseDecay;
                memberState.offsetX = damp(memberState.offsetX, targetX, followRate, simDt);
                memberState.offsetY = damp(memberState.offsetY, targetY, followRate, simDt);

                if (memberState.timer <= 0) {
                    memberState.targetX = damp(memberState.targetX, 0, poseDecay, simDt);
                    memberState.targetY = damp(memberState.targetY, 0, poseDecay, simDt);
                }

                poseOffsetMax = Math.max(poseOffsetMax, Math.hypot(memberState.offsetX, memberState.offsetY));
            });
            cluster.poseOffsetMax = poseOffsetMax;
        });
    },
    getRedClusterDesiredAngle(cluster) {
        const flow = normalize(
            this.intent?.flowX,
            this.intent?.flowY,
            Math.cos(this.player.heading),
            Math.sin(this.player.heading)
        );
        const clusterToCentroid = normalize(
            this.player.centroidX - cluster.x,
            this.player.centroidY - cluster.y,
            flow.x,
            flow.y
        );
        const desired = normalize(
            flow.x * 0.82 + clusterToCentroid.x * 0.18,
            flow.y * 0.82 + clusterToCentroid.y * 0.18,
            flow.x,
            flow.y
        );
        return Math.atan2(desired.y, desired.x);
    },
    pinRedClusterMemberToWorld(cluster, pinnedIndex, worldX, worldY) {
        if (!cluster?.memberIndexSet?.has(pinnedIndex)) {
            return;
        }
        const pinnedTarget = this.getRedClusterTargetPoint(cluster, pinnedIndex);
        const dx = worldX - pinnedTarget.x;
        const dy = worldY - pinnedTarget.y;
        cluster.x += dx;
        cluster.y += dy;
    },
    integrateRedClusters(simDt, draggedTarget = null) {
        const T = window.TUNING || {};
        const linearDrag = Math.max(0, (T.redClusterLinearDrag ?? 2.2) + (T.redStructureExtraDrag ?? 0));
        const angularDrag = Math.max(0, T.redClusterAngularDrag ?? 5.4);
        const alignStrength = Math.max(0, T.redClusterAlignStrength ?? 10);

        this.stepRedClusterMemberStates(simDt);

        (this.redClusters || new Map()).forEach((cluster) => {
            const desiredAngle = this.getRedClusterDesiredAngle(cluster);
            const angleDelta = Phaser.Math.Angle.Wrap(desiredAngle - cluster.angle);
            const angularAccel = cluster.torque / Math.max(cluster.inertia, 1);
            cluster.omega = (cluster.omega + (angularAccel + angleDelta * alignStrength) * simDt) * Math.exp(-angularDrag * simDt);
            cluster.vx = (cluster.vx + (cluster.forceX / Math.max(cluster.mass, 0.1)) * simDt) * Math.exp(-linearDrag * simDt);
            cluster.vy = (cluster.vy + (cluster.forceY / Math.max(cluster.mass, 0.1)) * simDt) * Math.exp(-linearDrag * simDt);
            cluster.angle = Phaser.Math.Angle.Wrap(cluster.angle + cluster.omega * simDt);
            cluster.x += cluster.vx * simDt;
            cluster.y += cluster.vy * simDt;

            if (draggedTarget && cluster.memberIndexSet.has(draggedTarget.index)) {
                this.pinRedClusterMemberToWorld(cluster, draggedTarget.index, draggedTarget.x, draggedTarget.y);
                cluster.vx = 0;
                cluster.vy = 0;
                cluster.omega = 0;
            }

            cluster.forceX = 0;
            cluster.forceY = 0;
            cluster.torque = 0;
        });
    },
    syncRedClusterNodesToTargets(simDt) {
        const dt = Math.max(simDt, 0.0001);
        (this.activeNodes || []).forEach((node) => {
            const cluster = this.getRedClusterForNode(node);
            if (!cluster) {
                return;
            }
            const target = this.getRedClusterTargetPoint(cluster, node.index);
            node.vx = (target.x - node.x) / dt;
            node.vy = (target.y - node.y) / dt;
            node.x = target.x;
            node.y = target.y;
            node.anchored = false;
            node.anchorStrength = 0;
            node.stanceTimer = 0;
        });
    },
    applyRedClusterImpulse(cluster, nodeIndex, dirX, dirY, strength) {
        if (!cluster) {
            return;
        }
        const T = window.TUNING || {};
        const impulseScale = T.redClusterImpulseScale ?? 0.08;
        const torqueScale = T.redClusterTorqueScale ?? 0.025;
        const impulse = Math.max(0, strength) * impulseScale / Math.max(cluster.mass, 0.1);
        cluster.vx += dirX * impulse;
        cluster.vy += dirY * impulse;

        const nodePoint = this.getRedClusterMemberBaseWorld(cluster, nodeIndex);
        const relX = nodePoint.x - cluster.x;
        const relY = nodePoint.y - cluster.y;
        cluster.omega += (relX * dirY - relY * dirX) * torqueScale / Math.max(cluster.inertia, 1);
    },
    applyExperimentalRedPulseDrive(node, edge, plantState = null) {
        if (!this.isExperimentalRedTopologyEnabled() || !this.isExperimentalRedNode(node)) {
            return false;
        }

        const cluster = this.getRedClusterForNode(node);
        if (!cluster) {
            return false;
        }

        const T = window.TUNING || {};
        const leadBoost = T.redPulseLeadBoost ?? 1.4;
        const spread = Math.max(1, T.redPulseSpread ?? 180);
        const falloffSoftness = clamp(T.redPulseFalloffSoftness ?? 0.45, 0, 1);
        const poseMaxOffset = Math.max(24, T.redClusterPoseMaxOffset ?? 180);
        const poseScale = T.redClusterPoseScale ?? 1;
        const maxImpulseBudget = T.redPulseMaxBudget ?? 600;
        if (!this._redPulseFrameBudget) {
            this._redPulseFrameBudget = {};
        }

        const targetX = getFiniteNumber(plantState?.targetX, node.anchorX || node.x);
        const targetY = getFiniteNumber(plantState?.targetY, node.anchorY || node.y);
        const drive = normalize(
            plantState?.leadX,
            plantState?.leadY,
            this.intent?.flowX ?? Math.cos(this.player.heading),
            this.intent?.flowY ?? Math.sin(this.player.heading)
        );
        const memberBase = this.getRedClusterMemberBaseWorld(cluster, node.index);
        const deltaWorld = {
            x: targetX - memberBase.x,
            y: targetY - memberBase.y
        };
        const deltaLocal = rotateLocal(deltaWorld.x, deltaWorld.y, -cluster.angle);
        const deltaLength = Math.hypot(deltaLocal.x, deltaLocal.y);
        const clampScale = deltaLength > poseMaxOffset ? poseMaxOffset / deltaLength : 1;
        const clampedLocal = {
            x: deltaLocal.x * clampScale * poseScale,
            y: deltaLocal.y * clampScale * poseScale
        };

        const triggerRest = cluster.restLocalByIndex[node.index] || { x: 0, y: 0 };
        cluster.memberIndices.forEach((memberIndex) => {
            const memberState = this.getRedClusterMemberState(cluster, memberIndex);
            const memberRest = cluster.restLocalByIndex[memberIndex] || triggerRest;
            const distance = Math.hypot(memberRest.x - triggerRest.x, memberRest.y - triggerRest.y);
            const falloff = 1 - clamp(distance / spread, 0, 1) * falloffSoftness;
            const boost = memberIndex === node.index ? leadBoost : 1;
            const blend = clamp((falloff * boost) * (T.redClusterPoseTargetBlend ?? 0.72), 0, 1);
            memberState.targetX = lerp(memberState.targetX, clampedLocal.x * falloff * boost, blend);
            memberState.targetY = lerp(memberState.targetY, clampedLocal.y * falloff * boost, blend);
            memberState.timer = Math.max(memberState.timer, plantState?.stance ?? 0.18);
        });

        node.anchorX = targetX;
        node.anchorY = targetY;
        node.pulseGlow = 1;
        node.anchored = false;
        node.anchorStrength = 0;
        node.stanceTimer = 0;

        const speedCap = Math.max(1, T.redPulseSpeedCap ?? 500);
        const speedAttenuation = clamp(1 - (Math.hypot(cluster.vx || 0, cluster.vy || 0) / speedCap), 0.15, 1);
        const usedBudget = this._redPulseFrameBudget[cluster.groupId] || 0;
        const remainingBudget = Math.max(0, maxImpulseBudget - usedBudget);
        const requestedImpulse = (T.redPulseImpulse ?? 160) * (plantState?.reachScale ?? edge?.reach ?? 1) * (plantState?.activity ?? 1) * speedAttenuation;
        const impulseStrength = Math.min(requestedImpulse, remainingBudget);
        this._redPulseFrameBudget[cluster.groupId] = usedBudget + impulseStrength;
        this.applyRedClusterImpulse(cluster, node.index, drive.x, drive.y, impulseStrength);
        this.player.stability = Math.min(1.5, this.player.stability + (T.redPulseStabilityGain ?? 0.04));
        this.createRing(node.x, node.y, T.redPulseRingRadius ?? 38, COLORS.inverse, 0.18, 2);
        return true;
    },
    applyRedClusterContactImpulse(node, dirX, dirY, push, contactScale = 1) {
        const cluster = this.getRedClusterForNode(node);
        if (!cluster) {
            return false;
        }
        this.applyRedClusterImpulse(cluster, node.index, -dirX, -dirY, Math.max(0, push) * contactScale);
        return true;
    }
};
