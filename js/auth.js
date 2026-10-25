import {
    setCurrentSession,
    getCurrentSession,
    clearCurrentSession
} from './storage.js';

let activePhoneNumber = null;
let pendingSignupData = null;

function getMobileNumber(phoneStr) {
    if (!phoneStr) return '';
    return String(phoneStr).replace(/\D/g, '').slice(-10);
}

function toE164PhoneNumber(phoneStr) {
    if (!phoneStr) return '';

    const trimmed = String(phoneStr).trim();
    const digits = trimmed.replace(/\D/g, '');

    if (trimmed.startsWith('+')) {
        return `+${digits}`;
    }

    if (digits.length === 10) {
        return `+91${digits}`;
    }

    if (digits.length === 12 && digits.startsWith('91')) {
        return `+${digits}`;
    }

    return '';
}

function maskPhoneNumber(phoneNumber) {
    const normalized = toE164PhoneNumber(phoneNumber);
    const mobile = getMobileNumber(normalized);

    if (!mobile) return 'your mobile number';
    return `+91 ******${mobile.slice(-4)}`;
}

let activeOtpToken = null;
let activeSessionToken = null;

function getAuthHeaders() {
    const session = getCurrentSession();
    const token = activeSessionToken || session?.sessionToken || '';
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

function getOtpApiBaseUrl() {
    const configuredBaseUrl = window.AGRIFARMERS_CONFIG?.otpApiBaseUrl || '';
    return configuredBaseUrl.replace(/\/+$/, '');
}

async function postOtpRequest(endpoint, payload) {
    const bodyPayload = { ...payload };
    if (endpoint === 'verify' && activeOtpToken && !bodyPayload.otpToken) {
        bodyPayload.otpToken = activeOtpToken;
    }

    const response = await fetch(`${getOtpApiBaseUrl()}/api/otp/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bodyPayload)
    });

    let result = {};
    try {
        result = await response.json();
    } catch (_) {}

    if (result.otpToken) {
        activeOtpToken = result.otpToken;
    }
    if (result.sessionToken) {
        activeSessionToken = result.sessionToken;
    }

    if (!response.ok) {
        throw new Error(result.message || result.error || 'OTP request failed. Please try again.');
    }

    return result;
}

// ─── User API helpers ─────────────────────────────────────────────────────────

async function apiGetUser(mobile) {
    const response = await fetch(`${getOtpApiBaseUrl()}/api/users/${mobile}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
    });
    if (response.status === 404) return null;
    if (response.status === 401 || response.status === 403) {
        const err = new Error('Authentication required');
        err.statusCode = response.status;
        throw err;
    }
    if (!response.ok) throw new Error('Failed to fetch user profile.');
    const data = await response.json();
    return data.user || null;
}

