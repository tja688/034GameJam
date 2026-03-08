/* ═══════════════════════════════════════════════════════════════
 *  玩家能力调试面板  —  Player Ability Debug Panel
 *  在游戏画面上叠加一个可折叠的侧栏，暴露玩家能力与结构驱动参数
 * ═══════════════════════════════════════════════════════════════ */

window.TUNING = {
    // ─── 移动能力对比 ─────────────────────────────
    legacyAllNodesMove: true,

    // ─── 力开关 ───────────────────────────────────
    enableFormationPull: false,
    enableDrift: true,
    enableCorePull: true,
    enableAnchor: true,
    enableSpring: true,
    enableRepulsion: true,
    enablePBD: true,
    enablePulse: true,

    // ─── 编队拉力 ─────────────────────────────────
    formationPullAnchored: 32,
    formationPullFreeBase: 76,
    formationPullStabilityBonus: 22,

    // ─── 漂移力 ───────────────────────────────────
    driftAttack: 54,
    driftShell: 18,
    driftDefault: 28,

    // ─── 核心收束力 ───────────────────────────────
    corePullStrength: 24,

    // ─── 弹簧系统 ─────────────────────────────────
    springK: 260,
    springDamping: 42,
    spineStiffness: 0.98,
    supportStiffness: 0.78,
    spineDamping: 0.24,
    supportDamping: 0.18,
    flexStiffness: 0.06,
    flexDamping: 0.05,
    flexStretchSlack: 82,
    flexPbdWeight: 0.05,
    jointStiffness: 0.78,
    jointDamping: 0.62,
    jointStretchSlack: 18,
    jointPbdWeight: 0.68,
    rigidStiffness: 4.8,
    rigidDamping: 2.4,
    rigidStretchSlack: 0.35,
    rigidPbdWeight: 4.4,
    inversePolarityStiffnessMul: 0.88,
    inversePolarityDampingMul: 0.86,
    samePolarityRestMul: 1.02,
    inversePolarityRestMul: 1.08,
    linkRestMin: 84,
    linkRestMax: 206,
    supportSoftness: 0.88,

    // ─── 排斥力 ───────────────────────────────────
    repulsionMinDist: 72,
    repulsionDegreeMax: 18,
    repulsionDegreeScale: 1.6,
    repulsionStiffness: 16,

    // ─── 阻力与积分 ──────────────────────────────
    dragAnchored: 7.8,
    dragFreeBase: 5.6,
    dragStabilityBonus: 1.1,
    tensionDecay: 0.85,

    // ─── PBD 约束求解 ────────────────────────────
    pbdIterations: 3,
    pbdCorrectionRate: 0.18,
    pbdRigidPasses: 5,

    // ─── 转向与意图 ──────────────────────────────
    baseTurnRate: 3.1,
    turnAssistBonus: 2.1,
    normalMoveWeight: 0.58,
    shiftMoveWeight: 0.32,

    // ─── 状态衰减 ────────────────────────────────
    stabilityDecay: 0.4,
    stabilityMin: 0.3,
    turnAssistDecay: 1.8,
    tempoBoostDecay: 1.5,
    agitationDecay: 0.9,

    // ─── 节点质量 ────────────────────────────────
    massShell: 1.35,
    massBlade: 1.15,
    massDefault: 1.0,

    // ─── 脉冲植入 — Source ────────────────────────
    plantSourceForward: 78,
    plantSourceSide: 88,
    plantSourceStance: 0.36,
    plantSourceStrength: 260,

    // ─── 脉冲植入 — Compressor ───────────────────
    plantCompressorForward: 92,
    plantCompressorSide: 62,
    plantCompressorStance: 0.28,
    plantCompressorStrength: 320,

    // ─── 脉冲植入 — Shell ────────────────────────
    plantShellForward: 52,
    plantShellSide: 146,
    plantShellStance: 0.50,
    plantShellStrength: 420,
    plantShellFlowBias: 0.68,
    plantShellAimBias: 0.32,

    // ─── 脉冲植入 — Prism ────────────────────────
    plantPrismForward: 86,
    plantPrismSide: 134,
    plantPrismStance: 0.40,
    plantPrismStrength: 360,
    plantPrismFlowBias: 0.30,
    plantPrismAimBias: 0.70,

    // ─── 脉冲植入 — Dart ─────────────────────────
    plantDartForward: 148,
    plantDartSide: 54,
    plantDartStance: 0.42,
    plantDartStrength: 330,
    plantDartFlowBias: 0.32,
    plantDartAimBias: 0.68,

    // ─── 脉冲植入 — Blade ────────────────────────
    plantBladeForward: 184,
    plantBladeSide: 26,
    plantBladeStance: 0.34,
    plantBladeStrength: 460,
    plantBladeFlowBias: 0.62,
    plantBladeAimBias: 0.38,

    // ─── 拓扑槽位 ────────────────────────────────
    enableCompoundTopologyEdges: false,
    enableSunflowerTopologySlots: false,
    slotSpacing: 102,
    slotYCompression: 0.84,
    slotRadiusScale: 0.94,
    forwardStep: 72,

    // ─── 脉冲循环 ────────────────────────────────
    pulseOrbCount: 1,

    // ─── 相机 ────────────────────────────────────
    cameraZoomDamp: 3.2,
    cameraPosDamp: 3.4,
    cameraMinZoom: 0.36,
    cameraMaxZoom: 1.08,
    cameraSpanPadding: 180,

    // ─── 显示平滑 ────────────────────────────────
    displayDamping: 18,
    pulseGlowDecay: 3.2,

    // ─── 编队跨度比例 ────────────────────────────
    formationSpanFactor: 0.16,
};

const TUNING_STORAGE_KEY = 'bio-core-tuning-profile';

function loadPersistedTuning() {
    try {
        const raw = window.localStorage.getItem(TUNING_STORAGE_KEY);
        if (!raw) {
            return false;
        }

        const saved = JSON.parse(raw);
        if (!saved || typeof saved !== 'object') {
            return false;
        }

        Object.keys(window.TUNING).forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(saved, key)) {
                window.TUNING[key] = saved[key];
            }
        });
        return true;
    } catch (error) {
        console.warn('加载本地调参配置失败:', error);
        return false;
    }
}

