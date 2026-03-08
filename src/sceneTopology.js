function makeEdgeKey(a, b) {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function createTopologyEdgeId() {
    const id = TOPOLOGY_EDGE_UID;
    TOPOLOGY_EDGE_UID += 1;
    return `edge-${id}`;
}

const SceneTopologyMixin = {
    createTopologyEdgeDescriptor(a, b, kind = 'support', id = createTopologyEdgeId(), meta = null) {
        return { id, a, b, kind, ...(meta || {}) };
    },
    createExperimentalRedGroupId() {
        const id = EXPERIMENTAL_RED_GROUP_UID;
        EXPERIMENTAL_RED_GROUP_UID += 1;
        return id;
    },
    syncExperimentalRedGroupUid() {
        let maxGroupId = 0;
        (this.poolNodes || []).forEach((node) => {
            maxGroupId = Math.max(maxGroupId, Number(node?.experimentalRedGroupId) || 0);
        });
        EXPERIMENTAL_RED_GROUP_UID = Math.max(EXPERIMENTAL_RED_GROUP_UID, maxGroupId + 1);
    },
    isExperimentalRedTopologyEnabled() {
        const T = window.TUNING || {};
        return !!(T.enableRedTopologyExperiment ?? false);
    },
    isExperimentalRedEdge(edge) {
        return !!edge?.experimentalRed;
    },
    getPoolNodeExperimentalState(indexOrNode) {
        const index = Number.isInteger(indexOrNode)
            ? indexOrNode
            : Number.isInteger(indexOrNode?.index)
                ? indexOrNode.index
                : -1;
        const poolNode = this.poolNodes?.[index];
        return {
            colorState: poolNode?.experimentalColorState === 'red' ? 'red' : 'blue',
            groupId: Number(poolNode?.experimentalRedGroupId) || 0
        };
    },
    isExperimentalRedNode(indexOrNode) {
        return this.getPoolNodeExperimentalState(indexOrNode).colorState === 'red';
    },
    getExperimentalRedGroupId(indexOrNode) {
        return this.getPoolNodeExperimentalState(indexOrNode).groupId;
    },
    getNodeRenderColor(node) {
        if (this.isExperimentalRedTopologyEnabled()) {
            return this.isExperimentalRedNode(node) ? COLORS.inverse : COLORS.base;
        }
        return node?.color ?? COLORS.base;
    },
    getNodeEffectivePolarity(node) {
        if (this.isExperimentalRedTopologyEnabled()) {
            const basePolarity = node?.polarity || this.poolNodes?.[node?.index]?.polarity || 'base';
            return this.isExperimentalRedNode(node) ? `red-${basePolarity}` : basePolarity;
        }
        return node?.polarity || 'base';
    },
    setExperimentalNodeState(nodeIds, colorState = 'blue', forcedGroupId = null) {
        const normalizedIds = [...new Set((Array.isArray(nodeIds) ? nodeIds : []).filter((index) => this.player?.chain?.includes(index)))];
        if (normalizedIds.length === 0) {
            return false;
        }

        const isRed = colorState === 'red';
        const nextGroupId = isRed ? (forcedGroupId || this.createExperimentalRedGroupId()) : 0;
        normalizedIds.forEach((index) => {
            const poolNode = this.poolNodes?.[index];
            if (!poolNode) {
                return;
            }
            poolNode.experimentalColorState = isRed ? 'red' : 'blue';
            poolNode.experimentalRedGroupId = nextGroupId;
        });
        this.syncExperimentalRedGroupUid();
        return true;
    },
    paintExperimentalNodesRed(nodeIds) {
        const normalizedIds = [...new Set((Array.isArray(nodeIds) ? nodeIds : []).filter((index) => this.player?.chain?.includes(index)))];
        if (normalizedIds.length === 0) {
            return false;
        }

        const existingGroups = new Set(
            normalizedIds
                .map((index) => this.getExperimentalRedGroupId(index))
                .filter((groupId) => groupId > 0)
        );
        const groupId = existingGroups.size === 1
            ? [...existingGroups][0]
            : this.createExperimentalRedGroupId();
        return this.setExperimentalNodeState(normalizedIds, 'red', groupId);
    },
    clearExperimentalNodes(nodeIds) {
        return this.setExperimentalNodeState(nodeIds, 'blue', 0);
    },
    clearAllExperimentalRedState() {
        const redIds = (this.player?.chain || []).filter((index) => this.isExperimentalRedNode(index));
        if (redIds.length === 0) {
            return false;
        }

        const snapshot = typeof this.captureEditSnapshot === 'function' ? this.captureEditSnapshot() : null;
        this.clearExperimentalNodes(redIds);
        this.syncExperimentalRedTopology();
        if (snapshot && typeof this.pushEditHistorySnapshot === 'function') {
            this.pushEditHistorySnapshot(snapshot);
        }
        if (typeof this.clearEditSelection === 'function') {
            this.clearEditSelection();
        }
        return true;
    },
    getExperimentalRedGroups() {
        const groups = new Map();
        (this.player?.chain || []).forEach((index) => {
            if (!this.isExperimentalRedNode(index)) {
                return;
            }
            const groupId = this.getExperimentalRedGroupId(index);
            if (groupId <= 0) {
                return;
            }
            if (!groups.has(groupId)) {
                groups.set(groupId, []);
            }
            groups.get(groupId).push(index);
        });
        return groups;
    },
    getExperimentalRedPairGroupId(a, b) {
        if (!this.isExperimentalRedTopologyEnabled()) {
            return 0;
        }
        const groupA = this.getExperimentalRedGroupId(a);
        const groupB = this.getExperimentalRedGroupId(b);
        if (groupA <= 0 || groupA !== groupB) {
            return 0;
        }
        return groupA;
    },
    shouldSuppressStandardEdgeForExperimentalRed(edge) {
        if (!edge || this.isExperimentalRedEdge(edge)) {
            return false;
        }
        return this.getExperimentalRedPairGroupId(edge.a, edge.b) > 0;
    },
    createExperimentalRedEdgeBundle(a, b, groupId) {
        const pairKey = makeEdgeKey(a, b).replace(':', '-');
        return Array.from({ length: 3 }, (_, lane) => this.createTopologyEdgeDescriptor(
            a,
            b,
            'spine',
            `exp-red-${groupId}-${pairKey}-${lane}`,
            {
                experimentalRed: true,
                structureGroupId: groupId,
                experimentalLane: lane
            }
        ));
    },
    getExperimentalRedStructurePoint(index) {
        const slot = this.player?.topology?.slots?.[index];
        if (slot && Number.isFinite(slot.x) && Number.isFinite(slot.y)) {
            return { x: slot.x, y: slot.y };
        }

        const activeNode = (this.activeNodes || []).find((node) => node.index === index);
        if (activeNode) {
            return this.captureNodeLocalSlot(activeNode);
        }

        const order = Math.max(0, (this.player?.chain || []).indexOf(index));
        return this.getDefaultTopologySlot(order);
    },
    addExperimentalRedPair(pairs, a, b) {
        if (!pairs || !Number.isInteger(a) || !Number.isInteger(b) || a === b) {
            return;
        }
        pairs.add(makeEdgeKey(a, b));
    },
    buildExperimentalRedScaffoldPairs(indices) {
        const normalized = [...new Set((Array.isArray(indices) ? indices : []).filter((index) => this.player?.chain?.includes(index)))];
        if (normalized.length < 2) {
            return [];
        }
        if (normalized.length === 2) {
            return [[normalized[0], normalized[1]]];
        }

        const points = normalized.map((index) => {
            const point = this.getExperimentalRedStructurePoint(index);
            return {
                index,
                x: point.x,
                y: point.y
            };
        });
        const centroid = points.reduce((acc, point) => {
            acc.x += point.x;
            acc.y += point.y;
            return acc;
        }, { x: 0, y: 0 });
        centroid.x /= points.length;
        centroid.y /= points.length;

        points.forEach((point) => {
            point.angle = Math.atan2(point.y - centroid.y, point.x - centroid.x);
            point.radius = Math.hypot(point.x - centroid.x, point.y - centroid.y);
        });
        points.sort((first, second) => {
            if (first.angle !== second.angle) {
                return first.angle - second.angle;
            }
            return first.radius - second.radius;
        });

        const pairs = new Set();
        for (let i = 0; i < points.length; i += 1) {
            const current = points[i];
            const next = points[(i + 1) % points.length];
            this.addExperimentalRedPair(pairs, current.index, next.index);
        }

        let anchorOrder = 0;
        let anchorRadius = Infinity;
        points.forEach((point, index) => {
            if (point.radius < anchorRadius) {
                anchorRadius = point.radius;
                anchorOrder = index;
            }
        });

        const count = points.length;
        for (let offset = 2; offset <= count - 2; offset += 1) {
            const candidateOrder = (anchorOrder + offset) % count;
            if (candidateOrder === (anchorOrder + count - 1) % count) {
                continue;
            }
            this.addExperimentalRedPair(pairs, points[anchorOrder].index, points[candidateOrder].index);
        }

        return [...pairs].map((pairKey) => pairKey.split(':').map((value) => Number(value)));
    },
    buildExperimentalRedDensePairs(indices) {
        const normalized = [...new Set((Array.isArray(indices) ? indices : []).filter((index) => this.player?.chain?.includes(index)))];
        const pairs = [];
        for (let i = 0; i < normalized.length; i += 1) {
            for (let j = i + 1; j < normalized.length; j += 1) {
                pairs.push([normalized[i], normalized[j]]);
            }
        }
        return pairs;
    },
    buildExperimentalRedGroupPairs(indices) {
        const T = window.TUNING || {};
        return (T.redStructureDensePairs ?? false)
            ? this.buildExperimentalRedDensePairs(indices)
            : this.buildExperimentalRedScaffoldPairs(indices);
    },
    buildExperimentalRedEdges(baseEdges = []) {
        const edges = (Array.isArray(baseEdges) ? baseEdges : []).filter((edge) => !this.isExperimentalRedEdge(edge));
        if (!this.isExperimentalRedTopologyEnabled()) {
            return edges;
        }

        this.getExperimentalRedGroups().forEach((indices, groupId) => {
            if (!Array.isArray(indices) || indices.length < 2) {
                return;
            }
            this.buildExperimentalRedGroupPairs(indices).forEach(([a, b]) => {
                edges.push(...this.createExperimentalRedEdgeBundle(a, b, groupId));
            });
        });
        return edges;
    },
    syncExperimentalRedTopology(rebuild = true) {
        if (!this.player?.topology) {
            return false;
        }

        const baseEdges = (this.player.topology.edges || []).filter((edge) => !this.isExperimentalRedEdge(edge));
        const nextEdges = this.normalizeTopologyEdges(this.buildExperimentalRedEdges(baseEdges));
        const previousSignature = JSON.stringify(this.normalizeTopologyEdges(this.player.topology.edges || []));
        const nextSignature = JSON.stringify(nextEdges);
        const changed = previousSignature !== nextSignature;
        this.player.topology.edges = nextEdges;
        if (changed && typeof this.syncEditSelectionState === 'function') {
            this.syncEditSelectionState();
        }
        if ((changed || rebuild) && typeof this.rebuildFormation === 'function') {
            this.rebuildFormation();
        }
        return changed;
    },
    syncExperimentalRedTopologyMode() {
        const enabled = this.isExperimentalRedTopologyEnabled();
        if (this.lastExperimentalRedTopologyEnabled === enabled) {
            return;
        }

        this.lastExperimentalRedTopologyEnabled = enabled;
        if (!this.player?.topology) {
            return;
        }

        this.syncExperimentalRedTopology(false);
        this.rebuildFormation();
    },
    isCompoundTopologyEdgesEnabled() {
        const T = window.TUNING || {};
        return T.enableCompoundTopologyEdges ?? false;
    },
    collapseCompoundTopologyEdges(edges) {
        const grouped = new Map();
        (Array.isArray(edges) ? edges : []).forEach((edge) => {
            const pairKey = makeEdgeKey(edge.a, edge.b);
            if (!grouped.has(pairKey)) {
                grouped.set(pairKey, []);
            }
            grouped.get(pairKey).push(edge);
        });

        const collapsed = [];
        grouped.forEach((groupEdges) => {
            const redEdges = groupEdges.filter((edge) => this.isExperimentalRedEdge(edge));
            if (redEdges.length > 0) {
                collapsed.push(...redEdges);
                return;
            }
            collapsed.push(groupEdges[0]);
        });
        return collapsed;
    },
    normalizeTopologyEdges(edges) {
        const normalized = (Array.isArray(edges) ? edges : [])
            .filter((edge) => Number.isInteger(edge?.a) && Number.isInteger(edge?.b) && edge.a !== edge.b)
            .map((edge) => this.createTopologyEdgeDescriptor(edge.a, edge.b, edge.kind || 'support', edge.id || createTopologyEdgeId(), {
                experimentalRed: !!edge.experimentalRed,
                structureGroupId: Number(edge.structureGroupId) || 0,
                experimentalLane: Number.isInteger(edge.experimentalLane) ? edge.experimentalLane : 0
            }));
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
    getExperimentalRedNodesByGroup(groupId, useActiveNodes = false) {
        const source = useActiveNodes ? (this.activeNodes || []) : (this.player?.chain || []);
        return useActiveNodes
            ? source.filter((node) => this.getExperimentalRedGroupId(node) === groupId)
            : source.filter((index) => this.getExperimentalRedGroupId(index) === groupId);
    },
    bakeExperimentalGroupShape(groupId, pinnedIndex = -1, blend = 0.35) {
        if (groupId <= 0 || !this.player?.topology?.slots) {
            return false;
        }

        const groupNodes = this.getExperimentalRedNodesByGroup(groupId, true);
        if (groupNodes.length === 0) {
            return false;
        }

        const appliedBlend = clamp(blend, 0, 1);
        groupNodes.forEach((node) => {
            const slot = this.player.topology.slots[node.index] || { x: 0, y: 0 };
            const local = rotateLocal(node.x - this.player.centroidX, node.y - this.player.centroidY, -this.player.heading);
            const weight = node.index === pinnedIndex ? 1 : appliedBlend;
            this.player.topology.slots[node.index] = {
                x: lerp(slot.x, local.x, weight),
                y: lerp(slot.y, local.y, weight)
            };
        });
        this.syncActiveNodeLocalFromSlots(groupNodes);
        this.markRedClusterRestDirty(groupId);
        return true;
    },
    refreshExperimentalRedLinkRuntime(groupId = 0) {
        const T = window.TUNING || {};
        const restMin = T.redStructureRestMin ?? (T.linkRestMin ?? 84);
        const restMax = T.redStructureRestMax ?? (T.linkRestMax ?? 206);
        const restMul = T.redStructureRestMul ?? 1;
        this.links.forEach((link) => {
            if (!link.isExperimentalRed) {
                return;
            }
            if (groupId > 0 && link.structureGroupId !== groupId) {
                return;
            }

            const slotA = this.player.topology?.slots?.[link.topologyA];
            const slotB = this.player.topology?.slots?.[link.topologyB];
            if (slotA && slotB) {
                const distance = Math.hypot(slotA.x - slotB.x, slotA.y - slotB.y);
                link.rest = clamp(distance * restMul, restMin, restMax);
            }

            const profile = this.buildTopologyLinkProfile({
                kind: link.kind,
                experimentalRed: true
            }, true, Math.max(3, link.parallelCount || 3));
            link.stiffness = profile.stiffness;
            link.damping = profile.damping;
            link.stretchSlack = profile.stretchSlack;
            link.pbdWeight = profile.pbdWeight;
            link.rigidity = profile.rigidity;
        });
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
            if (this.shouldSuppressStandardEdgeForExperimentalRed(edge)) {
                return;
            }
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
            if (this.shouldSuppressStandardEdgeForExperimentalRed(edge)) {
                return;
            }
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
    removeTopologyEdges(edgeIds) {
        const edgeIdSet = new Set((Array.isArray(edgeIds) ? edgeIds : []).filter((edgeId) => typeof edgeId === 'string' && edgeId.length > 0));
        if (edgeIdSet.size === 0) {
            return false;
        }

        const nextEdges = this.player.topology.edges.filter((edge) => !edgeIdSet.has(edge.id));
        if (nextEdges.length === this.player.topology.edges.length) {
            return false;
        }

        this.player.topology.edges = this.normalizeTopologyEdges(nextEdges);
        this.syncExperimentalRedTopology(false);
        if (typeof this.syncEditSelectionState === 'function') {
            this.syncEditSelectionState();
        }
        this.rebuildFormation();
        return true;
    },
    removeTopologyEdge(edgeId) {
        return this.removeTopologyEdges([edgeId]);
    },
    removeNodesFromTopology(indices) {
        const indexSet = new Set((Array.isArray(indices) ? indices : []).filter((index) => this.player.chain.includes(index)));
        if (indexSet.size === 0) {
            return false;
        }
        if (this.player.chain.length - indexSet.size < 3) {
            return false;
        }

        this.player.chain = this.player.chain.filter((entry) => !indexSet.has(entry));
        indexSet.forEach((index) => {
            delete this.player.topology.slots[index];
            if (this.poolNodes[index]) {
                this.poolNodes[index].experimentalColorState = 'blue';
                this.poolNodes[index].experimentalRedGroupId = 0;
            }
        });
        this.player.topology.edges = this.player.topology.edges.filter((edge) => !indexSet.has(edge.a) && !indexSet.has(edge.b));
        this.player.energy = 0;
        this.player.guard = 0;
        this.player.overload = 0;
        this.player.echo = 0;
        this.player.tempoBoost = 0;
        this.player.stability = 0.35;
        this.player.turnAssist = 0;
        if (typeof this.syncEditSelectionState === 'function') {
            this.syncEditSelectionState();
        }
        this.syncExperimentalRedTopology(false);
        this.rebuildFormation();
        this.resetPulseFlow();
        return true;
    },
    removeNodeFromTopology(index) {
        return this.removeNodesFromTopology([index]);
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
        if (this.isExperimentalRedEdge(edge)) {
            const effectiveParallelCount = Math.max(3, parallelCount || 3);
            const laneScale = 1 / effectiveParallelCount;
            return {
                rigidity: 'rigid',
                // Red rigid bundles are represented as 3 lanes for reuse/rendering, but
                // their combined force budget should stay close to one rigid connection.
                stiffness: (T.redStructureStiffness ?? (T.rigidStiffness ?? 2.6)) * laneScale,
                damping: (T.redStructureDamping ?? (T.rigidDamping ?? 1.45)) * laneScale,
                stretchSlack: T.redStructureStretchSlack ?? (T.rigidStretchSlack ?? 2),
                pbdWeight: (T.redStructurePbdWeight ?? (T.rigidPbdWeight ?? 2.1)) * laneScale,
                parallelCount: effectiveParallelCount
            };
        }

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
        if (link?.clusterInternal) {
            return;
        }
        const first = this.activeNodes[link.a];
        const second = this.activeNodes[link.b];
        if (!first || !second) {
            return;
        }
        if (this.isNodeDrivenByRedCluster(first) || this.isNodeDrivenByRedCluster(second)) {
            return;
        }
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
