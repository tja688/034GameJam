/* ═══════════════════════════════════════════════════════════════
 *  调试面板  —  Player Ability Debug Panel
 *  在游戏画面上叠加一个可折叠的侧栏，暴露玩家能力与结构驱动参数
 * ═══════════════════════════════════════════════════════════════ */

const TUNING_PROFILE_PATH = 'tuning-profile.json';
const TUNING_STORAGE_KEY = 'bio-core-tuning-profile';

const TUNING_FALLBACKS = {
    // ─── 移动能力对比 ─────────────────────────────
    feelClusterBloom: 0.52,
    feelPredatorSurge: 0.62,
    feelCameraDirector: 0.68,
    feelCameraGlide: 0.74,
    feelCameraBreathing: 0.58,
    legacyAllNodesMove: true,
    enableUpgradedIntentDrive: false,
    splitPolarityIntentDrive: false,
    enableBurstIntentDrive: false,
    intentChaosDegree: 0.0,
    enableClusterVolumeControl: false,
    clusterVolumeNeutral: 0.36,
    clusterVolumeResponse: 6.5,
    clusterVolumeExpandScale: 0.72,
    clusterVolumeCompressScale: 0.32,
    clusterVolumeForwardStretch: 0.22,
    clusterVolumeLateralBloom: 0.38,
    clusterVolumeLatticePull: 18,
    clusterVolumeRestScale: 0.16,
    clusterVolumeRestClampBoost: 0.8,
    clusterVolumeRepulsionBoost: 0.45,
    clusterVolumeRepulsionCompress: 0.2,
    clusterVolumeCorePullRelax: 0.55,
    clusterVolumeInnerContract: 0.12,
    clusterVolumeCruiseLift: 0.06,
    clusterVolumePursuitLift: 0.16,
    clusterVolumeHuntLift: 0.28,
    clusterVolumeBurstAssist: 0.28,
    clusterVolumePulseReach: 0.18,
    clusterVolumeSideReach: 0.34,
    driveInnerRadiusFactor: 0.26,
    driveInnerRadiusMin: 76,
    driveMiddleRadiusFactor: 0.72,
    driveMiddleRadiusMin: 170,
    driveOuterRadiusFactor: 1.18,
    driveOuterRadiusMin: 280,
    burstPressureGain: 1.6,
    burstOutwardGain: 1.35,
    burstPointerSpeedGain: 0.72,
    burstPressureDecay: 1.15,
    burstReleaseThreshold: 1.0,
    burstReleaseDuration: 0.42,
    burstAggroBoost: 0.72,
    burstChaosBoost: 0.42,
    burstReachBoost: 0.58,
    burstStrengthBoost: 0.78,
    burstDriftBoost: 0.48,
    burstTempoBoost: 0.34,
    burstSpreadBoost: 0.28,
    burstLookAhead: 0.22,
    burstOutwardSpeedThreshold: 240,
    burstPointerSpeedThreshold: 360,

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
    autoPulseOrbCount: true,
    pulseOrbCount: 2,

    // ─── 相机 ────────────────────────────────────
    cameraDefaultZoom: 0.92,
    cameraWheelStep: 0.12,
    cameraZoomDamp: 1.7,
    cameraZoomOutDamp: 4.0,
    cameraZoomTrackDamp: 2.2,
    cameraPosDamp: 6.8,
    cameraLeadDamp: 22.0,
    cameraFocusTrackDamp: 16.0,
    cameraMouseInfluence: 0.92,
    cameraMouseLeadMax: 760,
    cameraMouseDeadZone: 72,
    cameraForwardInfluence: 0.42,
    cameraClusterTether: 0.08,
    cameraMinZoom: 0.015,
    cameraMaxZoom: 1.12,
    cameraSpanPadding: 110,
    cameraEdgePadding: 74,

    // ─── 显示平滑 ────────────────────────────────
    displayDamping: 18,
    pulseGlowDecay: 3.2,
    showDebugVisuals: false,
    showDriveRingsDebug: false,
    showDriveVectorsDebug: false,
    showCameraRigDebug: false,

    // ─── 编队跨度比例 ────────────────────────────
    formationSpanFactor: 0.16,
    maxNodeCount: 2000,
};

function cloneTuningProfile(profile) {
    return JSON.parse(JSON.stringify(profile));
}

function sanitizeTuningProfile(profile) {
    const sanitized = cloneTuningProfile(TUNING_FALLBACKS);
    if (!profile || typeof profile !== 'object') {
        return sanitized;
    }

    Object.keys(sanitized).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(profile, key)) {
            sanitized[key] = profile[key];
        }
    });
    return sanitized;
}

function loadRepoTuningProfile() {
    try {
        const request = new XMLHttpRequest();
        request.open('GET', TUNING_PROFILE_PATH, false);
        request.send(null);

        const readable = request.status === 200 || (request.status === 0 && !!request.responseText);
        if (!readable) {
            console.warn(`读取仓库调参配置失败，将回退到内置默认值: ${TUNING_PROFILE_PATH}`);
            return cloneTuningProfile(TUNING_FALLBACKS);
        }

        return sanitizeTuningProfile(JSON.parse(request.responseText));
    } catch (error) {
        console.warn(`加载仓库调参配置失败，将回退到内置默认值: ${TUNING_PROFILE_PATH}`, error);
        return cloneTuningProfile(TUNING_FALLBACKS);
    }
}

function serializeTuningProfile(profile = window.TUNING) {
    return JSON.stringify(sanitizeTuningProfile(profile), null, 2);
}

