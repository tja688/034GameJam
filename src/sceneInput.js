
const SceneInputMixin = {
    getPointerWorld() {
        return this.screenToWorld(this.input.activePointer.x, this.input.activePointer.y);
    },
    enterEditMode() {
        const edit = this.player.edit;
        const ambience = edit.ambience;
        const history = Array.isArray(edit.history) ? edit.history : [];
        Object.assign(edit, this.createDefaultEditState(), { active: true, ambience, history });
    },
    exitEditMode() {
        const edit = this.player.edit;
        const ambience = edit.ambience;
        const history = Array.isArray(edit.history) ? edit.history : [];
        Object.assign(edit, this.createDefaultEditState(), { active: false, ambience, history });
    },
    captureEditSnapshot() {
        return {
            chain: [...this.player.chain],
            centroidX: this.player.centroidX,
            centroidY: this.player.centroidY,
            topology: {
                slots: cloneData(this.player.topology?.slots || {}),
                edges: cloneData(this.player.topology?.edges || [])
            },
            activeNodes: cloneData((this.activeNodes || []).map((node) => ({
                index: node.index,
                x: node.x,
                y: node.y,
                vx: node.vx,
                vy: node.vy,
                anchorX: node.anchorX,
                anchorY: node.anchorY,
                anchored: node.anchored,
                stanceTimer: node.stanceTimer,
                anchorStrength: node.anchorStrength,
                pulseGlow: node.pulseGlow,
                tension: node.tension,
                displayX: node.displayX,
                displayY: node.displayY,
                displayAnchorX: node.displayAnchorX,
                displayAnchorY: node.displayAnchorY,
                attackTimer: node.attackTimer,
                attackDirX: node.attackDirX,
                attackDirY: node.attackDirY,
                attackDamage: node.attackDamage,
                displayAngle: node.displayAngle,
                spinVelocity: node.spinVelocity,
                feedPulse: node.feedPulse,
                hookTension: node.hookTension,
                biteGlow: node.biteGlow,
                predationWindow: node.predationWindow,
                predationMode: node.predationMode,
                gripPower: node.gripPower,
                cutPower: node.cutPower,
                suctionPower: node.suctionPower,
                chewInterval: node.chewInterval,
                attachedPreyId: node.attachedPreyId,
                attachedPreyCount: node.attachedPreyCount
            }))),
            pulseRunners: cloneData(this.player.pulseRunners || []),
            pulseCursor: this.player.pulseCursor,
            pulseTimer: this.player.pulseTimer,
            pulsePath: cloneData(this.player.pulsePath)
        };
    },
    getEditSnapshotSignature(snapshot) {
        return JSON.stringify(snapshot || null);
    },
    pushEditHistorySnapshot(snapshot) {
        if (!snapshot) {
            return;
        }

        const edit = this.player.edit;
        const history = Array.isArray(edit.history) ? edit.history : [];
        const signature = this.getEditSnapshotSignature(snapshot);
        const lastSignature = history.length > 0 ? this.getEditSnapshotSignature(history[history.length - 1]) : '';
        if (signature === lastSignature) {
            edit.history = history;
            return;
        }

        history.push(snapshot);
        if (history.length > 50) {
            history.splice(0, history.length - 50);
        }
        edit.history = history;
    },
    beginPendingEditSnapshot() {
        const edit = this.player.edit;
        if (!edit.pendingSnapshot) {
            edit.pendingSnapshot = this.captureEditSnapshot();
        }
    },
    commitPendingEditSnapshot() {
        const edit = this.player.edit;
        if (!edit.pendingSnapshot) {
            return false;
        }

        const beforeSignature = this.getEditSnapshotSignature(edit.pendingSnapshot);
        const afterSignature = this.getEditSnapshotSignature(this.captureEditSnapshot());
        edit.pendingSnapshot = null;
        if (beforeSignature === afterSignature) {
            return false;
        }

        this.pushEditHistorySnapshot(JSON.parse(beforeSignature));
        return true;
    },
    discardPendingEditSnapshot() {
        this.player.edit.pendingSnapshot = null;
    },
    applyEditSnapshot(snapshot) {
        if (!snapshot || !Array.isArray(snapshot.chain) || !snapshot.topology) {
            return false;
        }

        this.player.chain = [...snapshot.chain];
        this.player.centroidX = getFiniteNumber(snapshot.centroidX, this.player.centroidX);
        this.player.centroidY = getFiniteNumber(snapshot.centroidY, this.player.centroidY);
        this.player.topology = {
            slots: cloneData(snapshot.topology.slots || {}),
            edges: this.normalizeTopologyEdges(cloneData(snapshot.topology.edges || []))
        };
        this.activeNodes = cloneData(Array.isArray(snapshot.activeNodes) ? snapshot.activeNodes : []);
        this.player.pulseRunners = cloneData(snapshot.pulseRunners || []);
        this.player.pulseCursor = getFiniteNumber(snapshot.pulseCursor, this.player.pulseCursor);
        this.player.pulseTimer = getFiniteNumber(snapshot.pulseTimer, this.player.pulseTimer);
        this.player.pulsePath = {
            ...this.createDefaultPulsePath(),
            ...(cloneData(snapshot.pulsePath) || {})
        };
        this.clearEditDeleteState();
        this.clearEditSelection();
        this.resetBoxSelectionState();
        this.player.edit.pointerNode = -1;
        this.player.edit.pointerLink = '';
        this.player.edit.dragNode = -1;
        this.player.edit.hoverNode = -1;
        this.player.edit.hoverLink = '';
        this.rebuildFormation(false);
        if (typeof this.syncLegacyPulseState === 'function') {
            this.syncLegacyPulseState();
        }
        return true;
    },
    undoLastEditAction() {
        const edit = this.player.edit;
        const history = Array.isArray(edit.history) ? edit.history : [];
        if (history.length === 0) {
            return false;
        }

        this.discardPendingEditSnapshot();
        const snapshot = history.pop();
        edit.history = history;
        return this.applyEditSnapshot(snapshot);
    },
    getUniqueNodeSelection(indices) {
        return [...new Set((Array.isArray(indices) ? indices : []).filter((index) => Number.isInteger(index)))];
    },
    getUniqueLinkSelection(linkIds) {
        return [...new Set((Array.isArray(linkIds) ? linkIds : []).filter((linkId) => typeof linkId === 'string' && linkId.length > 0))];
    },
    clearEditDeleteState() {
        const edit = this.player.edit;
        edit.deleteType = '';
        edit.deleteNode = -1;
        edit.deleteNodes = [];
        edit.deleteLinks = [];
        edit.deleteProgress = 0;
    },
    clearEditSelection() {
        const edit = this.player.edit;
        edit.selectedNode = -1;
        edit.selectedNodes = [];
        edit.selectedLinks = [];
    },
    syncEditSelectionState() {
        const edit = this.player.edit;
        const chainSet = new Set(this.player.chain);
        const edgeIdSet = new Set((this.player.topology?.edges || []).map((edge) => edge.id));

        edit.selectedNodes = this.getUniqueNodeSelection(edit.selectedNodes).filter((index) => chainSet.has(index));
        edit.selectedLinks = this.getUniqueLinkSelection(edit.selectedLinks).filter((edgeId) => edgeIdSet.has(edgeId));
        edit.selectedNode = edit.selectedNodes.length === 1 ? edit.selectedNodes[0] : -1;

        if (edit.hoverNode >= 0 && !chainSet.has(edit.hoverNode)) {
            edit.hoverNode = -1;
        }
        if (edit.hoverLink && !edgeIdSet.has(edit.hoverLink)) {
            edit.hoverLink = '';
        }
        if (edit.pointerNode >= 0 && !chainSet.has(edit.pointerNode)) {
            edit.pointerNode = -1;
        }
        if (edit.pointerLink && !edgeIdSet.has(edit.pointerLink)) {
            edit.pointerLink = '';
        }
        if (edit.dragNode >= 0 && !chainSet.has(edit.dragNode)) {
            edit.dragNode = -1;
        }

        edit.deleteNodes = this.getUniqueNodeSelection(edit.deleteNodes).filter((index) => chainSet.has(index));
        edit.deleteLinks = this.getUniqueLinkSelection(edit.deleteLinks).filter((edgeId) => edgeIdSet.has(edgeId));
        if (edit.deleteNode >= 0 && !chainSet.has(edit.deleteNode)) {
            edit.deleteNode = -1;
        }
        if ((edit.deleteType === 'nodes' && edit.deleteNodes.length === 0) || (edit.deleteType === 'links' && edit.deleteLinks.length === 0)) {
            this.clearEditDeleteState();
        }
    },
    setEditSelection(nodeIds = [], linkIds = []) {
        const edit = this.player.edit;
        edit.selectedNodes = this.getUniqueNodeSelection(nodeIds);
        edit.selectedLinks = this.getUniqueLinkSelection(linkIds);
        this.syncEditSelectionState();
    },
    isEditNodeSelected(index) {
        return this.player.edit.selectedNodes.includes(index);
    },
    isEditLinkSelected(linkId) {
        return this.player.edit.selectedLinks.includes(linkId);
    },
    resetBoxSelectionState() {
        const edit = this.player.edit;
        edit.boxSelectPending = false;
        edit.boxSelecting = false;
        edit.boxStartX = 0;
        edit.boxStartY = 0;
        edit.boxEndX = 0;
        edit.boxEndY = 0;
    },
    getBoxSelectionBounds() {
        const edit = this.player.edit;
        return {
            minX: Math.min(edit.boxStartX, edit.boxEndX),
            maxX: Math.max(edit.boxStartX, edit.boxEndX),
            minY: Math.min(edit.boxStartY, edit.boxEndY),
            maxY: Math.max(edit.boxStartY, edit.boxEndY)
        };
    },
    updateBoxSelection(worldX, worldY) {
        const edit = this.player.edit;
        edit.boxEndX = worldX;
        edit.boxEndY = worldY;
        if (!edit.boxSelecting) {
            return;
        }

        const bounds = this.getBoxSelectionBounds();
        const selectedNodes = this.activeNodes
            .filter((node) => node.displayX >= bounds.minX && node.displayX <= bounds.maxX && node.displayY >= bounds.minY && node.displayY <= bounds.maxY)
            .map((node) => node.index);
        const selectedNodeSet = new Set(selectedNodes);
        const selectedLinks = (this.player.topology?.edges || [])
            .filter((edge) => selectedNodeSet.has(edge.a) || selectedNodeSet.has(edge.b))
            .map((edge) => edge.id);

        this.setEditSelection(selectedNodes, selectedLinks);
    },
    startNodeDelete(index) {
        const edit = this.player.edit;
        edit.deleteType = 'nodes';
        edit.deleteNode = index;
        edit.deleteNodes = this.isEditNodeSelected(index) && edit.selectedNodes.length > 0
            ? [...edit.selectedNodes]
            : [index];
        edit.deleteLinks = [];
        edit.deleteProgress = 0;
        edit.pointerNode = -1;
        edit.pointerLink = '';
        edit.dragNode = -1;
    },
    deleteSelectedLinksOrTarget(linkId) {
        const targetIds = this.isEditLinkSelected(linkId) && this.player.edit.selectedLinks.length > 0
            ? [...this.player.edit.selectedLinks]
            : [linkId];
        const snapshot = this.captureEditSnapshot();
        const removed = this.removeTopologyEdges(targetIds);
        this.clearEditDeleteState();
        if (removed) {
            this.pushEditHistorySnapshot(snapshot);
            this.clearEditSelection();
        }
        return removed;
    },
    deleteCurrentEditSelection() {
        const edit = this.player.edit;
        const nodeIds = [...edit.selectedNodes];
        const linkIds = [...edit.selectedLinks];
        let changed = false;
        const snapshot = this.captureEditSnapshot();

        if (nodeIds.length > 0) {
            changed = this.removeNodesFromTopology(nodeIds) || changed;
        }

        const remainingEdgeIds = new Set((this.player.topology?.edges || []).map((edge) => edge.id));
        const survivingLinks = linkIds.filter((linkId) => remainingEdgeIds.has(linkId));
        if (survivingLinks.length > 0) {
            changed = this.removeTopologyEdges(survivingLinks) || changed;
        }

        this.clearEditDeleteState();
        if (changed) {
            this.pushEditHistorySnapshot(snapshot);
            this.clearEditSelection();
        }
        return changed;
    },
    findActiveNodeAtWorld(x, y, extraRadius = 0) {
        const radius = 28 / this.cameraRig.zoom + extraRadius;
        const radiusSq = radius * radius;
        let best = null;
        let bestDistance = Infinity;

        this.activeNodes.forEach((node) => {
            const dx = node.displayX - x;
            const dy = node.displayY - y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq > radiusSq || distanceSq >= bestDistance) {
                return;
            }
            best = node;
            bestDistance = distanceSq;
        });

        return best;
    },
    findActiveLinkAtWorld(x, y) {
        const threshold = (18 / this.cameraRig.zoom) ** 2;
        let best = null;
        let bestDistance = threshold;

        this.links.forEach((link) => {
            const render = this.getLinkRenderPoints(link);
            const distanceSq = distanceToSegmentSquared(x, y, render.fromX, render.fromY, render.toX, render.toY);
            if (distanceSq >= bestDistance) {
                return;
            }
            best = link;
            bestDistance = distanceSq;
        });

        return best;
    },
    shouldExitEditMode(x, y) {
        return Math.hypot(x - this.player.centroidX, y - this.player.centroidY) > this.getFormationSpan() + 96;
    },
    refreshEditHover() {
        const edit = this.player.edit;
        const pointerWorld = this.getPointerWorld();
        const hoverNode = this.findActiveNodeAtWorld(pointerWorld.x, pointerWorld.y);
        const hoverLink = hoverNode ? null : this.findActiveLinkAtWorld(pointerWorld.x, pointerWorld.y);
        edit.hoverNode = hoverNode ? hoverNode.index : -1;
        edit.hoverLink = hoverLink ? hoverLink.key : '';
    },
    setNodeSlotFromWorld(index, worldX, worldY) {
        const local = rotateLocal(worldX - this.player.centroidX, worldY - this.player.centroidY, -this.player.heading);
        this.player.topology.slots[index] = { x: local.x, y: local.y };
    },
    nudgeCameraZoom(deltaY) {
        if (!this.cameraRig) {
            return;
        }
        const T = window.TUNING || {};
        const wheelNotch = clamp(deltaY / 120, -4, 4);
        if (Math.abs(wheelNotch) < 0.001) {
            return;
        }

        const minZoom = T.cameraMinZoom ?? 0.03;
        const maxZoom = T.cameraMaxZoom ?? 1.12;
        const step = Math.max(0.01, T.cameraWheelStep ?? 0.12);
        const currentZoom = clamp(
            this.cameraRig.manualZoom ?? this.cameraRig.targetZoom ?? this.cameraRig.zoom ?? (T.cameraDefaultZoom ?? 0.92),
            minZoom,
            maxZoom
        );
        const nextZoom = clamp(currentZoom * Math.exp(-wheelNotch * step), minZoom, maxZoom);
        this.cameraRig.manualZoom = nextZoom;
        if (!this.cameraRig.initialized) {
            this.cameraRig.zoom = nextZoom;
            this.cameraRig.targetZoom = nextZoom;
            this.cameraRig.desiredZoom = nextZoom;
        }
    },
    updatePointerDriveState(worldPointer, aim, frameDt) {
        const state = this.getBurstDriveState();
        const T = window.TUNING || {};
        const span = this.getIntentDriveSpan();
        const innerRadius = Math.max(T.driveInnerRadiusMin ?? 76, span * (T.driveInnerRadiusFactor ?? 0.26));
        const middleRadius = Math.max(innerRadius + 1, Math.max(T.driveMiddleRadiusMin ?? 170, span * (T.driveMiddleRadiusFactor ?? 0.72)));
        const outerRadius = Math.max(middleRadius + 1, Math.max(T.driveOuterRadiusMin ?? 280, span * (T.driveOuterRadiusFactor ?? 1.18)));
        const distance = aim.length;
        const pointerSpeed = state.initialized && frameDt > 0
            ? Math.hypot(worldPointer.x - state.lastPointerX, worldPointer.y - state.lastPointerY) / frameDt
            : 0;
        const outwardSpeed = state.initialized && frameDt > 0 ? (distance - state.lastDistance) / frameDt : 0;

        state.lastPointerX = worldPointer.x;
        state.lastPointerY = worldPointer.y;
        state.lastDistance = distance;
        state.initialized = true;
        state.distance = distance;
        state.worldDistance = distance;
        state.pointerSpeed = pointerSpeed;
        state.outwardSpeed = outwardSpeed;
        state.innerRadius = innerRadius;
        state.middleRadius = middleRadius;
        state.outerRadius = outerRadius;
        state.distanceNorm = clamp((distance - innerRadius) / Math.max(1, outerRadius - innerRadius), 0, 1);

        const stableWeight = clamp(1 - distance / Math.max(innerRadius, 1), 0, 1);
        const cruiseProgress = clamp((distance - innerRadius) / Math.max(1, middleRadius - innerRadius), 0, 1);
        const pursuitProgress = clamp((distance - middleRadius) / Math.max(1, outerRadius - middleRadius), 0, 1);
        const huntRange = Math.max(80, Math.max(outerRadius - middleRadius, outerRadius * 0.5));
        const huntWeight = clamp((distance - outerRadius) / huntRange, 0, 1.5);
        const cruiseWeight = distance <= innerRadius
            ? 0
            : distance <= middleRadius
                ? cruiseProgress
                : distance <= outerRadius
                    ? 1 - pursuitProgress
                    : 0;
        const pursuitWeight = distance <= middleRadius
            ? 0
            : distance <= outerRadius
                ? pursuitProgress
                : 1;

        state.rawPhase = distance <= innerRadius
            ? 'stable'
            : distance <= middleRadius
                ? 'cruise'
                : distance <= outerRadius
                    ? 'pursuit'
                    : 'hunt';
        state.stableWeight = stableWeight;
        state.cruiseWeight = cruiseWeight;
        state.pursuitWeight = pursuitWeight;
        state.huntWeight = huntWeight;

        if (!this.isBurstIntentDriveEnabled()) {
            state.phase = state.rawPhase;
            state.pressure = Math.max(0, state.pressure - frameDt * 2.4);
            state.releaseTimer = 0;
            state.breakthrough = 0;
            state.output = damp(state.output, 0, 8.5, frameDt);
            state.aggro = 0;
            state.chaosBoost = 0;
            state.reachBoost = 0;
            state.strengthBoost = 0;
            state.driftBoost = 0;
            state.tempoBoost = 0;
            state.spreadBoost = 0;
            state.forwardBias = 0;
            state.lookAhead = 0;
            state.centerCompression = 0;
            return state;
        }

        const centerCompression = stableWeight;
        const pursuitNorm = Math.max(pursuitProgress, Math.min(1, huntWeight));
        const outwardNorm = clamp(Math.max(0, outwardSpeed) / (T.burstOutwardSpeedThreshold ?? 240), 0, 2);
        const pointerNorm = clamp(pointerSpeed / (T.burstPointerSpeedThreshold ?? 360), 0, 2);
        const pressureGain = Math.pow(pursuitNorm, 1.55) * (T.burstPressureGain ?? 1.6)
            + Math.pow(Math.min(1.4, huntWeight), 1.3) * (T.burstPressureGain ?? 1.6) * 0.45
            + Math.pow(outwardNorm, 2.1) * (T.burstOutwardGain ?? 1.35)
            + Math.pow(Math.max(0, pointerNorm - 0.2), 1.6) * (T.burstPointerSpeedGain ?? 0.72);
        const pressureLoss = (T.burstPressureDecay ?? 1.15) * (
            centerCompression > 0.02
                ? 1.6
                : state.rawPhase === 'cruise'
                    ? 0.94
                    : 0.68
        );

        state.pressure = clamp(
            state.pressure + (pressureGain - pressureLoss - centerCompression * 1.15) * frameDt,
            0,
            1.8
        );
        state.releaseTimer = Math.max(0, state.releaseTimer - frameDt);
        state.breakthrough = Math.max(0, state.breakthrough - frameDt * 1.8);

        const releaseThreshold = T.burstReleaseThreshold ?? 1.0;
        const canBreak = distance > middleRadius * 1.02
            && pursuitNorm > 0.08
            && (outwardNorm > 0.35 || pointerNorm > 0.45);
        if (state.releaseTimer <= 0 && state.pressure >= releaseThreshold && canBreak) {
            state.releaseTimer = T.burstReleaseDuration ?? 0.42;
            state.breakthrough = 1;
            state.pressure = Math.max(0.35, state.pressure * 0.45);
        }

        const releaseNorm = state.releaseTimer > 0
            ? clamp(state.releaseTimer / Math.max(0.0001, T.burstReleaseDuration ?? 0.42), 0, 1)
            : 0;
        const pursuitAggro = Math.pow(Math.max(pursuitProgress, huntWeight * 0.92), 0.92) * 0.62
            + Math.pow(Math.max(0, cruiseProgress - 0.15), 1.1) * 0.28
            + Math.min(0.35, state.pressure * 0.22);
        const burstAggro = releaseNorm > 0
            ? Math.pow(releaseNorm, 0.42) * (0.75 + state.breakthrough * 0.25)
            : 0;
        const targetOutput = clamp(Math.max(pursuitAggro, burstAggro) - centerCompression * 0.24, 0, 1);

        state.output = damp(state.output, targetOutput, releaseNorm > 0 ? 12 : 6.5, frameDt);
        state.phase = releaseNorm > 0.02
            ? 'burst'
            : state.rawPhase;
        state.aggro = clamp(state.output * (T.burstAggroBoost ?? 0.72), 0, 1);
        state.chaosBoost = state.output * (T.burstChaosBoost ?? 0.42);
        state.reachBoost = clamp(state.output * (T.burstReachBoost ?? 0.58) + burstAggro * 0.35, 0, 2);
        state.strengthBoost = clamp(state.output * (T.burstStrengthBoost ?? 0.78) + burstAggro * 0.28, 0, 2);
        state.driftBoost = state.output * (T.burstDriftBoost ?? 0.48);
        state.tempoBoost = clamp(state.output * (T.burstTempoBoost ?? 0.34) + burstAggro * 0.32, 0, 1);
        state.spreadBoost = clamp(state.output * (T.burstSpreadBoost ?? 0.28) + burstAggro * 0.22, 0, 1.4);
        state.forwardBias = clamp(
            pursuitProgress * 0.42 + Math.min(1, huntWeight) * 0.32 + burstAggro * 0.65,
            0,
            1.2
        );
        state.lookAhead = clamp(state.output * (T.burstLookAhead ?? 0.22) + burstAggro * 0.18, 0, 1);
        state.centerCompression = centerCompression;
        return state;
    },
    updateClusterVolumeDrive(frameDt, driveState) {
        const state = this.getClusterVolumeState();
        const T = window.TUNING || {};
        const neutral = clamp(T.clusterVolumeNeutral ?? 0.36, 0.05, 0.95);
        const response = T.clusterVolumeResponse ?? 6.5;
        const stableWeight = clamp(driveState?.stableWeight ?? 0, 0, 1);
        const cruiseWeight = clamp(driveState?.cruiseWeight ?? 0, 0, 1);
        const pursuitWeight = clamp(driveState?.pursuitWeight ?? 0, 0, 1);
        const huntWeight = clamp(driveState?.huntWeight ?? 0, 0, 1.5);

        state.stableWeight = stableWeight;
        state.cruiseWeight = cruiseWeight;
        state.pursuitWeight = pursuitWeight;
        state.huntWeight = huntWeight;

        if (!this.isClusterVolumeControlEnabled()) {
            state.target = neutral;
            state.effective = damp(state.effective, neutral, response, frameDt);
            state.normalized = 0;
            state.expansion = 0;
            state.compression = 0;
            state.radialScale = 1;
            state.forwardScale = 1;
            state.lateralScale = 1;
            state.restScale = 1;
            state.repulsionScale = 1;
            state.latticePull = 0;
            state.corePullScale = 1;
            return state;
        }

        const burstSpread = clamp(driveState?.spreadBoost ?? 0, 0, 1.4);
        const zoneTarget = clamp(
            neutral
            - stableWeight * (T.clusterVolumeInnerContract ?? 0.12)
            + cruiseWeight * (T.clusterVolumeCruiseLift ?? 0.06)
            + pursuitWeight * (T.clusterVolumePursuitLift ?? 0.16)
            + Math.min(1, huntWeight) * (T.clusterVolumeHuntLift ?? 0.28)
            + burstSpread * (T.clusterVolumeBurstAssist ?? 0.28),
            0,
            1
        );
        state.target = zoneTarget;
        state.effective = damp(state.effective, zoneTarget, response, frameDt);

        const effective = clamp(state.effective, 0, 1);
        const normalized = effective >= neutral
            ? (effective - neutral) / Math.max(0.0001, 1 - neutral)
            : (effective - neutral) / Math.max(0.0001, neutral);
        const expansion = Math.max(0, normalized);
        const compression = Math.max(0, -normalized);
        const radialScale = Math.max(0.35, 1 + expansion * (T.clusterVolumeExpandScale ?? 0.72) - compression * (T.clusterVolumeCompressScale ?? 0.32));

        state.effective = effective;
        state.normalized = normalized;
        state.expansion = expansion;
        state.compression = compression;
        state.radialScale = radialScale;
        state.forwardScale = radialScale * (
            1
            + expansion * (T.clusterVolumeForwardStretch ?? 0.22)
            + pursuitWeight * 0.08
            + Math.min(1, huntWeight) * 0.18
            + clamp(driveState?.forwardBias ?? 0, 0, 1.2) * 0.18
        );
        state.lateralScale = radialScale * (
            1
            + expansion * (T.clusterVolumeLateralBloom ?? 0.38)
            + Math.min(1, huntWeight) * 0.1
            + burstSpread * 0.12
        );
        state.restScale = 1 + expansion * (T.clusterVolumeRestScale ?? 0.16) - compression * Math.min(0.25, (T.clusterVolumeCompressScale ?? 0.32) * 0.5);
        state.repulsionScale = Math.max(0.55, 1 + expansion * (T.clusterVolumeRepulsionBoost ?? 0.45) - compression * (T.clusterVolumeRepulsionCompress ?? 0.2));
        state.latticePull = (T.clusterVolumeLatticePull ?? 18) * (expansion * 0.9 + compression * 0.55 + pursuitWeight * 0.16 + burstSpread * 0.4);
        state.corePullScale = clamp(1 - expansion * (T.clusterVolumeCorePullRelax ?? 0.55) + stableWeight * 0.12, 0.2, 1.6);
        return state;
    },
    readIntent(frameDt = 1 / 60) {
        const allowKeyboardDrive = this.isDebugToolsEnabled() && !this.player.edit.active;
        const moveX = allowKeyboardDrive ? (this.keys.right.isDown ? 1 : 0) - (this.keys.left.isDown ? 1 : 0) : 0;
        const moveY = allowKeyboardDrive ? (this.keys.down.isDown ? 1 : 0) - (this.keys.up.isDown ? 1 : 0) : 0;
        const move = normalize(moveX, moveY);

        const worldPointer = this.screenToWorld(this.input.activePointer.x, this.input.activePointer.y);
        const aim = normalize(worldPointer.x - this.player.centroidX, worldPointer.y - this.player.centroidY, Math.cos(this.player.heading), Math.sin(this.player.heading));
        const T = window.TUNING || {};
        const heading = vectorFromAngle(this.player.heading);
        const driveState = this.updatePointerDriveState(worldPointer, aim, Math.max(frameDt, 0.0001));
        const volumeState = this.updateClusterVolumeDrive(Math.max(frameDt, 0.0001), driveState);
        const moveWeight = this.keys.shift.isDown ? (T.shiftMoveWeight ?? 0.32) : (T.normalMoveWeight ?? 0.58);
        const aimWeight = 1 - moveWeight;
        const legacyFlow = normalize(move.x * moveWeight + aim.x * aimWeight, move.y * moveWeight + aim.y * aimWeight, aim.x, aim.y);
        const totalAggro = clamp(driveState.aggro, 0, 1);
        const aggressiveAimWeight = clamp(lerp(aimWeight, 0.78, totalAggro) - driveState.centerCompression * 0.16, 0.08, 0.95);
        const aggressiveMoveWeight = 1 - aggressiveAimWeight;
        const aggressiveFlow = this.isBurstIntentDriveEnabled()
            ? normalize(
                move.x * aggressiveMoveWeight + aim.x * aggressiveAimWeight + heading.x * driveState.centerCompression * 0.18,
                move.y * aggressiveMoveWeight + aim.y * aggressiveAimWeight + heading.y * driveState.centerCompression * 0.18,
                legacyFlow.x,
                legacyFlow.y
            )
            : legacyFlow;
        const flow = aggressiveFlow;

        this.intent.moveX = move.x;
        this.intent.moveY = move.y;
        this.intent.moveLength = move.length;
        this.intent.aimX = aim.x;
        this.intent.aimY = aim.y;
        this.intent.aimLength = aim.length;
        this.intent.flowX = flow.x;
        this.intent.flowY = flow.y;
        this.intent.legacyFlowX = legacyFlow.x;
        this.intent.legacyFlowY = legacyFlow.y;
        this.intent.aggressiveFlowX = aggressiveFlow.x;
        this.intent.aggressiveFlowY = aggressiveFlow.y;
        this.intent.baseFlowX = aggressiveFlow.x;
        this.intent.baseFlowY = aggressiveFlow.y;
        this.intent.inverseFlowX = aggressiveFlow.x;
        this.intent.inverseFlowY = aggressiveFlow.y;
        this.intent.clusterAggro = 0;
        this.intent.pointerX = worldPointer.x;
        this.intent.pointerY = worldPointer.y;
        this.intent.pointerDistance = aim.length;
        this.intent.pointerWorldDistance = driveState.worldDistance;
        this.intent.pointerDrivePhase = driveState.phase;
        this.intent.pointerDriveInnerRadius = driveState.innerRadius;
        this.intent.pointerDriveMiddleRadius = driveState.middleRadius;
        this.intent.pointerDriveOuterRadius = driveState.outerRadius;
        this.intent.pointerDriveStableWeight = driveState.stableWeight;
        this.intent.pointerDriveCruiseWeight = driveState.cruiseWeight;
        this.intent.pointerDrivePursuitWeight = driveState.pursuitWeight;
        this.intent.pointerDriveHuntWeight = driveState.huntWeight;
        this.intent.burstPhase = driveState.phase;
        this.intent.burstAggro = driveState.aggro;
        this.intent.burstChaos = driveState.chaosBoost;
        this.intent.burstReachBoost = driveState.reachBoost;
        this.intent.burstStrengthBoost = driveState.strengthBoost;
        this.intent.burstDriftBoost = driveState.driftBoost;
        this.intent.burstTempo = driveState.tempoBoost;
        this.intent.burstSpreadBoost = driveState.spreadBoost;
        this.intent.burstForwardBias = driveState.forwardBias;
        this.intent.burstLookAhead = driveState.lookAhead;
        this.intent.burstPressure = driveState.pressure;
        this.intent.burstPointerSpeed = driveState.pointerSpeed;
        this.intent.burstOutwardSpeed = driveState.outwardSpeed;
        this.intent.centerCompression = driveState.centerCompression;
        this.intent.clusterVolume = volumeState.normalized;
        this.intent.clusterVolumeScale = volumeState.radialScale;
        this.intent.clusterVolumeForwardScale = volumeState.forwardScale;
        this.intent.clusterVolumeLateralScale = volumeState.lateralScale;
    },
    handleModeInputs() {
        if (!this.player.edit.active) {
            this.timeScaleFactor = 1;
            return;
        }

        if (this.keys.ctrl.isDown && Phaser.Input.Keyboard.JustDown(this.keys.undo)) {
            this.undoLastEditAction();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.deleteAction)) {
            this.deleteCurrentEditSelection();
        }

        this.timeScaleFactor = this.player.edit.deleteType === 'nodes' && this.player.edit.deleteNodes.length > 0 ? 0.05 : 0.08;
        this.refreshEditHover();
    },
    handlePointerDown(pointer) {
        if (this.menuMode) {
            return;
        }

        if (this.player.dead) {
            this.resetSimulation(true);
            return;
        }

        const pointerWorld = this.screenToWorld(pointer.x, pointer.y);
        const hitNode = this.findActiveNodeAtWorld(pointerWorld.x, pointerWorld.y);
        const hitLink = hitNode ? null : this.findActiveLinkAtWorld(pointerWorld.x, pointerWorld.y);
        const edit = this.player.edit;

        if (!edit.active) {
            if (!this.isDebugToolsEnabled()) {
                return;
            }
            if (hitNode || hitLink) {
                this.enterEditMode();
            }
            return;
        }

        if (pointer.button === 2) {
            if (hitNode) {
                this.startNodeDelete(hitNode.index);
                return;
            }
            if (hitLink) {
                this.deleteSelectedLinksOrTarget(hitLink.id);
                return;
            }
            if (this.shouldExitEditMode(pointerWorld.x, pointerWorld.y)) {
                this.exitEditMode();
            }
            return;
        }

        if (pointer.button !== 0) {
            return;
        }

        this.clearEditDeleteState();

        if (hitNode) {
            edit.pointerNode = hitNode.index;
            edit.pointerLink = '';
            edit.dragNode = -1;
            edit.dragStartX = pointerWorld.x;
            edit.dragStartY = pointerWorld.y;
            edit.dragOffsetX = pointerWorld.x - hitNode.x;
            edit.dragOffsetY = pointerWorld.y - hitNode.y;
            edit.dragWorldX = hitNode.x;
            edit.dragWorldY = hitNode.y;
            this.resetBoxSelectionState();
            return;
        }

        if (hitLink) {
            edit.pointerNode = -1;
            edit.pointerLink = hitLink.id;
            edit.dragNode = -1;
            edit.dragStartX = pointerWorld.x;
            edit.dragStartY = pointerWorld.y;
            this.resetBoxSelectionState();
            return;
        }

        if (this.shouldExitEditMode(pointerWorld.x, pointerWorld.y)) {
            this.exitEditMode();
            return;
        }

        edit.pointerNode = -1;
        edit.pointerLink = '';
        edit.dragNode = -1;
        edit.dragStartX = pointerWorld.x;
        edit.dragStartY = pointerWorld.y;
        edit.boxSelectPending = true;
        edit.boxSelecting = false;
        edit.boxStartX = pointerWorld.x;
        edit.boxStartY = pointerWorld.y;
        edit.boxEndX = pointerWorld.x;
        edit.boxEndY = pointerWorld.y;
    },
    handlePointerUp(pointer) {
        if (this.menuMode) {
            return;
        }

        if (!this.player.edit.active) {
            return;
        }

        if (pointer.button === 2) {
            this.discardPendingEditSnapshot();
            this.clearEditDeleteState();
            this.player.edit.dragNode = -1;
            this.player.edit.pointerNode = -1;
            this.player.edit.pointerLink = '';
            return;
        }

        if (pointer.button !== 0) {
            return;
        }

        const edit = this.player.edit;
        const pointerWorld = this.screenToWorld(pointer.x, pointer.y);
        const pointerNode = edit.pointerNode;
        const pointerLink = edit.pointerLink;
        const draggedNode = edit.dragNode;
        const wasBoxSelecting = edit.boxSelecting;
        const boxPending = edit.boxSelectPending;

        edit.pointerNode = -1;
        edit.pointerLink = '';
        edit.dragNode = -1;
        this.resetBoxSelectionState();

        if (draggedNode >= 0) {
            this.commitPendingEditSnapshot();
            return;
        }

        if (wasBoxSelecting) {
            return;
        }

        if (pointerNode >= 0) {
            if (edit.selectedNode >= 0 && edit.selectedNode !== pointerNode && edit.selectedNodes.length === 1 && edit.selectedLinks.length === 0) {
                const sourceNode = edit.selectedNode;
                const snapshot = this.captureEditSnapshot();
                if (this.addTopologyEdge(sourceNode, pointerNode, 'support')) {
                    this.rebuildFormation();
                    this.pushEditHistorySnapshot(snapshot);
                }
                this.clearEditSelection();
                return;
            }

            if (edit.selectedNodes.length === 1 && edit.selectedNodes[0] === pointerNode && edit.selectedLinks.length === 0) {
                this.clearEditSelection();
            } else {
                this.setEditSelection([pointerNode], []);
            }
            return;
        }

        if (pointerLink) {
            if (edit.selectedNodes.length === 0 && edit.selectedLinks.length === 1 && edit.selectedLinks[0] === pointerLink) {
                this.clearEditSelection();
            } else {
                this.setEditSelection([], [pointerLink]);
            }
            return;
        }

        if (boxPending) {
            this.clearEditSelection();
            return;
        }

        if (this.shouldExitEditMode(pointerWorld.x, pointerWorld.y)) {
            this.exitEditMode();
        }
    },
    updateEditMode(frameDt) {
        const edit = this.player.edit;
        edit.ambience = damp(edit.ambience, edit.active ? 1 : 0, 8.5, frameDt);

        if (!edit.active) {
            return;
        }

        this.refreshEditHover();
        const pointer = this.input.activePointer;
        const pointerWorld = this.getPointerWorld();

        if (pointer.leftButtonDown() && edit.boxSelectPending) {
            const dragThreshold = 16 / this.cameraRig.zoom;
            const dragDistance = Math.hypot(pointerWorld.x - edit.dragStartX, pointerWorld.y - edit.dragStartY);
            if (!edit.boxSelecting && dragDistance >= dragThreshold) {
                edit.boxSelecting = true;
            }
            this.updateBoxSelection(pointerWorld.x, pointerWorld.y);
        }

        if (pointer.leftButtonDown() && edit.pointerNode >= 0) {
            const dragThreshold = 16 / this.cameraRig.zoom;
            const dragDistance = Math.hypot(pointerWorld.x - edit.dragStartX, pointerWorld.y - edit.dragStartY);
            if (edit.dragNode < 0 && dragDistance >= dragThreshold) {
                this.beginPendingEditSnapshot();
                edit.dragNode = edit.pointerNode;
                this.setEditSelection([edit.dragNode], []);
                this.resetBoxSelectionState();
            }
        }

        if (pointer.leftButtonDown() && edit.dragNode >= 0) {
            edit.dragWorldX = pointerWorld.x - edit.dragOffsetX;
            edit.dragWorldY = pointerWorld.y - edit.dragOffsetY;
            this.setNodeSlotFromWorld(edit.dragNode, edit.dragWorldX, edit.dragWorldY);

            const dragged = this.activeNodes.find((node) => node.index === edit.dragNode);
            if (dragged) {
                dragged.x = edit.dragWorldX;
                dragged.y = edit.dragWorldY;
                dragged.displayX = edit.dragWorldX;
                dragged.displayY = edit.dragWorldY;
                dragged.vx = 0;
                dragged.vy = 0;
            }
        }

        if (edit.deleteType === 'nodes' && edit.deleteNodes.length > 0) {
            const hoveredNode = this.findActiveNodeAtWorld(pointerWorld.x, pointerWorld.y, 8);
            const deleteSet = new Set(edit.deleteNodes);
            const stillHovering = hoveredNode && deleteSet.has(hoveredNode.index) && pointer.rightButtonDown();

            if (!stillHovering) {
                this.clearEditDeleteState();
                edit.dragNode = -1;
                return;
            }

            edit.deleteProgress = clamp(edit.deleteProgress + frameDt / PARTIAL_MESH_RULES.deleteHoldDuration, 0, 1);
            if (edit.deleteProgress >= 1) {
                const snapshot = this.captureEditSnapshot();
                const removed = this.removeNodesFromTopology(edit.deleteNodes);
                this.clearEditDeleteState();
                edit.dragNode = -1;
                if (removed) {
                    this.pushEditHistorySnapshot(snapshot);
                    this.clearEditSelection();
                }
            }
        }
    },
    addDebugNode(options = {}) {
        const T = window.TUNING || {};
        const maxNodes = T.maxNodeCount ?? 96;
        if (this.poolNodes.length >= maxNodes) {
            return false;
        }

        const expansion = this.getExpansionDirection();
        const entries = this.getActiveTopologyEntries();
        const anchor = this.pickExpansionAnchor(entries, expansion.local);
        const template = options.template || Phaser.Utils.Array.GetRandom(NODE_LIBRARY);
        const index = this.poolNodes.length;
        this.poolNodes.push({
            ...template,
            index,
            id: `${template.id}-${index}`
        });

        const anchorDrift = normalize(anchor.x, anchor.y, expansion.local.x, expansion.local.y);
        const lead = normalize(
            expansion.local.x * 0.76 + anchorDrift.x * 0.24,
            expansion.local.y * 0.76 + anchorDrift.y * 0.24,
            expansion.local.x,
            expansion.local.y
        );
        const side = { x: -lead.y, y: lead.x };
        const sideSign = Math.abs(expansion.local.y) < 0.16 ? (index % 2 === 0 ? 1 : -1) : Math.sign(expansion.local.y);
        const seedSlot = {
            x: anchor.x + lead.x * (PARTIAL_MESH_RULES.slotSpacing + 12),
            y: anchor.y + lead.y * (PARTIAL_MESH_RULES.slotSpacing + 12)
        };
        const candidateSlot = {
            x: seedSlot.x + side.x * sideSign * 18,
            y: seedSlot.y + side.y * sideSign * 18
        };
        const slot = this.relaxExpansionSlot(candidateSlot, entries, expansion.local);
        const insertIndex = this.findBestPulseInsertionIndex(slot, anchor.index);
        const neighborIndices = this.pickExpansionNeighbors(slot, entries, anchor.index);

        this.player.chain.splice(insertIndex, 0, index);
        this.player.topology.slots[index] = slot;
        neighborIndices.forEach((neighborIndex, neighborOrder) => {
            this.addTopologyEdge(index, neighborIndex, neighborOrder === 0 ? 'spine' : 'support');
        });
        if (!options.silent) {
            this.player.tempoBoost = 0;
            this.player.stability = 0.35;
            this.player.turnAssist = 0;
        }
        this.rebuildFormation();
        this.resetPulseFlow();
        return true;
    },
};
