registerRuntimeModule({
    id: 'camera.invasive',
    category: 'camera',
    tags: ['camera', 'composition', 'zoom'],
    version: '1.0.0',
    config: CameraInvasiveConfig,
    presets: CameraInvasivePresets,
    playground: CameraInvasivePlayground,
    behavior: CameraInvasiveBehavior,
    factory: CameraInvasiveFactory
});
