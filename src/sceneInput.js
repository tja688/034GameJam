

const SceneInputMixin = {
    getPointerWorld() {
        return this.screenToWorld(this.input.activePointer.x, this.input.activePointer.y);
    },
    enterEditMode() {
        const edit = this.player.edit;
        edit.active = true;
        edit.hoverNode = -1;
        edit.hoverLink = '';
        edit.selectedNode = -1;
        edit.pointerNode = -1;
        edit.dragNode = -1;
        edit.deleteNode = -1;
        edit.deleteProgress = 0;
    },
    exitEditMode() {
        const edit = this.player.edit;
        edit.active = false;
        edit.hoverNode = -1;
        edit.hoverLink = '';
        edit.selectedNode = -1;
        edit.pointerNode = -1;
        edit.dragNode = -1;
        edit.deleteNode = -1;
        edit.deleteProgress = 0;
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
        const flow = normalize(move.x * moveWeight + aim.x * aimWeight, move.y * moveWeight + aim.y * aimWeight, aim.x, aim.y);

        this.intent.moveX = move.x;
        this.intent.moveY = move.y;
        this.intent.moveLength = move.length;
        this.intent.aimX = aim.x;
        this.intent.aimY = aim.y;
        this.intent.aimLength = aim.length;
        this.intent.flowX = flow.x;
        this.intent.flowY = flow.y;
    },
    handleModeInputs() {
        if (!this.player.edit.active) {
            this.timeScaleFactor = 1;
            return;
        }

        this.timeScaleFactor = this.player.edit.deleteNode >= 0 ? 0.05 : 0.08;
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

        if (!this.player.edit.active) {
            if (hitNode || hitLink) {
                this.enterEditMode();
            }
            return;
        }

        if (pointer.button === 2) {
            if (hitNode) {
                this.player.edit.deleteNode = hitNode.index;
                this.player.edit.deleteProgress = 0;
                this.player.edit.selectedNode = -1;
                this.player.edit.pointerNode = -1;
                this.player.edit.dragNode = hitNode.index;
                this.player.edit.dragWorldX = hitNode.x;
                this.player.edit.dragWorldY = hitNode.y;
            } else if (hitLink) {
                if (this.removeTopologyEdge(hitLink.id)) {
                    this.rebuildFormation();
                }
            }
            return;
        }

        if (pointer.button !== 0) {
            return;
        }

        if (!hitNode) {
            if (this.shouldExitEditMode(pointerWorld.x, pointerWorld.y)) {
                this.exitEditMode();
            } else {
                this.player.edit.selectedNode = -1;
            }
            return;
        }

        this.player.edit.pointerNode = hitNode.index;
        this.player.edit.dragNode = -1;
        this.player.edit.dragStartX = pointerWorld.x;
        this.player.edit.dragStartY = pointerWorld.y;
        this.player.edit.dragOffsetX = pointerWorld.x - hitNode.x;
        this.player.edit.dragOffsetY = pointerWorld.y - hitNode.y;
        this.player.edit.dragWorldX = hitNode.x;
        this.player.edit.dragWorldY = hitNode.y;
    },
    handlePointerUp(pointer) {
        if (this.menuMode) {
            return;
        }

        if (!this.player.edit.active) {
            return;
        }

        if (pointer.button === 2) {
            this.player.edit.deleteNode = -1;
            this.player.edit.deleteProgress = 0;
            this.player.edit.dragNode = -1;
            this.player.edit.pointerNode = -1;
            return;
        }

        if (pointer.button !== 0) {
            return;
        }

        const edit = this.player.edit;
        const pointerWorld = this.screenToWorld(pointer.x, pointer.y);
        const pointerNode = edit.pointerNode;
        const draggedNode = edit.dragNode;

        edit.pointerNode = -1;
        edit.dragNode = -1;

        if (draggedNode >= 0) {
            return;
        }

        if (pointerNode >= 0) {
            if (edit.selectedNode >= 0 && edit.selectedNode !== pointerNode) {
                const sourceNode = edit.selectedNode;
                if (this.addTopologyEdge(sourceNode, pointerNode, 'support')) {
                    this.rebuildFormation();
                }
                edit.selectedNode = this.isCompoundTopologyEdgesEnabled() ? sourceNode : -1;
                return;
            }

            edit.selectedNode = edit.selectedNode === pointerNode ? -1 : pointerNode;
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

        if (pointer.leftButtonDown() && edit.pointerNode >= 0) {
            const dragThreshold = 16 / this.cameraRig.zoom;
            const dragDistance = Math.hypot(pointerWorld.x - edit.dragStartX, pointerWorld.y - edit.dragStartY);
            if (edit.dragNode < 0 && dragDistance >= dragThreshold) {
                edit.dragNode = edit.pointerNode;
                edit.selectedNode = -1;
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

        if (edit.deleteNode >= 0) {
            const deleteTarget = this.activeNodes.find((node) => node.index === edit.deleteNode);
            const stillHovering = deleteTarget
                && this.findActiveNodeAtWorld(pointerWorld.x, pointerWorld.y, 8)?.index === edit.deleteNode
                && pointer.rightButtonDown();

            if (!stillHovering) {
                edit.deleteNode = -1;
                edit.deleteProgress = 0;
                edit.dragNode = -1;
                return;
            }

            edit.deleteProgress = clamp(edit.deleteProgress + frameDt / PARTIAL_MESH_RULES.deleteHoldDuration, 0, 1);
            if (edit.deleteProgress >= 1) {
                this.removeNodeFromTopology(edit.deleteNode);
                edit.deleteNode = -1;
                edit.deleteProgress = 0;
                edit.dragNode = -1;
            }
        }
    },
    addDebugNode() {
        if (this.poolNodes.length >= 96) {
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
