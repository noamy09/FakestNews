const { logSecurityEvent } = require("./securityLogger");
const Log = require("../models/Log");

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (statusCode === 401 || statusCode === 403) {
        logSecurityEvent("UNAUTHORIZED_OR_FORBIDDEN_ATTEMPT", {
            statusCode,
            message,
            path: req.originalUrl
        }, req);
    } else if (statusCode === 500) {
        console.error(err); // keep full stack trace visible in terminal during dev

        Log.create({
            level: "error",
            event: "SERVER_ERROR",
            message: err.message,
            meta: {
                userId: req?.session?.user?._id || "N/A",
                method: req.method,
                url: req.originalUrl,
                details: { stack: err.stack }
            }
        }).catch((logErr) => console.error("[LOG WRITE FAILED]", logErr.message));
    }

    res.status(statusCode).json({
        success: false,
        status: "error",
        statusCode,
        message
    });
};

module.exports = errorHandler;