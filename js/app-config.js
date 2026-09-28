/**
 * AgriFarmers Frontend Configuration
 * When running on Vercel or localhost, frontend and backend share the same origin,
 * so otpApiBaseUrl is set to empty string '' (using relative /api endpoints).
 * If the frontend is hosted externally (e.g. GitHub Pages), it targets the Vercel backend.
 */
(function() {
    const isSameOrigin = (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.endsWith('.vercel.app') ||
        window.location.protocol === 'file:'
    );

    // Fallback URL if running from GitHub Pages or another external static host
    const VERCEL_BACKEND_URL = 'https://agrifarmers.vercel.app';

    window.AGRIFARMERS_CONFIG = {
        otpApiBaseUrl: isSameOrigin ? '' : VERCEL_BACKEND_URL
    };
})();