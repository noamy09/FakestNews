const Article = require("../models/articles");
const ArticleStatistics = require("../models/statistics");
const articleService = require("../services/articlesServices");

exports.getAll = async (req, res) => {
    try {
        const articles = await articleService.getArticles(req.query);
        res.status(200).json(articles);
    } catch (error) {
        res.status(500).json({ message: "Error fetching articles", error: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const article = await articleService.getArticleById(req.params.id);
        res.status(200).json(article);
    } catch (error) {
        res.status(500).json({ message: `Error fetching article ${req.params.id}`, error: error.message });
    }
};

exports.create = async (req, res) => {
    try{
        const newArticle = await articleService.createArticle(req.body);
        res.status(201).json(newArticle);
    } catch (error) {
        res.status(500).json({ message: "Error creating article", error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const updatedArticle = await articleService.updateArticle(req.params.id, req.body);
        res.status(200).json(updatedArticle);
    } catch (error) {
        res.status(500).json({ message: `Error updating article ${req.params.id}`, error: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const deletedArticle = await articleService.deleteArticle(req.params.id);
        res.status(200).json(deletedArticle);
    } catch (error) {
        res.status(500).json({ message: `Error deleting article ${req.params.id}`, error: error.message });
    }
};

exports.getPublicFeed = async (req, res) => {
    try {
        const articles = await Article.find({ status: "published" })
            .populate("author", "username name email")
            .sort({ createdAt: -1 })
            .limit(20);

        const categories = await Article.distinct("category", { status: "published" });

        res.render("index", { articles, categories });
    } catch (err) {
        console.error("Error loading public feed:", err);
        res.status(500).render("error", { message: "Failed to load articles feed" });
    }
};

exports.getApiArticles = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        const { search, category, sort } = req.query;

        const query = { status: "published" };
        if (category && category !== "all") query.category = category;
        if (search && search.trim() !== "") query.title = { $regex: search.trim(), $options: "i" };

        let sortOption = { createdAt: -1 };
        if (sort === "views") sortOption = { views: -1 };
        else if (sort === "oldest") sortOption = { createdAt: 1 };

        const articles = await Article.find(query)
            .populate("author", "username name")
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        res.json({ success: true, page, articles });
    } catch (err) {
        console.error("Error fetching API articles:", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

exports.getPublicArticle = async (req, res) => {
    try {
        const article = await Article.findOne({ _id: req.params.id, status: "published" })
            .populate("author", "username name")
            .populate({
                path: "comments",
                populate: { path: "author", select: "username name" }
            });

        if (!article) {
            return res.status(404).render("error", { message: "Article not found or not published" });
        }

        article.views += 1;
        await article.save();

        const currentHour = new Date();
        currentHour.setMinutes(0, 0, 0, 0);

        await ArticleStatistics.findOneAndUpdate(
            { articleId: article._id, timestamp: currentHour },
            { $inc: { views: 1 } },
            { upsert: true, new: true }
        );

        res.render("article", { article });
    } catch (err) {
        console.error("Error loading article:", err);
        res.status(500).render("error", { message: "Server error loading article" });
    }
};