const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const { createOtpHandler } = require('./routes/otp');
const { createUsersHandler } = require('./routes/users');
const { handleAgrovisionRequest } = require('./routes/agrovision');

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

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────

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

// ─── Initialize Modular Handlers ──────────────────────────────────────────────

const httpHelpers = { sendJson, readJsonBody, createHttpError };

const { handleSendOtp, handleVerifyOtp } = createOtpHandler({
    TEXTBEE_API_KEY,
    TEXTBEE_DEVICE_ID,
    OTP_SECRET,
    OTP_TTL_SECONDS,
    OTP_RESEND_SECONDS,
    OTP_MAX_ATTEMPTS,
    OTP_MAX_SENDS_PER_HOUR,
    TEXTBEE_SIM_SUBSCRIPTION_ID
}, httpHelpers);

const { handleCreateUser, handleGetUser, handleUpdateLogin } = createUsersHandler(getDb, httpHelpers);

// ─── API Router (Handles both standalone Node & Vercel Functions) ─────────────

function getNormalizedRequestUrl(req) {
    const rawPath = req.headers['x-forwarded-url'] || req.headers['x-matched-path'] || req.url || '/';
    const parsed = new URL(rawPath, `http://${req.headers.host || 'localhost'}`);

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
                version: '1.1.0',
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

        // AgroVision Precision Agriculture Router
        if (requestUrl.pathname.startsWith('/api/agrovision')) {
            if (await handleAgrovisionRequest(req, res, requestUrl, httpHelpers)) {
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

    // Smart routing fallbacks for backward compatibility
    let filePath = path.resolve(STATIC_ROOT, `.${pathname}`);

    // Fallback: If /icon-*.png is requested from root, look in /icons/
    const iconMatch = pathname.match(/^\/icon-([0-9]+x[0-9]+)\.png$/);
    if (iconMatch && !fs.existsSync(filePath)) {
        filePath = path.resolve(STATIC_ROOT, `icons/icon-${iconMatch[1]}.png`);
    }

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