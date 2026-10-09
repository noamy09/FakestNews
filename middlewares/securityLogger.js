const Log = require("../models/Log");

/**
 * Security Audit Logger - persists events to MongoDB (Log collection)
 * instead of only the terminal, so events survive restarts / deploys
 * and can be queried or shown live during the defense.
 *
 * Fire-and-forget: never lets a logging failure crash the request that
 * triggered it. Still prints to console as a dev-time convenience.
 */
const logSecurityEvent = (eventType, details, req) => {
    const ip = req
        ? (req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || req.ip || "N/A")
        : "N/A";
    const method = req ? req.method || "" : "";
    const url = req ? (req.originalUrl || req.url || "") : "";
    const userId = req?.session?.user?._id || "Unauthenticated";

    // Dev-time visibility — fine to keep alongside DB logging
    console.warn(`[SECURITY AUDIT] [${eventType}] ${method} ${url} | user: ${userId} | ${JSON.stringify(details)}`);

    // Persisted record
    Log.create({
        level: "warn",
        event: eventType,
        message: `${eventType} on ${method} ${url}`,
        meta: { userId, ip, method, url, details }
    }).catch((err) => {
        // Never let a logging failure take down the actual request
        console.error("[LOG WRITE FAILED]", err.message);
    });
};

module.exports = { logSecurityEvent };