const ApexPreyFactory = {
    spawn(context) {
        return LegacyModuleAdapters.spawnPreyModule(context);
    }
};

window.ApexPreyFactory = ApexPreyFactory;
