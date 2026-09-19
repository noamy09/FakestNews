const articlesServices = require('../services/articlesServices');
const Article = require('../models/articles');
const ArticleStatistics = require('../models/statistics');

exports.renderHomePage = async (req, res, next) => {
    try {
        const articles = await articlesServices.getArticles({ status: 'published' }, { createdAt: -1 }, 1, 20);
        const categories = await Article.distinct('category', { status: 'published' });

        res.render('index', { articles, categories });
    } catch (err) {
        next(err);
    }
};

exports.renderArticlePage = async (req, res, next) => {
    try {
        const article = await articlesServices.getArticleById(req.params.id);

        if (!article || article.status !== 'published') {
            return res.status(404).render('error', { message: 'Article not found or not published' });
        }

        article.views = (article.views || 0) + 1;
        await article.save();

        const currentHour = new Date();
        currentHour.setMinutes(0, 0, 0, 0);
        await ArticleStatistics.findOneAndUpdate(
            { articleId: article._id, timestamp: currentHour },
            { $inc: { views: 1 } },
            { upsert: true, new: true }
        );

        res.render('article', { article });
    } catch (err) {
        next(err);
    }
};