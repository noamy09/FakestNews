const Article = require("../models/articles");
const AppError = require("./AppError");
const articleService = require('../services/articlesServices');

exports.getSinglePublicArticleWithViews = async (articleId) => {
    const article = await Article.findOne({ _id: articleId, status: "published" })
        .populate("author", "username name email")
        .populate({
            path: "comments",
            populate: { path: "author", select: "username name" }
        });

    if (!article) {
        throw new AppError("Article not found or not published", 404);
    }

    return article;
};

exports.buildPublicFeedQuery = (queryParams) => {
    const page = parseInt(queryParams.page, 10) || 1;
    const limit = parseInt(queryParams.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const { search, category, sort } = queryParams;

    const filter = { status: "published" };
    if (category && category !== "all") {
        filter.category = category;
    }
    if (search && search.trim() !== "") {
        filter.title = { $regex: search.trim(), $options: "i" };
    }

    let sortOption = { createdAt: -1 };
    if (sort === "views") {
        sortOption = { views: -1 };
    } else if (sort === "oldest") {
        sortOption = { createdAt: 1 };
    }

    return { filter, sortOption, skip, limit, page };
};

// GET /articles
exports.handleArticlesFeed = async (req, res, next) => {
    try {
        const queryParams = { status: 'published', ...req.query };
        const articles = await articleService.getArticles(queryParams);
        const categories = await Article.distinct('category', { status: 'published' });

        res.format({
            'text/html': () => {
                res.render('index', {
                    articles: Array.isArray(articles) ? articles.slice(0, 20) : (articles.articles || []).slice(0, 20),
                    categories
                });
            },
            'application/json': () => {
                res.json(articles);
            },
            default: () => {
                res.status(406).send('Not Acceptable');
            }
        });
    } catch (err) {
        next(err);
    }
};

// GET /articles/:id
exports.handleSingleArticle = async (req, res, next) => {
    try {
        const article = await articleService.getArticleById(req.params.id);
        if (!article || article.status !== 'published') {
            return res.format({
                'text/html': () => res.status(404).render('error', { message: 'Article not found' }),
                'application/json': () => res.status(404).json({ error: 'Article not found' })
            });
        }

        res.format({
            'text/html': () => {
                res.render('article', { article });
            },
            'application/json': () => {
                res.json(article);
            },
            default: () => {
                res.status(406).send('Not Acceptable');
            }
        });
    } catch (err) {
        next(err);
    }
};