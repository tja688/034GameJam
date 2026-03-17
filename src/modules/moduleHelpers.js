function registerRuntimeModule(moduleDefinition) {
    return ModuleRegistry.register(moduleDefinition);
}

window.registerRuntimeModule = registerRuntimeModule;
