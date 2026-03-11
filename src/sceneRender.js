

const SceneRenderMixin = {
    createRing(x, y, radius, color, life, thickness) {
        this.effects.push({ type: 'ring', x, y, radius, color, life, total: life, thickness });
    },
    addScreenShake(worldAmount = 0, hudAmount = worldAmount) {
        if (!this.cameraRig) {
            return;
        }
        this.cameraRig.shake = Math.max(this.cameraRig.shake || 0, worldAmount);
        this.cameraRig.hudShake = Math.max(this.cameraRig.hudShake || 0, hudAmount);
    },
    updateEffects(simDt) {
        for (let i = this.effects.length - 1; i >= 0; i -= 1) {
            this.effects[i].life -= simDt;
            if (this.effects[i].life <= 0) {
                this.effects.splice(i, 1);
            }
        }
    },
    render() {
        const g = this.graphics;
        g.clear();
        this.drawWorld(g);
        this.drawFragments(g);
        this.drawPrey(g);
        this.drawPredationLinks(g);
        this.drawFormation(g);
        this.drawEffects(g);
        if (this.player.edit.active || this.player.edit.ambience > 0.01) {
            this.drawEditOverlay(g);
        }
        if (window.TUNING && window.TUNING.showDebugVisuals) {
            this.drawDebugOverlays(g);
        }
        this.drawHud(g);
    },
    drawWorld(g) {
        const width = this.cameraRig.viewportWidth;
        const height = this.cameraRig.viewportHeight;
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

        g.lineStyle(1, palette.grid, 0.42 + stageFlash * 0.06);
        for (let x = startX; x <= worldRight; x += gridSize) {
            const screen = this.worldToScreen(x, 0);
            g.lineBetween(screen.x, 0, screen.x, height);
        }
        for (let y = startY; y <= worldBottom; y += gridSize) {
            const screen = this.worldToScreen(0, y);
            g.lineBetween(0, screen.y, width, screen.y);
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
            const position = this.worldToScreen(effect.x, effect.y);
            const alpha = clamp(effect.life / effect.total, 0, 1);
            g.lineStyle(effect.thickness, effect.color, alpha * 0.9);
            g.strokeCircle(position.x, position.y, effect.radius * this.cameraRig.zoom + (1 - alpha) * 18);
        });
    },
    drawFragments(g) {
        this.fragments.forEach((fragment) => {
            const position = this.worldToScreen(fragment.x, fragment.y);
            const alpha = clamp(fragment.life / fragment.total, 0, 1) * (fragment.collectible ? 0.96 : 0.8);
            const pulse = fragment.kind === 'energy'
                ? 1 + Math.sin(this.worldTime * 10 + fragment.pulse) * 0.14
                : 1;
            const size = clamp(fragment.size * pulse * this.cameraRig.zoom, 2, 20);
            const trailX = position.x - fragment.vx * 0.016 * this.cameraRig.zoom;
            const trailY = position.y - fragment.vy * 0.016 * this.cameraRig.zoom;
            g.lineStyle(Math.max(1, size * 0.28), fragment.color, alpha * (fragment.collectible ? 0.24 : 0.14));
            g.lineBetween(trailX, trailY, position.x, position.y);
            if (fragment.kind === 'energy') {
                g.lineStyle(1.5, COLORS.core, alpha * 0.32);
                g.strokeCircle(position.x, position.y, size + 2);
            }
            drawShape(g, fragment.shape, position.x, position.y, size * 2, fragment.color, alpha, fragment.rotation);
        });
    },
    drawPrey(g) {
        this.prey.forEach((prey) => {
            const position = this.worldToScreen(prey.displayX, prey.displayY);
            const healthRatio = clamp(prey.health / Math.max(prey.maxHealth, 1), 0, 1);
            const carve = clamp(prey.carve || 0, 0, 2);
            const gorePulse = clamp(prey.gorePulse || 0, 0, 2);
            const devourGlow = clamp(prey.devourGlow || 0, 0, 2);
            const shakeX = Math.cos(prey.pulse * 1.7 + prey.seed) * (prey.shudder + gorePulse * 0.4) * 4.4 * this.cameraRig.zoom;
            const shakeY = Math.sin(prey.pulse * 1.2 + prey.seed * 0.7) * (prey.shudder + gorePulse * 0.4) * 4.4 * this.cameraRig.zoom;
            const pulseScale = 1
                + Math.sin(prey.pulse) * (prey.shape === 'circle' ? 0.08 : 0.04)
                + prey.wound * 0.08
                + carve * 0.04
                + (prey.guardPulse || 0) * 0.08
                + (prey.isObjective ? 0.06 : 0);
            const chewShrink = 1 - (1 - healthRatio) * (prey.sizeKey === 'large' ? 0.1 : prey.sizeKey === 'medium' ? 0.06 : 0.03);
            const baseSize = prey.radius * 2 * pulseScale * chewShrink * this.cameraRig.zoom;
            const size = clamp(baseSize, 14, prey.sizeKey === 'large' ? 220 : prey.sizeKey === 'medium' ? 156 : 118);
            const x = position.x + shakeX;
            const y = position.y + shakeY;
            const color = prey.hitFlash > 0 ? COLORS.core : prey.color;

            drawShape(g, prey.shape, x + 4, y + 5, size * 1.1, COLORS.shadow, 0.46, prey.displayRotation);
            if (prey.sizeKey !== 'small') {
                drawShape(g, prey.shape, x, y, size * (1.12 + carve * 0.05), COLORS.shadow, 0.14 + gorePulse * 0.08, prey.displayRotation);
            }
            if ((prey.guardPulse || 0) > 0.04) {
                g.lineStyle(clamp((2 + prey.guardPulse * 3) * this.cameraRig.zoom, 1, 5), prey.signalColor || prey.color, 0.2 + prey.guardPulse * 0.26);
                g.strokeCircle(x, y, size * 0.66);
            }
            if (prey.wound > 0.02) {
                drawShape(g, prey.shape, x, y, size * (1.04 + prey.wound * 0.08), COLORS.gore, 0.2 + prey.wound * 0.34 + gorePulse * 0.08, prey.displayRotation);
            }
            if (devourGlow > 0.02) {
                drawShape(g, prey.shape, x, y, size * (0.68 + devourGlow * 0.06), COLORS.energy, 0.08 + devourGlow * 0.14, prey.displayRotation + prey.spin * 0.03);
            }
            drawShape(g, prey.shape, x, y, size, color, 0.95, prey.displayRotation);
            if (prey.exposed > 0.03) {
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
            if (prey.attachments.length > 0) {
                (prey.attachments || []).forEach((attachment) => {
                    const node = this.activeNodes.find((entry) => entry.index === attachment.nodeIndex);
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
            if (prey.weakArc > 0) {
                const weakSpotX = x + Math.cos(prey.weakAngle) * size * 0.18;
                const weakSpotY = y + Math.sin(prey.weakAngle) * size * 0.18;
                drawShape(g, 'circle', weakSpotX, weakSpotY, size * 0.22, prey.signalColor || COLORS.core, 0.18 + clamp(prey.exposed || 0, 0, 1) * 0.24, 0);
            }
            if (prey.attachments.length > 0) {
                g.lineStyle(clamp((1.6 + prey.attachments.length * 0.52) * this.cameraRig.zoom, 1, 5), COLORS.pulse, 0.2 + prey.attachments.length * 0.05 + gorePulse * 0.06);
                g.strokeCircle(x, y, size * 0.32);
            }
            if (prey.isObjective) {
                g.lineStyle(clamp((2.2 + Math.sin(this.worldTime * 5 + prey.seed) * 0.4) * this.cameraRig.zoom, 1, 5), prey.signalColor || COLORS.core, 0.34 + clamp(this.runState?.objectivePulse || 0, 0, 1) * 0.24);
                g.strokeCircle(x, y, size * 0.86);
                g.lineStyle(clamp(1.6 * this.cameraRig.zoom, 1, 3), COLORS.core, 0.2 + (prey.objectiveGlow || 0) * 0.16);
                g.strokeCircle(x, y, size * 0.56);
            }
        });
    },
    drawPredationLinks(g) {
        this.prey.forEach((prey) => {
            (prey.attachments || []).forEach((attachment) => {
                const node = this.activeNodes.find((entry) => entry.index === attachment.nodeIndex);
                if (!node) {
                    return;
                }
                const nodePos = this.worldToScreen(node.displayX, node.displayY);
                const preyPos = this.worldToScreen(prey.displayX, prey.displayY);
                const attachX = lerp(nodePos.x, preyPos.x, 0.32);
                const attachY = lerp(nodePos.y, preyPos.y, 0.32);
                const color = attachment.mode === 'hook'
                    ? COLORS.triangle
                    : attachment.mode === 'grind'
                        ? COLORS.square
                        : COLORS.circle;
                const width = clamp((2.2 + attachment.depth * 5.2 + (prey.gorePulse || 0) * 0.8) * this.cameraRig.zoom, 1, 8);
                g.lineStyle(width, color, 0.28 + attachment.depth * 0.48 + (prey.gorePulse || 0) * 0.08);
                g.lineBetween(nodePos.x, nodePos.y, attachX, attachY);
                g.lineStyle(Math.max(1, width * 0.58), COLORS.pulse, 0.2 + attachment.depth * 0.3 + (prey.devourGlow || 0) * 0.06);
                g.lineBetween(attachX, attachY, preyPos.x, preyPos.y);
                g.fillStyle(color, 0.82);
                g.fillCircle(attachX, attachY, clamp((3 + attachment.depth * 3) * this.cameraRig.zoom, 2, 5));
                g.fillStyle(COLORS.core, 0.12 + attachment.depth * 0.14);
                g.fillCircle(preyPos.x, preyPos.y, clamp((2 + attachment.depth * 2.4) * this.cameraRig.zoom, 1, 4));
            });
        });
    },
    drawFormation(g) {
        const palette = this.getRunPalette ? this.getRunPalette() : { pulse: COLORS.pulse, signal: COLORS.core };
        const energyRatio = this.getEnergyRatio ? this.getEnergyRatio() : 1;
        const energyGainPulse = clamp(this.runState?.energyGainPulse || 0, 0, 1.4);
        const energyLossPulse = clamp(this.runState?.energyLossPulse || 0, 0, 1.4);
        const energyBeat = clamp(this.runState?.energyBeat || 0, 0, 1);
        const lowEnergyPulse = clamp(this.runState?.lowEnergyPulse || 0, 0, 1);
        const growthPulse = clamp(this.runState?.growthPulse || 0, 0, 1);
        const victoryPulse = clamp(this.player.victoryPulse || 0, 0, 1);
        if (energyRatio > 0.02 || growthPulse > 0.02 || victoryPulse > 0.02) {
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
            if (node.pulseGlow > 0) {
                g.lineStyle(3, palette.pulse, node.pulseGlow * 0.9);
                g.strokeCircle(nodePos.x, nodePos.y, glowRadius);
            }

            if (node.biteGlow > 0.01) {
                g.lineStyle(clamp((2.2 + node.biteGlow * 1.6) * this.cameraRig.zoom, 1, 4), node.color, node.biteGlow * 0.5);
                g.strokeCircle(nodePos.x, nodePos.y, clamp((16 + node.biteGlow * 10) * this.cameraRig.zoom, 8, 26));
            }

            let size = clamp(30 * this.cameraRig.zoom, 14, 28);
            let rotation = Number.isFinite(node.displayAngle) ? node.displayAngle : Math.atan2(node.vy, node.vx);
            if (node.shape === 'circle') {
                const pulse = 1 + Math.sin(this.worldTime * 9 + node.order * 1.7) * 0.1 * (0.6 + node.feedPulse + growthPulse * 0.4 + victoryPulse * 0.8);
                size *= pulse;
            } else if (node.shape === 'square') {
                size *= 1 + node.biteGlow * 0.08 + victoryPulse * 0.04;
                if (node.spinVelocity > 0.02) {
                    g.lineStyle(clamp((1.8 + node.spinVelocity * 0.04) * this.cameraRig.zoom, 1, 4), COLORS.core, 0.12 + node.biteGlow * 0.18);
                    g.strokeCircle(nodePos.x, nodePos.y, clamp(size * 0.56, 5, 22));
                }
            } else {
                size *= 1 + node.hookTension * 0.1;
                if (node.hookTension > 0.02) {
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

            drawShape(g, node.shape, nodePos.x, nodePos.y, size, node.color, 0.96, rotation);
            if (node.shape === 'circle' && node.feedPulse > 0.02) {
                g.fillStyle(COLORS.core, 0.18 + node.feedPulse * 0.14);
                g.fillCircle(nodePos.x, nodePos.y, clamp(size * 0.18, 2, 7));
                g.lineStyle(clamp((1.6 + node.feedPulse * 1.2) * this.cameraRig.zoom, 1, 3), COLORS.energy, 0.16 + node.feedPulse * 0.14);
                g.strokeCircle(nodePos.x, nodePos.y, clamp(size * (0.26 + node.feedPulse * 0.06), 4, 16));
            }
        });
    },
    drawHud(g) {
        const hudJolt = clamp(this.runState?.hudJolt || 0, 0, 1.4);
        const hudBeat = clamp(this.runState?.energyBeat || 0, 0, 1);
        const lowEnergy = clamp(this.runState?.lowEnergyPulse || 0, 0, 1);
        const energyGainPulse = clamp(this.runState?.energyGainPulse || 0, 0, 1.4);
        const energyLossPulse = clamp(this.runState?.energyLossPulse || 0, 0, 1.4);
        const barWidth = Math.min(this.scale.width - 56, clamp(this.scale.width * 0.42, 300, 560));
        const left = this.scale.width * 0.5 - barWidth * 0.5 + (this.cameraRig?.hudOffsetX || 0) + Math.sin(this.worldTime * 42) * hudJolt * 2.4;
        const top = 24 + (this.cameraRig?.hudOffsetY || 0) + Math.cos(this.worldTime * 35) * hudJolt * 1.6;
        const barHeight = 26 + hudBeat * 3 + lowEnergy * 2;
        const palette = this.getRunPalette ? this.getRunPalette() : { pulse: COLORS.pulse, signal: COLORS.core, threat: COLORS.health };
        const maxEnergy = Math.max(1, this.player.maxEnergy || 100);
        const energy = clamp((this.player.energyDisplay || this.player.energy || 0) / maxEnergy, 0, 1);
        const energyGhost = clamp((this.player.energyGhost || this.player.energy || 0) / maxEnergy, 0, 1);
        const growth = this.getGrowthRatio ? this.getGrowthRatio() : 0;
        const progress = this.getStageProgressRatio ? this.getStageProgressRatio() : 0;
        const predation = clamp(this.player.predationPressure || 0, 0, 1);
        const objectivePulse = clamp(this.runState?.objectivePulse || 0, 0, 1);
        const panelHeight = 118 + hudBeat * 4;

        g.fillStyle(COLORS.shadow, 0.48);
        g.fillRoundedRect(left - 18, top - 14, barWidth + 36, panelHeight, 18);
        g.fillStyle(lowEnergy > 0.04 ? COLORS.health : palette.signal, 0.08 + lowEnergy * 0.16 + energyGainPulse * 0.06);
        g.fillRoundedRect(left - 12, top - 8, barWidth + 24, barHeight + 20, 16);
        g.fillStyle(COLORS.shadow, 0.54);
        g.fillRoundedRect(left, top, barWidth, barHeight, 12);

        const filledWidth = barWidth * energy;
        const ghostWidth = barWidth * energyGhost;
        if (ghostWidth > filledWidth + 2) {
            g.fillStyle(COLORS.health, 0.28 + energyLossPulse * 0.14);
            g.fillRoundedRect(left + filledWidth, top + 2, ghostWidth - filledWidth, Math.max(6, barHeight - 4), 8);
        } else if (filledWidth > ghostWidth + 2) {
            g.fillStyle(COLORS.energy, 0.24 + energyGainPulse * 0.18);
            g.fillRoundedRect(left + ghostWidth, top + 2, filledWidth - ghostWidth, Math.max(6, barHeight - 4), 8);
        }

        const segmentCount = 24;
        for (let i = 0; i < segmentCount; i += 1) {
            const startRatio = i / segmentCount;
            const endRatio = (i + 1) / segmentCount;
            if (energy <= startRatio) {
                break;
            }
            const segmentLeft = left + barWidth * startRatio;
            const segmentRight = left + barWidth * Math.min(endRatio, energy);
            const segmentWidth = Math.max(1, segmentRight - segmentLeft - 1);
            const colorRatio = i / Math.max(1, segmentCount - 1);
            const warmColor = colorRatio < 0.34
                ? blendColor(COLORS.health, COLORS.inverse, colorRatio / 0.34)
                : colorRatio < 0.68
                    ? blendColor(COLORS.inverse, palette.signal, (colorRatio - 0.34) / 0.34)
                    : blendColor(palette.signal, palette.pulse, (colorRatio - 0.68) / 0.32);
            const fillColor = lowEnergy > 0.08
                ? blendColor(warmColor, COLORS.health, lowEnergy * Math.max(0, 1 - colorRatio) * 0.45)
                : warmColor;
            g.fillStyle(fillColor, 0.92);
            g.fillRect(segmentLeft, top + 2, segmentWidth, Math.max(4, barHeight - 4));
        }

        if (filledWidth > 4) {
            g.fillStyle(COLORS.core, 0.14 + energyGainPulse * 0.12 + hudBeat * 0.08);
            g.fillRoundedRect(left + 6, top + 4, Math.max(0, filledWidth - 12), Math.max(4, barHeight * 0.32), 7);
        }

        const edgeX = left + filledWidth;
        if (filledWidth > 0) {
            g.lineStyle(3, COLORS.core, 0.34 + energyGainPulse * 0.18 + lowEnergy * 0.12);
            g.lineBetween(edgeX, top - 2, edgeX, top + barHeight + 2);
        }

        if (lowEnergy > 0.02) {
            const pulseWidth = barWidth * (0.18 + lowEnergy * 0.12);
            const pulseOffset = (Math.sin(this.worldTime * 12) * 0.5 + 0.5) * Math.max(0, barWidth - pulseWidth);
            g.fillStyle(COLORS.health, 0.08 + lowEnergy * 0.12);
            g.fillRoundedRect(left + pulseOffset, top + 2, pulseWidth, Math.max(4, barHeight - 4), 10);
        }

        g.lineStyle(3, lowEnergy > 0.08 ? COLORS.health : palette.signal, 0.34 + objectivePulse * 0.16 + lowEnergy * 0.28);
        g.strokeRoundedRect(left - 4, top - 4, barWidth + 8, barHeight + 8, 14);

        const growthTop = top + barHeight + 12;
        const growthHeight = 10;
        const predTop = growthTop + 16;
        const predHeight = 8;
        g.fillStyle(COLORS.shadow, 0.42);
        g.fillRoundedRect(left, growthTop, barWidth, growthHeight, 5);
        g.fillRoundedRect(left, predTop, barWidth, predHeight, 4);
        g.fillStyle(palette.pulse, 0.9);
        g.fillRoundedRect(left, growthTop, barWidth * growth, growthHeight, 5);
        g.fillStyle(palette.threat, 0.9);
        g.fillRoundedRect(left, predTop, barWidth * predation, predHeight, 4);

        const stageCount = this.getStageCount ? this.getStageCount() : 4;
        const stageIndex = clamp(this.runState?.stageIndex || 0, 0, stageCount - 1);
        const pipSpacing = 34;
        const pipStartX = left + barWidth - pipSpacing * (stageCount - 1);
        const pipY = predTop + 26;
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
