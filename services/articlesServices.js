const AppError = require("../utils/AppError");
const Article = require("../models/articles");
const mongoose = require("mongoose");

// Helper functions:
const allowedStatuses = ["pending", "published", "draft"];

const articleValidation = (article) => {
    if (article === null || article === undefined) {
        throw new AppError("Article is null", 400);
    }
    if (article.title === null || article.title === undefined) {
        throw new AppError("Article title is missing", 400);
    }
    if (article.author === null || article.author === undefined) {
        throw new AppError("Article author is missing", 400);
    }
    if (article.status && !allowedStatuses.includes(article.status)) {
        throw new AppError(`Invalid status: ${article.status}`, 400);
    }
    if (article.updatesHistory && Array.isArray(article.updatesHistory)) {
        article.updatesHistory.forEach(update => {
            if (update === null || update === undefined) {
                throw new AppError(`Update is missing`, 400);
            }
            if (update.updaterId === null || update.updaterId === undefined) {
                throw new AppError(`Updater ID in update ${JSON.stringify(update)} is missing`, 400);
            }
            if (!mongoose.Types.ObjectId.isValid(update.updaterId)) {
                throw new AppError(`Invalid or missing Updater ID in update ${JSON.stringify(update)}`, 400);
            }
        });
    }
}

const IDValidation = (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid article ID", 400);
    }
}

// Services:

const getArticles = async (query = {}) => {
    const filter = {};
    const allowedFilters = ['category', 'author', 'status', 'title', 'page', 'limit'];

    let sort = { createdAt: -1 };

    if (query.sortBy) {
        try {
            const sortBy = JSON.parse(query.sortBy);
            if (sortBy.field === "createdAt" || sortBy.field === "views") {
                if (sortBy.order) {
                    if (sortBy.order === -1 || sortBy.order === 1) {
                        sort = { [sortBy.field]: sortBy.order };
                    } else {
                        throw new AppError("Invalid sort order", 400);
                    }
                } else {
                    sort = { [sortBy.field]: -1 };
                }
            } else {
                throw new AppError("Invalid sort parameter", 400);
            }
        } catch (error) {
            throw new AppError("Invalid sort parameters", 400);
        }
    }

    // Helper to escape regex characters from failing the search
    const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    allowedFilters.forEach(field => { //builds the filter object
        if (query[field]) { //checks if the field exists in the query
            if (field === 'title') { //if the field is title, we use regex
                filter[field] = { $regex: escapeRegex(query[field]), $options: 'i' }; //add the field to the filter (case insensitive)
            } else { //otherwise we use the field as is
                filter[field] = query[field]; //add the field to the filter
            }
        }
    });

    if (query.search) { //if there is a search query, we add it to the filter
        const safeSearch = escapeRegex(query.search); //escape the search query
        filter.$or = [ //add the search query to the filter (checks for the search query in the title, summary, and content)
            { title: { $regex: safeSearch, $options: 'i' } }, //search in title (case insensitive)
            { summary: { $regex: safeSearch, $options: 'i' } }, //search in summary (case insensitive)
            { content: { $regex: safeSearch, $options: 'i' } } //search in content (case insensitive)
        ];
    }

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit; //skips the articles that are not needed (for pagination)

    return await Article.find(filter).sort(sort).skip(skip).limit(limit);
};

const getArticleById = async (id) => {
    IDValidation(id);
    const article = await Article.findById(id);
    if (!article) {
        throw new AppError("Article not found", 404);
    }
    return article;
}

const createArticle = async (article) => {
    articleValidation(article);
    const newArticle = new Article(article);
    return await newArticle.save();
}

const updateArticle = async (ArticleId, articleData) => {
    IDValidation(ArticleId);
    if (!articleData || typeof articleData !== "object") {
        throw new AppError("No changes were given", 400);
    }

    const existingArticle = await Article.findById(ArticleId);
    if (!existingArticle) {
        throw new AppError("Article not found", 404);
    }

    const { updaterId, edits, _id, ...otherFields } = articleData; //extract the metadata of the update and keep sperately from the rest of the update

    const updates = {};

    switch (otherFields.status) {
        case 'draft':
        case 'pending':
            const { status, ...rest } = otherFields; //seperate status from other fields

            let previousDraft = {};

            if (existingArticle.draft) //pull the previous draft if it exists
                previousDraft = existingArticle.draft.toObject();

            const mergedDraft = { ...previousDraft, ...rest }; //merge the previous draft with the new fields

            updates.$set = { //update the draft and status
                draft: mergedDraft,
                status: status
            }

            break;

        case 'published':
            if (!updaterId || !mongoose.Types.ObjectId.isValid(updaterId)) {
                throw new AppError("Invalid or missing Updater ID for publishing", 400);
            }

            let draftContent = {}; //like before we pull the draft content if exists
            if (existingArticle.draft) {
                draftContent = existingArticle.draft.toObject();
                delete draftContent._id; // prevent overriding main article _id
            }
            //gets the value of the field from the new article data, the draft, or the existing article
            const getFieldValue = (fieldName) => {
                if (otherFields[fieldName] !== undefined) return otherFields[fieldName];
                if (draftContent[fieldName] !== undefined) return draftContent[fieldName];
                return existingArticle[fieldName];
            };

            const titlePub = getFieldValue('title');
            const categoryPub = getFieldValue('category');
            const summaryPub = getFieldValue('summary');
            const contentPub = getFieldValue('content');

            //validates that the required fields are not missing
            const validateField = (val, fieldName) => {
                if (!val || typeof val !== 'string') {
                    throw new AppError(`Required field ${fieldName} is missing`, 400);
                }
            };

            validateField(titlePub, 'title');
            validateField(categoryPub, 'category');
            validateField(summaryPub, 'summary');
            validateField(contentPub, 'content');

            updates.$set = {
                ...draftContent, //merges draft content with other fields that came with the publish request
                ...otherFields,
                status: "published",
                draft: null      //clears draft
            };

            updates.$push = { //pushes the new update to the updatesHistory array
                updatesHistory: {
                    updaterId: updaterId,
                    updatedAt: new Date(),
                    edits: edits || "Article published."
                }
            };

            break;

        default:
            throw new AppError("Invalid or missing status", 400);
    }


    const updatedArticle = await Article.findByIdAndUpdate(
        ArticleId, updates, { returnDocument: 'after', runValidators: true });
    if (!updatedArticle) {
        throw new AppError("Article not found", 404);
    }
    return updatedArticle;
}

const deleteArticle = async (id) => {
    IDValidation(id);
    const deletedArticle = await Article.findByIdAndDelete(id);
    if (!deletedArticle) {
        throw new AppError("Article not found", 404);
    }
    return deletedArticle;
}

module.exports = {
    getArticles,
    getArticleById,
    createArticle,
    updateArticle,
    deleteArticle
}

