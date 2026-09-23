const articlesServices = require('../services/articlesServices');
const Article = require('../models/articles');

exports.renderFeed = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const category = req.query.category;
    const search = req.query.search;

    const result = await articlesServices.getArticles({
      status: 'published',
      category: category || undefined,
      search: search || undefined,
      page,
      limit
    });

    const articles = result.data || [];
    const pagination = result.pagination || {};

    const categories = await Article.distinct('category', { status: 'published' });

    res.render('index', {
      articles,
      pagination,
      categories,
      currentCategory: category || '',
      searchQuery: search || ''
    });
  } catch (err) {
    next(err);
  }
};

exports.renderArticle = async (req, res, next) => {
  try {
    const { id } = req.params;

    // getArticleById handles view tracking automatically
    const article = await articlesServices.getArticleById(id);

    if (!article || article.status !== 'published') {
      return res.status(404).render('error', {
        message: 'Article not found or is not published yet.'
      });
    }

    res.render('article', { article });
  } catch (err) {
    next(err);
  }
};