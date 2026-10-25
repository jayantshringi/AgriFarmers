/**
 * AgriFarmers — TextBee SMS OTP Service & Verification Routes
 * Modular route handler for /api/otp/send and /api/otp/verify
 */

const crypto = require('node:crypto');

// In-memory state for local standalone Node server sessions
const otpStore = new Map();
const sendHistory = new Map();
const verifyHistory = new Map();

function createOtpHandler(config, helpers) {
    const {
        TEXTBEE_API_KEY = '',
        TEXTBEE_DEVICE_ID = '',
        OTP_SECRET = 'development-otp-secret',
        OTP_TTL_SECONDS = 120,
        OTP_RESEND_SECONDS = 30,
        OTP_MAX_ATTEMPTS = 5,
        OTP_MAX_SENDS_PER_HOUR = 5,
        TEXTBEE_SIM_SUBSCRIPTION_ID
    } = config;

    const { sendJson, readJsonBody, createHttpError } = helpers;

    // ── Phone validation ────────────────────────────────────────────────────────

    function normalizePhoneNumber(phoneNumber) {
        if (!phoneNumber) return '';
        const trimmed = String(phoneNumber).trim();
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

    function validatePhoneNumber(phoneNumber) {
        const normalized = normalizePhoneNumber(phoneNumber);
        if (!/^\+[1-9]\d{9,14}$/.test(normalized)) {
            throw createHttpError(400, 'Enter a valid phone number in E.164 format.');
        }
        return normalized;
    }

    function validateOtp(otp) {
        const normalized = String(otp || '').trim();
        if (!/^\d{6}$/.test(normalized)) {
            throw createHttpError(400, 'Enter a valid 6-digit OTP.');
        }
        return normalized;
    }

    // ── Cryptographic hashing & stateless tokens ────────────────────────────────

    function hashOtp(phoneNumber, otp, salt) {
        return crypto
            .createHmac('sha256', OTP_SECRET)
            .update(`${phoneNumber}:${otp}:${salt}`)
            .digest('hex');
    }

    function compareHash(firstHash, secondHash) {
        const first = Buffer.from(firstHash, 'hex');
        const second = Buffer.from(secondHash, 'hex');
        return first.length === second.length && crypto.timingSafeEqual(first, second);
    }

    function createSignedOtpToken(phoneNumber, otp, salt, expiresAt) {
        const payload = `${phoneNumber}|${expiresAt}|${salt}|${hashOtp(phoneNumber, otp, salt)}`;
        const signature = crypto.createHmac('sha256', OTP_SECRET).update(payload).digest('hex');
        return Buffer.from(`${payload}|${signature}`).toString('base64url');
    }

    function verifySignedOtpToken(token, phoneNumber, otp, now) {
        try {
            if (!token) return false;
            const decoded = Buffer.from(token, 'base64url').toString('utf8');
            const parts = decoded.split('|');
            if (parts.length !== 5) return false;
            const [tokenPhone, tokenExpiresAtStr, tokenSalt, tokenHash, tokenSig] = parts;
            const tokenExpiresAt = Number(tokenExpiresAtStr);

            const payload = `${tokenPhone}|${tokenExpiresAtStr}|${tokenSalt}|${tokenHash}`;
            const expectedSig = crypto.createHmac('sha256', OTP_SECRET).update(payload).digest('hex');
            if (expectedSig !== tokenSig) return false;

            if (tokenPhone !== phoneNumber) return false;
            if (tokenExpiresAt < now) return false;

            const computedHash = hashOtp(phoneNumber, otp, tokenSalt);
            return compareHash(tokenHash, computedHash);
        } catch (_) {
            return false;
        }
    }

    // ── Session token creation & verification ───────────────────────────────────

    const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

    function createSessionToken(phoneNumber, secret = OTP_SECRET, ttlSeconds = SESSION_TTL_SECONDS) {
        const issuedAt = Date.now();
        const expiresAt = issuedAt + (ttlSeconds * 1000);
        const payload = `${phoneNumber}|${issuedAt}|${expiresAt}`;
        const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
        return Buffer.from(`${payload}|${signature}`).toString('base64url');
    }

    function verifySessionToken(token, expectedPhoneNumber, secret = OTP_SECRET) {
        try {
            if (!token) return false;
            const decoded = Buffer.from(token, 'base64url').toString('utf8');
            const parts = decoded.split('|');
            if (parts.length !== 4) return false;
            const [phone, issuedAt, expiresAtStr, sig] = parts;
            const expiresAt = Number(expiresAtStr);
            if (Date.now() > expiresAt) return false;

            const payload = `${phone}|${issuedAt}|${expiresAtStr}`;
            const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

            const first = Buffer.from(sig, 'hex');
            const second = Buffer.from(expectedSig, 'hex');
            if (first.length !== second.length || !crypto.timingSafeEqual(first, second)) {
                return false;
            }

            if (expectedPhoneNumber) {
                const cleanTarget = expectedPhoneNumber.replace(/\D/g, '').slice(-10);
                const cleanPhone = phone.replace(/\D/g, '').slice(-10);
                if (cleanTarget !== cleanPhone) {
                    return false;
                }
            }

            return { phone, issuedAt: Number(issuedAt), expiresAt };
        } catch (_) {
            return false;
        }
    }

    // ── Rate limiting helpers ───────────────────────────────────────────────────

    function getCookie(req, name) {
        const cookieHeader = req.headers.cookie;
        if (!cookieHeader) return null;
        const cookies = cookieHeader.split(';');
        for (const cookie of cookies) {
            const [k, v] = cookie.trim().split('=');
            if (k === name) return decodeURIComponent(v);
        }
        return null;
    }

    function getClientIp(req) {
        const forwardedFor = req.headers['x-forwarded-for'];
        if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
            return forwardedFor.split(',')[0].trim();
        }
        return req.socket?.remoteAddress || 'unknown';
    }

    function pruneSendHistory(now) {
        const oldestAllowed = now - 60 * 60 * 1000;
        for (const [key, timestamps] of sendHistory.entries()) {
            const recentTimestamps = timestamps.filter(timestamp => timestamp >= oldestAllowed);
            if (recentTimestamps.length) {
                sendHistory.set(key, recentTimestamps);
            } else {
                sendHistory.delete(key);
            }
        }
    }

    function assertSendAllowed(req, phoneNumber, now) {
        const existingOtp = otpStore.get(phoneNumber);
        if (existingOtp && now - existingOtp.sentAt < OTP_RESEND_SECONDS * 1000) {
            const retryAfterSeconds = Math.ceil((OTP_RESEND_SECONDS * 1000 - (now - existingOtp.sentAt)) / 1000);
            throw createHttpError(429, `Please wait ${retryAfterSeconds} seconds before requesting another OTP.`, {
                retryAfterSeconds
            });
        }

        pruneSendHistory(now);

        const key = `${getClientIp(req)}:${phoneNumber}`;
        const timestamps = sendHistory.get(key) || [];

        if (timestamps.length >= OTP_MAX_SENDS_PER_HOUR) {
            throw createHttpError(429, 'Too many OTP requests. Please try again later.');
        }
    }

    function recordOtpSend(req, phoneNumber, now) {
        const key = `${getClientIp(req)}:${phoneNumber}`;
        const timestamps = sendHistory.get(key) || [];
        timestamps.push(now);
        sendHistory.set(key, timestamps);
    }

    function assertVerifyAllowed(req, phoneNumber, now) {
        const oldestAllowed = now - 60 * 1000;
        const key = `${getClientIp(req)}:${phoneNumber}`;
        const timestamps = (verifyHistory.get(key) || []).filter(ts => ts >= oldestAllowed);
        if (timestamps.length >= 10) {
            throw createHttpError(429, 'Too many verification attempts. Please wait 60 seconds before trying again.');
        }
        timestamps.push(now);
        verifyHistory.set(key, timestamps);
    }

    // ── TextBee SMS dispatch ────────────────────────────────────────────────────

    async function sendTextBeeSms(phoneNumber, otp) {
        if (!TEXTBEE_API_KEY || !TEXTBEE_DEVICE_ID) {
            console.warn(`[DEV OTP] TextBee not configured. OTP for ${phoneNumber} is: ${otp}`);
            return;
        }

        const message = `Your AgriFarmers OTP is ${otp}. It is valid for ${Math.ceil(OTP_TTL_SECONDS / 60)} minutes. Do not share it.`;
        const payload = {
            recipients: [phoneNumber],
            message
        };

        if (TEXTBEE_SIM_SUBSCRIPTION_ID) {
            payload.simSubscriptionId = Number(TEXTBEE_SIM_SUBSCRIPTION_ID);
        }

        const response = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': TEXTBEE_API_KEY
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const responseText = await response.text().catch(() => '');
            console.error('TextBee API error:', response.status, responseText);
            throw createHttpError(502, 'Could not send OTP SMS. Please try again.');
        }
    }

    // ── Route handlers ──────────────────────────────────────────────────────────

    async function handleSendOtp(req, res) {
        const body = await readJsonBody(req);
        const phoneNumber = validatePhoneNumber(body.phoneNumber);
        const now = Date.now();

        assertSendAllowed(req, phoneNumber, now);

        const otp = String(crypto.randomInt(100000, 1000000));
        const salt = crypto.randomBytes(16).toString('hex');

        await sendTextBeeSms(phoneNumber, otp);

        const expiresAt = now + OTP_TTL_SECONDS * 1000;
        const otpHash = hashOtp(phoneNumber, otp, salt);

        otpStore.set(phoneNumber, {
            hash: otpHash,
            salt,
            expiresAt,
            attempts: 0,
            sentAt: now
        });
        recordOtpSend(req, phoneNumber, now);

        const signedToken = createSignedOtpToken(phoneNumber, otp, salt, expiresAt);

        res.setHeader('Set-Cookie', `agrifarmers_otp=${signedToken}; Path=/api/otp; HttpOnly; SameSite=Lax; Max-Age=${OTP_TTL_SECONDS}`);

        sendJson(req, res, 200, {
            sent: true,
            expiresInSeconds: OTP_TTL_SECONDS,
            otpToken: signedToken
        });
    }

    async function handleVerifyOtp(req, res) {
        const body = await readJsonBody(req);
        const phoneNumber = validatePhoneNumber(body.phoneNumber);
        const otp = validateOtp(body.otp);
        const now = Date.now();

        assertVerifyAllowed(req, phoneNumber, now);

        const record = otpStore.get(phoneNumber);
        let verified = false;

        if (record) {
            if (record.expiresAt < now) {
                otpStore.delete(phoneNumber);
                throw createHttpError(401, 'OTP expired. Please request a new one.');
            }

            record.attempts += 1;

            const expectedHash = hashOtp(phoneNumber, otp, record.salt);
            if (!compareHash(record.hash, expectedHash)) {
                if (record.attempts >= OTP_MAX_ATTEMPTS) {
                    otpStore.delete(phoneNumber);
                    throw createHttpError(429, 'Too many incorrect attempts. Please request a new OTP.');
                }
                throw createHttpError(401, 'Invalid OTP. Please try again.');
            }

            otpStore.delete(phoneNumber);
            verified = true;
        } else {
            const token = body.otpToken || getCookie(req, 'agrifarmers_otp');
            if (verifySignedOtpToken(token, phoneNumber, otp, now)) {
                verified = true;
            }
        }

        if (!verified) {
            throw createHttpError(401, 'Invalid or expired OTP.');
        }

        const sessionToken = createSessionToken(phoneNumber, OTP_SECRET);

        res.setHeader('Set-Cookie', [
            'agrifarmers_otp=; Path=/api/otp; HttpOnly; SameSite=Lax; Max-Age=0',
            `agrifarmers_session=${sessionToken}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`
        ]);
        sendJson(req, res, 200, {
            verified: true,
            sessionToken,
            expiresInSeconds: SESSION_TTL_SECONDS
        });
    }

    return {
        handleSendOtp,
        handleVerifyOtp,
        createSessionToken,
        verifySessionToken
    };
}

module.exports = {
    createOtpHandler
};
