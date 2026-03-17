const CameraInvasiveFactory = {
    apply(context) {
        return LegacyModuleAdapters.applySystemModule(context);
    }
};

window.CameraInvasiveFactory = CameraInvasiveFactory;
