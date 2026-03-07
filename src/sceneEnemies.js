

const SceneEnemiesMixin = {
    updateSpawns(simDt) {
        if (this.enemies.length > 90) {
            return;
        }

        const time = this.worldTime;
        this.spawnTimers.swarm -= simDt;
        this.spawnTimers.stinger -= simDt;
        this.spawnTimers.brute -= simDt;
        this.spawnTimers.flank -= simDt;

        if (time < 20) {
            if (this.spawnTimers.swarm <= 0) {
                this.spawnEnemyGroup('swarm', Phaser.Math.Between(1, 2));
                this.spawnTimers.swarm = Math.max(0.8, 1.14 - time * 0.012);
            }
            return;
        }

        if (time < 45) {
            if (this.spawnTimers.swarm <= 0) {
                this.spawnEnemyGroup('swarm', Phaser.Math.Between(2, 3));
                this.spawnTimers.swarm = 0.78;
            }
            if (this.spawnTimers.stinger <= 0) {
                this.spawnEnemyGroup('stinger', 1);
                this.spawnTimers.stinger = 5.1;
            }
            return;
        }

        if (this.spawnTimers.swarm <= 0) {
            this.spawnEnemyGroup('swarm', Phaser.Math.Between(2, 4));
            this.spawnTimers.swarm = Math.max(0.48, 0.72 - (time - 45) * 0.002);
        }
        if (this.spawnTimers.stinger <= 0) {
            this.spawnEnemyGroup('stinger', Phaser.Math.Between(1, 2));
            this.spawnTimers.stinger = 4.2;
        }
        if (this.spawnTimers.brute <= 0) {
            this.spawnEnemyGroup('brute', 1);
            this.spawnTimers.brute = 12;
        }
        if (this.spawnTimers.flank <= 0) {
            this.spawnFlankWave();
            this.spawnTimers.flank = 20;
        }
    },
    spawnEnemyGroup(type, count) {
        for (let i = 0; i < count; i += 1) {
            this.enemies.push(this.createEnemy(type));
        }
    },
    spawnFlankWave() {
        const yOffset = Phaser.Math.Between(-220, 220);
        this.enemies.push(this.createEnemy('stinger', 'left', this.player.centroidY + yOffset));
        this.enemies.push(this.createEnemy('stinger', 'right', this.player.centroidY - yOffset));
    },
    createEnemy(type, forcedSide = null, forcedAxis = null) {
        const definition = ENEMY_DEFS[type];
        const worldHalfWidth = this.cameraRig.viewportWidth * 0.5 / this.cameraRig.zoom;
        const worldHalfHeight = this.cameraRig.viewportHeight * 0.5 / this.cameraRig.zoom;
        const margin = 220;
        const side = forcedSide || Phaser.Utils.Array.GetRandom(['left', 'right', 'top', 'bottom']);
        let x = 0;
        let y = 0;

        if (side === 'left') {
            x = this.player.centroidX - worldHalfWidth - margin;
            y = forcedAxis ?? Phaser.Math.Between(this.player.centroidY - worldHalfHeight, this.player.centroidY + worldHalfHeight);
        } else if (side === 'right') {
            x = this.player.centroidX + worldHalfWidth + margin;
            y = forcedAxis ?? Phaser.Math.Between(this.player.centroidY - worldHalfHeight, this.player.centroidY + worldHalfHeight);
        } else if (side === 'top') {
            x = Phaser.Math.Between(this.player.centroidX - worldHalfWidth, this.player.centroidX + worldHalfWidth);
            y = this.player.centroidY - worldHalfHeight - margin;
        } else {
            x = Phaser.Math.Between(this.player.centroidX - worldHalfWidth, this.player.centroidX + worldHalfWidth);
            y = this.player.centroidY + worldHalfHeight + margin;
        }

        return {
            type,
            shape: definition.shape,
            color: definition.color,
            x,
            y,
            vx: 0,
            vy: 0,
            radius: definition.radius,
            maxHealth: definition.maxHealth,
            health: definition.maxHealth,
            speed: definition.speed,
            accel: definition.accel,
            mass: definition.mass,
            touchDamage: definition.touchDamage,
            push: definition.push,
            hitFlash: 0,
            attackCooldown: Phaser.Math.FloatBetween(0.08, 0.3),
            slashCooldown: 0,
            state: 'approach',
            stateTimer: 0,
            seed: Math.random() * 10
        };
    },
    updateEnemies(simDt) {
        for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
            const enemy = this.enemies[i];
            const targetNode = this.pickNearestNode(enemy.x, enemy.y);
            const chaseX = targetNode ? targetNode.x : this.player.centroidX;
            const chaseY = targetNode ? targetNode.y : this.player.centroidY;
            const toTarget = normalize(chaseX - enemy.x, chaseY - enemy.y, 1, 0);

            enemy.hitFlash = Math.max(0, enemy.hitFlash - simDt * 4.2);
            enemy.attackCooldown = Math.max(0, enemy.attackCooldown - simDt);
            enemy.slashCooldown = Math.max(0, enemy.slashCooldown - simDt);

            if (enemy.type === 'swarm') {
                const orbit = Math.sin(this.worldTime * 2.1 + enemy.seed) * 0.38;
                const steer = normalize(toTarget.x - toTarget.y * orbit, toTarget.y + toTarget.x * orbit, toTarget.x, toTarget.y);
                enemy.vx += steer.x * enemy.accel * simDt;
                enemy.vy += steer.y * enemy.accel * simDt;
            } else if (enemy.type === 'stinger') {
                this.updateStinger(enemy, toTarget, chaseX, chaseY, simDt);
            } else {
                enemy.vx += toTarget.x * enemy.accel * simDt;
                enemy.vy += toTarget.y * enemy.accel * simDt;
            }

            const speed = Math.hypot(enemy.vx, enemy.vy);
            if (speed > enemy.speed) {
                const scale = enemy.speed / speed;
                enemy.vx *= scale;
                enemy.vy *= scale;
            }

            enemy.vx *= Math.exp(-(enemy.type === 'brute' ? 0.4 : 1.1) * simDt);
            enemy.vy *= Math.exp(-(enemy.type === 'brute' ? 0.4 : 1.1) * simDt);
            enemy.x += enemy.vx * simDt;
            enemy.y += enemy.vy * simDt;
        }
    },
    updateStinger(enemy, toTarget, targetX, targetY, simDt) {
        const distance = Math.hypot(targetX - enemy.x, targetY - enemy.y);

        if (enemy.state === 'approach') {
            const orbit = Math.sin(this.worldTime * 3 + enemy.seed) * 0.6;
            const steer = normalize(toTarget.x - toTarget.y * orbit, toTarget.y + toTarget.x * orbit, toTarget.x, toTarget.y);
            enemy.vx += steer.x * enemy.accel * simDt;
            enemy.vy += steer.y * enemy.accel * simDt;
            if (distance < 170) {
                enemy.state = 'windup';
                enemy.stateTimer = 0.32;
            }
            return;
        }

        if (enemy.state === 'windup') {
            enemy.stateTimer -= simDt;
            enemy.vx *= Math.exp(-6 * simDt);
            enemy.vy *= Math.exp(-6 * simDt);
            if (enemy.stateTimer <= 0) {
                const lead = normalize(targetX - enemy.x, targetY - enemy.y, toTarget.x, toTarget.y);
                enemy.vx = lead.x * 300;
                enemy.vy = lead.y * 300;
                enemy.state = 'dash';
                enemy.stateTimer = 0.22;
            }
            return;
        }

        if (enemy.state === 'dash') {
            enemy.stateTimer -= simDt;
            if (enemy.stateTimer <= 0) {
                enemy.state = 'recover';
                enemy.stateTimer = 0.48;
            }
            return;
        }

        enemy.stateTimer -= simDt;
        enemy.vx *= Math.exp(-4 * simDt);
        enemy.vy *= Math.exp(-4 * simDt);
        if (enemy.stateTimer <= 0) {
            enemy.state = 'approach';
        }
    },
    pickNearestNode(x, y) {
        let best = null;
        let bestDistance = Infinity;
        this.activeNodes.forEach((node) => {
            const dx = node.x - x;
            const dy = node.y - y;
            const distance = dx * dx + dy * dy;
            if (distance < bestDistance) {
                best = node;
                bestDistance = distance;
            }
        });
        return best;
    },
    pickNearbyNodes(x, y, limit = 4, radius = 128) {
        const radiusSq = radius * radius;
        const candidates = [];

        this.activeNodes.forEach((node) => {
            const dx = node.x - x;
            const dy = node.y - y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq > radiusSq) {
                return;
            }
            candidates.push({ node, distanceSq });
        });

        candidates.sort((a, b) => a.distanceSq - b.distanceSq);
        return candidates.slice(0, limit).map((entry) => entry.node);
    },
    resolveEnemyNodeCollisions() {
        this.enemies.forEach((enemy) => {
            const candidates = this.pickNearbyNodes(enemy.x, enemy.y, 4, enemy.radius + 104);
            if (candidates.length === 0) {
                const focus = this.pickNearestNode(enemy.x, enemy.y);
                if (focus) {
                    candidates.push(focus);
                }
            }
            if (candidates.length === 0) {
                return;
            }

            candidates.forEach((node) => {
                const dx = enemy.x - node.x;
                const dy = enemy.y - node.y;
                const distance = Math.hypot(dx, dy) || 0.0001;
                const overlap = enemy.radius + 22 - distance;
                if (overlap <= 0) {
                    return;
                }

                const nx = dx / distance;
                const ny = dy / distance;
                enemy.x += nx * overlap * 0.72;
                enemy.y += ny * overlap * 0.72;
                node.x -= nx * overlap * 0.22;
                node.y -= ny * overlap * 0.22;

                if (node.attackTimer > 0) {
                    this.damageEnemy(enemy, node.attackDamage, 170, node.attackDirX || nx, node.attackDirY || ny, node.color);
                }
                if (enemy.attackCooldown <= 0) {
                    this.damagePlayer(enemy.touchDamage, nx, ny, enemy.push, node);
                    enemy.attackCooldown = enemy.type === 'brute' ? 0.92 : 0.56;
                }
            });
        });
    },
};