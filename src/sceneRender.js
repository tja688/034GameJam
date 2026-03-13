

const SceneRenderMixin = {
    createRing(x, y, radius, color, life, thickness, meta = null) {
        const ringMeta = typeof meta === 'string'
            ? { source: meta }
            : meta && typeof meta === 'object'
                ? meta
                : {};
        this.effects.push({
            type: 'ring',
            x,
            y,
            radius,
            color,
            life,
            total: life,
            thickness,
            source: ringMeta.source || 'generic'
        });
    },
    isGraphicsToggleEnabled(key, fallback = true) {
        return !this.getRunTuningToggle || this.getRunTuningToggle(key, fallback);
    },
    isMinimalRenderModeEnabled() {
        return this.isGraphicsToggleEnabled('graphicsMinimalRenderMode', false);
    },
    isDeathGraphicsClusterEnabled() {
        return this.isGraphicsToggleEnabled('graphicsRenderPreyDeathClusterEnabled', true);
    },
    isEffectVisible(effect) {
        if (!this.isGraphicsToggleEnabled('graphicsRenderEffectsEnabled', true)) {
            return false;
        }
        if (effect.type !== 'ring') {
            return true;
        }
        if (!this.isGraphicsToggleEnabled('graphicsRenderRingEffectsEnabled', true)) {
            return false;
        }
        switch (effect.source) {
            case 'prey-death':
                return this.isDeathGraphicsClusterEnabled()
                    && this.isGraphicsToggleEnabled('graphicsRenderPreyDeathRingsVisible', true);
            case 'prey-guard':
                return this.isGraphicsToggleEnabled('graphicsRenderPreySignalsEnabled', true)
                    && this.isGraphicsToggleEnabled('graphicsRenderPreyGuardRingsVisible', true);
            case 'player-growth':
            case 'objective-spawn':
            case 'stage-advance':
            case 'player-victory':
            case 'player-death':
                return this.isGraphicsToggleEnabled('graphicsRenderProgressionRingsVisible', true);
            default:
                return true;
        }
    },
    initBakedSpriteRenderer() {
        if (this.bakedSpriteRendererInitialized) {
            return;
        }
        this.buildBakedRenderTextures();
        this.bakedSpriteMetrics = {
            shapeLogicalSize: 100,
            ringLogicalRadius: 50,
            lineLogicalLength: 100,
            lineLogicalThickness: 6
        };
        this.bakedSpriteLayers = {
            fragments: this.add.layer().setDepth(6),
            prey: this.add.layer().setDepth(8),
            predation: this.add.layer().setDepth(10),
            effects: this.add.layer().setDepth(30)
        };
        this.bakedSpritePools = {
            fragments: { layer: this.bakedSpriteLayers.fragments, sprites: [], cursor: 0 },
            prey: { layer: this.bakedSpriteLayers.prey, sprites: [], cursor: 0 },
            predation: { layer: this.bakedSpriteLayers.predation, sprites: [], cursor: 0 },
            effects: { layer: this.bakedSpriteLayers.effects, sprites: [], cursor: 0 }
        };
        this.bakedSpriteRendererInitialized = true;
    },
    buildBakedRenderTextures() {
        const textureDefs = [
            { key: 'baked-shape-circle', width: 128, height: 128, draw: (g) => drawShape(g, 'circle', 64, 64, 100, 0xffffff, 1, 0) },
            { key: 'baked-shape-square', width: 128, height: 128, draw: (g) => drawShape(g, 'square', 64, 64, 100, 0xffffff, 1, 0) },
            { key: 'baked-shape-triangle', width: 128, height: 128, draw: (g) => drawShape(g, 'triangle', 64, 64, 100, 0xffffff, 1, 0) },
            {
                key: 'baked-ring-circle',
                width: 128,
                height: 128,
                draw: (g) => {
                    g.lineStyle(8, 0xffffff, 1);
                    g.strokeCircle(64, 64, 50);
                }
            },
            {
                key: 'baked-line-core',
                width: 128,
                height: 16,
                draw: (g) => {
                    g.fillStyle(0xffffff, 1);
                    g.fillRect(14, 5, 100, 6);
                }
            },
            {
                key: 'baked-hud-strip',
                width: 256,
                height: 32,
                draw: (g) => {
                    g.fillStyle(0xffffff, 1);
                    g.fillRect(0, 0, 256, 32);
                }
            }
        ];
        const scratch = this.add.graphics();
        scratch.setVisible(false);
        textureDefs.forEach((def) => {
            if (this.textures.exists(def.key)) {
                return;
            }
            scratch.clear();
            def.draw(scratch);
            scratch.generateTexture(def.key, def.width, def.height);
        });
        scratch.destroy();
    },
    createDefaultLivingEnergyBarState() {
        return {
            initialized: false,
            seed: Math.random() * Math.PI * 2,
            container: null,
            shadowStrip: null,
            trackStrip: null,
            ghostStrip: null,
            glowStrip: null,
            fillStrip: null,
            flashStrip: null,
            growthStrip: null,
            displayLength: 0,
            displayEnergy: 0,
            displayGhost: 0,
            displayGrowth: 0,
            lossPulse: 0,
            gainPulse: 0,
            overloadPulse: 0,
            growthKick: 0,
            biomassPulse: 0,
            impulseIndex: 0,
            swayX: 0,
            swayXVelocity: 0,
            swayY: 0,
            swayYVelocity: 0,
            rotation: 0,
            rotationVelocity: 0,
            lengthPush: 0,
            lengthVelocity: 0,
            thicknessPush: 0,
            thicknessVelocity: 0,
            fillLift: 0,
            fillLiftVelocity: 0,
            tipLift: 0,
            tipLiftVelocity: 0,
            edgeNudge: 0,
            edgeNudgeVelocity: 0,
            lossBurstQueue: 0,
            lossBurstStrength: 0,
            lossBurstTimer: 0,
            jitterX: 0,
            jitterY: 0,
            jitterRotation: 0,
            jitterTargetX: 0,
            jitterTargetY: 0,
            jitterTargetRotation: 0,
            jitterTimer: 0,
            dropletSprites: [],
            droplets: [],
            metrics: {
                visible: false,
                centerX: 0,
                top: 0,
                left: 0,
                width: 0,
                height: 0,
                bottom: 0
            }
        };
    },
    ensureLivingEnergyBarState() {
        if (!this.livingEnergyBarState) {
            this.livingEnergyBarState = this.createDefaultLivingEnergyBarState();
        }
        return this.livingEnergyBarState;
    },
    createLivingEnergyBarStrip(state, blendMode = Phaser.BlendModes.NORMAL) {
        const sprite = this.add.image(0, 0, 'baked-hud-strip');
        sprite.setOrigin(0, 0.5);
        sprite.setScrollFactor(0);
        sprite.setBlendMode(blendMode);
        state.container.add(sprite);
        return sprite;
    },
    initLivingEnergyBar() {
        this.initBakedSpriteRenderer?.();
        const state = this.ensureLivingEnergyBarState();
        if (state.initialized && state.container) {
            return state;
        }

        if (state.container) {
            state.container.destroy(true);
        }

        state.container = this.add.layer();
        state.container.setDepth(39);
        state.shadowStrip = this.createLivingEnergyBarStrip(state);
        state.trackStrip = this.createLivingEnergyBarStrip(state);
        state.ghostStrip = this.createLivingEnergyBarStrip(state);
        state.glowStrip = this.createLivingEnergyBarStrip(state, Phaser.BlendModes.ADD);
        state.fillStrip = this.createLivingEnergyBarStrip(state);
        state.flashStrip = this.createLivingEnergyBarStrip(state, Phaser.BlendModes.ADD);
        state.growthStrip = this.createLivingEnergyBarStrip(state, Phaser.BlendModes.ADD);
        state.dropletSprites = [];
        state.droplets = [];
        for (let i = 0; i < 10; i += 1) {
            state.dropletSprites.push(this.createLivingEnergyBarStrip(state));
            state.droplets.push({
                active: false,
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                width: 0,
                height: 0,
                alpha: 0,
                rotation: 0,
                rotationVelocity: 0,
                life: 0,
                total: 0,
                color: COLORS.energy
            });
        }

        state.initialized = true;
        state.container.setVisible(false);
        return state;
    },
    resetLivingEnergyBarState() {
        const state = this.ensureLivingEnergyBarState();
        const energyRatio = clamp((this.player?.energy || 0) / Math.max(1, this.player?.maxEnergy || 100), 0, 1);
        const growthRatio = this.getGrowthRatio ? this.getGrowthRatio() : 0;
        state.displayLength = 0;
        state.displayEnergy = energyRatio;
        state.displayGhost = energyRatio;
        state.displayGrowth = growthRatio;
        state.lossPulse = 0;
        state.gainPulse = 0;
        state.overloadPulse = 0;
        state.growthKick = 0;
        state.biomassPulse = 0;
        state.impulseIndex = 0;
        state.swayX = 0;
        state.swayXVelocity = 0;
        state.swayY = 0;
        state.swayYVelocity = 0;
        state.rotation = 0;
        state.rotationVelocity = 0;
        state.lengthPush = 0;
        state.lengthVelocity = 0;
        state.thicknessPush = 0;
        state.thicknessVelocity = 0;
        state.fillLift = 0;
        state.fillLiftVelocity = 0;
        state.tipLift = 0;
        state.tipLiftVelocity = 0;
        state.edgeNudge = 0;
        state.edgeNudgeVelocity = 0;
        state.lossBurstQueue = 0;
        state.lossBurstStrength = 0;
        state.lossBurstTimer = 0;
        state.jitterX = 0;
        state.jitterY = 0;
        state.jitterRotation = 0;
        state.jitterTargetX = 0;
        state.jitterTargetY = 0;
        state.jitterTargetRotation = 0;
        state.jitterTimer = 0;
        (state.droplets || []).forEach((droplet, index) => {
            droplet.active = false;
            const sprite = state.dropletSprites?.[index];
            if (sprite) {
                sprite.setVisible(false);
            }
        });
        if (state.container) {
            state.container.setVisible(false);
        }
        return state;
    },
    emitLivingEnergyBarEvent(type, magnitude = 0, meta = null) {
        const state = this.ensureLivingEnergyBarState();
        const payload = meta && typeof meta === 'object' ? meta : {};
        const amount = Math.max(0, magnitude || 0);
        if (type === 'loss') {
            const lossAmount = payload.source === 'pulse' ? amount * 0.26 : amount;
            state.lossPulse = Math.max(state.lossPulse, lossAmount);
            this.applyLivingEnergyBarImpulse(state, type, lossAmount, payload);
            const burstWeight = payload.source === 'pulse' ? 0.4 : 1;
            state.lossBurstQueue = Math.min(12, (state.lossBurstQueue || 0) + Math.max(1, Math.round((1 + lossAmount * 1.6) * burstWeight)));
            state.lossBurstStrength = Math.max(state.lossBurstStrength || 0, lossAmount * burstWeight);
            return;
        }
        if (type === 'gain') {
            state.gainPulse = Math.max(state.gainPulse, amount);
            state.biomassPulse = Math.max(state.biomassPulse, amount * 0.42);
            this.applyLivingEnergyBarImpulse(state, type, amount, payload);
            if (payload.overflow > 0 || payload.wasFull) {
                const overloadAmount = amount + payload.overflow * 0.5;
                state.overloadPulse = Math.max(state.overloadPulse, overloadAmount);
                this.applyLivingEnergyBarImpulse(state, 'overload', overloadAmount, payload);
            }
            return;
        }
        if (type === 'overload') {
            state.overloadPulse = Math.max(state.overloadPulse, amount);
            state.gainPulse = Math.max(state.gainPulse, amount * 0.4);
            this.applyLivingEnergyBarImpulse(state, type, amount, payload);
            return;
        }
        if (type === 'growth') {
            state.growthKick = Math.max(state.growthKick, amount);
            state.biomassPulse = Math.max(state.biomassPulse, amount * 0.5);
            this.applyLivingEnergyBarImpulse(state, type, amount, payload);
            return;
        }
        if (type === 'biomass') {
            state.biomassPulse = Math.max(state.biomassPulse, amount);
            this.applyLivingEnergyBarImpulse(state, type, amount, payload);
        }
    },
    getLivingEnergyBarCapacityRatio() {
        const baseNodes = DEFAULT_BASE_CHAIN.length;
        const maxNodesBonus = Math.round(this.getRunTuningValue?.('gameplayStageMaxNodesBonus', 0) || 0);
        const maxNodes = DEMO_STAGE_DEFS.reduce((highest, stage) => Math.max(
            highest,
            Math.max(baseNodes, (stage.maxNodes || baseNodes) + maxNodesBonus)
        ), baseNodes);
        const currentNodes = this.activeNodes?.length || this.player?.chain?.length || baseNodes;
        const growthLead = clamp(this.getGrowthRatio ? this.getGrowthRatio() : 0, 0, 1) * 0.75;
        return clamp(
            (currentNodes + growthLead - baseNodes) / Math.max(1, maxNodes - baseNodes),
            0,
            1
        );
    },
    getLivingEnergyBarTargetLength() {
        const baseLength = Math.max(40, this.getRunTuningValue?.('gameplayLivingEnergyBarBaseLength', 122) || 122);
        const growthLength = Math.max(0, this.getRunTuningValue?.('gameplayLivingEnergyBarGrowthLength', 250) || 250);
        return baseLength + growthLength * this.getLivingEnergyBarCapacityRatio();
    },
    setLivingEnergyBarStrip(sprite, x, y, width, height, color, alpha, rotation = 0) {
        if (!sprite) {
            return;
        }
        const visible = width > 0.25 && height > 0.25 && alpha > 0.003;
        sprite.setVisible(visible);
        if (!visible) {
            return;
        }
        sprite.setPosition(x, y);
        sprite.setDisplaySize(Math.max(0.25, width), Math.max(0.25, height));
        sprite.setRotation(rotation);
        sprite.setTint(color);
        sprite.setAlpha(alpha);
    },
    stepLivingEnergyBarSpring(state, key, velocityKey, stiffness, damping, frameDt) {
        if (!state || frameDt <= 0) {
            return;
        }
        const value = state[key] || 0;
        const velocity = state[velocityKey] || 0;
        const nextVelocity = (velocity - value * stiffness * frameDt) * Math.exp(-damping * frameDt);
        state[velocityKey] = nextVelocity;
        state[key] = value + nextVelocity * frameDt;
    },
    applyLivingEnergyBarImpulse(state, type, magnitude = 0, meta = null) {
        if (!state || magnitude <= 0.0001) {
            return;
        }
        state.impulseIndex = (state.impulseIndex || 0) + 1;
        const payload = meta && typeof meta === 'object' ? meta : {};
        const phase = state.impulseIndex * 12.9898 + state.seed * 37.719;
        const lateralBias = clamp(
            Math.sin(phase) * 0.68 + Math.sin(phase * 0.47 + 1.3) * 0.32,
            -1,
            1
        );
        const addClamped = (key, value, min, max) => {
            state[key] = clamp((state[key] || 0) + value, min, max);
        };

        if (type === 'loss') {
            const pulseLossScale = payload.source === 'pulse' ? 0.38 : 1;
            addClamped('swayXVelocity', lateralBias * (8 + magnitude * 18) * pulseLossScale, -120, 120);
            addClamped('swayYVelocity', (2 + magnitude * 7) * pulseLossScale, -90, 90);
            addClamped('rotationVelocity', lateralBias * (0.04 + magnitude * 0.1) * pulseLossScale, -0.9, 0.9);
            addClamped('lengthVelocity', -(70 + magnitude * 110) * pulseLossScale, -420, 420);
            addClamped('thicknessVelocity', -(24 + magnitude * 44) * Math.max(0.45, pulseLossScale), -260, 260);
            addClamped('fillLiftVelocity', -(0.55 + magnitude * 0.8) * pulseLossScale, -8, 8);
            return;
        }

        if (type === 'loss-step') {
            addClamped('swayXVelocity', lateralBias * (4 + magnitude * 9), -120, 120);
            addClamped('rotationVelocity', lateralBias * (0.018 + magnitude * 0.05), -0.9, 0.9);
            addClamped('lengthVelocity', -(34 + magnitude * 60), -420, 420);
            addClamped('thicknessVelocity', -(12 + magnitude * 20), -260, 260);
            addClamped('edgeNudgeVelocity', -(7 + magnitude * 16), -160, 160);
            return;
        }

        if (type === 'gain') {
            addClamped('swayXVelocity', lateralBias * (5 + magnitude * 12), -120, 120);
            addClamped('swayYVelocity', -(6 + magnitude * 14), -120, 90);
            addClamped('rotationVelocity', lateralBias * (0.025 + magnitude * 0.07), -0.9, 0.9);
            addClamped('lengthVelocity', 54 + magnitude * 90, -420, 420);
            addClamped('thicknessVelocity', 30 + magnitude * 56, -260, 260);
            addClamped('fillLiftVelocity', 0.9 + magnitude * 1.35, -8, 8);
            addClamped('tipLiftVelocity', -(2 + magnitude * 5), -140, 140);
            return;
        }

        if (type === 'overload') {
            addClamped('swayXVelocity', lateralBias * (8 + magnitude * 14), -120, 120);
            addClamped('swayYVelocity', -(8 + magnitude * 18), -120, 90);
            addClamped('rotationVelocity', lateralBias * (0.04 + magnitude * 0.1), -0.9, 0.9);
            addClamped('lengthVelocity', 84 + magnitude * 126, -420, 420);
            addClamped('thicknessVelocity', 42 + magnitude * 72, -260, 260);
            addClamped('fillLiftVelocity', 1 + magnitude * 1.45, -8, 8);
            addClamped('tipLiftVelocity', -(4 + magnitude * 8), -140, 140);
            return;
        }

        if (type === 'growth') {
            addClamped('swayXVelocity', lateralBias * (4 + magnitude * 10), -120, 120);
            addClamped('swayYVelocity', -(4 + magnitude * 10), -120, 90);
            addClamped('rotationVelocity', lateralBias * (0.02 + magnitude * 0.05), -0.9, 0.9);
            addClamped('lengthVelocity', 74 + magnitude * 118, -420, 420);
            addClamped('thicknessVelocity', 18 + magnitude * 34, -260, 260);
            addClamped('fillLiftVelocity', 0.4 + magnitude * 0.7, -8, 8);
            addClamped('tipLiftVelocity', -(2 + magnitude * 4), -140, 140);
            return;
        }

        if (type === 'biomass') {
            addClamped('lengthVelocity', 16 + magnitude * 34, -420, 420);
            addClamped('thicknessVelocity', 8 + magnitude * 18, -260, 260);
        }
    },
    emitLivingEnergyBarDroplets(state, count, rootX, rootY, color, widthBase, heightBase, speedBase) {
        if (!state || count <= 0) {
            return;
        }
        const droplets = state.droplets || [];
        for (let i = 0; i < droplets.length && count > 0; i += 1) {
            const droplet = droplets[i];
            if (droplet.active) {
                continue;
            }
            const lateral = Math.sin((state.impulseIndex + i * 0.7) * 6.123 + state.seed * 1.7);
            const lift = Math.cos((state.impulseIndex + i * 0.43) * 5.217 + state.seed * 0.9);
            droplet.active = true;
            droplet.x = rootX + lateral * Math.max(8, widthBase * 0.18);
            droplet.y = rootY;
            droplet.vx = lateral * (8 + speedBase * 0.24);
            droplet.vy = 18 + speedBase * (0.48 + (lift + 1) * 0.08);
            droplet.width = clamp(widthBase * (0.18 + Math.abs(lateral) * 0.08), 4, 14);
            droplet.height = clamp(heightBase * (0.34 + (lift + 1) * 0.12), 5, 16);
            droplet.alpha = 0.44 + Math.abs(lateral) * 0.18;
            droplet.rotation = lateral * 0.18;
            droplet.rotationVelocity = lateral * (0.7 + speedBase * 0.012);
            droplet.total = 0.28 + Math.abs(lift) * 0.12;
            droplet.life = droplet.total;
            droplet.color = color;
            count -= 1;
        }
    },
    updateLivingEnergyBar(frameDt) {
        let state = null;
        try {
            state = this.initLivingEnergyBar();
        } catch (error) {
            console.error('Living energy bar init failed:', error);
            this.livingEnergyBarBroken = true;
            return;
        }
        if (!state || this.livingEnergyBarBroken) {
            state?.container?.setVisible(false);
            return;
        }
        try {
            const hudEnabled = this.isGraphicsToggleEnabled('graphicsRenderHudEnabled', true);
            const minimalRender = this.getRunTuningToggle?.('graphicsMinimalRenderMode', false);
            const barEnabled = this.getRunTuningToggle?.('gameplayLivingEnergyBarEnabled', true);
            const visible = !!(
                state?.container
                && this.sessionStarted
                && this.menuMode !== 'main'
                && hudEnabled
                && !minimalRender
                && barEnabled
            );

            state.metrics.visible = visible;
            if (!visible) {
                state.lossPulse = Math.max(0, state.lossPulse - frameDt * 4.8);
                state.gainPulse = Math.max(0, state.gainPulse - frameDt * 3.8);
                state.overloadPulse = Math.max(0, state.overloadPulse - frameDt * 2.6);
                state.growthKick = Math.max(0, state.growthKick - frameDt * 2.2);
                state.biomassPulse = Math.max(0, state.biomassPulse - frameDt * 2.4);
                (state.droplets || []).forEach((droplet, index) => {
                    droplet.active = false;
                    state.dropletSprites?.[index]?.setVisible(false);
                });
                state.container?.setVisible(false);
                return;
            }

            const topOffset = this.getRunTuningValue?.('gameplayLivingEnergyBarTopOffset', 0) || 0;
            const idleMotion = Math.max(0, this.getRunTuningValue?.('gameplayLivingEnergyBarIdleMotion', 0.72) || 0.72);
            const damageViolence = Math.max(0, this.getRunTuningValue?.('gameplayLivingEnergyBarDamageViolence', 1.36) || 1.36);
            const gainViolence = Math.max(0, this.getRunTuningValue?.('gameplayLivingEnergyBarGainViolence', 1.18) || 1.18);
            const overloadViolence = Math.max(0, this.getRunTuningValue?.('gameplayLivingEnergyBarOverloadViolence', 1.7) || 1.7);
            const growthViolence = Math.max(0, this.getRunTuningValue?.('gameplayLivingEnergyBarGrowthViolence', 1.24) || 1.24);
            const thickness = Math.max(4, this.getRunTuningValue?.('gameplayLivingEnergyBarThickness', 12) || 12);
            const energyRatio = clamp((this.player?.energyDisplay || this.player?.energy || 0) / Math.max(1, this.player?.maxEnergy || 100), 0, 1);
            const ghostRatio = clamp((this.player?.energyGhost || this.player?.energy || 0) / Math.max(1, this.player?.maxEnergy || 100), 0, 1);
            const growthRatio = clamp(this.getGrowthRatio ? this.getGrowthRatio() : 0, 0, 1);
            const lowEnergy = clamp(this.runState?.lowEnergyPulse || 0, 0, 1);
            const beat = clamp(this.runState?.energyBeat || 0, 0, 1);
            const palette = this.getRunPalette ? this.getRunPalette() : { pulse: COLORS.pulse, signal: COLORS.core };
            const targetLength = this.getLivingEnergyBarTargetLength();
            const lengthDamp = 9.2 + growthRatio * 1.6;

            state.lossPulse = Math.max(0, state.lossPulse - frameDt * 4.8);
            state.gainPulse = Math.max(0, state.gainPulse - frameDt * 3.8);
            state.overloadPulse = Math.max(0, state.overloadPulse - frameDt * 2.6);
            state.growthKick = Math.max(0, state.growthKick - frameDt * 2.2);
            state.biomassPulse = Math.max(0, state.biomassPulse - frameDt * 2.4);
            state.displayEnergy = damp(state.displayEnergy || energyRatio, energyRatio, energyRatio >= (state.displayEnergy || 0) ? 18 : 24, frameDt);
            state.displayGhost = damp(state.displayGhost || ghostRatio, ghostRatio, ghostRatio >= (state.displayGhost || 0) ? 5.2 : 8.4, frameDt);
            state.displayGrowth = damp(state.displayGrowth || growthRatio, growthRatio, 8.4, frameDt);
            state.displayLength = damp(state.displayLength || targetLength, targetLength, lengthDamp, frameDt);

            this.stepLivingEnergyBarSpring(state, 'swayX', 'swayXVelocity', 56, 9.2, frameDt);
            this.stepLivingEnergyBarSpring(state, 'swayY', 'swayYVelocity', 62, 10.4, frameDt);
            this.stepLivingEnergyBarSpring(state, 'rotation', 'rotationVelocity', 84, 11.8, frameDt);
            this.stepLivingEnergyBarSpring(state, 'lengthPush', 'lengthVelocity', 86, 10.5, frameDt);
            this.stepLivingEnergyBarSpring(state, 'thicknessPush', 'thicknessVelocity', 96, 12.4, frameDt);
            this.stepLivingEnergyBarSpring(state, 'fillLift', 'fillLiftVelocity', 102, 13.4, frameDt);
            this.stepLivingEnergyBarSpring(state, 'tipLift', 'tipLiftVelocity', 78, 10.4, frameDt);
            this.stepLivingEnergyBarSpring(state, 'edgeNudge', 'edgeNudgeVelocity', 120, 15.5, frameDt);

            const loss = state.lossPulse * damageViolence;
            const gain = state.gainPulse * gainViolence;
            const overload = state.overloadPulse * overloadViolence;
            const grow = state.growthKick * growthViolence + state.biomassPulse * 0.42;
            const tremorActivity = clamp(0.2 + idleMotion * 0.1 + lowEnergy * 0.14 + loss * 0.16 + gain * 0.08 + overload * 0.1, 0, 1.4);
            state.jitterTimer = Math.max(0, (state.jitterTimer || 0) - frameDt);
            if ((state.jitterTimer || 0) <= 0) {
                const jitterSeed = state.seed + (state.impulseIndex || 0) * 0.19 + this.worldTime * 11.7;
                const jitterAmpX = 0.18 + tremorActivity * 0.65;
                const jitterAmpY = 0.14 + tremorActivity * 0.46;
                const jitterAmpRot = 0.0018 + tremorActivity * 0.0048;
                state.jitterTargetX = Math.sin(jitterSeed * 1.23) * jitterAmpX;
                state.jitterTargetY = Math.sin(jitterSeed * 1.81 + 0.6) * jitterAmpY;
                state.jitterTargetRotation = Math.sin(jitterSeed * 1.57 + 1.1) * jitterAmpRot;
                state.jitterTimer = 0.018 + Math.max(0.012, 0.038 - tremorActivity * 0.01);
            }
            state.jitterX = damp(state.jitterX || 0, state.jitterTargetX || 0, 34, frameDt);
            state.jitterY = damp(state.jitterY || 0, state.jitterTargetY || 0, 34, frameDt);
            state.jitterRotation = damp(state.jitterRotation || 0, state.jitterTargetRotation || 0, 34, frameDt);

            state.lossBurstTimer = Math.max(0, (state.lossBurstTimer || 0) - frameDt);
            if ((state.lossBurstQueue || 0) > 0 && (state.lossBurstTimer || 0) <= 0) {
                const burstStrength = Math.max(0.08, state.lossBurstStrength || 0.1);
                this.applyLivingEnergyBarImpulse(state, 'loss-step', burstStrength);
                state.lossBurstQueue -= 1;
                state.lossBurstStrength = Math.max(0, burstStrength * 0.86);
                state.lossBurstTimer = 0.028 + Math.min(0.022, burstStrength * 0.012);
            }

            const baseHeight = thickness * (1 + beat * 0.06 + lowEnergy * 0.05);
            const actualLength = clamp(
                state.displayLength + state.lengthPush,
                Math.max(36, targetLength * 0.62),
                targetLength + 56 + overload * 22 + grow * 18
            );
            const bodyHeight = clamp(
                baseHeight + state.thicknessPush,
                Math.max(4, thickness * 0.58),
                thickness * 2.2 + 14 + overload * 6
            );
            const innerInset = clamp(bodyHeight * 0.16, 1.6, 4.2);
            const fillHeight = clamp(
                bodyHeight - innerInset * 2 + state.fillLift * 1.6,
                bodyHeight * 0.42,
                bodyHeight + 10
            );
            const fillPixels = Math.max(0, actualLength * clamp(state.displayEnergy, 0, 1) + Math.min(0, state.edgeNudge || 0));
            const ghostPixels = Math.max(0, actualLength * clamp(state.displayGhost, 0, 1) - fillPixels);
            const growthPixels = actualLength * clamp(state.displayGrowth, 0, 1);
            const overloadPixels = clamp(
                Math.max(0, overload * 22 + Math.max(0, gain - 0.14) * 4 + Math.max(0, -state.tipLift) * 0.28),
                0,
                Math.max(10, actualLength * 0.16)
            );

            const idleOffsetX = (
                Math.sin(this.worldTime * (0.84 + idleMotion * 0.18) + state.seed) * 0.6
                + Math.sin(this.worldTime * 1.37 + state.seed * 1.9) * 0.26
            ) * idleMotion * 0.55;
            const idleOffsetY = Math.sin(this.worldTime * (0.92 + idleMotion * 0.12) + state.seed * 0.6) * idleMotion * 0.32;
            const idleRotation = (
                Math.sin(this.worldTime * 0.72 + state.seed * 0.9) * 0.0021
                + Math.sin(this.worldTime * 1.46 + state.seed * 0.3) * 0.0011
            ) * idleMotion;
            const rootX = this.scale.width * 0.5 + (this.cameraRig?.hudOffsetX || 0) * 0.78;
            const rootY = 54 + topOffset + (this.cameraRig?.hudOffsetY || 0) * 0.62;
            const rootRotation = idleRotation + state.rotation + (state.jitterRotation || 0);

            state.container.setVisible(true);
            const hudRootX = rootX + idleOffsetX + state.swayX + (state.jitterX || 0);
            const hudRootY = rootY + idleOffsetY + state.swayY + (state.jitterY || 0);
            const placeHudStrip = (sprite, localX, localY, width, height, color, alpha, rotation = 0) => {
                const rotated = rotateLocal(localX, localY, rootRotation);
                this.setLivingEnergyBarStrip(
                    sprite,
                    hudRootX + rotated.x,
                    hudRootY + rotated.y,
                    width,
                    height,
                    color,
                    alpha,
                    rootRotation + rotation
                );
            };

            const leftEdge = -actualLength * 0.5;
            const shellColor = lowEnergy > 0.08
                ? blendColor(palette.signal, COLORS.health, lowEnergy * 0.54)
                : blendColor(COLORS.shadow, palette.signal, 0.22);
            const fillColor = lowEnergy > 0.08
                ? blendColor(COLORS.energy, COLORS.health, lowEnergy * 0.42)
                : blendColor(COLORS.inverse, palette.signal, 0.68);
            const flashColor = blendColor(COLORS.core, COLORS.energy, 0.34 + Math.min(0.46, gain * 0.08 + overload * 0.12));
            const growthColor = blendColor(palette.pulse, COLORS.energy, 0.42 + Math.min(0.28, grow * 0.06));
            const glowColor = lowEnergy > 0.08
                ? COLORS.health
                : blendColor(palette.pulse, COLORS.energy, 0.2);
            const ghostColor = blendColor(COLORS.health, COLORS.inverse, 0.28);
            const shadowAlpha = Math.min(0.4, 0.2 + lowEnergy * 0.06 + overload * 0.05);
            const glowAlpha = Math.min(0.28, 0.04 + gain * 0.06 + overload * 0.1 + lowEnergy * 0.05 + beat * 0.03);
            const flashAlpha = Math.min(0.46, 0.1 + gain * 0.11 + overload * 0.12 + grow * 0.05);
            const growthAlpha = Math.min(0.44, 0.08 + state.displayGrowth * 0.12 + grow * 0.12);
            const ghostAlpha = Math.min(0.34, 0.1 + loss * 0.12);
            const overloadHeight = Math.max(2, bodyHeight * (0.16 + overload * 0.06));

            placeHudStrip(state.shadowStrip, leftEdge - 5, 2.6, actualLength + 10, bodyHeight + 8, COLORS.shadow, shadowAlpha, 0);
            placeHudStrip(state.trackStrip, leftEdge, 0, actualLength, bodyHeight, shellColor, 0.96, 0);
            placeHudStrip(
                state.growthStrip,
                leftEdge,
                -bodyHeight * 0.18,
                growthPixels,
                Math.max(2, bodyHeight * 0.16),
                growthColor,
                growthAlpha,
                0
            );
            placeHudStrip(
                state.ghostStrip,
                leftEdge + fillPixels,
                0,
                ghostPixels,
                Math.max(2, fillHeight * 0.94),
                ghostColor,
                ghostAlpha,
                0
            );
            placeHudStrip(
                state.glowStrip,
                leftEdge,
                0,
                fillPixels,
                fillHeight + 4 + Math.max(0, state.fillLift) * 0.8,
                glowColor,
                glowAlpha,
                0
            );
            placeHudStrip(state.fillStrip, leftEdge, 0, fillPixels, fillHeight, fillColor, 0.98, 0);
            placeHudStrip(
                state.flashStrip,
                leftEdge,
                0,
                fillPixels,
                Math.max(2, bodyHeight * 0.18),
                flashColor,
                flashAlpha,
                0
            );
            const dropletRootX = leftEdge + Math.max(10, Math.min(actualLength - 10, fillPixels));
            const dropletRootY = bodyHeight * 0.32;
            if ((state.lossBurstQueue || 0) > 0 || loss > 0.14) {
                this.emitLivingEnergyBarDroplets(
                    state,
                    Math.min(3, 1 + Math.floor(loss * 0.55)),
                    dropletRootX,
                    dropletRootY,
                    blendColor(COLORS.health, fillColor, 0.56),
                    bodyHeight + actualLength * 0.03,
                    bodyHeight * 1.2,
                    32 + loss * 24
                );
            }
            (state.droplets || []).forEach((droplet, index) => {
                const sprite = state.dropletSprites?.[index];
                if (!sprite) {
                    return;
                }
                if (!droplet.active) {
                    sprite.setVisible(false);
                    return;
                }
                droplet.life -= frameDt;
                if (droplet.life <= 0) {
                    droplet.active = false;
                    sprite.setVisible(false);
                    return;
                }
                droplet.vy += 180 * frameDt;
                droplet.x += droplet.vx * frameDt;
                droplet.y += droplet.vy * frameDt;
                droplet.rotation += droplet.rotationVelocity * frameDt;
                const alpha = clamp(droplet.life / Math.max(0.0001, droplet.total), 0, 1) * droplet.alpha;
                placeHudStrip(
                    sprite,
                    droplet.x,
                    droplet.y,
                    droplet.width,
                    droplet.height,
                    droplet.color,
                    alpha,
                    droplet.rotation
                );
            });

            state.metrics.centerX = hudRootX;
            state.metrics.top = hudRootY - bodyHeight * 0.5 - Math.max(10, overloadHeight + Math.max(0, -state.tipLift) * 0.28);
            state.metrics.left = hudRootX - actualLength * 0.5;
            state.metrics.width = actualLength;
            state.metrics.height = bodyHeight + Math.max(10, overloadHeight + Math.max(0, -state.tipLift) * 0.32);
            state.metrics.bottom = state.metrics.top + state.metrics.height;
        } catch (error) {
            console.error('Living energy bar update failed:', error);
            state.container?.setVisible(false);
            state.metrics.visible = false;
            this.livingEnergyBarBroken = true;
        }
    },
    getBakedShapeTexture(shape) {
        return shape === 'square'
            ? 'baked-shape-square'
            : shape === 'triangle'
                ? 'baked-shape-triangle'
                : 'baked-shape-circle';
    },
    beginBakedSpriteFrame(enabled) {
        this.initBakedSpriteRenderer();
        Object.values(this.bakedSpritePools || {}).forEach((pool) => {
            pool.cursor = 0;
            if (!enabled) {
                pool.sprites.forEach((sprite) => {
                    sprite.setVisible(false);
                });
            }
        });
    },
    endBakedSpriteFrame(enabled) {
        Object.values(this.bakedSpritePools || {}).forEach((pool) => {
            for (let i = enabled ? pool.cursor : 0; i < pool.sprites.length; i += 1) {
                pool.sprites[i].setVisible(false);
            }
        });
    },
    acquireBakedSprite(poolName, textureKey) {
        const pool = this.bakedSpritePools?.[poolName];
        if (!pool) {
            return null;
        }
        let sprite = pool.sprites[pool.cursor];
        if (!sprite) {
            sprite = this.add.image(0, 0, textureKey);
            sprite.setVisible(false);
            sprite.setOrigin(0.5, 0.5);
            pool.layer.add(sprite);
            pool.sprites.push(sprite);
        }
        pool.cursor += 1;
        if (sprite.texture?.key !== textureKey) {
            sprite.setTexture(textureKey);
        }
        sprite.setVisible(true);
        sprite.setAlpha(1);
        sprite.setScale(1);
        sprite.setRotation(0);
        sprite.clearTint();
        return sprite;
    },
    stampBakedShape(poolName, shape, x, y, size, color, alpha, rotation = 0) {
        const sprite = this.acquireBakedSprite(poolName, this.getBakedShapeTexture(shape));
        if (!sprite) {
            return;
        }
        const scale = size / this.bakedSpriteMetrics.shapeLogicalSize;
        sprite.setPosition(x, y);
        sprite.setScale(scale);
        sprite.setRotation(rotation);
        sprite.setTint(color);
        sprite.setAlpha(alpha);
    },
    stampBakedRing(poolName, x, y, radius, color, alpha) {
        const sprite = this.acquireBakedSprite(poolName, 'baked-ring-circle');
        if (!sprite) {
            return;
        }
        const scale = radius / this.bakedSpriteMetrics.ringLogicalRadius;
        sprite.setPosition(x, y);
        sprite.setScale(scale);
        sprite.setTint(color);
        sprite.setAlpha(alpha);
    },
    stampBakedLine(poolName, ax, ay, bx, by, width, color, alpha) {
        const length = Math.hypot(bx - ax, by - ay);
        if (length <= 0.0001) {
            return;
        }
        const sprite = this.acquireBakedSprite(poolName, 'baked-line-core');
        if (!sprite) {
            return;
        }
        sprite.setPosition((ax + bx) * 0.5, (ay + by) * 0.5);
        sprite.setScale(
            length / this.bakedSpriteMetrics.lineLogicalLength,
            width / this.bakedSpriteMetrics.lineLogicalThickness
        );
        sprite.setRotation(Math.atan2(by - ay, bx - ax));
        sprite.setTint(color);
        sprite.setAlpha(alpha);
    },
    addScreenShake(worldAmount = 0, hudAmount = worldAmount) {
        if (!this.cameraRig) {
            return;
        }
        this.cameraRig.shake = Math.max(this.cameraRig.shake || 0, worldAmount);
        this.cameraRig.hudShake = Math.max(this.cameraRig.hudShake || 0, hudAmount);
    },
    buildRenderCaches() {
        this.activeNodeIndexMap = new Map(this.activeNodes.map((node) => [node.index, node]));
    },
    isScreenCircleVisible(x, y, radius = 0, margin = 0) {
        const width = this.cameraRig?.viewportWidth || this.scale?.width || window.innerWidth;
        const height = this.cameraRig?.viewportHeight || this.scale?.height || window.innerHeight;
        const pad = Math.max(0, radius + margin);
        return !(x < -pad || x > width + pad || y < -pad || y > height + pad);
    },
    isScreenPointVisible(x, y, margin = 0) {
        const width = this.cameraRig?.viewportWidth || this.scale?.width || window.innerWidth;
        const height = this.cameraRig?.viewportHeight || this.scale?.height || window.innerHeight;
        const pad = Math.max(0, margin);
        return !(x < -pad || x > width + pad || y < -pad || y > height + pad);
    },
    updateEffects(simDt) {
        for (let i = this.effects.length - 1; i >= 0; i -= 1) {
            this.effects[i].life -= simDt;
            if (this.effects[i].life <= 0) {
                // swap-and-pop: O(1) removal
                const last = this.effects.length - 1;
                if (i !== last) { this.effects[i] = this.effects[last]; }
                this.effects.pop();
            }
        }
    },
    render() {
        const useBakedSpriteRenderer = this.isGraphicsToggleEnabled('graphicsUseBakedSpriteRenderer', true);
        const worldGraphics = this.graphicsWorld || this.graphics;
        const midGraphics = this.graphics;
        const hudGraphics = this.graphicsHud || midGraphics;
        worldGraphics?.clear();
        if (midGraphics && midGraphics !== worldGraphics) {
            midGraphics.clear();
        }
        if (hudGraphics && hudGraphics !== midGraphics && hudGraphics !== worldGraphics) {
            hudGraphics.clear();
        }
        this.buildRenderCaches();
        this.beginBakedSpriteFrame(useBakedSpriteRenderer);
        if (this.isGraphicsToggleEnabled('graphicsRenderWorldEnabled', true)) {
            this.drawWorld(worldGraphics);
        }
        if (this.isGraphicsToggleEnabled('graphicsRenderPreyDeathClusterEnabled', true)
            && this.isGraphicsToggleEnabled('graphicsRenderPreyFragmentsEnabled', true)) {
            if (useBakedSpriteRenderer) {
                this.renderFragmentsSprites();
            } else {
                this.drawFragments(midGraphics);
            }
        }
        if (this.isGraphicsToggleEnabled('graphicsRenderPreyEnabled', true)) {
            if (useBakedSpriteRenderer) {
                this.renderPreySprites();
            } else {
                this.drawPrey(midGraphics);
            }
        }
        if (this.isGraphicsToggleEnabled('graphicsRenderPreyDeathClusterEnabled', true)
            && this.isGraphicsToggleEnabled('graphicsRenderPredationLinksEnabled', true)) {
            if (useBakedSpriteRenderer) {
                this.renderPredationLinkSprites();
            } else {
                this.drawPredationLinks(midGraphics);
            }
        }
        if (this.isGraphicsToggleEnabled('graphicsRenderFormationEnabled', true)) {
            this.drawFormation(midGraphics);
        }
        if (this.isGraphicsToggleEnabled('graphicsRenderEffectsEnabled', true)) {
            if (useBakedSpriteRenderer) {
                this.renderEffectSprites();
            } else {
                this.drawEffects(midGraphics);
            }
        }
        if ((this.player.edit.active || this.player.edit.ambience > 0.01)
            && this.isGraphicsToggleEnabled('graphicsRenderEditOverlayEnabled', true)) {
            this.drawEditOverlay(midGraphics);
        }
        if (window.TUNING && window.TUNING.showDebugVisuals
            && this.isGraphicsToggleEnabled('graphicsRenderDebugOverlayEnabled', true)) {
            this.drawDebugOverlays(midGraphics);
        }
        if (this.isGraphicsToggleEnabled('graphicsRenderHudEnabled', true)) {
            this.drawHud(hudGraphics);
        }
        this.endBakedSpriteFrame(useBakedSpriteRenderer);
    },
    renderEffectSprites() {
        this.effects.forEach((effect) => {
            if (!this.isEffectVisible(effect)) {
                return;
            }
            const position = this.worldToScreen(effect.x, effect.y);
            const radius = effect.radius * this.cameraRig.zoom + (1 - clamp(effect.life / effect.total, 0, 1)) * 18;
            if (!this.isScreenCircleVisible(position.x, position.y, radius + 18, 8)) {
                return;
            }
            const alpha = clamp(effect.life / effect.total, 0, 1) * 0.9;
            this.stampBakedRing('effects', position.x, position.y, radius, effect.color, alpha);
        });
    },
    renderFragmentsSprites() {
        if (this.getRunTuningToggle && !this.getRunTuningToggle('gameplayPreyFragmentsEnabled', true)) {
            return;
        }
        const drawTrails = this.isGraphicsToggleEnabled('graphicsRenderFragmentTrailsEnabled', true);
        const drawBodies = this.isGraphicsToggleEnabled('graphicsRenderFragmentBodiesEnabled', true);
        if (!drawTrails && !drawBodies) {
            return;
        }
        this.fragments.forEach((fragment) => {
            const position = this.worldToScreen(fragment.x, fragment.y);
            const lifeAlpha = clamp(fragment.life / Math.max(0.0001, fragment.total), 0, 1);
            const collectiblePulse = fragment.collectible
                ? 1 + Math.sin(this.worldTime * 8 + fragment.pulse) * 0.14
                : 1;
            const energyPulse = fragment.kind === 'energy'
                ? 1 + Math.sin(this.worldTime * 10 + fragment.pulse) * 0.2
                : 1;
            const stateScale = fragment.state === 'homing' ? 1.28 : fragment.state === 'drift' ? 1.16 : 1.08;
            const alpha = clamp(lifeAlpha * (fragment.collectible ? 1.08 : 0.88), 0, 1);
            const size = clamp(fragment.size * collectiblePulse * energyPulse * stateScale * this.cameraRig.zoom, 3, 34);
            if (!this.isScreenCircleVisible(position.x, position.y, size * 2, 18)) {
                return;
            }
            const trailX = position.x - fragment.vx * 0.016 * this.cameraRig.zoom;
            const trailY = position.y - fragment.vy * 0.016 * this.cameraRig.zoom;
            if (drawTrails) {
                this.stampBakedLine(
                    'fragments',
                    trailX,
                    trailY,
                    position.x,
                    position.y,
                    Math.max(1, size * (fragment.state === 'homing' ? 0.52 : 0.36)),
                    fragment.color,
                    alpha * (fragment.state === 'homing' ? 0.58 : fragment.collectible ? 0.38 : 0.22)
                );
                if (fragment.kind === 'energy') {
                    this.stampBakedRing('fragments', position.x, position.y, size + 3, COLORS.core, alpha * 0.42);
                } else if (fragment.collectible && fragment.state !== 'burst') {
                    this.stampBakedRing('fragments', position.x, position.y, size + 2, COLORS.energy, alpha * 0.24);
                }
            }
            if (drawBodies) {
                if (fragment.collectible) {
                    this.stampBakedShape('fragments', fragment.shape, position.x, position.y, size * 2.5, blendColor(fragment.color, COLORS.core, 0.48), alpha * 0.2, fragment.rotation);
                }
                this.stampBakedShape('fragments', fragment.shape, position.x, position.y, size * 2, fragment.color, alpha, fragment.rotation);
            }
        });
    },
    renderPreySprites() {
        const drawBaseShapes = this.isGraphicsToggleEnabled('graphicsRenderPreyBaseShapesEnabled', true);
        const drawSignals = this.isGraphicsToggleEnabled('graphicsRenderPreySignalsEnabled', true);
        const drawAlertRings = this.isGraphicsToggleEnabled('graphicsRenderPreyAlertRingsVisible', false);
        const drawGuardRings = this.isGraphicsToggleEnabled('graphicsRenderPreyGuardRingsVisible', true);
        const drawDamageOverlays = this.isDeathGraphicsClusterEnabled()
            && this.isGraphicsToggleEnabled('graphicsRenderPreyDamageOverlaysEnabled', true);
        const drawAttachmentMarks = this.isDeathGraphicsClusterEnabled()
            && this.isGraphicsToggleEnabled('graphicsRenderPreyAttachmentMarksEnabled', true);
        const drawAttachmentHalo = this.isDeathGraphicsClusterEnabled()
            && this.isGraphicsToggleEnabled('graphicsRenderPreyAttachmentHaloEnabled', true);
        if (!drawBaseShapes && !drawSignals && !drawDamageOverlays && !drawAttachmentMarks && !drawAttachmentHalo) {
            return;
        }
        this.prey.forEach((prey) => {
            const position = this.worldToScreen(prey.displayX, prey.displayY);
            const healthRatio = clamp(prey.health / Math.max(prey.maxHealth, 1), 0, 1);
            const carve = clamp(prey.carve || 0, 0, 2);
            const gorePulse = clamp(prey.gorePulse || 0, 0, 2);
            const devourGlow = clamp(prey.devourGlow || 0, 0, 2);
            const alertPulse = clamp(prey.alertPulse || 0, 0, 1);
            const shakeX = Math.cos(prey.pulse * 1.7 + prey.seed) * (prey.shudder + gorePulse * 0.4) * 4.4 * this.cameraRig.zoom;
            const shakeY = Math.sin(prey.pulse * 1.2 + prey.seed * 0.7) * (prey.shudder + gorePulse * 0.4) * 4.4 * this.cameraRig.zoom;
            const pulseScale = 1
                + Math.sin(prey.pulse) * (prey.shape === 'circle' ? 0.08 : 0.04)
                + prey.wound * 0.08
                + carve * 0.04
                + alertPulse * 0.1
                + (prey.guardPulse || 0) * 0.08
                + (prey.isObjective ? 0.06 : 0);
            const chewShrink = 1 - (1 - healthRatio) * (prey.sizeKey === 'large' ? 0.1 : prey.sizeKey === 'medium' ? 0.06 : 0.03);
            const baseSize = prey.radius * 2 * pulseScale * chewShrink * this.cameraRig.zoom;
            const size = clamp(baseSize, 14, prey.sizeKey === 'large' ? 220 : prey.sizeKey === 'medium' ? 156 : 118);
            const x = position.x + shakeX;
            const y = position.y + shakeY;
            const actualRadius = Math.max(1, baseSize * 0.5);
            if (!this.isScreenCircleVisible(x, y, actualRadius, 4)
                || !this.isScreenPointVisible(x, y, actualRadius)) {
                return;
            }
            const color = prey.hitFlash > 0 ? COLORS.core : prey.color;
            if (drawBaseShapes) {
                this.stampBakedShape('prey', prey.shape, x + 4, y + 5, size * 1.1, COLORS.shadow, 0.46, prey.displayRotation);
                this.stampBakedShape('prey', prey.shape, x, y, size, color, 0.95, prey.displayRotation);
            }
            if (drawDamageOverlays && prey.sizeKey !== 'small') {
                this.stampBakedShape('prey', prey.shape, x, y, size * (1.12 + carve * 0.05), COLORS.shadow, 0.14 + gorePulse * 0.08, prey.displayRotation);
            }
            if (drawSignals && drawGuardRings && (prey.guardPulse || 0) > 0.04) {
                this.stampBakedRing('prey', x, y, size * 0.66, prey.signalColor || prey.color, 0.2 + prey.guardPulse * 0.26);
            }
            if (drawSignals && drawAlertRings && alertPulse > 0.04) {
                const ringColor = prey.behaviorState === 'burst' ? COLORS.inverse : COLORS.health;
                this.stampBakedRing('prey', x, y, size * (0.74 + alertPulse * 0.08), ringColor, 0.12 + alertPulse * 0.22);
            }
            if (drawDamageOverlays && prey.wound > 0.02) {
                this.stampBakedShape('prey', prey.shape, x, y, size * (1.04 + prey.wound * 0.08), COLORS.gore, 0.2 + prey.wound * 0.34 + gorePulse * 0.08, prey.displayRotation);
            }
            if (drawDamageOverlays && devourGlow > 0.02) {
                this.stampBakedShape('prey', prey.shape, x, y, size * (0.68 + devourGlow * 0.06), COLORS.energy, 0.08 + devourGlow * 0.14, prey.displayRotation + prey.spin * 0.03);
            }
            if (drawDamageOverlays && prey.exposed > 0.03) {
                this.stampBakedShape(
                    'prey',
                    prey.shape,
                    x,
                    y,
                    size * (0.38 + prey.exposed * 0.22),
                    prey.shape === 'circle' ? COLORS.energy : COLORS.core,
                    0.14 + prey.exposed * 0.42,
                    prey.displayRotation + prey.spin * 0.02
                );
            }
            if (drawAttachmentMarks && prey.attachments.length > 0) {
                (prey.attachments || []).forEach((attachment) => {
                    const node = this.activeNodeIndexMap?.get(attachment.nodeIndex);
                    const angle = node
                        ? Math.atan2(node.displayY - prey.displayY, node.displayX - prey.displayX)
                        : attachment.phase || 0;
                    const biteX = x + Math.cos(angle) * size * (0.24 + attachment.depth * 0.08);
                    const biteY = y + Math.sin(angle) * size * (0.24 + attachment.depth * 0.08);
                    const biteShape = attachment.mode === 'hook'
                        ? 'triangle'
                        : attachment.mode === 'grind'
                            ? 'square'
                            : 'circle';
                    const biteColor = attachment.mode === 'feed' ? COLORS.energy : COLORS.gore;
                    this.stampBakedShape('prey', 'circle', biteX, biteY, size * (0.18 + attachment.depth * 0.14), COLORS.shadow, 0.22 + attachment.depth * 0.32, angle);
                    this.stampBakedShape(
                        'prey',
                        biteShape,
                        biteX - Math.cos(angle) * size * 0.04,
                        biteY - Math.sin(angle) * size * 0.04,
                        size * (0.12 + attachment.depth * 0.12),
                        biteColor,
                        0.18 + attachment.depth * 0.26 + devourGlow * 0.06,
                        angle
                    );
                });
            }
            if (drawSignals && prey.weakArc > 0) {
                const weakSpotX = x + Math.cos(prey.weakAngle) * size * 0.18;
                const weakSpotY = y + Math.sin(prey.weakAngle) * size * 0.18;
                this.stampBakedShape('prey', 'circle', weakSpotX, weakSpotY, size * 0.22, prey.signalColor || COLORS.core, 0.18 + clamp(prey.exposed || 0, 0, 1) * 0.24, 0);
            }
            if (drawAttachmentHalo && prey.attachments.length > 0) {
                this.stampBakedRing('prey', x, y, size * 0.32, COLORS.pulse, 0.2 + prey.attachments.length * 0.05 + gorePulse * 0.06);
            }
            if (drawSignals && prey.isObjective) {
                this.stampBakedRing('prey', x, y, size * 0.86, prey.signalColor || COLORS.core, 0.34 + clamp(this.runState?.objectivePulse || 0, 0, 1) * 0.24);
                this.stampBakedRing('prey', x, y, size * 0.56, COLORS.core, 0.2 + (prey.objectiveGlow || 0) * 0.16);
            }
        });
    },
    renderPredationLinkSprites() {
        const drawLines = this.isGraphicsToggleEnabled('graphicsRenderPredationLinkLinesEnabled', true);
        const drawDots = this.isGraphicsToggleEnabled('graphicsRenderPredationLinkDotsEnabled', true);
        if (!drawLines && !drawDots) {
            return;
        }
        this.prey.forEach((prey) => {
            (prey.attachments || []).forEach((attachment) => {
                const node = this.activeNodeIndexMap?.get(attachment.nodeIndex);
                if (!node) {
                    return;
                }
                const nodePos = this.worldToScreen(node.displayX, node.displayY);
                const preyPos = this.worldToScreen(prey.displayX, prey.displayY);
                if (!this.isScreenCircleVisible(nodePos.x, nodePos.y, 10, 12) && !this.isScreenCircleVisible(preyPos.x, preyPos.y, 10, 12)) {
                    return;
                }
                const attachX = lerp(nodePos.x, preyPos.x, 0.32);
                const attachY = lerp(nodePos.y, preyPos.y, 0.32);
                const color = attachment.mode === 'hook'
                    ? COLORS.triangle
                    : attachment.mode === 'grind'
                        ? COLORS.square
                        : COLORS.circle;
                const width = clamp((2.2 + attachment.depth * 5.2 + (prey.gorePulse || 0) * 0.8) * this.cameraRig.zoom, 1, 8);
                if (drawLines) {
                    this.stampBakedLine('predation', nodePos.x, nodePos.y, attachX, attachY, width, color, 0.28 + attachment.depth * 0.48 + (prey.gorePulse || 0) * 0.08);
                    this.stampBakedLine('predation', attachX, attachY, preyPos.x, preyPos.y, Math.max(1, width * 0.58), COLORS.pulse, 0.2 + attachment.depth * 0.3 + (prey.devourGlow || 0) * 0.06);
                }
                if (drawDots) {
                    this.stampBakedShape('predation', 'circle', attachX, attachY, clamp((3 + attachment.depth * 3) * this.cameraRig.zoom, 2, 5) * 2, color, 0.82, 0);
                    this.stampBakedShape('predation', 'circle', preyPos.x, preyPos.y, clamp((2 + attachment.depth * 2.4) * this.cameraRig.zoom, 1, 4) * 2, COLORS.core, 0.12 + attachment.depth * 0.14, 0);
                }
            });
        });
    },
    initInfiniteMapBackgrounds() {
        const keyBase = 'map-bg-static-base';
        const keyMacro = 'map-bg-static-macro';
        const sizeBase = 2048;
        const sizeMacro = 2048;

        const createSeededRandom = (initialSeed) => {
            let seed = initialSeed >>> 0;
            return () => {
                seed = (seed * 1664525 + 1013904223) >>> 0;
                return seed / 0x100000000;
            };
        };

        const drawGroundShape = (g, shape, x, y, size, alpha, rotation, filled) => {
            if (!filled && shape === 'circle') {
                g.lineStyle(Math.max(2, size * 0.04), 0xffffff, alpha);
                g.strokeCircle(x, y, size * 0.5);
                return;
            }
            if (!filled && shape === 'bar') {
                g.save();
                g.translateCanvas(x, y);
                g.rotateCanvas(rotation);
                g.lineStyle(Math.max(2, size * 0.08), 0xffffff, alpha);
                g.strokeRect(-size * 0.65, -size * 0.16, size * 1.3, size * 0.32);
                g.restore();
                return;
            }
            if (shape === 'bar') {
                g.save();
                g.translateCanvas(x, y);
                g.rotateCanvas(rotation);
                g.fillStyle(0xffffff, alpha);
                g.fillRect(-size * 0.75, -size * 0.14, size * 1.5, size * 0.28);
                g.restore();
                return;
            }
            drawShape(g, shape, x, y, size, 0xffffff, alpha, rotation);
        };

        if (!this.textures.exists(keyBase)) {
            const scratch = this.add.graphics();
            const rand = createSeededRandom(0x034034);
            scratch.setVisible(false);
            scratch.clear();

            for (let cluster = 0; cluster < 28; cluster++) {
                const clusterX = rand() * sizeBase;
                const clusterY = rand() * sizeBase;
                const clusterRadius = 140 + rand() * 320;
                const count = 8 + Math.floor(rand() * 14);
                for (let i = 0; i < count; i++) {
                    const angle = rand() * Math.PI * 2;
                    const dist = Math.pow(rand(), 0.72) * clusterRadius;
                    const x = clusterX + Math.cos(angle) * dist;
                    const y = clusterY + Math.sin(angle) * dist;
                    const size = 28 + rand() * 160;
                    const alpha = 0.02 + rand() * 0.045;
                    const rotation = rand() * Math.PI * 2;
                    const filled = rand() > 0.42;
                    const shapeRoll = rand();
                    const shape = shapeRoll < 0.3
                        ? 'circle'
                        : shapeRoll < 0.58
                            ? 'square'
                            : shapeRoll < 0.82
                                ? 'triangle'
                                : 'bar';
                    drawGroundShape(scratch, shape, x, y, size, alpha, rotation, filled);
                }
            }

            for (let i = 0; i < 180; i++) {
                const x = rand() * sizeBase;
                const y = rand() * sizeBase;
                const size = 18 + rand() * 56;
                const alpha = 0.018 + rand() * 0.034;
                const rotation = rand() * Math.PI * 2;
                const shapeRoll = rand();
                const shape = shapeRoll < 0.34 ? 'circle' : shapeRoll < 0.67 ? 'square' : 'triangle';
                drawGroundShape(scratch, shape, x, y, size, alpha, rotation, rand() > 0.3);
            }

            scratch.generateTexture(keyBase, sizeBase, sizeBase);
            scratch.destroy();
        }

        if (!this.textures.exists(keyMacro)) {
            const scratch = this.add.graphics();
            const rand = createSeededRandom(0x340340);
            scratch.setVisible(false);
            scratch.clear();

            for (let band = 0; band < 16; band++) {
                const originX = rand() * sizeMacro;
                const originY = rand() * sizeMacro;
                const rotation = rand() * Math.PI * 2;
                const stepCount = 5 + Math.floor(rand() * 7);
                for (let i = 0; i < stepCount; i++) {
                    const travel = (i / Math.max(1, stepCount - 1)) * (220 + rand() * 360);
                    const offset = (rand() - 0.5) * 160;
                    const x = originX + Math.cos(rotation) * travel - Math.sin(rotation) * offset;
                    const y = originY + Math.sin(rotation) * travel + Math.cos(rotation) * offset;
                    const size = 120 + rand() * 260;
                    const alpha = 0.014 + rand() * 0.026;
                    const shapeRoll = rand();
                    const shape = shapeRoll < 0.24
                        ? 'circle'
                        : shapeRoll < 0.5
                            ? 'square'
                            : shapeRoll < 0.76
                                ? 'triangle'
                                : 'bar';
                    drawGroundShape(scratch, shape, x, y, size, alpha, rotation + rand() * 0.55, rand() > 0.35);
                }
            }

            for (let i = 0; i < 56; i++) {
                const x = rand() * sizeMacro;
                const y = rand() * sizeMacro;
                const size = 180 + rand() * 420;
                const alpha = 0.01 + rand() * 0.02;
                const rotation = rand() * Math.PI * 2;
                drawGroundShape(scratch, rand() > 0.5 ? 'triangle' : 'square', x, y, size, alpha, rotation, rand() > 0.5);
            }

            scratch.generateTexture(keyMacro, sizeMacro, sizeMacro);
            scratch.destroy();
        }

        if (!this.mapBgSprites) {
            this.mapBgSprites = {
                macro: this.add.tileSprite(0, 0, this.scale.width, this.scale.height, keyMacro).setOrigin(0, 0).setDepth(0.05),
                base: this.add.tileSprite(0, 0, this.scale.width, this.scale.height, keyBase).setOrigin(0, 0).setDepth(0.1)
            };
            this.mapBgSprites.macro.setScrollFactor(0);
            this.mapBgSprites.base.setScrollFactor(0);
        } else {
            this.mapBgSprites.macro.setTexture(keyMacro).setSize(this.scale.width, this.scale.height);
            this.mapBgSprites.base.setTexture(keyBase).setSize(this.scale.width, this.scale.height);
        }
    },

    updateMapBackgrounds() {
        if (!this.mapBgSprites) {
            this.initInfiniteMapBackgrounds();
        }

        this.mapBgSprites.base.setVisible(true);
        if (this.mapBgSprites.macro) this.mapBgSprites.macro.setVisible(true);
        if (this.mapBgSprites.mid) this.mapBgSprites.mid.setVisible(false);
        if (this.mapBgSprites.anchor) this.mapBgSprites.anchor.setVisible(false);

        const vw = this.cameraRig.viewportWidth;
        const vh = this.cameraRig.viewportHeight;
        this.mapBgSprites.base.setSize(vw, vh);
        if (this.mapBgSprites.macro) {
            this.mapBgSprites.macro.setSize(vw, vh);
        }

        const palette = this.getRunPalette ? this.getRunPalette() : { grid: COLORS.grid };
        const zoom = this.cameraRig.zoom;
        const cx = this.cameraRig.x;
        const cy = this.cameraRig.y;
        const renderOffsetX = (this.cameraRig.renderOffsetX || 0) / Math.max(zoom, 0.0001);
        const renderOffsetY = (this.cameraRig.renderOffsetY || 0) / Math.max(zoom, 0.0001);

        const worldLeft = cx - (vw * 0.5) / zoom - renderOffsetX;
        const worldTop = cy - (vh * 0.5) / zoom - renderOffsetY;

        const stageFlash = clamp(this.runState?.stageFlash || 0, 0, 1.8);
        const backgroundStrength = clamp(this.getRunTuningValue?.('backgroundStrength', 1) ?? 1, 0, 2.5);
        const baseAlphaMult = (1 + stageFlash * 0.2) * backgroundStrength;
        const macroTint = blendColor(palette.arena || COLORS.arena, palette.grid || COLORS.grid, 0.82);
        const baseTint = blendColor(palette.grid || COLORS.grid, palette.signal || COLORS.core, 0.18);

        if (this.mapBgSprites.macro) {
            this.mapBgSprites.macro.setTint(macroTint);
            this.mapBgSprites.macro.setAlpha(clamp(0.48 * baseAlphaMult, 0, 0.92));
            this.mapBgSprites.macro.tileScaleX = zoom;
            this.mapBgSprites.macro.tileScaleY = zoom;
            this.mapBgSprites.macro.tilePositionX = worldLeft;
            this.mapBgSprites.macro.tilePositionY = worldTop;
        }

        this.mapBgSprites.base.setTint(baseTint);
        this.mapBgSprites.base.setAlpha(clamp(0.62 * baseAlphaMult, 0, 0.98));
        this.mapBgSprites.base.tileScaleX = zoom;
        this.mapBgSprites.base.tileScaleY = zoom;
        this.mapBgSprites.base.tilePositionX = worldLeft;
        this.mapBgSprites.base.tilePositionY = worldTop;
    },

    drawWorld(g) {
        const width = this.cameraRig.viewportWidth;
        const height = this.cameraRig.viewportHeight;
        const drawGrid = this.isGraphicsToggleEnabled('graphicsRenderWorldGridEnabled', true);
        const palette = this.getRunPalette ? this.getRunPalette() : {
            arena: COLORS.arena,
            grid: COLORS.grid,
            mist: COLORS.link,
            pulse: COLORS.pulse,
            signal: COLORS.core,
            threat: COLORS.health
        };
        const centerX = width * 0.5;
        const centerY = height * 0.5;
        const objective = this.getObjectivePrey ? this.getObjectivePrey() : null;
        const objectivePulse = clamp(this.runState?.objectivePulse || 0, 0, 1);
        const stageFlash = clamp(this.runState?.stageFlash || 0, 0, 1.8);
        const energyGainPulse = clamp(this.runState?.energyGainPulse || 0, 0, 1.4);
        const energyLossPulse = clamp(this.runState?.energyLossPulse || 0, 0, 1.4);
        const energyBeat = clamp(this.runState?.energyBeat || 0, 0, 1);
        g.fillStyle(palette.arena, 0.98);
        g.fillRect(0, 0, width, height);
        g.fillStyle(palette.mist, 0.08 + stageFlash * 0.04);
        g.fillCircle(centerX + this.cameraRig.compositionX * 0.16, centerY + this.cameraRig.compositionY * 0.16, Math.max(width, height) * 0.58);
        g.fillStyle(palette.signal, 0.035 + clamp(this.runState?.energyPulse || 0, 0, 1) * 0.05);
        g.fillCircle(centerX, centerY, Math.max(width, height) * 0.22);

        const worldLeft = this.cameraRig.x - width * 0.5 / this.cameraRig.zoom;
        const worldRight = this.cameraRig.x + width * 0.5 / this.cameraRig.zoom;
        const worldTop = this.cameraRig.y - height * 0.5 / this.cameraRig.zoom;
        const worldBottom = this.cameraRig.y + height * 0.5 / this.cameraRig.zoom;
        const gridSize = 120;
        const startX = Math.floor(worldLeft / gridSize) * gridSize;
        const startY = Math.floor(worldTop / gridSize) * gridSize;

        if (drawGrid) {
            this.updateMapBackgrounds();
        } else if (this.mapBgSprites) {
            this.mapBgSprites.base.setVisible(false);
            if (this.mapBgSprites.macro) {
                this.mapBgSprites.macro.setVisible(false);
            }
        }

        if (objective) {
            const objectivePos = this.worldToScreen(objective.displayX, objective.displayY);
            g.fillStyle(palette.signal, 0.04 + objectivePulse * 0.06);
            g.fillCircle(objectivePos.x, objectivePos.y, clamp((objective.radius * 3.8 + objectivePulse * 22) * this.cameraRig.zoom, 42, 180));
        }

        const feastGlow = clamp(this.player.feastGlow || 0, 0, 1.2);
        const huntGlow = clamp(this.player.predationPressure || 0, 0, 1);
        if (feastGlow > 0.01) {
            g.fillStyle(COLORS.gore, 0.04 + feastGlow * 0.05);
            g.fillRect(0, 0, width, height);
        }
        if (huntGlow > 0.01) {
            g.fillStyle(palette.pulse, huntGlow * 0.03);
            g.fillRect(0, 0, width, height);
        }
        if (energyGainPulse > 0.01) {
            g.fillStyle(COLORS.energy, 0.025 + energyGainPulse * 0.05);
            g.fillRect(0, 0, width, height);
        }
        if (energyLossPulse > 0.01) {
            g.fillStyle(COLORS.health, 0.025 + energyLossPulse * 0.07);
            g.fillRect(0, 0, width, height);
        }
        if ((this.runState?.lowEnergyPulse || 0) > 0.01) {
            g.fillStyle(COLORS.health, (this.runState.lowEnergyPulse || 0) * (0.04 + energyBeat * 0.03));
            g.fillRect(0, 0, width, height);
            g.lineStyle(4, COLORS.health, 0.08 + (this.runState.lowEnergyPulse || 0) * 0.14);
            g.strokeRect(12, 12, width - 24, height - 24);
        }
    },
    drawEffects(g) {
        this.effects.forEach((effect) => {
            if (!this.isEffectVisible(effect)) {
                return;
            }
            const position = this.worldToScreen(effect.x, effect.y);
            const radius = effect.radius * this.cameraRig.zoom + 18;
            if (!this.isScreenCircleVisible(position.x, position.y, radius, 8)) {
                return;
            }
            const alpha = clamp(effect.life / effect.total, 0, 1);
            g.lineStyle(effect.thickness, effect.color, alpha * 0.9);
            g.strokeCircle(position.x, position.y, effect.radius * this.cameraRig.zoom + (1 - alpha) * 18);
        });
    },
    drawFragments(g) {
        if (this.getRunTuningToggle && !this.getRunTuningToggle('gameplayPreyFragmentsEnabled', true)) {
            return;
        }
        const drawTrails = this.isGraphicsToggleEnabled('graphicsRenderFragmentTrailsEnabled', true);
        const drawBodies = this.isGraphicsToggleEnabled('graphicsRenderFragmentBodiesEnabled', true);
        if (!drawTrails && !drawBodies) {
            return;
        }
        this.fragments.forEach((fragment) => {
            const position = this.worldToScreen(fragment.x, fragment.y);
            const lifeAlpha = clamp(fragment.life / Math.max(0.0001, fragment.total), 0, 1);
            const collectiblePulse = fragment.collectible
                ? 1 + Math.sin(this.worldTime * 8 + fragment.pulse) * 0.14
                : 1;
            const energyPulse = fragment.kind === 'energy'
                ? 1 + Math.sin(this.worldTime * 10 + fragment.pulse) * 0.2
                : 1;
            const stateScale = fragment.state === 'homing' ? 1.28 : fragment.state === 'drift' ? 1.16 : 1.08;
            const alpha = clamp(lifeAlpha * (fragment.collectible ? 1.08 : 0.88), 0, 1);
            const size = clamp(fragment.size * collectiblePulse * energyPulse * stateScale * this.cameraRig.zoom, 3, 34);
            if (!this.isScreenCircleVisible(position.x, position.y, size * 2, 18)) {
                return;
            }
            const trailX = position.x - fragment.vx * 0.016 * this.cameraRig.zoom;
            const trailY = position.y - fragment.vy * 0.016 * this.cameraRig.zoom;
            if (drawTrails) {
                g.lineStyle(Math.max(1, size * (fragment.state === 'homing' ? 0.52 : 0.36)), fragment.color, alpha * (fragment.state === 'homing' ? 0.58 : fragment.collectible ? 0.38 : 0.22));
                g.lineBetween(trailX, trailY, position.x, position.y);
                if (fragment.kind === 'energy') {
                    g.lineStyle(1.8, COLORS.core, alpha * 0.42);
                    g.strokeCircle(position.x, position.y, size + 3);
                } else if (fragment.collectible && fragment.state !== 'burst') {
                    g.lineStyle(1.5, COLORS.energy, alpha * 0.24);
                    g.strokeCircle(position.x, position.y, size + 2);
                }
            }
            if (drawBodies) {
                if (fragment.collectible) {
                    drawShape(g, fragment.shape, position.x, position.y, size * 2.5, blendColor(fragment.color, COLORS.core, 0.48), alpha * 0.2, fragment.rotation);
                }
                drawShape(g, fragment.shape, position.x, position.y, size * 2, fragment.color, alpha, fragment.rotation);
            }
        });
    },
    drawPrey(g) {
        const drawBaseShapes = this.isGraphicsToggleEnabled('graphicsRenderPreyBaseShapesEnabled', true);
        const drawSignals = this.isGraphicsToggleEnabled('graphicsRenderPreySignalsEnabled', true);
        const drawAlertRings = this.isGraphicsToggleEnabled('graphicsRenderPreyAlertRingsVisible', false);
        const drawGuardRings = this.isGraphicsToggleEnabled('graphicsRenderPreyGuardRingsVisible', true);
        const drawDamageOverlays = this.isDeathGraphicsClusterEnabled()
            && this.isGraphicsToggleEnabled('graphicsRenderPreyDamageOverlaysEnabled', true);
        const drawAttachmentMarks = this.isDeathGraphicsClusterEnabled()
            && this.isGraphicsToggleEnabled('graphicsRenderPreyAttachmentMarksEnabled', true);
        const drawAttachmentHalo = this.isDeathGraphicsClusterEnabled()
            && this.isGraphicsToggleEnabled('graphicsRenderPreyAttachmentHaloEnabled', true);
        if (!drawBaseShapes && !drawSignals && !drawDamageOverlays && !drawAttachmentMarks && !drawAttachmentHalo) {
            return;
        }
        this.prey.forEach((prey) => {
            const position = this.worldToScreen(prey.displayX, prey.displayY);
            const healthRatio = clamp(prey.health / Math.max(prey.maxHealth, 1), 0, 1);
            const carve = clamp(prey.carve || 0, 0, 2);
            const gorePulse = clamp(prey.gorePulse || 0, 0, 2);
            const devourGlow = clamp(prey.devourGlow || 0, 0, 2);
            const alertPulse = clamp(prey.alertPulse || 0, 0, 1);
            const shakeX = Math.cos(prey.pulse * 1.7 + prey.seed) * (prey.shudder + gorePulse * 0.4) * 4.4 * this.cameraRig.zoom;
            const shakeY = Math.sin(prey.pulse * 1.2 + prey.seed * 0.7) * (prey.shudder + gorePulse * 0.4) * 4.4 * this.cameraRig.zoom;
            const pulseScale = 1
                + Math.sin(prey.pulse) * (prey.shape === 'circle' ? 0.08 : 0.04)
                + prey.wound * 0.08
                + carve * 0.04
                + alertPulse * 0.1
                + (prey.guardPulse || 0) * 0.08
                + (prey.isObjective ? 0.06 : 0);
            const chewShrink = 1 - (1 - healthRatio) * (prey.sizeKey === 'large' ? 0.1 : prey.sizeKey === 'medium' ? 0.06 : 0.03);
            const baseSize = prey.radius * 2 * pulseScale * chewShrink * this.cameraRig.zoom;
            const size = clamp(baseSize, 14, prey.sizeKey === 'large' ? 220 : prey.sizeKey === 'medium' ? 156 : 118);
            const x = position.x + shakeX;
            const y = position.y + shakeY;
            const actualRadius = Math.max(1, baseSize * 0.5);
            if (!this.isScreenCircleVisible(x, y, actualRadius, 4)
                || !this.isScreenPointVisible(x, y, actualRadius)) {
                return;
            }
            const color = prey.hitFlash > 0 ? COLORS.core : prey.color;

            if (drawBaseShapes) {
                drawShape(g, prey.shape, x + 4, y + 5, size * 1.1, COLORS.shadow, 0.46, prey.displayRotation);
                drawShape(g, prey.shape, x, y, size, color, 0.95, prey.displayRotation);
            }
            if (drawDamageOverlays && prey.sizeKey !== 'small') {
                drawShape(g, prey.shape, x, y, size * (1.12 + carve * 0.05), COLORS.shadow, 0.14 + gorePulse * 0.08, prey.displayRotation);
            }
            if (drawSignals && drawGuardRings && (prey.guardPulse || 0) > 0.04) {
                g.lineStyle(clamp((2 + prey.guardPulse * 3) * this.cameraRig.zoom, 1, 5), prey.signalColor || prey.color, 0.2 + prey.guardPulse * 0.26);
                g.strokeCircle(x, y, size * 0.66);
            }
            if (drawSignals && drawAlertRings && alertPulse > 0.04) {
                g.lineStyle(clamp((1.8 + alertPulse * 2.4) * this.cameraRig.zoom, 1, 5), prey.behaviorState === 'burst' ? COLORS.inverse : COLORS.health, 0.12 + alertPulse * 0.22);
                g.strokeCircle(x, y, size * (0.74 + alertPulse * 0.08));
            }
            if (drawDamageOverlays && prey.wound > 0.02) {
                drawShape(g, prey.shape, x, y, size * (1.04 + prey.wound * 0.08), COLORS.gore, 0.2 + prey.wound * 0.34 + gorePulse * 0.08, prey.displayRotation);
            }
            if (drawDamageOverlays && devourGlow > 0.02) {
                drawShape(g, prey.shape, x, y, size * (0.68 + devourGlow * 0.06), COLORS.energy, 0.08 + devourGlow * 0.14, prey.displayRotation + prey.spin * 0.03);
            }
            if (drawDamageOverlays && prey.exposed > 0.03) {
                drawShape(
                    g,
                    prey.shape,
                    x,
                    y,
                    size * (0.38 + prey.exposed * 0.22),
                    prey.shape === 'circle' ? COLORS.energy : COLORS.core,
                    0.14 + prey.exposed * 0.42,
                    prey.displayRotation + prey.spin * 0.02
                );
            }
            if (drawAttachmentMarks && prey.attachments.length > 0) {
                (prey.attachments || []).forEach((attachment) => {
                    const node = this.activeNodeIndexMap?.get(attachment.nodeIndex);
                    const angle = node
                        ? Math.atan2(node.displayY - prey.displayY, node.displayX - prey.displayX)
                        : attachment.phase || 0;
                    const biteX = x + Math.cos(angle) * size * (0.24 + attachment.depth * 0.08);
                    const biteY = y + Math.sin(angle) * size * (0.24 + attachment.depth * 0.08);
                    const biteShape = attachment.mode === 'hook'
                        ? 'triangle'
                        : attachment.mode === 'grind'
                            ? 'square'
                            : 'circle';
                    const biteColor = attachment.mode === 'feed' ? COLORS.energy : COLORS.gore;
                    drawShape(g, 'circle', biteX, biteY, size * (0.18 + attachment.depth * 0.14), COLORS.shadow, 0.22 + attachment.depth * 0.32, angle);
                    drawShape(
                        g,
                        biteShape,
                        biteX - Math.cos(angle) * size * 0.04,
                        biteY - Math.sin(angle) * size * 0.04,
                        size * (0.12 + attachment.depth * 0.12),
                        biteColor,
                        0.18 + attachment.depth * 0.26 + devourGlow * 0.06,
                        angle
                    );
                });
            }
            if (drawSignals && prey.weakArc > 0) {
                const weakSpotX = x + Math.cos(prey.weakAngle) * size * 0.18;
                const weakSpotY = y + Math.sin(prey.weakAngle) * size * 0.18;
                drawShape(g, 'circle', weakSpotX, weakSpotY, size * 0.22, prey.signalColor || COLORS.core, 0.18 + clamp(prey.exposed || 0, 0, 1) * 0.24, 0);
            }
            if (drawAttachmentHalo && prey.attachments.length > 0) {
                g.lineStyle(clamp((1.6 + prey.attachments.length * 0.52) * this.cameraRig.zoom, 1, 5), COLORS.pulse, 0.2 + prey.attachments.length * 0.05 + gorePulse * 0.06);
                g.strokeCircle(x, y, size * 0.32);
            }
            if (drawSignals && prey.isObjective) {
                g.lineStyle(clamp((2.2 + Math.sin(this.worldTime * 5 + prey.seed) * 0.4) * this.cameraRig.zoom, 1, 5), prey.signalColor || COLORS.core, 0.34 + clamp(this.runState?.objectivePulse || 0, 0, 1) * 0.24);
                g.strokeCircle(x, y, size * 0.86);
                g.lineStyle(clamp(1.6 * this.cameraRig.zoom, 1, 3), COLORS.core, 0.2 + (prey.objectiveGlow || 0) * 0.16);
                g.strokeCircle(x, y, size * 0.56);
            }
        });
    },
    drawPredationLinks(g) {
        const drawLines = this.isGraphicsToggleEnabled('graphicsRenderPredationLinkLinesEnabled', true);
        const drawDots = this.isGraphicsToggleEnabled('graphicsRenderPredationLinkDotsEnabled', true);
        if (!drawLines && !drawDots) {
            return;
        }
        this.prey.forEach((prey) => {
            (prey.attachments || []).forEach((attachment) => {
                const node = this.activeNodeIndexMap?.get(attachment.nodeIndex);
                if (!node) {
                    return;
                }
                const nodePos = this.worldToScreen(node.displayX, node.displayY);
                const preyPos = this.worldToScreen(prey.displayX, prey.displayY);
                if (!this.isScreenCircleVisible(nodePos.x, nodePos.y, 10, 12) && !this.isScreenCircleVisible(preyPos.x, preyPos.y, 10, 12)) {
                    return;
                }
                const attachX = lerp(nodePos.x, preyPos.x, 0.32);
                const attachY = lerp(nodePos.y, preyPos.y, 0.32);
                const color = attachment.mode === 'hook'
                    ? COLORS.triangle
                    : attachment.mode === 'grind'
                        ? COLORS.square
                        : COLORS.circle;
                const width = clamp((2.2 + attachment.depth * 5.2 + (prey.gorePulse || 0) * 0.8) * this.cameraRig.zoom, 1, 8);
                if (drawLines) {
                    g.lineStyle(width, color, 0.28 + attachment.depth * 0.48 + (prey.gorePulse || 0) * 0.08);
                    g.lineBetween(nodePos.x, nodePos.y, attachX, attachY);
                    g.lineStyle(Math.max(1, width * 0.58), COLORS.pulse, 0.2 + attachment.depth * 0.3 + (prey.devourGlow || 0) * 0.06);
                    g.lineBetween(attachX, attachY, preyPos.x, preyPos.y);
                }
                if (drawDots) {
                    g.fillStyle(color, 0.82);
                    g.fillCircle(attachX, attachY, clamp((3 + attachment.depth * 3) * this.cameraRig.zoom, 2, 5));
                    g.fillStyle(COLORS.core, 0.12 + attachment.depth * 0.14);
                    g.fillCircle(preyPos.x, preyPos.y, clamp((2 + attachment.depth * 2.4) * this.cameraRig.zoom, 1, 4));
                }
            });
        });
    },
    drawFormation(g) {
        const palette = this.getRunPalette ? this.getRunPalette() : { pulse: COLORS.pulse, signal: COLORS.core };
        const drawGlow = this.isGraphicsToggleEnabled('graphicsRenderFormationGlowEnabled', true);
        const energyRatio = this.getEnergyRatio ? this.getEnergyRatio() : 1;
        const energyGainPulse = clamp(this.runState?.energyGainPulse || 0, 0, 1.4);
        const energyLossPulse = clamp(this.runState?.energyLossPulse || 0, 0, 1.4);
        const energyBeat = clamp(this.runState?.energyBeat || 0, 0, 1);
        const lowEnergyPulse = clamp(this.runState?.lowEnergyPulse || 0, 0, 1);
        const growthPulse = clamp(this.runState?.growthPulse || 0, 0, 1);
        const victoryPulse = clamp(this.player.victoryPulse || 0, 0, 1);
        if (drawGlow && (energyRatio > 0.02 || growthPulse > 0.02 || victoryPulse > 0.02)) {
            const center = this.worldToScreen(this.player.centroidX, this.player.centroidY);
            g.fillStyle(lowEnergyPulse > 0.08 ? COLORS.health : palette.pulse, 0.04 + energyRatio * 0.03 + victoryPulse * 0.05 + energyGainPulse * 0.04);
            g.fillCircle(center.x, center.y, clamp((this.getFormationSpan() * (1.18 + growthPulse * 0.08) + 60 + energyBeat * 18) * this.cameraRig.zoom, 32, 240));
            if (energyLossPulse > 0.02 || lowEnergyPulse > 0.02) {
                g.lineStyle(clamp((2.2 + lowEnergyPulse * 3.6 + energyBeat * 1.8) * this.cameraRig.zoom, 1, 5), COLORS.health, 0.1 + lowEnergyPulse * 0.18 + energyLossPulse * 0.12);
                g.strokeCircle(center.x, center.y, clamp((this.getFormationSpan() * 1.28 + 78 + energyBeat * 22) * this.cameraRig.zoom, 36, 268));
            }
        }
        this.links.forEach((link) => {
            const render = this.getLinkRenderPoints(link);
            const from = this.worldToScreen(render.fromX, render.fromY);
            const to = this.worldToScreen(render.toX, render.toY);
            const rigidityWidth = link.rigidity === 'rigid' ? 0.9 : link.rigidity === 'flex' ? -0.35 : 0.15;
            const width = clamp(((link.kind === 'support' ? 1.4 : 2.1) + rigidityWidth + link.tension * (link.kind === 'support' ? 8 : 12)) * this.cameraRig.zoom, 1, 9);
            const color = link.samePolarity ? COLORS.link : palette.pulse;
            const baseAlpha = link.samePolarity
                ? (link.kind === 'support' ? 0.3 : 0.52)
                : (link.kind === 'support' ? 0.54 : 0.76);
            const alpha = clamp(baseAlpha + (link.rigidity === 'rigid' ? 0.12 : link.rigidity === 'flex' ? -0.08 : 0), 0.18, 0.95);
            g.lineStyle(width, color, alpha);
            g.lineBetween(from.x, from.y, to.x, to.y);
        });

        if (!this.getRunTuningToggle || this.getRunTuningToggle('gameplayPulseOrbsVisible', true)) {
            (this.player.pulseRunners || []).forEach((runner, index) => {
                const pulseState = this.getPulseVisualState(runner);
                if (!pulseState) {
                    return;
                }
                const pulse = this.worldToScreen(pulseState.x, pulseState.y);
                const radius = clamp((8 - Math.min(index, 3) * 0.6) * this.cameraRig.zoom, 3.5, 8);
                const alpha = clamp(0.94 - index * 0.06, 0.55, 0.94);
                g.fillStyle(COLORS.pulse, alpha);
                g.fillCircle(pulse.x, pulse.y, radius);
            });
        }

        this.activeNodes.forEach((node) => {
            const nodePos = this.worldToScreen(node.displayX, node.displayY);
            const anchorPos = this.worldToScreen(node.displayAnchorX, node.displayAnchorY);
            if (node.anchored) {
                g.lineStyle(clamp(2.6 * this.cameraRig.zoom, 1, 3), COLORS.pulse, 0.45);
                g.lineBetween(nodePos.x, nodePos.y, anchorPos.x, anchorPos.y);
                g.lineStyle(clamp(2.2 * this.cameraRig.zoom, 1, 3), node.color, 0.55);
                g.strokeCircle(anchorPos.x, anchorPos.y, clamp(14 * this.cameraRig.zoom, 5, 14));
            }

            const glowRadius = clamp((18 + node.pulseGlow * 10) * this.cameraRig.zoom, 10, 28);
            if (drawGlow && node.pulseGlow > 0) {
                g.lineStyle(3, palette.pulse, node.pulseGlow * 0.9);
                g.strokeCircle(nodePos.x, nodePos.y, glowRadius);
            }

            if (drawGlow && node.biteGlow > 0.01) {
                g.lineStyle(clamp((2.2 + node.biteGlow * 1.6) * this.cameraRig.zoom, 1, 4), node.color, node.biteGlow * 0.5);
                g.strokeCircle(nodePos.x, nodePos.y, clamp((16 + node.biteGlow * 10) * this.cameraRig.zoom, 8, 26));
            }

            let size = clamp(30 * this.cameraRig.zoom, 14, 28);
            let rotation = Number.isFinite(node.displayAngle) ? node.displayAngle : Math.atan2(node.vy, node.vx);
            let bodyX = nodePos.x;
            let bodyY = nodePos.y;
            if (node.shape === 'circle') {
                const absorbLoad = clamp(node.absorbLoad || 0, 0, 2.4);
                const absorbJitter = clamp(node.absorbJitter || 0, 0, 2.2);
                const absorbFlash = clamp(node.absorbFlash || 0, 0, 2);
                const mouthLoad = absorbLoad + Math.min(1.4, (node.lootTargetCount || 0) * 0.08) + absorbFlash * 0.8;
                if (absorbJitter > 0.01) {
                    bodyX += Math.sin(this.worldTime * 42 + (node.absorbSeed || 0)) * absorbJitter * 2.6 * this.cameraRig.zoom;
                    bodyY += Math.cos(this.worldTime * 35 + (node.absorbSeed || 0) * 1.7) * absorbJitter * 2.1 * this.cameraRig.zoom;
                }
                const pulse = 1
                    + Math.sin(this.worldTime * 9 + node.order * 1.7) * 0.1 * (0.6 + node.feedPulse + growthPulse * 0.4 + victoryPulse * 0.8)
                    + mouthLoad * 0.1;
                size *= pulse;
                if (drawGlow && mouthLoad > 0.02) {
                    g.lineStyle(clamp((1.4 + mouthLoad * 1.6) * this.cameraRig.zoom, 1, 4), COLORS.core, 0.1 + mouthLoad * 0.08);
                    g.strokeCircle(bodyX, bodyY, clamp(size * (0.32 + mouthLoad * 0.03), 4, 18));
                }
            } else if (node.shape === 'square') {
                size *= 1 + node.biteGlow * 0.08 + victoryPulse * 0.04;
                if (drawGlow && node.spinVelocity > 0.02) {
                    g.lineStyle(clamp((1.8 + node.spinVelocity * 0.04) * this.cameraRig.zoom, 1, 4), COLORS.core, 0.12 + node.biteGlow * 0.18);
                    g.strokeCircle(nodePos.x, nodePos.y, clamp(size * 0.56, 5, 22));
                }
            } else {
                size *= 1 + node.hookTension * 0.1;
                if (drawGlow && node.hookTension > 0.02) {
                    drawShape(
                        g,
                        node.shape,
                        nodePos.x + (node.attackDirX || 0) * 8 * this.cameraRig.zoom,
                        nodePos.y + (node.attackDirY || 0) * 8 * this.cameraRig.zoom,
                        size * (1 + node.hookTension * 0.08),
                        node.color,
                        0.18 + node.hookTension * 0.16,
                        rotation
                    );
                }
            }

            drawShape(g, node.shape, bodyX, bodyY, size, node.color, 0.96, rotation);
            if (drawGlow && node.shape === 'circle' && node.feedPulse > 0.02) {
                const mouthCore = clamp((node.absorbLoad || 0) * 0.08 + (node.absorbFlash || 0) * 0.1, 0, 0.22);
                g.fillStyle(COLORS.core, 0.18 + node.feedPulse * 0.14 + mouthCore);
                g.fillCircle(bodyX, bodyY, clamp(size * 0.18, 2, 7));
                g.lineStyle(clamp((1.6 + node.feedPulse * 1.2 + (node.absorbLoad || 0) * 0.8) * this.cameraRig.zoom, 1, 3), COLORS.energy, 0.16 + node.feedPulse * 0.14 + mouthCore * 0.7);
                g.strokeCircle(bodyX, bodyY, clamp(size * (0.26 + node.feedPulse * 0.06 + (node.absorbLoad || 0) * 0.02), 4, 16));
            }
        });
    },
    drawHud(g) {
        const hudJolt = clamp(this.runState?.hudJolt || 0, 0, 1.4);
        const palette = this.getRunPalette ? this.getRunPalette() : { pulse: COLORS.pulse, signal: COLORS.core, threat: COLORS.health };
        const progress = this.getStageProgressRatio ? this.getStageProgressRatio() : 0;
        const objectivePulse = clamp(this.runState?.objectivePulse || 0, 0, 1);
        const barMetrics = this.livingEnergyBarState?.metrics || {};
        const barVisible = !!barMetrics.visible;
        const anchorWidth = Math.max(180, barVisible ? (barMetrics.width || 0) : clamp(this.scale.width * 0.26, 220, 320));
        const anchorLeft = barVisible
            ? barMetrics.left
            : this.scale.width * 0.5 - anchorWidth * 0.5 + (this.cameraRig?.hudOffsetX || 0) * 0.78;
        if (this.sessionStarted && this.menuMode !== 'main') {
            const stageCount = this.getStageCount ? this.getStageCount() : 4;
            const stageIndex = clamp(this.runState?.stageIndex || 0, 0, stageCount - 1);
            const pipSpacing = 34;
            const pipStartX = anchorLeft + anchorWidth - pipSpacing * (stageCount - 1);
            const pipY = (barVisible ? barMetrics.bottom + 18 : 74)
                + Math.cos(this.worldTime * 24 + (barMetrics.width || 0) * 0.01) * hudJolt * 1.2;
            for (let i = 0; i < stageCount; i += 1) {
                const x = pipStartX + i * pipSpacing;
                const filled = i < stageIndex;
                const active = i === stageIndex;
                const alpha = filled ? 0.92 : active ? 0.72 : 0.22;
                const radius = active ? 9 : 7;
                g.lineStyle(2, palette.signal, alpha);
                g.strokeCircle(x, pipY, radius + (active ? objectivePulse * 2.4 : 0));
                if (filled || active) {
                    g.fillStyle(filled ? palette.signal : palette.pulse, active ? 0.32 + progress * 0.4 : 0.48);
                    g.fillCircle(x, pipY, radius - 2 + (active ? progress * 1.4 : 0));
                }
                if (i < stageCount - 1) {
                    g.lineStyle(2, palette.grid || COLORS.grid, 0.28);
                    g.lineBetween(x + radius + 6, pipY, x + pipSpacing - radius - 6, pipY);
                }
            }
            const centerX = this.scale.width * 0.5 + (this.cameraRig?.hudOffsetX || 0) * 0.4;
            const bottomY = this.scale.height - 42 + (this.cameraRig?.hudOffsetY || 0) * 0.4;
            const phaseColor = this.getDrivePhaseColor(this.intent.pointerDrivePhase || this.intent.burstPhase);
            const centerCompression = clamp(this.intent.centerCompression || 0, 0, 1);
            g.lineStyle(2, phaseColor, 0.54 + clamp(this.intent.burstAggro || 0, 0, 1) * 0.28);
            g.strokeCircle(centerX, bottomY, 16 + centerCompression * 10);
            g.lineStyle(2, palette.signal, 0.16 + objectivePulse * 0.22);
            g.strokeCircle(centerX, bottomY, 28 + objectivePulse * 4);
        }

        if (this.menuMode === 'pause') {
            g.fillStyle(0x000000, 0.18);
            g.fillRect(0, 0, this.scale.width, this.scale.height);
        }
        if (this.player.dead) {
            g.fillStyle(COLORS.shadow, 0.34);
            g.fillRect(0, 0, this.scale.width, this.scale.height);
            g.lineStyle(3, COLORS.health, 0.26 + clamp(this.player.deathTimer / 2.6, 0, 1) * 0.32);
            g.strokeCircle(this.scale.width * 0.5, this.scale.height * 0.5, 52 + clamp(1 - this.player.deathTimer / 2.6, 0, 1) * 120);
        } else if (this.runState?.complete) {
            g.fillStyle(palette.signal, 0.04 + clamp(this.player.victoryPulse || 0, 0, 1) * 0.08);
            g.fillRect(0, 0, this.scale.width, this.scale.height);
            g.lineStyle(4, palette.signal, 0.38 + clamp(this.player.victoryPulse || 0, 0, 1) * 0.22);
            g.strokeCircle(this.scale.width * 0.5, this.scale.height * 0.5, 80 + clamp(1 - this.runState.completeTimer / 5.5, 0, 1) * 180);
        }
    },
    drawEditOverlay(g) {
        const edit = this.player.edit;
        const ambience = edit.ambience;
        if (ambience <= 0.01) {
            return;
        }

        const width = this.cameraRig.viewportWidth;
        const height = this.cameraRig.viewportHeight;
        const center = this.worldToScreen(this.player.centroidX, this.player.centroidY);
        const focusRadius = (this.getFormationSpan() + 108) * this.cameraRig.zoom;

        g.fillStyle(COLORS.shadow, 0.16 * ambience);
        g.fillRect(0, 0, width, height);
        g.lineStyle(2, COLORS.pulse, 0.22 * ambience);
        g.strokeCircle(center.x, center.y, focusRadius);
        g.lineStyle(4, COLORS.base, 0.08 * ambience);
        g.strokeCircle(center.x, center.y, focusRadius + 16);

        const selectedLinkIds = new Set(edit.selectedLinks || []);
        this.links.forEach((link) => {
            if (!selectedLinkIds.has(link.id)) {
                return;
            }
            const render = this.getLinkRenderPoints(link);
            const from = this.worldToScreen(render.fromX, render.fromY);
            const to = this.worldToScreen(render.toX, render.toY);
            g.lineStyle(clamp(6 * this.cameraRig.zoom, 2, 7), COLORS.base, 0.8);
            g.lineBetween(from.x, from.y, to.x, to.y);
        });

        const hoverLink = edit.hoverLink ? this.links.find((link) => link.key === edit.hoverLink) : null;
        if (hoverLink) {
            const render = this.getLinkRenderPoints(hoverLink);
            const from = this.worldToScreen(render.fromX, render.fromY);
            const to = this.worldToScreen(render.toX, render.toY);
            g.lineStyle(clamp(5 * this.cameraRig.zoom, 2, 6), COLORS.inverse, 0.68);
            g.lineBetween(from.x, from.y, to.x, to.y);
        }

        const selectedNodeIds = new Set(edit.selectedNodes || []);
        this.activeNodes.forEach((node) => {
            if (!selectedNodeIds.has(node.index)) {
                return;
            }
            const selectedPos = this.worldToScreen(node.displayX, node.displayY);
            const pulse = 20 + Math.sin(this.worldTime * 10) * 4;
            g.lineStyle(3, COLORS.pulse, 0.9);
            g.strokeCircle(selectedPos.x, selectedPos.y, clamp(pulse * this.cameraRig.zoom, 10, 26));
        });

        if (edit.selectedNode >= 0 && edit.selectedNodes.length === 1 && edit.selectedLinks.length === 0) {
            const selected = this.activeNodes.find((node) => node.index === edit.selectedNode);
            if (selected) {
                const selectedPos = this.worldToScreen(selected.displayX, selected.displayY);
                if (edit.active && edit.dragNode < 0 && !edit.boxSelecting) {
                    const pointerWorld = this.getPointerWorld();
                    const pointerPos = this.worldToScreen(pointerWorld.x, pointerWorld.y);
                    g.lineStyle(2, COLORS.base, 0.55);
                    g.lineBetween(selectedPos.x, selectedPos.y, pointerPos.x, pointerPos.y);
                }
            }
        }

        if (edit.hoverNode >= 0) {
            const hovered = this.activeNodes.find((node) => node.index === edit.hoverNode);
            if (hovered) {
                const hoveredPos = this.worldToScreen(hovered.displayX, hovered.displayY);
                g.lineStyle(3, COLORS.base, 0.9);
                g.strokeCircle(hoveredPos.x, hoveredPos.y, clamp(18 * this.cameraRig.zoom, 9, 20));
            }
        }

        if (edit.boxSelecting) {
            const from = this.worldToScreen(edit.boxStartX, edit.boxStartY);
            const to = this.worldToScreen(edit.boxEndX, edit.boxEndY);
            const left = Math.min(from.x, to.x);
            const top = Math.min(from.y, to.y);
            const widthRect = Math.abs(to.x - from.x);
            const heightRect = Math.abs(to.y - from.y);
            g.fillStyle(COLORS.base, 0.14);
            g.fillRect(left, top, widthRect, heightRect);
            g.lineStyle(2, COLORS.base, 0.72);
            g.strokeRect(left, top, widthRect, heightRect);
        }

        if (edit.deleteType === 'nodes' && edit.deleteNodes.length > 0) {
            const deleteNodeIds = new Set(edit.deleteNodes);
            this.activeNodes.forEach((node) => {
                if (!deleteNodeIds.has(node.index)) {
                    return;
                }
                const targetPos = this.worldToScreen(node.displayX, node.displayY);
                const radius = clamp(26 * this.cameraRig.zoom, 12, 28);
                g.lineStyle(4, COLORS.shadow, 0.6);
                g.strokeCircle(targetPos.x, targetPos.y, radius);
                g.lineStyle(4, COLORS.inverse, 0.95);
                g.beginPath();
                g.arc(targetPos.x, targetPos.y, radius, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * edit.deleteProgress, false);
                g.strokePath();
            });
        }
    },
    getDrivePhaseColor(phase) {
        switch (phase) {
            case 'burst':
                return 0xff7755;
            case 'hunt':
                return 0xff665c;
            case 'pursuit':
                return 0xffb347;
            case 'stable':
                return 0x66c6ff;
            default:
                return 0xffdd44;
        }
    },
    drawDebugOverlays(g) {
        const T = window.TUNING || {};
        if (T.showDriveRingsDebug) {
            this.drawDriveRingsDebug(g);
        }
        if (T.showDriveVectorsDebug) {
            this.drawDriveVectorsDebug(g);
        }
        if (T.showCameraRigDebug) {
            this.drawCameraRigDebug(g);
        }
    },
    drawDriveRingsDebug(g) {
        if (!this.player || !this.intent) return;

        const cx = this.player.centroidX;
        const cy = this.player.centroidY;
        const centerScreen = this.worldToScreen(cx, cy);
        const pointerScreen = this.worldToScreen(this.intent.pointerX ?? cx, this.intent.pointerY ?? cy);
        const phaseColor = this.getDrivePhaseColor(this.intent.pointerDrivePhase || this.intent.burstPhase);
        const innerRadius = this.intent.pointerDriveInnerRadius || 0;
        const middleRadius = this.intent.pointerDriveMiddleRadius || 0;
        const outerRadius = this.intent.pointerDriveOuterRadius || 0;

        if (innerRadius > 0) {
            g.lineStyle(2, 0x66c6ff, 0.16);
            g.strokeCircle(centerScreen.x, centerScreen.y, innerRadius * this.cameraRig.zoom);
            g.lineStyle(2, 0xffb347, 0.16);
            g.strokeCircle(centerScreen.x, centerScreen.y, middleRadius * this.cameraRig.zoom);
            g.lineStyle(2, 0xff665c, 0.18);
            g.strokeCircle(centerScreen.x, centerScreen.y, outerRadius * this.cameraRig.zoom);
        }

        if ((this.intent.pointerWorldDistance || 0) > 0.01) {
            g.lineStyle(2, phaseColor, 0.28 + clamp(this.intent.burstAggro || 0, 0, 1) * 0.32);
            g.lineBetween(centerScreen.x, centerScreen.y, pointerScreen.x, pointerScreen.y);
            g.fillStyle(phaseColor, 0.72);
            g.fillCircle(pointerScreen.x, pointerScreen.y, Math.max(6 * this.cameraRig.zoom, 4));
        }

        g.lineStyle(2, 0xffdd44, 0.9);
        g.strokeCircle(centerScreen.x, centerScreen.y, Math.max(12 * this.cameraRig.zoom, 6));
    },
    drawDriveVectorsDebug(g) {
        if (!this.player || !this.intent) return;

        const cx = this.player.centroidX;
        const cy = this.player.centroidY;
        const centerScreen = this.worldToScreen(cx, cy);
        const phaseColor = this.getDrivePhaseColor(this.intent.pointerDrivePhase || this.intent.burstPhase);

        if (this.intent.moveLength && this.intent.moveLength > 0.01) {
            const moveEnd = this.worldToScreen(cx + this.intent.moveX * 150, cy + this.intent.moveY * 150);
            g.lineStyle(2, 0x55ff55, 0.4);
            g.lineBetween(centerScreen.x, centerScreen.y, moveEnd.x, moveEnd.y);
            g.strokeCircle(moveEnd.x, moveEnd.y, Math.max(5 * this.cameraRig.zoom, 3));
        }

        const aimEnd = this.worldToScreen(cx + this.intent.aimX * 150, cy + this.intent.aimY * 150);
        g.lineStyle(2, 0xff5555, 0.4);
        g.lineBetween(centerScreen.x, centerScreen.y, aimEnd.x, aimEnd.y);
        g.strokeCircle(aimEnd.x, aimEnd.y, Math.max(5 * this.cameraRig.zoom, 3));

        const flowEnd = this.worldToScreen(cx + this.intent.flowX * 180, cy + this.intent.flowY * 180);
        g.lineStyle(4, phaseColor, 0.82);
        g.lineBetween(centerScreen.x, centerScreen.y, flowEnd.x, flowEnd.y);
        g.fillStyle(phaseColor, 0.8);
        g.fillCircle(flowEnd.x, flowEnd.y, Math.max(8 * this.cameraRig.zoom, 5));

        g.lineStyle(2, 0xffdd44, 0.9);
        g.strokeCircle(centerScreen.x, centerScreen.y, Math.max(12 * this.cameraRig.zoom, 6));
    },
    drawCameraRigDebug(g) {
        if (!this.player || !this.cameraRig) return;

        const viewportCenterX = this.cameraRig.viewportWidth * 0.5;
        const viewportCenterY = this.cameraRig.viewportHeight * 0.5;
        const centroidScreen = this.worldToScreen(this.player.centroidX, this.player.centroidY);
        const targetScreen = this.worldToScreen(this.cameraRig.targetX ?? this.cameraRig.x, this.cameraRig.targetY ?? this.cameraRig.y);
        const baseFocusScreen = this.worldToScreen(this.cameraRig.baseFocusX ?? this.cameraRig.x, this.cameraRig.baseFocusY ?? this.cameraRig.y);

        g.lineStyle(2, 0x6ce6ff, 0.4);
        g.lineBetween(viewportCenterX, viewportCenterY, centroidScreen.x, centroidScreen.y);
        g.lineStyle(2, 0xff7af6, 0.24);
        g.lineBetween(viewportCenterX, viewportCenterY, targetScreen.x, targetScreen.y);
        g.lineStyle(2, 0xa6fffa, 0.22);
        g.lineBetween(baseFocusScreen.x, baseFocusScreen.y, centroidScreen.x, centroidScreen.y);

        g.fillStyle(0x6ce6ff, 0.95);
        g.fillCircle(viewportCenterX, viewportCenterY, 6);
        g.lineStyle(2, 0xff7af6, 0.8);
        g.strokeCircle(targetScreen.x, targetScreen.y, 7);
        g.lineStyle(2, 0xa6fffa, 0.72);
        g.strokeCircle(baseFocusScreen.x, baseFocusScreen.y, 6);
        g.lineStyle(2, 0xffdd44, 0.88);
        g.strokeCircle(centroidScreen.x, centroidScreen.y, 8);
    },
};
