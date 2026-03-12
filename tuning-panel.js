/* ═══════════════════════════════════════════════════════════════
 *  调试面板  —  Player Ability Debug Panel
 *  在游戏画面上叠加一个可折叠的侧栏，暴露玩家能力与结构驱动参数
 * ═══════════════════════════════════════════════════════════════ */

const TUNING_PROFILE_PATH = 'tuning-profile.json';
const LEGACY_TUNING_STORAGE_KEY = 'bio-core-tuning-profile';
const DEV_WRITE_JSON_ENDPOINT = '/__api/write-json';
const DEV_WRITE_PING_ENDPOINT = '/__api/ping';

const TUNING_FALLBACKS = {
    // ─── 移动能力对比 ─────────────────────────────
    feelClusterBloom: 0.52,
    feelPredatorSurge: 0.62,
    feelCameraDirector: 0.68,
    feelCameraGlide: 0.74,
    feelCameraBreathing: 0.58,
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
    enableDrift: true,
    enableCorePull: true,
    enableAnchor: true,
    enableSpring: true,
    enableRepulsion: true,
    enablePBD: true,
    enablePulse: true,

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
    slotSpacing: 102,
    forwardStep: 72,

    // ─── 脉冲循环 ────────────────────────────────
    autoPulseOrbCount: true,
    gameplayPulseOrbsVisible: true,
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
    showFpsCounter: false,
    showTelemetryOverlay: false,
    debugPauseOnTuningOpen: true,

    // ─── 编队跨度比例 ────────────────────────────
    formationSpanFactor: 0.16,
    maxNodeCount: 2000,

    // ─── Gameplay：局内基础 ─────────────────────
    gameplayMaxEnergy: 100,
    gameplayStartEnergyRatio: 0.78,
    gameplayInfiniteEnergy: false,

    // ─── Gameplay：阶段缩放 ─────────────────────
    gameplayStageProgressGoalMul: 1,
    gameplayStageMetabolismMul: 1,
    gameplayStageSpawnCapMul: 1,
    gameplayStageSpawnDensityMul: 1,
    gameplayStageSpawnIntervalMul: 1,
    gameplayStageMaxNodesBonus: 0,

    // ─── Gameplay：成长经济 ─────────────────────
    gameplayGrowthCostBase: 2.8,
    gameplayGrowthCostPerNode: 0.76,
    gameplayGrowthCostCap: 18,
    gameplayGrowthEnergyBase: 7.5,
    gameplayGrowthEnergyPerNode: 1.9,

    // ─── Gameplay：碎片收益 ─────────────────────
    gameplayFragmentEnergyGain: 5.6,
    gameplayFragmentMatterGain: 2.8,
    gameplayFragmentEnergyBiomass: 0.24,
    gameplayFragmentMatterBiomass: 0.08,

    // ─── Gameplay：猎物铺场与体积 ───────────────
    gameplayPreySpawnEnabled: true,
    gameplayPreyInitialSpawnEnabled: true,
    gameplayPreyRespawnEnabled: false,
    gameplayPreyObjectiveSpawnEnabled: true,
    gameplayPreyInitialDensityMul: 2.35,
    gameplayPreyInitialCountBonus: 0,
    gameplayPreyFieldRadiusMul: 0.92,
    gameplayPreyFieldSpreadMul: 1.06,
    gameplayPreyGlobalSizeMul: 1.8,
    gameplayPreySmallSizeMul: 1.62,
    gameplayPreyMediumSizeMul: 1.84,
    gameplayPreyLargeSizeMul: 2.16,
    'gameplayPreySize__forage-runner': 1,
    'gameplayPreySize__forage-school': 1,
    'gameplayPreySize__forage-hunter': 1,
    'gameplayPreySize__forage-core': 1,
    'gameplayPreySize__bloom-school': 1,
    'gameplayPreySize__bloom-runner': 1,
    'gameplayPreySize__bloom-bulwark': 1,
    'gameplayPreySize__bloom-bulwark-core': 1,
    'gameplayPreySize__encircle-weakspot': 1,
    'gameplayPreySize__encircle-bulwark': 1,
    'gameplayPreySize__encircle-school': 1,
    'gameplayPreySize__encircle-crown': 1,
    'gameplayPreySize__saturation-school': 1,
    'gameplayPreySize__saturation-bulwark': 1,
    'gameplayPreySize__saturation-weakspot': 1,
    'gameplayPreySize__saturation-apex': 1,
    gameplayPreyEnergyYieldMul: 1.18,
    gameplayPreyBiomassYieldMul: 1.42,
    gameplayPreyProgressYieldMul: 1.2,
    gameplayPreyFragmentCountMul: 1.7,
    gameplayPreyFragmentSpeedMul: 1.2,
    gameplayPreyFragmentSizeMul: 1.28,
    gameplayPreyFragmentsEnabled: true,
    gameplayPreyDeathRingsEnabled: true,
    gameplayPreyFragmentBurstCap: 36,
    gameplayPreyFragmentActiveCap: 160,
    gameplayPreyFragmentCollectPerFrameCap: 8,
    gameplayPreyBehaviorGlobalSpeedMul: 1,
    gameplayPreyBehaviorGlobalAccelMul: 1,
    gameplayPreyBehaviorGlobalSpeedCapMul: 1,
    gameplayPreyBehaviorGlobalTurnMul: 1,
    gameplayPreyBehaviorGlobalDragMul: 1,
    gameplayPreyBehaviorBurstDragMul: 1,
    gameplayPreyBehaviorAttachmentDragMul: 1,
    gameplayPreyBehaviorAwayMul: 1,
    gameplayPreyBehaviorWanderMul: 1,
    gameplayPreyBehaviorSchoolMul: 1,
    gameplayPreyBehaviorStrafeMul: 1,
    gameplayPreyBehaviorJitterMul: 1,
    gameplayPreyBehaviorAlertEnterMul: 1,
    gameplayPreyBehaviorEvadeEnterMul: 1,
    gameplayPreyBehaviorBurstEnterMul: 1,
    gameplayPreyBehaviorRecoverEnterMul: 1,
    gameplayPreyBehaviorGrazeExitMul: 1,
    gameplayPreyBehaviorBraceEnterMul: 1,
    gameplayPreyBehaviorBraceReleaseMul: 1,
    gameplayPreyBehaviorBurstGapGateMul: 1,
    gameplayPreyBehaviorBurstWindowMul: 1,
    gameplayPreyBehaviorRecoverWindowMul: 1,
    gameplayPreyBehaviorAlarmDecayMul: 1,
    gameplayPreyBehaviorFearGainMul: 1,
    gameplayPreyBehaviorFearDecayMul: 1,
    gameplayPreyBehaviorStaminaDrainMul: 1,
    gameplayPreyBehaviorStaminaRecoverMul: 1,
    gameplayPreyThreatDistanceWeight: 0.42,
    gameplayPreyThreatNodeWeight: 0.34,
    gameplayPreyThreatGapWeight: 0.34,
    gameplayPreyThreatPhaseWeight: 0.24,
    gameplayPreyThreatPressureWeight: 0.72,
    gameplayPreyThreatSchoolWeight: 0.26,
    gameplayPreyThreatPanicWeight: 0.24,
    gameplayPreyThreatDistanceRangeMul: 1,
    gameplayPreyThreatNodeRangeMul: 1,
    gameplayPreyThreatObjectiveRangeMul: 1,
    gameplayPreyPhaseAggroStable: 0.16,
    gameplayPreyPhaseAggroCruise: 0.32,
    gameplayPreyPhaseAggroPursuit: 0.54,
    gameplayPreyPhaseAggroHunt: 0.76,
    gameplayPreyPhaseAggroBurst: 1,
    gameplayPreyStateCapGrazeMul: 1,
    gameplayPreyStateCapAlertMul: 1,
    gameplayPreyStateCapEvadeMul: 1,
    gameplayPreyStateCapBurstMul: 1,
    gameplayPreyStateCapRecoverMul: 1,
    gameplayPreyStateCapBraceMul: 1,
    gameplayPreyStateCapSchoolingMul: 1,
    gameplayPreyArchetypeDefaultSpeedMul: 1,
    gameplayPreyArchetypeSchoolSpeedMul: 1,
    gameplayPreyArchetypeBulwarkSpeedMul: 1,
    gameplayPreyArchetypeWeakspotSpeedMul: 1,
    gameplayPreyArchetypeApexSpeedMul: 1,
    gameplayPreyArchetypeObjectiveSpeedMul: 1,
    graphicsUseBakedSpriteRenderer: true,
    graphicsMinimalRenderMode: false,
    graphicsRenderWorldEnabled: true,
    graphicsRenderWorldGridEnabled: true,
    graphicsRenderPreyEnabled: true,
    graphicsRenderPreyBaseShapesEnabled: true,
    graphicsRenderPreySignalsEnabled: true,
    graphicsRenderPreyDeathClusterEnabled: true,
    graphicsRenderPreyDamageOverlaysEnabled: true,
    graphicsRenderPreyAttachmentMarksEnabled: true,
    graphicsRenderPreyAttachmentHaloEnabled: true,
    graphicsRenderPredationLinksEnabled: true,
    graphicsRenderPredationLinkLinesEnabled: true,
    graphicsRenderPredationLinkDotsEnabled: true,
    graphicsRenderPreyFragmentsEnabled: true,
    graphicsRenderFragmentTrailsEnabled: true,
    graphicsRenderFragmentBodiesEnabled: true,
    graphicsRenderEffectsEnabled: true,
    graphicsRenderRingEffectsEnabled: true,
    graphicsRenderProgressionRingsVisible: true,
    graphicsRenderPreyGuardRingsVisible: true,
    graphicsRenderPreyDeathRingsVisible: true,
    graphicsRenderFormationEnabled: true,
    graphicsRenderFormationGlowEnabled: true,
    graphicsRenderHudEnabled: true,
    graphicsRenderEditOverlayEnabled: true,
    graphicsRenderDebugOverlayEnabled: true,

    // ─── Gameplay：代谢压力 ─────────────────────
    gameplayMetabolismFloor: 0.8,
    gameplayMetabolismNodeWeight: 0.24,
    gameplayMetabolismBurstWeight: 2.45,
    gameplayMetabolismHuntWeight: 1.28,
    gameplayMetabolismExpansionWeight: 1.72,
    gameplayMetabolismObjectiveWeight: 0.5,
    gameplayMetabolismCompressionRelief: 1.9,
    gameplayMetabolismPredationRelief: 0.55,
    gameplayLivingEnergyBarEnabled: true,
    gameplayLivingEnergyBarTopOffset: 0,
    gameplayLivingEnergyBarBaseLength: 122,
    gameplayLivingEnergyBarGrowthLength: 250,
    gameplayLivingEnergyBarThickness: 12,
    gameplayLivingEnergyBarIdleMotion: 0.72,
    gameplayLivingEnergyBarDamageViolence: 1.36,
    gameplayLivingEnergyBarGainViolence: 1.18,
    gameplayLivingEnergyBarOverloadViolence: 1.7,
    gameplayLivingEnergyBarGrowthViolence: 1.24,
    gameplayLowEnergyThreshold: 0.34,
    gameplayObjectivePulseDamp: 3.6,
    gameplayPulseMetabolismBase: 0.18,
    gameplayPulseMetabolismStageWeight: 0.038,
    gameplayPulseMetabolismMotionWeight: 0.58,
    gameplayPulseMetabolismMoveWeight: 0.24,
    gameplayPulseMetabolismPointerWeight: 0.28,
    gameplayPulseMotionSpeedNorm: 85,
    gameplayPulsePointerSpeedNorm: 520,
    gameplayPulseStableMul: 0.64,
    gameplayPulseCruiseMul: 1,
    gameplayPulsePursuitMul: 1.22,
    gameplayPulseHuntMul: 1.38,
    gameplayPulseBurstMul: 1.82,

    // ─── Gameplay：阶段切换 ─────────────────────
    gameplayStageAdvanceEnergyFlat: 12,
    gameplayStageAdvanceEnergyRatio: 0.24,
    gameplayVictoryDuration: 5.5,
    gameplayDeathDuration: 2.6,

    // ─── Gameplay：猎物强度 ─────────────────────
    gameplayBulwarkHealthMul: 1.42,
    gameplayWeakspotHealthMul: 1.28,
    gameplayApexHealthMul: 2.1,
    gameplaySchoolHealthMul: 0.9,
    gameplayObjectiveHealthMul: 1.22,
    gameplayBulwarkMassMul: 1.2,
    gameplayApexMassMul: 1.42,
    gameplayBulwarkExtraAnchors: 1,
    gameplayWeakspotExtraAnchors: 1,
    gameplayApexExtraAnchors: 2,

    // ─── Gameplay：姿态判定 ─────────────────────
    gameplayCompressionEncircleAssist: 0.26,
    gameplayWeakspotEncircleAssist: 0.82,
    gameplayWeakspotCompressionAssist: 0.18,

    // ─── Gameplay：伤害乘区 ─────────────────────
    gameplayBulwarkBaseDamage: 0.16,
    gameplayBulwarkCompressionDamage: 0.96,
    gameplayBulwarkEncircleDamage: 0.32,
    gameplayBulwarkFeedCompressionGate: 0.4,
    gameplayBulwarkFeedPenalty: 0.58,
    gameplayWeakspotBaseDamage: 0.12,
    gameplayWeakspotWeakArcDamage: 1.08,
    gameplayWeakspotFeedGate: 0.42,
    gameplayWeakspotFeedPenalty: 0.4,
    gameplayApexBaseDamage: 0.08,
    gameplayApexCompressionDamage: 0.44,
    gameplayApexWeakspotDamage: 0.88,
    gameplayApexEncircleDamage: 0.26,
    gameplayApexFeedCompressionGate: 0.38,
    gameplayApexFeedWeakGate: 0.36,
    gameplayApexFeedPenalty: 0.34,
    gameplayObjectiveCutterBase: 0.92,
    gameplayObjectiveCutterPerCount: 0.18,

    // ─── 编辑与慢放 ─────────────────────────────
    enableClickToEditMode: true,
    editTimeScale: 0.08,
    editDeleteTimeScale: 0.05,
    editAmbienceDamp: 8.5,

    // ─── 编辑命中与拖拽 ─────────────────────────
    editNodePickRadiusPx: 28,
    editLinkPickRadiusPx: 18,
    editNodeDragThresholdPx: 16,
    editBoxSelectThresholdPx: 16,

    // ─── 编辑删除与退场 ─────────────────────────
    editExitPaddingPx: 96,
    editDeleteHoldDuration: 0.72,
    editDeleteHoldRadiusBonusPx: 8,
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
    const protocol = window.location?.protocol || '';
    if (protocol === 'file:') {
        return cloneTuningProfile(TUNING_FALLBACKS);
    }

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

function hasDevWriteApi() {
    const protocol = window.location?.protocol || '';
    if (protocol !== 'http:' && protocol !== 'https:') {
        return false;
    }

    try {
        const request = new XMLHttpRequest();
        request.open('GET', DEV_WRITE_PING_ENDPOINT, false);
        request.send(null);
        return request.status === 200;
    } catch (error) {
        return false;
    }
}
const DEV_WRITE_API_AVAILABLE = hasDevWriteApi();

function readLegacyLocalTuningProfile() {
    try {
        const raw = window.localStorage?.getItem(LEGACY_TUNING_STORAGE_KEY);
        if (!raw) {
            return null;
        }

        const saved = JSON.parse(raw);
        if (!saved || typeof saved !== 'object') {
            return null;
        }

        return sanitizeTuningProfile(saved);
    } catch (error) {
        console.warn('读取历史本地调参失败，将忽略该数据:', error);
        return null;
    }
}

function clearLegacyLocalTuningProfile() {
    try {
        window.localStorage?.removeItem(LEGACY_TUNING_STORAGE_KEY);
    } catch (error) {
        console.warn('清理历史本地调参失败，可忽略:', error);
    }
}

async function writeTuningProfileToRepo(profile = window.TUNING) {
    const protocol = window.location?.protocol || '';
    if (protocol === 'file:') {
        console.warn('当前为 file:// 模式，无法写回 tuning-profile.json，请使用一键启动脚本。');
        return false;
    }
    if (!DEV_WRITE_API_AVAILABLE) {
        console.warn('当前服务器不支持写回 API，请使用 start-dev 脚本启动。');
        return false;
    }

    try {
        const response = await fetch(DEV_WRITE_JSON_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file: TUNING_PROFILE_PATH,
                data: sanitizeTuningProfile(profile)
            })
        });
        if (!response.ok) {
            return false;
        }
        return true;
    } catch (error) {
        console.warn('写入仓库调参配置失败:', error);
        return false;
    }
}

