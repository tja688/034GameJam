const WeakspotPreyFactory = {
    spawn(context) {
        return LegacyModuleAdapters.spawnPreyModule(context);
    }
};

window.WeakspotPreyFactory = WeakspotPreyFactory;
