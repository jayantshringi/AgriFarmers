import {
    saveUserProfile,
    getUserProfile,
    updateLastLogin,
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

function getOtpApiBaseUrl() {
    const configuredBaseUrl = window.AGRIFARMERS_CONFIG?.otpApiBaseUrl || '';
    return configuredBaseUrl.replace(/\/+$/, '');
}

async function postOtpRequest(endpoint, payload) {
    const response = await fetch(`${getOtpApiBaseUrl()}/api/otp/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    let result = {};
    try {
        result = await response.json();
    } catch (_) {}

    if (!response.ok) {
        throw new Error(result.message || result.error || 'OTP request failed. Please try again.');
    }

    return result;
}

function flashOtpInputs() {
    document.querySelectorAll('.otp-digit').forEach(input => {
        input.classList.add('border-red-500', 'bg-red-50');
        setTimeout(() => input.classList.remove('border-red-500', 'bg-red-50'), 1000);
    });
}

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

    try {
        await postOtpRequest('verify', { phoneNumber, otp: entered });
    } catch (error) {
        console.error('TextBee OTP verification error:', error);
        if (window.showToast) window.showToast(error.message, 'error');
        flashOtpInputs();
        return false;
    }

    try {
        const existingUser = getUserProfile(cleanMobile);

        if (pendingSignupData) {
            const newProfile = saveUserProfile(cleanMobile, {
                uid: `user_${cleanMobile}`,
                ...pendingSignupData,
                mobile: cleanMobile
            });
            window.currentUser = newProfile;
            setCurrentSession(newProfile);
            pendingSignupData = null;

            if (window.showToast) window.showToast(`Account created successfully! Welcome, ${newProfile.name}!`, 'success');
        } else if (existingUser) {
            const updatedUser = updateLastLogin(cleanMobile) || existingUser;
            window.currentUser = updatedUser;
            setCurrentSession(updatedUser);

            if (window.showToast) window.showToast(`Welcome back, ${updatedUser.name}!`, 'success');
        } else {
            if (window.showToast) window.showToast(`No account found for ${maskPhoneNumber(phoneNumber)}. Please sign up.`, 'error');
            if (window.showPage) window.showPage('signUpPage');
            return false;
        }

        if (window.updateUserInfo) window.updateUserInfo();
        if (window.getUserLocation) window.getUserLocation();
        if (window.showPage) window.showPage('homePage');
        return true;
    } catch (error) {
        console.error('OTP verification profile error:', error);
        if (window.showToast) window.showToast('Authentication error. Please try again.', 'error');
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