async function apiCreateUser(profile) {
    const response = await fetch(`${getOtpApiBaseUrl()}/api/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(profile)
    });

    let data = {};
    try { data = await response.json(); } catch (_) {}

    if (!response.ok) {
        throw new Error(data.message || 'Failed to create user profile.');
    }

    return data.user;
}

async function apiUpdateLogin(mobile) {
    const response = await fetch(`${getOtpApiBaseUrl()}/api/users/${mobile}/login`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include'
    });

    let data = {};
    try { data = await response.json(); } catch (_) {}

    if (!response.ok) {
        throw new Error(data.message || 'Failed to update login timestamp.');
    }

    return data.user;
}

// ─── OTP flash helper ─────────────────────────────────────────────────────────

function flashOtpInputs() {
    document.querySelectorAll('.otp-digit').forEach(input => {
        input.classList.add('border-red-500', 'bg-red-50');
        setTimeout(() => input.classList.remove('border-red-500', 'bg-red-50'), 1000);
    });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendOTPWithTextBee(phoneNumber) {
    activePhoneNumber = toE164PhoneNumber(phoneNumber);

    if (!activePhoneNumber || !/^\+[1-9]\d{9,14}$/.test(activePhoneNumber)) {
        if (window.showToast) window.showToast('Please enter a valid mobile number.', 'error');
        return false;
    }

    try {
        await postOtpRequest('send', { phoneNumber: activePhoneNumber });
        if (window.showToast) window.showToast(`OTP sent to ${maskPhoneNumber(activePhoneNumber)}.`, 'success');
        return true;
    } catch (error) {
        console.error('TextBee OTP send error:', error);
        if (window.showToast) window.showToast(error.message, 'error');
        return false;
    }
}

export async function verifyOTPWithTextBee(otpCode) {
    const entered = (otpCode || '').trim();

    if (!/^\d{6}$/.test(entered)) {
        if (window.showToast) window.showToast('Please enter a valid 6-digit OTP.', 'error');
        flashOtpInputs();
        return false;
    }

    const phoneNumber = activePhoneNumber || toE164PhoneNumber(pendingSignupData?.mobile);
    const cleanMobile = getMobileNumber(phoneNumber);

    if (!phoneNumber || !cleanMobile) {
        if (window.showToast) window.showToast('Mobile number missing. Please try again.', 'error');
        return false;
    }

    // Verify the OTP with the server
    let verifyResult = {};
    try {
        verifyResult = await postOtpRequest('verify', { phoneNumber, otp: entered });
    } catch (error) {
        console.error('TextBee OTP verification error:', error);
        if (window.showToast) window.showToast(error.message, 'error');
        flashOtpInputs();
        return false;
    }

    // OTP verified — now handle signup vs login
    try {
        let profile = null;

        if (pendingSignupData) {
            // Signup: create user in database
            profile = await apiCreateUser({
                uid:      `user_${cleanMobile}`,
                mobile:   cleanMobile,
                name:     pendingSignupData.name,
                state:    pendingSignupData.state    || null,
                district: pendingSignupData.district || null,
                location: pendingSignupData.location || null
            });
            pendingSignupData = null;

            if (window.showToast) window.showToast(`Account created successfully! Welcome, ${profile.name}!`, 'success');
        } else {
            // Login: fetch user from database
            profile = await apiGetUser(cleanMobile);

            if (!profile) {
                if (window.showToast) window.showToast(`No account found for ${maskPhoneNumber(phoneNumber)}. Please sign up.`, 'error');
                if (window.showPage) window.showPage('signUpPage');
                return false;
            }

            // Update last_login in DB (best-effort, don't block on failure)
            apiUpdateLogin(cleanMobile)
                .then(updated => { if (updated) profile = updated; })
                .catch(err => console.warn('Failed to update last_login:', err.message));

            if (window.showToast) window.showToast(`Welcome back, ${profile.name}!`, 'success');
        }

        if (verifyResult.sessionToken) {
            profile.sessionToken = verifyResult.sessionToken;
            activeSessionToken = verifyResult.sessionToken;
        }

        window.currentUser = profile;
        setCurrentSession(profile);

        if (window.updateUserInfo) window.updateUserInfo();
        if (window.getUserLocation) window.getUserLocation();
        if (window.showPage) window.showPage('homePage');
        return true;

    } catch (error) {
        console.error('OTP verification profile error:', error);
        if (window.showToast) window.showToast(error.message || 'Authentication error. Please try again.', 'error');
        return false;
    }
}

export function setPendingSignupData(data) {
    pendingSignupData = data;
}

export function signOutUser() {
    activeSessionToken = null;
    window.currentUser = null;
    clearCurrentSession();
}

export async function apiUpdateLocation(mobile, locationPayload) {
    try {
        const response = await fetch(`${getOtpApiBaseUrl()}/api/users/${mobile}/location`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify(locationPayload)
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.user || null;
    } catch (err) {
        console.warn('apiUpdateLocation notice:', err.message);
        return null;
    }
}

window._updateUserLocation = apiUpdateLocation;

export function initAuthListener() {
    const savedUser = getCurrentSession();
    if (!savedUser) return;

    if (savedUser.sessionToken) {
        activeSessionToken = savedUser.sessionToken;
    }

    window.currentUser = savedUser;

    // Fetch fresh profile from server in background to sync mobile GPS to laptop
    if (savedUser.mobile && /^\d{10}$/.test(savedUser.mobile)) {
        apiGetUser(savedUser.mobile).then(freshUser => {
            if (freshUser) {
                if (window.cleanLocationName) {
                    if (freshUser.district) freshUser.district = window.cleanLocationName(freshUser.district);
                    if (freshUser.locationName) freshUser.locationName = window.cleanLocationName(freshUser.locationName);
                    if (freshUser.location) {
                        if (freshUser.location.formatted) freshUser.location.formatted = window.cleanLocationName(freshUser.location.formatted);
                        if (freshUser.location.city) freshUser.location.city = window.cleanLocationName(freshUser.location.city);
                    }
                }
                window.currentUser = freshUser;
                setCurrentSession(freshUser);
                if (freshUser.location && freshUser.location.lat && freshUser.location.lon) {
                    window.userLocation = freshUser.location;
                    if (window.renderLocationUI) window.renderLocationUI(freshUser.location, true);
                    if (window.loadWeatherData) window.loadWeatherData(freshUser.location.lat, freshUser.location.lon, freshUser.location.formatted);
                    window.dispatchEvent(new CustomEvent('agrifarmers:location-updated', { detail: freshUser.location }));
                }
            }
        }).catch(err => console.warn('Background profile sync notice:', err.message));
    }

    if (window.updateUserInfo) window.updateUserInfo();
    if (window.showPage) window.showPage('homePage');
}