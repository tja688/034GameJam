

const SceneInitMixin = {
    createDefaultPerformanceProbe() {
        return {
            frame: 0,
            current: null,
            lastFrameMs: 0,
            lastPeakSection: '',
            lastPeakMs: 0,
            pendingDevourBurst: 0,
            lastDevourBurst: 0,
            pendingDevourBatch: 0,
            lastDevourBatch: 0
        };
    },
    beginFramePerformanceProbe(deltaMs = 16.67) {
        if (!this.performanceProbe) {
            this.performanceProbe = this.createDefaultPerformanceProbe();
        }
        this.performanceProbe.current = {
            frame: (this.performanceProbe.frame || 0) + 1,
            deltaMs: Number.isFinite(deltaMs) ? deltaMs : 0,
            sections: {}
        };
    },
    profileFrameSection(name, callback) {
        if (typeof callback !== 'function') {
            return undefined;
        }
        const probe = this.performanceProbe;
        if (!probe?.current || typeof performance?.now !== 'function') {
            return callback();
        }
        const startedAt = performance.now();
        const result = callback();
        const elapsed = performance.now() - startedAt;
        probe.current.sections[name] = (probe.current.sections[name] || 0) + elapsed;
        return result;
    },
    endFramePerformanceProbe() {
        const probe = this.performanceProbe;
        if (!probe?.current) {
            return;
        }

        let peakSection = '';
        let peakMs = 0;
        Object.entries(probe.current.sections).forEach(([name, value]) => {
            if (name === 'fpsOverlay') {
                return;
            }
            if (value > peakMs) {
                peakMs = value;
                peakSection = name;
            }
        });

        probe.frame = probe.current.frame;
        probe.lastFrameMs = probe.current.deltaMs;
        probe.lastPeakSection = peakSection;
        probe.lastPeakMs = peakMs;
        probe.lastDevourBurst = probe.pendingDevourBurst || 0;
        probe.lastDevourBatch = probe.pendingDevourBatch || 0;
        probe.pendingDevourBurst = 0;
        probe.pendingDevourBatch = 0;
        probe.current = null;
    },
    noteDevourBurst(count = 1) {
        if (!this.performanceProbe) {
            this.performanceProbe = this.createDefaultPerformanceProbe();
        }
        this.performanceProbe.pendingDevourBurst += Math.max(0, Math.round(count) || 0);
    },
    noteDevourBatch(count = 1) {
        if (!this.performanceProbe) {
            this.performanceProbe = this.createDefaultPerformanceProbe();
        }
        this.performanceProbe.pendingDevourBatch += Math.max(0, Math.round(count) || 0);
    },
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
            stableWeight: 0,
            cruiseWeight: 1,
            pursuitWeight: 0,
            huntWeight: 0
        };
    },
    createDefaultBurstDriveState() {
        return {
            rawPhase: 'cruise',
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
            worldDistance: 0,
            distanceNorm: 0,
            outwardSpeed: 0,
            pointerSpeed: 0,
            innerRadius: 0,
            middleRadius: 0,
            outerRadius: 0,
            stableWeight: 0,
            cruiseWeight: 1,
            pursuitWeight: 0,
            huntWeight: 0,
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
            maxEnergy: 100,
            shield: 0,
            shieldTimer: 0,
            mass: 1,
            energy: 78,
            guard: 0,
            overload: 0,
            echo: 0,
            tempoBoost: 0,
            agitation: 0,
            stability: 0.35,
            turnAssist: 0,
            feast: 0,
            feastGlow: 0,
            predationPressure: 0,
            growthBuffer: 0,
            nextGrowthCost: 3.2,
            metabolism: 0,
            energyFlash: 0,
            stagePulse: 0,
            victoryPulse: 0,
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
            pointerWorldDistance: 0,
            pointerDrivePhase: 'cruise',
            pointerDriveInnerRadius: 0,
            pointerDriveMiddleRadius: 0,
            pointerDriveOuterRadius: 0,
            pointerDriveStableWeight: 0,
            pointerDriveCruiseWeight: 1,
            pointerDrivePursuitWeight: 0,
            pointerDriveHuntWeight: 0,
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
            centerCompression: 0,
            clusterVolume: 0,
            clusterVolumeScale: 1,
            clusterVolumeForwardScale: 1,
            clusterVolumeLateralScale: 1
        };
    },
    createDefaultCameraRig() {
        const T = window.TUNING || {};
        const minZoom = T.cameraMinZoom ?? 0.03;
        const maxZoom = T.cameraMaxZoom ?? 1.12;
        const defaultZoom = clamp(T.cameraDefaultZoom ?? 0.92, minZoom, maxZoom);
        return {
            x: 0,
            y: 0,
            zoom: defaultZoom,
            targetZoom: defaultZoom,
            manualZoom: defaultZoom,
            desiredZoom: defaultZoom,
            targetX: 0,
            targetY: 0,
            leadX: 0,
            leadY: 0,
            baseFocusX: 0,
            baseFocusY: 0,
            focusX: 0,
            focusY: 0,
            compositionX: 0,
            compositionY: 0,
            shake: 0,
            hudShake: 0,
            shakeTime: 0,
            renderOffsetX: 0,
            renderOffsetY: 0,
            hudOffsetX: 0,
            hudOffsetY: 0,
            initialized: false,
            urgency: 0,
            subjectBounds: null,
            subjectSpan: 0,
            viewportWidth: this.scale.width,
            viewportHeight: this.scale.height
        };
    },
    createDefaultSpawnTimers() {
        return { small: 0.32, medium: 2.5, large: 8.5 };
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
        this.fragments = [];
        this.resetFragmentPool?.();
        this.prey = [];
        this.spawnTimers = this.createDefaultSpawnTimers();
        this.preySpawnCursor = { small: 0, medium: 1, large: 2 };
        this.preyIdCounter = 1;
        this.baseChain = [...DEFAULT_BASE_CHAIN];
        this.player = this.createDefaultPlayer();
        this.intent = this.createDefaultIntent();
        this.cameraRig = this.createDefaultCameraRig();
        this.clusterVolume = this.createDefaultClusterVolumeState();
        this.burstDrive = this.createDefaultBurstDriveState();
        this.performanceProbe = this.createDefaultPerformanceProbe();
        this.ecoTelemetry = this.createDefaultEcoTelemetry?.() || null;
        this.pendingDevourRewards = [];
        this.pendingLootRewardSources = {};
        this.poolNodes = this.createPoolNodesFromLibrary();
        this.runState = this.createDefaultRunState ? this.createDefaultRunState() : null;
        this.resetLivingEnergyBarState?.();
        this.player.topology = this.rebuildTopologyFromCurrentChain();
        this.activeNodes = [];
        this.links = [];
        this.rebuildFormation(true);
        if (typeof this.resetRunProgression === 'function') {
            this.resetRunProgression();
        }
        this.expandHoldTimer = 0;
        this.expandAddCount = 0;
        this.nextExpandThreshold = 0;
        this.refreshMenuState();
    },
    update(_, deltaMs) {
        const frameDt = Math.min(deltaMs, 33) / 1000;
        this.beginFramePerformanceProbe(deltaMs);
        this.profileFrameSection('fpsOverlay', () => this.updateFpsOverlay?.(deltaMs));

            if (this.ui && Phaser.Input.Keyboard.JustDown(this.keys.cancel) && !this.player.dead) {
                if (this.menuMode === 'pause') {
                    this.endFramePerformanceProbe();
                    this.resumeGame();
                    return;
                }
                if (this.menuMode === 'main') {
                    this.endFramePerformanceProbe();
                    return;
                }
                if (this.player.edit.active) {
                    this.exitEditMode();
                } else if (this.sessionStarted) {
                    this.endFramePerformanceProbe();
                    this.showPauseMenu();
                    return;
                }
            }

            if (this.menuMode) {
                this.profileFrameSection('camera', () => this.updateCamera(frameDt));
                this.profileFrameSection('display', () => this.updateDisplay(frameDt));
                this.profileFrameSection('render', () => this.render());
                this.endFramePerformanceProbe();
                return;
            }

            if (this.player.dead) {
                this.player.deathTimer -= frameDt;
                if (Phaser.Input.Keyboard.JustDown(this.keys.restart) || Phaser.Input.Keyboard.JustDown(this.keys.cancel) || this.player.deathTimer <= 0) {
                    this.endFramePerformanceProbe();
                    this.playAudioEvent?.('game_restart', { source: 'death-restart' });
                    this.resetSimulation(true);
                    this.resumeGame();
                    return;
                }
            }

            if (this.paused) {
                this.profileFrameSection('camera', () => this.updateCamera(frameDt));
                this.profileFrameSection('display', () => this.updateDisplay(frameDt));
                this.profileFrameSection('render', () => this.render());
                this.endFramePerformanceProbe();
                return;
            }

            if (this.isDebugToolsEnabled() && !this.player.dead && !this.player.edit.active) {
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
                this.endFramePerformanceProbe();
                this.playAudioEvent?.('game_restart', { source: 'manual-restart' });
                this.resetSimulation(true);
                return;
            }

            this.profileFrameSection('modeInputs', () => this.handleModeInputs());
            this.profileFrameSection('intent', () => this.readIntent(frameDt));
            this.profileFrameSection('editMode', () => this.updateEditMode(frameDt));

            const simDt = frameDt * this.timeScaleFactor;
            this.worldTime += simDt;

            if (!this.player.dead) {
                this.profileFrameSection('pulse', () => this.updatePulse(simDt));
                this.profileFrameSection('formation', () => this.updateFormation(simDt));
                this.profileFrameSection('playerState', () => this.updatePlayerState(simDt));
                this.profileFrameSection('telemetry', () => this.samplePlayerMobilityTelemetry?.(simDt));
                this.profileFrameSection('spawns', () => this.updateSpawns(simDt));
                this.profileFrameSection('prey', () => this.updatePrey(simDt));
                this.profileFrameSection('collisions', () => this.resolvePreyNodeCollisions());
                this.profileFrameSection('predation', () => this.updatePredation(simDt));
                if (typeof this.updateRunState === 'function') {
                    this.profileFrameSection('runState', () => this.updateRunState(simDt));
                }
                this.profileFrameSection('effects', () => this.updateEffects(simDt));
            } else {
                if (typeof this.updateRunState === 'function') {
                    this.profileFrameSection('runState', () => this.updateRunState(frameDt));
                }
                this.profileFrameSection('effects', () => this.updateEffects(frameDt));
            }

            this.profileFrameSection('camera', () => this.updateCamera(frameDt));
            this.profileFrameSection('display', () => this.updateDisplay(frameDt));
        this.profileFrameSection('render', () => this.render());
        this.endFramePerformanceProbe();
    },
    worldToScreen(x, y) {
        return {
            x: (x - this.cameraRig.x) * this.cameraRig.zoom + this.cameraRig.viewportWidth * 0.5 + (this.cameraRig.renderOffsetX || 0),
            y: (y - this.cameraRig.y) * this.cameraRig.zoom + this.cameraRig.viewportHeight * 0.5 + (this.cameraRig.renderOffsetY || 0)
        };
    },
    screenToWorld(x, y) {
        return {
            // Keep gameplay input stable even while combat feedback shakes the rendered camera.
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

        const padding = T.cameraSpanPadding ?? 110;
        return this.finalizeCameraBounds(bounds, fallbackX, fallbackY, padding);
    },
    getCameraFitZoom(bounds, edgePaddingPx = 0, compositionShift = null) {
        if (!compositionShift) {
            const usableWidth = Math.max(120, this.cameraRig.viewportWidth - edgePaddingPx * 2);
            const usableHeight = Math.max(120, this.cameraRig.viewportHeight - edgePaddingPx * 2);
            return Math.min(
                usableWidth / Math.max(bounds.width, 1),
                usableHeight / Math.max(bounds.height, 1)
            );
        }

        const viewportCenterX = this.cameraRig.viewportWidth * 0.5;
        const viewportCenterY = this.cameraRig.viewportHeight * 0.5;
        const subjectCenterX = viewportCenterX - compositionShift.x;
        const subjectCenterY = viewportCenterY - compositionShift.y;
        const leftSpace = Math.max(120, subjectCenterX - edgePaddingPx);
        const rightSpace = Math.max(120, this.cameraRig.viewportWidth - edgePaddingPx - subjectCenterX);
        const topSpace = Math.max(120, subjectCenterY - edgePaddingPx);
        const bottomSpace = Math.max(120, this.cameraRig.viewportHeight - edgePaddingPx - subjectCenterY);
        const leftExtent = Math.max(bounds.centerX - bounds.minX, 1);
        const rightExtent = Math.max(bounds.maxX - bounds.centerX, 1);
        const topExtent = Math.max(bounds.centerY - bounds.minY, 1);
        const bottomExtent = Math.max(bounds.maxY - bounds.centerY, 1);
        return Math.min(
            leftSpace / leftExtent,
            rightSpace / rightExtent,
            topSpace / topExtent,
            bottomSpace / bottomExtent
        );
    },
    getCameraAimState() {
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
        return {
            aim,
            alpha: clamp((screenDistance - deadZone) / responseRange, 0, 1),
            viewportCenterX,
            viewportCenterY
        };
    },
    getCameraBaseFocus(bounds, span, intensity = 0) {
        const T = window.TUNING || {};
        const tether = clamp(T.cameraClusterTether ?? 0.18, 0, 0.45);
        const centroidWeight = clamp((span - 320) / 2200, 0, 1) * tether * (1 - intensity);
        return {
            x: lerp(bounds.centerX, this.player.centroidX, centroidWeight),
            y: lerp(bounds.centerY, this.player.centroidY, centroidWeight)
        };
    },
    getCameraDesiredLead(bounds, zoom, edgePaddingPx = 0) {
        const T = window.TUNING || {};
        const aimState = this.getCameraAimState();
        const influence = clamp(T.cameraMouseInfluence ?? 0.68, 0, 2.4);
        const response = clamp(Math.pow(aimState.alpha, 0.74) * (0.42 + influence * 0.78), 0, 1.6);
        const forward = clamp(T.cameraForwardInfluence ?? 0.32, 0, 1.2) / 1.2;
        const halfScreenWidth = bounds.width * zoom * 0.5;
        const halfScreenHeight = bounds.height * zoom * 0.5;
        const frontAllowanceX = lerp(56, 232, forward);
        const frontAllowanceY = lerp(42, 176, forward);
        const baseLeadMax = T.cameraMouseLeadMax ?? 420;
        const compositionDemandX = Math.max(0, halfScreenWidth - frontAllowanceX);
        const compositionDemandY = Math.max(0, halfScreenHeight - frontAllowanceY);
        const smallLeadX = Math.min(baseLeadMax * 0.35, halfScreenWidth * 0.9 + 40);
        const smallLeadY = Math.min(baseLeadMax * 0.25, halfScreenHeight * 0.75 + 28);
        const desiredShiftX = Math.max(compositionDemandX, smallLeadX) * response;
        const desiredShiftY = Math.max(compositionDemandY, smallLeadY) * response;
        const clampedShiftX = Math.max(0, Math.min(aimState.viewportCenterX - edgePaddingPx - 32, desiredShiftX));
        const clampedShiftY = Math.max(0, Math.min(aimState.viewportCenterY - edgePaddingPx - 32, desiredShiftY));
        return {
            x: aimState.aim.x * clampedShiftX / Math.max(zoom, 0.0001),
            y: aimState.aim.y * clampedShiftY / Math.max(zoom, 0.0001),
            screenX: aimState.aim.x * clampedShiftX,
            screenY: aimState.aim.y * clampedShiftY,
            intensity: aimState.alpha
        };
    },
    updateCamera(frameDt) {
        const T = window.TUNING || {};
        const edgePaddingPx = T.cameraEdgePadding ?? 74;
        const bounds = this.getCameraSubjectBounds();
        const span = Math.max(bounds.width, bounds.height);
        const maxZoom = T.cameraMaxZoom ?? 1.12;
        const desiredZoom = clamp(
            this.cameraRig.manualZoom ?? (T.cameraDefaultZoom ?? this.cameraRig.zoom ?? 0.92),
            T.cameraMinZoom ?? 0.03,
            maxZoom
        );
        this.cameraRig.manualZoom = desiredZoom;
        const desiredLead = this.getCameraDesiredLead(bounds, desiredZoom, edgePaddingPx);
        const baseFocus = this.getCameraBaseFocus(bounds, span, desiredLead.intensity);

        if (!this.cameraRig.initialized) {
            this.cameraRig.x = baseFocus.x;
            this.cameraRig.y = baseFocus.y;
            this.cameraRig.targetX = baseFocus.x;
            this.cameraRig.targetY = baseFocus.y;
            this.cameraRig.zoom = desiredZoom;
            this.cameraRig.targetZoom = desiredZoom;
            this.cameraRig.manualZoom = desiredZoom;
            this.cameraRig.initialized = true;
        }

        this.cameraRig.leadX = damp(this.cameraRig.leadX, desiredLead.x, T.cameraLeadDamp ?? 10.5, frameDt);
        this.cameraRig.leadY = damp(this.cameraRig.leadY, desiredLead.y, T.cameraLeadDamp ?? 10.5, frameDt);
        const desiredFocusX = baseFocus.x + this.cameraRig.leadX;
        const desiredFocusY = baseFocus.y + this.cameraRig.leadY;
        this.cameraRig.targetX = damp(this.cameraRig.targetX, desiredFocusX, T.cameraFocusTrackDamp ?? 7.2, frameDt);
        this.cameraRig.targetY = damp(this.cameraRig.targetY, desiredFocusY, T.cameraFocusTrackDamp ?? 7.2, frameDt);
        const zoomTrackRate = T.cameraZoomTrackDamp ?? 2.6;
        this.cameraRig.targetZoom = damp(this.cameraRig.targetZoom, desiredZoom, zoomTrackRate, frameDt);

        const zoomRate = this.cameraRig.targetZoom < this.cameraRig.zoom
            ? (T.cameraZoomOutDamp ?? 4.4)
            : (T.cameraZoomDamp ?? 1.8);
        const posRate = T.cameraPosDamp ?? 4.2;

        this.cameraRig.zoom = damp(this.cameraRig.zoom, this.cameraRig.targetZoom, zoomRate, frameDt);
        this.cameraRig.x = damp(this.cameraRig.x, this.cameraRig.targetX, posRate, frameDt);
        this.cameraRig.y = damp(this.cameraRig.y, this.cameraRig.targetY, posRate, frameDt);
        this.cameraRig.desiredZoom = desiredZoom;
        this.cameraRig.baseFocusX = baseFocus.x;
        this.cameraRig.baseFocusY = baseFocus.y;
        this.cameraRig.focusX = desiredFocusX;
        this.cameraRig.focusY = desiredFocusY;
        this.cameraRig.compositionX = desiredLead.screenX;
        this.cameraRig.compositionY = desiredLead.screenY;
        this.cameraRig.urgency = desiredLead.intensity;
        this.cameraRig.subjectBounds = bounds;
        this.cameraRig.subjectSpan = span;
        this.cameraRig.shake = Math.max(0, (this.cameraRig.shake || 0) - frameDt * 2.8);
        this.cameraRig.hudShake = Math.max(0, (this.cameraRig.hudShake || 0) - frameDt * 3.4);
        this.cameraRig.shakeTime = (this.cameraRig.shakeTime || 0) + frameDt * (18 + this.cameraRig.shake * 36);
        const worldShake = Math.pow(this.cameraRig.shake || 0, 0.92);
        const hudShake = Math.pow(this.cameraRig.hudShake || 0, 0.92);
        this.cameraRig.renderOffsetX = (Math.sin(this.cameraRig.shakeTime * 1.7) + Math.cos(this.cameraRig.shakeTime * 2.4) * 0.62) * worldShake * 14;
        this.cameraRig.renderOffsetY = (Math.cos(this.cameraRig.shakeTime * 1.34) + Math.sin(this.cameraRig.shakeTime * 2.1) * 0.56) * worldShake * 10;
        this.cameraRig.hudOffsetX = (Math.sin(this.cameraRig.shakeTime * 1.9) + Math.cos(this.cameraRig.shakeTime * 2.8) * 0.4) * hudShake * 10;
        this.cameraRig.hudOffsetY = (Math.cos(this.cameraRig.shakeTime * 1.56) + Math.sin(this.cameraRig.shakeTime * 2.36) * 0.46) * hudShake * 8;
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
            node.predationWindow = Math.max(0, node.predationWindow - frameDt);
            node.spinVelocity = Math.max(0, node.spinVelocity - frameDt * 18);
            node.feedPulse = Math.max(0, node.feedPulse - frameDt * 1.6);
            node.hookTension = Math.max(0, node.hookTension - frameDt * 2.8);
            node.biteGlow = Math.max(0, node.biteGlow - frameDt * 2.2);
            node.absorbLoad = Math.max(0, node.absorbLoad - frameDt * 1.7);
            node.absorbJitter = Math.max(0, node.absorbJitter - frameDt * 3.6);
            node.absorbFlash = Math.max(0, node.absorbFlash - frameDt * 2.4);
            node.lootTargetCount = Math.max(0, Math.floor((node.lootTargetCount || 0) * 0.8));
            const facingX = node.shape === 'triangle'
                ? (node.attackDirX || node.vx || Math.cos(this.player.heading))
                : (node.vx || node.attackDirX || Math.cos(this.player.heading));
            const facingY = node.shape === 'triangle'
                ? (node.attackDirY || node.vy || Math.sin(this.player.heading))
                : (node.vy || node.attackDirY || Math.sin(this.player.heading));
            const targetAngle = Math.atan2(facingY, facingX) + (node.shape === 'square' ? (node.spinVelocity || 0) * 0.035 : 0);
            const currentAngle = Number.isFinite(node.displayAngle) ? node.displayAngle : targetAngle;
            node.displayAngle = dampAngle(currentAngle, targetAngle, 16, frameDt);
        });
        this.updateLivingEnergyBar?.(frameDt);
    },
};

