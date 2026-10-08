const crypto = require("crypto");

const COOKIE_NAME = "fn_did";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const VALID_ID = /^[a-f0-9-]{36}$/;

const readCookie = (header, name) => {
    if (!header) return null;
    for (const part of header.split(";")) {
        const [key, ...rest] = part.trim().split("=");
        if (key !== name) continue;
        try {
            return decodeURIComponent(rest.join("="));
        } catch (_) {
            return null; // malformed %-encoding: treat as no cookie
        }
    }
    return null;
};

// Gives each browser a stable anonymous id so guests can be rate-limited per device.
// req.isNewDevice marks requests that arrived without a valid cookie (first visit, curl, cleared cookies).
const deviceId = (req, res, next) => {
    let id = readCookie(req.headers.cookie, COOKIE_NAME);
    req.isNewDevice = !id || !VALID_ID.test(id);
    if (req.isNewDevice) {
        id = crypto.randomUUID();
        res.cookie(COOKIE_NAME, id, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: ONE_YEAR_MS
        });
    }
    req.deviceId = id;
    next();
};

module.exports = deviceId;
