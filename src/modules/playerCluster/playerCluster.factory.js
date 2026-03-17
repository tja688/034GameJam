const PlayerClusterFactory = {
    spawn(context) {
        return LegacyModuleAdapters.spawnPlayerCluster(context);
    }
};

window.PlayerClusterFactory = PlayerClusterFactory;
