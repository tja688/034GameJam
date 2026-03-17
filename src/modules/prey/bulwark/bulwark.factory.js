const BulwarkPreyFactory = {
    spawn(context) {
        return LegacyModuleAdapters.spawnPreyModule(context);
    }
};

window.BulwarkPreyFactory = BulwarkPreyFactory;
