const articlesServices = require('../services/articlesServices');
const Article = require('../models/articles');

exports.renderFeed = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const category = req.query.category;
        const search = req.query.search;
        const sort = req.query.sort || 'newest';

        let sortOption = { createdAt: -1 };
        if (sort === 'oldest') {
            sortOption = { createdAt: 1 };
        } else if (sort === 'popular') {
            sortOption = { views: -1 };
        }

        const result = await articlesServices.getArticles({
            status: 'published',
            category: category || undefined,
            search: search || undefined,
            sort: sortOption,
            page,
            limit
        });

        const articles = result.data || result || [];
        const categories = await Article.distinct('category', { status: 'published' });

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json(result);
        }

        res.render('index', {
            articles,
            categories,
            currentCategory: category || '',
            currentSort: sort
        });
    } catch (err) {
        next(err);
    }
};

exports.renderArticlePage = async (req, res, next) => {
    try {
        const article = await articlesServices.getArticleById(req.params.id);
        if (!article || article.status !== 'published') {
            return res.status(404).render('error', { message: 'Article not found' });
        }
        res.render('article', { article });
    } catch (err) {
        next(err);
    }
};