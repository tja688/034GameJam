const SkittishPreyFactory = {
    spawn(context) {
        return LegacyModuleAdapters.spawnPreyModule(context);
    }
};

window.SkittishPreyFactory = SkittishPreyFactory;
