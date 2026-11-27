/**
 * AgriFarmers — Secure OpenWeatherMap Proxy Routes
 * Keeps OPENWEATHER_API_KEY strictly on the server (.env / platform env vars).
 */

function getServerOpenWeatherKey() {
    return (process.env.OPENWEATHER_API_KEY || '').trim();
}

function parseCoords(searchParams) {
    const lat = Number(searchParams.get('lat'));
    const lon = Number(searchParams.get('lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return null;
    }
    return { lat, lon };
}

async function handleGetWeather(req, res, requestUrl, helpers) {
    const { sendJson, createHttpError } = helpers;
    const coords = parseCoords(requestUrl.searchParams);
    if (!coords) {
        throw createHttpError(400, 'Valid lat and lon query parameters are required.');
    }

    const apiKey = getServerOpenWeatherKey();
    if (!apiKey) {
        throw createHttpError(503, 'OpenWeather API key is not configured on the server.');
    }

    const { lat, lon } = coords;
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=metric&appid=${encodeURIComponent(apiKey)}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=metric&appid=${encodeURIComponent(apiKey)}`;

    const weatherRes = await fetch(currentUrl);
    if (!weatherRes.ok) {
        throw createHttpError(502, `Upstream OpenWeather service returned HTTP ${weatherRes.status}.`);
    }

    const weatherData = await weatherRes.json();
    if (weatherData?.wind && typeof weatherData.wind.speed === 'number') {
        weatherData.wind.speed = Math.round(weatherData.wind.speed * 3.6 * 10) / 10;
    }
    weatherData._provider = 'openweathermap';

    let forecastData = null;
    try {
        const forecastRes = await fetch(forecastUrl);
        if (forecastRes.ok) {
            forecastData = await forecastRes.json();
        }
    } catch (_) {}

    sendJson(req, res, 200, {
        ok: true,
        provider: 'openweathermap',
        weatherData,
        forecastData
    });
}

async function handleReverseGeocode(req, res, requestUrl, helpers) {
    const { sendJson, createHttpError } = helpers;
    const coords = parseCoords(requestUrl.searchParams);
    if (!coords) {
        throw createHttpError(400, 'Valid lat and lon query parameters are required.');
    }

    const apiKey = getServerOpenWeatherKey();
    if (!apiKey) {
        throw createHttpError(503, 'OpenWeather API key is not configured on the server.');
    }

    const { lat, lon } = coords;
    const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&limit=1&appid=${encodeURIComponent(apiKey)}`;
    const geoRes = await fetch(url);
    if (!geoRes.ok) {
        throw createHttpError(502, `Upstream OpenWeather geocoding returned HTTP ${geoRes.status}.`);
    }

    const results = await geoRes.json();
    sendJson(req, res, 200, {
        ok: true,
        results: Array.isArray(results) ? results : []
    });
}

async function handleDirectGeocode(req, res, requestUrl, helpers) {
    const { sendJson, createHttpError } = helpers;
    const query = (requestUrl.searchParams.get('q') || '').trim();
    if (!query || query.length > 120) {
        throw createHttpError(400, 'A valid location query (q) is required.');
    }

    const apiKey = getServerOpenWeatherKey();
    if (!apiKey) {
        throw createHttpError(503, 'OpenWeather API key is not configured on the server.');
    }

    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)},IN&limit=1&appid=${encodeURIComponent(apiKey)}`;
    const geoRes = await fetch(url);
    if (!geoRes.ok) {
        throw createHttpError(502, `Upstream OpenWeather geocoding returned HTTP ${geoRes.status}.`);
    }

    const results = await geoRes.json();
    sendJson(req, res, 200, {
        ok: true,
        results: Array.isArray(results) ? results : []
    });
}

async function handleWeatherRequest(req, res, requestUrl, helpers) {
    if (req.method !== 'GET') return false;

    if (requestUrl.pathname === '/api/weather') {
        await handleGetWeather(req, res, requestUrl, helpers);
        return true;
    }

    if (requestUrl.pathname === '/api/weather/reverse') {
        await handleReverseGeocode(req, res, requestUrl, helpers);
        return true;
    }

    if (requestUrl.pathname === '/api/weather/geocode') {
        await handleDirectGeocode(req, res, requestUrl, helpers);
        return true;
    }

    return false;
}

module.exports = {
    handleWeatherRequest
};
