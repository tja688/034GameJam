function ensurePlaygroundUiStyles() {
    if (document.getElementById('playground-ui-styles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'playground-ui-styles';
    style.textContent = `
        .playground-ui.hidden { display: none; }
        .playground-ui {
            position: fixed;
            top: 18px;
            right: 18px;
            width: min(380px, calc(100vw - 28px));
            max-height: calc(100vh - 36px);
            overflow: hidden;
            z-index: 2100;
            border-radius: 22px;
            border: 1px solid rgba(93, 222, 255, 0.2);
            background: rgba(5, 14, 20, 0.9);
            backdrop-filter: blur(16px);
            color: #dbf7ff;
            box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34);
            font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .playground-ui-header,
        .playground-ui-section {
            padding: 14px 16px;
            border-bottom: 1px solid rgba(93, 222, 255, 0.08);
        }
        .playground-ui-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 6px;
        }
        .playground-ui-subtitle {
            font-size: 12px;
            color: rgba(219, 247, 255, 0.66);
        }
        .playground-ui-section h3 {
            margin: 0 0 10px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: rgba(219, 247, 255, 0.58);
        }
        .playground-ui input,
        .playground-ui select {
            width: 100%;
            box-sizing: border-box;
            border-radius: 12px;
            border: 1px solid rgba(93, 222, 255, 0.14);
            background: rgba(255, 255, 255, 0.04);
            color: #dbf7ff;
            padding: 10px 12px;
            margin-bottom: 10px;
        }
        .playground-ui-scroll {
            max-height: 168px;
            overflow: auto;
        }
        .playground-ui-list {
            display: grid;
            gap: 8px;
        }
        .playground-ui-item,
        .playground-ui-action {
            width: 100%;
            border: 0;
            border-radius: 12px;
            padding: 10px 12px;
            background: rgba(93, 222, 255, 0.08);
            color: #dbf7ff;
            text-align: left;
            cursor: pointer;
        }
        .playground-ui-item small {
            display: block;
            color: rgba(219, 247, 255, 0.62);
            margin-top: 4px;
        }
        .playground-ui-actions {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
        }
        .playground-inspector-row {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 8px;
            align-items: center;
            margin-bottom: 8px;
        }
        .playground-inspector-row span {
            font-size: 13px;
            color: rgba(219, 247, 255, 0.82);
        }
        .playground-ui-status {
            font-size: 12px;
            color: rgba(219, 247, 255, 0.66);
            margin-top: 8px;
        }
    `;
    document.head.appendChild(style);
}

class PlaygroundUiController {
    constructor(worldScene) {
        this.worldScene = worldScene;
        this.root = null;
        this.searchInput = null;
        this.moduleList = null;
        this.fixtureList = null;
        this.entitySelect = null;
        this.inspector = null;
        this.status = null;
    }

    mount() {
        if (this.root) {
            return;
        }

        ensurePlaygroundUiStyles();
        this.root = document.createElement('div');
        this.root.className = 'playground-ui';
        this.root.innerHTML = `
            <div class="playground-ui-header">
                <div class="playground-ui-title">Playground</div>
                <div class="playground-ui-subtitle">独立双 Scene 测试层：搜索模块、加载 fixture、轻量 inspector、返回主流程。</div>
            </div>
            <div class="playground-ui-section">
                <h3>Search & Spawn</h3>
                <input type="text" placeholder="搜索 player / prey / preset..." />
                <div class="playground-ui-scroll"><div class="playground-ui-list" data-role="modules"></div></div>
            </div>
            <div class="playground-ui-section">
                <h3>Fixtures</h3>
                <div class="playground-ui-scroll"><div class="playground-ui-list" data-role="fixtures"></div></div>
            </div>
            <div class="playground-ui-section">
                <h3>Inspector</h3>
                <select data-role="entity-select"></select>
                <div data-role="inspector"></div>
                <div class="playground-ui-status" data-role="status"></div>
            </div>
            <div class="playground-ui-section">
                <div class="playground-ui-actions">
                    <button class="playground-ui-action" data-action="clear">清场</button>
                    <button class="playground-ui-action" data-action="save">保存 Fixture</button>
                    <button class="playground-ui-action" data-action="return">返回主流程</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.root);
        this.searchInput = this.root.querySelector('input');
        this.moduleList = this.root.querySelector('[data-role="modules"]');
        this.fixtureList = this.root.querySelector('[data-role="fixtures"]');
        this.entitySelect = this.root.querySelector('[data-role="entity-select"]');
        this.inspector = this.root.querySelector('[data-role="inspector"]');
        this.status = this.root.querySelector('[data-role="status"]');

        this.searchInput.addEventListener('input', () => this.renderModules());
        this.entitySelect.addEventListener('change', () => {
            this.worldScene.selectEntityById?.(this.entitySelect.value);
            this.renderInspector();
        });
        this.root.querySelector('[data-action="clear"]').addEventListener('click', () => {
            this.worldScene.clearSandbox();
            this.setStatus('Sandbox 已清空。');
        });
        this.root.querySelector('[data-action="save"]').addEventListener('click', () => {
            const ok = this.worldScene.saveFixture();
            this.setStatus(ok ? 'Fixture 已写入 custom-sandbox.json。' : 'Fixture 保存失败。');
        });
        this.root.querySelector('[data-action="return"]').addEventListener('click', () => {
            this.worldScene.returnToMainFlow();
        });

        this.renderModules();
        this.renderFixtures();
        this.renderInspector();
    }

    destroy() {
        this.root?.remove();
        this.root = null;
    }

    setStatus(message) {
        if (this.status) {
            this.status.textContent = message;
        }
    }

    renderModules() {
        const query = (this.searchInput?.value || '').trim().toLowerCase();
        const modules = ModuleRegistry.list({
            categories: ['playerCluster', 'prey'],
            search: query
        });

        this.moduleList.innerHTML = '';
        modules.forEach((moduleDefinition) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'playground-ui-item';
            button.innerHTML = `${moduleDefinition.playground?.label || moduleDefinition.id}<small>${(moduleDefinition.tags || []).join(' / ')}</small>`;
            button.addEventListener('click', () => {
                const spawned = this.worldScene.spawnModule(moduleDefinition.id, moduleDefinition.playground?.defaultPreset || 'default');
                if (spawned) {
                    this.renderInspector();
                    this.setStatus(`已生成 ${moduleDefinition.playground?.label || moduleDefinition.id}。`);
                }
            });
            this.moduleList.appendChild(button);
        });
    }

    renderFixtures() {
        this.fixtureList.innerHTML = '';
        PlaygroundFixtureService.list().forEach((entry) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'playground-ui-item';
            button.innerHTML = `${entry.label}<small>${entry.id}</small>`;
            button.addEventListener('click', () => {
                const ok = this.worldScene.loadFixture(entry.id);
                this.renderInspector();
                this.setStatus(ok ? `已加载 ${entry.id}。` : `加载 ${entry.id} 失败。`);
            });
            this.fixtureList.appendChild(button);
        });
    }

    renderInspector() {
        const entities = this.worldScene.getInspectableEntities();
        const selected = this.worldScene.getSelectedEntity();
        this.entitySelect.innerHTML = '';
        entities.forEach((entry) => {
            const option = document.createElement('option');
            option.value = entry.id;
            option.textContent = entry.label;
            option.selected = selected?.id === entry.id;
            this.entitySelect.appendChild(option);
        });

        const descriptor = selected || entities[0] || null;
        if (!descriptor) {
            this.inspector.innerHTML = '<div class="playground-ui-status">当前没有可检视对象。</div>';
            return;
        }
        this.worldScene.selectEntityById?.(descriptor.id);

        const moduleDefinition = ModuleRegistry.get(descriptor.moduleId);
        const fields = moduleDefinition?.playground?.inspectFields || [];
        this.inspector.innerHTML = '';

        fields.forEach((field) => {
            const row = document.createElement('div');
            row.className = 'playground-inspector-row';
            const label = document.createElement('span');
            label.textContent = field.label || field.key;
            row.appendChild(label);

            let control = null;
            if (field.type === 'action') {
                control = document.createElement('button');
                control.type = 'button';
                control.className = 'playground-ui-action';
                control.textContent = field.label || field.key;
                control.addEventListener('click', () => {
                    this.worldScene.runInspectorAction(descriptor, field.action);
                    this.renderInspector();
                });
            } else if (field.type === 'boolean') {
                control = document.createElement('input');
                control.type = 'checkbox';
                control.checked = !!descriptor.entity[field.key];
                control.addEventListener('change', () => {
                    descriptor.entity[field.key] = control.checked;
                });
            } else if (field.type === 'enum') {
                control = document.createElement('select');
                (field.options || []).forEach((optionValue) => {
                    const option = document.createElement('option');
                    option.value = optionValue;
                    option.textContent = optionValue;
                    option.selected = descriptor.entity[field.key] === optionValue;
                    control.appendChild(option);
                });
                control.addEventListener('change', () => {
                    descriptor.entity[field.key] = control.value;
                });
            } else {
                control = document.createElement('input');
                control.type = 'number';
                control.step = field.step || '0.1';
                control.value = Number.isFinite(descriptor.entity[field.key]) ? descriptor.entity[field.key] : (field.defaultValue || 0);
                control.addEventListener('change', () => {
                    descriptor.entity[field.key] = Number(control.value);
                });
            }

            row.appendChild(control);
            this.inspector.appendChild(row);
        });
    }
}

window.PlaygroundUiController = PlaygroundUiController;
