const PRESENTATION_STYLE_PRESETS = Object.freeze([
    {
        paletteBoost: 0.12,
        motion: 0.24,
        edge: 0.22,
        heroBoost: 0.86
    },
    {
        paletteBoost: 0.2,
        motion: 0.46,
        edge: 0.42,
        heroBoost: 1
    },
    {
        paletteBoost: 0.3,
        motion: 0.72,
        edge: 0.68,
        heroBoost: 1.18
    }
]);

const PRESENTATION_MOMENT_DEFS = Object.freeze({
    objectiveSpawn: {
        duration: 0.42,
        cooldown: 0.18,
        minTimeScale: 1,
        focusWeight: 0.12,
        zoomBoost: 0.05,
        worldShake: 0.28,
        hudShake: 0.22,
        screenFlash: 0.1,
        bgmDuck: 0.16,
        radiusMul: 2.1,
        bandCount: 2,
        triangleCount: 4,
        audioEventId: ''
    },
    eliteKill: {
        duration: 0.46,
        cooldown: 0.16,
        minTimeScale: 0.44,
        focusWeight: 0.34,
        zoomBoost: 0.14,
        worldShake: 0.92,
        hudShake: 0.78,
        screenFlash: 0.18,
        bgmDuck: 0.34,
        radiusMul: 2.6,
        bandCount: 3,
        triangleCount: 6,
        audioEventId: 'hero_elite_kill'
    },
    objectiveBreak: {
        duration: 0.72,
        cooldown: 0.3,
        minTimeScale: 0.24,
        focusWeight: 0.48,
        zoomBoost: 0.2,
        worldShake: 1.28,
        hudShake: 1.1,
        screenFlash: 0.26,
        bgmDuck: 0.58,
        radiusMul: 3.1,
        bandCount: 5,
        triangleCount: 8,
        audioEventId: 'hero_objective_devoured'
    },
    stageAdvance: {
        duration: 0.8,
        cooldown: 0.32,
        minTimeScale: 0.34,
        focusWeight: 0.2,
        zoomBoost: 0.12,
        worldShake: 0.96,
        hudShake: 0.92,
        screenFlash: 0.2,
        bgmDuck: 0.42,
        radiusMul: 3.2,
        bandCount: 6,
        triangleCount: 0,
        sweep: true,
        audioEventId: ''
    },
    victory: {
        duration: 1.08,
        cooldown: 0.6,
        minTimeScale: 0.28,
        focusWeight: 0.24,
        zoomBoost: 0.18,
        worldShake: 1.12,
        hudShake: 1.08,
        screenFlash: 0.24,
        bgmDuck: 0.5,
        radiusMul: 3.6,
        bandCount: 7,
        triangleCount: 10,
        sweep: true,
        audioEventId: ''
    }
});

function getPresentationStylePresetIndex(rawValue) {
    return clamp(Math.round(Number.isFinite(rawValue) ? rawValue : 1), 0, PRESENTATION_STYLE_PRESETS.length - 1);
}