function loadPersistedTuningProfile() {
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

function savePersistedTuningProfile(profile = window.TUNING) {
    try {
        window.localStorage.setItem(TUNING_STORAGE_KEY, serializeTuningProfile(profile));
        return true;
    } catch (error) {
        console.warn('保存本地调参配置失败:', error);
        return false;
    }
}

window.TUNING = loadRepoTuningProfile();
loadPersistedTuningProfile();

// ═══════════════════════════════════════════════════════════════
//  参数定义表：key → { label, desc, min, max, step, section }
// ═══════════════════════════════════════════════════════════════

const TUNING_DEFS = [
    { category: '🕹️ 控制与驱动系统' },

    { section: '主手感总控', sectionDesc: '先拧这几个总旋钮，再进下面折叠细项微调', defaultOpen: true },
    { key: 'feelClusterBloom', label: '体积呼吸感', desc: '同时控制舒张尺度、骨架回显、排斥撑开和三圈体积抬升', min: 0, max: 1, step: 0.01 },
    { key: 'feelPredatorSurge', label: '追猎爆发感', desc: '同时控制蓄压速度、突破阈值、冲刺节奏、锚点爆发和外扩冲劲', min: 0, max: 1, step: 0.01 },
    { key: 'feelCameraDirector', label: '镜头目标感', desc: '控制鼠标意图优先级，以及镜头顾头不顾腚的程度', min: 0, max: 1, step: 0.01 },
    { key: 'feelCameraGlide', label: '稳镜丝滑度', desc: '控制去抖净化、跟镜黏性和整体高级感', min: 0, max: 1, step: 0.01 },
    { key: 'feelCameraBreathing', label: '视野呼吸感', desc: '控制默认视野、缩放上下限、构图留白和整体空间感', min: 0, max: 1, step: 0.01 },

    { section: '模式与意图控制', sectionDesc: '移动模式与玩家意图的驱动逻辑' },
    { key: 'legacyAllNodesMove', label: '全节点主动移动', desc: '默认开启。关闭后只保留主驱节点的主动移动与牵引', type: 'toggle' },
    { key: 'enableUpgradedIntentDrive', label: '升级版意图驱动', desc: '默认关闭。开启后按规模放大前压范围与推进强度', type: 'toggle' },
    { key: 'splitPolarityIntentDrive', label: '极性分驱', desc: '不同极性的节点读取不同的意图权重，强化内部器官分工感', type: 'toggle' },
    { key: 'enableBurstIntentDrive', label: '阶段爆发意图', desc: '根据鼠标与质心的真实世界距离、外甩趋势和指针速度，进入追击/爆发节奏', type: 'toggle' },
    { key: 'intentChaosDegree', label: '意图混沌度 (Hot值)', desc: '为脉冲冲刺增添随机偏移、抖动与独立性', min: 0.0, max: 1.5, step: 0.05 },

    { section: '鼠标距离圈层（展开微调）', sectionDesc: '以质心为圆心的三圈驱动范围。缩放镜头时，鼠标在世界空间的可达距离会自然改变手感。' },
    { key: 'driveInnerRadiusFactor', label: '内圈半径系数', desc: '稳定内聚圈的半径，按当前群体跨度乘算', min: 0.05, max: 0.8, step: 0.01 },
    { key: 'driveInnerRadiusMin', label: '内圈最小半径', desc: '即使小集群也保留一圈稳定内聚区', min: 20, max: 240, step: 2 },
    { key: 'driveMiddleRadiusFactor', label: '中圈半径系数', desc: '超出内圈后进入常规移动层的外边界', min: 0.2, max: 1.6, step: 0.02 },
    { key: 'driveMiddleRadiusMin', label: '中圈最小半径', desc: '小体型时仍能留出正常移动缓冲层', min: 40, max: 360, step: 2 },
    { key: 'driveOuterRadiusFactor', label: '外圈半径系数', desc: '超出这圈后明显进入捕食/追击段，并更容易触发爆发', min: 0.4, max: 2.4, step: 0.02 },
    { key: 'driveOuterRadiusMin', label: '外圈最小半径', desc: '保障大视野远甩时能迅速跨进外层捕食区', min: 80, max: 520, step: 4 },

    { section: '爆发细项（展开微调）', sectionDesc: '非线性“蓄压-追击-突破”侵略行为参数' },
    { key: 'burstPressureGain', label: '远距蓄压速率', desc: '鼠标停在远圈时，压力增长有多快', min: 0, max: 4, step: 0.05 },
    { key: 'burstOutwardGain', label: '外甩蓄压增幅', desc: '鼠标朝外猛甩时，压力额外增加多少', min: 0, max: 4, step: 0.05 },
    { key: 'burstPointerSpeedGain', label: '指针速度增压', desc: '鼠标移动速度本身对爆发的推动', min: 0, max: 2, step: 0.02 },
    { key: 'burstPressureDecay', label: '压力衰减', desc: '没有继续追逼时，蓄压回落得多快', min: 0, max: 3, step: 0.05 },
    { key: 'burstReleaseThreshold', label: '突破触发阈值', desc: '压力需要积累到多高才会真正突破', min: 0.2, max: 1.8, step: 0.02 },
    { key: 'burstReleaseDuration', label: '突破持续时间', desc: '爆发态持续多久后回落', min: 0.05, max: 1.5, step: 0.01 },
    { key: 'burstAggroBoost', label: '爆发侵略加成', desc: '额外注入到意图流的前扑侵略度', min: 0, max: 1.5, step: 0.02 },
    { key: 'burstChaosBoost', label: '爆发熵增加成', desc: '突破时给现有 Hot/混沌度加多少料', min: 0, max: 1.5, step: 0.02 },
    { key: 'burstReachBoost', label: '爆发前探加成', desc: '突破时锚点的前纵延展倍感', min: 0, max: 1.5, step: 0.02 },
    { key: 'burstStrengthBoost', label: '爆发锚定加成', desc: '突破时节点的抓地/牵引强度强化', min: 0, max: 1.5, step: 0.02 },
    { key: 'burstDriftBoost', label: '爆发漂移加成', desc: '平时推进力在追击/突破期的额外倍率', min: 0, max: 1.5, step: 0.02 },
    { key: 'burstTempoBoost', label: '爆发节奏加速', desc: '心跳/脉冲的频率提升幅度', min: 0, max: 1, step: 0.02 },
    { key: 'burstSpreadBoost', label: '爆发外扩加成', desc: '追击和突破时为体积舒张注入多少冲劲', min: 0, max: 1, step: 0.02 },
    { key: 'burstLookAhead', label: '镜头前置引导', desc: '突破时镜头往朝向前方探出多少', min: 0, max: 0.8, step: 0.01 },
    { key: 'burstOutwardSpeedThreshold', label: '外甩判定阈值', desc: '多快算是在往外猛甩鼠标', min: 40, max: 800, step: 5 },
    { key: 'burstPointerSpeedThreshold', label: '指针速度阈值', desc: '多快算高压追击手势', min: 40, max: 1200, step: 5 },

    { section: '体积细项（展开微调）', sectionDesc: '舒张/收缩改为绑定鼠标世界距离，并让结构按拓扑显形' },
    { key: 'enableClusterVolumeControl', label: '启用体积系统', desc: '根据鼠标与质心的真实世界距离，让集群在三圈之间收拢、常态和捕食舒张', type: 'toggle' },
    { key: 'clusterVolumeNeutral', label: '体积中性位', desc: '系统默认静息体积，围绕它往外舒张/向内收缩', min: 0.05, max: 0.95, step: 0.01 },
    { key: 'clusterVolumeResponse', label: '体积响应速度', desc: '体积目标追踪的快慢', min: 0.5, max: 20, step: 0.1 },
    { key: 'clusterVolumeExpandScale', label: '舒张主尺度', desc: '往外撑开时整体半径膨胀多少', min: 0, max: 2, step: 0.02 },
    { key: 'clusterVolumeCompressScale', label: '收缩主尺度', desc: '往内压缩时整体紧实多少', min: 0, max: 1, step: 0.02 },
    { key: 'clusterVolumeForwardStretch', label: '舒张前纵拉伸', desc: '舒张时沿朝向额外拉长多少', min: 0, max: 1.5, step: 0.02 },
    { key: 'clusterVolumeLateralBloom', label: '舒张侧向盛开', desc: '舒张时侧翼额外铺展开多少', min: 0, max: 2, step: 0.02 },
    { key: 'clusterVolumeLatticePull', label: '体积骨架回显力', desc: '按拓扑槽位把设计过的形状重新拉出来', min: 0, max: 80, step: 1 },
    { key: 'clusterVolumeRestScale', label: '连线静息拓展', desc: '舒张时连线自身愿意撑开的额外比例', min: 0, max: 1, step: 0.02 },
    { key: 'clusterVolumeRestClampBoost', label: '连线伸展上限加成', desc: '允许静息长度突破旧的上限多少', min: 0, max: 2, step: 0.02 },
    { key: 'clusterVolumeRepulsionBoost', label: '舒张排斥增强', desc: '舒张时节点最小间距变大的比例', min: 0, max: 2, step: 0.02 },
    { key: 'clusterVolumeRepulsionCompress', label: '收缩排斥减弱', desc: '收缩时节点更愿意贴近多少', min: 0, max: 0.8, step: 0.02 },
    { key: 'clusterVolumeCorePullRelax', label: '舒张解束核心', desc: '舒张时削弱核心收束力，防止又被拽回去', min: 0, max: 1, step: 0.02 },
    { key: 'clusterVolumeInnerContract', label: '内圈收缩压强', desc: '鼠标回到质心附近时，自动向收拢态压回多少', min: 0, max: 0.5, step: 0.01 },
    { key: 'clusterVolumeCruiseLift', label: '中圈体积抬升', desc: '常规移动圈层会比静息体积轻微撑开多少', min: 0, max: 0.3, step: 0.01 },
    { key: 'clusterVolumePursuitLift', label: '外圈体积抬升', desc: '进入外圈追击段后，体积额外舒张多少', min: 0, max: 0.6, step: 0.01 },
    { key: 'clusterVolumeHuntLift', label: '捕食体积抬升', desc: '越过外圈进入捕食模式后，再追加多少膨胀', min: 0, max: 0.8, step: 0.01 },
    { key: 'clusterVolumeBurstAssist', label: '爆发自动舒张', desc: '追击/突破时给体积自动加多少临时外扩', min: 0, max: 1, step: 0.02 },
    { key: 'clusterVolumePulseReach', label: '舒张前探增幅', desc: '舒张后脉冲锚点前探还能再多走一点', min: 0, max: 1, step: 0.02 },
    { key: 'clusterVolumeSideReach', label: '舒张侧撑增幅', desc: '舒张后脉冲锚点侧向更能把阵型撑出来', min: 0, max: 1.5, step: 0.02 },

    { section: '脉冲循环与触发', sectionDesc: '决定了组织体的“心跳”与驱动节奏' },
    { key: 'enablePulse', label: '脉冲全局开关', desc: '整个脉冲循环系统；关掉后不会有节点触发', type: 'toggle' },
    { key: 'autoPulseOrbCount', label: '自动脉冲球数量', desc: '根据节点数(每多10节点+1)自动计算并限制系统内的球数并维持默认基础。', type: 'toggle' },
    { key: 'pulseOrbCount', label: '手动脉冲球数', desc: '强制覆盖当前系统的球数。一旦手动改动会立刻关闭自动数量控制。', min: 1, max: 20, step: 1 },

    { section: '操作方向与手感', sectionDesc: 'WASD 移动权重与鼠标朝向跟随' },
    { key: 'normalMoveWeight', label: '普通模式移动权重', desc: '松开 Shift 时 WASD 占比 (0~1)', min: 0, max: 1, step: 0.01 },
    { key: 'shiftMoveWeight', label: '瞄准模式移动权重', desc: '按住 Shift 时 WASD 占比 (0~1)', min: 0, max: 1, step: 0.01 },
    { key: 'baseTurnRate', label: '基础转向速率', desc: '结构朝向旋转速率 (rad/s)', min: 0, max: 10, step: 0.1 },
    { key: 'turnAssistBonus', label: '转向辅助加成', desc: '特定节点提供的额外转向速率', min: 0, max: 8, step: 0.1 },

    { category: '🔧 物理与运动约束' },

    { section: '全局物理力场', sectionDesc: '决定全局运动物理反馈的各项基本力' },
    { key: 'enableFormationPull', label: '旧编队拉回', desc: '旧范式遗留：把节点拉回黄金角槽位', type: 'toggle' },
    { key: 'enableDrift', label: '漂移推进力', desc: '引擎：控制 WASD 向结构的直接推力', type: 'toggle' },
    { key: 'enableCorePull', label: '核心收束力开关', desc: '对圆形核心节点的收束倾向', type: 'toggle' },
    { key: 'enableAnchor', label: '脉冲牵引力', desc: '节点被脉冲锁定时向锚点移动', type: 'toggle' },
    { key: 'enableSpring', label: '弹簧相连力', desc: '节点间互相牵扯连接', type: 'toggle' },
    { key: 'enableRepulsion', label: '体积排斥力', desc: '防止节点重叠叠加', type: 'toggle' },
    { key: 'enablePBD', label: 'PBD位置校正', desc: '针对大网格防止散架的高级保形', type: 'toggle' },

    { section: '阻尼与状态衰减', sectionDesc: '结构沉重感及持续状态的自然降低' },
    { key: 'dragAnchored', label: '锚定态阻力', desc: '节点被锚定时速度下降率', min: 0, max: 20, step: 0.1 },
    { key: 'dragFreeBase', label: '自由态阻力', desc: '基础的速度下降率', min: 0, max: 20, step: 0.1 },
    { key: 'dragStabilityBonus', label: '稳定态阻力加成', desc: '稳定性越高越显得重', min: 0, max: 5, step: 0.1 },
    { key: 'tensionDecay', label: '张力衰减', desc: '每帧张力消散率', min: 0, max: 1, step: 0.01 },
    { key: 'stabilityDecay', label: 'stability 衰减/秒', desc: '稳定性减少衰减', min: 0, max: 2, step: 0.05 },
    { key: 'stabilityMin', label: 'stability 最低值', desc: '稳定性保底下限', min: 0, max: 1, step: 0.05 },
    { key: 'turnAssistDecay', label: 'turnAssist 衰减/秒', desc: '辅助能力衰减', min: 0, max: 5, step: 0.1 },
    { key: 'tempoBoostDecay', label: 'tempoBoost 衰减/秒', desc: '加速能力衰减', min: 0, max: 5, step: 0.1 },
    { key: 'agitationDecay', label: 'agitation 衰减/秒', desc: '暴躁度衰减', min: 0, max: 3, step: 0.1 },

    { section: '节点排斥体积系统', sectionDesc: '短距离体积碰撞效果' },
    { key: 'repulsionMinDist', label: '基础最小间距', desc: '最近距离限制 (px)', min: 20, max: 200, step: 2 },
    { key: 'repulsionDegreeMax', label: '连接度间距加成', desc: '密集连接带来多大程度散开', min: 0, max: 60, step: 1 },
    { key: 'repulsionDegreeScale', label: '连接度加成系数', desc: '每单位连接引发的间距附加', min: 0, max: 5, step: 0.1 },
    { key: 'repulsionStiffness', label: '排斥刚度', desc: '重叠引发推力的刚烈度', min: 0, max: 80, step: 1 },

    { section: 'PBD 大网格结构强保形', sectionDesc: '防止复杂结构在剧烈运动中被扯烂' },
    { key: 'pbdIterations', label: '基础迭代步数', desc: '所有约束校正轮数', min: 0, max: 12, step: 1 },
    { key: 'pbdCorrectionRate', label: '每次修正比例', desc: '修正率0-100%', min: 0, max: 0.8, step: 0.01 },
    { key: 'pbdRigidPasses', label: '骨架强约束轮数', desc: '强化关键支撑结构的维持', min: 0, max: 8, step: 1 },

    { category: '🕸️ 多形态连线系统' },

    { section: '基本弹簧与阻尼', sectionDesc: '整体弹簧连接的基础刚性与拉力' },
    { key: 'springK', label: '基础弹簧K', desc: '核心弹射力度', min: 0, max: 800, step: 5 },
    { key: 'springDamping', label: '基础阻尼C', desc: '震荡消减度', min: 0, max: 200, step: 1 },
    { key: 'linkRestMin', label: '连线最短距离', desc: '弹簧下限界限', min: 20, max: 200, step: 2 },
    { key: 'linkRestMax', label: '连线最长距离', desc: '弹簧上限界限', min: 100, max: 500, step: 5 },
    { key: 'spineStiffness', label: '骨干刚度系数', desc: '中心主干边硬度', min: 0, max: 2, step: 0.01 },
    { key: 'spineDamping', label: '骨干阻尼系数', desc: '中心主干边粘度', min: 0, max: 1, step: 0.01 },
    { key: 'supportStiffness', label: '辅助刚度系数', desc: '外围边硬度', min: 0, max: 2, step: 0.01 },
    { key: 'supportDamping', label: '辅助阻尼系数', desc: '外围边粘度', min: 0, max: 1, step: 0.01 },
    { key: 'supportSoftness', label: '辅助线放松度', desc: '默认容差', min: 0.5, max: 2.0, step: 0.01 },

    { section: '多重堆叠连线级联', sectionDesc: '双线与多线的动态物理强化' },
    { key: 'flexStiffness', label: '1级: 触须刚度', desc: '单线软连接时的衰减', min: 0, max: 1, step: 0.01 },
    { key: 'flexDamping', label: '1级: 触须阻尼', desc: '单线的易拽动度', min: 0, max: 1, step: 0.01 },
    { key: 'flexStretchSlack', label: '1级: 容忍延伸', desc: '彻底拉扯前的容许缓冲区', min: 0, max: 120, step: 1 },
    { key: 'flexPbdWeight', label: '1级: PBD比重', desc: '多线校正时这根线的发言权', min: 0, max: 1, step: 0.01 },
    
    { key: 'jointStiffness', label: '2级: 关节刚度', desc: '双线形成铰链时的强度', min: 0, max: 2, step: 0.01 },
    { key: 'jointDamping', label: '2级: 关节阻尼', desc: '铰链的稳定性', min: 0, max: 2, step: 0.01 },
    { key: 'jointStretchSlack', label: '2级: 关节断层', desc: '微小拉伸容许度', min: 0, max: 80, step: 1 },
    { key: 'jointPbdWeight', label: '2级: PBD比重', desc: '维持框架的话语权', min: 0, max: 2, step: 0.01 },

    { key: 'rigidStiffness', label: '3级: 硬骨刚度', desc: '三线即以上绑死结构的惊人硬度', min: 0.5, max: 5, step: 0.05 },
    { key: 'rigidDamping', label: '3级: 硬骨阻尼', desc: '避免结构因过高K而震飞崩溃', min: 0.5, max: 3, step: 0.05 },
    { key: 'rigidStretchSlack', label: '3级: 零容忍', desc: '越级逼近0，毫无松弛感', min: 0, max: 20, step: 0.5 },
    { key: 'rigidPbdWeight', label: '3级: 强制保形', desc: '位置解算绝对主导地位', min: 0.5, max: 5, step: 0.05 },

    { section: '异极混合连线', sectionDesc: '不同极性的节点混编时的结构相性差异' },
    { key: 'inversePolarityStiffnessMul', label: '异极刚度', desc: '异极节点的连线会更松弛软塌', min: 0, max: 1.5, step: 0.01 },
    { key: 'inversePolarityDampingMul', label: '互斥极性阻尼', desc: '更易发生非同频震荡', min: 0, max: 1.5, step: 0.01 },
    { key: 'samePolarityRestMul', label: '同相长度拓展', desc: '同型组网的距离调节', min: 0.5, max: 2.0, step: 0.01 },
    { key: 'inversePolarityRestMul', label: '排斥长度拓展', desc: '异极性结构之间撑得更开', min: 0.5, max: 2.0, step: 0.01 },

    { category: '🧬 各节点个体属性与植入' },

    { section: '各单位质量(Mass)', sectionDesc: '决定了它们响应系统施力的速度反应(a=F/m)' },
    { key: 'massShell', label: 'Shell 护盾质量', desc: '笨重防御方块', min: 0.1, max: 5, step: 0.05 },
    { key: 'massBlade', label: 'Blade 近战质量', desc: '重击斩首三角', min: 0.1, max: 5, step: 0.05 },
    { key: 'massDefault', label: '基础单元质量', desc: '圆与远射三角基准', min: 0.1, max: 5, step: 0.05 },

    { section: '日常推流力 (Drift)', sectionDesc: '玩家不使用冲刺时，平时移动自带推力差异' },
    { key: 'driftShell', label: 'Shell 护盾拖拽', desc: '提供缓慢且巨大的阻挡阻力/慢速推力', min: 0, max: 200, step: 1 },
    { key: 'driftAttack', label: 'Blade/Dart 引擎', desc: '三角战斗单位赋予组织高推力机动', min: 0, max: 200, step: 1 },
    { key: 'driftDefault', label: '基础推力分配', desc: '常规补位力量', min: 0, max: 200, step: 1 },
    { key: 'corePullStrength', label: '收束聚集', desc: '维持圆形在网格中心不被抛出来的强聚拢', min: 0, max: 100, step: 1 },

    { section: '🟦 Source (圆/本)', sectionDesc: '平滑基础核心' },
    { key: 'plantSourceForward', label: '前纵延展', desc: '植入推前多少px', min: 0, max: 300, step: 2 },
    { key: 'plantSourceSide', label: '侧方位展', desc: '左右扩张分布宽度', min: 0, max: 300, step: 2 },
    { key: 'plantSourceStance', label: '生根时长', desc: '牢牢钉在环境上发劲多久(秒)', min: 0, max: 2, step: 0.02 },
    { key: 'plantSourceStrength', label: '牵引冲爆发', desc: '基础强度爆发力', min: 0, max: 800, step: 10 },

    { section: '🟥 Compressor (圆/反)', sectionDesc: '能量过载引擎' },
    { key: 'plantCompressorForward', label: '前纵延展', desc: '-', min: 0, max: 300, step: 2 },
    { key: 'plantCompressorSide', label: '侧方位展', desc: '-', min: 0, max: 300, step: 2 },
    { key: 'plantCompressorStance', label: '生根时长', desc: '-', min: 0, max: 2, step: 0.02 },
    { key: 'plantCompressorStrength', label: '牵引冲爆发', desc: '强爆发弹射加速', min: 0, max: 800, step: 10 },

    { section: '🟦 Shell (方/本)', sectionDesc: '巨盾防护偏侧' },
    { key: 'plantShellForward', label: '前纵延展', desc: '几乎不往前，主防护', min: 0, max: 300, step: 2 },
    { key: 'plantShellSide', label: '侧方位展', desc: '极限侧撑扩张屏障横波', min: 0, max: 400, step: 2 },
    { key: 'plantShellStance', label: '生根时长', desc: '长停留扛伤掩护', min: 0, max: 2, step: 0.02 },
    { key: 'plantShellStrength', label: '牵引冲爆发', desc: '无坚不摧的抗拉', min: 0, max: 1000, step: 10 },
    { key: 'plantShellFlowBias', label: 'Flow权重比', desc: '面向移动的占比', min: 0, max: 1, step: 0.02 },
    { key: 'plantShellAimBias', label: 'Aim权重比', desc: '面向瞄准的占比', min: 0, max: 1, step: 0.02 },

    { section: '🟥 Prism (方/反)', sectionDesc: '辅助折射指挥' },
    { key: 'plantPrismForward', label: '前纵延展', desc: '-', min: 0, max: 300, step: 2 },
    { key: 'plantPrismSide', label: '侧方位展', desc: '-', min: 0, max: 300, step: 2 },
    { key: 'plantPrismStance', label: '生根时长', desc: '-', min: 0, max: 2, step: 0.02 },
    { key: 'plantPrismStrength', label: '牵引冲爆发', desc: '-', min: 0, max: 800, step: 10 },
    { key: 'plantPrismFlowBias', label: 'Flow权重比', desc: '-', min: 0, max: 1, step: 0.02 },
    { key: 'plantPrismAimBias', label: 'Aim权重比', desc: '-', min: 0, max: 1, step: 0.02 },

    { section: '🟦 Dart (三角/本)', sectionDesc: '远程火力齐射兵' },
    { key: 'plantDartForward', label: '前纵延展', desc: '远程长刺入', min: 0, max: 400, step: 2 },
    { key: 'plantDartSide', label: '侧方位展', desc: '-', min: 0, max: 300, step: 2 },
    { key: 'plantDartStance', label: '生根时长', desc: '-', min: 0, max: 2, step: 0.02 },
    { key: 'plantDartStrength', label: '牵引冲爆发', desc: '-', min: 0, max: 800, step: 10 },
    { key: 'plantDartFlowBias', label: 'Flow权重比', desc: '-', min: 0, max: 1, step: 0.02 },
    { key: 'plantDartAimBias', label: 'Aim权重比', desc: '极其重视鼠标朝向', min: 0, max: 1, step: 0.02 },

    { section: '🟥 Blade (三角/反)', sectionDesc: '近战极限冲锋兵' },
    { key: 'plantBladeForward', label: '前纵延展', desc: '极限前突突进打击', min: 0, max: 400, step: 2 },
    { key: 'plantBladeSide', label: '侧方位展', desc: '阵型锋利收窄', min: 0, max: 300, step: 2 },
    { key: 'plantBladeStance', label: '生根时长', desc: '快出快回斩落', min: 0, max: 2, step: 0.02 },
    { key: 'plantBladeStrength', label: '牵引冲爆发', desc: '最可怕的攻击驱动', min: 0, max: 1000, step: 10 },
    { key: 'plantBladeFlowBias', label: 'Flow权重比', desc: '-', min: 0, max: 1, step: 0.02 },
    { key: 'plantBladeAimBias', label: 'Aim权重比', desc: '-', min: 0, max: 1, step: 0.02 },

    { category: '🎥 视觉呈现与结构扩建' },

    { section: '拓扑结构基底分布', sectionDesc: '当有新细胞生长与加入时的基建布局指导' },
    { key: 'maxNodeCount', label: '最大节点数量限制', desc: '限制玩家可拥有的最大节点总数', min: 1, max: 2000, step: 1 },
    { key: 'enableCompoundTopologyEdges', label: '复合连线允许', desc: '打开后结构网不再强制规整，可多重叠加韧带', type: 'toggle' },
    { key: 'enableSunflowerTopologySlots', label: '向日葵槽位', desc: '退回老版整齐环列的黄金角分布律', type: 'toggle' },
    { key: 'slotSpacing', label: '基础散件距离', desc: '生成骨架之间初始缝隙(不等于最终拉扯弹性长度)', min: 40, max: 250, step: 2 },
    { key: 'slotYCompression', label: '前后侧轴压缩', desc: '做扁长或圆阵', min: 0.3, max: 1.5, step: 0.02 },
    { key: 'slotRadiusScale', label: '结构网半径倍缩', desc: '调整全体胖瘦', min: 0.3, max: 2, step: 0.02 },
    { key: 'forwardStep', label: '前探延展间隔', desc: '', min: 20, max: 200, step: 2 },
    
    { section: '弃用老旧编队规则', sectionDesc: '老一套硬套座标方案残留' },
    { key: 'formationPullAnchored', label: '锚定硬拉力度', desc: '-', min: 0, max: 200, step: 1 },
    { key: 'formationPullFreeBase', label: '脱机硬拉力度', desc: '-', min: 0, max: 300, step: 1 },
    { key: 'formationPullStabilityBonus', label: '稳定态强拉成', desc: '-', min: 0, max: 100, step: 1 },
    { key: 'formationSpanFactor', label: '编队跨度延伸比', desc: '大组织自动更拉长前伸力', min: 0, max: 0.5, step: 0.01 },

    { section: '镜头高级细项（折叠）', sectionDesc: '默认先拧上面的 3 个主旋钮。这里是高级细调，谨慎修改。', defaultOpen: false },
    { key: 'cameraDefaultZoom', label: '默认镜头缩放', desc: '开局或重置时的默认镜头大小', min: 0.05, max: 2.4, step: 0.01 },
    { key: 'cameraWheelStep', label: '滚轮缩放步进', desc: '每个滚轮刻度让镜头缩放变化多少，指数式响应', min: 0.01, max: 0.35, step: 0.01 },
    { key: 'cameraZoomDamp', label: '贴近阻尼', desc: '滚轮把镜头往近处拉时，镜头追到目标缩放的速度', min: 0.4, max: 6, step: 0.05 },
    { key: 'cameraZoomOutDamp', label: '拉远阻尼', desc: '滚轮把镜头往远处推时，镜头追到目标缩放的速度', min: 0.4, max: 10, step: 0.05 },
    { key: 'cameraZoomTrackDamp', label: '缩放目标跟踪', desc: '镜头对滚轮目标缩放的基础反应速度，稳定时越低越稳', min: 0.3, max: 8, step: 0.05 },
    { key: 'cameraPosDamp', label: '镜头主体跟随', desc: '镜头本体追到目标焦点的速度', min: 1, max: 8, step: 0.05 },
    { key: 'cameraLeadDamp', label: '鼠标偏移净化', desc: '先把鼠标意图净化成干净偏移，再交给镜头去跟。想要更敏捷就往高调。', min: 2, max: 32, step: 0.1 },
    { key: 'cameraFocusTrackDamp', label: '焦点净化', desc: '焦点目标二次滤波，越高越利落，越低越漂', min: 2, max: 24, step: 0.1 },
    { key: 'cameraMouseInfluence', label: '鼠标偏移权重', desc: '镜头偏移有多听鼠标的。现在允许调到非常明显。', min: 0, max: 2.4, step: 0.02 },
    { key: 'cameraMouseLeadMax', label: '鼠标构图偏移上限', desc: '鼠标能把集群压离屏幕中心多少像素，越高越容易把整体压到左/右构图区', min: 40, max: 1400, step: 10 },
    { key: 'cameraMouseDeadZone', label: '鼠标静区半径', desc: '屏幕中心附近多大范围内镜头不急着偏。想要更灵敏就往小调。', min: 0, max: 320, step: 2 },
    { key: 'cameraForwardInfluence', label: '前锋越中线偏置', desc: '允许前锋部队相对整体更接近屏幕中心的程度', min: 0, max: 1.2, step: 0.01 },
    { key: 'cameraClusterTether', label: '集群牵引', desc: '集群很大时，镜头被体积中心拉回多少。想要更浓的前探味道就往小调。', min: 0, max: 0.4, step: 0.01 },
    { key: 'cameraMinZoom', label: '最远视野', desc: '镜头最多允许拉到多远（越小越远）', min: 0.01, max: 0.4, step: 0.005 },
    { key: 'cameraMaxZoom', label: '最近视野', desc: '镜头最多能贴到多近（越大越近）', min: 0.5, max: 3, step: 0.02 },
    { key: 'cameraSpanPadding', label: '主体构图缓冲', desc: '计算镜头构图基准时，围绕集群本体额外留多少世界空间', min: 0, max: 300, step: 5 },
    { key: 'cameraEdgePadding', label: '屏幕边缘留白', desc: '屏幕四周预留多少像素边距', min: 0, max: 160, step: 2 },

    { section: '渲染后期平滑', sectionDesc: '抽离物理层和绘制层，使之无断层表现' },
    { key: 'displayDamping', label: '骨架拟合插值率', desc: '越低越拖出果冻物理粘丝缓冲感', min: 1, max: 60, step: 1 },
    { key: 'pulseGlowDecay', label: '脉冲亮光淡出', desc: '-', min: 0.5, max: 10, step: 0.1 },

    { category: '🧪 调试可视化' },

    { section: '大调试栏目', sectionDesc: '统一查看鼠标距离圈层、移动趋势和镜头前探。总开关关掉后，下面所有可视化都会停用。', defaultOpen: true },
    { key: 'showDebugVisuals', label: '启用调试可视化', desc: '统一开启下方所有调试图层的渲染能力', type: 'toggle' },
    { key: 'showDriveRingsDebug', label: '显示三圈与指针', desc: '显示内圈/中圈/外圈、指针位置与当前圈层状态', type: 'toggle' },
    { key: 'showDriveVectorsDebug', label: '显示移动趋势', desc: '显示 WASD、鼠标瞄准和综合 Flow 的运动趋势向量', type: 'toggle' },
    { key: 'showCameraRigDebug', label: '显示镜头连线', desc: '显示当前镜头中心、镜头目标焦点、基准焦点与集群质心的连线关系', type: 'toggle' }
];

const TUNING_DEF_BY_KEY = Object.fromEntries(
    TUNING_DEFS
        .filter((def) => def && def.key)
        .map((def) => [def.key, def])
);

const COMPOSITE_TUNING_MAPS = {
    feelClusterBloom: [
        { key: 'clusterVolumeExpandScale', min: 0.40, max: 1.05 },
        { key: 'clusterVolumeCompressScale', min: 0.14, max: 0.50 },
        { key: 'clusterVolumeForwardStretch', min: 0.08, max: 0.42 },
        { key: 'clusterVolumeLateralBloom', min: 0.12, max: 0.75 },
        { key: 'clusterVolumeLatticePull', min: 8, max: 30 },
        { key: 'clusterVolumeRestScale', min: 0.06, max: 0.28 },
        { key: 'clusterVolumeRepulsionBoost', min: 0.18, max: 0.82 },
        { key: 'clusterVolumeCorePullRelax', min: 0.25, max: 0.78 },
        { key: 'clusterVolumeInnerContract', min: 0.06, max: 0.22 },
        { key: 'clusterVolumeCruiseLift', min: 0.02, max: 0.10 },
        { key: 'clusterVolumePursuitLift', min: 0.08, max: 0.26 },
        { key: 'clusterVolumeHuntLift', min: 0.12, max: 0.40 },
        { key: 'clusterVolumeBurstAssist', min: 0.10, max: 0.48 },
        { key: 'clusterVolumePulseReach', min: 0.08, max: 0.32 },
        { key: 'clusterVolumeSideReach', min: 0.12, max: 0.58 }
    ],
    feelPredatorSurge: [
        { key: 'driveInnerRadiusFactor', min: 0.34, max: 0.18 },
        { key: 'driveMiddleRadiusFactor', min: 0.90, max: 0.58 },
        { key: 'driveOuterRadiusFactor', min: 1.36, max: 0.96 },
        { key: 'burstPressureGain', min: 0.90, max: 2.40 },
        { key: 'burstOutwardGain', min: 0.80, max: 2.10 },
        { key: 'burstPointerSpeedGain', min: 0.30, max: 1.10 },
        { key: 'burstPressureDecay', min: 1.45, max: 0.65 },
        { key: 'burstReleaseThreshold', min: 1.18, max: 0.70 },
        { key: 'burstReleaseDuration', min: 0.28, max: 0.58 },
        { key: 'burstAggroBoost', min: 0.35, max: 1.00 },
        { key: 'burstChaosBoost', min: 0.14, max: 0.70 },
        { key: 'burstReachBoost', min: 0.20, max: 0.85 },
        { key: 'burstStrengthBoost', min: 0.28, max: 1.00 },
        { key: 'burstDriftBoost', min: 0.10, max: 0.70 },
        { key: 'burstTempoBoost', min: 0.08, max: 0.55 },
        { key: 'burstSpreadBoost', min: 0.10, max: 0.45 },
        { key: 'burstLookAhead', min: 0.08, max: 0.32 }
    ],
    feelCameraDirector: [
        { key: 'cameraMouseInfluence', min: 0.30, max: 1.75 },
        { key: 'cameraMouseLeadMax', min: 220, max: 1120 },
        { key: 'cameraMouseDeadZone', min: 150, max: 4 },
        { key: 'cameraForwardInfluence', min: 0.14, max: 0.78 },
        { key: 'cameraClusterTether', min: 0.18, max: 0.02 },
        { key: 'cameraFocusTrackDamp', min: 6.2, max: 14.4 },
        { key: 'cameraPosDamp', min: 3.8, max: 6.8 }
    ],
    feelCameraGlide: [
        { key: 'cameraLeadDamp', min: 8.4, max: 22.0 },
        { key: 'cameraFocusTrackDamp', min: 6.4, max: 16.0 },
        { key: 'cameraPosDamp', min: 3.4, max: 6.8 },
        { key: 'cameraZoomTrackDamp', min: 3.0, max: 1.6 },
        { key: 'cameraZoomDamp', min: 2.3, max: 1.2 },
        { key: 'cameraZoomOutDamp', min: 5.0, max: 3.0 }
    ],
    feelCameraBreathing: [
        { key: 'cameraDefaultZoom', min: 1.12, max: 0.76 },
        { key: 'cameraSpanPadding', min: 70, max: 160 },
        { key: 'cameraEdgePadding', min: 42, max: 92 },
        { key: 'cameraMinZoom', min: 0.05, max: 0.015 },
        { key: 'cameraMaxZoom', min: 1.24, max: 1.04 },
        { key: 'cameraClusterTether', min: 0.08, max: 0.18 }
    ]
};

function roundTuningValue(value, step = 0.01) {
    if (!Number.isFinite(step) || step <= 0) {
        return value;
    }
    const precision = step >= 1 ? 0 : step >= 0.1 ? 2 : 3;
    return Number((Math.round(value / step) * step).toFixed(precision));
}

function applyCompositeTuning(masterKey, value, allRows = []) {
    const targets = COMPOSITE_TUNING_MAPS[masterKey];
    if (!targets) {
        return;
    }

    const t = Math.max(0, Math.min(1, value));
    const affectedKeys = [];
    targets.forEach((target) => {
        const def = TUNING_DEF_BY_KEY[target.key];
        if (!def) {
            return;
        }
        const raw = target.min + (target.max - target.min) * t;
        const next = roundTuningValue(
            Math.max(def.min, Math.min(def.max, raw)),
            target.step ?? def.step
        );
        window.TUNING[target.key] = next;
        affectedKeys.push(target.key);
    });

    allRows.forEach((row) => {
        if (affectedKeys.includes(row.key)) {
            row.sync();
        }
    });
}


// ═══════════════════════════════════════════════════════════════
//  当前默认基线：优先使用本地已应用配置，否则回退到 tuning-profile.json
// ═══════════════════════════════════════════════════════════════
const TUNING_DEFAULTS = cloneTuningProfile(window.TUNING);

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
            flex-wrap: wrap;
            justify-content: flex-end;
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
        
        .tuning-category-container {
            margin-top: 10px;
        }
        .tuning-category {
            margin: 6px 0 2px;
            padding: 10px 18px 6px;
            font-size: 14px;
            font-weight: bold;
            color: #ffca28;
            border-bottom: 2px solid rgba(255, 202, 40, 0.3);
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            transition: background 0.15s;
        }
        .tuning-category:hover {
            background: rgba(255, 202, 40, 0.08);
        }
        .tuning-category .category-title {
            letter-spacing: 0.5px;
        }
        .tuning-category .category-arrow {
            color: #ffca28;
            transition: transform 0.2s;
            font-size: 12px;
            opacity: 0.8;
        }
        .tuning-category.open .category-arrow {
            transform: rotate(90deg);
        }
        .tuning-category-body {
            display: none;
        }
        .tuning-category-body.open {
            display: block;
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
        <h2>调试面板</h2>
        <div class="header-btns">
            <button id="tuning-add-node" style="background: rgba(54, 214, 255, 0.12); border-color: rgba(54, 214, 255, 0.35); color: #36d6ff; padding: 4px 12px; font-size: 11px; cursor: pointer; border-radius: 4px; transition: all 0.15s;">➕ 新增节点 (E)</button>
            <button class="apply-btn" id="tuning-apply-local">应用到本地</button>
            <button class="export-btn" id="tuning-copy-json">📋 复制 JSON</button>
            <button class="export-btn" id="tuning-export">📋 复制差异</button>
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
    
    // UI State Persistence
    const UI_STATE_KEY = 'bio-core-tuning-ui-state';
    let uiState = { categories: {}, sections: {} };
    try {
        const stored = window.localStorage.getItem(UI_STATE_KEY);
        if (stored) uiState = { categories: {}, sections: {}, ...JSON.parse(stored) };
    } catch(e) {}
    
    const saveUiState = () => {
        try { window.localStorage.setItem(UI_STATE_KEY, JSON.stringify(uiState)); } catch(e) {}
    };

    let currentCategoryBody = body; // default to body if no category

    TUNING_DEFS.forEach((def) => {
        
        if (def.category) {
            const catContainer = document.createElement('div');
            catContainer.className = 'tuning-category-container';
            
            const catHeader = document.createElement('div');
            catHeader.className = 'tuning-category';
            const isOpen = uiState.categories[def.category] !== false; // def open
            
            catHeader.innerHTML = `
                <span class="category-title">${def.category}</span>
                <span class="category-arrow">▶</span>
            `;
            
            const catBody = document.createElement('div');
            catBody.className = 'tuning-category-body';
            
            if (isOpen) {
                catHeader.classList.add('open');
                catBody.classList.add('open');
            }
            
            catHeader.addEventListener('click', () => {
                const isNowOpen = catHeader.classList.toggle('open');
                catBody.classList.toggle('open');
                uiState.categories[def.category] = isNowOpen;
                saveUiState();
            });
            
            catContainer.appendChild(catHeader);
            catContainer.appendChild(catBody);
            body.appendChild(catContainer);
            
            currentCategoryBody = catBody;
            return;
        }
        
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

            const isSecOpen = Object.prototype.hasOwnProperty.call(uiState.sections, def.section)
                ? uiState.sections[def.section] === true
                : !!def.defaultOpen;
            if (isSecOpen) {
                sectionHeader.classList.add('open');
                sectionBody.classList.add('open');
            }
            sectionHeader.addEventListener('click', () => {
                const isNowOpen = sectionHeader.classList.toggle('open');
                sectionBody.classList.toggle('open');
                uiState.sections[def.section] = isNowOpen;
                saveUiState();
            });

            sectionEl.appendChild(sectionHeader);

            if (def.sectionDesc) {
                const descEl = document.createElement('div');
                descEl.className = 'tuning-section-desc';
                descEl.textContent = def.sectionDesc;
                sectionEl.appendChild(descEl);
            }

            sectionEl.appendChild(sectionBody);
            currentCategoryBody.appendChild(sectionEl);
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
            const row = createSliderRow(def, allRows);
            currentSectionBody.appendChild(row.element);
            allRows.push(row);
        }
    });

    panel.appendChild(body);
    document.body.appendChild(panel);
    document.body.appendChild(toggle);

    // ─── 搜索 ─────────────────────────────────────
    
    setInterval(() => {
        if (window.TUNING.autoPulseOrbCount) {
             const orbRow = allRows.find(r => r.key === 'pulseOrbCount');
             if (orbRow) {
                 orbRow.sync(); // sync display with current auto value
             }
        }
    }, 500);

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
    document.getElementById('tuning-add-node').addEventListener('mousedown', () => { if (window.activeScene) window.activeScene.addDebugNode(); });

    document.getElementById('tuning-reset-all').addEventListener('click', () => {
        Object.keys(TUNING_DEFAULTS).forEach((key) => {
            window.TUNING[key] = TUNING_DEFAULTS[key];
        });
        allRows.forEach((row) => row.sync());
    });

    document.getElementById('tuning-apply-local').addEventListener('click', () => {
        const btn = document.getElementById('tuning-apply-local');
        const ok = savePersistedTuningProfile();
        if (!ok) {
            btn.textContent = '保存失败';
            setTimeout(() => { btn.textContent = '应用到本地'; }, 1500);
            return;
        }

        Object.keys(TUNING_DEFAULTS).forEach((key) => {
            TUNING_DEFAULTS[key] = window.TUNING[key];
        });
        allRows.forEach((row) => row.sync());

        btn.textContent = '✅ 已应用';
        setTimeout(() => { btn.textContent = '应用到本地'; }, 1500);
    });

    document.getElementById('tuning-copy-json').addEventListener('click', () => {
        const btn = document.getElementById('tuning-copy-json');
        const text = serializeTuningProfile();
        navigator.clipboard.writeText(text).then(() => {
            btn.textContent = '✅ 已复制';
            setTimeout(() => { btn.textContent = '📋 复制 JSON'; }, 1500);
        }).catch(() => {
            console.log('完整调参配置 JSON:\n', text);
            btn.textContent = '见控制台';
            setTimeout(() => { btn.textContent = '📋 复制 JSON'; }, 1500);
        });
    });

    // ─── 导出差异 ───────────────────────────────────
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
            setTimeout(() => { btn.textContent = '📋 复制差异'; }, 1500);
        }).catch(() => {
            console.log('调参差异导出:\n', text);
            const btn = document.getElementById('tuning-export');
            btn.textContent = '见控制台';
            setTimeout(() => { btn.textContent = '📋 复制差异'; }, 1500);
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
        if (def.key === 'autoPulseOrbCount' && checkbox.checked) {
             // Game will auto-update orb count in next frame
        }
        row.classList.toggle('modified', checkbox.checked !== TUNING_DEFAULTS[def.key]);
    });

    row.appendChild(info);
    row.appendChild(switchEl);

    return {
        element: row,
        key: def.key, sync: () => {
            checkbox.checked = window.TUNING[def.key];
            row.classList.toggle('modified', checkbox.checked !== TUNING_DEFAULTS[def.key]);
        }
    };
}

