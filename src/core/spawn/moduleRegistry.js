const ModuleRegistry = {
    modules: {},
    register(moduleDefinition) {
        if (!moduleDefinition?.id) {
            return null;
        }
        this.modules[moduleDefinition.id] = {
            version: '1.0.0',
            tags: [],
            presets: {},
            config: {},
            playground: {},
            ...moduleDefinition
        };
        return this.modules[moduleDefinition.id];
    },
    get(moduleId) {
        return this.modules[moduleId] || null;
    },
    list(filter = {}) {
        const modules = Object.values(this.modules);
        const search = (filter.search || '').trim().toLowerCase();
        const category = filter.category || '';
        const categories = Array.isArray(filter.categories) ? filter.categories : null;

        return modules.filter((moduleDefinition) => {
            if (category && moduleDefinition.category !== category) {
                return false;
            }
            if (categories && categories.length > 0 && !categories.includes(moduleDefinition.category)) {
                return false;
            }
            if (!search) {
                return true;
            }
            const bag = [
                moduleDefinition.id,
                moduleDefinition.category,
                ...(moduleDefinition.tags || []),
                moduleDefinition.playground?.label || '',
                ...(moduleDefinition.playground?.searchTerms || [])
            ]
                .join(' ')
                .toLowerCase();
            return bag.includes(search);
        });
    }
};

window.ModuleRegistry = ModuleRegistry;
