const AppError = require("../utils/AppError");

const CACHE_TTL_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;
const API_URL = "https://api.openweathermap.org/data/2.5/weather";

let cache = null; // { data, fetchedAt }
let inFlight = null; // shared promise so concurrent cache misses hit the API once
let lastFailureAt = null;
const FAILURE_BACKOFF_MS = 60 * 1000;

const isFresh = () => cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS;

const toWidgetData = (raw) => ({
    city: raw.name,
    country: raw.sys?.country || "",
    temp: Math.round(raw.main?.temp),
    feelsLike: Math.round(raw.main?.feels_like),
    humidity: raw.main?.humidity,
    windSpeed: raw.wind?.speed,
    description: raw.weather?.[0]?.description || "",
    icon: raw.weather?.[0]?.icon || null
});

const fetchFromApi = async () => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        throw new AppError("Weather service is not configured", 503);
    }

    const params = new URLSearchParams({
        q: process.env.WEATHER_CITY || "Tel Aviv,IL",
        units: "metric",
        appid: apiKey
    });

    const response = await fetch(`${API_URL}?${params}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (!response.ok) {
        throw new AppError(`Weather provider responded with ${response.status}`, 502);
    }
    return toWidgetData(await response.json());
};

const refresh = () => {
    if (!inFlight) {
        inFlight = fetchFromApi()
            .then((data) => {
                cache = { data, fetchedAt: Date.now() };
                console.log(`[weather] cache refreshed for ${data.city}`);
                return cache;
            })
            .finally(() => {
                inFlight = null;
            });
    }
    return inFlight;
};

const shape = (entry, stale) => ({
    ...entry.data,
    updatedAt: new Date(entry.fetchedAt).toISOString(),
    stale
});

const getWeather = async () => {
    if (isFresh()) return shape(cache, false);

    // After a failure, wait before retrying so an outage doesn't turn every page view into an API call.
    if (lastFailureAt && Date.now() - lastFailureAt < FAILURE_BACKOFF_MS) {
        if (cache) return shape(cache, true);
        throw new AppError("Weather data is unavailable", 503);
    }

    try {
        const entry = await refresh();
        lastFailureAt = null;
        return shape(entry, false);
    } catch (error) {
        lastFailureAt = Date.now();
        console.error("[weather] refresh failed:", error.message);
        // Serve the last good reading rather than an empty widget when the provider is down.
        if (cache) return shape(cache, true);
        throw error instanceof AppError ? error : new AppError("Weather data is unavailable", 503);
    }
};

const secondsUntilExpiry = () => {
    if (!cache) return 0;
    return Math.max(0, Math.ceil((cache.fetchedAt + CACHE_TTL_MS - Date.now()) / 1000));
};

module.exports = { getWeather, secondsUntilExpiry, CACHE_TTL_MS };
