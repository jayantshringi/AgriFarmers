function maskPhoneNumber(phoneNumber) {
    const digits = String(phoneNumber || '').replace(/\D/g, '');
    const mobile = digits.slice(-10);

    if (mobile.length !== 10) return 'your mobile number';
    return `+91 ******${mobile.slice(-4)}`;
}

function setOtpPhoneNumber(phoneNumber) {
    const otpNumber = document.getElementById('otpPhoneNumber');
    if (!otpNumber) return;

    otpNumber.textContent = maskPhoneNumber(phoneNumber);
    otpNumber.dataset.phoneNumber = phoneNumber;
}

async function handleLogin() {
    const mobile = document.getElementById('loginMobile')?.value.trim();

    if (!mobile || mobile.length !== 10 || !/^\d+$/.test(mobile)) {
        showToast('Please enter a valid 10-digit mobile number', 'error');
        return;
    }

    window._setPendingSignup(null);

    const btn = document.querySelector('#loginPage button[onclick="handleLogin()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending OTP...'; }

    const phoneNumber = `+91${mobile}`;
    setOtpPhoneNumber(phoneNumber);

    const sent = await window._sendOTP(phoneNumber);

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i><span id="sendOtpBtn">Send OTP</span>'; }

    if (sent) {
        showPage('otpPage');
        window.startOTPTimer?.();
    }
}

async function handleSignUp() {
    const name     = document.getElementById('signUpName')?.value.trim();
    const mobile   = document.getElementById('signUpMobile')?.value.trim();
    const state    = document.getElementById('signUpState')?.value;
    const district = document.getElementById('signUpDistrict')?.value;

    // Validation
    if (!name || name.length < 2) {
        showToast('Please enter a valid name (min 2 characters)', 'error');
        return;
    }
    if (!mobile || mobile.length !== 10 || !/^\d+$/.test(mobile)) {
        showToast('Please enter a valid 10-digit mobile number', 'error');
        return;
    }
    if (!state) {
        showToast('Please select your state', 'error');
        return;
    }
    if (!district) {
        showToast('Please select your district', 'error');
        return;
    }

    const btn = document.querySelector('#signUpPage button[onclick="handleSignUp()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending OTP...'; }

    // Store signup data so auth.js can save it locally after OTP is verified
    window._setPendingSignup({ name, mobile, state, district, location: null });

    const phoneNumber = `+91${mobile}`;
    setOtpPhoneNumber(phoneNumber);

    const sent = await window._sendOTP(phoneNumber);

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus mr-2"></i><span id="signupBtn">Sign Up</span>'; }

    if (sent) {
        showPage('otpPage');
        window.startOTPTimer?.();
    }
}

async function verifyOTP() {
    const otpInputs = document.querySelectorAll('.otp-digit');
    let enteredOTP  = '';
    otpInputs.forEach(input => { enteredOTP += input.value || ''; });

    if (enteredOTP.length !== 6) {
        showToast('Please enter the complete 6-digit OTP', 'error');
        return;
    }

    const btn = document.querySelector('#otpPage button[onclick="verifyOTP()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Verifying...'; }

    await window._verifyOTP(enteredOTP);

    // Re-enable button in case of failure (success navigates away)
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle mr-2"></i><span id="verifyOtpBtn">Verify OTP</span>'; }
}

async function resendOTP() {
    const otpNumber = document.getElementById('otpPhoneNumber');
    const phoneNumber = otpNumber?.dataset.phoneNumber || '';
    const phoneText = otpNumber?.textContent || maskPhoneNumber(phoneNumber);

    if (!phoneNumber || phoneNumber.length < 10) {
        showToast('Phone number not found. Please go back and try again.', 'error');
        return;
    }

    window.clearOTPTimer?.();
    document.querySelectorAll('.otp-digit').forEach(input => { input.value = ''; });
    const firstInput = document.querySelector('.otp-digit');
    if (firstInput) firstInput.focus();

    const btn = document.getElementById('resendOTP');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

    const sent = await window._sendOTP(phoneNumber);

    if (sent) {
        window.startOTPTimer?.();
        showToast('New OTP sent to ' + phoneText, 'success');
    }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-redo mr-1"></i><span id="resendOtpBtn">Resend OTP</span>'; }
}

window.handleLogin = handleLogin;
window.handleSignUp = handleSignUp;
window.verifyOTP = verifyOTP;
window.resendOTP = resendOTP;
