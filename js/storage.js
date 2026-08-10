// Session cache — stores the current logged-in user in localStorage
// for fast page loads. The source of truth is the database.

function readJson(key) {
    if (!key) return null;

    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    } catch (_) {
        localStorage.removeItem(key);
        return null;
    }
}

function writeJson(key, value) {
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(value));
}

export function setCurrentSession(userData) {
    writeJson('agrifarmers_user', userData);
}

export function getCurrentSession() {
    return readJson('agrifarmers_user');
}

export function clearCurrentSession() {
    localStorage.removeItem('agrifarmers_user');
}