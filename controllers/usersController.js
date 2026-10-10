const User = require("../models/User");
const AppError = require("../utils/AppError");
const { logSecurityEvent } = require("../middlewares/securityLogger");

const ALLOWED_ROLES = ["reporter", "editor", "admin"];
const UPDATABLE_FIELDS = ["username", "email", "role"];

// Admin-only: create a user account from the Admin Hub (no public self-registration)
exports.createUser = async (req, res, next) => {
    try {
        const { username, email, password, role } = req.body;

        if (!username || !email || !password || !role) {
            throw new AppError("Username, email, password, and role are required", 400);
        }

        if (!ALLOWED_ROLES.includes(role)) {
            throw new AppError(`Invalid role. Role must be one of: ${ALLOWED_ROLES.join(", ")}`, 400);
        }

        const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingEmail) {
            throw new AppError("Email is already registered", 400);
        }

        const existingUsername = await User.findOne({ username: username.trim() });
        if (existingUsername) {
            throw new AppError("Username is already taken", 400);
        }

        const newUser = await User.create({ username, email, password, role });

        if (role === "admin") {
            logSecurityEvent("ADMIN_ACCOUNT_CREATED", {
                createdBy: req.session.user._id,
                newUserId: newUser._id.toString()
            }, req);
        }

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            user: newUser
        });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            logSecurityEvent("LOGIN_FAILED", { reason: "Missing credentials" }, req);
            throw new AppError("Email and password are required", 400);
        }

        const user = await User.findOne({ email });
        if (!user) {
            logSecurityEvent("LOGIN_FAILED", { reason: "User not found", email }, req);
            throw new AppError("Invalid email or password", 401);
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            logSecurityEvent("LOGIN_FAILED", { reason: "Password mismatch", email }, req);
            throw new AppError("Invalid email or password", 401);
        }

        // Establish session
        req.session.user = {
            _id: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role
        };

        const userData = {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        };

        // If standard HTML form submit without fetch/JSON Accept header
        if (req.headers.accept && req.headers.accept.includes('text/html') && !req.xhr && !req.headers['x-requested-with']) {
            return res.redirect('/');
        }

        return res.status(200).json({
            success: true,
            message: "Logged in successfully",
            redirectUrl: "/",
            user: userData
        });
    } catch (error) {
        next(error);
    }
};

exports.logout = (req, res, next) => {
    if (!req.session) {
        return res.status(200).json({ success: true, message: "Logged out successfully" });
    }

    req.session.destroy((err) => {
        if (err) {
            return next(new AppError("Failed to log out", 500));
        }
        res.clearCookie("connect.sid");
        res.status(200).json({ success: true, message: "Logged out successfully" });
    });
};

exports.getMe = (req, res, next) => {
    if (!req.session || !req.session.user) {
        logSecurityEvent("UNAUTHORIZED_ACCESS", { endpoint: "/api/users/me" }, req);
        return next(new AppError("Authentication required", 401));
    }
    res.status(200).json({ success: true, user: req.session.user });
};

