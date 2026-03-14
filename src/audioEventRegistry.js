const AUDIO_BUS_ORDER = Object.freeze(['master', 'bgm', 'sfx', 'ui', 'ambience']);

const AUDIO_DEFAULT_BUS_VOLUMES = Object.freeze({
    master: 1,
    bgm: 0.72,
    sfx: 0.9,
    ui: 0.9,
    ambience: 0.62
});

const AUDIO_EVENT_DEFAULTS = Object.freeze({
    enabled: true,
    bus: 'sfx',
    volume: 0.9,
    rate: 1,
    detune: 0,
    loop: false,
    cooldown: 0.05,
    maxVoices: 4,
    strategy: 'random',
    assetPool: []
});

const AUDIO_EVENT_REGISTRY = Object.freeze([
    {
        // ==========================================
        // DEMO占位：全流程背景音乐
        // 后续会进行不同关卡之间的音乐区分，此处用于测试循环与自然衔接
        // ==========================================
        id: 'bgm_main',
        label: 'Main BGM',
        group: 'system',
        module: 'sceneAudio.js',
        scene: 'core-demo',
        anchor: 'scene create',
        description: 'Demo BGM covering the whole flow, will differentiate by levels later',
        status: 'wired',
        defaults: { bus: 'bgm', volume: 0.8, cooldown: 0, maxVoices: 1, loop: true, strategy: 'first', assetPool: ['dem_1'] }
    },
    {
        id: 'system_boot',
        label: 'System Boot',
        group: 'system',
        module: 'scene.js',
        scene: 'core-demo',
        anchor: 'scene create',
        description: 'Boot once when scene is created.',
        status: 'wired',
        defaults: { bus: 'ambience', volume: 0.42, cooldown: 0.2, maxVoices: 1, assetPool: ['sys_boot_01'] }
    },
    {
        id: 'ui_click',
        label: 'UI Click',
        group: 'ui',
        module: 'ui.js',
        scene: 'overlay',
        anchor: 'menu/tuning/button click',
        description: 'Generic button click event.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.66, cooldown: 0.015, maxVoices: 6, strategy: 'round_robin', assetPool: ['ui_click_01', 'ui_click_02'] }
    },
    {
        id: 'ui_menu_open_main',
        label: 'Main Menu Open',
        group: 'ui',
        module: 'ui.js',
        scene: 'overlay',
        anchor: 'showMainMenu',
        description: 'When the main menu is opened.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.62, cooldown: 0.18, maxVoices: 1, assetPool: ['ui_menu_open_main_01'] }
    },
    {
        id: 'ui_menu_open_pause',
        label: 'Pause Menu Open',
        group: 'ui',
        module: 'ui.js',
        scene: 'overlay',
        anchor: 'showPauseMenu',
        description: 'When pause overlay is opened.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.58, cooldown: 0.12, maxVoices: 1, assetPool: ['ui_menu_open_pause_01'] }
    },
    {
        id: 'ui_menu_close',
        label: 'Menu Close',
        group: 'ui',
        module: 'sceneSaveLoad.js',
        scene: 'overlay',
        anchor: 'resumeGame',
        description: 'Closing pause/main menu and returning to gameplay.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.54, cooldown: 0.08, maxVoices: 1, assetPool: ['ui_menu_close_01'] }
    },
    {
        id: 'ui_toast_success',
        label: 'Toast Success',
        group: 'ui',
        module: 'ui.js',
        scene: 'overlay',
        anchor: 'showToast(false)',
        description: 'Positive toast feedback.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.46, cooldown: 0.08, maxVoices: 2, assetPool: ['ui_toast_success_01'] }
    },
    {
        id: 'ui_toast_error',
        label: 'Toast Error',
        group: 'ui',
        module: 'ui.js',
        scene: 'overlay',
        anchor: 'showToast(true)',
        description: 'Error toast feedback.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.52, cooldown: 0.08, maxVoices: 2, assetPool: ['ui_toast_error_01'] }
    },
    {
        id: 'save_success',
        label: 'Save Success',
        group: 'ui',
        module: 'sceneSaveLoad.js',
        scene: 'overlay',
        anchor: 'saveGameToSlot',
        description: 'Saving game data succeeded.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.64, cooldown: 0.2, maxVoices: 1, assetPool: ['ui_save_success_01'] }
    },
    {
        id: 'save_error',
        label: 'Save Error',
        group: 'ui',
        module: 'sceneSaveLoad.js',
        scene: 'overlay',
        anchor: 'saveGameToSlot',
        description: 'Saving game data failed.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.68, cooldown: 0.2, maxVoices: 1, assetPool: ['ui_save_error_01'] }
    },
    {
        id: 'load_success',
        label: 'Load Success',
        group: 'ui',
        module: 'sceneSaveLoad.js',
        scene: 'overlay',
        anchor: 'loadGameFromSlot',
        description: 'Loading game data succeeded.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.64, cooldown: 0.2, maxVoices: 1, assetPool: ['ui_load_success_01'] }
    },
    {
        id: 'load_error',
        label: 'Load Error',
        group: 'ui',
        module: 'sceneSaveLoad.js',
        scene: 'overlay',
        anchor: 'loadGameFromSlot',
        description: 'Loading game data failed.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.68, cooldown: 0.2, maxVoices: 1, assetPool: ['ui_load_error_01'] }
    },
    {
        id: 'game_start_new_run',
        label: 'Run Start',
        group: 'system',
        module: 'sceneSaveLoad.js',
        scene: 'core-demo',
        anchor: 'startNewGame',
        description: 'New run started from menu.',
        status: 'wired',
        defaults: { bus: 'ambience', volume: 0.58, cooldown: 0.4, maxVoices: 1, assetPool: ['run_start_01'] }
    },
    {
        id: 'game_restart',
        label: 'Run Restart',
        group: 'system',
        module: 'sceneInit.js',
        scene: 'core-demo',
        anchor: 'death/restart key reset',
        description: 'Restarting simulation quickly.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.58, cooldown: 0.35, maxVoices: 1, assetPool: ['run_restart_01'] }
    },
    {
        id: 'edit_mode_enter',
        label: 'Edit Mode Enter',
        group: 'editor',
        module: 'sceneInput.js',
        scene: 'core-demo',
        anchor: 'enterEditMode',
        description: 'Switch into edit mode.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.52, cooldown: 0.16, maxVoices: 1, assetPool: ['edit_enter_01'] }
    },
    {
        id: 'edit_mode_exit',
        label: 'Edit Mode Exit',
        group: 'editor',
        module: 'sceneInput.js',
        scene: 'core-demo',
        anchor: 'exitEditMode',
        description: 'Leave edit mode.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.5, cooldown: 0.16, maxVoices: 1, assetPool: ['edit_exit_01'] }
    },
    {
        id: 'edit_selection_node',
        label: 'Edit Select Node',
        group: 'editor',
        module: 'sceneInput.js',
        scene: 'core-demo',
        anchor: 'setEditSelection(node)',
        description: 'Node selected in edit mode.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.44, cooldown: 0.03, maxVoices: 4, assetPool: ['edit_select_node_01'] }
    },
    {
        id: 'edit_selection_link',
        label: 'Edit Select Link',
        group: 'editor',
        module: 'sceneInput.js',
        scene: 'core-demo',
        anchor: 'setEditSelection(link)',
        description: 'Link selected in edit mode.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.4, cooldown: 0.03, maxVoices: 4, assetPool: ['edit_select_link_01'] }
    },
    {
        id: 'edit_drag_start',
        label: 'Edit Drag Start',
        group: 'editor',
        module: 'sceneInput.js',
        scene: 'core-demo',
        anchor: 'drag node begin',
        description: 'Start dragging a node in edit mode.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.42, cooldown: 0.08, maxVoices: 2, assetPool: ['edit_drag_start_01'] }
    },
    {
        id: 'edit_drag_commit',
        label: 'Edit Drag Commit',
        group: 'editor',
        module: 'sceneInput.js',
        scene: 'core-demo',
        anchor: 'drag node commit snapshot',
        description: 'Committed node drag operation.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.48, cooldown: 0.08, maxVoices: 2, assetPool: ['edit_drag_commit_01'] }
    },
    {
        id: 'edit_undo',
        label: 'Edit Undo',
        group: 'editor',
        module: 'sceneInput.js',
        scene: 'core-demo',
        anchor: 'undoLastEditAction',
        description: 'Undo edit operation.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.5, cooldown: 0.08, maxVoices: 2, assetPool: ['edit_undo_01'] }
    },
    {
        id: 'edit_delete_start',
        label: 'Edit Delete Start',
        group: 'editor',
        module: 'sceneInput.js',
        scene: 'core-demo',
        anchor: 'startNodeDelete',
        description: 'Begin hold-to-delete action.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.5, cooldown: 0.1, maxVoices: 2, assetPool: ['edit_delete_start_01'] }
    },
    {
        id: 'edit_delete_commit',
        label: 'Edit Delete Commit',
        group: 'editor',
        module: 'sceneInput.js',
        scene: 'core-demo',
        anchor: 'delete commit',
        description: 'Deletion operation committed.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.6, cooldown: 0.1, maxVoices: 2, assetPool: ['edit_delete_commit_01'] }
    },
    {
        id: 'topology_edge_created',
        label: 'Topology Edge Created',
        group: 'topology',
        module: 'sceneTopology.js',
        scene: 'core-demo',
        anchor: 'addTopologyEdge',
        description: 'A new topology edge is created.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.46, cooldown: 0.03, maxVoices: 4, assetPool: ['topology_edge_add_01'] }
    },
    {
        id: 'topology_edge_deleted',
        label: 'Topology Edge Deleted',
        group: 'topology',
        module: 'sceneTopology.js',
        scene: 'core-demo',
        anchor: 'removeTopologyEdges',
        description: 'Topology edge deleted.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.44, cooldown: 0.03, maxVoices: 4, assetPool: ['topology_edge_remove_01'] }
    },
    {
        id: 'topology_node_added',
        label: 'Topology Node Added',
        group: 'topology',
        module: 'sceneInput.js',
        scene: 'core-demo',
        anchor: 'addDebugNode',
        description: 'A node was added into the chain.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.54, cooldown: 0.1, maxVoices: 2, assetPool: ['topology_node_add_01'] }
    },
    {
        id: 'topology_node_removed',
        label: 'Topology Node Removed',
        group: 'topology',
        module: 'sceneTopology.js',
        scene: 'core-demo',
        anchor: 'removeNodesFromTopology',
        description: 'One or more nodes removed from chain.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.62, cooldown: 0.12, maxVoices: 2, assetPool: ['topology_node_remove_01'] }
    },
    {
        id: 'player_pulse_source',
        label: 'Pulse Source Tick',
        group: 'player',
        module: 'sceneMovement.js',
        scene: 'core-demo',
        anchor: 'triggerNode(source)',
        description: 'Pulse trigger for source role.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.4, cooldown: 0.035, maxVoices: 8, assetPool: ['pulse_source_01', 'pulse_source_02'] }
    },
    {
        id: 'player_pulse_compressor',
        label: 'Pulse Compressor Tick',
        group: 'player',
        module: 'sceneMovement.js',
        scene: 'core-demo',
        anchor: 'triggerNode(compressor)',
        description: 'Pulse trigger for compressor role.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.44, cooldown: 0.035, maxVoices: 8, assetPool: ['pulse_compressor_01', 'pulse_compressor_02'] }
    },
    {
        id: 'player_pulse_shell',
        label: 'Pulse Shell Tick',
        group: 'player',
        module: 'sceneMovement.js',
        scene: 'core-demo',
        anchor: 'triggerNode(shell)',
        description: 'Pulse trigger for shell role.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.42, cooldown: 0.035, maxVoices: 8, assetPool: ['pulse_shell_01', 'pulse_shell_02'] }
    },
    {
        id: 'player_pulse_prism',
        label: 'Pulse Prism Tick',
        group: 'player',
        module: 'sceneMovement.js',
        scene: 'core-demo',
        anchor: 'triggerNode(prism)',
        description: 'Pulse trigger for prism role.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.46, cooldown: 0.035, maxVoices: 8, assetPool: ['pulse_prism_01', 'pulse_prism_02'] }
    },
    {
        id: 'player_pulse_dart',
        label: 'Pulse Dart Tick',
        group: 'player',
        module: 'sceneMovement.js',
        scene: 'core-demo',
        anchor: 'triggerNode(dart)',
        description: 'Pulse trigger for dart role.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.45, cooldown: 0.035, maxVoices: 8, assetPool: ['pulse_dart_01', 'pulse_dart_02'] }
    },
    {
        id: 'player_pulse_blade',
        label: 'Pulse Blade Tick',
        group: 'player',
        module: 'sceneMovement.js',
        scene: 'core-demo',
        anchor: 'triggerNode(blade)',
        description: 'Pulse trigger for blade role.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.48, cooldown: 0.035, maxVoices: 8, assetPool: ['pulse_blade_01', 'pulse_blade_02'] }
    },
    {
        id: 'player_pulse_inverse',
        label: 'Pulse Inverse Edge',
        group: 'player',
        module: 'sceneMovement.js',
        scene: 'core-demo',
        anchor: 'triggerNode(inverse edge)',
        description: 'Pulse jumps across inverse-polarity edge.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.52, cooldown: 0.05, maxVoices: 5, assetPool: ['pulse_inverse_01'] }
    },
    {
        id: 'player_growth',
        label: 'Player Growth',
        group: 'player',
        module: 'sceneProgression.js',
        scene: 'core-demo',
        anchor: 'growCluster',
        description: 'Cluster growth success.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.68, cooldown: 0.2, maxVoices: 2, assetPool: ['player_growth_01'] }
    },
    {
        id: 'player_low_energy_warning',
        label: 'Low Energy Warning',
        group: 'player',
        module: 'sceneProgression.js',
        scene: 'core-demo',
        anchor: 'updateRunState low energy',
        description: 'Low energy alert pulse.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.52, cooldown: 1.1, maxVoices: 1, assetPool: ['player_low_energy_01'] }
    },
    {
        id: 'player_hit_guard',
        label: 'Player Hit By Guard Pulse',
        group: 'player',
        module: 'sceneCombat.js',
        scene: 'core-demo',
        anchor: 'damagePlayer',
        description: 'Player damaged while colliding with guard pulse.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.6, cooldown: 0.08, maxVoices: 2, assetPool: ['player_hit_guard_01'] }
    },
    {
        id: 'prey_spawn_batch',
        label: 'Prey Spawn Batch',
        group: 'prey',
        module: 'sceneEnemies.js',
        scene: 'core-demo',
        anchor: 'spawnConfiguredPrey/seedConfiguredPrey',
        description: 'Batch spawn of prey entries.',
        status: 'wired',
        defaults: { bus: 'ambience', volume: 0.3, cooldown: 0.18, maxVoices: 2, assetPool: ['prey_spawn_01', 'prey_spawn_02'] }
    },
    {
        id: 'prey_latched_hook',
        label: 'Prey Latched Hook',
        group: 'prey',
        module: 'sceneCombat.js',
        scene: 'core-demo',
        anchor: 'tryLatchPrey(hook)',
        description: 'Hook role latched onto prey.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.58, cooldown: 0.03, maxVoices: 6, assetPool: ['prey_latch_hook_01'] }
    },
    {
        id: 'prey_latched_grind',
        label: 'Prey Latched Grind',
        group: 'prey',
        module: 'sceneCombat.js',
        scene: 'core-demo',
        anchor: 'tryLatchPrey(grind)',
        description: 'Grind role latched onto prey.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.56, cooldown: 0.03, maxVoices: 6, assetPool: ['prey_latch_grind_01'] }
    },
    {
        id: 'prey_latched_feed',
        label: 'Prey Latched Feed',
        group: 'prey',
        module: 'sceneCombat.js',
        scene: 'core-demo',
        anchor: 'tryLatchPrey(feed)',
        description: 'Feed role latched onto prey.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.52, cooldown: 0.03, maxVoices: 6, assetPool: ['prey_latch_feed_01'] }
    },
    {
        id: 'prey_bite_hook',
        label: 'Prey Bite Hook',
        group: 'prey',
        module: 'sceneCombat.js',
        scene: 'core-demo',
        anchor: 'performAttachmentBite(hook)',
        description: 'Hook bite damage tick.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.48, cooldown: 0.03, maxVoices: 8, assetPool: ['prey_bite_hook_01', 'prey_bite_hook_02'] }
    },
    {
        id: 'prey_bite_grind',
        label: 'Prey Bite Grind',
        group: 'prey',
        module: 'sceneCombat.js',
        scene: 'core-demo',
        anchor: 'performAttachmentBite(grind)',
        description: 'Grind bite damage tick.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.46, cooldown: 0.03, maxVoices: 8, assetPool: ['prey_bite_grind_01', 'prey_bite_grind_02'] }
    },
    {
        id: 'prey_bite_feed',
        label: 'Prey Bite Feed',
        group: 'prey',
        module: 'sceneCombat.js',
        scene: 'core-demo',
        anchor: 'performAttachmentBite(feed)',
        description: 'Feed bite damage tick.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.42, cooldown: 0.03, maxVoices: 8, assetPool: ['prey_bite_feed_01', 'prey_bite_feed_02'] }
    },
    {
        id: 'prey_devoured_small',
        label: 'Prey Devoured Small',
        group: 'prey',
        module: 'sceneCombat.js',
        scene: 'core-demo',
        anchor: 'finishPreyDevour(size small)',
        description: 'Small prey fully devoured.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.56, cooldown: 0.08, maxVoices: 4, assetPool: ['prey_devour_small_01'] }
    },
    {
        id: 'prey_devoured_medium',
        label: 'Prey Devoured Medium',
        group: 'prey',
        module: 'sceneCombat.js',
        scene: 'core-demo',
        anchor: 'finishPreyDevour(size medium)',
        description: 'Medium prey fully devoured.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.64, cooldown: 0.1, maxVoices: 3, assetPool: ['prey_devour_medium_01'] }
    },
    {
        id: 'prey_devoured_large',
        label: 'Prey Devoured Large',
        group: 'prey',
        module: 'sceneCombat.js',
        scene: 'core-demo',
        anchor: 'finishPreyDevour(size large)',
        description: 'Large prey fully devoured.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.72, cooldown: 0.12, maxVoices: 2, assetPool: ['prey_devour_large_01'] }
    },
    {
        id: 'prey_devoured_objective',
        label: 'Objective Devoured',
        group: 'prey',
        module: 'sceneCombat.js',
        scene: 'core-demo',
        anchor: 'finishPreyDevour(isObjective)',
        description: 'Objective prey fully devoured.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.86, cooldown: 0.2, maxVoices: 1, assetPool: ['prey_devour_objective_01'] }
    },
    {
        id: 'prey_guard_pulse',
        label: 'Prey Guard Pulse',
        group: 'prey',
        module: 'sceneEnemies.js',
        scene: 'core-demo',
        anchor: 'updateBulwarkGuard guard release',
        description: 'Bulwark/guard pulse release.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.6, cooldown: 0.08, maxVoices: 3, assetPool: ['prey_guard_pulse_01'] }
    },
    {
        id: 'prey_state_burst',
        label: 'Prey State Burst',
        group: 'prey',
        module: 'sceneEnemies.js',
        scene: 'core-demo',
        anchor: 'updatePreyStateMachine -> burst',
        description: 'Prey switched to burst state.',
        status: 'wired',
        defaults: { bus: 'ambience', volume: 0.34, cooldown: 0.08, maxVoices: 4, assetPool: ['prey_state_burst_01'] }
    },
    {
        id: 'loot_absorb_energy',
        label: 'Loot Absorb Energy',
        group: 'prey',
        module: 'sceneCombat.js',
        scene: 'core-demo',
        anchor: 'consumeFragment(kind energy)',
        description: 'Energy loot absorbed.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.42, cooldown: 0.02, maxVoices: 10, assetPool: ['loot_absorb_energy_01', 'loot_absorb_energy_02'] }
    },
    {
        id: 'loot_absorb_biomass',
        label: 'Loot Absorb Biomass',
        group: 'prey',
        module: 'sceneCombat.js',
        scene: 'core-demo',
        anchor: 'consumeFragment(kind meat)',
        description: 'Biomass loot absorbed.',
        status: 'wired',
        defaults: { bus: 'sfx', volume: 0.36, cooldown: 0.02, maxVoices: 10, assetPool: ['loot_absorb_biomass_01', 'loot_absorb_biomass_02'] }
    },
    {
        id: 'objective_spawn',
        label: 'Objective Spawn',
        group: 'progression',
        module: 'sceneProgression.js',
        scene: 'core-demo',
        anchor: 'spawnStageObjective',
        description: 'Current stage objective appears.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.7, cooldown: 0.2, maxVoices: 1, assetPool: ['objective_spawn_01'] }
    },
    {
        id: 'stage_advance',
        label: 'Stage Advance',
        group: 'progression',
        module: 'sceneProgression.js',
        scene: 'core-demo',
        anchor: 'advanceStage',
        description: 'Run progressed to the next stage.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.76, cooldown: 0.25, maxVoices: 1, assetPool: ['stage_advance_01'] }
    },
    {
        id: 'game_victory',
        label: 'Victory',
        group: 'progression',
        module: 'sceneProgression.js',
        scene: 'core-demo',
        anchor: 'triggerVictory',
        description: 'Run victory event.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.88, cooldown: 0.4, maxVoices: 1, assetPool: ['victory_01'] }
    },
    {
        id: 'game_death',
        label: 'Player Death',
        group: 'progression',
        module: 'sceneProgression.js',
        scene: 'core-demo',
        anchor: 'triggerPlayerDeath',
        description: 'Run ended because player died.',
        status: 'wired',
        defaults: { bus: 'ui', volume: 0.82, cooldown: 0.25, maxVoices: 1, assetPool: ['death_01'] }
    }
]);

