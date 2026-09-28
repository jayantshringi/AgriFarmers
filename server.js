const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

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

// ─── .env loader ─────────────────────────────────────────────────────────────

function loadDotEnv(envPath) {
    if (!fs.existsSync(envPath)) return;

    try {
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
    } catch (_) {}
}

// ─── Supabase Database ─────────────────────────────────────────────────────────

let db = null;

function getDb() {
    if (db) return db;

    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!url || !key) {
        return null;
    }

    try {
        db = createClient(url, key, {
            auth: { persistSession: false }
        });
        return db;
    } catch (err) {
        console.error('Failed to initialize Supabase client:', err.message);
        return null;
    }
}

async function initDb() {
    const client = getDb();
    if (!client) {
        console.warn('⚠️ SUPABASE_URL or SUPABASE_KEY missing. Running without database.');
        return null;
    }

    try {
        const { error } = await client.from('users').select('id').limit(1);
        if (error) {
            throw error;
        }
        console.log('✅ Supabase connected and users table ready.');
        return client;
    } catch (err) {
        console.error('Database connection failed:', err.message);
        console.warn('Running WITHOUT database. User profiles will not be persisted.');
        return null;
    }
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

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
        if (allowedOrigin !== '*') {
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
    }
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
}

async function readJsonBody(req) {
    // If request body was already parsed by Vercel Serverless Function runtime
    if (req.body !== undefined && req.body !== null) {
        if (typeof req.body === 'object') return req.body;
        if (typeof req.body === 'string') {
            const trimmed = req.body.trim();
            if (!trimmed) return {};
            try {
                return JSON.parse(trimmed);
            } catch (_) {
                throw createHttpError(400, 'Invalid JSON request body.');
            }
        }
    }

    // Streaming body reading for vanilla Node.js server
    let rawBody = '';

    for await (const chunk of req) {
        rawBody += chunk;
        if (Buffer.byteLength(rawBody) > 10 * 1024 * 1024) {
            throw createHttpError(413, 'Request body is too large (max 10MB).');
        }
    }

    if (!rawBody) return {};

    try {
        return JSON.parse(rawBody);
    } catch (_) {
        throw createHttpError(400, 'Invalid JSON request body.');
    }
}

// ─── Phone helpers ────────────────────────────────────────────────────────────

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

/** Returns the 10-digit mobile from an E.164 number like +919876543210 */
function getMobile10(e164) {
    return e164.replace(/\D/g, '').slice(-10);
}

// ─── OTP helpers ──────────────────────────────────────────────────────────────

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

/** Creates an HMAC-signed stateless token for serverless multi-instance verification */
function createSignedOtpToken(phoneNumber, otp, salt, expiresAt) {
    const payload = `${phoneNumber}|${expiresAt}|${salt}|${hashOtp(phoneNumber, otp, salt)}`;
    const signature = crypto.createHmac('sha256', OTP_SECRET).update(payload).digest('hex');
    return Buffer.from(`${payload}|${signature}`).toString('base64url');
}

/** Verifies an HMAC-signed stateless OTP token */
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

// ─── OTP route handlers ───────────────────────────────────────────────────────

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

    // Create signed token for stateless serverless environments (Vercel)
    const signedToken = createSignedOtpToken(phoneNumber, otp, salt, expiresAt);

    // Set cookie for browser clients
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
        // Fallback for Vercel Serverless Functions / multi-instance scaling
        const token = body.otpToken || getCookie(req, 'agrifarmers_otp');
        if (verifySignedOtpToken(token, phoneNumber, otp, now)) {
            verified = true;
        }
    }

    if (!verified) {
        throw createHttpError(401, 'Invalid or expired OTP.');
    }

    // Clear OTP cookie after successful verification
    res.setHeader('Set-Cookie', 'agrifarmers_otp=; Path=/api/otp; HttpOnly; SameSite=Lax; Max-Age=0');

    sendJson(req, res, 200, { verified: true });
}

// ─── User route handlers ──────────────────────────────────────────────────────

function assertDbAvailable() {
    const client = getDb();
    if (!client) {
        throw createHttpError(503, 'Database is unavailable. Please try again later.');
    }
    return client;
}

/** Convert a Supabase DB row to a clean profile object for the frontend */
function rowToProfile(row) {
    if (!row) return null;
    return {
        uid:       row.uid,
        mobile:    row.mobile,
        name:      row.name,
        state:     row.state     || '',
        district:  row.district  || '',
        location:  row.location  || null,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
        lastLogin: row.last_login ? new Date(row.last_login).toISOString()  : null
    };
}

/** POST /api/users — create or update user profile */
async function handleCreateUser(req, res) {
    const client = assertDbAvailable();

    const body = await readJsonBody(req);
    const { mobile, uid, name, state, district, location } = body;

    if (!mobile || !/^\d{10}$/.test(mobile)) {
        throw createHttpError(400, 'Invalid mobile number.');
    }
    if (!name || name.trim().length < 2) {
        throw createHttpError(400, 'Name must be at least 2 characters.');
    }

    const safeUid = uid || `user_${mobile}`;

    const { data, error } = await client
        .from('users')
        .upsert(
            {
                mobile,
                uid: safeUid,
                name: name.trim(),
                state: state || null,
                district: district || null,
                location: location || null
            },
            { onConflict: 'mobile' }
        )
        .select()
        .single();

    if (error) {
        console.error('Supabase createUser error:', error);
        throw createHttpError(500, 'Failed to save user profile: ' + error.message);
    }

    sendJson(req, res, 201, { user: rowToProfile(data) });
}

