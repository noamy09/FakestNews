const articlesServices = require('../services/articlesServices');
const Article = require('../models/articles');
const commentsServices = require('../services/commentsServices');

exports.renderFeed = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const category = req.query.category;
        const search = req.query.search;
        const sort = req.query.sort || 'newest';

        const filter = { status: 'published' };
        if (category && category !== 'all' && category.trim() !== '') {
            filter.category = category;
        }
        if (search && search.trim() !== '') {
            filter.title = { $regex: search.trim(), $options: 'i' };
        }

        let sortOption = { createdAt: -1 };
        if (sort === 'oldest') {
            sortOption = { createdAt: 1 };
        } else if (sort === 'popular') {
            sortOption = { views: -1 };
        }

        const result = await articlesServices.getArticles(filter, sortOption, page, limit);
        const articles = Array.isArray(result) ? result : (result?.articles || result?.data || []);
        const categories = await Article.distinct('category', { status: 'published' });

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ articles });
        }

        res.render('index', {
            articles,
            categories: categories || [],
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
        const [commentPage, commentCount] = await Promise.all([
            commentsServices.getArticleComments(article._id),
            commentsServices.countArticleComments(article._id)
        ]);
        res.render('article', {
            article,
            comments: commentPage.comments,
            commentsHasMore: commentPage.hasMore,
            commentsNextCursor: commentPage.nextCursor,
            commentCount,
            commentLimits: {
                content: commentsServices.MAX_CONTENT_LENGTH,
                name: commentsServices.MAX_NAME_LENGTH
            }
        });
    } catch (err) {
        next(err);
    }
};