const AUDIO_EVENT_INDEX = new Map(AUDIO_EVENT_REGISTRY.map((entry) => [entry.id, entry]));

function cloneAudioEventConfig(config) {
    return {
        enabled: typeof config?.enabled === 'boolean' ? config.enabled : AUDIO_EVENT_DEFAULTS.enabled,
        bus: typeof config?.bus === 'string' && config.bus.length > 0 ? config.bus : AUDIO_EVENT_DEFAULTS.bus,
        volume: Number.isFinite(config?.volume) ? config.volume : AUDIO_EVENT_DEFAULTS.volume,
        rate: Number.isFinite(config?.rate) ? config.rate : AUDIO_EVENT_DEFAULTS.rate,
        detune: Number.isFinite(config?.detune) ? config.detune : AUDIO_EVENT_DEFAULTS.detune,
        loop: typeof config?.loop === 'boolean' ? config.loop : AUDIO_EVENT_DEFAULTS.loop,
        cooldown: Number.isFinite(config?.cooldown) ? config.cooldown : AUDIO_EVENT_DEFAULTS.cooldown,
        maxVoices: Number.isFinite(config?.maxVoices) ? config.maxVoices : AUDIO_EVENT_DEFAULTS.maxVoices,
        strategy: typeof config?.strategy === 'string' && config.strategy.length > 0 ? config.strategy : AUDIO_EVENT_DEFAULTS.strategy,
        assetPool: Array.isArray(config?.assetPool) ? [...config.assetPool] : [...AUDIO_EVENT_DEFAULTS.assetPool]
    };
}

function getAudioEventDefinition(eventId) {
    return AUDIO_EVENT_INDEX.get(eventId) || null;
}

function getAudioEventDefaults(eventId) {
    const definition = getAudioEventDefinition(eventId);
    if (!definition) {
        return cloneAudioEventConfig(AUDIO_EVENT_DEFAULTS);
    }
    return cloneAudioEventConfig({
        ...AUDIO_EVENT_DEFAULTS,
        ...(definition.defaults || {})
    });
}

function getAudioGroups() {
    return [...new Set(AUDIO_EVENT_REGISTRY.map((entry) => entry.group || 'misc'))];
}
