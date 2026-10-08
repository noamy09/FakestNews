const WINDOW_MS = 60 * 1000;
const MAX_PER_CLIENT = 3;
// Backstop for clients that rotate device cookies to dodge the per-device limit.
const MAX_PER_IP = 10;

// key -> timestamps (ms) of attempts inside the current window
const hits = new Map();

const prune = (timestamps, now) => {
    while (timestamps.length && now - timestamps[0] >= WINDOW_MS) {
        timestamps.shift();
    }
};

const check = (key, max, now) => {
    const timestamps = hits.get(key) || [];
    prune(timestamps, now);
    if (timestamps.length >= max) {
        return { key, allowed: false, retryAfterMs: WINDOW_MS - (now - timestamps[0]) };
    }
    return { key, allowed: true, timestamps };
};

// [key, max] pairs that one comment attempt counts against.
const limitsFor = (req) => {
    const userId = req.session?.user?._id;
    const limits = [
        [userId ? `user:${userId}` : `device:${req.deviceId}`, MAX_PER_CLIENT],
        [`ip:${req.ip}`, MAX_PER_IP]
    ];
    // Requests without a device cookie (curl, cleared cookies) would get a fresh id every time,
    // so they also share one per-IP bucket with the per-client limit.
    if (!userId && req.isNewDevice) limits.push([`anon:${req.ip}`, MAX_PER_CLIENT]);
    return limits;
};

const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits) {
        prune(timestamps, now);
        if (!timestamps.length) hits.delete(key);
    }
}, WINDOW_MS);
sweep.unref();

const commentRateLimiter = (req, res, next) => {
    const now = Date.now();
    const checks = limitsFor(req).map(([key, max]) => check(key, max, now));
    const blocked = checks.filter((c) => !c.allowed);

    if (blocked.length) {
        const retryAfter = Math.ceil(Math.max(...blocked.map((c) => c.retryAfterMs)) / 1000);
        console.warn(`[rate-limit] comment blocked keys=${blocked.map((c) => c.key).join(",")} retryAfter=${retryAfter}s`);
        res.set("Retry-After", String(retryAfter));
        return res.status(429).json({
            message: `You can post up to ${MAX_PER_CLIENT} comments per minute. Please try again in ${retryAfter} seconds.`,
            retryAfter
        });
    }

    // Record only when allowed, so a blocked attempt doesn't extend the lockout.
    for (const c of checks) {
        c.timestamps.push(now);
        hits.set(c.key, c.timestamps);
    }
    next();
};

module.exports = commentRateLimiter;
module.exports.WINDOW_MS = WINDOW_MS;
module.exports.MAX_PER_CLIENT = MAX_PER_CLIENT;
