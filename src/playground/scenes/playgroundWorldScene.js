class PlaygroundWorldScene extends CoreDemoScene {
    constructor() {
        super('playground-world', 'playground');
        this.playgroundSelectionId = '';
        this.returnSceneKey = 'core-demo';
    }

    getShellConfig() {
        return {
            runtimeMode: 'playground',
            enableMenuUi: false,
            startSession: true,
            useStartupSequence: false
        };
    }

    afterShellCreate(data = {}) {
        window.activeScene = this;
        this.returnSceneKey = data.returnSceneKey || 'core-demo';
        this.clearSandbox();
        SpawnService.spawn(this, {
            moduleId: 'player.cluster',
            preset: 'debug-default',
            x: 0,
            y: 0
        });

        if (data.fixtureId) {
            this.loadFixture(data.fixtureId);
        }

        if (!this.scene.isActive('playground-overlay')) {
            this.scene.launch('playground-overlay', {
                worldSceneKey: this.scene.key,
                returnSceneKey: this.returnSceneKey
            });
        }
    }

    updateSpawns() {}

    updateRunState() {}

    spawnModule(moduleId, preset = 'default', overrides = {}) {
        const entity = SpawnService.spawn(this, {
            moduleId,
            preset,
            x: overrides.x,
            y: overrides.y,
            overrides
        });
        if (entity) {
            this.playgroundSelectionId = entity.id || 'player';
        }
        return entity;
    }

    clearSandbox() {
        SpawnService.clearPlayground(this, true);
        this.runState.objectiveSpawned = false;
        this.runState.objectiveId = '';
    }

    loadFixture(fixtureId) {
        const fixture = PlaygroundFixtureService.load(fixtureId);
        if (!fixture) {
            return false;
        }

        this.resetSimulation(true);
        this.clearSandbox();
        SpawnService.spawnBatch(this, fixture.spawn || []);
        if (Number.isFinite(fixture.camera?.zoom)) {
            this.cameraRig.manualZoom = fixture.camera.zoom;
            this.cameraRig.zoom = fixture.camera.zoom;
            this.cameraRig.targetZoom = fixture.camera.zoom;
            this.cameraRig.desiredZoom = fixture.camera.zoom;
        }
        this.playgroundSelectionId = this.getInspectableEntities()[0]?.id || '';
        this.debugState.playground.activeFixtureId = fixtureId;
        return true;
    }

    saveFixture() {
        const activeFixtureId = this.debugState.playground.activeFixtureId || 'playground/custom-sandbox';
        return PlaygroundFixtureService.save(
            SessionSnapshot.captureFixture(this, activeFixtureId, '由 Playground 保存'),
            this.debugState.playground.saveTargetPath
        );
    }

    getInspectableEntities() {
        const entities = [];
        if (this.player) {
            entities.push({
                id: 'player',
                label: `Player Cluster / ${this.player.modulePreset || 'debug-default'}`,
                moduleId: this.player.moduleId || 'player.cluster',
                entity: this.player
            });
        }
        this.prey.forEach((prey, index) => {
            entities.push({
                id: prey.id || `prey-${index}`,
                label: `${prey.moduleId || LegacyModuleAdapters.inferPreyModuleId(prey)} / ${prey.modulePreset || prey.sizeKey}`,
                moduleId: prey.moduleId || LegacyModuleAdapters.inferPreyModuleId(prey),
                entity: prey
            });
        });
        return entities;
    }

    getSelectedEntity() {
        const entities = this.getInspectableEntities();
        return entities.find((entry) => entry.id === this.playgroundSelectionId) || entities[0] || null;
    }

    selectEntityById(entityId) {
        this.playgroundSelectionId = entityId;
        this.debugState.playground.selectedEntityId = entityId;
    }

    runInspectorAction(descriptor, action) {
        if (!descriptor?.entity || !action) {
            return;
        }
        if (action === 'heal') {
            descriptor.entity.health = descriptor.entity.maxHealth || descriptor.entity.health;
        } else if (action === 'remove' && descriptor.id !== 'player') {
            this.prey = this.prey.filter((entry) => entry.id !== descriptor.id);
            this.playgroundSelectionId = this.getInspectableEntities()[0]?.id || '';
        }
    }

    returnToMainFlow(callback = null) {
        this.scene.stop('playground-overlay');
        this.scene.stop(this.scene.key);
        const returnScene = this.scene.get(this.returnSceneKey);
        if (returnScene) {
            this.scene.resume(this.returnSceneKey);
            window.activeScene = returnScene;
            callback?.();
        }
    }

    handlePointerDown(pointer) {
        const pointerWorld = this.screenToWorld(pointer.x, pointer.y);
        const hitPrey = this.prey.find((prey) => {
            const dx = prey.x - pointerWorld.x;
            const dy = prey.y - pointerWorld.y;
            return Math.hypot(dx, dy) <= Math.max(prey.radius || 0, 24);
        });
        if (hitPrey && !this.player.edit.active) {
            this.playgroundSelectionId = hitPrey.id;
        }
        return CoreDemoScene.prototype.handlePointerDown.call(this, pointer);
    }
}

window.PlaygroundWorldScene = PlaygroundWorldScene;
