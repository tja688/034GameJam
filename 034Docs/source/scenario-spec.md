# Scenario Spec

## Data Shape

```json
{
  "id": "encircle/apex-first-pressure",
  "stageId": "encircle",
  "scene": "MainFlowScene",
  "checkpoint": {
    "playerPreset": "stage-encircle-mid",
    "energy": 0.72,
    "growthCursor": 3,
    "cameraZoom": 0.95
  },
  "encounter": {
    "spawn": [
      { "moduleId": "prey.apex", "preset": "objective-small", "x": 620, "y": 260 }
    ]
  }
}
```

## Entry Paths

当前支持两种快速进入方式：

- URL query：`?scenario=<scenario-id>`
- Dev command layer：按反引号打开命令层

## Scenario Set

当前已接入 8 个 scenario：

- `forage/entry-skittish-pursuit`
- `forage/objective-first-bite`
- `bloom/bulwark-first-pressure`
- `pressure/objective/first-weakspot`
- `pressure/school-pressure-lane`
- `encircle/weakspot-wrap`
- `encircle/apex-first-pressure`
- `saturation/final-apex-overload`

覆盖说明：

- 5 个 stage 都至少有 1 个代表现场
- 已包含“指定 prey + 指定姿态”验证入口
