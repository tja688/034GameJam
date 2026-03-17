const SCENARIO_RECENT_STORAGE_KEY = 'codex.034GameJam.recentScenarios';

const ScenarioLoader = {
    getScenarioIdFromLocation() {
        const params = new URLSearchParams(window.location.search);
        return params.get('scenario') || '';
    },
    getSceneModeFromLocation() {
        const params = new URLSearchParams(window.location.search);
        return params.get('scene') || '';
    },
    list() {
        return SCENARIO_REGISTRY.slice();
    },
    getEntry(scenarioId) {
        return SCENARIO_REGISTRY.find((entry) => entry.id === scenarioId) || null;
    },
    load(scenarioId) {
        const entry = this.getEntry(scenarioId);
        return entry ? readRepoJson(entry.path) : null;
    },
    rememberRecentScenario(scenarioId) {
        if (!scenarioId) {
            return;
        }
        let recent = [];
        try {
            recent = JSON.parse(window.localStorage?.getItem(SCENARIO_RECENT_STORAGE_KEY) || '[]');
        } catch (error) {
            recent = [];
        }
        recent = [scenarioId, ...recent.filter((entry) => entry !== scenarioId)].slice(0, 6);
        window.localStorage?.setItem(SCENARIO_RECENT_STORAGE_KEY, JSON.stringify(recent));
    },
    listRecent() {
        try {
            return JSON.parse(window.localStorage?.getItem(SCENARIO_RECENT_STORAGE_KEY) || '[]');
        } catch (error) {
            return [];
        }
    },
    applyToScene(scene, scenarioId) {
        const scenario = this.load(scenarioId);
        if (!scenario) {
            return false;
        }
        CheckpointLoader.apply(scene, scenario);
        EncounterRunner.run(scene, scenario.encounter || {});
        this.rememberRecentScenario(scenarioId);
        return true;
    }
};

window.ScenarioLoader = ScenarioLoader;