function savePersistedTuning() {
    try {
        window.localStorage.setItem(TUNING_STORAGE_KEY, JSON.stringify(window.TUNING));
        return true;
    } catch (error) {
        console.warn('保存本地调参配置失败:', error);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
//  参数定义表：key → { label, desc, min, max, step, section }
// ═══════════════════════════════════════════════════════════════

const TUNING_DEFS = [
    // ── 移动能力对比 ──
    { section: '🧪 移动能力对比', sectionDesc: '当前默认开启“所有节点都主动移动”；关闭后切到调试模式，只允许蓝色节点主动驱动，红色节点暂时屏蔽主动移动与功能触发' },
    { key: 'legacyAllNodesMove', label: '全节点主动移动（关=仅蓝色驱动）', desc: '默认开启，保持当前版本：所有节点都能参与脉冲牵引、漂移推进和功能触发；关闭后只保留蓝色节点的主动移动与功能，红色节点只保留结构上的被动跟随', type: 'toggle' },

    // ── 力开关 ──
    { section: '⚡ 力场开关', sectionDesc: '关掉某个力可以观察剩余力的独立效果；当前默认以“脉冲锚定 + 连线拖拽”为核心' },
    { key: 'enableFormationPull', label: '旧编队拉回', desc: '旧范式遗留开关：把节点拉回拓扑槽位。当前默认关闭，用于和纯软体模式做对照', type: 'toggle' },
    { key: 'enableDrift', label: '漂移推进力', desc: 'WASD 驱动的实际移动推力；当前默认由所有节点施加，关闭“全节点主动移动”后只会由蓝色节点施加', type: 'toggle' },
    { key: 'enableCorePull', label: '核心收束力', desc: '仅对圆形节点(source/compressor)施加的向质心拉力；关掉后核心会被甩到外围', type: 'toggle' },
    { key: 'enableAnchor', label: '脉冲牵引力', desc: '脉冲触发时，将节点拉向目标点；当前默认所有节点都会被驱动，关闭“全节点主动移动”后只保留蓝色节点的主动牵引', type: 'toggle' },
    { key: 'enableSpring', label: '弹簧连线力', desc: '连线的弹簧-阻尼约束力；关掉后节点间没有弹性联系', type: 'toggle' },
    { key: 'enableRepulsion', label: '节点排斥力', desc: '防止节点互相重叠的短程排斥力；关掉后节点可能堆在一起', type: 'toggle' },
    { key: 'enablePBD', label: 'PBD 位置校正', desc: '力学积分后的约束求解迭代；关掉后弹簧更容易过度拉伸', type: 'toggle' },
    { key: 'enablePulse', label: '脉冲系统', desc: '整个脉冲循环系统；关掉后不会有节点触发和植入', type: 'toggle' },

    // ── 编队拉力 ──
    { section: '🧲 旧编队拉回', sectionDesc: '旧系统遗留参数。只有打开“旧编队拉回”时才会生效，默认不参与当前软体方案' },
    { key: 'formationPullAnchored', label: '锚定态拉回', desc: '节点被脉冲锚定时的旧版槽位拉回强度', min: 0, max: 200, step: 1 },
    { key: 'formationPullFreeBase', label: '自由态拉回', desc: '未锚定节点的旧版槽位拉回基础值', min: 0, max: 300, step: 1 },
    { key: 'formationPullStabilityBonus', label: '稳定性加成', desc: '旧版拉回里 stability 带来的额外回拽', min: 0, max: 100, step: 1 },

    // ── 漂移力 ──
    { section: '💨 漂移推进力', sectionDesc: '不同角色在 WASD 方向上的推进力大小差异；当前默认所有角色都会真正把推力施加到结构上' },
    { key: 'driftAttack', label: '攻击节点漂移力', desc: 'dart(远程)/blade(近战) 的推进力；关闭“全节点主动移动”后只有蓝色攻击节点还会实际施加推进', min: 0, max: 200, step: 1 },
    { key: 'driftShell', label: '护盾节点漂移力', desc: 'shell(方形/本色) 的推进力；无论哪种模式它都是主要移动来源之一', min: 0, max: 200, step: 1 },
    { key: 'driftDefault', label: '标准移动节点漂移力', desc: '当前用于 source/compressor/prism 等默认移动节点；关闭“全节点主动移动”后主要只剩蓝色 source 使用', min: 0, max: 200, step: 1 },

    // ── 核心收束 ──
    { section: '🎯 核心收束力', sectionDesc: '仅对圆形节点(source/compressor)的额外向心力' },
    { key: 'corePullStrength', label: '收束力强度', desc: '圆形节点额外受到的向质心拉力系数（确保能量核心不被甩出去）', min: 0, max: 100, step: 1 },

    // ── 弹簧系统 ──
    { section: '🔗 弹簧-阻尼系统', sectionDesc: '连线的基础弹性与粘滞；真正的刚柔分档由下面的“拓扑刚性”继续细分' },
    { key: 'springK', label: '弹簧基础刚度 K', desc: '弹簧回复力的基础系数（越大连线越硬）', min: 0, max: 800, step: 5 },
    { key: 'springDamping', label: '弹簧基础阻尼 C', desc: '弹簧相对速度阻尼的基础系数（越大震荡越少）', min: 0, max: 200, step: 1 },
    { key: 'spineStiffness', label: '骨干边刚度系数', desc: 'spine 类型连线（脉冲骨干）的刚度乘数', min: 0, max: 2, step: 0.01 },
    { key: 'supportStiffness', label: '支撑边刚度系数', desc: 'support 类型连线（辅助支撑）的刚度乘数', min: 0, max: 2, step: 0.01 },
    { key: 'spineDamping', label: '骨干边阻尼系数', desc: 'spine 类型连线的阻尼乘数', min: 0, max: 1, step: 0.01 },
    { key: 'supportDamping', label: '支撑边阻尼系数', desc: 'support 类型连线的阻尼乘数', min: 0, max: 1, step: 0.01 },
    { section: '🦴 平行连线刚性', sectionDesc: '按同一对节点之间叠了几根线分档：1 根=触须，2 根=关节，3 根及以上=硬骨架' },
    { key: 'flexStiffness', label: '1 线刚度', desc: 'A-B 之间只有 1 根线时的额外刚度倍率，越低越软', min: 0, max: 1, step: 0.01 },
    { key: 'flexDamping', label: '1 线阻尼', desc: 'A-B 单线连接的轴向阻尼倍率，越低越容易甩动', min: 0, max: 1, step: 0.01 },
    { key: 'flexStretchSlack', label: '1 线容差', desc: 'A-B 单线连接在真正回拉前允许额外伸长的距离 (px)', min: 0, max: 120, step: 1 },
    { key: 'flexPbdWeight', label: '1 线 PBD', desc: 'A-B 单线连接的位置校正硬度，低值意味着更像软肉', min: 0, max: 1, step: 0.01 },
    { key: 'jointStiffness', label: '2 线刚度', desc: 'A-B 之间有 2 根线时的额外刚度倍率', min: 0, max: 2, step: 0.01 },
    { key: 'jointDamping', label: '2 线阻尼', desc: 'A-B 双线连接的额外阻尼倍率', min: 0, max: 2, step: 0.01 },
    { key: 'jointStretchSlack', label: '2 线容差', desc: 'A-B 双线连接允许的额外伸长距离 (px)', min: 0, max: 80, step: 1 },
    { key: 'jointPbdWeight', label: '2 线 PBD', desc: 'A-B 双线连接的位置校正硬度', min: 0, max: 2, step: 0.01 },
    { key: 'rigidStiffness', label: '3+ 线刚度', desc: 'A-B 之间有 3 根及以上时的额外刚度倍率', min: 0.5, max: 5, step: 0.05 },
    { key: 'rigidDamping', label: '3+ 线阻尼', desc: 'A-B 三线及以上连接的额外阻尼倍率', min: 0.5, max: 3, step: 0.05 },
    { key: 'rigidStretchSlack', label: '3+ 线容差', desc: 'A-B 三线及以上连接允许的额外伸长距离 (px)，建议保持很低', min: 0, max: 20, step: 0.5 },
    { key: 'rigidPbdWeight', label: '3+ 线 PBD', desc: 'A-B 三线及以上连接的距离约束权重，越高越接近焊死', min: 0.5, max: 5, step: 0.05 },
    { key: 'inversePolarityStiffnessMul', label: '异极性刚度折扣', desc: '不同极性节点之间连线的刚度倍率（<1 表示更软）', min: 0, max: 1.5, step: 0.01 },
    { key: 'inversePolarityDampingMul', label: '异极性阻尼折扣', desc: '不同极性节点之间连线的阻尼倍率（<1 表示更活跃）', min: 0, max: 1.5, step: 0.01 },
    { key: 'samePolarityRestMul', label: '同极性自然长度', desc: '同极性连线自然长度倍率（>1 会稍微松一点）', min: 0.5, max: 2.0, step: 0.01 },
    { key: 'inversePolarityRestMul', label: '异极性自然长度', desc: '异极性连线自然长度倍率（通常比同极性更长）', min: 0.5, max: 2.0, step: 0.01 },
    { key: 'linkRestMin', label: '连线最短长度', desc: '弹簧自然长度的下限 clamp 值 (px)', min: 20, max: 200, step: 2 },
    { key: 'linkRestMax', label: '连线最长长度', desc: '弹簧自然长度的上限 clamp 值 (px)', min: 100, max: 500, step: 5 },

    // ── 排斥力 ──
    { section: '🛡️ 节点排斥力', sectionDesc: '防止节点堆叠的短程力' },
    { key: 'repulsionMinDist', label: '基础最小间距', desc: '两个节点之间允许的最近距离 (px)', min: 20, max: 200, step: 2 },
    { key: 'repulsionDegreeMax', label: '连接度加成上限', desc: '连接度对间距的加成最大值', min: 0, max: 60, step: 1 },
    { key: 'repulsionDegreeScale', label: '连接度加成系数', desc: '每单位连接度增加多少间距 (px)', min: 0, max: 5, step: 0.1 },
    { key: 'repulsionStiffness', label: '排斥刚度', desc: '重叠量转化为排斥力的系数（越大推力越强）', min: 0, max: 80, step: 1 },

    // ── 阻力与积分 ──
    { section: '🌊 阻力与速度积分', sectionDesc: '控制节点速度衰减——决定组织体的"重量感"' },
    { key: 'dragAnchored', label: '锚定态阻力', desc: '节点被锚定时的指数衰减阻力系数（越大减速越快）', min: 0, max: 20, step: 0.1 },
    { key: 'dragFreeBase', label: '自由态阻力基础', desc: '未锚定节点的基础阻力系数', min: 0, max: 20, step: 0.1 },
    { key: 'dragStabilityBonus', label: '稳定性阻力加成', desc: '每单位 stability 增加的额外阻力（高稳定性 = 更沉）', min: 0, max: 5, step: 0.1 },
    { key: 'tensionDecay', label: '张力衰减', desc: '每帧张力值的衰减倍率（0~1 之间）', min: 0, max: 1, step: 0.01 },

    // ── PBD ──
    { section: '📐 PBD 位置校正', sectionDesc: '力学积分后的约束求解；高连接骨架会在这里吃到额外的刚体校正' },
    { key: 'pbdIterations', label: '迭代次数', desc: '每帧位置校正的迭代轮数（越多越精确，但更耗性能）', min: 0, max: 12, step: 1 },
    { key: 'pbdCorrectionRate', label: '校正比例', desc: '每次迭代校正偏差的百分比（0.18 = 每次修正 18%）', min: 0, max: 0.8, step: 0.01 },
    { key: 'pbdRigidPasses', label: '骨架额外轮数', desc: '对 rigid 连线追加的专用校正轮数，让三角/网格更不容易散架', min: 0, max: 8, step: 1 },

    // ── 脉冲循环 ──
    { section: '🫀 脉冲循环', sectionDesc: '控制有多少个能量脉冲球同时沿结构流动；新增球会尽量错相分布' },
    { key: 'pulseOrbCount', label: '脉冲球数量', desc: '同时存在的能量脉冲球数量；越多触发越密、节奏越快', min: 1, max: 8, step: 1 },

    // ── 转向 ──
    { section: '🔄 转向与意图混合', sectionDesc: 'flow 方向的混合比例和朝向旋转速度' },
    { key: 'baseTurnRate', label: '基础转向速率', desc: '组织体朝向旋转的基础速率 (rad/s)', min: 0, max: 10, step: 0.1 },
    { key: 'turnAssistBonus', label: '转向辅助加成', desc: 'shell/prism 提供的 turnAssist 能额外增加的转向速率', min: 0, max: 8, step: 0.1 },
    { key: 'normalMoveWeight', label: '普通模式移动权重', desc: '松开 Shift 时 WASD 在 flow 混合中的占比 (0~1)', min: 0, max: 1, step: 0.01 },
    { key: 'shiftMoveWeight', label: '瞄准模式移动权重', desc: '按住 Shift 时 WASD 在 flow 混合中的占比 (0~1)', min: 0, max: 1, step: 0.01 },

    // ── 状态衰减 ──
    { section: '📉 状态衰减速率', sectionDesc: '影响组织体手感的各项 buff 衰减' },
    { key: 'stabilityDecay', label: 'stability 衰减/秒', desc: '稳定性每秒自然减少量（越大越难维持高稳定性）', min: 0, max: 2, step: 0.05 },
    { key: 'stabilityMin', label: 'stability 最低值', desc: '稳定性不会低于此值', min: 0, max: 1, step: 0.05 },
    { key: 'turnAssistDecay', label: 'turnAssist 衰减/秒', desc: '转向辅助每秒减少量', min: 0, max: 5, step: 0.1 },
    { key: 'tempoBoostDecay', label: 'tempoBoost 衰减/秒', desc: '节奏加速每秒减少量', min: 0, max: 5, step: 0.1 },
    { key: 'agitationDecay', label: 'agitation 衰减/秒', desc: '激进度每秒减少量', min: 0, max: 3, step: 0.1 },

    // ── 节点质量 ──
    { section: '⚖️ 节点质量', sectionDesc: '质量影响加速度 a=F/m，越大越迟钝' },
    { key: 'massShell', label: 'Shell 质量', desc: '方形护盾节点的质量（最重，最迟钝）', min: 0.1, max: 5, step: 0.05 },
    { key: 'massBlade', label: 'Blade 质量', desc: '三角近战节点的质量', min: 0.1, max: 5, step: 0.05 },
    { key: 'massDefault', label: '默认节点质量', desc: 'source/compressor/dart/prism 的质量', min: 0.1, max: 5, step: 0.05 },

    // ── 植入参数 - Source ──
    { section: '🟦 Source 植入参数', sectionDesc: '圆/本色——能量源节点被脉冲触发时的锚点计算' },
    { key: 'plantSourceForward', label: '前推距离', desc: '植入锚点在前进方向上的基础偏移 (px)', min: 0, max: 300, step: 2 },
    { key: 'plantSourceSide', label: '侧展距离', desc: '植入锚点在侧方向上的基础偏移 (px)', min: 0, max: 300, step: 2 },
    { key: 'plantSourceStance', label: '锚定时长', desc: '节点被钉在锚点上的持续时间 (秒)，会乘以极性修正', min: 0, max: 2, step: 0.02 },
    { key: 'plantSourceStrength', label: '锚定力强度', desc: '将节点拉向锚点的弹簧力系数', min: 0, max: 800, step: 10 },

    // ── 植入参数 - Compressor ──
    { section: '🟥 Compressor 植入参数', sectionDesc: '圆/反色——过载加速节点' },
    { key: 'plantCompressorForward', label: '前推距离', desc: '植入锚点前进方向基础偏移 (px)', min: 0, max: 300, step: 2 },
    { key: 'plantCompressorSide', label: '侧展距离', desc: '植入锚点侧方向基础偏移 (px)', min: 0, max: 300, step: 2 },
    { key: 'plantCompressorStance', label: '锚定时长', desc: '每次植入的锚定持续时间 (秒)', min: 0, max: 2, step: 0.02 },
    { key: 'plantCompressorStrength', label: '锚定力强度', desc: '锚定弹簧力系数', min: 0, max: 800, step: 10 },

    // ── 植入参数 - Shell ──
    { section: '🟦 Shell 植入参数', sectionDesc: '方/本色——护盾节点，侧向展开很大' },
    { key: 'plantShellForward', label: '前推距离', desc: '植入前进方向偏移 (px)——shell 前推最短', min: 0, max: 300, step: 2 },
    { key: 'plantShellSide', label: '侧展距离', desc: '植入侧方向偏移 (px)——shell 侧展最大', min: 0, max: 400, step: 2 },
    { key: 'plantShellStance', label: '锚定时长', desc: '锚定持续时间——shell 最长 (秒)', min: 0, max: 2, step: 0.02 },
    { key: 'plantShellStrength', label: '锚定力强度', desc: '锚定弹簧力系数——shell 最强', min: 0, max: 1000, step: 10 },
    { key: 'plantShellFlowBias', label: 'flow 权重', desc: '锚点方向中"移动方向"的占比 (0~1)', min: 0, max: 1, step: 0.02 },
    { key: 'plantShellAimBias', label: 'aim 权重', desc: '锚点方向中"瞄准方向"的占比 (0~1)', min: 0, max: 1, step: 0.02 },

    // ── 植入参数 - Prism ──
    { section: '🟥 Prism 植入参数', sectionDesc: '方/反色——回响与转向辅助' },
    { key: 'plantPrismForward', label: '前推距离', desc: '前进方向基础偏移 (px)', min: 0, max: 300, step: 2 },
    { key: 'plantPrismSide', label: '侧展距离', desc: '侧方向基础偏移 (px)', min: 0, max: 300, step: 2 },
    { key: 'plantPrismStance', label: '锚定时长', desc: '锚定持续时间 (秒)', min: 0, max: 2, step: 0.02 },
    { key: 'plantPrismStrength', label: '锚定力强度', desc: '锚定弹簧力系数', min: 0, max: 800, step: 10 },
    { key: 'plantPrismFlowBias', label: 'flow 权重', desc: '锚点方向中移动方向占比 (0~1)', min: 0, max: 1, step: 0.02 },
    { key: 'plantPrismAimBias', label: 'aim 权重', desc: '锚点方向中瞄准方向占比 (0~1)', min: 0, max: 1, step: 0.02 },

    // ── 植入参数 - Dart ──
    { section: '🟦 Dart 植入参数', sectionDesc: '三角/本色——远程齐射' },
    { key: 'plantDartForward', label: '前推距离', desc: '前进方向基础偏移 (px)——dart 前推较远', min: 0, max: 400, step: 2 },
    { key: 'plantDartSide', label: '侧展距离', desc: '侧方向基础偏移 (px)', min: 0, max: 300, step: 2 },
    { key: 'plantDartStance', label: '锚定时长', desc: '锚定持续时间 (秒)', min: 0, max: 2, step: 0.02 },
    { key: 'plantDartStrength', label: '锚定力强度', desc: '锚定弹簧力系数', min: 0, max: 800, step: 10 },
    { key: 'plantDartFlowBias', label: 'flow 权重', desc: '锚点方向中移动方向占比 (0~1)', min: 0, max: 1, step: 0.02 },
    { key: 'plantDartAimBias', label: 'aim 权重', desc: '锚点方向中瞄准方向占比 (0~1)', min: 0, max: 1, step: 0.02 },

    // ── 植入参数 - Blade ──
    { section: '🟥 Blade 植入参数', sectionDesc: '三角/反色——近身斩击，前推最远' },
    { key: 'plantBladeForward', label: '前推距离', desc: '前进方向基础偏移 (px)——blade 前推最远', min: 0, max: 400, step: 2 },
    { key: 'plantBladeSide', label: '侧展距离', desc: '侧方向基础偏移 (px)', min: 0, max: 300, step: 2 },
    { key: 'plantBladeStance', label: '锚定时长', desc: '锚定持续时间 (秒)', min: 0, max: 2, step: 0.02 },
    { key: 'plantBladeStrength', label: '锚定力强度', desc: '锚定弹簧力系数——blade 最强', min: 0, max: 1000, step: 10 },
    { key: 'plantBladeFlowBias', label: 'flow 权重', desc: '锚点方向中移动方向占比 (0~1)', min: 0, max: 1, step: 0.02 },
    { key: 'plantBladeAimBias', label: 'aim 权重', desc: '锚点方向中瞄准方向占比 (0~1)', min: 0, max: 1, step: 0.02 },

    // ── 拓扑 ──
    { section: '🌐 拓扑与槽位', sectionDesc: '控制结构生长时的空间基准；旧黄金角槽位已降级为实验开关' },
    { key: 'enableCompoundTopologyEdges', label: '复合连线（关=强制单线）', desc: '默认关闭。开启后允许同一对节点保留多根连线，并对新生成结构启用复合连线种子；关闭后回到旧单线实现，已有复合连线会直接压成一根', type: 'toggle' },
    { key: 'enableSunflowerTopologySlots', label: '旧向日葵槽位', desc: '旧范式遗留开关：使用黄金角向日葵分布生成默认槽位。当前默认关闭，优先保留现有软体结构的局部轮廓', type: 'toggle' },
    { key: 'slotSpacing', label: '槽位间距', desc: '节点排布的基准间距 (px)——影响整体密度', min: 40, max: 250, step: 2 },
    { key: 'slotYCompression', label: 'Y 轴压缩', desc: '槽位在 Y 方向的压缩比 (0.84=稍扁)', min: 0.3, max: 1.5, step: 0.02 },
    { key: 'slotRadiusScale', label: '半径缩放', desc: '槽位散布半径的总缩放系数', min: 0.3, max: 2, step: 0.02 },
    { key: 'forwardStep', label: '前进步进', desc: '新节点扩展时保持的前进距离 (px)', min: 20, max: 200, step: 2 },

    // ── 相机 ──
    { section: '📷 相机跟踪', sectionDesc: '相机平滑跟踪和自适应缩放' },
    { key: 'cameraZoomDamp', label: '缩放阻尼', desc: '缩放平滑追赶速率（越大越快跟上）', min: 0.5, max: 15, step: 0.1 },
    { key: 'cameraPosDamp', label: '位置阻尼', desc: '位置平滑追赶速率（越大越快跟上）', min: 0.5, max: 15, step: 0.1 },
    { key: 'cameraMinZoom', label: '最小缩放', desc: '大组织体时相机拉远的下限', min: 0.1, max: 1, step: 0.02 },
    { key: 'cameraMaxZoom', label: '最大缩放', desc: '小组织体时相机拉近的上限', min: 0.5, max: 3, step: 0.02 },
    { key: 'cameraSpanPadding', label: '视野余量', desc: '编队跨度外的额外视野边距 (px)', min: 0, max: 500, step: 10 },

    // ── 显示 ──
    { section: '✨ 显示平滑', sectionDesc: '物理仿真与渲染之间的平滑层' },
    { key: 'displayDamping', label: '显示追赶阻尼', desc: '渲染位置追赶物理位置的速率（越大越紧密跟随）', min: 1, max: 60, step: 1 },
    { key: 'pulseGlowDecay', label: '脉冲光衰减', desc: '脉冲触发后光晕消退速率', min: 0.5, max: 10, step: 0.1 },

    // ── 编队跨度 ──
    { section: '📏 编队参数', sectionDesc: '影响植入前推距离的编队跨度系数' },
    { key: 'formationSpanFactor', label: '跨度系数', desc: '植入时 forwardReach += formationSpan × 此值', min: 0, max: 0.5, step: 0.01 },
];

// ═══════════════════════════════════════════════════════════════
//  保存默认值以供重置
// ═══════════════════════════════════════════════════════════════
loadPersistedTuning();
const TUNING_DEFAULTS = JSON.parse(JSON.stringify(window.TUNING));

// ═══════════════════════════════════════════════════════════════
//  构建面板 UI
// ═══════════════════════════════════════════════════════════════

function buildTuningPanel() {
    // ─── 注入 CSS ─────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        #tuning-panel {
            position: fixed;
            top: 0;
            right: 0;
            width: 420px;
            height: 100vh;
            background: rgba(7, 16, 23, 0.94);
            border-left: 2px solid rgba(79, 169, 198, 0.35);
            color: #c8dfe6;
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
            font-size: 12px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            transition: transform 0.3s ease;
            backdrop-filter: blur(12px);
            user-select: none;
        }
        #tuning-panel.collapsed {
            transform: translateX(100%);
        }
        #tuning-toggle {
            position: fixed;
            top: 12px;
            right: 12px;
            z-index: 10000;
            background: rgba(13, 30, 40, 0.88);
            border: 1px solid rgba(79, 169, 198, 0.5);
            color: #36d6ff;
            padding: 8px 14px;
            font-size: 13px;
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s;
            backdrop-filter: blur(8px);
        }
        #tuning-toggle:hover {
            background: rgba(54, 214, 255, 0.15);
            border-color: #36d6ff;
        }
        #tuning-panel.collapsed ~ #tuning-toggle {
            right: 12px;
        }
        #tuning-panel:not(.collapsed) ~ #tuning-toggle {
            right: 432px;
        }
        #tuning-header {
            padding: 14px 18px 10px;
            border-bottom: 1px solid rgba(79, 169, 198, 0.2);
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
        }
        #tuning-header h2 {
            margin: 0;
            font-size: 15px;
            font-weight: 600;
            color: #36d6ff;
            letter-spacing: 1px;
        }
        #tuning-header .header-btns {
            display: flex;
            gap: 8px;
        }
        #tuning-header button {
            background: rgba(255, 93, 73, 0.12);
            border: 1px solid rgba(255, 93, 73, 0.35);
            color: #ff5d49;
            padding: 4px 12px;
            font-size: 11px;
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.15s;
        }
        #tuning-header button:hover {
            background: rgba(255, 93, 73, 0.25);
        }
        #tuning-header button.export-btn {
            background: rgba(54, 214, 255, 0.12);
            border-color: rgba(54, 214, 255, 0.35);
            color: #36d6ff;
        }
        #tuning-header button.export-btn:hover {
            background: rgba(54, 214, 255, 0.25);
        }
        #tuning-header button.apply-btn {
            background: rgba(244, 240, 215, 0.1);
            border-color: rgba(244, 240, 215, 0.28);
            color: #f4f0d7;
        }
        #tuning-header button.apply-btn:hover {
            background: rgba(244, 240, 215, 0.18);
        }
        #tuning-body {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 6px 0;
            scrollbar-width: thin;
            scrollbar-color: rgba(79, 169, 198, 0.3) transparent;
        }
        #tuning-body::-webkit-scrollbar {
            width: 6px;
        }
        #tuning-body::-webkit-scrollbar-track {
            background: transparent;
        }
        #tuning-body::-webkit-scrollbar-thumb {
            background: rgba(79, 169, 198, 0.3);
            border-radius: 3px;
        }
        .tuning-section {
            margin: 2px 0;
        }
        .tuning-section-header {
            padding: 10px 18px 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(79, 169, 198, 0.08);
            transition: background 0.15s;
        }
        .tuning-section-header:hover {
            background: rgba(54, 214, 255, 0.06);
        }
        .tuning-section-header .section-title {
            font-size: 13px;
            font-weight: 600;
            color: #f4f0d7;
        }
        .tuning-section-header .section-arrow {
            color: #4fa9c6;
            transition: transform 0.2s;
            font-size: 14px;
        }
        .tuning-section-header.open .section-arrow {
            transform: rotate(90deg);
        }
        .tuning-section-desc {
            padding: 0 18px 6px;
            color: rgba(200, 223, 230, 0.5);
            font-size: 11px;
            line-height: 1.4;
        }
        .tuning-section-body {
            display: none;
            padding: 4px 14px 12px;
        }
        .tuning-section-body.open {
            display: block;
        }
        .tuning-row {
            margin-bottom: 10px;
            padding: 6px 8px;
            border-radius: 6px;
            background: rgba(24, 50, 66, 0.35);
            border: 1px solid rgba(79, 169, 198, 0.08);
            transition: border-color 0.15s;
        }
        .tuning-row:hover {
            border-color: rgba(79, 169, 198, 0.22);
        }
        .tuning-row-label {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 4px;
        }
        .tuning-row-label .label-text {
            font-weight: 500;
            color: #e0eff4;
            font-size: 12px;
        }
        .tuning-row-label .value-display {
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 12px;
            color: #36d6ff;
            background: rgba(54, 214, 255, 0.08);
            padding: 1px 6px;
            border-radius: 3px;
            min-width: 55px;
            text-align: right;
        }
        .tuning-row-desc {
            color: rgba(200, 223, 230, 0.45);
            font-size: 10.5px;
            line-height: 1.35;
            margin-bottom: 5px;
        }
        .tuning-row-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .tuning-row-controls input[type="range"] {
            flex: 1;
            height: 4px;
            -webkit-appearance: none;
            appearance: none;
            background: rgba(79, 169, 198, 0.2);
            border-radius: 2px;
            outline: none;
            cursor: pointer;
        }
        .tuning-row-controls input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            background: #36d6ff;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 0 6px rgba(54, 214, 255, 0.4);
            transition: box-shadow 0.15s;
        }
        .tuning-row-controls input[type="range"]::-webkit-slider-thumb:hover {
            box-shadow: 0 0 12px rgba(54, 214, 255, 0.7);
        }
        .tuning-row-controls input[type="range"]::-moz-range-thumb {
            width: 14px;
            height: 14px;
            background: #36d6ff;
            border-radius: 50%;
            cursor: pointer;
            border: none;
            box-shadow: 0 0 6px rgba(54, 214, 255, 0.4);
        }
        .tuning-row-controls input[type="number"] {
            width: 62px;
            background: rgba(13, 30, 40, 0.8);
            border: 1px solid rgba(79, 169, 198, 0.3);
            color: #c8dfe6;
            padding: 3px 6px;
            font-size: 11px;
            font-family: 'Consolas', 'Courier New', monospace;
            border-radius: 4px;
            outline: none;
            transition: border-color 0.15s;
        }
        .tuning-row-controls input[type="number"]:focus {
            border-color: #36d6ff;
            box-shadow: 0 0 4px rgba(54, 214, 255, 0.25);
        }
        .tuning-row-controls .reset-btn {
            background: none;
            border: 1px solid rgba(255, 93, 73, 0.25);
            color: rgba(255, 93, 73, 0.6);
            padding: 2px 6px;
            font-size: 10px;
            cursor: pointer;
            border-radius: 3px;
            transition: all 0.15s;
            white-space: nowrap;
        }
        .tuning-row-controls .reset-btn:hover {
            border-color: #ff5d49;
            color: #ff5d49;
            background: rgba(255, 93, 73, 0.1);
        }
        /* toggle switch */
        .toggle-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 8px;
            margin-bottom: 6px;
            border-radius: 6px;
            background: rgba(24, 50, 66, 0.35);
            border: 1px solid rgba(79, 169, 198, 0.08);
            transition: border-color 0.15s;
        }
        .toggle-row:hover {
            border-color: rgba(79, 169, 198, 0.22);
        }
        .toggle-row .toggle-info {
            flex: 1;
        }
        .toggle-row .toggle-label {
            font-weight: 500;
            color: #e0eff4;
            font-size: 12px;
        }
        .toggle-row .toggle-desc {
            color: rgba(200, 223, 230, 0.45);
            font-size: 10px;
            line-height: 1.3;
            margin-top: 2px;
        }
        .toggle-switch {
            position: relative;
            width: 42px;
            height: 22px;
            flex-shrink: 0;
            margin-left: 12px;
        }
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255, 93, 73, 0.25);
            border: 1px solid rgba(255, 93, 73, 0.4);
            border-radius: 22px;
            transition: all 0.25s;
        }
        .toggle-slider::before {
            content: '';
            position: absolute;
            height: 16px;
            width: 16px;
            left: 2px;
            bottom: 2px;
            background: #ff5d49;
            border-radius: 50%;
            transition: all 0.25s;
        }
        .toggle-switch input:checked + .toggle-slider {
            background: rgba(54, 214, 255, 0.25);
            border-color: rgba(54, 214, 255, 0.5);
        }
        .toggle-switch input:checked + .toggle-slider::before {
            transform: translateX(20px);
            background: #36d6ff;
        }
        .tuning-row.modified .label-text {
            color: #ffd147;
        }
        .tuning-row.modified .value-display {
            color: #ffd147;
            background: rgba(255, 209, 71, 0.12);
        }
        .toggle-row.modified .toggle-label {
            color: #ffd147;
        }
        #tuning-search {
            width: calc(100% - 36px);
            margin: 8px 18px;
            padding: 6px 10px;
            background: rgba(13, 30, 40, 0.8);
            border: 1px solid rgba(79, 169, 198, 0.25);
            color: #c8dfe6;
            font-size: 12px;
            border-radius: 4px;
            outline: none;
            flex-shrink: 0;
        }
        #tuning-search:focus {
            border-color: #36d6ff;
        }
        #tuning-search::placeholder {
            color: rgba(200, 223, 230, 0.3);
        }
        .tuning-section.hidden {
            display: none;
        }
    `;
    document.head.appendChild(style);

    // ─── 容器 ─────────────────────────────────────
    const panel = document.createElement('div');
    panel.id = 'tuning-panel';
    panel.className = 'collapsed';

    // ─── 切换按钮 ──────────────────────────────────
    const toggle = document.createElement('button');
    toggle.id = 'tuning-toggle';
    toggle.textContent = '⚙ 能力调试';
    toggle.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
    });

    // ─── Header ───────────────────────────────────
    const header = document.createElement('div');
    header.id = 'tuning-header';
    header.innerHTML = `
        <h2>玩家能力调试面板</h2>
        <div class="header-btns">
            <button class="apply-btn" id="tuning-apply-local">应用到本地</button>
            <button class="export-btn" id="tuning-export">📋 导出</button>
            <button id="tuning-reset-all">🔄 全部重置</button>
        </div>
    `;
    panel.appendChild(header);

    // ─── 搜索框 ──────────────────────────────────
    const search = document.createElement('input');
    search.id = 'tuning-search';
    search.type = 'text';
    search.placeholder = '🔍 搜索参数名称或描述...';
    panel.appendChild(search);

    // ─── Body ─────────────────────────────────────
    const body = document.createElement('div');
    body.id = 'tuning-body';

    let currentSection = null;
    let currentSectionBody = null;

    const allRows = [];

    TUNING_DEFS.forEach((def) => {
        if (def.section) {
            // 新建 section
            const sectionEl = document.createElement('div');
            sectionEl.className = 'tuning-section';

            const sectionHeader = document.createElement('div');
            sectionHeader.className = 'tuning-section-header';
            sectionHeader.innerHTML = `
                <span class="section-title">${def.section}</span>
                <span class="section-arrow">▶</span>
            `;

            const sectionBody = document.createElement('div');
            sectionBody.className = 'tuning-section-body';

            sectionHeader.addEventListener('click', () => {
                sectionHeader.classList.toggle('open');
                sectionBody.classList.toggle('open');
            });

            sectionEl.appendChild(sectionHeader);

            if (def.sectionDesc) {
                const descEl = document.createElement('div');
                descEl.className = 'tuning-section-desc';
                descEl.textContent = def.sectionDesc;
                sectionEl.appendChild(descEl);
            }

            sectionEl.appendChild(sectionBody);
            body.appendChild(sectionEl);
            currentSection = sectionEl;
            currentSectionBody = sectionBody;
            return;
        }

        if (!currentSectionBody) return;

        if (def.type === 'toggle') {
            const row = createToggleRow(def);
            currentSectionBody.appendChild(row.element);
            allRows.push(row);
        } else {
            const row = createSliderRow(def);
            currentSectionBody.appendChild(row.element);
            allRows.push(row);
        }
    });

    panel.appendChild(body);
    document.body.appendChild(panel);
    document.body.appendChild(toggle);

    // ─── 搜索 ─────────────────────────────────────
    search.addEventListener('input', () => {
        const query = search.value.trim().toLowerCase();
        const sections = body.querySelectorAll('.tuning-section');
        sections.forEach((section) => {
            const rows = section.querySelectorAll('.tuning-row, .toggle-row');
            let anyVisible = false;
            rows.forEach((row) => {
                const searchText = (row.dataset.searchText || '').toLowerCase();
                const visible = !query || searchText.includes(query);
                row.style.display = visible ? '' : 'none';
                if (visible) anyVisible = true;
            });
            section.classList.toggle('hidden', !anyVisible && !!query);
            if (query && anyVisible) {
                section.querySelector('.tuning-section-header')?.classList.add('open');
                section.querySelector('.tuning-section-body')?.classList.add('open');
            }
        });
    });

    // ─── 全部重置 ──────────────────────────────────
    document.getElementById('tuning-reset-all').addEventListener('click', () => {
        Object.keys(TUNING_DEFAULTS).forEach((key) => {
            window.TUNING[key] = TUNING_DEFAULTS[key];
        });
        allRows.forEach((row) => row.sync());
    });

    document.getElementById('tuning-apply-local').addEventListener('click', () => {
        const ok = savePersistedTuning();
        if (!ok) {
            const btn = document.getElementById('tuning-apply-local');
            btn.textContent = '保存失败';
            setTimeout(() => { btn.textContent = '应用到本地'; }, 1500);
            return;
        }

        Object.keys(window.TUNING).forEach((key) => {
            TUNING_DEFAULTS[key] = window.TUNING[key];
        });
        allRows.forEach((row) => row.sync());

        const btn = document.getElementById('tuning-apply-local');
        btn.textContent = '✅ 已应用';
        setTimeout(() => { btn.textContent = '应用到本地'; }, 1500);
    });

    // ─── 导出 ──────────────────────────────────────
    document.getElementById('tuning-export').addEventListener('click', () => {
        const diff = {};
        Object.keys(window.TUNING).forEach((key) => {
            if (window.TUNING[key] !== TUNING_DEFAULTS[key]) {
                diff[key] = window.TUNING[key];
            }
        });
        const text = JSON.stringify(diff, null, 2);
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('tuning-export');
            btn.textContent = '✅ 已复制';
            setTimeout(() => { btn.textContent = '📋 导出'; }, 1500);
        }).catch(() => {
            console.log('调参差异导出:\n', text);
        });
    });

    // ─── 键盘: Tab 切换面板 ─────────────────────────
    document.addEventListener('keydown', (e) => {
        if (e.key === '`' || e.key === '~') {
            panel.classList.toggle('collapsed');
            e.preventDefault();
        }
    });
}

