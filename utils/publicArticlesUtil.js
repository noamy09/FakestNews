const Article = require("../models/articles");
const ArticleStatistics = require("../models/statistics");
const AppError = require("./AppError");

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

    article.views = (article.views || 0) + 1;
    await article.save();

    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0, 0);

    await ArticleStatistics.findOneAndUpdate(
        { articleId: article._id, timestamp: currentHour },
        { $inc: { views: 1 } },
        { upsert: true, new: true }
    );

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