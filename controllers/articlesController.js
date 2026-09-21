const articleService = require("../services/articlesServices");

exports.getAll = async (req, res) => {
    try {
        const articles = await articleService.getArticles(req.query);
        res.status(200).json(articles);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: "Error fetching articles", error: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const article = await articleService.getArticleById(req.params.id);
        res.status(200).json(article);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: `Error fetching article ${req.params.id}`, error: error.message });
    }
};

exports.create = async (req, res) => {
    try{
        const newArticle = await articleService.createArticle(req.body);
        res.status(201).json(newArticle);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: "Error creating article", error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const updatedArticle = await articleService.updateArticle(req.params.id, req.body);
        res.status(200).json(updatedArticle);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: `Error updating article ${req.params.id}`, error: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const deletedArticle = await articleService.deleteArticle(req.params.id);
        res.status(200).json(deletedArticle);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: `Error deleting article ${req.params.id}`, error: error.message });
    }
};
