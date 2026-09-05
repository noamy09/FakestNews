const Comment = require("../models/comments");
const mongoose = require("mongoose");

const commentValidation = (comment) => {
    if(comment === null || comment === undefined){
        throw new Error("Comment is null", 400);
    }
    if(comment.content === null || comment.content === undefined){
        throw new Error("Comment content is missing", 400);
    }
    if(comment.articleId === null || comment.articleId === undefined){
        throw new Error("Comment articleId is missing", 400);
    }
    if(comment.author === null || comment.author === undefined){
        throw new Error("Comment author is missing", 400);
    }
}

const IDValidation = (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid comment ID", 400);
    }
}

const getComments = async (query = {}) => {
    const filter = {};
    const allowedFilters = ['articleId', 'author', 'content', 'page', 'limit'];
    
    allowedFilters.forEach(field => {
        if (query[field]) {
            filter[field] = query[field];
        }
    });

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    return await Comment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
};

const getCommentByID = async (id) => {
    IDValidation(id);
    const comment = await Comment.findById(id);
    if (!comment) {
        throw new Error("Comment not found", 404);
    }
    return comment;
}

const createComment = async (comment) => {
    commentValidation(comment);
    const newComment = new Comment(comment);
    return await newComment.save();
}

const updateComment = async (id, comment) => {
    IDValidation(id);
    if(comment === null || comment === undefined){
        throw new Error("No changes were given", 400);
    }
    const updatedComment = await Comment.findByIdAndUpdate(id, comment, { new: true });
    if (!updatedComment) {
        throw new Error("Comment not found", 404);
    }
    return updatedComment;
}

const deleteComment = async (id) => {
    IDValidation(id);
    const deletedComment = await Comment.findByIdAndDelete(id);
    if (!deletedComment) {
        throw new Error("Comment not found", 404);
    }
    return deletedComment;
}

module.exports = {
    getComments,
    getCommentByID,
    createComment,
    updateComment,
    deleteComment
}