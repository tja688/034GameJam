

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
    createDefaultClusterVolumeState() {
        const T = window.TUNING || {};
        const neutral = clamp(T.clusterVolumeNeutral ?? 0.36, 0.05, 0.95);
        return {
            target: neutral,
            manual: neutral,
            auto: 0,
            effective: neutral,
            normalized: 0,
            expansion: 0,
            compression: 0,
            radialScale: 1,
            forwardScale: 1,
            lateralScale: 1,
            restScale: 1,
            repulsionScale: 1,
            latticePull: 0,
            corePullScale: 1,
            cameraPadding: 0
        };
    },
    createDefaultBurstDriveState() {
        return {
            phase: 'cruise',
            pressure: 0,
            releaseTimer: 0,
            breakthrough: 0,
            output: 0,
            aggro: 0,
            chaosBoost: 0,
            reachBoost: 0,
            strengthBoost: 0,
            driftBoost: 0,
            tempoBoost: 0,
            spreadBoost: 0,
            forwardBias: 0,
            lookAhead: 0,
            centerCompression: 0,
            distance: 0,
            distanceNorm: 0,
            outwardSpeed: 0,
            pointerSpeed: 0,
            centerRadius: 0,
            chaseRadius: 0,
            breakRadius: 0,
            initialized: false,
            lastPointerX: 0,
            lastPointerY: 0,
            lastDistance: 0
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
            clusterAggro: 0,
            pointerX: 0,
            pointerY: 0,
            pointerDistance: 0,
            burstPhase: 'cruise',
            burstAggro: 0,
            burstChaos: 0,
            burstReachBoost: 0,
            burstStrengthBoost: 0,
            burstDriftBoost: 0,
            burstTempo: 0,
            burstSpreadBoost: 0,
            burstForwardBias: 0,
            burstLookAhead: 0,
            burstPressure: 0,
            burstPointerSpeed: 0,
            burstOutwardSpeed: 0,
            burstCenterRadius: 0,
            burstChaseRadius: 0,
            burstBreakRadius: 0,
            centerCompression: 0,
            clusterVolume: 0,
            clusterVolumeScale: 1,
            clusterVolumeForwardScale: 1,
            clusterVolumeLateralScale: 1
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
        return NODE_LIBRARY.map((node, index) => ({ ...node, index }));
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
        this.clusterVolume = this.createDefaultClusterVolumeState();
        this.burstDrive = this.createDefaultBurstDriveState();
        this.poolNodes = this.createPoolNodesFromLibrary();
        this.player.topology = this.rebuildTopologyFromCurrentChain();
        this.activeNodes = [];
        this.links = [];
        this.rebuildFormation(true);
        this.lastCompoundTopologyEdgesEnabled = this.isCompoundTopologyEdgesEnabled();
        this.lastSunflowerTopologyEnabled = this.isSunflowerTopologyEnabled();
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
        this.readIntent(frameDt);
        this.updateEditMode(frameDt);
        this.syncCompoundTopologyEdgesMode();
        this.syncTopologySlotLayoutMode();

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
        const volumePadding = this.clusterVolume?.cameraPadding || 0;
        const span = this.getFormationSpan() + (T.cameraSpanPadding ?? 180) + volumePadding;
        const widthFit = this.cameraRig.viewportWidth / (span * 2.2);
        const heightFit = this.cameraRig.viewportHeight / (span * 1.85);
        let targetZ = clamp(Math.min(widthFit, heightFit), T.cameraMinZoom ?? 0.36, T.cameraMaxZoom ?? 1.08);
        targetZ *= lerp(1, 1.12, this.player.edit.ambience || 0);
        this.cameraRig.targetZoom = targetZ;
        const heading = vectorFromAngle(this.player.heading);
        const leadDistance = span * clamp(this.intent?.burstLookAhead ?? 0, 0, 1.5);
        const targetX = this.player.centroidX + heading.x * leadDistance;
        const targetY = this.player.centroidY + heading.y * leadDistance;
        this.cameraRig.zoom = damp(this.cameraRig.zoom, this.cameraRig.targetZoom, T.cameraZoomDamp ?? 3.2, frameDt);
        this.cameraRig.x = damp(this.cameraRig.x, targetX, T.cameraPosDamp ?? 3.4, frameDt);
        this.cameraRig.y = damp(this.cameraRig.y, targetY, T.cameraPosDamp ?? 3.4, frameDt);
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

