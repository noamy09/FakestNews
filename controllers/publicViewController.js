const mongoose = require('mongoose');
const articlesServices = require('../services/articlesServices');
const Article = require('../models/articles');
const User = require('../models/User');

exports.renderFeed = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const category = req.query.category;
        const search = req.query.search;
        const sort = req.query.sort || 'newest';

        const serviceQuery = {
            status: 'published',
            page,
            limit
        };

        if (category && category !== 'all' && category.trim() !== '') {
            serviceQuery.category = category.trim();
        }

        if (search && search.trim() !== '') {
            serviceQuery.search = search.trim();
        }

        if (sort === 'oldest') {
            serviceQuery.sortBy = JSON.stringify({ field: 'createdAt', order: 1 });
        } else if (sort === 'popular') {
            serviceQuery.sortBy = JSON.stringify({ field: 'views', order: -1 });
        } else {
            serviceQuery.sortBy = JSON.stringify({ field: 'createdAt', order: -1 });
        }

        const result = await articlesServices.getArticles(serviceQuery);
        const articles = result?.data || [];
        const categories = await Article.distinct('category', { status: 'published' });

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ articles, pagination: result?.pagination });
        }

        let currentUser = req.session?.user || req.currentUser || null;
        if (!currentUser && req.session?.userId) {
            try {
                currentUser = await User.findById(req.session.userId).lean();
            } catch (e) {
                console.error('Error fetching user from session ID:', e);
            }
        }

        res.render('index', {
            articles,
            categories: categories || [],
            currentCategory: category || '',
            currentSort: sort,
            user: req.session?.user || null
        });
    } catch (err) {
        next(err);
    }
};

exports.renderArticlePage = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).render('error', { message: 'Article not found' });
        }

        const article = await articlesServices.getArticleById(req.params.id);
        if (!article || article.status !== 'published') {
            return res.status(404).render('error', { message: 'Article not found' });
        }

        let currentUser = req.session?.user || req.currentUser || null;

        res.render('article', { 
            article,
            user: currentUser
        });
    } catch (err) {
        next(err);
    }
};