window.TUNING = loadRepoTuningProfile();
const legacyTuningProfile = readLegacyLocalTuningProfile();
if (legacyTuningProfile) {
    Object.keys(window.TUNING).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(legacyTuningProfile, key)) {
            window.TUNING[key] = legacyTuningProfile[key];
        }
    });

    writeTuningProfileToRepo(window.TUNING).then((ok) => {
        if (ok) {
            clearLegacyLocalTuningProfile();
            console.info('已将历史本地调参迁移到 tuning-profile.json，并清理 localStorage 旧数据。');
        } else {
            console.warn('检测到历史本地调参，但自动迁移到 tuning-profile.json 失败；可在面板点击“写入 JSON”重试。');
        }
    });
}

// ═══════════════════════════════════════════════════════════════
//  参数定义表：key → { label, desc, min, max, step, section }
// ═══════════════════════════════════════════════════════════════

const TUNING_DEFS = [
    { category: '🧠 主角驱动与技能' },

    { section: '主角 / 镜头总控', sectionDesc: '先拧这几个总旋钮，再进入下面分组微调', defaultOpen: true },
    { key: 'feelClusterBloom', label: '体积呼吸感', desc: '同时控制舒张尺度、骨架回显、排斥撑开和三圈体积抬升', min: 0, max: 1, step: 0.01 },
    { key: 'feelPredatorSurge', label: '追猎爆发感', desc: '同时控制蓄压速度、突破阈值、冲刺节奏、锚点爆发和外扩冲劲', min: 0, max: 1, step: 0.01 },
    { key: 'feelCameraDirector', label: '镜头目标感', desc: '控制鼠标意图优先级，以及镜头顾头不顾腚的程度', min: 0, max: 1, step: 0.01 },
    { key: 'feelCameraGlide', label: '稳镜丝滑度', desc: '控制去抖净化、跟镜黏性和整体高级感', min: 0, max: 1, step: 0.01 },
    { key: 'feelCameraBreathing', label: '视野呼吸感', desc: '控制默认视野、缩放上下限、构图留白和整体空间感', min: 0, max: 1, step: 0.01 },

    { section: '模式与意图控制', sectionDesc: '移动模式与玩家意图的驱动逻辑' },
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
    { key: 'gameplayPulseOrbsVisible', label: '脉冲球显示', desc: '控制沿节点链巡游的那颗小白脉冲球是否显示。只影响渲染，不影响驱动。', type: 'toggle' },
    { key: 'pulseOrbCount', label: '手动脉冲球数', desc: '强制覆盖当前系统的球数。一旦手动改动会立刻关闭自动数量控制。', min: 1, max: 20, step: 1 },

    { section: '操作方向与手感', sectionDesc: 'WASD 移动权重与鼠标朝向跟随' },
    { key: 'normalMoveWeight', label: '普通模式移动权重', desc: '松开 Shift 时 WASD 占比 (0~1)', min: 0, max: 1, step: 0.01 },
    { key: 'shiftMoveWeight', label: '瞄准模式移动权重', desc: '按住 Shift 时 WASD 占比 (0~1)', min: 0, max: 1, step: 0.01 },
    { key: 'baseTurnRate', label: '基础转向速率', desc: '结构朝向旋转速率 (rad/s)', min: 0, max: 10, step: 0.1 },
    { key: 'turnAssistBonus', label: '转向辅助加成', desc: '特定节点提供的额外转向速率', min: 0, max: 8, step: 0.1 },

    { category: '🔧 结构与约束' },

    { section: '全局物理力场', sectionDesc: '决定全局运动物理反馈的各项基本力' },
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

    { category: '🕸️ 拓扑与连线' },

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

    { category: '🧬 节点模板与植入' },

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

    { category: '✏️ 编辑与开发' },

    { section: '结构扩建', sectionDesc: '生长新节点、扩编拓扑时使用的开发参数' },
    { key: 'maxNodeCount', label: '最大节点数量限制', desc: '限制玩家可拥有的最大节点总数', min: 1, max: 2000, step: 1 },
    { key: 'slotSpacing', label: '基础散件距离', desc: '生成骨架之间初始缝隙(不等于最终拉扯弹性长度)', min: 40, max: 250, step: 2 },
    { key: 'forwardStep', label: '前探延展间隔', desc: '', min: 20, max: 200, step: 2 },

    { key: 'formationSpanFactor', label: '编队跨度延伸比', desc: '大组织自动更拉长前伸力', min: 0, max: 0.5, step: 0.01 },

    { section: '进入与慢放', sectionDesc: '点击节点进入编辑态时的时间流速和氛围渐变。' },
    { key: 'enableClickToEditMode', label: '点击进入编辑', desc: '点中节点或连线后进入慢放编辑态。', type: 'toggle' },
    { key: 'editTimeScale', label: '编辑慢放倍率', desc: '普通编辑态下的全局 timescale。', min: 0.01, max: 0.5, step: 0.01 },
    { key: 'editDeleteTimeScale', label: '删除慢放倍率', desc: '右键长按删点时的更慢时流。', min: 0.01, max: 0.5, step: 0.01 },
    { key: 'editAmbienceDamp', label: '编辑氛围阻尼', desc: '编辑态 vignette / overlay 的进出速度。', min: 0.5, max: 20, step: 0.1 },

    { section: '命中与拖拽', sectionDesc: '点击节点、连线和拖拽框选的手感半径。' },
    { key: 'editNodePickRadiusPx', label: '节点命中半径', desc: '点击节点时的拾取半径（屏幕像素）。', min: 6, max: 80, step: 1 },
    { key: 'editLinkPickRadiusPx', label: '连线命中半径', desc: '点击连线时的拾取半径（屏幕像素）。', min: 4, max: 48, step: 1 },
    { key: 'editNodeDragThresholdPx', label: '节点拖拽阈值', desc: '移动超过多远才从点按变成拖点。', min: 2, max: 48, step: 1 },
    { key: 'editBoxSelectThresholdPx', label: '框选阈值', desc: '空地拖拽超过多远才开始框选。', min: 2, max: 48, step: 1 },

    { section: '删除与退场', sectionDesc: '编辑态的退出距离和右键删点长按判定。' },
    { key: 'editExitPaddingPx', label: '编辑退出缓冲', desc: '鼠标离开集群多远右键会退出编辑态。', min: 0, max: 240, step: 2 },
    { key: 'editDeleteHoldDuration', label: '删点长按时长', desc: '右键按住多久会真正删除节点。', min: 0.08, max: 2, step: 0.01 },
    { key: 'editDeleteHoldRadiusBonusPx', label: '删点悬停宽容', desc: '长按删点时额外增加的命中宽容半径。', min: 0, max: 32, step: 1 },

    { category: '🎥 镜头与呈现' },

    { section: '镜头高级细项（折叠）', sectionDesc: '默认先拧上面的镜头主旋钮。这里是高级细调。', defaultOpen: false },
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

    { category: '🎮 Gameplay 循环' },

    { section: '局内基础', sectionDesc: '短局的能量池和开局资源。', defaultOpen: true },
    { key: 'gameplayMaxEnergy', label: '最大能量池', desc: '玩家总能量上限。', min: 20, max: 300, step: 1 },
    { key: 'gameplayStartEnergyRatio', label: '开局能量比例', desc: '重开或新局时，按最大能量填充多少。', min: 0.1, max: 1, step: 0.01 },
    { key: 'gameplayInfiniteEnergy', label: '无限能量', desc: '开启后能量条会锁满，不再因代谢或战斗掉能。', type: 'toggle' },

    { section: '阶段缩放', sectionDesc: '对全部 stage 的目标、刷怪和节点上限做整体缩放。' },
    { key: 'gameplayStageProgressGoalMul', label: '阶段目标倍率', desc: '统一放大或缩小各阶段 progressGoal。', min: 0.25, max: 3, step: 0.05 },
    { key: 'gameplayStageMetabolismMul', label: '阶段代谢倍率', desc: '统一缩放各阶段基础 metabolism。', min: 0.25, max: 3, step: 0.05 },
    { key: 'gameplayStageSpawnCapMul', label: '刷怪上限倍率', desc: '统一缩放各阶段 spawnCap。', min: 0.25, max: 3, step: 0.05 },
    { key: 'gameplayStageSpawnDensityMul', label: '刷怪密度倍率', desc: '统一缩放各 spawn rule 的 desired / pack。', min: 0.25, max: 3, step: 0.05 },
    { key: 'gameplayStageSpawnIntervalMul', label: '刷怪间隔倍率', desc: '统一缩放各 spawn rule 的 interval。越低越快。', min: 0.25, max: 3, step: 0.05 },
    { key: 'gameplayStageMaxNodesBonus', label: '阶段节点上限补正', desc: '给所有阶段的 maxNodes 统一加减。', min: -12, max: 24, step: 1 },

    { section: '猎物铺场', sectionDesc: '先把猎场塞满，再决定是否允许持续补怪。默认关闭持续刷怪，初始给多少就是多少。' },
    { key: 'gameplayPreySpawnEnabled', label: '猎物生成总开关', desc: '统一控制初始铺场、阶段目标和后续补怪。关掉后局内不会再生成任何 prey。', type: 'toggle' },
    { key: 'gameplayPreyInitialSpawnEnabled', label: '初始铺场开关', desc: '控制 reset / 进关时是否按 stage 规则一次性铺出猎物。', type: 'toggle' },
    { key: 'gameplayPreyRespawnEnabled', label: '持续补怪开关', desc: '关闭后只保留开局铺场和阶段晋级目标，不会再按计时补怪。', type: 'toggle' },
    { key: 'gameplayPreyObjectiveSpawnEnabled', label: '阶段目标生成', desc: '控制每一关的 objective prey 是否出现。', type: 'toggle' },
    { key: 'gameplayPreyInitialDensityMul', label: '初始铺场密度', desc: '按每条 spawn rule 的 desired 扩大开局猎物数量。', min: 0.25, max: 5, step: 0.05 },
    { key: 'gameplayPreyInitialCountBonus', label: '初始数量补正', desc: '每条 spawn rule 额外再加几个。', min: -4, max: 16, step: 1 },
    { key: 'gameplayPreyFieldRadiusMul', label: '铺场半径倍率', desc: '开局猎物离玩家有多远。越低越贴脸。', min: 0.35, max: 1.6, step: 0.01 },
    { key: 'gameplayPreyFieldSpreadMul', label: '群内散布倍率', desc: '同一组猎物内部摊得有多开。越低越像一团待撕的肉。', min: 0.35, max: 2, step: 0.01 },

    { section: '成长经济', sectionDesc: '玩家扩编节奏和长节点后的资源回补。' },
    { key: 'gameplayGrowthCostBase', label: '成长基础成本', desc: '第一轮成长开始的 biomass 消耗。', min: 0.5, max: 12, step: 0.1 },
    { key: 'gameplayGrowthCostPerNode', label: '每节点成长增量', desc: '节点越多，下一次成长额外多花多少。', min: 0, max: 3, step: 0.02 },
    { key: 'gameplayGrowthCostCap', label: '成长成本上限', desc: '单次成长的最高消耗封顶。', min: 2, max: 40, step: 0.5 },
    { key: 'gameplayGrowthEnergyBase', label: '成长回能基础值', desc: '长出节点后立刻返还的基础能量。', min: 0, max: 20, step: 0.1 },
    { key: 'gameplayGrowthEnergyPerNode', label: '成长回能增量', desc: '每次成长额外按节点数返还能量。', min: 0, max: 5, step: 0.05 },

    { section: '猎物体积与收益', sectionDesc: '把猎物做大、做肥，并直接控制它们对成长节奏和碎块喷发的贡献。' },
    { key: 'gameplayPreyGlobalSizeMul', label: '猎物总尺寸倍率', desc: '所有 prey 的总放大倍率。先拧它，再拧下面单体。', min: 0.4, max: 3.5, step: 0.02 },
    { key: 'gameplayPreySmallSizeMul', label: '小体型倍率', desc: 'small prey 的基础尺寸倍率。', min: 0.4, max: 3.5, step: 0.02 },
    { key: 'gameplayPreyMediumSizeMul', label: '中体型倍率', desc: 'medium prey 的基础尺寸倍率。', min: 0.4, max: 3.5, step: 0.02 },
    { key: 'gameplayPreyLargeSizeMul', label: '大体型倍率', desc: 'large prey 的基础尺寸倍率。', min: 0.4, max: 4, step: 0.02 },
    { key: 'gameplayPreyEnergyYieldMul', label: '猎物回能倍率', desc: '所有 prey 被吞后直接回多少能量。', min: 0.25, max: 3, step: 0.02 },
    { key: 'gameplayPreyBiomassYieldMul', label: '猎物成长倍率', desc: '所有 prey 推进 growthBuffer 的倍率。', min: 0.25, max: 3, step: 0.02 },
    { key: 'gameplayPreyProgressYieldMul', label: '猎物进度倍率', desc: '所有 prey 推进关卡进度的倍率。', min: 0.25, max: 3, step: 0.02 },
    { key: 'gameplayPreyFragmentsEnabled', label: '碎块总开关', desc: '一键关闭碎块生成、回收和渲染，用来隔离猎杀后的卡顿来源。', type: 'toggle' },
    { key: 'gameplayPreyDeathRingsEnabled', label: '死亡光环开关', desc: '控制猎物破碎时那几圈残留的死亡光环。', type: 'toggle' },
    { key: 'gameplayPreyFragmentCountMul', label: '碎块数量倍率', desc: '被撕裂时喷多少碎片。', min: 0.5, max: 4, step: 0.05 },
    { key: 'gameplayPreyFragmentSpeedMul', label: '碎块喷射倍率', desc: '碎片飞出去有多猛。', min: 0.5, max: 3, step: 0.05 },
    { key: 'gameplayPreyFragmentSizeMul', label: '碎块体积倍率', desc: '喷出来的血肉和能量块有多大。', min: 0.5, max: 3, step: 0.05 },
    { key: 'gameplayPreyFragmentBurstCap', label: '单次碎块上限', desc: '一次撕裂/吞噬最多生成多少碎块，防止爆发式卡顿。', min: 4, max: 80, step: 1 },
    { key: 'gameplayPreyFragmentActiveCap', label: '场上碎块上限', desc: '同时存在的碎块总数上限，超过后新碎块不会继续生成。', min: 16, max: 240, step: 1 },
    { key: 'gameplayPreyFragmentCollectPerFrameCap', label: '单帧回收上限', desc: '一帧里最多吸收多少碎块，避免猎杀后回收洪峰把模拟拖卡。', min: 1, max: 24, step: 1 },

    { section: 'Graphics 定位总开关', sectionDesc: '这些都只影响 Graphics 渲染，不改模拟结果，适合先大范围二分定位。' },
    { key: 'graphicsUseBakedSpriteRenderer', label: '预烘焙贴图渲染', desc: '主菜单启动时先生成基础几何贴图，之后用精灵池复用渲染猎物/碎块/附着/圆环，尽量绕开 Graphics path fill。', type: 'toggle' },
    { key: 'graphicsMinimalRenderMode', label: '极简渲染模式', desc: '一键关闭 HUD、prey overlays、formation glow 和 world grid，只保留最基础轮廓，用来快速做 batchFillPath A/B。', type: 'toggle' },
    { key: 'graphicsRenderWorldEnabled', label: '世界底图', desc: '背景、网格、屏幕染色和 objective 大光斑。', type: 'toggle' },
    { key: 'graphicsRenderWorldGridEnabled', label: '世界网格', desc: '只控制背景里的规则网格线，保留 arena 底色、屏幕染色和 objective 光斑。', type: 'toggle' },
    { key: 'graphicsRenderPreyEnabled', label: '猎物本体层', desc: '所有 prey 本体及其身上的附加层。先用它判断 batchFillPath 是否主要来自猎物绘制。', type: 'toggle' },
    { key: 'graphicsRenderPreyDeathClusterEnabled', label: '猎杀相关层', desc: '一键关闭与猎物受伤/附着/死亡最强相关的 Graphics：碎块、咬合标记、附着连线、死亡环等。', type: 'toggle' },
    { key: 'graphicsRenderFormationEnabled', label: '主角结构层', desc: '玩家节点、链路、脉冲球和抓地反馈。', type: 'toggle' },
    { key: 'graphicsRenderFormationGlowEnabled', label: '主角辉光装饰', desc: '关闭结构层里与 glow 相关的质心光晕、节点 pulse glow、bite glow 和低能量外圈，只保留主体节点与连线。', type: 'toggle' },
    { key: 'graphicsRenderEffectsEnabled', label: '环形特效层', desc: '所有 createRing 生成的圆环特效。', type: 'toggle' },
    { key: 'graphicsRenderHudEnabled', label: 'HUD 层', desc: '活体能量条、阶段点和全屏胜利/死亡覆盖。', type: 'toggle' },
    { key: 'graphicsRenderEditOverlayEnabled', label: '编辑态层', desc: '编辑框选、选中高亮和删除倒计时环。', type: 'toggle' },
    { key: 'graphicsRenderDebugOverlayEnabled', label: '调试图层', desc: 'showDebugVisuals 打开的所有 Graphics 调试辅助线。', type: 'toggle' },

    { section: '猎杀后 Graphics 细分', sectionDesc: '在“猎杀相关层”已经能复现差异后，再往下逐项对比。大多是 render-only 开关，便于抓出真正的昂贵 path fill。' },
    { key: 'graphicsRenderPreyBaseShapesEnabled', label: '猎物基础形体', desc: 'prey 的主体形状和基础阴影，包含三角/方块的 fillPoints。', type: 'toggle' },
    { key: 'graphicsRenderPreySignalsEnabled', label: '猎物信号圈', desc: 'guard pulse、weakspot 标记和 objective 双环。', type: 'toggle' },
    { key: 'graphicsRenderPreyDamageOverlaysEnabled', label: '受伤吞食叠层', desc: 'wound / devour / exposed / carve 这批随着受击与临死增强的叠层。', type: 'toggle' },
    { key: 'graphicsRenderPreyAttachmentMarksEnabled', label: '咬点标记', desc: '附着在 prey 身上的 bite 阴影和 hook/grind/feed 小图形。', type: 'toggle' },
    { key: 'graphicsRenderPreyAttachmentHaloEnabled', label: '附着中心环', desc: 'prey 身上那圈表示 attachments 数量的描边圈。', type: 'toggle' },
    { key: 'graphicsRenderPredationLinksEnabled', label: '附着连线总开关', desc: 'node 到 prey 的整套 predation link Graphics。', type: 'toggle' },
    { key: 'graphicsRenderPredationLinkLinesEnabled', label: '附着连线线段', desc: '两段 lineBetween 主体，优先怀疑它是否在死亡前后暴涨。', type: 'toggle' },
    { key: 'graphicsRenderPredationLinkDotsEnabled', label: '附着连线端点', desc: 'attach 点和 prey 中心的小圆点。', type: 'toggle' },
    { key: 'graphicsRenderPreyFragmentsEnabled', label: '碎块渲染总开关', desc: '只隐藏 fragments 的 Graphics 渲染，不停掉碎块模拟。可与 gameplay 的“碎块总开关”交叉对比。', type: 'toggle' },
    { key: 'graphicsRenderFragmentTrailsEnabled', label: '碎块拖尾', desc: '碎块线拖尾和 energy 外圈。', type: 'toggle' },
    { key: 'graphicsRenderFragmentBodiesEnabled', label: '碎块形体', desc: '碎块本体 shape，包含 triangle/square 的 fillPoints。', type: 'toggle' },
    { key: 'graphicsRenderRingEffectsEnabled', label: '环形特效总开关', desc: '所有 createRing 画出来的 strokeCircle。', type: 'toggle' },
    { key: 'graphicsRenderProgressionRingsVisible', label: '流程环', desc: '成长、阶段推进、目标出现、胜利、玩家死亡这些流程环。', type: 'toggle' },
    { key: 'graphicsRenderPreyGuardRingsVisible', label: '守卫脉冲环', desc: 'bulwark/apex 触发的 guard pulse ring。', type: 'toggle' },
    { key: 'graphicsRenderPreyDeathRingsVisible', label: '猎物死亡环', desc: 'finishPreyDevour 里那三圈死亡 ring。', type: 'toggle' },

    { section: '现有猎物尺寸清单', sectionDesc: '当前 demo 里所有可被狩猎对象都在这里，方便你逐个微调。', defaultOpen: false },
    { key: 'gameplayPreySize__forage-runner', label: '觅食·跑者', desc: '第一关小三角跑者。', min: 0.4, max: 4, step: 0.02 },
    { key: 'gameplayPreySize__forage-school', label: '觅食·群球', desc: '第一关小圆群聚猎物。', min: 0.4, max: 4, step: 0.02 },
    { key: 'gameplayPreySize__forage-hunter', label: '觅食·中型猎手', desc: '第一关中型追逃目标。', min: 0.4, max: 4, step: 0.02 },
    { key: 'gameplayPreySize__forage-core', label: '觅食·晋级核心', desc: '第一关 objective。', min: 0.4, max: 4.5, step: 0.02 },
    { key: 'gameplayPreySize__bloom-school', label: '扩张·群球', desc: '第二关群聚球。', min: 0.4, max: 4, step: 0.02 },
    { key: 'gameplayPreySize__bloom-runner', label: '扩张·跑者', desc: '第二关小跑者。', min: 0.4, max: 4, step: 0.02 },
    { key: 'gameplayPreySize__bloom-bulwark', label: '扩张·壁垒方块', desc: '第二关中型 bulwark。', min: 0.4, max: 4.5, step: 0.02 },
    { key: 'gameplayPreySize__bloom-bulwark-core', label: '扩张·方核目标', desc: '第二关 objective。', min: 0.4, max: 5, step: 0.02 },
    { key: 'gameplayPreySize__encircle-weakspot', label: '围猎·弱点三角', desc: '第三关中型 weakspot。', min: 0.4, max: 4.5, step: 0.02 },
    { key: 'gameplayPreySize__encircle-bulwark', label: '围猎·壁垒方块', desc: '第三关中型 bulwark。', min: 0.4, max: 4.5, step: 0.02 },
    { key: 'gameplayPreySize__encircle-school', label: '围猎·群球', desc: '第三关补给群。', min: 0.4, max: 4, step: 0.02 },
    { key: 'gameplayPreySize__encircle-crown', label: '围猎·冠核目标', desc: '第三关 objective。', min: 0.4, max: 5, step: 0.02 },
    { key: 'gameplayPreySize__saturation-school', label: '过饱和·群球', desc: '第四关群球。', min: 0.4, max: 4, step: 0.02 },
    { key: 'gameplayPreySize__saturation-bulwark', label: '过饱和·壁垒方块', desc: '第四关中型 bulwark。', min: 0.4, max: 4.5, step: 0.02 },
    { key: 'gameplayPreySize__saturation-weakspot', label: '过饱和·弱点三角', desc: '第四关中型 weakspot。', min: 0.4, max: 4.5, step: 0.02 },
    { key: 'gameplayPreySize__saturation-apex', label: '过饱和·终局母体', desc: '第四关 apex objective。', min: 0.4, max: 5.5, step: 0.02 },

    { section: '碎片收益', sectionDesc: '猎物碎片对能量和 biomass 的回流。' },
    { key: 'gameplayFragmentEnergyGain', label: '能量碎片回能', desc: '吃到 energy 碎片直接回多少能量。', min: 0, max: 20, step: 0.1 },
    { key: 'gameplayFragmentMatterGain', label: '肉块碎片回能', desc: '吃到 flesh/meat/gore 时回多少能量。', min: 0, max: 12, step: 0.1 },
    { key: 'gameplayFragmentEnergyBiomass', label: '能量碎片成长值', desc: 'energy 碎片会推进多少 growthBuffer。', min: 0, max: 2, step: 0.01 },
    { key: 'gameplayFragmentMatterBiomass', label: '肉块碎片成长值', desc: '普通肉块会推进多少 growthBuffer。', min: 0, max: 2, step: 0.01 },

    { section: '活体能量条', sectionDesc: '中上方那根会被抽搐、鼓胀、过载灌爆的矩形能量器官。' },
    { key: 'gameplayLivingEnergyBarEnabled', label: '启用活体能量条', desc: '关闭后隐藏新的动态能量条对象，便于做 HUD A/B。', type: 'toggle' },
    { key: 'gameplayLivingEnergyBarTopOffset', label: '顶部偏移', desc: '整体往上往下挪多少屏幕像素。', min: -40, max: 120, step: 1 },
    { key: 'gameplayLivingEnergyBarBaseLength', label: '开局基础长度', desc: '初始体型时这根条有多短。', min: 60, max: 220, step: 2 },
    { key: 'gameplayLivingEnergyBarGrowthLength', label: '成长追加长度', desc: '随着节点与成长推进，整条最多再拉长多少。', min: 0, max: 420, step: 2 },
    { key: 'gameplayLivingEnergyBarThickness', label: '基础厚度', desc: '条本体的基础厚度。动态形变会在此基础上鼓胀或塌缩。', min: 4, max: 28, step: 0.5 },
    { key: 'gameplayLivingEnergyBarIdleMotion', label: '躁动底噪', desc: '常态下活体抽动、轻甩和不稳定感的基础强度。', min: 0, max: 2.5, step: 0.02 },
    { key: 'gameplayLivingEnergyBarDamageViolence', label: '掉能抽搐强度', desc: '能量被抽走时的猛缩、塌陷和震颤有多狠。', min: 0, max: 3, step: 0.02 },
    { key: 'gameplayLivingEnergyBarGainViolence', label: '回能鼓胀强度', desc: '吃到猎物或回能时条被灌满、抬起和回弹的强度。', min: 0, max: 3, step: 0.02 },
    { key: 'gameplayLivingEnergyBarOverloadViolence', label: '满条过载强度', desc: '满能量后继续吃时，右端溢出、甩动和爆胀的强度。', min: 0, max: 3.5, step: 0.02 },
    { key: 'gameplayLivingEnergyBarGrowthViolence', label: '成长扩容强度', desc: '长节点或接近成长门槛时，整条被撑长和拉拽的强度。', min: 0, max: 3, step: 0.02 },

    { section: '脉动活动权重', sectionDesc: '这些不是按秒线性掉能，而是折算进每次脉动的“这一口要掉多狠”。' },
    { key: 'gameplayMetabolismFloor', label: '脉动保底', desc: '任何状态下都会折算进每次脉动的一点基础饥饿。', min: 0, max: 5, step: 0.05 },
    { key: 'gameplayMetabolismNodeWeight', label: '节点加价权重', desc: '节点越多，每次脉动额外越贵。', min: 0, max: 1, step: 0.01 },
    { key: 'gameplayMetabolismBurstWeight', label: '爆发加价权重', desc: 'burstAggro 会把每次脉动额外抬高多少。', min: 0, max: 5, step: 0.05 },
    { key: 'gameplayMetabolismHuntWeight', label: '追猎加价权重', desc: 'hunt / 围猎姿态会把每次脉动额外抬高多少。', min: 0, max: 4, step: 0.05 },
    { key: 'gameplayMetabolismExpansionWeight', label: '舒张加价权重', desc: '集群往外铺得越大，每次脉动加价多少。', min: 0, max: 4, step: 0.05 },
    { key: 'gameplayMetabolismObjectiveWeight', label: '目标压迫加价', desc: 'objective 在场时，每次脉动额外增加多少压力。', min: 0, max: 3, step: 0.05 },
    { key: 'gameplayMetabolismCompressionRelief', label: '内聚减负权重', desc: '压紧集群时，每次脉动能减掉多少。', min: 0, max: 4, step: 0.05 },
    { key: 'gameplayMetabolismPredationRelief', label: '捕食减负权重', desc: '咬住目标时，每次脉动能减掉多少。', min: 0, max: 2, step: 0.05 },
    { key: 'gameplayLowEnergyThreshold', label: '低能警戒阈值', desc: 'HUD 低能脉冲从哪条能量比开始亮。', min: 0.05, max: 0.8, step: 0.01 },
    { key: 'gameplayObjectivePulseDamp', label: '目标脉冲阻尼', desc: 'objective 光环追踪的收放速度。', min: 0.2, max: 10, step: 0.1 },

    { section: '脉动耗能', sectionDesc: '不再按秒线性掉能，而是跟随心跳/脉动一口一口往下啃。' },
    { key: 'gameplayPulseMetabolismBase', label: '单次脉动基础耗能', desc: '每次脉动至少消耗多少。', min: 0.01, max: 1.2, step: 0.01 },
    { key: 'gameplayPulseMetabolismStageWeight', label: '阶段基础转耗能', desc: 'stage.metabolism 会折算进每次脉动多少。', min: 0, max: 0.2, step: 0.001 },
    { key: 'gameplayPulseMetabolismMotionWeight', label: '运动速度耗能', desc: '集群整体速度越高，每次脉动越贵。', min: 0, max: 2, step: 0.02 },
    { key: 'gameplayPulseMetabolismMoveWeight', label: '输入动作耗能', desc: 'WASD / 位移意图本身会给脉动加价多少。', min: 0, max: 1.5, step: 0.02 },
    { key: 'gameplayPulseMetabolismPointerWeight', label: '鼠标甩动耗能', desc: '鼠标甩得越猛，每次脉动越贵。', min: 0, max: 1.5, step: 0.02 },
    { key: 'gameplayPulseMotionSpeedNorm', label: '速度归一阈值', desc: '多快算“已经很快了”。越低越容易吃满运动耗能。', min: 10, max: 240, step: 1 },
    { key: 'gameplayPulsePointerSpeedNorm', label: '甩鼠归一阈值', desc: '多快算“甩得很凶”。越低越容易吃满指针耗能。', min: 60, max: 1200, step: 5 },
    { key: 'gameplayPulseStableMul', label: '内聚耗能倍率', desc: 'stable / 内聚姿态下，每次脉动的倍率。', min: 0.2, max: 2.5, step: 0.02 },
    { key: 'gameplayPulseCruiseMul', label: '巡航耗能倍率', desc: 'cruise 姿态下，每次脉动的倍率。', min: 0.2, max: 2.5, step: 0.02 },
    { key: 'gameplayPulsePursuitMul', label: '追猎耗能倍率', desc: 'pursuit 姿态下，每次脉动的倍率。', min: 0.2, max: 3, step: 0.02 },
    { key: 'gameplayPulseHuntMul', label: '围猎耗能倍率', desc: 'hunt 姿态下，每次脉动的倍率。', min: 0.2, max: 3.5, step: 0.02 },
    { key: 'gameplayPulseBurstMul', label: '爆发耗能倍率', desc: 'burst 姿态下，每次脉动的倍率。', min: 0.2, max: 4, step: 0.02 },

    { section: '阶段切换', sectionDesc: '升阶段、胜利和死亡后的资源/时长反馈。' },
    { key: 'gameplayStageAdvanceEnergyFlat', label: '晋级固定回能', desc: '切阶段时至少返还多少能量。', min: 0, max: 80, step: 1 },
    { key: 'gameplayStageAdvanceEnergyRatio', label: '晋级比例回能', desc: '切阶段时按最大能量返还多少比例。', min: 0, max: 1, step: 0.01 },
    { key: 'gameplayVictoryDuration', label: '胜利停留时长', desc: '最终胜利后多久自动重开。', min: 0.5, max: 15, step: 0.1 },
    { key: 'gameplayDeathDuration', label: '死亡停留时长', desc: '死亡后多久自动重开。', min: 0.5, max: 10, step: 0.1 },

    { section: '猎物强度缩放', sectionDesc: '对当前已落地的几类 prey archetype 做统一倍率调参。' },
    { key: 'gameplayBulwarkHealthMul', label: 'Bulwark 生命倍率', desc: 'bulwark 的额外血量倍率。', min: 0.5, max: 4, step: 0.02 },
    { key: 'gameplayWeakspotHealthMul', label: 'Weakspot 生命倍率', desc: 'weakspot 的额外血量倍率。', min: 0.5, max: 4, step: 0.02 },
    { key: 'gameplayApexHealthMul', label: 'Apex 生命倍率', desc: 'apex 的额外血量倍率。', min: 0.5, max: 5, step: 0.02 },
    { key: 'gameplaySchoolHealthMul', label: 'School 生命倍率', desc: 'school 的血量倍率。', min: 0.25, max: 2, step: 0.02 },
    { key: 'gameplayObjectiveHealthMul', label: 'Objective 生命倍率', desc: 'objective 目标会再吃一层额外倍率。', min: 0.5, max: 3, step: 0.02 },
    { key: 'gameplayBulwarkMassMul', label: 'Bulwark 质量倍率', desc: 'bulwark 的额外质量。', min: 0.5, max: 3, step: 0.02 },
    { key: 'gameplayApexMassMul', label: 'Apex 质量倍率', desc: 'apex 的额外质量。', min: 0.5, max: 3, step: 0.02 },
    { key: 'gameplayBulwarkExtraAnchors', label: 'Bulwark 额外锚点', desc: 'bulwark 允许多被几个节点挂住。', min: 0, max: 6, step: 1 },
    { key: 'gameplayWeakspotExtraAnchors', label: 'Weakspot 额外锚点', desc: 'weakspot 允许多被几个节点挂住。', min: 0, max: 6, step: 1 },
    { key: 'gameplayApexExtraAnchors', label: 'Apex 额外锚点', desc: 'apex 允许多被几个节点挂住。', min: 0, max: 8, step: 1 },

    { section: '猎物追逃总控', sectionDesc: '先拉这一组，直接决定“怪整体跑得快不快、转得狠不狠、会不会被你两下追上”。', defaultOpen: true },
    { key: 'gameplayPreyBehaviorGlobalSpeedMul', label: '全局目标速度', desc: '猎物所有状态的总体速度倍率。', min: 0.3, max: 2.8, step: 0.02 },
    { key: 'gameplayPreyBehaviorGlobalAccelMul', label: '全局起步加速度', desc: '猎物换向、起跑和拉开距离的能力。', min: 0.3, max: 3, step: 0.02 },
    { key: 'gameplayPreyBehaviorGlobalSpeedCapMul', label: '全局速度上限', desc: '防止上面速度拉高后很快撞到天花板。', min: 0.4, max: 3, step: 0.02 },
    { key: 'gameplayPreyBehaviorGlobalTurnMul', label: '全局转向速率', desc: '猎物转头和修正逃跑方向的快慢。', min: 0.3, max: 3, step: 0.02 },
    { key: 'gameplayPreyBehaviorGlobalDragMul', label: '全局阻尼', desc: '越低越滑得远，越高越容易被你贴住。', min: 0.2, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyBehaviorBurstDragMul', label: '爆发阻尼', desc: 'burst 状态单独阻尼。往低拉，爆发冲刺更明显。', min: 0.1, max: 2, step: 0.02 },
    { key: 'gameplayPreyBehaviorAttachmentDragMul', label: '挂载阻尼', desc: '被咬住后速度掉得有多狠。', min: 0.1, max: 2.5, step: 0.02 },

    { section: '猎物状态切换', sectionDesc: '决定猎物多久开始慌、多久开始真跑、多久开爆发。阈值越低，敌人越早给你压力。', defaultOpen: false },
    { key: 'gameplayPreyBehaviorAlertEnterMul', label: '警觉阈值', desc: '进入 alert 的阈值倍率。越低越容易警觉。', min: 0.3, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyBehaviorEvadeEnterMul', label: '逃离阈值', desc: '进入 evade 的阈值倍率。越低越早开始认真跑。', min: 0.3, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyBehaviorBurstEnterMul', label: '爆发阈值', desc: '进入 burst 的阈值倍率。越低越常看到一口爆冲。', min: 0.3, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyBehaviorRecoverEnterMul', label: '恢复阈值', desc: '从高压掉回 recover 的门槛。', min: 0.3, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyBehaviorGrazeExitMul', label: '脱战阈值', desc: '回到 graze / schooling 的门槛。', min: 0.3, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyBehaviorBraceEnterMul', label: '架势阈值', desc: 'bulwark / apex 进入 brace 的门槛。', min: 0.3, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyBehaviorBraceReleaseMul', label: '护反触发阈值', desc: 'brace 态释放守卫脉冲的强度门槛。', min: 0.3, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyBehaviorBurstGapGateMul', label: '爆发逼近门槛', desc: '玩家逼近速度要多狠，猎物才愿意开 burst。越低越敏感。', min: 0.2, max: 2.5, step: 0.02 },

    { section: '猎物节奏与体力', sectionDesc: '决定 burst 能冲多久、虚多久，以及 panic / fear 退不退得快。', defaultOpen: false },
    { key: 'gameplayPreyBehaviorBurstWindowMul', label: '爆发持续', desc: 'burst 状态持续时长倍率。', min: 0.2, max: 3, step: 0.02 },
    { key: 'gameplayPreyBehaviorRecoverWindowMul', label: '恢复持续', desc: 'recover 状态时长倍率。', min: 0.2, max: 3, step: 0.02 },
    { key: 'gameplayPreyBehaviorAlarmDecayMul', label: '警报衰减', desc: '越低越会一直保持紧张，越高越快冷静。', min: 0.2, max: 3, step: 0.02 },
    { key: 'gameplayPreyBehaviorFearGainMul', label: '恐惧增长', desc: '高压下 fear 叠得有多快。', min: 0.2, max: 3, step: 0.02 },
    { key: 'gameplayPreyBehaviorFearDecayMul', label: '恐惧衰减', desc: 'fear 回落速度。越低越容易持续乱窜。', min: 0.2, max: 3, step: 0.02 },
    { key: 'gameplayPreyBehaviorStaminaDrainMul', label: '爆发耗体', desc: 'burst 时 stamina 掉得多快。越低越能连续冲。', min: 0.2, max: 3, step: 0.02 },
    { key: 'gameplayPreyBehaviorStaminaRecoverMul', label: '体力恢复', desc: 'recover 和普通状态的 stamina 回复速度。', min: 0.2, max: 3, step: 0.02 },

    { section: '猎物威胁评估', sectionDesc: '这组决定猎物到底怕你什么。想让它更早跑，通常先加权重，再降状态阈值。', defaultOpen: false },
    { key: 'gameplayPreyThreatDistanceWeight', label: '距离压迫权重', desc: '玩家质心靠近时，对 threat 的贡献。', min: 0, max: 1.5, step: 0.02 },
    { key: 'gameplayPreyThreatNodeWeight', label: '节点逼近权重', desc: '单个 node 靠近和前冲时，对 threat 的贡献。', min: 0, max: 1.5, step: 0.02 },
    { key: 'gameplayPreyThreatGapWeight', label: '闭合速度权重', desc: '你追近得越快，它越容易紧张。', min: 0, max: 1.5, step: 0.02 },
    { key: 'gameplayPreyThreatPhaseWeight', label: '移动相位权重', desc: 'stable / pursuit / hunt / burst 对敌人的额外压迫。', min: 0, max: 1.5, step: 0.02 },
    { key: 'gameplayPreyThreatPressureWeight', label: '挂载压力权重', desc: '被挂上后 threat 增幅有多大。', min: 0, max: 2, step: 0.02 },
    { key: 'gameplayPreyThreatSchoolWeight', label: '群体惊慌权重', desc: '同伴告警会把它吓成什么样。', min: 0, max: 1.5, step: 0.02 },
    { key: 'gameplayPreyThreatPanicWeight', label: '受伤惊恐权重', desc: 'panic/wound 对 threat 的附加。', min: 0, max: 1.5, step: 0.02 },
    { key: 'gameplayPreyThreatDistanceRangeMul', label: '距离感知半径', desc: '多远开始把玩家质心当威胁。', min: 0.3, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyThreatNodeRangeMul', label: '节点感知半径', desc: '多远开始把 node 靠近算成威胁。', min: 0.3, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyThreatObjectiveRangeMul', label: '目标额外感知', desc: 'objective prey 的额外预警半径。', min: 0.3, max: 2.5, step: 0.02 },

    { section: '猎物状态配速', sectionDesc: '最直接的追逃速度表。你要“怪跑得明显点”，先拉 evade / burst。', defaultOpen: false },
    { key: 'gameplayPreyStateCapGrazeMul', label: 'Graze 配速', desc: 'graze 状态的机能倍率。', min: 0.3, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyStateCapAlertMul', label: 'Alert 配速', desc: 'alert 状态的机能倍率。', min: 0.3, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyStateCapEvadeMul', label: 'Evade 配速', desc: 'evade 状态的机能倍率。', min: 0.3, max: 3, step: 0.02 },
    { key: 'gameplayPreyStateCapBurstMul', label: 'Burst 配速', desc: 'burst 状态的机能倍率。', min: 0.3, max: 3.5, step: 0.02 },
    { key: 'gameplayPreyStateCapRecoverMul', label: 'Recover 配速', desc: 'recover 状态的机能倍率。', min: 0.3, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyStateCapBraceMul', label: 'Brace 配速', desc: 'brace 状态的机能倍率。', min: 0.3, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyStateCapSchoolingMul', label: 'Schooling 配速', desc: 'schooling 状态的机能倍率。', min: 0.3, max: 2.5, step: 0.02 },

    { section: '猎物运动风格', sectionDesc: '速度够了以后，再用这组决定它是直线冲、群体抱团、还是左右晃着逃。', defaultOpen: false },
    { key: 'gameplayPreyBehaviorAwayMul', label: '远离权重', desc: '直线远离玩家的倾向。', min: 0, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyBehaviorWanderMul', label: '游走权重', desc: '平时闲逛和自然感。越高越像生态，越低越像纯逃跑。', min: 0, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyBehaviorSchoolMul', label: '群聚权重', desc: 'cohesion / alignment / separation 的总体权重。', min: 0, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyBehaviorStrafeMul', label: '侧移权重', desc: '弱点怪、壁垒怪绕身闪避的强度。', min: 0, max: 2.5, step: 0.02 },
    { key: 'gameplayPreyBehaviorJitterMul', label: '抖动权重', desc: '逃跑里的细碎乱动。适合做“慌”的感觉。', min: 0, max: 2.5, step: 0.02 },

    { section: '猎物原型额外倍率', sectionDesc: '如果你想只拉快某一类猎物，不想把全场都提速，就拧这里。', defaultOpen: false },
    { key: 'gameplayPreyArchetypeDefaultSpeedMul', label: '默认型配速', desc: 'runner / hunter 这类默认 archetype 的额外速度倍率。', min: 0.3, max: 3, step: 0.02 },
    { key: 'gameplayPreyArchetypeSchoolSpeedMul', label: 'School 配速', desc: '群居 prey 的额外速度倍率。', min: 0.3, max: 3, step: 0.02 },
    { key: 'gameplayPreyArchetypeBulwarkSpeedMul', label: 'Bulwark 配速', desc: 'bulwark 的额外速度倍率。', min: 0.3, max: 3, step: 0.02 },
    { key: 'gameplayPreyArchetypeWeakspotSpeedMul', label: 'Weakspot 配速', desc: 'weakspot 的额外速度倍率。', min: 0.3, max: 3, step: 0.02 },
    { key: 'gameplayPreyArchetypeApexSpeedMul', label: 'Apex 配速', desc: 'apex 的额外速度倍率。', min: 0.3, max: 3, step: 0.02 },
    { key: 'gameplayPreyArchetypeObjectiveSpeedMul', label: 'Objective 配速', desc: '所有 objective prey 额外再吃一层速度倍率。', min: 0.3, max: 3, step: 0.02 },

    { section: '玩家相位压迫基线', sectionDesc: '这一组不是猎物自己跑多快，而是它怎么看待你当前的移动模式。', defaultOpen: false },
    { key: 'gameplayPreyPhaseAggroStable', label: 'Stable 压迫', desc: '玩家在 stable 相位时，对猎物的压迫值。', min: 0, max: 1.5, step: 0.02 },
    { key: 'gameplayPreyPhaseAggroCruise', label: 'Cruise 压迫', desc: '玩家在 cruise 相位时，对猎物的压迫值。', min: 0, max: 1.5, step: 0.02 },
    { key: 'gameplayPreyPhaseAggroPursuit', label: 'Pursuit 压迫', desc: '玩家在 pursuit 相位时，对猎物的压迫值。', min: 0, max: 1.8, step: 0.02 },
    { key: 'gameplayPreyPhaseAggroHunt', label: 'Hunt 压迫', desc: '玩家在 hunt 相位时，对猎物的压迫值。', min: 0, max: 2, step: 0.02 },
    { key: 'gameplayPreyPhaseAggroBurst', label: 'Burst 压迫', desc: '玩家在 burst 相位时，对猎物的压迫值。', min: 0, max: 2.5, step: 0.02 },

    { section: '压缩 / 绕后判定', sectionDesc: '把“收缩、包围、绕后”这些姿态转成有效伤害前的访问权。' },
    { key: 'gameplayCompressionEncircleAssist', label: '压缩包围补偿', desc: 'encircle 对 compression access 的补偿幅度。', min: 0, max: 1.2, step: 0.01 },
    { key: 'gameplayWeakspotEncircleAssist', label: '弱点包围补偿', desc: 'encircle 对 weakspot access 的补偿幅度。', min: 0, max: 1.5, step: 0.01 },
    { key: 'gameplayWeakspotCompressionAssist', label: '弱点压缩补偿', desc: 'compression 对 weakspot access 的补偿幅度。', min: 0, max: 1, step: 0.01 },

    { section: '猎物受击乘区', sectionDesc: '不同 archetype 被咬到时的核心伤害公式。' },
    { key: 'gameplayBulwarkBaseDamage', label: 'Bulwark 基础乘区', desc: '没压开前最低也能打进去多少。', min: 0, max: 1, step: 0.01 },
    { key: 'gameplayBulwarkCompressionDamage', label: 'Bulwark 压缩乘区', desc: 'compressionAccess 对 bulwark 的伤害贡献。', min: 0, max: 2, step: 0.01 },
    { key: 'gameplayBulwarkEncircleDamage', label: 'Bulwark 包围乘区', desc: 'encircle 对 bulwark 的伤害贡献。', min: 0, max: 1, step: 0.01 },
    { key: 'gameplayBulwarkFeedCompressionGate', label: 'Bulwark 吞食压缩门槛', desc: 'feed 模式下，低于这个压缩度会被罚。', min: 0, max: 1, step: 0.01 },
    { key: 'gameplayBulwarkFeedPenalty', label: 'Bulwark 吞食惩罚', desc: '未压开时 feed 模式的伤害倍率。', min: 0, max: 1, step: 0.01 },
    { key: 'gameplayWeakspotBaseDamage', label: 'Weakspot 基础乘区', desc: '没打中弱点时仍保留多少伤害。', min: 0, max: 1, step: 0.01 },
    { key: 'gameplayWeakspotWeakArcDamage', label: 'Weakspot 弱点乘区', desc: 'weakAccess 对 weakspot 的伤害贡献。', min: 0, max: 2, step: 0.01 },
    { key: 'gameplayWeakspotFeedGate', label: 'Weakspot 吞食弱点门槛', desc: 'feed 模式下低于这个 weakAccess 会被罚。', min: 0, max: 1, step: 0.01 },
    { key: 'gameplayWeakspotFeedPenalty', label: 'Weakspot 吞食惩罚', desc: '没咬到弱点时 feed 模式的伤害倍率。', min: 0, max: 1, step: 0.01 },
    { key: 'gameplayApexBaseDamage', label: 'Apex 基础乘区', desc: 'apex 最低保底伤害。', min: 0, max: 1, step: 0.01 },
    { key: 'gameplayApexCompressionDamage', label: 'Apex 压缩乘区', desc: 'compressionAccess 对 apex 的伤害贡献。', min: 0, max: 2, step: 0.01 },
    { key: 'gameplayApexWeakspotDamage', label: 'Apex 弱点乘区', desc: 'weakAccess 对 apex 的伤害贡献。', min: 0, max: 2, step: 0.01 },
    { key: 'gameplayApexEncircleDamage', label: 'Apex 包围乘区', desc: 'encircle 对 apex 的伤害贡献。', min: 0, max: 1, step: 0.01 },
    { key: 'gameplayApexFeedCompressionGate', label: 'Apex 吞食压缩门槛', desc: 'feed 模式对 apex 的 compression 门槛。', min: 0, max: 1, step: 0.01 },
    { key: 'gameplayApexFeedWeakGate', label: 'Apex 吞食弱点门槛', desc: 'feed 模式对 apex 的 weakAccess 门槛。', min: 0, max: 1, step: 0.01 },
    { key: 'gameplayApexFeedPenalty', label: 'Apex 吞食惩罚', desc: '门槛未达成时的 apex 伤害倍率。', min: 0, max: 1, step: 0.01 },
    { key: 'gameplayObjectiveCutterBase', label: 'Objective 基础乘区', desc: 'objective 目标默认基础伤害倍率。', min: 0, max: 2, step: 0.01 },
    { key: 'gameplayObjectiveCutterPerCount', label: 'Objective 刀口加成', desc: 'cutterCount 对 objective 的额外伤害贡献。', min: 0, max: 1, step: 0.01 },

    { category: '🧪 调试与可视化' },

    { section: '大调试栏目', sectionDesc: '统一查看鼠标距离圈层、移动趋势和镜头前探。总开关关掉后，下面所有可视化都会停用。', defaultOpen: true },
    { key: 'debugPauseOnTuningOpen', label: '打开调参自动暂停', desc: '展开调参面板时自动暂停游戏；收起后若是它触发的暂停会自动恢复。', type: 'toggle' },
    { key: 'showFpsCounter', label: '显示帧率', desc: '在左上角显示实时 FPS 和当前帧耗时。', type: 'toggle' },
    { key: 'showTelemetryOverlay', label: '显示追逃埋点', desc: '在左上角额外显示集群速度档位、当前规模和 prey chase 统计。', type: 'toggle' },
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

const MINIMAL_RENDER_TOGGLE_KEYS = [
    'graphicsRenderHudEnabled',
    'graphicsRenderWorldGridEnabled',
    'graphicsRenderPreySignalsEnabled',
    'graphicsRenderPreyDamageOverlaysEnabled',
    'graphicsRenderPreyAttachmentMarksEnabled',
    'graphicsRenderPreyAttachmentHaloEnabled',
    'graphicsRenderPredationLinksEnabled',
    'graphicsRenderFormationGlowEnabled'
];

function applyMinimalRenderMode(enabled, allRows = []) {
    const nextValue = !!enabled;
    MINIMAL_RENDER_TOGGLE_KEYS.forEach((key) => {
        window.TUNING[key] = !nextValue;
    });

    allRows.forEach((row) => {
        if (MINIMAL_RENDER_TOGGLE_KEYS.includes(row.key)) {
            row.sync();
        }
    });
}

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
//  当前默认基线：来自 tuning-profile.json（含一次性历史迁移结果）
// ═══════════════════════════════════════════════════════════════
const TUNING_DEFAULTS = cloneTuningProfile(window.TUNING);

function isTuningPanelOpen() {
    const panel = document.getElementById('tuning-panel');
    return !!panel && !panel.classList.contains('collapsed');
}

function syncTuningPanelState() {
    const isOpen = isTuningPanelOpen();
    window.activeScene?.setDebugMenuOpen?.(isOpen);
    return isOpen;
}

function applyImmediateTuningEffects(changedKey = '') {
    if (!changedKey || changedKey === 'debugPauseOnTuningOpen') {
        syncTuningPanelState();
    }

    if (!changedKey || changedKey === 'gameplayInfiniteEnergy') {
        window.activeScene?.ensureRunProgressionState?.();
        if (window.activeScene?.isInfiniteEnergyEnabled?.()) {
            window.activeScene.syncInfiniteEnergyState?.();
        }
    }

    if (!changedKey || changedKey === 'showFpsCounter') {
        const fps = window.activeScene?.game?.loop?.actualFps || 60;
        window.activeScene?.updateFpsOverlay?.(1000 / Math.max(1, fps));
    }
}

window.isTuningPanelOpen = isTuningPanelOpen;
window.syncTuningPanelState = syncTuningPanelState;

// ═══════════════════════════════════════════════════════════════
//  构建面板 UI
// ═══════════════════════════════════════════════════════════════

function buildTuningPanel() {
    if (document.getElementById('tuning-panel')) {
        return;
    }

    // ─── 注入 CSS ─────────────────────────────────
    const existingStyle = document.getElementById('tuning-panel-style');
    if (existingStyle) {
        existingStyle.remove();
    }
    const style = document.createElement('style');
    style.id = 'tuning-panel-style';
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
            gap: 12px;
        }
        #tuning-header h2 {
            margin: 0;
            font-size: 15px;
            font-weight: 600;
            color: #36d6ff;
            letter-spacing: 1px;
        }
        #tuning-header .header-title-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 0;
        }
        #tuning-compare-status {
            color: rgba(200, 223, 230, 0.68);
            font-size: 11px;
            line-height: 1.3;
        }
        #tuning-compare-status.modified {
            color: #ffd147;
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
    toggle.textContent = '⚙ 开发调参';
    const setPanelCollapsed = (collapsed) => {
        panel.classList.toggle('collapsed', collapsed);
        syncTuningPanelState();
    };
    toggle.addEventListener('click', () => {
        setPanelCollapsed(isTuningPanelOpen());
    });

    // ─── Header ───────────────────────────────────
    const header = document.createElement('div');
    header.id = 'tuning-header';
    header.innerHTML = `
        <div class="header-title-group">
            <h2>开发调参与编辑控制</h2>
            <div id="tuning-compare-status">正在读取基线…</div>
        </div>
        <div class="header-btns">
            <button id="tuning-add-node" style="background: rgba(54, 214, 255, 0.12); border-color: rgba(54, 214, 255, 0.35); color: #36d6ff; padding: 4px 12px; font-size: 11px; cursor: pointer; border-radius: 4px; transition: all 0.15s;">➕ 新增节点 (E)</button>
            <button class="apply-btn" id="tuning-write-json">写入 JSON</button>
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
    const compareStatus = header.querySelector('#tuning-compare-status');

    let currentSectionBody = null;

    const allRows = [];
    
    const uiState = { categories: {}, sections: {} };
    const saveUiState = () => {};

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
            currentSectionBody = sectionBody;
            return;
        }

        if (!currentSectionBody) return;

        if (def.type === 'toggle') {
            const row = createToggleRow(def, allRows);
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

    const updateCompareStatus = () => {
        if (!DEV_WRITE_API_AVAILABLE) {
            compareStatus.textContent = '当前是只读模式，请用 start-dev 启动';
            compareStatus.classList.add('modified');
            return;
        }

        const modifiedCount = Object.keys(window.TUNING).reduce((count, key) => {
            const current = window.TUNING[key];
            const baseline = TUNING_DEFAULTS[key];
            if (typeof current === 'number' && typeof baseline === 'number') {
                return count + (Math.abs(current - baseline) > 0.0001 ? 1 : 0);
            }
            return count + (current !== baseline ? 1 : 0);
        }, 0);
        compareStatus.textContent = modifiedCount > 0 ? `当前相对基线改动 ${modifiedCount} 项` : '当前与 JSON 基线一致';
        compareStatus.classList.toggle('modified', modifiedCount > 0);
    };

    window.addEventListener('tuning:changed', updateCompareStatus);
    updateCompareStatus();

    // ─── 搜索 ─────────────────────────────────────
    
    setInterval(() => {
        if (window.TUNING.autoPulseOrbCount) {
             const orbRow = allRows.find(r => r.key === 'pulseOrbCount');
             if (orbRow) {
                 orbRow.sync(); // sync display with current auto value
             }
        }
        updateCompareStatus();
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
        applyImmediateTuningEffects();
        window.dispatchEvent(new CustomEvent('tuning:changed'));
    });

    document.getElementById('tuning-write-json').addEventListener('click', async () => {
        const btn = document.getElementById('tuning-write-json');
        btn.disabled = true;
        const ok = await writeTuningProfileToRepo();
        if (!ok) {
            btn.textContent = '写入失败';
            setTimeout(() => {
                btn.textContent = '写入 JSON';
                btn.disabled = false;
            }, 1500);
            return;
        }

        Object.keys(TUNING_DEFAULTS).forEach((key) => {
            TUNING_DEFAULTS[key] = window.TUNING[key];
        });
        allRows.forEach((row) => row.sync());
        window.dispatchEvent(new CustomEvent('tuning:changed'));
        clearLegacyLocalTuningProfile();

        btn.textContent = '✅ 已写入';
        setTimeout(() => {
            btn.textContent = '写入 JSON';
            btn.disabled = false;
        }, 1500);
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
            setPanelCollapsed(isTuningPanelOpen());
            e.preventDefault();
        }
    });

    syncTuningPanelState();
}

function createToggleRow(def, allRows = []) {
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
        if (def.key === 'graphicsMinimalRenderMode') {
            applyMinimalRenderMode(checkbox.checked, allRows);
        }
        applyImmediateTuningEffects(def.key);
        row.classList.toggle('modified', checkbox.checked !== TUNING_DEFAULTS[def.key]);
        window.dispatchEvent(new CustomEvent('tuning:changed'));
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
        window.dispatchEvent(new CustomEvent('tuning:changed'));
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
if (window.CORE_DEMO_DEBUG !== false) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildTuningPanel);
    } else {
        buildTuningPanel();
    }
}

