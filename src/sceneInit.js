

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
            targetX: 0,
            targetY: 0,
            leadX: 0,
            leadY: 0,
            initialized: false,
            urgency: 0,
            subjectBounds: null,
            subjectSpan: 0,
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
    createCameraBoundsTracker() {
        return {
            minX: Infinity,
            maxX: -Infinity,
            minY: Infinity,
            maxY: -Infinity
        };
    },
    includeCameraBoundsPoint(bounds, x, y, padding = 0) {
        bounds.minX = Math.min(bounds.minX, x - padding);
        bounds.maxX = Math.max(bounds.maxX, x + padding);
        bounds.minY = Math.min(bounds.minY, y - padding);
        bounds.maxY = Math.max(bounds.maxY, y + padding);
    },
    finalizeCameraBounds(bounds, fallbackX, fallbackY, padding = 0) {
        if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minY)) {
            bounds.minX = fallbackX - padding;
            bounds.maxX = fallbackX + padding;
            bounds.minY = fallbackY - padding;
            bounds.maxY = fallbackY + padding;
        } else {
            bounds.minX -= padding;
            bounds.maxX += padding;
            bounds.minY -= padding;
            bounds.maxY += padding;
        }

        bounds.width = Math.max(1, bounds.maxX - bounds.minX);
        bounds.height = Math.max(1, bounds.maxY - bounds.minY);
        bounds.centerX = (bounds.minX + bounds.maxX) * 0.5;
        bounds.centerY = (bounds.minY + bounds.maxY) * 0.5;
        return bounds;
    },
    getCameraSubjectBounds() {
        const T = window.TUNING || {};
        const bounds = this.createCameraBoundsTracker();
        const fallbackX = this.player?.centroidX ?? 0;
        const fallbackY = this.player?.centroidY ?? 0;

        this.activeNodes.forEach((node) => {
            this.includeCameraBoundsPoint(bounds, node.x, node.y);
            if (node.anchored) {
                this.includeCameraBoundsPoint(bounds, node.anchorX, node.anchorY);
            }
        });

        if (this.player?.edit?.boxSelecting) {
            this.includeCameraBoundsPoint(bounds, this.player.edit.boxStartX, this.player.edit.boxStartY);
            this.includeCameraBoundsPoint(bounds, this.player.edit.boxEndX, this.player.edit.boxEndY);
        }

        const volumePadding = this.clusterVolume?.cameraPadding || 0;
        const padding = (T.cameraSpanPadding ?? 110) + volumePadding;
        return this.finalizeCameraBounds(bounds, fallbackX, fallbackY, padding);
    },
    getCameraFitZoom(bounds, edgePaddingPx = 0) {
        const usableWidth = Math.max(120, this.cameraRig.viewportWidth - edgePaddingPx * 2);
        const usableHeight = Math.max(120, this.cameraRig.viewportHeight - edgePaddingPx * 2);
        return Math.min(
            usableWidth / Math.max(bounds.width, 1),
            usableHeight / Math.max(bounds.height, 1)
        );
    },
    getCameraBaseFocus(bounds, span) {
        const T = window.TUNING || {};
        const tether = clamp(T.cameraClusterTether ?? 0.12, 0, 0.45);
        const clusterWeight = clamp((span - 320) / 2200, 0, 1) * tether;
        return {
            x: lerp(this.player.centroidX, bounds.centerX, clusterWeight),
            y: lerp(this.player.centroidY, bounds.centerY, clusterWeight)
        };
    },
    getCameraDesiredLead(span) {
        const T = window.TUNING || {};
        const viewportCenterX = this.cameraRig.viewportWidth * 0.5;
        const viewportCenterY = this.cameraRig.viewportHeight * 0.5;
        const pointer = this.input?.activePointer || { x: viewportCenterX, y: viewportCenterY };
        const screenDx = pointer.x - viewportCenterX;
        const screenDy = pointer.y - viewportCenterY;
        const screenDistance = Math.hypot(screenDx, screenDy);
        const flow = normalize(
            this.intent?.flowX ?? Math.cos(this.player.heading),
            this.intent?.flowY ?? Math.sin(this.player.heading),
            Math.cos(this.player.heading),
            Math.sin(this.player.heading)
        );
        const aim = normalize(screenDx, screenDy, flow.x, flow.y);
        const deadZone = T.cameraMouseDeadZone ?? 110;
        const responseRange = Math.max(80, Math.min(this.cameraRig.viewportWidth, this.cameraRig.viewportHeight) * 0.42 - deadZone);
        const aimAlpha = clamp((screenDistance - deadZone) / responseRange, 0, 1);
        const aimLeadMax = (T.cameraMouseLeadMax ?? 260) + Math.min(160, span * 0.012);
        const aimLeadDistance = aimLeadMax * Math.pow(aimAlpha, 0.82) * (T.cameraMouseInfluence ?? 0.46);
        const forwardBaseDistance = Math.min(280, span * clamp(T.cameraForwardInfluence ?? 0.16, 0, 0.5) * 0.18);
        const forwardLeadDistance = forwardBaseDistance * (0.15 + aimAlpha * 0.85)
            + clamp(this.intent?.burstLookAhead ?? 0, 0, 1.2) * 110;
        return {
            x: aim.x * aimLeadDistance + flow.x * forwardLeadDistance,
            y: aim.y * aimLeadDistance + flow.y * forwardLeadDistance,
            intensity: aimAlpha
        };
    },
    updateCamera(frameDt) {
        const T = window.TUNING || {};
        const edgePaddingPx = T.cameraEdgePadding ?? 74;
        const bounds = this.getCameraSubjectBounds();
        const span = Math.max(bounds.width, bounds.height);
        const previousSpan = Math.max(this.cameraRig.subjectSpan || span, 1);
        const spanChange = Math.abs(span - previousSpan) / previousSpan;
        const maxZoom = T.cameraMaxZoom ?? 1.12;
        const desiredZoom = clamp(
            this.getCameraFitZoom(bounds, edgePaddingPx) * lerp(1, 1.08, this.player.edit.ambience || 0),
            T.cameraMinZoom ?? 0.03,
            maxZoom
        );
        const baseFocus = this.getCameraBaseFocus(bounds, span);
        const desiredLead = this.getCameraDesiredLead(span);

        if (!this.cameraRig.initialized) {
            this.cameraRig.x = baseFocus.x;
            this.cameraRig.y = baseFocus.y;
            this.cameraRig.targetX = baseFocus.x;
            this.cameraRig.targetY = baseFocus.y;
            this.cameraRig.zoom = desiredZoom;
            this.cameraRig.targetZoom = desiredZoom;
            this.cameraRig.initialized = true;
        }

        this.cameraRig.leadX = damp(this.cameraRig.leadX, desiredLead.x, T.cameraLeadDamp ?? 10.5, frameDt);
        this.cameraRig.leadY = damp(this.cameraRig.leadY, desiredLead.y, T.cameraLeadDamp ?? 10.5, frameDt);
        const desiredFocusX = baseFocus.x + this.cameraRig.leadX;
        const desiredFocusY = baseFocus.y + this.cameraRig.leadY;
        this.cameraRig.targetX = damp(this.cameraRig.targetX, desiredFocusX, T.cameraFocusTrackDamp ?? 7.2, frameDt);
        this.cameraRig.targetY = damp(this.cameraRig.targetY, desiredFocusY, T.cameraFocusTrackDamp ?? 7.2, frameDt);
        const zoomTrackRate = (T.cameraZoomTrackDamp ?? 2.6) + clamp(spanChange * 10, 0, 6);
        this.cameraRig.targetZoom = damp(this.cameraRig.targetZoom, desiredZoom, zoomTrackRate, frameDt);
        const growthSnap = clamp((spanChange - 0.12) / 0.5, 0, 1);
        if (growthSnap > 0) {
            this.cameraRig.targetZoom = lerp(this.cameraRig.targetZoom, desiredZoom, growthSnap * 0.85);
        }

        const zoomRate = this.cameraRig.targetZoom < this.cameraRig.zoom
            ? (T.cameraZoomOutDamp ?? 4.4) + clamp(spanChange * 12, 0, 6)
            : (T.cameraZoomDamp ?? 1.8);
        const posRate = T.cameraPosDamp ?? 4.2;

        this.cameraRig.zoom = damp(this.cameraRig.zoom, this.cameraRig.targetZoom, zoomRate, frameDt);
        this.cameraRig.x = damp(this.cameraRig.x, this.cameraRig.targetX, posRate, frameDt);
        this.cameraRig.y = damp(this.cameraRig.y, this.cameraRig.targetY, posRate, frameDt);
        this.cameraRig.urgency = desiredLead.intensity;
        this.cameraRig.subjectBounds = bounds;
        this.cameraRig.subjectSpan = span;
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

