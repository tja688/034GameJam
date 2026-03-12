function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function damp(current, target, rate, dt) {
    return Phaser.Math.Linear(current, target, 1 - Math.exp(-rate * dt));
}

function lerpAngle(current, target, t) {
    return current + Phaser.Math.Angle.Wrap(target - current) * t;
}

function dampAngle(current, target, rate, dt) {
    return lerpAngle(current, target, 1 - Math.exp(-rate * dt));
}

function normalize(x, y, fallbackX = 0, fallbackY = 0) {
    const length = Math.hypot(x, y);
    if (length < 0.0001) {
        return { x: fallbackX, y: fallbackY, length: 0 };
    }
    return { x: x / length, y: y / length, length };
}

function vectorFromAngle(angle) {
    return { x: Math.cos(angle), y: Math.sin(angle) };
}

function rotateLocal(x, y, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: x * cos - y * sin, y: x * sin + y * cos };
}

function angleDistance(a, b) {
    return Math.abs(Phaser.Math.Angle.Wrap(a - b));
}

function distanceToSegmentSquared(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const lengthSq = abx * abx + aby * aby;
    if (lengthSq <= 0.0001) {
        const dx = px - ax;
        const dy = py - ay;
        return dx * dx + dy * dy;
    }

    const t = clamp(((px - ax) * abx + (py - ay) * aby) / lengthSq, 0, 1);
    const closestX = ax + abx * t;
    const closestY = ay + aby * t;
    const dx = px - closestX;
    const dy = py - closestY;
    return dx * dx + dy * dy;
}

function polygonPoints(x, y, radius, sides, rotation) {
    const points = [];
    for (let i = 0; i < sides; i += 1) {
        const angle = rotation + (Math.PI * 2 * i) / sides;
        points.push(new Phaser.Geom.Point(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius));
    }
    return points;
}

function drawShape(graphics, shape, x, y, size, color, alpha, rotation = 0) {
    graphics.fillStyle(color, alpha);
    if (shape === 'circle') {
        graphics.fillCircle(x, y, size * 0.5);
        return;
    }
    if (shape === 'square') {
        graphics.fillPoints(polygonPoints(x, y, size * 0.78, 4, rotation + Math.PI * 0.25), true);
        return;
    }
    graphics.fillPoints(polygonPoints(x, y, size * 0.82, 3, rotation - Math.PI * 0.5), true);
}

function getChainMass(count) {
    if (MASS_BY_COUNT[count]) {
        return MASS_BY_COUNT[count];
    }
    return 1.72 + (count - 6) * 0.14;
}

function getChainSpan(count) {
    if (CHAIN_SPAN_BY_COUNT[count]) {
        return CHAIN_SPAN_BY_COUNT[count];
    }
    return 310 + (count - 6) * 42;
}

function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
}

function getFiniteNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
}

function blendColor(colorA, colorB, t) {
    const mix = clamp(t, 0, 1);
    const from = Phaser.Display.Color.ValueToColor(colorA);
    const to = Phaser.Display.Color.ValueToColor(colorB);
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, Math.round(mix * 100));
    return Phaser.Display.Color.GetColor(color.r, color.g, color.b);
}

function makeSpatialHashKey(cellX, cellY) {
    return `${cellX}:${cellY}`;
}

function buildSpatialHash(items, cellSize = 160, getX = (item) => item.x, getY = (item) => item.y) {
    const size = Math.max(1, cellSize);
    const cells = new Map();

    (Array.isArray(items) ? items : []).forEach((item) => {
        const x = getX(item);
        const y = getY(item);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return;
        }
        const cellX = Math.floor(x / size);
        const cellY = Math.floor(y / size);
        const key = makeSpatialHashKey(cellX, cellY);
        if (!cells.has(key)) {
            cells.set(key, []);
        }
        cells.get(key).push(item);
    });

    return {
        cellSize: size,
        cells,
        getX,
        getY
    };
}

function querySpatialHash(hash, x, y, radius, predicate = null) {
    if (!hash?.cells || !Number.isFinite(x) || !Number.isFinite(y)) {
        return [];
    }

    const size = Math.max(1, hash.cellSize || 1);
    const minCellX = Math.floor((x - radius) / size);
    const maxCellX = Math.floor((x + radius) / size);
    const minCellY = Math.floor((y - radius) / size);
    const maxCellY = Math.floor((y + radius) / size);
    const results = [];

    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
            const items = hash.cells.get(makeSpatialHashKey(cellX, cellY));
            if (!items) {
                continue;
            }
            for (let i = 0; i < items.length; i += 1) {
                const item = items[i];
                if (predicate && !predicate(item)) {
                    continue;
                }
                results.push(item);
            }
        }
    }

    return results;
}

