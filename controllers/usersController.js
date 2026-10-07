const User = require("../models/User");
const AppError = require("../utils/AppError");
const { logSecurityEvent } = require("../middlewares/securityLogger");

const ALLOWED_ROLES = ["reporter", "editor", "admin"];

exports.register = async (req, res, next) => {
    try {
        const { username, email, password, role } = req.body;

        if (!username || !email || !password || !role) {
            throw new AppError("Username, email, password, and role are required", 400);
        }

        if (!ALLOWED_ROLES.includes(role)) {
            throw new AppError(`Invalid role. Role must be one of: ${ALLOWED_ROLES.join(", ")}`, 400);
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            throw new AppError("Email is already registered", 400);
        }

        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            throw new AppError("Username is already taken", 400);
        }

        const newUser = await User.create({ username, email, password, role });

        res.status(201).json({
            message: "User registered successfully",
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

        res.status(200).json({
            message: "Logged in successfully",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.logout = (req, res, next) => {
    if (!req.session) {
        return res.status(200).json({ message: "Logged out successfully" });
    }

    req.session.destroy((err) => {
        if (err) {
            return next(new AppError("Failed to log out", 500));
        }
        res.clearCookie("connect.sid");
        res.status(200).json({ message: "Logged out successfully" });
    });
};

exports.getMe = (req, res, next) => {
    if (!req.session || !req.session.user) {
        logSecurityEvent("UNAUTHORIZED_ACCESS", { endpoint: "/api/users/me" }, req);
        return next(new AppError("Authentication required", 401));
    }
    res.status(200).json({ user: req.session.user });
};

exports.getAll = async (req, res, next) => {
    try {
        const users = await User.find();
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

        const { password, ...updateData } = req.body;

        // Non-management users cannot escalate their role
        if (updateData.role && !isManagement) {
            throw new AppError("Forbidden: Only management can update roles", 403);
        }

        if (updateData.role && !ALLOWED_ROLES.includes(updateData.role)) {
            throw new AppError(`Invalid role. Role must be one of: ${ALLOWED_ROLES.join(", ")}`, 400);
        }

        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!user) {
            throw new AppError("User not found", 404);
        }
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

exports.delete = async (req, res, next) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            throw new AppError("User not found", 404);
        }
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        next(error);
    }
};
