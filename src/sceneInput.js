
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
            poolNodeStates: cloneData((this.poolNodes || []).map((node) => ({
                index: node.index,
                experimentalColorState: node.experimentalColorState === 'red' ? 'red' : 'blue',
                experimentalRedGroupId: Number(node.experimentalRedGroupId) || 0
            }))),
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
                attackDamage: node.attackDamage
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
        const nodeStateByIndex = new Map(
            (Array.isArray(snapshot.poolNodeStates) ? snapshot.poolNodeStates : []).map((entry) => [entry.index, entry])
        );
        (this.poolNodes || []).forEach((node) => {
            const savedState = nodeStateByIndex.get(node.index);
            node.experimentalColorState = savedState?.experimentalColorState === 'red' ? 'red' : 'blue';
            node.experimentalRedGroupId = Number(savedState?.experimentalRedGroupId) || 0;
        });
        this.syncExperimentalRedGroupUid();
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
        this.syncExperimentalRedTopology(false);
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
    getExperimentalPaintTargets(index) {
        const T = window.TUNING || {};
        if ((T.redBatchPaintSelected ?? true) && this.isEditNodeSelected(index) && this.player.edit.selectedNodes.length > 0) {
            return [...this.player.edit.selectedNodes];
        }
        return [index];
    },
    applyExperimentalPaintToNodes(nodeIds, clear = false) {
        const targets = [...new Set((Array.isArray(nodeIds) ? nodeIds : []).filter((index) => this.player.chain.includes(index)))];
        if (targets.length === 0) {
            return false;
        }

        const snapshot = this.captureEditSnapshot();
        const changed = clear ? this.clearExperimentalNodes(targets) : this.paintExperimentalNodesRed(targets);
        if (!changed) {
            return false;
        }

        if (!clear) {
            const groupId = this.getExperimentalRedGroupId(targets[0]);
            if (groupId > 0) {
                this.bakeExperimentalGroupShape(groupId, -1, 1);
            }
        }

        this.syncExperimentalRedTopology();
        this.pushEditHistorySnapshot(snapshot);
        this.setEditSelection(targets, []);
        this.clearEditDeleteState();
        return true;
    },
    paintSelectedNodesRed() {
        return this.applyExperimentalPaintToNodes(this.player.edit.selectedNodes, false);
    },
    clearSelectedExperimentalNodes() {
        return this.applyExperimentalPaintToNodes(this.player.edit.selectedNodes, true);
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
    readIntent() {
        const moveX = this.player.edit.active ? 0 : (this.keys.right.isDown ? 1 : 0) - (this.keys.left.isDown ? 1 : 0);
        const moveY = this.player.edit.active ? 0 : (this.keys.down.isDown ? 1 : 0) - (this.keys.up.isDown ? 1 : 0);
        const move = normalize(moveX, moveY);

        const worldPointer = this.screenToWorld(this.input.activePointer.x, this.input.activePointer.y);
        const aim = normalize(worldPointer.x - this.player.centroidX, worldPointer.y - this.player.centroidY, Math.cos(this.player.heading), Math.sin(this.player.heading));
        const T = window.TUNING || {};
        const moveWeight = this.keys.shift.isDown ? (T.shiftMoveWeight ?? 0.32) : (T.normalMoveWeight ?? 0.58);
        const aimWeight = 1 - moveWeight;
        const legacyFlow = normalize(move.x * moveWeight + aim.x * aimWeight, move.y * moveWeight + aim.y * aimWeight, aim.x, aim.y);
        const upgradedIntentEnabled = this.isUpgradedIntentDriveEnabled();
        const clusterAggro = upgradedIntentEnabled ? this.getIntentClusterAggression() : 0;
        const aggressiveAimWeight = lerp(aimWeight, 0.78, clusterAggro);
        const aggressiveMoveWeight = 1 - aggressiveAimWeight;
        const aggressiveFlow = upgradedIntentEnabled
            ? normalize(
                move.x * aggressiveMoveWeight + aim.x * aggressiveAimWeight,
                move.y * aggressiveMoveWeight + aim.y * aggressiveAimWeight,
                legacyFlow.x,
                legacyFlow.y
            )
            : legacyFlow;
        const splitPolarityIntent = this.isSplitPolarityIntentEnabled();
        const heading = vectorFromAngle(this.player.heading);
        const baseFlow = splitPolarityIntent
            ? normalize(
                aim.x * 0.92 + aggressiveFlow.x * 0.28,
                aim.y * 0.92 + aggressiveFlow.y * 0.28,
                aggressiveFlow.x,
                aggressiveFlow.y
            )
            : aggressiveFlow;
        const inverseFlow = splitPolarityIntent
            ? move.length > 0.01
                ? normalize(
                    move.x * 0.96 + aggressiveFlow.x * 0.34,
                    move.y * 0.96 + aggressiveFlow.y * 0.34,
                    aggressiveFlow.x,
                    aggressiveFlow.y
                )
                : normalize(
                    aggressiveFlow.x * 0.72 + heading.x * 0.28,
                    aggressiveFlow.y * 0.72 + heading.y * 0.28,
                    aggressiveFlow.x,
                    aggressiveFlow.y
                )
            : aggressiveFlow;
        const flow = upgradedIntentEnabled ? aggressiveFlow : legacyFlow;

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
        this.intent.baseFlowX = baseFlow.x;
        this.intent.baseFlowY = baseFlow.y;
        this.intent.inverseFlowX = inverseFlow.x;
        this.intent.inverseFlowY = inverseFlow.y;
        this.intent.clusterAggro = clusterAggro;
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
            if (hitNode || hitLink) {
                this.enterEditMode();
                if (pointer.button === 2 && hitNode && this.isExperimentalRedTopologyEnabled() && (window.TUNING.redRightClickPaintNodes ?? true)) {
                    const clearMode = !!pointer.event?.altKey;
                    this.applyExperimentalPaintToNodes(this.getExperimentalPaintTargets(hitNode.index), clearMode);
                }
            }
            return;
        }

        if (pointer.button === 2) {
            if (hitNode && this.isExperimentalRedTopologyEnabled() && (window.TUNING.redRightClickPaintNodes ?? true)) {
                const clearMode = !!pointer.event?.altKey;
                this.applyExperimentalPaintToNodes(this.getExperimentalPaintTargets(hitNode.index), clearMode);
                return;
            }
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
                if (this.isCompoundTopologyEdgesEnabled()) {
                    this.setEditSelection([sourceNode], []);
                } else {
                    this.clearEditSelection();
                }
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
    addDebugNode() {
        const T = window.TUNING || {};
        const maxNodes = T.maxNodeCount ?? 96;
        if (this.poolNodes.length >= maxNodes) {
            return;
        }

        const expansion = this.getExpansionDirection();
        const entries = this.getActiveTopologyEntries();
        const anchor = this.pickExpansionAnchor(entries, expansion.local);
        const template = Phaser.Utils.Array.GetRandom(NODE_LIBRARY);
        const index = this.poolNodes.length;
        this.poolNodes.push({
            ...template,
            index,
            id: `${template.id}-${index}`,
            experimentalColorState: 'blue',
            experimentalRedGroupId: 0
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
        this.player.energy = 0;
        this.player.guard = 0;
        this.player.overload = 0;
        this.player.echo = 0;
        this.player.tempoBoost = 0;
        this.player.stability = 0.35;
        this.player.turnAssist = 0;
        this.rebuildFormation();
        this.resetPulseFlow();
    },
};
