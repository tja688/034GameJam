class MainFlowScene extends CoreDemoScene {
    constructor() {
        super('core-demo', 'mainflow');
    }

    getShellConfig() {
        const scenarioId = ScenarioLoader.getScenarioIdFromLocation();
        const sceneMode = ScenarioLoader.getSceneModeFromLocation();
        if (scenarioId || sceneMode === 'playground') {
            return {
                runtimeMode: 'mainflow',
                enableMenuUi: true,
                startSession: true,
                useStartupSequence: false
            };
        }
        return {
            runtimeMode: 'mainflow',
            enableMenuUi: true,
            startSession: false,
            useStartupSequence: true
        };
    }

    afterShellCreate() {
        DevCommandLayer.ensure();
        const scenarioId = ScenarioLoader.getScenarioIdFromLocation();
        const sceneMode = ScenarioLoader.getSceneModeFromLocation();

        if (scenarioId) {
            this.loadScenarioById(scenarioId);
            return;
        }

        if (sceneMode === 'playground') {
            this.launchPlayground();
        }
    }

    launchPlayground(options = {}) {
        if (this.scene.isActive('playground-world')) {
            return;
        }
        this.scene.launch('playground-world', {
            returnSceneKey: this.scene.key,
            fixtureId: options.fixtureId || ''
        });
        this.scene.pause(this.scene.key);
    }

    loadScenarioById(scenarioId) {
        const ok = ScenarioLoader.applyToScene(this, scenarioId);
        if (ok) {
            this.startupSequence = null;
            this.hideStartupOverlay?.();
            this.menuMode = null;
            this.paused = false;
            this.sessionStarted = true;
            this.refreshMenuState?.();
        }
        return ok;
    }
}

window.MainFlowScene = MainFlowScene;
