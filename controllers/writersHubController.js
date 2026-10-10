// Import core Node.js modules and dependencies
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { logSecurityEvent } = require('../middlewares/securityLogger');

/**
 * Middleware to restrict access to authenticated writers only.
 * Redirects unauthenticated users to the login page and logs security events.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 */
exports.requireWriterPage = (req, res, next) => {
    // Check if an active user session exists
    const user = req.session ? req.session.user : null;
    if (!user) {
        // Log unauthenticated access attempt for security monitoring
        logSecurityEvent("UNAUTHENTICATED_ACCESS_ATTEMPT", { url: req.originalUrl }, req);
        return res.redirect('/login');
    }
    // Proceed to the next middleware/handler if authenticated
    next();
};

/**
 * Renders the main Writers Hub dashboard view.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
exports.renderHub = (req, res) => {
    // Render the writers hub view passing the current session user
    res.render('writersHub', { currentUser: req.session.user });
};

/**
 * Renders the article creation view for writing a new article.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
exports.renderNewArticle = (req, res) => {
    // Render the editor view with null articleId indicating a new draft
    res.render('writersHubEdit', {
        articleId: null,
        currentUser: req.session.user
    });
};

/**
 * Renders the article editing view for an existing article by ID.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
exports.renderEditArticle = (req, res) => {
    // Render the editor view passing the specific article ID from URL parameters
    res.render('writersHubEdit', {
        articleId: req.params.id,
        currentUser: req.session.user
    });
};

/**
 * Handles Base64 image uploads, writes the decoded file to disk, and returns the public URL.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
exports.uploadImage = (req, res) => {
    try {
        // Extract Base64 payload and original filename from request body
        const { imageBase64, filename } = req.body;
        if (!imageBase64 || !filename) {
            return res.status(400).json({ error: 'Missing image or filename' });
        }
        
        // Strip out the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, ""); // removing the base64 prefix
        
        // Resolve absolute target directory path for stored images
        const imagesDir = path.join(__dirname, '../public/images'); // getting the images directory.
        
        // Ensure destination folder exists on disk, create recursively if needed
        if (!fs.existsSync(imagesDir)){ // checking if the images directory exists
            fs.mkdirSync(imagesDir, { recursive: true }); // creating the images directory if it doesn't exist. If it exists - recursive: true it safely does nothing instead.
        }
        
        // Sanitize filename to avoid path traversal and prefix with timestamp to ensure uniqueness
        const safeFilename = Date.now() + '_' + filename.replace(/[^a-zA-Z0-9.\-_]/g, ''); // creating a safe filename by replacing any non-alphanumeric characters with underscores
        const filePath = path.join(imagesDir, safeFilename); // getting the file path
        
        // Write the decoded binary image data to the server file system
        fs.writeFileSync(filePath, base64Data, 'base64'); // writing the file to the specified path
        
        // Return relative public URL for the newly stored image
        res.json({ imageUrl: '/images/' + safeFilename }); // returning the image URL
    } catch (err) {
        // Return internal server error message if write fails
        res.status(500).json({ error: err.message }); // returning the error message
    }
};

/**
 * Deletes a previously uploaded image file from the public directory.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
exports.removeImage = (req, res) => {
    try {
        // Extract image URL from request body and ensure it points to the local images directory
        const { imageUrl } = req.body;
        if (!imageUrl || !imageUrl.startsWith('/images/')) {
            return res.status(400).json({ error: 'Invalid image URL' });
        }
        
        // Extract the raw filename and resolve its physical file path on disk
        const filename = imageUrl.replace('/images/', '');
        const filePath = path.join(__dirname, '../public/images', filename);
        
        // Delete the file if it currently exists on the file system
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // Respond with success confirmation
        res.json({ success: true });
    } catch (err) {
        // Return internal server error message if deletion encounters an issue
        res.status(500).json({ error: err.message });
    }
};