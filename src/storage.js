function readStoredJson(key) {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw);
    } catch (error) {
        console.warn(`Failed to read storage key "${key}"`, error);
        return null;
    }
}

function writeStoredJson(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn(`Failed to write storage key "${key}"`, error);
        return false;
    }
}

function removeStoredValue(key) {
    try {
        window.localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn(`Failed to remove storage key "${key}"`, error);
        return false;
    }
}

function clearStoredKeys(keys) {
    (Array.isArray(keys) ? keys : []).forEach((key) => {
        if (typeof key === 'string' && key.length > 0) {
            removeStoredValue(key);
        }
    });
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
