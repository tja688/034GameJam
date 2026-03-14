const STORAGE_WRITE_JSON_ENDPOINT = '/__api/write-json';

const REPO_JSON_STORAGE_MAP = {
    [STORAGE_KEYS.saveSlot]: 'save-slot.json',
    [STORAGE_KEYS.audioProfile]: 'audio-profile.json'
};

function canUseRepoJsonStorage() {
    const protocol = window.location?.protocol || '';
    return protocol === 'http:' || protocol === 'https:';
}

function buildCacheBypassUrl(filePath) {
    const stamp = Date.now();
    return `${filePath}?_ts=${stamp}`;
}

function readRepoJson(filePath) {
    if (!canUseRepoJsonStorage()) {
        return null;
    }

    try {
        const request = new XMLHttpRequest();
        request.open('GET', buildCacheBypassUrl(filePath), false);
        request.send(null);

        if (request.status === 404) {
            return null;
        }

        const readable = request.status === 200 || (request.status === 0 && !!request.responseText);
        if (!readable || !request.responseText) {
            return null;
        }

        return JSON.parse(request.responseText);
    } catch (error) {
        console.warn(`Failed to read repo json "${filePath}"`, error);
        return null;
    }
}

function writeRepoJson(filePath, value) {
    if (!canUseRepoJsonStorage()) {
        console.warn('JSON storage unavailable in file:// mode. Please start with start-dev script.');
        return false;
    }

    try {
        const request = new XMLHttpRequest();
        request.open('POST', STORAGE_WRITE_JSON_ENDPOINT, false);
        request.setRequestHeader('Content-Type', 'application/json');
        request.send(JSON.stringify({
            file: filePath,
            data: value
        }));

        return request.status >= 200 && request.status < 300;
    } catch (error) {
        console.warn(`Failed to write repo json "${filePath}"`, error);
        return false;
    }
}

function readLegacyLocalStorageJson(key) {
    try {
        const raw = window.localStorage?.getItem(key);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw);
    } catch (error) {
        console.warn(`Failed to read legacy localStorage key "${key}"`, error);
        return null;
    }
}

function clearLegacyLocalStorageJson(key) {
    try {
        window.localStorage?.removeItem(key);
    } catch (error) {
        console.warn(`Failed to clear legacy localStorage key "${key}"`, error);
    }
}

function readStoredJson(key) {
    const filePath = REPO_JSON_STORAGE_MAP[key];
    if (!filePath) {
        return null;
    }

    const repoData = readRepoJson(filePath);
    if (repoData !== null) {
        return repoData;
    }

    const legacyData = readLegacyLocalStorageJson(key);
    if (legacyData === null) {
        return null;
    }

    if (writeRepoJson(filePath, legacyData)) {
        clearLegacyLocalStorageJson(key);
        console.info(`Migrated legacy localStorage key "${key}" into ${filePath}.`);
    }
    return legacyData;
}

function writeStoredJson(key, value) {
    const filePath = REPO_JSON_STORAGE_MAP[key];
    if (!filePath) {
        return false;
    }

    const ok = writeRepoJson(filePath, value);
    if (ok) {
        clearLegacyLocalStorageJson(key);
    }
    return ok;
}

function formatSaveTimestamp(timestamp) {
    if (!Number.isFinite(timestamp)) {
        return '未知时间';
    }

    try {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(new Date(timestamp));
    } catch (error) {
        return new Date(timestamp).toLocaleString();
    }
}
