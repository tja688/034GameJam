const CameraInvasivePresets = {
    default: { ...CameraInvasiveConfig },
    mainflow: { id: 'mainflow', zoom: 0.92, autoZoom: true },
    playground: { id: 'playground', zoom: 0.84, autoZoom: false },
    'scenario-tight': { id: 'scenario-tight', zoom: 0.98, autoZoom: false }
};

window.CameraInvasivePresets = CameraInvasivePresets;