function createToggleRow(def) {
    const row = document.createElement('div');
    row.className = 'toggle-row';
    row.dataset.searchText = `${def.label} ${def.desc} ${def.key}`;

    const info = document.createElement('div');
    info.className = 'toggle-info';
    info.innerHTML = `
        <div class="toggle-label">${def.label}</div>
        <div class="toggle-desc">${def.desc}</div>
    `;

    const switchEl = document.createElement('label');
    switchEl.className = 'toggle-switch';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = window.TUNING[def.key];
    const slider = document.createElement('span');
    slider.className = 'toggle-slider';
    switchEl.appendChild(checkbox);
    switchEl.appendChild(slider);

    checkbox.addEventListener('change', () => {
        window.TUNING[def.key] = checkbox.checked;
        row.classList.toggle('modified', checkbox.checked !== TUNING_DEFAULTS[def.key]);
    });

    row.appendChild(info);
    row.appendChild(switchEl);

    return {
        element: row,
        sync: () => {
            checkbox.checked = window.TUNING[def.key];
            row.classList.toggle('modified', checkbox.checked !== TUNING_DEFAULTS[def.key]);
        }
    };
}

function createSliderRow(def) {
    const row = document.createElement('div');
    row.className = 'tuning-row';
    row.dataset.searchText = `${def.label} ${def.desc} ${def.key}`;

    const defaultVal = TUNING_DEFAULTS[def.key];
    const currentVal = window.TUNING[def.key];
    const decimals = def.step < 1 ? (def.step < 0.1 ? 3 : 2) : 0;

    row.innerHTML = `
        <div class="tuning-row-label">
            <span class="label-text">${def.label}</span>
            <span class="value-display">${currentVal.toFixed(decimals)}</span>
        </div>
        <div class="tuning-row-desc">${def.desc}</div>
        <div class="tuning-row-controls">
            <input type="range" min="${def.min}" max="${def.max}" step="${def.step}" value="${currentVal}">
            <input type="number" min="${def.min}" max="${def.max}" step="${def.step}" value="${currentVal}">
            <button class="reset-btn" title="重置为默认值 ${defaultVal}">↺</button>
        </div>
    `;

    const rangeInput = row.querySelector('input[type="range"]');
    const numberInput = row.querySelector('input[type="number"]');
    const valueDisplay = row.querySelector('.value-display');
    const resetBtn = row.querySelector('.reset-btn');

    const update = (val) => {
        const num = parseFloat(val);
        if (isNaN(num)) return;
        const clamped = Math.max(def.min, Math.min(def.max, num));
        window.TUNING[def.key] = clamped;
        rangeInput.value = clamped;
        numberInput.value = clamped;
        valueDisplay.textContent = clamped.toFixed(decimals);
        row.classList.toggle('modified', Math.abs(clamped - defaultVal) > def.step * 0.1);
    };

    rangeInput.addEventListener('input', () => update(rangeInput.value));
    numberInput.addEventListener('input', () => update(numberInput.value));
    numberInput.addEventListener('change', () => update(numberInput.value));
    resetBtn.addEventListener('click', () => update(defaultVal));

    return {
        element: row,
        sync: () => update(window.TUNING[def.key])
    };
}

// ─── 启动 ──────────────────────────────────────────
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildTuningPanel);
} else {
    buildTuningPanel();
}