/** GET /api/users/:mobile — fetch user profile */
async function handleGetUser(req, res, mobile) {
    const client = assertDbAvailable();

    if (!mobile || !/^\d{10}$/.test(mobile)) {
        throw createHttpError(400, 'Invalid mobile number.');
    }

    const { data, error } = await client
        .from('users')
        .select('*')
        .eq('mobile', mobile)
        .maybeSingle();

    if (error) {
        console.error('Supabase getUser error:', error);
        throw createHttpError(500, 'Failed to query database: ' + error.message);
    }

    if (!data) {
        throw createHttpError(404, 'User not found.');
    }

    sendJson(req, res, 200, { user: rowToProfile(data) });
}

/** PUT /api/users/:mobile/login — update last_login timestamp */
async function handleUpdateLogin(req, res, mobile) {
    const client = assertDbAvailable();

    if (!mobile || !/^\d{10}$/.test(mobile)) {
        throw createHttpError(400, 'Invalid mobile number.');
    }

    const { data, error } = await client
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('mobile', mobile)
        .select()
        .maybeSingle();

    if (error) {
        console.error('Supabase updateLogin error:', error);
        throw createHttpError(500, 'Failed to update login timestamp: ' + error.message);
    }

    if (!data) {
        throw createHttpError(404, 'User not found.');
    }

    sendJson(req, res, 200, { user: rowToProfile(data) });
}

// ─── API Router (Handles both standalone Node & Vercel Functions) ─────────────

function getNormalizedRequestUrl(req) {
    const rawPath = req.headers['x-forwarded-url'] || req.headers['x-matched-path'] || req.url || '/';
    const parsed = new URL(rawPath, `http://${req.headers.host || 'localhost'}`);

    // If rewritten to /api/index.js, extract original API path
    if (parsed.pathname === '/api/index.js' || parsed.pathname === '/api/index' || parsed.pathname === '/api') {
        if (req.query && req.query['0']) {
            parsed.pathname = `/api/${req.query['0']}`;
        } else if (req.url && req.url.startsWith('/api/') && req.url !== '/api/index.js') {
            parsed.pathname = new URL(req.url, 'http://localhost').pathname;
        }
    }
    return parsed;
}

async function handleApiRequest(req, res) {
    const requestUrl = getNormalizedRequestUrl(req);

    try {
        if (req.method === 'OPTIONS') {
            setCorsHeaders(req, res);
            res.writeHead(204);
            res.end();
            return;
        }

        // API Info / Index
        if (requestUrl.pathname === '/api' || requestUrl.pathname === '/api/') {
            sendJson(req, res, 200, {
                name: 'AgriFarmers API',
                status: 'online',
                runtime: process.env.VERCEL ? 'Vercel Serverless' : 'Node.js Standalone',
                version: '1.0.0',
                db: getDb() !== null
            });
            return;
        }

        // Health check
        if (requestUrl.pathname === '/api/health' && req.method === 'GET') {
            sendJson(req, res, 200, {
                ok: true,
                db: getDb() !== null,
                runtime: process.env.VERCEL ? 'vercel' : 'node'
            });
            return;
        }

        // OTP routes
        if (requestUrl.pathname === '/api/otp/send' && req.method === 'POST') {
            await handleSendOtp(req, res);
            return;
        }

        if (requestUrl.pathname === '/api/otp/verify' && req.method === 'POST') {
            await handleVerifyOtp(req, res);
            return;
        }

        // Users routes
        if (requestUrl.pathname === '/api/users' && req.method === 'POST') {
            await handleCreateUser(req, res);
            return;
        }

        const userMobileMatch = requestUrl.pathname.match(/^\/api\/users\/(\d{10})$/);
        if (userMobileMatch && req.method === 'GET') {
            await handleGetUser(req, res, userMobileMatch[1]);
            return;
        }

        const loginUpdateMatch = requestUrl.pathname.match(/^\/api\/users\/(\d{10})\/login$/);
        if (loginUpdateMatch && req.method === 'PUT') {
            await handleUpdateLogin(req, res, loginUpdateMatch[1]);
            return;
        }

        // AgroVision Precision Agriculture Additive Router
        if (requestUrl.pathname.startsWith('/api/agrovision')) {
            const { handleAgrovisionRequest } = require('./routes/agrovision');
            if (await handleAgrovisionRequest(req, res, requestUrl, { sendJson, readJsonBody, createHttpError })) {
                return;
            }
        }

        throw createHttpError(404, `API route not found: ${requestUrl.pathname}`);
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

// ─── Static file server (Local standalone dev) ────────────────────────────────

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

// ─── Main request handler ─────────────────────────────────────────────────────

async function handleRequest(req, res) {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname === '/api') {
        await handleApiRequest(req, res);
        return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405);
        res.end('Method not allowed');
        return;
    }

    await serveStaticFile(req, res);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

if (require.main === module) {
    initDb().then(() => {
        http.createServer(handleRequest).listen(PORT, () => {
            console.log(`AgriFarmers server running at http://localhost:${PORT}`);
        });
    });
}

module.exports = {
    handleRequest,
    handleApiRequest,
    initDb,
    getDb
};