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

    if (!response.ok) {
        throw new Error(result.message || result.error || 'OTP request failed. Please try again.');
    }

    return result;
}

// ─── User API helpers ─────────────────────────────────────────────────────────

async function apiGetUser(mobile) {
    const response = await fetch(`${getOtpApiBaseUrl()}/api/users/${mobile}`, {
        credentials: 'include'
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch user profile.');
    const data = await response.json();
    return data.user || null;
}

async function apiCreateUser(profile) {
    const response = await fetch(`${getOtpApiBaseUrl()}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    try {
        await postOtpRequest('verify', { phoneNumber, otp: entered });
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
    window.currentUser = null;
    clearCurrentSession();
}

export function initAuthListener() {
    const savedUser = getCurrentSession();
    if (!savedUser) return;

    window.currentUser = savedUser;
    if (window.updateUserInfo) window.updateUserInfo();
    if (window.showPage) window.showPage('homePage');
}