const ScenePresentationMixin = {
    createDefaultPresentationState() {
        return {
            heroMoments: [],
            palettePulse: 0,
            motionPulse: 0,
            edgePulse: 0,
            screenFlash: 0,
            heroFocusX: 0,
            heroFocusY: 0,
            heroFocusWeight: 0,
            heroZoomMul: 1,
            heroShake: 0,
            heroHudShake: 0,
            baseBgmVolume: null,
            lastAppliedBgmVolume: null,
            bgmDuckActive: false,
            lastTriggerAt: {}
        };
    },
    initPresentationSystem() {
        this.resetPresentationState();
        return this.presentationState;
    },
    ensurePresentationState() {
        if (!this.presentationState || typeof this.presentationState !== 'object') {
            this.presentationState = this.createDefaultPresentationState();
        }
        if (!Number.isFinite(this.presentationTimeScaleFactor)) {
            this.presentationTimeScaleFactor = 1;
        }
        return this.presentationState;
    },
    resetPresentationState() {
        const previousState = this.presentationState;
        if (this.audioManager?.setBusVolume && Number.isFinite(previousState?.baseBgmVolume)) {
            this.audioManager.setBusVolume('bgm', previousState.baseBgmVolume, { persist: false });
        }
        this.presentationState = this.createDefaultPresentationState();
        this.presentationTimeScaleFactor = 1;
        this.syncPresentationAudioDuck?.(0);
        return this.presentationState;
    },
    getPresentationProfile() {
        const presetIndex = getPresentationStylePresetIndex(this.getRunTuningValue?.('presentationStylePreset', 1) ?? 1);
        const preset = PRESENTATION_STYLE_PRESETS[presetIndex] || PRESENTATION_STYLE_PRESETS[1];
        return {
            presetIndex,
            paletteBoost: preset.paletteBoost * clamp(this.getRunTuningValue?.('presentationPaletteBoost', 1) ?? 1, 0, 2.5),
            motion: preset.motion,
            edge: preset.edge,
            heroBoost: preset.heroBoost * clamp(this.getRunTuningValue?.('presentationHeroImpactBoost', 1) ?? 1, 0.25, 2.5),
            bgmDuck: clamp(this.getRunTuningValue?.('presentationBgmDuck', 0.2) ?? 0.2, 0, 0.7)
        };
    },
    styleRunPalette(basePalette) {
        if (!basePalette) {
            return basePalette;
        }
        const state = this.ensurePresentationState();
        const profile = this.getPresentationProfile();
        const palettePulse = clamp(
            (state.palettePulse || 0)
            + (state.motionPulse || 0) * 0.16
            + (state.edgePulse || 0) * 0.08,
            0,
            1.6
        );
        const boost = clamp(profile.paletteBoost * (1 + palettePulse * 0.18), 0, 1.4);
        return {
            arena: blendColor(basePalette.arena, basePalette.grid, 0.1 + boost * 0.1),
            grid: blendColor(basePalette.grid, basePalette.signal, 0.08 + boost * 0.14),
            mist: blendColor(basePalette.mist, basePalette.pulse, 0.16 + boost * 0.18),
            pulse: blendColor(basePalette.pulse, COLORS.core, 0.08 + boost * 0.12),
            signal: blendColor(basePalette.signal, COLORS.core, 0.1 + boost * 0.16),
            threat: blendColor(basePalette.threat, COLORS.inverse, 0.12 + boost * 0.18)
        };
    },
    triggerPresentationMoment(kind, options = {}) {
        const definition = PRESENTATION_MOMENT_DEFS[kind];
        if (!definition) {
            return null;
        }
        const state = this.ensurePresentationState();
        const heroMomentsEnabled = this.getRunTuningToggle?.('presentationHeroMomentsEnabled', true) ?? true;
        const allowsPassiveMoment = kind === 'objectiveSpawn';
        if (!heroMomentsEnabled && !allowsPassiveMoment) {
            return null;
        }

        const now = getFiniteNumber(this.worldTime, 0);
        const lastTriggerAt = getFiniteNumber(state.lastTriggerAt?.[kind], -999);
        if (now - lastTriggerAt < (definition.cooldown || 0)) {
            return null;
        }
        state.lastTriggerAt[kind] = now;

        const profile = this.getPresentationProfile();
        const stagePalette = this.getCurrentStageDef?.()?.palette || this.getRunPalette?.() || {
            pulse: COLORS.pulse,
            signal: COLORS.core,
            threat: COLORS.health
        };
        const fallbackDir = vectorFromAngle(this.player?.heading ?? (-Math.PI * 0.5));
        const direction = normalize(
            getFiniteNumber(options.dirX, this.intent?.aimX ?? fallbackDir.x),
            getFiniteNumber(options.dirY, this.intent?.aimY ?? fallbackDir.y),
            fallbackDir.x,
            fallbackDir.y
        );
        const moment = {
            kind,
            x: getFiniteNumber(options.x, this.player?.centroidX ?? 0),
            y: getFiniteNumber(options.y, this.player?.centroidY ?? 0),
            dirX: direction.x,
            dirY: direction.y,
            shape: typeof options.shape === 'string' ? options.shape : 'circle',
            color: getFiniteNumber(options.color, stagePalette.signal || COLORS.core),
            accent: getFiniteNumber(options.accent, stagePalette.pulse || COLORS.pulse),
            radius: Math.max(42, getFiniteNumber(options.radius, this.getFormationSpan?.() || 120) * (definition.radiusMul || 1)),
            life: definition.duration,
            total: definition.duration,
            intensity: clamp(getFiniteNumber(options.intensity, 1) * profile.heroBoost, 0.25, 3),
            minTimeScale: this.getRunTuningToggle?.('presentationHeroTimeScaleEnabled', true) ?? true
                ? definition.minTimeScale
                : 1,
            focusWeight: definition.focusWeight || 0,
            zoomBoost: (definition.zoomBoost || 0) * profile.heroBoost,
            worldShake: (definition.worldShake || 0) * profile.heroBoost,
            hudShake: (definition.hudShake || 0) * profile.heroBoost,
            screenFlash: definition.screenFlash || 0,
            bgmDuck: definition.bgmDuck || 0,
            bandCount: definition.bandCount || 0,
            triangleCount: definition.triangleCount || 0,
            sweep: !!definition.sweep,
            phase: Math.random() * Math.PI * 2,
            visualEnergy: 1,
            progress: 0
        };

        state.heroMoments.unshift(moment);
        if (state.heroMoments.length > 6) {
            state.heroMoments.length = 6;
        }
        state.palettePulse = Math.max(state.palettePulse || 0, 0.22 + moment.intensity * (kind === 'objectiveBreak' ? 0.34 : 0.14));
        state.screenFlash = Math.max(state.screenFlash || 0, moment.screenFlash * 0.46);

        if (this.cameraRig) {
            this.cameraRig.shake = Math.max(this.cameraRig.shake || 0, moment.worldShake * 0.28);
            this.cameraRig.hudShake = Math.max(this.cameraRig.hudShake || 0, moment.hudShake * 0.26);
        }
        if (typeof this.createRing === 'function') {
            this.createRing(moment.x, moment.y, moment.radius * 0.28, moment.color, 0.22, 3, { source: 'presentation' });
            this.createRing(moment.x, moment.y, moment.radius * 0.18, moment.accent, 0.18, 2, { source: 'presentation' });
        }
        if (definition.audioEventId) {
            this.playAudioEvent?.(definition.audioEventId, {
                kind,
                x: moment.x,
                y: moment.y,
                shape: moment.shape
            });
        }
        return moment;
    },
    getPresentationCameraDirective() {
        const state = this.ensurePresentationState();
        return {
            x: getFiniteNumber(state.heroFocusX, this.player?.centroidX ?? 0),
            y: getFiniteNumber(state.heroFocusY, this.player?.centroidY ?? 0),
            weight: clamp(state.heroFocusWeight || 0, 0, 0.86),
            zoomMul: clamp(state.heroZoomMul || 1, 1, 1.32),
            worldShake: Math.max(0, state.heroShake || 0),
            hudShake: Math.max(0, state.heroHudShake || 0)
        };
    },
    syncPresentationAudioDuck(duck = 0) {
        if (!this.audioManager?.setBusVolume) {
            return;
        }
        const state = this.ensurePresentationState();
        const clampedDuck = clamp(duck, 0, 0.92);
        const currentBgmVolume = getFiniteNumber(this.audioManager.busVolumes?.bgm, AUDIO_DEFAULT_BUS_VOLUMES?.bgm ?? 0.72);
        if (clampedDuck > 0.001 && (!state.bgmDuckActive || !Number.isFinite(state.baseBgmVolume))) {
            state.baseBgmVolume = currentBgmVolume;
        }
        const baseVolume = getFiniteNumber(state.baseBgmVolume, currentBgmVolume);
        const targetVolume = clampedDuck > 0.001
            ? clamp(baseVolume * (1 - clampedDuck), 0, 2)
            : baseVolume;
        if (!Number.isFinite(state.lastAppliedBgmVolume) || Math.abs(targetVolume - state.lastAppliedBgmVolume) > 0.01) {
            this.audioManager.setBusVolume('bgm', targetVolume, { persist: false });
            state.lastAppliedBgmVolume = targetVolume;
        }
        state.bgmDuckActive = clampedDuck > 0.001;
        if (!state.bgmDuckActive && Math.abs(currentBgmVolume - targetVolume) < 0.02) {
            state.baseBgmVolume = targetVolume;
        }
    },
    updatePresentation(frameDt) {
        const state = this.ensurePresentationState();
        const profile = this.getPresentationProfile();
        const motionOverlayEnabled = this.getRunTuningToggle?.('presentationMotionOverlayEnabled', true) ?? true;
        const heroTimeScaleEnabled = this.getRunTuningToggle?.('presentationHeroTimeScaleEnabled', true) ?? true;
        const baseMotion = motionOverlayEnabled
            ? clamp(
                (this.player?.predationPressure || 0) * 0.52
                + (this.intent?.burstAggro || 0) * 0.64
                + (this.runState?.energyBeat || 0) * 0.24
                + (this.runState?.objectivePulse || 0) * 0.14,
                0,
                1.6
            )
            : 0;

        state.motionPulse = damp(state.motionPulse || 0, baseMotion, 4.6 + profile.motion * 2.8, frameDt);
        state.palettePulse = Math.max(0, (state.palettePulse || 0) - frameDt * 1.1);
        state.edgePulse = damp(state.edgePulse || 0, clamp(baseMotion * 0.72 + (state.screenFlash || 0) * 0.42, 0, 1.6), 7.6, frameDt);

        let heroFocusWeight = 0;
        let heroFocusX = this.player?.centroidX ?? 0;
        let heroFocusY = this.player?.centroidY ?? 0;
        let heroZoomMul = 1;
        let heroShake = 0;
        let heroHudShake = 0;
        let screenFlash = 0;
        let timeScale = 1;
        let bgmDuck = 0;

        for (let i = state.heroMoments.length - 1; i >= 0; i -= 1) {
            const moment = state.heroMoments[i];
            moment.life -= frameDt;
            if (moment.life <= 0) {
                state.heroMoments.splice(i, 1);
                continue;
            }
            const lifeRatio = clamp(moment.life / Math.max(0.0001, moment.total), 0, 1);
            const energy = Math.pow(lifeRatio, 0.58) * moment.intensity;
            const focusWeight = clamp(moment.focusWeight * energy * 0.76, 0, 0.82);
            moment.visualEnergy = energy;
            moment.progress = 1 - lifeRatio;
            if (focusWeight > heroFocusWeight) {
                heroFocusWeight = focusWeight;
                heroFocusX = moment.x;
                heroFocusY = moment.y;
            }
            heroZoomMul = Math.max(heroZoomMul, 1 + moment.zoomBoost * energy * 0.46);
            heroShake = Math.max(heroShake, moment.worldShake * energy);
            heroHudShake = Math.max(heroHudShake, moment.hudShake * energy);
            screenFlash = Math.max(screenFlash, moment.screenFlash * energy);
            bgmDuck = Math.max(bgmDuck, profile.bgmDuck * moment.bgmDuck * Math.min(1, energy));
            if (heroTimeScaleEnabled) {
                timeScale = Math.min(timeScale, 1 - (1 - moment.minTimeScale) * Math.min(1, energy * 0.95));
            }
        }

        state.screenFlash = Math.max(0, Math.max(state.screenFlash || 0, screenFlash) - frameDt * 2.7);
        state.heroFocusX = heroFocusX;
        state.heroFocusY = heroFocusY;
        state.heroFocusWeight = heroFocusWeight;
        state.heroZoomMul = heroZoomMul;
        state.heroShake = heroShake;
        state.heroHudShake = heroHudShake;

        if (this.cameraRig) {
            this.cameraRig.shake = Math.max(this.cameraRig.shake || 0, heroShake);
            this.cameraRig.hudShake = Math.max(this.cameraRig.hudShake || 0, heroHudShake);
        }

        const shouldFreeze = !this.player?.edit?.active && !this.menuMode && !this.paused;
        this.presentationTimeScaleFactor = shouldFreeze ? clamp(timeScale, 0.18, 1) : 1;
        this.syncPresentationAudioDuck(bgmDuck);
    },
    drawPresentationSweepBands(g, moment, palette, width, height) {
        if (!moment?.sweep || !(this.getRunTuningToggle?.('presentationStageSweepEnabled', true) ?? true)) {
            return;
        }
        const alpha = clamp(moment.visualEnergy || 0, 0, 1.8);
        const progress = clamp(moment.progress || 0, 0, 1);
        const bandColors = [palette.signal, palette.pulse, palette.threat];
        for (let i = 0; i < moment.bandCount; i += 1) {
            const lane = moment.bandCount <= 1 ? 0.5 : i / Math.max(1, moment.bandCount - 1);
            const bandProgress = progress * 1.1 - lane * 0.12;
            const travel = -width * 0.4 + bandProgress * width * 1.8;
            const y = height * (0.18 + lane * 0.64);
            const color = bandColors[i % bandColors.length];
            const opacity = clamp((0.025 + alpha * 0.045) * (1 - lane * 0.08), 0, 0.14);
            drawShape(g, 'rect', travel, y, Math.max(width, height) * 0.42, color, opacity, -0.48, 2.7, 0.16);
        }
    },
    drawPresentationMomentGeometry(g, moment, palette) {
        const width = this.cameraRig?.viewportWidth || this.scale?.width || 1;
        const height = this.cameraRig?.viewportHeight || this.scale?.height || 1;
        const position = this.worldToScreen(moment.x, moment.y);
        const radius = clamp(moment.radius * this.cameraRig.zoom * (0.18 + moment.visualEnergy * 0.1), 20, Math.max(width, height) * 0.42);
        if (!this.isScreenCircleVisible(position.x, position.y, radius * 1.8, 120)) {
            return;
        }
        const angle = Math.atan2(moment.dirY || 0, moment.dirX || 1);
        const alpha = clamp(moment.visualEnergy || 0, 0, 1.8);

        g.fillStyle(blendColor(moment.color, COLORS.core, 0.34), 0.028 + alpha * 0.065);
        g.fillCircle(position.x, position.y, radius * 1.28);

        g.lineStyle(clamp(1.6 + alpha * 2.2, 1, 6), moment.color, 0.14 + alpha * 0.34);
        g.strokeCircle(position.x, position.y, radius * (0.88 + (moment.progress || 0) * 0.16));
        g.lineStyle(clamp(1.2 + alpha * 1.6, 1, 4), moment.accent, 0.08 + alpha * 0.22);
        g.strokeCircle(position.x, position.y, radius * 0.56);

        if (moment.bandCount > 0) {
            for (let i = 0; i < moment.bandCount; i += 1) {
                const lane = moment.bandCount <= 1 ? 0.5 : i / Math.max(1, moment.bandCount - 1);
                const backOffset = radius * (0.58 + lane * 0.46);
                const bandX = position.x - Math.cos(angle) * backOffset;
                const bandY = position.y - Math.sin(angle) * backOffset;
                const color = i % 2 === 0 ? moment.accent : palette.pulse;
                const opacity = clamp((0.035 + alpha * 0.052) * (1 - lane * 0.16), 0, 0.16);
                drawShape(g, 'rect', bandX, bandY, radius * 1.18, color, opacity, angle, 1.9 + lane * 0.44, 0.14 + lane * 0.03);
            }
        }

        if (moment.triangleCount > 0) {
            for (let i = 0; i < moment.triangleCount; i += 1) {
                const t = i / moment.triangleCount;
                const triAngle = moment.phase + angle + t * Math.PI * 2 + (moment.progress || 0) * 0.6;
                const orbit = radius * (0.86 + (i % 3) * 0.12);
                const triX = position.x + Math.cos(triAngle) * orbit;
                const triY = position.y + Math.sin(triAngle) * orbit;
                const color = i % 2 === 0 ? moment.color : moment.accent;
                drawShape(
                    g,
                    'triangle',
                    triX,
                    triY,
                    radius * (0.14 + alpha * 0.02),
                    color,
                    0.06 + alpha * 0.11,
                    triAngle + Math.PI * 0.5
                );
            }
        }

        drawShape(
            g,
            moment.shape,
            position.x,
            position.y,
            radius * (0.24 + alpha * 0.05),
            blendColor(moment.accent, COLORS.core, 0.26),
            0.08 + alpha * 0.16,
            angle
        );
    },
    drawPresentationWorld(g) {
        const state = this.ensurePresentationState();
        if (!g || (
            !(this.getRunTuningToggle?.('presentationMotionOverlayEnabled', true) ?? true)
            && !(state.heroMoments?.length > 0)
            && !((state.screenFlash || 0) > 0.01)
        )) {
            return;
        }
        const width = this.cameraRig?.viewportWidth || this.scale?.width || 1;
        const height = this.cameraRig?.viewportHeight || this.scale?.height || 1;
        const palette = this.getRunPalette ? this.getRunPalette() : {
            pulse: COLORS.pulse,
            signal: COLORS.core,
            threat: COLORS.health
        };
        const profile = this.getPresentationProfile();
        const motionAlpha = clamp((state.motionPulse || 0) * profile.motion, 0, 1.6);

        if ((this.getRunTuningToggle?.('presentationMotionOverlayEnabled', true) ?? true) && motionAlpha > 0.02) {
            const bandCount = 2 + Math.round(profile.motion * 2.5);
            for (let i = 0; i < bandCount; i += 1) {
                const t = bandCount <= 1 ? 0.5 : i / Math.max(1, bandCount - 1);
                const x = lerp(-width * 0.12, width * 1.12, t);
                const y = height * (0.16 + t * 0.7) + Math.sin(this.worldTime * 4.4 + i * 0.9) * height * 0.024 * motionAlpha;
                const color = i % 2 === 0 ? palette.pulse : palette.signal;
                drawShape(g, 'rect', x, y, Math.max(width, height) * 0.22, color, 0.015 + motionAlpha * 0.018, -0.52, 2.2, 0.12);
            }
        }

        state.heroMoments.forEach((moment) => {
            this.drawPresentationSweepBands(g, moment, palette, width, height);
        });

        if ((state.screenFlash || 0) > 0.01) {
            g.fillStyle(blendColor(palette.signal, COLORS.core, 0.42), 0.015 + (state.screenFlash || 0) * 0.05);
            g.fillRect(0, 0, width, height);
        }

        state.heroMoments.forEach((moment) => {
            this.drawPresentationMomentGeometry(g, moment, palette);
        });
    },
    drawPresentationHud(g) {
        if (!g) {
            return;
        }
        const state = this.ensurePresentationState();
        const palette = this.getRunPalette ? this.getRunPalette() : {
            pulse: COLORS.pulse,
            signal: COLORS.core,
            threat: COLORS.health
        };
        const profile = this.getPresentationProfile();
        const width = this.cameraRig?.viewportWidth || this.scale?.width || 1;
        const height = this.cameraRig?.viewportHeight || this.scale?.height || 1;
        const edgeEnergy = clamp((state.edgePulse || 0) * profile.edge + (state.screenFlash || 0) * 0.8, 0, 1.8);
        if (edgeEnergy <= 0.01) {
            return;
        }

        g.lineStyle(2, palette.signal, 0.04 + edgeEnergy * 0.1);
        g.strokeRect(10, 10, width - 20, height - 20);

        const triSize = 28 + edgeEnergy * 18;
        const triAlpha = 0.05 + edgeEnergy * 0.08;
        drawShape(g, 'triangle', 24, 24, triSize, palette.signal, triAlpha, -Math.PI * 0.75);
        drawShape(g, 'triangle', width - 24, 24, triSize, palette.signal, triAlpha, -Math.PI * 0.25);
        drawShape(g, 'triangle', 24, height - 24, triSize, palette.signal, triAlpha, Math.PI * 0.75);
        drawShape(g, 'triangle', width - 24, height - 24, triSize, palette.signal, triAlpha, Math.PI * 0.25);

        const bandAlpha = 0.025 + edgeEnergy * 0.028;
        drawShape(g, 'rect', width * 0.12, height * 0.5, height * 0.18, palette.pulse, bandAlpha, Math.PI * 0.5, 1.8, 0.16);
        drawShape(g, 'rect', width * 0.88, height * 0.5, height * 0.18, palette.pulse, bandAlpha, Math.PI * 0.5, 1.8, 0.16);
    }
};
