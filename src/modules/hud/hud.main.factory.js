const HudMainFactory = {
    apply(context) {
        return LegacyModuleAdapters.applySystemModule(context);
    }
};

window.HudMainFactory = HudMainFactory;
