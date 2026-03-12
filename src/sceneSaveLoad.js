

const SceneSaveLoadMixin = {
    hasSavedGame() {
        return !!this.getSavedGameData();
    },
    getSavedGameData() {
        const data = readStoredJson(STORAGE_KEYS.saveSlot);
        if (!data || !Array.isArray(data.player?.chain) || !data.player?.topology || !Array.isArray(data.poolNodes) || !Array.isArray(data.activeNodes)) {
            return null;
        }
        return data;
    },
    buildSaveData() {
        this.rebalancePulseRunners();
        return {
            version: 4,
            savedAt: Date.now(),
            baseChain: [...this.baseChain],
            camera: {
                zoom: this.cameraRig?.manualZoom ?? this.cameraRig?.targetZoom ?? this.cameraRig?.zoom ?? this.createDefaultCameraRig().zoom
            },
            player: {
                chain: [...this.player.chain],
                centroidX: this.player.centroidX,
                centroidY: this.player.centroidY,
                heading: this.player.heading,
                health: this.player.health,
                maxHealth: this.player.maxHealth,
                maxEnergy: this.player.maxEnergy,
                shield: this.player.shield,
                shieldTimer: this.player.shieldTimer,
                mass: this.player.mass,
                energy: this.player.energy,
                guard: this.player.guard,
                overload: this.player.overload,
                echo: this.player.echo,
                tempoBoost: this.player.tempoBoost,
                agitation: this.player.agitation,
                stability: this.player.stability,
                turnAssist: this.player.turnAssist,
                feast: this.player.feast,
                feastGlow: this.player.feastGlow,
                predationPressure: this.player.predationPressure,
                growthBuffer: this.player.growthBuffer,
                nextGrowthCost: this.player.nextGrowthCost,
                metabolism: this.player.metabolism,
                energyFlash: this.player.energyFlash,
                stagePulse: this.player.stagePulse,
                victoryPulse: this.player.victoryPulse,
                dead: this.player.dead,
                deathTimer: this.player.deathTimer,
                pulseRunners: cloneData(this.player.pulseRunners || []),
                pulseCursor: this.player.pulseCursor,
                pulseTimer: this.player.pulseTimer,
                pulsePath: cloneData(this.player.pulsePath),
                topology: {
                    slots: cloneData(this.player.topology?.slots || {}),
                    edges: cloneData(this.player.topology?.edges || [])
                }
            },
            runState: cloneData(this.runState || {}),
            poolNodes: this.poolNodes.map((node) => ({
                index: node.index,
                id: node.id,
                shape: node.shape,
                polarity: node.polarity,
                role: node.role,
                color: node.color
            })),
            activeNodes: this.activeNodes.map((node) => ({
                index: node.index,
                x: node.x,
                y: node.y,
                vx: node.vx,
                vy: node.vy,
                anchorX: node.anchorX,
                anchorY: node.anchorY,
                anchored: node.anchored,
                stanceTimer: node.stanceTimer,
                anchorStrength: node.anchorStrength,
                pulseGlow: node.pulseGlow,
                tension: node.tension,
                displayX: node.displayX,
                displayY: node.displayY,
                displayAnchorX: node.displayAnchorX,
                displayAnchorY: node.displayAnchorY,
                attackTimer: node.attackTimer,
                attackDirX: node.attackDirX,
                attackDirY: node.attackDirY,
                attackDamage: node.attackDamage,
                displayAngle: node.displayAngle,
                spinVelocity: node.spinVelocity,
                feedPulse: node.feedPulse,
                hookTension: node.hookTension,
                biteGlow: node.biteGlow,
                predationWindow: node.predationWindow,
                predationMode: node.predationMode,
                gripPower: node.gripPower,
                cutPower: node.cutPower,
                suctionPower: node.suctionPower,
                chewInterval: node.chewInterval,
                attachedPreyId: node.attachedPreyId,
                attachedPreyCount: node.attachedPreyCount
            })),
            summary: {
                nodeCount: this.activeNodes.length,
                linkCount: this.links.length
            }
        };
    },
    saveGameToSlot() {
        if (!this.sessionStarted) {
            this.showToast('当前没有可保存的局内状态。', true);
            return false;
        }

        const ok = writeStoredJson(STORAGE_KEYS.saveSlot, this.buildSaveData());
        this.refreshMenuState();
        this.showToast(ok ? '单通道存档已保存。' : '保存失败，无法写入本地存储。', !ok);
        return ok;
    },
    applySaveData(data) {
        const savedBaseChain = Array.isArray(data.baseChain) && data.baseChain.length >= 3 ? data.baseChain : [...DEFAULT_BASE_CHAIN];
        const savedPoolNodes = Array.isArray(data.poolNodes) && data.poolNodes.length > 0 ? data.poolNodes : this.createPoolNodesFromLibrary();
        const validIndices = new Set(savedPoolNodes.map((node, index) => Number.isInteger(node.index) ? node.index : index));
        const savedChain = Array.isArray(data.player?.chain)
            ? data.player.chain.filter((index) => validIndices.has(index))
            : [];
        const chain = savedChain.length >= 3 ? savedChain : [...savedBaseChain];

        this.paused = false;
        this.sessionStarted = true;
        this.timeScaleFactor = 1;
        this.worldTime = 0;
        this.effects = [];
        this.fragments = [];
        this.prey = [];
        this.spawnTimers = this.createDefaultSpawnTimers();
        this.preySpawnCursor = { small: 0, medium: 1, large: 2 };
        this.preyIdCounter = 1;
        this.baseChain = [...savedBaseChain];
        this.player = this.createDefaultPlayer(chain);
        this.intent = this.createDefaultIntent();
        this.cameraRig = this.createDefaultCameraRig();
        this.clusterVolume = this.createDefaultClusterVolumeState();
        this.burstDrive = this.createDefaultBurstDriveState();
        this.poolNodes = savedPoolNodes.map((node, index) => ({
            ...node,
            index: Number.isInteger(node.index) ? node.index : index
        }));
        this.runState = this.createDefaultRunState ? this.createDefaultRunState() : null;
        const T = window.TUNING || {};
        const savedCameraZoom = clamp(
            getFiniteNumber(data.camera?.zoom, this.cameraRig.manualZoom),
            T.cameraMinZoom ?? 0.03,
            T.cameraMaxZoom ?? 1.12
        );
        this.cameraRig.manualZoom = savedCameraZoom;
        this.cameraRig.zoom = savedCameraZoom;
        this.cameraRig.targetZoom = savedCameraZoom;
        this.cameraRig.desiredZoom = savedCameraZoom;

        Object.assign(this.player, {
            centroidX: getFiniteNumber(data.player.centroidX, this.player.centroidX),
            centroidY: getFiniteNumber(data.player.centroidY, this.player.centroidY),
            heading: getFiniteNumber(data.player.heading, this.player.heading),
            health: getFiniteNumber(data.player.health, this.player.health),
            maxHealth: getFiniteNumber(data.player.maxHealth, this.player.maxHealth),
            maxEnergy: getFiniteNumber(data.player.maxEnergy, this.player.maxEnergy || 100),
            shield: getFiniteNumber(data.player.shield, this.player.shield),
            shieldTimer: getFiniteNumber(data.player.shieldTimer, this.player.shieldTimer),
            mass: getFiniteNumber(data.player.mass, this.player.mass),
            energy: getFiniteNumber(data.player.energy, this.player.energy),
            guard: getFiniteNumber(data.player.guard, this.player.guard),
            overload: getFiniteNumber(data.player.overload, this.player.overload),
            echo: getFiniteNumber(data.player.echo, this.player.echo),
            tempoBoost: getFiniteNumber(data.player.tempoBoost, this.player.tempoBoost),
            agitation: getFiniteNumber(data.player.agitation, this.player.agitation),
            stability: getFiniteNumber(data.player.stability, this.player.stability),
            turnAssist: getFiniteNumber(data.player.turnAssist, this.player.turnAssist),
            feast: getFiniteNumber(data.player.feast, this.player.feast),
            feastGlow: getFiniteNumber(data.player.feastGlow, this.player.feastGlow),
            predationPressure: getFiniteNumber(data.player.predationPressure, this.player.predationPressure),
            growthBuffer: getFiniteNumber(data.player.growthBuffer, this.player.growthBuffer),
            nextGrowthCost: getFiniteNumber(data.player.nextGrowthCost, this.player.nextGrowthCost),
            metabolism: getFiniteNumber(data.player.metabolism, this.player.metabolism),
            energyFlash: getFiniteNumber(data.player.energyFlash, this.player.energyFlash),
            stagePulse: getFiniteNumber(data.player.stagePulse, this.player.stagePulse),
            victoryPulse: getFiniteNumber(data.player.victoryPulse, this.player.victoryPulse),
            dead: !!data.player.dead,
            deathTimer: getFiniteNumber(data.player.deathTimer, this.player.deathTimer),
            pulseRunners: Array.isArray(data.player.pulseRunners) && data.player.pulseRunners.length > 0
                ? cloneData(data.player.pulseRunners)
                : [this.createPulseRunner(
                    clamp(getFiniteNumber(data.player.pulseCursor, 0), 0, Math.max(0, chain.length - 1)),
                    getFiniteNumber(data.player.pulseTimer, this.player.pulseTimer),
                    data.player.pulsePath
                )],
            pulseCursor: clamp(getFiniteNumber(data.player.pulseCursor, 0), 0, Math.max(0, chain.length - 1)),
            pulseTimer: getFiniteNumber(data.player.pulseTimer, this.player.pulseTimer),
            pulsePath: {
                ...this.player.pulsePath,
                ...(data.player.pulsePath || {})
            },
            topology: {
                slots: cloneData(data.player.topology?.slots || {}),
                edges: this.normalizeTopologyEdges(cloneData(data.player.topology?.edges || []))
            },
            edit: this.createDefaultEditState()
        });
        if (this.runState) {
            Object.assign(this.runState, cloneData(data.runState || {}));
        }
        this.resetLivingEnergyBarState?.();

        this.activeNodes = [];
        this.links = [];
        this.rebuildFormation(true);

        const savedNodeMap = new Map(
            (Array.isArray(data.activeNodes) ? data.activeNodes : []).map((node) => [node.index, node])
        );

        this.activeNodes.forEach((node) => {
            const savedNode = savedNodeMap.get(node.index);
            if (!savedNode) {
                return;
            }

            node.x = getFiniteNumber(savedNode.x, node.x);
            node.y = getFiniteNumber(savedNode.y, node.y);
            node.vx = getFiniteNumber(savedNode.vx, node.vx);
            node.vy = getFiniteNumber(savedNode.vy, node.vy);
            node.anchorX = getFiniteNumber(savedNode.anchorX, node.anchorX);
            node.anchorY = getFiniteNumber(savedNode.anchorY, node.anchorY);
            node.anchored = !!savedNode.anchored;
            node.stanceTimer = getFiniteNumber(savedNode.stanceTimer, node.stanceTimer);
            node.anchorStrength = getFiniteNumber(savedNode.anchorStrength, node.anchorStrength);
            node.pulseGlow = getFiniteNumber(savedNode.pulseGlow, node.pulseGlow);
            node.tension = getFiniteNumber(savedNode.tension, node.tension);
            node.displayX = getFiniteNumber(savedNode.displayX, node.displayX);
            node.displayY = getFiniteNumber(savedNode.displayY, node.displayY);
            node.displayAnchorX = getFiniteNumber(savedNode.displayAnchorX, node.displayAnchorX);
            node.displayAnchorY = getFiniteNumber(savedNode.displayAnchorY, node.displayAnchorY);
            node.attackTimer = getFiniteNumber(savedNode.attackTimer, node.attackTimer);
            node.attackDirX = getFiniteNumber(savedNode.attackDirX, node.attackDirX);
            node.attackDirY = getFiniteNumber(savedNode.attackDirY, node.attackDirY);
            node.attackDamage = getFiniteNumber(savedNode.attackDamage, node.attackDamage);
            node.displayAngle = getFiniteNumber(savedNode.displayAngle, node.displayAngle);
            node.spinVelocity = getFiniteNumber(savedNode.spinVelocity, node.spinVelocity);
            node.feedPulse = getFiniteNumber(savedNode.feedPulse, node.feedPulse);
            node.hookTension = getFiniteNumber(savedNode.hookTension, node.hookTension);
            node.biteGlow = getFiniteNumber(savedNode.biteGlow, node.biteGlow);
            node.predationWindow = getFiniteNumber(savedNode.predationWindow, node.predationWindow);
            node.predationMode = typeof savedNode.predationMode === 'string' ? savedNode.predationMode : node.predationMode;
            node.gripPower = getFiniteNumber(savedNode.gripPower, node.gripPower);
            node.cutPower = getFiniteNumber(savedNode.cutPower, node.cutPower);
            node.suctionPower = getFiniteNumber(savedNode.suctionPower, node.suctionPower);
            node.chewInterval = getFiniteNumber(savedNode.chewInterval, node.chewInterval);
            node.attachedPreyId = typeof savedNode.attachedPreyId === 'string' ? savedNode.attachedPreyId : node.attachedPreyId;
            node.attachedPreyCount = getFiniteNumber(savedNode.attachedPreyCount, node.attachedPreyCount);
        });

        this.computeCentroid();
        this.rebalancePulseRunners();
        this.updateDisplay(0);
        this.menuMode = null;
        this.refreshMenuState();
        return true;
    },
    loadGameFromSlot() {
        const data = this.getSavedGameData();
        if (!data) {
            this.showToast('没有可读取的单通道存档。', true);
            this.refreshMenuState();
            return false;
        }

        const ok = this.applySaveData(data);
        this.showToast(ok ? '单通道存档已读取。' : '读档失败，存档数据不可用。', !ok);
        return ok;
    },
    startNewGame() {
        this.resetSimulation(true);
        this.resumeGame();
    },
    handleMainContinue() {
        if (this.sessionStarted) {
            this.resumeGame();
            return;
        }
        this.loadGameFromSlot();
    },
    resumeGame() {
        if (!this.sessionStarted) {
            this.handleMainContinue();
            return;
        }

        this.debugMenuAutoPaused = false;
        this.menuMode = null;
        this.paused = false;
        this.refreshMenuState();
    },
    handleExitGame() {
        window.close();
        window.setTimeout(() => {
            if (!document.hidden) {
                this.showToast('浏览器阻止了关闭窗口。', true);
            }
        }, 120);
    },
};