function createSliderRow(def, allRows) {
    const row = document.createElement('div');
    row.className = 'tuning-row';
    row.dataset.searchText = `${def.label} ${def.desc} ${def.key}`;

    const currentVal = window.TUNING[def.key];
    const decimals = def.step < 1 ? (def.step < 0.1 ? 3 : 2) : 0;
    const getDefaultVal = () => TUNING_DEFAULTS[def.key];

    row.innerHTML = `
        <div class="tuning-row-label">
            <span class="label-text">${def.label}</span>
            <span class="value-display">${currentVal.toFixed(decimals)}</span>
        </div>
        <div class="tuning-row-desc">${def.desc}</div>
        <div class="tuning-row-controls">
            <input type="range" min="${def.min}" max="${def.max}" step="${def.step}" value="${currentVal}">
            <input type="number" min="${def.min}" max="${def.max}" step="${def.step}" value="${currentVal}">
            <button class="reset-btn" title="重置为默认值 ${getDefaultVal()}">↺</button>
        </div>
    `;

    const rangeInput = row.querySelector('input[type="range"]');
    const numberInput = row.querySelector('input[type="number"]');
    const valueDisplay = row.querySelector('.value-display');
    const resetBtn = row.querySelector('.reset-btn');

    const renderValue = (num) => {
        const clamped = Math.max(def.min, Math.min(def.max, num));
        rangeInput.value = clamped;
        numberInput.value = clamped;
        valueDisplay.textContent = clamped.toFixed(decimals);
        resetBtn.title = `重置为默认值 ${getDefaultVal()}`;
        row.classList.toggle('modified', Math.abs(clamped - getDefaultVal()) > def.step * 0.1);
    };

    const update = (val, manual = false) => {
        const num = parseFloat(val);
        if (isNaN(num)) return;
        const clamped = Math.max(def.min, Math.min(def.max, num));
        window.TUNING[def.key] = clamped;
        renderValue(clamped);

        if (manual && def.key === 'pulseOrbCount' && window.TUNING.autoPulseOrbCount) {
            window.TUNING.autoPulseOrbCount = false;
            const toggleRow = allRows.find(r => r.key === 'autoPulseOrbCount');
            if (toggleRow) toggleRow.sync();
        }

        if (manual && COMPOSITE_TUNING_MAPS[def.key]) {
            applyCompositeTuning(def.key, clamped, allRows);
        }
    };

    rangeInput.addEventListener('input', () => update(rangeInput.value, true));
    numberInput.addEventListener('input', () => update(numberInput.value, true));
    numberInput.addEventListener('change', () => update(numberInput.value, true));
    resetBtn.addEventListener('click', () => update(getDefaultVal(), true));

    return {
        element: row,
        key: def.key,
        sync: () => renderValue(window.TUNING[def.key])
    };
}

// ─── 启动 ──────────────────────────────────────────
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildTuningPanel);
} else {
    buildTuningPanel();
}

