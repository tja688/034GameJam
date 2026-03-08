

const SceneInitMixin = {
    createDefaultEditState() {
        return {
            active: false,
            ambience: 0,
            hoverNode: -1,
            hoverLink: '',
            selectedNode: -1,
            selectedNodes: [],
            selectedLinks: [],
            pointerNode: -1,
            pointerLink: '',
            dragNode: -1,
            dragStartX: 0,
            dragStartY: 0,
            dragOffsetX: 0,
            dragOffsetY: 0,
            dragWorldX: 0,
            dragWorldY: 0,
            boxSelectPending: false,
            boxSelecting: false,
            boxStartX: 0,
            boxStartY: 0,
            boxEndX: 0,
            boxEndY: 0,
            history: [],
            pendingSnapshot: null,
            deleteType: '',
            deleteNode: -1,
            deleteNodes: [],
            deleteLinks: [],
            deleteProgress: 0
        };
    },
    createDefaultPlayer(chain = this.baseChain) {
        return {
            chain: [...chain],
            centroidX: 0,
            centroidY: 0,
            heading: -Math.PI * 0.5,
            health: 100,
            maxHealth: 100,
            shield: 0,
            shieldTimer: 0,
            mass: 1,
            energy: 0,
            guard: 0,
            overload: 0,
            echo: 0,
            tempoBoost: 0,
            agitation: 0,
            stability: 0.35,
            turnAssist: 0,
            dead: false,
            deathTimer: 0,
            pulseRunners: [this.createPulseRunner()],
            pulseCursor: 0,
            pulseTimer: 0.12,
            pulsePath: { from: 0, to: 0, timer: 0.12, duration: 0.12, loopReset: false },
            edit: this.createDefaultEditState()
        };
    },
    createDefaultPulsePath() {
        return { from: 0, to: 0, timer: 0.12, duration: 0.12, loopReset: false };
    },
    createPulseRunner(cursor = 0, timer = 0.12, path = null) {
        return {
            cursor,
            timer,
            path: {
                ...this.createDefaultPulsePath(),
                ...(path || {})
            }
        };
    },
    getDesiredPulseOrbCount() {
        const T = window.TUNING || {};
        if (T.autoPulseOrbCount) {
            const nodeCount = Math.max(1, this.activeNodes?.length === this.player?.chain?.length ? this.activeNodes.length : this.player?.chain?.length || 1);
            const autoCount = clamp(2 + Math.floor(nodeCount / 10), 1, 20);
            T.pulseOrbCount = autoCount;
            return autoCount;
        }
        return clamp(Math.round(T.pulseOrbCount ?? 2), 1, 20);
    },
    syncLegacyPulseState() {
        const leadRunner = Array.isArray(this.player?.pulseRunners) && this.player.pulseRunners.length > 0
            ? this.player.pulseRunners[0]
            : this.createPulseRunner();
        this.player.pulseCursor = clamp(getFiniteNumber(leadRunner.cursor, 0), 0, Math.max(0, (this.activeNodes?.length || this.player.chain.length || 1) - 1));
        this.player.pulseTimer = getFiniteNumber(leadRunner.timer, 0.12);
        this.player.pulsePath = {
            ...this.createDefaultPulsePath(),
            ...(leadRunner.path || {})
        };
    },
    getPulseRunnerPhase(runner, nodeCount) {
        if (!runner || nodeCount <= 0) {
            return 0;
        }

        const path = runner.path || this.createDefaultPulsePath();
        const from = clamp(getFiniteNumber(path.from, 0), 0, Math.max(0, nodeCount - 1));
        const duration = Math.max(0.0001, getFiniteNumber(path.duration, 0.12));
        const timer = getFiniteNumber(path.timer, duration);
        const progress = path.loopReset ? 0 : clamp(1 - timer / duration, 0, 1);
        return (((from + progress) / nodeCount) % 1 + 1) % 1;
    },
    createPulseRunnerAtPhase(phase, nodeCount) {
        if (nodeCount <= 1) {
            return this.createPulseRunner(0, 0.12, this.createDefaultPulsePath());
        }

        const wrappedPhase = (((phase % 1) + 1) % 1);
        const segmentCount = Math.max(1, nodeCount - 1);
        const scaled = wrappedPhase * segmentCount;
        const from = clamp(Math.floor(scaled), 0, Math.max(0, nodeCount - 2));
        const progress = scaled - from;
        const to = from + 1;
        const current = this.activeNodes?.[from];
        const next = this.activeNodes?.[to];
        const duration = current && next ? this.getPulseInterval(current, next, false) : 0.22;
        const timer = Math.max(0.0001, duration * (1 - progress));
        return this.createPulseRunner(to, timer, {
            from,
            to,
            timer,
            duration,
            loopReset: false
        });
    },
    rebalancePulseRunners(forceReset = false) {
        const nodeCount = Math.max(
            1,
            this.activeNodes?.length === this.player.chain.length
                ? this.activeNodes.length
                : this.player.chain.length || 1
        );
        const desiredCount = nodeCount <= 1 ? 1 : this.getDesiredPulseOrbCount();
        const existing = Array.isArray(this.player.pulseRunners)
            ? this.player.pulseRunners.map((runner) => this.createPulseRunner(
                clamp(getFiniteNumber(runner.cursor, 0), 0, Math.max(0, nodeCount - 1)),
                getFiniteNumber(runner.timer, 0.12),
                runner.path
            ))
            : [];
        const needsRedistribute = forceReset
            || existing.length !== desiredCount
            || existing.some((runner) => !runner.path
                || !Number.isFinite(runner.path.duration)
                || runner.path.duration <= 0
                || runner.path.from < 0
                || runner.path.from >= nodeCount
                || runner.path.to < 0
                || runner.path.to >= nodeCount);

        if (needsRedistribute) {
            const anchorPhase = forceReset ? 0 : this.getPulseRunnerPhase(existing[0], nodeCount);
            this.player.pulseRunners = Array.from({ length: desiredCount }, (_, index) => {
                const phase = (anchorPhase + index / desiredCount) % 1;
                return this.createPulseRunnerAtPhase(phase, nodeCount);
            });
        } else {
            this.player.pulseRunners = existing;
        }

        this.syncLegacyPulseState();
    },
    createDefaultIntent() {
        return {
            moveX: 0,
            moveY: 0,
            moveLength: 0,
            aimX: 0,
            aimY: -1,
            aimLength: 1,
            flowX: 0,
            flowY: -1,
            legacyFlowX: 0,
            legacyFlowY: -1,
            aggressiveFlowX: 0,
            aggressiveFlowY: -1,
            baseFlowX: 0,
            baseFlowY: -1,
            inverseFlowX: 0,
            inverseFlowY: -1,
            clusterAggro: 0
        };
    },
    createDefaultCameraRig() {
        return {
            x: 0,
            y: 0,
            zoom: 0.92,
            targetZoom: 0.92,
            viewportWidth: this.scale.width,
            viewportHeight: this.scale.height
        };
    },
    createDefaultSpawnTimers() {
        return { swarm: 0.35, stinger: 8, brute: 46, flank: 21 };
    },
    createPoolNodesFromLibrary() {
        return NODE_LIBRARY.map((node, index) => ({
            ...node,
            index,
            experimentalColorState: 'blue',
            experimentalRedGroupId: 0
        }));
    },
    createDefaultRedDebugProbe(label = '') {
        return {
            active: false,
            label,
            frames: 0,
            exploded: false,
            current: null,
            lastExplosion: null,
            maxRedSpeed: 0,
            maxAbsCoord: 0,
            maxRedLinkError: 0,
            maxRedLinkErrorRatio: 0,
            maxRedRadius: 0,
            maxClusterSpeed: 0,
            maxClusterOmega: 0,
            maxClusterPoseOffset: 0,
            recent: []
        };
    },
    resetRedDebugProbe(label = '') {
        this.redDebugProbe = this.createDefaultRedDebugProbe(label);
        window.__redDebugProbe = this.redDebugProbe;
        return this.redDebugProbe;
    },
    activateRedDebugProbe(label = 'manual') {
        const probe = this.resetRedDebugProbe(label);
        probe.active = true;
        window.__redDebugProbe = probe;
        return probe;
    },
    deactivateRedDebugProbe() {
        if (!this.redDebugProbe) {
            this.resetRedDebugProbe();
            return;
        }
        this.redDebugProbe.active = false;
        window.__redDebugProbe = this.redDebugProbe;
    },
    recordRedDebugProbe() {
        const probe = this.redDebugProbe;
        if (!probe?.active) {
            return;
        }

        const redNodes = (this.activeNodes || []).filter((node) => this.isExperimentalRedNode(node));
        const redLinks = (this.links || []).filter((link) => link.isExperimentalRed);
        let maxRedSpeed = 0;
        let maxAbsCoord = 0;
        let maxRedLinkError = 0;
        let maxRedLinkErrorRatio = 0;
        let maxRedRadius = 0;
        let maxClusterSpeed = 0;
        let maxClusterOmega = 0;
        let maxClusterPoseOffset = 0;
        let nonFinite = false;
        const groups = new Map();

        redNodes.forEach((node) => {
            const speed = Math.hypot(node.vx || 0, node.vy || 0);
            const absCoord = Math.max(Math.abs(node.x || 0), Math.abs(node.y || 0));
            maxRedSpeed = Math.max(maxRedSpeed, speed);
            maxAbsCoord = Math.max(maxAbsCoord, absCoord);
            if (!Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.vx) || !Number.isFinite(node.vy)) {
                nonFinite = true;
            }
            const groupId = this.getExperimentalRedGroupId(node);
            if (groupId > 0) {
                if (!groups.has(groupId)) {
                    groups.set(groupId, []);
                }
                groups.get(groupId).push(node);
            }
        });

        redLinks.forEach((link) => {
            const first = this.activeNodes[link.a];
            const second = this.activeNodes[link.b];
            if (!first || !second) {
                return;
            }
            const distance = Math.hypot((second.x || 0) - (first.x || 0), (second.y || 0) - (first.y || 0));
            const error = Math.abs(distance - (link.rest || 0));
            const errorRatio = error / Math.max(Math.abs(link.rest || 0), 1);
            maxRedLinkError = Math.max(maxRedLinkError, error);
            maxRedLinkErrorRatio = Math.max(maxRedLinkErrorRatio, errorRatio);
            if (!Number.isFinite(distance) || !Number.isFinite(link.rest)) {
                nonFinite = true;
            }
        });

        groups.forEach((nodes) => {
            if (!Array.isArray(nodes) || nodes.length === 0) {
                return;
            }
            const centroid = nodes.reduce((acc, node) => {
                acc.x += node.x || 0;
                acc.y += node.y || 0;
                return acc;
            }, { x: 0, y: 0 });
            centroid.x /= nodes.length;
            centroid.y /= nodes.length;
            nodes.forEach((node) => {
                maxRedRadius = Math.max(maxRedRadius, Math.hypot((node.x || 0) - centroid.x, (node.y || 0) - centroid.y));
            });
        });

        (this.redClusters || new Map()).forEach((cluster) => {
            maxClusterSpeed = Math.max(maxClusterSpeed, Math.hypot(cluster.vx || 0, cluster.vy || 0));
            maxClusterOmega = Math.max(maxClusterOmega, Math.abs(cluster.omega || 0));
            maxClusterPoseOffset = Math.max(maxClusterPoseOffset, cluster.poseOffsetMax || 0);
        });

        probe.frames += 1;
        probe.current = {
            redClusterCount: (this.redClusters || new Map()).size,
            redNodeCount: redNodes.length,
            redLinkCount: redLinks.length,
            maxRedSpeed,
            maxAbsCoord,
            maxRedLinkError,
            maxRedLinkErrorRatio,
            maxRedRadius,
            maxClusterSpeed,
            maxClusterOmega,
            maxClusterPoseOffset
        };
        probe.maxRedSpeed = Math.max(probe.maxRedSpeed || 0, maxRedSpeed);
        probe.maxAbsCoord = Math.max(probe.maxAbsCoord || 0, maxAbsCoord);
        probe.maxRedLinkError = Math.max(probe.maxRedLinkError || 0, maxRedLinkError);
        probe.maxRedLinkErrorRatio = Math.max(probe.maxRedLinkErrorRatio || 0, maxRedLinkErrorRatio);
        probe.maxRedRadius = Math.max(probe.maxRedRadius || 0, maxRedRadius);
        probe.maxClusterSpeed = Math.max(probe.maxClusterSpeed || 0, maxClusterSpeed);
        probe.maxClusterOmega = Math.max(probe.maxClusterOmega || 0, maxClusterOmega);
        probe.maxClusterPoseOffset = Math.max(probe.maxClusterPoseOffset || 0, maxClusterPoseOffset);
        probe.recent.push({
            frame: probe.frames,
            speed: maxRedSpeed,
            coord: maxAbsCoord,
            error: maxRedLinkError,
            ratio: maxRedLinkErrorRatio,
            radius: maxRedRadius,
            clusterSpeed: maxClusterSpeed,
            clusterOmega: maxClusterOmega,
            clusterPoseOffset: maxClusterPoseOffset
        });
        if (probe.recent.length > 180) {
            probe.recent.splice(0, probe.recent.length - 180);
        }

        let reason = '';
        if (nonFinite) {
            reason = 'non-finite-state';
        } else if (maxAbsCoord > 24000) {
            reason = 'abs-coord-overflow';
        } else if (maxRedSpeed > 12000) {
            reason = 'speed-overflow';
        } else if (maxRedLinkErrorRatio > 4) {
            reason = 'link-error-ratio-overflow';
        } else if (maxRedRadius > 6000 && redNodes.length > 0 && redNodes.length <= 8) {
            reason = 'group-radius-overflow';
        } else if (maxClusterPoseOffset > 900) {
            reason = 'cluster-pose-overflow';
        }

        if (reason && !probe.exploded) {
            probe.exploded = true;
            probe.lastExplosion = {
                reason,
                frame: probe.frames,
                ...probe.current
            };
            console.warn('RED_DEBUG_EXPLODED', JSON.stringify(probe.lastExplosion));
        }

        window.__redDebugProbe = probe;
    },
    runExperimentalRedDebugSetup() {
        const T = window.TUNING || {};
        T.enableRedTopologyExperiment = true;

        this.resetSimulation(true);

        const triad = [0, 1, 2];
        const radius = 112;
        this.baseChain = [...triad];
        this.player.chain = [...triad];
        (this.poolNodes || []).forEach((node) => {
            node.experimentalColorState = 'blue';
            node.experimentalRedGroupId = 0;
        });
        this.player.topology = {
            slots: {
                0: { x: 0, y: -radius },
                1: { x: -radius * 0.8660254, y: radius * 0.5 },
                2: { x: radius * 0.8660254, y: radius * 0.5 }
            },
            edges: [
                this.createTopologyEdgeDescriptor(0, 1, 'spine'),
                this.createTopologyEdgeDescriptor(1, 2, 'spine'),
                this.createTopologyEdgeDescriptor(2, 0, 'spine')
            ]
        };
        this.player.centroidX = 0;
        this.player.centroidY = 0;
        this.player.heading = -Math.PI * 0.5;
        this.player.edit = this.createDefaultEditState();
        this.activeNodes = [];
        this.links = [];
        this.syncExperimentalRedGroupUid();
        this.rebuildFormation(true);
        this.enterEditMode();
        this.setEditSelection(triad, []);
        this.paintSelectedNodesRed();
        this.setEditSelection(triad, []);
        this.resetPulseFlow();
        this.activateRedDebugProbe('triad-red-test');
        this.updateDisplay(0);
        this.menuMode = null;
        this.paused = false;
        this.sessionStarted = true;
        this.refreshMenuState();
        this.showToast('红测试 x3 已启动');
        return true;
    },
    resetSimulation(startSession = true) {
        this.paused = false;
        this.sessionStarted = startSession;
        this.timeScaleFactor = 1;
        this.worldTime = 0;
        this.effects = [];
        this.projectiles = [];
        this.echoQueue = [];
        this.enemies = [];
        this.spawnTimers = this.createDefaultSpawnTimers();
        this.baseChain = [...DEFAULT_BASE_CHAIN];
        this.player = this.createDefaultPlayer();
        this.intent = this.createDefaultIntent();
        this.cameraRig = this.createDefaultCameraRig();
        this.poolNodes = this.createPoolNodesFromLibrary();
        this.syncExperimentalRedGroupUid();
        this.player.topology = this.rebuildTopologyFromCurrentChain();
        this.activeNodes = [];
        this.links = [];
        this.redClusters = new Map();
        this.redNodeToCluster = new Map();
        this.clearRedClusterRestDirty();
        this.resetRedDebugProbe();
        this.player.topology.edges = this.normalizeTopologyEdges(this.buildExperimentalRedEdges(this.player.topology.edges));
        this.rebuildFormation(true);
        this.lastCompoundTopologyEdgesEnabled = this.isCompoundTopologyEdgesEnabled();
        this.lastSunflowerTopologyEnabled = this.isSunflowerTopologyEnabled();
        this.lastExperimentalRedTopologyEnabled = this.isExperimentalRedTopologyEnabled();
        this.expandHoldTimer = 0;
        this.expandAddCount = 0;
        this.nextExpandThreshold = 0;
        this.refreshMenuState();
    },
    update(_, deltaMs) {
        const frameDt = Math.min(deltaMs, 33) / 1000;

        if (Phaser.Input.Keyboard.JustDown(this.keys.cancel) && !this.player.dead) {
            if (this.menuMode === 'pause') {
                this.resumeGame();
                return;
            }
            if (this.menuMode === 'main') {
                return;
            }
            if (this.player.edit.active) {
                this.exitEditMode();
            } else if (this.sessionStarted) {
                this.showPauseMenu();
                return;
            }
        }

        if (this.menuMode) {
            this.updateCamera(frameDt);
            this.updateDisplay(frameDt);
            this.render();
            return;
        }

        if (this.player.dead) {
            this.player.deathTimer -= frameDt;
            if (Phaser.Input.Keyboard.JustDown(this.keys.restart) || Phaser.Input.Keyboard.JustDown(this.keys.cancel) || this.player.deathTimer <= 0) {
                this.resetSimulation(true);
                this.resumeGame();
                return;
            }
        }

        if (this.paused) {
            this.updateCamera(frameDt);
            this.updateDisplay(frameDt);
            this.render();
            return;
        }

        if (!this.player.dead && !this.player.edit.active) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.expand)) {
                this.addDebugNode();
                this.expandHoldTimer = 0;
                this.expandAddCount = 0;
                this.nextExpandThreshold = 0.45;
            } else if (this.keys.expand.isDown) {
                this.expandHoldTimer += frameDt;
                if (this.expandHoldTimer > this.nextExpandThreshold) {
                    this.addDebugNode();
                    this.expandAddCount++;
                    const interval = Math.max(0.015, 0.18 * Math.pow(0.88, this.expandAddCount));
                    this.nextExpandThreshold += interval;
                }
            }
        }
        if (!this.player.dead && !this.player.edit.active && Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
            this.resetSimulation(true);
            return;
        }

        this.handleModeInputs();
        this.readIntent();
        this.updateEditMode(frameDt);
        this.syncCompoundTopologyEdgesMode();
        this.syncTopologySlotLayoutMode();
        this.syncExperimentalRedTopologyMode();

        const simDt = frameDt * this.timeScaleFactor;
        this.worldTime += simDt;

        if (!this.player.dead) {
            this.updatePulse(simDt);
            this.updateFormation(simDt);
            this.updatePlayerState(simDt);
            this.updateEchoes(simDt);
            this.updateProjectiles(simDt);
            this.updateSpawns(simDt);
            this.updateEnemies(simDt);
            this.resolveEnemyNodeCollisions();
            this.updateEffects(simDt);
        } else {
            this.updateEffects(frameDt);
        }

        this.updateCamera(frameDt);
        this.updateDisplay(frameDt);
        this.render();
    },
    worldToScreen(x, y) {
        return {
            x: (x - this.cameraRig.x) * this.cameraRig.zoom + this.cameraRig.viewportWidth * 0.5,
            y: (y - this.cameraRig.y) * this.cameraRig.zoom + this.cameraRig.viewportHeight * 0.5
        };
    },
    screenToWorld(x, y) {
        return {
            x: (x - this.cameraRig.viewportWidth * 0.5) / this.cameraRig.zoom + this.cameraRig.x,
            y: (y - this.cameraRig.viewportHeight * 0.5) / this.cameraRig.zoom + this.cameraRig.y
        };
    },
    updateCamera(frameDt) {
        const T = window.TUNING || {};
        const span = this.getFormationSpan() + (T.cameraSpanPadding ?? 180);
        const widthFit = this.cameraRig.viewportWidth / (span * 2.2);
        const heightFit = this.cameraRig.viewportHeight / (span * 1.85);
        let targetZ = clamp(Math.min(widthFit, heightFit), T.cameraMinZoom ?? 0.36, T.cameraMaxZoom ?? 1.08);
        targetZ *= lerp(1, 1.12, this.player.edit.ambience || 0);
        targetZ *= (this.cameraZoomScale || 1);
        this.cameraRig.targetZoom = targetZ;
        this.cameraRig.zoom = damp(this.cameraRig.zoom, this.cameraRig.targetZoom, T.cameraZoomDamp ?? 3.2, frameDt);
        this.cameraRig.x = damp(this.cameraRig.x, this.player.centroidX, T.cameraPosDamp ?? 3.4, frameDt);
        this.cameraRig.y = damp(this.cameraRig.y, this.player.centroidY, T.cameraPosDamp ?? 3.4, frameDt);
    },
    updateDisplay(frameDt) {
        const T = window.TUNING || {};
        const dd = T.displayDamping ?? 18;
        const pgd = T.pulseGlowDecay ?? 3.2;
        this.activeNodes.forEach((node) => {
            node.displayX = damp(node.displayX, node.x, dd, frameDt);
            node.displayY = damp(node.displayY, node.y, dd, frameDt);
            node.displayAnchorX = damp(node.displayAnchorX, node.anchorX, dd, frameDt);
            node.displayAnchorY = damp(node.displayAnchorY, node.anchorY, dd, frameDt);
            node.pulseGlow = Math.max(0, node.pulseGlow - frameDt * pgd);
            node.attackTimer = Math.max(0, node.attackTimer - frameDt);
        });
    },
};

