const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { logSecurityEvent } = require('../middlewares/securityLogger');

exports.requireWriterPage = (req, res, next) => {
    const user = req.session ? req.session.user : null;
    if (!user) {
        logSecurityEvent("UNAUTHENTICATED_ACCESS_ATTEMPT", { url: req.originalUrl }, req);
        return res.redirect('/login');
    }
    next();
};

exports.renderHub = (req, res) => {
    res.render('writersHub', { currentUser: req.session.user });
};

exports.renderNewArticle = (req, res) => {
    res.render('writersHubEdit', {
        articleId: null,
        currentUser: req.session.user
    });
};

exports.renderEditArticle = (req, res) => {
    res.render('writersHubEdit', {
        articleId: req.params.id,
        currentUser: req.session.user
    });
};

exports.uploadImage = (req, res) => {
    try {
        const { imageBase64, filename } = req.body;
        if (!imageBase64 || !filename) {
            return res.status(400).json({ error: 'Missing image or filename' });
        }
        
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, ""); // removing the base64 prefix
        const imagesDir = path.join(__dirname, '../public/images'); // getting the images directory.
        
        if (!fs.existsSync(imagesDir)){ // checking if the images directory exists
            fs.mkdirSync(imagesDir, { recursive: true }); // creating the images directory if it doesn't exist. If it exists - recursive: true it safely does nothing instead.
        }
        
        const safeFilename = Date.now() + '_' + filename.replace(/[^a-zA-Z0-9.\-_]/g, ''); // creating a safe filename by replacing any non-alphanumeric characters with underscores
        const filePath = path.join(imagesDir, safeFilename); // getting the file path
        
        fs.writeFileSync(filePath, base64Data, 'base64'); // writing the file to the specified path
        
        res.json({ imageUrl: '/images/' + safeFilename }); // returning the image URL
    } catch (err) {
        res.status(500).json({ error: err.message }); // returning the error message
    }
};

exports.removeImage = (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl || !imageUrl.startsWith('/images/')) {
            return res.status(400).json({ error: 'Invalid image URL' });
        }
        
        const filename = imageUrl.replace('/images/', '');
        const filePath = path.join(__dirname, '../public/images', filename);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
