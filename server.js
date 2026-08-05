const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

loadDotEnv(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 3000);
const TEXTBEE_API_KEY = process.env.TEXTBEE_API_KEY || '';
const TEXTBEE_DEVICE_ID = process.env.TEXTBEE_DEVICE_ID || '';
const OTP_SECRET = process.env.OTP_SECRET || TEXTBEE_API_KEY || 'development-otp-secret';
const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 120);
const OTP_RESEND_SECONDS = Number(process.env.OTP_RESEND_SECONDS || 30);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const OTP_MAX_SENDS_PER_HOUR = Number(process.env.OTP_MAX_SENDS_PER_HOUR || 5);
const TEXTBEE_SIM_SUBSCRIPTION_ID = process.env.TEXTBEE_SIM_SUBSCRIPTION_ID;
const STATIC_ROOT = __dirname;

const otpStore = new Map();
const sendHistory = new Map();

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function loadDotEnv(envPath) {
    if (!fs.existsSync(envPath)) return;

    const contents = fs.readFileSync(envPath, 'utf8');
    contents.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        const equalsIndex = trimmed.indexOf('=');
        if (equalsIndex === -1) return;

        const key = trimmed.slice(0, equalsIndex).trim();
        let value = trimmed.slice(equalsIndex + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }
    });
}

function sendJson(req, res, statusCode, payload) {
    setCorsHeaders(req, res);
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
}

function createHttpError(statusCode, message, extra = {}) {
    const error = new Error(message);
    error.statusCode = statusCode;
    Object.assign(error, extra);
    return error;
}

function getAllowedOrigin(req) {
    const requestOrigin = req.headers.origin;
    const configuredOrigins = (process.env.CORS_ORIGIN || '')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);

    if (!requestOrigin) return '*';
    if (configuredOrigins.length === 0 || configuredOrigins.includes('*')) return requestOrigin;
    return configuredOrigins.includes(requestOrigin) ? requestOrigin : null;
}

function setCorsHeaders(req, res) {
    const allowedOrigin = getAllowedOrigin(req);
    if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    }
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function readJsonBody(req) {
    let rawBody = '';

    for await (const chunk of req) {
        rawBody += chunk;
        if (Buffer.byteLength(rawBody) > 4096) {
            throw createHttpError(413, 'Request body is too large.');
        }
    }

    if (!rawBody) return {};

    try {
        return JSON.parse(rawBody);
    } catch (_) {
        throw createHttpError(400, 'Invalid JSON request body.');
    }
}

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

function getClientIp(req) {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
        return forwardedFor.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
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

function assertTextBeeConfigured() {
    if (!TEXTBEE_API_KEY || !TEXTBEE_DEVICE_ID) {
        throw createHttpError(500, 'OTP service is not configured.');
    }
}

async function sendTextBeeSms(phoneNumber, otp) {
    assertTextBeeConfigured();

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

async function handleSendOtp(req, res) {
    const body = await readJsonBody(req);
    const phoneNumber = validatePhoneNumber(body.phoneNumber);
    const now = Date.now();

    assertSendAllowed(req, phoneNumber, now);

    const otp = String(crypto.randomInt(100000, 1000000));
    const salt = crypto.randomBytes(16).toString('hex');

    await sendTextBeeSms(phoneNumber, otp);

    otpStore.set(phoneNumber, {
        hash: hashOtp(phoneNumber, otp, salt),
        salt,
        expiresAt: now + OTP_TTL_SECONDS * 1000,
        attempts: 0,
        sentAt: now
    });
    recordOtpSend(req, phoneNumber, now);

    sendJson(req, res, 200, {
        sent: true,
        expiresInSeconds: OTP_TTL_SECONDS
    });
}

async function handleVerifyOtp(req, res) {
    const body = await readJsonBody(req);
    const phoneNumber = validatePhoneNumber(body.phoneNumber);
    const otp = validateOtp(body.otp);
    const record = otpStore.get(phoneNumber);
    const now = Date.now();

    if (!record) {
        throw createHttpError(401, 'Invalid or expired OTP.');
    }

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
    sendJson(req, res, 200, { verified: true });
}

function isForbiddenStaticPath(pathname) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.some(segment => segment.startsWith('.'))) return true;

    const blockedFiles = new Set(['server.js', 'package.json', 'package-lock.json', 'yarn.lock']);
    return blockedFiles.has(path.basename(pathname));
}

async function serveStaticFile(req, res) {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(requestUrl.pathname);

    if (pathname === '/') pathname = '/index.html';
    if (pathname.includes('\0') || isForbiddenStaticPath(pathname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const filePath = path.resolve(STATIC_ROOT, `.${pathname}`);
    const rootWithSeparator = STATIC_ROOT.endsWith(path.sep) ? STATIC_ROOT : `${STATIC_ROOT}${path.sep}`;

    if (filePath !== STATIC_ROOT && !filePath.startsWith(rootWithSeparator)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    try {
        const stats = await fsp.stat(filePath);
        if (!stats.isFile()) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }

        const extension = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[extension] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        if (req.method === 'HEAD') {
            res.end();
            return;
        }
        fs.createReadStream(filePath).pipe(res);
    } catch (_) {
        res.writeHead(404);
        res.end('Not found');
    }
}

async function handleRequest(req, res) {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    try {
        if (requestUrl.pathname.startsWith('/api/')) {
            if (req.method === 'OPTIONS') {
                setCorsHeaders(req, res);
                res.writeHead(204);
                res.end();
                return;
            }

            if (requestUrl.pathname === '/api/health' && req.method === 'GET') {
                sendJson(req, res, 200, { ok: true });
                return;
            }

            if (requestUrl.pathname === '/api/otp/send' && req.method === 'POST') {
                await handleSendOtp(req, res);
                return;
            }

            if (requestUrl.pathname === '/api/otp/verify' && req.method === 'POST') {
                await handleVerifyOtp(req, res);
                return;
            }

            throw createHttpError(404, 'API route not found.');
        }

        if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.writeHead(405);
            res.end('Method not allowed');
            return;
        }

        await serveStaticFile(req, res);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        if (statusCode >= 500) {
            console.error(error);
        }
        sendJson(req, res, statusCode, {
            error: statusCode >= 500 ? 'Server error' : 'Request error',
            message: error.message || 'Something went wrong.',
            retryAfterSeconds: error.retryAfterSeconds
        });
    }
}

http.createServer(handleRequest).listen(PORT, () => {
    console.log(`AgriFarmers server running at http://localhost:${PORT}`);
});