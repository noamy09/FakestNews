// Import external dependencies and database models
const mongoose = require('mongoose');
const articlesServices = require('../services/articlesServices');
const Article = require('../models/articles');
const commentsServices = require('../services/commentsServices');
const User = require('../models/User');

/**
 * Controller to render the public feed or return paginated articles as JSON.
 * Handles filtering by category, search queries, pagination, and sorting.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 */
exports.renderFeed = async (req, res, next) => {
    try {
        // Parse pagination query parameters with fallback default values
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const category = req.query.category;
        const search = req.query.search;
        const sort = req.query.sort || 'newest';

        // Base query parameters passed to the articles service
        const serviceQuery = {
            status: 'published',
            page,
            limit
        };

        // Add optional category filter if provided and not set to "all"
        if (category && category !== 'all' && category.trim() !== '') {
            serviceQuery.category = category.trim();
        }

        // Add optional search text filter
        if (search && search.trim() !== '') {
            serviceQuery.search = search.trim();
        }

        // Configure sorting criteria according to the requested sort option
        if (sort === 'oldest') {
            serviceQuery.sortBy = JSON.stringify({ field: 'createdAt', order: 1 });
        } else if (sort === 'popular') {
            serviceQuery.sortBy = JSON.stringify({ field: 'views', order: -1 });
        } else {
            serviceQuery.sortBy = JSON.stringify({ field: 'createdAt', order: -1 });
        }

        // Fetch articles data and total pages from the service layer
        const result = await articlesServices.getArticles(serviceQuery);
        const articles = result?.data || [];
        
        // Fetch all distinct categories for published articles to populate filter dropdowns
        const categories = await Article.distinct('category', { status: 'published' });

        // Collect unique author IDs from retrieved articles to perform bulk lookup
        const authorIds = [...new Set(articles.map(a => a.author).filter(Boolean))];

        // Fetch user documents matching author IDs to resolve usernames
        const users = await User.find({ _id: { $in: authorIds } }, 'username').lean();

        // Map author user ID string to the corresponding username for O(1) lookup
        const userMap = new Map(users.map(u => [u._id.toString(), u.username]));

        // Attach populated author objects (with username) to each article item
        articles.forEach(article => {
            const authorId = article.author?.toString();
            article.author = {
                _id: authorId,
                username: userMap.get(authorId)
            };
        });

        // Respond with JSON if requested via AJAX or dynamic fetch (infinite scroll / client filter)
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ articles, pagination: result?.pagination });
        }

        // Retrieve current authenticated session user if available
        let currentUser = req.session?.user || null;

        // Render the home page EJS template with articles and filters
        res.render('index', {
            articles,
            categories: categories || [],
            currentCategory: category || '',
            currentSort: sort,
            user: currentUser
        });
    } catch (err) {
        // Forward any caught errors to the global error-handling middleware
        next(err);
    }
};

/**
 * Controller to render the full article view page by article ID.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 */
exports.renderArticlePage = async (req, res, next) => {
    try {
        // Validate MongoDB ObjectId parameter before querying
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).render('error', { message: 'Article not found' });
        }

        // Retrieve the article by its ID from the service layer
        const article = await articlesServices.getArticleById(req.params.id);

        // Ensure the article exists and is publicly published
        if (!article || article.status !== 'published') {
            return res.status(404).render('error', { message: 'Article not found' });
        }
        const [commentPage, commentCount] = await Promise.all([
            commentsServices.getArticleComments(article._id),
            commentsServices.countArticleComments(article._id)
        ]);

        // Populate author username details for display on the single article view
        if (article.author) {
            const authorId = article.author._id ? article.author._id : article.author;
            const authorUser = await User.findById(authorId, 'username').lean();
            article.author = {
                _id: authorId.toString(),
                username: authorUser ? authorUser.username : undefined
            };
        }

        // Retrieve current authenticated session user if available
        let currentUser = req.session?.user || null;

        // Render the single article EJS view template
        res.render('article', { 
            article,
          user: currentUser,
            comments: commentPage.comments,
            commentsHasMore: commentPage.hasMore,
            commentsNextCursor: commentPage.nextCursor,
            commentCount,
            canModerate: commentsServices.canModerateComments(req.session?.user),
            commentLimits: {
                content: commentsServices.MAX_CONTENT_LENGTH,
                name: commentsServices.MAX_NAME_LENGTH
            }
        });
    } catch (err) {
        // Forward any caught errors to the global error-handling middleware
        next(err);
    }
};