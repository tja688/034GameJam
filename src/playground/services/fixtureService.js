const PlaygroundFixtureService = {
    list() {
        return PLAYGROUND_FIXTURE_REGISTRY.slice();
    },
    getEntry(fixtureId) {
        return PLAYGROUND_FIXTURE_REGISTRY.find((entry) => entry.id === fixtureId) || null;
    },
    load(fixtureId) {
        const entry = this.getEntry(fixtureId);
        return entry ? readRepoJson(entry.path) : null;
    },
    save(fixtureData, targetPath = 'data/fixtures/playground/custom-sandbox.json') {
        return writeRepoJson(targetPath, fixtureData);
    }
};

window.PlaygroundFixtureService = PlaygroundFixtureService;
