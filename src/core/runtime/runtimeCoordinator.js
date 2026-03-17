const RuntimeCoordinator = {
    bootstrapScene(scene, options = {}) {
        scene.runtimeCoordinator = this;
        LegacySessionBridge.createOrReuse(scene, options);
        scene.runtimeMode = options.runtimeMode || scene.runtimeMode || 'mainflow';
        scene.sessionState.sessionFlags.runtimeMode = scene.runtimeMode;
        return scene.sessionState;
    },
    resetSession(scene, options = {}) {
        this.bootstrapScene(scene, options);
        return LegacySessionBridge.reset(scene, {
            runtimeMode: options.runtimeMode || scene.runtimeMode || 'mainflow',
            startSession: options.startSession !== false
        });
    },
    tickStaticFrame(scene, frameDt) {
        this.updateCamera(scene, frameDt);
        this.updateHud(scene, frameDt);
        scene.profileFrameSection('render', () => this.render(scene));
        scene.endFramePerformanceProbe();
    },
    preUpdateInput(scene, frameDt) {
        scene.profileFrameSection('preInput', () => {
            scene.handleModeInputs();

            if (scene.isDebugToolsEnabled() && !scene.player.dead && !scene.player.edit.active) {
                if (Phaser.Input.Keyboard.JustDown(scene.keys.expand)) {
                    scene.addDebugNode();
                    scene.expandHoldTimer = 0;
                    scene.expandAddCount = 0;
                    scene.nextExpandThreshold = 0.45;
                } else if (scene.keys.expand.isDown) {
                    scene.expandHoldTimer += frameDt;
                    if (scene.expandHoldTimer > scene.nextExpandThreshold) {
                        scene.addDebugNode();
                        scene.expandAddCount += 1;
                        const interval = Math.max(0.015, 0.18 * Math.pow(0.88, scene.expandAddCount));
                        scene.nextExpandThreshold += interval;
                    }
                }
            }
        });
    },
    updateIntent(scene, frameDt) {
        scene.profileFrameSection('intent', () => scene.readIntent(frameDt));
    },
    updateTopology(scene, frameDt, simDt) {
        scene.profileFrameSection('topology', () => {
            scene.updateEditMode(frameDt);
            scene.updatePulse(simDt);
        });
    },
    updateMovement(scene, simDt) {
        scene.profileFrameSection('movement', () => {
            scene.updateFormation(simDt);
            scene.updatePlayerState(simDt);
            scene.samplePlayerMobilityTelemetry?.(simDt);
        });
    },
    updatePrey(scene, simDt) {
        scene.profileFrameSection('prey', () => {
            scene.updateSpawns(simDt);
            scene.updatePrey(simDt);
            scene.resolvePreyNodeCollisions();
        });
    },
    updatePredation(scene, simDt) {
        scene.profileFrameSection('predation', () => scene.updatePredation(simDt));
    },
    updateProgression(scene, stepDt) {
        scene.profileFrameSection('progression', () => {
            scene.updateRunState?.(stepDt);
            scene.updateEffects(stepDt);
        });
    },
    updateCamera(scene, frameDt) {
        scene.profileFrameSection('camera', () => {
            scene.updateCamera(frameDt);
            scene.updateDisplay(frameDt);
        });
    },
    updateHud(scene, frameDt) {
        scene.profileFrameSection('hud', () => {
            scene.afterHudUpdate?.(frameDt);
        });
    },
    render(scene) {
        scene.render();
    },
    handleMenuAndPause(scene, frameDt) {
        if (scene.isMenuUiEnabled?.() && scene.ui && Phaser.Input.Keyboard.JustDown(scene.keys.cancel) && !scene.player.dead) {
            if (scene.menuMode === 'pause') {
                scene.endFramePerformanceProbe();
                scene.resumeGame();
                return true;
            }
            if (scene.menuMode === 'main') {
                scene.endFramePerformanceProbe();
                return true;
            }
            if (scene.player.edit.active) {
                scene.exitEditMode();
            } else if (scene.sessionStarted) {
                scene.endFramePerformanceProbe();
                scene.showPauseMenu();
                return true;
            }
        }

        if (scene.menuMode) {
            this.tickStaticFrame(scene, frameDt);
            return true;
        }

        if (scene.player.dead) {
            scene.player.deathTimer -= frameDt;
            if (Phaser.Input.Keyboard.JustDown(scene.keys.restart)
                || Phaser.Input.Keyboard.JustDown(scene.keys.cancel)
                || scene.player.deathTimer <= 0) {
                scene.endFramePerformanceProbe();
                scene.playAudioEvent?.('game_restart', { source: 'death-restart' });
                this.resetSession(scene, { startSession: true });
                scene.resumeGame?.();
                return true;
            }
        }

        if (scene.paused) {
            this.tickStaticFrame(scene, frameDt);
            return true;
        }

        if (!scene.player.dead && !scene.player.edit.active && Phaser.Input.Keyboard.JustDown(scene.keys.restart)) {
            scene.endFramePerformanceProbe();
            scene.playAudioEvent?.('game_restart', { source: 'manual-restart' });
            this.resetSession(scene, { startSession: true });
            return true;
        }

        return false;
    },
    tick(scene, deltaMs) {
        const frameDt = Math.min(deltaMs, 33) / 1000;
        scene.beginFramePerformanceProbe(deltaMs);
        scene.profileFrameSection('fpsOverlay', () => scene.updateFpsOverlay?.(deltaMs));

        if (scene.isStartupSequenceActive?.() && scene.updateStartupSequence(frameDt, deltaMs)) {
            return;
        }

        if (this.handleMenuAndPause(scene, frameDt)) {
            return;
        }

        this.preUpdateInput(scene, frameDt);
        this.updateIntent(scene, frameDt);

        const simDt = frameDt * scene.timeScaleFactor;
        scene.worldTime += simDt;

        if (!scene.player.dead) {
            this.updateTopology(scene, frameDt, simDt);
            this.updateMovement(scene, simDt);
            this.updatePrey(scene, simDt);
            this.updatePredation(scene, simDt);
            this.updateProgression(scene, simDt);
        } else {
            this.updateProgression(scene, frameDt);
        }

        this.updateCamera(scene, frameDt);
        this.updateHud(scene, frameDt);
        scene.profileFrameSection('render', () => this.render(scene));
        scene.endFramePerformanceProbe();
    }
};

window.RuntimeCoordinator = RuntimeCoordinator;