// Escape user input so it is matched literally inside a RegExp
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.getAll = async (req, res, next) => {
    try {
        const { q, role } = req.query;
        const filter = {};

        if (typeof q === "string" && q.trim()) {
            const pattern = new RegExp(escapeRegex(q.trim()), "i");
            filter.$or = [{ username: pattern }, { email: pattern }];
        }

        if (typeof role === "string" && role) {
            if (!ALLOWED_ROLES.includes(role)) {
                throw new AppError(`Invalid role. Role must be one of: ${ALLOWED_ROLES.join(", ")}`, 400);
            }
            filter.role = role;
        }

        const users = await User.find(filter).sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
};

exports.getById = async (req, res, next) => {
    try {
        const currentUser = req.session ? req.session.user : null;
        if (!currentUser) {
            logSecurityEvent("UNAUTHENTICATED_ACCESS_ATTEMPT", { endpoint: `/api/users/${req.params.id}` }, req);
            throw new AppError("Authentication required", 401);
        }

        // IDOR Protection: Allow access if user is editor/admin, or viewing their own profile
        const isManagement = ["editor", "admin"].includes(currentUser.role);
        const isSelf = currentUser._id.toString() === req.params.id.toString();

        if (!isManagement && !isSelf) {
            logSecurityEvent("IDOR_ATTEMPT", {
                userId: currentUser._id,
                targetId: req.params.id,
                url: req.originalUrl
            }, req);
            throw new AppError("Forbidden: You can only view your own profile", 403);
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            throw new AppError("User not found", 404);
        }
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

exports.update = async (req, res, next) => {
    try {
        const currentUser = req.session ? req.session.user : null;
        if (!currentUser) {
            throw new AppError("Authentication required", 401);
        }

        const isManagement = ["editor", "admin"].includes(currentUser.role);
        const isSelf = currentUser._id.toString() === req.params.id.toString();

        if (!isManagement && !isSelf) {
            throw new AppError("Forbidden: You can only update your own profile", 403);
        }

        // Whitelist editable fields (password changes and internal fields are never accepted here)
        const updateData = {};
        for (const field of UPDATABLE_FIELDS) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        // Only admins can change roles (prevents editors from escalating anyone to admin)
        if (updateData.role && currentUser.role !== "admin") {
            logSecurityEvent("FORBIDDEN_ROLE_CHANGE_ATTEMPT", {
                actorId: currentUser._id,
                actorRole: currentUser.role,
                targetId: req.params.id,
                attemptedRole: updateData.role
            }, req);
            throw new AppError("Forbidden: Only admins can update roles", 403);
        }

        if (updateData.role && !ALLOWED_ROLES.includes(updateData.role)) {
            throw new AppError(`Invalid role. Role must be one of: ${ALLOWED_ROLES.join(", ")}`, 400);
        }

        const targetUser = await User.findById(req.params.id);
        if (!targetUser) {
            throw new AppError("User not found", 404);
        }

        // Only administrators can modify other users. Non-admins can only modify their own profile.
        if (currentUser.role !== "admin" && !isSelf) {
            logSecurityEvent("FORBIDDEN_USER_MODIFICATION_ATTEMPT", {
                actorId: currentUser._id,
                actorRole: currentUser.role,
                targetId: targetUser._id.toString(),
                targetRole: targetUser.role,
                attemptedFields: Object.keys(updateData)
            }, req);
            throw new AppError("Forbidden: Only administrators can modify other users' accounts", 403);
        }

        const oldRole = targetUser.role;

        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!user) {
            throw new AppError("User not found", 404);
        }

        if (updateData.role && oldRole !== user.role) {
            logSecurityEvent("USER_ROLE_CHANGED", {
                actorId: currentUser._id,
                actorUsername: currentUser.username,
                targetId: user._id.toString(),
                targetUsername: user.username,
                oldRole,
                newRole: user.role
            }, req);
        }

        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

exports.delete = async (req, res, next) => {
    try {
        // Prevent an admin from locking themselves out by deleting their own account
        if (req.session.user._id.toString() === req.params.id.toString()) {
            throw new AppError("You cannot delete your own account", 400);
        }

        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        // Destroy all active sessions for this deleted user ---
        const targetUserId = user._id.toString();
        req.sessionStore.all((err, sessions) => {
            if (!err && sessions) {
                for (const sessionId in sessions) {
                    const session = sessions[sessionId];
                    if (session && session.user && session.user._id && session.user._id.toString() === targetUserId) {
                        req.sessionStore.destroy(sessionId, (destroyErr) => {
                            if (destroyErr) console.error("Failed to destroy session on user deletion:", destroyErr);
                        });
                    }
                }
            }
        });

        logSecurityEvent("USER_DELETED", {
            actorId: req.session.user._id,
            actorUsername: req.session.user.username,
            targetId: targetUserId,
            targetUsername: user.username,
            targetEmail: user.email,
            targetRole: user.role
        }, req);

        res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        next(error);
    }
};
