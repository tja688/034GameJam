function makeEdgeKey(a, b) {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function createTopologyEdgeId() {
    const id = TOPOLOGY_EDGE_UID;
    TOPOLOGY_EDGE_UID += 1;
    return `edge-${id}`;
}

const SceneTopologyMixin = {
    createTopologyEdgeDescriptor(a, b, kind = 'support', id = createTopologyEdgeId()) {
        return { id, a, b, kind };
    },
    isCompoundTopologyEdgesEnabled() {
        const T = window.TUNING || {};
        return T.enableCompoundTopologyEdges ?? false;
    },
    collapseCompoundTopologyEdges(edges) {
        const seenPairs = new Set();
        return edges.filter((edge) => {
            const pairKey = makeEdgeKey(edge.a, edge.b);
            if (seenPairs.has(pairKey)) {
                return false;
            }
            seenPairs.add(pairKey);
            return true;
        });
    },
    normalizeTopologyEdges(edges) {
        const normalized = (Array.isArray(edges) ? edges : [])
            .filter((edge) => Number.isInteger(edge?.a) && Number.isInteger(edge?.b) && edge.a !== edge.b)
            .map((edge) => this.createTopologyEdgeDescriptor(edge.a, edge.b, edge.kind || 'support', edge.id || createTopologyEdgeId()));
        return this.isCompoundTopologyEdgesEnabled()
            ? normalized
            : this.collapseCompoundTopologyEdges(normalized);
    },
    isSunflowerTopologyEnabled() {
        const T = window.TUNING || {};
        return T.enableSunflowerTopologySlots ?? true;
    },
    getSunflowerTopologySlot(order) {
        if (order <= 0) {
            return { x: 0, y: 0 };
        }
        const T = window.TUNING || {};
        const spacing = T.slotSpacing ?? PARTIAL_MESH_RULES.slotSpacing;
        const yComp = T.slotYCompression ?? 0.84;
        const rScale = T.slotRadiusScale ?? 0.94;
        const radius = spacing * Math.sqrt(order) * rScale;
        const angle = order * GOLDEN_ANGLE;
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius * yComp
        };
    },
    getLinearTopologySlot(order) {
        if (order <= 0) {
            return { x: 0, y: 0 };
        }
        const T = window.TUNING || {};
        const spacing = T.slotSpacing ?? PARTIAL_MESH_RULES.slotSpacing;
        const forwardStep = Math.max(T.forwardStep ?? PARTIAL_MESH_RULES.forwardStep, spacing * 0.72);
        const lane = Math.ceil(order / 2);
        const side = order % 2 === 0 ? -1 : 1;
        return {
            x: lane * forwardStep,
            y: side * spacing * 0.38
        };
    },
    getDefaultTopologySlot(order) {
        return this.isSunflowerTopologyEnabled()
            ? this.getSunflowerTopologySlot(order)
            : this.getLinearTopologySlot(order);
    },
    captureNodeLocalSlot(node) {
        const local = rotateLocal(node.x - this.player.centroidX, node.y - this.player.centroidY, -this.player.heading);
        return { x: local.x, y: local.y };
    },
    applyTopologySlotLayout(useSunflower) {
        const previousTopology = this.player.topology || { slots: {}, edges: [] };
        const previousSlots = previousTopology.slots || {};
        const activeByIndex = new Map((this.activeNodes || []).map((node) => [node.index, node]));
        const slots = {};

        this.player.chain.forEach((poolIndex, order) => {
            if (useSunflower) {
                slots[poolIndex] = this.getSunflowerTopologySlot(order);
                return;
            }

            const activeNode = activeByIndex.get(poolIndex);
            if (activeNode) {
                slots[poolIndex] = this.captureNodeLocalSlot(activeNode);
                return;
            }
            if (Object.prototype.hasOwnProperty.call(previousSlots, poolIndex)) {
                slots[poolIndex] = { ...previousSlots[poolIndex] };
                return;
            }
            slots[poolIndex] = this.getLinearTopologySlot(order);
        });

        this.player.topology = {
            slots,
            edges: this.normalizeTopologyEdges(
                (previousTopology.edges || []).filter((edge) => Object.prototype.hasOwnProperty.call(slots, edge.a) && Object.prototype.hasOwnProperty.call(slots, edge.b))
            )
        };
    },
    syncTopologySlotLayoutMode() {
        const useSunflower = this.isSunflowerTopologyEnabled();
        if (this.lastSunflowerTopologyEnabled === useSunflower) {
            return;
        }

        this.lastSunflowerTopologyEnabled = useSunflower;
        if (!this.player?.topology) {
            return;
        }

        this.applyTopologySlotLayout(useSunflower);
        this.rebuildFormation();
    },
    buildPartialMeshEdges(chain, slots) {
        const entries = chain.map((index) => {
            const slot = slots[index];
            return { index, x: slot.x, y: slot.y };
        });
        const degreeByIndex = new Map(chain.map((index) => [index, 0]));
        const edgeKeys = new Set();
        const edges = [];
        const addEdge = (a, b, kind) => {
            if (a === b) {
                return false;
            }

            const key = makeEdgeKey(a, b);
            if (edgeKeys.has(key)) {
                return false;
            }

            if ((degreeByIndex.get(a) || 0) >= PARTIAL_MESH_RULES.autoMaxDegree || (degreeByIndex.get(b) || 0) >= PARTIAL_MESH_RULES.autoMaxDegree) {
                return false;
            }

            edgeKeys.add(key);
            degreeByIndex.set(a, (degreeByIndex.get(a) || 0) + 1);
            degreeByIndex.set(b, (degreeByIndex.get(b) || 0) + 1);
            edges.push({ a, b, kind });
            return true;
        };

        for (let i = 1; i < entries.length; i += 1) {
            const current = entries[i];
            let best = entries[i - 1];
            let bestScore = Infinity;

            for (let j = 0; j < i; j += 1) {
                const candidate = entries[j];
                const distance = Math.hypot(current.x - candidate.x, current.y - candidate.y);
                const forwardBias = Math.abs(current.x - candidate.x) * 0.18;
                const score = distance + forwardBias;
                if (score < bestScore) {
                    bestScore = score;
                    best = candidate;
                }
            }

            addEdge(current.index, best.index, 'spine');
        }

        const supportRadius = PARTIAL_MESH_RULES.supportRadius + Math.min(chain.length, 24) * 2.5;
        entries.forEach((entry) => {
            if ((degreeByIndex.get(entry.index) || 0) >= PARTIAL_MESH_RULES.autoMaxDegree) {
                return;
            }

            const linkedAngles = [];
            edges.forEach((edge) => {
                if (edge.a === entry.index || edge.b === entry.index) {
                    const otherIndex = edge.a === entry.index ? edge.b : edge.a;
                    const other = slots[otherIndex];
                    linkedAngles.push(Math.atan2(other.y - entry.y, other.x - entry.x));
                }
            });

            const candidates = entries
                .filter((other) => other.index !== entry.index)
                .map((other) => {
                    const dx = other.x - entry.x;
                    const dy = other.y - entry.y;
                    return {
                        other,
                        distance: Math.hypot(dx, dy),
                        angle: Math.atan2(dy, dx)
                    };
                })
                .sort((a, b) => a.distance - b.distance);

            for (let i = 0; i < candidates.length; i += 1) {
                const candidate = candidates[i];
                if (candidate.distance > supportRadius) {
                    break;
                }
                if ((degreeByIndex.get(entry.index) || 0) >= PARTIAL_MESH_RULES.autoMaxDegree) {
                    break;
                }
                if ((degreeByIndex.get(candidate.other.index) || 0) >= PARTIAL_MESH_RULES.autoMaxDegree) {
                    continue;
                }
                if (linkedAngles.some((existingAngle) => angleDistance(existingAngle, candidate.angle) < 0.42)) {
                    continue;
                }
                if (addEdge(entry.index, candidate.other.index, 'support')) {
                    linkedAngles.push(candidate.angle);
                }
            }
        });

        return edges;
    },
    buildSeedPolarityEdges(chain) {
        const baseNodes = [];
        const inverseNodes = [];

        chain.forEach((index) => {
            const node = this.poolNodes[index];
            if (!node) {
                return;
            }
            if (node.polarity === 'inverse') {
                inverseNodes.push(index);
            } else {
                baseNodes.push(index);
            }
        });

        const edges = [];
        for (let i = 0; i < inverseNodes.length; i += 1) {
            for (let j = i + 1; j < inverseNodes.length; j += 1) {
                edges.push(this.createTopologyEdgeDescriptor(inverseNodes[i], inverseNodes[j], 'spine'));
                edges.push(this.createTopologyEdgeDescriptor(inverseNodes[i], inverseNodes[j], 'support'));
            }
        }

        if (inverseNodes.length > 0) {
            baseNodes.forEach((baseIndex, order) => {
                const targetInverse = inverseNodes[order % inverseNodes.length];
                edges.push(this.createTopologyEdgeDescriptor(baseIndex, targetInverse, 'support'));
            });
        }

        return edges;
    },
    buildDefaultTopologyEdges(chain, slots) {
        return this.isCompoundTopologyEdgesEnabled()
            ? this.buildSeedPolarityEdges(chain)
            : this.buildPartialMeshEdges(chain, slots);
    },
    rebuildTopologyFromCurrentChain(preserveExistingSlots = false) {
        const chain = [...this.player.chain];
        const previousSlots = preserveExistingSlots ? (this.player.topology?.slots || {}) : {};
        const slots = {};

        chain.forEach((poolIndex, order) => {
            if (Object.prototype.hasOwnProperty.call(previousSlots, poolIndex)) {
                slots[poolIndex] = { ...previousSlots[poolIndex] };
                return;
            }
            slots[poolIndex] = this.getDefaultTopologySlot(order);
        });

        return {
            slots,
            edges: this.normalizeTopologyEdges(this.buildDefaultTopologyEdges(chain, slots))
        };
    },
    syncCompoundTopologyEdgesMode() {
        const enabled = this.isCompoundTopologyEdgesEnabled();
        if (this.lastCompoundTopologyEdgesEnabled === enabled) {
            return;
        }

        this.lastCompoundTopologyEdgesEnabled = enabled;
        if (!this.player?.topology || enabled) {
            return;
        }

        const collapsedEdges = this.normalizeTopologyEdges(this.player.topology.edges);
        if (collapsedEdges.length === this.player.topology.edges.length) {
            return;
        }

        this.player.topology.edges = collapsedEdges;
        this.rebuildFormation();
    },
    getExpansionDirection() {
        const pointerWorld = this.screenToWorld(this.input.activePointer.x, this.input.activePointer.y);
        const desiredWorld = normalize(
            pointerWorld.x - this.player.centroidX,
            pointerWorld.y - this.player.centroidY,
            Math.cos(this.player.heading),
            Math.sin(this.player.heading)
        );
        const desiredLocalRaw = rotateLocal(desiredWorld.x, desiredWorld.y, -this.player.heading);
        const desiredLocal = normalize(desiredLocalRaw.x, desiredLocalRaw.y, 1, 0);
        return { world: desiredWorld, local: desiredLocal };
    },
    getActiveTopologyEntries() {
        const slots = this.player.topology?.slots || {};
        const neighborSetByIndex = new Map(this.player.chain.map((index) => [index, new Set()]));

        (this.player.topology?.edges || []).forEach((edge) => {
            if (!neighborSetByIndex.has(edge.a) || !neighborSetByIndex.has(edge.b)) {
                return;
            }
            neighborSetByIndex.get(edge.a)?.add(edge.b);
            neighborSetByIndex.get(edge.b)?.add(edge.a);
        });

        return this.player.chain.map((index, order) => {
            const slot = slots[index] || this.getDefaultTopologySlot(order);
            return {
                index,
                order,
                x: slot.x,
                y: slot.y,
                degree: neighborSetByIndex.get(index)?.size || 0
            };
        });
    },
    pickExpansionAnchor(entries, desiredLocal) {
        let best = entries[0];
        let bestScore = -Infinity;

        entries.forEach((entry) => {
            const radial = normalize(entry.x, entry.y, desiredLocal.x, desiredLocal.y);
            const projection = entry.x * desiredLocal.x + entry.y * desiredLocal.y;
            const directional = radial.x * desiredLocal.x + radial.y * desiredLocal.y;
            const openness = 1 - clamp((entry.degree - 1) / PARTIAL_MESH_RULES.autoMaxDegree, 0, 1);
            const score = projection + directional * 54 + radial.length * 0.18 + openness * 46;
            if (score > bestScore) {
                bestScore = score;
                best = entry;
            }
        });

        return best;
    },
    relaxExpansionSlot(candidate, entries, desiredLocal) {
        const slot = { ...candidate };
        const minSpacing = PARTIAL_MESH_RULES.slotSpacing;
        let maxProjection = 0;

        entries.forEach((entry) => {
            maxProjection = Math.max(maxProjection, entry.x * desiredLocal.x + entry.y * desiredLocal.y);
        });

        for (let iteration = 0; iteration < 5; iteration += 1) {
            entries.forEach((entry) => {
                const dx = slot.x - entry.x;
                const dy = slot.y - entry.y;
                const distance = Math.hypot(dx, dy) || 0.0001;
                const overlap = minSpacing - distance;
                if (overlap <= 0) {
                    return;
                }

                slot.x += (dx / distance) * overlap * 0.58;
                slot.y += (dy / distance) * overlap * 0.58;
            });

            const projection = slot.x * desiredLocal.x + slot.y * desiredLocal.y;
            const targetProjection = maxProjection + PARTIAL_MESH_RULES.forwardStep;
            if (projection < targetProjection) {
                const delta = targetProjection - projection;
                slot.x += desiredLocal.x * delta * 0.32;
                slot.y += desiredLocal.y * delta * 0.32;
            }
        }

        return slot;
    },
    findBestPulseInsertionIndex(slot, anchorIndex) {
        let bestIndex = this.player.chain.length;
        let bestScore = Infinity;

        for (let insertIndex = 0; insertIndex <= this.player.chain.length; insertIndex += 1) {
            const previousIndex = insertIndex > 0 ? this.player.chain[insertIndex - 1] : null;
            const nextIndex = insertIndex < this.player.chain.length ? this.player.chain[insertIndex] : null;
            let score = 0;

            if (previousIndex !== null) {
                const previousSlot = this.player.topology.slots[previousIndex];
                score += Math.hypot(slot.x - previousSlot.x, slot.y - previousSlot.y);
                if (previousIndex === anchorIndex) {
                    score -= 38;
                }
            } else {
                score += 66;
            }

            if (nextIndex !== null) {
                const nextSlot = this.player.topology.slots[nextIndex];
                score += Math.hypot(slot.x - nextSlot.x, slot.y - nextSlot.y);
                if (nextIndex === anchorIndex) {
                    score -= 38;
                }
            } else {
                score += 42;
            }

            if (previousIndex !== null && nextIndex !== null) {
                const previousSlot = this.player.topology.slots[previousIndex];
                const nextSlot = this.player.topology.slots[nextIndex];
                score -= Math.hypot(previousSlot.x - nextSlot.x, previousSlot.y - nextSlot.y) * 0.22;
            }

            if (score < bestScore) {
                bestScore = score;
                bestIndex = insertIndex;
            }
        }

        return bestIndex;
    },
    pickExpansionNeighbors(slot, entries, anchorIndex) {
        const neighbors = [];
        const usedAngles = [];
        const anchor = entries.find((entry) => entry.index === anchorIndex);
        const pushNeighbor = (entry, allowTightAngle = false) => {
            if (!entry || neighbors.includes(entry.index)) {
                return false;
            }
            if (entry.degree >= PARTIAL_MESH_RULES.manualMaxDegree) {
                return false;
            }

            const angle = Math.atan2(entry.y - slot.y, entry.x - slot.x);
            if (!allowTightAngle && usedAngles.some((existingAngle) => angleDistance(existingAngle, angle) < 0.4)) {
                return false;
            }

            neighbors.push(entry.index);
            usedAngles.push(angle);
            return true;
        };

        pushNeighbor(anchor, true);

        const candidates = entries
            .filter((entry) => entry.index !== anchorIndex)
            .map((entry) => ({
                entry,
                distance: Math.hypot(entry.x - slot.x, entry.y - slot.y)
            }))
            .sort((a, b) => a.distance - b.distance);

        for (let i = 0; i < candidates.length; i += 1) {
            if (neighbors.length >= 3) {
                break;
            }
            const candidate = candidates[i];
            if (candidate.distance > PARTIAL_MESH_RULES.supportRadius + 48) {
                break;
            }
            pushNeighbor(candidate.entry);
        }

        for (let i = 0; i < candidates.length && neighbors.length < 2; i += 1) {
            pushNeighbor(candidates[i].entry, true);
        }

        return neighbors;
    },
    resetPulseFlow() {
        this.player.pulseRunners = [];
        this.rebalancePulseRunners(true);
    },
    getTopologyDegree(index) {
        const neighbors = new Set();
        this.player.topology.edges.forEach((edge) => {
            if (edge.a === index || edge.b === index) {
                neighbors.add(edge.a === index ? edge.b : edge.a);
            }
        });
        return neighbors.size;
    },
    getTopologyEdgeCount(a, b) {
        const key = makeEdgeKey(a, b);
        return this.player.topology.edges.filter((edge) => makeEdgeKey(edge.a, edge.b) === key).length;
    },
    addTopologyEdge(a, b, kind = 'support') {
        if (a === b) {
            return false;
        }
        if (!this.isCompoundTopologyEdgesEnabled() && this.getTopologyEdgeCount(a, b) > 0) {
            return false;
        }
        this.player.topology.edges.push(this.createTopologyEdgeDescriptor(a, b, kind));
        return true;
    },
    removeTopologyEdge(edgeId) {
        const nextEdges = this.player.topology.edges.filter((edge) => edge.id !== edgeId);
        if (nextEdges.length === this.player.topology.edges.length) {
            return false;
        }
        this.player.topology.edges = nextEdges;
        return true;
    },
    removeNodeFromTopology(index) {
        if (this.player.chain.length <= 3) {
            return false;
        }

        this.player.chain = this.player.chain.filter((entry) => entry !== index);
        delete this.player.topology.slots[index];
        this.player.topology.edges = this.player.topology.edges.filter((edge) => edge.a !== index && edge.b !== index);
        this.player.energy = 0;
        this.player.guard = 0;
        this.player.overload = 0;
        this.player.echo = 0;
        this.player.tempoBoost = 0;
        this.player.stability = 0.35;
        this.player.turnAssist = 0;
        if (this.player.edit.selectedNode === index) {
            this.player.edit.selectedNode = -1;
        }
        if (this.player.edit.hoverNode === index) {
            this.player.edit.hoverNode = -1;
        }
        this.player.edit.hoverLink = '';
        if (this.player.edit.pointerNode === index) {
            this.player.edit.pointerNode = -1;
        }
        if (this.player.edit.dragNode === index) {
            this.player.edit.dragNode = -1;
        }
        if (this.player.edit.deleteNode === index) {
            this.player.edit.deleteNode = -1;
            this.player.edit.deleteProgress = 0;
        }
        this.rebuildFormation();
        this.resetPulseFlow();
        return true;
    },
    getTopologyLinkRigidity(parallelCount) {
        if (parallelCount >= 3) {
            return 'rigid';
        }
        if (parallelCount === 2) {
            return 'joint';
        }
        return 'flex';
    },
    buildTopologyLinkProfile(edge, samePolarity, parallelCount) {
        const T = window.TUNING || {};
        const kindStiffness = edge.kind === 'support' ? (T.supportStiffness ?? 0.78) : (T.spineStiffness ?? 0.98);
        const kindDamping = edge.kind === 'support' ? (T.supportDamping ?? 0.18) : (T.spineDamping ?? 0.24);
        const inverseStiffMul = samePolarity ? 1 : (T.inversePolarityStiffnessMul ?? 0.88) * (edge.kind === 'support' ? (T.supportSoftness ?? 0.88) : 1);
        const inverseDampMul = samePolarity ? 1 : (T.inversePolarityDampingMul ?? 0.86);
        const rigidity = this.getTopologyLinkRigidity(parallelCount);

        let stiffnessBase = T.jointStiffness ?? 0.72;
        let dampingBase = T.jointDamping ?? 0.55;
        let stretchSlack = T.jointStretchSlack ?? 12;
        let pbdWeight = T.jointPbdWeight ?? 0.56;

        if (rigidity === 'flex') {
            stiffnessBase = T.flexStiffness ?? 0.18;
            dampingBase = T.flexDamping ?? 0.16;
            stretchSlack = T.flexStretchSlack ?? 44;
            pbdWeight = T.flexPbdWeight ?? 0.14;
        } else if (rigidity === 'rigid') {
            stiffnessBase = T.rigidStiffness ?? 2.6;
            dampingBase = T.rigidDamping ?? 1.45;
            stretchSlack = T.rigidStretchSlack ?? 2;
            pbdWeight = (T.rigidPbdWeight ?? 2.1) + Math.max(0, parallelCount - 3) * 0.6;
        }

        return {
            rigidity,
            stiffness: stiffnessBase * kindStiffness * inverseStiffMul,
            damping: dampingBase * kindDamping * inverseDampMul,
            stretchSlack,
            pbdWeight,
            parallelCount
        };
    },
    getLinkConstraintError(distance, link) {
        let error = distance - link.rest;
        if (error > 0) {
            error = Math.max(0, error - (link.stretchSlack || 0));
        }
        return error;
    },
    solveLinkConstraint(link, correctionRate, draggedIndex = -1) {
        const first = this.activeNodes[link.a];
        const second = this.activeNodes[link.b];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.hypot(dx, dy) || 0.0001;
        const error = this.getLinkConstraintError(distance, link);
        if (Math.abs(error) < 0.0001) {
            return;
        }

        const moveA = first.index === draggedIndex ? 0 : (first.anchored ? 0.18 : 1) / Math.max(first.mass, 0.1);
        const moveB = second.index === draggedIndex ? 0 : (second.anchored ? 0.18 : 1) / Math.max(second.mass, 0.1);
        const moveTotal = moveA + moveB;
        if (moveTotal <= 0) {
            return;
        }

        const strength = clamp(correctionRate * link.pbdWeight, 0, 0.92);
        const correction = (error / distance) * strength;
        const correctionX = dx * correction;
        const correctionY = dy * correction;
        first.x += correctionX * (moveA / moveTotal);
        first.y += correctionY * (moveA / moveTotal);
        second.x -= correctionX * (moveB / moveTotal);
        second.y -= correctionY * (moveB / moveTotal);
    },
    getLinkRenderPoints(link, useDisplay = true) {
        const first = this.activeNodes[link.a];
        const second = this.activeNodes[link.b];
        const fromX = useDisplay ? first.displayX : first.x;
        const fromY = useDisplay ? first.displayY : first.y;
        const toX = useDisplay ? second.displayX : second.x;
        const toY = useDisplay ? second.displayY : second.y;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.hypot(dx, dy) || 1;
        const normalX = -dy / distance;
        const normalY = dx / distance;
        const spread = link.parallelCount > 1 ? 12 : 0;
        const laneOffset = (link.parallelIndex - (link.parallelCount - 1) * 0.5) * spread;
        return {
            fromX: fromX + normalX * laneOffset,
            fromY: fromY + normalY * laneOffset,
            toX: toX + normalX * laneOffset,
            toY: toY + normalY * laneOffset
        };
    },
};
