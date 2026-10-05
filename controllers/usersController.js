const User = require("../models/User");
const AppError = require("../utils/AppError");
const { logSecurityEvent } = require("../middlewares/securityLogger");

exports.register = async (req, res, next) => {
    try {
        const { username, email, password, role } = req.body;

        if (!username || !email || !password || !role) {
            throw new AppError("Username, email, password, and role are required", 400);
        }

        if (!["reporter", "editor"].includes(role)) {
            throw new AppError("Invalid role. Role must be 'reporter' or 'editor'", 400);
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
        const { password, ...updateData } = req.body;
        if (updateData.role && !["reporter", "editor"].includes(updateData.role)) {
            throw new AppError("Invalid role. Role must be 'reporter' or 'editor'", 400);
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
