

const SceneCombatMixin = {
    addShield(amount) {
        this.player.shield = Math.min(16, this.player.shield + amount);
        this.player.shieldTimer = 1.2;
    },
    fireVolley(node, edge) {
        const target = this.pickRangedTarget(node.x, node.y, this.intent.aimX, this.intent.aimY);
        const fireDir = target ? normalize(target.x - node.x, target.y - node.y, this.intent.aimX, this.intent.aimY) : normalize(this.intent.aimX, this.intent.aimY, Math.cos(this.player.heading), Math.sin(this.player.heading));
        const effectiveEnergy = Math.max(1, this.player.energy);
        const projectileCount = effectiveEnergy === 3 ? 3 : effectiveEnergy;
        const spread = projectileCount === 1 ? [0] : projectileCount === 2 ? [-0.09, 0.09] : [-0.18, 0, 0.18];
        const damage = 9 + effectiveEnergy * 4 + this.player.overload * 2;
        const baseAngle = Math.atan2(fireDir.y, fireDir.x);

        { const T = window.TUNING || {}; this.plantNode(node, { forwardBase: T.plantDartForward ?? 148, sideBase: T.plantDartSide ?? 54, stance: (T.plantDartStance ?? 0.42) * edge.stance, strength: (T.plantDartStrength ?? 330) * edge.stability, reachScale: edge.reach, flowBias: T.plantDartFlowBias ?? 0.32, aimBias: T.plantDartAimBias ?? 0.68 }); }

        spread.forEach((offset) => {
            const angle = baseAngle + offset;
            this.projectiles.push({
                x: node.x + Math.cos(angle) * 24,
                y: node.y + Math.sin(angle) * 24,
                vx: Math.cos(angle) * (440 + effectiveEnergy * 70),
                vy: Math.sin(angle) * (440 + effectiveEnergy * 70),
                dirX: Math.cos(angle),
                dirY: Math.sin(angle),
                damage,
                pierce: this.player.overload > 0 ? 1 : 0,
                life: 1.15,
                radius: 7,
                color: node.color,
                alpha: 0.9
            });
        });

        if (this.player.guard > 0) {
            this.addShield(this.player.guard * 8);
        }
        if (this.player.echo > 0) {
            this.echoQueue.push({ type: 'volley', timer: 0.14, x: node.x, y: node.y, angle: baseAngle, count: projectileCount, damage: damage * 0.6 });
        }

        node.attackTimer = 0.16;
        node.attackDirX = fireDir.x;
        node.attackDirY = fireDir.y;
        node.attackDamage = damage * 0.35;
        this.createRing(node.x, node.y, 34, COLORS.pulse, 0.18, 2);
        this.clearExecutionState();
    },
    performSlash(node, edge) {
        const driveIntent = this.resolveNodeDriveIntent(node);
        const strikeDir = normalize(
            driveIntent.flow.x * 0.58 + driveIntent.focus.x * 0.42,
            driveIntent.flow.y * 0.58 + driveIntent.focus.y * 0.42,
            Math.cos(this.player.heading),
            Math.sin(this.player.heading)
        );
        const effectiveEnergy = Math.max(1, this.player.energy);
        const damage = (13 + effectiveEnergy * 6 + this.player.overload * 4) * edge.reach;

        { const T = window.TUNING || {}; this.plantNode(node, { forwardBase: T.plantBladeForward ?? 184, sideBase: T.plantBladeSide ?? 26, stance: (T.plantBladeStance ?? 0.34) * edge.stance, strength: T.plantBladeStrength ?? 460, reachScale: edge.reach * 1.08, flowBias: T.plantBladeFlowBias ?? 0.62, aimBias: T.plantBladeAimBias ?? 0.38 }); }
        this.slashCone(node.x, node.y, strikeDir.x, strikeDir.y, 150 + effectiveEnergy * 24, 0.84, damage, 260, 0);

        if (this.player.echo > 0) {
            this.echoQueue.push({ type: 'slash', timer: 0.11, x: node.x, y: node.y, dirX: strikeDir.x, dirY: strikeDir.y, range: 120 + effectiveEnergy * 18, damage: damage * 0.6 });
        }
        if (this.player.overload > 0) {
            this.echoQueue.push({ type: 'burst', timer: 0.14, x: node.anchorX, y: node.anchorY, range: 120 + effectiveEnergy * 18, damage: 10 + effectiveEnergy * 4 + this.player.overload * 4 });
        }
        if (this.player.guard > 0) {
            this.addShield(this.player.guard * 4);
        }

        node.attackTimer = 0.24;
        node.attackDirX = strikeDir.x;
        node.attackDirY = strikeDir.y;
        node.attackDamage = damage * 0.5;
        this.createRing(node.anchorX, node.anchorY, 42, COLORS.inverse, 0.22, 3);
        this.clearExecutionState();
    },
    clearExecutionState() {
        this.player.energy = 0;
        this.player.guard = 0;
        this.player.overload = 0;
        this.player.echo = 0;
    },
    updateEchoes(simDt) {
        for (let i = this.echoQueue.length - 1; i >= 0; i -= 1) {
            const echo = this.echoQueue[i];
            echo.timer -= simDt;
            if (echo.timer > 0) {
                continue;
            }

            if (echo.type === 'volley') {
                const spread = echo.count === 1 ? [0] : echo.count === 2 ? [-0.09, 0.09] : [-0.18, 0, 0.18];
                spread.forEach((offset) => {
                    const angle = echo.angle + offset;
                    this.projectiles.push({
                        x: echo.x,
                        y: echo.y,
                        vx: Math.cos(angle) * 380,
                        vy: Math.sin(angle) * 380,
                        dirX: Math.cos(angle),
                        dirY: Math.sin(angle),
                        damage: echo.damage,
                        pierce: 0,
                        life: 0.9,
                        radius: 6,
                        color: COLORS.pulse,
                        alpha: 0.65
                    });
                });
                this.createRing(echo.x, echo.y, 26, COLORS.pulse, 0.14, 2);
            } else if (echo.type === 'slash') {
                this.slashCone(echo.x, echo.y, echo.dirX, echo.dirY, echo.range, 0.92, echo.damage, 180, 0);
                this.createRing(echo.x, echo.y, 34, COLORS.pulse, 0.16, 2);
            } else if (echo.type === 'burst') {
                this.emitBurst(echo.x, echo.y, echo.range, echo.damage, COLORS.inverse);
            }

            this.echoQueue.splice(i, 1);
        }
    },
    updateProjectiles(simDt) {
        for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
            const projectile = this.projectiles[i];
            projectile.life -= simDt;
            projectile.x += projectile.vx * simDt;
            projectile.y += projectile.vy * simDt;

            if (projectile.life <= 0) {
                this.projectiles.splice(i, 1);
                continue;
            }

            for (let j = this.enemies.length - 1; j >= 0; j -= 1) {
                const enemy = this.enemies[j];
                const dx = enemy.x - projectile.x;
                const dy = enemy.y - projectile.y;
                const combined = enemy.radius + projectile.radius;
                if (dx * dx + dy * dy > combined * combined) {
                    continue;
                }

                this.damageEnemy(enemy, projectile.damage, 180, projectile.dirX, projectile.dirY, projectile.color);
                projectile.pierce -= 1;
                if (projectile.pierce < 0) {
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
        }
    },
    pickRangedTarget(originX, originY, dirX, dirY) {
        return this.pickDirectionalEnemy(originX, originY, dirX, dirY, 0.6, 520, 10) || this.pickNearestEnemy(originX, originY);
    },
    pickDirectionalEnemy(originX, originY, dirX, dirY, halfAngle, range, clusterWeight) {
        const aim = normalize(dirX, dirY);
        if (aim.length <= 0) {
            return null;
        }

        const cosThreshold = Math.cos(halfAngle);
        let best = null;
        let bestScore = -Infinity;

        this.enemies.forEach((enemy) => {
            const dx = enemy.x - originX;
            const dy = enemy.y - originY;
            const distance = Math.hypot(dx, dy);
            if (distance > range) {
                return;
            }

            const direction = normalize(dx, dy);
            const alignment = direction.x * aim.x + direction.y * aim.y;
            if (alignment < cosThreshold) {
                return;
            }

            let neighbors = 0;
            this.enemies.forEach((other) => {
                if (other === enemy) {
                    return;
                }
                const odx = other.x - enemy.x;
                const ody = other.y - enemy.y;
                if (odx * odx + ody * ody < 110 * 110) {
                    neighbors += 1;
                }
            });

            const score = alignment * 120 - distance + neighbors * clusterWeight;
            if (score > bestScore) {
                best = enemy;
                bestScore = score;
            }
        });

        return best;
    },
    pickNearestEnemy(originX, originY) {
        let best = null;
        let bestDistance = Infinity;

        this.enemies.forEach((enemy) => {
            const dx = enemy.x - originX;
            const dy = enemy.y - originY;
            const distance = dx * dx + dy * dy;
            if (distance < bestDistance) {
                best = enemy;
                bestDistance = distance;
            }
        });

        return best;
    },
    slashCone(x, y, dirX, dirY, range, halfAngle, damage, knockback, cooldown) {
        const cosThreshold = Math.cos(halfAngle);

        this.enemies.forEach((enemy) => {
            if (cooldown > 0 && enemy.slashCooldown > 0) {
                return;
            }
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const distance = Math.hypot(dx, dy);
            if (distance > range + enemy.radius) {
                return;
            }
            const direction = normalize(dx, dy);
            if (direction.x * dirX + direction.y * dirY < cosThreshold) {
                return;
            }
            const falloff = 1 - clamp(distance / (range + enemy.radius), 0, 1) * 0.28;
            this.damageEnemy(enemy, damage * falloff, knockback, dirX, dirY, COLORS.inverse);
            enemy.slashCooldown = cooldown;
        });
    },
    emitBurst(x, y, radius, damage, color) {
        this.createRing(x, y, radius, color, 0.24, 3);
        this.enemies.forEach((enemy) => {
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const distance = Math.hypot(dx, dy);
            if (distance > radius + enemy.radius) {
                return;
            }
            const direction = normalize(dx, dy, 1, 0);
            const falloff = 1 - clamp(distance / (radius + enemy.radius), 0, 1) * 0.45;
            this.damageEnemy(enemy, damage * falloff, 220, direction.x, direction.y, color);
        });
    },
    damagePlayer(amount, dirX, dirY, push, node) {
        if (this.player.dead) {
            return;
        }

        let remaining = amount;
        if (this.player.shield > 0) {
            const absorbed = Math.min(this.player.shield, remaining);
            this.player.shield -= absorbed;
            remaining -= absorbed;
            this.createRing(node.x, node.y, 28, COLORS.shield, 0.14, 2);
            if (remaining <= 0) {
                return;
            }
        }

        // // this.player.health -= remaining; // Infinite health currently enabled // infinite health
        node.vx -= dirX * push * 0.22;
        node.vy -= dirY * push * 0.22;
        this.createRing(node.x, node.y, 34, COLORS.health, 0.2, 3);

        if (this.player.health <= 0) {
            this.player.dead = true;
            this.player.deathTimer = 2;
            this.createRing(this.player.centroidX, this.player.centroidY, 110, COLORS.health, 0.32, 4);
        }
    },
    damageEnemy(enemy, amount, knockback, dirX, dirY, color) {
        enemy.health -= amount;
        enemy.hitFlash = 1;
        enemy.vx += dirX * knockback / enemy.mass;
        enemy.vy += dirY * knockback / enemy.mass;
        this.createRing(enemy.x, enemy.y, enemy.radius + 8, color, 0.12, 2);

        if (enemy.health > 0) {
            return;
        }

        const index = this.enemies.indexOf(enemy);
        if (index >= 0) {
            this.enemies.splice(index, 1);
        }
        this.createRing(enemy.x, enemy.y, enemy.radius + 20, color, 0.24, 3);
    },
};
