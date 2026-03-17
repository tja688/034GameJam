function ensureDevCommandLayerStyles() {
    if (document.getElementById('dev-command-layer-styles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'dev-command-layer-styles';
    style.textContent = `
        .dev-command-layer.hidden { display: none; }
        .dev-command-layer {
            position: fixed;
            inset: 0;
            z-index: 2200;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding-top: 9vh;
            background: rgba(5, 12, 16, 0.42);
            backdrop-filter: blur(10px);
            font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .dev-command-panel {
            width: min(760px, calc(100vw - 32px));
            border-radius: 18px;
            border: 1px solid rgba(104, 212, 255, 0.22);
            background: rgba(7, 16, 23, 0.96);
            box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38);
            overflow: hidden;
        }
        .dev-command-panel input {
            width: 100%;
            border: 0;
            border-bottom: 1px solid rgba(104, 212, 255, 0.12);
            background: transparent;
            color: #dff7ff;
            padding: 18px 20px;
            font-size: 17px;
            outline: none;
        }
        .dev-command-list {
            max-height: 58vh;
            overflow: auto;
        }
        .dev-command-item {
            width: 100%;
            border: 0;
            background: transparent;
            color: #dff7ff;
            text-align: left;
            padding: 14px 20px;
            cursor: pointer;
            border-bottom: 1px solid rgba(104, 212, 255, 0.08);
        }
        .dev-command-item:hover {
            background: rgba(104, 212, 255, 0.1);
        }
        .dev-command-item small {
            display: block;
            color: rgba(210, 236, 245, 0.62);
            margin-top: 4px;
        }
    `;
    document.head.appendChild(style);
}

const DevCommandLayer = {
    root: null,
    input: null,
    list: null,
    commands: [],
    ensure() {
        if (this.root) {
            return;
        }

        ensureDevCommandLayerStyles();
        this.root = document.createElement('div');
        this.root.className = 'dev-command-layer hidden';
        this.root.innerHTML = `
            <div class="dev-command-panel">
                <input type="text" placeholder="输入命令、scenario 或 fixture..." />
                <div class="dev-command-list"></div>
            </div>
        `;
        document.body.appendChild(this.root);

        this.input = this.root.querySelector('input');
        this.list = this.root.querySelector('.dev-command-list');

        this.root.addEventListener('mousedown', (event) => {
            if (event.target === this.root) {
                this.close();
            }
        });
        this.input.addEventListener('input', () => this.render());
        this.input.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.close();
                return;
            }
            if (event.key === 'Enter') {
                this.list.querySelector('.dev-command-item')?.click();
            }
        });

        window.addEventListener('keydown', (event) => {
            if (window.CORE_DEMO_DEBUG === false) {
                return;
            }
            if (event.key === '`' && !event.repeat) {
                event.preventDefault();
                this.toggle();
            }
        });
    },
    getMainFlowScene() {
        return window.__034GameApp?.game?.scene?.keys?.['core-demo'] || null;
    },
    buildCommands() {
        const activeScene = window.activeScene;
        const mainFlowScene = this.getMainFlowScene();
        const commands = [
            {
                id: 'open-playground',
                title: 'Open Playground',
                description: '进入独立 Playground 双场景测试空间',
                run: () => (mainFlowScene || activeScene)?.launchPlayground?.()
            },
            {
                id: 'toggle-baseline-panel',
                title: 'Toggle Baseline Panel',
                description: '显示或隐藏当前 Baseline Tuning Panel',
                run: () => {
                    const panel = document.getElementById('tuning-panel');
                    const toggle = document.getElementById('tuning-toggle');
                    if (panel) {
                        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                    }
                    if (toggle) {
                        toggle.style.display = toggle.style.display === 'none' ? 'block' : 'none';
                    }
                }
            },
            {
                id: 'export-tuning-baseline',
                title: 'Export Split Tuning Baseline',
                description: '把当前 TUNING 拆分写回 data/tuning',
                run: () => BaselineTuningStore.exportCurrentBaselines()
            }
        ];

        ScenarioLoader.list().forEach((entry) => {
            commands.push({
                id: `scenario:${entry.id}`,
                title: `Scenario / ${entry.id}`,
                description: entry.label,
                run: () => {
                    const target = mainFlowScene || activeScene;
                    if (activeScene?.runtimeMode === 'playground') {
                        activeScene.returnToMainFlow?.(() => target?.loadScenarioById?.(entry.id));
                        return;
                    }
                    target?.loadScenarioById?.(entry.id);
                }
            });
        });

        return commands;
    },
    open() {
        this.ensure();
        this.commands = this.buildCommands();
        this.root.classList.remove('hidden');
        this.input.value = '';
        this.render();
        this.input.focus();
    },
    close() {
        this.root?.classList.add('hidden');
    },
    toggle() {
        if (!this.root || this.root.classList.contains('hidden')) {
            this.open();
            return;
        }
        this.close();
    },
    render() {
        const filter = (this.input?.value || '').trim().toLowerCase();
        const commands = this.commands.filter((command) => {
            if (!filter) {
                return true;
            }
            return `${command.title} ${command.description}`.toLowerCase().includes(filter);
        });

        this.list.innerHTML = '';
        commands.forEach((command) => {
            const button = document.createElement('button');
            button.className = 'dev-command-item';
            button.type = 'button';
            button.innerHTML = `${command.title}<small>${command.description}</small>`;
            button.addEventListener('click', () => {
                this.close();
                command.run?.();
            });
            this.list.appendChild(button);
        });
    }
};

window.DevCommandLayer = DevCommandLayer;
