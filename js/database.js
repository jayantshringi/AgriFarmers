function getMobileKey(identifier) {
    if (!identifier) return '';
    return String(identifier).replace(/\D/g, '').slice(-10);
}

function getProfileStorageKey(identifier) {
    const mobileKey = getMobileKey(identifier);
    return mobileKey ? `agrifarmers_profile_${mobileKey}` : '';
}

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

export function saveUserProfile(identifier, userData) {
    const mobileKey = getMobileKey(userData?.mobile || identifier);
    if (!mobileKey) return null;

    const existingProfile = getUserProfile(mobileKey);
    const now = new Date().toISOString();
    const profile = {
        ...existingProfile,
        ...userData,
        uid: userData?.uid || existingProfile?.uid || `user_${mobileKey}`,
        mobile: mobileKey,
        createdAt: existingProfile?.createdAt || now,
        updatedAt: now,
        lastLogin: now
    };

    writeJson(getProfileStorageKey(mobileKey), profile);
    return profile;
}

export function getUserProfile(identifier) {
    return readJson(getProfileStorageKey(identifier));
}

export function updateLastLogin(identifier) {
    const profile = getUserProfile(identifier);
    if (!profile) return null;

    const updatedProfile = {
        ...profile,
        lastLogin: new Date().toISOString()
    };

    writeJson(getProfileStorageKey(identifier), updatedProfile);
    return updatedProfile;
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