const mongoose = require("mongoose");

// Standard severity levels (same convention as industry loggers like Winston/Pino):
// 'error' -> something broke / needs attention
// 'warn'  -> suspicious but handled (failed login, 401/403, ownership violation)
// 'info'  -> normal but worth recording
const logSchema = new mongoose.Schema({
    level: {
        type: String,
        enum: ["error", "warn", "info"],
        required: true
    },
    event: {
        type: String, // short machine-readable tag, e.g. 'LOGIN_FAILED'
        required: true
    },
    message: { type: String, required: true },
    meta: {
        userId: String,
        ip: String,
        method: String,
        url: String,
        details: mongoose.Schema.Types.Mixed
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Log", logSchema);