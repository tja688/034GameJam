

const SceneRenderMixin = {
    createRing(x, y, radius, color, life, thickness) {
        this.effects.push({ type: 'ring', x, y, radius, color, life, total: life, thickness });
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
        this.drawEffects(g);
        this.drawEnemies(g);
        this.drawProjectiles(g);
        this.drawFormation(g);
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
        g.fillStyle(COLORS.arena, 0.96);
        g.fillRect(0, 0, width, height);

        const worldLeft = this.cameraRig.x - width * 0.5 / this.cameraRig.zoom;
        const worldRight = this.cameraRig.x + width * 0.5 / this.cameraRig.zoom;
        const worldTop = this.cameraRig.y - height * 0.5 / this.cameraRig.zoom;
        const worldBottom = this.cameraRig.y + height * 0.5 / this.cameraRig.zoom;
        const gridSize = 120;
        const startX = Math.floor(worldLeft / gridSize) * gridSize;
        const startY = Math.floor(worldTop / gridSize) * gridSize;

        g.lineStyle(1, COLORS.grid, 0.48);
        for (let x = startX; x <= worldRight; x += gridSize) {
            const screen = this.worldToScreen(x, 0);
            g.lineBetween(screen.x, 0, screen.x, height);
        }
        for (let y = startY; y <= worldBottom; y += gridSize) {
            const screen = this.worldToScreen(0, y);
            g.lineBetween(0, screen.y, width, screen.y);
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
    drawEnemies(g) {
        this.enemies.forEach((enemy) => {
            const position = this.worldToScreen(enemy.x, enemy.y);
            const size = clamp(enemy.radius * this.cameraRig.zoom * 2, 12, 42);
            const color = enemy.hitFlash > 0 ? COLORS.pulse : enemy.color;
            drawShape(g, enemy.shape, position.x, position.y, size, color, 0.94, Math.atan2(enemy.vy, enemy.vx));
        });
    },
    drawProjectiles(g) {
        this.projectiles.forEach((projectile) => {
            const position = this.worldToScreen(projectile.x, projectile.y);
            g.lineStyle(2, projectile.color, projectile.alpha * 0.55);
            g.lineBetween(
                position.x - projectile.dirX * 12 * this.cameraRig.zoom,
                position.y - projectile.dirY * 12 * this.cameraRig.zoom,
                position.x + projectile.dirX * 12 * this.cameraRig.zoom,
                position.y + projectile.dirY * 12 * this.cameraRig.zoom
            );
            g.fillStyle(projectile.color, projectile.alpha);
            g.fillCircle(position.x, position.y, clamp(projectile.radius * this.cameraRig.zoom, 3, 7));
        });
    },
    drawFormation(g) {
        this.links.forEach((link) => {
            const render = this.getLinkRenderPoints(link);
            const from = this.worldToScreen(render.fromX, render.fromY);
            const to = this.worldToScreen(render.toX, render.toY);
            const rigidityWidth = link.rigidity === 'rigid' ? 0.9 : link.rigidity === 'flex' ? -0.35 : 0.15;
            const width = clamp(((link.kind === 'support' ? 1.4 : 2.1) + rigidityWidth + link.tension * (link.kind === 'support' ? 8 : 12)) * this.cameraRig.zoom, 1, 9);
            const color = link.samePolarity ? COLORS.link : COLORS.pulse;
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
                g.lineStyle(3, COLORS.pulse, node.pulseGlow * 0.9);
                g.strokeCircle(nodePos.x, nodePos.y, glowRadius);
            }

            const size = clamp(30 * this.cameraRig.zoom, 14, 28);
            drawShape(g, node.shape, nodePos.x, nodePos.y, size, node.color, 0.96, Math.atan2(node.vy, node.vx));
        });
    },
    drawHud(g) {
        const left = 22;
        const top = 22;
        const healthWidth = 180;
        const healthRatio = clamp(this.player.health / this.player.maxHealth, 0, 1);
        const shieldRatio = clamp(this.player.shield / 16, 0, 1);

        g.fillStyle(COLORS.shadow, 0.3);
        g.fillRect(left, top, healthWidth, 16);
        g.fillStyle(COLORS.health, 0.9);
        g.fillRect(left, top, healthWidth * healthRatio, 16);
        g.fillStyle(COLORS.shield, 0.85);
        g.fillRect(left, top + 20, healthWidth * shieldRatio, 8);

        const pressure = clamp(this.worldTime / 120, 0, 1);
        g.fillStyle(COLORS.shadow, 0.28);
        g.fillRect(left, top + 40, healthWidth, 6);
        g.fillStyle(COLORS.inverse, 0.78);
        g.fillRect(left, top + 40, healthWidth * pressure, 6);

        if (this.menuMode === 'pause') {
            g.fillStyle(0x000000, 0.18);
            g.fillRect(0, 0, this.scale.width, this.scale.height);
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
