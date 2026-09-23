const AppError = require("../utils/AppError");
const Article = require("../models/articles");
const ArticleStatistics = require("../models/statistics");
const mongoose = require("mongoose");

// Helper functions:
const allowedStatuses = ["unpublished", "published", "archived"];

const articleValidation = (article) => {
    if (!article) {
        throw new AppError("Article is null", 400);
    }
    if (!article.title) {
        throw new AppError("Article title is missing", 400);
    }
    if (!article.author) {
        throw new AppError("Article author is missing", 400);
    }
    if (!allowedStatuses.includes(article.status)) {
        throw new AppError(`Invalid status: ${article.status}`, 400);
    }
    if (article.updatesHistory && Array.isArray(article.updatesHistory)) {
        article.updatesHistory.forEach(update => {
            if (!update) {
                throw new AppError(`Update is missing`, 400);
            }
            if (!update.updaterId) {
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
    const allowedFilters = ['category', 'author', 'status', 'title', 'page', 'limit', 'draft.status'];

    let sort = { createdAt: -1 }; // default sort order is descending

    if (query.sortBy) {
        try {
            const sortBy = JSON.parse(query.sortBy); //convert the query string to an object {field: "...", order: ...}
            if (sortBy.field === "createdAt" || sortBy.field === "views") { //check if the field is created date or views
                if (sortBy.order) { //if there is an order
                    if (sortBy.order === -1 || sortBy.order === 1) { //check if the order is valid (descending or ascending)
                        sort = { [sortBy.field]: sortBy.order }; //set the sort order
                    } else { //if the order is invalid
                        throw new AppError("Invalid sort order", 400);
                    }
                } else { //if there is no order
                    sort = { [sortBy.field]: -1 }; //set the sort order to descending
                }
            } else { //if the field is not created date or views
                throw new AppError("Invalid sort parameter", 400);
            }
        } catch (error) { //catch the error
            throw new AppError("Invalid sort parameters", 400);
        }
    }

    // Helper to escape regex characters from failing the search
    const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'); //replaces special characters with escape characters to prevent them from breaking the regex query

    allowedFilters.forEach(field => { //builds the filters that will be used to filter the articles
        if (query[field]) { //checks if the field exists in the query
            if (field === 'title') { //if the field is title, we use regex to search for the field
                filter[field] = { $regex: escapeRegex(query[field]), $options: 'i' }; //add the field to the filter (case insensitive)
            } else { //otherwise we use the field as is
                filter[field] = query[field]; //add the field to the filters 
            }
        }
    });

    if (query.search) { //if there is a search query, we add it to the filter
        const safeSearch = escapeRegex(query.search); //escapes the search query to prevent it from breaking the regex query
        filter.$or = [ //add the search query to the filter (checks for the search query in the title, summary, and content)
            { title: { $regex: safeSearch, $options: 'i' } }, //search in title (case insensitive)
            { summary: { $regex: safeSearch, $options: 'i' } }, //search in summary (case insensitive)
            { content: { $regex: safeSearch, $options: 'i' } } //search in content (case insensitive)
        ];
    }

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit; //skips the articles that are not needed (for pagination)

    let tempArticles = Article.find(filter).sort(sort).skip(skip).limit(limit).lean(); //lean() returns plain JS objects instead of Mongoose documents (faster)

    // If filtering specifically for published articles, omit the draft object from the payload 
    // to return only the "published version" to the public feed
    if (query.status === 'published') {
        tempArticles = tempArticles.select('-draft');
    }

    // Run both queries concurrently for maximum performance
    const [data, totalItems] = await Promise.all([
        tempArticles,
        Article.countDocuments(filter)
    ]);

    return {
        data, // the articles
        pagination: { // to support all pagination needs (current page, infinite scroll, last page, page numbers)
            currentPage: page,
            limit: limit,
            totalPages: Math.ceil(totalItems / limit), // use Math.ceil to round up to the nearest integer (so the last page is included)
            totalItems: totalItems, // the total number of items that match the query
            hasNextPage: (page * limit) < totalItems // true if there are more pages, false if we are on the last page
        }
    };
};

const getArticleById = async (id) => {
    IDValidation(id);
    
    const article = await Article.findById(id).lean(); //lean() returns plain JS objects instead of Mongoose documents (faster)
    
    if (!article) {
        throw new AppError("Article not found", 404);
    }

    // Optimistically increment the views count for the current request's article
    article.views = (article.views || 0) + 1;

    // Track views
    const currentHour = new Date();
    currentHour.setUTCMinutes(0, 0, 0); // Truncate to the current UTC hour for different time zones
    
    Promise.all([
        Article.updateOne({ _id: id }, { $inc: { views: 1 } }), //increments the views count for the current request's article
        ArticleStatistics.findOneAndUpdate( //increments the views count for the current request's article in the statistics model for analitics purposes
            { articleId: id, timestamp: currentHour },
            { $inc: { views: 1 } },
            { upsert: true, new: true } // creates a new statistics entry for the current request's article if the entry does not exist
        )
    ]).catch(err => {
        console.error(`Failed to update statistics for article ${id}:`, err);
    });

    return article; //returns the updated article (with the incremented views count)
}

const createArticle = async (article) => {
    articleValidation(article);
    const newArticle = new Article(article);
    return await newArticle.save();
}

const updateArticle = async (ArticleId, articleData) => {
    IDValidation(ArticleId);
    if (!articleData || typeof articleData !== "object") {
        throw new AppError("No valid changes were given", 400);
    }

    const existingArticle = await Article.findById(ArticleId);
    if (!existingArticle) {
        throw new AppError("Article not found", 404);
    }

    const { updaterId, edits, _id, ...otherFields } = articleData; //extract the metadata of the update and keep sperately from the rest of the update

    const updates = {};

    if (otherFields.draftStatus) {
        const { draftStatus, ...rest } = otherFields; //seperate draftStatus from other fields

        let previousDraft = {};

        if (existingArticle.draft) //pull the previous draft if it exists
            previousDraft = existingArticle.draft.toObject();

        const updatedDraft = { ...previousDraft, ...rest, status: draftStatus }; //merge the previous draft with the new fields, overriding the same fields between them with the new values (rest comes last), give the draft its own status

        updates.$set = { //update the draft
            draft: updatedDraft
        }
    } else if (otherFields.status === 'published') {
        if (!updaterId || !mongoose.Types.ObjectId.isValid(updaterId)) {
            throw new AppError("Invalid or missing Updater ID for publishing", 400);
        }

        let draftContent = {}; //like before we pull the draft content if exists
        if (existingArticle.draft) {
            draftContent = existingArticle.draft.toObject();
            delete draftContent._id; //prevents overriding the main article's _id
        }
        //gets the value of the field from the new article data, the draft, or the existing article
        const getFieldValue = (fieldName) => {
            if (otherFields[fieldName] !== undefined) return otherFields[fieldName]; //if the field exists in the new article data given to publish, it will be the value of the field
            if (draftContent[fieldName] !== undefined) return draftContent[fieldName]; //if the field exists in the draft, and not in the new article data, it will be the value of the field
            return existingArticle[fieldName]; //otherwise the field is from the existing article
        };

        const titlePub = getFieldValue('title');
        const categoryPub = getFieldValue('category');
        const summaryPub = getFieldValue('summary');
        const contentPub = getFieldValue('content');

        //validates that the required fields are not missing (meaning were never defined at all)
        const validateField = (val, fieldName) => {
            if (!val || typeof val !== 'string') {
                throw new AppError(`Required field ${fieldName} is missing`, 400);
            }
        };

        //validate key values for the article to be ready for publishing
        validateField(titlePub, 'title');
        validateField(categoryPub, 'category');
        validateField(summaryPub, 'summary');
        validateField(contentPub, 'content');

        updates.$set = { //merges the draft content with other fields that came with the publish request
            ...draftContent,
            ...otherFields,  //overrides the same fields between draft content and other fields with the new values (otherFields comes last)
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
    } else {
        // Normal direct update for other fields (e.g. archiving)
        updates.$set = { ...otherFields };
    }


    const updatedArticle = await Article.findByIdAndUpdate(
        ArticleId, updates, { returnDocument: 'after', runValidators: true }); //returns the document after updates
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

