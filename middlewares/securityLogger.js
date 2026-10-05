/**
 * Security Audit Logger for tracking authentication failures and unauthorized access attempts.
 */
const logSecurityEvent = (eventType, details, req) => {
    const timestamp = new Date().toISOString();
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip) : 'N/A';
    const method = req ? req.method : '';
    const url = req ? req.originalUrl : '';
    console.warn(`[SECURITY AUDIT] [${timestamp}] [${eventType}] IP: ${ip} | ${method} ${url} | Details: ${JSON.stringify(details)}`);
};

module.exports = {
    logSecurityEvent
};
